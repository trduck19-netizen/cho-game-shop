import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Edit2,
  Boxes,
  History,
  Search,
  Upload,
  X,
  Power,
  PowerOff,
  Play,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Zap,
  Eye,
  EyeOff,
  Clock,
  Users,
  Bell,
  MessageSquare,
  ExternalLink,
  Dices,
  Link2,
  Sliders,
  RefreshCw,
  Bot,
  User,
  Calendar,
  KeyRound,
  Key,
  Code2,
  Terminal,
  Shield,
  CheckCheck,
  Layers,
  Lock,
  AlertCircle,
  Server,
  CheckSquare,
  Square,
} from 'lucide-react';
import { LuckyWheelAdminManager } from '../components/LuckyWheelAdminManager';
import { FormModal } from '../components/ui/FormModal';
import { UniversalTemplateModal } from '../components/UniversalTemplateModal';
import { templateService } from '../../services/templateService';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ImageUploadInput } from '../components/ui/ImageUploadInput';
import { SearchableGameSelect } from '../components/ui/SearchableGameSelect';
import { QuickFomoAdjustModal } from '../components/ui/QuickFomoAdjustModal';
import { adminDataService } from '../services/adminDataService';
import { marketingService } from '../../services/marketingService';
import { GameAdminRecord } from '../types/adminTypes';
import { formatFullDateTime, smartVietnameseMatch } from '../../utils/textUtils';
import type { GiveawayCampaign } from '../../types/game';

interface PrivateCodesModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Helper xác định trạng thái ĐANG MỞ (ACTIVE) của chiến dịch Giveaway.
 * Tương thích 100% với kiểu số nguyên SQLite D1 (1/0), boolean (true/false) và enum status (ACTIVE/PAUSED/ENDED).
 */
export const isGwActive = (g: any): boolean => {
  if (!g) return false;
  if (g.is_active === false || g.is_active === 0 || g.is_active === '0' || g.isActive === false || g.isActive === 0) {
    return false;
  }
  const st = String(g.status || '').toUpperCase();
  if (st === 'PAUSED' || st === 'CLOSED' || st === 'ENDED') {
    return false;
  }
  return true;
};

/**
 * Helper chuẩn hóa Icon của Tựa Game / Đợt phát Giveaway:
 * Tự động loại bỏ link chết từ các domain cũ (như codemoi.net) và fallback về icon chuẩn WebP/JPG nội bộ.
 */
export const resolveGameIcon = (gw?: { game_slug?: string; game_icon_url?: string; cover_image_url?: string } | null): string => {
  const slug = gw?.game_slug || '';
  const raw = gw?.game_icon_url || gw?.cover_image_url || '';
  if (!raw || raw.includes('codemoi.net') || raw.startsWith('/game-icons')) {
    return slug ? `/game_icons/${slug}.webp` : '/game_icons/default.webp';
  }
  return raw;
};

