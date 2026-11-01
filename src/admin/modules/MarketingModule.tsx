import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Settings,
  Users,
  ShoppingBag,
  Sparkles,
  Eye,
  CheckCircle2,
  Plus,
  Trash2,
  RotateCcw,
  Clock,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  Gift,
  Flame,
  Wallet,
  Wrench,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Bell,
  BellOff,
  Check,
  Gauge,
  BarChart3,
  PackageX,
  PackagePlus,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Layers,
} from 'lucide-react';
import { TemporaryAuditTokenManager } from '../components/TemporaryAuditTokenManager';
import { VirtualLayerAnalytics } from '../components/VirtualLayerAnalytics';
import type {
  MarketingConfig,
  NotificationTypeToggles,
  NotificationTypeWeights,
  ProductMarketingConfig,
  ProductPriority,
  ToastPosition,
} from '../../types/marketing';
import {
  marketingService,
  PRESET_VIRTUAL_ACCOUNTS,
  DEFAULT_PRODUCT_MARKETING_CONFIG,
  DEFAULT_TYPE_TOGGLES,
  DEFAULT_TYPE_WEIGHTS,
  DEFAULT_DEPOSIT_PRESETS,
} from '../../services/marketingService';
import { dataService } from '../../services/dataService';
import { adminDataService } from '../services/adminDataService';
import type { StoreProduct, UtilityProduct, GiveawayCampaign } from '../../types/game';

interface MarketingModuleProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const MarketingModule: React.FC<MarketingModuleProps> = ({ onShowToast }) => {
  const [config, setConfig] = useState<MarketingConfig>(() => marketingService.getConfig());
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'types' | 'accounts' | 'products' | 'votes' | 'preview' | 'audit-token' | 'virtual-stats'>('general');
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>(() => dataService.getStoreProducts());
  const [utilityProducts, setUtilityProducts] = useState<UtilityProduct[]>(() => dataService.getUtilityProducts());
  const [giveaways, setGiveaways] = useState<GiveawayCampaign[]>(() => dataService.getGiveaways());
  const [productCategoryFilter, setProductCategoryFilter] = useState<'all' | 'store' | 'utility' | 'giveaway'>('all');
  const [productSearch, setProductSearch] = useState<string>('');
  const [realInventory, setRealInventory] = useState<any[]>([]);

  // New Account Input State
  const [newAccountInput, setNewAccountInput] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [customDepositInput, setCustomDepositInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Batch Product Setup State (Mặc định: ảo 20, bù 20 khi còn <= 1, ưu tiên x2, kho thật >= 1)
  const [batchPriority, setBatchPriority] = useState<ProductPriority>('normal');
  const [batchVirtualStock, setBatchVirtualStock] = useState<number>(20);
  const [batchThreshold, setBatchThreshold] = useState<number>(1);
  const [batchAmount, setBatchAmount] = useState<number>(20);
  const [batchMinRealStock, setBatchMinRealStock] = useState<number>(1);

  // Load real inventory to display realStock
  useEffect(() => {
    try {
      const invRaw = localStorage.getItem('wcg_admin_inventory_v4');
      if (invRaw) setRealInventory(JSON.parse(invRaw));
    } catch {}

    const handleAdminData = () => {
      setStoreProducts(dataService.getStoreProducts());
      setUtilityProducts(dataService.getUtilityProducts());
      setGiveaways(dataService.getGiveaways());
      try {
        const invRaw = localStorage.getItem('wcg_admin_inventory_v4');
        if (invRaw) setRealInventory(JSON.parse(invRaw));
      } catch {}
    };

    window.addEventListener('wcg_admin_data_updated', handleAdminData);
    return () => window.removeEventListener('wcg_admin_data_updated', handleAdminData);
  }, []);

  const getRealStockForItem = (id: string, title: string, sku?: string) => {
    const itemId = String(id || '').trim();
    const itemTitle = String(title || '').trim().toLowerCase();
    const itemSku = String(sku || '').trim().toLowerCase();

    return realInventory.filter(
      (item) =>
        item &&
        item.status === 'AVAILABLE' &&
        ((itemId && (item.sku === itemId || item.sku?.toLowerCase() === itemId.toLowerCase())) ||
          (itemTitle && (item.productName?.trim().toLowerCase() === itemTitle || item.sku?.trim().toLowerCase() === itemTitle)) ||
          (itemSku && item.sku?.toLowerCase() === itemSku))
    ).length;
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const mergedWeights: Record<string, ProductMarketingConfig> = { ...(config.productWeights || {}) };
      [...storeProducts, ...utilityProducts, ...giveaways].forEach((item) => {
        if (item && item.id && !mergedWeights[item.id]) {
          mergedWeights[item.id] = { ...DEFAULT_PRODUCT_MARKETING_CONFIG };
        }
      });
      const finalConfig = { ...config, productWeights: mergedWeights };
      await marketingService.saveConfig(finalConfig);
      setConfig(finalConfig);
      await adminDataService.pushFullStateToKV(true);
      onShowToast('Đã lưu cấu hình Marketing!', 'Cấu hình đã được đồng bộ lên Cloudflare KV và máy khách.', 'success');
    } catch (err: any) {
      onShowToast('Lỗi lưu cấu hình', err?.message || 'Không thể đồng bộ lên máy chủ. Vui lòng kiểm tra quyền quản trị.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục toàn bộ cấu hình Marketing về mặc định?')) {
      marketingService.resetToDefaults();
      setConfig(marketingService.getConfig());
      onShowToast('Đã khôi phục mặc định!', 'Toàn bộ cài đặt và danh sách tài khoản đã đặt lại.', 'info');
    }
  };

  // Add account
  const handleAddAccount = () => {
    if (!newAccountInput.trim()) return;
    const names = newAccountInput
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);

