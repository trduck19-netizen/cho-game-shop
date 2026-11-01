import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Scale,
  RotateCcw,
  Search,
  X,
  User,
  Wallet,
  AlertCircle,
  Check,
} from 'lucide-react';
import { DataTable, Column } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Step2VerificationModal } from '../components/ui/Step2VerificationModal';
import { RecentBalanceChangesWidget } from '../components/RecentBalanceChangesWidget';
import { adminDataService } from '../services/adminDataService';
import { WalletTransaction, MemberRecord } from '../types/adminTypes';
import { formatCore, formatFullDateTime, formatTimeAgo, smartVietnameseMatch, normalizeVietnamese } from '../../utils/textUtils';

interface WalletModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const WalletModule: React.FC<WalletModuleProps> = ({ onShowToast }) => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Manual Adjustment Form
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [adjAmount, setAdjAmount] = useState(100000);
  const [adjType, setAdjType] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [adjReason, setAdjReason] = useState('Điều chỉnh số dư ví thủ công');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Map tra cứu nhanh thành viên theo ID và email
  const memberMap = useMemo(() => {
    const map = new Map<string, MemberRecord>();
    members.forEach((m) => {
      if (m?.id) map.set(m.id, m);
      if (m?.email) map.set(m.email.toLowerCase(), m);
    });
    return map;
  }, [members]);

  // Làm giàu dữ liệu sổ cái để tìm kiếm theo tên thành viên
  const enrichedTransactions = useMemo(() => {
    return transactions.map((t) => {
      const m = memberMap.get(t.memberId) || (t.memberEmail ? memberMap.get(t.memberEmail.toLowerCase()) : undefined);
      return {
        ...t,
        memberName: m?.displayName || '',
        memberUsername: m?.username || '',
      };
    });
  }, [transactions, memberMap]);

  // Bộ lọc mở rộng danh sách thành viên trong modal điều chỉnh ví (hỗ trợ tên, username, email, SĐT, ID)
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) {
      return members;
    }
    const q = memberSearchQuery.trim();
    return members.filter((m) => {
      const searchTargets = [
        m.displayName,
        m.username,
        m.email,
        m.phone,
        m.id,
        m.role,
      ];
      return smartVietnameseMatch(searchTargets, q);
    });
  }, [members, memberSearchQuery]);

  // Thành viên đang được chọn hiện tại
  const selectedMember = useMemo(() => {
    if (selectedMemberId) {
      const found = members.find((m) => m.id === selectedMemberId);
      if (found) return found;
    }
    return filteredMembers.length > 0 ? filteredMembers[0] : (members.length > 0 ? members[0] : null);
  }, [members, selectedMemberId, filteredMembers]);

  const handleOpenAdjustModal = (memberId?: string) => {
    setMemberSearchQuery('');
    const targetId = memberId || (members.length > 0 ? members[0].id : '');
    setSelectedMemberId(targetId);
    setAdjAmount(100000);
    setAdjType('ADD');
    setAdjReason('Điều chỉnh số dư ví thủ công');
    setIsAdjustModalOpen(true);
  };

  // Step 2 Security Verification (2FA Confirmation)
  const [step2Action, setStep2Action] = useState<{
    type: 'RESET_ALL' | 'ADJUST_BALANCE';
    title: string;
    actionTitle: string;
    details: string | React.ReactNode;
    payload?: any;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const syncAndLoad = async () => {
      setIsLoading(true);
      try {
        await adminDataService.fetchFromCloudflareKV();
      } catch {}
      if (isMounted) {
        setMembers(adminDataService.getMembers());
        loadTransactions();
        setIsLoading(false);
      }
    };

    syncAndLoad();

    // Instant cross-tab & KV sync listener
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('wcg_data_sync');
      channel.onmessage = (e) => {
        if (!isMounted) return;
        if (
          e.data?.type === 'TRANSACTIONS_UPDATED' ||
          e.data?.type === 'ORDERS_UPDATED' ||
          e.data?.type === 'MEMBERS_UPDATED' ||
          e.data?.type === 'KV_DATA_PULLED'
        ) {
          setMembers(adminDataService.getMembers());
          loadTransactions();
        }
      };
    }

    const onDataUpdated = () => {
      if (!isMounted) return;
      setMembers(adminDataService.getMembers());
      loadTransactions();
    };

    window.addEventListener('wcg_admin_data_updated', onDataUpdated);

    return () => {
      isMounted = false;
      channel?.close();
      window.removeEventListener('wcg_admin_data_updated', onDataUpdated);
    };
  }, [typeFilter]);

  const loadTransactions = () => {
    const filterObj: any = {};
    if (typeFilter !== 'ALL') filterObj.type = typeFilter;

    const data = adminDataService.getTransactions(filterObj);
    setTransactions(data);
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      await adminDataService.fetchFromCloudflareKV();
      setMembers(adminDataService.getMembers());
      loadTransactions();
      onShowToast('Đã làm mới dữ liệu', 'Sổ cái giao dịch và ví thành viên đã được đồng bộ mới nhất từ Cloudflare D1.', 'success');
    } catch {
      onShowToast('Lỗi đồng bộ', 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Financial summary calculations
  const totalDeposits = transactions
    .filter((t) => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalSpent = transactions
    .filter((t) => t.type === 'ORDER_PAYMENT' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalRefunds = transactions
    .filter((t) => t.type === 'REFUND' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalMemberBalance = members.reduce((sum, m) => sum + (Number(m?.balance) || 0), 0);

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMemberId = selectedMemberId || (members.length > 0 ? members[0].id : '');
    if (!targetMemberId) {
      onShowToast('Lỗi', 'Vui lòng chọn thành viên.', 'error');
      return;
    }

    const targetMember = members.find((m) => m.id === targetMemberId);
    const amount = adjType === 'ADD' ? Math.abs(adjAmount) : -Math.abs(adjAmount);
    const currentBal = Number(targetMember?.balance) || 0;
    const newBal = Math.max(0, currentBal + amount);

    // Require Step 2 Verification code before executing
    setStep2Action({
      type: 'ADJUST_BALANCE',
      title: 'Xác Minh Bước 2: Điều Chỉnh Số Dư Ví',
      actionTitle: `Điều chỉnh số dư ví cho ${targetMember?.displayName || targetMemberId}`,
      details: (
        <div className="space-y-1">
          <p>
            Thành viên: <strong className="text-slate-900 dark:text-white">{targetMember?.displayName}</strong> ({targetMember?.email || targetMember?.id})
          </p>
          <p>
            Biến động:{' '}
            <strong className={amount >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>
              {amount >= 0 ? '+' : ''}{formatVnd(amount)}
            </strong>
          </p>
          <p>
            Số dư sau điều chỉnh:{' '}
            <strong className="text-slate-900 dark:text-white font-mono">{formatVnd(newBal)}</strong>{' '}
            <span className="text-slate-400 text-[10px]">(Trước: {formatVnd(currentBal)})</span>
          </p>
          <p>
            Lý do: <em>{adjReason}</em>
          </p>
        </div>
      ),
      payload: {
        targetMemberId,
        amount,
        adjReason,
      },
    });
  };

  const handleOpenResetAllModal = () => {
    setStep2Action({
      type: 'RESET_ALL',
      title: 'Xác Minh Bước 2: Reset Dữ Liệu Ví & Doanh Thu',
      actionTitle: 'CẢNH BÁO NGUY HIỂM: Reset toàn bộ ví và tổng doanh thu về 0 đồng',
      details: (
        <div className="space-y-1 text-rose-700 dark:text-rose-300">
          <p>
            • Đưa số dư ví của <strong>TẤT CẢ ({members.length}) thành viên</strong> về <strong>0đ</strong>.
          </p>
          <p>• Xóa sạch toàn bộ lịch sử sổ cái giao dịch ví.</p>
          <p>• <strong>Reset tổng doanh thu bán hàng về 0 đồng</strong> trên toàn hệ thống (bao gồm Cloudflare Edge/KV/D1).</p>
          <p className="font-bold underline pt-1">Hành động này KHÔNG THỂ HOÀN TÁC!</p>
        </div>
      ),
    });
  };

  const handleStep2Success = async () => {
    if (!step2Action) return;

    if (step2Action.type === 'RESET_ALL') {
      await adminDataService.resetAllWalletsAndRevenueToZero('Xác thực bước 2 thành công: Reset toàn bộ ví và doanh thu về 0 đồng');
      setMembers(adminDataService.getMembers());
      setTransactions([]);
      setIsResetAllModalOpen(false);
      onShowToast('Thành công', 'Đã xác minh mật khẩu bước 2! Đã reset toàn bộ ví thành viên, sổ cái và tổng doanh thu về 0 đồng.', 'success');
    } else if (step2Action.type === 'ADJUST_BALANCE' && step2Action.payload) {
      const { targetMemberId, amount, adjReason } = step2Action.payload;
      const updated = adminDataService.adjustMemberBalance(targetMemberId, amount, adjReason);

      if (updated) {
        onShowToast(
          'Đã ghi nhận sổ cái',
          `Xác thực bước 2 thành công! Đã điều chỉnh cho ${updated.displayName}. Số dư mới: ${formatVnd(updated.balance)}.`,
          'success'
        );
        setIsAdjustModalOpen(false);
        setMembers(adminDataService.getMembers());
        loadTransactions();
      }
    }

    setStep2Action(null);
  };

  const handleExportCsv = () => {
    const header = 'ID,ReferenceID,MemberID,MemberEmail,Type,Amount,BalanceBefore,BalanceAfter,Status,Note,Timestamp\n';
    const rows = transactions
      .map(
        (t) =>
          `"${t.id}","${t.referenceId}","${t.memberId}","${t.memberEmail || ''}","${t.type}",${t.amount},${t.balanceBefore},${t.balanceAfter},"${t.status}","${t.note}","${t.createdAt}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `so_cai_tai_chinh_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Xuất sổ cái thành công', 'File CSV sổ cái tài chính đã tải về máy.', 'success');
  };

  const columns: Column<WalletTransaction>[] = [
    {
      key: 'referenceId',
      header: 'Mã GD / Tham Chiếu',
      sortable: true,
      render: (item) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200">{item?.referenceId || '—'}</span>
          <p className="text-[10px] text-slate-400">{item?.id || ''}</p>
        </div>
      ),
    },
    {
      key: 'memberEmail',
      header: 'Thành Viên',
      render: (item: any) => (
        <div className="text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {item?.memberName ? (
              <>
                <span>{item.memberName}</span>{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  ({item?.memberEmail || item?.memberId})
                </span>
              </>
            ) : (
              item?.memberEmail || item?.memberId || 'Khách vãng lai'
            )}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Loại Giao Dịch',
      sortable: true,
      render: (item) => <StatusBadge status={item?.type || 'DEPOSIT'} size="sm" />,
    },
    {
      key: 'amount',
      header: 'Số Tiền Biến Động',
      sortable: true,
      align: 'right',
      render: (item) => {
        const amt = Number(item?.amount) || 0;
        return (
          <div className="text-right font-mono text-xs">
            <span
              className={`font-bold block ${
                amt >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {amt >= 0 ? '+' : ''}
              {formatCore(amt)}
            </span>
            <span className="text-[10px] text-slate-400">
              {formatVnd(Math.abs(amt))}
            </span>
          </div>
        );
      },
    },
    {
      key: 'balanceAfter',
      header: 'Số Dư Sau Biến Động',
      align: 'right',
      render: (item) => (
        <div className="text-xs font-mono text-right">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {formatCore(Number(item?.balanceAfter) || 0)}
          </p>
          <p className="text-[10px] text-slate-400">
            Trước: {formatCore(Number(item?.balanceBefore) || 0)}
          </p>
        </div>
      ),
    },
    {
      key: 'note',
      header: 'Ghi Chú / Nội Dung',
      render: (item) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate block">
          {item?.note || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Thời Gian',
      sortable: true,
      render: (item) => (
        <div className="text-xs">
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block">
            {formatFullDateTime(item?.createdAt)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
            {formatTimeAgo(item?.createdAt)}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Tiền Nạp (Deposit)"
          value={formatVnd(totalDeposits)}
          icon={ArrowDownLeft}
          color="emerald"
          subtext="Qua ngân hàng & SePay"
        />
        <StatCard
          title="Doanh Thu Đơn Hàng"
          value={formatVnd(totalSpent)}
          icon={ArrowUpRight}
          color="indigo"
          subtext="Thanh toán từ số dư ví"
        />
        <StatCard
          title="Tổng Hoàn Tiền (Refund)"
          value={formatVnd(totalRefunds)}
          icon={RefreshCw}
          color="amber"
          subtext="Các đơn khiếu nại"
        />
        <StatCard
          title="Tổng Số Dư Thành Viên"
          value={formatVnd(totalMemberBalance)}
          icon={Scale}
          color="purple"
          subtext="Khả dụng trên toàn hệ thống"
        />
      </div>

      {/* Real-time Recent Balance Changes Feed */}
      <RecentBalanceChangesWidget
        transactions={transactions}
        title="Biến Động Số Dư Gần Nhất"
        subtitle="Dòng tiền nạp rút SePay, mua code, hoàn tiền & biến động số dư thành viên theo thời gian thực"
        limit={8}
        compact={false}
        onAdjustWallet={() => handleOpenAdjustModal()}
        onRefresh={handleManualRefresh}
      />

      {/* Ledger DataTable */}
      <DataTable
        data={enrichedTransactions}
        columns={columns}
        keyExtractor={(item) => item?.id || `tx_${Math.random()}`}
        isLoading={isLoading}
        searchPlaceholder="Tìm theo tên thành viên, mã GD, email, ghi chú..."
        searchKeys={['referenceId', 'memberName', 'memberUsername', 'memberEmail', 'memberId', 'note', 'type']}
        onRefresh={handleManualRefresh}
        onExportCsv={handleExportCsv}
        filters={[
          {
            key: 'type',
            label: 'Loại GD',
            selectedValue: typeFilter,
            options: [
              { label: 'Tất cả giao dịch', value: 'ALL' },
              { label: 'Nạp tiền (DEPOSIT)', value: 'DEPOSIT' },
              { label: 'Thanh toán đơn (ORDER_PAYMENT)', value: 'ORDER_PAYMENT' },
              { label: 'Hoàn tiền (REFUND)', value: 'REFUND' },
              { label: 'Admin điều chỉnh (ADMIN_ADJUST)', value: 'ADMIN_ADJUST' },
              { label: 'Thưởng đóng góp (REWARD)', value: 'REWARD' },
            ],
            onChange: setTypeFilter,
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenResetAllModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 shadow-sm hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all cursor-pointer"
              title="Đặt toàn bộ số dư của tất cả các ví thành viên về 0 đồng và reset tổng doanh thu về 0"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Ví & Doanh Thu Về 0</span>
            </button>
            <button
              onClick={() => handleOpenAdjustModal()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Điều Chỉnh Ví</span>
            </button>
          </div>
        }
      />

      {/* Manual Wallet Adjustment Modal */}
      <FormModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Điều Chỉnh Sổ Cái & Số Dư Ví"
        subtitle="Hệ thống tự động tính toán (Balance After = Balance Before + Amount) và lưu vết bất biến."
        maxWidth="md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {/* Ô TÌM KIẾM & CHỌN THÀNH VIÊN MỞ RỘNG */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Chọn Thành Viên Cần Điều Chỉnh</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {memberSearchQuery.trim()
                  ? `Khớp ${filteredMembers.length} / ${members.length} thành viên`
                  : `Tổng ${members.length} thành viên`}
              </span>
            </div>

            {/* Ô Tìm Kiếm Mở Rộng */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setMemberSearchQuery(val);
                }}
                placeholder="🔍 Gõ tìm theo tên hiển thị, username, email, SĐT hoặc ID..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 shadow-2xs"
              />
              {memberSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMemberSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Select Đã Được Lọc */}
            {filteredMembers.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  required
                  value={selectedMember?.id || (filteredMembers[0]?.id || '')}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                >
                  {filteredMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} ({m.email}) - Số dư: {formatVnd(m.balance)}
                    </option>
                  ))}
                </select>

                {/* Danh Sách Gợi Ý Bấm Chọn Nhanh khi đang tìm kiếm */}
                {memberSearchQuery.trim() && (
                  <div className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-1.5 dark:border-slate-700 dark:bg-slate-900/60 scrollbar-thin">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 pt-0.5 block">
                      Kết quả tìm kiếm ({filteredMembers.length}):
                    </span>
                    {filteredMembers.slice(0, 5).map((m) => {
                      const isSelected = selectedMember?.id === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMemberId(m.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-xs ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                              : 'bg-white hover:bg-slate-100 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              }`}
                            >
                              {(m.displayName || m.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-bold leading-tight">{m.displayName}</p>
                              <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {m.email} {m.phone ? `• ${m.phone}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className={`font-mono text-xs font-bold block ${isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {formatVnd(m.balance)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Không tìm thấy thành viên nào khớp với <strong>"{memberSearchQuery}"</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberSearchQuery('')}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-400 underline hover:opacity-80 shrink-0 cursor-pointer"
                >
                  Xóa lọc
                </button>
              </div>
            )}

            {/* Thẻ Xem Trước Thành Viên Đang Được Chọn */}
            {selectedMember && (
              <div className="mt-2 p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {(selectedMember.displayName || selectedMember.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <span>{selectedMember.displayName}</span>
                      {selectedMember.username && (
                        <span className="text-[10px] text-slate-400 font-normal">(@{selectedMember.username})</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {selectedMember.email} {selectedMember.phone ? `• SĐT: ${selectedMember.phone}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Số dư hiện tại</span>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatVnd(selectedMember.balance || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdjType('ADD')}
              className={`rounded-xl py-2 text-xs font-bold transition-all ${
                adjType === 'ADD'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              + Nạp Tiền
            </button>
            <button
              type="button"
              onClick={() => setAdjType('SUBTRACT')}
              className={`rounded-xl py-2 text-xs font-bold transition-all ${
                adjType === 'SUBTRACT'
                  ? 'bg-rose-600 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              - Khấu Trừ
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Số Tiền (VND) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              required
              value={adjAmount}
              onChange={(e) => setAdjAmount(Number(e.target.value))}
              className="mt-1 w-full font-mono text-sm font-bold rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Lý Do Giao Dịch <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="VD: Nạp tiền đối soát chuyển khoản MBBank"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* DỰ KIẾN SỐ DƯ SAU ĐIỀU CHỈNH */}
          {selectedMember && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Dự kiến số dư sau giao dịch:</span>
              <span className={`font-mono font-bold text-sm ${
                adjType === 'ADD' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatVnd(
                  adjType === 'ADD'
                    ? (Number(selectedMember.balance) || 0) + Math.abs(adjAmount)
                    : Math.max(0, (Number(selectedMember.balance) || 0) - Math.abs(adjAmount))
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Thực Hiện Giao Dịch</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Step 2 Security Verification (2FA Confirmation) */}
      {step2Action && (
        <Step2VerificationModal
          isOpen={Boolean(step2Action)}
          onClose={() => setStep2Action(null)}
          onSuccess={handleStep2Success}
          title={step2Action.title}
          actionTitle={step2Action.actionTitle}
          actionDetails={step2Action.details}
          confirmButtonText={
            step2Action.type === 'RESET_ALL'
              ? 'Xác Nhận Reset Về 0'
              : 'Xác Nhận Thay Đổi Số Dư'
          }
          variant={step2Action.type === 'RESET_ALL' ? 'danger' : 'warning'}
        />
      )}
    </div>
  );
};
