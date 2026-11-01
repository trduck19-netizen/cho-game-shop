import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode;
  change?: {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
    label?: string;
  };
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
  subtext?: string;
  subtitle?: string;
  onClick?: () => void;
}

const colorStyles = {
  indigo: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/20 hover:border-indigo-500/40',
    accent: 'bg-indigo-500',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    accent: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    accent: 'bg-amber-500',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20 hover:border-rose-500/40',
    accent: 'bg-rose-500',
  },
  sky: {
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/20 hover:border-sky-500/40',
    accent: 'bg-sky-500',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    accent: 'bg-purple-500',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  color = 'indigo',
  subtext,
  subtitle,
  onClick,
}) => {
  const styles = colorStyles[color] || colorStyles.indigo;
  const displaySubtext = subtext || subtitle;

  const renderIcon = () => {
    if (!icon) {
      return <Activity className="h-4 w-4 sm:h-6 sm:w-6" />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="h-4 w-4 sm:h-6 sm:w-6" />;
    }
    return <Activity className="h-4 w-4 sm:h-6 sm:w-6" />;
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl border bg-white p-3.5 sm:p-5 transition-all duration-200 dark:bg-slate-900/90 ${styles.border} ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 line-clamp-1">
            {title}
          </p>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {value}
          </div>
        </div>
        <div className={`flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${styles.bg} ${styles.text}`}>
          {renderIcon()}
        </div>
      </div>

      {(change || displaySubtext) && (
        <div className="mt-2.5 sm:mt-4 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2 sm:pt-3 text-[10px] sm:text-xs dark:border-slate-800">
          {change ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  change.trend === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : change.trend === 'down'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {change.trend === 'up' && <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                {change.trend === 'down' && <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                {change.trend === 'neutral' && <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                {change.value}
              </span>
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">
                {change.label || 'so với hôm qua'}
              </span>
            </div>
          ) : (
            <div />
          )}

          {displaySubtext && (
            <span className="font-medium text-slate-500 dark:text-slate-400 line-clamp-1 text-right ml-auto">
              {displaySubtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
