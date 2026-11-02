/**
 * seller-quality.ts — ĐIỂM CHẤT LƯỢNG + HẠNG + GIỚI HẠN THỬ CỦA NGƯỜI BÁN (SÀN MÃ SỐ).
 *
 * ============================================================================
 * VỊ TRÍ DUY NHẤT CỦA GIỚI HẠN THỬ — ĐỌC KỸ TRƯỚC KHI SỬA:
 * - Toàn bộ giới hạn thử chỉ nằm trong hằng số TRIAL_LIMITS ở dưới và 2 hàm
 *   kiểm tra checkTrialProductLimit / checkTrialCodeLimit trong chính file này.
 * - KHÔNG có file nào khác chứa điều kiện giới hạn thử (không rải `>= 5`,
 *   `>= 20` hay điều kiện hạng ở functions/api/marketplace/index.ts,
 *   functions/api/marketplace/ops.ts hay giao diện src/marketplace/).
 * - ops.ts chỉ GỌI các hàm này để hiển thị; index.ts (khi điều phối viên nối
 *   móc, xem BLOCK2_README.md) cũng chỉ GỌI checkTrialLimits() — không tự
 *   viết lại điều kiện.
 *
 * TRẠNG THÁI QUYẾT ĐỊNH (ghi đúng, không phóng đại):
 * - Giới hạn thử dưới đây là MẶC ĐỊNH ĐÃ ĐƯỢC USER DUYỆT ngày 02/11/2026
 *   (tối đa 5 sản phẩm, mỗi sản phẩm tối đa 20 mã, lên hạng chuẩn khi đủ
 *   20 đơn thành công và tỉ lệ khiếu nại dưới 5%), nhưng VẪN ĐIỀU CHỈNH
 *   ĐƯỢC — không phải luật cứng của hệ thống.
 *
 * CÁCH XÓA / TẮT GIỚI HẠN THỬ SAU NÀY (chọn 1 trong 2, không cần sửa chỗ khác):
 *   1. Tắt nhanh, giữ nguyên code: đặt TRIAL_LIMITS.enabled = false.
 *      Khi đó mọi hàm kiểm tra đều trả về "cho phép" và mọi gian hàng đều
 *      được tính như hạng chuẩn về mặt giới hạn (điểm chất lượng và hạng
 *      hiển thị vẫn tính bình thường để quản trị tham khảo).
 *   2. Gỡ hẳn: xóa 2 lời gọi checkTrialLimits() ở móc nối trong index.ts
 *      (xem BLOCK2_README.md, mục "Móc nối") rồi xóa file này cùng ops.ts.
 *      Không còn lời gọi nào thì không còn giới hạn nào chạy.
 * - Muốn ĐỔI SỐ (ví dụ 5 -> 10 sản phẩm): chỉ sửa số trong TRIAL_LIMITS,
 *   không sửa logic hàm. Muốn chuyển giới hạn sang bảng tham số
 *   marketplace_settings thì thêm cột ở migration MỚI (không sửa migration
 *   0012 cũ) rồi truyền giá trị đọc được vào TRIAL_LIMITS — xem tồn đọng
 *   trong BLOCK2_README.md.
 *
 * Ý TƯỞNG HỌC TỪ SÀN KHÁC (diễn đạt lại, không sao chép nội dung, không
 * bịa con số của đối thủ — chi tiết trong BLOCK2_README.md):
 * - Hạng theo thành tích + giới hạn đăng bán tăng dần theo hạng (kiểu chung
 *   của các sàn lớn): gian hàng mới bị giới hạn, làm tốt thì nới dần.
 * - Điểm hiển thị kèm thành phần (đơn thành công, khiếu nại, đánh giá) thay
 *   vì một con số mờ: người mua và quản trị đều thấy vì sao điểm đó.
 * - Chưa đủ dữ liệu thì KHÔNG chấm điểm (trả null + ghi rõ lý do) thay vì
 *   gán điểm mặc định gây hiểu lầm là gian hàng đã được kiểm chứng.
 * KHÁC ĐI CHO PHÙ HỢP SÀN MÃ SỐ (không áp nguyên sàn hàng vật lý):
 * - Không có giao hàng/vận chuyển nên "đơn thành công" = tiền giữ đã trả
 *   (escrow RELEASED), "đơn hỏng" = khiếu nại dẫn tới hoàn tiền (escrow
 *   REFUNDED / dispute RESOLVED_REFUND). Mã lỗi không thu hồi được vì mã
 *   có thể đã dùng rồi — giống quy tắc đã có ở đợt 2.
 * - Đánh giá chỉ tính từ bảng marketplace_reviews (mỗi đơn tối đa 1 đánh
 *   giá, gắn với order_id) nên không tính đánh giá ngoài đơn hàng.
 * ============================================================================
 */

