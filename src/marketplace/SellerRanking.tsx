// Khối 5 — Bảng xếp hạng gian hàng theo đánh giá và tỷ lệ thành công.
//
// Cách nối (dành cho điều phối viên, file này chưa được import từ App.tsx):
// - Trang sàn / trang khám phá gian hàng: <SellerRanking />
// - Toàn bộ chữ là tiếng Việt. Mọi con số đều lấy từ API /sellers/ranking:
//   sao trung bình tính từ rating_sum / rating_count thật, tỷ lệ thành công
//   tính từ đơn COMPLETED / đơn đã kết thúc thật, lượt bán lấy nguyên từ
//   sellers.total_sold. Không có số nào được cộng thêm hay làm đẹp.
// - Công thức xếp hạng (ghi rõ để người mua hiểu vì sao gian hàng này trên
//   gian hàng kia): điểm xếp hạng = 0,6 × (sao trung bình / 5) + 0,4 × tỷ lệ
//   thành công khi có đủ cả hai; chỉ có một thì lấy đúng thành phần đó;
//   gian hàng chưa có sao lẫn đơn đã kết thúc thì xếp cuối, không bịa điểm.
//   Đơn đang giữ tiền (PENDING) chưa tính vào tỷ lệ thành công. Khiếu nại đã
//   hoàn tiền đã trừ qua đơn hủy; khiếu nại đang mở chỉ hiển thị và xếp sau
//   khi hòa điểm, không trừ điểm trực tiếp vì chưa có kết luận.

import React, { useEffect, useState } from 'react';
import { formatRatingAverage, formatSuccessRate, getSellerRanking, type SellerRankingRow } from './reviewsService';

export function SellerRanking({ limit = 50 }: { limit?: number }) {
  const [sellers, setSellers] = useState<SellerRankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getSellerRanking(limit).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setError(res.message || 'Không tải được bảng xếp hạng.');
        return;
      }
      setSellers(res.sellers);
    });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (loading) return <p className="text-sm text-gray-500">Đang tải bảng xếp hạng…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (sellers.length === 0) return <p className="text-sm text-gray-600">Chưa có gian hàng nào được duyệt.</p>;

  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="text-lg font-semibold">Xếp hạng gian hàng</h2>
      <p className="mt-1 text-sm text-gray-600">
        Xếp theo sao trung bình và tỷ lệ đơn thành công từ giao dịch thật. Lượt bán hiển thị là số thật từ hệ thống, không cộng thêm.
      </p>
      <ol className="mt-3 space-y-3">
        {sellers.map((seller) => (
          <li key={seller.seller_id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">#{seller.rank}</span>
              <strong>{seller.shop_name}</strong>
              {seller.trust_badge && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Gian hàng uy tín</span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-700">
              {formatRatingAverage(seller.rating_average)} ({seller.rating_count} lượt đánh giá) · {formatSuccessRate(seller.success_rate)} (
              {seller.completed_orders}/{seller.finished_orders} đơn đã kết thúc) · {seller.total_sold} lượt bán
            </p>
            <p className="text-sm text-gray-600">
              Khiếu nại: {seller.disputes_open} đang mở / {seller.disputes_total} tổng số. Huy hiệu uy tín chỉ hiện khi gian hàng đạt từ 4,5 sao, từ 90% đơn
              thành công và từ 10 đơn đã kết thúc.
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default SellerRanking;
