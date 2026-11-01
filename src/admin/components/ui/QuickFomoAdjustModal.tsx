import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  RotateCcw,
  Flame,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Boxes,
  Zap,
} from 'lucide-react';
import { FormModal } from './FormModal';
import { marketingService } from '../../../services/marketingService';
import { adminDataService } from '../../services/adminDataService';
import { ProductPriority } from '../../../types/marketing';

export interface QuickFomoAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'giveaway' | 'utility' | 'store_product';
  itemId: string;
  itemTitle: string;
  gameName?: string;
  realStock: number;
  realSoldOrClaimed: number;
  onSuccess?: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const QuickFomoAdjustModal: React.FC<QuickFomoAdjustModalProps> = ({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemTitle,
  gameName,
  realStock,
  realSoldOrClaimed,
  onSuccess,
  onShowToast,
}) => {
  const isGiveaway = itemType === 'giveaway';
  const labelSoldOrClaimed = isGiveaway ? 'Đã giật' : 'Đã bán';
  const labelStock = isGiveaway ? 'Mã còn lại' : 'Tồn kho';

  // Live web current stats
  const [currentWebStock, setCurrentWebStock] = useState(0);
  const [currentWebSold, setCurrentWebSold] = useState(0);

  // Form inputs
  const [targetSoldOrClaimed, setTargetSoldOrClaimed] = useState(0);
  const [bonusStock, setBonusStock] = useState(0);
  const [priority, setPriority] = useState<ProductPriority>('normal');
  const [isVirtualActive, setIsVirtualActive] = useState<boolean>(true);
  const [showSoldOrClaimed, setShowSoldOrClaimed] = useState<boolean>(true);
  const [showStockCount, setShowStockCount] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !itemId) return;

    const pw = marketingService.getProductConfig(itemId);
    const webStock = marketingService.getDisplayStock(itemId, realStock);
    const webSold = isGiveaway
      ? marketingService.getClaimedDisplay({ id: itemId, claimed_codes: realSoldOrClaimed })
      : marketingService.getSoldDisplay({ id: itemId, sold_count: realSoldOrClaimed });

    setCurrentWebStock(webStock);
    setCurrentWebSold(webSold);

    setTargetSoldOrClaimed(webSold);
    setBonusStock(Number(pw.virtualStockBonus) || 0);
    setPriority(pw.priority || 'normal');

    const hasVirtual = pw.priority !== 'off' || Number(pw.virtualStockBonus) > 0 || webSold > realSoldOrClaimed || webStock > realStock;
    setIsVirtualActive(hasVirtual);

    // Load granular visibility settings from adminDataService
    if (isGiveaway) {
      const gw = adminDataService.getGiveaways().find((g) => g.id === itemId);
      setShowSoldOrClaimed(gw ? gw.show_claimed_count !== false : true);
      setShowStockCount(gw ? (gw as any).show_remaining_count !== false : true);
    } else if (itemType === 'utility') {
      const util = adminDataService.getUtilities().find((u) => u.id === itemId);
      setShowSoldOrClaimed(util ? util.show_sold_count !== false : true);
      setShowStockCount(util ? (util as any).show_stock_count !== false : true);
    } else {
      const prod = adminDataService.getStoreProducts().find((p) => p.id === itemId);
      setShowSoldOrClaimed(prod ? prod.show_sold_count !== false : true);
      setShowStockCount(prod ? (prod as any).show_stock_count !== false : true);
    }
  }, [isOpen, itemId, itemType, realStock, realSoldOrClaimed, isGiveaway]);

  const handleApply = async () => {
    if (!itemId) return;
    setIsSubmitting(true);
    try {
      const sanitizedTargetSold = isVirtualActive ? Math.max(0, Number(targetSoldOrClaimed) || 0) : realSoldOrClaimed;
      const sanitizedBonusStock = isVirtualActive ? Math.max(0, Number(bonusStock) || 0) : 0;
      const effectivePriority = isVirtualActive ? priority : 'off';
      const nowIso = new Date().toISOString();

      // Kiểm tra xem Admin có thực sự chủ động sửa số đã bán / đã nhận hay không:
      // 1. Nếu tắt số ảo: đưa về số thật và cần forceReset.
      // 2. Nếu bật số ảo: chỉ coi là có sửa khi giá trị nhập khác với số hiển thị hiện tại trên Web.
      const isSoldExplicitlyEdited = !isVirtualActive || Math.abs(Number(targetSoldOrClaimed) - currentWebSold) > 0;

      // 1. Cập nhật marketingService (ngay lập tức tác động lên UI và Client Maps)
      await marketingService.updateItemVirtualSettings(itemId, {
        targetDisplaySoldOrClaimed: sanitizedTargetSold,
        virtualStockBonus: sanitizedBonusStock,
        priority: effectivePriority,
        forceReset: isSoldExplicitlyEdited,
        fomoAnchorTime: isSoldExplicitlyEdited ? nowIso : undefined,
      });

      // 2. Cập nhật đồng thời vào adminDataService để tránh bất kỳ sự phục hồi (revert bug) nào
      if (isGiveaway) {
        const gw = adminDataService.getGiveaways().find((g) => g.id === itemId);
        if (gw) {
          const realClaimed = Number(gw.claimed_codes) || 0;
          const virtualOffset = isVirtualActive
            ? Math.max(0, sanitizedTargetSold - realClaimed)
            : 0;
          adminDataService.saveGiveawayItem({
            ...gw,
            virtual_claimed_offset: virtualOffset,
            fomo_anchor_time: isSoldExplicitlyEdited ? nowIso : (gw.fomo_anchor_time || nowIso),
            virtual_claimed_updated_at: isSoldExplicitlyEdited ? nowIso : (gw.virtual_claimed_updated_at || nowIso),
            show_claimed_count: showSoldOrClaimed,
            show_remaining_count: showStockCount,
          });
        }
      } else if (itemType === 'utility') {
        const util = adminDataService.getUtilities().find((u) => u.id === itemId);
        if (util) {
          const realSold = Number(util.sold_count) || 0;
          const virtualSold = isVirtualActive
            ? Math.max(0, sanitizedTargetSold - realSold)
            : 0;
          adminDataService.saveUtilityItem({
            ...util,
            virtual_sold_count: virtualSold,
            fomo_anchor_time: isSoldExplicitlyEdited ? nowIso : (util.fomo_anchor_time || nowIso),
            virtual_sold_updated_at: isSoldExplicitlyEdited ? nowIso : (util.virtual_sold_updated_at || nowIso),
            show_sold_count: showSoldOrClaimed,
            show_stock_count: showStockCount,
          });
        }
      } else {
        const prod = adminDataService.getStoreProducts().find((p) => p.id === itemId);
        if (prod) {
          const realSold = Number(prod.sold_count) || 0;
          const virtualSold = isVirtualActive
            ? Math.max(0, sanitizedTargetSold - realSold)
            : 0;
          adminDataService.saveStoreProductItem({
            ...prod,
            virtual_sold_count: virtualSold,
            fomo_anchor_time: isSoldExplicitlyEdited ? nowIso : (prod.fomo_anchor_time || nowIso),
            virtual_sold_updated_at: isSoldExplicitlyEdited ? nowIso : (prod.virtual_sold_updated_at || nowIso),
            show_sold_count: showSoldOrClaimed,
            show_stock_count: showStockCount,
          });
        }
      }

      // 3. Đồng bộ KV lên Cloudflare Pages Functions
      await adminDataService.pushFullStateToKV(true);

      onShowToast(
        'Đã cập nhật số ảo & hiển thị thành công!',
        isVirtualActive
          ? `Đã bật số ảo ngoài Web: ${labelSoldOrClaimed}: ${sanitizedTargetSold} | ${labelStock}: ${realStock <= 0 ? 0 : realStock + sanitizedBonusStock} (${showSoldOrClaimed ? 'Hiện' : 'Ẩn'} ${labelSoldOrClaimed}, ${showStockCount ? 'Hiện' : 'Ẩn'} ${labelStock}).`
          : `Đã đưa về số thật 100%: ${labelSoldOrClaimed}: ${realSoldOrClaimed} | ${labelStock}: ${realStock}.`,
        'success'
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast('Lỗi cập nhật số ảo', err?.message || 'Không thể lưu cấu hình số ảo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToReal = () => {
    setIsVirtualActive(false);
    setTargetSoldOrClaimed(realSoldOrClaimed);
    setBonusStock(0);
    setPriority('off');
  };

  const handlePresetGentle = () => {
    setIsVirtualActive(true);
    setTargetSoldOrClaimed(Math.max(25, realSoldOrClaimed + 25));
    setBonusStock(realStock > 0 ? 10 : 0);
    setPriority('normal');
  };

  const handlePresetVibrant = () => {
    setIsVirtualActive(true);
    setTargetSoldOrClaimed(Math.max(60, realSoldOrClaimed + 60));
    setBonusStock(realStock > 0 ? 20 : 0);
    setPriority('high');
  };

  if (!isOpen) return null;

  const estimatedDisplayStock = realStock <= 0 ? 0 : realStock + bonusStock;
  const stockDiff = estimatedDisplayStock - realStock;
  const soldDiff = targetSoldOrClaimed - realSoldOrClaimed;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="⚡ Điều Chỉnh Số Ảo Hiển Thị Ngoài Web"
      subtitle={`${isGiveaway ? 'Sự Kiện Giveaway' : 'Sản Phẩm'} • ${itemTitle}${gameName ? ` (${gameName})` : ''}`}
      maxWidth="lg"
    >
      <div className="space-y-3.5 py-1">
        {/* SIDE-BY-SIDE STATS COMPARISON */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Real Warehouse Data */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <Boxes className="w-3.5 h-3.5 text-emerald-500" />
              <span>DỮ LIỆU THẬT (DATABASE)</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Kho thật còn:</span>
                <strong className={`font-bold ${realStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {realStock} mã
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Thực tế {labelSoldOrClaimed.toLowerCase()}:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {realSoldOrClaimed} lượt
                </strong>
              </div>
            </div>
          </div>

          {/* Current Live Web Display */}
          <div className="p-2.5 rounded-xl bg-purple-500/10 dark:bg-purple-950/30 border border-purple-500/30">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 mb-1.5">
              <Eye className="w-3.5 h-3.5 text-purple-500" />
              <span>ĐANG HIỂN THỊ NGOÀI WEB</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Web hiện còn:</span>
                <strong className="text-purple-600 dark:text-purple-400 font-bold">
                  {currentWebStock} mã
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Web hiện {labelSoldOrClaimed.toLowerCase()}:</span>
                <strong className="text-amber-500 font-bold">
                  {currentWebSold} lượt
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* TÙY CHỌN ẨN / HIỆN ĐỘC LẬP TỪNG MỤC NGOÀI WEB KHÁCH */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <Eye className="w-4 h-4 text-indigo-500" />
            <span>TÙY CHỌN HIỂN THỊ NGOÀI WEB KHÁCH</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Toggle 1: Ẩn/Hiện Mục Đã Giật / Đã Bán */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs">
              <div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Mục {labelSoldOrClaimed}:</span>
                </span>
                <p className="text-[10px] text-slate-500">
                  {showSoldOrClaimed ? 'Khách thấy số đã giật/bán' : 'Ẩn khỏi web khách'}
                </p>
              </div>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSoldOrClaimed(true)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    showSoldOrClaimed
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Hiện</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSoldOrClaimed(false)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    !showSoldOrClaimed
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Ẩn</span>
                </button>
              </div>
            </div>

            {/* Toggle 2: Ẩn/Hiện Mục Hàng Còn / Mã Còn Lại */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs">
              <div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Boxes className="w-3 h-3 text-emerald-500" />
                  <span>Mục {labelStock}:</span>
                </span>
                <p className="text-[10px] text-slate-500">
                  {showStockCount ? 'Khách thấy số lượng còn' : 'Ẩn khỏi web khách'}
                </p>
              </div>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowStockCount(true)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    showStockCount
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Hiện</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStockCount(false)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    !showStockCount
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Ẩn</span>
                </button>
              </div>
            </div>
          </div>

          {/* Toggle 3: Bật / Tắt Số Ảo FOMO */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            isVirtualActive
              ? 'bg-purple-500/10 dark:bg-purple-950/40 border-purple-500/30'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  {isVirtualActive ? <Sparkles className="w-3.5 h-3.5 text-purple-500" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                  <span>TẦNG SỐ ẢO FOMO (TĂNG TRƯỞNG & ĐỘN KHO)</span>
                </span>
                <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {isVirtualActive
                    ? 'Đang BẬT số ảo. Cho phép điều chỉnh mốc mong muốn bên dưới.'
                    : `Đang ẨN số ảo (về thật 100%): Kho ${realStock} mã, ${realSoldOrClaimed} ${labelSoldOrClaimed.toLowerCase()}.`}
                </p>
              </div>
              <div className="inline-flex items-center p-0.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVirtualActive(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isVirtualActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bật Số Ảo</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToReal}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    !isVirtualActive
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Về Thật 100%</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 1-CLICK QUICK PRESET BUTTONS (CHỈ HIỂN THỊ KHI BẬT SỐ ẢO) */}
        {isVirtualActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Mẫu nhanh:</span>
            <button
              type="button"
              onClick={handleResetToReal}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all border border-slate-300 dark:border-slate-700 active:scale-95"
              title="Đưa toàn bộ số liệu về đúng 100% kho thật"
            >
              <RotateCcw className="w-3 h-3 text-rose-500" />
              <span>Về Thật 100%</span>
            </button>
            <button
              type="button"
              onClick={handlePresetGentle}
              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all border border-amber-500/30 active:scale-95"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>FOMO Nhẹ (+25)</span>
            </button>
            <button
              type="button"
              onClick={handlePresetVibrant}
              className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all border border-purple-500/30 active:scale-95"
            >
              <Flame className="w-3 h-3 text-purple-500" />
              <span>FOMO Đậm (+60)</span>
            </button>
          </div>
        )}

        {/* INPUT CONTROLS */}
        {isVirtualActive ? (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Target Sold / Claimed Count */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Số {labelSoldOrClaimed} hiển thị ngoài Web:</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                Thật: {realSoldOrClaimed} {soldDiff !== 0 && `(Ảo: ${soldDiff > 0 ? `+${soldDiff}` : soldDiff})`}
              </span>
            </div>
            <input
              type="number"
              min="0"
              max="999999"
              value={targetSoldOrClaimed}
              onChange={(e) => setTargetSoldOrClaimed(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-foreground font-mono text-xs focus:border-purple-500 focus:outline-none"
              placeholder={`Nhập số ${labelSoldOrClaimed.toLowerCase()} mong muốn`}
            />
            <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px]">
              <span className="text-slate-400">Gợi ý mốc:</span>
              <button
                type="button"
                onClick={() => setTargetSoldOrClaimed(realSoldOrClaimed)}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
              >
                {realSoldOrClaimed} (Bằng thật)
              </button>
              <button
                type="button"
                onClick={() => setTargetSoldOrClaimed((prev) => prev + 10)}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => setTargetSoldOrClaimed((prev) => prev + 50)}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
              >
                +50
              </button>
              <button
                type="button"
                onClick={() => setTargetSoldOrClaimed((prev) => prev + 100)}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
              >
                +100
              </button>
            </div>
          </div>

          {/* Virtual Stock Bonus */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-teal-500" />
                <span>Cộng thêm tồn kho (+ Bonus ảo):</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                Web hiện: {estimatedDisplayStock} mã {stockDiff > 0 && `(+${stockDiff} ảo)`}
              </span>
            </div>
            <input
              type="number"
              min="0"
              max="500"
              value={bonusStock}
              onChange={(e) => setBonusStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-foreground font-mono text-xs focus:border-purple-500 focus:outline-none"
              placeholder="0 (đúng kho thật) hoặc số lượng muốn cộng thêm"
            />
            {realStock <= 0 ? (
              <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Kho thật đang = 0: Ngoài Web luôn hiển thị HẾT HÀNG (0).</span>
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px]">
                <span className="text-slate-400">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => setBonusStock(0)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono cursor-pointer font-bold"
                >
                  +0 (Bằng kho thật)
                </button>
                <button
                  type="button"
                  onClick={() => setBonusStock(10)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setBonusStock(20)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
                >
                  +20
                </button>
                <button
                  type="button"
                  onClick={() => setBonusStock(50)}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
                >
                  +50
                </button>
              </div>
            )}
          </div>

          {/* Priority / Auto Increment Mode */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Chế độ tăng trưởng ảo theo giờ:</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ProductPriority)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-foreground text-xs font-bold focus:border-purple-500 focus:outline-none cursor-pointer"
            >
              <option value="normal">⚡ Bình thường (Tự tăng nhẹ theo giờ)</option>
              <option value="high">🔥 Ưu tiên cao (Sôi động, nổ thông báo toast nhiều)</option>
              <option value="low">💤 Thấp (Tăng rất chậm)</option>
              <option value="off">⛔ Tắt tự tăng (Cố định chính xác số lượng đã nhập)</option>
            </select>
          </div>
        </div>
      ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-2">
            <div className="inline-flex p-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Đang ẨN toàn bộ số ảo — Hiển thị chuẩn 100% kho thật ngoài Web
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Web khách sẽ chỉ hiển thị chính xác số mã còn trong kho ({realStock} mã) và số lượt thực tế ({realSoldOrClaimed} {labelSoldOrClaimed.toLowerCase()}), không tự tăng thêm.
            </p>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Đang đồng bộ...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Áp Dụng & Đồng Bộ Tức Thì</span>
              </>
            )}
          </button>
        </div>
      </div>
    </FormModal>
  );
};
