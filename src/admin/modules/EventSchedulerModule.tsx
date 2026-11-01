import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Check,
  Flame,
  Sparkles,
  Zap,
  Tag,
  Gift,
  ShoppingBag,
  Megaphone,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  AlertCircle,
  Search,
  Filter,
  Save,
  X,
  ExternalLink,
  KeyRound,
  Key,
  RefreshCw,
  Terminal,
  Code2,
  Copy,
  Shield,
  ShieldCheck,
  Power,
  Play,
} from 'lucide-react';
import { eventSchedulerService } from '../../services/eventSchedulerService';
import { adminDataService } from '../services/adminDataService';
import {
  ScheduledEventRecord,
  ScheduledEventType,
  ScheduledEventTheme,
  ScheduledEventStatus,
} from '../../types/eventScheduler';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EventCountdownBadge } from '../../components/countdown/EventCountdownBadge';
import { formatCurrencyVND } from '../../utils/textUtils';
import type { GiveawayCampaign, UtilityProduct } from '../../types/game';

interface EventSchedulerModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const EventSchedulerModule: React.FC<EventSchedulerModuleProps> = ({ onShowToast }) => {
  const [schedules, setSchedules] = useState<ScheduledEventRecord[]>([]);
  const [giveaways, setGiveaways] = useState<GiveawayCampaign[]>([]);
  const [utilities, setUtilities] = useState<UtilityProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'ENDED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ScheduledEventType>('ALL');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledEventRecord | null>(null);
  const [deletingItem, setDeletingItem] = useState<ScheduledEventRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    subtitle: string;
    type: ScheduledEventType;
    target_id: string;
    game_slug: string;
    game_name: string;
    target_name: string;
    original_price: number;
    sale_price: number;
    discount_percent: number;
    start_time: string;
    end_time: string;
    countdown_lead_hours: number;
    show_top_banner: boolean;
    show_in_giveaways: boolean;
    show_in_store: boolean;
    show_in_game_detail: boolean;
    theme: ScheduledEventTheme;
    badge_label: string;
    cta_text: string;
    cta_link: string;
    is_active: boolean;
  }>({
    title: '',
    subtitle: '',
    type: 'GIVEAWAY',
    target_id: '',
    game_slug: '',
    game_name: '',
    target_name: '',
    original_price: 0,
    sale_price: 0,
    discount_percent: 0,
    start_time: '',
    end_time: '',
    countdown_lead_hours: 72,
    show_top_banner: true,
    show_in_giveaways: true,
    show_in_store: true,
    show_in_game_detail: true,
    theme: 'fire',
    badge_label: 'SẮP DIỄN RA',
    cta_text: 'Săn Mã Ngay',
    cta_link: '',
    is_active: true,
  });

  const loadData = () => {
    setSchedules(eventSchedulerService.getSchedules());
    setGiveaways(adminDataService.getGiveaways());
    setUtilities(adminDataService.getUtilities());
  };

  useEffect(() => {
    loadData();
    const unsub = eventSchedulerService.onUpdate((list) => {
      setSchedules(list);
    });
    return unsub;
  }, []);

  // Filtered List
  const filteredSchedules = useMemo(() => {
    const now = Date.now();
    return schedules.filter((s) => {
      const status = eventSchedulerService.calculateEventStatus(s, now);
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && s.type !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchGame = (s.game_name || '').toLowerCase().includes(q);
        const matchTarget = (s.target_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchGame && !matchTarget) return false;
      }

      return true;
    });
  }, [schedules, statusFilter, typeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const now = Date.now();
    let live = 0;
    let upcoming = 0;
    let ended = 0;

    schedules.forEach((s) => {
      const st = eventSchedulerService.calculateEventStatus(s, now);
      if (st === 'LIVE') live++;
      else if (st === 'UPCOMING') upcoming++;
      else ended++;
    });

    return { total: schedules.length, live, upcoming, ended };
  }, [schedules]);

  // Open Form for Adding New Event
  const handleOpenAdd = () => {
    setEditingItem(null);
    const now = new Date();
    // Default start time: Tomorrow at 20:00
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    tomorrow.setHours(20, 0, 0, 0);
    // Default end time: 3 days after tomorrow at 23:59
    const end = new Date(tomorrow.getTime() + 3 * 24 * 3600 * 1000);
    end.setHours(23, 59, 59, 0);

    const formatToLocalInput = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setFormData({
      title: '',
      subtitle: 'Đếm ngược để không bỏ lỡ phần quà giới hạn',
      type: 'GIVEAWAY',
      target_id: giveaways[0]?.id || '',
      game_slug: giveaways[0]?.game_slug || '',
      game_name: giveaways[0]?.game_name || '',
      target_name: giveaways[0]?.title || '',
      original_price: 0,
      sale_price: 0,
      discount_percent: 0,
      start_time: formatToLocalInput(tomorrow),
      end_time: formatToLocalInput(end),
      countdown_lead_hours: 72,
      show_top_banner: true,
      show_in_giveaways: true,
      show_in_store: true,
      show_in_game_detail: true,
      theme: 'fire',
      badge_label: 'SẮP DIỄN RA',
      cta_text: 'Săn Mã Ngay',
      cta_link: '',
      is_active: true,
    });
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (item: ScheduledEventRecord) => {
    setEditingItem(item);
    const toLocalInput = (isoStr: string) => {
      if (!isoStr) return '';
      try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return '';
      }
    };

    setFormData({
      title: item.title,
      subtitle: item.subtitle || '',
      type: item.type,
      target_id: item.target_id || '',
      game_slug: item.game_slug || '',
      game_name: item.game_name || '',
      target_name: item.target_name || '',
      original_price: item.original_price || 0,
      sale_price: item.sale_price || 0,
      discount_percent: item.discount_percent || 0,
      start_time: toLocalInput(item.start_time),
      end_time: toLocalInput(item.end_time),
      countdown_lead_hours: item.countdown_lead_hours ?? 72,
      show_top_banner: item.show_top_banner !== false,
      show_in_giveaways: item.show_in_giveaways !== false,
      show_in_store: item.show_in_store !== false,
      show_in_game_detail: item.show_in_game_detail !== false,
      theme: item.theme || 'fire',
      badge_label: item.badge_label || 'SẮP DIỄN RA',
      cta_text: item.cta_text || 'Xem Ngay',
      cta_link: item.cta_link || '',
      is_active: item.is_active !== false,
    });
    setIsFormOpen(true);
  };

  // Target Selection Changed
  const handleTargetChange = (targetId: string, currentType: ScheduledEventType) => {
    if (currentType === 'GIVEAWAY') {
      const gw = giveaways.find((g) => g.id === targetId);
      if (gw) {
        setFormData((prev) => ({
          ...prev,
          target_id: gw.id,
          game_slug: gw.game_slug,
          game_name: gw.game_name,
          target_name: gw.title,
          title: prev.title || `Săn Giftcode: ${gw.title} - ${gw.game_name}`,
          cta_link: `/giveaways/${gw.id}`,
        }));
      }
    } else if (currentType === 'FLASH_SALE_PRODUCT') {
      const ut = utilities.find((u) => u.id === targetId);
      if (ut) {
        const origPrice = ut.original_price || ut.current_price;
        const discount = prevDiscountOrCalc(origPrice, ut.current_price);
        setFormData((prev) => ({
          ...prev,
          target_id: ut.id,
          target_name: ut.title,
          original_price: origPrice,
          sale_price: Math.round(origPrice * 0.7), // Gợi ý sale -30%
          discount_percent: 30,
          title: prev.title || `Flash Sale: ${ut.title}`,
          cta_link: `/utilities`,
        }));
      }
    }
  };

  const prevDiscountOrCalc = (orig: number, cur: number) => {
    if (orig <= 0 || cur >= orig) return 20;
    return Math.round(((orig - cur) / orig) * 100);
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      onShowToast('Lỗi nhập liệu', 'Vui lòng điền tiêu đề sự kiện', 'error');
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      onShowToast('Lỗi nhập liệu', 'Vui lòng chọn thời gian bắt đầu và kết thúc', 'error');
      return;
    }

    const startIso = new Date(formData.start_time).toISOString();
    const endIso = new Date(formData.end_time).toISOString();

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      onShowToast('Lỗi thời gian', 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu', 'error');
      return;
    }

    const record: ScheduledEventRecord = {
      id: editingItem ? editingItem.id : `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim(),
      type: formData.type,
      target_id: formData.target_id || undefined,
      game_slug: formData.game_slug || undefined,
      game_name: formData.game_name || undefined,
      target_name: formData.target_name || undefined,
      original_price: formData.original_price || undefined,
      sale_price: formData.sale_price || undefined,
      discount_percent: formData.discount_percent || undefined,
      start_time: startIso,
      end_time: endIso,
      countdown_lead_hours: Number(formData.countdown_lead_hours) || 0,
      show_top_banner: formData.show_top_banner,
      show_in_giveaways: formData.show_in_giveaways,
      show_in_store: formData.show_in_store,
      show_in_game_detail: formData.show_in_game_detail,
      theme: formData.theme,
      badge_label: formData.badge_label.trim() || 'SẮP DIỄN RA',
      cta_text: formData.cta_text.trim() || 'Xem Ngay',
      cta_link: formData.cta_link.trim() || undefined,
      is_active: formData.is_active,
      created_at: editingItem?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    eventSchedulerService.saveSchedule(record);
    // Push sync to server D1 / Edge Cache
    try {
      (adminDataService as any).syncToCloudflareKV('wcg_event_schedules_v1', eventSchedulerService.getSchedules());
    } catch {}

    setIsFormOpen(false);
    onShowToast('Thành công', editingItem ? 'Đã cập nhật lịch sự kiện' : 'Đã tạo lịch sự kiện và đếm ngược mới', 'success');
  };

  // Toggle Active
  const handleToggleActive = (id: string) => {
    eventSchedulerService.toggleScheduleActive(id);
    try {
      (adminDataService as any).syncToCloudflareKV('wcg_event_schedules_v1', eventSchedulerService.getSchedules());
    } catch {}
    onShowToast('Đã lưu', 'Đã thay đổi trạng thái kích hoạt sự kiện', 'info');
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    eventSchedulerService.deleteSchedule(deletingItem.id);
    try {
      (adminDataService as any).syncToCloudflareKV('wcg_event_schedules_v1', eventSchedulerService.getSchedules());
    } catch {}
    setDeletingItem(null);
    onShowToast('Đã xóa', 'Đã xóa lịch sự kiện thành công', 'success');
  };

  // --- SUBTAB & API MANAGEMENT STATE ---
  const [subTab, setSubTab] = useState<'scheduler' | 'api'>('scheduler');
  const [schedulerApiKeys, setSchedulerApiKeys] = useState<any[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState<'30' | '90' | '365' | 'permanent'>('90');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{ raw_key: string; key_name: string } | null>(null);
  const [copiedKeyText, setCopiedKeyText] = useState<string | null>(null);

  // Quick API Tester State
  const [testAction, setTestAction] = useState<'GET_LIST' | 'GET_DETAIL' | 'TRIGGER_LIVE' | 'EXTEND_TIME' | 'TOGGLE_ACTIVE' | 'DELETE'>('GET_LIST');
  const [testApiKey, setTestApiKey] = useState('');
  const [testSelectedEventId, setTestSelectedEventId] = useState('');
  const [testDurationMinutes, setTestDurationMinutes] = useState(120);
  const [testExtendMinutes, setTestExtendMinutes] = useState(60);
  const [testActiveState, setTestActiveState] = useState(true);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testApiResponse, setTestApiResponse] = useState<any>(null);
  const [testApiStatus, setTestApiStatus] = useState<number | null>(null);

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
      'x-admin-sync-key': syncKey,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const formatFullDateTime = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return iso;
    }
  };

  const loadSchedulerApiKeys = async () => {
    setIsLoadingApiKeys(true);
    try {
      const res = await fetch('/api/api-keys', {
        headers: getAdminHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.keys)) {
        const filtered = data.keys.filter((k: any) => {
          const s = (k.scope || '').toUpperCase();
          return s.includes('EVENT_SCHEDULER_FULL') || s.includes('ADMIN_FULL') || s.includes('FULL') || s === '*';
        });
        setSchedulerApiKeys(filtered);
        if (!testApiKey && filtered.length > 0) {
          const firstWithRaw = filtered.find((k: any) => k.raw_key);
          setTestApiKey(firstWithRaw?.raw_key || filtered[0].key_prefix || 'wcg_ev_8392cd51a704ef12b94a61358c701d94ea602b8f');
        }
      }
    } catch (err: any) {
      console.warn('Failed to load api keys:', err);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKeyText(label);
    onShowToast('Đã sao chép', `Đã sao chép ${label} vào clipboard`, 'success');
    setTimeout(() => setCopiedKeyText(null), 2500);
  };

  const handleCreateSchedulerKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      onShowToast('Thiếu tên khóa', 'Vui lòng nhập tên định danh cho khóa API', 'error');
      return;
    }

    setIsCreatingKey(true);
    try {
      let expiresAt: string | undefined = undefined;
      if (newKeyExpiry !== 'permanent') {
        const days = Number(newKeyExpiry) || 90;
        expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      }

      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: 'create',
          key_name: newKeyName.trim(),
          scope: 'EVENT_SCHEDULER_FULL',
          description: `Khóa API toàn quyền quản trị Lịch Sự Kiện & Đếm Ngược: ${newKeyName.trim()}`,
          expires_at: expiresAt,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.key) {
        onShowToast('Tạo khóa thành công', `Khóa API "${data.key.key_name}" đã sẵn sàng hoạt động.`, 'success');
        if (data.raw_key) {
          setGeneratedKeyResult({
            key_name: data.key.key_name,
            raw_key: data.raw_key,
          });
          setTestApiKey(data.raw_key);
        }
        setNewKeyName('');
        loadSchedulerApiKeys();
      } else {
        onShowToast('Lỗi tạo khóa', data?.message || 'Không thể tạo khóa API', 'error');
      }
    } catch (err: any) {
      onShowToast('Lỗi hệ thống', err?.message || 'Không thể kết nối máy chủ', 'error');
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
        loadSchedulerApiKeys();
      }
    } catch {}
  };

  const handleDeleteApiKey = async (keyItem: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn khóa API "${keyItem.key_name}"?`)) {
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
        loadSchedulerApiKeys();
      } else {
        onShowToast('Lỗi xóa khóa', data?.message || 'Không thể xóa khóa', 'error');
      }
    } catch {}
  };

  const handleRunTestApi = async () => {
    if (!testApiKey.trim()) {
      onShowToast('Thiếu API Key', 'Vui lòng nhập hoặc chọn mã API Key để thử nghiệm', 'error');
      return;
    }

    setIsTestingApi(true);
    setTestApiResponse(null);
    setTestApiStatus(null);

    try {
      let url = '/api/event-scheduler';
      let method = 'GET';
      let reqBody: any = null;

      if (testAction === 'GET_LIST') {
        url = '/api/event-scheduler?status=ALL';
        method = 'GET';
      } else if (testAction === 'GET_DETAIL') {
        if (!testSelectedEventId) {
          onShowToast('Chưa chọn sự kiện', 'Vui lòng chọn sự kiện cần xem chi tiết', 'error');
          setIsTestingApi(false);
          return;
        }
        url = `/api/event-scheduler?id=${encodeURIComponent(testSelectedEventId)}`;
        method = 'GET';
      } else if (testAction === 'TRIGGER_LIVE') {
        if (!testSelectedEventId) {
          onShowToast('Chưa chọn sự kiện', 'Vui lòng chọn sự kiện cần kích hoạt LIVE', 'error');
          setIsTestingApi(false);
          return;
        }
        url = '/api/event-scheduler';
        method = 'PUT';
        reqBody = {
          action: 'TRIGGER_LIVE',
          id: testSelectedEventId,
          duration_minutes: Number(testDurationMinutes) || 120,
        };
      } else if (testAction === 'EXTEND_TIME') {
        if (!testSelectedEventId) {
          onShowToast('Chưa chọn sự kiện', 'Vui lòng chọn sự kiện cần gia hạn thời gian', 'error');
          setIsTestingApi(false);
          return;
        }
        url = '/api/event-scheduler';
        method = 'PUT';
        reqBody = {
          action: 'EXTEND_TIME',
          id: testSelectedEventId,
          extend_minutes: Number(testExtendMinutes) || 60,
        };
      } else if (testAction === 'TOGGLE_ACTIVE') {
        if (!testSelectedEventId) {
          onShowToast('Chưa chọn sự kiện', 'Vui lòng chọn sự kiện cần đổi trạng thái', 'error');
          setIsTestingApi(false);
          return;
        }
        url = '/api/event-scheduler';
        method = 'PUT';
        reqBody = {
          action: 'TOGGLE_ACTIVE',
          id: testSelectedEventId,
          is_active: testActiveState,
        };
      } else if (testAction === 'DELETE') {
        if (!testSelectedEventId) {
          onShowToast('Chưa chọn sự kiện', 'Vui lòng chọn sự kiện cần xóa', 'error');
          setIsTestingApi(false);
          return;
        }
        url = `/api/event-scheduler?id=${encodeURIComponent(testSelectedEventId)}`;
        method = 'DELETE';
      }

      const headers: Record<string, string> = {
        'X-Api-Key': testApiKey.trim(),
      };
      if (reqBody) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, {
        method,
        headers,
        body: reqBody ? JSON.stringify(reqBody) : undefined,
      });

      setTestApiStatus(res.status);
      const data = await res.json().catch(() => null);
      setTestApiResponse(data);

      if (res.ok && data?.success) {
        onShowToast('Gọi API Thành Công', `HTTP ${res.status}: ${data.message || 'Thao tác hoàn tất'}`, 'success');
        if (['TRIGGER_LIVE', 'EXTEND_TIME', 'TOGGLE_ACTIVE', 'DELETE'].includes(testAction)) {
          loadData();
        }
      } else {
        onShowToast('API Báo Lỗi', `HTTP ${res.status}: ${data?.message || 'Thao tác không thành công'}`, 'error');
      }
    } catch (err: any) {
      setTestApiStatus(0);
      setTestApiResponse({ error: err?.message || 'Network request failed' });
      onShowToast('Lỗi kết nối API', err?.message || 'Không thể gửi request', 'error');
    } finally {
      setIsTestingApi(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Lịch Sự Kiện & Đồng Hồ Đếm Ngược
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Tự Động 100%
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Cài đặt thời gian mở sự kiện Phát Code, Flash Sale giảm giá sản phẩm. Hệ thống tự động đếm ngược và kích hoạt khi hết giờ.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 shadow-lg shadow-amber-900/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Tạo Lịch Sự Kiện Mới</span>
        </button>
      </div>

      {/* NAVIGATION SUB-TABS: LỊCH SỰ KIỆN VS KẾT NỐI API */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('scheduler')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'scheduler'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Lịch Đếm Ngược & Sự Kiện</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-mono">
            {schedules.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab('api');
            loadSchedulerApiKeys();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'api'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
          <span>🔑 Kết Nối API Quản Lý</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
            EVENT_SCHEDULER_FULL
          </span>
        </button>
      </div>

      {subTab === 'api' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* HEADER CARD: TỔNG QUAN API LỊCH SỰ KIỆN */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <KeyRound className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Kết Nối & Quản Lý API Lịch Sự Kiện Đếm Ngược 24/7
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                      EVENT_SCHEDULER_FULL
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Hệ thống REST Edge API toàn quyền lên lịch sự kiện: kích hoạt Giờ G ngay lập tức, gia hạn thời gian, bật/tắt đếm ngược và ghim banner.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSchedulerApiKeys}
                  disabled={isLoadingApiKeys}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApiKeys ? 'animate-spin text-amber-500' : ''}`} />
                  <span>Làm Mới Khóa</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-amber-400 font-semibold block">Quyền Hạn Cấp Phép</span>
                <span className="text-xs font-bold text-amber-200 mt-1 font-mono block">EVENT_SCHEDULER_FULL</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 font-semibold block">Kiến Trúc Backend</span>
                <span className="text-xs font-bold text-white mt-1 block">Cloudflare Edge + D1</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-emerald-400 font-semibold block">Tính Toán Đếm Ngược</span>
                <span className="text-xs font-bold text-emerald-300 mt-1 block">Realtime Chuẩn Từng Giây</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 font-semibold block">Định Dạng Xác Thực</span>
                <span className="text-xs font-bold text-white mt-1 font-mono block">Header: X-Api-Key</span>
              </div>
            </div>
          </div>

          {/* CARD 1: TẠO KHÓA API MỚI */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-white">
                  Tạo Khóa API EVENT_SCHEDULER_FULL Mới
                </h4>
              </div>
              <span className="text-[11px] text-neutral-400">
                Cấp quyền quản trị lịch sự kiện cho bot Telegram, Discord hoặc hệ thống bên ngoài
              </span>
            </div>

            <form onSubmit={handleCreateSchedulerKey} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Tên Định Danh Khóa API <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="VD: Bot Kích Hoạt Giờ G Telegram, Cronjob Lên Lịch Tự Động, Tool Quản Trị Sự Kiện"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Thời Hạn Hiệu Lực:
                  </label>
                  <select
                    value={newKeyExpiry}
                    onChange={(e: any) => setNewKeyExpiry(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="30">30 Ngày</option>
                    <option value="90">90 Ngày (Khuyến Nghị)</option>
                    <option value="365">1 Năm (365 Ngày)</option>
                    <option value="permanent">Vĩnh Viễn (Không Hết Hạn)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Quyền tự động gán: <strong className="text-amber-400 font-mono">EVENT_SCHEDULER_FULL</strong></span>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingKey || !newKeyName.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang Tạo Khóa...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Tạo Khóa API EVENT_SCHEDULER_FULL</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* THÔNG BÁO KHÓA MỚI TẠO (HIỂN THỊ 1 LẦN DUY NHẤT) */}
            {generatedKeyResult && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Đã Tạo Khóa API Thành Công: <span className="text-amber-400">{generatedKeyResult.key_name}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneratedKeyResult(null)}
                    className="text-neutral-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3 font-mono text-xs">
                  <span className="text-amber-300 font-bold select-all break-all">
                    {generatedKeyResult.raw_key}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generatedKeyResult.raw_key, 'Mã Khóa API')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 transition-all shrink-0 cursor-pointer"
                  >
                    {copiedKeyText === 'Mã Khóa API' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKeyText === 'Mã Khóa API' ? 'Đã Chép' : 'Sao Chép'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>Cảnh báo:</strong> Đây là lần duy nhất mã khóa bí mật này hiển thị đầy đủ. Hãy sao chép và lưu trữ an toàn trước khi đóng tab. Khóa này đã được điền sẵn vào Trình Thử Nghiệm bên dưới!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: DANH SÁCH KHÓA API ĐANG HOẠT ĐỘNG */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-white">
                  Danh Sách Khóa API Đang Quản Trị Sự Kiện ({schedulerApiKeys.length})
                </h4>
              </div>
              <span className="text-xs text-neutral-400">
                Bao gồm các khóa có quyền EVENT_SCHEDULER_FULL hoặc ADMIN_FULL
              </span>
            </div>

            {isLoadingApiKeys ? (
              <div className="py-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                <span>Đang tải danh sách khóa API...</span>
              </div>
            ) : schedulerApiKeys.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-neutral-400">Chưa có khóa API tùy chỉnh nào được tạo riêng cho Lịch Sự Kiện.</p>
                <p className="text-[11px] text-amber-400 font-mono">
                  Khóa mặc định toàn sàn: <strong>wcg_ev_8392cd51a704ef12b94a61358c701d94ea602b8f</strong>
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Tên Khóa API</th>
                      <th className="p-3">Tiền Tố (Prefix)</th>
                      <th className="p-3">Quyền Hạn</th>
                      <th className="p-3">Hạn Dùng</th>
                      <th className="p-3 text-center">Trạng Thái</th>
                      <th className="p-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {schedulerApiKeys.map((keyItem) => {
                      const isActive = keyItem.is_active === 1;
                      return (
                        <tr key={keyItem.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{keyItem.key_name}</span>
                              {keyItem.id === 'ak_preset_event_scheduler_full' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-mono">
                                  PRESET
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono">{keyItem.id}</span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-amber-400">
                            {keyItem.key_prefix || (keyItem.raw_key ? keyItem.raw_key.substring(0, 16) + '...' : 'wcg_ev_...')}
                          </td>
                          <td className="p-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {keyItem.scope}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-400 text-[11px]">
                            {keyItem.expires_at ? formatFullDateTime(keyItem.expires_at) : 'Vĩnh viễn'}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleApiKey(keyItem)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
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
                                    setTestApiKey(keyItem.key_prefix || 'wcg_ev_8392cd51a704ef12b94a61358c701d94ea602b8f');
                                  }
                                  onShowToast('Đã chọn khóa này', 'Đã điền khóa vào Trình Thử Nghiệm API', 'info');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-[11px] font-bold cursor-pointer"
                                title="Điền khóa này vào Trình Thử Nghiệm bên dưới"
                              >
                                <Play className="w-3 h-3 text-amber-400" />
                                <span>Thử Nghiệm</span>
                              </button>
                              {keyItem.id !== 'ak_preset_event_scheduler_full' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey(keyItem)}
                                  className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
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
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-white">
                  Trình Thử Nghiệm Gọi API Trực Tiếp (Interactive API Quick Tester)
                </h4>
              </div>
              <span className="text-[11px] text-neutral-400">
                Thực thi lệnh trực tiếp tới máy chủ Cloudflare Edge mà không cần mở Postman
              </span>
            </div>

            {/* Action Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-neutral-950 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setTestAction('GET_LIST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'GET_LIST'
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                GET: Tra Cứu Danh Sách Sự Kiện
              </button>
              <button
                type="button"
                onClick={() => setTestAction('GET_DETAIL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'GET_DETAIL'
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                GET: Chi Tiết 1 Sự Kiện & Countdown
              </button>
              <button
                type="button"
                onClick={() => setTestAction('TRIGGER_LIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'TRIGGER_LIVE'
                    ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                PUT: Kích Hoạt Giờ G (LIVE Ngay Lập Tức)
              </button>
              <button
                type="button"
                onClick={() => setTestAction('EXTEND_TIME')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'EXTEND_TIME'
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                PUT: Gia Hạn Thời Gian Sự Kiện
              </button>
              <button
                type="button"
                onClick={() => setTestAction('TOGGLE_ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'TOGGLE_ACTIVE'
                    ? 'bg-orange-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                PUT: Bật / Tắt Sự Kiện
              </button>
              <button
                type="button"
                onClick={() => setTestAction('DELETE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  testAction === 'DELETE'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                DELETE: Xóa Sự Kiện
              </button>
            </div>

            {/* Parameter Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Mã Khóa API Xác Thực (X-Api-Key) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={testApiKey}
                  onChange={(e) => setTestApiKey(e.target.value)}
                  placeholder="wcg_ev_..."
                  className="w-full font-mono rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {testAction !== 'GET_LIST' && (
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Sự Kiện Mục Tiêu:
                  </label>
                  <select
                    value={testSelectedEventId}
                    onChange={(e) => setTestSelectedEventId(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Chọn sự kiện cần thao tác --</option>
                    {schedules.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.game_name || ev.type}) - ID: {ev.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Duration inputs */}
            {testAction === 'TRIGGER_LIVE' && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Thời Lượng Sự Kiện LIVE:</span>
                  <span className="text-[11px] text-neutral-400">Sự kiện sẽ bắt đầu ngay bây giờ và kết thúc sau số phút này</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={testDurationMinutes}
                    onChange={(e) => setTestDurationMinutes(Number(e.target.value) || 120)}
                    className="w-24 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white font-mono text-center"
                  />
                  <span className="text-xs text-neutral-300">phút</span>
                </div>
              </div>
            )}

            {testAction === 'EXTEND_TIME' && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Số Phút Gia Hạn Thêm:</span>
                  <span className="text-[11px] text-neutral-400">Cộng thêm thời gian vào mốc kết thúc hiện tại</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={testExtendMinutes}
                    onChange={(e) => setTestExtendMinutes(Number(e.target.value) || 60)}
                    className="w-24 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white font-mono text-center"
                  />
                  <span className="text-xs text-neutral-300">phút</span>
                </div>
              </div>
            )}

            {testAction === 'TOGGLE_ACTIVE' && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300">
                  Trạng Thái Sau Khi Đổi:
                </span>
                <button
                  type="button"
                  onClick={() => setTestActiveState(!testActiveState)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    testActiveState
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {testActiveState ? '🟢 Kích Hoạt (ACTIVE)' : '🔴 Tạm Ngưng (INACTIVE)'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-neutral-400">
                Endpoint: <strong className="text-amber-400 font-mono">/api/event-scheduler</strong>
              </span>
              <button
                type="button"
                onClick={handleRunTestApi}
                disabled={isTestingApi || !testApiKey.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isTestingApi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang Gửi Lệnh...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>🚀 Thực Thi Gọi API Thử Nghiệm</span>
                  </>
                )}
              </button>
            </div>

            {/* RESPONSE VIEWER */}
            {testApiResponse && (
              <div className="mt-3 p-4 rounded-xl bg-neutral-950 text-neutral-100 border border-neutral-800 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-300">Kết Quả Phản Hồi Từ Edge API:</span>
                    {testApiStatus !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        testApiStatus >= 200 && testApiStatus < 300
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        HTTP {testApiStatus}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(JSON.stringify(testApiResponse, null, 2), 'JSON Response')}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Sao Chép JSON</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono leading-relaxed text-emerald-400 max-h-72 overflow-y-auto p-2 bg-black/60 rounded-lg select-all">
                  {JSON.stringify(testApiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* CARD 4: BẢNG TRA CỨU ENDPOINTS */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-white">
                  Danh Mục Tra Cứu Endpoints Chuẩn REST
                </h4>
              </div>
              <span className="text-xs text-neutral-400">Tương thích Postman, cURL, Python & Node.js</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Phương Thức</th>
                    <th className="p-3">Đường Dẫn Endpoint</th>
                    <th className="p-3">Mô Tả Chức Năng</th>
                    <th className="p-3">Yêu Cầu Quyền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                  <tr className="hover:bg-neutral-800/40">
                    <td className="p-3"><span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold">GET</span></td>
                    <td className="p-3 text-white">/api/event-scheduler?status=ALL</td>
                    <td className="p-3 font-sans">Lấy danh sách toàn bộ sự kiện hoặc 1 sự kiện cụ thể (?id=...) kèm trạng thái countdown realtime</td>
                    <td className="p-3 text-amber-400 font-bold">EVENT_SCHEDULER_FULL</td>
                  </tr>
                  <tr className="hover:bg-neutral-800/40">
                    <td className="p-3"><span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold">POST</span></td>
                    <td className="p-3 text-white">/api/event-scheduler</td>
                    <td className="p-3 font-sans">Tạo mới hoặc cập nhật toàn diện sự kiện đếm ngược (title, type, start_time, end_time, banner...)</td>
                    <td className="p-3 text-amber-400 font-bold">EVENT_SCHEDULER_FULL</td>
                  </tr>
                  <tr className="hover:bg-neutral-800/40">
                    <td className="p-3"><span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold">PUT</span></td>
                    <td className="p-3 text-white">/api/event-scheduler</td>
                    <td className="p-3 font-sans">Thao tác nhanh: action = TRIGGER_LIVE, EXTEND_TIME, TOGGLE_ACTIVE</td>
                    <td className="p-3 text-amber-400 font-bold">EVENT_SCHEDULER_FULL</td>
                  </tr>
                  <tr className="hover:bg-neutral-800/40">
                    <td className="p-3"><span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-bold">DELETE</span></td>
                    <td className="p-3 text-white">/api/event-scheduler?id=...</td>
                    <td className="p-3 font-sans">Xóa vĩnh viễn sự kiện đếm ngược khỏi hệ thống</td>
                    <td className="p-3 text-amber-400 font-bold">EVENT_SCHEDULER_FULL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-neutral-900/80 border border-neutral-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400 font-medium">Tổng Sự Kiện</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/80 border border-emerald-900/50 p-3.5 sm:p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 font-medium">Đang Diễn Ra (Live)</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{stats.live}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5 fill-emerald-400" />
          </div>
        </div>

        <div className="bg-neutral-900/80 border border-amber-900/50 p-3.5 sm:p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-medium">Đang Đếm Ngược</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{stats.upcoming}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400 font-medium">Đã Kết Thúc</div>
            <div className="text-xl sm:text-2xl font-black text-neutral-400 mt-1">{stats.ended}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên sự kiện, tựa game hoặc sản phẩm..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UPCOMING">🟡 Sắp diễn ra (Đếm ngược)</option>
            <option value="LIVE">🟢 Đang diễn ra (Live)</option>
            <option value="ENDED">⚪ Đã kết thúc</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Tất cả loại sự kiện</option>
            <option value="GIVEAWAY">🎁 Phát Giftcode (Giveaway)</option>
            <option value="FLASH_SALE_PRODUCT">⚡ Flash Sale Sản Phẩm</option>
            <option value="GLOBAL_ANNOUNCEMENT">📢 Thông Báo Chung</option>
          </select>
        </div>
      </div>

      {/* Events Table / Card List */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        {filteredSchedules.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Clock className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-neutral-300">Chưa có lịch sự kiện đếm ngược nào</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Hãy bấm nút "Tạo Lịch Sự Kiện Mới" ở trên để lên lịch đợt phát code mới hoặc sự kiện Flash Sale giảm giá.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {filteredSchedules.map((schedule) => {
              const status = eventSchedulerService.calculateEventStatus(schedule);
              const isLive = status === 'LIVE';
              const isUpcoming = status === 'UPCOMING';

              return (
                <div
                  key={schedule.id}
                  className="p-4 sm:p-5 hover:bg-neutral-800/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left Column: Info & Status */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      {isLive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                          <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                          <span>ĐANG DIỄN RA</span>
                        </span>
                      ) : isUpcoming ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3.5 h-3.5" />
                          <span>SẮP DIỄN RA</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ĐÃ KẾT THÚC</span>
                        </span>
                      )}

                      {/* Type Badge */}
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                        {schedule.type === 'GIVEAWAY' && '🎁 Phát Giftcode'}
                        {schedule.type === 'FLASH_SALE_PRODUCT' && '⚡ Flash Sale Giảm Giá'}
                        {schedule.type === 'GLOBAL_ANNOUNCEMENT' && '📢 Thông Báo Toàn Web'}
                      </span>

                      {/* Theme */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold text-neutral-400 bg-neutral-950">
                        Theme: {schedule.theme}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                        {schedule.title}
                      </h4>
                      {schedule.subtitle && (
                        <p className="text-xs text-neutral-400 mt-0.5">{schedule.subtitle}</p>
                      )}
                    </div>

                    {/* Target info & Pricing */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                      {schedule.target_name && (
                        <span className="inline-flex items-center gap-1 text-neutral-300">
                          <Tag className="w-3 h-3 text-amber-500" />
                          <span>Đối tượng: <strong className="text-white">{schedule.target_name}</strong></span>
                        </span>
                      )}
                      {schedule.type === 'FLASH_SALE_PRODUCT' && schedule.sale_price && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span>Giá Sale: {formatCurrencyVND(schedule.sale_price)}</span>
                          {schedule.original_price && schedule.original_price > schedule.sale_price && (
                            <span className="text-neutral-500 line-through text-[11px]">
                              {formatCurrencyVND(schedule.original_price)}
                            </span>
                          )}
                          {schedule.discount_percent && (
                            <span className="bg-red-500/20 text-red-400 px-1 py-0.2 rounded text-[10px]">
                              -{schedule.discount_percent}%
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Bắt đầu (Giờ G): <strong className="text-neutral-200">{new Date(schedule.start_time).toLocaleString('vi-VN')}</strong></span>
                      <span>Kết thúc: <strong className="text-neutral-200">{new Date(schedule.end_time).toLocaleString('vi-VN')}</strong></span>
                    </div>
                  </div>

                  {/* Right Column: Live Countdown Badge + Actions */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-800/80">
                    {/* Live Clock Badge */}
                    <div className="flex items-center">
                      <EventCountdownBadge
                        targetDate={isLive ? schedule.end_time : schedule.start_time}
                        label={isLive ? 'Còn lại:' : 'Mở sau:'}
                        theme={schedule.theme}
                        variant="compact"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Active Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(schedule.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          schedule.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                        }`}
                      >
                        {schedule.is_active ? 'Đang bật' : 'Đã tắt'}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(schedule)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors border border-neutral-700"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeletingItem(schedule)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition-colors border border-neutral-700 hover:border-red-800/50"
                        title="Xóa"
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
      </div>

      
        {/* BANNER KẾT NỐI API Ở CHÂN TRANG */}
        <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">
                  Tự Động Hóa & Kết Nối Bot Với API Lịch Sự Kiện
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold">
                  EVENT_SCHEDULER_FULL
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Cung cấp mã khóa API và endpoints chuẩn REST để bot Discord/Telegram tự động mở Giờ G và thông báo người chơi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubTab('api');
              loadSchedulerApiKeys();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shrink-0 cursor-pointer shadow-md"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Mở Cổng API Ngay</span>
          </button>
        </div>
        </>
      )}

      {/* Add / Edit Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? 'Chỉnh Sửa Lịch Sự Kiện' : 'Tạo Lịch Sự Kiện & Đếm Ngược Mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Type */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Loại Sự Kiện
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, type: 'GIVEAWAY' }));
                  handleTargetChange(giveaways[0]?.id || '', 'GIVEAWAY');
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  formData.type === 'GIVEAWAY'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Gift className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Phát Giftcode</div>
                  <div className="text-[11px] opacity-75">Săn mã quà tặng / Giveaway</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, type: 'FLASH_SALE_PRODUCT' }));
                  handleTargetChange(utilities[0]?.id || '', 'FLASH_SALE_PRODUCT');
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  formData.type === 'FLASH_SALE_PRODUCT'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-200 shadow-md'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <ShoppingBag className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Flash Sale Sản Phẩm</div>
                  <div className="text-[11px] opacity-75">Giảm giá Cửa hàng & Tiện ích</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: 'GLOBAL_ANNOUNCEMENT' }))}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  formData.type === 'GLOBAL_ANNOUNCEMENT'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-md'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Megaphone className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-white">Thông Báo Toàn Web</div>
                  <div className="text-[11px] opacity-75">Ra mắt game / Đua Top</div>
                </div>
              </button>
            </div>
          </div>

          {/* Target Selection */}
          {formData.type === 'GIVEAWAY' && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Chọn Chiến Dịch Giveaway Áp Dụng
              </label>
              <select
                value={formData.target_id}
                onChange={(e) => handleTargetChange(e.target.value, 'GIVEAWAY')}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {giveaways.map((gw) => (
                  <option key={gw.id} value={gw.id}>
                    [{gw.game_name}] {gw.title} (Còn {gw.remaining_codes ?? (gw.total_codes - gw.claimed_codes)} mã)
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.type === 'FLASH_SALE_PRODUCT' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Chọn Sản Phẩm / Tiện Ích Giảm Giá
                </label>
                <select
                  value={formData.target_id}
                  onChange={(e) => handleTargetChange(e.target.value, 'FLASH_SALE_PRODUCT')}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {utilities.map((ut) => (
                    <option key={ut.id} value={ut.id}>
                      {ut.title} — Giá gốc: {formatCurrencyVND(ut.original_price || ut.current_price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div>
                  <label className="block text-[11px] text-neutral-400 font-semibold mb-1">
                    Giá Gốc Niêm Yết
                  </label>
                  <input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, original_price: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-emerald-400 font-semibold mb-1">
                    Giá Bán Flash Sale (đ)
                  </label>
                  <input
                    type="number"
                    value={formData.sale_price}
                    onChange={(e) => {
                      const sp = Number(e.target.value);
                      const orig = formData.original_price;
                      const disc = orig > 0 ? Math.round(((orig - sp) / orig) * 100) : 0;
                      setFormData((prev) => ({ ...prev, sale_price: sp, discount_percent: disc }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-emerald-500/50 text-xs font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-red-400 font-semibold mb-1">
                    % Giảm Giá
                  </label>
                  <input
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => {
                      const disc = Number(e.target.value);
                      const orig = formData.original_price;
                      const sp = orig > 0 ? Math.round(orig * (1 - disc / 100)) : 0;
                      setFormData((prev) => ({ ...prev, discount_percent: disc, sale_price: sp }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-red-400 font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Tiêu Đề Sự Kiện *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ví dụ: Đợt Săn Code VIP 3Q Đào Đào Đào"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Phụ Đề / Mô Tả Ngắn
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Ví dụ: Số lượng có hạn chỉ 50 suất"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Date Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Thời Điểm Mở (Giờ G) *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.start_time}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Thời Điểm Đóng Sự Kiện *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.end_time}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Bắt Đầu Hiện Đếm Ngược
              </label>
              <select
                value={formData.countdown_lead_hours}
                onChange={(e) => setFormData((prev) => ({ ...prev, countdown_lead_hours: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value={24}>Trước 1 ngày (24 giờ)</option>
                <option value={48}>Trước 2 ngày (48 giờ)</option>
                <option value={72}>Trước 3 ngày (72 giờ - Khuyên dùng)</option>
                <option value={168}>Trước 1 tuần (7 ngày)</option>
                <option value={0}>Luôn hiện ngay bây giờ</option>
              </select>
            </div>
          </div>

          {/* Display Placements */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Vị Trí Hiển Thị Trên Web
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={formData.show_top_banner}
                  onChange={(e) => setFormData((prev) => ({ ...prev, show_top_banner: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-0 bg-neutral-900 border-neutral-700"
                />
                <span className="text-xs text-neutral-300">Banner đầu trang</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={formData.show_in_giveaways}
                  onChange={(e) => setFormData((prev) => ({ ...prev, show_in_giveaways: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-0 bg-neutral-900 border-neutral-700"
                />
                <span className="text-xs text-neutral-300">Mục Săn Code</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={formData.show_in_store}
                  onChange={(e) => setFormData((prev) => ({ ...prev, show_in_store: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-0 bg-neutral-900 border-neutral-700"
                />
                <span className="text-xs text-neutral-300">Cửa hàng / Tiện ích</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={formData.show_in_game_detail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, show_in_game_detail: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-0 bg-neutral-900 border-neutral-700"
                />
                <span className="text-xs text-neutral-300">Trang chi tiết game</span>
              </label>
            </div>
          </div>

          {/* Theme & Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Tone Màu (Theme)
              </label>
              <select
                value={formData.theme}
                onChange={(e: any) => setFormData((prev) => ({ ...prev, theme: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="fire">🔥 Lửa Đỏ Cam (Flash Sale Rực Lửa)</option>
                <option value="cyber">⚡ Cyber Neon (Tím Cyan Công Nghệ)</option>
                <option value="gold">👑 Vàng Hoàng Kim (Sự Kiện VIP)</option>
                <option value="emerald">💎 Ngọc Lục Bảo (Xanh Mint)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Nhãn Huy Hiệu (Badge)
              </label>
              <input
                type="text"
                value={formData.badge_label}
                onChange={(e) => setFormData((prev) => ({ ...prev, badge_label: e.target.value }))}
                placeholder="SẮP DIỄN RA"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Chữ Nút Bấm (CTA)
              </label>
              <input
                type="text"
                value={formData.cta_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, cta_text: e.target.value }))}
                placeholder="Săn Mã Ngay"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>Xem Trước Đồng Hồ Đếm Ngược</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <EventCountdownBadge
                targetDate={formData.start_time || new Date().toISOString()}
                label={formData.badge_label || 'Mở sau:'}
                theme={formData.theme}
                variant="detailed"
              />
              <EventCountdownBadge
                targetDate={formData.start_time || new Date().toISOString()}
                label="Mini:"
                theme={formData.theme}
                variant="compact"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{editingItem ? 'Lưu Thay Đổi' : 'Tạo Lịch Sự Kiện'}</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa Lịch Sự Kiện"
        message={`Bạn có chắc chắn muốn xóa lịch sự kiện "${deletingItem?.title}"? Thao tác này sẽ gỡ bỏ đồng hồ đếm ngược trên website.`}
        confirmText="Xóa Sự Kiện"
        confirmVariant="danger"
      />
    </div>
  );
};
