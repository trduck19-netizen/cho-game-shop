import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  Gift,
  Flame,
  Star,
  Shield,
  Clock,
  Eye,
  Layout,
  ExternalLink,
  Sliders,
  Palette,
  Layers,
  X,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Monitor,
  Link2,
  Zap,
} from 'lucide-react';
import { RichTextRenderer } from '../../components/RichTextRenderer';
import { adminDataService } from '../services/adminDataService';
import {
  FloatingNotificationConfig,
  DEFAULT_FLOATING_NOTIFICATION,
  MAINTENANCE_FLOATING_NOTIFICATION,
  FloatingNotificationPosition,
  FloatingNotificationFrequency,
  FloatingNotificationTheme,
  FloatingNotificationIconType,
} from '../../types/floatingNotification';

interface FloatingNotificationModuleProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const FloatingNotificationModule: React.FC<FloatingNotificationModuleProps> = ({ onShowToast }) => {
  const [config, setConfig] = useState<FloatingNotificationConfig>(() =>
    adminDataService.getFloatingNotificationConfig()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Link Inserter State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('Tại đây');
  const [linkUrl, setLinkUrl] = useState('');
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertLink = () => {
    const text = linkText.trim() || 'Tại đây';
    const url = linkUrl.trim();
    if (!url) {
      onShowToast('Vui lòng nhập đường dẫn URL', 'Ví dụ: https://codegame.shop hoặc /store, /news', 'error');
      return;
    }

    const markdownLink = `[${text}](${url})`;
    const textarea = messageTextareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const current = config.message || '';
      const nextMessage = current.substring(0, start) + markdownLink + current.substring(end);
      setConfig({ ...config, message: nextMessage });
      setShowLinkModal(false);
      setLinkUrl('');
      setLinkText('Tại đây');
      setTimeout(() => {
        textarea.focus();
        const newPos = start + markdownLink.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 50);
    } else {
      const current = config.message ? `${config.message} ${markdownLink}` : markdownLink;
      setConfig({ ...config, message: current });
      setShowLinkModal(false);
      setLinkUrl('');
      setLinkText('Tại đây');
    }

    onShowToast('Đã chèn liên kết vào nội dung', `Đã thêm [${text}](${url})`, 'success');
  };

  // Live Events from DB for Spotlight
  const [giveaways, setGiveaways] = useState<GiveawayCampaign[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [utilities, setUtilities] = useState<UtilityProduct[]>([]);
  const [spotlightTab, setSpotlightTab] = useState<EventSpotlightType>('giveaway');

  // Load real events on mount
  useEffect(() => {
    try {
      setGiveaways(adminDataService.getGiveaways());
      setStoreProducts(adminDataService.getStoreProducts());
      setUtilities(adminDataService.getUtilities());
    } catch (e) {
      console.warn('[FloatingNotificationModule] Error loading live events:', e);
    }
  }, []);

  // Event Spotlight Handlers
  const handleToggleSpotlight = (enabled: boolean) => {
    const currentSp = config.eventSpotlight || {
      enabled: false,
      type: 'giveaway',
      title: '🎁 Sự Kiện Đang Diễn Ra',
      subtitle: 'Nhanh tay nhận ngay quà tặng độc quyền',
      badgeText: '🔴 ĐANG DIỄN RA',
      ctaText: 'Đến Ngay ➔',
      ctaLink: '#giveaways',
    };
    setConfig({
      ...config,
      eventSpotlight: {
        ...currentSp,
        enabled,
      },
    });
  };

  const handleSelectSpotlightItem = (type: EventSpotlightType, itemId: string) => {
    if (type === 'giveaway') {
      const found = giveaways.find((g) => g.id === itemId);
      if (!found) return;
      const stock = typeof found.remaining_codes === 'number'
        ? found.remaining_codes
        : Array.isArray(found.codes_pool)
        ? found.codes_pool.length
        : 0;

      setConfig({
        ...config,
        eventSpotlight: {
          enabled: true,
          type: 'giveaway',
          targetId: found.id,
          title: found.title,
          subtitle: `🎁 Mã quà tặng miễn phí ${found.game_name ? `game ${found.game_name}` : ''} • Còn ${stock} suất`,
          badgeText: '🔴 ĐANG DIỄN RA',
          imageUrl: found.banner_url || found.image_url || (found.game_slug ? `/game_icons/${found.game_slug}.webp` : '') || '',
          remainingCodes: stock,
          ctaText: 'Săn Quà Ngay ➔',
          ctaLink: `#giveaways?gw=${found.id}`,
        },
      });
      onShowToast('Đã chọn chiến dịch Giveaway', `Gắn sự kiện "${found.title}" thành công!`, 'info');
    } else if (type === 'store_discount') {
      const found = storeProducts.find((p) => p.id === itemId);
      if (!found) return;
      const hasDiscount = found.original_price && found.original_price > found.price;
      const percent = hasDiscount
        ? Math.round(((found.original_price - found.price) / found.original_price) * 100)
        : found.discount_percentage || 0;

      setConfig({
        ...config,
        eventSpotlight: {
          enabled: true,
          type: 'store_discount',
          targetId: found.id,
          title: found.title,
          subtitle: `⚡ Ưu đãi Flash Sale ${percent > 0 ? `giảm giá -${percent}%` : ''} • Giá chỉ ${formatCore(found.price)}`,
          badgeText: percent > 0 ? `⚡ GIẢM -${percent}%` : '⚡ FLASH SALE',
          imageUrl: found.cover_image_url || found.icon_url || (found.game_slug ? `/game_icons/${found.game_slug}.webp` : '') || '',
          originalPrice: found.original_price,
          discountPrice: found.price,
          ctaText: 'Đến Ngay ➔',
          ctaLink: `#store?product=${found.id}`,
        },
      });
      onShowToast('Đã chọn sản phẩm Cửa Hàng', `Gắn ưu đãi "${found.title}" thành công!`, 'info');
    } else if (type === 'utility_hot') {
      const found = utilities.find((u) => u.id === itemId);
      if (!found) return;
      const price = found.current_price || found.price || 0;

      setConfig({
        ...config,
        eventSpotlight: {
          enabled: true,
          type: 'utility_hot',
          targetId: found.id,
          title: found.name,
          subtitle: `🔥 Tiện ích treo game VIP • Chỉ từ ${formatCore(price)}`,
          badgeText: '🔥 HOT NHẤT',
          imageUrl: found.cover_image_url || found.icon_url || '',
          ctaText: 'Đến Ngay ➔',
          ctaLink: `#utilities?utility=${found.id}`,
        },
      });
      onShowToast('Đã chọn tiện ích', `Gắn dịch vụ "${found.name}" thành công!`, 'info');
    }
  };

  const handleApplySpotlightToNotification = () => {
    const sp = config.eventSpotlight;
    if (!sp || !sp.title) {
      onShowToast('Chưa chọn sự kiện', 'Vui lòng chọn hoặc nhập sự kiện trước khi điền mẫu.', 'error');
      return;
    }

    const newTitle = `🔥 SỰ KIỆN: ${sp.title}`;
    const newMsg = `Sự kiện "${sp.title}" đang diễn ra trực tiếp trên hệ thống CodeGame.Shop! ${sp.subtitle || ''}. Số lượng quà và ưu đãi có hạn, nhấn nút bên dưới để tham gia ngay!`;
    const newIcon = sp.type === 'giveaway' ? 'gift' : 'flame';
    const newCta = sp.ctaText || 'Đến Ngay ➔';
    const newLink = sp.ctaLink || '#giveaways';

    setConfig({
      ...config,
      title: newTitle,
      message: newMsg,
      iconType: newIcon,
      showCta: true,
      ctaText: newCta,
      ctaLink: newLink,
      ctaTargetBlank: false,
    });

    onShowToast('Đã áp dụng mẫu thành công! 🎉', 'Toàn bộ tiêu đề, nội dung, biểu tượng và liên kết đã được cập nhật đồng bộ.', 'success');
  };

  const handleUpdateSpotlightField = (field, value) => {
    const currentSp = config.eventSpotlight || {
      enabled: true,
      type: 'giveaway',
      title: '',
      ctaText: 'Đến Ngay ➔',
      ctaLink: '#giveaways',
    };
    setConfig({
      ...config,
      eventSpotlight: {
        ...currentSp,
        [field]: value,
      },
    });
  };

  // Clock ticker for time-of-day comparison
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to remote changes if any
  useEffect(() => {
    const handleUpdate = () => {
      setConfig(adminDataService.getFloatingNotificationConfig());
    };
    window.addEventListener('wcg_admin_content_updated', handleUpdate);
    window.addEventListener('wcg_floating_notification_updated', handleUpdate);
    return () => {
      window.removeEventListener('wcg_admin_content_updated', handleUpdate);
      window.removeEventListener('wcg_floating_notification_updated', handleUpdate);
    };
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await adminDataService.saveFloatingNotificationConfig(config);
      onShowToast(
        'Đã lưu thông báo nổi thành công!',
        'Cài đặt đã được đồng bộ lên hệ thống và sẽ áp dụng ngay lập tức cho khách truy cập.',
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi khi lưu cài đặt', err.message || 'Vui lòng thử lại', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục cài đặt thông báo nổi về mặc định không?')) {
      setConfig({ ...DEFAULT_FLOATING_NOTIFICATION, updatedAt: new Date().toISOString() });
      setPreviewDismissed(false);
      onShowToast('Đã khôi phục mặc định', 'Nhấn Lưu Cài Đặt để áp dụng thay đổi.', 'info');
    }
  };

  const handleApplyMaintenancePreset = () => {
    setConfig({ ...MAINTENANCE_FLOATING_NOTIFICATION, updatedAt: new Date().toISOString() });
    setPreviewDismissed(false);
    onShowToast(
      'Đã điền mẫu "Web bảo trì"! 🛠️',
      'Đã tự động nạp tiêu đề "Web bảo trì", nội dung việc không làm & vẫn làm, icon khiên và màu cảnh báo. Nhấn "Lưu Cài Đặt" để kích hoạt.',
      'success'
    );
  };

  // Helper check if currently within scheduled time
  const isCurrentlyInSchedule = () => {
    if (config.scheduleMode === 'all_day') return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (config.startTime || '00:00').split(':').map(Number);
    const [endH, endM] = (config.endTime || '23:59').split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    // Overnight range (e.g. 22:00 -> 06:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  };

  // Render icon for preview
  const renderIcon = (type: FloatingNotificationIconType, customUrl?: string, className = 'w-6 h-6') => {
    if (type === 'custom' && customUrl) {
      return <img src={customUrl} alt="icon" className={`${className} object-cover rounded-full`} />;
    }
    switch (type) {
      case 'bell':
        return <BellRing className={`${className} text-amber-400`} />;
      case 'flame':
        return <Flame className={`${className} text-rose-500`} />;
      case 'sparkles':
        return <Sparkles className={`${className} text-cyan-400`} />;
      case 'star':
        return <Star className={`${className} text-yellow-400`} />;
      case 'shield':
        return <Shield className={`${className} text-emerald-400`} />;
      case 'gift':
      default:
        return <Gift className={`${className} text-purple-400`} />;
    }
  };

  // Theme styling classes
  const getThemeClasses = (theme: FloatingNotificationTheme) => {
    switch (theme) {
      case 'gold':
        return {
          wrapper: 'bg-gradient-to-br from-amber-950/90 via-zinc-900/95 to-yellow-950/90 border-amber-500/40 shadow-amber-500/20',
          title: 'text-amber-300',
          cta: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:brightness-110 shadow-amber-500/30',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'emerald':
        return {
          wrapper: 'bg-gradient-to-br from-emerald-950/90 via-zinc-900/95 to-teal-950/90 border-emerald-500/40 shadow-emerald-500/20',
          title: 'text-emerald-300',
          cta: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold hover:brightness-110 shadow-emerald-500/30',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'crimson':
        return {
          wrapper: 'bg-gradient-to-br from-rose-950/90 via-zinc-900/95 to-red-950/90 border-rose-500/40 shadow-rose-500/20',
          title: 'text-rose-300',
          cta: 'bg-gradient-to-r from-rose-600 to-red-500 text-white font-bold hover:brightness-110 shadow-rose-500/30',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
      case 'cyber':
      default:
        return {
          wrapper: 'bg-gradient-to-br from-purple-950/90 via-zinc-900/95 to-cyan-950/90 border-purple-500/40 shadow-purple-500/20',
          title: 'text-cyan-300',
          cta: 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold hover:brightness-110 shadow-cyan-500/30',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
    }
  };

  const themeStyles = getThemeClasses(config.theme);
  const isInSchedule = isCurrentlyInSchedule();

  return (
    <div className="space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/70 p-5 rounded-2xl border border-zinc-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                Cài Đặt Thông Báo Nổi
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                  Client Widget
                </span>
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
                Tùy chỉnh nội dung, vị trí, giờ hiển thị trong ngày và popup chào mừng cho người dùng truy cập web
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 bg-zinc-800/80 hover:bg-zinc-800 hover:text-white border border-zinc-700/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Mặc Định
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang Lưu...' : 'Lưu Cài Đặt'}
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-purple-950/40 p-4 rounded-2xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">⚡ Mẫu Cài Đặt Sẵn (Quick Presets)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">Mới Cập Nhật</span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              Nạp nhanh mẫu thông báo đã soạn thảo đầy đủ nội dung chỉ với 1 cú click:
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleApplyMaintenancePreset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 border border-rose-400/40 shadow-md shadow-rose-900/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Shield className="w-4 h-4 text-rose-200" />
            <span>🛠️ Áp Dụng Mẫu: Web Bảo Trì</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-purple-400" />
            <span>Mẫu Chào Mừng</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Toggle & Basic Info */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Trạng Thái & Nội Dung Chính</h3>
                  <p className="text-xs text-zinc-400">Bật hoặc tắt và chỉnh sửa tiêu đề thông điệp</p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => {
                    setConfig({ ...config, enabled: e.target.checked });
                    setPreviewDismissed(false);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-cyan-500"></div>
                <span className="ml-3 text-xs font-semibold text-zinc-300">
                  {config.enabled ? 'Đang Bật' : 'Đang Tắt'}
                </span>
              </label>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Tiêu đề thông báo <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="VD: 🎁 Chào Mừng Đến Với CodeGame Store!"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Message Body with Link Inserter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Nội dung chi tiết / Thông điệp gửi tới khách
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = messageTextareaRef.current;
                    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
                      const selected = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
                      if (selected.trim()) setLinkText(selected.trim());
                    }
                    setShowLinkModal(!showLinkModal);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Chèn liên kết dạng [Tại đây](URL) vào nội dung"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>+ Chèn Link</span>
                </button>
              </div>

              {/* Inline Link Inserter Panel */}
              {showLinkModal && (
                <div className="mb-3 p-3.5 rounded-xl bg-zinc-950 border border-cyan-500/40 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-cyan-400" />
                      Chèn liên kết vào nội dung thông báo
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLinkModal(false)}
                      className="text-zinc-400 hover:text-white p-0.5 rounded"
                      title="Đóng hộp thoại"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Chữ hiển thị (nhấp vào chữ này để mở link)
                      </label>
                      <input
                        type="text"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        placeholder="Ví dụ: Tại đây, Xem chi tiết, Nhận quà..."
                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Đường dẫn URL đích (link trang) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://... hoặc /store, /news"
                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleInsertLink();
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Preset Links */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-zinc-500">Mẫu link nội bộ:</span>
                    {[
                      { label: 'Cửa hàng code', url: '/store' },
                      { label: 'Săn Giveaway', url: '/giveaways' },
                      { label: 'Tin tức & sự kiện', url: '/news' },
                      { label: 'Tiện ích nạp game', url: '/utilities' },
                    ].map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => {
                          setLinkUrl(preset.url);
                          if (!linkText || linkText === 'Tại đây') setLinkText(preset.label);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setShowLinkModal(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertLink}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-md shadow-cyan-900/30 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <span>Chèn vào nội dung</span>
                    </button>
                  </div>
                </div>
              )}

              <textarea
                ref={messageTextareaRef}
                rows={3}
                value={config.message}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                placeholder="Nhập nội dung thông báo nổi... (Ví dụ: Nhận quà VIP ngay [Tại đây](https://codegame.shop))"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />

              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 flex-wrap gap-2">
                <span>
                  Số ký tự: {config.message.length} | Cú pháp chèn link: <code className="text-cyan-400 font-mono">[Chữ hiển thị](Đường dẫn URL)</code>
                </span>
                {config.message.includes('](') && (
                  <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đã nhận diện liên kết
                  </span>
                )}
              </div>

              {/* Live Link Preview in Admin */}
              {config.message.includes('](') && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-950/80 border border-cyan-500/30 text-xs text-zinc-300">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                    Xem trước liên kết trong văn bản:
                  </span>
                  <RichTextRenderer content={config.message} />
                </div>
              )}
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">Biểu tượng thông báo</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {[
                  { id: 'gift', label: 'Quà tặng', icon: Gift },
                  { id: 'bell', label: 'Chuông báo', icon: BellRing },
                  { id: 'flame', label: 'Khuyến mãi', icon: Flame },
                  { id: 'sparkles', label: 'Sự kiện', icon: Sparkles },
                  { id: 'star', label: 'Ngôi sao', icon: Star },
                  { id: 'shield', label: 'Uy tín', icon: Shield },
                  { id: 'custom', label: 'Tùy chỉnh', icon: Palette },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = config.iconType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setConfig({ ...config, iconType: item.id as FloatingNotificationIconType })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm shadow-purple-500/20'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      <IconComp className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {config.iconType === 'custom' && (
                <div className="mt-3">
                  <label className="block text-[11px] text-zinc-400 mb-1">URL ảnh icon tùy chỉnh (PNG/WebP/SVG)</label>
                  <input
                    type="text"
                    value={config.customIconUrl || ''}
                    onChange={(e) => setConfig({ ...config, customIconUrl: e.target.value })}
                    placeholder="https://... hoặc /logo.png"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card: Gắn Sự Kiện Đang Diễn Ra (Event Spotlight) */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Gắn Sự Kiện Đang Diễn Ra</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                      Event Spotlight
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">Chèn thẻ sự kiện Giveaway, Giảm giá hoặc Tiện ích kèm nút "Đến Ngay"</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.eventSpotlight?.enabled)}
                  onChange={(e) => handleToggleSpotlight(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                <span className="ml-2.5 text-xs text-zinc-300">
                  {config.eventSpotlight?.enabled ? 'Đang Bật' : 'Đang Tắt'}
                </span>
              </label>
            </div>

            {config.eventSpotlight?.enabled && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Tabs chọn nguồn sự kiện */}
                <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                  {[
                    { id: 'giveaway', label: '🎁 Giveaway / Giật Code', count: giveaways.length },
                    { id: 'store_discount', label: '🔥 Giảm Giá Cửa Hàng', count: storeProducts.length },
                    { id: 'utility_hot', label: '⚡ Tiện Ích Hot', count: utilities.length },
                    { id: 'custom', label: '🎨 Tự Nhập Tùy Chỉnh' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSpotlightTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        spotlightTab === tab.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Dropdown danh sách sự kiện thật */}
                {spotlightTab === 'giveaway' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Chọn Chiến Dịch Giveaway Đang Mở:
                    </label>
                    <select
                      value={config.eventSpotlight?.targetId || ''}
                      onChange={(e) => handleSelectSpotlightItem('giveaway', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Bấm chọn 1 sự kiện Giveaway trên web --</option>
                      {giveaways.map((gw) => {
                        const stock = typeof gw.remaining_codes === 'number'
                          ? gw.remaining_codes
                          : Array.isArray(gw.codes_pool)
                          ? gw.codes_pool.length
                          : 0;
                        return (
                          <option key={gw.id} value={gw.id}>
                            {gw.title} {gw.game_name ? `(${gw.game_name})` : ''} - [Còn ${stock} mã]
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {spotlightTab === 'store_discount' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Chọn Sản Phẩm Cửa Hàng / Flash Sale:
                    </label>
                    <select
                      value={config.eventSpotlight?.targetId || ''}
                      onChange={(e) => handleSelectSpotlightItem('store_discount', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Bấm chọn 1 sản phẩm Cửa hàng --</option>
                      {storeProducts.map((sp) => {
                        const hasDiscount = sp.original_price && sp.original_price > sp.price;
                        return (
                          <option key={sp.id} value={sp.id}>
                            {sp.title} - {formatCore(sp.price)} {hasDiscount ? `(Gốc ${formatCore(sp.original_price)})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {spotlightTab === 'utility_hot' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Chọn Gói Tiện Ích Đang Hot:
                    </label>
                    <select
                      value={config.eventSpotlight?.targetId || ''}
                      onChange={(e) => handleSelectSpotlightItem('utility_hot', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Bấm chọn 1 gói Tiện ích --</option>
                      {utilities.map((ut) => (
                        <option key={ut.id} value={ut.id}>
                          {ut.name} - {formatCore(ut.current_price || ut.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Thẻ Xem Nhanh & Nút Điền Nhanh Toàn Bộ Thông Báo */}
                {config.eventSpotlight?.title && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {config.eventSpotlight.imageUrl ? (
                        <img
                          src={config.eventSpotlight.imageUrl}
                          alt="event"
                          className="w-10 h-10 rounded-lg object-cover border border-amber-500/40 shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-black/40 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <Gift className="w-5 h-5 text-amber-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          {config.eventSpotlight.badgeText || 'Đang diễn ra'}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {config.eventSpotlight.title}
                        </h4>
                        <p className="text-[11px] text-zinc-300 truncate">
                          {config.eventSpotlight.subtitle}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplySpotlightToNotification}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-transform active:scale-95 shrink-0 cursor-pointer"
                      title="Tự động đồng bộ tiêu đề, thông điệp, biểu tượng và liên kết CTA theo sự kiện này"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Áp Dụng Vào Toàn Bộ Thông Báo</span>
                    </button>
                  </div>
                )}

                {/* Tinh chỉnh các trường thông tin sự kiện */}
                <div className="pt-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Tên Sự Kiện Hiển Thị Trên Thẻ Mini
                    </label>
                    <input
                      type="text"
                      value={config.eventSpotlight?.title || ''}
                      onChange={(e) => handleUpdateSpotlightField('title', e.target.value)}
                      placeholder="VD: Giveaway 500 Giftcode VIP Black Myth: Wukong"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Dòng Phụ / Chi Tiết Ưu Đãi (Subtitle)
                    </label>
                    <input
                      type="text"
                      value={config.eventSpotlight?.subtitle || ''}
                      onChange={(e) => handleUpdateSpotlightField('subtitle', e.target.value)}
                      placeholder="VD: Còn 15 suất quà miễn phí • Hạn chót hôm nay"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Nhãn Huy Hiệu Nhấp Nháy (Badge)
                    </label>
                    <input
                      type="text"
                      value={config.eventSpotlight?.badgeText || '🔴 ĐANG DIỄN RA'}
                      onChange={(e) => handleUpdateSpotlightField('badgeText', e.target.value)}
                      placeholder="VD: 🔴 ĐANG DIỄN RA, ⚡ FLASH SALE..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Chữ Trên Nút Bấm (CTA Label)
                    </label>
                    <input
                      type="text"
                      value={config.eventSpotlight?.ctaText || 'Đến Ngay ➔'}
                      onChange={(e) => handleUpdateSpotlightField('ctaText', e.target.value)}
                      placeholder="VD: Đến Ngay ➔ hoặc Săn Quà Ngay ➔"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Đường Dẫn Sự Kiện (Deep-link)
                    </label>
                    <input
                      type="text"
                      value={config.eventSpotlight?.ctaLink || '#giveaways'}
                      onChange={(e) => handleUpdateSpotlightField('ctaLink', e.target.value)}
                      placeholder="VD: #giveaways?gw=gw_1 hoặc #utilities?utility=ut_1"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Vị trí hiển thị (Position) */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Layout className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Vị Trí Xuất Hiện Trên Màn Hình</h3>
                <p className="text-xs text-zinc-400">Chọn vị trí cố định hoặc dạng cửa sổ bật lên</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'bottom_right',
                  title: 'Góc Dưới Bên Phải',
                  desc: 'Hộp nổi góc phải (Toast Widget) - Tự nhiên, không che khuất nội dung',
                  badge: 'Được khuyên dùng',
                },
                {
                  id: 'center_modal',
                  title: 'Popup Giữa Màn Hình',
                  desc: 'Cửa sổ Modal nổi giữa trang kèm lớp phủ mờ - Thu hút chú ý tối đa',
                  badge: 'Nổi bật nhất',
                },
                {
                  id: 'bottom_left',
                  title: 'Góc Dưới Bên Trái',
                  desc: 'Hộp nổi góc trái - Thích hợp nếu góc phải đã có nút chat hỗ trợ',
                  badge: '',
                },
                {
                  id: 'top_bar',
                  title: 'Thanh Ghim Đỉnh Trang',
                  desc: 'Thanh banner dải mỏng trải ngang đỉnh màn hình',
                  badge: '',
                },
                {
                  id: 'bottom_bar',
                  title: 'Thanh Ghim Đáy Trang',
                  desc: 'Thanh banner dải mỏng ghim sát chân màn hình',
                  badge: '',
                },
              ].map((pos) => {
                const isSelected = config.position === pos.id;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => {
                      setConfig({ ...config, position: pos.id as FloatingNotificationPosition });
                      setPreviewDismissed(false);
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/50'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-purple-300' : 'text-white'}`}>
                        {pos.title}
                      </span>
                      {pos.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          {pos.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{pos.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Thời điểm xuất hiện trong ngày (Time Scheduling) */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Thời Điểm Xuất Hiện Trong Ngày</h3>
                  <p className="text-xs text-zinc-400">Lên lịch khung giờ thông báo hoạt động</p>
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-xs">
                <span className="text-zinc-400">Giờ hiện tại:</span>
                <span className="font-mono text-cyan-400 font-semibold">{currentTimeStr || '--:--'}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isInSchedule ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-500'
                  }`}
                />
              </div>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  config.scheduleMode === 'all_day'
                    ? 'bg-purple-950/40 border-purple-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={config.scheduleMode === 'all_day'}
                  onChange={() => setConfig({ ...config, scheduleMode: 'all_day' })}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="text-xs font-semibold">Cả Ngày (24/24)</div>
                  <div className="text-[11px] text-zinc-400">Xuất hiện mọi lúc người dùng truy cập</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  config.scheduleMode === 'time_range'
                    ? 'bg-purple-950/40 border-purple-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={config.scheduleMode === 'time_range'}
                  onChange={() => setConfig({ ...config, scheduleMode: 'time_range' })}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="text-xs font-semibold">Khung Giờ Cụ Thể</div>
                  <div className="text-[11px] text-zinc-400">Chỉ bật trong khoảng giờ đã định</div>
                </div>
              </label>
            </div>

            {config.scheduleMode === 'time_range' && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Giờ bắt đầu xuất hiện</label>
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">VD: 08:00 sáng</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Giờ kết thúc trong ngày</label>
                  <input
                    type="time"
                    value={config.endTime}
                    onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">VD: 23:00 đêm</p>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Nút kêu gọi hành động (CTA Button) */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Nút Hành Động & Liên Kết (CTA)</h3>
                  <p className="text-xs text-zinc-400">Điều hướng khách đến mục ưu đãi hoặc trang chỉ định</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showCta}
                  onChange={(e) => setConfig({ ...config, showCta: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2.5 text-xs text-zinc-300">{config.showCta ? 'Hiện Nút' : 'Ẩn Nút'}</span>
              </label>
            </div>

            {config.showCta && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Chữ trên nút (Label)</label>
                  <input
                    type="text"
                    value={config.ctaText}
                    onChange={(e) => setConfig({ ...config, ctaText: e.target.value })}
                    placeholder="VD: Khám Phá Ngay"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Đường dẫn liên kết (Link)</label>
                  <input
                    type="text"
                    value={config.ctaLink}
                    onChange={(e) => setConfig({ ...config, ctaLink: e.target.value })}
                    placeholder="VD: #game-catalog-section hoặc https://..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="targetBlank"
                    checked={config.ctaTargetBlank}
                    onChange={(e) => setConfig({ ...config, ctaTargetBlank: e.target.checked })}
                    className="rounded bg-zinc-900 border-zinc-700 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="targetBlank" className="text-xs text-zinc-400 cursor-pointer">
                    Mở liên kết trong tab mới (`target="_blank"`)
                  </label>
                </div>
              </div>
            )}

            {/* Secondary Button / Dismiss settings */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Nút đóng phụ (Secondary button)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showSecondaryButton}
                    onChange={(e) => setConfig({ ...config, showSecondaryButton: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              {config.showSecondaryButton && (
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Chữ nút phụ</label>
                  <input
                    type="text"
                    value={config.secondaryButtonText}
                    onChange={(e) => setConfig({ ...config, secondaryButtonText: e.target.value })}
                    placeholder="VD: Để sau"
                    className="w-full sm:w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="showDoNotShowAgain"
                  checked={config.showDoNotShowAgain}
                  onChange={(e) => setConfig({ ...config, showDoNotShowAgain: e.target.checked })}
                  className="rounded bg-zinc-900 border-zinc-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="showDoNotShowAgain" className="text-xs text-zinc-400 cursor-pointer">
                  Hiển thị nút / checkbox: <em>"Không hiển thị lại trong ngày hôm nay"</em>
                </label>
              </div>
            </div>
          </div>

          {/* Card 5: Tần suất & Trải nghiệm (Nâng cao) */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Tần Suất & Trải Nghiệm Khách Hàng</h3>
                <p className="text-xs text-zinc-400">Tối ưu để không gây phiền toái cho người dùng</p>
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">Tần suất hiển thị</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'once_session', label: '1 lần mỗi phiên', desc: 'Đóng là tắt đến khi mở tab mới' },
                  { id: 'once_day', label: '1 lần mỗi ngày', desc: 'Chỉ hiện lại sau 24h' },
                  { id: 'always', label: 'Mỗi lần tải trang', desc: 'Luôn hiện khi refresh web' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig({ ...config, frequency: item.id as FloatingNotificationFrequency })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      config.frequency === item.id
                        ? 'bg-purple-950/40 border-purple-500 text-purple-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Delay & Dismiss */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Thời gian trễ khi vào web (Giây)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={config.delaySeconds}
                    onChange={(e) => setConfig({ ...config, delaySeconds: Number(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                  <span className="text-xs font-mono font-bold text-cyan-400 min-w-[2.5rem]">
                    {config.delaySeconds}s
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Trang web sẽ tải xong {config.delaySeconds}s rồi mới hiển thị.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tự động đóng sau (Giây)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="5"
                    value={config.autoDismissSeconds}
                    onChange={(e) => setConfig({ ...config, autoDismissSeconds: Number(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                  <span className="text-xs font-mono font-bold text-purple-400 min-w-[3rem]">
                    {config.autoDismissSeconds === 0 ? 'Không' : `${config.autoDismissSeconds}s`}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {config.autoDismissSeconds === 0 ? 'Người dùng bấm đóng mới ẩn.' : `Tự biến mất sau ${config.autoDismissSeconds} giây.`}
                </p>
              </div>
            </div>

            {/* Theme & Page Targeting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Giao diện màu sắc</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cyber', label: 'Neon Cyber', color: 'from-purple-500 to-cyan-500' },
                    { id: 'gold', label: 'Hoàng Gia Gold', color: 'from-amber-400 to-yellow-600' },
                    { id: 'emerald', label: 'Ngọc Lục Bảo', color: 'from-emerald-400 to-teal-500' },
                    { id: 'crimson', label: 'Đỏ Ruby Hot', color: 'from-rose-500 to-red-600' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setConfig({ ...config, theme: t.id as FloatingNotificationTheme })}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                        config.theme === t.id
                          ? 'bg-zinc-800 border-white/40 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${t.color}`} />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Trang áp dụng</label>
                <select
                  value={config.targetPages}
                  onChange={(e) => setConfig({ ...config, targetPages: e.target.value as 'all' | 'home_only' })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Tất cả các trang trên website</option>
                  <option value="home_only">Chỉ hiển thị tại trang chủ</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">Xem Trước Trực Quan</span>
                </div>

                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      previewDevice === 'desktop' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Mô phỏng Desktop"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      previewDevice === 'mobile' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Mô phỏng Mobile"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status info */}
              <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      config.enabled ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-zinc-300 font-medium">
                    {config.enabled ? 'Đang kích hoạt' : 'Đang tạm dừng'}
                  </span>
                </div>
                {previewDismissed && (
                  <button
                    type="button"
                    onClick={() => setPreviewDismissed(false)}
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" /> Hiện lại
                  </button>
                )}
              </div>

              {/* Mockup Canvas Screen */}
              <div
                className={`relative mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                  previewDevice === 'mobile' ? 'w-full max-w-[280px] h-[480px]' : 'w-full h-[440px]'
                }`}
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08) 0%, rgba(0, 0, 0, 0.95) 100%)',
                }}
              >
                {/* Mock Website Header */}
                <div className="h-9 bg-zinc-900/90 border-b border-zinc-800/80 px-3 flex items-center justify-between text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    CodeGame Store
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Mã Giftcode</span>
                    <span className="text-zinc-500">Nạp ví</span>
                  </div>
                </div>

                {/* Mock Web Content */}
                <div className="flex-1 p-3 space-y-2 opacity-30 select-none pointer-events-none">
                  <div className="h-16 rounded-lg bg-zinc-800/60" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-12 rounded bg-zinc-800/40" />
                    <div className="h-12 rounded bg-zinc-800/40" />
                  </div>
                  <div className="h-20 rounded bg-zinc-800/30" />
                </div>

                {/* Render the actual notification in preview! */}
                {config.enabled && !previewDismissed && (
                  <div
                    className={`transition-all duration-300 ${
                      config.position === 'center_modal'
                        ? 'absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 z-30'
                        : config.position === 'top_bar'
                        ? 'absolute top-9 left-0 right-0 z-30'
                        : config.position === 'bottom_bar'
                        ? 'absolute bottom-0 left-0 right-0 z-30'
                        : config.position === 'bottom_left'
                        ? 'absolute bottom-3 left-3 max-w-[90%] z-30'
                        : 'absolute bottom-3 right-3 max-w-[90%] z-30'
                    }`}
                  >
                    {/* Bar positions */}
                    {config.position === 'top_bar' || config.position === 'bottom_bar' ? (
                      <div
                        className={`w-full p-2.5 px-3 border shadow-lg flex items-center justify-between gap-2 ${themeStyles.wrapper}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {renderIcon(config.iconType, config.customIconUrl, 'w-4 h-4 shrink-0')}
                          <div className="truncate text-left">
                            <span className={`text-[11px] font-bold ${themeStyles.title} mr-1.5`}>
                              {config.title}
                            </span>
                            <span className="text-[10px] text-zinc-300 truncate hidden sm:inline">
                              <RichTextRenderer content={config.message} />
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {config.showCta && (
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded-md text-[10px] shadow transition-transform ${themeStyles.cta}`}
                            >
                              {config.ctaText || 'Xem'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPreviewDismissed(true)}
                            className="text-zinc-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Card & Modal positions */
                      <div
                        className={`relative rounded-xl p-3.5 border shadow-2xl text-left ${themeStyles.wrapper} ${
                          config.position === 'center_modal' ? 'w-full max-w-[280px]' : 'w-[250px]'
                        }`}
                      >
                        {/* Close button */}
                        <button
                          type="button"
                          onClick={() => setPreviewDismissed(true)}
                          className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-start gap-2.5 mb-2">
                          <div className="p-1.5 rounded-lg bg-black/40 border border-white/10 shrink-0">
                            {renderIcon(config.iconType, config.customIconUrl, 'w-5 h-5')}
                          </div>
                          <div className="pr-4">
                            <h4 className={`text-xs font-bold leading-tight ${themeStyles.title}`}>
                              {config.title || 'Tiêu đề thông báo'}
                            </h4>
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-300 leading-relaxed mb-3 line-clamp-3">
                          <RichTextRenderer content={config.message || 'Nội dung thông báo nổi chi tiết...'} />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          {config.showCta && (
                            <button
                              type="button"
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs text-center shadow transition-transform active:scale-95 ${themeStyles.cta}`}
                            >
                              {config.ctaText || 'Khám Phá'}
                            </button>
                          )}
                          {config.showSecondaryButton && (
                            <button
                              type="button"
                              onClick={() => setPreviewDismissed(true)}
                              className="py-1.5 px-2.5 rounded-lg text-[11px] text-zinc-400 hover:text-white bg-zinc-800/80 border border-zinc-700/60"
                            >
                              {config.secondaryButtonText || 'Đóng'}
                            </button>
                          )}
                        </div>

                        {config.showDoNotShowAgain && (
                          <div className="mt-2 text-center">
                            <span className="text-[9px] text-zinc-400 hover:text-zinc-300 cursor-pointer">
                              ✕ Không hiển thị lại hôm nay
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Instructions banner */}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                <p className="text-[11px] leading-relaxed">
                  Thông báo nổi được đồng bộ tức thì qua Cloudflare KV. Khi lưu thành công, bất kỳ người dùng nào đang hoặc vừa vào web sẽ nhận được thông báo theo cấu hình bạn đã đặt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingNotificationModule;
