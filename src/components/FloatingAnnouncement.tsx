import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  BellRing,
  Gift,
  Flame,
  Sparkles,
  Star,
  Shield,
  Palette,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import {
  FloatingNotificationConfig,
  DEFAULT_FLOATING_NOTIFICATION,
  FloatingNotificationIconType,
  FloatingNotificationTheme,
} from '../types/floatingNotification';
import { RichTextRenderer } from './RichTextRenderer';

interface FloatingAnnouncementProps {
  onNavigateTab?: (tab: string) => void;
}

export const FloatingAnnouncement: React.FC<FloatingAnnouncementProps> = ({ onNavigateTab }) => {
  const [config, setConfig] = useState<FloatingNotificationConfig>(() =>
    dataService.getFloatingNotificationConfig()
  );
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [doNotShowAgainChecked, setDoNotShowAgainChecked] = useState(false);

  // Helper: check time-of-day condition
  const checkTimeSchedule = useCallback((cfg: FloatingNotificationConfig): boolean => {
    if (cfg.scheduleMode === 'all_day') return true;
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = (cfg.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = (cfg.endTime || '23:59').split(':').map(Number);
      const startMinutes = (startH || 0) * 60 + (startM || 0);
      const endMinutes = (endH || 0) * 60 + (endM || 0);

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }
      // Overnight (e.g. 22:00 -> 06:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } catch {
      return true;
    }
  }, []);

  // Helper: check user frequency & suppression
  const checkSuppression = useCallback((cfg: FloatingNotificationConfig): boolean => {
    if (typeof window === 'undefined') return true;

    // Direct session suppression: Once dismissed in this browser session, never show again in this session
    if (sessionStorage.getItem('wcg_floating_dismissed_session') === 'true') {
      return true;
    }

    // Unique fingerprint for this specific announcement version
    const announcementFingerprint = `${cfg.updatedAt || ''}_${cfg.title}_${cfg.position}_${(cfg.message || '').slice(0, 30)}`;
    const dismissedFingerprint =
      sessionStorage.getItem('wcg_floating_dismissed_version') ||
      localStorage.getItem('wcg_floating_dismissed_version');

    // Only apply suppression IF user previously dismissed this exact announcement version
    if (dismissedFingerprint && dismissedFingerprint === announcementFingerprint) {
      // Check "Do not show today"
      const doNotShowToday = localStorage.getItem('wcg_floating_do_not_show_today');
      const todayStr = new Date().toDateString();
      if (doNotShowToday === todayStr) {
        return true; // Suppressed
      }

      if (cfg.frequency === 'once_session') {
        const sessionDismissed = sessionStorage.getItem('wcg_floating_dismissed_session');
        if (sessionDismissed === 'true') return true;
      } else if (cfg.frequency === 'once_day') {
        const dayDismissed = localStorage.getItem('wcg_floating_dismissed_date');
        if (dayDismissed === todayStr) return true;
      }
    }

    // Target pages check
    if (cfg.targetPages === 'home_only') {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const isHome =
        (path === '/' || path === '') &&
        (!hash || hash === '#' || hash === '#/' || hash.startsWith('#game-catalog') || hash.startsWith('#g/'));
      if (!isHome) return true;
    }

    return false;
  }, []);

  // Listen to remote changes or admin saves
  useEffect(() => {
    const handleUpdate = (e?: any) => {
      const detailCfg = e?.detail;
      let fresh: FloatingNotificationConfig;
      if (detailCfg && typeof detailCfg === 'object' && detailCfg.title) {
        fresh = detailCfg;
      } else {
        fresh = dataService.getFloatingNotificationConfig();
      }
      setConfig(fresh);
      setIsDismissed(false);
    };

    window.addEventListener('wcg_admin_content_updated', handleUpdate);
    window.addEventListener('wcg_floating_notification_updated', handleUpdate);
    return () => {
      window.removeEventListener('wcg_admin_content_updated', handleUpdate);
      window.removeEventListener('wcg_floating_notification_updated', handleUpdate);
    };
  }, []);

  // Refresh config on mount in case dataService or localStorage has freshly loaded state
  useEffect(() => {
    const fresh = dataService.getFloatingNotificationConfig();
    setConfig(fresh);
  }, []);

  // Evaluation & Display Timer Effect
  useEffect(() => {
    if (!config.enabled) {
      setIsVisible(false);
      return;
    }

    if (isDismissed) return;

    const suppressed = checkSuppression(config);
    if (suppressed) {
      setIsVisible(false);
      return;
    }

    const inSchedule = checkTimeSchedule(config);
    if (!inSchedule) {
      setIsVisible(false);
      return;
    }

    // Start delay timer
    const delayMs = Math.max(0, (config.delaySeconds || 0) * 1000);
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => clearTimeout(showTimer);
  }, [config, isDismissed, checkSuppression, checkTimeSchedule]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!isVisible || !config.autoDismissSeconds || config.autoDismissSeconds <= 0) return;

    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, config.autoDismissSeconds * 1000);

    return () => clearTimeout(dismissTimer);
  }, [isVisible, config.autoDismissSeconds]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);

    if (typeof window !== 'undefined') {
      const todayStr = new Date().toDateString();
      const announcementFingerprint = `${config.updatedAt || ''}_${config.title}_${config.position}_${(config.message || '').slice(0, 30)}`;

      sessionStorage.setItem('wcg_floating_dismissed_session', 'true');
      sessionStorage.setItem('wcg_floating_dismissed_version', announcementFingerprint);
      localStorage.setItem('wcg_floating_dismissed_version', announcementFingerprint);

      if (doNotShowAgainChecked) {
        localStorage.setItem('wcg_floating_do_not_show_today', todayStr);
      }

      if (config.frequency === 'once_session') {
        sessionStorage.setItem('wcg_floating_dismissed_session', 'true');
      } else if (config.frequency === 'once_day') {
        localStorage.setItem('wcg_floating_dismissed_date', todayStr);
      }
    }
  };

  const handleCtaClick = (e: React.MouseEvent, overrideLink?: string) => {
    const link = overrideLink || config.ctaLink;
    if (!link) return;

    // Handle internal navigation if needed
    if (link.startsWith('#')) {
      e.preventDefault();
      const hashPart = link.replace('#', '');
      const [baseSection, queryStr] = hashPart.split('?');
      const params = new URLSearchParams(queryStr || '');

      // Check tab target
      if (baseSection === 'giveaways' || link.includes('giveaway')) {
        onNavigateTab?.('giveaways');
        const gwId = params.get('gw') || params.get('id');
        if (gwId) {
          window.location.hash = link;
          window.dispatchEvent(new CustomEvent('wcg_open_giveaway_detail', { detail: { id: gwId } }));
        } else {
          window.location.hash = '#giveaways';
        }
      } else if (baseSection === 'utilities' || link.includes('utility')) {
        onNavigateTab?.('utilities');
        const utId = params.get('utility') || params.get('ut') || params.get('id');
        if (utId) {
          window.location.hash = link;
          window.dispatchEvent(new CustomEvent('wcg_open_utility_detail', { detail: { id: utId } }));
        } else {
          window.location.hash = '#utilities';
        }
      } else if (baseSection === 'store' || link.includes('store') || link.includes('product')) {
        onNavigateTab?.('store');
        const prodId = params.get('product') || params.get('prod') || params.get('id');
        if (prodId) {
          window.location.hash = link;
          window.dispatchEvent(new CustomEvent('wcg_open_store_detail', { detail: { id: prodId } }));
        } else {
          window.location.hash = '#store';
        }
      } else if (baseSection === 'news' || link.includes('news')) {
        onNavigateTab?.('news');
        window.location.hash = link;
      } else {
        const element = document.getElementById(baseSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.hash = link;
        }
      }
      handleDismiss();
      return;
    }

    if (config.ctaTargetBlank) {
      // Default browser behavior for target="_blank"
    } else {
      window.location.href = link;
      handleDismiss();
    }
  };

  if (!isVisible || !config.enabled) return null;

  // Icon renderer
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

  // Theme styling
  const getThemeClasses = (theme: FloatingNotificationTheme) => {
    switch (theme) {
      case 'gold':
        return {
          card: 'bg-gradient-to-br from-amber-950/95 via-zinc-950/95 to-yellow-950/90 border-amber-500/50 shadow-2xl shadow-amber-500/20 text-white',
          title: 'text-amber-300',
          cta: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold hover:brightness-110 shadow-lg shadow-amber-500/30',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          bar: 'bg-gradient-to-r from-amber-950 via-zinc-950 to-yellow-950 border-amber-500/40 text-amber-100',
        };
      case 'emerald':
        return {
          card: 'bg-gradient-to-br from-emerald-950/95 via-zinc-950/95 to-teal-950/90 border-emerald-500/50 shadow-2xl shadow-emerald-500/20 text-white',
          title: 'text-emerald-300',
          cta: 'bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-bold hover:brightness-110 shadow-lg shadow-emerald-500/30',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          bar: 'bg-gradient-to-r from-emerald-950 via-zinc-950 to-teal-950 border-emerald-500/40 text-emerald-100',
        };
      case 'crimson':
        return {
          card: 'bg-gradient-to-br from-rose-950/95 via-zinc-950/95 to-red-950/90 border-rose-500/50 shadow-2xl shadow-rose-500/20 text-white',
          title: 'text-rose-300',
          cta: 'bg-gradient-to-r from-rose-600 to-red-500 text-white font-bold hover:brightness-110 shadow-lg shadow-rose-500/30',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          bar: 'bg-gradient-to-r from-rose-950 via-zinc-950 to-red-950 border-rose-500/40 text-rose-100',
        };
      case 'cyber':
      default:
        return {
          card: 'bg-gradient-to-br from-purple-950/95 via-zinc-950/95 to-cyan-950/90 border-purple-500/50 shadow-2xl shadow-purple-500/25 text-white',
          title: 'text-cyan-300',
          cta: 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold hover:brightness-110 shadow-lg shadow-cyan-500/30',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          bar: 'bg-gradient-to-r from-purple-950 via-zinc-950 to-cyan-950 border-purple-500/40 text-cyan-100',
        };
    }
  };

  const themeStyles = getThemeClasses(config.theme);

  // Render Mini Event Spotlight Card
  const renderEventSpotlightCard = (spotlight?: typeof config.eventSpotlight, isCompact = false) => {
    if (!spotlight || !spotlight.enabled || !spotlight.title) return null;

    const eventBadge = spotlight.badgeText || (spotlight.type === 'giveaway' ? '🔴 ĐANG DIỄN RA' : '⚡ FLASH SALE');
    const eventCtaText = spotlight.ctaText || 'Đến Ngay ➔';
    const targetLink = spotlight.ctaLink || (spotlight.type === 'giveaway' ? '#giveaways' : '#utilities');

    return (
      <div
        onClick={(e) => handleCtaClick(e, targetLink)}
        className={`group relative overflow-hidden rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-purple-500/15 transition-all hover:border-amber-400/70 hover:from-amber-500/25 hover:to-purple-500/25 cursor-pointer shadow-lg my-3 select-none ${
          isCompact ? 'p-2.5' : 'p-3 sm:p-3.5'
        }`}
      >
        {/* Glow ambient effect */}
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-400/30 transition-all pointer-events-none" />

        <div className="relative flex items-center gap-3">
          {/* Thumbnail / Icon */}
          <div className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-amber-500/40 bg-black/60 shadow-inner flex items-center justify-center">
            {spotlight.imageUrl ? (
              <img
                src={spotlight.imageUrl}
                alt={spotlight.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : spotlight.type === 'giveaway' ? (
              <Gift className="w-6 h-6 text-amber-400 animate-bounce" />
            ) : (
              <Flame className="w-6 h-6 text-rose-400 animate-pulse" />
            )}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                {eventBadge}
              </span>
              {typeof spotlight.remainingCodes === 'number' && spotlight.remainingCodes > 0 && (
                <span className="text-[10px] text-amber-300 font-mono font-bold">
                  • Còn {spotlight.remainingCodes} suất
                </span>
              )}
            </div>

            <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate leading-snug">
              {spotlight.title}
            </h5>

            {spotlight.subtitle && (
              <p className="text-[11px] text-zinc-300 line-clamp-1 mt-0.5 font-medium">
                {spotlight.subtitle}
              </p>
            )}
          </div>

          {/* Action button */}
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-zinc-950 font-black text-[11px] shadow-md group-hover:scale-105 active:scale-95 transition-all">
              <span>{eventCtaText}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Position 1: CENTER MODAL POPUP (with backdrop overlay)
  if (config.position === 'center_modal') {
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
        <div
          className={`relative w-full max-w-md rounded-2xl p-6 border ${themeStyles.card} shadow-2xl animate-in zoom-in-95 duration-200`}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            title="Đóng thông báo"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 shrink-0">
              {renderIcon(config.iconType, config.customIconUrl, 'w-8 h-8')}
            </div>
            <div className="pr-6">
              <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mb-1.5 ${themeStyles.badge}`}>
                Thông Báo Nổi Bật
              </span>
              <h3 className={`text-base sm:text-lg font-bold leading-snug ${themeStyles.title}`}>
                {config.title}
              </h3>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-2 mb-4 whitespace-pre-line">
            <RichTextRenderer content={config.message} />
          </div>

          {/* Thẻ Sự Kiện Đang Diễn Ra (Event Spotlight) */}
          {renderEventSpotlightCard(config.eventSpotlight)}

          <div className="flex items-center gap-3 mt-4">
            {config.showCta && (
              <a
                href={config.ctaLink}
                target={config.ctaTargetBlank ? '_blank' : '_self'}
                rel="noreferrer"
                onClick={handleCtaClick}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm text-center transition-transform active:scale-95 ${themeStyles.cta}`}
              >
                <span>{config.ctaText || 'Khám Phá Ngay'}</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            )}
            {config.showSecondaryButton && (
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-4 rounded-xl text-xs sm:text-sm text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors"
              >
                {config.secondaryButtonText || 'Để sau'}
              </button>
            )}
          </div>

          {config.showDoNotShowAgain && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2">
              <input
                type="checkbox"
                id="floating_modal_dismiss_today"
                checked={doNotShowAgainChecked}
                onChange={(e) => setDoNotShowAgainChecked(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <label
                htmlFor="floating_modal_dismiss_today"
                className="text-[11px] text-zinc-400 hover:text-zinc-300 cursor-pointer select-none"
              >
                Không hiển thị lại trong ngày hôm nay
              </label>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Position 2 & 3: TOP BAR or BOTTOM BAR
  if (config.position === 'top_bar' || config.position === 'bottom_bar') {
    const isTop = config.position === 'top_bar';
    return (
      <div
        className={`fixed left-0 right-0 z-[90] p-2.5 sm:p-3 border-y backdrop-blur-md shadow-2xl transition-all duration-300 ${
          isTop ? 'top-0 animate-in slide-in-from-top' : 'bottom-0 md:bottom-0 mb-16 md:mb-0 animate-in slide-in-from-bottom'
        } ${themeStyles.bar}`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            <div className="shrink-0 p-1.5 rounded-lg bg-black/40 border border-white/10">
              {renderIcon(config.iconType, config.customIconUrl, 'w-4 h-4 sm:w-5 sm:h-5')}
            </div>
            <div className="truncate text-left">
              <span className={`text-xs sm:text-sm font-bold mr-2 ${themeStyles.title}`}>
                {config.title}
              </span>
              <span className="text-xs text-zinc-300 truncate hidden md:inline">
                <RichTextRenderer content={config.message} />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            {config.showCta && (
              <a
                href={config.ctaLink}
                target={config.ctaTargetBlank ? '_blank' : '_self'}
                rel="noreferrer"
                onClick={handleCtaClick}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-transform active:scale-95 ${themeStyles.cta}`}
              >
                {config.ctaText || 'Xem Ngay'}
              </a>
            )}

            {config.showSecondaryButton && (
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white bg-black/30 border border-white/10"
              >
                {config.secondaryButtonText || 'Đóng'}
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-md text-zinc-400 hover:text-white"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Position 4 & 5: BOTTOM RIGHT or BOTTOM LEFT FLOATING CARDS
  const isLeft = config.position === 'bottom_left';

  return (
    <div
      className={`fixed z-[90] transition-all duration-300 max-w-[340px] sm:max-w-sm w-[calc(100vw-2rem)] ${
        isLeft ? 'left-4' : 'right-4'
      } bottom-6 md:bottom-6 animate-in slide-in-from-bottom-5 fade-in duration-300`}
    >
      <div className={`relative rounded-2xl p-4 sm:p-5 border backdrop-blur-xl ${themeStyles.card}`}>
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-2.5">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
            {renderIcon(config.iconType, config.customIconUrl, 'w-6 h-6')}
          </div>
          <div className="pr-5">
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-1 ${themeStyles.badge}`}>
              Thông Báo Mới
            </span>
            <h4 className={`text-xs sm:text-sm font-bold leading-tight ${themeStyles.title}`}>
              {config.title}
            </h4>
          </div>
        </div>

        <div className="text-xs text-zinc-300 leading-relaxed mb-3 line-clamp-3">
          <RichTextRenderer content={config.message} />
        </div>

        {/* Thẻ Sự Kiện Đang Diễn Ra (Event Spotlight) */}
        {renderEventSpotlightCard(config.eventSpotlight, true)}

        {/* CTA & Actions */}
        <div className="flex items-center gap-2.5">
          {config.showCta && (
            <a
              href={config.ctaLink}
              target={config.ctaTargetBlank ? '_blank' : '_self'}
              rel="noreferrer"
              onClick={handleCtaClick}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs text-center transition-transform active:scale-95 ${themeStyles.cta}`}
            >
              <span>{config.ctaText || 'Xem Ngay'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          )}
          {config.showSecondaryButton && (
            <button
              type="button"
              onClick={handleDismiss}
              className="py-2 px-3 rounded-xl text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors"
            >
              {config.secondaryButtonText || 'Đóng'}
            </button>
          )}
        </div>

        {config.showDoNotShowAgain && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDoNotShowAgainChecked(true);
                handleDismiss();
              }}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ✕ Không hiển thị lại hôm nay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingAnnouncement;
