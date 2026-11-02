/**
 * KHỐI 3 — Tài chính / tiền giữ cho sàn cho-game-shop.
 *
 * File MỚI, CHƯA nối vào functions/_worker.ts (điều phối viên gộp theo đoạn nối
 * trong docs/block3-tai-chinh-tien-giu-huong-dan-noi.md).
 *
 * NGUYÊN TẮC BẮT BUỘC:
 * - CHỈ ĐỌC. File này không chứa INSERT / UPDATE / DELETE / CREATE. Đối soát
 *   chỉ BÁO LỆCH, tuyệt đối không tự sửa số tiền, không tự cân sổ.
 * - Chỉ bán mã dùng một lần (luồng tạo đơn / giao mã nằm ở API đợt 1+2, không
 *   nằm ở đây). File này không sinh mã, không mua hàng, không chuyển tiền.
 * - Rút tiền ra ngân hàng ngoài là quy trình thủ công của quản trị sau khi
 *   duyệt PAID — không có trong file này, cần duyệt riêng.
 *
 * Các đường do file này phục vụ (sau khi nối):
 * - GET /api/marketplace/payouts
 *     Người bán xem yêu cầu rút của chính mình (PENDING / PAID / REJECTED)
 *     kèm số dư khả dụng và tiền đang giữ. Quản trị xem của một gian hàng
 *     khi kèm ?seller_id=. Tạo yêu cầu vẫn dùng POST /api/marketplace/payouts
 *     đã có trong functions/api/marketplace/index.ts.
 * - GET /api/marketplace/sellers/me/held
 *     Người bán xem từng đơn đang giữ: tiền gốc, phí, tiền thực nhận, ngày
 *     giữ, ngày tự trả ước tính (held_at + auto_release_hours), cờ đang
 *     khiếu nại. Học từ cách các sàn tách ví thành ngăn đang giữ / khả dụng:
 *     ở sàn mã số, giao mã là tức thì nên "ngày tự trả ước tính" thay cho
 *     mốc giao hàng, và đơn đang khiếu nại luôn tách riêng khỏi số tiền
 *     sắp về (luồng tự động trả đã loại đơn có khiếu nại OPEN).
 * - GET /api/marketplace/sellers/me/ledger
 *     Người bán xem lịch sử ví của chính mình theo thời gian (mới nhất trước),
 *     chỉ đọc, để tự đối chiếu từng biến động số dư.
 * - GET /api/marketplace/reconcile
 *     Chỉ quản trị. Đối chiếu 3 lớp: tiền giữ trong escrow, sổ ledger, số dư
 *     gian hàng. Vì bảng sellers đang lưu sẵn available_balance /
 *     held_balance (thiết kế cũ của đợt 1+2, không đổi ở khối 3), báo cáo
 *     suy ra số dư kỳ vọng từ sổ + escrow rồi so với số đang lưu và báo
 *     lệch — thay vì coi cột lưu sẵn là đúng (cách các hệ sổ cái suy số dư
 *     từ sổ, áp dụng khác đi: vẫn giữ cột cũ, chỉ thêm lớp kiểm tra).
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key, idempotency-key',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
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

function num(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/* Logic đối soát thuần túy (không chạm DB): để kiểm thử được bằng dữ  */
/* liệu thử trong bộ nhớ mà không cần D1 thật.                         */
/* ------------------------------------------------------------------ */

export interface ReconcileInput {
  sellers: any[];
  escrowRows: any[];
  ledgerRows: any[];
  payoutRows: any[];
  disputeOpenOrderIds: string[];
}

export interface ReconcileMismatch {
  code: string;
  seller_id: string | null;
  order_id: string | null;
  expected: number | null;
  actual: number | null;
  detail: string;
}

