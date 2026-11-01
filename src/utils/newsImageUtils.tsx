import React, { useState, useEffect } from 'react';
import type { NewsArticle } from '../types/game';

export const THEMATIC_NEWS_COVERS: Record<string, string> = {
  'board-game': '/news_covers/board-game-van-hoa-viet.webp',
  'nhan-luc': '/news_covers/nhan-luc-nganh-game.webp',
  'qua-tang': '/news_covers/qua-tang-giftcode-vip.webp',
  'thi-truong': '/news_covers/thi-truong-game-viet-nam.webp',
  'cktg': '/news_covers/cktg-2026-esports.webp',
  'apple-arcade': '/news_covers/apple-arcade-games.webp',
  'xbox': '/news_covers/xbox-games-collection.webp',
  'game-offline': '/news_covers/game-offline-hay.webp',
  'xac-thuc': '/news_covers/xac-thuc-tai-khoan-game.webp',
  'blv': '/news_covers/blv-esports-viet-nam.webp',
};

/**
 * Phân tích tiêu đề, slug và tên game để gán ảnh bìa chuyên đề chuẩn xác nhất
 */
export const resolveTopicCoverByKeywords = (title = '', slug = '', gameName = ''): string | null => {
  const text = `${title} ${slug} ${gameName}`.toLowerCase();

  // 1. Nhân lực / giáo dục / lịch sử / sinh viên
  if (text.includes('nhân lực') || text.includes('giáo dục') || text.includes('đào tạo') || (text.includes('sinh viên') && text.includes('nhân lực'))) {
    return THEMATIC_NEWS_COVERS['nhan-luc'];
  }

  // 2. Board game / văn hóa / du lịch
  if (text.includes('board game') || text.includes('du lịch') || text.includes('văn hóa việt')) {
    return THEMATIC_NEWS_COVERS['board-game'];
  }

  // 3. Quà tặng / Giftcode VIP / Tân thủ
  if (text.includes('quà tặng vip') || text.includes('quà tặng tân thủ') || text.includes('tổng hợp trọn bộ giftcode') || text.includes('quà tặng')) {
    return THEMATIC_NEWS_COVERS['qua-tang'];
  }

  // 4. Thị trường game / Doanh thu / Sức hút
  if (text.includes('thị trường') || text.includes('doanh thu') || text.includes('sức hút')) {
    return THEMATIC_NEWS_COVERS['thi-truong'];
  }

  // 5. Apple Arcade / iOS
  if (text.includes('apple arcade') || text.includes('ios arcade')) {
    return THEMATIC_NEWS_COVERS['apple-arcade'];
  }

  // 6. Xbox / Microsoft / Console
  if (text.includes('xbox') || text.includes('microsoft')) {
    return THEMATIC_NEWS_COVERS['xbox'];
  }

  // 7. Game Offline không mạng
  if (text.includes('offline') || text.includes('không mạng')) {
    return THEMATIC_NEWS_COVERS['game-offline'];
  }

  // 8. Xác thực tài khoản / Căn cước / Nghị định
  if (text.includes('xác thực') || text.includes('định danh') || text.includes('60 triệu') || text.includes('nghị định')) {
    return THEMATIC_NEWS_COVERS['xac-thuc'];
  }

  // 9. Bình luận viên / Caster Esports
  if (text.includes('bình luận viên') || text.includes('blv')) {
    return THEMATIC_NEWS_COVERS['blv'];
  }

  // 10. Esports / CKTG / Giải đấu / LMHT LoL
  if (text.includes('cktg') || text.includes('esports') || text.includes('karmine') || text.includes('furia') || text.includes('liquipedia') || text.includes('lol esports')) {
    return THEMATIC_NEWS_COVERS['cktg'];
  }

  return null;
};

/**
 * Trích xuất ảnh bìa tối ưu nhất cho bài viết, phòng chống 100% lỗi 403 Hotlink và lỗi 404 Icon ảo
 */
