import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Gift,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Globe,
  Clock,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { GameItem, GiftCode } from '../types/game';
import { dataService } from '../services/dataService';
import { marketingService } from '../services/marketingService';
import { useLanguage } from '../context/LanguageContext';
import { isG1Licensed } from '../utils/licenseUtils';
import { calculateGameSearchScore } from '../utils/textUtils';
import { isCodeExpired, decodeHtmlEntities } from '../utils/codeUtils';
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../utils/recentSearchUtils';

interface SearchAutocompleteProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectGame: (game: GameItem) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onExploreClick?: (query?: string) => void;
  className?: string;
  autoFocus?: boolean;
  isFloating?: boolean;
  isActive?: boolean;
  placeholder?: string;
}

// Deterministic gradient for game icon fallback
function getGradientForName(name: string): string {
  const gradients = [
    'from-indigo-600 via-purple-600 to-pink-600',
    'from-emerald-600 via-teal-600 to-cyan-700',
    'from-rose-600 via-pink-600 to-amber-600',
    'from-blue-600 via-indigo-600 to-cyan-600',
    'from-violet-600 via-purple-700 to-indigo-800',
    'from-amber-500 via-orange-600 to-red-600',
  ];
  let hash = 0;
  const safe = String(name || '');
  for (let i = 0; i < safe.length; i++) {
    hash = safe.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

// Safe React icon component eliminating parent.innerHTML DOM mutations
interface GameSearchIconProps {
  game: Partial<GameItem>;
  size?: 'sm' | 'md';
}

const GameSearchIcon: React.FC<GameSearchIconProps> = ({ game, size = 'md' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [fallbackStage, setFallbackStage] = useState(0); // 0: primary, 1: jpg, 2: edge proxy, 3: initials
  const safeName = game?.name || 'Game';
  const sizeClass = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';

  const iconSrc = useMemo(() => {
    const slug = game?.slug || '';
    if (fallbackStage === 1) return `/game_icons/${slug}.jpg`;
    if (fallbackStage === 2) return `/api/game-icon?slug=${encodeURIComponent(slug)}`;
    if (!game?.icon_url || game.icon_url.includes('codemoi.net') || game.icon_url.startsWith('/game-icons')) {
      return `/game_icons/${slug}.webp`;
    }
    return game.icon_url;
  }, [game?.icon_url, game?.slug, fallbackStage]);

  return (
    <div
      className={`relative ${sizeClass} rounded-xl overflow-hidden border border-border shrink-0 flex items-center justify-center shadow-sm select-none bg-slate-900/40`}
    >
      {/* 1. Base Layer: ALWAYS render vibrant branded gradient avatar with initials */}
      <div
        className={`absolute inset-0 w-full h-full bg-gradient-to-br ${getGradientForName(
          safeName
        )} flex items-center justify-center font-bold text-white text-xs select-none pointer-events-none`}
        aria-hidden="true"
      >
        {safeName.slice(0, 2).toUpperCase()}
      </div>

      {/* 2. Top Image Layer: Fade in over gradient when loaded */}
      {fallbackStage < 3 && iconSrc && (
        <img
          ref={(imgEl) => {
            if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && !isLoaded) {
              setIsLoaded(true);
            }
          }}
          src={iconSrc}
          alt={safeName}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setFallbackStage((prev) => Math.min(3, prev + 1))}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  searchQuery,
  onSearchChange,
  onSelectGame,
  onShowToast,
  onExploreClick,
  className = '',
  autoFocus = false,
  isFloating = false,
  isActive = true,
  placeholder,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const res = getRecentSearches();
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);

  // Responsive device detector (Tailwind md breakpoint: 768px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile search open / close controllers
  const handleOpenMobileSearch = () => {
    setIsOpen(true);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_mobile_search_toggled', { detail: { isOpen: true } }));
    }
    mobileInputRef.current?.focus();
    setTimeout(() => {
      mobileInputRef.current?.focus();
    }, 50);
  };

  const handleCloseMobileSearch = (e?: React.SyntheticEvent | Event) => {
    if (e) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {}
    }
    // Dismiss virtual keyboard cleanly
    if (mobileInputRef.current) {
      mobileInputRef.current.blur();
    }
    if (inputRef.current) {
      inputRef.current.blur();
    }
    setIsOpen(false);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_mobile_search_toggled', { detail: { isOpen: false } }));
    }
  };

  // Hardware back button / Android gesture navigation listener
  useEffect(() => {
    if (!isOpen || !isMobile || typeof window === 'undefined') return;

    // Push dummy history entry so Android system back button or back swipe closes search overlay
    window.history.pushState({ wcg_search_overlay: true }, '');

    const handlePopState = () => {
      if (mobileInputRef.current) mobileInputRef.current.blur();
      if (inputRef.current) inputRef.current.blur();
      setIsOpen(false);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wcg_mobile_search_toggled', { detail: { isOpen: false } }));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.wcg_search_overlay) {
        window.history.back();
      }
    };
  }, [isOpen, isMobile]);

  // Multi-instance synchronization (ensure all instances close together)
  useEffect(() => {
    const handleGlobalToggle = (e: any) => {
      if (e?.detail?.isOpen === false && isOpen) {
        setIsOpen(false);
        if (typeof document !== 'undefined') {
          document.body.style.overflow = '';
        }
      }
    };
    window.addEventListener('wcg_mobile_search_toggled', handleGlobalToggle);
    return () => window.removeEventListener('wcg_mobile_search_toggled', handleGlobalToggle);
  }, [isOpen]);

  // Safe cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wcg_mobile_search_toggled', { detail: { isOpen: false } }));
      }
    };
  }, []);

  // Sync recent searches across instances & storage events
  useEffect(() => {
    const handleRecentUpdate = (e: Event) => {
      try {
        const customEvent = e as CustomEvent<string[]>;
        if (Array.isArray(customEvent?.detail)) {
          setRecentSearches(customEvent.detail);
        } else {
          const fresh = getRecentSearches();
          setRecentSearches(Array.isArray(fresh) ? fresh : []);
        }
      } catch {
        setRecentSearches([]);
      }
    };
    window.addEventListener('wcg_recent_searches_updated', handleRecentUpdate);
    window.addEventListener('storage', handleRecentUpdate);
    return () => {
      window.removeEventListener('wcg_recent_searches_updated', handleRecentUpdate);
      window.removeEventListener('storage', handleRecentUpdate);
    };
  }, []);

  // Top trending / hot games for instant click suggestions when input is empty
  const hotGames = useMemo(() => {
    try {
      const all = dataService.getGames();
      if (!Array.isArray(all)) return [];
      return all
        .filter((g) => g && (g.is_hot || (g.codes_count && g.codes_count > 0)))
        .slice(0, 5);
    } catch {
      return [];
    }
  }, []);

  // Search Results computed dynamically with instant local + server autocomplete
  const [searchResults, setSearchResults] = useState<{
    games: GameItem[];
    codes: Array<{ game: GameItem; code: GiftCode }>;
    totalMatches: number;
  }>({ games: [], codes: [], totalMatches: 0 });

  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (!q) {
      setSearchResults({ games: [], codes: [], totalMatches: 0 });
      return;
    }

    // 1. Instant synchronous local results for 0ms typing response
    try {
      const local = dataService.searchAllGamesAndCodes(q, 6);
      if (local && Array.isArray(local.games)) {
        setSearchResults(local);
      }
    } catch {}

    // 2. Debounced server fetch across entire 450+ games and 9000+ codes catalog
    const timer = setTimeout(async () => {
      try {
        const serverRes = await dataService.searchAllGamesAndCodesServer(q, 6);
        if (serverRes && serverRes.totalMatches > 0 && Array.isArray(serverRes.games)) {
          setSearchResults(serverRes);
        }
      } catch {}
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sort matching games by relevance score so the closest title match is always at index 0 (Top #1)
  const sortedGames = useMemo(() => {
    const q = (searchQuery || '').trim();
    const gamesList = Array.isArray(searchResults?.games) ? searchResults.games : [];
    if (!q || gamesList.length <= 1) return gamesList;
    return [...gamesList].sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      const scoreA = calculateGameSearchScore(a, q).score;
      const scoreB = calculateGameSearchScore(b, q).score;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const cntA = a.codes_count || 0;
      const cntB = b.codes_count || 0;
      if (cntB !== cntA) return cntB - cntA;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [searchResults?.games, searchQuery]);

  const hasResults = (searchResults?.totalMatches || 0) > 0;

  // Flattened items for keyboard navigation: games first, then codes
  const allNavItems = useMemo(() => {
    const items: Array<{ type: 'game'; data: GameItem } | { type: 'code'; data: { game: GameItem; code: GiftCode } }> = [];
    if (Array.isArray(sortedGames)) {
      sortedGames.forEach((g) => {
        if (g) items.push({ type: 'game', data: g });
      });
    }
    if (Array.isArray(searchResults?.codes)) {
      searchResults.codes.forEach((c) => {
        if (c && c.game && c.code) items.push({ type: 'code', data: c });
      });
    }
    return items;
  }, [sortedGames, searchResults?.codes]);

  // Global key listener to press '/' to focus search
  useEffect(() => {
    if (isActive === false) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isActive]);

  // Click & Touch outside listener (Desktop & Mobile)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // Nếu thao tác diễn ra bên trong overlay tìm kiếm mobile, tuyệt đối không đóng
      if (mobileOverlayRef.current && mobileOverlayRef.current.contains(e.target as Node)) {
        return;
      }
      // Nếu giao diện mobile đang mở, chỉ nút quay lại / đóng mới được đóng
      if (isMobile && isOpen) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobile, isOpen]);

  // Handle Quick Copy from Autocomplete
  const handleCopyCode = (code: string, gameName: string, isExpired: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    dataService.recordCopyEvent(code, gameName);
    const activeUser = typeof window !== 'undefined' ? dataService.getCurrentUser() : null;
    marketingService.recordRealCopy(gameName, '', 1, activeUser);
    setCopiedCodeKey(`${gameName}_${code}`);

    // Haptic feedback for tactile satisfaction on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }

    if (onShowToast) {
      if (isExpired) {
        onShowToast(t.modal.copySuccess, `Mã "${code}" (${gameName}) có thể đã hết hạn.`, 'info');
      } else {
        onShowToast(t.modal.copySuccess, `Đã sao chép mã "${code}" cho ${gameName}!`, 'success');
      }
    }

    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.5 },
        colors: ['#10B981', '#8B5CF6', '#F59E0B'],
      });
    } catch {}

    setTimeout(() => {
      setCopiedCodeKey(null);
    }, 2000);
  };

  // Keyboard Navigation inside input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allNavItems.length === 0) {
      if (e.key === 'ArrowDown' && (searchQuery || '').trim()) {
        if (isMobile) handleOpenMobileSearch();
        else setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allNavItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allNavItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allNavItems.length) {
        const item = allNavItems[selectedIndex];
        if (item.type === 'game') {
          saveRecentSearch(item.data?.name || '');
          onSelectGame(item.data);
          handleCloseMobileSearch();
        } else {
          saveRecentSearch(item.data?.game?.name || '');
          onSelectGame(item.data.game);
          handleCloseMobileSearch();
        }
      } else {
        // Trigger normal search submit
        if ((searchQuery || '').trim()) {
          saveRecentSearch(searchQuery.trim());
        }
        handleCloseMobileSearch();
        if (onExploreClick) onExploreClick(searchQuery);
      }
    } else if (e.key === 'Escape') {
      handleCloseMobileSearch();
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
    }
  };

  const handleSelectGameItem = (game: GameItem) => {
    if (game?.name) {
      saveRecentSearch(game.name);
    }
    onSelectGame(game);
    handleCloseMobileSearch();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className} ${isMobile ? 'touch-manipulation' : ''}`}
      onClick={() => {
        if (isMobile) handleOpenMobileSearch();
      }}
    >
      {/* Search Bar Input */}
      <div className={`relative flex items-center ${isMobile ? 'cursor-pointer' : ''}`}>
        <Search
          className={`${
            isFloating ? 'w-4 h-4 left-3' : 'w-4 h-4 sm:w-5 sm:h-5 left-3.5 sm:left-4'
          } absolute top-1/2 -translate-y-1/2 text-primary-light pointer-events-none transition-colors`}
        />

        <input
          ref={inputRef}
          type="text"
          readOnly={isMobile}
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (isMobile) handleOpenMobileSearch();
            else setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (isMobile) {
              handleOpenMobileSearch();
            } else {
              setIsOpen(true);
            }
          }}
          onClick={(e) => {
            if (isMobile) {
              e.stopPropagation();
              handleOpenMobileSearch();
            } else {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus && !isMobile}
          placeholder={placeholder || t.hero.searchPlaceholder}
          className={`w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/40 text-foreground placeholder-slate-400 shadow-xl transition-all outline-none bg-card hover:bg-card-hover ${
            isMobile ? 'cursor-pointer select-none touch-manipulation' : ''
          } ${
            isFloating
              ? 'py-2 sm:py-2.5 text-xs sm:text-sm pl-9 sm:pl-10 pr-16 sm:pr-20 rounded-xl'
              : 'py-3 sm:py-3.5 text-base sm:text-sm pl-10 sm:pl-12 pr-20 sm:pr-24 rounded-2xl'
          }`}
        />

        {/* Right side controls: Clear / Shortcut Badge */}
        <div className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                handleCloseMobileSearch();
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted border border-border text-[10px] font-mono text-slate-400 shadow-sm">
              /
            </kbd>
          )}

          <button
            type="button"
            onClick={() => {
              if ((searchQuery || '').trim()) {
                saveRecentSearch(searchQuery.trim());
              }
              handleCloseMobileSearch();
              if (onExploreClick) onExploreClick(searchQuery);
            }}
            className="px-2.5 py-1 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 hidden sm:block"
          >
            {t.hero.searchBtn}
          </button>
        </div>
      </div>

      {/* Desktop Autocomplete Results Dropdown (Desktop Only) */}
      {isOpen && !isMobile && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#0a1526]/98 backdrop-blur-2xl border border-blue-500/35 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in text-left divide-y divide-blue-500/25 max-h-[65vh] sm:max-h-[75vh] flex flex-col">
          {(searchQuery || '').trim().length === 0 ? (
            /* RECENT SEARCHES, QUICK KEYWORDS & HOT GAMES */
            <div className="overflow-y-auto flex-1 scrollbar-thin p-2 space-y-3">
              {/* 1. Recent Searches (Cap strictly at 5 recent items + Màu Lam) */}
              {recentSearches.slice(0, 5).length > 0 && (
                <div className="px-3 py-2.5 rounded-xl bg-[#0e1d38] border border-blue-500/35 mb-2 shadow-sm">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-2">
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Tìm kiếm gần đây ({recentSearches.slice(0, 5).length}/5)</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearRecentSearches();
                      }}
                      className="text-[10px] lowercase text-blue-300 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1 font-normal"
                      title="Xóa tất cả lịch sử tìm kiếm"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>xóa lịch sử</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {recentSearches.slice(0, 5).map((term) => (
                      <div
                        key={term}
                        onClick={() => {
                          saveRecentSearch(term);
                          onSearchChange(term);
                          inputRef.current?.focus();
                        }}
                        className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl text-xs bg-[#13284c] hover:bg-[#1a386a] border border-blue-500/40 hover:border-blue-400 text-blue-100 hover:text-white transition-all cursor-pointer font-medium active:scale-95 shadow-sm"
                      >
                        <Clock className="w-3 h-3 text-blue-400 group-hover:text-blue-300 transition-colors shrink-0" />
                        <span className="truncate max-w-[130px] sm:max-w-[200px]">{term}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentSearch(term);
                          }}
                          className="p-0.5 rounded-md hover:bg-rose-500/20 text-blue-300 hover:text-rose-400 transition-colors shrink-0"
                          title={`Xóa "${term}"`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Quick Keywords / Hot Suggestions (Màu Lam) */}
              <div className="px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gợi ý tìm nhanh</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    'Liên Quân Mobile',
                    'Ta Là Hắc Ngộ Không',
                    'Tiên Giới: Nhận Kiếm',
                    'Free Fire',
                    'Genshin Impact',
                    'Roblox',
                    'Võ Lâm',
                    'Honkai: Star Rail',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(tag);
                        onSearchChange(tag);
                        inputRef.current?.focus();
                      }}
                      className="px-2.5 py-1 rounded-xl text-xs bg-[#0e1d38] hover:bg-[#16305c] border border-blue-500/35 hover:border-blue-400 text-blue-100 hover:text-white transition-all cursor-pointer font-medium active:scale-95 shadow-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hot Games List */}
              {hotGames.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5 text-accent">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      Tựa game nổi bật nhất
                    </span>
                    <span className="text-[10px] lowercase text-slate-500">nhấn để xem code ngay</span>
                  </div>

                  <div className="space-y-1.5 px-0.5">
                    {hotGames.map((game, gIdx) => (
                      <div
                        key={game.id || game.slug || `hot_${gIdx}`}
                        onClick={() => handleSelectGameItem(game)}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all cursor-pointer bg-[#0e1d38] hover:bg-[#16305c] text-foreground border border-blue-500/35 hover:border-blue-400/60 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <GameSearchIcon game={game} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                                {game.name || 'Game'}
                              </span>
                              {game.is_hot && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  <Flame className="w-2.5 h-2.5" /> HOT
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {game.publisher || 'Nhà phát hành chính thức'} • {game.category || 'Game'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {(game.codes_count || 0) > 0 && (
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {game.codes_count} code
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : hasResults ? (
            <div className="overflow-y-auto flex-1 scrollbar-thin p-2 space-y-3">
              {/* 1. MATCHING GAMES */}
              {sortedGames.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5 text-primary-light">
                      <Gift className="w-3.5 h-3.5 text-primary-light" />
                      {t.search.matchingGames} ({sortedGames.length})
                    </span>
                    <span className="text-[10px] lowercase text-slate-500">nhấn để xem chi tiết</span>
                  </div>

                  <div className="space-y-1.5 px-0.5">
                    {sortedGames.map((game, idx) => {
                      const isHighlighted = selectedIndex === idx;
                      const totalCodes = game.codes_count || (game.codes ? game.codes.length : 0);

                      return (
                        <div
                          key={game.id || game.slug || `game_${idx}`}
                          onClick={() => handleSelectGameItem(game)}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all cursor-pointer bg-[#0e1d38] text-foreground border shadow-sm ${
                            isHighlighted
                              ? 'bg-[#183464] border-blue-400 ring-2 ring-blue-500/40 text-white'
                              : 'hover:bg-[#16305c] border-blue-500/35 hover:border-blue-400/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Game Icon */}
                            <GameSearchIcon game={game} size="md" />

                            {/* Game Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                                  {game.name || 'Game'}
                                </span>
                                {game.is_hot && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    <Flame className="w-2.5 h-2.5" /> HOT
                                  </span>
                                )}
                                {isG1Licensed(game) ? (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                    {t.gameCard.licensed}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                    <Globe className="w-2.5 h-2.5 text-cyan-400" />
                                    {t.gameCard.international}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                {game.publisher || 'Nhà phát hành chính thức'} • {game.category || 'Game'}
                              </p>
                            </div>
                          </div>

                          {/* Code Count Badge & Chevron */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {totalCodes} code
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. MATCHING GIFTCODES WITH INSTANT COPY */}
              {searchResults.codes.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      {t.search.matchingCodes} ({searchResults.codes.length})
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-mono">1 chạm sao chép</span>
                  </div>

                  <div className="space-y-1.5">
                    {searchResults.codes.map((item, idx) => {
                      if (!item || !item.game || !item.code) return null;
                      const globalIdx = sortedGames.length + idx;
                      const isHighlighted = selectedIndex === globalIdx;
                      const isExpired = isCodeExpired(item.code);
                      const codeKey = `${item.game.name || 'game'}_${item.code.code || idx}`;
                      const isCopied = copiedCodeKey === codeKey;

                      return (
                        <div
                          key={codeKey}
                          onClick={() => handleSelectGameItem(item.game)}
                          className={`flex items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isHighlighted
                              ? 'bg-emerald-500/15 border-emerald-500/50'
                              : 'bg-card/70 hover:bg-muted/80 border-border/80'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {/* Game Pill */}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border truncate max-w-[140px]">
                                {item.game.name || 'Game'}
                              </span>

                              {/* Status Pill */}
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  {t.search.expired}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                  {t.search.active}
                                </span>
                              )}
                            </div>

                            {/* Code Value & Reward description */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-xs sm:text-sm text-emerald-300 tracking-wider">
                                {item.code.code || ''}
                              </span>
                              {item.code.rewards && (
                                <span className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[260px]">
                                  • {decodeHtmlEntities(item.code.rewards)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Instant Fast Copy Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(item.code.code, item.game.name || '', isExpired, e)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                              isCopied
                                ? 'bg-emerald-500 text-white shadow-glow-primary'
                                : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40'
                            }`}
                            title="Sao chép mã ngay"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{t.search.copied}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{t.search.copyCode}</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground space-y-1">
              <p className="text-xs sm:text-sm font-medium">{t.search.noResults}</p>
              <p className="text-[11px] text-slate-500">{t.search.hint}</p>
            </div>
          )}

          {/* Autocomplete Footer Bar */}
          <div className="p-2.5 bg-muted/50 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span className="hidden sm:inline">
              Dùng <kbd className="px-1 py-0.5 bg-card border border-border rounded text-[10px] font-mono">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-card border border-border rounded text-[10px] font-mono">↓</kbd> để chọn,{' '}
              <kbd className="px-1 py-0.5 bg-card border border-border rounded text-[10px] font-mono">Enter</kbd> để mở
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onExploreClick) onExploreClick(searchQuery);
              }}
              className="ml-auto text-primary-light hover:text-primary font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{t.search.viewAll}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Fullscreen Search Overlay (Mobile Only - Rendered at Body Level) */}
      {isMobile && isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={mobileOverlayRef}
          className="fixed inset-0 w-full h-[100dvh] min-h-screen z-[100] bg-[#070e1b] flex flex-col select-none animate-fade-in overflow-hidden"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {/* 1. Mobile Search Header (Sticky Top) */}
          <div className="shrink-0 bg-[#0a1526] border-b border-blue-500/35 px-3 py-2 flex items-center gap-2 pt-[max(env(safe-area-inset-top,0px),0.5rem)] shadow-md">
            {/* Back button */}
            <button
              type="button"
              onPointerDown={handleCloseMobileSearch}
              onClick={handleCloseMobileSearch}
              aria-label="Quay lại"
              className="w-10 h-10 rounded-xl bg-[#102344] active:bg-[#173260] text-blue-100 flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer border border-blue-500/30 touch-manipulation select-none"
            >
              <ArrowLeft className="w-5 h-5 text-blue-300 pointer-events-none" />
            </button>

            {/* Search Input Box */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-blue-400 pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Tìm tên game, giftcode..."
                className="w-full h-10 pl-9 pr-9 rounded-xl bg-[#0c1a30] border border-blue-500/40 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 text-white text-[16px] placeholder:text-blue-300/50 outline-none transition-all shadow-inner"
                autoFocus
              />
              {searchQuery ? (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSearchChange('');
                    mobileInputRef.current?.focus();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSearchChange('');
                    mobileInputRef.current?.focus();
                  }}
                  aria-label="Xóa từ khóa"
                  className="w-8 h-8 rounded-lg absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 cursor-pointer touch-manipulation"
                >
                  <X className="w-4 h-4 pointer-events-none" />
                </button>
              ) : null}
            </div>

            {/* Search action button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if ((searchQuery || '').trim()) {
                  saveRecentSearch(searchQuery.trim());
                }
                handleCloseMobileSearch();
                if (onExploreClick) onExploreClick(searchQuery);
              }}
              onClick={() => {
                if ((searchQuery || '').trim()) {
                  saveRecentSearch(searchQuery.trim());
                }
                handleCloseMobileSearch();
                if (onExploreClick) onExploreClick(searchQuery);
              }}
              className="px-3 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shrink-0 flex items-center justify-center shadow-md active:scale-95 cursor-pointer border border-blue-400/40 touch-manipulation"
            >
              Tìm
            </button>
          </div>

          {/* 2. Quick Tags Bar (Always visible for instant 1-tap search - Màu Lam) */}
          <div className="shrink-0 px-3 py-2 border-b border-blue-500/30 bg-[#0a1526] flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1 shrink-0">
              <Flame className="w-3 h-3 text-amber-400" /> Gợi ý:
            </span>
            {[
              'Ta Là Hắc Ngộ Không',
              'Roblox',
              'Liên Quân Mobile',
              'Free Fire',
              'FC Mobile',
              'Tiên Giới: Nhận Kiếm',
              'Võ Lâm',
              'Genshin Impact',
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  saveRecentSearch(tag);
                  onSearchChange(tag);
                  mobileInputRef.current?.focus();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all shrink-0 active:scale-95 cursor-pointer ${
                  searchQuery.toLowerCase() === tag.toLowerCase()
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-[#102344] active:bg-[#173260] text-blue-100 border-blue-500/40'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* 3. Scrollable Results Area */}
          <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y overscroll-contain p-3 space-y-4 pb-48 scrollbar-thin">
            {(searchQuery || '').trim().length === 0 ? (
              /* Empty State: Recent searches & Hot games */
              <>
                {recentSearches.slice(0, 5).length > 0 && (
                  <div className="rounded-2xl bg-[#0b1728] border border-blue-500/40 p-3 space-y-2 shadow-md">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-300">
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Tìm kiếm gần đây ({recentSearches.slice(0, 5).length}/5)</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentSearches();
                        }}
                        className="text-[11px] text-blue-300 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1 font-normal"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa tất cả</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {recentSearches.slice(0, 5).map((term) => (
                        <div
                          key={term}
                          onClick={() => {
                            saveRecentSearch(term);
                            onSearchChange(term);
                            mobileInputRef.current?.focus();
                          }}
                          className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl text-xs bg-[#102344] active:bg-[#173260] border border-blue-500/45 text-blue-100 active:scale-95 cursor-pointer font-medium shadow-sm"
                        >
                          <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{term}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentSearch(term);
                            }}
                            className="p-0.5 rounded-md text-blue-300 hover:text-rose-400 active:scale-90 shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hotGames.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5 text-accent">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        Tựa game nổi bật có nhiều Code
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">Chạm để xem</span>
                    </div>
                    <div className="space-y-2">
                      {hotGames.map((game, gIdx) => (
                        <div
                          key={game.id || game.slug || `hot_${gIdx}`}
                          onClick={() => handleSelectGameItem(game)}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#0b1728] border border-blue-500/35 active:bg-[#122442] active:border-blue-400/60 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <GameSearchIcon game={game} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-foreground truncate">
                                  {game.name || 'Game'}
                                </span>
                                {game.is_hot && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    <Flame className="w-2.5 h-2.5" /> HOT
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate mt-0.5">
                                {[game.publisher, game.category].filter(Boolean).join(' • ') || 'Game'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(game.codes_count || 0) > 0 && (
                              <span className="text-xs font-mono font-bold px-2 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {game.codes_count} code
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : hasResults ? (
              /* Results State: Matching Games & Codes */
              <>
                {sortedGames.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5 text-primary-light">
                        <Gift className="w-3.5 h-3.5 text-primary-light" />
                        Game tìm thấy ({sortedGames.length})
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">Chạm để mở</span>
                    </div>
                    <div className="space-y-2">
                      {sortedGames.map((game, idx) => {
                        const totalCodes = game.codes_count || (game.codes ? game.codes.length : 0);
                        return (
                          <div
                            key={game.id || game.slug || `m_game_${idx}`}
                            onClick={() => handleSelectGameItem(game)}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#0b1728] border border-blue-500/35 active:bg-[#122442] active:border-blue-400/60 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <GameSearchIcon game={game} size="md" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-foreground truncate">
                                    {game.name || 'Game'}
                                  </span>
                                  {game.is_hot && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                      <Flame className="w-2.5 h-2.5" /> HOT
                                    </span>
                                  )}
                                  {isG1Licensed(game) ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                      G1
                                    </span>
                                  ) : null}
                                </div>
                                {game.publisher && (
                                  <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {game.publisher}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-mono font-bold px-2 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {totalCodes} code
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {searchResults.codes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Giftcode tìm thấy ({searchResults.codes.length})
                      </span>
                      <span className="text-[10px] text-emerald-400/80 font-mono">1 chạm sao chép</span>
                    </div>
                    <div className="space-y-2">
                      {searchResults.codes.map((item, idx) => {
                        if (!item || !item.game || !item.code) return null;
                        const isExpired = isCodeExpired(item.code);
                        const codeKey = `${item.game.name || 'game'}_${item.code.code || idx}`;
                        const isCopied = copiedCodeKey === codeKey;

                        return (
                          <div
                            key={codeKey}
                            onClick={() => handleSelectGameItem(item.game)}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#0b1728] border border-blue-500/35 active:bg-[#122442] active:border-blue-400/60 transition-all cursor-pointer shadow-md active:scale-[0.98]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border truncate max-w-[150px]">
                                  {item.game.name || 'Game'}
                                </span>
                                {isExpired ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    Hết hạn
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                    Còn hạn
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-sm text-emerald-300 tracking-wider">
                                  {item.code.code || ''}
                                </span>
                                {item.code.rewards && (
                                  <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                    • {decodeHtmlEntities(item.code.rewards)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleCopyCode(item.code.code, item.game.name || '', isExpired, e)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                isCopied
                                  ? 'bg-emerald-500 text-white shadow-glow-primary'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* No results */
              <div className="rounded-2xl bg-[#0b1728] border border-blue-500/35 p-6 text-center space-y-3 shadow-md">
                <div className="w-12 h-12 rounded-2xl bg-[#102344] border border-blue-500/30 flex items-center justify-center mx-auto text-blue-300">
                  <Search className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Không tìm thấy game hoặc code khớp với "{searchQuery}"
                  </p>
                  <p className="text-xs text-blue-200/70 mt-1">
                    Thử tìm kiếm với tên không dấu hoặc từ khóa ngắn hơn.
                  </p>
                </div>
                {hotGames.length > 0 && (
                  <div className="pt-2 text-left">
                    <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">
                      Gợi ý các game HOT:
                    </p>
                    <div className="space-y-1.5">
                      {hotGames.slice(0, 3).map((g) => (
                        <div
                          key={g.id || g.slug}
                          onClick={() => handleSelectGameItem(g)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#102344] hover:bg-[#16305c] border border-blue-500/35 text-white cursor-pointer active:scale-98 shadow-sm"
                        >
                          <span className="text-xs font-bold text-foreground truncate">{g.name}</span>
                          <span className="text-[11px] font-mono text-emerald-400">{g.codes_count || 0} code</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
