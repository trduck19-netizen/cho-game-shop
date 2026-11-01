import type {
  MarketingConfig,
  ProductMarketingConfig,
  ProductPriority,
  MarketingNotification,
  NotificationType,
  NotificationTypeToggles,
  NotificationTypeWeights,
  OfflineCatchUpConfig,
  ToastPosition,
} from '../types/marketing';
import type { GameItem, StoreProduct, UtilityProduct, GiveawayCampaign, UserProfile } from '../types/game';
import { DEFAULT_STORE_PRODUCTS, DEFAULT_UTILITY_PRODUCTS, DEFAULT_GIVEAWAYS } from '../data/seedData';
import type { GlobalMetricsSnapshot } from '../shared/deterministicEngine';
import {
  calculateDeterministicCopyCount,
  calculateDeterministicStock,
  calculateDeterministicSold,
} from '../shared/deterministicEngine';

const MARKETING_CONFIG_KEY = 'wcg_marketing_config_v1';
const MARKETING_REAL_CLICKS_KEY = 'wcg_marketing_real_clicks_v1';
const MARKETING_VIRTUAL_STOCK_KEY = 'wcg_virtual_stock_levels_v2';
const MARKETING_VIRTUAL_STOCK_TIMESTAMPS_KEY = 'wcg_virtual_stock_timestamps_v2';
const MARKETING_FOMO_SOLD_KEY = 'wcg_fomo_live_sold_counts_v2';
const MARKETING_FOMO_CLAIMED_KEY = 'wcg_fomo_live_claimed_counts_v2';
const MARKETING_HOURLY_SERVER_STATS_KEY = 'wcg_hourly_server_stats_v2';
const MARKETING_LAST_HOURLY_SYNC_KEY = 'wcg_last_hourly_sync_timestamp';
const MARKETING_PROCESSED_IDS_KEY = 'wcg_marketing_processed_ids_v2';
const MARKETING_HIGH_WATER_SOLD_KEY = 'wcg_high_water_sold_counts_v1';
const MARKETING_HIGH_WATER_CLAIMED_KEY = 'wcg_high_water_claimed_counts_v1';
const MARKETING_FOMO_SESSION_ANCHOR_KEY = 'wcg_fomo_session_anchor_v2';
const MARKETING_SNAPSHOT_KEY = 'wcg_metrics_snapshot_cache_v2';
const MARKETING_ADMIN_OVERRIDE_CLAIMED_KEY = 'wcg_admin_override_claimed_v2';
const MARKETING_ADMIN_OVERRIDE_SOLD_KEY = 'wcg_admin_override_sold_v2';

export const PRESET_VIRTUAL_ACCOUNTS: string[] = [
  // 1. Vietnamese Full Names (30 names)
  'Nguyễn Minh Tuấn', 'Trần Hoàng Long', 'Lê Hải Đăng', 'Phạm Quỳnh Nga', 'Hoàng Bảo Trâm',
  'Đỗ Gia Huy', 'Vũ Quốc Anh', 'Bùi Đức Thắng', 'Đặng Thảo Vy', 'Ngô Quang Khải',
  'Dương Anh Khoa', 'Lý Tấn Phát', 'Phan Thanh Tùng', 'Võ Hoài Nam', 'Mai Anh Tuấn',
  'Trịnh Khánh Linh', 'Lưu Hồng Sơn', 'Đoàn Nhật Minh', 'Hà Minh Trí', 'Tạ Thanh Hằng',
  'Nguyễn Hữu Đạt', 'Trần Văn Kiên', 'Lê Đình Trọng', 'Phạm Ngọc Ánh', 'Hoàng Thùy Dung',
  'Đinh Văn Mạnh', 'Lâm Quốc Bảo', 'Vương Đình Nam', 'Tạ Quốc Cường', 'Châu Thanh Tuyền',

  // 2. Masked Vietnamese Phone Numbers (15 numbers)
  '0984562189', '0912389472', '0978912345', '0905671234', '0934129876',
  '0868123987', '0898765432', '0967894561', '0943216789', '0923456781',
  '0778912340', '0701234568', '0834567890', '0856789123', '0812345679',

  // 3. Gamer Usernames (15 names)
  'shadow_hunter', 'pro_sniper_99', 'nobita_gaming', 'phong_ba_game', 'than_kiem_9x',
  'trum_solo_ff', 'yasuo_gank_tem', 'naruto_vietnam', 'dragon_slayer', 'kien_lua_vip',
  'sat_thu_vo_danh', 'ninja_rua_99', 'phuong_hoang_lua', 'bach_ho_kiem', 'thien_ha_de_nhat',

  // 4. Custom Gamer & Food Usernames (30 names)
  'shadowwalker', 'mem_chua_chin', 'phantom_echo', 'khoai_tay_lac', 'pixeldrift',
  'banh_bao_chay', 'frostbyte', 'meo_luoi_tam', 'voidrunner', 'ca_rot_biet_bay',
  'neonpulse', 'cu_lac_rang', 'nightraven', 'to_ong_vo_ve', 'silentstorm',
  'kem_dua_chua', 'emberflare', 'tra_sua_khong_duong', 'lunarhaze', 'vit_troi_boi_ngua',
  'ironclaw', 'gau_khong_ngu', 'quantumfall', 'chuoi_chin_cay', 'abysswhisper',
  'com_nguoi_chien', 'astralbound', 'banh_mi_pate', 'cyberphantom', 'ca_phe_den_da'
];

/**
 * Mẫu mặc định áp dụng cho mọi sản phẩm / tiện ích / giveaway chưa có cấu hình riêng
 * (ví dụ sản phẩm mới đăng): kho ảo 20, bù thêm 20 khi kho ảo còn <= 1,
 * ưu tiên bình thường (x2), chỉ chạy FOMO khi kho thật >= 1.
 */
export const DEFAULT_PRODUCT_MARKETING_CONFIG: ProductMarketingConfig = {
  priority: 'off',
  virtualStockBonus: 0,
  autoRestockThreshold: 1,
  autoRestockAmount: 20,
  minRealStock: 1,
};

export const DEFAULT_OFFLINE_CATCHUP_CONFIG: OfflineCatchUpConfig = {
  enabled: true,
  scope: 'all',
  mode: 'auto',
  intervalMinutes: 60,
  incrementStep: 1,
  maxCatchUpUnits: 30,
  outOfStockEnabled: false,
  outOfStockMaxUnits: 10,
  outOfStockIncrementStep: 1,
};

export const DEFAULT_TYPE_TOGGLES: NotificationTypeToggles = {
  copyCode: true,
  buyStore: true,
  buyUtility: true,
  claimGiveaway: true,
  depositWallet: true,
  statsCopy: true,
  restockProduct: true,
};

export const DEFAULT_TYPE_WEIGHTS: NotificationTypeWeights = {
  copyCode: 80,       // 50%
  buyStore: 25,       // 16%
  buyUtility: 10,     // 6%
  restockProduct: 5,  // 3%
  claimGiveaway: 30,  // 19%
  depositWallet: 7,   // 4%
  statsCopy: 3,       // 2%
};

export const DEFAULT_DEPOSIT_PRESETS: number[] = [20000, 50000, 100000, 200000, 300000, 500000, 1000000];

export const SLOT_DURATION_MS = 10000; // Nhịp khe 10 giây cố định toàn hệ thống

export const DEFAULT_MARKETING_CONFIG: MarketingConfig = {
  isEnabled: true,
  typeToggles: DEFAULT_TYPE_TOGGLES,
  typeWeights: DEFAULT_TYPE_WEIGHTS,
  toastPosition: 'bottom-left',
  depositNotificationPresets: DEFAULT_DEPOSIT_PRESETS,
  displayDuration: 5,
  intervalMin: 25,
  intervalMax: 45,
  initialDelay: 5,
  isNameMasked: true,
  realUserCooldownSec: 20,
  peakHours: {
    enabled: true,
    startTime: '19:00',
    endTime: '23:30',
    multiplier: 1.15,
  },
  virtualAccounts: PRESET_VIRTUAL_ACCOUNTS,
  productWeights: {},
  voteConfig: {
    enabled: true,
    activeRate: 96,
    expiredRate: 4,
    variance: 2,
    baseVotesMin: 45,
    baseVotesMax: 180,
  },
  timeAgoConfig: {
    enabled: true,
    maxDelaySeconds: 30,
  },
  offlineCatchUp: DEFAULT_OFFLINE_CATCHUP_CONFIG,
  syncIntervalSeconds: 60,
  enableGlobalSnapToGrid: true,
  lastUpdated: '2026-01-01T00:00:00.000Z',
};

