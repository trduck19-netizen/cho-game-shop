// Khối 5 — Giao diện đánh giá gian hàng và form đánh giá sau mua.
//
// Cách nối (dành cho điều phối viên, file này chưa được import từ App.tsx):
// - Trang gian hàng: <SellerReviews sellerId={seller.id} />
// - Trang đơn hàng của người mua, sau khi đơn COMPLETED:
//     <ReviewForm orderId={order.id} />
//   Form tự kiểm tra quyền qua API /eligible rồi mới hiện; đơn chưa hoàn tất,
//   đơn không phải của người này, hoặc đơn đã đánh giá rồi đều chỉ hiện câu
//   giải thích, không hiện form. Mỗi đơn chỉ đánh giá một lần, không sửa lại.
// - Toàn bộ chữ trong file là tiếng Việt. Mọi con số đều lấy từ API, không
//   cộng thêm, không điền mặc định: chưa có đánh giá thì hiện rõ là chưa có.

import React, { useEffect, useState } from 'react';
import {
  checkReviewEligibility,
  formatRatingAverage,
  getSellerReviews,
  submitReview,
  toggleHelpfulVote,
  type ReviewDistribution,
  type ReviewSort,
  type SellerReview,
  type SellerSummary,
} from './reviewsService';

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span aria-label={`${rating} sao`} className="text-amber-500 tracking-wide">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= full ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value.replace(' ', 'T')).toLocaleDateString('vi-VN');
  } catch {
    return value;
  }
}

export function SellerReviews({ sellerId }: { sellerId: string }) {
  const [summary, setSummary] = useState<SellerSummary | null>(null);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [total, setTotal] = useState(0);
  const [distribution, setDistribution] = useState<ReviewDistribution | null>(null);
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [votingId, setVotingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSellerReviews(sellerId, 20, 0, sort).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setError(res.message || 'Không tải được đánh giá.');
        return;
      }
      setError('');
      setSummary(res.summary || null);
      setReviews(res.reviews);
      setTotal(res.total || 0);
      setDistribution(res.distribution || null);
    });
    return () => {
      cancelled = true;
    };
  }, [sellerId, sort]);

  async function onHelpful(review: SellerReview) {
    setVotingId(review.id);
    setNotice('');
    const res = await toggleHelpfulVote(review.id);
    setVotingId('');
    if (!res.success) {
      setNotice(res.message);
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, helpful_count: res.helpful_count ?? r.helpful_count } : r)));
  }

  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="text-lg font-semibold">Đánh giá gian hàng</h2>
      {summary && (
        <p className="mt-1 text-sm text-gray-600">
          {summary.shop_name} · {formatRatingAverage(summary.rating_average)} ({summary.rating_count} lượt đánh giá) ·{' '}
          {summary.total_sold} lượt bán
        </p>
      )}
      {distribution && total > 0 && (
        <div className="mt-3 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[String(star) as keyof ReviewDistribution] || 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-8">{star} sao</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-gray-200">
                  <span className="block h-full bg-amber-500" style={{ width: `${percent}%` }} />
                </span>
                <span className="w-16 text-right text-gray-600">
                  {count} ({percent}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <label htmlFor="review-sort">Sắp xếp:</label>
        <select
          id="review-sort"
          className="rounded border px-2 py-1"
          value={sort}
          onChange={(e) => setSort(e.target.value as ReviewSort)}
        >
          <option value="newest">Mới nhất</option>
          <option value="helpful">Hữu ích nhất</option>
          <option value="highest">Sao cao nhất</option>
          <option value="lowest">Sao thấp nhất</option>
        </select>
      </div>
      {loading && <p className="mt-3 text-sm text-gray-500">Đang tải đánh giá…</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-amber-700">{notice}</p>}
      {!loading && !error && reviews.length === 0 && (
        <p className="mt-3 text-sm text-gray-600">Gian hàng chưa có đánh giá nào. Đánh giá chỉ xuất hiện sau khi có đơn mua thành công.</p>
      )}
      <ul className="mt-3 space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{review.buyer_name}</strong>
              {review.verified_purchase && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Đã mua hàng</span>
              )}
              <Stars rating={review.rating} />
              <span className="text-gray-500">{formatDate(review.created_at)}</span>
            </div>
            {review.product_title && <p className="mt-1 text-sm text-gray-600">Sản phẩm: {review.product_title}</p>}
            <p className="mt-1 text-sm">{review.comment || 'Không để lại nhận xét.'}</p>
            <button
              type="button"
              className="mt-2 rounded border px-2 py-1 text-sm disabled:opacity-50"
              disabled={votingId === review.id}
              onClick={() => onHelpful(review)}
            >
              Hữu ích ({review.helpful_count})
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReviewForm({ orderId, onSubmitted }: { orderId: string; onSubmitted?: () => void }) {
  const [checking, setChecking] = useState(true);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkReviewEligibility(orderId).then((res) => {
      if (cancelled) return;
      setChecking(false);
      if (!res.success || !res.eligibility) {
        setBlockedMessage(res.message || 'Không kiểm tra được quyền đánh giá.');
        return;
      }
      const eligibility = res.eligibility;
      if (eligibility.eligible === false) {
        setBlockedMessage(eligibility.message);
        return;
      }
      setProductTitle(eligibility.product_title);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    const res = await submitReview(orderId, rating, comment.trim());
    setSubmitting(false);
    setMessage(res.message);
    if (res.success) {
      setDone(true);
      onSubmitted?.();
    }
  }

  if (checking) return <p className="text-sm text-gray-500">Đang kiểm tra đơn hàng…</p>;
  if (blockedMessage) return <p className="text-sm text-gray-600">{blockedMessage}</p>;
  if (done) return <p className="text-sm text-emerald-700">{message || 'Cảm ơn bạn đã đánh giá gian hàng.'}</p>;

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-white p-4">
      <h3 className="font-semibold">Đánh giá đơn hàng{productTitle ? ` — ${productTitle}` : ''}</h3>
      <p className="mt-1 text-sm text-gray-600">
        Chỉ đơn mua thành công mới đánh giá được. Mỗi đơn chỉ đánh giá một lần và không sửa lại, nên bạn hãy chọn sao đúng với trải nghiệm thực tế.
      </p>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} sao`}
            aria-pressed={rating === n}
            onClick={() => setRating(n)}
            className={`text-3xl ${n <= rating ? 'text-amber-500' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 self-center text-sm">{rating} sao</span>
      </div>
      <label className="mt-3 block text-sm" htmlFor="review-comment">
        Nhận xét (không bắt buộc, tối đa 1000 ký tự)
      </label>
      <textarea
        id="review-comment"
        className="mt-1 w-full rounded border p-2 text-sm"
        rows={4}
        maxLength={1000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Mã có dùng được không? Người bán giao hàng có đúng hẹn không?"
      />
      <button type="submit" disabled={submitting} className="mt-3 rounded bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">
        {submitting ? 'Đang gửi…' : 'Gửi đánh giá'}
      </button>
      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </form>
  );
}

export default SellerReviews;
