// Logic thuần (không chạm DOM, không gọi mạng) cho khối 1: tìm kiếm,
// lọc, sắp xếp sản phẩm sàn; định dạng tiền Core; trạng thái mức thử của
// người bán; xử lý mã đã giao và khóa Idempotency-Key.
// File này là phần được kiểm thử tự động bằng script node (xem cuối báo cáo).

import {
  MARKETPLACE_AUTO_RELEASE_HOURS,
  SELLER_TRIAL_LIMITS_ENABLED,
  SELLER_TRIAL_MAX_CODES_PER_PRODUCT,
  SELLER_TRIAL_MAX_PRODUCTS,
  SELLER_TRIAL_UPGRADE_MAX_DISPUTE_RATE,
  SELLER_TRIAL_UPGRADE_MIN_COMPLETED_ORDERS,
} from './marketplaceSettings';
import type {
  BuyerOrder,
  MarketplaceProduct,
  ProductFilterState,
  SellerShop,
} from './types';

/** Bỏ dấu tiếng Việt + về chữ thường để tìm kiếm không dấu vẫn khớp. */
export function normalizeVietnamese(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Khớp từng từ khóa (cách nhau bằng khoảng trắng) với tiêu đề/tên game. */
export function matchesSearch(product: MarketplaceProduct, query: string): boolean {
  const q = normalizeVietnamese(query).trim();
  if (!q) return true;
  const haystack = normalizeVietnamese(
    `${product.title || ''} ${product.game_name || ''} ${product.game_slug || ''} ${product.shop_name || ''}`,
  );
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

/** Số mã còn giao được: ưu tiên available_codes mà API đã tính sẵn. */
export function availableCodeCount(product: MarketplaceProduct): number {
  if (typeof product.available_codes === 'number') return Math.max(0, product.available_codes);
  return Math.max(0, product.stock_quantity || 0);
}

/** Phần trăm giảm giá từ giá gốc, chỉ tính khi giá gốc lớn hơn giá bán. */
export function discountPercent(product: MarketplaceProduct): number {
  const original = Number(product.original_price) || 0;
  const current = Number(product.current_price) || 0;
  if (original <= 0 || current >= original) return 0;
  return Math.round(((original - current) / original) * 100);
}

/** Điểm trung bình của gian hàng, làm tròn 1 chữ số; chưa có đánh giá = null. */
export function sellerRating(shop: SellerShop): number | null {
  const count = Number(shop.rating_count) || 0;
  if (count <= 0) return null;
  return Math.round(((Number(shop.rating_sum) || 0) / count) * 10) / 10;
}

export function filterProducts(
  products: MarketplaceProduct[],
  filters: ProductFilterState,
): MarketplaceProduct[] {
  return products.filter((p) => {
    // API công khai chỉ trả sản phẩm đã duyệt + đang bán, nhưng lọc lại ở
    // đây để giao diện không bao giờ vô tình hiện hàng chờ duyệt. Lưu ý
    // SQLite lưu boolean dạng 0/1 nên so sánh === 1, không so với false.
    if (p.approval_status !== 'APPROVED' || p.is_active !== 1) return false;
    if (!matchesSearch(p, filters.searchText)) return false;
    if (filters.gameSlug && p.game_slug !== filters.gameSlug) return false;
    const price = Number(p.current_price) || 0;
    if (filters.minPrice !== null && price < filters.minPrice) return false;
    if (filters.maxPrice !== null && price > filters.maxPrice) return false;
    if (filters.inStockOnly && availableCodeCount(p) <= 0) return false;
    return true;
  });
}

export function sortProducts(
  products: MarketplaceProduct[],
  sort: ProductFilterState['sort'],
): MarketplaceProduct[] {
  const list = [...products];
  const byCreatedDesc = (a: MarketplaceProduct, b: MarketplaceProduct) =>
    String(b.created_at || '').localeCompare(String(a.created_at || ''));
  switch (sort) {
    case 'price_asc':
      return list.sort((a, b) => Number(a.current_price) - Number(b.current_price) || byCreatedDesc(a, b));
    case 'price_desc':
      return list.sort((a, b) => Number(b.current_price) - Number(a.current_price) || byCreatedDesc(a, b));
    case 'best_selling':
      return list.sort((a, b) => Number(b.sold_count) - Number(a.sold_count) || byCreatedDesc(a, b));
    case 'biggest_discount':
      return list.sort((a, b) => discountPercent(b) - discountPercent(a) || byCreatedDesc(a, b));
    case 'newest':
    default:
      return list.sort(byCreatedDesc);
  }
}

export function searchFilterSortProducts(
  products: MarketplaceProduct[],
  filters: ProductFilterState,
): MarketplaceProduct[] {
  return sortProducts(filterProducts(products, filters), filters.sort);
}

/** Định dạng tiền Core theo kiểu Việt Nam, ví dụ 150000 -> "150.000 Core". */
export function formatCore(amount: number): string {
  const value = Math.floor(Number(amount) || 0);
  return `${value.toLocaleString('vi-VN')} Core`;
}

/** Mã đã giao: chấp nhận mảng thật hoặc chuỗi JSON từ bảng orders. */
export function parseDeliveredCodes(order: BuyerOrder): string[] {
  const raw = order.delivered_codes;
  if (Array.isArray(raw)) return raw.map((c) => String(c)).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((c) => String(c)).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

/** Che mã dạng ABC***XYZ để tránh lộ mã khi chụp màn hình/chia sẻ. */
export function maskCode(code: string): string {
  const c = String(code || '');
  if (c.length <= 6) return '••••••';
  return `${c.slice(0, 3)}••••${c.slice(-3)}`;
}

/** Hạn tự động trả dự kiến, tính từ lúc giữ tiền; chưa có mốc thì null. */
export function escrowAutoReleaseAt(order: BuyerOrder): Date | null {
  if (!order.escrow_held_at) return null;
  const heldAt = new Date(order.escrow_held_at);
  if (Number.isNaN(heldAt.getTime())) return null;
  return new Date(heldAt.getTime() + MARKETPLACE_AUTO_RELEASE_HOURS * 3600 * 1000);
}

/**
 * Khóa Idempotency-Key cho tạo đơn: API yêu cầu 8–128 ký tự, chỉ gồm
 * chữ, số, gạch dưới, gạch ngang. Dùng tiền tố MP + thời gian + ngẫu nhiên.
 */
export function generateIdempotencyKey(): string {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `MP-${Date.now().toString(36).toUpperCase()}-${random}`;
}

export function isValidIdempotencyKey(key: string): boolean {
  return /^[a-zA-Z0-9_\-]{8,128}$/.test(String(key || ''));
}

export interface SellerTrialStatus {
  enabled: boolean;
  /** true = vẫn ở mức thử (chưa đủ điều kiện lên hạng chuẩn). */
  isTrial: boolean;
  remainingProducts: number | null;
  remainingCodesPerProduct: number | null;
  upgradeReady: boolean;
}

/**
 * Trạng thái mức thử của người bán, tính từ số liệu thật truyền vào.
 * Khi SELLER_TRIAL_LIMITS_ENABLED = false, mọi giới hạn đều tắt.
 * Hàm này chỉ PHỤC VỤ HIỂN THỊ; API mới là nơi chặn nếu cần.
 */
export function sellerTrialStatus(input: {
  productCount: number;
  codesInFullestProduct: number;
  completedOrders: number;
  disputeCount: number;
}): SellerTrialStatus {
  if (!SELLER_TRIAL_LIMITS_ENABLED) {
    return { enabled: false, isTrial: false, remainingProducts: null, remainingCodesPerProduct: null, upgradeReady: true };
  }
  const totalOrders = Math.max(0, input.completedOrders);
  const disputeRate = totalOrders > 0 ? Math.max(0, input.disputeCount) / totalOrders : 0;
  const upgradeReady =
    totalOrders >= SELLER_TRIAL_UPGRADE_MIN_COMPLETED_ORDERS &&
    disputeRate < SELLER_TRIAL_UPGRADE_MAX_DISPUTE_RATE;
  return {
    enabled: true,
    isTrial: !upgradeReady,
    remainingProducts: Math.max(0, SELLER_TRIAL_MAX_PRODUCTS - Math.max(0, input.productCount)),
    remainingCodesPerProduct: Math.max(
      0,
      SELLER_TRIAL_MAX_CODES_PER_PRODUCT - Math.max(0, input.codesInFullestProduct),
    ),
    upgradeReady,
  };
}
