import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Gift,
  Users,
  Dices,
  Calendar,
  Trophy,
  Save,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Percent,
  Coins,
  ShieldCheck,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { growthService, DEFAULT_GROWTH_CONFIG } from '../../services/growthService';
import { dataService } from '../../services/dataService';
import type { GrowthConfig, WheelSlice } from '../../types/growth';
import { formatCore } from '../../utils/textUtils';

interface GrowthModuleProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const GrowthModule: React.FC<GrowthModuleProps> = ({ onShowToast }) => {
  const [config, setConfig] = useState<GrowthConfig>(() => growthService.getConfig());
  const [activeTab, setActiveTab] = useState<'welcome' | 'referral' | 'wheel' | 'checkin' | 'leaderboard'>('welcome');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Ensure fresh server config is pulled on mount
    dataService.syncWithCloudflareKV();
    const handleUpdate = (e?: any) => {
      const cfg = e?.detail || growthService.getConfig();
      if (cfg) setConfig(cfg);
    };
    window.addEventListener('wcg_growth_config_updated', handleUpdate);
    return () => {
      window.removeEventListener('wcg_growth_config_updated', handleUpdate);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = growthService.saveConfig(config);
      await dataService.pushToCloudflareKV('wcg_growth_config_v1', saved);
      onShowToast(
        'Đã lưu cấu hình tăng trưởng!',
        'Cấu hình Viral Loop & Thu hút người dùng mới đã được lưu và đồng bộ lên Cloudflare D1 thành công.',
        'success'
      );
    } catch {
      onShowToast('Lỗi', 'Không thể lưu cấu hình tăng trưởng.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục cấu hình tăng trưởng về mặc định không?')) {
      setConfig(DEFAULT_GROWTH_CONFIG);
      const saved = growthService.saveConfig(DEFAULT_GROWTH_CONFIG);
      await dataService.pushToCloudflareKV('wcg_growth_config_v1', saved);
      onShowToast('Đã khôi phục mặc định', 'Cấu hình đã trở về thông số ban đầu và đồng bộ lên Cloudflare D1.', 'info');
    }
  };

  const updateSlice = (index: number, field: keyof WheelSlice, value: any) => {
    const updatedSlices = [...config.slices];
    updatedSlices[index] = { ...updatedSlices[index], [field]: value };
    setConfig({ ...config, slices: updatedSlices });
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      {/* Module Header & Top KPI */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-border/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shadow-sm shrink-0">
            <Rocket className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-xl text-slate-900 dark:text-white">
                Tăng Trưởng & Lan Truyền (Growth & Viral Loop)
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  config.isEnabled
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}
              >
                {config.isEnabled ? 'ĐANG BẬT' : 'TẠM TẮT'}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Cơ chế thu hút người dùng mới, hoa hồng giới thiệu, ưu đãi nạp đầu, vòng quay may mắn & điểm danh 7 ngày
            </p>
          </div>
        </div>

        {/* Master Control & Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm">
            <input
              type="checkbox"
              checked={config.isEnabled}
              onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Bật Hệ Thống</span>
          </label>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all cursor-pointer"
            title="Khôi phục mặc định"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang Lưu...' : 'Lưu Cấu Hình'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Quà Tân Thủ"
          value={formatCore(config.welcomeBonusCore)}
          icon={Gift}
          color="amber"
          subtext={`Tặng +${config.welcomeBonusSpins} lượt quay`}
        />
        <StatCard
          title="Hoa Hồng Nạp"
          value={`${config.referralCommissionPercent}%`}
          icon={Users}
          color="emerald"
          subtext="Trích từ đơn nạp của bạn bè"
        />
        <StatCard
          title="Ưu Đãi Nạp Đầu"
          value={`+${config.firstDepositBonusPercent}%`}
          icon={Percent}
          color="indigo"
          subtext="Áp dụng lần nạp đầu tiên"
        />
        <StatCard
          title="Vòng Quay May Mắn"
          value={`${config.slices.length} Ô Quà`}
          icon={Dices}
          color="rose"
          subtext={`Free ${config.dailyFreeSpins} lượt/ngày`}
        />
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('welcome')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'welcome'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Quà Tân Thủ & Nạp Đầu</span>
        </button>

        <button
          onClick={() => setActiveTab('referral')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'referral'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Mời Bạn & Hoa Hồng</span>
        </button>

        <button
          onClick={() => setActiveTab('wheel')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'wheel'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Vòng Quay May Mắn</span>
        </button>

        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'checkin'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Điểm Danh 7 Ngày</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Đua Top Bảng Xếp Hạng</span>
        </button>
      </div>

      {/* Tab 1: Quà Tân Thủ & Ưu Đãi Nạp Đầu */}
      {activeTab === 'welcome' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section 1: Gói Quà Tân Thủ */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Gói Quà Chào Mừng Tân Thủ</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.welcomeBonusEnabled}
                  onChange={(e) => setConfig({ ...config, welcomeBonusEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Kích hoạt</span>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Số Core Tặng Tân Thủ (Core/VNĐ):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={config.welcomeBonusCore}
                  onChange={(e) => setConfig({ ...config, welcomeBonusCore: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Tương đương: {formatCore(config.welcomeBonusCore)} nạp thẳng vào ví tân thủ
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Số Lượt Quay May Mắn Tặng Kèm:
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.welcomeBonusSpins}
                  onChange={(e) => setConfig({ ...config, welcomeBonusSpins: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Ưu Đãi Nạp Đầu (First Deposit Bonus) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Ưu Đãi Nạp Lần Đầu (First Deposit)</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.firstDepositBonusEnabled}
                  onChange={(e) => setConfig({ ...config, firstDepositBonusEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Kích hoạt</span>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Phần Trăm Thưởng Nạp Đầu (%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.firstDepositBonusPercent}
                    onChange={(e) =>
                      setConfig({ ...config, firstDepositBonusPercent: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="font-bold text-slate-500">%</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Ví dụ: Nạp 100,000đ nhận 120,000 Core (+{config.firstDepositBonusPercent}%)
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mã Code VIP Kèm Theo (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={config.firstDepositVipCode || ''}
                  onChange={(e) => setConfig({ ...config, firstDepositVipCode: e.target.value })}
                  placeholder="VD: WCG-VIP20-TANTHU"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Mời Bạn & Hoa Hồng (Referral & Commissions) */}
      {activeTab === 'referral' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Cơ Chế Mời Bạn Cùng Có Lợi (Two-sided Referral)</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.referralEnabled}
                  onChange={(e) => setConfig({ ...config, referralEnabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Kích hoạt</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Hoa Hồng Nạp Tiền (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={config.referralCommissionPercent}
                  onChange={(e) =>
                    setConfig({ ...config, referralCommissionPercent: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Trích % mỗi khi bạn bè nạp tiền</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Thưởng Bạn Được Mời:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={config.refereeBonusCore}
                  onChange={(e) =>
                    setConfig({ ...config, refereeBonusCore: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Cộng Core vào ví bạn mới</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Thưởng Người Mời (Core):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={config.referrerBonusCore}
                  onChange={(e) =>
                    setConfig({ ...config, referrerBonusCore: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Thưởng mỗi lượt mời thành công</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Thưởng Lượt Quay Cho Người Mời:
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={config.referrerBonusSpins}
                  onChange={(e) =>
                    setConfig({ ...config, referrerBonusSpins: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Thêm lượt quay vòng may mắn</span>
              </div>
            </div>
          </div>

          {/* Mốc Giới Thiệu (Milestones) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <span className="font-bold text-slate-900 dark:text-white text-sm block">
              Các Mốc Mở Khóa Quà Tặng (Milestones Unlocking):
            </span>
            <div className="space-y-2">
              {config.milestones.map((ms, idx) => (
                <div
                  key={ms.id}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 items-center"
                >
                  <div>
                    <span className="text-[10px] text-slate-400 block">Số bạn cần mời:</span>
                    <input
                      type="number"
                      min="1"
                      value={ms.requiredInvites}
                      onChange={(e) => {
                        const updated = [...config.milestones];
                        updated[idx].requiredInvites = Number(e.target.value) || 1;
                        setConfig({ ...config, milestones: updated });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block">Tiêu đề mốc thưởng:</span>
                    <input
                      type="text"
                      value={ms.title}
                      onChange={(e) => {
                        const updated = [...config.milestones];
                        updated[idx].title = e.target.value;
                        setConfig({ ...config, milestones: updated });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Giá trị thưởng:</span>
                    <input
                      type="text"
                      value={String(ms.rewardValue)}
                      onChange={(e) => {
                        const updated = [...config.milestones];
                        updated[idx].rewardValue = e.target.value;
                        setConfig({ ...config, milestones: updated });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Vòng Quay May Mắn (Lucky Wheel Gamification) */}
      {activeTab === 'wheel' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Dices className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Cài Đặt Vòng Quay May Mắn</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.wheelEnabled}
                  onChange={(e) => setConfig({ ...config, wheelEnabled: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Kích hoạt</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Lượt Quay Miễn Phí Mỗi Ngày:
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.dailyFreeSpins}
                  onChange={(e) => setConfig({ ...config, dailyFreeSpins: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Giá Mua Thêm Lượt Bằng Core (0 = tắt mua):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={config.costPerSpinCore}
                  onChange={(e) => setConfig({ ...config, costPerSpinCore: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Slices Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <span className="font-bold text-slate-900 dark:text-white text-sm block">
              Cấu Hình 8 Ô Quà Trên Vòng Quay:
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <th className="pb-2">Ô</th>
                    <th className="pb-2">Tên Quà</th>
                    <th className="pb-2">Loại Thưởng</th>
                    <th className="pb-2">Giá Trị</th>
                    <th className="pb-2">Màu Ô</th>
                    <th className="pb-2 text-right">Tỷ Lệ (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {config.slices.map((slice, i) => (
                    <tr key={slice.id} className="text-xs">
                      <td className="py-2.5 font-bold font-mono text-slate-400">#{i + 1}</td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={slice.label}
                          onChange={(e) => updateSlice(i, 'label', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                        />
                      </td>
                      <td className="py-2.5 pr-2">
                        <select
                          value={slice.type}
                          onChange={(e) => updateSlice(i, 'type', e.target.value)}
                          className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                        >
                          <option value="CORE">CORE (Số dư ví)</option>
                          <option value="SPIN">SPIN (Thêm lượt)</option>
                          <option value="VOUCHER">VOUCHER (Giảm giá)</option>
                          <option value="GIFTCODE">GIFTCODE (Mã VIP)</option>
                          <option value="EMPTY">EMPTY (May mắn sau)</option>
                        </select>
                      </td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={String(slice.value)}
                          onChange={(e) => updateSlice(i, 'value', isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                        />
                      </td>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={slice.color}
                            onChange={(e) => updateSlice(i, 'color', e.target.value)}
                            className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                          <span className="font-mono text-[10px] text-slate-400">{slice.color}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right pl-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={slice.probability}
                          onChange={(e) => updateSlice(i, 'probability', Number(e.target.value) || 1)}
                          className="w-16 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Điểm Danh 7 Ngày (Daily Check-in Streak) */}
      {activeTab === 'checkin' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Cài Đặt Phần Thưởng Điểm Danh 7 Ngày</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.checkInEnabled}
                onChange={(e) => setConfig({ ...config, checkInEnabled: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Kích hoạt</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {config.dailyRewards.map((reward, i) => (
              <div
                key={reward.day}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Ngày {reward.day}</span>
                  {reward.highlight && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                      JACKPOT
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Thưởng Core:</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={reward.core}
                    onChange={(e) => {
                      const updated = [...config.dailyRewards];
                      updated[i].core = Number(e.target.value) || 0;
                      setConfig({ ...config, dailyRewards: updated });
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-amber-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Lượt quay thưởng kèm:</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={reward.spins}
                    onChange={(e) => {
                      const updated = [...config.dailyRewards];
                      updated[i].spins = Number(e.target.value) || 0;
                      setConfig({ ...config, dailyRewards: updated });
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Bảng Xếp Hạng Đua Top (Leaderboard Contests) */}
      {activeTab === 'leaderboard' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Cài Đặt Đua Top Bảng Xếp Hạng</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.leaderboardEnabled}
                onChange={(e) => setConfig({ ...config, leaderboardEnabled: e.target.checked })}
                className="w-4 h-4 text-rose-600 rounded cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Kích hoạt</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tiêu Đề Bảng Xếp Hạng:
              </label>
              <input
                type="text"
                value={config.leaderboardTitle}
                onChange={(e) => setConfig({ ...config, leaderboardTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Chu Kỳ Đua Top:
              </label>
              <select
                value={config.leaderboardPeriod}
                onChange={(e) => setConfig({ ...config, leaderboardPeriod: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs"
              >
                <option value="weekly">Hàng Tuần (Weekly)</option>
                <option value="monthly">Hàng Tháng (Monthly)</option>
              </select>
            </div>
          </div>

          {/* Cơ cấu giải thưởng */}
          <div className="space-y-2 pt-2">
            <span className="font-bold text-slate-900 dark:text-white text-xs block">
              Cơ Cấu Giải Thưởng Top 1, 2, 3:
            </span>
            <div className="space-y-2">
              {config.leaderboardPrizes.map((pz, idx) => (
                <div
                  key={pz.rank}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 items-center"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Hạng #{pz.rank} ({pz.rank === 1 ? 'Quán Quân' : pz.rank === 2 ? 'Á Quân' : 'Hạng 3'})
                  </span>
                  <input
                    type="text"
                    value={pz.prize}
                    onChange={(e) => {
                      const updated = [...config.leaderboardPrizes];
                      updated[idx].prize = e.target.value;
                      setConfig({ ...config, leaderboardPrizes: updated });
                    }}
                    placeholder="Mô tả phần thưởng"
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Core:</span>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={pz.coreReward}
                      onChange={(e) => {
                        const updated = [...config.leaderboardPrizes];
                        updated[idx].coreReward = Number(e.target.value) || 0;
                        setConfig({ ...config, leaderboardPrizes: updated });
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-amber-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
