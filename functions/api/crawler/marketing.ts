/**
 * Cloudflare Pages Function: Marketing & FOMO Independent Audit API
 * Route: /api/crawler/marketing
 * 
 * Cung cấp endpoint chỉ-đọc (Read-only) bảo mật cao cho Muse Bot hoặc bên kiểm chứng độc lập:
 * 1. Đọc cấu hình live: get_marketing_config
 * 2. Đọc nhật ký tối đa 100 sự kiện toast gần đây: list_marketing_events
 * 3. Xác thực ĐỘC QUYỀN qua header: "Authorization: Bearer <KEY>". Không hỗ trợ ?api_key= trên URL.
 * 4. Nghiêm cấm mọi thao tác ghi (HTTP 403 Forbidden).
 * 5. Giới hạn tần suất 60 requests/phút chống cào ồ ạt (HTTP 429).
 */

import {
  authenticateMarketingAuditor,
  getLiveMarketingConfig,
  getRecentMarketingEvents,
  checkAuditorRateLimit,
} from '../../services/marketingAuditService';
import { getOrRefreshSnapshot } from '../../services/snapshotService';
import { initializeVirtualLayer, processCurrentTimeSlot } from '../../services/virtualLayerService';
import { getD1QuotaStatus, getPaginatedVirtualEventsD1 } from '../../services/d1_service';

