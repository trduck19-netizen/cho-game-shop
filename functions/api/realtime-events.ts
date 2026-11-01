import { getUnifiedRealtimePayload } from '../services/virtualLayerService';

interface Env {
  DB?: D1Database;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, waitUntil } = context;

  try {
    const payload = await getUnifiedRealtimePayload(env, waitUntil ? (p) => waitUntil(p) : undefined);

    return new Response(JSON.stringify(payload), {
      headers: {
        ...CORS_HEADERS,
        // Edge Cache 10s matching the 10-second client slot index (Requirement 2c)
        // Requests within the same 10-second slot are served directly from Cloudflare Edge CDN
        'Cache-Control': 'public, max-age=5, s-maxage=10, stale-while-revalidate=15',
      },
    });
  } catch (err: any) {
    console.error('[API /api/realtime-events error]', err?.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to retrieve realtime events',
        message: err?.message,
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
