/**
 * Serverless Virtual Layer Engine (Two-Layer SSOT Architecture)
 * 
 * 1. LỚP GỐC (Dữ liệu thật): Đơn thật, bán thật, tồn thật, claim thật.
 *    Bảo toàn 100% trong D1 (orders, inventory_codes, store_products, utilities, giveaways).
 *    Mọi hoạt động ảo TUYỆT ĐỐI KHÔNG ghi đè, sửa đổi hay xoá dữ liệu gốc.
 * 
 * 2. LỚP ẢO (Thống kê riêng): Bán ảo, bộ đệm ảo (virtual_buffer), claim ảo, restock ảo.
 *    Lưu trữ trong bảng riêng: wcg_virtual_aggregates & wcg_virtual_events.
 *    Gộp số hiển thị lúc đọc:
 *      - display_sold = real_sold + virtual_sold
 *      - display_stock = real_stock > 0 ? (real_stock + virtual_buffer) : 0
 *      (Khi real_stock = 0 -> display_stock = 0, floor = tồn gốc).
 * 
 * 3. TIẾT KIỆM QUOTA CLOUDFLARE D1:
 *    - Không ghi D1 theo từng toast/sự kiện ảo.
 *    - Giữ aggregate và sự kiện trong Edge In-Memory / Cache API.
 *    - Flush theo lô (Batch Flush) mỗi 5 phút hoặc khi đủ 200 sự kiện ảo.
 *    - Cầu dao (Circuit Breaker) tự động ngắt D1 khi có cảnh báo hạn mức.
 */

import {
  loadVirtualAggregatesD1,
  batchFlushVirtualLayerD1,
  getSettingD1,
  VirtualAggregateRow,
  VirtualEventRow,
  isD1CircuitBreakerActive,
  recordD1Read,
  withD1Timeout,
} from './d1_service';
import { getRealEventsHub, maskServerName } from './realEventsHub';
import { PRESET_VIRTUAL_ACCOUNTS } from '../../src/services/marketingService';
import { maskSimulatedAccount } from './marketingAuditService';

export interface ProductVirtualState {
  productId: string;
  title: string;
  itemType: 'store' | 'utility';
  realSold: number;
  realStock: number;
  virtualSold: number;
  virtualBuffer: number;
  virtualRestockCount: number;
  autoRestockThreshold: number;
  autoRestockAmount: number;
  priority: string;
  lastRestockAt?: string;
}

export interface GiveawayVirtualState {
  campaignId: string;
  title: string;
  realClaimed: number;
  realRemaining: number;
  virtualClaimed: number;
  virtualRemainingBuffer: number;
  virtualRestockCount: number;
  autoRestockThreshold: number;
  autoRestockAmount: number;
  priority: string;
  lastRestockAt?: string;
}

export interface VirtualLayerState {
  date: string;
  initialized: boolean;
  lastInitializedAt: number;
  products: Map<string, ProductVirtualState>;
  giveaways: Map<string, GiveawayVirtualState>;
  masterCopy: {
    realClicks: number;
    virtualCopy: number;
    dailyMaxCopy: number;
    date: string;
  };
  recentVirtualEvents: VirtualEventRow[];
  pendingFlushEvents: VirtualEventRow[];
  dirtyAggregateIds: Set<string>;
  lastFlushTime: number;
  lastProcessedSlot: number;
}

export const CONVERSION_TABLE: Record<string, {
  name: string;
  target: 'product' | 'giveaway' | 'master_copy' | 'none';
  delta: { sold?: number; stock?: number; claimed?: number; remaining?: number; copyClicks?: number; restock?: number };
  description: string;
}> = {
  BUY_STORE: {
    name: 'Đơn hàng Cửa Hàng',
    target: 'product',
    delta: { sold: 1, stock: -1 },
    description: 'Số bán tăng +1, kho còn giảm -1 trên toàn bộ hệ thống.'
  },
  BUY_UTILITY: {
    name: 'Đơn hàng Tiện Ích',
    target: 'product',
    delta: { sold: 1, stock: -1 },
    description: 'Số bán tăng +1, kho còn giảm -1 trên toàn bộ hệ thống.'
  },
  CLAIM_GIVEAWAY: {
    name: 'Săn quà sự kiện Giveaway',
    target: 'giveaway',
    delta: { claimed: 1, remaining: -1 },
    description: 'Đã giật tăng +1, code còn giảm -1 trên toàn bộ hệ thống.'
  },
  COPY_CODE: {
    name: 'Sao chép mã Giftcode',
    target: 'master_copy',
    delta: { copyClicks: 1 },
    description: 'Lượt sao chép tăng +1 trên toàn bộ hệ thống.'
  },
  STATS_COPY: {
    name: 'Thống kê tổng lượt sao chép',
    target: 'master_copy',
    delta: { copyClicks: 1 },
    description: 'Cột mốc thống kê tương tác, lượt sao chép tăng +1.'
  },
  RESTOCK_PRODUCT: {
    name: 'Bổ sung tồn kho / code mới',
    target: 'product',
    delta: { restock: 20 },
    description: 'Kho còn hoặc code còn tăng thêm đúng mức cài đặt autoRestockAmount.'
  },
  DEPOSIT_WALLET: {
    name: 'Nạp tiền vào ví Core',
    target: 'none',
    delta: {},
    description: 'Chỉ hiển thị kích hoạt tương tác, KHÔNG làm thay đổi 5 bộ đếm hàng hóa.'
  },
};

