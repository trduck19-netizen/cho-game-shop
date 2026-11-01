import React, { useEffect, useState, useMemo } from 'react';
import { Smartphone, QrCode, Info, ExternalLink, Download, Monitor } from 'lucide-react';
import type { GameItem } from '../../types/game';

interface GameDownloadSectionProps {
  game: GameItem;
  className?: string;
}

type Platform = 'android' | 'ios' | 'desktop' | 'other';

/**
 * Client-side platform detection
 * Handles Android, iOS (iPhone/iPad), and iPadOS 13+ (Macintosh with touch points)
 */
function detectPlatform(): Platform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  // 1. Check userAgentData platform if available (modern browsers)
  const uaData = (navigator as any).userAgentData;
  if (uaData?.platform) {
    const p = String(uaData.platform).toLowerCase();
    if (p === 'android') return 'android';
    if (p === 'ios') return 'ios';
  }

  const ua = navigator.userAgent || '';

  // 2. iPadOS 13+ detection (reports as Macintosh in UA, but has multi-touch)
  const isIPad = /Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  if (isIPad || /iPhone|iPad|iPod/i.test(ua)) {
    return 'ios';
  }

  // 3. Android detection
  if (/Android/i.test(ua)) {
    return 'android';
  }

  // 4. Desktop detection
  if (/Windows|Macintosh|Linux/i.test(ua)) {
    return 'desktop';
  }

  return 'other';
}

/**
 * Builds final store URL by appending tracking parameters without clobbering existing parameters
 * Android: referrer=utm_source%3Dcodegame.shop%26utm_medium%3Ddownload_button (or download_qr)
 * iOS: mt=8 (and via=qr if via QR scan)
 */
export function buildStoreUrl(
  rawUrl: string,
  store: 'google_play' | 'app_store',
  via: 'button' | 'qr_scan'
): string {
  if (!rawUrl || !rawUrl.trim()) return '';
  const trimmed = rawUrl.trim();

  try {
    const url = new URL(trimmed);

    if (store === 'google_play') {
      const medium = via === 'qr_scan' ? 'download_qr' : 'download_button';
      const trackingReferrer = `utm_source=codegame.shop&utm_medium=${medium}`;
      const existingRef = url.searchParams.get('referrer');

      if (!existingRef) {
        url.searchParams.set('referrer', trackingReferrer);
      } else if (!existingRef.includes('utm_source=')) {
        url.searchParams.set('referrer', `${existingRef}&${trackingReferrer}`);
      }
    } else if (store === 'app_store') {
      if (!url.searchParams.has('mt')) {
        url.searchParams.set('mt', '8');
      }
      if (via === 'qr_scan' && !url.searchParams.has('via')) {
        url.searchParams.set('via', 'qr');
      }
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}

/**
 * Non-blocking beacon/fetch call to /api/track-download
 */
function sendDownloadTracking(
  gameSlug: string,
  store: 'google_play' | 'app_store',
  platformDetected: Platform,
  via: 'button' | 'qr_scan'
) {
  if (!gameSlug) return;

  const payload = JSON.stringify({
    game_slug: gameSlug,
    store,
    platform_detected: platformDetected,
    via,
  });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/track-download', blob);
      return;
    }

    if (typeof fetch !== 'undefined') {
      fetch('/api/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Non-fatal tracking
  }
}

/**
 * Official Google Play colored triangle vector icon
 */
export const GooglePlaySvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M48.7 15.6c-4.6 4.9-7.2 12.5-7.2 22.3v436.2c0 9.8 2.6 17.4 7.2 22.3l1.3 1.2 244.3-244.3v-5.8L50 14.4l-1.3 1.2z"
      fill="#00C3FF"
    />
    <path
      d="M374.8 297.7l-80.5-80.5v-5.8l80.5-80.5 1.8 1 95.3 54.1c27.2 15.4 27.2 40.7 0 56.1l-95.3 54.1-1.8 1.6z"
      fill="#FFD400"
    />
    <path
      d="M376.6 296.1L294.3 213.8 48.7 459.4c8.9 9.5 23.6 10.6 40.3 1.2l287.6-164.5z"
      fill="#FF3333"
    />
    <path
      d="M376.6 131.9L89 32.6C72.3 23.2 57.6 24.3 48.7 33.8l245.6 245.6 82.3-82.3v-65.2z"
      fill="#00E676"
    />
  </svg>
);

/**
 * Official Apple logo vector icon
 */
export const AppleSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 170 170" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.58-7.85-11.66-14.34-5.99-9.58-10.74-20.9-14.25-33.97-3.51-13.07-5.27-25.26-5.27-36.56 0-16.7 4.09-30.2 12.28-40.51 8.18-10.31 18.65-15.58 31.41-15.82 4.9 0 10.23 1.25 15.99 3.75 5.76 2.5 9.4 3.81 10.92 3.93 2.12-.22 5.99-1.57 11.61-4.05 5.62-2.48 10.63-3.65 15.03-3.5 11.22.47 20.35 4.3 27.38 11.49 7.03 7.18 11.67 16.03 13.91 26.54-9.92 5.99-14.82 14.39-14.71 25.2.11 9.38 3.84 17.29 11.19 23.73 7.34 6.44 16.27 10.15 26.79 11.14-2.12 6.53-4.95 13.32-8.5 20.37zM119.22 31.95c0-7.29 2.59-14.33 7.78-21.11 5.19-6.78 11.75-11.21 19.68-13.29.33 1.34.49 2.59.49 3.75 0 7.3-2.67 14.38-8.01 21.23-5.34 6.85-11.95 11.28-19.82 13.29-.08-1.23-.12-2.52-.12-3.87z" />
  </svg>
);

