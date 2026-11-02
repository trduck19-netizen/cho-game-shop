/**
 * coord-reads.ts — Đường đọc bổ sung do điều phối viên viết khi gộp đợt
 * tính năng còn lại (không thuộc khối nào, vì các khối bị cấm sửa _worker.ts
 * và index.ts nên chưa làm được phần này).
 *
 * - GET /api/marketplace/orders/mine: đơn của chính người mua, kèm trạng thái
 *   tiền giữ. Mã đã giao trả về là mã của chính người mua đó (đã lưu trong
 *   orders.delivered_codes khi tạo đơn), không trả mã của người khác.
 * - GET /api/marketplace/sellers/public?seller_id=... | ?shop_slug=...:
 *   hồ sơ công khai của gian hàng đã duyệt, chỉ cột công khai, không trả
 *   email thành viên, số dư hay tiền giữ.
 * - GET /api/marketplace/disputes/mine | /seller | /admin: danh sách khiếu
 *   nại theo đúng hợp đồng trong src/marketplace/disputes.README.md §6.2.
 *   Không trả code_content trong bất kỳ trường nào.
 * - POST /api/marketplace/disputes/evidence: người mua hoặc người bán của
 *   khiếu nại đó gửi bằng chứng mô tả khi khiếu nại còn OPEN. Bằng chứng
 *   lưu vào bảng marketplace_dispute_evidence (migration 0014, đồng thời
 *   tạo IF NOT EXISTS ở đây để API vẫn chạy nếu migration chưa áp).
 *   Bằng chứng của người bán cũng được trả kèm trong danh sách khiếu nại
 *   ở trường seller_evidence_text (bản mới nhất), vì giao diện khối 4 chờ
 *   trường này.
 */
import { verifyToken, extractUserIdFromToken } from '../../services/auth_service';

interface Env {
  DB?: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

async function ensureCoordSchema(db: any) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS marketplace_dispute_evidence (id TEXT PRIMARY KEY, dispute_id TEXT NOT NULL, sender_role TEXT NOT NULL CHECK (sender_role IN ('BUYER', 'SELLER')), evidence_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`).run().catch(() => {});
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON marketplace_dispute_evidence(dispute_id)`).run().catch(() => {});
}

async function getMemberFromRequest(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { valid, userId: tokenUserId } = await verifyToken(token, [env.JWT_SECRET, env.ADMIN_SYNC_SECRET]);
  let member: any = null;
  member = await env.DB!.prepare('SELECT * FROM members WHERE session_token = ? LIMIT 1').bind(token).first<any>().catch(() => null);
  if (!member && valid && tokenUserId) {
    member = await env.DB!.prepare('SELECT * FROM members WHERE id = ? OR username = ? OR email = ? LIMIT 1').bind(tokenUserId, tokenUserId, tokenUserId).first<any>().catch(() => null);
  }
  if (!member && token) {
    const extracted = extractUserIdFromToken(token);
    if (extracted) {
      member = await env.DB!.prepare('SELECT * FROM members WHERE id = ? OR username = ? LIMIT 1').bind(extracted, extracted).first<any>().catch(() => null);
    }
  }
  if (!member || member.status === 'BANNED') return null;
  return member;
}

