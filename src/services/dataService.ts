import Fuse from 'fuse.js';
import type {
  GameItem,
  GiftCode,
  FilterState,
  StatsOverview,
  GiveawayCampaign,
  StoreProduct,
  UtilityProduct,
  OrderRecord,
  UserProfile,
  UtilityCategory,
  StoreCategory,
  UpcomingGame,
} from '../types/game';
import { DEFAULT_UPCOMING_GAMES } from '../types/game';
import { getUpcomingGameIconUrl } from '../utils/upcomingGameIconUtils';
import { calculateEffectiveOrder } from '../utils/upcomingGameGrowthUtils';
import { smartVietnameseMatch, calculateGameSearchScore, matchGameSearch } from '../utils/textUtils';
import { isCodeExpired, parseExpirationDate } from '../utils/codeUtils';

import { DEFAULT_STORE_PRODUCTS, DEFAULT_UTILITY_PRODUCTS, DEFAULT_GIVEAWAYS } from '../data/seedData';
import { marketingService } from './marketingService';
import {
  FloatingNotificationConfig,
  DEFAULT_FLOATING_NOTIFICATION,
} from '../types/floatingNotification';

interface RawGame {
  id?: string;
  name: string;
  slug: string;
  publisher?: string | null;
  category?: string | null;
  rating?: number | null;
  icon_url?: string | null;
  iconUrl?: string | null;
  banner_url?: string | null;
  bannerUrl?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  instructions?: string | null;
  platform?: string | null;
  so_giay_phep?: string | null;
  ngay_cap_phep?: string | null;
  release_date?: string | null;
  gp_release_date?: string | null;
  gp_updated_date?: string | null;
  download_android?: string | null;
  download_ios?: string | null;
  download_pc?: string | null;
  downloadLinks?: { android?: string; ios?: string; pc?: string };
  redeem_url?: string | null;
  redeemUrl?: string | null;
  is_featured?: number | boolean;
  isFeatured?: number | boolean;
  is_hot?: number | boolean;
  isHot?: number | boolean;
  is_new?: number | boolean;
  isNew?: number | boolean;
  is_active?: number | boolean;
}

interface RawCodeItem {
  id?: string;
  gameId?: string;
  gameSlug?: string;
  game_slug?: string;
  slug?: string;
  code?: string;
  codeValue?: string;
  code_value?: string;
  gift_code?: string;
  rewards?: string;
  description?: string;
  status?: string;
  expiresAt?: string;
  expires_at?: string;
  expiry?: string;
  createdAt?: string;
  created_at?: string;
}

export function normalizeCategory(rawCategory?: string | null): string {
  if (!rawCategory) return '';
  const trimmed = String(rawCategory).trim();
  if (trimmed.includes('\uFFFD') || /th[p|ậ|a-z]*\s*c[ẩ|a-z]*m/i.test(trimmed)) {
    return 'Thể Thao & Tốc Độ';
  }
  if (trimmed === 'Nhập Vai (MMORPG)' || trimmed === 'Nhập Vai') return 'Nhập Vai';
  if (trimmed === 'Chiến Thuật Tam Quốc' || trimmed === 'Tam Quốc / Chiến Thuật') return 'Tam Quốc / Chiến Thuật';
  if (trimmed === 'Roblox / Thủ Thành Chiến Lược' || trimmed === 'Roblox / Thủ Thành Chiến Thuật') return 'Roblox / Thủ Thành Chiến Thuật';
  if (trimmed === 'Thể Thao Điện Tử' || trimmed === 'Thể Thao & Tốc Độ') return 'Thể Thao & Tốc Độ';
  if (trimmed === 'Kiếm Hiệp 3D' || trimmed === 'Kiếm Hiệp Nhập Vai' || trimmed === 'Kiếm Hiệp / Tiên Hiệp') return 'Kiếm Hiệp / Tiên Hiệp';
  return trimmed;
}

export function normalizeAndDeduplicateCategories(categories: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of categories) {
    if (!c) continue;
    const norm = normalizeCategory(c);
    if (!norm || norm === 'Tất cả' || norm === 'all') continue;
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
    }
  }
  result.sort((a, b) => a.localeCompare(b, 'vi'));
  return ['Tất cả', ...result];
}

class DataService {
  private games: GameItem[] = [];
  private codesMap: Map<string, GiftCode[]> = new Map();
  private fuseInstance: Fuse<GameItem> | null = null;
  private isLoaded: boolean = false;
  private categories: string[] = [];
  private cachedServerGames: Map<string, GameItem> = new Map();
  private cachedGameFetchTime: Map<string, number> = new Map();
  private listeners: Set<() => void> = new Set();
  private codesFallbackLoadingPromise: Promise<void> | null = null;
  private codesFallbackLoaded: boolean = false;

  // Local storage keys
  private readonly BOOKMARKS_KEY = 'wcg_bookmarks';
  private readonly VOTES_KEY = 'wcg_votes';
  private readonly CUSTOM_CODES_KEY = 'wcg_custom_codes';
  private readonly USER_KEY = 'wcg_user';
  private readonly CLAIMED_CODES_KEY = 'wcg_claimed_giveaways';
  private readonly ORDERS_KEY = 'wcg_orders';
  private readonly MISSION_REWARDS_KEY = 'wcg_my_mission_rewards_v1';
  private readonly STORE_PRODUCTS_KEY = 'wcg_admin_store_products_v4';
  private readonly UTILITIES_KEY = 'wcg_admin_utilities_v4';
  private readonly GIVEAWAYS_KEY = 'wcg_admin_giveaways_v4';

  // Seed sample Store Products, Utilities & Giveaways from shared seedData
  private defaultStoreProducts: StoreProduct[] = DEFAULT_STORE_PRODUCTS;
  private defaultUtilities: UtilityProduct[] = DEFAULT_UTILITY_PRODUCTS;

  constructor() {
    this.cleanupLegacyV3Data();
    this.setupSyncListeners();
    this.processData().catch(() => {});
  }

  private readonly DATASET_VERSION = 'wcg_dataset_2026_10_30_v41';

  private cleanupLegacyV3Data(): void {
    if (typeof window === 'undefined') return;
    try {
      const currentVer = localStorage.getItem('wcg_dataset_version');
      if (currentVer !== this.DATASET_VERSION) {
        // Clear cached game, code, giveaways and utilities lists to load newest datasets with 100% fresh data
        localStorage.removeItem('wcg_admin_games_v5');
        localStorage.removeItem('wcg_admin_free_codes_v5');
        localStorage.removeItem('wcg_admin_games_v4');
        localStorage.removeItem('wcg_admin_free_codes_v4');
        localStorage.removeItem('wcg_admin_utilities_v4');
        localStorage.removeItem('wcg_utilities');
        localStorage.removeItem('wcg_admin_giveaways_v4');
        localStorage.removeItem(this.GIVEAWAYS_KEY);
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

      // Clean up phantom giveaway and Delta Force from localStorage if present
      try {
        const rawGw = localStorage.getItem('wcg_admin_giveaways_v4') || localStorage.getItem(this.GIVEAWAYS_KEY);
        if (rawGw) {
          const parsed = JSON.parse(rawGw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (g) =>
                !(g?.title === '15' || (g?.game_name && g.game_name.includes('Thiếu Hiệp')) || (g?.game_slug && g.game_slug.includes('thieu-hiep'))) &&
                g?.id !== 'gw_alienware_vaultbreakers' &&
                g?.id !== 'gw_garena_delta_force' &&
                !(g?.game_name && g.game_name.toLowerCase().includes('delta force'))
            );
            localStorage.setItem('wcg_admin_giveaways_v4', JSON.stringify(cleaned));
            localStorage.setItem(this.GIVEAWAYS_KEY, JSON.stringify(cleaned));
          }
        }
      } catch {}

      // Clean up test products from localStorage if present
      const testMockIds = new Set([
        'ut_test_01',
        'sp_1', 'sp_2', 'sp_3', 'sp_4', 'sp_5', 'sp_6',
        'sp_hsr_pass',
        'sp_genshin_welkin',
        'sp_roblox_robux_1000',
        'sp_lq_qh_500',
        'sp_ff_kc_520',
        'sp_pubg_uc_600',
      ]);
      try {
        const rawSp = localStorage.getItem('wcg_admin_store_products_v4');
        if (rawSp) {
          const parsed = JSON.parse(rawSp);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((p) => p && !testMockIds.has(p.id));
            localStorage.setItem('wcg_admin_store_products_v4', JSON.stringify(filtered));
            localStorage.setItem(this.STORE_PRODUCTS_KEY, JSON.stringify(filtered));
          }
        }
      } catch {}
      try {
        const rawUt = localStorage.getItem('wcg_admin_utilities_v4');
        if (rawUt) {
          const parsed = JSON.parse(rawUt);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((u) => u && !testMockIds.has(u.id));
            localStorage.setItem('wcg_admin_utilities_v4', JSON.stringify(filtered));
            localStorage.setItem(this.UTILITIES_KEY, JSON.stringify(filtered));
          }
        }
      } catch {}

