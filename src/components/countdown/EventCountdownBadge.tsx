import React from 'react';
import { Clock, Flame, Sparkles, Zap } from 'lucide-react';
import { useEventCountdown } from '../../hooks/useEventCountdown';
import { ScheduledEventTheme } from '../../types/eventScheduler';

interface EventCountdownBadgeProps {
  targetDate: string;
  label?: string;
  theme?: ScheduledEventTheme;
  variant?: 'compact' | 'pill' | 'detailed';
  onExpire?: () => void;
  className?: string;
}

const themeStyles: Record<ScheduledEventTheme, {
  container: string;
  iconColor: string;
  numberBg: string;
  textColor: string;
  glow: string;
}> = {
  fire: {
    container: 'bg-gradient-to-r from-red-950/80 via-orange-950/80 to-amber-950/80 border-orange-500/40 text-orange-200',
    iconColor: 'text-orange-400 animate-pulse',
    numberBg: 'bg-orange-950/80 text-orange-300 border-orange-500/30',
    textColor: 'text-orange-300 font-semibold',
    glow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]',
  },
  cyber: {
    container: 'bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-pink-950/80 border-purple-500/40 text-purple-200',
    iconColor: 'text-cyan-400 animate-pulse',
    numberBg: 'bg-purple-950/80 text-cyan-300 border-cyan-500/30',
    textColor: 'text-cyan-300 font-semibold',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]',
  },
  gold: {
    container: 'bg-gradient-to-r from-amber-950/80 via-yellow-950/80 to-amber-900/80 border-yellow-500/40 text-yellow-200',
    iconColor: 'text-yellow-400 animate-pulse',
    numberBg: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/30',
    textColor: 'text-yellow-300 font-semibold',
    glow: 'shadow-[0_0_12px_rgba(234,179,8,0.25)]',
  },
  emerald: {
    container: 'bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-cyan-950/80 border-emerald-500/40 text-emerald-200',
    iconColor: 'text-emerald-400 animate-pulse',
    numberBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    textColor: 'text-emerald-300 font-semibold',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
  },
};

export const EventCountdownBadge: React.FC<EventCountdownBadgeProps> = ({
  targetDate,
  label = 'Mở sau:',
  theme = 'fire',
  variant = 'compact',
  onExpire,
  className = '',
}) => {
  const { days, hours, minutes, seconds, isExpired } = useEventCountdown(targetDate, onExpire);
  const styling = themeStyles[theme] || themeStyles.fire;

  if (isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse ${className}`}>
        <Zap className="w-3.5 h-3.5 text-emerald-400" />
        <span>ĐANG DIỄN RA</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  // Compact variant (suitable for product cards and small lists)
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border backdrop-blur-md ${styling.container} ${styling.glow} ${className}`}
      >
        <Clock className={`w-3.5 h-3.5 ${styling.iconColor}`} />
        <span className="text-[11px] opacity-80">{label}</span>
        <span className={`font-mono font-bold tracking-wider ${styling.textColor}`}>
          {days > 0 ? `${days}d ` : ''}
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
      </div>
    );
  }

  // Pill variant (simple inline tag)
  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${styling.container} ${className}`}
      >
        <Flame className={`w-3 h-3 ${styling.iconColor}`} />
        <span>{label}</span>
        <span className="font-mono font-bold">
          {days > 0 ? `${days}d ` : ''}
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
      </div>
    );
  }

  // Detailed block timer (for modals, headers, hero banners)
  return (
    <div
      className={`flex flex-col sm:flex-row items-center gap-2 p-2.5 sm:px-3 sm:py-2 rounded-xl border backdrop-blur-md ${styling.container} ${styling.glow} ${className}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
        <Sparkles className={`w-4 h-4 ${styling.iconColor}`} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1 font-mono text-xs font-bold">
        {days > 0 && (
          <>
            <div className={`px-1.5 py-0.5 rounded border ${styling.numberBg}`}>
              {pad(days)}<span className="text-[9px] font-sans ml-0.5 opacity-70">N</span>
            </div>
            <span className="opacity-60">:</span>
          </>
        )}
        <div className={`px-1.5 py-0.5 rounded border ${styling.numberBg}`}>
          {pad(hours)}<span className="text-[9px] font-sans ml-0.5 opacity-70">G</span>
        </div>
        <span className="opacity-60">:</span>
        <div className={`px-1.5 py-0.5 rounded border ${styling.numberBg}`}>
          {pad(minutes)}<span className="text-[9px] font-sans ml-0.5 opacity-70">P</span>
        </div>
        <span className="opacity-60">:</span>
        <div className={`px-1.5 py-0.5 rounded border ${styling.numberBg} animate-pulse`}>
          {pad(seconds)}<span className="text-[9px] font-sans ml-0.5 opacity-70">S</span>
        </div>
      </div>
    </div>
  );
};
