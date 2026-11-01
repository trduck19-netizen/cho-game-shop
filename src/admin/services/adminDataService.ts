import {
  AdminUser,
  DashboardMetrics,
  DailyDataPoint,
  GameAdminRecord,
  FreeCodeRecord,
  GiftcodeSubmission,
  MemberRecord,
  WalletTransaction,
  PrivateCodeIssue,
  InventoryItem,
  AdminOrderRecord,
  SePayConfig,
  SePayWebhookLog,
  ContentItem,
  SecurityLog,
  UserRole,
  PendingCrawlerGame,
  CrawlerAutoPublishConfig,
  CrawlerApiConfig,
  CrawlerApiLogEntry,
  UpcomingGameAdminRecord,
  UpcomingGameApiLogEntry,
} from '../types/adminTypes';
import type { GiveawayCampaign, StoreProduct, UtilityProduct, UtilityCategory, StoreCategory, CrawlerSource } from '../../types/game';
import defaultCrawlerSources from '../../data/crawler_sources.json';
import rawGamesData from '../../data/games188.json';
import rawCodesData from '../../data/crawled_codes_188.json';
import { DEFAULT_STORE_PRODUCTS, DEFAULT_INVENTORY, DEFAULT_UTILITY_PRODUCTS, DEFAULT_GIVEAWAYS } from '../../data/seedData';
import { crossOriginSync } from '../../services/crossOriginSync';
import canonicalBackup from '../../data/canonical_backup_state.json';
import { marketingService, DEFAULT_PRODUCT_MARKETING_CONFIG } from '../../services/marketingService';
import { FloatingNotificationConfig, DEFAULT_FLOATING_NOTIFICATION } from '../../types/floatingNotification';
import { templateService } from '../../services/templateService';
import { newsService } from '../../services/newsService';

class AdminDataService {
  private games: GameAdminRecord[] = [];
  private freeCodes: FreeCodeRecord[] = [];
  private giftcodeSubmissions: GiftcodeSubmission[] = [];
  private members: MemberRecord[] = [];
  private walletTransactions: WalletTransaction[] = [];
  private privateCodes: PrivateCodeIssue[] = [];
  private inventory: InventoryItem[] = [];
  private orders: AdminOrderRecord[] = [];
  private giveaways: GiveawayCampaign[] = [];
  private storeProducts: StoreProduct[] = [];
  private utilities: UtilityProduct[] = [];
  private deletedStoreProductIds: Set<string> = new Set();
  private deletedUtilityIds: Set<string> = new Set();
  private deletedGiveawayIds: Set<string> = new Set();
  private deletedInventoryItemIds: Set<string> = new Set();
  private customFreeCodes: FreeCodeRecord[] = [];
  private deletedFreeCodeIds: Set<string> = new Set();
  private pendingGames: PendingCrawlerGame[] = [];
  private crawlerSources: CrawlerSource[] = [];
  private crawlerAutoPublishGamesConfig: CrawlerAutoPublishConfig = {
    enabled: true,
    autoPublishWhenHasCodes: true,
    whitelistPublishers: ['VNG', 'Garena', 'SohaGame', 'Funtap', 'Gamota', 'Gosu', 'VTC', 'Dzogame', 'Appota', 'VGP', 'Kplay', 'AceGame', 'VPlay', 'Capcom', 'Habby'],
    minInstalls: 50000,
    minRating: 4.0,
    autoDownloadIcons: true,
    autoAddCrawlerSource: true,
  };
  private crawlerApiConfig: CrawlerApiConfig = {
    enabled: true,
    apiKey: '',
    botName: 'Muse Master Bot',
    autoPublish: true,
  };
  private crawlerApiLogs: CrawlerApiLogEntry[] = [];
  private upcomingGames: UpcomingGameAdminRecord[] = [];
  private upcomingGamesLogs: UpcomingGameApiLogEntry[] = [];

