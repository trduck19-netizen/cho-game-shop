import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Gift,
  Sparkles,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  History,
  X,
  LogIn,
  Share2,
  User,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Info,
  Calendar,
  ChevronRight,
  Search,
  Zap,
  Download,
  HelpCircle,
  Crown,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Box,
  Users,
  Dices,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { LuckyWheelSection } from './LuckyWheelSection';
import confetti from 'canvas-confetti';
import { CyberLoader } from './CyberLoader';
import { dataService } from '../services/dataService';
import { marketingService, PRESET_VIRTUAL_ACCOUNTS } from '../services/marketingService';
import type { GiveawayCampaign, ClaimedCodeRecord, UserProfile, GiveawayRewardPackage } from '../types/game';
import { groupGiveawaysByGame, getGiveawayPackages } from '../utils/productPackageUtils';
import { formatRelativeDate, formatFullDateTime, smartVietnameseMatch } from '../utils/textUtils';
import { EventCountdownBadge } from './countdown/EventCountdownBadge';
import { useEventCountdown } from '../hooks/useEventCountdown';
import { eventSchedulerService } from '../services/eventSchedulerService';
import { templateService } from '../services/templateService';

interface GiveawaysViewProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onSelectGameSlug: (slug: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onShareGiveaway?: (campaign: GiveawayCampaign, e: React.MouseEvent) => void;
  initialGiveawayId?: string | null;
  onClearInitialGiveawayId?: () => void;
}

/**
 * Phân tích thời gian an toàn cho sự kiện (hỗ trợ cả YYYY-MM-DD và ISO string)
 */
export const parseTimeMs = (str?: string, isEnd = false): number => {
  if (!str) return NaN;
  const s = String(str).trim();
  if (s.length === 10) return new Date(`${s}T${isEnd ? '23:59:59' : '00:00:00'}+07:00`).getTime();
  return new Date(s).getTime();
};

/**
 * Helper kiểm tra sự kiện Giveaway đang mở và cho phép săn mã.
 * Tương thích cả SQLite D1 (0/1), Boolean (false/true) và status (PAUSED/CLOSED/ENDED).
 */
export const isGwActive = (c: any): boolean => {
  if (!c) return false;
  if (c.is_active === false || c.is_active === 0 || c.is_active === '0' || c.isActive === false || c.isActive === 0) return false;
  const st = String(c.status || '').toUpperCase();
  if (st === 'PAUSED' || st === 'CLOSED' || st === 'ENDED') return false;
  return true;
};

/**
 * Helper chuẩn hóa Icon của Giveaway:
 * Loại bỏ URL codemoi.net hoặc URL hỏng, đảm bảo luôn trả về icon WebP/JPG chuẩn xác.
 */
export const getSafeGiveawayIcon = (item?: { game_slug?: string; game_icon_url?: string } | null): string => {
  const slug = item?.game_slug || '';
  const raw = item?.game_icon_url || '';
  if (!raw || raw.includes('codemoi.net') || raw.startsWith('/game-icons')) {
    return slug ? `/game_icons/${slug}.webp` : '/game_icons/default.webp';
  }
  return raw;
};

/**
 * Component hiển thị Phòng chờ & Bộ đếm người đang chờ trực tiếp
 */
const sharedWaitingRoomCounts: Record<string, number> = {};

