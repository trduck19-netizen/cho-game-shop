// Kiểu dữ liệu cho giao diện sàn (khối 1). Chỉ khớp với các trường mà API
// sàn đợt 1 + 2 đã trả về; không tự bịa thêm trường nào từ máy chủ.
// Nguồn trường: functions/api/marketplace/index.ts và migration 0012.

export type SellerStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
export type ProductApproval = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED';
export type BuyerOrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type DisputeStatus = 'OPEN' | 'RESOLVED_RELEASE' | 'RESOLVED_REFUND' | 'REJECTED';

export interface MarketplaceProduct {
  id: string;
  seller_id: string;
  title: string;
  game_slug?: string | null;
  game_name?: string | null;
  product_type?: 'CODE';
  original_price: number;
  current_price: number;
  stock_quantity: number;
  sold_count: number;
  approval_status: ProductApproval;
  is_active: number;
  instructions?: string | null;
  created_at?: string;
  updated_at?: string;
  // API danh sách công khai tự cộng thêm trường này (số mã còn giao được).
  available_codes?: number;
  // API danh sách công khai tự nối thêm từ bảng sellers.
  shop_name?: string;
  shop_slug?: string;
}

export interface SellerShop {
  id: string;
  member_id: string;
  shop_name: string;
  shop_slug: string;
  description?: string;
  avatar_url?: string;
  status: SellerStatus;
  available_balance: number;
  held_balance: number;
  total_sold: number;
  rating_sum: number;
  rating_count: number;
  created_at?: string;
}

// Đơn của người mua. API tạo đơn hiện chỉ trả orderId + deliveredCodes;
// bảng orders lưu delivered_codes dạng chuỗi JSON. Giao diện chấp nhận cả
// hai dạng để không vỡ khi nguồn dữ liệu đổi dạng. Xem thêm ghi chú ở
// BuyerOrdersView: danh sách đơn vẫn cần đường GET riêng (khối khác lo).
export interface BuyerOrder {
  id: string;
  product_id?: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: BuyerOrderStatus;
  created_at?: string;
  delivered_codes?: string[] | string | null;
  escrow_status?: EscrowStatus;
  // Thời điểm bắt đầu giữ tiền (bảng marketplace_escrow.held_at). Đồng hồ
  // tự động trả tính từ mốc này, không phải từ created_at của đơn.
  escrow_held_at?: string | null;
  dispute_status?: DisputeStatus | null;
}

export interface MarketplaceDispute {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  evidence_text?: string;
  status: DisputeStatus;
  admin_note?: string;
  created_at?: string;
  resolved_at?: string | null;
}

export type ProductSortKey =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'best_selling'
  | 'biggest_discount';

export interface ProductFilterState {
  searchText: string;
  gameSlug: string;
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  sort: ProductSortKey;
}

export const EMPTY_PRODUCT_FILTERS: ProductFilterState = {
  searchText: '',
  gameSlug: '',
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  sort: 'newest',
};
