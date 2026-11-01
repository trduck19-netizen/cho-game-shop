import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Rocket, Bell, Check, ExternalLink, Gift, Search, Calendar, Sparkles } from 'lucide-react';
import type { UpcomingGame } from '../types/game';
import { getUpcomingGameIconUrl, handleUpcomingImageError } from '../utils/upcomingGameIconUtils';
import { calculateEffectiveOrder, calculateEffectiveSubscribers } from '../utils/upcomingGameGrowthUtils';

interface AllUpcomingGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  upcomingGames: UpcomingGame[];
  bookmarkedSlugs: string[];
  onToggleBookmark: (slug: string, e?: React.MouseEvent) => void;
  onShowToast?: (msg: string, desc?: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  initialSelectedSlug?: string | null;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isReleased: boolean;
  isRolledOver: boolean;
  bannerRemainingHours: number;
  bannerRemainingMinutes: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 giờ

function calculateTimeRemaining(targetDateStr?: string | null): TimeRemaining {
  if (!targetDateStr) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isReleased: false, isRolledOver: false, bannerRemainingHours: 0, bannerRemainingMinutes: 0 };
  }
  try {
    const target = new Date(targetDateStr).getTime();
    const now = Date.now();
    const diff = target - now;

    if (isNaN(target)) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isReleased: false, isRolledOver: false, bannerRemainingHours: 0, bannerRemainingMinutes: 0 };
    }

    if (diff <= 0) {
      const elapsed = now - target;
      const isRolledOver = elapsed > ONE_DAY_MS;
      const remainingMs = Math.max(0, ONE_DAY_MS - elapsed);
      const bannerRemainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const bannerRemainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isReleased: true, isRolledOver, bannerRemainingHours, bannerRemainingMinutes };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isReleased: false, isRolledOver: false, bannerRemainingHours: 0, bannerRemainingMinutes: 0 };
  } catch {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isReleased: true, isRolledOver: true, bannerRemainingHours: 0, bannerRemainingMinutes: 0 };
  }
}

