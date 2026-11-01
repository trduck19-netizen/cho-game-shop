import React, { useState, useEffect, useRef } from 'react';
import {
  Dices,
  Sparkles,
  Gift,
  Coins,
  Copy,
  Check,
  RotateCw,
  Wallet,
  Clock,
  Trophy,
  AlertCircle,
  HelpCircle,
  Flame,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { growthService, DEFAULT_WHEEL_SLICES } from '../services/growthService';
import type { WheelSlice, GrowthConfig, UserGrowthData } from '../types/growth';
import type { UserProfile } from '../types/game';
import { formatCore } from '../utils/textUtils';

interface LuckyWheelSectionProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenWallet?: () => void;
  onViewClaimedCodes?: () => void;
  title?: string;
  subtitle?: string;
  themeContext?: 'giveaway' | 'utilities';
}

export const LuckyWheelSection: React.FC<LuckyWheelSectionProps> = ({
  onShowToast,
  currentUser,
  onOpenAuth,
  onOpenWallet,
  onViewClaimedCodes,
  title,
  subtitle,
  themeContext = 'giveaway',
}) => {
  const [config, setConfig] = useState<GrowthConfig>(() => growthService.getConfig());
  const [growthData, setGrowthData] = useState<UserGrowthData>(() =>
    growthService.getUserGrowthData(currentUser?.id || 'guest_user')
  );

  // Wheel animation states
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wonSlice, setWonSlice] = useState<WheelSlice | null>(null);
  const [awardedCode, setAwardedCode] = useState<string | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'prizes' | 'history'>('prizes');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync user growth data when user changes
  useEffect(() => {
    if (currentUser?.id) {
      setGrowthData(growthService.getUserGrowthData(currentUser.id));
    }
  }, [currentUser]);

  // Sync with real-time config updates
  useEffect(() => {
    const handleConfigUpdate = (e?: any) => {
      const cfg = e?.detail || growthService.getConfig();
      if (cfg) setConfig(cfg);
    };
    window.addEventListener('wcg_growth_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('wcg_growth_config_updated', handleConfigUpdate);
  }, []);

  // Draw the Lucky Wheel on Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const slices = config.slices && config.slices.length === 8 ? config.slices : DEFAULT_WHEEL_SLICES;
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();

      // Draw Text
      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = slice.textColor || '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
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
  }, [config.slices]);

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
    setAwardedCode(result.awardedCode || null);

    // Calculate rotation angle to land cleanly on sliceIndex
    const slices = config.slices && config.slices.length === 8 ? config.slices : DEFAULT_WHEEL_SLICES;
    const numSlices = slices.length;
    const sliceAngle = 360 / numSlices;
    const targetSliceAngle = result.sliceIndex * sliceAngle + sliceAngle / 2;
    const randomRounds = 360 * 5; // 5 full spins
    const targetFinalRotation = wheelRotation + randomRounds + (360 - targetSliceAngle);

    setWheelRotation(targetFinalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setGrowthData(growthService.getUserGrowthData(currentUser.id));
      setIsVictoryModalOpen(true);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 70,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'],
        });
      } catch {}

      onShowToast('Chúc mừng trúng thưởng!', result.message, 'success');
    }, 4500);
  };

  const handleCopyAwardedCode = () => {
    if (!awardedCode) return;
    navigator.clipboard.writeText(awardedCode);
    setIsCopiedCode(true);
    onShowToast('Đã sao chép mã!', awardedCode, 'success');
    setTimeout(() => setIsCopiedCode(false), 2500);
  };

  const slices = config.slices && config.slices.length === 8 ? config.slices : DEFAULT_WHEEL_SLICES;
  const userBalance = currentUser?.wallet_balance || 0;
  const freeSpins = growthData.freeSpinsAvailable || 0;
  const spinCost = config.costPerSpinCore || 10000;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-950/40 via-card/80 to-purple-950/30 border border-amber-500/30 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>{themeContext === 'utilities' ? 'Tiện Ích & Săn Quà VIP' : 'Sự Kiện Phát Code & Giveaway May Mắn'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-display">
              {title || '🎡 Vòng Quay May Mắn — Rinh Code VIP'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              {subtitle ||
                'Thử vận may mỗi ngày: Nhận Giftcode VIP độc quyền, số dư ví Core, lượt quay thêm và hàng ngàn phần quà cực giá trị!'}
            </p>
          </div>

          {/* Quick User Stats HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full md:w-auto shrink-0">
            <div className="p-3 rounded-2xl bg-[#0c182c] border border-blue-500/30 text-center shadow-md">
              <span className="text-[10px] text-blue-300 uppercase font-bold block mb-0.5">Lượt Miễn Phí</span>
              <div className="flex items-center justify-center gap-1">
                <Dices className="w-4 h-4 text-amber-400" />
                <span className="text-lg font-extrabold font-mono text-amber-300">{freeSpins}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0c182c] border border-blue-500/30 text-center shadow-md">
              <span className="text-[10px] text-blue-300 uppercase font-bold block mb-0.5">Số Dư Ví</span>
              <div className="flex items-center justify-center gap-1">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-extrabold font-mono text-emerald-300">{formatCore(userBalance)}</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-[#0c182c] border border-blue-500/30 text-center shadow-md">
              <span className="text-[10px] text-blue-300 uppercase font-bold block mb-0.5">Giá Quay Core</span>
              <span className="text-sm font-extrabold font-mono text-purple-300">
                {spinCost > 0 ? `${spinCost.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Lucky Wheel Main Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Interactive Wheel Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-card/70 border border-border/80 shadow-xl backdrop-blur-md">
          {/* Canvas Wrapper */}
          <div className="relative w-[290px] h-[290px] sm:w-[330px] sm:h-[330px] my-3 select-none">
            {/* Pointer Arrow at Top Center */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-amber-400 drop-shadow-[0_4px_10px_rgba(245,158,11,0.9)] filter" />

            {/* Rotating Wheel Canvas */}
            <div
              className="w-full h-full rounded-full shadow-2xl border-4 border-amber-500/90 overflow-hidden transition-transform ease-out"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transitionDuration: isSpinning ? '4.5s' : '0s',
                transitionTimingFunction: 'cubic-bezier(0.12, 0.9, 0.2, 1)',
              }}
            >
              <canvas ref={canvasRef} width={330} height={330} className="w-full h-full rounded-full" />
            </div>

            {/* Center Spin Button Hub */}
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleSpinClick(freeSpins <= 0 && spinCost > 0)}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-300 shadow-2xl flex flex-col items-center justify-center font-display font-extrabold text-xs sm:text-sm text-white uppercase transition-transform active:scale-90 cursor-pointer ${
                isSpinning
                  ? 'bg-slate-700 opacity-80 cursor-not-allowed'
                  : 'bg-gradient-to-tr from-amber-600 via-rose-500 to-amber-500 hover:scale-105 shadow-glow-primary'
              }`}
            >
              <RotateCw className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span className="text-[10px] sm:text-xs tracking-wider">{isSpinning ? 'QUAY...' : 'QUAY'}</span>
            </button>
          </div>

          {/* Action Trigger Buttons */}
          <div className="w-full max-w-sm mt-4 space-y-2.5">
            {freeSpins > 0 ? (
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => handleSpinClick(false)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Dices className="w-5 h-5" />
                <span>QUAY MIỄN PHÍ ({freeSpins} LƯỢT CÒN)</span>
              </button>
            ) : spinCost > 0 ? (
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => handleSpinClick(true)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Coins className="w-5 h-5 text-amber-300" />
                <span>QUAY BẰNG CORE ({spinCost.toLocaleString('vi-VN')}đ / LƯỢT)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => handleSpinClick(false)}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Dices className="w-5 h-5" />
                <span>QUAY NGAY (MIỄN PHÍ)</span>
              </button>
            )}

            {/* Sub Action Links */}
            <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-400">
              {onOpenWallet ? (
                <button
                  type="button"
                  onClick={onOpenWallet}
                  className="flex items-center gap-1 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nạp số dư ví</span>
                </button>
              ) : null}

              {onViewClaimedCodes ? (
                <button
                  type="button"
                  onClick={onViewClaimedCodes}
                  className="flex items-center gap-1 hover:text-primary-light transition-colors cursor-pointer ml-auto"
                >
                  <Gift className="w-3.5 h-3.5 text-accent" />
                  <span>Xem mã đã nhận</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Slices List & Live Spin History */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sub Navigation Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border/80">
            <button
              type="button"
              onClick={() => setActiveSubTab('prizes')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'prizes'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>8 Ô Phần Thưởng</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Lịch Sử Của Bạn</span>
            </button>
          </div>

          {activeSubTab === 'prizes' ? (
            /* 8 Prizes Overview Card */
            <div className="rounded-2xl bg-card/60 border border-border/80 p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs font-bold text-muted-foreground">
                <span>Phần Thưởng Trên Bánh Xe</span>
                <span>Tỷ Lệ / Kho</span>
              </div>
              <div className="space-y-2">
                {slices.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-foreground block truncate">{s.label}</span>
                        {s.sublabel && <span className="text-[10px] text-muted-foreground block truncate">{s.sublabel}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-amber-400">{s.probability}%</span>
                      {s.type === 'GIFTCODE' && s.codesList && (
                        <span className="block text-[10px] text-emerald-400 font-mono">
                          (Còn {s.remainingCodesCount ?? s.codesList.length} mã)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* User's Recent Spins History */
            <div className="rounded-2xl bg-card/60 border border-border/80 p-4 space-y-2.5 shadow-sm">
              <span className="text-xs font-bold text-muted-foreground block pb-2 border-b border-border/60">
                Lịch Sử 10 Lần Quay Gần Nhất
              </span>
              {growthData.spinHistory && growthData.spinHistory.length > 0 ? (
                <div className="space-y-2 max-h-[380px] overflow-y-auto scrollbar-thin">
                  {growthData.spinHistory.slice(0, 10).map((hist) => (
                    <div
                      key={hist.id}
                      className="p-2.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-foreground block truncate">{hist.reward}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(hist.timestamp).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Đã nhận
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
                  <Dices className="w-8 h-8 mx-auto text-slate-500/50 mb-1" />
                  <p>Bạn chưa quay lần nào hôm nay.</p>
                  <p className="text-[11px] text-slate-500">Hãy nhấn nút QUAY để rinh quà nhé!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Victory Modal Popup */}
      {isVictoryModalOpen && wonSlice && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsVictoryModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-card border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Glowing Trophy Icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-amber-500/30 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                Chúc Mừng Bạn!
              </span>
              <h3 className="text-xl font-extrabold text-foreground">{wonSlice.label}</h3>
              {wonSlice.sublabel && <p className="text-xs text-muted-foreground mt-1">{wonSlice.sublabel}</p>}
            </div>

            {/* Giftcode Display Box */}
            {awardedCode && (
              <div className="p-3.5 rounded-2xl bg-[#0b1728] border border-blue-500/40 space-y-2">
                <span className="text-[11px] font-bold text-blue-300 block uppercase">Mã Quà Tặng Độc Quyền Của Bạn:</span>
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#102344] border border-blue-500/50">
                  <span className="font-mono font-extrabold text-sm sm:text-base text-amber-300 tracking-wider select-all truncate pl-1">
                    {awardedCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAwardedCode}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isCopiedCode
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedCode ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Mã đã được lưu tự động vào mục <span className="text-blue-300 font-bold">[Mã Đã Nhận]</span>.
                </p>
              </div>
            )}

            {wonSlice.type === 'CORE' && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                💰 Tiền thưởng <span className="font-bold text-white">+{wonSlice.value?.toLocaleString('vi-VN')} Core</span> đã được cộng trực tiếp vào số dư ví của bạn!
              </div>
            )}

            {wonSlice.type === 'SPIN' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                🎲 Bạn nhận được thêm <span className="font-bold text-white">+{wonSlice.value} Lượt Quay</span> may mắn!
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsVictoryModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng & Quay Tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