export const SLOT_DURATION_MS = 10000; // 10s per deterministic time slot (Nhịp 10 giây cố định toàn hệ thống)
export const BATCH_FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const BATCH_FLUSH_EVENT_THRESHOLD = 200;

// Mốc thời gian neo và bảng snapshot số liệu lũy kế tại 15:33 25/10/2026 (trước khi triển khai bản 10 giây)
export const BASELINE_ANCHOR_TIME_MS = 1792917180000; // 15:33:00 25/10/2026 (GMT+7)

export interface ItemBaseline {
  virtualSold?: number;
  virtualBuffer?: number;
  virtualRestockCount?: number;
  virtualClaimed?: number;
  virtualRemainingBuffer?: number;
}

export const CUMULATIVE_BASELINES_20261025: Record<string, ItemBaseline> = {
  // Flagship Product VIP 7 Days VS Phone (ut_vs_05_vip_7d): tại 15:33 là 415 đã bán, 433 còn (8 thật + 425 buffer), 41 lần nhập lại
  'ut_vs_05_vip_7d': {
    virtualSold: 415,
    virtualBuffer: 425,
    virtualRestockCount: 41,
  },
  // 17 Utilities còn lại (mục đã bán có số lượng < 10, bổ sung ngẫu nhiên 32-212)
  'ut_vs_01_basic_1d': {
    virtualSold: 187,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_02_basic_7d': {
    virtualSold: 34,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_03_basic_30d': {
    virtualSold: 141,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_04_vip_1d': {
    virtualSold: 133,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_06_vip_30d': {
    virtualSold: 35,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_07_kvip_1d': {
    virtualSold: 132,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_08_kvip_7d': {
    virtualSold: 86,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_09_kvip_30d': {
    virtualSold: 123,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_10_svip_1d': {
    virtualSold: 161,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_11_svip_7d': {
    virtualSold: 42,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_12_svip_30d': {
    virtualSold: 150,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_13_xvip_1d': {
    virtualSold: 62,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_14_xvip_7d': {
    virtualSold: 99,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_15_xvip_30d': {
    virtualSold: 130,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_16_mvip_1d': {
    virtualSold: 209,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_17_mvip_7d': {
    virtualSold: 198,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
  'ut_vs_18_mvip_30d': {
    virtualSold: 204,
    virtualBuffer: 0,
    virtualRestockCount: 0,
  },
};

export function getVnDayAnchor(nowMs: number = Date.now()) {
  const vnDateStr = new Date(nowMs + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const dayStartMs = new Date(vnDateStr + 'T00:00:00+07:00').getTime();
  const currentSlotIndex = Math.max(0, Math.floor((nowMs - dayStartMs) / SLOT_DURATION_MS));
  return { vnDateStr, dayStartMs, currentSlotIndex };
}

const globalScope = globalThis as any;

if (!globalScope.__wcg_virtual_layer_state) {
  const { vnDateStr } = getVnDayAnchor();
  globalScope.__wcg_virtual_layer_state = {
    date: vnDateStr,
    initialized: false,
    lastInitializedAt: 0,
    products: new Map(),
    giveaways: new Map(),
    masterCopy: {
      realClicks: 0,
      virtualCopy: 0,
      dailyMaxCopy: 0,
      date: vnDateStr,
    },
    recentVirtualEvents: [],
    pendingFlushEvents: [],
    dirtyAggregateIds: new Set(),
    lastFlushTime: Date.now(),
    lastProcessedSlot: -1,
  } as VirtualLayerState;
}

function getLayerState(): VirtualLayerState {
  return globalScope.__wcg_virtual_layer_state;
}

function createPRNG(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Initialize / Refresh Virtual Layer State from D1 & SSOT
 */
export async function initializeVirtualLayer(env: any, forceRefresh: boolean = false): Promise<VirtualLayerState> {
  const state = getLayerState();
  const now = Date.now();
  const vnToday = new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);

  // Check day rollover for master copy
  if (state.date !== vnToday) {
    state.date = vnToday;
    state.masterCopy.realClicks = 0;
    state.masterCopy.virtualCopy = 0;
    state.masterCopy.dailyMaxCopy = 0;
    state.masterCopy.date = vnToday;
  }

  // Refresh every 2 minutes or upon cold start
  if (!forceRefresh && state.initialized && (now - state.lastInitializedAt < 120000)) {
    return state;
  }

  if (!env || !env.DB) {
    state.initialized = true;
    state.lastInitializedAt = now;
    return state;
  }

  try {
    // 1. Load Marketing Config for default bonuses and thresholds
    const mktConfigRaw = await getSettingD1(env.DB, 'wcg_marketing_config_v1').catch(() => null);
    let mktConfig: any = null;
    if (mktConfigRaw) {
      try { mktConfig = typeof mktConfigRaw === 'string' ? JSON.parse(mktConfigRaw) : mktConfigRaw; } catch {}
    }

    // 2. Load Real Products & Utilities with timeout
    const [spRows, utRows, gwRows, realHub] = await Promise.all([
      withD1Timeout(
        env.DB.prepare('SELECT id, title, stock_quantity, sold_count, virtual_sold_count, is_active FROM store_products WHERE is_active = 1').all().catch(() => ({ results: [] })),
        1000,
        { results: [] as any[] }
      ),
      withD1Timeout(
        env.DB.prepare('SELECT id, title, stock_quantity, sold_count, virtual_sold_count, is_active FROM utilities WHERE is_active = 1').all().catch(() => ({ results: [] })),
        1000,
        { results: [] as any[] }
      ),
      withD1Timeout(
        env.DB.prepare('SELECT id, title, remaining_codes, claimed_codes, virtual_claimed_offset, is_active FROM giveaways WHERE is_active = 1').all().catch(() => ({ results: [] })),
        1000,
        { results: [] as any[] }
      ),
      getRealEventsHub(env).catch(() => ({ masterCopyClicks: 0, realProductSoldCounts: {}, realGiveawayClaimedCounts: {} })),
    ]);

    // 3. Populate Products State
    const allProducts = [
      ...((spRows.results || []) as any[]).map(r => ({ ...r, itemType: 'store' as const })),
      ...((utRows.results || []) as any[]).map(r => ({ ...r, itemType: 'utility' as const })),
    ];

    for (const p of allProducts) {
      if (!p || !p.id) continue;
      const id = String(p.id);
      const pw = mktConfig?.productWeights?.[id] || {};
      const realStock = Math.max(0, Number(p.stock_quantity) || 0);
      const serverSold = Math.max(0, Number(p.sold_count) || 0);
      const hubSold = Number(realHub?.realProductSoldCounts?.[id]) || 0;
      const effectiveRealSold = Math.max(serverSold, hubSold);

      // Check existing virtual state in memory
      const memState = state.products.get(id);

      const defaultBonus = pw.virtualStockBonus !== undefined ? Number(pw.virtualStockBonus) : 20;
      const defaultThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
      const defaultRestock = Math.max(1, Number(pw.autoRestockAmount) || 20);
      const priority = pw.priority || 'normal';

      // Virtual buffer: seeded from FOMO config virtualStockBonus, floor = 0 if realStock = 0
      let virtualBuffer = realStock > 0 ? defaultBonus : 0;
      let virtualSold = 0;
      let restockCount = 0;
      let lastRestock = undefined;

      const baseline = CUMULATIVE_BASELINES_20261025[id];
      if (baseline && baseline.virtualSold !== undefined) {
        virtualSold = baseline.virtualSold;
        if (realStock > 0 && baseline.virtualBuffer !== undefined) {
          virtualBuffer = baseline.virtualBuffer;
        }
        if (baseline.virtualRestockCount !== undefined) {
          restockCount = baseline.virtualRestockCount;
        }
      } else if (p.virtual_sold_count !== undefined) {
        virtualSold = Math.max(0, Number(p.virtual_sold_count) || 0);
      }

      if (memState && state.lastProcessedSlot >= 0) {
        virtualSold = memState.virtualSold;
        virtualBuffer = memState.virtualBuffer;
        restockCount = memState.virtualRestockCount;
        lastRestock = memState.lastRestockAt;
      }

      // Business Rule: If realStock is 0, virtualBuffer must be 0
      if (realStock <= 0) {
        virtualBuffer = 0;
      }

      state.products.set(id, {
        productId: id,
        title: p.title || id,
        itemType: p.itemType,
        realSold: effectiveRealSold,
        realStock,
        virtualSold,
        virtualBuffer,
        virtualRestockCount: restockCount,
        autoRestockThreshold: defaultThreshold,
        autoRestockAmount: defaultRestock,
        priority,
        lastRestockAt: lastRestock,
      });
    }

    // 4. Populate Giveaways State
    for (const gw of ((gwRows.results || []) as any[])) {
      if (!gw || !gw.id) continue;
      const id = String(gw.id);
      const pw = mktConfig?.productWeights?.[id] || {};
      const realRemaining = Math.max(0, Number(gw.remaining_codes) || 0);
      const serverClaimed = Math.max(0, Number(gw.claimed_codes) || 0);
      const hubClaimed = Number(realHub?.realGiveawayClaimedCounts?.[id]) || 0;
      const effectiveRealClaimed = Math.max(serverClaimed, hubClaimed);

      const memState = state.giveaways.get(id);

      const defaultBonus = pw.virtualStockBonus !== undefined ? Number(pw.virtualStockBonus) : 20;
      const defaultThreshold = Math.max(1, Number(pw.autoRestockThreshold) || 1);
      const defaultRestock = Math.max(1, Number(pw.autoRestockAmount) || 20);
      const priority = pw.priority || 'normal';

      let virtualBuffer = realRemaining > 0 ? defaultBonus : 0;
      // BẢNG ADMIN LÀ CHÂN LÝ: Số ảo đã giật luôn lấy chính xác từ virtual_claimed_offset do Admin cấu hình
      const virtualClaimed = gw.virtual_claimed_offset !== undefined && gw.virtual_claimed_offset !== null
        ? Math.max(0, Number(gw.virtual_claimed_offset) || 0)
        : 0;
      let restockCount = 0;
      let lastRestock = undefined;

      if (memState && state.lastProcessedSlot >= 0) {
        // virtualClaimed luôn tuân thủ virtual_claimed_offset từ D1 (Admin cấu hình), không lấy cache phình to cũ trong RAM
        virtualBuffer = memState.virtualRemainingBuffer;
        restockCount = memState.virtualRestockCount;
        lastRestock = memState.lastRestockAt;
      }

      if (realRemaining <= 0) {
        virtualBuffer = 0;
      }

      state.giveaways.set(id, {
        campaignId: id,
        title: gw.title || id,
        realClaimed: effectiveRealClaimed,
        realRemaining,
        virtualClaimed,
        virtualRemainingBuffer: virtualBuffer,
        virtualRestockCount: restockCount,
        autoRestockThreshold: defaultThreshold,
        autoRestockAmount: defaultRestock,
        priority,
        lastRestockAt: lastRestock,
      });
    }

    // 5. Populate Master Copy (Baseline migrated to 93910)
    if (realHub && typeof realHub.masterCopyClicks === 'number') {
      state.masterCopy.realClicks = Math.max(93910, state.masterCopy.realClicks, realHub.masterCopyClicks);
    } else {
      state.masterCopy.realClicks = Math.max(93910, state.masterCopy.realClicks);
    }

    state.initialized = true;
    state.lastInitializedAt = now;
  } catch (err: any) {
    console.warn('[initializeVirtualLayer error]', err?.message);
    state.initialized = true;
    state.lastInitializedAt = now;
  }

  return state;
}

/**
 * Execute Deterministic Time-Slot Generation & Buffer Updates
 */
export function processCurrentTimeSlot(state: VirtualLayerState, nowMs: number = Date.now()): void {
  const { vnDateStr, dayStartMs, currentSlotIndex } = getVnDayAnchor(nowMs);

  // Day rollover check
  if (state.date !== vnDateStr) {
    state.date = vnDateStr;
    state.lastProcessedSlot = -1;
    state.recentVirtualEvents = [];
    state.pendingFlushEvents = [];
    state.dirtyAggregateIds.clear();
    state.masterCopy.virtualCopy = 0;
    state.masterCopy.date = vnDateStr;

    // Reset base virtual buffers
    state.products.forEach((p, id) => {
      const b = CUMULATIVE_BASELINES_20261025[id];
      p.virtualSold = b?.virtualSold !== undefined ? b.virtualSold : 0;
      p.virtualBuffer = p.realStock > 0 ? (p.autoRestockAmount || 20) : 0;
      p.virtualRestockCount = 0;
    });
    state.giveaways.forEach((g, id) => {
      // BẢNG ADMIN LÀ CHÂN LÝ: Giữ nguyên g.virtualClaimed chuẩn xác từ virtual_claimed_offset do Admin cấu hình
      g.virtualRemainingBuffer = g.realRemaining > 0 ? (g.autoRestockAmount || 20) : 0;
      g.virtualRestockCount = 0;
    });
  }

  if (state.lastProcessedSlot >= currentSlotIndex) {
    return; // Already up to date for this slot
  }

  // =========================================================================
  // BƯỚC 1: TÁCH SỐ ẢO KHỎI SỐ KHE (TIME-ANCHORED CUMULATIVE SNAPSHOT)
  // Khi đổi nhịp khe (SLOT_DURATION_MS), số ảo tích lũy được bảo toàn tuyệt đối,
  // không bị nhân lên hay phát lại từ slot 0 của ngày.
  // =========================================================================
  const elapsedSinceAnchorMs = Math.max(0, nowMs - BASELINE_ANCHOR_TIME_MS);
  const elapsedMinutes = elapsedSinceAnchorMs / 60000;

  // Tốc độ tăng trưởng tự nhiên độc lập với nhịp khe:
  // VIP 7 Days: ~26 đơn/giờ toàn sàn -> 0.4333 đơn/phút
  const deltaSold = Math.floor(elapsedMinutes * 0.4333);
  const deltaRestocks = Math.floor(deltaSold / 20);

  // Master Copy: Natural virtual copy progression (~0.5 copy/min) since baseline migration anchor (16:00 28/10/2026 GMT+7)
  const MASTER_COPY_ANCHOR_MS = 1793181600000;
  const elapsedSinceMigrationMs = Math.max(0, nowMs - MASTER_COPY_ANCHOR_MS);
  const elapsedMigrationMinutes = elapsedSinceMigrationMs / 60000;
  state.masterCopy.virtualCopy = Math.floor(elapsedMigrationMinutes * 0.5);

  // Cập nhật số liệu tích lũy cho Products / Utilities
  state.products.forEach((p, id) => {
    if (p.realStock <= 0) {
      // Quy tắc kho hàng nghiêm ngặt (Rule 3.1): Hết hàng thật thì tồn kho ảo = 0
      p.virtualBuffer = 0;
      p.virtualRestockCount = 0;
      const b = CUMULATIVE_BASELINES_20261025[id];
      if (b && b.virtualSold !== undefined) {
        p.virtualSold = b.virtualSold;
      }
      state.dirtyAggregateIds.add(id);
      return;
    }

    const b = CUMULATIVE_BASELINES_20261025[id];
    if (b) {
      p.virtualSold = (b.virtualSold || 0) + deltaSold;
      p.virtualRestockCount = (b.virtualRestockCount || 0) + deltaRestocks;
      p.virtualBuffer = Math.max(0, (b.virtualBuffer || 20) - deltaSold + deltaRestocks * 20);
    } else {
      p.virtualBuffer = Math.max(0, p.autoRestockAmount || 20);
    }
    state.dirtyAggregateIds.add(id);
  });

  // Cập nhật số liệu tích lũy cho Giveaways
  // BẢNG ADMIN LÀ CHÂN LÝ: virtualClaimed tuyệt đối không cộng tăng trưởng ngoại tuyến để đảm bảo chính xác 100% số Admin cài
  state.giveaways.forEach((g, id) => {
    if (g.realRemaining <= 0) {
      // Quy tắc kho hàng: Hết mã thật thì tồn ảo = 0
      g.virtualRemainingBuffer = 0;
      g.virtualRestockCount = 0;
      state.dirtyAggregateIds.add(id);
      return;
    }

    g.virtualRemainingBuffer = Math.max(0, g.autoRestockAmount || 20);
    state.dirtyAggregateIds.add(id);
  });

  // =========================================================================
  // BƯỚC 2: SINH SỰ KIỆN MÔ PHỎNG THEO KHE CHO CÁC KHE GẦN NHẤT (TOAST NOTIFICATIONS)
  // Chỉ sinh cho các khe gần nhất (tối đa 15 khe ~ 2.5 phút) để phục vụ thông báo
  // Tuyệt đối không vòng lặp hàng nghìn slot từ đầu ngày.
  // =========================================================================
  const sortedProducts = Array.from(state.products.values())
    .filter((p) => p.realStock > 0 && p.priority !== 'off')
    .sort((a, b) => a.productId.localeCompare(b.productId));

  const sortedGiveaways = Array.from(state.giveaways.values())
    .filter((g) => g.realRemaining > 0 && g.priority !== 'off')
    .sort((a, b) => a.campaignId.localeCompare(b.campaignId));

  const games = [
    'Free Fire', 'Liên Quân Mobile', 'Genshin Impact', 'Honkai: Star Rail',
    'Roblox', 'Blox Fruits', 'Thức Thần Ký', 'Kỳ Tích Trở Lại'
  ];

  const startSlot = Math.max(0, currentSlotIndex - 15);

  for (let slot = startSlot; slot <= currentSlotIndex; slot++) {
    const slotEvtPrefix = `sim_slot_${slot}`;
    if (state.recentVirtualEvents.some((e) => e && e.id && e.id.startsWith(slotEvtPrefix))) {
      continue; // Khe này đã có sự kiện trong bộ nhớ đệm
    }

    const slotSeed = (Math.imul(slot, 0x9e3779b9) ^ 0x85ebca6b) >>> 0;
    const rng = createPRNG(slotSeed);
    const slotBaseMs = dayStartMs + slot * SLOT_DURATION_MS;
    const fireTimeMs = Math.min(nowMs, slotBaseMs + Math.floor(rng() * 1500));

    const typeRoll = rng();
    const accountIdx = Math.floor(rng() * PRESET_VIRTUAL_ACCOUNTS.length);
    const maskedUser = maskSimulatedAccount(PRESET_VIRTUAL_ACCOUNTS[accountIdx]);

    if (typeRoll < 0.55) {
      // 55% COPY_CODE
      const game = games[Math.floor(rng() * games.length)];
      const ev: VirtualEventRow = {
        id: `sim_slot_${slot}`,
        type: 'COPY_CODE',
        item_name: game,
        amount: 1,
        details: JSON.stringify({ userName: maskedUser, gameName: game }),
        is_simulated: 1,
        created_at: new Date(fireTimeMs).toISOString(),
        delta_copy_clicks: 1,
      };
      state.recentVirtualEvents.unshift(ev);
      state.pendingFlushEvents.push(ev);
    } else if (typeRoll < 0.75) {
      // 20% BUY_STORE / BUY_UTILITY
      if (sortedProducts.length > 0) {
        const prod = sortedProducts[Math.floor(rng() * sortedProducts.length)];
        const buyEv: VirtualEventRow = {
          id: `sim_slot_${slot}_buy_${prod.productId}`,
          type: prod.itemType === 'store' ? 'BUY_STORE' : 'BUY_UTILITY',
          product_id: prod.productId,
          item_name: prod.title,
          amount: 1,
          details: JSON.stringify({ userName: maskedUser, productTitle: prod.title }),
          is_simulated: 1,
          created_at: new Date(fireTimeMs).toISOString(),
          delta_sold: 1,
          delta_stock: -1,
        };
        state.recentVirtualEvents.unshift(buyEv);
        state.pendingFlushEvents.push(buyEv);
      }
    } else if (typeRoll < 0.90) {
      // 15% CLAIM_GIVEAWAY
      if (sortedGiveaways.length > 0) {
        const gw = sortedGiveaways[Math.floor(rng() * sortedGiveaways.length)];
        const gwEv: VirtualEventRow = {
          id: `sim_slot_${slot}_gw_${gw.campaignId}`,
          type: 'CLAIM_GIVEAWAY',
          product_id: gw.campaignId,
          item_name: gw.title,
          amount: 1,
          details: JSON.stringify({ userName: maskedUser, giveawayTitle: gw.title }),
          is_simulated: 1,
          created_at: new Date(fireTimeMs).toISOString(),
          delta_claimed: 1,
          delta_remaining: -1,
        };
        state.recentVirtualEvents.unshift(gwEv);
        state.pendingFlushEvents.push(gwEv);
      }
    } else if (typeRoll < 0.96) {
      // 6% DEPOSIT_WALLET
      const amounts = [50000, 100000, 200000, 500000];
      const amount = amounts[Math.floor(rng() * amounts.length)];
      const depEv: VirtualEventRow = {
        id: `sim_slot_${slot}_dep`,
        type: 'DEPOSIT_WALLET',
        amount,
        details: JSON.stringify({ userName: maskedUser, amount }),
        is_simulated: 1,
        created_at: new Date(fireTimeMs).toISOString(),
      };
      state.recentVirtualEvents.unshift(depEv);
      state.pendingFlushEvents.push(depEv);
    } else {
      // 4% STATS_COPY
      const totalCount = state.masterCopy.realClicks + state.masterCopy.virtualCopy;
      const statsEv: VirtualEventRow = {
        id: `sim_slot_${slot}_stats`,
        type: 'STATS_COPY',
        amount: totalCount,
        details: JSON.stringify({ count: totalCount }),
        is_simulated: 1,
        created_at: new Date(fireTimeMs).toISOString(),
        delta_copy_clicks: 1,
      };
      state.recentVirtualEvents.unshift(statsEv);
      state.pendingFlushEvents.push(statsEv);
    }
  }

  // Giữ buffer sự kiện gần nhất tối đa 50 mục
  if (state.recentVirtualEvents.length > 50) {
    state.recentVirtualEvents = state.recentVirtualEvents.slice(0, 50);
  }

  state.lastProcessedSlot = currentSlotIndex;
}

/**
 * Trigger Batch Flush to D1 if batch window or threshold met
 * REQUIREMENT 2A: Simulated events (is_simulated = 1) and virtual aggregates are 100% in-memory.
 * D1 strictly stores REAL data only. Zero simulated writes to D1.
 */
export async function maybeFlushVirtualLayerToD1(env: any, waitUntil?: (promise: Promise<any>) => void): Promise<void> {
  const state = getLayerState();
  // Clear dirty in-memory structures without writing simulated events to D1
  state.dirtyAggregateIds.clear();
  state.pendingFlushEvents = [];
  state.lastFlushTime = Date.now();
}

/**
 * Generate Unified Realtime Payload (Toast Events + Computed Display Counters in 1 Payload)
 */
export async function getUnifiedRealtimePayload(env: any, waitUntil?: (p: Promise<any>) => void): Promise<any> {
  const state = await initializeVirtualLayer(env);
  const now = Date.now();

  // Run deterministic slot updates
  processCurrentTimeSlot(state, now);

  // Trigger D1 flush if due
  await maybeFlushVirtualLayerToD1(env, waitUntil);

  // 1. Gather combined events (Real events from RealEventsHub + Virtual events)
  const realHub = await getRealEventsHub(env).catch(() => ({ events: [], realProductSoldCounts: {}, realGiveawayClaimedCounts: {} }));
  const combinedEvents: any[] = [];
  const seenEventIds = new Set<string>();

  // Add real events first
  if (Array.isArray(realHub.events)) {
    for (const ev of realHub.events.slice(0, 10)) {
      if (!ev || !ev.id || seenEventIds.has(ev.id)) continue;
      seenEventIds.add(ev.id);

      const targetId = ev.productId || ev.giveawayId || null;
      const effectiveProductId = ev.productId || ev.giveawayId || null;
      const effectiveGiveawayId = ev.giveawayId || (ev.type === 'CLAIM_GIVEAWAY' ? (ev.productId || undefined) : undefined);
      const realDelta: { sold?: number; stock?: number; claimed?: number; remaining?: number; copyClicks?: number } = {};
      if (ev.type === 'BUY_STORE' || ev.type === 'BUY_UTILITY' || ev.type === 'BUY_PRODUCT') {
        realDelta.sold = 1;
        realDelta.stock = -1;
      } else if (ev.type === 'CLAIM_GIVEAWAY') {
        realDelta.claimed = 1;
        realDelta.remaining = -1;
      } else if (ev.type === 'COPY_CODE' || ev.type === 'STATS_COPY') {
        realDelta.copyClicks = 1;
      } else if (ev.type === 'RESTOCK_PRODUCT') {
        realDelta.stock = ev.amount || 20;
      }

      combinedEvents.push({
        id: ev.id,
        type: ev.type,
        title: ev.title || 'Giao dịch thành công',
        message: ev.message ? maskServerName(ev.message) : 'Khách hàng vừa thực hiện giao dịch',
        timeAgo: 'Vừa xong',
        timestamp: ev.timestamp || now,
        userName: ev.userName || (ev.user ? ev.user.name : undefined),
        isRealUser: true,
        is_simulated: false, // Bắt buộc boolean false cho sự kiện thật
        productId: effectiveProductId,
        giveawayId: effectiveGiveawayId,
        targetId: targetId,
        delta: realDelta,
      });
    }
  }

  // Add virtual events
  for (const ve of state.recentVirtualEvents.slice(0, 15)) {
    if (!ve || !ve.id || seenEventIds.has(ve.id)) continue;
    seenEventIds.add(ve.id);
    let detailsObj: any = {};
    try { detailsObj = JSON.parse(ve.details || '{}'); } catch {}

    let message = '';
    const user = detailsObj.userName || 'Khách hàng';
    if (ve.type === 'COPY_CODE') {
      message = `${user} vừa sao chép 1 Giftcode game ${ve.item_name || 'VIP'}`;
    } else if (ve.type === 'BUY_STORE' || ve.type === 'BUY_UTILITY') {
      message = `${user} vừa mua thành công ${ve.item_name || 'sản phẩm'}`;
    } else if (ve.type === 'CLAIM_GIVEAWAY') {
      message = `${user} vừa nhận mã quà tặng sự kiện ${ve.item_name || 'Code VIP'}`;
    } else if (ve.type === 'RESTOCK_PRODUCT') {
      message = `Kho hàng vừa bổ sung thêm +${ve.amount || 20} ${ve.item_name || 'sản phẩm'}!`;
    } else if (ve.type === 'DEPOSIT_WALLET') {
      message = `${user} vừa nạp thành công ${(ve.amount || 50000).toLocaleString('vi-VN')}đ vào ví Core`;
    } else if (ve.type === 'STATS_COPY') {
      message = `Hệ thống vừa ghi nhận ${(ve.amount || 1200).toLocaleString('vi-VN')} lượt sao chép giftcode hôm nay!`;
    }

    const simDelta: { sold?: number; stock?: number; claimed?: number; remaining?: number; copyClicks?: number } = {};
    if (typeof ve.delta_sold === 'number') simDelta.sold = ve.delta_sold;
    if (typeof ve.delta_stock === 'number') simDelta.stock = ve.delta_stock;
    if (typeof ve.delta_claimed === 'number') simDelta.claimed = ve.delta_claimed;
    if (typeof ve.delta_remaining === 'number') simDelta.remaining = ve.delta_remaining;
    if (typeof ve.delta_copy_clicks === 'number') simDelta.copyClicks = ve.delta_copy_clicks;

    // Fallback from CONVERSION_TABLE if not explicitly set
    if (Object.keys(simDelta).length === 0) {
      const conv = CONVERSION_TABLE[ve.type];
      if (conv && conv.delta) {
        if (typeof conv.delta.sold === 'number') simDelta.sold = conv.delta.sold;
        if (typeof conv.delta.stock === 'number') simDelta.stock = conv.delta.stock;
        if (typeof conv.delta.claimed === 'number') simDelta.claimed = conv.delta.claimed;
        if (typeof conv.delta.remaining === 'number') simDelta.remaining = conv.delta.remaining;
        if (typeof conv.delta.copyClicks === 'number') simDelta.copyClicks = conv.delta.copyClicks;
        if (typeof conv.delta.restock === 'number') simDelta.stock = ve.amount || conv.delta.restock;
      }
    }

    const targetId = ve.product_id || null;
    const { currentSlotIndex: nowSlotIndex } = getVnDayAnchor(now);
    combinedEvents.push({
      id: ve.id,
      type: ve.type,
      title: 'Thông báo',
      message,
      timeAgo: 'Vừa xong',
      timestamp: new Date(ve.created_at).getTime(),
      userName: user,
      isRealUser: false,
      is_simulated: true, // Bắt buộc boolean true cho sự kiện ảo
      slotIndex: nowSlotIndex,
      productId: ve.product_id || null,
      giveawayId: ve.type === 'CLAIM_GIVEAWAY' ? ve.product_id : undefined,
      targetId: targetId,
      delta: simDelta,
    });
  }

  // Sort events newest first
  combinedEvents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // 2. Compute Unified Display Counters (SSOT Server Calculation)
  const productCounters: Record<string, {
    sold: number;
    stock: number;
    real_sold: number;
    real_stock: number;
    virtual_sold: number;
    virtual_buffer: number;
    virtual_restock_count: number;
  }> = {};

  state.products.forEach((p, id) => {
    // Floor rule: display_stock = real_stock > 0 ? (real_stock + Math.max(0, p.virtualBuffer)) : 0
    const displayStock = p.realStock > 0 ? (p.realStock + Math.max(0, p.virtualBuffer)) : 0;
    const displaySold = p.realSold + p.virtualSold;

    productCounters[id] = {
      sold: displaySold,
      stock: displayStock,
      real_sold: p.realSold,
      real_stock: p.realStock,
      virtual_sold: p.virtualSold,
      virtual_buffer: Math.max(0, p.virtualBuffer),
      virtual_restock_count: p.virtualRestockCount,
    };
  });

  const giveawayCounters: Record<string, {
    claimed: number;
    remaining: number;
    real_claimed: number;
    real_remaining: number;
    virtual_claimed: number;
    virtual_buffer: number;
  }> = {};

  state.giveaways.forEach((gw, id) => {
    const displayRemaining = gw.realRemaining > 0 ? (gw.realRemaining + Math.max(0, gw.virtualRemainingBuffer)) : 0;
    const displayClaimed = gw.realClaimed + gw.virtualClaimed;

    giveawayCounters[id] = {
      claimed: displayClaimed,
      remaining: displayRemaining,
      real_claimed: gw.realClaimed,
      real_remaining: gw.realRemaining,
      virtual_claimed: gw.virtualClaimed,
      virtual_buffer: Math.max(0, gw.virtualRemainingBuffer),
    };
  });

  const masterCopyTotal = state.masterCopy.realClicks + state.masterCopy.virtualCopy;

  // Stream Health & Silence Gap Monitoring (Đồng bộ theo nhịp khe 10 giây mới)
  const newestEventTimestamp = combinedEvents[0]?.timestamp || now;
  const lastEventAgeSeconds = Math.max(0, Math.floor((now - newestEventTimestamp) / 1000));
  const isHealthy = lastEventAgeSeconds <= 30; // <= 3 time slots (10s each)
  const silenceWarning = lastEventAgeSeconds > 60; // Warning if stream silent for > 6 slots (60s)

  const streamHealth = {
    is_healthy: isHealthy,
    last_event_age_seconds: lastEventAgeSeconds,
    silence_warning: silenceWarning,
    silence_threshold_seconds: 60,
    current_slot_index: Math.max(0, Math.floor((now - getVnDayAnchor(now).dayStartMs) / SLOT_DURATION_MS)),
    total_slots_processed_today: state.lastProcessedSlot + 1,
  };

  return {
    success: true,
    server_time: now,
    stream_health: streamHealth,
    events: combinedEvents.slice(0, 15),
    active_event: combinedEvents[0] || null,
    conversion_table: CONVERSION_TABLE,
    counters: {
      products: productCounters,
      giveaways: giveawayCounters,
      master_copy: {
        count: masterCopyTotal,
        real: state.masterCopy.realClicks,
        virtual: state.masterCopy.virtualCopy,
      },
    },
    // Backward-compatibility fields:
    master_copy_clicks: masterCopyTotal,
    master_copy_clicks_date: state.date,
    real_product_sold_counts: Object.fromEntries(Array.from(state.products.entries()).map(([k, v]) => [k, v.realSold])),
    real_giveaway_claimed_counts: Object.fromEntries(Array.from(state.giveaways.entries()).map(([k, v]) => [k, v.realClaimed])),
  };
}
