import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Newspaper,
  Plus,
  Sparkles,
  Search,
  Eye,
  Trash2,
  Edit,
  Clock,
  Gift,
  Flame,
  CheckCircle2,
  Globe,
  RefreshCw,
  ExternalLink,
  Bot,
  Calendar,
  Save,
  X,
  FileText,
  Gamepad2,
  Share2,
  Image,
  ImageIcon,
  TrendingUp,
  Bold,
  Heading2,
  Heading3,
  List,
  Quote,
  Upload,
  Check,
  Zap,
  ClipboardPaste,
  AlertCircle,
  Info,
  Layers,
  StopCircle,
  Play,
  CheckCircle,
  Settings,
  Send,
  Radio,
  History,
  Bell,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { NewsArticle } from '../../types/game';
import { newsService } from '../../services/newsService';
import { NewsDetailModal } from '../../components/NewsDetailModal';
import type { NewsAutoSource, NewsScheduleConfig, NewsCrawlLogItem } from '../../types/newsAutomation';
import { adminDataService } from '../services/adminDataService';
import { dataService } from '../../services/dataService';
import { SearchableGameSelect } from '../components/ui/SearchableGameSelect';
import { GameAdminRecord } from '../types/adminTypes';
import { smartVietnameseMatch, normalizeVietnamese } from '../../utils/textUtils';
import { compressImageFile, optimizeImageUrl, formatBytes } from '../../utils/imageCompressor';
import { isSpamOrAdArticle } from '../../utils/newsFilterUtils';

