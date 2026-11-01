import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Newspaper,
  Search,
  Sparkles,
  Clock,
  Eye,
  Gift,
  Flame,
  ArrowRight,
  Tag,
  X,
  Share2,
  Calendar,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
} from 'lucide-react';
import { NewsArticle } from '../types/game';
import { newsService } from '../services/newsService';
import { dataService } from '../services/dataService';
import { SafeNewsCover } from '../utils/newsImageUtils';
import { NewsDetailModal } from './NewsDetailModal';
import { useLanguage } from '../context/LanguageContext';

interface NewsViewProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onSelectGameSlug?: (slug: string) => void;
  initialArticleSlug?: string | null;
}

export const NewsView: React.FC<NewsViewProps> = ({
  onShowToast,
  onSelectGameSlug,
  initialArticleSlug,
}) => {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>(() => {
    try {
      return newsService.getPublishedArticles();
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedGameSlug, setSelectedGameSlug] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(() => {
    try {
      if (initialArticleSlug) {
        const found = newsService.getArticleBySlug(initialArticleSlug);
        if (found) return found;
      }
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.startsWith('/news/') && path.length > 6) {
          const slug = decodeURIComponent(path.replace(/^\/news\//i, '').replace(/\/$/, '').trim());
          if (slug) return newsService.getArticleBySlug(slug);
        }
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);
  const articlesSectionRef = useRef<HTMLDivElement>(null);

  // Load articles
  const loadArticles = () => {
    setIsLoading(true);
    try {
      const data = newsService.getPublishedArticles();
      setArticles(data);

      // Handle deep-linked article if provided
      if (initialArticleSlug) {
        const found = newsService.getArticleBySlug(initialArticleSlug);
        if (found) {
          setSelectedArticle(found);
          newsService.recordView(found.id);
        }
      }
    } catch (err) {
      console.error('Failed to load news articles', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
    // Tự động kéo dữ liệu tin tức mới nhất từ máy chủ để làm sạch hoàn toàn cache cũ trên client
    newsService.syncFromServer().then((updated) => {
      if (Array.isArray(updated) && updated.length > 0) {
        setArticles(newsService.getPublishedArticles());
        if (initialArticleSlug) {
          const found = newsService.getArticleBySlug(initialArticleSlug);
          if (found) {
            setSelectedArticle(found);
            newsService.recordView(found.id);
          }
        }
      }
    }).catch(() => {});
    dataService.syncWithCloudflareKV().catch(() => {});

    // Listen to news updates (from server or admin sync)
    const handleNewsUpdate = () => loadArticles();
    window.addEventListener('wcg_news_updated', handleNewsUpdate);
    return () => window.removeEventListener('wcg_news_updated', handleNewsUpdate);
  }, [initialArticleSlug]);

  // Distinct game options for category filtering
  const gameFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    const seenNames = new Set<string>();

    articles.forEach((a) => {
      let gSlug = (a.game_slug || '').trim().toLowerCase();
      let gName = (a.game_name || '').trim();
      if (!gSlug || gSlug === 'all') return;

      // Deduplicate Blox Fruits
      if (gSlug.includes('blox-fruit') || gName.toLowerCase().includes('blox fruit')) {
        gSlug = 'roblox-blox-fruits';
        gName = 'Roblox (Blox Fruits)';
      }
      // Deduplicate Board Game Văn Hóa Việt
      else if (gSlug.includes('board-game') || gName.toLowerCase().includes('board game')) {
        gSlug = 'board-game-van-hoa-viet';
        gName = 'Board Game Văn Hóa Việt';
      } else {
        // Filter out article titles masquerading as games
        if (gSlug.length > 35 || gSlug.split('-').length > 5 || gName.length > 28 || gName.includes(':')) {
          return;
        }
        const lowerName = gName.toLowerCase();
        if (
          lowerName.includes('tất tần tật') ||
          lowerName.includes('hướng dẫn') ||
          lowerName.includes('đánh giá') ||
          lowerName.includes('tổng hợp') ||
          lowerName.includes('giftcode mới') ||
          lowerName.includes('chi tiết')
        ) {
          return;
        }
      }

      const normNameLower = gName.toLowerCase();
      if (!seenNames.has(normNameLower) && !map.has(gSlug)) {
        seenNames.add(normNameLower);
        map.set(gSlug, gName);
      }
    });

    return Array.from(map.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [articles]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    let list = articles;

    if (selectedGameSlug !== 'all') {
      if (selectedGameSlug === 'roblox-blox-fruits') {
        list = list.filter(
          (a) =>
            a.game_slug === 'roblox-blox-fruits' ||
            a.game_slug?.includes('blox-fruit') ||
            a.game_name?.toLowerCase().includes('blox fruit')
        );
      } else if (selectedGameSlug === 'board-game-van-hoa-viet') {
        list = list.filter(
          (a) =>
            a.game_slug === 'board-game-van-hoa-viet' ||
            a.game_slug?.includes('board-game') ||
            a.game_name?.toLowerCase().includes('board game')
        );
      } else {
        list = list.filter((a) => a.game_slug === selectedGameSlug);
      }
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.excerpt?.toLowerCase().includes(q) ||
          a.game_name?.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedTag !== 'all') {
      list = list.filter((a) => a.tags?.includes(selectedTag));
    }

    return list;
  }, [articles, searchQuery, selectedGameSlug, selectedTag]);

  // Featured article (Hero banner): Luôn hiển thị bài viết mới nhất lên vị trí nổi bật nhất
  const featuredArticle = useMemo(() => {
    return articles[0] || null;
  }, [articles]);

  // Other articles excluding the hero banner if not searching
  const gridArticles = useMemo(() => {
    if (searchQuery || selectedGameSlug !== 'all' || selectedTag !== 'all') {
      return filteredArticles;
    }
    if (featuredArticle) {
      return filteredArticles.filter((a) => a.id !== featuredArticle.id);
    }
    return filteredArticles;
  }, [filteredArticles, featuredArticle, searchQuery, selectedGameSlug, selectedTag]);

  // Reset to page 1 whenever search, game category, or tag filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGameSlug, selectedTag, pageSize]);

  const totalArticlesCount = filteredArticles.length;
  const totalPages = Math.max(1, Math.ceil(totalArticlesCount / pageSize));

  // Auto-clamp if page exceeds total available pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Paginated articles: strictly slice only the active page items
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return gridArticles.slice(startIndex, startIndex + pageSize);
  }, [gridArticles, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    if (articlesSectionRef.current) {
      articlesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handleOpenArticle = (art: NewsArticle) => {
    setSelectedArticle(art);
    newsService.recordView(art.id);
    // Update view count in state
    setArticles((prev) =>
      prev.map((a) => (a.id === art.id ? { ...a, views: (a.views || 0) + 1 } : a))
    );
    if (typeof window !== 'undefined') {
      const targetPath = `/news/${art.slug}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ articleSlug: art.slug }, '', targetPath);
      }
      document.title = `${art.title} | CodeGame.shop`;
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleCloseArticle = () => {
    setSelectedArticle(null);
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== '/news') {
        window.history.pushState(null, '', '/news');
      }
      document.title = 'Tin Tức Game & Sự Kiện Giftcode Mới Nhất 2026 | CodeGame.shop';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sync with browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/news/') && path.length > 6) {
        const slug = path.replace(/^\/news\//i, '').replace(/\/$/, '').trim();
        const found = newsService.getArticleBySlug(slug);
        if (found) {
          setSelectedArticle(found);
          document.title = `${found.title} | CodeGame.shop`;
          window.scrollTo({ top: 0, behavior: 'instant' });
          return;
        }
      }
      setSelectedArticle(null);
      document.title = 'Tin Tức Game & Sự Kiện Giftcode Mới Nhất 2026 | CodeGame.shop';
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [articles]);

  // When viewing an article, render full-page detail view directly (not a modal overlay!)
  if (selectedArticle) {
    return (
      <NewsDetailModal
        article={selectedArticle}
        onClose={handleCloseArticle}
        onShowToast={onShowToast}
        onSelectGameSlug={onSelectGameSlug}
        onSelectArticle={(art) => handleOpenArticle(art)}
        allArticles={articles}
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fade-in">
      {/* 1. Header Banner Title */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/90 to-primary/10 border border-border/80 p-5 sm:p-7 shadow-lg backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>CẬP NHẬT 24/7 • BÀI VIẾT & GIFTCODE MỚI</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <Newspaper className="w-7 h-7 sm:w-9 h-9 text-primary shrink-0" />
              <span>Tin Tức Game & Sự Kiện Giftcode</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Điểm tin làng game Việt, bản cập nhật mới nhất, sự kiện quà tặng và danh sách Giftcode độc quyền được cập nhật liên tục mỗi ngày.
            </p>
          </div>

          {/* Quick stats counter */}
          <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/60 shrink-0">
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black text-primary font-mono">
                {articles.length}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">Bài Viết</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {articles.reduce((acc, a) => acc + (a.codes?.length || 0), 0)}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">Code Kèm Theo</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hero Featured Article (Shown when no search/tag filter is active) */}
      {!searchQuery && selectedGameSlug === 'all' && selectedTag === 'all' && featuredArticle && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-foreground uppercase tracking-wide">
              Tin Nổi Bật Nhất
            </h2>
          </div>

          <div
            onClick={() => handleOpenArticle(featuredArticle)}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-card border border-border/80 hover:border-primary/50 shadow-lg hover:shadow-xl transition-all duration-300 grid grid-cols-1 md:grid-cols-12 gap-0 md:max-h-[290px]"
          >
            {/* Cover image (5 cols on md, 4 cols on lg/xl) */}
            <div className="md:col-span-5 lg:col-span-4 xl:col-span-4 relative overflow-hidden bg-slate-950 flex items-center justify-center min-h-[190px] max-h-[240px] md:max-h-none md:h-full">
              <SafeNewsCover article={featuredArticle} isHero={true} />

                  {/* Badges on image */}
                  <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Flame className="w-3 h-3 fill-black" />
                      Tiêu Điểm
                    </span>
                    {featuredArticle.game_name && (
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/90 text-white text-[11px] font-bold shadow-md backdrop-blur-sm">
                        {featuredArticle.game_name}
                      </span>
                    )}
                  </div>

                  {/* Logo phụ & Nguồn: CodeGame.Shop */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/20 shadow-lg text-[10px] font-bold text-white select-none">
                    <img src="/og-image.jpg" alt="CodeGame.Shop" className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-primary/60" />
                    <span className="tracking-tight text-slate-200">CodeGame.Shop</span>
                  </div>
                </div>

            {/* Info panel (7 cols on md, 8 cols on lg/xl) */}
            <div className="md:col-span-7 lg:col-span-8 xl:col-span-8 p-4 sm:p-5 lg:p-6 flex flex-col justify-between space-y-2 sm:space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5 font-bold text-primary-light">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-light" />
                    Nguồn: CodeGame.Shop
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(featuredArticle.published_at || (featuredArticle as any).created_at || Date.now()).toLocaleDateString('vi-VN')}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {featuredArticle.read_time_minutes || 3} phút đọc
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {featuredArticle.views || 0} lượt xem
                  </span>
                </div>

                <h3 className="text-base sm:text-lg lg:text-xl font-black text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {featuredArticle.title}
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {featuredArticle.excerpt}
                </p>

                {/* Embedded codes sneak-peek badge */}
                {featuredArticle.codes && featuredArticle.codes.length > 0 && (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Gift className="w-3.5 h-3.5 shrink-0" />
                      <span>Kèm {featuredArticle.codes.length} Giftcode độc quyền</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-lg">
                      {featuredArticle.codes[0]}
                      {featuredArticle.codes.length > 1 && ` +${featuredArticle.codes.length - 1}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Action row */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {featuredArticle.tags?.slice(0, 2).map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold group-hover:bg-primary-dark transition-all shadow-sm group-hover:translate-x-0.5 cursor-pointer"
                >
                  <span>Đọc ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Search Bar & Category Filters (Two Distinct Rows) */}
      <div className="mb-8 space-y-4">
        {/* Row 1: Prominent Full-Width Search Input */}
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tin tức, sự kiện, giftcode game..."
            className="w-full pl-12 pr-10 py-3 rounded-2xl bg-card border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm sm:text-base placeholder:text-muted-foreground text-foreground shadow-sm transition-all outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 2: Distinct Category Chips Bar */}
        {gameFilterOptions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
            <button
              type="button"
              onClick={() => setSelectedGameSlug('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                selectedGameSlug === 'all'
                  ? 'bg-primary text-white shadow-sm ring-1 ring-primary-light/50'
                  : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Tất cả Game
            </button>
            {gameFilterOptions.map((g) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => setSelectedGameSlug(g.slug)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedGameSlug === g.slug
                    ? 'bg-primary text-white shadow-sm ring-1 ring-primary-light/50'
                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 opacity-70 shrink-0" />
                <span>{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Anchor for smooth scroll on page change */}
      <div ref={articlesSectionRef} className="scroll-mt-28" />

      {/* 4. Articles Grid */}
      {gridArticles.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-card/60 border border-border/60">
          <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground">Không tìm thấy bài viết nào</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Hãy thử tìm bằng từ khóa khác hoặc xóa bộ lọc để xem toàn bộ tin tức game mới nhất.
          </p>
          {(searchQuery || selectedGameSlug !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGameSlug('all');
                setSelectedTag('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all"
            >
              Xem tất cả bài viết
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedArticles.map((article) => {
              const hasCodes = article.codes && article.codes.length > 0;
              return (
                <article
                  key={article.id}
                  onClick={() => handleOpenArticle(article)}
                  className="group relative cursor-pointer flex flex-col overflow-hidden rounded-2xl bg-card border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-950 flex items-center justify-center">
                    <SafeNewsCover article={article} />

                        {/* Badges on image */}
                        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
                          {article.game_name && (
                            <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[11px] font-bold border border-white/10 shadow-sm">
                              {article.game_name}
                            </span>
                          )}
                          {article.is_hot && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-black text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                              <Flame className="w-3 h-3 fill-black" />
                              HOT
                            </span>
                          )}
                        </div>

                        {/* Sub-logo Watermark Badge: CodeGame.Shop */}
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 shadow-md text-[9px] font-bold text-white select-none">
                          <img src="/og-image.jpg" alt="CodeGame" className="w-3 h-3 rounded-full object-cover ring-1 ring-primary/60" />
                          <span className="text-slate-200">CodeGame.Shop</span>
                        </div>

                        {/* Codes badge on image bottom */}
                        {hasCodes && (
                          <div className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-lg bg-amber-500/90 backdrop-blur-md text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-md">
                            <Gift className="w-3.5 h-3.5" />
                            <span>+{article.codes!.length} Code</span>
                          </div>
                        )}
                      </div>

                  {/* Article Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      {/* Meta stats */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <span className="font-semibold text-primary-light flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-primary-light" />
                          CodeGame.Shop
                        </span>
                        <span>•</span>
                        <span>{new Date(article.published_at || (article as any).created_at || Date.now()).toLocaleDateString('vi-VN')}</span>
                        <span>•</span>
                        <span>{article.read_time_minutes || 3} phút đọc</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {article.views || 0}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {article.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {article.excerpt}
                      </p>
                    </div>

                    {/* Footer tags & CTA */}
                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-primary font-semibold group-hover:underline flex items-center gap-1">
                        Đọc chi tiết
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                      </span>

                      {article.tags && article.tags.length > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{article.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                <span>
                  Hiển thị{' '}
                  <strong className="text-foreground font-bold">
                    {(currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(currentPage * pageSize, totalArticlesCount)}
                  </strong>{' '}
                  trong tổng số{' '}
                  <strong className="text-foreground font-bold">{totalArticlesCount}</strong> bài viết
                </span>
                <span>•</span>
                <span>
                  Trang <strong className="text-primary font-bold">{currentPage}</strong> / {totalPages}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Page Size Selector */}
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 p-1 rounded-xl border border-border/50">
                  <span className="px-1.5 font-medium">Hiển thị:</span>
                  {[6, 9, 12].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                        pageSize === size
                          ? 'bg-primary text-white shadow-sm'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                  {/* First Page */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    title="Trang đầu"
                    aria-label="Trang đầu"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    title="Trang trước"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((p, idx) => {
                      if (typeof p === 'string') {
                        return (
                          <span
                            key={`dots-${idx}`}
                            className="px-2 py-1 text-xs text-muted-foreground font-mono select-none"
                          >
                            ...
                          </span>
                        );
                      }
                      const isCurrent = p === currentPage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePageChange(p)}
                          className={`min-w-[36px] h-9 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-primary text-white shadow-md shadow-primary/30 scale-105'
                              : 'bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    title="Trang sau"
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    title="Trang cuối"
                    aria-label="Trang cuối"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 5. Article Detail Modal (Handled early as full-page view above) */}
    </div>
  );
};