export interface TrialLimits {
  /** Cờ tắt/mở toàn bộ giới hạn thử. false = tắt hẳn, mọi kiểm tra đều cho qua. */
  enabled: boolean;
  /** Số sản phẩm tối đa của gian hàng hạng thử (không tính sản phẩm bị từ chối). */
  maxProducts: number;
  /** Số mã tối đa nạp cho một sản phẩm của gian hàng hạng thử (tính mọi mã đã nạp, kể cả mã đã bán — để khỏi lách bằng cách bán rồi nạp tiếp). */
  maxCodesPerProduct: number;
  /** Số đơn thành công tối thiểu để xét lên hạng chuẩn. */
  promotionMinCompletedOrders: number;
  /** Tỉ lệ khiếu nại tối đa để lên hạng chuẩn (0.05 = dưới 5%). */
  promotionMaxDisputeRate: number;
}

export const TRIAL_LIMITS: TrialLimits = {
  enabled: true,
  maxProducts: 5,
  maxCodesPerProduct: 20,
  promotionMinCompletedOrders: 20,
  promotionMaxDisputeRate: 0.05,
};

export type SellerTier = 'TRIAL' | 'STANDARD';

export interface SellerStatsInput {
  /** Đơn đã trả tiền giữ cho người bán (marketplace_escrow.status = 'RELEASED'). */
  completedOrders: number;
  /** Đơn đã hoàn tiền (marketplace_escrow.status = 'REFUNDED'). */
  refundedOrders: number;
  /** Khiếu nại đang mở (marketplace_disputes.status = 'OPEN'). */
  openDisputes: number;
  /** Khiếu nại đã xử lý theo hướng hoàn tiền (status = 'RESOLVED_REFUND'). */
  resolvedRefundDisputes: number;
  /** Tổng sao đánh giá (marketplace_reviews.rating cộng dồn). */
  ratingSum: number;
  /** Số lượt đánh giá (marketplace_reviews). */
  ratingCount: number;
  /** Số sản phẩm đang tính vào giới hạn (không tính sản phẩm bị từ chối). */
  productCount: number;
}

export interface SellerQuality {
  completedOrders: number;
  refundedOrders: number;
  /** completed + refunded: tổng đơn đã xử lý xong tiền giữ. */
  settledOrders: number;
  /** completed / settled, null khi chưa có đơn xử lý xong. */
  successRate: number | null;
  /** resolvedRefundDisputes / settled, null khi chưa có đơn xử lý xong. */
  disputeRate: number | null;
  openDisputes: number;
  /** Điểm sao trung bình 1–5, null khi chưa có đánh giá nào. */
  avgRating: number | null;
  reviewCount: number;
  /** Điểm chất lượng 0–100, null khi chưa đủ dữ liệu (chưa có đơn xử lý xong). */
  score: number | null;
  /** Giải thích vì sao có/không có điểm — hiển thị nguyên văn cho quản trị. */
  scoreBasis: string;
  tier: SellerTier;
  /** Đủ điều kiện lên hạng chuẩn hay chưa (chỉ có nghĩa khi đang ở hạng thử). */
  promotionEligible: boolean;
  /** Những điều kiện lên hạng còn thiếu, để giao diện hiển thị mục tiêu cho người bán. */
  promotionMissing: string[];
  productCount: number;
}

function clampInt(n: number, min: number, max: number) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

export function computeSellerQuality(stats: SellerStatsInput): SellerQuality {
  const completed = Math.max(0, Math.floor(Number(stats.completedOrders) || 0));
  const refunded = Math.max(0, Math.floor(Number(stats.refundedOrders) || 0));
  const settled = completed + refunded;
  const openDisputes = Math.max(0, Math.floor(Number(stats.openDisputes) || 0));
  const refundDisputes = Math.max(0, Math.floor(Number(stats.resolvedRefundDisputes) || 0));
  const reviewCount = Math.max(0, Math.floor(Number(stats.ratingCount) || 0));
  const ratingSum = Math.max(0, Number(stats.ratingSum) || 0);
  const productCount = Math.max(0, Math.floor(Number(stats.productCount) || 0));

  const successRate = settled > 0 ? completed / settled : null;
  const disputeRate = settled > 0 ? refundDisputes / settled : null;
  const avgRating = reviewCount > 0 ? Math.round((ratingSum / reviewCount) * 10) / 10 : null;

  // Điểm chất lượng: 70% tỉ lệ đơn thành công + 30% điểm sao trung bình.
  // Chưa có đánh giá thì điểm = tỉ lệ đơn thành công (ghi rõ trong scoreBasis),
  // chưa có đơn xử lý xong thì KHÔNG chấm điểm (null) thay vì bịa điểm.
  let score: number | null = null;
  let scoreBasis = 'Chưa có đơn xử lý xong nên chưa chấm điểm.';
  if (successRate !== null) {
    if (avgRating !== null) {
      score = clampInt(Math.round(successRate * 100 * 0.7 + (avgRating / 5) * 100 * 0.3), 0, 100);
      scoreBasis = '70% tỉ lệ đơn thành công + 30% điểm sao trung bình.';
    } else {
      score = clampInt(Math.round(successRate * 100), 0, 100);
      scoreBasis = 'Chưa có đánh giá nên điểm tạm bằng tỉ lệ đơn thành công.';
    }
  }

  const promotionMissing: string[] = [];
  if (completed < TRIAL_LIMITS.promotionMinCompletedOrders) {
    promotionMissing.push(
      `Cần thêm ${TRIAL_LIMITS.promotionMinCompletedOrders - completed} đơn thành công (hiện có ${completed}/${TRIAL_LIMITS.promotionMinCompletedOrders}).`,
    );
  }
  if (disputeRate === null) {
    promotionMissing.push('Chưa có đơn xử lý xong nên chưa tính được tỉ lệ khiếu nại.');
  } else if (!(disputeRate < TRIAL_LIMITS.promotionMaxDisputeRate)) {
    promotionMissing.push(
      `Tỉ lệ khiếu nại ${(disputeRate * 100).toFixed(1)}% chưa dưới ${TRIAL_LIMITS.promotionMaxDisputeRate * 100}%.`,
    );
  }
  const promotionEligible = promotionMissing.length === 0;

  return {
    completedOrders: completed,
    refundedOrders: refunded,
    settledOrders: settled,
    successRate,
    disputeRate,
    openDisputes,
    avgRating,
    reviewCount,
    score,
    scoreBasis,
    // Hạng là KẾT QUẢ TÍNH TOÁN từ số liệu thật, không lưu riêng trong DB nên
    // không lệch với dữ liệu: đủ điều kiện là hạng chuẩn, chưa đủ là hạng thử.
    tier: promotionEligible ? 'STANDARD' : 'TRIAL',
    promotionEligible,
    promotionMissing,
    productCount,
  };
}

