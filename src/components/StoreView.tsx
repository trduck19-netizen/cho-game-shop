import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  Search,
  LogIn,
  ChevronRight,
  Share2,
  LayoutGrid,
  List,
  Package,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { marketingService } from '../services/marketingService';
import { formatCore, smartVietnameseMatch } from '../utils/textUtils';
import { getProductPackages, getProductMinPrice, groupStoreProductsByGame } from '../utils/productPackageUtils';
import type { StoreProduct, UserProfile } from '../types/game';
import { EventCountdownBadge } from './countdown/EventCountdownBadge';
import { eventSchedulerService } from '../services/eventSchedulerService';
import { templateService } from '../services/templateService';

interface StoreViewProps {
  onSelectProduct: (product: StoreProduct) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenShare?: (product: StoreProduct) => void;
}

const STORE_VIEW_MODE_STORAGE_KEY = 'wcg_store_view_mode';

export const StoreView: React.FC<StoreViewProps> = ({
  onSelectProduct,
  onShowToast,
  currentUser,
  onOpenAuth,
  onOpenShare,
}) => {
  const [products, setProducts] = useState<StoreProduct[]>(() => dataService.getStoreProducts().map((p) => templateService.resolveStoreProduct(p)));
  const [categoriesList, setCategoriesList] = useState(() => dataService.getStoreCategories());
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [cmsIntro, setCmsIntro] = useState(() => dataService.getContentByKey('store_section'));
  const [isGlobalSoldEnabled, setIsGlobalSoldEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wcg_store_global_show_sold') !== 'false' && localStorage.getItem('wcg_admin_show_sold_store') !== 'false';
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORE_VIEW_MODE_STORAGE_KEY) as 'grid' | 'list';
      if (saved === 'grid' || saved === 'list') return saved;
    }
    return 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORE_VIEW_MODE_STORAGE_KEY, mode);
    } catch {}
  };

  useEffect(() => {
    const handleUpdate = () => {
      setProducts(dataService.getStoreProducts().map((p) => templateService.resolveStoreProduct(p)));
      setCmsIntro(dataService.getContentByKey('store_section'));
      setCategoriesList([...dataService.getStoreCategories()]);
      setIsGlobalSoldEnabled(
        localStorage.getItem('wcg_store_global_show_sold') !== 'false' && localStorage.getItem('wcg_admin_show_sold_store') !== 'false'
      );
    };
    const unsub = dataService.subscribe(handleUpdate);
    const unsubTpl = templateService.subscribe(handleUpdate);
    const unsubStock = marketingService.subscribeStockChange(handleUpdate);
    const unsubSold = marketingService.subscribeSoldCountChange(handleUpdate);
    window.addEventListener('wcg_admin_data_updated', handleUpdate);
    window.addEventListener('wcg_virtual_stock_updated', handleUpdate);
    window.addEventListener('wcg_sold_count_updated', handleUpdate);
    window.addEventListener('wcg_store_settings_updated', handleUpdate);
    window.addEventListener('wcg_universal_templates_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      unsub();
      unsubTpl();
      unsubStock();
      unsubSold();
      window.removeEventListener('wcg_admin_data_updated', handleUpdate);
      window.removeEventListener('wcg_virtual_stock_updated', handleUpdate);
      window.removeEventListener('wcg_sold_count_updated', handleUpdate);
      window.removeEventListener('wcg_store_settings_updated', handleUpdate);
      window.removeEventListener('wcg_universal_templates_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleShareProduct = (product: StoreProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenShare) {
      onOpenShare(product);
    } else {
      const origin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? window.location.origin
        : 'https://codegame.shop';
      const shareUrl = `${origin}/store#product=${product.id}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        onShowToast(
          'Đã sao chép link sản phẩm!',
          `Đường dẫn: ${shareUrl}`,
          'success'
        );
      }
    }
  };

  const categoryTabs = [
    { id: 'all', label: 'Tất cả gói', icon: '📦' },
    ...categoriesList.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon || '🏷️',
    })),
  ];

  // Gom nhóm các gói nạp theo từng Tựa Game thành sản phẩm đại diện
  const groupedProducts = useMemo(() => groupStoreProductsByGame(products), [products]);

  // Filter & sort products (Mặc định ưu tiên hàng còn lên trên đầu)
  const filtered = groupedProducts
    .filter((p) => {
      if (p.is_active === false || p.is_active === 0 || (p as any).is_active === '0') return false;
      if (filterType !== 'all') {
        const target = filterType.toLowerCase().trim();
        const pkgType = (p.package_type || '').toLowerCase().trim();
        const cat = (p.category || '').toLowerCase().trim();
        const catLabel = (p.category_label || '').toLowerCase().trim();
        const matches = pkgType === target || cat === target || catLabel === target;
        if (!matches) return false;
      }
      if (!search.trim()) return true;
      return smartVietnameseMatch(
        [p.title, p.game_name, p.game_slug, p.description, p.package_type, p.category, p.category_label, p.badge],
        search
      );
    })
    .sort((a, b) => {
      const inStockA = (Number(a.stock_quantity) || 0) > 0 ? 1 : 0;
      const inStockB = (Number(b.stock_quantity) || 0) > 0 ? 1 : 0;

      // 1. Mặc định ưu tiên hàng còn lên trên đầu
      if (inStockA !== inStockB) {
        return inStockB - inStockA;
      }

      // 2. Nếu cùng còn hàng, ưu tiên tồn kho nhiều hơn
      if (inStockA > 0) {
        const diff = (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0);
        if (diff !== 0) return diff;
      }

      // 3. Giữ thứ tự tạo mới nhất
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card via-card-hover to-card border border-border shadow-xl overflow-hidden">
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-secondary/15 text-secondary text-[11px] sm:text-xs font-semibold border border-secondary/30">
              <ShoppingBag className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>{cmsIntro?.extraData?.badge || 'Gói Nạp & Giftcode Chiết Khấu Chính Hãng'}</span>
            </div>
            <h1 className="font-display font-extrabold text-base sm:text-3xl text-foreground">
              {cmsIntro?.title || 'Cửa Hàng Code Chiết Khấu Tới 60%'}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {cmsIntro?.content ||
                'Mã nạp game, thẻ tháng và giftcode sự kiện độc quyền. Nhận mã tự động 100% qua VietQR / Ví số dư.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-muted/60 border border-border px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-heading font-bold text-[11px] sm:text-xs text-foreground block">
                {cmsIntro?.extraData?.warrantyTitle || 'Bảo Hành 100%'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-300">
                {cmsIntro?.extraData?.warrantyDesc || 'Đổi trả tức thì nếu mã lỗi'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Search & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Type tabs - Horizontal scrollable on mobile */}
        <div className="relative flex-1 min-w-0 overflow-hidden w-full max-w-full">
          <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap scrollbar-none sm:flex-wrap pb-1 sm:pb-0 w-full max-w-full">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                  filterType === tab.id
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent sm:hidden z-10" />
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm gói code..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-base sm:text-xs text-foreground placeholder-slate-400 focus:ring-2 focus:ring-secondary focus:outline-none"
            />
          </div>

          {/* View Mode Toggle (Grid vs List) */}
          <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
              title="Lưới sản phẩm"
              aria-label="Chế độ lưới"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
              title="Danh sách hàng ngang"
              aria-label="Chế độ danh sách"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl glass-panel border border-border/80 p-8 my-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/80 border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="font-heading font-bold text-base sm:text-lg text-foreground mb-1">
            Không tìm thấy sản phẩm nào
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* MODE 2: LIST VIEW (Danh sách hàng ngang) */
        <div className="flex flex-col gap-2 sm:gap-2.5">
          {filtered.map((product) => {
            const flashSale = eventSchedulerService.getScheduleForProduct(product.id);
            const isFlashSaleLive = flashSale?.status === 'LIVE';
            const isFlashSaleUpcoming = flashSale?.status === 'UPCOMING';
            const effectivePrice = isFlashSaleLive && flashSale.event.sale_price ? flashSale.event.sale_price : product.current_price;
            const effectiveDiscount = isFlashSaleLive && flashSale.event.discount_percent ? flashSale.event.discount_percent : product.discount_percent;

            const displayStock =
              product.stock_quantity <= 0
                ? 0
                : marketingService.getDisplayStock(product.id, product.stock_quantity);
            const displaySold = marketingService.getSoldDisplay(product);

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct({ ...product, current_price: effectivePrice, discount_percent: effectiveDiscount })}
                className="bg-card hover:bg-card-hover rounded-xl sm:rounded-2xl border border-border/80 hover:border-secondary/50 shadow-cyber-card p-2 sm:p-3 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer group active:scale-[0.99] relative overflow-hidden"
              >
                {/* Product Thumbnail */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
                  <img
                    src={product.cover_image_url || product.game_icon_url || `/game_icons/${product.game_slug}.webp`}
                    alt={product.game_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const localFallback = `/game_icons/${product.game_slug}.webp`;
                      if (target.src !== localFallback && !target.src.endsWith(localFallback)) {
                        target.src = localFallback;
                      } else {
                        target.onerror = null;
                        target.src = '/vite.svg';
                      }
                    }}
                  />
                  {(effectiveDiscount > 0 || isFlashSaleLive) && (
                    <div className={`absolute top-0 right-0 px-1 py-0.2 rounded-bl-lg text-white text-[8px] sm:text-[9px] font-mono font-bold ${isFlashSaleLive ? 'bg-red-600 animate-pulse' : 'bg-accent'}`}>
                      -{effectiveDiscount}%
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded bg-secondary/15 text-secondary border border-secondary/30 truncate max-w-[120px] sm:max-w-none">
                      {product.game_name}
                    </span>
                    {product.badge && (
                      <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        {product.badge}
                      </span>
                    )}
                    {isFlashSaleUpcoming && flashSale && (
                      <EventCountdownBadge
                        targetDate={flashSale.event.start_time}
                        label="Sắp Sale:"
                        theme={flashSale.event.theme || 'fire'}
                        variant="pill"
                        onExpire={() => setProducts([...dataService.getStoreProducts()])}
                      />
                    )}
                    {isFlashSaleLive && flashSale && (
                      <EventCountdownBadge
                        targetDate={flashSale.event.end_time}
                        label="Hết hạn:"
                        theme={flashSale.event.theme || 'fire'}
                        variant="pill"
                        onExpire={() => setProducts([...dataService.getStoreProducts()])}
                      />
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-xs sm:text-sm text-foreground group-hover:text-secondary transition-colors truncate">
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                    {(product as any).show_stock_count !== false && (
                      <span className={`font-mono ${displayStock <= 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                        {displayStock <= 0 ? 'Hết hàng' : `Còn: ${displayStock}`}
                      </span>
                    )}
                    {isGlobalSoldEnabled && product.show_sold_count !== false && (
                      <>
                        {(product as any).show_stock_count !== false && <span>•</span>}
                        <span className="font-mono text-amber-400/90 hidden xs:inline">
                          Đã bán: {displaySold}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price & Action */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="text-right">
                    <div className="font-display font-black text-xs sm:text-sm md:text-base text-emerald-400 flex items-center justify-end gap-1">
                      {hasMultiplePackages && <span className="text-[10px] text-muted-foreground font-normal">Từ</span>}
                      <span>{formatCore(displayPrice)}</span>
                    </div>
                    {hasMultiplePackages && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block">
                        {packages.length} gói
                      </span>
                    )}
                    {product.original_price > effectivePrice && (
                      <div className="text-[9px] sm:text-[10px] text-slate-400 line-through font-mono hidden xs:block">
                        {formatCore(product.original_price)}
                      </div>
                    )}
                  </div>

                  <button
                    disabled={product.stock_quantity <= 0}
                    onClick={() => {
                      if (product.stock_quantity <= 0) {
                        onShowToast('Hết hàng', 'Gói code này hiện đã hết hàng trong kho.', 'error');
                        return;
                      }
                      if (!currentUser && !hasMultiplePackages && onOpenAuth) {
                        onOpenAuth();
                        onShowToast('Cần đăng nhập', 'Vui lòng đăng nhập để mua gói code.', 'info');
                      } else {
                        onSelectProduct({ ...product, current_price: effectivePrice, discount_percent: effectiveDiscount });
                      }
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                      product.stock_quantity <= 0
                        ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                        : isFlashSaleLive
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-neon-orange animate-pulse'
                        : 'bg-secondary hover:bg-secondary/90 text-white'
                    }`}
                  >
                    <span>{hasMultiplePackages ? 'Chọn Gói' : (isFlashSaleLive ? 'Săn Sale' : 'Mua')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleShareProduct(product, e)}
                    className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted text-slate-400 hover:text-foreground transition-all cursor-pointer active:scale-90 hidden sm:flex"
                    title="Chia sẻ link sản phẩm"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODE 1: GRID VIEW (2 cột trên Mobile, 3-4 cột trên Desktop) */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {filtered.map((product) => {
            const flashSale = eventSchedulerService.getScheduleForProduct(product.id);
            const isFlashSaleLive = flashSale?.status === 'LIVE';
            const isFlashSaleUpcoming = flashSale?.status === 'UPCOMING';
            const effectivePrice = isFlashSaleLive && flashSale.event.sale_price ? flashSale.event.sale_price : product.current_price;
            const effectiveDiscount = isFlashSaleLive && flashSale.event.discount_percent ? flashSale.event.discount_percent : product.discount_percent;

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct({ ...product, current_price: effectivePrice, discount_percent: effectiveDiscount })}
                className="bg-card hover:bg-card-hover rounded-2xl border border-border/80 hover:border-secondary/50 shadow-cyber-card p-2.5 sm:p-3.5 transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden min-h-[140px]"
              >
                <div>
                  {/* Top: Small Game Icon (40px mobile / 48px desktop) + Titles + Direct Share Button */}
                  <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2.5">
                    <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
                        <img
                          src={product.cover_image_url || product.game_icon_url || `/game_icons/${product.game_slug}.webp`}
                          alt={product.game_name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const localFallback = `/game_icons/${product.game_slug}.webp`;
                            if (target.src !== localFallback && !target.src.endsWith(localFallback)) {
                              target.src = localFallback;
                            } else {
                              target.onerror = null;
                              target.src = '/vite.svg';
                            }
                          }}
                        />
                        {(effectiveDiscount > 0 || isFlashSaleLive) && (
                          <div className={`absolute top-0 right-0 px-1 py-0.2 rounded-bl-lg text-white text-[8px] sm:text-[9px] font-mono font-bold ${isFlashSaleLive ? 'bg-red-600 animate-pulse' : 'bg-accent'}`}>
                            -{effectiveDiscount}%
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap mb-0.5">
                          <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded bg-secondary/15 text-secondary border border-secondary/30 truncate max-w-full block">
                            {product.game_name}
                          </span>
                          {product.badge && (
                            <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              {product.badge}
                            </span>
                          )}
                          {isFlashSaleUpcoming && flashSale && (
                            <EventCountdownBadge
                              targetDate={flashSale.event.start_time}
                              label="Sale:"
                              theme={flashSale.event.theme || 'fire'}
                              variant="pill"
                              onExpire={() => setProducts([...dataService.getStoreProducts()])}
                            />
                          )}
                          {isFlashSaleLive && flashSale && (
                            <EventCountdownBadge
                              targetDate={flashSale.event.end_time}
                              label="Hết:"
                              theme={flashSale.event.theme || 'fire'}
                              variant="pill"
                              onExpire={() => setProducts([...dataService.getStoreProducts()])}
                            />
                          )}
                        </div>
                        <h3 className="font-heading font-bold text-[11px] sm:text-xs md:text-sm text-foreground group-hover:text-secondary transition-colors line-clamp-2 leading-snug">
                          {product.title}
                        </h3>
                      </div>
                    </div>

                    {/* Direct Share Button on Product */}
                    <button
                      onClick={(e) => handleShareProduct(product, e)}
                      className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted text-slate-400 hover:text-foreground transition-all cursor-pointer active:scale-90 shrink-0"
                      title="Chia sẻ link sản phẩm"
                      aria-label="Chia sẻ link sản phẩm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Product description short - Clamped to 2 lines max */}
                  {product.description && (
                    <p
                      className="text-[11px] text-slate-400/90 leading-relaxed mb-2.5 line-clamp-2 overflow-hidden"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        maxHeight: '2.5rem',
                      }}
                    >
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Bottom: Price in Core & 1-tap Buy button */}
                <div className="pt-2 sm:pt-2.5 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex items-baseline justify-between sm:block">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      {hasMultiplePackages && <span className="text-[10px] text-muted-foreground font-medium">Từ</span>}
                      <span className="font-display font-black text-xs sm:text-sm md:text-base text-emerald-400">
                        {formatCore(displayPrice)}
                      </span>
                      {!hasMultiplePackages && product.original_price > effectivePrice && (
                        <span className="text-[9px] sm:text-[10px] text-slate-400 line-through font-mono hidden xs:inline">
                          {formatCore(product.original_price)}
                        </span>
                      )}
                      {hasMultiplePackages && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 ml-1">
                          {packages.length} gói
                        </span>
                      )}
                    </div>
                    {(() => {
                      const displayStock =
                        product.stock_quantity <= 0
                          ? 0
                          : marketingService.getDisplayStock(product.id, product.stock_quantity);
                      const displaySold = marketingService.getSoldDisplay(product);
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(product as any).show_stock_count !== false && (
                            <span
                              className={`text-[9px] sm:text-[10px] font-mono ${
                                displayStock <= 0 ? 'text-rose-400 font-bold' : 'text-slate-300'
                              }`}
                            >
                              {displayStock <= 0 ? 'Hết hàng' : `Còn: ${displayStock}`}
                            </span>
                          )}
                          {isGlobalSoldEnabled && product.show_sold_count !== false && (
                            <span className="text-[9px] sm:text-[10px] font-mono text-amber-400/90">
                              {(product as any).show_stock_count !== false ? '• ' : ''}Đã bán: {displaySold}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    disabled={product.stock_quantity <= 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (product.stock_quantity <= 0) {
                        onShowToast(
                          'Hết hàng',
                          'Gói code này hiện đã hết hàng trong kho. Vui lòng quay lại sau.',
                          'error'
                        );
                        return;
                      }
                      if (!currentUser && !hasMultiplePackages && onOpenAuth) {
                        onOpenAuth();
                        onShowToast('Cần đăng nhập', 'Vui lòng đăng nhập để mua gói code.', 'info');
                      } else {
                        onSelectProduct({ ...product, current_price: effectivePrice, discount_percent: effectiveDiscount });
                      }
                    }}
                    className={`w-full sm:w-auto px-2 sm:px-3 py-1.5 min-h-[30px] sm:min-h-[34px] rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs shadow-sm transition-all flex items-center justify-center gap-1 shrink-0 ${
                      product.stock_quantity <= 0
                        ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                        : isFlashSaleLive
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-neon-orange animate-pulse cursor-pointer active:scale-95'
                        : 'bg-secondary hover:bg-secondary/90 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    {product.stock_quantity <= 0 ? (
                      <span>Hết hàng</span>
                    ) : !currentUser && !hasMultiplePackages ? (
                      <>
                        <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>{isFlashSaleLive ? 'Săn Sale' : 'Mua'}</span>
                      </>
                    ) : (
                      <>
                        <span>{hasMultiplePackages ? 'Chọn Gói' : (isFlashSaleLive ? 'Săn Sale Ngay' : 'Mua Ngay')}</span>
                        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