export const PrivateCodesModule: React.FC<PrivateCodesModuleProps> = ({ onShowToast }) => {
  const [giveaways, setGiveaways] = useState<GiveawayCampaign[]>([]);
  const [games, setGames] = useState<GameAdminRecord[]>([]);
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'campaigns' | 'wheel' | 'api'>('campaigns');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());

  // --- TÍNH NĂNG CHỌN NHANH GAME: Danh sách các game có sự kiện giveaway ---
  const uniqueGamesWithGiveaways = React.useMemo(() => {
    const map = new Map<string, { slug: string; name: string; icon: string; count: number; activeCount: number }>();
    giveaways.forEach((gw) => {
      const slug = gw.game_slug || 'other';
      const isAct = isGwActive(gw);
      const existing = map.get(slug);
      if (existing) {
        existing.count++;
        if (isAct) existing.activeCount++;
      } else {
        map.set(slug, {
          slug,
          name: gw.game_name || slug,
          icon: resolveGameIcon(gw),
          count: 1,
          activeCount: isAct ? 1 : 0,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [giveaways]);

  // --- GIVEAWAY API MANAGEMENT & QUICK TESTER STATE ---
  const [giveawayApiKeys, setGiveawayApiKeys] = useState<any[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState<'30' | '90' | '365' | 'permanent'>('90');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{
    key_name: string;
    raw_key: string;
    scope: string;
    expires_at?: string;
  } | null>(null);
  const [copiedKeyText, setCopiedKeyText] = useState<string | null>(null);

  // --- QUICK API TESTER ---
  const [testAction, setTestAction] = useState<'GET_LIST' | 'GET_DETAIL' | 'ADD_CODES' | 'TOGGLE_ACTIVE' | 'RESET_COOLDOWN' | 'OPEN_NOW'>('GET_LIST');
  const [testApiKey, setTestApiKey] = useState('wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a');
  const [testSelectedGwId, setTestSelectedGwId] = useState('');
  const [testCodesInput, setTestCodesInput] = useState('');
  const [testActiveState, setTestActiveState] = useState(true);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testApiResponse, setTestApiResponse] = useState<any | null>(null);
  const [testApiLatency, setTestApiLatency] = useState<number | null>(null);
  const [testApiStatus, setTestApiStatus] = useState<number | null>(null);
  const [apiDocCategory, setApiDocCategory] = useState<'curl_get' | 'curl_add_codes' | 'curl_create' | 'curl_open_now' | 'js_client'>('curl_get');

  // --- SHOW / HIDE VIRTUAL METRICS TOGGLE ---
  const [showVirtualStats, setShowVirtualStats] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wcg_admin_show_virtual_stats') !== 'false';
  });

  const [showAdminClaimed, setShowAdminClaimed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wcg_admin_show_claimed_gw') !== 'false';
  });

  const [showAdminStock, setShowAdminStock] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wcg_admin_show_stock_gw') !== 'false';
  });

  // --- QUICK FOMO ADJUST MODAL STATE ---
  const [fomoAdjustCampaign, setFomoAdjustCampaign] = useState<GiveawayCampaign | null>(null);
  const [isResettingAllFomo, setIsResettingAllFomo] = useState(false);

  // --- CREATE / EDIT GIVEAWAY MODAL STATE ---
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GiveawayCampaign | null>(null);
  const [formData, setFormData] = useState({
    title: 'Code riêng Genshin Impact',
    game_slug: 'genshin-impact',
    game_name: 'Genshin Impact',
    description: 'Code dùng cho 1 tài khoản, 1 loại dùng 1 lần.',
    rewards: 'Code ngẫu nhiên',
    use_template: true,
    total_codes: 0,
    claimed_codes: 0,
    min_account_age_days: 0,
    max_per_user: 1,
    max_per_ip: 1,
    cooldown_minutes: 60,
    cooldown_hours: 1,
    global_cooldown_seconds: 0,
    last_global_claim_at: '',
    enable_auto_simulation: true,
    simulation_idle_threshold_minutes: 0,
    virtual_remaining_addition: 20,
    virtual_remaining_current: 20,
    custom_success_msg: '',
    custom_cooldown_msg: '',
    custom_out_of_stock_msg: '',
    enable_waiting_room: true,
    waiting_users_min: 25,
    waiting_users_max: 85,
    custom_banner_enabled: true,
    custom_banner_text: 'Tham gia nhóm zalo của web tại đây',
    custom_banner_link: 'https://zalo.me/g/qdtlmj2tebfa0baraedg',
    show_claimed_count: true,
    virtual_claimed_offset: 0,
    start_time: '',
    end_time: '',
    is_active: true,
    cover_image_url: '/game_icons/genshin-impact.webp',
    packages: [] as any[],
  });

  // --- BATCH CODE POOL MODAL STATE (KHO MÃ) ---
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [currentCampaignForPool, setCurrentCampaignForPool] = useState<GiveawayCampaign | null>(null);
  const [batchPoolLines, setBatchPoolLines] = useState('');
  const [selectedPoolCodes, setSelectedPoolCodes] = useState<string[]>([]);
  const [poolTab, setPoolTab] = useState<'ADD' | 'LIST'>('ADD');

  // --- CLAIM HISTORY MODAL STATE (LỊCH SỬ) ---
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentCampaignForHistory, setCurrentCampaignForHistory] = useState<GiveawayCampaign | null>(null);
  const [historyFilterTab, setHistoryFilterTab] = useState<'ALL' | 'REAL' | 'SIMULATED'>('ALL');
  const [isSimulating, setIsSimulating] = useState(false);

  // Delete Confirm Modal
  const [deletingCampaign, setDeletingCampaign] = useState<GiveawayCampaign | null>(null);

  // Persistence loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPool, setIsSavingPool] = useState(false);

  // Warn user before leaving if saving is currently in flight
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving || isSavingPool) {
        e.preventDefault();
        e.returnValue = 'Hệ thống đang lưu dữ liệu lên máy chủ, vui lòng đợi trong giây lát!';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving, isSavingPool]);

  useEffect(() => {
    setGames(adminDataService.getGames());
    loadData();

    const handleSync = () => {
      setGames(adminDataService.getGames());
      loadData();
    };

    window.addEventListener('wcg_admin_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('wcg_admin_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const getAdminHeaders = (): Record<string, string> => {
    const token =
      localStorage.getItem('wcg_auth_token') ||
      sessionStorage.getItem('wcg_auth_token') ||
      '';
    const syncKey =
      sessionStorage.getItem('wcg_admin_sync_key') ||
      localStorage.getItem('wcg_admin_sync_key') ||
      'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Sync-Key': syncKey,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const loadGiveawayApiKeys = async () => {
    setIsLoadingApiKeys(true);
    try {
      const res = await fetch('/api/api-keys', {
        headers: getAdminHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.keys)) {
        const filtered = data.keys.filter((k: any) => {
          const s = (k.scope || '').toUpperCase();
          return s.includes('GIVEAWAYS_FULL') || s.includes('ADMIN_FULL') || s.includes('FULL') || s === '*';
        });
        setGiveawayApiKeys(filtered);
      }
    } catch (err: any) {
      console.warn('Failed to load api keys:', err);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const handleCreateGiveawayKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      onShowToast('Thiếu thông tin', 'Vui lòng nhập tên cho khóa API', 'error');
      return;
    }

    setIsCreatingKey(true);
    try {
      let expiresAt: string | null = null;
      if (newKeyExpiry !== 'permanent') {
        const days = parseInt(newKeyExpiry, 10) || 90;
        const d = new Date();
        d.setDate(d.getDate() + days);
        expiresAt = d.toISOString();
      }

      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: 'create',
          key_name: newKeyName.trim(),
          scope: 'GIVEAWAYS_FULL',
          description: `Khóa API toàn quyền quản lý Giveaway: ${newKeyName.trim()}`,
          expires_at: expiresAt,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.raw_key) {
        setGeneratedKeyResult({
          key_name: data.key.key_name,
          raw_key: data.raw_key,
          scope: data.key.scope,
          expires_at: data.key.expires_at,
        });
        setTestApiKey(data.raw_key);
        setNewKeyName('');
        onShowToast('Tạo Khóa API Thành Công!', `Đã tạo khóa quản lý Giveaway: ${data.key.key_name}`, 'success');
        loadGiveawayApiKeys();
      } else {
        onShowToast('Không thể tạo khóa API', data?.message || data?.error || 'Lỗi không xác định', 'error');
      }
    } catch (err: any) {
      onShowToast('Lỗi kết nối', err?.message || 'Không thể gửi yêu cầu tạo khóa', 'error');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleToggleApiKey = async (keyItem: any) => {
    try {
      const nextActive = keyItem.is_active === 1 ? 0 : 1;
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: 'toggle',
          key_id: keyItem.id,
          is_active: nextActive,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        onShowToast('Đã đổi trạng thái', `Khóa ${keyItem.key_name} đã ${nextActive === 1 ? 'kích hoạt' : 'tạm ngưng'}.`, 'success');
        loadGiveawayApiKeys();
      } else {
        onShowToast('Lỗi thao tác', data?.message || 'Không thể đổi trạng thái khóa', 'error');
      }
    } catch (err: any) {
      onShowToast('Lỗi kết nối', err?.message || 'Không thể kết nối đến máy chủ', 'error');
    }
  };

  const handleDeleteApiKey = async (keyItem: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn khóa API "${keyItem.key_name}"? Mọi tích hợp dùng khóa này sẽ ngừng hoạt động ngay lập tức.`)) {
      return;
    }
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: 'delete',
          key_id: keyItem.id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        onShowToast('Đã xóa khóa API', `Đã xóa vĩnh viễn khóa "${keyItem.key_name}".`, 'success');
        loadGiveawayApiKeys();
      } else {
        onShowToast('Lỗi thao tác', data?.message || 'Không thể xóa khóa', 'error');
      }
    } catch (err: any) {
      onShowToast('Lỗi kết nối', err?.message || 'Không thể kết nối đến máy chủ', 'error');
    }
  };

  const handleRunTestApi = async () => {
    setIsTestingApi(true);
    setTestApiResponse(null);
    setTestApiStatus(null);
    const startTime = performance.now();

    try {
      let url = '/api/giveaways/manage';
      let method = 'GET';
      let body: any = null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (testApiKey.trim()) {
        headers['X-Api-Key'] = testApiKey.trim();
      }

      if (testAction === 'GET_LIST') {
        method = 'GET';
      } else if (testAction === 'GET_DETAIL') {
        if (!testSelectedGwId) {
          onShowToast('Thiếu thông tin', 'Vui lòng chọn 1 đợt phát để tra cứu chi tiết', 'error');
          setIsTestingApi(false);
          return;
        }
        url += `?id=${encodeURIComponent(testSelectedGwId)}`;
        method = 'GET';
      } else if (testAction === 'ADD_CODES') {
        if (!testSelectedGwId) {
          onShowToast('Thiếu thông tin', 'Vui lòng chọn 1 đợt phát để nạp mã', 'error');
          setIsTestingApi(false);
          return;
        }
        const codes = testCodesInput.split(/[\r\n,]+/).map((c) => c.trim()).filter(Boolean);
        if (codes.length === 0) {
          onShowToast('Thiếu mã', 'Vui lòng nhập ít nhất 1 mã giftcode vào ô bên dưới', 'error');
          setIsTestingApi(false);
          return;
        }
        method = 'PUT';
        body = JSON.stringify({
          action: 'ADD_CODES',
          id: testSelectedGwId,
          codes: codes,
        });
      } else if (testAction === 'TOGGLE_ACTIVE') {
        if (!testSelectedGwId) {
          onShowToast('Thiếu thông tin', 'Vui lòng chọn 1 đợt phát để đổi trạng thái', 'error');
          setIsTestingApi(false);
          return;
        }
        method = 'PUT';
        body = JSON.stringify({
          action: 'TOGGLE_ACTIVE',
          id: testSelectedGwId,
          is_active: testActiveState,
        });
      } else if (testAction === 'RESET_COOLDOWN') {
        if (!testSelectedGwId) {
          onShowToast('Thiếu thông tin', 'Vui lòng chọn 1 đợt phát để reset cooldown', 'error');
          setIsTestingApi(false);
          return;
        }
        method = 'PUT';
        body = JSON.stringify({
          action: 'RESET_COOLDOWN',
          id: testSelectedGwId,
          target: 'GLOBAL',
        });
      } else if (testAction === 'OPEN_NOW') {
        if (!testSelectedGwId) {
          onShowToast('Thiếu thông tin', 'Vui lòng chọn 1 đợt phát để mở ngay lập tức', 'error');
          setIsTestingApi(false);
          return;
        }
        method = 'PUT';
        body = JSON.stringify({
          action: 'OPEN_NOW',
          id: testSelectedGwId,
        });
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
      });

      const latency = Math.round(performance.now() - startTime);
      setTestApiLatency(latency);
      setTestApiStatus(res.status);

      const json = await res.json().catch(() => ({ raw_text: 'Non-JSON response' }));
      setTestApiResponse(json);

      if (res.ok && json?.success) {
        onShowToast('Gọi API Thành Công!', `HTTP ${res.status} (${latency}ms)`, 'success');
        if (testAction === 'ADD_CODES' || testAction === 'TOGGLE_ACTIVE' || testAction === 'RESET_COOLDOWN' || testAction === 'OPEN_NOW') {
          loadData();
        }
      } else {
        onShowToast(`Lỗi HTTP ${res.status}`, json?.message || 'Yêu cầu API trả về lỗi', 'error');
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setTestApiLatency(latency);
      setTestApiStatus(0);
      setTestApiResponse({ error: err?.message || 'Network request failed' });
      onShowToast('Lỗi kết nối API', err?.message || 'Không thể gửi request', 'error');
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyText(label);
    onShowToast('Đã sao chép!', label, 'success');
    setTimeout(() => {
      setCopiedKeyText(null);
    }, 2500);
  };

  const loadData = () => {
    const gList = adminDataService.getGiveaways();
    setGiveaways(gList);
    if (gList.length > 0 && !testSelectedGwId) {
      setTestSelectedGwId(gList[0].id);
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    onShowToast('Đã sao chép mã', code, 'info');
  };

  // --- OPEN MODAL HANDLERS ---
  const handleOpenCreate = () => {
    setEditingItem(null);
    const defaultGame = games[0];
    const initialGameName = defaultGame?.name || 'Genshin Impact';
    setFormData({
      title: `Code riêng ${initialGameName}`,
      game_slug: defaultGame?.slug || 'genshin-impact',
      game_name: initialGameName,
      description: 'Code dùng cho 1 tài khoản, 1 loại dùng 1 lần.',
      rewards: 'Code ngẫu nhiên',
      use_template: true,
      total_codes: 0,
      claimed_codes: 0,
      min_account_age_days: 0,
      max_per_user: 1,
      max_per_ip: 1,
      cooldown_minutes: 60,
      cooldown_hours: 1,
      global_cooldown_seconds: 0,
      last_global_claim_at: '',
      enable_auto_simulation: true,
      simulation_idle_threshold_minutes: 0,
      virtual_remaining_addition: 20,
      virtual_remaining_current: 20,
      custom_success_msg: '',
      custom_cooldown_msg: 'Đợt phát trước đạo hữu {last_user} đã nhanh tay đi trước, đạo hữu vui lòng đợi {time_left} rồi thử sức lại.',
      custom_out_of_stock_msg: '',
      enable_waiting_room: true,
      waiting_users_min: 25,
      waiting_users_max: 85,
      custom_banner_enabled: true,
      custom_banner_text: 'Tham gia nhóm zalo của web tại đây',
      custom_banner_link: 'https://zalo.me/g/qdtlmj2tebfa0baraedg',
      show_claimed_count: true,
      virtual_claimed_offset: 0,
      start_time: new Date().toISOString().split('T')[0],
      end_time: '',
      is_active: true,
      cover_image_url: defaultGame?.icon_url || '/game_icons/genshin-impact.webp',
      packages: [],
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (gw: GiveawayCampaign) => {
    setEditingItem(gw);
    const poolCount = gw.codes_pool?.length || 0;
    const currentTotal = poolCount > 0 ? poolCount + (gw.claimed_codes || 0) : (gw.total_codes || 0);
    setFormData({
      title: gw.title,
      game_slug: gw.game_slug,
      game_name: gw.game_name,
      description: gw.description || '',
      rewards: gw.rewards || '',
      use_template: gw.use_template !== false,
      total_codes: currentTotal,
      claimed_codes: gw.claimed_codes || 0,
      min_account_age_days: gw.min_account_age_days !== undefined ? Number(gw.min_account_age_days) : 0,
      max_per_user: gw.max_per_user !== undefined ? Number(gw.max_per_user) : 1,
      max_per_ip: gw.max_per_ip !== undefined ? Number(gw.max_per_ip) : 1,
      cooldown_minutes: gw.cooldown_minutes !== undefined && gw.cooldown_minutes !== null
        ? Number(gw.cooldown_minutes)
        : (gw.cooldown_hours !== undefined ? Math.round(Number(gw.cooldown_hours) * 60) : 60),
      cooldown_hours: gw.cooldown_hours !== undefined
        ? Number(gw.cooldown_hours)
        : (gw.cooldown_minutes !== undefined ? Number((Number(gw.cooldown_minutes) / 60).toFixed(2)) : 1),
      global_cooldown_seconds: Number(gw.global_cooldown_seconds || 0),
      last_global_claim_at: gw.last_global_claim_at || '',
      enable_auto_simulation: gw.enable_auto_simulation !== false,
      simulation_idle_threshold_minutes: gw.simulation_idle_threshold_minutes !== undefined ? Number(gw.simulation_idle_threshold_minutes) : 0,
      virtual_remaining_addition: gw.virtual_remaining_addition !== undefined ? Number(gw.virtual_remaining_addition) : 20,
      virtual_remaining_current: gw.virtual_remaining_current !== undefined ? Number(gw.virtual_remaining_current) : (gw.virtual_remaining_addition !== undefined ? Number(gw.virtual_remaining_addition) : 20),
      custom_success_msg: gw.custom_success_msg || '',
      custom_cooldown_msg: gw.custom_cooldown_msg || '',
      custom_out_of_stock_msg: gw.custom_out_of_stock_msg || '',
      enable_waiting_room: gw.enable_waiting_room !== false,
      waiting_users_min: gw.waiting_users_min !== undefined ? Number(gw.waiting_users_min) : 25,
      waiting_users_max: gw.waiting_users_max !== undefined ? Number(gw.waiting_users_max) : 85,
      custom_banner_enabled: gw.custom_banner_enabled !== undefined ? Boolean(gw.custom_banner_enabled) : true,
      custom_banner_text: gw.custom_banner_text || 'Tham gia nhóm zalo của web tại đây',
      custom_banner_link: gw.custom_banner_link || 'https://zalo.me/g/qdtlmj2tebfa0baraedg',
      show_claimed_count: gw.show_claimed_count !== false,
      virtual_claimed_offset: gw.virtual_claimed_offset || 0,
      start_time: gw.start_time ? (gw.start_time.includes('T') ? gw.start_time.substring(0, 16) : gw.start_time) : '',
      end_time: gw.end_time ? (gw.end_time.includes('T') ? gw.end_time.substring(0, 16) : gw.end_time) : '',
      is_active: gw.is_active,
      cover_image_url: gw.cover_image_url || gw.game_icon_url || '',
      packages: gw.packages || [],
    });
    setIsFormOpen(true);
  };

  const handleResetGlobalCooldown = async (gw: GiveawayCampaign) => {
    gw.last_global_claim_at = '';
    adminDataService.saveGiveawayItem(gw);
    await adminDataService.saveGiveawaysToServer();
    loadData();
    onShowToast('Đã mở đợt phát ngay', `Đã xóa thời gian chờ toàn sàn cho "${gw.title}". Khách có thể giật mã tiếp theo ngay lập tức.`, 'success');
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/giveaways/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        onShowToast(
          'Quét mô phỏng hoàn tất',
          `Đã quét ${data.scannedCount} event, mô phỏng thành công ${data.simulatedCount} event.`,
          'success'
        );
        loadData();
      } else {
        onShowToast('Lỗi quét mô phỏng', data?.error || 'Không thể quét mô phỏng', 'error');
      }
    } catch (err: any) {
      onShowToast('Lỗi kết nối', err?.message || 'Lỗi khi gọi API mô phỏng', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.game_name.trim()) {
      onShowToast('Lỗi', 'Vui lòng nhập tên đợt phát và chọn game.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const existingPool = editingItem?.codes_pool || [];
      const poolLength = Array.isArray(existingPool) && existingPool.length > 0
        ? existingPool.length
        : Math.max(0, Number(editingItem?.remaining_codes || 0));
      const safeClaimed = editingItem ? Number(editingItem.claimed_codes || 0) : 0;
      const calculatedTotal = poolLength + safeClaimed;

      adminDataService.saveGiveawayItem({
        id: editingItem?.id,
        title: formData.title.trim(),
        game_slug: formData.game_slug.trim().toLowerCase(),
        game_name: formData.game_name.trim(),
        description: formData.description.trim(),
        rewards: formData.rewards.trim(),
        use_template: formData.use_template !== false,
        total_codes: calculatedTotal,
        remaining_codes: poolLength,
        claimed_codes: safeClaimed,
        min_account_age_days: Number(formData.min_account_age_days),
        max_per_user: Number(formData.max_per_user),
        max_per_ip: Number(formData.max_per_ip),
        cooldown_minutes: Number(formData.cooldown_minutes) || 0,
        cooldown_hours: Number(formData.cooldown_hours) || Number(((Number(formData.cooldown_minutes) || 0) / 60).toFixed(2)),
        global_cooldown_seconds: Number(formData.global_cooldown_seconds) || 0,
        last_global_claim_at: formData.last_global_claim_at,
        last_claimer_name: editingItem?.last_claimer_name || '',
        enable_auto_simulation: formData.enable_auto_simulation !== false,
        simulation_idle_threshold_minutes: Number(formData.simulation_idle_threshold_minutes) || 0,
        virtual_remaining_addition: Math.max(0, Number(formData.virtual_remaining_addition !== undefined ? formData.virtual_remaining_addition : 20)),
        virtual_remaining_current: Math.max(0, Number(formData.virtual_remaining_current !== undefined ? formData.virtual_remaining_current : (formData.virtual_remaining_addition || 20))),
        last_real_claim_at: editingItem?.last_real_claim_at || '',
        last_simulated_claim_at: editingItem?.last_simulated_claim_at || '',
        is_last_claim_simulated: Boolean(editingItem?.is_last_claim_simulated),
        custom_success_msg: formData.custom_success_msg.trim(),
        custom_cooldown_msg: formData.custom_cooldown_msg.trim(),
        custom_out_of_stock_msg: formData.custom_out_of_stock_msg.trim(),
        enable_waiting_room: formData.enable_waiting_room,
        waiting_users_min: Number(formData.waiting_users_min) || 0,
        waiting_users_max: Number(formData.waiting_users_max) || 0,
        custom_banner_enabled: Boolean(formData.custom_banner_enabled),
        custom_banner_text: formData.custom_banner_text ? formData.custom_banner_text.trim() : 'Tham gia nhóm zalo của web tại đây',
        custom_banner_link: formData.custom_banner_link ? formData.custom_banner_link.trim() : '',
        show_claimed_count: formData.show_claimed_count,
        virtual_claimed_offset: Number(formData.virtual_claimed_offset) || 0,
        start_time: formData.start_time ? formData.start_time : null,
        end_time: formData.end_time ? formData.end_time : null,
        created_at: editingItem?.created_at || (editingItem as any)?.createdAt || new Date().toISOString(),
        is_active: formData.is_active,
        packages: formData.packages || editingItem?.packages || [],
        game_icon_url: formData.cover_image_url || `/game_icons/${formData.game_slug}.webp`,
        cover_image_url: formData.cover_image_url,
        codes_pool: existingPool,
        claim_history: editingItem?.claim_history || [],
      });

      // Await direct fast D1 persistence
      await adminDataService.saveGiveawaysToServer();

      onShowToast(
        'Thành công',
        editingItem
          ? `Đã cập nhật đợt phát "${formData.title}".`
          : `Đã tạo đợt phát code riêng "${formData.title}" mới.`,
        'success'
      );
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      onShowToast('Lỗi lưu đợt phát', err?.message || 'Có lỗi khi lưu lên máy chủ D1', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- KHO MÃ (CODE POOL) HANDLERS ---
  const handleOpenPoolModal = (gw: GiveawayCampaign) => {
    setCurrentCampaignForPool(gw);
    setBatchPoolLines('');
    setSelectedPoolCodes([]);
    const pool = Array.isArray(gw.codes_pool) ? gw.codes_pool : [];
    // MẶC ĐỊNH MỞ TAB 'LIST' (Danh sách mã) KHI KHO ĐÃ CÓ MÃ ĐỂ ADMIN THẤY NGAY DANH SÁCH MÃ THẬT
    setPoolTab(pool.length > 0 ? 'LIST' : 'ADD');
    setIsPoolModalOpen(true);
  };

  const handleSavePoolCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCampaignForPool) return;

    const newCodes = batchPoolLines
      .split('\n')
      .map((l) => l.trim().toUpperCase())
      .filter(Boolean);

    if (newCodes.length === 0) {
      onShowToast('Lỗi', 'Vui lòng nhập ít nhất một mã code.', 'error');
      return;
    }

    setIsSavingPool(true);
    try {
      const currentPool = currentCampaignForPool.codes_pool || [];
      const currentSet = new Set(currentPool.map((c: any) => String(c).trim().toUpperCase()));

      const uniqueToAdd: string[] = [];
      const seenBatch = new Set<string>();
      let rejectedDuplicatesCount = 0;

      for (const code of newCodes) {
        if (currentSet.has(code) || seenBatch.has(code)) {
          rejectedDuplicatesCount++;
        } else {
          seenBatch.add(code);
          uniqueToAdd.push(code);
        }
      }

      if (uniqueToAdd.length === 0) {
        onShowToast('Thông báo', `Không có mã mới nào được nạp. Toàn bộ ${rejectedDuplicatesCount} mã nhập vào đều đã tồn tại trong kho hoặc trùng lặp nội bộ.`, 'info');
        setIsSavingPool(false);
        return;
      }

      const updatedPool = adminDataService.deduplicatePoolCodes([...currentPool, ...uniqueToAdd]);

      currentCampaignForPool.codes_pool = updatedPool;
      currentCampaignForPool.remaining_codes = updatedPool.length;
      currentCampaignForPool.total_codes = updatedPool.length + (currentCampaignForPool.claimed_codes || 0);
      currentCampaignForPool.updated_at = new Date().toISOString();

      adminDataService.saveGiveawayItem(currentCampaignForPool);
      await adminDataService.saveGiveawaysToServer();

      // Direct immediate persistence to D1 giveaway_codes table (Zero latency bypass)
      try {
        await fetch('/api/giveaways/manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
          body: JSON.stringify({
            action: 'ADD_CODES',
            id: currentCampaignForPool.id,
            codes: uniqueToAdd,
          }),
        });
      } catch (d1Err) {
        console.warn('[Direct D1 ADD_CODES error]', d1Err);
      }

      const successToastDesc = rejectedDuplicatesCount > 0
        ? `Đã thêm ${uniqueToAdd.length} mã mới vào kho phát riêng của "${currentCampaignForPool.title}" (đã loại bỏ ${rejectedDuplicatesCount} mã trùng lặp).`
        : `Đã thêm ${uniqueToAdd.length} mã vào kho phát riêng của "${currentCampaignForPool.title}". Dữ liệu đã lưu vĩnh viễn trên Cloudflare D1.`;

      onShowToast('Đã nạp kho mã!', successToastDesc, 'success');
      setBatchPoolLines('');
      setIsPoolModalOpen(false);
      loadData();
    } catch (err: any) {
      onShowToast('Lỗi lưu kho mã', err?.message || 'Có lỗi khi lưu kho mã lên máy chủ D1', 'error');
    } finally {
      setIsSavingPool(false);
    }
  };

  const handleDeduplicateCurrentPool = async () => {
    if (!currentCampaignForPool) return;
    const pool = currentCampaignForPool.codes_pool || [];
    const seen = new Set<string>();
    const deduped: string[] = [];
    let dCount = 0;

    for (const c of pool) {
      const clean = String(c || '').trim();
      if (!clean) continue;
      const norm = clean.toUpperCase();
      if (seen.has(norm)) {
        dCount++;
      } else {
        seen.add(norm);
        deduped.push(clean);
      }
    }

    if (dCount === 0) {
      onShowToast('Thông báo', 'Kho mã không có mã trùng lặp nào.', 'info');
      return;
    }

    setIsSavingPool(true);
    try {
      currentCampaignForPool.codes_pool = deduped;
      currentCampaignForPool.remaining_codes = deduped.length;
      currentCampaignForPool.total_codes = deduped.length + (currentCampaignForPool.claimed_codes || 0);
      currentCampaignForPool.updated_at = new Date().toISOString();

      adminDataService.saveGiveawayItem(currentCampaignForPool);
      await adminDataService.saveGiveawaysToServer();

      onShowToast('Đã gỡ trùng!', `Đã loại bỏ ${dCount} mã trùng lặp, giữ lại ${deduped.length} mã duy nhất.`, 'success');
      loadData();
    } catch (err: any) {
      onShowToast('Lỗi gỡ trùng', err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsSavingPool(false);
    }
  };

  const handleForcePushPoolToD1 = async (gw: GiveawayCampaign) => {
    if (!gw || !Array.isArray(gw.codes_pool) || gw.codes_pool.length === 0) return;
    setIsSavingPool(true);
    try {
      const res = await fetch('/api/giveaways/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({
          action: 'RESTOCK',
          id: gw.id,
          codes: gw.codes_pool,
        }),
      });
      await adminDataService.saveGiveawaysToServer();
      loadData();
      onShowToast(
        'Đồng bộ kho mã thành công!',
        `Toàn bộ ${gw.codes_pool.length} mã đã được lưu trực tiếp vào cơ sở dữ liệu Cloudflare D1. Ngoài Web lập tức hiển thị còn mã!`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi đồng bộ', err?.message || 'Không thể đồng bộ kho mã lên D1', 'error');
    } finally {
      setIsSavingPool(false);
    }
  };

  const handleDeletePoolCode = async (code: string) => {
    if (!currentCampaignForPool) return;
    const ok = adminDataService.deleteGiveawayPoolCode(currentCampaignForPool.id, code);
    if (ok) {
      const updatedPool = (currentCampaignForPool.codes_pool || []).filter((c) => c !== code);
      try {
        await fetch('/api/giveaways/manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
          body: JSON.stringify(
            updatedPool.length === 0
              ? { action: 'CLEAR_POOL', id: currentCampaignForPool.id }
              : { action: 'DELETE_POOL_CODES', id: currentCampaignForPool.id, codes: [code] }
          ),
        });
      } catch {}
      await adminDataService.saveGiveawaysToServer();
      onShowToast('Đã xóa mã', `Đã xóa mã ${code} khỏi kho phát riêng.`, 'info');
      setCurrentCampaignForPool({
        ...currentCampaignForPool,
        codes_pool: updatedPool,
        remaining_codes: updatedPool.length,
        total_codes: updatedPool.length + (currentCampaignForPool.claimed_codes || 0),
      });
      loadData();
    }
  };

  const handleBulkDeletePoolCodes = async () => {
    if (!currentCampaignForPool || selectedPoolCodes.length === 0) return;
    const count = adminDataService.deleteGiveawayPoolCodesBulk(currentCampaignForPool.id, selectedPoolCodes);
    const codeSet = new Set(selectedPoolCodes);
    const updatedPool = (currentCampaignForPool.codes_pool || []).filter((c) => !codeSet.has(c));
    try {
      await fetch('/api/giveaways/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(
          updatedPool.length === 0
            ? { action: 'CLEAR_POOL', id: currentCampaignForPool.id }
            : { action: 'DELETE_POOL_CODES', id: currentCampaignForPool.id, codes: selectedPoolCodes }
        ),
      });
    } catch {}
    await adminDataService.saveGiveawaysToServer();
    onShowToast('Đã xóa', `Đã xóa ${count} mã khỏi kho phát riêng.`, 'success');
    setCurrentCampaignForPool({
      ...currentCampaignForPool,
      codes_pool: updatedPool,
      remaining_codes: updatedPool.length,
      total_codes: updatedPool.length + (currentCampaignForPool.claimed_codes || 0),
    });
    setSelectedPoolCodes([]);
    loadData();
  };

  // --- CLAIM HISTORY HANDLER ---
  const handleOpenHistoryModal = (gw: GiveawayCampaign) => {
    setCurrentCampaignForHistory(gw);
    setIsHistoryModalOpen(true);
  };

  // --- TOGGLE STATUS (ĐÓNG / MỞ SỰ KIỆN RIÊNG LẺ) ---
  const handleToggleActive = async (gw: GiveawayCampaign) => {
    const currentlyActive = isGwActive(gw);
    const newStatus = !currentlyActive;
    const poolCount = Array.isArray(gw.codes_pool) && gw.codes_pool.length > 0 ? gw.codes_pool.length : Math.max(0, Number(gw.remaining_codes || 0));
    const updatedGw: GiveawayCampaign = {
      ...gw,
      is_active: newStatus,
      status: newStatus ? 'ACTIVE' : 'PAUSED',
    };
    adminDataService.saveGiveawayItem(updatedGw);
    await adminDataService.saveGiveawaysToServer();

    try {
      await fetch('/api/giveaways/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ action: 'TOGGLE_ACTIVE', id: gw.id, is_active: newStatus }),
      });
    } catch {}

    loadData();
    onShowToast(
      newStatus ? 'Đã mở sự kiện!' : 'Đã đóng sự kiện!',
      newStatus
        ? `Sự kiện "${gw.title}" đã mở lại. Ngoài Web hiển thị số lượng và cho phép nhận quà.`
        : `Sự kiện "${gw.title}" đã đóng riêng lẻ. Mã thật (${poolCount} mã) vẫn để trong kho, ngoài Web báo HẾT MÃ.`,
      newStatus ? 'success' : 'info'
    );
  };

  // --- THAO TÁC HÀNG LOẠT VỚI CÁC MỤC ĐÃ CHỌN (BATCH TOGGLE SELECTED) ---
  const handleBatchToggleSelected = async (enable: boolean) => {
    if (selectedCampaignIds.size === 0) return;
    const count = selectedCampaignIds.size;
    const actionText = enable ? 'mở lại' : 'đóng';
    if (!window.confirm(`Bạn có chắc muốn ${actionText} ${count} sự kiện Giveaway đã chọn không?\n${enable ? 'Sau khi mở: Ngoài web sẽ hiển thị số lượng và cho phép nhận mã.' : 'Sau khi đóng: Mã thật vẫn để trong kho 100%, ngoài web sẽ báo HẾT MÃ.'}`)) {
      return;
    }

    const currentList = adminDataService.getGiveaways();
    const targetIdsArray = Array.from(selectedCampaignIds);
    currentList.forEach((gw) => {
      if (selectedCampaignIds.has(gw.id)) {
        gw.is_active = enable;
        gw.status = enable ? 'ACTIVE' : 'PAUSED';
        adminDataService.saveGiveawayItem(gw);
      }
    });
    await adminDataService.saveGiveawaysToServer();

    try {
      await fetch('/api/giveaways/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ action: 'BATCH_TOGGLE_ACTIVE', ids: targetIdsArray, is_active: enable }),
      });
    } catch {}

    loadData();
    onShowToast(
      enable ? 'Đã mở các sự kiện đã chọn!' : 'Đã đóng các sự kiện đã chọn!',
      `Đã cập nhật trạng thái cho ${count} sự kiện. ${enable ? 'Khách có thể nhận mã.' : 'Mã thật vẫn để trong kho, ngoài web báo Hết Mã.'}`,
      enable ? 'success' : 'info'
    );
  };

  // --- MỞ NGAY LẬP TỨC (OPEN NOW / FORCE ACTIVE & CLEAR FUTURE START TIME) ---
  const handleOpenNow = async (gw: GiveawayCampaign) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedGw: GiveawayCampaign = {
      ...gw,
      start_time: todayStr,
      is_active: true,
      status: 'ACTIVE',
      last_global_claim_at: '',
    };
    adminDataService.saveGiveawayItem(updatedGw);
    await adminDataService.saveGiveawaysToServer();

    try {
      await fetch('/api/giveaways/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ action: 'OPEN_NOW', id: gw.id }),
      });
    } catch {}

    loadData();
    onShowToast(
      'Đã mở giật mã ngay lập tức!',
      `Chiến dịch "${gw.title}" đã chuyển sang trạng thái LIVE (start_time: ${todayStr}). Khách có thể giật mã bình thường!`,
      'success'
    );
  };

  const handleBatchToggleAll = async (enable: boolean) => {
    const actionText = enable ? 'mở tất cả' : 'đóng tất cả';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} các đợt phát Giveaway không?`)) {
      return;
    }
    const currentList = adminDataService.getGiveaways();
    currentList.forEach((gw) => {
      gw.is_active = enable;
      adminDataService.saveGiveawayItem(gw);
    });
    await adminDataService.saveGiveawaysToServer();
    loadData();
    onShowToast(
      enable ? 'Đã mở tất cả đợt phát!' : 'Đã đóng tất cả đợt phát!',
      `Đã cập nhật trạng thái cho ${currentList.length} đợt phát giveaway.`,
      enable ? 'success' : 'info'
    );
  };

  // --- DELETE CAMPAIGN ---
  const handleDeleteConfirm = async () => {
    if (!deletingCampaign) return;
    adminDataService.deleteGiveaway(deletingCampaign.id);
    await adminDataService.saveGiveawaysToServer();
    onShowToast('Đã xóa', `Đã xóa đợt phát "${deletingCampaign.title}".`, 'info');
    setDeletingCampaign(null);
    loadData();
  };

  const handleResetAllFomoToReal = async () => {
    if (!window.confirm('Bạn có chắc muốn Reset toàn bộ số ảo của tất cả các đợt phát Giveaway về đúng dữ liệu thật 100% (0 ảo)? Web khách sẽ hiển thị chuẩn xác số lượng thật.')) {
      return;
    }
    setIsResettingAllFomo(true);
    try {
      const giveawayItems = giveaways.map((gw) => {
        const poolCount = Array.isArray(gw.codes_pool) && gw.codes_pool.length > 0 ? gw.codes_pool.length : Math.max(0, Number(gw.remaining_codes || 0));
        return {
          id: gw.id,
          claimed_codes: gw.claimed_codes || 0,
          remaining_codes: poolCount,
        };
      });
      await marketingService.resetAllGiveawaysToReal(giveawayItems);
      loadData();
      onShowToast(
        'Đã reset toàn bộ số ảo Giveaway!',
        'Tất cả các đợt phát Giveaway đã được đưa về đúng số lượng thật 100% ngoài web.',
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi reset số ảo', err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsResettingAllFomo(false);
    }
  };

  const handleRandomizeVirtualClaimed = () => {
    const currentList = adminDataService.getGiveaways();
    let updatedCount = 0;
    currentList.forEach((gw) => {
      // Bổ sung số ảo đã giật ngẫu nhiên từ 52 đến 112
      const randomOffset = Math.floor(Math.random() * (112 - 52 + 1)) + 52;
      const updatedGw: GiveawayCampaign = {
        ...gw,
        virtual_claimed_offset: randomOffset,
        show_claimed_count: true,
        virtual_claimed_updated_at: new Date().toISOString(),
      };
      adminDataService.saveGiveawayItem(updatedGw);
      const targetDisp = randomOffset + (Number(updatedGw.claimed_codes) || 0);
      marketingService.syncGiveawayVirtualClaimed(
        updatedGw.id,
        randomOffset,
        true,
        targetDisp,
        updatedGw.virtual_claimed_updated_at
      );
      updatedCount++;
    });
    loadData();
    onShowToast?.(
      'Bổ sung số ảo thành công',
      `Đã cập nhật số ảo đã giật ngẫu nhiên (52–112) cho toàn bộ ${updatedCount} đợt phát code!`,
      'success'
    );
  };

  const activeCount = giveaways.filter(isGwActive).length;
  const inactiveCount = giveaways.filter((g) => !isGwActive(g)).length;

  // Filter & Search: Ưu tiên tìm kiếm toàn diện khi có searchQuery
  const filteredGiveaways = giveaways.filter((g) => {
    // 1. Khi Quản trị viên nhập từ khóa tìm kiếm: Tìm trên 100% các đợt phát, không bị giới hạn bởi chip game hay tab trạng thái
    if (searchQuery.trim()) {
      return smartVietnameseMatch(
        [g.title, g.game_name, g.game_slug, g.description, g.rewards],
        searchQuery
      );
    }
    // 2. Khi không tìm kiếm: Áp dụng bộ lọc chip tựa game và tab trạng thái
    if (selectedGameFilter !== 'ALL' && g.game_slug !== selectedGameFilter) return false;
    if (statusFilter === 'ACTIVE' && !isGwActive(g)) return false;
    if (statusFilter === 'INACTIVE' && isGwActive(g)) return false;
    return true;
  });

  // Sort: Ưu tiên sự kiện đang bật (ACTIVE) và cập nhật gần nhất lên đầu bảng
  const displayedGiveaways = React.useMemo(() => {
    return [...filteredGiveaways].sort((a, b) => {
      // 1. Ưu tiên trạng thái Đang Mở (ACTIVE)
      const actA = isGwActive(a) ? 1 : 0;
      const actB = isGwActive(b) ? 1 : 0;
      if (actA !== actB) return actB - actA;

      // 2. Ưu tiên sự kiện còn mã trong kho (In-stock first)
      const poolA = Array.isArray(a.codes_pool) && a.codes_pool.length > 0 ? a.codes_pool.length : Math.max(0, Number(a.remaining_codes || 0));
      const poolB = Array.isArray(b.codes_pool) && b.codes_pool.length > 0 ? b.codes_pool.length : Math.max(0, Number(b.remaining_codes || 0));
      const inStockA = poolA > 0 ? 1 : 0;
      const inStockB = poolB > 0 ? 1 : 0;
      if (inStockA !== inStockB) return inStockB - inStockA;

      // 3. Nếu cùng còn mã, ưu tiên sự kiện còn nhiều mã hơn
      if (inStockA > 0 && poolA !== poolB) {
        return poolB - poolA;
      }

      // 4. Ưu tiên thời gian cập nhật / tạo mới nhất
      const timeA = Math.max(
        a.updated_at ? new Date(a.updated_at).getTime() : 0,
        a.created_at ? new Date(a.created_at).getTime() : 0
      );
      const timeB = Math.max(
        b.updated_at ? new Date(b.updated_at).getTime() : 0,
        b.created_at ? new Date(b.created_at).getTime() : 0
      );
      return timeB - timeA;
    });
  }, [filteredGiveaways]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Subtab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('campaigns')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'campaigns'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>🎁 Đợt Phát Code (Giveaway)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
            {giveaways.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('wheel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'wheel'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Dices className="w-3.5 h-3.5 text-amber-400" />
          <span>🎡 Quản Lý Vòng Quay May Mắn</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab('api');
            loadGiveawayApiKeys();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'api'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-purple-400" />
          <span>🔑 Kết Nối API Quản Lý</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
            GIVEAWAYS_FULL
          </span>
        </button>
      </div>

      {subTab === 'wheel' ? (
        <LuckyWheelAdminManager onShowToast={onShowToast} contextTitle="Phát Code & Giveaway" />
      ) : subTab === 'api' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* HEADER CARD: TỔNG QUAN API GIVEAWAY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <KeyRound className="w-6 h-6 text-purple-100" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Kết Nối & Quản Lý API Giveaway Tự Động Hóa 24/7
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-mono font-bold">
                      GIVEAWAYS_FULL
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống REST Edge API toàn quyền quản trị các đợt phát code: nạp mã kho D1, tạo chiến dịch, bật/tắt sự kiện, và xóa thời gian chờ.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadGiveawayApiKeys}
                  disabled={isLoadingApiKeys}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApiKeys ? 'animate-spin text-purple-600' : ''}`} />
                  <span>Làm Mới Khóa</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
              <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold block">Quyền Hạn Cấp Phép</span>
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 mt-1 font-mono block">GIVEAWAYS_FULL</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold block">Kiến Trúc Backend</span>
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 mt-1 block">Cloudflare Edge + D1</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">Đồng Bộ Kho Mã</span>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 mt-1 block">Thời Gian Thực (0s)</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold block">Định Dạng Xác Thực</span>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 mt-1 font-mono block">Header: X-Api-Key</span>
              </div>
            </div>
          </div>

          {/* CARD 1: TẠO KHÓA API MỚI */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tạo Khóa API GIVEAWAYS_FULL Mới
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Cấp quyền quản trị đợt phát code cho bot, tool ngoài hoặc cronjob
              </span>
            </div>

            <form onSubmit={handleCreateGiveawayKey} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Tên Định Danh Khóa API <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="VD: Bot Nạp Mã Telegram, Cronjob Nạp Tự Động, Tool Săn Code"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Thời Hạn Hiệu Lực:
                  </label>
                  <select
                    value={newKeyExpiry}
                    onChange={(e: any) => setNewKeyExpiry(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="30">30 Ngày</option>
                    <option value="90">90 Ngày (Khuyến Nghị)</option>
                    <option value="365">1 Năm (365 Ngày)</option>
                    <option value="permanent">Vĩnh Viễn (Không Hết Hạn)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Shield className="w-3.5 h-3.5 text-purple-500" />
                  <span>Quyền tự động gán: <strong className="text-purple-600 dark:text-purple-400 font-mono">GIVEAWAYS_FULL</strong></span>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingKey || !newKeyName.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang Tạo Khóa...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Tạo Khóa API GIVEAWAYS_FULL</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* THÔNG BÁO KHÓA MỚI TẠO (HIỂN THỊ 1 LẦN DUY NHẤT) */}
            {generatedKeyResult && (
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Đã Tạo Khóa API Thành Công: <span className="text-purple-600 dark:text-purple-300">{generatedKeyResult.key_name}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneratedKeyResult(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3 font-mono text-xs">
                  <span className="text-purple-700 dark:text-purple-300 font-bold select-all break-all">
                    {generatedKeyResult.raw_key}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generatedKeyResult.raw_key, 'Mã Khóa API')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-all shrink-0 cursor-pointer"
                  >
                    {copiedKeyText === 'Mã Khóa API' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKeyText === 'Mã Khóa API' ? 'Đã Chép' : 'Sao Chép'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>Cảnh báo:</strong> Đây là lần duy nhất mã khóa bí mật này hiển thị đầy đủ. Hãy sao chép và lưu trữ an toàn trước khi đóng tab. Khóa này đã được điền sẵn vào Trình Thử Nghiệm bên dưới!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: DANH SÁCH KHÓA API GIVEAWAY ĐANG HOẠT ĐỘNG */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Danh Sách Khóa API Đang Quản Trị Giveaway ({giveawayApiKeys.length})
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                Bao gồm các khóa có quyền GIVEAWAYS_FULL hoặc ADMIN_FULL
              </span>
            </div>

            {isLoadingApiKeys ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                <span>Đang tải danh sách khóa API...</span>
              </div>
            ) : giveawayApiKeys.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-slate-400">Chưa có khóa API tùy chỉnh nào được tạo riêng cho Giveaway.</p>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">
                  Khóa mặc định toàn sàn: <strong>wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a</strong>
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Tên Khóa API</th>
                      <th className="p-3">Tiền Tố (Prefix)</th>
                      <th className="p-3">Quyền Hạn</th>
                      <th className="p-3">Hạn Dùng</th>
                      <th className="p-3 text-center">Trạng Thái</th>
                      <th className="p-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {giveawayApiKeys.map((keyItem) => {
                      const isActive = keyItem.is_active === 1;
                      return (
                        <tr key={keyItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{keyItem.key_name}</span>
                              {keyItem.id === 'ak_preset_giveaways_full' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-600 font-mono">
                                  PRESET
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{keyItem.id}</span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-purple-600 dark:text-purple-400">
                            {keyItem.key_prefix || (keyItem.raw_key ? keyItem.raw_key.substring(0, 16) + '...' : 'wcg_gw_...')}
                          </td>
                          <td className="p-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              {keyItem.scope}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {keyItem.expires_at ? formatFullDateTime(keyItem.expires_at) : 'Vĩnh viễn'}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleApiKey(keyItem)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span>{isActive ? 'Hoạt Động' : 'Tạm Khóa'}</span>
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (keyItem.raw_key) {
                                    setTestApiKey(keyItem.raw_key);
                                  } else {
                                    setTestApiKey(keyItem.key_prefix || 'wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a');
                                  }
                                  onShowToast('Đã chọn khóa này', `Đã điền khóa vào Trình Thử Nghiệm API`, 'info');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 dark:text-purple-300 text-[11px] font-bold cursor-pointer"
                                title="Điền khóa này vào Trình Thử Nghiệm bên dưới"
                              >
                                <Play className="w-3 h-3 text-purple-500" />
                                <span>Thử Nghiệm</span>
                              </button>
                              {keyItem.id !== 'ak_preset_giveaways_full' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey(keyItem)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                  title="Xóa khóa API vĩnh viễn"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARD 3: TRÌNH THỬ NGHIỆM GỌI API TRỰC TIẾP (QUICK TESTER) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Trình Thử Nghiệm Gọi API Trực Tiếp (Interactive API Quick Tester)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Thực thi lệnh trực tiếp tới máy chủ Cloudflare Edge mà không cần mở Postman
              </span>
            </div>

            {/* Action Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setTestAction('GET_LIST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'GET_LIST'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                GET: Tra Cứu Danh Sách
              </button>
              <button
                type="button"
                onClick={() => setTestAction('GET_DETAIL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'GET_DETAIL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                GET: Chi Tiết Đợt Phát & Kho Mã
              </button>
              <button
                type="button"
                onClick={() => setTestAction('ADD_CODES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'ADD_CODES'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                PUT: Nạp Mã Vào Kho D1 (ADD_CODES)
              </button>
              <button
                type="button"
                onClick={() => setTestAction('TOGGLE_ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'TOGGLE_ACTIVE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                PUT: Bật / Tắt Sự Kiện
              </button>
              <button
                type="button"
                onClick={() => setTestAction('RESET_COOLDOWN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'RESET_COOLDOWN'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                PUT: Xóa Thời Gian Chờ (Reset Cooldown)
              </button>
              <button
                type="button"
                onClick={() => setTestAction('OPEN_NOW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'OPEN_NOW'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                ⚡ PUT: Mở Ngay Lập Tức (OPEN_NOW)
              </button>
            </div>

            {/* Parameter Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mã Khóa API Xác Thực (X-Api-Key) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={testApiKey}
                  onChange={(e) => setTestApiKey(e.target.value)}
                  placeholder="wcg_gw_..."
                  className="w-full font-mono rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {(testAction === 'GET_DETAIL' || testAction === 'ADD_CODES' || testAction === 'TOGGLE_ACTIVE' || testAction === 'RESET_COOLDOWN' || testAction === 'OPEN_NOW') && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Chiến Dịch Mục Tiêu:
                  </label>
                  <select
                    value={testSelectedGwId}
                    onChange={(e) => setTestSelectedGwId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Chọn chiến dịch cần thao tác --</option>
                    {giveaways.map((gw) => (
                      <option key={gw.id} value={gw.id}>
                        {gw.title} ({gw.game_name}) - Kho: {Array.isArray(gw.codes_pool) ? gw.codes_pool.length : (gw.remaining_codes || 0)} mã
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Input Codes for ADD_CODES */}
            {testAction === 'ADD_CODES' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Danh Sách Mã Cần Nạp Vào Kho (Mỗi mã 1 dòng hoặc cách nhau bởi dấu phẩy):
                </label>
                <textarea
                  value={testCodesInput}
                  onChange={(e) => setTestCodesInput(e.target.value)}
                  rows={3}
                  placeholder={`TEST_CODE_01\nTEST_CODE_02\nTEST_CODE_03`}
                  className="w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            {/* Toggle Switch for TOGGLE_ACTIVE */}
            {testAction === 'TOGGLE_ACTIVE' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Trạng Thái Sau Khi Đổi:
                </span>
                <button
                  type="button"
                  onClick={() => setTestActiveState(!testActiveState)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    testActiveState
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {testActiveState ? '🟢 Mở Sự Kiện (ACTIVE)' : '🔴 Đóng Sự Kiện (INACTIVE)'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Endpoint: <strong className="text-purple-600 dark:text-purple-400 font-mono">/api/giveaways/manage</strong>
              </span>
              <button
                type="button"
                onClick={handleRunTestApi}
                disabled={isTestingApi || !testApiKey.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isTestingApi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang Gửi Lệnh...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>🚀 Thực Thi Gọi API Thử Nghiệm</span>
                  </>
                )}
              </button>
            </div>

            {/* RESPONSE VIEWER */}
            {testApiResponse && (
              <div className="mt-3 p-4 rounded-xl bg-slate-950 text-slate-100 border border-slate-800 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Kết Quả Phản Hồi Từ Edge API:</span>
                    {testApiStatus !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        testApiStatus >= 200 && testApiStatus < 300
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        HTTP {testApiStatus}
                      </span>
                    )}
                    {testApiLatency !== null && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ⚡ {testApiLatency}ms
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(JSON.stringify(testApiResponse, null, 2), 'JSON Phản Hồi')}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Sao Chép JSON</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono overflow-x-auto max-h-60 p-2 text-emerald-400 whitespace-pre">
                  {JSON.stringify(testApiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* CARD 4 (CUỐI TRANG): BẢNG TRA CỨU ENDPOINTS & MẪU CODE GỌI API */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Danh Mục Endpoints & Mẫu Lệnh Gọi API Quản Lý Toàn Quyền
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tài liệu tích hợp chuẩn REST dành cho lập trình viên, bot tự động hoặc hệ thống bên ngoài.
              </p>
            </div>

            {/* Endpoints Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Phương Thức</th>
                    <th className="p-3">Endpoint URL</th>
                    <th className="p-3">Mô Tả Chức Năng</th>
                    <th className="p-3">Quyền Yêu Cầu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold">GET</span>
                    </td>
                    <td className="p-3 text-slate-900 dark:text-white font-bold">/api/giveaways/manage</td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-400">
                      Lấy danh sách toàn bộ chiến dịch hoặc 1 chiến dịch (?id=...) kèm kho mã D1 chi tiết
                    </td>
                    <td className="p-3 text-purple-600 dark:text-purple-400 font-bold">GIVEAWAYS_FULL</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-bold">POST</span>
                    </td>
                    <td className="p-3 text-slate-900 dark:text-white font-bold">/api/giveaways/manage</td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-400">
                      Tạo mới hoặc cập nhật toàn diện đợt phát code kèm kho mã ban đầu (codes: string[])
                    </td>
                    <td className="p-3 text-purple-600 dark:text-purple-400 font-bold">GIVEAWAYS_FULL</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold">PUT</span>
                    </td>
                    <td className="p-3 text-slate-900 dark:text-white font-bold">/api/giveaways/manage</td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-400">
                      Thao tác nhanh: action = ADD_CODES, TOGGLE_ACTIVE, RESET_COOLDOWN, OPEN_NOW, ADJUST_METRICS, UPDATE_CONFIG
                    </td>
                    <td className="p-3 text-purple-600 dark:text-purple-400 font-bold">GIVEAWAYS_FULL</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-bold">DELETE</span>
                    </td>
                    <td className="p-3 text-slate-900 dark:text-white font-bold">/api/giveaways/manage</td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-400">
                      Xóa vĩnh viễn đợt phát giveaway kèm tạo Tombstone đồng bộ triệt để trên KV và D1
                    </td>
                    <td className="p-3 text-purple-600 dark:text-purple-400 font-bold">GIVEAWAYS_FULL</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Code Examples Tabs */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setApiDocCategory('curl_get')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      apiDocCategory === 'curl_get'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    1. cURL: Tra Cứu Kho Mã
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiDocCategory('curl_add_codes')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      apiDocCategory === 'curl_add_codes'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    2. cURL: Nạp Mã (ADD_CODES)
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiDocCategory('curl_open_now')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      apiDocCategory === 'curl_open_now'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    3. cURL: Mở Ngay (OPEN_NOW)
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiDocCategory('curl_create')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      apiDocCategory === 'curl_create'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    4. cURL: Tạo Đợt Phát Mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiDocCategory('js_client')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      apiDocCategory === 'js_client'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    5. JavaScript / Node.js
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    let snippet = '';
                    if (apiDocCategory === 'curl_get') {
                      snippet = `curl -X GET "https://codegame.shop/api/giveaways/manage"\n  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a"`;
                    } else if (apiDocCategory === 'curl_add_codes') {
                      snippet = `curl -X PUT "https://codegame.shop/api/giveaways/manage" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a" \\\n  -d '{\n    "action": "ADD_CODES",\n    "id": "gw_genshin_impact",\n    "codes": ["GENSHIN_VIP_01", "GENSHIN_VIP_02", "GENSHIN_VIP_03"]\n  }'`;
                    } else if (apiDocCategory === 'curl_open_now') {
                      snippet = `curl -X PUT "https://codegame.shop/api/giveaways/manage" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a" \\\n  -d '{\n    "action": "OPEN_NOW",\n    "id": "gw_hiep-khach-hanh_mvuj5a5m"\n  }'`;
                    } else if (apiDocCategory === 'curl_create') {
                      snippet = `curl -X POST "https://codegame.shop/api/giveaways/manage" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a" \\\n  -d '{\n    "title": "Code riêng Honkai: Star Rail Mới Nhất",\n    "game_slug": "honkai-star-rail",\n    "game_name": "Honkai: Star Rail",\n    "description": "Code độc quyền dành cho tân thủ tham gia sự kiện.",\n    "rewards": "Vé Tinh Cầu Đặc Biệt x10 + 1600 Ngọc Ánh Sao",\n    "codes": ["HSR_NEWBIE_01", "HSR_NEWBIE_02"],\n    "max_per_user": 1,\n    "max_per_ip": 1,\n    "cooldown_hours": 1,\n    "is_active": true\n  }'`;
                    } else {
                      snippet = `// Thư viện mẫu gọi API Quản Lý Giveaway (Node.js / Browser)\nconst API_KEY = 'wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a';\nconst BASE_URL = 'https://codegame.shop';\n\n// 1. Lấy danh sách chiến dịch & kho mã D1\nasync function getGiveaways() {\n  const res = await fetch(\`\${BASE_URL}/api/giveaways/manage\`, {\n    headers: { 'X-Api-Key': API_KEY }\n  });\n  return await res.json();\n}\n\n// 2. Nạp thêm giftcode mới vào kho D1\nasync function addGiveawayCodes(giveawayId, codesArray) {\n  const res = await fetch(\`\${BASE_URL}/api/giveaways/manage\`, {\n    method: 'PUT',\n    headers: {\n      'Content-Type': 'application/json',\n      'X-Api-Key': API_KEY\n    },\n    body: JSON.stringify({\n      action: 'ADD_CODES',\n      id: giveawayId,\n      codes: codesArray\n    })\n  });\n  return await res.json();\n}\n\n// 3. Mở giật mã ngay lập tức (Bỏ khóa hẹn giờ tương lai)\nasync function openGiveawayNow(giveawayId) {\n  const res = await fetch(\`\${BASE_URL}/api/giveaways/manage\`, {\n    method: 'PUT',\n    headers: {\n      'Content-Type': 'application/json',\n      'X-Api-Key': API_KEY\n    },\n    body: JSON.stringify({\n      action: 'OPEN_NOW',\n      id: giveawayId\n    })\n  });\n  return await res.json();\n}`;
                    }
                    handleCopyText(snippet, 'Mẫu Lệnh');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {copiedKeyText === 'Mẫu Lệnh' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKeyText === 'Mẫu Lệnh' ? 'Đã Sao Chép' : 'Sao Chép Mẫu Lệnh'}</span>
                </button>
              </div>

              {/* Snippet Block */}
              <div className="p-4 rounded-xl bg-slate-950 text-slate-100 border border-slate-800 font-mono text-xs overflow-x-auto">
                {apiDocCategory === 'curl_get' && (
                  <pre className="text-emerald-400">
{`# 1. Tra cứu danh sách toàn bộ chiến dịch kèm kho mã chi tiết
curl -X GET "https://codegame.shop/api/giveaways/manage" \\
  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a"

# 2. Hoặc tra cứu 1 chiến dịch cụ thể theo ID
curl -X GET "https://codegame.shop/api/giveaways/manage?id=gw_genshin_impact" \\
  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a"`}
                  </pre>
                )}

                {apiDocCategory === 'curl_add_codes' && (
                  <pre className="text-emerald-400">
{`# Nạp thêm danh sách giftcode mới vào kho D1 cho đợt phát
curl -X PUT "https://codegame.shop/api/giveaways/manage" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a" \\
  -d '{
    "action": "ADD_CODES",
    "id": "gw_genshin_impact",
    "codes": [
      "GENSHIN_VIP_OCT29_01",
      "GENSHIN_VIP_OCT29_02",
      "GENSHIN_VIP_OCT29_03"
    ]
  }'`}
                  </pre>
                )}

                {apiDocCategory === 'curl_open_now' && (
                  <pre className="text-emerald-400">
{`# Mở giật mã ngay lập tức (Bỏ khóa hẹn giờ tương lai, đặt start_time = hôm nay, ACTIVE)
curl -X PUT "https://codegame.shop/api/giveaways/manage" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a" \\
  -d '{
    "action": "OPEN_NOW",
    "id": "gw_hiep-khach-hanh_mvuj5a5m"
  }'`}
                  </pre>
                )}

                {apiDocCategory === 'curl_create' && (
                  <pre className="text-emerald-400">
{`# Tạo mới một chiến dịch giveaway hoàn chỉnh kèm kho mã ban đầu
curl -X POST "https://codegame.shop/api/giveaways/manage" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a" \\
  -d '{
    "title": "Code riêng Honkai: Star Rail Mới Nhất",
    "game_slug": "honkai-star-rail",
    "game_name": "Honkai: Star Rail",
    "description": "Code độc quyền dành cho tân thủ tham gia sự kiện.",
    "rewards": "Vé Tinh Cầu Đặc Biệt x10 + 1600 Ngọc Ánh Sao",
    "codes": ["HSR_NEWBIE_01", "HSR_NEWBIE_02"],
    "max_per_user": 1,
    "max_per_ip": 1,
    "cooldown_hours": 1,
    "is_active": true
  }'`}
                  </pre>
                )}

                {apiDocCategory === 'js_client' && (
                  <pre className="text-emerald-400">
{`// Thư viện mẫu gọi API Quản Lý Giveaway (Node.js / Browser)
const API_KEY = 'wcg_gw_7193ab4028cf51d9e27b140685e93c1482f04b2a';
const BASE_URL = 'https://codegame.shop';

// 1. Lấy danh sách chiến dịch & kho mã D1
async function getGiveaways() {
  const res = await fetch(\`\${BASE_URL}/api/giveaways/manage\`, {
    headers: { 'X-Api-Key': API_KEY }
  });
  return await res.json();
}

// 2. Nạp thêm giftcode mới vào kho D1
async function addGiveawayCodes(giveawayId, codesArray) {
  const res = await fetch(\`\${BASE_URL}/api/giveaways/manage\`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY
    },
    body: JSON.stringify({
      action: 'ADD_CODES',
      id: giveawayId,
      codes: codesArray
    })
  });
  return await res.json();
}

// 3. Bật hoặc tắt trạng thái đợt phát
async function toggleGiveaway(giveawayId, isActive) {
  const res = await fetch(\`\${BASE_URL}/api/giveaways/manage\`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY
    },
    body: JSON.stringify({
      action: 'TOGGLE_ACTIVE',
      id: giveawayId,
      is_active: isActive
    })
  });
  return await res.json();
}`}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🎁 Quản Lý Các Đợt Phát Code Riêng (Giveaway Có Điều Kiện)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phát giftcode miễn phí do Admin tạo, quản lý kho mã, đóng/mở sự kiện và theo dõi lịch sử nhận.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* BỘ LỌC HIỂN THỊ CỘT TRỰC QUAN (ĐÃ GIẬT, HÀNG CÒN, SỐ ẢO) */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1 uppercase tracking-wider">Hiển thị:</span>
              {/* Nút 1: Đã giật */}
              <button
                type="button"
                onClick={() => {
                  const next = !showAdminClaimed;
                  setShowAdminClaimed(next);
                  localStorage.setItem('wcg_admin_show_claimed_gw', String(next));
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  showAdminClaimed
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white line-through opacity-70'
                }`}
                title={showAdminClaimed ? 'Đang hiện số Đã Giật (Nhấn để ẩn)' : 'Đang ẩn số Đã Giật (Nhấn để hiện)'}
              >
                {showAdminClaimed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Đã giật</span>
              </button>

              {/* Nút 2: Hàng còn */}
              <button
                type="button"
                onClick={() => {
                  const next = !showAdminStock;
                  setShowAdminStock(next);
                  localStorage.setItem('wcg_admin_show_stock_gw', String(next));
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  showAdminStock
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white line-through opacity-70'
                }`}
                title={showAdminStock ? 'Đang hiện Hàng Còn (Nhấn để ẩn)' : 'Đang ẩn Hàng Còn (Nhấn để hiện)'}
              >
                {showAdminStock ? <Boxes className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Hàng còn</span>
              </button>

              {/* Nút 3: Số ảo Web */}
              <button
                type="button"
                onClick={() => {
                  const next = !showVirtualStats;
                  setShowVirtualStats(next);
                  localStorage.setItem('wcg_admin_show_virtual_stats', String(next));
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  showVirtualStats
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white line-through opacity-70'
                }`}
                title={showVirtualStats ? 'Đang hiện Số Ảo Web (Nhấn để ẩn)' : 'Đang ẩn Số Ảo Web (Nhấn để hiện)'}
              >
                {showVirtualStats ? <Sparkles className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Số ảo Web</span>
              </button>
            </div>

            {/* Nút Quét Mô Phỏng Tự Động */}
            <button
              type="button"
              disabled={isSimulating}
              onClick={handleRunSimulation}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Chạy quét mô phỏng lượt giật cho các giveaway có giãn cách toàn sàn đang chờ"
            >
              <Zap className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Đang quét...' : '⚡ Quét Mô Phỏng'}</span>
            </button>

            {/* Nút Reset Toàn Bộ Số Ảo Về Thật */}
            <button
              type="button"
              disabled={isResettingAllFomo}
              onClick={handleResetAllFomoToReal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Xóa sạch toàn bộ số ảo của các giveaway, đưa số đã giật và tồn kho ngoài web về chuẩn 100% thực tế"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isResettingAllFomo ? 'animate-spin' : ''}`} />
              <span>Reset Tất Cả Về Số Thật</span>
            </button>

            {/* Nút Bổ Sung Số Ảo Ngẫu Nhiên (52-112) */}
            <button
              type="button"
              onClick={handleRandomizeVirtualClaimed}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Bổ sung số ảo đã giật ngẫu nhiên từ 52 đến 112 cho toàn bộ các mục code giveaway"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bổ Sung Số Ảo (52–112)</span>
            </button>

            {/* Nút Mở tất cả */}
            <button
              type="button"
              onClick={() => handleBatchToggleAll(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Mở tất cả các đợt phát giveaway"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Mở tất cả ({activeCount}/{giveaways.length})</span>
            </button>

            {/* Nút Đóng tất cả */}
            <button
              type="button"
              onClick={() => handleBatchToggleAll(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Tạm đóng tất cả các đợt phát giveaway"
            >
              <PowerOff className="h-3.5 w-3.5" />
              <span>Đóng tất cả</span>
            </button>

            {/* Nút Mẫu Chung Toàn Sàn */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Quản lý Mẫu Chung toàn sàn (Giveaway, Tra cứu code, Tiện ích, Cửa hàng code)"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>🎨 Mẫu Chung Toàn Sàn</span>
            </button>

            {/* Nút Tạo đợt phát mới */}
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:opacity-95 cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>+ Tạo Đợt Phát Mới</span>
            </button>
          </div>
        </div>

        {/* Filter Bar with Status Tabs & Game Search */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tất cả ({giveaways.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Đang mở ({activeCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Đã đóng ({inactiveCount})</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 sm:max-w-md">
            {/* Game Dropdown Filter */}
            <div className="sm:w-44">
              <select
                value={selectedGameFilter}
                onChange={(e) => setSelectedGameFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="ALL">🎮 Tất cả game</option>
                {games.map((g) => (
                  <option key={g.id} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên đợt phát, game..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* THANH CHỌN NHANH TỰA GAME (QUICK GAME SELECTION CHIPS) */}
        {uniqueGamesWithGiveaways.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Chọn nhanh game:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGameFilter('ALL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedGameFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>🎮 Tất cả ({giveaways.length})</span>
            </button>
            {uniqueGamesWithGiveaways.map((g) => {
              const isSelected = selectedGameFilter === g.slug;
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => setSelectedGameFilter(isSelected ? 'ALL' : g.slug)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs ring-2 ring-purple-400/30'
                      : 'bg-white hover:bg-slate-50 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title={`Lọc nhanh đợt phát của game ${g.name} (${g.count} đợt phát)`}
                >
                  <img
                    src={g.icon}
                    alt={g.name}
                    className="w-4 h-4 rounded-full object-cover shrink-0 bg-slate-800"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (g.slug && !target.src.includes(`/game_icons/${g.slug}.webp`)) {
                        target.src = `/game_icons/${g.slug}.webp`;
                      } else if (g.slug && !target.src.includes(`/game_icons/${g.slug}.jpg`)) {
                        target.src = `/game_icons/${g.slug}.jpg`;
                      }
                    }}
                  />
                  <span>{g.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {g.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* THANH THAO TÁC CHỌN NHANH & HÀNG LOẠT (SELECTION CONTROLS) */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          {/* Nhóm nút chọn nhanh */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> Chọn nhanh:
            </span>
            <button
              type="button"
              onClick={() => {
                const allIds = new Set(displayedGiveaways.map((g) => g.id));
                setSelectedCampaignIds(allIds);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-all cursor-pointer text-[11px]"
            >
              Chọn tất cả ({displayedGiveaways.length})
            </button>
            <button
              type="button"
              onClick={() => {
                const activeIds = new Set(displayedGiveaways.filter(isGwActive).map((g) => g.id));
                setSelectedCampaignIds(activeIds);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold transition-all cursor-pointer text-[11px] border border-emerald-500/20"
            >
              Chọn đang mở ({displayedGiveaways.filter(isGwActive).length})
            </button>
            <button
              type="button"
              onClick={() => {
                const inactiveIds = new Set(displayedGiveaways.filter((g) => !isGwActive(g)).map((g) => g.id));
                setSelectedCampaignIds(inactiveIds);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold transition-all cursor-pointer text-[11px]"
            >
              Chọn đã đóng ({displayedGiveaways.filter((g) => !isGwActive(g)).length})
            </button>
            {selectedCampaignIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCampaignIds(new Set())}
                className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-all cursor-pointer text-[11px]"
              >
                Bỏ chọn
              </button>
            )}
          </div>

          {/* Thanh tác vụ hàng loạt khi có mục được chọn */}
          {selectedCampaignIds.size > 0 && (
            <div className="flex items-center gap-2 bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/30 px-3 py-1.5 rounded-xl shadow-xs animate-in fade-in duration-150">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-purple-500" />
                Đã chọn: <strong>{selectedCampaignIds.size}</strong> mục
              </span>
              <div className="h-3.5 w-px bg-purple-300 dark:bg-purple-700 mx-1" />
              <button
                type="button"
                onClick={() => handleBatchToggleSelected(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer active:scale-95"
                title="Đóng các mục đã chọn: Mã thật vẫn để trong kho 100%, ngoài web báo Hết Mã"
              >
                <PowerOff className="w-3 h-3" />
                <span>Đóng mục đã chọn ({selectedCampaignIds.size})</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchToggleSelected(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer active:scale-95"
                title="Mở lại các mục đã chọn: Ngoài web hiển thị số lượng và cho phép nhận mã"
              >
                <Play className="w-3 h-3" />
                <span>Mở lại mục đã chọn ({selectedCampaignIds.size})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Giveaways Table (Matching Screenshot 5) */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={displayedGiveaways.length > 0 && displayedGiveaways.every((g) => selectedCampaignIds.has(g.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const next = new Set(selectedCampaignIds);
                        displayedGiveaways.forEach((g) => next.add(g.id));
                        setSelectedCampaignIds(next);
                      } else {
                        const next = new Set(selectedCampaignIds);
                        displayedGiveaways.forEach((g) => next.delete(g.id));
                        setSelectedCampaignIds(next);
                      }
                    }}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                    title="Chọn tất cả các mục trên bảng"
                  />
                </th>
                <th className="px-4 py-3 min-w-[200px]">ĐỢT PHÁT & TỰA GAME</th>
                <th className="px-3.5 py-3 min-w-[160px]">KHO MÃ (CÒN / TỔNG)</th>
                <th className="px-3 py-3 min-w-[140px]">3 ĐIỀU KIỆN NHẬN</th>
                <th className="px-3 py-3 min-w-[130px]">TRẠNG THÁI</th>
                <th className="w-[172px] min-w-[172px] px-3 py-3 text-center sticky right-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs shadow-[-6px_0_12px_rgba(0,0,0,0.06)] z-10">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {displayedGiveaways.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Không tìm thấy đợt phát phù hợp</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {searchQuery.trim()
                          ? `Không tìm thấy kết quả nào khớp với từ khóa "${searchQuery}".`
                          : 'Không có đợt phát nào trong danh mục hoặc bộ lọc đang chọn.'}
                      </p>
                      {(searchQuery || selectedGameFilter !== 'ALL' || statusFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedGameFilter('ALL');
                            setStatusFilter('ALL');
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Xóa tất cả bộ lọc & xem toàn bộ ({giveaways.length} đợt phát)</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedGiveaways.map((gw) => {
                const poolCount = Array.isArray(gw.codes_pool) && gw.codes_pool.length > 0 ? gw.codes_pool.length : Math.max(0, Number(gw.remaining_codes || 0));
                const claimedCount = Number(gw.claimed_codes) || 0;
                const remaining = poolCount;
                const totalCount = poolCount + claimedCount;

                return (
                  <tr key={gw.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${selectedCampaignIds.has(gw.id) ? 'bg-purple-50/60 dark:bg-purple-950/20' : ''}`}>
                    {/* Checkbox chọn mục */}
                    <td className="w-10 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCampaignIds.has(gw.id)}
                        onChange={(e) => {
                          const next = new Set(selectedCampaignIds);
                          if (e.target.checked) next.add(gw.id);
                          else next.delete(gw.id);
                          setSelectedCampaignIds(next);
                        }}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                      />
                    </td>

                    {/* Col 1: ĐỢT PHÁT & TỰA GAME */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center font-bold text-xs text-purple-600">
                          <img
                            src={resolveGameIcon(gw)}
                            alt={gw.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              if (gw.game_slug && !target.src.includes(`/game_icons/${gw.game_slug}.webp`)) {
                                target.src = `/game_icons/${gw.game_slug}.webp`;
                              } else if (gw.game_slug && !target.src.includes(`/game_icons/${gw.game_slug}.jpg`)) {
                                target.src = `/game_icons/${gw.game_slug}.jpg`;
                              } else {
                                target.style.display = 'none';
                              }
                            }}
                          />
                        </div>
                        <div className="min-w-0 max-w-[190px] sm:max-w-[220px]">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block truncate">
                            {gw.game_name}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={gw.title}>
                            {gw.title}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            {gw.use_template !== false ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" title="Đang đồng bộ tự động theo Mẫu Chung">
                                <Link2 className="w-2.5 h-2.5" /> Mẫu chung
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Đang dùng thiết lập tùy chỉnh riêng cho đợt này">
                                <Sparkles className="w-2.5 h-2.5" /> Tùy chỉnh riêng
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={gw.description}>
                            {gw.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Col 2: KHO MÃ & SỐ LIỆU HIỂN THỊ (TÁCH BẠCH THẬT / CỘNG THÊM / HIỂN THỊ) */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {(() => {
                        const isSimOn = gw.enable_auto_simulation !== false;
                        const additionConfig = gw.virtual_remaining_addition !== undefined ? Number(gw.virtual_remaining_addition) : 20;
                        let currentAddition = gw.virtual_remaining_current !== undefined ? Number(gw.virtual_remaining_current) : additionConfig;
                        if (currentAddition <= 0 || currentAddition > additionConfig) currentAddition = additionConfig;

                        const effectiveAddition = (isSimOn && remaining > 0) ? currentAddition : 0;
                        const webDisplayRemaining = marketingService.getGiveawayDisplayRemaining(gw);
                        const webClaimed = marketingService.getClaimedDisplay(gw);

                        return (
                          <div className="space-y-1">
                            {/* Tầng 1: Kho Thật & Số Cộng Thêm (Tách Bạch 100%) */}
                            <div className="flex items-center gap-1 font-mono text-[11px] flex-wrap">
                              <span className="text-slate-400 font-sans text-[10px] font-semibold">Thật:</span>
                              <span className={`font-bold ${remaining > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                {remaining}
                              </span>
                              <span className="text-slate-400 text-[10px]">/{totalCount}</span>

                              {(() => {
                                const rawPool = Array.isArray(gw.codes_pool) ? gw.codes_pool : [];
                                if (rawPool.length === 0) return null;
                                const uniqueCount = new Set(rawPool.map((c: any) => String(c).trim().toUpperCase())).size;
                                const dupCount = rawPool.length - uniqueCount;
                                if (dupCount > 0) {
                                  return (
                                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" title={`Kho mã có ${dupCount} mã trùng lặp (${uniqueCount} mã duy nhất)`}>
                                      ⚠️ {uniqueCount} duy nhất ({dupCount} trùng)
                                    </span>
                                  );
                                }
                                return null;
                              })()}

                              <span className="text-slate-300 dark:text-slate-600 mx-0.5">•</span>

                              <span className="text-slate-400 font-sans text-[10px]">Cộng thêm:</span>
                              {isSimOn && remaining > 0 ? (
                                <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1 rounded text-[10px]" title={`Cộng thêm hiện tại: ${effectiveAddition} / Cấu hình: ${additionConfig}`}>
                                  +{effectiveAddition}
                                </span>
                              ) : !isSimOn ? (
                                <span className="text-[10px] text-slate-400 font-sans italic" title="Tính năng mô phỏng đang TẮT - Số hiển thị trở về số thật">
                                  +0 (Tắt)
                                </span>
                              ) : (
                                <span className="text-[10px] text-rose-400 font-sans italic">
                                  +0 (Hết mã)
                                </span>
                              )}

                              {remaining === 0 && (
                                <span className="ml-1 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                  Hết mã
                                </span>
                              )}
                            </div>

                            {/* Tầng 2: Số Hiển Thị Cho Khách & Đã Giật */}
                            <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-amber-500 dark:text-amber-400 font-sans text-[9px] font-bold flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                Hiển thị:
                              </span>
                              <span className={`font-bold ${webDisplayRemaining > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                                Còn {webDisplayRemaining}
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">|</span>
                              <span className="text-slate-500 dark:text-slate-400 font-sans text-[9px]">Giật:</span>
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                {webClaimed}
                              </span>

                              {isSimOn && remaining > 0 && effectiveAddition > 0 && (
                                <span className="ml-auto inline-flex items-center px-1 rounded text-[8px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" title={`Số hiển thị = Thật (${remaining}) + Cộng thêm (${effectiveAddition}) = ${webDisplayRemaining}`}>
                                  +{effectiveAddition}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Col 3: 3 ĐIỀU KIỆN NHẬN */}
                    <td className="px-3 py-3 text-[10.5px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div>
                          Nick: <strong className="text-slate-800 dark:text-slate-200">{gw.min_account_age_days ? `${gw.min_account_age_days}d` : '0d'}</strong>
                          <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                          User: <strong className="text-slate-800 dark:text-slate-200">{gw.max_per_user || 1} mã</strong>
                        </div>
                        <div>
                          IP: <strong className="text-slate-800 dark:text-slate-200">{gw.max_per_ip || 1} mã</strong>
                          <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                          CD: <strong className="text-slate-800 dark:text-slate-200">
                            {(() => {
                              const mins = gw.cooldown_minutes !== undefined && gw.cooldown_minutes !== null
                                ? Number(gw.cooldown_minutes)
                                : (Number(gw.cooldown_hours || 0) * 60);
                              if (!mins || mins <= 0) return '0p';
                              if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`;
                              return `${mins}p`;
                            })()}
                          </strong>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                          <Calendar className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                          <span>Hạn: <strong className="text-slate-700 dark:text-slate-300">{gw.end_time ? (gw.end_time.includes('T') ? gw.end_time.substring(0, 10) : gw.end_time) : 'Đến khi hết mã'}</strong></span>
                        </div>
                        {Boolean(gw.global_cooldown_seconds && gw.global_cooldown_seconds > 0) && (
                          <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold pt-0.5">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>Giãn cách: {gw.global_cooldown_seconds >= 60 ? `${Math.round(gw.global_cooldown_seconds / 60)}p` : `${gw.global_cooldown_seconds}s`}</span>
                            {(() => {
                              const isCooling = gw.last_global_claim_at &&
                                (new Date(gw.last_global_claim_at).getTime() + (gw.global_cooldown_seconds || 0) * 1000) > Date.now();
                              return isCooling ? (
                                <div className="inline-flex items-center gap-0.5">
                                  {gw.is_last_claim_simulated ? (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold" title="Lượt giật vừa qua là mô phỏng tự động">
                                      🤖
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResetGlobalCooldown(gw);
                                    }}
                                    className="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer font-bold transition-all"
                                    title="Đang khóa chờ đợt mã tiếp theo. Nhấn để mở ngay lập tức!"
                                  >
                                    ⏳ Đang chờ (Mở ngay)
                                  </button>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Col 4: TRẠNG THÁI (Trạng thái trực quan & Cảnh báo Chờ Mở) */}
                    <td className="px-3 py-3 whitespace-nowrap min-w-[120px]">
                      {(() => {
                        const active = isGwActive(gw);
                        const stStr = gw.start_time ? String(gw.start_time).trim() : '';
                        const stMs = stStr ? (stStr.length === 10 ? new Date(`${stStr}T00:00:00+07:00`).getTime() : new Date(stStr).getTime()) : NaN;
                        const isScheduledFuture = !isNaN(stMs) && stMs > Date.now();

                        return (
                          <div className="space-y-1">
                            <div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border select-none ${
                                  active
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                                  }`}
                                />
                                <span>{active ? 'Đang mở' : 'Đã đóng'}</span>
                              </span>
                              {!active && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
                                  (Kho còn {poolCount} mã thật)
                                </span>
                              )}
                            </div>

                            {/* Cảnh báo Chờ Mở nếu thời gian bắt đầu ở tương lai */}
                            {isScheduledFuture && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" title={`Đang khóa chờ giờ G: ${gw.start_time}`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  Chờ mở
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenNow(gw);
                                  }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs transition-all cursor-pointer"
                                  title="Hủy hẹn giờ và mở giật mã ngay lập tức cho khách trên web"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>Mở</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Col 5: THAO TÁC (Sticky Right, thu gọn thành 2 cột nhỏ x 3 hàng sang góc phải) */}
                    <td className="w-[172px] min-w-[172px] px-2.5 py-2 text-right whitespace-nowrap sticky right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shadow-[-6px_0_12px_rgba(0,0,0,0.06)] z-10">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Cột nhỏ 1 (3 hàng): Đóng/Mở lại, Số ảo, Kho mã */}
                        <div className="flex flex-col gap-1 w-[74px]">
                          {/* NÚT ĐÓNG / MỞ SỰ KIỆN RIÊNG LẺ */}
                          {isGwActive(gw) ? (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(gw)}
                              className="inline-flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10.5px] font-bold transition-all cursor-pointer border border-rose-500/25 shadow-2xs hover:scale-[1.02] active:scale-95"
                              title="Đóng sự kiện riêng lẻ này: Ngoài web sẽ báo Hết Mã, mã thật trong kho vẫn giữ nguyên 100%"
                            >
                              <PowerOff className="h-3 w-3 text-rose-500 shrink-0" />
                              <span>Đóng</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(gw)}
                              className="inline-flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold transition-all cursor-pointer border border-emerald-500/25 shadow-2xs hover:scale-[1.02] active:scale-95"
                              title="Mở lại sự kiện này: Ngoài web sẽ hiển thị số lượng và cho phép nhận quà"
                            >
                              <Play className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span>Mở lại</span>
                            </button>
                          )}

                          {/* NÚT CHỈNH SỐ ẢO */}
                          <button
                            type="button"
                            onClick={() => setFomoAdjustCampaign(gw)}
                            className="inline-flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10.5px] font-bold transition-colors cursor-pointer border border-amber-500/25 shadow-2xs"
                            title="Điều chỉnh số ảo & FOMO hiển thị ngoài web cho đợt phát này"
                          >
                            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                            <span>Số ảo</span>
                          </button>

                          {/* KHO MÃ */}
                          <button
                            type="button"
                            onClick={() => handleOpenPoolModal(gw)}
                            className="inline-flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                            title="Quản lý kho mã code phát riêng"
                          >
                            <Boxes className="h-3 w-3 text-indigo-500 shrink-0" />
                            <span>Kho mã</span>
                          </button>
                        </div>

                        {/* Cột nhỏ 2 (3 hàng): Lịch sử, Sửa, Xóa */}
                        <div className="flex flex-col gap-1 w-[74px]">
                          {/* LỊCH SỬ */}
                          <button
                            type="button"
                            onClick={() => handleOpenHistoryModal(gw)}
                            className="inline-flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                            title="Lịch sử người chơi đã nhận mã"
                          >
                            <History className="h-3 w-3 text-teal-500 shrink-0" />
                            <span>Lịch sử</span>
                          </button>

                          {/* NÚT SỬA */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(gw)}
                            className="inline-flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="Sửa đợt phát giveaway"
                          >
                            <Edit2 className="h-3 w-3 shrink-0" />
                            <span>Sửa</span>
                          </button>

                          {/* NÚT XÓA */}
                          <button
                            type="button"
                            onClick={() => setDeletingCampaign(gw)}
                            className="inline-flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="Xóa đợt phát giveaway"
                          >
                            <Trash2 className="h-3 w-3 shrink-0" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BANNER DANH SÁCH API Ở CUỐI TRANG */}
      <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 p-5 dark:border-purple-800/50 dark:bg-purple-950/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <KeyRound className="w-5 h-5 text-purple-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Tích Hợp API Quản Lý Đợt Phát Code (Giveaway REST Edge API)
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-mono font-bold">
                GIVEAWAYS_FULL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cung cấp mã khóa API và endpoints chuẩn REST để nạp mã tự động, tra cứu kho D1 và kết nối bot Discord/Telegram.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSubTab('api');
            loadGiveawayApiKeys();
          }}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Xem Danh Sách API & Khóa Kết Nối &rarr;</span>
        </button>
      </div>
      </>
      )}

      {/* CREATE / EDIT GIVEAWAY MODAL */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? 'Chỉnh Sửa Đợt Phát Code Riêng' : 'Tạo Đợt Phát Code Riêng Mới'}
        subtitle="Thiết lập đợt phát code miễn phí, cấu hình 3 điều kiện nhận và tải ảnh nén từ máy tính."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {/* TEMPLATE MODE SELECTOR CARD */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Chế Độ Cấu Hình:
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const tpl = templateService.getTemplates().giveaway;
                    setFormData((p) => ({
                      ...p,
                      use_template: true,
                      title: tpl.title_pattern.replace(/\{game_name\}/gi, p.game_name || 'Game'),
                      rewards: tpl.rewards,
                      description: tpl.description,
                      min_account_age_days: tpl.min_account_age_days,
                      max_per_user: tpl.max_per_user,
                      max_per_ip: tpl.max_per_ip,
                      cooldown_hours: tpl.cooldown_hours,
                      custom_banner_enabled: tpl.custom_banner_enabled,
                      custom_banner_text: tpl.custom_banner_text,
                      custom_banner_link: tpl.custom_banner_link,
                      enable_waiting_room: tpl.enable_waiting_room,
                      waiting_users_min: tpl.waiting_users_min,
                      waiting_users_max: tpl.waiting_users_max,
                      custom_success_msg: tpl.custom_success_msg,
                      custom_cooldown_msg: tpl.custom_cooldown_msg,
                      custom_out_of_stock_msg: tpl.custom_out_of_stock_msg,
                    }));
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    formData.use_template
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  <span>🟢 Dùng Mẫu Chung</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, use_template: false }))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    !formData.use_template
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>🟡 Tùy Chỉnh Riêng</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {formData.use_template ? (
                <span>
                  Đợt này đang <strong>kế thừa tự động</strong> từ Mẫu Chung. Khi bạn sửa Mẫu Chung toàn sàn, đợt này sẽ tự động đổi theo.{' '}
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="text-indigo-600 dark:text-indigo-400 underline font-semibold hover:opacity-80 cursor-pointer inline-flex items-center gap-0.5"
                  >
                    Sửa Mẫu Chung tại đây <ExternalLink className="w-2.5 h-2.5 inline" />
                  </button>
                </span>
              ) : (
                <span>
                  Đợt này đang sử dụng <strong>cấu hình riêng biệt</strong>. Các thay đổi trong Mẫu Chung toàn sàn sẽ không ghi đè lên đợt này.
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SearchableGameSelect
                games={games}
                selectedGameSlug={formData.game_slug}
                onSelectGame={(g) => {
                  setFormData((p) => {
                    const isNewCreation = !editingItem;
                    const shouldAutoTitle = isNewCreation || !p.title || p.title.startsWith('Code riêng');
                    const shouldAutoRewards = isNewCreation && (!p.rewards || p.rewards === 'Code ngẫu nhiên');
                    return {
                      ...p,
                      game_slug: g.slug,
                      game_name: g.name,
                      title: shouldAutoTitle ? `Code riêng ${g.name}` : p.title,
                      rewards: shouldAutoRewards ? 'Code ngẫu nhiên' : (p.rewards || 'Code ngẫu nhiên'),
                      cover_image_url: g.icon_url || p.cover_image_url,
                    };
                  });
                }}
                label="Chọn Tựa Game"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tiêu Đề Đợt Phát <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="VD: Code riêng Genshin Impact"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Mẫu chuẩn: <span className="font-semibold text-indigo-600 dark:text-indigo-400">Code riêng + Tên game</span> (Có thể tự do chỉnh sửa)
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Phần Thưởng Chi Tiết <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.rewards}
              onChange={(e) => setFormData((p) => ({ ...p, rewards: e.target.value }))}
              placeholder="VD: Code ngẫu nhiên"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Mẫu chuẩn: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Code ngẫu nhiên</span> (Có thể tự do chỉnh sửa)
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Mô Tả Quy Định Nhận
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="VD: Code dùng cho 1 tài khoản, 1 loại dùng 1 lần."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* 3 CONDITIONS CONFIGURATION GRID */}
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 space-y-3">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-300 block">
              ⚙️ Cấu Hình 3 Điều Kiện Nhận Giftcode:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block text-[11px] font-semibold">
                  Tuổi nick tối thiểu (ngày):
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.min_account_age_days}
                  onChange={(e) => setFormData((p) => ({ ...p, min_account_age_days: Number(e.target.value) }))}
                  className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 dark:text-slate-400 block text-[11px] font-semibold">
                    Max code / User:
                  </label>
                  <span className="text-[10px] text-indigo-500 font-semibold">{formData.max_per_user === 0 ? 'Vô hạn' : `${formData.max_per_user} mã`}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={formData.max_per_user}
                  onChange={(e) => setFormData((p) => ({ ...p, max_per_user: Math.max(0, Number(e.target.value)) }))}
                  placeholder="0 = Không giới hạn"
                  className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex items-center gap-1 mt-1">
                  {[1, 3, 5, 0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, max_per_user: val }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                        formData.max_per_user === val
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {val === 0 ? '∞ Vô hạn' : `${val}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 dark:text-slate-400 block text-[11px] font-semibold">
                    Max code / IP:
                  </label>
                  <span className="text-[10px] text-teal-500 font-semibold">{formData.max_per_ip === 0 ? 'Vô hạn' : `${formData.max_per_ip} mã`}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={formData.max_per_ip}
                  onChange={(e) => setFormData((p) => ({ ...p, max_per_ip: Math.max(0, Number(e.target.value)) }))}
                  placeholder="0 = Không giới hạn"
                  className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex items-center gap-1 mt-1">
                  {[1, 3, 0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, max_per_ip: val }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                        formData.max_per_ip === val
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {val === 0 ? '∞ Vô hạn' : `${val}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 dark:text-slate-400 block text-[11px] font-semibold">
                    Cooldown (phút):
                  </label>
                  <span className="text-[10px] text-amber-500 font-semibold font-mono">
                    {formData.cooldown_minutes === 0 ? '0p' : (
                      formData.cooldown_minutes >= 60 && formData.cooldown_minutes % 60 === 0
                        ? `${formData.cooldown_minutes / 60}h`
                        : `${formData.cooldown_minutes}p`
                    )}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={formData.cooldown_minutes}
                  onChange={(e) => {
                    const mins = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setFormData((p) => ({
                      ...p,
                      cooldown_minutes: mins,
                      cooldown_hours: Number((mins / 60).toFixed(2)),
                    }));
                  }}
                  placeholder="0 = Không chờ"
                  className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex items-center gap-1 mt-1">
                  {[
                    { label: '0p', val: 0 },
                    { label: '15p', val: 15 },
                    { label: '30p', val: 30 },
                    { label: '1h', val: 60 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setFormData((p) => ({
                        ...p,
                        cooldown_minutes: item.val,
                        cooldown_hours: Number((item.val / 60).toFixed(2)),
                      }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                        formData.cooldown_minutes === item.val
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* THỜI GIAN & HẠN PHÁT MÃ (START & END TIME) */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                📅 Thời Gian & Hạn Phát Mã Sự Kiện:
              </span>
              <span className="text-[11px] font-semibold font-mono text-indigo-600 dark:text-indigo-400">
                {formData.end_time ? `Hạn: ${formData.end_time.replace('T', ' ')}` : 'Vô hạn (Đến khi hết mã)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 dark:text-slate-400 block text-[11px] font-semibold">
                    Giờ bắt đầu mở sự kiện:
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, start_time: new Date().toISOString().split('T')[0] }))}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    title="Đặt ngày mở là hôm nay để khách có thể giật mã ngay lập tức"
                  >
                    <Zap className="w-2.5 h-2.5" />
                    Mở ngay hôm nay
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={formData.start_time ? (formData.start_time.includes('T') ? formData.start_time.substring(0, 16) : `${formData.start_time}T00:00`) : ''}
                  onChange={(e) => setFormData((p) => ({ ...p, start_time: e.target.value }))}
                  className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
                />
                {(() => {
                  if (!formData.start_time) {
                    return (
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        Để trống hoặc chọn ngày để mở ngay lập tức.
                      </span>
                    );
                  }
                  const stStr = String(formData.start_time).trim();
                  const stMs = stStr.length === 10 ? new Date(`${stStr}T00:00:00+07:00`).getTime() : new Date(stStr).getTime();
                  const isFuture = !isNaN(stMs) && stMs > Date.now();
                  if (isFuture) {
                    return (
                      <div className="mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Lưu ý: Bạn đang chọn thời gian trong tương lai!</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">
                          Khách truy cập sẽ thấy đồng hồ đếm ngược <strong>"Chờ Mở"</strong> và <strong>KHÔNG THỂ giật mã</strong> cho đến thời điểm này.
                          Nếu muốn khách có thể giật mã ngay lập tức, hãy bấm nút <strong>"Mở ngay hôm nay"</strong> ở trên.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block pt-0.5">
                      ✓ Đang mở giật mã bình thường (Không khóa đếm ngược).
                    </span>
                  );
                })()}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 dark:text-slate-400 block text-[11px] font-semibold">
                    Thời gian hạn phát (Ngày hết hạn):
                  </label>
                  {formData.end_time && (
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, end_time: '' }))}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Xóa hạn (Vô hạn)
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={formData.end_time ? (formData.end_time.includes('T') ? formData.end_time.substring(0, 16) : `${formData.end_time}T23:59`) : ''}
                  onChange={(e) => setFormData((p) => ({ ...p, end_time: e.target.value }))}
                  className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">Chọn nhanh:</span>
                  {[
                    {
                      label: 'Đến khi hết mã',
                      action: () => setFormData((p) => ({ ...p, end_time: '' })),
                    },
                    {
                      label: '+7 ngày',
                      action: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        d.setHours(23, 59, 0, 0);
                        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
                        setFormData((p) => ({ ...p, end_time: localIso }));
                      },
                    },
                    {
                      label: '+30 ngày',
                      action: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        d.setHours(23, 59, 0, 0);
                        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
                        setFormData((p) => ({ ...p, end_time: localIso }));
                      },
                    },
                    {
                      label: 'Hết tháng này',
                      action: () => {
                        const d = new Date();
                        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 0, 0);
                        const localIso = new Date(lastDay.getTime() - lastDay.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
                        setFormData((p) => ({ ...p, end_time: localIso }));
                      },
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={item.action}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 cursor-pointer transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5">
                  Quá thời điểm này, sự kiện tự động chuyển sang "Đã kết thúc".
                </span>
              </div>
            </div>
          </div>

          {/* Compressed Image Upload Component */}
          <ImageUploadInput
            label="Ảnh Banner / Icon Sự Kiện"
            value={formData.cover_image_url}
            onChange={(val) => setFormData((p) => ({ ...p, cover_image_url: val }))}
            helperText="Chọn ảnh từ máy tính — Tự động nén siêu nhẹ để hiển thị tức thì trên Web Khách."
          />

          {/* Claimed Count & Virtual Display Configuration */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Hiển thị số lượt đã giật (Trang khách)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bật/tắt huy hiệu "Đã giật: Y" trên thẻ sự kiện giveaway.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_claimed_count}
                  onChange={(e) => setFormData((p) => ({ ...p, show_claimed_count: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {formData.show_claimed_count && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Số Lượt Đã Giật Ảo Bổ Sung</span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-normal">
                    Khách thấy: <strong className="font-bold">{(editingItem?.claimed_codes || 0) + (Number(formData.virtual_claimed_offset) || 0)}</strong> (Thật: {editingItem?.claimed_codes || 0} + Ảo: {Number(formData.virtual_claimed_offset) || 0})
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.virtual_claimed_offset}
                  onChange={(e) => setFormData((p) => ({ ...p, virtual_claimed_offset: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  placeholder="0"
                  className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* SECTION 1: GLOBAL RELEASE INTERVAL (HỒI CHIÊU TOÀN SÀN CHO TOÀN WEB CHỜ) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ⏱️ Phát Code Giãn Cách Toàn Sàn (Toàn Web Chờ Giữa 2 Lượt Giật):
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                {formData.global_cooldown_seconds === 0
                  ? 'Tắt (Phát liên tục)'
                  : formData.global_cooldown_seconds >= 60
                  ? `${Math.floor(formData.global_cooldown_seconds / 60)} phút ${formData.global_cooldown_seconds % 60 > 0 ? `${formData.global_cooldown_seconds % 60}s` : ''}`
                  : `${formData.global_cooldown_seconds} giây`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Khi người A giật code thành công, toàn bộ website (người B, C, D...) bị khóa đếm ngược và phải chờ hết khoảng thời gian này mới giật được mã kế tiếp.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={formData.global_cooldown_seconds}
                  onChange={(e) => setFormData((p) => ({ ...p, global_cooldown_seconds: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  placeholder="0 = Tắt, cho phép giật tự do"
                  className="w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs text-slate-500 whitespace-nowrap font-medium">giây</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium mr-1">Chọn nhanh:</span>
                {[
                  { label: 'Tắt (0s)', val: 0 },
                  { label: '30s', val: 30 },
                  { label: '1 phút', val: 60 },
                  { label: '2 phút', val: 120 },
                  { label: '3 phút', val: 180 },
                  { label: '5 phút', val: 300 },
                  { label: '10 phút', val: 600 },
                  { label: '15 phút', val: 900 },
                  { label: '30 phút', val: 1800 },
                  { label: '45 phút', val: 2700 },
                  { label: '1 giờ', val: 3600 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, global_cooldown_seconds: item.val }))}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      formData.global_cooldown_seconds === item.val
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Status & Reset Current Cooldown if editing */}
              {editingItem && editingItem.last_global_claim_at && (
                <div className="p-2.5 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 border border-amber-300/50 dark:border-amber-700/50 flex items-center justify-between text-xs mt-2">
                  <div className="text-[11px] text-amber-900 dark:text-amber-200">
                    <span>Lượt giật gần nhất: </span>
                    <strong className="font-mono">{formatFullDateTime(editingItem.last_global_claim_at)}</strong>
                    {editingItem.is_last_claim_simulated ? (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        🤖 Mô phỏng
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((p) => ({ ...p, last_global_claim_at: '' }));
                      if (editingItem) handleResetGlobalCooldown(editingItem);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
                  >
                    🔄 Mở đợt phát ngay (Reset chờ)
                  </button>
                </div>
              )}

              {/* TỰ ĐỘNG MÔ PHỎNG LƯỢT GIẬT CHO SỰ KIỆN CÓ GIÃN CÁCH TOÀN SÀN */}
              {formData.global_cooldown_seconds > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-amber-200/90 dark:border-amber-800/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enable_auto_simulation !== false}
                        onChange={(e) => setFormData((p) => ({ ...p, enable_auto_simulation: e.target.checked }))}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                      <span>🤖 Tự động mô phỏng lượt giật khi không ai giật (Chống ế)</span>
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      formData.enable_auto_simulation !== false
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}>
                      {formData.enable_auto_simulation !== false ? 'Đang BẬT' : 'Đã TẮT'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Khi quá thời gian chờ mà chưa có người thật giật, hệ thống tự động chọn tên từ kho 90 nick FOMO để giật mô phỏng, bắt đầu đếm giãn cách khóa người thật như thật. Tuyệt đối không hao hụt mã thật trong kho.
                  </p>

                  {formData.enable_auto_simulation !== false && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Ngưỡng chờ không người giật thật:
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                          Áp dụng: {formData.simulation_idle_threshold_minutes > 0
                            ? `${formData.simulation_idle_threshold_minutes} phút`
                            : `${Math.max(60, Math.ceil((formData.global_cooldown_seconds * 3) / 60))} phút (Mặc định 3x giãn cách)`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={formData.simulation_idle_threshold_minutes}
                          onChange={(e) => setFormData((p) => ({ ...p, simulation_idle_threshold_minutes: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                          placeholder="0 = Tự động (gấp 3 lần giãn cách, tối thiểu 60p)"
                          className="w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <span className="text-xs text-slate-500 whitespace-nowrap font-medium">phút</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block italic">
                        * Nhập 0 để hệ thống tự động tính (gấp 3 lần thời gian giãn cách, tối thiểu 60 phút).
                      </span>

                      {/* SỐ MÃ CỘNG THÊM VÀO SỐ HIỂN THỊ (CƠ CHẾ CỘNG/TRỪ SỐ HIỂN THỊ) */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Số mã cộng thêm vào số hiển thị:
                          </span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">
                            {formData.virtual_remaining_addition !== undefined ? formData.virtual_remaining_addition : 20} mã (Cài đặt)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={formData.virtual_remaining_addition !== undefined ? formData.virtual_remaining_addition : 20}
                            onChange={(e) => setFormData((p) => ({ ...p, virtual_remaining_addition: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                            placeholder="Mặc định: 20 mã"
                            className="w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">mã</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block leading-relaxed">
                          * Số hiển thị ban đầu = Kho thật + Số cộng thêm (vd: 30 + 20 = 50). Mỗi lượt giật (thật hoặc bot) trừ 1. Khi trừ hết số cộng thêm sẽ tự hồi lại {formData.virtual_remaining_addition !== undefined ? formData.virtual_remaining_addition : 20} mã. Tự động dừng hẳn khi kho thật về 0. Tuyệt đối không tạo mã ảo.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: CUSTOM NOTIFICATION MESSAGES */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-3">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              💬 Cài Đặt Thông Báo Tùy Chỉnh Khi Giật Mã:
            </span>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between text-[11px]">
                  <span>1. Thông báo khi giật mã thành công:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Hỗ trợ: {'{code}'}, {'{game_name}'}</span>
                </label>
                <input
                  type="text"
                  value={formData.custom_success_msg}
                  onChange={(e) => setFormData((p) => ({ ...p, custom_success_msg: e.target.value }))}
                  placeholder="Mặc định: Chúc mừng bạn đã giật thành công giftcode: {code}! Hãy kích hoạt ngay nhé."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between text-[11px]">
                  <span>2. Thông báo khi đang chờ đợt mã tiếp theo (Hồi chiêu):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Hỗ trợ: {'{last_user}'}, {'{time_left}'}</span>
                </label>
                <input
                  type="text"
                  value={formData.custom_cooldown_msg}
                  onChange={(e) => setFormData((p) => ({ ...p, custom_cooldown_msg: e.target.value }))}
                  placeholder="Mặc định: Đợt phát trước đạo hữu {last_user} đã nhanh tay đi trước, đạo hữu vui lòng đợi {time_left} rồi thử sức lại."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                  <span>Mẫu chèn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, custom_cooldown_msg: 'Đợt phát trước đạo hữu {last_user} đã nhanh tay đi trước, đạo hữu vui lòng đợi {time_left} rồi thử sức lại.' }))}
                    className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer font-medium"
                  >
                    Dùng mẫu mặc định
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, custom_cooldown_msg: (p.custom_cooldown_msg ? p.custom_cooldown_msg + ' ' : '') + '{last_user}' }))}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:underline cursor-pointer font-mono"
                  >
                    +{'{last_user}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, custom_cooldown_msg: (p.custom_cooldown_msg ? p.custom_cooldown_msg + ' ' : '') + '{time_left}' }))}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:underline cursor-pointer font-mono"
                  >
                    +{'{time_left}'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold text-[11px] block">
                  3. Thông báo khi sự kiện hết sạch mã trong kho:
                </label>
                <input
                  type="text"
                  value={formData.custom_out_of_stock_msg}
                  onChange={(e) => setFormData((p) => ({ ...p, custom_out_of_stock_msg: e.target.value }))}
                  placeholder="Mặc định: Rất tiếc! Toàn bộ giftcode của sự kiện này đã được trao tặng hết."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: LIVE WAITING ROOM & QUEUE COUNTER */}
          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  👥 Phòng Chờ & Bộ Đếm Người Đang Chờ (Waiting Room):
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hiển thị số lượng người đang cùng canh giật mã tiếp theo ngoài Web Khách.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enable_waiting_room}
                  onChange={(e) => setFormData((p) => ({ ...p, enable_waiting_room: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {formData.enable_waiting_room && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold text-[11px] block">
                      Số người tối thiểu (Min):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.waiting_users_min}
                      onChange={(e) => setFormData((p) => ({ ...p, waiting_users_min: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      placeholder="VD: 25"
                      className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold text-[11px] block">
                      Số người tối đa (Max):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.waiting_users_max}
                      onChange={(e) => setFormData((p) => ({ ...p, waiting_users_max: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      placeholder="VD: 85"
                      className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">Xem trước ngoài Web Khách:</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span>🟢 Có {Math.floor((Number(formData.waiting_users_min) + Number(formData.waiting_users_max)) / 2 || 48)} người đang cùng chờ mã kế tiếp</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: TÙY CHỈNH Ô THÔNG BÁO / LINK CỘNG ĐỒNG (ZALO) */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  🔗 Ô Thông Báo / Link Tùy Chỉnh (Zalo / Cộng Đồng):
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hiển thị ô nút bấm dẫn link (Zalo, fanpage, telegram...) trong modal chi tiết sự kiện ngoài Web Khách (Mặc định: TẮT).
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.custom_banner_enabled}
                  onChange={(e) => setFormData((p) => ({ ...p, custom_banner_enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.custom_banner_enabled && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold text-[11px] block">
                    1. Nội dung hiển thị:
                  </label>
                  <input
                    type="text"
                    value={formData.custom_banner_text}
                    onChange={(e) => setFormData((p) => ({ ...p, custom_banner_text: e.target.value }))}
                    placeholder="Mặc định: Tham gia nhóm zalo của web tại đây"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold text-[11px] block">
                    2. Đường dẫn link (URL khi người dùng bấm vào dòng chữ):
                  </label>
                  <input
                    type="url"
                    value={formData.custom_banner_link}
                    onChange={(e) => setFormData((p) => ({ ...p, custom_banner_link: e.target.value }))}
                    placeholder="VD: https://zalo.me/g/xyz123 hoặc https://facebook.com/groups/..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                  />
                </div>

                {/* Preview Box */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-semibold text-blue-900 dark:text-blue-200 truncate">
                      {formData.custom_banner_text || 'Tham gia nhóm zalo của web tại đây'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold shrink-0 ml-2">
                    <span>{formData.custom_banner_link ? 'Mở link' : 'Chưa nhập link'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="gw_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="gw_is_active" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Đang mở (Cho phép người chơi nhận mã trên Web Khách)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 cursor-pointer ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Đang Lưu Lên Máy Chủ...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{editingItem ? 'Cập Nhật Đợt Phát' : 'Tạo Đợt Phát'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </FormModal>

      {/* KHO MÃ (BATCH POOL MODAL) */}
      <FormModal
        isOpen={isPoolModalOpen}
        onClose={() => {
          setIsPoolModalOpen(false);
          setSelectedPoolCodes([]);
        }}
        title={`Quản Lý Kho Mã: ${currentCampaignForPool?.title}`}
        subtitle="Quản lý mã code phát riêng, nhập thêm mã hoặc xóa các mã không còn sử dụng."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Đợt phát:</span>
              <strong className="text-slate-900 dark:text-white font-bold">{currentCampaignForPool?.title}</strong>
            </div>
            <div className="text-right font-mono">
              <span className="text-slate-400 block text-[11px]">Số mã hiện có trong kho:</span>
              <div className="flex items-center justify-end gap-2">
                <strong className="text-emerald-600 font-bold">{currentCampaignForPool?.codes_pool?.length || 0} mã</strong>
                {(currentCampaignForPool?.codes_pool?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => currentCampaignForPool && handleForcePushPoolToD1(currentCampaignForPool)}
                    disabled={isSavingPool}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Bắn đồng bộ toàn bộ mã hiện có trong kho này lên máy chủ Cloudflare D1 ngay lập tức"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Đồng bộ lên D1</span>
                  </button>
                )}
                {(() => {
                  const pool = currentCampaignForPool?.codes_pool || [];
                  const uCount = new Set(pool.map((c: any) => String(c).trim().toUpperCase())).size;
                  const dCount = pool.length - uCount;
                  if (dCount > 0) {
                    return (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          ⚠️ {uCount} duy nhất ({dCount} trùng)
                        </span>
                        <button
                          type="button"
                          onClick={handleDeduplicateCurrentPool}
                          disabled={isSavingPool}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
                          title="Tự động loại bỏ tất cả các mã trùng lặp trong kho"
                        >
                          ⚡ Gỡ Trùng Kho Mã
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPoolTab('ADD')}
              className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                poolTab === 'ADD'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              📥 Nhập thêm mã mới
            </button>
            <button
              type="button"
              onClick={() => setPoolTab('LIST')}
              className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                poolTab === 'LIST'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              📦 Danh sách mã trong kho ({currentCampaignForPool?.codes_pool?.length || 0})
            </button>
          </div>

          {poolTab === 'ADD' ? (
            <form onSubmit={handleSavePoolCodes} className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dán Danh Sách Mã Code Mới (Mỗi dòng 1 mã) <span className="text-rose-500">*</span>
                  </label>
                  {(() => {
                    const rawLines = batchPoolLines.split('\n').map((l) => l.trim().toUpperCase()).filter(Boolean);
                    if (rawLines.length === 0) {
                      return <span className="text-[10px] font-mono text-slate-400">0 mã phát hiện</span>;
                    }
                    const curPool = currentCampaignForPool?.codes_pool || [];
                    const curSet = new Set(curPool.map((c: any) => String(c).trim().toUpperCase()));
                    const seen = new Set<string>();
                    let intDups = 0;
                    let extDups = 0;
                    let validNew = 0;
                    for (const l of rawLines) {
                      if (curSet.has(l)) extDups++;
                      else if (seen.has(l)) intDups++;
                      else {
                        seen.add(l);
                        validNew++;
                      }
                    }
                    const totalDups = intDups + extDups;
                    return (
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="text-purple-600 font-bold">{rawLines.length} mã</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-600 font-bold">+{validNew} mới</span>
                        {totalDups > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-amber-500 font-bold">⚠️ Loại bỏ {totalDups} trùng ({intDups} nội bộ, {extDups} đã có)</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <textarea
                  required
                  rows={8}
                  value={batchPoolLines}
                  onChange={(e) => setBatchPoolLines(e.target.value)}
                  placeholder="VD:&#10;GIFT-3Q-998811&#10;GIFT-3Q-998812&#10;GIFT-3Q-998813"
                  className="mt-1 w-full font-mono text-xs rounded-xl border border-slate-200 bg-white p-3 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPoolModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingPool}
                  className={`inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 cursor-pointer ${isSavingPool ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSavingPool ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Đang Nạp Lên Máy Chủ...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Nạp Vào Kho Phát</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {currentCampaignForPool && (() => {
                const pool = currentCampaignForPool.codes_pool || [];
                const isAllSelected = pool.length > 0 && pool.every((c) => selectedPoolCodes.includes(c));

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={() => {
                            if (isAllSelected) {
                              setSelectedPoolCodes([]);
                            } else {
                              setSelectedPoolCodes([...pool]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <span>Chọn tất cả ({pool.length} mã)</span>
                      </label>

                      {selectedPoolCodes.length > 0 && (
                        <button
                          type="button"
                          onClick={handleBulkDeletePoolCodes}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa {selectedPoolCodes.length} mã đã chọn</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
                      {pool.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          Kho mã hiện đang trống. Vui lòng chuyển sang tab "Nhập thêm mã mới".
                        </div>
                      ) : (
                        pool.map((c, idx) => {
                          const isSel = selectedPoolCodes.includes(c);
                          return (
                            <div
                              key={`${c}_${idx}`}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                isSel
                                  ? 'border-purple-500/50 bg-purple-50/40 dark:bg-purple-950/30'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSel}
                                  onChange={() => {
                                    if (isSel) {
                                      setSelectedPoolCodes(selectedPoolCodes.filter((x) => x !== c));
                                    } else {
                                      setSelectedPoolCodes([...selectedPoolCodes, c]);
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800"
                                />
                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  {c}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(c, `${c}_${idx}`)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                  title="Sao chép"
                                >
                                  {copiedId === `${c}_${idx}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePoolCode(c)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="Xóa mã này khỏi kho"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPoolModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </FormModal>

      {/* LỊCH SỬ NHẬN MÃ (CLAIM HISTORY MODAL) */}
      <FormModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Lịch Sử Nhận Mã: ${currentCampaignForHistory?.title}`}
        subtitle="Danh sách người chơi và địa chỉ IP đã nhận giftcode từ chiến dịch này."
        maxWidth="xl"
      >
        <div className="space-y-4">
          {(() => {
            const allHistory = currentCampaignForHistory?.claim_history || [];
            const realCount = allHistory.filter((c: any) => !c.is_simulated).length;
            const simCount = allHistory.filter((c: any) => !!c.is_simulated).length;

            const filteredHistory = allHistory.filter((item: any) => {
              if (historyFilterTab === 'REAL') return !item.is_simulated;
              if (historyFilterTab === 'SIMULATED') return !!item.is_simulated;
              return true;
            });

            return (
              <>
                {/* 3 Tabs Lọc: Tất cả / Người thật / Mô phỏng */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setHistoryFilterTab('ALL')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      historyFilterTab === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tất cả ({allHistory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilterTab('REAL')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      historyFilterTab === 'REAL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Người thật ({realCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilterTab('SIMULATED')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      historyFilterTab === 'SIMULATED'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Mô phỏng ({simCount})</span>
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item: any) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          item.is_simulated
                            ? 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 dark:text-white font-bold">{item.user}</strong>
                            <span className="text-slate-400 text-[11px]">
                              ({item.email || (item.is_simulated ? 'Nick mô phỏng' : 'Khách')})
                            </span>
                            {item.is_simulated ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                                <Bot className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Mô phỏng
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                                <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Người thật
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            IP: {item.is_simulated ? 'Hệ thống mô phỏng' : (item.ip || '—')} • Thời gian: {formatFullDateTime(item?.claimedAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold px-2.5 py-1 rounded border ${
                            item.is_simulated
                              ? 'text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800'
                              : 'text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          }`}>
                            {item.code}
                          </span>
                          {!item.is_simulated && (
                            <button
                              onClick={() => handleCopy(item.code, item.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title="Sao chép"
                            >
                              {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      {historyFilterTab === 'SIMULATED'
                        ? 'Chưa có lượt mô phỏng nào cho chiến dịch này.'
                        : historyFilterTab === 'REAL'
                        ? 'Chưa có người thật nào nhận mã trong chiến dịch này.'
                        : 'Chưa có lượt nhận nào được ghi nhận cho chiến dịch này.'}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </FormModal>

      {/* Delete Campaign Confirm Modal */}
      <ConfirmModal
        isOpen={!!deletingCampaign}
        onClose={() => setDeletingCampaign(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác Nhận Xóa Đợt Phát Code"
        message={`Bạn có chắc muốn xóa đợt phát "${deletingCampaign?.title}"?`}
        confirmText="Xóa Đợt Phát"
        variant="danger"
      />

      {/* Quick FOMO Adjust Modal */}
      {fomoAdjustCampaign && (
        <QuickFomoAdjustModal
          isOpen={!!fomoAdjustCampaign}
          onClose={() => setFomoAdjustCampaign(null)}
          itemType="giveaway"
          itemId={fomoAdjustCampaign.id}
          itemTitle={fomoAdjustCampaign.title}
          gameName={fomoAdjustCampaign.game_name}
          realStock={Array.isArray(fomoAdjustCampaign.codes_pool) && fomoAdjustCampaign.codes_pool.length > 0 ? fomoAdjustCampaign.codes_pool.length : Math.max(0, Number(fomoAdjustCampaign.remaining_codes || 0))}
          realSoldOrClaimed={fomoAdjustCampaign.claimed_codes || 0}
          onSuccess={() => loadData()}
          onShowToast={onShowToast}
        />
      )}

      {/* Universal Template Modal */}
      <UniversalTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          loadData();
        }}
        onShowToast={onShowToast}
        giveaways={giveaways}
        utilities={adminDataService.getUtilities()}
        storeProducts={adminDataService.getStoreProducts()}
        games={games}
      />
    </div>
  );
};
