import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  Zap,
  ZoomIn,
  LogIn,
  Share2,
  BookOpen,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  CheckCircle2,
  Star,
  Clock,
  Sparkles,
  Minus,
  Plus,
  Lock,
} from 'lucide-react';
import type { StoreProduct, UtilityProduct, UserProfile, ProductPackageVariant } from '../types/game';
import { formatCore } from '../utils/textUtils';
import { marketingService } from '../services/marketingService';
import { dataService } from '../services/dataService';
import { getProductPackages } from '../utils/productPackageUtils';
import { GuideLinksBanner } from './GuideLinksBanner';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

export interface ProductDetailModalProps {
  product: StoreProduct | UtilityProduct | null;
  onClose: () => void;
  onBuyNow: (product: any, selectedPackage?: ProductPackageVariant, quantity?: number) => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenShare?: (product: any) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onBuyNow,
  currentUser,
  onOpenAuth,
  onOpenShare,
  onShowToast,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  useLockBodyScroll(Boolean(product));
  const [, setTick] = useState(0);

  // Danh sách các gói tùy chọn
  const packages: ProductPackageVariant[] = useMemo(() => {
    if (!product) return [];
    return getProductPackages(product);
  }, [product]);

  const [selectedPackageId, setSelectedPackageId] = useState<string>(() => {
    return packages[0]?.id || product?.id || '';
  });

