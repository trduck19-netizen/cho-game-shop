import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  Eye,
  Copy,
  Check,
  DollarSign,
} from 'lucide-react';
import { DataTable, Column } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatCard } from '../components/ui/StatCard';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { adminDataService } from '../services/adminDataService';
import { AdminOrderRecord } from '../types/adminTypes';
import { formatFullDateTime } from '../../utils/textUtils';

interface OrdersModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrdersModule: React.FC<OrdersModuleProps> = ({ onShowToast }) => {
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewingOrder, setViewingOrder] = useState<AdminOrderRecord | null>(null);
  const [refundingOrder, setRefundingOrder] = useState<AdminOrderRecord | null>(null);
  const [refundReason] = useState('Mã thẻ không nạp được / Lỗi từ phía nhà phát hành');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const syncAndLoad = async () => {
      setIsLoading(true);
      try {
        await adminDataService.fetchFromCloudflareKV();
      } catch {}
      if (isMounted) {
        loadOrders();
      }
    };

    syncAndLoad();

    // Instant cross-tab sync
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('wcg_data_sync');
      channel.onmessage = (e) => {
        if (!isMounted) return;
        if (
          e.data?.type === 'ORDERS_UPDATED' ||
          e.data?.type === 'KV_DATA_PULLED' ||
          e.data?.type === 'TRANSACTIONS_UPDATED'
        ) {
          loadOrders();
        }
      };
    }

    const onDataUpdated = () => {
      if (!isMounted) return;
      loadOrders();
    };

    window.addEventListener('wcg_admin_data_updated', onDataUpdated);

    return () => {
      isMounted = false;
      channel?.close();
      window.removeEventListener('wcg_admin_data_updated', onDataUpdated);
    };
  }, [statusFilter]);

  const loadOrders = () => {
    setIsLoading(true);
    const filterObj: any = {};
    if (statusFilter !== 'ALL') filterObj.status = statusFilter;

    const data = adminDataService.getOrders(filterObj);
    setOrders(data);
    setIsLoading(false);
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      await adminDataService.fetchFromCloudflareKV();
      loadOrders();
      onShowToast('Đã làm mới dữ liệu', 'Danh sách đơn hàng đã được đồng bộ mới nhất từ Cloudflare D1.', 'success');
    } catch {
      onShowToast('Lỗi đồng bộ', 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(code);
    setTimeout(() => setCopiedKey(null), 1500);
    onShowToast('Đã copy', `Mã ${code} đã được copy.`, 'info');
  };

  const handleRefundConfirm = () => {
    if (!refundingOrder) return;
    const ok = adminDataService.refundOrder(refundingOrder.id, refundReason);
    if (ok) {
      onShowToast(
        'Hoàn tiền thành công',
        `Đã hoàn ${formatVnd(refundingOrder.amount)} vào ví cho ${refundingOrder.buyerEmail}.`,
        'success'
      );
      setRefundingOrder(null);
      loadOrders();
    }
  };

  const handleExportCsv = () => {
    const header = 'ID,OrderCode,BuyerName,BuyerEmail,ProductTitle,Amount,PaymentMethod,Status,CreatedAt\n';
    const rows = orders
      .map(
        (o) =>
          `"${o.id}","${o.orderCode}","${o.buyerName}","${o.buyerEmail}","${o.productTitle}",${o.amount},"${o.paymentMethod}","${o.status}","${o.createdAt}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_don_hang_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Xuất file thành công', 'Danh sách đơn hàng đã tải về.', 'success');
  };

  // KPIs
  const totalRevenue = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + o.amount, 0);
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
  const processingOrders = orders.filter((o) => o.status === 'PROCESSING').length;

  const columns: Column<AdminOrderRecord>[] = [
    {
      key: 'orderCode',
      header: 'Mã Đơn Hàng',
      sortable: true,
      render: (item) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.orderCode}</span>
          <p className="text-[10px] text-slate-400">ID: {item.id}</p>
        </div>
      ),
    },
    {
      key: 'buyerName',
      header: 'Khách Hàng',
      render: (item) => (
        <div className="text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200">{item.buyerName || item.buyerEmail || 'Khách hàng'}</p>
          <p className="text-[11px] text-slate-400">{item.buyerEmail || '—'}</p>
        </div>
      ),
    },
    {
      key: 'productTitle',
      header: 'Sản Phẩm Đã Mua',
      render: (item) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{item.productTitle}</p>
          <p className="text-[10px] text-slate-400 font-mono">
            {item.deliveredCodes?.length || 1} mã giao hàng
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Tổng Tiền',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
          {formatVnd(item.amount)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Phương Thức',
      render: (item) => (
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {item.paymentMethod === 'WALLET' ? 'Ví Thành Viên' : 'SePay Chuyển Khoản'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      sortable: true,
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: 'createdAt',
      header: 'Ngày Đặt',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatFullDateTime(item?.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setViewingOrder(item)}
            title="Xem chi tiết đơn"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <Eye className="h-4 w-4" />
          </button>
          {item.status === 'COMPLETED' && (
            <button
              onClick={() => {
                setRefundingOrder(item);
              }}
              title="Hoàn tiền vào ví"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3">
        <StatCard
          title="Tổng Doanh Thu Bán Hàng"
          value={formatVnd(totalRevenue)}
          icon={DollarSign}
          color="emerald"
          subtext="Các đơn hoàn thành"
        />
        <StatCard
          title="Đơn Hàng Hoàn Tất"
          value={completedOrders}
          icon={CheckCircle2}
          color="indigo"
          subtext="Giao mã thành công 100%"
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            title="Đơn Đang Xử Lý"
            value={processingOrders}
            icon={ShoppingCart}
            color="amber"
            subtext="Cần theo dõi"
          />
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={orders}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Tìm theo mã đơn, email, người mua, sản phẩm..."
        searchKeys={['orderCode', 'buyerName', 'buyerEmail', 'productTitle']}
        onRefresh={handleManualRefresh}
        onExportCsv={handleExportCsv}
        filters={[
          {
            key: 'status',
            label: 'Trạng thái',
            selectedValue: statusFilter,
            options: [
              { label: 'Tất cả trạng thái', value: 'ALL' },
              { label: 'Hoàn thành (COMPLETED)', value: 'COMPLETED' },
              { label: 'Đang xử lý (PROCESSING)', value: 'PROCESSING' },
              { label: 'Đã hoàn tiền (REFUNDED)', value: 'REFUNDED' },
              { label: 'Đã hủy (CANCELLED)', value: 'CANCELLED' },
            ],
            onChange: setStatusFilter,
          },
        ]}
      />

      {/* Order Detail Modal */}
      <FormModal
        isOpen={Boolean(viewingOrder)}
        onClose={() => setViewingOrder(null)}
        title={`Chi Tiết Đơn Hàng #${viewingOrder?.orderCode}`}
        subtitle="Thông tin khách hàng và mã số sản phẩm đã bàn giao tự động."
        maxWidth="lg"
      >
        {viewingOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/60">
              <div>
                <p className="text-slate-400">Khách Hàng</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {viewingOrder.buyerName}
                </p>
                <p className="text-slate-500">{viewingOrder.buyerEmail}</p>
                <p className="text-slate-500">{viewingOrder.buyerPhone || 'Không có SĐT'}</p>
              </div>

              <div>
                <p className="text-slate-400">Thanh Toán & Trạng Thái</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatVnd(viewingOrder.amount)}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={viewingOrder.status} size="sm" />
                  <span className="text-[11px] text-slate-500">({viewingOrder.paymentMethod})</span>
                </div>
              </div>
            </div>

            {/* Delivered Codes */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Mã Sản Phẩm Đã Bàn Giao ({viewingOrder.deliveredCodes?.length || 0})
              </h4>
              <div className="space-y-2">
                {viewingOrder.deliveredCodes && viewingOrder.deliveredCodes.length > 0 ? (
                  viewingOrder.deliveredCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{code}</span>
                      <button
                        onClick={() => handleCopy(code)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600"
                      >
                        {copiedKey === code ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span className="text-[11px]">Sao chép</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Không có mã bàn giao.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {viewingOrder.status === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={() => {
                    const o = viewingOrder;
                    setViewingOrder(null);
                    setRefundingOrder(o);
                  }}
                  className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  Hoàn Tiền Cho Khách
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </FormModal>

      {/* Refund Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(refundingOrder)}
        onClose={() => setRefundingOrder(null)}
        onConfirm={handleRefundConfirm}
        title="Xác Nhận Hoàn Tiền Đơn Hàng"
        message={
          <span>
            Bạn có chắc chắn muốn hoàn lại{' '}
            <strong className="text-rose-600 font-mono">
              {formatVnd(refundingOrder?.amount || 0)}
            </strong>{' '}
            vào ví của khách hàng <strong>{refundingOrder?.buyerEmail}</strong>? Đơn hàng sẽ đổi trạng thái sang REFUNDED.
          </span>
        }
        confirmText="Hoàn tiền ngay"
        variant="warning"
      />
    </div>
  );
};
