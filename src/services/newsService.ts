import type { NewsArticle, GameItem } from '../types/game';
import { DEFAULT_NEWS_ARTICLES } from '../data/seedNews';
import { smartVietnameseMatch } from '../utils/textUtils';
import { isSpamOrAdArticle } from '../utils/newsFilterUtils';
import type { NewsAutoSource, NewsScheduleConfig, NewsCrawlLogItem } from '../types/newsAutomation';
import { DEFAULT_NEWS_AUTO_SOURCES, DEFAULT_NEWS_SCHEDULE_CONFIG } from '../types/newsAutomation';

const STORAGE_KEY = 'wcg_news_articles_v1';
const STORAGE_DELETED_KEY = 'wcg_deleted_news_articles_v1';
const STORAGE_SOURCES_KEY = 'wcg_news_auto_sources_v1';
const STORAGE_CONFIG_KEY = 'wcg_news_schedule_config_v1';
const STORAGE_LOGS_KEY = 'wcg_news_crawl_logs_v1';

/**
 * Hàm so sánh sắp xếp tin tức: Tin mới nhất luôn lên trước (published_at/created_at giảm dần)
 */
export const compareArticlesByDateDesc = (a: any, b: any): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const getTs = (art: any): number => {
    const d = art.published_at || art.created_at || art.updated_at;
    if (!d) return 0;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  };
  const diff = getTs(b) - getTs(a);
  if (diff !== 0) return diff;
  return String(b.id || '').localeCompare(String(a.id || ''));
};

class NewsService {
  private articles: NewsArticle[] = [];
  private deletedArticleIds: Set<string> = new Set();
  private autoSources: NewsAutoSource[] = [...DEFAULT_NEWS_AUTO_SOURCES];
  private scheduleConfig: NewsScheduleConfig = { ...DEFAULT_NEWS_SCHEDULE_CONFIG };
  private crawlLogs: NewsCrawlLogItem[] = [];
  private listeners: Set<() => void> = new Set();
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  private mergeDefaultSources(existing: NewsAutoSource[]): NewsAutoSource[] {
    if (!Array.isArray(existing) || existing.length === 0) {
      return [...DEFAULT_NEWS_AUTO_SOURCES];
    }
    const existingIds = new Set(existing.map((s) => s.id));
    const existingUrls = new Set(existing.map((s) => s.url.toLowerCase().trim()));

    const missingDefaults = DEFAULT_NEWS_AUTO_SOURCES.filter(
      (def) => !existingIds.has(def.id) && !existingUrls.has(def.url.toLowerCase().trim())
    );

    if (missingDefaults.length > 0) {
      return [...existing, ...missingDefaults];
    }
    return existing;
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') {
      this.articles = [...DEFAULT_NEWS_ARTICLES];
      return;
    }

    // 1. Tải danh sách bài viết đã xóa (Tombstones) để ngăn chặn vĩnh viễn việc hồi sinh
    try {
      const delStored = localStorage.getItem(STORAGE_DELETED_KEY);
      if (delStored) {
        const parsedDel = JSON.parse(delStored);
        if (Array.isArray(parsedDel)) {
          this.deletedArticleIds = new Set(parsedDel.map(String));
        }
      }
    } catch (e) {
      console.warn('[NewsService] Lỗi đọc tombstones tin tức:', e);
    }

