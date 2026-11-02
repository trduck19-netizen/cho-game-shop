// Tham số sàn dùng cho giao diện (khối 1).
// Các con số này đã do user chốt cho DB thử và phải khớp với hàng
// marketplace_settings (id = 'default') trên DB thử; giao diện KHÔNG tự
// quyết phí hay thời gian giữ khác đi. Nếu admin đổi tham số trong DB,
// chỉ cần đổi các hằng dưới đây cho khớp rồi triển khai lại giao diện.

/** Phí sàn mặc định, tính trên tổng tiền đơn, do người bán chịu. */
export const MARKETPLACE_COMMISSION_PERCENT = 5;
/** Thời gian giữ tiền tối đa, tính từ lúc giữ tiền (escrow held_at). */
export const MARKETPLACE_HOLD_HOURS = 168;
/** Thời gian tự động trả tiền giữ khi không có khiếu nại mở. */
export const MARKETPLACE_AUTO_RELEASE_HOURS = 168;
/** Cửa sổ khiếu nại, cũng tính trong thời gian tiền còn giữ. */
export const MARKETPLACE_DISPUTE_WINDOW_HOURS = 168;

// ---------------------------------------------------------------------------
// GIỚI HẠN NGƯỜI BÁN MỚI (MỨC THỬ) — ĐÃ ĐƯỢC USER DUYỆT, MẶC ĐỊNH ĐIỀU
// CHỈNH ĐƯỢC, KHÔNG CÀI CỨNG KHÓ GỠ. Vị trí duy nhất của các giới hạn này
// trong khối 1 là file này + hàm sellerTrialStatus trong filterProducts.ts.
// Cách xóa/tắt sau này: (1) đặt SELLER_TRIAL_LIMITS_ENABLED = false là
// giao diện ngừng hiển thị mọi nhãn mức thử; (2) khi API có cột hạng
// người bán, thay hàm sellerTrialStatus bằng hạng thật từ máy chủ và xóa
// các hằng TRIAL dưới đây. Hiện bảng sellers CHƯA có cột hạng, nên giao
// diện chỉ dùng các hằng này để HIỂN THỊ và tính toán, không dùng để
// chặn tạo sản phẩm hay nạp mã (việc chặn thuộc về API, khối khác).
// ---------------------------------------------------------------------------
export const SELLER_TRIAL_LIMITS_ENABLED = true;
/** Người bán mới tối đa bao nhiêu sản phẩm ở mức thử. */
export const SELLER_TRIAL_MAX_PRODUCTS = 5;
/** Mỗi sản phẩm của người bán mới tối đa bao nhiêu mã ở mức thử. */
export const SELLER_TRIAL_MAX_CODES_PER_PRODUCT = 20;
/** Lên hạng chuẩn khi đạt đủ số đơn thành công... */
export const SELLER_TRIAL_UPGRADE_MIN_COMPLETED_ORDERS = 20;
/** ...và tỷ lệ khiếu nại dưới mức này (0.05 = 5%). */
export const SELLER_TRIAL_UPGRADE_MAX_DISPUTE_RATE = 0.05;
