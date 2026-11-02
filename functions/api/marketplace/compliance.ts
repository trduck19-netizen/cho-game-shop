/**
 * Khoi 6 — API tuan thu: dieu khoan, chong trung ma, nhat ky quan tri.
 *
 * HUONG DAN NOI CHO DIEU PHOI VIEN (khong tu sua file khac):
 * 1. Them 3 duong vao functions/_worker.ts, canh khoi marketplace hien co:
 *    '/api/marketplace/terms',
 *    '/api/marketplace/compliance/audit-log',
 *    '/api/marketplace/compliance/seller-status',
 *    '/api/marketplace/compliance/terms/accept',
 *    '/api/marketplace/compliance/codes/check'
 *    (GET -> onRequestGet, POST -> onRequestPost, OPTIONS -> onRequestOptions
 *    giong khoi marketplace hien co).
 * 2. Trong functions/api/marketplace/index.ts, endpoint POST
 *    /api/marketplace/codes, TRUOC khi batch INSERT: goi
 *    checkCodeDuplicates(env.DB, uniqueCodes); neu co bat ky ma nao
 *    khong phai OK thi tra loi 400 kem danh sach ma bi chan (khong kem
 *    thong tin gian hang khac) va KHONG insert ma nao trong lo do.
 *    Sau do, khi insert, ghi them code_norm = normalizeCode(code).
 *    Chi muc DB partial (migration 0013) la luoi chan thu hai, nhung
 *    mot minh no khong du: no chi chan ma DANG BAN, khong chan ma DA
 *    BAN nap lai — vi vay buoc goi checkCodeDuplicates la bat buoc.
 * 3. Cac diem quan tri trong index.ts (duyet gian hang, duyet san pham,
 *    xu ly khieu nai, duyet rut tien) nen goi appendAuditLog() ngay sau
 *    khi ghi thanh cong, de moi quyet dinh deu co vet. Module nay
 *    khong tu chen vao cac endpoint do vi nhiem vu chi cho phep tao
 *    file moi.
 * 4. KHONG co endpoint POST/PUT/DELETE cho nhat ky: ghi truc tiep qua
 *    API bi chan co tinh (tra 405). Nhat ky chi duoc ghi bang ham
 *    appendAuditLog() tu phia may chu, va trigger DB chan UPDATE/DELETE.
 *
 * BAO MAT MA: khong bao gio ghi code_content hay code_norm vao nhat ky.
 * Nhat ky trung ma chi ghi so luong va product_id cua chinh nguoi nap.
 */
import { verifyToken, extractUserIdFromToken } from '../../services/auth_service';
import {
  MARKETPLACE_TERMS,
  TERMS_VERSION,
  DISPUTE_REASONS,
  normalizeCode,
  analyzeCodeBatch,
  checkNewSellerLimits,
  type CodeCheckStatus,
} from './compliance-logic';

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

