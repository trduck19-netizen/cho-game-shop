import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Database,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Package,
  Sparkles,
  ShoppingBag,
  Gift,
  Clock,
  History,
} from 'lucide-react';

const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('wcg_auth_token') ||
    sessionStorage.getItem('wcg_auth_token') ||
    localStorage.getItem('wcg_admin_sync_key') ||
    sessionStorage.getItem('wcg_admin_sync_key') ||
    'SP-KEY-WCG-SECURE-2026-TOKEN'
  );
};

interface Product3ColItem {
  id: string;
  title: string;
  item_type?: string;
  real_sold: number;
  real_stock: number;
  virtual_sold: number;
  virtual_buffer: number;
  virtual_restock_count: number;
  display_sold: number;
  display_stock: number;
  last_restock_at?: string;
}

interface Giveaway3ColItem {
  id: string;
  title: string;
  real_claimed: number;
  real_remaining: number;
  virtual_claimed: number;
  virtual_buffer: number;
  virtual_restock_count: number;
  display_claimed: number;
  display_remaining: number;
  last_restock_at?: string;
}

interface D1QuotaInfo {
  date: string;
  estimatedReads: number;
  estimatedWrites: number;
  readLimit: number;
  percentUsed: number;
  alertLevel: 'NORMAL' | 'WARN_70' | 'CRITICAL_90' | 'CIRCUIT_BREAKER';
  circuitBreakerActive: boolean;
  circuitBreakerRemainingSec: number;
  lastError?: string;
}

interface PaginatedEventsData {
  events: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const VirtualLayerAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'store' | 'utility' | 'giveaway'>('all');
  const [eventPage, setEventPage] = useState(1);

