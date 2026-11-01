import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
} from 'lucide-react';
import { DataTable, Column } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FormModal } from '../components/ui/FormModal';
import { adminDataService } from '../services/adminDataService';
import { SecurityLog } from '../types/adminTypes';
import { formatFullDateTime } from '../../utils/textUtils';

interface SecurityLogsModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const SecurityLogsModule: React.FC<SecurityLogsModuleProps> = ({ onShowToast }) => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [severityFilter]);

  const loadLogs = () => {
    setIsLoading(true);
    const filterObj: any = {};
    if (severityFilter !== 'ALL') filterObj.severity = severityFilter;

    const data = adminDataService.getSecurityLogs(filterObj);
    setLogs(data);
    setIsLoading(false);
  };

  const handleExportCsv = () => {
    const header = 'ID,Timestamp,ActorName,ActorEmail,Action,TargetId,Severity,IPAddress,Details\n';
    const rows = logs
      .map(
        (l) =>
          `"${l.id}","${l.createdAt}","${l.actorName}","${l.actorEmail}","${l.action}","${l.targetId || ''}","${l.severity}","${l.ipAddress || ''}","${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nhat_ky_bao_mat_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Đã xuất file log', 'File CSV nhật ký bảo mật đã được tải về máy an toàn.', 'success');
  };

  const columns: Column<SecurityLog>[] = [
    {
      key: 'createdAt',
      header: 'Thời Gian',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatFullDateTime(item?.createdAt)}
        </span>
      ),
    },
    {
      key: 'actorName',
      header: 'Người Thực Hiện (Actor)',
      sortable: true,
      render: (item) => (
        <div className="text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200">{item.actorName}</p>
          <p className="text-[11px] text-slate-400">{item.actorEmail}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Hành Động Hệ Thống',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {item.action}
        </span>
      ),
    },
    {
      key: 'targetId',
      header: 'Đối Tượng Tác Động',
      render: (item) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {item.targetId || 'SYSTEM_GLOBAL'}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Mức Độ',
      sortable: true,
      render: (item) => <StatusBadge status={item.severity} size="sm" />,
    },
    {
      key: 'ipAddress',
      header: 'Địa Chỉ IP',
      render: (item) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {item.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Chi Tiết Payload',
      render: (item) => (
        <button
          onClick={() => setSelectedLog(item)}
          className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Xem JSON
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Sổ Nhật Ký Bất Biến (Immutable Audit Trail)
            </h3>
            <p className="text-xs text-slate-500">
              Mọi hành vi chỉnh sửa cơ sở dữ liệu, phân quyền và điều chỉnh ví đều được lưu vết vĩnh viễn.
            </p>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={logs}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Tìm theo hành động, người thực hiện, IP, đối tượng..."
        searchKeys={['action', 'actorName', 'actorEmail', 'ipAddress', 'targetId']}
        onRefresh={loadLogs}
        onExportCsv={handleExportCsv}
        filters={[
          {
            key: 'severity',
            label: 'Mức độ',
            selectedValue: severityFilter,
            options: [
              { label: 'Tất cả mức độ', value: 'ALL' },
              { label: 'Thông tin (INFO)', value: 'INFO' },
              { label: 'Cảnh báo (WARNING)', value: 'WARNING' },
              { label: 'Nghiêm trọng (CRITICAL)', value: 'CRITICAL' },
            ],
            onChange: setSeverityFilter,
          },
        ]}
      />

      {/* Detail JSON Modal */}
      <FormModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Chi Tiết Nhật Ký: ${selectedLog?.action || ''}`}
        subtitle={`Ghi nhận lúc: ${formatFullDateTime(selectedLog?.createdAt)}`}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl dark:bg-slate-800/60">
              <div>
                <span className="text-slate-400">Người thực hiện:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedLog.actorName} ({selectedLog.actorEmail})
                </p>
              </div>
              <div>
                <span className="text-slate-400">Địa chỉ IP & Mức độ:</span>
                <p className="font-mono text-slate-800 dark:text-slate-200">
                  {selectedLog.ipAddress} • {selectedLog.severity}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dữ Liệu Payload (Metadata JSON):
              </p>
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-64">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
};
