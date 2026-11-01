import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Clock,
  Calendar,
  Gift,
  Key,
  Copy,
  Check,
  RefreshCw,
  Send,
  Terminal,
  Play,
  AlertCircle,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Code2,
  ShieldCheck,
  ChevronRight,
  Eye,
  EyeOff,
  Bot,
  Globe,
  Sliders,
  CheckCircle2,
  X,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Star,
  PauseCircle,
  Layers,
  ListOrdered,
  Dices,
  Users,
  TrendingUp,
  Shuffle,
  SlidersHorizontal,
  Hash,
} from 'lucide-react';
import { adminDataService } from '../services/adminDataService';
import { UpcomingGameAdminRecord, UpcomingGameApiLogEntry } from '../types/adminTypes';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ImageUploadInput } from '../components/ui/ImageUploadInput';
import { getUpcomingGameIconUrl, handleUpcomingImageError } from '../../utils/upcomingGameIconUtils';
import { generateRandomInRange, calculateEffectiveOrder, calculateEffectiveSubscribers } from '../../utils/upcomingGameGrowthUtils';

interface UpcomingGamesSectionProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  onGameLaunched?: () => void;
}

function getCountdownDetails(releaseDateStr?: string | null): { text: string; isPast: boolean; color: string; badgeBg: string } {
  if (!releaseDateStr) {
    return { text: 'Chưa rõ ngày ra mắt', isPast: false, color: 'text-amber-400/90 font-medium', badgeBg: 'bg-amber-950/30 border-amber-500/30 text-amber-300' };
  }
  const target = new Date(releaseDateStr).getTime();
  if (isNaN(target)) {
    return { text: releaseDateStr, isPast: false, color: 'text-slate-400', badgeBg: 'bg-slate-800/80 border-slate-700' };
  }
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) {
    const elapsed = now - target;
    if (elapsed <= ONE_DAY_MS) {
      const remainingMs = ONE_DAY_MS - elapsed;
      const remHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        text: `🎉 Đã mở hôm nay (còn ${remHours}h ${remMins}m trên banner)`,
        isPast: true,
        color: 'text-emerald-400 font-bold',
        badgeBg: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300',
      };
    } else {
      return {
        text: '✅ Đã chuyển xuống sàn chính thức (> 24h)',
        isPast: true,
        color: 'text-indigo-400 font-bold',
        badgeBg: 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300',
      };
    }
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return {
      text: `⏳ Còn ${days} ngày ${hours} giờ`,
      isPast: false,
      color: 'text-amber-400 font-semibold',
      badgeBg: 'bg-amber-950/40 border-amber-500/40 text-amber-300',
    };
  }
  return {
    text: `⏳ Còn ${hours} giờ ${minutes} phút`,
    isPast: false,
    color: 'text-rose-400 font-bold animate-pulse',
    badgeBg: 'bg-rose-950/50 border-rose-500/50 text-rose-300',
  };
}

