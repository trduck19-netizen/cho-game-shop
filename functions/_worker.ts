import * as syncApi from './api/sync';
import * as statsApi from './api/stats';
import * as voteApi from './api/vote';
import * as loginApi from './api/auth/login';
import * as registerApi from './api/auth/register';
import * as meApi from './api/auth/me';
import * as resetPasswordApi from './api/auth/reset-password';
import * as ordersCreateApi from './api/orders/create';
import * as sepayWebhookApi from './api/webhooks/sepay';
import * as giveawaysClaimApi from './api/giveaways/claim';
import * as giveawaysSimulateApi from './api/giveaways/simulate';
import * as giveawaysManageApi from './api/giveaways/manage';
import { runGiveawaySimulation } from './services/giveaway_simulation_service';
import * as adminMigrateApi from './api/admin/migrate';
import * as adminAuditCountersApi from './api/admin/audit-counters';
import * as adminSepayCreditApi from './api/admin/sepay-credit';
import * as adminTemporaryTokenApi from './api/admin/temporary-token';
import * as adminHistoryApi from './api/admin/history';
import * as realtimeEventsApi from './api/realtime-events';
import * as metricsSyncedApi from './api/metrics/synced';
import * as gamesApi from './api/games';
import * as crawlArticleApi from './api/crawl-article';
import * as gameIconApi from './api/game-icon';
import * as ingestCodesApi from './api/crawler/ingest-codes';
import * as ingestUpcomingGamesApi from './api/crawler/ingest-upcoming-games';
import * as marketingApi from './api/crawler/marketing';
import * as notifSubscribeApi from './api/notifications/subscribe';
import * as notifUnsubscribeApi from './api/notifications/unsubscribe';
import * as notifSubscribersApi from './api/notifications/subscribers';
import * as notifSettingsApi from './api/notifications/settings';
import * as notifSendApi from './api/notifications/send';
import * as notifLogsApi from './api/notifications/logs';
import * as trackDownloadApi from './api/track-download';
import * as newsIndexApi from './api/news/index';
import * as newsIdApi from './api/news/[id]';
import * as missionsIndexApi from './api/missions/index';
import * as missionsIdApi from './api/missions/[id]';
import * as missionsSubmitApi from './api/missions/submit';
import * as missionsMySubmissionsApi from './api/missions/my-submissions';
import * as missionsSubmissionsApi from './api/missions/submissions';
import * as missionsPoolsApi from './api/missions/pools';
import * as missionsAiPendingApi from './api/missions/ai/pending';
import * as missionsAiReviewApi from './api/missions/ai/review';
import * as missionsAiKeysApi from './api/missions/ai-keys';
import * as missionsAuditLogsApi from './api/missions/audit-logs';
import * as apiKeysIndexApi from './api/api-keys/index';
import * as apiKeysIdApi from './api/api-keys/[id]';
import * as eventSchedulerApi from './api/event-scheduler/index';
import { invalidateCatalogEdgeCache } from './services/cache_service';
import fallbackGiveawaysData from '../src/data/giveaways.json';
import fallbackGamesData from '../src/data/games188.json';
import fallbackCodesData from '../src/data/crawled_codes_188.json';
import { isCodeExpired } from '../src/utils/codeUtils';

