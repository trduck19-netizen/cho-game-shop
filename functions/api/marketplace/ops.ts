/**
 * ops.ts — API VẬN HÀNH SÀN (KHỐI 2): hàng chờ duyệt + điểm chất lượng + hạng thử.
 *
 * CHỈ ĐỌC + HIỂN THỊ. File này KHÔNG có endpoint duyệt/từ chối mới:
 * việc duyệt vẫn dùng đúng các API đã có từ đợt 1+2:
 *   POST /api/marketplace/sellers/approve   (duyệt gian hàng)
 *   POST /api/marketplace/products/approve  (duyệt sản phẩm)
 *   POST /api/marketplace/payouts/approve   (duyệt rút tiền)
 * Giao diện src/marketplace/admin-queue.tsx gọi các endpoint đó, không gọi
 * endpoint duyệt nào khác.
 *
 * ĐƯỜNG DẪN MỚI (điều phối viên phải nối vào functions/_worker.ts — xem
 * BLOCK2_README.md, mục "Móc nối", vì _worker.ts chặn đường /api/* và file
 * này không tự chạy nếu chưa được nối):
 *   GET /api/marketplace/ops/queue?limit=20
 *       -> quản trị xem: gian hàng chờ duyệt, sản phẩm chờ duyệt,
 *          yêu cầu rút chờ duyệt, khiếu nại đang mở + số đếm từng loại.
 *   GET /api/marketplace/ops/score?seller_id=...
 *       -> quản trị xem bất kỳ gian hàng nào, hoặc chính chủ gian hàng xem
 *          gian hàng của mình: điểm chất lượng + hạng + giới hạn thử còn lại.
 *
 * AN TOÀN DỮ LIỆU:
 * - Cả hai endpoint đều yêu cầu đăng nhập; queue chỉ dành cho quản trị
 *   (role ADMIN / SUPER_ADMIN, giống index.ts — KHÔNG mở rộng role members).
 * - Không bao giờ trả về nội dung mã (code_content): sản phẩm chỉ kèm số
 *   lượng mã còn bán được (available_codes) và tổng mã đã nạp (total_codes).
 * - Hồ sơ gian hàng chỉ kèm cột công khai của members (username, email,
 *   display_name) — không lấy salt, password_hash hay session_token.
 *
 * Ghi chú trùng lặp có chủ đích: các hàm xác thực và tạo bảng dưới đây sao
 * lại mẫu từ index.ts vì index.ts không export chúng, và khối 2 không được
 * sửa index.ts. Điều phối viên có thể gom chung khi gộp, nhưng không bắt buộc.
 */
import { verifyToken, extractUserIdFromToken } from '../../services/auth_service';
import {
  TRIAL_LIMITS,
  computeSellerQuality,
  checkTrialProductLimit,
  checkTrialCodeLimit,
  type SellerStatsInput,
} from './seller-quality';