export function runReconciliation(input: ReconcileInput) {
  const mismatches: ReconcileMismatch[] = [];
  const disputeOpen = new Set(input.disputeOpenOrderIds || []);

  // Gom escrow theo gian hàng và theo đơn.
  const escrowBySeller = new Map<string, { held: number; heldCount: number; released: number; refunded: number }>();
  const escrowByOrder = new Map<string, any>();
  for (const row of input.escrowRows || []) {
    const entry = escrowBySeller.get(row.seller_id) || { held: 0, heldCount: 0, released: 0, refunded: 0 };
    if (row.status === 'HELD') { entry.held += num(row.net_amount); entry.heldCount += 1; }
    if (row.status === 'RELEASED') entry.released += 1;
    if (row.status === 'REFUNDED') entry.refunded += 1;
    escrowBySeller.set(row.seller_id, entry);
    escrowByOrder.set(row.order_id, row);
  }

  // Gom sổ theo gian hàng, kiểm tra chuỗi sổ (mỗi dòng phải nối tiếp dòng trước).
  const ledgerBySeller = new Map<string, any[]>();
  for (const row of input.ledgerRows || []) {
    const list = ledgerBySeller.get(row.seller_id) || [];
    list.push(row);
    ledgerBySeller.set(row.seller_id, list);
  }

  // Gom rút tiền theo gian hàng và theo trạng thái.
  const payoutBySeller = new Map<string, { pending: number; pendingCount: number; paid: number; paidCount: number; rejected: number }>();
  const pendingPayoutIds = new Set<string>();
  for (const row of input.payoutRows || []) {
    const entry = payoutBySeller.get(row.seller_id) || { pending: 0, pendingCount: 0, paid: 0, paidCount: 0, rejected: 0 };
    if (row.status === 'PENDING') { entry.pending += num(row.amount); entry.pendingCount += 1; pendingPayoutIds.add(String(row.id)); }
    if (row.status === 'PAID') { entry.paid += num(row.amount); entry.paidCount += 1; }
    if (row.status === 'REJECTED') entry.rejected += num(row.amount);
    payoutBySeller.set(row.seller_id, entry);
  }

  // Sổ rút tiền (PAYOUT) theo gian hàng + mô tả để soi yêu cầu đang chờ.
  const payoutLedgerBySeller = new Map<string, { total: number; descriptions: string[] }>();
  for (const row of input.ledgerRows || []) {
    if (row.type !== 'PAYOUT') continue;
    const entry = payoutLedgerBySeller.get(row.seller_id) || { total: 0, descriptions: [] };
    entry.total += num(row.amount);
    entry.descriptions.push(String(row.description || ''));
    payoutLedgerBySeller.set(row.seller_id, entry);
  }

  // Đếm dòng sổ theo (đơn, loại) để soi từng đơn.
  const ledgerCountByOrderType = new Map<string, number>();
  for (const row of input.ledgerRows || []) {
    if (!row.order_id) continue;
    const key = `${row.order_id}::${row.type}`;
    ledgerCountByOrderType.set(key, (ledgerCountByOrderType.get(key) || 0) + 1);
  }

  const sellerReports: any[] = [];
  let totalHeld = 0;
  let totalAvailable = 0;
  let totalCommissionHeld = 0;
  let totalCommissionReleased = 0;

  for (const seller of input.sellers || []) {
    const sellerId = String(seller.id);
    const escrow = escrowBySeller.get(sellerId) || { held: 0, heldCount: 0, released: 0, refunded: 0 };
    const payout = payoutBySeller.get(sellerId) || { pending: 0, pendingCount: 0, paid: 0, paidCount: 0, rejected: 0 };
    const payoutLedger = payoutLedgerBySeller.get(sellerId) || { total: 0, descriptions: [] };
    const storedAvailable = num(seller.available_balance);
    const storedHeld = num(seller.held_balance);

    // (1) Tiền giữ trong escrow so với tiền giữ đang lưu ở gian hàng.
    if (escrow.held !== storedHeld) {
      mismatches.push({
        code: 'HELD_MISMATCH', seller_id: sellerId, order_id: null,
        expected: escrow.held, actual: storedHeld,
        detail: `Tổng tiền giữ của các đơn HELD (${escrow.held} Core) khác số tiền giữ đang lưu ở gian hàng (${storedHeld} Core). Chỉ báo lệch, không tự sửa.`,
      });
    }

    // (2) Phát lại sổ: số dư cuối sổ so với số đang lưu + kiểm tra chuỗi sổ.
    const rows = ledgerBySeller.get(sellerId) || [];
    let replayAvailable = 0;
    let replayHeld = 0;
    for (const row of rows) {
      if (num(row.balance_before) !== replayAvailable || num(row.held_before) !== replayHeld) {
        mismatches.push({
          code: 'LEDGER_CHAIN_BREAK', seller_id: sellerId, order_id: row.order_id || null,
          expected: null, actual: null,
          detail: `Dòng sổ ${row.id} không nối tiếp dòng trước (balance_before ${row.balance_before} / held_before ${row.held_before}, kỳ vọng ${replayAvailable} / ${replayHeld}). Các dòng sau vẫn được soi tiếp từ mốc của dòng này.`,
        });
      }
      replayAvailable = num(row.balance_after);
      replayHeld = num(row.held_after);
    }
    if (rows.length === 0 && (storedAvailable !== 0 || storedHeld !== 0)) {
      mismatches.push({
        code: 'LEDGER_MISSING', seller_id: sellerId, order_id: null,
        expected: 0, actual: storedAvailable + storedHeld,
        detail: 'Gian hàng có số dư nhưng không có dòng sổ nào — không suy ra được số dư kỳ vọng từ sổ.',
      });
    } else {
      if (replayAvailable !== storedAvailable) {
        mismatches.push({
          code: 'LEDGER_BALANCE_MISMATCH', seller_id: sellerId, order_id: null,
          expected: replayAvailable, actual: storedAvailable,
          detail: `Số dư khả dụng cuối sổ (${replayAvailable} Core) khác số đang lưu ở gian hàng (${storedAvailable} Core).`,
        });
      }
      if (replayHeld !== storedHeld) {
        mismatches.push({
          code: 'LEDGER_HELD_MISMATCH', seller_id: sellerId, order_id: null,
          expected: replayHeld, actual: storedHeld,
          detail: `Tiền giữ cuối sổ (${replayHeld} Core) khác số đang lưu ở gian hàng (${storedHeld} Core).`,
        });
      }
    }

    // (3) Tiền đã trả cho người bán so với sổ rút tiền (PAID phải trừ đúng).
    // Sổ PAYOUT ghi số âm; tổng sổ phải bằng -(tổng yêu cầu PAID).
    if (-payoutLedger.total !== payout.paid) {
      mismatches.push({
        code: 'PAYOUT_PAID_MISMATCH', seller_id: sellerId, order_id: null,
        expected: payout.paid, actual: -payoutLedger.total,
        detail: `Tổng yêu cầu đã trả PAID (${payout.paid} Core) khác tổng tiền đã trừ trong sổ PAYOUT (${-payoutLedger.total} Core). Yêu cầu đang chờ PENDING không tính ở đây vì khi tạo chưa trừ số dư.`,
      });
    }

    // (4) Yêu cầu đang chờ PENDING tuyệt đối chưa được trừ tiền trong sổ.
    for (const payoutRow of (input.payoutRows || []).filter((r: any) => r.seller_id === sellerId && r.status === 'PENDING')) {
      const hit = payoutLedger.descriptions.some((d: string) => d.includes(String(payoutRow.id)));
      if (hit) {
        mismatches.push({
          code: 'PENDING_PAYOUT_HAS_LEDGER', seller_id: sellerId, order_id: null,
          expected: null, actual: null,
          detail: `Yêu cầu rút đang chờ ${payoutRow.id} đã xuất hiện trong sổ rút tiền — trái quy tắc "tạo yêu cầu chưa trừ số dư, chỉ khi duyệt PAID mới trừ".`,
        });
      }
    }

    totalHeld += storedHeld;
    totalAvailable += storedAvailable;
    sellerReports.push({
      seller_id: sellerId,
      shop_name: seller.shop_name || '',
      available_balance: storedAvailable,
      held_balance: storedHeld,
      escrow_held: escrow.held,
      escrow_held_count: escrow.heldCount,
      escrow_released_count: escrow.released,
      escrow_refunded_count: escrow.refunded,
      ledger_available: rows.length ? replayAvailable : null,
      ledger_held: rows.length ? replayHeld : null,
      pending_payouts: payout.pending,
      pending_payout_count: payout.pendingCount,
      paid_payouts: payout.paid,
      paid_payout_count: payout.paidCount,
      ok: mismatches.filter((m: any) => m.seller_id === sellerId).length === 0,
    });
  }

  // (5) Soi từng đơn: đơn HELD phải có đúng 1 dòng giữ; đơn đã thanh toán
  // phải có đúng 1 dòng giữ + đúng 1 dòng thanh toán; dòng thanh toán không
  // được mồ côi (không có đơn escrow tương ứng).
  for (const escrow of input.escrowRows || []) {
    const holdCount = ledgerCountByOrderType.get(`${escrow.order_id}::ESCROW_HOLD`) || 0;
    const releaseCount = ledgerCountByOrderType.get(`${escrow.order_id}::ESCROW_RELEASE`) || 0;
    const refundCount = ledgerCountByOrderType.get(`${escrow.order_id}::ESCROW_REFUND`) || 0;
    if (holdCount !== 1) {
      mismatches.push({
        code: 'ORDER_HOLD_COUNT', seller_id: escrow.seller_id, order_id: escrow.order_id,
        expected: 1, actual: holdCount,
        detail: `Đơn ${escrow.order_id} (trạng thái ${escrow.status}) có ${holdCount} dòng giữ tiền, kỳ vọng đúng 1.`,
      });
    }
    if (escrow.status === 'RELEASED' && releaseCount !== 1) {
      mismatches.push({
        code: 'ORDER_SETTLE_COUNT', seller_id: escrow.seller_id, order_id: escrow.order_id,
        expected: 1, actual: releaseCount,
        detail: `Đơn ${escrow.order_id} đã trả tiền giữ nhưng có ${releaseCount} dòng trả, kỳ vọng đúng 1.`,
      });
    }
    if (escrow.status === 'REFUNDED' && refundCount !== 1) {
      mismatches.push({
        code: 'ORDER_SETTLE_COUNT', seller_id: escrow.seller_id, order_id: escrow.order_id,
        expected: 1, actual: refundCount,
        detail: `Đơn ${escrow.order_id} đã hoàn tiền nhưng có ${refundCount} dòng hoàn, kỳ vọng đúng 1.`,
      });
    }
    if (escrow.status === 'HELD' && (releaseCount > 0 || refundCount > 0)) {
      mismatches.push({
        code: 'HELD_ORDER_HAS_SETTLE', seller_id: escrow.seller_id, order_id: escrow.order_id,
        expected: 0, actual: releaseCount + refundCount,
        detail: `Đơn ${escrow.order_id} vẫn đang giữ nhưng đã có dòng thanh toán — đơn giữ không được thanh toán trước.`,
      });
    }
    if (escrow.status === 'HELD') totalCommissionHeld += num(escrow.commission_amount);
    if (escrow.status === 'RELEASED') totalCommissionReleased += num(escrow.commission_amount);
  }
  for (const row of input.ledgerRows || []) {
    if ((row.type === 'ESCROW_RELEASE' || row.type === 'ESCROW_REFUND') && row.order_id && !escrowByOrder.has(row.order_id)) {
      mismatches.push({
        code: 'ORPHAN_SETTLE', seller_id: row.seller_id, order_id: row.order_id,
        expected: null, actual: null,
        detail: `Dòng thanh toán ${row.id} trỏ tới đơn ${row.order_id} nhưng không có bản ghi giữ tiền nào cho đơn đó.`,
      });
    }
  }

  // Ghi chú: đơn đang khiếu nại OPEN không nằm trong diện tự động trả — báo
  // cáo chỉ liệt kê, không chặn hay sửa gì.
  const disputedHeldCount = (input.escrowRows || []).filter(
    (r: any) => r.status === 'HELD' && disputeOpen.has(String(r.order_id)),
  ).length;

  return {
    ok: mismatches.length === 0,
    mismatch_count: mismatches.length,
    totals: {
      seller_count: (input.sellers || []).length,
      held_balance_total: totalHeld,
      available_balance_total: totalAvailable,
      commission_held_total: totalCommissionHeld,
      commission_released_total: totalCommissionReleased,
      disputed_held_order_count: disputedHeldCount,
    },
    sellers: sellerReports,
    mismatches,
  };
}

