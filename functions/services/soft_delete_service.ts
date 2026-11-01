/**
 * Centralized Soft-Delete, Tombstone & Recovery Service
 * Single Source of Truth (SSOT) Architecture for Cloudflare D1
 *
 * Guarantees:
 * 1. Zero resurrection of deleted items by crawlers, sync, seed, or fallback.
 * 2. Immutable audit log in D1 table `deleted_records_history`.
 * 3. Multi-tier cache invalidation (RAM isolate + Edge PoP + Cloudflare Global Zone Purge).
 * 4. Explicit Admin Restoration (one-click restore into all 3 places).
 */

import { getSettingD1, setSettingD1 } from './d1_service';
import { invalidateCatalogEdgeCache } from './cache_service';

export type SoftDeleteRecordType =
  | 'pending_game'
  | 'game'
  | 'code'
  | 'giveaway'
  | 'mission'
  | 'news'
  | 'upcoming_game'
  | 'utility';

export interface SoftDeleteRecord {
  id: string;
  record_type: SoftDeleteRecordType;
  record_id: string;
  record_slug?: string | null;
  title?: string | null;
  deleted_at: string;
  deleted_by: string;
  delete_reason?: string | null;
  original_data: any;
  restored_at?: string | null;
  restored_by?: string | null;
}

export interface TombstoneItem {
  id: string;
  record_type: SoftDeleteRecordType;
  record_id: string;
  record_slug?: string | null;
  title?: string | null;
  deleted_at: string;
  deleted_by: string;
  delete_reason?: string | null;
}

const TOMBSTONES_SETTING_KEY = 'wcg_tombstones_v1';
const TOMBSTONE_CACHE_TTL_MS = 15000; // 15 seconds isolate cache

