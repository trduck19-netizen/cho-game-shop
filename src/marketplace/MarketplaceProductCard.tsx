import React from 'react';
import { ShoppingBag, Store } from 'lucide-react';
import type { MarketplaceProduct } from './types';
import { availableCodeCount, discountPercent, formatCore } from './filterProducts';

// Thẻ sản phẩm sàn. Chỉ dùng dữ liệu thật từ API: giá, giá gốc, số mã còn
// lại, số đã bán, tên gian hàng. Không dùng ảnh/logo nào nếu không có ảnh
// chính thức: thẻ không vẽ logo game, chỉ vẽ tên game dạng chữ, để không
// vi phạm quy tắc logo chính xác của web.
export const MarketplaceProductCard: React.FC<{
  product: MarketplaceProduct;
  onOpen: (product: MarketplaceProduct) => void;
  onOpenShop?: (sellerId: string) => void;
}> = ({ product, onOpen, onOpenShop }) => {
  const stock = availableCodeCount(product);
  const discount = discountPercent(product);
  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <button type="button" onClick={() => onOpen(product)} className="text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {product.game_name || 'Mã game'}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] font-semibold text-gray-900">
          {product.title}
        </h3>
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold text-amber-700">{formatCore(product.current_price)}</span>
        {discount > 0 && (
          <>
            <span className="text-gray-400 line-through">{formatCore(product.original_price)}</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              −{discount}%
            </span>
          </>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {stock > 0 ? (
          <>
            Còn <strong>{stock}</strong> mã · Đã bán {product.sold_count}
          </>
        ) : (
          <span className="font-medium text-red-600">Hết hàng</span>
        )}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => onOpenShop?.(product.seller_id)}
          className="inline-flex min-w-0 items-center gap-1 truncate text-sm text-gray-600"
        >
          <Store size={16} className="shrink-0" />
          <span className="truncate">{product.shop_name || 'Gian hàng sàn'}</span>
        </button>
        <button
          type="button"
          disabled={stock <= 0}
          onClick={() => onOpen(product)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <ShoppingBag size={16} />
          {stock > 0 ? 'Mua ngay' : 'Hết hàng'}
        </button>
      </div>
    </article>
  );
};