interface NewsModuleProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const NewsModule: React.FC<NewsModuleProps> = ({ onShowToast }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [games, setGames] = useState<GameAdminRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT' | 'SCHEDULED'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Edit / Create Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<NewsArticle>>({});
  const [codeInputValue, setCodeInputValue] = useState('');
  const [tagInputValue, setTagInputValue] = useState('');
  const [galleryInputValue, setGalleryInputValue] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState<'edit' | 'preview'>('edit');
  const [isCompressingCover, setIsCompressingCover] = useState(false);
  const [isCompressingGallery, setIsCompressingGallery] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [coverValidation, setCoverValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'valid' });
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Live cover_url validation using Image() preload & anti-derivation regex
  useEffect(() => {
    const rawCover = (editingArticle.cover_url || '').trim();
    if (!rawCover) {
      setCoverValidation({ status: 'valid' });
      return;
    }

    const BANNED_PATTERNS = [
      /moi-va-huong-dan/i,
      /huong-dan-cach-nhap/i,
      /tong-hop-giftcode/i,
      /cam-nang/i,
      /tat-tan-tat/i,
      /bang-xep-hang/i,
      /danh-sach-code/i,
    ];
    for (const p of BANNED_PATTERNS) {
      if (p.test(rawCover)) {
        setCoverValidation({
          status: 'invalid',
          message: 'Ảnh bìa nghi ngờ tự sinh từ tiêu đề bài viết (không phải icon game thật). Vui lòng chọn ảnh chuyên đề chuẩn hoặc logo game!',
        });
        return;
      }
    }

    if (rawCover.startsWith('data:') || rawCover.startsWith('blob:')) {
      setCoverValidation({ status: 'valid' });
      return;
    }

    setCoverValidation({ status: 'validating' });
    let active = true;
    const img = new window.Image();
    img.onload = () => {
      if (!active) return;
      setCoverValidation({ status: 'valid' });
    };
    img.onerror = () => {
      if (!active) return;
      setCoverValidation({
        status: 'invalid',
        message: 'Ảnh bìa không tồn tại (404) hoặc không tải được — bài viết sẽ hiển thị khung lỗi trên web nếu xuất bản!',
      });
    };
    img.src = rawCover;

    return () => {
      active = false;
    };
  }, [editingArticle.cover_url]);

  // AI Generator Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'rewrite' | 'bulk' | 'template'>('bulk');
  const [aiSelectedGame, setAiSelectedGame] = useState<GameAdminRecord | null>(null);
  const [aiTopicType, setAiTopicType] = useState<'codes' | 'update' | 'guide' | 'event'>('codes');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // AI Rewrite from Link/Content state
  const [crawlUrlInput, setCrawlUrlInput] = useState('');
  const [crawlRawContent, setCrawlRawContent] = useState('');
  const [isCrawlingUrl, setIsCrawlingUrl] = useState(false);
  const [crawledData, setCrawledData] = useState<{
    title?: string;
    excerpt?: string;
    cover_url?: string;
    content?: string;
    codes?: string[];
    images?: string[];
  } | null>(null);

  // Bulk Links Scanner & Batch Generator state
  const [bulkUrlsInput, setBulkUrlsInput] = useState<string>('');
  const [bulkPostStatus, setBulkPostStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [bulkAutoDetectGame, setBulkAutoDetectGame] = useState<boolean>(true);
  const [bulkUseGameLogo, setBulkUseGameLogo] = useState<boolean>(true);
  const [isBulkRunning, setIsBulkRunning] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    successCount: number;
    errorCount: number;
  }>({ current: 0, total: 0, successCount: 0, errorCount: 0 });

  interface BulkResultItem {
    id: string;
    url: string;
    status: 'pending' | 'crawling' | 'rewriting' | 'success' | 'error';
    title?: string;
    gameName?: string;
    gameSlug?: string;
    gameIcon?: string;
    codesCount?: number;
    createdArticleId?: string;
    createdArticleSlug?: string;
    errorMsg?: string;
  }
  const [bulkResults, setBulkResults] = useState<BulkResultItem[]>([]);
  const bulkAbortRef = useRef<boolean>(false);

  // Automation & Scheduling Modal state
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [automationActiveTab, setAutomationActiveTab] = useState<'sources' | 'schedule' | 'logs'>('sources');
  const [autoSources, setAutoSources] = useState<NewsAutoSource[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState<NewsScheduleConfig>(newsService.getScheduleConfig());
  const [crawlLogs, setCrawlLogs] = useState<NewsCrawlLogItem[]>([]);
  const [isTriggeringAutoCrawl, setIsTriggeringAutoCrawl] = useState(false);

  // New Source Form modal
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceForm, setNewSourceForm] = useState<Partial<NewsAutoSource>>({
    name: '',
    url: '',
    type: 'website',
    crawlFrequencyMinutes: 60,
    autoDetectGame: true,
    useGameLogoAsCover: true,
    status: 'ACTIVE',
  });
  const [newSourceKeywordsInput, setNewSourceKeywordsInput] = useState('code, giftcode, tân thủ');

  // Spam Cleanup state
  const [isCleaningSpam, setIsCleaningSpam] = useState(false);
  const [isSpamConfirmModalOpen, setIsSpamConfirmModalOpen] = useState(false);

  // Load initial data
  const loadData = () => {
    const list = newsService.getAllArticles();
    setArticles(list);
    const adminGames = adminDataService.getGames();
    setGames(adminGames);
    setAutoSources(newsService.getAutoSources());
    setScheduleConfig(newsService.getScheduleConfig());
    setCrawlLogs(newsService.getCrawlLogs());
  };

  useEffect(() => {
    loadData();
    // Tự động kéo dữ liệu tin tức mới nhất từ Cloudflare D1 về trang Admin
    newsService.syncFromServer().then(() => {
      loadData();
    }).catch(() => {});
    adminDataService.fetchFromCloudflareKV().then(() => {
      loadData();
    }).catch(() => {});

    const handleNewsUpdate = () => {
      setArticles(newsService.getAllArticles());
      setAutoSources(newsService.getAutoSources());
      setScheduleConfig(newsService.getScheduleConfig());
      setCrawlLogs(newsService.getCrawlLogs());
    };
    window.addEventListener('wcg_news_updated', handleNewsUpdate);
    return () => window.removeEventListener('wcg_news_updated', handleNewsUpdate);
  }, []);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const matches = smartVietnameseMatch(
          [a.title, a.excerpt, a.game_name || '', ...(a.tags || [])],
          searchQuery
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [articles, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalViews = articles.reduce((acc, a) => acc + (a.views || 0), 0);
    const totalCodes = articles.reduce((acc, a) => acc + (a.codes?.length || 0), 0);
    const publishedCount = articles.filter((a) => a.status === 'PUBLISHED').length;
    const scheduledCount = articles.filter((a) => a.status === 'SCHEDULED').length;
    const draftCount = articles.filter((a) => a.status === 'DRAFT').length;
    const featuredCount = articles.filter((a) => a.is_featured).length;
    return { total: articles.length, totalViews, totalCodes, publishedCount, scheduledCount, draftCount, featuredCount };
  }, [articles]);

  // Danh sách bài viết bị phát hiện là rác / phụ kiện / quảng cáo
  const detectedSpamArticles = useMemo(() => {
    return articles
      .map((a) => {
        const res = isSpamOrAdArticle(a.title, `${a.excerpt || ''} ${a.content || ''}`, a.slug);
        return { article: a, isSpam: res.isSpam, reason: res.reason };
      })
      .filter((item) => item.isSpam);
  }, [articles]);

  // Xử lý dọn dẹp bài rác 1 chạm
  const handleConfirmCleanupSpam = async () => {
    setIsCleaningSpam(true);
    try {
      const result = await newsService.cleanupSpamArticles();
      setArticles(newsService.getAllArticles());
      setIsSpamConfirmModalOpen(false);
      onShowToast(
        'Đã dọn dẹp sạch sẽ! 🧹',
        `Đã xóa vĩnh viễn ${result.deletedCount} bài viết rác/quảng cáo và lưu vào danh sách Tombstones ngăn chặn hồi sinh.`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi dọn dẹp', err?.message || 'Không thể dọn dẹp bài viết rác', 'error');
    } finally {
      setIsCleaningSpam(false);
    }
  };

  // Handle open create new article
  const handleOpenCreate = () => {
    const newId = `news_${Date.now()}`;
    setEditingArticle({
      id: newId,
      slug: `tin-tuc-game-${Date.now().toString().slice(-6)}`,
      title: '',
      excerpt: '',
      content: '',
      cover_url: '',
      gallery_urls: [],
      virtual_views: 120,
      views_growth_rate: 1.0,
      author: 'CodeGame Editorial',
      views: 0,
      read_time_minutes: 3,
      is_featured: false,
      is_hot: false,
      status: 'PUBLISHED',
      codes: [],
      tags: ['Giftcode', 'GameMobile'],
      published_at: new Date().toISOString(),
    });
    setCodeInputValue('');
    setTagInputValue('Giftcode, GameMobile');
    setGalleryInputValue('');
    setActiveEditorTab('edit');
    setIsEditorOpen(true);
  };

  // Handle open edit article
  const handleOpenEdit = (article: NewsArticle) => {
    setEditingArticle({
      ...article,
      gallery_urls: article.gallery_urls || [],
      virtual_views: article.virtual_views !== undefined ? article.virtual_views : 0,
      views_growth_rate: article.views_growth_rate !== undefined ? article.views_growth_rate : 1.0,
    });
    setCodeInputValue('');
    setTagInputValue(article.tags?.join(', ') || '');
    setGalleryInputValue('');
    setActiveEditorTab('edit');
    setIsEditorOpen(true);
  };

  // Insert text at cursor position in content textarea
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = contentTextareaRef.current;
    const current = editingArticle.content || '';
    if (!textarea) {
      setEditingArticle({ ...editingArticle, content: current + '\n' + textToInsert });
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent = current.substring(0, start) + textToInsert + current.substring(end);
    setEditingArticle({ ...editingArticle, content: nextContent });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  // Format ISO date string for datetime-local input
  const formatForDatetimeLocal = (isoString?: string) => {
    if (!isoString) {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const setScheduledPresetHours = (hours: number) => {
    const d = new Date(Date.now() + hours * 60 * 60 * 1000);
    setEditingArticle((prev) => ({
      ...prev,
      scheduled_publish_at: d.toISOString(),
    }));
  };

  const setScheduledPresetMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setEditingArticle((prev) => ({
      ...prev,
      scheduled_publish_at: d.toISOString(),
    }));
  };

  const setScheduledPresetEvening = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    setEditingArticle((prev) => ({
      ...prev,
      scheduled_publish_at: d.toISOString(),
    }));
  };

  // Kích hoạt xuất bản ngay lập tức một bài viết đang trong lịch hẹn đăng
  const handlePublishScheduledNow = async (article: NewsArticle) => {
    if (confirm(`Bạn có chắc muốn kích hoạt xuất bản ngay bài viết "${article.title}"?`)) {
      await newsService.publishScheduledArticleNow(article.id);
      setArticles(newsService.getAllArticles());
      onShowToast('Đã xuất bản ngay! ⚡', `Bài viết "${article.title}" đã được xuất bản công khai.`, 'success');
      newsService.syncArticlesToCloudflare();
    }
  };

  // Tải & Nén ảnh bìa từ máy tính
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Định dạng không hợp lệ', 'Vui lòng chọn file hình ảnh (PNG, JPG, WebP)!', 'error');
      return;
    }

    setIsCompressingCover(true);
    try {
      const res = await compressImageFile(file, {
        maxWidth: 1400,
        maxHeight: 900,
        quality: 0.82,
        format: 'image/webp',
      });

      setEditingArticle((prev) => ({
        ...prev,
        cover_url: res.dataUrl,
      }));

      onShowToast(
        'Nén ảnh bìa thành công! ⚡',
        `Dung lượng: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (Giảm ${res.savedPercent}%, WebP siêu nhẹ)`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi nén ảnh', err?.message || 'Không thể nén file ảnh', 'error');
    } finally {
      setIsCompressingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  // Tải & Nén ảnh phụ/thư viện từ máy tính
  const handleGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Định dạng không hợp lệ', 'Vui lòng chọn file hình ảnh!', 'error');
      return;
    }

    setIsCompressingGallery(true);
    try {
      const res = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.80,
        format: 'image/webp',
      });

      const currentGallery = editingArticle.gallery_urls || [];
      setEditingArticle((prev) => ({
        ...prev,
        gallery_urls: [...currentGallery, res.dataUrl],
      }));

      onShowToast(
        'Đã nén & thêm ảnh vào bài! ⚡',
        `Dung lượng: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (Giảm ${res.savedPercent}%, WebP)`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi nén ảnh', err?.message || 'Không thể nén file ảnh', 'error');
    } finally {
      setIsCompressingGallery(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  // Đặt ảnh trong thư viện làm ảnh bìa
  const handleSetGalleryAsCover = (url: string) => {
    setEditingArticle((prev) => ({ ...prev, cover_url: url }));
    onShowToast('Đã đổi ảnh bìa', 'Đã đặt hình ảnh này làm ảnh bìa chính của bài viết!', 'info');
  };

  // Add gallery image
  const handleAddGalleryImage = () => {
    const trimmed = galleryInputValue.trim();
    if (!trimmed) return;
    const optimized = optimizeImageUrl(trimmed, 1000);
    const currentList = editingArticle.gallery_urls || [];
    if (currentList.includes(optimized)) {
      onShowToast('Ảnh đã tồn tại', 'Hình ảnh này đã có trong bộ sưu tập!', 'info');
      return;
    }
    setEditingArticle({
      ...editingArticle,
      gallery_urls: [...currentList, optimized],
    });
    setGalleryInputValue('');
    onShowToast('Đã thêm ảnh', 'Đã tối ưu hóa và thêm ảnh vào bộ sưu tập.', 'success');
  };

  // Remove gallery image
  const handleRemoveGalleryImage = (urlToRemove: string) => {
    const currentList = editingArticle.gallery_urls || [];
    setEditingArticle({
      ...editingArticle,
      gallery_urls: currentList.filter((u) => u !== urlToRemove),
    });
  };

  // Insert image markdown into content
  const handleInsertGalleryImageIntoText = (url: string, caption?: string) => {
    const markdown = `\n\n![${caption || 'Ảnh minh họa'}](${url})\n\n`;
    insertTextAtCursor(markdown);
    onShowToast('Đã chèn ảnh', 'Đã chèn ảnh vào vị trí con trỏ trong bài viết!', 'success');
  };

  // Toolbar markdown action
  const handleToolbarAction = (type: 'bold' | 'h2' | 'h3' | 'list' | 'quote' | 'image') => {
    const textarea = contentTextareaRef.current;
    const start = textarea?.selectionStart || 0;
    const end = textarea?.selectionEnd || 0;
    const selected = (editingArticle.content || '').substring(start, end).trim();

    switch (type) {
      case 'bold': {
        const text = selected || prompt('Nhập nội dung cần in đậm:')?.trim() || '';
        if (text) insertTextAtCursor(`**${text}**`);
        break;
      }
      case 'h2': {
        const text = selected || prompt('Nhập tiêu đề mục lớn (H2):')?.trim() || '';
        if (text) insertTextAtCursor(`\n\n## ${text}\n\n`);
        break;
      }
      case 'h3': {
        const text = selected || prompt('Nhập tiêu đề mục nhỏ (H3):')?.trim() || '';
        if (text) insertTextAtCursor(`\n\n### ${text}\n\n`);
        break;
      }
      case 'list': {
        if (selected) {
          const listText = selected
            .split('\n')
            .map((l) => `- ${l.replace(/^[-*•]\s*/, '').trim()}`)
            .filter((l) => l.length > 2)
            .join('\n');
          insertTextAtCursor(`\n\n${listText}\n\n`);
        } else {
          const item = prompt('Nhập nội dung gạch đầu dòng:')?.trim() || '';
          if (item) insertTextAtCursor(`\n- ${item}\n`);
        }
        break;
      }
      case 'quote': {
        const text = selected || prompt('Nhập nội dung hộp lưu ý / mẹo:')?.trim() || '';
        if (text) insertTextAtCursor(`\n\n> 💡 **Lưu ý:** ${text}\n\n`);
        break;
      }
      case 'image': {
        const url = prompt('Nhập URL hình ảnh muốn chèn:');
        if (url?.trim()) {
          const cap = prompt('Nhập chú thích ảnh (tùy chọn):') || 'Ảnh minh họa';
          insertTextAtCursor(`\n\n![${cap.trim()}](${url.trim()})\n\n`);
        }
        break;
      }
    }
  };

  // Handle Save article
  const handleSaveArticle = async () => {
    if (!editingArticle.title?.trim()) {
      onShowToast('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề cho bài viết!', 'error');
      return;
    }
    if (!editingArticle.content?.trim()) {
      onShowToast('Thiếu nội dung', 'Vui lòng nhập nội dung chi tiết cho bài viết!', 'error');
      return;
    }

    if (coverValidation.status === 'invalid') {
      onShowToast('Ảnh bìa không hợp lệ', coverValidation.message || 'Vui lòng chọn ảnh bìa hợp lệ trước khi lưu!', 'error');
      return;
    }

    const slug =
      editingArticle.slug?.trim() ||
      editingArticle.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const parsedTags = tagInputValue
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const status = editingArticle.status || 'PUBLISHED';
    let scheduledPublishAt = editingArticle.scheduled_publish_at;

    if (status === 'SCHEDULED') {
      if (!scheduledPublishAt) {
        onShowToast('Thiếu thời gian hẹn', 'Vui lòng chọn ngày và giờ hẹn đăng tự động!', 'error');
        return;
      }
      const schedTime = new Date(scheduledPublishAt).getTime();
      if (isNaN(schedTime)) {
        onShowToast('Thời gian không hợp lệ', 'Vui lòng chọn lại thời gian hẹn đăng hợp lệ!', 'error');
        return;
      }
    } else {
      scheduledPublishAt = undefined;
    }

    const articleToSave: NewsArticle = {
      id: editingArticle.id || `news_${Date.now()}`,
      slug,
      title: editingArticle.title.trim(),
      excerpt: editingArticle.excerpt?.trim() || editingArticle.content.slice(0, 180) + '...',
      content: editingArticle.content,
      cover_url:
        editingArticle.cover_url ||
        (editingArticle.game_slug ? `/game_icons/${editingArticle.game_slug}.webp` : '/news_covers/thi-truong-game-viet-nam.webp'),
      gallery_urls: editingArticle.gallery_urls || [],
      virtual_views: Number(editingArticle.virtual_views) || 0,
      views_growth_rate: editingArticle.views_growth_rate !== undefined ? Number(editingArticle.views_growth_rate) : 1.0,
      game_id: editingArticle.game_id,
      game_slug: editingArticle.game_slug,
      game_name: editingArticle.game_name,
      tags: parsedTags,
      codes: editingArticle.codes || [],
      author: 'CodeGame.Shop',
      source_name: 'CodeGame.Shop',
      source_url: editingArticle.source_url || 'https://codegame.shop',
      views: editingArticle.views || 0,
      read_time_minutes: editingArticle.read_time_minutes || 3,
      is_featured: Boolean(editingArticle.is_featured),
      is_hot: Boolean(editingArticle.is_hot),
      status,
      published_at: editingArticle.published_at || (status === 'SCHEDULED' && scheduledPublishAt ? scheduledPublishAt : new Date().toISOString()),
      scheduled_publish_at: scheduledPublishAt,
    };

    newsService.saveArticle(articleToSave);
    setArticles(newsService.getAllArticles());
    setIsEditorOpen(false);
    onShowToast(
      status === 'SCHEDULED' ? 'Đã lên lịch hẹn đăng! ⏰' : 'Thành công',
      status === 'SCHEDULED'
        ? `Bài viết sẽ tự động xuất bản vào ${new Date(scheduledPublishAt!).toLocaleString('vi-VN')}`
        : 'Đã lưu bài viết tin tức thành công!',
      'success'
    );

    // Trigger background cloud sync
    newsService.syncArticlesToCloudflare();
  };

  // Handle Delete article
  const handleDeleteArticle = async (articleId: string, title: string) => {
    if (confirm(`Bạn có chắc muốn xóa vĩnh viễn bài viết "${title}"?`)) {
      await newsService.deleteArticle(articleId);
      setArticles(newsService.getAllArticles());
      onShowToast('Đã xóa vĩnh viễn', `Đã xóa bài viết "${title}"`, 'info');
    }
  };

  // Toggle Featured
  const handleToggleFeatured = (article: NewsArticle) => {
    const updated: NewsArticle = { ...article, is_featured: !article.is_featured };
    newsService.saveArticle(updated);
    setArticles(newsService.getAllArticles());
    onShowToast(
      updated.is_featured ? 'Đã ghim Tiêu Điểm' : 'Đã bỏ ghim Tiêu Điểm',
      article.title,
      'success'
    );
  };

  // Toggle Hot
  const handleToggleHot = (article: NewsArticle) => {
    const updated: NewsArticle = { ...article, is_hot: !article.is_hot };
    newsService.saveArticle(updated);
    setArticles(newsService.getAllArticles());
    onShowToast(updated.is_hot ? 'Đã bật HOT' : 'Đã tắt HOT', article.title, 'success');
  };

  // Sync to Cloudflare D1 (2 chiều: kéo dữ liệu mới nhất từ máy chủ trước, sau đó đồng bộ an toàn)
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Kéo dữ liệu mới nhất trực tiếp từ SSOT /api/news trên Cloudflare D1
      await newsService.syncFromServer();
      const list = newsService.getAllArticles();
      setArticles(list);

      // 2. Đẩy danh mục bài viết đồng bộ lên /api/sync và D1 để Web Khách cập nhật tức thì
      const ok = await newsService.syncArticlesToCloudflare();
      const finalList = newsService.getAllArticles();
      setArticles(finalList);

      if (ok) {
        onShowToast('Đã đồng bộ D1', `Đã đồng bộ đầy đủ ${finalList.length} bài viết tin tức với Cloudflare D1 & Web Khách!`, 'success');
      } else {
        onShowToast('Đã làm mới dữ liệu', `Đã kéo ${finalList.length} bài viết tin tức mới nhất từ máy chủ D1!`, 'info');
      }
    } catch (e: any) {
      onShowToast('Lỗi đồng bộ', e?.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // AI Generator: Run draft generation (Chế độ 1: Theo game)
  const handleRunAiGenerator = () => {
    if (!aiSelectedGame) {
      onShowToast('Vui lòng chọn game', 'Hãy chọn tựa game bạn muốn AI viết bài!', 'error');
      return;
    }

    setIsGeneratingAi(true);

    try {
      // Find codes for this game safely from catalog
      let gameCodes: string[] = [];
      try {
        const found = dataService.getCodesForGame(aiSelectedGame as any);
        if (Array.isArray(found) && found.length > 0) {
          gameCodes = found.map((c) => c.code);
        } else {
          const adminFound = adminDataService.getFreeCodes({ gameSlug: aiSelectedGame.slug });
          if (Array.isArray(adminFound) && adminFound.length > 0) {
            gameCodes = adminFound.map((c) => c.code);
          }
        }
      } catch (err) {
        console.warn('Cannot fetch codes for game:', err);
      }

      const gameLogo =
        aiSelectedGame.cover_image_url ||
        aiSelectedGame.icon_url ||
        aiSelectedGame.bannerUrl ||
        (aiSelectedGame.slug ? `/game_icons/${aiSelectedGame.slug}.webp` : '');

      const draft = newsService.generateAiArticleDraft({
        game: {
          id: aiSelectedGame.id,
          name: aiSelectedGame.name,
          slug: aiSelectedGame.slug,
          cover_image_url: gameLogo,
          banner_url: gameLogo,
          icon_url: gameLogo,
        },
        topicType: aiTopicType,
        availableCodes: gameCodes,
      });

      const slug =
        draft.slug ||
        (draft.title || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      // Populate into editor
      setEditingArticle({ ...draft, slug });
      setCodeInputValue('');
      setTagInputValue(draft.tags?.join(', ') || '');
      setIsAiModalOpen(false);
      setIsEditorOpen(true);

      onShowToast(
        'AI tạo bài thành công! ✨',
        `Đã tạo bài viết chuẩn SEO cho "${aiSelectedGame.name}". Bạn có thể xem lại và lưu ngay.`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi AI Generator', err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Generator: Bóc tách bài viết từ link URL
  const handleCrawlUrl = async () => {
    const url = crawlUrlInput.trim();
    if (!url || !url.startsWith('http')) {
      onShowToast('Link không hợp lệ', 'Vui lòng nhập đường link bài viết đầy đủ (bắt đầu bằng https://)', 'error');
      return;
    }

    setIsCrawlingUrl(true);
    try {
      const res = await fetch('/api/crawl-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!data.success) {
        onShowToast(
          data.isSocial ? 'Mẹo Facebook / Mạng xã hội' : 'Thông báo',
          data.error || 'Không thể cào link do trang web bảo mật. Bạn có thể dán trực tiếp nội dung bài báo vào ô dưới.',
          data.isSocial ? 'info' : 'error'
        );
        return;
      }

      setCrawledData(data);
      if (data.content) {
        setCrawlRawContent(data.content);
      }

      // Tự động tìm game phù hợp nhất từ tiêu đề bài viết
      if (data.title) {
        const normTitle = normalizeVietnamese(data.title);
        const candidates = games
          .map((g) => {
            const normName = normalizeVietnamese(g.name);
            let score = 0;
            if (normTitle.includes(normName)) {
              score = normName.length * 100;
            } else if (normTitle.includes(normalizeVietnamese(g.slug))) {
              score = normalizeVietnamese(g.slug).length * 80;
            }
            return { game: g, score };
          })
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
          setAiSelectedGame(candidates[0].game);
        }
      }

      const spamCheck = isSpamOrAdArticle(data.title || '', data.content || '', url);
      if (spamCheck.isSpam) {
        onShowToast(
          'Cảnh báo bài rác / phụ kiện ⚠️',
          `Bài viết này có thể là quảng cáo hoặc phụ kiện (${spamCheck.reason}).`,
          'error'
        );
      } else {
        onShowToast(
          'Bóc tách thành công! ⚡',
          `Đã đọc nội dung bài viết | Tìm thấy ${data.codes?.length || 0} mã code | ${data.images?.length || 0} ảnh`,
          'success'
        );
      }
    } catch (err: any) {
      onShowToast('Lỗi kết nối', 'Không thể kết nối máy chủ bóc tách. Bạn hãy dán trực tiếp nội dung bài báo vào ô.', 'error');
    } finally {
      setIsCrawlingUrl(false);
    }
  };

  // AI Generator: Dán nội dung trực tiếp từ bộ nhớ tạm Clipboard (cho Facebook/Mạng xã hội)
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text
          .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u00A0]/g, ' ')
          .replace(/[»«►◄▲▼■◆●★☆❖✓✔✕✖]/g, ' ')
          .trim();
        setCrawlRawContent(clean);

        // Auto-detect game if matches
        const norm = normalizeVietnamese(clean);
        const candidates = games
          .map((g) => {
            const normName = normalizeVietnamese(g.name);
            let score = 0;
            if (norm.includes(normName)) score = normName.length * 100;
            return { game: g, score };
          })
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
          setAiSelectedGame(candidates[0].game);
        }

        onShowToast('Đã dán thành công 📋', `Đã nhận ${clean.length} ký tự từ bộ nhớ tạm!`, 'success');
      } else {
        onShowToast('Bộ nhớ tạm trống', 'Vui lòng sao chép bài viết trên Facebook trước khi dán.', 'info');
      }
    } catch {
      onShowToast('Thông báo', 'Trình duyệt chặn truy cập Clipboard, vui lòng nhấn Ctrl+V trực tiếp vào ô.', 'info');
    }
  };

  // AI Generator: Viết lại bài viết từ nội dung / link bài báo
  const handleRunAiRewrite = () => {
    const rawText = crawlRawContent.trim();
    if (!rawText) {
      onShowToast('Thiếu nội dung', 'Vui lòng nhập link bài viết và bấm "Quét Link", hoặc dán nội dung bài báo vào ô.', 'error');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const rewritten = newsService.rewriteArticleWithAi({
        rawTitle: crawledData?.title,
        rawContent: rawText,
        sourceUrl: crawlUrlInput.trim(),
        game: aiSelectedGame
          ? {
              id: aiSelectedGame.id,
              name: aiSelectedGame.name,
              slug: aiSelectedGame.slug,
              banner_url: aiSelectedGame.bannerUrl,
              icon_url: aiSelectedGame.iconUrl,
            }
          : null,
        foundCodes: crawledData?.codes || [],
        foundImages: crawledData?.images || [],
      });

      const slug =
        rewritten.slug ||
        (rewritten.title || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      // Populate into editor
      setEditingArticle({ ...rewritten, slug });
      setCodeInputValue('');
      setTagInputValue(rewritten.tags?.join(', ') || '');
      setIsAiModalOpen(false);
      setIsEditorOpen(true);

      onShowToast(
        'AI Viết lại thành công! ✨',
        `Đã tạo bài viết độc quyền chuẩn SEO và bóc tách ${rewritten.codes?.length || 0} mã code.`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi viết lại', err?.message || 'Có lỗi xảy ra khi viết lại bài', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Tìm kiếm tựa game phù hợp nhất cho bài viết khi quét hàng loạt
  const findMatchingGameForBulk = (url: string, title?: string, content?: string): GameAdminRecord | null => {
    if (!games || games.length === 0) return null;
    const combinedText = normalizeVietnamese(`${url} ${title || ''} ${(content || '').slice(0, 1000)}`);

    const matches = games
      .map((g) => {
        const normName = normalizeVietnamese(g.name || '');
        const normSlug = normalizeVietnamese(g.slug || '').replace(/-/g, ' ');
        let score = 0;

        if (normName.length >= 3 && combinedText.includes(normName)) {
          score = normName.length * 15;
        } else if (normSlug.length >= 4 && combinedText.includes(normSlug)) {
          score = normSlug.length * 10;
        }
        return { game: g, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);

    return matches.length > 0 ? matches[0].game : null;
  };

  // Dán danh sách link từ Clipboard
  const handlePasteBulkUrlsFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim();
        setBulkUrlsInput((prev) => (prev.trim() ? `${prev.trim()}\n${clean}` : clean));
        onShowToast('Đã dán từ Clipboard 📋', 'Đã thêm các đường link vào danh sách quét!', 'success');
      } else {
        onShowToast('Bộ nhớ tạm trống', 'Vui lòng sao chép các đường link trước khi dán.', 'info');
      }
    } catch {
      onShowToast('Thông báo', 'Vui lòng nhấn phím Ctrl+V để dán trực tiếp vào khung.', 'info');
    }
  };

  // Chèn link mẫu để test nhanh
  const handleInsertSampleUrls = () => {
    const samples = [
      'https://cellphones.com.vn/sforum/code-blox-fruit',
      'https://vietnamnet.vn/vn/cong-nghe/tin-game',
    ].join('\n');
    setBulkUrlsInput(samples);
    onShowToast('Đã thêm link mẫu 🎯', 'Bấm nút "🚀 Bắt Đầu Quét & Tạo Hàng Loạt" để thử nghiệm ngay!', 'info');
  };

  // Bắt đầu quét hàng loạt và tạo bài viết
  const handleStartBulkGeneration = async () => {
    const rawLines = bulkUrlsInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && /^https?:\/\//i.test(l));

    // Lọc trùng lặp URL
    const uniqueUrls = Array.from(new Set(rawLines));

    if (uniqueUrls.length === 0) {
      onShowToast(
        'Chưa có link hợp lệ',
        'Vui lòng nhập ít nhất 1 đường link bài viết (bắt đầu bằng http:// hoặc https://)',
        'error'
      );
      return;
    }

    bulkAbortRef.current = false;
    setIsBulkRunning(true);

    const initialItems: BulkResultItem[] = uniqueUrls.map((url, idx) => ({
      id: `bulk_${Date.now()}_${idx}`,
      url,
      status: 'pending',
    }));

    setBulkResults(initialItems);
    setBulkProgress({
      current: 0,
      total: uniqueUrls.length,
      successCount: 0,
      errorCount: 0,
    });

    let success = 0;
    let error = 0;

    for (let i = 0; i < initialItems.length; i++) {
      if (bulkAbortRef.current) {
        onShowToast(
          'Đã tạm dừng',
          `Tiến trình quét đã dừng lại. Đã tạo thành công ${success}/${uniqueUrls.length} bài viết.`,
          'info'
        );
        break;
      }

      const item = initialItems[i];

      // Đang cào dữ liệu
      setBulkResults((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'crawling' } : it))
      );
      setBulkProgress((prev) => ({ ...prev, current: i + 1 }));

      try {
        const res = await fetch('/api/crawl-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url }),
        });

        const data = await res.json();

        if (!data.success) {
          error++;
          setBulkResults((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    status: 'error',
                    errorMsg: data.isSocial
                      ? 'Bị chặn (Yêu cầu đăng nhập Facebook)'
                      : data.error || 'Lỗi tải trang web (404/Bảo mật)',
                  }
                : it
            )
          );
          setBulkProgress((prev) => ({ ...prev, errorCount: error }));
          continue;
        }

        // Kiểm tra bộ lọc bài rác / phụ kiện / quảng cáo
        const spamCheck = isSpamOrAdArticle(data.title || '', data.content || '', item.url);
        if (spamCheck.isSpam) {
          error++;
          setBulkResults((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    status: 'error',
                    title: data.title,
                    errorMsg: `Đã loại bỏ tự động (Quảng cáo/Phụ kiện: ${spamCheck.reason})`,
                  }
                : it
            )
          );
          setBulkProgress((prev) => ({ ...prev, errorCount: error }));
          continue;
        }

        // Tự động nhận diện Game
        const matchedGame = bulkAutoDetectGame
          ? findMatchingGameForBulk(item.url, data.title, data.content)
          : null;

        // Nếu không khớp game trong danh mục và không có mã giftcode thật -> bỏ qua
        if (!matchedGame && (!data.codes || data.codes.length === 0)) {
          error++;
          setBulkResults((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    status: 'error',
                    title: data.title,
                    errorMsg: 'Bỏ qua do không khớp game trong danh mục và không có mã code',
                  }
                : it
            )
          );
          setBulkProgress((prev) => ({ ...prev, errorCount: error }));
          continue;
        }

        // Đang viết lại bài bằng AI
        setBulkResults((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'rewriting',
                  title: data.title,
                  codesCount: data.codes?.length || 0,
                }
              : it
          )
        );

        // Viết lại nội dung độc quyền chuẩn SEO
        const rewritten = newsService.rewriteArticleWithAi({
          rawTitle: data.title,
          rawContent: data.content,
          sourceUrl: item.url,
          game: matchedGame
            ? {
                id: matchedGame.id,
                name: matchedGame.name,
                slug: matchedGame.slug,
                banner_url: matchedGame.bannerUrl || matchedGame.cover_image_url,
                icon_url: matchedGame.iconUrl || matchedGame.icon_url,
              }
            : null,
          foundCodes: data.codes || [],
          foundImages: data.images || [],
        });

        const gameLogo = matchedGame
          ? matchedGame.cover_image_url ||
            matchedGame.icon_url ||
            matchedGame.bannerUrl ||
            (matchedGame.slug ? `/game_icons/${matchedGame.slug}.webp` : '')
          : '';

        const finalCover =
          bulkUseGameLogo && gameLogo
            ? gameLogo
            : rewritten.cover_url || data.cover_url || gameLogo || '';

        const newArticle: NewsArticle = {
          id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          slug: rewritten.slug || `tin-tuc-${Date.now().toString(36)}`,
          title: rewritten.title || data.title || 'Tin Tức Game Mới Nhất',
          excerpt: rewritten.excerpt || '',
          content: rewritten.content || '',
          cover_url: finalCover,
          gallery_urls: rewritten.gallery_urls || [],
          virtual_views: Math.floor(Math.random() * 200) + 150,
          views_growth_rate: 1.0,
          game_id: matchedGame?.id,
          game_slug: matchedGame?.slug,
          game_name: matchedGame?.name,
          tags: rewritten.tags || ['Giftcode', 'GameMobile'],
          codes: rewritten.codes || [],
          author: 'CodeGame Editorial',
          views: 0,
          read_time_minutes: rewritten.read_time_minutes || 3,
          is_featured: false,
          is_hot: false,
          status: bulkPostStatus,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Lưu bài viết (tạm hoãn sync cloud để gộp sync 1 lần cuối)
        await newsService.saveArticle(newArticle, { skipSync: true });
        success++;

        // Cập nhật trạng thái thành công
        setBulkResults((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'success',
                  title: newArticle.title,
                  gameName: matchedGame?.name,
                  gameSlug: matchedGame?.slug,
                  gameIcon: gameLogo,
                  codesCount: newArticle.codes?.length || 0,
                  createdArticleId: newArticle.id,
                  createdArticleSlug: newArticle.slug,
                }
              : it
          )
        );
        setBulkProgress((prev) => ({ ...prev, successCount: success }));

        // Nghỉ nhẹ 350ms giữa các request để đảm bảo an toàn mạng
        await new Promise((r) => setTimeout(r, 350));
      } catch (err: any) {
        error++;
        setBulkResults((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  errorMsg: err?.message || 'Lỗi mạng hoặc kết nối timeout',
                }
              : it
          )
        );
        setBulkProgress((prev) => ({ ...prev, errorCount: error }));
      }
    }

    setIsBulkRunning(false);

    // Đồng bộ lên Cloudflare D1 và tải lại danh sách bài viết
    if (success > 0) {
      await newsService.syncArticlesToCloudflare();
      setArticles(newsService.getAllArticles());
      onShowToast(
        'Hoàn tất tạo hàng loạt! 🎉',
        `Đã tạo thành công ${success}/${uniqueUrls.length} bài viết chuẩn SEO và đồng bộ lên D1!`,
        'success'
      );
    }
  };

  // Dừng tiến trình quét hàng loạt
  const handleStopBulk = () => {
    bulkAbortRef.current = true;
    setIsBulkRunning(false);
    onShowToast('Đang dừng...', 'Tiến trình sẽ dừng lại sau khi xử lý xong link hiện tại.', 'info');
  };

  // Mở bài viết vừa tạo để xem/sửa
  const handleOpenCreatedArticle = (articleId?: string) => {
    if (!articleId) return;
    const all = newsService.getAllArticles();
    const found = all.find((a) => a.id === articleId || a.slug === articleId);
    if (found) {
      setIsAiModalOpen(false);
      handleOpenEdit(found);
    }
  };

  // 1. Quản lý nguồn: Đổi trạng thái Bật / Tắt
  const handleToggleSourceStatus = async (sourceId: string) => {
    const updated = autoSources.map((s) =>
      s.id === sourceId
        ? { ...s, status: (s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE') as any }
        : s
    );
    setAutoSources(updated);
    await newsService.saveAutoSources(updated);
    onShowToast('Đã đổi trạng thái', 'Đã cập nhật trạng thái nguồn tin cào.', 'info');
  };

  // 2. Quản lý nguồn: Xóa nguồn
  const handleDeleteSource = async (sourceId: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa nguồn tin "${name}"?`)) {
      const updated = autoSources.filter((s) => s.id !== sourceId);
      setAutoSources(updated);
      await newsService.saveAutoSources(updated);
      onShowToast('Đã xóa nguồn', `Đã loại bỏ nguồn "${name}".`, 'info');
    }
  };

  // 3. Quản lý nguồn: Lưu nguồn mới
  const handleSaveNewSource = async () => {
    if (!newSourceForm.name?.trim()) {
      onShowToast('Thiếu thông tin', 'Vui lòng nhập tên nguồn tin tức.', 'error');
      return;
    }
    if (!newSourceForm.url?.trim() || !newSourceForm.url.startsWith('http')) {
      onShowToast('URL không hợp lệ', 'Vui lòng nhập đường link URL đầy đủ (bắt đầu bằng http:// hoặc https://).', 'error');
      return;
    }

    const keywords = newSourceKeywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const sourceToAdd: NewsAutoSource = {
      id: `src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newSourceForm.name.trim(),
      url: newSourceForm.url.trim(),
      type: newSourceForm.type || 'website',
      crawlFrequencyMinutes: Number(newSourceForm.crawlFrequencyMinutes) || 60,
      filterKeywords: keywords.length > 0 ? keywords : ['code', 'giftcode'],
      autoDetectGame: Boolean(newSourceForm.autoDetectGame !== false),
      useGameLogoAsCover: Boolean(newSourceForm.useGameLogoAsCover !== false),
      status: 'ACTIVE',
      articlesFoundCount: 0,
    };

    const updated = [...autoSources, sourceToAdd];
    setAutoSources(updated);
    await newsService.saveAutoSources(updated);
    setIsAddingSource(false);
    setNewSourceForm({
      name: '',
      url: '',
      type: 'website',
      crawlFrequencyMinutes: 60,
      autoDetectGame: true,
      useGameLogoAsCover: true,
      status: 'ACTIVE',
    });
    setNewSourceKeywordsInput('code, giftcode, tân thủ');
    onShowToast('Đã thêm nguồn mới 🎉', `Nguồn "${sourceToAdd.name}" đã được kích hoạt thành công!`, 'success');
  };

  // 3b. Quản lý nguồn: Khôi phục toàn bộ 10 nguồn tin uy tín mặc định
  const handleResetToDefaultSources = async () => {
    if (confirm('Bạn có muốn đồng bộ và cập nhật lại danh sách 10 nguồn tin tức game chất lượng cao mặc định không?')) {
      const resetList = await newsService.resetToDefaultAutoSources();
      setAutoSources(resetList);
      onShowToast('Đã nạp nguồn mặc định! 🚀', `Đã đồng bộ đầy đủ ${resetList.length} nguồn tin tức uy tín hàng đầu.`, 'success');
    }
  };

  // 4. Lập lịch: Cập nhật cấu hình
  const handleSaveScheduleConfig = async (changes: Partial<NewsScheduleConfig>) => {
    const next = { ...scheduleConfig, ...changes };
    setScheduleConfig(next);
    await newsService.saveScheduleConfig(next);
    onShowToast('Đã lưu cấu hình', 'Đã cập nhật quy tắc lập lịch và tự động hóa.', 'success');
  };

  // 5. Kích hoạt quét toàn bộ nguồn ngay trên trình duyệt
  const handleTriggerAllSourcesNow = async () => {
    const active = autoSources.filter((s) => s.status === 'ACTIVE');
    if (active.length === 0) {
      onShowToast('Không có nguồn bật', 'Vui lòng bật ít nhất 1 nguồn ở trạng thái "Đang hoạt động" để quét.', 'error');
      return;
    }

    setIsTriggeringAutoCrawl(true);
    onShowToast('Đang quét toàn bộ nguồn ⚡', `Hệ thống đang tiến hành quét ${active.length} nguồn cố định...`, 'info');

    let totalCreated = 0;
    const nowIso = new Date().toISOString();
    const updatedSources = [...autoSources];

    try {
      for (const source of active) {
        try {
          const res = await fetch('/api/crawl-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: source.url }),
          });
          const data = await res.json();

          if (data && data.success && (data.title || data.content)) {
            const existing = articles.some(
              (a) =>
                (data.title && a.title.toLowerCase().trim() === data.title.toLowerCase().trim()) ||
                (a.source_url && a.source_url.toLowerCase().trim() === source.url.toLowerCase().trim())
            );

            if (!existing) {
              const matchedGame = source.autoDetectGame
                ? findMatchingGameForBulk(source.url, data.title, data.content)
                : null;

              const rewritten = newsService.rewriteArticleWithAi({
                rawTitle: data.title,
                rawContent: data.content,
                sourceUrl: source.url,
                game: matchedGame
                  ? {
                      id: matchedGame.id,
                      name: matchedGame.name,
                      slug: matchedGame.slug,
                      banner_url: matchedGame.bannerUrl || matchedGame.cover_image_url,
                      icon_url: matchedGame.iconUrl || matchedGame.icon_url,
                    }
                  : null,
                foundCodes: data.codes || [],
                foundImages: data.images || [],
              });

              const gameLogo = matchedGame
                ? matchedGame.cover_image_url || matchedGame.icon_url || (matchedGame.slug ? `/game_icons/${matchedGame.slug}.webp` : '')
                : '';

              const finalCover = source.useGameLogoAsCover && gameLogo ? gameLogo : (rewritten.cover_url || data.cover_url || gameLogo || '');

              const newArt: NewsArticle = {
                id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                slug: rewritten.slug || `tin-tuc-${Date.now().toString(36)}`,
                title: rewritten.title || data.title || 'Tin Tức Game Mới Nhất',
                excerpt: rewritten.excerpt || '',
                content: rewritten.content || '',
                cover_url: finalCover,
                gallery_urls: rewritten.gallery_urls || [],
                virtual_views: Math.floor(Math.random() * 200) + 150,
                views_growth_rate: 1.0,
                game_id: matchedGame?.id,
                game_slug: matchedGame?.slug,
                game_name: matchedGame?.name,
                tags: rewritten.tags || ['Giftcode', 'GameMobile'],
                codes: rewritten.codes || [],
                author: 'CodeGame Editorial',
                views: 0,
                read_time_minutes: 3,
                is_featured: false,
                is_hot: true,
                status: scheduleConfig.defaultPublishStatus || 'PUBLISHED',
                published_at: nowIso,
                updated_at: nowIso,
                source_url: source.url,
              };

              await newsService.saveArticle(newArt, { skipSync: true });
              totalCreated++;

              newsService.addCrawlLog({
                id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                timestamp: nowIso,
                sourceName: source.name,
                sourceUrl: source.url,
                articleTitle: newArt.title,
                gameName: newArt.game_name,
                codesCount: newArt.codes?.length || 0,
                status: 'SUCCESS',
                message: `Đã tự động tạo bài viết "${newArt.title}" (${newArt.codes?.length || 0} mã code)`,
              });
            } else {
              newsService.addCrawlLog({
                id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                timestamp: nowIso,
                sourceName: source.name,
                sourceUrl: source.url,
                codesCount: 0,
                status: 'SKIPPED_EXISTING',
                message: 'Bài viết đã tồn tại trên website, tự động bỏ qua để tránh trùng lặp.',
              });
            }

            const srcIdx = updatedSources.findIndex((s) => s.id === source.id);
            if (srcIdx >= 0) {
              updatedSources[srcIdx] = {
                ...updatedSources[srcIdx],
                lastCrawledAt: nowIso,
                articlesFoundCount: (updatedSources[srcIdx].articlesFoundCount || 0) + (existing ? 0 : 1),
              };
            }
          }
        } catch (itemErr) {
          console.warn('[Auto crawl error]:', itemErr);
        }
      }

      await newsService.saveAutoSources(updatedSources);
      setAutoSources(updatedSources);
      setCrawlLogs(newsService.getCrawlLogs());

      if (totalCreated > 0) {
        await newsService.syncArticlesToCloudflare();
        setArticles(newsService.getAllArticles());
        onShowToast('Hoàn tất quét nguồn! 🎉', `Đã tự động tạo và xuất bản thành công ${totalCreated} bài viết mới!`, 'success');
      } else {
        onShowToast('Đã quét xong', 'Tất cả các bài viết từ các nguồn đều đã được cập nhật trước đó.', 'info');
      }
    } catch (err: any) {
      onShowToast('Lỗi quét nguồn', err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsTriggeringAutoCrawl(false);
    }
  };

  // Editor: Add code pill
  const handleAddCodeToArticle = () => {
    if (!codeInputValue.trim()) return;
    const currentCodes = editingArticle.codes || [];
    const newCode = codeInputValue.trim().toUpperCase();
    if (!currentCodes.includes(newCode)) {
      setEditingArticle({ ...editingArticle, codes: [...currentCodes, newCode] });
    }
    setCodeInputValue('');
  };

  // Editor: Remove code pill
  const handleRemoveCodeFromArticle = (codeToRemove: string) => {
    const currentCodes = editingArticle.codes || [];
    setEditingArticle({
      ...editingArticle,
      codes: currentCodes.filter((c) => c !== codeToRemove),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 lg:p-8">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 border border-border/80 p-6 rounded-3xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary-light text-xs font-bold">
            <Newspaper className="w-3.5 h-3.5" />
            <span>NỘI DUNG & TIN TỨC GAME</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Quản Lý Tin Tức & Cập Nhật Giftcode
          </h1>
          <p className="text-xs text-muted-foreground">
            Biên tập bài viết, chia sẻ giftcode tự động, gắn kèm mã quà tặng và công cụ AI viết bài chuẩn SEO.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Automation & Scheduler button */}
          <button
            type="button"
            onClick={() => setIsAutomationModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-black text-xs shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
            title="Quản lý nguồn cố định, hẹn giờ tự động và báo cáo Telegram"
          >
            <Bot className="w-4 h-4 text-emerald-200 animate-pulse" />
            <span>⚙️ Tự Động Hóa 24/7</span>
          </button>

          {/* Bulk Link Scanner button */}
          <button
            type="button"
            onClick={() => {
              setAiMode('bulk');
              setIsAiModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-black text-xs shadow-lg hover:shadow-purple-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-pink-200" />
            <span>📚 Quét Hàng Loạt Link</span>
          </button>

          {/* AI Generator button */}
          <button
            type="button"
            onClick={() => {
              setAiSelectedGame(null);
              setIsAiModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs shadow-lg hover:shadow-amber-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>✨ AI Viết Bài</span>
          </button>

          {/* Create Manual button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Bài Viết</span>
          </button>

          {/* Sync D1 button */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleManualSync}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs border border-border/80 transition-all active:scale-95 cursor-pointer"
            title="Đồng bộ toàn bộ bài viết lên Cloudflare D1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ D1'}</span>
          </button>

          {/* Spam Cleanup button */}
          <button
            type="button"
            onClick={() => {
              if (detectedSpamArticles.length === 0) {
                onShowToast(
                  'Kho tin tức sạch sẽ ✨',
                  'Không phát hiện bất kỳ bài viết quảng cáo hoặc phụ kiện rác nào trong hệ thống!',
                  'success'
                );
                return;
              }
              setIsSpamConfirmModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs border transition-all active:scale-95 cursor-pointer shadow-sm ${
              detectedSpamArticles.length > 0
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-300 hover:bg-rose-500/25'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground border-border/80'
            }`}
            title="Quét và xóa vĩnh viễn các bài viết phụ kiện, quảng cáo không liên quan game"
          >
            <Trash2 className={`w-3.5 h-3.5 ${detectedSpamArticles.length > 0 ? 'text-rose-400' : 'text-muted-foreground'}`} />
            <span>Dọn Bài Rác</span>
            {detectedSpamArticles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black">
                {detectedSpamArticles.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Tổng bài viết</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono">{stats.total}</div>
          <div className="text-[11px] text-emerald-400 font-semibold">
            {stats.publishedCount} đã xuất bản
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Lượt xem độc giả</span>
            <Eye className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">
            {stats.totalViews.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-muted-foreground">Tương tác thực tế</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Mã Giftcode kèm theo</span>
            <Gift className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{stats.totalCodes}</div>
          <div className="text-[11px] text-muted-foreground">Sẵn sàng 1-click copy</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Bài viết tiêu điểm</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{stats.featuredCount}</div>
          <div className="text-[11px] text-muted-foreground">Ghim banner nổi bật</div>
        </div>
      </div>

      {/* 3. Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, game, tags..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Tất cả ({articles.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PUBLISHED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'PUBLISHED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Đã xuất bản ({stats.publishedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SCHEDULED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'SCHEDULED'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Lịch hẹn đăng ({stats.scheduledCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'DRAFT'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Bản nháp ({stats.draftCount})
          </button>
        </div>
      </div>

      {/* 4. Articles Table */}
      <div className="overflow-hidden rounded-3xl bg-card border border-border/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/70 border-b border-border/80 text-muted-foreground font-semibold">
              <tr>
                <th className="py-2.5 px-3 min-w-[200px]">Bài Viết</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Game Liên Kết</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Giftcode</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Lượt Xem</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Ghim / HOT</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Trạng Thái</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Ngày Đăng</th>
                <th className="sticky right-0 z-20 bg-muted/95 backdrop-blur-md py-2.5 px-3 text-right font-semibold shadow-[-6px_0_12px_rgba(0,0,0,0.18)] border-l border-border/80 whitespace-nowrap">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Không có bài viết nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredArticles.map((art) => (
                  <tr key={art.id} className="group hover:bg-muted/30 transition-colors">
                    {/* Bài Viết */}
                    <td className="py-2 px-3 min-w-[200px] max-w-[260px]">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <img
                            src={art.cover_url || (art.game_slug ? `/game_icons/${art.game_slug}.webp` : '/og-image.jpg')}
                            alt={art.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-border/60 shadow-xs cursor-pointer"
                            onClick={() => handleOpenEdit(art)}
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement;
                              el.onerror = null;
                              if (art.game_slug && !el.src.includes(`/game_icons/${art.game_slug}.webp`)) {
                                el.src = `/game_icons/${art.game_slug}.webp`;
                              } else {
                                el.src = '/og-image.jpg';
                              }
                            }}
                          />
                          {/* Logo phụ nhỏ ở góc ảnh */}
                          <img
                            src="/og-image.jpg"
                            alt="CodeGame"
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-1 ring-background shadow-xs object-cover pointer-events-none"
                            title="Nguồn xuất bản: CodeGame.Shop"
                          />
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="font-bold text-foreground truncate text-xs hover:text-primary transition-colors cursor-pointer"
                              title={art.title}
                              onClick={() => handleOpenEdit(art)}
                            >
                              {art.title}
                            </span>
                            {isSpamOrAdArticle(art.title, `${art.excerpt || ''} ${art.content || ''}`, art.slug).isSpam && (
                              <span
                                className="shrink-0 px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/35"
                                title="Bài viết chứa từ khóa phụ kiện / quảng cáo không liên quan game"
                              >
                                ⚠️ Rác
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
                            <span className="text-primary-light font-semibold">Nguồn: CodeGame.Shop</span>
                            <span>•</span>
                            <span className="font-mono">/news/{art.slug}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Game Liên Kết */}
                    <td className="py-2 px-2.5 max-w-[140px]">
                      {art.game_name ? (
                        <span
                          className="inline-block max-w-[130px] truncate px-2 py-0.5 rounded-lg bg-primary/10 text-primary-light font-bold text-[11px] border border-primary/20 align-middle"
                          title={art.game_name}
                        >
                          {art.game_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Giftcode Kèm */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {art.codes && art.codes.length > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-mono font-bold text-[11px]">
                          {art.codes.length} mã
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>

                    {/* Lượt Xem */}
                    <td className="py-2 px-2 font-mono text-muted-foreground text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="flex items-center gap-1 font-bold text-foreground text-xs">
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          {newsService.getDisplayViews(art)}
                        </span>
                        {(art.virtual_views !== undefined || art.views_growth_rate !== undefined) && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                            {art.virtual_views || 0} ({art.views_growth_rate ?? 1}x)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tiêu Điểm / HOT */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(art)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                            art.is_featured
                              ? 'bg-amber-500 text-black shadow-xs font-black'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                          title={art.is_featured ? 'Bỏ ghim tiêu điểm' : 'Ghim tiêu điểm'}
                        >
                          Ghim
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleHot(art)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                            art.is_hot
                              ? 'bg-rose-500 text-white shadow-xs font-black'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                          title={art.is_hot ? 'Bỏ nhãn HOT' : 'Bật nhãn HOT'}
                        >
                          HOT
                        </button>
                      </div>
                    </td>

                    {/* Trạng Thái */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {art.status === 'PUBLISHED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Xuất bản
                        </span>
                      ) : art.status === 'SCHEDULED' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-bold text-[11px] border border-purple-500/30"
                          title={art.scheduled_publish_at ? `Hẹn lúc: ${new Date(art.scheduled_publish_at).toLocaleString('vi-VN')}` : 'Đang hẹn giờ'}
                        >
                          <Clock className="w-3 h-3 text-purple-400" />
                          Hẹn đăng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold text-[11px]">
                          <FileText className="w-3 h-3" />
                          Bản nháp
                        </span>
                      )}
                    </td>

                    {/* Ngày Đăng */}
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap text-center text-[11px]">
                      {art.status === 'SCHEDULED' && art.scheduled_publish_at ? (
                        <span className="text-purple-300 font-mono" title={`Thời gian hẹn đăng: ${new Date(art.scheduled_publish_at).toLocaleString('vi-VN')}`}>
                          {new Date(art.scheduled_publish_at).toLocaleDateString('vi-VN')} {new Date(art.scheduled_publish_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        new Date(art.published_at).toLocaleDateString('vi-VN')
                      )}
                    </td>

                    {/* Thao Tác - Cố Định Luôn Trên Màn Hình */}
                    <td className="sticky right-0 z-10 bg-card group-hover:bg-card/95 backdrop-blur-md py-2 px-3 text-right whitespace-nowrap shadow-[-6px_0_12px_rgba(0,0,0,0.18)] border-l border-border/80">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {art.status === 'SCHEDULED' && (
                          <button
                            type="button"
                            onClick={() => handlePublishScheduledNow(art)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-bold text-xs cursor-pointer transition-all border border-purple-500/40 active:scale-95 shadow-xs"
                            title="Kích hoạt xuất bản ngay lập tức bài viết này"
                          >
                            <Zap className="w-3.5 h-3.5 text-purple-300" />
                            <span className="hidden sm:inline">Đăng ngay</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(art)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 hover:text-indigo-300 font-bold text-xs cursor-pointer transition-all border border-indigo-500/30 active:scale-95"
                          title="Chỉnh sửa bài viết"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(art.id, art.title)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 font-bold text-xs cursor-pointer transition-all border border-rose-500/30 active:scale-95"
                          title="Xóa bài viết"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal: AI Tự Động Viết Bài & Viết Lại Từ Link */}
      {isAiModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className={`relative w-full ${aiMode === 'bulk' ? 'max-w-4xl' : 'max-w-2xl'} bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar transition-all duration-300`}>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <Sparkles className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      ✨ AI Tự Động Sáng Tạo Nội Dung
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tự động quét hàng loạt link, viết bài chuẩn SEO hoặc bóc tách mã quà tặng độc quyền (Miễn phí 100%).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-800 border border-slate-700 shadow-inner">
                <button
                  type="button"
                  onClick={() => setAiMode('bulk')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    aiMode === 'bulk'
                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4 text-pink-200" />
                  <span>📚 Quét Hàng Loạt Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode('rewrite')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    aiMode === 'rewrite'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>🔗 Viết Lại 1 Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiMode('template');
                    if (!aiSelectedGame) setAiSelectedGame(games[0] || null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    aiMode === 'template'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ Theo Game Có Sẵn</span>
                </button>
              </div>

              {/* MODE 1: QUÉT HÀNG LOẠT LINK & TẠO HÀNG LOẠT BÀI VIẾT */}
              {aiMode === 'bulk' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Banner hướng dẫn */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-500/30 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>Quét & Tự Động Tạo Hàng Loạt Bài Viết Chuẩn SEO</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                          1 Link / 1 Dòng
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Dán danh sách các link bài báo (GameK, Sforum, Download.vn, Fanpage...). Hệ thống sẽ tự động cào bài viết, khớp tựa game trong kho 486+ game, bóc tách toàn bộ mã Giftcode, định dạng chuẩn SEO và lưu bài viết vào hệ thống.
                      </p>
                    </div>
                  </div>

                  {/* Khung Nhập Danh Sách Link */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span>Danh sách liên kết bài viết (Mỗi link 1 dòng)</span>
                        {(() => {
                          const count = bulkUrlsInput
                            .split('\n')
                            .map((l) => l.trim())
                            .filter((l) => /^https?:\/\//i.test(l)).length;
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-mono font-bold">
                              {count > 0 ? `Đã nhập: ${count} link hợp lệ` : 'Chưa có link'}
                            </span>
                          );
                        })()}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePasteBulkUrlsFromClipboard}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-[11px] font-bold transition-all cursor-pointer"
                          title="Dán link từ bộ nhớ tạm Clipboard"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                          <span>Dán Clipboard</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleInsertSampleUrls}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-[11px] font-bold transition-all cursor-pointer"
                          title="Chèn các link mẫu để test thử nghiệm ngay"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Link Mẫu</span>
                        </button>
                        {bulkUrlsInput && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Bạn có muốn xóa toàn bộ danh sách link đang nhập?')) {
                                setBulkUrlsInput('');
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                            title="Xóa trắng danh sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={bulkUrlsInput}
                      onChange={(e) => setBulkUrlsInput(e.target.value)}
                      disabled={isBulkRunning}
                      placeholder={`https://cellphones.com.vn/sforum/code-blox-fruit\nhttps://b.download.com.vn/tong-hop-code-game-pirate-legends-huyen-thoai-hai-tac-2026.html\nhttps://gamek.vn/tong-hop-giftcode-moi-nhat-2026.chn`}
                      className="w-full p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs text-white font-mono leading-relaxed outline-none focus:border-purple-500 resize-y custom-scrollbar placeholder:text-slate-500 disabled:opacity-60"
                    />
                  </div>

                  {/* Cấu hình tùy chọn hàng loạt (Settings) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/80 text-xs">
                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bulkAutoDetectGame}
                        disabled={isBulkRunning}
                        onChange={(e) => setBulkAutoDetectGame(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <div className="font-bold flex items-center gap-1">
                          <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>Tự khớp Tựa Game</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Khớp với 486+ game có sẵn</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bulkUseGameLogo}
                        disabled={isBulkRunning}
                        onChange={(e) => setBulkUseGameLogo(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <div className="font-bold flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Dùng Logo làm Cover</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Ưu tiên logo chuẩn của game</div>
                      </div>
                    </label>

                    <div className="flex flex-col justify-center">
                      <label className="text-[10px] font-bold text-slate-400 mb-0.5">Trạng thái bài viết</label>
                      <select
                        value={bulkPostStatus}
                        disabled={isBulkRunning}
                        onChange={(e) => setBulkPostStatus(e.target.value as any)}
                        className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold outline-none focus:border-purple-500 cursor-pointer disabled:opacity-60"
                      >
                        <option value="PUBLISHED">🚀 Xuất bản ngay (Công khai)</option>
                        <option value="DRAFT">📝 Lưu bản nháp (Draft)</option>
                      </select>
                    </div>
                  </div>

                  {/* Nút Thực Thi */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-400">
                      {isBulkRunning ? (
                        <span className="text-purple-300 font-bold flex items-center gap-1.5 animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                          <span>Đang xử lý link {bulkProgress.current} / {bulkProgress.total}...</span>
                        </span>
                      ) : (
                        <span>✨ Tự động bóc tách giftcode & tối ưu bài viết chuẩn SEO</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isBulkRunning ? (
                        <button
                          type="button"
                          onClick={handleStopBulk}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer active:scale-95"
                        >
                          <StopCircle className="w-4 h-4" />
                          <span>Dừng lại</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            bulkUrlsInput
                              .split('\n')
                              .map((l) => l.trim())
                              .filter((l) => /^https?:\/\//i.test(l)).length === 0
                          }
                          onClick={handleStartBulkGeneration}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-black text-xs shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>
                            🚀 Bắt Đầu Quét & Tạo Hàng Loạt (
                            {
                              bulkUrlsInput
                                .split('\n')
                                .map((l) => l.trim())
                                .filter((l) => /^https?:\/\//i.test(l)).length
                            }{' '}
                            link)
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TIẾN TRÌNH & BẢNG KẾT QUẢ THỜI GIAN THỰC */}
                  {bulkResults.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 pt-3">
                      {/* Progress summary bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">
                            Tiến trình xử lý ({bulkProgress.current}/{bulkProgress.total})
                          </span>
                          <span className="font-mono text-purple-300 font-bold">
                            {Math.round((bulkProgress.current / Math.max(1, bulkProgress.total)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-500 transition-all duration-300"
                            style={{
                              width: `${(bulkProgress.current / Math.max(1, bulkProgress.total)) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                            Tổng: <b>{bulkProgress.total}</b>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                            ✅ Thành công: <b>{bulkProgress.successCount}</b>
                          </span>
                          {bulkProgress.errorCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300">
                              ❌ Thất bại: <b>{bulkProgress.errorCount}</b>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Danh sách kết quả chi tiết */}
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {bulkResults.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              item.status === 'success'
                                ? 'bg-emerald-950/20 border-emerald-700/40'
                                : item.status === 'error'
                                ? 'bg-rose-950/20 border-rose-700/40'
                                : item.status === 'crawling' || item.status === 'rewriting'
                                ? 'bg-purple-950/30 border-purple-600/50 shadow-sm'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="font-bold text-white truncate text-xs flex items-center gap-2">
                                  {item.title ? (
                                    <span>{item.title}</span>
                                  ) : (
                                    <span className="font-mono text-slate-400">{item.url}</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                  {item.gameName && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                                      {item.gameIcon && (
                                        <img
                                          src={item.gameIcon}
                                          alt=""
                                          className="w-3.5 h-3.5 rounded object-cover"
                                        />
                                      )}
                                      <span>{item.gameName}</span>
                                    </span>
                                  )}
                                  {item.codesCount !== undefined && item.codesCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                                      🎁 {item.codesCount} mã code
                                    </span>
                                  )}
                                  <span className="font-mono text-slate-400 truncate max-w-[240px]">
                                    {item.url}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Status badge & action */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {item.status === 'pending' && (
                                <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-[11px]">
                                  ⏳ Chờ...
                                </span>
                              )}
                              {item.status === 'crawling' && (
                                <span className="px-2 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Đang cào link...</span>
                                </span>
                              )}
                              {item.status === 'rewriting' && (
                                <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                                  <Sparkles className="w-3 h-3 animate-spin text-purple-300" />
                                  <span>AI viết bài...</span>
                                </span>
                              )}
                              {item.status === 'success' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Xong</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCreatedArticle(item.createdArticleId)}
                                    className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-[11px] font-bold transition-all cursor-pointer"
                                    title="Mở bài viết để xem hoặc biên tập ngay"
                                  >
                                    ✏️ Sửa bài
                                  </button>
                                </div>
                              )}
                              {item.status === 'error' && (
                                <span
                                  className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-bold truncate max-w-[160px]"
                                  title={item.errorMsg}
                                >
                                  ❌ {item.errorMsg || 'Thất bại'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: REWRITE TỪ LINK HOẶC NỘI DUNG GỐC */}
              {aiMode === 'rewrite' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Nhập link bài viết */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        <span>1. Link bài viết nguồn (Báo chí, GameK, Sforum, Fanpage...)</span>
                      </span>
                      <span className="text-[11px] text-indigo-400">Tự động cào & quét code</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={crawlUrlInput}
                        onChange={(e) => setCrawlUrlInput(e.target.value)}
                        placeholder="Dán link bài viết (Thegioididong, Sforum, Kenh14...)..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        disabled={isCrawlingUrl}
                        onClick={handleCrawlUrl}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCrawlingUrl ? 'animate-spin' : ''}`} />
                        <span>{isCrawlingUrl ? 'Đang quét...' : '⚡ Quét Link'}</span>
                      </button>
                    </div>

                    {/* Social Media Hint */}
                    {/facebook\.com|fb\.com|fb\.watch|instagram\.com|tiktok\.com|threads\.net|twitter\.com|x\.com/i.test(crawlUrlInput) && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 mt-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-amber-300">💡 Lưu ý bài viết từ Facebook / Mạng xã hội:</p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Facebook yêu cầu đăng nhập tài khoản nên máy chủ bị chặn quét link trực tiếp. Để viết bài nhanh nhất: Bạn chỉ cần <b>Copy (sao chép) bài viết trên Facebook</b> rồi bấm nút <b>"📋 Dán Từ Clipboard"</b> ở mục số 2 bên dưới ➔ AI sẽ viết lại bài và lọc mã code ngay lập tức!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thông tin quét được nếu có */}
                  {crawledData && (
                    <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-700/50 space-y-1.5 text-xs">
                      <div className="font-bold text-indigo-300 truncate">
                        📰 {crawledData.title || 'Đã đọc nội dung thành công'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold font-mono">
                          🎁 {crawledData.codes?.length || 0} mã code tìm thấy
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                          🖼️ {crawledData.images?.length || 0} ảnh trích xuất
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Nội dung bài viết thô (có thể paste trực tiếp) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span>2. Nội dung bài viết gốc (Dán bài Facebook/Web vào)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Dán nhanh văn bản đã sao chép từ Facebook hoặc trang web"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 text-indigo-300" />
                        <span>📋 Dán Từ Clipboard</span>
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={crawlRawContent}
                      onChange={(e) => setCrawlRawContent(e.target.value)}
                      placeholder="Dán nội dung bài báo, bài viết Facebook hoặc thông báo game vào đây..."
                      className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white font-mono leading-relaxed outline-none focus:border-indigo-500 resize-y"
                    />
                    {crawlRawContent.length > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
                        <span>Độ dài: {crawlRawContent.length} ký tự</span>
                        <button
                          type="button"
                          onClick={() => setCrawlRawContent('')}
                          className="text-rose-400 hover:underline cursor-pointer"
                        >
                          Xóa nội dung
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Chọn Game liên kết */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-indigo-400" />
                      <span>3. Tựa Game liên kết (Gắn nhãn và huy hiệu game)</span>
                    </label>
                    <SearchableGameSelect
                      games={games}
                      selectedGameSlug={aiSelectedGame?.slug || ''}
                      onSelectGame={(g) => setAiSelectedGame(g)}
                      placeholder="Tìm tên game tiếng Việt / tiếng Anh..."
                      allowClear
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingAi || !crawlRawContent.trim()}
                      onClick={handleRunAiRewrite}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-xs shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isGeneratingAi ? 'Đang viết lại...' : '✨ AI Viết Lại Bài Viết Ngay'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: TẠO BÀI THEO TỰA GAME CÓ SẴN */}
              {aiMode === 'template' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Step 1: Chọn Game */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-amber-400" />
                      <span>1. Chọn Tựa Game Trong Danh Sách</span>
                    </label>
                    <SearchableGameSelect
                      games={games}
                      selectedGameSlug={aiSelectedGame?.slug || ''}
                      onSelectGame={(g) => setAiSelectedGame(g)}
                      placeholder="Tìm tên game tiếng Việt / tiếng Anh..."
                    />
                  </div>

                  {/* Step 2: Chọn Chủ Đề */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>2. Chọn Chủ Đề Bài Viết</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        {
                          id: 'codes',
                          label: '🎁 Giftcode mới nhất & Cách nhập',
                          desc: 'Nhúng mã quà tặng hoạt động 100% kèm hướng dẫn',
                        },
                        {
                          id: 'update',
                          label: '🚀 Cập nhật phiên bản & Máy chủ',
                          desc: 'Thông báo update, bảo trì và sự kiện ra mắt',
                        },
                        {
                          id: 'guide',
                          label: '⚔️ Hướng dẫn tân thủ & Đội hình',
                          desc: 'Cẩm nang cày cấp, build tướng và bí kíp',
                        },
                        {
                          id: 'event',
                          label: '🏆 Sự kiện đua TOP & Ưu đãi',
                          desc: 'Phúc lợi sự kiện, mốc quà tặng hấp dẫn',
                        },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAiTopicType(t.id as any)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            aiTopicType === t.id
                              ? 'border-amber-500 bg-amber-500/15 shadow-sm'
                              : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs font-bold text-white">{t.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingAi || !aiSelectedGame}
                      onClick={handleRunAiGenerator}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-xs shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isGeneratingAi ? 'Đang tạo bài...' : 'Tạo Bài Viết Ngay'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* 6. Modal: Biên Tập / Tạo Mới Bài Viết (Portal ra document.body chống bị đè sidebar & layout 2 cột tối ưu) */}
      {isEditorOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
            {/* Hidden file inputs for auto-compression upload */}
            <input
              type="file"
              ref={coverFileInputRef}
              onChange={handleCoverFileUpload}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={galleryFileInputRef}
              onChange={handleGalleryFileUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="relative w-full max-w-6xl h-[92vh] max-h-[890px] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
              {/* Header: Cố định trên cùng */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0 bg-slate-900/95">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    <Newspaper className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {editingArticle.id ? 'Biên Tập Bài Viết' : 'Tạo Bài Viết Mới'}
                    </h3>
                    <p className="text-[11px] text-slate-400 hidden sm:block">
                      Tự động nén WebP siêu nhẹ, cài đặt số lượt xem & hệ số tăng trưởng, soạn thảo markdown.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  title="Đóng (Hủy bỏ)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body: 2 Cột (Cột Trái 5 / Cột Phải 7) */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                {/* CỘT TRÁI: Thông tin, Ảnh, Views & Cấu hình (Cuộn độc lập) */}
                <div className="lg:col-span-5 h-full overflow-y-auto p-4 sm:p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-800 custom-scrollbar">
                  {/* Tiêu đề */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Tiêu đề bài viết *</label>
                    <input
                      type="text"
                      value={editingArticle.title || ''}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        const autoSlug = newTitle
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[đĐ]/g, 'd')
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, '');
                        setEditingArticle({
                          ...editingArticle,
                          title: newTitle,
                          slug: editingArticle.slug && editingArticle.id ? editingArticle.slug : autoSlug,
                        });
                      }}
                      placeholder="Nhập tiêu đề bài viết chuẩn SEO..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  {/* Game liên kết */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Tựa Game liên kết</label>
                    <SearchableGameSelect
                      games={games}
                      selectedGameSlug={editingArticle.game_slug || ''}
                      onSelectGame={(g) => {
                        const gameLogo = g ? (g.cover_image_url || g.icon_url || (g.slug ? `/game_icons/${g.slug}.webp` : '')) : '';
                        const isDefaultOrEmptyCover = !editingArticle.cover_url || editingArticle.cover_url.includes('images.unsplash.com');
                        setEditingArticle({
                          ...editingArticle,
                          game_id: g?.id,
                          game_slug: g?.slug,
                          game_name: g?.name,
                          cover_url: gameLogo || editingArticle.cover_url || '',
                          slug: (!editingArticle.slug || editingArticle.slug.startsWith('tin-tuc-game-')) && g?.slug
                            ? `${g.slug}-2026`
                            : editingArticle.slug,
                        });
                      }}
                      placeholder="Chọn game để gắn nhãn & đồng bộ..."
                      allowClear
                    />
                  </div>

                  {/* URL Slug */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">URL Slug</label>
                    <input
                      type="text"
                      value={editingArticle.slug || ''}
                      onChange={(e) =>
                        setEditingArticle({ ...editingArticle, slug: e.target.value })
                      }
                      placeholder="duong-dan-bai-viet-chuan-seo"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white font-mono outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Ảnh bìa chính (Cover URL) kèm nút Nén tự động & Nút Dùng logo game */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-indigo-400" />
                        <span>Ảnh bìa chính (Cover Banner)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {editingArticle.game_slug && (
                          <button
                            type="button"
                            onClick={() => {
                              const foundGame = games.find((g) => g.slug === editingArticle.game_slug || g.id === editingArticle.game_slug);
                              const gameLogo = foundGame?.cover_image_url || foundGame?.icon_url || `/game_icons/${editingArticle.game_slug}.webp`;
                              setEditingArticle({ ...editingArticle, cover_url: gameLogo });
                              onShowToast('Đã đổi ảnh bìa', 'Đã đặt logo của tựa game làm ảnh bìa chính!', 'success');
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-[11px] font-bold cursor-pointer transition-all"
                            title="Đặt logo của tựa game liên kết làm ảnh bìa chính"
                          >
                            <Gamepad2 className="w-3 h-3" />
                            <span>🎮 Dùng Logo Game</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isCompressingCover}
                          onClick={() => coverFileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-[11px] font-bold cursor-pointer disabled:opacity-50 transition-all"
                          title="Chọn ảnh từ máy tính (Tự động nén WebP siêu nhẹ)"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{isCompressingCover ? 'Đang nén...' : '📁 Tải ảnh từ máy'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editingArticle.cover_url || ''}
                        onChange={(e) =>
                          setEditingArticle({
                            ...editingArticle,
                            cover_url: optimizeImageUrl(e.target.value, 1200),
                          })
                        }
                        placeholder={editingArticle.game_slug ? `Mặc định: /game_icons/${editingArticle.game_slug}.webp (Logo game)` : 'https://... hoặc tải ảnh từ máy tính'}
                        className={`flex-1 px-3 py-2 rounded-xl bg-slate-900 border text-xs text-white outline-none font-mono ${
                          coverValidation.status === 'invalid'
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                      {editingArticle.cover_url && (
                        <div className="relative w-12 h-9 rounded-lg overflow-hidden border border-slate-600 shrink-0 bg-black/40">
                          <img
                            src={editingArticle.cover_url}
                            alt="Cover"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Báo lỗi trực tiếp nếu ảnh 404 hoặc bị lỗi */}
                    {coverValidation.status === 'invalid' && (
                      <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{coverValidation.message}</span>
                      </div>
                    )}

                    {/* Hộp chọn ảnh bìa chuyên đề có sẵn (Preset selector) */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium shrink-0">Chọn nhanh ảnh chuyên đề:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setEditingArticle({ ...editingArticle, cover_url: e.target.value });
                          }
                        }}
                        value={editingArticle.cover_url?.startsWith('/news_covers/') ? editingArticle.cover_url : ''}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Chọn ảnh chuyên đề có sẵn (/news_covers/) --</option>
                        <option value="/news_covers/thi-truong-game-viet-nam.webp">📰 Thị trường Game Việt Nam (Mặc định chuẩn)</option>
                        <option value="/news_covers/cktg-2026-esports.webp">🏆 Esports & CKTG 2026</option>
                        <option value="/news_covers/apple-arcade-games.webp">🍎 Apple Arcade & Mobile Games</option>
                        <option value="/news_covers/game-offline-hay.webp">🕹️ Game Offline & Độc Lập</option>
                        <option value="/news_covers/qua-tang-giftcode-vip.webp">🎁 Sự Kiện & Giftcode VIP</option>
                        <option value="/news_covers/xac-thuc-tai-khoan-game.webp">🛡️ Hướng Dẫn & Bảo Mật Tài Khoản</option>
                        <option value="/news_covers/nhan-luc-nganh-game.webp">💼 Công Nghệ & Ngành Game</option>
                        <option value="/news_covers/blv-esports-viet-nam.webp">🎙️ Cộng Đồng & Bình Luận Viên</option>
                        <option value="/news_covers/board-game-van-hoa-viet.webp">🎲 Board Game Văn Hóa Việt</option>
                        <option value="/news_covers/xbox-games-collection.webp">🎮 Xbox Games Collection</option>
                      </select>
                    </div>
                  </div>

                  {/* THƯ VIỆN HÌNH ẢNH (Ảnh Minh Họa / Phụ) KÈM NÉN TỰ ĐỘNG */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <span>Thư Viện Ảnh Bổ Sung ({editingArticle.gallery_urls?.length || 0})</span>
                      </label>
                      <button
                        type="button"
                        disabled={isCompressingGallery}
                        onClick={() => galleryFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[11px] font-bold cursor-pointer disabled:opacity-50 transition-all"
                        title="Tải ảnh từ máy (Tự động nén WebP giảm 90% dung lượng)"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{isCompressingGallery ? 'Đang nén...' : '📁 Tải ảnh & Nén'}</span>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={galleryInputValue}
                        onChange={(e) => setGalleryInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddGalleryImage();
                          }
                        }}
                        placeholder="Dán link ảnh (https://...)..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddGalleryImage}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        + Thêm Link
                      </button>
                    </div>

                    {/* Danh sách ảnh trong Gallery */}
                    {editingArticle.gallery_urls && editingArticle.gallery_urls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 pt-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {editingArticle.gallery_urls.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-1.5 flex flex-col gap-1.5 shadow-sm"
                          >
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/40">
                              <img
                                src={imgUrl}
                                alt={`Gallery ${idx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=300&q=80';
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleInsertGalleryImageIntoText(imgUrl, `Ảnh minh họa ${idx + 1}`)
                                }
                                className="flex-1 px-1.5 py-1 rounded-md bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[10px] transition-all cursor-pointer truncate"
                                title="Chèn ảnh này vào vị trí con trỏ trong bài viết"
                              >
                                📥 Chèn vào bài
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetGalleryAsCover(imgUrl)}
                                className="px-1.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-600 text-amber-300 hover:text-white font-bold text-[10px] transition-all cursor-pointer"
                                title="Đặt ảnh này làm ảnh bìa chính"
                              >
                                Làm bìa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(imgUrl)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                                title="Xóa ảnh khỏi thư viện"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Chưa có ảnh phụ nào. Bấm <b>📁 Tải ảnh & Nén</b> từ máy tính hoặc dán link ảnh để độc giả chiêm ngưỡng.
                      </p>
                    )}
                  </div>

                  {/* CÀI ĐẶT LƯỢT XEM & TĂNG TRƯỞNG */}
                  <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-700/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        <span>Cài Đặt Lượt Xem & Tăng Trưởng</span>
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                        ~{newsService.getDisplayViews(editingArticle)} views hiện tại
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span>Lượt xem ban đầu (Cơ sở)</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={
                            editingArticle.virtual_views !== undefined
                              ? editingArticle.virtual_views
                              : 120
                          }
                          onChange={(e) =>
                            setEditingArticle({
                              ...editingArticle,
                              virtual_views: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          placeholder="Ví dụ: 150"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white outline-none focus:border-indigo-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-slate-400" />
                          <span>Hệ số tăng trưởng / giờ</span>
                        </label>
                        <select
                          value={
                            editingArticle.views_growth_rate !== undefined
                              ? editingArticle.views_growth_rate
                              : 1.0
                          }
                          onChange={(e) =>
                            setEditingArticle({
                              ...editingArticle,
                              views_growth_rate: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white outline-none focus:border-indigo-400"
                        >
                          <option value={0}>0x (Tắt tự tăng)</option>
                          <option value={0.5}>0.5x (Chậm ~3 lượt/giờ)</option>
                          <option value={1.0}>1.0x (Chuẩn ~6 lượt/giờ)</option>
                          <option value={1.5}>1.5x (Khá nhanh ~9 lượt/giờ)</option>
                          <option value={2.0}>2.0x (Nhanh ~12 lượt/giờ)</option>
                          <option value={3.0}>3.0x (Rất nhanh ~18 lượt/giờ)</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      💡 Lượt xem tự động tăng theo thời gian trôi qua, hoàn toàn tự nhiên và không gây lag web.
                    </p>
                  </div>

                  {/* Tóm tắt ngắn (Excerpt) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Tóm tắt ngắn (Excerpt)</label>
                    <textarea
                      rows={2}
                      value={editingArticle.excerpt || ''}
                      onChange={(e) =>
                        setEditingArticle({ ...editingArticle, excerpt: e.target.value })
                      }
                      placeholder="Mô tả ngắn hiển thị trên thẻ bài viết và meta SEO..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  {/* Danh sách Giftcode đính kèm */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                    <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-amber-400" />
                        <span>Giftcode đính kèm</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Copy 1 chạm</span>
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codeInputValue}
                        onChange={(e) => setCodeInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCodeToArticle();
                          }
                        }}
                        placeholder="Nhập mã code (Ví dụ: DELTA2026)..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono uppercase text-white outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddCodeToArticle}
                        className="px-3 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer whitespace-nowrap"
                      >
                        Thêm Code
                      </button>
                    </div>

                    {editingArticle.codes && editingArticle.codes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {editingArticle.codes.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/40 font-mono font-bold text-[11px] text-amber-300"
                          >
                            {c}
                            <button
                              type="button"
                              onClick={() => handleRemoveCodeFromArticle(c)}
                              className="text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tags & Thời gian đọc */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-200">Tags (phẩy)</label>
                      <input
                        type="text"
                        value={tagInputValue}
                        onChange={(e) => setTagInputValue(e.target.value)}
                        placeholder="Giftcode, HuongDan..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-200">Thời gian đọc (phút)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={editingArticle.read_time_minutes || 3}
                        onChange={(e) =>
                          setEditingArticle({
                            ...editingArticle,
                            read_time_minutes: Number(e.target.value) || 3,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Trạng thái & Ghim */}
                  <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={editingArticle.is_featured || false}
                        onChange={(e) =>
                          setEditingArticle({
                            ...editingArticle,
                            is_featured: e.target.checked,
                          })
                        }
                        className="rounded text-indigo-500 focus:ring-indigo-500"
                      />
                      <span>Ghim Tiêu Điểm</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={editingArticle.is_hot || false}
                        onChange={(e) =>
                          setEditingArticle({ ...editingArticle, is_hot: e.target.checked })
                        }
                        className="rounded text-rose-500 focus:ring-rose-500"
                      />
                      <span>HOT</span>
                    </label>

                    <div className="ml-auto flex items-center gap-2">
                      <select
                        value={editingArticle.status || 'PUBLISHED'}
                        onChange={(e) => {
                          const newSt = e.target.value as 'PUBLISHED' | 'DRAFT' | 'SCHEDULED';
                          setEditingArticle({
                            ...editingArticle,
                            status: newSt,
                            scheduled_publish_at:
                              newSt === 'SCHEDULED' && !editingArticle.scheduled_publish_at
                                ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
                                : editingArticle.scheduled_publish_at,
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold outline-none cursor-pointer transition-colors ${
                          editingArticle.status === 'SCHEDULED'
                            ? 'bg-purple-950 border-purple-500 text-purple-200'
                            : editingArticle.status === 'DRAFT'
                            ? 'bg-amber-950 border-amber-500 text-amber-200'
                            : 'bg-slate-900 border-slate-700 text-white'
                        }`}
                      >
                        <option value="PUBLISHED">🟢 Xuất bản ngay</option>
                        <option value="SCHEDULED">🟣 Lịch hẹn đăng</option>
                        <option value="DRAFT">⚪ Bản nháp</option>
                      </select>
                    </div>
                  </div>

                  {/* Khung cấu hình Lịch Hẹn Đăng khi chọn status SCHEDULED */}
                  {editingArticle.status === 'SCHEDULED' && (
                    <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          Hẹn giờ xuất bản tự động (GMT+7):
                        </span>
                        {editingArticle.scheduled_publish_at && (
                          <span className="text-[10px] font-mono text-purple-200 font-semibold bg-purple-900/60 px-2 py-0.5 rounded">
                            {new Date(editingArticle.scheduled_publish_at).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <input
                        type="datetime-local"
                        value={formatForDatetimeLocal(editingArticle.scheduled_publish_at)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const iso = val ? new Date(val).toISOString() : '';
                          setEditingArticle({
                            ...editingArticle,
                            scheduled_publish_at: iso,
                          });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/50 text-xs font-mono text-white outline-none focus:border-purple-400"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-medium">Hẹn nhanh:</span>
                        <button
                          type="button"
                          onClick={() => setScheduledPresetHours(1)}
                          className="px-2 py-0.5 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer"
                        >
                          +1 Giờ
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduledPresetHours(3)}
                          className="px-2 py-0.5 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer"
                        >
                          +3 Giờ
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduledPresetHours(6)}
                          className="px-2 py-0.5 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer"
                        >
                          +6 Giờ
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduledPresetMorning()}
                          className="px-2 py-0.5 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer"
                        >
                          Sáng mai 09:00
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduledPresetEvening()}
                          className="px-2 py-0.5 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer"
                        >
                          Tối mai 20:00
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* CỘT PHẢI: Khung Soạn Thảo & Xem Trước Live Preview */}
                <div className="lg:col-span-7 h-full flex flex-col p-4 sm:p-5 min-h-0 bg-slate-950/40">
                  {/* Header Cột Phải & Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        Nội Dung Bài Viết
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({editingArticle.content?.length || 0} ký tự)
                      </span>
                    </div>

                    {/* Tab Switch: Soạn Thảo vs Xem Trước */}
                    <div className="inline-flex p-1 rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setActiveEditorTab('edit')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeEditorTab === 'edit'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ✏️ Soạn Thảo
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEditorTab('preview')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeEditorTab === 'preview'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        👁️ Xem Trước
                      </button>
                    </div>
                  </div>

                  {/* Toolbar các nút định dạng nhanh khi ở Tab Soạn Thảo */}
                  {activeEditorTab === 'edit' && (
                    <div className="flex flex-wrap items-center gap-1.5 py-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToolbarAction('bold')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="In đậm chữ (**text**)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                        <span>Đậm</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolbarAction('h2')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Tiêu đề mục lớn (## Title)"
                      >
                        <Heading2 className="w-3.5 h-3.5" />
                        <span>H2</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolbarAction('h3')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Tiêu đề mục nhỏ (### Subtitle)"
                      >
                        <Heading3 className="w-3.5 h-3.5" />
                        <span>H3</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolbarAction('list')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Danh sách gạch đầu dòng (- Item)"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Danh sách</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolbarAction('quote')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Hộp lưu ý/mẹo (> 💡 Tip)"
                      >
                        <Quote className="w-3.5 h-3.5" />
                        <span>Lưu ý</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolbarAction('image')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer ml-auto"
                        title="Chèn ảnh theo link (![Alt](URL))"
                      >
                        <Image className="w-3.5 h-3.5" />
                        <span>🖼️ Chèn link ảnh</span>
                      </button>
                    </div>
                  )}

                  {/* Khu Vực Soạn Thảo hoặc Live Preview */}
                  <div className="flex-1 min-h-0 relative flex flex-col pt-1">
                    {activeEditorTab === 'edit' ? (
                      <div className="flex-1 min-h-0 flex flex-col">
                        <textarea
                          ref={contentTextareaRef}
                          value={editingArticle.content || ''}
                          onChange={(e) =>
                            setEditingArticle({ ...editingArticle, content: e.target.value })
                          }
                          placeholder="## 1. Giới thiệu tổng quan...&#10;&#10;Dán nội dung hoặc chọn ảnh từ cột trái bấm '📥 Chèn vào bài' để đặt ảnh giữa bài viết..."
                          className="flex-1 min-h-[300px] w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono leading-relaxed outline-none focus:border-indigo-500 resize-none overflow-y-auto"
                        />
                        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                          <span>
                            💡 Để chèn ảnh giữa các đoạn: Bấm <b>📥 Chèn vào bài</b> ở cột trái hoặc dùng nút <b>🖼️ Chèn link ảnh</b>.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-[300px] w-full p-5 rounded-2xl bg-slate-900 border border-slate-700 overflow-y-auto space-y-3.5 text-xs text-slate-200 leading-relaxed custom-scrollbar">
                        {editingArticle.cover_url && (
                          <div className="mb-4 rounded-2xl overflow-hidden border border-slate-700 bg-black/40">
                            <img
                              src={editingArticle.cover_url}
                              alt="Cover"
                              className="w-full max-h-56 object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <h2 className="text-base sm:text-lg font-black text-white">
                          {editingArticle.title || 'Chưa có tiêu đề'}
                        </h2>
                        {editingArticle.excerpt && (
                          <p className="text-xs text-slate-400 italic border-l-2 border-indigo-500 pl-3 py-1 bg-slate-800/40 rounded-r-lg">
                            {editingArticle.excerpt}
                          </p>
                        )}
                        <div className="space-y-3 pt-2">
                          {(editingArticle.content || 'Chưa có nội dung...').split('\n\n').map((block, idx) => {
                            const trimmed = block.trim();
                            if (!trimmed) return null;
                            if (trimmed.startsWith('## ')) {
                              return (
                                <h3
                                  key={idx}
                                  className="text-sm font-black text-white pt-2 border-b border-slate-800 pb-1"
                                >
                                  {trimmed.replace(/^##\s+/, '')}
                                </h3>
                              );
                            }
                            if (trimmed.startsWith('### ')) {
                              return (
                                <h4
                                  key={idx}
                                  className="text-xs font-bold text-indigo-400 pt-1"
                                >
                                  {trimmed.replace(/^###\s+/, '')}
                                </h4>
                              );
                            }
                            if (trimmed.startsWith('> ')) {
                              return (
                                <blockquote
                                  key={idx}
                                  className="p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-400 text-amber-200 text-xs"
                                >
                                  {trimmed.replace(/^>\s+/, '')}
                                </blockquote>
                              );
                            }
                            const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
                            if (imgMatch) {
                              return (
                                <figure key={idx} className="my-3 text-center">
                                  <img
                                    src={imgMatch[2]}
                                    alt={imgMatch[1]}
                                    className="w-full max-h-72 object-cover rounded-xl border border-slate-700 shadow-md mx-auto"
                                    loading="lazy"
                                  />
                                  {imgMatch[1] && (
                                    <figcaption className="text-[11px] text-slate-400 italic mt-1">
                                      {imgMatch[1]}
                                    </figcaption>
                                  )}
                                </figure>
                              );
                            }
                            return (
                              <p key={idx} className="text-xs text-slate-300 leading-relaxed">
                                {trimmed}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer: Cố định dưới đáy */}
              <div className="px-5 py-3.5 border-t border-slate-800 shrink-0 bg-slate-900/95 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {editingArticle.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editingArticle.id) {
                          handleDeleteArticle(editingArticle.id, editingArticle.title || 'bài viết');
                          setIsEditorOpen(false);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
                      title="Xóa vĩnh viễn bài viết này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Bài Viết</span>
                    </button>
                  )}
                  <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
                    <span className="font-mono">/news/{editingArticle.slug || 'slug'}</span>
                    <span>•</span>
                    <span
                      className={
                        editingArticle.status === 'PUBLISHED'
                          ? 'text-emerald-400 font-bold'
                          : editingArticle.status === 'SCHEDULED'
                          ? 'text-purple-400 font-bold'
                          : 'text-amber-400 font-bold'
                      }
                    >
                      {editingArticle.status === 'PUBLISHED'
                        ? 'Xuất bản công khai'
                        : editingArticle.status === 'SCHEDULED'
                        ? `Lịch hẹn đăng (${editingArticle.scheduled_publish_at ? new Date(editingArticle.scheduled_publish_at).toLocaleString('vi-VN') : 'chưa chọn giờ'})`
                        : 'Lưu bản nháp'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sky-300 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Xem trước bài viết đầy đủ như trên website khách"
                  >
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>Xem Trước Đầy Đủ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveArticle}
                    disabled={coverValidation.status === 'invalid'}
                    className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 ${
                      coverValidation.status === 'invalid'
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu & Xuất Bản</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Xem Trước Đầy Đủ (NewsDetailModal) */}
      {isPreviewOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] overflow-y-auto bg-slate-950 p-2 sm:p-6 animate-fade-in">
            <div className="max-w-5xl mx-auto">
              <div className="mb-4 flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Eye className="w-4 h-4" />
                  <span>CHẾ ĐỘ XEM TRƯỚC BÀI VIẾT TIN TỨC (Dữ Liệu Thật Đang Chỉnh Sửa)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  ✕ Đóng xem trước
                </button>
              </div>
              <NewsDetailModal
                article={
                  {
                    ...editingArticle,
                    id: editingArticle.id || 'preview_id',
                    slug: editingArticle.slug || 'preview-slug',
                    title: editingArticle.title || 'Tiêu đề xem trước',
                    content: editingArticle.content || 'Nội dung xem trước...',
                    cover_url:
                      editingArticle.cover_url ||
                      (editingArticle.game_slug ? `/game_icons/${editingArticle.game_slug}.webp` : '/news_covers/thi-truong-game-viet-nam.webp'),
                    status: editingArticle.status || 'PUBLISHED',
                    published_at: editingArticle.published_at || new Date().toISOString(),
                    author: editingArticle.author || 'CodeGame.Shop',
                    source_name: editingArticle.source_name || 'CodeGame.Shop',
                  } as NewsArticle
                }
                onClose={() => setIsPreviewOpen(false)}
                onShowToast={onShowToast}
              />
            </div>
          </div>,
          document.body
        )}

      {/* 6. Modal: Trung Tâm Tự Động Hóa 24/7 & Lập Lịch */}
      {isAutomationModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shrink-0">
                    <Bot className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white tracking-tight">
                        Trung Tâm Tự Động Hóa Tin Tức 24/7
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Autopilot
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Tự động quét nguồn định kỳ, viết bài chuẩn SEO và xuất bản 24/7 qua GitHub Actions & Cloudflare D1
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={isTriggeringAutoCrawl}
                    onClick={handleTriggerAllSourcesNow}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Cào và tạo bài viết ngay lập tức trên trình duyệt"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringAutoCrawl ? 'animate-spin' : ''}`} />
                    <span>{isTriggeringAutoCrawl ? 'Đang quét...' : '⚡ Quét Tất Cả Nguồn Ngay'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAutomationModalOpen(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setAutomationActiveTab('sources')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    automationActiveTab === 'sources'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>📡 Nguồn Tin Cố Định ({autoSources.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAutomationActiveTab('schedule')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    automationActiveTab === 'schedule'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>⏰ Lập Lịch & Quy Tắc Đăng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAutomationActiveTab('logs')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    automationActiveTab === 'logs'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>📜 Nhật Ký Hoạt Động ({crawlLogs.length})</span>
                </button>
              </div>

              {/* Tab 1: Nguồn Tin Cố Định */}
              {automationActiveTab === 'sources' && (
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <div className="text-xs text-slate-300">
                      Hệ thống tự động theo dõi các nguồn bên dưới, quét bài mới, đối soát chống trùng lặp và tự động tạo bài viết chuẩn SEO.
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleResetToDefaultSources}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all active:scale-95 cursor-pointer border border-slate-600/60 shadow-sm"
                        title="Khôi phục và nạp lại toàn bộ 10 nguồn tin tức uy tín mặc định"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Nạp Lại 10 Nguồn Chuẩn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingSource(!isAddingSource)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAddingSource ? 'Đóng Form' : '+ Thêm Nguồn Mới'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Form thêm nguồn mới */}
                  {isAddingSource && (
                    <div className="p-5 rounded-2xl bg-slate-800 border border-indigo-500/40 space-y-4 animate-fade-in shadow-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-indigo-300 flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          <span>Thêm Nguồn Theo Dõi Mới</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsAddingSource(false)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Tên Nguồn / Chuyên Mục</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: GameK - Mục Giftcode"
                            value={newSourceForm.name || ''}
                            onChange={(e) => setNewSourceForm({ ...newSourceForm, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Loại Kênh</label>
                          <select
                            value={newSourceForm.type || 'website'}
                            onChange={(e) => setNewSourceForm({ ...newSourceForm, type: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="website">🌐 Website Tin Tức Game</option>
                            <option value="social">📱 Mạng Xã Hội / Fanpage Facebook</option>
                            <option value="giftcode_hub">🎁 Cổng Tổng Hợp Giftcode</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Đường Link URL Cố Định</label>
                          <input
                            type="url"
                            placeholder="https://gamek.vn/giftcode.chn hoặc https://cellphones.com.vn/sforum/..."
                            value={newSourceForm.url || ''}
                            onChange={(e) => setNewSourceForm({ ...newSourceForm, url: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Tần Suất Quét</label>
                          <select
                            value={newSourceForm.crawlFrequencyMinutes || 60}
                            onChange={(e) => setNewSourceForm({ ...newSourceForm, crawlFrequencyMinutes: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value={30}>Mỗi 30 phút</option>
                            <option value={60}>Mỗi 1 giờ (Khuyên dùng)</option>
                            <option value={120}>Mỗi 2 giờ</option>
                            <option value={360}>Mỗi 6 giờ</option>
                            <option value={720}>Mỗi 12 giờ</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">Từ Khóa Lọc (ngăn cách bởi dấu phẩy)</label>
                          <input
                            type="text"
                            placeholder="code, giftcode, tân thủ, nhận quà"
                            value={newSourceKeywordsInput}
                            onChange={(e) => setNewSourceKeywordsInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Tùy chọn khớp game */}
                      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-700/80">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={newSourceForm.autoDetectGame !== false}
                            onChange={(e) => setNewSourceForm({ ...newSourceForm, autoDetectGame: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                          <span>Tự động nhận diện 486+ Game trong kho</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={newSourceForm.useGameLogoAsCover !== false}
                            onChange={(e) => setNewSourceForm({ ...newSourceForm, useGameLogoAsCover: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                          <span>Dùng Logo Game chính xác làm ảnh đại diện</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingSource(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700/50"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveNewSource}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md active:scale-95 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Lưu & Kích Hoạt Nguồn</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Danh sách các nguồn */}
                  <div className="space-y-3">
                    {autoSources.length === 0 ? (
                      <div className="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                        Chưa có nguồn tin nào được cấu hình. Hãy bấm nút "+ Thêm Nguồn Mới" để bắt đầu.
                      </div>
                    ) : (
                      autoSources.map((src) => {
                        const isActive = src.status === 'ACTIVE';
                        return (
                          <div
                            key={src.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isActive
                                ? 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                                : 'bg-slate-900/60 border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-sm text-white">{src.name}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      src.type === 'social'
                                        ? 'bg-sky-500/15 text-sky-400'
                                        : src.type === 'giftcode_hub'
                                        ? 'bg-amber-500/15 text-amber-400'
                                        : 'bg-indigo-500/15 text-indigo-400'
                                    }`}
                                  >
                                    {src.type === 'social'
                                      ? '📱 Mạng Xã Hội'
                                      : src.type === 'giftcode_hub'
                                      ? '🎁 Cổng Giftcode'
                                      : '🌐 Website'}
                                  </span>

                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      isActive
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-700/40 text-slate-400'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                                    {isActive ? 'Đang Chạy' : 'Tạm Dừng'}
                                  </span>
                                </div>

                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-mono truncate"
                                >
                                  <span className="truncate">{src.url}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                                  <span>Chu kỳ: <strong className="text-slate-200">{src.crawlFrequencyMinutes} phút</strong></span>
                                  <span>•</span>
                                  <span>Đã tạo: <strong className="text-emerald-400">{src.articlesFoundCount || 0} bài</strong></span>
                                  <span>•</span>
                                  <span>Quét gần nhất: <strong className="text-slate-300">{src.lastCrawledAt ? new Date(src.lastCrawledAt).toLocaleString('vi-VN') : 'Chưa quét'}</strong></span>
                                </div>

                                {src.filterKeywords && src.filterKeywords.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 pt-1">
                                    <span className="text-[10px] text-slate-400">Từ khóa lọc:</span>
                                    {src.filterKeywords.map((kw, idx) => (
                                      <span key={idx} className="px-1.5 py-0.2 rounded bg-slate-700/60 text-[10px] text-slate-300 font-mono">
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Thao tác */}
                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSourceStatus(src.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                                  }`}
                                >
                                  {isActive ? '⏸ Tạm Dừng' : '▶ Kích Hoạt'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSource(src.id, src.name)}
                                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                                  title="Xóa nguồn này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Lập Lịch & Quy Tắc Đăng */}
              {automationActiveTab === 'schedule' && (
                <div className="space-y-4">
                  {/* Banner hướng dẫn GitHub Actions 24/7 */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>Hệ Thống Tự Động Chạy Ngầm 24/7 Qua GitHub Actions</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Toàn bộ quy trình quét nguồn định kỳ, viết bài chuẩn SEO và lưu trữ vào Cloudflare D1 được vận hành tự động qua file workflow{' '}
                      <code className="text-emerald-300 font-mono px-1 bg-black/40 rounded">.github/workflows/auto-news-publisher.yml</code>.
                      Hệ thống tự động chạy 2 tiếng/lần trên máy chủ đám mây GitHub mà <strong>không tốn chi phí</strong> và <strong>không cần bạn mở máy tính</strong>!
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-emerald-400 font-mono">
                      <span>• Tần suất cron: 30 */2 * * * (2 tiếng/lần)</span>
                      <span>• Endpoint lưu trữ: Cloudflare D1 /api/sync</span>
                    </div>
                  </div>

                  {/* Form Cấu hình Lập Lịch */}
                  <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-4">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span>Quy Tắc Biên Tập & Xuất Bản Tự Động</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Bật/Tắt toàn hệ thống */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">Chế độ tự động hóa</div>
                          <div className="text-[11px] text-slate-400">Bật/tắt việc tạo bài viết tự động</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={scheduleConfig.enabled}
                          onChange={(e) => handleSaveScheduleConfig({ enabled: e.target.checked })}
                          className="w-5 h-5 rounded border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                      </div>

                      {/* Trạng thái xuất bản mặc định */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <label className="text-xs font-bold text-white">Trạng thái bài viết mới tạo</label>
                        <select
                          value={scheduleConfig.defaultPublishStatus || 'PUBLISHED'}
                          onChange={(e) => handleSaveScheduleConfig({ defaultPublishStatus: e.target.value as any })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="PUBLISHED">🚀 Xuất bản công khai ngay lập tức</option>
                          <option value="DRAFT">📝 Lưu vào Bản nháp (chờ duyệt tay)</option>
                        </select>
                      </div>

                      {/* Giới hạn bài mỗi lần quét */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <label className="text-xs font-bold text-white">Giới hạn bài mới / nguồn / lần chạy</label>
                        <select
                          value={scheduleConfig.maxArticlesPerRun || 2}
                          onChange={(e) => handleSaveScheduleConfig({ maxArticlesPerRun: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value={1}>Tối đa 1 bài mới</option>
                          <option value={2}>Tối đa 2 bài mới (Khuyên dùng)</option>
                          <option value={3}>Tối đa 3 bài mới</option>
                          <option value={5}>Tối đa 5 bài mới</option>
                        </select>
                      </div>

                      {/* Khoảng cách quét */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <label className="text-xs font-bold text-white">Tần suất quét định kỳ</label>
                        <select
                          value={scheduleConfig.intervalMinutes || 120}
                          onChange={(e) => handleSaveScheduleConfig({ intervalMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value={30}>Mỗi 30 phút</option>
                          <option value={60}>Mỗi 1 giờ</option>
                          <option value={120}>Mỗi 2 giờ (Theo lịch GitHub Actions)</option>
                          <option value={360}>Mỗi 6 giờ</option>
                        </select>
                      </div>
                    </div>

                    {/* Tùy chọn nâng cao */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={scheduleConfig.autoAttachCodes}
                          onChange={(e) => handleSaveScheduleConfig({ autoAttachCodes: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Tự động bóc tách & gắn mã Giftcode vào bài</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={scheduleConfig.useGameLogoAsCover}
                          onChange={(e) => handleSaveScheduleConfig({ useGameLogoAsCover: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Tự động gán logo game làm ảnh bìa chính</span>
                      </label>
                    </div>
                  </div>

                  {/* Cấu hình Thông Báo Telegram */}
                  <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <Send className="w-4 h-4 text-sky-400" />
                        <span>Thông Báo Tức Thì Qua Telegram Bot</span>
                      </h4>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={scheduleConfig.notifyTelegram}
                          onChange={(e) => handleSaveScheduleConfig({ notifyTelegram: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-bold">Bật gửi tin nhắn</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300">Telegram Bot Token</label>
                        <input
                          type="password"
                          placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                          value={scheduleConfig.telegramBotToken || ''}
                          onChange={(e) => handleSaveScheduleConfig({ telegramBotToken: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300">Telegram Chat ID / Kênh</label>
                        <input
                          type="text"
                          placeholder="-100123456789 hoặc @tenkenh"
                          value={scheduleConfig.telegramChatId || ''}
                          onChange={(e) => handleSaveScheduleConfig({ telegramChatId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Nhật Ký Hoạt Động */}
              {automationActiveTab === 'logs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                    <span>Lịch sử các phiên quét bài viết tự động gần đây:</span>
                    <span className="font-mono">{crawlLogs.length} sự kiện</span>
                  </div>

                  {crawlLogs.length === 0 ? (
                    <div className="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                      Chưa có nhật ký hoạt động nào. Hãy bấm "⚡ Quét Tất Cả Nguồn Ngay" để khởi tạo phiên quét đầu tiên.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                      {crawlLogs.map((log) => {
                        const isSuccess = log.status === 'SUCCESS';
                        const isSkipped = log.status === 'SKIPPED_EXISTING';
                        return (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isSuccess
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : isSkipped
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {isSuccess && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                                  {isSkipped && <Info className="w-3 h-3 text-amber-400" />}
                                  {!isSuccess && !isSkipped && <AlertCircle className="w-3 h-3 text-rose-400" />}
                                  <span>{isSuccess ? 'ĐÃ ĐĂNG BÀI' : isSkipped ? 'ĐÃ TỒN TẠI' : 'LỖI'}</span>
                                </span>
                                <span className="font-bold text-white">{log.sourceName}</span>
                                {log.gameName && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                                    🎮 {log.gameName}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                              </span>
                            </div>

                            {log.articleTitle && (
                              <div className="font-semibold text-slate-200">
                                📰 {log.articleTitle}
                              </div>
                            )}

                            <div className="text-slate-400 text-[11px]">{log.message}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>GitHub Actions & Cloudflare D1 Sync: Sẵn Sàng</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAutomationModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 5. Spam Cleanup Confirmation Modal */}
      {isSpamConfirmModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up">
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <span>Quét & Dọn Dẹp Bài Viết Rác</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-xs">
                        {detectedSpamArticles.length} bài
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Tự động phát hiện bài quảng cáo, phụ kiện công nghệ hoặc không liên quan đến game.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSpamConfirmModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-200">Lưu ý quan trọng về cơ chế Tombstone:</div>
                    <div className="mt-1 text-slate-300">
                      Khi bấm xác nhận xóa, các bài viết này sẽ bị xóa khỏi cơ sở dữ liệu và mã nhận diện (ID &amp; Slug) sẽ được lưu vào danh sách <b>Tombstones</b> trên máy chủ Cloudflare D1. Việc này đảm bảo các bài viết rác này sẽ <b>không bao giờ bị cào lại hoặc tự động hồi sinh</b> trong tương lai!
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Danh sách {detectedSpamArticles.length} bài viết sẽ được dọn dẹp:</span>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {detectedSpamArticles.map(({ article, reason }) => (
                      <div
                        key={article.id}
                        className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-bold text-white truncate" title={article.title}>
                            {article.title}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="text-rose-400 font-semibold">
                              ⚠️ Lý do: {reason}
                            </span>
                            <span className="text-slate-500 font-mono">
                              /news/{article.slug}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleDelete(article.id);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white text-[11px] font-bold transition-all shrink-0 cursor-pointer"
                        >
                          Xóa lẻ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isCleaningSpam}
                  onClick={() => setIsSpamConfirmModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={isCleaningSpam || detectedSpamArticles.length === 0}
                  onClick={handleConfirmCleanupSpam}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg hover:shadow-rose-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isCleaningSpam
                      ? 'Đang xóa & đồng bộ D1...'
                      : `Xác Nhận Xóa Sạch (${detectedSpamArticles.length} bài)`}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

