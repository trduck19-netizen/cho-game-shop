/**
 * Real Events Hub Service
 * Provides multi-layer persistence & synchronization for real user marketing events:
 * 1. Cloudflare Edge Isolate In-Memory store
 * 2. Cloudflare Cache API (caches.default) for fast intra-datacenter retrieval
 * 3. Cloudflare KV for durable cross-region storage (gracefully catches quota limits)
 */

import { getSettingD1, setSettingD1 } from './d1_service';

export const GLOBAL_MASTER_COPY_BASELINE = 93910;

export interface RealEventHubData {
  date: string;
  masterCopyClicks: number;
  events: any[];
  realProductSoldCounts: Record<string, number>;
  realGiveawayClaimedCounts: Record<string, number>;
  peakProductSoldCounts?: Record<string, number>;
  peakGiveawayClaimedCounts?: Record<string, number>;
  peakCopyClicks?: number;
  lowestProductStock?: Record<string, number>;
  lowestGiveawayRemaining?: Record<string, number>;
  updatedAt: string;
}

const CACHE_KEY_URL = 'https://wcg-internal.local/realtime-events-hub-cache';

// Edge Isolate in-memory store
const globalScope = globalThis as any;
if (!globalScope.__wcg_hub) {
  globalScope.__wcg_hub = {
    date: '',
    masterCopyClicks: GLOBAL_MASTER_COPY_BASELINE,
    events: [],
    realProductSoldCounts: {},
    realGiveawayClaimedCounts: {},
    peakProductSoldCounts: {},
    peakGiveawayClaimedCounts: {},
    peakCopyClicks: GLOBAL_MASTER_COPY_BASELINE,
    lowestProductStock: {},
    lowestGiveawayRemaining: {},
    updatedAt: '',
  };
}

