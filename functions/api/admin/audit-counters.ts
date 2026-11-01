import { auditAndRebalanceStockCounters } from '../../services/d1_service';
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-Requested-With',
};

async function isAuthorizedAdmin(request: Request, env: Env): Promise<boolean> {
  const configuredSecret = (env.ADMIN_SYNC_SECRET || '').trim();
  const authHeader = request.headers.get('Authorization') || '';
  const syncKeyHeader = request.headers.get('X-Sync-Key') || '';

  // 1. Sync Secret Key header
  if (configuredSecret && configuredSecret.length >= 16) {
    if (syncKeyHeader && syncKeyHeader === configuredSecret) return true;
    if (authHeader.startsWith('Bearer ') && authHeader.replace('Bearer ', '').trim() === configuredSecret) return true;
  }

  // 1.5. Khóa Kiểm Toán Tạm Thời (Tự hủy sau 2 giờ - CHỈ CHO PHÉP GET)
  const incomingAuthToken = (syncKeyHeader || authHeader.replace(/^Bearer\s+/i, '')).trim();
  if (incomingAuthToken.startsWith('wcg_audit_temp_')) {
    const candidateSecrets = [env.ADMIN_SYNC_SECRET, env.JWT_SECRET];
    const auditCheck = await verifyTemporaryAuditToken(incomingAuthToken, candidateSecrets, env.DB);
    if (auditCheck.valid) {
      // Chỉ cho phép GET (DRY_RUN audit)
      if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
        return true;
      }
    }
    return false;
  }

  // 2. Bearer Admin Token
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const secrets = [env.JWT_SECRET, env.ADMIN_SYNC_SECRET];
    const { valid, userId } = await verifyToken(token, secrets);
    if (valid && userId && env.DB) {
      const member = await env.DB.prepare('SELECT role FROM members WHERE id = ?').bind(userId).first<any>();
      if (member && (member.role === 'ADMIN' || member.role === 'SUPER_ADMIN')) {
        return true;
      }
    }
  }

  return false;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

/**
 * GET /api/admin/audit-counters
 * Chế độ Dry-Run: Quét kiểm toán toàn bộ kho hàng, phát hiện độ lệch giữa store_products và inventory_codes.
 * Không thực hiện chỉnh sửa dữ liệu.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, error: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const authorized = await isAuthorizedAdmin(request, env);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Bạn không có quyền kiểm toán kho.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const auditResult = await auditAndRebalanceStockCounters(env.DB, false);

    return new Response(
      JSON.stringify({
        success: auditResult.success,
        mode: 'DRY_RUN',
        message: auditResult.summary,
        report: auditResult,
      }),
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: 'Lỗi thực thi kiểm toán: ' + (err?.message || String(err)) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

/**
 * POST /api/admin/audit-counters
 * Chế độ Auto-Recover: Quét kiểm toán và TỰ ĐỘNG TÁI CÂN BẰNG (Rebalance) lại Counter Cache chuẩn 100%.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, error: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const authorized = await isAuthorizedAdmin(request, env);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Bạn không có quyền thực hiện tái cân bằng kho.' }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const auditResult = await auditAndRebalanceStockCounters(env.DB, true);

    return new Response(
      JSON.stringify({
        success: auditResult.success,
        mode: 'AUTO_RECOVER',
        message: auditResult.summary,
        report: auditResult,
      }),
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: 'Lỗi thực thi tái cân bằng: ' + (err?.message || String(err)) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
