import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Settings,
  Users,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Search,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Gift,
  Flame,
  Gamepad2,
  Sparkles,
  ExternalLink,
  Download,
} from 'lucide-react';
import { buildCyberpunkEmailHtml, EmailProviderConfig, DEFAULT_EMAIL_CONFIG } from '../../../functions/api/notifications/_emailHelper';
import { dataService } from '../../services/dataService';
import type { GameItem } from '../../types/game';

interface SubscriberItem {
  id: string;
  email: string;
  userId?: string | null;
  notifyFollowedCodes: boolean;
  notifyGiveaways: boolean;
  notifySales: boolean;
  subscribedGames: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailLogItem {
  id: string;
  type: 'CODE_DROP' | 'GIVEAWAY' | 'FLASH_SALE' | 'BROADCAST' | 'TEST';
  title: string;
  subject: string;
  recipientCount: number;
  successCount: number;
  status: 'SENT' | 'FAILED';
  sentBy: string;
  errorMessage?: string;
  createdAt: string;
}

export interface EmailNotificationModuleProps {
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const EmailNotificationModule: React.FC<EmailNotificationModuleProps> = ({ onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'subscribers' | 'broadcast' | 'settings' | 'logs'>('subscribers');

  // Subscribers State
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [subSearch, setSubSearch] = useState('');
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);

  // Settings State
  const [config, setConfig] = useState<EmailProviderConfig>(DEFAULT_EMAIL_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Broadcast State
  const [broadcastType, setBroadcastType] = useState<'BROADCAST' | 'GIVEAWAY' | 'FLASH_SALE' | 'CODE_DROP'>('BROADCAST');
  const [targetGroup, setTargetGroup] = useState<'ALL' | 'GIVEAWAY' | 'SALE' | 'GAME'>('ALL');
  const [selectedGameSlug, setSelectedGameSlug] = useState('');
  const [emailSubject, setEmailSubject] = useState('🎁 Nhận Ngay Mã Giftcode Mới Nhất Tại CodeGame.shop');
  const [emailTitle, setEmailTitle] = useState('Thông Báo Quà Tặng Mới Dành Cho Bạn');
  const [emailDescription, setEmailDescription] = useState('Hệ thống vừa cập nhật danh sách mã code độc quyền mới. Bấm nút bên dưới để mở web và nhận quà ngay!');
  const [ctaText, setCtaText] = useState('Mở Trang Nhận Quà Ngay');
  const [ctaUrl, setCtaUrl] = useState('https://codegame.shop');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [allGames, setAllGames] = useState<GameItem[]>([]);

  // Logs State
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Toast / Status Message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const getAdminHeaders = (): HeadersInit => {
    const token = localStorage.getItem('wcg_auth_token') || sessionStorage.getItem('wcg_auth_token') || '';
    const syncKey = localStorage.getItem('wcg_admin_sync_key') || sessionStorage.getItem('wcg_admin_sync_key') || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (syncKey) headers['X-Sync-Key'] = syncKey;
    return headers;
  };

  const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMsg({ text, type });
    if (onShowToast) {
      onShowToast(text, undefined, type);
    }
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // 1. Tải danh sách subscribers
  const fetchSubscribers = async () => {
    setIsLoadingSubs(true);
    try {
      const res = await fetch('/api/notifications/subscribers', { headers: getAdminHeaders() });
      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.subscribers)) {
        setSubscribers(data.subscribers);
      }
    } catch (err) {
      console.warn('[Fetch Subscribers]', err);
    } finally {
      setIsLoadingSubs(false);
    }
  };