  const [products, setProducts] = useState<Product3ColItem[]>([]);
  const [giveaways, setGiveaways] = useState<Giveaway3ColItem[]>([]);
  const [masterCopy, setMasterCopy] = useState({ real_clicks: 0, virtual_copy: 0, total_display: 0 });
  const [d1Quota, setD1Quota] = useState<D1QuotaInfo | null>(null);
  const [paginatedEvents, setPaginatedEvents] = useState<PaginatedEventsData>({
    events: [],
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  const fetchData = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const sessionToken = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`/api/crawler/marketing?action=get_virtual_analytics&page=${page}&limit=15`, {
        headers,
      });

      if (!res.ok) {
        throw new Error(`Máy chủ phản hồi mã ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data && data.success) {
        setProducts(data.products || []);
        setGiveaways(data.giveaways || []);
        if (data.master_copy) setMasterCopy(data.master_copy);
        if (data.d1_quota) setD1Quota(data.d1_quota);
        if (data.paginated_events) setPaginatedEvents(data.paginated_events);
      } else {
        throw new Error(data.error || 'Không thể tải dữ liệu kiểm toán ảo');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối khi tải số liệu ảo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(eventPage);
  }, [fetchData, eventPage]);

  // Filter products by search and type
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeTypeFilter === 'all' || (activeTypeFilter === 'store' && p.item_type === 'store') || (activeTypeFilter === 'utility' && p.item_type === 'utility');
    return matchesSearch && matchesType;
  });

  const filteredGiveaways = activeTypeFilter === 'utility' || activeTypeFilter === 'store' ? [] : giveaways.filter((g) => {
    return !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase()) || g.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Layers className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Kiến Trúc FOMO Hai Lớp (Two-Layer SSOT)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Bảng Phân Tách Thống Kê Thật & Số Liệu Ảo
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Dữ liệu gốc (đơn thật, kho thật) được bảo toàn 100%. Lớp số ảo được ghi nhận trong sổ cái riêng, tự động bù kho theo mức cài đặt khi chạm đáy kho gốc, và phục vụ trực tiếp từ Edge Cache để tiết kiệm lượt đọc/ghi D1.
            </p>
          </div>

          <button
            onClick={() => fetchData(eventPage)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm Mới Số Liệu
          </button>
        </div>
      </div>

      {/* 2. D1 Quota & Health Status Card */}
      {d1Quota && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-2.5 rounded-xl border ${
              d1Quota.circuitBreakerActive
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : d1Quota.alertLevel === 'WARN_70'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {d1Quota.circuitBreakerActive ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : d1Quota.alertLevel === 'WARN_70' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-slate-400">Giám Sát Quota Cloudflare D1 (5M Lượt Đọc/Ngày)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  d1Quota.circuitBreakerActive
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : d1Quota.alertLevel === 'WARN_70'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {d1Quota.circuitBreakerActive ? 'Cầu Dao Kích Hoạt' : d1Quota.alertLevel === 'WARN_70' ? 'Cảnh Báo 70%' : 'An Toàn 100%'}
                </span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                Ước tính đã đọc hôm nay: <span className="text-indigo-400">{d1Quota.estimatedReads.toLocaleString('vi-VN')}</span> / {d1Quota.readLimit.toLocaleString('vi-VN')} dòng ({d1Quota.percentUsed}%)
              </div>
            </div>
          </div>

          <div className="w-full md:w-64 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                d1Quota.percentUsed >= 90 ? 'bg-red-500' : d1Quota.percentUsed >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, d1Quota.percentUsed)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm, tiện ích hoặc quà tặng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTypeFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất Cả
          </button>
          <button
            onClick={() => setActiveTypeFilter('store')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTypeFilter === 'store' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cửa Hàng (Store)
          </button>
          <button
            onClick={() => setActiveTypeFilter('utility')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTypeFilter === 'utility' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tiện Ích (Tool)
          </button>
          <button
            onClick={() => setActiveTypeFilter('giveaway')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTypeFilter === 'giveaway' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Giveaways
          </button>
        </div>
      </div>

      {/* 4. Three-Column Reconciliation Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Đối Soát Ba Cột: Dữ Liệu Thật vs Thống Kê Ảo vs Số Khách Thấy
          </h3>
          <span className="text-xs text-slate-400">
            Hiển thị {filteredProducts.length + filteredGiveaways.length} mục
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 min-w-[220px]">Sản Phẩm / Chiến Dịch</th>
                <th className="px-4 py-3 bg-blue-950/20 text-blue-300 border-l border-blue-900/20">
                  1. Dữ Liệu Gốc (Thật)
                </th>
                <th className="px-4 py-3 bg-purple-950/20 text-purple-300 border-l border-purple-900/20">
                  2. Lớp Số Ảo (FOMO)
                </th>
                <th className="px-4 py-3 bg-emerald-950/20 text-emerald-300 border-l border-emerald-900/20">
                  3. Số Khách Thấy (Hiển Thị)
                </th>
                <th className="px-4 py-3 text-right">Trạng Thái Kho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.real_stock <= 0;
                const isAtFloor = p.virtual_buffer <= 0 && p.real_stock > 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3.5 font-sans font-medium text-white">
                      <div className="flex items-center gap-2">
                        {p.item_type === 'store' ? (
                          <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Package className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                        <div>
                          <div className="text-white font-semibold text-sm leading-tight">{p.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{p.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 1: Thật */}
                    <td className="px-4 py-3.5 bg-blue-950/10 border-l border-blue-900/20">
                      <div className="space-y-0.5">
                        <div className="text-slate-300">
                          Bán thật: <span className="text-blue-400 font-bold">{p.real_sold.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="text-slate-400">
                          Tồn thật: <span className={`font-bold ${p.real_stock > 0 ? 'text-blue-300' : 'text-red-400'}`}>{p.real_stock.toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Ảo */}
                    <td className="px-4 py-3.5 bg-purple-950/10 border-l border-purple-900/20">
                      <div className="space-y-0.5">
                        <div className="text-slate-300">
                          Bán ảo: <span className="text-purple-400 font-bold">+{p.virtual_sold.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="text-slate-400">
                          Bộ đệm ảo: <span className="text-purple-300 font-bold">+{p.virtual_buffer.toLocaleString('vi-VN')}</span>
                          {p.virtual_restock_count > 0 && (
                            <span className="text-[10px] text-purple-400 ml-1.5 font-sans">
                              (bù {p.virtual_restock_count} lần)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: Hiển thị */}
                    <td className="px-4 py-3.5 bg-emerald-950/10 border-l border-emerald-900/20">
                      <div className="space-y-0.5">
                        <div className="text-slate-300">
                          Đã bán: <span className="text-emerald-400 font-bold text-sm">{p.display_sold.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="text-slate-400">
                          Còn lại: <span className={`font-bold text-sm ${p.display_stock > 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                            {p.display_stock > 0 ? p.display_stock.toLocaleString('vi-VN') : 'HẾT HÀNG'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Trạng thái kho */}
                    <td className="px-4 py-3.5 text-right font-sans">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          Kho gốc = 0
                        </span>
                      ) : isAtFloor ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Chạm đáy kho gốc
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Đệm an toàn
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredGiveaways.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3.5 font-sans font-medium text-white">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-pink-400 shrink-0" />
                      <div>
                        <div className="text-white font-semibold text-sm leading-tight">{g.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{g.id}</div>
                      </div>
                    </div>
                  </td>

                  {/* Cột 1: Thật */}
                  <td className="px-4 py-3.5 bg-blue-950/10 border-l border-blue-900/20">
                    <div className="space-y-0.5">
                      <div className="text-slate-300">
                        Nhận thật: <span className="text-blue-400 font-bold">{g.real_claimed.toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="text-slate-400">
                        Mã thật: <span className={`font-bold ${g.real_remaining > 0 ? 'text-blue-300' : 'text-red-400'}`}>{g.real_remaining.toLocaleString('vi-VN')}</span>
                      </div>
                    </div>
                  </td>

                  {/* Cột 2: Ảo */}
                  <td className="px-4 py-3.5 bg-purple-950/10 border-l border-purple-900/20">
                    <div className="space-y-0.5">
                      <div className="text-slate-300">
                        Nhận ảo: <span className="text-purple-400 font-bold">+{g.virtual_claimed.toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="text-slate-400">
                        Bộ đệm ảo: <span className="text-purple-300 font-bold">+{g.virtual_buffer.toLocaleString('vi-VN')}</span>
                      </div>
                    </div>
                  </td>

                  {/* Cột 3: Hiển thị */}
                  <td className="px-4 py-3.5 bg-emerald-950/10 border-l border-emerald-900/20">
                    <div className="space-y-0.5">
                      <div className="text-slate-300">
                        Đã săn: <span className="text-emerald-400 font-bold text-sm">{g.display_claimed.toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="text-slate-400">
                        Còn lại: <span className={`font-bold text-sm ${g.display_remaining > 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                          {g.display_remaining > 0 ? g.display_remaining.toLocaleString('vi-VN') : 'HẾT MÃ'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Trạng thái kho */}
                  <td className="px-4 py-3.5 text-right font-sans">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                      Giveaway VIP
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Paginated Virtual Events Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Nhật Ký Dòng Sổ Ảo (Bảng wcg_virtual_events - Flush Định Kỳ Mỗi 5 Phút)
            </h3>
          </div>
          <div className="text-xs text-slate-400">
            Tổng cộng <span className="text-white font-bold">{paginatedEvents.total}</span> sự kiện ảo đã ghi nhận
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Thời Gian</th>
                <th className="px-4 py-3">Loại Sự Kiện</th>
                <th className="px-4 py-3">Mặt Hàng / Nội Dung</th>
                <th className="px-4 py-3">Số Lượng</th>
                <th className="px-4 py-3 text-right">Phân Loại Đối Soát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginatedEvents.events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-sans">
                    Chưa có sự kiện ảo nào được ghi nhận trong chu kỳ flush hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedEvents.events.map((ev: any) => {
                  let details: any = {};
                  try { details = JSON.parse(ev.details || '{}'); } catch {}

                  return (
                    <tr key={ev.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 text-slate-400">
                        {ev.created_at ? new Date(ev.created_at).toLocaleTimeString('vi-VN') : '—'}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ev.type === 'BUY_STORE' || ev.type === 'BUY_UTILITY'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : ev.type === 'RESTOCK_PRODUCT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : ev.type === 'CLAIM_GIVEAWAY'
                            ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                            : ev.type === 'COPY_CODE'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {ev.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans text-white">
                        <div className="font-medium">{ev.item_name || details.productTitle || details.giveawayTitle || 'Hệ thống'}</div>
                        {details.userName && (
                          <div className="text-[11px] text-slate-400 font-mono">{details.userName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-bold">
                        {ev.type === 'RESTOCK_PRODUCT' ? `+${ev.amount || 20}` : `-${ev.amount || 1}`}
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          is_simulated: true (Ảo)
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {paginatedEvents.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Trang {paginatedEvents.page} / {paginatedEvents.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                disabled={paginatedEvents.page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition font-medium"
              >
                Trang Trước
              </button>
              <button
                onClick={() => setEventPage((p) => Math.min(paginatedEvents.totalPages, p + 1))}
                disabled={paginatedEvents.page >= paginatedEvents.totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition font-medium"
              >
                Trang Tiếp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
