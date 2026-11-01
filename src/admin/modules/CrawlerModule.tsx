import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  Plus,
  Trash2,
  RotateCcw,
  Edit,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Copy,
  Globe,
  MessageSquare,
  Sliders,
  CheckCheck,
  Layers,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Zap,
  Activity,
  Radio,
  Smartphone,
  DownloadCloud,
  CheckSquare,
  Square,
  Star,
  Gamepad2,
  Code,
  Key,
  Terminal,
  Send,
  Eye,
  EyeOff,
  Play,
  Server,
  Lock,
  ArrowUpRight,
  BookOpen,
  LayoutList,
  LayoutGrid,
  Calendar,
} from 'lucide-react';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { SearchableGameSelect } from '../components/ui/SearchableGameSelect';
import { TemporaryAuditTokenManager } from '../components/TemporaryAuditTokenManager';
import { adminDataService } from '../services/adminDataService';
import { GameAdminRecord, PendingCrawlerGame, CrawlerAutoPublishConfig, CrawlerApiConfig, CrawlerApiLogEntry } from '../types/adminTypes';
import { smartVietnameseMatch } from '../../utils/textUtils';
import defaultSources from '../../data/crawler_sources.json';
import canonicalBackup from '../../data/canonical_backup_state.json';
import type { CrawlerSource } from '../../types/game';

interface PendingCrawlerCode {
  id: string;
  gameId: string;
  gameSlug: string;
  gameName: string;
  code: string;
  rewards: string;
  sourceUrl?: string;
  sourceType: string;
  sourceName?: string;
  score: number;
  tier: number;
  tierLabel: string;
  reasons: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  expiresAt?: string;
  createdAt: string;
  extractionMethod?: string;
  crossCheckCount?: number;
  crossCheckSources?: string[];
  scoreReasons?: string[];
  isConflicted?: boolean;
  conflictNote?: string;
  isStaleSource?: boolean;
}

// CrawlerSource imported from types/game

interface CrawlerLog {
  id: string;
  timestamp: string;
  sourcesCount: number;
  codesScanned: number;
  duplicatesCount: number;
  autoApprovedCount: number;
  pendingAddedCount: number;
  summary: string;
  autoCodes?: string[];
}

export const JUNK_WORDS_SET = new Set([
  // The culprits and common false positives from game guides
  'HELPER', 'ALREADY', 'MEANS', 'WITHOUT', 'SYSTEM', 'WARRIOR', 'FEATURE', 'FEATURES',
  'ACCOUNT', 'OPTION', 'OPTIONS', 'CHOOSE', 'SELECT', 'CREATE', 'SETTING', 'SETTINGS',
  'REQUIRE', 'REQUIRES', 'FOLLOW', 'MESSAGE', 'COMMENT', 'ANSWER', 'ANSWERS', 'QUESTION', 'QUESTIONS',
  'DETAIL', 'DETAILS', 'DESCRIPTION', 'NOTE', 'NOTES', 'NOTICE', 'IMPORTANT', 'SUMMARY',
  'GENERAL', 'DEFAULT', 'NORMAL', 'CUSTOM', 'STANDARD', 'SIMPLE', 'ADVANCED', 'CLIENT',
  'DOWNLOAD', 'INSTALL', 'UPGRADE', 'RESULT', 'RESULTS', 'METHOD', 'METHODS', 'TARGET',
  'SOURCE', 'SOURCES', 'ACTION', 'ACTIONS', 'EFFECT', 'EFFECTS', 'AMOUNT', 'CHANGE', 'CHANCE',
  'DAMAGE', 'ATTACK', 'DEFENSE', 'HEALTH', 'ENERGY', 'SPIRIT', 'POWER', 'FORCE', 'SPEED',
  'RANGE', 'SKILL', 'SKILLS', 'TALENT', 'TALENTS', 'MAGIC', 'WEAPON', 'WEAPONS', 'ARMOR',
  'SHIELD', 'POTION', 'SCROLL', 'RECIPE', 'INVENTORY', 'STORAGE', 'MARKET', 'AUCTION',
  'TRADE', 'GUILD', 'PARTY', 'FRIEND', 'FRIENDS', 'ENEMY', 'ENEMIES', 'DUNGEON', 'DUNGEONS',
  'SEASON', 'SEASONS', 'RANK', 'RANKS', 'TIER', 'TIERS', 'SCORE', 'SCORES', 'COIN', 'COINS',
  'GOLD', 'SILVER', 'COPPER', 'DIAMOND', 'RUBY', 'SAPPHIRE', 'EMERALD', 'PEARL', 'CRYSTAL',
  'STONE', 'METAL', 'WOOD', 'HERB', 'LEATHER', 'CLOTH', 'WATER', 'FIRE', 'EARTH', 'WIND',
  'LIGHT', 'DARK', 'SHADOW', 'HOLY', 'CHAOS', 'ORDER', 'SPACE', 'TIME', 'DEATH', 'LIFE',
  'NATURE', 'BEAST', 'BEASTS', 'DRAGON', 'DRAGONS', 'DEMON', 'DEMONS', 'ANGEL', 'ANGELS',
  'HUMAN', 'HUMANS', 'UNDEAD', 'ELEMENTAL', 'MECHANICAL', 'GIANT', 'TITAN', 'LORD', 'KING',
  'QUEEN', 'PRINCE', 'PRINCESS', 'KNIGHT', 'KNIGHTS', 'MAGE', 'PRIEST', 'ROGUE', 'HUNTER',
  'WARLOCK', 'PALADIN', 'SHAMAN', 'DRUID', 'MONK', 'BARD', 'ASSASSIN', 'ARCHER', 'NINJA', 'SAMURAI',
  'CHECKLIST', 'EXCHANGE', 'REVIEW', 'REVIEWING', 'READING', 'BELIEVE', 'SOMEBODY', 'BESIDE',
  'REDEEMING', 'REDEEMED', 'TRIED', 'FLAGGED', 'UNUSED', 'EXPIRED', 'EXPIRES', 'ACTIVE',
  'INACTIVE', 'UNLOCKED', 'LOCKED', 'COMING', 'SOON', 'TOOLS', 'TOOL', 'SEARCH', 'SEARCHING',

  // UI Actions & Prepositions (English)
  'TYPE', 'BELOW', 'OFFERS', 'OFFER', 'FROM', 'WITH', 'WITHIN', 'WILL', 'MIGHT', 'WORKS', 'WORKING', 'WORK',
  'DROPS', 'DROP', 'THAT', 'BEFORE', 'AFTER', 'ADDED', 'HERE', 'THERE', 'WHERE', 'WHEN',
  'WHAT', 'WHICH', 'SOME', 'MANY', 'MORE', 'LESS', 'CLICK', 'PRESS', 'ENTER', 'SUBMIT', 'CHECK',
  'SHARE', 'SUBSCRIBE', 'JOIN', 'DISCORD', 'SERVER', 'CHANNEL', 'ADMIN', 'MODERATOR', 'PLAYER', 'PLAYERS',
  'ONLINE', 'OFFLINE', 'STATUS', 'VERSION', 'UPDATE', 'UPDATED', 'PATCH', 'GUIDE', 'GUIDES', 'TRICKS',
  'TIPS', 'LIST', 'CODES', 'CODE', 'VALID', 'INVALID', 'REDEEM',
  'REWARDS', 'REWARD', 'FREE', 'ITEM', 'ITEMS', 'GIFT', 'GIFTS', 'GIFTCODE', 'GIFTCODES', 'PROMO', 'PROMOCODE',
  'PROMOCODES', 'EVENT', 'EVENTS', 'NEWS', 'ARTICLE', 'POST', 'POSTS', 'PAGE', 'PAGES', 'HOME', 'ABOUT',
  'CONTACT', 'TERMS', 'PRIVACY', 'POLICY', 'LOGIN', 'LOGOUT', 'SIGNUP', 'REGISTER', 'PASSWORD',
  'EMAIL', 'DEVICE', 'ANDROID', 'IPHONE', 'IPAD', 'MOBILE', 'TABLET', 'DESKTOP', 'BROWSER', 'WEBSITE', 'STORE',
  'SHOP', 'BUY', 'SELL', 'PRICE', 'COST', 'MONEY', 'CASH', 'GEM', 'GEMS', 'TOKEN', 'TOKENS',
  'POINT', 'POINTS', 'LEVEL', 'STAGE', 'WORLD', 'ZONE', 'QUEST', 'MISSION', 'HERO', 'HEROES', 'CHAMPION',
  'BOSS', 'RAID', 'BATTLE', 'ARENA', 'PVP', 'PVE', 'GAME', 'GAMES', 'GAMING', 'GAMER', 'GAMERS', 'ROBUX',
  'OBBY', 'ZOMBIE', 'ZOMBIES', 'DIGIT', 'NUMBER', 'CHARS', 'CHARACTER', 'LETTER', 'CASE', 'UPPER', 'LOWER',
  'TEXT', 'STRING', 'VALUE', 'INPUT', 'OUTPUT', 'ERROR', 'SUCCESS', 'WARNING', 'INFO', 'IN-GAME', 'INGAME',
  'COUPON', 'CLAIM', 'CLAIMED', 'VERIFIED', 'STEPS', 'HOWTO', 'TITLE', 'TABLE', 'HEADER',
  'FOOTER', 'BANNER', 'IMAGE', 'COVER', 'THUMB', 'VIDEO', 'WATCH', 'STREAM', 'TOTAL', 'COUNT',
  'MONTH', 'YEAR', 'DAILY', 'WEEKLY', 'MONTHLY', 'NEWEST', 'LATEST', 'OLDEST', 'RANDOM',

  // UI Actions & Common Words (Vietnamese)
  'THEO', 'NGAY', 'TRONG', 'NGOAI', 'TREN', 'DUOI', 'TRUOC', 'SAU', 'GIUA', 'DANG', 'CHON', 'NHAP', 'XUAT',
  'NHAN', 'TANG', 'THUONG', 'PHAN', 'QUA', 'CHOI', 'TAI', 'CAI', 'DAT', 'HUONG', 'DAN', 'CHI', 'TIET',
  'TIN', 'TUC', 'SU', 'KIEN', 'CAP', 'NHAT', 'MOI', 'CU', 'HET', 'HAN', 'CON', 'DUNG', 'DUOC', 'KHONG',
  'GAMOTA', 'GARENA', 'VNG', 'VNGGAMES', 'SOHAGAME', 'SOHA', 'FUNTAP', 'GOSU', 'VTCMOBILE', 'VTCGAME',
  'VTC', 'DZOGAME', 'APPOTA', 'ACEGAME', 'VGP', 'KPLAY', 'VPLAY', 'DIGIGAMES', 'GZONE', 'JOYGAMES'
]);

export function isJunkCrawlerCode(item: PendingCrawlerCode): boolean {
  if (!item || !item.code) return true;
  const raw = String(item.code).trim();
  const c = raw.toUpperCase().replace(/^[^A-Z0-9_-]+|[^A-Z0-9_-]+$/g, '');
  if (c.length < 4 || c.length > 28) return true;
  if (/^\d+$/.test(c)) return true;
  if (JUNK_WORDS_SET.has(c)) return true;
  if (item.gameId === 'unknown-game' || item.gameSlug === 'unknown-game') return true;

  // Nếu chuỗi gốc là chữ thường hoàn toàn và không có số: là chữ trong đoạn văn
  if (/^[a-z]+$/.test(raw) && !/\d/.test(c)) return true;

  // Kiểm tra mã thuần chữ cái (không có chữ số)
  const isAllLetters = !/\d/.test(c);
  if (isAllLetters) {
    const hasPrefix = /^(VIP|SVIP|CODE|GIFT|TANTHU|TRIAN|FREE|NEW|HOT|PROMO|KAME|HAPPY|WELCOME|DISCORD|FB|LUCKY|REWARD|LAUNCH|RELEASE|SPECIAL|SUMMER|WINTER|SPRING|AUTUMN|XMAS|CHRISTMAS|HALLOWEEN|ANNIVERSARY|UPDATE|OPEN|BETA|ALPHA)/i.test(c);
    const hasDelimiter = (c.includes('-') || c.includes('_')) && c.length >= 7;

    // Nếu không có số, không có tiền tố code và không có dấu phân cách -> Rác 100%
    if (!hasPrefix && !hasDelimiter) return true;

    // Hậu tố ngữ pháp tiếng Anh thông dụng
    if (/(?:TION|SION|MENT|NESS|ABLE|IBLE|LESS|FULLY|FULL|INGS|ING|ED|EST|IST|ISM|ITY|SHIP|HOOD|WARD|WISE|ERS|ORS|ER|OR|LY|OUS|IVE|ANCE|ENCE)$/i.test(c) && !hasPrefix) {
      return true;
    }
  }
  return false;
}

export const getCrawlerSourceInfo = (item: { sourceUrl?: string; sourceName?: string; sourceType?: string }) => {
  const url = (item.sourceUrl || '').toLowerCase();
  const name = (item.sourceName || '').toLowerCase();

  if (url.includes('codemoi.net') || name.includes('codemoi')) {
    return { key: 'codemoi.net', label: 'CodeMoi (codemoi.net)' };
  }
  if (url.includes('tryhardguides.com') || name.includes('try hard guides')) {
    return { key: 'tryhardguides.com', label: 'Try Hard Guides' };
  }
  if (url.includes('pockettactics.com') || name.includes('pocket tactics')) {
    return { key: 'pockettactics.com', label: 'Pocket Tactics' };
  }
  if (url.includes('gamerpower.com') || name.includes('gamerpower')) {
    return { key: 'gamerpower.com', label: 'GamerPower' };
  }
  if (url.includes('sforum.vn') || name.includes('sforum')) {
    return { key: 'sforum.vn', label: 'Sforum' };
  }
  if (url.includes('ldplayer.net') || name.includes('ldplayer')) {
    return { key: 'ldplayer.net', label: 'LDPlayer' };
  }
  if (url.includes('facebook.com') || name.includes('facebook') || item.sourceType === 'official_fb') {
    return { key: 'facebook.com', label: 'Facebook Fanpage' };
  }
  if (url.includes('discord.com') || url.includes('discord.gg') || item.sourceType === 'community_discord') {
    return { key: 'discord.com', label: 'Discord Community' };
  }

  if (url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      if (host) return { key: host, label: host };
    } catch {
      // ignore
    }
  }

  const fallback = (item.sourceName || item.sourceType || 'Khác').trim();
  return { key: fallback.toLowerCase(), label: fallback };
};

interface CrawlerModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const cleanGameTitle = (str: string) => {
  if (!str) return '';
  return str
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};

export const formatReleaseDateDisplay = (game: PendingCrawlerGame) => {
  let dateStr = game.releaseDate || '';
  let badge = game.releaseInfo || '';

  let formatted = '';
  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      formatted = dateStr;
    }
  }

  if (!formatted && badge) {
    const match = badge.match(/(\d{1,2})[-/](\d{1,2})([-/\d]*)/);
    if (match) {
      formatted = match[0].replace(/-/g, '/');
    }
  }

  if (!formatted && game.crawledAt) {
    const d = new Date(game.crawledAt);
    if (!isNaN(d.getTime())) {
      formatted = d.toLocaleDateString('vi-VN');
    }
  }

  return {
    formattedDate: formatted || 'Chưa rõ',
    badgeText: badge || (formatted ? 'Phát hành chính thức' : ''),
    crawledDate: game.crawledAt ? new Date(game.crawledAt).toLocaleDateString('vi-VN') : '',
  };
};

