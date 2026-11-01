import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Wrench,
  ShieldCheck,
  Search,
  LogIn,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Share2,
  Sparkles,
  Zap,
  KeyRound,
  Tv,
  Server,
  Layers,
  CheckCircle2,
  X,
  CreditCard,
  Wallet,
  Copy,
  Check,
  PlusCircle,
  Minus,
  Plus,
  AlertCircle,
  LayoutGrid,
  List,
  Package,
  BookOpen,
  ExternalLink,
  Dices,
} from 'lucide-react';
import { LuckyWheelSection } from './LuckyWheelSection';
import confetti from 'canvas-confetti';
import { CyberLoader } from './CyberLoader';
import { dataService } from '../services/dataService';
import { marketingService } from '../services/marketingService';
import { formatCore, smartVietnameseMatch } from '../utils/textUtils';
import { ProductDetailModal } from './ProductDetailModal';
import { getProductPackages, getProductMinPrice, groupUtilitiesByTheme } from '../utils/productPackageUtils';
import type { ProductPackageVariant } from '../types/game';
import type { UserProfile, UtilityProduct, OrderRecord, UtilityCategory } from '../types/game';
import { GuideLinksBanner } from './GuideLinksBanner';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { EventCountdownBadge } from './countdown/EventCountdownBadge';
import { eventSchedulerService } from '../services/eventSchedulerService';
import { templateService } from '../services/templateService';

interface UtilitiesViewProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: UserProfile | null;
  onUpdateUser?: (user: UserProfile) => void;
  onOpenAuth?: () => void;
  onOpenShare?: (utility: UtilityProduct) => void;
  onOpenWallet?: () => void;
  selectedUtilityId?: string | null;
  onClearSelectedUtility?: () => void;
}