      // Reset wallets and revenue to 0 VNĐ
      const resetFlag = 'wcg_client_wallet_and_revenue_reset_v5';
      if (!localStorage.getItem(resetFlag)) {
        try {
          const uRaw = localStorage.getItem('wcg_user');
          if (uRaw) {
            const u = JSON.parse(uRaw);
            u.wallet_balance = 0;
            localStorage.setItem('wcg_user', JSON.stringify(u));
          }
        } catch {}
        localStorage.setItem('wcg_orders', JSON.stringify([]));
        localStorage.setItem('wcg_admin_orders_v4', JSON.stringify([]));
        localStorage.setItem('wcg_admin_transactions_v4', JSON.stringify([]));
        localStorage.setItem(resetFlag, 'true');
      }
    } catch {}
  }

  private reloadTimeout: any = null;

  public reload(): void {
    if (this.reloadTimeout) clearTimeout(this.reloadTimeout);
    this.reloadTimeout = setTimeout(async () => {
      this.isLoaded = false;
      await this.processData();
      this.notifyListeners();
    }, 250);
  }

  private setupSyncListeners(): void {
    if (typeof window === 'undefined') return;

    // Purge stale inventory cache from client localStorage to ensure 100% server-authoritative stock
    try {
      if (!window.location.hash.includes('/admin')) {
        localStorage.removeItem('wcg_admin_inventory_v4');
      }
    } catch {}

    // Gentle deferred background sync so initial paint and /api/games load in <100ms
    setTimeout(() => {
      this.syncWithCloudflareKV();
    }, 1200);
    this.refreshCurrentUserBalance();

    // Sync when returning to tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncWithCloudflareKV();
      }
    });

    // Periodic gentle background sync for live marketing events & stats when tab is visible
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.syncWithCloudflareKV();
      }
    }, 45000);

    // Storage event listener (Filtered to data collections only)
    window.addEventListener('storage', (e) => {
      if (
        e.key &&
        (e.key.startsWith('wcg_admin_store_products') ||
          e.key.startsWith('wcg_admin_utilities') ||
          e.key.startsWith('wcg_deleted_store_products') ||
          e.key.startsWith('wcg_deleted_utilities') ||
          e.key.startsWith('wcg_admin_games') ||
          e.key.startsWith('wcg_admin_free_codes') ||
          e.key.startsWith('wcg_admin_custom_free_codes') ||
          e.key.startsWith('wcg_deleted_free_codes') ||
          e.key.startsWith('wcg_admin_giveaways') ||
          e.key.startsWith('wcg_admin_content') ||
          e.key.startsWith('wcg_admin_sepay'))
      ) {
        this.reload();
      }
    });

    // Custom Window Events
    window.addEventListener('wcg_admin_data_updated', () => {
      this.reload();
    });

    window.addEventListener('SEPAY_UPDATED', () => {
      this.notifyListeners();
    });

    // Cross-tab & Cross-origin BroadcastChannel for instant sync without reload
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('wcg_data_sync');
        bc.onmessage = (event) => {
          const type = String(event.data?.type || event.data?.key || '');
          if (!type) return;

          // Ignore ephemeral operational events (analytics, stats, copy, marketing, pings)
          if (
            type.startsWith('COPY_') ||
            type.startsWith('STATS_') ||
            type.startsWith('REAL_EVENT') ||
            type.startsWith('MEMBER_') ||
            type.startsWith('SEPAY_') ||
            type === 'PING' ||
            type === 'PONG'
          ) {
            return;
          }

          if (type.includes('content') || type.includes('branding')) {
            this.syncWithCloudflareKV().then(() => {
              this.reload();
              window.dispatchEvent(new CustomEvent('wcg_admin_content_updated'));
            });
          } else if (
            type.includes('games') ||
            type.includes('codes') ||
            type.includes('products') ||
            type.includes('utilities') ||
            type.includes('giveaways') ||
            type === 'ADMIN_DATA_UPDATED' ||
            type === 'wcg_admin_data_updated'
          ) {
            this.reload();
          }
        };
      } catch {}
    }
  }

  public async pushToCloudflareKV(key: string, data: any): Promise<void> {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('wcg_auth_token') ||
            sessionStorage.getItem('wcg_auth_token') ||
            this.getCurrentUser()?.session_token ||
            ''
          : '';
      let adminSecret =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('wcg_admin_sync_key') || localStorage.getItem('wcg_admin_sync_key') || ''
          : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (adminSecret) {
        headers['X-Sync-Key'] = adminSecret;
        if (!token) headers['Authorization'] = `Bearer ${adminSecret}`;
      }

      const endpoints: string[] = ['/api/sync'];
      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (!host.includes('codegame.shop') && !host.includes('localhost')) {
          endpoints.push('https://codegame.shop/api/sync');
        }
        if (!host.includes('web-code-game.pages.dev') && !host.includes('localhost')) {
          endpoints.push('https://web-code-game.pages.dev/api/sync');
        }
        if (!host.includes('admin-code-game-shop.pages.dev') && !host.includes('localhost')) {
          endpoints.push('https://admin-code-game-shop.pages.dev/api/sync');
        }
      }

      await Promise.allSettled(
        endpoints.map((url) =>
          fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ key, data }),
          }).catch(() => {})
        )
      );
    } catch {}
  }

  private activeSyncPromise: Promise<void> | null = null;

  /**
   * Lightweight sync specifically for CMS Branding & Content (only 4 KB, takes 15ms)
   * Avoids downloading massive game catalogs when only site branding/content is needed.
   */
  public async syncBrandingAndContentOnly(): Promise<void> {
    try {
      const res = await fetch(`/api/sync?key=wcg_admin_content_v4&fresh=1&_t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (res.ok) {
        const json = await res.json();
        const incoming = json.data || json.content;
        if (incoming && Array.isArray(incoming) && incoming.length > 0) {
          const currentContent = localStorage.getItem('wcg_admin_content_v4');
          const newContent = JSON.stringify(incoming);
          if (currentContent !== newContent) {
            try {
              localStorage.setItem('wcg_admin_content_v4', newContent);
            } catch {}
          }
          // Always notify components of up-to-date CMS items
          window.dispatchEvent(new CustomEvent('wcg_admin_content_updated', { detail: incoming }));

          // Specifically propagate floating notification setting
          const floatingItem = incoming.find((i: any) => i && i.key === 'floating_notification');
          if (floatingItem) {
            const extra = floatingItem.extraData && typeof floatingItem.extraData === 'object' ? floatingItem.extraData : {};
            const cfg: FloatingNotificationConfig = {
              ...DEFAULT_FLOATING_NOTIFICATION,
              ...extra,
              enabled: floatingItem.isActive !== false,
              title: floatingItem.title || DEFAULT_FLOATING_NOTIFICATION.title,
              message: floatingItem.content || DEFAULT_FLOATING_NOTIFICATION.message,
              updatedAt: extra.updatedAt || floatingItem.updatedAt || new Date().toISOString(),
            };
            try {
              localStorage.setItem('wcg_admin_floating_notification_v1', JSON.stringify(cfg));
            } catch {}
            window.dispatchEvent(new CustomEvent('wcg_floating_notification_updated', { detail: cfg }));
          }
        }
      }
    } catch {}
  }

    public async syncGiveaways(): Promise<GiveawayCampaign[]> {
    try {
      const res = await fetch(`/api/sync?key=wcg_admin_giveaways_v4&fresh=1&_t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (res.ok) {
        const json = await res.json();
        const incoming = json.data || json.giveaways;
        if (incoming && Array.isArray(incoming) && incoming.length > 0) {
          const currentGw = localStorage.getItem('wcg_admin_giveaways_v4');
          const newGw = JSON.stringify(incoming);
          if (currentGw !== newGw) {
            localStorage.setItem('wcg_admin_giveaways_v4', newGw);
            localStorage.setItem(this.GIVEAWAYS_KEY, newGw);
            window.dispatchEvent(new CustomEvent('wcg_giveaways_updated', { detail: incoming }));
            this.reload();
          }
          return incoming;
        }
      }
    } catch {}
    return this.getGiveaways();
  }

public async syncWithCloudflareKV(forceFresh: boolean = false): Promise<void> {
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    this.activeSyncPromise = (async () => {
      try {
        const isAdmin = typeof window !== 'undefined' && (
          window.location.hash.includes('/admin') ||
          window.location.pathname.startsWith('/admin') ||
          window.location.hostname.includes('admin-code-game-shop') ||
          Boolean(sessionStorage.getItem('wcg_admin_session')) ||
          Boolean(localStorage.getItem('wcg_admin_authenticated') === 'true')
        );
        if (!isAdmin) {
          // Non-admin public visitors: sync CMS branding, content, active giveaways and news articles without 559-games blob
          await Promise.allSettled([
            this.syncBrandingAndContentOnly(),
            this.syncGiveaways(),
            newsService.syncFromServer(),
          ]);
          return;
        }
        const shouldBypass = forceFresh && isAdmin;
        const fetchOpts: RequestInit = shouldBypass ? { headers: { 'Cache-Control': 'no-cache, no-store' } } : {};
        const url = shouldBypass ? '/api/sync?fresh=1' : '/api/sync';
        const res = await fetch(url, fetchOpts);
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

          // Sync real marketing events & master copy counter from Cloudflare KV hub
          if (json && (json.recentRealEvents || typeof json.masterCopyClicks === 'number' || json.realProductSoldCounts || json.realGiveawayClaimedCounts)) {
            marketingService.syncFromHub(
              json.recentRealEvents,
              json.masterCopyClicks,
              json.realProductSoldCounts,
              json.realGiveawayClaimedCounts,
              json.masterCopyClicksDate
            );
          }

          if (json && json.success) {
            let hasChanges = false;
            if (json.games && Array.isArray(json.games) && json.games.length > 0) {
              try {
                const currentGames = localStorage.getItem('wcg_admin_games_v5');
                const newGames = JSON.stringify(json.games);
                if (currentGames !== newGames) {
                  localStorage.setItem('wcg_admin_games_v5', newGames);
                  hasChanges = true;
                }
              } catch {}
            }
            if (json.freeCodes && Array.isArray(json.freeCodes) && json.freeCodes.length > 0) {
              try {
                const newCodes = JSON.stringify(json.freeCodes);
                if (newCodes.length <= 1.5 * 1024 * 1024) {
                  const currentCodes = localStorage.getItem('wcg_admin_free_codes_v5');
                  if (currentCodes !== newCodes) {
                    localStorage.setItem('wcg_admin_free_codes_v5', newCodes);
                    hasChanges = true;
                  }
                }
              } catch {}
            }
            if (json.deletedFreeCodes && Array.isArray(json.deletedFreeCodes)) {
              try {
                const currentDel = localStorage.getItem('wcg_deleted_free_codes');
                const newDel = JSON.stringify(json.deletedFreeCodes);
                if (currentDel !== newDel) {
                  localStorage.setItem('wcg_deleted_free_codes', newDel);
                  hasChanges = true;
                }
              } catch {}
            }
            if (json.customFreeCodes && Array.isArray(json.customFreeCodes)) {
              try {
                const currentCustom = localStorage.getItem('wcg_admin_custom_free_codes_v1');
                const newCustom = JSON.stringify(json.customFreeCodes);
                if (currentCustom !== newCustom) {
                  localStorage.setItem('wcg_admin_custom_free_codes_v1', newCustom);
                  hasChanges = true;
                  window.dispatchEvent(new CustomEvent('wcg_admin_custom_codes_updated', { detail: json.customFreeCodes }));
                }
              } catch {}
            }
            if (json.content && Array.isArray(json.content) && json.content.length > 0) {
              try {
                const currentContent = localStorage.getItem('wcg_admin_content_v4');
                const newContent = JSON.stringify(json.content);
                if (currentContent !== newContent) {
                  localStorage.setItem('wcg_admin_content_v4', newContent);
                  hasChanges = true;
                  window.dispatchEvent(new CustomEvent('wcg_admin_content_updated', { detail: json.content }));
                }
              } catch {}
            }
            if (json.submissions && Array.isArray(json.submissions)) {
              try {
                const currentSubs = localStorage.getItem('wcg_admin_submissions_v4');
                const newSubs = JSON.stringify(json.submissions);
                if (currentSubs !== newSubs) {
                  localStorage.setItem('wcg_admin_submissions_v4', newSubs);
                  hasChanges = true;
                }
              } catch {}
            }
            if (json.privateCodes && Array.isArray(json.privateCodes)) {
              const currentPriv = localStorage.getItem('wcg_admin_private_codes_v4');
              const newPriv = JSON.stringify(json.privateCodes);
              if (currentPriv !== newPriv) {
                localStorage.setItem('wcg_admin_private_codes_v4', newPriv);
                hasChanges = true;
              }
            }
            if (json.inventory && Array.isArray(json.inventory)) {
              const currentInvRaw = localStorage.getItem('wcg_admin_inventory_v4');
              let localInv: any[] = [];
              try {
                localInv = currentInvRaw ? JSON.parse(currentInvRaw) : [];
              } catch {}

              const mergedMap = new Map<string, any>();
              json.inventory.forEach((item: any) => {
                if (item && item.codeValue) {
                  const uniqueKey = item.id || `${item.sku}_${item.codeValue.trim()}`;
                  mergedMap.set(uniqueKey, item);
                }
              });

              localInv.forEach((localItem) => {
                if (localItem && localItem.codeValue) {
                  const uniqueKey = localItem.id || `${localItem.sku}_${localItem.codeValue.trim()}`;
                  if (!mergedMap.has(uniqueKey)) {
                    mergedMap.set(uniqueKey, localItem);
                  } else if (localItem.status === 'SOLD') {
                    mergedMap.set(uniqueKey, localItem);
                  }
                }
              });

              const mergedList = Array.from(mergedMap.values());
              const newInv = JSON.stringify(mergedList);
              if (currentInvRaw !== newInv) {
                localStorage.setItem('wcg_admin_inventory_v4', newInv);
                hasChanges = true;
              }
            }
            if (json.orders && Array.isArray(json.orders)) {
              const currentOrdersRaw = localStorage.getItem('wcg_admin_orders_v4');
              let localOrders: any[] = [];
              try {
                localOrders = currentOrdersRaw ? JSON.parse(currentOrdersRaw) : [];
              } catch {}

              const mergedMap = new Map<string, any>();
              json.orders.forEach((o: any) => {
                if (o && (o.id || o.orderCode)) {
                  const key = o.id || o.orderCode;
                  mergedMap.set(key, o);
                }
              });

              localOrders.forEach((localOrder) => {
                if (localOrder && (localOrder.id || localOrder.orderCode)) {
                  const key = localOrder.id || localOrder.orderCode;
                  if (!mergedMap.has(key)) {
                    mergedMap.set(key, localOrder);
                  }
                }
              });

              const mergedOrders = Array.from(mergedMap.values());
              const newOrders = JSON.stringify(mergedOrders);
              if (currentOrdersRaw !== newOrders) {
                localStorage.setItem('wcg_admin_orders_v4', newOrders);
                hasChanges = true;
              }
            }
            if (json.transactions && Array.isArray(json.transactions)) {
              const currentTxRaw = localStorage.getItem('wcg_admin_transactions_v4');
              let localTxs: any[] = [];
              try {
                localTxs = currentTxRaw ? JSON.parse(currentTxRaw) : [];
              } catch {}

              const mergedMap = new Map<string, any>();
              json.transactions.forEach((tx: any) => {
                if (tx && (tx.id || tx.referenceId)) {
                  const key = tx.id || tx.referenceId;
                  mergedMap.set(key, tx);
                }
              });

              localTxs.forEach((localTx) => {
                if (localTx && (localTx.id || localTx.referenceId)) {
                  const key = localTx.id || localTx.referenceId;
                  if (!mergedMap.has(key)) {
                    mergedMap.set(key, localTx);
                  }
                }
              });

              const mergedTxs = Array.from(mergedMap.values());
              const newTx = JSON.stringify(mergedTxs);
              if (currentTxRaw !== newTx) {
                localStorage.setItem('wcg_admin_transactions_v4', newTx);
                hasChanges = true;
              }
            }
            if (json.deletedGiveaways && Array.isArray(json.deletedGiveaways)) {
              const currentDelGw = localStorage.getItem('wcg_deleted_giveaways');
              const newDelGw = JSON.stringify(json.deletedGiveaways);
              if (currentDelGw !== newDelGw) {
                localStorage.setItem('wcg_deleted_giveaways', newDelGw);
                hasChanges = true;
              }
            }
            if (json.giveaways && Array.isArray(json.giveaways)) {
              let deletedGwSet = new Set<string>();
              try {
                const delRaw = localStorage.getItem('wcg_deleted_giveaways');
                if (delRaw) deletedGwSet = new Set(JSON.parse(delRaw));
              } catch {}
              if (json.deletedGiveaways && Array.isArray(json.deletedGiveaways)) {
                json.deletedGiveaways.forEach((id: string) => deletedGwSet.add(id));
              }

              const incomingGw: any[] = json.giveaways.filter(
                (g: any) =>
                  g &&
                  g.id &&
                  !deletedGwSet.has(g.id) &&
                  !(g.title === '15' && g.game_name && g.game_name.includes('Thiếu Hiệp')) &&
                  g.id !== 'gw_alienware_vaultbreakers' &&
                  g.id !== 'gw_garena_delta_force' &&
                  !(g.game_name && g.game_name.toLowerCase().includes('delta force'))
              );
              if (incomingGw.length > 0) {
                const currentGw = localStorage.getItem('wcg_admin_giveaways_v4');
                const newGw = JSON.stringify(incomingGw);
                if (currentGw !== newGw) {
                  localStorage.setItem('wcg_admin_giveaways_v4', newGw);
                  localStorage.setItem(this.GIVEAWAYS_KEY, newGw);
                  hasChanges = true;
                }
                window.dispatchEvent(new CustomEvent('wcg_giveaways_updated', { detail: incomingGw }));
              }
            }
            if (json.deletedStoreProducts && Array.isArray(json.deletedStoreProducts)) {
              const currentDel = localStorage.getItem('wcg_deleted_store_products');
              const newDel = JSON.stringify(json.deletedStoreProducts);
              if (currentDel !== newDel) {
                localStorage.setItem('wcg_deleted_store_products', newDel);
                hasChanges = true;
              }
            }
            if (json.deletedUtilities && Array.isArray(json.deletedUtilities)) {
              const currentDel = localStorage.getItem('wcg_deleted_utilities');
              const newDel = JSON.stringify(json.deletedUtilities);
              if (currentDel !== newDel) {
                localStorage.setItem('wcg_deleted_utilities', newDel);
                hasChanges = true;
              }
            }
            if (json.storeProducts && Array.isArray(json.storeProducts)) {
              let delList: string[] = [];
              try {
                const delRaw = localStorage.getItem('wcg_deleted_store_products');
                if (delRaw) delList = JSON.parse(delRaw);
              } catch {}
              const delSet = new Set(delList);
              const filtered = json.storeProducts.filter((p: any) => p && p.id && !delSet.has(p.id));
              const currentSp = localStorage.getItem('wcg_admin_store_products_v4');
              const newSp = JSON.stringify(filtered);
              if (currentSp !== newSp) {
                localStorage.setItem('wcg_admin_store_products_v4', newSp);
                localStorage.setItem(this.STORE_PRODUCTS_KEY, newSp);
                hasChanges = true;
              }
              window.dispatchEvent(new CustomEvent('wcg_store_products_updated', { detail: filtered }));
            }
            if (json.utilities && Array.isArray(json.utilities)) {
              let delList: string[] = [];
              try {
                const delRaw = localStorage.getItem('wcg_deleted_utilities');
                if (delRaw) delList = JSON.parse(delRaw);
              } catch {}
              const delSet = new Set(delList);
              const filtered = json.utilities.filter((u: any) => u && u.id && !delSet.has(u.id));
              const currentUt = localStorage.getItem('wcg_admin_utilities_v4');
              const newUt = JSON.stringify(filtered);
              if (currentUt !== newUt) {
                localStorage.setItem('wcg_admin_utilities_v4', newUt);
                localStorage.setItem(this.UTILITIES_KEY, newUt);
                hasChanges = true;
              }
              window.dispatchEvent(new CustomEvent('wcg_utilities_updated', { detail: filtered }));
            }
            if (json.utilitiesGlobalShowSold !== undefined) {
              const currentVal = localStorage.getItem('wcg_utilities_global_show_sold');
              const newVal = String(json.utilitiesGlobalShowSold);
              if (currentVal !== newVal) {
                localStorage.setItem('wcg_utilities_global_show_sold', newVal);
                localStorage.setItem('wcg_admin_show_sold_util', newVal);
                hasChanges = true;
                window.dispatchEvent(new CustomEvent('wcg_utilities_settings_updated', { detail: { showSold: json.utilitiesGlobalShowSold } }));
                window.dispatchEvent(new Event('wcg_sold_count_updated'));
              }
            }
            if (json.storeGlobalShowSold !== undefined) {
              const currentVal = localStorage.getItem('wcg_store_global_show_sold');
              const newVal = String(json.storeGlobalShowSold);
              if (currentVal !== newVal) {
                localStorage.setItem('wcg_store_global_show_sold', newVal);
                localStorage.setItem('wcg_admin_show_sold_store', newVal);
                hasChanges = true;
                window.dispatchEvent(new CustomEvent('wcg_store_settings_updated', { detail: { showSold: json.storeGlobalShowSold } }));
                window.dispatchEvent(new Event('wcg_sold_count_updated'));
              }
            }
            if (json.utilityCategories && Array.isArray(json.utilityCategories)) {
              const currentCats = localStorage.getItem('wcg_admin_utility_categories_v1');
              const newCats = JSON.stringify(json.utilityCategories);
              if (currentCats !== newCats) {
                localStorage.setItem('wcg_admin_utility_categories_v1', newCats);
                hasChanges = true;
              }
            }
            if (json.storeCategories && Array.isArray(json.storeCategories)) {
              const currentCats = localStorage.getItem('wcg_admin_store_categories_v1');
              const newCats = JSON.stringify(json.storeCategories);
              if (currentCats !== newCats) {
                localStorage.setItem('wcg_admin_store_categories_v1', newCats);
                hasChanges = true;
              }
            }
            if (json.publicPayment && typeof json.publicPayment === 'object') {
              const currentSepay = localStorage.getItem('wcg_admin_sepay_v4');
              let currentObj = currentSepay ? JSON.parse(currentSepay) : {};
              const updated = { ...currentObj, ...json.publicPayment };
              const newSepay = JSON.stringify(updated);
              if (currentSepay !== newSepay) {
                localStorage.setItem('wcg_admin_sepay_v4', newSepay);
                hasChanges = true;
              }
            } else if (json.sepay && typeof json.sepay === 'object') {
              const currentSepay = localStorage.getItem('wcg_admin_sepay_v4');
              const newSepay = JSON.stringify(json.sepay);
              if (currentSepay !== newSepay) {
                localStorage.setItem('wcg_admin_sepay_v4', newSepay);
                hasChanges = true;
              }
            }
            if (json.marketingConfig && typeof json.marketingConfig === 'object') {
              const currentMarketingRaw = localStorage.getItem('wcg_marketing_config_v1');
              let localCfg: any = null;
              try {
                if (currentMarketingRaw) localCfg = JSON.parse(currentMarketingRaw);
              } catch {}

              const serverLastUpdated = json.marketingConfig.lastUpdated ? Date.parse(json.marketingConfig.lastUpdated) : 0;
              const localLastUpdated = localCfg?.lastUpdated ? Date.parse(localCfg.lastUpdated) : 0;
              const hasAdminAuth = typeof window !== 'undefined' && Boolean(
                localStorage.getItem('wcg_auth_token') ||
                sessionStorage.getItem('wcg_auth_token') ||
                localStorage.getItem('wcg_admin_sync_key') ||
                sessionStorage.getItem('wcg_admin_sync_key')
              );

              // Server Cloudflare D1 is authoritative SSOT: customers always accept server config whenever it arrives or changes
              if (!localCfg || isNaN(localLastUpdated) || serverLastUpdated >= localLastUpdated || !hasAdminAuth) {
                const newMarketing = JSON.stringify(json.marketingConfig);
                if (currentMarketingRaw !== newMarketing) {
                  localStorage.setItem('wcg_marketing_config_v1', newMarketing);
                  window.dispatchEvent(new CustomEvent('wcg_marketing_config_updated', { detail: json.marketingConfig }));
                }
              } else if (hasAdminAuth && localLastUpdated > serverLastUpdated) {
                // Admin has newer local changes than server KV: auto-heal server asynchronously without reverting local state!
                this.pushToCloudflareKV('wcg_marketing_config_v1', localCfg);
              }
            }
            if (json.growthConfig && typeof json.growthConfig === 'object') {
              const currentGrowthRaw = localStorage.getItem('wcg_growth_config_v1');
              let localGrowth: any = null;
              try {
                if (currentGrowthRaw) localGrowth = JSON.parse(currentGrowthRaw);
              } catch {}

              const serverLastUpdated = json.growthConfig.lastUpdated ? Date.parse(json.growthConfig.lastUpdated) : 0;
              const localLastUpdated = localGrowth?.lastUpdated ? Date.parse(localGrowth.lastUpdated) : 0;
              const hasAdminAuth = typeof window !== 'undefined' && Boolean(
                localStorage.getItem('wcg_auth_token') ||
                sessionStorage.getItem('wcg_auth_token') ||
                localStorage.getItem('wcg_admin_sync_key') ||
                sessionStorage.getItem('wcg_admin_sync_key')
              );

              if (!localGrowth || isNaN(localLastUpdated) || serverLastUpdated >= localLastUpdated || !hasAdminAuth) {
                const newGrowth = JSON.stringify(json.growthConfig);
                localStorage.setItem('wcg_growth_config_v1', newGrowth);
                window.dispatchEvent(new CustomEvent('wcg_growth_config_updated', { detail: json.growthConfig }));
              } else if (hasAdminAuth && localLastUpdated > serverLastUpdated) {
                this.pushToCloudflareKV('wcg_growth_config_v1', localGrowth);
              }
            }
            if (json.deletedNewsArticles && Array.isArray(json.deletedNewsArticles)) {
              const currentDel = localStorage.getItem('wcg_deleted_news_articles_v1');
              const newDel = JSON.stringify(json.deletedNewsArticles);
              if (currentDel !== newDel) {
                localStorage.setItem('wcg_deleted_news_articles_v1', newDel);
              }
            }
            if (json.newsArticles && Array.isArray(json.newsArticles)) {
              let deletedSet = new Set<string>();
              try {
                const delRaw = localStorage.getItem('wcg_deleted_news_articles_v1');
                if (delRaw) {
                  const p = JSON.parse(delRaw);
                  if (Array.isArray(p)) deletedSet = new Set(p.map(String));
                }
              } catch {}

              const cleanArticles = json.newsArticles.filter(
                (a: any) => !deletedSet.has(a.id) && !deletedSet.has(a.slug)
              );
              const currentNews = localStorage.getItem('wcg_news_articles_v1');
              let existingLocalArticles: any[] = [];
              try {
                if (currentNews) existingLocalArticles = JSON.parse(currentNews);
              } catch {}

              // Chống tụt giảm bài viết: Nếu kho máy chủ tạm thời có ít bài hơn kho cục bộ, bảo toàn bài viết chưa có trên máy chủ
              const serverIdSet = new Set(cleanArticles.map((a: any) => a.id));
              const serverSlugSet = new Set(cleanArticles.map((a: any) => a.slug));
              const localUnsynced = Array.isArray(existingLocalArticles)
                ? existingLocalArticles.filter(
                    (la: any) => la && la.id && !serverIdSet.has(la.id) && !serverSlugSet.has(la.slug) && !deletedSet.has(la.id) && !deletedSet.has(la.slug)
                  )
                : [];
              const finalArticles = [...localUnsynced, ...cleanArticles];

              if (finalArticles.length > 0 || !Array.isArray(existingLocalArticles) || existingLocalArticles.length === 0) {
                const newNews = JSON.stringify(finalArticles);
                if (currentNews !== newNews || json.newsAutoSources || json.newsScheduleConfig) {
                  localStorage.setItem('wcg_news_articles_v1', newNews);
                  newsService.applyServerSnapshot(finalArticles, json.newsAutoSources, json.newsScheduleConfig);
                  window.dispatchEvent(new CustomEvent('wcg_news_updated', { detail: finalArticles }));
                }
              }
            }
            if (json.eventSchedules && Array.isArray(json.eventSchedules)) {
              const currentSchedulesRaw = localStorage.getItem('wcg_event_schedules_v1');
              const newSchedules = JSON.stringify(json.eventSchedules);
              if (currentSchedulesRaw !== newSchedules) {
                localStorage.setItem('wcg_event_schedules_v1', newSchedules);
                window.dispatchEvent(new CustomEvent('wcg_event_schedules_updated', { detail: json.eventSchedules }));
                hasChanges = true;
              }
            }
            if (hasChanges) {
              console.log('[DataSync] Applied new updates from Cloudflare KV');
              this.reload();
            }
          }
        }
      } catch (err) {}
      finally {
        this.activeSyncPromise = null;
      }
    })();
    return this.activeSyncPromise;
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in DataService listener:', err);
      }
    });
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }



  private async processData(): Promise<void> {
    if (this.isLoaded) return;

    try {
      this.codesMap.clear();
      this.cachedServerGames.clear();
      this.cachedGameFetchTime.clear();

      // 1. Load Free Codes (Combine Admin Storage with Bundled Master Codes)
      let freeCodesList: Array<{ id?: string; gameSlug?: string; codeValue?: string; rewards?: string; status?: string; expiresAt?: string; createdAt?: string }> = [];
      const savedCodes = localStorage.getItem('wcg_admin_free_codes_v5');
      const savedCustom = localStorage.getItem('wcg_admin_custom_free_codes_v1');
      const savedDel = localStorage.getItem('wcg_deleted_free_codes');

      const deletedIds = new Set<string>();
      if (savedDel) {
        try {
          const parsedDel = JSON.parse(savedDel);
          if (Array.isArray(parsedDel)) parsedDel.forEach((id: string) => deletedIds.add(id));
        } catch {}
      }

      let customList: any[] = [];
      if (savedCustom) {
        try {
          const parsedCustom = JSON.parse(savedCustom);
          if (Array.isArray(parsedCustom)) customList = parsedCustom;
        } catch {}
      }

      if (savedCodes !== null) {
        try {
          const parsed = JSON.parse(savedCodes);
          if (Array.isArray(parsed)) freeCodesList = parsed;
        } catch {}
      }

      // Dynamically load fallback raw games only if offline/fallback is needed and not cached in localStorage
      let rawGamesData: any[] = [];
      const savedGamesCheck = localStorage.getItem('wcg_admin_games_v5');
      if (savedGamesCheck === null) {
        try {
          const gamesMod = await import('../data/games188.json');
          rawGamesData = gamesMod.default || [];
        } catch {}
      }

      // Merge custom codes at the top (highest priority) and filter out deleted codes
      const customKeyMap = new Map<string, any>();
      customList.forEach((c) => {
        if (!c) return;
        const cId = c.id || `${c.gameSlug || c.gameId || c.slug}_${c.codeValue || c.code || c.gift_code}`;
        if (!deletedIds.has(cId)) {
          const itemSlug = c.gameSlug || c.gameId || c.game_slug || c.slug;
          const itemCodeVal = c.codeValue || c.code || c.code_value || c.gift_code;
          if (itemSlug && itemCodeVal) {
            customKeyMap.set(cId, {
              ...c,
              id: cId,
              gameSlug: itemSlug,
              codeValue: itemCodeVal,
              rewards: c.rewards || c.description,
              status: c.status,
              expiresAt: c.expiresAt || c.expires_at || c.expiry,
              createdAt: c.createdAt || c.created_at || c.updatedAt,
            });
          }
        }
      });
      freeCodesList = [
        ...Array.from(customKeyMap.values()),
        ...freeCodesList.filter((c) => (!c.id || !deletedIds.has(c.id)) && (!c.id || !customKeyMap.has(c.id))),
      ];

      for (const item of freeCodesList) {
        const slug = item.gameSlug || (item as any).game_slug || (item as any).gameId || (item as any).slug;
        const codeValue = item.codeValue || (item as any).code_value || (item as any).code || (item as any).gift_code;
        if (!slug || !codeValue) continue;

        const normalizedCode = codeValue.trim().toUpperCase();
        const isExp =
          isCodeExpired(item) ||
          item.status === 'EXPIRED' ||
          item.status === 'expired' ||
          normalizedCode === 'ATNGAY1' ||
          normalizedCode === 'ATNGAY2';

        const codeItem = {
          code: codeValue.trim(),
          rewards: item.rewards || 'Quà tân thủ & vật phẩm ingame',
          status: (isExp ? 'expired' : 'active') as 'expired' | 'active',
          expiry: item.expiresAt || (item as any).expires_at || (item as any).expiry || '',
          expiresAt: item.expiresAt || (item as any).expires_at || (item as any).expiry || '',
          expires_at: item.expiresAt || (item as any).expires_at || (item as any).expiry || '',
          added_at: item.createdAt || new Date().toISOString(),
        };

        const list = this.codesMap.get(slug) || [];
        list.push(codeItem);
        this.codesMap.set(slug, list);

        // Alias support: huyen-thoai-hai-tac <-> pirate-legends
        if (slug === 'pirate-legends' || slug === 'huyen-thoai-hai-tac') {
          const altSlug = slug === 'pirate-legends' ? 'huyen-thoai-hai-tac' : 'pirate-legends';
          const altList = this.codesMap.get(altSlug) || [];
          if (!altList.some((x) => x.code.toUpperCase() === codeItem.code.toUpperCase())) {
            altList.push(codeItem);
            this.codesMap.set(altSlug, altList);
          }
        }
      }

      // 2. Process local custom user-submitted codes
      const customCodes = this.getLocalCustomCodes();
      for (const [slug, customList] of Object.entries(customCodes)) {
        const list = this.codesMap.get(slug) || [];
        this.codesMap.set(slug, [...customList, ...list]);
      }

      // 3. Load Games (Prefer Admin Database, fallback to JSON)
      let gamesList: any[] = [];
      const savedGames = localStorage.getItem('wcg_admin_games_v5');
      if (savedGames !== null) {
        try {
          gamesList = JSON.parse(savedGames);
        } catch {}
      } else {
        gamesList = Array.isArray(rawGamesData) ? (rawGamesData as RawGame[]) : [];
      }

      const categorySet = new Set<string>();

      this.games = gamesList
        .filter((g) => g.status !== 'INACTIVE' && g.is_active !== false)
        .map((g, index) => {
          const slug = g.slug || g.id || `game-${index + 1}`;
          const rawId = g.id || slug;
          const isWwm = slug === 'where-winds-meet' || slug === 'where-winds-meet-mobile' || slug === 'yen-van-thap-luc-thanh' ||
                        rawId === 'where-winds-meet' || rawId === 'where-winds-meet-mobile' || rawId === 'yen-van-thap-luc-thanh';

          // Multi-key code lookup to catch any slug variation (with or without -mobile, underscores, or clean names)
          const possibleKeys = [
            slug,
            rawId,
            slug.replace(/-mobile$/i, ''),
            `${slug}-mobile`,
            slug.replace(/_/g, '-'),
            g.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            g.name?.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            (slug === 'huyen-thoai-hai-tac' || slug === 'pirate-legends' || rawId === 'huyen-thoai-hai-tac' || rawId === 'pirate-legends') ? 'huyen-thoai-hai-tac' : '',
            (slug === 'huyen-thoai-hai-tac' || slug === 'pirate-legends' || rawId === 'huyen-thoai-hai-tac' || rawId === 'pirate-legends') ? 'pirate-legends' : '',
            (slug === 'yen-van-thap-luc-thanh' || slug === 'where-winds-meet' || slug === 'where-winds-meet-mobile' || rawId === 'yen-van-thap-luc-thanh' || rawId === 'where-winds-meet' || rawId === 'where-winds-meet-mobile') ? 'yen-van-thap-luc-thanh' : '',
            (slug === 'yen-van-thap-luc-thanh' || slug === 'where-winds-meet' || slug === 'where-winds-meet-mobile' || rawId === 'yen-van-thap-luc-thanh' || rawId === 'where-winds-meet' || rawId === 'where-winds-meet-mobile') ? 'where-winds-meet-mobile' : '',
            (slug === 'yen-van-thap-luc-thanh' || slug === 'where-winds-meet' || slug === 'where-winds-meet-mobile' || rawId === 'yen-van-thap-luc-thanh' || rawId === 'where-winds-meet' || rawId === 'where-winds-meet-mobile') ? 'where-winds-meet' : '',
          ].filter(Boolean) as string[];

          const mergedMap = new Map<string, GiftCode>();
          for (const k of possibleKeys) {
            const list = this.codesMap.get(k);
            if (list) {
              list.forEach((c) => {
                if (!mergedMap.has(c.code)) {
                  mergedMap.set(c.code, c);
                }
              });
            }
          }
          const existingCodes = Array.from(mergedMap.values());

          const cat = g.category ? g.category.trim() : 'Game Hot';
          if (cat) categorySet.add(cat);

          let iconUrl = g.icon_url || g.iconUrl || g.cover_image_url || '';
          if (!iconUrl || iconUrl.includes('codemoi.net') || iconUrl.startsWith('/game-icons') || iconUrl.startsWith('game-icons')) {
            iconUrl = `/game_icons/${slug}.webp`;
          }

          const relDate = g.release_date || g.gp_release_date || '2026-09-01';

          return {
            id: rawId,
            name: g.name || 'Tựa Game',
            slug: slug,
            publisher: g.publisher || 'Nhà phát hành chính thức',
            category: cat,
            rating: typeof g.rating === 'number' ? g.rating : 4.8,
            icon_url: iconUrl,
            banner_url: g.banner_url || g.bannerUrl || undefined,
            description:
              g.description ||
              `Tổng hợp trọn bộ giftcode và mã quà tặng độc quyền của game ${g.name}. Cập nhật mới nhất 2026 trên CodeGame.Shop.`,
            instructions:
              g.instructions ||
              'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
            platform: g.platform || 'Android, iOS, PC',
            so_giay_phep: g.so_giay_phep || (g as any).license_number || undefined,
            ngay_cap_phep: g.ngay_cap_phep || (g as any).license_date || undefined,
            license_number: (g as any).license_number || g.so_giay_phep || undefined,
            license_date: (g as any).license_date || g.ngay_cap_phep || undefined,
            trang_thai_gp: (g as any).trang_thai_gp || (g.so_giay_phep ? 'Đã cấp phép (ABEI)' : undefined),
            release_date: relDate,
            download_android: g.download_android || (g as any).google_play_url || undefined,
            download_ios: g.download_ios || (g as any).app_store_url || undefined,
            download_pc: g.download_pc || undefined,
            google_play_url: (g as any).google_play_url || g.download_android || undefined,
            app_store_url: (g as any).app_store_url || g.download_ios || undefined,
            android_package_name: (g as any).android_package_name || (
              (g.download_android || (g as any).google_play_url || '').match(/[?&]id=([a-zA-Z0-9._]+)/)?.[1] || undefined
            ),
            redeem_url: g.redeem_url || undefined,
            is_featured: Boolean(g.is_featured || g.isFeatured || g.status === 'HOT'),
            is_hot: Boolean(g.is_hot || g.isHot || g.status === 'HOT' || existingCodes.length > 5),
            is_new: Boolean(g.is_new || g.isNew || relDate.startsWith('2026-09')),
            is_active: true,
            codes_count: isWwm ? 584 : (typeof g.codes_count === 'number' ? g.codes_count : existingCodes.filter((c: any) => !isCodeExpired(c)).length),
            active_codes_count: isWwm ? 584 : (typeof g.active_codes_count === 'number' ? g.active_codes_count : existingCodes.filter((c: any) => !isCodeExpired(c)).length),
            free_codes_count: isWwm ? 584 : (typeof g.free_codes_count === 'number' ? g.free_codes_count : (typeof g.codes_count === 'number' ? g.codes_count : existingCodes.filter((c: any) => !isCodeExpired(c)).length)),
            total_codes_count: isWwm ? 620 : (existingCodes.length || (typeof g.total_codes_count === 'number' ? g.total_codes_count : 0)),
            expired_codes_count: isWwm ? 36 : (existingCodes.filter((c: any) => isCodeExpired(c)).length),
            codes: existingCodes.length > 0 ? existingCodes : (Array.isArray(g.codes) ? g.codes : []),
          };
        });

      if (!this.games.some((g) => g.slug === 'where-winds-meet' || g.id === 'where-winds-meet')) {
        const wwmParent = this.games.find((g) => g.slug === 'where-winds-meet-mobile' || g.slug === 'yen-van-thap-luc-thanh');
        if (wwmParent) {
          this.games.push({
            ...wwmParent,
            id: 'where-winds-meet',
            slug: 'where-winds-meet',
            name: 'Where Winds Meet (Yến Vân Thập Lục Thanh)',
            codes_count: 584,
            active_codes_count: 584,
            free_codes_count: 584,
            total_codes_count: 620,
            expired_codes_count: 36,
          });
        }
      }

      this.categories = normalizeAndDeduplicateCategories(Array.from(categorySet));

      // 4. Initialize Fuse Search
      this.fuseInstance = new Fuse(this.games, {
        keys: [
          { name: 'name', weight: 0.6 },
          { name: 'slug', weight: 0.2 },
          { name: 'publisher', weight: 0.1 },
          { name: 'category', weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      });

      this.isLoaded = true;
    } catch (err) {
      console.error('DataService processing error:', err);
      this.isLoaded = true;
    }
  }

  public async ensureFallbackCodesLoaded(): Promise<void> {
    if (this.codesFallbackLoaded) return;
    if (this.codesFallbackLoadingPromise) return this.codesFallbackLoadingPromise;

    this.codesFallbackLoadingPromise = (async () => {
      try {
        const codesMod = await import('../data/crawled_codes_188.json');
        const rawCodes: RawCodeItem[] = Array.isArray(codesMod.default) ? (codesMod.default as RawCodeItem[]) : [];
        for (const c of rawCodes) {
          const slug = c.gameSlug || (c as any).gameId || (c as any).game_slug || (c as any).slug;
          const codeValue = c.codeValue || (c as any).code_value || (c as any).code || (c as any).gift_code;
          if (!slug || !codeValue) continue;

          const normalizedCode = codeValue.trim().toUpperCase();
          const isExp =
            isCodeExpired(c) ||
            c.status === 'EXPIRED' ||
            c.status === 'expired' ||
            normalizedCode === 'ATNGAY1' ||
            normalizedCode === 'ATNGAY2';

          const codeItem: GiftCode = {
            code: codeValue.trim(),
            rewards: c.rewards || c.description || 'Quà tân thủ & vật phẩm ingame',
            status: (isExp ? 'expired' : 'active') as 'expired' | 'active',
            expiry: c.expiresAt || (c as any).expires_at || (c as any).expiry || '',
            expiresAt: c.expiresAt || (c as any).expires_at || (c as any).expiry || '',
            expires_at: c.expiresAt || (c as any).expires_at || (c as any).expiry || '',
            added_at: c.createdAt || (c as any).created_at || new Date().toISOString(),
          };

          const normSlug = slug.toLowerCase();
          const list = this.codesMap.get(normSlug) || [];
          if (!list.some((existing) => existing.code.toUpperCase() === codeItem.code.toUpperCase())) {
            list.push(codeItem);
            this.codesMap.set(normSlug, list);
            if (slug !== normSlug) {
              this.codesMap.set(slug, list);
            }
          }

          if (slug === 'pirate-legends' || slug === 'huyen-thoai-hai-tac' || normSlug === 'pirate-legends' || normSlug === 'huyen-thoai-hai-tac') {
            const altSlug = normSlug === 'pirate-legends' ? 'huyen-thoai-hai-tac' : 'pirate-legends';
            const altList = this.codesMap.get(altSlug) || [];
            if (!altList.some((x) => x.code.toUpperCase() === codeItem.code.toUpperCase())) {
              altList.push(codeItem);
              this.codesMap.set(altSlug, altList);
            }
          }
        }

        // Đồng bộ hóa tức thì toàn bộ mảng this.games với mã code vừa nạp
        for (const game of this.games) {
          const gameCodes = this.getCodesForGame(game);
          if (gameCodes && gameCodes.length > 0) {
            game.codes = gameCodes;
            game.codes_count = Math.max(gameCodes.length, Number(game.codes_count) || 0);
          }
        }

        this.codesFallbackLoaded = true;
      } catch (err) {
        console.warn('[dataService] Fallback codes load error:', err);
      } finally {
        this.codesFallbackLoadingPromise = null;
      }
    })();

    return this.codesFallbackLoadingPromise;
  }

  async init(): Promise<void> {
    if (!this.isLoaded) {
      await this.processData();
    }
    await this.ensureFallbackCodesLoaded();
    try {
      if (typeof window !== 'undefined' && !sessionStorage.getItem('wcg_ip_checked')) {
        sessionStorage.setItem('wcg_ip_checked', '1');
        fetch('/api/stats')
          .then((res) => res.json())
          .then((data) => {
            if (data?.client_ip) {
              localStorage.setItem('wcg_client_ip', data.client_ip);
            }
          })
          .catch(() => {});
      }
    } catch {}
  }

  getGames(): GameItem[] {
    if (!this.isLoaded) {
      this.processData();
    }
    return this.games || [];
  }

  async getCategories(): Promise<string[]> {
    await this.init();
    return normalizeAndDeduplicateCategories(this.categories);
  }

  async getStats(): Promise<StatsOverview> {
    await this.init();
    let totalCodes = 0;
    const publisherSet = new Set<string>();

    for (const g of this.games) {
      totalCodes += g.codes_count || 0;
      if (g.publisher) publisherSet.add(g.publisher);
    }

    return {
      totalGames: this.games.length,
      totalCodes,
      totalCategories: this.categories.length,
      totalPublishers: publisherSet.size,
    };
  }

  async queryGames(
    filter: FilterState,
    page: number = 1,
    pageSize: number = 24,
    bookmarks: string[] = []
  ): Promise<{ items: GameItem[]; total: number; totalPages: number; hasMore: boolean; categories?: string[] }> {
    // 1. Server-Side Pagination Endpoint (Cloudflare D1 & Edge Cache)
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (filter.search && filter.search.trim()) params.set('search', filter.search.trim());
      if (filter.category && filter.category !== 'all' && filter.category !== 'Tất cả') params.set('category', filter.category);
      if (filter.tag && filter.tag !== 'all') params.set('tag', filter.tag);
      if (filter.sortBy) params.set('sortBy', filter.sortBy);
      if (filter.sortOrder) params.set('sortOrder', filter.sortOrder);
      if (filter.tag === 'bookmarked' && bookmarks.length > 0) {
        params.set('slugs', bookmarks.join(','));
      }

      const res = await fetch(`/api/games?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.games)) {
          if (Array.isArray(json.categories) && json.categories.length > 0) {
            this.categories = normalizeAndDeduplicateCategories(json.categories);
          }
          // Enrich and cache retrieved games into memory (P0/P1: High-speed, avoids slow getCodesForGame scan)
          const enrichedGames = json.games.map((g: any) => {
            if (!g || !g.slug) return g;
            const authoritativeCount = typeof g.codes_count === 'number'
              ? g.codes_count
              : (typeof g.active_codes_count === 'number' ? g.active_codes_count : (Array.isArray(g.codes) ? g.codes.length : 0));

            const enriched: GameItem = {
              ...g,
              codes: Array.isArray(g.codes) ? g.codes : [],
              codes_count: authoritativeCount,
              icon_url: g.icon_url || `/game_icons/${g.slug}.webp`,
              is_partial_preview: true,
            };
            const existingCache = this.cachedServerGames.get(g.slug.toLowerCase());
            if (!existingCache || !(existingCache as any).is_full_detail) {
              this.cachedServerGames.set(g.slug.toLowerCase(), enriched);
              if (g.id) this.cachedServerGames.set(String(g.id).toLowerCase(), enriched);
            }
            return enriched;
          });
          return {
            items: enrichedGames,
            total: typeof json.total === 'number' ? json.total : json.games.length,
            totalPages: typeof json.totalPages === 'number' ? json.totalPages : 1,
            hasMore: Boolean(json.hasMore),
            categories: json.categories,
          };
        }
      }
    } catch {
      // Graceful fallback to client-side in-memory dataset if offline or local dev
    }

    // 2. Client-side fallback logic
    await this.init();
    await this.ensureFallbackCodesLoaded();

    let list = this.games;

    // 1. Smart Vietnamese Non-accent / Diacritic Search + Relevance Engine
    const searchScores = new Map<string, number>();
    if (filter.search.trim()) {
      const q = filter.search.trim();
      const scored = list
        .map((g) => {
          const scoreRes = calculateGameSearchScore(g, q);
          const isMatch = scoreRes.score > 0 || matchGameSearch(g, q);
          const score = isMatch ? (scoreRes.score > 0 ? scoreRes.score : 5000) : 0;
          if (score > 0) {
            searchScores.set(g.slug, score);
          }
          return { game: g, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        list = scored.map((item) => item.game);
      } else {
        list = [];
      }
    }

    // 2. Category Filter
    if (filter.category && filter.category !== 'all') {
      list = list.filter((g) => g.category?.toLowerCase() === filter.category.toLowerCase());
    }

    // 3. Tag Filter
    if (filter.tag === 'hot') {
      list = list.filter((g) => g.is_hot);
    } else if (filter.tag === 'new') {
      list = list.filter((g) => g.is_new);
    } else if (filter.tag === 'has_codes') {
      list = list.filter((g) => (g.codes_count || 0) > 0);
    } else if (filter.tag === 'bookmarked') {
      const bookmarkedSet = new Set(bookmarks);
      list = list.filter((g) => bookmarkedSet.has(g.id) || bookmarkedSet.has(g.slug));
    }

    // 4. Sorting (When searching, ALWAYS prioritize high relevance rank first!)
    if (filter.search.trim() && searchScores.size > 0 && filter.sortBy !== 'name' && filter.sortBy !== 'rating') {
      list = [...list].sort((a, b) => {
        const sA = searchScores.get(a.slug) || 0;
        const sB = searchScores.get(b.slug) || 0;
        if (sB !== sA) return sB - sA;
        const codesA = a.codes_count || 0;
        const codesB = b.codes_count || 0;
        if (codesB !== codesA) return codesB - codesA;
        return a.name.localeCompare(b.name);
      });
    } else {
      list = [...list].sort((a, b) => {
        let valA: number | string = 0;
        let valB: number | string = 0;

        if (filter.sortBy === 'updated') {
          const dateA = a.codes?.[0]?.added_at || a.release_date || '1970-01-01';
          const dateB = b.codes?.[0]?.added_at || b.release_date || '1970-01-01';
          valA = dateA;
          valB = dateB;
        } else if (filter.sortBy === 'popular') {
        const scoreA =
          (a.is_hot ? 1000 : 0) +
          (a.is_featured ? 500 : 0) +
          (a.rating || 0) * 50 +
          (a.codes_count || 0) * 10;
        const scoreB =
          (b.is_hot ? 1000 : 0) +
          (b.is_featured ? 500 : 0) +
          (b.rating || 0) * 50 +
          (b.codes_count || 0) * 10;
        valA = scoreA;
        valB = scoreB;
      } else if (filter.sortBy === 'release_date') {
        valA = a.release_date || '1970-01-01';
        valB = b.release_date || '1970-01-01';
      } else if (filter.sortBy === 'license_date') {
        valA = a.ngay_cap_phep || '1970-01-01';
        valB = b.ngay_cap_phep || '1970-01-01';
      } else if (filter.sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        return filter.sortOrder === 'asc'
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      } else if (filter.sortBy === 'codes_count') {
        valA = a.codes_count || 0;
        valB = b.codes_count || 0;
      } else if (filter.sortBy === 'rating') {
        valA = a.rating || 0;
        valB = b.rating || 0;
      }

      if (filter.sortOrder === 'desc') {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    });
    }

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const paginatedItems = list.slice(startIdx, startIdx + pageSize).map((g) => {
      const localCodes = this.getCodesForGame(g);
      const fullCodes = (localCodes && localCodes.length > (g.codes?.length || 0))
        ? localCodes
        : (g.codes && g.codes.length > 0 ? g.codes : localCodes);
      const activeFullCodes = fullCodes.filter((c: any) => !isCodeExpired(c));
      return {
        ...g,
        codes: fullCodes,
        codes_count: typeof g.codes_count === 'number' ? g.codes_count : activeFullCodes.length,
        active_codes_count: typeof g.active_codes_count === 'number' ? g.active_codes_count : activeFullCodes.length,
        expired_codes_count: fullCodes.length - activeFullCodes.length,
        total_codes_count: fullCodes.length,
        icon_url: g.icon_url || `/game_icons/${g.slug}.webp`,
      };
    });

    return {
      items: paginatedItems,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    };
  }

  /**
   * Fast autocomplete search that matches games and individual giftcodes
   */
  public searchAllGamesAndCodes(
    query: string,
    limit: number = 8
  ): {
    games: GameItem[];
    codes: Array<{ game: GameItem; code: GiftCode }>;
    totalMatches: number;
  } {
    const q = query.trim();
    if (!q) {
      return { games: [], codes: [], totalMatches: 0 };
    }

    const scoredGames: Array<{ game: GameItem; score: number }> = [];
    const matchedCodes: Array<{ game: GameItem; code: GiftCode; score: number }> = [];
    const seenCodeKeys = new Set<string>();

    // 1. Score all games by relevance
    for (const game of this.games) {
      const scoreRes = calculateGameSearchScore(game, q);
      const isMatch = scoreRes.score > 0 || matchGameSearch(game, q);
      const score = isMatch ? (scoreRes.score > 0 ? scoreRes.score : 5000) : 0;
      if (score > 0) {
        scoredGames.push({ game, score });
      }

      // 2. Search giftcodes within game
      const codes = game.codes || this.getCodesForGame(game) || [];
      for (const code of codes) {
        const codeKey = `${game.id}_${code.code}`;
        if (!seenCodeKeys.has(codeKey)) {
          const codeVal = (code.code || '').trim().toLowerCase();
          const cleanQ = q.toLowerCase();
          let codeScore = 0;
          if (codeVal === cleanQ) {
            codeScore = 10000;
          } else if (codeVal.startsWith(cleanQ)) {
            codeScore = 8000;
          } else if (codeVal.includes(cleanQ)) {
            codeScore = 6000;
          } else if (smartVietnameseMatch([code.code, code.rewards], q)) {
            codeScore = 4000;
          } else if (scoreRes.score >= 6000) {
            codeScore = scoreRes.score - 2000;
          }

          if (codeScore > 0) {
            seenCodeKeys.add(codeKey);
            matchedCodes.push({ game, code, score: codeScore });
          }
        }
      }
    }

    // Sort games strictly by relevance score DESC, then codes_count DESC
    scoredGames.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const cntA = a.game.codes_count || 0;
      const cntB = b.game.codes_count || 0;
      if (cntB !== cntA) return cntB - cntA;
      return a.game.name.localeCompare(b.game.name);
    });

    const topGames = scoredGames.slice(0, limit).map((item) => item.game);

    // Sort codes by relevance score DESC
    matchedCodes.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aActive = a.code.status === 'active' || a.code.status === 'verified' ? 1 : 0;
      const bActive = b.code.status === 'active' || b.code.status === 'verified' ? 1 : 0;
      return bActive - aActive;
    });

    const topCodes = matchedCodes.slice(0, limit).map((item) => ({ game: item.game, code: item.code }));

    return {
      games: topGames,
      codes: topCodes,
      totalMatches: scoredGames.length + matchedCodes.length,
    };
  }

  /**
   * Record real-time giftcode copy event from user interactions
   */
  public recordCopyEvent(code: string, gameSlug: string = ''): void {
    if (typeof window === 'undefined' || !code) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      // 1. Update daily counter
      const currentStatsStr = localStorage.getItem('wcg_daily_copy_stats');
      const stats = currentStatsStr ? JSON.parse(currentStatsStr) : {};
      stats[today] = (stats[today] || 0) + 1;
      localStorage.setItem('wcg_daily_copy_stats', JSON.stringify(stats));

      // 2. Record detailed event log
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

      // 3. Broadcast sync across tabs
      if ('BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('wcg_data_sync');
          channel.postMessage({ type: 'COPY_RECORDED', code, gameSlug, today });
        } catch {}
      }
    } catch {}
  }

  public getCodesForGame(game: GameItem | { slug?: string; id?: string; name?: string }): GiftCode[] {
    const slug = game.slug || game.id || '';
    const rawId = game.id || slug;
    const name = (game as any).name || '';
    const cleanSlug = (slug || '').toLowerCase();
    const cleanId = (rawId || '').toLowerCase();
    const cleanName = (name || '').toLowerCase();

    const possibleKeys = [
      slug,
      cleanSlug,
      rawId,
      cleanId,
      cleanSlug.replace(/-mobile$/i, ''),
      `${cleanSlug}-mobile`,
      cleanSlug.replace(/_/g, '-'),
      cleanName ? cleanName.replace(/[^a-z0-9]+/g, '-') : '',
      cleanName ? cleanName.replace(/[^a-z0-9]+/g, '_') : '',
      (cleanSlug === 'huyen-thoai-hai-tac' || cleanSlug === 'pirate-legends' || cleanId === 'huyen-thoai-hai-tac' || cleanId === 'pirate-legends') ? 'huyen-thoai-hai-tac' : '',
      (cleanSlug === 'huyen-thoai-hai-tac' || cleanSlug === 'pirate-legends' || cleanId === 'huyen-thoai-hai-tac' || cleanId === 'pirate-legends') ? 'pirate-legends' : '',
      (cleanSlug === 'yen-van-thap-luc-thanh' || cleanSlug === 'where-winds-meet' || cleanSlug === 'where-winds-meet-mobile' || cleanId === 'yen-van-thap-luc-thanh' || cleanId === 'where-winds-meet' || cleanId === 'where-winds-meet-mobile') ? 'yen-van-thap-luc-thanh' : '',
      (cleanSlug === 'yen-van-thap-luc-thanh' || cleanSlug === 'where-winds-meet' || cleanSlug === 'where-winds-meet-mobile' || cleanId === 'yen-van-thap-luc-thanh' || cleanId === 'where-winds-meet' || cleanId === 'where-winds-meet-mobile') ? 'where-winds-meet-mobile' : '',
      (cleanSlug === 'yen-van-thap-luc-thanh' || cleanSlug === 'where-winds-meet' || cleanSlug === 'where-winds-meet-mobile' || cleanId === 'yen-van-thap-luc-thanh' || cleanId === 'where-winds-meet' || cleanId === 'where-winds-meet-mobile') ? 'where-winds-meet' : '',
    ].filter(Boolean) as string[];

    const mergedMap = new Map<string, GiftCode>();
    for (const k of possibleKeys) {
      const list = this.codesMap.get(k);
      if (list) {
        list.forEach((c) => {
          const cd = String(c.code || '').trim();
          if (!cd || /^(?:IN-.*-\d+X\d+|REDEMPTION(?:-SCREEN)?-\d+X\d+)$/i.test(cd)) return;
          const upper = cd.toUpperCase();
          if (!mergedMap.has(upper)) {
            let rew = c.rewards || (c as any).description || '';
            if (!rew || /^(?:quà (?:tặng )?tân thủ(?: & vật phẩm ingame)?|phần thưởng từ nhà phát hành|thưởng của nph|🎁 phần thưởng từ nhà phát hành|quà mừng game ra mắt)$/i.test(rew.trim())) {
              rew = 'Chưa rõ phần thưởng';
            }
            mergedMap.set(upper, { ...c, code: cd, rewards: rew, description: rew });
          }
        });
      }
    }
    const result = Array.from(mergedMap.values());
    result.sort((a, b) => {
      const aActive = !isCodeExpired(a) ? 1 : 0;
      const bActive = !isCodeExpired(b) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      const timeA = a.added_at ? new Date(a.added_at).getTime() : 0;
      const timeB = b.added_at ? new Date(b.added_at).getTime() : 0;
      return timeB - timeA;
    });
    return result;
  }

  public getCachedServerGame(slug: string): GameItem | null {
    if (!slug) return null;
    const norm = slug.toLowerCase().trim();
    return this.cachedServerGames.get(norm) || this.cachedServerGames.get(norm.replace(/-mobile$/i, '')) || null;
  }

  async getGameBySlug(slug: string, forceFresh: boolean = false): Promise<GameItem | null> {
    if (!slug) return null;
    let normSlug = slug.toLowerCase().trim();
    if (normSlug === 'doors') normSlug = 'doors-roblox';
    const cleanWithoutMobile = normSlug.replace(/-mobile$/i, '');

    // 1. Check if cached game has full details and was recently fetched from server
    const memCached = this.cachedServerGames.get(normSlug) || this.cachedServerGames.get(cleanWithoutMobile);
    const lastFetch = this.cachedGameFetchTime.get(normSlug) || this.cachedGameFetchTime.get(cleanWithoutMobile) || 0;
    const isRecentlyFetched = Date.now() - lastFetch < 30000; // 30 seconds fresh cache

    if (!forceFresh && memCached && (memCached as any).is_full_detail && !memCached.is_partial_preview && isRecentlyFetched) {
      return memCached;
    }

    // 2. Fetch full game details with complete giftcode pool from Serverless D1 API
    try {
      const fetchUrl = `/api/games?slug=${encodeURIComponent(slug)}&_t=${Date.now()}${forceFresh ? '&fresh=1' : ''}`;
      const res = await fetch(fetchUrl, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.game) {
          const game = json.game;
          const serverCodes = Array.isArray(game.codes) ? game.codes : [];
          const localCodes = this.getCodesForGame(game);

          // Merge server authoritative codes with local backup codes
          const mergedCodesMap = new Map<string, GiftCode>();
          serverCodes.forEach((c: any) => {
            const codeVal = String(c.code || c.codeValue || '').trim().toUpperCase();
            if (codeVal && !mergedCodesMap.has(codeVal)) {
              mergedCodesMap.set(codeVal, c);
            }
          });
          localCodes.forEach((c: any) => {
            const codeVal = String(c.code || c.codeValue || '').trim().toUpperCase();
            if (codeVal && !mergedCodesMap.has(codeVal)) {
              mergedCodesMap.set(codeVal, c);
            }
          });

          const fullCodes = Array.from(mergedCodesMap.values());
          fullCodes.sort((a, b) => {
            const aExp = isCodeExpired(a) ? 1 : 0;
            const bExp = isCodeExpired(b) ? 1 : 0;
            if (aExp !== bExp) return aExp - bExp;
            const timeA = a.added_at ? new Date(a.added_at).getTime() : 0;
            const timeB = b.added_at ? new Date(b.added_at).getTime() : 0;
            return timeB - timeA;
          });

          const activeFullCodes = fullCodes.filter((c: any) => !isCodeExpired(c));
          const isWwmGame = (game.slug === 'where-winds-meet' || game.slug === 'where-winds-meet-mobile' || game.slug === 'yen-van-thap-luc-thanh' ||
                             game.id === 'where-winds-meet' || game.id === 'where-winds-meet-mobile' || game.id === 'yen-van-thap-luc-thanh' ||
                             normSlug === 'where-winds-meet' || normSlug === 'where-winds-meet-mobile' || normSlug === 'yen-van-thap-luc-thanh');
          const finalActiveCount = isWwmGame ? 584 : (typeof game.active_codes_count === 'number' ? game.active_codes_count : activeFullCodes.length);
          const finalGame: GameItem = {
            ...game,
            codes: fullCodes,
            codes_count: isWwmGame ? 584 : (typeof game.codes_count === 'number' ? game.codes_count : activeFullCodes.length),
            active_codes_count: finalActiveCount,
            free_codes_count: isWwmGame ? 584 : (typeof game.free_codes_count === 'number' ? game.free_codes_count : finalActiveCount),
            expired_codes_count: isWwmGame ? 36 : (fullCodes.length - activeFullCodes.length),
            total_codes_count: isWwmGame ? 620 : fullCodes.length,
            icon_url: game.icon_url || `/game_icons/${game.slug}.webp`,
            is_full_detail: true,
            is_partial_preview: false,
          };
          this.cachedServerGames.set(game.slug.toLowerCase(), finalGame);
          if (game.id) this.cachedServerGames.set(String(game.id).toLowerCase(), finalGame);
          this.cachedGameFetchTime.set(game.slug.toLowerCase(), Date.now());
          if (game.id) this.cachedGameFetchTime.set(String(game.id).toLowerCase(), Date.now());

          // Synchronize back to this.games array
          const inMemory = this.games.find(
            (g) => (g.slug && g.slug.toLowerCase() === normSlug) || (g.id && g.id.toLowerCase() === normSlug)
          );
          if (inMemory) {
            inMemory.codes = fullCodes.slice(0, 3);
            inMemory.codes_count = finalGame.codes_count;
            inMemory.active_codes_count = finalGame.active_codes_count;
            inMemory.total_codes_count = finalGame.total_codes_count;
          }

          return finalGame;
        }
      }
    } catch {
      // Fallback to local
    }

    // 3. Fallback to local memory / bundled dataset with tiered priority lookup
    await this.init();
    await this.ensureFallbackCodesLoaded();

    // Tier 1: Exact Match on slug or id
    let game = this.games.find(
      (g) => (g.slug && g.slug.toLowerCase() === normSlug) || (g.id && g.id.toLowerCase() === normSlug)
    );

    // Tier 2: Exact Match on generated nameSlug
    if (!game) {
      game = this.games.find(
        (g) => g.name && g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === normSlug
      );
    }

    // Tier 3: Known Specific Aliases
    if (!game) {
      if (normSlug === 'huyen-thoai-hai-tac' || normSlug === 'pirate-legends') {
        game = this.games.find(
          (g) =>
            g.slug === 'huyen-thoai-hai-tac' ||
            g.slug === 'pirate-legends' ||
            g.id === 'huyen-thoai-hai-tac' ||
            g.id === 'pirate-legends'
        );
      }
    }

    // Tier 4: Match without -mobile suffix (Only if no exact match found above)
    if (!game) {
      game = this.games.find(
        (g) =>
          (g.slug && g.slug.toLowerCase().replace(/-mobile$/i, '').trim() === cleanWithoutMobile) ||
          (g.id && g.id.toLowerCase().replace(/-mobile$/i, '').trim() === cleanWithoutMobile)
      );
    }
    if (!game) return null;

    const codes = this.getCodesForGame(game);
    const finalCodes = codes.length > 0 ? codes : (game.codes || []);
    const usableFinalCodes = finalCodes.filter((c: any) => !isCodeExpired(c));
    const isWwmLocal = (game.slug === 'where-winds-meet' || game.slug === 'where-winds-meet-mobile' || game.slug === 'yen-van-thap-luc-thanh' ||
                        game.id === 'where-winds-meet' || game.id === 'where-winds-meet-mobile' || game.id === 'yen-van-thap-luc-thanh' ||
                        normSlug === 'where-winds-meet' || normSlug === 'where-winds-meet-mobile' || normSlug === 'yen-van-thap-luc-thanh');
    const localActiveCount = isWwmLocal ? 584 : (typeof game.active_codes_count === 'number' ? game.active_codes_count : usableFinalCodes.length);
    const localResult: GameItem = {
      ...game,
      codes: finalCodes,
      codes_count: isWwmLocal ? 584 : (typeof game.codes_count === 'number' ? game.codes_count : usableFinalCodes.length),
      active_codes_count: localActiveCount,
      free_codes_count: isWwmLocal ? 584 : (typeof game.free_codes_count === 'number' ? game.free_codes_count : localActiveCount),
      expired_codes_count: isWwmLocal ? 36 : (finalCodes.length - usableFinalCodes.length),
      total_codes_count: isWwmLocal ? 620 : finalCodes.length,
      icon_url: game.icon_url || `/game_icons/${game.slug}.webp`,
      is_full_detail: true,
      is_partial_preview: false,
    };
    this.cachedServerGames.set(normSlug, localResult);
    this.cachedGameFetchTime.set(normSlug, Date.now());
    return localResult;
  }

  /**
   * Fetches full game records for all bookmarked game slugs from server
   */
  async getBookmarkedGames(bookmarks: string[]): Promise<GameItem[]> {
    if (!bookmarks || bookmarks.length === 0) return [];
    try {
      const res = await fetch(`/api/games?slugs=${encodeURIComponent(bookmarks.join(','))}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.games)) {
          return json.games;
        }
      }
    } catch {}

    await this.init();
    const bSet = new Set(bookmarks.map((s) => s.toLowerCase()));
    return this.games.filter((g) => bSet.has(g.id.toLowerCase()) || bSet.has(g.slug.toLowerCase()));
  }

  /**
   * Fast server-side autocomplete search that queries all 450+ games and codes
   */
  async searchAllGamesAndCodesServer(
    query: string,
    limit: number = 8
  ): Promise<{
    games: GameItem[];
    codes: Array<{ game: GameItem; code: GiftCode }>;
    totalMatches: number;
  }> {
    const q = query.trim();
    if (!q) return { games: [], codes: [], totalMatches: 0 };

    try {
      const res = await fetch(`/api/games?autocomplete=1&search=${encodeURIComponent(q)}&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          return {
            games: json.games || [],
            codes: json.codes || [],
            totalMatches: json.totalMatches || 0,
          };
        }
      }
    } catch {}

    return this.searchAllGamesAndCodes(query, limit);
  }

  // --- UPCOMING GAMES SYSTEM ---
  /**
   * Retrieves upcoming games from Serverless API / LocalStorage / Fallback
   * Only returns approved games (excludes pending moderation queue) and sorts by admin display order.
   * Games released > 24 hours ago are automatically rolled over into the catalog below.
   */
  async getUpcomingGames(): Promise<UpcomingGame[]> {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const sortAndFilter = (list: any[]): UpcomingGame[] => {
      // 1. Tự động chuyển các game đã mở server > 24h xuống catalog bên dưới
      list.forEach((g) => {
        if (!g || !g.slug || !g.releaseDate) return;
        const target = new Date(g.releaseDate).getTime();
        if (!isNaN(target) && target <= now && (now - target) > ONE_DAY_MS) {
          const slugLower = g.slug.toLowerCase();
          const exists = this.games.some((gm) => (gm.slug || '').toLowerCase() === slugLower || (gm.id || '').toLowerCase() === slugLower);
          if (!exists) {
            const mappedCodes = this.getCodesForGame({ slug: g.slug, name: g.name });
            const expected = (g.expectedCodes || []).map((c: any) => ({
              code: typeof c === 'string' ? c.toUpperCase() : (c?.code || '').toUpperCase(),
              rewards: (typeof c === 'object' && c?.rewards) || 'Thưởng của NPH',
              status: 'active' as const,
              expiry: (typeof c === 'object' && (c?.expiresAt || c?.expires_at || c?.expiry)) || '',
            })).filter((c: any) => Boolean(c.code));
            const finalCodes = mappedCodes.length > 0 ? mappedCodes : expected;
            if (finalCodes.length > 0) {
              this.games.unshift({
                id: g.slug,
                slug: g.slug,
                name: g.name,
                publisher: g.publisher || '',
                category: g.category || '',
                platform: g.platform || '',
                icon_url: getUpcomingGameIconUrl(g),
                banner_url: g.bannerUrl,
                description: g.description,
                is_new: true,
                is_hot: true,
                release_date: g.releaseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                codes_count: finalCodes.filter((c: any) => !isCodeExpired(c)).length,
                codes: finalCodes,
              });
            }
          }
        }
      });

      // 2. Chỉ giữ lại trên banner các game đang đếm ngược hoặc ra mắt trong ngày (<= 24h)
      return list
        .filter((g) => {
          if (g.status === 'CANCELLED' || g.status === 'PENDING') return false;
          const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
          if (!isApproved) return false;
          if (!g.releaseDate) return true;
          const target = new Date(g.releaseDate).getTime();
          if (isNaN(target)) return true;
          const elapsed = now - target;
          return elapsed <= ONE_DAY_MS;
        })
        .sort((a, b) => {
          const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : NaN;
          const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : NaN;
          const hasDateA = !isNaN(timeA);
          const hasDateB = !isNaN(timeB);

          if (hasDateA && !hasDateB) return -1;
          if (!hasDateA && hasDateB) return 1;

          const orderA = calculateEffectiveOrder(a, now);
          const orderB = calculateEffectiveOrder(b, now);

          if (hasDateA && hasDateB) {
            if (timeA !== timeB) return timeA - timeB;
            return orderA - orderB;
          }

          if (orderA !== orderB) return orderA - orderB;
          return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
        });
    };

    // 1. Try fetching from Cloudflare Pages API
    try {
      const res = await fetch('/api/crawler/ingest-upcoming-games?status=UPCOMING');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.games) && json.games.length > 0) {
          const processed = sortAndFilter(json.games);
          try {
            localStorage.setItem('wcg_cached_upcoming_games_v1', JSON.stringify(processed));
          } catch {}
          return processed;
        }
      }
    } catch {}

    // 2. Try reading from cached or admin storage in LocalStorage
    try {
      const cached = localStorage.getItem('wcg_cached_upcoming_games_v1') || localStorage.getItem('wcg_admin_upcoming_games_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sortAndFilter(parsed);
        }
      }
    } catch {}

    // 3. Fallback to DEFAULT_UPCOMING_GAMES
    return sortAndFilter(DEFAULT_UPCOMING_GAMES);
  }

  /**
   * Get cached upcoming games synchronously for 0ms initial render
   */
  getUpcomingGamesSync(): UpcomingGame[] {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const sortAndFilter = (list: any[]): UpcomingGame[] => {
      return list
        .filter((g) => {
          if (g.status === 'CANCELLED' || g.status === 'PENDING') return false;
          const isApproved = g.status === 'UPCOMING' || g.status === 'APPROVED';
          if (!isApproved) return false;
          if (!g.releaseDate) return true;
          const target = new Date(g.releaseDate).getTime();
          if (isNaN(target)) return true;
          const elapsed = now - target;
          return elapsed <= ONE_DAY_MS;
        })
        .sort((a, b) => {
          const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : NaN;
          const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : NaN;
          const hasDateA = !isNaN(timeA);
          const hasDateB = !isNaN(timeB);

          if (hasDateA && !hasDateB) return -1;
          if (!hasDateA && hasDateB) return 1;

          const orderA = calculateEffectiveOrder(a, now);
          const orderB = calculateEffectiveOrder(b, now);

          if (hasDateA && hasDateB) {
            if (timeA !== timeB) return timeA - timeB;
            return orderA - orderB;
          }

          if (orderA !== orderB) return orderA - orderB;
          return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
        });
    };

    try {
      const cached = localStorage.getItem('wcg_cached_upcoming_games_v1') || localStorage.getItem('wcg_admin_upcoming_games_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sortAndFilter(parsed);
        }
      }
    } catch {}
    return sortAndFilter(DEFAULT_UPCOMING_GAMES);
  }

  // --- GIVEAWAYS SYSTEM ---
  getGiveaways(): GiveawayCampaign[] {
    let list: GiveawayCampaign[] = [];
    let deletedGwSet = new Set<string>();
    try {
      const delRaw = localStorage.getItem('wcg_deleted_giveaways');
      if (delRaw) {
        const parsed = JSON.parse(delRaw);
        if (Array.isArray(parsed)) deletedGwSet = new Set(parsed);
      }
    } catch {}

    try {
      // Priority: Admin-managed giveaways from KV sync
      const adminGw = localStorage.getItem('wcg_admin_giveaways_v4');
      if (adminGw !== null) {
        const parsed = JSON.parse(adminGw);
        if (Array.isArray(parsed)) {
          list = parsed.filter(
            (g) =>
              g &&
              g.id &&
              !deletedGwSet.has(g.id) &&
              !(g.title === '15' && g.game_name && g.game_name.includes('Thiếu Hiệp')) &&
              g.id !== 'gw_alienware_vaultbreakers' &&
              g.id !== 'gw_garena_delta_force' &&
              !(g.game_name && g.game_name.toLowerCase().includes('delta force'))
          );
        }
      }
    } catch {}

    if (list.length === 0 && DEFAULT_GIVEAWAYS.length > 0) {
      list = DEFAULT_GIVEAWAYS.filter(
        (g) =>
          g &&
          g.id &&
          !deletedGwSet.has(g.id) &&
          g.id !== 'gw_alienware_vaultbreakers' &&
          g.id !== 'gw_garena_delta_force' &&
          !(g.game_name && g.game_name.toLowerCase().includes('delta force'))
      );
    }

    // Return giveaways with formatted attributes and prioritized in-stock first
    return list.map((gw) => {
      const poolCount = Array.isArray(gw.codes_pool) && gw.codes_pool.length > 0
        ? gw.codes_pool.length
        : (typeof gw.remaining_codes === 'number' ? Math.max(0, gw.remaining_codes) : 0);
      const claimed = Number(gw.claimed_codes) || 0;
      const accurateTotal = typeof gw.total_codes === 'number' && gw.total_codes >= (poolCount + claimed)
        ? gw.total_codes
        : (poolCount + claimed);

      // Admin configured title is the Single Source of Truth
      const normalizedTitle = gw.title && gw.title.trim() !== '' && gw.title !== '1 code ngẫu nhiên bất kỳ' && gw.title !== '1 code riêng ngẫu nhiên'
        ? gw.title.trim()
        : (gw.game_name ? `Code riêng ${gw.game_name.trim()}` : 'Code riêng');

      const normalizedRewards = (
        gw.rewards === 'code riêng ngẫu nhiên' ||
        gw.rewards === 'Code ngẫu nhiên từ NPH' ||
        gw.rewards === 'Code ngẫu nhiên bất kỳ' ||
        gw.rewards === '1 code ngẫu nhiên' ||
        !gw.rewards
      ) ? 'Code ngẫu nhiên' : gw.rewards;

      return {
        ...gw,
        title: normalizedTitle,
        rewards: normalizedRewards,
        min_account_age_days: Number(gw.min_account_age_days ?? (gw as any).minAccountAgeDays ?? 0),
        max_per_user: Number(gw.max_per_user ?? (gw as any).maxPerUser ?? 1),
        max_per_ip: Number(gw.max_per_ip ?? (gw as any).maxPerIp ?? 1),
        cooldown_hours: Number(gw.cooldown_hours ?? (gw as any).cooldownHours ?? 0),
        cooldown_minutes: Number(gw.cooldown_minutes ?? (gw.cooldown_hours ? gw.cooldown_hours * 60 : ((gw as any).cooldownHours ? (gw as any).cooldownHours * 60 : 0))),
        global_cooldown_seconds: Number(gw.global_cooldown_seconds ?? (gw as any).globalCooldownSeconds ?? 0),
        total_codes: accurateTotal,
        remaining_codes: poolCount,
      };
    }).sort((a, b) => {
      const inStockA = (a.remaining_codes || 0) > 0 ? 1 : 0;
      const inStockB = (b.remaining_codes || 0) > 0 ? 1 : 0;
      if (inStockA !== inStockB) return inStockB - inStockA;
      if (inStockA > 0 && a.remaining_codes !== b.remaining_codes) {
        return (b.remaining_codes || 0) - (a.remaining_codes || 0);
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }

  getClientIp(): string {
    try {
      const user = this.getCurrentUser();
      if (user?.registered_ip) return user.registered_ip;
      const cached = localStorage.getItem('wcg_client_ip') || sessionStorage.getItem('wcg_client_ip');
      if (cached) return cached;
      const membersRaw = localStorage.getItem('wcg_admin_members_v4');
      if (membersRaw && user) {
        const members = JSON.parse(membersRaw);
        const m = members.find((x: any) => x.id === user.id || (user.email && x.email === user.email));
        if (m?.registeredIp) return m.registeredIp;
      }
    } catch {}
    return '118.69.182.44';
  }

  async claimGiveaway(campaignId: string): Promise<{ success: boolean; code?: string; message?: string }> {
    const giveaways = this.getGiveaways();
    const campaign = giveaways.find((c) => c.id === campaignId);
    if (!campaign) return { success: false, message: 'Chiến dịch không tồn tại.' };

    if (campaign.is_active === false || campaign.status === 'ENDED' || campaign.status === 'PAUSED' || campaign.status === 'CLOSED') {
      return { success: false, message: 'Đợt phát code này hiện đã tạm hết mã hoặc đang tạm đóng. Vui lòng quay lại vào đợt sau!' };
    }

    const user = this.getCurrentUser();
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập tài khoản để giật mã quà tặng.' };
    }

    const nowMs = Date.now();

    // 1. Check Start Time / End Time (Calibrated to Vietnam Time UTC+7)
    if (campaign.start_time) {
      const stStr = String(campaign.start_time).trim();
      const startMs = stStr.length === 10 ? new Date(`${stStr}T00:00:00+07:00`).getTime() : new Date(stStr).getTime();
      if (!isNaN(startMs) && nowMs < startMs) {
        return {
          success: false,
          message: `Sự kiện chưa bắt đầu. Thời gian mở: ${new Date(startMs).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
        };
      }
    }
    if (campaign.end_time) {
      const etStr = String(campaign.end_time).trim();
      const endMs = etStr.length === 10 ? new Date(`${etStr}T23:59:59+07:00`).getTime() : new Date(etStr).getTime();
      if (!isNaN(endMs) && nowMs > endMs) {
        return {
          success: false,
          message: `Sự kiện đã kết thúc vào ${new Date(endMs).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
        };
      }
    }

    // 2. Pre-check Minimum Account Age
    const minAgeDays = Number(campaign.min_account_age_days) || 0;
    if (minAgeDays > 0) {
      const userCreatedAt = user.created_at || (user as any).createdAt;
      if (userCreatedAt) {
        const userCreatedMs = new Date(userCreatedAt).getTime();
        if (!isNaN(userCreatedMs)) {
          const ageDays = Math.floor((nowMs - userCreatedMs) / (1000 * 60 * 60 * 24));
          if (ageDays < minAgeDays) {
            return {
              success: false,
              message: `Tài khoản của bạn mới được tạo ${Math.max(0, ageDays)} ngày. Yêu cầu tham gia sự kiện này tối thiểu là ${minAgeDays} ngày tuổi.`,
            };
          }
        }
      }
    }

    const userRole = String((user as any).role || '').toUpperCase();
    const isAdmin =
      userRole === 'ADMIN' ||
      userRole === 'SUPER_ADMIN' ||
      user.username === 'admin' ||
      user.username === 'admin290200' ||
      user.id === 'usr_admin';

    const rawMaxPerUser = Number(campaign.max_per_user);
    const isUnlimitedUser = rawMaxPerUser === 0 || rawMaxPerUser >= 999999 || isAdmin;
    const effectiveMaxPerUser = isUnlimitedUser ? 999999 : (rawMaxPerUser > 0 ? rawMaxPerUser : 1);

    // 3. Pre-check Max Claims Per User (bypassed for Admin & Unlimited)
    const claimedList = this.getClaimedCodes();
    const myClaims = claimedList.filter((c) => c.campaign_id === campaignId);
    if (!isAdmin && !isUnlimitedUser && myClaims.length >= effectiveMaxPerUser) {
      return {
        success: false,
        code: myClaims[0]?.code_value,
        alreadyClaimed: true,
        message: `Bạn đã nhận đủ giới hạn tối đa (${myClaims.length}/${effectiveMaxPerUser} mã) cho sự kiện này.`,
      };
    }

    // 4. Pre-check Cooldown Minutes (bypassed for Admin)
    const cooldownMinutes = isAdmin ? 0 : (
      campaign.cooldown_minutes !== undefined && campaign.cooldown_minutes !== null
        ? Number(campaign.cooldown_minutes)
        : (Number(campaign.cooldown_hours) || 0) * 60
    );
    if (!isAdmin && cooldownMinutes > 0 && myClaims.length > 0) {
      const latestClaim = myClaims[0];
      if (latestClaim && latestClaim.claimed_at) {
        const lastClaimMs = new Date(latestClaim.claimed_at).getTime();
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const remainingCooldownMs = (lastClaimMs + cooldownMs) - nowMs;
        if (remainingCooldownMs > 0) {
          const remHours = Math.floor(remainingCooldownMs / (1000 * 60 * 60));
          const remMins = Math.ceil((remainingCooldownMs % (1000 * 60 * 60)) / (1000 * 60));
          const waitStr = remHours > 0 ? `${remHours} giờ ${remMins} phút` : `${remMins} phút`;
          const cdDisplayStr = cooldownMinutes >= 60 && cooldownMinutes % 60 === 0
            ? `${cooldownMinutes / 60}h`
            : `${cooldownMinutes} phút`;
          return {
            success: false,
            message: `Bạn đang trong thời gian hồi chiêu (${cdDisplayStr}). Vui lòng quay lại sau ${waitStr} để giật mã tiếp theo.`,
          };
        }
      }
    }

    // 4.1 Pre-check Global Release Interval / Global Queue Cooldown (Toàn web chờ giữa 2 lần giật)
    const globalCooldownSeconds = isAdmin ? 0 : Math.max(0, Number(campaign.global_cooldown_seconds || 0));
    if (globalCooldownSeconds > 0 && campaign.last_global_claim_at) {
      const lastGlobalMs = new Date(campaign.last_global_claim_at).getTime();
      if (!isNaN(lastGlobalMs)) {
        const cooldownMs = globalCooldownSeconds * 1000;
        const remainingGlobalMs = (lastGlobalMs + cooldownMs) - nowMs;
        if (remainingGlobalMs > 0) {
          const remTotalSec = Math.ceil(remainingGlobalMs / 1000);
          const remMin = Math.floor(remTotalSec / 60);
          const remSec = remTotalSec % 60;
          const waitStr = remMin > 0 ? `${remMin} phút ${remSec > 0 ? `${remSec} giây` : ''}`.trim() : `${remSec} giây`;

          const lastClaimer = String(campaign.last_claimer_name || '').trim() || 'đồng đạo trước';
          let cdMsg = String(campaign.custom_cooldown_msg || '').trim();
          if (!cdMsg) {
            cdMsg = 'Đợt phát trước đạo hữu {last_user} đã nhanh tay đi trước, đạo hữu vui lòng đợi {time_left} rồi thử sức lại.';
          }
          cdMsg = cdMsg
            .replace(/\{last_user\}|\{claimer\}|\{last_claimer\}|\{last_claimer_name\}|\{user\}/gi, lastClaimer)
            .replace(/\{time_left\}/gi, waitStr)
            .replace(/\{seconds\}|\{sec\}/gi, `${remTotalSec} giây`);

          return {
            success: false,
            errorCode: 'GLOBAL_COOLDOWN_ACTIVE',
            remainingSeconds: remTotalSec,
            message: cdMsg,
          };
        }
      }
    }

    const token =
      (typeof localStorage !== 'undefined' ? localStorage.getItem('wcg_auth_token') : null) ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('wcg_auth_token') : null) ||
      user.session_token ||
      '';

    let lastErrorMessage = '';

    try {
      const endpoints = [
        '/api/giveaways/claim',
        'https://codegame.shop/api/giveaways/claim',
        'https://web-code-game.pages.dev/api/giveaways/claim',
        'https://admin-code-game-shop.pages.dev/api/giveaways/claim',
      ];

      let serverData: any = null;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              campaignId,
              memberId: user.id,
              sessionToken: token,
            }),
          });

          const json = await res.json().catch(() => null);
          if (json && typeof json === 'object') {
            serverData = json;
            if (serverData.message && !serverData.success) {
              lastErrorMessage = serverData.message;
            }
            break;
          } else if (res.status === 401) {
            lastErrorMessage = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
            break;
          }
        } catch (fetchErr: any) {
          lastErrorMessage = fetchErr?.message || '';
        }
      }

      if (serverData) {
        const isRealCode = (cStr?: string) =>
          typeof cStr === 'string' &&
          cStr.trim().length > 0 &&
          !['OUT_OF_STOCK', 'CAMPAIGN_NOT_STARTED', 'CAMPAIGN_ENDED', 'ACCOUNT_TOO_NEW', 'COOLDOWN_ACTIVE', 'MISSING_CLIENT_IP', 'USER_LIMIT_REACHED'].includes(cStr.trim().toUpperCase());

        const returnedCode = isRealCode(serverData.code)
          ? serverData.code
          : (Array.isArray(serverData.claimedCodes) && serverData.claimedCodes.length > 0 && isRealCode(serverData.claimedCodes[0]?.code))
          ? serverData.claimedCodes[0].code
          : null;

        if (returnedCode) {
          const nowClaimIso = serverData.last_global_claim_at || new Date().toISOString();
          // Cập nhật ngay lập tức kho thật giveaway trong local storage (-1 còn lại, +1 đã giật, cập nhật last_global_claim_at)
          const currentClaimerName = (user as any).displayName || user.username || (user.email ? user.email.split('@')[0] : 'Đạo hữu');
          const allGiveaways = this.getGiveaways();
          const updatedGiveaways = allGiveaways.map((g) =>
            g.id === campaignId
              ? {
                  ...g,
                  remaining_codes: Math.max(0, (typeof g.remaining_codes === 'number' ? g.remaining_codes : Number(g.total_codes || 0)) - 1),
                  claimed_codes: (Number(g.claimed_codes) || 0) + 1,
                  last_global_claim_at: nowClaimIso,
                  last_claimer_name: serverData.lastClaimerName || currentClaimerName,
                }
              : g
          );
          try {
            localStorage.setItem(this.GIVEAWAYS_KEY, JSON.stringify(updatedGiveaways));
            localStorage.setItem('wcg_admin_giveaways_v4', JSON.stringify(updatedGiveaways));
          } catch {}

          const claimedList = this.getClaimedCodes();
          const cleanReturnedCode = String(returnedCode || '').trim().toUpperCase();
          const cleanCampaignId = String(campaignId || '').trim();
          if (!claimedList.some((c) => String(c.code_value || '').trim().toUpperCase() === cleanReturnedCode && String(c.campaign_id || '').trim() === cleanCampaignId)) {
            const newRecord: ClaimedCodeRecord = {
              id: `claim_${Date.now()}`,
              campaign_id: campaignId,
              game_name: campaign.game_name || serverData.campaign?.game_name || 'Sự Kiện',
              game_slug: campaign.game_slug || serverData.campaign?.game_slug || '',
              game_icon_url: campaign.game_icon_url || '',
              code_value: returnedCode,
              rewards: campaign.rewards || serverData.campaign?.rewards || 'Quà tặng sự kiện',
              claimed_at: nowClaimIso,
            };
            claimedList.unshift(newRecord);
            localStorage.setItem(this.CLAIMED_CODES_KEY, JSON.stringify(claimedList));
          }

          // Record real giveaway claim event in marketing service
          try {
            marketingService.recordRealGiveawayClaim(
              campaign.title,
              campaign.id,
              campaign.game_name,
              campaign.game_slug,
              user.displayName || user.username
            );
          } catch {}

          this.notifyListeners();

          return {
            success: true,
            code: returnedCode,
            isNewCode: !serverData.alreadyClaimed,
            alreadyClaimed: Boolean(serverData.alreadyClaimed),
            isAdminBypass: Boolean(serverData.isAdminBypass),
            userClaimsCount: serverData.userClaimsCount,
            last_global_claim_at: nowClaimIso,
            last_claimer_name: serverData.lastClaimerName || currentClaimerName,
            message: serverData.message || (serverData.alreadyClaimed ? `Mã của bạn: ${returnedCode}` : 'Chúc mừng! Bạn đã nhận giftcode sự kiện thành công.'),
          };
        } else {
          // If server reported global cooldown active, sync last_global_claim_at & last_claimer_name
          if (serverData.errorCode === 'GLOBAL_COOLDOWN_ACTIVE' && serverData.nextReleaseAt) {
            const allGiveaways = this.getGiveaways();
            const gw = allGiveaways.find((g) => g.id === campaignId);
            if (gw && gw.global_cooldown_seconds) {
              const estimatedClaimAt = new Date(new Date(serverData.nextReleaseAt).getTime() - gw.global_cooldown_seconds * 1000).toISOString();
              gw.last_global_claim_at = estimatedClaimAt;
              if (serverData.lastClaimerName) {
                gw.last_claimer_name = serverData.lastClaimerName;
              }
              try {
                localStorage.setItem(this.GIVEAWAYS_KEY, JSON.stringify(allGiveaways));
                localStorage.setItem('wcg_admin_giveaways_v4', JSON.stringify(allGiveaways));
              } catch {}
              this.notifyListeners();
            }
          }

          return {
            success: false,
            code: undefined,
            errorCode: serverData.errorCode,
            remainingSeconds: serverData.remainingSeconds,
            alreadyClaimed: Boolean(serverData.alreadyClaimed),
            isAdminBypass: Boolean(serverData.isAdminBypass),
            message: serverData.message || 'Không thể nhận mã lúc này. Mã quà tặng có thể đã hết hoặc sự kiện đã tạm đóng.',
          };
        }
      }
    } catch (catchErr: any) {
      if (!lastErrorMessage) {
        lastErrorMessage = catchErr?.message || '';
      }
    }

    return {
      success: false,
      message: lastErrorMessage || 'Không thể kết nối đến máy chủ xử lý nhận quà. Vui lòng kiểm tra kết nối mạng và thử lại.',
    };
  }

  getUserProfile(): UserProfile {
    const existing = this.getCurrentUser();
    if (existing) return existing;

    const guestUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: 'Game Thủ Miễn Phí',
      email: 'guest@webcodegame.vn',
      role: 'user',
      wallet_balance: 0,
    };
    this.saveCurrentUser(guestUser);
    return guestUser;
  }

  getClaimedCodes(): ClaimedCodeRecord[] {
    try {
      const data = localStorage.getItem(this.CLAIMED_CODES_KEY);
      const list: ClaimedCodeRecord[] = data ? JSON.parse(data) : [];
      const invalidErrorCodes = new Set(['OUT_OF_STOCK', 'CAMPAIGN_NOT_STARTED', 'CAMPAIGN_ENDED', 'ACCOUNT_TOO_NEW', 'COOLDOWN_ACTIVE', 'MISSING_CLIENT_IP']);
      
      const seenKeys = new Set<string>();
      const deduplicated: ClaimedCodeRecord[] = [];
      
      for (const c of list) {
        if (!c || !c.code_value) continue;
        const cleanCode = String(c.code_value).trim().toUpperCase();
        if (invalidErrorCodes.has(cleanCode)) continue;
        
        const campId = String(c.campaign_id || '').trim();
        const uniqueKey = `${campId}_${cleanCode}`;
        
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          deduplicated.push(c);
        }
      }

      if (deduplicated.length !== list.length) {
        localStorage.setItem(this.CLAIMED_CODES_KEY, JSON.stringify(deduplicated));
      }
      return deduplicated;
    } catch {
      return [];
    }
  }

  // --- MISSION REWARDS SYSTEM ---
  getMissionRewards(): any[] {
    try {
      const data = localStorage.getItem(this.MISSION_REWARDS_KEY);
      const list = data ? JSON.parse(data) : [];
      if (!Array.isArray(list)) return [];
      const seen = new Set<string>();
      return list.filter((item: any) => {
        if (!item) return false;
        const key = String(item.id || item.submission_id || item.code_content || item.reward_delivered || '').trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch {
      return [];
    }
  }

  saveMissionRewards(submissions: any[]): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getMissionRewards();
      const combinedMap = new Map<string, any>();
      (existing || []).forEach((item: any) => {
        const k = String(item.id || item.submission_id || item.code_content || item.reward_delivered || '').trim();
        if (k) combinedMap.set(k, item);
      });
      (submissions || []).forEach((item: any) => {
        const k = String(item.id || item.submission_id || item.code_content || item.reward_delivered || '').trim();
        if (k) combinedMap.set(k, { ...(combinedMap.get(k) || {}), ...item });
      });
      const finalList = Array.from(combinedMap.values());
      localStorage.setItem(this.MISSION_REWARDS_KEY, JSON.stringify(finalList));
      window.dispatchEvent(new CustomEvent('wcg_mission_rewards_updated'));
    } catch {}
  }

  addMissionReward(submission: any): void {
    if (!submission) return;
    try {
      const list = this.getMissionRewards();
      const key = String(submission.id || submission.submission_id || submission.reward_delivered || '').trim();
      const exists = list.some((item: any) => {
        const k = String(item.id || item.submission_id || item.reward_delivered || '').trim();
        return k === key;
      });
      if (!exists) {
        list.unshift(submission);
        this.saveMissionRewards(list);
      }
    } catch {}
  }

  // --- STORE & PAID CODES SYSTEM ---
  getStoreProducts(): StoreProduct[] {
    let prods: StoreProduct[] | null = null;
    let deletedSet = new Set<string>();
    try {
      const delRaw = localStorage.getItem('wcg_deleted_store_products');
      if (delRaw) {
        const parsedDel = JSON.parse(delRaw);
        if (Array.isArray(parsedDel)) deletedSet = new Set(parsedDel);
      }
    } catch {}

    try {
      // Priority: Admin-managed store products from KV sync
      const adminSp = localStorage.getItem('wcg_admin_store_products_v4');
      if (adminSp !== null) {
        const parsed = JSON.parse(adminSp);
        if (Array.isArray(parsed)) {
          prods = parsed.filter((p) => p && p.id && !deletedSet.has(p.id));
        }
      }
    } catch {}

    if (!prods || prods.length === 0) {
      prods = (this.defaultStoreProducts || []).filter((p) => p && p.id && !deletedSet.has(p.id));
    } else {
      prods = prods.filter((p) => p && p.id && !p.id.startsWith('ut_') && !deletedSet.has(p.id));
    }

    return prods.map((p) => {
      let stock = Math.max(0, Number(p.stock_quantity ?? 0));
      try {
        if (typeof localStorage !== 'undefined') {
          const invRaw = localStorage.getItem('wcg_admin_inventory_v4');
          if (invRaw) {
            const invList = JSON.parse(invRaw);
            if (Array.isArray(invList) && invList.length > 0) {
              const matching = invList.filter(
                (i: any) => i && (i.sku === p.id || ((p as any).sku && i.sku === (p as any).sku) || (i.productName && p.title && String(i.productName).trim().toLowerCase() === String(p.title).trim().toLowerCase()))
              );
              if (matching.length > 0) {
                stock = matching.filter((i: any) => i.status === 'AVAILABLE').length;
              }
            }
          }
        }
      } catch {}
      return {
        ...p,
        stock_quantity: stock,
        game_icon_url: p.game_icon_url || p.cover_image_url || `/game_icons/${p.game_slug}.webp`,
        cover_image_url: p.cover_image_url || p.game_icon_url || `/game_icons/${p.game_slug}.webp`,
      };
    }).sort((a, b) => {
      const inStockA = (a.stock_quantity || 0) > 0 ? 1 : 0;
      const inStockB = (b.stock_quantity || 0) > 0 ? 1 : 0;
      if (inStockA !== inStockB) return inStockB - inStockA;
      if (inStockA > 0 && a.stock_quantity !== b.stock_quantity) {
        return (b.stock_quantity || 0) - (a.stock_quantity || 0);
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }

  private async submitOrderToServer(payload: {
    productId?: string;
    utilityId?: string;
    productTitle?: string;
    productCategory?: string;
    unitPrice?: number;
    quantity: number;
    memberId?: string;
    memberEmail?: string;
    buyerName?: string;
    buyerPhone?: string;
    clientWalletBalance?: number;
    clientInventory?: any[];
    orderType: 'store' | 'utility';
    idempotencyKey?: string;
  }): Promise<{ success: boolean; order?: OrderRecord; remainingBalance?: number; updatedStock?: number; updatedInventory?: any[]; message?: string }> {
    const activeUser = this.getCurrentUser();
    let token =
      (typeof localStorage !== 'undefined' ? localStorage.getItem('wcg_auth_token') : null) ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('wcg_auth_token') : null) ||
      activeUser?.session_token ||
      '';

    // Auto-restore token into localStorage if found on user profile
    if (token && typeof localStorage !== 'undefined' && !localStorage.getItem('wcg_auth_token')) {
      localStorage.setItem('wcg_auth_token', token);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }

    const endpoints = [
      '/api/orders/create',
      'https://codegame.shop/api/orders/create',
      'https://web-code-game.pages.dev/api/orders/create',
      'https://admin-code-game-shop.pages.dev/api/orders/create',
    ];

    let lastErrorMessage = '';
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json().catch(() => null);
          if (json && typeof json === 'object') {
            if (res.ok) {
              return json;
            } else if (json.message) {
              return json;
            }
          }
        }
      } catch (err: any) {
        lastErrorMessage = err?.message || '';
      }
    }

    return {
      success: false,
      message: lastErrorMessage && !lastErrorMessage.toLowerCase().includes('fetch')
        ? `Lỗi máy chủ: ${lastErrorMessage}`
        : 'Không thể kết nối đến máy chủ xử lý đơn hàng. Vui lòng kiểm tra đường truyền và thử lại.',
    };
  }

  async createOrder(
    productId: string,
    quantity: number = 1,
    idempotencyKey?: string
  ): Promise<{ success: boolean; order?: OrderRecord; message?: string }> {
    const products = this.getStoreProducts();
    const prod = products.find((p) => p.id === productId || p.sku === productId || p.title === productId);
    if (!prod) return { success: false, message: 'Sản phẩm không tồn tại.' };

    const user = this.getCurrentUser();
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập tài khoản để thực hiện mua mã.' };
    }

    const qty = Math.max(1, Math.min(999, Math.floor(quantity || 1)));
    const unitPrice = Number(prod.current_price) || 0;
    if (unitPrice <= 0) {
      return { success: false, message: 'Giá sản phẩm không hợp lệ.' };
    }
    const totalPrice = unitPrice * qty;

    // Local balance preliminary check
    const currentBal = Number(user.wallet_balance) || 0;
    if (currentBal < totalPrice) {
      return {
        success: false,
        message: `Số dư ví không đủ. Cần ${totalPrice.toLocaleString('vi-VN')} Core nhưng ví hiện có ${currentBal.toLocaleString('vi-VN')} Core. Vui lòng nạp thêm Core để thanh toán.`,
      };
    }

    const finalKey = idempotencyKey || (
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
    );

    // Submit strictly to Cloudflare Pages Functions Server for KV inventory fulfillment
    let serverRes: any = null;
    try {
      serverRes = await this.submitOrderToServer({
        productId: prod.id,
        productTitle: prod.title,
        productCategory: prod.package_type || prod.game_name,
        unitPrice: unitPrice,
        quantity: qty,
        memberId: user.id,
        memberEmail: user.email,
        buyerName: user.displayName || user.username,
        buyerPhone: user.phone,
        orderType: 'store',
        idempotencyKey: finalKey,
      });
    } catch (e: any) {
      return {
        success: false,
        message: 'Lỗi trong quá trình gửi yêu cầu tạo đơn hàng: ' + (e?.message || 'Không xác định'),
      };
    }

    if (serverRes && serverRes.success && serverRes.order) {
      if (typeof serverRes.remainingBalance === 'number') {
        user.wallet_balance = serverRes.remainingBalance;
      } else {
        user.wallet_balance = Math.max(0, currentBal - totalPrice);
      }
      this.saveCurrentUser(user);

      const targetFinalStock = typeof serverRes.updatedStock === 'number'
        ? serverRes.updatedStock
        : Math.max(0, (Number(prod.stock_quantity) || 0) - qty);

      const updatedProducts = products.map((p) =>
        p.id === prod.id
          ? {
              ...p,
              stock_quantity: targetFinalStock,
              sold_count: (Number(p.sold_count) || 0) + qty,
            }
          : p
      );
      localStorage.setItem('wcg_admin_store_products_v4', JSON.stringify(updatedProducts));
      localStorage.setItem(this.STORE_PRODUCTS_KEY, JSON.stringify(updatedProducts));

      const orders = this.getOrders();
      orders.unshift(serverRes.order);
      localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));

      // Record atomic debit transaction locally for ledger consistency
      try {
        const txsRaw = localStorage.getItem('wcg_admin_transactions_v4');
        const txs: any[] = txsRaw ? JSON.parse(txsRaw) : [];
        const purchaseTx = {
          id: serverRes.order.id || `tx_${Date.now()}`,
          referenceId: serverRes.order.id || `ORD-${Date.now()}`,
          memberId: user.id,
          memberEmail: user.email,
          type: 'ORDER',
          amount: totalPrice,
          balanceBefore: currentBal,
          balanceAfter: user.wallet_balance,
          status: 'COMPLETED',
          description: `Thanh toán ${qty}x ${prod.title}`,
          createdAt: serverRes.order.created_at || new Date().toISOString(),
        };
        txs.unshift(purchaseTx);
        localStorage.setItem('wcg_admin_transactions_v4', JSON.stringify(txs.slice(0, 500)));
      } catch {}

      this.syncWithCloudflareKV();
      this.notifyListeners();

      return {
        success: true,
        order: serverRes.order,
        message: serverRes.message || `Thanh toán thành công ${qty} mã! Đã giao hàng tức thì.`,
      };
    }

    return {
      success: false,
      message: serverRes?.message || 'Giao dịch không thành công. Máy chủ không thể xử lý đơn hàng này.',
    };
  }

  getOrders(): OrderRecord[] {
    try {
      const data = localStorage.getItem(this.ORDERS_KEY);
      const list: OrderRecord[] = data ? JSON.parse(data) : [];
      const seenKeys = new Set<string>();
      const deduplicated: OrderRecord[] = [];
      for (const o of list) {
        if (!o) continue;
        const key = String(o.id || o.orderCode || '').trim();
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          deduplicated.push(o);
        }
      }
      if (deduplicated.length !== list.length) {
        localStorage.setItem(this.ORDERS_KEY, JSON.stringify(deduplicated));
      }
      return deduplicated;
    } catch {
      return [];
    }
  }

  // --- UTILITIES SYSTEM (TIỆN ÍCH & DỊCH VỤ SỐ NGOÀI LỀ) ---
  getUtilityProducts(): UtilityProduct[] {
    let utilities: UtilityProduct[] | null = null;
    let deletedSet = new Set<string>();
    try {
      const delRaw = localStorage.getItem('wcg_deleted_utilities');
      if (delRaw) {
        const parsedDel = JSON.parse(delRaw);
        if (Array.isArray(parsedDel)) deletedSet = new Set(parsedDel);
      }
    } catch {}

    try {
      // Priority: Admin-managed utility products from KV sync
      const adminUt = localStorage.getItem('wcg_admin_utilities_v4');
      if (adminUt !== null) {
        const parsed = JSON.parse(adminUt);
        if (Array.isArray(parsed)) {
          utilities = parsed.filter((u) => u && u.id && !deletedSet.has(u.id));
        }
      }
    } catch {}

    if (!utilities || utilities.length === 0) {
      utilities = (this.defaultUtilities || []).filter((u) => u && u.id && !deletedSet.has(u.id));
    } else {
      utilities = utilities.filter((u) => u && u.id && !u.id.startsWith('sp_') && !deletedSet.has(u.id));
    }

    return utilities.map((u) => {
      let stock = Math.max(0, Number(u.stock_quantity ?? 0));
      try {
        if (typeof localStorage !== 'undefined') {
          const invRaw = localStorage.getItem('wcg_admin_inventory_v4');
          if (invRaw) {
            const invList = JSON.parse(invRaw);
            if (Array.isArray(invList) && invList.length > 0) {
              const matching = invList.filter(
                (i: any) => i && (i.sku === u.id || (u.sku && i.sku === u.sku) || (i.productName && u.title && String(i.productName).trim().toLowerCase() === String(u.title).trim().toLowerCase()))
              );
              if (matching.length > 0) {
                stock = matching.filter((i: any) => i.status === 'AVAILABLE').length;
              }
            }
          }
        }
      } catch {}
      return {
        ...u,
        stock_quantity: stock,
      };
    }).sort((a, b) => {
      const inStockA = (a.stock_quantity || 0) > 0 ? 1 : 0;
      const inStockB = (b.stock_quantity || 0) > 0 ? 1 : 0;
      if (inStockA !== inStockB) return inStockB - inStockA;
      if (inStockA > 0 && a.stock_quantity !== b.stock_quantity) {
        return (b.stock_quantity || 0) - (a.stock_quantity || 0);
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }

  saveUtilityProducts(products: UtilityProduct[]): void {
    try {
      localStorage.setItem(this.UTILITIES_KEY, JSON.stringify(products));
      localStorage.setItem('wcg_admin_utilities_v4', JSON.stringify(products));
      this.notifyListeners();
    } catch {}
  }

  getUtilityCategories(): UtilityCategory[] {
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
      const utilities = this.getUtilityProducts();
      const existingIds = new Set(list.map((c) => c.id));
      utilities.forEach((p) => {
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

  getStoreCategories(): StoreCategory[] {
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
      const prods = this.getStoreProducts();
      const existingIds = new Set(list.map((c) => c.id));
      prods.forEach((p) => {
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

  async createUtilityOrder(
    utilityId: string,
    quantity: number = 1,
    idempotencyKey?: string
  ): Promise<{ success: boolean; order?: OrderRecord; message?: string }> {
    const utilities = this.getUtilityProducts();
    const prod = utilities.find((p) => p.id === utilityId || p.sku === utilityId || p.title === utilityId);
    if (!prod) return { success: false, message: 'Sản phẩm tiện ích không tồn tại.' };

    const user = this.getCurrentUser();
    if (!user) {
      return { success: false, message: 'Vui lòng đăng nhập tài khoản để thực hiện mua tiện ích.' };
    }

    const qty = Math.max(1, Math.min(999, Math.floor(quantity || 1)));
    const unitPrice = Number(prod.current_price) || 0;
    if (unitPrice <= 0) {
      return { success: false, message: 'Giá sản phẩm tiện ích không hợp lệ.' };
    }
    const totalPrice = unitPrice * qty;

    // Local balance preliminary check
    const currentBal = Number(user.wallet_balance) || 0;
    if (currentBal < totalPrice) {
      return {
        success: false,
        message: `Số dư ví không đủ. Cần ${totalPrice.toLocaleString('vi-VN')} Core nhưng ví hiện có ${currentBal.toLocaleString('vi-VN')} Core. Vui lòng nạp thêm Core để thanh toán.`,
      };
    }

    const finalKey = idempotencyKey || (
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
    );

    // Submit strictly to Cloudflare Pages Functions Server for KV inventory fulfillment
    let serverRes: any = null;
    try {
      serverRes = await this.submitOrderToServer({
        utilityId: prod.id,
        productTitle: prod.title,
        productCategory: prod.category_label || prod.category,
        unitPrice: unitPrice,
        quantity: qty,
        memberId: user.id,
        memberEmail: user.email,
        buyerName: user.displayName || user.username,
        buyerPhone: user.phone,
        orderType: 'utility',
        idempotencyKey: finalKey,
      });
    } catch (e: any) {
      return {
        success: false,
        message: 'Lỗi trong quá trình gửi yêu cầu tạo đơn hàng: ' + (e?.message || 'Không xác định'),
      };
    }

    if (serverRes && serverRes.success && serverRes.order) {
      if (typeof serverRes.remainingBalance === 'number') {
        user.wallet_balance = serverRes.remainingBalance;
      } else {
        user.wallet_balance = Math.max(0, currentBal - totalPrice);
      }
      this.saveCurrentUser(user);

      const targetFinalStock = typeof serverRes.updatedStock === 'number'
        ? serverRes.updatedStock
        : Math.max(0, (Number(prod.stock_quantity) || 0) - qty);

      const updatedUtilities = utilities.map((p) =>
        p.id === prod.id
          ? {
              ...p,
              stock_quantity: targetFinalStock,
              sold_count: (Number(p.sold_count) || 0) + qty,
            }
          : p
      );
      this.saveUtilityProducts(updatedUtilities);


      const orders = this.getOrders();
      orders.unshift(serverRes.order);
      localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));

      // Record atomic debit transaction locally for ledger consistency
      try {
        const txsRaw = localStorage.getItem('wcg_admin_transactions_v4');
        const txs: any[] = txsRaw ? JSON.parse(txsRaw) : [];
        const purchaseTx = {
          id: serverRes.order.id || `tx_${Date.now()}`,
          referenceId: serverRes.order.id || `UTL-${Date.now()}`,
          memberId: user.id,
          memberEmail: user.email,
          type: 'ORDER',
          amount: totalPrice,
          balanceBefore: currentBal,
          balanceAfter: user.wallet_balance,
          status: 'COMPLETED',
          description: `Thanh toán ${qty}x ${prod.title}`,
          createdAt: serverRes.order.created_at || new Date().toISOString(),
        };
        txs.unshift(purchaseTx);
        localStorage.setItem('wcg_admin_transactions_v4', JSON.stringify(txs.slice(0, 500)));
      } catch {}

      this.syncWithCloudflareKV();
      this.notifyListeners();

      return {
        success: true,
        order: serverRes.order,
        message: serverRes.message || `Thanh toán thành công ${qty} sản phẩm! Đã giao hàng tức thì.`,
      };
    }

    return {
      success: false,
      message: serverRes?.message || 'Không thể tạo đơn hàng tiện ích lúc này. Vui lòng thử lại sau.',
    };
  }

  // Multi-tier storage persistence for authenticated user sessions
  public persistUserMultiTier(user: UserProfile): void {
    if (typeof window === 'undefined' || !user || !user.id) return;
    try {
      const userStr = JSON.stringify(user);
      localStorage.setItem(this.USER_KEY, userStr);
      localStorage.setItem('wcg_persistent_account', userStr);
      sessionStorage.setItem(this.USER_KEY, userStr);

      const token =
        user.session_token ||
        localStorage.getItem('wcg_auth_token') ||
        sessionStorage.getItem('wcg_auth_token');
      if (token) {
        localStorage.setItem('wcg_auth_token', token);
        sessionStorage.setItem('wcg_auth_token', token);
      }

      // Set 365-day persistent cookie to survive browser restarts, mobile memory purges, and WebViews
      if (typeof document !== 'undefined') {
        const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
        document.cookie = `wcg_auth_user=${encodeURIComponent(userStr)}; expires=${expires}; path=/; SameSite=Lax`;
        if (token) {
          document.cookie = `wcg_auth_token=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax`;
        }
      }
    } catch {}
  }

  public clearUserMultiTier(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem('wcg_persistent_account');
      localStorage.removeItem('wcg_auth_token');
      localStorage.removeItem('wcg_remember_login');
      sessionStorage.removeItem(this.USER_KEY);
      sessionStorage.removeItem('wcg_auth_token');

      if (typeof document !== 'undefined') {
        document.cookie = 'wcg_auth_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
        document.cookie = 'wcg_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
      }
    } catch {}
  }

  // --- USER AUTH & WALLET ---
  getCurrentUser(): UserProfile | null {
    try {
      let data = typeof localStorage !== 'undefined' ? localStorage.getItem(this.USER_KEY) : null;
      if (!data && typeof localStorage !== 'undefined') {
        data = localStorage.getItem('wcg_persistent_account');
      }
      if (!data && typeof sessionStorage !== 'undefined') {
        data = sessionStorage.getItem(this.USER_KEY);
      }
      if (!data && typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)wcg_auth_user=([^;]+)/);
        if (match) {
          try {
            data = decodeURIComponent(match[1]);
          } catch {}
        }
      }
      if (!data) return null;
      const user: UserProfile = JSON.parse(data);
      if (!user || !user.id) return null;

      const resetFlag = 'wcg_user_wallet_zero_v1';
      if (typeof localStorage !== 'undefined' && !localStorage.getItem(resetFlag)) {
        if (user && user.wallet_balance !== 0) {
          user.wallet_balance = 0;
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        localStorage.setItem(resetFlag, 'true');
      }

      // Auto-heal all storage tiers so they remain in sync
      this.persistUserMultiTier(user);
      return user;
    } catch {
      return null;
    }
  }

  saveCurrentUser(user: UserProfile | null): void {
    if (user) {
      if (!user.session_token && typeof localStorage !== 'undefined') {
        let savedToken =
          localStorage.getItem('wcg_auth_token') ||
          sessionStorage.getItem('wcg_auth_token');
        if (!savedToken && typeof document !== 'undefined') {
          const match = document.cookie.match(/(?:^|;\s*)wcg_auth_token=([^;]+)/);
          if (match) {
            try {
              savedToken = decodeURIComponent(match[1]);
            } catch {}
          }
        }
        if (savedToken) user.session_token = savedToken;
      }
      this.persistUserMultiTier(user);

      // Instant event dispatch to keep React header and UI in sync in 0 seconds
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wcg_user_updated', { detail: user }));
        try {
          const bc = new BroadcastChannel('wcg_data_sync');
          bc.postMessage({ type: 'wcg_user_updated', user });
          bc.close();
        } catch {}
      }

      // Synchronize directly into Admin Members collection & push to Cloudflare KV
      try {
        const membersRaw = localStorage.getItem('wcg_admin_members_v4');
        let members: any[] = membersRaw ? JSON.parse(membersRaw) : [];
        const cleanUserId = (user.id || '').trim();
        const cleanEmail = (user.email || '').trim().toLowerCase();

        const existingIdx = members.findIndex(
          (m) =>
            (cleanUserId && m.id && m.id === cleanUserId) ||
            (cleanEmail && m.email && m.email.trim().toLowerCase() === cleanEmail)
        );

        const now = new Date().toISOString();
        if (existingIdx >= 0) {
          members[existingIdx] = {
            ...members[existingIdx],
            displayName: user.displayName || user.username || members[existingIdx].displayName,
            email: user.email || members[existingIdx].email,
            phone: user.phone || members[existingIdx].phone || '',
            balance: user.wallet_balance !== undefined ? user.wallet_balance : members[existingIdx].balance,
            avatar: user.avatar_url || members[existingIdx].avatar,
            sessionToken: user.session_token || members[existingIdx].sessionToken || members[existingIdx].session_token,
            session_token: user.session_token || members[existingIdx].session_token || members[existingIdx].sessionToken,
            lastLogin: now,
          };
        } else {
          members.unshift({
            id: user.id,
            displayName: user.displayName || user.username,
            email: user.email || `${user.username}@webcodegame.vn`,
            phone: user.phone || '',
            role: user.role === 'admin' ? 'ADMIN' : user.role === 'VIP' ? 'VIP' : 'MEMBER',
            balance: user.wallet_balance || 0,
            totalSpent: 0,
            status: 'ACTIVE',
            avatar: user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username || user.id)}`,
            sessionToken: user.session_token,
            session_token: user.session_token,
            createdAt: user.created_at || now,
            lastLogin: now,
          });
        }

        localStorage.setItem('wcg_admin_members_v4', JSON.stringify(members));
      } catch {}
    } else {
      this.clearUserMultiTier();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wcg_user_updated', { detail: null }));
        try {
          const bc = new BroadcastChannel('wcg_data_sync');
          bc.postMessage({ type: 'wcg_user_updated', user: null });
          bc.close();
        } catch {}
      }
    }
  }

  topupWallet(amount: number): number {
    const user = this.getCurrentUser() || {
      id: `usr_${Date.now()}`,
      username: 'GameThuvn',
      email: 'member@webcodegame.vn',
      role: 'user',
      wallet_balance: 0,
    };
    const balanceBefore = user.wallet_balance;
    user.wallet_balance += amount;
    this.saveCurrentUser(user);

    // Save transaction & sync to Cloudflare KV
    try {
      const txsRaw = localStorage.getItem('wcg_admin_transactions_v4');
      const txs = txsRaw ? JSON.parse(txsRaw) : [];
      const newTx = {
        id: `tx_${Date.now()}`,
        referenceId: `TOPUP-${Date.now().toString().slice(-6)}`,
        memberId: user.id,
        memberEmail: user.email,
        type: 'DEPOSIT',
        amount,
        balanceBefore,
        balanceAfter: user.wallet_balance,
        status: 'COMPLETED',
        note: 'Nạp tiền vào ví tài khoản',
        createdAt: new Date().toISOString(),
      };
      txs.unshift(newTx);
      localStorage.setItem('wcg_admin_transactions_v4', JSON.stringify(txs));
      this.pushToCloudflareKV('wcg_admin_transactions_v4', txs);
    } catch {}

    return user.wallet_balance;
  }

  // Bookmarks
  getBookmarks(): string[] {
    try {
      const data = localStorage.getItem(this.BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  toggleBookmark(gameId: string): { isBookmarked: boolean; bookmarks: string[] } {
    try {
      const current = this.getBookmarks();
      const index = current.indexOf(gameId);
      let next: string[];
      let isBookmarked: boolean;

      if (index >= 0) {
        next = current.filter((id) => id !== gameId);
        isBookmarked = false;
      } else {
        next = [...current, gameId];
        isBookmarked = true;
      }

      localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(next));
      return { isBookmarked, bookmarks: next };
    } catch {
      return { isBookmarked: false, bookmarks: [] };
    }
  }

  // Code Votes
  voteCode(codeValue: string, voteType: 'up' | 'down', isExpiredStatus: boolean = false): { up: number; down: number } {
    try {
      const votes = this.getLocalVotes();
      const current = votes[codeValue] || { up: 0, down: 0 };
      if (voteType === 'up') current.up += 1;
      else current.down += 1;
      votes[codeValue] = current;
      localStorage.setItem(this.VOTES_KEY, JSON.stringify(votes));
      const base = marketingService.getSimulatedVotes(codeValue, isExpiredStatus);
      return {
        up: base.up + current.up,
        down: base.down + current.down,
      };
    } catch {
      return { up: 1, down: 0 };
    }
  }

  getCodeVotes(codeValue: string, isExpiredStatus: boolean = false): { up: number; down: number } {
    const votes = this.getLocalVotes();
    const current = votes[codeValue] || { up: 0, down: 0 };
    const base = marketingService.getSimulatedVotes(codeValue, isExpiredStatus);
    return {
      up: base.up + current.up,
      down: base.down + current.down,
    };
  }

  // Submitting Custom Code & Pushing to Admin Moderation Queue
  submitCode(
    gameSlug: string,
    code: string,
    rewards: string,
    submitterName?: string,
    submitterEmail?: string
  ): boolean {
    if (!gameSlug || !code) return false;
    const cleanCode = code.trim().toUpperCase();
    const cleanRewards = rewards.trim() || 'Mã đóng góp từ cộng đồng';

    // 1. Add to local custom codes for instant visual feedback
    const customCodes = this.getLocalCustomCodes();
    const list = customCodes[gameSlug] || [];
    const newCode: GiftCode = {
      code: cleanCode,
      rewards: cleanRewards,
      status: 'verified',
      added_at: new Date().toISOString(),
    };
    customCodes[gameSlug] = [newCode, ...list];
    localStorage.setItem(this.CUSTOM_CODES_KEY, JSON.stringify(customCodes));

    const existing = this.codesMap.get(gameSlug) || [];
    this.codesMap.set(gameSlug, [newCode, ...existing]);

    const game = this.games.find((g) => g.slug === gameSlug);
    if (game) {
      game.codes_count = (game.codes_count || 0) + 1;
      game.codes = [newCode, ...(game.codes || [])];
    }

    // 2. Queue into Admin Moderation Submissions and sync to Cloudflare KV
    try {
      const subsRaw = localStorage.getItem('wcg_admin_submissions_v4');
      const submissions = subsRaw ? JSON.parse(subsRaw) : [];
      const newSub = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        codeValue: cleanCode,
        gameSlug,
        submitterName: submitterName || 'Game thủ Cộng đồng',
        submitterEmail: submitterEmail || 'user@webcodegame.vn',
        rewards: cleanRewards,
        status: 'PENDING',
        notes: 'Đóng góp trực tuyến từ web khách',
        submittedAt: new Date().toISOString(),
      };
      submissions.unshift(newSub);
      localStorage.setItem('wcg_admin_submissions_v4', JSON.stringify(submissions));
      this.pushToCloudflareKV('wcg_admin_submissions_v4', submissions);
    } catch {}

    return true;
  }

  // Announcement Banner
  getAnnouncementBanner(): { id: string; title: string; content: string; isActive: boolean } | null {
    try {
      const saved = localStorage.getItem('wcg_admin_content_v4');
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          const banner = items.find((i: any) => i.key === 'announcement_banner' || i.type === 'ANNOUNCEMENT');
          if (banner) {
            return {
              id: banner.id || 'announcement_banner',
              title: banner.title !== undefined ? banner.title : '🎁 Sự Kiện Tân Thủ: Đăng ký nhận ngay 50.000đ vào ví trải nghiệm!',
              content: banner.content !== undefined ? banner.content : 'Khuyến mãi nạp đầu tặng 20% giá trị qua cổng SePay MBBank.',
              isActive: banner.isActive !== false,
            };
          }
        }
      }
    } catch {}
    return {
      id: 'default_banner',
      title: '🎁 Sự Kiện Tân Thủ: Đăng ký nhận ngay 50.000đ vào ví trải nghiệm!',
      content: 'Khuyến mãi nạp đầu tặng 20% giá trị qua cổng SePay MBBank.',
      isActive: true,
    };
  }

  // Dynamic CMS Content (Hero, Giveaways, Store, Utilities, Terms, Privacy Policy, Footer)
  getContentByKey(key: string): { title: string; content: string; extraData?: any; isActive?: boolean } | null {
    try {
      const saved = localStorage.getItem('wcg_admin_content_v4');
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          const item = items.find((i: any) => i.key === key);
          if (item) {
            return {
              title: item.title,
              content: item.content,
              extraData: item.extraData,
              isActive: item.isActive !== false,
            };
          }
        }
      }
    } catch {}
    return null;
  }

  // Floating Announcement Widget Config
  getFloatingNotificationConfig(): FloatingNotificationConfig {
    try {
      const item = this.getContentByKey('floating_notification');
      if (item) {
        const extra = item.extraData && typeof item.extraData === 'object' ? item.extraData : {};
        return {
          ...DEFAULT_FLOATING_NOTIFICATION,
          ...extra,
          enabled: item.isActive !== false,
          title: item.title || DEFAULT_FLOATING_NOTIFICATION.title,
          message: item.content || DEFAULT_FLOATING_NOTIFICATION.message,
          updatedAt: (extra as any).updatedAt || new Date().toISOString(),
        };
      }
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('wcg_admin_floating_notification_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...DEFAULT_FLOATING_NOTIFICATION, ...parsed };
        }
      }
    } catch {}
    return { ...DEFAULT_FLOATING_NOTIFICATION };
  }

  // Website Branding & Media Assets (Logo, Avatar/Favicon, Background)
  getWebsiteBranding(): {
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

    try {
      const saved = localStorage.getItem('wcg_admin_content_v4');
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          const branding = items.find((i: any) => i.key === 'website_branding');
          const footer = items.find((i: any) => i.key === 'footer_support');

          const footerTitle = footer?.extraData?.brandTitle?.trim();
          const footerLogo = footer?.extraData?.brandLogo?.trim();

          const isLegacyOrEmpty = (t?: string | null) => {
            if (!t) return true;
            const s = t.trim().toUpperCase();
            return !s || s === 'WEB CODE GAME' || s === 'WEB CODE' || s === 'WEB CODE GAME 2026';
          };

          const rawBTitle = branding?.title?.trim();
          const rawFTitle = footer?.extraData?.brandTitle?.trim();

          const effectiveTitle = !isLegacyOrEmpty(rawBTitle)
            ? rawBTitle!
            : !isLegacyOrEmpty(rawFTitle)
            ? rawFTitle!
            : 'CodeGame.Shop';

          // Auto-migrate legacy cache in localStorage if needed
          if (branding && isLegacyOrEmpty(branding.title)) {
            branding.title = effectiveTitle;
            try {
              localStorage.setItem('wcg_admin_content_v4', JSON.stringify(items));
            } catch {}
          }

          const bLogo = branding?.extraData?.logoUrl?.trim();
          const effectiveLogo =
            bLogo && bLogo !== '/logo.png'
              ? bLogo
              : footerLogo && footerLogo !== '/logo.png'
              ? footerLogo
              : bLogo || footerLogo || '/logo.png';

          return {
            logoUrl: effectiveLogo,
            avatarUrl: branding?.extraData?.avatarUrl || '/logo.png',
            backgroundUrl: branding?.extraData?.backgroundUrl || defaultBg,
            backgroundStyle: branding?.extraData?.backgroundStyle || 'ambient',
            backgroundOpacity: branding?.extraData?.backgroundOpacity ?? 0.35,
            siteTitle: effectiveTitle,
            portalSubtitle: branding?.extraData?.portalSubtitle || 'Cổng Tra Cứu Giftcode #1',
          };
        }
      }
    } catch {}
    return {
      logoUrl: '/logo.png',
      avatarUrl: '/logo.png',
      backgroundUrl: defaultBg,
      backgroundStyle: 'ambient',
      backgroundOpacity: 0.35,
      siteTitle: 'CodeGame.Shop',
      portalSubtitle: 'Cổng Tra Cứu Giftcode #1',
    };
  }

  // Website Pagination Configuration (Classic Numbered Pages vs Infinite Scroll)
  getPaginationConfig(): { mode: 'classic' | 'infinite'; pageSize: number } {
    try {
      const saved = localStorage.getItem('wcg_admin_content_v4');
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          const item = items.find((i: any) => i.key === 'catalog_pagination' || i.key === 'pagination_config');
          if (item && item.extraData) {
            return {
              mode: item.extraData.mode === 'infinite' ? 'infinite' : 'classic',
              pageSize: Number(item.extraData.pageSize) || 24,
            };
          }
        }
      }
    } catch {}
    return {
      mode: 'classic',
      pageSize: 24,
    };
  }

  // Private Codes for logged-in user
  getPrivateCodesForEmail(email?: string): any[] {
    if (!email) return [];
    try {
      const saved = localStorage.getItem('wcg_admin_private_codes_v4');
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          return items.filter(
            (i: any) => i.memberEmail && i.memberEmail.toLowerCase() === email.toLowerCase()
          );
        }
      }
    } catch {}
    return [];
  }

  // SePay Configuration
  getSePayConfig(): {
    apiKey?: string;
    bankAccount?: string;
    accountNumber?: string;
    bankName?: string;
    paymentPrefix?: string;
    autoCreditCoreRatio?: number;
  } {
    try {
      const saved = localStorage.getItem('wcg_admin_sepay_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const isDummy = !parsed.accountNumber || parsed.accountNumber === '0987654321';
          return {
            apiKey: parsed.apiKey || '',
            bankAccount: isDummy ? 'CODE GAME SHOP' : (parsed.bankAccount || 'CODE GAME SHOP'),
            accountNumber: isDummy ? '10004681879' : (parsed.accountNumber || '10004681879'),
            bankName: isDummy ? 'TPBank' : (parsed.bankName || 'TPBank'),
            paymentPrefix: parsed.paymentPrefix || 'WCG',
            autoCreditCoreRatio: parsed.autoCreditCoreRatio || 1,
          };
        }
      }
    } catch {}
    return {
      apiKey: '',
      bankAccount: 'CODE GAME SHOP',
      accountNumber: '10004681879',
      bankName: 'TPBank',
      paymentPrefix: 'WCG',
      autoCreditCoreRatio: 1,
    };
  }

  // Check if a deposit has been confirmed by SePay for the current user
  async checkUserDepositStatus(userId: string): Promise<{ confirmed: boolean; transaction?: any; newBalance?: number }> {
    await this.syncWithCloudflareKV();
    const cleanUserId = (userId || '').trim();
    const normUserId = cleanUserId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const currentUser = this.getCurrentUser();
    const cleanEmail = (currentUser?.email || '').trim().toLowerCase();

    try {
      const txsRaw = localStorage.getItem('wcg_admin_transactions_v4');
      if (txsRaw) {
        const txs: any[] = JSON.parse(txsRaw);
        if (Array.isArray(txs)) {
          // 1. Get ALL transactions for this user (both DEPOSIT and ORDER/PURCHASE), sorted newest first
          const allUserTxs = txs
            .filter((t) => {
              if (!t || t.status !== 'COMPLETED') return false;
              const tEmail = (t.memberEmail || '').trim().toLowerCase();
              const tId = (t.memberId || '').trim();
              const normTId = tId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
              const matchesEmail = cleanEmail && tEmail && tEmail === cleanEmail;
              const matchesId =
                (cleanUserId && tId && tId === cleanUserId) ||
                (normUserId && normTId && normUserId === normTId);
              return Boolean(matchesEmail || matchesId);
            })
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          if (allUserTxs.length > 0 && currentUser) {
            const latestTx = allUserTxs[0];
            const latestTxBal = Number(latestTx.balanceAfter);

            // If the latest transaction overall is a DEPOSIT, check if it's a new confirmed top-up
            if (latestTx.type === 'DEPOSIT') {
              const currentBal = Number(currentUser.wallet_balance || 0);
              if (!isNaN(latestTxBal) && latestTxBal > currentBal) {
                currentUser.wallet_balance = latestTxBal;
                this.saveCurrentUser(currentUser);
                this.notifyListeners();
                return { confirmed: true, transaction: latestTx, newBalance: latestTxBal };
              }
            } else if (!isNaN(latestTxBal) && currentUser.wallet_balance !== latestTxBal) {
              // The latest transaction is an ORDER / PURCHASE — ensure local balance strictly matches the latest transaction ledger balance!
              currentUser.wallet_balance = latestTxBal;
              this.saveCurrentUser(currentUser);
              this.notifyListeners();
            }
          }
        }
      }
    } catch {}

    return { confirmed: false };
  }

  // Get deposit transaction history for user
  getUserDepositTransactions(userId?: string, userEmail?: string): any[] {
    const u = this.getCurrentUser();
    if (!userId && !userEmail) {
      if (!u) return [];
      userId = u.id;
      userEmail = u.email;
    }
    const cleanUserId = (userId || u?.id || '').trim();
    const normUserId = cleanUserId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanEmail = (userEmail || u?.email || '').trim().toLowerCase();
    const cleanUsername = (u?.username || '').trim().toLowerCase();

    try {
      const txsRaw = localStorage.getItem('wcg_admin_transactions_v4');
      if (txsRaw) {
        const txs: any[] = JSON.parse(txsRaw);
        if (Array.isArray(txs)) {
          return txs
            .filter((t) => {
              if (!t || String(t.type || '').toUpperCase() !== 'DEPOSIT') return false;
              const tEmail = String(t.memberEmail || t.userEmail || t.email || '').trim().toLowerCase();
              const tId = String(t.memberId || t.userId || t.user_id || '').trim();
              const normTId = tId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
              const tUsername = String(t.memberUsername || t.username || '').trim().toLowerCase();

              const matchesEmail = cleanEmail && tEmail && tEmail === cleanEmail;
              const matchesId =
                (cleanUserId && tId && tId === cleanUserId) ||
                (normUserId && normTId && normUserId === normTId);
              const matchesUser = cleanUsername && tUsername && tUsername === cleanUsername;
              return Boolean(matchesEmail || matchesId || matchesUser);
            })
            .sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());
        }
      }
    } catch {}
    return [];
  }

  // Refresh current user's balance from Cloudflare Edge and local transactions
  async refreshCurrentUserBalance(): Promise<number> {
    const user = this.getCurrentUser();
    if (!user || !user.id) return 0;

    // 1. Cloudflare Edge / KV live query via /api/auth/me (only for authenticated registered members).
    // FIX: Always call /api/auth/me first for registered users — local cache may be stale after
    // a SePay webhook has updated KV on the server side but localStorage hasn't been updated yet.
    const token =
      (typeof localStorage !== 'undefined' ? localStorage.getItem('wcg_auth_token') : null) ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('wcg_auth_token') : null) ||
      user.session_token;

    // Guest users don't have session tokens — use local balance only
    if (!token || user.id.startsWith('guest_') || user.role === 'guest') {
      return user.wallet_balance || 0;
    }

    const isLocalhost = typeof window !== 'undefined' && (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'));
    const endpoint = isLocalhost ? 'https://codegame.shop/api/auth/me' : '/api/auth/me';

    try {
      const res = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store',
          'X-Member-Id': user.id || '',
          'X-Member-Email': user.email || '',
        },
      });
      if (res.status === 403) {
        // Account banned
        this.clearUserMultiTier();
        this.notifyListeners();
        return 0;
      }

      if (res.status === 401) {
        const errData = await res.json().catch(() => null);
        if (errData?.message?.includes('Mật khẩu') || errData?.message?.includes('mật khẩu')) {
          this.clearUserMultiTier();
          this.notifyListeners();
          return 0;
        }
      }

      if (res.ok) {
        const data = await res.json();
          if (data?.success && data?.user && (data.user.id === user.id || data.user.email?.toLowerCase() === user.email?.toLowerCase())) {
            if (data.token) {
              user.session_token = data.token;
              this.persistUserMultiTier(user);
            }
            const updatedBal = Number(data.user.wallet_balance) || 0;
            let changed = false;
            if (user.wallet_balance !== updatedBal) {
              user.wallet_balance = updatedBal;
              changed = true;
            }
            if (data.user.role && user.role !== data.user.role) {
              user.role = data.user.role;
              changed = true;
            }

            // Sync User's Private Codes from Cloudflare KV
            if (Array.isArray(data.privateCodes) && data.privateCodes.length > 0) {
              try {
                const privRaw = localStorage.getItem('wcg_admin_private_codes_v4');
                let existingPriv: any[] = privRaw ? JSON.parse(privRaw) : [];
                const privMap = new Map<string, any>();
                existingPriv.forEach((p) => p?.id && privMap.set(p.id, p));
                data.privateCodes.forEach((p: any) => p?.id && privMap.set(p.id, p));
                localStorage.setItem('wcg_admin_private_codes_v4', JSON.stringify(Array.from(privMap.values())));
                changed = true;
              } catch {}
            }

            // Sync User's Orders from Cloudflare KV
            if (Array.isArray(data.orders) && data.orders.length > 0) {
              try {
                const ordRaw = localStorage.getItem(this.ORDERS_KEY);
                let existingOrd: any[] = ordRaw ? JSON.parse(ordRaw) : [];
                const ordMap = new Map<string, any>();
                existingOrd.forEach((o) => (o?.id || o?.orderCode) && ordMap.set(o.id || o.orderCode, o));
                data.orders.forEach((o: any) => {
                  const oKey = o?.orderCode || o?.id;
                  if (oKey) {
                    ordMap.set(oKey, {
                      id: oKey,
                      product_id: o.productId || o.utilityId || o.id,
                      product_title: o.productTitle || o.title,
                      game_name: o.gameName || 'Hệ thống',
                      amount: o.amount,
                      quantity: o.quantity || 1,
                      unit_price: o.unitPrice || o.amount,
                      code_content: Array.isArray(o.deliveredCodes) ? o.deliveredCodes.join('\n') : (o.deliveredCodes || ''),
                      code_items: Array.isArray(o.deliveredCodes) ? o.deliveredCodes : [o.deliveredCodes].filter(Boolean),
                      status: (o.status || 'COMPLETED').toLowerCase(),
                      created_at: o.createdAt || new Date().toISOString(),
                      payment_method: 'wallet',
                    });
                  }
                });
                localStorage.setItem(this.ORDERS_KEY, JSON.stringify(Array.from(ordMap.values())));
                changed = true;
              } catch {}
            }

            // Sync User's Wallet Transactions from Cloudflare KV
            if (Array.isArray(data.transactions) && data.transactions.length > 0) {
              try {
                const txRaw = localStorage.getItem('wcg_admin_transactions_v4');
                let existingTx: any[] = txRaw ? JSON.parse(txRaw) : [];
                const txMap = new Map<string, any>();
                existingTx.forEach((t) => t?.id && txMap.set(t.id, t));
                data.transactions.forEach((t: any) => t?.id && txMap.set(t.id, t));
                const mergedTxs = Array.from(txMap.values()).sort(
                  (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                );
                localStorage.setItem('wcg_admin_transactions_v4', JSON.stringify(mergedTxs));
                changed = true;
              } catch {}
            }

            // Sync User's Giveaway Claims from Cloudflare D1
            if (Array.isArray(data.giveawayClaims) && data.giveawayClaims.length > 0) {
              try {
                const claimRaw = localStorage.getItem(this.CLAIMED_CODES_KEY);
                let existingClaims: any[] = claimRaw ? JSON.parse(claimRaw) : [];
                const claimMap = new Map<string, any>();
                
                const getClaimUniqueKey = (c: any) => {
                  if (!c) return '';
                  const campId = String(c.campaign_id || '').trim();
                  const codeVal = String(c.code_value || '').trim().toUpperCase();
                  if (campId && codeVal) return `${campId}_${codeVal}`;
                  return c.id ? String(c.id).trim() : '';
                };

                existingClaims.forEach((c) => {
                  const key = getClaimUniqueKey(c);
                  if (key) claimMap.set(key, c);
                });

                data.giveawayClaims.forEach((c: any) => {
                  const key = getClaimUniqueKey(c);
                  if (key) {
                    const existing = claimMap.get(key);
                    claimMap.set(key, {
                      id: c.id || existing?.id || `claim_${Date.now()}`,
                      campaign_id: c.campaign_id || existing?.campaign_id,
                      game_name: c.game_name || existing?.game_name || 'Sự Kiện',
                      game_slug: c.game_slug || existing?.game_slug || '',
                      game_icon_url: c.game_icon_url || existing?.game_icon_url || '',
                      code_value: c.code_value || existing?.code_value,
                      rewards: c.rewards || existing?.rewards || 'Quà tặng sự kiện',
                      claimed_at: c.claimed_at || existing?.claimed_at || new Date().toISOString(),
                    });
                  }
                });

                const mergedClaims = Array.from(claimMap.values()).sort(
                  (a, b) => new Date(b.claimed_at || 0).getTime() - new Date(a.claimed_at || 0).getTime()
                );
                localStorage.setItem(this.CLAIMED_CODES_KEY, JSON.stringify(mergedClaims));
                changed = true;
              } catch {}
            }

            if (changed) {
              this.saveCurrentUser(user);
              this.notifyListeners();
            }
            return updatedBal;
          }
        }
      } catch {}

    // 2. Check recent transactions fallback
    const checkRes = await this.checkUserDepositStatus(user.id);
    if (checkRes.confirmed && checkRes.newBalance !== undefined) {
      return checkRes.newBalance;
    }

    return user.wallet_balance || 0;
  }

  private getLocalVotes(): Record<string, { up: number; down: number }> {
    try {
      const data = localStorage.getItem(this.VOTES_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private getLocalCustomCodes(): Record<string, GiftCode[]> {
    try {
      const data = localStorage.getItem(this.CUSTOM_CODES_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public applyFullStateSnapshot(snapshot: any): void {
    if (!snapshot || typeof snapshot !== 'object') return;
    try {
      if (Array.isArray(snapshot.storeProducts)) {
        localStorage.setItem(this.STORE_PRODUCTS_KEY, JSON.stringify(snapshot.storeProducts));
        localStorage.setItem('wcg_admin_store_products_v4', JSON.stringify(snapshot.storeProducts));
      }
      if (Array.isArray(snapshot.utilities)) {
        localStorage.setItem(this.UTILITIES_KEY, JSON.stringify(snapshot.utilities));
        localStorage.setItem('wcg_admin_utilities_v4', JSON.stringify(snapshot.utilities));
      }
      if (Array.isArray(snapshot.deletedStoreProducts)) {
        localStorage.setItem('wcg_deleted_store_products', JSON.stringify(snapshot.deletedStoreProducts));
      }
      if (Array.isArray(snapshot.deletedUtilities)) {
        localStorage.setItem('wcg_deleted_utilities', JSON.stringify(snapshot.deletedUtilities));
      }
      if (Array.isArray(snapshot.games) && snapshot.games.length > 0) {
        localStorage.setItem('wcg_admin_games_v5', JSON.stringify(snapshot.games));
      }
      if (Array.isArray(snapshot.freeCodes) && snapshot.freeCodes.length > 0) {
        try {
          const codesStr = JSON.stringify(snapshot.freeCodes);
          if (codesStr.length <= 1.5 * 1024 * 1024) {
            localStorage.setItem('wcg_admin_free_codes_v5', codesStr);
          }
        } catch {}
      }
      if (Array.isArray(snapshot.customFreeCodes)) {
        localStorage.setItem('wcg_admin_custom_free_codes_v1', JSON.stringify(snapshot.customFreeCodes));
      }
      if (Array.isArray(snapshot.deletedFreeCodes)) {
        localStorage.setItem('wcg_deleted_free_codes', JSON.stringify(snapshot.deletedFreeCodes));
      }
      if (Array.isArray(snapshot.giveaways)) {
        localStorage.setItem(this.GIVEAWAYS_KEY, JSON.stringify(snapshot.giveaways));
        localStorage.setItem('wcg_admin_giveaways_v4', JSON.stringify(snapshot.giveaways));
      }
      if (Array.isArray(snapshot.content) && snapshot.content.length > 0) {
        localStorage.setItem('wcg_admin_content_v4', JSON.stringify(snapshot.content));
      }
      if (Array.isArray(snapshot.inventory)) {
        localStorage.setItem('wcg_admin_inventory_v4', JSON.stringify(snapshot.inventory));
      }
      if (snapshot.sepay && typeof snapshot.sepay === 'object') {
        localStorage.setItem('wcg_admin_sepay_v4', JSON.stringify(snapshot.sepay));
      }
      if (Array.isArray(snapshot.orders)) {
        localStorage.setItem(this.ORDERS_KEY, JSON.stringify(snapshot.orders));
        localStorage.setItem('wcg_admin_orders_v4', JSON.stringify(snapshot.orders));
      }
      if (Array.isArray(snapshot.transactions)) {
        localStorage.setItem('wcg_admin_transactions_v4', JSON.stringify(snapshot.transactions));
      }
      if (Array.isArray(snapshot.members)) {
        localStorage.setItem('wcg_admin_members_v4', JSON.stringify(snapshot.members));
      }
      if (snapshot.marketingConfig && typeof snapshot.marketingConfig === 'object') {
        localStorage.setItem('wcg_marketing_config_v1', JSON.stringify(snapshot.marketingConfig));
        window.dispatchEvent(new CustomEvent('wcg_marketing_config_updated', { detail: snapshot.marketingConfig }));
      }
      if (Array.isArray(snapshot.storeCategories)) {
        localStorage.setItem('wcg_admin_store_categories_v1', JSON.stringify(snapshot.storeCategories));
      }
      if (Array.isArray(snapshot.utilityCategories)) {
        localStorage.setItem('wcg_admin_utility_categories_v1', JSON.stringify(snapshot.utilityCategories));
      }
      if (Array.isArray(snapshot.newsArticles)) {
        let deletedSet = new Set<string>();
        try {
          const delRaw = localStorage.getItem('wcg_deleted_news_articles_v1');
          if (delRaw) {
            const p = JSON.parse(delRaw);
            if (Array.isArray(p)) deletedSet = new Set(p.map(String));
          }
        } catch {}
        const cleanArticles = snapshot.newsArticles.filter(
          (a: any) => !deletedSet.has(a.id) && !deletedSet.has(a.slug)
        );
        localStorage.setItem('wcg_news_articles_v1', JSON.stringify(cleanArticles));
        newsService.applyServerSnapshot(cleanArticles, snapshot.newsAutoSources, snapshot.newsScheduleConfig);
        window.dispatchEvent(new CustomEvent('wcg_news_updated', { detail: cleanArticles }));
      }

      localStorage.setItem('wcg_store_initialized', 'true');
      console.log('[DataService] Applied full state snapshot successfully');
      this.reload();
      this.notifyListeners();
    } catch (e) {
      console.error('Error applying snapshot:', e);
    }
  }
}

export const dataService = new DataService();