function attachBuildHeaders(res: Response): Response {
  try {
    const headers = new Headers(res.headers);
    if (typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__) {
      headers.set('X-Build-Id', __BUILD_ID__);
      headers.set('X-Version', `1.0.0-${__BUILD_ID__}`);
    }
    if (typeof __BUILD_TIME__ !== 'undefined' && __BUILD_TIME__) {
      headers.set('X-Build-Time', __BUILD_TIME__);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch {
    return res;
  }
}

interface Env {
  DB?: D1Database;
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
  PASSWORD_PEPPER?: string;
  ENVIRONMENT?: string;
  CLOUDFLARE_ZONE_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

let lastGiveawaySimulationTick = 0;

async function handleWorkerRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    const method = request.method.toUpperCase();

    // Block sensitive dotfiles and configuration probe attacks (.env, .git, .aws, etc.)
    const lowerPath = pathname.toLowerCase();
    if (
      lowerPath.startsWith('/.env') ||
      lowerPath.startsWith('/.git') ||
      lowerPath.startsWith('/.svn') ||
      lowerPath.startsWith('/.hg') ||
      lowerPath.startsWith('/.bzr') ||
      lowerPath.startsWith('/.aws') ||
      lowerPath.startsWith('/.ssh') ||
      lowerPath.startsWith('/.wrangler') ||
      lowerPath === '/.ds_store' ||
      lowerPath === '/thumbs.db'
    ) {
      return new Response('Not Found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Route handler for mobile APK download: redirect to official GitHub Release
    if (
      pathname === '/download/codegame.apk' ||
      pathname === '/download/CodeGame-v1.0.apk' ||
      lowerPath === '/download/codegame.apk' ||
      lowerPath === '/download/codegame-v1.0.apk'
    ) {
      return Response.redirect(
        'https://github.com/synqpe-jpg/web-code-game/releases/download/v1.0.0/CodeGame-v1.0.apk',
        302
      );
    }

    // Canonical primary domain redirect: web-code-game.pages.dev & www.codegame.shop -> codegame.shop (for browser page navigation)
    if (
      (url.hostname === 'web-code-game.pages.dev' || url.hostname === 'www.codegame.shop') &&
      method === 'GET' &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/sync-bridge') &&
      !pathname.match(/\.(js|css|json|webp|png|jpg|jpeg|svg|ico|txt|xml|woff2?|map|apk)$/i)
    ) {
      const redirectUrl = new URL(request.url);
      redirectUrl.hostname = 'codegame.shop';
      redirectUrl.protocol = 'https:';
      return Response.redirect(redirectUrl.toString(), 301);
    }

    // Dedicated Admin Domain & Route: redirect root to /admin, and serve /admin/index.html
    const isAdminHost = url.hostname.includes('admin-code-game-shop') || url.hostname.startsWith('admin.');
    if (isAdminHost && (pathname === '/' || pathname === '')) {
      const adminRedirect = new URL('/admin', request.url);
      return Response.redirect(adminRedirect.toString(), 302);
    }

    if (
      (isAdminHost || pathname === '/admin' || pathname.startsWith('/admin/')) &&
      method === 'GET' &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/sync-bridge') &&
      !pathname.match(/\.(js|css|json|webp|png|jpg|jpeg|svg|ico|txt|xml|woff2?|map|apk)$/i)
    ) {
      const adminUrl = new URL('/admin/index.html', request.url);
      const res = await env.ASSETS.fetch(new Request(adminUrl.toString()));
      if (res.status === 200) {
        return res;
      }
    }

    // CORS Preflight for all API endpoints
    if (method === 'OPTIONS' && pathname.startsWith('/api')) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-Requested-With, X-Forwarded-Sync, Idempotency-Key, idempotency-key, Apikey, apikey, x-api-key, X-Api-Key, Cache-Control, cache-control, Pragma, pragma',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const context: any = {
      request,
      env,
      params: {},
      waitUntil: ctx.waitUntil.bind(ctx),
      next: () => env.ASSETS.fetch(request),
      data: {},
    };

    try {
      // 1. /api/sync with Cloudflare Edge Cache API (caches.default)
      if (pathname === '/api/sync') {
        if (method === 'GET') {
          const authHeader = request.headers.get('Authorization') || '';
          const syncKeyHeader = request.headers.get('X-Sync-Key') || '';
          const isNoCache = request.headers.get('Cache-Control')?.includes('no-cache') ||
                            request.headers.get('Pragma')?.includes('no-cache') ||
                            url.searchParams.has('nocache') ||
                            url.searchParams.has('fresh');
          const isPublic = !authHeader && !syncKeyHeader && !isNoCache && !url.searchParams.has('key');

          // Edge Cache API: caches.default cho khách truy cập công khai (TTL 60s, stale-while-revalidate 30s)
          if (isPublic && typeof caches !== 'undefined' && (caches as any).default) {
            const cache = (caches as any).default;
            const cacheUrl = new URL(request.url);
            cacheUrl.search = ''; // Chuẩn hóa URL cache cho catalog công khai
            const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

            const cached = await cache.match(cacheKey);
            if (cached) {
              const res = new Response(cached.body, cached);
              res.headers.set('CF-Edge-Cache-Status', 'HIT');
              return res;
            }

            const response = await syncApi.onRequestGet(context);
            if (response.status === 200) {
              const responseText = await response.text();
              const headers = new Headers(response.headers);
              headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=30');

              const cacheToPut = new Response(responseText, {
                status: response.status,
                headers,
              });
              ctx.waitUntil(cache.put(cacheKey, cacheToPut));

              const resOut = new Response(responseText, {
                status: response.status,
                headers,
              });
              resOut.headers.set('CF-Edge-Cache-Status', 'MISS');
              return resOut;
            }
            return response;
          }

          return await syncApi.onRequestGet(context);
        }

        if (method === 'POST') {
          const postRes = await syncApi.onRequestPost(context);
          // Purge Edge Cache toàn cầu (Global REST API + PoP cục bộ)
          await invalidateCatalogEdgeCache(ctx, request, env);
          return postRes;
        }
      }

      // 1b. /api/realtime-events (CDN edge cached real events & stats endpoint with 15s Edge Cache)
      if (pathname === '/api/realtime-events') {
        if (method === 'GET') {
          if (typeof caches !== 'undefined' && (caches as any).default) {
            const reqUrl = new URL(request.url);
            const ccHeader = request.headers.get('cache-control') || '';
            const isFreshRequested = reqUrl.searchParams.has('fresh') || reqUrl.searchParams.has('force') || reqUrl.searchParams.has('_t') || ccHeader.includes('no-cache') || ccHeader.includes('no-store');

            const cache = (caches as any).default;
            const cacheUrl = new URL(request.url);
            cacheUrl.search = '';
            const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

            if (!isFreshRequested) {
              const cached = await cache.match(cacheKey);
              if (cached) {
                const res = new Response(cached.body, cached);
                res.headers.set('CF-Edge-Cache-Status', 'HIT');
                return res;
              }
            }

            const response = await realtimeEventsApi.onRequestGet(context);
            if (response.status === 200) {
              const responseText = await response.text();
              const headers = new Headers(response.headers);
              headers.set('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=15');

              const cacheToPut = new Response(responseText, {
                status: response.status,
                headers,
              });
              ctx.waitUntil(cache.put(cacheKey, cacheToPut));

              const resOut = new Response(responseText, {
                status: response.status,
                headers,
              });
              resOut.headers.set('CF-Edge-Cache-Status', 'MISS');
              return resOut;
            }
            return response;
          }

          if (realtimeEventsApi.onRequestGet) return await realtimeEventsApi.onRequestGet(context);
        }
        if (method === 'OPTIONS' && realtimeEventsApi.onRequestOptions) return await realtimeEventsApi.onRequestOptions(context);
      }

      // 1c. /api/metrics/synced (Global deterministic snapshot with 30s Edge Cache)
      if (pathname === '/api/metrics/synced') {
        if (method === 'GET') {
          if (typeof caches !== 'undefined' && (caches as any).default) {
            const reqUrl = new URL(request.url);
            const ccHeader = request.headers.get('cache-control') || '';
            const isFreshRequested = reqUrl.searchParams.has('fresh') || reqUrl.searchParams.has('force') || reqUrl.searchParams.has('_t') || reqUrl.searchParams.has('t') || ccHeader.includes('no-cache') || ccHeader.includes('no-store');

            const cache = (caches as any).default;
            const cacheUrl = new URL(request.url);
            cacheUrl.search = '';
            const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

            if (!isFreshRequested) {
              const cached = await cache.match(cacheKey);
              if (cached) {
                const res = new Response(cached.body, cached);
                res.headers.set('CF-Edge-Cache-Status', 'HIT');
                return res;
              }
            }

            const response = await metricsSyncedApi.onRequestGet(context);
            if (response.status === 200) {
              const responseText = await response.text();
              const headers = new Headers(response.headers);
              headers.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=30');

              const cacheToPut = new Response(responseText, {
                status: response.status,
                headers,
              });
              ctx.waitUntil(cache.put(cacheKey, cacheToPut));

              const resOut = new Response(responseText, {
                status: response.status,
                headers,
              });
              resOut.headers.set('CF-Edge-Cache-Status', 'MISS');
              return resOut;
            }
            return response;
          }

          return await metricsSyncedApi.onRequestGet(context);
        }
      }

      // 1d. /api/games (Server-Side Pagination, Edge Cache API with Full Query String)
      if (pathname === '/api/games') {
        if (method === 'GET' && gamesApi.onRequestGet) {
          const reqUrl = new URL(request.url);
          const isNoCache = reqUrl.searchParams.has('nocache') ||
                            reqUrl.searchParams.has('fresh') ||
                            request.headers.get('Cache-Control')?.includes('no-cache') ||
                            request.headers.get('Pragma')?.includes('no-cache');

          // Edge Cache API: caches.default with cache key by full query string
          if (!isNoCache && typeof caches !== 'undefined' && (caches as any).default) {
            const cache = (caches as any).default;
            const cacheKey = new Request(request.url, { method: 'GET' });

            const cached = await cache.match(cacheKey);
            if (cached) {
              const res = new Response(cached.body, cached);
              res.headers.set('CF-Edge-Cache-Status', 'HIT');
              return res;
            }

            const response = await gamesApi.onRequestGet(context);
            if (response.status === 200) {
              const responseText = await response.text();
              const headers = new Headers(response.headers);
              // Cache at edge for 120s, stale-while-revalidate for 600s
              headers.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=600');

              const cacheToPut = new Response(responseText, {
                status: response.status,
                headers,
              });
              ctx.waitUntil(cache.put(cacheKey, cacheToPut));

              const resOut = new Response(responseText, {
                status: response.status,
                headers,
              });
              resOut.headers.set('CF-Edge-Cache-Status', 'MISS');
              return resOut;
            }
            return response;
          }

          return await gamesApi.onRequestGet(context);
        }
        if (method === 'OPTIONS' && gamesApi.onRequestOptions) return await gamesApi.onRequestOptions(context);
      }

      // 2. /api/stats
      if (pathname === '/api/stats') {
        if (method === 'GET' && statsApi.onRequestGet) return await statsApi.onRequestGet(context);
      }

      // 3. /api/vote
      if (pathname === '/api/vote') {
        if (method === 'POST' && voteApi.onRequestPost) return await voteApi.onRequestPost(context);
      }

      // 4. /api/auth/*
      if (pathname === '/api/auth/login') {
        if (method === 'POST') return await loginApi.onRequestPost(context);
      }
      if (pathname === '/api/auth/register') {
        if (method === 'POST') return await registerApi.onRequestPost(context);
      }
      if (pathname === '/api/auth/me') {
        if (method === 'GET') return await meApi.onRequestGet(context);
      }
      if (pathname === '/api/auth/reset-password') {
        if (method === 'POST') return await resetPasswordApi.onRequestPost(context);
      }

      // 5. /api/orders/*
      if (pathname === '/api/orders/create' || pathname === '/api/orders') {
        if (method === 'POST') {
          const res = await ordersCreateApi.onRequestPost(context);
          if (res.status === 200) {
            await invalidateCatalogEdgeCache(ctx, request, env);
          }
          return res;
        }
      }

      // 6. /api/webhooks/sepay
      if (pathname === '/api/webhooks/sepay' || pathname === '/api/webhooks') {
        if (method === 'POST') return await sepayWebhookApi.onRequestPost(context);
        if (method === 'GET' && sepayWebhookApi.onRequestGet) return await sepayWebhookApi.onRequestGet(context);
      }

      // 7. /api/giveaways/claim
      if (pathname === '/api/giveaways/claim') {
        if (method === 'POST') {
          const res = await giveawaysClaimApi.onRequestPost(context);
          if (res.status === 200) {
            try {
              ctx.waitUntil(invalidateCatalogEdgeCache(ctx, request, env));
            } catch (cErr: any) {
              console.warn('[GiveawaysClaim] Edge cache purge non-fatal error:', cErr?.message);
            }
          }
          return res;
        }
      }

      // 7b. /api/giveaways/simulate (Tự động mô phỏng lượt giật cho giveaway có giãn cách toàn sàn)
      if (pathname === '/api/giveaways/simulate') {
        if (method === 'OPTIONS') return await giveawaysSimulateApi.onRequestOptions(context);
        if (method === 'GET') return await giveawaysSimulateApi.onRequestGet(context);
        if (method === 'POST') {
          const simRes = await giveawaysSimulateApi.onRequestPost(context);
          try {
            ctx.waitUntil(invalidateCatalogEdgeCache(ctx, request, env));
          } catch {}
          return simRes;
        }
      }

      // 7c. /api/giveaways/manage & /api/giveaways (Giveaway Full Management Edge API)
      if (pathname === '/api/giveaways/manage' || pathname === '/api/giveaways') {
        if (method === 'OPTIONS') return await giveawaysManageApi.onRequestOptions();
        if (method === 'POST') return await giveawaysManageApi.onRequestPost(context);
        if (method === 'PUT') return await giveawaysManageApi.onRequestPut(context);
        if (method === 'DELETE') return await giveawaysManageApi.onRequestDelete(context);
        return await giveawaysManageApi.onRequestGet(context);
      }

      // 7d. /api/event-scheduler & /api/events/schedule (Event Scheduler & Countdown Full Management Edge API)
      if (pathname === '/api/event-scheduler' || pathname === '/api/events/schedule') {
        if (method === 'OPTIONS') return await eventSchedulerApi.onRequestOptions(context);
        if (method === 'POST') return await eventSchedulerApi.onRequestPost(context);
        if (method === 'PUT') return await eventSchedulerApi.onRequestPut(context);
        if (method === 'DELETE') return await eventSchedulerApi.onRequestDelete(context);
        return await eventSchedulerApi.onRequestGet(context);
      }

      // Passive Tick: Tự động chạy quét mô phỏng mỗi 5 phút một cách nhẹ nhàng
      if (env.DB && (Date.now() - lastGiveawaySimulationTick > 300000)) {
        lastGiveawaySimulationTick = Date.now();
        ctx.waitUntil(
          runGiveawaySimulation(env.DB).catch((e: any) => console.warn('[AutoSimTick error]', e?.message))
        );
      }

      // 8. /api/admin/migrate (PERMANENTLY LOCKED & DISABLED)
      if (pathname === '/api/admin/migrate') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'ENDPOINT_PERMANENTLY_LOCKED',
            message: 'Tuyến đường /api/admin/migrate đã được khóa vĩnh viễn sau khi hoàn tất di chuyển dữ liệu sang D1.',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // 8b. /api/admin/audit-counters (Counter Cache Audit & Drift Recovery)
      if (pathname === '/api/admin/audit-counters') {
        if (method === 'GET') return await adminAuditCountersApi.onRequestGet(context);
        if (method === 'POST') return await adminAuditCountersApi.onRequestPost(context);
        if (method === 'OPTIONS') return await adminAuditCountersApi.onRequestOptions(context);
      }

      // 8c. /api/admin/sepay-credit (Manual SePay Credit & Compensation)
      if (pathname === '/api/admin/sepay-credit') {
        if (method === 'POST') return await adminSepayCreditApi.onRequestPost(context);
        if (method === 'OPTIONS') return await adminSepayCreditApi.onRequestOptions(context);
      }

      // 8c-2. /api/admin/temporary-token (Temporary Audit Token Management)
      if (pathname === '/api/admin/temporary-token') {
        if (method === 'GET') return await adminTemporaryTokenApi.onRequestGet(context);
        if (method === 'POST') return await adminTemporaryTokenApi.onRequestPost(context);
        if (method === 'OPTIONS') return await adminTemporaryTokenApi.onRequestOptions(context);
      }

      // 8c-3. /api/admin/history (Soft-Delete History & Recovery API)
      if (pathname === '/api/admin/history') {
        if (method === 'GET') return await adminHistoryApi.onRequestGet(context);
        if (method === 'POST') return await adminHistoryApi.onRequestPost(context);
        if (method === 'OPTIONS') return await adminHistoryApi.onRequestOptions(context);
      }

      // 8d. /api/crawl-article (AI Article Crawler & Extractor)
      if (pathname === '/api/crawl-article') {
        return await crawlArticleApi.onRequest(context);
      }

      // 8e. /api/game-icon (Edge Game Icon Proxy & Caching)
      if (pathname === '/api/game-icon') {
        if (method === 'OPTIONS') return await gameIconApi.onRequestOptions();
        return await gameIconApi.onRequestGet(context);
      }

      // 8f. /api/crawler/ingest-codes (Muse Bot & External Giftcode Ingestion API)
      if (pathname === '/api/crawler/ingest-codes') {
        if (method === 'OPTIONS') return await ingestCodesApi.onRequestOptions();
        if (method === 'POST') return await ingestCodesApi.onRequestPost(context);
        return await ingestCodesApi.onRequestGet(context);
      }

      // 8g. /api/crawler/ingest-upcoming-games (Muse Bot Upcoming Games Ingestion API)
      if (pathname === '/api/crawler/ingest-upcoming-games') {
        if (method === 'OPTIONS') return await ingestUpcomingGamesApi.onRequestOptions();
        if (method === 'POST') return await ingestUpcomingGamesApi.onRequestPost(context);
        return await ingestUpcomingGamesApi.onRequestGet(context);
      }

      // 8h. /api/crawler/marketing (Muse Bot Marketing & FOMO Independent Audit API)
      if (pathname === '/api/crawler/marketing') {
        if (method === 'OPTIONS') return await marketingApi.onRequestOptions();
        if (method === 'POST') return await marketingApi.onRequestPost(context);
        return await marketingApi.onRequestGet(context);
      }

      // 9. /api/notifications/* (Email Notification Hub)
      if (pathname === '/api/notifications/subscribe') {
        if (method === 'OPTIONS') return await notifSubscribeApi.onRequestOptions();
        if (method === 'POST') return await notifSubscribeApi.onRequestPost(context);
        return await notifSubscribeApi.onRequestGet(context);
      }

      if (pathname === '/api/notifications/unsubscribe') {
        if (method === 'OPTIONS') return await notifUnsubscribeApi.onRequestOptions();
        if (method === 'GET') return await notifUnsubscribeApi.onRequestGet(context);
        if (method === 'POST') return await notifUnsubscribeApi.onRequestPost(context);
      }

      if (pathname === '/api/notifications/subscribers') {
        if (method === 'OPTIONS') return await notifSubscribersApi.onRequestOptions();
        if (method === 'GET') return await notifSubscribersApi.onRequestGet(context);
        if (method === 'DELETE') return await notifSubscribersApi.onRequestDelete(context);
      }

      if (pathname === '/api/notifications/settings') {
        if (method === 'OPTIONS') return await notifSettingsApi.onRequestOptions();
        if (method === 'GET') return await notifSettingsApi.onRequestGet(context);
        if (method === 'POST') return await notifSettingsApi.onRequestPost(context);
      }

      if (pathname === '/api/notifications/send') {
        if (method === 'OPTIONS') return await notifSendApi.onRequestOptions();
        if (method === 'POST') return await notifSendApi.onRequestPost(context);
      }

      if (pathname === '/api/notifications/logs') {
        if (method === 'OPTIONS') return await notifLogsApi.onRequestOptions();
        return await notifLogsApi.onRequestGet(context);
      }

      // 12. /api/track-download (Download click tracking & stats)
      if (pathname === '/api/track-download') {
        if (method === 'OPTIONS') return await trackDownloadApi.onRequestOptions();
        if (method === 'POST') return await trackDownloadApi.onRequestPost(context);
        if (method === 'GET') return await trackDownloadApi.onRequestGet(context);
      }

      // 13. Missions System APIs
      if (pathname === '/api/missions') {
        if (method === 'OPTIONS') return await missionsIndexApi.onRequestOptions();
        if (method === 'POST') return await missionsIndexApi.onRequestPost(context);
        return await missionsIndexApi.onRequestGet(context);
      }

      if (pathname.startsWith('/api/missions/') && !pathname.startsWith('/api/missions/ai') && !['submit', 'my-submissions', 'submissions', 'pools', 'ai-keys', 'audit-logs'].includes(pathname.replace('/api/missions/', ''))) {
        const missionId = pathname.replace('/api/missions/', '');
        const customContext = { ...context, params: { id: missionId } };
        if (method === 'OPTIONS') return await missionsIdApi.onRequestOptions();
        if (method === 'PUT' || method === 'PATCH') return await missionsIdApi.onRequestPut(customContext);
        if (method === 'DELETE') return await missionsIdApi.onRequestDelete(customContext);
        return await missionsIdApi.onRequestGet(customContext);
      }

      if (pathname === '/api/missions/submit') {
        if (method === 'OPTIONS') return await missionsSubmitApi.onRequestOptions();
        if (method === 'POST') return await missionsSubmitApi.onRequestPost(context);
      }

      if (pathname === '/api/missions/my-submissions') {
        if (method === 'OPTIONS') return await missionsMySubmissionsApi.onRequestOptions();
        return await missionsMySubmissionsApi.onRequestGet(context);
      }

      if (pathname === '/api/missions/submissions') {
        if (method === 'OPTIONS') return await missionsSubmissionsApi.onRequestOptions();
        if (method === 'POST') return await missionsSubmissionsApi.onRequestPost(context);
        return await missionsSubmissionsApi.onRequestGet(context);
      }

      if (pathname === '/api/missions/pools') {
        if (method === 'OPTIONS') return await missionsPoolsApi.onRequestOptions();
        if (method === 'POST') return await missionsPoolsApi.onRequestPost(context);
        if (method === 'DELETE') return await missionsPoolsApi.onRequestDelete(context);
        return await missionsPoolsApi.onRequestGet(context);
      }

      if (pathname === '/api/missions/ai/pending') {
        if (method === 'OPTIONS') return await missionsAiPendingApi.onRequestOptions();
        return await missionsAiPendingApi.onRequestGet(context);
      }

      if (pathname === '/api/missions/ai/review') {
        if (method === 'OPTIONS') return await missionsAiReviewApi.onRequestOptions();
        if (method === 'POST') return await missionsAiReviewApi.onRequestPost(context);
      }

      if (pathname === '/api/missions/ai-keys') {
        if (method === 'OPTIONS') return await missionsAiKeysApi.onRequestOptions();
        if (method === 'POST') return await missionsAiKeysApi.onRequestPost(context);
        if (method === 'PUT') return await missionsAiKeysApi.onRequestPut(context);
        if (method === 'DELETE') return await missionsAiKeysApi.onRequestDelete(context);
        return await missionsAiKeysApi.onRequestGet(context);
      }

      if (pathname === '/api/missions/audit-logs') {
        if (method === 'OPTIONS') return await missionsAuditLogsApi.onRequestOptions();
        return await missionsAuditLogsApi.onRequestGet(context);
      }

      // 14. News Articles CRUD & Scheduling APIs
      if (pathname === '/api/news') {
        if (method === 'OPTIONS') return await newsIndexApi.onRequestOptions();
        if (method === 'POST') return await newsIndexApi.onRequestPost(context);
        return await newsIndexApi.onRequestGet(context);
      }

      if (pathname.startsWith('/api/news/') && pathname !== '/api/news') {
        const newsId = pathname.replace('/api/news/', '').trim();
        const customContext = { ...context, params: { id: newsId } };
        if (method === 'OPTIONS') return await newsIdApi.onRequestOptions();
        if (method === 'PUT' || method === 'PATCH') return await newsIdApi.onRequestPut(customContext);
        if (method === 'DELETE') return await newsIdApi.onRequestDelete(customContext);
        return await newsIdApi.onRequestGet(customContext);
      }

      // 15. System API Keys & Permissions Management
      if (pathname === '/api/api-keys') {
        if (method === 'OPTIONS') return await apiKeysIndexApi.onRequestOptions();
        if (method === 'POST') return await apiKeysIndexApi.onRequestPost(context);
        return await apiKeysIndexApi.onRequestGet(context);
      }

      if (pathname.startsWith('/api/api-keys/') && pathname !== '/api/api-keys') {
        const keyId = pathname.replace('/api/api-keys/', '').trim();
        const customContext = { ...context, params: { id: keyId } };
        if (method === 'OPTIONS') return await apiKeysIdApi.onRequestOptions();
        if (method === 'PATCH' || method === 'PUT') return await apiKeysIdApi.onRequestPatch(customContext);
        if (method === 'DELETE') return await apiKeysIdApi.onRequestDelete(customContext);
      }

      // Fallback for any unknown /api route
      if (pathname.startsWith('/api')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Endpoint not found', path: pathname }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Static assets fallback (SPA routing with Edge SEO & Social Meta Injection)
      const userAgent = request.headers.get('User-Agent') || '';
      const isCrawler = /facebookexternalhit|ZaloBot|TelegramBot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|Viber/i.test(userAgent);
      const isGiveawayShareQuery = (
        url.searchParams.has('gw') ||
        url.searchParams.has('giveaway') ||
        url.searchParams.has('event') ||
        url.searchParams.has('id')
      ) && (pathname === '/giveaways' || pathname === '/giveaway');

      if (request.method === 'GET' && isCrawler && isGiveawayShareQuery) {
        return await renderSeoHtml(request, env, pathname);
      }

      // Root Homepage HTML - Always fresh to guarantee chunk integrity
      if (request.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        // Tự động chuyển hướng 301 về URL canonical /game/:slug nếu người dùng hoặc bot truy cập qua ?game= hoặc ?g=
        const gameQueryParam = url.searchParams.get('game') || url.searchParams.get('g');
        if (gameQueryParam) {
          const cleanSlug = gameQueryParam.trim().toLowerCase();
          const primarySlug = GAME_CANONICAL_ALIASES[cleanSlug] || cleanSlug;
          return Response.redirect(`${origin}/game/${primarySlug}`, 301);
        }

        const pageParam = url.searchParams.get('page');
        const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
        if (pageNum > 1) {
          return await renderSeoHtml(request, env, pathname);
        }
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status === 200) {
          const headers = new Headers(assetResponse.headers);
          headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
          headers.set('Pragma', 'no-cache');
          headers.set('Expires', '0');
          return new Response(assetResponse.body, { status: 200, headers });
        }
        return assetResponse;
      }

      // Luôn phục vụ trang game, danh mục A-Z, chuyên mục thể loại, nhiệm vụ & sự kiện giveaway qua renderSeoHtml
      if (request.method === 'GET' && (
        pathname.startsWith('/game/') ||
        pathname.startsWith('/g/') ||
        pathname.startsWith('/giveaways/') ||
        pathname.startsWith('/giveaway/') ||
        pathname.startsWith('/the-loai/') ||
        pathname === '/the-loai' ||
        pathname === '/danh-sach-game-a-z' ||
        pathname === '/nhiem-vu' ||
        pathname.startsWith('/nhiem-vu/') ||
        pathname === '/missions' ||
        pathname.startsWith('/missions/')
      )) {
        return await renderSeoHtml(request, env, pathname);
      }

      // Phục vụ icon game động và tĩnh tại /game_icons/<slug>.<ext>
      if (pathname.startsWith('/game_icons/') && (method === 'GET' || method === 'HEAD')) {
        return await handleGameIconRequest(request, env, ctx, pathname);
      }

      // Server-side resilience layer for missing JS chunks (Stale deployments)
      if (request.method === 'GET' && pathname.startsWith('/assets/') && pathname.endsWith('.js')) {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status === 404) {
          console.warn(`[Worker] Stale JS chunk requested: ${pathname}. Returning auto-recovery stub.`);
          return new Response(
            `/* Stale deployment chunk auto-recovery stub */
console.warn('[AutoRecovery] Stale chunk requested: ${pathname}. Reloading page to load latest build...');
if (typeof window !== 'undefined') {
  const retryKey = 'wcg_edge_chunk_reload';
  const last = sessionStorage.getItem(retryKey);
  const now = Date.now();
  if (!last || now - parseInt(last, 10) > 8000) {
    sessionStorage.setItem(retryKey, String(now));
    window.location.reload();
  }
}
export default {};
`,
            {
              status: 200,
              headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
              },
            }
          );
        }
        return assetResponse;
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 404 && request.method === 'GET' && !pathname.match(/\.[a-zA-Z0-9]+$/)) {
        return await renderSeoHtml(request, env, pathname);
      }
      return assetResponse;
    } catch (err: any) {
      console.error('Worker API error:', err);
      return new Response(
        JSON.stringify({ success: false, error: err?.message || 'Server Internal Error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const res = await handleWorkerRequest(request, env, ctx);
    return attachBuildHeaders(res);
  },
};

/**
 * Danh sách bí danh (aliases) chuẩn hóa về Slug chính để tránh Google index trùng lặp
 */
const GAME_CANONICAL_ALIASES: Record<string, string> = {
  'dau-truong-chan-ly-mobile': 'dau-truong-chan-ly',
  'ta-la-hac-ngo-khong-vplay': 'ta-la-hac-ngo-khong',
  'tam-quoc-huyen-tuong': 'tam-quoc-huyen-tuong-vng',
  'x-wukong-dai-chien-tam-gioi': 'x-wukong',
  'huyen-thoai-hai-tac': 'pirate-legends',
  'seven-deadly-sins-grand-cross': 'the-seven-deadly-sins-grand-cross',
  'where-winds-meet-mobile': 'yen-van-thap-luc-thanh',
  'loan-the-3q': 'loan-the-3q-than-ma-lenh-oeg',
};

const TOPIC_CLUSTERS = [
  {
    slug: 'kiem-hiep-tien-hiep',
    name: 'Kiếm Hiệp & Tiên Hiệp',
    match: (c: string) => /kiếm hiệp|tiên hiệp|võ hiệp|tu tiên/i.test(c),
  },
  {
    slug: 'nhap-vai-gacha-anime',
    name: 'Nhập Vai Gacha & Anime',
    match: (c: string) => /anime|gacha|waifu/i.test(c),
  },
  {
    slug: 'ban-sung-sinh-ton',
    name: 'Bắn Súng & Sinh Tồn',
    match: (c: string) => /bắn súng|sinh tồn|battle royale/i.test(c),
  },
  {
    slug: 'tam-quoc-chien-thuat',
    name: 'Tam Quốc & Chiến Thuật',
    match: (c: string) => /tam quốc|chiến thuật|chiến lược|slg|đế chế|thẻ tướng/i.test(c),
  },
  {
    slug: 'roblox-mini-game',
    name: 'Roblox & Mini Game',
    match: (c: string) => /roblox|mini game/i.test(c),
  },
  {
    slug: 'nhap-vai-mmorpg',
    name: 'Nhập Vai & MMORPG',
    match: (c: string) => /mmorpg|nhập vai|arpg/i.test(c),
  },
];

function getClusterSlug(category: string = ''): string {
  const c = String(category || '').toLowerCase();
  for (const cluster of TOPIC_CLUSTERS) {
    if (cluster.match(c)) return cluster.slug;
  }
  return 'nhap-vai-mmorpg';
}

function parseHowToSteps(instructions: string = '', gameName: string = '') {
  const text = (instructions || '').trim();
  if (text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 5);
    const stepLines = lines.filter((l) => /^(bước|\d+[\.\)]|b\d+:)/i.test(l));
    if (stepLines.length >= 2) {
      return stepLines.slice(0, 6).map((line, idx) => {
        const cleanText = line.replace(/^(bước\s*\d+[:\.]*|\d+[\.\)]|b\d+[:\.]*)\s*/i, '').trim();
        return {
          '@type': 'HowToStep',
          position: idx + 1,
          name: cleanText.slice(0, 60),
          text: line,
        };
      });
    }
  }
  return [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Mở game và đăng nhập',
      text: `Khởi động trò chơi ${gameName} trên thiết bị và đăng nhập vào tài khoản nhân vật của bạn.`,
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Tìm mục Đổi Quà / Phúc Lợi',
      text: `Nhấp vào biểu tượng Sự Kiện, Phúc Lợi hoặc Cài Đặt theo giao diện của ${gameName}.`,
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Nhập mã giftcode',
      text: `Sao chép mã giftcode từ CodeGame.shop và dán chính xác vào ô nhập mã quà tặng.`,
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Xác nhận và nhận quà',
      text: `Bấm Đổi Quà và kiểm tra hòm Thư trong game ${gameName} để nhận vật phẩm ngay tức thì.`,
    },
  ];
}

