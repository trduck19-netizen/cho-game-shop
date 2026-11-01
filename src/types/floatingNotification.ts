export type FloatingNotificationPosition =
  | 'center_modal'
  | 'bottom_right'
  | 'bottom_left'
  | 'top_bar'
  | 'bottom_bar';

export type FloatingNotificationFrequency =
  | 'always'
  | 'once_session'
  | 'once_day';

export type FloatingNotificationTheme =
  | 'cyber'
  | 'gold'
  | 'emerald'
  | 'crimson';

export type FloatingNotificationIconType =
  | 'gift'
  | 'bell'
  | 'flame'
  | 'sparkles'
  | 'star'
  | 'shield'
  | 'custom';

export type EventSpotlightType = 'giveaway' | 'store_discount' | 'utility_hot' | 'news_code' | 'custom';

export interface FloatingEventSpotlight {
  enabled: boolean;
  type: EventSpotlightType;
  targetId?: string;       // ID của Giveaway / Store / Utility
  title: string;           // Tên sự kiện (VD: "Giveaway 500 Giftcode VIP Black Myth: Wukong")
  subtitle?: string;        // Mô tả ngắn hoặc ưu đãi (VD: "Còn 15 suất quà miễn phí • Hạn chót hôm nay")
  badgeText?: string;       // Nhãn huy hiệu (VD: "🔴 ĐANG DIỄN RA", "⚡ FLASH SALE", "🎁 QUÀ TẶNG HOT")
  imageUrl?: string;        // Icon / Bìa của tựa game hoặc sản phẩm
  originalPrice?: number;   // Giá gốc nếu có
  discountPrice?: number;   // Giá giảm nếu có
  remainingCodes?: number;  // Số mã còn lại nếu là Giveaway
  ctaText?: string;         // Text nút (VD: "Đến Ngay ➔", "Săn Quà Ngay ➔")
  ctaLink?: string;         // Link dẫn tới sự kiện (VD: "#giveaways?gw=gw_123")
}

export interface FloatingNotificationConfig {
  id?: string;
  enabled: boolean;
  title: string;
  message: string;
  iconType: FloatingNotificationIconType;
  customIconUrl?: string;
  position: FloatingNotificationPosition;

  // Sự kiện đang diễn ra trên web (Event Spotlight)
  eventSpotlight?: FloatingEventSpotlight;

  // Khung giờ hiển thị trong ngày
  scheduleMode: 'all_day' | 'time_range';
  startTime: string; // VD: "08:00"
  endTime: string;   // VD: "23:00"

  // Nút hành động chính (CTA)
  showCta: boolean;
  ctaText: string;
  ctaLink: string;
  ctaTargetBlank: boolean;

  // Nút phụ / Đóng
  showSecondaryButton: boolean;
  secondaryButtonText: string;

  // Trải nghiệm & Tần suất
  frequency: FloatingNotificationFrequency;
  delaySeconds: number;        // Số giây trễ sau khi vào trang (0 - 30s)
  autoDismissSeconds: number;  // Tự động đóng sau X giây (0 = không tự đóng)
  theme: FloatingNotificationTheme;
  targetPages: 'all' | 'home_only';

  // Tùy chọn người dùng
  showDoNotShowAgain: boolean;

  updatedAt?: string;
}

export const DEFAULT_FLOATING_NOTIFICATION: FloatingNotificationConfig = {
  enabled: true,
  title: '🎁 Chào Mừng Đến Với CodeGame.Shop',
  message: 'Cập nhật hàng ngàn Giftcode VIP và mã bản quyền chính hãng mỗi ngày. Chia sẻ trang để mọi người cùng biết nhé.',
  iconType: 'gift',
  position: 'center_modal',
  eventSpotlight: {
    enabled: false,
    type: 'giveaway',
    title: '🎁 Sự Kiện Giveaway Đang Diễn Ra',
    subtitle: 'Nhanh tay nhận ngay mã quà tặng độc quyền miễn phí',
    badgeText: '🔴 ĐANG DIỄN RA',
    ctaText: 'Đến Ngay ➔',
    ctaLink: '#giveaways',
  },
  scheduleMode: 'all_day',
  startTime: '08:00',
  endTime: '23:00',
  showCta: true,
  ctaText: 'Khám Phá Giftcode',
  ctaLink: '#game-catalog-section',
  ctaTargetBlank: false,
  showSecondaryButton: true,
  secondaryButtonText: 'Để sau',
  frequency: 'once_session',
  delaySeconds: 2,
  autoDismissSeconds: 0,
  theme: 'cyber',
  targetPages: 'all',
  showDoNotShowAgain: true,
  updatedAt: new Date().toISOString(),
};

export const MAINTENANCE_FLOATING_NOTIFICATION: FloatingNotificationConfig = {
  enabled: true,
  title: 'Web bảo trì',
  message: `Hệ thống cơ sở dữ liệu máy chủ đang trong quá trình bảo trì và nâng cấp định kỳ.

❌ **NHỮNG VIỆC TẠM THỜI CHƯA THỂ LÀM:**
• Đăng ký tài khoản mới & Đăng nhập thành viên
• Nạp tiền tự động vào ví (cổng SePay QR)
• Mua hàng / Mua máy ảo VS Phone trừ tiền ví
• Giật mã Giveaway miễn phí

✅ **NHỮNG VIỆC VẪN LÀM ĐƯỢC 100% BÌNH THƯỜNG:**
• Tra cứu & Sao chép hơn 10.700+ mã Giftcode của 627 tựa game (miễn phí 100%)
• Tìm kiếm, lọc thể loại game không dấu / có dấu siêu tốc
• Đọc toàn bộ 94 bài viết tin tức & cẩm nang tân thủ chuẩn SEO
• Xem bảng giá & chi tiết cấu hình dịch vụ máy ảo

⏰ *Toàn bộ tính năng giao dịch sẽ tự động mở lại ngay sau khi hoàn tất bảo trì. Cảm ơn sự đồng hành của quý khách!*`,
  iconType: 'shield',
  position: 'center_modal',
  scheduleMode: 'all_day',
  startTime: '00:00',
  endTime: '23:59',
  showCta: true,
  ctaText: 'Đã Hiểu & Xem Giftcode Ngay ➔',
  ctaLink: '#game-catalog-section',
  ctaTargetBlank: false,
  showSecondaryButton: true,
  secondaryButtonText: 'Đóng thông báo',
  frequency: 'always',
  delaySeconds: 1,
  autoDismissSeconds: 0,
  theme: 'crimson',
  targetPages: 'all',
  showDoNotShowAgain: true,
  updatedAt: new Date().toISOString(),
};
