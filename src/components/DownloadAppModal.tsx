import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  QrCode,
  CheckCircle2,
  Zap,
  Bell,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { pwaService } from '../services/pwaService';
import QRCode from 'qrcode';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [canPromptPwa, setCanPromptPwa] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'qr'>('pwa');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Mở tính năng tải APK chạy theo cơ chế Live WebView đồng bộ 100% thời gian thực
  const SHOW_APK_DOWNLOAD = true;

  useEffect(() => {
    if (!isOpen) return;
    const detected = pwaService.getPlatform();
    setPlatform(detected);
    setIsInstalled(pwaService.isInstalled());
    setCanPromptPwa(pwaService.canPromptInstall());

    if (detected === 'desktop') {
      setActiveTab('qr');
    } else {
      setActiveTab('pwa');
    }

    // Generate local QR Code with 0 external network requests
    const targetUrl = typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop';
    QRCode.toDataURL(targetUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0B0D19',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('[QRCode error]', err));

    const unsub = pwaService.subscribe((can) => {
      setCanPromptPwa(can);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    const success = await pwaService.promptInstall();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  const handleCopyLink = () => {
    const targetUrl = typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop';
    navigator.clipboard?.writeText(targetUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-card/95 border border-border/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-primary/20 via-purple-500/20 to-accent/20 border-b border-border/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-accent flex items-center justify-center shadow-glow-primary shrink-0 overflow-hidden border border-white/20">
              <img
                src="/logo.png"
                alt="CodeGame App"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground font-display">
                  Cài Đặt App CodeGame
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  FREE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Trải nghiệm mượt mà, nhận giftcode tức thì không cần mở trình duyệt
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Value Badges */}
        <div className="grid grid-cols-3 gap-2 px-5 pt-4">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-muted/60 border border-border/60 text-[11px] text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold truncate">Mở 1 Chạm</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-muted/60 border border-border/60 text-[11px] text-slate-300">
            <Bell className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-semibold truncate">Báo Code Mới</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-muted/60 border border-border/60 text-[11px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold truncate">Bản Quyền G1</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 px-5 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pwa'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'bg-muted/50 text-slate-400 hover:text-foreground hover:bg-muted'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Cài Nhanh (PWA)</span>
          </button>

          {SHOW_APK_DOWNLOAD && (
            <button
              type="button"
              onClick={() => setActiveTab('apk')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'apk'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'bg-muted/50 text-slate-400 hover:text-foreground hover:bg-muted'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải File .APK</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'bg-muted/50 text-slate-400 hover:text-foreground hover:bg-muted'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Quét Mã QR</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: PWA (Instant Install) */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
                  <div className="text-xs">
                    <p className="font-bold">Ứng dụng đã được cài đặt!</p>
                    <p className="text-slate-400 mt-0.5">
                      Bạn có thể mở CodeGame trực tiếp từ màn hình chính của thiết bị.
                    </p>
                  </div>
                </div>
              ) : installSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 animate-fade-in">
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
                  <div className="text-xs">
                    <p className="font-bold">Cài đặt thành công!</p>
                    <p className="text-slate-300 mt-0.5">
                      Icon CodeGame đã xuất hiện trên màn hình điện thoại của bạn.
                    </p>
                  </div>
                </div>
              ) : platform === 'ios' ? (
                /* iOS Safari 2-Step Guide */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/80 text-xs space-y-3">
                    <div className="flex items-center gap-2 text-primary-light font-bold">
                      <Smartphone className="w-4 h-4" />
                      <span>Hướng dẫn cài đặt trên iPhone / iPad (Safari)</span>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border/60">
                      <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center font-bold text-xs shrink-0">
                        1
                      </div>
                      <div className="text-slate-300 text-xs">
                        <p className="font-semibold text-foreground">
                          Bấm nút Chia sẻ (Share)
                        </p>
                        <p className="text-slate-400 mt-0.5 flex items-center gap-1">
                          Tìm biểu tượng <Share2 className="w-3.5 h-3.5 text-primary-light inline" /> ở thanh dưới cùng của Safari.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border/60">
                      <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center font-bold text-xs shrink-0">
                        2
                      </div>
                      <div className="text-slate-300 text-xs">
                        <p className="font-semibold text-foreground">
                          Chọn "Thêm vào MH chính"
                        </p>
                        <p className="text-slate-400 mt-0.5 flex items-center gap-1">
                          Cuộn xuống và chọn <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" />{' '}
                          <strong>Thêm vào MH chính</strong> (Add to Home Screen).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Android / Chrome One-Tap Install */
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/20 text-primary-light flex items-center justify-center shadow-glow-primary">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        Cài Đặt Trực Tiếp (Không Tốn Dung Lượng)
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Ứng dụng hoạt động độc lập toàn màn hình, tải dữ liệu siêu nhanh và tự cập nhật mã giftcode mới nhất 24/7.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleInstallPwa}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary via-primary-hover to-accent text-white font-bold text-sm shadow-glow-primary hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>{canPromptPwa ? 'Cài Đặt App Ngay (1 Chạm)' : 'Thêm Vào Màn Hình Chính'}</span>
                    </button>
                  </div>

                  {!canPromptPwa && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-slate-400 flex items-start gap-2">
                      <span className="text-amber-400">💡</span>
                      <span>
                        Nếu trình duyệt không tự mở hộp thoại, bạn có thể bấm vào menu <strong>⋮</strong> (ở góc trên trình duyệt) và chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào màn hình chính"</strong>.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Direct APK Download (Tạm thời ẩn, kích hoạt lại khi bật SHOW_APK_DOWNLOAD) */}
          {SHOW_APK_DOWNLOAD && activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-card border border-border text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-sm">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      Tải File Cài Đặt Android (.APK)
                    </h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-slate-400 border border-border">
                      v1.0.0
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Dung lượng siêu nhẹ ~2.8MB • Tự động cập nhật Giftcode 24/7 • Tương thích Android 7.0 trở lên
                  </p>
                </div>

                <a
                  href="/download/codegame.apk"
                  download="CodeGame-v1.0.apk"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File CodeGame.apk (2.8 MB)</span>
                </a>

                {/* Instant PWA Shortcut Alternative */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pwa')}
                    className="w-full py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary-light border border-primary/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>💡 Khuyên dùng: Cài Nhanh (PWA) — Mở 1 chạm, không cần tải APK</span>
                  </button>
                </div>
              </div>

              {/* 3 Step APK Install Guide */}
              <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/70 text-xs space-y-2">
                <span className="font-bold text-slate-300 block mb-1">
                  Cách cài đặt file APK trên điện thoại Android:
                </span>
                <div className="space-y-1.5 text-slate-400 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tải file APK về máy → Nhấn <strong>"Vẫn tải xuống"</strong> nếu trình duyệt hỏi.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Mở file vừa tải → Cho phép <strong>"Cài đặt ứng dụng không rõ nguồn"</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary-light flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span>Nhấn <strong>Cài đặt</strong> và mở app CodeGame trải nghiệm!</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QR Code (for Desktop users) */}
          {activeTab === 'qr' && (
            <div className="text-center space-y-3">
              <div className="p-3 bg-white rounded-2xl w-52 h-52 mx-auto flex items-center justify-center shadow-lg border-2 border-primary/40 relative">
                {qrDataUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={qrDataUrl}
                      alt="Mã QR Cài Đặt App CodeGame"
                      className="w-full h-full object-contain"
                    />
                    {/* Micro Brand Badge in center of QR */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-xl bg-card p-1 shadow-md border border-border flex items-center justify-center">
                        <img
                          src="/logo.png"
                          alt="Logo"
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-medium">
                    Đang tạo mã QR...
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-foreground">
                  Quét Mã Bằng Camera Điện Thoại
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Dùng camera điện thoại (hoặc Zalo) quét mã trên để mở trang và cài đặt app ngay tức thì trên điện thoại của bạn.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-slate-300 hover:text-foreground text-[11px] font-semibold border border-border transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã sao chép liên kết!</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Sao chép liên kết cài đặt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/40 border-t border-border/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>An toàn 100% • Không virus</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-foreground font-semibold px-3 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
