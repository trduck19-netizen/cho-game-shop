import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Gift,
  Copy,
  Check,
  Share2,
  Tag,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ExternalLink,
  ChevronUp,
} from 'lucide-react';
import type { NewsArticle, GameItem, UpcomingGame } from '../types/game';
import { newsService } from '../services/newsService';
import { marketingService } from '../services/marketingService';
import { dataService } from '../services/dataService';
import { optimizeImageUrl } from '../utils/imageCompressor';

export interface NewsDetailModalProps {
  article: NewsArticle | null;
  onClose: () => void;
  onSelectGameSlug?: (slug: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onSelectArticle?: (article: NewsArticle) => void;
  allArticles?: NewsArticle[];
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

interface ExtractedCode {
  code: string;
  reward?: string;
}

interface ParsedSection {
  id: string;
  title: string;
  number?: string;
  cleanTitle: string;
  content: string;
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  article,
  onClose,
  onSelectGameSlug,
  onShowToast,
  onSelectArticle,
  allArticles = [],
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState(0);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Copy code handler with real tracking & feedback
  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    marketingService.recordRealCopy(article?.title || 'Giftcode Tin Tức', article?.slug || '', 1);
    setCopiedCode(code);
    onShowToast(`Đã sao chép mã code!`, code, 'success');
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  // Share article link handler
  const handleShare = async () => {
    if (!article) return;
    const origin =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? window.location.origin
        : 'https://codegame.shop';
    const url = `${origin}/news/${article.slug}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || article.title,
          url: url,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      onShowToast('Đã sao chép liên kết bài viết!', url, 'success');
    }
  };

  // 1. Look up matched game and real release date from catalog and upcoming games
  const { matchedGame, realReleaseDate } = useMemo(() => {
    if (!article) return { matchedGame: null, realReleaseDate: null };

    const allGames = dataService.getGames() || [];
    const upcomingGames = dataService.getUpcomingGamesSync() || [];

    let mg: GameItem | UpcomingGame | null = null;
    let rDate: string | null = null;

    // Check by article.game_slug
    if (article.game_slug) {
      const slugLower = article.game_slug.toLowerCase().trim();
      mg = allGames.find((g) => g.slug?.toLowerCase() === slugLower || g.id?.toLowerCase() === slugLower) || null;
      if (!mg) {
        const up = upcomingGames.find((u) => u.slug?.toLowerCase() === slugLower || u.id?.toLowerCase() === slugLower);
        if (up) {
          mg = up as any;
          if (up.releaseDate) rDate = up.releaseDate;
        }
      }
    }

    // Check by article.game_name
    if (!mg && article.game_name) {
      const nameLower = article.game_name.trim().toLowerCase();
      mg = allGames.find((g) => g.name?.trim().toLowerCase() === nameLower) || null;
      if (!mg) {
        const up = upcomingGames.find((u) => u.name?.trim().toLowerCase() === nameLower);
        if (up) {
          mg = up as any;
          if (up.releaseDate) rDate = up.releaseDate;
        }
      }
    }

    // Check by article.tags
    if (!mg && Array.isArray(article.tags)) {
      for (const tag of article.tags) {
        const tLower = tag.trim().toLowerCase();
        const byCatalog = allGames.find((g) => g.name?.trim().toLowerCase() === tLower || g.slug?.toLowerCase() === tLower);
        if (byCatalog) {
          mg = byCatalog;
          break;
        }
        const byUpcoming = upcomingGames.find((u) => u.name?.trim().toLowerCase() === tLower || u.slug?.toLowerCase() === tLower);
        if (byUpcoming) {
          mg = byUpcoming as any;
          if (byUpcoming.releaseDate) rDate = byUpcoming.releaseDate;
          break;
        }
      }
    }

    // If game matched in catalog, check if upcoming has its release date or catalog has release_date
    if (mg && !rDate) {
      const up = upcomingGames.find(
        (u) => u.slug?.toLowerCase() === (mg as any).slug?.toLowerCase() || u.name?.trim().toLowerCase() === (mg as any).name?.trim().toLowerCase()
      );
      if (up?.releaseDate) {
        rDate = up.releaseDate;
      } else if ((mg as any).release_date) {
        rDate = (mg as any).release_date;
      }
    }

    // Check if article itself holds a release date
    if (!rDate && (article as any).release_date) {
      rDate = (article as any).release_date;
    }
    if (!rDate && (article as any).releaseDate) {
      rDate = (article as any).releaseDate;
    }

    return { matchedGame: mg, realReleaseDate: rDate };
  }, [article]);

  // 2. Parse sections and TOC from ## headings
  const { sections, introContent } = useMemo(() => {
    if (!article || !article.content) {
      return { sections: [], introContent: '' };
    }

    const raw = article.content;
    const parts = raw.split(/(?=^##\s+)/m);
    let intro = '';
    const parsed: ParsedSection[] = [];

    parts.forEach((part, idx) => {
      const trimmed = part.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('## ')) {
        const lines = trimmed.split('\n');
        const headingLine = lines[0].replace(/^##\s+/, '').trim();
        const body = lines.slice(1).join('\n').trim();

        // Extract section number if present (e.g. "1. Hai tên, một game" -> number: "01", cleanTitle: "Hai tên, một game")
        const numMatch = headingLine.match(/^(\d+)[\.\-\:]\s*(.+)$/);
        let numStr: string | undefined;
        let cleanTitle = headingLine;
        if (numMatch) {
          const n = parseInt(numMatch[1], 10);
          numStr = n < 10 ? `0${n}` : `${n}`;
          cleanTitle = numMatch[2].trim();
        }

        parsed.push({
          id: `section-${idx}`,
          title: headingLine,
          number: numStr,
          cleanTitle,
          content: body,
        });
      } else if (idx === 0) {
        intro = trimmed;
      }
    });

    return { sections: parsed, introContent: intro };
  }, [article?.content]);

  // Extract Key Takeaways ("Điểm cần đọc trước") from intro content or article excerpt
  const keyTakeaways = useMemo(() => {
    if (!introContent && !article?.excerpt) return '';
    if (introContent) {
      const match = introContent.match(/(?:\*\*Tóm tắt:\*\*|Tóm tắt:)\s*(.+?)(?:\n\n|$)/s);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }
    return article?.excerpt || '';
  }, [introContent, article?.excerpt]);

  // 3. Extract giftcodes from article.codes AND from markdown tables in content
  const allExtractedCodes = useMemo<ExtractedCode[]>(() => {
    if (!article) return [];
    const codeMap = new Map<string, ExtractedCode>();

    // Source A: article.codes array
    if (Array.isArray(article.codes)) {
      article.codes.forEach((c) => {
        const clean = String(c).trim();
        if (clean && !codeMap.has(clean.toUpperCase())) {
          codeMap.set(clean.toUpperCase(), { code: clean });
        }
      });
    }

    // Source B: Parse markdown tables in content for rows with code columns
    if (article.content) {
      const lines = article.content.split('\n');
      for (let i = 0; i < lines.length - 2; i++) {
        const hLine = lines[i].trim();
        const sLine = lines[i + 1].trim();
        if (hLine.startsWith('|') && sLine.startsWith('|') && sLine.includes('---')) {
          const headers = hLine.split('|').map((h) => h.trim()).filter(Boolean);
          const codeColIdx = headers.findIndex((h) => /mã|giftcode|code/i.test(h));
          const rewardColIdx = headers.findIndex((h) => /thưởng|phần thưởng|quà|reward|vật phẩm/i.test(h));

          if (codeColIdx !== -1) {
            let j = i + 2;
            while (j < lines.length && lines[j].trim().startsWith('|')) {
              const cells = lines[j].split('|').map((c) => c.trim()).filter(Boolean);
              const rawCode = cells[codeColIdx];
              const rawReward = rewardColIdx !== -1 ? cells[rewardColIdx] : undefined;

              if (rawCode && rawCode.length >= 3 && rawCode.length <= 40 && !rawCode.includes(' ')) {
                const codeKey = rawCode.toUpperCase();
                if (!codeMap.has(codeKey)) {
                  codeMap.set(codeKey, { code: rawCode, reward: rawReward });
                }
              }
              j++;
            }
          }
        }
      }
    }

    return Array.from(codeMap.values());
  }, [article?.codes, article?.content]);

  // 4. Related articles (max 4, matching game or tags, excluding current)
  const relatedArticles = useMemo(() => {
    if (!article) return [];
    return allArticles
      .filter((a) => {
        if (a.id === article.id || a.slug === article.slug) return false;
        const sameGame =
          (article.game_slug && a.game_slug && a.game_slug === article.game_slug) ||
          (article.game_name && a.game_name && a.game_name.trim().toLowerCase() === article.game_name.trim().toLowerCase());
        const sameTag = Array.isArray(a.tags) && Array.isArray(article.tags) && a.tags.some((t) => article.tags?.includes(t));
        return sameGame || sameTag;
      })
      .slice(0, 4);
  }, [article, allArticles]);

  // 5. Scroll tracking for TOC highlight and Reading Progress Bar
  useEffect(() => {
    const handleWindowScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const pct = (window.scrollY / scrollHeight) * 100;
        setReadingProgress(Math.min(100, Math.max(0, pct)));
      }

      // Track active section
      let currentId = '';
      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160) {
            currentId = sec.id;
          }
        }
      }
      if (currentId) setActiveHeadingId(currentId);
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    handleWindowScroll();
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -140;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveHeadingId(id);
    }
  };

  // Determine effective cover URL (article cover -> game icon -> none)
  const effectiveCoverUrl = useMemo(() => {
    if (!article) return '';
    if (article.cover_url && article.cover_url.trim()) return article.cover_url.trim();
    if (matchedGame?.icon_url && matchedGame.icon_url.trim()) return matchedGame.icon_url.trim();
    if ((matchedGame as any)?.iconUrl && (matchedGame as any).iconUrl.trim()) return (matchedGame as any).iconUrl.trim();
    if (article.game_slug) return `/game_icons/${article.game_slug}.webp`;
    return '/news_covers/thi-truong-game-viet-nam.webp';
  }, [article, matchedGame]);

  const [coverSrc, setCoverSrc] = useState<string>(() => {
    return effectiveCoverUrl || '/news_covers/thi-truong-game-viet-nam.webp';
  });
  const [coverError, setCoverError] = useState<boolean>(false);

  useEffect(() => {
    setCoverSrc(effectiveCoverUrl || '/news_covers/thi-truong-game-viet-nam.webp');
    setCoverError(false);
  }, [effectiveCoverUrl]);

  const handleHeroCoverError = () => {
    if (coverError) return;
    setCoverError(true);
    const fallbackUrl = '/news_covers/thi-truong-game-viet-nam.webp';
    setCoverSrc(fallbackUrl);

    // Ghi nhận log bài viết kích hoạt ảnh dự phòng để Quản trị viên dễ dàng phát hiện và sửa gốc
    try {
      console.warn('[News Detail Image Fallback Activated]:', {
        articleId: article.id,
        slug: article.slug,
        brokenCover: effectiveCoverUrl,
        fallbackUrl,
      });
      if (typeof window !== 'undefined') {
        const key = 'wcg_news_fallback_log_v1';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        if (!existing.some((item: any) => item.articleId === article.id)) {
          existing.push({
            articleId: article.id,
            slug: article.slug,
            title: article.title,
            brokenCover: effectiveCoverUrl,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem(key, JSON.stringify(existing.slice(-100)));
          window.dispatchEvent(new CustomEvent('wcg_news_fallback_logged'));
        }
      }
    } catch {}
  };

  if (!article) return null;

  const formattedDate = new Date(article.published_at || (article as any).created_at || Date.now()).toLocaleDateString(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  );

  return (
    <div className="w-full min-h-screen bg-slate-950 text-foreground animate-fade-in select-text pb-24">
      {/* ========================================================= */}
      {/* 1. TOP STICKY BAR: BREADCRUMBS, PROGRESS, SHARE, GIFTCODE */}
      {/* ========================================================= */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-border/80 shadow-md">
        {/* 2.5px Reading Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-border/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-indigo-400 to-emerald-400 transition-all duration-150 ease-out"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* Top Control Row */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Back button and breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border/80 transition-all text-xs sm:text-sm font-bold shrink-0 cursor-pointer shadow-xs active:scale-95 group"
              title="Quay lại danh sách tin tức"
            >
              <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
              <span>Quay lại danh sách tin tức</span>
            </button>

            <nav className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <span>/</span>
              <span className="text-foreground/90 font-medium truncate max-w-sm lg:max-w-md">
                {article.title}
              </span>
            </nav>
          </div>

          {/* Quick Actions: Giftcode & Share */}
          <div className="flex items-center gap-2 shrink-0">
            {allExtractedCodes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('giftcodes-widget');
                  if (el) {
                    const yOffset = -140;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>Giftcode ({allExtractedCodes.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border/80 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 active:scale-95 shadow-xs"
              title="Chia sẻ liên kết bài viết"
            >
              <Share2 className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>
          </div>
        </div>

        {/* 2. STICKY SECTION NAVBAR (AUTO-GENERATED FROM ## HEADINGS) */}
        {sections.length > 0 && (
          <div className="border-t border-border/60 bg-slate-900/60 backdrop-blur-xs">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none touch-pan-x -mx-1 px-1">
                {sections.map((sec, sIdx) => {
                  const isActive = activeHeadingId === sec.id;
                  const secNum = sec.number || (sIdx + 1 < 10 ? `0${sIdx + 1}` : `${sIdx + 1}`);
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        isActive
                          ? 'bg-primary text-white shadow-glow-primary scale-102'
                          : 'bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-mono px-1 py-0.2 rounded font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {secNum}
                      </span>
                      <span>{sec.cleanTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MAIN CONTAINER (AIRY, WIDE, NO DISTRACTING MODAL FRAMES)   */}
      {/* ========================================================= */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 space-y-8 sm:space-y-10">
        {/* ========================================================= */}
        {/* 3. HERO HEADER (2 COLUMNS DESKTOP, STACKED MOBILE)        */}
        {/* ========================================================= */}
        <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-card/70 border border-border/80 shadow-md space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Cột trái 1 (Desktop) / Phần 1 (Mobile): Title & Date Badge */}
            <div className="lg:col-span-7 order-1 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary-light text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Nghiên cứu & Cập nhật: {formattedDate}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black font-display tracking-tight text-foreground leading-[1.18]">
                {article.title}
              </h1>
            </div>

            {/* Cột phải (Desktop) / Phần 2 (Mobile): Cover Image Banner */}
            {coverSrc && (
              <div className="lg:col-span-5 lg:row-span-2 order-2">
                <div className="relative w-full aspect-video lg:aspect-[4/3] rounded-3xl overflow-hidden border border-border/80 shadow-xl bg-slate-900 group">
                  <img
                    src={optimizeImageUrl(coverSrc, 1000)}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    loading="eager"
                    decoding="async"
                    onError={handleHeroCoverError}
                  />
                  {/* Official Watermark Badge */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/20 shadow-lg text-[11px] font-bold text-white select-none">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CodeGame.Shop • Tổng Hợp</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cột trái 2 (Desktop) / Phần 3 (Mobile): Excerpt & Điểm cần đọc trước */}
            <div className={`order-3 space-y-4 ${coverSrc ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
              {article.excerpt && (
                <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed italic border-l-2 border-primary/60 pl-3">
                  {article.excerpt}
                </p>
              )}

              {/* Hộp "Điểm cần đọc trước" (Key Takeaways) nổi bật */}
              {keyTakeaways && keyTakeaways !== article.excerpt && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Điểm cần đọc trước</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                    {keyTakeaways}
                  </p>
                </div>
              )}
            </div>

            {/* Hàng thông tin Meta Row (Full Width dưới 2 cột, Order 4 Mobile) */}
            <div className="col-span-1 lg:col-span-12 order-4 pt-4 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {formattedDate}
                </span>

                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {article.read_time_minutes || 3} phút đọc
                </span>

                {article.views !== undefined && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-teal-400" />
                      {article.views.toLocaleString()} lượt xem
                    </span>
                  </>
                )}

                {article.game_name && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (matchedGame && onSelectGameSlug) {
                          onSelectGameSlug(matchedGame.slug);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/30 font-bold text-[11px] hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {article.game_name}
                    </button>
                  </>
                )}

                {article.is_hot && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    <Flame className="w-3 h-3 text-rose-400" />
                    Tin Hot
                  </span>
                )}

                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 ml-auto pt-1 sm:pt-0">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-muted/50 text-muted-foreground border border-border/60 hover:text-foreground transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. KHỐI ĐẾM NGƯỢC (CHỈ HIỆN KHI CÓ NGÀY THẬT TRONG DATA) */}
        {/* ========================================================= */}
        {realReleaseDate && (
          <CountdownWidget
            releaseDate={realReleaseDate}
            gameName={matchedGame?.name || article.game_name}
          />
        )}

        {/* ========================================================= */}
        {/* 5. KHỐI MÃ QUÀ TẶNG & NÚT SAO CHÉP (GIFTCODES WIDGET)   */}
        {/* ========================================================= */}
        {allExtractedCodes.length > 0 && (
          <div
            id="giftcodes-widget"
            className="scroll-mt-36 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-card to-amber-950/30 border border-primary/40 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary-light flex items-center justify-center font-bold">
                  <Gift className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    Danh Sách Mã Giftcode Quà Tặng ({allExtractedCodes.length})
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-accent text-white font-bold">
                      HOT
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Bấm sao chép để nhận ngay quà tặng khởi đầu thuận lợi trong game
                  </p>
                </div>
              </div>

              {matchedGame && onSelectGameSlug && (
                <button
                  type="button"
                  onClick={() => onSelectGameSlug(matchedGame.slug)}
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Xem kho code {matchedGame.name} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Codes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {allExtractedCodes.map(({ code, reward }) => {
                const isCopied = copiedCode === code;
                return (
                  <div
                    key={code}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/80 hover:border-primary/60 transition-all group"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-mono font-black text-amber-300 text-sm sm:text-base tracking-wider select-all block truncate">
                        {code}
                      </span>
                      {reward ? (
                        <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={reward}>
                          {reward}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
                          ✓ Mã quà tặng khả dụng
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(code)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs ${
                        isCopied
                          ? 'bg-emerald-500 text-white shadow-glow-emerald'
                          : 'bg-primary hover:bg-primary-hover text-white'
                      }`}
                      title="Sao chép mã"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. THÂN BÀI (SECTION CARDS VÀ CARD GRIDS CHO CÁC MỤC)      */}
        {/* ========================================================= */}
        <div className="space-y-8">
          {/* Intro paragraph if present before section 1 and distinct */}
          {introContent && !introContent.startsWith('**Tóm tắt:**') && (
            <div className="p-6 sm:p-8 rounded-3xl bg-card/70 border border-border/80 text-foreground/90 leading-relaxed text-sm sm:text-base space-y-4">
              <RenderMarkdownContent
                rawText={introContent}
                onCopyCode={handleCopyCode}
                copiedCode={copiedCode}
              />
            </div>
          )}

          {/* Individual Section Cards */}
          {sections.map((sec, sIdx) => {
            const secNum = sec.number || (sIdx + 1 < 10 ? `0${sIdx + 1}` : `${sIdx + 1}`);
            return (
              <section
                key={sec.id}
                id={sec.id}
                className="scroll-mt-36 p-6 sm:p-8 lg:p-10 rounded-3xl bg-card/70 border border-border/80 shadow-sm space-y-6 hover:border-border transition-colors"
              >
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                  <span className="px-2.5 py-1 rounded-xl bg-primary/15 text-primary font-mono text-xs sm:text-sm font-black shrink-0">
                    {secNum}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-foreground leading-snug">
                    {sec.cleanTitle}
                  </h2>
                </div>

                {/* Section Body */}
                <div className="text-foreground/90 text-sm sm:text-base leading-relaxed sm:leading-loose space-y-4">
                  <RenderMarkdownContent
                    rawText={sec.content}
                    onCopyCode={handleCopyCode}
                    copiedCode={copiedCode}
                  />
                </div>
              </section>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 7. THẺ GAME LIÊN QUAN (NẾU KHỚP GAME TRONG DANH MỤC)      */}
        {/* ========================================================= */}
        {matchedGame && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-card via-card to-primary/10 border border-primary/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <img
                src={
                  matchedGame.icon_url ||
                  (matchedGame as any).iconUrl ||
                  `/game_icons/${matchedGame.slug}.webp`
                }
                alt={matchedGame.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-primary/40 shadow-sm shrink-0"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-base sm:text-lg text-foreground truncate">
                    {matchedGame.name}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary-light border border-primary/30 shrink-0">
                    {matchedGame.category || (matchedGame as any).genre || 'Game Bản Quyền'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Nhà phát hành: <strong className="text-foreground">{matchedGame.publisher || 'Chính thức'}</strong>
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    ★ {matchedGame.rating || 5.0}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">
                    {matchedGame.codes_count || (matchedGame as any).free_codes_count || 10}+ mã quà tặng
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSelectGameSlug) {
                  onSelectGameSlug(matchedGame.slug);
                } else if (typeof window !== 'undefined') {
                  window.location.href = `/game/${matchedGame.slug}`;
                }
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Xem Chi Tiết Game & Giftcode</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. KHỐI BÀI VIẾT LIÊN QUAN (TỐI ĐA 4 BÀI)                 */}
        {/* ========================================================= */}
        {relatedArticles.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Bài Viết Liên Quan Cùng Chủ Đề ({relatedArticles.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedArticles.map((rel) => {
                const relCover = rel.cover_url || (rel.game_slug ? `/game_icons/${rel.game_slug}.webp` : '');
                return (
                  <div
                    key={rel.id}
                    onClick={() => {
                      if (onSelectArticle) {
                        onSelectArticle(rel);
                      } else if (typeof window !== 'undefined') {
                        window.location.href = `/news/${rel.slug}`;
                      }
                    }}
                    className="group p-3.5 rounded-2xl bg-card/70 hover:bg-card border border-border/70 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md"
                  >
                    <div className="space-y-2.5">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-border/60">
                        <img
                          src={optimizeImageUrl(relCover || '/news_covers/thi-truong-game-viet-nam.webp', 400)}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (!target.src.includes('thi-truong-game-viet-nam.webp')) {
                              target.src = '/news_covers/thi-truong-game-viet-nam.webp';
                            }
                          }}
                        />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                        {rel.title}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-2.5 border-t border-border/40">
                      <span>
                        {new Date(rel.published_at || (rel as any).created_at || Date.now()).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                        Đọc tiếp →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 9. DÒNG NGUỒN Ở CUỐI BÀI: Nguồn: CodeGame.Shop             */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card/70 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-foreground">Nguồn: CodeGame.Shop</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Bản quyền nội dung: CodeGame.Shop</span>
            <span>•</span>
            <span>Cập nhật: {formattedDate}</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 10. BOTTOM NAVIGATION CONTROLS                            */}
        {/* ========================================================= */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-card hover:bg-muted text-foreground border border-border/80 transition-all font-bold text-xs sm:text-sm cursor-pointer shadow-xs active:scale-95 group"
          >
            <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
            <span>Quay lại danh sách tin tức</span>
          </button>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary-light border border-primary/25 transition-all font-bold text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            <ChevronUp className="w-4 h-4" />
            <span>Lên đầu trang</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: REAL RELEASE DATE COUNTDOWN WIDGET
// =========================================================================
interface CountdownWidgetProps {
  releaseDate: string;
  gameName?: string;
}

const CountdownWidget: React.FC<CountdownWidgetProps> = ({ releaseDate, gameName }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPassed: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: false });

  useEffect(() => {
    const calculate = () => {
      let targetMs = Date.parse(releaseDate);
      if (isNaN(targetMs)) {
        const parts = releaseDate.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
        if (parts) {
          const year = parseInt(parts[1], 10);
          const month = parseInt(parts[2], 10) - 1;
          const day = parseInt(parts[3], 10);
          const hour = parts[4] ? parseInt(parts[4], 10) : 9;
          const min = parts[5] ? parseInt(parts[5], 10) : 0;
          targetMs = new Date(year, month, day, hour, min).getTime();
        }
      }

      if (isNaN(targetMs)) return;

      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPassed: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [releaseDate]);

  const targetDateDisplay = useMemo(() => {
    const d = new Date(releaseDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    return releaseDate;
  }, [releaseDate]);

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-primary/15 via-card to-indigo-950/40 border border-primary/30 shadow-md space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary-light flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-light block">
              Lịch Ra Mắt Chính Thức
            </span>
            <h4 className="text-sm sm:text-base font-extrabold text-foreground">
              {timeLeft.isPassed ? `${gameName || 'Game'} Đã Ra Mắt Chính Thức!` : `Đếm Ngược Ra Mắt ${gameName || ''}`}
            </h4>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary-light">
          Ngày mở cửa: <strong className="text-foreground">{targetDateDisplay}</strong>
        </div>
      </div>

      {!timeLeft.isPassed && (
        <div className="grid grid-cols-4 gap-2.5 text-center pt-1">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-background/80 border border-border/80">
            <span className="block font-mono font-black text-xl sm:text-3xl text-primary-light">
              {timeLeft.days}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground">Ngày</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-background/80 border border-border/80">
            <span className="block font-mono font-black text-xl sm:text-3xl text-primary-light">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground">Giờ</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-background/80 border border-border/80">
            <span className="block font-mono font-black text-xl sm:text-3xl text-primary-light">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground">Phút</span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-2xl bg-background/80 border border-border/80">
            <span className="block font-mono font-black text-xl sm:text-3xl text-amber-400">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground">Giây</span>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: RENDER MARKDOWN CONTENT (TABLES, CALLOUTS, LISTS, CARDS)
// =========================================================================
interface RenderMarkdownContentProps {
  rawText: string;
  onCopyCode: (code: string) => void;
  copiedCode: string | null;
}

const getCategoryTag = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes('youtube') || t.includes('video')) return 'Video';
  if (t.includes('facebook') || t.includes('fanpage') || t.includes('discord')) return 'Cộng đồng';
  if (t.includes('trang tin') || t.includes('báo')) return 'Tin tức';
  if (t.includes('ngày') || t.includes('tháng') || t.includes('năm') || /\d{1,2}\/\d{1,2}/.test(t)) return 'Mốc thời gian';
  if (t.includes('quà') || t.includes('gift') || t.includes('code') || t.includes('thưởng')) return 'Phần thưởng';
  if (t.includes('truy kích') || t.includes('che chắn') || t.includes('cường hoá') || t.includes('độc') || t.includes('phản')) return 'Lối chơi';
  return 'Thông tin';
};

const parseCardItem = (raw: string) => {
  const clean = raw.trim().replace(/^[-*]\s+|\d+\.\s+/, '');
  // 1. Try colon or dash separator
  const colonMatch = clean.match(/^(\*\*[^*]+\*\*|[^\:—–]+)[\:—–]\s*(.+)$/s);
  if (colonMatch) {
    const title = colonMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
    const desc = colonMatch[2].trim();
    if (title.length <= 60 && desc.length > 0) {
      return { title, desc, tag: getCategoryTag(title) };
    }
  }
  // 2. Try comma separator for well-known prefixes
  if (clean.includes(',')) {
    const idx = clean.indexOf(',');
    const title = clean.slice(0, idx).trim();
    const desc = clean.slice(idx + 1).trim();
    if (title.length <= 60 && desc.length > 0) {
      return { title, desc, tag: getCategoryTag(title) };
    }
  }
  return { title: clean, desc: '', tag: getCategoryTag(clean) };
};

const RenderMarkdownContent: React.FC<RenderMarkdownContentProps> = ({ rawText, onCopyCode, copiedCode }) => {
  // Parse blocks: tables, callouts, lists, sub-headings, images, paragraphs
  const blocks = useMemo(() => {
    if (!rawText) return [];
    const result: Array<{ type: 'table' | 'paragraph' | 'image' | 'callout' | 'list' | 'heading3'; data: any }> = [];

    // Split text by double newlines
    const chunks = rawText.split(/\n\s*\n/);

    chunks.forEach((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return;

      // 1. Check Image ![alt](url)
      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        result.push({
          type: 'image',
          data: { alt: imgMatch[1], src: imgMatch[2] },
        });
        return;
      }

      // 2. Check Markdown Table
      if (trimmed.startsWith('|') && trimmed.includes('\n|')) {
        const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length >= 3) {
          const headerLine = lines[0];
          const separatorLine = lines[1];
          const isSeparator = separatorLine.includes('---');
          if (isSeparator) {
            const headers = headerLine.split('|').map((h) => h.trim()).filter(Boolean);
            const rows = lines.slice(2).map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));
            result.push({
              type: 'table',
              data: { headers, rows } as ParsedTable,
            });
            return;
          }
        }
      }

      // 3. Check Sub-heading ###
      if (trimmed.startsWith('### ')) {
        result.push({
          type: 'heading3',
          data: trimmed.replace(/^###\s+/, '').trim(),
        });
        return;
      }

      // 4. Check Callout Alert Box (starts with "Lưu ý:", "Chú ý:", "Cảnh báo:", "Quan trọng nhất:", "> ")
      const alertPrefixMatch = trimmed.match(/^(?:>\s*)?(Lưu ý quan trọng|Lưu ý|Chú ý|Cảnh báo|Quan trọng nhất|Rủi ro|Cảnh báo mã)[\:\-]?\s*(.*)$/is);
      if (alertPrefixMatch || trimmed.startsWith('> ')) {
        const prefix = alertPrefixMatch ? alertPrefixMatch[1] : 'Lưu ý';
        const body = alertPrefixMatch ? alertPrefixMatch[2] : trimmed.replace(/^>\s*/, '');
        result.push({
          type: 'callout',
          data: { prefix, body },
        });
        return;
      }

      // 5. Check List (- item or * item or 1. item)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split('\n').filter(Boolean);
        const isOrdered = /^\d+\.\s/.test(trimmed);
        result.push({
          type: 'list',
          data: {
            isOrdered,
            items: items.map((i) => i.replace(/^[-*]\s+|\d+\.\s+/, '')),
          },
        });
        return;
      }

      // 6. Normal paragraph
      result.push({
        type: 'paragraph',
        data: trimmed,
      });
    });

    return result;
  }, [rawText]);

  return (
    <>
      {blocks.map((block, idx) => {
        // Table renderer
        if (block.type === 'table') {
          const table = block.data as ParsedTable;

          return (
            <div key={idx} className="my-5 space-y-3">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border/80 bg-muted/20">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-muted/60 text-foreground font-bold border-b border-border/80">
                    <tr>
                      {table.headers.map((h, i) => (
                        <th key={i} className="py-3.5 px-4 font-bold text-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                        {row.map((cell, cIdx) => {
                          const colHeader = table.headers[cIdx] || '';
                          const isCodeCol = /mã|giftcode|code/i.test(colHeader);
                          const isCopied = copiedCode === cell;

                          return (
                            <td key={cIdx} className="py-3 px-4 text-foreground/90 align-middle">
                              {isCodeCol && cell.length >= 3 && !cell.includes(' ') ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-amber-300 text-sm select-all">
                                    {cell}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onCopyCode(cell)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                      isCopied
                                        ? 'bg-emerald-500 text-white shadow-glow-emerald'
                                        : 'bg-primary hover:bg-primary-hover text-white'
                                    }`}
                                  >
                                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                                  </button>
                                </div>
                              ) : (
                                cell
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Stack View (Zero Horizontal Scroll on 360px) */}
              <div className="block sm:hidden space-y-2.5">
                {table.rows.map((row, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2"
                  >
                    {row.map((cell, cIdx) => {
                      const colHeader = table.headers[cIdx] || `Cột ${cIdx + 1}`;
                      const isCodeCol = /mã|giftcode|code/i.test(colHeader);
                      const isCopied = copiedCode === cell;

                      return (
                        <div key={cIdx} className="space-y-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            {colHeader}
                          </span>
                          {isCodeCol && cell.length >= 3 && !cell.includes(' ') ? (
                            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border/80 mt-1">
                              <span className="font-mono font-black text-amber-300 text-sm select-all">
                                {cell}
                              </span>
                              <button
                                type="button"
                                onClick={() => onCopyCode(cell)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                                  isCopied
                                    ? 'bg-emerald-500 text-white shadow-glow-emerald'
                                    : 'bg-primary hover:bg-primary-hover text-white'
                                }`}
                              >
                                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-foreground leading-relaxed block">
                              {cell}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Heading 3 renderer
        if (block.type === 'heading3') {
          return (
            <h3 key={idx} className="text-base sm:text-lg font-bold text-primary pt-3 pb-1">
              {block.data}
            </h3>
          );
        }

        // Callout Alert Box
        if (block.type === 'callout') {
          return (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm leading-relaxed flex items-start gap-3 my-4 shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold text-amber-300 block">{block.data.prefix}</span>
                <p className="text-foreground/90 whitespace-pre-line">{block.data.body}</p>
              </div>
            </div>
          );
        }

        // List renderer (renders as 3-column Card Grid if structured items, or normal list)
        if (block.type === 'list') {
          const list = block.data;
          const items = list.items as string[];

          // Check if items are structured (>= 2 items and have titles or colons)
          const parsedCards = items.map((it) => parseCardItem(it));
          const hasStructuredItems = parsedCards.filter((c) => c.desc.length > 0).length >= Math.ceil(items.length * 0.5);

          if (!list.isOrdered && items.length >= 2 && hasStructuredItems) {
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 my-4">
                {parsedCards.map((card, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 sm:p-5 rounded-2xl bg-card/85 hover:bg-card border border-border/75 hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary-light border border-primary/25">
                          {card.tag}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                        {card.title}
                      </h4>
                      {card.desc && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                          {card.desc}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          if (list.isOrdered) {
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-2 my-3">
                {items.map((item: string, i: number) => (
                  <li key={i} className="text-foreground/90 leading-relaxed pl-1">
                    {item}
                  </li>
                ))}
              </ol>
            );
          }

          return (
            <ul key={idx} className="list-disc pl-5 space-y-2 my-3">
              {items.map((item: string, i: number) => (
                <li key={i} className="text-foreground/90 leading-relaxed pl-1">
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        // Image renderer
        if (block.type === 'image') {
          return (
            <figure key={idx} className="my-6 text-center">
              <img
                src={optimizeImageUrl(block.data.src, 900)}
                alt={block.data.alt || 'Ảnh minh họa bài viết'}
                className="w-full max-h-[520px] object-cover rounded-3xl border border-border/80 shadow-lg mx-auto"
                loading="lazy"
                decoding="async"
              />
              {block.data.alt && (
                <figcaption className="text-xs text-muted-foreground italic mt-2.5">
                  {block.data.alt}
                </figcaption>
              )}
            </figure>
          );
        }

        // Paragraph
        return (
          <p key={idx} className="whitespace-pre-line">
            {block.data}
          </p>
        );
      })}
    </>
  );
};
