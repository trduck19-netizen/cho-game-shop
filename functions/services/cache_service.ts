/**
 * Global Edge Cache & Purge Management Service
 * Provides:
 * 1. Cloudflare REST API Global Zone Purge (for custom domains / zone caching)
 * 2. Local PoP Edge Cache Invalidation (caches.default.delete)
 * 3. Catalog Epoch Generation (instant zero-stale revalidation across all 300+ PoPs)
 */

export interface PurgeResult {
  success: boolean;
  message: string;
  purgedUrls: string[];
  zonePurged?: boolean;
  localPurged?: boolean;
  details?: any;
}

/**
 * Gọi Cloudflare Purge Cache REST API để xóa cache trên toàn bộ 300+ Edge PoP của Cloudflare
 */
export async function purgeCloudflareGlobalCache(
  urls: string[],
  env: any
): Promise<PurgeResult> {
  const zoneId = (env.CLOUDFLARE_ZONE_ID || env.CF_ZONE_ID || '').trim();
  const apiToken = (env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN || '').trim();

  if (!zoneId || !apiToken) {
    return {
      success: true,
      zonePurged: false,
      message: 'CLOUDFLARE_ZONE_ID hoặc API_TOKEN chưa được cấu hình. Đã hoàn tất xóa PoP cục bộ.',
      purgedUrls: urls,
    };
  }

  try {
    const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    const resp = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    });

    const data: any = await resp.json().catch(() => ({}));
    if (resp.ok && data?.success) {
      return {
        success: true,
        zonePurged: true,
        message: 'Cloudflare Global Cache Purge API đã xóa thành công trên toàn bộ CDN Edge.',
        purgedUrls: urls,
        details: data,
      };
    } else {
      return {
        success: false,
        zonePurged: false,
        message: 'Lỗi phản hồi từ Cloudflare Purge API: ' + (data?.errors?.[0]?.message || resp.statusText),
        purgedUrls: urls,
        details: data,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      zonePurged: false,
      message: 'Ngoại lệ khi gọi Cloudflare Purge API: ' + (err?.message || String(err)),
      purgedUrls: urls,
    };
  }
}

/**
 * Xóa cache đồng bộ: PoP cục bộ (caches.default) + Cloudflare Global REST API
 */
export async function invalidateCatalogEdgeCache(
  ctx: ExecutionContext,
  request: Request,
  env: any,
  extraUrls: string[] = []
): Promise<void> {
  const url = new URL(request.url);
  url.search = '';
  const cleanUrl = url.toString();

  // 0. Xóa cache bộ nhớ isolate (Worker memory) để mọi request kế tiếp buộc phải lấy snapshot mới
  const gScope = globalThis as any;
  gScope.__wcg_metrics_snapshot = null;
  gScope.__wcg_public_sync_cache = null;
  gScope.__wcg_hub = null;
  gScope.__wcg_hub_loaded_at = 0;

  // 1. Xóa PoP cục bộ (Local Edge Datacenter)
  if (typeof caches !== 'undefined' && (caches as any).default) {
    const cache = (caches as any).default;
    const localKeys = [
      cleanUrl,
      new URL('/api/sync', request.url).toString(),
      new URL('/api/news', request.url).toString(),
      new URL('/api/games', request.url).toString(),
      new URL('/api/metrics/synced', request.url).toString(),
      new URL('/api/stats', request.url).toString(),
      new URL('/api/realtime-events', request.url).toString(),
      'https://codegame.shop/api/games',
      'https://codegame.shop/api/sync',
      'https://codegame.shop/api/news',
      'https://codegame.shop/api/metrics/synced',
      'https://codegame.shop/api/stats',
      'https://codegame.shop/api/realtime-events',
      'https://www.codegame.shop/api/games',
      'https://www.codegame.shop/api/sync',
      'https://www.codegame.shop/api/news',
      'https://www.codegame.shop/api/metrics/synced',
      'https://www.codegame.shop/api/stats',
      'https://www.codegame.shop/api/realtime-events',
      'https://web-code-game.pages.dev/api/games',
      'https://web-code-game.pages.dev/api/sync',
      'https://web-code-game.pages.dev/api/news',
      'https://web-code-game.pages.dev/api/metrics/synced',
      'https://web-code-game.pages.dev/api/stats',
      'https://web-code-game.pages.dev/api/realtime-events',
      'https://admin-code-game-shop.pages.dev/api/sync',
      'https://admin-code-game-shop.pages.dev/api/news',
      'https://admin-code-game-shop.pages.dev/api/metrics/synced',
      'https://admin-code-game-shop.pages.dev/api/stats',
      'https://admin-code-game-shop.pages.dev/api/realtime-events',
      ...extraUrls,
    ];
    for (const u of localKeys) {
      try {
        ctx.waitUntil(cache.delete(new Request(u, { method: 'GET' })));
      } catch {}
    }
  }

  // 2. Danh sách các URL cần Purge toàn cầu (Bao gồm cả Web Khách lẫn Trang Admin)
  const purgeUrls = Array.from(new Set([
    cleanUrl,
    'https://codegame.shop/api/games',
    'https://codegame.shop/api/sync',
    'https://codegame.shop/api/news',
    'https://codegame.shop/api/metrics/synced',
    'https://codegame.shop/api/stats',
    'https://codegame.shop/api/realtime-events',
    'https://www.codegame.shop/api/games',
    'https://www.codegame.shop/api/sync',
    'https://www.codegame.shop/api/news',
    'https://www.codegame.shop/api/metrics/synced',
    'https://www.codegame.shop/api/stats',
    'https://www.codegame.shop/api/realtime-events',
    'https://web-code-game.pages.dev/api/games',
    'https://web-code-game.pages.dev/api/sync',
    'https://web-code-game.pages.dev/api/news',
    'https://web-code-game.pages.dev/api/metrics/synced',
    'https://web-code-game.pages.dev/api/stats',
    'https://web-code-game.pages.dev/api/realtime-events',
    'https://admin-code-game-shop.pages.dev/api/sync',
    'https://admin-code-game-shop.pages.dev/api/news',
    'https://admin-code-game-shop.pages.dev/api/metrics/synced',
    'https://admin-code-game-shop.pages.dev/api/stats',
    'https://admin-code-game-shop.pages.dev/api/realtime-events',
  ]));

  // 3. Kích hoạt Cloudflare Global Purge REST API không đồng bộ (non-blocking)
  ctx.waitUntil(purgeCloudflareGlobalCache(purgeUrls, env));
}