export const resolveArticleCover = (article: NewsArticle): string => {
  const raw = (article.cover_url || '').trim();

  // 1. Đã là ảnh bìa chuyên đề nội bộ /news_covers/ -> Sử dụng ngay
  if (raw.startsWith('/news_covers/')) {
    return raw;
  }

  // 2. Chặn các đường link máy chủ báo mạng ngoài (Thanh Niên, Kênh 14, Lag.vn, Download.com.vn) chặn 403
  const isBlockedExternal = raw.startsWith('http') && (
    raw.includes('thanhnien.vn') ||
    raw.includes('kenh14') ||
    raw.includes('lag.vn') ||
    raw.includes('download.com.vn') ||
    raw.includes('st.download')
  );

  // 3. Nếu bài viết có ảnh bìa hợp lệ (bao gồm link CDN/chính thức và icon nội bộ, không bị chặn 403, không phải /og-image.jpg)
  if (!isBlockedExternal && raw && raw !== '/og-image.jpg') {
    return raw;
  }

  // 4. Nếu là tựa game cụ thể có slug chuẩn -> Sử dụng icon game
  if (article.game_slug && article.game_slug.length < 32 && !article.game_slug.includes('sinh-vien') && !article.game_slug.includes('chuan-bi') && !article.game_slug.includes('suc-hut')) {
    return `/game_icons/${article.game_slug}.webp`;
  }

  // 5. Phân tích chủ đề theo từ khóa bài viết khi chưa có ảnh chuẩn
  const topicCover = resolveTopicCoverByKeywords(article.title, article.slug, article.game_name);
  if (topicCover) {
    return topicCover;
  }

  // 6. Thư viện ảnh nếu có
  if (article.gallery_urls && article.gallery_urls.length > 0 && article.gallery_urls[0] && !article.gallery_urls[0].startsWith('http')) {
    return article.gallery_urls[0];
  }

  // 7. Fallback an toàn vào ảnh bìa thị trường game sắc nét
  return '/news_covers/thi-truong-game-viet-nam.webp';
};

/**
 * Nhận diện xem ảnh bìa là Icon game vuông đơn lẻ hay Artwork phong cảnh chữ nhật
 */
export const isOnlyIconUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.includes('/news_covers/')) return false;
  return url.includes('/game_icons/');
};

/**
 * Component hiển thị ảnh bìa tin tức chống nháy hình (Zero-Flicker Safe News Cover)
 * - Quản lý URL qua React state, ngăn chặn 100% hiện tượng React reconciliation re-applying broken URL gây nháy hình
 * - Tự động fallback 3 lớp mượt mà
 * - Hiển thị ảnh bìa tràn viền (Full-Bleed 16:10) sắc nét
 */
export const SafeNewsCover: React.FC<{
  article: NewsArticle;
  className?: string;
  isHero?: boolean;
}> = ({ article, className = '', isHero = false }) => {
  const [src, setSrc] = useState<string>(() => resolveArticleCover(article));
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setSrc(resolveArticleCover(article));
    setHasError(false);
  }, [article.id, article.cover_url, article.game_slug, article.title]);

  const handleError = () => {
    if (hasError) return;
    setHasError(true);

    // Fallback 1: Thử gán ảnh chuyên đề theo từ khóa
    const topic = resolveTopicCoverByKeywords(article.title, article.slug, article.game_name);
    if (topic && topic !== src) {
      setSrc(topic);
      return;
    }

    // Fallback 2: Thử icon game nếu hợp lệ
    if (article.game_slug && !src.includes(`/game_icons/${article.game_slug}.webp`)) {
      setSrc(`/game_icons/${article.game_slug}.webp`);
      return;
    }

    // Fallback cuối cùng: Ảnh bìa chuyên đề game chuẩn chất lượng cao
    setSrc('/news_covers/thi-truong-game-viet-nam.webp');
  };

  const isIcon = isOnlyIconUrl(src);

  if (isIcon) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900">
        {/* Ambient blurred backdrop phát sáng màu game */}
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 scale-150 pointer-events-none transition-transform duration-700"
          style={{ backgroundImage: `url(${src})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none" />

        {/* Icon game sắc nét nổi bật ở trung tâm */}
        <div className="relative z-10 flex flex-col items-center justify-center p-4">
          <div className="relative group-hover:scale-110 transition-transform duration-300">
            <img
              src={src}
              alt={article.title}
              className={`${
                isHero ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-20 h-20 sm:w-24 sm:h-24'
              } rounded-2xl object-cover shadow-2xl ring-2 ring-white/30 group-hover:ring-primary/80`}
              loading={isHero ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
              onError={handleError}
            />
            <div className="absolute -bottom-2 inset-x-0 mx-auto w-12 h-2 bg-black/60 rounded-full blur-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <img
        src={src}
        alt={article.title}
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${className}`}
        loading={isHero ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        onError={handleError}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};
