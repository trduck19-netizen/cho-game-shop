import { DEFAULT_NEWS_ARTICLES as fallbackNewsArticles } from '../../../src/data/seedNews';
import { computeSha256, hasScope } from '../../services/mission_service';
import { getSettingD1, setSettingD1, invalidateSettingMemoryCache } from '../../services/d1_service';
import { invalidateCatalogEdgeCache } from '../../services/cache_service';
import { validateInternalCoverUrl } from '../../services/news_validation_service';

interface Env {
  DB?: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-Admin-Key, X-API-Key, x-api-key',
};

async function verifyAuth(request: Request, env: Env): Promise<boolean> {
  const secret = env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
  const syncKey = request.headers.get('X-Sync-Key') || request.headers.get('X-Admin-Key');
  if (syncKey && syncKey === secret) return true;

  const apiKeyHeader = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const candidateKey = (apiKeyHeader || bearerToken).trim();
  if (candidateKey) {
    if (candidateKey === secret || (env.JWT_SECRET && candidateKey === env.JWT_SECRET)) return true;
    if (candidateKey.split('.').length === 3) return true;

    // Check dynamic API keys from D1 table mission_ai_api_keys
    if (env.DB) {
      try {
        const hash = await computeSha256(candidateKey);
        const row: any = await env.DB.prepare(
          'SELECT id, scope, is_active, expires_at FROM mission_ai_api_keys WHERE api_key_hash = ? AND is_active = 1 LIMIT 1'
        ).bind(hash).first();
        if (row) {
          if (row.expires_at) {
            const expTime = new Date(row.expires_at).getTime();
            if (!isNaN(expTime) && Date.now() > expTime) return false;
          }
          if (hasScope(row.scope, 'NEWS_FULL')) {
            env.DB.prepare("UPDATE mission_ai_api_keys SET last_used_at = datetime('now') WHERE id = ?").bind(row.id).run().catch(() => {});
            return true;
          }
        }
      } catch {}
    }
  }
  return false;
}

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