export const UtilitiesView: React.FC<UtilitiesViewProps> = ({
  onShowToast,
  currentUser,
  onUpdateUser,
  onOpenAuth,
  onOpenShare,
  onOpenWallet,
  selectedUtilityId,
  onClearSelectedUtility,
}) => {
  const [utilities, setUtilities] = useState<UtilityProduct[]>(() => dataService.getUtilityProducts().map((u) => templateService.resolveUtility(u)));
  const [activeMainTab, setActiveMainTab] = useState<'catalog' | 'wheel'>('catalog');
  const [selectedPackage, setSelectedPackage] = useState<ProductPackageVariant | null>(null);
  const [categoriesList, setCategoriesList] = useState<UtilityCategory[]>(() => dataService.getUtilityCategories());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [cmsIntro, setCmsIntro] = useState(() => dataService.getContentByKey('utilities_section'));
  const [isGlobalSoldEnabled, setIsGlobalSoldEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wcg_utilities_global_show_sold') !== 'false' && localStorage.getItem('wcg_admin_show_sold_util') !== 'false';
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wcg_utilities_view_mode') as 'grid' | 'list';
      if (saved === 'grid' || saved === 'list') return saved;
    }
    return 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('wcg_utilities_view_mode', mode);
    } catch {}
  };

  // Selected item for detail popup
  const [selectedUtility, setSelectedUtility] = useState<UtilityProduct | null>(null);
  const [activeDetailImageIdx, setActiveDetailImageIdx] = useState<number>(0);
  const [isDetailZoomed, setIsDetailZoomed] = useState<boolean>(false);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);

  useEffect(() => {
    setActiveDetailImageIdx(0);
    setIsDetailZoomed(false);
    setIsDescExpanded(false);
  }, [selectedUtility?.id]);

  // Checkout modal
  const [checkoutUtility, setCheckoutUtility] = useState<UtilityProduct | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Sync selected utility if passed from outside
  useEffect(() => {
    if (selectedUtilityId) {
      const raw = dataService.getUtilityProducts();
      const grouped = groupUtilitiesByTheme(raw);
      const found = grouped.find(
        (u) => u.id === selectedUtilityId || (u.packages && u.packages.some((p) => p.id === selectedUtilityId))
      ) || raw.find((u) => u.id === selectedUtilityId);
      if (found) {
        setSelectedUtility(found);
      }
    }
  }, [selectedUtilityId]);

  // Deep-link check from URL hash (#utility=xxx)
  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (hash.includes('utility=')) {
        const id = hash.split('utility=')[1]?.split('&')[0];
        if (id) {
          const raw = dataService.getUtilityProducts();
          const grouped = groupUtilitiesByTheme(raw);
          const found = grouped.find(
            (u) => u.id === id || (u.packages && u.packages.some((p) => p.id === id))
          ) || raw.find((u) => u.id === id);
          if (found) setSelectedUtility(found);
        }
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  const handleCloseDetail = () => {
    setSelectedUtility(null);
    setActiveDetailImageIdx(0);
    setIsDetailZoomed(false);
    if (onClearSelectedUtility) onClearSelectedUtility();
  };

  useEffect(() => {
    // Luôn kích hoạt đồng bộ dữ liệu mới nhất từ Cloudflare D1 khi mở trang Tiện Ích
    dataService.syncWithCloudflareKV();

    const handleUpdate = () => {
      const rawLatest = dataService.getUtilityProducts().map((u) => templateService.resolveUtility(u));
      const groupedLatest = groupUtilitiesByTheme(rawLatest);
      setUtilities([...rawLatest]);
      setCategoriesList(dataService.getUtilityCategories());
      setCmsIntro(dataService.getContentByKey('utilities_section'));
      setSelectedUtility((curr) => {
        if (!curr) return null;
        // Bắt buộc tìm trong danh sách ĐÃ GOM NHÓM để bảo toàn mảng packages các gói con
        const found = groupedLatest.find(
          (u) => u.id === curr.id || (u.packages && u.packages.some((p) => p.id === curr.id))
        );
        return found || curr;
      });
      setCheckoutUtility((curr) => {
        if (!curr) return null;
        const found = groupedLatest.find(
          (u) => u.id === curr.id || (u.packages && u.packages.some((p) => p.id === curr.id))
        ) || rawLatest.find((u) => u.id === curr.id);
        return found || curr;
      });
      setSelectedPackage((currPkg) => {
        if (!currPkg) return null;
        const foundItem = rawLatest.find((u) => u.id === currPkg.id);
        if (foundItem) {
          return {
            ...currPkg,
            stock_quantity: foundItem.stock_quantity,
            price: foundItem.current_price,
            original_price: foundItem.original_price,
          };
        }
        return currPkg;
      });
      setIsGlobalSoldEnabled(
        localStorage.getItem('wcg_utilities_global_show_sold') !== 'false' && localStorage.getItem('wcg_admin_show_sold_util') !== 'false'
      );
    };

    const unsub = dataService.subscribe(handleUpdate);
    const unsubTpl = templateService.subscribe(handleUpdate);
    const unsubStock = marketingService.subscribeStockChange(handleUpdate);
    const unsubSold = marketingService.subscribeSoldCountChange(handleUpdate);
    window.addEventListener('wcg_admin_data_updated', handleUpdate);
    window.addEventListener('wcg_virtual_stock_updated', handleUpdate);
    window.addEventListener('wcg_sold_count_updated', handleUpdate);
    window.addEventListener('wcg_utilities_settings_updated', handleUpdate);
    window.addEventListener('wcg_universal_templates_updated', handleUpdate);
    window.addEventListener('wcg_utilities_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      unsub();
      unsubTpl();
      unsubStock();
      unsubSold();
      window.removeEventListener('wcg_admin_data_updated', handleUpdate);
      window.removeEventListener('wcg_virtual_stock_updated', handleUpdate);
      window.removeEventListener('wcg_sold_count_updated', handleUpdate);
      window.removeEventListener('wcg_utilities_settings_updated', handleUpdate);
      window.removeEventListener('wcg_universal_templates_updated', handleUpdate);
      window.removeEventListener('wcg_utilities_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleShareUtility = (item: UtilityProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenShare) {
      onOpenShare(item);
    } else {
      const origin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? window.location.origin
        : 'https://codegame.shop';
      const shareUrl = `${origin}/utilities#utility=${item.id}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        onShowToast('Đã sao chép link tiện ích!', `Đường dẫn: ${shareUrl}`, 'success');
      }
    }
  };

  const handleStartCheckout = (item: UtilityProduct, selectedPkg?: ProductPackageVariant | null, initialQty: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser && onOpenAuth) {
      onOpenAuth();
      onShowToast('Cần đăng nhập', 'Vui lòng đăng nhập để mua sản phẩm tiện ích.', 'info');
      return;
    }
    setCheckoutUtility(item);
    setSelectedPackage(selectedPkg || null);
    const actualRealStock = Math.max(0, Number(selectedPkg?.stock_quantity ?? item.stock_quantity ?? 0));
    const safeInitialQty = actualRealStock > 0 ? Math.max(1, Math.min(initialQty || 1, actualRealStock)) : 1;
    setQuantity(safeInitialQty);
    setCompletedOrder(null);
    setCopiedCodeIdx(null);
    setCopiedAll(false);
    const newKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    setIdempotencyKey(newKey);
  };

  const targetId = selectedPackage?.id || checkoutUtility?.id || '';
  const effectivePrice = selectedPackage?.price ?? (checkoutUtility?.current_price || 0);
  const effectiveOriginalPrice = selectedPackage?.original_price ?? (checkoutUtility?.original_price || effectivePrice);
  const effectiveTitle = selectedPackage?.name && selectedPackage.name !== checkoutUtility?.title
    ? `${checkoutUtility?.title} - ${selectedPackage.name}`
    : (checkoutUtility?.title || '');
  const realStock = Math.max(0, Number(selectedPackage?.stock_quantity ?? checkoutUtility?.stock_quantity ?? 0));
  const maxStock = realStock;
  const safeQty = realStock > 0 ? Math.min(Math.max(1, quantity), maxStock) : 0;

  useEffect(() => {
    if (realStock > 0 && quantity > realStock) {
      setQuantity(realStock);
    }
  }, [realStock, selectedPackage, checkoutUtility]);
  const userBalance = currentUser?.wallet_balance || 0;
  const totalPrice = effectivePrice * safeQty;
  const isBalanceEnough = Boolean(checkoutUtility && userBalance >= totalPrice);
  const checkoutDisplayStock = checkoutUtility ? (realStock <= 0 ? 0 : marketingService.getDisplayStock(targetId, realStock)) : 0;

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

  const handleExecutePayment = async () => {
    if (!checkoutUtility) return;
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (currentUser.session_token && typeof localStorage !== 'undefined' && !localStorage.getItem('wcg_auth_token')) {
      localStorage.setItem('wcg_auth_token', currentUser.session_token);
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
      onShowToast('Hết hàng', 'Sản phẩm tiện ích tạm thời hết hàng trong kho.', 'error');
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
      const res = await dataService.createUtilityOrder(targetId, safeQty, activeKey);
      setIsProcessing(false);

      if (res.success && res.order) {
        setCompletedOrder(res.order);
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B'],
        });
        onShowToast('Thanh toán thành công!', `Đã giao ${safeQty} sản phẩm tiện ích tức thì.`, 'success');

        // Record real order into Marketing Service
        const activeUser = currentUser || (typeof window !== 'undefined' ? dataService.getCurrentUser() : null);
        marketingService.recordRealOrder(
          effectiveTitle,
          checkoutUtility.id,
          effectivePrice * safeQty,
          'utility',
          activeUser,
          safeQty
        );

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
    marketingService.recordRealCopy(checkoutUtility?.title || 'Mã tiện ích', '', 1, activeUser);
    setCopiedCodeIdx(idx);
    onShowToast('Đã sao chép thông tin!', code, 'success');
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const handleCopyAllCodes = () => {
    if (!completedOrder) return;
    navigator.clipboard.writeText(completedOrder.code_content);
    marketingService.recordRealCopy(checkoutUtility?.title || 'Mã tiện ích', '', quantity, activeUser);
    setCopiedAll(true);
    onShowToast('Đã sao chép tất cả!', completedOrder.code_content, 'success');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleOpenTopup = () => {
    setCheckoutUtility(null);
    if (onOpenWallet) {
      onOpenWallet();
    }
  };

  // Gom nhóm các gói tiện ích cùng dòng máy ảo / chủ đề thành sản phẩm đại diện
  const groupedUtilities = useMemo(() => groupUtilitiesByTheme(utilities), [utilities]);

  // Filter & sort utilities (Mặc định ưu tiên hàng còn lên trên đầu)
  const filtered = groupedUtilities
    .filter((u) => {
      if (u.is_active === false || u.is_active === 0 || (u as any).is_active === '0') return false;
      if (filterCategory !== 'all') {
        const uCat = (u.category || '').trim().toLowerCase();
        const fCat = filterCategory.trim().toLowerCase();
        const uLabel = (u.category_label || '').trim().toLowerCase();
        if (uCat !== fCat && uLabel !== fCat) return false;
      }
      if (!search.trim()) return true;
      return smartVietnameseMatch(
        [u.title, u.description, u.category_label, u.category, u.badge],
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

  // Chỉ hiển thị danh mục hệ thống hoặc danh mục thực tế đang có sản phẩm hoạt động
  const activeCategorySet = useMemo(() => {
    const set = new Set<string>();
    utilities.forEach((u) => {
      if (u.is_active !== false && (u as any).is_active !== 0 && (u as any).is_active !== '0') {
        if (u.category) set.add(u.category.trim().toLowerCase());
        if (u.category_label) set.add(u.category_label.trim().toLowerCase());
      }
    });
    return set;
  }, [utilities]);

  const visibleCategories = categoriesList.filter((cat) => {
    if (cat.isSystem) return true;
    const catId = (cat.id || '').trim().toLowerCase();
    const catLabel = (cat.label || '').trim().toLowerCase();
    return activeCategorySet.has(catId) || activeCategorySet.has(catLabel);
  });

  const categoryTabs = [
    { id: 'all', label: 'Tất cả tiện ích', icon: Layers, rawIcon: '' },
    ...visibleCategories.map((cat) => {
      let IconComponent = Sparkles;
      if (cat.id === 'account') IconComponent = Tv;
      else if (cat.id === 'key') IconComponent = KeyRound;
      else if (cat.id === 'tool') IconComponent = Wrench;
      else if (cat.id === 'service') IconComponent = Server;
      return {
        id: cat.id,
        label: cat.label,
        icon: IconComponent,
        rawIcon: cat.icon || '',
      };
    }),
  ];

  const detailImages = (selectedUtility?.product_images && selectedUtility.product_images.length > 0)
    ? selectedUtility.product_images
    : (selectedUtility ? [selectedUtility.cover_image_url || selectedUtility.icon_url || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80'].filter(Boolean) as string[] : []);

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card via-card-hover to-card border border-border shadow-xl overflow-hidden">
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-teal-500/15 text-teal-400 text-[11px] sm:text-xs font-semibold border border-teal-500/30">
              <Wrench className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>{cmsIntro?.extraData?.badge || 'Dịch Vụ Số & Sản Phẩm Ngoài Lề'}</span>
            </div>
            <h1 className="font-display font-extrabold text-base sm:text-3xl text-foreground">
              {cmsIntro?.title || 'Tiện Ích & Dịch Vụ Chính Hãng'}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {cmsIntro?.content ||
                'Tài khoản Premium giải trí, key bản quyền phần mềm, Cloud VPS treo game và các công cụ tiện ích số độc quyền. Giao hàng tự động 100%.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-muted/60 border border-border px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-heading font-bold text-[11px] sm:text-xs text-foreground block">
                {cmsIntro?.extraData?.warrantyTitle || 'Bảo Hành 1 Đổi 1'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-300">
                {cmsIntro?.extraData?.warrantyDesc || 'Hỗ trợ kỹ thuật 24/7 tức thì'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher: Kho Tiện Ích vs Vòng Quay May Mắn */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-muted/70 border border-border shrink-0 w-fit">
        <button
          onClick={() => setActiveMainTab('catalog')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'catalog'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Kho Tiện Ích & Dịch Vụ ({utilities.length})</span>
        </button>
        <button
          onClick={() => setActiveMainTab('wheel')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'wheel'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Dices className="w-3.5 h-3.5 text-amber-300" />
          <span>🎡 Vòng Quay May Mắn</span>
        </button>
      </div>

      {activeMainTab === 'wheel' ? (
        <LuckyWheelSection
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onShowToast={onShowToast}
          onViewClaimedCodes={() => setActiveMainTab('catalog')}
          themeContext="utilities"
        />
      ) : (
        <>
          {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Category tabs - Horizontal scrollable on mobile */}
        <div className="relative flex-1 min-w-0 overflow-hidden w-full max-w-full">
          <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap scrollbar-none sm:flex-wrap pb-1 sm:pb-0 w-full max-w-full">
            {categoryTabs.map((cat) => {
              const Icon = cat.icon;
              const isCurrent = filterCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                    isCurrent
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-white'
                  }`}
                >
                  {cat.rawIcon && !['all', 'account', 'key', 'tool', 'service'].includes(cat.id) ? (
                    <span className="text-xs leading-none">{cat.rawIcon}</span>
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span>{cat.label}</span>
                </button>
              );
            })}
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
              placeholder="Tìm kiếm tiện ích, tài khoản, key..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-base sm:text-xs text-foreground placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* View Mode Toggle (Grid vs List) */}
          <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
              title="Lưới tiện ích"
              aria-label="Chế độ lưới"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-teal-600 text-white shadow-sm'
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
            Không tìm thấy tiện ích nào
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* MODE 2: LIST VIEW (Danh sách hàng ngang) */
        <div className="flex flex-col gap-2 sm:gap-2.5">
          {filtered.map((item) => {
            const flashSale = eventSchedulerService.getScheduleForProduct(item.id);
            const isFlashSaleLive = flashSale?.status === 'LIVE';
            const isFlashSaleUpcoming = flashSale?.status === 'UPCOMING';
            const effectivePrice = isFlashSaleLive && flashSale.event.sale_price ? flashSale.event.sale_price : item.current_price;
            const effectiveDiscount = isFlashSaleLive && flashSale.event.discount_percent ? flashSale.event.discount_percent : item.discount_percent;

            const displayStock =
              item.stock_quantity <= 0
                ? 0
                : marketingService.getDisplayStock(item.id, item.stock_quantity);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedUtility({ ...item, current_price: effectivePrice, discount_percent: effectiveDiscount })}
                className="bg-card hover:bg-card-hover rounded-xl sm:rounded-2xl border border-border/80 hover:border-teal-500/50 shadow-cyber-card p-2 sm:p-3 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer group active:scale-[0.99] relative overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
                  <img
                    src={item.icon_url || item.cover_image_url || '/vite.svg'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/vite.svg';
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
                    <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 truncate max-w-[120px] sm:max-w-none">
                      {item.category_label || (item.category ? item.category.toUpperCase() : 'TIỆN ÍCH')}
                    </span>
                    {isFlashSaleUpcoming && flashSale && (
                      <EventCountdownBadge
                        targetDate={flashSale.event.start_time}
                        label="Sắp Sale:"
                        theme={flashSale.event.theme || 'fire'}
                        variant="pill"
                        onExpire={() => setUtilities([...dataService.getUtilities()])}
                      />
                    )}
                    {isFlashSaleLive && flashSale && (
                      <EventCountdownBadge
                        targetDate={flashSale.event.end_time}
                        label="Hết hạn:"
                        theme={flashSale.event.theme || 'fire'}
                        variant="pill"
                        onExpire={() => setUtilities([...dataService.getUtilities()])}
                      />
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-xs sm:text-sm text-foreground group-hover:text-teal-300 transition-colors truncate">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                    {(item as any).show_stock_count !== false && (
                      <span className={`font-mono ${item.stock_quantity <= 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                        {item.stock_quantity <= 0
                          ? 'Hết hàng'
                          : (item.packages && item.packages.length > 0)
                          ? `Còn hàng (${item.stock_quantity} gói)`
                          : `Còn: ${item.stock_quantity}`}
                      </span>
                    )}
                    {isGlobalSoldEnabled && item.show_sold_count !== false && (
                      <>
                        {(item as any).show_stock_count !== false && <span>•</span>}
                        <span className="font-mono text-amber-400/90 hidden xs:inline">
                          Đã bán: {marketingService.getSoldDisplay(item)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price & Action */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="text-right">
                    <div className="font-display font-black text-xs sm:text-sm md:text-base text-emerald-400 flex items-center justify-end gap-1">
                      {item.packages && item.packages.length > 1 && <span className="text-[10px] text-muted-foreground font-normal">Từ</span>}
                      <span>{formatCore(effectivePrice)}</span>
                    </div>
                    {item.packages && item.packages.length > 1 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 inline-block">
                        {item.packages.length} gói
                      </span>
                    )}
                    {(item.original_price > effectivePrice || isFlashSaleLive) && (
                      <div className="text-[9px] sm:text-[10px] text-slate-400 line-through font-mono hidden xs:block">
                        {formatCore(item.original_price || item.current_price)}
                      </div>
                    )}
                  </div>

                  <button
                    disabled={item.stock_quantity <= 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.packages && item.packages.length > 1) {
                        setSelectedUtility({ ...item, current_price: effectivePrice, discount_percent: effectiveDiscount });
                      } else {
                        handleStartCheckout({ ...item, current_price: effectivePrice, discount_percent: effectiveDiscount }, null, 1, e);
                      }
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                      item.stock_quantity <= 0
                        ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                        : isFlashSaleLive
                        ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-md'
                        : 'bg-teal-600 hover:bg-teal-500 text-white'
                    }`}
                  >
                    <span>{item.packages && item.packages.length > 1 ? 'Chọn Gói' : (isFlashSaleLive ? 'Săn Sale' : 'Mua')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleShareUtility(item, e)}
                    className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted text-slate-400 hover:text-foreground transition-all cursor-pointer active:scale-90 hidden sm:flex"
                    title="Chia sẻ link tiện ích"
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
          {filtered.map((item) => {
            const flashSale = eventSchedulerService.getScheduleForProduct(item.id);
            const isFlashSaleLive = flashSale?.status === 'LIVE';
            const isFlashSaleUpcoming = flashSale?.status === 'UPCOMING';
            const effectivePrice = isFlashSaleLive && flashSale.event.sale_price ? flashSale.event.sale_price : item.current_price;
            const effectiveDiscount = isFlashSaleLive && flashSale.event.discount_percent ? flashSale.event.discount_percent : item.discount_percent;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedUtility({ ...item, current_price: effectivePrice, discount_percent: effectiveDiscount })}
                className="bg-card hover:bg-card-hover rounded-2xl border border-border/80 hover:border-teal-500/50 shadow-cyber-card p-2.5 sm:p-3.5 transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden min-h-[140px]"
              >
                <div>
                  {/* Top: Small Icon + Titles + Direct Share Button */}
                  <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2.5">
                    <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
                        <img
                          src={item.icon_url || item.cover_image_url || '/vite.svg'}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/vite.svg';
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
                          <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 truncate max-w-full block">
                            {item.category_label || (item.category ? item.category.toUpperCase() : 'TIỆN ÍCH')}
                          </span>
                          {isFlashSaleUpcoming && flashSale && (
                            <EventCountdownBadge
                              targetDate={flashSale.event.start_time}
                              label="Sale:"
                              theme={flashSale.event.theme || 'fire'}
                              variant="pill"
                              onExpire={() => setUtilities([...dataService.getUtilities()])}
                            />
                          )}
                          {isFlashSaleLive && flashSale && (
                            <EventCountdownBadge
                              targetDate={flashSale.event.end_time}
                              label="Hết:"
                              theme={flashSale.event.theme || 'fire'}
                              variant="pill"
                              onExpire={() => setUtilities([...dataService.getUtilities()])}
                            />
                          )}
                        </div>
                        <h3 className="font-heading font-bold text-[11px] sm:text-xs md:text-sm text-foreground group-hover:text-teal-300 transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    {/* Direct Share Button */}
                    <button
                      onClick={(e) => handleShareUtility(item, e)}
                      className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted text-slate-400 hover:text-foreground transition-all cursor-pointer active:scale-90 shrink-0"
                      title="Chia sẻ link tiện ích"
                      aria-label="Chia sẻ tiện ích"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Product description short - Clamped to 2 lines max */}
                  {item.description && (
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
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Bottom: Price in Core & 1-tap Buy button */}
                <div className="pt-2 sm:pt-2.5 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex items-baseline justify-between sm:block">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-black text-xs sm:text-sm md:text-base text-emerald-400 flex items-center gap-1">
                        {item.packages && item.packages.length > 1 && <span className="text-[10px] text-muted-foreground font-normal">Từ</span>}
                        <span>{formatCore(effectivePrice)}</span>
                      </span>
                      {(item.original_price > effectivePrice || isFlashSaleLive) && (
                        <span className="text-[9px] sm:text-[10px] text-slate-400 line-through font-mono hidden xs:inline">
                          {formatCore(item.original_price || item.current_price)}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const displayStock =
                        item.stock_quantity <= 0
                          ? 0
                          : marketingService.getDisplayStock(item.id, item.stock_quantity);
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(item as any).show_stock_count !== false && (
                            <span
                              className={`text-[9px] sm:text-[10px] font-mono ${
                                item.stock_quantity <= 0 ? 'text-rose-400 font-bold' : 'text-slate-300'
                              }`}
                            >
                              {item.stock_quantity <= 0
                                ? 'Hết hàng'
                                : (item.packages && item.packages.length > 0)
                                ? `Còn hàng (${item.stock_quantity} gói)`
                                : `Còn: ${item.stock_quantity}`}
                            </span>
                          )}
                          {isGlobalSoldEnabled && item.show_sold_count !== false && (
                            <span className="text-[9px] sm:text-[10px] font-mono text-amber-400/90">
                              {(item as any).show_stock_count !== false ? '• ' : ''}Đã bán: {marketingService.getSoldDisplay(item)}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    disabled={item.stock_quantity <= 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.packages && item.packages.length > 1) {
                        setSelectedUtility({ ...item, current_price: effectivePrice, discount_percent: effectiveDiscount });
                      } else {
                        handleStartCheckout({ ...item, current_price: effectivePrice, discount_percent: effectiveDiscount }, null, 1, e);
                      }
                    }}
                    className={`w-full sm:w-auto px-2 sm:px-3 py-1.5 min-h-[30px] sm:min-h-[34px] rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs shadow-sm transition-all flex items-center justify-center gap-1 shrink-0 ${
                      item.stock_quantity <= 0
                        ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                        : isFlashSaleLive
                        ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white cursor-pointer active:scale-95 shadow-md'
                        : 'bg-teal-600 hover:bg-teal-500 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    {item.stock_quantity <= 0 ? (
                      <span>Hết hàng</span>
                    ) : (
                      <>
                        <span>{item.packages && item.packages.length > 1 ? 'Chọn Gói' : (isFlashSaleLive ? 'Săn Sale Ngay' : 'Mua Ngay')}</span>
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
      </>
      )}

      {/* PRODUCT DETAIL MODAL 2 CỘT HIỂN THỊ CÁC GÓI CON / VARIANTS */}
      {selectedUtility && (
        <ProductDetailModal
          product={selectedUtility}
          onClose={handleCloseDetail}
          onBuyNow={(prod, pkg, qty) => {
            handleStartCheckout(prod, pkg, qty);
            setSelectedUtility(null);
          }}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onOpenShare={onOpenShare}
          onShowToast={onShowToast}
        />
      )}

      {/* CHECKOUT MODAL */}
      {checkoutUtility && typeof document !== 'undefined' && createPortal(
        <>
          {isProcessing && (
            <CyberLoader
              isOverlay={true}
              title="ĐANG XỬ LÝ TIỆN ÍCH..."
              subText="Hệ thống đang kiểm tra ví & xuất mã tiện ích từ kho bảo mật Cloudflare D1..."
            />
          )}
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in">
          <div
            className="relative w-full max-w-lg bg-card border-t sm:border border-border/90 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col h-[88dvh] sm:h-auto max-h-[88dvh] sm:max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed at top */}
            <div className="p-3.5 sm:p-5 border-b border-border/70 bg-card/95 backdrop-blur-md shrink-0 sticky top-0 z-20">
              {/* Mobile Sheet Indicator */}
              <div className="w-12 h-1.5 bg-slate-600/60 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-teal-500/20 text-teal-400 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                      {completedOrder ? 'Nhận Tiện Ích Thành Công' : 'Thanh Toán Tiện Ích'}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {effectiveTitle}
                    </p>
                  </div>
                </div>
                {/* High-visibility Close Button */}
                <button
                  onClick={() => setCheckoutUtility(null)}
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-4 sm:p-6 space-y-4 sm:space-y-5 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)]">
              {completedOrder ? (
                <div className="text-center py-3 space-y-4 animate-scale-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-glow-emerald">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="font-heading font-extrabold text-xl text-foreground">
                      Nhận Tiện Ích Thành Công!
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mã đơn: <strong className="text-foreground font-mono">{completedOrder.id}</strong> • Số lượng: <strong className="text-emerald-400">{((completedOrder.code_items && completedOrder.code_items.length > 0) ? completedOrder.code_items : completedOrder.code_content.split('\n').filter((l: string) => l.trim())).length} sản phẩm</strong>
                    </p>
                  </div>

                  {/* Code List Box */}
                  {(() => {
                    const deliveredLines: string[] = (completedOrder.code_items && completedOrder.code_items.length > 0)
                      ? completedOrder.code_items
                      : completedOrder.code_content.split('\n').filter((l: string) => l.trim());
                    return (
                      <div className="p-3 sm:p-4 rounded-2xl bg-muted/70 border border-border space-y-2.5 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-semibold">
                            Thông Tin Kích Hoạt / Tài Khoản:
                          </span>
                          {deliveredLines.length > 1 && (
                            <button
                              onClick={handleCopyAllCodes}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
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
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
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
                    );
                  })()}

                  {/* Guide link if configured */}
                  <GuideLinksBanner
                    guideLinks={checkoutUtility.guide_links}
                    guideUrl={checkoutUtility.guide_url}
                    guideText={checkoutUtility.guide_text}
                    showGuide={checkoutUtility.show_guide_link !== false}
                    theme="teal"
                  />

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Đơn hàng đã được lưu vào lịch sử & kích hoạt bảo hành 100%.</span>
                  </div>

                  <button
                    onClick={() => setCheckoutUtility(null)}
                    className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                  >
                    Hoàn Tất & Đóng
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden border border-border shrink-0">
                        <img
                          src={checkoutUtility.icon_url || checkoutUtility.cover_image_url || '/vite.svg'}
                          alt={checkoutUtility.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-sm text-foreground truncate max-w-[190px]">
                          {effectiveTitle}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {checkoutUtility.category_label || checkoutUtility.category || 'Tiện ích'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-display font-black text-base text-emerald-400 block">
                        {formatCore(effectivePrice)}
                      </span>
                      <span className={`text-[10px] font-semibold flex items-center gap-1 justify-end font-sans ${checkoutDisplayStock > 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                        {checkoutDisplayStock > 0 ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            <span>Sẵn sàng • Kích hoạt ngay</span>
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
                        className="w-14 h-9 text-center font-black font-mono text-sm bg-white text-slate-950 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm selection:bg-teal-100 disabled:opacity-50"
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

                  {/* Wallet Method Box */}
                  <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">Thanh Toán Bằng Ví Core</span>
                          <span className="text-[11px] text-muted-foreground">Khấu trừ số dư Core trực tiếp</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Số dư hiện tại</span>
                        <span className="text-sm font-black font-display text-teal-400">{formatCore(userBalance)}</span>
                      </div>
                    </div>

                    {/* Total Calculation Row */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Tổng tiền ({safeQty} gói x {formatCore(effectivePrice)}):
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
                      <Zap className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Giao thông tin tức thì</span>
                    </div>
                  </div>

                  <button
                    onClick={handleExecutePayment}
                    disabled={isProcessing || maxStock <= 0}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:opacity-95 text-white font-display font-bold text-sm shadow-glow-primary transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      {isProcessing
                        ? 'Đang xử lý thanh toán...'
                        : maxStock <= 0
                        ? 'Tiện ích tạm hết hàng'
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
    )}
    </div>
  );
};
