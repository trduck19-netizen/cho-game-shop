import React, { useState, useEffect } from 'react';
import { Rocket, Clock, Bell, Check, ExternalLink, Gift, Sparkles, ChevronRight, Calendar } from 'lucide-react';
import type { UpcomingGame } from '../types/game';
import { getUpcomingGameIconUrl, handleUpcomingImageError } from '../utils/upcomingGameIconUtils';
import { calculateEffectiveOrder, calculateEffectiveSubscribers } from '../utils/upcomingGameGrowthUtils';

interface UpcomingGamesBannerProps {
  upcomingGames: UpcomingGame[];
  bookmarkedSlugs: string[];
  onToggleBookmark: (slug: string, e?: React.MouseEvent) => void;
  onOpenAllUpcomingModal: () => void;
  onSelectUpcomingGame?: (game: UpcomingGame) => void;
  onShowToast?: (msg: string, desc?: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
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

export const UpcomingGamesBanner: React.FC<UpcomingGamesBannerProps> = ({
  upcomingGames,
  bookmarkedSlugs,
  onToggleBookmark,
  onOpenAllUpcomingModal,
  onSelectUpcomingGame,
  onShowToast,
}) => {
  // Live ticker updating every 1 second
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const bookmarkedSet = new Set(bookmarkedSlugs.map((s) => s.toLowerCase()));
  const now = Date.now();

  // Filter to show active upcoming games, take first 5-6 games
  // Các game ra mắt trong ngày chỉ nằm trên mục này tối đa 1 ngày (24h) rồi tự động chuyển xuống bên dưới
  // Top 6 banner chỉ lấy các game CÓ NGÀY CỤ THỂ đang đếm ngược (game chưa rõ ngày không chiếm suất)
  const activeUpcoming = upcomingGames
    .filter((g) => {
      if (g.status === 'CANCELLED' || g.status === 'PENDING' || g.status === 'LAUNCHED') return false;
      if (!g.releaseDate) return false;
      const target = new Date(g.releaseDate).getTime();
      if (isNaN(target)) return false;
      const elapsed = now - target;
      return elapsed <= ONE_DAY_MS;
    })
    .sort((a, b) => {
      const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : NaN;
      const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : NaN;
      if (timeA !== timeB) return timeA - timeB;
      return calculateEffectiveOrder(a, now) - calculateEffectiveOrder(b, now);
    })
    .slice(0, 6);

  if (activeUpcoming.length === 0) return null;

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

  return (
    <section className="mb-3 sm:mb-8 rounded-2xl bg-gradient-to-br from-card via-card/95 to-secondary/30 border border-cyan-500/25 p-2.5 sm:p-5 backdrop-blur-md shadow-lg shadow-cyan-500/5 transition-all relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mt-16" />
      <div className="absolute bottom-0 right-1/4 w-80 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mb-16" />

      {/* Header Row: 1 dòng thanh thoát tuyệt đối trên Mobile */}
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4 pb-1.5 sm:pb-3 border-b border-border/50 relative z-10">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20 shrink-0">
            <Rocket className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-950" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="font-heading font-bold text-xs sm:text-base md:text-lg text-foreground tracking-tight whitespace-nowrap flex items-center gap-1.5">
                <span>Game Sắp Ra Mắt</span>
              </h2>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Lịch Mở Server
              </span>
            </div>
            <p className="hidden sm:block text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
              Đồng hồ đếm ngược sống • Quà tân thủ dự kiến • Nhận code ngay khi mở server
            </p>
          </div>
        </div>

        {/* View All Button: Gọn gàng trên Mobile */}
        <button
          onClick={onOpenAllUpcomingModal}
          className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-[10px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm active:scale-95"
          title="Xem toàn bộ lịch ra mắt game sắp tới"
        >
          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
          <span>Xem tất cả ({upcomingGames.filter(g => g.status !== 'CANCELLED').length})</span>
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>

      {/* Cards Layout: Mobile compact 145px (gọn nhẹ, không choáng màn hình), Desktop 6 cols */}
      <div className="flex lg:grid lg:grid-cols-6 gap-2 sm:gap-3.5 overflow-x-auto pb-1 sm:pb-1.5 lg:pb-0 scrollbar-none snap-x snap-mandatory relative z-10">
        {activeUpcoming.map((game) => {
          const isSaved = bookmarkedSet.has((game.slug || game.id).toLowerCase());
          const time = calculateTimeRemaining(game.releaseDate);
          const iconSrc = getUpcomingGameIconUrl(game);
          const expectedCount = game.expectedCodes?.length || 4;

          return (
            <div
              key={game.id || game.slug}
              onClick={() => onSelectUpcomingGame ? onSelectUpcomingGame(game) : onOpenAllUpcomingModal()}
              className="min-w-[145px] max-w-[155px] sm:min-w-[240px] sm:max-w-[260px] lg:min-w-0 lg:max-w-none shrink-0 bg-background/90 hover:bg-background border border-border/80 hover:border-cyan-500/60 rounded-xl p-2 sm:p-3 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10 group cursor-pointer snap-start relative"
            >
              <div>
                {/* Platform tag & category */}
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground truncate max-w-[85px] sm:max-w-[100px]">
                    {game.category}
                  </span>
                  <span className="px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                    {game.platform?.split(',')[0] || 'Mobile'}
                  </span>
                </div>

                {/* Game Icon + Title + Publisher */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 mb-1.5 sm:mb-2.5">
                  <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl overflow-hidden bg-slate-800 border border-cyan-500/30 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
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
                    <h3 className="font-heading font-bold text-[11px] sm:text-sm text-foreground truncate group-hover:text-cyan-400 transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-[9px] sm:text-[11px] text-muted-foreground truncate">
                      {game.publisher}
                    </p>
                  </div>
                </div>

                {/* Live Countdown Box: Thu gọn chiều cao tối đa cho Mobile */}
                <div className="mb-1.5 sm:mb-2 p-1 sm:p-2 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-center shadow-inner">
                  {!game.releaseDate ? (
                    <div className="py-0.5 sm:py-1">
                      <div className="flex items-center justify-center gap-1 text-amber-400 font-medium text-[9px] sm:text-xs">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                        <span>Chưa rõ ngày ra mắt</span>
                      </div>
                    </div>
                  ) : time.isReleased ? (
                    <div className="py-0.2 sm:py-0.5">
                      <div className="flex items-center justify-center gap-1 text-emerald-400 font-bold text-[9px] sm:text-xs animate-pulse">
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                        <span>ĐÃ MỞ SERVER</span>
                      </div>
                      <div className="text-[8px] sm:text-[10px] text-emerald-300/90 mt-0.5 font-medium truncate">
                        ✓ Đang hoạt động chính thức
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="hidden sm:flex items-center justify-center gap-1 text-[10px] text-cyan-300/80 mb-0.5">
                        <Clock className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                        <span>Mở server sau:</span>
                      </div>
                      <div className="font-mono font-bold text-[10px] sm:text-[13px] text-cyan-300 tracking-tight flex items-center justify-center gap-0.5 sm:gap-1">
                        <span className="px-1 py-0.2 sm:py-0.5 bg-cyan-950/70 rounded text-cyan-200">
                          {String(time.days).padStart(2, '0')}d
                        </span>
                        <span className="text-cyan-500">:</span>
                        <span className="px-1 py-0.2 sm:py-0.5 bg-cyan-950/70 rounded text-cyan-200">
                          {String(time.hours).padStart(2, '0')}h
                        </span>
                        <span className="text-cyan-500">:</span>
                        <span className="px-1 py-0.2 sm:py-0.5 bg-cyan-950/70 rounded text-cyan-200">
                          {String(time.minutes).padStart(2, '0')}m
                        </span>
                        <span className="text-cyan-500 hidden sm:inline">:</span>
                        <span className="px-1 py-0.2 sm:py-0.5 bg-cyan-950/70 rounded text-amber-300 hidden sm:inline">
                          {String(time.seconds).padStart(2, '0')}s
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expected Giftcode Badge */}
                <div className="mb-1.5 sm:mb-3 flex items-center justify-between text-[9px] sm:text-[11px]">
                  <span className="inline-flex items-center gap-1 text-amber-400 font-medium truncate">
                    <Gift className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                    <span>Dự kiến {expectedCount} code</span>
                  </span>
                  <span className="hidden sm:inline text-[9px] sm:text-[10px] text-muted-foreground shrink-0">
                    {calculateEffectiveSubscribers(game, now).toLocaleString('vi-VN')} lưu
                  </span>
                </div>
              </div>

              {/* Bottom Actions: "Báo Code" button & "Tải trước" */}
              <div className="pt-1 sm:pt-2 border-t border-border/50 flex items-center gap-1 sm:gap-2">
                <button
                  onClick={(e) => handleNotifyClick(game, e)}
                  className={`flex-1 py-1 sm:py-1.5 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 ${
                    isSaved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/25 hover:shadow-cyan-500/40'
                  }`}
                  title={isSaved ? 'Đã bật báo code khi mở server' : 'Nhận thông báo & ghim lên theo dõi'}
                >
                  {isSaved ? (
                    <>
                      <Check className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                      <span>Đã Báo</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-950" />
                      <span>Báo Code</span>
                    </>
                  )}
                </button>

                {game.preRegUrl && (
                  <a
                    href={game.preRegUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/60 transition-colors shrink-0"
                    title="Đăng ký trước tại trang chủ NPH"
                  >
                    <ExternalLink className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
