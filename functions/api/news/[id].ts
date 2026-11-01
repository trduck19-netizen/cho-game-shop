import { DEFAULT_NEWS_ARTICLES as fallbackNewsArticles } from '../../../src/data/seedNews';
import { computeSha256, hasScope } from '../../services/mission_service';
import { getSettingD1, setSettingD1, invalidateSettingMemoryCache } from '../../services/d1_service';
import { invalidateCatalogEdgeCache } from '../../services/cache_service';
import { recordSoftDelete } from '../../services/soft_delete_service';
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

async function loadArticlesAndTombstones(env: Env): Promise<{ articles: any[]; deletedSet: Set<string> }> {
  let articles: any[] = [];
  const deletedSet = new Set<string>();

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
    } catch {}
  }

  if (articles.length === 0) {
    articles = [...fallbackNewsArticles];
  }

  return { articles, deletedSet };
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

/**
 * GET /api/news/:id
 * Lấy chi tiết một bài viết theo ID hoặc Slug
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const targetId = String(params.id || '').trim().toLowerCase();

  const { articles, deletedSet } = await loadArticlesAndTombstones(env);

  const found = articles.find(
    (a) => (a.id?.toLowerCase() === targetId || a.slug?.toLowerCase() === targetId) &&
      !deletedSet.has(a.id) &&
      (!a.slug || !deletedSet.has(a.slug))
  );

  if (!found) {
    return new Response(
      JSON.stringify({ success: false, error: 'Article not found or deleted' }),
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Auto-activate scheduled article if passed
  const nowMs = Date.now();
  let effectiveStatus = found.status || 'PUBLISHED';
  if (effectiveStatus === 'SCHEDULED' && found.scheduled_publish_at) {
    const schedTime = new Date(found.scheduled_publish_at).getTime();
    if (!isNaN(schedTime) && nowMs >= schedTime) {
      effectiveStatus = 'PUBLISHED';
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      article: {
        ...found,
        status: effectiveStatus,
      },
    }),
    { headers: CORS_HEADERS }
  );
};

/**
 * PUT / PATCH /api/news/:id
 * Toàn quyền cập nhật, chỉnh sửa nội dung, trạng thái hoặc đổi lịch hẹn đăng
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;

  if (!(await verifyAuth(request, env))) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized. X-API-Key, X-Sync-Key or Bearer token is required.' }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const rawTarget = String(params.id || '').trim();
  let targetId = rawTarget.toLowerCase();
  try {
    targetId = decodeURIComponent(targetId);
  } catch {}

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { articles } = await loadArticlesAndTombstones(env);

  let targetIndex = articles.findIndex(
    (a) => a.id?.toLowerCase() === targetId || a.slug?.toLowerCase() === targetId
  );

  if (targetIndex < 0 && body.id) {
    const bId = String(body.id).toLowerCase().trim();
    targetIndex = articles.findIndex((a) => a.id?.toLowerCase() === bId);
  }
  if (targetIndex < 0 && body.slug) {
    const bSlug = String(body.slug).toLowerCase().trim();
    targetIndex = articles.findIndex((a) => a.slug?.toLowerCase() === bSlug);
  }

  // If still not found in dynamic storage, check fallback seeds
  if (targetIndex < 0) {
    const fallbackIndex = fallbackNewsArticles.findIndex(
      (a) => a.id?.toLowerCase() === targetId || a.slug?.toLowerCase() === targetId
    );
    if (fallbackIndex >= 0) {
      articles.push({ ...fallbackNewsArticles[fallbackIndex] });
      targetIndex = articles.length - 1;
    }
  }

  if (targetIndex < 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'Article not found' }),
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const existing = articles[targetIndex];
  const now = new Date().toISOString();

  // Validate candidate cover_url if provided in payload
  const candidateCover = body.cover_url || body.coverUrl || body.cover;
  if (typeof candidateCover === 'string' && candidateCover.trim()) {
    const val = await validateInternalCoverUrl(candidateCover, request.url, (env as any).ASSETS);
    if (!val.valid) {
      return new Response(
        JSON.stringify({ success: false, error: val.error }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
  }

  const newSlug = body.slug ? slugify(body.slug) : existing.slug;
  const newStatus = body.status !== undefined ? body.status : existing.status;
  const scheduledPublishAt = newStatus === 'SCHEDULED'
    ? (body.scheduled_publish_at !== undefined ? body.scheduled_publish_at : existing.scheduled_publish_at)
    : undefined;

  let newCoverUrl = existing.cover_url;
  if (typeof body.cover_url === 'string' && body.cover_url.trim()) {
    newCoverUrl = body.cover_url.trim();
  } else if (typeof body.coverUrl === 'string' && body.coverUrl.trim()) {
    newCoverUrl = body.coverUrl.trim();
  } else if (typeof body.cover === 'string' && body.cover.trim()) {
    newCoverUrl = body.cover.trim();
  }

  const updatedArticle = {
    ...existing,
    ...body,
    id: existing.id,
    slug: newSlug,
    title: body.title !== undefined ? String(body.title).trim() : existing.title,
    content: body.content !== undefined ? body.content : existing.content,
    excerpt: body.excerpt !== undefined ? body.excerpt : existing.excerpt,
    cover_url: newCoverUrl,
    status: newStatus,
    scheduled_publish_at: scheduledPublishAt,
    published_at: body.published_at || existing.published_at || now,
    updated_at: now,
  };

  articles[targetIndex] = updatedArticle;

  if (env.DB) {
    try {
      await setSettingD1(env.DB, 'wcg_news_articles_v1', articles);
      invalidateSettingMemoryCache('wcg_news_articles_v1');

      const masterRow: any = await getSettingD1(env.DB, 'wcg_master_state_v4', null, true);
      let master = masterRow && typeof masterRow === 'object' ? masterRow : {};
      master.newsArticles = articles;
      await setSettingD1(env.DB, 'wcg_master_state_v4', master);
      invalidateSettingMemoryCache('wcg_master_state_v4');

      // Invalidate Edge sync cache and system_snapshots
      (globalThis as any).__wcg_public_sync_cache = null;
      (globalThis as any).__wcg_metrics_snapshot = null;
      await env.DB.prepare('DELETE FROM system_snapshots').run().catch(() => {});
      await invalidateCatalogEdgeCache(context as any, request, env).catch(() => {});
    } catch (e: any) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database update failed: ' + e?.message }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      article: updatedArticle,
      message: 'Đã cập nhật bài viết thành công',
    }),
    { headers: CORS_HEADERS }
  );
};

export const onRequestPatch: PagesFunction<Env> = onRequestPut;

/**
 * DELETE /api/news/:id
 * Toàn quyền xóa bài viết và tự động lưu Tombstone chống hồi sinh
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;

  if (!(await verifyAuth(request, env))) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized. X-API-Key, X-Sync-Key or Bearer token is required.' }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const targetId = String(params.id || '').trim().toLowerCase();

  const { articles, deletedSet } = await loadArticlesAndTombstones(env);

  const found = articles.find(
    (a) => a.id?.toLowerCase() === targetId || a.slug?.toLowerCase() === targetId
  );

  if (!found) {
    return new Response(
      JSON.stringify({ success: false, error: 'Article not found' }),
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const articleId = found.id;
  const articleSlug = found.slug;

  deletedSet.add(articleId);
  if (articleSlug) deletedSet.add(articleSlug);

  const remaining = articles.filter(
    (a) => a.id !== articleId && a.slug !== articleId && (!articleSlug || (a.id !== articleSlug && a.slug !== articleSlug))
  );

  if (env.DB) {
    try {
      await recordSoftDelete(env.DB, {
        recordType: 'news',
        recordId: articleId,
        recordSlug: articleSlug || articleId,
        title: found.title || '',
        deletedBy: 'ADMIN:NewsManage',
        reason: 'Xóa bài viết tin tức',
        originalPayload: found,
      }).catch(() => {});

      await setSettingD1(env.DB, 'wcg_news_articles_v1', remaining);
      await setSettingD1(env.DB, 'wcg_deleted_news_articles_v1', Array.from(deletedSet));
      invalidateSettingMemoryCache('wcg_news_articles_v1');
      invalidateSettingMemoryCache('wcg_deleted_news_articles_v1');

      const masterRow: any = await getSettingD1(env.DB, 'wcg_master_state_v4', null, true);
      let master = masterRow && typeof masterRow === 'object' ? masterRow : {};
      master.newsArticles = remaining;
      master.deletedNewsArticles = Array.from(deletedSet);
      await setSettingD1(env.DB, 'wcg_master_state_v4', master);
      invalidateSettingMemoryCache('wcg_master_state_v4');

      // Invalidate Edge sync cache and system_snapshots
      (globalThis as any).__wcg_public_sync_cache = null;
      (globalThis as any).__wcg_metrics_snapshot = null;
      await env.DB.prepare('DELETE FROM system_snapshots').run().catch(() => {});
      await invalidateCatalogEdgeCache(context as any, request, env).catch(() => {});
    } catch (e: any) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database delete failed: ' + e?.message }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      deletedId: articleId,
      deletedSlug: articleSlug,
      remainingCount: remaining.length,
      message: `Đã xóa vĩnh viễn bài viết "${found.title}" và lưu Tombstone ngăn chặn hồi sinh`,
    }),
    { headers: CORS_HEADERS }
  );
};
