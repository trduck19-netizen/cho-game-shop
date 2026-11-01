import { getRealEventsHub, saveRealEventsHub } from '../../services/realEventsHub';
import { ensureSchemaUpgrades } from '../../services/d1_service';
import { verifyToken, getSigningSecret } from '../../services/auth_service';

interface Env {
  DB: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

async function broadcastRealDepositToHub(env: Env, member: any, amount: number, creditedCore: number): Promise<void> {
  try {
    const hub = await getRealEventsHub(env);
    const rawMemberName = member?.display_name || member?.username || member?.displayName || 'Thành viên';
    const maskedName = rawMemberName.length > 3
      ? `${rawMemberName.slice(0, 2)}***${rawMemberName.slice(-1)}`
      : `${rawMemberName.slice(0, 1)}**`;
    hub.events.unshift({
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'DEPOSIT_WALLET',
      title: 'Nạp tiền ví thành công',
      message: `${maskedName} vừa nạp thành công ${amount.toLocaleString('vi-VN')}đ (+${creditedCore} Core)`,
      timeAgo: 'vừa xong',
      userName: maskedName,
      depositAmount: amount,
      isRealUser: true,
      timestamp: Date.now(),
      scheduledFireTime: Date.now(),
    });
    await saveRealEventsHub(env, hub);
  } catch (e) {
    console.warn('[SePay Credit] Hub broadcast error:', e);
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database Cloudflare D1 chưa được kích hoạt.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // 1. Kiểm tra quyền Admin
    const authHeader = request.headers.get('Authorization') || '';
    const syncKeyHeader = request.headers.get('X-Sync-Key') || '';
    const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    const configuredSecret = (env.ADMIN_SYNC_SECRET || '').trim();
    let isAuthorized = false;

    if (configuredSecret && (syncKeyHeader === configuredSecret || cleanToken === configuredSecret)) {
      isAuthorized = true;
    }

    if (!isAuthorized && cleanToken) {
      // 1a. Tra cứu trực tiếp session_token bí mật trong D1
      const member = await env.DB.prepare(
        "SELECT id, role, status FROM members WHERE session_token = ? LIMIT 1"
      ).bind(cleanToken).first<any>();

      if (member && (member.role === 'ADMIN' || member.role === 'SUPER_ADMIN') && member.status !== 'BANNED') {
        isAuthorized = true;
      }

      // 1b. Verify qua signed token nếu cần
      if (!isAuthorized) {
        const signingSecret = getSigningSecret(env);
        const { valid, userId } = await verifyToken(cleanToken, [signingSecret, configuredSecret]);
        if (valid && userId) {
          const verifiedMember = await env.DB.prepare(
            "SELECT id, role, status FROM members WHERE id = ? LIMIT 1"
          ).bind(userId).first<any>();
          if (verifiedMember && (verifiedMember.role === 'ADMIN' || verifiedMember.role === 'SUPER_ADMIN') && verifiedMember.status !== 'BANNED') {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Bạn không có quyền quản trị để thực hiện thao tác này.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // 2. Parse payload
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Payload không hợp lệ (JSON format required).' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const memberId = String(body.memberId || body.member_id || body.userId || '').trim();
    const amount = Math.round(Number(body.amount || body.coreAmount || 0));
    const transactionId = String(body.transactionId || body.txId || `MANUAL_DEP_${Date.now()}`).trim();
    const note = String(body.note || body.description || 'Nạp tiền / Bù Core thủ công SePay').trim();
    const gateway = String(body.gateway || 'SePay-Manual').trim();

    if (!memberId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Vui lòng cung cấp mã hoặc tên thành viên (memberId).' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Số tiền nạp phải lớn hơn 0.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await ensureSchemaUpgrades(env.DB);

    // 3. Tra cứu thành viên trong D1
    const member = await env.DB.prepare(`
      SELECT id, username, display_name, email, role, balance, status
      FROM members
      WHERE id = ? COLLATE NOCASE OR username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
      LIMIT 1
    `).bind(memberId, memberId, memberId).first<any>();

    if (!member) {
      return new Response(
        JSON.stringify({ success: false, error: `Không tìm thấy thành viên khớp với "${memberId}".` }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (member.status === 'BANNED') {
      return new Response(
        JSON.stringify({ success: false, error: 'Tài khoản thành viên này đã bị khóa.' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // 4. Thực thi ACID Transaction Batch trên Cloudflare D1
    const txId = `TX-MANUAL-${transactionId}`;

    const existingTx = await env.DB.prepare(
      "SELECT id, status, member_id, amount_in FROM sepay_transactions WHERE transaction_id = ? LIMIT 1"
    ).bind(transactionId).first<any>();

    // Chặn tuyệt đối cộng tiền trùng lặp (Double-Credit) nếu giao dịch đã có trạng thái SUCCESS
    if (existingTx && existingTx.status === 'SUCCESS') {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Giao dịch #${transactionId} đã được duyệt nạp thành công trước đó (cộng cho tài khoản ${existingTx.member_id || 'thành viên'}). Không thể duyệt lại để tránh cộng tiền nhân đôi!`,
          isDuplicate: true,
          transactionId,
        }),
        { status: 409, headers: CORS_HEADERS }
      );
    }

    const stmt1 = existingTx
      ? env.DB.prepare(`
          UPDATE sepay_transactions
          SET status = 'SUCCESS', member_id = ?, amount_in = ?, transaction_content = ?, gateway = ?
          WHERE transaction_id = ? AND status != 'SUCCESS'
        `).bind(member.id, amount, note, gateway, transactionId)
      : env.DB.prepare(`
          INSERT INTO sepay_transactions (
            transaction_id, gateway, account_number, amount_in, transaction_content, member_id, status, created_at
          ) VALUES (?, ?, 'MANUAL_OVERRIDE', ?, ?, ?, 'SUCCESS', datetime('now'))
        `).bind(transactionId, gateway, amount, note, member.id);

    const stmt2 = env.DB.prepare(`
      UPDATE members
      SET balance = balance + ?
      WHERE id = ?
    `).bind(amount, member.id);

    const stmt3 = env.DB.prepare(`
      INSERT INTO wallet_transactions (
        id, member_id, member_email, type, amount,
        balance_before, balance_after, description, status, order_id, created_at
      )
      SELECT
        ?,
        m.id,
        m.email,
        'DEPOSIT',
        ?,
        m.balance - ?,
        m.balance,
        ?,
        'COMPLETED',
        NULL,
        datetime('now')
      FROM members m
      WHERE m.id = ?
    `).bind(txId, amount, amount, note, member.id);

    await env.DB.batch([stmt1, stmt2, stmt3]);

    // 5. Lấy số dư mới
    const updatedMem = await env.DB.prepare('SELECT balance FROM members WHERE id = ?').bind(member.id).first<any>();
    const newBalance = updatedMem ? Number(updatedMem.balance) : Number(member.balance || 0) + amount;

    // 6. Broadcast sự kiện người dùng thật
    await broadcastRealDepositToHub(env, member, amount, amount);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Đã nạp thành công +${amount.toLocaleString('vi-VN')} Core cho tài khoản ${member.display_name || member.username}!`,
        member: {
          id: member.id,
          username: member.username,
          displayName: member.display_name,
          email: member.email,
          balanceBefore: member.balance,
          balanceAfter: newBalance,
        },
        transactionId,
        creditedCore: amount,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[Admin SePay Credit Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Lỗi máy chủ khi nạp tiền: ' + (err?.message || String(err)) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
