export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MODERATOR'
  | 'VIP'
  | 'MEMBER';

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  permissions: string[];
  createdAt: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalGames: number;
  activeGames: number;
  totalGiftcodes: number;
  pendingSubmissions: number;
  totalMembers: number;
  totalOrders: number;
  completedOrders: number;
}

export interface DailyDataPoint {
  date: string;
  dayLabel: string;
  fullDate: string;
  revenue: number;
  newMembers: number;
  codeCopies: number;
  newCodes: number;
  newGames: number;
  orders: number;
}

export interface GameAdminRecord {
  id: string;
  name: string;
  slug: string;
  publisher: string;
  category: string;
  rating: number;
  icon_url: string;
  banner_url?: string;
  description: string;
  short_description?: string;
  instructions: string;
  platform: string;
  so_giay_phep?: string;
  ngay_cap_phep?: string;
  license_number?: string;
  license_issued_date?: string;
  license_status?: 'Đang hoạt động' | 'Ngừng hoạt động' | 'Bị thay thế' | string;
  license_source_url?: string;
  release_date: string;
  status: 'ACTIVE' | 'HOT' | 'INACTIVE' | 'PENDING' | 'HIDDEN' | 'UNPUBLISHED' | 'DELETED' | string;
  is_active?: boolean;
  redeem_url?: string;
  codes_count?: number;
  active_codes_count?: number;
  expired_codes_count?: number;
  total_codes_count?: number;
  free_codes_count?: number;
  google_play_url?: string;
  app_store_url?: string;
  android_package_name?: string;
  download_android?: string;
  download_ios?: string;
  download_pc?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GameAuditLog {
  id: string;
  game_id: string;
  game_slug: string;
  game_name: string;
  action: 'CREATE' | 'UPDATE' | 'UNPUBLISH' | 'PUBLISH' | 'DELETE' | 'RESTORE' | 'PERMANENT_DELETE';
  actor: string;
  changes?: Array<{ field: string; from: any; to: any }>;
  created_at: string;
}

export interface FreeCodeRecord {
  id: string;
  gameSlug: string;
  codeValue: string;
  code?: string;
  rewards: string;
  status: 'ACTIVE' | 'EXPIRED';
  expiresAt: string;
  isVerified?: boolean;
  copyCount?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GiftcodeSubmission {
  id: string;
  gameSlug: string;
  codeValue: string;
  submitterName: string;
  submitterEmail: string;
  rewards: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  notes?: string;
  submittedAt: string;
}

export interface MemberRecord {
  id: string;
  displayName: string;
  username?: string;
  email: string;
  phone?: string;
  role: UserRole;
  balance: number;
  totalSpent: number;
  status: 'ACTIVE' | 'BANNED';
  avatar?: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  referenceId: string;
  memberId: string;
  memberEmail?: string;
  type: 'DEPOSIT' | 'ORDER_PAYMENT' | 'REFUND' | 'ADMIN_ADJUST' | 'REWARD';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  note: string;
  createdAt: string;
}

export interface PrivateCodeIssue {
  id: string;
  codeValue: string;
  title: string;
  memberId: string;
  memberEmail: string;
  rewards: string;
  expiresAt: string;
  isClaimed: boolean;
  claimedAt?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  codeValue: string;
  serial?: string;
  price: number;
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED';
  soldAt?: string;
  orderId?: string;
  createdAt?: string;
}

export interface AdminOrderRecord {
  id: string;
  orderCode: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  productTitle: string;
  amount: number;
  paymentMethod: 'WALLET' | 'SEPAY_BANK';
  deliveredCodes: string[];
  status: 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
}

export interface SePayConfig {
  apiKey?: string;
  isConnected: boolean;
  webhookUrl: string;
  webhookSecretSet: boolean;
  bankAccount: string;
  accountNumber: string;
  bankName: string;
  paymentPrefix: string;
  environment: 'PRODUCTION' | 'SANDBOX';
  lastWebhookAt?: string;
  lastSuccessAt?: string;
  autoCreditCoreRatio?: number;
}

export interface SePayWebhookLog {
  id: string;
  transactionId: string;
  transferAmount: number;
  content: string;
  gateway: string;
  accountNumber: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  processedAt: string;
}

export interface ContentItem {
  id: string;
  key:
    | 'announcement_banner'
    | 'hero_banner'
    | 'store_section'
    | 'footer_support'
    | 'terms_of_service'
    | 'privacy_policy'
    | string;
  title: string;
  content: string;
  isActive: boolean;
  type: 'ANNOUNCEMENT' | 'HERO' | 'STORE' | 'FOOTER' | 'TERMS' | 'PRIVACY' | string;
  updatedAt: string;
  extraData?: {
    telegram?: string;
    zalo?: string;
    hotline?: string;
    subtitle?: string;
    [key: string]: any;
  };
}

export interface SecurityLog {
  id: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  details?: any;
  createdAt: string;
}

export interface PendingCrawlerGame {
  id: string;
  name: string;
  slug: string;
  packageId?: string;
  developer: string | null;
  publisher?: string | null;
  platform?: string | null;
  instructions?: string | null;
  missing_icon?: boolean;
  has_icon?: boolean;
  codes_count?: number;
  category: string | null;
  rating: number;
  installs: string | null;
  iconUrl: string;
  localIconPath?: string;
  playStoreUrl?: string;
  sourceType?: 'google_play' | 'codemoi' | string;
  sourceUrl?: string;
  releaseInfo?: string;
  activeCodesCount?: number;
  description: string;
  releaseDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  autoPublishEligible?: boolean;
  crawledAt: string;
}

export interface CrawlerAutoPublishConfig {
  enabled: boolean;
  autoPublishWhenHasCodes?: boolean;
  whitelistPublishers: string[];
  minInstalls: number;
  minRating: number;
  autoDownloadIcons?: boolean;
  autoAddCrawlerSource?: boolean;
}

export interface CrawlerApiConfig {
  enabled: boolean;
  apiKey: string;
  botName: string;
  autoPublish: boolean;
  rateLimitPerMinute?: number;
  lastUsedAt?: string;
}

export interface CrawlerApiLogEntry {
  id: string;
  botName: string;
  sourceIp: string;
  totalItemsProcessed: number;
  totalCodesReceived: number;
  totalCodesAdded: number;
  autoPublishedGamesCount: number;
  details: Array<{
    input: string;
    matched?: string;
    added: number;
    status: 'SUCCESS' | 'FAILED';
  }>;
  timestamp: string;
}

export interface UpcomingGameAdminRecord {
  id: string;
  name: string;
  slug: string;
  publisher: string;
  releaseDate?: string | null; // ISO date string or YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss or null if TBA
  category: string;
  platform: string; // e.g. 'PC, Android, iOS'
  iconUrl?: string;
  icon_url?: string;
  proxyIconUrl?: string;
  bannerUrl?: string;
  description?: string;
  preRegUrl?: string;
  expectedCodes: string[];
  subscribersCount?: number;
  source?: string; // 'Trợ lý Pine' | 'Muse Bot' | 'Admin Console'
  status: 'UPCOMING' | 'APPROVED' | 'PENDING' | 'LAUNCHED' | 'CANCELLED';
  displayOrder?: number; // 1..6: Top 6 hiển thị ngay trên Web Khách; 7+: Hiển thị khi bấm Xem Thêm
  orderGrowthEnabled?: boolean;
  orderGrowthRate?: number;
  orderMinRange?: number;
  orderMaxRange?: number;
  subscribersGrowthEnabled?: boolean;
  subscribersGrowthRatePerHour?: number;
  subscribersMinRange?: number;
  subscribersMaxRange?: number;
  growthAnchorTime?: string;
  isPinned?: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingGameApiLogEntry {
  id: string;
  botName: string;
  sourceIp: string;
  totalGamesProcessed: number;
  totalGamesAdded: number;
  totalGamesUpdated: number;
  status: 'SUCCESS' | 'FAILED';
  details?: Array<{
    name: string;
    slug: string;
    status: string;
    releaseDate?: string | null;
  }>;
  timestamp: string;
}
