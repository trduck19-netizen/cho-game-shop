import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Gamepad2,
  Gift,
  CheckSquare,
  Users,
  Activity,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MultiLineAnalyticsChart } from '../components/MultiLineAnalyticsChart';
import { RecentBalanceChangesWidget } from '../components/RecentBalanceChangesWidget';
import { adminDataService } from '../services/adminDataService';
import { DashboardMetrics, GameAdminRecord, WalletTransaction, GiftcodeSubmission } from '../types/adminTypes';
import { AdminModuleTab } from '../components/AdminSidebar';

interface DashboardModuleProps {
  onNavigate: (tab: AdminModuleTab) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topGames, setTopGames] = useState<GameAdminRecord[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<GiftcodeSubmission[]>([]);

  useEffect(() => {
    loadDashboardData();
    adminDataService.fetchFromCloudflareKV().then(() => {
      loadDashboardData();
    });

    // Instant cross-tab & KV sync listener
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('wcg_data_sync');
      channel.onmessage = (e) => {
        if (
          e.data?.type === 'TRANSACTIONS_UPDATED' ||
          e.data?.type === 'ORDERS_UPDATED' ||
          e.data?.type === 'MEMBERS_UPDATED' ||
          e.data?.type === 'KV_DATA_PULLED'
        ) {
          loadDashboardData();
        }
      };
    }

    const onDataUpdated = () => {
      loadDashboardData();
    };
    window.addEventListener('wcg_admin_data_updated', onDataUpdated);

    return () => {
      channel?.close();
      window.removeEventListener('wcg_admin_data_updated', onDataUpdated);
    };
  }, []);

  const loadDashboardData = () => {
    const m = adminDataService.getDashboardMetrics();
    setMetrics(m);

    const games = adminDataService.getGames();
    setTopGames(games.slice(0, 5));

    const txs = adminDataService.getTransactions();
    setRecentTransactions(txs.slice(0, 10));

    const subs = adminDataService.getSubmissions({ status: 'PENDING' });
    setPendingSubmissions(subs.slice(0, 5));
  };

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (!metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Tổng Doanh Thu"
          value={formatVnd(metrics.totalRevenue)}
          icon={DollarSign}
          color="emerald"
          change={{ value: '+14.8%', trend: 'up', label: 'tuần này' }}
          onClick={() => onNavigate('wallet')}
        />
        <StatCard
          title="Tổng Thành Viên"
          value={`${metrics.totalMembers} người`}
          icon={Users}
          color="purple"
          subtext="Tài khoản thành viên"
          onClick={() => onNavigate('members')}
        />
        <StatCard
          title="Kho Game Quản Lý"
          value={metrics.totalGames}
          icon={Gamepad2}
          color="indigo"
          subtext={`${metrics.activeGames} đang hoạt động`}
          onClick={() => onNavigate('games')}
        />
        <StatCard
          title="Tổng Giftcode"
          value={metrics.totalGiftcodes}
          icon={Gift}
          color="sky"
          subtext="4.6k+ mã khả dụng"
          onClick={() => onNavigate('free-codes')}
        />
        <StatCard
          title="Code Chờ Duyệt"
          value={metrics.pendingSubmissions}
          icon={CheckSquare}
          color={metrics.pendingSubmissions > 0 ? 'amber' : 'purple'}
          subtext={metrics.pendingSubmissions > 0 ? 'Cần xử lý ngay' : 'Đã duyệt hết'}
          onClick={() => onNavigate('giftcodes')}
        />
      </div>

      {/* 2-Column Analytics & Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Multi-variable interactive line chart */}
        <MultiLineAnalyticsChart />

        {/* Top Featured Games */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Game Nổi Bật Nhất
            </h3>
            <button
              onClick={() => onNavigate('games')}
              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Xem tất cả
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {topGames.map((game) => (
              <div key={game.id} className="flex items-center gap-3 py-3">
                <div className="relative h-10 w-10 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900/10">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold select-none">
                    {(game.name || 'G').replace(/[^\p{L}\p{N}\s]/gu, '').trim().slice(0, 2).toUpperCase() || 'GM'}
                  </div>
                  <img
                    src={game.icon_url || `/game_icons/${game.slug}.webp`}
                    alt={game.name}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const slug = game.slug || game.id;
                      if (!target.dataset.triedLocal) {
                        target.dataset.triedLocal = '1';
                        target.src = `/game_icons/${slug}.webp`;
                      } else if (!target.dataset.triedJpg) {
                        target.dataset.triedJpg = '1';
                        target.src = `/game_icons/${slug}.jpg`;
                      } else if (!target.dataset.triedProxy) {
                        target.dataset.triedProxy = '1';
                        const raw = game.icon_url && game.icon_url.startsWith('http') ? game.icon_url : '';
                        target.src = `/api/game-icon?slug=${encodeURIComponent(slug)}${raw ? `&url=${encodeURIComponent(raw)}` : ''}`;
                      } else {
                        target.style.opacity = '0';
                      }
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {game.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{game.publisher}</p>
                </div>
                <StatusBadge status={game.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Column Tables: Pending Submissions & Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Submissions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Giftcode Thành Viên Gửi Chờ Duyệt
              </h3>
            </div>
            <button
              onClick={() => onNavigate('giftcodes')}
              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Mở duyệt ({pendingSubmissions.length})
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {pendingSubmissions.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Hiện không có mã code nào chờ duyệt.
              </p>
            ) : (
              pendingSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {sub.codeValue}
                      </span>
                      <span className="text-[11px] text-slate-400">({sub.gameSlug})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Gửi bởi: <strong className="text-slate-700 dark:text-slate-300">{sub.submitterName}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('giftcodes')}
                    className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Duyệt
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Balance Changes */}
        <RecentBalanceChangesWidget
          transactions={recentTransactions}
          title="Biến Động Số Dư Gần Nhất"
          subtitle="Ghi nhận giao dịch thời gian thực"
          limit={5}
          compact={true}
          showFilters={false}
          onViewAll={() => onNavigate('wallet')}
        />
      </div>
    </div>
  );
};
