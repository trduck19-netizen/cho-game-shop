import React, { useState, useEffect } from 'react';
import { Flame, Clock, Sparkles, ChevronRight, X, Zap } from 'lucide-react';
import { eventSchedulerService } from '../../services/eventSchedulerService';
import { useEventCountdown } from '../../hooks/useEventCountdown';
import { ScheduledEventRecord, ScheduledEventStatus, ScheduledEventTheme } from '../../types/eventScheduler';

interface TopEventBannerProps {
  onNavigate?: (link: string, targetType?: string, targetId?: string) => void;
}

const themeStyles: Record<ScheduledEventTheme, {
  bg: string;
  border: string;
  text: string;
  accentText: string;
  badgeBg: string;
  buttonBg: string;
  buttonHover: string;
}> = {
  fire: {
    bg: 'bg-gradient-to-r from-red-950 via-orange-950 to-neutral-950',
    border: 'border-orange-500/40',
    text: 'text-orange-100',
    accentText: 'text-orange-400',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    buttonBg: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-900/50',
    buttonHover: 'hover:from-orange-500 hover:to-amber-500',
  },
  cyber: {
    bg: 'bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950',
    border: 'border-cyan-500/40',
    text: 'text-cyan-100',
    accentText: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    buttonBg: 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-cyan-900/50',
    buttonHover: 'hover:from-cyan-500 hover:to-purple-500',
  },
  gold: {
    bg: 'bg-gradient-to-r from-amber-950 via-yellow-950 to-neutral-950',
    border: 'border-yellow-500/40',
    text: 'text-yellow-100',
    accentText: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    buttonBg: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 shadow-yellow-900/50 font-bold',
    buttonHover: 'hover:from-amber-400 hover:to-yellow-400',
  },
  emerald: {
    bg: 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950',
    border: 'border-emerald-500/40',
    text: 'text-emerald-100',
    accentText: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    buttonBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-900/50',
    buttonHover: 'hover:from-emerald-500 hover:to-teal-500',
  },
};

export const TopEventBanner: React.FC<TopEventBannerProps> = ({ onNavigate }) => {
  const [activeBanner, setActiveBanner] = useState<{
    event: ScheduledEventRecord;
    status: ScheduledEventStatus;
  } | null>(null);

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('wcg_dismissed_top_banner') === 'true';
  });

  const refreshBanner = () => {
    const bannerData = eventSchedulerService.getTopBannerSchedule();
    if (bannerData && bannerData.status !== 'ENDED' && bannerData.status !== 'HIDDEN') {
      setActiveBanner({
        event: bannerData.event,
        status: bannerData.status,
      });
    } else {
      setActiveBanner(null);
    }
  };

  useEffect(() => {
    refreshBanner();
    const unsub = eventSchedulerService.onUpdate(() => {
      refreshBanner();
    });
    return unsub;
  }, []);

  const event = activeBanner?.event;
  const status = activeBanner?.status;

  // Determine target time based on status:
  // If UPCOMING: countdown to start_time.
  // If LIVE: countdown to end_time.
  const targetTime = status === 'LIVE' ? event?.end_time : event?.start_time;

  const { days, hours, minutes, seconds, isExpired } = useEventCountdown(
    targetTime,
    () => {
      // Khi countdown về 0: re-evaluate banner status ngay lập tức
      setTimeout(refreshBanner, 500);
    }
  );

  if (!event || isDismissed) {
    return null;
  }

  const theme = event.theme || 'fire';
  const styling = themeStyles[theme] || themeStyles.fire;
  const pad = (n: number) => String(n).padStart(2, '0');

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      sessionStorage.setItem('wcg_dismissed_top_banner', 'true');
    } catch {}
  };

  const handleClickBanner = () => {
    if (!onNavigate) return;
    if (event.cta_link) {
      onNavigate(event.cta_link, event.type, event.target_id);
      return;
    }

    if (event.type === 'GIVEAWAY') {
      onNavigate('/giveaways', 'giveaway', event.target_id);
    } else if (event.type === 'FLASH_SALE_PRODUCT') {
      onNavigate('/utilities', 'product', event.target_id);
    }
  };

  const isLive = status === 'LIVE';

  return (
    <aside
      aria-label="Thông báo sự kiện và khuyến mãi đặc biệt"
      onClick={handleClickBanner}
      className={`relative w-full z-40 border-b cursor-pointer transition-all duration-300 ${styling.bg} ${styling.border} ${styling.text}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left Side: Badge + Title + Subtitle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                : styling.badgeBg
            }`}
          >
            {isLive ? (
              <>
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>ĐANG DIỄN RA</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                <span>{event.badge_label || 'SẮP DIỄN RA'}</span>
              </>
            )}
          </div>

          <div className="truncate">
            <span className="font-bold text-xs sm:text-sm tracking-wide mr-1.5">
              {event.title}
            </span>
            {event.subtitle && (
              <span className="hidden md:inline text-xs opacity-75 font-normal">
                — {event.subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Center / Right Side: Realtime Countdown Clock + Action Button */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Countdown timer */}
          <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-xs font-bold bg-black/40 px-2 sm:px-2.5 py-1 rounded-lg border border-white/10 shadow-inner">
            <Clock className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-400 animate-spin' : styling.accentText}`} />
            <span className="text-[11px] font-sans opacity-70 mr-0.5">
              {isLive ? 'Còn lại:' : 'Mở sau:'}
            </span>
            {days > 0 && (
              <>
                <span className="bg-white/10 px-1 py-0.5 rounded">{pad(days)}d</span>
                <span className="opacity-50">:</span>
              </>
            )}
            <span className="bg-white/10 px-1 py-0.5 rounded">{pad(hours)}</span>
            <span className="opacity-50">:</span>
            <span className="bg-white/10 px-1 py-0.5 rounded">{pad(minutes)}</span>
            <span className="opacity-50">:</span>
            <span className="bg-white/10 px-1 py-0.5 rounded text-amber-400 animate-pulse">{pad(seconds)}</span>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            className={`hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 ${styling.buttonBg} ${styling.buttonHover}`}
          >
            <span>{event.cta_text || (isLive ? 'Tham Gia Ngay' : 'Xem Chi Tiết')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Đóng thông báo sự kiện"
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
