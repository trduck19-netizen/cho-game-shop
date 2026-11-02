import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Search, Star } from 'lucide-react';
import type { MarketplaceProduct, SellerShop } from './types';
import { listMarketplaceProducts } from './marketplaceApi';
import { matchesSearch, sellerRating } from './filterProducts';
import { MarketplaceProductCard } from './MarketplaceProductCard';
import { sellerTrialStatus } from './filterProducts';
import {
  SELLER_TRIAL_MAX_CODES_PER_PRODUCT,
  SELLER_TRIAL_MAX_PRODUCTS,
  SELLER_TRIAL_UPGRADE_MAX_DISPUTE_RATE,
  SELLER_TRIAL_UPGRADE_MIN_COMPLETED_ORDERS,
} from './marketplaceSettings';

// Trang gian hàng: học từ cách làm chung của các sàn — gian hàng phải cho
// người mua thấy ngay uy tín (điểm đánh giá + số lượt đánh giá + số đã bán)
// và toàn bộ hàng đang bán của gian hàng đó, kèm tìm kiếm trong gian hàng.
// Ảnh đại diện: chỉ dùng avatar_url thật của gian hàng; nếu ảnh lỗi thì
// hiện chữ cái đầu trên nền gradient, KHÔNG dùng ảnh mặc định chung nào.
// Điểm khác đi cho sàn mã số: điểm đánh giá ở đây là điểm của GIAN HÀNG
// (từ rating_sum/rating_count của sellers), chưa phải điểm từng sản phẩm,
// vì API chưa có đường lấy đánh giá theo sản phẩm — giao diện ghi rõ điều
// đó, không tự gắn điểm gian hàng thành điểm sản phẩm.
export const SellerShopView: React.FC<{
  shop: SellerShop;
  onOpenProduct: (product: MarketplaceProduct) => void;
  onOpenShop?: (sellerId: string) => void;
}> = ({ shop, onOpenProduct, onOpenShop }) => {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    listMarketplaceProducts({ seller_id: shop.id, limit: 50 })
      .then((rows) => {
        if (!cancelled) setProducts(rows);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'Không tải được sản phẩm của gian hàng.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shop.id]);

  const visible = useMemo(
    () => products.filter((p) => matchesSearch(p, query)),
    [products, query],
  );
  const rating = sellerRating(shop);
  const trial = sellerTrialStatus({
    productCount: products.length,
    codesInFullestProduct: Math.max(0, ...products.map((p) => Number(p.stock_quantity) || 0)),
    completedOrders: shop.total_sold,
    disputeCount: 0,
  });
  // Lưu ý: disputeCount chưa có trong API gian hàng nên truyền 0; nhãn mức
  // thử vì vậy chỉ dựa trên số đã bán, và sẽ chính xác hơn khi API trả thêm
  // số khiếu nại. Xem README.md.

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center">
        {shop.avatar_url && !avatarBroken ? (
          <img
            src={shop.avatar_url}
            alt={`Ảnh đại diện gian hàng ${shop.shop_name}`}
            className="h-20 w-20 rounded-full object-cover"
            onError={() => setAvatarBroken(true)}
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-3xl font-bold text-white">
            {(shop.shop_name || '?').trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-gray-900">
            {shop.shop_name}
            {shop.status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                <BadgeCheck size={14} /> Gian hàng đã duyệt
              </span>
            )}
          </h1>
          {shop.description && <p className="mt-1 text-sm text-gray-600">{shop.description}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
            {rating !== null ? (
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                {rating.toFixed(1)} · {shop.rating_count} lượt đánh giá gian hàng
              </span>
            ) : (
              <span>Chưa có đánh giá gian hàng</span>
            )}
            <span>Đã bán {shop.total_sold}</span>
            {trial.enabled && trial.isTrial && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
                Gian hàng mới (mức thử)
              </span>
            )}
          </p>
          {trial.enabled && trial.isTrial && (
            <p className="mt-1 text-xs text-gray-500">
              Gian hàng mới đang ở mức thử: tối đa {SELLER_TRIAL_MAX_PRODUCTS} sản phẩm, mỗi sản
              phẩm tối đa {SELLER_TRIAL_MAX_CODES_PER_PRODUCT} mã; lên hạng chuẩn khi đạt{' '}
              {SELLER_TRIAL_UPGRADE_MIN_COMPLETED_ORDERS} đơn thành công và tỷ lệ khiếu nại dưới
              {Math.round(SELLER_TRIAL_UPGRADE_MAX_DISPUTE_RATE * 100)}%. Giới hạn này
              chỉ để hiển thị — việc áp dụng thuộc về API khi có đủ số liệu.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Search size={18} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trong gian hàng này"
            className="w-full outline-none"
          />
        </label>
      </div>

      {isLoading && <p className="mt-6 text-gray-600">Đang tải sản phẩm của gian hàng…</p>}
      {error && !isLoading && <p className="mt-6 text-red-700">{error}</p>}
      {!isLoading && !error && visible.length === 0 && (
        <p className="mt-6 text-gray-600">
          Gian hàng này chưa có sản phẩm đang bán khớp với tìm kiếm.
        </p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <MarketplaceProductCard
            key={p.id}
            product={p}
            onOpen={onOpenProduct}
            onOpenShop={onOpenShop}
          />
        ))}
      </div>
    </section>
  );
};
