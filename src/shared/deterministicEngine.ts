/**
 * Deterministic PRNG & Metrics Engine
 * Universal Module: Shared between Cloudflare Pages Worker (functions/) and React Frontend (src/)
 * Pure TypeScript with zero platform dependencies (runs in browser, Node, and Cloudflare V8 isolate)
 */

export interface ProductInput {
  id: string;
  title?: string;
  stock_quantity?: number;
  sold_count?: number;
  virtual_sold_count?: number;
  created_at?: string;
  createdAt?: string;
  is_active?: boolean | number;
}

export interface GiveawayInput {
  id: string;
  title?: string;
  remaining_codes?: number;
  claimed_codes?: number;
  total_codes?: number;
  codes_pool?: any[];
  virtual_claimed_offset?: number;
  created_at?: string;
  createdAt?: string;
  status?: string;
  is_active?: boolean;
  show_claimed_count?: boolean;
}

export interface GlobalMetricsSnapshot {
  snapshot_version: number;
  updated_at: number;
  server_time: number;
  master_copy: {
    anchor_time: number;
    anchor_count: number;
    count?: number;
    real_clicks: number;
    virtual?: number;
  };
  products: Record<string, {
    stock: number;
    sold: number;
    real_stock: number;
    real_sold: number;
  }>;
  giveaways: Record<string, {
    remaining: number;
    claimed: number;
    total: number;
    percent: number;
    real_remaining: number;
    real_claimed: number;
  }>;
}

