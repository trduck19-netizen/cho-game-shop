import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Wallet,
  UserCheck,
  UserX,
  Save,
  Users,
  Crown,
  Coins,
  TrendingUp,
  KeyRound,
} from 'lucide-react';
import { DataTable, Column } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Step2VerificationModal } from '../components/ui/Step2VerificationModal';
import { adminDataService } from '../services/adminDataService';
import { MemberRecord, UserRole } from '../types/adminTypes';
import { formatCore } from '../../utils/textUtils';
import { generateSalt, hashPassword } from '../../utils/cryptoUtils';

interface MembersModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const MembersModule: React.FC<MembersModuleProps> = ({ onShowToast }) => {
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Wallet adjustment modal state
  const [adjustingMember, setAdjustingMember] = useState<MemberRecord | null>(null);
  const [adjAmount, setAdjAmount] = useState<number>(50000);
  const [adjType, setAdjType] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [adjReason, setAdjReason] = useState('Thưởng sự kiện thành viên tích cực');

  // Step 2 Security Verification (2FA Confirmation)
  const [step2Action, setStep2Action] = useState<{
    member: MemberRecord;
    amount: number;
    reason: string;
  } | null>(null);

  // Change Role modal state
  const [roleChangingMember, setRoleChangingMember] = useState<MemberRecord | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('MEMBER');

  // Ban modal state
  const [banningMember, setBanningMember] = useState<MemberRecord | null>(null);
  const [banReason] = useState('Vi phạm chính sách cộng đồng');

  // Reset Member Password modal state
  const [resetPassMember, setResetPassMember] = useState<MemberRecord | null>(null);
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Load members data memoized
  const members = useMemo(() => {
    const filterObj: any = {};
    if (roleFilter !== 'ALL') filterObj.role = roleFilter;
    if (statusFilter !== 'ALL') filterObj.status = statusFilter;
    return adminDataService.getMembers(filterObj);
  }, [roleFilter, statusFilter, refreshTrigger]);

