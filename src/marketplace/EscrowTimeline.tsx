import React from 'react';
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import type { BuyerOrder } from './types';
import { MARKETPLACE_HOLD_HOURS } from './marketplaceSettings';
import { escrowAutoReleaseAt } from './filterProducts';

// Dòng thời gian giữ tiền cho người mua, học từ cách làm chung của các sàn
// giữ tiền: phải nói rõ tiền đang ở đâu, khi nào được trả, và khiếu nại sẽ
// đóng băng đồng hồ. Khác với nhiều sàn: ở đây mã được giao NGAY khi mua
// (không chờ người bán giao tay), nên bước 1 là "Đã giao mã", tiền giữ chỉ
// là lớp bảo vệ sau giao mã, không phải điều kiện để giao mã.
export const EscrowTimeline: React.FC<{ order: BuyerOrder }> = ({ order }) => {
  const autoReleaseAt = escrowAutoReleaseAt(order);
  const hasOpenDispute = order.dispute_status === 'OPEN';
  const steps = [
    {
      label: 'Đã giao mã',
      done: true,
      note: 'Mã đã về đơn hàng của bạn ngay khi thanh toán.',
    },
    {
      label: 'Tiền đang giữ',
      done: order.escrow_status !== 'HELD',
      active: order.escrow_status === 'HELD' && !hasOpenDispute,
      note: hasOpenDispute
        ? 'Đang có khiếu nại mở: tiền giữ đứng yên, chờ quản trị quyết.'
        : `Tiền giữ tối đa ${MARKETPLACE_HOLD_HOURS / 24} ngày, chờ bạn xác nhận hoặc tự động trả.`,
    },
    {
      label: 'Hoàn tất',
      done: order.status === 'COMPLETED' || order.escrow_status === 'RELEASED',
      note:
        order.escrow_status === 'REFUNDED'
          ? 'Đã hoàn tiền theo quyết định khiếu nại.'
          : 'Bạn xác nhận mã dùng được, hoặc hết thời gian giữ mà không có khiếu nại.',
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="flex items-center gap-2 font-semibold text-gray-900">
        <ShieldCheck size={18} className="text-emerald-600" />
        Tiền giữ bảo vệ người mua
      </p>
      <ol className="mt-3 space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex gap-2">
            {step.done ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <Circle size={18} className="mt-0.5 shrink-0 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{step.label}</p>
              <p className="text-sm text-gray-600">{step.note}</p>
            </div>
          </li>
        ))}
      </ol>
      {order.escrow_status === 'HELD' && !hasOpenDispute && autoReleaseAt && (
        <p className="mt-3 text-sm text-gray-600">
          Dự kiến tự động trả vào khoảng{' '}
          {autoReleaseAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} nếu bạn không
          xác nhận hay khiếu nại trước đó.
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        Lưu ý: khiếu nại chỉ mở được khi tiền còn giữ. Hoàn tiền không thu hồi được mã đã giao,
        vì mã có thể đã được dùng.
      </p>
    </div>
  );
};