export const GameDownloadSection: React.FC<GameDownloadSectionProps> = ({ game, className = '' }) => {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [isMounted, setIsMounted] = useState(false);
  const [selectedQrTab, setSelectedQrTab] = useState<'google_play' | 'app_store'>('google_play');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrLoading, setIsQrLoading] = useState(false);

  // Store links extracted from game model (supporting both naming conventions)
  const rawPlayUrl = game.google_play_url || game.download_android || '';
  const rawIosUrl = game.app_store_url || game.download_ios || '';
  const rawPcUrl = game.download_pc || '';

  const hasPlay = Boolean(rawPlayUrl && rawPlayUrl.trim());
  const hasIos = Boolean(rawIosUrl && rawIosUrl.trim());
  const hasPc = Boolean(rawPcUrl && rawPcUrl.trim());

  // Detect platform on mount
  useEffect(() => {
    setIsMounted(true);
    const detected = detectPlatform();
    setPlatform(detected);

    // Default QR tab to whichever link is available
    if (!hasPlay && hasIos) {
      setSelectedQrTab('app_store');
    } else {
      setSelectedQrTab('google_play');
    }
  }, [hasPlay, hasIos]);

  // Build final store URLs with tracking parameters
  const playButtonUrl = useMemo(
    () => (hasPlay ? buildStoreUrl(rawPlayUrl, 'google_play', 'button') : ''),
    [rawPlayUrl, hasPlay]
  );

  const iosButtonUrl = useMemo(
    () => (hasIos ? buildStoreUrl(rawIosUrl, 'app_store', 'button') : ''),
    [rawIosUrl, hasIos]
  );

  // Lazy-load client-side QR generation only on Desktop or when mounted
  useEffect(() => {
    let isCancelled = false;

    // QR is only needed on desktop / other screens
    if (platform === 'desktop' || platform === 'other') {
      const activeStore = selectedQrTab === 'google_play' && hasPlay ? 'google_play' : hasIos ? 'app_store' : 'google_play';
      const targetRaw = activeStore === 'google_play' ? rawPlayUrl : rawIosUrl;

      if (targetRaw) {
        setIsQrLoading(true);
        const encodedUrl = buildStoreUrl(targetRaw, activeStore, 'qr_scan');

        // Dynamic client-side import of bundled qrcode library
        import('qrcode')
          .then((QRCodeModule) => {
            const QRCode = QRCodeModule.default || QRCodeModule;
            return QRCode.toDataURL(encodedUrl, {
              width: 176,
              margin: 1,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
              errorCorrectionLevel: 'M',
            });
          })
          .then((dataUrl) => {
            if (!isCancelled) {
              setQrDataUrl(dataUrl);
              setIsQrLoading(false);
            }
          })
          .catch(() => {
            if (!isCancelled) setIsQrLoading(false);
          });
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [platform, selectedQrTab, rawPlayUrl, rawIosUrl, hasPlay, hasIos]);

  // RULE 2: If game has no store links and no PC link, DO NOT render this block at all
  if (!hasPlay && !hasIos && !hasPc) {
    return null;
  }

  // Handle tracking on button click
  const handleClick = (store: 'google_play' | 'app_store') => {
    sendDownloadTracking(game.slug || game.id, store, platform, 'button');
  };

  const isDesktop = platform === 'desktop' || platform === 'other';
  const isAndroid = platform === 'android';
  const isIos = platform === 'ios';

  // Target behavior: mobile opens in same tab to trigger Universal/App Link; desktop opens new tab
  const linkTarget = isDesktop ? '_blank' : '_self';
  const linkRel = isDesktop ? 'noopener noreferrer' : undefined;

  return (
    <div
      className={`rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-3 sm:p-4 shadow-lg backdrop-blur-sm transition-all ${className}`}
    >
      {/* Header bar: Title & Platform indicator */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Download className="w-4 h-4 animate-bounce-subtle" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <span>Tải Game Chính Thức</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Official Store
              </span>
            </h3>
          </div>
        </div>

        {/* Small subtle badge indicating detected device */}
        {isMounted && (
          <div className="hidden xs:flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/50">
            <Smartphone className="w-3 h-3 text-slate-400" />
            <span>
              {isAndroid ? 'Android' : isIos ? 'iOS' : 'Desktop'}
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. ANDROID DISPLAY: Large Google Play button + small text-link to iOS     */}
      {/* ========================================================================= */}
      {isAndroid && hasPlay && (
        <div className="space-y-2">
          <a
            href={playButtonUrl}
            target={linkTarget}
            rel={linkRel}
            onClick={() => handleClick('google_play')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-sm shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <GooglePlaySvg className="w-5 h-5 shrink-0" />
            <span>Tải trên CH Play</span>
          </a>

          {hasIos && (
            <div className="text-center pt-0.5">
              <a
                href={iosButtonUrl}
                target={linkTarget}
                rel={linkRel}
                onClick={() => handleClick('app_store')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-0.5"
              >
                <AppleSvg className="w-3.5 h-3.5 text-slate-400" />
                <span>Cũng có trên iOS (App Store) &rarr;</span>
              </a>
            </div>
          )}

          {hasPc && (
            <div className="text-center pt-0.5">
              <a
                href={rawPcUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-0.5"
              >
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
                <span>Có bản PC / Windows &rarr;</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. IOS DISPLAY: Large App Store button + small text-link to Android       */}
      {/* ========================================================================= */}
      {isIos && hasIos && (
        <div className="space-y-2">
          <a
            href={iosButtonUrl}
            target={linkTarget}
            rel={linkRel}
            onClick={() => handleClick('app_store')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-heading font-black text-sm shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <AppleSvg className="w-5 h-5 shrink-0 text-slate-950" />
            <span>Tải trên App Store</span>
          </a>

          {hasPlay && (
            <div className="text-center pt-0.5">
              <a
                href={playButtonUrl}
                target={linkTarget}
                rel={linkRel}
                onClick={() => handleClick('google_play')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-0.5"
              >
                <GooglePlaySvg className="w-3.5 h-3.5 shrink-0" />
                <span>Cũng có trên Android (CH Play) &rarr;</span>
              </a>
            </div>
          )}

          {hasPc && (
            <div className="text-center pt-0.5">
              <a
                href={rawPcUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-0.5"
              >
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
                <span>Có bản PC / Windows &rarr;</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Fallback for Android device when ONLY iOS link is available */}
      {isAndroid && !hasPlay && hasIos && (
        <div className="space-y-2">
          <a
            href={iosButtonUrl}
            target={linkTarget}
            rel={linkRel}
            onClick={() => handleClick('app_store')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-heading font-black text-sm shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <AppleSvg className="w-5 h-5 shrink-0 text-slate-950" />
            <span>Tải trên App Store</span>
          </a>
        </div>
      )}

      {/* Fallback for iOS device when ONLY Android link is available */}
      {isIos && !hasIos && hasPlay && (
        <div className="space-y-2">
          <a
            href={playButtonUrl}
            target={linkTarget}
            rel={linkRel}
            onClick={() => handleClick('google_play')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-sm shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <GooglePlaySvg className="w-5 h-5 shrink-0" />
            <span>Tải trên CH Play</span>
          </a>
        </div>
      )}

      {/* Fallback when ONLY PC link is available on mobile */}
      {!hasPlay && !hasIos && hasPc && !isDesktop && (
        <div className="space-y-2">
          <a
            href={rawPcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading font-black text-sm shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <Monitor className="w-5 h-5 shrink-0 text-white" />
            <span>Tải bản PC (Windows)</span>
            <ExternalLink className="w-4 h-4 text-sky-200 ml-auto" />
          </a>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DESKTOP DISPLAY: Store buttons side-by-side + PC + QR code block       */}
      {/* ========================================================================= */}
      {isDesktop && (
        <div className="space-y-3">
          {/* Action buttons row */}
          <div className={`grid grid-cols-1 ${hasPlay && hasIos && hasPc ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2 sm:gap-2.5`}>
            {hasPlay && (
              <a
                href={playButtonUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick('google_play')}
                className={`flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-emerald-950/40 text-white hover:text-emerald-300 border border-emerald-500/40 hover:border-emerald-500 transition-all font-heading font-bold text-xs sm:text-sm active:scale-95 group ${
                  !hasIos && !hasPc ? 'sm:col-span-2' : ''
                }`}
                title="Mở Google Play Store trong tab mới"
              >
                <GooglePlaySvg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 group-hover:scale-110 transition-transform" />
                <span>Tải trên CH Play</span>
                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 ml-auto" />
              </a>
            )}

            {hasIos && (
              <a
                href={iosButtonUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick('app_store')}
                className={`flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/60 text-white hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/60 transition-all font-heading font-bold text-xs sm:text-sm active:scale-95 group ${
                  !hasPlay && !hasPc ? 'sm:col-span-2' : ''
                }`}
                title="Mở Apple App Store trong tab mới"
              >
                <AppleSvg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 group-hover:scale-110 transition-transform text-white" />
                <span>Tải trên App Store</span>
                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 ml-auto" />
              </a>
            )}

            {hasPc && (
              <a
                href={rawPcUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-sky-950/40 text-white hover:text-sky-300 border border-sky-500/40 hover:border-sky-500 transition-all font-heading font-bold text-xs sm:text-sm active:scale-95 group ${
                  !hasPlay && !hasIos ? 'sm:col-span-2' : ''
                }`}
                title="Mở website tải bản PC / Windows chính thức"
              >
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>Bản PC (Windows)</span>
                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-sky-400 ml-auto" />
              </a>
            )}
          </div>

          {/* Desktop QR Code Block (only rendered if mobile store link exists) */}
          {(hasPlay || hasIos) && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col items-center">
            {/* Tabs for switching QR code (only show if both links exist) */}
            {hasPlay && hasIos && (
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 mb-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedQrTab('google_play')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    selectedQrTab === 'google_play'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GooglePlaySvg className="w-3 h-3 shrink-0" />
                  <span>CH Play (Android)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQrTab('app_store')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    selectedQrTab === 'app_store'
                      ? 'bg-slate-100 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <AppleSvg className="w-3 h-3 shrink-0" />
                  <span>App Store (iOS)</span>
                </button>
              </div>
            )}

            {/* QR Card */}
            <div className="relative p-2 rounded-xl bg-white border border-slate-200 shadow-md">
              {isQrLoading || !qrDataUrl ? (
                <div className="w-[140px] h-[140px] flex flex-col items-center justify-center bg-slate-50 text-slate-400 rounded-lg">
                  <QrCode className="w-8 h-8 animate-pulse text-slate-400 mb-1" />
                  <span className="text-[10px] font-semibold">Đang tạo mã QR...</span>
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt={`Mã QR tải game ${game.name}`}
                  className="w-[140px] h-[140px] object-contain rounded-lg"
                  loading="lazy"
                />
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-2 text-center font-medium">
              Quét bằng Camera điện thoại để mở thẳng trang tải game
            </p>
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MANDATORY REGION RESTRICTION NOTE (EXACT VERBATIM TEXT)                */}
      {/* ========================================================================= */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[11px] text-slate-400 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-amber-400/90 shrink-0 mt-0.5" />
        <p className="flex-1">
          Nếu CH Play/App Store báo &quot;không có ở quốc gia của bạn&quot;, đó là giới hạn vùng theo tài khoản của bạn — link tải vẫn đúng. Hãy thử tài khoản thuộc vùng game đã phát hành.
        </p>
      </div>
    </div>
  );
};