function isAdmin(member: any) {
  const role = String(member?.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

async function getSellerForMember(db: any, memberId: string) {
  return db.prepare('SELECT * FROM sellers WHERE member_id = ? LIMIT 1').bind(memberId).first<any>().catch(() => null);
}

async function withSellerEvidence(db: any, disputes: any[]) {
  const out: any[] = [];
  for (const d of disputes) {
    const ev = await db.prepare(`SELECT evidence_text FROM marketplace_dispute_evidence WHERE dispute_id = ? AND sender_role = 'SELLER' ORDER BY created_at DESC, id DESC LIMIT 1`).bind(d.id).first<any>().catch(() => null);
    const cnt = await db.prepare(`SELECT COUNT(*) as cnt FROM marketplace_dispute_evidence WHERE dispute_id = ?`).bind(d.id).first<any>().catch(() => null);
    out.push({ ...d, seller_evidence_text: ev ? String(ev.evidence_text || '') : null, evidence_count: Number(cnt?.cnt || 0) });
  }
  return out;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context as any;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);
  await ensureCoordSchema(env.DB);
  const member = await getMemberFromRequest(request, env);
  if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 24) || 24));

  if (pathname === '/api/marketplace/orders/mine') {
    const rows = (await env.DB.prepare(`SELECT o.*, e.status as escrow_status FROM orders o LEFT JOIN marketplace_escrow e ON e.order_id = o.id WHERE o.member_id = ? ORDER BY o.created_at DESC LIMIT ?`).bind(member.id, limit).all<any>()).results || [];
    return json({ success: true, orders: rows });
  }

  if (pathname === '/api/marketplace/sellers/public') {
    const sellerId = String(url.searchParams.get('seller_id') || '').trim();
    const shopSlug = String(url.searchParams.get('shop_slug') || '').trim();
    if (!sellerId && !shopSlug) return json({ success: false, message: 'Thiếu gian hàng.' }, 400);
    const seller = sellerId
      ? await env.DB.prepare(`SELECT id, shop_name, shop_slug, description, avatar_url, status, total_sold, rating_sum, rating_count, created_at FROM sellers WHERE id = ? AND status = 'APPROVED' LIMIT 1`).bind(sellerId).first<any>()
      : await env.DB.prepare(`SELECT id, shop_name, shop_slug, description, avatar_url, status, total_sold, rating_sum, rating_count, created_at FROM sellers WHERE shop_slug = ? AND status = 'APPROVED' LIMIT 1`).bind(shopSlug).first<any>();
    if (!seller) return json({ success: false, message: 'Không tìm thấy gian hàng đã duyệt.' }, 404);
    return json({ success: true, seller });
  }

  if (pathname === '/api/marketplace/disputes/mine') {
    const rows = (await env.DB.prepare(`SELECT * FROM marketplace_disputes WHERE buyer_id = ? ORDER BY created_at DESC LIMIT ?`).bind(member.id, limit).all<any>()).results || [];
    return json({ success: true, disputes: await withSellerEvidence(env.DB, rows) });
  }

  if (pathname === '/api/marketplace/disputes/seller') {
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller) return json({ success: false, message: 'Tài khoản chưa có gian hàng.' }, 404);
    const rows = (await env.DB.prepare(`SELECT * FROM marketplace_disputes WHERE seller_id = ? ORDER BY created_at DESC LIMIT ?`).bind(seller.id, limit).all<any>()).results || [];
    return json({ success: true, disputes: await withSellerEvidence(env.DB, rows) });
  }

  if (pathname === '/api/marketplace/disputes/admin') {
    if (!isAdmin(member)) return json({ success: false, message: 'Không có quyền quản trị.' }, 403);
    const rows = (await env.DB.prepare(`SELECT * FROM marketplace_disputes ORDER BY CASE WHEN status = 'OPEN' THEN 0 ELSE 1 END, created_at DESC LIMIT ?`).bind(limit).all<any>()).results || [];
    return json({ success: true, disputes: await withSellerEvidence(env.DB, rows) });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context as any;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);
  await ensureCoordSchema(env.DB);
  const body: any = await request.json().catch(() => ({}));

  if (pathname === '/api/marketplace/disputes/evidence') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const disputeId = String(body?.dispute_id || '').trim();
    const evidenceText = String(body?.evidence_text || '').trim();
    if (!disputeId || !evidenceText || evidenceText.length > 2000) return json({ success: false, message: 'Cần bằng chứng mô tả từ 1 đến 2000 ký tự.' }, 400);
    const dispute = await env.DB.prepare(`SELECT * FROM marketplace_disputes WHERE id = ? LIMIT 1`).bind(disputeId).first<any>();
    if (!dispute) return json({ success: false, message: 'Không tìm thấy khiếu nại.' }, 404);
    if (dispute.status !== 'OPEN') return json({ success: false, message: 'Khiếu nại đã đóng, không nhận thêm bằng chứng.' }, 400);
    const seller = await getSellerForMember(env.DB, member.id);
    const isBuyer = dispute.buyer_id === member.id;
    const isSeller = !!seller && dispute.seller_id === seller.id;
    if (!isBuyer && !isSeller) return json({ success: false, message: 'Không có quyền gửi bằng chứng cho khiếu nại này.' }, 403);
    const senderRole = isBuyer ? 'BUYER' : 'SELLER';
    const evidenceId = newId('mp_evidence');
    await env.DB.prepare(`INSERT INTO marketplace_dispute_evidence (id, dispute_id, sender_role, evidence_text) VALUES (?, ?, ?, ?)`).bind(evidenceId, disputeId, senderRole, evidenceText).run();
    const evidence = await env.DB.prepare(`SELECT * FROM marketplace_dispute_evidence WHERE id = ? LIMIT 1`).bind(evidenceId).first<any>();
    return json({ success: true, message: 'Đã gửi bằng chứng.', evidence });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};