// Fast deterministic 32-bit PRNG (Mulberry32)
export function createPRNG(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable string hash (DJB2)
export function stringHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const ONE_HOUR_MS = 3600000;
// Baseline anchor: 2026-01-01T00:00:00Z
const ANCHOR_MS = 1767225600000;

/**
 * Deterministic Live Copy Counter calculation (Reset to 0 at 00:00:00 UTC+7 daily)
 * Smooth diurnal curve across 86,400 seconds
 */
export function calculateDeterministicCopyCount(timestampMs: number, realClicks: number = 0): number {
  const vnDate = new Date(timestampMs + 7 * 3600 * 1000);
  const dateKey = vnDate.toISOString().slice(0, 10);
  const secondsIntoDay = vnDate.getUTCHours() * 3600 + vnDate.getUTCMinutes() * 60 + vnDate.getUTCSeconds();

  if (secondsIntoDay <= 0) {
    return Math.max(0, realClicks);
  }

  const daySeed = stringHash(dateKey);
  const targetDailyCopies = 3600 + (daySeed % 1800);

  let fraction = 0;
  if (secondsIntoDay <= 21600) {
    // 00:00 - 06:00 (Night): slow growth 0% -> 3%
    fraction = (secondsIntoDay / 21600) * 0.03;
  } else if (secondsIntoDay <= 43200) {
    // 06:00 - 12:00 (Morning): 3% -> 28%
    const p = (secondsIntoDay - 21600) / 21600;
    fraction = 0.03 + p * 0.25;
  } else if (secondsIntoDay <= 64800) {
    // 12:00 - 18:00 (Afternoon): 28% -> 55%
    const p = (secondsIntoDay - 43200) / 21600;
    fraction = 0.28 + p * 0.27;
  } else if (secondsIntoDay <= 82800) {
    // 18:00 - 23:00 (Peak Evening): 55% -> 95%
    const p = (secondsIntoDay - 64800) / 18000;
    fraction = 0.55 + p * 0.40;
  } else {
    // 23:00 - 24:00 (Late Night): 95% -> 100%
    const p = (secondsIntoDay - 82800) / 3600;
    fraction = 0.95 + p * 0.05;
  }

  const simulatedGrowth = Math.floor(fraction * targetDailyCopies);
  return Math.max(0, simulatedGrowth + realClicks);
}

/**
 * Deterministic Virtual Bonus Stock calculation based on elapsed minutes from epoch
 * QUY TẮC FOMO: Nếu ngưỡng cài đặt nhỏ hơn số lượng thực tế trong kho (threshold < realStock),
 * thì mặc định khi chạm số hàng thực tế trong kho (bonus tụt về 0) sẽ tự động kích hoạt tăng sản phẩm ảo đã cài.
 */
export function calculateDeterministicVirtualBonus(
  id: string,
  timestampMs: number,
  baseBonus: number = 25,
  threshold: number = 1,
  restockAmount: number = 20,
  priority: string = 'normal',
  realStock: number = 0
): number {
  if (priority === 'off' || baseBonus <= 0) return 0;
  const rawThreshold = Math.max(1, threshold);
  const safeRealStock = Math.max(0, Number(realStock) || 0);

  const effectiveTotalThreshold = (safeRealStock > 0 && rawThreshold < safeRealStock)
    ? safeRealStock
    : rawThreshold;
  const restock = Math.max(1, Number(restockAmount) || 20);
  const bonus = Number(baseBonus) || 0;

  return Math.max(safeRealStock + bonus, effectiveTotalThreshold + restock);
}

/**
 * Deterministic Stock calculation:
 * CRITICAL BUSINESS RULE: Hết hàng thật = Hết hàng hiển thị (realStock <= 0 => 0)
 */
export function calculateDeterministicStock(
  productId: string,
  realStock: number,
  timestampMs: number,
  virtualBonusConfig: number = 20,
  threshold: number = 1,
  restockAmount: number = 20,
  priority: string = 'normal'
): number {
  const baseStock = Math.max(0, Number(realStock) || 0);
  if (baseStock <= 0 || priority === 'off') return 0;

  // Nếu không có cấu hình kho ảo: trả về tồn kho thật
  if (!virtualBonusConfig || virtualBonusConfig <= 0) {
    return baseStock;
  }

  const rawThreshold = Math.max(1, Number(threshold) || 1);
  const restock = Math.max(1, Number(restockAmount) || 20);
  const bonus = Number(virtualBonusConfig) || 0;

  const effectiveThreshold = (baseStock > 0 && rawThreshold < baseStock)
    ? baseStock
    : rawThreshold;

  return Math.max(baseStock + bonus, effectiveThreshold + restock);
}

/**
 * Deterministic Hourly Growth for sold counts
 */
export function calculateHourlyGrowth(
  id: string,
  createdAt?: string,
  timestampMs: number = Date.now(),
  priority: string = 'normal',
  customConfig?: { enabled?: boolean; mode?: string; intervalMinutes?: number; incrementStep?: number; maxCatchUpUnits?: number },
  anchorTime?: string
): number {
  if (!id || priority === 'off') return 0;
  const defaultAnchor = timestampMs;

  let parsedAnchorMs: number | null = null;
  if (anchorTime) {
    let str = String(anchorTime).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    }
    const t = new Date(str).getTime();
    if (!isNaN(t) && t > 0) {
      parsedAnchorMs = Math.min(t, timestampMs);
    }
  }

  // Nếu không có anchorTime cụ thể, coi mốc tăng trưởng bắt đầu từ thời điểm thiết lập hiện tại (không nhảy vọt +70 từ dayStart)
  if (!parsedAnchorMs) {
    return 0;
  }
  const elapsedMinutes = Math.max(0, Math.floor((timestampMs - parsedAnchorMs) / 60000));
  if (elapsedMinutes <= 0) return 0;

  const elapsedHours = elapsedMinutes / 60;
  // Tốc độ tăng trưởng bán hàng hợp lý cho từng sản phẩm:
  // high: ~1.5 đơn/giờ, normal: ~0.5 đơn/giờ (1 đơn mỗi 2 giờ), low: ~0.2 đơn/giờ
  let rate = priority === 'high' ? 1.5 : priority === 'low' ? 0.2 : 0.5;
  if (customConfig?.enabled && customConfig?.mode === 'custom') {
    const interval = Math.max(1, Number(customConfig.intervalMinutes) || 60);
    const step = Math.max(1, Number(customConfig.incrementStep) || 1);
    rate = Math.min(2.5, (60 / interval) * step);
  }
  let baseGrowth = Math.floor(elapsedHours * rate);
  // Cap baseGrowth to maxCatchUpUnits (default 30)
  const maxCap = Math.max(1, Math.min(30, Number(customConfig?.maxCatchUpUnits) || 30));
  baseGrowth = Math.min(baseGrowth, maxCap);

  return baseGrowth;
}

/**
 * Deterministic In-Hour Progression (1 or 2 small increments inside current hour)
 */
