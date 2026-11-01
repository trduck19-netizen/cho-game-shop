import React, { useState, useEffect } from 'react';
import {
  Dices,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCw,
  Coins,
  Gift,
  Boxes,
  HelpCircle,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  X,
  ListPlus,
  Percent,
  Trophy,
} from 'lucide-react';
import { growthService, DEFAULT_WHEEL_SLICES } from '../../services/growthService';
import type { WheelSlice, GrowthConfig } from '../../types/growth';

interface LuckyWheelAdminManagerProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  contextTitle?: string;
}

export const LuckyWheelAdminManager: React.FC<LuckyWheelAdminManagerProps> = ({
  onShowToast,
  contextTitle = 'Phát Code & Giveaway',
}) => {
  const [config, setConfig] = useState<GrowthConfig>(() => growthService.getConfig());
  const [isSaving, setIsSaving] = useState(false);

  // Modal quản lý danh sách mã cho từng ô GIFTCODE
  const [editingSliceCodesIdx, setEditingSliceCodesIdx] = useState<number | null>(null);
  const [bulkCodesInput, setBulkCodesInput] = useState('');
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  useEffect(() => {
    const handleConfigUpdate = (e?: any) => {
      const cfg = e?.detail || growthService.getConfig();
      if (cfg) setConfig(cfg);
    };
    window.addEventListener('wcg_growth_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('wcg_growth_config_updated', handleConfigUpdate);
  }, []);

  const slices: WheelSlice[] = config.slices && config.slices.length === 8 ? config.slices : DEFAULT_WHEEL_SLICES;

  const updateSlice = (index: number, field: keyof WheelSlice, value: any) => {
    const nextSlices = [...slices];
    nextSlices[index] = { ...nextSlices[index], [field]: value };
    setConfig({ ...config, slices: nextSlices });
  };

  // Tính tổng tỷ lệ phần trăm
  const totalProbability = slices.reduce((sum, s) => sum + (Number(s.probability) || 0), 0);

  // Tự động cân bằng tỷ lệ về 100%
  const handleAutoBalance = () => {
    const nextSlices = slices.map((s) => ({
      ...s,
      probability: 12.5, // 100 / 8 = 12.5%
    }));
    // Làm tròn cho đẹp: 6 ô 12%, 2 ô 14%
    const rounded = [15, 15, 15, 15, 10, 10, 10, 10];
    const balanced = nextSlices.map((s, i) => ({ ...s, probability: rounded[i] }));
    setConfig({ ...config, slices: balanced });
    onShowToast('Đã cân bằng tỷ lệ', 'Tất cả 8 ô quà đã được thiết lập tổng bằng 100%.', 'info');
  };

  // Lưu toàn bộ cấu hình Vòng Quay
  const handleSaveConfig = () => {
    setIsSaving(true);
    try {
      const saved = growthService.saveConfig({
        wheelEnabled: config.wheelEnabled,
        dailyFreeSpins: config.dailyFreeSpins,
        costPerSpinCore: config.costPerSpinCore,
        slices,
      });
      setConfig(saved);
      onShowToast('Thành công', 'Đã lưu cấu hình Vòng Quay May Mắn thành công!', 'success');
    } catch (err: any) {
      onShowToast('Lỗi lưu cấu hình', err?.message || 'Không thể lưu', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Mở modal quản lý mã cho ô GIFTCODE
  const handleOpenCodesModal = (idx: number) => {
    setEditingSliceCodesIdx(idx);
    setBulkCodesInput('');
  };

  // Nạp thêm danh sách mã vào ô GIFTCODE
  const handleAddBulkCodes = () => {
    if (editingSliceCodesIdx === null) return;
    const lines = bulkCodesInput
      .split(/[\r\n,;]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (lines.length === 0) {
      onShowToast('Chưa có mã', 'Vui lòng nhập ít nhất 1 mã code.', 'error');
      return;
    }

    const nextSlices = [...slices];
    const currentSlice = nextSlices[editingSliceCodesIdx];
    const existingList = Array.isArray(currentSlice.codesList) ? currentSlice.codesList : [];
    const mergedList = Array.from(new Set([...existingList, ...lines]));

    currentSlice.codesList = mergedList;
    currentSlice.remainingCodesCount = mergedList.length;
    currentSlice.totalCodesCount = (currentSlice.totalCodesCount || 0) + lines.length;

    setConfig({ ...config, slices: nextSlices });
    growthService.saveConfig({ slices: nextSlices });

    setBulkCodesInput('');
    onShowToast('Đã nạp mã', `Đã thêm thành công ${lines.length} mã vào ô "${currentSlice.label}".`, 'success');
  };

  // Xóa 1 mã khỏi kho
  const handleDeleteCodeFromSlice = (codeIndex: number) => {
    if (editingSliceCodesIdx === null) return;
    const nextSlices = [...slices];
    const currentSlice = nextSlices[editingSliceCodesIdx];
    if (!Array.isArray(currentSlice.codesList)) return;

    currentSlice.codesList.splice(codeIndex, 1);
    currentSlice.remainingCodesCount = currentSlice.codesList.length;

    setConfig({ ...config, slices: nextSlices });
    growthService.saveConfig({ slices: nextSlices });
  };

  // Xóa toàn bộ mã trong ô
  const handleClearAllCodesFromSlice = () => {
    if (editingSliceCodesIdx === null) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách mã trong ô này?')) return;

    const nextSlices = [...slices];
    const currentSlice = nextSlices[editingSliceCodesIdx];
    currentSlice.codesList = [];
    currentSlice.remainingCodesCount = 0;

    setConfig({ ...config, slices: nextSlices });
    growthService.saveConfig({ slices: nextSlices });
    onShowToast('Đã xóa', 'Đã làm trống danh sách mã.', 'info');
  };

  const activeSliceForModal = editingSliceCodesIdx !== null ? slices[editingSliceCodesIdx] : null;

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Dices className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Cấu Hình Vòng Quay May Mắn (Lucky Wheel)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Quản lý tỷ lệ trúng thưởng, giá mỗi lượt quay, nạp danh sách mã giftcode cho từng ô và tùy biến phần thưởng trên cả trang {contextTitle}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveConfig}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Vòng Quay'}</span>
            </button>
          </div>
        </div>

        {/* Global Settings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Setting 1: Enable Toggle */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Trạng Thái Vòng Quay</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.wheelEnabled}
                  onChange={(e) => setConfig({ ...config, wheelEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {config.wheelEnabled ? 'Đang bật hiển thị trên Web Khách' : 'Đang tạm đóng / bảo trì'}
            </p>
          </div>

          {/* Setting 2: Daily Free Spins */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              Lượt Quay Miễn Phí Mỗi Ngày:
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={config.dailyFreeSpins}
              onChange={(e) => setConfig({ ...config, dailyFreeSpins: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono text-sm font-bold text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-500">Mỗi tài khoản được nhận N lượt/ngày</p>
          </div>

          {/* Setting 3: Cost per Spin */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              Giá Mỗi Lượt Quay (Core / VNĐ):
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={config.costPerSpinCore}
              onChange={(e) => setConfig({ ...config, costPerSpinCore: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono text-sm font-bold text-slate-900 dark:text-white"
            />
            <p className="text-[10px] text-slate-500">Trừ vào số dư ví của khách (0 = Miễn phí)</p>
          </div>
        </div>
      </div>

      {/* 2. Slices Configuration Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Thiết Lập 8 Ô Phần Thưởng & Tỉ Lệ Trúng</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Điều chỉnh tên phần thưởng, loại thưởng, danh sách mã giftcode nạp sẵn và màu sắc từng ô.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                Math.round(totalProbability) === 100
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Tổng Tỉ Lệ: {totalProbability}%</span>
              {Math.round(totalProbability) === 100 ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
            </div>

            <button
              type="button"
              onClick={handleAutoBalance}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cân bằng 100%
            </button>
          </div>
        </div>

        {/* Table of 8 Slices */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-2">Ô</th>
                <th className="py-2.5 px-2">Tên Phần Thưởng</th>
                <th className="py-2.5 px-2">Loại Thưởng</th>
                <th className="py-2.5 px-2">Giá Trị / Kho Mã</th>
                <th className="py-2.5 px-2">Màu Ô</th>
                <th className="py-2.5 px-2 text-right">Tỉ Lệ (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {slices.map((slice, i) => (
                <tr key={slice.id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  {/* Col 1: Index */}
                  <td className="py-3 px-2 font-mono font-bold text-slate-400 text-xs">#{i + 1}</td>

                  {/* Col 2: Label & Sublabel */}
                  <td className="py-3 px-2">
                    <input
                      type="text"
                      value={slice.label}
                      onChange={(e) => updateSlice(i, 'label', e.target.value)}
                      placeholder="Tên phần thưởng"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={slice.sublabel || ''}
                      onChange={(e) => updateSlice(i, 'sublabel', e.target.value)}
                      placeholder="Mô tả phụ (tùy chọn)"
                      className="w-full px-2.5 py-1 mt-1 rounded-lg bg-slate-50/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[10px] text-slate-500"
                    />
                  </td>

                  {/* Col 3: Type */}
                  <td className="py-3 px-2">
                    <select
                      value={slice.type}
                      onChange={(e) => updateSlice(i, 'type', e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="GIFTCODE">🎁 GIFTCODE (Mã Quà)</option>
                      <option value="CORE">💰 CORE (Thưởng Ví Số Dư)</option>
                      <option value="SPIN">🎲 SPIN (Thêm Lượt Quay)</option>
                      <option value="VOUCHER">🎟️ VOUCHER (Giảm Giá)</option>
                      <option value="ITEM">📦 ITEM (Vật Phẩm Game)</option>
                      <option value="EMPTY">❌ EMPTY (Chúc May Mắn)</option>
                    </select>
                  </td>

                  {/* Col 4: Value / Codes List */}
                  <td className="py-3 px-2">
                    {slice.type === 'GIFTCODE' ? (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCodesModal(i)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>Kho mã: Còn {slice.codesList?.length ?? 0} mã</span>
                        </button>
                        <input
                          type="text"
                          value={slice.codeContent || ''}
                          onChange={(e) => updateSlice(i, 'codeContent', e.target.value)}
                          placeholder="Mã cố định (nếu kho hết)"
                          className="w-full px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-400"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={String(slice.value ?? '')}
                        onChange={(e) =>
                          updateSlice(
                            i,
                            'value',
                            isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)
                          )
                        }
                        placeholder={slice.type === 'CORE' ? 'Số tiền (vd: 20000)' : 'Giá trị'}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    )}
                  </td>

                  {/* Col 5: Color */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={slice.color}
                        onChange={(e) => updateSlice(i, 'color', e.target.value)}
                        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">{slice.color}</span>
                    </div>
                  </td>

                  {/* Col 6: Probability */}
                  <td className="py-3 px-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={slice.probability}
                        onChange={(e) => updateSlice(i, 'probability', Math.max(0, Number(e.target.value) || 0))}
                        className="w-16 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-right text-amber-600 dark:text-amber-400"
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Modal Quản Lý Danh Sách Mã Cho Ô GIFTCODE */}
      {editingSliceCodesIdx !== null && activeSliceForModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setEditingSliceCodesIdx(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-purple-500" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Kho Mã: Ô #{editingSliceCodesIdx + 1} — {activeSliceForModal.label}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Mỗi lần người dùng quay trúng ô này, hệ thống sẽ tự động bốc 1 mã từ kho phát cho khách.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSliceCodesIdx(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bulk Import Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Nạp Thêm Danh Sách Mã Mới (Mỗi dòng 1 mã):
              </label>
              <textarea
                rows={4}
                value={bulkCodesInput}
                onChange={(e) => setBulkCodesInput(e.target.value)}
                placeholder="VIP999-XXXX&#10;VIP999-YYYY&#10;VIP999-ZZZZ"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleAddBulkCodes}
                className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nạp Mã Vào Kho Ô #{editingSliceCodesIdx + 1}</span>
              </button>
            </div>

            {/* Current Codes List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">
                  Mã Còn Lại Trong Kho ({activeSliceForModal.codesList?.length ?? 0} mã):
                </span>
                {activeSliceForModal.codesList && activeSliceForModal.codesList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllCodesFromSlice}
                    className="text-[11px] text-rose-500 hover:text-rose-400 cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {activeSliceForModal.codesList && activeSliceForModal.codesList.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                  {activeSliceForModal.codesList.map((code, cIdx) => (
                    <div
                      key={`${code}_${cIdx}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60"
                    >
                      <span className="text-slate-800 dark:text-amber-300 truncate font-semibold">{code}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCodeFromSlice(cIdx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                        title="Xóa mã này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Kho mã hiện đang trống. Hãy dán danh sách mã vào khung phía trên để nạp thêm nhé!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setEditingSliceCodesIdx(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Hoàn Tất & Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