export interface Env {
  DB?: D1Database;
  ADMIN_SYNC_SECRET?: string;
  MUSE_MARKETING_AUDIT_KEY?: string;
  MUSE_API_KEY?: string;
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

function maskAuditorUserName(name: string): string {
  if (!name) return 'Khách hàng';
  const trimmed = name.trim();
  if (trimmed.includes('*')) return trimmed;
  if (trimmed.length <= 3) return trimmed.charAt(0) + '***';
  return trimmed.slice(0, 3) + '***' + (trimmed.length > 6 ? trimmed.slice(-2) : '');
}

export async function buildVirtualAnalyticsPayload(
  env: Env,
  auth: { botName: string; role: string },
  pageParam?: any,
  limitParam?: any
) {
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = Math.max(1, Math.min(100, Number(limitParam) || 15));

  const layerState = await initializeVirtualLayer(env);
  processCurrentTimeSlot(layerState);

  const products3Col = Array.from(layerState.products.values()).map(p => {
    const soldVal = p.realSold + p.virtualSold;
    const stockVal = p.realStock > 0 ? (p.realStock + Math.max(0, p.virtualBuffer)) : 0;
    return {
      id: p.productId,
      title: p.title,
      item_type: p.itemType,
      real_sold: p.realSold,
      real_stock: p.realStock,
      virtual_sold: p.virtualSold,
      virtual_buffer: Math.max(0, p.virtualBuffer),
      virtual_restock_count: p.virtualRestockCount,
      sold: soldVal,
      stock: stockVal,
      display_sold: soldVal,
      display_stock: stockVal,
      last_restock_at: p.lastRestockAt || null,
    };
  });

  const giveaways3Col = Array.from(layerState.giveaways.values()).map(g => {
    const claimedVal = g.realClaimed + g.virtualClaimed;
    const remainingVal = g.realRemaining > 0 ? (g.realRemaining + Math.max(0, g.virtualRemainingBuffer)) : 0;
    return {
      id: g.campaignId,
      title: g.title,
      real_claimed: g.realClaimed,
      real_remaining: g.realRemaining,
      virtual_claimed: g.virtualClaimed,
      virtual_buffer: Math.max(0, g.virtualRemainingBuffer),
      virtual_restock_count: g.virtualRestockCount,
      claimed: claimedVal,
      remaining: remainingVal,
      display_claimed: claimedVal,
      display_remaining: remainingVal,
      last_restock_at: g.lastRestockAt || null,
    };
  });

  const rawPaginated = env.DB
    ? await getPaginatedVirtualEventsD1(env.DB, page, limit)
    : { events: [], total: 0, page, limit, totalPages: 1 };

  const cleanEvents = (rawPaginated.events || []).map((ev: any) => {
    let detailsObj: any = ev.details;
    if (typeof detailsObj === 'string') {
      try {
        detailsObj = JSON.parse(detailsObj);
      } catch {
        detailsObj = {};
      }
    }
    if (detailsObj && typeof detailsObj === 'object') {
      if (detailsObj.userName) detailsObj.userName = maskAuditorUserName(detailsObj.userName);
      if (detailsObj.customerName) detailsObj.customerName = maskAuditorUserName(detailsObj.customerName);
      delete detailsObj.phone;
      delete detailsObj.email;
      delete detailsObj.raw_code;
    }
    return {
      id: ev.id,
      type: ev.type,
      product_id: ev.product_id || '',
      productId: ev.product_id || '',
      targetId: ev.product_id || '',
      item_name: ev.item_name || '',
      amount: ev.amount || 1,
      details: detailsObj,
      is_simulated: Boolean(ev.is_simulated),
      created_at: ev.created_at,
    };
  });

  const quotaStatus = getD1QuotaStatus();
  const newestSimEvent = layerState.recentVirtualEvents[0];
  const lastEventAgeSeconds = newestSimEvent
    ? Math.max(0, Math.floor((Date.now() - new Date(newestSimEvent.created_at).getTime()) / 1000))
    : 0;

  const streamHealth = {
    is_healthy: lastEventAgeSeconds <= 30,
    last_event_age_seconds: lastEventAgeSeconds,
    silence_warning: lastEventAgeSeconds > 60,
    silence_threshold_seconds: 60,
    total_slots_processed_today: layerState.lastProcessedSlot + 1,
  };

  return {
    success: true,
    action: 'get_virtual_analytics',
    botName: auth.botName,
    timestamp: new Date().toISOString(),
    rejectPeakReports: true,
    d1_quota: quotaStatus,
    stream_health: streamHealth,
    products: products3Col,
    giveaways: giveaways3Col,
    master_copy: {
      real_clicks: layerState.masterCopy.realClicks,
      virtual_copy: layerState.masterCopy.virtualCopy,
      total_display: layerState.masterCopy.realClicks + layerState.masterCopy.virtualCopy,
    },
    paginated_events: {
      events: cleanEvents,
      total: rawPaginated.total,
      page: rawPaginated.page,
      limit: rawPaginated.limit,
      totalPages: rawPaginated.totalPages,
    },
  };
}

/**
 * GET: Hỗ trợ đọc nhanh cấu hình live nếu có Bearer token,
 * hoặc trả về tài liệu hướng dẫn công khai nếu không có token.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const urlObj = new URL(request.url);
  const authHeader = request.headers.get('Authorization') || '';

  // 0. Nghiêm cấm truyền api_key qua URL query để chống rò rỉ token trong server logs
  const queryKey = urlObj.searchParams.get('api_key') || urlObj.searchParams.get('key');
  if (queryKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Xác thực qua URL (?api_key=...) bị nghiêm cấm vì nguy cơ rò rỉ log. Vui lòng cung cấp khóa Bearer qua Header "Authorization: Bearer <KEY>".',
        status: 401,
      }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  // 1. Nếu có gửi Bearer token -> Thực hiện xác thực và trả dữ liệu kiểm chứng
  if (authHeader.startsWith('Bearer ')) {
    const auth = await authenticateMarketingAuditor(request, env);
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({
          success: false,
          error: auth.error || 'Quyền truy cập bị từ chối.',
          status: auth.status || 401,
        }),
        { status: auth.status || 401, headers: CORS_HEADERS }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateCheck = checkAuditorRateLimit(`${clientIp}_${token}`);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tần suất yêu cầu vượt quá giới hạn (Rate limit: tối đa 60 requests/phút). Vui lòng thử lại sau.',
          status: 429,
        }),
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const action = urlObj.searchParams.get('action') || 'get_marketing_config';
    if (action === 'get_metrics_snapshot') {
      const snapshot = await getOrRefreshSnapshot(env, undefined, true);
      return new Response(
        JSON.stringify({
          success: true,
          action: 'get_metrics_snapshot',
          botName: auth.botName,
          snapshot,
        }, null, 2),
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' } }
      );
    }

    if (action === 'list_marketing_events') {
      const limit = Number(urlObj.searchParams.get('limit')) || 100;
      const events = await getRecentMarketingEvents(env, limit);
      return new Response(
        JSON.stringify({
          success: true,
          action: 'list_marketing_events',
          botName: auth.botName,
          total: events.length,
          limit,
          events,
        }, null, 2),
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' } }
      );
    }

    if (action === 'get_virtual_analytics') {
      const page = urlObj.searchParams.get('page');
      const limit = urlObj.searchParams.get('limit');
      const payload = await buildVirtualAnalyticsPayload(env, auth, page, limit);

      return new Response(
        JSON.stringify(payload, null, 2),
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' } }
      );
    }

    // Mặc định: get_marketing_config
    const config = await getLiveMarketingConfig(env);
    return new Response(
      JSON.stringify({
        success: true,
        action: 'get_marketing_config',
        botName: auth.botName,
        rejectPeakReports: true,
        config: {
          ...config,
          rejectPeakReports: true,
        },
      }, null, 2),
      { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' } }
    );
  }

  // 2. Không kèm Bearer token -> Trả về tài liệu hướng dẫn API công khai (TUYỆT ĐỐI KHÔNG lộ key)
  const doc = {
    service: 'CodeGame Marketing & FOMO Independent Audit API (Muse Integration)',
    version: '1.0.0',
    status: 'ONLINE',
    endpoint: `${urlObj.origin}/api/crawler/marketing`,
    compatibleAlternativeEndpoint: `${urlObj.origin}/api/crawler/ingest-codes`,
    authInstructions: {
      method: 'Header Authorization: Bearer <KEY>',
      securityNote: 'Xác thực ĐỘC QUYỀN bằng Header Authorization. Không chấp nhận ?api_key= trên URL để bảo vệ an toàn log.',
    },
    supportedActions: [
      {
        action: 'get_marketing_config',
        method: 'POST hoặc GET',
        description: 'Đọc cấu hình live hệ thống Marketing & FOMO (Trạng thái, tỷ lệ 7 loại, chu kỳ nổ toast, giờ vàng, số nick mô phỏng, rejectPeakReports).',
      },
      {
        action: 'list_marketing_events',
        method: 'POST hoặc GET',
        description: 'Đọc nhật ký tối đa 100 sự kiện toast gần đây (mỗi sự kiện có cờ bắt buộc is_simulated: true/false, không lộ PII người dùng thật).',
      },
      {
        action: 'get_virtual_analytics',
        method: 'POST hoặc GET',
        description: 'Đọc phân tích hai lớp (Two-Layer FOMO): Giám sát quota D1 (5.000.000 limit/ngày, circuitBreakerActive), số liệu 3 cột sản phẩm/giveaway (real/virtual/display), sổ ảo phân trang (page, limit 15, total), và cờ rejectPeakReports.',
      },
      {
        action: 'get_metrics_snapshot',
        method: 'POST hoặc GET',
        description: 'Đọc snapshot tổng quan số lượng game và mã giftcode được cache tại Edge.',
      },
    ],
    permissionsPolicy: {
      role: 'READ_ONLY_AUDITOR',
      allowedActions: ['get_marketing_config', 'list_marketing_events', 'get_virtual_analytics', 'get_metrics_snapshot'],
      writeActions: 'STRICTLY_FORBIDDEN (HTTP 403)',
      rateLimit: '60 requests / phút',
    },
    sampleCurlGetConfig: `curl -X GET "${urlObj.origin}/api/crawler/marketing" \\
  -H "Authorization: Bearer <MUSE_MARKETING_AUDIT_KEY>"`,
    sampleCurlGetVirtualAnalytics: `curl -X GET "${urlObj.origin}/api/crawler/marketing?action=get_virtual_analytics&page=1&limit=15" \\
  -H "Authorization: Bearer <MUSE_MARKETING_AUDIT_KEY>"`,
    sampleCurlListEvents: `curl -X POST "${urlObj.origin}/api/crawler/marketing" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <MUSE_MARKETING_AUDIT_KEY>" \\
  -d '{"action": "list_marketing_events", "limit": 100}'`,
    sampleCurlPostVirtualAnalytics: `curl -X POST "${urlObj.origin}/api/crawler/marketing" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <MUSE_MARKETING_AUDIT_KEY>" \\
  -d '{"action": "get_virtual_analytics", "page": 1, "limit": 15}'`,
    sampleIngestAlternativeCurl: `curl -X POST "${urlObj.origin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <MUSE_MARKETING_AUDIT_KEY>" \\
  -d '{"action": "get_virtual_analytics", "page": 1, "limit": 15}'`,
  };

  return new Response(JSON.stringify(doc, null, 2), {
    headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' },
  });
};

/**
 * POST: Thực thi các action kiểm chứng chỉ đọc
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const urlObj = new URL(request.url);

  // 0. Nghiêm cấm truyền api_key qua URL query để chống rò rỉ token trong server logs
  const queryKey = urlObj.searchParams.get('api_key') || urlObj.searchParams.get('key');
  if (queryKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Xác thực qua URL (?api_key=...) bị nghiêm cấm vì nguy cơ rò rỉ log. Vui lòng cung cấp khóa Bearer qua Header "Authorization: Bearer <KEY>".',
        status: 401,
      }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  // 1. Xác thực Bearer Key
  const auth = await authenticateMarketingAuditor(request, env);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({
        success: false,
        error: auth.error || 'Quyền truy cập bị từ chối.',
        hint: 'Cung cấp API Key qua Header "Authorization: Bearer <KEY>"',
        status: auth.status || 401,
      }),
      { status: auth.status || 401, headers: CORS_HEADERS }
    );
  }

  // 2. Giới hạn tần suất 60 req/phút
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateCheck = checkAuditorRateLimit(`${clientIp}_${token}`);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Tần suất yêu cầu vượt quá giới hạn (Rate limit: tối đa 60 requests/phút). Vui lòng thử lại sau.',
        status: 429,
      }),
      { status: 429, headers: CORS_HEADERS }
    );
  }

  // 3. Phân tích Payload
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const action = String(body.action || 'get_marketing_config').trim();

  // 4. Kiểm tra quyền hạn: Từ chối MỌI thao tác ghi với mã HTTP 403 Forbidden
  const writeActions = [
    'update_marketing_config', 'save_marketing_config', 'test_trigger',
    'ingest_codes', 'queue_game', 'publish_game', 'approve_codes', 'reject_codes',
    'update_instructions', 'cleanup_test_codes', 'delete_pending_game'
  ];

  const allowedAuditActions = ['get_marketing_config', 'list_marketing_events', 'get_metrics_snapshot', 'get_virtual_analytics'];
  if (writeActions.includes(action)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Quyền truy cập bị từ chối: Thao tác ghi "${action}" bị nghiêm cấm đối với khóa kiểm toán (Read-only). Cấu hình và dữ liệu chỉ được chỉnh sửa trên Admin UI.`,
        status: 403,
      }),
      { status: 403, headers: CORS_HEADERS }
    );
  }

  if (auth.role === 'marketing_auditor' && !allowedAuditActions.includes(action)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Quyền truy cập bị từ chối: Khóa kiểm toán chỉ có quyền đọc (Read-only) cho các action: ${allowedAuditActions.join(', ')}. Action "${action}" không được phép thực thi.`,
        status: 403,
      }),
      { status: 403, headers: CORS_HEADERS }
    );
  }

  // 5. Action: get_metrics_snapshot
  if (action === 'get_metrics_snapshot') {
    const snapshot = await getOrRefreshSnapshot(env, undefined, true);
    return new Response(
      JSON.stringify({
        success: true,
        action: 'get_metrics_snapshot',
        botName: auth.botName,
        snapshot,
      }, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  // 6. Action: get_marketing_config
  if (action === 'get_marketing_config') {
    const config = await getLiveMarketingConfig(env);
    return new Response(
      JSON.stringify({
        success: true,
        action: 'get_marketing_config',
        botName: auth.botName,
        rejectPeakReports: true,
        config: {
          ...config,
          rejectPeakReports: true,
        },
      }, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  // 7. Action: list_marketing_events
  if (action === 'list_marketing_events') {
    const limit = Number(body.limit) || 100;
    const events = await getRecentMarketingEvents(env, limit);
    return new Response(
      JSON.stringify({
        success: true,
        action: 'list_marketing_events',
        botName: auth.botName,
        total: events.length,
        limit,
        events,
      }, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  // 8. Action: get_virtual_analytics
  if (action === 'get_virtual_analytics') {
    const payload = await buildVirtualAnalyticsPayload(env, auth, body.page, body.limit);
    return new Response(
      JSON.stringify(payload, null, 2),
      { headers: CORS_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: `Hành động "${action}" không được hỗ trợ. Chỉ hỗ trợ "get_marketing_config", "list_marketing_events", "get_metrics_snapshot", và "get_virtual_analytics".`,
      status: 400,
    }),
    { status: 400, headers: CORS_HEADERS }
  );
};
