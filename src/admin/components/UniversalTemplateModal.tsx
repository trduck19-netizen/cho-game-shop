import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  Clock,
  History,
  ShieldCheck,
  AlertTriangle,
  Gift,
  Search,
  Wrench,
  ShoppingBag,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Users,
  MessageSquare,
  Copy,
  ChevronRight,
  Database,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { templateService } from '../../services/templateService';
import type {
  UniversalTemplatesConfig,
  GiveawayTemplateConfig,
  CatalogTemplateConfig,
  UtilityTemplateConfig,
  StoreTemplateConfig,
  TemplateSnapshot,
  TemplateAuditLog,
} from '../../types/template';
import type { GiveawayCampaign, UtilityProduct, StoreProduct } from '../../types/game';
import { formatFullDateTime } from '../../utils/textUtils';

interface UniversalTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  giveaways?: GiveawayCampaign[];
  utilities?: UtilityProduct[];
  storeProducts?: StoreProduct[];
  games?: any[];
  currentUser?: any;
}

export const UniversalTemplateModal: React.FC<UniversalTemplateModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  giveaways = [],
  utilities = [],
  storeProducts = [],
  games = [],
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'giveaway' | 'catalog' | 'utility' | 'store' | 'snapshots' | 'audit'>('giveaway');
  const [templates, setTemplates] = useState<UniversalTemplatesConfig>(() => templateService.getTemplates());
  const [snapshots, setSnapshots] = useState<TemplateSnapshot[]>(() => templateService.getSnapshots());
  const [auditLogs, setAuditLogs] = useState<TemplateAuditLog[]>(() => templateService.getAuditLogs());

  // Preview Modal State for Force Apply All
  const [previewScope, setPreviewScope] = useState<'giveaway' | 'catalog' | 'utility' | 'store' | 'all' | null>(null);
  const [previewDiffs, setPreviewDiffs] = useState<Array<{ id: string; title: string; scope: string; changes: Array<{ field: string; before: string; after: string }> }>>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTemplates(templateService.getTemplates());
      setSnapshots(templateService.getSnapshots());
      setAuditLogs(templateService.getAuditLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentAuthor = currentUser?.username || currentUser?.displayName || 'Admin';

  const handleSaveTemplates = async () => {
    setIsSaving(true);
    try {
      await templateService.saveTemplatesToServer(templates, currentAuthor);
      setSnapshots(templateService.getSnapshots());
      setAuditLogs(templateService.getAuditLogs());
      onShowToast(
        'Đã lưu Mẫu Chung thành công!',
        'Cấu hình mẫu đã được lưu vào D1 (chỉ tốn 1 bản ghi). Mọi mục kế thừa mẫu sẽ tự động đổi theo trên Web Khách.',
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi lưu mẫu chung', err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenForceApplyPreview = (scope: 'giveaway' | 'catalog' | 'utility' | 'store' | 'all') => {
    const diffs = templateService.generatePreviewDiff(
      scope,
      { giveaways, utilities, storeProducts, games },
      templates
    );
    setPreviewScope(scope);
    setPreviewDiffs(diffs);
  };

  const handleConfirmForceApply = async () => {
    if (!previewScope) return;
    setIsApplying(true);
    try {
      // 1. First save the current template so runtime inherits the latest
      await templateService.saveTemplatesToServer(templates, currentAuthor);

      // 2. Execute force apply with mandatory snapshot
      const res = templateService.executeForceApplyAll(
        previewScope,
        { giveaways, utilities, storeProducts },
        currentAuthor
      );

      setSnapshots(templateService.getSnapshots());
      setAuditLogs(templateService.getAuditLogs());
      setPreviewScope(null);

      onShowToast(
        `Áp đặt toàn bộ thành công!`,
        `Đã chuyển ${res.affectedCount} mục sang Mẫu Chung. Bản sao lưu "${res.snapshotId}" đã được tạo an toàn.`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Lỗi áp đặt', err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRestoreSnapshot = (snapId: string) => {
    const target = snapshots.find((s) => s.id === snapId);
    if (!target) return;

    if (!window.confirm(`Bạn có chắc muốn khôi phục lại hệ thống về bản sao lưu "${target.id}" (${formatFullDateTime(target.created_at)})?`)) {
      return;
    }

    const success = templateService.restoreSnapshot(snapId, currentAuthor);
    if (success) {
      setTemplates(templateService.getTemplates());
      setSnapshots(templateService.getSnapshots());
      setAuditLogs(templateService.getAuditLogs());
      onShowToast(
        'Khôi phục bản sao lưu thành công!',
        `Hệ thống đã trở về trạng thái của bản sao lưu ${target.id}.`,
        'success'
      );
    } else {
      onShowToast('Lỗi khôi phục', 'Không thể khôi phục bản sao lưu này.', 'error');
    }
  };

  // Helper updater for giveaway config
  const updateGiveaway = (patch: Partial<GiveawayTemplateConfig>) => {
    setTemplates((p) => ({
      ...p,
      giveaway: { ...p.giveaway, ...patch },
    }));
  };

  // Helper updater for catalog config
  const updateCatalog = (patch: Partial<CatalogTemplateConfig>) => {
    setTemplates((p) => ({
      ...p,
      catalog: { ...p.catalog, ...patch },
    }));
  };

  // Helper updater for utility config
  const updateUtility = (patch: Partial<UtilityTemplateConfig>) => {
    setTemplates((p) => ({
      ...p,
      utility: { ...p.utility, ...patch },
    }));
  };

  // Helper updater for store config
  const updateStore = (patch: Partial<StoreTemplateConfig>) => {
    setTemplates((p) => ({
      ...p,
      store: { ...p.store, ...patch },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Main Modal Card */}
      <div className="relative my-2 sm:my-6 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-all z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Mẫu Chung Toàn Sàn (Universal Templates)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ⚡ 1-Write D1 SSOT
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Đổi mẫu một chỗ — Các đợt & sản phẩm dùng mẫu tự động đổi theo trên Web Khách.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('giveaway')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'giveaway'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>1. Khung Giveaway</span>
            <span className="text-[10px] opacity-75 font-mono">({giveaways.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>2. Tra Cứu Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('utility')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'utility'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>3. Tiện Ích</span>
            <span className="text-[10px] opacity-75 font-mono">({utilities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'store'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>4. Cửa Hàng Code</span>
            <span className="text-[10px] opacity-75 font-mono">({storeProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('snapshots')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'snapshots'
                ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sao Lưu ({snapshots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử ({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab Contents Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ========================================================= */}
          {/* TAB 1: GIVEAWAY TEMPLATE */}
          {/* ========================================================= */}
          {activeTab === 'giveaway' && (
            <div className="space-y-6">
              {/* Architecture Notice Banner */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
                  <span className="font-bold">Cơ Chế Kế Thừa Lúc Chạy (Runtime Inheritance):</span> Khi lưu Mẫu Chung, hệ thống chỉ ghi đúng <strong className="font-mono">1 bản ghi cấu hình</strong> vào Cloudflare D1. Tất cả 41 đợt giveaway đang dùng mẫu sẽ tự động kế thừa tức thì trên Web Khách mà không cần chạy lệnh cập nhật ghi đè hàng loạt vào DB.
                </div>
              </div>

              {/* NHÓM 1: CHÍNH SÁCH VÀ HIỂN THỊ CHUNG */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    ⚙️ Nhóm 1: Chính Sách & Hiển Thị Chung
                  </span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                    Áp dụng đồng bộ cho mọi đợt dùng mẫu
                  </span>
                </div>

                {/* 1.1 3 Conditions */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    1. Cấu hình 3 điều kiện nhận giftcode mặc định:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Tuổi nick tối thiểu (ngày):</span>
                      <input
                        type="number"
                        min={0}
                        value={templates.giveaway.min_account_age_days}
                        onChange={(e) => updateGiveaway({ min_account_age_days: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Tối đa code / User:</span>
                      <input
                        type="number"
                        min={0}
                        value={templates.giveaway.max_per_user}
                        onChange={(e) => updateGiveaway({ max_per_user: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        placeholder="0 = Vô hạn"
                        className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Tối đa code / IP:</span>
                      <input
                        type="number"
                        min={0}
                        value={templates.giveaway.max_per_ip}
                        onChange={(e) => updateGiveaway({ max_per_ip: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        placeholder="0 = Vô hạn"
                        className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px] block">Hồi chiêu CD (phút):</span>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                          {(() => {
                            const mins = templates.giveaway.cooldown_minutes !== undefined
                              ? templates.giveaway.cooldown_minutes
                              : (templates.giveaway.cooldown_hours || 0) * 60;
                            return mins === 0 ? '0p' : (mins >= 60 && mins % 60 === 0 ? `${mins / 60}h` : `${mins}p`);
                          })()}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={templates.giveaway.cooldown_minutes !== undefined ? templates.giveaway.cooldown_minutes : (templates.giveaway.cooldown_hours || 0) * 60}
                        onChange={(e) => {
                          const mins = Math.max(0, parseInt(e.target.value, 10) || 0);
                          updateGiveaway({
                            cooldown_minutes: mins,
                            cooldown_hours: Math.round(mins / 60) || (mins > 0 ? 1 : 0),
                          });
                        }}
                        className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.2 Custom Banner / Link Community (Zalo) */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
                        2. Ô Thông Báo / Link Tùy Chỉnh (Zalo / Cộng Đồng):
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Hiển thị ô nút bấm dẫn link Zalo, fanpage, telegram trong modal chi tiết ngoài Web Khách.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={templates.giveaway.custom_banner_enabled}
                        onChange={(e) => updateGiveaway({ custom_banner_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {templates.giveaway.custom_banner_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Nội dung nút / chữ hiển thị:</span>
                        <input
                          type="text"
                          value={templates.giveaway.custom_banner_text}
                          onChange={(e) => updateGiveaway({ custom_banner_text: e.target.value })}
                          placeholder="Tham gia nhóm zalo của web tại đây"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Đường dẫn link (URL):</span>
                        <input
                          type="text"
                          value={templates.giveaway.custom_banner_link}
                          onChange={(e) => updateGiveaway({ custom_banner_link: e.target.value })}
                          placeholder="https://zalo.me/g/..."
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 1.3 3 Notification Messages */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    3. Ba Thông Báo Tùy Chỉnh Khi Giật Mã (Hỗ trợ chỗ trống {'{code}'}, {'{game_name}'}, {'{last_user}'}, {'{time_left}'}):
                  </span>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                        <span>Thông báo khi giật mã thành công:</span>
                        <span className="text-slate-400 font-mono text-[10px]">Hỗ trợ: {'{code}'}, {'{game_name}'}</span>
                      </span>
                      <input
                        type="text"
                        value={templates.giveaway.custom_success_msg}
                        onChange={(e) => updateGiveaway({ custom_success_msg: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                        <span>Thông báo khi đang chờ đợt mã tiếp theo (Hồi chiêu toàn sàn):</span>
                        <span className="text-slate-400 font-mono text-[10px]">Hỗ trợ: {'{last_user}'}, {'{time_left}'}</span>
                      </span>
                      <input
                        type="text"
                        value={templates.giveaway.custom_cooldown_msg}
                        onChange={(e) => updateGiveaway({ custom_cooldown_msg: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                        <span>Thông báo khi sự kiện hết sạch mã trong kho:</span>
                        <span className="text-slate-400 font-mono text-[10px]">Hỗ trợ: {'{game_name}'}</span>
                      </span>
                      <input
                        type="text"
                        value={templates.giveaway.custom_out_of_stock_msg}
                        onChange={(e) => updateGiveaway({ custom_out_of_stock_msg: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.4 Waiting Room & Counter */}
                <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-teal-900 dark:text-teal-300 block">
                        4. Phòng Chờ & Bộ Đếm Người Đang Chờ (Waiting Room):
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Hiển thị số lượng người cùng đang chờ giật mã ngoài Web Khách.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={templates.giveaway.enable_waiting_room}
                        onChange={(e) => updateGiveaway({ enable_waiting_room: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>

                  {templates.giveaway.enable_waiting_room && (
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Min người chờ mặc định:</span>
                        <input
                          type="number"
                          min={0}
                          value={templates.giveaway.waiting_users_min}
                          onChange={(e) => updateGiveaway({ waiting_users_min: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                          className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Max người chờ mặc định:</span>
                        <input
                          type="number"
                          min={0}
                          value={templates.giveaway.waiting_users_max}
                          onChange={(e) => updateGiveaway({ waiting_users_max: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                          className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 1.5 Show Claimed Count Toggle & Virtual Offset Note */}
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      5. Nút Hiển Thị Số Lượt Đã Giật (Bật/Tắt mẫu chung):
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Chỉ trạng thái BẬT/TẮT làm mẫu chung. Con số lượt ảo bổ sung (<span className="font-mono text-purple-600">virtual_claimed_offset</span>) được <strong>bảo tồn riêng từng đợt</strong>.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={templates.giveaway.show_claimed_count}
                      onChange={(e) => updateGiveaway({ show_claimed_count: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* 1.6 Global Cooldown (Site-wide) */}
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        6. Phát Code Giãn Cách Toàn Sàn (Cài Đặt Chung Duy Nhất Toàn Web):
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        Chuyển thành 1 cài đặt duy nhất cho toàn web (không cấu hình riêng lẻ từng đợt nữa). Khi có người giật mã, toàn web đếm ngược chờ mốc này.
                      </span>
                    </div>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-amber-600 text-white shadow-xs">
                      {templates.giveaway.global_cooldown_seconds === 0
                        ? 'Tắt (0s)'
                        : templates.giveaway.global_cooldown_seconds >= 60
                        ? `${Math.floor(templates.giveaway.global_cooldown_seconds / 60)} phút ${templates.giveaway.global_cooldown_seconds % 60 > 0 ? `${templates.giveaway.global_cooldown_seconds % 60}s` : ''}`
                        : `${templates.giveaway.global_cooldown_seconds}s`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                        onClick={() => updateGiveaway({ global_cooldown_seconds: item.val })}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          templates.giveaway.global_cooldown_seconds === item.val
                            ? 'bg-amber-600 text-white shadow-xs scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* NHÓM 2: NỘI DUNG MẪU CHUNG (CÚ PHÁP CHỖ TRỐNG) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    📝 Nhóm 2: Nội Dung Mẫu Chung (Có Chỗ Trống)
                  </span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    Hỗ trợ điền tự động {'{game_name}'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                      Mẫu Tiêu Đề Đợt Phát:
                    </label>
                    <input
                      type="text"
                      value={templates.giveaway.title_pattern}
                      onChange={(e) => updateGiveaway({ title_pattern: e.target.value })}
                      placeholder="Code riêng + {game_name}"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      Ví dụ với game Ta là Hắc Ngộ Không: <strong className="text-indigo-600">{templates.giveaway.title_pattern.replace(/\{game_name\}/gi, 'Ta là Hắc Ngộ Không')}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                      Mẫu Phần Thưởng Chi Tiết:
                    </label>
                    <input
                      type="text"
                      value={templates.giveaway.rewards}
                      onChange={(e) => updateGiveaway({ rewards: e.target.value })}
                      placeholder="Code ngẫu nhiên"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                      Mẫu Mô Tả Quy Định Nhận:
                    </label>
                    <input
                      type="text"
                      value={templates.giveaway.description}
                      onChange={(e) => updateGiveaway({ description: e.target.value })}
                      placeholder="Code dùng cho 1 tài khoản, 1 loại dùng 1 lần."
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* BẢO TỒN RIÊNG TỪNG ĐỢT BANNER */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1">
                  🔒 Dữ Liệu Tuyệt Đối Giữ Riêng Từng Đợt (Không bị ghi đè khi đổi mẫu):
                </span>
                <p className="text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-300/80">
                  Tựa game (<code className="font-mono">game_slug, game_name</code>), Icon / Cover, Con số lượt ảo bổ sung (<code className="font-mono">virtual_claimed_offset</code>), Trạng thái đang mở (<code className="font-mono">is_active</code>), Kho mã quà tặng (<code className="font-mono">codes_pool, claim_history</code>).
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CATALOG TEMPLATE */}
          {/* ========================================================= */}
          {activeTab === 'catalog' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex items-start gap-3">
                <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  <span className="font-bold">Mẫu Mục Tra Cứu Code & Danh Mục Game:</span> Định nghĩa hướng dẫn đổi mã giftcode chung chuẩn SEO và các nhãn hiển thị trong chi tiết game ngoài Web Khách.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                      Mẫu Hướng Dẫn Nhập Code (Có chỗ trống {'{game_name}'}):
                    </label>
                    <textarea
                      rows={3}
                      value={templates.catalog.instruction_template}
                      onChange={(e) => updateCatalog({ instruction_template: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      Xem trước: <span className="italic text-indigo-600 dark:text-indigo-400">{templates.catalog.instruction_template.replace(/\{game_name\}/gi, 'Genshin Impact')}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Nhãn nút sao chép:</span>
                      <input
                        type="text"
                        value={templates.catalog.copy_button_label}
                        onChange={(e) => updateCatalog({ copy_button_label: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Huy hiệu mặc định:</span>
                      <input
                        type="text"
                        value={templates.catalog.default_badge}
                        onChange={(e) => updateCatalog({ default_badge: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Nhãn trạng thái còn hạn:</span>
                      <input
                        type="text"
                        value={templates.catalog.active_status_label}
                        onChange={(e) => updateCatalog({ active_status_label: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Nhãn trạng thái hết hạn:</span>
                      <input
                        type="text"
                        value={templates.catalog.expired_status_label}
                        onChange={(e) => updateCatalog({ expired_status_label: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: UTILITY TEMPLATE */}
          {/* ========================================================= */}
          {activeTab === 'utility' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 flex items-start gap-3">
                <Wrench className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-950 dark:text-teal-200 leading-relaxed">
                  <span className="font-bold">Mẫu Mục Tiện Ích:</span> Áp dụng cho các sản phẩm tiện ích, dịch vụ ngoài lề, tài khoản, license key.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                      Mẫu Tiêu Đề Tiện Ích:
                    </label>
                    <input
                      type="text"
                      value={templates.utility.title_pattern}
                      onChange={(e) => updateUtility({ title_pattern: e.target.value })}
                      placeholder="{title}"
                      className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                      Mẫu Mô Tả Bảo Hành Mặc Định:
                    </label>
                    <textarea
                      rows={3}
                      value={templates.utility.description_template}
                      onChange={(e) => updateUtility({ description_template: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Nhãn nút hành động:</span>
                      <input
                        type="text"
                        value={templates.utility.action_button_label}
                        onChange={(e) => updateUtility({ action_button_label: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Huy hiệu mặc định:</span>
                      <input
                        type="text"
                        value={templates.utility.default_badge}
                        onChange={(e) => updateUtility({ default_badge: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: STORE TEMPLATE */}
          {/* ========================================================= */}
          {activeTab === 'store' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
                <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                  <span className="font-bold">Mẫu Mục Cửa Hàng Code:</span> Áp dụng cho các sản phẩm gói nạp, code trả phí giao trực tiếp từ kho Cloudflare D1.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                      Mẫu Tiêu Đề Sản Phẩm:
                    </label>
                    <input
                      type="text"
                      value={templates.store.title_pattern}
                      onChange={(e) => updateStore({ title_pattern: e.target.value })}
                      placeholder="{title}"
                      className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block text-[11px]">
                      Mẫu Mô Tả Bản Quyền Mặc Định:
                    </label>
                    <textarea
                      rows={3}
                      value={templates.store.description_template}
                      onChange={(e) => updateStore({ description_template: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Nhãn nút mua ngay:</span>
                      <input
                        type="text"
                        value={templates.store.action_button_label}
                        onChange={(e) => updateStore({ action_button_label: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Nhãn còn hàng:</span>
                      <input
                        type="text"
                        value={templates.store.in_stock_label}
                        onChange={(e) => updateStore({ in_stock_label: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Nhãn tạm hết hàng:</span>
                      <input
                        type="text"
                        value={templates.store.out_of_stock_label}
                        onChange={(e) => updateStore({ out_of_stock_label: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: SNAPSHOTS & ROLLBACK */}
          {/* ========================================================= */}
          {activeTab === 'snapshots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Danh Sách Bản Sao Lưu Snapshot ({snapshots.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hệ thống tự động tạo snapshot trước mỗi thao tác Áp Đặt Toàn Bộ hoặc thay đổi lớn để bạn có thể rollback an toàn 100%.
                  </p>
                </div>
              </div>

              {snapshots.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  Chưa có bản sao lưu nào được tạo.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{snap.id}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                            {snap.scope}
                          </span>
                          <span className="text-slate-400 text-[10px]">• Tác động: {snap.affected_count} mục</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{snap.note}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>Bởi: <strong className="text-slate-600 dark:text-slate-300">{snap.created_by}</strong></span>
                          <span>•</span>
                          <span>{formatFullDateTime(snap.created_at)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Khôi Phục Bản Này</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: AUDIT LOGS */}
          {/* ========================================================= */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Nhật Ký Kiểm Toán Mẫu Chung (Audit Logs)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ghi lại toàn bộ thao tác cập nhật mẫu, áp đặt và khôi phục snapshot.
                </p>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  Chưa có lịch sử thao tác nào.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            log.action === 'FORCE_APPLY_ALL'
                              ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                              : log.action === 'RESTORE_SNAPSHOT'
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}>
                            {log.action}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">{log.actor}</span>
                          <span className="text-[10px] text-slate-400">({formatFullDateTime(log.timestamp)})</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px]">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Phiên bản Mẫu: <strong className="font-mono text-slate-800 dark:text-slate-200">v{templates.version}</strong></span>
            <span>•</span>
            <span>Cập nhật: {templates.updated_at ? formatFullDateTime(templates.updated_at) : 'Ban đầu'}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Nút Áp Đặt Toàn Bộ */}
            {activeTab !== 'snapshots' && activeTab !== 'audit' && (
              <button
                type="button"
                onClick={() => handleOpenForceApplyPreview(activeTab)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                title="Xem trước và áp đặt toàn bộ mục thuộc tab này sang dùng Mẫu Chung"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Áp Đặt Toàn Bộ</span>
              </button>
            )}

            {/* Nút Lưu Mẫu Chung */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveTemplates}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Đang Lưu...' : 'Lưu Mẫu Chung (1 Ghi D1)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PREVIEW MODAL FOR FORCE APPLY ALL */}
      {/* ========================================================= */}
      {previewScope && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setPreviewScope(null)} />
          <div className="relative my-4 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 bg-purple-50/70 dark:bg-purple-950/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Xem Trước Khi Áp Đặt Toàn Bộ ({previewDiffs.length} Mục Bị Tác Động)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Phạm vi: <strong className="uppercase font-mono text-purple-600">{previewScope}</strong> — Bản sao lưu Snapshot sẽ tự động tạo trước.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewScope(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diff Preview Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Các mục dưới đây sẽ chuyển sang trạng thái <strong>Mẫu Chung</strong>. Khi bạn sửa Mẫu Chung trong tương lai, chúng sẽ tự động cập nhật theo.
                </span>
              </div>

              {previewDiffs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tất cả các mục trong phạm vi này đã đang dùng Mẫu Chung mới nhất.
                </div>
              ) : (
                <div className="space-y-2">
                  {previewDiffs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900 dark:text-white">{item.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-purple-400/50">
                        {item.changes.map((c, idx) => (
                          <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{c.field}:</span>
                            <span className="line-through text-rose-500 opacity-80">{c.before}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{c.after}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setPreviewScope(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isApplying || previewDiffs.length === 0}
                onClick={handleConfirmForceApply}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isApplying ? 'Đang Áp Đặt...' : `Xác Nhận Áp Đặt (${previewDiffs.length} Mục)`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
