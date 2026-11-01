import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Gift,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Download,
  ExternalLink,
  BookOpen,
  Info,
  Calendar,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  Bookmark,
  Share2,
  AlertTriangle,
  Layers,
  Globe,
  Bell,
  BellRing,
  Lock,
  Unlock,
  LogIn,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { GameItem, GiftCode, UserProfile } from '../types/game';
import { dataService } from '../services/dataService';
import { marketingService } from '../services/marketingService';
import { notificationService } from '../services/notificationService';
import { EmailSubscriptionModal } from './notification/EmailSubscriptionModal';
import { useLanguage } from '../context/LanguageContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { isG1Licensed } from '../utils/licenseUtils';
import { isCodeExpired, decodeHtmlEntities } from '../utils/codeUtils';
import { GameDownloadSection } from './game/GameDownloadSection';
import { templateService } from '../services/templateService';

interface GameDetailModalProps {
  game: GameItem | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (gameId: string) => void;
  onOpenShare: (game: GameItem) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onOpenShare,
  onShowToast,
  currentUser,
  onOpenAuth,
}) => {
  const { t } = useLanguage();
  useLockBodyScroll(true);
  const activeUser = currentUser || (typeof window !== 'undefined' ? dataService.getCurrentUser() : null);
  const [liveGame, setLiveGame] = useState<GameItem | null>(game);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, { up: number; down: number }>>({});
  const [selectedCodeTab, setSelectedCodeTab] = useState<'all' | 'active' | 'expired'>('active');
  const [modalImageLoaded, setModalImageLoaded] = useState(false);
  const [modalFallbackStage, setModalFallbackStage] = useState(0); // 0: webp, 1: jpg, 2: edge proxy, 3: initials
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isGameFollowed, setIsGameFollowed] = useState(false);
  const prevGameSlugRef = React.useRef<string | null>(game ? (game.slug || game.id || null) : null);

  useEffect(() => {
    if (!game) return;
    const currentSlug = game.slug || game.id || '';
    const isNewGame = prevGameSlugRef.current !== currentSlug;
    prevGameSlugRef.current = currentSlug;

    if (isNewGame) {
      setLiveGame(game);
      setModalImageLoaded(false);
      setModalFallbackStage(0);
      setSelectedCodeTab('all');
    } else {
      // Same game updated with fresh codes or details: seamlessly merge without resetting image state!
      setLiveGame((prev) => {
        if (!prev) return game;
        const prevCodes = prev.codes || [];
        const newCodes = game.codes || [];
        const bestCodes = newCodes.length >= prevCodes.length ? newCodes : prevCodes;
        return {
          ...prev,
          ...game,
          icon_url: game.icon_url || prev.icon_url || `/game_icons/${game.slug}.webp`,
          codes: bestCodes,
          codes_count: Math.max(prev.codes_count || 0, game.codes_count || 0, bestCodes.length),
        };
      });
    }

    if (game.slug) {
      setIsGameFollowed(notificationService.isGameFollowed(game.slug));
    }
  }, [game]);

  const handleModalImageError = () => {
    setModalFallbackStage((prev) => Math.min(3, prev + 1));
  };

  useEffect(() => {
    if (!liveGame?.slug) return;
    setIsGameFollowed(notificationService.isGameFollowed(liveGame.slug));
    const unsub = notificationService.subscribe(() => {
      setIsGameFollowed(notificationService.isGameFollowed(liveGame.slug));
    });
    return unsub;
  }, [liveGame?.slug]);

  // Dynamically fetch and enrich with latest giftcodes from Cloudflare serverless D1 API
  useEffect(() => {
    if (!game?.slug) return;
    let isCancelled = false;
    dataService.getGameBySlug(game.slug, false).then((fresh) => {
      if (!isCancelled && fresh && (fresh.slug === game.slug || fresh.id === game.id)) {
        setLiveGame(fresh);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [game?.slug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isExpired = (c: GiftCode) => isCodeExpired(c);

  // Ensure currentGame is strictly null if game is null or closed, and always preserve highest code count and safe icon
  const currentGame = React.useMemo(() => {
    if (!game) return null;
    const base = liveGame && (liveGame.slug === game.slug || liveGame.id === game.id) ? liveGame : game;
    const baseCodes = base.codes || [];
    const propCodes = game.codes || [];
    // Prioritize authoritative server detail codes, fallback to prop codes if base is empty
    const bestCodes = baseCodes.length > 0 ? baseCodes : propCodes;
    const activeBestCodes = bestCodes.filter((c) => !isExpired(c));
    return {
      ...game,
      ...base,
      codes: bestCodes,
      codes_count: activeBestCodes.length,
      active_codes_count: activeBestCodes.length,
      expired_codes_count: bestCodes.length - activeBestCodes.length,
      total_codes_count: bestCodes.length,
      icon_url: base.icon_url || game.icon_url || `/game_icons/${game.slug}.webp`,
    };
  }, [game, liveGame]);

  useEffect(() => {
    if (!currentGame || !currentGame.codes) return;
    const initialVotes: Record<string, { up: number; down: number }> = {};
    for (const c of currentGame.codes) {
      initialVotes[c.code] = dataService.getCodeVotes(c.code, isExpired(c));
    }
    setVotes(initialVotes);
  }, [currentGame]);

  if (!game || !currentGame) return null;

  const allCodes = currentGame.codes || [];
  const activeCodes = allCodes.filter((c) => !isExpired(c));
  const expiredCodes = allCodes.filter((c) => isExpired(c));

  const formatMaskedCode = (code: string): string => {
    if (!code) return '';
    const clean = code.trim();
    const len = clean.length;
    if (len <= 3) return clean.slice(0, 1) + '••';
    if (len <= 5) return clean.slice(0, 2) + '•••';
    if (len <= 8) return clean.slice(0, 3) + '••••';
    return clean.slice(0, 4) + '••••••';
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Copy fallback failed', err);
      return false;
    }
  };

  const handleCopyAll = async (targetCodes: GiftCode[], typeKey: string) => {
    if (!activeUser) {
      setIsAuthPromptOpen(true);
      return;
    }

    if (!targetCodes || targetCodes.length === 0) {
      onShowToast('Không có mã nào', 'Mục này hiện chưa có mã code để sao chép.', 'info');
      return;
    }

    const codeList = targetCodes.map((c) => c.code.trim()).filter(Boolean);
    const gameLink = `https://codegame.shop/game/${currentGame.slug || currentGame.id || ''}`;
    const watermark = `\n\n📌 Nguồn: CodeGame.shop - Cổng Tra Cứu Giftcode Bản Quyền G1\n👉 Nhận thêm mã VIP miễn phí tại: ${gameLink}`;
    const codeString = codeList.join('\n') + watermark;

    const ok = await copyToClipboard(codeString);
    if (!ok) {
      onShowToast('Lỗi sao chép', 'Không thể truy cập bộ nhớ tạm (clipboard).', 'error');
      return;
    }

    // Ghi nhận sự kiện copy cho từng mã
    targetCodes.forEach((c) => {
      dataService.recordCopyEvent(c.code, currentGame.slug || currentGame.name);
    });
    marketingService.recordRealCopy(currentGame.name, currentGame.slug || '', targetCodes.length, activeUser);

    setCopiedType(typeKey);
    onShowToast(
      `Đã sao chép tất cả ${targetCodes.length} mã code!`,
      `Toàn bộ ${targetCodes.length} mã đã được lưu vào bộ nhớ tạm (mỗi mã một dòng). Dán vào game để nhận quà!`,
      'success'
    );

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#06B6D4', '#8B5CF6', '#F59E0B'],
    });

    setTimeout(() => {
      setCopiedType((prev) => (prev === typeKey ? null : prev));
    }, 2500);
  };

  const handleCopy = (code: string, isExpired = false) => {
    navigator.clipboard.writeText(code);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(25); } catch {}
    }
    dataService.recordCopyEvent(code, currentGame.slug || currentGame.name);
    marketingService.recordRealCopy(currentGame.name, currentGame.slug || '', 1, activeUser);
    setCopiedCode(code);
    if (isExpired) {
      onShowToast(`Đã chép mã: ${code}`, `${t.modal.expiredNotice}`, 'info');
    } else {
      if (!activeUser) {
        onShowToast(`Đã chép mã: ${code}`, 'Mẹo: Đăng nhập để mở khóa Copy tất cả và xem mã trọn vẹn.', 'info');
      } else {
        onShowToast(`Đã chép: ${code}`, 'Sẵn sàng dán vào game', 'success');
      }
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#10B981', '#06B6D4', '#8B5CF6'],
      });
    }

    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleVote = (code: string, type: 'up' | 'down') => {
    const codeObj = allCodes.find((c) => c.code === code);
    const expiredStatus = codeObj ? isExpired(codeObj) : false;
    const res = dataService.voteCode(code, type, expiredStatus);
    setVotes((prev) => ({ ...prev, [code]: res }));
    onShowToast(
      type === 'up' ? t.modal.reportWorking : t.modal.reportExpired,
      `Mã: ${code}`,
      type === 'up' ? 'success' : 'info'
    );
  };

  const initials = currentGame.name ? currentGame.name.substring(0, 2).toUpperCase() : 'G';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl h-[88dvh] sm:h-auto max-h-[88dvh] sm:max-h-[88vh] flex flex-col bg-card border-t sm:border border-border/90 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar - Fixed at top of modal */}
        <div className="relative p-3.5 sm:p-5 pb-3 sm:pb-4 border-b border-border/70 bg-card/95 backdrop-blur-md shrink-0 sticky top-0 z-20">
          {/* Mobile Sheet Indicator */}
          <div className="w-12 h-1.5 bg-slate-600/60 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

          <div className="flex items-start justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 shadow-lg border border-border flex items-center justify-center bg-slate-900/40 select-none">
                {/* 1. Base Layer: ALWAYS render vibrant branded gradient avatar with initials */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary via-purple-600 to-accent flex items-center justify-center font-display font-extrabold text-white text-lg sm:text-2xl shadow-inner select-none pointer-events-none">
                  {initials}
                </div>

                {/* 2. Top Image Layer: Fade in over gradient when loaded */}
                {modalFallbackStage < 3 && (
                  <img
                    ref={(imgEl) => {
                      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && !modalImageLoaded) {
                        setModalImageLoaded(true);
                      }
                    }}
                    src={
                      modalFallbackStage === 1
                        ? `/game_icons/${currentGame.slug}.jpg`
                        : modalFallbackStage === 2
                        ? (() => {
                            const pkg = (currentGame as any).android_package_name ||
                              (currentGame.google_play_url ? (((currentGame.google_play_url.match(/id=([a-zA-Z0-9._]+)/) || [])[1] || '')) : '') ||
                              ((currentGame as any).download_android ? (((currentGame as any).download_android.match(/id=([a-zA-Z0-9._]+)/) || [])[1] || '') : '') || '';
                            const rawUrl = currentGame.icon_url && currentGame.icon_url.startsWith('http') && !currentGame.icon_url.includes('codemoi.net')
                              ? currentGame.icon_url
                              : ((currentGame as any).cover_image_url && (currentGame as any).cover_image_url.startsWith('http') && !(currentGame as any).cover_image_url.includes('codemoi.net') ? (currentGame as any).cover_image_url : '');
                            const queryParams = new URLSearchParams();
                            if (currentGame.slug) queryParams.set('slug', currentGame.slug);
                            if (rawUrl) queryParams.set('url', rawUrl);
                            if (pkg) queryParams.set('pkg', pkg);
                            return `/api/game-icon?${queryParams.toString()}`;
                          })()
                        : (!currentGame.icon_url || currentGame.icon_url.includes('codemoi.net') || currentGame.icon_url.startsWith('/game-icons')
                            ? `/game_icons/${currentGame.slug}.webp`
                            : (currentGame.icon_url || `/game_icons/${currentGame.slug}.webp`))
                    }
                    alt={currentGame.name}
                    referrerPolicy="no-referrer"
                    decoding="async"
                    onLoad={() => setModalImageLoaded(true)}
                    onError={handleModalImageError}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                      modalImageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/20 text-primary-light border border-primary/30 whitespace-nowrap">
                    {currentGame.category || 'Game'}
                  </span>
                  {isG1Licensed(currentGame) ? (
                    <span
                      className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm cursor-help whitespace-nowrap"
                      title={`${t.gameCard.licenseTooltip} (GP G1: ${currentGame.so_giay_phep || currentGame.license_number})`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{t.gameCard.licensed}</span>
                      <span className="hidden sm:inline font-mono text-emerald-400/80">({currentGame.so_giay_phep || currentGame.license_number})</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm whitespace-nowrap"
                      title={t.gameCard.internationalTooltip}
                    >
                      <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{t.gameCard.international}</span>
                    </span>
                  )}
                </div>

                {/* Tên game */}
                <h2 className="font-heading font-extrabold text-base sm:text-xl text-foreground truncate">
                  {currentGame.name}
                </h2>

                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 truncate">
                    <Building className="w-3 h-3 shrink-0" />
                    <span className="truncate">{currentGame.publisher || t.modal.publisher}</span>
                  </span>
                  {currentGame.release_date && (
                    <span className="hidden xs:flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {currentGame.release_date}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[10px] sm:text-[11px] shrink-0">
                    <Gift className="w-3 h-3 text-emerald-400" />
                    {expiredCodes.length > 0 ? (
                      <span><strong>{activeCodes.length}</strong> mã còn dùng được <span className="opacity-75 font-normal">({expiredCodes.length} hết hạn)</span></span>
                    ) : (
                      <span><strong>{activeCodes.length}</strong> mã khả dụng</span>
                    )}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer active:scale-90 flex items-center gap-1.5 ${
                  isGameFollowed
                    ? 'bg-secondary/20 border-secondary/50 text-secondary shadow-neon-teal'
                    : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                }`}
                title={isGameFollowed ? 'Đang nhận thông báo code game này qua Email' : 'Nhận thông báo khi có code mới cho game này'}
              >
                {isGameFollowed ? (
                  <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary animate-bounce-subtle" />
                ) : (
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="hidden sm:inline text-[11px] font-bold">
                  {isGameFollowed ? 'Đang theo dõi' : 'Báo code mới'}
                </span>
              </button>

              <button
                onClick={() => onOpenShare(currentGame)}
                className="p-1.5 sm:p-2.5 rounded-xl bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-90"
                title={t.modal.share}
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => onToggleBookmark(currentGame.id)}
                className={`p-1.5 sm:p-2.5 rounded-xl border transition-all cursor-pointer active:scale-90 ${
                  isBookmarked
                    ? 'bg-amber-400/20 border-amber-400/50 text-amber-400'
                    : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                }`}
                title={isBookmarked ? t.gameCard.bookmarked : t.gameCard.addBookmark}
              >
                <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
              </button>

              {/* High-visibility Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0"
                aria-label={t.modal.close}
                title={t.modal.close}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Action Row: Nút Copy Tất Cả & Tải Xuống GG Play / App Store / PC */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2.5 pt-2 sm:pt-2.5 border-t border-border/40 overflow-x-auto scrollbar-none pb-0.5">
            {/* Nút Copy Tất Cả - Ngang hàng trực tiếp với nút tải Google Play */}
            {activeCodes.length > 0 && (
              <button
                type="button"
                onClick={() => handleCopyAll(activeCodes, 'active')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black border transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 ${
                  copiedType === 'active'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-neon-emerald'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                }`}
                title={!activeUser ? "Đăng nhập để sao chép toàn bộ mã" : `Sao chép toàn bộ ${activeCodes.length} mã còn hạn`}
              >
                {copiedType === 'active' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    <span>{t.modal.copiedAll} ({activeCodes.length})</span>
                  </>
                ) : (
                  <>
                    {!activeUser ? (
                      <Lock className="w-3.5 h-3.5 text-slate-950/80" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-950" />
                    )}
                    <span>{t.modal.copyAll} ({activeCodes.length})</span>
                  </>
                )}
              </button>
            )}

            {/* Bộ Lọc Tabs: Tất Cả / Còn Hạn / Hết Hạn thu gọn ngay cạnh Copy Tất Cả */}
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-900/80 border border-border/70 shrink-0 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedCodeTab('all')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                  selectedCodeTab === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title={t.modal.allCodes}
              >
                <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{t.modal.allCodes}</span>
                <span className="font-mono text-[10px] opacity-80">({allCodes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCodeTab('active')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                  selectedCodeTab === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-emerald-400 hover:bg-muted/50'
                }`}
                title={t.modal.activeCodes}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>{t.modal.activeCodes}</span>
                <span className="font-mono text-[10px] opacity-80">({activeCodes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCodeTab('expired')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                  selectedCodeTab === 'expired'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-rose-400 hover:bg-muted/50'
                }`}
                title={t.modal.expiredCodes}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>{t.modal.expiredCodes}</span>
                <span className="font-mono text-[10px] opacity-80">({expiredCodes.length})</span>
              </button>
            </div>
            {currentGame.redeem_url && (
              <a
                href={currentGame.redeem_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold bg-accent hover:bg-accent-hover text-white shadow-sm transition-all shrink-0 active:scale-95"
              >
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{t.modal.redeemWeb}</span>
              </a>
            )}

            {currentGame.download_pc && (
              <a
                href={currentGame.download_pc}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-medium bg-card hover:bg-card-hover border border-border text-muted-foreground hover:text-foreground transition-all shrink-0 active:scale-95"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-light" />
                <span>Bản PC</span>
              </a>
            )}
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-4 sm:p-6 space-y-5 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]">
          {/* KHỐI TẢI GAME TỰ NHẬN THIẾT BỊ (CH PLAY / APP STORE / QR DESKTOP) */}
          <GameDownloadSection game={currentGame} />

          {/* ========================================================================= */}
          {/* PHẦN 1: DANH SÁCH MÃ GIFTCODE CÒN HOẠT ĐỘNG (ACTIVE CODES)               */}
          {/* ========================================================================= */}
          {(selectedCodeTab === 'all' || selectedCodeTab === 'active') && (
            <div className="space-y-3">
              {/* Section 1 Header */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                      <span>{t.modal.activeCodes}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {activeCodes.length}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeCodes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCopyAll(activeCodes, 'active')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 ${
                        copiedType === 'active'
                          ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 hover:text-white border-emerald-500/35'
                      }`}
                      title={!activeUser ? "Đăng nhập để sao chép toàn bộ mã" : `Sao chép toàn bộ ${activeCodes.length} mã còn hạn`}
                    >
                      {copiedType === 'active' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>{t.modal.copiedAll} ({activeCodes.length})</span>
                        </>
                      ) : (
                        <>
                          {!activeUser ? (
                            <Lock className="w-3.5 h-3.5 text-emerald-400/90" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{t.modal.copyAll} ({activeCodes.length})</span>
                        </>
                      )}
                    </button>
                  )}
                  <span
                    className="text-[11px] text-emerald-400 font-semibold hidden sm:flex items-center gap-1 cursor-help"
                    title="100% Khả Dụng • Tất cả mã quà tặng đều đã được kiểm tra tính khả dụng thực tế"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    100% Khả Dụng
                  </span>
                </div>
              </div>

              {activeCodes.length === 0 ? (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border text-center text-xs sm:text-sm text-muted-foreground">
                  {t.filter.noGames}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeCodes.map((codeItem, idx) => {
                    const voteInfo = votes[codeItem.code] || { up: 0, down: 0 };
                    const isThisCopied = copiedCode === codeItem.code;

                    return (
                      <div
                        key={`active-${codeItem.code}-${idx}`}
                        className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                          isThisCopied
                            ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50'
                            : 'bg-muted/40 hover:bg-muted/70 border-emerald-500/25 hover:border-emerald-500/50'
                        }`}
                      >
                        {/* Main Touch / Click Area */}
                        <div className="p-2 sm:p-3 flex items-center justify-between gap-2 sm:gap-3">
                          {/* Left: Code + Metadata (Click to Copy or View Full) */}
                          <div
                            onClick={() => {
                              if (!activeUser) {
                                setIsAuthPromptOpen(true);
                              } else {
                                handleCopy(codeItem.code);
                              }
                            }}
                            className="flex-1 min-w-0 cursor-pointer select-none"
                            title={!activeUser ? "Đăng nhập để xem trọn vẹn mã" : "Nhấn để sao chép mã"}
                          >
                            {/* Row 1: Code Text + Badges */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="font-mono text-xs xs:text-sm sm:text-base font-black tracking-wider text-emerald-400 group-hover:text-emerald-300 break-all sm:break-normal">
                                {activeUser ? (
                                  codeItem.code
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-400/90">
                                    <span>{formatMaskedCode(codeItem.code)}</span>
                                    <Lock className="w-3 h-3 text-amber-400/80 inline shrink-0" />
                                  </span>
                                )}
                              </span>

                              {/* Desktop: Badge Còn Hạn đầy đủ; Mobile: Chấm LED phát sáng */}
                              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {t.modal.activeCodes}
                              </span>
                              <span className="sm:hidden w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Còn hạn" />
                            </div>

                            {/* Row 2: Rewards & Expiry */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
                              {codeItem.rewards && (
                                <span className="truncate max-w-[160px] xs:max-w-[220px] sm:max-w-md text-slate-300 font-sans">
                                  🎁 {decodeHtmlEntities(codeItem.rewards)}
                                </span>
                              )}
                              {codeItem.expiry && codeItem.expiry.trim() !== '' && codeItem.expiry.trim().toLowerCase() !== 'null' ? (
                                <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5 text-amber-400/80" />
                                  {codeItem.expiry}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400/80 italic shrink-0 flex items-center gap-0.5" title="Chưa rõ thời điểm hết hạn">
                                  <Clock className="w-2.5 h-2.5 text-slate-400/60" />
                                  Chưa rõ hạn dùng
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Quick Thumb Actions (Vote & Copy Button) */}
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            {/* Votes: Compact pill */}
                            <div className="flex items-center bg-card/90 border border-border/80 rounded-xl p-0.5 shadow-xs">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(codeItem.code, 'up');
                                }}
                                className="flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-lg hover:bg-emerald-500/20 text-[10px] sm:text-[11px] font-mono text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer active:scale-90"
                                title={t.modal.reportWorking}
                              >
                                <ThumbsUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400/90" />
                                <span>{voteInfo.up}</span>
                              </button>
                              <div className="w-[1px] h-3 bg-border/80" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(codeItem.code, 'down');
                                }}
                                className="flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-lg hover:bg-rose-500/20 text-[10px] sm:text-[11px] font-mono text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer active:scale-90"
                                title={t.modal.reportExpired}
                              >
                                <ThumbsDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400/90" />
                                <span>{voteInfo.down}</span>
                              </button>
                            </div>

                            {/* Prominent Ergonomic Copy Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(codeItem.code);
                              }}
                              className={`h-7 sm:h-8 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0 shadow-sm ${
                                isThisCopied
                                  ? 'bg-emerald-600 text-white shadow-neon-emerald ring-1 ring-emerald-400'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/40 hover:shadow-md'
                              }`}
                              title={t.modal.copy}
                            >
                              {isThisCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                  <span>{t.gameCard.copied}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  <span>{t.modal.copy}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHẦN 2: DANH SÁCH MÃ GIFTCODE ĐÃ HẾT HẠN (EXPIRED CODES)                 */}
          {/* ========================================================================= */}
          {(selectedCodeTab === 'all' || selectedCodeTab === 'expired') && (
            <div className="space-y-3 pt-2">
              {/* Section 2 Header */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                      <span>{t.modal.expiredCodes}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        {expiredCodes.length}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {expiredCodes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCopyAll(expiredCodes, 'expired')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 ${
                        copiedType === 'expired'
                          ? 'bg-rose-600 text-white border-rose-500 ring-2 ring-rose-500/30'
                          : 'bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-white border-rose-500/35'
                      }`}
                      title={!activeUser ? "Đăng nhập để sao chép toàn bộ mã" : `Sao chép toàn bộ ${expiredCodes.length} mã hết hạn`}
                    >
                      {copiedType === 'expired' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>{t.modal.copiedAll} ({expiredCodes.length})</span>
                        </>
                      ) : (
                        <>
                          {!activeUser ? (
                            <Lock className="w-3.5 h-3.5 text-rose-400/90" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{t.modal.copyAll} ({expiredCodes.length})</span>
                        </>
                      )}
                    </button>
                  )}
                  <span className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Archive
                  </span>
                </div>
              </div>

              {expiredCodes.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 text-center text-xs text-muted-foreground">
                  {t.filter.noGames}
                </div>
              ) : (
                <div className="space-y-2">
                  {expiredCodes.map((codeItem, idx) => {
                    const isThisCopied = copiedCode === codeItem.code;

                    return (
                      <div
                        key={`expired-${codeItem.code}-${idx}`}
                        className="p-2.5 sm:p-3 rounded-2xl bg-muted/20 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs sm:text-sm font-semibold line-through text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/60">
                              {activeUser ? codeItem.code : formatMaskedCode(codeItem.code)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" /> {t.modal.expiredCodes}
                            </span>
                            {codeItem.expiry && codeItem.expiry.trim() !== '' && codeItem.expiry.trim().toLowerCase() !== 'null' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/40">
                                <Clock className="w-2.5 h-2.5 text-rose-400/80" />
                                HSD: {codeItem.expiry}
                              </span>
                            )}
                          </div>
                          {codeItem.rewards && (
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
                              🎁 {decodeHtmlEntities(codeItem.rewards)}
                            </p>
                          )}
                        </div>

                        <button
                          disabled
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs text-rose-400/70 bg-rose-500/5 border border-rose-500/20 cursor-not-allowed self-end sm:self-center"
                          title="Mã này đã hết hạn sử dụng"
                        >
                          <AlertCircle className="w-3 h-3 text-rose-400/70" />
                          <span className="text-[11px]">Đã hết hạn</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {(() => {
            const catalogTpl = templateService.resolveCatalog(currentGame);
            const effectiveInstructions = (currentGame.instructions && currentGame.instructions.trim().length > 0)
              ? currentGame.instructions.trim()
              : catalogTpl.instruction;
            if (!effectiveInstructions) return null;
            return (
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 space-y-2.5">
                <div className="flex items-center gap-2 text-foreground font-heading font-bold text-sm sm:text-base">
                  <BookOpen className="w-4 h-4 text-secondary" />
                  <h4>{t.modal.instructions} - {currentGame.name}</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {effectiveInstructions}
                </p>
              </div>
            );
          })()}

          {/* Giấy Phép Phát Hành (Chỉ hiển thị khi có license_number) */}
          {Boolean(currentGame.license_number && currentGame.license_number.trim() !== '') && (
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground font-heading font-bold text-sm sm:text-base">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h4>Giấy Phép Phát Hành</h4>
                </div>
                {/* Badge trạng thái hiệu lực */}
                {(() => {
                  const st = (currentGame.license_status || 'Đang hoạt động').trim();
                  const isRevoked = st === 'Ngừng hoạt động' || st === 'Bị thay thế';
                  return (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isRevoked
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isRevoked ? (
                        <XCircle className="w-3 h-3 text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>{st}</span>
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/50 p-3.5 rounded-xl border border-border/50">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Số Giấy Phép G1:</span>
                  <span className="font-mono font-bold text-foreground text-xs sm:text-sm">
                    {currentGame.license_number}
                  </span>
                </div>
                {currentGame.license_issued_date && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Ngày cấp phép:</span>
                    <span className="font-mono text-foreground text-xs sm:text-sm">
                      {currentGame.license_issued_date}
                    </span>
                  </div>
                )}
                {currentGame.license_source_url && (
                  <div className="sm:col-span-2 pt-1 border-t border-border/40 flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Cơ quan cấp phép: Cục PTTH&TTĐT</span>
                    <a
                      href={currentGame.license_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-light hover:underline font-semibold text-[11px]"
                    >
                      <span>Tra cứu quyết định</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {currentGame.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-heading font-bold text-sm sm:text-base">
                <Info className="w-4 h-4 text-primary-light" />
                <h4>{t.modal.gameInfo}</h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {currentGame.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {isEmailModalOpen && (
        <EmailSubscriptionModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          currentUser={activeUser}
          targetGameSlug={currentGame.slug}
          targetGameName={currentGame.name}
          onShowToast={onShowToast}
        />
      )}

      {/* Modal Nhắc Nhở Đăng Nhập Mở Khóa Tính Năng VIP & Copy Tất Cả */}
      {isAuthPromptOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsAuthPromptOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-500/30 p-5 sm:p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setIsAuthPromptOpen(false)}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-800/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon VIP */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles className="w-7 h-7 text-emerald-400 animate-pulse" />
            </div>

            {/* Tiêu đề & Giới thiệu */}
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black font-heading text-white tracking-tight">
                Mở Khóa Tính Năng VIP
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đăng nhập hoàn toàn miễn phí chỉ trong 5 giây để sử dụng toàn bộ tiện ích:
              </p>
            </div>

            {/* Danh sách quyền lợi */}
            <div className="bg-slate-950/70 rounded-2xl p-3 border border-border/60 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Copy className="w-3.5 h-3.5" />
                </span>
                <span><strong>Copy 1-chạm</strong> toàn bộ {activeCodes.length} mã giftcode</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Unlock className="w-3.5 h-3.5" />
                </span>
                <span><strong>Hiện trọn vẹn 100%</strong> mã code, không bị che ký tự</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center shrink-0 border border-primary/30">
                  <Bookmark className="w-3.5 h-3.5" />
                </span>
                <span>Lưu game yêu thích & nhận thông báo code mới</span>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAuthPromptOpen(false);
                  if (onOpenAuth) {
                    onOpenAuth();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-slate-950" />
                <span>Đăng nhập / Đăng ký ngay</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAuthPromptOpen(false)}
                className="w-full py-1.5 text-xs text-muted-foreground hover:text-slate-300 font-medium transition-colors cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
