import { getRealEventsHub, saveRealEventsHub } from '../../services/realEventsHub';
import { ensureSchemaUpgrades } from '../../services/d1_service';

interface Env {
  DB: D1Database;
  SEPAY_API_KEY?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Apikey, apikey, x-api-key',
};

/**
 * Constant-time string comparison preventing timing attacks on API keys
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) {
    return false;
  }
  let c = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    c |= aBuf[i] ^ bBuf[i];
  }
  return c === 0;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const isDbReady = Boolean(env.DB);

  return new Response(
    JSON.stringify({
      success: true,
      status: 'ONLINE',
      endpoint: 'SePay Webhook Receiver (Cloudflare D1 Production-Ready)',
      service: 'CodeGame.Shop & Admin Shop',
      currencyRule: '1 VND = 1 Core',
      database: 'Cloudflare D1 (Edge SQLite)',
      idempotency: 'UNIQUE constraint (sepay_transactions.transaction_id)',
      dbReady: isDbReady,
      timestamp: new Date().toISOString(),
    }),
    { headers: CORS_HEADERS }
  );
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
    console.warn('[SePay] Hub broadcast error:', e);
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database Cloudflare D1 (env.DB) chưa được kích hoạt.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    await ensureSchemaUpgrades(env.DB);

    let payload: any = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    // 1. Phân tích tham số chuẩn của SePay Webhook
    const transactionId = String(
      payload.id || payload.transactionId || payload.transaction_id || payload.referenceCode || payload.code || ''
    ).trim();
    const amount = Math.round(Number(payload.transferAmount || payload.transfer_amount || payload.amount || payload.amount_in || 0));
    const content = String(payload.content || payload.transaction_content || payload.description || payload.memo || '').trim();
    const gateway = String(payload.gateway || payload.bank_brand_name || payload.bank || 'Bank-Auto').trim();
    const accountNumber = String(payload.accountNumber || payload.account_number || payload.subAccount || payload.sub_account || '').trim();
    const transferType = String(payload.transferType || payload.transfer_type || 'in').toLowerCase();

    // 2. Xác thực API Key 2 tầng bảo mật (Cloudflare Environment Variable hoặc D1 System Settings)
    let configuredApiKey = (env.SEPAY_API_KEY || '').trim();
    let configuredPrefix = 'WCG';
    let autoCreditRatio = 1;
    let configuredAccountNumber = '';
    let configuredBankName = '';
    try {
      const sepaySetting = await env.DB.prepare(
        "SELECT value FROM system_settings WHERE key = 'wcg_admin_sepay_v4' LIMIT 1"
      ).first<any>();
      if (sepaySetting?.value) {
        const parsed = typeof sepaySetting.value === 'string' ? JSON.parse(sepaySetting.value) : sepaySetting.value;
        if (!configuredApiKey && parsed?.apiKey && typeof parsed.apiKey === 'string') {
          configuredApiKey = parsed.apiKey.trim();
        }
        if (parsed?.paymentPrefix && typeof parsed.paymentPrefix === 'string') {
          configuredPrefix = parsed.paymentPrefix.trim().toUpperCase() || 'WCG';
        }
        if (parsed?.accountNumber && typeof parsed.accountNumber === 'string') {
          configuredAccountNumber = parsed.accountNumber.trim();
        }
        if (parsed?.bankName && typeof parsed.bankName === 'string') {
          configuredBankName = parsed.bankName.trim();
        }
        if (parsed?.autoCreditCoreRatio && Number(parsed.autoCreditCoreRatio) > 0) {
          autoCreditRatio = Number(parsed.autoCreditCoreRatio);
        }
      }
    } catch {}

    const url = new URL(request.url);
    const incomingApiKey = (
      request.headers.get('Authorization') ||
      request.headers.get('apikey') ||
      request.headers.get('x-api-key') ||
      request.headers.get('Apikey') ||
      request.headers.get('X-Api-Key') ||
      request.headers.get('x-sepay-key') ||
      request.headers.get('x-sepay-api-key') ||
      request.headers.get('x-webhook-secret') ||
      url.searchParams.get('api_key') ||
      url.searchParams.get('apiKey') ||
      url.searchParams.get('key') ||
      url.searchParams.get('token') ||
      payload?.apiKey ||
      payload?.api_key ||
      ''
    ).trim().replace(/^Bearer\s+/i, '').replace(/^Apikey\s+/i, '').trim();

    // Xác thực an toàn tuyệt đối: Webhook bắt buộc phải có API Key chính xác
    // Loại bỏ hoàn toàn lỗ hổng bypass qua số tài khoản công khai
    const isAuthorized = Boolean(
      (configuredApiKey && incomingApiKey && (incomingApiKey === configuredApiKey || timingSafeEqualStr(incomingApiKey, configuredApiKey))) ||
      (env.ADMIN_SYNC_SECRET && incomingApiKey && (incomingApiKey === env.ADMIN_SYNC_SECRET || timingSafeEqualStr(incomingApiKey, env.ADMIN_SYNC_SECRET)))
    );

    if (!isAuthorized) {
      // Ghi log giao dịch lỗi xác thực vào D1 để phục vụ kiểm toán và phát hiện gian lận
      if (transactionId) {
        try {
          const existingTx = await env.DB.prepare(
            "SELECT id FROM sepay_transactions WHERE transaction_id = ? LIMIT 1"
          ).bind(transactionId).first<any>();

          if (existingTx) {
            await env.DB.prepare(`
              UPDATE sepay_transactions
              SET status = 'FAILED', amount_in = ?, transaction_content = ?, gateway = ?, account_number = ?
              WHERE transaction_id = ?
            `).bind(amount, content, gateway, accountNumber, transactionId).run();
          } else {
            await env.DB.prepare(`
              INSERT INTO sepay_transactions (
                transaction_id, gateway, account_number, amount_in, transaction_content, member_id, status, created_at
              ) VALUES (?, ?, ?, ?, ?, NULL, 'FAILED', datetime('now'))
            `).bind(transactionId, gateway, accountNumber, amount, content).run();
          }
        } catch (e) {
          console.warn('[SePay Webhook] Failed to log unauthorized tx:', e);
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: SePay Webhook yêu cầu API Key chính xác. Truy cập bị từ chối.',
          transactionId,
        }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // 3. Chỉ nhận tiền vào (transferType == 'in') và amount > 0
    if (transferType !== 'in' || amount <= 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Bỏ qua giao dịch tiền ra hoặc số tiền bằng 0.' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (!transactionId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu mã định danh giao dịch (transaction_id).' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 4. Kiểm tra Idempotency trước khi xử lý (nếu transaction_id đã tồn tại)
    const existingTx = await env.DB.prepare(`
      SELECT id, status, member_id FROM sepay_transactions WHERE transaction_id = ? LIMIT 1
    `).bind(transactionId).first<any>();

    if (existingTx && existingTx.status === 'SUCCESS') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'DUPLICATE_IDEMPOTENT',
          message: `Giao dịch ${transactionId} đã được xử lý trước đó. Bỏ qua cộng tiền lần 2 để đảm bảo Idempotency.`,
          transactionId,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 5. Trích xuất tài khoản thành viên từ nội dung chuyển khoản
    // Cú pháp chuẩn: WCG <mã thành viên>
    const cleanContent = content.replace(/\u00a0/g, ' ').trim();
    const escapedPrefix = configuredPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = new RegExp(`(?:^|\\s|[^A-Za-z0-9])${escapedPrefix}\\s+([A-Za-z0-9_\\-\\.\\@]+)`, 'i');
    const fallbackPrefixRegex = new RegExp(`(?:^|\\s|[^A-Za-z0-9])${escapedPrefix}\\s*([A-Za-z0-9_\\-\\.\\@]+)`, 'i');
    const prefixMatch = cleanContent.match(prefixRegex) || cleanContent.match(fallbackPrefixRegex);
    let rawTarget = prefixMatch ? prefixMatch[1].trim() : '';

    // Dự phòng 1: Nếu người dùng ghi trực tiếp mã người dùng usr... mà quên tiền tố WCG
    if (!rawTarget) {
      const directIdMatch = cleanContent.match(/\b(usr[A-Za-z0-9_-]+)\b/i);
      if (directIdMatch) {
        rawTarget = directIdMatch[1].trim();
      }
    }

    // Loại bỏ dấu câu ở cuối nếu app ngân hàng tự đính kèm
    rawTarget = rawTarget.replace(/[.,;:!?]+$/, '').trim();

    let matchedMember: any = null;

    if (rawTarget) {
      // Tra cứu trực tiếp trên các cột có index (id PRIMARY KEY, username, email)
      matchedMember = await env.DB.prepare(`
        SELECT id, username, display_name, email, role, balance, status
        FROM members
        WHERE id = ? COLLATE NOCASE OR username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
        LIMIT 1
      `).bind(rawTarget, rawTarget, rawTarget).first<any>();

      // Hỗ trợ trường hợp app ngân hàng lọc bỏ ký tự đặc biệt / dấu gạch dưới / gạch ngang
      // (VD: TPBank, Vietcombank chuyển "usr_1790773913476_ne01" thành "usr1790773913476ne01")
      if (!matchedMember) {
        const cleanRawTarget = rawTarget.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanRawTarget) {
          matchedMember = await env.DB.prepare(`
            SELECT id, username, display_name, email, role, balance, status
            FROM members
            WHERE REPLACE(REPLACE(REPLACE(id, '_', ''), '-', ''), ' ', '') = ? COLLATE NOCASE
               OR REPLACE(REPLACE(REPLACE(username, '_', ''), '-', ''), ' ', '') = ? COLLATE NOCASE
            LIMIT 1
          `).bind(cleanRawTarget, cleanRawTarget).first<any>();
        }
      }
    }

    // Dự phòng 2: Quét thông minh qua danh sách thành viên trong DB
    if (!matchedMember) {
      try {
        const allMembersRes = await env.DB.prepare(`
          SELECT id, username, display_name, email, role, balance, status
          FROM members
        `).all<any>();
        if (allMembersRes?.results) {
          const lowerContent = cleanContent.toLowerCase();
          const cleanAlphaContent = lowerContent.replace(/[^a-z0-9]/g, '');
          const cleanAlphaTarget = (rawTarget || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          for (const m of allMembersRes.results) {
            if (!m) continue;
            const mId = (m.id || '').trim().toLowerCase();
            const uName = (m.username || '').trim().toLowerCase();
            const mEmail = (m.email || '').trim().toLowerCase();

            const mIdAlpha = mId.replace(/[^a-z0-9]/g, '');
            const uNameAlpha = uName.replace(/[^a-z0-9]/g, '');
            const mEmailAlpha = mEmail.replace(/[^a-z0-9]/g, '');

            // 1. So khớp trực tiếp target đã chuẩn hóa bỏ dấu gạch dưới / gạch ngang
            if (cleanAlphaTarget) {
              if (mIdAlpha && cleanAlphaTarget === mIdAlpha) {
                matchedMember = m;
                break;
              }
              if (uNameAlpha && uNameAlpha.length >= 3 && cleanAlphaTarget === uNameAlpha) {
                matchedMember = m;
                break;
              }
              if (mEmailAlpha && mEmailAlpha.length >= 4 && cleanAlphaTarget === mEmailAlpha) {
                matchedMember = m;
                break;
              }
            }

            // 2. So khớp chuỗi ID người dùng có trong nội dung chuyển khoản
            if (mId && lowerContent.includes(mId)) {
              matchedMember = m;
              break;
            }
            if (mIdAlpha && mIdAlpha.length >= 6 && cleanAlphaContent.includes(mIdAlpha)) {
              matchedMember = m;
              break;
            }

            // 3. So khớp tên người dùng (username) trong nội dung
            // Tránh nhận diện nhầm các từ khóa phổ biến trong giao dịch ngân hàng nếu thành viên vô tình trùng tên
            const GENERIC_BANK_WORDS = new Set(['bank', 'tien', 'chuyen', 'thanh', 'toan', 'nap', 'core', 'code', 'game', 'shop', 'user', 'viet', 'tpbank', 'mbbank', 'vcb', 'techcombank']);
            const isGenericWord = GENERIC_BANK_WORDS.has(uNameAlpha);

            if (uName && uName.length >= 3 && !isGenericWord) {
              const uRegex = new RegExp(`(?:^|\\s|[^A-Za-z0-9])${uName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s|[^A-Za-z0-9])`, 'i');
              if (uRegex.test(cleanContent)) {
                matchedMember = m;
                break;
              }
            }
            // Chỉ cho phép khớp dạng chuỗi liền nếu có tiền tố WCG đi kèm (VD: wcgusername hoặc wcgadmin290200)
            const cleanPrefix = (configuredPrefix || 'WCG').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (uNameAlpha && uNameAlpha.length >= 3 && cleanAlphaContent.includes(cleanPrefix + uNameAlpha)) {
              matchedMember = m;
              break;
            }

            // 4. So khớp email
            if (mEmail && lowerContent.includes(mEmail)) {
              matchedMember = m;
              break;
            }
          }
        }
      } catch (scanErr) {
        console.warn('[SePay Webhook] Member scan error:', scanErr);
      }
    }

    // Không khớp chính xác mã thành viên -> Lưu trạng thái FAILED (đối soát chưa khớp) vào D1 và trả về HTTP 200 an toàn để SePay xác nhận
    if (!matchedMember) {
      try {
        const existingTx = await env.DB.prepare(
          "SELECT id FROM sepay_transactions WHERE transaction_id = ? LIMIT 1"
        ).bind(transactionId).first<any>();

        if (existingTx) {
          await env.DB.prepare(`
            UPDATE sepay_transactions
            SET status = 'FAILED', amount_in = ?, transaction_content = ?, gateway = ?, account_number = ?
            WHERE transaction_id = ?
          `).bind(amount, content, gateway, accountNumber, transactionId).run();
        } else {
          await env.DB.prepare(`
            INSERT INTO sepay_transactions (
              transaction_id, gateway, account_number, amount_in, transaction_content, member_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, NULL, 'FAILED', datetime('now'))
          `).bind(transactionId, gateway, accountNumber, amount, content).run();
        }
      } catch (insertErr: any) {
        console.warn('[SePay Webhook] Unmatched log error:', insertErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'UNMATCHED',
          message: `Giao dịch ${transactionId} đã được ghi nhận nhưng không khớp cú pháp "WCG <mã thành viên>" hoặc không tìm thấy tài khoản (nội dung: "${content}"). Đã lưu vào hệ thống để admin duyệt nạp thủ công.`,
          transactionId,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (matchedMember.status === 'BANNED') {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO sepay_transactions (
          transaction_id, gateway, account_number, amount_in, transaction_content, member_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'IGNORED', datetime('now'))
      `).bind(transactionId, gateway, accountNumber, amount, content, matchedMember.id).run().catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          status: 'ACCOUNT_BANNED',
          message: 'Tài khoản người dùng đã bị khóa. Không thể tự động cộng tiền.',
          transactionId,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 6. Tính toán số tiền quy đổi (1 VND = 1 Core hoặc theo tỷ lệ cấu hình admin)
    const creditedCore = Math.round(amount * autoCreditRatio);
    const txId = `TX-DEP-${transactionId}`;

    // 7. Thực thi ACID Transaction Batch trên Cloudflare D1
    try {
      const existingTx = await env.DB.prepare(
        "SELECT id FROM sepay_transactions WHERE transaction_id = ? LIMIT 1"
      ).bind(transactionId).first<any>();

      const stmt1 = existingTx
        ? env.DB.prepare(`
            UPDATE sepay_transactions
            SET status = 'SUCCESS', member_id = ?, amount_in = ?, transaction_content = ?, gateway = ?, account_number = ?
            WHERE transaction_id = ? AND status != 'SUCCESS'
          `).bind(matchedMember.id, amount, content, gateway, accountNumber, transactionId)
        : env.DB.prepare(`
            INSERT INTO sepay_transactions (
              transaction_id, gateway, account_number, amount_in, transaction_content, member_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', datetime('now'))
          `).bind(transactionId, gateway, accountNumber, amount, content, matchedMember.id);

      const stmt2 = env.DB.prepare(`
        UPDATE members
        SET balance = balance + ?
        WHERE id = ?
      `).bind(creditedCore, matchedMember.id);

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
          'Nạp tiền tự động SePay #' || ?,
          'COMPLETED',
          NULL,
          datetime('now')
        FROM members m
        WHERE m.id = ?
      `).bind(txId, creditedCore, creditedCore, transactionId, matchedMember.id);

      await env.DB.batch([stmt1, stmt2, stmt3]);

      // Lấy số dư mới sau khi cộng
      const updatedMem = await env.DB.prepare('SELECT balance FROM members WHERE id = ?').bind(matchedMember.id).first<any>();
      const newBalance = updatedMem ? Number(updatedMem.balance) : Number(matchedMember.balance || 0) + creditedCore;

      // Broadcast sự kiện người dùng thật cho Marketing FOMO Toast (không ghi tốn quota KV)
      await broadcastRealDepositToHub(env, matchedMember, amount, creditedCore);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'SUCCESS',
          message: `Nạp tiền thành công! Đã cộng +${creditedCore.toLocaleString('vi-VN')} Core cho ${matchedMember.display_name || matchedMember.username}.`,
          transactionId,
          creditedCore,
          newBalance,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    } catch (batchErr: any) {
      const msg = batchErr?.message || String(batchErr);

      // Bắt chính xác mã lỗi UNIQUE constraint để đảm bảo Idempotency chuẩn cấp sản xuất
      if (
        msg.includes('UNIQUE constraint failed: sepay_transactions.transaction_id') ||
        msg.includes('SQLITE_CONSTRAINT_UNIQUE') ||
        (msg.includes('UNIQUE') && msg.includes('sepay_transactions'))
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            status: 'DUPLICATE_IDEMPOTENT',
            message: `Giao dịch ${transactionId} đã được xử lý trước đó. Bỏ qua cộng tiền lần 2 để đảm bảo Idempotency.`,
            transactionId,
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      throw batchErr;
    }
  } catch (err: any) {
    console.error('[SePay Webhook Production Error]:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Lỗi máy chủ khi xử lý webhook: ' + (err?.message || String(err)),
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
