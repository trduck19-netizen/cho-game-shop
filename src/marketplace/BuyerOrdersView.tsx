import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquareWarning } from 'lucide-react';
import type { BuyerOrder } from './types';
import { formatCore, parseDeliveredCodes } from './filterProducts';
import { confirmMarketplaceOrder, openMarketplaceDispute } from './marketplaceApi';
import { DeliveredCodesBox } from './DeliveredCodesBox';
import { EscrowTimeline } from './EscrowTimeline';

// Trang đơn hàng của người mua.
// Học từ cách làm chung của các sàn: trang đơn phải trả lời ngay 3 câu —
// mã của tôi đâu, tiền của tôi đang ở đâu, và mã lỗi thì làm gì. Vì vậy mỗi
// đơn mở ra là thấy mã đã giao (che sẵn), dòng thời gian giữ tiền, nút xác
// nhận và nút mở khiếu nại đặt cạnh nhau, kèm cảnh báo: bấm xác nhận là
// xong, không mở khiếu nại được nữa.
// GIỚI HẠN HIỆN TẠI (cần khối API bổ sung, xem README): API đợt 1+2 chưa
// có đường GET danh sách đơn của người mua, nên component này NHẬN đơn qua
// props (đơn vừa tạo xong từ MarketplaceProductDetail, hoặc đơn do khối
// khác truyền vào sau khi có đường GET). Component không tự bịa đơn nào,
// không đọc đơn từ localStorage — kho đơn thật chỉ nằm ở máy chủ.
export const BuyerOrdersView: React.FC<{
  orders: BuyerOrder[];
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onOrdersChanged?: (orders: BuyerOrder[]) => void;
}> = ({ orders, isLoggedIn, onOpenAuth, onOrdersChanged }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isLoggedIn) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
        <p className="mt-2 text-gray-600">
          Bạn cần đăng nhập để xem đơn hàng sàn và mã đã giao.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-4 rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white"
        >
          Đăng nhập
        </button>
      </section>
    );
  }

  const updateOrder = (orderId: string, patch: Partial<BuyerOrder>) => {
    onOrdersChanged?.(orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
  };

  const confirm = async (order: BuyerOrder) => {
    setBusyId(order.id);
    setError('');
    setMessage('');
    try {
      await confirmMarketplaceOrder(order.id);
      updateOrder(order.id, { status: 'COMPLETED', escrow_status: 'RELEASED' });
      setMessage(`Đã xác nhận đơn ${order.id}. Tiền giữ đã chuyển cho người bán.`);
    } catch (err: any) {
      setError(err?.message || 'Xác nhận đơn thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const openDispute = async (order: BuyerOrder) => {
    if (!disputeReason.trim()) {
      setError('Vui lòng ghi rõ lý do khiếu nại (ví dụ: mã đã có người dùng, mã sai game).');
      return;
    }
    setBusyId(order.id);
    setError('');
    setMessage('');
    try {
      await openMarketplaceDispute({
        order_id: order.id,
        reason: disputeReason.trim(),
        evidence_text: disputeEvidence.trim(),
      });
      updateOrder(order.id, { dispute_status: 'OPEN' });
      setDisputeOrderId(null);
      setDisputeReason('');
      setDisputeEvidence('');
      setMessage(
        `Đã mở khiếu nại cho đơn ${order.id}. Tiền giữ sẽ đứng yên chờ quản trị quyết.`,
      );
    } catch (err: any) {
      setError(err?.message || 'Mở khiếu nại thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (order: BuyerOrder): string => {
    if (order.dispute_status === 'OPEN') return 'Đang khiếu nại';
    if (order.status === 'COMPLETED') return 'Đã hoàn tất';
    if (order.status === 'CANCELLED') return 'Đã hủy / hoàn tiền';
    return 'Chờ xác nhận — tiền đang giữ';
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
      <p className="mt-1 text-sm text-gray-600">
        Mã dùng một lần được giao ngay khi mua. Hãy nhập mã trước, thấy mã dùng được mới bấm xác
        nhận. Bấm xác nhận rồi thì không mở khiếu nại được nữa.
      </p>
      {message && (
        <p className="mt-4 flex items-center gap-1 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {message}
        </p>
      )}
      {error && (
        <p className="mt-4 flex items-center gap-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} /> {error}
        </p>
      )}
      {orders.length === 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-gray-700">Bạn chưa có đơn sàn nào hiển thị ở đây.</p>
          <p className="mt-1 text-sm text-gray-500">
            Đơn vừa mua xong sẽ hiện ngay tại đây. Để xem lại toàn bộ đơn cũ sau khi tải lại
            trang, cần đường lấy danh sách đơn của người mua ở phía máy chủ — phần này đang chờ
            khối API bổ sung, giao diện đã sẵn sàng nhận danh sách đó qua props.
          </p>
        </div>
      )}
      <ul className="mt-6 space-y-4">
        {orders.map((order) => {
          const codes = parseDeliveredCodes(order);
          const expanded = expandedId === order.id;
          const canAct = order.escrow_status === 'HELD' && order.dispute_status !== 'OPEN';
          return (
            <li key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : order.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              >
                <span>
                  <span className="font-semibold text-gray-900">{order.product_title}</span>
                  <span className="block text-sm text-gray-500">
                    Đơn {order.id} · {order.quantity} mã · {formatCore(order.total_amount)}
                  </span>
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {statusLabel(order)}
                </span>
              </button>
              {expanded && (
                <div className="mt-4 space-y-4">
                  <DeliveredCodesBox codes={codes} />
                  <EscrowTimeline order={order} />
                  {canAct && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => confirm(order)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
                      >
                        <CheckCircle2 size={16} />
                        {busyId === order.id ? 'Đang xử lý…' : 'Xác nhận mã dùng được'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisputeOrderId(order.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700"
                      >
                        <MessageSquareWarning size={16} /> Mở khiếu nại
                      </button>
                    </div>
                  )}
                  {!canAct && order.escrow_status === 'HELD' && (
                    <p className="text-sm text-gray-600">
                      Đơn đang có khiếu nại mở. Tiền giữ đứng yên cho tới khi quản trị quyết, bạn
                      không cần bấm gì thêm.
                    </p>
                  )}
                  {disputeOrderId === order.id && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <h3 className="font-semibold text-red-900">Mở khiếu nại</h3>
                      <p className="mt-1 text-sm text-red-800">
                        Ghi rõ mã nào lỗi và lỗi ra sao để quản trị đối chiếu. Lưu ý: hoàn tiền
                        không thu hồi được mã đã giao, vì mã có thể đã được dùng.
                      </p>
                      <input
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Lý do khiếu nại, ví dụ: mã đã có người dùng"
                        className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
                      />
                      <textarea
                        value={disputeEvidence}
                        onChange={(e) => setDisputeEvidence(e.target.value)}
                        placeholder="Bằng chứng thêm (không bắt buộc): thông báo lỗi khi nhập mã, thời gian nhập…"
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
                        rows={3}
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => openDispute(order)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
                        >
                          Gửi khiếu nại
                        </button>
                        <button
                          type="button"
                          onClick={() => setDisputeOrderId(null)}
                          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
