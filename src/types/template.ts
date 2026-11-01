/**
 * Universal Template System Types
 * Defines template configurations, snapshots, audit logs, and runtime resolution interfaces
 * for Giveaway, Catalog, Utilities, and Store Products.
 */

export interface GiveawayTemplateConfig {
  // Nhóm 1: Chính sách và hiển thị chung
  min_account_age_days: number;       // Mặc định: 0
  max_per_user: number;               // Mặc định: 1
  max_per_ip: number;                 // Mặc định: 2
  cooldown_hours: number;             // Mặc định: 1
  cooldown_minutes?: number;          // Hồi chiêu theo phút (mặc định: 60)

  custom_banner_enabled: boolean;     // Mặc định: true
  custom_banner_text: string;         // "Tham gia nhóm zalo của web tại đây"
  custom_banner_link: string;         // "https://zalo.me/g/qdtlmj2tebfa0baraedg"

  custom_success_msg: string;         // Thông báo nhận mã thành công
  custom_cooldown_msg: string;        // Thông báo đang hồi chiêu / chờ đợt mã
  custom_out_of_stock_msg: string;    // Thông báo hết sạch mã trong kho

  enable_waiting_room: boolean;       // Mặc định: true
  waiting_users_min: number;          // Mặc định: 0
  waiting_users_max: number;          // Mặc định: 0

  show_claimed_count: boolean;        // Chỉ trạng thái bật/tắt (số ảo virtual_claimed_offset giữ riêng)
  global_cooldown_seconds: number;    // Phát code giãn cách toàn sàn (toàn web): 0, 30s, 60s, 120s, 180s, 300s, 600s, 900s, 1800s, 2700s, 3600s

  // Nhóm 2: Nội dung mẫu chung (có chỗ trống)
  title_pattern: string;              // "Code riêng + {game_name}"
  rewards: string;                    // "Code ngẫu nhiên"
  description: string;                // "Code dùng cho 1 tài khoản, 1 loại dùng 1 lần."
}

export interface CatalogTemplateConfig {
  instruction_template: string;       // "Đăng nhập vào game {game_name} -> Bấm vào Avatar nhân vật -> Chọn Cài Đặt -> Chọn Đổi Giftcode -> Nhập mã và xác nhận để nhận quà qua Thư."
  copy_button_label: string;          // "Sao Chép"
  active_status_label: string;        // "Còn Hoạt Động"
  expired_status_label: string;       // "Hết Hạn"
  default_badge: string;              // "Chính Thức"
}

export interface UtilityTemplateConfig {
  title_pattern: string;              // "{title}"
  description_template: string;       // "Sản phẩm số giao tức thì 100%. Bảo hành 1 đổi 1 trong suốt thời gian sử dụng gói. Hỗ trợ kích hoạt 24/7 qua Zalo/Telegram."
  action_button_label: string;        // "Nhận Tiện Ích"
  default_badge: string;              // "Chính Hãng"
}

export interface StoreTemplateConfig {
  title_pattern: string;              // "{title}"
  description_template: string;       // "Mã quà tặng bản quyền phát trực tiếp từ kho Cloudflare D1. Nhận mã tức thì ngay sau khi xác nhận thanh toán."
  action_button_label: string;        // "Mua Code Ngay"
  in_stock_label: string;             // "Còn Hàng"
  out_of_stock_label: string;         // "Tạm Hết Hàng"
  default_badge: string;              // "Bản Quyền"
}

export interface UniversalTemplatesConfig {
  version: number;
  updated_at: string;
  updated_by?: string;
  giveaway: GiveawayTemplateConfig;
  catalog: CatalogTemplateConfig;
  utility: UtilityTemplateConfig;
  store: StoreTemplateConfig;
}

export interface TemplateSnapshot {
  id: string;
  created_at: string;
  created_by: string;
  scope: 'all' | 'giveaway' | 'catalog' | 'utility' | 'store';
  note: string;
  affected_count: number;
  data: {
    templates: UniversalTemplatesConfig;
    giveaways?: any[];
    utilities?: any[];
    store_products?: any[];
  };
}

export interface TemplateAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: 'UPDATE_TEMPLATE' | 'FORCE_APPLY_ALL' | 'RESTORE_SNAPSHOT' | 'TOGGLE_ITEM_TEMPLATE';
  scope: 'all' | 'giveaway' | 'catalog' | 'utility' | 'store';
  target_id?: string;
  target_title?: string;
  affected_count?: number;
  details: string;
}
