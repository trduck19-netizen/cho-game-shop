// Khối 5 — Tầng gọi API đánh giá và xếp hạng gian hàng.
//
// Module độc lập, chưa được import từ src/App.tsx. Điều phối viên nối nó vào
// trang gian hàng / trang đơn hàng khi gộp (xem SellerReviews.tsx và
// SellerRanking.tsx cùng thư mục).
// Mọi con số trả về đều là số thật từ API; module này không cộng thêm, không
// làm tròn đẹp, không tự điền giá trị khi API trả null.

import { authService } from '../services/authService';

export interface SellerSummary {
  seller_id: string;
  shop_name: string;
  shop_slug: string;
  avatar_url: string;
  // Số lượt bán thật từ sellers.total_sold, giữ nguyên như API trả về.
  total_sold: number;
  rating_count: number;
  rating_sum: number;
  // null = gian hàng chưa có đánh giá nào. Giao diện phải hiện
  // "Chưa có đánh giá", không được hiện 0 sao hay 5 sao thay thế.
  rating_average: number | null;
}

export interface SellerReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  buyer_name: string;
  product_title: string | null;
  // Số bình chọn "Hữu ích" đếm thật từ bảng bình chọn; mọi đánh giá đều là
  // của người đã mua thành công nên nhãn này luôn đúng.
  helpful_count: number;
  verified_purchase: boolean;
}

export type ReviewSort = 'newest' | 'highest' | 'lowest' | 'helpful';

export interface ReviewDistribution {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
}

export interface SellerRankingRow extends SellerSummary {
  rank: number;
  completed_orders: number;
  cancelled_orders: number;
  finished_orders: number;
  // null = gian hàng chưa có đơn nào đã kết thúc (COMPLETED hoặc CANCELLED).
  success_rate: number | null;
  disputes_total: number;
  disputes_open: number;
  // Huy hiệu suy ra từ số thật theo ngưỡng TRUST_BADGE ở API; false nghĩa là
  // chưa đủ điều kiện, không phải là "gian hàng kém".
  trust_badge: boolean;
  ranking_score: number | null;
}

export type ReviewEligibility =
  | { eligible: true; seller_id: string; order_status: string; product_title: string }
  | { eligible: false; reason: string; message: string; order_status: string | null };

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = authService.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function readBody(res: Response): Promise<any> {
  return res.json().catch(() => ({}));
}

export async function getSellerReviews(
  sellerId: string,
  limit = 20,
  offset = 0,
  sort: ReviewSort = 'newest',
): Promise<{ success: boolean; summary?: SellerSummary; total?: number; distribution?: ReviewDistribution; reviews: SellerReview[]; message?: string }> {
  try {
    const res = await fetch(`/api/marketplace/reviews?seller_id=${encodeURIComponent(sellerId)}&limit=${limit}&offset=${offset}&sort=${sort}`);
    const data = await readBody(res);
    if (!res.ok || !data.success) {
      return { success: false, reviews: [], message: data.message || 'Không tải được đánh giá.' };
    }
    return { success: true, summary: data.summary, total: data.total, distribution: data.distribution, reviews: data.reviews || [] };
  } catch {
    return { success: false, reviews: [], message: 'Lỗi mạng khi tải đánh giá.' };
  }
}

export async function toggleHelpfulVote(
  reviewId: string,
): Promise<{ success: boolean; voted?: boolean; helpful_count?: number; message: string }> {
  try {
    const res = await fetch('/api/marketplace/reviews/helpful', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ review_id: reviewId }),
    });
    const data = await readBody(res);
    return { success: !!data.success, voted: data.voted, helpful_count: data.helpful_count, message: data.message || (data.success ? 'Đã ghi nhận bình chọn.' : 'Không ghi nhận được bình chọn.') };
  } catch {
    return { success: false, message: 'Lỗi mạng khi bình chọn.' };
  }
}

export async function getSellerRanking(limit = 50): Promise<{ success: boolean; sellers: SellerRankingRow[]; message?: string }> {
  try {
    const res = await fetch(`/api/marketplace/sellers/ranking?limit=${limit}`);
    const data = await readBody(res);
    if (!res.ok || !data.success) {
      return { success: false, sellers: [], message: data.message || 'Không tải được bảng xếp hạng.' };
    }
    return { success: true, sellers: data.sellers || [] };
  } catch {
    return { success: false, sellers: [], message: 'Lỗi mạng khi tải bảng xếp hạng.' };
  }
}

export async function checkReviewEligibility(orderId: string): Promise<{ success: boolean; eligibility?: ReviewEligibility; message?: string }> {
  try {
    const res = await fetch(`/api/marketplace/reviews/eligible?order_id=${encodeURIComponent(orderId)}`, { headers: authHeaders() });
    const data = await readBody(res);
    if (!res.ok) {
      return { success: false, message: data.message || 'Vui lòng đăng nhập để kiểm tra.' };
    }
    return {
      success: true,
      eligibility: data.eligible
        ? { eligible: true, seller_id: data.seller_id, order_status: data.order_status, product_title: data.product_title || '' }
        : { eligible: false, reason: data.reason || '', message: data.message || '', order_status: data.order_status ?? null },
    };
  } catch {
    return { success: false, message: 'Lỗi mạng khi kiểm tra quyền đánh giá.' };
  }
}

export async function submitReview(
  orderId: string,
  rating: number,
  comment: string,
): Promise<{ success: boolean; message: string; summary?: SellerSummary }> {
  try {
    const res = await fetch('/api/marketplace/reviews', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ order_id: orderId, rating, comment }),
    });
    const data = await readBody(res);
    return { success: !!data.success, message: data.message || (data.success ? 'Đã gửi đánh giá.' : 'Gửi đánh giá thất bại.'), summary: data.summary };
  } catch {
    return { success: false, message: 'Lỗi mạng khi gửi đánh giá.' };
  }
}

// Định dạng sao trung bình: giữ một chữ số thập phân, không làm tròn lên
// thành số nguyên để khỏi biến 4,2 sao thành 5 sao.
export function formatRatingAverage(value: number | null): string {
  if (value === null) return 'Chưa có đánh giá';
  return `${value.toFixed(1)} sao`;
}

export function formatSuccessRate(value: number | null): string {
  if (value === null) return 'Chưa có đơn đã kết thúc';
  return `${Math.round(value * 100)}% đơn thành công`;
}