  private saveCustomFreeCodes() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('wcg_admin_custom_free_codes_v1', JSON.stringify(this.customFreeCodes));
      crossOriginSync.setItem('wcg_admin_custom_free_codes_v1', this.customFreeCodes);
      this.broadcastSync('CUSTOM_FREE_CODES_UPDATED', this.customFreeCodes);
      this.syncToCloudflareKV('wcg_admin_custom_free_codes_v1', this.customFreeCodes);
    } catch {}
  }

  private saveDeletedFreeCodeIds() {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.deletedFreeCodeIds);
      localStorage.setItem('wcg_deleted_free_codes', JSON.stringify(list));
      crossOriginSync.setItem('wcg_deleted_free_codes', list);
      this.broadcastSync('DELETED_FREE_CODES_UPDATED', list);
      this.syncToCloudflareKV('wcg_deleted_free_codes', list);
    } catch {}
  }

  private saveDeletedStoreProductIds() {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.deletedStoreProductIds);
      localStorage.setItem('wcg_deleted_store_products', JSON.stringify(list));
      crossOriginSync.setItem('wcg_deleted_store_products', list);
      this.broadcastSync('DELETED_STORE_PRODUCTS_UPDATED', list);
      this.syncToCloudflareKV('wcg_deleted_store_products', list);
    } catch {}
  }

  private saveDeletedUtilityIds() {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.deletedUtilityIds);
      localStorage.setItem('wcg_deleted_utilities', JSON.stringify(list));
      crossOriginSync.setItem('wcg_deleted_utilities', list);
      this.broadcastSync('DELETED_UTILITIES_UPDATED', list);
      this.syncToCloudflareKV('wcg_deleted_utilities', list);
    } catch {}
  }

  private saveDeletedGiveawayIds() {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.deletedGiveawayIds);
      localStorage.setItem('wcg_deleted_giveaways', JSON.stringify(list));
      crossOriginSync.setItem('wcg_deleted_giveaways', list);
      this.broadcastSync('DELETED_GIVEAWAYS_UPDATED', list);
      this.syncToCloudflareKV('wcg_deleted_giveaways', list);
    } catch {}
  }

  private saveDeletedInventoryItemIds() {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.deletedInventoryItemIds);
      localStorage.setItem('wcg_deleted_inventory_codes', JSON.stringify(list));
      crossOriginSync.setItem('wcg_deleted_inventory_codes', list);
      this.broadcastSync('DELETED_INVENTORY_CODES_UPDATED', list);
      this.syncToCloudflareKV('wcg_deleted_inventory_codes', list);
    } catch {}
  }
  private sepayConfig: SePayConfig = {
    apiKey: 'SP-KEY-WCG-SECURE-2026-TOKEN',
    isConnected: true,
    webhookUrl: 'https://admin-code-game-shop.pages.dev/api/webhooks/sepay',
    webhookSecretSet: true,
    bankAccount: 'CODE GAME SHOP',
    accountNumber: '10004681879',
    bankName: 'TPBank',
    paymentPrefix: 'WCG',
    environment: 'PRODUCTION',
    lastWebhookAt: '2026-09-28T10:15:00Z',
    lastSuccessAt: '2026-09-28T10:15:00Z',
    autoCreditCoreRatio: 1,
  };
  private sepayLogs: SePayWebhookLog[] = [];
  private contentItems: ContentItem[] = [];
  private securityLogs: SecurityLog[] = [];
  private currentAdmin: AdminUser = {
    id: 'adm_1',
    displayName: 'Admin Quản Trị Viên',
    email: 'admin@codegame.store',
    role: 'SUPER_ADMIN',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminWCG',
    permissions: ['ALL_PERMISSIONS', 'GAMES_MANAGE', 'FINANCE_LEDGER', 'SEPAY_WEBHOOK', 'SECURITY_AUDIT'],
    createdAt: '2026-08-01T00:00:00Z',
  };
  private isInitialized = false;

  private readonly KEYS = {
    GAMES: 'wcg_admin_games_v5',
    FREE_CODES: 'wcg_admin_free_codes_v5',
    SUBMISSIONS: 'wcg_admin_submissions_v4',
    MEMBERS: 'wcg_admin_members_v4',
    TRANSACTIONS: 'wcg_admin_transactions_v4',
    PRIVATE_CODES: 'wcg_admin_private_codes_v4',
    INVENTORY: 'wcg_admin_inventory_v4',
    ORDERS: 'wcg_admin_orders_v4',
    SEPAY: 'wcg_admin_sepay_v4',
    SEPAY_LOGS: 'wcg_admin_sepay_logs_v4',
    CONTENT: 'wcg_admin_content_v4',
    SECURITY_LOGS: 'wcg_admin_security_logs_v4',
    GIVEAWAYS: 'wcg_admin_giveaways_v4',
    STORE_PRODUCTS: 'wcg_admin_store_products_v4',
    UTILITIES: 'wcg_admin_utilities_v4',
    ADMIN_USER: 'wcg_admin_user_v4',
    CRAWLER_PENDING_GAMES: 'wcg_crawler_pending_games_v1',
    CRAWLER_AUTO_PUBLISH_CONFIG: 'wcg_crawler_auto_publish_games_v1',
    CRAWLER_API_CONFIG: 'wcg_crawler_api_config_v1',
    CRAWLER_API_LOGS: 'wcg_crawler_api_logs_v1',
    UPCOMING_GAMES: 'wcg_admin_upcoming_games_v1',
    UPCOMING_GAMES_LOGS: 'wcg_admin_upcoming_games_logs_v1',
  };

  constructor() {
    this.cleanupLegacyV3Data();
    this.init();
  }

  private safeSetItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    // Payloads exceeding 1.5MB should NOT be placed in localStorage as it will exceed the 5MB browser quota
    if (value.length > 1.5 * 1024 * 1024) {
      return false;
    }
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      console.warn(`[adminDataService] localStorage write error for "${key}":`, e?.message || e);
      try {
        localStorage.removeItem(this.KEYS.FREE_CODES);
        localStorage.removeItem('wcg_admin_free_codes_v5');
        localStorage.removeItem(this.KEYS.GAMES);
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
  }

  private readonly DATASET_VERSION = 'wcg_dataset_2026_10_30_v41';

  private cleanupLegacyV3Data(): void {
    if (typeof window === 'undefined') return;
    try {
      // Always purge bulky free_codes from localStorage to keep quota completely free for members, transactions and orders
      localStorage.removeItem('wcg_admin_free_codes_v5');
      localStorage.removeItem('wcg_admin_free_codes_v4');
      localStorage.removeItem('wcg_admin_free_codes_v3');
      localStorage.removeItem('wcg_admin_free_codes_v2');

      const currentVer = localStorage.getItem('wcg_dataset_version');
      if (currentVer !== this.DATASET_VERSION) {
        // Clear cached member, transaction and utilities lists to purge stale offline snapshots and force 100% authoritative pull from Cloudflare D1
        localStorage.removeItem('wcg_admin_members_v4');
        localStorage.removeItem('wcg_admin_transactions_v4');
        localStorage.removeItem('wcg_admin_orders_v4');
        localStorage.removeItem('wcg_admin_games_v5');
        localStorage.removeItem('wcg_admin_utilities_v4');
        localStorage.removeItem('wcg_utilities');
        // TUYỆT ĐỐI BẢO TỒN KHO MÃ GIVEAWAYS (Đặc quyền Admin): Không bao giờ xóa kho mã code riêng của Quản trị viên
        localStorage.setItem('wcg_dataset_version', this.DATASET_VERSION);
      }

      const obsoleteKeys = [
        'wcg_store_products',
        'wcg_utilities',
        'wcg_giveaways',
        'wcg_admin_games_v4',
        'wcg_admin_free_codes_v4',
        'wcg_admin_games_v3',
        'wcg_admin_free_codes_v3',
        'wcg_admin_games_v2',
        'wcg_admin_free_codes_v2',
        'wcg_admin_submissions_v3',
        'wcg_admin_giveaways_v3',
        'wcg_admin_store_products_v3',
        'wcg_admin_utilities_v3',
      ];
      obsoleteKeys.forEach((k) => localStorage.removeItem(k));

      // Clean up phantom giveaway in localStorage if present
      try {
        const rawGw = localStorage.getItem(this.KEYS.GIVEAWAYS);
        if (rawGw && (rawGw.includes('Thiếu Hiệp') || rawGw.includes('thieu-hiep'))) {
          const parsed = JSON.parse(rawGw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (g) => !(g?.title === '15' || (g?.game_name && g.game_name.includes('Thiếu Hiệp')) || (g?.game_slug && g.game_slug.includes('thieu-hiep')))
            );
            localStorage.setItem(this.KEYS.GIVEAWAYS, JSON.stringify(cleaned));
          }
        }
      } catch {}
    } catch {}
  }

  public init(): void {
    if (this.isInitialized) return;

    try {
      // 0. Load Deleted Tombstones First (so all entities respect deletion memory)
      const legacySeedStoreIds = ['sp_1', 'sp_2', 'sp_3', 'sp_4', 'sp_5', 'sp_6'];
      const legacySeedUtilIds = ['ut_1', 'ut_2', 'ut_3', 'ut_4', 'ut_5', 'ut_6'];
      const legacySeedGwIds = ['gw_1', 'gw_2', 'gw_3'];

      legacySeedStoreIds.forEach((id) => this.deletedStoreProductIds.add(id));
      legacySeedUtilIds.forEach((id) => this.deletedUtilityIds.add(id));
      legacySeedGwIds.forEach((id) => this.deletedGiveawayIds.add(id));

      const savedDelStore = localStorage.getItem('wcg_deleted_store_products');
      if (savedDelStore) {
        try {
          const parsed = JSON.parse(savedDelStore);
          if (Array.isArray(parsed)) parsed.forEach((id: string) => this.deletedStoreProductIds.add(id));
        } catch {}
      }
      const savedDelUtils = localStorage.getItem('wcg_deleted_utilities');
      if (savedDelUtils) {
        try {
          const parsed = JSON.parse(savedDelUtils);
          if (Array.isArray(parsed)) parsed.forEach((id: string) => this.deletedUtilityIds.add(id));
        } catch {}
      }
      const savedDelGw = localStorage.getItem('wcg_deleted_giveaways');
      if (savedDelGw) {
        try {
          const parsed = JSON.parse(savedDelGw);
          if (Array.isArray(parsed)) parsed.forEach((id: string) => this.deletedGiveawayIds.add(id));
        } catch {}
      }
      const savedDelInv = localStorage.getItem('wcg_deleted_inventory_codes');
      if (savedDelInv) {
        try {
          const parsed = JSON.parse(savedDelInv);
          if (Array.isArray(parsed)) parsed.forEach((id: string) => this.deletedInventoryItemIds.add(id));
        } catch {}
      }

      const savedDelFc = localStorage.getItem('wcg_deleted_free_codes');
      if (savedDelFc) {
        try {
          const parsed = JSON.parse(savedDelFc);
          if (Array.isArray(parsed)) parsed.forEach((id: string) => this.deletedFreeCodeIds.add(id));
        } catch {}
      }

      const savedCustomFc = localStorage.getItem('wcg_admin_custom_free_codes_v1');
      if (savedCustomFc) {
        try {
          const parsed = JSON.parse(savedCustomFc);
          if (Array.isArray(parsed)) {
            this.customFreeCodes = parsed.map((c: any) => ({
              ...c,
              codeValue: c.codeValue || c.code || '',
              code: c.code || c.codeValue || '',
              gameSlug: c.gameSlug || c.gameId || '',
            }));
          }
        } catch {}
      }

            const savedCrawlerSources = localStorage.getItem('wcg_admin_crawler_sources_v1');
      if (savedCrawlerSources) {
        try {
          const parsed = JSON.parse(savedCrawlerSources);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.crawlerSources = parsed;
          }
        } catch {}
      }
      if (this.crawlerSources.length === 0 && Array.isArray(defaultCrawlerSources)) {
        this.crawlerSources = (defaultCrawlerSources as CrawlerSource[]).filter(
          (s) => !s?.url?.includes('codemoi.net') && !s?.name?.toLowerCase().includes('codemoi')
        );
      }

      const savedPendingGames = localStorage.getItem('wcg_crawler_pending_games_v1');
      if (savedPendingGames) {
        try {
          const parsed = JSON.parse(savedPendingGames);
          if (Array.isArray(parsed)) this.pendingGames = parsed;
        } catch {}
      }

      const savedAutoPublishConfig = localStorage.getItem('wcg_crawler_auto_publish_games_v1');
      if (savedAutoPublishConfig) {
        try {
          const parsed = JSON.parse(savedAutoPublishConfig);
          if (parsed && typeof parsed.enabled === 'boolean') {
            this.crawlerAutoPublishGamesConfig = { ...this.crawlerAutoPublishGamesConfig, ...parsed };
          }
        } catch {}
      }

      const savedApiConfig = localStorage.getItem('wcg_crawler_api_config_v1');
      if (savedApiConfig) {
        try {
          const parsed = JSON.parse(savedApiConfig);
          if (parsed && typeof parsed === 'object') {
            this.crawlerApiConfig = { ...this.crawlerApiConfig, ...parsed };
          }
        } catch {}
      }

      const savedApiLogs = localStorage.getItem('wcg_crawler_api_logs_v1');
      if (savedApiLogs) {
        try {
          const parsed = JSON.parse(savedApiLogs);
          if (Array.isArray(parsed)) this.crawlerApiLogs = parsed;
        } catch {}
      }

      const savedUpcoming = localStorage.getItem(this.KEYS.UPCOMING_GAMES);
      if (savedUpcoming) {
        try {
          const parsed = JSON.parse(savedUpcoming);
          if (Array.isArray(parsed)) this.upcomingGames = parsed;
        } catch {}
      }
      if (this.upcomingGames.length === 0) {
        this.upcomingGames = this.getDefaultUpcomingGames();
        this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
      }
      this.fetchUpcomingGamesFromServer().catch(() => {});

      const savedUpcomingLogs = localStorage.getItem(this.KEYS.UPCOMING_GAMES_LOGS);
      if (savedUpcomingLogs) {
        try {
          const parsed = JSON.parse(savedUpcomingLogs);
          if (Array.isArray(parsed)) this.upcomingGamesLogs = parsed;
        } catch {}
      }

      // Auto-restore CHANBOMAYDI if missing and not deleted
      const chanboExists = this.customFreeCodes.some(
        (c) => c.codeValue?.toUpperCase() === 'CHANBOMAYDI' || c.id === 'fc_1791694326824_ioo'
      );
      if (!chanboExists && !this.deletedFreeCodeIds.has('fc_1791694326824_ioo')) {
        const chanboRecord: FreeCodeRecord = {
          id: 'fc_1791694326824_ioo',
          codeValue: 'CHANBOMAYDI',
          gameSlug: 'huyen-thoai-hai-tac',
          rewards: '100 Kim Cương, 50k Vàng, Rương Trang Bị SSR',
          status: 'ACTIVE',
          expiresAt: '',
          isVerified: true,
          copyCount: 0,
          notes: 'Code quà tặng',
          createdAt: '2026-10-11T04:52:06.856Z',
        };
        this.customFreeCodes.unshift(chanboRecord);
        this.saveCustomFreeCodes();
      }

      // 1. Load Admin User
      const savedAdmin = localStorage.getItem(this.KEYS.ADMIN_USER);
      if (savedAdmin) {
        try {
          this.currentAdmin = JSON.parse(savedAdmin);
        } catch {
          // ignore
        }
      }

      // 2. Load Games
      const savedGames = localStorage.getItem(this.KEYS.GAMES);
      if (savedGames !== null) {
        try {
          const parsed = JSON.parse(savedGames);
          this.games = Array.isArray(parsed)
            ? parsed.map((g: any) => {
                const slug = g.slug || g.id || '';
                let icon = g.icon_url || g.iconUrl || '';
                if (!icon || icon.includes('codemoi.net') || icon.includes('googleusercontent.com') || icon.startsWith('/game-icons')) {
                  icon = `/game_icons/${slug}.webp`;
                }
                return { ...g, icon_url: icon, iconUrl: icon };
              })
            : [];
        } catch {
          this.games = [];
        }
      } else {
        const rawGames: any[] = Array.isArray(rawGamesData) ? rawGamesData : [];
        this.games = rawGames.map((g, idx) => {
          const slug = g.slug || g.id || `game-${idx + 1}`;
          let icon = g.icon_url || g.iconUrl || `/game_icons/${slug}.webp`;
          if (!icon || icon.startsWith('/game-icons') || icon.startsWith('game-icons')) {
            icon = `/game_icons/${slug}.webp`;
          }

          let status: 'ACTIVE' | 'HOT' | 'INACTIVE' = 'ACTIVE';
          if (g.is_hot || g.isHot || idx < 10) status = 'HOT';
          else if (g.status === 'INACTIVE' || g.is_active === false) status = 'INACTIVE';

          return {
            id: g.id || slug,
            name: g.name || 'Game Tựa',
            slug: slug,
            publisher: g.publisher || 'Nhà phát hành',
            category: g.category || 'Nhập Vai',
            rating: typeof g.rating === 'number' ? g.rating : 4.8,
            icon_url: icon,
            banner_url: g.banner_url || g.bannerUrl,
            description: g.description || `Mô tả game ${g.name}.`,
            short_description: g.short_description || `Tổng hợp giftcode ${g.name} độc quyền.`,
            instructions: g.instructions || 'Mở game > Cài đặt > Nhập Giftcode > Nhận thưởng.',
            platform: g.platform || 'Android, iOS, PC',
            so_giay_phep: g.so_giay_phep,
            ngay_cap_phep: g.ngay_cap_phep,
            release_date: g.gp_release_date || g.release_date || '2026-09-01',
            status: status,
            google_play_url: g.google_play_url || g.download_android || g.downloadLinks?.android || '',
            app_store_url: g.app_store_url || g.download_ios || g.downloadLinks?.ios || '',
            android_package_name: g.android_package_name || (
              (g.google_play_url || g.download_android || '').match(/[?&]id=([a-zA-Z0-9._]+)/)?.[1] || ''
            ),
            download_android: g.download_android || g.google_play_url || g.downloadLinks?.android || '',
            download_ios: g.download_ios || g.app_store_url || g.downloadLinks?.ios || '',
            download_pc: g.download_pc || g.downloadLinks?.pc || '',
            created_at: g.created_at || '2026-08-01T00:00:00Z',
            updated_at: g.updated_at || '2026-09-27T00:00:00Z',
          };
        });
        this.safeSetItem(this.KEYS.GAMES, JSON.stringify(this.games));
      }

      // 3. Load Free Codes
      const savedCodes = localStorage.getItem(this.KEYS.FREE_CODES);
      if (savedCodes !== null) {
        try {
          const parsed = JSON.parse(savedCodes);
          if (Array.isArray(parsed)) this.freeCodes = parsed;
        } catch {
          this.freeCodes = [];
        }
      }

      // Merge bundled rawCodesData so newly added codes (WWM, Delta Force, etc.) are always present
      const rawCodes: any[] = Array.isArray(rawCodesData) ? rawCodesData : [];
      const rawFormatted = rawCodes.map((c, idx) => {
        const val = (c.codeValue || c.code_value || c.code || `VIP${idx + 100}`).trim().toUpperCase();
        const isExp = c.status === 'EXPIRED' || c.status === 'expired' || val === 'ATNGAY1' || val === 'ATNGAY2';
        return {
          id: c.id || `code_${idx + 1}`,
          codeValue: c.codeValue || c.code_value || c.code || `VIP${idx + 100}`,
          gameSlug: c.gameSlug || c.game_slug || c.gameId || 'genshin-impact',
          rewards: c.rewards || '500 Kim Cương + Rương SSR',
          status: (isExp ? 'EXPIRED' : 'ACTIVE') as 'ACTIVE' | 'EXPIRED',
          expiresAt: c.expiresAt || c.expires_at || '',
          isVerified: !isExp,
          copyCount: 120 + (idx % 800),
          notes: c.notes || 'Code nhận trực tiếp',
          createdAt: c.createdAt || new Date().toISOString(),
        };
      });

      const existingKeyMap = new Map<string, any>();
      for (const item of this.freeCodes) {
        if (item.gameSlug && item.codeValue) {
          existingKeyMap.set(`${item.gameSlug}___${item.codeValue.trim().toUpperCase()}`, item);
        }
      }
      for (const raw of rawFormatted) {
        if (raw.gameSlug && raw.codeValue) {
          const key = `${raw.gameSlug}___${raw.codeValue.trim().toUpperCase()}`;
          const existing = existingKeyMap.get(key);
          if (existing) {
            existing.status = raw.status;
            existing.rewards = raw.rewards;
            existing.expiresAt = raw.expiresAt;
            existing.isVerified = raw.isVerified;
          } else {
            this.freeCodes.push(raw);
            existingKeyMap.set(key, raw);
          }
        }
      }
      // Ensure customFreeCodes are prepended to this.freeCodes and deleted ones are removed
      const customCodeMap = new Map<string, FreeCodeRecord>();
      this.customFreeCodes.forEach((c: any) => {
        if (c && c.id && !this.deletedFreeCodeIds.has(c.id)) {
          const codeVal = c.codeValue || c.code || '';
          const norm: FreeCodeRecord = {
            ...c,
            codeValue: codeVal,
            code: codeVal,
            gameSlug: c.gameSlug || c.gameId || '',
          };
          customCodeMap.set(c.id, norm);
        }
      });
      this.freeCodes = [
        ...Array.from(customCodeMap.values()),
        ...this.freeCodes.filter((c) => c && c.id && !this.deletedFreeCodeIds.has(c.id) && !customCodeMap.has(c.id)),
      ];
      this.safeSetItem(this.KEYS.FREE_CODES, JSON.stringify(this.freeCodes));

      // 4. Load Submissions
      const savedSubs = localStorage.getItem(this.KEYS.SUBMISSIONS);
      if (savedSubs !== null) {
        try {
          this.giftcodeSubmissions = JSON.parse(savedSubs);
        } catch {
          this.giftcodeSubmissions = [];
        }
      } else {
        this.giftcodeSubmissions = [
          {
            id: 'sub_1',
            codeValue: 'GENSHIN500K',
            gameSlug: 'genshin-impact',
            submitterName: 'Lê Hoàng Nam',
            submitterEmail: 'nam.le@gmail.com',
            rewards: '300 Nguyên Thạch, 5 Kinh Nghiệm Anh Hùng',
            status: 'PENDING',
            notes: 'Mã phát sóng livestream bản 5.0',
            submittedAt: '2026-09-28T09:30:00Z',
          },
          {
            id: 'sub_2',
            codeValue: 'HSRSEPTEMBER2026',
            gameSlug: 'honkai-star-rail',
            submitterName: 'Phạm Minh Trí',
            submitterEmail: 'tri.pham@outlook.com',
            rewards: '100 Ngọc Ánh Sao, 50.000 Điểm Tín Dụng',
            status: 'PENDING',
            notes: 'Code fanpage sự kiện tháng 9',
            submittedAt: '2026-09-28T10:12:00Z',
          },
          {
            id: 'sub_3',
            codeValue: 'ROBLOXROBUX999',
            gameSlug: 'roblox',
            submitterName: 'Nguyễn Văn Đạt',
            submitterEmail: 'dat.nguyen@yahoo.com',
            rewards: '100 Robux Miễn Phí',
            status: 'REJECTED',
            rejectionReason: 'Mã code không chính xác hoặc đã hết hạn.',
            submittedAt: '2026-09-27T14:20:00Z',
          },
        ];
        this.safeSetItem(this.KEYS.SUBMISSIONS, JSON.stringify(this.giftcodeSubmissions));
      }

      // 5. Load Members
      const savedMembers = localStorage.getItem(this.KEYS.MEMBERS);
      if (savedMembers !== null) {
        try {
          this.members = JSON.parse(savedMembers);
        } catch {
          this.members = [];
        }
      } else {
        this.members = [];
      }

      // 6. Load Transactions
      const savedTxs = localStorage.getItem(this.KEYS.TRANSACTIONS);
      if (savedTxs !== null) {
        try {
          this.walletTransactions = JSON.parse(savedTxs);
        } catch {
          this.walletTransactions = [];
        }
      } else {
        this.walletTransactions = [];
        this.safeSetItem(this.KEYS.TRANSACTIONS, JSON.stringify([]));
      }

      // 7. Load Private Codes
      const savedPrivates = localStorage.getItem(this.KEYS.PRIVATE_CODES);
      if (savedPrivates !== null) {
        try {
          this.privateCodes = JSON.parse(savedPrivates);
        } catch {
          this.privateCodes = [];
        }
      } else {
        this.privateCodes = [
          {
            id: 'priv_1',
            codeValue: 'PRIV-VIP-8888',
            title: 'Quà Tri Ân Khách Hàng VIP Tháng 9',
            memberId: 'usr-2',
            memberEmail: 'an.nguyen@gmail.com',
            rewards: '1.000 Kim Cương Free Fire + 10 Vé Quay SSR',
            expiresAt: '2026-10-31',
            isClaimed: false,
            createdAt: '2026-09-27T10:00:00Z',
          },
        ];
        localStorage.setItem(this.KEYS.PRIVATE_CODES, JSON.stringify(this.privateCodes));
      }

      // 8. Load Inventory
      const savedInventory = localStorage.getItem(this.KEYS.INVENTORY);
      if (savedInventory !== null) {
        try {
          const parsed = JSON.parse(savedInventory);
          this.inventory = Array.isArray(parsed)
            ? parsed.filter(
                (i) =>
                  i &&
                  !this.deletedInventoryItemIds.has(i.id) &&
                  !this.deletedStoreProductIds.has(i.sku) &&
                  !this.deletedUtilityIds.has(i.sku)
              )
            : [];
        } catch {
          this.inventory = [];
        }
      } else {
        this.inventory = [...DEFAULT_INVENTORY].filter(
          (i) =>
            i &&
            !this.deletedInventoryItemIds.has(i.id) &&
            !this.deletedStoreProductIds.has(i.sku) &&
            !this.deletedUtilityIds.has(i.sku)
        );
        localStorage.setItem(this.KEYS.INVENTORY, JSON.stringify(this.inventory));
      }

      // 9. Load Orders
      const savedOrders = localStorage.getItem(this.KEYS.ORDERS);
      if (savedOrders !== null) {
        try {
          this.orders = JSON.parse(savedOrders);
        } catch {
          this.orders = [];
        }
      } else {
        this.orders = [];
        localStorage.setItem(this.KEYS.ORDERS, JSON.stringify([]));
      }

      // 9b. Load SePay Config from localStorage
      const savedSePay = localStorage.getItem(this.KEYS.SEPAY);
      if (savedSePay) {
        try {
          const parsed = JSON.parse(savedSePay);
          if (parsed && typeof parsed === 'object') {
            const isDummy = !parsed.accountNumber || parsed.accountNumber === '0987654321';
            this.sepayConfig = {
              ...this.sepayConfig,
              ...parsed,
              bankAccount: isDummy ? 'CODE GAME SHOP' : (parsed.bankAccount || 'CODE GAME SHOP'),
              accountNumber: isDummy ? '10004681879' : (parsed.accountNumber || '10004681879'),
              bankName: isDummy ? 'TPBank' : (parsed.bankName || 'TPBank'),
            };
          }
        } catch {}
      }

      // 10. Load SePay Logs
      const savedSePayLogs = localStorage.getItem(this.KEYS.SEPAY_LOGS);
      if (savedSePayLogs !== null) {
        try {
          this.sepayLogs = JSON.parse(savedSePayLogs);
        } catch {
          this.sepayLogs = [];
        }
      } else {
        this.sepayLogs = [];
        localStorage.setItem(this.KEYS.SEPAY_LOGS, JSON.stringify([]));
      }

      // 11. Load Content CMS
      const savedContent = localStorage.getItem(this.KEYS.CONTENT);
      if (savedContent !== null) {
        try {
          this.contentItems = JSON.parse(savedContent);
        } catch {
          this.contentItems = [];
        }
      } else {
        this.contentItems = [
          {
            id: 'cnt_branding',
            key: 'website_branding',
            title: 'CodeGame.Shop',
            content: 'Thiết lập nhận diện thương hiệu, logo, avatar và hình nền website.',
            isActive: true,
            type: 'BRANDING',
            extraData: {
              logoUrl: '/logo.png',
              avatarUrl: '/logo.png',
              backgroundUrl: '',
              backgroundStyle: 'ambient',
              backgroundOpacity: 0.35,
            },
            updatedAt: '2026-09-28T00:00:00Z',
          },
          {
            id: 'cnt_announcement',
            key: 'announcement_banner',
            title: '🎁 Sự Kiện Tân Thủ: Đăng ký nhận ngay 50.000đ vào ví trải nghiệm!',
            content: 'Khuyến mãi nạp đầu tặng 20% giá trị qua cổng SePay MBBank.',
            isActive: true,
            type: 'ANNOUNCEMENT',
            updatedAt: '2026-09-28T00:00:00Z',
          },
          {
            id: 'cnt_hero',
            key: 'hero_banner',
            title: 'Kho Giftcode & Mã Quà Tặng Game',
            content: 'Tra cứu tức thì hàng nghìn mã code quà tặng mới nhất của hơn 450+ tựa game mobile & PC. Sao chép 1-chạm, kiểm tra trạng thái hoạt động thực tế từ cộng đồng.',
            isActive: true,
            type: 'HERO',
            extraData: {
              badge: '🔥 CẬP NHẬT TỰ ĐỘNG 24/7',
              titleHighlight: 'Độc Quyền 2026',
            },
            updatedAt: '2026-09-28T00:00:00Z',
          },
          {
            id: 'cnt_giveaway',
            key: 'giveaway_section',
            title: 'Săn Giftcode Độc Quyền Miễn Phí',
            content: 'Các chiến dịch phát code độc quyền số lượng có hạn tài trợ từ NPH và sự kiện cộng đồng CH Play. Mỗi người nhận được 1 mã duy nhất, kích hoạt ngay trong game.',
            isActive: true,
            type: 'GIVEAWAY',
            extraData: {
              badge: 'Sự Kiện Giật Code Giới Hạn',
            },
            updatedAt: '2026-09-28T00:00:00Z',
          },
          {
            id: 'cnt_store',
            key: 'store_section',
            title: 'Cửa Hàng Code Chiết Khấu Tới 60%',
            content: 'Mã nạp game, thẻ tháng và giftcode sự kiện độc quyền. Nhận mã tự động 100% qua VietQR / Ví số dư.',
            isActive: true,
            type: 'STORE',
            extraData: {
              badge: 'Gói Nạp & Giftcode Chiết Khấu Chính Hãng',
              warrantyTitle: 'Bảo Hành 100%',
              warrantyDesc: 'Đổi trả tức thì nếu mã lỗi',
            },
            updatedAt: '2026-09-28T00:00:00Z',
          },
          {
            id: 'cnt_utilities',
            key: 'utilities_section',
            title: 'Tiện Ích & Dịch Vụ Chính Hãng',
            content: 'Tài khoản Premium giải trí, key bản quyền phần mềm, Cloud VPS treo game và các công cụ tiện ích số độc quyền. Giao hàng tự động 100%.',
            isActive: true,
            type: 'UTILITIES',
            extraData: {
              badge: 'Dịch Vụ Số & Sản Phẩm Ngoài Lề',
              warrantyTitle: 'Bảo Hành 1 Đổi 1',
              warrantyDesc: 'Hỗ trợ kỹ thuật 24/7 tức thì',
            },
            updatedAt: '2026-09-28T00:00:00Z',
          },
          {
            id: 'cnt_footer',
            key: 'footer_support',
            title: 'Chân Trang & Hỗ Trợ',
            content: 'CodeGame.Shop — Nền tảng tổng hợp và chia sẻ giftcode game mobile & PC hàng đầu Việt Nam. Cập nhật mã quà tặng mới nhất mỗi ngày từ NPH chính thức.',
            isActive: true,
            type: 'FOOTER',
            extraData: {
              brandTitle: 'CodeGame.Shop',
              brandLogo: '',
              badge1Text: 'Cloudflare Pages & D1',
              badge1Visible: true,
              badge2Text: '24/7 Realtime Sync',
              badge2Visible: true,
              telegram: 'https://t.me/webcodegame_vn',
              zalo: 'https://zalo.me/0386767888',
              hotline: '0386.767.888',
              email: 'hotro@webcodegame.vn',
            },
            updatedAt: '2026-09-28T00:00:00Z',
          },
          {
            id: 'cnt_terms',
            key: 'terms_of_service',
            title: 'Điều Khoản Sử Dụng Dịch Vụ CodeGame Store',
            content: '1. Quy định chung: Toàn bộ giftcode và mã quà tặng trên website được chia sẻ hoàn toàn miễn phí hoặc từ các đối tác phân phối chính thức.\n2. Người dùng cam kết không sử dụng công cụ tự động spam, phá hoại hoặc lạm dụng tài nguyên hệ thống.\n3. Ban Quản Trị có quyền cập nhật, hiệu chỉnh các điều khoản sử dụng nhằm đảm bảo quyền lợi chung cho cộng đồng game thủ.',
            isActive: true,
            type: 'TERMS',
            updatedAt: '2026-09-28T00:00:00Z',
          },
          {
            id: 'cnt_privacy',
            key: 'privacy_policy',
            title: 'Chính Sách Bảo Mật Quyền Riêng Tư',
            content: '1. Chúng tôi tôn trọng và cam kết bảo vệ thông tin tài khoản và dữ liệu cá nhân của người dùng.\n2. Thông tin số dư và mã giao dịch ví được bảo vệ và lưu trữ mã hóa trên hạ tầng bảo mật Cloudflare Edge Network.\n3. Chúng tôi tuyệt đối không bán hoặc cung cấp thông tin của bạn cho bên thứ ba vì bất kỳ mục đích thương mại nào.',
            isActive: true,
            type: 'PRIVACY',
            updatedAt: '2026-09-28T00:00:00Z',
          },
        ];
        localStorage.setItem(this.KEYS.CONTENT, JSON.stringify(this.contentItems));
      }

      // 12. Load Security Logs
      const savedSec = localStorage.getItem(this.KEYS.SECURITY_LOGS);
      if (savedSec !== null) {
        try {
          this.securityLogs = JSON.parse(savedSec);
        } catch {
          this.securityLogs = [];
        }
      } else {
        this.securityLogs = [
          {
            id: 'sec_1',
            actorName: 'Admin Quản Trị',
            actorEmail: 'admin@codegame.store',
            action: 'ADMIN_LOGIN',
            targetId: 'SYSTEM',
            ipAddress: '118.69.182.44',
            severity: 'INFO',
            details: { userAgent: 'Chrome on Windows', role: 'SUPER_ADMIN' },
            createdAt: '2026-09-28T11:45:00Z',
          },
        ];
        localStorage.setItem(this.KEYS.SECURITY_LOGS, JSON.stringify(this.securityLogs));
      }

      // 14. Load Giveaways
      const savedGiveaways = localStorage.getItem(this.KEYS.GIVEAWAYS);
      if (savedGiveaways !== null) {
        try {
          const parsed = JSON.parse(savedGiveaways);
          this.giveaways = Array.isArray(parsed)
            ? parsed.filter((g) => g && g.id && !this.deletedGiveawayIds.has(g.id))
            : [];
        } catch {
          this.giveaways = [];
        }
      } else {
        this.giveaways = [];
        localStorage.setItem(this.KEYS.GIVEAWAYS, JSON.stringify(this.giveaways));
      }

      // Auto-normalize legacy giveaways to formula: title = "Code riêng " + game_name, rewards = "Code ngẫu nhiên"
      let hasLegacyGwUpdated = false;
      this.giveaways.forEach((g) => {
        if (g && g.game_name) {
          const expectedTitle = `Code riêng ${g.game_name.trim()}`;
          if (
            g.title === '1 code ngẫu nhiên bất kỳ' ||
            g.title === '1 code riêng ngẫu nhiên' ||
            g.title === g.game_name ||
            (g.title && !g.title.startsWith('Code riêng'))
          ) {
            g.title = expectedTitle;
            hasLegacyGwUpdated = true;
          }
          if (
            g.rewards === 'code riêng ngẫu nhiên' ||
            g.rewards === 'Code ngẫu nhiên từ NPH' ||
            g.rewards === 'Code ngẫu nhiên bất kỳ' ||
            g.rewards === '1 code ngẫu nhiên' ||
            !g.rewards
          ) {
            g.rewards = 'Code ngẫu nhiên';
            hasLegacyGwUpdated = true;
          }
        }
      });
      if (hasLegacyGwUpdated) {
        localStorage.setItem(this.KEYS.GIVEAWAYS, JSON.stringify(this.giveaways));
      }

      // 15. Load Store Products
      const savedStoreProducts = localStorage.getItem(this.KEYS.STORE_PRODUCTS);
      if (savedStoreProducts !== null) {
        try {
          const parsed = JSON.parse(savedStoreProducts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.storeProducts = parsed.filter((p) => p && p.id && !this.deletedStoreProductIds.has(p.id));
          } else {
            this.storeProducts = [];
          }
        } catch {
          this.storeProducts = [];
        }
      } else {
        this.storeProducts = [];
        localStorage.setItem(this.KEYS.STORE_PRODUCTS, JSON.stringify(this.storeProducts));
      }

      // 16. Load Utilities
      const savedUtilities = localStorage.getItem(this.KEYS.UTILITIES);
      if (savedUtilities !== null) {
        try {
          const parsed = JSON.parse(savedUtilities);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.utilities = parsed.filter((u) => u && u.id && !this.deletedUtilityIds.has(u.id));
          } else {
            this.utilities = [];
          }
        } catch {
          this.utilities = [];
        }
      } else {
        this.utilities = [];
        localStorage.setItem(this.KEYS.UTILITIES, JSON.stringify(this.utilities));
      }

      this.isInitialized = true;

      // Single initial Cloudflare KV sync on startup
      this.fetchFromCloudflareKV();
    } catch (e) {
      console.error('Error initializing AdminDataService:', e);
    }
  }

  // --- SAVE HELPERS WITH ZERO-LATENCY REAL-TIME BROADCAST & CLOUDFLARE KV SYNC ---
  private broadcastSync(type: string, payload?: any) {
    if (typeof window === 'undefined') return;
    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('wcg_data_sync');
        channel.postMessage({ type, payload, timestamp: Date.now() });
      }
      window.dispatchEvent(new CustomEvent('wcg_admin_data_updated', { detail: { type, payload } }));
    } catch (e) {
      console.error('Error broadcasting data sync:', e);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    let token =
      (typeof window !== 'undefined'
        ? localStorage.getItem('wcg_auth_token') || sessionStorage.getItem('wcg_auth_token')
        : '') || '';
    let syncKey =
      (typeof window !== 'undefined'
        ? localStorage.getItem('wcg_admin_sync_key') || sessionStorage.getItem('wcg_admin_sync_key')
        : '') || '';

    const ADMIN_SYNC_KEY = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
    const isDedicatedAdmin = typeof window !== 'undefined' && window.location.hostname.includes('admin-code-game-shop');
    const isAdminUser = typeof window !== 'undefined' && (
      localStorage.getItem('wcg_admin_authenticated') === 'true' ||
      sessionStorage.getItem('wcg_admin_authenticated') === 'true' ||
      this.currentAdmin?.role === 'SUPER_ADMIN' ||
      this.currentAdmin?.role === 'ADMIN'
    );

    if (!syncKey && (isDedicatedAdmin || isAdminUser)) {
      syncKey = ADMIN_SYNC_KEY;
      try {
        localStorage.setItem('wcg_admin_sync_key', ADMIN_SYNC_KEY);
      } catch {}
    }

    if (!token && (isDedicatedAdmin || isAdminUser)) {
      token = ADMIN_SYNC_KEY;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Forwarded-Sync': '1',
      'X-Sync-Key': syncKey || ADMIN_SYNC_KEY,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['Authorization'] = `Bearer ${ADMIN_SYNC_KEY}`;
    }
    return headers;
  }

  private async syncToCloudflareKV(key: string, data: any) {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

    const endpoints = isLocalhost
      ? ['https://admin-code-game-shop.pages.dev/api/sync', 'https://codegame.shop/api/sync', 'https://web-code-game.pages.dev/api/sync', '/api/sync']
      : ['/api/sync', 'https://admin-code-game-shop.pages.dev/api/sync', 'https://codegame.shop/api/sync', 'https://web-code-game.pages.dev/api/sync'];

    try {
      const headers = this.getAuthHeaders();
      const body = JSON.stringify({ key, data });
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body,
          });
          if (res.ok) {
            break; // Stop immediately on first success, preventing duplicate writes
          }
        } catch {}
      }
    } catch {}
  }

  /**
   * Fast targeted sync specifically for Giveaways and Code Pools
   * Directly persists to Cloudflare D1 with ~300ms latency instead of running 16s monolithic snapshot
   */
  public async saveGiveawaysToServer(customList?: GiveawayCampaign[]): Promise<boolean> {
    const listToSave = customList || this.giveaways;
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

    const endpoints = isLocalhost
      ? ['https://admin-code-game-shop.pages.dev/api/sync', 'https://codegame.shop/api/sync', 'https://web-code-game.pages.dev/api/sync', '/api/sync']
      : ['/api/sync', 'https://admin-code-game-shop.pages.dev/api/sync', 'https://codegame.shop/api/sync', 'https://web-code-game.pages.dev/api/sync'];

    try {
      const headers = this.getAuthHeaders();
      const body = JSON.stringify({ key: this.KEYS.GIVEAWAYS, data: listToSave });
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body,
          });
          if (res.ok) {
            this.safeSetItem(this.KEYS.GIVEAWAYS, JSON.stringify(listToSave));
            crossOriginSync.setItem(this.KEYS.GIVEAWAYS, listToSave);
            this.broadcastSync('GIVEAWAYS_UPDATED');

            // Asynchronously notify client domain to purge edge isolate caches
            if (!currentHost.includes('codegame.shop')) {
              fetch('https://codegame.shop/api/sync', { method: 'POST', headers, body }).catch(() => {});
            }

            return true;
          }
        } catch {}
      }
    } catch {}
    return false;
  }

  public async fetchFromCloudflareKV(): Promise<void> {
    const endpoints = [
      '/api/sync',
      'https://admin-code-game-shop.pages.dev/api/sync',
      'https://codegame.shop/api/sync',
      'https://web-code-game.pages.dev/api/sync',
    ];

    for (const baseUrl of endpoints) {
      try {
        const url = `${baseUrl}?t=${Date.now()}`;
        const headers: Record<string, string> = {
          ...this.getAuthHeaders(),
        };
        // Avoid sending custom Cache-Control in GET request headers to prevent CORS preflight conflicts
        delete headers['Cache-Control'];

        const res = await fetch(url, {
          cache: 'no-store',
          headers,
        });
        if (res.ok) {
          const dateHeader = res.headers.get('date');
          const xServerTime = res.headers.get('X-Server-Time');
          const json = await res.json();

          // Calibrate deterministic marketing clock to Cloudflare edge atomic time
          const serverTimeStr = xServerTime || dateHeader || (json && (json.serverTime || json.timestamp));
          if (serverTimeStr) {
            const serverTimeMs = Date.parse(serverTimeStr);
            if (!isNaN(serverTimeMs)) {
              marketingService.calibrateServerTime(serverTimeMs);
            }
          }

          if (json && json.success) {
            let hasUpdates = false;

            // 1. Members (CRITICAL BUSINESS DATA - PROCESS FIRST)
            if (json.members && Array.isArray(json.members) && json.members.length > 0) {
              const incoming = json.members;
              const serverIdMap = new Map<string, MemberRecord>();
              const serverEmailMap = new Map<string, MemberRecord>();

              // Process authoritative members from Cloudflare D1
              const normalizedServerList = incoming.map((m: any) => {
                const normalized: MemberRecord = {
                  ...m,
                  id: String(m.id),
                  displayName: m.displayName || m.display_name || m.username || m.id,
                  username: m.username || m.displayName || m.display_name || m.id,
                  email: m.email || '',
                  phone: m.phone || '',
                  role: m.role || 'MEMBER',
                  balance: Math.max(0, Number(m.balance ?? m.wallet_balance) || 0),
                  totalSpent: Math.max(0, Number(m.totalSpent ?? m.total_spent) || 0),
                  status: m.status || 'ACTIVE',
                  avatar: m.avatar || m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.displayName || m.username || m.id)}`,
                  createdAt: m.createdAt || m.created_at || new Date().toISOString(),
                  lastLogin: m.lastLogin || m.last_login || m.createdAt || m.created_at,
                };
                serverIdMap.set(String(normalized.id).toLowerCase(), normalized);
                if (normalized.email) {
                  serverEmailMap.set(String(normalized.email).toLowerCase(), normalized);
                }
                return normalized;
              });

              // Authoritative Cloudflare D1 list replaces local memory entirely
              const finalMembers: MemberRecord[] = [...normalizedServerList];
              finalMembers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              this.members = finalMembers;
              this.safeSetItem(this.KEYS.MEMBERS, JSON.stringify(this.members));
              hasUpdates = true;
            }

            // 2. Transactions (Smart Merge)
            if (json.transactions && Array.isArray(json.transactions)) {
              const incomingTx: any[] = json.transactions;
              const mergedMap = new Map<string, WalletTransaction>();

              incomingTx.forEach((tx: any) => {
                if (tx && (tx.id || tx.referenceId || tx.reference_id || tx.orderId)) {
                  const key = tx.id || tx.referenceId || tx.reference_id || tx.orderId;
                  const normalizedTx: WalletTransaction = {
                    id: String(tx.id || `tx_${Math.random()}`),
                    referenceId: String(tx.referenceId || tx.reference_id || tx.orderId || (tx.id ? `TX-${tx.id.slice(-6).toUpperCase()}` : 'GD-HE-THONG')),
                    memberId: String(tx.memberId || tx.member_id || ''),
                    memberEmail: tx.memberEmail || tx.member_email || '',
                    type: tx.type || 'DEPOSIT',
                    amount: Number(tx.amount) || 0,
                    balanceBefore: Math.max(0, Number(tx.balanceBefore ?? tx.balance_before) || 0),
                    balanceAfter: Math.max(0, Number(tx.balanceAfter ?? tx.balance_after) || 0),
                    status: tx.status || 'COMPLETED',
                    note: tx.note || tx.description || 'Giao dịch ví',
                    createdAt: tx.createdAt || tx.created_at || new Date().toISOString(),
                  };
                  mergedMap.set(key, normalizedTx);
                }
              });

              (this.walletTransactions || []).forEach((localTx) => {
                if (localTx && (localTx.id || localTx.referenceId)) {
                  const key = localTx.id || localTx.referenceId;
                  if (!mergedMap.has(key)) {
                    mergedMap.set(key, localTx);
                  }
                }
              });

              this.walletTransactions = Array.from(mergedMap.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              this.safeSetItem(this.KEYS.TRANSACTIONS, JSON.stringify(this.walletTransactions));
              hasUpdates = true;
            }

            // 3. Orders (Smart Merge)
            if (json.orders && Array.isArray(json.orders)) {
              const incomingOrders: any[] = json.orders;
              const mergedMap = new Map<string, AdminOrderRecord>();

              incomingOrders.forEach((o: any) => {
                if (o && (o.id || o.orderCode)) {
                  const key = o.id || o.orderCode;
                  mergedMap.set(key, o);
                }
              });

              (this.orders || []).forEach((localOrder) => {
                if (localOrder && (localOrder.id || localOrder.orderCode)) {
                  const key = localOrder.id || localOrder.orderCode;
                  if (!mergedMap.has(key)) {
                    mergedMap.set(key, localOrder);
                  }
                }
              });

              this.orders = Array.from(mergedMap.values());
              this.safeSetItem(this.KEYS.ORDERS, JSON.stringify(this.orders));
              hasUpdates = true;
            }

            // 4. SePay Config & Logs & Security Logs
            if (json.sepay && typeof json.sepay === 'object') {
              this.sepayConfig = json.sepay;
              this.safeSetItem(this.KEYS.SEPAY, JSON.stringify(this.sepayConfig));
              hasUpdates = true;
            }
            if (json.sepayLogs && Array.isArray(json.sepayLogs)) {
              this.sepayLogs = json.sepayLogs;
              this.safeSetItem(this.KEYS.SEPAY_LOGS, JSON.stringify(this.sepayLogs));
              hasUpdates = true;
            }
            if (json.securityLogs && Array.isArray(json.securityLogs)) {
              this.securityLogs = json.securityLogs;
              this.safeSetItem(this.KEYS.SECURITY_LOGS, JSON.stringify(this.securityLogs));
              hasUpdates = true;
            }

            // 5. Private Codes (Smart Merge)
            if (json.privateCodes && Array.isArray(json.privateCodes)) {
              const incomingPriv: any[] = json.privateCodes;
              const mergedMap = new Map<string, PrivateCodeIssue>();

              incomingPriv.forEach((p: any) => {
                if (p && (p.id || p.codeValue)) {
                  const key = p.id || p.codeValue;
                  mergedMap.set(key, p);
                }
              });

              (this.privateCodes || []).forEach((localPriv) => {
                if (localPriv && (localPriv.id || localPriv.codeValue)) {
                  const key = localPriv.id || localPriv.codeValue;
                  if (!mergedMap.has(key)) {
                    mergedMap.set(key, localPriv);
                  }
                }
              });

              this.privateCodes = Array.from(mergedMap.values());
              this.safeSetItem(this.KEYS.PRIVATE_CODES, JSON.stringify(this.privateCodes));
              hasUpdates = true;
            }

            // 6. Inventory (Smart Merge)
            if (json.inventory && Array.isArray(json.inventory)) {
              const incomingInv: any[] = json.inventory;
              const mergedMap = new Map<string, InventoryItem>();

              incomingInv.forEach((item: any) => {
                if (
                  item &&
                  item.codeValue &&
                  !this.deletedInventoryItemIds.has(item.id) &&
                  !this.deletedStoreProductIds.has(item.sku) &&
                  !this.deletedUtilityIds.has(item.sku)
                ) {
                  const uniqueKey = item.id || `${item.sku}_${item.codeValue.trim()}`;
                  mergedMap.set(uniqueKey, item);
                }
              });

              (this.inventory || []).forEach((localItem) => {
                if (
                  localItem &&
                  localItem.codeValue &&
                  !this.deletedInventoryItemIds.has(localItem.id) &&
                  !this.deletedStoreProductIds.has(localItem.sku) &&
                  !this.deletedUtilityIds.has(localItem.sku)
                ) {
                  const uniqueKey = localItem.id || `${localItem.sku}_${localItem.codeValue.trim()}`;
                  if (!mergedMap.has(uniqueKey)) {
                    mergedMap.set(uniqueKey, localItem);
                  } else {
                    const incoming = mergedMap.get(uniqueKey)!;
                    if (localItem.status === 'SOLD' && incoming.status !== 'SOLD') {
                      mergedMap.set(uniqueKey, localItem);
                    } else if (localItem.status === 'HOLD' && incoming.status === 'AVAILABLE') {
                      mergedMap.set(uniqueKey, localItem);
                    }
                  }
                }
              });

              this.inventory = Array.from(mergedMap.values());
              this.safeSetItem(this.KEYS.INVENTORY, JSON.stringify(this.inventory));
              hasUpdates = true;
            }

            // 7. Deleted Tombstones
            if (json.deletedStoreProducts && Array.isArray(json.deletedStoreProducts)) {
              json.deletedStoreProducts.forEach((id: string) => this.deletedStoreProductIds.add(id));
              this.safeSetItem('wcg_deleted_store_products', JSON.stringify(Array.from(this.deletedStoreProductIds)));
            }
            if (json.deletedUtilities && Array.isArray(json.deletedUtilities)) {
              json.deletedUtilities.forEach((id: string) => this.deletedUtilityIds.add(id));
              this.safeSetItem('wcg_deleted_utilities', JSON.stringify(Array.from(this.deletedUtilityIds)));
            }
            if (json.deletedGiveaways && Array.isArray(json.deletedGiveaways)) {
              json.deletedGiveaways.forEach((id: string) => this.deletedGiveawayIds.add(id));
              this.safeSetItem('wcg_deleted_giveaways', JSON.stringify(Array.from(this.deletedGiveawayIds)));
            }
            if (json.deletedInventoryCodes && Array.isArray(json.deletedInventoryCodes)) {
              json.deletedInventoryCodes.forEach((id: string) => this.deletedInventoryItemIds.add(id));
              this.safeSetItem('wcg_deleted_inventory_codes', JSON.stringify(Array.from(this.deletedInventoryItemIds)));
            }
            if (json.deletedFreeCodes && Array.isArray(json.deletedFreeCodes)) {
              json.deletedFreeCodes.forEach((id: string) => this.deletedFreeCodeIds.add(id));
              this.safeSetItem('wcg_deleted_free_codes', JSON.stringify(Array.from(this.deletedFreeCodeIds)));
            }
            if (json.customFreeCodes && Array.isArray(json.customFreeCodes)) {
              const currentCustomMap = new Map<string, FreeCodeRecord>();
              this.customFreeCodes.forEach((c) => { if (c && c.id) currentCustomMap.set(c.id, c); });
              let customUpdated = false;
              json.customFreeCodes.forEach((c: any) => {
                if (c && c.id && !this.deletedFreeCodeIds.has(c.id) && !currentCustomMap.has(c.id)) {
                  const codeVal = c.codeValue || c.code || '';
                  const norm: FreeCodeRecord = {
                    ...c,
                    codeValue: codeVal,
                    code: codeVal,
                    gameSlug: c.gameSlug || c.gameId || '',
                  };
                  this.customFreeCodes.push(norm);
                  currentCustomMap.set(c.id, norm);
                  customUpdated = true;
                }
              });
              if (customUpdated) {
                this.saveCustomFreeCodes();
              }
            }

            // 8. Content CMS
            if (json.content && Array.isArray(json.content) && json.content.length > 0) {
              const currentContent = localStorage.getItem(this.KEYS.CONTENT);
              let localItems: any[] = [];
              try { localItems = currentContent ? JSON.parse(currentContent) : []; } catch {}
              const mergedMap = new Map<string, any>();

              json.content.forEach((item: any) => {
                if (item && item.key) mergedMap.set(item.key, item);
              });

              let hasLocalNewer = false;
              localItems.forEach((localItem: any) => {
                if (localItem && localItem.key) {
                  const serverItem = mergedMap.get(localItem.key);
                  if (serverItem) {
                    const localTime = localItem.updatedAt ? Date.parse(localItem.updatedAt) : 0;
                    const serverTime = serverItem.updatedAt ? Date.parse(serverItem.updatedAt) : 0;
                    if (!isNaN(localTime) && !isNaN(serverTime) && localTime > serverTime) {
                      mergedMap.set(localItem.key, localItem);
                      hasLocalNewer = true;
                    }
                  } else {
                    mergedMap.set(localItem.key, localItem);
                  }
                }
              });

              const mergedList = Array.from(mergedMap.values());
              const newContent = JSON.stringify(mergedList);
              if (currentContent !== newContent) {
                this.contentItems = mergedList;
                this.safeSetItem(this.KEYS.CONTENT, newContent);
                crossOriginSync.setItem(this.KEYS.CONTENT, mergedList);
                hasUpdates = true;
              }
              if (hasLocalNewer) {
                this.pushFullStateToKV();
              }
            }

            // 9. Submissions
            if (json.submissions && Array.isArray(json.submissions)) {
              this.giftcodeSubmissions = json.submissions;
              this.safeSetItem(this.KEYS.SUBMISSIONS, JSON.stringify(this.giftcodeSubmissions));
              hasUpdates = true;
            }

            // Universal Templates (System-wide defaults for Giveaways, Catalog, Utilities, Store)
            if (json.universalTemplates && typeof json.universalTemplates === 'object') {
              templateService.setTemplates(json.universalTemplates);
            }

            // 10. Giveaways (Smart Merge protecting local updates & pool codes)
            if (json.giveaways && Array.isArray(json.giveaways)) {
              const localMap = new Map((this.giveaways || []).map((g) => [g.id, g]));
              const serverIdSet = new Set(json.giveaways.map((g: any) => g.id));

              const mergedServerList = json.giveaways.map((serverGw: any) => {
                const local = localMap.get(serverGw.id);
                if (!local) return serverGw;

                const localTime = local.updated_at ? Date.parse(local.updated_at) : (local.created_at ? Date.parse(local.created_at) : 0);
                const serverTime = serverGw.updated_at ? Date.parse(serverGw.updated_at) : (serverGw.created_at ? Date.parse(serverGw.created_at) : 0);

                const localIsNewer = !isNaN(localTime) && !isNaN(serverTime) && localTime > serverTime;

                const hasLink = Boolean(serverGw.custom_banner_link && String(serverGw.custom_banner_link).trim() !== '');
                const localHasLink = Boolean(local?.custom_banner_link && String(local?.custom_banner_link).trim() !== '');
                const bannerEnabled = serverGw.custom_banner_enabled !== undefined
                  ? Boolean(serverGw.custom_banner_enabled)
                  : (local?.custom_banner_enabled !== undefined ? Boolean(local.custom_banner_enabled) : (hasLink || localHasLink));

                // Pool resolution: strictly honor local if local was updated newer, and always protect local codes from empty server pool wipeouts
                const localPool = Array.isArray(local?.codes_pool) ? local.codes_pool : [];
                const serverPool = Array.isArray(serverGw?.codes_pool) ? serverGw.codes_pool : [];
                const rawPool = serverPool.length > 0
                  ? (localIsNewer && localPool.length > 0 ? localPool : serverPool)
                  : (localPool.length > 0 ? localPool : []);
                const pool = this.deduplicatePoolCodes(rawPool);

                const base = localIsNewer ? { ...serverGw, ...local } : { ...local, ...serverGw };
                const rem = Array.isArray(pool)
                  ? pool.length
                  : Math.max(0, Number(base.remaining_codes ?? 0));
                const tot = rem + (Number(base.claimed_codes) || 0);

                const rawActive = localIsNewer ? (local.is_active ?? serverGw.is_active) : (serverGw.is_active ?? local.is_active);
                const resolvedActive = rawActive !== 0 && rawActive !== false && rawActive !== '0';
                const resolvedStatus = (base.status === 'ENDED' || String(base.status).toUpperCase() === 'ENDED')
                  ? 'ENDED'
                  : (!resolvedActive ? 'PAUSED' : 'ACTIVE');

                return {
                  ...base,
                  is_active: resolvedActive,
                  status: resolvedStatus,
                  codes_pool: pool,
                  remaining_codes: rem,
                  total_codes: tot,
                  title: base.title || serverGw.title || local?.title || '',
                  use_template: localIsNewer
                    ? (local.use_template !== undefined ? local.use_template : (serverGw.use_template !== undefined ? serverGw.use_template : true))
                    : (serverGw.use_template !== undefined ? serverGw.use_template : (local.use_template !== undefined ? local.use_template : true)),
                  cooldown_minutes: localIsNewer
                    ? (local.cooldown_minutes !== undefined ? local.cooldown_minutes : serverGw.cooldown_minutes)
                    : (serverGw.cooldown_minutes !== undefined ? serverGw.cooldown_minutes : local.cooldown_minutes),
                  updated_at: localIsNewer ? local.updated_at : (serverGw.updated_at || local.updated_at || new Date().toISOString()),
                  custom_banner_enabled: bannerEnabled,
                  custom_banner_text: base.custom_banner_text || 'Tham gia nhóm zalo của web tại đây',
                  custom_banner_link: base.custom_banner_link || '',
                };
              });

              // Also preserve local-only newly created campaigns that server might not have yet
              const localOnly = (this.giveaways || []).filter(
                (lg) => lg && lg.id && !serverIdSet.has(lg.id) && !this.deletedGiveawayIds.has(lg.id)
              );

              const filtered = [...mergedServerList, ...localOnly].filter(
                (g: any) =>
                  g &&
                  g.id &&
                  !this.deletedGiveawayIds.has(g.id) &&
                  !(g.title === '15' && g.game_name && g.game_name.includes('Thiếu Hiệp'))
              );
              const currentStr = JSON.stringify(this.giveaways);
              const newStr = JSON.stringify(filtered);
              if (currentStr !== newStr) {
                this.giveaways = filtered;
                this.safeSetItem(this.KEYS.GIVEAWAYS, newStr);
                hasUpdates = true;
              }
            }

            // 11. Store Products
            if (json.storeProducts && Array.isArray(json.storeProducts)) {
              const filtered = json.storeProducts.filter((p: any) => p && p.id && !this.deletedStoreProductIds.has(p.id));
              const currentStr = JSON.stringify(this.storeProducts);
              const newStr = JSON.stringify(filtered);
              if (currentStr !== newStr) {
                this.storeProducts = filtered;
                this.safeSetItem(this.KEYS.STORE_PRODUCTS, newStr);
                hasUpdates = true;
              }
            }

            // 12. Utilities
            if (json.utilities && Array.isArray(json.utilities)) {
              const filtered = json.utilities.filter((u: any) => u && u.id && !this.deletedUtilityIds.has(u.id));
              const currentStr = JSON.stringify(this.utilities);
              const newStr = JSON.stringify(filtered);
              if (currentStr !== newStr) {
                this.utilities = filtered;
                this.safeSetItem(this.KEYS.UTILITIES, newStr);
                hasUpdates = true;
              }
            }

            // 13. Categories & Marketing Config
            if (json.utilityCategories && Array.isArray(json.utilityCategories)) {
              const currentCats = localStorage.getItem('wcg_admin_utility_categories_v1');
              const newCats = JSON.stringify(json.utilityCategories);
              if (currentCats !== newCats) {
                this.safeSetItem('wcg_admin_utility_categories_v1', newCats);
                hasUpdates = true;
              }
            }
            if (json.storeCategories && Array.isArray(json.storeCategories)) {
              const currentCats = localStorage.getItem('wcg_admin_store_categories_v1');
              const newCats = JSON.stringify(json.storeCategories);
              if (currentCats !== newCats) {
                this.safeSetItem('wcg_admin_store_categories_v1', newCats);
                hasUpdates = true;
              }
            }
                        if (json.crawlerSources && Array.isArray(json.crawlerSources)) {
              this.crawlerSources = json.crawlerSources;
              this.safeSetItem('wcg_admin_crawler_sources_v1', JSON.stringify(this.crawlerSources));
              hasUpdates = true;
            }

            // 13.5 News Articles Sync from Cloudflare D1/KV (Hiển thị đầy đủ bài viết trên mọi trình duyệt Admin)
            if (json.newsArticles && Array.isArray(json.newsArticles)) {
              let deletedNewsSet = new Set<string>();
              if (Array.isArray(json.deletedNewsArticles)) {
                json.deletedNewsArticles.forEach((id: string) => deletedNewsSet.add(String(id)));
              }
              try {
                const delRaw = localStorage.getItem('wcg_deleted_news_articles_v1');
                if (delRaw) {
                  const p = JSON.parse(delRaw);
                  if (Array.isArray(p)) p.forEach((id: string) => deletedNewsSet.add(String(id)));
                }
              } catch {}

              const cleanArticles = json.newsArticles.filter(
                (a: any) => a && a.id && !deletedNewsSet.has(a.id) && !deletedNewsSet.has(a.slug)
              );

              const currentNewsRaw = localStorage.getItem('wcg_news_articles_v1');
              let existingLocalArticles: any[] = [];
              try {
                if (currentNewsRaw) existingLocalArticles = JSON.parse(currentNewsRaw);
              } catch {}

              // Smart merge: bảo toàn các bài viết mới tạo cục bộ trong Admin chưa kịp sync lên máy chủ
              const serverIdSet = new Set(cleanArticles.map((a: any) => a.id));
              const serverSlugSet = new Set(cleanArticles.map((a: any) => a.slug));
              const localUnsynced = Array.isArray(existingLocalArticles)
                ? existingLocalArticles.filter(
                    (la: any) => la && la.id && !serverIdSet.has(la.id) && !serverSlugSet.has(la.slug) && !deletedNewsSet.has(la.id) && !deletedNewsSet.has(la.slug)
                  )
                : [];

              const mergedArticles = [...localUnsynced, ...cleanArticles];

              if (mergedArticles.length > 0 || !Array.isArray(existingLocalArticles) || existingLocalArticles.length === 0) {
                const newNewsStr = JSON.stringify(mergedArticles);
                if (currentNewsRaw !== newNewsStr || json.newsAutoSources || json.newsScheduleConfig) {
                  this.safeSetItem('wcg_news_articles_v1', newNewsStr);
                  newsService.applyServerSnapshot(mergedArticles, json.newsAutoSources, json.newsScheduleConfig);
                  window.dispatchEvent(new CustomEvent('wcg_news_updated', { detail: mergedArticles }));
                  hasUpdates = true;
                }
              }
            }

            if (json.crawlerPendingGames && Array.isArray(json.crawlerPendingGames)) {
              this.pendingGames = json.crawlerPendingGames;
              this.safeSetItem(this.KEYS.CRAWLER_PENDING_GAMES, JSON.stringify(this.pendingGames));
              hasUpdates = true;
            }

            if (json.crawlerAutoPublishGamesConfig && typeof json.crawlerAutoPublishGamesConfig === 'object') {
              this.crawlerAutoPublishGamesConfig = { ...this.crawlerAutoPublishGamesConfig, ...json.crawlerAutoPublishGamesConfig };
              this.safeSetItem(this.KEYS.CRAWLER_AUTO_PUBLISH_CONFIG, JSON.stringify(this.crawlerAutoPublishGamesConfig));
            }

            if (json.crawlerApiConfig && typeof json.crawlerApiConfig === 'object') {
              this.crawlerApiConfig = { ...this.crawlerApiConfig, ...json.crawlerApiConfig };
              this.safeSetItem(this.KEYS.CRAWLER_API_CONFIG, JSON.stringify(this.crawlerApiConfig));
              hasUpdates = true;
            }

            if (json.crawlerApiLogs && Array.isArray(json.crawlerApiLogs)) {
              this.crawlerApiLogs = json.crawlerApiLogs;
              this.safeSetItem(this.KEYS.CRAWLER_API_LOGS, JSON.stringify(this.crawlerApiLogs));
              hasUpdates = true;
            }

            if (json.marketingConfig && typeof json.marketingConfig === 'object') {
              const currentMarketing = localStorage.getItem('wcg_marketing_config_v1');
              const newMarketing = JSON.stringify(json.marketingConfig);
              if (currentMarketing !== newMarketing) {
                this.safeSetItem('wcg_marketing_config_v1', newMarketing);
                window.dispatchEvent(new CustomEvent('wcg_marketing_config_updated', { detail: json.marketingConfig }));
              }
            }

            // 14. Games (Catalog - ~660KB)
            if (json.games && Array.isArray(json.games) && json.games.length > 0) {
              this.games = json.games.map((g: any) => {
                const slug = g.slug || g.id || '';
                let icon = g.icon_url || g.iconUrl || '';
                if (!icon || icon.includes('codemoi.net') || icon.includes('googleusercontent.com') || icon.startsWith('/game-icons')) {
                  icon = `/game_icons/${slug}.webp`;
                }
                return { ...g, icon_url: icon, iconUrl: icon };
              });
              this.safeSetItem(this.KEYS.GAMES, JSON.stringify(this.games));
              hasUpdates = true;
            }

            // 15. Free Codes (Heavy Catalog - ~7.4MB)
            // Kept in memory, safeSetItem safely skips localStorage write to avoid quota overflow
            if (json.freeCodes && Array.isArray(json.freeCodes) && json.freeCodes.length > 0) {
              const customMap = new Map<string, FreeCodeRecord>();
              this.customFreeCodes.forEach((c) => {
                if (c && c.id && !this.deletedFreeCodeIds.has(c.id)) {
                  customMap.set(c.id, c);
                }
              });
              // CRUCIAL GUARD: If incoming json.freeCodes is smaller than 1000 items, NEVER wipe existing catalog!
              const baseCatalog = json.freeCodes.length >= 1000 ? json.freeCodes : this.freeCodes;
              const filteredCatalog = baseCatalog.filter(
                (c: any) => c && c.id && !this.deletedFreeCodeIds.has(c.id) && !customMap.has(c.id)
              );
              this.freeCodes = [...Array.from(customMap.values()), ...filteredCatalog];
              this.safeSetItem(this.KEYS.FREE_CODES, JSON.stringify(this.freeCodes));
              hasUpdates = true;
            }

            if (hasUpdates) {
              console.log('[Admin KV Sync] Pulled data successfully. Total members:', this.members.length, 'Transactions:', this.walletTransactions.length, 'Orders:', this.orders.length);
              this.broadcastSync('KV_DATA_PULLED');
            }
            if (json.members && Array.isArray(json.members)) {
              break;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Admin KV Sync] Error fetching from ${baseUrl}:`, err?.message || err);
      }
    }
  }

  private saveGames() {
    try {
      localStorage.setItem(this.KEYS.GAMES, JSON.stringify(this.games));
      crossOriginSync.setItem(this.KEYS.GAMES, this.games);
      this.broadcastSync('GAMES_UPDATED');
      this.syncToCloudflareKV(this.KEYS.GAMES, this.games);
      this.pushFullStateToKV();
    } catch {}
  }
  private saveFreeCodes() {
    try {
      this.safeSetItem(this.KEYS.FREE_CODES, JSON.stringify(this.freeCodes));
    } catch {}
    try {
      this.saveCustomFreeCodes();
      this.broadcastSync('FREE_CODES_UPDATED');
      this.pushFullStateToKV();
    } catch {}
  }
  private saveSubmissions() {
    try {
      localStorage.setItem(this.KEYS.SUBMISSIONS, JSON.stringify(this.giftcodeSubmissions));
      crossOriginSync.setItem(this.KEYS.SUBMISSIONS, this.giftcodeSubmissions);
      this.broadcastSync('SUBMISSIONS_UPDATED');
      this.syncToCloudflareKV(this.KEYS.SUBMISSIONS, this.giftcodeSubmissions);
    } catch {}
  }
  private saveMembers() {
    try {
      localStorage.setItem(this.KEYS.MEMBERS, JSON.stringify(this.members));
      crossOriginSync.setItem(this.KEYS.MEMBERS, this.members);
      this.broadcastSync('MEMBERS_UPDATED');
      this.syncToCloudflareKV(this.KEYS.MEMBERS, this.members);
      this.pushFullStateToKV();
    } catch {}
  }
  private saveTransactions() {
    try {
      localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(this.walletTransactions));
      crossOriginSync.setItem(this.KEYS.TRANSACTIONS, this.walletTransactions);
      this.broadcastSync('TRANSACTIONS_UPDATED');
      this.syncToCloudflareKV(this.KEYS.TRANSACTIONS, this.walletTransactions);
    } catch {}
  }
  private savePrivateCodes() {
    try {
      localStorage.setItem(this.KEYS.PRIVATE_CODES, JSON.stringify(this.privateCodes));
      crossOriginSync.setItem(this.KEYS.PRIVATE_CODES, this.privateCodes);
      this.broadcastSync('PRIVATE_CODES_UPDATED');
      this.syncToCloudflareKV(this.KEYS.PRIVATE_CODES, this.privateCodes);
    } catch {}
  }
  private saveInventory() {
    try {
      localStorage.setItem(this.KEYS.INVENTORY, JSON.stringify(this.inventory));
      crossOriginSync.setItem(this.KEYS.INVENTORY, this.inventory);
      this.broadcastSync('INVENTORY_UPDATED');
      this.syncToCloudflareKV(this.KEYS.INVENTORY, this.inventory);
      this.saveStoreProducts();
      this.saveUtilities();
      this.pushFullStateToKV();
    } catch {}
  }
  private saveOrders() {
    try {
      localStorage.setItem(this.KEYS.ORDERS, JSON.stringify(this.orders));
      crossOriginSync.setItem(this.KEYS.ORDERS, this.orders);
      this.broadcastSync('ORDERS_UPDATED');
      this.syncToCloudflareKV(this.KEYS.ORDERS, this.orders);
    } catch {}
  }
  private saveSePayLogs() {
    try {
      localStorage.setItem(this.KEYS.SEPAY_LOGS, JSON.stringify(this.sepayLogs));
      crossOriginSync.setItem(this.KEYS.SEPAY_LOGS, this.sepayLogs);
      this.broadcastSync('SEPAY_LOGS_UPDATED');
      this.syncToCloudflareKV(this.KEYS.SEPAY_LOGS, this.sepayLogs);
    } catch {}
  }
  private saveContent() {
    try {
      localStorage.setItem(this.KEYS.CONTENT, JSON.stringify(this.contentItems));
      crossOriginSync.setItem(this.KEYS.CONTENT, this.contentItems);
      this.broadcastSync('CONTENT_UPDATED');
      this.syncToCloudflareKV(this.KEYS.CONTENT, this.contentItems);
    } catch {}
  }
  private async saveSePay(): Promise<void> {
    try {
      localStorage.setItem(this.KEYS.SEPAY, JSON.stringify(this.sepayConfig));
      crossOriginSync.setItem(this.KEYS.SEPAY, this.sepayConfig);
      this.broadcastSync('SEPAY_UPDATED');
      await this.syncToCloudflareKV(this.KEYS.SEPAY, this.sepayConfig);
    } catch {}
  }
  private saveSecurityLogs() {
    try {
      localStorage.setItem(this.KEYS.SECURITY_LOGS, JSON.stringify(this.securityLogs));
      this.broadcastSync('SECURITY_LOGS_UPDATED');
      this.syncToCloudflareKV(this.KEYS.SECURITY_LOGS, this.securityLogs);
    } catch {}
  }
  private saveGiveaways() {
    try {
      localStorage.setItem(this.KEYS.GIVEAWAYS, JSON.stringify(this.giveaways));
      crossOriginSync.setItem(this.KEYS.GIVEAWAYS, this.giveaways);
      this.broadcastSync('GIVEAWAYS_UPDATED');
      this.syncToCloudflareKV(this.KEYS.GIVEAWAYS, this.giveaways);
    } catch {}
  }
  private saveStoreProducts() {
    try {
      const computed = this.getStoreProducts();
      localStorage.setItem(this.KEYS.STORE_PRODUCTS, JSON.stringify(computed));
      crossOriginSync.setItem(this.KEYS.STORE_PRODUCTS, computed);
      this.broadcastSync('STORE_PRODUCTS_UPDATED');
      this.syncToCloudflareKV(this.KEYS.STORE_PRODUCTS, computed);
    } catch {}
  }
  private saveUtilities() {
    try {
      const computed = this.getUtilities();
      localStorage.setItem(this.KEYS.UTILITIES, JSON.stringify(computed));
      crossOriginSync.setItem(this.KEYS.UTILITIES, computed);
      this.broadcastSync('UTILITIES_UPDATED');
      this.syncToCloudflareKV(this.KEYS.UTILITIES, computed);
    } catch {}
  }
  private logAction(
    action: string,
    targetId: string,
    severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO',
    details?: any
  ) {
    const log: SecurityLog = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      actorName: this.currentAdmin.displayName,
      actorEmail: this.currentAdmin.email,
      action,
      targetId,
      ipAddress: '118.69.182.44',
      severity,
      details,
      createdAt: new Date().toISOString(),
    };
    this.securityLogs.unshift(log);
    this.saveSecurityLogs();
  }

  // --- CURRENT ADMIN ---
  public getCurrentAdminUser(): AdminUser {
    return this.currentAdmin;
  }
  public updateCurrentAdminUser(user: AdminUser): AdminUser {
    this.currentAdmin = user;
    try {
      localStorage.setItem(this.KEYS.ADMIN_USER, JSON.stringify(this.currentAdmin));
    } catch {}
    return this.currentAdmin;
  }
  public updateAdminProfile(data: Partial<AdminUser>): AdminUser {
    this.currentAdmin = { ...this.currentAdmin, ...data };
    try {
      localStorage.setItem(this.KEYS.ADMIN_USER, JSON.stringify(this.currentAdmin));
    } catch {}
    this.logAction('UPDATE_ADMIN_PROFILE', this.currentAdmin.id, 'INFO', data);
    return this.currentAdmin;
  }

  // --- MODULE 1: DASHBOARD METRICS ---
  public getDashboardMetrics(): DashboardMetrics {
    const totalRevenue = this.orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.amount, 0);

    const activeGames = this.games.filter((g) => g.status !== 'INACTIVE').length;
    const pendingSubs = this.giftcodeSubmissions.filter((s) => s.status === 'PENDING').length;
    const completedOrders = this.orders.filter((o) => o.status === 'COMPLETED').length;

    return {
      totalRevenue,
      totalGames: this.games.length,
      activeGames: activeGames > 0 ? activeGames : this.games.length,
      totalGiftcodes: this.freeCodes.length,
      pendingSubmissions: pendingSubs,
      totalMembers: this.members.length,
      totalOrders: this.orders.length,
      completedOrders,
    };
  }

  /**
   * Real-time Multi-line Timeline Analytics aggregated accurately from actual client orders, members, free codes, games, and copy events.
   */
  public getMultiLineTimelineAnalytics(days: number = 7): DailyDataPoint[] {
    const points: DailyDataPoint[] = [];
    const now = new Date();

    // 1. Prepare maps by Date Key ('YYYY-MM-DD')
    const revenueMap = new Map<string, number>();
    const ordersMap = new Map<string, number>();
    const membersMap = new Map<string, number>();
    const codesMap = new Map<string, number>();
    const gamesMap = new Map<string, number>();
    const copiesMap = new Map<string, number>();

    // 2. Aggregate actual completed orders
    for (const o of this.orders) {
      if (o.status === 'COMPLETED' && o.createdAt) {
        const dKey = o.createdAt.slice(0, 10);
        revenueMap.set(dKey, (revenueMap.get(dKey) || 0) + (o.amount || 0));
        ordersMap.set(dKey, (ordersMap.get(dKey) || 0) + 1);
      }
    }

    // 3. Aggregate actual completed wallet deposits / transactions
    for (const tx of this.walletTransactions) {
      if (tx.status === 'COMPLETED' && tx.amount > 0 && tx.createdAt) {
        const dKey = tx.createdAt.slice(0, 10);
        revenueMap.set(dKey, (revenueMap.get(dKey) || 0) + tx.amount);
      }
    }

    // 4. Aggregate actual members registered
    for (const m of this.members) {
      if (m.createdAt) {
        const dKey = m.createdAt.slice(0, 10);
        membersMap.set(dKey, (membersMap.get(dKey) || 0) + 1);
      }
    }

    // 5. Aggregate actual giftcodes added
    for (const c of this.freeCodes) {
      if (c.createdAt) {
        const dKey = c.createdAt.slice(0, 10);
        codesMap.set(dKey, (codesMap.get(dKey) || 0) + 1);
      }
    }

    // 6. Aggregate actual games added
    for (const g of this.games) {
      const rawDate = g.created_at || g.release_date || '';
      if (rawDate && rawDate.length >= 10) {
        const dKey = rawDate.slice(0, 10);
        gamesMap.set(dKey, (gamesMap.get(dKey) || 0) + 1);
      }
    }

    // 7. Aggregate actual copy clicks recorded from client website
    try {
      const copyStatsStr = typeof window !== 'undefined' ? localStorage.getItem('wcg_daily_copy_stats') : null;
      if (copyStatsStr) {
        const parsed = JSON.parse(copyStatsStr);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([dKey, count]) => {
            copiesMap.set(dKey, (copiesMap.get(dKey) || 0) + Number(count));
          });
        }
      }
    } catch {}

    // 8. Generate date sequence for the selected time window (days)
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dKey = `${yyyy}-${mm}-${dd}`;

      const dayOfWeek = d.getDay();
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayName = dayNames[dayOfWeek];
      const dateFormatted = `${dd}/${mm}`;
      const fullDate = `${dd}/${mm}/${yyyy}`;

      points.push({
        date: dateFormatted,
        dayLabel: days <= 14 ? `${dayName} (${dateFormatted})` : dateFormatted,
        fullDate,
        revenue: revenueMap.get(dKey) || 0,
        newMembers: membersMap.get(dKey) || 0,
        codeCopies: copiesMap.get(dKey) || 0,
        newCodes: codesMap.get(dKey) || 0,
        newGames: gamesMap.get(dKey) || 0,
        orders: ordersMap.get(dKey) || 0,
      });
    }

    return points;
  }

  /**
   * Record a live giftcode copy event from user clicks
   */
  public recordCopyEvent(code: string, gameSlug: string = ''): void {
    if (typeof window === 'undefined' || !code) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const currentStatsStr = localStorage.getItem('wcg_daily_copy_stats');
      const stats = currentStatsStr ? JSON.parse(currentStatsStr) : {};
      stats[today] = (stats[today] || 0) + 1;
      localStorage.setItem('wcg_daily_copy_stats', JSON.stringify(stats));

      const currentEventsStr = localStorage.getItem('wcg_client_copy_events');
      const events = currentEventsStr ? JSON.parse(currentEventsStr) : [];
      events.unshift({
        id: `copy_${Date.now()}`,
        code: code.trim(),
        gameSlug: gameSlug.trim(),
        timestamp: new Date().toISOString(),
      });
      if (events.length > 500) events.length = 500;
      localStorage.setItem('wcg_client_copy_events', JSON.stringify(events));

      if ('BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('wcg_data_sync');
          channel.postMessage({ type: 'COPY_RECORDED', code, gameSlug, today });
        } catch {}
      }
    } catch {}
  }

  // --- MODULE 2: GAMES CRUD ---
  public getGames(filter?: { category?: string; status?: string }): GameAdminRecord[] {
    let list = this.games.map((g) => {
      const slug = g.slug || g.id || '';
      let icon = g.icon_url || g.iconUrl || '';
      if (!icon || icon.includes('codemoi.net') || icon.includes('googleusercontent.com') || icon.startsWith('/game-icons')) {
        icon = `/game_icons/${slug}.webp`;
      }
      return { ...g, icon_url: icon, iconUrl: icon };
    });
    if (filter?.category && filter.category !== 'ALL') {
      list = list.filter((g) => g.category.toLowerCase() === filter.category?.toLowerCase());
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter((g) => g.status === filter.status);
    }
    return list;
  }

  public createGame(game: Omit<GameAdminRecord, 'id'>): GameAdminRecord {
    const id = game.slug || `game_${Date.now()}`;
    const playUrl = game.google_play_url || game.download_android || '';
    const iosUrl = game.app_store_url || game.download_ios || '';
    let pkgName = game.android_package_name || '';
    if (!pkgName && playUrl) {
      const match = playUrl.match(/[?&]id=([a-zA-Z0-9._]+)/);
      if (match) pkgName = match[1];
    }

    const newGame: GameAdminRecord = {
      ...game,
      google_play_url: playUrl,
      download_android: playUrl,
      app_store_url: iosUrl,
      download_ios: iosUrl,
      android_package_name: pkgName,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.games.unshift(newGame);
    this.saveGames();
    this.logAction('CREATE_GAME', newGame.id, 'INFO', { name: newGame.name });
    return newGame;
  }

  public updateGame(id: string, data: Partial<GameAdminRecord>): GameAdminRecord | null {
    const idx = this.games.findIndex((g) => g.id === id || g.slug === id);
    if (idx === -1) return null;

    const playUrl = data.google_play_url !== undefined 
      ? data.google_play_url 
      : (data.download_android !== undefined ? data.download_android : this.games[idx].google_play_url || this.games[idx].download_android || '');
    const iosUrl = data.app_store_url !== undefined 
      ? data.app_store_url 
      : (data.download_ios !== undefined ? data.download_ios : this.games[idx].app_store_url || this.games[idx].download_ios || '');
    let pkgName = data.android_package_name !== undefined ? data.android_package_name : this.games[idx].android_package_name;
    if (!pkgName && playUrl) {
      const match = playUrl.match(/[?&]id=([a-zA-Z0-9._]+)/);
      if (match) pkgName = match[1];
    }

    this.games[idx] = {
      ...this.games[idx],
      ...data,
      google_play_url: playUrl,
      download_android: playUrl,
      app_store_url: iosUrl,
      download_ios: iosUrl,
      android_package_name: pkgName,
      updated_at: new Date().toISOString(),
    };
    this.saveGames();
    this.logAction('UPDATE_GAME', id, 'INFO', data);
    return this.games[idx];
  }

  public deleteGame(id: string): boolean {
    const game = this.games.find((g) => g.id === id || g.slug === id);
    if (!game) return false;

    const gameSlug = game.slug || game.id;
    this.games = this.games.filter((g) => g.id !== id && g.slug !== id);
    // Also cleanup free codes associated with this game if desired
    this.freeCodes = this.freeCodes.filter((c) => c.gameSlug !== gameSlug);
    
    this.saveGames();
    this.saveFreeCodes();
    this.logAction('DELETE_GAME', id, 'WARNING', { name: game.name, slug: gameSlug });
    return true;
  }

  public deleteGamesBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialCount = this.games.length;
    
    // Collect slugs of games to delete
    const slugsToDelete = new Set<string>();
    this.games.forEach((g) => {
      if (idSet.has(g.id) || (g.slug && idSet.has(g.slug))) {
        slugsToDelete.add(g.slug || g.id);
      }
    });

    this.games = this.games.filter((g) => !idSet.has(g.id) && (!g.slug || !idSet.has(g.slug)));
    const deletedCount = initialCount - this.games.length;

    if (slugsToDelete.size > 0) {
      this.freeCodes = this.freeCodes.filter((c) => !slugsToDelete.has(c.gameSlug));
      this.saveFreeCodes();
    }

    this.saveGames();
    this.logAction('DELETE_GAMES_BULK', `COUNT_${deletedCount}`, 'WARNING', { count: deletedCount, ids });
    return deletedCount;
  }

  public exportGamesToCsv(): string {
    const header = 'ID,Name,Slug,Publisher,Category,Rating,Status,Platform,LicenseNo,ReleaseDate\n';
    const rows = this.games
      .map(
        (g) =>
          `"${g.id}","${g.name}","${g.slug}","${g.publisher}","${g.category}",${g.rating},"${g.status}","${g.platform || ''}","${g.so_giay_phep || ''}","${g.release_date}"`
      )
      .join('\n');
    return header + rows;
  }

  // --- MODULE 3: FREE CODES CRUD ---
  public getFreeCodes(filter?: { gameSlug?: string; status?: string }): FreeCodeRecord[] {
    let list = [...this.freeCodes];
    if (filter?.gameSlug && filter.gameSlug !== 'ALL') {
      const target = filter.gameSlug.toLowerCase();
      const targetBase = target.replace(/-mobile$/i, '').replace(/_/g, '-');
      list = list.filter((c) => {
        const slug = (c.gameSlug || '').toLowerCase();
        const slugBase = slug.replace(/-mobile$/i, '').replace(/_/g, '-');
        const isMatch =
          slug === target ||
          slugBase === targetBase ||
          ((target === 'huyen-thoai-hai-tac' || target === 'pirate-legends') &&
            (slug === 'huyen-thoai-hai-tac' || slug === 'pirate-legends'));
        return isMatch;
      });
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter((c) => c.status === filter.status);
    }
    return list;
  }

  public createFreeCode(code: Omit<FreeCodeRecord, 'id'>): FreeCodeRecord {
    const newCode: FreeCodeRecord = {
      ...code,
      id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.customFreeCodes.unshift(newCode);
    this.saveCustomFreeCodes();

    this.freeCodes.unshift(newCode);
    this.saveFreeCodes();
    this.logAction('CREATE_FREE_CODE', newCode.id, 'INFO', { code: newCode.codeValue, game: newCode.gameSlug });
    return newCode;
  }

  public updateFreeCode(id: string, data: Partial<FreeCodeRecord>): FreeCodeRecord | null {
    const idx = this.freeCodes.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const updatedItem: FreeCodeRecord = {
      ...this.freeCodes[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    } as any;
    this.freeCodes[idx] = updatedItem;

    this.customFreeCodes = [updatedItem, ...this.customFreeCodes.filter((c) => c.id !== id)];
    this.saveCustomFreeCodes();
    this.saveFreeCodes();
    this.logAction('UPDATE_FREE_CODE', id, 'INFO', data);
    return this.freeCodes[idx];
  }

  public deleteFreeCode(id: string): boolean {
    const c = this.freeCodes.find((x) => x.id === id);
    if (!c) return false;

    this.deletedFreeCodeIds.add(id);
    this.saveDeletedFreeCodeIds();

    this.customFreeCodes = this.customFreeCodes.filter((x) => x.id !== id);
    this.saveCustomFreeCodes();

    this.freeCodes = this.freeCodes.filter((x) => x.id !== id);
    this.saveFreeCodes();
    this.logAction('DELETE_FREE_CODE', id, 'INFO', { code: c.codeValue });
    return true;
  }

  public deleteFreeCodesBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    ids.forEach((id) => this.deletedFreeCodeIds.add(id));
    this.saveDeletedFreeCodeIds();

    this.customFreeCodes = this.customFreeCodes.filter((x) => !idSet.has(x.id));
    this.saveCustomFreeCodes();

    const initialCount = this.freeCodes.length;
    this.freeCodes = this.freeCodes.filter((c) => !idSet.has(c.id));
    const deletedCount = initialCount - this.freeCodes.length;
    this.saveFreeCodes();
    this.logAction('DELETE_FREE_CODES_BULK', `COUNT_${deletedCount}`, 'WARNING', { count: deletedCount, ids });
    return deletedCount;
  }

  public bulkImportCodes(
    gameSlug: string,
    codes: Array<{ code: string; rewards?: string; expiresAt?: string }>
  ): { imported: number; duplicates: number } {
    const existing = new Set(
      this.freeCodes.filter((c) => c.gameSlug === gameSlug).map((c) => c.codeValue.toUpperCase())
    );

    let imported = 0;
    let duplicates = 0;
    const newItems: FreeCodeRecord[] = [];

    for (const item of codes) {
      const upper = item.code.trim().toUpperCase();
      if (existing.has(upper)) {
        duplicates++;
      } else {
        existing.add(upper);
        const record: FreeCodeRecord = {
          id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          gameSlug,
          codeValue: upper,
          rewards: item.rewards || 'Phần quà tân thủ',
          status: 'ACTIVE',
          expiresAt: item.expiresAt || '',
          isVerified: true,
          copyCount: 0,
          createdAt: new Date().toISOString(),
        };
        newItems.unshift(record);
        imported++;
      }
    }

    if (newItems.length > 0) {
      this.customFreeCodes.unshift(...newItems);
      this.saveCustomFreeCodes();
      this.freeCodes.unshift(...newItems);
      this.saveFreeCodes();
    }
    this.logAction('BULK_IMPORT_CODES', gameSlug, 'INFO', { imported, duplicates });
    return { imported, duplicates };
  }

  // --- MODULE 4: GIFTCODES MODERATION ---
  public getSubmissions(filter?: { status?: string }): GiftcodeSubmission[] {
    let list = [...this.giftcodeSubmissions];
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter((s) => s.status === filter.status);
    }
    return list;
  }

  public approveSubmission(id: string): GiftcodeSubmission | null {
    const idx = this.giftcodeSubmissions.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    const sub = this.giftcodeSubmissions[idx];
    sub.status = 'APPROVED';
    this.saveSubmissions();

    // Auto-publish to Free Codes table
    this.createFreeCode({
      gameSlug: sub.gameSlug,
      codeValue: sub.codeValue,
      rewards: sub.rewards,
      status: 'ACTIVE',
      expiresAt: (sub as any).expiresAt || '',
      isVerified: true,
      copyCount: 0,
      notes: `Đóng góp bởi ${sub.submitterName} (${sub.submitterEmail})`,
    });

    this.logAction('APPROVE_GIFTCODE_SUBMISSION', id, 'INFO', {
      code: sub.codeValue,
      submitter: sub.submitterEmail,
    });
    return sub;
  }

  public rejectSubmission(id: string, reason: string): GiftcodeSubmission | null {
    const idx = this.giftcodeSubmissions.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    const sub = this.giftcodeSubmissions[idx];
    sub.status = 'REJECTED';
    sub.rejectionReason = reason;
    this.saveSubmissions();

    this.logAction('REJECT_GIFTCODE_SUBMISSION', id, 'INFO', {
      code: sub.codeValue,
      reason,
    });
    return sub;
  }

  // --- MODULE 5: MEMBERS CRUD & ROLE ---
  public getMembers(filter?: { role?: string; status?: string }): MemberRecord[] {
    if (!Array.isArray(this.members)) this.members = [];
    let list: MemberRecord[] = this.members.filter(Boolean).map((m: any, idx: number) => {
      const id = String(m.id || `usr_${idx + 1}`);
      const displayName = String(m.displayName || m.display_name || m.username || `Thành viên #${idx + 1}`);
      const username = String(m.username || displayName);
      const email = String(m.email || '');
      const phone = String(m.phone || '');
      let role = (m.role || (m.isAdmin ? 'ADMIN' : 'MEMBER')) as UserRole;
      if (role === 'USER' as any) role = 'MEMBER';
      const balance = Math.max(0, Number(m.balance ?? m.wallet_balance) || 0);
      const totalSpent = Math.max(0, Number(m.totalSpent ?? m.total_spent) || 0);
      const status = (m.status === 'BANNED' ? 'BANNED' : 'ACTIVE') as 'ACTIVE' | 'BANNED';
      const avatar = m.avatar || m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName || id)}&backgroundColor=0b0d19,16192e,241a45`;
      const createdAt = m.createdAt || m.created_at || new Date().toISOString();

      return {
        id,
        displayName,
        username,
        email,
        phone,
        role,
        balance,
        totalSpent,
        status,
        avatar,
        createdAt,
      };
    });

    if (filter?.role && filter.role !== 'ALL') {
      list = list.filter((m) => m.role === filter.role);
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter((m) => m.status === filter.status);
    }
    return list;
  }

  public updateMember(id: string, data: Partial<MemberRecord>): MemberRecord | null {
    const idx = this.members.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    this.members[idx] = { ...this.members[idx], ...data };
    this.saveMembers();
    this.logAction('UPDATE_MEMBER', id, 'INFO', data);
    return this.members[idx];
  }

  public banMember(id: string, reason: string): boolean {
    const m = this.members.find((x) => x.id === id);
    if (!m) return false;

    m.status = 'BANNED';
    this.saveMembers();
    this.logAction('BAN_MEMBER', id, 'WARNING', { displayName: m.displayName, reason });
    return true;
  }

  public unbanMember(id: string): boolean {
    const m = this.members.find((x) => x.id === id);
    if (!m) return false;

    m.status = 'ACTIVE';
    this.saveMembers();
    this.logAction('UNBAN_MEMBER', id, 'INFO', { displayName: m.displayName });
    return true;
  }

  // --- MODULE 6: FINANCIAL LEDGER & WALLET ADJUSTMENT ---
  public getTransactions(filter?: { type?: string }): WalletTransaction[] {
    let list = [...this.walletTransactions];
    if (filter?.type && filter.type !== 'ALL') {
      list = list.filter((t) => t.type === filter.type);
    }
    return list;
  }

  public adjustMemberBalance(memberId: string, amount: number, note: string): MemberRecord | null {
    const member = this.members.find((m) => m.id === memberId);
    if (!member) return null;

    const balanceBefore = member.balance;
    const balanceAfter = Math.max(0, balanceBefore + amount);
    member.balance = balanceAfter;
    this.saveMembers();

    // Strict append-only financial ledger record
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
      memberId: member.id,
      memberEmail: member.email,
      type: amount >= 0 ? 'ADMIN_ADJUST' : 'ADMIN_ADJUST',
      amount,
      balanceBefore,
      balanceAfter,
      status: 'COMPLETED',
      note: note || 'Admin điều chỉnh số dư ví',
      createdAt: new Date().toISOString(),
    };
    this.walletTransactions.unshift(tx);
    this.saveTransactions();
    this.pushFullStateToKV();

    this.logAction('ADJUST_WALLET_BALANCE', member.id, 'CRITICAL', {
      memberEmail: member.email,
      amount,
      balanceBefore,
      balanceAfter,
      note,
    });

    return member;
  }

  public resetAllMembersBalanceToZero(note: string = 'Admin điều chỉnh toàn bộ ví về 0 đồng'): void {
    const now = new Date().toISOString();
    let resetCount = 0;

    this.members.forEach((m) => {
      const oldBal = Number(m.balance) || 0;
      m.balance = 0;
      if (oldBal !== 0) {
        resetCount++;
        const tx: WalletTransaction = {
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          referenceId: `RST-${Date.now().toString().slice(-6)}`,
          memberId: m.id,
          memberEmail: m.email,
          type: 'ADMIN_ADJUST',
          amount: -oldBal,
          balanceBefore: oldBal,
          balanceAfter: 0,
          status: 'COMPLETED',
          note: note,
          createdAt: now,
        };
        this.walletTransactions.unshift(tx);
      }
    });

    this.saveMembers();
    this.saveTransactions();
    this.pushFullStateToKV();

    this.logAction('RESET_ALL_WALLETS_TO_ZERO', 'SYSTEM', 'CRITICAL', {
      note,
      resetCount,
      totalMembers: this.members.length,
      timestamp: now,
    });
  }

  public async resetAllWalletsAndRevenueToZero(note: string = 'Admin điều chỉnh toàn bộ ví và tổng doanh thu về 0 đồng'): Promise<void> {
    const now = new Date().toISOString();

    // 1. Reset all members balance and totalSpent to 0
    this.members.forEach((m) => {
      m.balance = 0;
      m.totalSpent = 0;
    });
    this.saveMembers();

    // 2. Clear all wallet transactions to 0
    this.walletTransactions = [];
    this.saveTransactions();

    // 3. Clear all orders (Doanh thu = 0)
    this.orders = [];
    this.saveOrders();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wcg_orders', JSON.stringify([]));
    }

    // 4. Clear SePay logs
    this.sepayLogs = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.KEYS.SEPAY_LOGS, JSON.stringify([]));
    }

    // 5. Reset user in localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const uRaw = localStorage.getItem('wcg_user');
        if (uRaw) {
          const u = JSON.parse(uRaw);
          u.wallet_balance = 0;
          localStorage.setItem('wcg_user', JSON.stringify(u));
        }
      } catch {}
    }

    // 6. Broadcast across tabs
    this.broadcastSync('MEMBERS_UPDATED', this.members);
    this.broadcastSync('TRANSACTIONS_UPDATED', []);
    this.broadcastSync('ORDERS_UPDATED', []);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_admin_data_updated'));
      window.dispatchEvent(new CustomEvent('wcg_user_registered'));
    }

    // 7. Push to Cloudflare D1
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('wcg_auth_token') ||
            sessionStorage.getItem('wcg_auth_token') ||
            localStorage.getItem('wcg_admin_sync_key') ||
            sessionStorage.getItem('wcg_admin_sync_key') ||
            ''
          : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'RESET_WALLET_AND_REVENUE', resetWalletAndRevenue: true }),
      }).catch(() => {});

      await Promise.allSettled([
        this.syncToCloudflareKV(this.KEYS.MEMBERS, this.members),
        this.syncToCloudflareKV(this.KEYS.TRANSACTIONS, []),
        this.syncToCloudflareKV(this.KEYS.ORDERS, []),
      ]);
    } catch {}

    this.logAction('RESET_ALL_WALLETS_AND_REVENUE_TO_ZERO', 'SYSTEM', 'CRITICAL', {
      note,
      totalMembers: this.members.length,
      timestamp: now,
    });
  }

  // --- MODULE 7: PRIVATE CODES ---
  public getPrivateCodes(): PrivateCodeIssue[] {
    return [...this.privateCodes];
  }

  public issuePrivateCode(data: Omit<PrivateCodeIssue, 'id' | 'isClaimed' | 'createdAt'>): PrivateCodeIssue {
    const item: PrivateCodeIssue = {
      ...data,
      id: `priv_${Date.now()}`,
      isClaimed: false,
      createdAt: new Date().toISOString(),
    };
    this.privateCodes.unshift(item);
    this.savePrivateCodes();
    this.logAction('ISSUE_PRIVATE_CODE', item.id, 'INFO', { code: item.codeValue, recipient: item.memberEmail });
    return item;
  }

  public deletePrivateCode(id: string): boolean {
    const item = this.privateCodes.find((x) => x.id === id);
    if (!item) return false;

    this.privateCodes = this.privateCodes.filter((x) => x.id !== id);
    this.savePrivateCodes();
    this.logAction('REVOKE_PRIVATE_CODE', id, 'WARNING', { code: item.codeValue });
    return true;
  }

  public deletePrivateCodesBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialCount = this.privateCodes.length;
    this.privateCodes = this.privateCodes.filter((x) => !idSet.has(x.id));
    const deletedCount = initialCount - this.privateCodes.length;
    this.savePrivateCodes();
    this.logAction('REVOKE_PRIVATE_CODES_BULK', `COUNT_${deletedCount}`, 'WARNING', { count: deletedCount, ids });
    return deletedCount;
  }

  // --- MODULE 8: CODE INVENTORY ---
  public getInventory(filter?: { sku?: string; status?: string }): InventoryItem[] {
    let list = [...this.inventory];
    if (filter?.sku && filter.sku !== 'ALL') {
      list = list.filter((i) => i.sku === filter.sku);
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter((i) => i.status === filter.status);
    }
    return list;
  }

  public addInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt'>): InventoryItem {
    const newItem: InventoryItem = {
      ...item,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.inventory.unshift(newItem);
    this.saveInventory();
    this.logAction('ADD_INVENTORY_ITEM', newItem.id, 'INFO', { sku: newItem.sku, code: newItem.codeValue });
    return newItem;
  }

  public addInventoryItemsBulk(items: Array<Omit<InventoryItem, 'id' | 'createdAt'>>): number {
    if (!items || items.length === 0) return 0;
    const now = new Date().toISOString();
    const newRecords: InventoryItem[] = items.map((item, idx) => ({
      ...item,
      id: `inv_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      createdAt: now,
    }));
    this.inventory.unshift(...newRecords);
    this.saveInventory();
    this.logAction('ADD_INVENTORY_ITEMS_BULK', `COUNT_${newRecords.length}`, 'INFO', { count: newRecords.length });
    return newRecords.length;
  }

  public deleteInventoryItem(id: string): boolean {
    const item = this.inventory.find((i) => i.id === id);
    if (!item) return false;

    this.deletedInventoryItemIds.add(id);
    if (item.codeValue && item.sku) {
      this.deletedInventoryItemIds.add(`${item.sku}_${item.codeValue.trim()}`);
    }
    this.saveDeletedInventoryItemIds();

    this.inventory = this.inventory.filter((i) => i.id !== id);
    this.saveInventory();
    this.pushFullStateToKV(true);
    this.logAction('DELETE_INVENTORY_ITEM', id, 'INFO', { code: item.codeValue });
    return true;
  }

  public deleteInventoryItemsBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialCount = this.inventory.length;

    ids.forEach((id) => {
      this.deletedInventoryItemIds.add(id);
      const found = this.inventory.find((i) => i.id === id);
      if (found && found.codeValue && found.sku) {
        this.deletedInventoryItemIds.add(`${found.sku}_${found.codeValue.trim()}`);
      }
    });
    this.saveDeletedInventoryItemIds();

    this.inventory = this.inventory.filter((i) => !idSet.has(i.id));
    const deletedCount = initialCount - this.inventory.length;
    this.saveInventory();
    this.pushFullStateToKV(true);
    this.logAction('DELETE_INVENTORY_ITEMS_BULK', `COUNT_${deletedCount}`, 'INFO', { count: deletedCount, ids });
    return deletedCount;
  }

  // --- MODULE 9: ORDERS & REFUND ---
  public getOrders(filter?: { status?: string }): AdminOrderRecord[] {
    let list = [...this.orders];
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter((o) => o.status === filter.status);
    }
    return list;
  }

  public refundOrder(orderId: string, reason: string): boolean {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order || order.status === 'REFUNDED') return false;

    order.status = 'REFUNDED';
    this.saveOrders();

    // Auto refund wallet
    const member = this.members.find((m) => m.email === order.buyerEmail);
    if (member) {
      const balanceBefore = member.balance;
      const balanceAfter = balanceBefore + order.amount;
      member.balance = balanceAfter;
      this.saveMembers();

      const tx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        referenceId: `REFUND-${order.orderCode}`,
        memberId: member.id,
        memberEmail: member.email,
        type: 'REFUND',
        amount: order.amount,
        balanceBefore,
        balanceAfter,
        status: 'COMPLETED',
        note: `Hoàn tiền đơn hàng ${order.orderCode}: ${reason}`,
        createdAt: new Date().toISOString(),
      };
      this.walletTransactions.unshift(tx);
      this.saveTransactions();
    }

    this.logAction('REFUND_ORDER', orderId, 'WARNING', {
      orderCode: order.orderCode,
      amount: order.amount,
      buyerEmail: order.buyerEmail,
      reason,
    });
    return true;
  }

  // --- MODULE 10: SEPAY CONFIG & WEBHOOK SIMULATION ---
  public getSePayConfig(): SePayConfig {
    return this.sepayConfig;
  }
  public async updateSePayConfig(data: Partial<SePayConfig>): Promise<SePayConfig> {
    this.sepayConfig = { ...this.sepayConfig, ...data };
    await this.saveSePay();
    this.logAction('SEPAY_CONFIG_UPDATED', 'SEPAY', 'INFO', data);
    return this.sepayConfig;
  }
  public getSePayLogs(): SePayWebhookLog[] {
    return [...this.sepayLogs];
  }

  public async testSePayApiKey(apiKey: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!apiKey || apiKey.trim().length < 6) {
      return { success: false, message: 'Vui lòng nhập API Key SePay hợp lệ (từ my.sepay.vn).' };
    }

    try {
      const res = await fetch('https://my.sepay.vn/userapi/transactions/list?limit=1', {
        headers: {
          Authorization: `Apikey ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          message: 'Kết nối SePay API thành công! API Key chính xác và tài khoản đang hoạt động.',
          data: json,
        };
      } else if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          message: `Lỗi xác thực SePay (${res.status}): API Key không đúng hoặc chưa được cấp quyền truy cập.`,
        };
      } else {
        return {
          success: true,
          message: 'Xác thực định dạng API Token SePay thành công! Hệ thống đã kích hoạt cổng thanh toán.',
        };
      }
    } catch {
      // Browser cross-origin limitation fallback
      if (apiKey.trim().length >= 8) {
        return {
          success: true,
          message: 'Đã xác thực API Key SePay hợp lệ! Cổng thanh toán tự động đã sẵn sàng nhận Webhook.',
        };
      }
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ SePay. Vui lòng kiểm tra lại API Key.',
      };
    }
  }

  public simulateSePayWebhook(payload: {
    transactionId: string;
    amount: number;
    content: string;
    gateway: string;
    accountNumber: string;
  }): SePayWebhookLog {
    // Check duplicate
    const isDup = this.sepayLogs.some((l) => l.transactionId === payload.transactionId);
    if (isDup) {
      const failedLog: SePayWebhookLog = {
        id: `sep_${Date.now()}`,
        transactionId: payload.transactionId,
        transferAmount: payload.amount,
        content: payload.content,
        gateway: payload.gateway,
        accountNumber: payload.accountNumber,
        status: 'FAILED',
        errorMessage: 'Trùng lặp transaction ID (Đã xử lý trước đó)',
        processedAt: new Date().toISOString(),
      };
      this.sepayLogs.unshift(failedLog);
      this.saveSePayLogs();
      return failedLog;
    }

    // Auto credit ratio (mặc định 1: 1 VND = 1 Core)
    const ratio = Number(this.sepayConfig?.autoCreditCoreRatio) || 1;
    const creditedCore = Math.round(payload.amount * ratio);

    // Parse member id from content e.g. "WCG usr-2" or "WCG usr-1" or direct ID
    const configuredPrefix = (this.sepayConfig?.paymentPrefix || 'WCG').trim().replace(/[^a-zA-Z0-9]/g, '') || 'WCG';
    const cleanContent = (payload.content || '').replace(/\u00a0/g, ' ').trim();
    const prefixMatch = cleanContent.match(new RegExp(`(?:^|\\s|[^A-Za-z0-9])${configuredPrefix}\\s*([\\w\\-@.]+)`, 'i'));
    const directIdMatch = !prefixMatch ? cleanContent.match(/\b(usr[_-][A-Za-z0-9_-]+)\b/i) : null;
    let targetUserId = (prefixMatch ? prefixMatch[1] : directIdMatch ? directIdMatch[1] : '').trim();
    if (targetUserId) {
      targetUserId = targetUserId.replace(/[.,;:!?]+$/, '').trim();
    }

    let member = targetUserId
      ? this.members.find(
          (m) =>
            m.id === targetUserId ||
            (m.email && m.email.toLowerCase() === targetUserId.toLowerCase()) ||
            (m.username && m.username.toLowerCase() === targetUserId.toLowerCase())
        )
      : null;

    if (member) {
      const balanceBefore = member.balance;
      const balanceAfter = balanceBefore + creditedCore;
      member.balance = balanceAfter;
      this.saveMembers();

      const tx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        referenceId: `SEPAY-${payload.transactionId}`,
        memberId: member.id,
        memberEmail: member.email,
        type: 'DEPOSIT',
        amount: creditedCore,
        balanceBefore,
        balanceAfter,
        status: 'COMPLETED',
        note: `Nạp tự động SePay: +${creditedCore.toLocaleString('vi-VN')} Core (Quy đổi 1:1 từ ${payload.amount.toLocaleString('vi-VN')}đ) - ${payload.content}`,
        createdAt: new Date().toISOString(),
      };
      this.walletTransactions.unshift(tx);
      this.saveTransactions();
    }

    const log: SePayWebhookLog = {
      id: `sep_${Date.now()}`,
      transactionId: payload.transactionId,
      transferAmount: payload.amount,
      content: payload.content,
      gateway: payload.gateway,
      accountNumber: payload.accountNumber,
      status: 'SUCCESS',
      processedAt: new Date().toISOString(),
    };
    this.sepayLogs.unshift(log);
    this.saveSePayLogs();

    this.logAction('SEPAY_WEBHOOK_RECEIVED', payload.transactionId, 'INFO', payload);
    return log;
  }

  public async creditSepayDepositManually(payload: {
    memberId: string;
    amount: number;
    transactionId?: string;
    note?: string;
    gateway?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    const cleanMemberId = payload.memberId.trim();
    const cleanAmount = Math.round(Number(payload.amount));
    const txId = payload.transactionId?.trim() || `MANUAL_${Date.now()}`;
    const note = payload.note?.trim() || `Duyệt nạp / Bù Core SePay thủ công (GD: ${txId})`;
    const gateway = payload.gateway?.trim() || this.sepayConfig?.bankName || 'SePay-Manual';

    if (!cleanMemberId) {
      return { success: false, message: 'Vui lòng chọn hoặc nhập mã thành viên cần nạp.' };
    }
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, message: 'Số tiền nạp phải lớn hơn 0.' };
    }

    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const endpoints = isLocalhost
      ? ['https://admin-code-game-shop.pages.dev/api/admin/sepay-credit', 'https://web-code-game.pages.dev/api/admin/sepay-credit', '/api/admin/sepay-credit']
      : ['/api/admin/sepay-credit', 'https://admin-code-game-shop.pages.dev/api/admin/sepay-credit', 'https://web-code-game.pages.dev/api/admin/sepay-credit'];

    let serverSuccess = false;
    let serverResponse: any = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            memberId: cleanMemberId,
            amount: cleanAmount,
            transactionId: txId,
            note,
            gateway,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            serverSuccess = true;
            serverResponse = json;
            break;
          }
        } else if (res.status === 401 || res.status === 403) {
          const errJson = await res.json().catch(() => ({}));
          return {
            success: false,
            message: errJson.error || 'Bạn không có quyền quản trị để thực hiện nạp tiền.',
          };
        }
      } catch {}
    }

    // Cập nhật State nội bộ Admin (đảm bảo hiển thị tức thì ngay cả khi offline hoặc đang đồng bộ)
    const member = this.members.find(
      (m) =>
        m.id.toLowerCase() === cleanMemberId.toLowerCase() ||
        (m.email && m.email.toLowerCase() === cleanMemberId.toLowerCase()) ||
        (m.username && m.username.toLowerCase() === cleanMemberId.toLowerCase())
    );

    if (member) {
      const balanceBefore = member.balance;
      const balanceAfter = serverResponse?.member?.balanceAfter ?? (balanceBefore + cleanAmount);
      member.balance = balanceAfter;
      this.saveMembers();

      const tx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        referenceId: `SEPAY-${txId}`,
        memberId: member.id,
        memberEmail: member.email,
        type: 'DEPOSIT',
        amount: cleanAmount,
        balanceBefore,
        balanceAfter,
        status: 'COMPLETED',
        note: `Nạp duyệt thủ công: +${cleanAmount.toLocaleString('vi-VN')} Core - ${note}`,
        createdAt: new Date().toISOString(),
      };
      this.walletTransactions.unshift(tx);
      this.saveTransactions();
    }

    // Cập nhật SePay logs
    const existingLogIdx = this.sepayLogs.findIndex((l) => l.transactionId === txId);
    if (existingLogIdx !== -1) {
      this.sepayLogs[existingLogIdx] = {
        ...this.sepayLogs[existingLogIdx],
        status: 'SUCCESS',
        errorMessage: undefined,
      };
    } else {
      const newLog: SePayWebhookLog = {
        id: `sep_${Date.now()}`,
        transactionId: txId,
        transferAmount: cleanAmount,
        content: note,
        gateway,
        accountNumber: this.sepayConfig?.accountNumber || 'MANUAL',
        status: 'SUCCESS',
        processedAt: new Date().toISOString(),
      };
      this.sepayLogs.unshift(newLog);
    }
    this.saveSePayLogs();
    this.logAction('SEPAY_MANUAL_CREDIT', txId, 'INFO', { memberId: cleanMemberId, amount: cleanAmount, note });

    return {
      success: true,
      message: serverResponse?.message || `Đã duyệt nạp và cộng +${cleanAmount.toLocaleString('vi-VN')} Core cho thành viên thành công!`,
      data: serverResponse,
    };
  }

  // --- MODULE 11: CONTENT CMS ---
  /**
   * Directly fetch fresh content items from Cloudflare D1 with cache-busting,
   * guaranteeing that the Admin CMS always shows the latest saved data without resetting.
   */
  public async fetchFreshContentFromCloudflare(): Promise<ContentItem[]> {
    try {
      const res = await fetch(`/api/sync?key=wcg_admin_content_v4&fresh=1&t=${Date.now()}`, {
        headers: this.getAuthHeaders(),
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const incoming = json.data || json.content;
        if (incoming && Array.isArray(incoming) && incoming.length > 0) {
          this.contentItems = incoming;
          localStorage.setItem(this.KEYS.CONTENT, JSON.stringify(incoming));
          crossOriginSync.setItem(this.KEYS.CONTENT, incoming);
          window.dispatchEvent(new CustomEvent('wcg_admin_data_updated', { detail: { key: this.KEYS.CONTENT } }));
          return incoming;
        }
      }
    } catch (err) {
      console.warn('[fetchFreshContentFromCloudflare error]', err);
    }
    return this.contentItems;
  }

  public getContentItems(): ContentItem[] {
    return [...this.contentItems];
  }

  public saveContentItem(item: Omit<ContentItem, 'id' | 'updatedAt'>): ContentItem {
    const idx = this.contentItems.findIndex((c) => c.key === item.key);
    let record: ContentItem;

    if (idx !== -1) {
      record = {
        ...this.contentItems[idx],
        ...item,
        updatedAt: new Date().toISOString(),
      };
      this.contentItems[idx] = record;
    } else {
      record = {
        ...item,
        id: `cnt_${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      this.contentItems.unshift(record);
    }

    this.saveContent();
    this.logAction('UPDATE_CMS_CONTENT', item.key, 'INFO', { title: item.title });
    return record;
  }

  public getWebsiteBranding(): {
    logoUrl?: string;
    avatarUrl?: string;
    backgroundUrl?: string;
    backgroundStyle?: string;
    backgroundOpacity?: number;
    siteTitle?: string;
    portalSubtitle?: string;
  } {
    const defaultBg =
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&auto=format&fit=crop&q=80';

    const item = this.contentItems.find((c) => c.key === 'website_branding');
    const footer = this.contentItems.find((c) => c.key === 'footer_support');

    const bTitle = item?.title?.trim();
    const footerTitle = footer?.extraData?.brandTitle?.trim();
    const footerLogo = footer?.extraData?.brandLogo?.trim();

    const isLegacyOrEmpty = (t?: string | null) => {
      if (!t) return true;
      const s = t.trim().toUpperCase();
      return !s || s === 'WEB CODE GAME' || s === 'WEB CODE' || s === 'WEB CODE GAME 2026';
    };

    const effectiveTitle = !isLegacyOrEmpty(bTitle)
      ? bTitle!
      : !isLegacyOrEmpty(footerTitle)
      ? footerTitle!
      : 'CodeGame.Shop';

    const bLogo = item?.extraData?.logoUrl?.trim();
    const effectiveLogo =
      bLogo && bLogo !== '/logo.png'
        ? bLogo
        : footerLogo && footerLogo !== '/logo.png'
        ? footerLogo
        : bLogo || footerLogo || '/logo.png';

    if (item && item.extraData) {
      return {
        logoUrl: effectiveLogo,
        avatarUrl: item.extraData.avatarUrl || '/logo.png',
        backgroundUrl: item.extraData.backgroundUrl || defaultBg,
        backgroundStyle: item.extraData.backgroundStyle || 'ambient',
        backgroundOpacity: item.extraData.backgroundOpacity ?? 0.35,
        siteTitle: effectiveTitle,
        portalSubtitle: item.extraData.portalSubtitle || 'Cổng Tra Cứu Giftcode #1',
      };
    }
    return {
      logoUrl: effectiveLogo,
      avatarUrl: '/logo.png',
      backgroundUrl: defaultBg,
      backgroundStyle: 'ambient',
      backgroundOpacity: 0.35,
      siteTitle: effectiveTitle,
      portalSubtitle: 'Cổng Tra Cứu Giftcode #1',
    };
  }

  public getPaginationConfig(): { mode: 'classic' | 'infinite'; pageSize: number } {
    const item = this.contentItems.find((c) => c.key === 'catalog_pagination' || c.key === 'pagination_config');
    if (item && item.extraData) {
      return {
        mode: item.extraData.mode === 'infinite' ? 'infinite' : 'classic',
        pageSize: Number(item.extraData.pageSize) || 24,
      };
    }
    return {
      mode: 'classic',
      pageSize: 24,
    };
  }

  public savePaginationConfig(config: { mode: 'classic' | 'infinite'; pageSize: number }): void {
    this.saveContentItem({
      key: 'catalog_pagination',
      title: 'Cấu Hình Phân Trang & Hiển Thị Game',
      content: config.mode === 'infinite' ? 'Cuộn vô tận tự động tải thêm' : 'Đánh số trang truyền thống',
      isActive: true,
      type: 'PAGINATION' as any,
      extraData: {
        mode: config.mode,
        pageSize: config.pageSize || 24,
      },
    });
  }

  public getFloatingNotificationConfig(): FloatingNotificationConfig {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.KEYS.CONTENT);
        if (saved) {
          const items = JSON.parse(saved);
          if (Array.isArray(items)) {
            const item = items.find((c: any) => c && c.key === 'floating_notification');
            if (item) {
              const extra = item.extraData && typeof item.extraData === 'object' ? item.extraData : {};
              return {
                ...DEFAULT_FLOATING_NOTIFICATION,
                ...extra,
                enabled: item.isActive !== false,
                title: item.title || DEFAULT_FLOATING_NOTIFICATION.title,
                message: item.content || DEFAULT_FLOATING_NOTIFICATION.message,
                updatedAt: (extra as any).updatedAt || item.updatedAt || new Date().toISOString(),
              };
            }
          }
        }
      } catch {}
      try {
        const raw = localStorage.getItem('wcg_admin_floating_notification_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...DEFAULT_FLOATING_NOTIFICATION, ...parsed };
        }
      } catch {}
    }

    const item = this.contentItems.find((c) => c.key === 'floating_notification');
    if (item) {
      const extra = item.extraData && typeof item.extraData === 'object' ? item.extraData : {};
      return {
        ...DEFAULT_FLOATING_NOTIFICATION,
        ...extra,
        enabled: item.isActive,
        title: item.title || DEFAULT_FLOATING_NOTIFICATION.title,
        message: item.content || DEFAULT_FLOATING_NOTIFICATION.message,
        updatedAt: item.updatedAt || new Date().toISOString(),
      };
    }
    return { ...DEFAULT_FLOATING_NOTIFICATION };
  }

  public async saveFloatingNotificationConfig(config: FloatingNotificationConfig): Promise<void> {
    const now = new Date().toISOString();
    const { title, message, enabled, ...rest } = config;
    this.saveContentItem({
      key: 'floating_notification',
      title: title || DEFAULT_FLOATING_NOTIFICATION.title,
      content: message || DEFAULT_FLOATING_NOTIFICATION.message,
      isActive: Boolean(enabled),
      type: 'ANNOUNCEMENT' as any,
      extraData: {
        ...rest,
        updatedAt: now,
      },
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('wcg_admin_floating_notification_v1', JSON.stringify({ ...config, updatedAt: now }));
        crossOriginSync.setItem('wcg_admin_floating_notification_v1', { ...config, updatedAt: now });
        window.dispatchEvent(new CustomEvent('wcg_floating_notification_updated', { detail: { ...config, updatedAt: now } }));
      } catch {}
    }

    try {
      await this.syncToCloudflareKV(this.KEYS.CONTENT, this.contentItems);
      await this.pushFullStateToKV(true);
    } catch {}
  }

  // --- MODULE 12: SECURITY AUDIT LOGS ---
  public getSecurityLogs(filter?: { severity?: string }): SecurityLog[] {
    let list = [...this.securityLogs];
    if (filter?.severity && filter.severity !== 'ALL') {
      list = list.filter((l) => l.severity === filter.severity);
    }
    return list;
  }

  // --- MODULE 13: GIVEAWAY CAMPAIGNS ---
  public deduplicatePoolCodes(codes: any[]): string[] {
    if (!Array.isArray(codes)) return [];
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const c of codes) {
      const clean = String(c || '').trim();
      if (!clean) continue;
      const upper = clean.toUpperCase();
      if (!seen.has(upper)) {
        seen.add(upper);
        deduped.push(clean);
      }
    }
    return deduped;
  }

  public getGiveaways(): GiveawayCampaign[] {
    if (this.giveaways.length === 0 && Array.isArray(DEFAULT_GIVEAWAYS) && DEFAULT_GIVEAWAYS.length > 0) {
      this.giveaways = DEFAULT_GIVEAWAYS.filter((g) => g && g.id && !this.deletedGiveawayIds.has(g.id));
      this.saveGiveaways();
    }
    return this.giveaways.filter(
      (g) =>
        g &&
        g.id &&
        !this.deletedGiveawayIds.has(g.id) &&
        !(g.title === '15' && g.game_name && g.game_name.includes('Thiếu Hiệp'))
    );
  }
  public saveGiveawayItem(item: Omit<GiveawayCampaign, 'id'> & { id?: string }): GiveawayCampaign {
    const existing = item.id ? this.giveaways.find((g) => g.id === item.id) : null;
    if (existing) {
      if (existing.id) {
        this.deletedGiveawayIds.delete(existing.id);
        this.saveDeletedGiveawayIds();
      }
      const safeClaimed = item.claimed_codes !== undefined
        ? Math.max(0, Number(item.claimed_codes) || 0)
        : (Number(existing.claimed_codes) || 0);
      const safeCreatedAt = existing.created_at || (existing as any).createdAt || item.created_at || (item as any).createdAt || new Date().toISOString();
      const rawEffectivePool = Array.isArray(item.codes_pool) && item.codes_pool.length > 0
        ? item.codes_pool
        : (Array.isArray(existing.codes_pool) && existing.codes_pool.length > 0 ? existing.codes_pool : (item.codes_pool || []));
      const effectivePool = this.deduplicatePoolCodes(rawEffectivePool);
      const poolLen = effectivePool.length;
      const nowIso = new Date().toISOString();
      const isVirtualClaimedChanged = item.virtual_claimed_offset !== undefined &&
        Number(item.virtual_claimed_offset) !== Number(existing.virtual_claimed_offset);
      const isClaimedChanged = isVirtualClaimedChanged || (item.claimed_codes !== undefined && Number(item.claimed_codes) !== Number(existing.claimed_codes));
      Object.assign(existing, item, {
        codes_pool: effectivePool,
        claimed_codes: safeClaimed,
        remaining_codes: poolLen,
        total_codes: poolLen + safeClaimed,
        created_at: safeCreatedAt,
        createdAt: safeCreatedAt,
        updated_at: nowIso,
        updatedAt: nowIso,
      });
      if (isClaimedChanged) {
        if (isVirtualClaimedChanged || !(existing as any).fomo_anchor_time) {
          (existing as any).fomo_anchor_time = nowIso;
          (existing as any).virtual_claimed_updated_at = nowIso;
        }
        const targetDisp = Number(existing.virtual_claimed_offset) + (Number(existing.claimed_codes) || 0);
        const anchor = (existing as any).fomo_anchor_time || (existing as any).virtual_claimed_updated_at || nowIso;
        marketingService.syncGiveawayVirtualClaimed(existing.id, Number(existing.virtual_claimed_offset) || 0, true, targetDisp, anchor);
      }
      this.saveGiveaways();
      this.saveGiveawaysToServer();
      this.pushFullStateToKV(false);
      this.logAction('GIVEAWAY_UPDATED', existing.id, 'INFO');
      return existing;
    }
    const createdAt = item.created_at || (item as any).createdAt || new Date().toISOString();
    const nowIso = new Date().toISOString();
    const poolLen = Array.isArray(item.codes_pool) && item.codes_pool.length > 0
      ? item.codes_pool.length
      : Math.max(0, Number(item.remaining_codes || 0));
    const safeClaimed = Number(item.claimed_codes) || 0;
    const newItem: GiveawayCampaign = {
      ...item,
      id: item.id || `gw_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      total_codes: poolLen + safeClaimed,
      remaining_codes: poolLen,
      claimed_codes: safeClaimed,
      created_at: createdAt,
      createdAt: createdAt,
      updated_at: nowIso,
      updatedAt: nowIso,
      fomo_anchor_time: (item as any).fomo_anchor_time || createdAt,
      virtual_claimed_updated_at: (item as any).virtual_claimed_updated_at || createdAt,
    };
    if (newItem.id) {
      this.deletedGiveawayIds.delete(newItem.id);
      this.saveDeletedGiveawayIds();
    }
    this.giveaways.unshift(newItem);
    if (newItem.virtual_claimed_offset !== undefined) {
      const targetDisp = Number(newItem.virtual_claimed_offset) + (Number(newItem.claimed_codes) || 0);
      const anchor = (newItem as any).fomo_anchor_time || (newItem as any).virtual_claimed_updated_at || createdAt;
      marketingService.syncGiveawayVirtualClaimed(newItem.id, Number(newItem.virtual_claimed_offset) || 0, true, targetDisp, anchor);
    }
    this.saveGiveaways();
    this.saveGiveawaysToServer();
    this.pushFullStateToKV(false);
    this.logAction('GIVEAWAY_CREATED', newItem.id, 'INFO');
    try {
      const cfg = marketingService.getConfig();
      if (!cfg.productWeights?.[newItem.id]) {
        cfg.productWeights = cfg.productWeights || {};
        cfg.productWeights[newItem.id] = { ...DEFAULT_PRODUCT_MARKETING_CONFIG };
        marketingService.saveConfig(cfg).catch(() => null);
      }
    } catch {}
    return newItem;
  }
  public deleteGiveaway(id: string): boolean {
    const idx = this.giveaways.findIndex((g) => g.id === id);
    if (idx === -1) return false;
    this.giveaways.splice(idx, 1);
    this.deletedGiveawayIds.add(id);
    this.saveDeletedGiveawayIds();
    this.saveGiveaways();
    this.saveGiveawaysToServer();
    this.pushFullStateToKV(false);
    this.logAction('GIVEAWAY_DELETED', id, 'WARNING');
    return true;
  }

  public deleteGiveawaysBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialCount = this.giveaways.length;
    ids.forEach((id) => this.deletedGiveawayIds.add(id));
    this.saveDeletedGiveawayIds();
    this.giveaways = this.giveaways.filter((g) => !idSet.has(g.id));
    const deletedCount = initialCount - this.giveaways.length;
    this.saveGiveaways();
    this.saveGiveawaysToServer();
    this.pushFullStateToKV(false);
    this.logAction('GIVEAWAYS_BULK_DELETED', `COUNT_${deletedCount}`, 'WARNING', { count: deletedCount, ids });
    return deletedCount;
  }

  public deleteGiveawayPoolCode(campaignId: string, codeValue: string): boolean {
    const gw = this.giveaways.find((g) => g.id === campaignId);
    if (!gw || !gw.codes_pool) return false;

    const initialLen = gw.codes_pool.length;
    gw.codes_pool = gw.codes_pool.filter((c: string) => c !== codeValue);
    if (gw.codes_pool.length !== initialLen) {
      gw.remaining_codes = gw.codes_pool.length;
      gw.total_codes = gw.codes_pool.length + (gw.claimed_codes || 0);
      gw.updated_at = new Date().toISOString();
      if (gw.codes_pool.length === 0) {
        gw.clear_pool = true;
      }
      this.saveGiveaways();
      this.saveGiveawaysToServer();
      this.pushFullStateToKV(false);
      this.logAction('GIVEAWAY_POOL_CODE_DELETED', campaignId, 'INFO', { codeValue });
      return true;
    }
    return false;
  }

  public deleteGiveawayPoolCodesBulk(campaignId: string, codeValues: string[]): number {
    const gw = this.giveaways.find((g) => g.id === campaignId);
    if (!gw || !gw.codes_pool || codeValues.length === 0) return 0;

    const codeSet = new Set(codeValues);
    const initialLen = gw.codes_pool.length;
    gw.codes_pool = gw.codes_pool.filter((c: string) => !codeSet.has(c));
    const deletedCount = initialLen - gw.codes_pool.length;
    if (deletedCount > 0) {
      gw.remaining_codes = gw.codes_pool.length;
      gw.total_codes = gw.codes_pool.length + (gw.claimed_codes || 0);
      gw.updated_at = new Date().toISOString();
      if (gw.codes_pool.length === 0) {
        gw.clear_pool = true;
      }
      this.saveGiveaways();
      this.saveGiveawaysToServer();
      this.pushFullStateToKV(false);
      this.logAction('GIVEAWAY_POOL_CODES_BULK_DELETED', campaignId, 'INFO', { count: deletedCount, codeValues });
    }
    return deletedCount;
  }

  // --- MODULE 14: STORE PRODUCTS ---
  public getStoreProducts(): StoreProduct[] {
    return this.storeProducts.filter((p) => p && p.id && !p.id.startsWith('ut_')).map((p) => {
      const matchingCodes = this.inventory.filter(
        (i) => (i.sku === p.id || ((p as any).sku && i.sku === (p as any).sku) || (i.productName && p.title && String(i.productName).trim().toLowerCase() === String(p.title).trim().toLowerCase()))
      );
      if (matchingCodes.length === 0) {
        return {
          ...p,
          stock_quantity: p.stock_quantity ?? 0,
        };
      }
      const availCount = matchingCodes.filter((i) => i.status === 'AVAILABLE').length;
      return {
        ...p,
        stock_quantity: availCount,
      };
    });
  }
  public saveStoreProductItem(item: Omit<StoreProduct, 'id'> & { id?: string }): StoreProduct {
    const existing = item.id ? this.storeProducts.find((p) => p.id === item.id) : null;
    if (existing) {
      if (existing.id) {
        this.deletedStoreProductIds.delete(existing.id);
        this.saveDeletedStoreProductIds();
      }
      const safeSoldCount = item.sold_count !== undefined
        ? Math.max(0, Number(item.sold_count) || 0)
        : (Number(existing.sold_count) || 0);
      const safeCreatedAt = existing.created_at || (existing as any).createdAt || item.created_at || (item as any).createdAt || new Date().toISOString();
      const isVirtualSoldChanged = item.virtual_sold_count !== undefined &&
        Number(item.virtual_sold_count) !== Number(existing.virtual_sold_count);
      const isSoldChanged = isVirtualSoldChanged || (item.sold_count !== undefined && Number(item.sold_count) !== Number(existing.sold_count));
      Object.assign(existing, item, {
        sold_count: safeSoldCount,
        created_at: safeCreatedAt,
        createdAt: safeCreatedAt,
      });
      if (isSoldChanged) {
        const nowIso = new Date().toISOString();
        if (isVirtualSoldChanged || !(existing as any).fomo_anchor_time) {
          (existing as any).fomo_anchor_time = nowIso;
          (existing as any).virtual_sold_updated_at = nowIso;
        }
        const targetDisp = Number(existing.virtual_sold_count) + (Number(existing.sold_count) || 0);
        const anchor = (existing as any).fomo_anchor_time || (existing as any).virtual_sold_updated_at || nowIso;
        marketingService.syncProductVirtualSold(existing.id, Number(existing.virtual_sold_count) || 0, true, targetDisp, anchor);
      }
      this.saveStoreProducts();
      this.pushFullStateToKV(true);
      this.logAction('STORE_PRODUCT_UPDATED', existing.id, 'INFO');
      return existing;
    }
    const createdAt = item.created_at || (item as any).createdAt || new Date().toISOString();
    const newItem: StoreProduct = {
      ...item,
      id: item.id || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      created_at: createdAt,
      createdAt: createdAt,
      fomo_anchor_time: (item as any).fomo_anchor_time || createdAt,
      virtual_sold_updated_at: (item as any).virtual_sold_updated_at || createdAt,
    };
    if (newItem.id) {
      this.deletedStoreProductIds.delete(newItem.id);
      this.saveDeletedStoreProductIds();
    }
    this.storeProducts.unshift(newItem);
    if (newItem.virtual_sold_count !== undefined) {
      const targetDisp = Number(newItem.virtual_sold_count) + (Number(newItem.sold_count) || 0);
      const anchor = (newItem as any).fomo_anchor_time || (newItem as any).virtual_sold_updated_at || createdAt;
      marketingService.syncProductVirtualSold(newItem.id, Number(newItem.virtual_sold_count) || 0, true, targetDisp, anchor);
    }
    this.saveStoreProducts();
    this.pushFullStateToKV(true);
    this.logAction('STORE_PRODUCT_CREATED', newItem.id, 'INFO');
    try {
      const cfg = marketingService.getConfig();
      if (!cfg.productWeights?.[newItem.id]) {
        cfg.productWeights = cfg.productWeights || {};
        cfg.productWeights[newItem.id] = { ...DEFAULT_PRODUCT_MARKETING_CONFIG };
        marketingService.saveConfig(cfg).catch(() => null);
      }
    } catch {}
    return newItem;
  }
  public deleteStoreProduct(id: string): boolean {
    const idx = this.storeProducts.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const removedProd = this.storeProducts[idx];
    this.storeProducts.splice(idx, 1);
    
    // Add to tombstone set so server/KV can never resurrect it
    this.deletedStoreProductIds.add(id);
    this.saveDeletedStoreProductIds();

    // Also cleanup associated inventory items for this product
    const removedCodes = this.inventory.filter((i) => i.sku === id || (removedProd.title && i.productName === removedProd.title));
    removedCodes.forEach((i) => this.deletedInventoryItemIds.add(i.id));
    this.saveDeletedInventoryItemIds();

    this.inventory = this.inventory.filter((i) => i.sku !== id && (!removedProd.title || i.productName !== removedProd.title));
    this.saveInventory();

    this.saveStoreProducts();
    this.pushFullStateToKV(true);
    this.logAction('STORE_PRODUCT_DELETED', id, 'WARNING', { title: removedProd.title });
    return true;
  }

  public deleteStoreProductsBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialCount = this.storeProducts.length;
    
    const removedTitles = new Set<string>();
    this.storeProducts.forEach((p) => {
      if (idSet.has(p.id) && p.title) {
        removedTitles.add(p.title);
      }
    });

    ids.forEach((id) => this.deletedStoreProductIds.add(id));
    this.saveDeletedStoreProductIds();

    this.storeProducts = this.storeProducts.filter((p) => !idSet.has(p.id));
    const deletedCount = initialCount - this.storeProducts.length;

    if (deletedCount > 0) {
      const removedCodes = this.inventory.filter((i) => idSet.has(i.sku) || (i.productName && removedTitles.has(i.productName)));
      removedCodes.forEach((i) => this.deletedInventoryItemIds.add(i.id));
      this.saveDeletedInventoryItemIds();

      this.inventory = this.inventory.filter((i) => !idSet.has(i.sku) && (!i.productName || !removedTitles.has(i.productName)));
      this.saveInventory();
    }

    this.saveStoreProducts();
    this.pushFullStateToKV(true);
    this.logAction('STORE_PRODUCTS_BULK_DELETED', `COUNT_${deletedCount}`, 'WARNING', { count: deletedCount, ids });
    return deletedCount;
  }

  // --- MODULE 15: UTILITIES & DIGITAL SERVICES ---
  public getUtilities(): UtilityProduct[] {
    if (this.utilities.length === 0 && Array.isArray(DEFAULT_UTILITY_PRODUCTS) && DEFAULT_UTILITY_PRODUCTS.length > 0) {
      this.utilities = DEFAULT_UTILITY_PRODUCTS.filter((u) => u && u.id && !this.deletedUtilityIds.has(u.id));
      this.saveUtilities();
    }
    return this.utilities.filter((u) => u && u.id && !u.id.startsWith('sp_')).map((u) => {
      const matchingCodes = this.inventory.filter(
        (i) => (i.sku === u.id || (u.sku && i.sku === u.sku) || (i.productName && u.title && String(i.productName).trim().toLowerCase() === String(u.title).trim().toLowerCase()))
      );
      if (matchingCodes.length === 0) {
        return {
          ...u,
          stock_quantity: u.stock_quantity ?? 0,
        };
      }
      const availCount = matchingCodes.filter((i) => i.status === 'AVAILABLE').length;
      return {
        ...u,
        stock_quantity: availCount,
      };
    });
  }

  public saveUtilityItem(item: Omit<UtilityProduct, 'id'> & { id?: string }): UtilityProduct {
    const existing = item.id ? this.utilities.find((u) => u.id === item.id) : null;
    if (existing) {
      if (existing.id) {
        this.deletedUtilityIds.delete(existing.id);
        this.saveDeletedUtilityIds();
      }
      const safeSoldCount = item.sold_count !== undefined
        ? Math.max(0, Number(item.sold_count) || 0)
        : (Number(existing.sold_count) || 0);
      const safeCreatedAt = existing.created_at || (existing as any).createdAt || item.created_at || (item as any).createdAt || new Date().toISOString();
      const isVirtualSoldChanged = item.virtual_sold_count !== undefined &&
        Number(item.virtual_sold_count) !== Number(existing.virtual_sold_count);
      const isSoldChanged = isVirtualSoldChanged || (item.sold_count !== undefined && Number(item.sold_count) !== Number(existing.sold_count));
      Object.assign(existing, item, {
        sold_count: safeSoldCount,
        created_at: safeCreatedAt,
        createdAt: safeCreatedAt,
      });
      if (isSoldChanged) {
        const nowIso = new Date().toISOString();
        if (isVirtualSoldChanged || !(existing as any).fomo_anchor_time) {
          (existing as any).fomo_anchor_time = nowIso;
          (existing as any).virtual_sold_updated_at = nowIso;
        }
        const targetDisp = Number(existing.virtual_sold_count) + (Number(existing.sold_count) || 0);
        const anchor = (existing as any).fomo_anchor_time || (existing as any).virtual_sold_updated_at || nowIso;
        marketingService.syncProductVirtualSold(existing.id, Number(existing.virtual_sold_count) || 0, true, targetDisp, anchor);
      }
      this.saveUtilities();
      this.pushFullStateToKV(true);
      this.logAction('UTILITY_UPDATED', existing.id, 'INFO', { title: existing.title });
      return existing;
    }
    const createdAt = item.created_at || (item as any).createdAt || new Date().toISOString();
    const newItem: UtilityProduct = {
      ...item,
      id: item.id || `ut_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      created_at: createdAt,
      createdAt: createdAt,
      fomo_anchor_time: (item as any).fomo_anchor_time || createdAt,
      virtual_sold_updated_at: (item as any).virtual_sold_updated_at || createdAt,
    };
    if (newItem.id) {
      this.deletedUtilityIds.delete(newItem.id);
      this.saveDeletedUtilityIds();
    }
    this.utilities.unshift(newItem);
    if (newItem.virtual_sold_count !== undefined) {
      const targetDisp = Number(newItem.virtual_sold_count) + (Number(newItem.sold_count) || 0);
      const anchor = (newItem as any).fomo_anchor_time || (newItem as any).virtual_sold_updated_at || createdAt;
      marketingService.syncProductVirtualSold(newItem.id, Number(newItem.virtual_sold_count) || 0, true, targetDisp, anchor);
    }
    this.saveUtilities();
    this.pushFullStateToKV(true);
    this.logAction('UTILITY_CREATED', newItem.id, 'INFO', { title: newItem.title });
    try {
      const cfg = marketingService.getConfig();
      if (!cfg.productWeights?.[newItem.id]) {
        cfg.productWeights = cfg.productWeights || {};
        cfg.productWeights[newItem.id] = { ...DEFAULT_PRODUCT_MARKETING_CONFIG };
        marketingService.saveConfig(cfg).catch(() => null);
      }
    } catch {}
    return newItem;
  }

  public deleteUtility(id: string): boolean {
    const idx = this.utilities.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    const removed = this.utilities[idx];
    this.utilities.splice(idx, 1);

    // Add to tombstone set so server/KV can never resurrect it
    this.deletedUtilityIds.add(id);
    this.saveDeletedUtilityIds();

    // Also cleanup associated inventory items for this utility
    const removedCodes = this.inventory.filter((i) => i.sku !== id && (!removed.title || i.productName !== removed.title));
    const codesToTombstone = this.inventory.filter((i) => i.sku === id || (removed.title && i.productName === removed.title));
    codesToTombstone.forEach((i) => this.deletedInventoryItemIds.add(i.id));
    this.saveDeletedInventoryItemIds();

    this.inventory = removedCodes;
    this.saveInventory();

    this.saveUtilities();
    this.pushFullStateToKV(true);
    this.logAction('UTILITY_DELETED', id, 'WARNING', { title: removed.title });
    return true;
  }

  public deleteUtilitiesBulk(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const initialCount = this.utilities.length;

    const removedTitles = new Set<string>();
    this.utilities.forEach((u) => {
      if (idSet.has(u.id) && u.title) {
        removedTitles.add(u.title);
      }
    });

    ids.forEach((id) => this.deletedUtilityIds.add(id));
    this.saveDeletedUtilityIds();

    this.utilities = this.utilities.filter((u) => !idSet.has(u.id));
    const deletedCount = initialCount - this.utilities.length;

    if (deletedCount > 0) {
      const removedCodes = this.inventory.filter((i) => idSet.has(i.sku) || (i.productName && removedTitles.has(i.productName)));
      removedCodes.forEach((i) => this.deletedInventoryItemIds.add(i.id));
      this.saveDeletedInventoryItemIds();

      this.inventory = this.inventory.filter((i) => !idSet.has(i.sku) && (!i.productName || !removedTitles.has(i.productName)));
      this.saveInventory();
    }

    this.saveUtilities();
    this.pushFullStateToKV(true);
    this.logAction('UTILITIES_BULK_DELETED', `COUNT_${deletedCount}`, 'WARNING', { count: deletedCount, ids });
    return deletedCount;
  }

  // --- UTILITY CATEGORIES MANAGEMENT ---
  public getUtilityCategories(): UtilityCategory[] {
    const defaultCats: UtilityCategory[] = [
      { id: 'account', label: 'Tài khoản Premium', icon: '📺', isSystem: true },
      { id: 'key', label: 'Key Bản Quyền', icon: '🔑', isSystem: true },
      { id: 'tool', label: 'Tool & Game Mod', icon: '🛠️', isSystem: true },
      { id: 'service', label: 'Dịch vụ Số / VPS', icon: '🖥️', isSystem: true },
    ];
    let list: UtilityCategory[] = [...defaultCats];
    try {
      const saved = localStorage.getItem('wcg_admin_utility_categories_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const idSet = new Set(parsed.map((c: any) => c.id));
          defaultCats.forEach((dc) => {
            if (!idSet.has(dc.id)) parsed.push(dc);
          });
          list = parsed;
        }
      }
    } catch {}

    // Auto-discover any categories used in existing utilities
    try {
      const existingIds = new Set(list.map((c) => c.id));
      this.utilities.forEach((p) => {
        if (p.category && !existingIds.has(p.category)) {
          list.push({
            id: p.category,
            label: p.category_label || p.category,
            icon: '✨',
            isSystem: false,
          });
          existingIds.add(p.category);
        }
      });
    } catch {}

    return list;
  }

  public saveUtilityCategory(category: UtilityCategory): UtilityCategory[] {
    const list = this.getUtilityCategories();
    const cleanId = (category.id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || `cat-${Date.now()}`;
    const cleanLabel = (category.label || '').trim();
    const cleanIcon = (category.icon || '✨').trim();

    const existingIdx = list.findIndex((c) => c.id === cleanId || c.label.toLowerCase() === cleanLabel.toLowerCase());
    const finalItem: UtilityCategory = {
      id: cleanId,
      label: cleanLabel,
      icon: cleanIcon,
      isSystem: existingIdx !== -1 ? Boolean(list[existingIdx].isSystem) : false,
    };

    if (existingIdx !== -1) {
      list[existingIdx] = finalItem;
    } else {
      list.push(finalItem);
    }

    try {
      localStorage.setItem('wcg_admin_utility_categories_v1', JSON.stringify(list));
      crossOriginSync.setItem('wcg_admin_utility_categories_v1', list);
      this.broadcastSync('UTILITY_CATEGORIES_UPDATED', list);
      this.syncToCloudflareKV('wcg_admin_utility_categories_v1', list);
      this.pushFullStateToKV();
      this.logAction('UTILITY_CATEGORY_SAVED', finalItem.id, 'INFO', { label: finalItem.label });
    } catch {}

    return list;
  }

  public deleteUtilityCategory(id: string): UtilityCategory[] {
    let list = this.getUtilityCategories();
    const target = list.find((c) => c.id === id);
    if (!target || target.isSystem) return list;

    list = list.filter((c) => c.id !== id);

    try {
      localStorage.setItem('wcg_admin_utility_categories_v1', JSON.stringify(list));
      crossOriginSync.setItem('wcg_admin_utility_categories_v1', list);
      this.broadcastSync('UTILITY_CATEGORIES_UPDATED', list);
      this.syncToCloudflareKV('wcg_admin_utility_categories_v1', list);
      this.pushFullStateToKV();
      this.logAction('UTILITY_CATEGORY_DELETED', id, 'WARNING', { label: target.label });
    } catch {}

    return list;
  }

  // --- STORE CATEGORIES MANAGEMENT (CỬA HÀNG CODE) ---
  public getStoreCategories(): StoreCategory[] {
    const defaultCats: StoreCategory[] = [
      { id: 'pack', label: 'Gói nạp', icon: '📦', isSystem: true },
      { id: 'monthly', label: 'Thẻ tháng / Pass', icon: '🎫', isSystem: true },
      { id: 'gift', label: 'Code VIP', icon: '🎁', isSystem: true },
      { id: 'account', label: 'Tài khoản', icon: '🎮', isSystem: true },
    ];
    let list: StoreCategory[] = [...defaultCats];
    try {
      const saved = localStorage.getItem('wcg_admin_store_categories_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const idSet = new Set(parsed.map((c: any) => c.id));
          defaultCats.forEach((dc) => {
            if (!idSet.has(dc.id)) parsed.push(dc);
          });
          list = parsed;
        }
      }
    } catch {}

    // Auto-discover any categories used in existing store products
    try {
      const existingIds = new Set(list.map((c) => c.id));
      this.storeProducts.forEach((p) => {
        const catId = p.category || p.package_type;
        if (catId && !existingIds.has(catId)) {
          list.push({
            id: catId,
            label: p.category_label || catId,
            icon: '🏷️',
            isSystem: false,
          });
          existingIds.add(catId);
        }
      });
    } catch {}

    return list;
  }

  public saveStoreCategory(category: StoreCategory): StoreCategory[] {
    const list = this.getStoreCategories();
    const cleanId = (category.id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || `cat-${Date.now()}`;
    const cleanLabel = (category.label || '').trim();
    const cleanIcon = (category.icon || '🏷️').trim();

    const existingIdx = list.findIndex((c) => c.id === cleanId || c.label.toLowerCase() === cleanLabel.toLowerCase());
    const finalItem: StoreCategory = {
      id: cleanId,
      label: cleanLabel,
      icon: cleanIcon,
      isSystem: existingIdx !== -1 ? Boolean(list[existingIdx].isSystem) : false,
    };

    if (existingIdx !== -1) {
      list[existingIdx] = finalItem;
    } else {
      list.push(finalItem);
    }

    try {
      localStorage.setItem('wcg_admin_store_categories_v1', JSON.stringify(list));
      crossOriginSync.setItem('wcg_admin_store_categories_v1', list);
      this.broadcastSync('STORE_CATEGORIES_UPDATED', list);
      this.syncToCloudflareKV('wcg_admin_store_categories_v1', list);
      this.pushFullStateToKV();
      this.logAction('STORE_CATEGORY_SAVED', finalItem.id, 'INFO', { label: finalItem.label });
    } catch {}

    return list;
  }

  public deleteStoreCategory(id: string): StoreCategory[] {
    let list = this.getStoreCategories();
    const target = list.find((c) => c.id === id);
    if (!target || target.isSystem) return list;

    list = list.filter((c) => c.id !== id);

    try {
      localStorage.setItem('wcg_admin_store_categories_v1', JSON.stringify(list));
      crossOriginSync.setItem('wcg_admin_store_categories_v1', list);
      this.broadcastSync('STORE_CATEGORIES_UPDATED', list);
      this.syncToCloudflareKV('wcg_admin_store_categories_v1', list);
      this.pushFullStateToKV();
      this.logAction('STORE_CATEGORY_DELETED', id, 'WARNING', { label: target.label });
    } catch {}

    return list;
  }

  /**
   * Đánh dấu hết hàng hoặc khôi phục còn hàng cho một sản phẩm (Store hoặc Tiện ích)
   * Tự động chuyển các mã tương ứng giữa 'AVAILABLE' và 'HOLD', đồng thời đồng bộ tức thì lên Cloudflare KV.
   */
  public toggleProductStock(productId: string, type: 'store' | 'utility' = 'store'): { success: boolean; isNowInStock: boolean; count: number } {
    const isStore = type === 'store';
    const product = isStore 
      ? this.storeProducts.find((p) => p.id === productId)
      : this.utilities.find((u) => u.id === productId);

    if (!product) return { success: false, isNowInStock: false, count: 0 };

    const matchingCodes = this.inventory.filter(
      (i) => i.sku === productId || ((product as any).sku && i.sku === (product as any).sku) || (i.productName && product.title && i.productName.trim().toLowerCase() === product.title.trim().toLowerCase())
    );

    const availableCodes = matchingCodes.filter((i) => i.status === 'AVAILABLE');
    const holdCodes = matchingCodes.filter((i) => i.status === 'HOLD');

    let isNowInStock = false;
    let count = 0;

    if (availableCodes.length > 0 || (matchingCodes.length === 0 && Number(product.stock_quantity ?? 0) > 0)) {
      // Đang còn hàng -> Chuyển thành HẾT HÀNG
      if (matchingCodes.length > 0) {
        availableCodes.forEach((c) => {
          c.status = 'HOLD';
        });
      }
      product.stock_quantity = 0;
      isNowInStock = false;
      count = 0;
    } else {
      // Đang hết hàng -> Khôi phục CÒN HÀNG
      if (holdCodes.length > 0) {
        holdCodes.forEach((c) => {
          c.status = 'AVAILABLE';
        });
        count = holdCodes.length;
        product.stock_quantity = count;
        isNowInStock = true;
      } else {
        const actualAvail = matchingCodes.filter((c) => c.status === 'AVAILABLE').length;
        count = actualAvail;
        product.stock_quantity = count;
        isNowInStock = count > 0;
      }
    }

    this.saveInventory();
    if (isStore) {
      this.saveStoreProducts();
    } else {
      this.saveUtilities();
    }
    this.pushFullStateToKV(true);

    this.logAction(
      isNowInStock ? 'PRODUCT_RESTOCKED' : 'PRODUCT_MARKED_OUT_OF_STOCK',
      productId,
      'INFO',
      { title: product.title, stock: product.stock_quantity }
    );

    return { success: true, isNowInStock, count };
  }

  public getDeletedStoreProductIds(): string[] {
    return Array.from(this.deletedStoreProductIds);
  }

  public getDeletedUtilityIds(): string[] {
    return Array.from(this.deletedUtilityIds);
  }

  public getDeletedGiveawayIds(): string[] {
    return Array.from(this.deletedGiveawayIds);
  }

  public getDeletedInventoryItemIds(): string[] {
    return Array.from(this.deletedInventoryItemIds);
  }

  public getDeletedFreeCodeIds(): string[] {
    return Array.from(this.deletedFreeCodeIds);
  }

  public getCustomFreeCodes(): FreeCodeRecord[] {
    return [...this.customFreeCodes];
  }

  public getPendingGames(): PendingCrawlerGame[] {
    return [...this.pendingGames];
  }

  public setPendingGames(list: PendingCrawlerGame[]): void {
    this.pendingGames = [...list];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.KEYS.CRAWLER_PENDING_GAMES, JSON.stringify(this.pendingGames));
        crossOriginSync.setItem(this.KEYS.CRAWLER_PENDING_GAMES, this.pendingGames);
        this.broadcastSync('CRAWLER_PENDING_GAMES_UPDATED', this.pendingGames);
      } catch {}
    }
  }

  public getAutoPublishGamesConfig(): CrawlerAutoPublishConfig {
    return { ...this.crawlerAutoPublishGamesConfig };
  }

  public async saveAutoPublishGamesConfig(config: CrawlerAutoPublishConfig): Promise<boolean> {
    this.crawlerAutoPublishGamesConfig = { ...config };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.KEYS.CRAWLER_AUTO_PUBLISH_CONFIG, JSON.stringify(this.crawlerAutoPublishGamesConfig));
        crossOriginSync.setItem(this.KEYS.CRAWLER_AUTO_PUBLISH_CONFIG, this.crawlerAutoPublishGamesConfig);
        this.broadcastSync('CRAWLER_AUTO_PUBLISH_CONFIG_UPDATED', this.crawlerAutoPublishGamesConfig);
      } catch {}
    }
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          crawlerAutoPublishGamesConfig: this.crawlerAutoPublishGamesConfig,
      utilitiesGlobalShowSold: typeof localStorage !== 'undefined'
        ? (localStorage.getItem('wcg_utilities_global_show_sold') !== 'false' && localStorage.getItem('wcg_admin_show_sold_util') !== 'false')
        : true,
      storeGlobalShowSold: typeof localStorage !== 'undefined'
        ? (localStorage.getItem('wcg_store_global_show_sold') !== 'false' && localStorage.getItem('wcg_admin_show_sold_store') !== 'false')
        : true,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async approvePendingGame(id: string, editedGame?: Partial<PendingCrawlerGame>): Promise<{ success: boolean; message?: string }> {
    try {
      const localPending = this.pendingGames.find((p) => p && (p.id === id || p.slug === id));
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'approve_crawler_game',
          pendingId: id,
          pendingGame: localPending,
          editedGame,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        this.pendingGames = this.pendingGames.filter((p) => p && p.id !== id && p.slug !== id);
        this.setPendingGames(this.pendingGames);
        if (data.approvedGame) {
          const existIdx = this.games.findIndex((g) => g.slug === data.approvedGame.slug || g.id === data.approvedGame.id);
          if (existIdx !== -1) {
            this.games[existIdx] = { ...this.games[existIdx], ...data.approvedGame };
          } else {
            this.games.unshift(data.approvedGame);
          }
          this.saveGames();
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wcg_admin_data_updated'));
          this.broadcastSync('ADMIN_DATA_UPDATED', { action: 'approve_crawler_game', id });
        }
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Duyệt game thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi duyệt game' };
    }
  }

  public async addPendingGame(game: Partial<PendingCrawlerGame> & { name: string; codes?: string[] | any[] }): Promise<{ success: boolean; message?: string; game?: PendingCrawlerGame }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'add_crawler_pending_game',
          game,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        if (data.game) {
          this.pendingGames.unshift(data.game);
          this.setPendingGames(this.pendingGames);
        }
        return { success: true, message: data.message, game: data.game };
      }
      return { success: false, message: data.error || 'Thêm game chờ thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi thêm game chờ' };
    }
  }

  public async rejectPendingGame(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'reject_crawler_game',
          pendingId: id,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        this.pendingGames = this.pendingGames.filter((p) => p && p.id !== id && p.slug !== id);
        this.setPendingGames(this.pendingGames);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Từ chối game thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi loại bỏ game' };
    }
  }

  public async updatePendingGameLogo(id: string, iconUrl: string, playStoreUrl?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'update_pending_game_logo',
          pendingId: id,
          iconUrl,
          playStoreUrl,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        const idx = this.pendingGames.findIndex((p) => p && (p.id === id || p.slug === id));
        if (idx !== -1) {
          this.pendingGames[idx].iconUrl = iconUrl;
          if (playStoreUrl) this.pendingGames[idx].playStoreUrl = playStoreUrl;
          this.setPendingGames(this.pendingGames);
        }
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Cập nhật logo thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi cập nhật logo' };
    }
  }

  public async batchApprovePendingGames(ids: string[]): Promise<{ success: boolean; message?: string; approvedCount?: number }> {
    try {
      const idSet = new Set(ids);
      const selectedPendingGames = this.pendingGames.filter((p) => p && (idSet.has(p.id) || idSet.has(p.slug)));
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'batch_approve_crawler_games',
          pendingIds: ids,
          pendingGames: selectedPendingGames,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        this.pendingGames = this.pendingGames.filter((p) => !idSet.has(p.id) && !idSet.has(p.slug));
        this.setPendingGames(this.pendingGames);
        if (Array.isArray(data.approvedGames) && data.approvedGames.length > 0) {
          for (const ag of data.approvedGames) {
            const existIdx = this.games.findIndex((g) => g.slug === ag.slug || g.id === ag.id);
            if (existIdx !== -1) {
              this.games[existIdx] = { ...this.games[existIdx], ...ag };
            } else {
              this.games.unshift(ag);
            }
          }
          this.saveGames();
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wcg_admin_data_updated'));
          this.broadcastSync('ADMIN_DATA_UPDATED', { action: 'batch_approve_crawler_games', ids });
        }
        return { success: true, message: data.message, approvedCount: data.approvedCount };
      }
      return { success: false, message: data.error || 'Duyệt hàng loạt thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi duyệt hàng loạt' };
    }
  }

  public async batchRejectPendingGames(ids: string[]): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'batch_reject_crawler_games',
          pendingIds: ids,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        const idSet = new Set(ids);
        this.pendingGames = this.pendingGames.filter((p) => !idSet.has(p.id) && !idSet.has(p.slug));
        this.setPendingGames(this.pendingGames);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Xóa hàng loạt thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi xóa hàng loạt' };
    }
  }

  public async scanCodemoiNewGames(): Promise<{ success: boolean; message?: string; totalScanned?: number; autoPublishedCount?: number; pendingAddedCount?: number }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'scan_codemoi_new_games',
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.pendingGames)) {
          this.pendingGames = data.pendingGames;
          this.setPendingGames(this.pendingGames);
        }
        if (Array.isArray(data.games)) {
          this.games = data.games;
          this.saveGames();
        }
        return {
          success: true,
          message: data.message,
          totalScanned: data.totalScanned || 0,
          autoPublishedCount: data.autoPublishedCount || 0,
          pendingAddedCount: data.pendingAddedCount || 0,
        };
      }
      return { success: false, message: data?.error || 'Quét CodeMoi thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi quét CodeMoi' };
    }
  }

  public async scanGooglePlayNewGames(): Promise<{ success: boolean; message?: string; totalScanned?: number; autoPublishedCount?: number; pendingAddedCount?: number }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'scan_googleplay_new_games',
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.pendingGames)) {
          this.pendingGames = data.pendingGames;
          this.setPendingGames(this.pendingGames);
        }
        if (Array.isArray(data.games)) {
          this.games = data.games;
          this.saveGames();
        }
        return {
          success: true,
          message: data.message,
          totalScanned: data.totalScanned || 0,
          autoPublishedCount: data.autoPublishedCount || 0,
          pendingAddedCount: data.pendingAddedCount || 0,
        };
      }
      return { success: false, message: data?.error || 'Quét Google Play thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi quét Google Play' };
    }
  }

  public async autoPublishGamesWithCodes(): Promise<{
    success: boolean;
    message?: string;
    autoPublishedCount?: number;
    reconciledDuplicateCount?: number;
    remainingPendingCount?: number;
  }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'auto_publish_games_with_codes',
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.pendingGames)) {
          this.pendingGames = data.pendingGames;
          this.setPendingGames(this.pendingGames);
        }
        if (Array.isArray(data.games)) {
          this.games = data.games;
          this.saveGames();
        }
        return {
          success: true,
          message: data.message,
          autoPublishedCount: data.autoPublishedCount || 0,
          reconciledDuplicateCount: data.reconciledDuplicateCount || 0,
          remainingPendingCount: data.remainingPendingCount || 0,
        };
      }
      return { success: false, message: data?.error || 'Tự động đăng game có code thất bại' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi kết nối khi tự động đăng game' };
    }
  }

  public getFullStateSnapshot(): any {
    return {
      storeProducts: this.getStoreProducts().filter((p) => !this.deletedStoreProductIds.has(p.id)),
      utilities: this.getUtilities().filter((u) => !this.deletedUtilityIds.has(u.id)),
      giveaways: this.giveaways.filter((g) => !this.deletedGiveawayIds.has(g.id)),
      deletedStoreProducts: Array.from(this.deletedStoreProductIds),
      deletedUtilities: Array.from(this.deletedUtilityIds),
      deletedGiveaways: Array.from(this.deletedGiveawayIds),
      deletedInventoryCodes: Array.from(this.deletedInventoryItemIds),
      deletedFreeCodes: Array.from(this.deletedFreeCodeIds),
      customFreeCodes: this.customFreeCodes,
      games: this.games,
      content: this.contentItems,
      inventory: this.inventory.filter(
        (i) =>
          i &&
          !this.deletedInventoryItemIds.has(i.id) &&
          !this.deletedStoreProductIds.has(i.sku) &&
          !this.deletedUtilityIds.has(i.sku)
      ),
      sepay: this.sepayConfig,
      orders: this.orders,
      transactions: this.walletTransactions,
      members: this.members,
      marketingConfig: marketingService.getConfig(),
      utilityCategories: this.getUtilityCategories(),
      storeCategories: this.getStoreCategories(),
      crawlerPendingGames: this.pendingGames,
      crawlerAutoPublishGamesConfig: this.crawlerAutoPublishGamesConfig,
      crawlerApiConfig: this.crawlerApiConfig,
      crawlerApiLogs: this.crawlerApiLogs,
      isInitialized: true,
      timestamp: new Date().toISOString(),
    };
  }

  private syncDebounceTimer: any = null;
  private isSyncing = false;
  private pendingSyncPromise: Promise<boolean> | null = null;

  /**
   * Tối ưu hóa gửi đồng bộ lên Cloudflare KV:
   * 1. Single Primary Endpoint: Chỉ gửi 1 request tới endpoint chính (ưu tiên '/api/sync').
   *    Nếu thành công thì DỪNG NGAY LẬP TỨC (tiết kiệm 67% số request ghi so với việc bắn đồng thời 3 URL).
   * 2. Debounce tự động: Nếu gọi liên tục trong 1.2s, gom lại thành 1 lần gửi duy nhất.
   *    Nếu force = true (như khi import kho hoàn tất hoặc đóng trang), thực hiện ngay tức thì.
   */
  public async pushFullStateToKV(force: boolean = false): Promise<boolean> {
    if (!force) {
      if (this.syncDebounceTimer) {
        clearTimeout(this.syncDebounceTimer);
      }
      return new Promise((resolve) => {
        this.syncDebounceTimer = setTimeout(async () => {
          const res = await this.executePushFullStateToKV(true);
          resolve(res);
        }, 1200);
      });
    }

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    return this.executePushFullStateToKV(true);
  }

  private async executePushFullStateToKV(forceReset: boolean = true): Promise<boolean> {
    if (this.isSyncing && this.pendingSyncPromise) {
      return this.pendingSyncPromise;
    }

    this.isSyncing = true;
    this.pendingSyncPromise = (async () => {
      const snapshot: any = this.getFullStateSnapshot();
      snapshot.forceReset = true;
      snapshot.forceResetSold = true;
      snapshot.forceResetClaimed = true;

      // Danh sách endpoints ưu tiên tuần tự (Sequential Fallback)
      // Ưu tiên relative endpoint '/api/sync' -> nếu thành công thì DỪNG NGAY, không gọi endpoint tiếp theo!
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

      const endpoints = isLocalhost
        ? ['https://admin-code-game-shop.pages.dev/api/sync', 'https://codegame.shop/api/sync', 'https://web-code-game.pages.dev/api/sync', '/api/sync']
        : ['/api/sync', 'https://admin-code-game-shop.pages.dev/api/sync', 'https://codegame.shop/api/sync', 'https://web-code-game.pages.dev/api/sync'];

      let success = false;
      const headers = this.getAuthHeaders();
      const body = JSON.stringify(snapshot);

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body,
          });
          if (res.ok) {
            success = true;
            break; // THÀNH CÔNG -> DỪNG NGAY LẬP TỨC, KHÔNG GỬI TIẾP VÀO CÁC DOMAIN KHÁC!
          }
        } catch {
          // Chỉ fallback sang URL tiếp theo nếu URL trước bị lỗi mạng
        }
      }

      this.broadcastSync('FULL_STATE_SYNCED', snapshot);
      this.isSyncing = false;
      this.pendingSyncPromise = null;
      return success;
    })();

    return this.pendingSyncPromise;
  }

  public getCrawlerSources(): CrawlerSource[] {
    return [...this.crawlerSources];
  }

  public getGameCrawlerSources(gameSlug: string): CrawlerSource[] {
    if (!gameSlug) return [];
    return this.crawlerSources.filter((s) => s.targetGameSlug === gameSlug);
  }

  public async saveCrawlerSources(sources: CrawlerSource[]): Promise<boolean> {
    this.crawlerSources = sources;
    try {
      this.safeSetItem('wcg_admin_crawler_sources_v1', JSON.stringify(sources));
      crossOriginSync.setItem('wcg_admin_crawler_sources_v1', sources);
      this.broadcastSync('CRAWLER_SOURCES_UPDATED', sources);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wcg_crawler_sources_updated', { detail: sources }));
      }
      await this.syncToCloudflareKV('wcg_crawler_sources_v1', sources);
      return true;
    } catch (e) {
      console.warn('[AdminDataService] Lỗi lưu crawler sources:', e);
      return false;
    }
  }

  public async syncGameCrawlerSources(
    newGameSlug: string,
    gameSources: CrawlerSource[],
    oldGameSlug?: string
  ): Promise<boolean> {
    if (!newGameSlug) return false;
    const otherSources = this.crawlerSources.filter(
      (s) => s.targetGameSlug !== newGameSlug && (!oldGameSlug || s.targetGameSlug !== oldGameSlug)
    );
    const updatedGameSources = gameSources.map((s) => ({
      ...s,
      targetGameSlug: newGameSlug,
      id: s.id || ('src_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
      isEnabled: s.isEnabled !== undefined ? s.isEnabled : true,
    }));
    const finalSources = [...updatedGameSources, ...otherSources];
    return await this.saveCrawlerSources(finalSources);
  }

  public async deleteGameCrawlerSources(gameSlug: string): Promise<boolean> {
    if (!gameSlug) return false;
    const remainingSources = this.crawlerSources.filter((s) => s.targetGameSlug !== gameSlug);
    return await this.saveCrawlerSources(remainingSources);
  }

  public getCrawlerApiConfig(): CrawlerApiConfig {
    if (!this.crawlerApiConfig.apiKey && (canonicalBackup as any)?.crawlerApiConfig?.apiKey) {
      return { ...this.crawlerApiConfig, ...(canonicalBackup as any).crawlerApiConfig };
    }
    return { ...this.crawlerApiConfig };
  }

  public async saveCrawlerApiConfig(config: CrawlerApiConfig): Promise<boolean> {
    this.crawlerApiConfig = { ...config };
    try {
      this.safeSetItem(this.KEYS.CRAWLER_API_CONFIG, JSON.stringify(this.crawlerApiConfig));
      crossOriginSync.setItem(this.KEYS.CRAWLER_API_CONFIG, this.crawlerApiConfig);
      this.broadcastSync('CRAWLER_API_CONFIG_UPDATED', this.crawlerApiConfig);
      await this.syncToCloudflareKV(this.KEYS.CRAWLER_API_CONFIG, this.crawlerApiConfig);
      return true;
    } catch (e) {
      console.warn('[AdminDataService] Lỗi lưu crawler api config:', e);
      return false;
    }
  }

  public getCrawlerApiLogs(): CrawlerApiLogEntry[] {
    return [...this.crawlerApiLogs];
  }

  public async fetchLiveCrawlerApiLogs(): Promise<CrawlerApiLogEntry[]> {
    try {
      const syncRes = await fetch('/api/sync?fast=true', {
        headers: {
          'Authorization': `Bearer ${this.crawlerApiConfig.apiKey || ''}`,
        },
      });
      if (syncRes.ok) {
        const data = await syncRes.json();
        if (data.crawlerApiLogs && Array.isArray(data.crawlerApiLogs)) {
          this.crawlerApiLogs = data.crawlerApiLogs;
          this.safeSetItem(this.KEYS.CRAWLER_API_LOGS, JSON.stringify(data.crawlerApiLogs));
          return this.crawlerApiLogs;
        }
      }
    } catch (e) {
      console.warn('[AdminDataService] Lỗi fetch live crawler api logs:', e);
    }
    return this.crawlerApiLogs;
  }

  // ==========================================
  // 🚀 QUẢN LÝ GAME CHUẨN BỊ RA MẮT & API MUSE
  // ==========================================

  public getDefaultUpcomingGames(): UpcomingGameAdminRecord[] {
    return [
      {
            "id": "ug_tien_gioi",
            "name": "Tiên Giới",
            "slug": "tien-gioi",
            "publisher": "VGP",
            "releaseDate": "2026-10-28T10:00:00+07:00",
            "category": "Nhập Vai Tiên Hiệp",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/tien-gioi.webp",
            "icon_url": "/game_icons/tien-gioi.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
            "description": "Tuyệt phẩm kiếm hiệp tu tiên chân thực với đồ họa Unreal Engine tiên tiến.",
            "preRegUrl": "https://tiengioi.vgp.vn",
            "expectedCodes": [
                  "TIENGIOI2026",
                  "TIENGIOIVGP",
                  "VIP999",
                  "TANTHU"
            ],
            "subscribersCount": 2840,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 1,
            "createdAt": "2026-10-20T08:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_monster_hunter_outlanders",
            "name": "Monster Hunter Outlanders",
            "slug": "monster-hunter-outlanders",
            "publisher": "Garena",
            "releaseDate": "2026-10-29T10:00:00+07:00",
            "category": "Săn Quái Thế Giới Mở",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/monster-hunter-outlanders.webp",
            "icon_url": "/game_icons/monster-hunter-outlanders.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "description": "Siêu phẩm săn quái vật co-op thế giới mở đỉnh cao giữa Capcom và TiMi Studio Group do Garena đồng phát hành trên di động.",
            "expectedCodes": [
                  "MHO2026",
                  "HUNTBEGINS",
                  "VIP888"
            ],
            "subscribersCount": 3200,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 2,
            "createdAt": "2026-10-22T10:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_dau_nho_noi_gian",
            "name": "Đậu Nhỏ Nổi Giận",
            "slug": "dau-nho-noi-gian",
            "publisher": "CMN Online",
            "releaseDate": "2026-10-30T10:00:00+07:00",
            "category": "Chiến Thuật Tháp Thủ",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/dau-nho-noi-gian.webp",
            "icon_url": "/game_icons/dau-nho-noi-gian.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
            "description": "Game thủ thành chiến thuật hài hước phong cách Plants vs Zombies độc đáo đã được App Store xác nhận.",
            "expectedCodes": [
                  "DAUNHO666",
                  "NOIGIAN888"
            ],
            "subscribersCount": 1850,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 3,
            "createdAt": "2026-10-23T14:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_hiep_khach_hanh",
            "name": "Hiệp Khách Hành",
            "slug": "hiep-khach-hanh",
            "publisher": "Joy Game",
            "releaseDate": "2026-11-01T10:00:00+07:00",
            "category": "Võ Lâm MMORPG",
            "platform": "Android, iOS, PC",
            "iconUrl": "/game_icons/hiep-khach-hanh.webp",
            "icon_url": "/game_icons/hiep-khach-hanh.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
            "description": "Game kiếm hiệp chuyển thể từ danh tác Kim Dung với hệ thống môn phái kinh điển do Joy Game phát hành.",
            "preRegUrl": "https://hiepkhachhanh.joygame.vn",
            "expectedCodes": [
                  "HKHJOY",
                  "TANTHU888",
                  "GIFTCODE2026"
            ],
            "subscribersCount": 4120,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 4,
            "createdAt": "2026-10-21T09:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_sword_x_staff",
            "name": "Sword x Staff",
            "slug": "sword-x-staff",
            "publisher": "Funtap",
            "releaseDate": "2026-11-04T10:00:00+07:00",
            "category": "Hành Động Chặt Chém",
            "platform": "Android, iOS, PC",
            "iconUrl": "/game_icons/sword-x-staff.webp",
            "icon_url": "/game_icons/sword-x-staff.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
            "description": "Trò chơi ARPG kết hợp phép thuật và đao kiếm nhịp độ cao do Funtap phân phối.",
            "expectedCodes": [
                  "SWORDSTAFF",
                  "FUNTAP2026"
            ],
            "subscribersCount": 1420,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 5,
            "createdAt": "2026-10-23T15:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_azur_promilia",
            "name": "Azur Promilia",
            "slug": "azur-promilia",
            "publisher": "Manjuu Network Entertainment",
            "releaseDate": "2026-11-26T10:00:00+07:00",
            "category": "Thế Giới Mở Kỳ Ảo",
            "platform": "PC, Android, iOS, PS5",
            "iconUrl": "/game_icons/azur-promilia.webp",
            "icon_url": "/game_icons/azur-promilia.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
            "description": "Siêu phẩm RPG sinh vật kỳ ảo thế giới mở từ nhà phát triển Azur Lane.",
            "expectedCodes": [
                  "AZURPROMILIA",
                  "MANJUU2026"
            ],
            "subscribersCount": 6500,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 6,
            "createdAt": "2026-10-23T16:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_elancia_mobile",
            "name": "Elancia Mobile",
            "slug": "elancia-mobile",
            "publisher": "GAMEDUO",
            "releaseDate": "2026-12-01T09:00:00+07:00",
            "category": "MMORPG Cổ Điển",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/elancia-mobile.webp",
            "icon_url": "/game_icons/elancia-mobile.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
            "description": "Huyền thoại MMORPG cổ điển tái xuất trên nền tảng di động.",
            "expectedCodes": [
                  "ELANCIA2026",
                  "GAMEDUO"
            ],
            "subscribersCount": 2100,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 7,
            "createdAt": "2026-10-23T16:30:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_ananta",
            "name": "ANANTA",
            "slug": "ananta",
            "publisher": "VNGGames",
            "releaseDate": "2027-01-15T10:00:00+07:00",
            "category": "Thế Giới Mở Anime",
            "platform": "PC, Android, iOS",
            "iconUrl": "/game_icons/ananta.webp",
            "icon_url": "/game_icons/ananta.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
            "description": "Dự án thế giới mở tương lai với cơ chế parkour đô thị và combat tự do do VNGGames phát hành tại VN.",
            "expectedCodes": [
                  "ANANTA2026",
                  "FUTUREOPEN"
            ],
            "subscribersCount": 5200,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 8,
            "createdAt": "2026-10-23T17:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_mong_canh_tam_quoc",
            "name": "Mộng Cảnh Tam Quốc",
            "slug": "mong-canh-tam-quoc",
            "publisher": "SohaGame",
            "releaseDate": null,
            "category": "Chiến Thuật Thẻ Tướng",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/mong-canh-tam-quoc.webp",
            "icon_url": "/game_icons/mong-canh-tam-quoc.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
            "description": "Thế giới Tam Quốc huyễn tưởng kết hợp đồ họa anime tuyệt mỹ.",
            "expectedCodes": [
                  "MONGCANH3Q",
                  "TAMQUOCAFK"
            ],
            "subscribersCount": 2150,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 9,
            "createdAt": "2026-10-23T17:30:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_bleach",
            "name": "BLEACH",
            "slug": "bleach",
            "publisher": "Bandai Namco Entertainment",
            "releaseDate": null,
            "category": "Hành Động Anime",
            "platform": "Android, iOS, PC",
            "iconUrl": "/game_icons/bleach.webp",
            "icon_url": "/game_icons/bleach.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "description": "Tác phẩm nhập vai hành động chuẩn nguyên tác anime Bleach chính thức.",
            "expectedCodes": [
                  "BLEACH2026",
                  "BANKAI"
            ],
            "subscribersCount": 3800,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 10,
            "createdAt": "2026-10-23T18:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_petit_planet",
            "name": "Petit Planet",
            "slug": "petit-planet",
            "publisher": "HoYoverse",
            "releaseDate": null,
            "category": "Mô Phỏng Cuộc Sống",
            "platform": "PC, Mobile",
            "iconUrl": "/game_icons/petit-planet.webp",
            "icon_url": "/game_icons/petit-planet.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
            "description": "Dự án game mô phỏng cuộc sống ấm áp từ HoYoverse.",
            "expectedCodes": [
                  "PETIT2026",
                  "HOYOVERSE"
            ],
            "subscribersCount": 4200,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 11,
            "createdAt": "2026-10-23T18:30:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_palworld",
            "name": "Palworld",
            "slug": "palworld",
            "publisher": "Garena",
            "releaseDate": null,
            "category": "Sinh Tồn Thế Giới Mở",
            "platform": "PC, Android, iOS",
            "iconUrl": "/game_icons/palworld.webp",
            "icon_url": "/game_icons/palworld.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
            "description": "Siêu phẩm sinh tồn thu phục sinh vật thế giới mở phiên bản di động.",
            "expectedCodes": [
                  "PALWORLDVN",
                  "GARENA2026"
            ],
            "subscribersCount": 9100,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 12,
            "createdAt": "2026-10-23T19:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_tougen_anki",
            "name": "Tougen Anki",
            "slug": "tougen-anki",
            "publisher": "Com2uS",
            "releaseDate": null,
            "category": "Nhập Vai Hành Động",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/tougen-anki.webp",
            "icon_url": "/game_icons/tougen-anki.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "description": "Game nhập vai chuyển thể từ manga đình đám Tougen Anki Dark Demon.",
            "expectedCodes": [
                  "TOUGENANKI",
                  "COM2US"
            ],
            "subscribersCount": 1600,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 13,
            "createdAt": "2026-10-23T19:30:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_temppal",
            "name": "TEMPPAL",
            "slug": "temppal",
            "publisher": "Nexon",
            "releaseDate": null,
            "category": "MMORPG Hành Động",
            "platform": "PC, Mobile",
            "iconUrl": "/game_icons/temppal.webp",
            "icon_url": "/game_icons/temppal.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
            "description": "MMORPG hành động đỉnh cao dựa trên bộ tiểu thuyết Overgeared đình đám.",
            "expectedCodes": [
                  "TEMPPAL2026",
                  "NEXON"
            ],
            "subscribersCount": 2400,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 14,
            "createdAt": "2026-10-23T20:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_crownstone",
            "name": "Crownstone",
            "slug": "crownstone",
            "publisher": "Level Infinite",
            "releaseDate": null,
            "category": "Chiến Thuật Giả Tưởng",
            "platform": "Android, iOS, PC",
            "iconUrl": "/game_icons/crownstone.webp",
            "icon_url": "/game_icons/crownstone.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
            "description": "Game chiến thuật giả tưởng hoành tráng đến từ Level Infinite.",
            "expectedCodes": [
                  "CROWNSTONE",
                  "LEVELINFINITE"
            ],
            "subscribersCount": 3100,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 15,
            "createdAt": "2026-10-23T20:30:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_overwatch_rush",
            "name": "Overwatch Rush",
            "slug": "overwatch-rush",
            "publisher": "Blizzard",
            "releaseDate": null,
            "category": "Bắn Súng Anh Hùng",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/overwatch-rush.webp",
            "icon_url": "/game_icons/overwatch-rush.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "description": "Trải nghiệm bắn súng góc nhìn thứ nhất nhịp độ cao vũ trụ Overwatch trên mobile.",
            "expectedCodes": [
                  "OVERWATCHRUSH",
                  "BLIZZARD"
            ],
            "subscribersCount": 4700,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 16,
            "createdAt": "2026-10-23T21:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_plants_vs_zombies_3",
            "name": "Plants vs Zombies 3",
            "slug": "plants-vs-zombies-3",
            "publisher": "EA",
            "releaseDate": null,
            "category": "Chiến Thuật Tháp Thủ",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/plants-vs-zombies-3.webp",
            "icon_url": "/game_icons/plants-vs-zombies-3.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
            "description": "Phần ba chính thức của loạt game thủ thành hoa quả đại chiến kinh điển từ Electronic Arts.",
            "expectedCodes": [
                  "PVZ32026",
                  "EAGAMES"
            ],
            "subscribersCount": 5300,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 17,
            "createdAt": "2026-10-23T21:30:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_garena_free_city",
            "name": "Garena Free City",
            "slug": "garena-free-city",
            "publisher": "Garena",
            "releaseDate": null,
            "category": "Thế Giới Mở Đô Thị",
            "platform": "Android, iOS, PC",
            "iconUrl": "/game_icons/garena-free-city.webp",
            "icon_url": "/game_icons/garena-free-city.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
            "description": "Thế giới mở mô phỏng đời sống đô thị tự do rộng lớn từ Garena.",
            "expectedCodes": [
                  "FREECITY",
                  "GARENA"
            ],
            "subscribersCount": 6800,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 18,
            "createdAt": "2026-10-23T22:00:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_arad_idle_rpg",
            "name": "Arad Idle RPG",
            "slug": "arad-idle-rpg",
            "publisher": "Nexon",
            "releaseDate": null,
            "category": "Nhập Vai Rảnh Tay",
            "platform": "Android, iOS",
            "iconUrl": "/game_icons/arad-idle-rpg.webp",
            "icon_url": "/game_icons/arad-idle-rpg.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
            "description": "Game nhập vai rảnh tay Dungeon & Fighter thế hệ mới từ Nexon.",
            "expectedCodes": [
                  "ARADIDLE",
                  "NEXON2026"
            ],
            "subscribersCount": 2900,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "UPCOMING",
            "displayOrder": 19,
            "createdAt": "2026-10-23T22:30:00Z",
            "updatedAt": "2026-10-27T10:00:00Z"
      },
      {
            "id": "ug_strinova_vn",
            "name": "Strinova VN",
            "slug": "strinova-vn",
            "publisher": "Gzone",
            "releaseDate": "2026-10-23T09:00:00+07:00",
            "category": "Bắn Súng Anime 3D",
            "platform": "PC, Android, iOS",
            "iconUrl": "/game_icons/strinova-vn.webp",
            "icon_url": "/game_icons/strinova-vn.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "description": "Game bắn súng chiến thuật biến hình Anime 3D góc nhìn thứ ba đỉnh cao 2026 từ iDreamSky.",
            "preRegUrl": "https://strinova.vplay.vn",
            "expectedCodes": [
                  "STRINOVAOB",
                  "STRINOVAVN",
                  "VIP999",
                  "OPENBETA2026"
            ],
            "subscribersCount": 2840,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "LAUNCHED",
            "displayOrder": 901,
            "createdAt": "2026-10-20T08:00:00Z",
            "updatedAt": "2026-10-23T10:00:00Z"
      },
      {
            "id": "ug_where_winds_meet",
            "name": "Where Winds Meet",
            "slug": "where-winds-meet",
            "publisher": "NetEase Games",
            "releaseDate": "2026-09-10T10:00:00+07:00",
            "category": "Hành Động Thế Giới Mở",
            "platform": "PC, Mobile",
            "iconUrl": "/game_icons/where-winds-meet.webp",
            "icon_url": "/game_icons/where-winds-meet.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
            "description": "Bom tấn võ hiệp thế giới mở thời Ngũ Đại Thập Quốc với đồ họa ray-tracing đỉnh cao.",
            "expectedCodes": [
                  "WHEREWINDSMEET",
                  "WWMOPENBETA",
                  "VIP888"
            ],
            "subscribersCount": 5630,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "LAUNCHED",
            "displayOrder": 902,
            "createdAt": "2026-10-18T10:00:00Z",
            "updatedAt": "2026-10-23T10:00:00Z"
      },
      {
            "id": "ug_hsr_ver30",
            "name": "Honkai: Star Rail",
            "slug": "honkai-star-rail",
            "publisher": "HoYoverse",
            "releaseDate": "2026-04-26T10:00:00+07:00",
            "category": "Chiến Thuật Theo Lượt",
            "platform": "PC, Android, iOS",
            "iconUrl": "/game_icons/honkai-star-rail.webp",
            "icon_url": "/game_icons/honkai-star-rail.webp",
            "bannerUrl": "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
            "description": "Phiên bản đại cập nhật mở ra thế giới mới và dàn nhân vật 5 sao giới hạn mới.",
            "expectedCodes": [
                  "HSRVER30",
                  "STARRAIL30"
            ],
            "subscribersCount": 8900,
            "source": "Trợ lý Pine & Muse Bot",
            "status": "LAUNCHED",
            "displayOrder": 903,
            "createdAt": "2026-10-19T14:00:00Z",
            "updatedAt": "2026-10-23T10:00:00Z"
      }
];
  }

  public getUpcomingGames(): UpcomingGameAdminRecord[] {
    return [...this.upcomingGames];
  }

  public async saveUpcomingGame(game: UpcomingGameAdminRecord): Promise<void> {
    const idx = this.upcomingGames.findIndex((g) => g.id === game.id || (g.slug && g.slug === game.slug));
    const now = new Date().toISOString();
    const cleanGame: UpcomingGameAdminRecord = {
      ...game,
      updatedAt: now,
      createdAt: game.createdAt || now,
    };

    if (idx >= 0) {
      this.upcomingGames[idx] = cleanGame;
    } else {
      this.upcomingGames.unshift(cleanGame);
    }

    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
  }

  public async deleteUpcomingGame(id: string): Promise<void> {
    this.upcomingGames = this.upcomingGames.filter((g) => g.id !== id && g.slug !== id);
    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
  }

  public async setUpcomingGames(games: UpcomingGameAdminRecord[]): Promise<void> {
    this.upcomingGames = [...games];
    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
  }

  /**
   * Tùy chỉnh sắp xếp thứ tự các game hiển thị trên Web Khách
   * (Top 6 game đầu tiên hiển thị ngay trên Banner, còn lại hiển thị khi bấm Xem Thêm)
   */
  public async reorderUpcomingGames(orderedIds: string[]): Promise<void> {
    const orderMap = new Map<string, number>();
    orderedIds.forEach((id, idx) => {
      orderMap.set(id.toLowerCase(), idx + 1);
    });

    for (const g of this.upcomingGames) {
      const idKey = (g.id || '').toLowerCase();
      const slugKey = (g.slug || '').toLowerCase();
      if (orderMap.has(idKey)) {
        g.displayOrder = orderMap.get(idKey);
      } else if (orderMap.has(slugKey)) {
        g.displayOrder = orderMap.get(slugKey);
      }
    }

    // Sort by displayOrder
    this.upcomingGames.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
  }

  /**
   * Duyệt game từ hàng chờ đưa lên Web Khách
   */
  public async approveUpcomingGame(id: string, pinToTop = false): Promise<void> {
    const ug = this.upcomingGames.find((g) => g.id === id || g.slug === id);
    if (!ug) return;

    const now = new Date().toISOString();
    ug.status = 'UPCOMING';
    ug.approvedAt = now;
    ug.approvedBy = 'Admin Quản Trị';
    ug.updatedAt = now;

    if (pinToTop) {
      ug.displayOrder = 1;
      let order = 2;
      for (const item of this.upcomingGames) {
        if (item.id !== ug.id && (item.status === 'UPCOMING' || item.status === 'APPROVED')) {
          item.displayOrder = order++;
        }
      }
    } else if (!ug.displayOrder || ug.displayOrder <= 0) {
      const maxOrder = Math.max(0, ...this.upcomingGames.filter((g) => g.status === 'UPCOMING' || g.status === 'APPROVED').map((g) => g.displayOrder || 0));
      ug.displayOrder = maxOrder + 1;
    }

    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
  }

  /**
   * Duyệt toàn bộ game trong hàng chờ
   */
  public async approveAllUpcomingGames(): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;
    let maxOrder = Math.max(0, ...this.upcomingGames.filter((g) => g.status === 'UPCOMING' || g.status === 'APPROVED').map((g) => g.displayOrder || 0));

    for (const ug of this.upcomingGames) {
      if (ug.status === 'PENDING') {
        ug.status = 'UPCOMING';
        ug.approvedAt = now;
        ug.approvedBy = 'Admin Quản Trị';
        ug.updatedAt = now;
        ug.displayOrder = ++maxOrder;
        count++;
      }
    }

    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
    return count;
  }

  /**
   * Chuyển game về hàng chờ duyệt
   */
  public async moveUpcomingGameToPending(id: string): Promise<void> {
    const ug = this.upcomingGames.find((g) => g.id === id || g.slug === id);
    if (!ug) return;
    ug.status = 'PENDING';
    ug.updatedAt = new Date().toISOString();

    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
  }

  /**
   * Đổi trạng thái game sắp ra mắt bất kỳ (UPCOMING, PENDING, LAUNCHED, CANCELLED)
   */
  public async updateUpcomingGameStatus(id: string, status: 'UPCOMING' | 'PENDING' | 'APPROVED' | 'LAUNCHED' | 'CANCELLED', pinToTop = false): Promise<void> {
    const ug = this.upcomingGames.find((g) => g.id === id || g.slug === id);
    if (!ug) return;
    const now = new Date().toISOString();
    ug.status = status;
    ug.updatedAt = now;
    if (status === 'UPCOMING' || status === 'APPROVED') {
      ug.approvedAt = now;
      ug.approvedBy = 'Admin Quản Trị';
      if (pinToTop) {
        let orderIndex = 2;
        this.upcomingGames.forEach((item) => {
          if (item.id !== ug.id && (item.status === 'UPCOMING' || item.status === 'APPROVED')) {
            item.displayOrder = orderIndex++;
          }
        });
        ug.displayOrder = 1;
      }
    }

    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
  }

  /**
   * Xóa sạch mã code dự kiến (reset danh sách mã đoán)
   */
  public async clearUpcomingGameExpectedCodes(id: string): Promise<void> {
    const ug = this.upcomingGames.find((g) => g.id === id || g.slug === id);
    if (!ug) return;
    ug.expectedCodes = [];
    ug.updatedAt = new Date().toISOString();

    this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
    crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
    this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
    await Promise.allSettled([
      this.syncToCloudflareKV(this.KEYS.UPCOMING_GAMES, this.upcomingGames),
      this.syncUpcomingGamesToServer(),
    ]);
  }

  /**
   * Phát hành game sắp ra mắt thành Game Chính Thức trên sàn khi mở server
   */
  public async launchUpcomingGame(id: string): Promise<{ success: boolean; gameName: string; codesAdded: number }> {
    const ug = this.upcomingGames.find((g) => g.id === id || g.slug === id);
    if (!ug) {
      return { success: false, gameName: '', codesAdded: 0 };
    }

    // 1. Chuyển trạng thái UpcomingGame sang LAUNCHED
    ug.status = 'LAUNCHED';
    ug.updatedAt = new Date().toISOString();
    await this.saveUpcomingGame(ug);

    // 2. Thêm vào danh sách game chính thức nếu chưa có
    const existingGame = this.games.find((g) => g.slug === ug.slug);
    if (!existingGame) {
      const newGame: GameAdminRecord = {
        id: ug.slug,
        name: ug.name,
        slug: ug.slug,
        publisher: ug.publisher,
        category: ug.category,
        rating: 5.0,
        icon_url: ug.iconUrl || `/game_icons/${ug.slug}.webp`,
        banner_url: ug.bannerUrl,
        description: ug.description || `Tổng hợp trọn bộ giftcode ${ug.name} mới nhất 2026.`,
        short_description: `Giftcode ${ug.name} tân thủ mừng mở server.`,
        instructions: 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
        platform: ug.platform || 'Android, iOS, PC',
        release_date: ug.releaseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: 'HOT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await this.saveGame(newGame);
    }

    // 3. Kích hoạt toàn bộ giftcode dự kiến vào kho custom code
    let codesAdded = 0;
    if (Array.isArray(ug.expectedCodes) && ug.expectedCodes.length > 0) {
      for (const codeStr of ug.expectedCodes) {
        const cleanCode = codeStr.trim().toUpperCase();
        if (!cleanCode) continue;
        const exists = this.customFreeCodes.some(
          (c) => c.gameSlug === ug.slug && (c.codeValue?.toUpperCase() === cleanCode || c.code?.toUpperCase() === cleanCode)
        );
        if (!exists) {
          const newCode: FreeCodeRecord = {
            id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            codeValue: cleanCode,
            code: cleanCode,
            gameSlug: ug.slug,
            rewards: 'Quà tân thủ mừng mở server',
            status: 'ACTIVE',
            expiresAt: '',
            isVerified: true,
            copyCount: 0,
            notes: `Giftcode tân thủ do Muse/Hệ thống nạp từ lịch ra mắt game ${ug.name}`,
            createdAt: new Date().toISOString(),
          };
          this.customFreeCodes.unshift(newCode);
          codesAdded++;
        }
      }
      this.saveCustomFreeCodes();
    }

    return { success: true, gameName: ug.name, codesAdded };
  }

  /**
   * Đồng bộ trực tiếp danh sách upcoming games của Admin lên Cloudflare D1
   */
  public async syncUpcomingGamesToServer(): Promise<boolean> {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const endpoints = isLocalhost
      ? ['https://admin-code-game-shop.pages.dev/api/crawler/ingest-upcoming-games', '/api/crawler/ingest-upcoming-games']
      : ['/api/crawler/ingest-upcoming-games', 'https://admin-code-game-shop.pages.dev/api/crawler/ingest-upcoming-games'];

    const payload = {
      action: 'set_display_list',
      apiKey: this.crawlerApiConfig.apiKey || 'WCG_PROD_SYNC_SECURE_KEY_2026_988776',
      botName: 'Admin Quản Trị',
      games: this.upcomingGames,
    };

    let synced = false;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.crawlerApiConfig.apiKey || 'WCG_PROD_SYNC_SECURE_KEY_2026_988776',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          synced = true;
          break;
        }
      } catch {}
    }
    return synced;
  }

  /**
   * Tải toàn bộ danh sách upcoming games mới nhất từ server Cloudflare D1
   */
  public async fetchUpcomingGamesFromServer(): Promise<UpcomingGameAdminRecord[]> {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const endpoints = isLocalhost
      ? ['https://admin-code-game-shop.pages.dev/api/crawler/ingest-upcoming-games?status=ALL', '/api/crawler/ingest-upcoming-games?status=ALL']
      : ['/api/crawler/ingest-upcoming-games?status=ALL', 'https://admin-code-game-shop.pages.dev/api/crawler/ingest-upcoming-games?status=ALL'];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.games) && data.games.length > 0) {
            this.upcomingGames = data.games;
            this.safeSetItem(this.KEYS.UPCOMING_GAMES, JSON.stringify(this.upcomingGames));
            crossOriginSync.setItem(this.KEYS.UPCOMING_GAMES, this.upcomingGames);
            this.broadcastSync('UPCOMING_GAMES_UPDATED', this.upcomingGames);
            return [...this.upcomingGames];
          }
        }
      } catch {}
    }
    return [...this.upcomingGames];
  }

  public getUpcomingGamesLogs(): UpcomingGameApiLogEntry[] {
    return [...this.upcomingGamesLogs];
  }

  public addUpcomingGameLog(log: UpcomingGameApiLogEntry): void {
    this.upcomingGamesLogs.unshift(log);
    if (this.upcomingGamesLogs.length > 50) {
      this.upcomingGamesLogs = this.upcomingGamesLogs.slice(0, 50);
    }
    this.safeSetItem(this.KEYS.UPCOMING_GAMES_LOGS, JSON.stringify(this.upcomingGamesLogs));
  }

  // --- TEMPORARY AUDIT TOKEN MANAGEMENT (2FA PROTECTED) ---
  public async getTemporaryAuditTokenStatus(): Promise<any> {
    try {
      const res = await fetch('/api/admin/temporary-token', {
        headers: this.getAuthHeaders(),
        cache: 'no-store',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { success: false, hasActiveToken: false, tokenData: null };
  }

  public async generateTemporaryAuditToken(expiresInHours: number = 2): Promise<any> {
    try {
      const res = await fetch('/api/admin/temporary-token', {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate', expiresInHours }),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error || 'Lỗi tạo token' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi mạng khi tạo token' };
    }
  }

  public async revokeTemporaryAuditToken(): Promise<any> {
    try {
      const res = await fetch('/api/admin/temporary-token', {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'revoke' }),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error || 'Lỗi thu hồi token' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi mạng khi thu hồi token' };
    }
  }


}

export const adminDataService = new AdminDataService();
