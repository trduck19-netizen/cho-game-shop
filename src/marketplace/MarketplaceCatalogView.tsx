import React, { useEffect, useMemo, useState } from 'react';
import { Filter, RefreshCw, Search } from 'lucide-react';
import type { MarketplaceProduct, ProductFilterState } from './types';
import { EMPTY_PRODUCT_FILTERS } from './types';
import { listMarketplaceProducts } from './marketplaceApi';
import { searchFilterSortProducts } from './filterProducts';
import { MarketplaceProductCard } from './MarketplaceProductCard';

// Trang danh sách sàn: tìm kiếm + lọc + sắp xếp.
// Học từ cách làm chung của các sàn mã số: người mua so sánh nhiều gian
// hàng bán cùng một loại mã, nên bộ lọc phải có: tìm theo tên, lọc theo
// game, khoảng giá, chỉ hiện còn hàng, và sắp xếp theo giá / bán chạy /
// giảm nhiều nhất. Khác đi cho phù hợp sàn mã số: không có lọc theo nền
// tảng hay khu vực kích hoạt, vì API sản phẩm hiện không có hai trường đó
// — thêm lọc đó khi API có trường mới, không bịa giá trị lọc.
export const MarketplaceCatalogView: React.FC<{
  initialGameSlug?: string;
  onOpenProduct: (product: MarketplaceProduct) => void;
  onOpenShop?: (sellerId: string) => void;
}> = ({ initialGameSlug, onOpenProduct, onOpenShop }) => {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ProductFilterState>({
    ...EMPTY_PRODUCT_FILTERS,
    gameSlug: initialGameSlug || '',
  });

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const rows = await listMarketplaceProducts({ limit: 50 });
      setProducts(rows);
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách sản phẩm sàn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gameOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p.game_slug) map.set(p.game_slug, p.game_name || p.game_slug);
    }
    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [products]);

  const visible = useMemo(() => searchFilterSortProducts(products, filters), [products, filters]);

  const setFilter = (patch: Partial<ProductFilterState>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Chợ mã game</h1>
      <p className="mt-1 text-sm text-gray-600">
        Mã dùng một lần do người bán nạp sẵn. Bạn trả bằng số dư ví, nhận mã ngay, tiền được giữ
        để bảo vệ bạn cho tới khi bạn xác nhận mã dùng được.
      </p>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              value={filters.searchText}
              onChange={(e) => setFilter({ searchText: e.target.value })}
              placeholder="Tìm tên sản phẩm, tên game, tên gian hàng (gõ không dấu vẫn khớp)"
              className="w-full outline-none"
            />
          </label>
          <select
            value={filters.gameSlug}
            onChange={(e) => setFilter({ gameSlug: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2"
            aria-label="Lọc theo game"
          >
            <option value="">Tất cả game</option>
            {gameOptions.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={filters.sort}
            onChange={(e) => setFilter({ sort: e.target.value as ProductFilterState['sort'] })}
            className="rounded-lg border border-gray-200 px-3 py-2"
            aria-label="Sắp xếp"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="best_selling">Bán chạy nhất</option>
            <option value="biggest_discount">Giảm nhiều nhất</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 font-medium text-gray-700">
            <Filter size={16} /> Khoảng giá (Core)
          </span>
          <input
            type="number"
            min={0}
            value={filters.minPrice ?? ''}
            onChange={(e) =>
              setFilter({ minPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })
            }
            placeholder="Từ"
            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5"
          />
          <input
            type="number"
            min={0}
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              setFilter({ maxPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })
            }
            placeholder="Đến"
            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5"
          />
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => setFilter({ inStockOnly: e.target.checked })}
            />
            Chỉ hiện còn hàng
          </label>
          <button
            type="button"
            onClick={() => setFilters({ ...EMPTY_PRODUCT_FILTERS })}
            className="rounded-lg border border-gray-200 px-3 py-1.5"
          >
            Xóa lọc
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5"
          >
            <RefreshCw size={16} /> Tải lại
          </button>
        </div>
      </div>

      {isLoading && <p className="mt-6 text-gray-600">Đang tải sản phẩm sàn…</p>}
      {error && !isLoading && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Thử lại
          </button>
        </div>
      )}
      {!isLoading && !error && visible.length === 0 && (
        <p className="mt-6 text-gray-600">
          Chưa có sản phẩm nào khớp điều kiện lọc. Thử xóa lọc hoặc tìm từ khóa khác.
        </p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <MarketplaceProductCard
            key={p.id}
            product={p}
            onOpen={onOpenProduct}
            onOpenShop={onOpenShop}
          />
        ))}
      </div>
    </section>
  );
};
