import { D1Database } from '@cloudflare/workers-types';
import { runGiveawaySimulation } from '../../services/giveaway_simulation_service';
import { verifyToken, verifyTemporaryAuditToken } from '../../services/auth_service';

interface Env {
  DB: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, Cache-Control',
};

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const configuredSecret = (env.ADMIN_SYNC_SECRET || '').trim();
  const authHeader = request.headers.get('Authorization') || '';
  const syncKeyHeader = request.headers.get('X-Sync-Key') || '';

  if (configuredSecret && configuredSecret.length >= 16) {
    if (syncKeyHeader && syncKeyHeader === configuredSecret) return true;
    const cleanAuth = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (cleanAuth === configuredSecret) return true;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token && env.DB) {
    if (token.startsWith('wcg_edge_tok_')) {
      const { valid } = await verifyToken(token, [env.JWT_SECRET, env.ADMIN_SYNC_SECRET]);
      if (valid) return true;
    }
    const member = await env.DB.prepare(
      'SELECT id, role FROM members WHERE session_token = ? LIMIT 1'
    ).bind(token).first<any>().catch(() => null);
    if (member && (member.role === 'ADMIN' || member.role === 'SUPER_ADMIN')) return true;
  }

  return false;
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(request.url);
  const authorized = await isAuthorized(request, env);
  const forceEventId = url.searchParams.get('eventId') || undefined;

  // GET mode: simulate dry-run or report status
  const report = await runGiveawaySimulation(env.DB, {
    forceEventId,
    bypassCooldown: false,
    bypassIdleThreshold: false,
  });

  return new Response(JSON.stringify({ success: true, authorized, report }), {
    headers: CORS_HEADERS,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const url = new URL(request.url);
  const forceEventId = body.eventId || url.searchParams.get('eventId') || undefined;
  const bypassCooldown = Boolean(body.bypassCooldown || url.searchParams.get('bypassCooldown') === '1');
  const bypassIdleThreshold = Boolean(body.bypassIdleThreshold || url.searchParams.get('bypassIdleThreshold') === '1');

  // Chạy mô phỏng
  const report = await runGiveawaySimulation(env.DB, {
    forceEventId,
    bypassCooldown,
    bypassIdleThreshold,
  });

  return new Response(JSON.stringify(report), {
    headers: CORS_HEADERS,
  });
};
