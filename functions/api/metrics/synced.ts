import { getOrRefreshSnapshot } from '../../services/snapshotService';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context;

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    const snapshot = await getOrRefreshSnapshot(env, waitUntil ? (p) => waitUntil(p) : undefined, force);

    return new Response(JSON.stringify({
      success: true,
      snapshot,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': force ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3, s-maxage=5, stale-while-revalidate=10',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (err: any) {
    console.error('[API /api/metrics/synced] Error generating snapshot:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve metrics snapshot',
      message: err?.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
