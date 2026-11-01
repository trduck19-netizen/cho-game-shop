import React from 'react';
import {
  Gift,
  Sparkles,
  ShoppingBag,
  User,
  Wrench,
  Newspaper,
  Award,
} from 'lucide-react';
import type { UserProfile } from '../types/game';
import { formatCore } from '../utils/textUtils';
import { useLanguage } from '../context/LanguageContext';

interface MobileBottomNavProps {
  currentTab: 'catalog' | 'news' | 'giveaways' | 'store' | 'utilities' | 'missions';
  onSelectTab: (tab: 'catalog' | 'news' | 'giveaways' | 'store' | 'utilities' | 'missions') => void;
  onOpenReceivedCodes: (initialTab?: 'giveaways' | 'orders' | 'privates' | 'missions') => void;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onOpenProfile?: () => void;
  currentUser: UserProfile | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenReceivedCodes: _onOpenReceivedCodes,
  onOpenAuth,
  onOpenWallet,
  onOpenProfile,
  currentUser,
}) => {
  const { t } = useLanguage();
  const [isMobileSearchActive, setIsMobileSearchActive] = React.useState(false);

  React.useEffect(() => {
    const handleMobileSearch = (e: any) => {
      setIsMobileSearchActive(Boolean(e?.detail?.isOpen));
    };
    window.addEventListener('wcg_mobile_search_toggled', handleMobileSearch);
    return () => window.removeEventListener('wcg_mobile_search_toggled', handleMobileSearch);
  }, []);

  if (isMobileSearchActive) return null;

  const formatCompactBalance = (balance: number) => {
    if (!balance || balance <= 0) return '0đ';
    if (balance >= 1_000_000) {
      const m = (balance / 1_000_000).toFixed(1).replace('.0', '');
      return `${m}M`;
    }
    if (balance >= 1_000) {
      const k = (balance / 1_000).toFixed(0);
      return `${k}k`;
    }
    return `${balance}đ`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-auto w-full max-w-full overflow-hidden box-border">
      {/* Frosted glass backdrop container */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="w-full max-w-full box-border overflow-hidden bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] px-1 pt-1 pb-[max(env(safe-area-inset-bottom,0px),0.4rem)] flex items-center justify-between"
      >
        {/* Tab 1: Tra Cứu (Catalog) */}
        <button
          type="button"
          onClick={() => onSelectTab('catalog')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer relative group active:scale-95 min-w-0 ${
            currentTab === 'catalog'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {currentTab === 'catalog' && (
            <span className="absolute top-0 w-8 h-[2.5px] bg-primary rounded-full shadow-glow-primary animate-fade-in" />
          )}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              currentTab === 'catalog'
                ? 'bg-primary/20 text-primary-light shadow-sm'
                : 'group-hover:bg-muted/60'
            }`}
          >
            <Gift className="w-4 h-4 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight whitespace-nowrap">
            Tra Code
          </span>
        </button>

        {/* Tab 2: Tin Tức (News) */}
        <button
          type="button"
          onClick={() => onSelectTab('news')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer relative group active:scale-95 min-w-0 ${
            currentTab === 'news'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {currentTab === 'news' && (
            <span className="absolute top-0 w-8 h-[2.5px] bg-primary rounded-full shadow-glow-primary animate-fade-in" />
          )}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              currentTab === 'news'
                ? 'bg-primary/20 text-primary-light shadow-sm'
                : 'group-hover:bg-muted/60'
            }`}
          >
            <Newspaper className="w-4 h-4 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight whitespace-nowrap">
            Tin Tức
          </span>
        </button>

        {/* Tab 3: Săn Giveaway */}
        <button
          type="button"
          onClick={() => onSelectTab('giveaways')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer relative group active:scale-95 min-w-0 ${
            currentTab === 'giveaways'
              ? 'text-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {currentTab === 'giveaways' && (
            <span className="absolute top-0 w-8 h-[2.5px] bg-accent rounded-full shadow-glow-accent animate-fade-in" />
          )}
          <div
            className={`relative w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              currentTab === 'giveaways'
                ? 'bg-accent/20 text-accent shadow-sm'
                : 'group-hover:bg-muted/60'
            }`}
          >
            <Sparkles className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 flex h-3 px-1 items-center justify-center rounded-full bg-accent text-[7px] font-mono font-black text-white shadow-sm animate-pulse">
              HOT
            </span>
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight whitespace-nowrap">
            Giveaway
          </span>
        </button>

        {/* Tab 3: Cửa Hàng (Store) */}
        <button
          type="button"
          onClick={() => onSelectTab('store')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer relative group active:scale-95 min-w-0 ${
            currentTab === 'store'
              ? 'text-secondary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {currentTab === 'store' && (
            <span className="absolute top-0 w-8 h-[2.5px] bg-secondary rounded-full shadow-sm animate-fade-in" />
          )}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              currentTab === 'store'
                ? 'bg-secondary/20 text-secondary shadow-sm'
                : 'group-hover:bg-muted/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight whitespace-nowrap">
            Cửa Hàng
          </span>
        </button>

        {/* Tab 4: Tiện Ích (Utilities) */}
        <button
          type="button"
          onClick={() => onSelectTab('utilities')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer relative group active:scale-95 min-w-0 ${
            currentTab === 'utilities'
              ? 'text-teal-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {currentTab === 'utilities' && (
            <span className="absolute top-0 w-8 h-[2.5px] bg-teal-400 rounded-full shadow-sm animate-fade-in" />
          )}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              currentTab === 'utilities'
                ? 'bg-teal-500/20 text-teal-400 shadow-sm'
                : 'group-hover:bg-muted/60'
            }`}
          >
            <Wrench className="w-4 h-4 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight whitespace-nowrap">
            Tiện Ích
          </span>
        </button>

        {/* Tab 5: Nhiệm Vụ (Missions) */}
        <button
          type="button"
          onClick={() => onSelectTab('missions')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer relative group active:scale-95 min-w-0 ${
            currentTab === 'missions'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {currentTab === 'missions' && (
            <span className="absolute top-0 w-8 h-[2.5px] bg-primary rounded-full shadow-glow-primary animate-fade-in" />
          )}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              currentTab === 'missions'
                ? 'bg-primary/20 text-primary-light shadow-sm'
                : 'group-hover:bg-muted/60'
            }`}
          >
            <Award className="w-4 h-4 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight whitespace-nowrap">
            Nhiệm Vụ
          </span>
        </button>

        {/* Tab 5: Tài Khoản / Thông Tin Nhân Vật */}
        <button
          type="button"
          onClick={() => {
            if (currentUser) {
              if (onOpenProfile) onOpenProfile();
              else onOpenWallet();
            } else {
              onOpenAuth();
            }
          }}
          className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer relative group active:scale-95 min-w-0"
        >
          {currentUser ? (
            <>
              <div className="relative w-7 h-7 rounded-xl overflow-hidden border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt="User"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-2 border-card" />
              </div>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight text-emerald-400 font-mono whitespace-nowrap">
                {formatCompactBalance(currentUser.wallet_balance)}
              </span>
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center group-hover:bg-muted/60 transition-all text-muted-foreground group-hover:text-foreground">
                <User className="w-4 h-4 transition-transform group-hover:scale-110" />
              </div>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight whitespace-nowrap">Tài Khoản</span>
            </>
          )}
        </button>
      </nav>
    </div>
  );
};
