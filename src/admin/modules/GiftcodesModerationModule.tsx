import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { DataTable, Column } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FormModal } from '../components/ui/FormModal';
import { adminDataService } from '../services/adminDataService';
import { GiftcodeSubmission } from '../types/adminTypes';
import { formatFullDateTime } from '../../utils/textUtils';

interface GiftcodesModerationModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const GiftcodesModerationModule: React.FC<GiftcodesModerationModuleProps> = ({
  onShowToast,
}) => {
  const [submissions, setSubmissions] = useState<GiftcodeSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reject Modal State
  const [rejectingSub, setRejectingSub] = useState<GiftcodeSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Mã code không chính xác hoặc đã hết hạn.');

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter]);

  const loadSubmissions = () => {
    setIsLoading(true);
    const filterObj: any = {};
    if (statusFilter !== 'ALL') filterObj.status = statusFilter;

    const data = adminDataService.getSubmissions(filterObj);
    setSubmissions(data);
    setIsLoading(false);
  };

  const handleApprove = (id: string) => {
    const sub = submissions.find((s) => s.id === id);
    if (!sub) return;

    const updated = adminDataService.approveSubmission(id);
    if (updated) {
      onShowToast(
        'Đã duyệt thành công',
        `Mã code ${sub.codeValue} đã được đưa vào kho code công khai của ${sub.gameSlug}.`,
        'success'
      );
      loadSubmissions();
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSub) return;

    const updated = adminDataService.rejectSubmission(rejectingSub.id, rejectionReason);
    if (updated) {
      onShowToast('Đã từ chối', `Đã từ chối mã ${rejectingSub.codeValue}.`, 'info');
      setRejectingSub(null);
      setRejectionReason('Mã code không chính xác hoặc đã hết hạn.');
      loadSubmissions();
    }
  };

  const handleBulkApprove = () => {
    let count = 0;
    selectedIds.forEach((id) => {
      if (adminDataService.approveSubmission(id)) count++;
    });
    onShowToast('Thành công', `Đã phê duyệt ${count} mã giftcode.`, 'success');
    setSelectedIds([]);
    loadSubmissions();
  };

  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;

  const columns: Column<GiftcodeSubmission>[] = [
    {
      key: 'codeValue',
      header: 'Mã Đóng Góp',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 w-fit">
            {item.codeValue}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 font-semibold">
            Game: {item.gameSlug}
          </span>
        </div>
      ),
    },
    {
      key: 'submitterName',
      header: 'Người Đóng Góp',
      render: (item) => (
        <div className="text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200">{item.submitterName}</p>
          <p className="text-[11px] text-slate-400">{item.submitterEmail}</p>
        </div>
      ),
    },
    {
      key: 'rewards',
      header: 'Nội Dung / Phần Thưởng',
      render: (item) => (
        <div className="text-xs max-w-xs">
          <p className="text-slate-700 dark:text-slate-300 truncate">{item.rewards || 'Chưa ghi chú'}</p>
          {item.notes && (
            <p className="text-[10px] text-slate-400 italic truncate mt-0.5">Note: {item.notes}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      sortable: true,
      render: (item) => (
        <div>
          <StatusBadge status={item.status} size="sm" />
          {item.status === 'REJECTED' && item.rejectionReason && (
            <p className="text-[10px] text-rose-500 mt-1 truncate max-w-xs">
              Lý do: {item.rejectionReason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Thời Gian Gửi',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatFullDateTime(item?.submittedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao Tác Duyệt',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {item.status === 'PENDING' ? (
            <>
              <button
                onClick={() => handleApprove(item.id)}
                title="Phê duyệt mã & Đưa vào kho"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Duyệt</span>
              </button>
              <button
                onClick={() => setRejectingSub(item)}
                title="Từ chối mã"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
                <span>Từ chối</span>
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              {item.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Alert banner if pending items exist */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Có {pendingCount} mã code mới đang chờ bạn kiểm duyệt
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Khi phê duyệt, mã sẽ tự động xuất hiện trên trang web và cộng điểm cho người đóng góp.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        data={submissions}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Tìm kiếm mã code, tên người gửi, game..."
        searchKeys={['codeValue', 'gameSlug', 'submitterName', 'submitterEmail', 'rewards']}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRefresh={loadSubmissions}
        filters={[
          {
            key: 'status',
            label: 'Trạng thái',
            selectedValue: statusFilter,
            options: [
              { label: 'Tất cả trạng thái', value: 'ALL' },
              { label: 'Chờ duyệt (PENDING)', value: 'PENDING' },
              { label: 'Đã duyệt (APPROVED)', value: 'APPROVED' },
              { label: 'Đã từ chối (REJECTED)', value: 'REJECTED' },
            ],
            onChange: setStatusFilter,
          },
        ]}
        batchActions={[
          {
            label: 'Duyệt tất cả đã chọn',
            icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />,
            onClick: handleBulkApprove,
          },
        ]}
      />

      {/* Reject Modal with Reason Input */}
      <FormModal
        isOpen={Boolean(rejectingSub)}
        onClose={() => setRejectingSub(null)}
        title="Từ Chối Mã Giftcode"
        subtitle={`Lý do từ chối sẽ được lưu lại vào hệ thống cho mã ${rejectingSub?.codeValue}.`}
        maxWidth="md"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Lý Do Từ Chối <span className="text-rose-500">*</span>
            </label>
            <div className="mt-2 space-y-2">
              {[
                'Mã code không chính xác hoặc đã hết hạn.',
                'Game đã đóng server hoặc không hỗ trợ giftcode này.',
                'Mã code trùng lặp với code đã có trên hệ thống.',
                'Nội dung sai định dạng hoặc spam.',
              ].map((reason, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={rejectionReason === reason}
                    onChange={() => setRejectionReason(reason)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Hoặc nhập lý do khác..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setRejectingSub(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
            >
              <XCircle className="h-4 w-4" />
              <span>Xác Nhận Từ Chối</span>
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};