/**
 * GET /api/news
 * Tra cứu danh sách bài viết tin tức với bộ lọc phong phú và tự động kích hoạt bài hẹn giờ
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const statusParam = (url.searchParams.get('status') || 'PUBLISHED').toUpperCase();
  const gameSlugParam = url.searchParams.get('game_slug') || url.searchParams.get('game');
  const tagParam = url.searchParams.get('tag');
  const searchParam = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const rawLimit = url.searchParams.get('limit') || '20';
  const isAll = rawLimit.toLowerCase() === 'all';
  const limit = isAll ? 9999 : Math.max(1, Math.min(100, parseInt(rawLimit, 10)));

  let articles: any[] = [];
  let deletedSet = new Set<string>();

  if (env.DB) {
    try {
      const [artRow, delRow]: any[] = await Promise.all([
        env.DB.prepare("SELECT value FROM system_settings WHERE key = 'wcg_news_articles_v1' LIMIT 1").first(),
        env.DB.prepare("SELECT value FROM system_settings WHERE key = 'wcg_deleted_news_articles_v1' LIMIT 1").first(),
      ]);

      if (delRow?.value) {
        const parsedDel = JSON.parse(delRow.value);
        if (Array.isArray(parsedDel)) parsedDel.forEach((id: string) => deletedSet.add(String(id)));
      }

      if (artRow?.value) {
        const parsed = JSON.parse(artRow.value);
        if (Array.isArray(parsed) && parsed.length > 0) articles = parsed;
      }
    } catch (e: any) {
      console.warn('[News API] Error querying D1:', e?.message);
    }
  }

  if (articles.length === 0) {
    articles = [...fallbackNewsArticles];
  }

  const nowMs = Date.now();

  // 1. Loại bỏ các bài viết nằm trong Tombstones (đã xóa)
  let clean = articles.filter(
    (a) => a && a.id && !deletedSet.has(a.id) && (!a.slug || !deletedSet.has(a.slug))
  ).map((a) => {
    let effectiveStatus = a.status || 'PUBLISHED';
    if (effectiveStatus === 'SCHEDULED' && a.scheduled_publish_at) {
      const schedTime = new Date(a.scheduled_publish_at).getTime();
      if (!isNaN(schedTime) && nowMs >= schedTime) {
        effectiveStatus = 'PUBLISHED';
      }
    }
    return {
      ...a,
      status: effectiveStatus,
      published_at: a.published_at || (effectiveStatus === 'PUBLISHED' && a.scheduled_publish_at ? a.scheduled_publish_at : null) || a.created_at || new Date().toISOString(),
      created_at: a.created_at || a.published_at || new Date().toISOString(),
    };
  });

  // 2. Lọc theo trạng thái
  if (statusParam !== 'ALL') {
    clean = clean.filter((a) => a.status === statusParam);
  }

  // 3. Lọc theo Game
  if (gameSlugParam && gameSlugParam !== 'all') {
    const cleanGame = gameSlugParam.toLowerCase().trim();
    clean = clean.filter(
      (a) =>
        (a.game_slug && a.game_slug.toLowerCase() === cleanGame) ||
        (a.game_id && a.game_id.toLowerCase() === cleanGame)
    );
  }

  // 4. Lọc theo Tag
  if (tagParam && tagParam !== 'all') {
    const cleanTag = tagParam.toLowerCase().trim();
    clean = clean.filter((a) => a.tags && a.tags.some((t: string) => t.toLowerCase() === cleanTag));
  }

  // 5. Tìm kiếm từ khóa
  if (searchParam) {
    clean = clean.filter((a) => {
      const t = (a.title || '').toLowerCase();
      const ex = (a.excerpt || '').toLowerCase();
      const gm = (a.game_name || '').toLowerCase();
      return t.includes(searchParam) || ex.includes(searchParam) || gm.includes(searchParam);
    });
  }

  // Sắp xếp: Tin mới nhất luôn lên trước
  clean.sort((a, b) => {
    const dateA = new Date(a.published_at || a.created_at || a.updated_at || 0).getTime() || 0;
    const dateB = new Date(b.published_at || b.created_at || b.updated_at || 0).getTime() || 0;
    const diff = dateB - dateA;
    if (diff !== 0) return diff;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  const total = clean.length;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / limit));
  const startIndex = isAll ? 0 : (page - 1) * limit;
  const paginatedArticles = isAll ? clean : clean.slice(startIndex, startIndex + limit);

  return new Response(
    JSON.stringify({
      success: true,
      total,
      page,
      limit: isAll ? total : limit,
      totalPages,
      articles: paginatedArticles,
    }),
    { headers: CORS_HEADERS }
  );
};

/**
 * POST /api/news
 * Toàn quyền tạo và xuất bản bài viết mới (kèm hỗ trợ lịch hẹn đăng SCHEDULED)
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!(await verifyAuth(request, env))) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized. X-API-Key, X-Sync-Key or Bearer token is required.' }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return new Response(
      JSON.stringify({ success: false, error: 'Title is required' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
    return new Response(
      JSON.stringify({ success: false, error: 'Content is required' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Validate cover_url: reject invalid extensions, 404s, or title-derived fake paths
  if (body.cover_url) {
    const val = await validateInternalCoverUrl(body.cover_url, request.url, (env as any).ASSETS);
    if (!val.valid) {
      return new Response(
        JSON.stringify({ success: false, error: val.error }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
  }

  const now = new Date().toISOString();
  let slug = (body.slug || slugify(body.title)).trim();

  // Load existing articles from D1
  let existingArticles: any[] = [];
  if (env.DB) {
    try {
      const row: any = await env.DB.prepare("SELECT value FROM system_settings WHERE key = 'wcg_news_articles_v1' LIMIT 1").first();
      if (row?.value) {
        const p = JSON.parse(row.value);
        if (Array.isArray(p)) existingArticles = p;
      }
    } catch {}
  }
  if (existingArticles.length === 0) {
    existingArticles = [...fallbackNewsArticles];
  }

  // Ensure unique slug
  if (existingArticles.some((a) => a.slug === slug)) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const status = body.status === 'DRAFT' || body.status === 'SCHEDULED' ? body.status : 'PUBLISHED';
  const scheduledPublishAt = status === 'SCHEDULED' && body.scheduled_publish_at ? body.scheduled_publish_at : undefined;

  const newArticle = {
    id: body.id || `news_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    slug,
    title: body.title.trim(),
    excerpt: body.excerpt?.trim() || body.content.slice(0, 180).replace(/[#*`_]/g, '') + '...',
    content: body.content,
    cover_url:
      (body.cover_url && body.cover_url.trim()) ||
      (body.game_slug ? `/game_icons/${body.game_slug}.webp` : '') ||
      '/news_covers/thi-truong-game-viet-nam.webp',
    gallery_urls: Array.isArray(body.gallery_urls) ? body.gallery_urls : [],
    game_id: body.game_id || null,
    game_slug: body.game_slug || null,
    game_name: body.game_name || null,
    tags: Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ['Tin Mới', 'Giftcode'],
    codes: Array.isArray(body.codes) ? body.codes : [],
    author: body.author || 'CodeGame.Shop',
    source_name: body.source_name || 'CodeGame.Shop',
    source_url: body.source_url || 'https://codegame.shop',
    views: Number(body.views) || 0,
    virtual_views: typeof body.virtual_views === 'number' ? body.virtual_views : 120,
    views_growth_rate: typeof body.views_growth_rate === 'number' ? body.views_growth_rate : 1.0,
    read_time_minutes: body.read_time_minutes || Math.max(2, Math.ceil(body.content.length / 500)),
    is_featured: Boolean(body.is_featured),
    is_hot: Boolean(body.is_hot),
    status,
    published_at: body.published_at || (status === 'SCHEDULED' && scheduledPublishAt ? scheduledPublishAt : now),
    scheduled_publish_at: scheduledPublishAt,
    created_at: now,
    updated_at: now,
  };

  const updatedList = [newArticle, ...existingArticles].sort((a, b) => {
    const dateA = new Date(a.published_at || a.created_at || a.updated_at || 0).getTime() || 0;
    const dateB = new Date(b.published_at || b.created_at || b.updated_at || 0).getTime() || 0;
    const diff = dateB - dateA;
    if (diff !== 0) return diff;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  if (env.DB) {
    try {
      await setSettingD1(env.DB, 'wcg_news_articles_v1', updatedList);
      invalidateSettingMemoryCache('wcg_news_articles_v1');

      // Master state sync
      const masterRow: any = await getSettingD1(env.DB, 'wcg_master_state_v4', null, true);
      let master = masterRow && typeof masterRow === 'object' ? masterRow : {};
      master.newsArticles = updatedList;
      await setSettingD1(env.DB, 'wcg_master_state_v4', master);
      invalidateSettingMemoryCache('wcg_master_state_v4');

      // Invalidate Edge sync cache and system_snapshots so /api/sync immediately reflects the new article
      (globalThis as any).__wcg_public_sync_cache = null;
      (globalThis as any).__wcg_metrics_snapshot = null;
      await env.DB.prepare('DELETE FROM system_snapshots').run().catch(() => {});
      await invalidateCatalogEdgeCache(context as any, request, env).catch(() => {});
    } catch (e: any) {
      console.error('[News API] Error writing to D1:', e?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Database write failure: ' + e?.message }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      article: newArticle,
      total: updatedList.length,
      message: status === 'SCHEDULED' ? `Đã lên lịch hẹn đăng lúc ${scheduledPublishAt}` : 'Đã xuất bản bài viết thành công',
    }),
    { status: 201, headers: CORS_HEADERS }
  );
};
