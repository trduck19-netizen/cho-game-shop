import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Code2, Dices, Copy, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import type { GameItem } from '../types/game';

interface CodePlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameItem[];
  onSelectGame: (game: GameItem) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const CodePlaygroundModal: React.FC<CodePlaygroundModalProps> = ({
  isOpen,
  onClose,
  games,
  onSelectGame,
  onShowToast,
}) => {
  const [luckyResult, setLuckyResult] = useState<{
    game: GameItem;
    code: string;
    rewards: string;
  } | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  useLockBodyScroll(isOpen);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleRandomDraw = () => {
    // Filter games that have codes
    const gamesWithCodes = games.filter((g) => g.codes && g.codes.length > 0);
    if (gamesWithCodes.length === 0) return;

    setIsSpinning(true);
    setLuckyResult(null);

    setTimeout(() => {
      const randomGame = gamesWithCodes[Math.floor(Math.random() * gamesWithCodes.length)];
      const codes = randomGame.codes || [];
      const randomCode = codes[Math.floor(Math.random() * codes.length)];

      setLuckyResult({
        game: randomGame,
        code: randomCode.code,
        rewards: randomCode.rewards,
      });
      setIsSpinning(false);

      // Trigger party confetti
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F43F5E', '#8B5CF6', '#06B6D4', '#F59E0B'],
      });
    }, 600);
  };

  const handleCopyLuckyCode = () => {
    if (!luckyResult) return;
    navigator.clipboard.writeText(luckyResult.code);
    setIsCopied(true);
    onShowToast('Đã sao chép mã code may mắn!', luckyResult.code, 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-card border-t sm:border border-border/90 rounded-t-[28px] sm:rounded-3xl p-4 sm:p-6 shadow-2xl animate-scale-in max-h-[88dvh] sm:max-h-[88vh] overflow-y-auto touch-pan-y pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Indicator */}
        <div className="w-12 h-1.5 bg-slate-600/60 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <div className="p-2 sm:p-2.5 rounded-xl bg-secondary/20 text-secondary shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground truncate">
                Hộp Quà Giftcode May Mắn
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Rút ngẫu nhiên một mã code quà tặng còn hạn
              </p>
            </div>
          </div>
          {/* High-visibility Close Button */}
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="py-6 text-center space-y-6">
          {/* Main Draw Action */}
          <div className="p-6 rounded-2xl bg-muted/40 border border-border/80 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
              <Dices className={`w-8 h-8 text-white ${isSpinning ? 'animate-spin' : ''}`} />
            </div>

            <h4 className="font-heading font-bold text-base text-foreground mb-1">
              Thử Vận May Cùng CodeGame.Shop
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
              Nhấn nút bên dưới để hệ thống chọn ngẫu nhiên 1 mã giftcode đặc biệt kèm phần thưởng cho bạn!
            </p>

            <button
              onClick={handleRandomDraw}
              disabled={isSpinning}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary via-primary-hover to-accent text-white font-display font-bold text-sm shadow-glow-primary hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSpinning ? 'Đang mở rương quà...' : 'Rút Code Ngẫu Nhiên'}</span>
            </button>
          </div>

          {/* Lucky Result Box */}
          {luckyResult && (
            <div className="p-5 rounded-2xl bg-card border border-primary/50 shadow-glow-primary text-left animate-scale-in space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                  <img
                    src={luckyResult.game.icon_url || `/game_icons/${luckyResult.game.slug}.webp`}
                    alt={luckyResult.game.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/20 text-primary-light">
                    {luckyResult.game.category || 'Game'}
                  </span>
                  <h4 className="font-heading font-bold text-base text-foreground truncate mt-0.5">
                    {luckyResult.game.name}
                  </h4>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-bold text-primary-light text-base tracking-wider truncate">
                    {luckyResult.code}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    🎁 {luckyResult.rewards}
                  </div>
                </div>

                <button
                  onClick={handleCopyLuckyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm cursor-pointer shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
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

              <button
                onClick={() => {
                  onSelectGame(luckyResult.game);
                  onClose();
                }}
                className="w-full text-center text-xs text-secondary hover:underline font-semibold pt-1 cursor-pointer"
              >
                Xem toàn bộ code của game này →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
