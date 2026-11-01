/**
 * News Validation Service
 * Validates cover URLs, prevents title-derived fake icon paths, and blocks 404 broken covers.
 */

export const THEMATIC_NEWS_COVERS = [
  { path: '/news_covers/thi-truong-game-viet-nam.webp', label: 'Thị trường Game Việt Nam (Mặc định chuẩn)' },
  { path: '/news_covers/cktg-2026-esports.webp', label: 'Esports & CKTG 2026' },
  { path: '/news_covers/apple-arcade-games.webp', label: 'Apple Arcade & Mobile Games' },
  { path: '/news_covers/game-offline-hay.webp', label: 'Game Offline & Độc Lập' },
  { path: '/news_covers/qua-tang-giftcode-vip.webp', label: 'Sự Kiện & Giftcode VIP' },
  { path: '/news_covers/xac-thuc-tai-khoan-game.webp', label: 'Hướng Dẫn & Bảo Mật Tài Khoản' },
  { path: '/news_covers/nhan-luc-nganh-game.webp', label: 'Công Nghệ & Ngành Game' },
  { path: '/news_covers/blv-esports-viet-nam.webp', label: 'Cộng Đồng & Bình Luận Viên' },
  { path: '/news_covers/board-game-van-hoa-viet.webp', label: 'Board Game Văn Hóa Việt' },
  { path: '/news_covers/xbox-games-collection.webp', label: 'Xbox Games Collection' },
  { path: '/news_covers/volleyball-journey.webp', label: 'Volleyball Journey' },
  { path: '/news_covers/ride-storm.webp', label: 'Ride Storm' },
  { path: '/news_covers/only-sword.webp', label: 'Only Sword' },
  { path: '/news_covers/my-anime-mine.webp', label: 'My Anime Mine' },
  { path: '/news_covers/cameraman-tower-defense.webp', label: 'Cameraman Tower Defense' },
  { path: '/news_covers/build-a-golem.webp', label: 'Build A Golem' },
  { path: '/news_covers/24-hours-overnight.webp', label: '24 Hours Overnight' },
];

export const BANNED_COVER_PATTERNS = [
  /moi-va-huong-dan/i,
  /huong-dan-cach-nhap/i,
  /tong-hop-giftcode/i,
  /cam-nang/i,
  /tat-tan-tat/i,
  /bang-xep-hang/i,
  /danh-sach-code/i,
];

export const VALID_IMAGE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png', '.svg', '.gif'];

export async function validateInternalCoverUrl(
  coverUrl: string | undefined | null,
  requestUrl?: string,
  assets?: { fetch: (req: Request) => Promise<Response> }
): Promise<{ valid: boolean; error?: string }> {
  if (!coverUrl || !coverUrl.trim()) {
    // Empty cover_url is permitted; server will assign default /news_covers/thi-truong-game-viet-nam.webp
    return { valid: true };
  }

  const clean = coverUrl.trim();

  // 1. External URL validation
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      new URL(clean);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Đường dẫn ảnh cover_url không phải URL hợp lệ' };
    }
  }

  // 2. Must start with '/'
  if (!clean.startsWith('/')) {
    return {
      valid: false,
      error: 'Đường dẫn ảnh nội bộ phải bắt đầu bằng dấu "/" (ví dụ /game_icons/... hoặc /news_covers/...)',
    };
  }

  // 3. Must have a valid image extension
  const hasValidExt = VALID_IMAGE_EXTENSIONS.some((ext) => clean.toLowerCase().endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Ảnh cover_url phải có phần mở rộng hợp lệ (.webp, .jpg, .jpeg, .png, .svg)',
    };
  }

  // 4. Ban cover_url derived from article title
  for (const pattern of BANNED_COVER_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        valid: false,
        error: `cover_url không hợp lệ (${clean}): Nghi ngờ tự sinh từ tiêu đề bài viết. Chỉ được dùng icon game thật hoặc ảnh chuyên đề chuẩn trong /news_covers/.`,
      };
    }
  }

  // 5. If assets fetcher is available, verify file exists on edge
  if (assets && typeof assets.fetch === 'function' && requestUrl) {
    try {
      const origin = new URL(requestUrl).origin;
      const cleanPath = clean.split('?')[0];
      const checkReq = new Request(`${origin}${cleanPath}`, { method: 'HEAD' });
      const res = await assets.fetch(checkReq);
      if (res && res.status >= 400) {
        return {
          valid: false,
          error: `Ảnh nội bộ không tồn tại trên hệ thống (${res.status} Not Found): ${clean}. Vui lòng chọn ảnh có sẵn hoặc dùng /news_covers/thi-truong-game-viet-nam.webp.`,
        };
      }
    } catch {
      // ignore network errors in asset checking
    }
  }

  return { valid: true };
}
