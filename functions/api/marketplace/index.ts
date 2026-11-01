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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, idempotency-key',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

function slugify(text: string) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS sellers (id TEXT PRIMARY KEY, member_id TEXT NOT NULL UNIQUE, shop_name TEXT NOT NULL, shop_slug TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', avatar_url TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED')), available_balance INTEGER NOT NULL DEFAULT 0 CHECK (available_balance >= 0), held_balance INTEGER NOT NULL DEFAULT 0 CHECK (held_balance >= 0), total_sold INTEGER NOT NULL DEFAULT 0 CHECK (total_sold >= 0), rating_sum INTEGER NOT NULL DEFAULT 0 CHECK (rating_sum >= 0), rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_sellers_member_id ON sellers(member_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status)`,
  `CREATE TABLE IF NOT EXISTS marketplace_products (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, title TEXT NOT NULL, game_slug TEXT, game_name TEXT, product_type TEXT NOT NULL DEFAULT 'CODE' CHECK (product_type IN ('CODE')), original_price INTEGER NOT NULL DEFAULT 0 CHECK (original_price >= 0), current_price INTEGER NOT NULL DEFAULT 0 CHECK (current_price >= 0), stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0), sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0), approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')), is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)), instructions TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_products_seller_id ON marketplace_products(seller_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_products_approval ON marketplace_products(approval_status, is_active)`,
  `CREATE TABLE IF NOT EXISTS marketplace_inventory_codes (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, seller_id TEXT NOT NULL, code_content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED')), order_id TEXT, sold_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_codes_product_status ON marketplace_inventory_codes(product_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_codes_order_id ON marketplace_inventory_codes(order_id)`,
  `CREATE TABLE IF NOT EXISTS marketplace_escrow (id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, seller_id TEXT NOT NULL, buyer_id TEXT NOT NULL, gross_amount INTEGER NOT NULL CHECK (gross_amount >= 0), commission_amount INTEGER NOT NULL CHECK (commission_amount >= 0), net_amount INTEGER NOT NULL CHECK (net_amount >= 0), status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED', 'REFUNDED')), held_at TEXT NOT NULL DEFAULT (datetime('now')), released_at TEXT, refunded_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_seller_status ON marketplace_escrow(seller_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_buyer_id ON marketplace_escrow(buyer_id)`,
  `CREATE TABLE IF NOT EXISTS marketplace_ledger (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, order_id TEXT, type TEXT NOT NULL CHECK (type IN ('ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'PAYOUT', 'ADJUST')), amount INTEGER NOT NULL, balance_before INTEGER NOT NULL CHECK (balance_before >= 0), balance_after INTEGER NOT NULL CHECK (balance_after >= 0), held_before INTEGER NOT NULL CHECK (held_before >= 0), held_after INTEGER NOT NULL CHECK (held_after >= 0), description TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_ledger_seller_id ON marketplace_ledger(seller_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_ledger_order_id ON marketplace_ledger(order_id)`,
  `DROP INDEX IF EXISTS idx_marketplace_ledger_order_release`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_ledger_order_settle ON marketplace_ledger(order_id) WHERE type IN ('ESCROW_RELEASE', 'ESCROW_REFUND')`,
  `CREATE TABLE IF NOT EXISTS marketplace_disputes (id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, buyer_id TEXT NOT NULL, seller_id TEXT NOT NULL, reason TEXT NOT NULL, evidence_text TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED_RELEASE', 'RESOLVED_REFUND', 'REJECTED')), admin_note TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), resolved_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_seller_status ON marketplace_disputes(seller_id, status)`,
  `CREATE TABLE IF NOT EXISTS marketplace_reviews (id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, seller_id TEXT NOT NULL, buyer_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), comment TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_seller_id ON marketplace_reviews(seller_id)`,
  `CREATE TABLE IF NOT EXISTS marketplace_settings (id TEXT PRIMARY KEY CHECK (id = 'default'), commission_percent INTEGER, hold_hours INTEGER, auto_release_hours INTEGER, dispute_window_hours INTEGER, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS marketplace_payouts (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0), status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'REJECTED')), admin_note TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), paid_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_payouts_seller_status ON marketplace_payouts(seller_id, status)`,
  `INSERT OR IGNORE INTO marketplace_settings (id, commission_percent, hold_hours, auto_release_hours, dispute_window_hours) VALUES ('default', NULL, NULL, NULL, NULL)`,
];

