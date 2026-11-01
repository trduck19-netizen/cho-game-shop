import { recordDownloadClick, getDownloadStats } from '../services/d1_service';

interface Env {
  DB?: D1Database;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    let body: any = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json().catch(() => ({}));
    } else {
      const text = await request.text().catch(() => '');
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const gameSlug = String(body.game_slug || body.gameSlug || '').trim();
    const store = String(body.store || '').trim().toLowerCase();
    const platformRaw = String(body.platform_detected || body.platform || '').trim().toLowerCase();
    const viaRaw = String(body.via || '').trim().toLowerCase();

    if (!gameSlug) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu tham số game_slug' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const validStores = ['google_play', 'app_store'];
    const validStore = validStores.includes(store) ? store : 'google_play';

    const validPlatforms = ['android', 'ios', 'desktop', 'other'];
    const platformDetected = validPlatforms.includes(platformRaw) ? platformRaw : 'other';

    const validVia = ['button', 'qr_scan'];
    const via = validVia.includes(viaRaw) ? viaRaw : 'button';

    if (env.DB) {
      await recordDownloadClick(env.DB, {
        gameSlug,
        store: validStore as 'google_play' | 'app_store',
        platformDetected: platformDetected as 'android' | 'ios' | 'desktop' | 'other',
        via: via as 'button' | 'qr_scan',
      });
    }

    return new Response(JSON.stringify({ success: true, recorded: true }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Lỗi xử lý tracking tải game' }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const gameSlug = url.searchParams.get('game_slug') || url.searchParams.get('slug') || undefined;

  if (!env.DB) {
    return new Response(
      JSON.stringify({
        success: false,
        total: 0,
        googlePlay: 0,
        appStore: 0,
        byGame: {},
      }),
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  }

  const stats = await getDownloadStats(env.DB, gameSlug);
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: CORS_HEADERS,
  });
};