  // Initial load & Instant Realtime Sync from Cloudflare KV & BroadcastChannel
  useEffect(() => {
    let isMounted = true;
    let prevMemberCount = adminDataService.getMembers().length;

    const loadFromKV = async (silent = false) => {
      try {
        if (!silent) setIsLoading(true);
        await adminDataService.fetchFromCloudflareKV();
        if (isMounted) {
          const currentList = adminDataService.getMembers();
          if (currentList.length > prevMemberCount) {
            const newest = currentList[0];
            if (newest && !silent) {
              onShowToast(
                'Thành viên mới vừa đăng ký!',
                `${newest.displayName} (${newest.email || newest.phone || newest.id}) vừa tạo tài khoản trên web.`,
                'success'
              );
            }
          }
          prevMemberCount = currentList.length;
          setRefreshTrigger((prev) => prev + 1);
        }
      } catch {} finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // 1. Initial fetch
    loadFromKV(true);

    // 2. BroadcastChannel for cross-tab instant notification (0ms delay)
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('wcg_data_sync');
      channel.onmessage = (e) => {
        if (!isMounted) return;
        if (e.data?.type === 'MEMBER_REGISTERED') {
          const newMember = e.data.payload || e.data.user;
          onShowToast(
            'Thành viên mới đăng ký!',
            `${newMember?.displayName || newMember?.username || 'Khách hàng'} (${newMember?.email || 'Mới'}) vừa tạo tài khoản.`,
            'success'
          );
          setRefreshTrigger((prev) => prev + 1);
        } else if (e.data?.type === 'MEMBERS_UPDATED' || e.data?.type === 'KV_DATA_PULLED') {
          setRefreshTrigger((prev) => prev + 1);
        }
      };
    }

    // 3. Listen to same-window custom events
    const onSync = (e: any) => {
      if (!isMounted) return;
      if (e?.detail?.type === 'MEMBERS_UPDATED' || e?.detail?.type === 'MEMBER_REGISTERED') {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    const onUserRegistered = (e: any) => {
      if (!isMounted) return;
      const m = e?.detail?.member || e?.detail?.user;
      if (m) {
        onShowToast(
          'Thành viên mới đăng ký!',
          `${m.displayName || m.username || 'Khách hàng'} (${m.email || 'Mới'}) vừa tạo tài khoản.`,
          'success'
        );
      }
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener('wcg_admin_data_updated', onSync);
    window.addEventListener('wcg_user_registered', onUserRegistered);
    window.addEventListener('storage', (e) => {
      if (e.key?.includes('member') || e.key?.includes('user')) {
        setRefreshTrigger((prev) => prev + 1);
      }
    });

    return () => {
      isMounted = false;
      if (channel) channel.close();
      window.removeEventListener('wcg_admin_data_updated', onSync);
      window.removeEventListener('wcg_user_registered', onUserRegistered);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      await adminDataService.fetchFromCloudflareKV();
      setRefreshTrigger((prev) => prev + 1);
      const count = adminDataService.getMembers().length;
      onShowToast('Đã làm mới dữ liệu', `Đã đồng bộ thành công ${count} thành viên từ Cloudflare D1.`, 'success');
    } catch {
      onShowToast('Lỗi đồng bộ', 'Không thể kết nối đến Cloudflare D1.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  // Metrics Calculations (Defensive)
  const allMembers = useMemo(() => adminDataService.getMembers(), [refreshTrigger]);
  const totalMembersCount = allMembers.length;
  const vipMembersCount = allMembers.filter((m) => m && (m.role === 'VIP' || m.role === 'SUPER_ADMIN')).length;
  const totalSystemBalance = allMembers.reduce((sum, m) => sum + (Number(m?.balance) || 0), 0);
  const totalSystemSpent = allMembers.reduce((sum, m) => sum + (Number(m?.totalSpent) || 0), 0);

  const handleAdjustWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMember) return;

    const amount = adjType === 'ADD' ? Math.abs(adjAmount) : -Math.abs(adjAmount);
    // Open Step 2 Security Verification Modal
    setStep2Action({
      member: adjustingMember,
      amount,
      reason: adjReason,
    });
  };

  const handleStep2Success = () => {
    if (!step2Action) return;
    const { member, amount, reason } = step2Action;
    const updated = adminDataService.adjustMemberBalance(member.id, amount, reason);

    if (updated) {
      onShowToast(
        'Đã điều chỉnh số dư ví',
        `Xác thực bước 2 thành công! Số dư của ${member.displayName} hiện là ${formatVnd(updated.balance)}.`,
        'success'
      );
      setAdjustingMember(null);
      setStep2Action(null);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleChangeRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleChangingMember) return;

    const updated = adminDataService.updateMember(roleChangingMember.id, { role: newRole });
    if (updated) {
      onShowToast('Cập nhật vai trò', `Đã chuyển vai trò của ${updated.displayName} sang ${newRole}.`, 'success');
      setRoleChangingMember(null);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleBanToggleConfirm = () => {
    if (!banningMember) return;

    if (banningMember.status === 'ACTIVE') {
      adminDataService.banMember(banningMember.id, banReason);
      onShowToast('Đã khóa tài khoản', `Tài khoản ${banningMember.displayName} đã bị vô hiệu hóa.`, 'info');
    } else {
      adminDataService.unbanMember(banningMember.id);
      onShowToast('Đã mở khóa tài khoản', `Tài khoản ${banningMember.displayName} đã hoạt động trở lại.`, 'success');
    }
    setBanningMember(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleResetMemberPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassMember) return;
    if (newMemberPassword.length < 6) {
      onShowToast('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      const salt = generateSalt(16);
      const passwordHash = await hashPassword(newMemberPassword, salt);
      const updated = adminDataService.updateMember(resetPassMember.id, {
        salt,
        passwordHash,
      });

      if (updated) {
        await adminDataService.pushToCloudflareKV();
        onShowToast(
          'Đã đổi mật khẩu thành viên',
          `Mật khẩu mới cho tài khoản ${resetPassMember.displayName} đã được lưu thành công.`,
          'success'
        );
        setResetPassMember(null);
        setNewMemberPassword('');
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      onShowToast('Lỗi', 'Không thể đổi mật khẩu cho thành viên.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const columns: Column<MemberRecord>[] = [
    {
      key: 'displayName',
      header: 'Thành Viên',
      sortable: true,
      render: (item) => {
        const name = item?.displayName || item?.id || 'Khách hàng';
        const email = item?.email || 'Chưa cập nhật email';
        const avatarUrl =
          item?.avatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}&backgroundColor=0b0d19,16192e,241a45`;
        return (
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt={name}
              className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=fallback`;
              }}
            />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{name}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {email} {item?.phone ? `• ${item.phone}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Vai Trò (Role)',
      sortable: true,
      render: (item) => <StatusBadge status={item?.role || 'MEMBER'} size="sm" />,
    },
    {
      key: 'balance',
      header: 'Số Dư Core Khả Dụng',
      sortable: true,
      render: (item) => {
        const bal = Number(item?.balance) || 0;
        return (
          <div>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
              {formatCore(bal)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ~{formatVnd(bal)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'totalSpent',
      header: 'Tổng Core Đã Mua',
      sortable: true,
      render: (item) => {
        const spent = Number(item?.totalSpent) || 0;
        return (
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {formatCore(spent)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      sortable: true,
      render: (item) => <StatusBadge status={item?.status || 'ACTIVE'} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Thao Tác Quản Trị',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setAdjustingMember(item);
              setAdjAmount(50000);
            }}
            title="Điều chỉnh số dư ví (Nạp / Trừ)"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-500" />
            <span>Ví</span>
          </button>
          <button
            onClick={() => {
              setRoleChangingMember(item);
              setNewRole((item?.role as UserRole) || 'MEMBER');
            }}
            title="Đổi phân quyền"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Shield className="h-3.5 w-3.5 text-indigo-500" />
            <span>Quyền</span>
          </button>
          <button
            onClick={() => {
              setResetPassMember(item);
              setNewMemberPassword('');
            }}
            title="Đổi mật khẩu tài khoản"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
            <span>Pass</span>
          </button>
          <button
            onClick={() => setBanningMember(item)}
            title={item?.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
            className={`rounded-lg p-1.5 cursor-pointer ${
              item?.status === 'ACTIVE'
                ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400'
            }`}
          >
            {item?.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Customer / Member KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Khách Hàng / Thành Viên"
          value={totalMembersCount}
          subtext="Đồng bộ tự động 24/7 từ web khách"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Khách Hàng VIP & Nạp Tiền"
          value={vipMembersCount}
          subtext="Tài khoản nạp Core & thành viên uy tín"
          icon={Crown}
          color="amber"
        />
        <StatCard
          title="Tổng Số Dư Ví Toàn Hệ Thống"
          value={formatCore(totalSystemBalance)}
          subtext={`~${formatVnd(totalSystemBalance)}`}
          icon={Coins}
          color="emerald"
        />
        <StatCard
          title="Tổng Core Đã Mua / Tiêu Thụ"
          value={formatCore(totalSystemSpent)}
          subtext={`~${formatVnd(totalSystemSpent)}`}
          icon={TrendingUp}
          color="sky"
        />
      </div>

      <DataTable
        data={members}
        columns={columns}
        keyExtractor={(item) => item?.id || `usr_${Math.random()}`}
        isLoading={isLoading}
        searchPlaceholder="Tìm theo tên hiển thị, email, số điện thoại, ID tài khoản..."
        searchKeys={['displayName', 'email', 'phone', 'id']}
        onRefresh={handleManualRefresh}
        filters={[
          {
            key: 'role',
            label: 'Vai trò',
            selectedValue: roleFilter,
            options: [
              { label: 'Tất cả vai trò', value: 'ALL' },
              { label: 'Super Admin', value: 'SUPER_ADMIN' },
              { label: 'Admin', value: 'ADMIN' },
              { label: 'Moderator', value: 'MODERATOR' },
              { label: 'VIP Gold', value: 'VIP' },
              { label: 'Thành viên', value: 'MEMBER' },
            ],
            onChange: setRoleFilter,
          },
          {
            key: 'status',
            label: 'Trạng thái',
            selectedValue: statusFilter,
            options: [
              { label: 'Tất cả trạng thái', value: 'ALL' },
              { label: 'Hoạt động (ACTIVE)', value: 'ACTIVE' },
              { label: 'Bị khóa (BANNED)', value: 'BANNED' },
            ],
            onChange: setStatusFilter,
          },
        ]}
      />

      {/* Adjust Wallet Balance Modal */}
      <FormModal
        isOpen={Boolean(adjustingMember)}
        onClose={() => setAdjustingMember(null)}
        title={`Điều Chỉnh Số Dư Ví: ${adjustingMember?.displayName || adjustingMember?.id}`}
        subtitle="Mọi thay đổi số dư sẽ được ghi nhận vào Sổ Cái Tài Chính (Ledger) và Nhật Ký Bảo Mật."
        maxWidth="md"
      >
        <form onSubmit={handleAdjustWalletSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
            <p className="text-slate-500 dark:text-slate-400">Số dư hiện tại:</p>
            <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatVnd(Number(adjustingMember?.balance) || 0)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdjType('ADD')}
              className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                adjType === 'ADD'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              + Cộng Tiền Số Dư
            </button>
            <button
              type="button"
              onClick={() => setAdjType('SUBTRACT')}
              className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                adjType === 'SUBTRACT'
                  ? 'bg-rose-600 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              - Trừ Tiền Số Dư
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
              Lý Do Điều Chỉnh <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="VD: Thưởng sự kiện / Hoàn tiền đơn lỗi"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAdjustingMember(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Xác Nhận Thay Đổi Số Dư</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Change Role Modal */}
      <FormModal
        isOpen={Boolean(roleChangingMember)}
        onClose={() => setRoleChangingMember(null)}
        title={`Thay Đổi Vai Trò: ${roleChangingMember?.displayName || roleChangingMember?.id}`}
        maxWidth="sm"
      >
        <form onSubmit={handleChangeRoleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chọn Vai Trò Mới
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="MEMBER">Thành viên thông thường</option>
              <option value="VIP">VIP Gold (Ưu đãi nạp & code)</option>
              <option value="MODERATOR">Moderator (Kiểm duyệt code)</option>
              <option value="ADMIN">Admin (Quản lý nội dung & kho)</option>
              <option value="SUPER_ADMIN">Super Admin (Toàn quyền)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setRoleChangingMember(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Lưu Phân Quyền</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Ban / Unban Modal */}
      <ConfirmModal
        isOpen={Boolean(banningMember)}
        onClose={() => setBanningMember(null)}
        onConfirm={handleBanToggleConfirm}
        title={banningMember?.status === 'ACTIVE' ? 'Khóa Tài Khoản Thành Viên' : 'Mở Khóa Tài Khoản'}
        message={
          banningMember?.status === 'ACTIVE' ? (
            <span>
              Bạn có chắc chắn muốn khóa tài khoản{' '}
              <strong className="text-rose-600 dark:text-rose-400">{banningMember.displayName || banningMember.id}</strong>? Thành viên sẽ không thể đăng nhập, nhận code hay thực hiện giao dịch ví.
            </span>
          ) : (
            <span>
              Xác nhận kích hoạt lại tài khoản cho{' '}
              <strong>{banningMember?.displayName || banningMember?.id}</strong>.
            </span>
          )
        }
        confirmText={banningMember?.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa ngay'}
        variant={banningMember?.status === 'ACTIVE' ? 'danger' : 'success'}
      />

      {/* Step 2 Security Verification (2FA Confirmation) */}
      {step2Action && (
        <Step2VerificationModal
          isOpen={Boolean(step2Action)}
          onClose={() => setStep2Action(null)}
          onSuccess={handleStep2Success}
          title="Xác Minh Bước 2: Điều Chỉnh Số Dư Ví"
          actionTitle={`Điều chỉnh số dư ví cho ${step2Action.member.displayName || step2Action.member.id}`}
          actionDetails={
            <div className="space-y-1">
              <p>
                Thành viên: <strong>{step2Action.member.displayName}</strong> ({step2Action.member.email || step2Action.member.id})
              </p>
              <p>
                Biến động:{' '}
                <strong className={step2Action.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>
                  {step2Action.amount >= 0 ? '+' : ''}{formatVnd(step2Action.amount)}
                </strong>
              </p>
              <p>
                Số dư sau điều chỉnh:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {formatVnd(Math.max(0, (Number(step2Action.member.balance) || 0) + step2Action.amount))}
                </strong>{' '}
                <span className="text-slate-400 text-[10px]">(Trước: {formatVnd(step2Action.member.balance)})</span>
              </p>
              <p>
                Lý do: <em>{step2Action.reason}</em>
              </p>
            </div>
          }
          confirmButtonText="Xác Nhận Thay Đổi Số Dư"
          variant="warning"
        />
      )}

      {/* Reset Member Password Modal */}
      <FormModal
        isOpen={Boolean(resetPassMember)}
        onClose={() => setResetPassMember(null)}
        title={`Đổi Mật Khẩu Thành Viên: ${resetPassMember?.displayName || resetPassMember?.id}`}
        subtitle="Mật khẩu mới sẽ được mã hóa và cập nhật trực tiếp vào cơ sở dữ liệu để thành viên có thể đăng nhập."
        maxWidth="sm"
      >
        <form onSubmit={handleResetMemberPasswordSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Mật Khẩu Mới (Tối thiểu 6 ký tự) <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newMemberPassword}
              onChange={(e) => setNewMemberPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setResetPassMember(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isResettingPassword}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isResettingPassword ? 'Đang lưu...' : 'Lưu Mật Khẩu Mới'}</span>
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};