/**
 * Cloudflare Edge SEO Engine: Injects dynamic Open Graph, Twitter Cards,
 * Page Titles, Canonical URLs, and Schema.org JSON-LD for individual game pages
 * and major sections before returning HTML to crawlers & users.
 */
async function renderSeoHtml(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response> {
  const origin = 'https://codegame.shop';

  // 1. Chuyển hướng 301 chuẩn hóa cho /g/:slug -> /game/:slug hoặc slug chính
  if (pathname.startsWith('/g/')) {
    const rawSlug = pathname.replace(/^\/g\//i, '').replace(/\/$/, '').trim().toLowerCase();
    const primarySlug = GAME_CANONICAL_ALIASES[rawSlug] || rawSlug;
    return Response.redirect(`${origin}/game/${primarySlug}`, 301);
  }

  // 1.5. Phục vụ trực tiếp các trang tĩnh chuyên mục thể loại, nhiệm vụ và mục lục A-Z từ prerender
  if (
    pathname.startsWith('/the-loai') ||
    pathname === '/danh-sach-game-a-z' ||
    pathname === '/nhiem-vu' ||
    pathname.startsWith('/nhiem-vu/') ||
    pathname === '/missions' ||
    pathname.startsWith('/missions/')
  ) {
    const cleanPath = pathname.replace(/\/$/, '');
    const assetUrl = new URL(`${cleanPath}.html`, request.url);
    const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString()));
    if (assetRes.status === 200) {
      return assetRes;
    }
    const idxUrl = new URL(`${cleanPath}/index.html`, request.url);
    const idxRes = await env.ASSETS.fetch(new Request(idxUrl.toString()));
    if (idxRes.status === 200) {
      return idxRes;
    }
  }

  // 2. Chuyển hướng 301 chuẩn hóa cho các bí danh trùng lặp -> slug chính
  if (pathname.startsWith('/game/')) {
    const rawSlug = pathname.replace(/^\/game\//i, '').replace(/\/$/, '').trim().toLowerCase();
    if (GAME_CANONICAL_ALIASES[rawSlug]) {
      return Response.redirect(`${origin}/game/${GAME_CANONICAL_ALIASES[rawSlug]}`, 301);
    }
  }

  const indexUrl = new URL('/', request.url);
  const baseRes = await env.ASSETS.fetch(new Request(indexUrl, request));
  if (baseRes.status !== 200) {
    return baseRes;
  }

  let html = await baseRes.text();

  const replaceTitleAndMeta = (
    title: string,
    description: string,
    canonicalPath: string,
    ogImage: string,
    extraLdJson?: any
  ) => {
    const fullCanonical = `${origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    const fullOgImage = ogImage.startsWith('http') ? ogImage : `${origin}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`;

    // 1. Title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

    // 2. Meta description
    html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${description}">`);

    // 3. Canonical
    html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${fullCanonical}">`);

    // 4. Clean up ALL existing Open Graph image & Twitter image tags first to prevent duplicate width/height conflicts
    html = html.replace(/<meta\s+property="og:image[^>]*\/?>\s*/gi, '');
    html = html.replace(/<meta\s+name="twitter:image[^>]*\/?>\s*/gi, '');

    // 5. Open Graph tags
    html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}">`);
    html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${description}">`);
    html = html.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, `<meta property="og:url" content="${fullCanonical}">`);

    const ogImageBlock = `<meta property="og:image" content="${fullOgImage}">\n` +
      `    <meta property="og:image:secure_url" content="${fullOgImage}">\n` +
      `    <meta property="og:image:type" content="image/jpeg">\n` +
      `    <meta property="og:image:width" content="512">\n` +
      `    <meta property="og:image:height" content="512">\n` +
      `    <meta property="og:image:alt" content="${title}">`;
    html = html.replace(/(<meta\s+property="og:url"[^>]*>)/i, `$1\n    ${ogImageBlock}`);

    // 6. Twitter tags
    html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}">`);
    html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${description}">`);
    html = html.replace(/<meta\s+name="twitter:url"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:url" content="${fullCanonical}">`);

    const twitterImageBlock = `<meta name="twitter:image" content="${fullOgImage}">\n` +
      `    <meta name="twitter:image:alt" content="${title}">`;
    html = html.replace(/(<meta\s+name="twitter:url"[^>]*>)/i, `$1\n    ${twitterImageBlock}`);

    // 6. Inject Schema.org JSON-LD
    if (extraLdJson) {
      const schemas = Array.isArray(extraLdJson) ? extraLdJson : [extraLdJson];
      const ldStr = `\n    <!-- Page-Specific Schema.org JSON-LD -->\n` +
        schemas.map(s => `    <script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n    </script>`).join('\n') +
        `\n  </head>`;
      html = html.replace('</head>', ldStr);
    }
  };

  if (pathname.startsWith('/game/') || pathname.startsWith('/g/')) {
    let slug = pathname.replace(/^\/(?:game|g)\//i, '').replace(/\/$/, '').trim().toLowerCase();
    if (slug === 'doors') slug = 'doors-roblox';
    const cleanWithoutMobile = slug.replace(/-mobile$/i, '');
    let game: any = null;
    let displayCodes: any[] = [];
    const isWwmGame = slug === 'where-winds-meet' || slug === 'where-winds-meet-mobile' || slug === 'yen-van-thap-luc-thanh';

    if (env.DB) {
      try {
        // 1. Tra cứu trực tiếp từ bảng games D1
        const lookupSlug = isWwmGame ? 'yen-van-thap-luc-thanh' : slug;
        const gameRow = await env.DB.prepare(
          'SELECT * FROM games WHERE slug = ? OR id = ? OR slug = ? LIMIT 1'
        ).bind(lookupSlug, lookupSlug, cleanWithoutMobile).first<any>().catch(() => null);

        if (gameRow) {
          game = { ...gameRow };
          const codesRes = await (
            isWwmGame
              ? env.DB.prepare(
                  `SELECT code, rewards, status, expires_at FROM codes WHERE game_slug = 'yen-van-thap-luc-thanh' OR game_slug = 'where-winds-meet-mobile' OR game_slug = 'where-winds-meet' ORDER BY CASE WHEN status = 'active' OR status = 'verified' THEN 0 ELSE 1 END, added_at DESC`
                ).all<any>()
              : env.DB.prepare(
                  `SELECT code, rewards, status, expires_at FROM codes WHERE game_slug = ? ORDER BY CASE WHEN status = 'active' OR status = 'verified' THEN 0 ELSE 1 END, added_at DESC`
                ).bind(gameRow.slug).all<any>()
          ).catch(() => ({ results: [] as any[] }));
          const allCodes = codesRes?.results || [];
          if (allCodes.length === 0) {
            const fbList = (fallbackCodesData as any)?.[gameRow.slug] || (fallbackCodesData as any)?.[slug] || (fallbackCodesData as any)?.[cleanWithoutMobile];
            if (Array.isArray(fbList) && fbList.length > 0) {
              displayCodes = fbList.map((c: any) => ({
                code: String(c.code || '').trim().toUpperCase(),
                rewards: c.rewards || c.description || null,
                status: 'active',
                expires_at: c.expires_at || c.expiry || null,
              })).filter((c: any) => Boolean(c.code));
            }
          } else {
            displayCodes = allCodes;
          }

          const activeCodes = displayCodes.filter((c: any) => !isCodeExpired(c));
          displayCodes = activeCodes.length > 0 ? activeCodes : displayCodes;
          game.codes = displayCodes;
          game.codes_count = isWwmGame ? 584 : activeCodes.length;
          game.active_codes_count = isWwmGame ? 584 : activeCodes.length;
          game.free_codes_count = isWwmGame ? 584 : activeCodes.length;
          game.expired_codes_count = isWwmGame ? 36 : (allCodes.length - activeCodes.length);
          game.total_codes_count = isWwmGame ? 620 : allCodes.length;
        }

        // Tự động đối chiếu với fallbackGamesData nếu bảng games D1 còn giữ văn mẫu Avatar cũ
        let currentInst = game?.instructions || '';
        let currentRedeem = game?.redeem_url || '';
        if (game && (!currentInst || currentInst.includes('Avatar nhân vật'))) {
          const fbG = (fallbackGamesData as any[]).find((x: any) => x && (x.slug === slug || x.id === slug || x.slug === game.slug || (isWwmGame && (x.slug === 'yen-van-thap-luc-thanh' || x.slug === 'where-winds-meet'))));
          if (fbG?.instructions && !fbG.instructions.includes('Avatar nhân vật')) {
            currentInst = fbG.instructions;
            currentRedeem = fbG.redeem_url || '';
            game.instructions = currentInst;
            game.redeem_url = currentRedeem;
          }
        }

        // 2. Fallback sang catalog nếu bảng games chưa có
        if (!game) {
          const catalog = await gamesApi.getLoadedCatalog(env.DB);
          game = catalog.allRawGames?.find((g: any) => g && (String(g.slug || '').toLowerCase() === slug || String(g.id || '').toLowerCase() === slug || String(g.slug || '').toLowerCase().replace(/-mobile$/i, '') === cleanWithoutMobile || (isWwmGame && (g.slug === 'yen-van-thap-luc-thanh' || g.slug === 'where-winds-meet'))));
          if (game) {
            const allResolved = gamesApi.resolveCodesForGame(game, catalog.codesMap) || [];
            const activeCodes = allResolved.filter((c: any) => !isCodeExpired(c));
            displayCodes = activeCodes.length > 0 ? activeCodes : allResolved;
            game.codes = displayCodes;
            game.codes_count = isWwmGame ? 584 : activeCodes.length;
            game.active_codes_count = isWwmGame ? 584 : activeCodes.length;
            game.free_codes_count = isWwmGame ? 584 : activeCodes.length;
            game.expired_codes_count = isWwmGame ? 36 : (allResolved.length - activeCodes.length);
            game.total_codes_count = isWwmGame ? 620 : allResolved.length;
          }
        }
      } catch {}
    }

    if (game) {
      const isWwm = isWwmGame || game.slug === 'where-winds-meet' || game.slug === 'where-winds-meet-mobile' || game.slug === 'yen-van-thap-luc-thanh';
      const codeCount = isWwm ? 584 : (game.codes_count || game.active_codes_count || displayCodes.length || 0);
      const countSuffix = codeCount > 0
        ? ` - Nhận ${codeCount} Mã Code`
        : ` - Hướng Dẫn Nhập & Nhận Quà`;
      const title = `Giftcode ${game.name} Mới Nhất 2026${countSuffix} | CodeGame.shop`;
      const description = codeCount > 0
        ? `Tổng hợp ${codeCount} mã giftcode ${game.name} còn hạn mới nhất 2026. Hướng dẫn nhập code chi tiết và phần thưởng tân thủ bản quyền G1.`
        : `Hướng dẫn nhập code ${game.name} chi tiết và cập nhật các đợt phát quà tặng tân thủ mới nhất 2026 từ ${game.publisher || 'NPH'}.`;
      const rawIcon = game.icon_url || (game.slug ? `/game_icons/${game.slug}.jpg` : '/og-image.jpg');
      const jpgIcon = rawIcon.replace(/\.webp$/i, '.jpg');
      const iconUrl = jpgIcon.startsWith('http') ? jpgIcon : `${origin}${jpgIcon.startsWith('/') ? jpgIcon : `/${jpgIcon}`}`;

      let maxTime = 0;
      if (game.updated_at) {
        const t = new Date(game.updated_at).getTime();
        if (!isNaN(t)) maxTime = Math.max(maxTime, t);
      }
      if (game.created_at) {
        const t = new Date(game.created_at).getTime();
        if (!isNaN(t)) maxTime = Math.max(maxTime, t);
      }
      for (const c of displayCodes) {
        if (c.added_at) {
          const t = new Date(c.added_at).getTime();
          if (!isNaN(t)) maxTime = Math.max(maxTime, t);
        }
      }
      if (maxTime === 0) {
        maxTime = new Date('2026-10-26T12:00:00Z').getTime();
      }
      const dateObj = new Date(maxTime);
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      const formattedDate = `${dd}/${mm}/${yyyy}`;
      const lastmodIso = dateObj.toISOString();
      const clusterSlug = getClusterSlug(game.category);

      const instructions = (game.instructions || '').trim();
      const redeemUrl = (game.redeem_url || '').trim();

      const schemas: any[] = [
        {
          "@context": "https://schema.org",
          "@type": "VideoGame",
          "name": game.name,
          "url": `${origin}/game/${game.slug}`,
          "image": iconUrl,
          "description": game.description || description,
          "gamePlatform": game.platform || "PC / Mobile",
          "applicationCategory": "Game",
          "publisher": {
            "@type": "Organization",
            "name": game.publisher || game.name
          },
          "dateModified": lastmodIso,
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "VND",
            "availability": "https://schema.org/InStock"
          }
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": `${origin}/` },
            { "@type": "ListItem", "position": 2, "name": "Tra Cứu Giftcode", "item": `${origin}/` },
            { "@type": "ListItem", "position": 3, "name": game.name, "item": `${origin}/game/${game.slug}` }
          ]
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": `Giftcode ${game.name} có hạn sử dụng không?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Các mã giftcode ${game.name} có thời hạn tùy thuộc vào sự kiện của ${game.publisher || 'Nhà phát hành'}. Bạn nên nhập ngay khi lấy mã để tránh hết hạn hoặc hết lượt kích hoạt.`
              }
            },
            {
              "@type": "Question",
              "name": `Làm sao để nhận thêm mã code ${game.name} mới nhất 2026?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `CodeGame.shop tự động theo dõi và cập nhật giftcode ${game.name} 24/7 từ các sự kiện bảo trì, ra mắt máy chủ và fanpage chính thức của ${game.publisher || 'NPH'}.`
              }
            }
          ]
        },
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": `Cách nhập Giftcode ${game.name} nhận quà tân thủ`,
          "description": `Hướng dẫn từng bước cách nhập mã giftcode ${game.name} thành công 100% để nhận Kim Cương, KNB và quà VIP.`,
          "image": iconUrl,
          "step": parseHowToSteps(instructions, game.name)
        }
      ];

      replaceTitleAndMeta(title, description, `/game/${game.slug}`, iconUrl, schemas);

      const playUrl = game.google_play_url || game.download_android || '';
      const iosUrl = game.app_store_url || game.download_ios || '';

      const escape = (str: any) => String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      const ssrBodyHtml = `
      <div class="min-h-screen flex flex-col bg-dark-950 text-gray-100 font-sans">
        <div class="max-w-4xl mx-auto px-4 py-6 w-full space-y-6">
          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 text-xs text-gray-400">
            <a href="/" class="hover:text-brand-400">Trang chủ</a>
            <span>/</span>
            <span class="text-white">${escape(game.name)}</span>
          </nav>

          <!-- Game Card Header -->
          <div class="flex items-start gap-4 p-5 rounded-2xl bg-dark-900 border border-gray-800">
            <img src="${escape(iconUrl)}" alt="${escape(game.name)}" width="64" height="64" class="w-16 h-16 rounded-2xl object-cover shrink-0" loading="eager" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">${escape(game.name)}</h1>
                ${game.category ? `<a href="/the-loai/${clusterSlug}" class="px-2 py-0.5 text-xs font-semibold rounded-md bg-brand-600/20 text-brand-400 border border-brand-500/30 hover:underline">${escape(game.category)}</a>` : ''}
              </div>
              ${game.publisher ? `<p class="text-xs sm:text-sm text-gray-400 font-semibold mt-0.5">${escape(game.publisher)}</p>` : ''}
              <div class="mt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <span>📅 Cập nhật: ${formattedDate} (Kiểm tra thực tế)</span>
              </div>
            </div>
          </div>

          ${(playUrl || iosUrl) ? `
          <!-- Download Section -->
          <div class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-3">
            <h2 class="text-base sm:text-lg font-bold text-white flex items-center justify-between">
              <span>📲 Tải Game Chính Thức</span>
              <span class="text-xs text-emerald-400 font-semibold">Official Store</span>
            </h2>
            <div class="flex items-center gap-3 flex-wrap">
              ${playUrl ? `<a href="${escape(playUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md">Tải trên CH Play</a>` : ''}
              ${iosUrl ? `<a href="${escape(iosUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm shadow-md">Tải trên App Store</a>` : ''}
            </div>
          </div>` : ''}

          <!-- Codes List -->
          <div class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-3">
            <h2 class="text-base sm:text-lg font-bold text-white flex items-center justify-between">
              <span>🎁 Danh Sách Giftcode ${escape(game.name)} Còn Hạn</span>
              <span class="text-xs text-brand-400 font-semibold">${displayCodes.length} mã khả dụng</span>
            </h2>
            <div class="space-y-2">
              ${displayCodes.length > 0 ? displayCodes.map((c: any) => {
                const val = escape(c.code || c.codeValue || c.code_value);
                const rew = c.rewards ? `🎁 ${escape(c.rewards)}` : `🎁 Chưa rõ phần thưởng`;
                const exp = String(c.expires_at || c.expiresAt || c.expiry || '').trim();
                const isDummy = exp.includes('2026-12-31') || exp.includes('31/12/2026');
                const expText = exp && !isDummy ? `⏱️ HSD: ${escape(exp)}` : `⏱️ HSD: Chưa rõ hạn dùng`;
                return `
                <div class="flex items-center justify-between p-3 rounded-xl bg-dark-850 border border-gray-800">
                  <div>
                    <code class="font-mono font-bold text-brand-400 text-sm sm:text-base">${val}</code>
                    <div class="text-xs text-gray-400 mt-0.5">${rew} • ${expText}</div>
                  </div>
                  <span class="text-xs px-2.5 py-1 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30 font-bold">Mới nhất</span>
                </div>`;
              }).join('') : `
                <div class="p-6 rounded-2xl bg-dark-850/80 border border-gray-800 text-center space-y-2">
                  <div class="text-2xl">⏳</div>
                  <h3 class="text-sm sm:text-base font-bold text-gray-200">Hiện Chưa Có Mã Giftcode Mới Cho ${escape(game.name)}</h3>
                  <p class="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
                    Hệ thống CodeGame.shop đang tự động theo dõi và kiểm tra mã quà tặng mới từ nhà phát hành ${escape(game.publisher || 'chính thức')} 24/7.
                    <br>📅 <strong>Kiểm tra lần cuối:</strong> ${formattedDate} (Chưa phát sinh mã mới).
                  </p>
                  <p class="text-xs text-brand-400 font-semibold pt-1">
                    👉 Bạn có thể xem hướng dẫn nhập code bên dưới hoặc khám phá các tựa game cùng thể loại đang có mã khả dụng!
                  </p>
                </div>`}
            </div>
          </div>

          <!-- Instructions (Chỉ render khi có hướng dẫn và không rỗng) -->
          ${instructions && instructions.length > 0 ? `
          <div class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-2">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <h2 class="text-base sm:text-lg font-bold text-white">📖 Hướng Dẫn Nhập Code ${escape(game.name)}</h2>
              ${redeemUrl ? `<a href="${escape(redeemUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all">🌐 Mở Trang Đổi Code</a>` : ''}
            </div>
            <div class="text-xs sm:text-sm text-gray-300 whitespace-pre-line leading-relaxed">${escape(instructions)}</div>
          </div>` : ''}

          <!-- Description -->
          ${game.description ? `
          <div class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-2">
            <h2 class="text-base sm:text-lg font-bold text-white">ℹ️ Giới Thiệu Trò Chơi</h2>
            <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">${escape(game.description)}</p>
          </div>` : ''}

          <!-- Game-Specific FAQ matching FAQPage Schema -->
          <section class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-4">
            <h2 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>❓ Câu Hỏi Thường Gặp Về Giftcode ${escape(game.name)}</span>
            </h2>
            <div class="space-y-3 text-xs sm:text-sm text-gray-300">
              <div class="p-4 rounded-xl bg-dark-850 border border-gray-800/80">
                <h3 class="font-bold text-gray-100 mb-1">1. Giftcode ${escape(game.name)} có hạn sử dụng không?</h3>
                <p class="text-gray-400 leading-relaxed">Các mã giftcode ${escape(game.name)} có thời hạn tùy thuộc vào từng sự kiện của ${escape(game.publisher || 'Nhà phát hành')}. Bạn nên nhập ngay khi lấy mã để tránh hết hạn hoặc hết lượt kích hoạt.</p>
              </div>
              <div class="p-4 rounded-xl bg-dark-850 border border-gray-800/80">
                <h3 class="font-bold text-gray-100 mb-1">2. Làm sao để nhận thêm mã code ${escape(game.name)} mới nhất 2026?</h3>
                <p class="text-gray-400 leading-relaxed">Hệ thống CodeGame.shop tự động theo dõi và cập nhật mã mới 24/7 từ các sự kiện bảo trì, ra mắt máy chủ và fanpage chính thức của ${escape(game.publisher || 'NPH')}. Hãy lưu trang này để nhận thông báo sớm nhất.</p>
              </div>
            </div>
          </section>

          <footer class="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <p>© 2026 CodeGame.shop. Cập nhật mã ${escape(game.name)}.</p>
            <div class="flex items-center gap-3">
              <a href="/danh-sach-game-a-z" class="text-brand-400 hover:underline">Danh Mục A-Z</a>
              <span>•</span>
              <a href="/the-loai/${clusterSlug}" class="text-gray-300 hover:text-white">${escape(game.category || 'Thể loại')}</a>
              <span>•</span>
              <a href="/" class="hover:text-white">Trang Chủ</a>
            </div>
          </footer>
        </div>
      </div>
      `;

      if (html.includes('<div id="root"></div>')) {
        html = html.replace('<div id="root"></div>', `<div id="root">${ssrBodyHtml}</div>`);
      } else {
        html = html.replace(/<div\s+id="root">[\s\S]*?<\/div>\s*<\/div>\s*(<script)/i, `<div id="root">${ssrBodyHtml}</div>\n  $1`);
      }
    } else {
      // Slug không tồn tại -> Trả HTTP 404 thực sự (tránh soft 404)
      const notFoundRes = await env.ASSETS.fetch(new Request(`${origin}/404.html`)).catch(() => null);
      if (notFoundRes && notFoundRes.status === 200) {
        const notFoundHtml = await notFoundRes.text();
        return new Response(notFoundHtml, {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
      return new Response('404 Not Found', { status: 404 });
    }
  } else if (pathname === '/news' || pathname.startsWith('/news/')) {
    const newsSlug = pathname.replace(/^\/news\//i, '').replace(/\/$/, '').trim().toLowerCase();
    let article: any = null;
    if (newsSlug && env.DB) {
      try {
        const stmt = env.DB.prepare("SELECT value FROM system_settings WHERE key = 'wcg_news_articles_v1' LIMIT 1");
        const row: any = await stmt.first();
        const delStmt = env.DB.prepare("SELECT value FROM system_settings WHERE key = 'wcg_deleted_news_articles_v1' LIMIT 1");
        const delRow: any = await delStmt.first();
        const delSet = new Set(delRow?.value ? JSON.parse(delRow.value) : []);

        if (row?.value) {
          const list = JSON.parse(row.value);
          const found = list.find((a: any) => a.slug?.toLowerCase() === newsSlug || a.id?.toLowerCase() === newsSlug);
          if (found && !delSet.has(found.id) && !delSet.has(found.slug)) {
            article = found;
          }
        }
      } catch {}
    }

    if (article) {
      const title = `${article.title} | CodeGame.shop`;
      const description = article.summary || article.content?.slice(0, 160) || 'Tin tức game và sự kiện giftcode mới nhất.';
      const thumb = (article.cover_url && article.cover_url.trim()) || article.thumbnail_url || (article.game_slug ? `/game_icons/${article.game_slug}.webp` : '/og-image.jpg');
      const artCover = thumb.startsWith('http') ? thumb : `${origin}${thumb.startsWith('/') ? thumb : `/${thumb}`}`;

      const newsSchema = [
        {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": article.title,
          "description": description,
          "image": [artCover],
          "datePublished": article.published_at || article.created_at || "2026-10-13T00:00:00.000Z",
          "dateModified": article.updated_at || article.published_at || article.created_at || "2026-10-13T00:00:00.000Z",
          "author": {
            "@type": "Person",
            "name": article.author || "Ban Biên Tập CodeGame.shop"
          },
          "publisher": {
            "@type": "Organization",
            "name": "CodeGame.shop",
            "logo": {
              "@type": "ImageObject",
              "url": `${origin}/logo.png`
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${origin}/news/${article.slug || article.id}`
          }
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": `${origin}/` },
            { "@type": "ListItem", "position": 2, "name": "Tin Tức Game", "item": `${origin}/news` },
            { "@type": "ListItem", "position": 3, "name": article.title, "item": `${origin}/news/${article.slug || article.id}` }
          ]
        }
      ];

      replaceTitleAndMeta(title, description, `/news/${article.slug || article.id}`, thumb, newsSchema);
    } else {
      const title = 'Tin Tức Game & Sự Kiện Giftcode Mới Nhất 2026 | CodeGame.shop';
      const description = 'Cập nhật tin tức game mobile, giftcode tân thủ và sự kiện nhận quà hot nhất 2026 tại CodeGame.shop.';
      const newsListSchema = [
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": `${origin}/` },
            { "@type": "ListItem", "position": 2, "name": "Tin Tức Game", "item": `${origin}/news` }
          ]
        }
      ];
      replaceTitleAndMeta(title, description, '/news', '/og-image.jpg', newsListSchema);
    }
  } else if (
    pathname === '/giveaways' ||
    pathname.startsWith('/giveaways/') ||
    pathname === '/giveaway' ||
    pathname.startsWith('/giveaway/')
  ) {
    const urlObj = new URL(request.url);
    const rawGwId =
      pathname.replace(/^\/(?:giveaways|giveaway)\/?/i, '').split('/')[0].trim() ||
      urlObj.searchParams.get('gw') ||
      urlObj.searchParams.get('giveaway') ||
      urlObj.searchParams.get('event') ||
      urlObj.searchParams.get('id') ||
      urlObj.searchParams.get('game');

    let campaign: any = null;
    if (rawGwId) {
      const cleanGwId = decodeURIComponent(rawGwId).trim().toLowerCase();
      // 1. Thử lấy từ Cloudflare D1
      if (env.DB) {
        try {
          const stmt = env.DB.prepare("SELECT value FROM system_settings WHERE key = 'wcg_admin_giveaways_v4' LIMIT 1");
          const row: any = await stmt.first();
          if (row?.value) {
            const list = JSON.parse(row.value);
            if (Array.isArray(list)) {
              campaign = list.find((g: any) => g && (g.id?.toLowerCase() === cleanGwId || g.game_slug?.toLowerCase() === cleanGwId));
            }
          }
        } catch {}
      }

      // 2. Fallback sang danh sách tĩnh fallbackGiveawaysData
      if (!campaign && Array.isArray(fallbackGiveawaysData)) {
        campaign = (fallbackGiveawaysData as any[]).find(
          (g) => g && (g.id?.toLowerCase() === cleanGwId || g.game_slug?.toLowerCase() === cleanGwId)
        );
      }
    }

    if (campaign) {
      const gameName = campaign.game_name || 'Game Mobile';
      const gameSlug = campaign.game_slug || '';
      const title = `🎁 Nhận Code: ${campaign.title} - ${gameName} | CodeGame.shop`;
      const description = campaign.description
        ? `${campaign.description} Nhận mã quà tặng độc quyền ${gameName} miễn phí tại CodeGame.shop.`
        : `Nhận ngay ${campaign.title} cho tựa game ${gameName}. Số lượng có hạn, kiểm tra điều kiện tài khoản và nhận mã tức thì!`;

      // Thuật toán xác định ảnh đại diện chính xác 100% cho Giveaway
      let rawImage = campaign.cover_image_url || campaign.game_icon_url || '';
      if (!rawImage && gameSlug) {
        const matchedGame = (fallbackGamesData as any[]).find(
          (g) => g && (g.slug?.toLowerCase() === gameSlug.toLowerCase() || g.id?.toLowerCase() === gameSlug.toLowerCase())
        );
        if (matchedGame?.icon_url) {
          rawImage = matchedGame.icon_url;
        } else {
          rawImage = `/game_icons/${gameSlug}.jpg`;
        }
      }
      if (!rawImage) rawImage = '/og-image.jpg';
      const jpgImage = rawImage.replace(/\.webp$/i, '.jpg');
      const iconUrl = jpgImage.startsWith('http') ? jpgImage : `${origin}${jpgImage.startsWith('/') ? jpgImage : `/${jpgImage}`}`;

      const giveawaySchema = [
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": `Săn Mã: ${campaign.title} - ${gameName}`,
          "description": description,
          "image": iconUrl,
          "startDate": campaign.start_time || "2026-01-01",
          "endDate": campaign.end_time || "2026-12-31",
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
          "location": { "@type": "VirtualLocation", "url": `${origin}/giveaways/${campaign.id}` },
          "organizer": { "@type": "Organization", "name": "CodeGame.shop", "url": origin },
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "VND", "availability": "https://schema.org/InStock" }
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": `${origin}/` },
            { "@type": "ListItem", "position": 2, "name": "Đợt Phát Code", "item": `${origin}/giveaways` },
            { "@type": "ListItem", "position": 3, "name": gameName, "item": `${origin}/giveaways/${campaign.id}` }
          ]
        }
      ];

      replaceTitleAndMeta(title, description, `/giveaways/${campaign.id}`, iconUrl, giveawaySchema);
    } else {
      const title = 'Sự Kiện Giveaway Nhận Giftcode Game Miễn Phí 2026 | CodeGame.shop';
      const description = 'Tham gia sự kiện giveaway nhận quà tân thủ, giftcode VIP độc quyền và thẻ game miễn phí mỗi ngày tại CodeGame.shop.';
      const giveawayListSchema = [
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": `${origin}/` },
            { "@type": "ListItem", "position": 2, "name": "Đợt Phát Code", "item": `${origin}/giveaways` }
          ]
        }
      ];
      replaceTitleAndMeta(title, description, '/giveaways', '/og-image.jpg', giveawayListSchema);
    }
  } else if (pathname === '/store' || pathname.startsWith('/store/')) {
    const title = 'Cửa Hàng Giftcode VIP & Giao Dịch Mã Game Tự Động 24/7 | CodeGame.shop';
    const description = 'Mua bán giftcode VIP, gói nạp game bản quyền chiết khấu tới 40%. Giao dịch tự động 24/7 qua SePay, nhận mã ngay trên màn hình trong 30 giây.';
    const storeSchema = [
      {
        "@context": "https://schema.org",
        "@type": "Store",
        "name": "Chợ Code VIP - CodeGame.shop",
        "description": "Cửa hàng giao dịch mã game bản quyền và giftcode VIP tự động 24/7 qua SePay.",
        "url": `${origin}/store`,
        "priceRange": "10.000 VND - 500.000 VND",
        "paymentAccepted": "Chuyển khoản Ngân hàng (SePay), Ví điện tử",
        "currenciesAccepted": "VND"
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": `${origin}/` },
          { "@type": "ListItem", "position": 2, "name": "Chợ Code VIP", "item": `${origin}/store` }
        ]
      }
    ];
    replaceTitleAndMeta(title, description, '/store', '/og-image.jpg', storeSchema);
  } else if (pathname === '/utilities' || pathname.startsWith('/utilities/')) {
    const title = 'Tiện Ích & Tool Hỗ Trợ Game Số 1 Việt Nam | CodeGame.shop';
    const description = 'Dịch vụ tiện ích game, hỗ trợ game thủ tối ưu trải nghiệm chơi game an toàn, tốc độ và bảo mật cao tại CodeGame.shop.';
    const utilSchema = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": `${origin}/` },
          { "@type": "ListItem", "position": 2, "name": "Tiện Ích Game", "item": `${origin}/utilities` }
        ]
      }
    ];
    replaceTitleAndMeta(title, description, '/utilities', '/og-image.jpg', utilSchema);
  } else if (pathname === '/' || pathname === '') {
    const urlObj = new URL(request.url);
    const pageParam = urlObj.searchParams.get('page');
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    const canonicalPath = pageNum > 1 ? `/?page=${pageNum}` : '/';
    const title = 'CodeGame.shop - Săn Giftcode Miễn Phí & Giao Dịch Mã Game Uy Tín';
    const description = 'Kho tổng hợp hơn 12.600+ giftcode game mobile và webgame bản quyền G1/G234 mới nhất 2026 của 563+ tựa game. Cập nhật liên tục 24/7 từ các NPH VNG, Garena, VTC, SohaGame, Funtap.';
    replaceTitleAndMeta(title, description, canonicalPath, '/og-image.jpg');
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * Phục vụ trực tiếp file icon game từ static asset của Cloudflare Pages hoặc Cloudflare D1
 * Route: /game_icons/<slug>.<ext>
 * Đảm bảo 100% hình ảnh hiển thị ngay sau khi upload mà không cần redeploy.
 * Hỗ trợ Edge Cache 30 ngày (zero D1 reads cho các request lặp lại).
 */
async function handleGameIconRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string
): Promise<Response> {
  const filename = pathname.replace(/^\/game_icons\//, '').trim();

  // Chống path traversal: từ chối .., /, \, %2f, %5c
  if (
    !filename ||
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('%2e') ||
    filename.includes('%2f') ||
    filename.includes('%5c')
  ) {
    return new Response('Not Found', { status: 404 });
  }

  const dotIndex = filename.lastIndexOf('.');
  const slug = (dotIndex >= 0 ? filename.slice(0, dotIndex) : filename).toLowerCase().trim();

  // 1. Kiểm tra Cloudflare Edge Cache trước (zero D1 read for repeated requests)
  const cache = typeof caches !== 'undefined' ? (caches as any).default : null;
  const cacheKey = cache ? new Request(request.url, { method: 'GET' }) : null;
  if (cache && cacheKey) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {}
  }

  // 2. Thử static assets trước (zero D1 read cho 560+ game có sẵn trong dist)
  try {
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes && assetRes.status === 200) {
      return assetRes;
    }
    // Nếu yêu cầu .jpg mà không có trong assets, thử .webp trong assets trước khi rơi vào D1
    if (filename.toLowerCase().endsWith('.jpg')) {
      const webpUrl = new URL(request.url);
      webpUrl.pathname = `/game_icons/${slug}.webp`;
      const webpRes = await env.ASSETS.fetch(new Request(webpUrl, request));
      if (webpRes && webpRes.status === 200) {
        return webpRes;
      }
    }
  } catch {}

  // 3. Nếu static asset không có (404), kiểm tra trong D1 bảng uploaded_game_icons
  if (env.DB) {
    try {
      const row: any = await env.DB.prepare(
        'SELECT content_type, image_base64, size_bytes FROM uploaded_game_icons WHERE slug = ? LIMIT 1'
      ).bind(slug).first();

      if (row && row.image_base64) {
        const cleanB64 = String(row.image_base64).replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
        const binaryStr = atob(cleanB64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const contentType = row.content_type || 'image/webp';
        const headers = new Headers({
          'Content-Type': contentType,
          'Content-Length': len.toString(),
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
          'Access-Control-Allow-Origin': '*',
          'X-Icon-Source': 'd1-uploaded',
        });

        const iconResponse = new Response(bytes, { status: 200, headers });

        if (cache && cacheKey) {
          ctx.waitUntil(cache.put(cacheKey, iconResponse.clone()));
        }

        return iconResponse;
      }
    } catch (err) {
      console.warn('[GameIconRoute] Lỗi đọc uploaded_game_icons từ D1:', err);
    }
  }

  return new Response('Icon not found', { status: 404 });
}