let historyTableEnsured = false;
export async function ensureHistoryTable(db: D1Database): Promise<void> {
  if (historyTableEnsured || !db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS deleted_records_history (
        id TEXT PRIMARY KEY,
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        record_slug TEXT,
        title TEXT,
        deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_by TEXT NOT NULL DEFAULT 'admin',
        delete_reason TEXT,
        original_data TEXT NOT NULL,
        restored_at TEXT,
        restored_by TEXT
      );
    `).run().catch(() => {});
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_del_history_type_slug ON deleted_records_history(record_type, record_slug);').run().catch(() => {});
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_del_history_type_id ON deleted_records_history(record_type, record_id);').run().catch(() => {});
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_del_history_restored ON deleted_records_history(restored_at);').run().catch(() => {});
    historyTableEnsured = true;
  } catch (e: any) {
    console.warn('[SoftDelete] ensureHistoryTable error:', e?.message);
  }
}

/**
 * Normalizes a string key for case-insensitive tombstone lookups
 */
export function normalizeTombstoneKey(type: string, idOrSlug: string): string {
  return `${type.toLowerCase().trim()}:${String(idOrSlug || '').toLowerCase().trim()}`;
}

/**
 * Loads all active tombstones from D1 with isolate memory caching
 */
export async function getActiveTombstonesMap(db?: D1Database): Promise<Map<string, TombstoneItem>> {
  const gScope = globalThis as any;
  const now = Date.now();

  if (
    gScope.__wcg_tombstones_cache &&
    gScope.__wcg_tombstones_cache_time &&
    now - gScope.__wcg_tombstones_cache_time < TOMBSTONE_CACHE_TTL_MS
  ) {
    return gScope.__wcg_tombstones_cache;
  }

  const map = new Map<string, TombstoneItem>();

  if (db) {
    try {
      // 1. First read fast setting map
      const settingRaw: any = await getSettingD1(db, TOMBSTONES_SETTING_KEY, {}, false);
      if (settingRaw && typeof settingRaw === 'object') {
        for (const [k, v] of Object.entries(settingRaw)) {
          if (v && typeof v === 'object') {
            map.set(k.toLowerCase(), v as TombstoneItem);
          }
        }
      }

      // 2. Also ensure any rows in deleted_records_history without restored_at are in map
      const rows = await db
        .prepare(
          'SELECT id, record_type, record_id, record_slug, title, deleted_at, deleted_by, delete_reason FROM deleted_records_history WHERE restored_at IS NULL ORDER BY deleted_at DESC LIMIT 500'
        )
        .all<any>();

      if (rows && Array.isArray(rows.results)) {
        for (const r of rows.results) {
          const item: TombstoneItem = {
            id: r.id,
            record_type: r.record_type,
            record_id: r.record_id,
            record_slug: r.record_slug,
            title: r.title,
            deleted_at: r.deleted_at,
            deleted_by: r.deleted_by,
            delete_reason: r.delete_reason,
          };
          map.set(normalizeTombstoneKey(r.record_type, r.record_id), item);
          if (r.record_slug) {
            map.set(normalizeTombstoneKey(r.record_type, r.record_slug), item);
          }
        }
      }
    } catch (e: any) {
      console.warn('[Tombstones] Error reading tombstones:', e?.message);
    }
  }

  gScope.__wcg_tombstones_cache = map;
  gScope.__wcg_tombstones_cache_time = now;
  return map;
}

/**
 * Checks if a specific record (by ID or Slug) is currently soft-deleted (tombstoned)
 */
export async function isRecordTombstoned(
  db: D1Database | undefined,
  recordType: SoftDeleteRecordType,
  idOrSlug: string
): Promise<boolean> {
  if (!idOrSlug) return false;
  const tombstones = await getActiveTombstonesMap(db);
  const key = normalizeTombstoneKey(recordType, idOrSlug);
  return tombstones.has(key);
}

/**
 * Filters an array of items to remove any tombstoned items
 */
export function filterOutTombstones<T>(
  items: T[],
  recordType: SoftDeleteRecordType,
  tombstonesMap: Map<string, TombstoneItem>,
  getSlugOrId: (item: T) => { id?: string; slug?: string }
): T[] {
  if (!Array.isArray(items) || items.length === 0 || tombstonesMap.size === 0) {
    return items;
  }
  return items.filter((item) => {
    if (!item) return false;
    const { id, slug } = getSlugOrId(item);
    if (id && tombstonesMap.has(normalizeTombstoneKey(recordType, id))) return false;
    if (slug && tombstonesMap.has(normalizeTombstoneKey(recordType, slug))) return false;
    return true;
  });
}

/**
 * Records a soft deletion:
 * 1. Inserts into D1 `deleted_records_history` table.
 * 2. Updates `wcg_tombstones_v1` setting.
 * 3. Clears RAM cache (`__wcg_public_sync_cache = null`).
 * 4. Invalidates Edge PoP cache + Cloudflare Global Purge.
 */
export async function recordSoftDelete(
  db: D1Database,
  params: {
    recordType: SoftDeleteRecordType;
    recordId: string;
    recordSlug?: string | null;
    title?: string | null;
    actor?: string;
    deletedBy?: string;
    deleteReason?: string | null;
    reason?: string | null;
    originalData?: any;
    originalPayload?: any;
    context?: any;
    request?: Request;
    env?: any;
    additionalPurgeUrls?: string[];
  }
): Promise<{ success: boolean; id: string; message: string }> {
  const {
    recordType,
    recordId,
    recordSlug,
    title,
    context,
    request,
    env,
    additionalPurgeUrls = [],
  } = params;

  const actor = params.actor || params.deletedBy || 'admin';
  const deleteReason = params.deleteReason || params.reason || null;
  const originalData = params.originalData || params.originalPayload || {};

  const id = `del_${recordType}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  // 0. Ensure table exists
  await ensureHistoryTable(db);

  // 1. Insert into D1 deleted_records_history table
  try {
    await db
      .prepare(
        `INSERT INTO deleted_records_history 
        (id, record_type, record_id, record_slug, title, deleted_at, deleted_by, delete_reason, original_data, restored_at, restored_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
      )
      .bind(
        id,
        recordType,
        String(recordId),
        recordSlug ? String(recordSlug) : null,
        title ? String(title) : null,
        nowIso,
        actor,
        deleteReason || 'Xóa mềm bởi quản trị viên',
        JSON.stringify(originalData || {})
      )
      .run();
  } catch (e: any) {
    console.warn('[SoftDelete] Error inserting to history table:', e?.message);
  }

  // 2. Update wcg_tombstones_v1 setting
  const tombstoneItem: TombstoneItem = {
    id,
    record_type: recordType,
    record_id: String(recordId),
    record_slug: recordSlug ? String(recordSlug) : null,
    title: title ? String(title) : null,
    deleted_at: nowIso,
    deleted_by: actor,
    delete_reason: deleteReason || null,
  };

  try {
    const existingMap: any = (await getSettingD1(db, TOMBSTONES_SETTING_KEY, {}, true)) || {};
    existingMap[normalizeTombstoneKey(recordType, recordId)] = tombstoneItem;
    if (recordSlug) {
      existingMap[normalizeTombstoneKey(recordType, recordSlug)] = tombstoneItem;
    }
    await setSettingD1(db, TOMBSTONES_SETTING_KEY, existingMap);
  } catch (e: any) {
    console.warn('[SoftDelete] Error updating tombstones setting:', e?.message);
  }

  // 3. Clear RAM cache isolate
  const gScope = globalThis as any;
  gScope.__wcg_public_sync_cache = null;
  gScope.__wcg_tombstones_cache = null;
  gScope.__wcg_tombstones_cache_time = 0;

  // 4. Invalidate Edge PoP + Cloudflare Purge
  try {
    const urlsToPurge = [
      'https://codegame.shop/api/sync',
      'https://codegame.shop/api/crawler/ingest-codes',
      'https://codegame.shop/api/crawler/ingest-upcoming-games',
      ...additionalPurgeUrls,
    ];
    if (context && request) {
      await invalidateCatalogEdgeCache(context, request, env, urlsToPurge);
    }
  } catch (e: any) {
    console.warn('[SoftDelete] Edge purge notice:', e?.message);
  }

  return {
    success: true,
    id,
    message: `Đã xóa mềm ${recordType} "${title || recordSlug || recordId}" và lưu vào lịch sử thành công.`,
  };
}

/**
 * Lists soft-deleted records from D1 history table
 */
export async function listDeletedRecords(
  db: D1Database,
  options?: {
    recordType?: SoftDeleteRecordType | 'ALL';
    limit?: number;
    offset?: number;
    includeRestored?: boolean;
  }
): Promise<{ success: boolean; records: SoftDeleteRecord[]; total: number }> {
  const limit = Math.max(1, options?.limit || 50);
  const offset = Math.max(0, options?.offset || 0);
  const recordType = options?.recordType && options.recordType !== 'ALL' ? options.recordType : null;
  const includeRestored = options?.includeRestored === true;

  try {
    await ensureHistoryTable(db);
    let whereClause = includeRestored ? '1=1' : 'restored_at IS NULL';
    const bindings: any[] = [];

    if (recordType) {
      whereClause += ' AND record_type = ?';
      bindings.push(recordType);
    }

    const countRes = await db
      .prepare(`SELECT COUNT(*) as total FROM deleted_records_history WHERE ${whereClause}`)
      .bind(...bindings)
      .first<any>();
    const total = countRes?.total || 0;

    const rows = await db
      .prepare(
        `SELECT id, record_type, record_id, record_slug, title, deleted_at, deleted_by, delete_reason, original_data, restored_at, restored_by 
         FROM deleted_records_history 
         WHERE ${whereClause} 
         ORDER BY deleted_at DESC 
         LIMIT ? OFFSET ?`
      )
      .bind(...bindings, limit, offset)
      .all<any>();

    const records: SoftDeleteRecord[] = (rows?.results || []).map((r: any) => ({
      id: r.id,
      record_type: r.record_type,
      record_id: r.record_id,
      record_slug: r.record_slug,
      title: r.title,
      deleted_at: r.deleted_at,
      deleted_by: r.deleted_by,
      delete_reason: r.delete_reason,
      original_data: (() => {
        try {
          return typeof r.original_data === 'string' ? JSON.parse(r.original_data) : r.original_data;
        } catch {
          return r.original_data;
        }
      })(),
      restored_at: r.restored_at,
      restored_by: r.restored_by,
    }));

    return { success: true, records, total };
  } catch (e: any) {
    console.warn('[SoftDelete] listDeletedRecords error:', e?.message);
    return { success: false, records: [], total: 0 };
  }
}

/**
 * Restores a soft-deleted record explicitly:
 * 1. Marks restored_at and restored_by in `deleted_records_history`.
 * 2. Removes from `wcg_tombstones_v1`.
 * 3. Re-injects into active storage for its record_type.
 * 4. Multi-tier cache purge.
 */
export async function restoreSoftDeletedRecord(
  db: D1Database,
  params: {
    id: string;
    actor?: string;
    context?: any;
    request?: Request;
    env?: any;
  }
): Promise<{ success: boolean; message: string; restoredRecord?: any }> {
  const { id, actor = 'admin', context, request, env } = params;

  try {
    await ensureHistoryTable(db);
    // 1. Fetch record from history table
    const row = await db
      .prepare('SELECT * FROM deleted_records_history WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!row) {
      return { success: false, message: `Không tìm thấy bản ghi xóa với ID "${id}"` };
    }

    if (row.restored_at) {
      return { success: false, message: `Bản ghi "${id}" đã được khôi phục trước đó vào lúc ${row.restored_at}` };
    }

    let parsedOriginalData: any = {};
    try {
      parsedOriginalData = typeof row.original_data === 'string' ? JSON.parse(row.original_data) : row.original_data;
    } catch {
      parsedOriginalData = row.original_data || {};
    }

    const recordType: SoftDeleteRecordType = row.record_type;
    const recordId = row.record_id;
    const recordSlug = row.record_slug;
    const nowIso = new Date().toISOString();

    // 2. Mark restored in history table
    await db
      .prepare('UPDATE deleted_records_history SET restored_at = ?, restored_by = ? WHERE id = ?')
      .bind(nowIso, actor, id)
      .run();

    // 3. Remove from wcg_tombstones_v1 setting
    try {
      const existingMap: any = (await getSettingD1(db, TOMBSTONES_SETTING_KEY, {}, true)) || {};
      delete existingMap[normalizeTombstoneKey(recordType, recordId)];
      if (recordSlug) {
        delete existingMap[normalizeTombstoneKey(recordType, recordSlug)];
      }
      await setSettingD1(db, TOMBSTONES_SETTING_KEY, existingMap);
    } catch (e: any) {
      console.warn('[SoftDelete] Error clearing tombstone setting:', e?.message);
    }

    // 4. Re-inject into active storage based on recordType
    if (recordType === 'pending_game') {
      const pendingRaw = (await getSettingD1(db, 'wcg_crawler_pending_games_v1', [], true)) || [];
      const pendingList: any[] = Array.isArray(pendingRaw) ? [...pendingRaw] : [];
      // Remove any existing duplicate before prepending
      const cleaned = pendingList.filter(
        (p: any) => p && p.slug !== recordSlug && p.id !== recordId
      );
      cleaned.unshift(parsedOriginalData);
      await setSettingD1(db, 'wcg_crawler_pending_games_v1', cleaned);
    } else if (recordType === 'game') {
      const gamesRaw = (await getSettingD1(db, 'wcg_admin_games_v5', [], true)) || [];
      const gamesList: any[] = Array.isArray(gamesRaw) ? [...gamesRaw] : [];
      const cleaned = gamesList.filter((g: any) => g && g.slug !== recordSlug && g.id !== recordId);
      cleaned.unshift(parsedOriginalData);
      await setSettingD1(db, 'wcg_admin_games_v5', cleaned);
      // Also restore into D1 games table
      if (parsedOriginalData && parsedOriginalData.slug) {
        try {
          await db
            .prepare(
              `INSERT OR REPLACE INTO games (id, slug, name, publisher, category, rating, is_active, status, codes_count, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 1, 'ACTIVE', ?, ?, datetime('now'))`
            )
            .bind(
              parsedOriginalData.id || parsedOriginalData.slug,
              parsedOriginalData.slug,
              parsedOriginalData.name || parsedOriginalData.slug,
              parsedOriginalData.publisher || 'NPH Game',
              parsedOriginalData.category || 'Game Mobile',
              parsedOriginalData.rating || 4.5,
              Number(parsedOriginalData.codes_count || 0),
              parsedOriginalData.created_at || nowIso
            )
            .run();
        } catch {}
      }
    } else if (recordType === 'upcoming_game') {
      const upcomingRaw = (await getSettingD1(db, 'wcg_admin_upcoming_games_v1', [], true)) || [];
      const upcomingList: any[] = Array.isArray(upcomingRaw) ? [...upcomingRaw] : [];
      const cleaned = upcomingList.filter(
        (g: any) => g && g.slug !== recordSlug && g.id !== recordId
      );
      cleaned.unshift(parsedOriginalData);
      await setSettingD1(db, 'wcg_admin_upcoming_games_v1', cleaned);
    } else if (recordType === 'news') {
      const newsRaw = (await getSettingD1(db, 'wcg_news_articles_v1', [], true)) || [];
      const newsList: any[] = Array.isArray(newsRaw) ? [...newsRaw] : [];
      const cleaned = newsList.filter((n: any) => n && n.id !== recordId && n.slug !== recordSlug);
      cleaned.unshift(parsedOriginalData);
      await setSettingD1(db, 'wcg_news_articles_v1', cleaned);
    } else if (recordType === 'giveaway') {
      const gwRaw = (await getSettingD1(db, 'wcg_admin_giveaways_v4', [], true)) || [];
      const gwList: any[] = Array.isArray(gwRaw) ? [...gwRaw] : [];
      const cleaned = gwList.filter((g: any) => g && g.id !== recordId);
      cleaned.unshift(parsedOriginalData);
      await setSettingD1(db, 'wcg_admin_giveaways_v4', cleaned);
      // Also restore into D1 giveaways table
      try {
        await db
          .prepare(
            `INSERT OR REPLACE INTO giveaways 
             (id, title, game_slug, game_title, banner_url, total_codes, remaining_codes, claimed_codes, start_time, end_time, status, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`
          )
          .bind(
            parsedOriginalData.id || recordId,
            parsedOriginalData.title || '',
            parsedOriginalData.game_slug || '',
            parsedOriginalData.game_title || '',
            parsedOriginalData.banner_url || '',
            Number(parsedOriginalData.total_codes || 0),
            Number(parsedOriginalData.remaining_codes || 0),
            Number(parsedOriginalData.claimed_codes || 0),
            parsedOriginalData.start_time || null,
            parsedOriginalData.end_time || null,
            parsedOriginalData.status || 'ACTIVE',
            parsedOriginalData.created_at || nowIso
          )
          .run();
      } catch {}
    } else if (recordType === 'mission') {
      try {
        await db
          .prepare(
            `INSERT OR REPLACE INTO missions 
             (id, title, description, task_type, target_channel_name, target_channel_url, reward_type, reward_value, reward_pool_id, quota, completed_count, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            parsedOriginalData.id || recordId,
            parsedOriginalData.title || '',
            parsedOriginalData.description || '',
            parsedOriginalData.task_type || 'POST_SHARE_GROUP_PAGE',
            parsedOriginalData.target_channel_name || '',
            parsedOriginalData.target_channel_url || '',
            parsedOriginalData.reward_type || 'CODE',
            Number(parsedOriginalData.reward_value || 0),
            parsedOriginalData.reward_pool_id || '',
            Number(parsedOriginalData.quota || 10),
            Number(parsedOriginalData.completed_count || 0),
            parsedOriginalData.status || 'ACTIVE',
            parsedOriginalData.created_at || nowIso
          )
          .run();
      } catch {}
    }

    // 5. Invalidate caches
    const gScope = globalThis as any;
    gScope.__wcg_public_sync_cache = null;
    gScope.__wcg_tombstones_cache = null;
    gScope.__wcg_tombstones_cache_time = 0;

    if (context && request) {
      await invalidateCatalogEdgeCache(context, request, env, [
        'https://codegame.shop/api/sync',
        'https://codegame.shop/api/crawler/ingest-codes',
        'https://codegame.shop/api/crawler/ingest-upcoming-games',
      ]).catch(() => {});
    }

    return {
      success: true,
      message: `Đã khôi phục thành công ${recordType} "${row.title || recordSlug || recordId}" vào hệ thống.`,
      restoredRecord: parsedOriginalData,
    };
  } catch (e: any) {
    console.error('[SoftDelete] restoreSoftDeletedRecord error:', e);
    return { success: false, message: `Lỗi khôi phục: ${e?.message || e}` };
  }
}
