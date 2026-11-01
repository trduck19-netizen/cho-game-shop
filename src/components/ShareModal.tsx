import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Share2, Globe, Send, MessageCircle, Gift, Sparkles, ShoppingBag, Wrench } from 'lucide-react';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  shareUrl: string;
  itemType?: 'game' | 'giveaway' | 'product' | 'utility';
  imageUrl?: string;
  badge?: string;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  shareUrl,
  itemType = 'game',
  imageUrl,
  badge,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const headerConfig = {
    game: {
      label: 'Chia Sẻ Giftcode Game',
      icon: Gift,
      color: 'text-primary-light bg-primary/20',
    },
    giveaway: {
      label: 'Chia Sẻ Sự Kiện Giveaway',
      icon: Sparkles,
      color: 'text-accent bg-accent/20',
    },
    product: {
      label: 'Chia Sẻ Gói Cửa Hàng',
      icon: ShoppingBag,
      color: 'text-secondary bg-secondary/20',
    },
    utility: {
      label: 'Chia Sẻ Sản Phẩm Tiện Ích',
      icon: Wrench,
      color: 'text-teal-400 bg-teal-500/20',
    },
  }[itemType] || {
    label: 'Chia Sẻ Liên Kết',
    icon: Share2,
    color: 'text-primary-light bg-primary/20',
  };

  const HeaderIcon = headerConfig.icon;
  const shareTitle = `${title} | CodeGame.Shop 2026`;

  const fallbackCopyText = (text: string): boolean => {
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
    } catch {
      return false;
    }
  };

  const handleCopyLink = () => {
    let success = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        // clipboard write succeeded
      }).catch(() => {
        fallbackCopyText(shareUrl);
      });
      success = true;
    } else {
      success = fallbackCopyText(shareUrl);
    }
    setCopied(true);
    onShowToast('Đã sao chép liên kết!', shareUrl, 'success');
    setTimeout(() => setCopied(false), 2200);
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareMessenger = () => {
    window.open(`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareZalo = () => {
    window.open(`https://zalo.me/share?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank');
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank');
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: subtitle || shareTitle,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in"
    >
      <div
        className="w-full max-w-md bg-card border border-border/90 rounded-3xl p-4 sm:p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
            <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${headerConfig.color}`}>
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-bold text-sm sm:text-lg text-foreground truncate">
                {headerConfig.label}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {title || subtitle}
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

        {/* Live Preview Card with accurate game avatar */}
        {imageUrl ? (
          <div className="mt-3.5 p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center gap-3">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 bg-background border border-primary/30 shadow-md">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/og-image.jpg';
                }}
              />
              <div
                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background"
                title="Đã gắn ảnh đại diện game chính xác"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {badge || (itemType === 'giveaway' ? 'Sự Kiện Hot' : 'Game Chuẩn')}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Ảnh đại diện chuẩn
                </span>
              </div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground truncate">
                {title}
              </h4>
              <p className="text-[11px] text-muted-foreground truncate">
                {subtitle || 'codegame.shop'}
              </p>
            </div>
          </div>
        ) : null}

        {/* Native Web Share Button on mobile */}
        {hasNativeShare && (
          <button
            onClick={handleNativeShare}
            className="w-full mt-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Chia Sẻ Lên Ứng Dụng (Zalo, Messenger...)</span>
          </button>
        )}

        {/* Social Share Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 py-5 sm:py-6 text-center">
          {/* Facebook */}
          <button
            onClick={shareFacebook}
            className="flex flex-col items-center gap-1.5 sm:gap-2 group cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#1877F2]/15 border border-[#1877F2]/30 text-[#1877F2] flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="font-bold text-lg">f</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground group-hover:text-foreground font-medium">Facebook</span>
          </button>

          {/* Messenger */}
          <button
            onClick={shareMessenger}
            className="flex flex-col items-center gap-1.5 sm:gap-2 group cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#00B2FF]/15 border border-[#00B2FF]/30 text-[#00B2FF] flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground group-hover:text-foreground font-medium">Messenger</span>
          </button>

          {/* Zalo */}
          <button
            onClick={shareZalo}
            className="flex flex-col items-center gap-1.5 sm:gap-2 group cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#0068FF]/15 border border-[#0068FF]/30 text-[#0068FF] flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="font-bold text-xs tracking-tight">Zalo</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground group-hover:text-foreground font-medium">Zalo</span>
          </button>

          {/* Telegram */}
          <button
            onClick={shareTelegram}
            className="flex flex-col items-center gap-1.5 sm:gap-2 group cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#229ED9]/15 border border-[#229ED9]/30 text-[#229ED9] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground group-hover:text-foreground font-medium">Telegram</span>
          </button>

          {/* X / Twitter */}
          <button
            onClick={shareTwitter}
            className="flex flex-col items-center gap-1.5 sm:gap-2 group cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-muted border border-border text-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="font-bold text-sm">𝕏</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground group-hover:text-foreground font-medium">Twitter</span>
          </button>
        </div>

        {/* Copy Link Input with High Visibility Quick Copy Button */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span>Liên Kết Chia Sẻ (Deep Link)</span>
            </label>
            {copied && (
              <span className="text-[11px] font-bold text-emerald-400 animate-fade-in flex items-center gap-1">
                <Check className="w-3 h-3" /> Đã lưu vào bộ nhớ tạm!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 bg-muted/60 border border-border focus-within:border-accent/60 rounded-2xl p-1.5 pl-3 transition-colors">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="bg-transparent text-xs text-foreground font-mono flex-1 outline-none truncate cursor-pointer"
            />
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 active:scale-95 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-glow-primary'
              }`}
              title="Copy nhanh link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã copy link ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy nhanh link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
