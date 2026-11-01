import React, { useState, useEffect, useRef } from 'react';
import { GameCard } from './GameCard';
import {
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  LayoutGrid,
  List,
  Grid2X2,
  Sparkles,
  ArrowUp,
  Loader2,
} from 'lucide-react';
import type { GameItem } from '../types/game';
import { useLanguage } from '../context/LanguageContext';

export type ViewMode = 'compact' | 'list' | 'grid';

interface GameGridProps {
  games: GameItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  bookmarks: string[];
  onToggleBookmark: (gameId: string, e: React.MouseEvent) => void;
  onSelectGame: (game: GameItem) => void;
  onQuickCopyCode: (code: string, gameName: string, e: React.MouseEvent) => void;
  onResetFilters: () => void;
  onShareGame?: (game: GameItem, e: React.MouseEvent) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  initialViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  useInfiniteScroll?: boolean;
}

const VIEW_MODE_STORAGE_KEY = 'wcg_client_view_mode_games';

export const GameGrid: React.FC<GameGridProps> = ({
  games,
  total,
  currentPage,
  totalPages,
  onPageChange,
  bookmarks,
  onToggleBookmark,
  onSelectGame,
  onQuickCopyCode,
  onResetFilters,
  onShareGame,
  onShowToast,
  initialViewMode,
  onViewModeChange,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  useInfiniteScroll = true,
}) => {
  const { t } = useLanguage();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (!useInfiniteScroll || !hasMore || isLoadingMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '350px',
        threshold: 0.05,
      }
    );

    const target = sentinelRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, onLoadMore, useInfiniteScroll]);

  // Determine initial view mode:
  // 1. User's saved preference in localStorage
  // 2. Mobile screen (< 640px) defaults to 'compact' (biểu tượng nhỏ gọn, thấy nhiều game nhất)
  // 3. Desktop defaults to 'grid'
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (initialViewMode) return initialViewMode;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode;
      if (saved === 'compact' || saved === 'list' || saved === 'grid') {
        return saved;
      }
      if (window.innerWidth < 640) {
        return 'compact'; // Mặc định lý tưởng nhất cho mobile: Biểu tượng nhỏ
      }
    }
    return 'grid';
  });

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (onViewModeChange) onViewModeChange(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {}
  };

  if (games.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl glass-panel border border-border/80 p-8 my-8">
        <div className="w-16 h-16 rounded-2xl bg-muted/80 border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2">
          {t.filter.noGames}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          Hãy thử đổi từ khóa tìm kiếm, chọn lại thể loại hoặc đặt lại bộ lọc để khám phá các game khác.
        </p>
        <button
          onClick={onResetFilters}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-glow-primary cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t.filter.resetFilter}</span>
        </button>
      </div>
    );
  }

  // Generate pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full overflow-hidden box-border">
      {/* View Switcher Header Bar - Cleaned on mobile to prioritize instant game cards */}
      <div className="hidden sm:flex items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm text-muted-foreground truncate">
            {t.filter.showing} <strong className="text-foreground font-bold">{games.length}</strong> / {total} {t.filter.gamesFound}
          </span>
          {viewMode === 'compact' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary-light border border-primary/25">
              {t.filter.viewModeCompact}
            </span>
          )}
          {viewMode === 'list' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary-light border border-primary/25">
              {t.filter.viewModeList}
            </span>
          )}
        </div>

        {/* 3-Way Mode Switcher Pill Toolbar */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-card/90 backdrop-blur-sm border border-border p-1 rounded-xl shadow-sm shrink-0">
          {/* 1. Biểu tượng nhỏ (Compact) - Mặc định mobile */}
          <button
            type="button"
            onClick={() => handleSetViewMode('compact')}
            className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
            title="Biểu tượng nhỏ (Tối ưu nhất trên điện thoại, hiển thị nhiều game)"
            aria-label="Chế độ biểu tượng nhỏ"
          >
            <Grid2X2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] sm:text-xs">{t.filter.viewModeCompact}</span>
          </button>

          {/* 2. Dạng danh sách (List) */}
          <button
            type="button"
            onClick={() => handleSetViewMode('list')}
            className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
            title="Dạng danh sách (Hàng ngang dễ đọc, sao chép mã 1 chạm)"
            aria-label="Chế độ danh sách"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] sm:text-xs">{t.filter.viewModeList}</span>
          </button>

          {/* 3. Lưới thẻ (Grid) */}
          <button
            type="button"
            onClick={() => handleSetViewMode('grid')}
            className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
            title="Lưới thẻ (Đầy đủ chi tiết và khung mã quà tặng)"
            aria-label="Chế độ lưới thẻ"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] sm:text-xs">{t.filter.viewModeGrid}</span>
          </button>
        </div>
      </div>

      {/* Game Content Container according to View Mode */}
      {viewMode === 'compact' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 w-full max-w-full box-border">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              viewMode="compact"
              isBookmarked={bookmarks.includes(game.id) || bookmarks.includes(game.slug)}
              onToggleBookmark={onToggleBookmark}
              onSelectGame={onSelectGame}
              onQuickCopyCode={onQuickCopyCode}
              onShareGame={onShareGame}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="flex flex-col gap-2 sm:gap-2.5 w-full max-w-full box-border">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              viewMode="list"
              isBookmarked={bookmarks.includes(game.id) || bookmarks.includes(game.slug)}
              onToggleBookmark={onToggleBookmark}
              onSelectGame={onSelectGame}
              onQuickCopyCode={onQuickCopyCode}
              onShareGame={onShareGame}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full box-border">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              viewMode="grid"
              isBookmarked={bookmarks.includes(game.id) || bookmarks.includes(game.slug)}
              onToggleBookmark={onToggleBookmark}
              onSelectGame={onSelectGame}
              onQuickCopyCode={onQuickCopyCode}
              onShareGame={onShareGame}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      )}

      {/* Infinite Scroll Loaders & Sentinels */}
      {useInfiniteScroll ? (
        <div className="pt-4 space-y-4">
          {/* Loading More Spinner */}
          {isLoadingMore && (
            <div className="py-8 flex flex-col items-center justify-center gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin text-primary" />
              <span className="text-xs font-semibold text-muted-foreground animate-pulse font-mono">
                Đang tải thêm danh sách game từ Cloudflare Edge...
              </span>
            </div>
          )}

          {/* Sentinel Element for IntersectionObserver with manual fallback button */}
          {hasMore && (
            <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center">
              {!isLoadingMore && onLoadMore && (
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-card hover:bg-card-hover border border-border text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-all shadow-sm hover:border-primary/50 cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  <span>Tải thêm game ({games.length}/{total})</span>
                </button>
              )}
            </div>
          )}

          {/* All Games Loaded Banner */}
          {!hasMore && games.length > 0 && (
            <div className="py-8 text-center border-t border-border/50 mt-6 flex flex-col items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/40 border border-border text-xs text-muted-foreground font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Đã hiển thị toàn bộ {total} trò chơi</span>
              </div>
              {games.length > 24 && (
                <button
                  type="button"
                  onClick={() => {
                    const section = document.getElementById('game-catalog-section');
                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                    else window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-light font-medium cursor-pointer transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Về đầu danh sách game</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Classic Pagination Controls */
        totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-5 sm:pt-6 border-t border-border/60">
            <div className="text-[11px] sm:text-xs text-muted-foreground font-mono text-center sm:text-left">
              Trang <strong className="text-foreground">{currentPage}</strong> trên tổng số{' '}
              <strong className="text-foreground">{totalPages}</strong> trang ({total} game)
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
              {/* First Page */}
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-card hover:bg-card-hover border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Trang đầu"
              >
                <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-card hover:bg-card-hover border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {getPageNumbers().map((p, idx) => {
                  if (typeof p === 'string') {
                    return (
                      <span
                        key={`dots-${idx}`}
                        className="px-1.5 sm:px-2 py-1 text-xs text-muted-foreground font-mono"
                      >
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === currentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => onPageChange(p)}
                      className={`min-w-[32px] sm:min-w-[36px] h-8 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-primary text-white shadow-glow-primary scale-105'
                          : 'bg-card hover:bg-card-hover border border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-card hover:bg-card-hover border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-card hover:bg-card-hover border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Trang cuối"
              >
                <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};
