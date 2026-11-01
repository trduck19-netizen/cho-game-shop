import React from 'react';

/**
 * Trả về URL icon tối ưu cho Game Sắp Ra Mắt:
 * 1. Nếu là đường dẫn nội bộ (/game_icons/...) hoặc Data URL: Trả về trực tiếp.
 * 2. Nếu là URL ngoài (http:// hoặc https://): Tự động định tuyến qua Edge Proxy
 *    `/api/game-icon?slug=...&url=...` để đảm bảo Cloudflare Edge phân phối 100%,
 *    chống chặn Referrer/Adblock/CORS và tối ưu tốc độ tải.
 * 3. Nếu chưa có icon: Fallback về file nội bộ `/game_icons/${slug}.webp`.
 */
export function getUpcomingGameIconUrl(
  game: { slug?: string; id?: string; iconUrl?: string; icon_url?: string } | null | undefined
): string {
  if (!game) return '/logo.png';
  const raw = (game.iconUrl || game.icon_url || '').trim();
  const slug = (game.slug || game.id || '').trim();

  if (!raw) {
    return slug ? `/game_icons/${slug}.webp` : '/logo.png';
  }

  // Nếu là URL ngoài (Apple mzstatic, Google Play, CDN...), định tuyến qua Edge Proxy để an toàn 100%
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    // Tránh encode lặp lại nếu URL đã là /api/game-icon
    if (raw.includes('/api/game-icon?')) {
      return raw;
    }
    return `/api/game-icon?slug=${encodeURIComponent(slug)}&url=${encodeURIComponent(raw)}`;
  }

  // Đường dẫn nội bộ tuyệt đối hoặc data:image
  if (raw.startsWith('/') || raw.startsWith('data:image/')) {
    return raw;
  }

  // Tên file ảnh (vd: strinova.webp)
  return `/game_icons/${raw}`;
}

/**
 * Bộ xử lý lỗi ảnh phân tầng (Multi-Stage Image Error Fallback Handler):
 * Stage 0 -> Stage 1: Thử link gốc trực tiếp (bỏ qua proxy) với referrerPolicy="no-referrer"
 * Stage 1 -> Stage 2: Thử file ảnh local .webp (/game_icons/${slug}.webp)
 * Stage 2 -> Stage 3: Thử file ảnh local .jpg (/game_icons/${slug}.jpg)
 * Stage 3 -> Stage 4: Logo thương hiệu mặc định (/logo.png)
 */
export function handleUpcomingImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  game: { slug?: string; id?: string; iconUrl?: string; icon_url?: string } | null | undefined
): void {
  const target = e.target as HTMLImageElement;
  const stage = parseInt(target.getAttribute('data-error-stage') || '0', 10);
  const raw = (game?.iconUrl || game?.icon_url || '').trim();
  const slug = (game?.slug || game?.id || '').trim();

  if (stage === 0) {
    target.setAttribute('data-error-stage', '1');
    // Nếu vừa thử qua Edge Proxy mà lỗi, thử tải trực tiếp link gốc không qua proxy
    if (raw.startsWith('http') && target.src.includes('/api/game-icon')) {
      target.src = raw;
      return;
    }
    // Nếu vừa thử link gốc trực tiếp mà lỗi, thử qua Edge Proxy
    if (raw.startsWith('http') && !target.src.includes('/api/game-icon')) {
      target.src = `/api/game-icon?slug=${encodeURIComponent(slug)}&url=${encodeURIComponent(raw)}`;
      return;
    }
    // Ngược lại thử file local webp
    target.src = slug ? `/game_icons/${slug}.webp` : '/logo.png';
  } else if (stage === 1) {
    target.setAttribute('data-error-stage', '2');
    target.src = slug ? `/game_icons/${slug}.webp` : '/logo.png';
  } else if (stage === 2) {
    target.setAttribute('data-error-stage', '3');
    target.src = slug ? `/game_icons/${slug}.jpg` : '/logo.png';
  } else {
    target.setAttribute('data-error-stage', '4');
    target.src = '/logo.png';
  }
}