export interface TrialCheck {
  allowed: boolean;
  /** Lý do chặn bằng tiếng Việt, null khi cho phép. Hiển thị nguyên văn cho người bán. */
  reason: string | null;
}

/**
 * HÀM KIỂM TRA DUY NHẤT cho giới hạn sản phẩm (điều phối viên nối vào bước
 * tạo sản phẩm trong index.ts — xem BLOCK2_README.md). Mọi chỗ khác chỉ gọi
 * hàm này, không tự viết lại điều kiện.
 */
export function checkTrialProductLimit(
  tier: SellerTier,
  productCount: number,
  limits: TrialLimits = TRIAL_LIMITS,
): TrialCheck {
  if (!limits.enabled || tier === 'STANDARD') return { allowed: true, reason: null };
  if (productCount >= limits.maxProducts) {
    return {
      allowed: false,
      reason: `Gian hàng đang ở hạng thử nên tối đa ${limits.maxProducts} sản phẩm (hiện có ${productCount}). Bán tốt để lên hạng chuẩn thì được mở thêm: cần ${limits.promotionMinCompletedOrders} đơn thành công và tỉ lệ khiếu nại dưới ${limits.promotionMaxDisputeRate * 100}%.`,
    };
  }
  return { allowed: true, reason: null };
}

/**
 * HÀM KIỂM TRA DUY NHẤT cho giới hạn mã mỗi sản phẩm (điều phối viên nối
 * vào bước nạp mã trong index.ts). productCodeCount = tổng mã đã nạp cho
 * sản phẩm đó (mọi trạng thái), addingCount = số mã mới định nạp thêm.
 */
export function checkTrialCodeLimit(
  tier: SellerTier,
  productCodeCount: number,
  addingCount: number,
  limits: TrialLimits = TRIAL_LIMITS,
): TrialCheck {
  if (!limits.enabled || tier === 'STANDARD') return { allowed: true, reason: null };
  if (productCodeCount + addingCount > limits.maxCodesPerProduct) {
    return {
      allowed: false,
      reason: `Gian hàng đang ở hạng thử nên mỗi sản phẩm tối đa ${limits.maxCodesPerProduct} mã (sản phẩm này đã có ${productCodeCount} mã, định nạp thêm ${addingCount} mã). Lên hạng chuẩn thì hết giới hạn này.`,
    };
  }
  return { allowed: true, reason: null };
}

/**
 * Gói kiểm tra chung cho móc nối: trả về lý do chặn đầu tiên gặp, hoặc null
 * khi cho phép. Dùng khi tạo sản phẩm (chỉ kiểm tra số sản phẩm) hoặc nạp mã
 * (chỉ kiểm tra số mã) — tham số nào không dùng thì truyền null.
 */
export function checkTrialLimits(
  tier: SellerTier,
  opts: { productCount?: number | null; productCodeCount?: number | null; addingCount?: number | null },
  limits: TrialLimits = TRIAL_LIMITS,
): TrialCheck {
  if (opts.productCount !== null && opts.productCount !== undefined) {
    const productCheck = checkTrialProductLimit(tier, opts.productCount, limits);
    if (!productCheck.allowed) return productCheck;
  }
  if (
    opts.productCodeCount !== null &&
    opts.productCodeCount !== undefined &&
    opts.addingCount !== null &&
    opts.addingCount !== undefined
  ) {
    const codeCheck = checkTrialCodeLimit(tier, opts.productCodeCount, opts.addingCount, limits);
    if (!codeCheck.allowed) return codeCheck;
  }
  return { allowed: true, reason: null };
}