export const UpcomingGamesSection: React.FC<UpcomingGamesSectionProps> = ({ onShowToast, onGameLaunched }) => {
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGameAdminRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeListTab, setActiveListTab] = useState<'LIVE' | 'PENDING' | 'API'>('LIVE');
  const [liveSubFilter, setLiveSubFilter] = useState<'ALL' | 'TOP6' | 'UPCOMING' | 'LAUNCHED'>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // API Config & Test Console State
  const [apiSnippetLang, setApiSnippetLang] = useState<'python' | 'curl' | 'js'>('python');
  const [testPayloadJson, setTestPayloadJson] = useState('');
  const [isExecutingApiTest, setIsExecutingApiTest] = useState(false);
  const [apiTestResponse, setApiTestResponse] = useState<any>(null);
  const [apiLogs, setApiLogs] = useState<UpcomingGameApiLogEntry[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form Modal State (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Partial<UpcomingGameAdminRecord> | null>(null);
  const [expectedCodesInput, setExpectedCodesInput] = useState('');

  // Delete Confirm Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingGame, setDeletingGame] = useState<UpcomingGameAdminRecord | null>(null);

  // Live timer tick every 30 seconds for accurate countdowns
  const [, setTick] = useState(0);
  const [isSyncingServer, setIsSyncingServer] = useState(false);

  const crawlerConfig = adminDataService.getCrawlerApiConfig();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop';
  const apiEndpointUrl = `${currentOrigin}/api/crawler/ingest-upcoming-games`;
  const displayedApiKey = showApiKey
    ? (crawlerConfig.apiKey || 'YOUR_API_KEY')
    : (crawlerConfig.apiKey && crawlerConfig.apiKey.length > 8 ? `${crawlerConfig.apiKey.slice(0, 8)}••••••••••••` : '••••••••••••••••');

  const loadData = () => {
    setIsLoading(true);
    const list = adminDataService.getUpcomingGames();
    setUpcomingGames(list);
    setApiLogs(adminDataService.getUpcomingGamesLogs());
    setIsLoading(false);
  };

  const handleSyncServerD1 = async () => {
    setIsSyncingServer(true);
    try {
      const serverList = await adminDataService.fetchUpcomingGamesFromServer();
      setUpcomingGames(serverList);
      onShowToast('Đã đồng bộ Server D1', `Đã cập nhật danh sách ${serverList.length} game chuẩn bị ra mắt từ Cloudflare D1.`, 'success');
    } catch {
      onShowToast('Lỗi đồng bộ', 'Không thể kết nối đến máy chủ Cloudflare D1.', 'error');
    } finally {
      setIsSyncingServer(false);
    }
  };

  useEffect(() => {
    loadData();
    // Proactively pull latest list from Server D1
    adminDataService.fetchUpcomingGamesFromServer().then((list) => {
      if (list && list.length > 0) setUpcomingGames(list);
    }).catch(() => {});

    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('wcg_admin_data_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(timer);
      window.removeEventListener('wcg_admin_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Initialize sample test payload for Pine Assistant & Muse Bot
  useEffect(() => {
    const rawKey = crawlerConfig.apiKey || 'YOUR_API_KEY';
    const keyToDisplay = showApiKey ? rawKey : (rawKey.length > 8 ? `${rawKey.slice(0, 8)}••••••••••••` : '••••••••••••••••');
    const sample = {
      apiKey: keyToDisplay,
      botName: 'Trợ lý Pine',
      action: 'ingest',
      games: [
        {
          name: 'Strinova VN',
          slug: 'strinova-vn',
          publisher: 'Gzone',
          releaseDate: '2026-10-23T10:00:00+07:00',
          category: 'Bắn Súng Anime 3D',
          platform: 'PC, Android, iOS',
          iconUrl: '/game_icons/strinova-vn.webp',
          bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
          description: 'Game bắn súng chiến thuật biến hình Anime 3D góc nhìn thứ ba đỉnh cao 2026.',
          preRegUrl: 'https://strinova.vplay.vn',
          expectedCodes: ['STRINOVAOB', 'STRINOVAVN', 'VIP999'],
          status: 'PENDING', // 'PENDING' để vào hàng chờ duyệt, hoặc 'UPCOMING' để duyệt thẳng lên web
          displayOrder: 1,
        },
      ],
    };
    setTestPayloadJson(JSON.stringify(sample, null, 2));
  }, [crawlerConfig.apiKey, showApiKey]);

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    onShowToast('Đã sao chép!', text, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenCreateModal = () => {
    const now = new Date();
    now.setDate(now.getDate() + 3);
    const dateStr = now.toISOString().slice(0, 10);
    const defaultDatetime = `${dateStr}T10:00`;

    // Next display order: Lọc bỏ các giá trị placeholder >= 900 để thứ tự tăng tự nhiên (1, 2, 3...)
    const rankedGames = upcomingGames.filter((g) => (g.displayOrder || 0) < 900);
    const maxOrder = rankedGames.length > 0 ? Math.max(0, ...rankedGames.map((g) => g.displayOrder || 0)) : 0;
    const nextOrder = maxOrder + 1;

    setEditingGame({
      name: '',
      slug: '',
      publisher: '',
      category: 'Nhập Vai',
      platform: 'Android, iOS',
      releaseDate: defaultDatetime,
      iconUrl: '',
      bannerUrl: '',
      description: '',
      preRegUrl: '',
      status: 'UPCOMING',
      displayOrder: nextOrder,
      orderGrowthEnabled: false,
      orderGrowthRate: 0,
      orderMinRange: 1,
      orderMaxRange: Math.max(20, nextOrder + 5),
      subscribersCount: 1200,
      subscribersGrowthEnabled: false,
      subscribersGrowthRatePerHour: 5,
      subscribersMinRange: 500,
      subscribersMaxRange: 3500,
      growthAnchorTime: new Date().toISOString(),
      source: 'Admin Console',
      expectedCodes: [],
    });
    setExpectedCodesInput('');
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (game: UpcomingGameAdminRecord) => {
    setEditingGame({
      ...game,
      displayOrder: typeof game.displayOrder === 'number' ? game.displayOrder : 1,
      orderGrowthEnabled: !!game.orderGrowthEnabled,
      orderGrowthRate: Number(game.orderGrowthRate) || 0,
      orderMinRange: Number(game.orderMinRange) || 1,
      orderMaxRange: Number(game.orderMaxRange) || Math.max(20, (game.displayOrder || 1) + 10),
      subscribersCount: typeof game.subscribersCount === 'number' ? game.subscribersCount : 1200,
      subscribersGrowthEnabled: !!game.subscribersGrowthEnabled,
      subscribersGrowthRatePerHour: Number(game.subscribersGrowthRatePerHour) || 5,
      subscribersMinRange: Number(game.subscribersMinRange) || 500,
      subscribersMaxRange: Number(game.subscribersMaxRange) || 3500,
      growthAnchorTime: game.growthAnchorTime || game.createdAt || new Date().toISOString(),
    });
    setExpectedCodesInput(Array.isArray(game.expectedCodes) ? game.expectedCodes.join(', ') : '');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame?.name) {
      onShowToast('Lỗi', 'Vui lòng nhập tên game.', 'error');
      return;
    }

    const name = editingGame.name.trim();
    const slug = editingGame.slug?.trim()
      ? editingGame.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

    const codes = expectedCodesInput
      .split(/[,;\n]+/)
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    const record: UpcomingGameAdminRecord = {
      id: editingGame.id || `ug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      slug,
      publisher: editingGame.publisher?.trim() || 'Nhà phát hành',
      releaseDate: editingGame.releaseDate?.trim() ? editingGame.releaseDate.trim() : null,
      category: editingGame.category?.trim() || 'Game Mới',
      platform: editingGame.platform?.trim() || 'Android, iOS',
      iconUrl: editingGame.iconUrl?.trim() || `/game_icons/${slug}.webp`,
      bannerUrl: editingGame.bannerUrl?.trim() || undefined,
      description: editingGame.description?.trim() || undefined,
      preRegUrl: editingGame.preRegUrl?.trim() || undefined,
      expectedCodes: codes,
      subscribersCount: typeof editingGame.subscribersCount === 'number'
        ? editingGame.subscribersCount
        : (parseFloat(String(editingGame.subscribersCount)) || 0),
      source: editingGame.source || 'Admin Console',
      status: editingGame.status || 'UPCOMING',
      displayOrder: typeof editingGame.displayOrder === 'number'
        ? editingGame.displayOrder
        : (parseFloat(String(editingGame.displayOrder)) || 1),
      orderGrowthEnabled: !!editingGame.orderGrowthEnabled,
      orderGrowthRate: Number(editingGame.orderGrowthRate) || 0,
      orderMinRange: Number(editingGame.orderMinRange) || 0.1,
      orderMaxRange: Number(editingGame.orderMaxRange) || 50,
      subscribersGrowthEnabled: !!editingGame.subscribersGrowthEnabled,
      subscribersGrowthRatePerHour: Number(editingGame.subscribersGrowthRatePerHour) || 0,
      subscribersMinRange: Number(editingGame.subscribersMinRange) || 0,
      subscribersMaxRange: Number(editingGame.subscribersMaxRange) || 3500,
      growthAnchorTime: editingGame.growthAnchorTime || new Date().toISOString(),
      createdAt: editingGame.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adminDataService.saveUpcomingGame(record);
    loadData();
    setIsFormOpen(false);
    setEditingGame(null);
    onShowToast(
      'Thành công',
      `Đã ${editingGame.id ? 'cập nhật' : 'thêm'} game "${record.name}" vào danh sách.`,
      'success'
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGame) return;
    await adminDataService.deleteUpcomingGame(deletingGame.id);
    loadData();
    setIsDeleteOpen(false);
    setDeletingGame(null);
    onShowToast('Đã xóa', `Đã xóa game "${deletingGame.name}".`, 'info');
  };

  // Reorder actions
  const handleMoveUp = async (gameId: string) => {
    const liveList = upcomingGames
      .filter((g) => g.status === 'UPCOMING' || g.status === 'APPROVED' || g.status === 'LAUNCHED')
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    const index = liveList.findIndex((g) => g.id === gameId);
    if (index <= 0) return;

    // Swap with item before
    const temp = liveList[index - 1];
    liveList[index - 1] = liveList[index];
    liveList[index] = temp;

    const orderedIds = liveList.map((g) => g.id);
    await adminDataService.reorderUpcomingGames(orderedIds);
    loadData();
    onShowToast('Đã đổi thứ tự', `Đã đẩy "${liveList[index - 1].name}" lên vị trí ${index}.`, 'info');
  };

  const handleMoveDown = async (gameId: string) => {
    const liveList = upcomingGames
      .filter((g) => g.status === 'UPCOMING' || g.status === 'APPROVED' || g.status === 'LAUNCHED')
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    const index = liveList.findIndex((g) => g.id === gameId);
    if (index < 0 || index >= liveList.length - 1) return;

    // Swap with item after
    const temp = liveList[index + 1];
    liveList[index + 1] = liveList[index];
    liveList[index] = temp;

    const orderedIds = liveList.map((g) => g.id);
    await adminDataService.reorderUpcomingGames(orderedIds);
    loadData();
    onShowToast('Đã đổi thứ tự', `Đã chuyển "${liveList[index + 1].name}" xuống vị trí ${index + 2}.`, 'info');
  };

  const handlePinTop1 = async (gameId: string) => {
    const liveList = upcomingGames
      .filter((g) => g.status === 'UPCOMING' || g.status === 'APPROVED' || g.status === 'LAUNCHED')
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    const targetGame = liveList.find((g) => g.id === gameId);
    if (!targetGame) return;

    const remaining = liveList.filter((g) => g.id !== gameId);
    const reordered = [targetGame, ...remaining];
    const orderedIds = reordered.map((g) => g.id);

    await adminDataService.reorderUpcomingGames(orderedIds);
    loadData();
    onShowToast('Đã ghim Top 1', `Đã đưa "${targetGame.name}" lên vị trí đầu tiên của Web Khách!`, 'success');
  };

  const handleBulkRandomize = async () => {
    if (!window.confirm('Bạn có chắc muốn sinh số ngẫu nhiên cho tất cả game theo khoảng dao động cài đặt của từng game?')) return;
    const updatedList = upcomingGames.map((g) => {
      const minOrder = g.orderMinRange ?? 1;
      const maxOrder = g.orderMaxRange ?? 25;
      const minSubs = g.subscribersMinRange ?? 500;
      const maxSubs = g.subscribersMaxRange ?? 3500;
      return {
        ...g,
        displayOrder: generateRandomInRange(minOrder, maxOrder, 1),
        subscribersCount: generateRandomInRange(minSubs, maxSubs, 1),
        growthAnchorTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    for (const g of updatedList) {
      await adminDataService.saveUpcomingGame(g);
    }
    loadData();
    onShowToast('Thành công', 'Đã sinh số ngẫu nhiên hàng loạt cho toàn bộ game theo khoảng cài đặt!', 'success');
  };

  // Moderation Queue Actions
  const handleApproveGame = async (gameId: string, pinToTop = false) => {
    await adminDataService.approveUpcomingGame(gameId, pinToTop);
    loadData();
    const g = upcomingGames.find((x) => x.id === gameId);
    onShowToast(
      'Đã duyệt đưa lên Web Khách!',
      `Tựa game "${g?.name || gameId}" đã xuất bản ra sàn${pinToTop ? ' và ghim lên Top đầu' : ''}.`,
      'success'
    );
  };

  const handleApproveAllPending = async () => {
    const count = await adminDataService.approveAllUpcomingGames();
    loadData();
    onShowToast(
      'Duyệt hàng loạt thành công!',
      `Đã duyệt và xuất bản toàn bộ ${count} tựa game trong hàng chờ lên Web Khách.`,
      'success'
    );
  };

  const handleMoveToPending = async (gameId: string) => {
    await adminDataService.moveUpcomingGameToPending(gameId);
    loadData();
    const g = upcomingGames.find((x) => x.id === gameId);
    onShowToast('Đã chuyển về hàng chờ', `Game "${g?.name || gameId}" đã được đưa vào hàng chờ duyệt.`, 'info');
  };

  const handleClearExpectedCodes = async (gameId: string) => {
    const g = upcomingGames.find((x) => x.id === gameId);
    await adminDataService.clearUpcomingGameExpectedCodes(gameId);
    loadData();
    onShowToast('Đã xóa mã dự kiến', `Đã xóa sạch mã code dự kiến của "${g?.name || gameId}".`, 'info');
  };

  const handleLaunchGame = async (game: UpcomingGameAdminRecord) => {
    const res = await adminDataService.launchUpcomingGame(game.id);
    if (res.success) {
      loadData();
      if (onGameLaunched) onGameLaunched();
      onShowToast(
        '🚀 Phát Hành Thành Công!',
        `Đã tạo game chính thức "${res.gameName}" trên sàn & tự động nạp ${res.codesAdded} giftcode tân thủ.`,
        'success'
      );
    } else {
      onShowToast('Lỗi', 'Không thể kích hoạt phát hành game.', 'error');
    }
  };

  // Execute API test call
  const handleRunApiTest = async () => {
    setIsExecutingApiTest(true);
    setApiTestResponse(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(testPayloadJson);
      } catch {
        throw new Error('Dữ liệu JSON trong khung soạn thảo không hợp lệ.');
      }

      // Tự động khôi phục API Key thật nếu đang ở chế độ hiển thị che giấu (masked)
      if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.includes('•')) {
        parsed.apiKey = crawlerConfig.apiKey || '';
      }

      const res = await fetch(apiEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': crawlerConfig.apiKey || '',
        },
        body: JSON.stringify(parsed),
      });

      const json = await res.json();
      setApiTestResponse({
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data: json,
      });

      if (res.ok) {
        onShowToast('API Test Thành Công', json.message || 'Đã thực thi yêu cầu qua API.', 'success');
        loadData();
      } else {
        onShowToast('API Test Báo Lỗi', json.error || 'Yêu cầu bị từ chối.', 'error');
      }
    } catch (err: any) {
      setApiTestResponse({
        status: 0,
        statusText: 'Client Network Error',
        ok: false,
        data: { error: err.message || 'Lỗi kết nối tới endpoint' },
      });
      onShowToast('Lỗi Thực Thi', err.message, 'error');
    } finally {
      setIsExecutingApiTest(false);
    }
  };

  // Filter 2 separate lists
  const liveGamesRaw = upcomingGames
    .filter((g) => g.status === 'UPCOMING' || g.status === 'APPROVED' || g.status === 'LAUNCHED')
    .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

  const pendingGamesRaw = upcomingGames
    .filter((g) => g.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply search query
  const matchesSearch = (g: UpcomingGameAdminRecord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      g.name.toLowerCase().includes(q) ||
      g.slug.toLowerCase().includes(q) ||
      g.publisher.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      (g.expectedCodes && g.expectedCodes.some((c) => c.toLowerCase().includes(q)))
    );
  };

  const filteredLiveGames = liveGamesRaw.filter((g) => {
    if (!matchesSearch(g)) return false;
    if (liveSubFilter === 'TOP6') {
      const idx = liveGamesRaw.findIndex((x) => x.id === g.id);
      return idx >= 0 && idx < 6;
    }
    if (liveSubFilter === 'UPCOMING') return g.status !== 'LAUNCHED';
    if (liveSubFilter === 'LAUNCHED') return g.status === 'LAUNCHED';
    return true;
  });

  const filteredPendingGames = pendingGamesRaw.filter(matchesSearch);

  const totalExpectedCodes = upcomingGames.reduce((acc, g) => acc + (g.expectedCodes?.length || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Overview */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-indigo-500/30 shadow-lg shadow-indigo-950/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Rocket className="w-5 h-5 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
              </span>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight">
                Quản Lý Game Chuẩn Bị Ra Mắt & Cổng API Trợ Lý Pine / Muse
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Quản lý 2 danh sách rõ ràng: <strong className="text-cyan-300">Đang Hiển Thị Trên Web</strong> (Top 6 game trưng bày trực tiếp, các game còn lại hiện khi ấn xem thêm) và <strong className="text-amber-300">Hàng Chờ Duyệt</strong> (duyệt xong mới lên web). Cấp quyền toàn diện cho Trợ lý Pine & Muse Bot qua API.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Game Mới</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveListTab(activeListTab === 'API' ? 'LIVE' : 'API')}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeListTab === 'API'
                  ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-sm'
                  : 'bg-card hover:bg-card-hover border-border text-slate-200'
              }`}
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>📡 Cổng API Trợ Lý Pine & Muse</span>
            </button>

            <button
              type="button"
              onClick={handleSyncServerD1}
              disabled={isSyncingServer}
              className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Đồng bộ 2 chiều tức thì với cơ sở dữ liệu Cloudflare D1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingServer ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
              <span>{isSyncingServer ? 'Đang đồng bộ...' : '⚡ Đồng Bộ Server D1'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loadData();
                onShowToast('Đã làm mới', 'Dữ liệu game sắp ra mắt đã được đồng bộ.', 'info');
              }}
              className="p-2 rounded-xl bg-card hover:bg-card-hover border border-border text-slate-300 transition-all cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveListTab('LIVE')}
          className={`p-4 rounded-2xl bg-card border shadow-sm cursor-pointer transition-all ${
            activeListTab === 'LIVE' ? 'border-cyan-500 ring-1 ring-cyan-500/30 bg-cyan-950/20' : 'border-border hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Hiện Trên Web Khách</span>
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-display text-cyan-400">{liveGamesRaw.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Top 6 trưng bày • {Math.max(0, liveGamesRaw.length - 6)} ở mục Xem Thêm
          </div>
        </div>

        <div
          onClick={() => setActiveListTab('PENDING')}
          className={`p-4 rounded-2xl bg-card border shadow-sm cursor-pointer transition-all ${
            activeListTab === 'PENDING' ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-950/20' : 'border-border hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Hàng Chờ Duyệt</span>
            <Clock className={`w-4 h-4 text-amber-400 ${pendingGamesRaw.length > 0 ? 'animate-pulse' : ''}`} />
          </div>
          <div className="text-2xl font-bold font-display text-amber-400">{pendingGamesRaw.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Chờ Pine / Admin duyệt lên web</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Giftcode Tân Thủ Dự Kiến</span>
            <Gift className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-display text-emerald-400">{totalExpectedCodes}</div>
          <div className="text-[11px] text-slate-400 mt-1">Sẵn sàng mở khóa giờ G</div>
        </div>

        <div
          onClick={() => setActiveListTab('API')}
          className={`p-4 rounded-2xl bg-card border shadow-sm cursor-pointer transition-all ${
            activeListTab === 'API' ? 'border-purple-500 ring-1 ring-purple-500/30 bg-purple-950/20' : 'border-border hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Cổng API Trợ Lý Pine & Muse</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Đang Hoạt Động</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">POST /api/crawler/ingest-upcoming-games</div>
        </div>
      </div>

      {/* Main 2 Lists Tab Switcher */}
      <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-2">
        <div className="flex items-center gap-2">
          {/* Tab 1: Hiện Trên Web */}
          <button
            type="button"
            onClick={() => setActiveListTab('LIVE')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeListTab === 'LIVE'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                : 'bg-card hover:bg-card-hover text-slate-400 hover:text-white border border-border'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-300" />
            <span>🌐 Đang Hiển Thị Trên Web</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-900/60 text-cyan-200 border border-cyan-400/30">
              {liveGamesRaw.length}
            </span>
          </button>

          {/* Tab 2: Hàng Chờ Duyệt */}
          <button
            type="button"
            onClick={() => setActiveListTab('PENDING')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer relative ${
              activeListTab === 'PENDING'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/25'
                : 'bg-card hover:bg-card-hover text-slate-400 hover:text-white border border-border'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>⏳ Hàng Chờ Duyệt</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                pendingGamesRaw.length > 0
                  ? 'bg-amber-400 text-slate-950 font-extrabold animate-pulse'
                  : 'bg-slate-900/60 text-amber-200 border border-amber-400/30'
              }`}
            >
              {pendingGamesRaw.length}
            </span>
          </button>

          {/* Tab 3: API & Webhook */}
          <button
            type="button"
            onClick={() => setActiveListTab('API')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeListTab === 'API'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25'
                : 'bg-card hover:bg-card-hover text-slate-400 hover:text-white border border-border'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-300" />
            <span>📡 Cổng API & Webhook</span>
          </button>
        </div>

        {/* Quick action button based on active tab */}
        {activeListTab === 'PENDING' && pendingGamesRaw.length > 0 && (
          <button
            type="button"
            onClick={handleApproveAllPending}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Duyệt Tất Cả ({pendingGamesRaw.length}) Lên Web</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DANH SÁCH GAME ĐANG HIỂN THỊ TRÊN WEB KHÁCH             */}
      {/* ============================================================== */}
      {activeListTab === 'LIVE' && (
        <div className="space-y-4">
          {/* Information & Reordering Guide Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-card border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white text-sm block mb-0.5">
                  Quy Tắc Trưng Bày Web Khách:
                </span>
                Mặc định <span className="text-amber-300 font-bold">6 tựa game đầu tiên (Top 1 - 6)</span> do Admin chỉnh sẽ hiển thị trực tiếp ngay trên Banner trang chủ Web Khách. Các tựa game từ vị trí thứ 7 trở đi sẽ xuất hiện cùng danh sách 6 game này khi khách bấm <span className="text-cyan-300 font-bold">"Xem tất cả"</span>. Sử dụng nút <span className="text-cyan-300 font-bold">▲ / ▼</span>, <span className="text-amber-400 font-bold">"Ghim Top 1"</span> hoặc cài đặt khoảng dao động & tăng trưởng theo thời gian.
              </div>
            </div>

            <button
              type="button"
              onClick={handleBulkRandomize}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Sinh ngẫu nhiên thứ tự hiển thị và người canh cho tất cả game theo khoảng cài đặt"
            >
              <Dices className="w-4 h-4" />
              <span>🎲 Sinh Random Hàng Loạt</span>
            </button>
          </div>

          {/* Search & Sub-Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên game, slug, nhà phát hành, mã code..."
                className="w-full bg-slate-900 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-border text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setLiveSubFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  liveSubFilter === 'ALL' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất Cả ({liveGamesRaw.length})
              </button>
              <button
                type="button"
                onClick={() => setLiveSubFilter('TOP6')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  liveSubFilter === 'TOP6' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-3 h-3" />
                <span>Top 6 Trưng Bày Web ({Math.min(6, liveGamesRaw.length)})</span>
              </button>
              <button
                type="button"
                onClick={() => setLiveSubFilter('UPCOMING')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  liveSubFilter === 'UPCOMING' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sắp Ra Mắt ({liveGamesRaw.filter((g) => g.status !== 'LAUNCHED').length})
              </button>
              <button
                type="button"
                onClick={() => setLiveSubFilter('LAUNCHED')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  liveSubFilter === 'LAUNCHED' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Đã Mở Server ({liveGamesRaw.filter((g) => g.status === 'LAUNCHED').length})
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredLiveGames.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border border-dashed space-y-3">
              <Rocket className="w-10 h-10 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-white">Chưa có tựa game nào trong danh sách hiển thị</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bấm vào "Thêm Game Mới" hoặc duyệt các tựa game từ "Hàng Chờ Duyệt" để đưa lên Web Khách.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLiveGames.map((game) => {
                const globalIndex = liveGamesRaw.findIndex((x) => x.id === game.id);
                const isTop6 = globalIndex >= 0 && globalIndex < 6;
                const countdown = getCountdownDetails(game.releaseDate);
                const hasDate = Boolean(game.releaseDate);
                const dateObj = hasDate ? new Date(game.releaseDate as string) : null;
                const formattedDate = (dateObj && !isNaN(dateObj.getTime()))
                  ? dateObj.toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : (game.releaseDate || 'Chưa rõ ngày');

                return (
                  <div
                    key={game.id}
                    className={`group relative rounded-2xl bg-card border transition-all duration-200 overflow-hidden shadow-sm flex flex-col justify-between ${
                      isTop6 ? 'border-amber-500/50 shadow-amber-500/5 ring-1 ring-amber-500/20' : 'border-border hover:border-indigo-500/50'
                    }`}
                  >
                    {/* Header: Position Badge & Reorder Controls */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                        {/* Position Badge */}
                        <div className="flex items-center gap-1.5">
                          {isTop6 ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-gradient-to-r from-amber-500/20 to-cyan-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>TOP {globalIndex + 1} • TRƯNG BÀY WEB KHÁCH</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              <span>VỊ TRÍ {globalIndex + 1} • XEM THÊM (MODAL)</span>
                            </span>
                          )}
                        </div>

                        {/* Order Navigation Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(game.id)}
                            disabled={globalIndex <= 0}
                            className={`p-1 rounded-lg border text-xs transition-colors ${
                              globalIndex <= 0
                                ? 'opacity-30 border-transparent text-slate-600 cursor-not-allowed'
                                : 'border-border bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer'
                            }`}
                            title="Di chuyển lên trên 1 nấc"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveDown(game.id)}
                            disabled={globalIndex >= liveGamesRaw.length - 1}
                            className={`p-1 rounded-lg border text-xs transition-colors ${
                              globalIndex >= liveGamesRaw.length - 1
                                ? 'opacity-30 border-transparent text-slate-600 cursor-not-allowed'
                                : 'border-border bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer'
                            }`}
                            title="Di chuyển xuống dưới 1 nấc"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {globalIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => handlePinTop1(game.id)}
                              className="px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Ghim lên vị trí Top 1 đầu bảng"
                            >
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>Top 1</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Game Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-border shrink-0 flex items-center justify-center shadow-inner">
                            {game.iconUrl || (game as any).icon_url ? (
                              <img
                                src={getUpcomingGameIconUrl(game)}
                                alt={game.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => handleUpcomingImageError(e, game)}
                              />
                            ) : (
                              <Rocket className="w-6 h-6 text-indigo-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                                {game.name}
                              </h4>
                              {game.status === 'LAUNCHED' ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                  Đã Mở Server
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                                  Sắp Ra Mắt
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="truncate">{game.publisher}</span>
                              <span>•</span>
                              <span className="truncate text-cyan-300">{game.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Countdown Badge */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${countdown.badgeBg}`}>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className={`text-xs font-bold ${countdown.color}`}>{countdown.text}</div>
                      </div>

                      {/* Cài đặt Thứ tự & Số người canh */}
                      <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-950/70 border border-border/60">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-semibold text-white">{calculateEffectiveSubscribers(game).toLocaleString('vi-VN')}</span>
                          <span className="text-[10px] text-slate-400">người canh</span>
                          {game.subscribersGrowthEnabled && (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-0.5 ml-1" title="Tăng trưởng theo giờ">
                              <TrendingUp className="w-2.5 h-2.5" />
                              +{game.subscribersGrowthRatePerHour || 5}/h
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                          {game.orderGrowthEnabled ? (
                            <span className="text-amber-300 font-bold flex items-center gap-1" title="Thứ tự tăng trưởng theo ngày">
                              <TrendingUp className="w-2.5 h-2.5" />
                              <span>Hiệu dụng: #{calculateEffectiveOrder(game)}</span>
                              <span className="text-[9px] text-slate-400">({(game.orderGrowthRate || 0) > 0 ? `+${game.orderGrowthRate}` : (game.orderGrowthRate || 0)}/d)</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">Thứ tự: #{game.displayOrder || 999}</span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {game.description && (
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {game.description}
                        </p>
                      )}

                      {/* Expected Giftcodes */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-medium flex items-center gap-1 text-slate-300">
                            <Gift className="w-3.5 h-3.5 text-accent" />
                            <span>Code Tân Thủ Dự Kiến ({game.expectedCodes?.length || 0}):</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {game.expectedCodes && game.expectedCodes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleClearExpectedCodes(game.id)}
                                className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-0.5 transition-colors cursor-pointer"
                                title="Xóa toàn bộ mã code dự kiến của game này"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Xóa mã</span>
                              </button>
                            )}
                            {game.source && (
                              <span className="text-[10px] text-purple-300 font-mono bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/20">
                                {game.source}
                              </span>
                            )}
                          </div>
                        </div>

                        {game.expectedCodes && game.expectedCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {game.expectedCodes.map((codeStr, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => handleCopyText(codeStr, `code-${game.id}-${cIdx}`)}
                                className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-border text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                                title="Bấm để chép code"
                              >
                                <span>{codeStr}</span>
                                {copiedKey === `code-${game.id}-${cIdx}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">Chưa có mã code dự kiến nào</div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3 bg-slate-950/60 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {game.preRegUrl && (
                          <a
                            href={game.preRegUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-cyan-400 hover:text-cyan-300 border border-border flex items-center gap-1 transition-colors"
                          >
                            <Globe className="w-3 h-3" />
                            <span>Đăng Ký</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMoveToPending(game.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-950/40 text-[11px] text-amber-300 hover:text-amber-200 border border-border hover:border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Chuyển game về lại Hàng Chờ Duyệt"
                        >
                          <PauseCircle className="w-3 h-3 text-amber-400" />
                          <span>Về Chờ Duyệt</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {game.status !== 'LAUNCHED' && (
                          <button
                            type="button"
                            onClick={() => handleLaunchGame(game)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                            title="Đẩy thành Game Chính Thức trên sàn khi mở server"
                          >
                            <Rocket className="w-3 h-3" />
                            <span>Phát Hành</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(game)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingGame(game);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Xóa game sắp ra mắt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: HÀNG CHỜ DUYỆT (CHỜ PINE / ADMIN DUYỆT)                 */}
      {/* ============================================================== */}
      {activeListTab === 'PENDING' && (
        <div className="space-y-4">
          {/* Information & Explanation */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-card border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white text-sm block mb-0.5">
                  Hàng Chờ Duyệt (Chưa Hiển Thị Trên Web Khách):
                </span>
                Danh sách các tựa game do <strong className="text-amber-300">Trợ lý Pine</strong>, <strong className="text-purple-300">Muse Bot</strong> hoặc Admin nạp vào nhưng chưa được duyệt. Các game này <strong className="text-rose-400">hoàn toàn chưa xuất hiện trên web khách</strong>. Bấm <span className="text-emerald-300 font-bold">"Duyệt Đưa Lên Web"</span> để xuất bản ra sàn.
              </div>
            </div>

            {pendingGamesRaw.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAllPending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap self-end md:self-auto shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Duyệt Toàn Bộ ({pendingGamesRaw.length}) Game</span>
              </button>
            )}
          </div>

          {/* Pending Cards */}
          {filteredPendingGames.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border border-dashed space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">Hàng chờ duyệt đang trống!</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tất cả các tựa game sắp ra mắt đã được duyệt lên web. Khi Trợ lý Pine hoặc Muse Bot quét và nạp game mới, chúng sẽ xuất hiện tại đây để chờ bạn duyệt.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPendingGames.map((game) => {
                const countdown = getCountdownDetails(game.releaseDate);
                const hasDate = Boolean(game.releaseDate);
                const dateObj = hasDate ? new Date(game.releaseDate as string) : null;
                const formattedDate = (dateObj && !isNaN(dateObj.getTime()))
                  ? dateObj.toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : (game.releaseDate || 'Chưa rõ ngày');

                return (
                  <div
                    key={game.id}
                    className="group relative rounded-2xl bg-card border border-amber-500/30 hover:border-amber-400/60 transition-all duration-200 overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>⏳ ĐANG CHỜ DUYỆT</span>
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono">
                          Nguồn: <span className="text-purple-300 font-semibold">{game.source || 'Trợ lý Pine'}</span>
                        </span>
                      </div>

                      {/* Game Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-border shrink-0 flex items-center justify-center shadow-inner">
                            {game.iconUrl || (game as any).icon_url ? (
                              <img
                                src={getUpcomingGameIconUrl(game)}
                                alt={game.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => handleUpcomingImageError(e, game)}
                              />
                            ) : (
                              <Rocket className="w-6 h-6 text-amber-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors truncate">
                              {game.name}
                            </h4>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="truncate">{game.publisher}</span>
                              <span>•</span>
                              <span className="truncate text-amber-300">{game.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Countdown badge */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${countdown.badgeBg}`}>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className={`text-xs font-bold ${countdown.color}`}>{countdown.text}</div>
                      </div>

                      {/* Expected codes */}
                      {game.expectedCodes && game.expectedCodes.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                            <span>Giftcode dự kiến ({game.expectedCodes.length}):</span>
                            <button
                              type="button"
                              onClick={() => handleClearExpectedCodes(game.id)}
                              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-0.5 transition-colors cursor-pointer"
                              title="Xóa toàn bộ mã code dự kiến của game này"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Xóa mã</span>
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {game.expectedCodes.map((codeStr, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-1.5 py-0.5 rounded bg-slate-900 border border-border text-[10px] font-mono text-emerald-400"
                              >
                                {codeStr}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions in Pending */}
                    <div className="p-3 bg-slate-950/60 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApproveGame(game.id, false)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                          title="Duyệt đưa lên Web Khách"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Duyệt Lên Web</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveGame(game.id, true)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          title="Duyệt và ghim luôn lên vị trí Top đầu"
                        >
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>Duyệt & Ghim Top 6</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(game)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Sửa thông tin trước khi duyệt"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingGame(game);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Từ chối / Xóa game khỏi hàng chờ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: CỔNG API TRỢ LÝ PINE & MUSE BOT                          */}
      {/* ============================================================== */}
      {activeListTab === 'API' && (
        <div className="space-y-6">
          {/* API Credentials Card */}
          <div className="p-5 rounded-2xl bg-card border border-purple-500/30 shadow-md space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Thông Tin Cấp Quyền Cho Trợ Lý Pine & Muse Bot
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sử dụng API Key này để trợ lý Pine hoặc Muse Bot tự động nạp lịch mở server, duyệt game hoặc sắp xếp thứ tự 24/7.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-border shrink-0"
                title={showApiKey ? 'Ẩn API Key (che giấu)' : 'Hiện API Key'}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                <span>{showApiKey ? 'Ẩn Khóa API' : 'Hiện Khóa API'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Endpoint Nhận Dữ Liệu (POST & GET)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={apiEndpointUrl}
                    className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyText(apiEndpointUrl, 'endpoint')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-border text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Sao chép URL"
                  >
                    {copiedKey === 'endpoint' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>API Key Xác Thực (Hệ Thống / Trợ Lý Pine)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Dùng chung cho Crawler & Upcoming</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      readOnly
                      value={crawlerConfig.apiKey || 'CHƯA_CẤU_HÌNH'}
                      className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 pr-10 text-xs font-mono text-emerald-400 select-all font-semibold tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={showApiKey ? 'Ẩn API Key (che giấu)' : 'Hiện API Key'}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(crawlerConfig.apiKey || '', 'key')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-border text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                    title="Sao chép API Key"
                  >
                    {copiedKey === 'key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Supported Actions Guide */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-border/80 text-xs text-slate-300 space-y-2.5">
              <div className="font-bold text-white flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>Các Action API Hỗ Trợ Toàn Diện Cho Trợ Lý Pine & Muse Bot:</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-medium">✨ Tự động bảo toàn dữ liệu chuẩn (Anti-Defaulting)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <div className="font-bold text-cyan-400 font-mono">action: "ingest"</div>
                  <div className="text-slate-400 mt-1">
                    Thêm hoặc cập nhật game an toàn. <strong>Không bao giờ tự đè mất ngày giờ hoặc thể loại cũ khi gửi thiếu trường</strong>. Gửi kèm <code className="text-cyan-300">"status": "UPCOMING"</code> hoặc <code className="text-cyan-300">"directPublish": true</code> để xuất bản ngay ra Web Khách.
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <div className="font-bold text-emerald-400 font-mono">action: "set_status"</div>
                  <div className="text-slate-400 mt-1">
                    Đổi trạng thái game theo <code className="text-emerald-300">name</code>, <code className="text-emerald-300">slug</code> hoặc <code className="text-emerald-300">id</code> sang <code className="text-emerald-300">'UPCOMING'</code> (lên Web) hoặc <code className="text-amber-300">'PENDING'</code> (về hàng chờ).
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <div className="font-bold text-rose-400 font-mono">action: "clear_expected_codes"</div>
                  <div className="text-slate-400 mt-1">
                    Xóa sạch toàn bộ giftcode dự kiến rác / đoán sai bằng danh sách rỗng hoặc gọi action xóa theo tên game / slug / id.
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <div className="font-bold text-blue-400 font-mono">action: "update_icon"</div>
                  <div className="text-slate-400 mt-1">
                    Nạp và cập nhật icon chính xác cho game qua <code className="text-blue-300">iconUrl</code>, <code className="text-blue-300">icon</code> hoặc <code className="text-blue-300">gameIcon</code> theo <code className="text-blue-300">name</code> / <code className="text-blue-300">slug</code>.
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <div className="font-bold text-teal-400 font-mono">action: "approve"</div>
                  <div className="text-slate-400 mt-1">
                    Duyệt game từ hàng chờ đưa lên Web Khách theo <code className="text-teal-300">id</code>, <code className="text-teal-300">slug</code> hoặc <code className="text-teal-300">name</code> (có cờ <code className="text-amber-300">pinToTop: true</code>).
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <div className="font-bold text-amber-400 font-mono">action: "reorder"</div>
                  <div className="text-slate-400 mt-1">
                    Sắp xếp thứ tự các game trên Web Khách theo mảng <code className="text-amber-300">orderedIds</code> (Top 6 game đầu tiên sẽ trưng bày trên banner).
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <div className="font-bold text-purple-400 font-mono">action: "delete" / "reject"</div>
                  <div className="text-slate-400 mt-1">
                    Xóa hoàn toàn game khỏi danh sách hoặc từ chối bản ghi trong hàng chờ duyệt.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Console & Code Snippets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Interactive Test Console */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Thực Thi Test API Trực Tiếp</span>
                </span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      const rawKey = showApiKey ? (crawlerConfig.apiKey || 'YOUR_API_KEY') : '••••••••••••••••';
                      if (val === 'ingest_safe') {
                        setTestPayloadJson(JSON.stringify({
                          apiKey: rawKey,
                          botName: 'Trợ lý Pine',
                          action: 'ingest',
                          directPublish: true,
                          games: [
                            {
                              name: 'Hiệp Khách Hành',
                              slug: 'hiep-khach-hanh',
                              publisher: 'VTC Mobile',
                              releaseDate: '2026-11-01T10:00:00+07:00',
                              category: 'Kiếm Hiệp Kim Dung',
                              platform: 'Android, iOS',
                              status: 'UPCOMING',
                              expectedCodes: ['HIEPKHACHHANH', 'HKHVTC']
                            }
                          ]
                        }, null, 2));
                      } else if (val === 'set_status_upcoming') {
                        setTestPayloadJson(JSON.stringify({
                          apiKey: rawKey,
                          botName: 'Trợ lý Pine',
                          action: 'set_status',
                          name: 'Hiệp Khách Hành',
                          status: 'UPCOMING',
                          pinToTop: true
                        }, null, 2));
                      } else if (val === 'clear_codes') {
                        setTestPayloadJson(JSON.stringify({
                          apiKey: rawKey,
                          botName: 'Trợ lý Pine',
                          action: 'clear_expected_codes',
                          name: 'Monster Hunter Outlanders'
                        }, null, 2));
                      } else if (val === 'reorder') {
                        setTestPayloadJson(JSON.stringify({
                          apiKey: rawKey,
                          botName: 'Trợ lý Pine',
                          action: 'reorder',
                          orderedIds: ['ug_strinova_vn', 'ug_tien_gioi', 'ug_hiep_khach_hanh', 'ug_monster_hunter_outlanders']
                        }, null, 2));
                      } else if (val === 'update_icon') {
                        setTestPayloadJson(JSON.stringify({
                          apiKey: rawKey,
                          botName: 'Trợ lý Pine',
                          action: 'update_icon',
                          name: 'Hiệp Khách Hành',
                          iconUrl: '/game_icons/hiep-khach-hanh.webp'
                        }, null, 2));
                      }
                    }}
                    className="bg-slate-900 border border-border rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                    defaultValue="ingest_safe"
                  >
                    <option value="ingest_safe">Mẫu 1: Ingest Game (Xuất Bản Trực Tiếp)</option>
                    <option value="set_status_upcoming">Mẫu 2: Set Status (Duyệt Lên Web)</option>
                    <option value="clear_codes">Mẫu 3: Clear Codes (Xóa Mã Code Rác)</option>
                    <option value="reorder">Mẫu 4: Reorder (Sắp Xếp Top 6 Banner)</option>
                    <option value="update_icon">Mẫu 5: Update Icon (Cập Nhật Logo Chuẩn)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleRunApiTest}
                    disabled={isExecutingApiTest}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    {isExecutingApiTest ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Gửi Test</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={12}
                value={testPayloadJson}
                onChange={(e) => setTestPayloadJson(e.target.value)}
                className="w-full bg-slate-950 border border-border rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-500 resize-none"
              />

              {apiTestResponse && (
                <div className="p-3 rounded-xl bg-slate-950 border border-border space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Kết quả phản hồi:</span>
                    <span
                      className={`font-mono font-bold ${
                        apiTestResponse.ok ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      HTTP {apiTestResponse.status} {apiTestResponse.statusText}
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(apiTestResponse.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Code Snippets */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span>Mẫu Mã Nguồn Tích Hợp (Trợ Lý Pine)</span>
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setApiSnippetLang('python')}
                    className={`px-2 py-0.5 rounded font-mono ${
                      apiSnippetLang === 'python' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiSnippetLang('curl')}
                    className={`px-2 py-0.5 rounded font-mono ${
                      apiSnippetLang === 'curl' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiSnippetLang('js')}
                    className={`px-2 py-0.5 rounded font-mono ${
                      apiSnippetLang === 'js' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    JS/TS
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-3 rounded-xl bg-slate-950 border border-border text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[360px] leading-relaxed">
                  {apiSnippetLang === 'python' &&
`import requests

url = "${apiEndpointUrl}"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${displayedApiKey}"
}

# 1. Nạp game mới xuất bản thẳng lên Web Khách (hoặc cập nhật an toàn không đè dữ liệu cũ):
payload = {
    "botName": "Trợ lý Pine",
    "action": "ingest",
    "directPublish": True,  # True để lên Web ngay, False để vào Hàng Chờ Duyệt
    "games": [
        {
            "name": "Hiệp Khách Hành",
            "slug": "hiep-khach-hanh",
            "publisher": "VTC Mobile",
            "releaseDate": "2026-11-01T10:00:00+07:00",
            "category": "Kiếm Hiệp Kim Dung",
            "platform": "Android, iOS",
            "status": "UPCOMING",
            "expectedCodes": []  # Gửi mảng rỗng để xóa sạch mã dự đoán cũ
        }
    ]
}

# 2. Hoặc Đổi trạng thái game sang UPCOMING / PENDING theo Tên hoặc Slug:
# payload = {"action": "set_status", "name": "Hiệp Khách Hành", "status": "UPCOMING", "pinToTop": True}

# 3. Hoặc Xóa sạch mã code dự kiến:
# payload = {"action": "clear_expected_codes", "name": "Monster Hunter Outlanders"}

response = requests.post(url, json=payload, headers=headers)
print("Response:", response.status_code, response.json())`}

                  {apiSnippetLang === 'curl' &&
`# 1. Nạp game & xuất bản thẳng lên Web Khách (hoặc xóa sạch mã dự kiến rỗng)
curl -X POST "${apiEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayedApiKey}" \\
  -d '{
    "botName": "Trợ lý Pine",
    "action": "ingest",
    "directPublish": true,
    "games": [
      {
        "name": "Hiệp Khách Hành",
        "slug": "hiep-khach-hanh",
        "publisher": "VTC Mobile",
        "releaseDate": "2026-11-01T10:00:00+07:00",
        "category": "Kiếm Hiệp Kim Dung",
        "expectedCodes": []
      }
    ]
  }'

# 2. Đổi trạng thái game theo Tên sang UPCOMING
# curl -X POST "${apiEndpointUrl}" -H "Content-Type: application/json" -H "X-API-Key: ${displayedApiKey}" -d '{"action": "set_status", "name": "Hiệp Khách Hành", "status": "UPCOMING"}'`}

                  {apiSnippetLang === 'js' &&
`async function manageUpcomingGame() {
  const res = await fetch("${apiEndpointUrl}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "${displayedApiKey}"
    },
    body: JSON.stringify({
      botName: "Trợ lý Pine",
      action: "set_status",
      name: "Hiệp Khách Hành",
      status: "UPCOMING", // 'UPCOMING' để duyệt ngay ra Web Khách
      pinToTop: true
    })
  });
  const data = await res.json();
  console.log(data);
}`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const snippet =
                      apiSnippetLang === 'python'
                        ? `import requests\n\nurl = "${apiEndpointUrl}"\nheaders = {"Content-Type": "application/json", "X-API-Key": "${crawlerConfig.apiKey}"}\npayload = {"botName": "Trợ lý Pine", "action": "ingest", "games": [{"name": "Strinova VN", "slug": "strinova-vn", "publisher": "Gzone", "releaseDate": "2026-10-23T10:00:00+07:00", "status": "PENDING", "expectedCodes": ["STRINOVAOB"]}]}\nres = requests.post(url, json=payload, headers=headers)\nprint(res.json())`
                        : `curl -X POST "${apiEndpointUrl}" -H "Content-Type: application/json" -H "X-API-Key: ${crawlerConfig.apiKey}" -d '{"botName": "Trợ lý Pine", "action": "ingest", "games": [{"name": "Strinova VN", "slug": "strinova-vn", "status": "PENDING"}]}'`;
                    handleCopyText(snippet, 'snippet');
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-border text-slate-300 transition-all cursor-pointer"
                  title="Sao chép mã nguồn"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FORM MODAL: THÊM / CHỈNH SỬA GAME CHUẨN BỊ RA MẮT             */}
      {/* ============================================================== */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGame(null);
        }}
        title={editingGame?.id ? 'Chỉnh Sửa Game Sắp Ra Mắt' : 'Thêm Game Chuẩn Bị Ra Mắt Mới'}
        subtitle="Cập nhật lịch mở server, NPH, thứ tự hiển thị và gom giftcode tân thủ dự kiến."
        maxWidth="2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tên game */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Tên Game <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={editingGame?.name || ''}
                onChange={(e) => setEditingGame((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ví dụ: Strinova VN"
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Slug (Đường dẫn tĩnh)</label>
              <input
                type="text"
                value={editingGame?.slug || ''}
                onChange={(e) => setEditingGame((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="Tự động sinh nếu để trống"
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Nhà phát hành */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nhà Phát Hành (NPH)</label>
              <input
                type="text"
                value={editingGame?.publisher || ''}
                onChange={(e) => setEditingGame((prev) => ({ ...prev, publisher: e.target.value }))}
                placeholder="Ví dụ: VNG, VPlay, SohaGame, Funtap..."
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Thời gian mở server */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Ngày Giờ Mở Server <span className="text-slate-400 font-normal">(để trống nếu chưa rõ ngày)</span>
              </label>
              <input
                type="datetime-local"
                value={editingGame?.releaseDate ? editingGame.releaseDate.slice(0, 16) : ''}
                onChange={(e) => setEditingGame((prev) => ({ ...prev, releaseDate: e.target.value }))}
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Thể loại */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Thể Loại Game</label>
              <input
                type="text"
                value={editingGame?.category || ''}
                onChange={(e) => setEditingGame((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Nhập Vai, Bắn Súng, Tiên Hiệp, Chiến Thuật..."
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Nền tảng */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Nền Tảng Hỗ Trợ</label>
              <input
                type="text"
                value={editingGame?.platform || ''}
                onChange={(e) => setEditingGame((prev) => ({ ...prev, platform: e.target.value }))}
                placeholder="Android, iOS, PC"
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Icon & Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Logo / Icon Game</label>
              <ImageUploadInput
                value={editingGame?.iconUrl || ''}
                onChange={(url) => setEditingGame((prev) => ({ ...prev, iconUrl: url }))}
                placeholder="Đường dẫn ảnh hoặc tải lên..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Link Đăng Ký Trước / Tải Trước</label>
              <input
                type="url"
                value={editingGame?.preRegUrl || ''}
                onChange={(e) => setEditingGame((prev) => ({ ...prev, preRegUrl: e.target.value }))}
                placeholder="https://game.vn hoặc link TapTap, Google Play..."
                className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Expected Codes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Danh Sách Giftcode Tân Thủ Dự Kiến</span>
              <span className="text-[10px] text-slate-400">Cách nhau bằng dấu phẩy hoặc xuống dòng</span>
            </label>
            <textarea
              rows={2}
              value={expectedCodesInput}
              onChange={(e) => setExpectedCodesInput(e.target.value)}
              placeholder="Ví dụ: STRINOVAOB, VIP666, TANTHU2026"
              className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Mô Tả & Điểm Nổi Bật</label>
            <textarea
              rows={2}
              value={editingGame?.description || ''}
              onChange={(e) => setEditingGame((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Giới thiệu tóm tắt tính năng, cốt truyện, điểm nhấn của tựa game..."
              className="w-full bg-slate-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Phân loại danh sách */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-border">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Danh Sách Phân Loại & Trạng Thái Web
            </label>
            <select
              value={editingGame?.status || 'UPCOMING'}
              onChange={(e) => setEditingGame((prev) => ({ ...prev, status: e.target.value as any }))}
              className="w-full bg-slate-950 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="UPCOMING">🌐 Đưa Lên Web Ngay (Đã duyệt - Top 6 Banner hoặc Xem Thêm)</option>
              <option value="PENDING">⏳ Cho Vào Hàng Chờ Duyệt (Chưa hiện lên web khách)</option>
              <option value="LAUNCHED">🟢 Đã Mở Server (Đã phát hành)</option>
              <option value="CANCELLED">⚪ Tạm Hoãn / Hủy Lịch</option>
            </select>
          </div>

          {/* Cài Đặt Thứ Tự Hiển Thị & Số Người Canh (Sinh Ngẫu Nhiên + Khoảng Dao Động + Tăng Trưởng) */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-cyan-500/20 space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Cài Đặt Thứ Tự Hiển Thị & Người Canh
                </span>
              </div>
              <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                Sinh Ngẫu Nhiên & Tăng Trưởng Realtime
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CARD 1: THỨ TỰ HIỂN THỊ (DISPLAY ORDER) */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thứ Tự Hiển Thị (Display Order)</span>
                  </span>
                  <span className="text-[10px] text-amber-300 font-medium">1..6 = Banner Top</span>
                </div>

                {/* Current Value + Random Button */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Giá trị hiện tại</label>
                    <input
                      type="number"
                      step="any"
                      min={0.1}
                      max={999}
                      value={editingGame?.displayOrder ?? 1}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingGame((prev) => ({
                          ...prev,
                          displayOrder: val === '' ? ('' as any) : val,
                        }));
                      }}
                      onBlur={(e) => {
                        const parsed = parseFloat(e.target.value);
                        setEditingGame((prev) => ({
                          ...prev,
                          displayOrder: isNaN(parsed) ? 1 : Math.max(0.1, Number(parsed.toFixed(2))),
                        }));
                      }}
                      placeholder="VD: 1 hoặc 1.5, 2.5..."
                      className="w-full bg-slate-950 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const min = Number(editingGame?.orderMinRange) || 1;
                      const max = Number(editingGame?.orderMaxRange) || 20;
                      const step = (min % 1 !== 0 || max % 1 !== 0) ? 0.5 : 1;
                      const rand = generateRandomInRange(min, max, step);
                      setEditingGame((prev) => ({ ...prev, displayOrder: rand }));
                      onShowToast('Đã sinh số ngẫu nhiên', `Thứ tự hiển thị: #${rand}`, 'info');
                    }}
                    className="self-end px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    title="Sinh ngẫu nhiên số thứ tự trong khoảng dao động"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Sinh Random</span>
                  </button>
                </div>

                {/* Khoảng Dao Động Cài Đặt (Min - Max) */}
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-border/50 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Khoảng Dao Động Cài Đặt</span>
                    <span className="text-slate-400 font-mono">[{editingGame?.orderMinRange ?? 1} - {editingGame?.orderMaxRange ?? 20}]</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 block">Min</span>
                      <input
                        type="number"
                        step="any"
                        min={0.1}
                        value={editingGame?.orderMinRange ?? 1}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingGame((prev) => ({
                            ...prev,
                            orderMinRange: val === '' ? ('' as any) : val,
                          }));
                        }}
                        onBlur={(e) => {
                          const parsed = parseFloat(e.target.value);
                          setEditingGame((prev) => ({
                            ...prev,
                            orderMinRange: isNaN(parsed) ? 1 : Math.max(0.1, Number(parsed.toFixed(2))),
                          }));
                        }}
                        className="w-full bg-slate-900 border border-border rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Max</span>
                      <input
                        type="number"
                        step="any"
                        min={0.1}
                        value={editingGame?.orderMaxRange ?? 20}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingGame((prev) => ({
                            ...prev,
                            orderMaxRange: val === '' ? ('' as any) : val,
                          }));
                        }}
                        onBlur={(e) => {
                          const parsed = parseFloat(e.target.value);
                          setEditingGame((prev) => ({
                            ...prev,
                            orderMaxRange: isNaN(parsed) ? 20 : Math.max(0.1, Number(parsed.toFixed(2))),
                          }));
                        }}
                        className="w-full bg-slate-900 border border-border rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Tăng Trưởng Theo Thời Gian */}
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-border/50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingGame?.orderGrowthEnabled}
                      onChange={(e) => setEditingGame((prev) => ({
                        ...prev,
                        orderGrowthEnabled: e.target.checked,
                        growthAnchorTime: prev?.growthAnchorTime || new Date().toISOString(),
                      }))}
                      className="rounded border-border bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-200">
                      Tự Động Tăng Trưởng Thứ Tự Theo Ngày
                    </span>
                  </label>

                  {editingGame?.orderGrowthEnabled && (
                    <div className="space-y-2 pt-1 border-t border-border/40 text-[10px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">Tốc độ thay đổi / ngày:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            value={editingGame?.orderGrowthRate ?? 0}
                            onChange={(e) => setEditingGame((prev) => ({ ...prev, orderGrowthRate: parseFloat(e.target.value) || 0 }))}
                            className="w-16 bg-slate-900 border border-border rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-slate-400">/ ngày</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-cyan-300 bg-cyan-950/40 p-1.5 rounded border border-cyan-500/20 flex items-center justify-between">
                        <span>Thứ tự hiệu dụng hiện tại:</span>
                        <strong className="text-white font-mono font-bold">
                          #{calculateEffectiveOrder(editingGame as any)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: SỐ NGƯỜI CANH (SUBSCRIBERS COUNT) */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Số Người Canh (Subscribers)</span>
                  </span>
                  <span className="text-[10px] text-cyan-300 font-medium">Hiện trên Thẻ Web</span>
                </div>

                {/* Current Value + Random Button */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Giá trị hiện tại</label>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={editingGame?.subscribersCount ?? 1200}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingGame((prev) => ({
                          ...prev,
                          subscribersCount: val === '' ? ('' as any) : val,
                        }));
                      }}
                      onBlur={(e) => {
                        const parsed = parseFloat(e.target.value);
                        setEditingGame((prev) => ({
                          ...prev,
                          subscribersCount: isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed)),
                        }));
                      }}
                      placeholder="VD: 2843 (số lẻ tùy ý)"
                      className="w-full bg-slate-950 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const min = Number(editingGame?.subscribersMinRange) || 500;
                      const max = Number(editingGame?.subscribersMaxRange) || 3500;
                      const rand = generateRandomInRange(min, max, 1);
                      setEditingGame((prev) => ({ ...prev, subscribersCount: rand }));
                      onShowToast('Đã sinh số ngẫu nhiên', `Số người canh: ${rand.toLocaleString('vi-VN')} người`, 'info');
                    }}
                    className="self-end px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    title="Sinh ngẫu nhiên số người canh trong khoảng dao động"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Sinh Random</span>
                  </button>
                </div>

                {/* Khoảng Dao Động Cài Đặt (Min - Max) */}
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-border/50 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Khoảng Dao Động Cài Đặt</span>
                    <span className="text-slate-400 font-mono">[{editingGame?.subscribersMinRange ?? 500} - {editingGame?.subscribersMaxRange ?? 3500}]</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 block">Min</span>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={editingGame?.subscribersMinRange ?? 500}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingGame((prev) => ({
                            ...prev,
                            subscribersMinRange: val === '' ? ('' as any) : val,
                          }));
                        }}
                        onBlur={(e) => {
                          const parsed = parseFloat(e.target.value);
                          setEditingGame((prev) => ({
                            ...prev,
                            subscribersMinRange: isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed)),
                          }));
                        }}
                        className="w-full bg-slate-900 border border-border rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Max</span>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={editingGame?.subscribersMaxRange ?? 3500}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingGame((prev) => ({
                            ...prev,
                            subscribersMaxRange: val === '' ? ('' as any) : val,
                          }));
                        }}
                        onBlur={(e) => {
                          const parsed = parseFloat(e.target.value);
                          setEditingGame((prev) => ({
                            ...prev,
                            subscribersMaxRange: isNaN(parsed) ? 3500 : Math.max(0, Math.round(parsed)),
                          }));
                        }}
                        className="w-full bg-slate-900 border border-border rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Tăng Trưởng Người Canh Theo Thời Gian */}
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-border/50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingGame?.subscribersGrowthEnabled}
                      onChange={(e) => setEditingGame((prev) => ({
                        ...prev,
                        subscribersGrowthEnabled: e.target.checked,
                        growthAnchorTime: prev?.growthAnchorTime || new Date().toISOString(),
                      }))}
                      className="rounded border-border bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-200">
                      Tự Động Tăng Người Canh Theo Giờ
                    </span>
                  </label>

                  {editingGame?.subscribersGrowthEnabled && (
                    <div className="space-y-2 pt-1 border-t border-border/40 text-[10px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">Tốc độ tăng mỗi giờ:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={editingGame?.subscribersGrowthRatePerHour ?? 5}
                            onChange={(e) => setEditingGame((prev) => ({ ...prev, subscribersGrowthRatePerHour: Math.max(0, parseFloat(e.target.value) || 0) }))}
                            className="w-16 bg-slate-900 border border-border rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-slate-400">người / giờ</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-cyan-300 bg-cyan-950/40 p-1.5 rounded border border-cyan-500/20 flex items-center justify-between">
                        <span>Số người canh hiệu dụng hiện tại:</span>
                        <strong className="text-white font-mono font-bold">
                          {calculateEffectiveSubscribers(editingGame as any).toLocaleString('vi-VN')} người
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingGame(null);
              }}
              className="px-4 py-2 rounded-xl bg-card hover:bg-card-hover border border-border text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
            >
              {editingGame?.id ? 'Lưu Thay Đổi' : 'Thêm Game Mới'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingGame(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa game sắp ra mắt"
        message={
          <span>
            Bạn có chắc chắn muốn xóa game <strong className="text-rose-400">{deletingGame?.name}</strong> khỏi danh sách chuẩn bị ra mắt?
          </span>
        }
        confirmText="Xác nhận xóa"
        variant="danger"
      />
    </div>
  );
};