export function calculateInHourProgression(
  id: string,
  timestampMs: number = Date.now(),
  priority: string = 'normal',
  createdAt?: string,
  anchorTime?: string
): number {
  if (!id || priority === 'off') return 0;

  let parsedAnchorMs: number | null = null;
  if (anchorTime) {
    let str = String(anchorTime).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    }
    const t = new Date(str).getTime();
    if (!isNaN(t) && t > 0) {
      parsedAnchorMs = Math.min(t, timestampMs);
    }
  }

  // Nếu không có mốc anchorTime, không tăng ngẫu nhiên trong giờ
  if (!parsedAnchorMs) {
    return 0;
  }

  // Items within 15 minutes of anchor start at clean baseline without artificial in-hour jump
  if (timestampMs - parsedAnchorMs < 15 * 60 * 1000) {
    return 0;
  }

  const currentHourIndex = Math.floor(timestampMs / ONE_HOUR_MS);
  const vnDate = new Date(timestampMs + 7 * 3600 * 1000);
  const minuteInHour = vnDate.getUTCMinutes();

  const maxHourInc = priority === 'high' ? 2 : priority === 'low' ? 0 : 1;
  if (maxHourInc <= 0) return 0;

  const seed = (stringHash(id) ^ (currentHourIndex * 1664525)) >>> 0;
  const triggerMinute1 = 12 + (seed % 22);
  const triggerMinute2 = 36 + ((seed >> 8) % 20);

  let inc = 0;
  if (minuteInHour >= triggerMinute1) inc += 1;
  if (maxHourInc >= 2 && minuteInHour >= triggerMinute2) inc += 1;
  return inc;
}

/**
 * Deterministic Sold Display
 */
export function calculateDeterministicSold(
  productId: string,
  realSold: number,
  createdAt?: string,
  timestampMs: number = Date.now(),
  virtualBase: number = 0,
  priority: string = 'normal',
  customConfig?: { enabled?: boolean; mode?: string; intervalMinutes?: number; incrementStep?: number; maxCatchUpUnits?: number; outOfStockEnabled?: boolean; outOfStockMaxUnits?: number },
  realStock?: number,
  anchorTime?: string,
  virtualBonusStock?: number
): number {
  const real = Math.max(0, Number(realSold) || 0);
  if (priority === 'off') return real;
  const base = Math.max(0, Number(virtualBase !== undefined ? virtualBase : 0));

  // NẾU HẾT HÀNG THẬT / HẾT CODE (realStock <= 0):
  if (realStock !== undefined && realStock <= 0) {
    if (!customConfig?.outOfStockEnabled) {
      return real + base;
    }
    // Nếu có bật bù ngoại tuyến cho hàng hết: kẹp trần theo outOfStockMaxUnits (default 10)
    const oosMax = Math.max(1, Number(customConfig.outOfStockMaxUnits) || 10);
    const hourly = calculateHourlyGrowth(productId, createdAt, timestampMs, priority, customConfig, anchorTime);
    return real + base + Math.min(hourly, oosMax);
  }

  // NẾU KHÔNG CÓ SỐ LƯỢNG ẢO (base <= 0):
  // Tuyệt đối không tự động cộng dồn số lượng ảo ngoại tuyến (offline growth) khi admin đặt số ảo = 0!
  if (base <= 0) {
    return real;
  }

  // Cố định số cơ sở chuẩn theo cấu hình kho; chỉ tăng khi có đơn hàng thật hoặc thông báo toast nổ ra
  return real + base;
}

/**
 * Calculate the single authoritative Global Metrics Snapshot
 * Runs on Cloudflare Worker Backend and can also be verified by Frontend
 */
