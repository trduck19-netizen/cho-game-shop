import React, { useState, useEffect } from 'react';
import { Sparkles, Gift, Zap, Flame, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SearchAutocomplete } from './SearchAutocomplete';
import { dataService } from '../services/dataService';
import { marketingService } from '../services/marketingService';
import type { GameItem } from '../types/game';

interface HeroBannerProps {
  totalGames?: number;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onSelectGame?: (game: GameItem) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onSelectQuickTag: (tag: string) => void;
  onExploreClick?: (q?: string) => void;
  isFloatingActive?: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  totalGames,
  searchQuery = '',
  onSearchChange,
  onSelectGame,
  onShowToast,
  onSelectQuickTag,
  onExploreClick,
  isFloatingActive = false,
}) => {
  const { t } = useLanguage();
  const [cmsHero, setCmsHero] = useState(() => dataService.getContentByKey('hero_banner'));
  const [liveCopies, setLiveCopies] = useState<number>(() => marketingService.getLiveCounter());

  // Format current HH:mm timestamp for stats
  const [lastUpdatedTime, setLastUpdatedTime] = useState('19:55');

  useEffect(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setLastUpdatedTime(`${hours}:${minutes}`);

    const unsub = dataService.subscribe(() => {
      setCmsHero(dataService.getContentByKey('hero_banner'));
    });
    const unsubCounter = marketingService.subscribeCounter((count) => {
      setLiveCopies(count);
    });
    const handleCopyCountUpdated = (e: any) => {
      const c = e?.detail?.count || marketingService.getLiveCounter();
      if (typeof c === 'number' && c > 0) {
        setLiveCopies(c);
      }
    };
    window.addEventListener('wcg_master_copy_count_updated', handleCopyCountUpdated);
    window.addEventListener('wcg_global_copy_count_updated', handleCopyCountUpdated);
    const handleContentUpdated = () => {
      setCmsHero(dataService.getContentByKey('hero_banner'));
    };
    window.addEventListener('wcg_admin_content_updated', handleContentUpdated);

    return () => {
      unsub();
      unsubCounter();
      window.removeEventListener('wcg_master_copy_count_updated', handleCopyCountUpdated);
      window.removeEventListener('wcg_global_copy_count_updated', handleCopyCountUpdated);
      window.removeEventListener('wcg_admin_content_updated', handleContentUpdated);
    };
  }, []);

  // Limit to 5-6 popular hot tags
  const quickTags = [
    'Genshin Impact',
    'Where Winds Meet',
    'Delta Force',
    'Liên Quân Mobile',
    'Honkai: Star Rail',
    'Free Fire',
  ];

  const heroBadgeText = cmsHero?.extraData?.badge || t.hero.liveBadge;
  const heroMainTitle = cmsHero?.title || t.hero.titleMain;
  const heroHighlight = cmsHero?.extraData?.titleHighlight !== undefined ? cmsHero.extraData.titleHighlight : t.hero.titleHighlight;
  const heroDescription = cmsHero?.content || t.hero.subtitle;

  return (
    <div className="relative overflow-hidden pt-1 pb-1.5 sm:pt-7 sm:pb-7 border-b border-border/50">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          {/* Top Pill Badge (Single-line guaranteed without wrapping bugs) */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-primary/10 border border-primary/30 text-primary-light text-[9px] sm:text-xs font-semibold uppercase tracking-wider mb-1 sm:mb-3 shadow-sm max-w-full whitespace-nowrap overflow-hidden">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
            <span className="truncate">{heroBadgeText}</span>
            <span className="text-primary/30 shrink-0">•</span>
            <span className="text-emerald-400 font-bold font-mono inline-flex items-center gap-1 shrink-0">
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 animate-pulse shrink-0" />
              <span>{liveCopies.toLocaleString('vi-VN')}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-300 font-normal lowercase hidden xs:inline">lượt tải</span>
            </span>
          </div>

          {/* Main Title - Compact on mobile */}
          <h1 className="text-sm xs:text-base sm:text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-foreground leading-snug mb-1 sm:mb-2.5">
            {heroMainTitle}{' '}
            {heroHighlight && (
              <span className="bg-gradient-to-r from-purple-400 via-primary-light to-cyan-400 bg-clip-text text-transparent">
                {heroHighlight}
              </span>
            )}
          </h1>

          {/* Shortened Subtitle - Hidden on mobile to prioritize instant game visibility */}
          <p className="hidden sm:block text-[11px] sm:text-sm text-slate-300 dark:text-slate-300 max-w-xl mx-auto leading-normal mb-2 sm:mb-3.5 font-sans px-1">
            {heroDescription}
          </p>

          {/* Smart Autocomplete Search Bar */}
          {onSearchChange && (
            <div id="hero-search-container" className="max-w-xl mx-auto mb-1 sm:mb-3.5">
              <SearchAutocomplete
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                onSelectGame={onSelectGame || (() => {})}
                onShowToast={onShowToast}
                isActive={!isFloatingActive}
                onExploreClick={(q) => {
                  const target = document.getElementById('game-catalog-section');
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                  }
                  if (onExploreClick) onExploreClick(q);
                }}
              />
            </div>
          )}

          {/* Quick search tags - Hidden on mobile, shown on desktop */}
          <div className="hidden sm:block w-full max-w-full overflow-hidden mb-1 sm:mb-4">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-none py-0.5 sm:flex-wrap sm:justify-center w-full max-w-full">
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium flex items-center gap-1 shrink-0">
              <Flame className="w-3 h-3 text-accent" /> {t.hero.hotTags}
            </span>
            {quickTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectQuickTag(tag)}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs bg-card hover:bg-card-hover border border-border text-slate-200 hover:text-primary-light hover:border-primary/50 transition-all cursor-pointer font-medium active:scale-95 shrink-0"
              >
                {tag}
              </button>
            ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="hidden sm:grid grid-cols-4 gap-3 max-w-2xl mx-auto pt-1">
            <div className="p-3 rounded-xl bg-card/70 border border-border text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
                <Gift className="w-3.5 h-3.5 text-accent" />
                <span className="font-display font-bold text-base text-foreground">
                  {totalGames && totalGames > 0 ? `${totalGames}+` : '529+'}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-medium">{t.hero.statGames}</span>
            </div>

            <div className="p-3 rounded-xl bg-card/70 border border-border text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-secondary mb-0.5">
                <Zap className="w-3.5 h-3.5 text-secondary" />
                <span className="font-display font-bold text-base text-foreground">11,700+</span>
              </div>
              <span className="text-[11px] text-slate-300 font-medium">{t.hero.statCodes}</span>
            </div>

            <div className="p-3 rounded-xl bg-card/70 border border-border text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="font-display font-bold text-base text-emerald-400 font-mono transition-all duration-300">
                  {liveCopies.toLocaleString('vi-VN')}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-medium">Tổng lượt sao chép</span>
            </div>

            <div className="p-3 rounded-xl bg-card/70 border border-border text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-cyan-400 mb-0.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-display font-bold text-base text-foreground">{lastUpdatedTime}</span>
              </div>
              <span className="text-[11px] text-slate-300 font-medium">{t.hero.statUpdated}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
