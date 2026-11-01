import React, { useState } from 'react';
import { Plus, Trash2, Package, Sparkles, Layers, Check } from 'lucide-react';
import type { ProductPackageVariant } from '../../../types/game';
import { formatCore } from '../../../utils/textUtils';

interface PackageManagerSectionProps {
  packages: ProductPackageVariant[];
  onChange: (packages: ProductPackageVariant[]) => void;
}

export const PackageManagerSection: React.FC<PackageManagerSectionProps> = ({
  packages = [],
  onChange,
}) => {
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState<number>(20000);
  const [newPkgOriginalPrice, setNewPkgOriginalPrice] = useState<number>(0);
  const [newPkgNote, setNewPkgNote] = useState('Xử lý tiêu chuẩn');
  const [newPkgBadge, setNewPkgBadge] = useState('');
  const [newPkgStock, setNewPkgStock] = useState<number>(50);

  const handleAddPackage = () => {
    if (!newPkgName.trim()) return;

    const newPackage: ProductPackageVariant = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newPkgName.trim(),
      price: Math.max(0, Number(newPkgPrice) || 0),
      original_price: newPkgOriginalPrice > 0 ? Number(newPkgOriginalPrice) : undefined,
      note: newPkgNote.trim() || 'Xử lý tiêu chuẩn',
      badge: newPkgBadge.trim() || undefined,
      stock_quantity: Math.max(0, Number(newPkgStock) || 0),
      is_active: true,
    };

    onChange([...packages, newPackage]);

    // Reset inputs
    setNewPkgName('');
    setNewPkgBadge('');
  };

  const handleRemovePackage = (id: string) => {
    onChange(packages.filter((p) => p.id !== id));
  };

  const handleApplyTemplate = (type: 'duration' | 'social' | 'game') => {
    let tpl: ProductPackageVariant[] = [];
    const baseId = Date.now();

    if (type === 'duration') {
      tpl = [
        {
          id: `pkg_${baseId}_1d`,
          name: 'Gói 1 Ngày (Dùng thử)',
          price: 15000,
          original_price: 25000,
          note: 'Trải nghiệm 24h đầy đủ tính năng',
          stock_quantity: 50,
          is_active: true,
        },
        {
          id: `pkg_${baseId}_7d`,
          name: 'Gói 7 Ngày (1 Tuần)',
          price: 69000,
          original_price: 105000,
          badge: 'TIẾT KIỆM',
          note: 'Phù hợp cày sự kiện',
          stock_quantity: 50,
          is_active: true,
        },
        {
          id: `pkg_${baseId}_30d`,
          name: 'Gói 30 Ngày (1 Tháng)',
          price: 199000,
          original_price: 350000,
          badge: 'HOT BÁN CHẠY',
          note: 'Bảo hành full 30 ngày',
          stock_quantity: 100,
          is_active: true,
        },
      ];
    } else if (type === 'social') {
      tpl = [
        {
          id: `pkg_${baseId}_100`,
          name: '100 Like / Cảm xúc',
          price: 2500,
          original_price: 5000,
          note: 'Xử lý tiêu chuẩn',
          stock_quantity: 999,
          is_active: true,
        },
        {
          id: `pkg_${baseId}_500`,
          name: '500 Like / Cảm xúc',
          price: 12500,
          original_price: 25000,
          note: 'Xử lý tiêu chuẩn',
          stock_quantity: 999,
          is_active: true,
        },
        {
          id: `pkg_${baseId}_1000`,
          name: '1000 Like / Cảm xúc',
          price: 25000,
          original_price: 50000,
          badge: 'BÁN CHẠY',
          note: 'Tặng kèm view story',
          stock_quantity: 999,
          is_active: true,
        },
        {
          id: `pkg_${baseId}_50cmt`,
          name: '50 Bình luận theo yêu cầu',
          price: 25000,
          original_price: 50000,
          note: 'Nội dung tùy chỉnh tự nhiên',
          stock_quantity: 999,
          is_active: true,
        },
      ];
    } else if (type === 'game') {
      tpl = [
        {
          id: `pkg_${baseId}_pack1`,
          name: 'Gói Khởi Động (60 KNB / KC)',
          price: 20000,
          original_price: 25000,
          note: 'Giao tức thì trong 5s',
          stock_quantity: 50,
          is_active: true,
        },
        {
          id: `pkg_${baseId}_pack2`,
          name: 'Gói Tiêu Chuẩn (300+30 KNB / KC)',
          price: 99000,
          original_price: 120000,
          badge: 'PHỔ BIẾN',
          note: 'Giao tức thì trong 5s',
          stock_quantity: 50,
          is_active: true,
        },
        {
          id: `pkg_${baseId}_pass`,
          name: 'Thẻ Tháng / Battle Pass',
          price: 109000,
          original_price: 150000,
          badge: 'HOT',
          note: 'Nhận quà điểm danh mỗi ngày',
          stock_quantity: 50,
          is_active: true,
        },
      ];
    }

    onChange([...packages, ...tpl]);
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-card/60 border border-border/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-secondary/15 text-secondary">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-foreground">
              Danh Sách Gói Sản Phẩm (Packages / Tùy Chọn)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Khách hàng có thể chọn các gói khác nhau trong cùng 1 sản phẩm đại diện.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-semibold">Tạo mẫu nhanh:</span>
          <button
            type="button"
            onClick={() => handleApplyTemplate('duration')}
            className="px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground border border-border cursor-pointer transition-all active:scale-95"
          >
            + Mẫu Thời Hạn
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('social')}
            className="px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground border border-border cursor-pointer transition-all active:scale-95"
          >
            + Mẫu MXH/Buff
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('game')}
            className="px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground border border-border cursor-pointer transition-all active:scale-95"
          >
            + Mẫu Nạp Game
          </button>
        </div>
      </div>

      {/* Danh sách các gói hiện có */}
      {packages.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
          Chưa có gói tùy chọn nào. Hệ thống sẽ tự động dùng thông tin sản phẩm chính làm gói mặc định.
        </div>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
          {packages.map((pkg, idx) => (
            <div
              key={pkg.id || idx}
              className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground truncate">{pkg.name}</span>
                  {pkg.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {pkg.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span>{pkg.note || 'Xử lý tiêu chuẩn'}</span>
                  <span>•</span>
                  <span>Kho: <strong className="text-foreground font-mono">{pkg.stock_quantity ?? 'Sẵn'}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-400 block">
                    {formatCore(pkg.price)}
                  </span>
                  {pkg.original_price && pkg.original_price > pkg.price && (
                    <span className="font-mono text-[10px] text-muted-foreground line-through block">
                      {formatCore(pkg.original_price)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePackage(pkg.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer transition-all active:scale-95"
                  title="Xóa gói này"
                  aria-label="Xóa gói"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form thêm gói mới nhanh */}
      <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
        <div className="sm:col-span-4">
          <input
            type="text"
            value={newPkgName}
            onChange={(e) => setNewPkgName(e.target.value)}
            placeholder="Tên gói (ví dụ: 1000 Like, VIP 30 Ngày)"
            className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </div>

        <div className="sm:col-span-2">
          <input
            type="number"
            value={newPkgPrice || ''}
            onChange={(e) => setNewPkgPrice(Number(e.target.value))}
            placeholder="Giá bán"
            className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </div>

        <div className="sm:col-span-2">
          <input
            type="number"
            value={newPkgOriginalPrice || ''}
            onChange={(e) => setNewPkgOriginalPrice(Number(e.target.value))}
            placeholder="Giá gốc"
            className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </div>

        <div className="sm:col-span-2">
          <input
            type="text"
            value={newPkgNote}
            onChange={(e) => setNewPkgNote(e.target.value)}
            placeholder="Ghi chú (Xử lý tiêu chuẩn)"
            className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={handleAddPackage}
            disabled={!newPkgName.trim()}
            className="w-full h-full py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Gói</span>
          </button>
        </div>
      </div>
    </div>
  );
};