// Fast deterministic 32-bit PRNG (Mulberry32)
function createPRNG(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable string hash (DJB2)
function stringHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

class MarketingService {
  private config: MarketingConfig;
  private serverTimeOffset: number = 0;
  private realClicksOffset: number = 0;
  private masterCopyClicks: number = 0;
  private currentClickDate: string = '';
  private realProductSoldCountsMap: Map<string, number> = new Map();
  private realGiveawayClaimedCountsMap: Map<string, number> = new Map();
  private counterListeners: Set<(count: number) => void> = new Set();
  private notificationListeners: Set<(notif: MarketingNotification | null) => void> = new Set();
  private stockListeners: Set<(productId: string, newStock: number) => void> = new Set();
  private soldCountListeners: Set<(id: string, count: number) => void> = new Set();
  private recentRealEvents: MarketingNotification[] = [];
  private lastBroadcastCount: number = 0;
  private liveVirtualStockMap: Map<string, number> = new Map();
  private liveVirtualStockTimestampsMap: Map<string, number> = new Map();
  private recentRestockTimestampsMap: Map<string, number> = new Map();
  private productRealStockMap: Map<string, number> = new Map();
  private liveFomoSoldCountMap: Map<string, number> = new Map();
  private liveFomoClaimedCountMap: Map<string, number> = new Map();
  private highWaterSoldCountMap: Map<string, number> = new Map();
  private highWaterClaimedCountMap: Map<string, number> = new Map();
  private adminOverrideClaimedMap: Map<string, number> = new Map();
  private adminOverrideSoldMap: Map<string, number> = new Map();
  private saveHighWaterTimer: any = null;
  private sessionAnchorMap: Map<string, { lastCount: number; lastTimestamp: number }> = new Map();
  private saveSessionAnchorTimer: any = null;
  private recentAccountsRingBuffer: string[] = [];
  private readonly RING_BUFFER_SIZE = 35;
  private cachedRound: number = -1;
  private cachedRoundCount: number = -1;
  private cachedRoundIndices: number[] = [];
  private processedNotifIds: Set<string> = new Set();
  private processedStockNotifIds: Set<string> = new Set();
  private sessionStartTime: number = Date.now();
  private broadcastChannel: BroadcastChannel | null = null;
  private pendingCopyIncrement: number = 0;
  private pendingCopyEvent: MarketingNotification | null = null;
  private copyPushTimer: any = null;
  private lastCopyPushTime: number = 0;
  private initialSyncCompleted: boolean = false;
  private readonly COPY_PUSH_COOLDOWN_MS = 5000; // 5s debounce for copy clicks to batch & protect KV write quota
  private pendingFailedCopyIncrement: number = 0;
  private lastRealCopyToastTime: number = 0;
  private readonly REAL_COPY_TOAST_COOLDOWN_MS = 20000; // 20s cooldown for real user copy notification toasts
  private userActionCooldownMap: Map<string, number> = new Map(); // Quản lý cooldown chống spam thông báo theo người dùng (20s)
  private realtimePollerTimer: any = null;
  private isPollerRunning: boolean = false;
  private hourlyServerStatsMap: Map<string, any> = new Map();
  private hourlySyncTimer: any = null;
  private readonly ONE_HOUR_MS: number = 3600000;
  private activeSnapshot: GlobalMetricsSnapshot | null = null;
  private recentOrderDeltas: Map<string, { qty: number; expiresAt: number }> = new Map();
  private recentGiveawayDeltas: Map<string, { expiresAt: number }> = new Map();
  private snapshotPollerTimer: any = null;
  private peakReportTimer: any = null;
  private lastPeakReportSentTime: number = 0;
  private visibilityListenerAttached: boolean = false;
  private lastReportedPeaks: {
    sold: Record<string, number>;
    claimed: Record<string, number>;
    copy: number;
    stock: Record<string, number>;
    remaining: Record<string, number>;
  } = { sold: {}, claimed: {}, copy: 0, stock: {}, remaining: {} };
  private dailyMaxCopyCount: number = 0;
  private dailyMaxCopyDate: string = '';
  private globalMasterCopyCount: number = 94558;
  private processedCopyNotifIds: Set<string> = new Set();
  private lastSelfClickToastId: string | null = null;
  private selfClickToastIds: Set<string> = new Set();

  public isSelfClickToast(notifId?: string): boolean {
    if (!notifId) return false;
    if (this.lastSelfClickToastId && this.lastSelfClickToastId === notifId) return true;
    if (this.selfClickToastIds.has(notifId)) return true;
    return false;
  }
  private masterCopyAnchorTime: number = 0;
  private masterCopyAnchorCount: number = 0;
  private localSessionCopyClicks: number = 0;
  private lastToastFiredTime: number = 0;

  // Authoritative Two-Layer Server Counters (SSOT - Single Source of Truth)
  public serverProductCounters = new Map<string, {
    sold: number;
    stock: number;
    real_sold: number;
    real_stock: number;
    virtual_sold: number;
    virtual_buffer: number;
    virtual_restock_count: number;
  }>();
  public serverGiveawayCounters = new Map<string, {
    claimed: number;
    remaining: number;
    real_claimed: number;
    real_remaining: number;
    virtual_claimed: number;
    virtual_buffer: number;
  }>();
  public serverMasterCopy = {
    count: 0,
    real: 0,
    virtual: 0,
  };

  // Authoritative Server Ledger Event Queue
  private serverLedgerEventQueue: MarketingNotification[] = [];
  private cachedLedgerEvents: MarketingNotification[] = [];
  private slotEventsMap: Map<number, MarketingNotification> = new Map();
  private lastLedgerSyncTime: number = 0;

  constructor() {
    // Purge legacy client-side drift keys (Rule: Client displays SSOT numbers from server, zero localStorage drift)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('wcg_high_water_sold_counts_v1');
        localStorage.removeItem('wcg_high_water_claimed_counts_v1');
        localStorage.removeItem('wcg_admin_override_sold_v2');
        localStorage.removeItem('wcg_admin_override_claimed_v2');
        localStorage.removeItem('wcg_fomo_session_anchor_v2');
      } catch {}
    }

    this.config = this.loadConfig();
    this.initProcessedNotifIds();
    this.initProcessedCopyNotifIds();
    this.initMasterCopyClicks();
    this.initDailyMaxCopyCount();
    this.initRealClicks();
    this.initLiveVirtualStock();
    this.initLiveFomoCounts();
    this.initSnapshotCache();
    this.initHighWaterCounts();
    this.initAdminOverrides();
    this.initSessionAnchor();
    this.applyOfflineCatchUp();
    this.initHourlyServerStats();
    this.initBroadcastChannel();
    this.setupStorageListener();
    this.startGlobalCounterTicker();
    this.startHourlySyncEngine();
    this.startRealtimeEventsPoller();
    this.startSnapshotPoller();
  }

  private initSnapshotCache(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(MARKETING_SNAPSHOT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.activeSnapshot = parsed;
          if (parsed.master_copy && (typeof parsed.master_copy.anchor_count === 'number' || typeof parsed.master_copy.count === 'number')) {
            const anchorCount = Number(parsed.master_copy.count || parsed.master_copy.anchor_count) || 0;
            this.masterCopyAnchorCount = anchorCount;
            this.masterCopyAnchorTime = parsed.master_copy.anchor_time || Date.now();
            if (anchorCount > this.globalMasterCopyCount) {
              this.globalMasterCopyCount = anchorCount;
              this.dailyMaxCopyCount = anchorCount;
              this.saveGlobalMasterCopyCount();
            }
          }
          if (parsed.products && typeof parsed.products === 'object') {
            Object.entries(parsed.products).forEach(([pId, info]: [string, any]) => {
              if (info) {
                if (typeof info.sold === 'number') {
                  const curSold = this.highWaterSoldCountMap.get(pId) || 0;
                  this.highWaterSoldCountMap.set(pId, Math.max(curSold, info.sold));
                }
                if (typeof info.real_stock === 'number') {
                  this.productRealStockMap.set(pId, info.real_stock);
                }
                if (typeof info.stock === 'number' && !this.liveVirtualStockMap.has(pId)) {
                  this.liveVirtualStockMap.set(pId, info.stock);
                }
              }
            });
          }
          if (parsed.giveaways && typeof parsed.giveaways === 'object') {
            Object.entries(parsed.giveaways).forEach(([gId, info]: [string, any]) => {
              if (info) {
                if (typeof info.claimed === 'number') {
                  const curClaimed = this.highWaterClaimedCountMap.get(gId) || 0;
                  // BẢNG ADMIN LÀ CHÂN LÝ: Nếu curClaimed đang bị phình to (> info.claimed + 5), lập tức hạ về info.claimed
                  if (curClaimed > info.claimed + 5 || curClaimed === 0) {
                    this.highWaterClaimedCountMap.set(gId, info.claimed);
                  } else {
                    this.highWaterClaimedCountMap.set(gId, Math.max(curClaimed, info.claimed));
                  }
                }
                if (typeof info.real_remaining === 'number') {
                  this.productRealStockMap.set(gId, info.real_remaining);
                }
                if (typeof info.remaining === 'number' && !this.liveVirtualStockMap.has(gId)) {
                  this.liveVirtualStockMap.set(gId, info.remaining);
                }
              }
            });
          }
        }
      }
    } catch {}
  }

  private saveSnapshotCache(): void {
    if (typeof window === 'undefined' || !this.activeSnapshot) return;
    try {
      localStorage.setItem(MARKETING_SNAPSHOT_KEY, JSON.stringify(this.activeSnapshot));
    } catch {}
  }

  public recordRecentOrderDelta(productId: string, qty: number): void {
    if (!productId) return;
    const current = this.recentOrderDeltas.get(productId)?.qty || 0;
    this.recentOrderDeltas.set(productId, {
      qty: current + Math.max(1, qty),
      expiresAt: Date.now() + 65000,
    });
  }

  public recordRecentGiveawayDelta(campaignId: string): void {
    if (!campaignId) return;
    this.recentGiveawayDeltas.set(campaignId, {
      expiresAt: Date.now() + 65000,
    });
  }

  public getRecentOrderDelta(productId: string): number {
    const item = this.recentOrderDeltas.get(productId);
    if (!item) return 0;
    if (Date.now() > item.expiresAt) {
      this.recentOrderDeltas.delete(productId);
      return 0;
    }
    return item.qty;
  }

  public getRecentGiveawayDelta(campaignId: string): boolean {
    const item = this.recentGiveawayDeltas.get(campaignId);
    if (!item) return false;
    if (Date.now() > item.expiresAt) {
      this.recentGiveawayDeltas.delete(campaignId);
      return false;
    }
    return true;
  }

  public async fetchMetricsSnapshot(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/metrics/synced');
      if (!res.ok) return;
      const data: any = await res.json().catch(() => null);
      if (data && data.success && data.snapshot) {
        this.activeSnapshot = data.snapshot;
        this.saveSnapshotCache();
        // LƯU Ý KỸ THUẬT QUAN TRỌNG:
        // Không dùng data.snapshot.server_time để calibrateServerTime ở đây,
        // vì endpoint /api/metrics/synced được Edge Cache (s-maxage=30s).
        // Thời gian snapshot là thời gian quá khứ, nếu dùng để hiệu chuẩn sẽ làm đồng hồ
        // client giật lùi 30s, khiến bộ đếm lượt copy bị tụt xuống.
        // Chỉ hiệu chuẩn đồng hồ từ endpoint động thời gian thực (/api/realtime-events hoặc /api/stats).
        if (data.snapshot.master_copy && typeof data.snapshot.master_copy.real_clicks === 'number') {
          if (data.snapshot.master_copy.real_clicks > this.masterCopyClicks) {
            this.masterCopyClicks = data.snapshot.master_copy.real_clicks;
            this.saveMasterCopyClicks();
          }
        }
        const now = Date.now();
        this.recentOrderDeltas.forEach((val, key) => {
          if (now > val.expiresAt) this.recentOrderDeltas.delete(key);
        });
        this.recentGiveawayDeltas.forEach((val, key) => {
          if (now > val.expiresAt) this.recentGiveawayDeltas.delete(key);
        });

        const snapToGrid = this.config.enableGlobalSnapToGrid !== false;

        if (snapToGrid) {
          // 1. Force Snap copy clicks and daily max copy count to authoritative server snapshot
          if (data.snapshot.master_copy && (typeof data.snapshot.master_copy.anchor_count === 'number' || typeof data.snapshot.master_copy.count === 'number')) {
            const anchorCount = Number(data.snapshot.master_copy.count || data.snapshot.master_copy.anchor_count) || 0;
            this.masterCopyAnchorCount = anchorCount;
            this.masterCopyAnchorTime = data.snapshot.master_copy.anchor_time || Date.now();
            if (anchorCount > this.globalMasterCopyCount) {
              this.globalMasterCopyCount = anchorCount;
              this.dailyMaxCopyCount = anchorCount;
              this.saveGlobalMasterCopyCount();
              this.broadcastCurrentCount();
            }
            this.localSessionCopyClicks = 0;
            if (typeof data.snapshot.master_copy.real_clicks === 'number') {
              this.masterCopyClicks = data.snapshot.master_copy.real_clicks;
              this.realClicksOffset = this.masterCopyClicks;
              this.saveMasterCopyClicks();
            }
          }

          // 2. Force Snap product sold counts & virtual stock
          if (data.snapshot.products && typeof data.snapshot.products === 'object') {
            Object.entries(data.snapshot.products).forEach(([pId, info]: [string, any]) => {
              if (info) {
                if (typeof info.real_stock === 'number') {
                  this.productRealStockMap.set(pId, info.real_stock);
                }
                if (typeof info.sold === 'number') {
                  const isOverriddenSold = this.adminOverrideSoldMap.has(pId);
                  const realSold = typeof info.real_sold === 'number' ? info.real_sold : 0;
                  const localOrderDelta = this.getRecentOrderDelta(pId);

                  // Server snapshot is authoritative canonical baseline
                  const canonicalSold = isOverriddenSold
                    ? Math.max(realSold, this.adminOverrideSoldMap.get(pId)!)
                    : Math.max(realSold, info.sold);
                  const effectiveSold = canonicalSold + localOrderDelta;

                  // RÀNG BUỘC ĐƠN ĐIỆU TUYỆT ĐỐI (Monotonically Non-Decreasing):
                  // Số đã bán cố định theo cấu hình; thanh lọc sạch các đỉnh rác cũ (> effectiveSold + 35) do lỗi lặp
                  const curHigh = this.highWaterSoldCountMap.get(pId) || 0;
                  const finalSold = isOverriddenSold
                    ? effectiveSold
                    : (curHigh > effectiveSold + 2000 ? effectiveSold : Math.max(curHigh, effectiveSold));

                  this.highWaterSoldCountMap.set(pId, finalSold);
                  this.liveFomoSoldCountMap.set(pId, Math.max(0, finalSold - realSold));
                  this.notifySoldCountChanged(pId, finalSold);

                  // Nếu số cục bộ cao hơn server hoặc có đơn hàng thật: đồng bộ peak lên server để chia sẻ cho các máy khác
                  if (curHigh > effectiveSold || localOrderDelta > 0) {
                    this.schedulePeakReport();
                  }
                }
                if (typeof info.stock === 'number') {
                  const realStock = typeof info.real_stock === 'number'
                    ? info.real_stock
                    : (this.productRealStockMap.get(pId) || 0);

                  // Hết hàng thật trong D1 thì lập tức hiển thị 0 (không giữ số ảo)
                  if (realStock <= 0) {
                    this.liveVirtualStockMap.set(pId, 0);
                    this.liveVirtualStockTimestampsMap.set(pId, now);
                  } else {
                    const pw = this.getProductConfig(pId);
                    const currentLive = this.liveVirtualStockMap.get(pId);
                    const hasAutoRestock = pw.priority !== 'off' && Boolean(pw.virtualStockBonus) && Number(pw.virtualStockBonus) > 0;
                    const rawThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
                    const effectiveThreshold = (realStock > 0 && rawThreshold < realStock)
                      ? realStock
                      : rawThreshold;
                    const restockAmount = Math.max(1, Number(pw.autoRestockAmount) || 20);
                    const maxAllowedStock = (pw.priority === 'off' || !pw.virtualStockBonus || pw.virtualStockBonus <= 0)
                      ? realStock
                      : Math.max(realStock + Number(pw.virtualStockBonus || 0), effectiveThreshold + restockAmount);

                    if (typeof currentLive === 'number' && currentLive > maxAllowedStock) {
                      const healed = Math.min(info.stock > 0 ? info.stock : maxAllowedStock, maxAllowedStock);
                      this.liveVirtualStockMap.set(pId, healed);
                      this.liveVirtualStockTimestampsMap.set(pId, now);
                    } else if (typeof currentLive !== 'number' || isNaN(currentLive) || currentLive <= 0) {
                      const initStock = (info.stock > 0 && info.stock <= maxAllowedStock)
                        ? info.stock
                        : (pw.virtualStockBonus > 0 ? this.getVirtualBonusStock(pId, now, realStock) : realStock);
                      this.liveVirtualStockMap.set(pId, initStock);
                      this.liveVirtualStockTimestampsMap.set(pId, now);
                    } else if (info.stock > 0 && info.stock < currentLive && info.stock <= maxAllowedStock) {
                      // Server snapshot đã ghi nhận đơn bán từ thiết bị khác hoặc tiến trình chung
                      this.liveVirtualStockMap.set(pId, info.stock);
                      this.liveVirtualStockTimestampsMap.set(pId, now);
                      this.notifyStockChanged(pId, info.stock);
                    } else if (info.stock > currentLive && info.stock <= maxAllowedStock) {
                      // 2. Server stock lớn hơn client stock:
                      // Chỉ chấp nhận ghi đè tăng số nếu server thực sự vừa BÙ KHO (nhảy lên mốc bù kho sau đáy):
                      const isServerFreshRestock = hasAutoRestock && info.stock >= (effectiveThreshold + restockAmount - 2) && currentLive <= (effectiveThreshold + 2);
                      if (isServerFreshRestock) {
                        this.recentRestockTimestampsMap.set(pId, now);
                        this.liveVirtualStockMap.set(pId, info.stock);
                        this.liveVirtualStockTimestampsMap.set(pId, now);
                        this.notifyStockChanged(pId, info.stock);
                      }
                    }
                  }
                }
              }
            });
            this.saveHighWaterCounts();
            this.saveLiveVirtualStock();
          }

          // 3. Force Snap giveaway claimed counts & remaining stock
          if (data.snapshot.giveaways && typeof data.snapshot.giveaways === 'object') {
            Object.entries(data.snapshot.giveaways).forEach(([gId, info]: [string, any]) => {
              if (info) {
                if (typeof info.real_remaining === 'number') {
                  this.productRealStockMap.set(gId, info.real_remaining);
                }
                if (typeof info.claimed === 'number') {
                  const isOverriddenClaimed = this.adminOverrideClaimedMap.has(gId);
                  const realClaimed = typeof info.real_claimed === 'number' ? info.real_claimed : 0;
                  const localGwDelta = this.getRecentGiveawayDelta(gId) ? 1 : 0;

                  // Server snapshot is authoritative canonical baseline
                  const canonicalClaimed = isOverriddenClaimed
                    ? Math.max(realClaimed, this.adminOverrideClaimedMap.get(gId)!)
                    : Math.max(realClaimed, info.claimed);
                  const effectiveClaimed = canonicalClaimed + localGwDelta;

                  // BẢNG ADMIN LÀ CHÂN LÝ: Thanh lọc sạch các đỉnh rác cũ (> effectiveClaimed + 5) do công thức cũ làm phình to
                  const curHigh = this.highWaterClaimedCountMap.get(gId) || 0;
                  const finalClaimed = (isOverriddenClaimed || curHigh > effectiveClaimed + 5)
                    ? effectiveClaimed
                    : Math.max(curHigh, effectiveClaimed);

                  this.highWaterClaimedCountMap.set(gId, finalClaimed);
                  this.liveFomoClaimedCountMap.set(gId, Math.max(0, finalClaimed - realClaimed));
                  this.notifySoldCountChanged(gId, finalClaimed);
                }
                if (typeof info.remaining === 'number') {
                  const realRemaining = typeof info.real_remaining === 'number'
                    ? info.real_remaining
                    : (this.productRealStockMap.get(gId) || 0);

                  if (realRemaining <= 0) {
                    this.liveVirtualStockMap.set(gId, 0);
                    this.liveVirtualStockTimestampsMap.set(gId, now);
                  } else {
                    const pw = this.getProductConfig(gId);
                    const rawThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
                    const effectiveThreshold = (realRemaining > 0 && rawThreshold < realRemaining)
                      ? realRemaining
                      : rawThreshold;
                    const restockAmount = Math.max(1, Number(pw.autoRestockAmount) || 20);
                    const currentLive = this.liveVirtualStockMap.get(gId);
                    const hasAutoRestock = Boolean(pw.virtualStockBonus && pw.virtualStockBonus > 0 && pw.autoRestockAmount && pw.autoRestockAmount > 0);

                    const maxAllowedGwStock = (pw.priority === 'off' || !pw.virtualStockBonus || pw.virtualStockBonus <= 0)
                      ? realRemaining
                      : Math.max(realRemaining + Number(pw.virtualStockBonus || 0), effectiveThreshold + restockAmount);

                    if (typeof currentLive === 'number' && currentLive > maxAllowedGwStock) {
                      const healed = Math.min(info.remaining > 0 ? info.remaining : maxAllowedGwStock, maxAllowedGwStock);
                      this.liveVirtualStockMap.set(gId, healed);
                      this.liveVirtualStockTimestampsMap.set(gId, now);
                    } else if (typeof currentLive !== 'number' || isNaN(currentLive) || currentLive <= 0) {
                      const initRemaining = (info.remaining > 0 && info.remaining <= maxAllowedGwStock)
                        ? info.remaining
                        : (pw.virtualStockBonus > 0 ? this.getVirtualBonusStock(gId, now, realRemaining) : realRemaining);
                      this.liveVirtualStockMap.set(gId, initRemaining);
                      this.liveVirtualStockTimestampsMap.set(gId, now);
                    } else if (info.remaining > 0 && info.remaining < currentLive && info.remaining <= maxAllowedGwStock) {
                      // Server snapshot đã ghi nhận lượt giật mã từ thiết bị khác hoặc tiến trình chung
                      this.liveVirtualStockMap.set(gId, info.remaining);
                      this.liveVirtualStockTimestampsMap.set(gId, now);
                      this.notifyStockChanged(gId, info.remaining);
                    } else if (info.remaining > currentLive && info.remaining <= maxAllowedGwStock) {
                      const isServerFreshRestock = hasAutoRestock && info.remaining >= (effectiveThreshold + restockAmount - 2) && currentLive <= (effectiveThreshold + 2);
                      if (isServerFreshRestock) {
                        this.recentRestockTimestampsMap.set(gId, now);
                        this.liveVirtualStockMap.set(gId, info.remaining);
                        this.liveVirtualStockTimestampsMap.set(gId, now);
                        this.notifyStockChanged(gId, info.remaining);
                      }
                    }
                  }
                }
              }
            });
            this.saveHighWaterCounts();
            this.saveLiveFomoCounts();
            this.saveLiveVirtualStock();
          }
        }

        this.notifyStockChanged('*', 0);
        this.notifySoldCountChanged('*', 0);
        this.broadcastCurrentCount();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wcg_virtual_stock_updated', { detail: {} }));
        }
      }
    } catch {}
  }

  public startSnapshotPoller(): void {
    if (typeof window === 'undefined') return;
    if (this.snapshotPollerTimer) {
      clearInterval(this.snapshotPollerTimer);
      this.snapshotPollerTimer = null;
    }

    setTimeout(() => {
      this.fetchMetricsSnapshot();
      this.schedulePeakReport();
    }, 800);

    const intervalSec = Math.max(20, Math.min(60, Number(this.config.syncIntervalSeconds) || 25));
    this.snapshotPollerTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      this.fetchMetricsSnapshot();
      this.applyOfflineCatchUp();
    }, intervalSec * 1000);

    if (typeof document !== 'undefined' && !this.visibilityListenerAttached) {
      this.visibilityListenerAttached = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const savedGlobal = localStorage.getItem('wcg_global_master_copy_count_v1');
          if (savedGlobal) {
            const val = parseInt(savedGlobal, 10);
            if (!isNaN(val) && val > this.globalMasterCopyCount) {
              this.globalMasterCopyCount = val;
              this.dailyMaxCopyCount = val;
              this.broadcastCurrentCount();
            }
          }
          this.fetchMetricsSnapshot();
          this.applyOfflineCatchUp();
        }
      });
    }
  }

  public schedulePeakReport(immediate: boolean = false): void {
    // Permanently disabled in Two-Layer model (Zero client-side peak reporting to server)
    return;
  }

  public async reportPeakMetrics(): Promise<void> {
    // Permanently disabled in Two-Layer model (Zero client-side peak reporting to server)
    return;
  }

  public getTodayDateKey(timestampMs: number = this.getCalibratedNow()): string {
    const vnDate = new Date(timestampMs + 7 * 3600 * 1000);
    return vnDate.toISOString().slice(0, 10);
  }

  private initMasterCopyClicks(): void {
    if (typeof window === 'undefined') return;
    try {
      const today = this.getTodayDateKey();
      this.currentClickDate = today;
      const saved = localStorage.getItem(MARKETING_REAL_CLICKS_KEY);
      if (saved) {
        if (saved.startsWith('{')) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.date === today && typeof parsed.clicks === 'number') {
            this.masterCopyClicks = Math.max(0, parsed.clicks);
          } else {
            this.masterCopyClicks = 0;
            this.saveMasterCopyClicks();
          }
        } else {
          this.masterCopyClicks = 0;
          this.saveMasterCopyClicks();
        }
        this.realClicksOffset = this.masterCopyClicks;
      }
    } catch {}
  }

  private saveMasterCopyClicks(): void {
    if (typeof window !== 'undefined') {
      try {
        const today = this.getTodayDateKey();
        this.currentClickDate = today;
        const payload = { date: today, clicks: this.masterCopyClicks };
        localStorage.setItem(MARKETING_REAL_CLICKS_KEY, JSON.stringify(payload));
      } catch {}
    }
  }

  private initDailyMaxCopyCount(): void {
    if (typeof window === 'undefined') return;
    try {
      const today = this.getTodayDateKey();
      this.dailyMaxCopyDate = today;
      let count = 0;
      const savedGlobal = localStorage.getItem('wcg_global_master_copy_count_v1');
      if (savedGlobal) {
        const val = parseInt(savedGlobal, 10);
        if (!isNaN(val)) count = val;
      }
      if (count < 94558) {
        const savedDaily = localStorage.getItem('wcg_marketing_daily_max_copy_v1');
        if (savedDaily) {
          const parsed = JSON.parse(savedDaily);
          if (parsed && typeof parsed.count === 'number') {
            count = Math.max(count, parsed.count);
          }
        }
      }
      this.globalMasterCopyCount = Math.max(this.globalMasterCopyCount || 94558, 94558, count);
      this.dailyMaxCopyCount = this.globalMasterCopyCount;
      this.saveGlobalMasterCopyCount();
    } catch {}
  }

  public saveGlobalMasterCopyCount(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('wcg_global_master_copy_count_v1', this.globalMasterCopyCount.toString());
      localStorage.setItem('wcg_marketing_daily_max_copy_v1', JSON.stringify({
        date: this.dailyMaxCopyDate || this.getTodayDateKey(),
        count: this.globalMasterCopyCount,
      }));
    } catch {}
  }

  // Alias for backward compatibility
  private saveDailyMaxCopyCount(): void {
    this.saveGlobalMasterCopyCount();
  }

  private initProcessedNotifIds(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(MARKETING_PROCESSED_IDS_KEY) || localStorage.getItem(MARKETING_PROCESSED_IDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => {
            if (typeof id === 'string' && id) this.processedNotifIds.add(id);
          });
        }
      }
    } catch {}
  }

  private initProcessedCopyNotifIds(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem('wcg_processed_copy_ids_v1') || localStorage.getItem('wcg_processed_copy_ids_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => {
            if (typeof id === 'string' && id) this.processedCopyNotifIds.add(id);
          });
        }
      }
    } catch {}
  }

  public markNotificationProcessed(notifId: string, slotIndex?: number): void {
    if (!notifId) return;
    this.processedNotifIds.add(notifId);
    if (this.processedNotifIds.size > 500) {
      const arr = Array.from(this.processedNotifIds);
      this.processedNotifIds = new Set(arr.slice(arr.length - 250));
    }
    if (typeof window !== 'undefined') {
      try {
        const arr = Array.from(this.processedNotifIds);
        sessionStorage.setItem(MARKETING_PROCESSED_IDS_KEY, JSON.stringify(arr));
        localStorage.setItem(MARKETING_PROCESSED_IDS_KEY, JSON.stringify(arr));
      } catch {}
    }

    // Đồng bộ đa tab: Broadcast để các tab khác trên cùng trình duyệt không bao giờ hiển thị lại ID này
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'NOTIF_PROCESSED_BROADCAST',
          payload: { notifId, slotIndex },
        });
      } catch {}
    }
  }

  public isNotificationProcessed(notifId: string): boolean {
    if (!notifId) return false;
    if (this.processedNotifIds.has(notifId)) return true;
    // Fallback: kiểm tra trong localStorage phòng trường hợp tab khác vừa xử lý
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(MARKETING_PROCESSED_IDS_KEY);
        if (saved && saved.includes(notifId)) {
          this.processedNotifIds.add(notifId);
          return true;
        }
      } catch {}
    }
    return false;
  }

  public removeSlotEvent(notifId: string): void {
    if (!notifId) return;
    for (const [slot, evt] of this.slotEventsMap.entries()) {
      if (evt && evt.id === notifId) {
        this.slotEventsMap.delete(slot);
      }
    }
    this.serverLedgerEventQueue = this.serverLedgerEventQueue.filter((e) => e && e.id !== notifId);
    this.recentRealEvents = this.recentRealEvents.filter((e) => e && e.id !== notifId);
  }

  /**
   * Quản lý chống spam thông báo sao chép: 20 giây tối đa 1 thông báo cho mỗi người dùng.
   * Khóa định danh = maskedUserName + actionType (bảo mật PII, chỉ dùng tên đã che).
   */
  public canDisplayActionNotification(maskedUserName: string, actionType: string = 'COPY_CODE', cooldownMs: number = 20000): boolean {
    if (actionType !== 'COPY_CODE') return true;
    const safeUser = (maskedUserName || 'Khách').trim();
    const key = `${safeUser}_${actionType}`;
    const now = this.getCalibratedNow();
    const lastTime = this.userActionCooldownMap.get(key) || 0;
    if (now - lastTime < cooldownMs) {
      return false; // Đang trong cửa sổ 20 giây -> Chặn hiển thị thông báo mới
    }
    return true;
  }

  public recordActionNotificationDisplayed(maskedUserName: string, actionType: string = 'COPY_CODE'): void {
    const safeUser = (maskedUserName || 'Khách').trim();
    const key = `${safeUser}_${actionType}`;
    const now = this.getCalibratedNow();
    this.userActionCooldownMap.set(key, now);

    // Đồng bộ sang các tab khác trên cùng trình duyệt qua BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'USER_ACTION_COOLDOWN_BROADCAST',
          payload: { key, timestamp: now },
        });
      } catch {}
    }
  }

  private initBroadcastChannel(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      this.broadcastChannel = new BroadcastChannel('wcg_marketing_real_events');
      this.broadcastChannel.onmessage = (event) => {
        if (!event || !event.data) return;
        const { type, payload } = event.data;
        if (type === 'NOTIF_PROCESSED_BROADCAST' && payload) {
          if (payload.notifId) {
            this.processedNotifIds.add(payload.notifId);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('wcg_notif_processed', { detail: payload }));
            }
          }
        } else if (type === 'USER_ACTION_COOLDOWN_BROADCAST' && payload) {
          if (payload.key && typeof payload.timestamp === 'number') {
            this.userActionCooldownMap.set(payload.key, payload.timestamp);
          }
        } else if (type === 'REAL_EVENT_BROADCAST' && payload) {
          this.handleIncomingRealEvent(payload, false);
        } else if (type === 'REAL_EVENT_SCHEDULED' && payload) {
          const match = this.recentRealEvents.find((e) => e && e.id === payload.id);
          if (match && payload.scheduledFireTime) {
            match.scheduledFireTime = payload.scheduledFireTime;
            this.sortAndPruneRealEventQueue();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('wcg_new_real_events_available'));
            }
          }
        } else if (type === 'COPY_INCREMENT_BROADCAST' && payload) {
          const total = Number(payload.totalCount) || Number(payload.totalRealClicks) || 0;
          if (total > this.globalMasterCopyCount) {
            this.globalMasterCopyCount = total;
            this.dailyMaxCopyCount = total;
            this.saveGlobalMasterCopyCount();
            this.broadcastCurrentCount();
          }
        } else if (type === 'STATS_SYNC_BROADCAST' && payload) {
          if (payload.productId && typeof payload.totalSold === 'number') {
            this.realProductSoldCountsMap.set(payload.productId, payload.totalSold);
            this.notifySoldCountChanged(payload.productId, payload.totalSold);
          }
          if (payload.giveawayId && typeof payload.totalClaimed === 'number') {
            this.realGiveawayClaimedCountsMap.set(payload.giveawayId, payload.totalClaimed);
            this.notifySoldCountChanged(payload.giveawayId, payload.totalClaimed);
          }
        } else if (type === 'VIRTUAL_STOCK_DECREMENT' && payload) {
          if (payload.productId && typeof payload.newStock === 'number') {
            if (payload.notifId) this.processedStockNotifIds.add(payload.notifId);
            const cur = this.liveVirtualStockMap.get(payload.productId);
            if (cur !== undefined && payload.newStock > cur) {
              this.recentRestockTimestampsMap.set(payload.productId, Date.now());
            }
            this.liveVirtualStockMap.set(payload.productId, payload.newStock);
            this.saveLiveVirtualStock();
            this.notifyStockChanged(payload.productId, payload.newStock);
          }
        } else if (type === 'FOMO_SOLD_INCREMENT' && payload) {
          if (payload.productId && typeof payload.totalFomoSold === 'number') {
            if (payload.notifId) this.processedStockNotifIds.add(`sold_${payload.notifId}`);
            this.liveFomoSoldCountMap.set(payload.productId, payload.totalFomoSold);
            this.saveLiveFomoCounts();
            const curHigh = this.highWaterSoldCountMap.get(payload.productId) || 0;
            if (payload.totalFomoSold > curHigh) {
              this.highWaterSoldCountMap.set(payload.productId, payload.totalFomoSold);
              this.saveHighWaterCounts();
            }
            this.notifySoldCountChanged(payload.productId, this.getSoldDisplay({ id: payload.productId }));
          }
        } else if (type === 'FOMO_CLAIMED_INCREMENT' && payload) {
          if (payload.campaignId && typeof payload.totalFomoClaimed === 'number') {
            if (payload.notifId) this.processedStockNotifIds.add(`gw_${payload.notifId}`);
            this.liveFomoClaimedCountMap.set(payload.campaignId, payload.totalFomoClaimed);
            this.saveLiveFomoCounts();
            const curHigh = this.highWaterClaimedCountMap.get(payload.campaignId) || 0;
            if (payload.totalFomoClaimed > curHigh) {
              this.highWaterClaimedCountMap.set(payload.campaignId, payload.totalFomoClaimed);
              this.saveHighWaterCounts();
            }
            this.notifySoldCountChanged(payload.campaignId, this.getClaimedDisplay({ id: payload.campaignId }));
          }
        } else if (type === 'FOMO_SOLD_RESET' && payload) {
          if (payload.productId && typeof payload.targetDisplay === 'number') {
            this.highWaterSoldCountMap.set(payload.productId, payload.targetDisplay);
            this.liveFomoSoldCountMap.set(payload.productId, Math.max(0, payload.virtualCount || 0));
            this.saveHighWaterCounts();
            this.saveLiveFomoCounts();
            this.sessionAnchorMap.set(payload.productId, { lastCount: payload.targetDisplay, lastTimestamp: Date.now() });
            this.notifySoldCountChanged(payload.productId, payload.targetDisplay);
          }
        } else if (type === 'FOMO_CLAIMED_RESET' && payload) {
          if (payload.campaignId && typeof payload.targetDisplay === 'number') {
            this.highWaterClaimedCountMap.set(payload.campaignId, payload.targetDisplay);
            this.liveFomoClaimedCountMap.set(payload.campaignId, Math.max(0, payload.virtualCount || 0));
            this.saveHighWaterCounts();
            this.saveLiveFomoCounts();
            this.sessionAnchorMap.set(payload.campaignId, { lastCount: payload.targetDisplay, lastTimestamp: Date.now() });
            this.notifySoldCountChanged(payload.campaignId, payload.targetDisplay);
          }
        }
      };
    } catch {}
  }

  private initLiveVirtualStock(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(MARKETING_VIRTUAL_STOCK_KEY) || localStorage.getItem(MARKETING_VIRTUAL_STOCK_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'number' && !isNaN(v)) {
              const pw = this.getProductConfig(k);
              const realStock = this.getRealStockFor(k);
              if (realStock <= 0) {
                this.liveVirtualStockMap.set(k, 0);
              } else {
                const rawThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
                const restockAmount = Math.max(1, Number(pw.autoRestockAmount) || 20);
                const effectiveThreshold = (realStock > 0 && rawThreshold < realStock)
                  ? realStock
                  : rawThreshold;
                const maxAllowed = (pw.priority === 'off' || !pw.virtualStockBonus || pw.virtualStockBonus <= 0)
                  ? realStock
                  : Math.max(realStock + Number(pw.virtualStockBonus || 0), effectiveThreshold + restockAmount);
                const healed = Math.min(Math.max(1, v), maxAllowed);
                this.liveVirtualStockMap.set(k, healed);
              }
            }
          });
        }
      }
    } catch {}
  }

  private saveLiveVirtualStock(): void {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, number> = {};
      this.liveVirtualStockMap.forEach((v, k) => {
        if (typeof v === 'number' && !isNaN(v)) {
          obj[k] = v;
        }
      });
      sessionStorage.setItem(MARKETING_VIRTUAL_STOCK_KEY, JSON.stringify(obj));
      localStorage.setItem(MARKETING_VIRTUAL_STOCK_KEY, JSON.stringify(obj));
    } catch {}
  }

  private initLiveFomoCounts(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedSold = localStorage.getItem(MARKETING_FOMO_SOLD_KEY);
      if (savedSold) {
        const parsed = JSON.parse(savedSold);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'number' && !isNaN(v)) {
              this.liveFomoSoldCountMap.set(k, v);
            }
          });
        }
      }
      const savedClaimed = localStorage.getItem(MARKETING_FOMO_CLAIMED_KEY);
      if (savedClaimed) {
        const parsed = JSON.parse(savedClaimed);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'number' && !isNaN(v)) {
              this.liveFomoClaimedCountMap.set(k, v);
            }
          });
        }
      }
    } catch {}
  }

  private saveLiveFomoCounts(): void {
    if (typeof window === 'undefined') return;
    try {
      const soldObj: Record<string, number> = {};
      this.liveFomoSoldCountMap.forEach((val, key) => {
        soldObj[key] = val;
      });
      localStorage.setItem(MARKETING_FOMO_SOLD_KEY, JSON.stringify(soldObj));

      const claimedObj: Record<string, number> = {};
      this.liveFomoClaimedCountMap.forEach((val, key) => {
        claimedObj[key] = val;
      });
      localStorage.setItem(MARKETING_FOMO_CLAIMED_KEY, JSON.stringify(claimedObj));
    } catch {}
  }

  private initHighWaterCounts(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedSold = localStorage.getItem(MARKETING_HIGH_WATER_SOLD_KEY);
      if (savedSold) {
        const parsed = JSON.parse(savedSold);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'number' && !isNaN(v)) {
              this.highWaterSoldCountMap.set(k, v);
            }
          });
        }
      }
      const savedClaimed = localStorage.getItem(MARKETING_HIGH_WATER_CLAIMED_KEY);
      if (savedClaimed) {
        const parsed = JSON.parse(savedClaimed);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'number' && !isNaN(v)) {
              this.highWaterClaimedCountMap.set(k, v);
            }
          });
        }
      }
    } catch {}
  }

  private saveHighWaterCounts(immediate: boolean = false): void {
    if (typeof window === 'undefined') return;
    const persist = () => {
      try {
        const soldObj: Record<string, number> = {};
        this.highWaterSoldCountMap.forEach((val, key) => {
          soldObj[key] = val;
        });
        localStorage.setItem(MARKETING_HIGH_WATER_SOLD_KEY, JSON.stringify(soldObj));

        const claimedObj: Record<string, number> = {};
        this.highWaterClaimedCountMap.forEach((val, key) => {
          claimedObj[key] = val;
        });
        localStorage.setItem(MARKETING_HIGH_WATER_CLAIMED_KEY, JSON.stringify(claimedObj));
      } catch {}
    };

    if (immediate) {
      if (this.saveHighWaterTimer) {
        clearTimeout(this.saveHighWaterTimer);
        this.saveHighWaterTimer = null;
      }
      persist();
      return;
    }

    if (this.saveHighWaterTimer) return;
    this.saveHighWaterTimer = setTimeout(() => {
      this.saveHighWaterTimer = null;
      persist();
    }, 50);
  }

  private initAdminOverrides(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedClaimed = localStorage.getItem(MARKETING_ADMIN_OVERRIDE_CLAIMED_KEY);
      if (savedClaimed) {
        const parsed = JSON.parse(savedClaimed);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'number' && !isNaN(v)) {
              this.adminOverrideClaimedMap.set(k, v);
            }
          });
        }
      }
      const savedSold = localStorage.getItem(MARKETING_ADMIN_OVERRIDE_SOLD_KEY);
      if (savedSold) {
        const parsed = JSON.parse(savedSold);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'number' && !isNaN(v)) {
              this.adminOverrideSoldMap.set(k, v);
            }
          });
        }
      }
    } catch {}
  }

  private saveAdminOverrides(): void {
    if (typeof window === 'undefined') return;
    try {
      const claimedObj: Record<string, number> = {};
      this.adminOverrideClaimedMap.forEach((val, key) => {
        claimedObj[key] = val;
      });
      localStorage.setItem(MARKETING_ADMIN_OVERRIDE_CLAIMED_KEY, JSON.stringify(claimedObj));

      const soldObj: Record<string, number> = {};
      this.adminOverrideSoldMap.forEach((val, key) => {
        soldObj[key] = val;
      });
      localStorage.setItem(MARKETING_ADMIN_OVERRIDE_SOLD_KEY, JSON.stringify(soldObj));
    } catch {}
  }

  // --- Session Anchor & Offline Catch-Up Engine ---
  public ensureSessionAnchorsSeeded(): void {
    if (typeof window === 'undefined') return;
    try {
      const now = this.getCalibratedNow();
      let changed = false;

      // 1. Seed store products & utilities
      const spRaw = localStorage.getItem('wcg_admin_store_products_v4') || localStorage.getItem('wcg_store_products_v4');
      if (spRaw) {
        try {
          const spList = JSON.parse(spRaw);
          if (Array.isArray(spList)) {
            spList.forEach((p: any) => {
              if (p && p.id && !this.sessionAnchorMap.has(p.id)) {
                const base = (Number(p.sold_count) || 0) + (Number(p.virtual_sold_count) || 0);
                this.sessionAnchorMap.set(p.id, { lastCount: base, lastTimestamp: now });
                changed = true;
              }
            });
          }
        } catch {}
      }

      const utRaw = localStorage.getItem('wcg_admin_utilities_v4') || localStorage.getItem('wcg_utilities_v4');
      if (utRaw) {
        try {
          const utList = JSON.parse(utRaw);
          if (Array.isArray(utList)) {
            utList.forEach((u: any) => {
              if (u && u.id && !this.sessionAnchorMap.has(u.id)) {
                const base = (Number(u.sold_count) || 0) + (Number(u.virtual_sold_count) || 0);
                this.sessionAnchorMap.set(u.id, { lastCount: base, lastTimestamp: now });
                changed = true;
              }
            });
          }
        } catch {}
      }

      // 2. Seed giveaways
      const gwRaw = localStorage.getItem('wcg_admin_giveaways_v4') || localStorage.getItem('wcg_giveaways_v4');
      if (gwRaw) {
        try {
          const gwList = JSON.parse(gwRaw);
          if (Array.isArray(gwList)) {
            gwList.forEach((g: any) => {
              if (g && g.id && !this.sessionAnchorMap.has(g.id)) {
                const base = (Number(g.claimed_codes) || 0) + (Number(g.virtual_claimed_offset) || 0);
                this.sessionAnchorMap.set(g.id, { lastCount: base, lastTimestamp: now });
                changed = true;
              }
            });
          }
        } catch {}
      }

      if (changed) {
        this.saveSessionAnchor();
      }
    } catch {}
  }

  private initSessionAnchor(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(MARKETING_FOMO_SESSION_ANCHOR_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]: [string, any]) => {
            if (v && typeof v.lastCount === 'number' && typeof v.lastTimestamp === 'number') {
              this.sessionAnchorMap.set(k, {
                lastCount: Number(v.lastCount) || 0,
                lastTimestamp: Number(v.lastTimestamp) || 0,
              });
            }
          });
        }
      }
      // Khởi tạo các mốc còn thiếu từ highWater counts
      const now = this.getCalibratedNow();
      this.highWaterSoldCountMap.forEach((count, id) => {
        if (!this.sessionAnchorMap.has(id)) {
          this.sessionAnchorMap.set(id, { lastCount: count, lastTimestamp: now });
        }
      });
      this.highWaterClaimedCountMap.forEach((count, id) => {
        if (!this.sessionAnchorMap.has(id)) {
          this.sessionAnchorMap.set(id, { lastCount: count, lastTimestamp: now });
        }
      });
      // Tự động seed cho toàn bộ catalog nếu chưa có trong sessionAnchorMap
      this.ensureSessionAnchorsSeeded();
    } catch {}
  }

  private saveSessionAnchor(): void {
    if (typeof window === 'undefined') return;
    if (this.saveSessionAnchorTimer) return;
    this.saveSessionAnchorTimer = setTimeout(() => {
      this.saveSessionAnchorTimer = null;
      this.flushSessionAnchor();
    }, 300);
  }

  public saveSessionAnchors(): void {
    this.saveSessionAnchor();
  }

  public flushSessionAnchor(): void {
    if (typeof window === 'undefined') return;
    try {
      const now = this.getCalibratedNow();
      const obj: Record<string, { lastCount: number; lastTimestamp: number }> = {};
      this.sessionAnchorMap.forEach((val, key) => {
        obj[key] = {
          lastCount: val.lastCount,
          lastTimestamp: Math.max(val.lastTimestamp, now),
        };
      });
      localStorage.setItem(MARKETING_FOMO_SESSION_ANCHOR_KEY, JSON.stringify(obj));
    } catch {}
  }

  private updateSessionAnchor(id: string, count: number): void {
    if (!id || typeof count !== 'number' || isNaN(count)) return;
    const now = this.getCalibratedNow();
    const existing = this.sessionAnchorMap.get(id);
    if (!existing || count > existing.lastCount) {
      this.sessionAnchorMap.set(id, {
        lastCount: count,
        lastTimestamp: now,
      });
      this.saveSessionAnchor();
    }
  }

  /**
   * Giải pháp 1: Lấy mốc đã lưu làm Điểm tựa + Tự động cộng thêm thời gian ngoại tuyến.
   * Khắc phục triệt để việc mở lại web số bị đứng im do kẹt high-water mark của phiên trước.
   */
  public applyOfflineCatchUp(): void {
    if (typeof window === 'undefined') return;
    // Theo yêu cầu chủ sở hữu: Số đã bán cố định theo cấu hình kho,
    // chỉ tăng đều đúng +1 đơn vị khi có thông báo nổ ra,
    // ngắt hoàn toàn việc tự động cộng dồn số ảo theo thời gian ngoại tuyến.
    return;
    const catchUp = this.config.offlineCatchUp || DEFAULT_OFFLINE_CATCHUP_CONFIG;
    if (!catchUp.enabled) return;

    // Khi chọn 'server_only', chỉ điều chỉnh bộ đếm toàn máy chủ, không can thiệp bộ nhớ đệm cục bộ
    if (catchUp.scope === 'server_only') {
      return;
    }

    this.ensureSessionAnchorsSeeded();

    const now = this.getCalibratedNow();
    let anyChanged = false;

    this.sessionAnchorMap.forEach((anchor, id) => {
      if (!anchor || anchor.lastTimestamp <= 0) return;
      const elapsedMs = Math.max(0, now - anchor.lastTimestamp);
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      if (elapsedMinutes < 1) return;

      const pw = this.getProductConfig(id);
      if (pw.priority === 'off') return;

      // Chỉ áp dụng bù ngoại tuyến khi mục này thực sự có cấu hình số lượng ảo > 0 hoặc admin override
      if (id.startsWith('gw_')) {
        const gwDetails = this.findGiveawayDetails(id);
        const virtualOffset = gwDetails?.virtual_claimed_offset ?? 0;
        if (virtualOffset <= 0 && !this.adminOverrideClaimedMap.has(id)) return;
      } else {
        const prodDetails = this.findItemDetails(id);
        const virtualSold = (prodDetails as any)?.virtual_sold_count ?? 0;
        if (virtualSold <= 0 && !this.adminOverrideSoldMap.has(id)) return;
      }

      const realStock = this.getRealStockFor(id);
      const isOos = realStock <= 0;
      if (isOos && !catchUp.outOfStockEnabled) return;

      let unitsToAdd = 0;
      if (catchUp.mode === 'custom') {
        const interval = Math.max(1, Number(catchUp.intervalMinutes) || 15);
        const step = Math.max(1, Number(catchUp.incrementStep) || 1);
        unitsToAdd = Math.floor(elapsedMinutes / interval) * step;
      } else {
        // 'auto' mode: Tăng đều theo các thiết lập đã cài (mức ưu tiên + giờ cao điểm)
        let rateMinutes = pw.priority === 'high' ? 10 : pw.priority === 'low' ? 35 : 18;
        if (this.isPeakHourAt(now)) {
          const mult = Math.max(1, Number(this.config.peakHours?.multiplier) || 2.0);
          rateMinutes = Math.max(4, Math.round(rateMinutes / mult));
        }
        unitsToAdd = Math.floor(elapsedMinutes / rateMinutes);
      }

      const maxCap = isOos && catchUp.outOfStockEnabled
        ? Math.max(1, Number(catchUp.outOfStockMaxUnits) || 70)
        : Math.max(1, Number(catchUp.maxCatchUpUnits) || 70);
      unitsToAdd = Math.min(unitsToAdd, maxCap);

      if (unitsToAdd > 0) {
        if (id.startsWith('gw_')) {
          const currentClaimed = this.highWaterClaimedCountMap.get(id) || anchor.lastCount;
          const newTarget = Math.max(currentClaimed, anchor.lastCount + unitsToAdd);
          this.highWaterClaimedCountMap.set(id, newTarget);
          this.sessionAnchorMap.set(id, {
            lastCount: newTarget,
            lastTimestamp: now,
          });
        } else {
          const currentHighSold = this.highWaterSoldCountMap.get(id) || anchor.lastCount;
          const newTarget = Math.max(currentHighSold, anchor.lastCount + unitsToAdd);
          this.highWaterSoldCountMap.set(id, newTarget);
          this.sessionAnchorMap.set(id, {
            lastCount: newTarget,
            lastTimestamp: now,
          });

          // TỒN KHO ẢO ĐỒNG BỘ 1 - 1 KHI OFFLINE:
          // Cứ mỗi đơn bán bù ngoại tuyến, giảm tồn kho ảo đi đúng unitsToAdd đơn vị tương ứng (có tự động bù kho nếu chạm đáy):
          if (realStock > 0 && pw.virtualStockBonus && pw.virtualStockBonus > 0 && pw.priority !== 'off') {
            this.decrementProductStock(id, unitsToAdd, `offline_catchup_${id}_${now}`);
          }
        }
        anyChanged = true;
      }
    });

    if (anyChanged) {
      this.saveHighWaterCounts();
      this.saveSessionAnchor();
      this.notifySoldCountChanged('*', 0);
      this.notifyStockChanged('*', 0);
      this.schedulePeakReport();
    }
  }

  private initHourlyServerStats(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(MARKETING_HOURLY_SERVER_STATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.products === 'object') {
          Object.entries(parsed.products).forEach(([k, v]: [string, any]) => {
            this.hourlyServerStatsMap.set(k, v);
            if (v && typeof v.totalSold === 'number') {
              const cur = this.highWaterSoldCountMap.get(k) || 0;
              if (v.totalSold > cur) this.highWaterSoldCountMap.set(k, v.totalSold);
            }
          });
        }
        if (parsed && typeof parsed.giveaways === 'object') {
          Object.entries(parsed.giveaways).forEach(([k, v]: [string, any]) => {
            if (v && typeof v.totalClaimed === 'number') {
              const cur = this.highWaterClaimedCountMap.get(k) || 0;
              // BẢNG ADMIN LÀ CHÂN LÝ: Hạ đỉnh nếu bị phình to
              if (cur > v.totalClaimed + 5 || v.totalClaimed > cur) {
                this.highWaterClaimedCountMap.set(k, v.totalClaimed);
              }
            }
          });
        }
      }
    } catch {}
  }

  public startHourlySyncEngine(): void {
    if (typeof window === 'undefined') return;
    if (this.hourlySyncTimer) clearInterval(this.hourlySyncTimer);

    const checkAndSync = async () => {
      const lastSync = Number(localStorage.getItem(MARKETING_LAST_HOURLY_SYNC_KEY)) || 0;
      const now = Date.now();
      if (now - lastSync >= this.ONE_HOUR_MS) {
        await this.performHourlySync();
      }
    };

    // Run initial check shortly after app load
    setTimeout(checkAndSync, 2000);

    // Periodic check every 60 seconds
    this.hourlySyncTimer = setInterval(checkAndSync, 60000);
  }

  public async performHourlySync(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (!res.ok) return;
      const data: any = await res.json();

      if (data && typeof data.server_time === 'number') {
        this.calibrateServerTime(data.server_time);
      }

      if (data && data.hourly_fomo_stats) {
        const hStats = data.hourly_fomo_stats;
        if (hStats.products && typeof hStats.products === 'object') {
          Object.entries(hStats.products).forEach(([pId, info]: [string, any]) => {
            if (info && typeof info.totalSold === 'number') {
              this.hourlyServerStatsMap.set(pId, info);
              const cur = this.highWaterSoldCountMap.get(pId) || 0;
              if (info.totalSold > cur) this.highWaterSoldCountMap.set(pId, info.totalSold);
            }
          });
        }
        if (hStats.giveaways && typeof hStats.giveaways === 'object') {
          Object.entries(hStats.giveaways).forEach(([gId, info]: [string, any]) => {
            if (info && typeof info.totalClaimed === 'number') {
              this.hourlyServerStatsMap.set(gId, info);
              // BẢNG ADMIN LÀ CHÂN LÝ: Cập nhật chính xác số từ server, thanh lọc đỉnh rác cũ nếu bị phình to
              const cur = this.highWaterClaimedCountMap.get(gId) || 0;
              if (cur > info.totalClaimed + 5 || info.totalClaimed > cur) {
                this.highWaterClaimedCountMap.set(gId, info.totalClaimed);
              }
            }
          });
        }

        const serialized = {
          products: Object.fromEntries(this.hourlyServerStatsMap),
          timestamp: Date.now(),
        };
        localStorage.setItem(MARKETING_HOURLY_SERVER_STATS_KEY, JSON.stringify(serialized));
      }

      const today = this.getTodayDateKey();
      if (this.currentClickDate && this.currentClickDate !== today) {
        this.masterCopyClicks = 0;
        this.currentClickDate = today;
        this.saveMasterCopyClicks();
      }
      const serverDate = data.master_copy_clicks_date || data.masterCopyClicksDate;
      const isDateValid = !serverDate || serverDate === today;
      if (isDateValid && typeof data.master_copy_clicks === 'number' && !isNaN(data.master_copy_clicks)) {
        if (data.master_copy_clicks > this.masterCopyClicks) {
          this.masterCopyClicks = data.master_copy_clicks;
          this.realClicksOffset = data.master_copy_clicks;
          this.saveMasterCopyClicks();
        }
        if (data.master_copy_clicks > this.globalMasterCopyCount) {
          this.globalMasterCopyCount = data.master_copy_clicks;
          this.dailyMaxCopyCount = data.master_copy_clicks;
          this.saveGlobalMasterCopyCount();
          this.broadcastCurrentCount();
        }
      }
      if (data.real_product_sold_counts && typeof data.real_product_sold_counts === 'object') {
        Object.entries(data.real_product_sold_counts).forEach(([k, v]) => {
          if (typeof v === 'number') this.realProductSoldCountsMap.set(k, v);
        });
      }
      if (data.real_giveaway_claimed_counts && typeof data.real_giveaway_claimed_counts === 'object') {
        Object.entries(data.real_giveaway_claimed_counts).forEach(([k, v]) => {
          if (typeof v === 'number') this.realGiveawayClaimedCountsMap.set(k, v);
        });
      }
      if (data.peak_product_sold_counts && typeof data.peak_product_sold_counts === 'object') {
        let pChanged = false;
        Object.entries(data.peak_product_sold_counts).forEach(([k, v]) => {
          if (this.adminOverrideSoldMap.has(k)) {
            // Keep admin target intact
            return;
          }
          if (typeof v === 'number' && !isNaN(v) && v > 0) {
            const cur = this.highWaterSoldCountMap.get(k) || 0;
            if (v > cur) {
              this.highWaterSoldCountMap.set(k, v);
              pChanged = true;
            }
          }
        });
        if (pChanged) this.saveHighWaterCounts();
      }
      if (data.peak_giveaway_claimed_counts && typeof data.peak_giveaway_claimed_counts === 'object') {
        let gChanged = false;
        Object.entries(data.peak_giveaway_claimed_counts).forEach(([k, v]) => {
          if (this.adminOverrideClaimedMap.has(k)) {
            // Keep admin target intact
            return;
          }
          if (typeof v === 'number' && !isNaN(v) && v > 0) {
            const cur = this.highWaterClaimedCountMap.get(k) || 0;
            // BẢNG ADMIN LÀ CHÂN LÝ: Hạ đỉnh nếu đỉnh cũ đang bị phình to
            if (cur > v + 5 || v > cur) {
              this.highWaterClaimedCountMap.set(k, v);
              gChanged = true;
            }
          }
        });
        if (gChanged) this.saveHighWaterCounts();
      }

      localStorage.setItem(MARKETING_LAST_HOURLY_SYNC_KEY, String(Date.now()));
      this.notifySoldCountChanged('*', 0);
    } catch {}
  }

  // --- Layer 3: CDN Edge Cached Realtime Events Poller ---
  public startRealtimeEventsPoller(): void {
    if (typeof window === 'undefined') return;
    if (this.isPollerRunning) return;
    this.isPollerRunning = true;

    const poll = async () => {
      if (!this.config.isEnabled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Pause polling when browser tab is hidden to save client & network resources
      }

      try {
        const res = await fetch(`/api/realtime-events?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data: any = await res.json();
          if (data && data.success) {
            if (typeof data.server_time === 'number') {
              this.calibrateServerTime(data.server_time);
            }
            this.syncFromHub(
              data.events,
              data.master_copy_clicks,
              data.real_product_sold_counts,
              data.real_giveaway_claimed_counts,
              data.master_copy_clicks_date,
              data.counters,
              data.peak_product_sold_counts,
              data.peak_giveaway_claimed_counts,
              data.lowest_product_stock,
              data.lowest_giveaway_remaining
            );
          }
        }
      } catch {}
    };

    // Khởi tạo poll đầu tiên ngay khi mở trang để hiệu chuẩn giờ và tải dữ liệu tức thì
    setTimeout(poll, 300);

    // Bộ hỏi dữ liệu đồng bộ theo nhịp khe (Slot Clock Poller Engine)
    // Mỗi khe hỏi 1 lần vào khoảng giây 0.65 sau điểm bắt đầu khe để sự kiện có sẵn trước giây nổ 1.5s
    const scheduleNextSlotPoll = () => {
      if (!this.isPollerRunning) return;
      if (this.realtimePollerTimer) {
        clearTimeout(this.realtimePollerTimer);
        this.realtimePollerTimer = null;
      }

      const calibratedNow = this.getCalibratedNow();
      const { dayStartMs, currentSlotIndex } = this.getVnDayAnchor(calibratedNow);
      const slotStartMs = dayStartMs + currentSlotIndex * SLOT_DURATION_MS;
      // Mục tiêu: hỏi vào giây 0.65 của khe (trước giây 1.5 nổ toast)
      const currentSlotPollTargetMs = slotStartMs + 650;

      let waitMs = 0;
      if (calibratedNow < currentSlotPollTargetMs) {
        waitMs = Math.max(50, currentSlotPollTargetMs - calibratedNow);
      } else {
        const nextSlotStartMs = dayStartMs + (currentSlotIndex + 1) * SLOT_DURATION_MS;
        waitMs = Math.max(50, (nextSlotStartMs + 650) - calibratedNow);
      }

      this.realtimePollerTimer = setTimeout(async () => {
        await poll();
        if (this.isPollerRunning) {
          scheduleNextSlotPoll();
        }
      }, waitMs);
    };

    // Bắt đầu lập lịch hỏi theo khe sau khi poll đầu tiên khởi chạy
    setTimeout(scheduleNextSlotPoll, 800);

    // Hỏi bù ngay lập tức khi tab quay lại hiển thị (Visibility Change)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          poll().then(() => {
            if (this.isPollerRunning) {
              scheduleNextSlotPoll();
            }
          });
        }
      });
    }
  }

  public setInitialSyncCompleted(completed: boolean = true): void {
    this.initialSyncCompleted = completed;
  }

  public isInitialSyncCompleted(): boolean {
    return this.initialSyncCompleted;
  }

  // --- Clock Calibration ---
  public calibrateServerTime(serverTimestampMs: number): void {
    if (typeof serverTimestampMs === 'number' && !isNaN(serverTimestampMs) && serverTimestampMs > 0) {
      this.serverTimeOffset = serverTimestampMs - Date.now();
    }
  }

  public getCalibratedNow(): number {
    return Date.now() + this.serverTimeOffset;
  }

  public isPeakHourAt(timestampMs: number = this.getCalibratedNow()): boolean {
    if (!this.config.peakHours?.enabled) return false;
    try {
      // Calibrate to Vietnam Time (UTC+7)
      const vnDate = new Date(timestampMs + 7 * 3600 * 1000);
      const currentMinutes = vnDate.getUTCHours() * 60 + vnDate.getUTCMinutes();
      const [startH, startM] = (this.config.peakHours.startTime || '19:00').split(':').map(Number);
      const [endH, endM] = (this.config.peakHours.endTime || '23:30').split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch {
      return false;
    }
  }

  public isCurrentPeakHour(): boolean {
    return this.isPeakHourAt(this.getCalibratedNow());
  }

  public getSlotDurationMs(timestampMs: number = this.getCalibratedNow()): number {
    const minSec = Math.max(20, Number(this.config.intervalMin) || 25);
    const maxSec = Math.max(minSec, Number(this.config.intervalMax) || 45);
    let baseSec = Math.round((minSec + maxSec) / 2);

    if (this.isPeakHourAt(timestampMs)) {
      const multiplier = Math.max(1, Math.min(1.3, Number(this.config.peakHours?.multiplier) || 1.15));
      baseSec = Math.max(22, Math.round(baseSec / multiplier));
    }
    return Math.max(22, baseSec) * 1000;
  }

  public getNextIntervalMs(): number {
    return this.getSlotDurationMs(this.getCalibratedNow());
  }

  // --- Real Click Offset for Global Counter ---
  private initRealClicks(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(MARKETING_REAL_CLICKS_KEY);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) this.realClicksOffset = val;
      }
    } catch {}
  }

  private startGlobalCounterTicker(): void {
    if (typeof window === 'undefined') return;
    // Periodic ticker (every 3.5s) to update hero banner smoothly
    setInterval(() => {
      const current = this.getLiveCopyCount();
      if (current !== this.lastBroadcastCount) {
        this.lastBroadcastCount = current;
        this.counterListeners.forEach((cb) => {
          try { cb(current); } catch {}
        });
      }
    }, 3500);
  }

  public recordToastFiredTime(): void {
    this.lastToastFiredTime = this.getCalibratedNow();
  }

  /**
   * @deprecated Zero callers in live flow.
   * Giữ lại làm fallback/tương thích ngược và phục vụ nút bấm "Bắn thử thông báo" từ Admin UI.
   * Trong luồng tự động của khách hàng, số liệu được điều khiển hoàn toàn bởi Server SSOT Ledger.
   */
  public recordVirtualSale(productId: string, notifId?: string): { stock: number; sold: number } {
    if (this.serverProductCounters.has(productId)) {
      const p = this.serverProductCounters.get(productId)!;
      return { stock: p.stock, sold: p.sold };
    }
    const stock = this.decrementProductStock(productId, 1, notifId);
    const sold = this.incrementLiveSoldCount(productId, 1, notifId);
    return { stock, sold };
  }

  /**
   * @deprecated Zero callers in live flow.
   * Giữ lại làm fallback/tương thích ngược và phục vụ nút bấm "Bắn thử thông báo" từ Admin UI.
   * Trong luồng tự động của khách hàng, số liệu được điều khiển hoàn toàn bởi Server SSOT Ledger.
   */
  public recordVirtualGiveawayClaim(campaignId: string, notifId?: string): { remaining: number; claimed: number } {
    if (this.serverGiveawayCounters.has(campaignId)) {
      const g = this.serverGiveawayCounters.get(campaignId)!;
      return { remaining: g.remaining, claimed: g.claimed };
    }
    const remaining = this.decrementProductStock(campaignId, 1, notifId);
    const claimed = this.incrementLiveClaimedCount(campaignId, 1, notifId);
    return { remaining, claimed };
  }

  // --- Unified Global Copy Counter (TỔNG CHUNG TOÀN WEB - Mốc khởi điểm 94.558, không reset 0h) ---
  public getLiveCopyCount(timestampMs: number = this.getCalibratedNow()): number {
    return Math.max(94558, this.globalMasterCopyCount);
  }

  public getLiveCounter(): number {
    return this.getLiveCopyCount();
  }

  public broadcastCurrentCount(): void {
    const current = this.getLiveCopyCount();
    this.lastBroadcastCount = current;
    this.counterListeners.forEach((cb) => {
      try { cb(current); } catch {}
    });
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'COPY_INCREMENT_BROADCAST',
          payload: { totalCount: current, date: this.getTodayDateKey() },
        });
      } catch {}
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('wcg_master_copy_count_updated', { detail: { count: current } }));
        window.dispatchEvent(new CustomEvent('wcg_global_copy_count_updated', { detail: { count: current } }));
      } catch {}
    }
  }

  public incrementLiveCounter(amount: number = 1, notifId?: string): void {
    try {
      if (notifId) {
        const copyKey = `copy_${notifId}`;
        if (this.processedCopyNotifIds.has(copyKey)) return;
        this.processedCopyNotifIds.add(copyKey);
        if (this.processedCopyNotifIds.size > 500) {
          const arr = Array.from(this.processedCopyNotifIds);
          this.processedCopyNotifIds = new Set(arr.slice(arr.length - 250));
        }
        try {
          if (typeof window !== 'undefined') {
            const arr = Array.from(this.processedCopyNotifIds);
            sessionStorage.setItem('wcg_processed_copy_ids_v1', JSON.stringify(arr));
            localStorage.setItem('wcg_processed_copy_ids_v1', JSON.stringify(arr));
          }
        } catch {}
      }
      const inc = Math.max(1, amount);
      this.globalMasterCopyCount = Math.max(94558 + inc, (this.globalMasterCopyCount || 94558) + inc);
      this.dailyMaxCopyCount = this.globalMasterCopyCount;
      try {
        this.saveGlobalMasterCopyCount();
      } catch (saveErr) {
        console.warn('[MarketingService] Failed to persist copy count:', saveErr);
      }
      this.broadcastCurrentCount();
    } catch (e) {
      console.error('[MarketingService] incrementLiveCounter error:', e);
    }
  }

  public subscribeCounter(callback: (count: number) => void): () => void {
    this.counterListeners.add(callback);
    callback(this.getLiveCopyCount());
    return () => this.counterListeners.delete(callback);
  }

  // --- Event-Driven & Deterministic Virtual Stock Engine ---
  /** Cấu hình marketing của 1 mục; nếu chưa có (sản phẩm mới) thì dùng mẫu mặc định. */
  public getProductConfig(id: string): ProductMarketingConfig {
    const pw = this.config.productWeights?.[id];
    return pw ? { ...DEFAULT_PRODUCT_MARKETING_CONFIG, ...pw } : { ...DEFAULT_PRODUCT_MARKETING_CONFIG };
  }

  /** Tồn kho thật tối thiểu để FOMO của mục này hoạt động. */
  public getMinRealStock(id: string): number {
    return Math.max(1, Number(this.getProductConfig(id).minRealStock) || 1);
  }

  /** Kiểm tra xem một loại thông báo FOMO cụ thể có đang được bật hay không */
  public isTypeEnabled(type: NotificationType, itemType?: 'store' | 'utility' | 'giveaway'): boolean {
    if (!this.config.isEnabled) return false;
    const toggles = this.config.typeToggles || DEFAULT_TYPE_TOGGLES;

    if (type === 'COPY_CODE') return toggles.copyCode !== false;
    if (type === 'DEPOSIT_WALLET') return toggles.depositWallet !== false;
    if (type === 'STATS_COPY') return toggles.statsCopy !== false;
    if (type === 'CLAIM_GIVEAWAY') return toggles.claimGiveaway !== false;
    if (type === 'RESTOCK_PRODUCT') return toggles.restockProduct !== false;
    if (type === 'BUY_PRODUCT') {
      if (toggles.buyProduct === false) return false;
      if (itemType === 'store') return toggles.buyStore !== false;
      if (itemType === 'utility') return toggles.buyUtility !== false;
      return (toggles.buyStore !== false) || (toggles.buyUtility !== false);
    }
    return true;
  }

  /** Lấy toàn bộ bộ cờ bật/tắt của các loại thông báo */
  public getTypeToggles(): NotificationTypeToggles {
    return {
      ...DEFAULT_TYPE_TOGGLES,
      ...(this.config.typeToggles || {}),
    };
  }

  public getVirtualBonusStock(productId: string, timestampMs: number = this.getCalibratedNow(), maybeRealStock?: number): number {
    const pw = this.getProductConfig(productId);
    if (pw.priority === 'off' || !pw.virtualStockBonus || pw.virtualStockBonus <= 0) return 0;

    const rawThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
    const restockAmount = Math.max(1, Number(pw.autoRestockAmount) || 20);

    const realStock = typeof maybeRealStock === 'number'
      ? maybeRealStock
      : (this.productRealStockMap.get(productId) ?? this.activeSnapshot?.products?.[productId]?.real_stock ?? this.activeSnapshot?.giveaways?.[productId]?.real_remaining ?? 0);

    if (realStock <= 0) return 0;

    const effectiveTotalThreshold = (realStock > 0 && rawThreshold < realStock)
      ? realStock
      : rawThreshold;

    const maxAllowedStock = Math.max(realStock + Number(pw.virtualStockBonus || 0), effectiveTotalThreshold + restockAmount);

    // 1. Ưu tiên giá trị đã lưu trong liveVirtualStockMap (nếu hợp lệ <= maxAllowedStock)
    if (this.liveVirtualStockMap.has(productId)) {
      const liveVal = this.liveVirtualStockMap.get(productId);
      if (typeof liveVal === 'number' && !isNaN(liveVal) && liveVal > 0 && liveVal <= maxAllowedStock) {
        return liveVal;
      }
    }

    // 2. Tính baseline ban đầu từ config admin: Tồn kho thật + Kho ảo cộng thêm
    const initialBonus = realStock + Number(pw.virtualStockBonus || 0);

    this.liveVirtualStockMap.set(productId, initialBonus);
    this.liveVirtualStockTimestampsMap.set(productId, timestampMs);
    this.saveLiveVirtualStock();

    return initialBonus;
  }

  public clearRealStockCache(id?: string): void {
    if (id) {
      this.productRealStockMap.delete(id);
    } else {
      this.productRealStockMap.clear();
    }
  }

  public getRealStockFor(id: string): number {
    if (!id) return 0;
    if (typeof localStorage !== 'undefined') {
      try {
        const invRaw = localStorage.getItem('wcg_admin_inventory_v4');
        if (invRaw) {
          const invList = JSON.parse(invRaw);
          if (Array.isArray(invList) && invList.length > 0) {
            const matching = invList.filter(
              (i: any) => i && (i.sku === id || i.product_id === id)
            );
            if (matching.length > 0) {
              const s = matching.filter((i: any) => i.status === 'AVAILABLE').length;
              this.productRealStockMap.set(id, s);
              return s;
            }
          }
        }

        const utRaw = localStorage.getItem('wcg_admin_utilities_v4');
        if (utRaw) {
          const utList = JSON.parse(utRaw);
          const found = Array.isArray(utList) ? utList.find((u: any) => u && u.id === id) : null;
          if (found && found.stock_quantity !== undefined) {
            const s = Math.max(0, Number(found.stock_quantity) || 0);
            this.productRealStockMap.set(id, s);
            return s;
          }
        }
        const spRaw = localStorage.getItem('wcg_admin_store_products_v4');
        if (spRaw) {
          const spList = JSON.parse(spRaw);
          const found = Array.isArray(spList) ? spList.find((p: any) => p && p.id === id) : null;
          if (found && found.stock_quantity !== undefined) {
            const s = Math.max(0, Number(found.stock_quantity) || 0);
            this.productRealStockMap.set(id, s);
            return s;
          }
        }
        const gwRaw = localStorage.getItem('wcg_admin_giveaways_v4');
        if (gwRaw) {
          const gwList = JSON.parse(gwRaw);
          const found = Array.isArray(gwList) ? gwList.find((g: any) => g && g.id === id) : null;
          if (found) {
            const count = Array.isArray(found.codes_pool) && found.codes_pool.length > 0
              ? found.codes_pool.length
              : (typeof found.remaining_codes === 'number' ? Math.max(0, found.remaining_codes) : 0);
            const s = Math.max(0, Number(count) || 0);
            this.productRealStockMap.set(id, s);
            return s;
          }
        }
      } catch {}
    }
    if (this.productRealStockMap.has(id)) {
      const val = this.productRealStockMap.get(id);
      if (typeof val === 'number') return val;
    }
    if (this.activeSnapshot?.products?.[id]?.real_stock !== undefined) {
      const s = Math.max(0, Number(this.activeSnapshot.products[id].real_stock) || 0);
      this.productRealStockMap.set(id, s);
      return s;
    }
    if (this.activeSnapshot?.giveaways?.[id]?.real_remaining !== undefined) {
      const s = Math.max(0, Number(this.activeSnapshot.giveaways[id].real_remaining) || 0);
      this.productRealStockMap.set(id, s);
      return s;
    }

    // Default Seed Data Fallback (Bảo toàn số tồn kho thật khi chưa nạp localStorage/snapshot)
    const defUt = DEFAULT_UTILITY_PRODUCTS.find((u) => u && u.id === id);
    if (defUt && defUt.stock_quantity !== undefined) {
      const s = Math.max(0, Number(defUt.stock_quantity) || 0);
      this.productRealStockMap.set(id, s);
      return s;
    }
    const defSp = DEFAULT_STORE_PRODUCTS.find((p) => p && p.id === id);
    if (defSp && defSp.stock_quantity !== undefined) {
      const s = Math.max(0, Number(defSp.stock_quantity) || 0);
      this.productRealStockMap.set(id, s);
      return s;
    }
    const defGw = DEFAULT_GIVEAWAYS.find((g) => g && g.id === id);
    if (defGw) {
      const count = Array.isArray(defGw.codes_pool) && defGw.codes_pool.length > 0
        ? defGw.codes_pool.length
        : (typeof defGw.remaining_codes === 'number' ? Math.max(0, defGw.remaining_codes) : 0);
      const s = Math.max(0, Number(count) || 0);
      this.productRealStockMap.set(id, s);
      return s;
    }

    return 0;
  }

  public decrementProductStock(
    productId: string,
    amountOrNotifId?: number | string,
    notifIdOrAmount?: string | number,
    maybeRealStock?: number
  ): number {
    if (!productId) return 0;

    let amount = 1;
    let notifId: string | undefined = undefined;

    if (typeof amountOrNotifId === 'number') {
      amount = Math.max(1, amountOrNotifId);
      if (typeof notifIdOrAmount === 'string') notifId = notifIdOrAmount;
    } else if (typeof amountOrNotifId === 'string') {
      notifId = amountOrNotifId;
      if (typeof notifIdOrAmount === 'number') amount = Math.max(1, notifIdOrAmount);
    }

    const pw = this.getProductConfig(productId);
    const realStock = typeof maybeRealStock === 'number'
      ? maybeRealStock
      : this.getRealStockFor(productId);

    // CRITICAL: Nếu hàng thật <= 0, ngắt hoàn toàn
    if (realStock <= 0) {
      this.liveVirtualStockMap.set(productId, 0);
      return 0;
    }

    // Deduplication check: process each unique notification ID exactly once across all tabs/mounts
    if (notifId) {
      const stockKey = notifId.startsWith('stock_') ? notifId : `stock_${notifId}`;
      if (this.processedStockNotifIds.has(stockKey)) {
        return this.getDisplayStock(productId, realStock);
      }
      this.processedStockNotifIds.add(stockKey);
      if (this.processedStockNotifIds.size > 200) {
        const arr = Array.from(this.processedStockNotifIds);
        this.processedStockNotifIds = new Set(arr.slice(arr.length - 100));
      }
    }

    const dec = Math.max(1, amount || 1);
    const rawThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
    const restockAmount = Math.max(1, Number(pw.autoRestockAmount) || 20);

    // Quy tắc FOMO người dùng yêu cầu: Nếu cài đặt giới hạn sản phẩm còn để tăng đơn ảo nhỏ hơn số lượng thực tế trong kho,
    // thì mặc định khi đến số hàng còn lại trong kho thực tế sẽ tăng sản phẩm ảo đã cài.
    const effectiveThreshold = (realStock > 0 && rawThreshold < realStock)
      ? realStock
      : rawThreshold;

    const maxAllowedStock = (pw.priority === 'off' || !pw.virtualStockBonus || pw.virtualStockBonus <= 0)
      ? realStock
      : Math.max(realStock + Number(pw.virtualStockBonus || 0), effectiveThreshold + restockAmount);

    // Lấy tồn kho hiện tại và trừ bớt
    let currentStock = this.liveVirtualStockMap.get(productId);
    if (typeof currentStock !== 'number' || isNaN(currentStock) || currentStock <= 0) {
      currentStock = this.getDisplayStock(productId, realStock);
    } else if (currentStock > maxAllowedStock) {
      currentStock = maxAllowedStock;
    }

    let nextStock = currentStock - dec;

    // Tự động bù thêm nếu kho ảo tụt về <= ngưỡng kích hoạt (effectiveThreshold)
    if (pw.virtualStockBonus && pw.virtualStockBonus > 0 && nextStock <= effectiveThreshold) {
      nextStock = effectiveThreshold + restockAmount;
      this.recentRestockTimestampsMap.set(productId, Date.now());
      if (this.lastReportedPeaks) {
        if (this.lastReportedPeaks.stock?.[productId] !== undefined) {
          delete this.lastReportedPeaks.stock[productId];
        }
        if (this.lastReportedPeaks.remaining?.[productId] !== undefined) {
          delete this.lastReportedPeaks.remaining[productId];
        }
      }
      if (this.isTypeEnabled('RESTOCK_PRODUCT')) {
        const itemInfo = this.findItemTitle(productId);
        const titleStr = itemInfo?.title || 'Sản phẩm';
        this.recordRealRestock(titleStr, productId, restockAmount, itemInfo?.itemType || 'utility');
      }
    } else {
      nextStock = Math.max(1, nextStock);
    }
    nextStock = Math.min(nextStock, maxAllowedStock);

    const now = this.getCalibratedNow();
    this.liveVirtualStockMap.set(productId, nextStock);
    this.liveVirtualStockTimestampsMap.set(productId, now);
    this.saveLiveVirtualStock();
    this.notifyStockChanged(productId, nextStock);
    this.schedulePeakReport();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'VIRTUAL_STOCK_DECREMENT',
          payload: { productId, newStock: nextStock, notifId },
        });
      } catch {}
    }

    return nextStock;
  }

  public findItemTitle(id: string): { title: string; itemType: 'store' | 'utility' | 'giveaway' } | null {
    if (!id) return null;
    if (typeof localStorage !== 'undefined') {
      try {
        const utRaw = localStorage.getItem('wcg_admin_utilities_v4') || localStorage.getItem('wcg_utilities_v4');
        if (utRaw) {
          const list = JSON.parse(utRaw);
          const found = Array.isArray(list) ? list.find((u: any) => u && u.id === id) : null;
          if (found && found.title) return { title: found.title, itemType: 'utility' };
        }
        const spRaw = localStorage.getItem('wcg_admin_store_products_v4') || localStorage.getItem('wcg_store_products_v4');
        if (spRaw) {
          const list = JSON.parse(spRaw);
          const found = Array.isArray(list) ? list.find((p: any) => p && p.id === id) : null;
          if (found && found.title) return { title: found.title, itemType: 'store' };
        }
        const gwRaw = localStorage.getItem('wcg_admin_giveaways_v4') || localStorage.getItem('wcg_giveaways_v4');
        if (gwRaw) {
          const list = JSON.parse(gwRaw);
          const found = Array.isArray(list) ? list.find((g: any) => g && g.id === id) : null;
          if (found && found.title) return { title: found.title, itemType: 'giveaway' };
        }
      } catch {}
    }

    // Default Seed Data Fallback for findItemTitle
    const defUt = DEFAULT_UTILITY_PRODUCTS.find((u) => u && u.id === id);
    if (defUt && defUt.title) return { title: defUt.title, itemType: 'utility' };
    const defSp = DEFAULT_STORE_PRODUCTS.find((p) => p && p.id === id);
    if (defSp && defSp.title) return { title: defSp.title, itemType: 'store' };
    const defGw = DEFAULT_GIVEAWAYS.find((g) => g && g.id === id);
    if (defGw && defGw.title) return { title: defGw.title, itemType: 'giveaway' };

    return null;
  }

  public boostProductStock(productId: string, amount: number = 20, notifId?: string): number {
    if (!productId) return 0;
    if (this.serverProductCounters.has(productId) || this.serverGiveawayCounters.has(productId)) {
      return this.getDisplayStock(productId);
    }
    if (notifId) {
      const restockKey = notifId.startsWith('restock_') ? notifId : `restock_${notifId}`;
      if (this.processedStockNotifIds.has(restockKey)) {
        return this.getDisplayStock(productId);
      }
      this.processedStockNotifIds.add(restockKey);
    }
    const realStock = this.getRealStockFor(productId);
    if (realStock <= 0) return 0;
    const inc = Math.max(1, amount || 20);
    const curStock = this.getDisplayStock(productId, realStock);
    const nextStock = curStock + inc;
    this.liveVirtualStockMap.set(productId, nextStock);
    this.saveLiveVirtualStock();
    this.notifyStockChanged(productId, nextStock);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'VIRTUAL_STOCK_RESTOCK',
          payload: { productId, newStock: nextStock, notifId },
        });
      } catch {}
    }
    return nextStock;
  }

  public recordRealRestock(
    productTitle: string,
    productId: string,
    restockAmount: number = 20,
    itemType: 'store' | 'utility' | 'giveaway' = 'utility'
  ): void {
    // QUY TẮC BẮT BUỘC: Chỉ thông báo bổ sung hàng cho các mục còn hàng đang bán trên web
    if (productId) {
      const realStock = this.getRealStockFor(productId);
      if (realStock <= 0) return;
      const displayStock = this.getDisplayStock(productId, realStock);
      if (displayStock <= 0) return;
    }

    const now = this.getCalibratedNow();
    const amt = Math.max(1, restockAmount || 20);
    const event: MarketingNotification = {
      id: `restock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'RESTOCK_PRODUCT',
      title: itemType === 'giveaway' ? 'Nạp thêm mã quà tặng' : 'Bổ sung tồn kho',
      message: itemType === 'giveaway'
        ? `Sự kiện ${productTitle} vừa được nạp thêm +${amt} mã quà tặng mới!`
        : `Kho hàng vừa bổ sung thêm +${amt} ${productTitle}!`,
      timeAgo: 'vừa xong',
      userName: 'Hệ thống',
      productId,
      productName: productTitle,
      giveawayId: itemType === 'giveaway' ? productId : undefined,
      giveawayTitle: itemType === 'giveaway' ? productTitle : undefined,
      restockAmount: amt,
      itemType,
      isRealUser: true,
      timestamp: now,
      scheduledFireTime: now,
    };
    (event as any).localOrigin = true;

    this.boostProductStock(productId, amt, event.id);
    this.pushRealEvent(event, true, true);
    this.schedulePushRealEvent(event, 0);
  }

  private getInitialCalculatedStock(productId: string): number {
    if (this.activeSnapshot?.giveaways?.[productId]) {
      const r = this.activeSnapshot.giveaways[productId].remaining;
      return r > 0 ? r : 5;
    }
    if (this.activeSnapshot?.products?.[productId]) {
      const s = this.activeSnapshot.products[productId].stock;
      return s > 0 ? s : 10;
    }
    const bonus = this.getVirtualBonusStock(productId);
    return bonus > 0 ? bonus : 10;
  }

  public getDisplayStock(productId: string, realStock?: number, timestampMs: number = this.getCalibratedNow()): number {
    const baseStock = Math.max(0, Number(typeof realStock === 'number' ? realStock : this.getRealStockFor(productId)) || 0);
    // CRITICAL BUSINESS RULE: Hết hàng thật = Hết hàng hiển thị (0)
    if (baseStock <= 0) {
      this.liveVirtualStockMap.set(productId, 0);
      this.productRealStockMap.set(productId, 0);
      return 0;
    }

    // Ghi nhớ tồn kho thật
    this.productRealStockMap.set(productId, baseStock);

    // 1. Authoritative Server Counter from Two-Layer Engine
    if (productId && this.serverProductCounters.has(productId)) {
      const serverItem = this.serverProductCounters.get(productId)!;
      // Floor rule: display_stock >= baseStock (Bộ đệm ảo không âm, không thấp hơn tồn gốc)
      return Math.max(baseStock, serverItem.stock);
    }
    if (productId && this.serverGiveawayCounters.has(productId)) {
      const serverGw = this.serverGiveawayCounters.get(productId)!;
      // Floor rule: display_remaining >= baseStock (Bộ đệm ảo quà tặng không âm, không thấp hơn mã gốc)
      return Math.max(baseStock, serverGw.remaining);
    }

    // 2. Safe Fallback before first server poll response
    const pw = this.getProductConfig(productId);
    const bonus = Number(pw.virtualStockBonus || 0);
    return baseStock + (pw.priority !== 'off' && bonus > 0 ? bonus : 0);
  }

  /**
   * Tính toán số mã còn lại HIỂN THỊ cho đợt Giveaway:
   * - Hết mã thật (realStock <= 0) => Hiển thị 0, dừng mô phỏng.
   * - Tắt mô phỏng (enable_auto_simulation === false) => Hiển thị đúng số thật trong kho.
   * - Bật mô phỏng: Hiển thị = realStock + virtual_remaining_current.
   */
  public getGiveawayDisplayRemaining(campaign: {
    id?: string;
    is_active?: boolean;
    status?: string;
    remaining_codes?: number;
    codes_pool?: string[];
    enable_auto_simulation?: boolean;
    virtual_remaining_addition?: number;
    virtual_remaining_current?: number;
  } | null | undefined): number {
    if (!campaign) return 0;

    // 0. Khi sự kiện đóng: Ngoài web báo hết mã (0)
    if (campaign.is_active === false || campaign.is_active === 0 || campaign.is_active === '0' || campaign.status === 'PAUSED' || campaign.status === 'ENDED' || campaign.status === 'CLOSED') {
      return 0;
    }

    const realStock = Array.isArray(campaign.codes_pool) && campaign.codes_pool.length > 0
      ? campaign.codes_pool.length
      : Math.max(0, Number(campaign.remaining_codes || 0));

    // 1. Hết hàng thật = Hết hàng hiển thị (0)
    if (realStock <= 0) return 0;

    // 2. Tắt mô phỏng => Trở về đúng số mã thật còn lại
    if (campaign.enable_auto_simulation === false) {
      return realStock;
    }

    // 3. Số cộng thêm cấu hình (mặc định 20)
    const additionConfig = campaign.virtual_remaining_addition !== undefined && campaign.virtual_remaining_addition !== null
      ? Math.max(0, Number(campaign.virtual_remaining_addition))
      : 20;

    if (additionConfig <= 0) {
      return realStock;
    }

    // 4. Số cộng thêm hiện tại đang áp dụng (1 .. additionConfig)
    let currentAddition = campaign.virtual_remaining_current !== undefined && campaign.virtual_remaining_current !== null
      ? Number(campaign.virtual_remaining_current)
      : additionConfig;

    if (currentAddition <= 0 || currentAddition > additionConfig) {
      currentAddition = additionConfig;
    }

    return realStock + currentAddition;
  }

  public getHourlyGrowth(id: string, createdAt?: string, priority?: string, anchorTime?: string): number {
    return 0; // Pure server calculation in Two-Layer model (Zero client-side artificial drift)
  }

  public getInHourProgression(id: string, createdAt?: string, priority?: string, anchorTime?: string): number {
    return 0; // Pure server calculation in Two-Layer model (Zero client-side artificial drift)
  }

  public findItemDetails(id: string): { sold_count?: number; virtual_sold_count?: number; created_at?: string; fomo_anchor_time?: string; virtual_sold_updated_at?: string } | null {
    if (!id) return null;
    if (typeof localStorage !== 'undefined') {
      try {
        const spRaw = localStorage.getItem('wcg_admin_store_products_v4') || localStorage.getItem('wcg_store_products_v4');
        if (spRaw) {
          const spList = JSON.parse(spRaw);
          const found = Array.isArray(spList) ? spList.find((p: any) => p && p.id === id) : null;
          if (found) {
            return {
              sold_count: typeof found.sold_count === 'number' ? found.sold_count : Number(found.sold_count) || 0,
              virtual_sold_count: found.virtual_sold_count !== undefined ? Number(found.virtual_sold_count) : 0,
              created_at: found.created_at || found.createdAt,
              fomo_anchor_time: found.fomo_anchor_time || found.virtual_sold_updated_at,
              virtual_sold_updated_at: found.virtual_sold_updated_at || found.fomo_anchor_time,
            };
          }
        }
        const utRaw = localStorage.getItem('wcg_admin_utilities_v4') || localStorage.getItem('wcg_utilities_v4');
        if (utRaw) {
          const utList = JSON.parse(utRaw);
          const found = Array.isArray(utList) ? utList.find((u: any) => u && u.id === id) : null;
          if (found) {
            return {
              sold_count: typeof found.sold_count === 'number' ? found.sold_count : Number(found.sold_count) || 0,
              virtual_sold_count: found.virtual_sold_count !== undefined ? Number(found.virtual_sold_count) : 0,
              created_at: found.created_at || found.createdAt,
              fomo_anchor_time: found.fomo_anchor_time || found.virtual_sold_updated_at,
              virtual_sold_updated_at: found.virtual_sold_updated_at || found.fomo_anchor_time,
            };
          }
        }
      } catch {}
    }

    // Default Seed Data Fallback for Item Details
    const defUt = DEFAULT_UTILITY_PRODUCTS.find((u) => u && u.id === id);
    if (defUt) {
      return {
        sold_count: typeof defUt.sold_count === 'number' ? defUt.sold_count : Number(defUt.sold_count) || 0,
        virtual_sold_count: defUt.virtual_sold_count !== undefined ? Number(defUt.virtual_sold_count) : 0,
        created_at: defUt.created_at,
        fomo_anchor_time: (defUt as any).fomo_anchor_time,
        virtual_sold_updated_at: (defUt as any).virtual_sold_updated_at,
      };
    }
    const defSp = DEFAULT_STORE_PRODUCTS.find((p) => p && p.id === id);
    if (defSp) {
      return {
        sold_count: typeof defSp.sold_count === 'number' ? defSp.sold_count : Number(defSp.sold_count) || 0,
        virtual_sold_count: defSp.virtual_sold_count !== undefined ? Number(defSp.virtual_sold_count) : 0,
        created_at: defSp.created_at,
        fomo_anchor_time: (defSp as any).fomo_anchor_time,
        virtual_sold_updated_at: (defSp as any).virtual_sold_updated_at,
      };
    }

    return null;
  }

  public findGiveawayDetails(id: string): { claimed_codes?: number; virtual_claimed_offset?: number; created_at?: string; fomo_anchor_time?: string; virtual_claimed_updated_at?: string } | null {
    if (!id) return null;
    if (typeof localStorage !== 'undefined') {
      try {
        const gwRaw = localStorage.getItem('wcg_admin_giveaways_v4') || localStorage.getItem('wcg_giveaways_v4');
        if (gwRaw) {
          const gwList = JSON.parse(gwRaw);
          const found = Array.isArray(gwList) ? gwList.find((g: any) => g && g.id === id) : null;
          if (found) {
            return {
              claimed_codes: typeof found.claimed_codes === 'number' ? found.claimed_codes : Number(found.claimed_codes) || 0,
              virtual_claimed_offset: found.virtual_claimed_offset !== undefined ? Number(found.virtual_claimed_offset) : 0,
              created_at: found.created_at || found.createdAt,
              fomo_anchor_time: found.fomo_anchor_time || found.virtual_claimed_updated_at,
              virtual_claimed_updated_at: found.virtual_claimed_updated_at || found.fomo_anchor_time,
            };
          }
        }
      } catch {}
    }

    // Default Seed Data Fallback for Giveaway Details
    const defGw = DEFAULT_GIVEAWAYS.find((g) => g && g.id === id);
    if (defGw) {
      return {
        claimed_codes: typeof defGw.claimed_codes === 'number' ? defGw.claimed_codes : Number(defGw.claimed_codes) || 0,
        virtual_claimed_offset: defGw.virtual_claimed_offset !== undefined ? Number(defGw.virtual_claimed_offset) : 0,
        created_at: defGw.created_at,
        fomo_anchor_time: (defGw as any).fomo_anchor_time,
        virtual_claimed_updated_at: (defGw as any).virtual_claimed_updated_at,
      };
    }

    return null;
  }

  public getSoldDisplay(item: { id?: string; sold_count?: number; virtual_sold_count?: number; created_at?: string; createdAt?: string; fomo_anchor_time?: string; virtual_sold_updated_at?: string; packages?: any[] } | null | undefined): number {
    if (!item) return 0;

    // NẾU LÀ SẢN PHẨM GOM NHÓM CÓ NHIỀU GÓI CON (VARIANTS / PACKAGES):
    // Cố định 1 con số duy nhất chính là TỔNG của toàn bộ các mục con trong thẻ cộng lại!
    // Tuyệt đối không ghi đè tổng này vào highWaterSoldCountMap của gói con đơn lẻ để tránh vòng lặp cộng dồn kép.
    if (Array.isArray((item as any)?.packages) && (item as any).packages.length > 1) {
      const sumVariantSold = (item as any).packages.reduce((sum: number, pkg: any) => {
        const singlePkg = {
          ...pkg,
          packages: undefined,
          created_at: pkg.created_at || item.created_at || (item as any).createdAt,
          fomo_anchor_time: (pkg as any).fomo_anchor_time || (item as any).fomo_anchor_time,
        };
        return sum + this.getSoldDisplay(singlePkg);
      }, 0);

      return sumVariantSold;
    }

    const id = item.id || '';
    // 1. Authoritative Two-Layer Server Counter (SSOT)
    if (id && this.serverProductCounters.has(id)) {
      return this.serverProductCounters.get(id)!.sold;
    }

    const details = id && (item.sold_count === undefined || item.virtual_sold_count === undefined) ? this.findItemDetails(id) : null;
    const realSold = Number(item.sold_count !== undefined ? item.sold_count : (details?.sold_count ?? 0)) || 0;
    const realFromHub = id ? (this.realProductSoldCountsMap.get(id) || 0) : 0;
    const effectiveRealSold = Math.max(realSold, realFromHub);

    const virtualBaseRaw = item.virtual_sold_count !== undefined ? item.virtual_sold_count : (details?.virtual_sold_count ?? 0);
    const virtualBase = Number(virtualBaseRaw || 0);

    return effectiveRealSold + virtualBase;
  }

  public getClaimedDisplay(campaign: { id?: string; claimed_codes?: number; virtual_claimed_offset?: number; created_at?: string; createdAt?: string; fomo_anchor_time?: string; virtual_claimed_updated_at?: string; packages?: any[] } | null | undefined): number {
    if (!campaign) return 0;

    // NẾU LÀ CHIẾN DỊCH GOM NHÓM CÓ NHIỀU GÓI QUÀ (PACKAGES):
    if (Array.isArray((campaign as any)?.packages) && (campaign as any).packages.length > 1) {
      const sumVariantClaimed = (campaign as any).packages.reduce((sum: number, pkg: any) => {
        const singlePkg = {
          ...pkg,
          packages: undefined,
          created_at: pkg.created_at || campaign.created_at || (campaign as any).createdAt,
          fomo_anchor_time: (pkg as any).fomo_anchor_time || (campaign as any).fomo_anchor_time,
        };
        return sum + this.getClaimedDisplay(singlePkg);
      }, 0);

      return sumVariantClaimed;
    }

    const id = campaign.id || '';
    const details = id && (campaign.claimed_codes === undefined || campaign.virtual_claimed_offset === undefined) ? this.findGiveawayDetails(id) : null;
    const realClaimed = Number(campaign.claimed_codes !== undefined ? campaign.claimed_codes : (details?.claimed_codes ?? 0)) || 0;
    const realFromHub = id ? (this.realGiveawayClaimedCountsMap.get(id) || 0) : 0;
    const effectiveRealClaimed = Math.max(realClaimed, realFromHub);

    const virtualBaseRaw = campaign.virtual_claimed_offset !== undefined ? campaign.virtual_claimed_offset : (details?.virtual_claimed_offset ?? 0);
    const virtualBase = Math.max(0, Number(virtualBaseRaw || 0));

    // 1. Authoritative Two-Layer Server Counter (SSOT)
    if (id && this.serverGiveawayCounters.has(id)) {
      const serverClaimed = this.serverGiveawayCounters.get(id)!.claimed;
      // BẢNG ADMIN LÀ CHÂN LÝ: Failsafe chặn mọi giá trị server counter bị phình to bất thường do công thức cũ
      if (serverClaimed <= effectiveRealClaimed + virtualBase + 5) {
        return serverClaimed;
      }
    }

    // Single Source of Truth: Bảng Admin là chân lý (Thật + Ảo admin cài đặt)
    return effectiveRealClaimed + virtualBase;
  }

  public syncProductVirtualSold(productId: string, virtualCount: number, forceReset: boolean = true, exactTargetDisplay?: number, anchorTime?: string): void {
    if (!productId) return;
    const count = Math.max(0, Number(virtualCount) || 0);
    this.liveFomoSoldCountMap.set(productId, count);
    this.saveLiveFomoCounts();

    const details = this.findItemDetails(productId);
    const realSold = Number(details?.sold_count) || 0;
    const realFromHub = this.realProductSoldCountsMap.get(productId) || 0;
    const effectiveRealSold = Math.max(realSold, realFromHub);
    const createdAt = details?.created_at;
    const anchor = anchorTime || details?.fomo_anchor_time || details?.virtual_sold_updated_at;
    const hourlyGrowth = this.getHourlyGrowth(productId, createdAt, undefined, anchor);
    const inHourProg = this.getInHourProgression(productId, createdAt, undefined, anchor);

    const calculatedBase = Math.max(0, effectiveRealSold + count + hourlyGrowth + inHourProg);
    const currentHigh = this.highWaterSoldCountMap.get(productId) || 0;

    let targetDisplay = 0;
    if (exactTargetDisplay !== undefined) {
      targetDisplay = Math.max(effectiveRealSold, exactTargetDisplay);
      this.adminOverrideSoldMap.set(productId, targetDisplay);
      this.saveAdminOverrides();
    } else {
      if (forceReset && count === 0) {
        this.adminOverrideSoldMap.delete(productId);
        this.saveAdminOverrides();
      }
      targetDisplay = forceReset ? calculatedBase : Math.max(calculatedBase, currentHigh);
    }

    this.highWaterSoldCountMap.set(productId, targetDisplay);
    this.liveFomoSoldCountMap.set(productId, targetDisplay);
    this.saveHighWaterCounts();
    this.saveLiveFomoCounts();

    if (forceReset) {
      const now = Date.now();
      this.sessionAnchorMap.set(productId, { lastCount: targetDisplay, lastTimestamp: now });
      this.saveSessionAnchor();
      this.lastReportedPeaks.sold[productId] = targetDisplay;

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'FOMO_SOLD_RESET',
            payload: { productId, targetDisplay, virtualCount: count },
          });
        } catch {}
      }

      if (typeof window !== 'undefined') {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'report_peak_metrics',
            forceResetSold: true,
            peakSold: { [productId]: targetDisplay },
          }),
        }).catch(() => null);
      }
    }

    this.notifySoldCountChanged(productId, targetDisplay);
  }

  public syncGiveawayVirtualClaimed(campaignId: string, virtualCount: number, forceReset: boolean = true, exactTargetDisplay?: number, anchorTime?: string): void {
    if (!campaignId) return;
    const count = Math.max(0, Number(virtualCount) || 0);
    this.liveFomoClaimedCountMap.set(campaignId, count);
    this.saveLiveFomoCounts();

    const details = this.findGiveawayDetails(campaignId);
    const realClaimed = Number(details?.claimed_codes) || 0;
    const realFromHub = this.realGiveawayClaimedCountsMap.get(campaignId) || 0;
    const effectiveRealClaimed = Math.max(realClaimed, realFromHub);

    let targetDisplay = 0;
    if (exactTargetDisplay !== undefined) {
      targetDisplay = Math.max(effectiveRealClaimed, exactTargetDisplay);
      this.adminOverrideClaimedMap.set(campaignId, targetDisplay);
      this.saveAdminOverrides();
    } else {
      if (forceReset && count === 0) {
        this.adminOverrideClaimedMap.delete(campaignId);
        this.saveAdminOverrides();
      }
      // BẢNG ADMIN LÀ CHÂN LÝ: Không cộng hourlyGrowth / inHourProg làm phình to số
      targetDisplay = effectiveRealClaimed + count;
    }

    this.highWaterClaimedCountMap.set(campaignId, targetDisplay);
    this.liveFomoClaimedCountMap.set(campaignId, targetDisplay);
    this.saveHighWaterCounts();
    this.saveLiveFomoCounts();

    if (forceReset) {
      const now = Date.now();
      this.sessionAnchorMap.set(campaignId, { lastCount: targetDisplay, lastTimestamp: now });
      this.saveSessionAnchor();
      this.lastReportedPeaks.claimed[campaignId] = targetDisplay;

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'FOMO_CLAIMED_RESET',
            payload: { campaignId, targetDisplay, virtualCount: count },
          });
        } catch {}
      }

      if (typeof window !== 'undefined') {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'report_peak_metrics',
            forceResetClaimed: true,
            peakClaimed: { [campaignId]: targetDisplay },
          }),
        }).catch(() => null);
      }
    }

    this.notifySoldCountChanged(campaignId, targetDisplay);
  }

  public async updateItemVirtualSettings(
    id: string,
    options: {
      targetDisplaySoldOrClaimed?: number;
      virtualStockBonus?: number;
      priority?: ProductPriority;
      forceReset?: boolean;
      fomoAnchorTime?: string;
    }
  ): Promise<void> {
    if (!id) return;

    if (!this.config.productWeights) this.config.productWeights = {};
    const curPw = this.config.productWeights[id] || {
      priority: 'normal',
      virtualStockBonus: 20,
      autoRestockThreshold: 1,
      autoRestockAmount: 20,
    };

    const nextPriority = options.priority !== undefined ? options.priority : curPw.priority;
    const nextBonus = options.virtualStockBonus !== undefined ? Math.max(0, Number(options.virtualStockBonus) || 0) : curPw.virtualStockBonus;

    this.config.productWeights[id] = {
      ...curPw,
      priority: nextPriority,
      virtualStockBonus: nextBonus,
      targetDisplaySoldOrClaimed: options.targetDisplaySoldOrClaimed,
      virtualSold: options.targetDisplaySoldOrClaimed,
      virtualClaimed: options.targetDisplaySoldOrClaimed,
      lastUpdated: new Date().toISOString(),
    };

    const forceReset = options.forceReset === true;
    const anchorTime = options.fomoAnchorTime || new Date().toISOString();
    if (options.targetDisplaySoldOrClaimed !== undefined) {
      if (id.startsWith('gw_')) {
        this.syncGiveawayVirtualClaimed(id, 0, forceReset, options.targetDisplaySoldOrClaimed, anchorTime);
      } else {
        this.syncProductVirtualSold(id, 0, forceReset, options.targetDisplaySoldOrClaimed, anchorTime);
      }
    }

    const realStock = this.getRealStockFor(id);
    if (realStock <= 0) {
      this.liveVirtualStockMap.set(id, 0);
    } else if (nextPriority === 'off' || nextBonus <= 0) {
      this.liveVirtualStockMap.set(id, realStock);
    } else {
      this.liveVirtualStockMap.set(id, realStock + nextBonus);
    }
    this.saveLiveVirtualStock();

    const shouldResetStock = options.forceReset === true || options.virtualStockBonus !== undefined;
    if (shouldResetStock && typeof window !== 'undefined') {
      const targetStockVal = realStock <= 0 ? 0 : (nextBonus <= 0 ? realStock : realStock + nextBonus);
      const isGw = id.startsWith('gw_');
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report_peak_metrics',
          forceResetStock: true,
          lowestStock: !isGw ? { [id]: targetStockVal } : undefined,
          lowestRemaining: isGw ? { [id]: targetStockVal } : undefined,
        }),
      }).catch(() => null);
    }

    await this.saveConfig(this.config);
    this.notifyStockChanged(id, this.getDisplayStock(id, realStock));
    this.notifySoldCountChanged(id, id.startsWith('gw_') ? this.getClaimedDisplay({ id }) : this.getSoldDisplay({ id }));
  }

  public async resetAllGiveawaysToReal(giveaways: Array<{ id: string; claimed_codes?: number; remaining_codes?: number }>): Promise<void> {
    if (!Array.isArray(giveaways) || giveaways.length === 0) return;
    if (!this.config.productWeights) this.config.productWeights = {};

    const peakClaimedUpdates: Record<string, number> = {};
    const lowestRemainingUpdates: Record<string, number> = {};

    giveaways.forEach((gw) => {
      const realClaimed = Math.max(0, Number(gw.claimed_codes) || 0);
      const realRemaining = Math.max(0, Number(gw.remaining_codes) || 0);

      this.config.productWeights[gw.id] = {
        priority: 'off',
        virtualStockBonus: 0,
        autoRestockThreshold: 1,
        autoRestockAmount: 0,
      };

      this.highWaterClaimedCountMap.set(gw.id, realClaimed);
      this.liveFomoClaimedCountMap.set(gw.id, 0);
      this.liveVirtualStockMap.set(gw.id, realRemaining);
      this.sessionAnchorMap.set(gw.id, { lastCount: realClaimed, lastTimestamp: Date.now() });
      this.adminOverrideClaimedMap.delete(gw.id);

      peakClaimedUpdates[gw.id] = realClaimed;
      lowestRemainingUpdates[gw.id] = realRemaining;
    });

    this.saveAdminOverrides();
    this.saveHighWaterCounts();
    this.saveLiveFomoCounts();
    this.saveLiveVirtualStock();
    this.saveSessionAnchor();

    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'report_peak_metrics',
            forceResetClaimed: true,
            forceResetStock: true,
            peakClaimed: peakClaimedUpdates,
            lowestRemaining: lowestRemainingUpdates,
          }),
        });
      } catch {}
    }

    await this.saveConfig(this.config);
    giveaways.forEach((gw) => {
      this.notifyStockChanged(gw.id, Number(gw.remaining_codes) || 0);
      this.notifySoldCountChanged(gw.id, Number(gw.claimed_codes) || 0);
    });
  }

  public incrementLiveSoldCount(productId: string, amount: number = 1, notifId?: string): number {
    if (!productId) return 0;

    // Check hàng thật: Nếu hết hàng thật và không phải do thông báo toast kích hoạt, ngắt tăng đơn ảo
    const realStock = this.getRealStockFor(productId);
    if (!notifId && realStock <= 0) {
      return this.getSoldDisplay({ id: productId });
    }

    if (notifId) {
      const soldNotifKey = notifId.startsWith('sold_') ? notifId : `sold_${notifId}`;
      if (this.processedStockNotifIds.has(soldNotifKey)) {
        return this.getSoldDisplay({ id: productId });
      }
      this.processedStockNotifIds.add(soldNotifKey);
    }

    const inc = Math.max(1, amount || 1);
    const currentSold = this.getSoldDisplay({ id: productId });
    const nextSold = currentSold + inc;
    this.highWaterSoldCountMap.set(productId, nextSold);
    this.saveHighWaterCounts(true);

    this.updateSessionAnchor(productId, nextSold);
    this.notifySoldCountChanged(productId, nextSold);
    this.schedulePeakReport();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'FOMO_SOLD_INCREMENT',
          payload: { productId, totalFomoSold: nextSold, notifId },
        });
      } catch {}
    }

    return nextSold;
  }

  public incrementLiveClaimedCount(campaignId: string, amount: number = 1, notifId?: string): number {
    if (!campaignId) return 0;

    // Check mã thật: Nếu hết mã thật và không phải do thông báo toast kích hoạt, ngắt tăng đơn ảo
    const realRemaining = this.getRealStockFor(campaignId);
    if (!notifId && realRemaining <= 0) {
      return this.getClaimedDisplay({ id: campaignId });
    }

    if (notifId) {
      const gwNotifKey = notifId.startsWith('gw_') ? notifId : `gw_${notifId}`;
      if (this.processedStockNotifIds.has(gwNotifKey)) {
        return this.getClaimedDisplay({ id: campaignId });
      }
      this.processedStockNotifIds.add(gwNotifKey);
    }

    const inc = Math.max(1, amount || 1);
    const currentClaimed = this.getClaimedDisplay({ id: campaignId });
    const nextClaimed = currentClaimed + inc;
    this.highWaterClaimedCountMap.set(campaignId, nextClaimed);
    this.saveHighWaterCounts(true);

    this.updateSessionAnchor(campaignId, nextClaimed);
    this.notifySoldCountChanged(campaignId, nextClaimed);
    this.schedulePeakReport();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'FOMO_CLAIMED_INCREMENT',
          payload: { campaignId, totalFomoClaimed: nextClaimed, notifId },
        });
      } catch {}
    }

    return nextClaimed;
  }

  public getLiveFomoSoldCount(productId: string): number {
    return this.getSoldDisplay({ id: productId });
  }

  public getLiveFomoClaimedCount(campaignId: string): number {
    return this.getClaimedDisplay({ id: campaignId });
  }

  public notifySoldCountChanged(id: string, count: number): void {
    this.soldCountListeners.forEach((cb) => {
      try { cb(id, count); } catch {}
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_sold_count_updated', { detail: { id, count } }));
    }
  }

  public subscribeSoldCountChange(callback: (id: string, count: number) => void): () => void {
    this.soldCountListeners.add(callback);
    return () => this.soldCountListeners.delete(callback);
  }

  public getRandomVirtualAccount(rng?: () => number): string {
    const accounts = Array.isArray(this.config.virtualAccounts) && this.config.virtualAccounts.length > 0
      ? this.config.virtualAccounts
      : PRESET_VIRTUAL_ACCOUNTS;

    // Filter out accounts in recent memory ring buffer
    const bufferSet = new Set(this.recentAccountsRingBuffer);
    let available = accounts.filter((acc) => !bufferSet.has(acc));

    // If pool drops below dynamic threshold, trim the oldest buffer entries
    const minThreshold = Math.max(5, Math.floor(accounts.length * 0.2));
    if (available.length < minThreshold) {
      this.recentAccountsRingBuffer = this.recentAccountsRingBuffer.slice(-minThreshold);
      const updatedSet = new Set(this.recentAccountsRingBuffer);
      available = accounts.filter((acc) => !updatedSet.has(acc));
    }

    const randFn = typeof rng === 'function' ? rng : Math.random;
    const picked = available.length > 0
      ? available[Math.floor(randFn() * available.length)]
      : accounts[Math.floor(randFn() * accounts.length)];

    this.recentAccountsRingBuffer.push(picked);
    const dynamicLimit = Math.min(45, Math.max(10, Math.floor(accounts.length * 0.5)));
    if (this.recentAccountsRingBuffer.length > dynamicLimit) {
      this.recentAccountsRingBuffer.shift();
    }

    return picked;
  }

  /**
   * Deterministic Permutation Shuffle Deck:
   * Phân bổ đồng đều 100% tài khoản trong danh sách cài đặt Admin.
   * Trong mỗi vòng lặp (vòng = số lượng tài khoản, ví dụ 90 slots):
   * - TOÀN BỘ 90 TÀI KHOẢN đều xuất hiện ĐÚNG 1 LẦN, không sót bất kỳ ai.
   * - TUYỆT ĐỐI KHÔNG TRÙNG LẶP tên trong 90 thông báo liên tiếp.
   * - Đồng bộ tuyệt đối giữa mọi thiết bị & trình duyệt theo slotIndex UTC.
   */
  public getDeterministicAccountIndex(slotIndex: number, totalCount: number): number {
    if (totalCount <= 1) return 0;
    const round = Math.floor(slotIndex / totalCount);
    const pos = ((slotIndex % totalCount) + totalCount) % totalCount;

    if (this.cachedRound !== round || this.cachedRoundCount !== totalCount) {
      this.cachedRound = round;
      this.cachedRoundCount = totalCount;
      const roundSeed = (Math.imul(round, 0x9e3779b9) ^ 0x65ac932f) >>> 0;
      const roundRng = createPRNG(roundSeed);
      const indices = Array.from({ length: totalCount }, (_, i) => i);
      // Fisher-Yates permutation
      for (let i = totalCount - 1; i > 0; i--) {
        const j = Math.floor(roundRng() * (i + 1));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
      }

      // Xử lý giáp ranh giữa 2 vòng để tránh tên cuối vòng trước trùng tên đầu vòng sau
      if (round > 0 && totalCount > 1) {
        const prevSeed = (Math.imul(round - 1, 0x9e3779b9) ^ 0x65ac932f) >>> 0;
        const prevRng = createPRNG(prevSeed);
        const prevIndices = Array.from({ length: totalCount }, (_, i) => i);
        for (let i = totalCount - 1; i > 0; i--) {
          const j = Math.floor(prevRng() * (i + 1));
          const tmp = prevIndices[i];
          prevIndices[i] = prevIndices[j];
          prevIndices[j] = tmp;
        }
        if (indices[0] === prevIndices[totalCount - 1]) {
          const swapTarget = Math.min(1, totalCount - 1);
          const tmp = indices[0];
          indices[0] = indices[swapTarget];
          indices[swapTarget] = tmp;
        }
      }
      this.cachedRoundIndices = indices;
    }

    return this.cachedRoundIndices[pos];
  }

  public notifyStockChanged(productId: string, newStock: number): void {
    this.stockListeners.forEach((cb) => {
      try { cb(productId, newStock); } catch {}
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_virtual_stock_updated', { detail: { productId, stock: newStock } }));
    }
  }

  public subscribeStockChange(callback: (productId: string, newStock: number) => void): () => void {
    this.stockListeners.add(callback);
    return () => this.stockListeners.delete(callback);
  }

  // --- Time Ago & Random Delay Engine ---
  public formatTimeAgo(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    if (s < 5) return 'vừa xong';
    if (s < 60) return `${s}s trước`;
    const minutes = Math.floor(s / 60);
    return `${minutes} phút trước`;
  }

  public getRandomTimeAgo(rngOrRandom?: () => number): string {
    const tac = this.config.timeAgoConfig;
    if (tac?.enabled === false) return 'vừa xong';
    const maxSec = Math.min(600, Math.max(5, tac?.maxDelaySeconds ?? 30));
    const rand = typeof rngOrRandom === 'function' ? rngOrRandom() : Math.random();
    const delaySec = Math.floor(rand * (maxSec + 1));
    return this.formatTimeAgo(delaySec);
  }

  private extractNameOrEmail(u: any): string | null {
    if (!u || typeof u !== 'object') return null;

    const displayName = typeof u.displayName === 'string' ? u.displayName.trim() : '';
    const fullName = typeof u.full_name === 'string' ? u.full_name.trim() : '';
    const username = typeof u.username === 'string' ? u.username.trim() : '';
    const name = typeof u.name === 'string' ? u.name.trim() : '';
    const email = typeof u.email === 'string' ? u.email.trim() : '';
    const phone = typeof u.phone === 'string' ? u.phone.trim() : '';

    // 1. Prioritize real display name / full name / username (if not an auto-id)
    if (displayName && !displayName.includes('@') && !displayName.startsWith('usr_')) {
      return displayName;
    }
    if (fullName && !fullName.includes('@') && !fullName.startsWith('usr_')) {
      return fullName;
    }
    if (username && !username.includes('@') && !username.startsWith('usr_')) {
      return username;
    }
    if (name && !name.includes('@') && !name.startsWith('usr_')) {
      return name;
    }

    // 2. Fallback to Email if name is not available
    if (email && email.includes('@')) {
      return email;
    }

    // 3. Fallback to Phone
    if (phone) {
      return phone;
    }

    // 4. Any name present even if it has @ or generic
    if (displayName) return displayName;
    if (username) return username;

    return null;
  }

  public resolveUserName(userOrName?: UserProfile | string | null): string {
    // 1. Explicit string passed
    if (typeof userOrName === 'string' && userOrName.trim()) {
      return userOrName.trim();
    }

    // 2. UserProfile object passed directly
    if (userOrName && typeof userOrName === 'object') {
      const resolved = this.extractNameOrEmail(userOrName);
      if (resolved) return resolved;
    }

    // 3. Fallback: check logged in user from all known localStorage & sessionStorage keys
    if (typeof window !== 'undefined') {
      try {
        const userKeys = ['wcg_user', 'wcg_current_user', 'wcg_auth_user'];
        for (const key of userKeys) {
          const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                const resolved = this.extractNameOrEmail(parsed);
                if (resolved) return resolved;
              }
            } catch {}
          }
        }
      } catch {}
    }

    // 4. Guest user identifier (authentic & stable for this browser session)
    if (typeof window !== 'undefined') {
      try {
        let guestAlias = localStorage.getItem('wcg_client_guest_name');
        if (!guestAlias) {
          const guestNum = Math.floor(1000 + Math.random() * 9000);
          guestAlias = `Khách #${guestNum}`;
          localStorage.setItem('wcg_client_guest_name', guestAlias);
        }
        return guestAlias;
      } catch {}
    }
    return 'Khách vãng lai';
  }

  // --- Authoritative Server Ledger Event Queue & Slot Clock Helpers ---
  public hasPendingLedgerEvent(): boolean {
    return this.peekLedgerEvent() !== null;
  }

  public peekLedgerEvent(): MarketingNotification | null {
    while (this.serverLedgerEventQueue.length > 0) {
      const evt = this.serverLedgerEventQueue[0];
      if (evt && this.isTypeEnabled(evt.type, evt.itemType)) {
        return evt;
      }
      this.serverLedgerEventQueue.shift();
    }
    return null;
  }

  public getNextLedgerEvent(): MarketingNotification | null {
    // 1. Fresh event from server ledger queue
    while (this.serverLedgerEventQueue.length > 0) {
      const evt = this.serverLedgerEventQueue.shift();
      if (evt && this.isTypeEnabled(evt.type, evt.itemType)) {
        return evt;
      }
    }

    // 2. Tuân thủ nghiêm ngặt Yêu cầu 2: Bỏ phát lại ngẫu nhiên.
    // Khi hàng đợi rỗng, không tự chọn ngẫu nhiên sự kiện cũ trong bộ nhớ đệm để phát lại.
    // Tuyệt đối không sinh id dạng replay_*. Trả về null để không hiển thị gì cả.
    return null;
  }

  /**
   * Lấy sự kiện mới nhất từ sổ máy chủ (dành cho thông báo chào mừng ban đầu <= 20s hoặc khi cần sự kiện gần nhất).
   * Không làm thay đổi hàng đợi (peek).
   */
  public getLatestLedgerEvent(): MarketingNotification | null {
    // 1. Kiểm tra hàng đợi sự kiện máy chủ (ưu tiên sự kiện mới nhất chưa hiển thị)
    for (let i = this.serverLedgerEventQueue.length - 1; i >= 0; i--) {
      const evt = this.serverLedgerEventQueue[i];
      if (evt && this.isTypeEnabled(evt.type, evt.itemType)) {
        if (!evt.id || !this.isNotificationProcessed(evt.id)) {
          return evt;
        }
      }
    }
    // 2. Kiểm tra bộ nhớ đệm sự kiện sổ máy chủ
    for (let i = this.cachedLedgerEvents.length - 1; i >= 0; i--) {
      const evt = this.cachedLedgerEvents[i];
      if (evt && this.isTypeEnabled(evt.type, evt.itemType)) {
        if (!evt.id || !this.isNotificationProcessed(evt.id)) {
          return evt;
        }
      }
    }
    return null;
  }

  /**
   * Tính toán neo ngày (00:00:00+07:00 giờ VN) và chỉ số khe (currentSlotIndex)
   * đồng bộ tuyệt đối với máy chủ theo chu kỳ 10 giây / khe (SLOT_DURATION_MS).
   */
  public getVnDayAnchor(nowMs: number = this.getCalibratedNow()): { vnDateStr: string; dayStartMs: number; currentSlotIndex: number } {
    const vnDateStr = new Date(nowMs + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const dayStartMs = new Date(vnDateStr + 'T00:00:00+07:00').getTime();
    const currentSlotIndex = Math.max(0, Math.floor((nowMs - dayStartMs) / SLOT_DURATION_MS));
    return { vnDateStr, dayStartMs, currentSlotIndex };
  }

  /**
   * Trích xuất chỉ số khe (slotIndex) từ một sự kiện sổ máy chủ.
   * Nhận dạng theo id: sim_slot_NNNN hoặc slot_xxx_NNNN hoặc thuộc tính slotIndex/timestamp.
   */
  public extractSlotIndex(evt: any, dayStartMs?: number): number | null {
    if (!evt) return null;
    if (typeof evt.slotIndex === 'number' && !isNaN(evt.slotIndex)) {
      return evt.slotIndex;
    }
    if (typeof evt.id === 'string') {
      const match = evt.id.match(/^(?:sim_)?slot_(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    const anchor = dayStartMs || this.getVnDayAnchor().dayStartMs;
    const ts = Number(evt.timestamp || evt.scheduledFireTime);
    if (!isNaN(ts) && ts > 0 && anchor > 0) {
      return Math.floor((ts - anchor) / SLOT_DURATION_MS);
    }
    return null;
  }

  /**
   * Lấy sự kiện mô phỏng của KHE HIỆN TẠI từ sổ máy chủ.
   * Cùng một khe thì mọi trình duyệt đều nhận cùng một sự kiện duy nhất.
   * Nếu chưa có sự kiện cho khe hiện tại hoặc sự kiện đã hiển thị/bị spam -> trả về null.
   */
  public getCurrentSlotEvent(currentSlotIndex: number): MarketingNotification | null {
    const { dayStartMs } = this.getVnDayAnchor();

    // 1. Tìm trực tiếp trong bảng ánh xạ khe slotEventsMap
    let evt = this.slotEventsMap.get(currentSlotIndex) || null;

    // 2. Tìm trong serverLedgerEventQueue hoặc cachedLedgerEvents nếu chưa kịp map
    if (!evt) {
      evt = this.serverLedgerEventQueue.find((e) => this.extractSlotIndex(e, dayStartMs) === currentSlotIndex) ||
            this.cachedLedgerEvents.find((e) => this.extractSlotIndex(e, dayStartMs) === currentSlotIndex) || null;
    }

    if (evt && this.isTypeEnabled(evt.type, evt.itemType)) {
      // Chống lặp ID: Bỏ qua nếu sự kiện này đã hiển thị trên trình duyệt này
      if (evt.id && this.isNotificationProcessed(evt.id)) {
        return null;
      }
      // Chống spam sao chép: Bỏ qua nếu người dùng này đang trong cooldown 20s
      if (evt.type === 'COPY_CODE' && !this.canDisplayActionNotification(evt.userName || '', 'COPY_CODE', 20000)) {
        return null;
      }
      return evt;
    }
    return null;
  }

  // --- Real Event Queue ---
  public hasPendingRealEvent(): boolean {
    return this.peekRealEvent() !== null;
  }

  public peekRealEvent(): MarketingNotification | null {
    while (this.recentRealEvents.length > 0) {
      const evt = this.recentRealEvents[0];
      if (!evt) {
        this.recentRealEvents.shift();
        continue;
      }
      // Bỏ qua nếu sự kiện đã được hiển thị trên trình duyệt này
      if (evt.id && this.isNotificationProcessed(evt.id)) {
        this.recentRealEvents.shift();
        continue;
      }
      // Bỏ qua nếu là sự kiện sao chép đang trong cooldown 20s của người dùng đó
      if (evt.type === 'COPY_CODE' && !this.canDisplayActionNotification(evt.userName || '', 'COPY_CODE', 20000)) {
        this.recentRealEvents.shift();
        continue;
      }
      if (this.isTypeEnabled(evt.type, evt.itemType)) {
        return evt;
      }
      this.recentRealEvents.shift(); // remove disabled or invalid event
    }
    return null;
  }

  public popRealEvent(): MarketingNotification | null {
    while (this.recentRealEvents.length > 0) {
      const evt = this.recentRealEvents.shift();
      if (!evt) continue;
      if (evt.id && this.isNotificationProcessed(evt.id)) continue;
      if (evt.type === 'COPY_CODE' && !this.canDisplayActionNotification(evt.userName || '', 'COPY_CODE', 20000)) continue;
      if (this.isTypeEnabled(evt.type, evt.itemType)) {
        return evt;
      }
    }
    return null;
  }

  public getEventPriority(evt: MarketingNotification): number {
    if (!evt) return 0;
    if (evt.type === 'BUY_PRODUCT') return 3;
    if (evt.type === 'CLAIM_GIVEAWAY') return 2;
    if (evt.type === 'DEPOSIT_WALLET') return 2;
    if (evt.type === 'COPY_CODE') return 1;
    return 0;
  }

  public sortAndPruneRealEventQueue(): void {
    // 1. Sort by scheduledFireTime ascending so the earliest scheduled to fire is at index 0.
    // If fire times are within 1 second of each other, break tie with priority.
    this.recentRealEvents.sort((a, b) => {
      const fA = Number(a.scheduledFireTime) || Number(a.timestamp) || 0;
      const fB = Number(b.scheduledFireTime) || Number(b.timestamp) || 0;
      if (Math.abs(fA - fB) >= 1000) return fA - fB;
      const pA = this.getEventPriority(a);
      const pB = this.getEventPriority(b);
      return pB - pA;
    });

    // 2. Anti-spam filter: keep at most 2 COPY_CODE events in visual queue, deduplicating by game
    const seenGames = new Set<string>();
    this.recentRealEvents = this.recentRealEvents.filter((evt) => {
      if (evt.type === 'COPY_CODE') {
        const gameKey = evt.gameSlug || evt.gameName || 'default';
        if (seenGames.has(gameKey)) return false;
        seenGames.add(gameKey);
        return true;
      }
      return true;
    });

    // 3. Keep visual queue compact (at most 15 real events)
    if (this.recentRealEvents.length > 15) {
      this.recentRealEvents = this.recentRealEvents.slice(0, 15);
    }
  }

  public pushRealEvent(
    event: MarketingNotification,
    shouldBroadcast: boolean = true,
    notifyImmediately: boolean = false
  ): void {
    if (!event || !event.id) return;
    const isTest = Boolean(event.id && event.id.startsWith('test_'));
    if (!isTest && (!this.config.isEnabled || !this.isTypeEnabled(event.type, event.itemType))) return;

    // Persistent deduplication check
    if (this.isNotificationProcessed(event.id)) return;

    // Chống spam sao chép: Kiểm tra cửa sổ cooldown 20s theo người dùng cho mọi đường hiển thị
    if (event.type === 'COPY_CODE' && !this.canDisplayActionNotification(event.userName || '', 'COPY_CODE', 20000)) {
      return;
    }

    // Ensure name & message are masked according to config
    event = this.sanitizeNotificationMasking(event);

    if (event.type === 'STATS_COPY') {
      event.timeAgo = 'vừa xong';
    } else if (!event.timeAgo || event.timeAgo === 'vừa xong') {
      event.timeAgo = this.getRandomTimeAgo();
    }

    if (notifyImmediately) {
      this.markNotificationProcessed(event.id);
      if (event.type === 'COPY_CODE') {
        this.recordActionNotificationDisplayed(event.userName || '', 'COPY_CODE');
      }
      this.notificationListeners.forEach((cb) => {
        try { cb(event); } catch {}
      });
    } else {
      // Add to pending real events queue if not duplicate
      if (!this.recentRealEvents.some((e) => e && e.id === event.id)) {
        this.recentRealEvents.unshift(event);
        this.sortAndPruneRealEventQueue();
      }
    }

    // Broadcast across same-machine tabs via BroadcastChannel
    if (shouldBroadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'REAL_EVENT_BROADCAST',
          payload: event,
        });
      } catch {}
    }
  }

  private handleIncomingRealEvent(event: MarketingNotification, shouldBroadcast: boolean = false): void {
    if (!event || !this.config.isEnabled || !this.isTypeEnabled(event.type, event.itemType)) return;
    event = this.sanitizeNotificationMasking(event);
    this.pushRealEvent(event, shouldBroadcast, false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_new_real_events_available'));
    }
  }

  private schedulePushRealEvent(event: MarketingNotification | null, copyIncrement: number = 0): void {
    if (typeof window === 'undefined') return;

    if (copyIncrement > 0) {
      this.pendingCopyIncrement += copyIncrement;
    }

    if (event && event.type === 'COPY_CODE') {
      this.pendingCopyEvent = event;
      const now = Date.now();
      const elapsed = now - this.lastCopyPushTime;

      if (elapsed >= this.COPY_PUSH_COOLDOWN_MS) {
        this.flushPendingCopyPush();
      } else if (!this.copyPushTimer) {
        this.copyPushTimer = setTimeout(() => {
          this.flushPendingCopyPush();
        }, this.COPY_PUSH_COOLDOWN_MS - elapsed);
      }
    } else if (event) {
      // Non-copy events (BUY_PRODUCT, DEPOSIT_WALLET, CLAIM_GIVEAWAY) are high priority: flush immediately!
      this.sendPushToEdge(event, this.pendingCopyIncrement);
      this.pendingCopyIncrement = 0;
      this.pendingCopyEvent = null;
      this.lastCopyPushTime = Date.now();
    } else if (this.pendingCopyIncrement > 0) {
      this.flushPendingCopyPush();
    }
  }

  private flushPendingCopyPush(): void {
    if (this.copyPushTimer) {
      clearTimeout(this.copyPushTimer);
      this.copyPushTimer = null;
    }
    const evt = this.pendingCopyEvent;
    const inc = this.pendingCopyIncrement;
    this.pendingCopyEvent = null;
    this.pendingCopyIncrement = 0;
    this.lastCopyPushTime = Date.now();

    if (evt || inc > 0) {
      this.sendPushToEdge(evt, inc);
    }
  }

  private async sendPushToEdge(event: MarketingNotification | null, copyIncrement: number): Promise<void> {
    const totalIncrementToSend = copyIncrement + this.pendingFailedCopyIncrement;
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'push_real_event',
          event: event || undefined,
          copyIncrement: totalIncrementToSend > 0 ? totalIncrementToSend : undefined,
          cooldownSec: Math.max(5, Number(this.config.realUserCooldownSec) || 20),
        }),
      });
      if (res.ok) {
        this.pendingFailedCopyIncrement = 0; // Thành công: Xóa hàng đợi thử lại
        const data: any = await res.json().catch(() => null);
        if (data && data.success) {
          if (typeof data.server_time === 'number') {
            this.calibrateServerTime(data.server_time);
          }
          if (typeof data.masterCopyClicks === 'number') {
            const serverTotal = Number(data.masterCopyClicks) || 0;
            if (serverTotal > this.globalMasterCopyCount) {
              this.globalMasterCopyCount = serverTotal;
              this.dailyMaxCopyCount = serverTotal;
              this.saveGlobalMasterCopyCount();
              this.broadcastCurrentCount();
            }
          }
          if (data.event && data.event.id && data.event.scheduledFireTime) {
            const match = this.recentRealEvents.find((e) => e && e.id === data.event.id);
            if (match) {
              match.scheduledFireTime = data.event.scheduledFireTime;
              this.sortAndPruneRealEventQueue();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('wcg_new_real_events_available'));
              }
            }
            if (this.broadcastChannel) {
              try {
                this.broadcastChannel.postMessage({
                  type: 'REAL_EVENT_SCHEDULED',
                  payload: data.event,
                });
              } catch {}
            }
          }
        }
      } else {
        if (totalIncrementToSend > 0) {
          this.pendingFailedCopyIncrement = totalIncrementToSend;
        }
      }
    } catch {
      if (totalIncrementToSend > 0) {
        this.pendingFailedCopyIncrement = totalIncrementToSend;
      }
    }
  }

  public syncFromHub(
    serverEvents?: MarketingNotification[],
    masterCopyClicks?: number,
    realProductSoldCounts?: Record<string, number>,
    realGiveawayClaimedCounts?: Record<string, number>,
    masterCopyClicksDate?: string,
    counters?: any,
    peakProductSoldCounts?: Record<string, number>,
    peakGiveawayClaimedCounts?: Record<string, number>,
    lowestProductStock?: Record<string, number>,
    lowestGiveawayRemaining?: Record<string, number>
  ): void {
    this.initialSyncCompleted = true;
    const today = this.getTodayDateKey();
    if (this.currentClickDate && this.currentClickDate !== today) {
      this.masterCopyClicks = 0;
      this.currentClickDate = today;
      this.saveMasterCopyClicks();
    }
    const isDateValid = !masterCopyClicksDate || masterCopyClicksDate === today;
    if (isDateValid && typeof masterCopyClicks === 'number' && !isNaN(masterCopyClicks)) {
      if (masterCopyClicks > this.masterCopyClicks) {
        this.masterCopyClicks = masterCopyClicks;
        this.realClicksOffset = masterCopyClicks;
        this.saveMasterCopyClicks();
      }
      if (masterCopyClicks > this.globalMasterCopyCount) {
        this.globalMasterCopyCount = masterCopyClicks;
        this.dailyMaxCopyCount = masterCopyClicks;
        this.saveGlobalMasterCopyCount();
        this.broadcastCurrentCount();
      }
    }
    if (realProductSoldCounts && typeof realProductSoldCounts === 'object') {
      let changed = false;
      Object.entries(realProductSoldCounts).forEach(([k, v]) => {
        if (typeof v === 'number' && this.realProductSoldCountsMap.get(k) !== v) {
          this.realProductSoldCountsMap.set(k, v);
          changed = true;
        }
      });
      if (changed) this.notifySoldCountChanged('*', 0);
    }
    if (realGiveawayClaimedCounts && typeof realGiveawayClaimedCounts === 'object') {
      let changed = false;
      Object.entries(realGiveawayClaimedCounts).forEach(([k, v]) => {
        if (typeof v === 'number' && this.realGiveawayClaimedCountsMap.get(k) !== v) {
          this.realGiveawayClaimedCountsMap.set(k, v);
          changed = true;
        }
      });
      if (changed) this.notifySoldCountChanged('*', 0);
    }

    // Authoritative Server Counters Synchronization (Two-Layer SSOT)
    if (counters && typeof counters === 'object') {
      if (counters.products && typeof counters.products === 'object') {
        Object.entries(counters.products).forEach(([pId, info]: [string, any]) => {
          if (info && typeof info === 'object') {
            this.serverProductCounters.set(pId, {
              sold: Number(info.sold) || 0,
              stock: Number(info.stock) || 0,
              real_sold: Number(info.real_sold) || 0,
              real_stock: Number(info.real_stock) || 0,
              virtual_sold: Number(info.virtual_sold) || 0,
              virtual_buffer: Number(info.virtual_buffer) || 0,
              virtual_restock_count: Number(info.virtual_restock_count) || 0,
            });
            this.productRealStockMap.set(pId, Number(info.real_stock) || 0);
          }
        });
      }
      if (counters.giveaways && typeof counters.giveaways === 'object') {
        Object.entries(counters.giveaways).forEach(([gId, info]: [string, any]) => {
          if (info && typeof info === 'object') {
            this.serverGiveawayCounters.set(gId, {
              claimed: Number(info.claimed) || 0,
              remaining: Number(info.remaining) || 0,
              real_claimed: Number(info.real_claimed) || 0,
              real_remaining: Number(info.real_remaining) || 0,
              virtual_claimed: Number(info.virtual_claimed) || 0,
              virtual_buffer: Number(info.virtual_buffer) || 0,
            });
            this.productRealStockMap.set(gId, Number(info.real_remaining) || 0);
          }
        });
      }
      if (counters.master_copy && typeof counters.master_copy === 'object') {
        const mc = counters.master_copy;
        this.serverMasterCopy = {
          count: Number(mc.count) || 0,
          real: Number(mc.real) || 0,
          virtual: Number(mc.virtual) || 0,
        };
        const serverCount = Number(mc.count) || 0;
        if (serverCount > this.globalMasterCopyCount) {
          this.globalMasterCopyCount = serverCount;
          this.dailyMaxCopyCount = serverCount;
          this.saveGlobalMasterCopyCount();
          this.broadcastCurrentCount();
        }
      }
      this.notifySoldCountChanged('*', 0);
      this.notifyStockChanged('*', 0);
    }

    // Synchronize lowest stock for products from Hub across all devices instantly (3s) - ONLY if counters not present
    if (!counters && lowestProductStock && typeof lowestProductStock === 'object') {
      let stockChanged = false;
      const nowMs = Date.now();
      Object.entries(lowestProductStock).forEach(([k, v]) => {
        let val = Number(v);
        if (!isNaN(val) && val > 0) {
          const pw = this.getProductConfig(k);
          const baseStock = Math.max(0, Number(this.getRealStockFor(k)) || 0);
          const rawThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
          const restockAmount = Math.max(1, Number(pw.autoRestockAmount) || 20);
          const effectiveThreshold = (baseStock > 0 && rawThreshold < baseStock)
            ? baseStock
            : rawThreshold;

          // Nếu cấu hình có kho ảo và hàng thật còn, nhưng giá trị nhận về <= effectiveThreshold:
          // Đây là tồn kho đã chạm đáy cần bù kho!
          if (pw.priority !== 'off' && pw.virtualStockBonus && pw.virtualStockBonus > 0 && baseStock > 0 && val <= effectiveThreshold) {
            val = effectiveThreshold + restockAmount;
          }

          const cur = this.liveVirtualStockMap.get(k);
          const restockTime = this.recentRestockTimestampsMap.get(k) || 0;
          const isUnderRestockProtection = (nowMs - restockTime) < 60000;

          // Nếu máy này vừa bù kho trong vòng 60s, không để packet trễ từ server kéo tụt số hiển thị về số cũ
          if (isUnderRestockProtection && cur !== undefined && val < cur) {
            return;
          }

          const isRestockJump = cur !== undefined && val > cur;
          if (cur === undefined || val < cur || isRestockJump) {
            if (isRestockJump) {
              this.recentRestockTimestampsMap.set(k, nowMs);
            }
            this.liveVirtualStockMap.set(k, val);
            stockChanged = true;
          }
        }
      });
      if (stockChanged) {
        this.saveLiveVirtualStock();
        this.notifyStockChanged('*', 0);
      }
    }

    // Synchronize lowest giveaway remaining from Hub across all devices instantly (3s) - ONLY if counters not present
    if (!counters && lowestGiveawayRemaining && typeof lowestGiveawayRemaining === 'object') {
      let gwStockChanged = false;
      const nowMs = Date.now();
      Object.entries(lowestGiveawayRemaining).forEach(([k, v]) => {
        let val = Number(v);
        if (!isNaN(val) && val > 0) {
          const pw = this.getProductConfig(k);
          const baseRemaining = Math.max(0, Number(this.getRealStockFor(k)) || 0);
          const rawThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
          const restockAmount = Math.max(1, Number(pw.autoRestockAmount) || 20);
          const effectiveThreshold = (baseRemaining > 0 && rawThreshold < baseRemaining)
            ? baseRemaining
            : rawThreshold;

          if (pw.priority !== 'off' && pw.virtualStockBonus && pw.virtualStockBonus > 0 && baseRemaining > 0 && val <= effectiveThreshold) {
            val = effectiveThreshold + restockAmount;
          }

          const cur = this.liveVirtualStockMap.get(k);
          const restockTime = this.recentRestockTimestampsMap.get(k) || 0;
          const isUnderRestockProtection = (nowMs - restockTime) < 60000;

          // Nếu máy này vừa bù kho trong vòng 60s, không để packet trễ từ server kéo tụt số hiển thị về số cũ
          if (isUnderRestockProtection && cur !== undefined && val < cur) {
            return;
          }

          const isRestockJump = cur !== undefined && val > cur;
          if (cur === undefined || val < cur || isRestockJump) {
            if (isRestockJump) {
              this.recentRestockTimestampsMap.set(k, nowMs);
            }
            this.liveVirtualStockMap.set(k, val);
            gwStockChanged = true;
          }
        }
      });
      if (gwStockChanged) {
        this.saveLiveVirtualStock();
        this.notifyStockChanged('*', 0);
      }
    }

    if (Array.isArray(serverEvents) && serverEvents.length > 0) {
      this.lastLedgerSyncTime = Date.now();
      const TTL_MS = 10 * 60 * 1000; // 10 minutes TTL for ledger events

      let deletedStoreSet = new Set<string>();
      let deletedUtilSet = new Set<string>();
      let deletedGwSet = new Set<string>();
      try {
        if (typeof window !== 'undefined') {
          const rawDelSp = localStorage.getItem('wcg_deleted_store_products');
          if (rawDelSp) {
            const parsed = JSON.parse(rawDelSp);
            if (Array.isArray(parsed)) deletedStoreSet = new Set(parsed);
          }
          const rawDelUt = localStorage.getItem('wcg_deleted_utilities');
          if (rawDelUt) {
            const parsed = JSON.parse(rawDelUt);
            if (Array.isArray(parsed)) deletedUtilSet = new Set(parsed);
          }
          const rawDelGw = localStorage.getItem('wcg_deleted_giveaways');
          if (rawDelGw) {
            const parsed = JSON.parse(rawDelGw);
            if (Array.isArray(parsed)) deletedGwSet = new Set(parsed);
          }
        }
      } catch {}

      this.lastLedgerSyncTime = Date.now();
      const { dayStartMs } = this.getVnDayAnchor();

      // Lưu trữ sự kiện vào slotEventsMap theo slotIndex để phục vụ hiển thị theo đồng hồ khe
      serverEvents.forEach((evt) => {
        if (!evt || !evt.id) return;
        if (evt.type === 'BUY_PRODUCT' && evt.productId && (deletedStoreSet.has(evt.productId) || deletedUtilSet.has(evt.productId))) return;
        if (evt.type === 'CLAIM_GIVEAWAY' && evt.giveawayId && deletedGwSet.has(evt.giveawayId)) return;
        
        const slotIdx = this.extractSlotIndex(evt, dayStartMs);
        if (slotIdx !== null) {
          this.slotEventsMap.set(slotIdx, evt);
        }
        if (!this.cachedLedgerEvents.some(c => c.id === evt.id)) {
          this.cachedLedgerEvents.push(evt);
        }
      });
      if (this.slotEventsMap.size > 120) {
        const sortedKeys = Array.from(this.slotEventsMap.keys()).sort((a, b) => a - b);
        const keysToRemove = sortedKeys.slice(0, sortedKeys.length - 100);
        keysToRemove.forEach((k) => this.slotEventsMap.delete(k));
      }
      if (this.cachedLedgerEvents.length > 30) {
        this.cachedLedgerEvents = this.cachedLedgerEvents.slice(this.cachedLedgerEvents.length - 30);
      }

      // Process from earliest scheduled fire time to latest
      const sorted = [...serverEvents].sort(
        (a, b) => (Number(a.scheduledFireTime || a.timestamp || 0)) - (Number(b.scheduledFireTime || b.timestamp || 0))
      );
      let newEventsAdded = false;
      const calibratedNow = this.getCalibratedNow();

      sorted.forEach((evt) => {
        if (!evt || !evt.id) return;

        const fireTime = Number(evt.scheduledFireTime) || Number(evt.timestamp) || calibratedNow;

        // TTL check: discard events older than 10 mins
        if (calibratedNow - fireTime > TTL_MS) return;

        // Deleted check: discard deleted products/giveaways
        if (evt.type === 'BUY_PRODUCT' && evt.productId) {
          if (deletedStoreSet.has(evt.productId) || deletedUtilSet.has(evt.productId)) {
            this.markNotificationProcessed(evt.id);
            return;
          }
        }
        if (evt.type === 'CLAIM_GIVEAWAY' && evt.giveawayId) {
          if (deletedGwSet.has(evt.giveawayId)) {
            this.markNotificationProcessed(evt.id);
            return;
          }
        }

        evt.scheduledFireTime = fireTime;
        if (!evt.timeAgo || evt.timeAgo.includes('trước')) {
          evt.timeAgo = 'vừa xong';
        }

        // Ensure name and message are masked if config.isNameMasked is active
        evt = this.sanitizeNotificationMasking(evt);

        // Add to authoritative server ledger event queue
        if (!this.serverLedgerEventQueue.some((e) => e && e.id === evt.id)) {
          this.serverLedgerEventQueue.push(evt);
          newEventsAdded = true;
        }

        // Also update recentRealEvents for backwards-compatibility if marked real
        if (evt.isRealUser) {
          const existing = this.recentRealEvents.find((e) => e && e.id === evt.id);
          if (!existing) {
            this.recentRealEvents.push(evt);
          }
        }
      });

      // Keep serverLedgerEventQueue to max 20 events
      if (this.serverLedgerEventQueue.length > 20) {
        this.serverLedgerEventQueue = this.serverLedgerEventQueue.slice(this.serverLedgerEventQueue.length - 20);
      }

      if (newEventsAdded) {
        this.sortAndPruneRealEventQueue();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wcg_new_ledger_events_available'));
          window.dispatchEvent(new CustomEvent('wcg_new_real_events_available'));
        }
      }
    }
  }

  public recordRealCopy(
    gameName: string,
    gameSlug: string = '',
    count: number = 1,
    userOrName?: UserProfile | string | null
  ): void {
    let rawName = '';
    let masked = 'Khách';
    try {
      rawName = this.resolveUserName(userOrName);
      masked = this.maskName(rawName);
    } catch {
      masked = 'Khách';
    }

    // 1. Luôn tăng bộ đếm số lượt sao chép (đếm đủ mọi lần thao tác)
    try {
      this.incrementLiveCounter(count);
    } catch (err) {
      console.warn('[MarketingService] recordRealCopy counter increment error:', err);
    }

    const now = this.getCalibratedNow();
    let event: MarketingNotification | null = null;
    try {
      // 2. Chống spam thông báo: 20 giây tối đa 1 thông báo cho mỗi người dùng (khóa theo tên đã che)
      const cdSec = Math.max(5, Number(this.config.realUserCooldownSec) || 20);
      const cooldownMs = cdSec * 1000;
      const shouldShowToast = this.canDisplayActionNotification(masked, 'COPY_CODE', cooldownMs);

      if (shouldShowToast) {
        this.lastRealCopyToastTime = now;
        event = {
          id: `copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'COPY_CODE',
          title: 'Sao chép mã Giftcode',
          message: `${masked} vừa sao chép ${count > 1 ? `tất cả ${count}` : '1'} mã code cho ${gameName}`,
          timeAgo: 'vừa xong',
          userName: masked,
          gameName,
          gameSlug,
          productId: null as any,
          targetId: null as any,
          isRealUser: true,
          is_simulated: false, // Bắt buộc: boolean false cho sự kiện thật
          timestamp: now,
          scheduledFireTime: now,
        };
        (event as any).localOrigin = true;
        (event as any).isSelfClick = true;
        this.lastSelfClickToastId = event.id;
        this.selfClickToastIds.add(event.id);

        // Nổ luôn lập tức trên màn hình người bấm (0s delay!)
        this.pushRealEvent(event, true, true);
      }
    } catch (toastErr) {
      console.warn('[MarketingService] recordRealCopy toast error:', toastErr);
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'COPY_INCREMENT_BROADCAST',
          payload: { totalCount: this.globalMasterCopyCount, date: this.getTodayDateKey() },
        });
      } catch {}
    }

    try {
      this.schedulePushRealEvent(event, count);
    } catch (pushErr) {
      console.warn('[MarketingService] recordRealCopy schedulePush error:', pushErr);
    }
  }

  public recordRealOrder(
    productTitle: string,
    productId: string,
    price: number,
    itemType: 'store' | 'utility' = 'store',
    userOrName?: UserProfile | string | null,
    quantity: number = 1
  ): void {
    const rawName = this.resolveUserName(userOrName);
    const masked = this.maskName(rawName);

    const now = this.getCalibratedNow();
    const qty = Math.max(1, quantity || 1);
    const event: MarketingNotification = {
      id: `buy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'BUY_PRODUCT',
      title: itemType === 'utility' ? 'Đơn hàng tiện ích' : 'Mua hàng thành công',
      message: `${masked} vừa mua thành công ${qty > 1 ? `${qty}x ` : ''}${productTitle}`,
      timeAgo: 'vừa xong',
      userName: masked,
      productId,
      targetId: productId,
      productName: productTitle,
      productPrice: price,
      itemType,
      isRealUser: true,
      is_simulated: false, // Bắt buộc: boolean false cho sự kiện thật
      timestamp: now,
      scheduledFireTime: now,
    };
    (event as any).localOrigin = true;

    const currentSold = (this.realProductSoldCountsMap.get(productId) || 0) + qty;
    this.realProductSoldCountsMap.set(productId, currentSold);

    // Đồng bộ nguyên tử 1 - 1: Giảm tồn kho hiển thị và tăng số đã bán (bảo toàn vĩnh viễn, không bị hồi số)
    this.decrementProductStock(productId, qty, event.id);
    this.incrementLiveSoldCount(productId, qty, event.id);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STATS_SYNC_BROADCAST',
          payload: { productId, totalSold: currentSold },
        });
      } catch {}
    }

    // Nổ luôn lập tức trên màn hình người bấm (0s delay!)
    this.pushRealEvent(event, true, true);
    this.schedulePushRealEvent(event, 0);
  }

  public recordRealDeposit(amount: number, userOrName?: UserProfile | string | null): void {
    const rawName = this.resolveUserName(userOrName);
    const masked = this.maskName(rawName);

    const now = this.getCalibratedNow();
    const event: MarketingNotification = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'DEPOSIT_WALLET',
      title: 'Nạp tiền vào ví',
      message: `${masked} vừa nạp thành công ${amount.toLocaleString('vi-VN')}đ qua SePay`,
      timeAgo: 'vừa xong',
      userName: masked,
      productId: null as any,
      targetId: null as any,
      depositAmount: amount,
      isRealUser: true,
      is_simulated: false, // Bắt buộc: boolean false cho sự kiện thật
      timestamp: now,
      scheduledFireTime: now,
    };

    // Nổ luôn lập tức trên màn hình người bấm (0s delay!)
    this.pushRealEvent(event, true, true);
    this.schedulePushRealEvent(event, 0);
  }

  public recordRealGiveawayClaim(
    campaignTitle: string,
    campaignId: string,
    gameName?: string,
    gameSlug?: string,
    userOrName?: UserProfile | string | null
  ): void {
    const rawName = this.resolveUserName(userOrName);
    const masked = this.maskName(rawName);

    const now = this.getCalibratedNow();
    const event: MarketingNotification = {
      id: `gw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'CLAIM_GIVEAWAY',
      title: 'Săn Giveaway thành công',
      message: `${masked} vừa nhận mã quà tặng sự kiện ${campaignTitle}`,
      timeAgo: 'vừa xong',
      userName: masked,
      productId: campaignId, // BẮT BUỘC: luôn gán productId cho Giveaway
      targetId: campaignId, // BẮT BUỘC: luôn gán targetId cho Giveaway
      giveawayId: campaignId,
      giveawayTitle: campaignTitle,
      gameName,
      gameSlug,
      itemType: 'giveaway',
      isRealUser: true,
      is_simulated: false, // BẮT BUỘC: boolean false cho sự kiện thật
      timestamp: now,
      scheduledFireTime: now,
    };
    (event as any).localOrigin = true;

    const currentClaimed = (this.realGiveawayClaimedCountsMap.get(campaignId) || 0) + 1;
    this.realGiveawayClaimedCountsMap.set(campaignId, currentClaimed);

    // Đồng bộ nguyên tử 1 - 1: Giảm mã còn lại và tăng số đã giật (bảo toàn vĩnh viễn, không bị hồi số)
    this.decrementProductStock(campaignId, 1, event.id);
    this.incrementLiveClaimedCount(campaignId, 1, event.id);

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STATS_SYNC_BROADCAST',
          payload: { giveawayId: campaignId, totalClaimed: currentClaimed },
        });
      } catch {}
    }

    // Nổ luôn lập tức trên màn hình người bấm (0s delay!)
    this.pushRealEvent(event, true, true);
    this.schedulePushRealEvent(event, 0);
  }

  // --- Vote Simulation Engine ---
  public getSimulatedVotes(codeValue: string, isExpiredStatus: boolean = false): { up: number; down: number } {
    const vc = this.config.voteConfig || DEFAULT_MARKETING_CONFIG.voteConfig;
    if (vc.enabled === false) {
      return { up: 0, down: 0 };
    }
    const clean = (codeValue || '').trim().toUpperCase();

    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash * 31 + clean.charCodeAt(i)) & 0xffffffff;
    }
    const absHash = Math.abs(hash);

    const minV = Math.max(10, vc.baseVotesMin || 45);
    const maxV = Math.max(minV, vc.baseVotesMax || 180);
    const totalVotes = minV + (absHash % (maxV - minV + 1));

    let activePercent = vc.activeRate || 96;
    const variance = Math.max(0, vc.variance || 2);
    const jitter = (absHash % (variance * 2 + 1)) - variance;
    activePercent = Math.min(99, Math.max(60, activePercent + jitter));

    if (isExpiredStatus) {
      const down = Math.max(1, Math.round((totalVotes * activePercent) / 100));
      const up = Math.max(0, totalVotes - down);
      return { up, down };
    }

    const up = Math.max(1, Math.round((totalVotes * activePercent) / 100));
    const down = Math.max(0, totalVotes - up);
    return { up, down };
  }

  // --- Globally Synchronized Notification Engine for Slot ---
  /**
   * @deprecated Zero callers in live flow.
   * Giữ lại làm fallback/tương thích ngược và phục vụ nút bấm "Bắn thử thông báo" từ Admin UI.
   * Trong luồng tự động của khách hàng, sự kiện được phát ra trực tiếp từ Server SSOT Ledger (/api/realtime-events).
   */
  public getDeterministicNotification(
    slotIndexOrTimestampMs: number,
    games: GameItem[],
    storeProducts: StoreProduct[],
    inventory: any[],
    utilityProducts: UtilityProduct[] = [],
    giveaways: GiveawayCampaign[] = []
  ): { notif: MarketingNotification; slotIndex: number; fireTimeMs: number; displayDurationMs: number } | null {
    if (!this.config.isEnabled) return null;

    const isTimestamp = slotIndexOrTimestampMs > 10000000000;
    const now = isTimestamp ? slotIndexOrTimestampMs : this.getCalibratedNow();
    const slotDurationMs = this.getSlotDurationMs(now);
    const slotIndex = isTimestamp ? Math.floor(now / slotDurationMs) : Math.floor(slotIndexOrTimestampMs);
    const slotStartMs = slotIndex * slotDurationMs;
    const displayDurationMs = Math.max(3, this.config.displayDuration || 5) * 1000;

    // Deterministic Pseudo-Random Engine (Hàm ngẫu nhiên tất định theo thời gian vũ trụ)
    // PRNG dựa trên Dòng thời gian Unix UTC (Coordinated Universal Time — Giờ Vũ trụ Phối hợp)
    // slotSeed dựa trên mốc thời gian vũ trụ slotIndex (32-bit golden ratio & MurmurHash3 avalanche)
    const slotSeed = (Math.imul(slotIndex, 0x9e3779b9) ^ 0x85ebca6b) >>> 0;
    const rng = createPRNG(slotSeed);

    // Exact fire time within this slot
    const maxJitter = Math.min(4000, Math.max(1000, slotDurationMs - displayDurationMs - 2000));
    const jitterMs = Math.floor(rng() * maxJitter);
    const fireTimeMs = slotStartMs + 1500 + jitterMs;

    // Deterministic selection by probability among ENABLED types according to Admin weights:
    const canCopy = this.isTypeEnabled('COPY_CODE');
    const canStore = this.config.typeToggles?.buyStore !== false;
    const canUtil = this.config.typeToggles?.buyUtility !== false;
    const canBuy = (canStore || canUtil) && (this.config.typeToggles?.buyProduct !== false);
    const canGw = this.isTypeEnabled('CLAIM_GIVEAWAY');
    const canDep = this.isTypeEnabled('DEPOSIT_WALLET');
    const canStats = this.isTypeEnabled('STATS_COPY');
    const canRestock = this.isTypeEnabled('RESTOCK_PRODUCT');

    const cfgWeights = {
      ...DEFAULT_TYPE_WEIGHTS,
      ...(this.config.typeWeights || {}),
    };

    const copyWeight = Math.max(0, Number(cfgWeights.copyCode) || 0);
    const storeWeight = Math.max(0, Number(cfgWeights.buyStore) || 0);
    const utilWeight = Math.max(0, Number(cfgWeights.buyUtility) || 0);
    const buyWeight = (canStore ? storeWeight : 0) + (canUtil ? utilWeight : 0);
    const gwWeight = Math.max(0, Number(cfgWeights.claimGiveaway) || 0);
    const depWeight = Math.max(0, Number(cfgWeights.depositWallet) || 0);
    const statsWeight = Math.max(0, Number(cfgWeights.statsCopy) || 0);
    const restockWeight = Math.max(0, Number(cfgWeights.restockProduct) || 0);

    const candidates: { type: NotificationType; weight: number }[] = [];
    if (canCopy && copyWeight > 0) candidates.push({ type: 'COPY_CODE', weight: copyWeight });
    if (canBuy && buyWeight > 0) candidates.push({ type: 'BUY_PRODUCT', weight: buyWeight });
    if (canGw && gwWeight > 0) candidates.push({ type: 'CLAIM_GIVEAWAY', weight: gwWeight });
    if (canDep && depWeight > 0) candidates.push({ type: 'DEPOSIT_WALLET', weight: depWeight });
    if (canStats && statsWeight > 0) candidates.push({ type: 'STATS_COPY', weight: statsWeight });
    if (canRestock && restockWeight > 0) candidates.push({ type: 'RESTOCK_PRODUCT', weight: restockWeight });

    // Fallback nếu các loại đang bật nhưng vô tình bị đặt weight = 0
    if (candidates.length === 0) {
      if (canCopy) candidates.push({ type: 'COPY_CODE', weight: 1 });
      if (canBuy) candidates.push({ type: 'BUY_PRODUCT', weight: 1 });
      if (canGw) candidates.push({ type: 'CLAIM_GIVEAWAY', weight: 1 });
      if (canDep) candidates.push({ type: 'DEPOSIT_WALLET', weight: 1 });
      if (canStats) candidates.push({ type: 'STATS_COPY', weight: 1 });
      if (canRestock) candidates.push({ type: 'RESTOCK_PRODUCT', weight: 1 });
    }

    if (candidates.length === 0) {
      // Tất cả các loại thông báo đều bị Admin tắt hoàn toàn
      return null;
    }

    const totalCandidateWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let chosenType: NotificationType = candidates[0].type;
    let weightRoll = rng() * totalCandidateWeight;
    for (const c of candidates) {
      if (weightRoll < c.weight) {
        chosenType = c.type;
        break;
      }
      weightRoll -= c.weight;
    }

    // Pick user deterministically using a globally synchronized Shuffle Deck across all configured virtual accounts
    const accounts = Array.isArray(this.config.virtualAccounts) && this.config.virtualAccounts.length > 0
      ? this.config.virtualAccounts
      : PRESET_VIRTUAL_ACCOUNTS;
    const userIdx = this.getDeterministicAccountIndex(slotIndex, accounts.length);
    const rawUser = accounts[userIdx];
    const maskedUser = this.maskName(rawUser);

    const timeAgo = this.getRandomTimeAgo(rng);

    // 1. STATS_COPY
    if (chosenType === 'STATS_COPY') {
      const count = this.getLiveCopyCount(fireTimeMs);
      return {
        notif: {
          id: `slot_stats_${slotIndex}`,
          type: 'STATS_COPY',
          title: 'Thống kê sôi động',
          message: `Hệ thống vừa ghi nhận ${count.toLocaleString('vi-VN')} lượt sao chép giftcode hôm nay!`,
          timeAgo: 'vừa xong',
          totalCopiesCount: count,
          timestamp: fireTimeMs,
        },
        slotIndex,
        fireTimeMs,
        displayDurationMs,
      };
    }

    const getActiveDepositPresets = (): number[] => {
      const presets = this.config.depositNotificationPresets;
      if (Array.isArray(presets) && presets.length > 0) {
        const valid = presets.filter((p) => typeof p === 'number' && p > 0);
        if (valid.length > 0) return valid;
      }
      return DEFAULT_DEPOSIT_PRESETS;
    };

    const buildDepositSlotResult = () => {
      const presets = getActiveDepositPresets();
      const amount = presets[Math.floor(rng() * presets.length)];
      return {
        notif: {
          id: `slot_dep_${slotIndex}`,
          type: 'DEPOSIT_WALLET' as const,
          title: 'Nạp tiền ví thành công',
          message: `${maskedUser} vừa nạp thành công ${amount.toLocaleString('vi-VN')}đ vào ví Core`,
          timeAgo,
          userName: maskedUser,
          depositAmount: amount,
          timestamp: fireTimeMs,
        },
        slotIndex,
        fireTimeMs,
        displayDurationMs,
      };
    };

    // 2. DEPOSIT_WALLET
    if (chosenType === 'DEPOSIT_WALLET') {
      return buildDepositSlotResult();
    }

    // 3. CLAIM_GIVEAWAY
    if (chosenType === 'CLAIM_GIVEAWAY') {
      let deletedGwSet = new Set<string>();
      try {
        if (typeof window !== 'undefined') {
          const rawDelGw = localStorage.getItem('wcg_deleted_giveaways');
          if (rawDelGw) {
            const parsed = JSON.parse(rawDelGw);
            if (Array.isArray(parsed)) deletedGwSet = new Set(parsed);
          }
        }
      } catch {}

      const eligibleGiveaways = (Array.isArray(giveaways) ? giveaways : [])
        .filter((gw) => {
          if (!gw || gw.is_active === false) return false;
          if (deletedGwSet.has(gw.id)) return false;
          const realStock = Array.isArray(gw.codes_pool) && gw.codes_pool.length > 0
            ? gw.codes_pool.length
            : (typeof gw.remaining_codes === 'number' ? Math.max(0, gw.remaining_codes) : 0);
          // CRITICAL ADMIN RULE: Hết hàng thật trong kho hoặc dưới minRealStock = Tắt hoàn toàn thông báo ảo
          if (realStock <= 0) return false;
          const pw = this.getProductConfig(gw.id);
          if (pw.priority === 'off') return false;
          if (realStock < this.getMinRealStock(gw.id)) return false;
          return true;
        })
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));

      if (eligibleGiveaways.length > 0) {
        // Áp dụng trọng số ưu tiên đã cấu hình trong Admin:
        // 'high' (x5): xuất hiện gấp 5 lần, 'normal' (x2): xuất hiện 2 lần, 'low' (x1): 1 lần
        const weightedGws: GiveawayCampaign[] = [];
        eligibleGiveaways.forEach((gw) => {
          const pw = this.getProductConfig(gw.id);
          const weight = pw.priority === 'high' ? 5 : pw.priority === 'low' ? 1 : 2;
          for (let w = 0; w < weight; w++) {
            weightedGws.push(gw);
          }
        });
        const selectedGw = weightedGws[Math.floor(rng() * weightedGws.length)] || eligibleGiveaways[0];
        return {
          notif: {
            id: `slot_gw_${slotIndex}`,
            type: 'CLAIM_GIVEAWAY',
            title: 'Săn Giveaway thành công',
            message: `${maskedUser} vừa nhận mã quà tặng sự kiện ${selectedGw.title}`,
            timeAgo,
            userName: maskedUser,
            giveawayId: selectedGw.id,
            giveawayTitle: selectedGw.title,
            gameName: selectedGw.game_name,
            gameSlug: selectedGw.game_slug,
            itemType: 'giveaway',
            timestamp: fireTimeMs,
          },
          slotIndex,
          fireTimeMs,
          displayDurationMs,
        };
      }
      
      // Fallback nếu không có Giveaway hợp lệ
      if (canBuy) chosenType = 'BUY_PRODUCT';
      else if (canCopy) chosenType = 'COPY_CODE';
      else if (canDep) return buildDepositSlotResult();
      else if (canStats) chosenType = 'STATS_COPY';
      else return null;
    }

    // 4. BUY_PRODUCT
    if (chosenType === 'BUY_PRODUCT') {
      let deletedStoreSet = new Set<string>();
      let deletedUtilSet = new Set<string>();
      try {
        if (typeof window !== 'undefined') {
          const rawDelSp = localStorage.getItem('wcg_deleted_store_products');
          if (rawDelSp) {
            const parsed = JSON.parse(rawDelSp);
            if (Array.isArray(parsed)) deletedStoreSet = new Set(parsed);
          }
          const rawDelUt = localStorage.getItem('wcg_deleted_utilities');
          if (rawDelUt) {
            const parsed = JSON.parse(rawDelUt);
            if (Array.isArray(parsed)) deletedUtilSet = new Set(parsed);
          }
        }
      } catch {}

      const eligibleStoreProds = canStore
        ? (Array.isArray(storeProducts) ? storeProducts : [])
            .filter((p) => {
              if (!p || p.is_active === false) return false;
              if (deletedStoreSet.has(p.id)) return false;
              const realStock = Number(p.stock_quantity) || 0;
              // CRITICAL ADMIN RULE: Hết hàng thật hoặc dưới minRealStock = Tắt thông báo ảo
              if (realStock <= 0) return false;
              const pw = this.getProductConfig(p.id);
              if (pw.priority === 'off') return false;
              if (realStock < this.getMinRealStock(p.id)) return false;
              return true;
            })
            .map((p) => ({
              id: p.id,
              title: p.title,
              price: Number(p.current_price ?? (p as any).price ?? 0),
              itemType: 'store' as const,
            }))
        : [];

      const eligibleUtilityProds = canUtil
        ? (Array.isArray(utilityProducts) ? utilityProducts : [])
            .filter((u) => {
              if (!u || u.is_active === false) return false;
              if (deletedUtilSet.has(u.id)) return false;
              const realStock = Number(u.stock_quantity) || 0;
              // CRITICAL ADMIN RULE: Hết hàng thật hoặc dưới minRealStock = Tắt thông báo ảo
              if (realStock <= 0) return false;
              const pw = this.getProductConfig(u.id);
              if (pw.priority === 'off') return false;
              if (realStock < this.getMinRealStock(u.id)) return false;
              return true;
            })
            .map((u) => ({
              id: u.id,
              title: u.title,
              price: Number(u.current_price ?? (u as any).price ?? 0),
              itemType: 'utility' as const,
            }))
        : [];

      const allEligible = [...eligibleStoreProds, ...eligibleUtilityProds].sort((a, b) => String(a.id).localeCompare(String(b.id)));

      if (allEligible.length > 0) {
        // Áp dụng trọng số ưu tiên đã cấu hình trong Admin:
        // 'high' (x5): xuất hiện gấp 5 lần, 'normal' (x2): xuất hiện 2 lần, 'low' (x1): 1 lần
        const weightedItems: typeof allEligible = [];
        allEligible.forEach((item) => {
          const pw = this.getProductConfig(item.id);
          const priorityWeight = pw.priority === 'high' ? 5 : pw.priority === 'low' ? 1 : 2;
          const categoryRatio = item.itemType === 'utility' ? (utilWeight > 0 ? utilWeight : 10) : (storeWeight > 0 ? storeWeight : 25);
          const weight = Math.max(1, Math.round(priorityWeight * (categoryRatio / 10)));
          for (let w = 0; w < weight; w++) {
            weightedItems.push(item);
          }
        });
        const selectedItem = weightedItems[Math.floor(rng() * weightedItems.length)] || allEligible[0];
        let displayTitle = selectedItem.title;
        if (selectedItem.itemType === 'utility' && selectedItem.id.startsWith('ut_vs_')) {
          const vsTitles: Record<string, string> = {
            'ut_vs_01_basic_1d': 'Cloud Phone VS Phone Basic (Gói 1 Ngày)',
            'ut_vs_02_basic_7d': 'Cloud Phone VS Phone Basic (Gói 7 Ngày)',
            'ut_vs_03_basic_30d': 'Cloud Phone VS Phone Basic (Gói 30 Ngày)',
            'ut_vs_04_vip_1d': 'Cloud Phone VS Phone VIP (Gói 1 Ngày)',
            'ut_vs_05_vip_7d': 'Cloud Phone VS Phone VIP (Gói 7 Ngày)',
            'ut_vs_06_vip_30d': 'Cloud Phone VS Phone VIP (Gói 30 Ngày)',
            'ut_vs_07_kvip_1d': 'Cloud Phone VS Phone KVIP (Gói 1 Ngày)',
            'ut_vs_08_kvip_7d': 'Cloud Phone VS Phone KVIP (Gói 7 Ngày)',
            'ut_vs_09_kvip_30d': 'Cloud Phone VS Phone KVIP (Gói 30 Ngày)',
            'ut_vs_10_svip_1d': 'Cloud Phone VS Phone SVIP (Gói 1 Ngày)',
            'ut_vs_11_svip_7d': 'Cloud Phone VS Phone SVIP (Gói 7 Ngày)',
            'ut_vs_12_svip_30d': 'Cloud Phone VS Phone SVIP (Gói 30 Ngày)',
            'ut_vs_13_xvip_1d': 'Cloud Phone VS Phone XVIP (Gói 1 Ngày)',
            'ut_vs_14_xvip_7d': 'Cloud Phone VS Phone XVIP (Gói 7 Ngày)',
            'ut_vs_15_xvip_30d': 'Cloud Phone VS Phone XVIP (Gói 30 Ngày)',
            'ut_vs_16_mvip_1d': 'Cloud Phone VS Phone MVIP (Gói 1 Ngày)',
            'ut_vs_17_mvip_7d': 'Cloud Phone VS Phone MVIP (Gói 7 Ngày)',
            'ut_vs_18_mvip_30d': 'Cloud Phone VS Phone MVIP (Gói 30 Ngày)',
          };
          if (vsTitles[selectedItem.id]) {
            displayTitle = vsTitles[selectedItem.id];
          }
        }
        return {
          notif: {
            id: `slot_buy_${slotIndex}`,
            type: 'BUY_PRODUCT',
            title: selectedItem.itemType === 'utility' ? 'Đơn hàng tiện ích' : 'Đơn hàng mới',
            message: `${maskedUser} vừa mua thành công ${displayTitle}`,
            timeAgo,
            userName: maskedUser,
            productId: selectedItem.id,
            productName: displayTitle,
            productPrice: selectedItem.price,
            itemType: selectedItem.itemType,
            timestamp: fireTimeMs,
          },
          slotIndex,
          fireTimeMs,
          displayDurationMs,
        };
      }

      // Fallback nếu không có sản phẩm Store/Utility hợp lệ
      if (canCopy) chosenType = 'COPY_CODE';
      else if (canDep) {
        return buildDepositSlotResult();
      } else if (canStats) {
        const count = this.getLiveCopyCount(fireTimeMs);
        return {
          notif: {
            id: `slot_stats_${slotIndex}`,
            type: 'STATS_COPY',
            title: 'Thống kê sôi động',
            message: `Hệ thống vừa ghi nhận ${count.toLocaleString('vi-VN')} lượt sao chép giftcode hôm nay!`,
            timeAgo: 'vừa xong',
            totalCopiesCount: count,
            timestamp: fireTimeMs,
          },
          slotIndex,
          fireTimeMs,
          displayDurationMs,
        };
      } else {
        return null;
      }
    }

    // 5. COPY_CODE
    if (chosenType === 'COPY_CODE') {
      const validGames = (Array.isArray(games) ? games : [])
        .filter((g) => g && ((g.codes_count || 0) > 0 || (g.codes && g.codes.length > 0)))
        .sort((a, b) => String(a.slug || a.id).localeCompare(String(b.slug || b.id)));

      if (validGames.length > 0) {
        const chosenGame = validGames[Math.floor(rng() * validGames.length)];
        const gameName = chosenGame?.name || 'Free Fire';
        const gameSlug = chosenGame?.slug || 'free-fire';

        return {
          notif: {
            id: `slot_copy_${slotIndex}`,
            type: 'COPY_CODE',
            title: 'Sao chép mã Giftcode',
            message: `${maskedUser} vừa sao chép 1 Giftcode game ${gameName}`,
            timeAgo,
            userName: maskedUser,
            gameName: gameName,
            gameSlug: gameSlug,
            timestamp: fireTimeMs,
          },
          slotIndex,
          fireTimeMs,
          displayDurationMs,
        };
      }

      // Fallback nếu không có game nào có code
      if (canDep) {
        return buildDepositSlotResult();
      }
    }

    // 6. RESTOCK_PRODUCT (Thông báo Bổ sung tồn kho)
    if (chosenType === 'RESTOCK_PRODUCT') {
      let deletedStoreSet = new Set<string>();
      let deletedUtilSet = new Set<string>();
      let deletedGwSet = new Set<string>();
      try {
        if (typeof window !== 'undefined') {
          const rawDelSp = localStorage.getItem('wcg_deleted_store_products');
          if (rawDelSp) deletedStoreSet = new Set(JSON.parse(rawDelSp));
          const rawDelUt = localStorage.getItem('wcg_deleted_utilities');
          if (rawDelUt) deletedUtilSet = new Set(JSON.parse(rawDelUt));
          const rawDelGw = localStorage.getItem('wcg_deleted_giveaways');
          if (rawDelGw) deletedGwSet = new Set(JSON.parse(rawDelGw));
        }
      } catch {}

      const restockCandidates: { id: string; title: string; itemType: 'store' | 'utility' | 'giveaway' }[] = [];

      // QUY TẮC BẮT BUỘC TỪ NGƯỜI DÙNG: Chỉ thông báo những mục còn hàng đang bán trên web
      if (canStore) {
        (Array.isArray(storeProducts) ? storeProducts : []).forEach((p) => {
          if (p && p.is_active !== false && !deletedStoreSet.has(p.id)) {
            const realStock = Number(p.stock_quantity) || 0;
            if (realStock <= 0) return;
            const pw = this.getProductConfig(p.id);
            if (pw.priority === 'off') return;
            if (realStock < this.getMinRealStock(p.id)) return;
            const displayStock = this.getDisplayStock(p.id, realStock);
            if (displayStock <= 0) return;

            restockCandidates.push({ id: p.id, title: p.title, itemType: 'store' });
          }
        });
      }

      if (canUtil) {
        (Array.isArray(utilityProducts) ? utilityProducts : []).forEach((u) => {
          if (u && u.is_active !== false && !deletedUtilSet.has(u.id)) {
            const realStock = Number(u.stock_quantity) || 0;
            if (realStock <= 0) return;
            const pw = this.getProductConfig(u.id);
            if (pw.priority === 'off') return;
            if (realStock < this.getMinRealStock(u.id)) return;
            const displayStock = this.getDisplayStock(u.id, realStock);
            if (displayStock <= 0) return;

            restockCandidates.push({ id: u.id, title: u.title, itemType: 'utility' });
          }
        });
      }

      if (canGw) {
        (Array.isArray(giveaways) ? giveaways : []).forEach((g) => {
          const isAct = g && g.is_active !== 0 && g.is_active !== false && g.is_active !== '0' && g.status !== 'PAUSED' && g.status !== 'CLOSED' && g.status !== 'ENDED';
          if (isAct && !deletedGwSet.has(g.id)) {
            const realStock = Array.isArray(g.codes_pool) && g.codes_pool.length > 0
              ? g.codes_pool.length
              : (typeof g.remaining_codes === 'number' ? Math.max(0, g.remaining_codes) : 0);
            if (realStock <= 0) return;
            const pw = this.getProductConfig(g.id);
            if (pw.priority === 'off') return;
            if (realStock < this.getMinRealStock(g.id)) return;
            const displayStock = this.getDisplayStock(g.id, realStock);
            if (displayStock <= 0) return;

            restockCandidates.push({ id: g.id, title: g.title, itemType: 'giveaway' });
          }
        });
      }

      if (restockCandidates.length > 0) {
        restockCandidates.sort((a, b) => String(a.id).localeCompare(String(b.id)));

        // Áp dụng trọng số ưu tiên đã cấu hình trong Admin:
        // 'high' (x5): xuất hiện gấp 5 lần, 'normal' (x2): xuất hiện 2 lần, 'low' (x1): 1 lần
        const weightedCandidates: typeof restockCandidates = [];
        restockCandidates.forEach((cand) => {
          const pw = this.getProductConfig(cand.id);
          const priorityWeight = pw.priority === 'high' ? 5 : pw.priority === 'low' ? 1 : 2;
          const categoryRatio = cand.itemType === 'utility'
            ? (utilWeight > 0 ? utilWeight : 10)
            : cand.itemType === 'giveaway'
            ? (gwWeight > 0 ? gwWeight : 20)
            : (storeWeight > 0 ? storeWeight : 25);
          const weight = Math.max(1, Math.round(priorityWeight * (categoryRatio / 10)));
          for (let w = 0; w < weight; w++) {
            weightedCandidates.push(cand);
          }
        });

        const selected = weightedCandidates[Math.floor(rng() * weightedCandidates.length)] || restockCandidates[0];
        const pw = this.getProductConfig(selected.id);
        const restockAmount = Math.max(5, Number(pw.autoRestockAmount) || 20);

        return {
          notif: {
            id: `slot_restock_${slotIndex}`,
            type: 'RESTOCK_PRODUCT',
            title: selected.itemType === 'giveaway' ? 'Nạp thêm mã quà tặng' : 'Bổ sung tồn kho',
            message: selected.itemType === 'giveaway'
              ? `Sự kiện ${selected.title} vừa được nạp thêm +${restockAmount} mã quà tặng mới!`
              : `Kho hàng vừa bổ sung thêm +${restockAmount} ${selected.title}!`,
            timeAgo,
            userName: 'Hệ thống',
            productId: selected.id,
            productName: selected.title,
            giveawayId: selected.itemType === 'giveaway' ? selected.id : undefined,
            giveawayTitle: selected.itemType === 'giveaway' ? selected.title : undefined,
            restockAmount,
            itemType: selected.itemType,
            timestamp: fireTimeMs,
          },
          slotIndex,
          fireTimeMs,
          displayDurationMs,
        };
      }

      // Fallback nếu không có mục nào còn hàng đang bán trên web
      if (canCopy) chosenType = 'COPY_CODE';
      else if (canBuy) chosenType = 'BUY_PRODUCT';
      else if (canGw) chosenType = 'CLAIM_GIVEAWAY';
      else if (canDep) return buildDepositSlotResult();
      else if (canStats) chosenType = 'STATS_COPY';
      else return null;
    }

    return null;
  }

  // Backwards compatibility generator
  /**
   * @deprecated Zero callers in live flow.
   * Giữ lại làm fallback/tương thích ngược và phục vụ nút bấm "Bắn thử thông báo" từ Admin UI.
   * Trong luồng tự động của khách hàng, sự kiện được phát ra trực tiếp từ Server SSOT Ledger (/api/realtime-events).
   */
  public generateNextNotification(
    games: GameItem[],
    storeProducts: StoreProduct[],
    inventory: any[],
    utilityProducts: UtilityProduct[] = [],
    giveaways: GiveawayCampaign[] = []
  ): MarketingNotification | null {
    if (!this.config.isEnabled) return null;
    if (this.recentRealEvents.length > 0) {
      return this.recentRealEvents.shift()!;
    }
    const now = this.getCalibratedNow();
    const slotData = this.getDeterministicNotification(now, games, storeProducts, inventory, utilityProducts, giveaways);
    return slotData?.notif || null;
  }

  public subscribeNotification(callback: (notif: MarketingNotification | null) => void): () => void {
    this.notificationListeners.add(callback);
    return () => this.notificationListeners.delete(callback);
  }

  // --- Configuration Management ---
  private loadConfig(): MarketingConfig {
    if (typeof window === 'undefined') return DEFAULT_MARKETING_CONFIG;
    try {
      const saved = localStorage.getItem(MARKETING_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validPresets = Array.isArray(parsed.depositNotificationPresets) && parsed.depositNotificationPresets.length > 0
          ? parsed.depositNotificationPresets.filter((p: any) => typeof p === 'number' && p > 0)
          : DEFAULT_DEPOSIT_PRESETS;
        const loadedWeights = { ...DEFAULT_TYPE_WEIGHTS, ...(parsed.typeWeights || {}) };
        if (!parsed.typeWeights || parsed.typeWeights.buyUtility === undefined || parsed.typeWeights.buyUtility <= 10) {
          loadedWeights.buyUtility = DEFAULT_TYPE_WEIGHTS.buyUtility;
        }
        if (!parsed.typeWeights || parsed.typeWeights.copyCode === undefined || parsed.typeWeights.copyCode >= 40) {
          loadedWeights.copyCode = DEFAULT_TYPE_WEIGHTS.copyCode;
        }
        return {
          ...DEFAULT_MARKETING_CONFIG,
          ...parsed,
          toastPosition: parsed.toastPosition || 'bottom-left',
          depositNotificationPresets: (validPresets.length > 0) ? validPresets : DEFAULT_DEPOSIT_PRESETS,
          typeToggles: { ...DEFAULT_TYPE_TOGGLES, ...(parsed.typeToggles || {}) },
          typeWeights: loadedWeights,
          peakHours: { ...DEFAULT_MARKETING_CONFIG.peakHours, ...(parsed.peakHours || {}) },
          voteConfig: { ...DEFAULT_MARKETING_CONFIG.voteConfig, ...(parsed.voteConfig || {}) },
          timeAgoConfig: { ...DEFAULT_MARKETING_CONFIG.timeAgoConfig, ...(parsed.timeAgoConfig || {}) },
          offlineCatchUp: { ...DEFAULT_OFFLINE_CATCHUP_CONFIG, ...(parsed.offlineCatchUp || {}) },
          virtualAccounts: Array.isArray(parsed.virtualAccounts) && parsed.virtualAccounts.length > 0
            ? parsed.virtualAccounts
            : PRESET_VIRTUAL_ACCOUNTS,
        };
      }
    } catch (e) {
      console.warn('[MarketingService] Failed to parse config, using defaults', e);
    }
    return DEFAULT_MARKETING_CONFIG;
  }

  private setupStorageListener(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
      if ((e.key === 'wcg_global_master_copy_count_v1' || e.key === 'wcg_marketing_daily_max_copy_v1') && e.newValue) {
        try {
          let val = 0;
          if (e.newValue.startsWith('{')) {
            const p = JSON.parse(e.newValue);
            if (p && typeof p.count === 'number') val = p.count;
          } else {
            val = parseInt(e.newValue, 10);
          }
          if (!isNaN(val) && val > this.globalMasterCopyCount) {
            this.globalMasterCopyCount = val;
            this.dailyMaxCopyCount = val;
            this.broadcastCurrentCount();
          }
        } catch {}
      }
      if (e.key === MARKETING_CONFIG_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const validPresets = Array.isArray(parsed.depositNotificationPresets) && parsed.depositNotificationPresets.length > 0
            ? parsed.depositNotificationPresets.filter((p: any) => typeof p === 'number' && p > 0)
            : DEFAULT_DEPOSIT_PRESETS;
          this.config = {
            ...DEFAULT_MARKETING_CONFIG,
            ...parsed,
            toastPosition: parsed.toastPosition || 'bottom-left',
            depositNotificationPresets: (validPresets.length > 0) ? validPresets : DEFAULT_DEPOSIT_PRESETS,
            typeToggles: {
              ...DEFAULT_TYPE_TOGGLES,
              ...(parsed.typeToggles || {}),
            },
            typeWeights: {
              ...DEFAULT_TYPE_WEIGHTS,
              ...(parsed.typeWeights || {}),
              buyUtility: (!parsed.typeWeights || parsed.typeWeights.buyUtility === undefined || parsed.typeWeights.buyUtility <= 10)
                ? DEFAULT_TYPE_WEIGHTS.buyUtility
                : parsed.typeWeights.buyUtility,
            },
            offlineCatchUp: {
              ...DEFAULT_OFFLINE_CATCHUP_CONFIG,
              ...(parsed.offlineCatchUp || {}),
            },
          };
        } catch {}
      }
      if (e.key === MARKETING_VIRTUAL_STOCK_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'number' && !isNaN(v)) {
                this.liveVirtualStockMap.set(k, v);
              }
            });
            this.stockListeners.forEach((cb) => {
              try { cb('', 0); } catch {}
            });
            window.dispatchEvent(new CustomEvent('wcg_virtual_stock_updated', { detail: {} }));
          }
        } catch {}
      }
      if (e.key === MARKETING_FOMO_SOLD_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'number' && !isNaN(v)) {
                this.liveFomoSoldCountMap.set(k, v);
              }
            });
            this.notifySoldCountChanged('*', 0);
          }
        } catch {}
      }
      if (e.key === MARKETING_FOMO_CLAIMED_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'number' && !isNaN(v)) {
                this.liveFomoClaimedCountMap.set(k, v);
              }
            });
            this.notifySoldCountChanged('*', 0);
          }
        } catch {}
      }
      if (e.key === MARKETING_HIGH_WATER_SOLD_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            let changed = false;
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'number' && !isNaN(v)) {
                const cur = this.highWaterSoldCountMap.get(k) || 0;
                if (v > cur) {
                  this.highWaterSoldCountMap.set(k, v);
                  changed = true;
                }
              }
            });
            if (changed) this.notifySoldCountChanged('*', 0);
          }
        } catch {}
      }
      if (e.key === MARKETING_HIGH_WATER_CLAIMED_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            let changed = false;
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'number' && !isNaN(v)) {
                const cur = this.highWaterClaimedCountMap.get(k) || 0;
                if (cur !== v) {
                  this.highWaterClaimedCountMap.set(k, v);
                  changed = true;
                }
              }
            });
            if (changed) this.notifySoldCountChanged('*', 0);
          }
        } catch {}
      }
      if (e.key === MARKETING_HOURLY_SERVER_STATS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed.products === 'object') {
            Object.entries(parsed.products).forEach(([k, v]) => {
              this.hourlyServerStatsMap.set(k, v);
            });
            this.notifySoldCountChanged('*', 0);
          }
        } catch {}
      }
      if (e.key === MARKETING_FOMO_SESSION_ANCHOR_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([k, v]: [string, any]) => {
              if (v && typeof v.lastCount === 'number' && typeof v.lastTimestamp === 'number') {
                this.sessionAnchorMap.set(k, {
                  lastCount: Number(v.lastCount) || 0,
                  lastTimestamp: Number(v.lastTimestamp) || Date.now(),
                });
              }
            });
          }
        } catch {}
      }
      if (
        e.key === 'wcg_admin_utilities_v4' ||
        e.key === 'wcg_admin_store_products_v4' ||
        e.key === 'wcg_admin_giveaways_v4' ||
        e.key === 'wcg_admin_inventory_v4'
      ) {
        this.clearRealStockCache();
        this.notifyStockChanged('*', 0);
      }
    });

    if (typeof window !== 'undefined') {
      const handleInventoryReset = () => {
        this.clearRealStockCache();
        this.notifyStockChanged('*', 0);
      };
      window.addEventListener('wcg_admin_data_updated', handleInventoryReset);
      window.addEventListener('wcg_data_updated', handleInventoryReset);
      window.addEventListener('beforeunload', () => {
        this.flushPendingCopyPush();
        this.flushSessionAnchor();
      });
      window.addEventListener('pagehide', () => {
        this.flushPendingCopyPush();
        this.flushSessionAnchor();
      });
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushPendingCopyPush();
          this.flushSessionAnchor();
        } else if (document.visibilityState === 'visible') {
          this.applyOfflineCatchUp();
        }
      });
    }

    window.addEventListener('wcg_marketing_config_updated', (e: any) => {
      if (e.detail && typeof e.detail === 'object') {
        this.config = {
          ...DEFAULT_MARKETING_CONFIG,
          ...e.detail,
          typeToggles: {
            ...DEFAULT_TYPE_TOGGLES,
            ...(e.detail.typeToggles || {}),
          },
          offlineCatchUp: {
            ...DEFAULT_OFFLINE_CATCHUP_CONFIG,
            ...(e.detail.offlineCatchUp || {}),
          },
        };
      } else {
        this.config = this.loadConfig();
      }

      // Re-align high water marks if productWeights contains explicit target
      if (this.config.productWeights && typeof this.config.productWeights === 'object') {
        Object.entries(this.config.productWeights).forEach(([id, pw]: [string, any]) => {
          if (!pw) return;
          if (typeof pw.targetDisplaySoldOrClaimed === 'number') {
            if (id.startsWith('gw_')) {
              this.highWaterClaimedCountMap.set(id, pw.targetDisplaySoldOrClaimed);
              this.notifySoldCountChanged(id, pw.targetDisplaySoldOrClaimed);
            } else {
              this.highWaterSoldCountMap.set(id, pw.targetDisplaySoldOrClaimed);
              this.notifySoldCountChanged(id, pw.targetDisplaySoldOrClaimed);
            }
          }
        });
        this.saveHighWaterCounts();
      }

      this.startSnapshotPoller();
      this.notifyStockChanged('*', 0);
      this.notifySoldCountChanged('*', 0);
    });

    window.addEventListener('wcg_utilities_updated', (e: any) => {
      const list = Array.isArray(e.detail) ? e.detail : [];
      let changed = false;
      list.forEach((u: any) => {
        if (u && u.id && u.virtual_sold_count !== undefined) {
          const realSold = Number(u.sold_count) || 0;
          const target = realSold + Number(u.virtual_sold_count || 0);
          const cur = this.highWaterSoldCountMap.get(u.id) || 0;
          // BẢO TOÀN ĐƠN ĐIỆU TUYỆT ĐỐI: Không bao giờ kéo giật lùi đỉnh đã bán tích lũy của sản phẩm
          const nextVal = Math.max(cur, target);
          this.highWaterSoldCountMap.set(u.id, nextVal);
          this.liveFomoSoldCountMap.set(u.id, Math.max(0, nextVal - realSold));
          this.notifySoldCountChanged(u.id, nextVal);
          changed = true;
        }
      });
      if (changed) {
        this.saveHighWaterCounts();
        this.saveLiveFomoCounts();
      }
    });

    window.addEventListener('wcg_giveaways_updated', (e: any) => {
      const list = Array.isArray(e.detail) ? e.detail : [];
      let changed = false;
      list.forEach((gw: any) => {
        if (gw && gw.id && gw.virtual_claimed_offset !== undefined) {
          const realClaimed = Number(gw.claimed_codes) || 0;
          const target = realClaimed + Number(gw.virtual_claimed_offset || 0);
          // BẢNG ADMIN LÀ CHÂN LÝ: Gán chính xác theo cấu hình của Admin, thanh lọc đỉnh rác cũ
          this.highWaterClaimedCountMap.set(gw.id, target);
          this.liveFomoClaimedCountMap.set(gw.id, Number(gw.virtual_claimed_offset || 0));
          this.notifySoldCountChanged(gw.id, target);
          changed = true;
        }
      });
      if (changed) {
        this.saveHighWaterCounts();
        this.saveLiveFomoCounts();
      }
    });

    window.addEventListener('wcg_store_products_updated', (e: any) => {
      const list = Array.isArray(e.detail) ? e.detail : [];
      let changed = false;
      list.forEach((p: any) => {
        if (p && p.id && p.virtual_sold_count !== undefined) {
          const realSold = Number(p.sold_count) || 0;
          const target = realSold + Number(p.virtual_sold_count || 0);
          const cur = this.highWaterSoldCountMap.get(p.id) || 0;
          // BẢO TOÀN ĐƠN ĐIỆU TUYỆT ĐỐI: Không bao giờ kéo giật lùi đỉnh đã bán tích lũy của sản phẩm
          const nextVal = Math.max(cur, target);
          this.highWaterSoldCountMap.set(p.id, nextVal);
          this.liveFomoSoldCountMap.set(p.id, Number(p.virtual_sold_count || 0));
          this.notifySoldCountChanged(p.id, nextVal);
          changed = true;
        }
      });
      if (changed) {
        this.saveHighWaterCounts();
        this.saveLiveFomoCounts();
      }
    });
  }

  public getConfig(): MarketingConfig {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(MARKETING_CONFIG_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const validPresets = Array.isArray(parsed.depositNotificationPresets) && parsed.depositNotificationPresets.length > 0
            ? parsed.depositNotificationPresets.filter((p: any) => typeof p === 'number' && p > 0)
            : DEFAULT_DEPOSIT_PRESETS;
          this.config = {
            ...DEFAULT_MARKETING_CONFIG,
            ...parsed,
            toastPosition: parsed.toastPosition || 'bottom-left',
            depositNotificationPresets: (validPresets.length > 0) ? validPresets : DEFAULT_DEPOSIT_PRESETS,
            isEnabled: parsed.isEnabled !== undefined ? Boolean(parsed.isEnabled) : true,
            typeToggles: { ...DEFAULT_TYPE_TOGGLES, ...(parsed.typeToggles || {}) },
            peakHours: { ...DEFAULT_MARKETING_CONFIG.peakHours, ...(parsed.peakHours || {}) },
            voteConfig: { ...DEFAULT_MARKETING_CONFIG.voteConfig, ...(parsed.voteConfig || {}) },
            timeAgoConfig: { ...DEFAULT_MARKETING_CONFIG.timeAgoConfig, ...(parsed.timeAgoConfig || {}) },
            offlineCatchUp: { ...DEFAULT_OFFLINE_CATCHUP_CONFIG, ...(parsed.offlineCatchUp || {}) },
            syncIntervalSeconds: typeof parsed.syncIntervalSeconds === 'number' ? parsed.syncIntervalSeconds : 60,
            enableGlobalSnapToGrid: parsed.enableGlobalSnapToGrid !== undefined ? Boolean(parsed.enableGlobalSnapToGrid) : true,
            virtualAccounts: Array.isArray(parsed.virtualAccounts) && parsed.virtualAccounts.length > 0
              ? parsed.virtualAccounts
              : PRESET_VIRTUAL_ACCOUNTS,
          };
        }
      } catch {}
    }
    return { ...this.config };
  }

  public getDepositNotificationPresets(): number[] {
    const presets = this.config.depositNotificationPresets;
    if (Array.isArray(presets) && presets.length > 0) {
      const valid = presets.filter((p) => typeof p === 'number' && p > 0);
      if (valid.length > 0) return valid;
    }
    return DEFAULT_DEPOSIT_PRESETS;
  }

  public getToastPosition(): ToastPosition {
    return this.config.toastPosition || 'bottom-left';
  }

  public async saveConfig(newConfig: MarketingConfig): Promise<boolean> {
    this.config = { ...newConfig, lastUpdated: new Date().toISOString() };

    // 1. Recalibrate & heal liveVirtualStockMap based on newly saved config weights
    if (this.config.productWeights && typeof this.config.productWeights === 'object') {
      Object.entries(this.config.productWeights).forEach(([id, pw]) => {
        if (!pw) return;
        const realStock = this.getRealStockFor(id);
        if (realStock <= 0) {
          this.liveVirtualStockMap.set(id, 0);
        } else if (pw.priority === 'off' || !pw.virtualStockBonus || pw.virtualStockBonus <= 0) {
          this.liveVirtualStockMap.set(id, realStock);
        } else {
          const rawThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
          const restockAmount = Math.max(1, Number(pw.autoRestockAmount) || 20);
          const effectiveThreshold = (realStock > 0 && rawThreshold < realStock)
            ? realStock
            : rawThreshold;
          const maxAllowed = Math.max(realStock + Number(pw.virtualStockBonus || 0), effectiveThreshold + restockAmount);
          const cur = this.liveVirtualStockMap.get(id);
          if (cur === undefined || cur > maxAllowed || cur <= effectiveThreshold) {
            this.liveVirtualStockMap.set(id, realStock + Number(pw.virtualStockBonus || 0));
          }
        }
      });
      this.saveLiveVirtualStock();
    }

    // Reset reported stock peaks so new values are immediately reported to server
    this.lastReportedPeaks.stock = {};
    this.lastReportedPeaks.remaining = {};

    this.startSnapshotPoller();
    this.notifyStockChanged('*', 0);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MARKETING_CONFIG_KEY, JSON.stringify(this.config));
        window.dispatchEvent(new CustomEvent('wcg_marketing_config_updated', { detail: this.config }));
      } catch (err) {
        console.error('Failed to save marketing config to localStorage', err);
      }
    }

    this.schedulePeakReport(true);

    try {
      const ADMIN_SYNC_KEY = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('wcg_auth_token') ||
            sessionStorage.getItem('wcg_auth_token') ||
            ''
          : '';
      const syncKey =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('wcg_admin_sync_key') || localStorage.getItem('wcg_admin_sync_key') || ADMIN_SYNC_KEY
          : ADMIN_SYNC_KEY;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (syncKey) {
        headers['X-Sync-Key'] = syncKey;
        if (!token) headers['Authorization'] = `Bearer ${syncKey}`;
      }

      const endpoints = [
        '/api/sync',
        'https://web-code-game.pages.dev/api/sync',
        'https://admin-code-game-shop.pages.dev/api/sync',
      ];

      const resList = await Promise.all(
        endpoints.map((url) =>
          fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              key: MARKETING_CONFIG_KEY,
              data: this.config,
              marketingConfig: this.config,
              forceReset: true,
              forceResetSold: true,
              forceResetClaimed: true,
            }),
          }).catch((err) => {
            console.warn(`[MarketingService] Push to ${url} failed:`, err);
            return null;
          })
        )
      );

      const successful = resList.some((r) => r && r.ok);
      if (!successful) {
        const firstErr = resList.find((r) => r && !r.ok);
        if (firstErr) {
          const errBody = await firstErr.json().catch(() => ({}));
          throw new Error(errBody.message || errBody.error || `Lỗi máy chủ (${firstErr.status})`);
        }
        throw new Error('Không thể kết nối đến máy chủ Cloudflare');
      }
      return true;
    } catch (e: any) {
      console.warn('[MarketingService] Failed to push config to Cloudflare KV:', e?.message || e);
      throw e;
    }
  }

  public resetToDefaults(): void {
    this.saveConfig(DEFAULT_MARKETING_CONFIG);
  }

  public maskName(name: string): string {
    if (!name) return 'Khách hàng';
    const trimmed = name.trim();

    // Already masked check
    if (trimmed.includes('***') || trimmed.includes('****') || trimmed.includes('**')) {
      return trimmed;
    }

    // Guest identity formatting: e.g. "Khách #4921" -> "Khách #49**"
    if (trimmed.startsWith('Khách #')) {
      if (!this.config.isNameMasked) return trimmed;
      const code = trimmed.replace('Khách #', '').trim();
      if (code.length >= 4) {
        return `Khách #${code.slice(0, 2)}**`;
      }
      return trimmed;
    }

    if (!this.config.isNameMasked) return name;

    // Email masking: e.g. "tuannguyen92@gmail.com" -> "tuan***@gmail.com"
    if (trimmed.includes('@')) {
      const [localPart, domain] = trimmed.split('@');
      if (!domain) return trimmed;
      if (localPart.length <= 3) {
        return `${localPart[0]}***@${domain}`;
      } else if (localPart.length <= 6) {
        return `${localPart.slice(0, 3)}***@${domain}`;
      } else {
        return `${localPart.slice(0, 4)}***@${domain}`;
      }
    }

    // Vietnamese phone number masking: e.g. "0984562189" -> "0984***189"
    if (/^\d{9,11}$/.test(trimmed)) {
      return `${trimmed.slice(0, 4)}***${trimmed.slice(-3)}`;
    }

    // Gamer usernames: e.g. "shadow_hunter" -> "shadow***"
    if (trimmed.includes('_') || /^[a-zA-Z0-9]+$/.test(trimmed)) {
      if (trimmed.length <= 4) return `${trimmed[0]}***`;
      return `${trimmed.slice(0, Math.min(6, trimmed.length - 2))}***`;
    }

    // Natural Vietnamese Full Name masking: e.g. "Nguyễn Minh Tuấn" -> "Nguyễn M*** Tuấn"
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 3) {
      const first = words[0];
      const middleInitial = words[1].charAt(0).toUpperCase();
      const last = words[words.length - 1];
      return `${first} ${middleInitial}*** ${last}`;
    } else if (words.length === 2) {
      const first = words[0];
      const lastInitial = words[1].charAt(0).toUpperCase();
      return `${first} ${lastInitial}***`;
    }

    return `${trimmed.slice(0, Math.min(3, trimmed.length))}***`;
  }

  public sanitizeNotificationMasking(notif: MarketingNotification): MarketingNotification {
    if (!notif) return notif;
    if (!this.config.isNameMasked) return notif;

    const cloned = { ...notif };
    let userName = cloned.userName || '';

    if (userName && !userName.includes('*')) {
      const masked = this.maskName(userName);
      if (cloned.message && cloned.message.includes(userName)) {
        cloned.message = cloned.message.replace(userName, masked);
      }
      cloned.userName = masked;
    }

    if (cloned.message) {
      // Regex detects raw names before "vừa mua", "vừa sao chép", "vừa nhận", "vừa nạp"
      const match = cloned.message.match(/^(.+?)\s+(vừa\s+(?:mua|sao chép|nhận|nạp)\b.*)$/i);
      if (match) {
        const rawPrefix = match[1].trim();
        if (!rawPrefix.includes('*')) {
          const maskedPrefix = this.maskName(rawPrefix);
          cloned.message = `${maskedPrefix} ${match[2]}`;
          if (!cloned.userName || cloned.userName === rawPrefix) {
            cloned.userName = maskedPrefix;
          }
        }
      }
    }

    return cloned;
  }
}

export const marketingService = new MarketingService();

if (typeof window !== 'undefined') {
  (window as any).marketingService = marketingService;
  (window as any).triggerMarketingToast = () => {
    window.dispatchEvent(new CustomEvent('wcg_trigger_marketing_test'));
  };
}