export function safeParseJson(val: any): any {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

export function maskServerName(name: string): string {
  if (!name) return 'Khách hàng';
  const trimmed = name.trim();
  if (trimmed.includes('*')) return trimmed;
  if (trimmed.startsWith('Khách #')) {
    const code = trimmed.replace('Khách #', '').trim();
    return code.length >= 4 ? `Khách #${code.slice(0, 2)}**` : trimmed;
  }
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    if (!domain) return trimmed;
    return `${local.slice(0, Math.min(3, local.length))}***@${domain}`;
  }
  if (/^\d{9,11}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}***${trimmed.slice(-3)}`;
  }
  if (trimmed.length <= 4) return `${trimmed[0]}***`;
  return `${trimmed.slice(0, Math.min(6, trimmed.length - 2))}***`;
}

export function sanitizeServerEvent(ev: any): any {
  if (!ev) return ev;
  const rawUser = ev.userName || '';
  if (rawUser && !rawUser.includes('*')) {
    const masked = maskServerName(rawUser);
    if (ev.message && ev.message.includes(rawUser)) {
      ev.message = ev.message.replace(rawUser, masked);
    }
    ev.userName = masked;
  }
  if (ev.message) {
    const match = ev.message.match(/^(.+?)\s+(vừa\s+(?:mua|sao chép|nhận|nạp)\b.*)$/i);
    if (match) {
      const rawPrefix = match[1].trim();
      if (!rawPrefix.includes('*')) {
        const maskedPrefix = maskServerName(rawPrefix);
        ev.message = `${maskedPrefix} ${match[2]}`;
        if (!ev.userName || ev.userName === rawPrefix) {
          ev.userName = maskedPrefix;
        }
      }
    }
  }
  return ev;
}

export function mergeCountsMonotonic(target: Record<string, number>, source?: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = { ...(target || {}) };
  if (!source || typeof source !== 'object') return result;
  for (const [k, v] of Object.entries(source)) {
    const num = Number(v);
    if (!isNaN(num) && num > 0) {
      result[k] = Math.max(result[k] || 0, num);
    }
  }
  return result;
}

export function mergeStockMonotonic(target: Record<string, number>, source?: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = { ...(target || {}) };
  if (!source || typeof source !== 'object') return result;
  for (const [k, v] of Object.entries(source)) {
    const num = Number(v);
    if (!isNaN(num) && num >= 0) {
      const cur = result[k];
      const isRestockJump = cur !== undefined && num > cur;
      if (cur === undefined || num < cur || isRestockJump) {
        result[k] = num;
      }
    }
  }
  return result;
}

export async function getRealEventsHub(env: any, force: boolean = false): Promise<RealEventHubData> {
  const now = Date.now();
  const HUB_CACHE_TTL_MS = 10000; // 10s isolate TTL to protect D1 from duplicate reads
  if (!force && globalScope.__wcg_hub && globalScope.__wcg_hub_loaded_at && (now - globalScope.__wcg_hub_loaded_at < HUB_CACHE_TTL_MS)) {
    return globalScope.__wcg_hub;
  }

  const vnToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  let hub: RealEventHubData = {
    date: vnToday,
    masterCopyClicks: GLOBAL_MASTER_COPY_BASELINE,
    events: [],
    realProductSoldCounts: {},
    realGiveawayClaimedCounts: {},
    peakProductSoldCounts: {},
    peakGiveawayClaimedCounts: {},
    peakCopyClicks: GLOBAL_MASTER_COPY_BASELINE,
    lowestProductStock: {},
    lowestGiveawayRemaining: {},
    updatedAt: new Date().toISOString(),
  };

  let hasD1Data = false;

  // 1. Authoritative: Read from Cloudflare D1 (Single Source of Truth)
  if (env && env.DB) {
    try {
      const d1Hub = await getSettingD1<RealEventHubData>(env.DB, 'wcg_real_events_hub');
      if (d1Hub && typeof d1Hub === 'object') {
        hasD1Data = true;
        hub.date = d1Hub.date || hub.date;
        if (typeof d1Hub.masterCopyClicks === 'number') {
          hub.masterCopyClicks = Math.max(GLOBAL_MASTER_COPY_BASELINE, hub.masterCopyClicks, d1Hub.masterCopyClicks);
        } else {
          hub.masterCopyClicks = Math.max(GLOBAL_MASTER_COPY_BASELINE, hub.masterCopyClicks);
        }
        hub.realProductSoldCounts = mergeCountsMonotonic(hub.realProductSoldCounts, d1Hub.realProductSoldCounts);
        hub.realGiveawayClaimedCounts = mergeCountsMonotonic(hub.realGiveawayClaimedCounts, d1Hub.realGiveawayClaimedCounts);
        hub.peakProductSoldCounts = mergeCountsMonotonic(hub.peakProductSoldCounts || {}, d1Hub.peakProductSoldCounts);
        hub.peakGiveawayClaimedCounts = mergeCountsMonotonic(hub.peakGiveawayClaimedCounts || {}, d1Hub.peakGiveawayClaimedCounts);
        if (typeof d1Hub.peakCopyClicks === 'number') {
          hub.peakCopyClicks = Math.max(GLOBAL_MASTER_COPY_BASELINE, hub.peakCopyClicks || 0, d1Hub.peakCopyClicks);
        } else {
          hub.peakCopyClicks = Math.max(GLOBAL_MASTER_COPY_BASELINE, hub.peakCopyClicks || 0);
        }
        hub.lowestProductStock = { ...(d1Hub.lowestProductStock || {}) };
        hub.lowestGiveawayRemaining = { ...(d1Hub.lowestGiveawayRemaining || {}) };
        if (Array.isArray(d1Hub.events)) {
          hub.events = [...d1Hub.events];
        }
      }
    } catch (e: any) {
      console.warn('[RealEventsHub] D1 read warning:', e?.message);
    }
  }

  // 2. Read from Cache API if available (monotonic merge only)
  try {
    if (typeof caches !== 'undefined' && (caches as any).default) {
      const cache = (caches as any).default;
      const cachedRes = await cache.match(CACHE_KEY_URL);
      if (cachedRes) {
        const cachedJson = await cachedRes.json();
        if (cachedJson && typeof cachedJson === 'object') {
          if (Array.isArray(cachedJson.events)) {
            const existingIds = new Set(hub.events.map((e: any) => e?.id));
            for (const ev of cachedJson.events) {
              if (ev && ev.id && !existingIds.has(ev.id)) {
                hub.events.push(ev);
                existingIds.add(ev.id);
              }
            }
          }
          if (typeof cachedJson.masterCopyClicks === 'number') {
            hub.masterCopyClicks = Math.max(hub.masterCopyClicks, cachedJson.masterCopyClicks);
          }
          hub.realProductSoldCounts = mergeCountsMonotonic(hub.realProductSoldCounts, cachedJson.realProductSoldCounts);
          hub.realGiveawayClaimedCounts = mergeCountsMonotonic(hub.realGiveawayClaimedCounts, cachedJson.realGiveawayClaimedCounts);
          // Do NOT let stale cache override authoritative D1 peaks & stock
          if (hasD1Data) {
            if (cachedJson.peakProductSoldCounts && typeof cachedJson.peakProductSoldCounts === 'object') {
              hub.peakProductSoldCounts = hub.peakProductSoldCounts || {};
              for (const [k, v] of Object.entries(cachedJson.peakProductSoldCounts)) {
                if (hub.peakProductSoldCounts[k] === undefined) {
                  hub.peakProductSoldCounts[k] = Number(v);
                }
              }
            }
            if (cachedJson.peakGiveawayClaimedCounts && typeof cachedJson.peakGiveawayClaimedCounts === 'object') {
              hub.peakGiveawayClaimedCounts = hub.peakGiveawayClaimedCounts || {};
              for (const [k, v] of Object.entries(cachedJson.peakGiveawayClaimedCounts)) {
                if (hub.peakGiveawayClaimedCounts[k] === undefined) {
                  hub.peakGiveawayClaimedCounts[k] = Number(v);
                }
              }
            }
            if (cachedJson.lowestProductStock && typeof cachedJson.lowestProductStock === 'object') {
              for (const [k, v] of Object.entries(cachedJson.lowestProductStock)) {
                if (hub.lowestProductStock[k] === undefined) {
                  hub.lowestProductStock[k] = Number(v);
                }
              }
            }
            if (cachedJson.lowestGiveawayRemaining && typeof cachedJson.lowestGiveawayRemaining === 'object') {
              for (const [k, v] of Object.entries(cachedJson.lowestGiveawayRemaining)) {
                if (hub.lowestGiveawayRemaining[k] === undefined) {
                  hub.lowestGiveawayRemaining[k] = Number(v);
                }
              }
            }
          } else {
            hub.peakProductSoldCounts = mergeCountsMonotonic(hub.peakProductSoldCounts || {}, cachedJson.peakProductSoldCounts);
            hub.peakGiveawayClaimedCounts = mergeCountsMonotonic(hub.peakGiveawayClaimedCounts || {}, cachedJson.peakGiveawayClaimedCounts);
            hub.lowestProductStock = mergeStockMonotonic(hub.lowestProductStock || {}, cachedJson.lowestProductStock);
            hub.lowestGiveawayRemaining = mergeStockMonotonic(hub.lowestGiveawayRemaining || {}, cachedJson.lowestGiveawayRemaining);
          }
        }
      }
    }
  } catch {}

  // 3. Merge with Edge Isolate In-Memory state (monotonic merge only)
  const memHub = globalScope.__wcg_hub;
  if (memHub) {
    if (typeof memHub.masterCopyClicks === 'number') {
      hub.masterCopyClicks = Math.max(hub.masterCopyClicks, memHub.masterCopyClicks);
    }
    if (Array.isArray(memHub.events)) {
      const existingIds = new Set(hub.events.map((e: any) => e?.id));
      for (const ev of memHub.events) {
        if (ev && ev.id && !existingIds.has(ev.id)) {
          hub.events.push(ev);
          existingIds.add(ev.id);
        }
      }
    }
    hub.realProductSoldCounts = mergeCountsMonotonic(hub.realProductSoldCounts, memHub.realProductSoldCounts);
    hub.realGiveawayClaimedCounts = mergeCountsMonotonic(hub.realGiveawayClaimedCounts, memHub.realGiveawayClaimedCounts);
    if (typeof memHub.peakCopyClicks === 'number') {
      hub.peakCopyClicks = Math.max(hub.peakCopyClicks || 0, memHub.peakCopyClicks);
    }
    // Do NOT let stale memory downgrade or override authoritative D1 peaks & stock
    if (hasD1Data) {
      if (memHub.peakProductSoldCounts && typeof memHub.peakProductSoldCounts === 'object') {
        hub.peakProductSoldCounts = hub.peakProductSoldCounts || {};
        for (const [k, v] of Object.entries(memHub.peakProductSoldCounts)) {
          if (hub.peakProductSoldCounts[k] === undefined) {
            hub.peakProductSoldCounts[k] = Number(v);
          }
        }
      }
      if (memHub.peakGiveawayClaimedCounts && typeof memHub.peakGiveawayClaimedCounts === 'object') {
        hub.peakGiveawayClaimedCounts = hub.peakGiveawayClaimedCounts || {};
        for (const [k, v] of Object.entries(memHub.peakGiveawayClaimedCounts)) {
          if (hub.peakGiveawayClaimedCounts[k] === undefined) {
            hub.peakGiveawayClaimedCounts[k] = Number(v);
          }
        }
      }
      if (memHub.lowestProductStock && typeof memHub.lowestProductStock === 'object') {
        for (const [k, v] of Object.entries(memHub.lowestProductStock)) {
          if (hub.lowestProductStock[k] === undefined) {
            hub.lowestProductStock[k] = Number(v);
          }
        }
      }
      if (memHub.lowestGiveawayRemaining && typeof memHub.lowestGiveawayRemaining === 'object') {
        for (const [k, v] of Object.entries(memHub.lowestGiveawayRemaining)) {
          if (hub.lowestGiveawayRemaining[k] === undefined) {
            hub.lowestGiveawayRemaining[k] = Number(v);
          }
        }
      }
    } else {
      hub.peakProductSoldCounts = mergeCountsMonotonic(hub.peakProductSoldCounts || {}, memHub.peakProductSoldCounts);
      hub.peakGiveawayClaimedCounts = mergeCountsMonotonic(hub.peakGiveawayClaimedCounts || {}, memHub.peakGiveawayClaimedCounts);
      hub.lowestProductStock = mergeStockMonotonic(hub.lowestProductStock || {}, memHub.lowestProductStock);
      hub.lowestGiveawayRemaining = mergeStockMonotonic(hub.lowestGiveawayRemaining || {}, memHub.lowestGiveawayRemaining);
    }
  }

  // Deduplicate and filter TTL (events within last 5 minutes)
  const nowMs = Date.now();
  const TTL_MS = 5 * 60 * 1000;
  const uniqueMap = new Map<string, any>();
  const seenSemanticKeys = new Set<string>();

  for (const rawEv of hub.events) {
    if (rawEv && rawEv.id) {
      const ev = sanitizeServerEvent(rawEv);
      const fireTime = Number(ev.scheduledFireTime) || Number(ev.timestamp) || 0;
      if (nowMs - fireTime <= TTL_MS && fireTime <= nowMs + 60000) {
        // Semantic key: type + target item + 20s time window
        const targetId = ev.productId || ev.giveawayId || ev.gameSlug || '';
        const semanticKey = targetId ? `${ev.type}_${targetId}_${Math.floor(fireTime / 20000)}` : '';
        if (semanticKey && seenSemanticKeys.has(semanticKey)) {
          continue; // Discard duplicate event for same transaction within 20s
        }
        if (semanticKey) seenSemanticKeys.add(semanticKey);

        uniqueMap.set(ev.id, ev);
      }
    }
  }

  const cleanEvents = Array.from(uniqueMap.values()).sort(
    (a, b) => (Number(b.timestamp || 0)) - (Number(a.timestamp || 0))
  );
  hub.events = cleanEvents.slice(0, 20);

  if (hub.date !== vnToday) {
    hub.date = vnToday;
    // masterCopyClicks is all-time monotonic global copy total: do NOT reset!
  }
  hub.masterCopyClicks = Math.max(GLOBAL_MASTER_COPY_BASELINE, hub.masterCopyClicks || 0);
  hub.peakCopyClicks = Math.max(GLOBAL_MASTER_COPY_BASELINE, hub.peakCopyClicks || 0, hub.masterCopyClicks);

  // Refresh current isolate memory store with authoritative merged state
  globalScope.__wcg_hub = {
    date: hub.date,
    masterCopyClicks: hub.masterCopyClicks,
    events: [...hub.events],
    realProductSoldCounts: { ...hub.realProductSoldCounts },
    realGiveawayClaimedCounts: { ...hub.realGiveawayClaimedCounts },
    peakProductSoldCounts: { ...(hub.peakProductSoldCounts || {}) },
    peakGiveawayClaimedCounts: { ...(hub.peakGiveawayClaimedCounts || {}) },
    peakCopyClicks: hub.peakCopyClicks || 0,
    lowestProductStock: { ...(hub.lowestProductStock || {}) },
    lowestGiveawayRemaining: { ...(hub.lowestGiveawayRemaining || {}) },
    updatedAt: hub.updatedAt,
  };
  globalScope.__wcg_hub_loaded_at = Date.now();

  return hub;
}

export async function saveRealEventsHub(env: any, hub: RealEventHubData, forceReset: boolean = false): Promise<void> {
  const vnToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  hub.date = vnToday;
  hub.updatedAt = new Date().toISOString();
  hub.masterCopyClicks = Math.max(GLOBAL_MASTER_COPY_BASELINE, hub.masterCopyClicks || 0);
  hub.peakCopyClicks = Math.max(GLOBAL_MASTER_COPY_BASELINE, hub.peakCopyClicks || 0, hub.masterCopyClicks);

  // Monotonic merge with memHub before saving (unless forceReset is requested)
  const memHub = globalScope.__wcg_hub;
  if (!forceReset && memHub) {
    if (typeof memHub.masterCopyClicks === 'number') {
      hub.masterCopyClicks = Math.max(hub.masterCopyClicks, memHub.masterCopyClicks);
    }
    hub.realProductSoldCounts = mergeCountsMonotonic(hub.realProductSoldCounts, memHub.realProductSoldCounts);
    hub.realGiveawayClaimedCounts = mergeCountsMonotonic(hub.realGiveawayClaimedCounts, memHub.realGiveawayClaimedCounts);
    hub.peakProductSoldCounts = mergeCountsMonotonic(hub.peakProductSoldCounts || {}, memHub.peakProductSoldCounts);
    hub.peakGiveawayClaimedCounts = mergeCountsMonotonic(hub.peakGiveawayClaimedCounts || {}, memHub.peakGiveawayClaimedCounts);
    if (typeof memHub.peakCopyClicks === 'number') {
      hub.peakCopyClicks = Math.max(hub.peakCopyClicks || 0, memHub.peakCopyClicks);
    }
    // Only inherit missing keys from memHub; do not let stale memHub downgrade hub stock
    if (memHub.lowestProductStock && typeof memHub.lowestProductStock === 'object') {
      hub.lowestProductStock = hub.lowestProductStock || {};
      for (const [k, v] of Object.entries(memHub.lowestProductStock)) {
        if (hub.lowestProductStock[k] === undefined) {
          hub.lowestProductStock[k] = Number(v);
        }
      }
    }
    if (memHub.lowestGiveawayRemaining && typeof memHub.lowestGiveawayRemaining === 'object') {
      hub.lowestGiveawayRemaining = hub.lowestGiveawayRemaining || {};
      for (const [k, v] of Object.entries(memHub.lowestGiveawayRemaining)) {
        if (hub.lowestGiveawayRemaining[k] === undefined) {
          hub.lowestGiveawayRemaining[k] = Number(v);
        }
      }
    }
  }

  // Sanitize all events before saving
  if (Array.isArray(hub.events)) {
    hub.events = hub.events.map(sanitizeServerEvent);
  }

  // Keep max 20 events
  if (hub.events.length > 20) {
    hub.events = hub.events.slice(0, 20);
  }

  // 1. Update in-memory isolate store
  globalScope.__wcg_hub = {
    date: hub.date,
    masterCopyClicks: hub.masterCopyClicks,
    events: [...hub.events],
    realProductSoldCounts: { ...hub.realProductSoldCounts },
    realGiveawayClaimedCounts: { ...hub.realGiveawayClaimedCounts },
    peakProductSoldCounts: { ...(hub.peakProductSoldCounts || {}) },
    peakGiveawayClaimedCounts: { ...(hub.peakGiveawayClaimedCounts || {}) },
    peakCopyClicks: hub.peakCopyClicks || 0,
    lowestProductStock: { ...(hub.lowestProductStock || {}) },
    lowestGiveawayRemaining: { ...(hub.lowestGiveawayRemaining || {}) },
    updatedAt: hub.updatedAt,
  };
  globalScope.__wcg_hub_loaded_at = Date.now();

  // 2. Update Edge Cache API (TTL 5s)
  try {
    if (typeof caches !== 'undefined' && (caches as any).default) {
      const cache = (caches as any).default;
      if (forceReset) {
        await cache.delete(CACHE_KEY_URL).catch(() => {});
      }
      const res = new Response(JSON.stringify(hub), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=5',
        },
      });
      await cache.put(CACHE_KEY_URL, res);
    }
  } catch {}

  // 3. Persist to D1 as SSOT with 30s throttle to protect D1 write quota
  const now = Date.now();
  const lastD1Save = globalScope.__wcg_hub_last_d1_save || 0;
  if (env && env.DB && (forceReset || (now - lastD1Save >= 60000))) {
    globalScope.__wcg_hub_last_d1_save = now;
    try {
      await setSettingD1(env.DB, 'wcg_real_events_hub', hub);
    } catch (dbErr: any) {
      console.warn('[RealEventsHub] D1 put warning:', dbErr?.message);
    }
  }
}
