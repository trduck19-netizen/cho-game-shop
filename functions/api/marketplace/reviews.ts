// Khối 5 — Đánh giá sau mua và xếp hạng gian hàng cho sàn cho-game-shop.
//
// PHẠM VI FILE NÀY (chỉ tạo mới, không sửa file cũ):
// - Dùng bảng marketplace_reviews đã có sẵn trong migration 0012 (order_id UNIQUE,
//   rating 1-5, seller_id, buyer_id, comment, created_at). Không tạo bảng trùng,
//   không sửa migration cũ, không sửa role members, không sửa wallet_transactions.
// - File này CHƯA được nối vào functions/_worker.ts. Đoạn nối cần thiết nằm ở
//   cuối file (phần GHI CHÚ NỐI _WORKER) để điều phối viên gộp bằng tay.
// - Chỉ bán mã dùng một lần: file này không sinh mã, không mua hàng, không động
//   tiền giữ, không động ví. Nó chỉ đọc đơn đã hoàn tất và ghi đánh giá.
//
// QUY TẮC ĐÁNH GIÁ (ghi rõ để khỏi hiểu lầm khi gộp):
// - "Mua thành công" = đơn sàn có status = 'COMPLETED' trong bảng orders.
//   Đơn PENDING (đang giữ tiền, chưa xác nhận) chưa được đánh giá; đơn
//   CANCELLED (đã hoàn tiền) và FAILED không được đánh giá.
// - Một đơn chỉ có đúng một đánh giá: marketplace_reviews.order_id là UNIQUE,
//   API kiểm tra trước rồi mới ghi, và vẫn bắt lỗi UNIQUE nếu hai yêu cầu
//   tới cùng lúc (trả 409, không ghi đè, không cộng điểm 2 lần).
// - Người đánh giá phải đúng là người mua của đơn đó (orders.member_id).
// - Đơn phải là đơn sàn: sản phẩm phải thuộc marketplace_products, hoặc có
//   dòng marketplace_escrow tương ứng. Đơn cửa hàng cũ (store_products) không
//   có hai dấu này nên bị chặn, không lọt đánh giá giả.
// - Điểm sao của gian hàng KHÔNG lưu trung bình sẵn: sellers chỉ giữ
//   rating_sum và rating_count (đã có trong migration 0012). Trung bình luôn
//   tính lúc đọc: rating_sum / rating_count. Gian hàng chưa có đánh giá thì
//   trung bình là null và giao diện phải hiện "Chưa có đánh giá", tuyệt đối
//   không hiện 0 sao hay 5 sao mặc định.
//
// CÔNG THỨC XẾP HẠNG (xem thêm ở hàm buildSellerRanking):
// - ty_le_thanh_cong = don_thanh_cong / don_da_ket_thuc, trong đó
//   don_da_ket_thuc = don_thanh_cong (COMPLETED) + don_da_huy (CANCELLED).
//   Đơn PENDING (đang giữ tiền, chưa có kết quả) KHÔNG tính vào mẫu số, vì
//   tính nó vào sẽ làm gian hàng đang bán chạy trông như thất bại.
// - Khiếu nại đã giải quyết hoàn tiền đã nằm trong don_da_huy nên đã trừ vào
//   tỷ lệ thành công. Khiếu nại đang mở chưa có kết luận nên KHÔNG trừ điểm
//   trực tiếp; nó chỉ hiển thị công khai và dùng làm tiêu chí xếp sau khi hòa
//   điểm (ít khiếu nại mở xếp trước).
// - diem_xep_hang (0-1, chỉ để sắp xếp, không phải số liệu trưng bày):
//     có cả sao và tỷ lệ thành công: 0.6 * (sao_trung_binh / 5) + 0.4 * ty_le_thanh_cong
//     chỉ có sao:                       sao_trung_binh / 5
//     chỉ có tỷ lệ thành công:          ty_le_thanh_cong
//     không có cả hai:                  null (xếp cuối, không bịa điểm)
// - Thứ tự xếp hạng: diem_xep_hang giảm dần, rồi số lượt đánh giá giảm dần,
//   rồi total_sold giảm dần, rồi tên gian hàng tăng dần.
// - Số lượt bán hiển thị lấy NGUYÊN từ sellers.total_sold (số mã đã giao khi
//   tạo đơn, theo đúng đợt 1+2) và kèm thêm don_thanh_cong riêng. TUYỆT ĐỐI
//   KHÔNG cộng thêm số ảo, không làm tròn đẹp, không hiển thị số mô phỏng.
//
// Ý TƯỞNG TĂNG TRƯỞNG HỌC TỪ SÀN KHÁC (bổ sung 02/11, chỉ lấy cách làm chung,
// không sao chép nội dung, không bịa con số của đối thủ):
// - Nhãn "Đã mua hàng" trên mọi đánh giá: học cách các sàn lớn gắn nhãn đơn
//   đã xác minh cho đánh giá (ví dụ nhãn Verified Purchase). Ở sàn này nhãn
//   còn chặt hơn nhãn của họ: không phải "gắn nhãn khi mua được", mà là cửa
//   chặn — không mua thành công thì không đánh giá được, nên mọi đánh giá
//   hiện ra đều mặc nhiên là đã mua hàng thật.
// - Phân bổ sao 5-1 và sắp xếp theo mới nhất / sao cao / sao thấp / hữu ích
//   nhất: cách trình bày chung của các sàn để người mua nhìn một lượt là thấy
//   gian hàng mạnh hay yếu ở mức sao nào, thay vì chỉ thấy một con số trung bình.
// - Nút "Hữu ích" cho từng đánh giá: học cách các sàn cho người đọc bình chọn
//   đánh giá nào đáng đọc nhất. Khác với sàn vật lý: số hữu ích ở đây luôn đếm
//   trực tiếp từ bảng bình chọn (COUNT), không lưu bộ đếm sẵn để khỏi lệch;
//   mỗi người chỉ bình chọn một lần cho một đánh giá; chủ gian hàng và chính
//   tác giả đánh giá không được tự bình chọn cho đánh giá đó.
// - Huy hiệu "Gian hàng uy tín" suy ra từ số thật: học cách các sàn hiển thị
//   bậc/huy hiệu tin cậy cho người bán có lịch sử tốt. Áp dụng khác đi cho
//   sàn mã số: huy hiệu KHÔNG lưu cứng, chỉ tính lúc đọc từ sao trung bình +
//   tỷ lệ thành công + số đơn đã kết thúc, ngưỡng ghi rõ ở TRUST_BADGE bên
//   dưới để điều phối viên đổi được mà không động dữ liệu.
// - CỐ TÌNH KHÔNG ÁP DỤNG: đánh giá kèm ảnh (mã số là hàng số, không có vật
//   phẩm để chụp, ảnh "minh chứng" dễ thành ảnh mượn); thưởng cho đánh giá
//   (các sàn cấm thưởng chỉ để lấy đánh giá tốt, và thưởng sẽ làm lệch sao);
//   mã giảm giá riêng cho gian hàng (động giá/đơn, thuộc khối tài chính, không
//   làm lén trong khối đánh giá).

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