  useEffect(() => {
    setActiveImageIdx(0);
    setIsZoomed(false);
    setIsDescExpanded(false);
    setQuantity(1);
    if (packages.length > 0) {
      setSelectedPackageId(packages[0].id);
    }
  }, [product?.id]);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    const unsub = dataService.subscribe(handleUpdate);
    const unsubStock = marketingService.subscribeStockChange(handleUpdate);
    const unsubSold = marketingService.subscribeSoldCountChange(handleUpdate);
    window.addEventListener('wcg_virtual_stock_updated', handleUpdate);
    window.addEventListener('wcg_sold_count_updated', handleUpdate);
    window.addEventListener('wcg_utilities_updated', handleUpdate);
    return () => {
      unsub();
      unsubStock();
      unsubSold();
      window.removeEventListener('wcg_virtual_stock_updated', handleUpdate);
      window.removeEventListener('wcg_sold_count_updated', handleUpdate);
      window.removeEventListener('wcg_utilities_updated', handleUpdate);
    };
  }, []);

  if (!product) return null;

  // Lấy gói đang chọn
  const selectedPackage: ProductPackageVariant =
    packages.find((p) => p.id === selectedPackageId) ||
    packages[0] || {
      id: product.id,
      name: product.title,
      price: product.current_price,
      original_price: product.original_price,
      stock_quantity: product.stock_quantity,
      note: 'Xử lý tiêu chuẩn',
    };

  const isStoreProduct = 'game_slug' in product;
  const gameSlug = isStoreProduct ? (product as StoreProduct).game_slug : '';
  const gameName = isStoreProduct
    ? (product as StoreProduct).game_name
    : (product as UtilityProduct).category_label || (product as UtilityProduct).category || 'Tiện ích';

  const defaultImg =
    product.cover_image_url ||
    (isStoreProduct ? (product as StoreProduct).game_icon_url : (product as UtilityProduct).icon_url) ||
    (gameSlug ? `/game_icons/${gameSlug}.webp` : '/vite.svg');

  const images =
    product.product_images && product.product_images.length > 0
      ? product.product_images
      : [defaultImg].filter(Boolean) as string[];

  // Tồn kho & Đã bán của gói được chọn
  const realStock = typeof selectedPackage.stock_quantity === 'number'
    ? selectedPackage.stock_quantity
    : product.stock_quantity;
  const displayStock = realStock <= 0 ? 0 : marketingService.getDisplayStock(selectedPackage.id || product.id, realStock);
  const displaySold = marketingService.getSoldDisplay({
    ...selectedPackage,
    created_at: product.created_at,
    fomo_anchor_time: (product as any).fomo_anchor_time,
  } as any);
  const isOutOfStock = realStock <= 0 || displayStock <= 0;

  // Quyết định hiển thị "Đã bán" dựa trên: Cấu hình toàn cục + Cấu hình sản phẩm riêng lẻ
  const isGlobalSoldEnabled = isStoreProduct
    ? (typeof window !== 'undefined' ? (localStorage.getItem('wcg_store_global_show_sold') !== 'false' && localStorage.getItem('wcg_admin_show_sold_store') !== 'false') : true)
    : (typeof window !== 'undefined' ? (localStorage.getItem('wcg_utilities_global_show_sold') !== 'false' && localStorage.getItem('wcg_admin_show_sold_util') !== 'false') : true);
  const isSoldVisible = isGlobalSoldEnabled && (product as any).show_sold_count !== false;

  const currentPrice = selectedPackage.price;
  const originalPrice = selectedPackage.original_price || currentPrice;
  const discountPercent =
    originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : (product.discount_percent || 0);

  const totalPrice = currentPrice * quantity;

  const handleShare = async () => {
    const origin =
      typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? window.location.origin
        : 'https://codegame.shop';
    const pathPrefix = isStoreProduct ? 'store#product' : 'utilities#utility';
    const shareUrl = `${origin}/${pathPrefix}=${product.id}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Mua ngay ${product.title} (${gameName}) uy tín, giá rẻ tại CodeGame.shop`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    if (onOpenShare) {
      onOpenShare(product);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      if (onShowToast) {
        onShowToast('Đã sao chép link sản phẩm!', `Đường dẫn: ${shareUrl}`, 'success');
      }
    }
  };

  useEffect(() => {
    if (realStock > 0 && quantity > realStock) {
      setQuantity(realStock);
    }
  }, [realStock, selectedPackage]);

  const handleDecreaseQty = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseQty = () => {
    if (realStock > 0 && quantity >= realStock) return;
    setQuantity((prev) => prev + 1);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in"
    >
      <div
        className="relative w-full max-w-5xl bg-card border-t sm:border border-border/90 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar Header */}
        <div className="p-3.5 sm:p-5 border-b border-border/70 bg-card/95 backdrop-blur-md shrink-0 sticky top-0 z-20">
          <div className="w-12 h-1.5 bg-slate-600/60 rounded-full mx-auto mb-2 sm:hidden shrink-0" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted overflow-hidden border border-border shrink-0">
                <img
                  src={defaultImg}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (gameSlug) {
                      const localFallback = `/game_icons/${gameSlug}.webp`;
                      if (target.src !== localFallback && !target.src.endsWith(localFallback)) {
                        target.src = localFallback;
                        return;
                      }
                    }
                    target.onerror = null;
                    target.src = '/vite.svg';
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                  {product.title}
                </h3>
                <span className="text-[11px] sm:text-xs text-secondary font-semibold truncate block">
                  {gameName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleShare}
                className="p-2 sm:p-2.5 rounded-xl bg-muted/60 hover:bg-muted text-slate-300 hover:text-foreground cursor-pointer transition-all active:scale-95"
                title="Chia sẻ link sản phẩm"
                aria-label="Chia sẻ link sản phẩm"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0"
                aria-label="Đóng"
                title="Đóng"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - 2 Columns Layout */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-4 sm:p-6 scrollbar-thin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* CỘT TRÁI (Left Column): Ảnh đại diện lớn, Cam kết uy tín, Chi tiết thông tin */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              {/* Main Image Gallery */}
              <div className="space-y-2.5">
                <div className="relative h-52 sm:h-80 rounded-2xl bg-muted overflow-hidden border border-border group select-none shadow-inner">
                  <img
                    src={images[activeImageIdx]}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (gameSlug) {
                        const localFallback = `/game_icons/${gameSlug}.webp`;
                        if (target.src !== localFallback && !target.src.endsWith(localFallback)) {
                          target.src = localFallback;
                          return;
                        }
                      }
                      target.onerror = null;
                      target.src = '/vite.svg';
                    }}
                  />

                  {images.length > 1 && (
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-sm text-white text-[11px] font-mono font-medium shadow-md border border-white/10 z-10">
                      {activeImageIdx + 1} / {images.length}
                    </div>
                  )}

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100 z-10 active:scale-95"
                        title="Ảnh trước"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100 z-10 active:scale-95"
                        title="Ảnh sau"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setIsZoomed(true)}
                    className="absolute bottom-2.5 right-2.5 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-all cursor-pointer z-10"
                    title="Phóng to ảnh"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                          activeImageIdx === idx
                            ? 'border-secondary ring-2 ring-secondary/30 scale-95 shadow-md opacity-100'
                            : 'border-border/80 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`thumb-${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3 Khối Cam Kết Uy Tín Chuẩn Mẫu (Trust & Security Badges) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center sm:flex-col sm:text-center sm:justify-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-emerald-300">GIAO DỊCH BẢO VỆ</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Thanh toán an toàn trong hệ thống</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center sm:flex-col sm:text-center sm:justify-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-amber-300">NHANH CHÓNG</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Xử lý tự động hoặc 0-5 phút</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center sm:flex-col sm:text-center sm:justify-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-indigo-300">CHÍNH HÃNG 100%</h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Cam kết đúng bản quyền gói</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span>Thông Tin Chi Tiết Sản Phẩm:</span>
                    </h4>
                    {product.description.length > 200 && (
                      <button
                        type="button"
                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary hover:opacity-90 py-1 px-2.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 cursor-pointer transition-all active:scale-95 shrink-0"
                      >
                        <span>{isDescExpanded ? 'Thu gọn' : 'Xem toàn bộ'}</span>
                        {isDescExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <div
                    className={`relative bg-card p-3.5 sm:p-4 rounded-2xl border border-border transition-all duration-300 ${
                      !isDescExpanded && product.description.length > 200
                        ? 'max-h-[140px] overflow-hidden'
                        : 'sm:max-h-[500px] sm:overflow-y-auto scrollbar-thin'
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                    {!isDescExpanded && product.description.length > 200 && (
                      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-card via-card/80 to-transparent flex items-end justify-center pb-1">
                        <span className="text-[10px] text-secondary font-semibold bg-card/90 px-2 py-0.5 rounded-full border border-secondary/20 shadow-sm">
                          Nhấn &quot;Xem toàn bộ&quot; để đọc hết mô tả...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Guide Links Banner */}
              <GuideLinksBanner
                guideLinks={(product as any).guide_links}
                guideUrl={(product as any).guide_url}
                guideText={(product as any).guide_text}
                showGuide={(product as any).show_guide_link !== false}
                theme="indigo"
              />

              {/* Warranty text */}
              {(product as any).show_warranty && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{(product as any).warranty_text || 'Bảo hành 1 đổi 1 suốt chu kỳ sử dụng'}</span>
                </div>
              )}
            </div>

            {/* CỘT PHẢI (Right Column): Khối Chọn Gói & Thanh Toán Mẫu Chuẩn (Packages Selection) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-border/80 bg-slate-900/60 p-4 sm:p-5 shadow-xl space-y-4 sticky top-4">
                {/* Header Gói Đã Chọn */}
                <div className="pb-3 border-b border-border/70">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">
                    Gói đã chọn:
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-extrabold text-2xl sm:text-3xl text-emerald-400 tracking-tight">
                        {formatCore(currentPrice)}
                      </span>
                      {originalPrice > currentPrice && (
                        <span className="text-xs sm:text-sm text-muted-foreground line-through font-mono">
                          {formatCore(originalPrice)}
                        </span>
                      )}
                      {discountPercent > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    {/* Trạng thái kho */}
                    <div>
                      {!isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Còn hàng ({realStock} gói)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
                          <span>Tạm hết hàng</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>5.0 (Đánh giá uy tín)</span>
                    </span>
                    {isSoldVisible && (
                      <span className="text-slate-400">
                        Đã bán: <strong className="text-foreground font-mono">{displaySold}</strong> gói
                      </span>
                    )}
                  </div>
                </div>

                {/* Danh Sách Chọn Gói (Chọn Gói) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-secondary" />
                      <span>Chọn gói sản phẩm:</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {packages.length} gói có sẵn
                    </span>
                  </div>

                  <div className="space-y-2 sm:max-h-[300px] sm:overflow-y-auto pr-1 scrollbar-thin">
                    {packages.map((pkg) => {
                      const isSelected = pkg.id === selectedPackage.id;
                      const pkgStock = typeof pkg.stock_quantity === 'number' ? pkg.stock_quantity : product.stock_quantity;
                      const isPkgOut = pkgStock <= 0;

                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => {
                            setSelectedPackageId(pkg.id);
                            setQuantity(1);
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 relative ${
                            isSelected
                              ? 'border-red-500 bg-red-500/10 shadow-md ring-1 ring-red-500/60'
                              : 'border-border/80 bg-card/60 hover:bg-card hover:border-slate-600'
                          } ${isPkgOut ? 'opacity-60' : ''}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                {pkg.name}
                              </span>
                              {pkg.badge && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                  {pkg.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-muted-foreground truncate">
                                {pkg.note || 'Xử lý tiêu chuẩn'}
                              </span>
                              {isSoldVisible && (pkg as any).show_sold_count !== false && (
                                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                  • Đã bán: <strong className="text-foreground">{marketingService.getSoldDisplay({ ...pkg, created_at: product.created_at } as any)}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`font-mono font-bold text-xs sm:text-sm block ${isSelected ? 'text-red-400' : 'text-emerald-400'}`}>
                              {formatCore(pkg.price)}
                            </span>
                            {isPkgOut && (
                              <span className="text-[10px] text-rose-400 font-semibold block">Hết hàng</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Số lượng mua */}
                {!isOutOfStock && (
                  <div className="pt-2 border-t border-border/70 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Số lượng mua:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDecreaseQty}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                        aria-label="Giảm"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-mono font-bold text-sm text-foreground">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={handleIncreaseQty}
                        disabled={realStock > 0 && quantity >= realStock}
                        className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                        aria-label="Tăng"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Nút Hành Động Mua Ngay */}
                <div className="pt-2">
                  {!currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenAuth) onOpenAuth();
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-display font-bold text-xs shadow-glow-primary transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Đăng Nhập Để Mua ({formatCore(totalPrice)})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => {
                        const finalSafeQty = realStock > 0 ? Math.min(quantity, realStock) : quantity;
                        onBuyNow(product, selectedPackage, finalSafeQty);
                      }}
                      className={`w-full py-3.5 px-4 rounded-xl font-display font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer ${
                        !isOutOfStock
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20'
                          : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>
                        {!isOutOfStock
                          ? `Mua Ngay Gói Này (${formatCore(totalPrice)})`
                          : 'Tạm Hết Hàng'}
                      </span>
                    </button>
                  )}
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    ⚡ Hệ thống giao mã tự động qua ví Core trong 0 giây
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Image Zoom Lightbox */}
        {isZoomed && (
          <div
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setIsZoomed(false)}
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 p-3 rounded-full bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 cursor-pointer"
              aria-label="Đóng phóng to"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={images[activeImageIdx]}
              alt={product.title}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