async function ensureMarketplaceSchema(db: any) {
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

async function getSellerForMember(db: any, memberId: string) {
  return db.prepare('SELECT * FROM sellers WHERE member_id = ? LIMIT 1').bind(memberId).first<any>().catch(() => null);
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context as any;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);
  await ensureMarketplaceSchema(env.DB);

  if (pathname === '/api/marketplace/products') {
    const sellerId = url.searchParams.get('seller_id') || '';
    const gameSlug = url.searchParams.get('game_slug') || '';
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 24) || 24));
    let rows: any[] = [];
    if (sellerId) {
      rows = (await env.DB.prepare(`SELECT p.*, s.shop_name, s.shop_slug FROM marketplace_products p JOIN sellers s ON s.id = p.seller_id WHERE p.approval_status = 'APPROVED' AND p.is_active = 1 AND p.seller_id = ? ORDER BY p.created_at DESC LIMIT ?`).bind(sellerId, limit).all<any>()).results || [];
    } else if (gameSlug) {
      rows = (await env.DB.prepare(`SELECT p.*, s.shop_name, s.shop_slug FROM marketplace_products p JOIN sellers s ON s.id = p.seller_id WHERE p.approval_status = 'APPROVED' AND p.is_active = 1 AND p.game_slug = ? ORDER BY p.created_at DESC LIMIT ?`).bind(gameSlug, limit).all<any>()).results || [];
    } else {
      rows = (await env.DB.prepare(`SELECT p.*, s.shop_name, s.shop_slug FROM marketplace_products p JOIN sellers s ON s.id = p.seller_id WHERE p.approval_status = 'APPROVED' AND p.is_active = 1 ORDER BY p.created_at DESC LIMIT ?`).bind(limit).all<any>()).results || [];
    }
    const products = [];
    for (const p of rows) {
      const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM marketplace_inventory_codes WHERE product_id = ? AND status = 'AVAILABLE'`).bind(p.id).first<any>();
      products.push({ ...p, available_codes: Number(countRow?.cnt || 0) });
    }
    return json({ success: true, products });
  }

  if (pathname === '/api/marketplace/sellers/me') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller) return json({ success: true, seller: null });
    return json({ success: true, seller });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context as any;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);
  await ensureMarketplaceSchema(env.DB);
  const body: any = await request.json().catch(() => ({}));

  // Đăng ký gian hàng: mọi thành viên đã đăng nhập, trạng thái chờ duyệt.
  if (pathname === '/api/marketplace/sellers/register') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const existing = await getSellerForMember(env.DB, member.id);
    if (existing) return json({ success: false, message: 'Tài khoản đã có gian hàng.', seller: existing }, 400);
    const shopName = String(body?.shop_name || '').trim();
    if (!shopName) return json({ success: false, message: 'Thiếu tên gian hàng.' }, 400);
    let shopSlug = slugify(body?.shop_slug || shopName);
    if (!shopSlug) return json({ success: false, message: 'Tên gian hàng không tạo được đường dẫn.' }, 400);
    const clash = await env.DB.prepare('SELECT id FROM sellers WHERE shop_slug = ? LIMIT 1').bind(shopSlug).first<any>();
    if (clash) shopSlug = `${shopSlug}-${Date.now().toString(36)}`;
    const sellerId = newId('seller');
    await env.DB.prepare(`INSERT INTO sellers (id, member_id, shop_name, shop_slug, description, avatar_url, status) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`).bind(sellerId, member.id, shopName, shopSlug, String(body?.description || ''), String(body?.avatar_url || '')).run();
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(sellerId).first<any>();
    return json({ success: true, message: 'Đã gửi hồ sơ gian hàng, đang chờ quản trị duyệt.', seller });
  }

  // Duyệt gian hàng: chỉ quản trị.
  if (pathname === '/api/marketplace/sellers/approve') {
    const member = await getMemberFromRequest(request, env);
    if (!member || !isAdmin(member)) return json({ success: false, message: 'Không có quyền quản trị.' }, 403);
    const sellerId = String(body?.seller_id || '').trim();
    const status = String(body?.status || '').toUpperCase();
    if (!sellerId || !['APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) return json({ success: false, message: 'Trạng thái duyệt không hợp lệ.' }, 400);
    await env.DB.prepare(`UPDATE sellers SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, sellerId).run();
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(sellerId).first<any>();
    if (!seller) return json({ success: false, message: 'Không tìm thấy gian hàng.' }, 404);
    return json({ success: true, seller });
  }

  // Tạo sản phẩm: chỉ người bán đã duyệt, sản phẩm mới chờ duyệt.
  if (pathname === '/api/marketplace/products') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller || seller.status !== 'APPROVED') return json({ success: false, message: 'Gian hàng chưa được duyệt.' }, 403);
    const title = String(body?.title || '').trim();
    const currentPrice = Math.floor(Number(body?.current_price));
    if (!title || !Number.isFinite(currentPrice) || currentPrice < 0) return json({ success: false, message: 'Thiếu tên sản phẩm hoặc giá không hợp lệ.' }, 400);
    const productId = newId('mp_prod');
    await env.DB.prepare(`INSERT INTO marketplace_products (id, seller_id, title, game_slug, game_name, product_type, original_price, current_price, stock_quantity, approval_status, is_active, instructions) VALUES (?, ?, ?, ?, ?, 'CODE', ?, ?, 0, 'PENDING', 1, ?)`).bind(productId, seller.id, title, String(body?.game_slug || ''), String(body?.game_name || ''), Math.floor(Number(body?.original_price) || currentPrice), currentPrice, String(body?.instructions || '')).run();
    const product = await env.DB.prepare('SELECT * FROM marketplace_products WHERE id = ? LIMIT 1').bind(productId).first<any>();
    return json({ success: true, message: 'Đã tạo sản phẩm, đang chờ quản trị duyệt.', product });
  }

  // Duyệt sản phẩm: chỉ quản trị.
  if (pathname === '/api/marketplace/products/approve') {
    const member = await getMemberFromRequest(request, env);
    if (!member || !isAdmin(member)) return json({ success: false, message: 'Không có quyền quản trị.' }, 403);
    const productId = String(body?.product_id || '').trim();
    const status = String(body?.status || '').toUpperCase();
    if (!productId || !['APPROVED', 'REJECTED'].includes(status)) return json({ success: false, message: 'Trạng thái duyệt không hợp lệ.' }, 400);
    await env.DB.prepare(`UPDATE marketplace_products SET approval_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, productId).run();
    const product = await env.DB.prepare('SELECT * FROM marketplace_products WHERE id = ? LIMIT 1').bind(productId).first<any>();
    if (!product) return json({ success: false, message: 'Không tìm thấy sản phẩm.' }, 404);
    return json({ success: true, product });
  }

  // Nạp mã: chỉ chủ gian hàng của sản phẩm đó, mã không bao giờ trả về ở danh sách.
  if (pathname === '/api/marketplace/codes') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller || seller.status !== 'APPROVED') return json({ success: false, message: 'Gian hàng chưa được duyệt.' }, 403);
    const productId = String(body?.product_id || '').trim();
    const codes = Array.isArray(body?.codes) ? body.codes.map((c: any) => String(c || '').trim()).filter(Boolean) : [];
    if (!productId || codes.length === 0 || codes.length > 100) return json({ success: false, message: 'Cần 1–100 mã cho mỗi lần nạp.' }, 400);
    const product = await env.DB.prepare('SELECT * FROM marketplace_products WHERE id = ? LIMIT 1').bind(productId).first<any>();
    if (!product || product.seller_id !== seller.id) return json({ success: false, message: 'Không tìm thấy sản phẩm của gian hàng.' }, 404);
    const uniqueCodes = [...new Set(codes)];
    const stmts = uniqueCodes.map((code: string) => env.DB.prepare(`INSERT INTO marketplace_inventory_codes (id, product_id, seller_id, code_content, status) VALUES (?, ?, ?, ?, 'AVAILABLE')`).bind(newId('mp_code'), productId, seller.id, code));
    await env.DB.batch(stmts);
    const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM marketplace_inventory_codes WHERE product_id = ? AND status = 'AVAILABLE'`).bind(productId).first<any>();
    await env.DB.prepare(`UPDATE marketplace_products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?`).bind(Number(countRow?.cnt || 0), productId).run();
    return json({ success: true, message: `Đã nạp ${uniqueCodes.length} mã.`, available_codes: Number(countRow?.cnt || 0) });
  }

  // Tạo đơn sàn: trừ ví người mua, giao mã ngay, tiền vào giữ, không tự sinh mã.
  if (pathname === '/api/marketplace/orders/create') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const rawKey = request.headers.get('Idempotency-Key') || body?.idempotencyKey || '';
    const idempotencyKey = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (!idempotencyKey || !/^[a-zA-Z0-9_\-]{8,128}$/.test(idempotencyKey)) return json({ success: false, message: 'Cần Idempotency-Key hợp lệ (8–128 ký tự).', code: 'INVALID_IDEMPOTENCY_KEY' }, 400);
    const productId = String(body?.product_id || '').trim();
    const quantity = Math.max(1, Math.min(999, Math.floor(Number(body?.quantity) || 1)));
    if (!productId) return json({ success: false, message: 'Thiếu sản phẩm.' }, 400);
    const existingOrder = await env.DB.prepare(`SELECT * FROM orders WHERE member_id = ? AND idempotency_key = ? AND product_id = ? LIMIT 1`).bind(member.id, idempotencyKey, productId).first<any>().catch(() => null);
    if (existingOrder) {
      const codeRows = await env.DB.prepare(`SELECT code_content FROM marketplace_inventory_codes WHERE order_id = ? ORDER BY id ASC`).bind(existingOrder.id).all<any>();
      return json({ success: true, isIdempotentReplay: true, order: existingOrder, deliveredCodes: (codeRows.results || []).map((r: any) => r.code_content) });
    }
    const product = await env.DB.prepare(`SELECT * FROM marketplace_products WHERE id = ? LIMIT 1`).bind(productId).first<any>();
    if (!product || product.approval_status !== 'APPROVED' || product.is_active !== 1) return json({ success: false, message: 'Sản phẩm không tồn tại hoặc chưa được duyệt bán.' }, 404);
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(product.seller_id).first<any>();
    if (!seller || seller.status !== 'APPROVED') return json({ success: false, message: 'Gian hàng chưa được duyệt.' }, 403);
    if (seller.member_id === member.id) return json({ success: false, message: 'Không được tự mua sản phẩm của chính mình.' }, 403);
    const settings = await env.DB.prepare(`SELECT * FROM marketplace_settings WHERE id = 'default' LIMIT 1`).first<any>();
    if (!settings || settings.commission_percent === null || settings.commission_percent === undefined) return json({ success: false, message: 'Sàn chưa cài đặt tỷ lệ phí, chưa mở bán.' }, 400);
    const unitPrice = Number(product.current_price) || 0;
    const gross = unitPrice * quantity;
    const commission = Math.floor(gross * Number(settings.commission_percent) / 100);
    const buyerBalance = Number(member.balance) || 0;
    if (buyerBalance < gross) return json({ success: false, message: 'Số dư ví không đủ.', code: 'INSUFFICIENT_BALANCE' }, 400);
    const availableRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM marketplace_inventory_codes WHERE product_id = ? AND status = 'AVAILABLE'`).bind(productId).first<any>();
    if (Number(availableRow?.cnt || 0) < quantity) return json({ success: false, message: 'Sản phẩm đã hết hàng hoặc không đủ số lượng.', code: 'OUT_OF_STOCK' }, 400);
    const orderId = newId('MPORD');
    const escrowId = newId('mp_escrow');
    const ledgerId = newId('mp_ledger');
    const walletTxId = newId('mp_tx');
    try {
      await env.DB.batch([
        env.DB.prepare(`UPDATE marketplace_inventory_codes SET status = 'SOLD', order_id = ?, sold_at = datetime('now') WHERE id IN (SELECT id FROM marketplace_inventory_codes WHERE product_id = ? AND status = 'AVAILABLE' ORDER BY created_at ASC, id ASC LIMIT ?)`).bind(orderId, productId, quantity),
        env.DB.prepare(`UPDATE members SET balance = balance - ?, total_spent = total_spent + ?, updated_at = datetime('now') WHERE id = ?`).bind(gross, gross, member.id),
        env.DB.prepare(`UPDATE marketplace_products SET stock_quantity = MAX(0, stock_quantity - ?), sold_count = sold_count + ?, updated_at = datetime('now') WHERE id = ?`).bind(quantity, quantity, productId),
        env.DB.prepare(`INSERT INTO orders (id, member_id, buyer_email, product_id, product_title, quantity, unit_price, total_amount, status, balance_before, balance_after, delivered_codes, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, (SELECT json_group_array(code_content) FROM marketplace_inventory_codes WHERE order_id = ?), ?, datetime('now'))`).bind(orderId, member.id, member.email, productId, product.title, quantity, unitPrice, gross, buyerBalance, buyerBalance - gross, orderId, idempotencyKey),
        env.DB.prepare(`INSERT INTO marketplace_escrow (id, order_id, seller_id, buyer_id, gross_amount, commission_amount, net_amount, status) VALUES (?, ?, ?, ?, ?, ?, (SELECT CASE WHEN (SELECT COUNT(*) FROM marketplace_inventory_codes WHERE order_id = ?) = ? THEN ? ELSE NULL END), 'HELD')`).bind(escrowId, orderId, seller.id, member.id, gross, commission, orderId, quantity, gross - commission),
        env.DB.prepare(`INSERT INTO marketplace_ledger (id, seller_id, order_id, type, amount, balance_before, balance_after, held_before, held_after, description) VALUES (?, ?, ?, 'ESCROW_HOLD', ?, ?, ?, ?, ?, ?)`).bind(ledgerId, seller.id, orderId, gross - commission, Number(seller.available_balance) || 0, Number(seller.available_balance) || 0, Number(seller.held_balance) || 0, (Number(seller.held_balance) || 0) + (gross - commission), `Giữ tiền đơn ${orderId}`),
        env.DB.prepare(`UPDATE sellers SET held_balance = held_balance + ?, total_sold = total_sold + ?, updated_at = datetime('now') WHERE id = ?`).bind(gross - commission, quantity, seller.id),
        env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, member_email, type, amount, balance_before, balance_after, description, status, order_id, created_at) VALUES (?, ?, ?, 'ORDER_PAYMENT', ?, ?, ?, ?, 'COMPLETED', ?, datetime('now'))`).bind(walletTxId, member.id, member.email, -gross, buyerBalance, buyerBalance - gross, `Thanh toán đơn sàn ${orderId}`, orderId),
      ]);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('CHECK constraint') || msg.includes('NOT NULL') || msg.includes('UNIQUE')) {
        return json({ success: false, message: 'Sản phẩm đã hết hàng hoặc số dư không đủ, giao dịch đã hủy.', code: 'OUT_OF_STOCK' }, 400);
      }
      return json({ success: false, message: 'Lỗi giao dịch: ' + msg, code: 'DB_ERROR' }, 500);
    }
    const codeRows = await env.DB.prepare(`SELECT code_content FROM marketplace_inventory_codes WHERE order_id = ? ORDER BY id ASC`).bind(orderId).all<any>();
    const updatedMember = await env.DB.prepare('SELECT balance FROM members WHERE id = ? LIMIT 1').bind(member.id).first<any>();
    return json({ success: true, message: 'Đã mua và giao mã, tiền đang giữ chờ xác nhận.', orderId, deliveredCodes: (codeRows.results || []).map((r: any) => r.code_content), remainingBalance: updatedMember ? Number(updatedMember.balance) : undefined, escrowStatus: 'HELD' });
  }

  // Xác nhận đã dùng được: chỉ người mua, không có khiếu nại mở, tiền giữ chuyển thành tiền khả dụng.
  if (pathname === '/api/marketplace/orders/confirm') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const orderId = String(body?.order_id || '').trim();
    if (!orderId) return json({ success: false, message: 'Thiếu đơn hàng.' }, 400);
    const escrow = await env.DB.prepare(`SELECT * FROM marketplace_escrow WHERE order_id = ? LIMIT 1`).bind(orderId).first<any>();
    if (!escrow || escrow.buyer_id !== member.id) return json({ success: false, message: 'Không tìm thấy đơn hàng của bạn.' }, 404);
    if (escrow.status !== 'HELD') return json({ success: false, message: 'Đơn này không còn ở trạng thái giữ tiền.' }, 400);
    const dispute = await env.DB.prepare(`SELECT * FROM marketplace_disputes WHERE order_id = ? AND status = 'OPEN' LIMIT 1`).bind(orderId).first<any>();
    if (dispute) return json({ success: false, message: 'Đơn đang có khiếu nại mở, chưa thể xác nhận.' }, 400);
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(escrow.seller_id).first<any>();
    if (!seller) return json({ success: false, message: 'Không tìm thấy gian hàng.' }, 404);
    try {
      await env.DB.batch([
        env.DB.prepare(`UPDATE marketplace_escrow SET status = 'RELEASED', released_at = datetime('now') WHERE order_id = ? AND status = 'HELD'`).bind(orderId),
        env.DB.prepare(`INSERT INTO marketplace_ledger (id, seller_id, order_id, type, amount, balance_before, balance_after, held_before, held_after, description) VALUES (?, ?, ?, 'ESCROW_RELEASE', ?, ?, ?, ?, ?, ?)`).bind(newId('mp_ledger'), seller.id, orderId, Number(escrow.net_amount), Number(seller.available_balance) || 0, (Number(seller.available_balance) || 0) + Number(escrow.net_amount), Number(seller.held_balance) || 0, Math.max(0, (Number(seller.held_balance) || 0) - Number(escrow.net_amount)), `Trả tiền giữ đơn ${orderId}`),
        env.DB.prepare(`UPDATE sellers SET available_balance = available_balance + ?, held_balance = MAX(0, held_balance - ?), updated_at = datetime('now') WHERE id = ?`).bind(Number(escrow.net_amount), Number(escrow.net_amount), seller.id),
        env.DB.prepare(`UPDATE orders SET status = 'COMPLETED' WHERE id = ?`).bind(orderId),
      ]);
    } catch (err: any) {
      return json({ success: false, message: 'Xác nhận thất bại, có thể đơn đã được xác nhận trước đó.', code: 'DB_ERROR' }, 400);
    }
    return json({ success: true, message: 'Đã xác nhận, tiền giữ đã chuyển cho người bán.', orderId, escrowStatus: 'RELEASED' });
  }

  // Mở khiếu nại: chỉ người mua, tiền giữ đứng yên cho tới khi quản trị quyết.
  if (pathname === '/api/marketplace/disputes') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const orderId = String(body?.order_id || '').trim();
    const reason = String(body?.reason || '').trim();
    if (!orderId || !reason) return json({ success: false, message: 'Thiếu đơn hàng hoặc lý do khiếu nại.' }, 400);
    const escrow = await env.DB.prepare(`SELECT * FROM marketplace_escrow WHERE order_id = ? LIMIT 1`).bind(orderId).first<any>();
    if (!escrow || escrow.buyer_id !== member.id) return json({ success: false, message: 'Không tìm thấy đơn hàng của bạn.' }, 404);
    if (escrow.status !== 'HELD') return json({ success: false, message: 'Đơn này không còn ở trạng thái giữ tiền.' }, 400);
    const existing = await env.DB.prepare(`SELECT * FROM marketplace_disputes WHERE order_id = ? AND status = 'OPEN' LIMIT 1`).bind(orderId).first<any>();
    if (existing) return json({ success: false, message: 'Đơn đã có khiếu nại mở.', dispute: existing }, 400);
    const disputeId = newId('mp_dispute');
    await env.DB.prepare(`INSERT INTO marketplace_disputes (id, order_id, buyer_id, seller_id, reason, evidence_text, status) VALUES (?, ?, ?, ?, ?, ?, 'OPEN')`).bind(disputeId, orderId, member.id, escrow.seller_id, reason, String(body?.evidence_text || '')).run();
    const dispute = await env.DB.prepare('SELECT * FROM marketplace_disputes WHERE id = ? LIMIT 1').bind(disputeId).first<any>();
    return json({ success: true, message: 'Đã mở khiếu nại, tiền giữ sẽ đứng yên chờ quản trị quyết.', dispute });
  }

  // Quản trị xử lý khiếu nại: trả tiền, hoàn tiền, hoặc bác khiếu nại.
  // Hoàn tiền KHÔNG thu hồi mã trong marketplace_inventory_codes vì mã có thể đã dùng rồi.
  if (pathname === '/api/marketplace/disputes/resolve') {
    const member = await getMemberFromRequest(request, env);
    if (!member || !isAdmin(member)) return json({ success: false, message: 'Không có quyền quản trị.' }, 403);
    const disputeId = String(body?.dispute_id || '').trim();
    const decision = String(body?.decision || '').toUpperCase();
    const adminNote = String(body?.admin_note || '');
    if (!disputeId || !['RESOLVED_RELEASE', 'RESOLVED_REFUND', 'REJECTED'].includes(decision)) return json({ success: false, message: 'Quyết định không hợp lệ.' }, 400);
    const dispute = await env.DB.prepare(`SELECT * FROM marketplace_disputes WHERE id = ? LIMIT 1`).bind(disputeId).first<any>();
    if (!dispute || dispute.status !== 'OPEN') return json({ success: false, message: 'Không tìm thấy khiếu nại đang mở.' }, 404);
    const escrow = await env.DB.prepare(`SELECT * FROM marketplace_escrow WHERE order_id = ? LIMIT 1`).bind(dispute.order_id).first<any>();
    if (!escrow || escrow.status !== 'HELD') return json({ success: false, message: 'Đơn này không còn ở trạng thái giữ tiền.' }, 400);
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(escrow.seller_id).first<any>();
    if (!seller) return json({ success: false, message: 'Không tìm thấy gian hàng.' }, 404);
    const netAmount = Number(escrow.net_amount);
    const grossAmount = Number(escrow.gross_amount);
    try {
      if (decision === 'RESOLVED_RELEASE') {
        await env.DB.batch([
          env.DB.prepare(`UPDATE marketplace_escrow SET status = 'RELEASED', released_at = datetime('now') WHERE order_id = ? AND status = 'HELD'`).bind(escrow.order_id),
          env.DB.prepare(`INSERT INTO marketplace_ledger (id, seller_id, order_id, type, amount, balance_before, balance_after, held_before, held_after, description) VALUES (?, ?, ?, 'ESCROW_RELEASE', ?, ?, ?, ?, ?, ?)`).bind(newId('mp_ledger'), seller.id, escrow.order_id, netAmount, Number(seller.available_balance) || 0, (Number(seller.available_balance) || 0) + netAmount, Number(seller.held_balance) || 0, Math.max(0, (Number(seller.held_balance) || 0) - netAmount), `Quản trị trả tiền giữ đơn ${escrow.order_id}`),
          env.DB.prepare(`UPDATE sellers SET available_balance = available_balance + ?, held_balance = MAX(0, held_balance - ?), updated_at = datetime('now') WHERE id = ?`).bind(netAmount, netAmount, seller.id),
          env.DB.prepare(`UPDATE orders SET status = 'COMPLETED' WHERE id = ?`).bind(escrow.order_id),
          env.DB.prepare(`UPDATE marketplace_disputes SET status = 'RESOLVED_RELEASE', admin_note = ?, resolved_at = datetime('now') WHERE id = ?`).bind(adminNote, disputeId),
        ]);
      } else if (decision === 'RESOLVED_REFUND') {
        const buyer = await env.DB.prepare('SELECT * FROM members WHERE id = ? LIMIT 1').bind(escrow.buyer_id).first<any>();
        if (!buyer) return json({ success: false, message: 'Không tìm thấy người mua.' }, 404);
        const buyerBalance = Number(buyer.balance) || 0;
        await env.DB.batch([
          env.DB.prepare(`UPDATE marketplace_escrow SET status = 'REFUNDED', refunded_at = datetime('now') WHERE order_id = ? AND status = 'HELD'`).bind(escrow.order_id),
          env.DB.prepare(`INSERT INTO marketplace_ledger (id, seller_id, order_id, type, amount, balance_before, balance_after, held_before, held_after, description) VALUES (?, ?, ?, 'ESCROW_REFUND', ?, ?, ?, ?, ?, ?)`).bind(newId('mp_ledger'), seller.id, escrow.order_id, -netAmount, Number(seller.available_balance) || 0, Number(seller.available_balance) || 0, Number(seller.held_balance) || 0, Math.max(0, (Number(seller.held_balance) || 0) - netAmount), `Quản trị hoàn tiền giữ đơn ${escrow.order_id}`),
          env.DB.prepare(`UPDATE sellers SET held_balance = MAX(0, held_balance - ?), updated_at = datetime('now') WHERE id = ?`).bind(netAmount, seller.id),
          env.DB.prepare(`UPDATE members SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`).bind(grossAmount, buyer.id),
          env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, member_email, type, amount, balance_before, balance_after, description, status, order_id, created_at) VALUES (?, ?, ?, 'REFUND', ?, ?, ?, ?, 'COMPLETED', ?, datetime('now'))`).bind(newId('mp_tx'), buyer.id, buyer.email, grossAmount, buyerBalance, buyerBalance + grossAmount, `Hoàn tiền đơn sàn ${escrow.order_id}`, escrow.order_id),
          env.DB.prepare(`UPDATE orders SET status = 'CANCELLED' WHERE id = ?`).bind(escrow.order_id),
          env.DB.prepare(`UPDATE marketplace_disputes SET status = 'RESOLVED_REFUND', admin_note = ?, resolved_at = datetime('now') WHERE id = ?`).bind(adminNote, disputeId),
        ]);
      } else {
        await env.DB.prepare(`UPDATE marketplace_disputes SET status = 'REJECTED', admin_note = ?, resolved_at = datetime('now') WHERE id = ?`).bind(adminNote, disputeId).run();
      }
    } catch (err: any) {
      return json({ success: false, message: 'Xử lý khiếu nại thất bại, có thể đơn đã được thanh toán trước đó.', code: 'DB_ERROR' }, 400);
    }
    const updatedDispute = await env.DB.prepare('SELECT * FROM marketplace_disputes WHERE id = ? LIMIT 1').bind(disputeId).first<any>();
    return json({ success: true, message: decision === 'RESOLVED_RELEASE' ? 'Đã trả tiền giữ cho người bán.' : decision === 'RESOLVED_REFUND' ? 'Đã hoàn tiền cho người mua.' : 'Đã bác khiếu nại.', dispute: updatedDispute });
  }

  // Tự động trả: chỉ là điểm để lịch gọi sau, chưa tự chạy được, chưa nối Cron Trigger.
  if (pathname === '/api/marketplace/escrow/auto-release') {
    const member = await getMemberFromRequest(request, env);
    const syncSecret = request.headers.get('X-Admin-Sync-Secret') || '';
    const authorized = (member && isAdmin(member)) || (env.ADMIN_SYNC_SECRET && syncSecret === env.ADMIN_SYNC_SECRET);
    if (!authorized) return json({ success: false, message: 'Không có quyền chạy tự động trả.' }, 403);
    const settings = await env.DB.prepare(`SELECT * FROM marketplace_settings WHERE id = 'default' LIMIT 1`).first<any>();
    if (!settings || settings.auto_release_hours === null || settings.auto_release_hours === undefined) return json({ success: false, message: 'Sàn chưa cài đặt thời gian tự động trả.' }, 400);
    const due = (await env.DB.prepare(`SELECT * FROM marketplace_escrow WHERE status = 'HELD' AND held_at <= datetime('now', '-' || ? || ' hours') AND NOT EXISTS (SELECT 1 FROM marketplace_disputes WHERE order_id = marketplace_escrow.order_id AND status = 'OPEN') ORDER BY held_at ASC LIMIT 100`).bind(Number(settings.auto_release_hours)).all<any>()).results || [];
    let released = 0;
    const failed: string[] = [];
    for (const escrowRow of due) {
      const sellerRow = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(escrowRow.seller_id).first<any>();
      if (!sellerRow) { failed.push(String(escrowRow.order_id)); continue; }
      try {
        await env.DB.batch([
          env.DB.prepare(`UPDATE marketplace_escrow SET status = 'RELEASED', released_at = datetime('now') WHERE order_id = ? AND status = 'HELD'`).bind(escrowRow.order_id),
          env.DB.prepare(`INSERT INTO marketplace_ledger (id, seller_id, order_id, type, amount, balance_before, balance_after, held_before, held_after, description) VALUES (?, ?, ?, 'ESCROW_RELEASE', ?, ?, ?, ?, ?, ?)`).bind(newId('mp_ledger'), sellerRow.id, escrowRow.order_id, Number(escrowRow.net_amount), Number(sellerRow.available_balance) || 0, (Number(sellerRow.available_balance) || 0) + Number(escrowRow.net_amount), Number(sellerRow.held_balance) || 0, Math.max(0, (Number(sellerRow.held_balance) || 0) - Number(escrowRow.net_amount)), `Tự động trả tiền giữ đơn ${escrowRow.order_id}`),
          env.DB.prepare(`UPDATE sellers SET available_balance = available_balance + ?, held_balance = MAX(0, held_balance - ?), updated_at = datetime('now') WHERE id = ?`).bind(Number(escrowRow.net_amount), Number(escrowRow.net_amount), sellerRow.id),
          env.DB.prepare(`UPDATE orders SET status = 'COMPLETED' WHERE id = ?`).bind(escrowRow.order_id),
        ]);
        released += 1;
      } catch {
        failed.push(String(escrowRow.order_id));
      }
    }
    return json({ success: true, message: `Đã tự động trả ${released} đơn.`, due: due.length, released, failed });
  }

  // Người bán tạo yêu cầu rút tiền: chưa trừ tiền, chờ quản trị duyệt trả.
  if (pathname === '/api/marketplace/payouts') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller || seller.status !== 'APPROVED') return json({ success: false, message: 'Gian hàng chưa được duyệt.' }, 403);
    const amount = Math.floor(Number(body?.amount) || 0);
    if (amount <= 0) return json({ success: false, message: 'Số tiền rút phải lớn hơn 0.' }, 400);
    if (amount > (Number(seller.available_balance) || 0)) return json({ success: false, message: 'Số tiền rút vượt số dư khả dụng.' }, 400);
    const payoutId = newId('mp_payout');
    await env.DB.prepare(`INSERT INTO marketplace_payouts (id, seller_id, amount, status) VALUES (?, ?, ?, 'PENDING')`).bind(payoutId, seller.id, amount).run();
    const payout = await env.DB.prepare('SELECT * FROM marketplace_payouts WHERE id = ? LIMIT 1').bind(payoutId).first<any>();
    return json({ success: true, message: 'Đã tạo yêu cầu rút tiền, đang chờ quản trị duyệt trả.', payout });
  }

  // Quản trị duyệt rút tiền: chỉ khi trả mới trừ số dư khả dụng, bác thì không động tiền.
  if (pathname === '/api/marketplace/payouts/approve') {
    const member = await getMemberFromRequest(request, env);
    if (!member || !isAdmin(member)) return json({ success: false, message: 'Không có quyền quản trị.' }, 403);
    const payoutId = String(body?.payout_id || '').trim();
    const status = String(body?.status || '').toUpperCase();
    const adminNote = String(body?.admin_note || '');
    if (!payoutId || !['PAID', 'REJECTED'].includes(status)) return json({ success: false, message: 'Trạng thái duyệt không hợp lệ.' }, 400);
    const payout = await env.DB.prepare('SELECT * FROM marketplace_payouts WHERE id = ? LIMIT 1').bind(payoutId).first<any>();
    if (!payout || payout.status !== 'PENDING') return json({ success: false, message: 'Không tìm thấy yêu cầu rút đang chờ.' }, 404);
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(payout.seller_id).first<any>();
    if (!seller) return json({ success: false, message: 'Không tìm thấy gian hàng.' }, 404);
    try {
      if (status === 'PAID') {
        if (Number(payout.amount) > (Number(seller.available_balance) || 0)) return json({ success: false, message: 'Số dư khả dụng của gian hàng không còn đủ.' }, 400);
        await env.DB.batch([
          env.DB.prepare(`UPDATE sellers SET available_balance = available_balance - ?, updated_at = datetime('now') WHERE id = ?`).bind(Number(payout.amount), seller.id),
          env.DB.prepare(`INSERT INTO marketplace_ledger (id, seller_id, order_id, type, amount, balance_before, balance_after, held_before, held_after, description) VALUES (?, ?, NULL, 'PAYOUT', ?, ?, ?, ?, ?, ?)`).bind(newId('mp_ledger'), seller.id, -Number(payout.amount), Number(seller.available_balance) || 0, (Number(seller.available_balance) || 0) - Number(payout.amount), Number(seller.held_balance) || 0, Number(seller.held_balance) || 0, `Duyệt trả yêu cầu rút ${payoutId}`),
          env.DB.prepare(`UPDATE marketplace_payouts SET status = 'PAID', admin_note = ?, paid_at = datetime('now') WHERE id = ? AND status = 'PENDING'`).bind(adminNote, payoutId),
        ]);
      } else {
        await env.DB.prepare(`UPDATE marketplace_payouts SET status = 'REJECTED', admin_note = ? WHERE id = ? AND status = 'PENDING'`).bind(adminNote, payoutId).run();
      }
    } catch (err: any) {
      return json({ success: false, message: 'Duyệt rút tiền thất bại.', code: 'DB_ERROR' }, 400);
    }
    const updatedPayout = await env.DB.prepare('SELECT * FROM marketplace_payouts WHERE id = ? LIMIT 1').bind(payoutId).first<any>();
    return json({ success: true, payout: updatedPayout });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};