  // 2. Tải cấu hình email
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/notifications/settings', { headers: getAdminHeaders() });
      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.warn('[Fetch Config]', err);
    }
  };

  // 3. Tải logs
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/notifications/logs', { headers: getAdminHeaders() });
      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('[Fetch Logs]', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    setAllGames(dataService.getGames());
    fetchSubscribers();
    fetchConfig();
    fetchLogs();
  }, []);

  // Xóa subscriber
  const handleDeleteSub = async (id: string, email: string) => {
    if (!window.confirm(`Xóa người đăng ký [${email}] khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/notifications/subscribers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showStatus(`Đã xóa ${email}`, 'success');
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      } else {
        showStatus(data?.message || 'Lỗi xóa người đăng ký', 'error');
      }
    } catch {
      showStatus('Lỗi mạng khi xóa', 'error');
    }
  };

  // Lưu cấu hình
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(config),
      });
      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showStatus('Đã lưu cấu hình email thành công!', 'success');
        if (data.config) setConfig(data.config);
      } else {
        showStatus(data?.message || 'Lỗi lưu cấu hình', 'error');
      }
    } catch {
      showStatus('Không thể lưu cấu hình', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Gửi test email
  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      showStatus('Vui lòng nhập địa chỉ email nhận thử nghiệm hợp lệ.', 'error');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          type: 'TEST',
          testEmail: testEmail.trim(),
          title: 'Kiểm Tra Kết Nối Hệ Thống Email CodeGame.shop',
          subject: '[TEST] Kiểm tra gửi thông báo từ CodeGame.shop',
          description: 'Xin chào Admin! Nếu bạn đọc được email này, tính năng gửi email thông báo sự kiện và giftcode của CodeGame.shop đã kết nối thành công và sẵn sàng phục vụ khách hàng.',
          ctaText: 'Kiểm Tra Trang Web',
          ctaUrl: 'https://codegame.shop',
        }),
      });

      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showStatus(`Gửi email thử nghiệm tới [${testEmail}] thành công!`, 'success');
        fetchLogs();
      } else {
        showStatus(data?.message || 'Gửi thử nghiệm thất bại.', 'error');
      }
    } catch {
      showStatus('Lỗi mạng khi gửi thử nghiệm', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Gửi broadcast
  const handleSendBroadcast = async () => {
    const targetDesc =
      targetGroup === 'ALL'
        ? 'TẤT CẢ người đăng ký active'
        : targetGroup === 'GIVEAWAY'
        ? 'nhóm đăng ký nhận thông báo Giveaway'
        : targetGroup === 'SALE'
        ? 'nhóm đăng ký nhận thông báo Flash Sale'
        : `nhóm theo dõi game [${selectedGameSlug}]`;

    if (!window.confirm(`Xác nhận bắn email [${broadcastType}] tới ${targetDesc}?`)) {
      return;
    }

    setIsSendingBroadcast(true);
    try {
      const selectedGame = allGames.find((g) => g.slug === selectedGameSlug);
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          type: broadcastType,
          targetGroup,
          gameSlug: selectedGameSlug,
          gameName: selectedGame?.name,
          title: emailTitle,
          subject: emailSubject,
          description: emailDescription,
          ctaText,
          ctaUrl,
        }),
      });

      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showStatus(`Đã gửi thành công ${data.successCount}/${data.recipientCount} email!`, 'success');
        fetchLogs();
      } else {
        showStatus(data?.message || 'Bắn email không thành công.', 'error');
      }
    } catch {
      showStatus('Lỗi kết nối khi gửi broadcast', 'error');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Lọc subscribers theo tìm kiếm
  const filteredSubs = subscribers.filter((s) => {
    if (!subSearch) return true;
    const q = subSearch.toLowerCase();
    return s.email.toLowerCase().includes(q) || s.subscribedGames.some((g) => g.toLowerCase().includes(q));
  });

  // KPI Calculations
  const totalSubs = subscribers.filter((s) => s.isActive).length;
  const codeSubs = subscribers.filter((s) => s.isActive && s.notifyFollowedCodes).length;
  const gwSubs = subscribers.filter((s) => s.isActive && s.notifyGiveaways).length;
  const saleSubs = subscribers.filter((s) => s.isActive && s.notifySales).length;

  return (
    <div className="space-y-6">
      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : statusMsg.type === 'error'
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              : 'bg-secondary/15 text-secondary border-secondary/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-cyber-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Đăng Ký</span>
            <Users className="w-4 h-4 text-secondary" />
          </div>
          <div className="text-2xl font-black font-display text-foreground">{totalSubs}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Người nhận tin đang hoạt động</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-cyber-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Theo Dõi Code Game</span>
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-display text-emerald-400">{codeSubs}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Đăng ký nhận code game cụ thể</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-cyber-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sự Kiện Giveaway</span>
            <Gift className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-display text-amber-400">{gwSubs}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Báo giờ G phát mã VIP</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-cyber-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Flash Sale</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-display text-rose-400">{saleSubs}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Báo giảm giá gói nạp & sale</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'subscribers'
              ? 'bg-secondary text-white shadow-neon-teal'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Sách Người Đăng Ký ({filteredSubs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-secondary text-white shadow-neon-teal'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Soạn & Bắn Email</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-secondary text-white shadow-neon-teal'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cài Đặt Cấu Hình Gửi Mail</span>
          {!config.isEnabled && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Chưa kích hoạt" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-secondary text-white shadow-neon-teal'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Nhật Ký Gửi Mail ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: SUBSCRIBERS */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Tìm kiếm email, tên game theo dõi..."
                className="w-full pl-10 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
              />
            </div>
            <button
              onClick={fetchSubscribers}
              disabled={isLoadingSubs}
              className="px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:border-secondary flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubs ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-cyber-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Email Người Nhận</th>
                    <th className="p-3.5">Tùy Chọn Nhận Tin</th>
                    <th className="p-3.5">Game Theo Dõi</th>
                    <th className="p-3.5">Trạng Thái</th>
                    <th className="p-3.5">Ngày Đăng Ký</th>
                    <th className="p-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                        Chưa có người đăng ký nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-bold text-foreground font-sans">
                          {sub.email}
                          {sub.userId && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-secondary/15 text-secondary border border-secondary/30">
                              Thành viên
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-sans">
                          <div className="flex flex-wrap gap-1">
                            {sub.notifyFollowedCodes && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                                Code Game
                              </span>
                            )}
                            {sub.notifyGiveaways && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                                Giveaway
                              </span>
                            )}
                            {sub.notifySales && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                                Sale
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-sans">
                          {sub.subscribedGames.length === 0 ? (
                            <span className="text-muted-foreground italic text-[11px]">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {sub.subscribedGames.map((slug) => (
                                <span
                                  key={slug}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-muted border border-border text-slate-300"
                                >
                                  {slug}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-sans">
                          {sub.isActive ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Đã hủy</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td className="p-3.5 text-right font-sans">
                          <button
                            onClick={() => handleDeleteSub(sub.id, sub.email)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
                            title="Xóa người đăng ký này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form cấu hình broadcast */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-cyber-card space-y-4">
              <h3 className="font-heading font-black text-sm text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-secondary" />
                <span>Cấu Hình Bắn Email Thông Báo</span>
              </h3>

              {/* Loại thông báo */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">Loại Thông Báo</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'BROADCAST', label: 'Thông Báo Chung', icon: Sparkles, color: 'text-secondary' },
                    { id: 'CODE_DROP', label: 'Phát Code Mới', icon: Gamepad2, color: 'text-emerald-400' },
                    { id: 'GIVEAWAY', label: 'Sự Kiện Giveaway', icon: Gift, color: 'text-amber-400' },
                    { id: 'FLASH_SALE', label: 'Flash Sale Giảm Giá', icon: Flame, color: 'text-rose-400' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBroadcastType(item.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        broadcastType === item.id
                          ? 'bg-secondary/15 border-secondary text-foreground shadow-sm'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhóm đối tượng nhận */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">Nhóm Người Nhận</label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                >
                  <option value="ALL">Tất cả người đăng ký ({totalSubs} người)</option>
                  <option value="GIVEAWAY">Chỉ nhóm đăng ký Giveaway ({gwSubs} người)</option>
                  <option value="SALE">Chỉ nhóm đăng ký Flash Sale ({saleSubs} người)</option>
                  <option value="GAME">Chỉ nhóm theo dõi game cụ thể</option>
                </select>
              </div>

              {/* Nếu chọn nhóm GAME */}
              {targetGroup === 'GAME' && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Chọn Game Đang Theo Dõi</label>
                  <select
                    value={selectedGameSlug}
                    onChange={(e) => setSelectedGameSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                  >
                    <option value="">-- Chọn game --</option>
                    {allGames.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.name} ({g.publisher || 'NPH'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tiêu đề Email */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Tiêu Đề Email (Subject Line)
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                />
              </div>

              {/* Tiêu đề hiển thị trong thư */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Tiêu Đề Hiển Thị (H1 trong thư)
                </label>
                <input
                  type="text"
                  value={emailTitle}
                  onChange={(e) => setEmailTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                />
              </div>

              {/* Nội dung thư */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Nội Dung Thư (Lời nhắn chi tiết)
                </label>
                <textarea
                  rows={4}
                  value={emailDescription}
                  onChange={(e) => setEmailDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary resize-none"
                />
              </div>

              {/* CTA Link */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Chữ Trên Nút</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full px-3.5 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Link Đích (URL)</label>
                  <input
                    type="text"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    className="w-full px-3.5 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSendingBroadcast}
                  onClick={handleSendBroadcast}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-secondary to-blue-600 hover:from-secondary/90 hover:to-blue-500 shadow-neon-teal transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingBroadcast ? 'Đang Bắn Email...' : 'Bắn Email Ngay'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Email Preview */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-cyber-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-black text-sm text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Xem Trước Trực Quan (Live Preview)</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Dark Mode
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Giao diện thực tế người dùng sẽ nhận được trong Gmail, Outlook hoặc Apple Mail:
              </p>

              {/* Iframe preview */}
              <div className="rounded-xl overflow-hidden border border-border/80 bg-black min-h-[460px] shadow-inner">
                <iframe
                  title="Email Live Preview"
                  srcDoc={buildCyberpunkEmailHtml({
                    type: broadcastType,
                    title: emailTitle,
                    description: emailDescription,
                    gameName: selectedGameSlug ? allGames.find((g) => g.slug === selectedGameSlug)?.name : undefined,
                    ctaText,
                    ctaUrl,
                  })}
                  className="w-full h-[520px] border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSaveConfig} className="bg-card border border-border/80 rounded-2xl p-5 shadow-cyber-card space-y-4">
              <h3 className="font-heading font-black text-sm text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-secondary" />
                <span>Cấu Hình Nhà Cung Cấp Gửi Email (Resend / Brevo)</span>
              </h3>

              {/* Bật/Tắt gửi email */}
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-foreground">Kích Hoạt Tính Năng Gửi Email</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cho phép hệ thống tự động bắn email khi có sự kiện hoặc duyệt giftcode
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.isEnabled}
                    onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>

              {/* Chọn Provider */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">Chọn Nhà Cung Cấp</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: 'resend' })}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      config.provider === 'resend'
                        ? 'bg-secondary/15 border-secondary text-foreground'
                        : 'bg-muted/30 border-border text-muted-foreground'
                    }`}
                  >
                    <div className="text-secondary font-black">Resend API (Khuyên dùng)</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      3.000 mail/tháng miễn phí, tốc độ Edge siêu nhanh, vào Inbox 99%.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, provider: 'brevo' })}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      config.provider === 'brevo'
                        ? 'bg-secondary/15 border-secondary text-foreground'
                        : 'bg-muted/30 border-border text-muted-foreground'
                    }`}
                  >
                    <div className="text-secondary font-black">Brevo (Sendinblue)</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      300 mail/ngày (9.000/tháng), REST API trực tiếp.
                    </div>
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  API Key ({config.provider === 'resend' ? 're_...' : 'xkeysib-...'}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    required
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder={config.provider === 'resend' ? 're_123456789...' : 'xkeysib-...'}
                    className="w-full pr-10 pl-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Email người gửi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Email Người Gửi (Sender Email)
                  </label>
                  <input
                    type="email"
                    value={config.senderEmail}
                    onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })}
                    placeholder="notifications@codegame.shop"
                    className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Tên Người Gửi Hiển Thị
                  </label>
                  <input
                    type="text"
                    value={config.senderName}
                    onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                    placeholder="CodeGame.shop - Thông Báo"
                    className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-secondary hover:bg-secondary/90 shadow-neon-teal transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Đang Lưu...' : 'Lưu Cấu Hình'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Test Send Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-cyber-card space-y-4">
              <h3 className="font-heading font-black text-sm text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Gửi Thử Nghiệm Kiểm Tra Kết Nối</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nhập email của bạn để gửi 1 bức thư thử nghiệm mẫu từ nhà cung cấp đã cấu hình. Giúp kiểm tra API Key và khả năng vào hộp thư chính (Inbox).
              </p>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Email Nhận Thử Nghiệm
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-secondary"
                />
              </div>

              <button
                type="button"
                disabled={isSendingTest || !config.apiKey}
                onClick={handleSendTestEmail}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'Đang Gửi Thử...' : 'Gửi Thử Nghiệm Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Lịch sử các đợt bắn email tự động và thủ công (100 lượt gần nhất):
            </p>
            <button
              onClick={fetchLogs}
              disabled={isLoadingLogs}
              className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:border-secondary flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </button>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-cyber-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Thời Gian</th>
                    <th className="p-3.5">Loại</th>
                    <th className="p-3.5">Tiêu Đề Email</th>
                    <th className="p-3.5">Số Người Nhận</th>
                    <th className="p-3.5">Thành Công</th>
                    <th className="p-3.5">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans text-xs">
                        Chưa có nhật ký gửi email nào.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 text-slate-400">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="p-3.5 font-sans font-bold">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border">
                            {log.type}
                          </span>
                        </td>
                        <td className="p-3.5 font-sans text-foreground font-bold max-w-xs truncate">
                          {log.subject}
                        </td>
                        <td className="p-3.5 text-slate-300">{log.recipientCount}</td>
                        <td className="p-3.5 text-emerald-400 font-bold">{log.successCount}</td>
                        <td className="p-3.5 font-sans">
                          {log.status === 'SENT' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              THÀNH CÔNG
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 cursor-help"
                              title={log.errorMessage || 'Lỗi gửi'}
                            >
                              THẤT BẠI
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
        </div>
      )}
    </div>
  );
};
