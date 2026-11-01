/**
 * Admin Migration Endpoint - PERMANENTLY LOCKED & DISABLED
 * Quá trình chuyển đổi từ KV sang D1 đã hoàn tất 100%.
 * Tuyến đường này đã được khóa vĩnh viễn để bảo vệ tính toàn vẹn của hệ thống và ngăn chặn mọi nguy cơ gọi lại trái phép.
 */

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction = async () => {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'ENDPOINT_PERMANENTLY_LOCKED',
      message: 'Tuyến đường /api/admin/migrate đã được khóa vĩnh viễn sau khi hoàn tất di chuyển dữ liệu sang D1. Không thể thực thi migration thêm.',
    }),
    {
      status: 403,
      headers: CORS_HEADERS,
    }
  );
};

export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'ENDPOINT_PERMANENTLY_LOCKED',
      message: 'Tuyến đường /api/admin/migrate đã được khóa vĩnh viễn.',
    }),
    {
      status: 403,
      headers: CORS_HEADERS,
    }
  );
};
