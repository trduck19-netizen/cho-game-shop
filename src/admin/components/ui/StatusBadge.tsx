import React from 'react';

export type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'HOT'
  | 'MAINTENANCE'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'AVAILABLE'
  | 'SOLD'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'REFUND'
  | 'DEPOSIT'
  | 'ORDER_PAYMENT'
  | 'ADMIN_ADJUST'
  | 'REWARD'
  | 'SUCCESS'
  | 'FAILED'
  | 'INFO'
  | 'WARNING'
  | 'CRITICAL'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MODERATOR'
  | 'MEMBER'
  | 'VIP';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const statusConfig: Record<
  string,
  { bg: string; text: string; border: string; dotColor: string; defaultLabel: string }
> = {
  ACTIVE: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    defaultLabel: 'Hoạt động',
  },
  INACTIVE: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    dotColor: 'bg-slate-500',
    defaultLabel: 'Tắt / Ẩn',
  },
  HOT: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    defaultLabel: 'Nổi bật (HOT)',
  },
  MAINTENANCE: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
    defaultLabel: 'Bảo trì',
  },
  PENDING: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    defaultLabel: 'Chờ duyệt',
  },
  APPROVED: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    defaultLabel: 'Đã duyệt',
  },
  REJECTED: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
    defaultLabel: 'Từ chối',
  },
  EXPIRED: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-500/30',
    dotColor: 'bg-slate-400',
    defaultLabel: 'Hết hạn',
  },
  AVAILABLE: {
    bg: 'bg-teal-500/10 dark:bg-teal-500/15',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500/30',
    dotColor: 'bg-teal-500',
    defaultLabel: 'Còn hàng',
  },
  SOLD: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/30',
    dotColor: 'bg-purple-500',
    defaultLabel: 'Đã bán',
  },
  PROCESSING: {
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/30',
    dotColor: 'bg-sky-500',
    defaultLabel: 'Đang xử lý',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    defaultLabel: 'Hoàn thành',
  },
  CANCELLED: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    dotColor: 'bg-slate-500',
    defaultLabel: 'Đã hủy',
  },
  REFUNDED: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
    defaultLabel: 'Đã hoàn tiền',
  },
  REFUND: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    defaultLabel: 'Hoàn tiền',
  },
  DEPOSIT: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    defaultLabel: 'Nạp tiền',
  },
  ORDER_PAYMENT: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/30',
    dotColor: 'bg-indigo-500',
    defaultLabel: 'Thanh toán đơn',
  },
  ADMIN_ADJUST: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/30',
    dotColor: 'bg-purple-500',
    defaultLabel: 'Điều chỉnh ví',
  },
  REWARD: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    defaultLabel: 'Thưởng sự kiện',
  },
  SUCCESS: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    defaultLabel: 'Thành công',
  },
  FAILED: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
    defaultLabel: 'Thất bại',
  },
  UNMATCHED: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
    defaultLabel: 'Chưa khớp (Chờ đối soát)',
  },
  DUPLICATE_IDEMPOTENT: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/30',
    dotColor: 'bg-indigo-500',
    defaultLabel: 'Trùng lặp (Bỏ qua)',
  },
  IGNORED: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    dotColor: 'bg-slate-500',
    defaultLabel: 'Bỏ qua',
  },
  INFO: {
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/30',
    dotColor: 'bg-sky-500',
    defaultLabel: 'Thông tin',
  },
  WARNING: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    defaultLabel: 'Cảnh báo',
  },
  CRITICAL: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
    defaultLabel: 'Nghiêm trọng',
  },
  SUPER_ADMIN: {
    bg: 'bg-purple-500/15 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/40',
    dotColor: 'bg-purple-500',
    defaultLabel: 'Super Admin',
  },
  ADMIN: {
    bg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/40',
    dotColor: 'bg-indigo-500',
    defaultLabel: 'Admin',
  },
  MODERATOR: {
    bg: 'bg-sky-500/15 dark:bg-sky-500/20',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/40',
    dotColor: 'bg-sky-500',
    defaultLabel: 'Moderator',
  },
  MEMBER: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    dotColor: 'bg-slate-500',
    defaultLabel: 'Thành viên',
  },
  VIP: {
    bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/40',
    dotColor: 'bg-amber-500',
    defaultLabel: 'VIP Gold',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  dot = true,
}) => {
  const normKey = (status || '').toUpperCase();
  const config = statusConfig[normKey] || {
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    dotColor: 'bg-slate-500',
    defaultLabel: status,
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor} animate-pulse`} />
      )}
      {label || config.defaultLabel}
    </span>
  );
};
