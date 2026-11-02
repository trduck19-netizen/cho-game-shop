import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Store } from 'lucide-react';
import type { MarketplaceProduct } from './types';
import { availableCodeCount, discountPercent, formatCore } from './filterProducts';
import {
  buyerOrderFromCreateResult,
  createMarketplaceOrder,
} from './marketplaceApi';
import { DeliveredCodesBox } from './DeliveredCodesBox';

// Trang chi tiết sản phẩm sàn + ô mua.
// Quy tắc mua được giữ đúng API: người mua không được tự mua hàng của
// chính mình (máy chủ chặn, giao diện chỉ nhắc trước); mỗi lần mua phải có
// Idempotency-Key để bấm mua hai lần không thành hai đơn; số lượng tối đa
// bằng số mã còn lại. Hướng dẫn nhập mã hiển thị đúng nội dung người bán
// đã ghi (instructions), không tự viết thêm hướng dẫn nào.
export const MarketplaceProductDetail: React.FC<{
  product: MarketplaceProduct;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onOpenShop?: (sellerId: string) => void;
  onOrderCreated?: (order: ReturnType<typeof buyerOrderFromCreateResult>) => void;
}> = ({ product, isLoggedIn, onOpenAuth, onOpenShop, onOrderCreated }) => {
  const stock = availableCodeCount(product);
  const discount = discountPercent(product);
  const [quantity, setQuantity] = useState(1);
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [buyResult, setBuyResult] = useState<{
    orderId: string;
    deliveredCodes: string[];
    isIdempotentReplay?: boolean;
  } | null>(null);

  const total = (Number(product.current_price) || 0) * quantity;

  const buy = async () => {
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    setIsBuying(true);
    setBuyError('');
    try {
      const result = await createMarketplaceOrder({ product_id: product.id, quantity });
      setBuyResult(result);
      onOrderCreated?.(
        buyerOrderFromCreateResult({
          orderId: result.orderId,
          product,
          quantity,
          deliveredCodes: result.deliveredCodes,
        }),
      );
    } catch (err: any) {
      setBuyError(err?.message || 'Tạo đơn thất bại.');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
        {product.game_name || 'Mã game'}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-2xl font-bold text-amber-700">{formatCore(product.current_price)}</span>
        {discount > 0 && (
          <>
            <span className="text-gray-400 line-through">{formatCore(product.original_price)}</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-sm font-bold text-red-700">
              Giảm {discount}%
            </span>
          </>
        )}
        <span className="text-sm text-gray-600">
          {stock > 0 ? `Còn ${stock} mã · Đã bán ${product.sold_count}` : 'Hết hàng'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpenShop?.(product.seller_id)}
        className="mt-3 inline-flex items-center gap-1 text-sm text-gray-700 underline"
      >
        <Store size={16} /> {product.shop_name || 'Xem gian hàng'}
      </button>

      {product.instructions && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900">Hướng dẫn người bán ghi kèm</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{product.instructions}</p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">Mua mã</h2>
        {buyResult ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-emerald-700">
              {buyResult.isIdempotentReplay
                ? 'Đơn này đã được tạo trước đó (chống trùng đơn), mã dưới đây là mã của đơn cũ.'
                : `Đã tạo đơn ${buyResult.orderId}. Mã đã giao ngay, tiền đang giữ chờ bạn xác nhận.`}
            </p>
            <DeliveredCodesBox codes={buyResult.deliveredCodes} />
            <p className="text-sm text-gray-600">
              Sau khi nhập mã và thấy mã dùng được, hãy vào trang đơn hàng của bạn để bấm xác nhận.
              Nếu mã lỗi, mở khiếu nại khi tiền còn giữ — đừng bấm xác nhận trước.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm text-gray-700" htmlFor="mp-quantity">
                Số lượng
              </label>
              <input
                id="mp-quantity"
                type="number"
                min={1}
                max={Math.max(1, stock)}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(1, Math.min(Math.max(1, stock), Math.floor(Number(e.target.value) || 1))),
                  )
                }
                className="w-20 rounded-lg border border-gray-200 px-2 py-1.5"
              />
              <span className="text-sm text-gray-600">
                Tổng: <strong>{formatCore(total)}</strong> (trả bằng số dư ví)
              </span>
            </div>
            {buyError && (
              <p className="mt-2 flex items-center gap-1 text-sm text-red-700">
                <AlertTriangle size={16} /> {buyError}
              </p>
            )}
            <button
              type="button"
              disabled={stock <= 0 || isBuying}
              onClick={buy}
              className="mt-3 rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isBuying ? 'Đang tạo đơn…' : isLoggedIn ? 'Mua và nhận mã ngay' : 'Đăng nhập để mua'}
            </button>
            <p className="mt-2 flex items-start gap-1 text-sm text-gray-600">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              Tiền không chuyển thẳng cho người bán: tiền vào giữ, bạn xác nhận mã dùng được thì
              tiền mới được trả, hoặc tự động trả sau thời gian giữ nếu không có khiếu nại.
            </p>
            <p className="text-xs text-gray-500">
              Bạn không thể mua sản phẩm của chính gian hàng mình — máy chủ sẽ từ chối đơn đó.
            </p>
          </>
        )}
      </div>
    </section>
  );
};
