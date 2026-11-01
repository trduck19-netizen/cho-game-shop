import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Gift,
  Wallet,
  Bot,
  Key,
  FileText,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  Copy,
  Zap,
  Shield,
  Layers,
  HelpCircle,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';
import type {
  Mission,
  MissionSubmission,
  MissionAiApiKey,
  MissionAuditLog,
  MissionRewardCode,
} from '../../types/mission';
import { missionService } from '../../services/missionService';

export const MissionsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'missions' | 'submissions' | 'pools' | 'ai_keys'>('missions');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Missions State ---
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Partial<Mission> | null>(null);

  // --- Missions Selection & Batch State ---
  const [selectedMissionIds, setSelectedMissionIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [togglingMissionId, setTogglingMissionId] = useState<string | null>(null);
  const [missionSearch, setMissionSearch] = useState<string>('');
  const [missionFilterStatus, setMissionFilterStatus] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');

  // --- Submissions State ---
  const [submissions, setSubmissions] = useState<MissionSubmission[]>([]);
  const [filterMissionId, setFilterMissionId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // --- Reward Pools State ---
  const [selectedPoolMissionId, setSelectedPoolMissionId] = useState<string>('');
  const [poolCodes, setPoolCodes] = useState<MissionRewardCode[]>([]);
  const [poolStats, setPoolStats] = useState<{ total: number; available: number; claimed: number } | null>(null);
  const [rawCodesInput, setRawCodesInput] = useState<string>('');

  // --- AI Keys & Logs State ---
  const [aiKeys, setAiKeys] = useState<MissionAiApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyScope, setNewKeyScope] = useState<'FULL' | 'REVIEW_ONLY'>('FULL');
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<MissionAuditLog[]>([]);
  const [isCopiedKey, setIsCopiedKey] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Missions
  const loadMissions = async () => {
    setIsLoading(true);
    try {
      const res = await missionService.getMissions(true);
      if (res.success) {
        setMissions(res.missions);
        if (!selectedPoolMissionId && res.missions.length > 0) {
          const codeMission = res.missions.find((m) => m.reward_type === 'CODE');
          if (codeMission) setSelectedPoolMissionId(codeMission.id);
        }
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi tải danh sách nhiệm vụ.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Submissions
  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await missionService.getAdminSubmissions(filterMissionId, filterStatus);
      if (res.success) {
        setSubmissions(res.submissions);
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi tải hàng chờ duyệt.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fetch Pool Codes
  const loadPoolCodes = async (missionId: string) => {
    if (!missionId) return;
    setIsLoading(true);
    try {
      const res = await missionService.getRewardPool(missionId);
      if (res.success) {
        setPoolCodes(res.codes);
        setPoolStats(res.stats);
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi tải kho mã.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Fetch AI Keys & Audit Logs
  const loadAiKeysAndLogs = async () => {
    setIsLoading(true);
    try {
      const [keysRes, logsRes] = await Promise.all([
        missionService.getAiKeys(),
        missionService.getAuditLogs(),
      ]);
      if (keysRes.success) setAiKeys(keysRes.keys);
      if (logsRes.success) setAuditLogs(logsRes.logs);
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi tải khóa AI và nhật ký.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'missions') loadMissions();
    else if (activeTab === 'submissions') loadSubmissions();
    else if (activeTab === 'pools') {
      if (missions.length === 0) loadMissions();
      else if (selectedPoolMissionId) loadPoolCodes(selectedPoolMissionId);
    } else if (activeTab === 'ai_keys') loadAiKeysAndLogs();
  }, [activeTab, filterMissionId, filterStatus]);

  useEffect(() => {
    if (activeTab === 'pools' && selectedPoolMissionId) {
      loadPoolCodes(selectedPoolMissionId);
    }
  }, [selectedPoolMissionId]);

  // --- Handlers: Missions CRUD ---
  const handleOpenCreateMission = () => {
    setEditingMission({
      title: '',
      description: '',
      task_type: 'POST_SHARE_GROUP_PAGE',
      target_channel_name: '',
      target_channel_url: '',
      guide_steps: [
        'Truy cập vào nhóm/trang theo liên kết được cung cấp.',
        'Đăng một bài viết giới thiệu sàn CodeGame.Shop kèm nội dung yêu cầu.',
        'Lấy đường link bài đăng đã công khai và dán vào ô bằng chứng bên dưới.',
      ],
      content_requirements: 'Bài viết có ít nhất 15 từ, kèm hashtag #codegameshop #choigame và ảnh minh họa sàn.',
      reward_type: 'CODE',
      reward_value: 0,
      quota: 50,
      min_account_age_days: 0,
      max_resubmissions: 2,
      resubmission_cooldown_seconds: 60,
      review_mode: 'AI_AUTO',
      ai_prompt_guidelines: 'Kiểm tra xem link có công khai không, nội dung có hashtag #codegameshop và ảnh game hay không.',
      allowed_domains: 'facebook.com,fb.com,fb.watch',
      recurrence_type: 'ONCE',
      start_time: '',
      end_time: '',
      status: 'ACTIVE',
      sort_order: 0,
    });
    setIsMissionModalOpen(true);
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMission || !editingMission.title?.trim()) {
      showNotification('error', 'Vui lòng nhập tiêu đề nhiệm vụ.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingMission.id) {
        const res = await missionService.updateMission(editingMission.id, editingMission);
        if (res.success) {
          showNotification('success', 'Cập nhật nhiệm vụ thành công!');
          setIsMissionModalOpen(false);
          loadMissions();
        } else {
          showNotification('error', res.message || 'Lỗi cập nhật.');
        }
      } else {
        const res = await missionService.createMission(editingMission);
        if (res.success) {
          showNotification('success', 'Tạo nhiệm vụ mới thành công!');
          setIsMissionModalOpen(false);
          loadMissions();
        } else {
          showNotification('error', res.message || 'Lỗi tạo nhiệm vụ.');
        }
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi lưu nhiệm vụ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMission = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này? (Chỉ xóa thường được khi chưa có bài nộp)')) return;
    setIsLoading(true);
    try {
      const res = await missionService.deleteMission(id, false);
      if (res.success) {
        showNotification('success', 'Xóa nhiệm vụ thành công!');
        loadMissions();
      } else {
        if (res.message && res.message.includes('hồ sơ nộp bài')) {
          if (
            window.confirm(
              `${res.message}\n\nBạn có muốn XÓA TOÀN DIỆN (?force=true) không?\n(Lưu ý: Toàn bộ Nhật ký kiểm tra Audit Logs sẽ được bảo lưu bất biến để đối soát!).`
            )
          ) {
            const forceRes = await missionService.deleteMission(id, true);
            if (forceRes.success) {
              showNotification('success', 'Xóa toàn diện thành công! Nhật ký kiểm toán được bảo tồn.');
              loadMissions();
            } else {
              showNotification('error', forceRes.message || 'Lỗi khi xóa toàn diện.');
            }
          }
        } else {
          showNotification('error', res.message || 'Không thể xóa.');
        }
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi khi xóa.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers: Toggle Status (Mở / Đóng - Hiện / Ẩn trên web) ---
  const handleToggleMissionStatus = async (m: Mission) => {
    const isCurrentlyActive = m.status === 'ACTIVE';
    const newStatus = isCurrentlyActive ? 'CLOSED' : 'ACTIVE';
    const actionLabel = newStatus === 'ACTIVE' ? 'Mở (Hiện trên web)' : 'Đóng (Ẩn trên web)';

    setTogglingMissionId(m.id);

    // Optimistic UI update
    setMissions((prev) =>
      prev.map((item) => (item.id === m.id ? { ...item, status: newStatus } : item))
    );

    try {
      const res = await missionService.updateMission(m.id, { ...m, status: newStatus });
      if (res.success) {
        showNotification('success', `Đã ${actionLabel} nhiệm vụ thành công!`);
      } else {
        // Revert on failure
        setMissions((prev) =>
          prev.map((item) => (item.id === m.id ? { ...item, status: m.status } : item))
        );
        showNotification('error', res.message || 'Lỗi khi cập nhật trạng thái.');
      }
    } catch (err: any) {
      setMissions((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, status: m.status } : item))
      );
      showNotification('error', err?.message || 'Lỗi khi cập nhật trạng thái.');
    } finally {
      setTogglingMissionId(null);
    }
  };

  // --- Handlers: Multi-select & Batch Actions ---
  const filteredMissions = missions.filter((m) => {
    if (missionFilterStatus === 'ACTIVE' && m.status !== 'ACTIVE') return false;
    if (missionFilterStatus === 'CLOSED' && m.status === 'ACTIVE') return false;
    if (missionSearch.trim()) {
      const q = missionSearch.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.target_channel_name && m.target_channel_name.toLowerCase().includes(q)) ||
        m.task_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isAllMissionsSelected =
    filteredMissions.length > 0 &&
    filteredMissions.every((m) => selectedMissionIds.includes(m.id));
  const isSomeMissionsSelected =
    filteredMissions.some((m) => selectedMissionIds.includes(m.id)) && !isAllMissionsSelected;

  const handleToggleSelectAllMissions = () => {
    if (isAllMissionsSelected) {
      setSelectedMissionIds((prev) => prev.filter((id) => !filteredMissions.some((m) => m.id === id)));
    } else {
      const newIds = new Set([...selectedMissionIds, ...filteredMissions.map((m) => m.id)]);
      setSelectedMissionIds(Array.from(newIds));
    }
  };

  const handleToggleSelectMission = (id: string) => {
    setSelectedMissionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchUpdateStatus = async (status: 'ACTIVE' | 'CLOSED') => {
    if (selectedMissionIds.length === 0) return;
    const actionLabel = status === 'ACTIVE' ? 'Mở (Hiện trên web)' : 'Đóng (Ẩn trên web)';
    setIsBatchProcessing(true);

    // Optimistic UI update
    setMissions((prev) =>
      prev.map((m) => (selectedMissionIds.includes(m.id) ? { ...m, status } : m))
    );

    try {
      const res = await missionService.batchUpdateStatus(selectedMissionIds, status);
      if (res.success) {
        showNotification('success', res.message || `Đã ${actionLabel} ${selectedMissionIds.length} nhiệm vụ thành công!`);
        setSelectedMissionIds([]);
        loadMissions();
      } else {
        showNotification('error', res.message || 'Lỗi khi cập nhật hàng loạt.');
        loadMissions();
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi khi cập nhật hàng loạt.');
      loadMissions();
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDeleteMissions = async () => {
    if (selectedMissionIds.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn XÓA ${selectedMissionIds.length} nhiệm vụ đã chọn không?\n(Những nhiệm vụ chưa có bài nộp sẽ được chuyển vào thùng rác/tombstone).`
      )
    ) {
      return;
    }

    setIsBatchProcessing(true);
    try {
      const res = await missionService.batchDelete(selectedMissionIds, false);
      if (res.success) {
        showNotification('success', res.message || `Đã xóa ${selectedMissionIds.length} nhiệm vụ.`);
        setSelectedMissionIds([]);
        loadMissions();
      } else {
        if (res.message && res.message.includes('force=true')) {
          if (
            window.confirm(
              `${res.message}\n\nBạn có muốn XÓA TOÀN DIỆN (?force=true) cho tất cả nhiệm vụ đã chọn không?\n(Toàn bộ hồ sơ nộp sẽ bị xóa, nhật ký kiểm tra Audit Log được bảo lưu bất biến).`
            )
          ) {
            const forceRes = await missionService.batchDelete(selectedMissionIds, true);
            if (forceRes.success) {
              showNotification('success', forceRes.message || 'Đã xóa toàn diện thành công.');
              setSelectedMissionIds([]);
              loadMissions();
            } else {
              showNotification('error', forceRes.message || 'Lỗi khi xóa toàn diện.');
            }
          }
        } else {
          showNotification('error', res.message || 'Lỗi khi xóa hàng loạt.');
        }
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi mạng khi xóa hàng loạt.');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // --- Handlers: Submissions Review ---
  const handleApprove = async (subId: string) => {
    setIsLoading(true);
    try {
      const res = await missionService.reviewSubmission(subId, 'APPROVE');
      if (res.success) {
        showNotification('success', `Duyệt thành công! Đã trao thưởng: ${res.rewardDelivered || ''}`);
        loadSubmissions();
        loadMissions();
      } else {
        showNotification('error', res.message || 'Lỗi duyệt hồ sơ.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingSubId) return;
    setIsLoading(true);
    try {
      const res = await missionService.reviewSubmission(rejectingSubId, 'REJECT', rejectionReason);
      if (res.success) {
        showNotification('success', 'Đã từ chối bài nộp.');
        setRejectingSubId(null);
        setRejectionReason('');
        loadSubmissions();
        loadMissions();
      } else {
        showNotification('error', res.message || 'Lỗi khi từ chối.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn duyệt nhanh TẤT CẢ các hồ sơ đang chờ trong danh sách và trao thưởng ngay lập tức?')) return;
    setIsLoading(true);
    try {
      const res = await missionService.batchApprove(undefined, filterMissionId);
      if (res.success) {
        showNotification('success', res.message || `Đã duyệt ${res.successCount} hồ sơ.`);
        loadSubmissions();
        loadMissions();
      } else {
        showNotification('error', res.message || 'Lỗi khi duyệt hàng loạt.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers: Reward Pool ---
  const handleImportCodes = async () => {
    if (!selectedPoolMissionId) {
      showNotification('error', 'Vui lòng chọn nhiệm vụ.');
      return;
    }
    if (!rawCodesInput.trim()) {
      showNotification('error', 'Vui lòng dán danh sách mã code.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await missionService.importRewardCodes(selectedPoolMissionId, rawCodesInput.trim());
      if (res.success) {
        showNotification('success', `Đã nạp thành công ${res.count} mã vào kho!`);
        setRawCodesInput('');
        loadPoolCodes(selectedPoolMissionId);
      } else {
        showNotification('error', res.message || 'Lỗi nạp mã.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers: AI Keys ---
  const handleCreateAiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showNotification('error', 'Vui lòng nhập tên cho khóa API.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await missionService.createAiKey(newKeyName.trim(), newKeyScope);
      if (res.success && res.rawKey) {
        setGeneratedRawKey(res.rawKey);
        setNewKeyName('');
        showNotification('success', 'Đã tạo khóa API thành công! Hãy lưu lại khóa ngay.');
        loadAiKeysAndLogs();
      } else {
        showNotification('error', res.message || 'Lỗi tạo khóa API.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAiKey = async (id: string, currentStatus: number) => {
    setIsLoading(true);
    try {
      const res = await missionService.toggleAiKey(id, currentStatus === 0);
      if (res.success) {
        showNotification('success', 'Đã thay đổi trạng thái khóa API.');
        loadAiKeysAndLogs();
      } else {
        showNotification('error', res.message || 'Lỗi cập nhật.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAiKey = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa khóa API này?')) return;
    setIsLoading(true);
    try {
      const res = await missionService.deleteAiKey(id);
      if (res.success) {
        showNotification('success', 'Đã xóa khóa API.');
        loadAiKeysAndLogs();
      } else {
        showNotification('error', res.message || 'Lỗi xóa khóa.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Lỗi mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-500/90 text-white backdrop-blur border border-emerald-400/40'
              : 'bg-rose-500/90 text-white backdrop-blur border border-rose-400/40'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/20 text-primary-light">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-lg sm:text-xl font-bold font-display text-foreground">
              Quản Lý Nhiệm Vụ & Duyệt Bài (Missions)
            </h1>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Thiết lập nhiệm vụ, đóng/mở (ẩn/hiện trên web), duyệt bài tự động/thủ công và quản lý kho mã thưởng.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'missions' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Nhiệm Vụ ({missions.length})
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'submissions' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Hàng Chờ Duyệt
          </button>

          <button
            onClick={() => setActiveTab('pools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pools' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Kho Mã Thưởng
          </button>

          <button
            onClick={() => setActiveTab('ai_keys')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ai_keys' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Khóa AI & Nhật Ký
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DANH SÁCH NHIỆM VỤ (CRUD & BATCH ACTIONS)         */}
      {/* ========================================================= */}
      {activeTab === 'missions' && (
        <div className="space-y-3">
          {/* Top Control Bar: Filters, Search, Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Tổng cộng: <strong className="text-foreground">{missions.length}</strong>
              </span>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60 text-[11px]">
                <button
                  onClick={() => setMissionFilterStatus('ALL')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    missionFilterStatus === 'ALL' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tất cả ({missions.length})
                </button>
                <button
                  onClick={() => setMissionFilterStatus('ACTIVE')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    missionFilterStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Đang Mở ({missions.filter((m) => m.status === 'ACTIVE').length})
                </button>
                <button
                  onClick={() => setMissionFilterStatus('CLOSED')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    missionFilterStatus === 'CLOSED' ? 'bg-slate-700/50 text-slate-300 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Đã Đóng ({missions.filter((m) => m.status !== 'ACTIVE').length})
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm nhiệm vụ..."
                  value={missionSearch}
                  onChange={(e) => setMissionSearch(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs bg-muted/40 border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadMissions}
                disabled={isLoading}
                className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Tải lại danh sách"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleOpenCreateMission}
                className="cg-btn cg-btn--primary flex items-center gap-1.5 text-xs font-bold px-3 py-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Nhiệm Vụ Mới</span>
              </button>
            </div>
          </div>

          {/* Batch Actions Bar (Shown when 1 or more items selected) */}
          {selectedMissionIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3.5 bg-primary/10 border border-primary/30 rounded-xl animate-fade-in text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>
                  Đã chọn: <strong className="text-primary font-bold">{selectedMissionIds.length}</strong> / {filteredMissions.length} nhiệm vụ
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleBatchUpdateStatus('ACTIVE')}
                  disabled={isBatchProcessing}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Mở tất cả nhiệm vụ đã chọn (hiển thị trên web khách)"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Mở (Hiện web)</span>
                </button>
                <button
                  onClick={() => handleBatchUpdateStatus('CLOSED')}
                  disabled={isBatchProcessing}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold flex items-center gap-1 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Đóng tất cả nhiệm vụ đã chọn (ẩn khỏi web khách)"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Đóng (Ẩn web)</span>
                </button>
                <button
                  onClick={handleBatchDeleteMissions}
                  disabled={isBatchProcessing}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Xóa tất cả nhiệm vụ đã chọn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ({selectedMissionIds.length})</span>
                </button>
                <button
                  onClick={() => setSelectedMissionIds([])}
                  disabled={isBatchProcessing}
                  className="px-2 py-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {/* Single-Viewport Compact Missions Table */}
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold">
                  <tr>
                    <th className="w-10 text-center py-2.5 px-2">
                      <input
                        type="checkbox"
                        checked={isAllMissionsSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isSomeMissionsSelected;
                        }}
                        onChange={handleToggleSelectAllMissions}
                        className="w-4 h-4 rounded border-border/80 text-primary focus:ring-primary/40 cursor-pointer accent-primary"
                        title="Chọn tất cả"
                      />
                    </th>
                    <th className="w-[36%] py-2.5 px-3">Nhiệm Vụ & Kênh Đích</th>
                    <th className="w-[14%] py-2.5 px-3">Phần Thưởng</th>
                    <th className="w-[22%] py-2.5 px-3">Tiến Độ & Quota</th>
                    <th className="w-[18%] py-2.5 px-3 text-center">Đóng / Mở (Web)</th>
                    <th className="w-[10%] py-2.5 pr-3 pl-1 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {missions.length === 0
                          ? 'Chưa có nhiệm vụ nào. Nhấn "Tạo Nhiệm Vụ Mới" để bắt đầu!'
                          : 'Không tìm thấy nhiệm vụ phù hợp với bộ lọc.'}
                      </td>
                    </tr>
                  ) : (
                    filteredMissions.map((m) => {
                      const stats = m.stats;
                      const viewsCount = stats?.views ?? m.views ?? 0;
                      const participantsCount = stats?.participants_count ?? m.participants_count ?? 0;
                      const totalSubmissions = stats?.submissions_count ?? stats?.total_submissions ?? 0;
                      const approvedSubmissions = stats?.approved_count ?? stats?.approved_submissions ?? 0;
                      const rejectedSubmissions = stats?.rejected_count ?? stats?.rejected_submissions ?? 0;
                      const rewardsDelivered = m.completed_count || 0;
                      const remainingQuota = stats?.quota_remaining ?? Math.max(0, (m.quota || 0) - rewardsDelivered);
                      const isSelected = selectedMissionIds.includes(m.id);
                      const isToggling = togglingMissionId === m.id;

                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-muted/20 transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          {/* 1. Checkbox */}
                          <td className="w-10 text-center py-2.5 px-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectMission(m.id)}
                              className="w-4 h-4 rounded border-border/80 text-primary focus:ring-primary/40 cursor-pointer accent-primary"
                            />
                          </td>

                          {/* 2. Nhiệm Vụ & Kênh Đích */}
                          <td className="w-[36%] py-2.5 px-3 overflow-hidden">
                            <div className="space-y-1">
                              <span
                                className="font-bold text-foreground text-xs sm:text-sm block truncate"
                                title={m.title}
                              >
                                {m.title}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-muted/80 text-[9px] uppercase font-mono tracking-tight text-slate-300">
                                  {m.task_type}
                                </span>
                                {m.target_channel_url && (
                                  <a
                                    href={m.target_channel_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-1 max-w-[160px] truncate font-medium"
                                    title={m.target_channel_url}
                                  >
                                    <span className="truncate">{m.target_channel_name || 'Kênh đích'}</span>
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                  </a>
                                )}
                                <span className="text-slate-400 font-medium">
                                  {m.review_mode === 'AI_AUTO'
                                    ? '⚡ AI Tự Duyệt'
                                    : m.review_mode === 'AI_ASSISTED'
                                    ? '🤖 AI Hỗ Trợ'
                                    : '👤 Duyệt Tay'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Phần Thưởng */}
                          <td className="w-[14%] py-2.5 px-3 whitespace-nowrap overflow-hidden">
                            {m.reward_type === 'CODE' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold text-[10px]">
                                  <Gift className="w-3 h-3 shrink-0" />
                                  Mã Code
                                </span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                                  Kho: <strong className="text-amber-300 font-bold">{m.available_codes_count ?? stats?.available_codes ?? 0}</strong> mã
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold text-[10px]">
                                  <Wallet className="w-3 h-3 shrink-0" />
                                  +{(Number(m.reward_value) || 0).toLocaleString('vi-VN')}đ
                                </span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">Số dư ví</span>
                              </div>
                            )}
                          </td>

                          {/* 4. Tiến Độ & Quota */}
                          <td className="w-[22%] py-2.5 px-3 overflow-hidden">
                            <div className="space-y-1 text-[11px]">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-medium flex-wrap">
                                <span className="inline-flex items-center gap-0.5" title="Lượt xem">
                                  <Eye className="w-3 h-3 text-cyan-400" />
                                  <strong>{viewsCount}</strong>
                                </span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5" title="Người tham gia">
                                  <Users className="w-3 h-3 text-indigo-400" />
                                  <strong>{participantsCount}</strong>
                                </span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5" title="Hồ sơ đã nộp">
                                  <FileText className="w-3 h-3 text-amber-400" />
                                  <strong>{totalSubmissions}</strong>
                                </span>
                                <span>•</span>
                                <span className="text-emerald-400 font-semibold" title="Đã duyệt">✓{approvedSubmissions}</span>
                                <span className="text-rose-400 font-semibold" title="Từ chối">✕{rejectedSubmissions}</span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-muted-foreground">Quota: {rewardsDelivered}/{m.quota}</span>
                                <span className="text-primary font-bold">Còn: {remainingQuota}</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, Math.round((rewardsDelivered / (m.quota || 1)) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 5. Trạng Thái: Đóng / Mở (Hiển thị web) Toggle */}
                          <td className="w-[18%] py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center justify-center">
                              <button
                                onClick={() => handleToggleMissionStatus(m)}
                                disabled={isToggling}
                                className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 ${
                                  m.status === 'ACTIVE'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                }`}
                                title={
                                  m.status === 'ACTIVE'
                                    ? 'Nhiệm vụ đang HIỆN trên web khách. Bấm để ĐÓNG (ẨN khỏi web khách)'
                                    : 'Nhiệm vụ đang ẨN khỏi web khách. Bấm để MỞ (HIỆN trên web khách)'
                                }
                              >
                                {isToggling ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : m.status === 'ACTIVE' ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Đang Mở</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>Đã Đóng</span>
                                  </>
                                )}
                              </button>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                {m.status === 'ACTIVE' ? 'Hiện trên web' : 'Ẩn khỏi web'}
                              </span>
                            </div>
                          </td>

                          {/* 6. Thao Tác */}
                          <td className="w-[10%] py-2.5 pr-3 pl-1 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingMission(m);
                                  setIsMissionModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Sửa nhiệm vụ"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMission(m.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                                title="Xóa nhiệm vụ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HÀNG CHỜ DUYỆT (SUBMISSIONS QUEUE)                 */}
      {/* ========================================================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterMissionId}
                onChange={(e) => setFilterMissionId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs text-foreground focus:outline-none"
              >
                <option value="all">Tất cả nhiệm vụ</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs text-foreground focus:outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="PENDING">Đang chờ duyệt</option>
                <option value="NEEDS_HUMAN">Cần người kiểm tra</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>

              <button
                onClick={loadSubmissions}
                className="p-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Làm mới"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleBatchApprove}
              className="cg-btn cg-btn--small bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Duyệt hàng loạt hồ sơ đang chờ (Admin)</span>
            </button>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5">Người nộp / Thời gian</th>
                  <th className="p-3.5">Nhiệm vụ</th>
                  <th className="p-3.5">Link bài đăng & Ghi chú</th>
                  <th className="p-3.5">Đề xuất của AI</th>
                  <th className="p-3.5">Trạng thái / Phần thưởng</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Không có hồ sơ nào trong hàng chờ.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <strong className="text-foreground block">{sub.user_name || 'Thành viên'}</strong>
                        <span className="text-[11px] text-muted-foreground block">{sub.user_email}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(sub.created_at).toLocaleString('vi-VN')}
                        </span>
                      </td>

                      <td className="p-3.5 min-w-[150px]">
                        <span className="font-semibold text-foreground block line-clamp-1">
                          {sub.mission_title || sub.mission_id}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Nộp lại: {sub.resubmission_count} lần
                        </span>
                      </td>

                      <td className="p-3.5 min-w-[200px]">
                        <a
                          href={sub.proof_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono break-all inline-flex items-center gap-1"
                        >
                          <span className="line-clamp-1">{sub.proof_link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        {sub.proof_note && (
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Ghi chú: {sub.proof_note}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 min-w-[160px]">
                        {sub.ai_recommendation ? (
                          <div className="space-y-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                sub.ai_recommendation === 'APPROVE'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : sub.ai_recommendation === 'REJECT'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {sub.ai_recommendation === 'APPROVE'
                                ? '✓ AI: Nên Duyệt'
                                : sub.ai_recommendation === 'REJECT'
                                ? '✗ AI: Nên Từ Chối'
                                : '⚠ AI: Cần Người Xem'}
                            </span>
                            {sub.ai_reason && (
                              <p className="text-[11px] text-slate-300 line-clamp-2 leading-tight">
                                {sub.ai_reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Chưa quét</span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold block w-fit ${
                            sub.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : sub.status === 'REJECTED'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {sub.status === 'APPROVED'
                            ? 'Đã Duyệt'
                            : sub.status === 'REJECTED'
                            ? 'Bị Từ Chối'
                            : 'Chờ Duyệt'}
                        </span>
                        {sub.reward_delivered && (
                          <span className="text-[11px] text-emerald-400 font-mono font-bold block mt-1">
                            {sub.reward_delivered}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                        {sub.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleApprove(sub.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs transition-colors"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => {
                                setRejectingSubId(sub.id);
                                setRejectionReason('Link bài đăng không đạt yêu cầu theo quy định của nhiệm vụ.');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs transition-colors"
                            >
                              Từ chối
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {sub.reviewed_by ? `Bởi ${sub.reviewed_by}` : 'Đã xử lý'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: KHO MÃ THƯỞNG (CODE POOLS)                         */}
      {/* ========================================================= */}
      {activeTab === 'pools' && (
        <div className="space-y-6">
          {/* Select Mission */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Chọn Nhiệm Vụ Cần Quản Lý Kho Mã:</label>
              <select
                value={selectedPoolMissionId}
                onChange={(e) => setSelectedPoolMissionId(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 rounded-xl bg-muted/60 border border-border/80 text-xs text-foreground focus:outline-none"
              >
                {missions
                  .filter((m) => m.reward_type === 'CODE')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
              </select>
            </div>

            {poolStats && (
              <div className="flex items-center gap-3">
                <div className="text-center px-4 py-2 rounded-xl bg-muted/40 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block">Tổng mã</span>
                  <strong className="text-sm font-mono text-foreground">{poolStats.total}</strong>
                </div>
                <div className="text-center px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 block">Khả dụng</span>
                  <strong className="text-sm font-mono text-emerald-400">{poolStats.available}</strong>
                </div>
                <div className="text-center px-4 py-2 rounded-xl bg-muted/40 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block">Đã trao</span>
                  <strong className="text-sm font-mono text-foreground">{poolStats.claimed}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Import Codes Form */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Nạp Mã Mới Vào Kho (Mỗi dòng 1 mã)
            </h3>
            <textarea
              rows={4}
              placeholder="CODE-AAA-111&#10;CODE-BBB-222&#10;CODE-CCC-333"
              value={rawCodesInput}
              onChange={(e) => setRawCodesInput(e.target.value)}
              className="w-full p-3 rounded-xl bg-muted/40 border border-border/80 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={handleImportCodes}
              disabled={isLoading || !rawCodesInput.trim()}
              className="cg-btn cg-btn--primary text-xs font-bold"
            >
              Nạp Vào Kho
            </button>
          </div>

          {/* List of Codes in Pool */}
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5">Mã Code</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Người nhận / Thời gian trao</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {poolCodes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Kho chưa có mã nào. Hãy dán mã vào ô trên để nạp!
                    </td>
                  </tr>
                ) : (
                  poolCodes.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="p-3.5 font-mono font-bold text-foreground select-all">
                        {c.code_content}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'AVAILABLE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.status === 'AVAILABLE' ? 'Khả dụng' : 'Đã trao'}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {c.claimed_by_user_id ? (
                          <div>
                            <span className="text-foreground block">{c.claimed_by_user_id}</span>
                            <span className="text-[10px]">{c.claimed_at}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {c.status === 'AVAILABLE' && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Xóa mã này khỏi kho?')) {
                                await missionService.deleteRewardCode(c.id);
                                loadPoolCodes(selectedPoolMissionId);
                              }
                            }}
                            className="text-rose-400 hover:underline text-[11px]"
                          >
                            Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: KHÓA AI & NHẬT KÝ KIỂM TOÁN                        */}
      {/* ========================================================= */}
      {activeTab === 'ai_keys' && (
        <div className="space-y-6">
          {/* Generated Raw Key Popup Alert */}
          {generatedRawKey && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Key className="w-4 h-4" />
                <span>Khóa API AI đã được tạo thành công! (Chỉ hiển thị 1 lần duy nhất)</span>
              </div>
              <p className="text-xs text-amber-200/80">
                Hãy sao chép và lưu trữ mã khóa an toàn để tích hợp vào Pine AI hoặc bot bên ngoài. Hệ thống sẽ không hiển thị lại mã bí mật này.
              </p>
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="text"
                  readOnly
                  value={generatedRawKey}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-500/40 text-amber-200 font-mono text-xs select-all focus:outline-none"
                />
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedRawKey);
                    setIsCopiedKey(true);
                    setTimeout(() => setIsCopiedKey(false), 2000);
                  }}
                  className="cg-btn cg-btn--small bg-amber-500 text-neutral-950 font-bold shrink-0 flex items-center gap-1"
                >
                  {isCopiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedKey ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Create AI Key Card */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <span>Cấp Khóa API Quản Trị & Tự Động Hóa Nhiệm Vụ</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Khóa API có thể được cấp <b>Toàn Quyền Quản Lý (FULL)</b> để bot/AI bên ngoài tự động CRUD nhiệm vụ, nạp kho code, duyệt bài nộp, hoặc <b>Chỉ Thẩm Định (REVIEW_ONLY)</b>.
              </p>
            </div>
            <form onSubmit={handleCreateAiKey} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl">
              <input
                type="text"
                placeholder="Tên khóa (vd: Pine AI Manager, Script Auto-Reward...)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <select
                value={newKeyScope}
                onChange={(e) => setNewKeyScope(e.target.value as 'FULL' | 'REVIEW_ONLY')}
                className="px-3 py-2 rounded-xl bg-muted/60 border border-border/80 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="FULL">🚀 Toàn Quyền Quản Lý (FULL)</option>
                <option value="REVIEW_ONLY">🤖 Chỉ Thẩm Định (REVIEW_ONLY)</option>
              </select>
              <button
                type="submit"
                disabled={isLoading || !newKeyName.trim()}
                className="cg-btn cg-btn--primary text-xs font-bold shrink-0 cursor-pointer"
              >
                Tạo Khóa API
              </button>
            </form>
          </div>

          {/* AI Keys List */}
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5">Tên khóa</th>
                  <th className="p-3.5">Tiền tố nhận diện</th>
                  <th className="p-3.5">Phạm vi quyền</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Lần gọi gần nhất</th>
                  <th className="p-3.5">Ngày tạo</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {aiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Chưa có khóa API nào. Hãy tạo khóa mới để cấp quyền cho AI!
                    </td>
                  </tr>
                ) : (
                  aiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-muted/20">
                      <td className="p-3.5 font-bold text-foreground">{k.key_name}</td>
                      <td className="p-3.5 font-mono text-primary-light">{k.key_prefix}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            k.scope === 'REVIEW_ONLY'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {k.scope === 'REVIEW_ONLY' ? 'Chỉ Thẩm Định' : 'Toàn Quyền (FULL)'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleAiKey(k.id, k.is_active)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                            k.is_active === 1
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {k.is_active === 1 ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                        </button>
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString('vi-VN') : 'Chưa sử dụng'}
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {new Date(k.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteAiKey(k.id)}
                          className="text-rose-400 hover:underline text-[11px]"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* API Reference Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-3 text-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Tài Liệu Hướng Dẫn Tích Hợp API Toàn Quyền Cho Nhiệm Vụ</span>
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                Base URL: /api/missions
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mọi request từ bot / hệ thống bên ngoài chỉ cần đính kèm header <code className="bg-black/40 px-1.5 py-0.5 rounded text-purple-300 font-mono">X-Api-Key: &lt;API_KEY&gt;</code> hoặc <code className="bg-black/40 px-1.5 py-0.5 rounded text-purple-300 font-mono">Authorization: Bearer &lt;API_KEY&gt;</code>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-[11px] font-mono space-y-1">
                <span className="text-emerald-400 font-bold block">1. Lấy danh sách nhiệm vụ (Toàn bộ trạng thái):</span>
                <p className="text-slate-400">GET /api/missions?status=ALL</p>
                <span className="text-emerald-400 font-bold block pt-1">2. Tạo nhiệm vụ mới:</span>
                <p className="text-slate-400">POST /api/missions &#123; title, quota, reward_type... &#125;</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-[11px] font-mono space-y-1">
                <span className="text-purple-400 font-bold block">3. Lấy hồ sơ bài nộp & Duyệt thưởng:</span>
                <p className="text-slate-400">GET /api/missions/submissions?status=PENDING</p>
                <p className="text-slate-400">POST /api/missions/submissions &#123; action: "APPROVE", submission_id &#125;</p>
                <span className="text-purple-400 font-bold block pt-1">4. Nạp mã code vào kho:</span>
                <p className="text-slate-400">POST /api/missions/pools &#123; mission_id, codes: [...] &#125;</p>
              </div>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Nhật Ký Kiểm Toán (Audit Logs)
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold sticky top-0">
                  <tr>
                    <th className="p-3.5">Thời gian</th>
                    <th className="p-3.5">Nhiệm vụ</th>
                    <th className="p-3.5">Hành động</th>
                    <th className="p-3.5">Người thực hiện</th>
                    <th className="p-3.5">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Chưa có lịch sử kiểm toán nào.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="p-3.5 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-3.5 font-semibold text-foreground">{log.mission_title || log.mission_id}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-primary-light">{log.actor}</td>
                        <td className="p-3.5 text-muted-foreground">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TẠO / SỬA NHIỆM VỤ                                 */}
      {/* ========================================================= */}
      {isMissionModalOpen && editingMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/30">
              <h3 className="font-bold text-base text-foreground">
                {editingMission.id ? 'Chỉnh Sửa Nhiệm Vụ' : 'Tạo Nhiệm Vụ Mới'}
              </h3>
              <button
                onClick={() => setIsMissionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMission} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground mb-1">
                  Tiêu đề nhiệm vụ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đăng bài chia sẻ nhận Code VIP Tiên Nghịch Mobile"
                  value={editingMission.title || ''}
                  onChange={(e) => setEditingMission({ ...editingMission, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả tóm tắt nội dung nhiệm vụ cho người dùng..."
                  value={editingMission.description || ''}
                  onChange={(e) => setEditingMission({ ...editingMission, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Tên nhóm / Trang đích</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nhóm Tiên Nghịch Mobile VN"
                    value={editingMission.target_channel_name || ''}
                    onChange={(e) => setEditingMission({ ...editingMission, target_channel_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Link nhóm / Trang đích</label>
                  <input
                    type="url"
                    placeholder="https://facebook.com/groups/..."
                    value={editingMission.target_channel_url || ''}
                    onChange={(e) => setEditingMission({ ...editingMission, target_channel_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Reward Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Loại phần thưởng</label>
                  <select
                    value={editingMission.reward_type || 'CODE'}
                    onChange={(e) => setEditingMission({ ...editingMission, reward_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground focus:outline-none font-semibold"
                  >
                    <option value="CODE">Mã Giftcode (Kho mã riêng)</option>
                    <option value="WALLET_BALANCE">Cộng số dư Ví thành viên</option>
                  </select>
                </div>

                {editingMission.reward_type === 'WALLET_BALANCE' ? (
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Số tiền ví cộng thưởng (VNĐ)</label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={editingMission.reward_value || 10000}
                      onChange={(e) => setEditingMission({ ...editingMission, reward_value: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Cơ chế phát thưởng Giftcode</label>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      Kho mã quà tặng riêng là nguồn duy nhất phát thưởng cho thành viên khi duyệt bài. Không sử dụng giá trị tiền mặt.
                    </div>
                  </div>
                )}
              </div>

              {/* Lên lịch giờ bắt đầu & kết thúc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Giờ bắt đầu (Mở nhiệm vụ)</label>
                  <input
                    type="datetime-local"
                    value={editingMission.start_time ? editingMission.start_time.substring(0, 16) : ''}
                    onChange={(e) => setEditingMission({ ...editingMission, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground focus:outline-none text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground block pt-1">
                    Để trống để mở ngay lập tức (Mặc định). Chưa tới giờ: chưa mở với người dùng.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Giờ kết thúc (Đóng nhận bài)</label>
                  <input
                    type="datetime-local"
                    value={editingMission.end_time ? editingMission.end_time.substring(0, 16) : ''}
                    onChange={(e) => setEditingMission({ ...editingMission, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground focus:outline-none text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground block pt-1">
                    Để trống nếu không giới hạn. Quá giờ: tự đóng với người mới, hồ sơ đang chờ vẫn xử lý được.
                  </span>
                </div>
              </div>

              {/* Quota & Review Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Tổng Quota (Lượt thưởng)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingMission.quota || 10}
                    onChange={(e) => setEditingMission({ ...editingMission, quota: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Chế độ duyệt</label>
                  <select
                    value={editingMission.review_mode || 'AI_AUTO'}
                    onChange={(e) => setEditingMission({ ...editingMission, review_mode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none font-semibold"
                  >
                    <option value="AI_AUTO">AI Tự Duyệt & Phát Thưởng Ngay (Mặc định)</option>
                    <option value="AI_ASSISTED">AI Hỗ Trợ Đánh Giá</option>
                    <option value="MANUAL">Quản Trị Duyệt Thủ Công</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Trạng thái</label>
                  <select
                    value={editingMission.status || 'ACTIVE'}
                    onChange={(e) => setEditingMission({ ...editingMission, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none font-semibold"
                  >
                    <option value="ACTIVE">Đang Mở — Hiện trên web khách (ACTIVE)</option>
                    <option value="CLOSED">Đã Đóng — Ẩn khỏi web khách (CLOSED)</option>
                    <option value="PAUSED">Tạm Dừng — Ẩn khỏi web khách (PAUSED)</option>
                    <option value="ENDED">Đã Kết Thúc (ENDED)</option>
                    <option value="DRAFT">Bản Nháp (DRAFT)</option>
                  </select>
                </div>
              </div>

              {/* Content Requirements & AI Prompt Guidelines */}
              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Yêu cầu nội dung bài đăng</label>
                <textarea
                  rows={2}
                  placeholder="Hashtag, ảnh chụp màn hình, độ dài tối thiểu..."
                  value={editingMission.content_requirements || ''}
                  onChange={(e) => setEditingMission({ ...editingMission, content_requirements: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">
                  Gợi ý cho AI kiểm tra (AI prompt guidelines)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Link bài đăng phải có hashtag #codegameshop và ảnh chụp trang chủ..."
                  value={editingMission.ai_prompt_guidelines || ''}
                  onChange={(e) => setEditingMission({ ...editingMission, ai_prompt_guidelines: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground focus:outline-none"
                />
              </div>

              {/* Anti Cheat & Restrictions */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Miền link cho phép</label>
                  <input
                    type="text"
                    value={editingMission.allowed_domains || 'facebook.com,fb.com,fb.watch'}
                    onChange={(e) => setEditingMission({ ...editingMission, allowed_domains: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Số lần cho nộp lại</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={editingMission.max_resubmissions ?? 2}
                    onChange={(e) => setEditingMission({ ...editingMission, max_resubmissions: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Giãn cách nộp lại (giây)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingMission.resubmission_cooldown_seconds ?? 60}
                    onChange={(e) => setEditingMission({ ...editingMission, resubmission_cooldown_seconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Tuổi tài khoản (ngày)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingMission.min_account_age_days ?? 0}
                    onChange={(e) => setEditingMission({ ...editingMission, min_account_age_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMissionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="cg-btn cg-btn--primary font-bold"
                >
                  {editingMission.id ? 'Lưu Thay Đổi' : 'Tạo Nhiệm Vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TỪ CHỐI BÀI NỘP                                   */}
      {/* ========================================================= */}
      {rejectingSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Lý Do Từ Chối Hồ Sơ
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Vui lòng chọn hoặc nhập lý do từ chối rõ ràng để người dùng có thể điều chỉnh và nộp lại:
            </p>

            <div className="space-y-1.5">
              {[
                'Link bài đăng không tồn tại hoặc đặt ở chế độ riêng tư.',
                'Bài viết chưa có hashtag #codegameshop theo quy định.',
                'Bài viết không đăng vào đúng nhóm/fanpage được yêu cầu.',
                'Bài viết đã bị quản trị viên nhóm xóa hoặc ẩn.',
              ].map((quickReason, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRejectionReason(quickReason)}
                  className="w-full text-left p-2 rounded-lg bg-muted/40 hover:bg-muted text-[11px] text-foreground border border-border/60 transition-colors"
                >
                  {quickReason}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do chi tiết..."
              className="w-full p-3 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingSubId(null)}
                className="px-4 py-2 rounded-xl bg-muted text-foreground font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-sm"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
