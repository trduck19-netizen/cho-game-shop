import { getRealEventsHub } from '../services/realEventsHub';
import {
  getSettingD1,
  setSettingD1,
  loadAllStoreProductsD1,
  loadAllUtilitiesD1,
  loadAllGiveawaysD1,
  withD1Timeout,
} from '../services/d1_service';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // 1. Total community votes from D1 (non-blocking with timeout)
  let totalVotes = 1420;
  if (env.DB) {
    try {
      const votesVal = await withD1Timeout(
        getSettingD1<number | string>(env.DB, 'wcg_stats_total_votes'),
        1000,
        1420
      );
      if (votesVal) totalVotes = parseInt(String(votesVal), 10);
    } catch {}
  }

  const nowMs = Date.now();
  const ONE_HOUR_MS = 3600000;
  const vnToday = new Date(nowMs + 7 * 3600 * 1000).toISOString().slice(0, 10);

  // 2. Read real transactions & master copy clicks from Hub
  let hub: any = null;
  let masterCopyClicks = 0;
  let realProductSoldCounts: Record<string, number> = {};
  let realGiveawayClaimedCounts: Record<string, number> = {};
  try {
    hub = await getRealEventsHub(env);
    const rawClicks = (typeof hub.masterCopyClicks === 'number') ? hub.masterCopyClicks : 93910;
    const realClicks = Math.max(93910, rawClicks);
    const elapsedSinceMigrationMs = Math.max(0, nowMs - 1793181600000);
    const virtualCopy = Math.floor(elapsedSinceMigrationMs / 60000 * 0.5);
    masterCopyClicks = realClicks + virtualCopy;
    if (hub.realProductSoldCounts && typeof hub.realProductSoldCounts === 'object') {
      realProductSoldCounts = hub.realProductSoldCounts;
    }
    if (hub.realGiveawayClaimedCounts && typeof hub.realGiveawayClaimedCounts === 'object') {
      realGiveawayClaimedCounts = hub.realGiveawayClaimedCounts;
    }
  } catch {}

  // 3. Hourly FOMO Checkpoint from D1
  let hourlyStats: any = null;
  let prevCachedStats: any = null;
  if (env.DB) {
    try {
      const cached = await getSettingD1<any>(env.DB, 'wcg_hourly_fomo_stats');
      if (cached) {
        prevCachedStats = cached;
        if (cached.timestamp && (nowMs - cached.timestamp) < ONE_HOUR_MS) {
          hourlyStats = cached;
        }
      }
    } catch {}

    // If checkpoint is missing or >= 1 hour old, recompute checkpoint from D1
    if (!hourlyStats) {
      try {
        const [products, utilities, giveaways] = await Promise.all([
          withD1Timeout(loadAllStoreProductsD1(env.DB), 1000, []),
          withD1Timeout(loadAllUtilitiesD1(env.DB), 1000, []),
          withD1Timeout(loadAllGiveawaysD1(env.DB), 1000, []),
        ]);

        // Count completed orders per item directly from D1 SQLite
        const orderCounts: Record<string, number> = {};
        const d1OrderCounts = await withD1Timeout(
          env.DB.prepare(
            "SELECT product_id, SUM(quantity) as total_sold FROM orders WHERE status = 'COMPLETED' GROUP BY product_id"
          ).all(),
          1000,
          { results: [] as any[] }
        );
        if (d1OrderCounts && d1OrderCounts.results) {
          for (const r of d1OrderCounts.results as any[]) {
            if (r && r.product_id) {
              orderCounts[r.product_id] = Number(r.total_sold) || 0;
            }
          }
        }

        const computedProducts: Record<string, any> = {};
        const allProds = [...products, ...utilities];
        const defaultAnchor = nowMs;

        allProds.forEach((p) => {
          if (!p || !p.id) return;
          const realSold = (orderCounts[p.id] || Number(p.sold_count) || 0) + (realProductSoldCounts[p.id] || 0);
          const virtualBase = Number(p.virtual_sold_count !== undefined ? p.virtual_sold_count : 20);

          let idTimestamp: number | null = null;
          const match = p.id ? String(p.id).match(/^(?:ut|sp)_(\d{10,13})/i) : null;
          if (match) {
            const parsed = parseInt(match[1], 10);
            if (!isNaN(parsed) && parsed > 1600000000000 && parsed <= nowMs) {
              idTimestamp = parsed;
            }
          }

          const pStart = p.created_at || p.createdAt ? new Date(p.created_at || p.createdAt).getTime() : (idTimestamp || defaultAnchor);
          const safeStart = isNaN(pStart) || pStart <= 0 ? defaultAnchor : Math.min(pStart, nowMs);
          const elapsedH = Math.max(0, Math.floor((nowMs - safeStart) / ONE_HOUR_MS));
          const growth = Math.floor(elapsedH * 0.5);
          const computedTotal = realSold + virtualBase + growth;
          const prevTotal = Number(prevCachedStats?.products?.[p.id]?.totalSold) || 0;
          const totalSold = Math.max(computedTotal, prevTotal);

          computedProducts[p.id] = {
            totalSold,
            realSold,
            virtualBase,
            hourlyGrowth: growth,
          };
        });

        const computedGiveaways: Record<string, any> = {};
        giveaways.forEach((gw) => {
          if (!gw || !gw.id) return;
          const realClaimed = (Number(gw.claimed_codes) || 0) + (realGiveawayClaimedCounts[gw.id] || 0);
          // BẢNG ADMIN LÀ CHÂN LÝ: Số ảo theo đúng virtual_claimed_offset, không cộng hourlyGrowth ngoại tuyến
          const virtualBase = Math.max(0, Number(gw.virtual_claimed_offset) || 0);
          const computedClaimed = realClaimed + virtualBase;
          const totalClaimed = computedClaimed;

          computedGiveaways[gw.id] = {
            totalClaimed,
            realClaimed,
            virtualBase,
            hourlyGrowth: 0,
          };
        });

        hourlyStats = {
          timestamp: nowMs,
          formattedTime: new Date(nowMs).toISOString(),
          products: computedProducts,
          giveaways: computedGiveaways,
        };

        // Asynchronously persist checkpoint to D1 (SSOT)
        context.waitUntil(
          setSettingD1(env.DB, 'wcg_hourly_fomo_stats', hourlyStats).catch(() => {})
        );
      } catch (err: any) {
        console.warn('[Stats] Hourly FOMO computation warning:', err?.message);
      }
    }
  }

  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    '127.0.0.1';

  const responseData = {
    total_games: 469,
    total_codes: 6111,
    edge_region: (request as any).cf?.colo || 'SGN',
    edge_country: (request as any).cf?.country || 'VN',
    client_ip: clientIp,
    total_community_votes: totalVotes,
    server_time: nowMs,
    sync_interval_ms: ONE_HOUR_MS,
    master_copy_clicks: masterCopyClicks,
    master_copy_clicks_date: vnToday,
    real_product_sold_counts: realProductSoldCounts,
    real_giveaway_claimed_counts: realGiveawayClaimedCounts,
    peak_product_sold_counts: hub?.peakProductSoldCounts || {},
    peak_giveaway_claimed_counts: hub?.peakGiveawayClaimedCounts || {},
    lowest_product_stock: hub?.lowestProductStock || {},
    lowest_giveaway_remaining: hub?.lowestGiveawayRemaining || {},
    hourly_fomo_stats: hourlyStats,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(responseData), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
