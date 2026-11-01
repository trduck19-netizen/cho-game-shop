import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Gift,
  Users,
  Calendar,
  Trophy,
  Dices,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Coins,
  ChevronRight,
  Flame,
  Award,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { growthService, DEFAULT_WHEEL_SLICES } from '../services/growthService';
import { formatCore, formatVnd } from '../utils/textUtils';
import type { UserProfile } from '../types/game';
import type { WheelSlice } from '../types/growth';

interface GrowthCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  initialTab?: 'wheel' | 'welcome' | 'referral' | 'checkin' | 'leaderboard';
}

export const GrowthCenterModal: React.FC<GrowthCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onOpenWallet,
  onShowToast,
  initialTab = 'wheel',
}) => {
  const [activeTab, setActiveTab] = useState<'wheel' | 'welcome' | 'referral' | 'checkin' | 'leaderboard'>(initialTab);
  const [config, setConfig] = useState(() => growthService.getConfig());
  const [growthData, setGrowthData] = useState(() =>
    growthService.getUserGrowthData(currentUser?.id || 'guest_user')
  );

  // Wheel animation states
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wonSlice, setWonSlice] = useState<WheelSlice | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  // Referral states
  const [isCopiedRefLink, setIsCopiedRefLink] = useState(false);
  const [isCopiedRefCode, setIsCopiedRefCode] = useState(false);
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  // Canvas ref for drawing the wheel
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state on open or user change
  useEffect(() => {
    if (isOpen) {
      const cfg = growthService.getConfig();
      setConfig(cfg);
      if (currentUser?.id) {
        setGrowthData(growthService.getUserGrowthData(currentUser.id));
      }
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const handleConfigUpdate = (e?: any) => {
      const cfg = e?.detail || growthService.getConfig();
      if (cfg) setConfig(cfg);
    };
    window.addEventListener('wcg_growth_config_updated', handleConfigUpdate);
    return () => {
      window.removeEventListener('wcg_growth_config_updated', handleConfigUpdate);
    };
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Draw the lucky wheel on Canvas
  useEffect(() => {
    if (!canvasRef.current || activeTab !== 'wheel') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const slices = config.slices || DEFAULT_WHEEL_SLICES;
    const numSlices = slices.length;
    const arcSize = (2 * Math.PI) / numSlices;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    slices.forEach((slice, i) => {
      const angle = i * arcSize;

      // Draw Slice wedge
      ctx.beginPath();
      ctx.fillStyle = slice.color;
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius - 6, angle, angle + arcSize);
      ctx.lineTo(radius, radius);
      ctx.fill();

      // Border line
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff33';
      ctx.stroke();

      // Draw Text
      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = slice.textColor || '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(slice.label, radius - 24, 4);
      ctx.restore();
    });

    // Draw Outer Rim
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 3, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#F59E0B';
    ctx.stroke();

    // Draw Decorative Bulbs
    for (let i = 0; i < 16; i++) {
      const bulbAngle = (i * 2 * Math.PI) / 16;
      const bx = radius + (radius - 4) * Math.cos(bulbAngle);
      const by = radius + (radius - 4) * Math.sin(bulbAngle);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#FEF08A' : '#FFFFFF';
      ctx.fill();
    }
  }, [config.slices, activeTab]);

  if (!isOpen || !config.isEnabled || typeof document === 'undefined') return null;

  const currentUserId = currentUser?.id || 'guest_user';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop';
  const referralCode = growthData.referralCode;
  const referralLink = `${siteUrl}?ref=${referralCode}`;

  // --- ACTIONS ---
  const handleSpinClick = (useCore: boolean = false) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (isSpinning) return;

    const result = growthService.spinWheel(currentUser.id, useCore);
    if (!result.success) {
      onShowToast('Chưa thể quay', result.message, 'info');
      return;
    }

    setIsSpinning(true);
    setWonSlice(result.slice);

    // Calculate rotation angle to land cleanly on sliceIndex
    const slices = config.slices || DEFAULT_WHEEL_SLICES;
    const numSlices = slices.length;
    const sliceAngle = 360 / numSlices;
    // Pointer is at the top (270 degrees in canvas math, or 0 top with arrow)
    const targetSliceAngle = result.sliceIndex * sliceAngle + sliceAngle / 2;
    const randomRounds = 360 * 5; // 5 full spins
    const targetFinalRotation = wheelRotation + randomRounds + (360 - targetSliceAngle);

    setWheelRotation(targetFinalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setGrowthData(growthService.getUserGrowthData(currentUser.id));
      setIsVictoryModalOpen(true);

      // Trigger party confetti
      confetti({
        particleCount: 70,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'],
      });

      onShowToast('Chúc mừng trúng thưởng!', result.message, 'success');
    }, 4500);
  };

  const handleClaimWelcome = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const res = growthService.claimWelcomeBonus(currentUser.id);
    if (res.success) {
      setGrowthData(growthService.getUserGrowthData(currentUser.id));
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      onShowToast('Nhận quà tân thủ thành công!', res.message, 'success');
    } else {
      onShowToast('Thông báo', res.message, 'info');
    }
  };

  const handleDailyCheckIn = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const res = growthService.dailyCheckIn(currentUser.id);
    if (res.success) {
      setGrowthData(growthService.getUserGrowthData(currentUser.id));
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      onShowToast('Điểm danh thành công!', res.message, 'success');
    } else {
      onShowToast('Thông báo', res.message, 'info');
    }
  };

  const handleClaimMilestone = (msId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const res = growthService.claimMilestone(currentUser.id, msId);
    if (res.success) {
      setGrowthData(growthService.getUserGrowthData(currentUser.id));
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      onShowToast('Mở khóa mốc thành công!', res.message, 'success');
    } else {
      onShowToast('Thông báo', res.message, 'info');
    }
  };

  const handleApplyReferralCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!inputReferralCode.trim()) return;

    setIsSubmittingCode(true);
    const res = growthService.recordReferral(inputReferralCode.trim(), currentUser.id);
    setIsSubmittingCode(false);

    if (res.success) {
      setGrowthData(growthService.getUserGrowthData(currentUser.id));
      setInputReferralCode('');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      onShowToast('Nhập mã giới thiệu thành công!', res.message, 'success');
    } else {
      onShowToast('Thất bại', res.message, 'error');
    }
  };

  const copyRefLink = () => {
    navigator.clipboard.writeText(referralLink);
    setIsCopiedRefLink(true);
    onShowToast('Đã sao chép link giới thiệu!', referralLink, 'success');
    setTimeout(() => setIsCopiedRefLink(false), 2500);
  };

  const copyRefCode = () => {
    navigator.clipboard.writeText(referralCode);
    setIsCopiedRefCode(true);
    onShowToast('Đã sao chép mã mời!', referralCode, 'success');
    setTimeout(() => setIsCopiedRefCode(false), 2500);
  };

  const shareSocial = (platform: 'fb' | 'tg' | 'zalo') => {
    const text = encodeURIComponent(
      `Vào săn Giftcode Game và quay vòng quay nhận quà miễn phí tại Shop Code Game! Đăng ký qua link nhận ngay +10,000 Core:`
    );
    const url = encodeURIComponent(referralLink);

    if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    } else if (platform === 'tg') {
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    } else {
      copyRefLink();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-card border-t sm:border border-border/90 rounded-t-[32px] sm:rounded-3xl p-4 sm:p-6 shadow-2xl animate-scale-in max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto touch-pan-y pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1.5 bg-slate-600/50 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-primary/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-glow-primary">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-base sm:text-lg text-foreground truncate">
                  Trung Tâm Quà Tặng & Lan Truyền
                </h2>
                <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Free 100%
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                Quay vòng quay may mắn, mời bạn nhận hoa hồng & tích lũy Core miễn phí
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 mt-3 bg-muted/50 rounded-2xl border border-border/60 overflow-x-auto scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('wheel')}
            className={`flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'wheel'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Vòng Quay</span>
          </button>

          <button
            onClick={() => setActiveTab('welcome')}
            className={`flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'welcome'
                ? 'bg-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Quà Tân Thủ</span>
          </button>

          <button
            onClick={() => setActiveTab('referral')}
            className={`flex-1 min-w-[105px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'referral'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mời Bạn & Hoa Hồng</span>
          </button>

          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'checkin'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Điểm Danh</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 min-w-[85px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Đua Top</span>
          </button>
        </div>

        {/* Tab 1: Vòng Quay May Mắn (Lucky Wheel) */}
        {activeTab === 'wheel' && (
          <div className="mt-4 space-y-4 animate-fade-in">
            <div className="flex flex-col items-center justify-center">
              {/* Lucky Wheel Canvas Container */}
              <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] my-2 select-none">
                {/* Pointer Arrow at Top Center */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(245,158,11,0.8)] filter" />

                {/* Rotating Wheel Canvas */}
                <div
                  className="w-full h-full rounded-full shadow-2xl border-4 border-amber-500/80 overflow-hidden transition-transform ease-out"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transitionDuration: isSpinning ? '4.5s' : '0s',
                    transitionTimingFunction: 'cubic-bezier(0.12, 0.9, 0.2, 1)',
                  }}
                >
                  <canvas ref={canvasRef} width={320} height={320} className="w-full h-full rounded-full" />
                </div>

                {/* Center Spin Button Hub */}
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={() => handleSpinClick(false)}
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-300 shadow-2xl flex flex-col items-center justify-center font-display font-extrabold text-xs sm:text-sm text-white uppercase transition-transform active:scale-90 cursor-pointer ${
                    isSpinning
                      ? 'bg-slate-700 opacity-80 cursor-not-allowed'
                      : 'bg-gradient-to-tr from-amber-600 via-rose-500 to-amber-500 hover:scale-105 shadow-glow-primary'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mb-0.5 text-amber-200 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>{isSpinning ? '...' : 'QUAY'}</span>
                </button>
              </div>

              {/* Status & Spin Quota Indicator */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lượt quay miễn phí còn: {growthData.freeSpinsAvailable}</span>
                </div>

                {config.costPerSpinCore > 0 && (
                  <button
                    type="button"
                    disabled={isSpinning}
                    onClick={() => handleSpinClick(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 font-bold transition-all cursor-pointer"
                    title={`Dùng ${formatCore(config.costPerSpinCore)} để quay thêm`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mua thêm lượt ({formatCore(config.costPerSpinCore)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick missions to earn extra spins */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Nhiệm vụ nhận thêm lượt quay may mắn:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div
                  onClick={() => setActiveTab('referral')}
                  className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <span className="text-muted-foreground group-hover:text-foreground">Mời 1 bạn bè mới</span>
                  <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                    +{config.referrerBonusSpins} lượt
                  </span>
                </div>
                <div
                  onClick={() => setActiveTab('checkin')}
                  className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <span className="text-muted-foreground group-hover:text-foreground">Điểm danh ngày 3 & ngày 7</span>
                  <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                    +1 đến +2 lượt
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Spin History */}
            {growthData.spinHistory.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="text-muted-foreground font-semibold">Lịch sử trúng thưởng gần đây:</span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {growthData.spinHistory.slice(0, 6).map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-1 rounded-lg bg-muted text-[11px] text-foreground font-medium border border-border/60"
                    >
                      🎉 {item.sliceLabel}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Quà Tân Thủ & Ưu Đãi Nạp Đầu (Welcome & Deposit Bonus) */}
        {activeTab === 'welcome' && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {/* Welcome Package Card */}
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-card to-card border border-amber-500/30 overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-sm">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Gói Quà Chào Mừng Tân Thủ</span>
                  </div>
                  <h3 className="text-lg font-heading font-extrabold text-foreground">
                    Tặng Ngay {formatCore(config.welcomeBonusCore)} & {config.welcomeBonusSpins} Lượt Quay
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Dành tặng độc quyền cho tài khoản mới để trải nghiệm rút code, quay thưởng và mua sắm không giới hạn!
                  </p>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  {growthData.claimedWelcomeBonus ? (
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-xs justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã Nhận Thành Công</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClaimWelcome}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold text-xs shadow-glow-primary active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Nhận Gói Tân Thủ Ngay</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* First Deposit Bonus Card */}
            {config.firstDepositBonusEnabled && (
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-card to-card border border-indigo-500/30 overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-sm">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      <Percent className="w-3.5 h-3.5" />
                      <span>Ưu Đãi Nạp Đầu (First Deposit)</span>
                    </div>
                    <h3 className="text-lg font-heading font-extrabold text-foreground">
                      Thưởng Thêm +{config.firstDepositBonusPercent}% Giá Trị Nạp
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Nạp tiền qua SePay / MBBank lần đầu tiên nhận thêm +{config.firstDepositBonusPercent}% vào số dư ví và mở khóa code VIP:
                      <span className="font-mono font-bold text-indigo-400 ml-1">
                        {config.firstDepositVipCode || 'WCG-VIP20'}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWallet();
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Coins className="w-4 h-4 text-amber-300" />
                    <span>Nạp Core Ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Mời Bạn & Hoa Hồng (Referral & Milestones) */}
        {activeTab === 'referral' && (
          <div className="mt-4 space-y-4 animate-fade-in text-xs">
            {/* Referral Stats Banner */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-muted/50 border border-border/80 text-center space-y-0.5">
                <span className="text-[10px] text-muted-foreground">Bạn bè đã mời</span>
                <p className="text-lg font-extrabold font-mono text-emerald-400">{growthData.totalInvitedCount}</p>
                <span className="text-[9px] text-slate-400">thành viên</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/50 border border-border/80 text-center space-y-0.5">
                <span className="text-[10px] text-muted-foreground">Hoa hồng tích lũy</span>
                <p className="text-lg font-extrabold font-mono text-amber-400">
                  {formatCore(growthData.totalCommissionEarned)}
                </p>
                <span className="text-[9px] text-slate-400">đã cộng vào ví</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/50 border border-border/80 text-center space-y-0.5">
                <span className="text-[10px] text-muted-foreground">Hoa hồng nạp</span>
                <p className="text-lg font-extrabold font-mono text-indigo-400">
                  {config.referralCommissionPercent}%
                </p>
                <span className="text-[9px] text-slate-400">trọn đời vĩnh viễn</span>
              </div>
            </div>

            {/* Unique Link & Code Copy */}
            <div className="p-4 rounded-2xl bg-card border border-border/90 space-y-3">
              <div className="space-y-1">
                <span className="font-bold text-foreground">Link giới thiệu cá nhân của bạn:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="flex-1 px-3 py-2 rounded-xl bg-muted/80 border border-border/80 font-mono text-xs text-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyRefLink}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    {isCopiedRefLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedRefLink ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              {/* Mã mời & Chia sẻ mạng xã hội */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Mã mời của bạn:</span>
                  <span className="font-mono font-extrabold text-sm text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    {referralCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyRefCode}
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Chép mã mời"
                  >
                    {isCopiedRefCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] text-muted-foreground">Chia sẻ:</span>
                  <button
                    type="button"
                    onClick={() => shareSocial('fb')}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all cursor-pointer"
                  >
                    Facebook
                  </button>
                  <button
                    type="button"
                    onClick={() => shareSocial('tg')}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-[11px] transition-all cursor-pointer"
                  >
                    Telegram
                  </button>
                </div>
              </div>
            </div>

            {/* Milestone Unlocking Roadmap */}
            <div className="space-y-2">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Mở khóa quà tặng theo mốc mời bạn:
              </span>

              <div className="space-y-2">
                {config.milestones.map((ms) => {
                  const isClaimed = growthData.claimedMilestoneIds.includes(ms.id);
                  const isUnlocked = growthData.totalInvitedCount >= ms.requiredInvites;

                  return (
                    <div
                      key={ms.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isClaimed
                          ? 'bg-muted/40 border-border/40 opacity-70'
                          : isUnlocked
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-card border-border/70'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs">{ms.title}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground">
                            {ms.requiredInvites} bạn
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{ms.description}</p>
                      </div>

                      <div className="shrink-0">
                        {isClaimed ? (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã nhận
                          </span>
                        ) : isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleClaimMilestone(ms.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                          >
                            Nhận Thưởng
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Còn thiếu {ms.requiredInvites - growthData.totalInvitedCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input Form: Nhập mã người giới thiệu */}
            {!growthData.referredBy && (
              <form
                onSubmit={handleApplyReferralCode}
                className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2"
              >
                <span className="font-bold text-foreground">Bạn có mã giới thiệu từ bạn bè?</span>
                <p className="text-[11px] text-muted-foreground">
                  Nhập mã để nhận ngay quà chào mừng +{formatCore(config.refereeBonusCore)} vào số dư ví của bạn!
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={inputReferralCode}
                    onChange={(e) => setInputReferralCode(e.target.value)}
                    placeholder="VD: WCG99, ANNGUYEN..."
                    className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground uppercase font-mono focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingCode}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-all cursor-pointer shrink-0"
                  >
                    {isSubmittingCode ? 'Đang kiểm tra...' : 'Áp Dụng Mã'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 4: Điểm Danh 7 Ngày (Daily Check-in Streak) */}
        {activeTab === 'checkin' && (
          <div className="mt-4 space-y-4 animate-fade-in text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/30">
              <div className="space-y-0.5">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-500 animate-bounce" />
                  Chuỗi điểm danh liên tục:
                </span>
                <p className="text-xs text-muted-foreground">
                  Đăng nhập mỗi ngày để nhận quà lũy tiến, hoàn thành 7 ngày nhận rương độc đắc!
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono font-extrabold text-2xl text-indigo-400">
                  {growthData.checkInStreak}
                </span>
                <span className="text-[10px] text-slate-400 block">/ 7 ngày</span>
              </div>
            </div>

            {/* 7-Day Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {config.dailyRewards.map((reward) => {
                const isPassed = growthData.checkInStreak >= reward.day;
                const isCurrent = growthData.checkInStreak + 1 === reward.day;

                return (
                  <div
                    key={reward.day}
                    className={`p-3 rounded-2xl border transition-all text-center flex flex-col justify-between relative ${
                      isPassed
                        ? 'bg-muted/40 border-emerald-500/40 text-emerald-400'
                        : isCurrent
                        ? 'bg-gradient-to-b from-indigo-500/20 to-card border-indigo-500 shadow-lg text-foreground'
                        : 'bg-card border-border/80 text-muted-foreground'
                    }`}
                  >
                    {reward.highlight && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950 shadow">
                        JACKPOT
                      </span>
                    )}

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold block">Ngày {reward.day}</span>
                      <p className="font-mono font-extrabold text-xs text-amber-400">
                        +{formatCore(reward.core)}
                      </p>
                      {reward.spins > 0 && (
                        <span className="text-[10px] font-bold text-rose-400 block">
                          +{reward.spins} Lượt Quay
                        </span>
                      )}
                    </div>

                    <div className="mt-2 pt-1 border-t border-border/40">
                      {isPassed ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Đã nhận
                        </span>
                      ) : isCurrent ? (
                        <span className="text-[10px] font-bold text-indigo-400">Hôm nay</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Chưa mở</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Check-in CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDailyCheckIn}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Điểm Danh Ngay Hôm Nay</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Bảng Xếp Hạng Đua Top (Leaderboard Contests) */}
        {activeTab === 'leaderboard' && (
          <div className="mt-4 space-y-4 animate-fade-in text-xs">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-rose-500/15 border border-amber-500/30 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Trophy className="w-3.5 h-3.5" />
                <span>{config.leaderboardTitle || 'Đua Top Mời Bạn Nhận Quà Khủng'}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {config.leaderboardSubtitle || 'Top 3 thành viên mời nhiều bạn nhất tháng nhận phần thưởng hàng trăm ngàn Core!'}
              </p>
            </div>

            {/* Top 3 Podiums */}
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              {config.leaderboardPrizes.map((pz) => (
                <div
                  key={pz.rank}
                  className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    pz.rank === 1
                      ? 'bg-gradient-to-b from-amber-500/20 to-card border-amber-500 shadow-md order-2 sm:order-2 -mt-2'
                      : pz.rank === 2
                      ? 'bg-gradient-to-b from-slate-400/15 to-card border-slate-400 order-1 sm:order-1'
                      : 'bg-gradient-to-b from-amber-700/15 to-card border-amber-700 order-3 sm:order-3'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xl block">
                      {pz.rank === 1 ? '🥇' : pz.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <span className="font-extrabold text-foreground block text-xs">{pz.title}</span>
                    <p className="text-[10px] text-muted-foreground">{pz.prize}</p>
                  </div>
                  <span className="font-mono font-extrabold text-xs text-amber-400 mt-2 block">
                    +{formatCore(pz.coreReward)}
                  </span>
                </div>
              ))}
            </div>

            {/* Leaderboard Table */}
            <div className="space-y-1.5">
              <span className="font-bold text-foreground">Top Đại Sứ Lan Truyền:</span>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {growthService.getLeaderboard(currentUser?.id).map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      entry.isCurrentUser
                        ? 'bg-primary/15 border-primary font-bold'
                        : 'bg-card border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono font-bold w-5 text-center text-muted-foreground">
                        #{entry.rank}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-muted overflow-hidden shrink-0">
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-4 h-4 m-1.5 text-muted-foreground" />
                        )}
                      </div>
                      <span className="truncate text-foreground font-medium">{entry.displayName}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-emerald-400 block">
                        {entry.invitedCount} bạn
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        +{formatCore(entry.commissionEarned)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Victory Prize Modal */}
      {isVictoryModalOpen && wonSlice && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsVictoryModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-card border-2 border-amber-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-glow-primary">
              <Sparkles className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading font-extrabold text-xl text-foreground">
                Chúc Mừng Bạn Trúng Thưởng!
              </h3>
              <p className="text-xs text-muted-foreground">Vòng quay may mắn vừa mang lại cho bạn phần thưởng:</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-1">
              <p className="font-display font-extrabold text-lg text-amber-300">{wonSlice.label}</p>
              <p className="text-xs text-muted-foreground">{wonSlice.sublabel || 'Đã cộng vào tài khoản'}</p>
            </div>

            <button
              type="button"
              onClick={() => setIsVictoryModalOpen(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-sm shadow-md cursor-pointer hover:opacity-90 active:scale-95 transition-all"
            >
              Tuyệt Vời! Tiếp Tục
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