interface Env {
  DB?: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, idempotency-key',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

// Tạo bảng nếu chưa có (mệnh đề IF NOT EXISTS, giống migration 0012 + index.ts).
// Chỉ gồm các bảng mà endpoint này đọc; không sửa bảng cũ, không thêm cột.
const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS sellers (id TEXT PRIMARY KEY, member_id TEXT NOT NULL UNIQUE, shop_name TEXT NOT NULL, shop_slug TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', avatar_url TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED')), available_balance INTEGER NOT NULL DEFAULT 0 CHECK (available_balance >= 0), held_balance INTEGER NOT NULL DEFAULT 0 CHECK (held_balance >= 0), total_sold INTEGER NOT NULL DEFAULT 0 CHECK (total_sold >= 0), rating_sum INTEGER NOT NULL DEFAULT 0 CHECK (rating_sum >= 0), rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS marketplace_products (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, title TEXT NOT NULL, game_slug TEXT, game_name TEXT, product_type TEXT NOT NULL DEFAULT 'CODE' CHECK (product_type IN ('CODE')), original_price INTEGER NOT NULL DEFAULT 0 CHECK (original_price >= 0), current_price INTEGER NOT NULL DEFAULT 0 CHECK (current_price >= 0), stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0), sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0), approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')), is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)), instructions TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS marketplace_inventory_codes (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, seller_id TEXT NOT NULL, code_content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED')), order_id TEXT, sold_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS marketplace_escrow (id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, seller_id TEXT NOT NULL, buyer_id TEXT NOT NULL, gross_amount INTEGER NOT NULL CHECK (gross_amount >= 0), commission_amount INTEGER NOT NULL CHECK (commission_amount >= 0), net_amount INTEGER NOT NULL CHECK (net_amount >= 0), status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED', 'REFUNDED')), held_at TEXT NOT NULL DEFAULT (datetime('now')), released_at TEXT, refunded_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS marketplace_disputes (id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, buyer_id TEXT NOT NULL, seller_id TEXT NOT NULL, reason TEXT NOT NULL, evidence_text TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED_RELEASE', 'RESOLVED_REFUND', 'REJECTED')), admin_note TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), resolved_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS marketplace_reviews (id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, seller_id TEXT NOT NULL, buyer_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), comment TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS marketplace_payouts (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0), status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'REJECTED')), admin_note TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), paid_at TEXT)`,
];

async function ensureOpsSchema(db: D1Database) {
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.prepare(stmt).run().catch(() => {});
  }
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

async function getSellerForMember(db: D1Database, memberId: string) {
  return db.prepare('SELECT * FROM sellers WHERE member_id = ? LIMIT 1').bind(memberId).first<any>().catch(() => null);
}

/** Gom số liệu thật của một gian hàng rồi tính điểm + hạng + giới hạn thử còn lại. */
async function buildSellerQuality(db: D1Database, seller: any) {
  const escrowReleased = await db.prepare(`SELECT COUNT(*) as cnt FROM marketplace_escrow WHERE seller_id = ? AND status = 'RELEASED'`).bind(seller.id).first<any>();
  const escrowRefunded = await db.prepare(`SELECT COUNT(*) as cnt FROM marketplace_escrow WHERE seller_id = ? AND status = 'REFUNDED'`).bind(seller.id).first<any>();
  const disputesOpen = await db.prepare(`SELECT COUNT(*) as cnt FROM marketplace_disputes WHERE seller_id = ? AND status = 'OPEN'`).bind(seller.id).first<any>();
  const disputesRefund = await db.prepare(`SELECT COUNT(*) as cnt FROM marketplace_disputes WHERE seller_id = ? AND status = 'RESOLVED_REFUND'`).bind(seller.id).first<any>();
  const reviews = await db.prepare(`SELECT COALESCE(SUM(rating), 0) as sum, COUNT(*) as cnt FROM marketplace_reviews WHERE seller_id = ?`).bind(seller.id).first<any>();
  const products = await db.prepare(`SELECT id, title, approval_status FROM marketplace_products WHERE seller_id = ? AND approval_status != 'REJECTED' ORDER BY created_at DESC`).bind(seller.id).all<any>();
  const productRows: any[] = products.results || [];

  const stats: SellerStatsInput = {
    completedOrders: Number(escrowReleased?.cnt || 0),
    refundedOrders: Number(escrowRefunded?.cnt || 0),
    openDisputes: Number(disputesOpen?.cnt || 0),
    resolvedRefundDisputes: Number(disputesRefund?.cnt || 0),
    ratingSum: Number(reviews?.sum || 0),
    ratingCount: Number(reviews?.cnt || 0),
    productCount: productRows.length,
  };
  const quality = computeSellerQuality(stats);

  // Số mã từng sản phẩm (chỉ đếm, không đọc nội dung mã).
  const productsWithCodes = [];
  for (const p of productRows) {
    const totalRow = await db.prepare(`SELECT COUNT(*) as cnt FROM marketplace_inventory_codes WHERE product_id = ?`).bind(p.id).first<any>();
    const availRow = await db.prepare(`SELECT COUNT(*) as cnt FROM marketplace_inventory_codes WHERE product_id = ? AND status = 'AVAILABLE'`).bind(p.id).first<any>();
    const totalCodes = Number(totalRow?.cnt || 0);
    productsWithCodes.push({
      id: p.id,
      title: p.title,
      approval_status: p.approval_status,
      total_codes: totalCodes,
      available_codes: Number(availRow?.cnt || 0),
      trial_code_check: checkTrialCodeLimit(quality.tier, totalCodes, 1),
    });
  }

  return {
    seller: {
      id: seller.id,
      shop_name: seller.shop_name,
      shop_slug: seller.shop_slug,
      status: seller.status,
      created_at: seller.created_at,
    },
    quality,
    trial: {
      enabled: TRIAL_LIMITS.enabled,
      limits: {
        max_products: TRIAL_LIMITS.maxProducts,
        max_codes_per_product: TRIAL_LIMITS.maxCodesPerProduct,
        promotion_min_completed_orders: TRIAL_LIMITS.promotionMinCompletedOrders,
        promotion_max_dispute_rate: TRIAL_LIMITS.promotionMaxDisputeRate,
      },
      product_check: checkTrialProductLimit(quality.tier, productRows.length),
      remaining_products: TRIAL_LIMITS.enabled && quality.tier === 'TRIAL'
        ? Math.max(0, TRIAL_LIMITS.maxProducts - productRows.length)
        : null,
    },
    products: productsWithCodes,
  };
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context as EventContext<Env>;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);
  await ensureOpsSchema(env.DB!);
  const member = await getMemberFromRequest(request, env);
  if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);

  // Hàng chờ duyệt cho quản trị.
  if (pathname === '/api/marketplace/ops/queue') {
    if (!isAdmin(member)) return json({ success: false, message: 'Không có quyền quản trị.' }, 403);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 20) || 20));

    const pendingSellers = (await env.DB!.prepare(
      `SELECT s.id, s.member_id, s.shop_name, s.shop_slug, s.description, s.avatar_url, s.status, s.created_at, m.username, m.display_name, m.email FROM sellers s LEFT JOIN members m ON m.id = s.member_id WHERE s.status = 'PENDING' ORDER BY s.created_at ASC LIMIT ?`,
    ).bind(limit).all<any>()).results || [];
    const pendingProducts = (await env.DB!.prepare(
      `SELECT p.id, p.seller_id, p.title, p.game_slug, p.game_name, p.original_price, p.current_price, p.approval_status, p.created_at, s.shop_name, s.shop_slug FROM marketplace_products p JOIN sellers s ON s.id = p.seller_id WHERE p.approval_status = 'PENDING' ORDER BY p.created_at ASC LIMIT ?`,
    ).bind(limit).all<any>()).results || [];
    const pendingPayouts = (await env.DB!.prepare(
      `SELECT py.id, py.seller_id, py.amount, py.status, py.created_at, s.shop_name, s.shop_slug FROM marketplace_payouts py JOIN sellers s ON s.id = py.seller_id WHERE py.status = 'PENDING' ORDER BY py.created_at ASC LIMIT ?`,
    ).bind(limit).all<any>()).results || [];
    const openDisputes = (await env.DB!.prepare(
      `SELECT d.id, d.order_id, d.buyer_id, d.seller_id, d.reason, d.created_at, s.shop_name, s.shop_slug FROM marketplace_disputes d JOIN sellers s ON s.id = d.seller_id WHERE d.status = 'OPEN' ORDER BY d.created_at ASC LIMIT ?`,
    ).bind(limit).all<any>()).results || [];

    const productsWithCounts = [];
    for (const p of pendingProducts) {
      const availRow = await env.DB!.prepare(`SELECT COUNT(*) as cnt FROM marketplace_inventory_codes WHERE product_id = ? AND status = 'AVAILABLE'`).bind(p.id).first<any>();
      const totalRow = await env.DB!.prepare(`SELECT COUNT(*) as cnt FROM marketplace_inventory_codes WHERE product_id = ?`).bind(p.id).first<any>();
      productsWithCounts.push({ ...p, available_codes: Number(availRow?.cnt || 0), total_codes: Number(totalRow?.cnt || 0) });
    }

    // Điểm + hạng của từng gian hàng đang chờ (để quản trị duyệt có bối cảnh,
    // không phải chỉ thấy tên): tính theo lô, mỗi gian hàng một lần đọc số liệu.
    const sellerQualityById: Record<string, any> = {};
    const sellerIds = [...new Set([...pendingSellers.map((s: any) => s.id), ...pendingProducts.map((p: any) => p.seller_id)])];
    for (const sellerId of sellerIds) {
      const seller = await env.DB!.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(sellerId).first<any>();
      if (seller) sellerQualityById[sellerId] = await buildSellerQuality(env.DB!, seller);
    }

    const countRow = async (sql: string) => {
      const row = await env.DB!.prepare(sql).first<any>();
      return Number(row?.cnt || 0);
    };
    return json({
      success: true,
      counts: {
        pending_sellers: await countRow(`SELECT COUNT(*) as cnt FROM sellers WHERE status = 'PENDING'`),
        pending_products: await countRow(`SELECT COUNT(*) as cnt FROM marketplace_products WHERE approval_status = 'PENDING'`),
        pending_payouts: await countRow(`SELECT COUNT(*) as cnt FROM marketplace_payouts WHERE status = 'PENDING'`),
        open_disputes: await countRow(`SELECT COUNT(*) as cnt FROM marketplace_disputes WHERE status = 'OPEN'`),
      },
      pending_sellers: pendingSellers,
      pending_products: productsWithCounts,
      pending_payouts: pendingPayouts,
      open_disputes: openDisputes,
      seller_quality: sellerQualityById,
    });
  }

  // Điểm chất lượng + hạng + giới hạn thử của một gian hàng.
  if (pathname === '/api/marketplace/ops/score') {
    const sellerId = String(url.searchParams.get('seller_id') || '').trim();
    if (!sellerId) return json({ success: false, message: 'Thiếu seller_id.' }, 400);
    const seller = await env.DB!.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(sellerId).first<any>();
    if (!seller) return json({ success: false, message: 'Không tìm thấy gian hàng.' }, 404);
    const ownSeller = await getSellerForMember(env.DB!, member.id);
    const isOwner = ownSeller && ownSeller.id === sellerId;
    if (!isAdmin(member) && !isOwner) return json({ success: false, message: 'Không có quyền xem gian hàng này.' }, 403);
    return json({ success: true, ...(await buildSellerQuality(env.DB!, seller)) });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};

export const onRequestPost: PagesFunction<Env> = async () => {
  // Không có endpoint duyệt mới ở khối 2: duyệt dùng API đã có (xem đầu file).
  return json({ success: false, message: 'Khối vận hành không có endpoint duyệt riêng. Dùng /api/marketplace/sellers/approve, /api/marketplace/products/approve hoặc /api/marketplace/payouts/approve.' }, 404);
};