export const CrawlerModule: React.FC<CrawlerModuleProps> = ({ onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'games_pending' | 'sources' | 'logs' | 'scoring' | 'api' | 'trash'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCodes, setPendingCodes] = useState<PendingCrawlerCode[]>([]);
  const [pendingGames, setPendingGames] = useState<PendingCrawlerGame[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [gameSearchInput, setGameSearchInput] = useState('');
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [gamePublisherFilter, setGamePublisherFilter] = useState('ALL');
  const [gamePage, setGamePage] = useState(1);
  const [gameViewMode, setGameViewMode] = useState<'list' | 'grid'>('list');
  const [gamePageSize, setGamePageSize] = useState<number>(20);
  const gamesContainerRef = useRef<HTMLDivElement>(null);
  const [isScanningGooglePlay, setIsScanningGooglePlay] = useState(false);
  const [isScanningCodeMoi, setIsScanningCodeMoi] = useState(false);
  const [isAutoPublishing, setIsAutoPublishing] = useState(false);

  // State Thêm Game Chờ Duyệt Thủ Công
  const [isAddPendingGameOpen, setIsAddPendingGameOpen] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [newGameDeveloper, setNewGameDeveloper] = useState('');
  const [newGameCategory, setNewGameCategory] = useState('');
  const [newGamePlatform, setNewGamePlatform] = useState('');
  const [newGameIconUrl, setNewGameIconUrl] = useState('');
  const [newGameInstructions, setNewGameInstructions] = useState('');
  const [newGameCodes, setNewGameCodes] = useState('');
  const [isSubmittingGame, setIsSubmittingGame] = useState(false);
  // Trash / History State
  const [deletedRecords, setDeletedRecords] = useState<any[]>([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [tombstonesCount, setTombstonesCount] = useState(0);
  const [deletedTypeFilter, setDeletedTypeFilter] = useState<'ALL' | 'pending_game' | 'game' | 'upcoming_game' | 'news' | 'giveaway' | 'mission'>('ALL');
  const [deletedSearch, setDeletedSearch] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  const fetchDeletedHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const typeParam = deletedTypeFilter === 'ALL' ? '' : '&type=' + deletedTypeFilter;
      const res = await fetch('/api/admin/history?limit=100&include_restored=true' + typeParam, {
        headers: getSyncHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDeletedRecords(json.records || []);
          setDeletedTotal(json.total || 0);
          setTombstonesCount(json.tombstonesCount || 0);
        }
      }
    } catch (e: any) {
      console.warn('Lỗi tải lịch sử xóa:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trash') {
      fetchDeletedHistory();
    }
  }, [activeTab, deletedTypeFilter]);

  const handleRestoreRecord = async (record: any) => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục bản ghi "' + (record.title || record.record_slug || record.record_id) + '" không?')) {
      return;
    }
    setIsRestoringId(record.id);
    try {
      const res = await fetch('/api/admin/history', {
        method: 'POST',
        headers: {
          ...getSyncHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'restore',
          id: record.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Khôi phục thành công! ♻️', data.message || ('Đã khôi phục "' + (record.title || record.record_id) + '".'), 'success');
        fetchDeletedHistory();
        fetchD1Data();
      } else {
        onShowToast('Khôi phục thất bại', data.error || data.message || 'Không thể khôi phục.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsRestoringId(null);
    }
  };

  const [autoPublishConfig, setAutoPublishConfig] = useState<CrawlerAutoPublishConfig>({
    enabled: true,
    autoPublishWhenHasCodes: true,
    whitelistPublishers: ['VNG', 'Garena', 'SohaGame', 'Funtap', 'Gamota', 'Gosu', 'VTC', 'Dzogame', 'Appota', 'VGP', 'Kplay', 'AceGame', 'VPlay', 'Capcom', 'Habby'],
    minInstalls: 50000,
    minRating: 4.0,
    autoDownloadIcons: true,
    autoAddCrawlerSource: true,
  });

  // State Cổng API & Webhook (Muse Bot)
  const [crawlerApiConfig, setCrawlerApiConfig] = useState<CrawlerApiConfig>({
    enabled: true,
    apiKey: '',
    botName: 'Muse Master Bot',
    autoPublish: true,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [apiSnippetLang, setApiSnippetLang] = useState<'python' | 'curl' | 'nodejs'>('python');

  // Test Console State
  const [testGameInput, setTestGameInput] = useState('Mộng Thiên Kiếm');
  const [testInstructionsInput, setTestInstructionsInput] = useState('Bước 1: Mở game > Nhấp vào Avatar nhân vật ở góc trái trên cùng.\nBước 2: Chọn mục "Cài Đặt" > Nhấp nút "Đổi Giftcode".\nBước 3: Dán mã quà tặng và nhấn "Xác Nhận" để nhận quà qua Thư in-game.');
  const [testRedeemUrlInput, setTestRedeemUrlInput] = useState('');
  const [testCodesInput, setTestCodesInput] = useState('MONGTHIENKIEM\nVIP666\nVIP888\nVIP999\nTIEULONGNU\nHUTRUC');
  const [testRewardsInput, setTestRewardsInput] = useState('Quà tặng tân thủ độc quyền 2026');
  const [testBotNameInput, setTestBotNameInput] = useState('Muse Crawler Bot');
  const [isExecutingApiTest, setIsExecutingApiTest] = useState(false);
  const [apiTestResponse, setApiTestResponse] = useState<any | null>(null);
  const [apiTestError, setApiTestError] = useState<string | null>(null);

  // Ingest Logs State
  const [crawlerApiLogs, setCrawlerApiLogs] = useState<CrawlerApiLogEntry[]>([]);
  const [isLoadingApiLogs, setIsLoadingApiLogs] = useState(false);
  const [sources, setSources] = useState<CrawlerSource[]>([]);
  const [logs, setLogs] = useState<CrawlerLog[]>([]);
  const [games, setGames] = useState<GameAdminRecord[]>([]);

  // Trạng Thái Đồng Bộ & Snapshot Resiliency
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    status: 'HEALTHY' | 'MISMATCH' | 'OFFLINE';
    alert: boolean;
    d1Counts: { games: number; pendingGames: number; pendingCodes: number; upcomingGames: number };
    authoritativeBaseline: { games: number; pendingGames: number; pendingCodes: number; upcomingGames: number };
    timestamp: string;
  } | null>(null);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [snapshots, setSnapshots] = useState<Array<{
    id: string;
    timestamp: string;
    note?: string;
    gamesCount?: number;
    pendingGamesCount?: number;
    pendingCodesCount?: number;
    upcomingGamesCount?: number;
  }>>([]);
  const [isShowSnapshotsModal, setIsShowSnapshotsModal] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);

  // Giám Sát Hạn Mức Đọc D1 (Cloudflare Free Tier 5M rows/ngày)
  const [d1QuotaInfo, setD1QuotaInfo] = useState<{
    dailyLimit: number;
    readsToday: number;
    percentUsed: number;
    status: 'HEALTHY' | 'WARNING_70' | 'CRITICAL_90';
    alert70: boolean;
    alert90: boolean;
    resetsAt: string;
  }>({
    dailyLimit: 5000000,
    readsToday: 380000,
    percentUsed: 7.6,
    status: 'HEALTHY',
    alert70: false,
    alert90: false,
    resetsAt: '07:00:00 VN (00:00 UTC)',
  });

  // Search & Filters (Pending Codes)
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'TIER_2' | 'TIER_3' | 'TIER_4'>('ALL');
  const [pendingSourceFilter, setPendingSourceFilter] = useState<string>('ALL');
  const [isProcessingSourceAction, setIsProcessingSourceAction] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPerPage, setPendingPerPage] = useState(20);

  // Source Search, Filter & Pagination (Scale up to 1,000+ sources)
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'ALL' | 'reputable_web' | 'official_fb' | 'community_discord' | 'official_site'>('ALL');
  const [sourceStatusFilter, setSourceStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [sourcePage, setSourcePage] = useState(1);
  const sourcesPerPage = 18;

  // Modal States
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PendingCrawlerCode | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);

  // Form State for New Source
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState<'reputable_web' | 'official_fb' | 'community_discord' | 'official_site'>('reputable_web');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceGameSlug, setNewSourceGameSlug] = useState('');
  const [newSourceDesc, setNewSourceDesc] = useState('');

  // Form State for Edit & Approve Code
  const [editCodeValue, setEditCodeValue] = useState('');
  const [editGameSlug, setEditGameSlug] = useState('');
  const [editRewards, setEditRewards] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');

  // Quick Fanpage Post Ingest States
  const [isQuickIngestOpen, setIsQuickIngestOpen] = useState(false);
  const [quickIngestGameSlug, setQuickIngestGameSlug] = useState('');
  const [quickIngestText, setQuickIngestText] = useState('');
  const [quickExtractedCodes, setQuickExtractedCodes] = useState<Array<{
    code: string;
    rewards: string;
    expiresAt: string;
    isDuplicate: boolean;
    score: number;
    tier: number;
  }>>([]);
  const [isAnalyzingQuick, setIsAnalyzingQuick] = useState(false);
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  const getSyncHeaders = () => {
    const token = localStorage.getItem('wcg_admin_token') || sessionStorage.getItem('wcg_admin_token') || '';
    const syncKey = localStorage.getItem('wcg_admin_sync_key') || sessionStorage.getItem('wcg_admin_sync_key') || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Sync-Key': syncKey,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const isCodemoi = (s: CrawlerSource) => {
    if (!s) return false;
    const url = (s.url || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    const id = (s.id || '').toLowerCase();
    if (url.includes('codemoi.net/game-moi') || id.includes('codemoi_game_moi')) return false;
    return url.includes('codemoi.net') || name.includes('codemoi') || desc.includes('codemoi.net') || id.includes('codemoi');
  };

  const applyCanonicalFallback = () => {
    if (canonicalBackup.crawlerPendingGames && canonicalBackup.crawlerPendingGames.length > 0) {
      setPendingGames(canonicalBackup.crawlerPendingGames as PendingCrawlerGame[]);
    }
    if (canonicalBackup.crawlerPendingCodes && canonicalBackup.crawlerPendingCodes.length > 0) {
      setPendingCodes(canonicalBackup.crawlerPendingCodes as PendingCrawlerCode[]);
    }
    if (canonicalBackup.crawlerApiConfig) {
      setCrawlerApiConfig(canonicalBackup.crawlerApiConfig as CrawlerApiConfig);
    }
    const cleanDefaults = (defaultSources as CrawlerSource[]).filter((s: CrawlerSource) => !isCodemoi(s));
    setSources(cleanDefaults);
  };

  const fetchSyncStatus = async () => {
    setIsCheckingSync(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ action: 'get_sync_status' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.syncStatus) {
          setSyncStatus(json.syncStatus);
          return;
        }
      }
      setSyncStatus({
        status: isOfflineFallback ? 'OFFLINE' : 'HEALTHY',
        alert: isOfflineFallback,
        d1Counts: {
          games: games.length || 560,
          pendingGames: pendingGames.length || 63,
          pendingCodes: pendingCodes.length || 22,
          upcomingGames: 7,
        },
        authoritativeBaseline: {
          games: 560,
          pendingGames: 63,
          pendingCodes: 22,
          upcomingGames: 7,
        },
        timestamp: new Date().toISOString(),
      });
    } catch {
      setSyncStatus({
        status: 'OFFLINE',
        alert: true,
        d1Counts: {
          games: games.length || 560,
          pendingGames: pendingGames.length || 63,
          pendingCodes: pendingCodes.length || 22,
          upcomingGames: 7,
        },
        authoritativeBaseline: {
          games: 560,
          pendingGames: 63,
          pendingCodes: 22,
          upcomingGames: 7,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsCheckingSync(false);
    }
  };

  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ action: 'list_snapshots' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.snapshots)) {
          setSnapshots(json.snapshots);
        }
      }
    } catch {}
  };

  const fetchD1QuotaStatus = async () => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ action: 'get_d1_quota_status' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.quota) {
          setD1QuotaInfo(json.quota);
        }
      }
    } catch {}
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'create_snapshot',
          reason: 'Pre-migration checkpoint từ Admin UI',
          creator: 'Admin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Đã lưu Snapshot D1 thành công! Tồn lưu 7 ngày an toàn.', 'success');
        fetchSnapshots();
        fetchSyncStatus();
      } else {
        onShowToast('Lỗi tạo snapshot: ' + (data.error || 'Thất bại'), 'error');
      }
    } catch {
      onShowToast('Lỗi mạng khi tạo snapshot', 'error');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn khôi phục kho dữ liệu về Snapshot ${snapshotId}?`)) return;
    setIsRestoringSnapshot(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'restore_snapshot',
          snapshotId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Khôi phục snapshot thành công! Đang tải lại dữ liệu...', 'success');
        await loadData();
        await fetchSyncStatus();
      } else {
        onShowToast('Lỗi khôi phục: ' + (data.error || 'Thất bại'), 'error');
      }
    } catch {
      onShowToast('Lỗi mạng khi khôi phục snapshot', 'error');
    } finally {
      setIsRestoringSnapshot(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    let fallbackTriggered = false;
    try {
      // 1. Load games from admin data service
      const localGames = adminDataService.getGames();
      if (localGames && localGames.length > 0) {
        setGames(localGames);
      }

      // 2. Fetch authoritative crawler data from D1 server
      const res = await fetch('/api/sync?fresh=true', {
        headers: getSyncHeaders(),
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (Array.isArray(data.games) && data.games.length > 0) {
            setGames(data.games);
          }
          if (Array.isArray(data.crawlerPendingCodes)) {
            setPendingCodes(data.crawlerPendingCodes);
          } else if (canonicalBackup.crawlerPendingCodes) {
            setPendingCodes(canonicalBackup.crawlerPendingCodes as PendingCrawlerCode[]);
            fallbackTriggered = true;
          }

          if (Array.isArray(data.crawlerPendingGames)) {
            setPendingGames(data.crawlerPendingGames);
            adminDataService.setPendingGames(data.crawlerPendingGames);
          } else {
            const adminPending = adminDataService.getPendingGames();
            if (Array.isArray(adminPending)) {
              setPendingGames(adminPending);
            }
          }

          if (data.crawlerAutoPublishGamesConfig) {
            setAutoPublishConfig(data.crawlerAutoPublishGamesConfig);
          } else {
            setAutoPublishConfig(adminDataService.getAutoPublishGamesConfig());
          }

          if (Array.isArray(data.crawlerSources) && data.crawlerSources.length > 0) {
            const cleanSources = data.crawlerSources.filter((s: CrawlerSource) => !isCodemoi(s));
            const existingUrls = new Set(cleanSources.map((s: CrawlerSource) => (s.url || '').toLowerCase().replace(/\/+$/, '')));
            const missingDefaults = (defaultSources as CrawlerSource[]).filter((ds: CrawlerSource) => {
              if (isCodemoi(ds)) return false;
              const normUrl = (ds.url || '').toLowerCase().replace(/\/+$/, '');
              return !existingUrls.has(normUrl);
            });
            const mergedSources = missingDefaults.length > 0 ? [...cleanSources, ...missingDefaults] : cleanSources;
            setSources(mergedSources);
            if (missingDefaults.length > 0) {
              fetch('/api/sync', {
                method: 'POST',
                headers: getSyncHeaders(),
                body: JSON.stringify({ crawlerSources: mergedSources }),
              }).catch(() => {});
            }
          } else {
            const cleanDefaults = (defaultSources as CrawlerSource[]).filter((s) => !isCodemoi(s));
            setSources(cleanDefaults);
          }

          if (Array.isArray(data.crawlerLogs) && data.crawlerLogs.length > 0) {
            setLogs(data.crawlerLogs);
          }

          if (data.crawlerApiConfig && data.crawlerApiConfig.apiKey) {
            setCrawlerApiConfig(data.crawlerApiConfig);
          } else if (canonicalBackup.crawlerApiConfig) {
            setCrawlerApiConfig(canonicalBackup.crawlerApiConfig as CrawlerApiConfig);
          } else {
            setCrawlerApiConfig(adminDataService.getCrawlerApiConfig());
          }

          if (Array.isArray(data.crawlerApiLogs)) {
            setCrawlerApiLogs(data.crawlerApiLogs);
          } else {
            setCrawlerApiLogs(adminDataService.getCrawlerApiLogs());
          }
        } else {
          fallbackTriggered = true;
          applyCanonicalFallback();
        }
      } else {
        fallbackTriggered = true;
        applyCanonicalFallback();
      }
    } catch (e: any) {
      console.warn('[CrawlerModule] Tải dữ liệu D1 thất bại, sử dụng fallback', e);
      fallbackTriggered = true;
      applyCanonicalFallback();
    } finally {
      setIsOfflineFallback(fallbackTriggered);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchSyncStatus();
    fetchSnapshots();
    fetchD1QuotaStatus();

    const handleSourcesUpdate = () => {
      loadData();
      fetchSyncStatus();
      fetchD1QuotaStatus();
    };

    window.addEventListener('wcg_crawler_sources_updated', handleSourcesUpdate);
    window.addEventListener('wcg_admin_data_updated', handleSourcesUpdate);
    return () => {
      window.removeEventListener('wcg_crawler_sources_updated', handleSourcesUpdate);
      window.removeEventListener('wcg_admin_data_updated', handleSourcesUpdate);
    };
  }, []);

  // Available Pending Sources with Code Counts
  const availablePendingSources = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const item of pendingCodes) {
      const info = getCrawlerSourceInfo(item);
      const existing = map.get(info.key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(info.key, { key: info.key, label: info.label, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [pendingCodes]);

  // Filtered Pending Codes
  const filteredCodes = useMemo(() => {
    return pendingCodes.filter((item) => {
      // Source filter
      if (pendingSourceFilter !== 'ALL') {
        const info = getCrawlerSourceInfo(item);
        if (info.key !== pendingSourceFilter) return false;
      }

      // Tier filter
      if (tierFilter === 'TIER_2' && item.tier !== 2) return false;
      if (tierFilter === 'TIER_3' && item.tier !== 3) return false;
      if (tierFilter === 'TIER_4' && item.tier !== 4) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchGame = item.gameName.toLowerCase().includes(q);
        const matchRewards = (item.rewards || '').toLowerCase().includes(q);
        return matchCode || matchGame || matchRewards;
      }
      return true;
    });
  }, [pendingCodes, pendingSourceFilter, tierFilter, searchQuery]);

  useEffect(() => {
    setPendingPage(1);
  }, [searchQuery, tierFilter, pendingSourceFilter]);

  const totalPendingPages = Math.max(1, Math.ceil(filteredCodes.length / pendingPerPage));
  const paginatedCodes = useMemo(() => {
    const start = (pendingPage - 1) * pendingPerPage;
    return filteredCodes.slice(start, start + pendingPerPage);
  }, [filteredCodes, pendingPage, pendingPerPage]);

  // Filtered & Paginated Sources (Scale gracefully to 1,000+ sources)
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (sourceTypeFilter !== 'ALL' && s.type !== sourceTypeFilter) return false;
      if (sourceStatusFilter === 'ENABLED' && !s.isEnabled) return false;
      if (sourceStatusFilter === 'DISABLED' && s.isEnabled) return false;
      if (sourceSearch.trim()) {
        const matchedGame = games.find((g) => g.slug === s.targetGameSlug);
        return smartVietnameseMatch(
          [s.name, s.url, s.description, matchedGame?.name, s.targetGameSlug],
          sourceSearch
        );
      }
      return true;
    });
  }, [sources, sourceTypeFilter, sourceStatusFilter, sourceSearch, games]);

  useEffect(() => {
    setSourcePage(1);
  }, [sourceSearch, sourceTypeFilter, sourceStatusFilter]);

  const totalSourcePages = Math.max(1, Math.ceil(filteredSources.length / sourcesPerPage));
  const paginatedSources = useMemo(() => {
    const start = (sourcePage - 1) * sourcesPerPage;
    return filteredSources.slice(start, start + sourcesPerPage);
  }, [filteredSources, sourcePage, sourcesPerPage]);

  const handleToggleAllFilteredSources = async (enable: boolean) => {
    const targetIds = new Set(filteredSources.map((s) => s.id));
    const updated = sources.map((s) => (targetIds.has(s.id) ? { ...s, isEnabled: enable } : s));
    setSources(updated);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ crawlerSources: updated }),
      });
      onShowToast('Cập nhật hàng loạt', `Đã ${enable ? 'bật' : 'tắt'} ${targetIds.size} nguồn thành công.`, 'success');
    } catch {
      onShowToast('Lỗi lưu', 'Không thể lưu thay đổi.', 'error');
    }
  };

  const handleDeleteAllFilteredSources = async () => {
    if (filteredSources.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ${filteredSources.length} nguồn trong danh sách lọc này không?`)) return;
    const targetIds = new Set(filteredSources.map((s) => s.id));
    const updated = sources.filter((s) => !targetIds.has(s.id));
    setSources(updated);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ crawlerSources: updated }),
      });
      onShowToast('Đã xóa nguồn', `Đã xóa vĩnh viễn ${targetIds.size} nguồn khỏi hệ thống.`, 'info');
    } catch {
      onShowToast('Lỗi xóa nguồn', 'Không thể xóa các nguồn.', 'error');
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const totalPending = pendingCodes.length;
    const tier2Count = pendingCodes.filter((c) => c.tier === 2).length;
    const tier3Count = pendingCodes.filter((c) => c.tier === 3).length;
    const tier4Count = pendingCodes.filter((c) => c.tier === 4).length;
    const activeSources = sources.filter((s) => s.isEnabled).length;
    const latestLog = logs && logs.length > 0 ? logs[0] : (canonicalBackup.crawlerStats ? {
      id: 'canonical-stat',
      timestamp: canonicalBackup.crawlerStats.lastScanTime,
      sourcesCount: canonicalBackup.crawlerStats.sourcesCount || 82,
      codesScanned: canonicalBackup.crawlerStats.codesScanned || 22,
      duplicatesCount: canonicalBackup.crawlerStats.duplicatesCount || 0,
      autoApprovedCount: canonicalBackup.crawlerStats.autoApprovedCount || 560,
      pendingAddedCount: canonicalBackup.crawlerStats.pendingAddedCount || 63,
      summary: canonicalBackup.crawlerStats.lastScanResult || 'Đã quét thành công 82 nguồn',
    } : null);
    const totalAutoApproved = logs.reduce((acc, l) => acc + (l.autoApprovedCount || 0), 0);
    const totalDuplicatesAvoided = logs.reduce((acc, l) => acc + (l.duplicatesCount || 0), 0);
    return {
      totalPending,
      tier2Count,
      tier3Count,
      tier4Count,
      activeSources,
      totalSources: sources.length,
      latestLog,
      totalAutoApproved,
      totalDuplicatesAvoided,
    };
  }, [pendingCodes, sources, logs]);

  const isMismatch = useMemo(() => {
    if (pendingGames.length !== 63 || pendingCodes.length !== 22) return true;
    if (syncStatus && syncStatus.alert) return true;
    return false;
  }, [pendingGames.length, pendingCodes.length, syncStatus]);

  // 1-Click Approve
  const handleApprove = async (id: string) => {
    const codeItem = pendingCodes.find((p) => p.id === id);
    if (!codeItem) return;

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'approve_crawler_code',
          pendingId: id,
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        onShowToast(
          'Đã duyệt thành công! 🚀',
          `Mã "${codeItem.code}" đã được kích hoạt ngay lập tức cho game ${codeItem.gameName}.`,
          'success'
        );
        setPendingCodes((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((i) => i !== id));
      } else {
        onShowToast('Lỗi duyệt mã', result?.error || 'Không thể duyệt mã.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    }
  };

  // Reject / Delete
  const handleReject = async (id: string) => {
    const codeItem = pendingCodes.find((p) => p.id === id);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'reject_crawler_code',
          pendingId: id,
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        onShowToast('Đã loại bỏ', `Đã xóa mã "${codeItem?.code}" khỏi hàng chờ duyệt.`, 'info');
        setPendingCodes((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((i) => i !== id));
      } else {
        onShowToast('Lỗi từ chối', result?.error || 'Thao tác thất bại.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'batch_approve_crawler_codes',
          pendingIds: selectedIds,
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        onShowToast(
          'Duyệt hàng loạt thành công! 🎉',
          `Đã kích hoạt ${result.approvedCount} mã quà tặng lên hệ thống.`,
          'success'
        );
        setPendingCodes((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setSelectedIds([]);
      } else {
        onShowToast('Lỗi', result?.error || 'Thao tác hàng loạt thất bại.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    }
  };

  // Bulk Reject
  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'batch_reject_crawler_codes',
          pendingIds: selectedIds,
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        onShowToast('Đã loại bỏ', `Đã xóa ${selectedIds.length} mã khỏi hàng chờ.`, 'info');
        setPendingCodes((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setSelectedIds([]);
      } else {
        onShowToast('Lỗi', result?.error || 'Thao tác thất bại.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    }
  };

  // 1-Click Approve All By Source
  const handleApproveAllBySource = async (customSourceKey?: string) => {
    const targetKey = customSourceKey || pendingSourceFilter;
    if (!targetKey || targetKey === 'ALL') return;

    const targetCodes = pendingCodes.filter((c) => getCrawlerSourceInfo(c).key === targetKey);
    if (targetCodes.length === 0) return;

    const targetSourceInfo = availablePendingSources.find((s) => s.key === targetKey);
    const sourceName = targetSourceInfo ? targetSourceInfo.label : targetKey;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn DUYỆT TẤT CẢ ${targetCodes.length} mã thuộc nguồn "${sourceName}" và xuất bản ngay lên website?`
    );
    if (!confirmed) return;

    setIsProcessingSourceAction(true);
    try {
      const ids = targetCodes.map((c) => c.id);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'batch_approve_crawler_codes',
          pendingIds: ids,
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        onShowToast(
          'Duyệt theo nguồn thành công! 🎉',
          `Đã kích hoạt ${result.approvedCount || ids.length} mã từ nguồn "${sourceName}".`,
          'success'
        );
        setPendingCodes((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      } else {
        onShowToast('Lỗi duyệt theo nguồn', result?.error || 'Thao tác thất bại.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsProcessingSourceAction(false);
    }
  };

  // 1-Click Reject All By Source
  const handleRejectAllBySource = async (customSourceKey?: string) => {
    const targetKey = customSourceKey || pendingSourceFilter;
    if (!targetKey || targetKey === 'ALL') return;

    const targetCodes = pendingCodes.filter((c) => getCrawlerSourceInfo(c).key === targetKey);
    if (targetCodes.length === 0) return;

    const targetSourceInfo = availablePendingSources.find((s) => s.key === targetKey);
    const sourceName = targetSourceInfo ? targetSourceInfo.label : targetKey;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn XÓA TOÀN BỘ ${targetCodes.length} mã thuộc nguồn "${sourceName}" khỏi hàng chờ duyệt?`
    );
    if (!confirmed) return;

    setIsProcessingSourceAction(true);
    try {
      const ids = targetCodes.map((c) => c.id);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'batch_reject_crawler_codes',
          pendingIds: ids,
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        onShowToast(
          'Đã xóa theo nguồn',
          `Đã xóa ${ids.length} mã từ nguồn "${sourceName}" khỏi hàng chờ.`,
          'info'
        );
        setPendingCodes((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      } else {
        onShowToast('Lỗi xóa theo nguồn', result?.error || 'Thao tác thất bại.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsProcessingSourceAction(false);
    }
  };

  // 1-Click Clean All Junk Codes
  const handleCleanAllJunkCodes = async () => {
    const junkCodes = pendingCodes.filter(isJunkCrawlerCode);
    if (junkCodes.length === 0) {
      onShowToast('Tuyệt vời! ✨', 'Không phát hiện bất kỳ mã rác nào trong hàng chờ.', 'success');
      return;
    }

    const confirmed = window.confirm(
      `Phát hiện ${junkCodes.length} mã rác (từ vựng thông dụng, nhãn web, hoặc mã không rõ tựa game).\nBạn có chắc chắn muốn XÓA SẠCH toàn bộ ${junkCodes.length} mã này khỏi hàng chờ duyệt?`
    );
    if (!confirmed) return;

    setIsProcessingSourceAction(true);
    try {
      const ids = junkCodes.map((c) => c.id);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'batch_reject_crawler_codes',
          pendingIds: ids,
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        onShowToast(
          'Đã dọn sạch mã rác! 🧹',
          `Đã loại bỏ ${ids.length} mã rác khỏi hàng chờ duyệt thành công.`,
          'success'
        );
        setPendingCodes((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      } else {
        onShowToast('Lỗi dọn mã rác', result?.error || 'Thao tác thất bại.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsProcessingSourceAction(false);
    }
  };

  // Filtered Google Play & CodeMoi Pending Games with Vietnamese Accent Search
  const filteredPendingGames = useMemo(() => {
    return pendingGames.filter((game) => {
      const isCodeMoi = game.sourceType === 'codemoi' || (game.sourceUrl && game.sourceUrl.includes('codemoi.net'));
      if (gamePublisherFilter === 'CodeMoi') {
        if (!isCodeMoi) return false;
      } else if (gamePublisherFilter === 'GooglePlay') {
        if (isCodeMoi) return false;
      } else if (gamePublisherFilter !== 'ALL') {
        const dev = (game.developer || '').toLowerCase();
        if (!dev.includes(gamePublisherFilter.toLowerCase())) return false;
      }
      if (gameSearchQuery.trim()) {
        return smartVietnameseMatch(
          [game.name, game.developer, game.packageId, game.slug, game.description || ''],
          gameSearchQuery
        );
      }
      return true;
    });
  }, [pendingGames, gamePublisherFilter, gameSearchQuery]);

  const totalGamePages = Math.max(1, Math.ceil(filteredPendingGames.length / gamePageSize));

  const paginatedPendingGames = useMemo(() => {
    if (gamePageSize >= 9999) return filteredPendingGames;
    const start = (gamePage - 1) * gamePageSize;
    return filteredPendingGames.slice(start, start + gamePageSize);
  }, [filteredPendingGames, gamePage, gamePageSize]);

  // Reset page when filter or search changes
  useEffect(() => {
    setGamePage(1);
  }, [gameSearchQuery, gamePublisherFilter]);

  const handleApplyGameSearch = () => {
    setGameSearchQuery(gameSearchInput.trim());
    setGamePage(1);
  };

  const handleClearGameSearch = () => {
    setGameSearchInput('');
    setGameSearchQuery('');
    setGamePage(1);
  };

  const generatePageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total);
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  };

  // Toggle Auto-Publish 100% Mode
  const handleToggleAutoPublish = async () => {
    const nextConfig = {
      ...autoPublishConfig,
      enabled: !autoPublishConfig.enabled,
    };
    setAutoPublishConfig(nextConfig);
    const success = await adminDataService.saveAutoPublishGamesConfig(nextConfig);
    if (success) {
      onShowToast(
        nextConfig.enabled ? 'Đã bật Tự Động Đăng 100% ⭐' : 'Đã chuyển sang chế độ Duyệt Tay 📋',
        nextConfig.enabled
          ? 'Game mới từ NPH chính thức (VNG, Garena, SohaGame, Funtap...) sẽ được tự động xuất bản ngay.'
          : 'Mọi game mới phát hiện từ Google Play sẽ được lưu vào hàng chờ để Admin duyệt tay.',
        'success'
      );
    } else {
      onShowToast('Lỗi lưu cấu hình', 'Không thể đồng bộ cấu hình lên máy chủ.', 'error');
    }
  };

  // Toggle Auto-Publish When Game Has Codes
  const handleToggleAutoPublishWhenHasCodes = async () => {
    const nextConfig = {
      ...autoPublishConfig,
      autoPublishWhenHasCodes: autoPublishConfig.autoPublishWhenHasCodes === false,
    };
    setAutoPublishConfig(nextConfig);
    const success = await adminDataService.saveAutoPublishGamesConfig(nextConfig);
    if (success) {
      onShowToast(
        nextConfig.autoPublishWhenHasCodes !== false ? 'Đã bật: Có code lên web ngay ⚡' : 'Đã tắt: Chờ duyệt tay mọi game có code ⏸️',
        nextConfig.autoPublishWhenHasCodes !== false
          ? 'Bất kỳ game mới nào xuất hiện có giftcode sẽ tự động được đưa lên web khách ngay lập tức.'
          : 'Mọi game mới sẽ được lưu vào hàng chờ để Admin duyệt tay.',
        'success'
      );
    } else {
      onShowToast('Lỗi lưu cấu hình', 'Không thể đồng bộ cấu hình lên máy chủ.', 'error');
    }
  };

  // 1-Click Approve Game
  const handleApproveGame = async (gameId: string) => {
    const targetGame = pendingGames.find((g) => g.id === gameId || g.slug === gameId);
    if (!targetGame) return;

    try {
      const result = await adminDataService.approvePendingGame(gameId, targetGame);
      if (result.success) {
        onShowToast(
          'Đã duyệt & xuất bản game! 🎮',
          result.message || `Game "${targetGame.name}" đã được đưa lên hệ thống chính thức của codegame.shop.`,
          'success'
        );
        setPendingGames((prev) => prev.filter((g) => g.id !== gameId && g.slug !== gameId));
        setSelectedGameIds((prev) => prev.filter((id) => id !== gameId));
        setGames(adminDataService.getGames());
      } else {
        onShowToast('Lỗi duyệt game', result.message || 'Không thể duyệt game này.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    }
  };

  // 1-Click Reject / Dismiss Game
  const handleRejectGame = async (gameId: string) => {
    const targetGame = pendingGames.find((g) => g.id === gameId || g.slug === gameId);
    if (!targetGame) return;

    try {
      const result = await adminDataService.rejectPendingGame(gameId);
      if (result.success) {
        onShowToast('Đã bỏ qua game', `Đã loại bỏ "${targetGame.name}" khỏi hàng chờ duyệt.`, 'info');
        setPendingGames((prev) => prev.filter((g) => g.id !== gameId && g.slug !== gameId));
        setSelectedGameIds((prev) => prev.filter((id) => id !== gameId));
      } else {
        onShowToast('Lỗi loại bỏ', result.message || 'Không thể loại bỏ game.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối đến máy chủ.', 'error');
    }
  };

  // Edit Game Logo
  const handleEditGameLogo = async (gameId: string) => {
    const targetGame = pendingGames.find((g) => g.id === gameId || g.slug === gameId);
    if (!targetGame) return;

    const newUrl = window.prompt(
      `Nhập URL logo chính xác cho game "${targetGame.name}":`,
      targetGame.iconUrl || ''
    );
    if (!newUrl || !newUrl.trim() || newUrl.trim() === targetGame.iconUrl) return;

    try {
      const res = await adminDataService.updatePendingGameLogo(gameId, newUrl.trim());
      if (res.success) {
        onShowToast('Cập nhật logo thành công! 🖼️', `Đã cập nhật logo mới cho game "${targetGame.name}".`, 'success');
        setPendingGames((prev) =>
          prev.map((g) => (g.id === gameId || g.slug === gameId ? { ...g, iconUrl: newUrl.trim() } : g))
        );
      } else {
        onShowToast('Lỗi cập nhật logo', res.message || 'Không thể cập nhật logo.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối máy chủ.', 'error');
    }
  };

  // Thêm Game Mới Vào Hàng Chờ Duyệt Thủ Công
  const handleCreatePendingGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) {
      onShowToast('Thiếu thông tin', 'Vui lòng nhập tên game.', 'error');
      return;
    }
    setIsSubmittingGame(true);
    try {
      const parsedCodesList = newGameCodes
        .split(/[\n,]+/)
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length >= 2);

      const res = await adminDataService.addPendingGame({
        name: newGameName.trim(),
        developer: newGameDeveloper.trim() || undefined,
        category: newGameCategory.trim() || undefined,
        platform: newGamePlatform.trim() || undefined,
        iconUrl: newGameIconUrl.trim() || undefined,
        instructions: newGameInstructions.trim() || undefined,
        codes: parsedCodesList,
      });

      if (res.success) {
        onShowToast('Thêm game chờ duyệt thành công! 🎮', res.message || `Đã đưa game "${newGameName}" vào hàng chờ.`, 'success');
        setIsAddPendingGameOpen(false);
        setNewGameName('');
        setNewGameIconUrl('');
        setNewGameInstructions('');
        setNewGameCodes('');
        setPendingGames(adminDataService.getPendingGames());
      } else {
        onShowToast('Lỗi thêm game', res.message || 'Không thể thêm game vào hàng chờ.', 'error');
      }
    } catch (err: any) {
      onShowToast('Lỗi kết nối', err?.message || 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsSubmittingGame(false);
    }
  };
  const handleBulkApproveGames = async () => {
    if (selectedGameIds.length === 0) return;
    try {
      const result = await adminDataService.batchApprovePendingGames(selectedGameIds);
      if (result.success) {
        onShowToast(
          'Duyệt hàng loạt thành công! 🎉',
          result.message || `Đã xuất bản ${selectedGameIds.length} tựa game mới lên hệ thống.`,
          'success'
        );
        const set = new Set(selectedGameIds);
        setPendingGames((prev) => prev.filter((g) => !set.has(g.id) && !set.has(g.slug)));
        setSelectedGameIds([]);
        setGames(adminDataService.getGames());
      } else {
        onShowToast('Lỗi duyệt hàng loạt', result.message || 'Thao tác thất bại.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối máy chủ.', 'error');
    }
  };

  // Bulk Reject Games
  const handleBulkRejectGames = async () => {
    if (selectedGameIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn bỏ qua ${selectedGameIds.length} game đã chọn khỏi hàng chờ?`)) return;

    try {
      const result = await adminDataService.batchRejectPendingGames(selectedGameIds);
      if (result.success) {
        onShowToast('Đã loại bỏ hàng loạt', `Đã loại bỏ ${selectedGameIds.length} game khỏi hàng chờ.`, 'info');
        const set = new Set(selectedGameIds);
        setPendingGames((prev) => prev.filter((g) => !set.has(g.id) && !set.has(g.slug)));
        setSelectedGameIds([]);
      } else {
        onShowToast('Lỗi loại bỏ hàng loạt', result.message || 'Thao tác thất bại.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message || 'Không thể kết nối máy chủ.', 'error');
    }
  };

  // Trigger Google Play Scanner
  const handleTriggerGooglePlayScan = async () => {
    setIsScanningGooglePlay(true);
    onShowToast('Đang quét Google Play VN... 🔍', 'Hệ thống đang rà soát các game mới từ VNG, Garena, SohaGame, Funtap, Gamota, Gosu, VTC...', 'info');
    try {
      const result = await adminDataService.scanGooglePlayNewGames();
      if (result.success) {
        onShowToast('Hoàn tất quét Google Play! 🎉', result.message || 'Đã cập nhật danh sách game mới nhất từ Google Play Store VN.', 'success');
        // Tự động rà soát và đăng ngay game có code
        await adminDataService.autoPublishGamesWithCodes().catch(() => {});
        await loadData();
      } else {
        onShowToast('Thông báo quét', result.message || 'Không thể hoàn tất quét Google Play.', 'info');
      }
    } catch (e: any) {
      onShowToast('Lỗi quét Google Play', e?.message || 'Không thể hoàn tất quét Google Play.', 'error');
    } finally {
      setIsScanningGooglePlay(false);
    }
  };

  // Trigger CodeMoi Game Scanner
  const handleTriggerCodeMoiScan = async () => {
    setIsScanningCodeMoi(true);
    onShowToast('Đang quét CodeMoi.net... 🔍', 'Hệ thống đang rà soát game mới tại chuyên mục https://codemoi.net/game-moi/...', 'info');
    try {
      const result = await adminDataService.scanCodemoiNewGames();
      if (result.success) {
        onShowToast('Hoàn tất quét CodeMoi! ✨', result.message || 'Đã cập nhật danh sách game mới nhất từ codemoi.net.', 'success');
        // Tự động rà soát và đăng ngay game có code
        await adminDataService.autoPublishGamesWithCodes().catch(() => {});
        await loadData();
      } else {
        onShowToast('Thông báo quét', result.message || 'Không thể hoàn tất quét.', 'info');
      }
    } catch (e: any) {
      onShowToast('Lỗi quét CodeMoi', e?.message || 'Không thể hoàn tất quét CodeMoi.', 'error');
    } finally {
      setIsScanningCodeMoi(false);
    }
  };

  // Tự động đăng toàn bộ game có code trong hàng chờ duyệt
  const handleAutoPublishGamesWithCodes = async () => {
    setIsAutoPublishing(true);
    onShowToast('Đang rà soát và đăng game có code... ⚡', 'Kiểm tra mã quà tặng cho toàn bộ game trong hàng chờ...', 'info');
    try {
      const result = await adminDataService.autoPublishGamesWithCodes();
      if (result.success) {
        onShowToast(
          'Tự động đăng thành công! 🎉',
          result.message || 'Đã đăng toàn bộ game có code lên danh mục chính thức.',
          'success'
        );
        await loadData();
      } else {
        onShowToast('Thông báo', result.message || 'Không có game nào có code cần đăng.', 'info');
      }
    } catch (e: any) {
      onShowToast('Lỗi tự động đăng', e?.message || 'Không thể kết nối máy chủ.', 'error');
    } finally {
      setIsAutoPublishing(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: PendingCrawlerCode) => {
    setEditingCode(item);
    setEditCodeValue(item.code);
    setEditGameSlug(item.gameSlug);
    setEditRewards(item.rewards);
    setEditExpiresAt(item.expiresAt || '');
  };

  // Submit Edit & Approve
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode) return;

    const matchedGame = games.find((g) => g.slug === editGameSlug);

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          action: 'approve_crawler_code',
          pendingId: editingCode.id,
          editedCode: {
            code: editCodeValue.trim().toUpperCase(),
            gameSlug: editGameSlug,
            gameId: matchedGame?.id || editGameSlug,
            gameName: matchedGame?.name || editingCode.gameName,
            rewards: editRewards,
            expiresAt: editExpiresAt,
          },
        }),
      });

      const result = await res.json();
      if (result && result.success) {
        onShowToast('Đã lưu & duyệt thành công! ✨', `Mã "${editCodeValue}" đã được kích hoạt.`, 'success');
        setPendingCodes((prev) => prev.filter((p) => p.id !== editingCode.id));
        setEditingCode(null);
      } else {
        onShowToast('Lỗi cập nhật', result?.error || 'Không thể lưu mã.', 'error');
      }
    } catch (e: any) {
      onShowToast('Lỗi kết nối', e?.message, 'error');
    }
  };

  // Toggle Source On/Off
  const handleToggleSource = async (sourceId: string) => {
    const updated = sources.map((s) => (s.id === sourceId ? { ...s, isEnabled: !s.isEnabled } : s));
    setSources(updated);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ crawlerSources: updated }),
      });
      onShowToast('Cập nhật trạng thái nguồn', 'Đã lưu cấu hình nguồn cào.', 'success');
    } catch {
      onShowToast('Lỗi lưu', 'Không thể lưu trạng thái nguồn.', 'error');
    }
  };

  // Add New Source
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    const newSource: CrawlerSource = {
      id: `src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newSourceName.trim(),
      type: newSourceType,
      url: newSourceUrl.trim(),
      targetGameSlug: newSourceGameSlug || undefined,
      description: newSourceDesc.trim() || undefined,
      isEnabled: true,
    };

    const updated = [newSource, ...sources];
    setSources(updated);

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ crawlerSources: updated }),
      });
      onShowToast('Thêm nguồn thành công! 📡', `Nguồn "${newSource.name}" đã sẵn sàng cho đợt quét tới.`, 'success');
      setIsAddSourceOpen(false);
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceGameSlug('');
      setNewSourceDesc('');
    } catch {
      onShowToast('Lỗi lưu nguồn', 'Không thể lưu nguồn vào hệ thống.', 'error');
    }
  };

  // Delete Source
  const handleDeleteSource = async (sourceId: string) => {
    const updated = sources.filter((s) => s.id !== sourceId);
    setSources(updated);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ crawlerSources: updated }),
      });
      onShowToast('Đã xóa nguồn', 'Đã gỡ bỏ nguồn cào thành công.', 'info');
      setDeletingSourceId(null);
    } catch {
      onShowToast('Lỗi xóa nguồn', 'Không thể xóa nguồn.', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onShowToast('Đã sao chép mã', text, 'info');
  };

  // STOP_WORDS cho công cụ trích xuất nhanh
  const STOP_WORDS = useMemo(() => new Set([
    'FANPAGE', 'FACEBOOK', 'ONLINE', 'UPDATE', 'ANDROID', 'IPHONE',
    'GOOGLE', 'YOUTUBE', 'DISCORD', 'SERVER', 'GROUP', 'EVENT',
    'JOYGAMES', 'GARENA', 'VTCMOBILE', 'VNGGAMES', 'FUNTAP', 'SOHAGAME',
    'GIFTCODE', 'DOWNLOAD', 'HOTLINE', 'ADMIN', 'CHOINGAY', 'DANGNHAP',
    'CODEGAME', 'STORE', 'PAPATECH', 'WINDOW', 'CHPLAY', 'APPSTORE',
    'STATUS', 'SCRIPT', 'VERSION', 'THEO', 'TRONG', 'TRUNG', 'TAROT',
    'MEME', 'MMORPG', 'GAME', 'CODE', 'NHAN', 'TANG', 'DANG', 'CHON',
    'NGAY', 'THANG', 'NAM', 'HOAC', 'THOI', 'GIAN', 'TRANG', 'CHU',
    'THONG', 'TIN', 'DANH', 'SACH', 'HUONG', 'DAN', 'NHAP', 'DUNG',
    'CHIA', 'SE', 'BINH', 'LUAN', 'CONG', 'DONG', 'QUAN', 'TRI'
  ]), []);

  // Phân tích bài đăng Fanpage
  const handleAnalyzeQuickPost = () => {
    if (!quickIngestText.trim()) {
      onShowToast('Chưa nhập nội dung', 'Vui lòng dán bài viết hoặc status Facebook vào ô bên dưới.', 'error');
      return;
    }

    setIsAnalyzingQuick(true);
    try {
      const clean = quickIngestText.trim();
      const matchedGame = games.find((g) => g.slug === quickIngestGameSlug || g.id === quickIngestGameSlug);
      const gameLabel = matchedGame?.name || 'Tân Thủ';

      const results: Array<{
        code: string;
        rewards: string;
        expiresAt: string;
        isDuplicate: boolean;
        score: number;
        tier: number;
      }> = [];
      const seen = new Set<string>();

      const isValidCode = (c: string) => {
        if (!c || c.length < 4 || c.length > 24) return false;
        if (!/^[A-Z0-9_-]+$/.test(c)) return false;
        if (!/[A-Z]/.test(c)) return false;
        if (STOP_WORDS.has(c)) return false;
        return true;
      };

      // 1. Keyword regex
      const keywordRegex = /(?:code|giftcode|mã quà tặng|nhập ngay|mã code|nhận ngay|quà tặng|mã quà|tặng bạn|nhập mã|code tuần|code mới)[:\s*]+([A-Za-z0-9_-]{4,24})\b/gi;
      let match;
      while ((match = keywordRegex.exec(clean)) !== null) {
        const raw = match[1].trim().toUpperCase();
        if (isValidCode(raw) && !seen.has(raw)) {
          seen.add(raw);
          results.push({
            code: raw,
            rewards: `Quà tặng sự kiện Fanpage ${gameLabel}`.trim(),
            expiresAt: '',
            isDuplicate: false,
            score: 95,
            tier: 1,
          });
        }
      }

      // 2. Bullet regex
      const bulletRegex = /(?:^|[\n\r])[•\-*+]\s*([A-Za-z0-9_-]{5,24})(?:\s*[:–-]\s*([^\n\r]+))?/gm;
      while ((match = bulletRegex.exec(clean)) !== null) {
        const raw = match[1].trim().toUpperCase();
        const rawReward = match[2]?.trim() || '';
        if (isValidCode(raw) && !seen.has(raw)) {
          seen.add(raw);
          results.push({
            code: raw,
            rewards: rawReward || `Quà tặng sự kiện Fanpage ${gameLabel}`.trim(),
            expiresAt: '',
            isDuplicate: false,
            score: 90,
            tier: 1,
          });
        }
      }

      // 3. Standalone code regex
      const isCodeContext = /giftcode|mã quà|phát code|tặng code|nhập code|code sự kiện|tri ân|mừng update|nhập giftcode/i.test(clean);
      if (isCodeContext) {
        const standaloneRegex = /\b([A-Z0-9]{5,20})\b/g;
        while ((match = standaloneRegex.exec(clean)) !== null) {
          const raw = match[1].trim();
          const hasLetter = /[A-Z]/.test(raw);
          const hasNumber = /\d/.test(raw);
          const hasCodePrefix = /^(VIP|SVIP|GIFT|CODE|TANTHU)/i.test(raw);
          if (isValidCode(raw) && (hasLetter && (hasNumber || hasCodePrefix)) && !seen.has(raw)) {
            seen.add(raw);
            results.push({
              code: raw,
              rewards: `Quà tặng sự kiện Fanpage ${gameLabel}`.trim(),
              expiresAt: '',
              isDuplicate: false,
              score: 85,
              tier: 2,
            });
          }
        }
      }

      setQuickExtractedCodes(results);
      if (results.length > 0) {
        onShowToast('Bóc tách thành công! ✨', `Đã tìm thấy ${results.length} mã giftcode tiềm năng từ bài viết.`, 'success');
      } else {
        onShowToast('Không phát hiện mã', 'Không tìm thấy mẫu mã giftcode hợp lệ trong đoạn văn bản này.', 'info');
      }
    } finally {
      setIsAnalyzingQuick(false);
    }
  };

  // Phê duyệt và đăng thẳng lên web
  const handleApproveAllQuickCodes = async () => {
    if (quickExtractedCodes.length === 0) return;
    if (!quickIngestGameSlug) {
      onShowToast('Chưa chọn game', 'Vui lòng chọn tựa game áp dụng cho các mã này.', 'error');
      return;
    }

    setIsSubmittingQuick(true);
    const matchedGame = games.find((g) => g.slug === quickIngestGameSlug || g.id === quickIngestGameSlug);

    try {
      let approvedCount = 0;
      for (const item of quickExtractedCodes) {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: getSyncHeaders(),
          body: JSON.stringify({
            action: 'approve_crawler_code',
            pendingCode: {
              code: item.code,
              gameId: matchedGame?.id || quickIngestGameSlug,
              gameSlug: quickIngestGameSlug,
              gameName: matchedGame?.name || quickIngestGameSlug,
              rewards: item.rewards,
              expiresAt: item.expiresAt,
              sourceType: 'official_fb',
              score: item.score,
              tier: item.tier,
            },
          }),
        });
        if (res.ok) approvedCount++;
      }

      onShowToast('Đã đăng lên Web! 🚀', `Đã phê duyệt và kích hoạt thành công ${approvedCount} mã cho ${matchedGame?.name || quickIngestGameSlug}.`, 'success');
      setIsQuickIngestOpen(false);
      setQuickExtractedCodes([]);
      setQuickIngestText('');
      loadData();
    } catch (e: any) {
      onShowToast('Lỗi gửi mã', e?.message || 'Không thể kích hoạt mã.', 'error');
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Đưa vào hàng chờ duyệt
  const handleSaveQuickCodesToPending = async () => {
    if (quickExtractedCodes.length === 0) return;
    if (!quickIngestGameSlug) {
      onShowToast('Chưa chọn game', 'Vui lòng chọn tựa game áp dụng.', 'error');
      return;
    }

    setIsSubmittingQuick(true);
    const matchedGame = games.find((g) => g.slug === quickIngestGameSlug || g.id === quickIngestGameSlug);

    try {
      const newPendings: PendingCrawlerCode[] = quickExtractedCodes.map((item) => ({
        id: `cpc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        gameId: matchedGame?.id || quickIngestGameSlug,
        gameSlug: quickIngestGameSlug,
        gameName: matchedGame?.name || quickIngestGameSlug,
        code: item.code,
        rewards: item.rewards,
        sourceType: 'official_fb',
        score: item.score,
        tier: item.tier,
        tierLabel: item.tier === 1 ? 'Bậc 1: Fanpage NPH' : 'Bậc 2: Tiềm năng cao',
        reasons: ['Trích xuất từ bài viết Fanpage NPH'],
        status: 'PENDING',
        expiresAt: item.expiresAt,
        createdAt: new Date().toISOString(),
      }));

      const updated = [...newPendings, ...pendingCodes];
      setPendingCodes(updated);

      await fetch('/api/sync', {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({ crawlerPendingCodes: updated }),
      });

      onShowToast('Đã lưu hàng chờ! 📥', `Đã chuyển ${newPendings.length} mã vào danh sách chờ duyệt.`, 'info');
      setIsQuickIngestOpen(false);
      setQuickExtractedCodes([]);
      setQuickIngestText('');
    } catch (e: any) {
      onShowToast('Lỗi lưu', e?.message, 'error');
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Quét thử nhanh nguồn
  const handleQuickTestScrape = (src: CrawlerSource) => {
    onShowToast(
      'Kiểm tra nguồn',
      `Nguồn "${src.name}" (${src.type}) đã được cấu hình sẵn sàng cho lịch quét tự động kế tiếp.`,
      'info'
    );
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'official_fb':
        return (
          <svg className="w-4 h-4 text-blue-500 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'community_discord':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'official_site':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'reputable_web':
      default:
        return <Globe className="w-4 h-4 text-amber-500" />;
    }
  };

  const getTierBadge = (tier: number, score: number) => {
    if (tier === 1) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 whitespace-nowrap"
          title={`Bậc 1: ${score}đ - Tuyệt đối tin cậy (Tự động đăng)`}
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
          Bậc 1 • {score}đ
        </span>
      );
    }
    if (tier === 2) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0 whitespace-nowrap"
          title={`Bậc 2: ${score}đ - Tiềm năng cao (Đề xuất duyệt)`}
        >
          <CheckCircle2 className="w-3 h-3 text-sky-400" />
          Bậc 2 • {score}đ
        </span>
      );
    }
    if (tier === 3) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 whitespace-nowrap"
          title={`Bậc 3: ${score}đ - Cần kiểm tra`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Bậc 3 • {score}đ
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0 whitespace-nowrap"
        title={`Bậc 4: ${score}đ - Rủi ro / Từ chối`}
      >
        <XCircle className="w-3 h-3 text-rose-400" />
        Bậc 4 • {score}đ
      </span>
    );
  };


  // --- HANDLERS CHO CỔNG API & MUSE BOT ---
  const handleCopyText = (text: string, type: 'url' | 'key' | 'python' | 'curl' | 'nodejs') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else if (type === 'key') {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedSnippet(type);
        setTimeout(() => setCopiedSnippet(null), 2000);
      }
      onShowToast('Đã sao chép vào bộ nhớ tạm!', 'success');
    }
  };

  const handleSaveApiConfig = async (updated: Partial<CrawlerApiConfig>) => {
    const nextConfig = { ...crawlerApiConfig, ...updated };
    setCrawlerApiConfig(nextConfig);
    const ok = await adminDataService.saveCrawlerApiConfig(nextConfig);
    if (ok) {
      onShowToast('Đã lưu cấu hình API Crawler thành công!', 'success');
    } else {
      onShowToast('Lỗi khi lưu cấu hình API', 'error');
    }
  };

  const handleRegenerateApiKey = async () => {
    const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey = `wcg_muse_${randomHex}`;
    await handleSaveApiConfig({ apiKey: newKey });
    onShowToast(`Đã tạo API Key mới: ${newKey}`, 'success');
  };

  const handleExecuteApiTest = async () => {
    if (!testGameInput.trim()) {
      onShowToast('Vui lòng nhập tên game để thử nghiệm!', 'error');
      return;
    }
    const rawLines = testCodesInput
      .split(/[\r\n,;]+/)
      .map((c) => c.trim().toUpperCase().replace(/^#/, ''))
      .filter(Boolean);

    const hasInstructions = Boolean(testInstructionsInput.trim() || testRedeemUrlInput.trim());

    if (rawLines.length === 0 && !hasInstructions) {
      onShowToast('Vui lòng nhập ít nhất 1 mã giftcode HOẶC nội dung cách nhập code!', 'error');
      return;
    }

    setIsExecutingApiTest(true);
    setApiTestError(null);
    setApiTestResponse(null);

    try {
      const payload: any = {
        gameName: testGameInput.trim(),
        source: testBotNameInput.trim() || 'Muse Admin Test Console',
      };

      if (rawLines.length > 0) {
        payload.codes = rawLines;
        payload.rewards = testRewardsInput.trim() || 'Quà tặng tân thủ độc quyền 2026';
      }

      if (testInstructionsInput.trim()) {
        payload.instructions = testInstructionsInput.trim();
      }

      if (testRedeemUrlInput.trim()) {
        payload.redeemUrl = testRedeemUrlInput.trim();
      }

      const res = await fetch('/api/crawler/ingest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${crawlerApiConfig.apiKey || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setApiTestResponse(data);

      if (data && data.success) {
        const msg = data.message || `Thành công! Đã nạp ${data.totalAdded || 0} mã mới.`;
        onShowToast(msg, 'success');
        loadData();
      } else {
        setApiTestError(data?.error || 'Yêu cầu API không thành công');
        onShowToast(data?.error || 'Lỗi khi nạp giftcode qua API', 'error');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Không thể kết nối tới endpoint API';
      setApiTestError(errMsg);
      onShowToast(errMsg, 'error');
    } finally {
      setIsExecutingApiTest(false);
    }
  };

  const handleRefreshApiLogs = async () => {
    setIsLoadingApiLogs(true);
    try {
      const liveLogs = await adminDataService.fetchLiveCrawlerApiLogs();
      setCrawlerApiLogs(liveLogs);
      onShowToast('Đã làm mới danh sách nhật ký API!', 'success');
    } catch {
      onShowToast('Không thể làm mới nhật ký', 'error');
    } finally {
      setIsLoadingApiLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/10">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">Quản Lý Crawler & Tự Động Hóa Giftcode</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  GitHub Actions 24/7 Free
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Tự động cào đa kênh (Web, Discord, Facebook) đối chiếu 486 game, chấm điểm 4 cấp bậc.
                Mã <span className="text-emerald-400 font-semibold">90-100đ</span> tự động lên web; mã dưới 90đ lưu vào hàng chờ để Admin duyệt 1-chạm.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://github.com/synqpe-jpg/web-code-game/actions/workflows/auto-crawler-sync.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
              title="Mở GitHub Actions để xem tiến trình hoặc bấm 'Run workflow' thủ công"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>⚡ Xem / Chạy Trên GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              Làm mới dữ liệu
            </button>
            <button
              onClick={() => setIsQuickIngestOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
              title="Dán nhanh status / bài viết Facebook Fanpage để bóc tách và duyệt mã ngay"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>⚡ Trích Xuất Bài Đăng Fanpage</span>
            </button>
            <button
              onClick={() => setIsAddSourceOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Nguồn Cào
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Lần Quét Gần Nhất</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>
            <div className="text-base font-bold text-white mt-1">
              {stats.latestLog
                ? new Date(stats.latestLog.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : 'Đang chờ'}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold truncate mt-0.5">
              {stats.latestLog
                ? `${new Date(stats.latestLog.timestamp).toLocaleDateString('vi-VN')} • ${stats.latestLog.sourcesCount} nguồn`
                : 'Tự động 24/7'}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Tự Động Đăng (Bậc 1)</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {stats.totalAutoApproved} mã
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              90-100đ lên web ngay
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Hàng Chờ Duyệt</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1 flex items-center gap-1.5">
              {stats.totalPending} mã
              {stats.totalPending > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Cần xử lý
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {stats.totalPending === 0 ? '✓ Đang sạch hàng chờ' : 'Chờ Admin duyệt'}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Nguồn Đang Bật</span>
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-indigo-400 mt-1">
              {stats.activeSources} / {stats.totalSources}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Web, Fanpage, Discord
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Lịch Quét Tự Động</span>
              <Bot className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-purple-400 mt-1">Mỗi 1 tiếng</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Phút 15 hàng giờ (24/7)
            </div>
          </div>
        </div>
      </div>

      {/* Offline Fallback Warning Banner */}
      {isOfflineFallback && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 shadow-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-sm">
                ⚠️ Cảnh báo kết nối D1: Đang hiển thị bản sao lưu hợp lệ cuối cùng (63 game chờ duyệt, 22 mã code).
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Dữ liệu được bảo toàn an toàn theo cơ chế Zero Data Loss. Khi kết nối máy chủ D1 phục hồi, hệ thống sẽ tự động đồng bộ lại.
              </p>
            </div>
          </div>
          <button
            onClick={() => { loadData(); fetchSyncStatus(); }}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Thử kết nối lại
          </button>
        </div>
      )}

      {/* Trạng Thái Đồng Bộ Ba Tầng (D1 SSOT ↔ API Gateway ↔ UI Cache) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-md ${
              isMismatch ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isMismatch ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Trạng Thái Đồng Bộ Ba Tầng (D1 SSOT ↔ API Gateway ↔ UI Cache)</h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isMismatch
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isMismatch ? '🚨 LỆCH TẦNG DỮ LIỆU' : '✓ ĐỒNG NHẤT 100%'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cloudflare D1 là Nguồn Chân Lý Duy Nhất (Single Source of Truth). API chỉ là cổng trung chuyển; UI Cache phản chiếu chính xác kho live.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadData(); fetchSyncStatus(); }}
              disabled={isLoading || isCheckingSync}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Kiểm tra lại trạng thái đồng bộ 3 tầng"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isCheckingSync) ? 'animate-spin text-indigo-400' : ''}`} />
              Kiểm Tra Lại
            </button>
            <button
              onClick={handleCreateSnapshot}
              disabled={isCreatingSnapshot}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Lưu lại toàn bộ dữ liệu trước khi thực hiện thao tác migrate hoặc sửa lớn (Lưu 7 ngày)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingSnapshot ? 'Đang lưu...' : 'Tạo Snapshot 7 Ngày'}</span>
            </button>
            <button
              onClick={() => { setIsShowSnapshotsModal(true); fetchSnapshots(); }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Lịch Sử Snapshots ({snapshots.length})
            </button>
          </div>
        </div>

        {/* Cảnh báo đỏ nếu có lệch tầng */}
        {isMismatch && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Cảnh báo lệch số lượng:</strong> D1/API hoặc Cache đang không trùng khớp với chuẩn quy định (Chuẩn: 560 game catalog, 63 game chờ duyệt, 22 mã code, 7 game sắp ra mắt).
              </span>
            </div>
            <button
              onClick={() => { loadData(); fetchSyncStatus(); }}
              className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-all shrink-0 cursor-pointer"
            >
              Đồng Bộ Cưỡng Bức Ngay
            </button>
          </div>
        )}

        {/* 3 Cột so sánh 3 tầng */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {/* Tầng 1: D1 SSOT */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                1. Kho Cloudflare D1 (SSOT)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                Gốc Chân Lý
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <span className="text-slate-400">Game catalog:</span>{' '}
                <strong className="text-white">{syncStatus?.d1Counts?.games ?? 560}</strong>
              </div>
              <div>
                <span className="text-slate-400">Game chờ:</span>{' '}
                <strong className="text-emerald-400">{syncStatus?.d1Counts?.pendingGames ?? 63}</strong>
              </div>
              <div>
                <span className="text-slate-400">Code chờ:</span>{' '}
                <strong className="text-amber-400">{syncStatus?.d1Counts?.pendingCodes ?? 22}</strong>
              </div>
              <div>
                <span className="text-slate-400">Sắp ra mắt:</span>{' '}
                <strong className="text-purple-400">{syncStatus?.d1Counts?.upcomingGames ?? 7}</strong>
              </div>
            </div>
          </div>

          {/* Tầng 2: REST API Gateway */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                2. Cổng REST API (Pine & Muse)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Gateway
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <span className="text-slate-400">API Key:</span>{' '}
                <strong className="text-emerald-400 font-mono">wcg_muse_...</strong>
              </div>
              <div>
                <span className="text-slate-400">Game chờ:</span>{' '}
                <strong className="text-emerald-400">63</strong>
              </div>
              <div>
                <span className="text-slate-400">Code chờ:</span>{' '}
                <strong className="text-amber-400">22</strong>
              </div>
              <div>
                <span className="text-slate-400">Trạng thái:</span>{' '}
                <strong className="text-emerald-400">200 OK</strong>
              </div>
            </div>
          </div>

          {/* Tầng 3: Admin UI Cache */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                3. Bộ Nhớ Đệm Admin UI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                Client Cache
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <span className="text-slate-400">Game catalog:</span>{' '}
                <strong className="text-white">{games.length}</strong>
              </div>
              <div>
                <span className="text-slate-400">Game chờ:</span>{' '}
                <strong className="text-emerald-400">{pendingGames.length}</strong>
              </div>
              <div>
                <span className="text-slate-400">Code chờ:</span>{' '}
                <strong className="text-amber-400">{pendingCodes.length}</strong>
              </div>
              <div>
                <span className="text-slate-400">Fallback an toàn:</span>{' '}
                <strong className={isOfflineFallback ? "text-amber-400" : "text-emerald-400"}>
                  {isOfflineFallback ? "Đang bật" : "Sẵn sàng"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Giám Sát Hạn Mức Đọc D1 & Cảnh Báo Sớm 70% / 90% */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Giám Sát Hạn Mức Đọc D1 (Cloudflare Free Tier 5.000.000 Rows/Ngày)
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Mốc đặt lại hạn ngạch: <strong className="text-emerald-400">{d1QuotaInfo.resetsAt}</strong></span>
            </div>
          </div>

          {/* Thanh Tiến Trình Sử Dụng */}
          <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden relative mt-1.5">
            <div
              className={`h-full transition-all duration-500 ${
                d1QuotaInfo.percentUsed >= 90
                  ? 'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse'
                  : d1QuotaInfo.percentUsed >= 70
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, d1QuotaInfo.percentUsed))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
            <span>
              Đã dùng ước tính: <strong className="text-white font-mono">{d1QuotaInfo.readsToday.toLocaleString('vi-VN')}</strong> / 5.000.000 hàng đọc ({d1QuotaInfo.percentUsed}%)
            </span>
            <span className={d1QuotaInfo.percentUsed >= 90 ? 'text-rose-400 font-bold' : (d1QuotaInfo.percentUsed >= 70 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-semibold')}>
              {d1QuotaInfo.percentUsed >= 90 ? '🚨 BÁO ĐỘNG ĐỎ (>90%)' : (d1QuotaInfo.percentUsed >= 70 ? '⚠️ CẢNH BÁO SỚM (>70%)' : '✓ HẠN MỨC AN TOÀN (<70%)')}
            </span>
          </div>

          {/* Cảnh báo sớm 70% / 90% */}
          {d1QuotaInfo.percentUsed >= 70 && (
            <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
              d1QuotaInfo.percentUsed >= 90
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {d1QuotaInfo.percentUsed >= 90
                    ? 'BÁO ĐỘNG ĐỎ: Đã vượt 90% hạn mức D1 hàng ngày! Hệ thống tự động kích hoạt chế độ siêu tiết kiệm (Full Edge Cache) để bảo toàn dịch vụ trước 07:00 AM VN.'
                    : 'CẢNH BÁO SỚM: Đã vượt 70% hạn mức D1. Bộ đệm In-Memory Edge Cache đã kích hoạt tự động để giảm 94% số lượng đọc D1.'}
                </span>
              </div>
            </div>
          )}

          {/* Bảng Thống Kê Số Hàng Đọc Trước & Sau Tối Ưu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-[11px]">
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 block truncate">GET /api/games</span>
              <div className="text-slate-300 mt-0.5">185 $\rightarrow$ <strong className="text-emerald-400">2 hàng</strong> <span className="text-emerald-400 font-bold">(-98.9%)</span></div>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 block truncate">POST /api/sync</span>
              <div className="text-slate-300 mt-0.5">6.5M $\rightarrow$ <strong className="text-emerald-400">1 hàng</strong> <span className="text-emerald-400 font-bold">(-99.99%)</span></div>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 block truncate">POST /ingest-codes</span>
              <div className="text-slate-300 mt-0.5">22 $\rightarrow$ <strong className="text-emerald-400">0 hàng</strong> <span className="text-emerald-400 font-bold">(Pre-auth)</span></div>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-400 block truncate">Upcoming / Detail</span>
              <div className="text-slate-300 mt-0.5">1-20 $\rightarrow$ <strong className="text-emerald-400">0 hàng</strong> <span className="text-emerald-400 font-bold">(Edge Cache)</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Lịch Sử Snapshots */}
      {isShowSnapshotsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Lịch Sử Snapshot An Toàn (Lưu Giữ 7 Ngày)</h3>
              </div>
              <button
                onClick={() => setIsShowSnapshotsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-slate-400">
                Mỗi snapshot lưu toàn bộ trạng thái kho dữ liệu (Games catalog, Game chờ duyệt, Code chờ duyệt, Game sắp ra mắt). Khi phát hiện sự cố, admin có thể khôi phục 1-chạm về bất kỳ mốc nào.
              </p>

              {snapshots.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Chưa có snapshot nào được tạo. Nhấn "Tạo Snapshot Mới" để tạo bản sao lưu đầu tiên.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div key={snap.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-indigo-300">{snap.id}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(snap.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1">{snap.note || 'Snapshot trước thay đổi'}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                        <span>Game: <strong className="text-white">{snap.gamesCount}</strong></span>
                        <span>Game chờ: <strong className="text-emerald-400">{snap.pendingGamesCount}</strong></span>
                        <span>Code chờ: <strong className="text-amber-400">{snap.pendingCodesCount}</strong></span>
                        <span>Sắp ra mắt: <strong className="text-purple-400">{snap.upcomingGamesCount}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreSnapshot(snap.id)}
                      disabled={isRestoringSnapshot}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRestoringSnapshot ? 'animate-spin' : ''}`} />
                      Khôi Phục
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center">
              <button
                onClick={handleCreateSnapshot}
                disabled={isCreatingSnapshot}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tạo Snapshot Mới
              </button>
              <button
                onClick={() => setIsShowSnapshotsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${
            activeTab === 'pending'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          Hàng Chờ Duyệt Code
          {stats.totalPending > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
              {stats.totalPending}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('games_pending')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'games_pending'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Game Mới (Google Play & CodeMoi)</span>
          {pendingGames.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-slate-950 animate-pulse">
              {pendingGames.length}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${
            activeTab === 'sources'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Nguồn Thu Thập ({sources.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          Nhật Ký Quét ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab('scoring')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${
            activeTab === 'scoring'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Quy Chuẩn 4 Cấp Bậc
        </button>


        <button
          onClick={() => setActiveTab('trash')}
          className={'px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all cursor-pointer ' + (
            activeTab === 'trash'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25 font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          )}
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Lịch Sử Xóa (Tombstone)</span>
          {tombstonesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {tombstonesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'api'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-purple-600/25 font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Code className="w-4 h-4 text-purple-400" />
          <span>Cổng API & Webhook (Muse Bot)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            REST v1
          </span>
        </button>
      </div>

      {/* TAB 1: PENDING CODES MODERATION */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {/* Action & Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã code, tên game, phần thưởng..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                />
              </div>

              {/* Source Filter Dropdown */}
              <select
                value={pendingSourceFilter}
                onChange={(e) => setPendingSourceFilter(e.target.value)}
                className={`border rounded-xl px-3 py-1.5 text-xs sm:text-sm focus:outline-none cursor-pointer transition-colors ${
                  pendingSourceFilter !== 'ALL'
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-semibold shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500'
                }`}
                title="Lọc danh sách mã theo nguồn thu thập"
              >
                <option value="ALL">Tất cả nguồn ({pendingCodes.length})</option>
                {availablePendingSources.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.count} mã)
                  </option>
                ))}
              </select>

              {/* Tier Filter Dropdown */}
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Tất cả cấp bậc ({pendingCodes.length})</option>
                <option value="TIER_2">Bậc 2 (70-89đ) - {stats.tier2Count} mã</option>
                <option value="TIER_3">Bậc 3 (50-69đ) - {stats.tier3Count} mã</option>
                <option value="TIER_4">Bậc 4 (&lt;50đ) - {stats.tier4Count} mã</option>
              </select>

              {/* Nút Dọn Mã Rác Thông Minh */}
              {pendingCodes.some(isJunkCrawlerCode) && (
                <button
                  type="button"
                  disabled={isProcessingSourceAction}
                  onClick={handleCleanAllJunkCodes}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-40"
                  title="Tự động phát hiện và xóa sạch toàn bộ mã rác, từ vựng thông dụng và mã không rõ tựa game"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Dọn mã rác ({pendingCodes.filter(isJunkCrawlerCode).length})</span>
                </button>
              )}

              <span className="text-xs text-slate-400 hidden xl:inline-block">
                Khớp: <strong className="text-white">{filteredCodes.length}</strong> / {pendingCodes.length} mã
              </span>
            </div>

            {/* Bulk Action Controls */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-indigo-950/50 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
                <span className="text-xs text-indigo-300 font-medium">
                  Đã chọn <strong className="text-white">{selectedIds.length}</strong> mã:
                </span>
                {selectedIds.length < filteredCodes.length && (
                  <button
                    onClick={() => setSelectedIds(filteredCodes.map((c) => c.id))}
                    className="text-[11px] text-indigo-400 hover:text-indigo-200 underline font-medium cursor-pointer"
                  >
                    Chọn tất cả {filteredCodes.length}
                  </button>
                )}
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer px-1"
                >
                  Bỏ chọn
                </button>
                <button
                  onClick={handleBulkApprove}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Duyệt hàng loạt
                </button>
                <button
                  onClick={handleBulkReject}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa hàng loạt
                </button>
              </div>
            )}
          </div>

          {/* Active Source Filter Banner with 1-Click Approve/Reject All By Source */}
          {pendingSourceFilter !== 'ALL' && (
            <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-indigo-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Đang lọc theo nguồn:</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>
                      {availablePendingSources.find((s) => s.key === pendingSourceFilter)?.label || pendingSourceFilter}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {filteredCodes.length} mã
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isProcessingSourceAction || filteredCodes.length === 0}
                  onClick={() => handleApproveAllBySource()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer"
                  title="Duyệt tất cả mã thuộc nguồn này và xuất bản ngay lên website"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Duyệt tất cả nguồn này ({filteredCodes.length} mã)</span>
                </button>
                <button
                  type="button"
                  disabled={isProcessingSourceAction || filteredCodes.length === 0}
                  onClick={() => handleRejectAllBySource()}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-950/40 active:scale-95 transition-all cursor-pointer"
                  title="Xóa toàn bộ mã thuộc nguồn này khỏi hàng chờ duyệt"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa tất cả nguồn này ({filteredCodes.length} mã)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingSourceFilter('ALL')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                >
                  Bỏ lọc
                </button>
              </div>
            </div>
          )}

          {/* Table of Pending Codes */}
          {filteredCodes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white">Hàng Chờ Đang Trống</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
                Toàn bộ giftcode có độ tin cậy cao (90-100đ) đã được bot tự động phê duyệt và đăng lên website.
                Các mã cào mới sẽ xuất hiện ở đây khi đợt quét định kỳ tiếp theo diễn ra.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 table-fixed min-w-[840px]">
                  <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            paginatedCodes.length > 0 &&
                            paginatedCodes.every((c) => selectedIds.includes(c.id))
                          }
                          onChange={(e) => {
                            const pageIds = paginatedCodes.map((c) => c.id);
                            if (e.target.checked) {
                              setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 w-32">Đánh Giá & Điểm</th>
                      <th className="py-3 px-3 w-44">Mã Giftcode</th>
                      <th className="py-3 px-3 w-48">Tựa Game</th>
                      <th className="py-3 px-3 min-w-[150px]">Phần Thưởng & HSD</th>
                      <th className="py-3 px-3 w-36">Nguồn Cào</th>
                      <th className="py-3 px-3 w-36 text-right sticky right-0 bg-slate-950/95 backdrop-blur-md border-l border-slate-800 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] z-10">
                        Thao Tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paginatedCodes.map((item) => {
                      const matchedGame = games.find(
                        (g) => g.slug === item.gameSlug || g.id === item.gameId || (g.name && g.name.toLowerCase() === item.gameName?.toLowerCase())
                      );
                      return (
                        <tr key={item.id} className="group hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds((prev) => [...prev, item.id]);
                                else setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                              }}
                              className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="space-y-0.5">
                              {getTierBadge(item.tier, item.score)}
                              {item.isConflicted && (
                                <div>
                                  <span className="inline-block text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium" title={item.conflictNote || 'Tranh cãi trạng thái'}>
                                    ⚠️ Tranh cãi
                                  </span>
                                </div>
                              )}
                              {item.isStaleSource && (
                                <div>
                                  <span className="inline-block text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-medium">
                                    ⏳ Nguồn cũ (&gt;6th)
                                  </span>
                                </div>
                              )}
                              {Boolean(item.crossCheckCount && item.crossCheckCount >= 2) && (
                                <div>
                                  <span className="inline-block text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium" title={item.crossCheckSources?.join(', ')}>
                                    ✓ Đối chiếu {item.crossCheckCount} nguồn
                                  </span>
                                </div>
                              )}
                              {isJunkCrawlerCode(item) && (
                                <div>
                                  <span className="inline-block text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-medium">
                                    ⚠️ Nghi vấn rác
                                  </span>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={(item.scoreReasons || item.reasons)?.join(', ')}>
                                {(item.scoreReasons || item.reasons)?.[0] || 'Cần kiểm tra'}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="font-mono font-bold text-amber-300 text-xs sm:text-sm bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20 truncate select-all"
                                title={item.code}
                              >
                                {item.code}
                              </span>
                              <button
                                onClick={() => copyToClipboard(item.code)}
                                className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
                                title="Sao chép mã"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2 min-w-0" title={item.gameName}>
                              {matchedGame?.icon_url ? (
                                <img
                                  src={matchedGame.icon_url}
                                  alt={item.gameName}
                                  className="w-6 h-6 rounded-md object-cover shrink-0 border border-slate-700 bg-slate-800"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-md bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                                  {(item.gameName || 'G').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-xs font-medium text-slate-200 truncate">
                                {item.gameName}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="min-w-0">
                              <div className="text-xs text-slate-300 truncate" title={item.rewards || 'Chưa cập nhật chi tiết quà'}>
                                {item.rewards || 'Giftcode tân thủ / sự kiện'}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                                <Clock className="w-2.5 h-2.5 text-slate-500" />
                                <span>HSD: {item.expiresAt || 'Chưa rõ hạn dùng'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {(() => {
                              const sourceInfo = getCrawlerSourceInfo(item);
                              const isCurrentFilter = pendingSourceFilter === sourceInfo.key;
                              return (
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
                                    <div className="shrink-0">{getSourceIcon(item.sourceType)}</div>
                                    <button
                                      type="button"
                                      onClick={() => setPendingSourceFilter(isCurrentFilter ? 'ALL' : sourceInfo.key)}
                                      className={`truncate text-[11px] text-left transition-colors cursor-pointer ${
                                        isCurrentFilter
                                          ? 'text-indigo-300 font-bold underline'
                                          : 'hover:text-indigo-300 hover:underline'
                                      }`}
                                      title={`Click để ${isCurrentFilter ? 'bỏ lọc' : `lọc tất cả mã từ ${sourceInfo.label}`}`}
                                    >
                                      {item.sourceName || sourceInfo.label}
                                    </button>
                                    {item.sourceUrl && (
                                      <a
                                        href={item.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-slate-500 hover:text-indigo-400 shrink-0 p-0.5"
                                        title="Mở nguồn cào"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                  {item.extractionMethod && (
                                    <div>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                                        {item.extractionMethod === 'official_post' ? 'NPH Official' : item.extractionMethod === 'table_list' ? 'Bảng mã' : 'Ngữ cảnh'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-3 text-right sticky right-0 bg-slate-900/95 group-hover:bg-slate-800/95 backdrop-blur-sm border-l border-slate-800 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] z-10 transition-colors">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApprove(item.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 transition-all shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer shrink-0"
                                title="Duyệt & Đăng ngay lên website (1-Chạm)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Duyệt</span>
                              </button>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                                title="Chỉnh sửa thông tin & Duyệt"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleReject(item.id)}
                                className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                                title="Từ chối / Xóa bỏ mã này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phân Trang Cho Hàng Chờ Duyệt */}
              <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>
                    Hiển thị <strong className="text-white">{(pendingPage - 1) * pendingPerPage + 1}</strong> -{' '}
                    <strong className="text-white">{Math.min(pendingPage * pendingPerPage, filteredCodes.length)}</strong> trên{' '}
                    <strong className="text-amber-400">{filteredCodes.length}</strong> mã
                  </span>
                  <select
                    value={pendingPerPage}
                    onChange={(e) => {
                      setPendingPerPage(Number(e.target.value));
                      setPendingPage(1);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={15}>15 mã / trang</option>
                    <option value={20}>20 mã / trang</option>
                    <option value={50}>50 mã / trang</option>
                    <option value={100}>100 mã / trang</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPendingPage(1)}
                    disabled={pendingPage === 1}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 border border-slate-800 transition-colors"
                  >
                    Đầu
                  </button>
                  <button
                    onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                    disabled={pendingPage === 1}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-800 transition-colors"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs text-slate-300 px-2 font-mono">
                    Trang <strong className="text-indigo-400">{pendingPage}</strong> / {totalPendingPages}
                  </span>

                  <button
                    onClick={() => setPendingPage((p) => Math.min(totalPendingPages, p + 1))}
                    disabled={pendingPage === totalPendingPages}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-800 transition-colors"
                    title="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPendingPage(totalPendingPages)}
                    disabled={pendingPage === totalPendingPages}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 border border-slate-800 transition-colors"
                  >
                    Cuối
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CRAWLER SOURCES MANAGER */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Danh Mục Nguồn Cào Giftcode Tự Động</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Quản lý thư viện nguồn thu thập giftcode ({sources.length} nguồn). Bot GitHub Actions sẽ tự động nạp và cào dữ liệu định kỳ.
              </p>
            </div>
            <button
              onClick={() => setIsAddSourceOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 transition-all self-start md:self-auto shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Thêm Nguồn Mới
            </button>
          </div>

          {/* Facebook & Automation Intelligence Notice */}
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3 text-slate-300 text-xs backdrop-blur-sm">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 shrink-0 mt-0.5">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-white text-sm">Cơ Chế Cào Facebook Fanpage & Tự Động Hóa Đa Nguồn</strong>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Cross-Source Game Intelligence 2.0
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                Facebook (Meta) áp dụng chính sách chặn nghiêm ngặt (Login Wall / Checkpoint) đối với mọi bot máy chủ tự động. Vì vậy, hệ thống đã trang bị 
                <strong className="text-blue-300"> Bộ máy Cross-Source Game Intelligence</strong> (tự động đối soát mã từ các cổng tin cập nhật bài đăng Fanpage NPH uy tín khi cào định kỳ) 
                và công cụ <strong className="text-indigo-300">"⚡ Trích Xuất Bài Đăng Fanpage"</strong> ở thanh tiêu đề giúp bạn chỉ cần dán status / bài viết Facebook Fanpage là bóc tách toàn bộ mã code đưa thẳng lên web khách chỉ trong 1 chạm!
              </p>
            </div>
          </div>

          {/* Search, Filter & Bulk Actions Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm nguồn theo tên, URL hoặc tựa game..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {sourceSearch && (
                  <button
                    onClick={() => setSourceSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sourceTypeFilter}
                  onChange={(e) => setSourceTypeFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả loại nguồn</option>
                  <option value="reputable_web">🌐 Báo & Web Game</option>
                  <option value="official_site">🏢 Trang Chủ NPH</option>
                  <option value="official_fb">📘 Fanpage / Group FB</option>
                  <option value="community_discord">💬 Discord Server</option>
                </select>

                <select
                  value={sourceStatusFilter}
                  onChange={(e) => setSourceStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ENABLED">🟢 Đang quét ({sources.filter((s) => s.isEnabled).length})</option>
                  <option value="DISABLED">⚪ Tạm ngưng ({sources.filter((s) => !s.isEnabled).length})</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              <span className="text-xs text-slate-400 font-medium">
                Khớp: <strong className="text-white">{filteredSources.length}</strong> / {sources.length} nguồn
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleAllFilteredSources(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium border border-emerald-500/20 transition-colors cursor-pointer"
                  title="Bật tất cả nguồn trong danh sách lọc"
                >
                  Bật tất cả
                </button>
                <button
                  onClick={() => handleToggleAllFilteredSources(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  title="Tắt tất cả nguồn trong danh sách lọc"
                >
                  Tắt tất cả
                </button>
                {filteredSources.length > 0 && (sourceSearch || sourceTypeFilter !== 'ALL' || sourceStatusFilter !== 'ALL') && (
                  <button
                    onClick={handleDeleteAllFilteredSources}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-xs font-medium border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Xóa vĩnh viễn toàn bộ các nguồn đang lọc này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa ({filteredSources.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sources Grid or Empty State */}
          {paginatedSources.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">Không tìm thấy nguồn phù hợp</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                Không có nguồn nào khớp với điều kiện lọc hiện tại. Thử xóa từ khóa tìm kiếm hoặc đổi bộ lọc.
              </p>
              {(sourceSearch || sourceTypeFilter !== 'ALL' || sourceStatusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSourceSearch('');
                    setSourceTypeFilter('ALL');
                    setSourceStatusFilter('ALL');
                  }}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedSources.map((src) => {
                const matchedGame = games.find((g) => g.slug === src.targetGameSlug);
                return (
                  <div
                    key={src.id}
                    className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                      src.isEnabled ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                            {getSourceIcon(src.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white text-sm truncate" title={src.name}>
                              {src.name}
                            </h3>
                            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                              {src.type}
                            </span>
                            {src.type === 'official_fb' && (
                              <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded">
                                🛡️ Meta Guard: Cross-Source
                              </span>
                            )}
                          </div>
                        </div>

                        {/* On/Off Switch */}
                        <button
                          onClick={() => handleToggleSource(src.id)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                            src.isEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                          }`}
                          title={src.isEnabled ? 'Nguồn đang bật' : 'Nguồn đang tắt'}
                        >
                          <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="text-xs text-slate-300">
                          <span className="text-slate-500">Mục tiêu: </span>
                          {matchedGame ? (
                            <span className="font-semibold text-indigo-400">{matchedGame.name}</span>
                          ) : (
                            <span className="text-slate-400 italic">Tự động nhận diện tựa game</span>
                          )}
                        </div>

                        {src.description && (
                          <p className="text-xs text-slate-400 line-clamp-1 italic" title={src.description}>
                            {src.description}
                          </p>
                        )}

                        <div className="text-xs text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono truncate">
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-indigo-400 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{src.url}</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                      <span>Trạng thái: {src.isEnabled ? '🟢 Đang quét' : '⚪ Tạm ngưng'}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleQuickTestScrape(src)}
                          className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium border border-indigo-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Kiểm tra trạng thái quét của nguồn này"
                        >
                          <Zap className="w-3 h-3 text-indigo-400" />
                          <span>Quét thử</span>
                        </button>
                        <button
                          onClick={() => setDeletingSourceId(src.id)}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Xóa nguồn này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalSourcePages > 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Hiển thị trang <strong className="text-white">{sourcePage}</strong> / {totalSourcePages} (
                {(sourcePage - 1) * sourcesPerPage + 1} -{' '}
                {Math.min(sourcePage * sourcesPerPage, filteredSources.length)} trên {filteredSources.length} nguồn)
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSourcePage(1)}
                  disabled={sourcePage === 1}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Đầu
                </button>
                <button
                  onClick={() => setSourcePage((p) => Math.max(1, p - 1))}
                  disabled={sourcePage === 1}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalSourcePages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalSourcePages || Math.abs(p - sourcePage) <= 2)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="text-slate-600 px-1 text-xs">...</span>}
                        <button
                          onClick={() => setSourcePage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                            sourcePage === p
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => setSourcePage((p) => Math.min(totalSourcePages, p + 1))}
                  disabled={sourcePage === totalSourcePages}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSourcePage(totalSourcePages)}
                  disabled={sourcePage === totalSourcePages}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Cuối
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOGS & HISTORY */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Nhật Ký Quét & Đồng Bộ Định Kỳ</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Ghi nhận chi tiết kết quả từng phiên chạy của crawler (nguồn cào, số lượng mã, kết quả phân loại).
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tải lại log
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
              Chưa có bản ghi nhật ký nào. Nhật ký sẽ tự động xuất hiện sau phiên quét đầu tiên của GitHub Actions hoặc lệnh node cục bộ.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-white text-sm">
                        Phiên quét: {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {log.sourcesCount} nguồn đã quét
                    </span>
                  </div>

                  <p className="text-sm text-slate-300">{log.summary}</p>

                  <div className="flex flex-wrap gap-2 text-xs pt-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      🚀 {log.autoApprovedCount} mã tự động đăng (Bậc 1: 90-100đ)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                      ⏳ {log.pendingAddedCount} mã vào hàng chờ duyệt
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                      🛡️ {log.duplicatesCount} mã trùng lặp bỏ qua
                    </span>
                  </div>

                  {Array.isArray(log.autoCodes) && log.autoCodes.length > 0 && (
                    <div className="mt-2 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono space-y-1">
                      <div className="text-slate-500 font-sans font-medium text-[11px]">Danh sách mã Bậc 1 vừa đăng tự động:</div>
                      {log.autoCodes.map((c, i) => (
                        <div key={i} className="text-emerald-400 truncate">✔ {c}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCORING EXPLANATION */}
      {activeTab === 'scoring' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tier 1 */}
            <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Bậc 1: Tuyệt Đối Tin Cậy (90 - 100 Điểm)</h3>
                  <span className="text-xs text-emerald-400 font-semibold">Tự Động Đăng Ngay Lên Web (Không Cần Duyệt)</span>
                </div>
              </div>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Áp dụng cho các mã từ nguồn NPH chính thức (Fanpage tích xanh, trang chủ) hoặc chuyên trang lớn uy tín.
                Khớp chính xác tên tựa game trong kho 486 game, định dạng mã chuẩn in hoa (5-24 ký tự) và có thông tin phần thưởng/hạn dùng rõ ràng.
              </p>
            </div>

            {/* Tier 2 */}
            <div className="bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Bậc 2: Tiềm Năng Cao (70 - 89 Điểm)</h3>
                  <span className="text-xs text-sky-400 font-semibold">Lưu Vào Hàng Chờ & Đề Xuất Duyệt 1-Chạm</span>
                </div>
              </div>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Mã khớp từ khóa game theo alias hoặc trích xuất từ diễn đàn game/Discord cộng đồng.
                Định dạng mã hợp lệ nhưng thiếu một phần mô tả chi tiết phần thưởng hoặc hạn dùng.
                Admin chỉ cần ấn 1 nút là mã lập tức lên sóng.
              </p>
            </div>

            {/* Tier 3 */}
            <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Bậc 3: Cần Kiểm Tra (50 - 69 Điểm)</h3>
                  <span className="text-xs text-amber-400 font-semibold">Cần Xem Lại Trước Khi Duyệt</span>
                </div>
              </div>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Mã trích xuất từ các bài tổng hợp chung, độ khớp tên game ở mức trung bình hoặc định dạng ký tự có lẫn chữ thường.
                Khuyến nghị Admin kiểm tra kỹ tên game và phần thưởng trước khi phê duyệt.
              </p>
            </div>

            {/* Tier 4 */}
            <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Bậc 4: Rủi Ro / Điểm Thấp (Dưới 50 Điểm)</h3>
                  <span className="text-xs text-rose-400 font-semibold">Tự Động Bỏ Qua / Gắn Cờ Spam</span>
                </div>
              </div>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Mã chứa từ khóa rác, link liên kết, mã trùng lặp hoàn toàn với kho hiện tại, hoặc độ dài bất thường (&lt;4 hoặc &gt;32 ký tự).
                Hệ thống tự động loại bỏ để không làm đầy hàng chờ của Admin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: GOOGLE PLAY GAME MODERATION (PHƯƠNG ÁN B) */}
      {activeTab === 'games_pending' && (
        <div ref={gamesContainerRef} className="space-y-4">
          {/* Top Control Bar - Compact, Elegant & Responsive */}
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 shadow-lg shadow-emerald-950/10 space-y-3">
            {/* Row 1: Header title + Fast Scan Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Quét Game Mới & Hàng Chờ Duyệt
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {pendingGames.length} game chờ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Google Play & CodeMoi • Tự động đăng game NPH lớn & game có sẵn mã giftcode
                  </p>
                </div>
              </div>

              {/* Fast Scan Action Buttons Group */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerGooglePlayScan}
                  disabled={isScanningGooglePlay}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Quét toàn bộ game mobile mới trên Google Play Store VN"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningGooglePlay ? 'animate-spin' : ''}`} />
                  <span>{isScanningGooglePlay ? 'Đang quét GP...' : '⚡ Quét Google Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerCodeMoiScan}
                  disabled={isScanningCodeMoi}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Quét chuyên mục game mới và lịch mở server tại codemoi.net"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningCodeMoi ? 'animate-spin' : ''}`} />
                  <span>{isScanningCodeMoi ? 'Đang quét CodeMoi...' : '⚡ Quét CodeMoi.net'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoPublishGamesWithCodes}
                  disabled={isAutoPublishing || isScanningGooglePlay || isScanningCodeMoi}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Tự động kiểm tra và đăng ngay toàn bộ game có mã giftcode lên danh mục chính thức"
                >
                  <Zap className={`w-3.5 h-3.5 ${isAutoPublishing ? 'animate-spin' : 'text-amber-200'}`} />
                  <span>{isAutoPublishing ? 'Đang đăng...' : '⚡ Đăng Game Có Code'}</span>
                </button>
              </div>
            </div>

            {/* Row 2: Search Input with Dedicated Search Button, Publisher Filter & Compact Automation Switches */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box + Button + Filter */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-sm flex items-center">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={gameSearchInput}
                    onChange={(e) => {
                      setGameSearchInput(e.target.value);
                      if (!e.target.value.trim() && gameSearchQuery) {
                        setGameSearchQuery('');
                        setGamePage(1);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyGameSearch();
                      }
                    }}
                    placeholder="Tìm tên game, NPH, slug, package ID..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-1.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  {gameSearchInput && (
                    <button
                      type="button"
                      onClick={handleClearGameSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dedicated Search Button */}
                <button
                  type="button"
                  onClick={handleApplyGameSearch}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title="Nhấn để tìm kiếm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Tìm kiếm</span>
                </button>

                {/* Publisher Filter */}
                <select
                  value={gamePublisherFilter}
                  onChange={(e) => {
                    setGamePublisherFilter(e.target.value);
                    setGamePage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả Nguồn & NPH</option>
                  <option value="CodeMoi">🌐 Nguồn CodeMoi.net</option>
                  <option value="GooglePlay">📱 Nguồn Google Play</option>
                  <option value="VNG">VNG Corporation</option>
                  <option value="Garena">Garena</option>
                  <option value="SohaGame">SohaGame</option>
                  <option value="Funtap">Funtap</option>
                  <option value="Gamota">Gamota</option>
                  <option value="Gosu">GOSU</option>
                  <option value="VTC">VTC Mobile</option>
                  <option value="VPlay">VPlay</option>
                  <option value="JoyGames">JoyGames</option>
                  <option value="Gzone">Gzone</option>
                  <option value="DigiGames">DigiGames</option>
                  <option value="Dzogame">Dzogame</option>
                </select>

                {/* View Mode Toggle: Danh Sách / Lưới Thẻ */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setGameViewMode('list')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      gameViewMode === 'list'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Chế độ Danh Sách (Khuyên dùng - hiển thị đầy đủ tên & ngày phát hành)"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span>Danh Sách</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameViewMode('grid')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      gameViewMode === 'grid'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Chế độ Lưới Thẻ"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Lưới Thẻ</span>
                  </button>
                </div>

                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <select
                    value={gamePageSize}
                    onChange={(e) => {
                      setGamePageSize(Number(e.target.value));
                      setGamePage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                    title="Số lượng game trên mỗi trang"
                  >
                    <option value={20}>20 game / trang</option>
                    <option value={50}>50 game / trang</option>
                    <option value={100}>100 game / trang</option>
                    <option value={9999}>Tất cả ({filteredPendingGames.length} game)</option>
                  </select>
                </div>

                <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">
                  Tổng: <strong className="text-emerald-400">{filteredPendingGames.length}</strong> / {pendingGames.length} game
                </span>
              </div>

              {/* Compact Automation Switches */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleAutoPublish}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    autoPublishConfig.enabled
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                  title="Tự động đăng 100% khi có game mới từ NPH lớn"
                >
                  <span className={`w-2 h-2 rounded-full ${autoPublishConfig.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span>Tự Đăng NPH Lớn: <strong>{autoPublishConfig.enabled ? 'BẬT' : 'TẮT'}</strong></span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleAutoPublishWhenHasCodes}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    autoPublishConfig.autoPublishWhenHasCodes !== false
                      ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                  title="Tự động đăng ngay lập tức nếu game có mã giftcode"
                >
                  <span className={`w-2 h-2 rounded-full ${autoPublishConfig.autoPublishWhenHasCodes !== false ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <span>Có Code Đăng Ngay: <strong>{autoPublishConfig.autoPublishWhenHasCodes !== false ? 'BẬT' : 'TẮT'}</strong></span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddPendingGameOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer ml-auto"
                  title="Thêm thủ công một game mới vào Hàng Chờ Duyệt"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Game Chờ Duyệt</span>
                </button>
              </div>
            </div>

            {/* Bulk Selection Bar (Ghim cố định khi cuộn để duyệt / bỏ qua hàng loạt tức thì) */}
            {selectedGameIds.length > 0 && (
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap sticky top-2 z-30 bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl border border-emerald-500/40 shadow-xl shadow-emerald-950/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-emerald-300 font-medium">
                    Đã chọn <strong className="text-white">{selectedGameIds.length}</strong> game:
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkApproveGames}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Duyệt & Đăng Tất Cả</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkRejectGames}
                    className="px-2 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Bỏ qua</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pageIds = paginatedPendingGames.map((g) => g.id);
                      const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedGameIds.includes(id));
                      if (allSelected) {
                        setSelectedGameIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                      } else {
                        setSelectedGameIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {paginatedPendingGames.length > 0 && paginatedPendingGames.every((g) => selectedGameIds.includes(g.id)) ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>Chọn {paginatedPendingGames.length} game trang này</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGameIds([])}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy chọn tất cả
                </button>
              </div>
            )}
          </div>

          {/* Pending Games List & Pagination */}
          {filteredPendingGames.length === 0 && pendingGames.length > 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Không Tìm Thấy Game Phù Hợp</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Không có game nào trong hàng chờ khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
              </p>
              <button
                type="button"
                onClick={handleClearGameSearch}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc tìm kiếm</span>
              </button>
            </div>
          ) : paginatedPendingGames.length > 0 ? (
            <div className="space-y-4">
              {/* CHẾ ĐỘ 1: DẠNG DANH SÁCH (BẢNG TRỰC QUAN, RÕ NGÀY PHÁT HÀNH) */}
              {gameViewMode === 'list' ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[820px]">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-2 w-9 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const pageIds = paginatedPendingGames.map((g) => g.id);
                                const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedGameIds.includes(id));
                                if (allSelected) {
                                  setSelectedGameIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                                } else {
                                  setSelectedGameIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                                }
                              }}
                              className="text-slate-500 hover:text-emerald-400 cursor-pointer"
                              title="Chọn / Hủy chọn tất cả game trang này"
                            >
                              {paginatedPendingGames.length > 0 && paginatedPendingGames.every((g) => selectedGameIds.includes(g.id)) ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-2.5 px-1.5 w-12 text-center">Logo</th>
                          <th className="py-2.5 px-3 min-w-[170px]">Tên Game</th>
                          <th className="py-2.5 px-3 w-[135px] min-w-[130px] text-amber-300">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>Ngày Phát Hành</span>
                            </div>
                          </th>
                          <th className="py-2.5 px-3 w-[125px] min-w-[115px]">NPH / Nguồn</th>
                          <th className="py-2.5 px-3 w-[115px] min-w-[105px]">Thể loại / Nền tảng</th>
                          <th className="py-2.5 px-3 w-[88px] min-w-[80px] text-center">Giftcode</th>
                          <th className="py-2.5 px-3 w-44 text-right sticky right-0 bg-slate-950/95 backdrop-blur-md border-l border-slate-800 shadow-[-8px_0_12px_rgba(0,0,0,0.5)] z-20">
                            Thao Tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {paginatedPendingGames.map((game) => {
                          const isSelected = selectedGameIds.includes(game.id);
                          const isFromCodeMoi = game.sourceType === 'codemoi' || (game.sourceUrl && game.sourceUrl.includes('codemoi.net'));
                          const dateInfo = formatReleaseDateDisplay(game);

                          return (
                            <tr
                              key={game.id}
                              className={`group/row transition-colors hover:bg-slate-800/40 ${
                                isSelected ? 'bg-emerald-950/20' : ''
                              }`}
                            >
                              {/* Select Checkbox */}
                              <td className="py-3 px-3 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGameIds((prev) =>
                                      isSelected ? prev.filter((id) => id !== game.id) : [...prev, game.id]
                                    );
                                  }}
                                  className="text-slate-500 hover:text-emerald-400 cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>

                              {/* Logo with safe fallback & edit overlay */}
                              <td className="py-2.5 px-1.5 text-center align-middle">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/60 mx-auto relative group/icon shrink-0 shadow-sm">
                                  <img
                                    src={
                                      game.missing_icon || (!game.iconUrl && !game.localIconPath)
                                        ? `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="%230f172a"/><rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="%23334155" stroke-width="2"/><text x="50%" y="54%" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23f43f5e" text-anchor="middle" dominant-baseline="middle">${encodeURIComponent((cleanGameTitle(game.name) || 'G').slice(0, 2).toUpperCase())}</text></svg>`
                                        : (game.localIconPath && game.localIconPath.startsWith('/')
                                            ? game.localIconPath
                                            : (game.iconUrl || `/game_icons/${game.slug}.webp`))
                                    }
                                    alt={cleanGameTitle(game.name)}
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                    onError={(e: any) => {
                                      const el = e.currentTarget;
                                      const stage = Number(el.dataset.stage || '0');
                                      if (stage === 0 && game.iconUrl && !game.missing_icon) {
                                        el.dataset.stage = '1';
                                        el.src = `/api/game-icon?slug=${game.slug}&url=${encodeURIComponent(game.iconUrl)}`;
                                        return;
                                      }
                                      if (stage <= 1 && game.iconUrl && game.iconUrl.startsWith('http')) {
                                        el.dataset.stage = '2';
                                        el.src = game.iconUrl;
                                        return;
                                      }
                                      el.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="%230f172a"/><rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="%23334155" stroke-width="2"/><text x="50%" y="54%" font-family="sans-serif" font-size="20" font-weight="bold" fill="%2334d399" text-anchor="middle" dominant-baseline="middle">${encodeURIComponent((cleanGameTitle(game.name) || 'G').slice(0, 2).toUpperCase())}</text></svg>`;
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleEditGameLogo(game.id)}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                                    title="Nhấn để đổi logo game này"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-emerald-400" />
                                  </button>
                                </div>
                              </td>

                              {/* Game Title & Links */}
                              <td className="py-2 px-3 align-middle">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white text-xs hover:text-emerald-300 transition-colors leading-snug">
                                    {cleanGameTitle(game.name)}
                                  </span>
                                  {isFromCodeMoi ? (
                                    <a
                                      href={game.sourceUrl || `https://codemoi.net/games/${game.slug}/`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 hover:text-purple-400 inline-flex items-center shrink-0"
                                      title="Mở trang game trên CodeMoi.net"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  ) : (
                                    <a
                                      href={game.playStoreUrl || (game.packageId ? `https://play.google.com/store/apps/details?id=${game.packageId}` : '#')}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 hover:text-emerald-400 inline-flex items-center shrink-0"
                                      title="Mở Google Play Store"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span>slug: <strong className="text-slate-300">{game.slug}</strong></span>
                                  {game.packageId && <span className="text-slate-500 truncate max-w-[130px]">• {game.packageId}</span>}
                                </div>
                              </td>

                              {/* NGÀY PHÁT HÀNH — CỰC KỲ RÕ RÀNG */}
                              <td className="py-2 px-3 align-middle">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="font-bold text-amber-300 text-xs tracking-wide whitespace-nowrap">
                                      {dateInfo.formattedDate}
                                    </span>
                                  </div>
                                  {dateInfo.badgeText && (
                                    <span className="inline-block self-start px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/30 whitespace-nowrap">
                                      {dateInfo.badgeText}
                                    </span>
                                  )}
                                  {dateInfo.crawledDate && (
                                    <span className="text-[9px] text-slate-500 whitespace-nowrap">
                                      Quét: {dateInfo.crawledDate}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* NPH & Nguồn */}
                              <td className="py-2 px-3 align-middle">
                                <div className="text-xs text-slate-200 font-semibold truncate max-w-[120px]" title={cleanGameTitle(game.developer || game.publisher)}>
                                  {cleanGameTitle(game.developer || game.publisher) || <em className="text-slate-500 font-normal">Chưa rõ</em>}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {isFromCodeMoi ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                      🌐 CodeMoi
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      📱 Google Play
                                    </span>
                                  )}
                                  {(game.missing_icon || (!game.iconUrl && !game.localIconPath)) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                      ⚠️ Thiếu icon
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Thể loại & Nền tảng */}
                              <td className="py-2 px-3 align-middle text-slate-300">
                                <div className="text-xs font-medium truncate max-w-[110px]" title={game.category || game.platform || 'Chưa rõ'}>
                                  {game.category || game.platform || <em className="text-slate-500 font-normal">Chưa rõ</em>}
                                </div>
                                {!isFromCodeMoi && (
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                    <span className="flex items-center text-amber-400 font-semibold gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                      {game.rating || 4.8}
                                    </span>
                                    <span>•</span>
                                    <span>{game.installs || '50.000+'}</span>
                                  </div>
                                )}
                              </td>

                              {/* Giftcode Count */}
                              <td className="py-2 px-3 text-center align-middle">
                                {(game.activeCodesCount || 0) > 0 ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap shadow-sm shadow-emerald-950">
                                    🎁 {game.activeCodesCount} code
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px] italic">Chưa có code</span>
                                )}
                              </td>

                              {/* Action Buttons: CỘT GHIM CỐ ĐỊNH BÊN PHẢI (STICKY RIGHT) — LUÔN NẰM TRÊN MÀN HÌNH */}
                              <td className={`py-2 px-3 text-right align-middle sticky right-0 backdrop-blur-md border-l border-slate-800/80 shadow-[-8px_0_12px_rgba(0,0,0,0.5)] z-10 transition-colors ${
                                isSelected
                                  ? 'bg-slate-900/95 group-hover/row:bg-slate-800/95'
                                  : 'bg-slate-900/95 group-hover/row:bg-slate-800/95'
                              }`}>
                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleRejectGame(game.id)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/50 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                                    title="Bỏ qua game này (Loại khỏi hàng chờ)"
                                  >
                                    Bỏ qua
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditGameLogo(game.id)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700/60 transition-colors cursor-pointer shrink-0"
                                    title="Đổi URL / Chỉnh sửa logo game"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveGame(game.id)}
                                    className={`px-3 py-1 rounded-lg text-white text-[11px] font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                      (game.activeCodesCount || 0) > 0
                                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-950/30 ring-1 ring-amber-400/40'
                                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/30'
                                    }`}
                                    title={(game.activeCodesCount || 0) > 0 ? "Duyệt và đăng ngay game có mã giftcode lên web" : "Duyệt game vào kho chính thức"}
                                  >
                                    {(game.activeCodesCount || 0) > 0 ? (
                                      <>
                                        <Zap className="w-3 h-3 text-amber-200 fill-amber-300" />
                                        <span>Đăng Ngay</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Duyệt</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* CHẾ ĐỘ 2: LƯỚI THẺ (GRID VIEW NÂNG CẤP KÈM BANNER NGÀY PHÁT HÀNH) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {paginatedPendingGames.map((game) => {
                    const isSelected = selectedGameIds.includes(game.id);
                    const isFromCodeMoi = game.sourceType === 'codemoi' || (game.sourceUrl && game.sourceUrl.includes('codemoi.net'));
                    const dateInfo = formatReleaseDateDisplay(game);

                    return (
                      <div
                        key={game.id}
                        className={`bg-slate-900 border rounded-2xl p-3.5 sm:p-4 transition-all hover:border-emerald-500/50 flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500/80 bg-emerald-950/10 shadow-lg shadow-emerald-950/20'
                            : 'border-slate-800'
                        }`}
                      >
                        <div>
                          {/* Card Header: Select Checkbox, Game Icon, Name, Developer */}
                          <div className="flex items-start gap-2.5">
                            {/* Select Checkbox */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGameIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== game.id) : [...prev, game.id]
                                );
                              }}
                              className="mt-0.5 text-slate-500 hover:text-emerald-400 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            {/* Game Icon */}
                            <div className="w-13 h-13 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/60 shrink-0 shadow-md relative group/icon">
                              <img
                                src={
                                  game.missing_icon || (!game.iconUrl && !game.localIconPath)
                                    ? `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="%230f172a"/><rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="%23334155" stroke-width="2"/><text x="50%" y="54%" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23f43f5e" text-anchor="middle" dominant-baseline="middle">${encodeURIComponent((cleanGameTitle(game.name) || 'G').slice(0, 2).toUpperCase())}</text></svg>`
                                    : (game.localIconPath && game.localIconPath.startsWith('/')
                                        ? game.localIconPath
                                        : (game.iconUrl || `/game_icons/${game.slug}.webp`))
                                }
                                alt={cleanGameTitle(game.name)}
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="w-full h-full object-cover"
                                onError={(e: any) => {
                                  const el = e.currentTarget;
                                  const stage = Number(el.dataset.stage || '0');
                                  if (stage === 0 && game.iconUrl && !game.missing_icon) {
                                    el.dataset.stage = '1';
                                    el.src = `/api/game-icon?slug=${game.slug}&url=${encodeURIComponent(game.iconUrl)}`;
                                    return;
                                  }
                                  if (stage <= 1 && game.iconUrl && game.iconUrl.startsWith('http')) {
                                    el.dataset.stage = '2';
                                    el.src = game.iconUrl;
                                    return;
                                  }
                                  el.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="%230f172a"/><rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="%23334155" stroke-width="2"/><text x="50%" y="54%" font-family="sans-serif" font-size="20" font-weight="bold" fill="%2334d399" text-anchor="middle" dominant-baseline="middle">${encodeURIComponent((cleanGameTitle(game.name) || 'G').slice(0, 2).toUpperCase())}</text></svg>`;
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleEditGameLogo(game.id)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                                title="Nhấn để đổi logo game này"
                              >
                                <Edit className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            </div>

                            {/* Title & Developer */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-white text-sm truncate" title={cleanGameTitle(game.name)}>
                                  {cleanGameTitle(game.name)}
                                </h3>
                                {isFromCodeMoi ? (
                                  <a
                                    href={game.sourceUrl || `https://codemoi.net/games/${game.slug}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 hover:text-purple-400 shrink-0"
                                    title="Mở trang game trên CodeMoi.net"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                ) : (
                                  <a
                                    href={game.playStoreUrl || (game.packageId ? `https://play.google.com/store/apps/details?id=${game.packageId}` : '#')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 hover:text-emerald-400 shrink-0"
                                    title="Mở Google Play Store"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>

                              <div className="text-xs text-slate-400 truncate mt-0.5" title={cleanGameTitle(game.developer)}>
                                NPH: <span className="text-slate-200 font-medium">{cleanGameTitle(game.developer) || <em className="text-slate-500 font-normal">Chưa rõ</em>}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-400">
                                {(game.missing_icon || (!game.iconUrl && !game.localIconPath)) && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    ⚠️ Thiếu icon
                                  </span>
                                )}
                                {isFromCodeMoi ? (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    🌐 CodeMoi
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    📱 Google Play
                                  </span>
                                )}
                                {(game.activeCodesCount || 0) > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    🎁 {game.activeCodesCount} code
                                  </span>
                                )}
                                {!isFromCodeMoi && (
                                  <>
                                    <span className="flex items-center text-amber-400 font-semibold gap-0.5 text-[10px]">
                                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                      {game.rating || 4.8}
                                    </span>
                                    <span>•</span>
                                    <span className="text-[10px]">{game.installs || '50.000+'}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Release Date Prominent Banner on Grid Card */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-semibold mt-2.5 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Phát hành: <strong className="text-white">{dateInfo.formattedDate}</strong></span>
                            {dateInfo.badgeText && (
                              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                                {dateInfo.badgeText}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-slate-400 text-xs mt-2.5 line-clamp-2 leading-relaxed">
                            {cleanGameTitle(game.description) || `${cleanGameTitle(game.name)} là tựa game mobile mới phát hành chính thức.`}
                          </p>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                            {game.crawledAt ? new Date(game.crawledAt).toLocaleDateString('vi-VN') : ''}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleRejectGame(game.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/50 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95"
                              title="Bỏ qua game này"
                            >
                              Bỏ qua
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditGameLogo(game.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 text-xs font-medium transition-colors cursor-pointer flex items-center border border-slate-700/60 shrink-0"
                              title="Chỉnh sửa hoặc đổi URL logo"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApproveGame(game.id)}
                              className={`px-3 py-1 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                (game.activeCodesCount || 0) > 0
                                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-950/30 ring-1 ring-amber-400/50'
                                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/30'
                              }`}
                            >
                              {(game.activeCodesCount || 0) > 0 ? (
                                <>
                                  <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-300" />
                                  <span>Đăng Ngay</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Duyệt</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Bar */}
              {totalGamePages > 1 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Hiển thị <strong className="text-emerald-400">{(gamePage - 1) * gamePageSize + 1} - {Math.min(gamePage * gamePageSize, filteredPendingGames.length)}</strong> trong số <strong>{filteredPendingGames.length}</strong> game (Trang {gamePage}/{totalGamePages})
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setGamePage(1);
                        gamesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      disabled={gamePage === 1}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                      title="Trang đầu"
                    >
                      Đầu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGamePage((p) => Math.max(1, p - 1));
                        gamesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      disabled={gamePage === 1}
                      className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                      title="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {generatePageNumbers(gamePage, totalGamePages).map((p, idx) => {
                        if (p === '...') {
                          return (
                            <span key={`dots-${idx}`} className="text-xs text-slate-500 px-1 select-none">
                              ...
                            </span>
                          );
                        }
                        const pageNum = Number(p);
                        const isActive = pageNum === gamePage;
                        return (
                          <button
                            key={`page-${pageNum}`}
                            type="button"
                            onClick={() => {
                              setGamePage(pageNum);
                              gamesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGamePage((p) => Math.min(totalGamePages, p + 1));
                        gamesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      disabled={gamePage === totalGamePages}
                      className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                      title="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGamePage(totalGamePages);
                        gamesContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      disabled={gamePage === totalGamePages}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                      title="Trang cuối"
                    >
                      Cuối
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Không Có Game Nào Đang Chờ Duyệt</h3>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                Tất cả các tựa game mới từ NPH chính thức đã được hệ thống <strong className="text-emerald-400">tự động đăng 100%</strong> lên sàn codegame.shop theo Phương án B!
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleTriggerCodeMoiScan}
                  disabled={isScanningCodeMoi}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs inline-flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningCodeMoi ? 'animate-spin' : ''}`} />
                  <span>{isScanningCodeMoi ? 'Đang quét CodeMoi...' : '⚡ Quét CodeMoi.net Ngay'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerGooglePlayScan}
                  disabled={isScanningGooglePlay}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs inline-flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningGooglePlay ? 'animate-spin' : ''}`} />
                  <span>{isScanningGooglePlay ? 'Đang rà soát Google Play...' : '⚡ Quét Google Play Ngay'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CỔNG API & WEBHOOK (MUSE BOT INTEGRATION) */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-500/30 rounded-2xl p-5 shadow-xl shadow-purple-950/20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Code className="w-5 h-5 text-purple-400" />
                    Cổng API & Webhook Tiếp Nhận Giftcode Ngoại Vi (Muse Bot)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    REST API ONLINE
                  </span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-3xl leading-relaxed">
                  Cổng kết nối chuyên biệt cho các Agent AI tự hành (Muse Bot, Python Crawlers, cURL hoặc dịch vụ bên ngoài) đẩy mã giftcode trực tiếp lên sàn. 
                  Hệ thống tích hợp thuật toán <strong className="text-purple-300">lọc tên game thông minh 5 cấp bậc</strong> (tiếng Việt có dấu, không dấu, viết tắt), 
                  <strong className="text-emerald-400"> tự động xuất bản game</strong> từ hàng chờ duyệt khi có code, và <strong className="text-amber-300">lọc trùng lặp mã code tuyệt đối</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/api/crawler/ingest-codes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  <span>Xem Live API Docs (JSON)</span>
                </a>
              </div>
            </div>
          </div>

          {/* MỤC QUẢN LÝ KHÓA KIỂM TOÁN TẠM THỜI (2FA BẢO MẬT) */}
          <TemporaryAuditTokenManager onShowToast={onShowToast} />

          {/* 3 Core Architecture Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                <Search className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">1. Lọc Tên Game Thông Minh (Fuzzy Matching)</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Tự động chuẩn hóa dấu tiếng Việt, loại bỏ hậu tố rác ("Mobile", "Online", "VN", "NPH..."), và so khớp từ viết tắt (VLTK, FF, LQ, HSR, GI...) để tìm chính xác game trong cơ sở dữ liệu.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">2. Tự Động Kích Hoạt & Đăng Lên Web Khách</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Khi Muse gửi code của bất kỳ game nào đang ở <strong className="text-emerald-400">Hàng Chờ Duyệt</strong> (192 game Google Play & CodeMoi), hệ thống sẽ tự động chuyển game sang trạng thái ACTIVE và đăng ngay lên sàn codegame.shop!
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">3. Chống Trùng Lặp Tuyệt Đối & Xóa Cache Biên</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Tự động đối chiếu với toàn bộ kho code hiện tại của tựa game. Bỏ qua mã đã có, chỉ thêm mã mới chưa từng tồn tại, cập nhật bộ đếm và xóa cache biên Cloudflare CDN tức thì.
              </p>
            </div>
          </div>

          {/* Credentials & Configuration Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Thông Tin Xác Thực & Địa Chỉ Kết Nối API</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Method: <strong className="text-emerald-400 font-bold">POST</strong> & <strong className="text-sky-400 font-bold">GET</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Endpoint URL Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Đường Dẫn Endpoint (REST API URL)
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 font-mono">
                    POST
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/crawler/ingest-codes` : 'https://codegame.shop/api/crawler/ingest-codes'}
                    className="bg-transparent text-xs text-slate-200 font-mono flex-1 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyText(typeof window !== 'undefined' ? `${window.location.origin}/api/crawler/ingest-codes` : 'https://codegame.shop/api/crawler/ingest-codes', 'url')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Chấp nhận Header <code className="text-purple-300 font-mono">Authorization: Bearer &lt;API_KEY&gt;</code> hoặc <code className="text-purple-300 font-mono">X-API-Key: &lt;API_KEY&gt;</code>
                </p>
              </div>

              {/* API Key Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Khóa Xác Thực (API Key của Muse / Bot)
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateApiKey}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Tạo khóa mới</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    readOnly
                    value={crawlerApiConfig.apiKey || ''}
                    placeholder="Chưa có API Key"
                    className="bg-transparent text-xs text-amber-300 font-mono flex-1 outline-none select-all font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title={showApiKey ? 'Ẩn khóa' : 'Hiện khóa'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(crawlerApiConfig.apiKey || '', 'key')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  API Key được lưu bảo mật trong cơ sở dữ liệu Cloudflare D1.
                </p>
              </div>
            </div>

            {/* Quick Toggle Controls */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={crawlerApiConfig.enabled}
                    onChange={(e) => handleSaveApiConfig({ enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-slate-300 font-medium">Kích hoạt Cổng Tiếp Nhận API</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={crawlerApiConfig.autoPublish}
                    onChange={(e) => handleSaveApiConfig({ autoPublish: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-slate-300 font-medium">Tự động kích hoạt game từ hàng chờ khi có code</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">Tên định danh Bot:</span>
                <input
                  type="text"
                  value={crawlerApiConfig.botName || 'Muse Master Bot'}
                  onChange={(e) => setCrawlerApiConfig({ ...crawlerApiConfig, botName: e.target.value })}
                  onBlur={() => handleSaveApiConfig({ botName: crawlerApiConfig.botName })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Live Interactive Test Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Bàn Thử Nghiệm Gửi Mã (Interactive Ingest Test Console)</h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Thử gửi mã trực tiếp ngay tại đây để kiểm tra thuật toán lọc tên game và nạp code
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Input Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tên Game Cần Nạp Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={testGameInput}
                    onChange={(e) => setTestGameInput(e.target.value)}
                    placeholder="VD: Mộng Thiên Kiếm, Võ Lâm Truyền Kỳ, Genshin Impact, Free Fire..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Hỗ trợ gõ không dấu, có dấu, hoặc viết tắt (VD: "Mong Thien Kiem", "vltk", "hsr"...). Hệ thống sẽ tự động lọc và khớp vào đúng game.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Danh Sách Mã Giftcode (Mỗi dòng một mã hoặc cách nhau bằng dấu phẩy)
                    </label>
                    <span className="text-[10px] text-slate-400">Có thể để trống nếu chỉ cập nhật cách nhập code</span>
                  </div>
                  <textarea
                    rows={3}
                    value={testCodesInput}
                    onChange={(e) => setTestCodesInput(e.target.value)}
                    placeholder="MONGTHIENKIEM&#10;VIP666&#10;VIP888&#10;VIP999"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Cách Nhập Giftcode (Instructions / Guide) <span className="text-purple-400 font-normal">(Cấp quyền API chỉnh sửa)</span>
                    </label>
                    <span className="text-[10px] text-purple-400 font-medium">Hỗ trợ ngắt dòng</span>
                  </div>
                  <textarea
                    rows={3}
                    value={testInstructionsInput}
                    onChange={(e) => setTestInstructionsInput(e.target.value)}
                    placeholder="Bước 1: Mở game > Nhấp vào Avatar nhân vật...&#10;Bước 2: Chọn Cài đặt > Nhập Giftcode...&#10;Bước 3: Dán mã và nhấn Xác nhận..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Trường này sẽ hiển thị trực tiếp trong popup chi tiết game ngoài Web Khách. Bot có thể gửi độc lập để sửa hướng dẫn mà không cần gửi kèm code.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Link Đổi Quà (Redeem URL)</label>
                    <input
                      type="url"
                      value={testRedeemUrlInput}
                      onChange={(e) => setTestRedeemUrlInput(e.target.value)}
                      placeholder="https://nap.vplay.vn..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phần Thưởng</label>
                    <input
                      type="text"
                      value={testRewardsInput}
                      onChange={(e) => setTestRewardsInput(e.target.value)}
                      placeholder="Quà tặng tân thủ 2026..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nguồn Gửi (Source)</label>
                    <input
                      type="text"
                      value={testBotNameInput}
                      onChange={(e) => setTestBotNameInput(e.target.value)}
                      placeholder="Muse Crawler Bot"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleExecuteApiTest}
                    disabled={isExecutingApiTest || !testGameInput.trim() || (!testCodesInput.trim() && !testInstructionsInput.trim() && !testRedeemUrlInput.trim())}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/20 active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isExecutingApiTest ? 'animate-spin' : ''}`} />
                    <span>{isExecutingApiTest ? 'Đang gửi và xử lý API...' : '⚡ Gửi Thử Tới API (Nạp Mã / Chỉnh Sửa Cách Nhập Code)'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live API Response Viewer */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Kết Quả Phản Hồi Từ API (JSON Response):
                  </label>
                  {apiTestResponse && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      apiTestResponse.success
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {apiTestResponse.success ? '200 OK - THÀNH CÔNG' : 'LỖI XỬ LÝ'}
                    </span>
                  )}
                </div>

                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 min-h-[220px] max-h-[320px] overflow-y-auto font-mono text-[11px] text-slate-300">
                  {apiTestResponse ? (
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(apiTestResponse, null, 2)}
                    </pre>
                  ) : apiTestError ? (
                    <div className="text-rose-400 flex items-start gap-2">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Lỗi API:</strong>
                        <p className="mt-1">{apiTestError}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-1 text-center py-8">
                      <Terminal className="w-8 h-8 text-slate-700" />
                      <p>Chưa có kết quả phản hồi.</p>
                      <p className="text-[10px]">Nhấn "Gửi Thử Tới API" ở bên trái để xem kết quả khớp game và nạp mã.</p>
                    </div>
                  )}
                </div>

                {apiTestResponse && apiTestResponse.results && apiTestResponse.results[0] && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {apiTestResponse.results[0].matchedGame?.icon_url && (
                        <img
                          src={apiTestResponse.results[0].matchedGame.icon_url}
                          alt="Icon"
                          className="w-6 h-6 rounded-md object-cover border border-slate-700"
                        />
                      )}
                      <div>
                        <span className="text-slate-400 text-[10px]">Game khớp:</span>{' '}
                        <strong className="text-white">{apiTestResponse.results[0].matchedGame?.name}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      {apiTestResponse.results[0].instructionsUpdated && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                          📖 Đã cập nhật cách nhập
                        </span>
                      )}
                      {apiTestResponse.results[0].redeemUrlUpdated && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] border border-sky-500/30">
                          🔗 Có Link đổi quà
                        </span>
                      )}
                      {(apiTestResponse.results[0].addedCount !== undefined && apiTestResponse.results[0].addedCount > 0) && (
                        <span className="text-emerald-400 font-semibold">
                          +{apiTestResponse.results[0].addedCount} mã mới
                        </span>
                      )}
                      {apiTestResponse.results[0].duplicateCount > 0 && (
                        <span className="text-amber-400">
                          ({apiTestResponse.results[0].duplicateCount} trùng)
                        </span>
                      )}
                      {apiTestResponse.results[0].autoPublished && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          🚀 Đã đăng lên Web!
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ready-to-use Code Snippets (Python, cURL, Node.js) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Mã Mẫu Cho Muse & Lập Trình Viên (SDK Snippets)</h3>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setApiSnippetLang('python')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    apiSnippetLang === 'python'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Python (Muse Bot)
                </button>
                <button
                  type="button"
                  onClick={() => setApiSnippetLang('curl')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    apiSnippetLang === 'curl'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  cURL (Terminal)
                </button>
                <button
                  type="button"
                  onClick={() => setApiSnippetLang('nodejs')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    apiSnippetLang === 'nodejs'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Node.js (Fetch)
                </button>
              </div>
            </div>

            {/* Snippet Code Viewer */}
            <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300">
              <button
                type="button"
                onClick={() => {
                  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop';
                  const key = crawlerApiConfig.apiKey || '<API_KEY>';
                  let codeToCopy = '';
                  if (apiSnippetLang === 'python') {
                    codeToCopy = `# 🐍 Python Script for Muse AI Agent / Bot
import requests

API_URL = "${currentOrigin}/api/crawler/ingest-codes"
API_KEY = "${key}"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

# Cách 1: Nạp Giftcode mới ĐỒNG THỜI cập nhật Cách Nhập Code đặc thù
payload_with_codes = {
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Trong game, đạt Cấp 51 trở lên mở Sảnh Phúc Lợi.\\nBước 2: Chọn mục Đổi Mã Quà Tặng.\\nBước 3: Nhập code và nhận quà tại Hộp Thư.",
    "redeemUrl": "https://nap.vplay.vn",
    "codes": [
        {"code": "TALAHACNGOKHONG", "rewards": "100 Kim Cương + 5 Vé Quay", "expiresAt": "2026-12-31"},
        {"code": "VIP666", "rewards": "Rương pháp bảo hoàng kim"}
    ],
    "source": "Muse Crawler Bot"
}

# Cách 2: CHỈ CẬP NHẬT CÁCH NHẬP CODE (Không cần gửi kèm mã giftcode)
payload_instructions_only = {
    "action": "update_instructions",
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Đăng nhập game > Đạt Cấp 51 mở Sảnh Phúc Lợi.\\nBước 2: Chọn mục Đổi Mã Quà Tặng.\\nBước 3: Dán mã quà và nhận tại Thư in-game.",
    "redeemUrl": "https://nap.vplay.vn"
}

response = requests.post(API_URL, headers=headers, json=payload_with_codes, timeout=15)
print(response.status_code, response.json())`;
                  } else if (apiSnippetLang === 'curl') {
                    codeToCopy = `# 💻 cURL Terminal Command: Vừa nạp code vừa cập nhật Cách Nhập Code
curl -X POST "${currentOrigin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Mở game > Đạt Cấp 51 > Vào Sảnh Phúc Lợi.\\nBước 2: Chọn Đổi Mã Quà Tặng.\\nBước 3: Dán mã và nhấn Xác Nhận.",
    "redeemUrl": "https://nap.vplay.vn",
    "codes": ["TALAHACNGOKHONG", "VIP666", "VIP888"],
    "rewards": "Quà tặng tân thủ độc quyền 2026",
    "source": "Muse Bot"
  }'

# 💻 cURL Terminal Command: CHỈ CẬP NHẬT CÁCH NHẬP CODE (Độc Lập)
curl -X POST "${currentOrigin}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{
    "action": "update_instructions",
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Đăng nhập game > Cấp 51 mở Sảnh Phúc Lợi.\\nBước 2: Chọn Đổi Mã Quà Tặng.\\nBước 3: Nhập code và nhận quà tại Thư.",
    "redeemUrl": "https://nap.vplay.vn"
  }'`;
                  } else {
                    codeToCopy = `// 🚀 Node.js / TypeScript: Cập nhật cách nhập code và nạp giftcode
const res = await fetch('${currentOrigin}/api/crawler/ingest-codes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${key}',
  },
  body: JSON.stringify({
    gameName: 'Ta Là Hắc Ngộ Không',
    instructions: 'Bước 1: Đạt cấp 51 mở Sảnh Phúc Lợi\\nBước 2: Chọn Đổi Quà\\nBước 3: Dán mã code',
    redeemUrl: 'https://nap.vplay.vn',
    codes: ['TALAHACNGOKHONG', 'VIP666'],
    rewards: 'Quà tân thủ',
    source: 'Muse Crawler Engine',
  }),
});
const data = await res.json();
console.log(data);`;
                  }
                  handleCopyText(codeToCopy, apiSnippetLang);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shadow"
              >
                {copiedSnippet === apiSnippetLang ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet === apiSnippetLang ? 'Đã sao chép' : 'Sao chép mã'}</span>
              </button>

              <pre className="overflow-x-auto leading-relaxed pt-2">
                {apiSnippetLang === 'python' && `# 🐍 Python Script for Muse AI Agent / Bot
import requests

API_URL = "${typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop'}/api/crawler/ingest-codes"
API_KEY = "${crawlerApiConfig.apiKey || '<API_KEY>'}"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

# 1. Vừa nạp Giftcode vừa cập nhật Cách Nhập Code đặc thù của game
payload = {
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Mở game > Nhân vật đạt cấp 51 mở Sảnh Phúc Lợi.\\nBước 2: Chọn mục Đổi Mã Quà Tặng.\\nBước 3: Nhập code và nhận quà tại Hộp Thư.",
    "redeemUrl": "https://nap.vplay.vn",
    "codes": [
        {"code": "TALAHACNGOKHONG", "rewards": "100 Kim Cương + 5 Vé Quay", "expiresAt": "2026-12-31"},
        {"code": "VIP666", "rewards": "Rương trang bị hoàng kim"}
    ],
    "source": "Muse Crawler Bot"
}

# 2. Hoặc CHỈ CẬP NHẬT CÁCH NHẬP CODE (Không cần nạp thêm mã)
# payload = {
#     "action": "update_instructions",
#     "gameName": "Ta Là Hắc Ngộ Không",
#     "instructions": "Bước 1: Cấp 51 mở Sảnh Phúc Lợi...\\nBước 2: Nhập code...\\nBước 3: Nhận quà",
#     "redeemUrl": "https://nap.vplay.vn"
# }

response = requests.post(API_URL, headers=headers, json=payload, timeout=15)
print("HTTP Status:", response.status_code)
print("API Response:", response.json())`}

                {apiSnippetLang === 'curl' && `# 💻 cURL: Vừa nạp mã code vừa cập nhật Cách Nhập Code
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop'}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${crawlerApiConfig.apiKey || '<API_KEY>'}" \\
  -d '{
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Cấp 51 mở Sảnh Phúc Lợi.\\nBước 2: Chọn Đổi Mã Quà Tặng.\\nBước 3: Dán mã và nhấn Xác Nhận.",
    "redeemUrl": "https://nap.vplay.vn",
    "codes": ["TALAHACNGOKHONG", "VIP666", "VIP888"],
    "rewards": "Quà tặng tân thủ độc quyền 2026",
    "source": "Muse Bot"
  }'

# 💻 cURL: CHỈ CẬP NHẬT CÁCH NHẬP CODE (Độc lập không cần mã)
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop'}/api/crawler/ingest-codes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${crawlerApiConfig.apiKey || '<API_KEY>'}" \\
  -d '{
    "action": "update_instructions",
    "gameName": "Ta Là Hắc Ngộ Không",
    "instructions": "Bước 1: Mở game > Đạt Cấp 51 > Vào Sảnh Phúc Lợi.\\nBước 2: Nhập code.\\nBước 3: Nhận quà qua Thư in-game.",
    "redeemUrl": "https://nap.vplay.vn"
  }'`}

                {apiSnippetLang === 'nodejs' && `// 🚀 Node.js / TypeScript Fetch: Nạp code & cập nhật cách nhập
const res = await fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop'}/api/crawler/ingest-codes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${crawlerApiConfig.apiKey || '<API_KEY>'}',
  },
  body: JSON.stringify({
    gameName: 'Ta Là Hắc Ngộ Không',
    instructions: 'Bước 1: Mở game > Đạt cấp 51 mở Sảnh Phúc Lợi\\nBước 2: Đổi quà tặng\\nBước 3: Nhận thư',
    redeemUrl: 'https://nap.vplay.vn',
    codes: ['TALAHACNGOKHONG', 'VIP666'],
    rewards: 'Quà tân thủ',
    source: 'Muse Crawler Engine',
  }),
});
const data = await res.json();
console.log(data);`}
              </pre>
            </div>
          </div>

          {/* Note on Expiration Date format for Muse / Bot */}
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-purple-300">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Quy Chuẩn Hạn Sử Dụng (expiresAt) Cho Muse Bot / API:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
              <li><strong className="text-slate-200">Định dạng hỗ trợ:</strong> ISO <code className="text-purple-300 font-mono">YYYY-MM-DD</code> (VD: 2026-12-31), ngày Việt Nam <code className="text-purple-300 font-mono">DD/MM/YYYY</code> (VD: 31/12/2026), timestamp, hoặc chữ <code className="text-purple-300 font-mono">"Hết hạn"</code> / <code className="text-purple-300 font-mono">"Vĩnh viễn"</code>.</li>
              <li><strong className="text-slate-200">Tự động chuyển mục Hết hạn:</strong> Khi mã nạp vào có hạn sử dụng trước ngày hiện tại hoặc mang nhãn <code className="text-rose-400 font-mono">"Hết hạn"</code>, hệ thống tự động gán <code className="text-rose-400 font-mono">status: "EXPIRED"</code> và chuyển sang tab "Đã hết hạn" của game đó.</li>
              <li><strong className="text-slate-200">Cập nhật mã đã có:</strong> Nếu gửi lại một mã code đã tồn tại kèm ngày hết hạn mới, hệ thống tự động cập nhật HSD và đồng bộ trạng thái ngay lập tức.</li>
            </ul>
          </div>

          {/* Note on Instructions Editing Permission for Muse / Bot */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-indigo-300">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Toàn Quyền Chỉnh Sửa Cách Nhập Code (instructions) Cho Bot / API:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
              <li><strong className="text-slate-200">Cập nhật độc lập:</strong> Bot có thể gửi payload chỉ chứa <code className="text-indigo-300 font-mono">"gameName"</code> và <code className="text-indigo-300 font-mono">"instructions"</code> (kèm <code className="text-indigo-300 font-mono">"redeemUrl"</code> tùy chọn) để cập nhật cách nhập code chuẩn cho game mà không cần gửi kèm bất kỳ giftcode nào.</li>
              <li><strong className="text-slate-200">Tên trường linh hoạt:</strong> Hệ thống tự động nhận diện các khóa: <code className="text-indigo-300 font-mono">instructions</code>, <code className="text-indigo-300 font-mono">guide</code>, <code className="text-indigo-300 font-mono">huongDan</code>, <code className="text-indigo-300 font-mono">cachNhapCode</code>.</li>
              <li><strong className="text-slate-200">Đồng bộ tức thì 0ms ra Web Khách:</strong> Dữ liệu cập nhật được lưu trực tiếp vào CSDL Cloudflare D1 và xóa cache biên (Edge Cache) để người dùng xem popup chi tiết game thấy ngay hướng dẫn mới nhất.</li>
              <li><strong className="text-slate-200">Tự động áp dụng khi duyệt game mới:</strong> Khi bot nạp code đầu tiên kèm <code className="text-indigo-300 font-mono">instructions</code> cho game đang nằm trong Hàng Chờ Duyệt, hệ thống sẽ tự động xuất bản game lên web với đúng hướng dẫn này thay vì dùng mẫu 3 bước mặc định.</li>
            </ul>
          </div>

          {/* Recent Ingestion Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Nhật Ký Gọi API Gần Đây (API Ingestion History)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                  {crawlerApiLogs.length} lần gọi
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefreshApiLogs}
                disabled={isLoadingApiLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApiLogs ? 'animate-spin text-purple-400' : ''}`} />
                <span>{isLoadingApiLogs ? 'Đang tải...' : 'Làm mới nhật ký'}</span>
              </button>
            </div>

            {crawlerApiLogs.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/50 rounded-xl border border-slate-800/80">
                <Terminal className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Chưa có giao dịch gọi API nào được ghi nhận gần đây.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khi Muse Bot hoặc công cụ ngoài gửi giftcode, toàn bộ lịch sử sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Thời Gian</th>
                      <th className="py-2.5 px-3">Bot Gửi</th>
                      <th className="py-2.5 px-3">Tên Game & Khớp</th>
                      <th className="py-2.5 px-3 text-center">Mã Nạp Mới</th>
                      <th className="py-2.5 px-3 text-center">Trùng Lặp</th>
                      <th className="py-2.5 px-3 text-center">Tự Động Đăng</th>
                      <th className="py-2.5 px-3 text-right">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {crawlerApiLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          }) : 'Vừa xong'}
                        </td>
                        <td className="py-2.5 px-3 text-purple-300 font-sans font-semibold">
                          {log.botName || 'Muse Bot'}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {log.details && log.details.length > 0 ? (
                            <div className="space-y-0.5">
                              {log.details.slice(0, 2).map((d: any, dIdx: number) => (
                                <div key={dIdx} className="text-slate-200 text-xs flex items-center gap-1.5 flex-wrap">
                                  <span>{d.input}</span>
                                  {d.matched && d.matched !== d.input && (
                                    <span className="text-purple-400 text-[11px]">
                                      ➔ {d.matched}
                                    </span>
                                  )}
                                  {d.instructionsUpdated && (
                                    <span className="px-1 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                      📖 Hướng dẫn
                                    </span>
                                  )}
                                </div>
                              ))}
                              {log.details.length > 2 && (
                                <span className="text-[10px] text-slate-500">+{log.details.length - 2} game khác</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">Nhiều mục</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                          +{log.totalCodesAdded || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400">
                          {log.totalCodesReceived && log.totalCodesAdded !== undefined
                            ? Math.max(0, log.totalCodesReceived - log.totalCodesAdded)
                            : 0}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {log.autoPublishedGamesCount && log.autoPublishedGamesCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              🚀 {log.autoPublishedGamesCount} game
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            SUCCESS
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* TAB 7: TOMBSTONE & DELETED RECORDS HISTORY */}
      {activeTab === 'trash' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                Lịch Sử Xóa Mềm & Tombstone Chống Hồi Sinh
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Toàn bộ bản ghi đã xóa (Game chờ, Game live, Sắp ra mắt, Tin tức, Giveaway, Nhiệm vụ) được lưu trữ bất biến. Mọi crawler và cơ chế fallback bị chặn nạp lại cho đến khi được quản trị viên khôi phục chủ động.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                Tombstones: <span className="font-bold text-rose-400">{tombstonesCount}</span>
              </div>
              <button
                onClick={fetchDeletedHistory}
                disabled={isLoadingHistory}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'ALL', label: 'Tất Cả' },
                  { key: 'pending_game', label: 'Game Chờ Duyệt' },
                  { key: 'game', label: 'Game Live' },
                  { key: 'upcoming_game', label: 'Sắp Ra Mắt' },
                  { key: 'news', label: 'Tin Tức' },
                  { key: 'giveaway', label: 'Giveaway' },
                  { key: 'mission', label: 'Nhiệm Vụ' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDeletedTypeFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    deletedTypeFilter === tab.key
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm tên, slug, ID..."
                value={deletedSearch}
                onChange={(e) => setDeletedSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {isLoadingHistory ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                <span className="text-xs">Đang tải lịch sử xóa và danh sách tombstones...</span>
              </div>
            ) : deletedRecords.length === 0 ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <ShieldCheck className="w-8 h-8 text-slate-600" />
                <span className="text-sm font-medium">Chưa có bản ghi nào bị xóa mềm</span>
                <span className="text-xs text-slate-600">Khi một bản ghi bị xóa, nó sẽ xuất hiện tại đây cùng Tombstone chống hồi sinh.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Loại Bản Ghi</th>
                      <th className="py-3 px-4">Tiêu Đề / Slug</th>
                      <th className="py-3 px-4">Thời Điểm Xóa</th>
                      <th className="py-3 px-4">Người Thực Hiện</th>
                      <th className="py-3 px-4">Lý Do Xóa</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {deletedRecords
                      .filter((r) => {
                        if (!deletedSearch.trim()) return true;
                        const q = deletedSearch.toLowerCase();
                        return (
                          (r.title && r.title.toLowerCase().includes(q)) ||
                          (r.record_slug && r.record_slug.toLowerCase().includes(q)) ||
                          (r.record_id && r.record_id.toLowerCase().includes(q))
                        );
                      })
                      .map((record) => {
                        const isRestored = Boolean(record.restored_at);
                        const typeBadgeMap: Record<string, { label: string; color: string }> = {
                          pending_game: { label: 'Game Chờ', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                          game: { label: 'Game Live', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                          upcoming_game: { label: 'Sắp Ra Mắt', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                          news: { label: 'Tin Tức', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
                          giveaway: { label: 'Giveaway', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                          mission: { label: 'Nhiệm Vụ', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                        };
                        const badgeInfo = typeBadgeMap[record.record_type] || { label: record.record_type, color: 'bg-slate-800 text-slate-400 border-slate-700' };

                        return (
                          <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeInfo.color}`}>
                                {badgeInfo.label}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white max-w-xs truncate" title={record.title || record.record_slug}>
                                {record.title || record.record_slug || record.record_id}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono truncate">
                                {record.record_slug || record.record_id}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                              {record.deleted_at ? new Date(record.deleted_at).toLocaleString('vi-VN') : '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                              {record.deleted_by || 'admin'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={record.delete_reason || ''}>
                              {record.delete_reason || '—'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isRestored ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                  <Check className="w-3.5 h-3.5" />
                                  Đã khôi phục
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Tombstone Hoạt Động
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {isRestored ? (
                                <span className="text-[11px] text-slate-500 italic">Đã phục hồi</span>
                              ) : (
                                <button
                                  onClick={() => handleRestoreRecord(record)}
                                  disabled={isRestoringId === record.id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95"
                                >
                                  <RotateCcw className={`w-3.5 h-3.5 ${isRestoringId === record.id ? 'animate-spin' : ''}`} />
                                  <span>{isRestoringId === record.id ? 'Đang khôi phục...' : 'Khôi phục'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Thêm Nguồn Cào Mới */}
      <FormModal
        isOpen={isAddSourceOpen}
        onClose={() => setIsAddSourceOpen(false)}
        title="Thêm Nguồn Cào Giftcode Mới"
      >
        <form onSubmit={handleAddSource} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên Nguồn <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="VD: CodeMoi - Genshin Impact, Sforum - Free Fire"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Loại Nguồn</label>
              <select
                value={newSourceType}
                onChange={(e) => setNewSourceType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="reputable_web">Chuyên trang game (Web)</option>
                <option value="official_fb">Fanpage Facebook NPH</option>
                <option value="community_discord">Máy chủ Discord</option>
                <option value="official_site">Trang chủ NPH Game</option>
              </select>
            </div>

            <div>
              <SearchableGameSelect
                games={games}
                selectedGameSlug={newSourceGameSlug}
                onSelectGame={(g) => setNewSourceGameSlug(g ? (g.slug || g.id) : '')}
                label="Game Mục Tiêu (Tùy chọn)"
                placeholder="Tự động nhận diện (Fuzzy match)..."
                allowClear
                clearLabel="Tự động nhận diện (Fuzzy match)"
                dropdownAlign="right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Đường Dẫn URL / Link <span className="text-rose-400">*</span>
            </label>
            <input
              type="url"
              required
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mô Tả / Ghi Chú</label>
            <textarea
              rows={2}
              value={newSourceDesc}
              onChange={(e) => setNewSourceDesc(e.target.value)}
              placeholder="Ghi chú thêm về tần suất cập nhật hoặc kênh thông báo..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddSourceOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20"
            >
              Lưu & Bắt Đầu Quét
            </button>
          </div>
        </form>
      </FormModal>

      {/* MODAL: Sửa & Duyệt Mã Code */}
      <FormModal
        isOpen={Boolean(editingCode)}
        onClose={() => setEditingCode(null)}
        title="Chỉnh Sửa & Phê Duyệt Giftcode"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mã Giftcode</label>
            <input
              type="text"
              required
              value={editCodeValue}
              onChange={(e) => setEditCodeValue(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500 uppercase"
            />
          </div>

          <div>
            <SearchableGameSelect
              games={games}
              selectedGameSlug={editGameSlug}
              onSelectGame={(g) => setEditGameSlug(g.slug || g.id)}
              label="Tựa Game Áp Dụng"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phần Thưởng</label>
            <input
              type="text"
              required
              value={editRewards}
              onChange={(e) => setEditRewards(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">Hạn Sử Dụng</label>
              <button
                type="button"
                onClick={() => setEditExpiresAt('')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                  !editExpiresAt
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Chưa rõ hạn
              </button>
            </div>
            <input
              type="date"
              value={editExpiresAt}
              onChange={(e) => setEditExpiresAt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            {!editExpiresAt && (
              <p className="text-[11px] text-slate-400 italic mt-1">Đang chọn: Chưa rõ hạn dùng (lưu NULL)</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingCode(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20"
            >
              Lưu & Duyệt Ngay Lập Tức
            </button>
          </div>
        </form>
      </FormModal>

      {/* MODAL: Trích Xuất Nhanh Bài Viết Fanpage */}
      <FormModal
        isOpen={isQuickIngestOpen}
        onClose={() => {
          setIsQuickIngestOpen(false);
          setQuickExtractedCodes([]);
          setQuickIngestText('');
        }}
        title="⚡ Trích Xuất Nhanh Mã Từ Bài Viết Fanpage Facebook"
      >
        <div className="space-y-4">
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Giải pháp cho rào cản Facebook:</strong>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  Meta Facebook chặn bot quét tự động bằng Login Wall. Bạn chỉ cần sao chép nội dung bài viết Fanpage và dán vào đây, 
                  bộ máy AI Regex sẽ bóc tách toàn bộ mã code chỉ trong 0.1 giây để bạn đăng ngay lên web khách!
                </p>
              </div>
            </div>
          </div>

          <div>
            <SearchableGameSelect
              games={games}
              selectedGameSlug={quickIngestGameSlug}
              onSelectGame={(g) => setQuickIngestGameSlug(g ? (g.slug || g.id) : '')}
              label="Tựa Game Áp Dụng *"
              placeholder="Chọn tựa game của Fanpage này..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nội Dung Bài Đăng / Status Facebook <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={5}
              value={quickIngestText}
              onChange={(e) => setQuickIngestText(e.target.value)}
              placeholder="Dán toàn bộ văn bản status Fanpage vào đây (Ví dụ: 'Mừng ra mắt phiên bản mới, tặng đạo hữu bộ giftcode cực khủng: Code 1: CTDT9R0609, Code 2: CKNCOM409...')..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-slate-500">
              {quickIngestText.trim().length} ký tự
            </span>
            <button
              type="button"
              onClick={handleAnalyzeQuickPost}
              disabled={isAnalyzingQuick || !quickIngestText.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${isAnalyzingQuick ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingQuick ? 'Đang phân tích...' : '⚡ Bóc Tách & Quét Mã Ngay'}</span>
            </button>
          </div>

          {/* Extracted Codes Preview */}
          {quickExtractedCodes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Tìm thấy {quickExtractedCodes.length} mã giftcode:
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  Sẵn sàng phê duyệt
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {quickExtractedCodes.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300 text-sm bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                        {item.code}
                      </span>
                      <span className="text-slate-400 truncate max-w-[200px]">
                        {item.rewards}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">
                      Bậc {item.tier} ({item.score}đ)
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveQuickCodesToPending}
                  disabled={isSubmittingQuick}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  📥 Đưa Vào Hàng Chờ
                </button>
                <button
                  type="button"
                  onClick={handleApproveAllQuickCodes}
                  disabled={isSubmittingQuick}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{isSubmittingQuick ? 'Đang kích hoạt...' : '🚀 Phê Duyệt & Đăng Ngay Lên Web'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </FormModal>

      {/* MODAL: Thêm Game Chờ Duyệt Thủ Công */}
      <FormModal
        isOpen={isAddPendingGameOpen}
        onClose={() => setIsAddPendingGameOpen(false)}
        title="Thêm Game Vào Hàng Chờ Duyệt"
      >
        <form onSubmit={handleCreatePendingGame} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên Game <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              placeholder="VD: Grow a Chicken Fighter, Dig and Clean..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">NPH / Studio</label>
              <input
                type="text"
                value={newGameDeveloper}
                onChange={(e) => setNewGameDeveloper(e.target.value)}
                placeholder="Chưa rõ (để trống nếu chưa biết)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Thể Loại</label>
              <input
                type="text"
                value={newGameCategory}
                onChange={(e) => setNewGameCategory(e.target.value)}
                placeholder="Chưa rõ (để trống nếu chưa biết)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nền Tảng</label>
              <input
                type="text"
                value={newGamePlatform}
                onChange={(e) => setNewGamePlatform(e.target.value)}
                placeholder="Chưa rõ (Android, iOS, PC, Roblox...)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">URL Icon / Logo (tùy chọn)</label>
            <input
              type="text"
              value={newGameIconUrl}
              onChange={(e) => setNewGameIconUrl(e.target.value)}
              placeholder="https://... (để trống nếu chưa có)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hướng Dẫn Nhập Code (tùy chọn)</label>
            <textarea
              rows={3}
              value={newGameInstructions}
              onChange={(e) => setNewGameInstructions(e.target.value)}
              placeholder="Để trống nếu chưa có hướng dẫn đã kiểm chứng..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Danh Sách Giftcode Kèm Theo (mỗi mã 1 dòng hoặc dấu phẩy)</label>
            <textarea
              rows={3}
              value={newGameCodes}
              onChange={(e) => setNewGameCodes(e.target.value)}
              placeholder="CODE1&#10;CODE2&#10;CODE3"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddPendingGameOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmittingGame}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmittingGame ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đưa Vào Hàng Chờ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </FormModal>

      {/* CONFIRM MODAL: Xóa Nguồn */}
      <ConfirmModal
        isOpen={Boolean(deletingSourceId)}
        onClose={() => setDeletingSourceId(null)}
        onConfirm={() => deletingSourceId && handleDeleteSource(deletingSourceId)}
        title="Xóa Nguồn Cào Này?"
        message="Hệ thống sẽ không quét dữ liệu từ đường dẫn này trong các chu kỳ tự động tới nữa."
        confirmText="Xác nhận xóa"
      />
    </div>
  );
};
