import React, { useState, useRef } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Trash2,
  Star,
  Plus,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { compressImage } from '../../../utils/imageCompressor';

interface ProductGalleryUploadProps {
  label?: string;
  images: string[];
  onChange: (images: string[]) => void;
  helperText?: string;
}

export const ProductGalleryUpload: React.FC<ProductGalleryUploadProps> = ({
  label = 'Album Ảnh Sản Phẩm (Nhiều Ảnh)',
  images,
  onChange,
  helperText = 'Ảnh đầu tiên sẽ tự động làm ảnh bìa chính. Khách hàng trên web có thể lướt xem toàn bộ album ảnh này.',
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressStatus, setCompressStatus] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle uploading multiple files from computer
  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsCompressing(true);
      setCompressStatus(`Đang nén ${files.length} ảnh...`);

      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCompressStatus(`Đang nén ảnh ${i + 1}/${files.length} (${file.name})...`);
        const result = await compressImage(file, {
          maxWidth: 1000,
          maxHeight: 1000,
          quality: 0.85,
        });
        if (result && result.dataUrl) {
          newUrls.push(result.dataUrl);
        }
      }

      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
      }
    } catch (err) {
      console.error('[ProductGalleryUpload] Error compressing images:', err);
      alert('Có lỗi khi nén ảnh. Vui lòng thử lại với ảnh khác.');
    } finally {
      setIsCompressing(false);
      setCompressStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle adding image via URL
  const handleAddUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    onChange([...images, cleanUrl]);
    setUrlInput('');
  };

  // Remove an image
  const handleRemove = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  // Set an image as primary cover (move to index 0)
  const handleSetAsCover = (index: number) => {
    if (index === 0) return;
    const updated = [...images];
    const [target] = updated.splice(index, 1);
    updated.unshift(target);
    onChange(updated);
  };

  // Move image left/right
  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {label}
          </label>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/60">
            {images.length} ảnh
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            📁 Tải từ máy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🔗 Dán link URL
          </button>
        </div>
      </div>

      {/* Hidden File Input for Multiple Files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFilesSelect}
        className="hidden"
      />

      {/* Upload Actions Area */}
      {activeTab === 'upload' ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 dark:border-indigo-800/80 dark:hover:border-indigo-600 rounded-2xl p-4 text-center cursor-pointer transition-all bg-indigo-50/20 hover:bg-indigo-50/50 dark:bg-slate-800/30 group"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shadow-xs">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                {isCompressing ? `⏳ ${compressStatus}` : 'Bấm vào đây để chọn ảnh từ máy tính (Có thể chọn nhiều ảnh)'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Hệ thống tự động nén tối ưu &lt; 40KB để trang khách tải siêu nhanh.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAddUrl} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="url"
              placeholder="Dán link ảnh trực tiếp (VD: https://images.unsplash.com/...)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full text-xs font-mono rounded-xl border border-slate-200 bg-white p-2.5 pr-8 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {urlInput && (
              <button
                type="button"
                onClick={() => setUrlInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!urlInput.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm</span>
          </button>
        </form>
      )}

      {/* Gallery Grid Display */}
      {images.length > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {images.map((imgUrl, idx) => {
              const isCover = idx === 0;

              return (
                <div
                  key={idx}
                  className={`group relative rounded-xl overflow-hidden border transition-all aspect-square bg-slate-900/40 shadow-xs ${
                    isCover
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-400'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <img
                    src={imgUrl}
                    alt={`Product image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/vite.svg';
                    }}
                  />

                  {/* Primary Cover Badge */}
                  {isCover && (
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-600/95 text-white text-[10px] font-bold shadow-md backdrop-blur-xs">
                        <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                        Ảnh bìa
                      </span>
                    </div>
                  )}

                  {/* Order Index Pill */}
                  {!isCover && (
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <span className="px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-bold backdrop-blur-xs">
                        #{idx + 1}
                      </span>
                    </div>
                  )}

                  {/* Delete Button (Always accessible) */}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="absolute top-1.5 right-1.5 z-10 p-1 rounded-md bg-rose-600/90 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer opacity-90 hover:opacity-100"
                    title="Xóa ảnh này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Hover Controls Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-1.5">
                    {/* View Full Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewImage(imgUrl)}
                      className="w-full py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold flex items-center justify-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Xem lớn</span>
                    </button>

                    {/* Action buttons row */}
                    <div className="flex items-center justify-between gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'left')}
                          className="p-1 rounded bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                          title="Di chuyển sang trái"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                      )}

                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => handleSetAsCover(idx)}
                          className="flex-1 py-1 px-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer truncate"
                          title="Đặt làm ảnh bìa chính (hiển thị đầu tiên)"
                        >
                          <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                          <span>Làm bìa</span>
                        </button>
                      )}

                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'right')}
                          className="p-1 rounded bg-white/20 hover:bg-white/30 text-white cursor-pointer ml-auto"
                          title="Di chuyển sang phải"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick "+ Thêm ảnh" slot */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 aspect-square flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/20"
              title="Chọn thêm ảnh từ máy tính"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[11px] font-bold">Thêm ảnh</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-400">
          Chưa có ảnh nào trong album. Hãy tải ảnh từ máy tính hoặc dán link ảnh bên trên.
        </div>
      )}

      {/* Helper text */}
      {helperText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          💡 {helperText}
        </p>
      )}

      {/* Full Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl p-2">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black text-white shadow-md z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
