export type NotificationType = 'COPY_CODE' | 'BUY_PRODUCT' | 'CLAIM_GIVEAWAY' | 'STATS_COPY' | 'DEPOSIT_WALLET' | 'RESTOCK_PRODUCT';

export type ProductPriority = 'high' | 'normal' | 'low' | 'off';

export interface ProductMarketingConfig {
  priority: ProductPriority;
  virtualStockBonus: number;
  autoRestockThreshold: number;
  autoRestockAmount: number;
  /** FOMO (thông báo + kho ảo) chỉ hoạt động khi tồn kho thật >= giá trị này. Mặc định 1. */
  minRealStock?: number;
  /** Mốc hiển thị số đã bán/đã nhận ảo do Admin chỉ định trực tiếp */
  targetDisplaySoldOrClaimed?: number;
  virtualSold?: number;
  virtualClaimed?: number;
  lastUpdated?: string;
}

export interface PeakHoursConfig {
  enabled: boolean;
  startTime: string; // HH:mm format, e.g. "19:00"
  endTime: string;   // HH:mm format, e.g. "23:00"
  multiplier: number; // e.g. 2.0 (frequency 2x faster)
}

export interface VoteSimulationConfig {
  enabled: boolean;      // true: enable simulated votes, false: only real votes
  activeRate: number;    // e.g. 96 (%)
  expiredRate: number;   // e.g. 4 (%)
  variance: number;      // e.g. 2 (+-2%)
  baseVotesMin: number;  // e.g. 30
  baseVotesMax: number;  // e.g. 150
}

export interface TimeAgoConfig {
  enabled: boolean;        // true: enable dynamic random delay label
  maxDelaySeconds: number; // 5s to 600s, default 30
}

export interface OfflineCatchUpConfig {
  enabled: boolean;          // Bật/tắt tính năng cộng dồn ngoại tuyến khi tắt web
  scope: 'all' | 'server_only'; // 'all': toàn bộ web khách & máy chủ, 'server_only': chỉ điều chỉnh bộ đếm toàn máy chủ
  mode: 'auto' | 'custom';   // 'auto': tăng đều theo thiết lập ưu tiên/giờ cao điểm, 'custom': tùy chỉnh cố định
  intervalMinutes: number;   // Số phút mỗi bước tăng (ví dụ: 15 phút)
  incrementStep: number;     // Số đơn tăng mỗi bước (ví dụ: 1 đơn)
  maxCatchUpUnits: number;   // Giới hạn tăng tối đa khi vắng mặt lâu (ví dụ: 30 đơn)
  outOfStockEnabled?: boolean;      // Bật/tắt bù ngoại tuyến riêng cho sản phẩm đã hết hàng (Mặc định: false)
  outOfStockMaxUnits?: number;     // Giới hạn số đơn tăng tối đa cho sản phẩm hết hàng (Mặc định: 10 đơn)
  outOfStockIncrementStep?: number; // Số đơn tăng mỗi chu kỳ cho sản phẩm hết hàng (Mặc định: 1 đơn)
}

export interface NotificationTypeToggles {
  /** Bật/tắt thông báo sao chép Giftcode game */
  copyCode: boolean;
  /** Bật/tắt thông báo mua tài khoản / gói nạp Cửa hàng (Store) */
  buyStore: boolean;
  /** Bật/tắt thông báo mua tài khoản / công cụ Tiện ích (Utility) */
  buyUtility: boolean;
  /** Cờ chung dự phòng cho đơn hàng */
  buyProduct?: boolean;
  /** Bật/tắt thông báo nhận mã quà tặng sự kiện Giveaway */
  claimGiveaway: boolean;
  /** Bật/tắt thông báo nạp tiền vào ví Core */
  depositWallet: boolean;
  /** Bật/tắt thông báo thống kê tổng số lượt sao chép trong ngày */
  statsCopy: boolean;
  /** Bật/tắt thông báo bổ sung tồn kho / nạp thêm hàng mới */
  restockProduct?: boolean;
}

export interface NotificationTypeWeights {
  /** Trọng số sao chép Giftcode game. Mặc định: 30 */
  copyCode: number;
  /** Trọng số đơn Cửa Hàng (Store). Mặc định: 25 */
  buyStore: number;
  /** Trọng số đơn Tiện ích & Tool. Mặc định: 10 */
  buyUtility: number;
  /** Trọng số chung đơn hàng (nếu không tách riêng) */
  buyProduct?: number;
  /** Trọng số săn quà sự kiện Giveaway. Mặc định: 25 */
  claimGiveaway: number;
  /** Trọng số nạp tiền vào ví Core. Mặc định: 7 */
  depositWallet: number;
  /** Trọng số thống kê tổng số lượt sao chép. Mặc định: 3 */
  statsCopy: number;
  /** Trọng số thông báo bổ sung tồn kho. Mặc định: 12 */
  restockProduct?: number;
}

export type ToastPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export interface MarketingConfig {
  isEnabled: boolean;
  typeToggles?: NotificationTypeToggles;
  typeWeights?: NotificationTypeWeights;
  toastPosition?: ToastPosition;
  depositNotificationPresets?: number[];
  displayDuration: number; // seconds, e.g. 5
  intervalMin: number;     // seconds, e.g. 15
  intervalMax: number;     // seconds, e.g. 30
  initialDelay: number;    // seconds, e.g. 4
  isNameMasked: boolean;   // true: "Minh***" / "098****123"
  realUserCooldownSec?: number; // seconds, e.g. 20 (CD between real user notifications to prevent spam)
  peakHours: PeakHoursConfig;
  virtualAccounts: string[];
  productWeights: Record<string, ProductMarketingConfig>;
  voteConfig: VoteSimulationConfig;
  timeAgoConfig?: TimeAgoConfig;
  offlineCatchUp?: OfflineCatchUpConfig;
  syncIntervalSeconds?: number; // seconds, e.g. 60
  enableGlobalSnapToGrid?: boolean; // true: force sync all clients to server canonical snapshot
  lastUpdated?: string;
}

export interface MarketingNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timeAgo: string;
  userName?: string;
  gameSlug?: string;
  gameName?: string;
  productId?: string;
  productName?: string;
  productPrice?: number;
  giveawayId?: string;
  giveawayTitle?: string;
  itemType?: 'store' | 'utility' | 'giveaway';
  depositAmount?: number;
  totalCopiesCount?: number;
  restockAmount?: number;
  timestamp: number;
  scheduledFireTime?: number;
  serverTimestamp?: number;
  isRealUser?: boolean;
}
