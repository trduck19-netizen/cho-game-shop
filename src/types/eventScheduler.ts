/**
 * Event Scheduler & Countdown Types
 * Hỗ trợ tạo lịch đếm ngược tự động cho sự kiện Giveaway, Flash Sale sản phẩm và Thông báo chung
 */

export type ScheduledEventType = 'GIVEAWAY' | 'FLASH_SALE_PRODUCT' | 'GLOBAL_ANNOUNCEMENT';

export type ScheduledEventTheme = 'fire' | 'cyber' | 'gold' | 'emerald';

export type ScheduledEventStatus = 'UPCOMING' | 'LIVE' | 'ENDED' | 'HIDDEN';

export interface ScheduledEventRecord {
  id: string; // e.g. "ev_1792345678901_abc"
  title: string; // "Săn Giftcode VIP 3Q Đào Đào Đào" hoặc "Flash Sale Siêu Giảm Giá"
  subtitle?: string; // "Số lượng có hạn, đếm ngược để nhận mã ngay"
  type: ScheduledEventType;
  
  // Liên kết đối tượng cụ thể
  target_id?: string; // ID của giveaway (gw_...) hoặc sản phẩm (ut_...)
  game_slug?: string; // e.g. "3q-dao-dao-dao"
  game_name?: string; // "3Q Đào Đào Đào"
  target_name?: string; // Tên giveaway hoặc tên sản phẩm để hiển thị nhanh
  
  // Flash Sale Pricing (Dành cho sự kiện giảm giá sản phẩm)
  original_price?: number;
  sale_price?: number;
  discount_percent?: number;
  
  // Mốc thời gian
  start_time: string; // ISO 8601 (Thời điểm Giờ G bắt đầu sự kiện)
  end_time: string; // ISO 8601 (Thời điểm kết thúc sự kiện)
  countdown_lead_hours?: number; // Số giờ trước Giờ G để bắt đầu hiện đếm ngược (0 = luôn hiện)
  
  // Vị trí hiển thị trên Web
  show_top_banner: boolean; // Banner dải trên cùng toàn trang
  show_in_giveaways: boolean; // Thẻ trong mục /giveaways
  show_in_store: boolean; // Thẻ trong mục /store và /utilities
  show_in_game_detail: boolean; // Trong popup chi tiết game
  
  // Phong cách & CTA
  theme: ScheduledEventTheme;
  cta_text?: string; // "Xem Ngay", "Săn Mã", "Đặt Lịch"
  cta_link?: string; // Link điều hướng khi bấm vào
  badge_label?: string; // "SẮP DIỄN RA", "FLASH SALE", "SỰ KIỆN HOT"
  
  is_active: boolean; // Trạng thái kích hoạt (Admin có thể tắt/bật)
  created_at: string;
  updated_at?: string;
}

export interface CountdownTimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalRemainingMs: number;
  isExpired: boolean;
  status: ScheduledEventStatus;
}