const LiveWaitingRoomBadge: React.FC<{
  campaignId?: string;
  minUsers?: number;
  maxUsers?: number;
  className?: string;
  variant?: 'card' | 'modal';
}> = ({ campaignId = 'default', minUsers = 25, maxUsers = 85, className = '', variant = 'card' }) => {
  const min = Math.max(1, minUsers || 25);
  const max = Math.max(min + 1, maxUsers || 85);
  const mid = Math.floor((min + max) / 2);

  const [count, setCount] = useState<number>(() => {
    if (sharedWaitingRoomCounts[campaignId]) {
      return sharedWaitingRoomCounts[campaignId];
    }
    const initial = mid + Math.floor((Math.sin(Date.now() / 60000) * (max - min)) / 4);
    sharedWaitingRoomCounts[campaignId] = initial;
    return initial;
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCount((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = Math.min(max, Math.max(min, prev + delta));
        sharedWaitingRoomCounts[campaignId] = next;
        return next;
      });
    }, 45000);

    return () => clearInterval(interval);
  }, [min, max, campaignId]);

  if (variant === 'modal') {
    return (
      <div className={`p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-between text-xs ${className}`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
          </span>
          <span className="font-semibold text-teal-300">Phòng chờ trực tuyến:</span>
        </div>
        <span className="font-mono font-bold text-teal-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>{count} người đang chờ</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 ${className}`}>
      <span className="relative flex h-1.5 w-1.5 mr-0.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
      </span>
      <Users className="w-3 h-3 text-teal-400" />
      <span>{count} người đang chờ</span>
    </div>
  );
};

/**
 * Component hiển thị đếm ngược mở mã tiếp theo trên Card
 */
const GlobalReleaseBadge: React.FC<{
  campaign: GiveawayCampaign;
  onExpire?: () => void;
  className?: string;
}> = ({ campaign, onExpire, className = '' }) => {
  const globalSec = Number(campaign.global_cooldown_seconds || 0);
  const lastClaimAt = campaign.last_global_claim_at;
  const targetDate = React.useMemo(() => {
    if (globalSec <= 0 || !lastClaimAt) return null;
    const lastMs = new Date(lastClaimAt).getTime();
    if (isNaN(lastMs)) return null;
    return lastMs + globalSec * 1000;
  }, [globalSec, lastClaimAt]);

  const { minutes, seconds, isExpired } = useEventCountdown(targetDate, onExpire);

  if (globalSec <= 0 || !targetDate || isExpired) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border backdrop-blur-md bg-gradient-to-r from-amber-950/80 via-orange-950/80 to-yellow-950/80 border-amber-500/40 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)] ${className}`}>
      <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
      <span className="text-[11px] opacity-80">Mã tiếp theo:</span>
      <span className="font-mono font-bold tracking-wider text-amber-300">
        {pad(minutes)}p {pad(seconds)}s
      </span>
    </div>
  );
};

interface GiveawayDetailModalProps {
  campaign: GiveawayCampaign;
  currentUser: UserProfile | null;
  isAdmin: boolean;
  uniqueClaimedList: ClaimedCodeRecord[];
  claimingId: string | null;
  selectedRewardPackageId: string | null;
  setSelectedRewardPackageId: (id: string | null) => void;
  onClose: () => void;
  onOpenAuth: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onSelectGameSlug: (slug: string) => void;
  handleClaim: (campaign: GiveawayCampaign, packageId?: string) => Promise<void>;
  handleOpenLimitNotice: (campaign: GiveawayCampaign, customMsg?: string) => void;
  setClaimedRewardModal: (data: any) => void;
  handleExpireRefresh: () => void;
  onShareGiveaway?: (campaign: GiveawayCampaign, e?: React.MouseEvent) => void;
}

const GiveawayDetailModal: React.FC<GiveawayDetailModalProps> = ({
  campaign,
  currentUser,
  isAdmin,
  uniqueClaimedList,
  claimingId,
  selectedRewardPackageId,
  setSelectedRewardPackageId,
  onClose,
  onOpenAuth,
  onShowToast,
  onSelectGameSlug,
  handleClaim,
  handleOpenLimitNotice,
  setClaimedRewardModal,
  handleExpireRefresh,
  onShareGiveaway,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const packages = getGiveawayPackages(campaign);
  const activePackage = packages.find((p) => p.id === selectedRewardPackageId) || packages[0];
  const effectivePool = activePackage?.codes_pool || campaign.codes_pool;
  const poolCount = Array.isArray(effectivePool) && effectivePool.length > 0
    ? effectivePool.length
    : (typeof activePackage?.remaining_codes === 'number' && activePackage.remaining_codes > 0
        ? activePackage.remaining_codes
        : (typeof campaign.remaining_codes === 'number' ? Math.max(0, campaign.remaining_codes) : 0));
  const displayRemaining = marketingService.getGiveawayDisplayRemaining({
    ...campaign,
    codes_pool: effectivePool,
    remaining_codes: poolCount,
  });
  const displayClaimed =
    campaign.show_claimed_count !== false
      ? marketingService.getClaimedDisplay(campaign)
      : campaign.claimed_codes || 0;
  const remaining = displayRemaining;
  const displayTotal = displayRemaining + displayClaimed;
  const percentClaimed =
    displayTotal > 0
      ? Math.min(100, Math.max(0, Math.round((displayClaimed / displayTotal) * 100)))
      : displayRemaining <= 0
      ? 100
      : 0;

  const rawMaxPerUser = Number(campaign.max_per_user);
  const isUnlimitedUser = rawMaxPerUser === 0 || rawMaxPerUser >= 999999;
  const effectiveMaxPerUser = isUnlimitedUser ? 999999 : (rawMaxPerUser > 0 ? rawMaxPerUser : 1);

  const userCampaignClaims = uniqueClaimedList.filter((c) => c.campaign_id === campaign.id);
  const userClaimCount = userCampaignClaims.length;
  const canClaimMore = (isAdmin || isUnlimitedUser || userClaimCount < effectiveMaxPerUser) && remaining > 0;
  const isMaxReached = !canClaimMore && remaining > 0;

  // Personal Cooldown calculation
  let cooldownRemainingMs = 0;
  const cooldownMinutes = isAdmin ? 0 : (
    campaign.cooldown_minutes !== undefined && campaign.cooldown_minutes !== null
      ? Number(campaign.cooldown_minutes)
      : (Number(campaign.cooldown_hours) || 0) * 60
  );
  if (cooldownMinutes > 0 && userCampaignClaims.length > 0) {
    const latestClaim = userCampaignClaims[0];
    if (latestClaim && latestClaim.claimed_at) {
      const lastClaimTime = new Date(latestClaim.claimed_at).getTime();
      const cooldownMs = cooldownMinutes * 60 * 1000;
      cooldownRemainingMs = Math.max(0, lastClaimTime + cooldownMs - Date.now());
    }
  }
  const isCooldownActive = cooldownRemainingMs > 0;
  const remH = Math.floor(cooldownRemainingMs / (1000 * 3600));
  const remM = Math.ceil((cooldownRemainingMs % (1000 * 3600)) / (1000 * 60));
  const cooldownWaitText = remH > 0 ? `${remH} giờ ${remM} phút` : `${remM} phút`;
  const cdBadgeText = cooldownMinutes >= 60 && cooldownMinutes % 60 === 0
    ? `${cooldownMinutes / 60}h`
    : `${cooldownMinutes}p`;

  // Account age calculation
  const minAccountAgeDays = isAdmin ? 0 : (Number(campaign.min_account_age_days) || 0);
  let userAgeDays = 0;
  let isAgeEligible = true;
  if (currentUser && minAccountAgeDays > 0) {
    const userCreatedAt = currentUser.created_at || (currentUser as any).createdAt;
    if (userCreatedAt) {
      const userCreatedMs = new Date(userCreatedAt).getTime();
      if (!isNaN(userCreatedMs)) {
        userAgeDays = Math.floor((Date.now() - userCreatedMs) / (1000 * 60 * 60 * 24));
        isAgeEligible = userAgeDays >= minAccountAgeDays;
      }
    }
  }

  // Time window calculation
  const nowMs = Date.now();
  const startMs = parseTimeMs(campaign.start_time, false);
  const endMs = parseTimeMs(campaign.end_time, true);
  const isNotStarted = !isNaN(startMs) && nowMs < startMs;
  const isEnded =
    (!isNaN(endMs) && nowMs > endMs) ||
    campaign.status === 'ENDED';

  // Global Cooldown real-time countdown (Requirement 6)
  const globalSec = Number(campaign.global_cooldown_seconds || 0);
  const lastClaimAt = campaign.last_global_claim_at;
  const targetGlobalCooldownDate = useMemo(() => {
    if (globalSec <= 0 || !lastClaimAt) return null;
    const lastMs = new Date(lastClaimAt).getTime();
    if (isNaN(lastMs)) return null;
    return lastMs + globalSec * 1000;
  }, [globalSec, lastClaimAt]);

  const {
    minutes: cdMinutes,
    seconds: cdSeconds,
    isExpired: isCdExpired,
    totalRemainingMs: cdRemainingMs
  } = useEventCountdown(
    targetGlobalCooldownDate,
    () => {
      try {
        playClaimVictorySound();
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } catch {}
      handleExpireRefresh();
    }
  );

  const isModalGlobalCooling = globalSec > 0 && !!targetGlobalCooldownDate && !isCdExpired && cdRemainingMs > 0;
  const pad = (n: number) => String(n).padStart(2, '0');
  const globalCooldownWaitText = `${pad(cdMinutes)}:${pad(cdSeconds)}`;

  // Masked recipient username
  const lastClaimerMasked = (() => {
    const rawName = String(campaign.last_claimer_name || '').trim();
    if (rawName && rawName.toLowerCase() !== 'người chơi trước' && rawName.toLowerCase() !== 'đồng đạo trước') {
      return marketingService.maskName(rawName);
    }
    const campId = String(campaign.id || '');
    let hash = 0;
    for (let i = 0; i < campId.length; i++) {
      hash = (hash << 5) - hash + campId.charCodeAt(i);
      hash |= 0;
    }
    const fallbackRaw = PRESET_VIRTUAL_ACCOUNTS[Math.abs(hash) % PRESET_VIRTUAL_ACCOUNTS.length];
    return marketingService.maskName(fallbackRaw);
  })();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    marketingService.recordRealCopy(campaign.title || 'Giveaway Giftcode', campaign.id || '', 1);
    setCopiedCode(code);
    onShowToast('Đã sao chép mã!', code, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-card border-t sm:border border-border/90 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4 animate-scale-in h-[88dvh] sm:h-auto max-h-[88dvh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Header Action Buttons (Share & Close) */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {onShareGiveaway && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShareGiveaway(campaign, e);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-accent hover:text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0"
              aria-label="Chia sẻ sự kiện"
              title="Chia sẻ sự kiện (Copy nhanh link)"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Modal Header: Game info */}
        <div className="flex items-center gap-3.5 pr-24">
          <div
            onClick={() => {
              onClose();
              onSelectGameSlug(campaign.game_slug);
            }}
            className="w-14 h-14 rounded-2xl bg-muted overflow-hidden shrink-0 border border-border shadow-md cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src={getSafeGiveawayIcon(campaign)}
              alt={campaign.game_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                if (campaign.game_slug && !target.src.includes(`/game_icons/${campaign.game_slug}.webp`)) {
                  target.src = `/game_icons/${campaign.game_slug}.webp`;
                } else if (campaign.game_slug && !target.src.includes(`/game_icons/${campaign.game_slug}.jpg`)) {
                  target.src = `/game_icons/${campaign.game_slug}.jpg`;
                }
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              {/* Requirement 1: Xóa chữ Chính Thức NPH, Xóa chữ Hết code */}
              {isEnded ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Đã kết thúc
                </span>
              ) : isNotStarted ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Sắp mở
                </span>
              ) : remaining <= 0 ? null : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Đang phát mã
                </span>
              )}
            </div>
            <h3 className="font-heading font-black text-base sm:text-lg text-foreground line-clamp-1">
              {campaign.game_name}
            </h3>
            <p className="text-xs text-primary-light font-bold truncate">
              {campaign.title}
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y pr-1 space-y-3.5 custom-scrollbar text-xs">
          {/* Package Selector if multiple packages */}
          {packages.length > 1 && (
            <div className="p-3.5 rounded-2xl bg-card-hover/90 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-accent" />
                  <span>Chọn Gói Quà Tặng Bạn Muốn Giật ({packages.length} gói):</span>
                </span>
                <span className="text-[10px] text-accent font-bold font-mono">
                  {activePackage?.name || 'Mặc định'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {packages.map((pkg) => {
                  const isSelected = activePackage?.id === pkg.id;
                  const pkgStock = Array.isArray(pkg.codes_pool) && pkg.codes_pool.length > 0 ? pkg.codes_pool.length : (typeof pkg.remaining_codes === 'number' ? Math.max(0, pkg.remaining_codes) : 0);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedRewardPackageId(pkg.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-accent/15 border-accent text-accent shadow-sm ring-1 ring-accent'
                          : 'bg-muted/40 hover:bg-muted/70 border-border/70 text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold line-clamp-1">{pkg.name}</span>
                        {pkg.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            {pkg.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{pkg.rewards}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                        <span className={pkgStock > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {pkgStock > 0 ? `Còn ${pkgStock} mã` : 'Hết mã'}
                        </span>
                        {isSelected && pkgStock > 0 && <span className="text-[9px] text-accent font-bold">✓ Đang chọn</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rewards Box */}
          <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
              <Gift className="w-4 h-4" />
              <span>Chi Tiết Phần Thưởng Code{packages.length > 1 ? ` (${activePackage?.name || campaign.title})` : ''}:</span>
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
              {activePackage?.rewards || campaign.rewards}
            </p>
            {campaign.description && (
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                {campaign.description}
              </p>
            )}
          </div>

          {/* Requirement 2: Người nhận thưởng lần trước: tên lên trước, giới thiệu đi sau */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2.5 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-foreground/90 font-medium truncate block">
                  <strong className="text-amber-300 font-bold font-mono tracking-wide mr-1.5">
                    {lastClaimerMasked}
                  </strong>
                  <span className="text-foreground/80 font-normal">
                    (Đạo hữu nhận thưởng lần trước)
                  </span>
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              Đã trao quà
            </span>
          </div>

          {/* Requirement 5: Ô Tùy Chỉnh / Link Cộng Đồng (Admin Cấu Hình & Fallback Nhóm Zalo) */}
          {(() => {
            const rawBannerLink = campaign.custom_banner_link && campaign.custom_banner_link.trim();
            const effectiveBannerLink = rawBannerLink || 'https://zalo.me/g/qdtlmj2tebfa0baraedg';
            const effectiveBannerText = (campaign.custom_banner_text && campaign.custom_banner_text.trim()) || 'Tham gia nhóm zalo của web tại đây';
            
            // Chỉ ẩn khi người quản trị chủ động tắt tường minh bằng false
            if (campaign.custom_banner_enabled === false) return null;

            return (
              <div
                onClick={() => {
                  const targetUrl = effectiveBannerLink.startsWith('http://') || effectiveBannerLink.startsWith('https://')
                    ? effectiveBannerLink
                    : `https://${effectiveBannerLink}`;
                  window.open(targetUrl, '_blank', 'noopener,noreferrer');
                }}
                className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-primary/10 border border-blue-500/30 flex items-center justify-between gap-2.5 transition-all shadow-sm cursor-pointer hover:bg-blue-500/20 hover:border-blue-500/50 hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 border border-blue-500/35 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate select-none">
                    {effectiveBannerText}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-400 shrink-0">
                  <span>Mở link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })()}

          {/* Conditions & Eligibility Checklist */}
          <div className="p-3.5 rounded-2xl bg-card-hover/90 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Điều kiện tham gia sự kiện:</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {currentUser ? 'Đã kiểm tra tài khoản' : 'Cần đăng nhập'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {/* Rule 1: Max per user */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 sm:col-span-2 ${
                  isMaxReached
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-muted/50 border-border/70 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-primary-light shrink-0" />
                  <span className="truncate">
                    {isUnlimitedUser ? 'Không giới hạn mã/tài khoản' : `Tối đa ${rawMaxPerUser || 1} mã / TK`}
                  </span>
                </div>
                <span className="text-[10px] font-bold shrink-0">
                  ({userClaimCount}/{isUnlimitedUser ? '∞' : rawMaxPerUser || 1})
                </span>
              </div>

              {/* Rule 3: Cooldown */}
              {Boolean(cooldownMinutes > 0) && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 sm:col-span-2 ${
                    isCooldownActive
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-muted/50 border-border/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Hồi chiêu: {cdBadgeText} giữa 2 lần nhận</span>
                  </div>
                  <span className="text-[10px] font-bold shrink-0">
                    {isCooldownActive ? `Còn ${cooldownWaitText}` : 'Sẵn sàng'}
                  </span>
                </div>
              )}

              {/* Rule 4: Min account age */}
              {Boolean(campaign.min_account_age_days && campaign.min_account_age_days > 0) && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 sm:col-span-2 ${
                    currentUser && !isAgeEligible
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-muted/50 border-border/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      Tuổi nick yêu cầu: ≥ {campaign.min_account_age_days} ngày
                    </span>
                  </div>
                  <span className="text-[10px] font-bold shrink-0">
                    {currentUser
                      ? isAgeEligible
                        ? `Đạt (${userAgeDays} ngày)`
                        : `Chưa đạt (${userAgeDays}/${campaign.min_account_age_days} ngày)`
                      : `≥ ${campaign.min_account_age_days} ngày`}
                  </span>
                </div>
              )}

              {/* Rule 5: Global release interval */}
              {Boolean(campaign.global_cooldown_seconds && campaign.global_cooldown_seconds > 0) && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 sm:col-span-2 ${
                    isModalGlobalCooling
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-muted/50 border-border/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">
                      Giãn cách phát mã toàn sàn: {campaign.global_cooldown_seconds >= 60 ? `${Math.floor(campaign.global_cooldown_seconds / 60)} phút` : `${campaign.global_cooldown_seconds}s`} / 1 mã
                    </span>
                  </div>
                  <span className="text-[10px] font-bold shrink-0">
                    {isModalGlobalCooling ? '⏳ Đang chờ đợt tiếp' : '🟢 Sẵn sàng'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Stock Progress */}
          <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              {campaign.show_claimed_count !== false ? (
                <span>
                  Đã trao: <strong className="text-amber-400">{displayClaimed} mã</strong>
                </span>
              ) : (
                <span></span>
              )}
              {(campaign as any).show_remaining_count !== false && (
                <span>
                  Còn lại: <strong className="text-accent">{displayRemaining} mã</strong>
                </span>
              )}
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                style={{ width: `${percentClaimed}%` }}
              />
            </div>
          </div>

          {/* Requirement 4: Thời gian sự kiện (Đã chuyển xuống dưới mục đã trao: xx mã) */}
          <div className="p-3 rounded-2xl bg-card-hover/80 border border-border/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-light shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Thời gian sự kiện:
                </span>
                <span className="text-xs font-mono text-foreground font-semibold">
                  {campaign.start_time ? formatRelativeDate(campaign.start_time) : 'Đang mở'} — {campaign.end_time ? formatRelativeDate(campaign.end_time) : 'Vô thời hạn'}
                </span>
              </div>
            </div>
          </div>

          {/* Previously Claimed Codes for this campaign */}
          {userCampaignClaims.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 block">
                  Mã bạn đã giật tại sự kiện này ({userCampaignClaims.length} mã):
                </span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {userCampaignClaims.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-card border border-emerald-500/20 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-xs text-foreground truncate block select-all">
                        {c.code_value}
                      </span>
                      {c.claimed_at && (
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Nhận lúc: {formatFullDateTime(c.claimed_at)}</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopyCode(c.code_value)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedCode === c.code_value ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>Sao chép</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer CTA */}
        <div className="pt-2 border-t border-border/60 space-y-2">
          {!currentUser ? (
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
                onShowToast('Cần đăng nhập', 'Vui lòng đăng nhập hoặc đăng ký tài khoản để giật mã quà tặng.', 'info');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-display font-bold text-xs sm:text-sm shadow-glow-primary hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập Ngay Để Giật Code</span>
            </button>
          ) : isNotStarted ? (
            <div className="space-y-3">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950/60 via-orange-950/60 to-amber-950/60 border border-orange-500/30 text-center space-y-2">
                <div className="text-xs font-bold text-orange-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-pulse" />
                  <span>Sự Kiện Sắp Diễn Ra — Đếm Ngược Đến Giờ G:</span>
                </div>
                <div className="flex justify-center">
                  <EventCountdownBadge
                    targetDate={campaign.start_time}
                    label="Mở sau:"
                    theme="fire"
                    variant="detailed"
                    onExpire={() => {
                      playClaimVictorySound();
                      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                      handleExpireRefresh();
                    }}
                  />
                </div>
              </div>
              <button
                disabled
                className="w-full py-3.5 rounded-2xl bg-muted/60 text-muted-foreground border border-border text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Clock className="w-4 h-4" />
                <span>Chờ Đến Giờ Mở Sự Kiện ({formatRelativeDate(campaign.start_time)})</span>
              </button>
            </div>
          ) : isEnded ? (
            <button
              disabled
              className="w-full py-3.5 rounded-2xl bg-muted/60 text-muted-foreground border border-border text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <span>Sự Kiện Đã Kết Thúc</span>
            </button>
          ) : isModalGlobalCooling ? (
            /* Requirement 6: Thu gọn thông báo đếm ngược thành nút bấm nhỏ gọn như cũ */
            <div className="space-y-1.5">
              <button
                disabled
                className="w-full py-3.5 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed shadow-sm"
              >
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Đang Chờ Đợt Mã Tiếp Theo (Còn {globalCooldownWaitText})</span>
              </button>

              <p className="text-[11px] text-amber-300/80 text-center leading-relaxed px-2">
                {(() => {
                  const lastUser = campaign.last_claimer_name || 'người chơi trước';
                  const template =
                    campaign.custom_cooldown_msg ||
                    'Đợt phát trước đạo hữu {last_user} đã nhanh tay nhận mã, vui lòng đợi đợt tiếp theo sau {time_left}.';
                  return template
                    .replace(/\{last_user\}|\{claimer\}|\{last_claimer\}|\{last_claimer_name\}|\{user\}/gi, lastUser)
                    .replace(/\{time_left\}|\{seconds\}|\{sec\}/gi, globalCooldownWaitText);
                })()}
              </p>

              {isAdmin && (
                <button
                  onClick={() => handleClaim(campaign, activePackage?.id)}
                  disabled={claimingId === campaign.id}
                  className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 mt-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>👑 [Admin] Bỏ qua chờ đợt — Giật thử nghiệm ngay</span>
                </button>
              )}

              {userClaimCount > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    const existing = uniqueClaimedList.find((c) => c.campaign_id === campaign.id);
                    if (existing?.code_value) {
                      setClaimedRewardModal({
                        campaign,
                        code: existing.code_value,
                        isNew: false,
                        isAdminBypass: isAdmin,
                      });
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xem lại mã bạn đã nhận ({userClaimCount})</span>
                </button>
              )}
            </div>
          ) : remaining <= 0 ? (
            <div className="space-y-2">
              <button
                disabled
                className="w-full py-3.5 rounded-2xl bg-muted/60 text-muted-foreground border border-border text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{!isGwActive(campaign) ? 'Sự Kiện Tạm Đóng — Chờ Đợt Mã Mới' : 'Chờ Đợt Mã Mới'}</span>
              </button>
              {userClaimCount > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    const existing = uniqueClaimedList.find((c) => c.campaign_id === campaign.id);
                    if (existing?.code_value) {
                      setClaimedRewardModal({
                        campaign,
                        code: existing.code_value,
                        isNew: false,
                        isAdminBypass: isAdmin,
                      });
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xem lại mã bạn đã nhận ({userClaimCount})</span>
                </button>
              )}
            </div>
          ) : isMaxReached ? (
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  onClose();
                  const existing = uniqueClaimedList.find((c) => c.campaign_id === campaign.id);
                  if (existing?.code_value) {
                    setClaimedRewardModal({
                      campaign,
                      code: existing.code_value,
                      isNew: false,
                      isAdminBypass: isAdmin,
                    });
                  } else {
                    handleOpenLimitNotice(campaign);
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xem {userClaimCount} Mã Đã Nhận & Sao Chép</span>
              </button>
            </div>
          ) : isCooldownActive ? (
            <button
              onClick={() => {
                onClose();
                handleOpenLimitNotice(
                  campaign,
                  `Bạn đang trong thời gian hồi chiêu (${cdBadgeText}). Vui lòng quay lại sau ${cooldownWaitText} để giật mã tiếp theo.`
                );
              }}
              className="w-full py-3.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Clock className="w-4 h-4 animate-spin text-amber-400" />
              <span>Đang Hồi Chiêu (Còn {cooldownWaitText})</span>
            </button>
          ) : !isAgeEligible ? (
            <button
              onClick={() => {
                onClose();
                handleOpenLimitNotice(
                  campaign,
                  `Tài khoản của bạn mới được tạo ${Math.max(0, userAgeDays)} ngày. Sự kiện này yêu cầu tài khoản tối thiểu ${minAccountAgeDays} ngày tuổi mới đủ điều kiện giật code.`
                );
              }}
              className="w-full py-3.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Chưa Đủ Điều Kiện Tuổi Nick ({userAgeDays}/{minAccountAgeDays} ngày)</span>
            </button>
          ) : (
            <div className="space-y-2">
              {campaign.enable_waiting_room !== false && (
                <LiveWaitingRoomBadge
                  campaignId={campaign.id}
                  minUsers={campaign.waiting_users_min}
                  maxUsers={campaign.waiting_users_max}
                  variant="modal"
                  className="mb-1"
                />
              )}
              <button
                onClick={() => handleClaim(campaign, activePackage?.id)}
                disabled={claimingId === campaign.id}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-accent via-rose-500 to-amber-500 hover:opacity-95 text-white font-display font-black text-xs sm:text-sm tracking-wide shadow-glow-accent hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {claimingId === campaign.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Đang Kết Nối Nhận Mã...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 animate-bounce" />
                    <span>
                      {userClaimCount > 0
                        ? isAdmin
                          ? `👑 [Admin] Giật Thêm Mã (Đã có ${userClaimCount} mã)`
                          : `⚡ Giật Thêm Mã Mới (${userClaimCount}/${isUnlimitedUser ? '∞' : rawMaxPerUser || 1})`
                        : '⚡ GIẬT MÃ CODE NGAY (MIỄN PHÍ)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {onShareGiveaway && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShareGiveaway(campaign, e);
                }}
                className="flex-1 py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                title="Chia sẻ sự kiện và copy nhanh liên kết"
              >
                <Share2 className="w-4 h-4" />
                <span>Chia Sẻ & Copy Link</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`${onShareGiveaway ? 'flex-1' : 'w-full'} py-2.5 rounded-xl bg-muted hover:bg-card text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer text-center`}
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



/**
 * Web Audio API synthesizer for instant arcade victory chime
 */
const playClaimVictorySound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.36);
    });
  } catch {}
};

export const GiveawaysView: React.FC<GiveawaysViewProps> = ({
  onShowToast,
  onSelectGameSlug,
  currentUser,
  onOpenAuth,
  onShareGiveaway,
  initialGiveawayId,
  onClearInitialGiveawayId,
}) => {
  const [giveaways, setGiveaways] = useState<GiveawayCampaign[]>([]);
  // Gom nhóm các chiến dịch Giveaway cùng Tựa Game thành chiến dịch đại diện
  const groupedCampaigns = useMemo(() => groupGiveawaysByGame(giveaways), [giveaways]);
  const [claimedList, setClaimedList] = useState<ClaimedCodeRecord[]>([]);
  const uniqueClaimedList = useMemo(() => {
    const seen = new Set<string>();
    return claimedList.filter((c) => {
      if (!c || !c.code_value) return false;
      const key = `${c.campaign_id || ''}_${String(c.code_value).trim().toUpperCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [claimedList]);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'my_codes' | 'wheel'>('campaigns');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [cmsIntro, setCmsIntro] = useState(() => dataService.getContentByKey('giveaway_section'));
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [detailModalCampaign, setDetailModalCampaign] = useState<GiveawayCampaign | null>(null);
  const [claimedRewardModal, setClaimedRewardModal] = useState<{
    campaign: GiveawayCampaign;
    code: string;
    isNew?: boolean;
    isAdminBypass?: boolean;
  } | null>(null);
  const [limitNoticeModal, setLimitNoticeModal] = useState<{
    campaign: GiveawayCampaign;
    message: string;
    existingCodes: ClaimedCodeRecord[];
  } | null>(null);

  // New interactive states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'available' | 'hot' | 'mine'>('all');
  const [isRedeemGuideOpen, setIsRedeemGuideOpen] = useState(false);
  const [selectedRewardPackageId, setSelectedRewardPackageId] = useState<string | null>(null);

  const [isUnboxing, setIsUnboxing] = useState(false);

  const updateDebounceTimerRef = useRef<any>(null);
  const expireThrottleTimerRef = useRef<any>(null);
  const handledTargetIdRef = useRef<string | null>(null);

  const loadData = useCallback(() => {
    const rawList = dataService.getGiveaways().map((g) => templateService.resolveGiveaway(g));
    const list = groupGiveawaysByGame(rawList);
    setGiveaways((prev) => {
      if (prev.length === list.length) {
        const isIdentical = list.every((item, idx) => {
          const p = prev[idx];
          return (
            p &&
            p.id === item.id &&
            p.remaining_codes === item.remaining_codes &&
            p.claimed_codes === item.claimed_codes &&
            p.last_global_claim_at === item.last_global_claim_at &&
            p.status === item.status &&
            p.is_active === item.is_active &&
            p.cooldown_minutes === item.cooldown_minutes &&
            p.cooldown_hours === item.cooldown_hours &&
            p.global_cooldown_seconds === item.global_cooldown_seconds &&
            p.min_account_age_days === item.min_account_age_days &&
            p.max_per_user === item.max_per_user &&
            p.max_per_ip === item.max_per_ip &&
            p.title === item.title &&
            p.rewards === item.rewards &&
            p.description === item.description &&
            p.use_template === item.use_template &&
            p.start_time === item.start_time &&
            p.end_time === item.end_time &&
            p.custom_banner_enabled === item.custom_banner_enabled &&
            p.custom_banner_text === item.custom_banner_text &&
            p.custom_banner_link === item.custom_banner_link &&
            p.enable_waiting_room === item.enable_waiting_room &&
            p.waiting_users_min === item.waiting_users_min &&
            p.waiting_users_max === item.waiting_users_max &&
            p.show_claimed_count === item.show_claimed_count &&
            p.virtual_claimed_offset === item.virtual_claimed_offset &&
            p.enable_auto_simulation === item.enable_auto_simulation &&
            p.simulation_idle_threshold_minutes === item.simulation_idle_threshold_minutes &&
            p.virtual_remaining_addition === item.virtual_remaining_addition &&
            p.virtual_remaining_current === item.virtual_remaining_current &&
            p.updated_at === item.updated_at
          );
        });
        if (isIdentical) return prev;
      }
      return list;
    });
    const myCodes = dataService.getClaimedCodes();
    setClaimedList(myCodes);
    setCmsIntro(dataService.getContentByKey('giveaway_section'));
  }, []);

  const handleExpireRefresh = useCallback(() => {
    if (expireThrottleTimerRef.current) return;
    expireThrottleTimerRef.current = setTimeout(() => {
      expireThrottleTimerRef.current = null;
      loadData();
    }, 300);
  }, [loadData]);

  useEffect(() => {
    loadData();
    dataService.syncGiveaways().then(() => loadData());
    dataService.syncWithCloudflareKV();
    const handleGwUpdated = () => loadData();
    window.addEventListener('wcg_giveaways_updated', handleGwUpdated);
    window.addEventListener('wcg_universal_templates_updated', handleGwUpdated);
    const unsub = dataService.subscribe(() => {
      loadData();
    });
    const unsubTpl = templateService.subscribe(() => {
      loadData();
    });
    const handleUpdate = () => {
      if (updateDebounceTimerRef.current) {
        clearTimeout(updateDebounceTimerRef.current);
      }
      updateDebounceTimerRef.current = setTimeout(() => {
        loadData();
      }, 150);
    };
    const unsubStock = marketingService.subscribeStockChange(handleUpdate);
    const unsubSold = marketingService.subscribeSoldCountChange(handleUpdate);
    window.addEventListener('wcg_admin_data_updated', handleUpdate);
    window.addEventListener('wcg_virtual_stock_updated', handleUpdate);
    window.addEventListener('wcg_sold_count_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      if (updateDebounceTimerRef.current) {
        clearTimeout(updateDebounceTimerRef.current);
      }
      if (expireThrottleTimerRef.current) {
        clearTimeout(expireThrottleTimerRef.current);
      }
      unsub();
      unsubTpl();
      unsubStock();
      unsubSold();
      window.removeEventListener('wcg_admin_data_updated', handleUpdate);
      window.removeEventListener('wcg_virtual_stock_updated', handleUpdate);
      window.removeEventListener('wcg_sold_count_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('wcg_giveaways_updated', handleGwUpdated);
      window.removeEventListener('wcg_universal_templates_updated', handleGwUpdated);
    };
  }, [loadData]);

  const handleOpenDetailModal = (campaign: GiveawayCampaign) => {
    setDetailModalCampaign(campaign);
    const pkgs = getGiveawayPackages(campaign);
    setSelectedRewardPackageId(pkgs[0]?.id || campaign.id);
    try {
      if (typeof window !== 'undefined' && campaign.id) {
        window.history.replaceState(null, '', `/giveaways/${campaign.id}`);
      }
    } catch {}
  };

  const handleCloseDetailModal = () => {
    setDetailModalCampaign(null);
    setSelectedRewardPackageId(null);
    handledTargetIdRef.current = null;
    onClearInitialGiveawayId?.();
    try {
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/giveaways');
      }
    } catch {}
  };

  // Deep link auto-open campaign modal
  useEffect(() => {
    const checkTargetGiveaway = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const path = window.location.pathname;
      const urlParams = new URLSearchParams(search);

      const targetId =
        initialGiveawayId ||
        urlParams.get('gw') ||
        urlParams.get('giveaway') ||
        (hash.includes('gw=') ? hash.split(/gw=/i)[1]?.split('&')[0] : null) ||
        (hash.includes('giveaway=') ? hash.split(/giveaway=/i)[1]?.split('&')[0] : null) ||
        (path.startsWith('/giveaways/') ? path.replace(/^\/giveaways\//i, '').split('/')[0] : null) ||
        (path.startsWith('/giveaway/') ? path.replace(/^\/giveaway\//i, '').split('/')[0] : null);

      const cleanTarget = targetId ? decodeURIComponent(targetId).trim().toLowerCase() : null;

      if (
        cleanTarget &&
        cleanTarget.length > 0 &&
        cleanTarget !== 'all' &&
        cleanTarget !== 'hot' &&
        cleanTarget !== 'available' &&
        cleanTarget !== 'mine' &&
        giveaways.length > 0
      ) {
        if (handledTargetIdRef.current === cleanTarget) return;

        const found = groupedCampaigns.find(
          (g) =>
            g.id.toLowerCase() === cleanTarget ||
            (g.game_slug && g.game_slug.toLowerCase() === cleanTarget) ||
            (g.packages && g.packages.some((p) => p.id.toLowerCase() === cleanTarget))
        ) || giveaways.find(
          (g) => g.id.toLowerCase() === cleanTarget || (g.game_slug && g.game_slug.toLowerCase() === cleanTarget)
        );

        if (found) {
          handledTargetIdRef.current = cleanTarget;
          handleOpenDetailModal(found);
          setActiveTab('campaigns');
          onClearInitialGiveawayId?.();
        }
      }
    };

    checkTargetGiveaway();
    window.addEventListener('hashchange', checkTargetGiveaway);
    window.addEventListener('popstate', checkTargetGiveaway);
    return () => {
      window.removeEventListener('hashchange', checkTargetGiveaway);
      window.removeEventListener('popstate', checkTargetGiveaway);
    };
  }, [giveaways, initialGiveawayId, groupedCampaigns, onClearInitialGiveawayId]);



  const isAdmin = Boolean(
    currentUser &&
      (currentUser.role === 'admin' ||
        currentUser.role === 'SUPER_ADMIN' ||
        (currentUser as any).role === 'ADMIN' ||
        currentUser.username === 'admin' ||
        currentUser.username === 'admin290200' ||
        currentUser.id === 'usr_admin')
  );

  const handleClaim = async (campaign: GiveawayCampaign, targetPackageId?: string) => {
    if (!currentUser) {
      onOpenAuth();
      onShowToast('Cần đăng nhập', 'Vui lòng đăng nhập hoặc đăng ký tài khoản để giật mã quà tặng miễn phí.', 'info');
      return;
    }
    if (claimingId) return;
    const targetId = targetPackageId || selectedRewardPackageId || campaign.id;
    setClaimingId(campaign.id);

    try {
      const res = await dataService.claimGiveaway(targetId);
      setClaimingId(null);
      setDetailModalCampaign(null);

      // Refresh list to pick up any stored code
      const freshClaimedList = dataService.getClaimedCodes();
      setClaimedList(freshClaimedList);

      if (!res.success) {
        if ((res as any).errorCode === 'GLOBAL_COOLDOWN_ACTIVE') {
          onShowToast('Đang chờ đợt mã tiếp theo', res.message || 'Mã vừa được giật bởi người chơi khác! Vui lòng chờ đợt mở kế tiếp.', 'info');
          loadData();
          return;
        }

        const myPrevClaims = freshClaimedList.filter((c) => c.campaign_id === targetId || c.campaign_id === campaign.id);
        const myPrevCode = res.code || (myPrevClaims.length > 0 ? myPrevClaims[0].code_value : null);
        if ((res.alreadyClaimed || myPrevClaims.length > 0) && myPrevCode) {
          setClaimedRewardModal({
            campaign,
            code: myPrevCode,
            isNew: false,
            isAdminBypass: res.isAdminBypass || isAdmin,
          });
          onShowToast('Mã quà tặng của bạn', `Bạn đã nhận mã này trước đó: ${myPrevCode}`, 'info');
        } else {
          onShowToast('Không thể nhận mã', res.message || 'Kho mã sự kiện hiện đã hết.', 'error');
        }
        loadData();
        return;
      }

      if (res.code) {
        if (res.isNewCode && !res.alreadyClaimed) {
          try {
            playClaimVictorySound();
            confetti({
              particleCount: 90,
              spread: 85,
              origin: { y: 0.6 },
              colors: ['#F43F5E', '#8B5CF6', '#10B981', '#F59E0B', '#38BDF8'],
            });
          } catch {}

          setIsUnboxing(true);
          setTimeout(() => setIsUnboxing(false), 900);

          setClaimedRewardModal({
            campaign,
            code: res.code,
            isNew: true,
            isAdminBypass: res.isAdminBypass || isAdmin,
          });

          onShowToast(
            res.isAdminBypass || isAdmin
              ? '👑 [Admin Mode] Giật mã mới thành công!'
              : '🎉 Giật code thành công!',
            res.message || `Mã mới của bạn: ${res.code}`,
            'success'
          );
        } else {
          // Already claimed code: No victory chime, no confetti, no unboxing
          setClaimedRewardModal({
            campaign,
            code: res.code,
            isNew: false,
            isAdminBypass: res.isAdminBypass || isAdmin,
          });

          onShowToast(
            'Mã quà tặng của bạn',
            `Đây là mã bạn đã nhận trước đó: ${res.code}`,
            'info'
          );
        }
        loadData();
      }
    } catch (err: any) {
      setClaimingId(null);
      onShowToast('Lỗi nhận mã', err?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  const handleOpenLimitNotice = (campaign: GiveawayCampaign, customMsg?: string) => {
    const existing = uniqueClaimedList.filter((c) => c.campaign_id === campaign.id);
    const maxUser = campaign.max_per_user || 1;
    let msg = customMsg;
    if (!msg) {
      if (existing.length >= maxUser) {
        msg = `Bạn đã nhận tối đa ${existing.length}/${maxUser} lượt giftcode cho sự kiện này. Mỗi tài khoản chỉ được nhận theo đúng hạn ngạch quy định.`;
      } else {
        msg = `Chưa đủ điều kiện tham gia sự kiện này. Vui lòng kiểm tra các điều kiện yêu cầu bên dưới.`;
      }
    }
    setLimitNoticeModal({
      campaign,
      message: msg,
      existingCodes: existing,
    });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    marketingService.recordRealCopy('Giveaway Giftcode', '', 1);
    setCopiedCode(code);
    onShowToast('Đã sao chép mã!', code, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyAllCodes = () => {
    if (uniqueClaimedList.length === 0) return;
    const text =
      uniqueClaimedList
        .map(
          (c, idx) =>
            `${idx + 1}. [${c.game_name}] Mã: ${c.code_value} | Thưởng: ${c.rewards} (Nhận: ${formatFullDateTime(c.claimed_at)})`
        )
        .join('\n') + '\n\n📌 Nguồn: CodeGame.shop - Săn Giftcode VIP Miễn Phí tại https://codegame.shop';
    navigator.clipboard.writeText(text);
    marketingService.recordRealCopy('Giveaway Giftcode', '', uniqueClaimedList.length);
    onShowToast('Đã sao chép tất cả mã!', `Đã chép toàn bộ ${uniqueClaimedList.length} giftcode vào clipboard.`, 'success');
  };

  const handleExportTxtFile = () => {
    if (uniqueClaimedList.length === 0) return;
    const header = `=== DANH SÁCH GIFTCODE ĐÃ SĂN - CODEGAME.SHOP ===\nThời gian xuất: ${new Date().toLocaleString('vi-VN')}\nTổng số mã: ${uniqueClaimedList.length}\nTra cứu thêm mã mới: https://codegame.shop\n\n`;
    const body = uniqueClaimedList
      .map(
        (c, idx) =>
          `[MÃ #${idx + 1}]\nGame: ${c.game_name}\nMã Code: ${c.code_value}\nPhần Thưởng: ${c.rewards}\nThời Gian Nhận: ${formatFullDateTime(c.claimed_at)}\n----------------------------------------`
      )
      .join('\n\n');
    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giftcodes_da_san_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Đã tải file .txt', 'Danh sách giftcode đã được lưu vào máy của bạn.', 'success');
  };

  // Filter & sort campaigns (Mặc định ưu tiên hàng còn lên trên đầu)
  const getCampaignStock = (c: GiveawayCampaign) => {
    // Khi sự kiện đóng: ngoài web báo hết mã (0), mã thật vẫn để trong kho
    if (!isGwActive(c)) return 0;
    if (Array.isArray(c.packages) && c.packages.length > 0) {
      return c.packages.reduce((sum, p) => {
        const pCount = Array.isArray(p.codes_pool) && p.codes_pool.length > 0
          ? p.codes_pool.length
          : (typeof p.remaining_codes === 'number' ? Math.max(0, p.remaining_codes) : 0);
        return sum + pCount;
      }, 0);
    }
    return Array.isArray(c.codes_pool) && c.codes_pool.length > 0
      ? c.codes_pool.length
      : (typeof c.remaining_codes === 'number' ? Math.max(0, c.remaining_codes) : 0);
  };

  const activeGiveaways = groupedCampaigns
    .filter((c) => {
      // Giữ sự kiện hiển thị trên Web ngay cả khi đóng để báo "Hết Mã" cho khách theo yêu cầu
      // Search query filter: Sử dụng smartVietnameseMatch hỗ trợ gõ không dấu, có dấu, viết tắt, tìm toàn diện
      if (searchQuery.trim()) {
        return smartVietnameseMatch(
          [c.game_name, c.title, c.game_slug, c.description, c.rewards],
          searchQuery
        );
      }
      // Category filter
      if (filterCategory === 'available') {
        const poolCount = getCampaignStock(c);
        return poolCount > 0 && isGwActive(c);
      }
      if (filterCategory === 'out_of_stock') {
        const poolCount = getCampaignStock(c);
        return poolCount <= 0 || !isGwActive(c);
      }
      if (filterCategory === 'hot') {
        return (c.claimed_codes || 0) >= 5 || (c.show_claimed_count !== false);
      }
      if (filterCategory === 'mine') {
        return uniqueClaimedList.some((my) => my.campaign_id === c.id || (c.packages && c.packages.some((p) => p.id === my.campaign_id)));
      }
      return true;
    })
    .sort((a, b) => {
      const poolCountA = getCampaignStock(a);
      const poolCountB = getCampaignStock(b);

      const inStockA = poolCountA > 0 ? 1 : 0;
      const inStockB = poolCountB > 0 ? 1 : 0;

      // 1. Mặc định ưu tiên hàng còn lên trên đầu
      if (inStockA !== inStockB) {
        return inStockB - inStockA;
      }

      // 2. Nếu cùng còn hàng, ưu tiên số lượng còn nhiều hơn
      if (inStockA > 0 && poolCountA !== poolCountB) {
        return poolCountB - poolCountA;
      }

      // 3. Giữ thứ tự cập nhật / tạo mới nhất
      const timeA = Math.max(
        a.updated_at ? new Date(a.updated_at).getTime() : 0,
        a.created_at ? new Date(a.created_at).getTime() : 0
      );
      const timeB = Math.max(
        b.updated_at ? new Date(b.updated_at).getTime() : 0,
        b.created_at ? new Date(b.created_at).getTime() : 0
      );
      return timeB - timeA;
    });

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-10 space-y-4 sm:space-y-7 animate-fade-in">
      {/* Header Banner */}
      <div className="relative p-3.5 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card via-card-hover to-card border border-border shadow-2xl overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1 sm:space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-accent/15 text-accent text-[11px] sm:text-xs font-semibold border border-accent/30">
              <Flame className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>{cmsIntro?.extraData?.badge || 'Sự Kiện Giật Code Giới Hạn'}</span>
            </div>
            <h1 className="font-display font-extrabold text-lg sm:text-4xl text-foreground">
              {cmsIntro?.title || 'Săn Giftcode Độc Quyền Miễn Phí'}
            </h1>
            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
              {cmsIntro?.content ||
                'Các chiến dịch phát code độc quyền số lượng có hạn tài trợ từ NPH và sự kiện cộng đồng CH Play. Kích hoạt trực tiếp ngay trong game.'}
            </p>

            {isAdmin && (
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[11px] sm:text-xs font-bold mt-1">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Chế độ Admin: Bạn có thể giật thử nghiệm liên tục mã mới từ kho.</span>
              </div>
            )}
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-muted/70 border border-border shrink-0 self-stretch sm:self-auto overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'campaigns'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sự Kiện ({groupedCampaigns.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('wheel')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'wheel'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Dices className="w-3.5 h-3.5 text-amber-300" />
              <span>🎡 Vòng Quay May Mắn</span>
            </button>
            <button
              onClick={() => setActiveTab('my_codes')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'my_codes'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Mã Đã Giật ({uniqueClaimedList.length})</span>
            </button>
          </div>
        </div>
      </div>



      {/* Tab: Campaigns List */}
      {activeTab === 'campaigns' ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Search and Category Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
            {/* Quick Filter Chips */}
            <div className="relative flex-1 min-w-0 overflow-hidden w-full max-w-full">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full max-w-full">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    filterCategory === 'all'
                      ? 'bg-primary text-white shadow-glow-primary'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  Tất Cả ({groupedCampaigns.length})
                </button>
                <button
                  onClick={() => setFilterCategory('available')}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filterCategory === 'available'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Còn Mã ({groupedCampaigns.filter((c) => isGwActive(c) && getCampaignStock(c) > 0).length})</span>
                </button>
                <button
                  onClick={() => setFilterCategory('out_of_stock')}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filterCategory === 'out_of_stock'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-rose-300" />
                  <span>Đã Hết Mã ({groupedCampaigns.filter((c) => !isGwActive(c) || getCampaignStock(c) <= 0).length})</span>
                </button>
                <button
                  onClick={() => setFilterCategory('hot')}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filterCategory === 'hot'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span>Sự Kiện Hot</span>
                </button>
                <button
                  onClick={() => setFilterCategory('mine')}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filterCategory === 'mine'
                      ? 'bg-accent text-white shadow-glow-accent'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>Đã Nhận ({uniqueClaimedList.length})</span>
                </button>
              </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent sm:hidden z-10" />
            </div>

            {/* Search input */}
            <div className="relative min-w-[240px] md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo game, quà tặng..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {activeGiveaways.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-card/60 border border-border p-8 space-y-4">
              <Gift className="w-14 h-14 mx-auto text-muted-foreground/30 animate-pulse" />
              <h3 className="font-heading font-bold text-lg text-foreground">
                {searchQuery ? 'Không tìm thấy đợt phát phù hợp' : 'Hiện tại chưa có đợt phát giftcode nào'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {searchQuery
                  ? 'Vui lòng thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ sự kiện.'
                  : 'Các sự kiện và đợt phát mã quà tặng độc quyền sẽ được Ban Quản Trị cập nhật tại đây. Vui lòng quay lại sau!'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-glow-primary cursor-pointer"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {activeGiveaways.map((campaign) => {
                const poolCount = Array.isArray(campaign.codes_pool) && campaign.codes_pool.length > 0 ? campaign.codes_pool.length : (typeof campaign.remaining_codes === 'number' ? Math.max(0, campaign.remaining_codes) : 0);

                const displayRemaining = marketingService.getGiveawayDisplayRemaining(campaign);
                const displayClaimed =
                  campaign.show_claimed_count !== false
                    ? marketingService.getClaimedDisplay(campaign)
                    : campaign.claimed_codes || 0;
                const remaining = displayRemaining;

                const displayTotal = displayRemaining + displayClaimed;
                const percentClaimed =
                  displayTotal > 0
                    ? Math.min(100, Math.max(0, Math.round((displayClaimed / displayTotal) * 100)))
                    : displayRemaining <= 0
                    ? 100
                    : 0;

                const rawMaxPerUser = Number(campaign.max_per_user);
                const isUnlimitedUser = rawMaxPerUser === 0 || rawMaxPerUser >= 999999;
                const effectiveMaxPerUser = isUnlimitedUser ? 999999 : (rawMaxPerUser > 0 ? rawMaxPerUser : 1);

                const userCampaignClaims = uniqueClaimedList.filter((c) => c.campaign_id === campaign.id);
                const userClaimCount = userCampaignClaims.length;

                // Multi-claim & Admin permission evaluation
                const canClaimMore = (isAdmin || isUnlimitedUser || userClaimCount < effectiveMaxPerUser) && remaining > 0;
                const isMaxReached = !canClaimMore && remaining > 0;

                // Cooldown calculation (bypassed for Admin)
                let cooldownRemainingMs = 0;
                const cooldownMinutes = isAdmin ? 0 : (
                  campaign.cooldown_minutes !== undefined && campaign.cooldown_minutes !== null
                    ? Number(campaign.cooldown_minutes)
                    : (Number(campaign.cooldown_hours) || 0) * 60
                );
                if (cooldownMinutes > 0 && userCampaignClaims.length > 0) {
                  const latestClaim = userCampaignClaims[0];
                  if (latestClaim && latestClaim.claimed_at) {
                    const lastClaimTime = new Date(latestClaim.claimed_at).getTime();
                    const cooldownMs = cooldownMinutes * 60 * 1000;
                    cooldownRemainingMs = Math.max(0, lastClaimTime + cooldownMs - Date.now());
                  }
                }
                const isCooldownActive = cooldownRemainingMs > 0;
                const remH = Math.floor(cooldownRemainingMs / (1000 * 3600));
                const remM = Math.ceil((cooldownRemainingMs % (1000 * 3600)) / (1000 * 60));
                const cooldownWaitText = remH > 0 ? `${remH}h ${remM}m` : `${remM} phút`;
                const cdBadgeText = cooldownMinutes >= 60 && cooldownMinutes % 60 === 0
                  ? `${cooldownMinutes / 60}h`
                  : `${cooldownMinutes}p`;

                // Account age calculation (bypassed for Admin)
                const minAccountAgeDays = isAdmin ? 0 : (Number(campaign.min_account_age_days) || 0);
                let userAgeDays = 0;
                let isAgeEligible = true;
                if (currentUser && minAccountAgeDays > 0) {
                  const userCreatedAt = currentUser.created_at || (currentUser as any).createdAt;
                  if (userCreatedAt) {
                    const userCreatedMs = new Date(userCreatedAt).getTime();
                    if (!isNaN(userCreatedMs)) {
                      userAgeDays = Math.floor((Date.now() - userCreatedMs) / (1000 * 60 * 60 * 24));
                      isAgeEligible = userAgeDays >= minAccountAgeDays;
                    }
                  }
                }

                // Time window calculation
                const nowMs = Date.now();
                const cardStartMs = parseTimeMs(campaign.start_time, false);
                const cardEndMs = parseTimeMs(campaign.end_time, true);
                const isNotStarted = !isNaN(cardStartMs) && nowMs < cardStartMs;
                const isEnded =
                  (!isNaN(cardEndMs) && nowMs > cardEndMs) ||
                  campaign.status === 'ENDED';

                const isCardGlobalCooling = Boolean(
                  campaign.global_cooldown_seconds &&
                  campaign.global_cooldown_seconds > 0 &&
                  campaign.last_global_claim_at &&
                  (new Date(campaign.last_global_claim_at).getTime() + campaign.global_cooldown_seconds * 1000) > Date.now()
                );

                return (
                  <div
                    key={campaign.id}
                    onClick={() => handleOpenDetailModal(campaign)}
                    className="bg-card rounded-2xl border border-border/80 hover:border-accent/40 shadow-cyber-card p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 group cursor-pointer"
                  >
                    <div>
                      {/* Top Bar: Game info & Direct Share */}
                      <div className="flex items-center justify-between gap-2.5 mb-2.5">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGameSlug(campaign.game_slug);
                          }}
                          className="flex items-center gap-2.5 cursor-pointer group-hover:opacity-90 min-w-0 flex-1"
                        >
                          <div className="w-11 h-11 rounded-xl bg-muted overflow-hidden shrink-0 border border-border shadow-sm">
                            <img
                              src={getSafeGiveawayIcon(campaign)}
                              alt={campaign.game_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                if (campaign.game_slug && !target.src.includes(`/game_icons/${campaign.game_slug}.webp`)) {
                                  target.src = `/game_icons/${campaign.game_slug}.webp`;
                                } else if (campaign.game_slug && !target.src.includes(`/game_icons/${campaign.game_slug}.jpg`)) {
                                  target.src = `/game_icons/${campaign.game_slug}.jpg`;
                                }
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading font-bold text-sm text-foreground hover:text-primary-light transition-colors line-clamp-1">
                              {campaign.game_name}
                            </h4>
                            <span className="text-[11px] font-mono text-slate-300 block truncate">
                              Hạn đến: {campaign.end_time ? formatRelativeDate(campaign.end_time) : 'Vô thời hạn'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {remaining <= 0 && !isEnded && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              Hết Mã
                            </span>
                          )}
                          {onShareGiveaway && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onShareGiveaway(campaign, e);
                              }}
                              className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-slate-400 hover:text-foreground border border-border/70 transition-all cursor-pointer active:scale-90"
                              title="Chia sẻ sự kiện săn mã này"
                              aria-label="Chia sẻ sự kiện giveaway"
                            >
                              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}

                        </div>
                      </div>

                      {/* Campaign Title */}
                      <h3 className="font-heading font-bold text-base text-foreground mb-2 leading-snug">
                        {(!campaign.title || campaign.title.trim().length <= 2)
                          ? `Code riêng ${campaign.game_name || 'Game'}`
                          : campaign.title}
                      </h3>

                      {/* Live Waiting Room Badge */}
                      {campaign.enable_waiting_room !== false && remaining > 0 && !isEnded && (
                        <div className="mb-2">
                          <LiveWaitingRoomBadge
                            campaignId={campaign.id}
                            minUsers={campaign.waiting_users_min}
                            maxUsers={campaign.waiting_users_max}
                            variant="card"
                          />
                        </div>
                      )}

                      {/* Global Release Countdown Badge if Active */}
                      {isCardGlobalCooling && !isNotStarted && (
                        <div className="mb-2.5">
                          <GlobalReleaseBadge
                            campaign={campaign}
                            onExpire={handleExpireRefresh}
                          />
                        </div>
                      )}

                      {/* Event Countdown Badge if Upcoming */}
                      {isNotStarted && campaign.start_time && (
                        <div className="mb-2.5">
                          <EventCountdownBadge
                            targetDate={campaign.start_time}
                            label="Mở sau:"
                            theme="fire"
                            variant="compact"
                            onExpire={() => {
                              playClaimVictorySound();
                              handleExpireRefresh();
                            }}
                          />
                        </div>
                      )}

                      {/* Multiple Packages Badge if available */}
                      {campaign.packages && campaign.packages.length > 1 && (
                        <div className="mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            🎁 {campaign.packages.length} gói quà tặng tùy chọn
                          </span>
                        </div>
                      )}

                      {/* Rewards Box */}
                      <div className="p-3 rounded-2xl bg-muted/50 border border-border/70 mb-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-light mb-1">
                          <Gift className="w-3.5 h-3.5" />
                          <span>Phần Thưởng:</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium leading-snug font-sans">
                          {campaign.rewards}
                        </p>
                      </div>

                      {/* Campaign Requirement Badges */}
                      <div className="p-2.5 rounded-xl bg-card-hover/80 border border-border/60 mb-3 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                          Điều kiện giật code:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary-light border border-primary/20 font-medium">
                            <User className="w-3 h-3" />
                            <span>
                              {isUnlimitedUser ? 'Không giới hạn mã/tài khoản' : `Tối đa ${rawMaxPerUser || 1} mã/tài khoản`}
                            </span>
                          </span>
                          {Boolean(cooldownMinutes > 0) && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                                isCooldownActive
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>
                                Hồi chiêu {cdBadgeText}{' '}
                                {isCooldownActive ? `(còn ${cooldownWaitText})` : ''}
                              </span>
                            </span>
                          )}
                          {Boolean(campaign.min_account_age_days && campaign.min_account_age_days > 0) && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                                currentUser && !isAgeEligible
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>
                                Tuổi nick ≥ {campaign.min_account_age_days} ngày{' '}
                                {currentUser
                                  ? isAgeEligible
                                    ? '(Đạt)'
                                    : `(${userAgeDays}/${campaign.min_account_age_days}d)`
                                  : ''}
                              </span>
                            </span>
                          )}
                          {Boolean(campaign.global_cooldown_seconds && campaign.global_cooldown_seconds > 0) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                              <Clock className="w-3 h-3 text-purple-400" />
                              <span>Giãn cách {campaign.global_cooldown_seconds >= 60 ? `${Math.round(campaign.global_cooldown_seconds / 60)}p` : `${campaign.global_cooldown_seconds}s`}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress & Claim CTA */}
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      {/* Progress bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-mono">
                          {campaign.show_claimed_count !== false ? (
                            <span>
                              Đã giật:{' '}
                              <strong className="text-amber-400 font-bold">
                                {displayClaimed} mã
                              </strong>
                            </span>
                          ) : (
                            <span></span>
                          )}
                          {(campaign as any).show_remaining_count !== false && (
                            <span>
                              Còn lại: <strong className="text-accent">{displayRemaining}</strong> mã
                            </span>
                          )}
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                            style={{ width: `${percentClaimed}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons on Card */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetailModal(campaign);
                            }}
                            className="py-2.5 px-3 rounded-xl bg-muted/80 hover:bg-muted text-foreground border border-border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:border-primary/40"
                          >
                            <Info className="w-3.5 h-3.5 text-primary-light" />
                            <span>Chi Tiết</span>
                          </button>

                          {!currentUser ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAuth();
                                onShowToast('Cần đăng nhập', 'Vui lòng đăng nhập để tham gia giật mã quà tặng.', 'info');
                              }}
                              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xs shadow-glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Đăng Nhập</span>
                            </button>
                          ) : isNotStarted ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailModal(campaign);
                              }}
                              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Chờ Mở</span>
                            </button>
                          ) : isEnded ? (
                            <button
                              disabled
                              className="py-2.5 px-3 rounded-xl bg-muted/60 text-muted-foreground border border-border text-xs font-semibold flex items-center justify-center gap-1 cursor-not-allowed"
                            >
                              <span>Đã Hết Hạn</span>
                            </button>
                          ) : remaining <= 0 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailModal(campaign);
                              }}
                              className="py-2.5 px-3 rounded-xl bg-muted/80 hover:bg-muted text-foreground border border-border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:border-primary/40"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Chờ Đợt Mới</span>
                            </button>
                          ) : isMaxReached ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const existing = uniqueClaimedList.find((c) => c.campaign_id === campaign.id);
                                if (existing?.code_value) {
                                  setClaimedRewardModal({
                                    campaign,
                                    code: existing.code_value,
                                    isNew: false,
                                    isAdminBypass: isAdmin,
                                  });
                                } else {
                                  handleOpenLimitNotice(campaign);
                                }
                              }}
                              className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Xem Mã</span>
                            </button>
                          ) : isCooldownActive ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLimitNotice(
                                  campaign,
                                  `Bạn đang trong thời gian hồi chiêu (${cdBadgeText}). Vui lòng quay lại sau ${remH > 0 ? `${remH} giờ ${remM} phút` : `${remM} phút`} để giật mã tiếp theo.`
                                );
                              }}
                              className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                              <span>Hồi Chiêu</span>
                            </button>
                          ) : !isAgeEligible ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLimitNotice(
                                  campaign,
                                  `Tài khoản của bạn mới được tạo ${Math.max(0, userAgeDays)} ngày. Sự kiện này yêu cầu tài khoản tối thiểu ${minAccountAgeDays} ngày tuổi mới đủ điều kiện giật code.`
                                );
                              }}
                              className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                              <span>Tuổi Nick</span>
                            </button>
                          ) : isCardGlobalCooling ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailModal(campaign);
                              }}
                              className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Chờ Đợt Mã</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (campaign.packages && campaign.packages.length > 1) {
                                  handleOpenDetailModal(campaign);
                                } else {
                                  handleClaim(campaign);
                                }
                              }}
                              disabled={claimingId === campaign.id}
                              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-accent to-accent-hover text-white font-display font-bold text-xs shadow-glow-accent hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75"
                            >
                              {claimingId === campaign.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {campaign.packages && campaign.packages.length > 1
                                  ? userClaimCount > 0
                                    ? `Chọn Gói (${userClaimCount})`
                                    : 'Chọn Gói Quà'
                                  : userClaimCount > 0
                                  ? isAdmin
                                    ? `Giật Mã (${userClaimCount})`
                                    : `Giật Thêm (${userClaimCount})`
                                  : 'Giật Mã'}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Secondary View Existing Code Link if already claimed but can still claim more */}
                        {userClaimCount > 0 && canClaimMore && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const existing = uniqueClaimedList.find((c) => c.campaign_id === campaign.id);
                              if (existing?.code_value) {
                                setClaimedRewardModal({
                                  campaign,
                                  code: existing.code_value,
                                  isNew: false,
                                  isAdminBypass: isAdmin,
                                });
                              }
                            }}
                            className="w-full py-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Bạn đã có {userClaimCount} mã - Nhấn để xem lại</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Collapsible In-game Redemption Guide Accordion */}
          <div className="rounded-3xl bg-card border border-border/80 overflow-hidden shadow-sm">
            <button
              onClick={() => setIsRedeemGuideOpen(!isRedeemGuideOpen)}
              className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">
                    Hướng Dẫn 3 Bước Kích Hoạt Mã Quà Tặng Ingame
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cách nhập giftcode chuẩn và nhận quà trực tiếp về hòm thư trò chơi
                  </p>
                </div>
              </div>
              {isRedeemGuideOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
            </button>

            {isRedeemGuideOpen && (
              <div className="p-4 sm:p-6 pt-0 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in text-xs">
                <div className="p-4 rounded-2xl bg-muted/50 border border-border/70 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary-light font-bold flex items-center justify-center">
                    1
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Giật & Sao Chép Mã</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Chọn sự kiện bạn muốn tham gia, nhấn <strong>"Giật Mã"</strong>. Hệ thống sẽ cấp ngay một mã giftcode độc quyền, nhấn <strong>"Sao chép"</strong> để lưu vào bộ nhớ tạm.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-muted/50 border border-border/70 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-accent/20 text-accent font-bold flex items-center justify-center">
                    2
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Vào Game & Trung Tâm Đổi Quà</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Mở game của bạn, nhấn vào <strong>Avatar nhân vật</strong> hoặc mục <strong>Cài đặt (Settings)</strong>, tìm phần <strong>"Đổi Quà / Giftcode"</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-muted/50 border border-border/70 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                    3
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Nhận Quà Hòm Thư Ingame</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Dán mã vừa chép và nhấn <strong>Xác nhận</strong>. Quà tặng ingame sẽ được hệ thống gửi tự động về <strong>Hòm Thư</strong> tài khoản của bạn ngay lập tức!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'wheel' ? (
        <LuckyWheelSection
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onShowToast={onShowToast}
          onViewClaimedCodes={() => setActiveTab('my_codes')}
          themeContext="giveaways"
        />
      ) : (
        /* Tab: My Claimed Codes */
        <div className="space-y-4">
          {!currentUser ? (
            <div className="py-16 text-center rounded-3xl bg-card border border-border p-8 space-y-4">
              <Gift className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <h3 className="font-heading font-bold text-lg text-foreground">
                Vui lòng đăng nhập để xem kho mã đã giật
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Đăng nhập hoặc đăng ký tài khoản để lưu trữ và quản lý tất cả giftcode bạn đã săn được.
              </p>
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary cursor-pointer inline-flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập / Đăng Ký Ngay</span>
              </button>
            </div>
          ) : uniqueClaimedList.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-card border border-border p-8">
              <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-heading font-bold text-lg text-foreground mb-1">
                Bạn chưa giật mã code nào
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                Chuyển qua tab "Đang Mở" để tham gia các sự kiện phát giftcode độc quyền miễn phí ngay!
              </p>
              <button
                onClick={() => setActiveTab('campaigns')}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-glow-primary cursor-pointer"
              >
                Khám phá sự kiện ngay
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Batch Actions Toolbar */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <PackageCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    Tổng cộng: <strong className="text-primary-light font-bold">{uniqueClaimedList.length}</strong> giftcode đã lưu trong ví của bạn
                  </span>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    onClick={handleCopyAllCodes}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-muted hover:bg-card text-foreground border border-border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Sao chép toàn bộ mã"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao Chép Tất Cả</span>
                  </button>
                  <button
                    onClick={handleExportTxtFile}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Tải về file text"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải File .TXT</span>
                  </button>
                </div>
              </div>

              {/* Codes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uniqueClaimedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                        <img
                          src={getSafeGiveawayIcon(item)}
                          alt={item.game_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            if (item.game_slug && !target.src.includes(`/game_icons/${item.game_slug}.webp`)) {
                              target.src = `/game_icons/${item.game_slug}.webp`;
                            } else if (item.game_slug && !target.src.includes(`/game_icons/${item.game_slug}.jpg`)) {
                              target.src = `/game_icons/${item.game_slug}.jpg`;
                            }
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-heading font-bold text-sm text-foreground truncate">
                          {item.game_name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          🎁 {item.rewards}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-primary-light font-mono">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-accent" />
                          <span>
                            Nhận lúc: <strong className="text-foreground">{formatFullDateTime(item.claimed_at)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                      <div className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-muted font-mono font-bold text-primary-light text-sm border border-border text-center select-all">
                        {item.code_value}
                      </div>
                      <button
                        onClick={() => handleCopy(item.code_value)}
                        className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        {copiedCode === item.code_value ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CYBER LOADER OVERLAY KHI GIẬT CODE */}
      {claimingId && typeof document !== 'undefined' && createPortal(
        <CyberLoader
          isOverlay={true}
          title="ĐANG GIẬT CODE..."
          subText="Hệ thống đang kết nối kho giftcode Cloudflare D1 để phân phối mã quà tặng..."
        />,
        document.body
      )}

      {/* CLAIM REWARD MODAL POPUP (CYBER MYSTERY BOX REVEAL) */}
      {claimedRewardModal && typeof document !== 'undefined' && createPortal(
        (() => {
          const targetCampaign = claimedRewardModal.campaign;
          const allMyCampaignCodes = uniqueClaimedList.filter((c) => c.campaign_id === targetCampaign.id);
          const poolCount = Array.isArray(targetCampaign.codes_pool) && targetCampaign.codes_pool.length > 0 ? targetCampaign.codes_pool.length : (typeof targetCampaign.remaining_codes === 'number' ? Math.max(0, targetCampaign.remaining_codes) : 0);
          const remaining = marketingService.getDisplayStock(targetCampaign.id, poolCount);
          const rawMaxPerUser = Number(targetCampaign.max_per_user);
          const isUnlimitedUser = rawMaxPerUser === 0 || rawMaxPerUser >= 999999;
          const effectiveMaxPerUser = isUnlimitedUser ? 999999 : (rawMaxPerUser > 0 ? rawMaxPerUser : 1);
          const canClaimAnother = (isAdmin || isUnlimitedUser || allMyCampaignCodes.length < effectiveMaxPerUser) && remaining > 0;

          return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
              <div
                className="relative w-full max-w-md bg-card border border-border/90 rounded-3xl overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 animate-scale-in max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setClaimedRewardModal(null)}
                  className="absolute top-4 right-4 p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0 z-10"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Unboxing Mystery Box Animation / Reveal */}
                {isUnboxing ? (
                  <div className="py-10 text-center space-y-4 animate-pulse">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-accent to-purple-500 border border-accent/60 flex items-center justify-center mx-auto shadow-glow-accent animate-bounce">
                      <Box className="w-12 h-12 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-heading font-black text-xl text-foreground">
                        Đang Mở Rương Quà Tặng...
                      </h3>
                      <p className="text-xs text-accent font-mono animate-pulse">
                        ✦ Bóc tách giftcode từ máy chủ ✦
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center space-y-2 pt-2">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                        claimedRewardModal.isNew !== false
                          ? 'bg-accent/20 text-accent border border-accent/40 shadow-glow-accent'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}>
                        {claimedRewardModal.isNew !== false ? (
                          <Sparkles className="w-8 h-8 text-accent animate-spin-slow" />
                        ) : (
                          <History className="w-8 h-8 text-amber-400" />
                        )}
                      </div>

                      <div>
                        <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1 border ${
                          claimedRewardModal.isNew !== false
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          {claimedRewardModal.isNew !== false ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Giật Code Mới Thành Công</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              <span>Mã Quà Tặng Đã Nhận Trước Đó</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-heading font-extrabold text-xl text-foreground">
                          {claimedRewardModal.campaign.game_name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {claimedRewardModal.campaign.title}
                        </p>
                      </div>

                      {/* Prominent Warning if code is NOT new */}
                      {claimedRewardModal.isNew === false && (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 text-left mx-1">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <strong className="text-amber-300 font-bold block text-[12px]">
                              ⚠️ BẠN ĐÃ NHẬN MÃ NÀY TRƯỚC ĐÓ (MÃ CŨ ĐÃ LƯU)
                            </strong>
                            <p className="text-amber-200/90 leading-relaxed text-[11px]">
                              Đây là giftcode đã được lưu trong lịch sử tài khoản của bạn. Mỗi mã chỉ dùng được 1 lần trong game. Nếu bạn đã kích hoạt trước đó, mã sẽ không thể nhập lại.
                            </p>
                          </div>
                        </div>
                      )}

                      {isAdmin && (
                        <div className="text-[11px] text-purple-400 font-semibold bg-purple-500/10 border border-purple-500/30 rounded-xl px-2.5 py-1 inline-flex items-center gap-1 mx-auto">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>[Admin Test Mode] Mã được trích xuất trực tiếp từ kho</span>
                        </div>
                      )}
                    </div>

                    {/* Reward Info */}
                    <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/70 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden border border-border shrink-0">
                        <img
                          src={
                            claimedRewardModal.campaign.game_icon_url ||
                            `/game_icons/${claimedRewardModal.campaign.game_slug}.webp`
                          }
                          alt={claimedRewardModal.campaign.game_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                          Phần thưởng nhận được:
                        </span>
                        <p className="text-xs text-accent font-semibold truncate mt-0.5">
                          🎁 {claimedRewardModal.campaign.rewards}
                        </p>
                      </div>
                    </div>

                    {/* Primary Code Box */}
                    <div className="p-4 rounded-2xl bg-muted/70 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-bold">Mã Giftcode Ingame:</span>
                        {claimedRewardModal.isNew !== false ? (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Mã Mới ✦ Sẵn Sàng Kích Hoạt
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            Mã Cũ ✦ Đã Lưu Trong Lịch Sử
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-card p-3 rounded-xl border border-border shadow-inner">
                        <span className="font-mono font-black text-lg text-primary-light truncate select-all">
                          {claimedRewardModal.code}
                        </span>
                        <button
                          onClick={() => handleCopy(claimedRewardModal.code)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          {copiedCode === claimedRewardModal.code ? (
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
                    </div>

                    {/* All Previous Codes for this Campaign (if > 1) */}
                    {allMyCampaignCodes.length > 1 && (
                      <div className="p-3 rounded-2xl bg-card-hover/90 border border-border/80 space-y-2 max-h-36 overflow-y-auto">
                        <span className="text-[11px] font-bold text-foreground block">
                          Tất cả các mã bạn đã giật tại sự kiện này ({allMyCampaignCodes.length} mã):
                        </span>
                        <div className="space-y-1.5">
                          {allMyCampaignCodes.map((c) => (
                            <div
                              key={c.id}
                              className="p-2 rounded-xl bg-card border border-border/60 flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-mono font-bold text-primary-light truncate">{c.code_value}</span>
                              <button
                                onClick={() => handleCopy(c.code_value)}
                                className="px-2 py-1 rounded bg-muted hover:bg-card text-muted-foreground hover:text-foreground text-[10px] font-bold cursor-pointer"
                              >
                                {copiedCode === c.code_value ? 'Đã chép' : 'Chép'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modal Action Buttons */}
                    <div className="space-y-2 pt-1">
                      {/* 1. Primary Action: Copy code & close */}
                      <button
                        onClick={() => {
                          handleCopy(claimedRewardModal.code);
                          setClaimedRewardModal(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white font-bold text-xs shadow-glow-primary transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao Chép Mã & Đóng</span>
                      </button>

                      {/* 2. Secondary: Claim another code if quota permits */}
                      {canClaimAnother && (
                        <button
                          onClick={() => {
                            const camp = claimedRewardModal.campaign;
                            setClaimedRewardModal(null);
                            handleClaim(camp);
                          }}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent via-rose-500 to-amber-500 hover:opacity-95 text-white font-display font-bold text-xs tracking-wide shadow-glow-accent transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {isAdmin ? '👑 [Admin] Giật Thêm 1 Mã Tiếp' : '⚡ Giật Thêm 1 Mã Nữa'}
                          </span>
                        </button>
                      )}

                      {/* 3. Bottom Row: Share & My Codes in 2-column compact grid */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        {onShareGiveaway ? (
                          <button
                            onClick={(e) => {
                              const camp = claimedRewardModal.campaign;
                              setClaimedRewardModal(null);
                              onShareGiveaway(camp, e);
                            }}
                            className="py-2 px-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 truncate"
                          >
                            <Share2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">Chia Sẻ</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        <button
                          onClick={() => {
                            setClaimedRewardModal(null);
                            setActiveTab('my_codes');
                          }}
                          className="py-2 px-2.5 rounded-xl bg-muted hover:bg-card text-muted-foreground hover:text-foreground border border-border text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 truncate text-center"
                        >
                          <History className="w-3 h-3 shrink-0" />
                          <span className="truncate">Kho Mã ({uniqueClaimedList.length})</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* LIMIT NOTICE MODAL (CẢNH BÁO ĐẠT GIỚI HẠN / ĐIỀU KIỆN) */}
      {limitNoticeModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setLimitNoticeModal(null)}
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-card border border-border/90 rounded-3xl p-5 sm:p-6 shadow-2xl animate-scale-in space-y-4"
          >
            {/* Header with Alert icon */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-foreground leading-snug">
                    Thông Báo Giới Hạn Quà Tặng
                  </h3>
                  <span className="text-xs text-amber-400 font-medium block">
                    Đã đạt giới hạn hoặc chưa đủ điều kiện nhận
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLimitNoticeModal(null)}
                className="p-1.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Name */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                <img
                  src={getSafeGiveawayIcon(limitNoticeModal.campaign)}
                  alt={limitNoticeModal.campaign.game_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    const slug = limitNoticeModal.campaign?.game_slug;
                    if (slug && !target.src.includes(`/game_icons/${slug}.webp`)) {
                      target.src = `/game_icons/${slug}.webp`;
                    } else if (slug && !target.src.includes(`/game_icons/${slug}.jpg`)) {
                      target.src = `/game_icons/${slug}.jpg`;
                    }
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-primary-light block">
                  {limitNoticeModal.campaign.game_name}
                </span>
                <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground truncate">
                  {limitNoticeModal.campaign.title}
                </h4>
              </div>
            </div>

            {/* Explanation Message */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed font-sans">
              {limitNoticeModal.message}
            </div>

            {/* Previously Claimed Code for this campaign (if exists) */}
            {limitNoticeModal.existingCodes.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 block">
                  Mã quà tặng bạn đã nhận trước đó ({limitNoticeModal.existingCodes.length} mã):
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {limitNoticeModal.existingCodes.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-card border border-emerald-500/20 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-xs text-foreground truncate block select-all">
                          {c.code_value}
                        </span>
                        {c.claimed_at && (
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Nhận lúc: {formatFullDateTime(c.claimed_at)}</span>
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopy(c.code_value)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                      >
                        {copiedCode === c.code_value ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>Sao chép</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => {
                  setLimitNoticeModal(null);
                  setActiveTab('my_codes');
                }}
                className="py-3 px-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xs shadow-glow-primary hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <History className="w-4 h-4" />
                <span>Xem Kho Mã Đã Giật</span>
              </button>
              <button
                onClick={() => setLimitNoticeModal(null)}
                className="py-3 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs border border-border transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CAMPAIGN DETAIL & CLAIM MODAL */}
      {detailModalCampaign && typeof document !== 'undefined' && createPortal(
        <GiveawayDetailModal
          campaign={
            groupedCampaigns.find(
              (g) => g.id === detailModalCampaign.id || (g.packages && g.packages.some((p) => p.id === detailModalCampaign.id))
            ) || detailModalCampaign
          }
          currentUser={currentUser}
          isAdmin={isAdmin}
          uniqueClaimedList={uniqueClaimedList}
          claimingId={claimingId}
          selectedRewardPackageId={selectedRewardPackageId}
          setSelectedRewardPackageId={setSelectedRewardPackageId}
          onClose={handleCloseDetailModal}
          onOpenAuth={onOpenAuth}
          onShowToast={onShowToast}
          onSelectGameSlug={onSelectGameSlug}
          handleClaim={handleClaim}
          handleOpenLimitNotice={handleOpenLimitNotice}
          setClaimedRewardModal={setClaimedRewardModal}
          handleExpireRefresh={handleExpireRefresh}
          onShareGiveaway={onShareGiveaway}
        />,
        document.body
      )}
    </div>
  );
};
