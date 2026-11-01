import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Sparkles, AlertCircle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import type { GameItem } from '../types/game';

interface SubmitCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameItem[];
  onSuccess: (gameSlug: string, code: string) => void;
}

export const SubmitCodeModal: React.FC<SubmitCodeModalProps> = ({
  isOpen,
  onClose,
  games,
  onSuccess,
}) => {
  const currentUser = dataService.getCurrentUser();
  const [selectedSlug, setSelectedSlug] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [rewards, setRewards] = useState('');
  const [submitterName, setSubmitterName] = useState(currentUser?.username || '');
  const [submitterEmail, setSubmitterEmail] = useState(currentUser?.email || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  useLockBodyScroll(isOpen);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlug) {
      setError('Vui lòng chọn tựa game cần đóng góp code.');
      return;
    }
    if (!codeValue.trim()) {
      setError('Vui lòng nhập mã code.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const ok = dataService.submitCode(
      selectedSlug,
      codeValue,
      rewards,
      submitterName || 'Game thủ Cộng đồng',
      submitterEmail || 'user@webcodegame.vn'
    );
    setIsSubmitting(false);

    if (ok) {
      onSuccess(selectedSlug, codeValue);
      setCodeValue('');
      setRewards('');
      onClose();
    } else {
      setError('Có lỗi xảy ra khi lưu mã code. Vui lòng thử lại.');
    }
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
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/20 text-primary-light shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground truncate">
                Đóng Góp Mã Giftcode Mới
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Chia sẻ mã code bạn tìm được cho cộng đồng game thủ
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 text-accent text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Game */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Chọn Tựa Game *
            </label>
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              required
            >
              <option value="" className="bg-card text-muted-foreground">
                -- Chọn một trong 340+ tựa game --
              </option>
              {games.map((g) => (
                <option key={g.id} value={g.slug} className="bg-card text-foreground">
                  {g.name} ({g.publisher || 'NPH'})
                </option>
              ))}
            </select>
          </div>

          {/* Code Value */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Mã Code * (Ví dụ: VIP999, TANTHU2026)
            </label>
            <input
              type="text"
              value={codeValue}
              onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
              placeholder="Nhập chính xác mã giftcode"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground font-mono font-bold text-sm focus:ring-2 focus:ring-primary focus:outline-none uppercase"
              required
            />
          </div>

          {/* Rewards info */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Phần Thưởng Kèm Theo (Tùy chọn)
            </label>
            <input
              type="text"
              value={rewards}
              onChange={(e) => setRewards(e.target.value)}
              placeholder="Ví dụ: 500 Kim Cương, Rương Tướng SSR, 10 Vé Quay"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Submitter info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Tên Của Bạn (Tùy chọn)
              </label>
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Ví dụ: Minh Tuấn"
                className="w-full px-3.5 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Email Liên Hệ (Tùy chọn)
              </label>
              <input
                type="email"
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3.5 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang gửi...' : 'Gửi Mã Ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