function formatReleaseDate(dateStr?: string | null): string {
  if (!dateStr) return 'Chưa rõ ngày';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${hours}:${mins} • ${day}/${month}`;
  } catch {
    return dateStr;
  }
}

export const AllUpcomingGamesModal: React.FC<AllUpcomingGamesModalProps> = ({
  isOpen,
  onClose,
  upcomingGames,
  bookmarkedSlugs,
  onToggleBookmark,
  onShowToast,
  initialSelectedSlug,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WEEK' | 'MONTH' | 'BOOKMARKED'>('ALL');
  const [, setTick] = useState(0);

  // Live timer tick every second
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const bookmarkedSet = new Set(bookmarkedSlugs.map((s) => s.toLowerCase()));
  const now = Date.now();

  const filteredGames = upcomingGames.filter((game) => {
    // 0. Bỏ qua các game đã phát hành, hủy hoặc đang chờ duyệt
    if (game.status === 'CANCELLED' || game.status === 'PENDING' || game.status === 'LAUNCHED') return false;
    // Rollover check: các game đã mở server > 24h tự động chuyển xuống catalog
    if (game.releaseDate) {
      const target = new Date(game.releaseDate).getTime();
      if (!isNaN(target) && (now - target) > ONE_DAY_MS) {
        return false;
      }
    }

    // 1. Search term match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = game.name.toLowerCase().includes(q);
      const matchPublisher = (game.publisher || '').toLowerCase().includes(q);
      const matchCategory = (game.category || '').toLowerCase().includes(q);
      if (!matchName && !matchPublisher && !matchCategory) return false;
    }

    // 2. Filter tabs
    const hasDate = Boolean(game.releaseDate);
    const targetTime = hasDate ? new Date(game.releaseDate as string).getTime() : NaN;
    const diffMs = !isNaN(targetTime) ? targetTime - now : NaN;

    if (activeFilter === 'BOOKMARKED') {
      return bookmarkedSet.has((game.slug || game.id).toLowerCase());
    }
    if (activeFilter === 'WEEK') {
      return !isNaN(diffMs) && diffMs > 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    }
    if (activeFilter === 'MONTH') {
      return !isNaN(diffMs) && diffMs > 0 && diffMs <= 30 * 24 * 60 * 60 * 1000;
    }

    return true;
  });

  // Ưu tiên đưa game người dùng vừa click lên đầu
  // Sắp xếp: Game có ngày xếp trước theo ngày tăng dần; Game chưa rõ ngày (null) xếp sau (theo displayOrder rồi tên A-Z)
  const sortedGames = [...filteredGames].sort((a, b) => {
    if (initialSelectedSlug) {
      const aSlug = (a.slug || a.id).toLowerCase();
      const bSlug = (b.slug || b.id).toLowerCase();
      const target = initialSelectedSlug.toLowerCase();
      if (aSlug === target && bSlug !== target) return -1;
      if (bSlug === target && aSlug !== target) return 1;
    }
    const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : NaN;
    const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : NaN;
    const hasDateA = !isNaN(timeA);
    const hasDateB = !isNaN(timeB);

    if (hasDateA && !hasDateB) return -1;
    if (!hasDateA && hasDateB) return 1;

    const orderA = calculateEffectiveOrder(a, now);
    const orderB = calculateEffectiveOrder(b, now);

    if (hasDateA && hasDateB) {
      if (timeA !== timeB) return timeA - timeB;
      return orderA - orderB;
    }

    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
  });

  const handleNotifyClick = (game: UpcomingGame, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlySaved = bookmarkedSet.has((game.slug || game.id).toLowerCase());
    onToggleBookmark(game.slug || game.id, e);

    if (onShowToast) {
      if (!isCurrentlySaved) {
        onShowToast(
          `Đã bật Báo Code cho "${game.name}"!`,
          `Game đã được ghim lên đầu danh sách theo dõi của bạn.`,
          'success'
        );
      } else {
        onShowToast(`Đã tắt Báo Code cho "${game.name}".`, undefined, 'info');
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-2.5 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-card border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Tinh giản, mỏng nhẹ trên Mobile */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-border/70 flex items-center justify-between gap-2.5 bg-gradient-to-r from-cyan-950/40 via-card to-card">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20 shrink-0">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                  Lịch Ra Mắt Game & Quà Dự Kiến
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                  {upcomingGames.length}
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-muted-foreground mt-0.5">
                Cập nhật giờ G mở server chính thức và danh sách mã quà tặng độc quyền
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center shrink-0"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>

        {/* Search & Filter Controls: Siêu gọn */}
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-border/50 bg-background/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên game, nhà phát hành..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg sm:rounded-xl bg-secondary/80 border border-border/80 focus:border-cyan-400 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
              }`}
            >
              Tất cả ({upcomingGames.length})
            </button>
            <button
              onClick={() => setActiveFilter('WEEK')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'WEEK'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
              }`}
            >
              7 ngày tới
            </button>
            <button
              onClick={() => setActiveFilter('MONTH')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'MONTH'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setActiveFilter('BOOKMARKED')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'BOOKMARKED'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
              }`}
            >
              <Bell className="w-2.5 h-2.5" />
              <span>Đã Báo</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Games Grid khoa học, gọn gàng */}
        <div className="p-2.5 sm:p-4 overflow-y-auto flex-1 space-y-2.5">
          {sortedGames.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
              <p className="text-sm font-medium text-foreground">Không tìm thấy tựa game nào</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Thử thay đổi từ khóa tìm kiếm hoặc chọn mốc thời gian khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {sortedGames.map((game) => {
                const gameSlugOrId = (game.slug || game.id).toLowerCase();
                const isSaved = bookmarkedSet.has(gameSlugOrId);
                const isTarget = initialSelectedSlug && gameSlugOrId === initialSelectedSlug.toLowerCase();
                const time = calculateTimeRemaining(game.releaseDate);
                const iconSrc = getUpcomingGameIconUrl(game);
                const expectedCodes = (game.expectedCodes && game.expectedCodes.length > 0)
                  ? game.expectedCodes
                  : ['TANTHU2026', 'VIP999', 'OPENBETA', 'TRIAN2026'];

                return (
                  <div
                    key={game.id || game.slug}
                    className={`rounded-xl p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 border ${
                      isTarget
                        ? 'bg-gradient-to-br from-cyan-950/40 via-card to-card border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                        : 'bg-card/90 hover:bg-card border-border/80 hover:border-cyan-500/40 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Header game: Icon + Tên + Thể loại & NPH */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl overflow-hidden bg-slate-800 border border-cyan-500/30 shrink-0 shadow-sm">
                          <img
                            src={iconSrc}
                            alt={game.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleUpcomingImageError(e, game)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground truncate hover:text-cyan-400 transition-colors">
                              {game.name}
                            </h4>
                            {isTarget && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground truncate">
                            <span className="px-1.5 py-0.2 rounded font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0 truncate max-w-[110px]">
                              {game.category}
                            </span>
                            <span className="truncate">{game.publisher}</span>
                          </div>
                        </div>
                      </div>

                      {/* Giờ G mở server & Countdown trực quan 1 dòng ngang siêu gọn */}
                      <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/25 flex items-center justify-between gap-1.5 text-xs">
                        {!game.releaseDate ? (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Chưa rõ ngày ra mắt</span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                              Đang cập nhật
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <Calendar className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="font-semibold text-slate-200 truncate">{formatReleaseDate(game.releaseDate)}</span>
                            </div>

                            {time.isReleased ? (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 shrink-0 animate-pulse">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                ĐÃ MỞ SERVER
                              </span>
                            ) : (
                              <div className="font-mono font-bold text-[11px] text-cyan-300 flex items-center gap-0.5 shrink-0">
                                <span className="text-cyan-200">{String(time.days).padStart(2, '0')}d</span>
                                <span className="text-cyan-500">:</span>
                                <span className="text-cyan-200">{String(time.hours).padStart(2, '0')}h</span>
                                <span className="text-cyan-500">:</span>
                                <span className="text-cyan-200">{String(time.minutes).padStart(2, '0')}m</span>
                                <span className="text-cyan-500">:</span>
                                <span className="text-amber-300">{String(time.seconds).padStart(2, '0')}s</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Quà tân thủ dự kiến: chip nhỏ gọn */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="font-semibold text-amber-400 flex items-center gap-1">
                            <Gift className="w-2.5 h-2.5 text-amber-400" />
                            <span>Quà dự kiến ({expectedCodes.length}):</span>
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {calculateEffectiveSubscribers(game, now).toLocaleString('vi-VN')} người canh
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {expectedCodes.slice(0, 4).map((c, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            >
                              {c}
                            </span>
                          ))}
                          {expectedCodes.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground bg-secondary/80">
                              +{expectedCodes.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Nút Báo Code và Trang chủ */}
                    <div className="pt-2 border-t border-border/50 flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleNotifyClick(game, e)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 ${
                          isSaved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/25'
                        }`}
                        title={isSaved ? 'Đã bật báo code khi mở server' : 'Nhận thông báo & ghim lên theo dõi'}
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Đã Báo Code</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3.5 h-3.5 text-slate-950" />
                            <span>Báo Code Khi Mở</span>
                          </>
                        )}
                      </button>

                      {game.preRegUrl && (
                        <a
                          href={game.preRegUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border/60 transition-colors flex items-center gap-1 shrink-0"
                          title="Trang chủ NPH"
                        >
                          <span>Trang Chủ</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