    const updated = Array.from(new Set([...config.virtualAccounts, ...names]));
    setConfig((prev) => ({ ...prev, virtualAccounts: updated }));
    setNewAccountInput('');
    onShowToast(`Đã thêm ${names.length} tài khoản!`, '', 'success');
  };

  const handleRemoveAccount = (name: string) => {
    setConfig((prev) => ({
      ...prev,
      virtualAccounts: prev.virtualAccounts.filter((a) => a !== name),
    }));
  };

  const handleLoadPresets = () => {
    const combined = Array.from(new Set([...config.virtualAccounts, ...PRESET_VIRTUAL_ACCOUNTS]));
    setConfig((prev) => ({ ...prev, virtualAccounts: combined }));
    onShowToast('Đã nạp danh sách tài khoản mẫu chuẩn (90 tài khoản)!', '', 'success');
  };

  // Product Priority & Stock config update
  const handleUpdateProductConfig = (
    productId: string,
    field: keyof ProductMarketingConfig,
    value: any
  ) => {
    setConfig((prev) => {
      const current = prev.productWeights[productId] || { ...DEFAULT_PRODUCT_MARKETING_CONFIG };
      return {
        ...prev,
        productWeights: {
          ...prev.productWeights,
          [productId]: {
            ...current,
            [field]: value,
          },
        },
      };
    });
  };

  const handleApplyBatchToAll = async () => {
    setIsSaving(true);
    try {
      const updatedWeights: Record<string, ProductMarketingConfig> = { ...config.productWeights };
      storeProducts.forEach((p) => {
        updatedWeights[p.id] = {
          priority: batchPriority,
          virtualStockBonus: batchVirtualStock,
          autoRestockThreshold: batchThreshold,
          autoRestockAmount: batchAmount,
          minRealStock: batchMinRealStock,
        };
      });
      utilityProducts.forEach((u) => {
        updatedWeights[u.id] = {
          priority: batchPriority,
          virtualStockBonus: batchVirtualStock,
          autoRestockThreshold: batchThreshold,
          autoRestockAmount: batchAmount,
          minRealStock: batchMinRealStock,
        };
      });
      giveaways.forEach((gw) => {
        updatedWeights[gw.id] = {
          priority: batchPriority,
          virtualStockBonus: batchVirtualStock,
          autoRestockThreshold: batchThreshold,
          autoRestockAmount: batchAmount,
          minRealStock: batchMinRealStock,
        };
      });
      const newConfig = { ...config, productWeights: updatedWeights };
      setConfig(newConfig);
      await marketingService.saveConfig(newConfig);
      await adminDataService.pushFullStateToKV(true);
      onShowToast(
        'Đã áp dụng và lưu thành công!',
        `Đã lưu và đồng bộ cấu hình kho ảo (+${batchVirtualStock} ảo, bù +${batchAmount} khi ≤${batchThreshold}) cho toàn bộ ${storeProducts.length} Store, ${utilityProducts.length} Tiện ích và ${giveaways.length} Giveaway lên hệ thống.`,
        'success'
      );
    } catch (err: any) {
      onShowToast(
        'Đã áp dụng mẫu (chưa lưu server)',
        `Đã cập nhật trên giao diện cục bộ. Khi lưu server gặp sự cố: ${err?.message || 'Vui lòng bấm Lưu Cấu Hình'}.`,
        'warning'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Toast Position Handler
  const handleSelectToastPosition = (pos: ToastPosition) => {
    setConfig((prev) => ({
      ...prev,
      toastPosition: pos,
    }));
    onShowToast(
      'Đã chọn vị trí thông báo',
      `Vị trí popup: ${
        pos === 'bottom-right'
          ? 'Góc dưới bên phải'
          : pos === 'top-left'
          ? 'Góc trên bên trái'
          : pos === 'top-right'
          ? 'Góc trên bên phải'
          : 'Góc dưới bên trái (mặc định)'
      }. Bấm "Lưu Cấu Hình" để áp dụng cho khách.`,
      'info'
    );
  };

  // Deposit Presets Handlers
  const handleAddDepositPreset = (rawVal: number | string) => {
    const num = typeof rawVal === 'string' ? parseInt(rawVal.replace(/\D/g, ''), 10) : rawVal;
    if (isNaN(num) || num <= 0) {
      onShowToast('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0đ.', 'warning');
      return;
    }
    const current = config.depositNotificationPresets && config.depositNotificationPresets.length > 0
      ? [...config.depositNotificationPresets]
      : [...DEFAULT_DEPOSIT_PRESETS];
    if (current.includes(num)) {
      onShowToast('Mệnh giá đã tồn tại', `Mức ${num.toLocaleString('vi-VN')}đ đã có trong danh sách.`, 'info');
      return;
    }
    const updated = [...current, num].sort((a, b) => a - b);
    setConfig((prev) => ({
      ...prev,
      depositNotificationPresets: updated,
    }));
    setCustomDepositInput('');
    onShowToast(
      'Đã thêm mức nạp tiền',
      `Đã thêm ${num.toLocaleString('vi-VN')}đ vào danh sách thông báo. Bấm "Lưu Cấu Hình" để đồng bộ.`,
      'success'
    );
  };

  const handleRemoveDepositPreset = (targetAmount: number) => {
    const current = config.depositNotificationPresets && config.depositNotificationPresets.length > 0
      ? [...config.depositNotificationPresets]
      : [...DEFAULT_DEPOSIT_PRESETS];
    if (current.length <= 1) {
      onShowToast('Cần giữ ít nhất 1 mức', 'Bạn cần giữ tối thiểu 1 mệnh giá nạp tiền để hệ thống hiển thị thông báo.', 'warning');
      return;
    }
    const updated = current.filter((amt) => amt !== targetAmount);
    setConfig((prev) => ({
      ...prev,
      depositNotificationPresets: updated,
    }));
  };

  const handleResetDepositPresets = () => {
    setConfig((prev) => ({
      ...prev,
      depositNotificationPresets: [...DEFAULT_DEPOSIT_PRESETS],
    }));
    onShowToast('Đã khôi phục mặc định', 'Đã đặt lại danh sách mức nạp về mẫu chuẩn (20k - 1.000k).', 'info');
  };

  // Test notification trigger
  const handleTestTrigger = (type: 'COPY_CODE' | 'BUY_PRODUCT' | 'BUY_UTILITY' | 'CLAIM_GIVEAWAY' | 'DEPOSIT_WALLET' | 'STATS_COPY' | 'RESTOCK_PRODUCT') => {
    try {
      localStorage.removeItem('wcg_marketing_toast_snooze_until');
      window.dispatchEvent(new CustomEvent('wcg_clear_marketing_snooze'));
    } catch {}
    const rawAccount = marketingService.getRandomVirtualAccount();
    const maskedAccount = marketingService.maskName(rawAccount);

    if (type === 'COPY_CODE') {
      const testId = `test_copy_${Date.now()}`;
      marketingService.incrementLiveCounter(1);
      marketingService.pushRealEvent({
        id: testId,
        type: 'COPY_CODE',
        title: 'Sao chép mã Giftcode',
        message: `${maskedAccount} vừa sao chép 1 Giftcode game Free Fire`,
        timeAgo: 'vừa xong',
        userName: maskedAccount,
        gameName: 'Free Fire',
        gameSlug: 'free-fire',
        isRealUser: true,
        timestamp: Date.now(),
        localOrigin: true,
      } as any, true, true);
    } else if (type === 'BUY_PRODUCT') {
      const p = storeProducts.find((item) => (item.stock_quantity ?? 0) > 0) || storeProducts[0] || { id: 'prod_test', title: 'Gói 2.000 Robux Vip', current_price: 150000 };
      const priceVal = typeof p.current_price === 'number' ? p.current_price : (Number((p as any).price) || 150000);
      const testId = `test_buy_${Date.now()}`;
      marketingService.recordVirtualSale(p.id, testId);
      marketingService.pushRealEvent({
        id: testId,
        type: 'BUY_PRODUCT',
        title: 'Mua hàng thành công',
        message: `${maskedAccount} vừa mua thành công ${p.title}`,
        timeAgo: 'vừa xong',
        userName: maskedAccount,
        productId: p.id,
        productName: p.title,
        productPrice: priceVal,
        itemType: 'store',
        isRealUser: true,
        timestamp: Date.now(),
        localOrigin: true,
      } as any, true, true);
    } else if (type === 'BUY_UTILITY') {
      const u = utilityProducts.find((item) => (item.stock_quantity ?? 0) > 0) || utilityProducts[0] || { id: 'util_test', title: 'Tài khoản Netflix Premium 1 Tháng', current_price: 65000 };
      const priceVal = typeof u.current_price === 'number' ? u.current_price : (Number((u as any).price) || 65000);
      const testId = `test_util_${Date.now()}`;
      marketingService.recordVirtualSale(u.id, testId);
      marketingService.pushRealEvent({
        id: testId,
        type: 'BUY_PRODUCT',
        title: 'Đơn hàng tiện ích',
        message: `${maskedAccount} vừa mua thành công ${u.title}`,
        timeAgo: 'vừa xong',
        userName: maskedAccount,
        productId: u.id,
        productName: u.title,
        productPrice: priceVal,
        itemType: 'utility',
        isRealUser: true,
        timestamp: Date.now(),
        localOrigin: true,
      } as any, true, true);
    } else if (type === 'CLAIM_GIVEAWAY') {
      const gw = giveaways.find((item) => (item.remaining_codes ?? 0) > 0) || giveaways[0] || { id: 'gw_test', title: 'Sự Kiện Tặng Mã Code VIP Tháng 10', game_name: 'Liên Quân Mobile', game_slug: 'lien-quan-mobile' };
      const testId = `test_gw_${Date.now()}`;
      marketingService.recordVirtualGiveawayClaim(gw.id, testId);
      marketingService.pushRealEvent({
        id: testId,
        type: 'CLAIM_GIVEAWAY',
        title: 'Giật mã quà tặng thành công',
        message: `${maskedAccount} vừa nhận mã quà tặng sự kiện ${gw.title}`,
        timeAgo: 'vừa xong',
        userName: maskedAccount,
        giveawayId: gw.id,
        gameName: gw.game_name,
        gameSlug: gw.game_slug,
        isRealUser: true,
        timestamp: Date.now(),
        localOrigin: true,
      } as any, true, true);
    } else if (type === 'DEPOSIT_WALLET') {
      const testId = `test_dep_${Date.now()}`;
      const presets = config.depositNotificationPresets && config.depositNotificationPresets.length > 0
        ? config.depositNotificationPresets
        : DEFAULT_DEPOSIT_PRESETS;
      const testAmount = presets[Math.floor(Math.random() * presets.length)];
      marketingService.pushRealEvent({
        id: testId,
        type: 'DEPOSIT_WALLET',
        title: 'Nạp tiền vào ví',
        message: `${maskedAccount} vừa nạp thành công ${testAmount.toLocaleString('vi-VN')}đ vào ví Core`,
        timeAgo: 'vừa xong',
        userName: maskedAccount,
        depositAmount: testAmount,
        isRealUser: true,
        timestamp: Date.now(),
        localOrigin: true,
      } as any, true, true);
      onShowToast('Đã bắn thử thông báo Nạp tiền Ví!', `${maskedAccount} vừa nạp thành công ${testAmount.toLocaleString('vi-VN')}đ vào ví Core.`, 'info');
    } else if (type === 'RESTOCK_PRODUCT') {
      const activeUtils = utilityProducts.filter((item) => (item.stock_quantity ?? 0) > 0 && item.is_active !== false);
      const activeStores = storeProducts.filter((item) => (item.stock_quantity ?? 0) > 0 && item.is_active !== false);
      const u = activeUtils[0] || activeStores[0];
      if (!u) {
        onShowToast('Chưa có sản phẩm còn hàng!', 'Hiện tại tất cả các mục đều hết hàng hoặc bị ẩn, vui lòng thêm tồn kho trước khi test bổ sung.', 'error');
        return;
      }
      const itemType = (u as any).category ? 'utility' : 'store';
      const testId = `test_restock_${Date.now()}`;
      marketingService.boostProductStock(u.id, 20, testId);
      marketingService.pushRealEvent({
        id: testId,
        type: 'RESTOCK_PRODUCT',
        title: 'Bổ sung tồn kho',
        message: `Kho hàng vừa bổ sung thêm +20 ${u.title}!`,
        timeAgo: 'vừa xong',
        userName: 'Hệ thống',
        productId: u.id,
        productName: u.title,
        restockAmount: 20,
        itemType,
        isRealUser: true,
        timestamp: Date.now(),
        localOrigin: true,
      } as any, true, true);
    } else {
      marketingService.incrementLiveCounter(1);
      marketingService.pushRealEvent({
        id: `test_stats_${Date.now()}`,
        type: 'STATS_COPY',
        title: 'Thống kê sôi động',
        message: `Hệ thống vừa ghi nhận ${marketingService.getLiveCounter().toLocaleString('vi-VN')} lượt sao chép giftcode hôm nay!`,
        timeAgo: 'vừa xong',
        timestamp: Date.now(),
      });
    }
    onShowToast(`Đã kích hoạt thông báo thử nghiệm (${maskedAccount})!`, 'Hãy nhìn vào góc dưới màn hình.', 'info');
  };

  const handleToggleNotificationType = async (key: keyof NotificationTypeToggles, value: boolean) => {
    const currentToggles = config.typeToggles || { ...DEFAULT_TYPE_TOGGLES };
    const updatedToggles: NotificationTypeToggles = {
      ...currentToggles,
      [key]: value,
    };
    if (key === 'buyStore' || key === 'buyUtility') {
      const isStoreOn = key === 'buyStore' ? value : updatedToggles.buyStore !== false;
      const isUtilOn = key === 'buyUtility' ? value : updatedToggles.buyUtility !== false;
      updatedToggles.buyProduct = isStoreOn || isUtilOn;
    }
    const updatedConfig: MarketingConfig = {
      ...config,
      typeToggles: updatedToggles,
    };
    setConfig(updatedConfig);
    try {
      await marketingService.saveConfig(updatedConfig);
      onShowToast(
        value ? 'Đã bật loại thông báo!' : 'Đã tạm dừng loại thông báo!',
        'Cài đặt đã tự động lưu và đồng bộ tức thì lên máy chủ & web khách.',
        'success'
      );
    } catch {
      onShowToast('Đã lưu cục bộ', 'Cài đặt đã lưu ở trình duyệt, bạn có thể bấm "Lưu Cấu Hình" để đẩy lên máy chủ.', 'info');
    }
  };

  const handleToggleAllNotificationTypes = async (enable: boolean) => {
    const updatedToggles: NotificationTypeToggles = {
      copyCode: enable,
      buyStore: enable,
      buyUtility: enable,
      buyProduct: enable,
      claimGiveaway: enable,
      depositWallet: enable,
      statsCopy: enable,
      restockProduct: enable,
    };
    const updatedConfig: MarketingConfig = {
      ...config,
      typeToggles: updatedToggles,
    };
    setConfig(updatedConfig);
    try {
      await marketingService.saveConfig(updatedConfig);
      onShowToast(
        enable ? 'Đã bật tất cả 7 loại thông báo!' : 'Đã tắt toàn bộ loại thông báo!',
        'Cài đặt đã tự động lưu và đồng bộ tức thì lên máy chủ & web khách.',
        'success'
      );
    } catch {
      onShowToast('Đã lưu cục bộ', 'Cài đặt đã lưu ở trình duyệt.', 'info');
    }
  };

  const handleToggleMasterEnabled = async (enabled: boolean) => {
    const updatedConfig: MarketingConfig = {
      ...config,
      isEnabled: enabled,
    };
    setConfig(updatedConfig);
    try {
      await marketingService.saveConfig(updatedConfig);
      onShowToast(
        enabled ? 'Đã bật bảng thông báo Marketing!' : 'Đã tạm dừng bảng thông báo Marketing!',
        'Cài đặt đã tự động lưu và áp dụng ngay lập tức.',
        'success'
      );
    } catch {
      onShowToast('Đã lưu cục bộ', 'Cài đặt đã lưu ở trình duyệt.', 'info');
    }
  };

  const handleToggleNameMasked = async (masked: boolean) => {
    const updatedConfig: MarketingConfig = {
      ...config,
      isNameMasked: masked,
    };
    setConfig(updatedConfig);
    try {
      await marketingService.saveConfig(updatedConfig);
      onShowToast(
        masked ? 'Đã bật ẩn danh tên!' : 'Đã tắt ẩn danh tên!',
        'Cài đặt đã tự động lưu thành công.',
        'success'
      );
    } catch {}
  };

  const handleWeightChange = async (key: keyof NotificationTypeWeights, value: number) => {
    const currentWeights = config.typeWeights || { ...DEFAULT_TYPE_WEIGHTS };
    const numVal = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    const updatedWeights: NotificationTypeWeights = {
      ...currentWeights,
      [key]: numVal,
    };
    if (key === 'buyStore' || key === 'buyUtility') {
      updatedWeights.buyProduct = (updatedWeights.buyStore || 0) + (updatedWeights.buyUtility || 0);
    }
    const updatedConfig: MarketingConfig = {
      ...config,
      typeWeights: updatedWeights,
    };
    setConfig(updatedConfig);
    try {
      await marketingService.saveConfig(updatedConfig);
    } catch {}
  };

  const handleApplyPreset = async (presetType: 'gw_50' | 'gw_70' | 'balanced' | 'store_60') => {
    let newWeights: NotificationTypeWeights;
    let label = '';
    if (presetType === 'gw_50') {
      newWeights = { claimGiveaway: 50, buyStore: 15, buyUtility: 10, copyCode: 15, depositWallet: 3, statsCopy: 2, buyProduct: 25, restockProduct: 5 };
      label = 'Tập trung Giveaway (50%)';
    } else if (presetType === 'gw_70') {
      newWeights = { claimGiveaway: 70, buyStore: 10, buyUtility: 5, copyCode: 10, depositWallet: 0, statsCopy: 0, buyProduct: 15, restockProduct: 5 };
      label = 'Siêu tốc Giveaway (70%)';
    } else if (presetType === 'store_60') {
      newWeights = { buyStore: 40, buyUtility: 20, claimGiveaway: 10, copyCode: 10, depositWallet: 5, statsCopy: 3, buyProduct: 60, restockProduct: 12 };
      label = 'Tập trung Bán hàng (Store 60%)';
    } else {
      newWeights = { copyCode: 25, buyStore: 20, buyUtility: 10, claimGiveaway: 20, depositWallet: 5, statsCopy: 5, buyProduct: 30, restockProduct: 15 };
      label = 'Cân bằng tự nhiên';
    }

    const updatedConfig: MarketingConfig = {
      ...config,
      typeWeights: newWeights,
    };
    setConfig(updatedConfig);
    try {
      await marketingService.saveConfig(updatedConfig);
      onShowToast(`Đã áp dụng: ${label}!`, 'Tỷ lệ phân bổ mới đã được áp dụng và lưu thành công.', 'success');
    } catch {
      onShowToast('Đã lưu cục bộ', 'Cài đặt đã lưu ở trình duyệt.', 'info');
    }
  };

  const activeTypesCount = [
    config.typeToggles?.copyCode ?? true,
    config.typeToggles?.buyStore ?? true,
    config.typeToggles?.buyUtility ?? true,
    config.typeToggles?.claimGiveaway ?? true,
    config.typeToggles?.depositWallet ?? true,
    config.typeToggles?.statsCopy ?? true,
    config.typeToggles?.restockProduct ?? true,
  ].filter(Boolean).length;

  const renderNotificationTypesSection = () => {
    const toggles = config.typeToggles || DEFAULT_TYPE_TOGGLES;
    const weights = config.typeWeights || DEFAULT_TYPE_WEIGHTS;
    const depositPresets = config.depositNotificationPresets && config.depositNotificationPresets.length > 0
      ? config.depositNotificationPresets
      : DEFAULT_DEPOSIT_PRESETS;

    const typeItems = [
      {
        key: 'copyCode' as keyof NotificationTypeToggles,
        weightKey: 'copyCode' as keyof NotificationTypeWeights,
        title: 'Sao chép mã Giftcode',
        tag: 'COPY_CODE',
        description: 'Nổ thông báo khi người dùng hoặc tài khoản hệ thống sao chép giftcode của tựa game.',
        example: 'Minh*** vừa sao chép 1 Giftcode game Free Fire',
        icon: Gift,
        color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400',
        badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        barColor: 'bg-cyan-500',
        dotColor: 'bg-cyan-400',
        testAction: () => handleTestTrigger('COPY_CODE'),
      },
      {
        key: 'buyStore' as keyof NotificationTypeToggles,
        weightKey: 'buyStore' as keyof NotificationTypeWeights,
        title: 'Đơn hàng Cửa Hàng (Store)',
        tag: 'BUY_STORE',
        description: 'Nổ thông báo khi có đơn hàng mua gói nạp game, vật phẩm, Robux từ Cửa Hàng.',
        example: 'Long*** vừa mua thành công Gói 2.000 Robux Vip',
        icon: ShoppingBag,
        color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400',
        badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        barColor: 'bg-indigo-500',
        dotColor: 'bg-indigo-400',
        testAction: () => handleTestTrigger('BUY_PRODUCT'),
      },
      {
        key: 'buyUtility' as keyof NotificationTypeToggles,
        weightKey: 'buyUtility' as keyof NotificationTypeWeights,
        title: 'Đơn hàng Tiện Ích & Tool',
        tag: 'BUY_UTILITY',
        description: 'Nổ thông báo khi khách mua tài khoản tiện ích (Netflix, Spotify, ChatGPT, Canva...).',
        example: 'Đăng*** vừa mua thành công Netflix Premium 1 Tháng',
        icon: Wrench,
        color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400',
        badgeColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
        barColor: 'bg-teal-500',
        dotColor: 'bg-teal-400',
        testAction: () => handleTestTrigger('BUY_UTILITY'),
      },
      {
        key: 'restockProduct' as keyof NotificationTypeToggles,
        weightKey: 'restockProduct' as keyof NotificationTypeWeights,
        title: 'Bổ sung tồn kho',
        tag: 'RESTOCK_PRODUCT',
        description: 'Nổ thông báo khi kho hàng tự động bù hoặc vừa nạp thêm số lượng mã/tài khoản mới.',
        example: 'Kho hàng vừa bổ sung thêm +20 VIP 7 Days VS Phone!',
        icon: PackagePlus,
        color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
        badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        barColor: 'bg-emerald-500',
        dotColor: 'bg-emerald-400',
        testAction: () => handleTestTrigger('RESTOCK_PRODUCT'),
      },
      {
        key: 'claimGiveaway' as keyof NotificationTypeToggles,
        weightKey: 'claimGiveaway' as keyof NotificationTypeWeights,
        title: 'Săn quà sự kiện Giveaway',
        tag: 'CLAIM_GIVEAWAY',
        description: 'Nổ thông báo khi thành viên săn hoặc nhận thành công mã quà tặng sự kiện.',
        example: 'Nga*** vừa nhận mã quà tặng sự kiện Code VIP Tháng 10',
        icon: Flame,
        color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400',
        badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        barColor: 'bg-rose-500',
        dotColor: 'bg-rose-400',
        testAction: () => handleTestTrigger('CLAIM_GIVEAWAY'),
      },
      {
        key: 'depositWallet' as keyof NotificationTypeToggles,
        weightKey: 'depositWallet' as keyof NotificationTypeWeights,
        title: 'Nạp tiền vào Ví Core',
        tag: 'DEPOSIT_WALLET',
        description: `Nổ thông báo khi thành viên nạp tiền thành công vào ví (${depositPresets.slice(0, 4).map(p => (p >= 1000000 ? (p / 1000000) + 'M' : (p / 1000) + 'k')).join(', ')}...).`,
        example: `Trâm*** vừa nạp thành công ${(depositPresets[0] || 200000).toLocaleString('vi-VN')}đ vào ví Core`,
        icon: Wallet,
        color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-400',
        badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        barColor: 'bg-emerald-500',
        dotColor: 'bg-emerald-400',
        testAction: () => handleTestTrigger('DEPOSIT_WALLET'),
      },
      {
        key: 'statsCopy' as keyof NotificationTypeToggles,
        weightKey: 'statsCopy' as keyof NotificationTypeWeights,
        title: 'Thống kê tổng lượt sao chép',
        tag: 'STATS_COPY',
        description: 'Nổ thông báo cột mốc tổng lượt sao chép code trong ngày kích thích tương tác.',
        example: 'Hệ thống vừa ghi nhận 1.540 lượt sao chép giftcode hôm nay!',
        icon: TrendingUp,
        color: 'from-blue-500/20 to-sky-500/10 border-blue-500/30 text-blue-400',
        badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        barColor: 'bg-blue-500',
        dotColor: 'bg-blue-400',
        testAction: () => handleTestTrigger('STATS_COPY'),
      },
    ];

    // Tính toán trọng số các loại đang BẬT
    const activeWeightsMap: Record<string, number> = {
      copyCode: toggles.copyCode !== false ? Math.max(0, Number(weights.copyCode) || 0) : 0,
      buyStore: toggles.buyStore !== false ? Math.max(0, Number(weights.buyStore) || 0) : 0,
      buyUtility: toggles.buyUtility !== false ? Math.max(0, Number(weights.buyUtility) || 0) : 0,
      restockProduct: toggles.restockProduct !== false ? Math.max(0, Number(weights.restockProduct) || 0) : 0,
      claimGiveaway: toggles.claimGiveaway !== false ? Math.max(0, Number(weights.claimGiveaway) || 0) : 0,
      depositWallet: toggles.depositWallet !== false ? Math.max(0, Number(weights.depositWallet) || 0) : 0,
      statsCopy: toggles.statsCopy !== false ? Math.max(0, Number(weights.statsCopy) || 0) : 0,
    };

    const totalActiveWeight = Object.values(activeWeightsMap).reduce((a, b) => a + b, 0);

    const getCalculatedPercent = (key: string): number => {
      if (totalActiveWeight <= 0 || !activeWeightsMap[key]) return 0;
      return Math.round((activeWeightsMap[key] / totalActiveWeight) * 100);
    };

    return (
      <div className="col-span-1 lg:col-span-2 p-5 rounded-2xl bg-card border border-border/80 space-y-5 shadow-sm">
        {/* Header & Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <span>Điều Chỉnh Tỷ Lệ & Bật/Tắt Từng Loại Thông Báo</span>
              </h3>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  activeTypesCount > 0
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {activeTypesCount}/7 ĐANG BẬT
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bật hoặc tắt độc lập từng phần thông báo FOMO và kéo thanh trượt để thay đổi tỷ lệ % xuất hiện giữa các loại.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleAllNotificationTypes(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Bật tất cả</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleAllNotificationTypes(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Tắt tất cả</span>
            </button>
          </div>
        </div>

        {/* Cảnh báo nếu công tắc tổng tắt hoặc toàn bộ loại bị tắt */}
        {!config.isEnabled && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <b>Lưu ý:</b> Công tắc tổng Marketing hiện đang <b>TẮT</b>. Để các thông báo hiển thị cho khách truy cập, bạn cần bật Công tắc tổng ở phía trên.
            </span>
          </div>
        )}

        {activeTypesCount === 0 && config.isEnabled && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              <b>Cảnh báo:</b> Bạn đã tắt toàn bộ 7 loại thông báo. Web khách sẽ không hiển thị bất kỳ thông báo nào cho đến khi bạn bật lại ít nhất 1 loại.
            </span>
          </div>
        )}

        {/* BẢNG ĐIỀU KHIỂN TỶ LỆ PHÂN BỔ TRỰC QUAN & CÁC PRESET MẪU */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Tỷ Lệ Phân Bổ Tần Suất Giữa Các Loại Thông Báo</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Tự động tính % xuất hiện thực tế dựa trên các loại đang BẬT. Kéo thanh trượt bên dưới hoặc chọn cấu hình mẫu:
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Cấu hình mẫu:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('gw_50')}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                title="Tập trung thông báo Giveaway lên 50% để số lượng giật code nhảy nhanh"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Giveaway 50% (Khuyên dùng)</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('gw_70')}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                title="Tập trung tối đa 70% Giveaway"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Giveaway 70% (Siêu tốc)</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('store_60')}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                title="Tập trung thông báo Đơn hàng Cửa Hàng & Tiện ích"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Store 60%</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('balanced')}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-500/15 hover:bg-slate-500/25 text-muted-foreground border border-border transition-all cursor-pointer shadow-sm active:scale-95"
                title="Khôi phục phân bổ cân bằng chuẩn"
              >
                <span>Cân bằng</span>
              </button>
            </div>
          </div>

          {/* Thanh Multi-segment Progress Bar hiển thị % phân bổ thực tế */}
          <div className="space-y-2">
            <div className="w-full h-3.5 rounded-full bg-slate-900 border border-border/60 overflow-hidden flex shadow-inner">
              {typeItems.map((item) => {
                const pct = getCalculatedPercent(item.key);
                if (pct <= 0) return null;
                return (
                  <div
                    key={item.key}
                    style={{ width: `${pct}%` }}
                    className={`h-full transition-all duration-300 ${item.barColor}`}
                    title={`${item.title}: ${pct}% (Trọng số: ${weights[item.weightKey] || 0})`}
                  />
                );
              })}
            </div>

            {/* Chú thích Legend tỷ lệ % */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
              {typeItems.map((item) => {
                const isEnabled = toggles[item.key] !== false;
                const pct = getCalculatedPercent(item.key);
                const w = weights[item.weightKey] ?? 0;
                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-1.5 ${
                      isEnabled ? 'text-foreground' : 'text-muted-foreground/40 line-through'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dotColor} ${!isEnabled ? 'opacity-30' : ''}`} />
                    <span className="font-medium">{item.title}:</span>
                    <span className="font-mono font-extrabold text-primary">
                      {isEnabled ? `${pct}%` : 'Đã tắt'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">({w}đ)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid 6 loại thông báo */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {typeItems.map((item) => {
            const isItemEnabled = toggles[item.key] !== false;
            const currentWeight = weights[item.weightKey] ?? 0;
            const calcPercent = getCalculatedPercent(item.key);
            const IconComponent = item.icon;

            return (
              <div
                key={item.key}
                className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden flex flex-col justify-between ${
                  isItemEnabled
                    ? 'bg-card border-border hover:border-primary/40 shadow-sm'
                    : 'bg-muted/20 border-border/60 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  {/* Header hàng ngang: Icon, Title, Switch */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border bg-gradient-to-br ${item.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-heading font-bold text-sm text-foreground">
                            {item.title}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                          {item.tag}
                        </span>
                      </div>
                    </div>

                    {/* Switch Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={isItemEnabled}
                        onChange={(e) => handleToggleNotificationType(item.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Mô tả tính năng */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Khung mô phỏng tin nhắn mẫu */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Mẫu tin nhắn hiển thị:
                    </div>
                    <p className="text-foreground font-medium italic">
                      &quot;{item.example}&quot;
                    </p>
                  </div>

                  {/* THANH TRƯỢT ĐIỀU CHỈNH TRỌNG SỐ CHO LOẠI NÀY */}
                  <div className={`p-3 rounded-xl border transition-all space-y-2 ${
                    isItemEnabled
                      ? 'bg-muted/20 border-border/70'
                      : 'bg-muted/10 border-border/40 opacity-60 pointer-events-none'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-primary" />
                        <span>Trọng số phân bổ:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 border border-primary/25 text-primary font-bold">
                          {isItemEnabled ? `~${calcPercent}% thực tế` : 'Đã tắt'}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={!isItemEnabled}
                          value={currentWeight}
                          onChange={(e) => handleWeightChange(item.weightKey, Number(e.target.value))}
                          className="w-14 px-2 py-0.5 text-right rounded-md bg-card border border-border text-foreground font-mono text-xs font-bold"
                        />
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      disabled={!isItemEnabled}
                      value={currentWeight}
                      onChange={(e) => handleWeightChange(item.weightKey, Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>0 (Tắt)</span>
                      <span>25</span>
                      <span>50 (Cao)</span>
                      <span>75</span>
                      <span>100 (Tối đa)</span>
                    </div>
                  </div>

                  {/* CẤU HÌNH CÁC MỨC SỐ TIỀN NẠP VÍ TÙY CHỌN */}
                  {item.tag === 'DEPOSIT_WALLET' && (
                    <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Mức nạp hiển thị ngẫu nhiên ({depositPresets.length} mức)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetDepositPresets}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer"
                          title="Đặt lại các mức nạp chuẩn mẫu (20k đến 1.000k)"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Mặc định</span>
                        </button>
                      </div>

                      {/* Chips danh sách các mức nạp hiện có */}
                      <div className="flex flex-wrap gap-1.5">
                        {depositPresets.map((amt) => (
                          <span
                            key={amt}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-xs"
                          >
                            <span>{amt.toLocaleString('vi-VN')} đ</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDepositPreset(amt)}
                              className="text-amber-400/70 hover:text-rose-400 hover:bg-rose-500/20 rounded p-0.5 transition-colors cursor-pointer"
                              title={`Xóa mức ${amt.toLocaleString('vi-VN')}đ`}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Hàng nút thêm nhanh các mệnh giá phổ biến */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] text-muted-foreground font-semibold">
                          Thêm nhanh mệnh giá phổ biến:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: '+20k', val: 20000 },
                            { label: '+50k', val: 50000 },
                            { label: '+100k', val: 100000 },
                            { label: '+200k', val: 200000 },
                            { label: '+300k', val: 300000 },
                            { label: '+500k', val: 500000 },
                            { label: '+1M', val: 1000000 },
                            { label: '+2M', val: 2000000 },
                            { label: '+5M', val: 5000000 },
                          ].map((p) => {
                            const isIncluded = depositPresets.includes(p.val);
                            return (
                              <button
                                key={p.val}
                                type="button"
                                disabled={isIncluded}
                                onClick={() => handleAddDepositPreset(p.val)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer ${
                                  isIncluded
                                    ? 'bg-muted/40 text-muted-foreground/50 border border-border/40 cursor-not-allowed'
                                    : 'bg-muted hover:bg-amber-500/20 text-foreground hover:text-amber-300 border border-border/70 hover:border-amber-500/40 active:scale-95'
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ô nhập số tiền tùy chỉnh */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={customDepositInput}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setCustomDepositInput(raw ? Number(raw).toLocaleString('vi-VN') : '');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDepositPreset(customDepositInput);
                              }
                            }}
                            placeholder="Nhập số tiền khác (VD: 250.000)"
                            className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">
                            đ
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddDepositPreset(customDepositInput)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                        💡 Hệ thống sẽ tự động bốc ngẫu nhiên 1 trong các mức trên để hiển thị thông báo nạp ví cho khách. Nhớ bấm <b>&quot;Lưu Cấu Hình&quot;</b> ở đầu trang sau khi thay đổi.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer hàng nút thao tác */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs mt-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isItemEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {isItemEnabled ? 'Đang hoạt động' : 'Đã tạm dừng'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={item.testAction}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer active:scale-95"
                    title="Bắn thử thông báo này để xem giao diện"
                  >
                    <Eye className="w-3 h-3 text-primary" />
                    <span>Bắn thử</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const filteredAccounts = (config?.virtualAccounts || []).filter((a) =>
    a.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const MARKETING_SUB_TABS: Array<{
    id: 'general' | 'types' | 'accounts' | 'products' | 'votes' | 'preview' | 'audit-token' | 'virtual-stats';
    index: number;
    total: number;
    shortTitle: string;
    fullTitle: string;
    subtext: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeTone?: 'emerald' | 'amber' | 'primary' | 'muted';
    isLast?: boolean;
  }> = [
    {
      id: 'general',
      index: 1,
      total: 8,
      shortTitle: 'Chung & Tần Suất',
      fullTitle: 'Cấu hình Chung & Tần suất',
      subtext: 'Bật/tắt, vị trí & chu kỳ',
      icon: Settings,
      badge: config.isEnabled ? 'Đang Bật' : 'Đang Tắt',
      badgeTone: config.isEnabled ? 'emerald' : 'muted',
    },
    {
      id: 'types',
      index: 2,
      total: 8,
      shortTitle: 'Bật/Tắt Loại Tin',
      fullTitle: 'Bật/Tắt Từng Loại Thông Báo',
      subtext: 'Tỷ lệ % phân bổ 7 loại',
      icon: SlidersHorizontal,
      badge: `${activeTypesCount}/7 Bật`,
      badgeTone: activeTypesCount > 0 ? 'emerald' : 'amber',
    },
    {
      id: 'accounts',
      index: 3,
      total: 8,
      shortTitle: 'Tài Khoản Ảo',
      fullTitle: 'Quản Lý Tài Khoản Hệ Thống',
      subtext: 'Bốc ngẫu nhiên tạo FOMO',
      icon: Users,
      badge: `${(config?.virtualAccounts || []).length} nick`,
      badgeTone: 'primary',
    },
    {
      id: 'products',
      index: 4,
      total: 8,
      shortTitle: 'Sản Phẩm & Kho',
      fullTitle: 'Ưu Tiên Sản Phẩm & Kho Ảo',
      subtext: 'Trọng số xuất hiện & tồn',
      icon: ShoppingBag,
      badge: 'Store/Tool',
      badgeTone: 'muted',
    },
    {
      id: 'votes',
      index: 5,
      total: 8,
      shortTitle: 'Bình Chọn Code',
      fullTitle: 'Tỉ Lệ Bình Chọn Code',
      subtext: 'Giả lập vote hoạt động',
      icon: TrendingUp,
      badge: `${config?.voteConfig?.activeRate ?? 96}% Uy tín`,
      badgeTone: 'emerald',
    },
    {
      id: 'preview',
      index: 6,
      total: 8,
      shortTitle: 'Giả Lập & Test',
      fullTitle: 'Trình Giả Lập & Bắn Thử',
      subtext: 'Bắn thử popup',
      icon: Eye,
      badge: 'Test Live',
      badgeTone: 'amber',
    },
    {
      id: 'audit-token',
      index: 7,
      total: 8,
      shortTitle: 'Khóa Kiểm Toán (2FA)',
      fullTitle: 'Khóa Kiểm Toán Tạm Thời (2FA)',
      subtext: 'Cấp quyền Pine AI / Muse Bot',
      icon: KeyRound,
      badge: '2FA Bảo Mật',
      badgeTone: 'primary',
    },
    {
      id: 'virtual-stats',
      index: 8,
      total: 8,
      shortTitle: 'Thống Kê Ảo (SSOT)',
      fullTitle: 'Thống Kê Ảo & 3 Cột Đối Soát',
      subtext: 'Thật vs Ảo vs Hiển Thị',
      icon: Layers,
      badge: '2 Lớp SSOT',
      badgeTone: 'primary',
      isLast: true,
    },
  ];

  const currentTabIndex = MARKETING_SUB_TABS.findIndex((t) => t.id === activeSubTab);
  const currentTab = MARKETING_SUB_TABS[currentTabIndex !== -1 ? currentTabIndex : 0];
  const prevTab = currentTabIndex > 0 ? MARKETING_SUB_TABS[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < MARKETING_SUB_TABS.length - 1 ? MARKETING_SUB_TABS[currentTabIndex + 1] : null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
                Bảng Thông Báo Marketing & FOMO
              </h2>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  config.isEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {config.isEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Hệ thống giả lập thông báo mua hàng, copy code và nạp tiền kích thích tâm lý đám đông (Social Proof).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
            title="Khôi phục mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* THANH ĐIỀU HƯỚNG 6 MỤC CÀI ĐẶT: 100% HIỂN THỊ TRỌN VẸN TRONG 1 MÀN HÌNH */}
      {/* ==================================================================== */}
      <div className="sticky top-2 z-30 space-y-2 p-2 sm:p-2.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border/90 shadow-md">
        {/* Thanh trạng thái tổng quan: Làm rõ chính xác có 6/6 mục cài đặt, không có mục ẩn */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-extrabold text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Bản Đồ 6 Mục Cài Đặt FOMO</span>
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/15 text-primary-light border border-primary/30 font-mono font-bold">
              Đang xem: Mục {currentTabIndex + 1}/6 — {currentTab.fullTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span className="hidden sm:inline">Tổng cộng: Đúng 6 mục cài đặt (Không có mục ẩn)</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
              Mục 6/6 là mục kết thúc
            </span>
          </div>
        </div>

        {/* Lưới 6 Tab Cân Bằng Hoàn Hảo (Grid 6 Columns on Desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-1.5 sm:gap-2">
          {MARKETING_SUB_TABS.map((tab) => {
            const isActive = activeSubTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                title={`${tab.index}/6: ${tab.fullTitle} • ${tab.subtext}`}
                className={`group relative flex flex-col justify-between p-2 sm:p-2.5 rounded-xl text-left transition-all cursor-pointer border select-none ${
                  isActive
                    ? 'bg-gradient-to-br from-primary via-primary to-primary-hover text-white border-primary shadow-md shadow-primary/25 ring-2 ring-primary/40'
                    : 'bg-muted/30 hover:bg-muted/70 text-muted-foreground hover:text-foreground border-border/70 hover:border-border'
                }`}
              >
                {/* Dòng 1: Huy hiệu số thứ tự 1/6 -> 6/6 và nhãn trạng thái */}
                <div className="flex items-center justify-between w-full gap-1 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-card text-foreground border border-border/60'
                    }`}
                  >
                    <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-primary'}`} />
                    <span>{tab.index}/6</span>
                  </span>

                  {tab.badge && (
                    <span
                      className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md border shrink-0 ${
                        isActive
                          ? 'bg-white/25 text-white border-white/40'
                          : tab.badgeTone === 'emerald'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : tab.badgeTone === 'amber'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                          : tab.badgeTone === 'primary'
                          ? 'bg-primary/15 text-primary-light border-primary/30'
                          : 'bg-muted text-muted-foreground border-border/60'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Dòng 2: Tên mục sắc nét, không gãy dòng */}
                <div className="w-full">
                  <div
                    className={`font-heading font-extrabold text-[11px] sm:text-xs leading-tight truncate ${
                      isActive ? 'text-white' : 'text-foreground group-hover:text-primary-light'
                    }`}
                  >
                    {tab.shortTitle}
                  </div>
                  <div
                    className={`text-[9px] sm:text-[10px] leading-tight truncate mt-0.5 ${
                      isActive ? 'text-white/80' : 'text-muted-foreground'
                    }`}
                  >
                    {tab.subtext}
                  </div>
                </div>

                {/* Dấu gạch active indicator */}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-white shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SUB-TAB 1: CẤU HÌNH CHUNG & TẦN SUẤT                                 */}
      {/* ==================================================================== */}
      {activeSubTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card: Bật / Tắt Từng Loại Thông Báo */}
          {renderNotificationTypesSection()}

          {/* Box 1: Bật tắt & Thời gian */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Thiết lập Hiển thị & Tần suất</span>
            </h3>

            {/* Công tắc tổng */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <p className="font-bold text-sm text-foreground">Bật bảng thông báo Marketing</p>
                <p className="text-xs text-muted-foreground">Kích hoạt hiển thị popup ở góc dưới bên trái web khách.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => handleToggleMasterEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Ẩn tên một phần */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <p className="font-bold text-sm text-foreground">Ẩn tên một phần (Masking Privacy)</p>
                <p className="text-xs text-muted-foreground">
                  Ví dụ: <code className="text-primary-light">098****321</code>, <code className="text-primary-light">Minh***</code> thay vì để lộ tên đầy đủ.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isNameMasked}
                  onChange={(e) => handleToggleNameMasked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Vị trí hiển thị Popup Toast trên màn hình */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span>Vị trí hiển thị trên màn hình</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chọn góc màn hình mà thông báo nổi (Toast) sẽ xuất hiện trên thiết bị của khách.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 border border-primary/25 text-primary font-bold shrink-0">
                  {config.toastPosition === 'bottom-right'
                    ? 'Dưới - Phải'
                    : config.toastPosition === 'top-left'
                    ? 'Trên - Trái'
                    : config.toastPosition === 'top-right'
                    ? 'Trên - Phải'
                    : 'Dưới - Trái (Mặc định)'}
                </span>
              </div>

              {/* 4 Corner Options */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'bottom-left' as ToastPosition,
                    label: 'Dưới - Trái',
                    sub: 'Khuyên dùng (chuẩn)',
                    cornerDot: 'bottom-1.5 left-1.5',
                  },
                  {
                    id: 'bottom-right' as ToastPosition,
                    label: 'Dưới - Phải',
                    sub: 'Góc phải màn hình',
                    cornerDot: 'bottom-1.5 right-1.5',
                  },
                  {
                    id: 'top-left' as ToastPosition,
                    label: 'Trên - Trái',
                    sub: 'Dưới thanh Menu trái',
                    cornerDot: 'top-1.5 left-1.5',
                  },
                  {
                    id: 'top-right' as ToastPosition,
                    label: 'Trên - Phải',
                    sub: 'Dưới thanh Menu phải',
                    cornerDot: 'top-1.5 right-1.5',
                  },
                ].map((pos) => {
                  const isSelected = (config.toastPosition || 'bottom-left') === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => handleSelectToastPosition(pos.id)}
                      className={`relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary/15 border-primary shadow-sm text-foreground ring-1 ring-primary'
                          : 'bg-card hover:bg-muted/70 border-border/80 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {/* Mini monitor preview with active dot */}
                      <div className="relative w-8 h-6 rounded border border-border bg-slate-900 shrink-0 flex items-center justify-center overflow-hidden">
                        <div
                          className={`absolute w-1.5 h-1.5 rounded-full transition-all ${pos.cornerDot} ${
                            isSelected
                              ? 'bg-primary shadow-[0_0_6px_rgba(234,88,12,0.9)] scale-125'
                              : 'bg-slate-600'
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {pos.label}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{pos.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider 1: Thời gian hiển thị */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Thời gian hiển thị mỗi popup</span>
                <span className="text-primary font-mono font-bold">{config.displayDuration} giây</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={config.displayDuration}
                onChange={(e) => setConfig((prev) => ({ ...prev, displayDuration: Number(e.target.value) }))}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">Khuyến nghị: 4 - 6 giây để khách kịp đọc mà không gây vướng.</p>
            </div>

            {/* Slider 2: Khoảng cách giữa 2 thông báo */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Cách nhau tối thiểu (giây)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={config.intervalMin}
                  onChange={(e) => setConfig((prev) => ({ ...prev, intervalMin: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Cách nhau tối đa (giây)</label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={config.intervalMax}
                  onChange={(e) => setConfig((prev) => ({ ...prev, intervalMax: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                />
              </div>

              <div className="col-span-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300 leading-relaxed">
                💡 <b>Mẹo tăng tốc Giật Giveaway & Đơn hàng:</b> Giảm khoảng cách tối thiểu xuống <b>4 - 6 giây</b> và tối đa xuống <b>8 - 12 giây</b> để thông báo nổi liên tục hơn. Kết hợp với việc chọn mẫu <b>Giveaway 50%</b> hoặc kéo tăng trọng số Giveaway ở bảng bên cạnh, số lượng giật code sẽ tăng tốc vù vù!
              </div>
            </div>

            {/* Độ trễ khi khách mới vào trang */}
            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-foreground">Độ trễ xuất hiện lần đầu khi vào trang</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={config.initialDelay}
                  onChange={(e) => setConfig((prev) => ({ ...prev, initialDelay: Number(e.target.value) }))}
                  className="w-24 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                />
                <span className="text-xs text-muted-foreground">giây sau khi khách mở web mới hiện popup đầu tiên.</span>
              </div>
            </div>

            {/* Thời gian chờ (CD) cho thông báo người dùng thật */}
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Thời gian chờ (CD) thông báo người dùng thật</span>
                </span>
                <span className="text-blue-400 font-mono font-bold text-sm">
                  {config.realUserCooldownSec ?? 20} giây
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={config.realUserCooldownSec ?? 20}
                onChange={(e) => setConfig((prev) => ({ ...prev, realUserCooldownSec: Number(e.target.value) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>5s (Nhanh)</span>
                <span>20s (Mặc định)</span>
                <span>35s</span>
                <span>60s (Chặt chẽ)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Khoảng cách tối thiểu giữa các thông báo từ cùng một người dùng/thao tác sao chép code để chống spam trên toàn hệ thống. Mặc định 20 giây.
              </p>
            </div>

            {/* Cài đặt độ trễ thời gian ngẫu nhiên (Từ Vừa xong đến 30s - 600s) */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Mô phỏng độ trễ thời gian ngẫu nhiên</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tạo nhãn thời gian từ &quot;vừa xong&quot; đến số giây tối đa để web trông chân thực và tự nhiên hơn.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={config.timeAgoConfig?.enabled !== false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        timeAgoConfig: {
                          enabled: e.target.checked,
                          maxDelaySeconds: prev.timeAgoConfig?.maxDelaySeconds ?? 30,
                        },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {config.timeAgoConfig?.enabled !== false && (
                <div className="space-y-2 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">Thời gian trễ tối đa:</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">
                      {config.timeAgoConfig?.maxDelaySeconds ?? 30} giây (
                      {(config.timeAgoConfig?.maxDelaySeconds ?? 30) >= 60
                        ? `${Math.floor((config.timeAgoConfig?.maxDelaySeconds ?? 30) / 60)} phút ${(config.timeAgoConfig?.maxDelaySeconds ?? 30) % 60 > 0 ? `${(config.timeAgoConfig?.maxDelaySeconds ?? 30) % 60}s` : ''}`.trim()
                        : `${config.timeAgoConfig?.maxDelaySeconds ?? 30}s`}
                      )
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="600"
                    step="5"
                    value={config.timeAgoConfig?.maxDelaySeconds ?? 30}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        timeAgoConfig: {
                          enabled: prev.timeAgoConfig?.enabled !== false,
                          maxDelaySeconds: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>5s</span>
                    <span>30s (Mặc định)</span>
                    <span>120s (2p)</span>
                    <span>300s (5p)</span>
                    <span>600s (10p)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300/90 space-y-1">
                    <p className="font-semibold text-emerald-200">
                      💡 Quy tắc hiển thị:
                    </p>
                    <p>• Từ 0s - 4s: Hiện <b>&quot;vừa xong&quot;</b></p>
                    <p>• Từ 5s - 59s: Hiện <b>&quot;Xs trước&quot;</b> (ví dụ: 12s trước, 28s trước)</p>
                    <p>• Từ 60s trở lên: Hiện <b>&quot;X phút trước&quot;</b> (ví dụ: 2 phút trước, 5 phút trước)</p>
                    <p className="text-amber-300 font-medium pt-0.5">
                      ⭐ Ngoại lệ: Thông báo <b>&quot;Tổng số lượt sao chép&quot;</b> luôn cố định 100% là <b>&quot;vừa xong&quot;</b>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Box 2: Khung giờ cao điểm */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Khung Giờ Cao Điểm (Peak Hours)</span>
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <p className="font-bold text-sm text-foreground">Kích hoạt chế độ Cao điểm</p>
                <p className="text-xs text-muted-foreground">Tự động tăng gấp bội tần suất thông báo trong giờ vàng.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.peakHours.enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      peakHours: { ...prev.peakHours, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Giờ bắt đầu</label>
                <input
                  type="time"
                  value={config.peakHours.startTime}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      peakHours: { ...prev.peakHours, startTime: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Giờ kết thúc</label>
                <input
                  type="time"
                  value={config.peakHours.endTime}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      peakHours: { ...prev.peakHours, endTime: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Hệ số nhân tần suất cao điểm</span>
                <span className="text-amber-400 font-mono font-bold">x{config.peakHours.multiplier} lần</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="4.0"
                step="0.5"
                value={config.peakHours.multiplier}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    peakHours: { ...prev.peakHours, multiplier: Number(e.target.value) },
                  }))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">
                Ví dụ chọn x2.0: Bình thường cách 20s sẽ hiện 1 lần, trong giờ cao điểm rút ngắn còn 10s một lần.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Trạng thái hiện tại:</span>
              </p>
              <p className="text-[11px] text-muted-foreground font-sans">
                {marketingService.isCurrentPeakHour()
                  ? '🔥 Đang trong khung giờ cao điểm! Thông báo được tăng tốc.'
                  : '⏳ Đang ở khung giờ tiêu chuẩn.'}
              </p>
            </div>
          </div>

          {/* Box 3: Cộng Dồn Tăng Trưởng Ngoại Tuyến (Offline Catch-Up Engine) */}
          <div className="col-span-1 lg:col-span-2 p-5 rounded-2xl bg-card border border-border/80 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-primary" />
                  <span>Cộng Dồn Tăng Trưởng Ngoại Tuyến (Offline Catch-Up Engine)</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Lấy mốc đã lưu làm điểm tựa + tự động cộng thêm thời gian ngoại tuyến. Khắc phục triệt để việc mở lại web số bị đứng im do kẹt mốc cũ.
                </p>
              </div>

              {/* Bật / Tắt chế độ */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-semibold text-foreground">
                  {config.offlineCatchUp?.enabled ?? true ? 'Đang Bật' : 'Đang Tắt'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.offlineCatchUp?.enabled ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        offlineCatchUp: {
                          ...prev.offlineCatchUp,
                          enabled: e.target.checked,
                          scope: prev.offlineCatchUp?.scope ?? 'all',
                          mode: prev.offlineCatchUp?.mode ?? 'auto',
                          intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                          incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                          maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                          outOfStockEnabled: prev.offlineCatchUp?.outOfStockEnabled ?? false,
                          outOfStockMaxUnits: prev.offlineCatchUp?.outOfStockMaxUnits ?? 10,
                          outOfStockIncrementStep: prev.offlineCatchUp?.outOfStockIncrementStep ?? 1,
                        },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {config.offlineCatchUp?.enabled !== false && (
              <div className="space-y-4 pt-2 border-t border-border/60">
                {/* 1. Phạm vi áp dụng */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>Phạm vi áp dụng (Target Scope)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          offlineCatchUp: {
                            ...prev.offlineCatchUp,
                            enabled: prev.offlineCatchUp?.enabled ?? true,
                            scope: 'all',
                            mode: prev.offlineCatchUp?.mode ?? 'auto',
                            intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                            incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                            maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                          },
                        }))
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        (config.offlineCatchUp?.scope ?? 'all') === 'all'
                          ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/40'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <span>🌐 Toàn bộ web khách & Máy chủ (Khuyến nghị)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Mỗi khi khách hàng quay lại web, số đã bán / đã nhận sẽ tự động nhảy lên mốc mới tương ứng thời gian vắng mặt, đồng bộ cùng snapshot máy chủ.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          offlineCatchUp: {
                            ...prev.offlineCatchUp,
                            enabled: prev.offlineCatchUp?.enabled ?? true,
                            scope: 'server_only',
                            mode: prev.offlineCatchUp?.mode ?? 'auto',
                            intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                            incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                            maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                          },
                        }))
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        config.offlineCatchUp?.scope === 'server_only'
                          ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/40'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <span>🖥️ Chỉ điều chỉnh bộ đếm toàn máy chủ</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Chỉ áp dụng thuật toán tăng trưởng trên số liệu gốc từ máy chủ Cloudflare, không ép tăng cục bộ vào bộ nhớ đệm trình duyệt của người dùng.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Chế độ tính toán tăng trưởng */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>Phương thức tính toán (Calculation Mode)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          offlineCatchUp: {
                            ...prev.offlineCatchUp,
                            enabled: prev.offlineCatchUp?.enabled ?? true,
                            scope: prev.offlineCatchUp?.scope ?? 'all',
                            mode: 'auto',
                            intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                            incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                            maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                          },
                        }))
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        (config.offlineCatchUp?.mode ?? 'auto') === 'auto'
                          ? 'bg-emerald-500/10 border-emerald-500 text-foreground shadow-sm ring-1 ring-emerald-500/40'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tự động tăng đều theo thiết lập khác (Mặc định)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Tính tự động theo mức ưu tiên sản phẩm (Cao: ~10p/đơn, Bình thường: ~18p/đơn, Thấp: ~35p/đơn) và tự động tăng tốc theo Khung giờ cao điểm.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          offlineCatchUp: {
                            ...prev.offlineCatchUp,
                            enabled: prev.offlineCatchUp?.enabled ?? true,
                            scope: prev.offlineCatchUp?.scope ?? 'all',
                            mode: 'custom',
                            intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                            incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                            maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                          },
                        }))
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        config.offlineCatchUp?.mode === 'custom'
                          ? 'bg-amber-500/10 border-amber-500 text-foreground shadow-sm ring-1 ring-amber-500/40'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tùy chỉnh số lượng cố định</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Tự chỉ định số phút mỗi bước và số đơn cố định cộng thêm cho mỗi bước khi người dùng rời web.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 3. Tùy chỉnh chi tiết khi chọn Mode Custom */}
                {config.offlineCatchUp?.mode === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Chu kỳ thời gian mỗi bước</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={config.offlineCatchUp?.intervalMinutes ?? 15}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              offlineCatchUp: {
                                ...prev.offlineCatchUp,
                                enabled: prev.offlineCatchUp?.enabled ?? true,
                                scope: prev.offlineCatchUp?.scope ?? 'all',
                                mode: 'custom',
                                intervalMinutes: Math.max(1, Number(e.target.value)),
                                incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                                maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                              },
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">phút</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Ví dụ: Cứ mỗi 15 phút khách đóng web.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Số đơn tăng mỗi chu kỳ</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={config.offlineCatchUp?.incrementStep ?? 1}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              offlineCatchUp: {
                                ...prev.offlineCatchUp,
                                enabled: prev.offlineCatchUp?.enabled ?? true,
                                scope: prev.offlineCatchUp?.scope ?? 'all',
                                mode: 'custom',
                                intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                                incrementStep: Math.max(1, Number(e.target.value)),
                                maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                              },
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">đơn</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Ví dụ: Mỗi 15 phút tăng thêm +1 đơn.</p>
                    </div>
                  </div>
                )}

                {/* 4. Giới hạn tăng tối đa */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">Giới hạn số lượng tăng tối đa khi vắng mặt lâu:</span>
                    <span className="text-primary font-mono font-bold text-sm">
                      +{config.offlineCatchUp?.maxCatchUpUnits ?? 30} đơn tối đa
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={config.offlineCatchUp?.maxCatchUpUnits ?? 30}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        offlineCatchUp: {
                          ...prev.offlineCatchUp,
                          enabled: prev.offlineCatchUp?.enabled ?? true,
                          scope: prev.offlineCatchUp?.scope ?? 'all',
                          mode: prev.offlineCatchUp?.mode ?? 'auto',
                          intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                          incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                          maxCatchUpUnits: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>5 đơn</span>
                    <span>30 đơn (Mặc định)</span>
                    <span>60 đơn</span>
                    <span>100 đơn</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Giữ cho số liệu luôn tự nhiên, ngăn ngừa việc số tăng vọt quá lớn nếu khách hàng không vào web trong thời gian dài.
                  </p>
                </div>

                {/* 5. Bù ngoại tuyến riêng cho sản phẩm đã hết hàng (Out of Stock Catch-Up) */}
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-xs text-foreground flex items-center gap-1.5">
                          <PackageX className="w-3.5 h-3.5 text-amber-500" />
                          <span>Bù ngoại tuyến cho sản phẩm đã hết hàng (Out of Stock)</span>
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          config.offlineCatchUp?.outOfStockEnabled
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {config.offlineCatchUp?.outOfStockEnabled ? 'Đang Bật' : 'Mặc định Tắt'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Cho phép các sản phẩm / mã giveaway đã hết hàng thật trong kho tiếp tục bù thêm đơn ảo khi khách tắt web.
                        Khi tắt (khuyến nghị), sản phẩm hết hàng sẽ dừng tăng trưởng ảo 100%.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.offlineCatchUp?.outOfStockEnabled ?? false}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              offlineCatchUp: {
                                ...prev.offlineCatchUp,
                                enabled: prev.offlineCatchUp?.enabled ?? true,
                                scope: prev.offlineCatchUp?.scope ?? 'all',
                                mode: prev.offlineCatchUp?.mode ?? 'auto',
                                intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                                incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                                maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                                outOfStockEnabled: e.target.checked,
                                outOfStockMaxUnits: prev.offlineCatchUp?.outOfStockMaxUnits ?? 10,
                                outOfStockIncrementStep: prev.offlineCatchUp?.outOfStockIncrementStep ?? 1,
                              },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>
                  </div>

                  {/* Điều chỉnh số khi bật Bù cho hàng hết */}
                  {config.offlineCatchUp?.outOfStockEnabled && (
                    <div className="pt-3 border-t border-amber-500/20 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-foreground">Giới hạn số đơn bù tối đa cho hàng hết kho:</span>
                        <span className="text-amber-500 font-mono font-bold text-sm">
                          +{config.offlineCatchUp?.outOfStockMaxUnits ?? 10} đơn tối đa
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="50"
                          step="1"
                          value={config.offlineCatchUp?.outOfStockMaxUnits ?? 10}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              offlineCatchUp: {
                                ...prev.offlineCatchUp,
                                enabled: prev.offlineCatchUp?.enabled ?? true,
                                scope: prev.offlineCatchUp?.scope ?? 'all',
                                mode: prev.offlineCatchUp?.mode ?? 'auto',
                                intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                                incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                                maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                                outOfStockEnabled: true,
                                outOfStockMaxUnits: Math.max(1, Number(e.target.value)),
                                outOfStockIncrementStep: prev.offlineCatchUp?.outOfStockIncrementStep ?? 1,
                              },
                            }))
                          }
                          className="flex-1 accent-amber-500 cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={config.offlineCatchUp?.outOfStockMaxUnits ?? 10}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                offlineCatchUp: {
                                  ...prev.offlineCatchUp,
                                  enabled: prev.offlineCatchUp?.enabled ?? true,
                                  scope: prev.offlineCatchUp?.scope ?? 'all',
                                  mode: prev.offlineCatchUp?.mode ?? 'auto',
                                  intervalMinutes: prev.offlineCatchUp?.intervalMinutes ?? 15,
                                  incrementStep: prev.offlineCatchUp?.incrementStep ?? 1,
                                  maxCatchUpUnits: prev.offlineCatchUp?.maxCatchUpUnits ?? 30,
                                  outOfStockEnabled: true,
                                  outOfStockMaxUnits: Math.max(1, Number(e.target.value) || 1),
                                  outOfStockIncrementStep: prev.offlineCatchUp?.outOfStockIncrementStep ?? 1,
                                },
                              }))
                            }
                            className="w-16 px-2.5 py-1 text-center font-mono text-xs rounded-lg bg-card border border-border text-foreground font-bold"
                          />
                          <span className="text-xs text-muted-foreground">đơn</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>1 đơn</span>
                        <span>10 đơn (Mặc định)</span>
                        <span>25 đơn</span>
                        <span>50 đơn</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Khối giải thích cơ chế */}
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary-light space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-primary">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Cơ chế bảo vệ & Vận hành thực tế:</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                    • Khách tắt web lúc sản phẩm đạt <b>25 đơn</b>, hệ thống ghi nhớ mốc <b>25</b> và thời gian tắt.<br />
                    • 30 phút sau mở lại: Tự động tính thời gian vắng mặt và cộng dồn thêm (ví dụ +2 đơn thành <b>27 đơn</b>), kho ảo tiêu hao tương ứng.<br />
                    • Không bao giờ bị đứng im hay tụt lùi số, phối hợp nhịp nhàng giữa máy khách và máy chủ Cloudflare.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Căn Chuẩn Đồng Bộ Toàn Cầu & Cuộn Số Đỉnh (Universal Server Snap-to-Grid) */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <span>Căn Chuẩn Đồng Bộ Toàn Cầu (Universal Server Snap-to-Grid)</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ép buộc tất cả máy khách (trình duyệt, thiết bị) định kỳ reset và hiển thị đồng nhất 100% theo mốc chuẩn từ máy chủ Cloudflare, đồng thời tự động cuộn gộp mốc đỉnh cao nhất.
                </p>
              </div>

              {/* Bật / Tắt chế độ */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-semibold text-foreground">
                  {config.enableGlobalSnapToGrid ?? true ? 'Đang Bật' : 'Đang Tắt'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableGlobalSnapToGrid ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableGlobalSnapToGrid: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {config.enableGlobalSnapToGrid !== false && (
              <div className="space-y-4 pt-2 border-t border-border/60">
                {/* 1. Chu kỳ căn chuẩn máy chủ */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">Chu kỳ căn chuẩn máy chủ (Snap Interval)</span>
                    <span className="text-primary font-mono font-bold">
                      {config.syncIntervalSeconds ?? 60} giây / lần
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { sec: 30, label: '30 giây', desc: 'Rất nhanh (2 req/p)' },
                      { sec: 60, label: '60 giây', desc: 'Cân bằng (Mặc định)' },
                      { sec: 120, label: '120 giây', desc: 'Tiết kiệm (2 phút)' },
                      { sec: 300, label: '300 giây', desc: 'Siêu tiết kiệm (5p)' },
                    ].map((item) => (
                      <button
                        key={item.sec}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            syncIntervalSeconds: item.sec,
                          }))
                        }
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          (config.syncIntervalSeconds ?? 60) === item.sec
                            ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/40'
                            : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <div className="font-bold text-xs text-foreground">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Chi tiết 4 tối ưu tiết kiệm Request & Cuộn số đỉnh */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cuộn Mốc Đỉnh Hai Chiều (Peak Rollup)</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Khi có máy khách nổ thông báo hoặc tăng mốc đỉnh, số liệu sẽ được gửi về máy chủ sau 10s cooldown. Máy chủ luôn đảm bảo số đếm ≥ đỉnh cao nhất của mọi máy khách (kho hàng ≤ số tồn thấp nhất).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Visibility-Aware & Edge Cache SWR</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Tự động tạm dừng gửi yêu cầu khi người dùng thu nhỏ hoặc chuyển tab (0 request phát sinh). Mạng lưới Cloudflare Edge CDN lưu bộ nhớ đệm 30s giúp chia sẻ kết quả giữa hàng nghìn máy khách.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB: BẬT / TẮT TỪNG LOẠI THÔNG BÁO                              */}
      {/* ==================================================================== */}
      {activeSubTab === 'types' && (
        <div className="space-y-5">
          {renderNotificationTypesSection()}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 2: QUẢN LÝ TÀI KHOẢN HỆ THỐNG                                */}
      {/* ==================================================================== */}
      {activeSubTab === 'accounts' && (
        <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Danh Sách Tài Khoản Giả Lập Hệ Thống</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Các tên tài khoản này sẽ được bốc ngẫu nhiên để phát thông báo mua hàng, copy code và nạp tiền.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadPresets}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/40 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nạp 60+ Tên Mẫu Việt</span>
              </button>
            </div>
          </div>

          {/* Quick Add Area */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
            <label className="text-xs font-bold text-foreground">Thêm tài khoản mới (Mỗi dòng một tên hoặc số điện thoại)</label>
            <div className="flex gap-2">
              <textarea
                rows={2}
                placeholder="Ví dụ:&#10;Nguyễn Hữu Đạt&#10;0981234567&#10;pro_gamer_vn"
                value={newAccountInput}
                onChange={(e) => setNewAccountInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-foreground text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAddAccount}
                className="px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 mx-auto" />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {/* Search & Counter */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              className="max-w-xs px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs text-foreground"
            />
            <span className="text-xs text-muted-foreground font-mono">
              Hiển thị {filteredAccounts.length} / {(config?.virtualAccounts || []).length} tài khoản
            </span>
          </div>

          {/* Account Badges Grid */}
          <div className="max-h-80 overflow-y-auto p-3 rounded-xl bg-muted/20 border border-border/60 flex flex-wrap gap-2">
            {filteredAccounts.map((acc, idx) => (
              <span
                key={`acc-${acc}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-xs text-foreground group"
              >
                <span className="font-mono text-[11px] text-muted-foreground">#{idx + 1}</span>
                <span>{acc}</span>
                <span className="text-[10px] text-primary-light">({marketingService.maskName(acc)})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAccount(acc)}
                  className="text-muted-foreground hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors"
                  title="Xóa tài khoản này"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 3: TRỌNG SỐ SẢN PHẨM STORE, TIỆN ÍCH, GIVEAWAY & KHO HÀNG ẢO */}
      {/* ==================================================================== */}
      {activeSubTab === 'products' && (() => {
        const combinedItems = [
          ...storeProducts.map((p) => ({
            id: p.id,
            title: p.title,
            price: Number(p.current_price ?? (p as any).price ?? 0),
            sku: (p as any).sku || p.id,
            type: 'store' as const,
            categoryLabel: p.game_name || 'Gói Store',
            realStock: getRealStockForItem(p.id, p.title, (p as any).sku) || Math.max(0, Number(p.stock_quantity) || 0),
          })),
          ...utilityProducts.map((u) => ({
            id: u.id,
            title: u.title,
            price: Number(u.current_price ?? (u as any).price ?? 0),
            sku: u.id,
            type: 'utility' as const,
            categoryLabel: u.category_label || u.category || 'Tiện Ích',
            realStock: getRealStockForItem(u.id, u.title) || Math.max(0, Number(u.stock_quantity) || 0),
          })),
          ...giveaways.map((gw) => {
            const poolCount = Array.isArray(gw.codes_pool) ? gw.codes_pool.length : 0;
            const remainingCount = typeof gw.remaining_codes === 'number' ? gw.remaining_codes : 0;
            const claimedCount = gw.claimed_codes || 0;
            const realStock = remainingCount > 0 ? remainingCount : (poolCount > 0 ? poolCount : Math.max(0, (gw.total_codes || 0) - claimedCount));
            return {
              id: gw.id,
              title: gw.title,
              price: 0,
              sku: gw.id,
              type: 'giveaway' as const,
              categoryLabel: `Sự kiện ${gw.game_name || 'Game'}`,
              realStock,
            };
          }),
        ];

        const filteredItems = combinedItems.filter((item) => {
          if (productCategoryFilter === 'store' && item.type !== 'store') return false;
          if (productCategoryFilter === 'utility' && item.type !== 'utility') return false;
          if (productCategoryFilter === 'giveaway' && item.type !== 'giveaway') return false;
          if (productSearch.trim()) {
            const q = productSearch.toLowerCase();
            return (
              item.title.toLowerCase().includes(q) ||
              item.sku.toLowerCase().includes(q) ||
              item.categoryLabel.toLowerCase().includes(q)
            );
          }
          return true;
        });

        return (
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span>Cấu Hình Ưu Tiên Sản Phẩm (Store, Tiện Ích & Giveaway) & Kho Hàng Ảo</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cài đặt mức độ ưu tiên thông báo ảo cho từng sản phẩm và sự kiện giveaway. 
                <strong className="text-emerald-400 ml-1">
                  Lưu ý: Khi hàng thật trong kho = 0, hệ thống sẽ tự động ngắt hoàn toàn thông báo ảo của sản phẩm/giveaway đó.
                </strong>
              </p>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setProductCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productCategoryFilter === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tất cả ({combinedItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductCategoryFilter('store')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productCategoryFilter === 'store'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Gói Game Store ({storeProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductCategoryFilter('utility')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productCategoryFilter === 'utility'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Wrench className="w-3 h-3" />
                  <span>Tiện Ích Số ({utilityProducts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductCategoryFilter('giveaway')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productCategoryFilter === 'giveaway'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  <span>Sự Kiện Giveaway ({giveaways.length})</span>
                </button>
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm, SKU, loại..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Batch Configuration Card */}
            <div className="p-4 rounded-xl bg-muted/40 border border-primary/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary-light" />
                  <span>Thiết Lập Nhanh Cho Toàn Bộ ({combinedItems.length}) Sản Phẩm Store & Tiện Ích</span>
                </span>
                <span className="text-[11px] text-muted-foreground">Áp dụng đồng bộ cho cả Store và Tiện Ích</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Mức độ ưu tiên chung</label>
                  <select
                    value={batchPriority}
                    onChange={(e) => setBatchPriority(e.target.value as ProductPriority)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground font-semibold text-xs cursor-pointer"
                  >
                    <option value="high">🔥 Rất cao (Ưu tiên x5)</option>
                    <option value="normal">⚡ Bình thường (Ưu tiên x2)</option>
                    <option value="low">💤 Thấp (Ưu tiên x1)</option>
                    <option value="off">⛔ Tắt thông báo ảo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Kho ảo cộng thêm</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={batchVirtualStock}
                    onChange={(e) => setBatchVirtualStock(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-center font-mono text-xs text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Khi còn ≤ mức thì bù thêm +</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={batchThreshold}
                      onChange={(e) => setBatchThreshold(Number(e.target.value))}
                      className="w-14 px-1.5 py-1.5 rounded-lg bg-card border border-border text-center font-mono text-xs text-foreground"
                      title="Ngưỡng chạm đáy"
                    />
                    <span className="text-[11px] text-muted-foreground">bù +</span>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={batchAmount}
                      onChange={(e) => setBatchAmount(Number(e.target.value))}
                      className="flex-1 px-1.5 py-1.5 rounded-lg bg-card border border-border text-center font-mono text-xs text-foreground"
                      title="Số lượng bù"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Kho thật tối thiểu (≥)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batchMinRealStock}
                    onChange={(e) => setBatchMinRealStock(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-center font-mono text-xs text-foreground"
                    title="FOMO chỉ kích hoạt khi tồn kho thật đạt từ mức này trở lên"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyBatchToAll}
                    disabled={isSaving}
                    className="py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Đang lưu...' : 'Áp Dụng Cho Tất Cả & Lưu'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Ngay'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/80 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Sản phẩm / Dịch vụ</th>
                    <th className="p-3 text-center">Hàng thật trong kho</th>
                    <th className="p-3">Mức độ ưu tiên thông báo ảo</th>
                    <th className="p-3 text-center">Kho ảo cộng thêm</th>
                    <th className="p-3">Tự động bù kho ảo</th>
                    <th className="p-3 text-center">Kho thật tối thiểu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredItems.map((prod) => {
                    const realStock = prod.realStock;
                    const isOutOfRealStock = realStock <= 0;
                    const pw = config.productWeights[prod.id] || { ...DEFAULT_PRODUCT_MARKETING_CONFIG };

                    return (
                      <tr
                        key={prod.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          isOutOfRealStock ? 'bg-rose-500/5' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                prod.type === 'giveaway'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : prod.type === 'utility'
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                  : 'bg-primary/20 text-primary-light border border-primary/30'
                              }`}
                            >
                              {prod.type === 'giveaway' ? 'Giveaway' : prod.type === 'utility' ? 'Tiện Ích' : 'Store'}
                            </span>
                            <div className="font-bold text-foreground">{prod.title}</div>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {prod.type === 'giveaway' ? 'Miễn phí' : `${prod.price.toLocaleString('vi-VN')}đ`} • {prod.categoryLabel} • ID: {prod.sku}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                              realStock > 0
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {realStock > 0 ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{realStock} {prod.type === 'giveaway' ? 'mã sự kiện' : 'mã thật'}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                <span>Hết hàng (Tắt thông báo)</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="p-3">
                          <select
                            value={pw.priority}
                            onChange={(e) =>
                              handleUpdateProductConfig(prod.id, 'priority', e.target.value as ProductPriority)
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-card border border-border text-foreground font-semibold text-xs cursor-pointer"
                          >
                            <option value="high">🔥 Rất cao (Ưu tiên x5)</option>
                            <option value="normal">⚡ Bình thường (Ưu tiên x2)</option>
                            <option value="low">💤 Thấp (Ưu tiên x1)</option>
                            <option value="off">⛔ Tắt thông báo ảo</option>
                          </select>
                        </td>

                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={pw.virtualStockBonus}
                            onChange={(e) =>
                              handleUpdateProductConfig(prod.id, 'virtualStockBonus', Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 rounded-lg bg-card border border-border text-center font-mono text-xs text-foreground"
                          />
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>Khi còn ≤</span>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={pw.autoRestockThreshold}
                              onChange={(e) =>
                                handleUpdateProductConfig(prod.id, 'autoRestockThreshold', Number(e.target.value))
                              }
                              className="w-12 px-1.5 py-0.5 rounded bg-card border border-border text-center font-mono text-xs text-foreground"
                            />
                            <span>thì bù +</span>
                            <input
                              type="number"
                              min="10"
                              max="200"
                              value={pw.autoRestockAmount}
                              onChange={(e) =>
                                handleUpdateProductConfig(prod.id, 'autoRestockAmount', Number(e.target.value))
                              }
                              className="w-14 px-1.5 py-0.5 rounded bg-card border border-border text-center font-mono text-xs text-foreground"
                            />
                            <span>món</span>
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[11px] text-muted-foreground">≥</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={pw.minRealStock ?? 1}
                              onChange={(e) =>
                                handleUpdateProductConfig(prod.id, 'minRealStock', Math.max(1, Number(e.target.value)))
                              }
                              className="w-12 px-1.5 py-0.5 rounded bg-card border border-border text-center font-mono text-xs text-foreground"
                              title="Tồn kho thật tối thiểu để chạy FOMO"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* SUB-TAB 4: TỈ LỆ BÌNH CHỌN CODE                                      */}
      {/* ==================================================================== */}
      {activeSubTab === 'votes' && (
        <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm max-w-2xl">
          <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Thiết Lập Tỉ Lệ Bình Chọn Code (Vote Simulation)</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Điều chỉnh tỉ lệ đánh giá code còn hạn / hết hạn trên toàn bộ hệ thống để tăng độ tin cậy.
          </p>

          {/* Master Toggle for Vote Simulation */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
            <div>
              <p className="font-bold text-sm text-foreground">Kích hoạt Giả Lập Bình Chọn Code</p>
              <p className="text-xs text-muted-foreground">
                Khi bật: Hiển thị số lượt vote và tỉ lệ còn hạn uy tín. Khi tắt: Chỉ hiển thị bình chọn thật từ người dùng.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.voteConfig.enabled !== false}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    voteConfig: { ...prev.voteConfig, enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Live Preview Demo Card */}
          <div className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              Mô phỏng hiển thị thực tế trên web khách:
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border">
              <div>
                <span className="font-mono font-bold text-xs text-foreground bg-muted px-2 py-0.5 rounded">GIFTCODE_VIP2026</span>
                <span className="text-[11px] text-muted-foreground ml-2">(Ví dụ 1 mã code mẫu)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
                  👍 {Math.round(((config.voteConfig.baseVotesMin + config.voteConfig.baseVotesMax) / 2) * (config.voteConfig.activeRate / 100))} Còn hạn ({config.voteConfig.activeRate}%)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold font-mono">
                  👎 {Math.max(1, Math.round(((config.voteConfig.baseVotesMin + config.voteConfig.baseVotesMax) / 2) * ((100 - config.voteConfig.activeRate) / 100)))} Hết hạn ({100 - config.voteConfig.activeRate}%)
                </span>
              </div>
            </div>
            {!config.voteConfig.enabled && (
              <p className="text-[11px] text-amber-400 font-medium">
                ⚠️ Tính năng giả lập bình chọn đang TẮT. Web khách sẽ chỉ hiển thị bình chọn thật từ người dùng.
              </p>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Tỉ lệ bình chọn CÒN HẠN mong muốn</span>
                <span className="text-emerald-400 font-mono font-bold">{config.voteConfig.activeRate}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="99"
                step="1"
                value={config.voteConfig.activeRate}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setConfig((prev) => ({
                    ...prev,
                    voteConfig: { ...prev.voteConfig, activeRate: val, expiredRate: 100 - val },
                  }));
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>70% (Khá)</span>
                <span>85% (Tốt)</span>
                <span>96% (Xuất sắc)</span>
                <span>99% (Tối đa)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Biên độ dao động ngẫu nhiên</span>
                <span className="text-primary font-mono font-bold">±{config.voteConfig.variance}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={config.voteConfig.variance}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    voteConfig: { ...prev.voteConfig, variance: Number(e.target.value) },
                  }))
                }
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">
                Ví dụ: 96% ± 2% sẽ sinh ra các số ngẫu nhiên tự nhiên như 94.5%, 97.2%, 95.8%.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Số lượt vote cơ sở tối thiểu</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={config.voteConfig.baseVotesMin}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      voteConfig: { ...prev.voteConfig, baseVotesMin: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Số lượt vote cơ sở tối đa</label>
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={config.voteConfig.baseVotesMax}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      voteConfig: { ...prev.voteConfig, baseVotesMax: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 5: TRÌNH GIẢ LẬP & XEM TRƯỚC TRỰC TIẾP                       */}
      {/* ==================================================================== */}
      {activeSubTab === 'preview' && (
        <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
          <div>
            <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span>Trình Giả Lập & Bắn Thử Thông Báo Trực Tiếp</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bấm các nút dưới đây để kiểm tra ngay popup hiển thị thực tế ở góc dưới màn hình của bạn (hoạt động trực tiếp ngay trên trang Admin này).
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('wcg_marketing_toast_snooze_until');
                    window.dispatchEvent(new CustomEvent('wcg_clear_marketing_snooze'));
                    onShowToast('Đã xóa cờ tạm dừng!', 'Hệ thống thông báo FOMO đã được kích hoạt lại tức thì 100%.', 'success');
                  } catch {}
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
                title="Xóa cờ tạm dừng nếu trình duyệt từng nhấn 'Không hiện 1h'"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ Xóa Cờ Tắt Thông Báo (Reset Snooze 1H)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleTestTrigger('COPY_CODE')}
              className="p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-left transition-all cursor-pointer active:scale-95 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <Gift className="w-4 h-4 text-emerald-400" />
                  <span>Copy Code</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(config.typeToggles?.copyCode ?? true) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {(config.typeToggles?.copyCode ?? true) ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Giả lập người dùng sao chép giftcode Free Fire.</p>
            </button>

            <button
              type="button"
              onClick={() => handleTestTrigger('BUY_PRODUCT')}
              className="p-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-left transition-all cursor-pointer active:scale-95 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <ShoppingBag className="w-4 h-4 text-indigo-400" />
                  <span>Cửa Hàng</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(config.typeToggles?.buyStore ?? true) ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {(config.typeToggles?.buyStore ?? true) ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Giả lập người dùng mua thành công gói Store.</p>
            </button>

            <button
              type="button"
              onClick={() => handleTestTrigger('BUY_UTILITY')}
              className="p-4 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-left transition-all cursor-pointer active:scale-95 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <Wrench className="w-4 h-4 text-teal-400" />
                  <span>Tiện Ích</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(config.typeToggles?.buyUtility ?? true) ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {(config.typeToggles?.buyUtility ?? true) ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Giả lập người dùng mua tài khoản Tiện ích.</p>
            </button>

            <button
              type="button"
              onClick={() => handleTestTrigger('RESTOCK_PRODUCT')}
              className="p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-left transition-all cursor-pointer active:scale-95 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <PackagePlus className="w-4 h-4 text-emerald-400" />
                  <span>Bổ Sung Kho</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(config.typeToggles?.restockProduct ?? true) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {(config.typeToggles?.restockProduct ?? true) ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Giả lập hệ thống vừa bổ sung thêm +20 sản phẩm vào kho.</p>
            </button>

            <button
              type="button"
              onClick={() => handleTestTrigger('CLAIM_GIVEAWAY')}
              className="p-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-left transition-all cursor-pointer active:scale-95 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Giveaway</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(config.typeToggles?.claimGiveaway ?? true) ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {(config.typeToggles?.claimGiveaway ?? true) ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Giả lập người dùng giật thành công mã quà tặng.</p>
            </button>

            <button
              type="button"
              onClick={() => handleTestTrigger('DEPOSIT_WALLET')}
              className="p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-left transition-all cursor-pointer active:scale-95 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>Nạp Ví</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(config.typeToggles?.depositWallet ?? true) ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {(config.typeToggles?.depositWallet ?? true) ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Giả lập thành viên vừa nạp 200.000đ vào ví.</p>
            </button>

            <button
              type="button"
              onClick={() => handleTestTrigger('STATS_COPY')}
              className="p-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-left transition-all cursor-pointer active:scale-95 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Tổng Lượt</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(config.typeToggles?.statsCopy ?? true) ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                  {(config.typeToggles?.statsCopy ?? true) ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Giả lập thông báo tổng lượt sao chép giftcode.</p>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MỤC 7: CỔNG API KIỂM TOÁN & KHÓA TẠM THỜI (2FA BẢO MẬT)              */}
      {/* ==================================================================== */}
      {activeSubTab === 'audit-token' && (
        <TemporaryAuditTokenManager onShowToast={onShowToast} />
      )}

      {/* ==================================================================== */}
      {/* MỤC 8: THỐNG KÊ ẢO & ĐỐI SOÁT 3 CỘT (TWO-LAYER SSOT)                  */}
      {/* ==================================================================== */}
      {activeSubTab === 'virtual-stats' && (
        <VirtualLayerAnalytics />
      )}

      {/* ==================================================================== */}
      {/* THANH ĐIỀU HƯỚNG CHÂN TRANG (BOTTOM STEPPER: QUAY LẠI / TIẾP THEO)   */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-sm mt-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {prevTab ? (
            <button
              type="button"
              onClick={() => {
                setActiveSubTab(prevTab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer w-full sm:w-auto active:scale-95 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-primary" />
              <span>← Quay lại: Mục {prevTab.index}/{MARKETING_SUB_TABS.length} ({prevTab.shortTitle})</span>
            </button>
          ) : (
            <span className="text-xs text-muted-foreground font-mono px-3 py-2 bg-muted/40 rounded-xl border border-border/50">
              Đang ở Mục đầu tiên (1/{MARKETING_SUB_TABS.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-foreground font-bold">
            Mục {currentTabIndex + 1} / {MARKETING_SUB_TABS.length}
          </span>
          {currentTabIndex === MARKETING_SUB_TABS.length - 1 ? (
            <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mục cuối cùng ({MARKETING_SUB_TABS.length}/{MARKETING_SUB_TABS.length}) • Đã xem hết tất cả các mục
            </span>
          ) : (
            <span>Còn {MARKETING_SUB_TABS.length - 1 - currentTabIndex} mục phía sau</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {nextTab ? (
            <button
              type="button"
              onClick={() => {
                setActiveSubTab(nextTab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/25 transition-all cursor-pointer w-full sm:w-auto active:scale-95"
            >
              <span>Mục tiếp theo: {nextTab.index}/{MARKETING_SUB_TABS.length} ({nextTab.shortTitle}) →</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('general');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer transition-colors"
                title="Quay lại mục 1: Chung & Tần Suất"
              >
                <RotateCcw className="w-3.5 h-3.5 text-primary" />
                <span>Về Mục 1</span>
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Tất Cả Cấu Hình'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
