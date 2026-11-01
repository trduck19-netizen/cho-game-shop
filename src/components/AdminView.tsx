import React, { useState } from 'react';
import {
  ShieldAlert,
  Gamepad2,
  Gift,
  ShoppingBag,
  PlusCircle,
  Trash2,
  Server,
  Activity,
  Sparkles,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import type { GiveawayCampaign, StoreProduct } from '../types/game';
import { formatCurrencyVND } from '../utils/textUtils';

interface AdminViewProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onSelectGame?: (game: any) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'giveaways' | 'store'>('overview');
  const [giveaways, setGiveaways] = useState<GiveawayCampaign[]>(() => dataService.getGiveaways());
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>(() => dataService.getStoreProducts());

  // New Giveaway Form State
  const [newGaTitle, setNewGaTitle] = useState('');
  const [newGaGame, setNewGaGame] = useState('3Q Đào Đào Đào');
  const [newGaSlug, setNewGaSlug] = useState('3q-dao-dao-dao');
  const [newGaTotal, setNewGaTotal] = useState(0);
  const [newGaRewards, setNewGaRewards] = useState('10.000 KNB + Rương Trang Bị Cam');

  // New Store Product Form State
  const [newSpTitle, setNewSpTitle] = useState('');
  const [newSpGame, setNewSpGame] = useState('Honkai: Star Rail');
  const [newSpSlug] = useState('honkai-star-rail');
  const [newSpPrice, setNewSpPrice] = useState(250000);
  const [newSpDiscount, setNewSpDiscount] = useState(20);
  const [newSpStock, setNewSpStock] = useState(50);
  const [newSpDesc, setNewSpDesc] = useState('Gói quà tặng nạp thẻ ingame ưu đãi');

  const handleCreateGiveaway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGaTitle.trim()) return;

    const newCampaign: GiveawayCampaign = {
      id: `ga_${Date.now()}`,
      game_name: newGaGame,
      game_slug: newGaSlug,
      title: newGaTitle.trim(),
      description: 'Chiến dịch phát code quà tặng độc quyền được tạo từ trang quản trị.',
      rewards: newGaRewards,
      total_codes: Number(newGaTotal),
      claimed_codes: 0,
      start_time: new Date().toISOString(),
      end_time: '2026-12-31T23:59:59Z',
      is_active: true,
      game_icon_url: `/game_icons/${newGaSlug}.webp`,
    };

    const updated = [newCampaign, ...giveaways];
    setGiveaways(updated);
    localStorage.setItem('wcg_admin_giveaways_v4', JSON.stringify(updated));
    localStorage.setItem('wcg_giveaways', JSON.stringify(updated));
    dataService.pushToCloudflareKV('wcg_admin_giveaways_v4', updated);
    onShowToast('Thêm chiến dịch Giveaway thành công!', newCampaign.title, 'success');
    setNewGaTitle('');
  };

  const handleDeleteGiveaway = (id: string, title: string) => {
    const updated = giveaways.filter((g) => g.id !== id);
    setGiveaways(updated);
    localStorage.setItem('wcg_admin_giveaways_v4', JSON.stringify(updated));
    localStorage.setItem('wcg_giveaways', JSON.stringify(updated));
    dataService.pushToCloudflareKV('wcg_admin_giveaways_v4', updated);
    onShowToast('Đã xóa chiến dịch', `Đã xóa chiến dịch "${title}" thành công.`, 'info');
  };

  const handleCreateStoreProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpTitle.trim()) return;

    const currentPrice = Math.round(newSpPrice * (1 - newSpDiscount / 100));

    const newProduct: StoreProduct = {
      id: `sp_${Date.now()}`,
      title: newSpTitle.trim(),
      game_name: newSpGame,
      game_slug: newSpSlug,
      game_icon_url: `/game_icons/${newSpSlug}.webp`,
      cover_image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      description: newSpDesc,
      original_price: Number(newSpPrice),
      discount_percent: Number(newSpDiscount),
      current_price: currentPrice,
      stock_quantity: Number(newSpStock),
      is_active: true,
      package_type: 'pack',
    };

    const updated = [newProduct, ...storeProducts];
    setStoreProducts(updated);
    localStorage.setItem('wcg_admin_store_products_v4', JSON.stringify(updated));
    localStorage.setItem('wcg_store_products', JSON.stringify(updated));
    dataService.pushToCloudflareKV('wcg_admin_store_products_v4', updated);
    onShowToast('Thêm sản phẩm thành công!', newProduct.title, 'success');
    setNewSpTitle('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-fade-in">
      {/* Admin Top Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 text-accent flex items-center justify-center shadow-glow-accent">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl text-foreground">
                Bảng Điều Khiển Quản Trị
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-accent text-white">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quản lý toàn diện hệ thống CodeGame.Shop trên nền tảng Cloudflare Edge & KV
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border">
          {[
            { id: 'overview', label: 'Tổng quan', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'giveaways', label: 'Quản lý Giveaway', icon: <Gift className="w-3.5 h-3.5" /> },
            { id: 'store', label: 'Quản lý Gói Code', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Tổng Số Tựa Game</span>
                <Gamepad2 className="w-4 h-4 text-primary" />
              </div>
              <div className="font-display font-bold text-3xl text-foreground">343</div>
              <span className="text-[11px] text-emerald-400 font-mono">100% CH Play Quốc Tế</span>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Tổng Số Giftcode</span>
                <Gift className="w-4 h-4 text-accent" />
              </div>
              <div className="font-display font-bold text-3xl text-foreground">4,408</div>
              <span className="text-[11px] text-primary-light font-mono">3,177 mã đang hoạt động</span>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Chiến Dịch Giveaway</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-display font-bold text-3xl text-foreground">{giveaways.length}</div>
              <span className="text-[11px] text-amber-400 font-mono">Đang phát tự động</span>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Gói Code Bán</span>
                <ShoppingBag className="w-4 h-4 text-secondary" />
              </div>
              <div className="font-display font-bold text-3xl text-foreground">{storeProducts.length}</div>
              <span className="text-[11px] text-secondary font-mono">Chiết khấu từ 15-60%</span>
            </div>
          </div>

          {/* Cloudflare Edge Status */}
          <div className="p-6 rounded-3xl bg-muted/40 border border-border space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Trạng Thái Hạ Tầng Cloudflare</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                <span className="text-muted-foreground block">Cloudflare Pages:</span>
                <strong className="text-emerald-400 block text-sm">web-code-game.pages.dev</strong>
                <span className="text-[10px] text-muted-foreground">Edge CDN Cache: 0ms Active</span>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                <span className="text-muted-foreground block">KV Storage:</span>
                <strong className="text-primary-light block text-sm">web-code-game-kv</strong>
                <span className="text-[10px] text-muted-foreground">ID: 09226ab144a34523bb2d43f182d576b8</span>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                <span className="text-muted-foreground block">Tài Khoản Liên Kết:</span>
                <strong className="text-secondary block text-sm">Synqpe@gmail.com</strong>
                <span className="text-[10px] text-muted-foreground">ID: 9e6387498b4b3426ea4bd7656ff5142d</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Giveaways Management */}
      {activeTab === 'giveaways' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="bg-card p-6 rounded-3xl border border-border space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-accent" />
              <span>Thêm Chiến Dịch Giveaway Mới</span>
            </h3>

            <form onSubmit={handleCreateGiveaway} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Tên Chiến Dịch *</label>
                <input
                  type="text"
                  value={newGaTitle}
                  onChange={(e) => setNewGaTitle(e.target.value)}
                  placeholder="Ví dụ: Phát 500 Giftcode Tân Thủ"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Tên Tựa Game *</label>
                <input
                  type="text"
                  value={newGaGame}
                  onChange={(e) => setNewGaGame(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Game Slug (Icon)</label>
                <input
                  type="text"
                  value={newGaSlug}
                  onChange={(e) => setNewGaSlug(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Số Lượng Mã *</label>
                <input
                  type="number"
                  value={newGaTotal}
                  onChange={(e) => setNewGaTotal(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Chi Tiết Phần Thưởng *</label>
                <textarea
                  rows={2}
                  value={newGaRewards}
                  onChange={(e) => setNewGaRewards(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Lưu Chiến Dịch
              </button>
            </form>
          </div>

          {/* List of active giveaways */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground">
              Danh Sách Chiến Dịch ({giveaways.length})
            </h3>

            <div className="space-y-3">
              {giveaways.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                      <img src={item.game_icon_url || `/game_icons/${item.game_slug}.webp`} alt={item.game_name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground truncate">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.game_name} • {item.claimed_codes}/{item.total_codes} mã</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold shrink-0">
                      Đang chạy
                    </span>
                    <button
                      onClick={() => handleDeleteGiveaway(item.id, item.title)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                      title="Xóa chiến dịch này"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Store Products Management */}
      {activeTab === 'store' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="bg-card p-6 rounded-3xl border border-border space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-secondary" />
              <span>Thêm Gói Code Bán Mới</span>
            </h3>

            <form onSubmit={handleCreateStoreProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Tên Gói Code *</label>
                <input
                  type="text"
                  value={newSpTitle}
                  onChange={(e) => setNewSpTitle(e.target.value)}
                  placeholder="Ví dụ: Gói Tân Thủ Siêu Cấp"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:ring-2 focus:ring-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Tên Tựa Game *</label>
                <input
                  type="text"
                  value={newSpGame}
                  onChange={(e) => setNewSpGame(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:ring-2 focus:ring-secondary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Giá Gốc (VND) *</label>
                  <input
                    type="number"
                    value={newSpPrice}
                    onChange={(e) => setNewSpPrice(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Chiết Khấu (%) *</label>
                  <input
                    type="number"
                    value={newSpDiscount}
                    onChange={(e) => setNewSpDiscount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Số Lượng Kho *</label>
                <input
                  type="number"
                  value={newSpStock}
                  onChange={(e) => setNewSpStock(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-mono focus:ring-2 focus:ring-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Mô Tả Gói *</label>
                <textarea
                  rows={2}
                  value={newSpDesc}
                  onChange={(e) => setNewSpDesc(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:ring-2 focus:ring-secondary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Thêm Gói Vào Cửa Hàng
              </button>
            </form>
          </div>

          {/* List of Store products */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-heading font-bold text-base text-foreground">
              Gói Code Đang Mở Bán ({storeProducts.length})
            </h3>

            <div className="space-y-3">
              {storeProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                      <img src={p.game_icon_url || `/game_icons/${p.game_slug}.webp`} alt={p.game_name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground truncate">{p.title}</h4>
                      <p className="text-xs text-muted-foreground">{p.game_name} • Kho: {p.stock_quantity} mã</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-display font-bold text-sm text-emerald-400 block">{formatCurrencyVND(p.current_price)}</span>
                    <span className="text-[10px] text-muted-foreground line-through font-mono">{formatCurrencyVND(p.original_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