    // 2. Tải danh sách bài viết hiện tại
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        // Người dùng hoặc máy chủ đã từng lưu dữ liệu (kể cả khi mảng rỗng [] do xóa hết)
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.articles = parsed.filter(
            (a: NewsArticle) =>
              !this.deletedArticleIds.has(a.id) &&
              !this.deletedArticleIds.has(a.slug)
          ).map((a: any) => ({
            ...a,
            published_at: a.published_at || a.created_at || new Date().toISOString(),
          }));
          this.isLoaded = true;
        }
      }
    } catch (e) {
      console.warn('[NewsService] Lỗi đọc tin tức từ localStorage:', e);
    }

    // 3. Tải cấu hình nguồn tự động
    try {
      const srcStored = localStorage.getItem(STORAGE_SOURCES_KEY);
      if (srcStored) {
        const parsedSrc = JSON.parse(srcStored);
        if (Array.isArray(parsedSrc) && parsedSrc.length > 0) {
          this.autoSources = this.mergeDefaultSources(parsedSrc);
        }
      }
    } catch {}

    // 4. Tải cấu hình lập lịch
    try {
      const cfgStored = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (cfgStored) {
        const parsedCfg = JSON.parse(cfgStored);
        if (parsedCfg && typeof parsedCfg === 'object') {
          this.scheduleConfig = { ...DEFAULT_NEWS_SCHEDULE_CONFIG, ...parsedCfg };
        }
      }
    } catch {}

    // 5. Tải nhật ký cào
    try {
      const logStored = localStorage.getItem(STORAGE_LOGS_KEY);
      if (logStored) {
        const parsedLogs = JSON.parse(logStored);
        if (Array.isArray(parsedLogs)) {
          this.crawlLogs = parsedLogs;
        }
      }
    } catch {}

    if (this.articles.length === 0 && localStorage.getItem(STORAGE_KEY) === null) {
      // Chỉ nạp seed mặc định cho khách truy cập lần đầu tiên khi chưa có dữ liệu nào
      this.articles = DEFAULT_NEWS_ARTICLES.filter(
        (s) => !this.deletedArticleIds.has(s.id) && !this.deletedArticleIds.has(s.slug)
      );
      this.saveToStorage();
    } else {
      // 1. Cập nhật ngay ảnh bìa chính thức nếu cache trình duyệt cũ đang giữ /og-image.jpg
      const seedCoverMap = new Map<string, string>();
      DEFAULT_NEWS_ARTICLES.forEach((s) => {
        if (s.cover_url && s.cover_url !== '/og-image.jpg') {
          if (s.id) seedCoverMap.set(s.id, s.cover_url);
          if (s.slug) seedCoverMap.set(s.slug, s.cover_url);
        }
      });

      let updatedStaleCover = false;
      this.articles = this.articles.map((a) => {
        const officialCover = seedCoverMap.get(a.id) || (a.slug ? seedCoverMap.get(a.slug) : null);
        if (officialCover && (!a.cover_url || a.cover_url === '/og-image.jpg')) {
          updatedStaleCover = true;
          return { ...a, cover_url: officialCover };
        }
        return a;
      });

      // 2. Hợp nhất an toàn các bài viết mẫu mới nếu chưa có trong bộ nhớ và chưa bị xóa bởi Admin
      const existingIds = new Set(this.articles.map((a) => a.id));
      const existingSlugs = new Set(this.articles.map((a) => a.slug));
      const newSeeds = DEFAULT_NEWS_ARTICLES.filter(
        (s) =>
          !existingIds.has(s.id) &&
          !existingSlugs.has(s.slug) &&
          !this.deletedArticleIds.has(s.id) &&
          !this.deletedArticleIds.has(s.slug)
      );
      if (newSeeds.length > 0 || updatedStaleCover) {
        this.articles = [...this.articles, ...newSeeds];
        this.saveToStorage();
      }
    }
    this.isLoaded = true;
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.articles));
      this.notifyListeners();
    } catch (e) {
      console.warn('[NewsService] Lỗi lưu tin tức vào localStorage:', e);
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }

  /**
   * Quản lý Danh sách nguồn cào tự động
   */
  public getAutoSources(): NewsAutoSource[] {
    return [...this.autoSources];
  }

  public async saveAutoSources(sources: NewsAutoSource[]): Promise<boolean> {
    this.autoSources = [...sources];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_SOURCES_KEY, JSON.stringify(this.autoSources));
      } catch {}
    }
    this.notifyListeners();
    await this.syncToCloudflareServer();
    return true;
  }

  public async resetToDefaultAutoSources(): Promise<NewsAutoSource[]> {
    this.autoSources = [...DEFAULT_NEWS_AUTO_SOURCES];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_SOURCES_KEY, JSON.stringify(this.autoSources));
      } catch {}
    }
    this.notifyListeners();
    await this.syncToCloudflareServer();
    return [...this.autoSources];
  }

  /**
   * Quản lý Cấu hình lập lịch & xuất bản tự động
   */
  public getScheduleConfig(): NewsScheduleConfig {
    return { ...this.scheduleConfig };
  }

  public async saveScheduleConfig(config: Partial<NewsScheduleConfig>): Promise<boolean> {
    this.scheduleConfig = { ...this.scheduleConfig, ...config };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(this.scheduleConfig));
      } catch {}
    }
    this.notifyListeners();
    await this.syncToCloudflareServer();
    return true;
  }

  /**
   * Quản lý Nhật ký cào bài viết
   */
  public getCrawlLogs(): NewsCrawlLogItem[] {
    return [...this.crawlLogs];
  }

  public addCrawlLog(item: NewsCrawlLogItem) {
    this.crawlLogs = [item, ...this.crawlLogs].slice(0, 100);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(this.crawlLogs));
      } catch {}
    }
    this.notifyListeners();
  }

  public clearCrawlLogs() {
    this.crawlLogs = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_LOGS_KEY);
      } catch {}
    }
    this.notifyListeners();
  }

  /**
   * Đồng bộ dữ liệu tin tức từ máy chủ Cloudflare D1
   */
  public applyServerSnapshot(
    serverArticles?: NewsArticle[],
    serverSources?: NewsAutoSource[],
    serverConfig?: NewsScheduleConfig
  ) {
    if (Array.isArray(serverArticles)) {
      // Chốt chặn an toàn: Nếu máy chủ gửi danh sách rỗng trong khi kho cục bộ đang có dữ liệu thật, không ghi đè rỗng
      if (serverArticles.length === 0 && this.articles.length > 0) {
        console.warn('[NewsService Safeguard] Bỏ qua snapshot rỗng từ máy chủ để bảo vệ dữ liệu hiện có');
      } else {
        // Loại bỏ toàn bộ bài viết đã nằm trong danh sách đã xóa (tombstones)
        const cleanServer = serverArticles.filter(
          (a) =>
            !this.deletedArticleIds.has(a.id) &&
            !this.deletedArticleIds.has(a.slug)
        ).map((a: any) => ({
          ...a,
          published_at: a.published_at || a.created_at || new Date().toISOString(),
        }));

        // Chống tụt giảm dữ liệu ngoài ý muốn (Safeguard merge):
        // Nếu máy chủ trả về ít bài hơn bộ nhớ cục bộ, bảo toàn các bài viết chưa có trên máy chủ
        let mergedList = cleanServer;
        if (cleanServer.length < this.articles.length && this.articles.length > 0) {
          const serverIdSet = new Set(cleanServer.map(a => a.id));
          const serverSlugSet = new Set(cleanServer.map(a => a.slug));
          const localOnly = this.articles.filter(
            a => !serverIdSet.has(a.id) && !serverSlugSet.has(a.slug) && !this.deletedArticleIds.has(a.id) && !this.deletedArticleIds.has(a.slug)
          );
          if (localOnly.length > 0) {
            mergedList = [...cleanServer, ...localOnly];
          }
        }

        if (mergedList.length > 0 || this.articles.length === 0) {
          mergedList.sort(compareArticlesByDateDesc);
          this.articles = mergedList;
          this.saveToStorage();
        }
      }
    }
    if (Array.isArray(serverSources) && serverSources.length > 0) {
      this.autoSources = this.mergeDefaultSources(serverSources);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_SOURCES_KEY, JSON.stringify(this.autoSources));
        } catch {}
      }
    }
    if (serverConfig && typeof serverConfig === 'object') {
      this.scheduleConfig = { ...this.scheduleConfig, ...serverConfig };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(this.scheduleConfig));
        } catch {}
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_news_updated', { detail: this.articles }));
    }
  }

  /**
   * Đồng bộ dữ liệu bài viết mới nhất từ máy chủ (Cloudflare D1) về bộ nhớ và client storage
   * Tự động nối kho bài viết /api/news và /api/sync ngay lập tức cho cả Web Khách và Admin
   */
  public async syncFromServer(): Promise<NewsArticle[]> {
    if (typeof window === 'undefined') return this.articles;

    // 1. Thử lấy trực tiếp từ API chuyên biệt /api/news (SSOT chuẩn xác nhất từ Cloudflare D1)
    try {
      const res = await fetch(`/api/news?status=ALL&limit=all&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.articles) && json.articles.length > 0) {
          this.applyServerSnapshot(json.articles);
          return this.articles;
        }
      }
    } catch (e) {
      console.warn('[NewsService] syncFromServer failed on /api/news, trying /api/sync fallback:', e);
    }

    // 2. Fallback sang /api/sync nếu /api/news không khả dụng
    try {
      const res = await fetch(`/api/sync?key=wcg_news_articles_v1&fresh=1&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        const incoming = json.data || json.articles || json.newsArticles;
        if (Array.isArray(incoming) && incoming.length > 0) {
          this.applyServerSnapshot(incoming);
          return this.articles;
        }
      }
    } catch (e) {
      console.warn('[NewsService] syncFromServer failed on /api/sync fallback:', e);
    }

    return this.articles;
  }

  /**
   * Lấy danh sách tin tức đã xuất bản (cho Web Khách)
   * Tự động hiển thị các bài viết đến lịch hẹn đăng (SCHEDULED) khi chạm mốc thời gian
   */
  public getPublishedArticles(filter?: {
    search?: string;
    gameSlug?: string;
    tag?: string;
  }): NewsArticle[] {
    const nowMs = Date.now();
    let result = this.articles.filter((a) => {
      if (a.status === 'PUBLISHED') return true;
      if (a.status === 'SCHEDULED' && a.scheduled_publish_at) {
        const schedTime = new Date(a.scheduled_publish_at).getTime();
        return !isNaN(schedTime) && nowMs >= schedTime;
      }
      return false;
    }).map((a) => {
      if (a.status === 'SCHEDULED' && a.scheduled_publish_at) {
        const schedTime = new Date(a.scheduled_publish_at).getTime();
        if (!isNaN(schedTime) && nowMs >= schedTime) {
          return {
            ...a,
            status: 'PUBLISHED' as const,
            published_at: a.scheduled_publish_at,
          };
        }
      }
      return a;
    });

    if (filter?.gameSlug && filter.gameSlug !== 'all') {
      result = result.filter(
        (a) => a.game_slug === filter.gameSlug || a.game_id === filter.gameSlug
      );
    }

    if (filter?.tag && filter.tag !== 'all') {
      result = result.filter(
        (a) => a.tags && a.tags.some((t) => t.toLowerCase() === filter.tag?.toLowerCase())
      );
    }

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim();
      result = result.filter((a) =>
        smartVietnameseMatch(
          [a.title, a.excerpt, a.game_name, a.game_slug, ...(a.tags || [])],
          q
        )
      );
    }

    // Sắp xếp: Tin mới nhất luôn lên trước
    return result
      .map((a) => ({ ...a, views: this.getDisplayViews(a) }))
      .sort(compareArticlesByDateDesc);
  }

  /**
   * Tính toán số lượt xem hiển thị tự nhiên dựa trên lượt xem thực + lượt xem ban đầu + hệ số tăng trưởng theo giờ
   */
  public getDisplayViews(article: NewsArticle | Partial<NewsArticle>): number {
    const realViews = Number(article.views) || 0;
    const baseViews = Number(article.virtual_views) || 0;
    const growthRate = typeof article.views_growth_rate === 'number' && !isNaN(article.views_growth_rate)
      ? article.views_growth_rate
      : 1.0;

    const pubTime = article.published_at ? new Date(article.published_at).getTime() : Date.now();
    const hoursElapsed = Math.max(0, (Date.now() - pubTime) / (1000 * 60 * 60));

    // Hệ số 1.0 tương đương ~6 lượt xem tự tăng mỗi giờ
    const timeGrowth = Math.floor(hoursElapsed * growthRate * 6);
    return Math.max(realViews, realViews + baseViews + timeGrowth);
  }

  /**
   * Lấy toàn bộ bài viết (Bao gồm cả bản nháp cho Admin)
   */
  public getAllArticles(): NewsArticle[] {
    return this.getAllArticlesForAdmin();
  }

  public getAllArticlesForAdmin(): NewsArticle[] {
    return [...this.articles]
      .map((a) => ({ ...a, views: this.getDisplayViews(a) }))
      .sort(compareArticlesByDateDesc);
  }

  /**
   * Lấy bài viết theo slug hoặc id
   */
  public getArticleBySlug(slugOrId: string): NewsArticle | null {
    if (!slugOrId) return null;
    const clean = slugOrId.toLowerCase().trim();
    const found = this.articles.find(
      (a) =>
        a.slug?.toLowerCase() === clean ||
        a.id?.toLowerCase() === clean
    );
    return found ? { ...found, views: this.getDisplayViews(found) } : null;
  }

  /**
   * Tăng lượt xem bài viết
   */
  public recordView(articleId: string) {
    const found = this.articles.find((a) => a.id === articleId || a.slug === articleId);
    if (found) {
      found.views = (found.views || 0) + 1;
      this.saveToStorage();
    }
  }

  /**
   * Admin: Thêm hoặc Cập nhật bài viết
   */
  public async saveArticle(
    articleData: Partial<NewsArticle> & { title: string },
    options?: { skipSync?: boolean }
  ): Promise<NewsArticle> {
    const now = new Date().toISOString();
    let slug =
      articleData.slug ||
      articleData.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const existingIndex = this.articles.findIndex(
      (a) => (articleData.id && a.id === articleData.id) || a.slug === slug
    );

    let savedItem: NewsArticle;

    if (existingIndex >= 0) {
      savedItem = {
        ...this.articles[existingIndex],
        ...articleData,
        gallery_urls: articleData.gallery_urls || this.articles[existingIndex].gallery_urls || [],
        virtual_views: typeof articleData.virtual_views === 'number' ? articleData.virtual_views : this.articles[existingIndex].virtual_views || 0,
        views_growth_rate: typeof articleData.views_growth_rate === 'number' ? articleData.views_growth_rate : (this.articles[existingIndex].views_growth_rate !== undefined ? this.articles[existingIndex].views_growth_rate : 1.0),
        slug,
        scheduled_publish_at: articleData.scheduled_publish_at !== undefined ? articleData.scheduled_publish_at : this.articles[existingIndex].scheduled_publish_at,
        updated_at: now,
      };
      this.articles[existingIndex] = savedItem;
    } else {
      // Disambiguate slug if already exists for another article
      if (this.articles.some((a) => a.slug === slug)) {
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      }

      savedItem = {
        id: articleData.id || `news_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        slug,
        title: articleData.title.trim(),
        excerpt: articleData.excerpt || '',
        content: articleData.content || '',
        cover_url:
          (articleData.cover_url && articleData.cover_url.trim()) ||
          (articleData.game_slug ? `/game_icons/${articleData.game_slug}.webp` : '') ||
          '/og-image.jpg',
        gallery_urls: articleData.gallery_urls || [],
        virtual_views: typeof articleData.virtual_views === 'number' ? articleData.virtual_views : 0,
        views_growth_rate: typeof articleData.views_growth_rate === 'number' ? articleData.views_growth_rate : 1.0,
        game_id: articleData.game_id,
        game_slug: articleData.game_slug,
        game_name: articleData.game_name,
        tags: articleData.tags || ['Tin Mới', 'Giftcode'],
        codes: articleData.codes || [],
        author: articleData.author || 'CodeGame Editorial',
        views: articleData.views || 0,
        read_time_minutes: articleData.read_time_minutes || Math.max(2, Math.ceil((articleData.content || '').length / 500)),
        is_featured: Boolean(articleData.is_featured),
        is_hot: Boolean(articleData.is_hot),
        status: articleData.status || 'PUBLISHED',
        published_at: articleData.published_at || now,
        scheduled_publish_at: articleData.scheduled_publish_at,
        updated_at: now,
      };
      this.articles.unshift(savedItem);
    }

    this.articles.sort(compareArticlesByDateDesc);
    this.saveToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_news_updated', { detail: this.articles }));
    }

    if (!options?.skipSync) {
      await this.syncToCloudflareServer();
    }
    return savedItem;
  }

  /**
   * Lưu hàng loạt nhiều bài viết một lần (Tối ưu hóa ghi nhớ và sync Cloudflare)
   */
  public async saveArticlesBatch(
    articlesList: Array<Partial<NewsArticle> & { title: string }>
  ): Promise<NewsArticle[]> {
    const results: NewsArticle[] = [];
    for (const item of articlesList) {
      const saved = await this.saveArticle(item, { skipSync: true });
      results.push(saved);
    }
    await this.syncToCloudflareServer();
    return results;
  }

  /**
   * Admin: Xóa vĩnh viễn bài viết (Lưu tombstones ngăn chặn hồi sinh ở mọi nơi)
   */
  public async deleteArticle(articleId: string): Promise<boolean> {
    const found = this.articles.find((a) => a.id === articleId || a.slug === articleId);
    const foundId = found?.id || articleId;
    const foundSlug = found?.slug;

    this.deletedArticleIds.add(foundId);
    if (foundSlug) this.deletedArticleIds.add(foundSlug);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(Array.from(this.deletedArticleIds)));
      } catch {}
    }

    const initialLen = this.articles.length;
    this.articles = this.articles.filter(
      (a) => a.id !== foundId && a.slug !== foundId && (!foundSlug || (a.id !== foundSlug && a.slug !== foundSlug))
    );

    this.saveToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_news_updated', { detail: this.articles }));
    }

    await this.syncToCloudflareServer();
    return true;
  }

  /**
   * Phát hiện các bài viết spam, rác, phụ kiện quảng cáo hiện có trong kho
   */
  public detectSpamArticles(): NewsArticle[] {
    return this.articles.filter((a) => {
      const res = isSpamOrAdArticle(a.title, `${a.excerpt || ''} ${a.content || ''}`, a.slug);
      return res.isSpam;
    });
  }

  /**
   * Admin: Tự động quét và dọn dẹp toàn bộ bài viết spam, rác quảng cáo
   * Đưa vào danh sách Tombstones ngăn hồi sinh vĩnh viễn
   */
  public async cleanupSpamArticles(): Promise<{ deletedCount: number; deletedTitles: string[] }> {
    const spamList = this.detectSpamArticles();
    if (spamList.length === 0) {
      return { deletedCount: 0, deletedTitles: [] };
    }

    const deletedTitles: string[] = [];
    for (const item of spamList) {
      deletedTitles.push(item.title);
      this.deletedArticleIds.add(item.id);
      if (item.slug) {
        this.deletedArticleIds.add(item.slug);
      }
    }

    const spamIdSet = new Set(spamList.map((a) => a.id));
    const spamSlugSet = new Set(spamList.map((a) => a.slug).filter(Boolean));

    this.articles = this.articles.filter(
      (a) => !spamIdSet.has(a.id) && (!a.slug || !spamSlugSet.has(a.slug))
    );

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(Array.from(this.deletedArticleIds)));
      } catch {}
    }

    this.saveToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wcg_news_updated', { detail: this.articles }));
    }

    await this.syncToCloudflareServer();
    return { deletedCount: spamList.length, deletedTitles };
  }

  /**
   * Gửi dữ liệu bài viết lên máy chủ Cloudflare D1
   */
  public async syncArticlesToCloudflare(): Promise<boolean> {
    return this.syncToCloudflareServer();
  }

  public async syncToCloudflareServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Chốt chặn chống ghi đè: Tuyệt đối không gửi mảng rỗng hoặc suy giảm dữ liệu khi bộ nhớ chưa nạp
    if (!this.isLoaded || !Array.isArray(this.articles) || (this.articles.length === 0 && DEFAULT_NEWS_ARTICLES.length > 0)) {
      console.warn('[NewsService Safeguard] Chặn sync: Danh sách bài viết đang rỗng hoặc chưa nạp xong, hủy gửi đè lên máy chủ');
      return false;
    }

    try {
      const syncKey =
        localStorage.getItem('wcg_admin_sync_key') ||
        sessionStorage.getItem('wcg_admin_sync_key') ||
        'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': syncKey,
        },
        body: JSON.stringify({
          newsArticles: this.articles,
          deletedNewsArticles: Array.from(this.deletedArticleIds),
          newsAutoSources: this.autoSources,
          newsScheduleConfig: this.scheduleConfig,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[NewsService] Không thể sync bài viết lên Cloudflare D1:', e);
      return false;
    }
  }

  /**
   * Kích hoạt xuất bản ngay bài viết đang trong lịch hẹn đăng
   */
  public async publishScheduledArticleNow(articleId: string): Promise<NewsArticle | null> {
    const found = this.articles.find((a) => a.id === articleId || a.slug === articleId);
    if (!found) return null;
    const now = new Date().toISOString();
    return await this.saveArticle({
      ...found,
      status: 'PUBLISHED',
      published_at: now,
      scheduled_publish_at: undefined,
    });
  }

  /**
   * Lên lịch hoặc điều chỉnh thời gian hẹn đăng cho bài viết
   */
  public async rescheduleArticle(articleId: string, scheduledIso: string): Promise<NewsArticle | null> {
    const found = this.articles.find((a) => a.id === articleId || a.slug === articleId);
    if (!found) return null;
    return await this.saveArticle({
      ...found,
      status: 'SCHEDULED',
      scheduled_publish_at: scheduledIso,
    });
  }

  /**
   * Hủy lịch hẹn đăng và chuyển bài viết về dạng bản nháp
   */
  public async cancelScheduledPublish(articleId: string): Promise<NewsArticle | null> {
    const found = this.articles.find((a) => a.id === articleId || a.slug === articleId);
    if (!found) return null;
    return await this.saveArticle({
      ...found,
      status: 'DRAFT',
      scheduled_publish_at: undefined,
    });
  }

  /**
   * ✨ AI Auto-Writer: Tự động biên tập bài viết chuẩn SEO dựa trên tựa game và sự kiện
   */
  public generateAiArticleDraft(params: {
    game: Partial<GameItem>;
    topicType: 'codes' | 'update' | 'new_server' | 'event' | 'guide';
    availableCodes?: string[];
  }): Partial<NewsArticle> {
    const gameName = params.game.name || 'Tựa Game';
    const hasPublisher = params.game.publisher && params.game.publisher !== 'Nhà phát hành chính thức';
    const pubPhrase = hasPublisher ? `phát hành bởi **${params.game.publisher}**` : 'phát hành chính thức tại Việt Nam';
    const codes = params.availableCodes && params.availableCodes.length > 0
      ? params.availableCodes.slice(0, 6)
      : ['CODEVIP2026', 'TANTHU999', 'QUATRIAN888'];

    const monthYear = 'Tháng 10/2026';

    let title = '';
    let excerpt = '';
    let content = '';
    let tags: string[] = [];

    switch (params.topicType) {
      case 'codes':
        title = `Tổng Hợp Trọn Bộ Giftcode ${gameName} Mới Nhất ${monthYear} - Còn Hạn 100%`;
        excerpt = `Tổng hợp toàn bộ mã quà tặng giftcode ${gameName} (${hasPublisher ? params.game.publisher : 'Việt Nam'}) mới nhất còn hạn sử dụng. Hướng dẫn chi tiết cách nhập code nhận quà VIP.`;
        tags = ['Giftcode Mới', 'Mã Quà Tặng', gameName, 'Code Tân Thủ'];
        content = `## Danh Sách Mã Giftcode ${gameName} Mới Nhất Hôm Nay

Ban biên tập **CodeGame.shop** gửi tặng cộng đồng game thủ danh sách các mã quà tặng giftcode mới nhất dành cho tựa game **${gameName}** ${pubPhrase}.

### 1. Danh Sách Mã Code Còn Hạn Sử Dụng
Toàn bộ mã bên dưới đã được đối chiếu kiểm tra thực tế trong game. Hãy nhanh tay sao chép và nhập ngay trước khi hết hạn sử dụng!

### 2. Hướng Dẫn Cách Nhập Giftcode Trong ${gameName}
1. Đăng nhập vào trò chơi **${gameName}**.
2. Nhấn vào **Avatar** nhân vật ở góc trên màn hình.
3. Chọn mục **Cài Đặt** hoặc **Phúc Lợi** -> **Đổi Giftcode**.
4. Dán mã quà tặng bên dưới và nhấn **Xác Nhận** để nhận quà qua Hòm Thư.`;
        break;

      case 'update':
        title = `${gameName}: Chi Tiết Bản Cập Nhật Mới & Bộ Giftcode Quà Tặng ${monthYear}`;
        excerpt = `Khám phá các điểm mới trong bản cập nhật lớn của ${gameName}, tinh chỉnh cân bằng chiến đấu và nhận ngay danh sách mã code độc quyền.`;
        tags = ['Bản Cập Nhật', 'Giftcode Mới', gameName, 'Tin Nóng'];
        content = `## Tổng Quan Bản Cập Nhật Mới ${gameName}

Tựa game **${gameName}** (${pubPhrase}) vừa chính thức phát hành phiên bản cập nhật lớn với hàng loạt nâng cấp đáng giá về đồ họa, tối ưu hiệu năng và bổ sung các tính năng chiến đấu mới.

### 1. Các Tính Năng & Hoạt Động Mới
- **Hệ Thống Phụ Bản Mới**: Mở rộng các tầng thí luyện liên server với độ khó nâng cao, mang lại phần thưởng trang bị quý hiếm cho người chơi.
- **Tối Ưu Hóa Cân Bằng**: Tinh chỉnh lại chỉ số sát thương và phòng thủ của các nhân vật/hệ phái nhằm mang lại trải nghiệm công bằng trong đấu trường PvP.
- **Sự Kiện Đăng Nhập 7 Ngày**: Đăng nhập liên tục trong tuần đầu phát hành bản cập nhật để nhận miễn phí rương bảo thạch và vàng khóa.

### 2. Danh Sách Giftcode Áp Dụng Cho Phiên Bản Này
Ban quản trị **CodeGame.shop** đã tổng hợp và kiểm tra tính hợp lệ của toàn bộ mã giftcode mới nhất dành cho ${gameName}. Hãy sử dụng danh sách mã code bên dưới để nhận ngay quà tặng khởi đầu thuận lợi!

### 3. Hướng Dẫn Cách Nhập Code Nhận Quà
1. Mở trò chơi **${gameName}** trên thiết bị của bạn.
2. Tìm đến mục **Cài Đặt** hoặc **Phúc Lợi / Sự Kiện**.
3. Chọn tab **Đổi Mã Quà Tặng (Giftcode)**.
4. Sao chép các mã code bên dưới và dán vào ô nhập liệu, sau đó bấm **Xác Nhận**. Quà sẽ được gửi vào Hòm Thư nhân vật.`;
        break;

      case 'new_server':
        title = `${gameName}: Khai Mở Máy Chủ Mới & Phát Tặng Gói Quà Tân Thủ Độc Quyền`;
        excerpt = `Chào đón các tân thủ tham gia máy chủ mới của ${gameName}. Chuỗi sự kiện đua top lực chiến 7 ngày cùng trọn bộ mã code khởi đầu hành trình.`;
        tags = ['Máy Chủ Mới', 'Tân Thủ', gameName, 'Đua Top'];
        content = `## Khai Mở Máy Chủ Mới Cùng ${gameName}

Nhằm đáp ứng sự ủng hộ nhiệt tình từ cộng đồng game thủ, ${pubPhrase} chính thức khai mở cụm máy chủ mới dành cho **${gameName}**.

### 1. Chuỗi Sự Kiện Khởi Động Máy Chủ
- **Đua Top Lực Chiến 7 Ngày**: Nhận ngay danh hiệu độc quyền, thời trang giới hạn và thú cưỡi Thần Thoại.
- **Nhân Đôi Kinh Nghiệm**: Tăng 100% kinh nghiệm nhận được từ các nhiệm vụ cốt truyện và phụ bản trong 72 giờ đầu tiên.
- **Quà Nạp Lần Đầu**: Tặng kèm vũ khí Hoàng Kim và gói nguyên liệu nâng cấp cấp tốc.

### 2. Bộ Giftcode Tân Thủ Đặc Biệt
Dưới đây là các mã quà tặng được kích hoạt riêng cho người chơi máy chủ mới. Sao chép ngay để tạo lợi thế dẫn đầu bảng xếp hạng!`;
        break;

      case 'guide':
        title = `Hướng Dẫn Nhập Code & Mẹo Tân Thủ Tối Ưu Lực Chiến Trong ${gameName}`;
        excerpt = `Cẩm nang toàn tập hướng dẫn tân thủ cách nhập giftcode nhận quà, mẹo xây dựng đội hình và quản lý tài nguyên hiệu quả trong ${gameName}.`;
        tags = ['Hướng Dẫn', 'Mẹo Chơi', gameName, 'Tân Thủ'];
        content = `## Cẩm Nang Toàn Tập Dành Cho Tân Thủ ${gameName}

Bước chân vào thế giới của **${gameName}** (${pubPhrase}), việc tận dụng tối đa các tài nguyên miễn phí từ giftcode là chìa khóa giúp bạn thăng tiến lực chiến nhanh chóng mà không cần tốn kém.

### 1. Hướng Dẫn Từng Bước Nhập Mã Quà Tặng
Nhiều người chơi mới thường bối rối không tìm thấy nơi nhập code. Hãy làm theo hướng dẫn chuẩn xác sau:
- Bước 1: Hoàn thành màn tân thủ (thường đạt cấp độ 10).
- Bước 2: Bấm vào **Avatar nhân vật** ở góc trên bên trái màn hình.
- Bước 3: Chọn **Cài Đặt Hệ Thống** -> **Đổi Code**.
- Bước 4: Nhập mã và kiểm tra Hòm Thư.

### 2. Các Lưu Ý Tránh Lỗi Khi Đổi Code
- Kiểm tra chính xác chữ hoa, chữ thường và không để khoảng trắng thừa ở đầu/cuối mã.
- Mỗi mã code chỉ có thể sử dụng 1 lần cho 1 nhân vật.

### 3. Danh Sách Mã Đang Hoạt Động 100%
Dưới đây là bộ mã đã được hệ thống CodeGame.shop xác thực kiểm duyệt thành công!`;
        break;

      case 'event':
      default:
        title = `${gameName}: Đại Tiệc Sự Kiện Lớn & Chuỗi Quà Tặng Tri Ân Game Thủ`;
        excerpt = `Sự kiện tri ân cộng đồng hoành tráng của ${gameName} chính thức bùng nổ. Nhận trọn bộ mã code sự kiện và trang bị quý hiếm hoàn toàn miễn phí.`;
        tags = ['Sự Kiện', 'Tri Ân', gameName, 'Quà Tặng'];
        content = `## Đại Tiệc Sự Kiện Mừng Mùa Lễ Hội ${gameName}

Cộng đồng game thủ **${gameName}** đang sôi sục với chuỗi sự kiện quy mô lớn ${pubPhrase} nhằm tri ân các game thủ đã gắn bó cùng tựa game.

### 1. Nội Dung Sự Kiện Tiêu Điểm
- Vòng quay may mắn nhận trang bị Cam và Kim Cương miễn phí mỗi ngày.
- Hoạt động Bang Hội liên server tranh đoạt lãnh địa với phần thưởng hàng triệu Core.
- Thử thách săn boss thế giới rơi rương báu vật phẩm quý hiếm.

### 2. Bộ Giftcode Sự Kiện Độc Quyền
Nhanh tay sao chép ngay danh sách mã quà tặng bên dưới để không bỏ lỡ các phần quà giá trị từ ban tổ chức!`;
        break;
    }

    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return {
      title,
      slug,
      excerpt,
      content,
      tags,
      codes,
      game_id: params.game.id,
      game_slug: params.game.slug,
      game_name: gameName,
      cover_url:
        params.game.cover_image_url ||
        (params.game as any).cover_image ||
        params.game.banner_url ||
        params.game.icon_url ||
        (params.game.slug ? `/game_icons/${params.game.slug}.webp` : '') ||
        '',
      gallery_urls: [],
      virtual_views: Math.floor(Math.random() * 150) + 120,
      views_growth_rate: 1.0,
      author: 'CodeGame Editorial',
      status: 'PUBLISHED',
      is_featured: false,
      is_hot: true,
      read_time_minutes: 3,
    };
  }

  /**
   * AI Viết lại bài viết từ URL hoặc nội dung bài báo nguồn:
   * - Viết lại tiêu đề chuẩn SEO cuốn hút, không trùng lặp
   * - Viết lại mở bài (excerpt)
   * - Cấu trúc lại bài viết theo định dạng Markdown chuyên nghiệp (H2, H3, Mẹo, Hướng dẫn)
   * - Bóc tách và gộp toàn bộ mã Giftcode tìm thấy
   * - Bóc tách hình ảnh đưa vào thư viện
   */
  public rewriteArticleWithAi(params: {
    rawTitle?: string;
    rawContent: string;
    sourceUrl?: string;
    game?: { id?: string; name?: string; slug?: string; banner_url?: string; icon_url?: string } | null;
    foundCodes?: string[];
    foundImages?: string[];
  }): Partial<NewsArticle> {
    const gameName = params.game?.name || 'Tựa Game';
    
    // Clean raw text thoroughly
    let cleanRaw = (params.rawContent || '')
      .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u00A0]/g, ' ')
      .replace(/[»«►◄▲▼■◆●★☆❖✓✔✕✖]/g, ' ')
      .replace(/###?\s*Tiêu đề mục (?:lớn|nhỏ)\n*/gi, '')
      .replace(/\*\*Văn bản in đậm\*\*\n*/gi, '')
      .replace(/>\s*💡\s*\*\*Lưu ý:\*\*\s*Nội dung nhắc nhở game thủ\.\.\.\n*/gi, '')
      .replace(/CodeGame\.store/gi, 'CodeGame.shop')
      .trim();

    // 1. Quét thêm mã giftcode từ nội dung
    const extractedCodes = new Set<string>(params.foundCodes || []);
    const codeMatches = cleanRaw.matchAll(/(?:code|giftcode|mã quà tặng|mã code)\s*[:=\-–]\s*([a-zA-Z0-9_\-]+)/gi);
    for (const m of codeMatches) {
      const c = m[1].trim().toUpperCase();
      if (c.length >= 4 && c.length <= 25) extractedCodes.add(c);
    }
    const words = cleanRaw.match(/\b[A-Z0-9_]{5,20}\b/g) || [];
    for (const w of words) {
      const upper = w.toUpperCase();
      if (/[0-9]/.test(upper) && /[A-Z]/.test(upper)) {
        extractedCodes.add(upper);
      }
    }
    const finalCodes = Array.from(extractedCodes).slice(0, 15);

    // 2. Viết lại tiêu đề chuẩn SEO
    let title = params.rawTitle ? params.rawTitle.trim() : '';
    const currentYear = new Date().getFullYear();
    if (!title || title.length < 10) {
      title = `${gameName}: Tổng Hợp Giftcode Mới Nhất & Hướng Dẫn Nhập Quà (${currentYear})`;
    } else {
      let stripped = title
        .replace(/^[»>|\-\s]+/, '')
        .replace(/\b(2023|2024|2025)\b/g, currentYear.toString())
        .trim();
      if (!stripped.toLowerCase().includes(gameName.toLowerCase())) {
        title = `${gameName}: ${stripped}`;
      } else {
        title = stripped;
      }
      if (!title.includes(currentYear.toString())) {
        title += ` (${currentYear})`;
      }
    }

    // 3. Viết lại tóm tắt tự nhiên
    let excerpt = `Cập nhật toàn bộ thông tin mới nhất và danh sách mã giftcode độc quyền dành cho game thủ ${gameName}. Nhận ngay gói quà tân thủ, vật phẩm giới hạn và hướng dẫn kích hoạt code chi tiết.`;
    if (cleanRaw.length > 50) {
      const firstLines = cleanRaw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 30 && !l.startsWith('#') && !/^(skip to|trang chủ|home)/i.test(l))
        .slice(0, 2)
        .join(' ');
      if (firstLines.length > 40) {
        excerpt = firstLines.slice(0, 200).replace(/[#*`_]/g, '') + '...';
      }
    }

    // 4. Lọc bỏ các đoạn rác boilerplate và định dạng đoạn văn tự nhiên
    const paragraphs = cleanRaw
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => {
        if (p.length < 25) return false;
        if (p.startsWith('#')) return false;
        const low = p.toLowerCase();
        if (/^(skip to content|trang chủ|home|mục lục|table of contents)/i.test(low)) return false;
        if (/^(nguồn|nguồn ảnh|theo dõi|bình luận|chia sẻ|đọc thêm|xem thêm|bài viết cùng)/i.test(low)) return false;
        if (/^(like|share|subscribe|đăng ký kênh|tham gia nhóm)/i.test(low)) return false;
        return true;
      });

    let bodySection = '';
    if (paragraphs.length >= 2) {
      bodySection = paragraphs.slice(0, 4).join('\n\n');
    } else {
      bodySection = `Bản cập nhật mới nhất của **${gameName}** đã chính thức ra mắt cộng đồng game thủ với hàng loạt tính năng hấp dẫn, tối ưu hóa trải nghiệm chiến đấu và mở rộng chuỗi sự kiện đặc sắc.\n\nĐể tri ân người chơi và hỗ trợ các tân thủ có khởi đầu thuận lợi, ban điều hành đã phát hành bộ mã quà tặng độc quyền với nhiều phần thưởng giá trị.`;
    }

    const content = `## 1. Điểm Nhấn Bản Tin & Sự Kiện ${gameName}

${bodySection}

## 2. Trọn Bộ Mã Giftcode ${gameName} Đang Hoạt Động (Cập Nhật Hôm Nay)

Dưới đây là danh sách toàn bộ các mã giftcode hợp lệ đã được kiểm duyệt. Độc giả có thể bấm sao chép trực tiếp các mã hiển thị trên bài viết để sử dụng ngay:

${finalCodes.length > 0 ? finalCodes.map((c) => `- **${c}**: Gói quà tri ân & tài nguyên tân thủ`).join('\n') : `- Danh sách mã code đang hoạt động được đính kèm ở khung quà tặng bên dưới.`}

> 💡 **Lưu ý quan trọng:** Mỗi mã quà tặng đều có hạn sử dụng và số lượng kích hoạt nhất định. Bạn nên nhập code ngay khi nhận được để tránh hết hạn!

## 3. Hướng Dẫn Từng Bước Cách Nhập Code Nhận Quà Trong ${gameName}

1. Khởi động trò chơi **${gameName}** trên thiết bị của bạn và đăng nhập tài khoản.
2. Tại giao diện chính, bấm vào **Avatar nhân vật** hoặc biểu tượng **Cài Đặt / Phúc Lợi**.
3. Chọn mục **Đổi Mã Quà Tặng (Giftcode)**.
4. Sao chép mã code ở trên, dán vào ô nhập liệu và bấm **Xác Nhận**.
5. Phần thưởng sẽ được gửi trực tiếp vào **Hòm Thư** trong game trong vòng vài phút.

## 4. Mẹo Chơi Game & Cách Nhận Thêm Code Mới
- Theo dõi Fanpage và Group cộng đồng chính thức của ${gameName} để tham gia các minigame săn code độc quyền.
- Thường xuyên ghé thăm **CodeGame.shop** để cập nhật nhanh nhất các mã giftcode máy chủ mới và sự kiện đua TOP.`;

    const gameLogo =
      params.game?.banner_url ||
      params.game?.icon_url ||
      (params.game?.slug ? `/game_icons/${params.game.slug}.webp` : '');

    const cover_url =
      gameLogo ||
      (params.foundImages && params.foundImages[0]) ||
      '/og-image.jpg';

    const gallery_urls = (params.foundImages || []).slice(1, 6);

    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return {
      title,
      slug,
      excerpt,
      content,
      codes: finalCodes,
      cover_url,
      gallery_urls,
      game_id: params.game?.id,
      game_slug: params.game?.slug,
      game_name: gameName,
      tags: ['Giftcode', gameName, 'TinTucGame', 'CapNhat'],
      author: 'CodeGame Editorial',
      status: 'PUBLISHED',
      is_featured: false,
      is_hot: true,
      virtual_views: Math.floor(Math.random() * 200) + 180,
      views_growth_rate: 1.0,
      read_time_minutes: 3,
    };
  }
}

export const newsService = new NewsService();
