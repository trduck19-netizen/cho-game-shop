import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CreditCard,
  Wallet,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  LogIn,
  Lock,
  PlusCircle,
  Minus,
  Plus,
  Zap,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CyberLoader } from './CyberLoader';
import type { StoreProduct, OrderRecord, UserProfile } from '../types/game';
import { dataService } from '../services/dataService';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { marketingService } from '../services/marketingService';
import { formatCore } from '../utils/textUtils';
import { GuideLinksBanner } from './GuideLinksBanner';

interface ProductCheckoutModalProps {
  product: StoreProduct | any | null;
  selectedPackage?: any | null;
  initialQuantity?: number;
  onClose: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: UserProfile | null;
  onUpdateUser?: (user: UserProfile) => void;
  onOpenAuth?: () => void;
  onOpenWallet?: () => void;
}

export const ProductCheckoutModal: React.FC<ProductCheckoutModalProps> = ({
  product,
  selectedPackage,
  initialQuantity = 1,
  onClose,
  onShowToast,
  currentUser,
  onUpdateUser,
  onOpenAuth,
  onOpenWallet,
}) => {
  const [quantity, setQuantity] = useState<number>(initialQuantity || 1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [, setTick] = useState(0);

  useEffect(() => {
    if (initialQuantity && initialQuantity > 0) {
      setQuantity(initialQuantity);
    }
  }, [initialQuantity]);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    const unsub = dataService.subscribe(handleUpdate);
    const unsubStock = marketingService.subscribeStockChange(handleUpdate);
    const unsubSold = marketingService.subscribeSoldCountChange(handleUpdate);
    window.addEventListener('wcg_virtual_stock_updated', handleUpdate);
    window.addEventListener('wcg_sold_count_updated', handleUpdate);
    return () => {
      unsub();
      unsubStock();
      unsubSold();
      window.removeEventListener('wcg_virtual_stock_updated', handleUpdate);
      window.removeEventListener('wcg_sold_count_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setCompletedOrder(null);
      setCopiedCodeIdx(null);
      setCopiedAll(false);
      const newKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      setIdempotencyKey(newKey);
    }
  }, [product?.id]);

  useLockBodyScroll(Boolean(product));

  if (!product) return null;
  const liveProduct = dataService.getStoreProducts().find((p) => p.id === product.id) || product;

  const effectivePrice = selectedPackage?.price ?? liveProduct.current_price;
  const effectiveOriginalPrice = selectedPackage?.original_price ?? liveProduct.original_price;
  const effectiveTitle = selectedPackage && selectedPackage.name && selectedPackage.name !== liveProduct.title
    ? `${liveProduct.title} - ${selectedPackage.name}`
    : liveProduct.title;
  const effectiveTargetId = selectedPackage?.id || liveProduct.id;

  const user = currentUser || dataService.getCurrentUser();
  const userBalance = user?.wallet_balance || 0;
  const rawStock = typeof selectedPackage?.stock_quantity === 'number'
    ? selectedPackage.stock_quantity
    : liveProduct.stock_quantity;
  const realStock = Math.max(0, Number(rawStock ?? 0));
  const maxStock = realStock;
  const safeQty = realStock > 0 ? Math.min(Math.max(1, quantity), maxStock) : 0;
  const totalPrice = effectivePrice * safeQty;
  const isBalanceEnough = userBalance >= totalPrice;
  const checkoutDisplayStock = realStock <= 0 ? 0 : marketingService.getDisplayStock(effectiveTargetId, realStock);

  useEffect(() => {
    if (realStock > 0 && quantity > realStock) {
      setQuantity(realStock);
    }
  }, [realStock, selectedPackage, product]);

  const handleDecreaseQty = () => {
    if (maxStock <= 0) return;
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseQty = () => {
    if (maxStock <= 0) return;
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  const handleQtyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (maxStock <= 0) {
      setQuantity(0);
      return;
    }
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      setQuantity(1);
    } else {
      setQuantity(Math.min(maxStock, val));
    }
  };

  const handlePayWithWallet = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      onShowToast('Cần đăng nhập', 'Vui lòng đăng nhập tài khoản để thanh toán.', 'info');
      return;
    }

    if (user.session_token && typeof localStorage !== 'undefined' && !localStorage.getItem('wcg_auth_token')) {
      localStorage.setItem('wcg_auth_token', user.session_token);
    }

    if (!isBalanceEnough) {
      onShowToast(
        'Số Dư Core Không Đủ',
        `Bạn cần ${formatCore(totalPrice)} nhưng ví hiện chỉ có ${formatCore(userBalance)}. Vui lòng nạp thêm Core để thanh toán.`,
        'error'
      );
      return;
    }

    if (realStock <= 0) {
      onShowToast('Hết hàng', 'Sản phẩm tạm thời hết hàng trong kho.', 'error');
      return;
    }

    const activeKey = idempotencyKey || (
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10)
    );
    if (!idempotencyKey) setIdempotencyKey(activeKey);

    setIsProcessing(true);

    try {
      const res = await dataService.createOrder(effectiveTargetId, safeQty, activeKey);
      setIsProcessing(false);

      if (res.success && res.order) {
        const activeUser = currentUser || (typeof window !== 'undefined' ? dataService.getCurrentUser() : null);
        marketingService.recordRealOrder(effectiveTitle, effectiveTargetId, totalPrice, 'store', activeUser, safeQty);

        // Instantly notify React app state of new balance
        if (activeUser) {
          const newBal = (res.order as any)?.balance_after !== undefined
            ? Number((res.order as any).balance_after)
            : (res as any)?.remainingBalance !== undefined
              ? Number((res as any).remainingBalance)
              : Math.max(0, (activeUser.wallet_balance || 0) - totalPrice);
          const updatedUser: UserProfile = {
            ...activeUser,
            wallet_balance: newBal,
          };
          if (onUpdateUser) {
            onUpdateUser(updatedUser);
          }
        }

        setCompletedOrder(res.order);
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#6366F1', '#10B981', '#F59E0B'],
        });
        onShowToast('Thanh toán thành công!', `Đã giao ${safeQty} mã quà tặng tức thì.`, 'success');
      } else {
        if (res.message && res.message.includes('Phiên đăng nhập') && onOpenAuth) {
          onOpenAuth();
        }
        onShowToast('Thất bại', res.message || 'Không thể hoàn tất đơn hàng.', 'error');
      }
    } catch (err: any) {
      setIsProcessing(false);
      onShowToast('Lỗi', err?.message || 'Không thể hoàn tất đơn hàng.', 'error');
    }
  };

  const handleCopySingleCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    marketingService.recordRealCopy(effectiveTitle || 'Mã sản phẩm', '', 1, activeUser);
    setCopiedCodeIdx(idx);
    onShowToast('Đã sao chép mã!', code, 'success');
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const handleCopyAllCodes = () => {
    if (!completedOrder) return;
    navigator.clipboard.writeText(completedOrder.code_content);
    marketingService.recordRealCopy(effectiveTitle || 'Mã sản phẩm', '', safeQty, activeUser);
    setCopiedAll(true);
    onShowToast('Đã sao chép tất cả mã!', completedOrder.code_content, 'success');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleOpenTopup = () => {
    onClose();
    if (onOpenWallet) {
      onOpenWallet();
    }
  };

  const deliveredLines = completedOrder
    ? (completedOrder.code_items && completedOrder.code_items.length > 0)
      ? completedOrder.code_items
      : completedOrder.code_content.split('\n').filter((l) => l.trim())
    : [];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {isProcessing && (
        <CyberLoader
          isOverlay={true}
          title="ĐANG XỬ LÝ ĐƠN..."
          subText="Hệ thống đang kiểm tra số dư ví & xuất mã quà tặng từ kho bảo mật Cloudflare D1..."
        />
      )}
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-card border-t sm:border border-border/90 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col h-[88dvh] sm:h-auto max-h-[88dvh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-border/70 bg-card/95 backdrop-blur-md shrink-0 sticky top-0 z-20">
          <div className="w-12 h-1.5 bg-slate-600/60 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 sm:p-2.5 rounded-xl bg-secondary/20 text-secondary shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                  Thanh Toán Đơn Hàng
                </h3>
                <p className="text-xs text-muted-foreground truncate">{effectiveTitle}</p>
              </div>
            </div>
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

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-4 sm:p-6 space-y-5">
          {!user ? (
            /* Auth Required */
            <div className="py-6 text-center space-y-5 animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mx-auto border border-secondary/30 shadow-sm">
                <Lock className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-heading font-extrabold text-xl text-foreground">
                  Yêu Cầu Đăng Nhập
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Bạn cần đăng nhập tài khoản để nhận mã quà tặng tự động và kích hoạt bảo hành cho đơn hàng.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden border border-border shrink-0">
                    <img
                      src={product.cover_image_url || product.game_icon_url || `/game_icons/${product.game_slug}.webp`}
                      alt={product.game_name}
                      className="w-full h-full object-cover"
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
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-xs text-foreground truncate max-w-[180px]">
                      {effectiveTitle}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">{product.game_name || (product as any).category_label || ''}</span>
                  </div>
                </div>
                <span className="font-display font-black text-sm text-emerald-400">
                  {formatCore(effectivePrice)}
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenAuth) onOpenAuth();
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs shadow-glow-primary cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng Nhập / Đăng Ký Ngay</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                >
                  Để sau
                </button>
              </div>
            </div>
          ) : completedOrder ? (
            /* Order Success View */
            <div className="text-center py-3 space-y-4 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-glow-emerald">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-heading font-extrabold text-xl text-foreground">
                  Giao Hàng Thành Công!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Mã đơn: <strong className="text-foreground font-mono">{completedOrder.id}</strong> • Số lượng: <strong className="text-emerald-400">{deliveredLines.length} mã</strong>
                </p>
              </div>

              {/* Code List Box */}
              <div className="p-3 sm:p-4 rounded-2xl bg-muted/70 border border-border space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Danh Sách Mã Code Ingame:
                  </span>
                  {deliveredLines.length > 1 && (
                    <button
                      onClick={handleCopyAllCodes}
                      className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/90 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      {copiedAll ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAll ? 'Đã sao chép tất cả' : 'Sao chép tất cả'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 sm:max-h-48 sm:overflow-y-auto pr-1">
                  {deliveredLines.map((codeItem: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-card p-2.5 sm:p-3 rounded-xl border border-border"
                    >
                      <div className="min-w-0 flex-1">
                        {deliveredLines.length > 1 && (
                          <span className="text-[10px] text-muted-foreground font-mono block">#{idx + 1}</span>
                        )}
                        <span className="font-mono font-bold text-xs sm:text-sm text-primary-light break-all block">
                          {codeItem}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopySingleCode(codeItem, idx)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                      >
                        {copiedCodeIdx === idx ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span className="hidden xs:inline">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="hidden xs:inline">Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guide link if configured */}
              <GuideLinksBanner
                guideLinks={liveProduct.guide_links}
                guideUrl={liveProduct.guide_url}
                guideText={liveProduct.guide_text}
                showGuide={liveProduct.show_guide_link !== false}
                theme="indigo"
              />

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Đơn hàng đã được lưu vào lịch sử & kích hoạt bảo hành 100%.</span>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Hoàn Tất & Đóng
              </button>
            </div>
          ) : (
            /* Checkout Form */
            <div className="space-y-4">
              {/* Product Summary */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden border border-border shrink-0">
                    <img
                      src={product.cover_image_url || product.game_icon_url || `/game_icons/${product.game_slug}.webp`}
                      alt={product.game_name}
                      className="w-full h-full object-cover"
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
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-foreground truncate max-w-[190px]">
                      {effectiveTitle}
                    </h4>
                    <span className="text-xs text-muted-foreground">{product.game_name || (product as any).category_label || ''}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display font-black text-base text-emerald-400 block">
                    {formatCore(effectivePrice)}
                  </span>
                  <span className={`text-[10px] font-semibold flex items-center gap-1 justify-end font-sans ${checkoutDisplayStock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {checkoutDisplayStock > 0 ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Sẵn sàng • Giao tức thì</span>
                      </>
                    ) : (
                      'Tạm hết hàng'
                    )}
                  </span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-foreground block">Số Lượng Mua:</span>
                  {maxStock <= 0 && (
                    <span className="text-[10px] font-medium block text-rose-400 font-bold">
                      Sản phẩm hiện đang tạm hết hàng
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDecreaseQty}
                    disabled={safeQty <= 1 || maxStock <= 0}
                    className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center font-bold text-sm disabled:opacity-40 transition-all cursor-pointer"
                    aria-label="Giảm số lượng"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={maxStock <= 0 ? 0 : 1}
                    max={maxStock}
                    value={safeQty}
                    disabled={maxStock <= 0}
                    onChange={handleQtyInputChange}
                    className="w-14 h-9 text-center font-black font-mono text-sm bg-white text-slate-950 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm selection:bg-indigo-100 disabled:opacity-50"
                  />
                  <button
                    onClick={handleIncreaseQty}
                    disabled={safeQty >= maxStock || maxStock <= 0}
                    className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center font-bold text-sm disabled:opacity-40 transition-all cursor-pointer"
                    aria-label="Tăng số lượng"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Wallet Method & Balance Box */}
              <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/15 text-primary">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Ví Số Dư Core</span>
                      <span className="text-[11px] text-muted-foreground">Thanh toán tự động</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Số dư hiện tại</span>
                    <span className="text-sm font-black font-display text-primary-light">{formatCore(userBalance)}</span>
                  </div>
                </div>

                {/* Total Calculation Row */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Tổng tiền ({safeQty} gói x {formatCore(product.current_price)}):
                  </span>
                  <span className="font-display font-black text-sm text-emerald-400">
                    {formatCore(totalPrice)}
                  </span>
                </div>

                {!isBalanceEnough ? (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Số Dư Core Không Đủ</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Cần <strong className="text-foreground font-bold">{formatCore(totalPrice)}</strong>, ví hiện có <strong className="text-foreground font-bold">{formatCore(userBalance)}</strong>. Còn thiếu <strong className="text-amber-400 font-bold">{formatCore(totalPrice - userBalance)}</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenTopup}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Nạp Thêm Core Ngay</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Số dư ví đủ để thanh toán</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Sau mua còn: {formatCore(userBalance - totalPrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-2 gap-2.5 text-[11px] text-muted-foreground">
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Bảo hành hoàn tiền 100%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span>Giao mã tự động ngay</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handlePayWithWallet}
                disabled={isProcessing || maxStock <= 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-display font-bold text-sm shadow-glow-primary transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {isProcessing
                    ? 'Đang xử lý thanh toán...'
                    : maxStock <= 0
                    ? 'Sản phẩm tạm hết hàng'
                    : !isBalanceEnough
                    ? `Thiếu ${formatCore(totalPrice - userBalance)} • Nạp Core Ngay`
                    : `Xác Nhận Mua ${safeQty > 1 ? `(${safeQty} Gói)` : ''} • ${formatCore(totalPrice)}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </>,
  document.body
);
};