// Ngưỡng huy hiệu "Gian hàng uy tín" — chỉ là quy tắc hiển thị, không phải
// dữ liệu lưu trữ. Đổi 3 con số này là đổi huy hiệu toàn sàn, không cần sửa
// dữ liệu cũ. Ngưỡng hiện tại là đề xuất của khối 5, điều phối viên/user có
// thể chốt lại trước khi công bố.
const TRUST_BADGE = {
  minRatingAverage: 4.5,
  minSuccessRate: 0.9,
  minFinishedOrders: 10,
};

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// Bảo vệ chạy: chỉ tạo bảng khi chưa có (IF NOT EXISTS), đúng định nghĩa của
// migration 0012 (bảng reviews) và migration 0013 của khối 5 (bảng bình chọn
// hữu ích), không bao giờ sửa bảng đã tồn tại. Nút này chỉ phòng trường hợp
// cơ sở dữ liệu thử chưa chạy migration; trên cơ sở dữ liệu đã chạy migration
// thì nó không làm gì thêm.
async function ensureReviewsTable(db: any) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS marketplace_reviews (id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, seller_id TEXT NOT NULL, buyer_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), comment TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    )
    .run()
    .catch(() => {});
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_seller_id ON marketplace_reviews(seller_id)`)
    .run()
    .catch(() => {});
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS marketplace_review_votes (id TEXT PRIMARY KEY, review_id TEXT NOT NULL, buyer_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(review_id, buyer_id))`,
    )
    .run()
    .catch(() => {});
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_marketplace_review_votes_review_id ON marketplace_review_votes(review_id)`)
    .run()
    .catch(() => {});
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

// Kết quả kiểm tra quyền đánh giá của một đơn. eligible = true chỉ khi đủ mọi
// điều kiện; ngược lại reason cho giao diện biết vì sao ẩn form đánh giá.
type Eligibility =
  | { eligible: true; sellerId: string; order: any; product: any | null }
  | { eligible: false; reason: string; message: string; order: any | null };

async function checkReviewEligibility(db: any, orderId: string, buyerId: string): Promise<Eligibility> {
  const order = await db.prepare('SELECT * FROM orders WHERE id = ? LIMIT 1').bind(orderId).first<any>().catch(() => null);
  if (!order) {
    return { eligible: false, reason: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng.', order: null };
  }
  if (order.member_id !== buyerId) {
    return { eligible: false, reason: 'NOT_BUYER', message: 'Chỉ người mua của đơn này mới được đánh giá.', order };
  }
  if (order.status !== 'COMPLETED') {
    return {
      eligible: false,
      reason: 'ORDER_NOT_COMPLETED',
      message:
        order.status === 'CANCELLED'
          ? 'Đơn đã hủy hoặc đã hoàn tiền nên không được đánh giá.'
          : 'Đơn chưa hoàn tất (tiền vẫn đang giữ hoặc chưa xác nhận) nên chưa được đánh giá.',
      order,
    };
  }
  const product = await db.prepare('SELECT * FROM marketplace_products WHERE id = ? LIMIT 1').bind(order.product_id).first<any>().catch(() => null);
  const escrow = await db.prepare('SELECT * FROM marketplace_escrow WHERE order_id = ? LIMIT 1').bind(orderId).first<any>().catch(() => null);
  const sellerId = product?.seller_id || escrow?.seller_id || null;
  if (!sellerId) {
    return { eligible: false, reason: 'NOT_MARKETPLACE_ORDER', message: 'Đơn này không phải đơn của sàn nên không được đánh giá tại đây.', order };
  }
  if (product && escrow && product.seller_id !== escrow.seller_id) {
    return { eligible: false, reason: 'SELLER_MISMATCH', message: 'Dữ liệu đơn không nhất quán, tạm thời không thể đánh giá. Vui lòng liên hệ quản trị.', order };
  }
  const existing = await db.prepare('SELECT * FROM marketplace_reviews WHERE order_id = ? LIMIT 1').bind(orderId).first<any>().catch(() => null);
  if (existing) {
    return { eligible: false, reason: 'ALREADY_REVIEWED', message: 'Đơn này đã được đánh giá rồi. Mỗi đơn chỉ đánh giá một lần và không sửa lại.', order };
  }
  return { eligible: true, sellerId, order, product };
}

function sellerSummary(seller: any) {
  const ratingCount = Number(seller?.rating_count || 0);
  const ratingSum = Number(seller?.rating_sum || 0);
  return {
    seller_id: seller?.id ?? null,
    shop_name: seller?.shop_name ?? '',
    shop_slug: seller?.shop_slug ?? '',
    avatar_url: seller?.avatar_url ?? '',
    // Số lượt bán thật, lấy nguyên từ sellers.total_sold, không cộng thêm.
    total_sold: Number(seller?.total_sold || 0),
    rating_count: ratingCount,
    rating_sum: ratingSum,
    rating_average: ratingCount > 0 ? ratingSum / ratingCount : null,
  };
}

// Tính một dòng xếp hạng từ số liệu thật của gian hàng. Hàm này là nơi duy
// nhất chứa công thức xếp hạng, để điều phối viên và người đọc sau này chỉ
// cần đối chiếu một chỗ.
function buildSellerRankingRow(seller: any, stats: { completed: number; cancelled: number; disputesTotal: number; disputesOpen: number }) {
  const summary = sellerSummary(seller);
  const finished = stats.completed + stats.cancelled;
  const successRate = finished > 0 ? stats.completed / finished : null;
  let score: number | null = null;
  if (summary.rating_average !== null && successRate !== null) {
    score = 0.6 * (summary.rating_average / 5) + 0.4 * successRate;
  } else if (summary.rating_average !== null) {
    score = summary.rating_average / 5;
  } else if (successRate !== null) {
    score = successRate;
  }
  return {
    ...summary,
    completed_orders: stats.completed,
    cancelled_orders: stats.cancelled,
    finished_orders: finished,
    success_rate: successRate,
    disputes_total: stats.disputesTotal,
    disputes_open: stats.disputesOpen,
    // Huy hiệu uy tín suy ra từ số thật (xem TRUST_BADGE). Gian hàng chưa đủ
    // cả ba điều kiện thì không có huy hiệu — không có huy hiệu "mặc định".
    trust_badge:
      summary.rating_average !== null &&
      summary.rating_average >= TRUST_BADGE.minRatingAverage &&
      successRate !== null &&
      successRate >= TRUST_BADGE.minSuccessRate &&
      finished >= TRUST_BADGE.minFinishedOrders,
    // Điểm xếp hạng chỉ dùng để sắp xếp trong API; giao diện hiển thị sao
    // trung bình, tỷ lệ thành công và số lượt bán thật, không hiển thị điểm này
    // như một "số sao" để tránh gây hiểu lầm.
    ranking_score: score,
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
  await ensureReviewsTable(env.DB);

  // GET /api/marketplace/reviews/eligible?order_id=... — người mua tự kiểm tra
  // xem đơn của mình có được đánh giá không (để giao diện ẩn/hiện form).
  if (pathname === '/api/marketplace/reviews/eligible') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const orderId = String(url.searchParams.get('order_id') || '').trim();
    if (!orderId) return json({ success: false, message: 'Thiếu đơn hàng.' }, 400);
    const result = await checkReviewEligibility(env.DB, orderId, member.id);
    if (!result.eligible) {
      return json({ success: true, eligible: false, reason: result.reason, message: result.message, order_status: result.order?.status ?? null });
    }
    return json({ success: true, eligible: true, seller_id: result.sellerId, order_status: result.order.status, product_title: result.order.product_title ?? result.product?.title ?? '' });
  }

  // GET /api/marketplace/sellers/ranking — bảng xếp hạng công khai, chỉ gian
  // hàng đã duyệt (APPROVED) mới xuất hiện.
  if (pathname === '/api/marketplace/sellers/ranking') {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50) || 50));
    // Lấy TOÀN BỘ gian hàng đã duyệt rồi mới sắp xếp và cắt theo limit. Cắt
    // trước khi sắp xếp (ví dụ LIMIT theo tên) sẽ bỏ sót gian hàng tốt nhưng
    // tên nằm cuối bảng chữ cái — lỗi này đã sửa trước khi nộp patch.
    const sellers = (await env.DB.prepare(`SELECT * FROM sellers WHERE status = 'APPROVED'`).all<any>()).results || [];
    const rows: any[] = [];
    for (const seller of sellers) {
      const completedRow = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM orders o JOIN marketplace_products p ON p.id = o.product_id WHERE p.seller_id = ? AND o.status = 'COMPLETED'`,
      ).bind(seller.id).first<any>();
      const cancelledRow = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM orders o JOIN marketplace_products p ON p.id = o.product_id WHERE p.seller_id = ? AND o.status = 'CANCELLED'`,
      ).bind(seller.id).first<any>();
      const disputesTotalRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM marketplace_disputes WHERE seller_id = ?`).bind(seller.id).first<any>();
      const disputesOpenRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM marketplace_disputes WHERE seller_id = ? AND status = 'OPEN'`).bind(seller.id).first<any>();
      rows.push(
        buildSellerRankingRow(seller, {
          completed: Number(completedRow?.cnt || 0),
          cancelled: Number(cancelledRow?.cnt || 0),
          disputesTotal: Number(disputesTotalRow?.cnt || 0),
          disputesOpen: Number(disputesOpenRow?.cnt || 0),
        }),
      );
    }
    rows.sort((a, b) => {
      if (a.ranking_score === null && b.ranking_score === null) return 0;
      if (a.ranking_score === null) return 1;
      if (b.ranking_score === null) return -1;
      if (b.ranking_score !== a.ranking_score) return b.ranking_score - a.ranking_score;
      if (b.disputes_open !== a.disputes_open) return a.disputes_open - b.disputes_open;
      if (b.rating_count !== a.rating_count) return b.rating_count - a.rating_count;
      if (b.total_sold !== a.total_sold) return b.total_sold - a.total_sold;
      return String(a.shop_name).localeCompare(String(b.shop_name));
    });
    const ranked = rows.slice(0, limit).map((row, index) => ({ rank: index + 1, ...row }));
    return json({ success: true, sellers: ranked });
  }

  // GET /api/marketplace/reviews?seller_id=... — danh sách đánh giá công khai
  // của một gian hàng. Không trả email hay mã đơn của người mua.
  // sort: newest (mặc định) | highest | lowest | helpful.
  // Mọi đánh giá trả về đều có verified_purchase = true, vì cửa chặn ở POST
  // đã bảo đảm chỉ đơn COMPLETED mới đánh giá được.
  if (pathname === '/api/marketplace/reviews') {
    const sellerId = String(url.searchParams.get('seller_id') || '').trim();
    if (!sellerId) return json({ success: false, message: 'Thiếu gian hàng.' }, 400);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 20) || 20));
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0) || 0);
    const sort = String(url.searchParams.get('sort') || 'newest');
    const orderBy =
      sort === 'highest'
        ? `r.rating DESC, r.created_at DESC, r.id DESC`
        : sort === 'lowest'
          ? `r.rating ASC, r.created_at DESC, r.id DESC`
          : sort === 'helpful'
            ? `helpful_count DESC, r.created_at DESC, r.id DESC`
            : `r.created_at DESC, r.id DESC`;
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(sellerId).first<any>().catch(() => null);
    if (!seller) return json({ success: false, message: 'Không tìm thấy gian hàng.' }, 404);
    const reviewRows = (await env.DB.prepare(
      `SELECT r.id, r.rating, r.comment, r.created_at, COALESCE(m.display_name, 'Người mua') as buyer_name, o.product_title as product_title, (SELECT COUNT(*) FROM marketplace_review_votes v WHERE v.review_id = r.id) as helpful_count FROM marketplace_reviews r LEFT JOIN members m ON m.id = r.buyer_id LEFT JOIN orders o ON o.id = r.order_id WHERE r.seller_id = ? ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ).bind(sellerId, limit, offset).all<any>()).results || [];
    const totalRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM marketplace_reviews WHERE seller_id = ?`).bind(sellerId).first<any>();
    const distRows = (await env.DB.prepare(`SELECT rating, COUNT(*) as cnt FROM marketplace_reviews WHERE seller_id = ? GROUP BY rating`).bind(sellerId).all<any>()).results || [];
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const row of distRows) distribution[String(row.rating)] = Number(row.cnt || 0);
    const reviews = reviewRows.map((r: any) => ({ ...r, helpful_count: Number(r.helpful_count || 0), verified_purchase: true }));
    return json({ success: true, summary: sellerSummary(seller), total: Number(totalRow?.cnt || 0), distribution, sort, limit, offset, reviews });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context as any;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);
  await ensureReviewsTable(env.DB);

  // POST /api/marketplace/reviews — gửi đánh giá cho một đơn đã hoàn tất.
  // Body: { order_id, rating (1-5, số nguyên), comment (tùy chọn, tối đa 1000 ký tự) }
  if (pathname === '/api/marketplace/reviews') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const body: any = await request.json().catch(() => ({}));
    const orderId = String(body?.order_id || '').trim();
    const rating = Number(body?.rating);
    const comment = String(body?.comment || '').trim();
    if (!orderId) return json({ success: false, message: 'Thiếu đơn hàng.' }, 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json({ success: false, message: 'Số sao phải là số nguyên từ 1 đến 5.' }, 400);
    }
    if (comment.length > 1000) {
      return json({ success: false, message: 'Nhận xét tối đa 1000 ký tự.' }, 400);
    }
    const result = await checkReviewEligibility(env.DB, orderId, member.id);
    if (!result.eligible) {
      const status = result.reason === 'ALREADY_REVIEWED' ? 409 : result.reason === 'ORDER_NOT_FOUND' || result.reason === 'NOT_BUYER' ? 404 : 400;
      return json({ success: false, message: result.message, reason: result.reason }, status);
    }
    const reviewId = newId('mp_review');
    try {
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO marketplace_reviews (id, order_id, seller_id, buyer_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)`).bind(reviewId, orderId, result.sellerId, member.id, rating, comment),
        // Cộng điểm đúng một lần, cùng đợt ghi với đánh giá, để không lệch
        // giữa bảng đánh giá và tổng điểm của gian hàng.
        env.DB.prepare(`UPDATE sellers SET rating_sum = rating_sum + ?, rating_count = rating_count + 1, updated_at = datetime('now') WHERE id = ?`).bind(rating, result.sellerId),
      ]);
    } catch (err: any) {
      const existing = await env.DB.prepare('SELECT * FROM marketplace_reviews WHERE order_id = ? LIMIT 1').bind(orderId).first<any>().catch(() => null);
      if (existing) {
        return json({ success: false, message: 'Đơn này đã được đánh giá rồi. Mỗi đơn chỉ đánh giá một lần.', reason: 'ALREADY_REVIEWED' }, 409);
      }
      return json({ success: false, message: 'Gửi đánh giá thất bại, vui lòng thử lại.', code: 'DB_ERROR' }, 500);
    }
    const review = await env.DB.prepare('SELECT * FROM marketplace_reviews WHERE id = ? LIMIT 1').bind(reviewId).first<any>();
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(result.sellerId).first<any>();
    return json({ success: true, message: 'Cảm ơn bạn đã đánh giá gian hàng.', review, summary: seller ? sellerSummary(seller) : null });
  }

  // POST /api/marketplace/reviews/helpful — bật/tắt bình chọn "Hữu ích" cho
  // một đánh giá. Body: { review_id }. Mỗi người chỉ có một bình chọn cho
  // một đánh giá (UNIQUE review_id + buyer_id); bấm lần nữa thì gỡ bình chọn.
  // Chủ gian hàng và chính tác giả đánh giá không được bình chọn, để khỏi tự
  // đẩy đánh giá của mình lên đầu khi sắp xếp theo "hữu ích nhất".
  if (pathname === '/api/marketplace/reviews/helpful') {
    const member = await getMemberFromRequest(request, env);
    if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);
    const body: any = await request.json().catch(() => ({}));
    const reviewId = String(body?.review_id || '').trim();
    if (!reviewId) return json({ success: false, message: 'Thiếu đánh giá.' }, 400);
    const review = await env.DB.prepare('SELECT * FROM marketplace_reviews WHERE id = ? LIMIT 1').bind(reviewId).first<any>().catch(() => null);
    if (!review) return json({ success: false, message: 'Không tìm thấy đánh giá.' }, 404);
    if (review.buyer_id === member.id) return json({ success: false, message: 'Bạn không thể bình chọn cho đánh giá của chính mình.' }, 400);
    const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(review.seller_id).first<any>().catch(() => null);
    if (seller && seller.member_id === member.id) return json({ success: false, message: 'Chủ gian hàng không thể bình chọn cho đánh giá về gian hàng của mình.' }, 400);
    const existingVote = await env.DB.prepare('SELECT * FROM marketplace_review_votes WHERE review_id = ? AND buyer_id = ? LIMIT 1').bind(reviewId, member.id).first<any>().catch(() => null);
    if (existingVote) {
      await env.DB.prepare('DELETE FROM marketplace_review_votes WHERE review_id = ? AND buyer_id = ?').bind(reviewId, member.id).run();
    } else {
      await env.DB.prepare(`INSERT INTO marketplace_review_votes (id, review_id, buyer_id) VALUES (?, ?, ?)`).bind(newId('mp_vote'), reviewId, member.id).run();
    }
    const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM marketplace_review_votes WHERE review_id = ?`).bind(reviewId).first<any>();
    return json({ success: true, voted: !existingVote, helpful_count: Number(countRow?.cnt || 0), review_id: reviewId });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};

// ============================================================================
// GHI CHÚ NỐI _WORKER — DÀNH CHO ĐIỀU PHỐI VIÊN, KHÔNG PHẢI CODE CHẠY
// (Khối 5 không được sửa functions/_worker.ts, nên đoạn này chỉ để gộp tay.)
//
// 1. Thêm import ở đầu functions/_worker.ts, cạnh import marketplaceApi:
//      import * as marketplaceReviewsApi from './api/marketplace/reviews';
//
// 2. Thêm khối xử lý NGAY TRƯỚC khối "16. Marketplace" hiện tại (để các đường
//    reviews/ranking không rơi vào khối cũ), hoặc gộp 5 đường mới vào điều
//    kiện của khối 16 rồi rẽ nhánh theo tiền tố:
//      if (pathname === '/api/marketplace/reviews' || pathname === '/api/marketplace/reviews/eligible' || pathname === '/api/marketplace/reviews/helpful' || pathname === '/api/marketplace/sellers/ranking') {
//        if (method === 'OPTIONS') return await marketplaceReviewsApi.onRequestOptions();
//        if (method === 'POST') return await marketplaceReviewsApi.onRequestPost(context);
//        return await marketplaceReviewsApi.onRequestGet(context);
//      }
//
// 3. Giao diện: src/marketplace/reviewsService.ts và
//    src/marketplace/SellerReviews.tsx trong khối này là module độc lập, chưa
//    được import từ src/App.tsx. Điều phối viên nối chúng vào trang gian hàng
//    / trang đơn hàng khi gộp (xem hướng dẫn trong từng file).
// ============================================================================
