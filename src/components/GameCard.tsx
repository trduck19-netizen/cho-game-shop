import React, { useState, useEffect } from 'react';
import {
  Gift,
  Bookmark,
  Copy,
  Check,
  ChevronRight,
  Flame,
  Sparkles,
  Share2,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import type { GameItem } from '../types/game';
import { useLanguage } from '../context/LanguageContext';
import { isG1Licensed } from '../utils/licenseUtils';
import { isCodeExpired } from '../utils/codeUtils';
import { dataService } from '../services/dataService';

export interface GameCardProps {
  game: GameItem;
  isBookmarked: boolean;
  onToggleBookmark: (gameId: string, e: React.MouseEvent) => void;
  onSelectGame: (game: GameItem) => void;
  onQuickCopyCode: (code: string, gameName: string, e: React.MouseEvent) => void;
  onShareGame?: (game: GameItem, e: React.MouseEvent) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  viewMode?: 'grid' | 'compact' | 'list';
}

// Generate letter initials from game name
function getGameInitials(name: string): string {
  if (!name) return 'G';
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Deterministic vibrant gradient generator based on name hash
function getGradientForName(name: string): string {
  const gradients = [
    'from-indigo-600 via-purple-600 to-pink-600',
    'from-emerald-600 via-teal-600 to-cyan-700',
    'from-rose-600 via-pink-600 to-amber-600',
    'from-blue-600 via-indigo-600 to-cyan-600',
    'from-violet-600 via-purple-700 to-indigo-800',
    'from-amber-500 via-orange-600 to-red-600',
    'from-fuchsia-600 via-rose-600 to-orange-500',
    'from-cyan-600 via-blue-600 to-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isBookmarked,
  onToggleBookmark,
  onSelectGame,
  onQuickCopyCode,
  onShareGame,
  onShowToast,
  viewMode = 'grid',
}) => {
  const { t } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isExpired = (c: { status?: string; code: string; expiry?: string; expiresAt?: string }) => isCodeExpired(c);
  const cachedServer = game.slug ? dataService.getCachedServerGame(game.slug) : null;
  const displayCodes = (cachedServer?.codes && cachedServer.codes.length > 0) ? cachedServer.codes : (game.codes || []);
  const activeCodes = displayCodes.filter((c) => !isExpired(c));
  const firstCode =
    activeCodes.length > 0
      ? activeCodes[0].code
      : displayCodes.length > 0
      ? displayCodes[0].code
      : null;
  const totalCodes = (cachedServer && typeof cachedServer.codes_count === 'number')
    ? cachedServer.codes_count
    : (typeof game.codes_count === 'number' ? game.codes_count : displayCodes.length);

  const getSafeIcon = (rawUrl?: string, slug?: string) => {
    if (!rawUrl || rawUrl.includes('codemoi.net') || rawUrl.startsWith('/game-icons')) {
      return `/game_icons/${slug}.webp`;
    }
    return rawUrl;
  };

  const [currentIconSrc, setCurrentIconSrc] = useState(() => getSafeIcon(game.icon_url, game.slug));
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fallbackStage, setFallbackStage] = useState(0); // 0: primary webp, 1: local jpg, 2: edge proxy, 3: initials only

  useEffect(() => {
    setCurrentIconSrc(getSafeIcon(game.icon_url, game.slug));
    setImageLoaded(false);
    setFallbackStage(0);
  }, [game.slug, game.icon_url]);

  const handleImageError = () => {
    const slug = game.slug;
    const pkg = (game as any).android_package_name ||
      ((game as any).google_play_url ? (((game as any).google_play_url.match(/id=([a-zA-Z0-9._]+)/) || [])[1] || '') : '') ||
      ((game as any).download_android ? (((game as any).download_android.match(/id=([a-zA-Z0-9._]+)/) || [])[1] || '') : '') || '';

    if (fallbackStage === 0) {
      // Stage 1: Try JPG version of the icon
      setFallbackStage(1);
      setCurrentIconSrc(`/game_icons/${slug}.jpg`);
    } else if (fallbackStage === 1) {
      // Stage 2: Try remote store icon or Edge Proxy endpoint
      setFallbackStage(2);
      const rawUrl = game.icon_url && game.icon_url.startsWith('http') && !game.icon_url.includes('codemoi.net')
        ? game.icon_url
        : ((game as any).cover_image_url && (game as any).cover_image_url.startsWith('http') && !(game as any).cover_image_url.includes('codemoi.net') ? (game as any).cover_image_url : '');
      const queryParams = new URLSearchParams();
      if (slug) queryParams.set('slug', slug);
      if (rawUrl) queryParams.set('url', rawUrl);
      if (pkg) queryParams.set('pkg', pkg);
      setCurrentIconSrc(`/api/game-icon?${queryParams.toString()}`);
    } else {
      // Stage 3: Cleanly fallback to colorful branded gradient avatar with initials
      setFallbackStage(3);
    }
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firstCode) return;
    setCopiedCode(true);
    onQuickCopyCode(firstCode, game.name, e);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Instant Copy Share Link to clipboard & trigger floating toast
  const handleCopyShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? window.location.origin
      : 'https://codegame.shop';
    const shareUrl = `${origin}/game/${game.slug}`;

    // 1. Copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch {}
      });
    }

    // 2. Set active copied state for 2.2s
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);

    // 3. Show floating toast notification
    const toastTitle = 'Đã sao chép link game!';
    const toastMsg = `Link xem code ${game.name}: ${shareUrl}`;
    if (onShowToast) {
      onShowToast(toastTitle, toastMsg, 'success');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wcg_show_toast', {
          detail: {
            title: toastTitle,
            message: toastMsg,
            type: 'success',
          },
        })
      );
    }
  };

  const renderGameIcon = (sizeClasses: string, textClasses: string = 'text-xs sm:text-sm') => (
    <div
      className={`relative ${sizeClasses} rounded-xl overflow-hidden shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm border border-border/70 select-none bg-slate-900/40`}
    >
      {/* 1. Base Layer: ALWAYS render vibrant branded gradient avatar with game initials */}
      <div
        className={`absolute inset-0 w-full h-full bg-gradient-to-br ${getGradientForName(
          game.name
        )} flex items-center justify-center font-display font-extrabold text-white ${textClasses} shadow-inner select-none pointer-events-none`}
        aria-hidden="true"
      >
        {getGameInitials(game.name)}
      </div>

      {/* 2. Top Image Layer: Fade in smoothly over the gradient when loaded */}
      {fallbackStage < 3 && currentIconSrc && (
        <img
          ref={(imgEl) => {
            if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && !imageLoaded) {
              setImageLoaded(true);
            }
          }}
          src={currentIconSrc}
          alt={game.name}
          width={48}
          height={48}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );

  // ==========================================
  // MODE 1: COMPACT (Biểu tượng nhỏ / Lưới icon nhỏ gọn)
  // Tối ưu mật độ cho Mobile (2-3 cột) và Desktop (5-6 cột)
  // ==========================================
  if (viewMode === 'compact') {
    return (
      <div
        onClick={() => onSelectGame(game)}
        className="group relative flex flex-col justify-between bg-card hover:bg-card-hover rounded-xl sm:rounded-2xl border border-border/80 hover:border-primary/50 transition-all duration-200 p-2 sm:p-2.5 shadow-cyber-card hover:shadow-glow-primary hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer overflow-visible"
      >
        <div>
          {/* Top Row: Icon + Bookmark Button & Share Button */}
          <div className="flex items-start justify-between gap-1 mb-1.5 relative">
            {renderGameIcon('w-10 h-10 sm:w-12 sm:h-12', 'text-xs')}

            <div className="flex items-center gap-0.5 relative" onClick={(e) => e.stopPropagation()}>
              {/* Nút Share (Sao chép link code tức thì) ngay bên cạnh nút lưu */}
              <button
                onClick={handleCopyShareLink}
                className={`p-1 rounded-lg transition-all cursor-pointer active:scale-90 relative ${
                  copiedLink
                    ? 'text-emerald-400 bg-emerald-400/15'
                    : 'text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 hover:bg-muted/50'
                }`}
                title="Sao chép link danh sách code game"
                aria-label="Chia sẻ link game"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 animate-scale-in" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Nút Bookmark (Lưu game) */}
              <button
                onClick={(e) => onToggleBookmark(game.id, e)}
                className={`p-1 rounded-lg transition-all cursor-pointer active:scale-90 ${
                  isBookmarked
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 hover:bg-muted/50'
                }`}
                title={isBookmarked ? t.gameCard.bookmarked : t.gameCard.addBookmark}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
              </button>

              {/* Thông báo nổi nhỏ báo copy link thành công */}
              {copiedLink && (
                <div className="absolute right-0 -bottom-7 z-30 flex items-center gap-1 bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md shadow-lg pointer-events-none animate-fade-in whitespace-nowrap">
                  <Check className="w-2.5 h-2.5" />
                  <span>Đã chép link!</span>
                </div>
              )}
            </div>
          </div>

          {/* Badges + Title */}
          <div className="min-w-0">
            <div className="flex items-center gap-1 flex-wrap mb-0.5">
              {game.is_hot && (
                <span className="inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                  <Flame className="w-2 h-2" />
                  <span>HOT</span>
                </span>
              )}
              {isG1Licensed(game) ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-semibold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0"
                  title={`GP G1: ${game.so_giay_phep || game.license_number}`}
                >
                  <CheckCircle2 className="w-2 h-2 text-emerald-400" />
                  <span>G1</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-semibold px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shrink-0"
                  title={t.gameCard.internationalTooltip}
                >
                  <Globe className="w-2 h-2 text-cyan-400" />
                  <span>{t.gameCard.international}</span>
                </span>
              )}
            </div>

            <h3 className="font-heading font-bold text-xs sm:text-sm text-foreground group-hover:text-primary-light transition-colors line-clamp-2 leading-tight min-h-[2rem] sm:min-h-[2.25rem]">
              {game.name}
            </h3>

            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {game.publisher || 'Chính thức'}
            </p>
          </div>
        </div>

        {/* Bottom Row: Codes count & Quick Click */}
        <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between gap-1 text-[10px]">
          <span className="font-mono font-bold text-emerald-400 flex items-center gap-0.5">
            <Gift className="w-3 h-3 shrink-0" />
            <span>{totalCodes} code</span>
          </span>

          <span className="text-primary-light font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            <span>Xem</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE 2: LIST (Dạng danh sách hàng ngang)
  // Tối ưu cuộn 1 tay trên Mobile, hiển thị thẳng hàng, chép code nhanh
  // ==========================================
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelectGame(game)}
        className="group relative flex items-center justify-between gap-2.5 sm:gap-4 bg-card hover:bg-card-hover rounded-xl sm:rounded-2xl border border-border/80 hover:border-primary/50 transition-all duration-200 p-2.5 sm:p-3 shadow-cyber-card hover:shadow-glow-primary active:scale-[0.99] cursor-pointer overflow-visible"
      >
        {/* Left: Game Icon */}
        {renderGameIcon('w-11 h-11 sm:w-13 sm:h-13', 'text-xs sm:text-sm')}

        {/* Middle: Game Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {game.is_hot && (
              <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Flame className="w-2.5 h-2.5" />
                <span>HOT</span>
              </span>
            )}
            {isG1Licensed(game) ? (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0"
                title={`${t.gameCard.licenseTooltip} (GP G1: ${game.so_giay_phep || game.license_number})`}
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                <span className="hidden xs:inline">{t.gameCard.licensed}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shrink-0"
                title={t.gameCard.internationalTooltip}
              >
                <Globe className="w-2.5 h-2.5 text-cyan-400" />
                <span className="hidden xs:inline">{t.gameCard.international}</span>
              </span>
            )}

            <h3 className="font-heading font-bold text-xs sm:text-sm md:text-base text-foreground group-hover:text-primary-light transition-colors truncate">
              {game.name}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            <span className="truncate max-w-[120px] sm:max-w-[220px]">
              {game.publisher || 'Nhà phát hành'}
            </span>
            <span className="text-border">•</span>
            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1 shrink-0">
              <Gift className="w-3 h-3" />
              <span>{totalCodes} {t.filter.hasCodes}</span>
            </span>
          </div>
        </div>

        {/* Right: Actions (Copy code + View details + Bookmark + Share) */}
        <div
          className="flex items-center gap-1 sm:gap-2 shrink-0 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {firstCode && (
            <button
              onClick={handleCopyClick}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 font-mono text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              title={t.gameCard.quickCopy}
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">{t.gameCard.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden md:inline truncate max-w-[85px]">{firstCode}</span>
                  <span className="md:hidden">Chép</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => onSelectGame(game)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary text-primary-light hover:text-white border border-primary/30 transition-all font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
            title={t.gameCard.viewCodes}
          >
            <span className="hidden sm:inline">{t.gameCard.viewCodes}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Share Button (Lấy link code nhanh) */}
          <button
            onClick={handleCopyShareLink}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer active:scale-90 relative ${
              copiedLink
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-muted/40 hover:bg-muted border-border/80 text-muted-foreground hover:text-foreground'
            }`}
            title="Sao chép link danh sách code game"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            {copiedLink && (
              <div className="absolute right-0 -bottom-7 z-30 flex items-center gap-1 bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md shadow-lg pointer-events-none animate-fade-in whitespace-nowrap">
                <Check className="w-2.5 h-2.5" />
                <span>Đã chép link!</span>
              </div>
            )}
          </button>

          {/* Bookmark Button */}
          <button
            onClick={(e) => onToggleBookmark(game.id, e)}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer active:scale-90 ${
              isBookmarked
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-400'
                : 'bg-muted/40 hover:bg-muted border-border/80 text-muted-foreground hover:text-foreground'
            }`}
            title={isBookmarked ? t.gameCard.bookmarked : t.gameCard.addBookmark}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE 3: GRID (Lưới thẻ chuẩn / Mặc định Desktop)
  // Đầy đủ chi tiết, khung sao chép mã nổi bật
  // ==========================================
  return (
    <div
      onClick={() => onSelectGame(game)}
      className="group relative flex flex-col justify-between bg-card hover:bg-card-hover rounded-2xl border border-border/80 hover:border-primary/50 transition-all duration-200 p-3 sm:p-3.5 shadow-cyber-card hover:shadow-glow-primary hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer overflow-visible"
    >
      {/* Top Section: Icon, Titles & Action Buttons */}
      <div className="flex items-start justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {renderGameIcon('w-12 h-12 sm:w-13 sm:h-13', 'text-sm sm:text-base')}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              {game.is_hot && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                  <Flame className="w-2.5 h-2.5" />
                  <span>HOT</span>
                </span>
              )}
              {isG1Licensed(game) ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 shadow-sm cursor-help"
                  title={`${t.gameCard.licenseTooltip} (GP G1: ${game.so_giay_phep || game.license_number})`}
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{t.gameCard.licensed}</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shrink-0 shadow-sm cursor-help"
                  title={t.gameCard.internationalTooltip}
                >
                  <Globe className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{t.gameCard.international}</span>
                </span>
              )}
            </div>

            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary-light transition-colors line-clamp-2 leading-snug break-words min-h-[2.5rem] sm:min-h-[2.75rem]">
              {game.name}
            </h3>

            <p className="text-[11px] sm:text-xs text-slate-300 dark:text-slate-400 truncate mt-0.5">
              {game.publisher || 'Nhà phát hành chính thức'}
            </p>
          </div>
        </div>

        {/* Action icons (Bookmark / Share) */}
        <div className="flex items-center gap-1 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
          {/* Share Button (Lấy link code trực tiếp) */}
          <button
            onClick={handleCopyShareLink}
            className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 relative ${
              copiedLink
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-muted/40 hover:bg-muted border-border/80 text-muted-foreground hover:text-foreground'
            }`}
            title="Sao chép link danh sách code game"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            {copiedLink && (
              <div className="absolute right-0 -bottom-7 z-30 flex items-center gap-1 bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md shadow-lg pointer-events-none animate-fade-in whitespace-nowrap">
                <Check className="w-2.5 h-2.5" />
                <span>Đã chép link!</span>
              </div>
            )}
          </button>

          <button
            onClick={(e) => onToggleBookmark(game.id, e)}
            className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 ${
              isBookmarked
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-400'
                : 'bg-muted/40 hover:bg-muted border-border/80 text-muted-foreground hover:text-foreground'
            }`}
            title={isBookmarked ? t.gameCard.bookmarked : t.gameCard.addBookmark}
          >
            <Bookmark
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? 'fill-amber-400' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Code Status Info */}
      <div className="flex items-center justify-between gap-2 py-2 border-t border-border/50 text-xs">
        <div className="flex items-center gap-1.5">
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-mono font-bold text-[11px] sm:text-xs ${
              totalCodes > 0
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-muted text-slate-300 border border-border/50'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>{totalCodes} {t.filter.hasCodes}</span>
          </div>
        </div>
      </div>

      {/* Quick Action / First Code Bar & View Button */}
      <div className="mt-1 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
        {firstCode ? (
          <button
            onClick={handleCopyClick}
            className="flex-1 min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 dark:bg-slate-950 hover:bg-slate-800/90 border border-emerald-500/30 hover:border-emerald-400/60 transition-all cursor-pointer overflow-hidden active:scale-98 shadow-sm group/btn"
            title={t.gameCard.quickCopy}
          >
            <span className="font-mono font-bold text-xs sm:text-sm text-emerald-300 truncate mr-2 tracking-wide">
              {firstCode}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-200 group-hover/btn:text-white shrink-0 font-sans font-bold">
              {copiedCode ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40">
                  <Check className="w-3.5 h-3.5" /> {t.gameCard.copied}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-200 group-hover/btn:text-emerald-300">
                  <Copy className="w-3.5 h-3.5" /> {t.modal.copy}
                </span>
              )}
            </div>
          </button>
        ) : totalCodes > 0 ? (
          <button
            onClick={() => onSelectGame(game)}
            className="flex-1 min-h-[44px] flex items-center justify-center px-3 py-2 rounded-xl bg-slate-900/60 dark:bg-slate-950/60 hover:bg-slate-800/80 border border-emerald-500/20 hover:border-emerald-400/50 transition-all cursor-pointer text-emerald-400 font-bold text-xs active:scale-98 shadow-sm"
            title={t.gameCard.viewCodes}
          >
            <Gift className="w-3.5 h-3.5 mr-1.5" />
            <span>Xem {totalCodes} mã quà</span>
          </button>
        ) : (
          <span className="text-[11px] sm:text-xs text-slate-300 dark:text-slate-400 italic py-2">
            Chưa có mã mới
          </span>
        )}

        <button
          onClick={() => onSelectGame(game)}
          className="min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary text-primary-light hover:text-white border border-primary/30 hover:border-primary transition-all cursor-pointer shrink-0 font-bold text-xs flex items-center gap-1 active:scale-95 shadow-sm"
          aria-label={t.gameCard.viewCodes}
        >
          <span>{t.gameCard.viewCodes}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