export function calculateGlobalSnapshot(
  data: {
    products: ProductInput[];
    giveaways: GiveawayInput[];
    masterCopyClicks?: number;
    realProductSoldCounts?: Record<string, number>;
    realGiveawayClaimedCounts?: Record<string, number>;
    peakProductSoldCounts?: Record<string, number>;
    peakGiveawayClaimedCounts?: Record<string, number>;
    peakCopyClicks?: number;
    lowestProductStock?: Record<string, number>;
    lowestGiveawayRemaining?: Record<string, number>;
    productWeights?: Record<string, any>;
    offlineCatchUp?: any;
  },
  timestampMs: number = Date.now()
): GlobalMetricsSnapshot {
  // Master Copy: Natural virtual copy progression (~0.5 copy/min) since baseline migration anchor (16:00 28/10/2026 GMT+7)
  const MASTER_COPY_ANCHOR_MS = 1793181600000;
  const elapsedSinceMigrationMs = Math.max(0, timestampMs - MASTER_COPY_ANCHOR_MS);
  const elapsedMigrationMinutes = elapsedSinceMigrationMs / 60000;
  const virtualCopy = Math.floor(elapsedMigrationMinutes * 0.5);

  const realCopyClicks = Math.max(93910, Number(data.masterCopyClicks) || 0);
  const peakCopy = Math.max(93910, Number(data.peakCopyClicks) || 0);
  const effectiveRealClicks = Math.max(realCopyClicks, peakCopy);
  const liveCopyCount = effectiveRealClicks + virtualCopy;

  const productSnapshots: Record<string, {
    stock: number;
    sold: number;
    real_stock: number;
    real_sold: number;
  }> = {};

  (data.products || []).forEach((prod) => {
    if (!prod || !prod.id) return;
    const realStock = Math.max(0, Number(prod.stock_quantity) || 0);
    const serverSoldCount = Number(prod.sold_count) || 0;
    const hubSoldCount = Number(data.realProductSoldCounts?.[prod.id]) || 0;
    const effectiveRealSold = Math.max(serverSoldCount, hubSoldCount);

    const pw = data.productWeights?.[prod.id];
    const isProdVirtualSoldZero = prod.virtual_sold_count === undefined || Number(prod.virtual_sold_count) <= 0;
    const rawBonus = pw?.virtualStockBonus !== undefined ? Math.max(0, Number(pw.virtualStockBonus) || 0) : 0;
    // Nếu sản phẩm không có số bán ảo và rawBonus rơi vào giá trị default 20 cũ, coi bonus là 0
    const virtualBonusConfig = (isProdVirtualSoldZero && rawBonus === 20 && !pw?.hasExplicitBonus) ? 0 : rawBonus;
    const threshold = pw?.autoRestockThreshold !== undefined ? Math.max(1, Number(pw.autoRestockThreshold) || 1) : 1;
    const restockAmount = pw?.autoRestockAmount !== undefined ? Math.max(1, Number(pw.autoRestockAmount) || 20) : 20;
    const rawPriority = pw?.priority || (isProdVirtualSoldZero ? 'off' : 'normal');
    const priority = pw?.priority || (isProdVirtualSoldZero ? (virtualBonusConfig > 0 ? rawPriority : 'off') : rawPriority);
    const minRealStock = Math.max(1, Number(pw?.minRealStock) || 1);

    const effectiveThreshold = (realStock > 0 && threshold < realStock)
      ? realStock
      : threshold;

    const maxAllowedStock = (priority === 'off' || virtualBonusConfig <= 0)
      ? realStock
      : Math.max(realStock + virtualBonusConfig, effectiveThreshold + restockAmount);

    const rawDisplayStock = (realStock < minRealStock || priority === 'off' || virtualBonusConfig <= 0)
      ? realStock
      : calculateDeterministicStock(prod.id, realStock, timestampMs, virtualBonusConfig, threshold, restockAmount, priority);

    let displayStock = rawDisplayStock;
    if (data.lowestProductStock?.[prod.id] !== undefined) {
      const lowest = Math.max(0, Number(data.lowestProductStock[prod.id]));
      if (lowest > 0 && lowest <= maxAllowedStock) {
        displayStock = lowest;
      } else if (lowest > maxAllowedStock) {
        // Auto-heal inflated historical peak/lowest from previous config
        displayStock = maxAllowedStock;
        data.lowestProductStock[prod.id] = maxAllowedStock;
      }
    }

    if (priority !== 'off' && virtualBonusConfig > 0 && realStock > 0 && displayStock <= effectiveThreshold) {
      displayStock = effectiveThreshold + restockAmount;
      if (data.lowestProductStock) {
        data.lowestProductStock[prod.id] = displayStock;
      }
    }

    if (realStock <= 0) {
      displayStock = 0;
      if (data.lowestProductStock) {
        delete data.lowestProductStock[prod.id];
      }
    } else {
      displayStock = Math.min(displayStock, maxAllowedStock);
    }

    const anchorTime = (prod as any).fomo_anchor_time || (prod as any).virtual_sold_updated_at;
    const rawDisplaySold = priority === 'off'
      ? effectiveRealSold
      : calculateDeterministicSold(
          prod.id,
          effectiveRealSold,
          prod.created_at || prod.createdAt,
          timestampMs,
          prod.virtual_sold_count !== undefined ? prod.virtual_sold_count : 0,
          priority,
          data.offlineCatchUp,
          realStock,
          anchorTime,
          virtualBonusConfig
        );

    // Bảo toàn đỉnh bán hàng lũy kế (Monotonic Progression): Đỉnh đã đạt được duy trì vĩnh viễn
    // Tự động thanh lọc đỉnh rác cũ (ghost inflated peak) vượt quá trần cấu hình an toàn hoặc khi Admin cài lại số ảo
    const peakSold = Number(data.peakProductSoldCounts?.[prod.id]) || 0;
    const baseTarget = Number(prod.virtual_sold_count || 0);
    const maxAllowedPeak = baseTarget > 0 ? (effectiveRealSold + baseTarget + 2000) : Math.max(effectiveRealSold, 2000);
    // Bảo toàn đơn điệu tuyệt đối: Không bao giờ kéo giật lùi đỉnh bán hàng khi tăng trưởng bình thường
    const effectivePeakSold = (peakSold > maxAllowedPeak || peakSold < (effectiveRealSold + baseTarget))
      ? rawDisplaySold
      : peakSold;
    // Two-Layer SSOT: display_sold = real_sold + virtual_sold
    const displaySold = rawDisplaySold;

    productSnapshots[prod.id] = {
      stock: displayStock,
      sold: displaySold,
      real_stock: realStock,
      real_sold: effectiveRealSold,
    };
  });

  const giveawaySnapshots: Record<string, {
    remaining: number;
    claimed: number;
    total: number;
    percent: number;
    real_remaining: number;
    real_claimed: number;
  }> = {};

  (data.giveaways || []).forEach((gw) => {
    if (!gw || !gw.id) return;
    const poolCount = Array.isArray(gw.codes_pool)
      ? gw.codes_pool.length
      : (typeof gw.remaining_codes === 'number' ? gw.remaining_codes : 0);
    const realRemaining = Math.max(0, poolCount);
    const serverClaimed = Number(gw.claimed_codes) || 0;
    const hubClaimed = Number(data.realGiveawayClaimedCounts?.[gw.id]) || 0;
    const effectiveRealClaimed = Math.max(serverClaimed, hubClaimed);

    const pw = data.productWeights?.[gw.id];
    const isGwVirtualOffsetZero = gw.virtual_claimed_offset === undefined || Number(gw.virtual_claimed_offset) <= 0;
    const rawBonus = pw?.virtualStockBonus !== undefined ? Math.max(0, Number(pw.virtualStockBonus) || 0) : 0;
    // Nếu giveaway có virtual_claimed_offset = 0 và rawBonus rơi vào giá trị default 20 cũ, coi bonus là 0
    const virtualBonusConfig = (isGwVirtualOffsetZero && rawBonus === 20 && !pw?.hasExplicitBonus) ? 0 : rawBonus;
    const threshold = pw?.autoRestockThreshold !== undefined ? Math.max(1, Number(pw.autoRestockThreshold) || 1) : 1;
    const restockAmount = pw?.autoRestockAmount !== undefined ? Math.max(1, Number(pw.autoRestockAmount) || 20) : 20;
    const rawPriority = pw?.priority || (isGwVirtualOffsetZero ? 'off' : 'normal');
    const priority = pw?.priority || (isGwVirtualOffsetZero ? (virtualBonusConfig > 0 ? rawPriority : 'off') : rawPriority);
    const minRealStock = Math.max(1, Number(pw?.minRealStock) || 1);

    const effectiveGwThreshold = (realRemaining > 0 && threshold < realRemaining)
      ? realRemaining
      : threshold;

    const maxAllowedGwRemaining = (priority === 'off' || virtualBonusConfig <= 0)
      ? realRemaining
      : Math.max(realRemaining + virtualBonusConfig, effectiveGwThreshold + restockAmount);

    const rawDisplayRemaining = (realRemaining < minRealStock || priority === 'off' || virtualBonusConfig <= 0 || realRemaining <= 0)
      ? realRemaining
      : Math.max(1, calculateDeterministicStock(gw.id, realRemaining, timestampMs, virtualBonusConfig, threshold, restockAmount, priority));

    let displayRemaining = rawDisplayRemaining;
    if (data.lowestGiveawayRemaining?.[gw.id] !== undefined) {
      const lowest = Math.max(0, Number(data.lowestGiveawayRemaining[gw.id]));
      if (lowest > 0 && lowest <= maxAllowedGwRemaining) {
        displayRemaining = lowest;
      } else if (lowest > maxAllowedGwRemaining) {
        displayRemaining = maxAllowedGwRemaining;
        data.lowestGiveawayRemaining[gw.id] = maxAllowedGwRemaining;
      }
    }

    if (priority !== 'off' && virtualBonusConfig > 0 && realRemaining > 0 && displayRemaining <= effectiveGwThreshold) {
      displayRemaining = effectiveGwThreshold + restockAmount;
      if (data.lowestGiveawayRemaining) {
        data.lowestGiveawayRemaining[gw.id] = displayRemaining;
      }
    }

    if (realRemaining <= 0) {
      displayRemaining = 0;
      if (data.lowestGiveawayRemaining) {
        delete data.lowestGiveawayRemaining[gw.id];
      }
    } else {
      displayRemaining = Math.min(displayRemaining, maxAllowedGwRemaining);
    }

    const anchorTime = (gw as any).fomo_anchor_time || (gw as any).virtual_claimed_updated_at;
    const rawDisplayClaimed = priority === 'off'
      ? effectiveRealClaimed
      : calculateDeterministicSold(
          gw.id,
          effectiveRealClaimed,
          gw.created_at || gw.createdAt,
          timestampMs,
          gw.virtual_claimed_offset !== undefined ? gw.virtual_claimed_offset : 0,
          priority,
          data.offlineCatchUp,
          realRemaining,
          anchorTime,
          virtualBonusConfig
        );

    // Bảo toàn đỉnh nhận quà lũy kế (Monotonic Progression): Đỉnh đã đạt được duy trì vĩnh viễn
    // Tự động thanh lọc đỉnh rác cũ (ghost inflated peak) vượt quá trần cấu hình an toàn hoặc khi Admin cài lại số ảo
    const peakClaimed = Number(data.peakGiveawayClaimedCounts?.[gw.id]) || 0;
    const baseTargetGw = Number(gw.virtual_claimed_offset || 0);
    const maxAllowedPeakGw = baseTargetGw > 0 ? (effectiveRealClaimed + baseTargetGw + 2000) : Math.max(effectiveRealClaimed, 2000);
    // Bảo toàn đơn điệu tuyệt đối: Không bao giờ kéo giật lùi đỉnh nhận quà khi tăng trưởng bình thường
    const effectivePeakClaimed = (peakClaimed > maxAllowedPeakGw || peakClaimed < (effectiveRealClaimed + baseTargetGw))
      ? rawDisplayClaimed
      : peakClaimed;
    // Two-Layer SSOT: display_claimed = real_claimed + virtual_claimed
    const displayClaimed = rawDisplayClaimed;

    const displayTotal = displayRemaining + displayClaimed;
    const percentClaimed = displayTotal > 0
      ? Math.min(100, Math.max(0, Math.round((displayClaimed / displayTotal) * 100)))
      : (displayRemaining <= 0 ? 100 : 0);

    giveawaySnapshots[gw.id] = {
      remaining: displayRemaining,
      claimed: displayClaimed,
      total: displayTotal,
      percent: percentClaimed,
      real_remaining: realRemaining,
      real_claimed: effectiveRealClaimed,
    };
  });

  return {
    snapshot_version: 1,
    updated_at: timestampMs,
    server_time: timestampMs,
    master_copy: {
      anchor_time: timestampMs,
      anchor_count: liveCopyCount,
      count: liveCopyCount,
      real_clicks: effectiveRealClicks,
      virtual: virtualCopy,
    },
    products: productSnapshots,
    giveaways: giveawaySnapshots,
  };
}
