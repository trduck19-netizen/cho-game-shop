// Lớp gọi API sàn cho giao diện (khối 1). Chỉ gọi các đường mà API đợt 1+2
// đã có và đã nối vào functions/_worker.ts; không tự chế đường mới.
// - GET  /api/marketplace/products?seller_id=... | ?game_slug=... (công khai)
// - POST /api/marketplace/orders/create   (cần Idempotency-Key, chống tự mua
//   và chống số dư không đủ đều do máy chủ kiểm tra, giao diện chỉ hiển thị)
// - POST /api/marketplace/orders/confirm  (chỉ người mua, chỉ khi tiền giữ)
// - POST /api/marketplace/disputes        (chỉ người mua, chỉ khi tiền giữ)
// CHƯA CÓ đường lấy danh sách đơn của người mua: xem ghi chú trong
// BuyerOrdersView.tsx và README.md — giao diện nhận đơn qua props.

import type { BuyerOrder, MarketplaceProduct } from './types';
import { generateIdempotencyKey, isValidIdempotencyKey } from './filterProducts';

function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    window.localStorage.getItem('wcg_auth_token') ||
    window.sessionStorage.getItem('wcg_auth_token') ||
    ''
  );
}

async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => ({}));
}

/** Thông báo lỗi máy chủ dịch sang tiếng Việt thân thiện, giữ nguyên mã lỗi. */
export function marketplaceErrorMessage(data: any, fallback: string): string {
  const code = String(data?.code || '');
  if (code === 'INSUFFICIENT_BALANCE') return 'Số dư ví không đủ để mua đơn này.';
  if (code === 'OUT_OF_STOCK') return 'Sản phẩm đã hết hàng hoặc không đủ số lượng.';
  if (code === 'INVALID_IDEMPOTENCY_KEY') return 'Mã chống trùng đơn không hợp lệ, vui lòng thử lại.';
  if (typeof data?.message === 'string' && data.message) return data.message;
  return fallback;
}

export async function listMarketplaceProducts(params?: {
  seller_id?: string;
  game_slug?: string;
  limit?: number;
}): Promise<MarketplaceProduct[]> {
  const query = new URLSearchParams();
  if (params?.seller_id) query.set('seller_id', params.seller_id);
  if (params?.game_slug) query.set('game_slug', params.game_slug);
  query.set('limit', String(Math.max(1, Math.min(50, params?.limit ?? 50))));
  const res = await fetch(`/api/marketplace/products?${query.toString()}`);
  const data = await readJson(res);
  if (!res.ok || !data?.success) {
    throw new Error(marketplaceErrorMessage(data, 'Không tải được danh sách sản phẩm sàn.'));
  }
  return Array.isArray(data.products) ? data.products : [];
}

export interface CreateOrderResult {
  orderId: string;
  deliveredCodes: string[];
  remainingBalance?: number;
  escrowStatus?: string;
  isIdempotentReplay?: boolean;
}

export async function createMarketplaceOrder(input: {
  product_id: string;
  quantity: number;
  idempotencyKey?: string;
}): Promise<CreateOrderResult> {
  const idempotencyKey = input.idempotencyKey || generateIdempotencyKey();
  if (!isValidIdempotencyKey(idempotencyKey)) {
    throw new Error('Mã chống trùng đơn không hợp lệ, vui lòng thử lại.');
  }
  const token = getAuthToken();
  const res = await fetch('/api/marketplace/orders/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      product_id: input.product_id,
      quantity: Math.max(1, Math.min(999, Math.floor(input.quantity) || 1)),
      idempotencyKey,
    }),
  });
  const data = await readJson(res);
  if (!res.ok || !data?.success) {
    throw new Error(marketplaceErrorMessage(data, 'Tạo đơn thất bại.'));
  }
  // Đơn tạo lại do trùng Idempotency-Key vẫn trả về đơn cũ + mã cũ.
  const order = data.order || {};
  return {
    orderId: String(data.orderId || order.id || ''),
    deliveredCodes: Array.isArray(data.deliveredCodes) ? data.deliveredCodes : [],
    remainingBalance: data.remainingBalance,
    escrowStatus: data.escrowStatus,
    isIdempotentReplay: Boolean(data.isIdempotentReplay),
  };
}

export async function confirmMarketplaceOrder(orderId: string): Promise<void> {
  const token = getAuthToken();
  const res = await fetch('/api/marketplace/orders/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ order_id: orderId }),
  });
  const data = await readJson(res);
  if (!res.ok || !data?.success) {
    throw new Error(marketplaceErrorMessage(data, 'Xác nhận đơn thất bại.'));
  }
}

export async function openMarketplaceDispute(input: {
  order_id: string;
  reason: string;
  evidence_text?: string;
}): Promise<void> {
  const token = getAuthToken();
  const res = await fetch('/api/marketplace/disputes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      order_id: input.order_id,
      reason: input.reason,
      evidence_text: input.evidence_text || '',
    }),
  });
  const data = await readJson(res);
  if (!res.ok || !data?.success) {
    throw new Error(marketplaceErrorMessage(data, 'Mở khiếu nại thất bại.'));
  }
}

/** Đơn vừa tạo xong, dựng từ kết quả tạo đơn để hiển thị ngay lập tức. */
export function buyerOrderFromCreateResult(input: {
  orderId: string;
  product: MarketplaceProduct;
  quantity: number;
  deliveredCodes: string[];
}): BuyerOrder {
  return {
    id: input.orderId,
    product_id: input.product.id,
    product_title: input.product.title,
    quantity: input.quantity,
    unit_price: Number(input.product.current_price) || 0,
    total_amount: (Number(input.product.current_price) || 0) * input.quantity,
    status: 'PENDING',
    delivered_codes: input.deliveredCodes,
    escrow_status: 'HELD',
    created_at: new Date().toISOString(),
    escrow_held_at: new Date().toISOString(),
  };
}
