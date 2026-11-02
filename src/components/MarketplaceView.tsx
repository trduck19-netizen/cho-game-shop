import React, { useState } from 'react';
import type { UserProfile } from '../types/game';
import {
  BuyerOrdersView,
  MarketplaceCatalogView,
  MarketplaceProductDetail,
  MarketplaceTermsPage,
  SellerShopView,
} from '../marketplace';
import type { BuyerOrder, MarketplaceProduct, SellerShop } from '../marketplace';

// Vỏ bọc duy nhất nối giao diện sàn (đã có sẵn ở src/marketplace) vào App.
// Chỉ nối phía người mua + điều khoản công khai. Phía người bán (đăng ký,
// nạp mã) và phía quản trị (hàng chờ, rút tiền, khiếu nại) chưa nối vào
// đây — chúng thuộc AdminApp / đường API riêng, không nhét vào trang khách.
// Giới hạn thật: mục "Đơn của tôi" chỉ hiện đơn vừa tạo xong trong phiên
// này, vì BuyerOrdersView nhận đơn qua props (xem README khối 1); đường
// GET danh sách đơn của người mua cần ánh xạ sang dạng BuyerOrder trước
// khi nối, chưa làm ở bước này để khỏi vẽ đơn sai dạng.
type MarketplaceSubView = 'catalog' | 'product' | 'shop' | 'orders' | 'terms';

export const MarketplaceView: React.FC<{
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}> = ({ currentUser, onOpenAuth }) => {
  const [subView, setSubView] = useState<MarketplaceSubView>('catalog');
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [shop, setShop] = useState<SellerShop | null>(null);
  const [shopError, setShopError] = useState('');
  const [buyerOrders, setBuyerOrders] = useState<BuyerOrder[]>([]);

  const openProduct = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setSubView('product');
  };

  const openShop = async (sellerId: string) => {
    setShopError('');
    try {
      const res = await fetch(`/api/marketplace/sellers/public?seller_id=${encodeURIComponent(sellerId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.seller) {
        throw new Error(data?.message || 'Không tìm thấy gian hàng đã duyệt.');
      }
      const s = data.seller;
      setShop({
        id: s.id,
        member_id: '',
        shop_name: s.shop_name,
        shop_slug: s.shop_slug,
        description: s.description || '',
        avatar_url: s.avatar_url || '',
        status: s.status,
        available_balance: 0,
        held_balance: 0,
        total_sold: Number(s.total_sold) || 0,
        rating_sum: Number(s.rating_sum) || 0,
        rating_count: Number(s.rating_count) || 0,
        created_at: s.created_at,
      });
      setSubView('shop');
    } catch (err: any) {
      setShopError(err?.message || 'Không mở được gian hàng.');
    }
  };

  const navButton = (view: MarketplaceSubView, label: string) => (
    <button
      type="button"
      onClick={() => setSubView(view)}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        subView === view ? 'bg-amber-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-6 flex flex-wrap items-center gap-2">
        {navButton('catalog', 'Danh sách sàn')}
        {navButton('orders', 'Đơn của tôi')}
        {navButton('terms', 'Điều khoản sàn')}
        {(subView === 'product' || subView === 'shop') && (
          <button
            type="button"
            onClick={() => setSubView('catalog')}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-200"
          >
            ← Về danh sách sàn
          </button>
        )}
      </div>
      {shopError && (
        <p className="mx-auto max-w-6xl px-4 pt-2 text-sm text-red-600">{shopError}</p>
      )}
      {subView === 'catalog' && (
        <MarketplaceCatalogView onOpenProduct={openProduct} onOpenShop={openShop} />
      )}
      {subView === 'product' && selectedProduct && (
        <MarketplaceProductDetail
          product={selectedProduct}
          isLoggedIn={!!currentUser}
          onOpenAuth={onOpenAuth}
          onOpenShop={openShop}
          onOrderCreated={(order) => setBuyerOrders((prev) => [order, ...prev])}
        />
      )}
      {subView === 'shop' && shop && (
        <SellerShopView shop={shop} onOpenProduct={openProduct} onOpenShop={openShop} />
      )}
      {subView === 'orders' && (
        <BuyerOrdersView
          orders={buyerOrders}
          isLoggedIn={!!currentUser}
          onOpenAuth={onOpenAuth}
          onOrdersChanged={setBuyerOrders}
        />
      )}
      {subView === 'terms' && <MarketplaceTermsPage />}
    </div>
  );
};