// Schema chay luc chay (mirror migration 0013). Moi lenh co catch rieng
// theo dung mau cua index.ts, nen chay lai nhieu lan van an toan; lenh
// ALTER se bao loi neu cot da co va duoc bo qua.
const COMPLIANCE_SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS marketplace_admin_audit_log (id TEXT PRIMARY KEY, actor_member_id TEXT NOT NULL, actor_role TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, target_type TEXT NOT NULL DEFAULT '', target_id TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_audit_actor ON marketplace_admin_audit_log(actor_member_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_audit_target ON marketplace_admin_audit_log(target_type, target_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_audit_action ON marketplace_admin_audit_log(action, created_at)`,
  `CREATE TRIGGER IF NOT EXISTS trg_marketplace_audit_no_update BEFORE UPDATE ON marketplace_admin_audit_log BEGIN SELECT RAISE(ABORT, 'Nhat ky quan tri chi ghi them, khong duoc sua.'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_marketplace_audit_no_delete BEFORE DELETE ON marketplace_admin_audit_log BEGIN SELECT RAISE(ABORT, 'Nhat ky quan tri chi ghi them, khong duoc xoa.'); END`,
  `ALTER TABLE marketplace_inventory_codes ADD COLUMN code_norm TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_codes_norm_live ON marketplace_inventory_codes(code_norm) WHERE status IN ('AVAILABLE', 'RESERVED')`,
  `CREATE TABLE IF NOT EXISTS marketplace_seller_terms (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, terms_version TEXT NOT NULL, accepted_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(seller_id, terms_version))`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_seller_terms_seller ON marketplace_seller_terms(seller_id, accepted_at)`,
  `ALTER TABLE marketplace_settings ADD COLUMN new_seller_max_products INTEGER DEFAULT 5`,
  `ALTER TABLE marketplace_settings ADD COLUMN new_seller_max_codes_per_product INTEGER DEFAULT 20`,
  `ALTER TABLE marketplace_settings ADD COLUMN standard_tier_min_completed_orders INTEGER DEFAULT 20`,
  `ALTER TABLE marketplace_settings ADD COLUMN standard_tier_max_dispute_percent INTEGER DEFAULT 5`,
];

export async function ensureComplianceSchema(db: any) {
  for (const stmt of COMPLIANCE_SCHEMA_STATEMENTS) {
    await db.prepare(stmt).run().catch(() => {});
  }
  // Backfill code_norm cho ma cu (neu cot vua them). Khong ghi de ma
  // nao da co code_norm, tranh ghi lai du lieu cu.
  await db
    .prepare(`UPDATE marketplace_inventory_codes SET code_norm = UPPER(TRIM(code_content)) WHERE code_norm IS NULL`)
    .run()
    .catch(() => {});
}

/**
 * Ghi nhat ky quan tri: CHI INSERT, khong co ham sua/xoa tuong ung.
 * detail la chu mo ta chung (vi du "Duyet gian hang", "Tu choi ma
 * trung: 3 ma"), TUYET DOI khong dua code_content/code_norm vao day.
 */
export async function appendAuditLog(
  db: any,
  entry: {
    actor_member_id: string;
    actor_role?: string;
    action: string;
    target_type?: string;
    target_id?: string;
    detail?: string;
  },
) {
  await db
    .prepare(
      `INSERT INTO marketplace_admin_audit_log (id, actor_member_id, actor_role, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId('mp_audit'),
      entry.actor_member_id,
      String(entry.actor_role || ''),
      entry.action,
      String(entry.target_type || ''),
      String(entry.target_id || ''),
      String(entry.detail || ''),
    )
    .run();
}

/**
 * Kiem tra trung ma truoc khi nap (danh cho endpoint /codes cua khoi 1).
 * Tra ve ket qua theo tung ma; phia goi chi duoc tra status ve cho
 * nguoi nap, khong tra thong tin gian hang so huu ma trung.
 */
export async function checkCodeDuplicates(db: any, codes: string[]) {
  const norms = [...new Set(codes.map(normalizeCode).filter(Boolean))];
  if (norms.length === 0) return [] as Array<{ code: string; code_norm: string; status: CodeCheckStatus }>;
  const placeholders = norms.map(() => '?').join(',');
  const rows = (
    await db
      .prepare(`SELECT code_norm, status FROM marketplace_inventory_codes WHERE code_norm IN (${placeholders})`)
      .bind(...norms)
      .all<any>()
      .catch(() => ({ results: [] }))
  ).results || [];
  return analyzeCodeBatch(codes, rows);
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

async function getSellerComplianceStatus(db: any, sellerId: string) {
  const seller = await db.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(sellerId).first<any>().catch(() => null);
  if (!seller) return null;
  const terms = await db
    .prepare('SELECT * FROM marketplace_seller_terms WHERE seller_id = ? AND terms_version = ? LIMIT 1')
    .bind(sellerId, TERMS_VERSION)
    .first<any>()
    .catch(() => null);
  const settings = await db.prepare(`SELECT * FROM marketplace_settings WHERE id = 'default' LIMIT 1`).first<any>().catch(() => null);
  const productRow = await db.prepare(`SELECT COUNT(*) as cnt FROM marketplace_products WHERE seller_id = ?`).bind(sellerId).first<any>().catch(() => null);
  const completedRow = await db
    .prepare(`SELECT COUNT(*) as cnt FROM marketplace_escrow WHERE seller_id = ? AND status = 'RELEASED'`)
    .bind(sellerId)
    .first<any>()
    .catch(() => null);
  const openDisputeRow = await db
    .prepare(`SELECT COUNT(*) as cnt FROM marketplace_disputes WHERE seller_id = ? AND status = 'OPEN'`)
    .bind(sellerId)
    .first<any>()
    .catch(() => null);
  const disputeRow = await db
    .prepare(`SELECT COUNT(*) as cnt FROM marketplace_disputes WHERE seller_id = ? AND status IN ('RESOLVED_REFUND', 'RESOLVED_RELEASE')`)
    .bind(sellerId)
    .first<any>()
    .catch(() => null);
  const fraudFlagRow = await db
    .prepare(`SELECT COUNT(*) as cnt FROM marketplace_admin_audit_log WHERE target_type = 'seller' AND target_id = ? AND action = 'CODE_DUPLICATE_REJECTED'`)
    .bind(sellerId)
    .first<any>()
    .catch(() => null);
  const limits = checkNewSellerLimits(settings || {}, {
    productCount: Number(productRow?.cnt || 0),
    codesInProduct: 0,
    completedOrders: Number(completedRow?.cnt || 0),
    disputeCount: Number(disputeRow?.cnt || 0),
  });
  return {
    seller_id: seller.id,
    shop_name: seller.shop_name,
    status: seller.status,
    terms_version: TERMS_VERSION,
    terms_accepted: Boolean(terms),
    terms_accepted_at: terms ? terms.accepted_at : null,
    product_count: Number(productRow?.cnt || 0),
    completed_orders: Number(completedRow?.cnt || 0),
    open_disputes: Number(openDisputeRow?.cnt || 0),
    duplicate_rejected_batches: Number(fraudFlagRow?.cnt || 0),
    is_standard_tier: limits.isStandardTier,
    new_seller_limits: {
      max_products: settings ? settings.new_seller_max_products : null,
      max_codes_per_product: settings ? settings.new_seller_max_codes_per_product : null,
      standard_tier_min_completed_orders: settings ? settings.standard_tier_min_completed_orders : null,
      standard_tier_max_dispute_percent: settings ? settings.standard_tier_max_dispute_percent : null,
    },
    limit_reasons: limits.reasons,
  };
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context as any;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);
  await ensureComplianceSchema(env.DB);

  // Dieu khoan cong khai: ai cung doc duoc, khong can dang nhap.
  if (pathname === '/api/marketplace/terms') {
    return json({ success: true, terms: MARKETPLACE_TERMS, dispute_reasons: DISPUTE_REASONS });
  }

  // Nhat ky quan tri: CHI DOC, chi quan tri. Khong co POST/PUT/DELETE.
  if (pathname === '/api/marketplace/compliance/audit-log') {
    const member = await getMemberFromRequest(request, env);
    if (!member || !isAdmin(member)) return json({ success: false, message: 'Không có quyền quản trị.' }, 403);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 24) || 24));
    const action = url.searchParams.get('action') || '';
    const targetId = url.searchParams.get('target_id') || '';
    let rows: any[] = [];
    if (action && targetId) {
      rows = (await env.DB.prepare(`SELECT * FROM marketplace_admin_audit_log WHERE action = ? AND target_id = ? ORDER BY created_at DESC LIMIT ?`).bind(action, targetId, limit).all<any>()).results || [];
    } else if (action) {
      rows = (await env.DB.prepare(`SELECT * FROM marketplace_admin_audit_log WHERE action = ? ORDER BY created_at DESC LIMIT ?`).bind(action, limit).all<any>()).results || [];
    } else if (targetId) {
      rows = (await env.DB.prepare(`SELECT * FROM marketplace_admin_audit_log WHERE target_id = ? ORDER BY created_at DESC LIMIT ?`).bind(targetId, limit).all<any>()).results || [];
    } else {
      rows = (await env.DB.prepare(`SELECT * FROM marketplace_admin_audit_log ORDER BY created_at DESC LIMIT ?`).bind(limit).all<any>()).results || [];
    }
    return json({ success: true, logs: rows });
  }

  // Trang thai tuan thu cua gian hang: quan tri xem gian hang bat ky,
  // nguoi ban chi xem gian hang cua minh.
  if (pathname === '/api/marketplace/compliance/seller-status') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const sellerId = url.searchParams.get('seller_id') || '';
    let targetId = sellerId;
    if (!isAdmin(member)) {
      const own = await getSellerForMember(env.DB, member.id);
      if (!own) return json({ success: false, message: 'Tài khoản chưa có gian hàng.' }, 404);
      targetId = own.id;
    }
    if (!targetId) return json({ success: false, message: 'Thiếu gian hàng.' }, 400);
    const status = await getSellerComplianceStatus(env.DB, targetId);
    if (!status) return json({ success: false, message: 'Không tìm thấy gian hàng.' }, 404);
    return json({ success: true, compliance: status });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context as any;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);
  await ensureComplianceSchema(env.DB);
  const body: any = await request.json().catch(() => ({}));

  // Chan ghi nhat ky qua API: nhat ky chi ghi them tu phia may chu.
  if (pathname === '/api/marketplace/compliance/audit-log') {
    return json({ success: false, message: 'Nhật ký quản trị chỉ ghi thêm từ hệ thống, không nhận ghi trực tiếp qua API.' }, 405);
  }

  // Chap nhan dieu khoan: chi chu gian hang da duyet, ghi them dong moi
  // cho phien ban hien tai (INSERT OR IGNORE neu da chap nhan roi).
  if (pathname === '/api/marketplace/compliance/terms/accept') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller || seller.status !== 'APPROVED') return json({ success: false, message: 'Gian hàng chưa được duyệt.' }, 403);
    await env.DB.prepare(`INSERT OR IGNORE INTO marketplace_seller_terms (id, seller_id, terms_version) VALUES (?, ?, ?)`).bind(newId('mp_terms'), seller.id, TERMS_VERSION).run();
    await appendAuditLog(env.DB, {
      actor_member_id: member.id,
      actor_role: String(member.role || ''),
      action: 'TERMS_ACCEPTED',
      target_type: 'seller',
      target_id: seller.id,
      detail: `Chấp nhận điều khoản phiên bản ${TERMS_VERSION}`,
    });
    return json({ success: true, message: 'Đã ghi nhận chấp nhận điều khoản.', terms_version: TERMS_VERSION });
  }

  // Kiem tra trung ma truoc khi nap: khong ghi DB, khong tiet lo chu
  // so huu ma trung. Lo co bat ky ma nao khong OK thi phai bi chan
  // toan bo o endpoint /codes (xem huong dan noi o dau file).
  if (pathname === '/api/marketplace/compliance/codes/check') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller || seller.status !== 'APPROVED') return json({ success: false, message: 'Gian hàng chưa được duyệt.' }, 403);
    const productId = String(body?.product_id || '').trim();
    const codes = Array.isArray(body?.codes) ? body.codes.map((c: any) => String(c || '').trim()).filter(Boolean) : [];
    if (!productId || codes.length === 0 || codes.length > 100) return json({ success: false, message: 'Cần 1–100 mã cho mỗi lần kiểm tra.' }, 400);
    const product = await env.DB.prepare('SELECT * FROM marketplace_products WHERE id = ? LIMIT 1').bind(productId).first<any>();
    if (!product || product.seller_id !== seller.id) return json({ success: false, message: 'Không tìm thấy sản phẩm của gian hàng.' }, 404);
    const results = await checkCodeDuplicates(env.DB, codes);
    const blocked = results.filter((r) => r.status !== 'OK');
    if (blocked.length > 0) {
      await appendAuditLog(env.DB, {
        actor_member_id: member.id,
        actor_role: String(member.role || ''),
        action: 'CODE_DUPLICATE_REJECTED',
        target_type: 'seller',
        target_id: seller.id,
        detail: `Kiểm tra trùng mã cho sản phẩm ${productId}: ${blocked.length}/${results.length} mã bị chặn`,
      });
    }
    return json({
      success: true,
      all_clear: blocked.length === 0,
      results: results.map((r) => ({ code: r.code, status: r.status })),
      blocked_count: blocked.length,
    });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};
