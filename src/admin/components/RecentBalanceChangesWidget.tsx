import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sliders,
  Sparkles,
  Copy,
  Check,
  Search,
  ExternalLink,
  PlusCircle,
  Activity,
  Wallet,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';
import { WalletTransaction } from '../types/adminTypes';
import { formatCore, formatFullDateTime, formatTimeAgo, smartVietnameseMatch } from '../../utils/textUtils';

interface RecentBalanceChangesWidgetProps {
  transactions?: WalletTransaction[];
  title?: string;
  subtitle?: string;
  limit?: number;
  compact?: boolean;
  showFilters?: boolean;
  onViewAll?: () => void;
  onAdjustWallet?: () => void;
  onRefresh?: () => void;
}

export const RecentBalanceChangesWidget: React.FC<RecentBalanceChangesWidgetProps> = ({
  transactions = [],
  title = 'Biến Động Số Dư Gần Nhất',
  subtitle = 'Theo dõi chi tiết dòng tiền nạp, mua code và điều chỉnh số dư thành viên thời gian thực',
  limit = 8,
  compact = false,
  showFilters = true,
  onViewAll,
  onAdjustWallet,
  onRefresh,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleCopyRef = (refId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!refId) return;
    try {
      navigator.clipboard.writeText(refId);
      setCopiedId(refId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  // Filter & Search Logic
  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      // Type Filter
      if (activeFilter !== 'ALL') {
        if (activeFilter === 'INFLOW') {
          if (tx.amount <= 0) return false;
        } else if (activeFilter === 'OUTFLOW') {
          if (tx.amount >= 0) return false;
        } else if (tx.type !== activeFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const matches = smartVietnameseMatch(
          [tx.referenceId, tx.memberEmail, tx.memberId, tx.note, tx.type],
          searchQuery
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, activeFilter, searchQuery]);

  const displayList = compact ? filteredList.slice(0, limit) : filteredList.slice(0, limit);

  // Quick summary stats for the current transactions set
  const stats = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    transactions.forEach((tx) => {
      if (tx.status === 'COMPLETED' || !tx.status) {
        if (tx.amount > 0) inflow += tx.amount;
        else outflow += Math.abs(tx.amount);
      }
    });
    return { inflow, outflow, totalCount: transactions.length };
  }, [transactions]);

  // Helper icon for transaction direction
  const getTransactionVisual = (tx: WalletTransaction) => {
    const isPositive = (Number(tx.amount) || 0) >= 0;
    if (tx.type === 'REFUND') {
      return {
        icon: RotateCcw,
        bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        badgeColor: 'amber',
        sign: '+',
      };
    }
    if (tx.type === 'ADMIN_ADJUST') {
      return {
        icon: Sliders,
        bg: isPositive
          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        badgeColor: 'purple',
        sign: isPositive ? '+' : '-',
      };
    }
    if (tx.type === 'REWARD') {
      return {
        icon: Sparkles,
        bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        badgeColor: 'amber',
        sign: '+',
      };
    }
    if (isPositive) {
      return {
        icon: ArrowDownLeft,
        bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        badgeColor: 'emerald',
        sign: '+',
      };
    }
    return {
      icon: ArrowUpRight,
      bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      badgeColor: 'rose',
      sign: '',
    };
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 sm:pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  {title}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Feed
                </span>
              </div>
              {!compact && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {onAdjustWallet && (
            <button
              onClick={onAdjustWallet}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Điều Chỉnh Ví</span>
            </button>
          )}

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors ml-auto sm:ml-0"
            >
              <span>Xem sổ cái</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mini Stats Ribbon (In non-compact mode) */}
      {!compact && (
        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 sm:p-3 dark:border-emerald-500/10 dark:bg-emerald-500/5">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[10px] sm:text-[11px] font-semibold">Tiền Nạp / Vào</span>
            </div>
            <p className="mt-1 font-mono text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
              +{formatVnd(stats.inflow)}
            </p>
          </div>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5 sm:p-3 dark:border-rose-500/10 dark:bg-rose-500/5">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[10px] sm:text-[11px] font-semibold">Tiền Trừ / Chi</span>
            </div>
            <p className="mt-1 font-mono text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 truncate">
              -{formatVnd(stats.outflow)}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[10px] sm:text-[11px] font-semibold">Lượt Biến Động</span>
            </div>
            <p className="mt-1 font-mono text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200">
              {stats.totalCount} giao dịch
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      {showFilters && !compact && (
        <div className="mt-3 sm:mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Quick Filter Chips (Horizontal scroll on mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-none">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'INFLOW', label: 'Nạp / Vào (+)' },
              { id: 'OUTFLOW', label: 'Thanh toán (-)' },
              { id: 'REFUND', label: 'Hoàn tiền' },
              { id: 'ADMIN_ADJUST', label: 'Admin sửa' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeFilter === f.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã GD, email, lý do..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Transactions Feed List */}
      <div className="mt-4 space-y-2.5">
        {displayList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
            <Activity className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Không tìm thấy biến động số dư nào phù hợp.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Các giao dịch nạp tiền, mua code hoặc hoàn tiền sẽ tự động cập nhật tại đây.
            </p>
          </div>
        ) : (
          displayList.map((tx) => {
            const visual = getTransactionVisual(tx);
            const VisualIcon = visual.icon;
            const amt = Number(tx.amount) || 0;
            const isCopied = copiedId === (tx.referenceId || tx.id);

            return (
              <div
                key={tx.id || tx.referenceId}
                className="group flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/80 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left Side: Avatar, Details & Ref Code */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Action Icon Badge */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${visual.bg}`}
                    title={tx.type}
                  >
                    <VisualIcon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Top Row: User & Type Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {tx.memberEmail || tx.memberId || 'Khách vãng lai'}
                      </span>
                      <StatusBadge status={tx.type} size="sm" />
                      {tx.status && tx.status !== 'COMPLETED' && (
                        <StatusBadge status={tx.status} size="sm" />
                      )}
                    </div>

                    {/* Note / Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                      {tx.note || 'Biến động số dư tài khoản'}
                    </p>

                    {/* Meta Row: Ref ID + Time */}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      {tx.referenceId && (
                        <button
                          onClick={(e) => handleCopyRef(tx.referenceId, e)}
                          className="inline-flex items-center gap-1 font-mono font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Bấm để sao chép mã tham chiếu"
                        >
                          <span>Ref: {tx.referenceId}</span>
                          {isCopied ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                      )}

                      <span
                        className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400"
                        title={`Thời gian chính xác: ${formatFullDateTime(tx.createdAt)} (${formatTimeAgo(tx.createdAt)})`}
                      >
                        <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <span className="font-mono text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {formatFullDateTime(tx.createdAt)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                          • {formatTimeAgo(tx.createdAt)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Financial Delta & Balance Trail */}
                <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right shrink-0 border-t border-slate-200/60 pt-2 sm:border-0 sm:pt-0 dark:border-slate-700/60">
                  {/* Amount Badge */}
                  <div className="flex items-baseline gap-1.5 sm:justify-end">
                    <span
                      className={`font-mono text-sm sm:text-base font-extrabold ${
                        amt >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {amt >= 0 ? '+' : ''}
                      {formatVnd(amt)}
                    </span>
                  </div>

                  {/* Balance Before -> After Trail */}
                  {(tx.balanceAfter !== undefined || tx.balanceBefore !== undefined) && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Ví:</span>
                      <span className="text-slate-400">
                        {formatCore(Number(tx.balanceBefore) || 0)}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">➔</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {formatCore(Number(tx.balanceAfter) || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info / View All */}
      {compact && transactions.length > limit && onViewAll && (
        <div className="mt-4 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
          <button
            onClick={onViewAll}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            Xem tất cả {transactions.length} biến động trong Sổ Cái Ví ➔
          </button>
        </div>
      )}
    </div>
  );
};
