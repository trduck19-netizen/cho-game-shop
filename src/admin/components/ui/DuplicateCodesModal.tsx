import React, { useState } from 'react';
import { AlertTriangle, X, Check, Copy, Layers, ShieldAlert } from 'lucide-react';

export interface DuplicateCodeItem {
  code: string;
  serial?: string;
  reason: 'ALREADY_IN_INVENTORY' | 'DUPLICATE_IN_INPUT';
  reasonText: string;
}

export interface DuplicateCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmAll: () => void;
  onConfirmUniqueOnly?: () => void;
  productTitle?: string;
  totalInputCount: number;
  duplicates: DuplicateCodeItem[];
  newCount: number;
}

export const DuplicateCodesModal: React.FC<DuplicateCodesModalProps> = ({
  isOpen,
  onClose,
  onConfirmAll,
  onConfirmUniqueOnly,
  productTitle = 'Sản phẩm',
  totalInputCount,
  duplicates,
  newCount,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyDuplicates = () => {
    const text = duplicates.map((d) => (d.serial ? `${d.code} | ${d.serial}` : d.code)).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative my-8 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-white shadow-2xl dark:border-amber-500/30 dark:bg-slate-900 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-amber-100 bg-amber-50/60 px-6 py-4 dark:border-amber-950/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cảnh Báo Phát Hiện Mã Trùng Lặp
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Gói:{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {productTitle}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-800 dark:bg-slate-800/50">
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tổng mã nhập
              </span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {totalInputCount}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-center dark:border-emerald-950 dark:bg-emerald-950/30">
              <span className="block text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Mã mới hợp lệ
              </span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {newCount}
              </span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-center dark:border-amber-950 dark:bg-amber-950/30">
              <span className="block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Mã bị trùng
              </span>
              <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                {duplicates.length}
              </span>
            </div>
          </div>

          {/* List of Duplicate Codes */}
          <div>
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                Danh sách chi tiết {duplicates.length} mã bị trùng lặp:
              </span>
              <button
                type="button"
                onClick={handleCopyDuplicates}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép mã trùng'}</span>
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/50">
              {duplicates.map((dup, idx) => (
                <div
                  key={`${dup.code}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 break-all select-all">
                      {dup.code}
                    </span>
                    {dup.serial && (
                      <span className="block font-mono text-[10px] text-slate-400">
                        Serial/Ghi chú: {dup.serial}
                      </span>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      dup.reason === 'ALREADY_IN_INVENTORY'
                        ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60'
                        : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60'
                    }`}
                  >
                    {dup.reasonText}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Question Prompt Callout */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
              Bạn có muốn tiếp tục đăng/nạp những mã này vào kho không?
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-400/90">
              • Nếu chọn <strong>"Có, tiếp tục đăng tất cả"</strong>: Hệ thống sẽ nạp toàn bộ{' '}
              {totalInputCount} mã (bao gồm cả {duplicates.length} mã trùng) vào kho và cập nhật số tồn kho bình thường.
              <br />
              {newCount > 0 && (
                <>
                  • Nếu chọn <strong>"Chỉ đăng {newCount} mã mới"</strong>: Hệ thống sẽ bỏ qua{' '}
                  {duplicates.length} mã trùng và chỉ nạp các mã mới chưa từng có trong kho.
                  <br />
                </>
              )}
              • Nếu chọn <strong>"Hủy & Sửa lại"</strong>: Quay lại để chỉnh sửa danh sách mã vừa dán.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            Hủy & Sửa lại
          </button>

          {newCount > 0 && onConfirmUniqueOnly && (
            <button
              type="button"
              onClick={onConfirmUniqueOnly}
              className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 cursor-pointer"
            >
              Chỉ đăng {newCount} mã mới
            </button>
          )}

          <button
            type="button"
            onClick={onConfirmAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 cursor-pointer transition-all"
          >
            <Check className="h-4 w-4" />
            <span>Có, tiếp tục đăng tất cả ({totalInputCount} mã)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