/** Ngày tự trả ước tính: held_at (UTC, dạng datetime của D1) + số giờ giữ. */
export function estimateReleaseAt(heldAt: string, autoReleaseHours: number | null) {
  if (autoReleaseHours === null || autoReleaseHours === undefined) return null;
  const base = new Date(`${String(heldAt).replace(' ', 'T')}Z`);
  if (Number.isNaN(base.getTime())) return null;
  return new Date(base.getTime() + Number(autoReleaseHours) * 3600 * 1000).toISOString();
}

/* ------------------------------------------------------------------ */
/* Lớp HTTP: chỉ SELECT, không có câu ghi nào.                          */
/* ------------------------------------------------------------------ */

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context as any;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (!env.DB) return json({ success: false, message: 'D1 Database chưa được cấu hình.' }, 500);

  const member = await getMemberFromRequest(request, env);
  if (!member) return json({ success: false, message: 'Vui lòng đăng nhập.' }, 401);

  const all = async (sql: string, params: any[] = []) => {
    try {
      const res = await env.DB!.prepare(sql).bind(...params).all<any>();
      return res.results || [];
    } catch {
      return [];
    }
  };

  // Người bán xem yêu cầu rút của chính mình (quản trị xem theo seller_id).
  if (pathname === '/api/marketplace/payouts') {
    let seller: any = null;
    const sellerIdParam = url.searchParams.get('seller_id') || '';
    if (sellerIdParam && isAdmin(member)) {
      seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ? LIMIT 1').bind(sellerIdParam).first<any>().catch(() => null);
    } else {
      seller = await getSellerForMember(env.DB, member.id);
    }
    if (!seller) return json({ success: false, message: 'Chưa có gian hàng.' }, 404);
    const payouts = await all(
      `SELECT * FROM marketplace_payouts WHERE seller_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
      [seller.id],
    );
    return json({
      success: true,
      seller: {
        id: seller.id, shop_name: seller.shop_name, status: seller.status,
        available_balance: num(seller.available_balance), held_balance: num(seller.held_balance),
      },
      payouts,
    });
  }

  // Người bán xem từng đơn đang giữ + ngày tự trả ước tính + cờ khiếu nại.
  if (pathname === '/api/marketplace/sellers/me/held') {
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller) return json({ success: false, message: 'Chưa có gian hàng.' }, 404);
    const settings = await env.DB.prepare(`SELECT * FROM marketplace_settings WHERE id = 'default' LIMIT 1`).first<any>().catch(() => null);
    const autoReleaseHours = settings && settings.auto_release_hours !== null && settings.auto_release_hours !== undefined
      ? Number(settings.auto_release_hours) : null;
    const heldRows = await all(
      `SELECT e.*, CASE WHEN EXISTS (SELECT 1 FROM marketplace_disputes d WHERE d.order_id = e.order_id AND d.status = 'OPEN') THEN 1 ELSE 0 END AS disputed FROM marketplace_escrow e WHERE e.seller_id = ? AND e.status = 'HELD' ORDER BY e.held_at ASC`,
      [seller.id],
    );
    const orders = heldRows.map((r: any) => ({
      order_id: r.order_id,
      gross_amount: num(r.gross_amount),
      commission_amount: num(r.commission_amount),
      net_amount: num(r.net_amount),
      held_at: r.held_at,
      disputed: num(r.disputed) === 1,
      estimated_release_at: estimateReleaseAt(r.held_at, autoReleaseHours),
    }));
    const heldTotal = orders.reduce((sum: number, o: any) => sum + o.net_amount, 0);
    const disputedTotal = orders.filter((o: any) => o.disputed).reduce((sum: number, o: any) => sum + o.net_amount, 0);
    return json({
      success: true,
      auto_release_hours: autoReleaseHours,
      totals: {
        held_total: heldTotal,
        disputed_held_total: disputedTotal,
        clear_held_total: heldTotal - disputedTotal,
        order_count: orders.length,
      },
      orders,
    });
  }

  // Người bán xem lịch sử ví của chính mình (mới nhất trước).
  if (pathname === '/api/marketplace/sellers/me/ledger') {
    const seller = await getSellerForMember(env.DB, member.id);
    if (!seller) return json({ success: false, message: 'Chưa có gian hàng.' }, 404);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
    const rows = await all(
      `SELECT * FROM marketplace_ledger WHERE seller_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      [seller.id, limit],
    );
    return json({ success: true, seller_id: seller.id, entries: rows });
  }

  // Đối soát toàn sàn — chỉ quản trị, chỉ đọc, chỉ báo lệch.
  if (pathname === '/api/marketplace/reconcile') {
    if (!isAdmin(member)) return json({ success: false, message: 'Không có quyền quản trị.' }, 403);
    const sellers = await all(`SELECT * FROM sellers ORDER BY created_at ASC`);
    const escrowRows = await all(`SELECT * FROM marketplace_escrow ORDER BY held_at ASC`);
    const ledgerRows = await all(`SELECT * FROM marketplace_ledger ORDER BY seller_id ASC, created_at ASC, id ASC`);
    const payoutRows = await all(`SELECT * FROM marketplace_payouts ORDER BY created_at ASC`);
    const disputeRows = await all(`SELECT order_id FROM marketplace_disputes WHERE status = 'OPEN'`);
    const report = runReconciliation({
      sellers,
      escrowRows,
      ledgerRows,
      payoutRows,
      disputeOpenOrderIds: disputeRows.map((r: any) => String(r.order_id)),
    });
    return json({
      success: true,
      checked_at: new Date().toISOString(),
      note: 'Báo cáo chỉ đọc: lệch thì xử lý thủ công theo quy trình, tuyệt đối không tự sửa số tiền trong báo cáo này.',
      ...report,
    });
  }

  return json({ success: false, message: 'Endpoint not found.' }, 404);
};
