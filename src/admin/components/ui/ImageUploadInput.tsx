import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { compressImage, CompressionResult } from '../../../utils/imageCompressor';

interface ImageUploadInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  helperText?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  label = 'Hình Ảnh / Banner (Tải từ máy hoặc dán Link)',
  value,
  onChange,
  required = false,
  helperText = 'Tự động nén ảnh siêu nhẹ (WebP/JPEG) khi tải lên từ máy tính.',
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressResult, setCompressResult] = useState<CompressionResult | null>(null);
  const [mode, setMode] = useState<'upload' | 'url'>(value && !value.startsWith('data:') ? 'url' : 'upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setCompressResult(null);

      const result = await compressImage(file, {
        maxWidth,
        maxHeight,
        quality,
      });

      setCompressResult(result);
      onChange(result.dataUrl);
    } catch (err: any) {
      console.error('Image compression error:', err);
      alert('Không thể xử lý hình ảnh này. Vui lòng thử ảnh khác.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setCompressResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
              mode === 'upload'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            📁 Tải Từ Máy
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
              mode === 'url'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🔗 Nhập Link
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!value || value === '/logo.png' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-300 dark:border-indigo-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-5 text-center cursor-pointer transition-all bg-indigo-50/30 hover:bg-indigo-50/60 dark:bg-slate-800/40 group shadow-xs"
            >
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="p-3 rounded-full bg-indigo-100/80 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 group-hover:scale-110 transition-transform shadow-xs">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {isCompressing ? '⏳ Đang nén ảnh...' : '📁 Bấm vào đây để chọn ảnh Logo từ máy tính'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hỗ trợ PNG, JPG, JPEG, WEBP — Tự động nén siêu nhẹ 0ms
                </span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-800/80 p-3.5 flex items-center gap-3 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-xs group"
              title="Nhấn vào đây để đổi ảnh khác"
            >
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                <img src={value} alt="Preview" className="h-full w-full object-contain p-1" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Ảnh Đã Tải Lên & Sẵn Sàng</span>
                </div>

                {compressResult ? (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    ⚡ {compressResult.originalSizeFormatted} → {compressResult.compressedSizeFormatted} (Giảm {compressResult.savedPercent}%)
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {value.startsWith('data:') ? 'Ảnh Base64 đã tối ưu' : value}
                  </p>
                )}

                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline mt-1 inline-flex items-center gap-1">
                  🔄 Bấm vào để chọn ảnh khác từ máy
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                title="Xóa ảnh"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/... hoặc /game_icons/..."
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 pl-9 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <LinkIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};
