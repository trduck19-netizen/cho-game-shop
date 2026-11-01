import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Globe,
  Save,
  Clock,
  Calendar,
} from 'lucide-react';
import { DataTable, Column } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { FormModal } from '../components/ui/FormModal';
import { SearchableGameSelect } from '../components/ui/SearchableGameSelect';
import { adminDataService } from '../services/adminDataService';
import { FreeCodeRecord, GameAdminRecord } from '../types/adminTypes';
import { smartVietnameseMatch } from '../../utils/textUtils';

interface FreeCodesModuleProps {
  initialGameSlug?: string;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const FreeCodesModule: React.FC<FreeCodesModuleProps> = ({
  initialGameSlug,
  onShowToast,
}) => {
  const [codes, setCodes] = useState<FreeCodeRecord[]>([]);
  const [games, setGames] = useState<GameAdminRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gameFilter, setGameFilter] = useState(initialGameSlug || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Vừa xong');

  // Fast game lookup map for Vietnamese game names, categories, publishers
  const gamesMap = React.useMemo(() => {
    const map = new Map<string, GameAdminRecord>();
    games.forEach((g) => {
      if (g.slug) map.set(g.slug.toLowerCase(), g);
      if (g.id) map.set(g.id.toLowerCase(), g);
    });
    return map;
  }, [games]);

  // Add / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<Partial<FreeCodeRecord> | null>(null);

  // Bulk Import Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkGameSlug, setBulkGameSlug] = useState('');
  const [bulkRawText, setBulkRawText] = useState('');

  // Delete Modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingCode, setDeletingCode] = useState<FreeCodeRecord | null>(null);

  // Bulk Delete Modal
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  useEffect(() => {
    setGames(adminDataService.getGames());

    const handleSyncGames = () => {
      setGames(adminDataService.getGames());
    };

    window.addEventListener('wcg_admin_data_updated', handleSyncGames);
    window.addEventListener('storage', handleSyncGames);
    return () => {
      window.removeEventListener('wcg_admin_data_updated', handleSyncGames);
      window.removeEventListener('storage', handleSyncGames);
    };
  }, []);

  useEffect(() => {
    loadCodes();

    const handleSync = () => {
      loadCodes();
    };

    window.addEventListener('wcg_admin_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('wcg_admin_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [gameFilter, statusFilter]);

  const loadCodes = () => {
    setIsLoading(true);
    const filterObj: any = {};
    if (gameFilter !== 'ALL') filterObj.gameSlug = gameFilter;
    if (statusFilter !== 'ALL') filterObj.status = statusFilter;

    const data = adminDataService.getFreeCodes(filterObj);
    const sorted = [...data].sort((a: any, b: any) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    setCodes(sorted);
    setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setIsLoading(false);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    onShowToast('Đã sao chép', `Mã ${code} đã được lưu vào clipboard.`, 'info');
  };

  const handleCreateNew = () => {
    const defaultGame = gameFilter !== 'ALL' ? gameFilter : (games[0]?.slug || '');
    setEditingCode({
      id: '',
      gameSlug: defaultGame,
      codeValue: '',
      rewards: '100 Kim Cương, 50k Vàng, Rương Trang Bị SSR',
      status: 'ACTIVE',
      expiresAt: '',
      isVerified: true,
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleEdit = (c: FreeCodeRecord) => {
    setEditingCode({ ...c });
    setIsFormOpen(true);
  };

  const handleSaveCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode || !editingCode.codeValue?.trim() || !editingCode.gameSlug) {
      onShowToast('Lỗi', 'Vui lòng nhập mã code và chọn game.', 'error');
      return;
    }

    try {
      if (editingCode.id && codes.some((c) => c.id === editingCode.id)) {
        adminDataService.updateFreeCode(editingCode.id, editingCode);
        onShowToast('Thành công', 'Đã cập nhật mã giftcode.', 'success');
      } else {
        adminDataService.createFreeCode(editingCode as any);
        onShowToast('Thành công', 'Đã thêm mã giftcode mới vào kho.', 'success');
      }

      setIsFormOpen(false);
      setEditingCode(null);
      loadCodes();
    } catch (err: any) {
      onShowToast('Thất bại', err?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleDeleteConfirm = () => {
    if (!deletingCode) return;
    const ok = adminDataService.deleteFreeCode(deletingCode.id);
    if (ok) {
      onShowToast('Đã xóa', 'Mã code đã được gỡ bỏ.', 'success');
      setIsDeleteOpen(false);
      setDeletingCode(null);
      loadCodes();
    }
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedIds.length === 0) return;
    const count = adminDataService.deleteFreeCodesBulk(selectedIds);
    onShowToast('Đã xóa thành công', `Đã xóa vĩnh viễn ${count} mã giftcode đã chọn.`, 'success');
    setSelectedIds([]);
    setIsBulkDeleteOpen(false);
    loadCodes();
  };

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkGameSlug || !bulkRawText.trim()) {
      onShowToast('Lỗi', 'Vui lòng chọn game và nhập danh sách mã code.', 'error');
      return;
    }

    const lines = bulkRawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const itemsToImport: Array<{ code: string; rewards?: string; expiresAt?: string }> = [];

    for (const line of lines) {
      const parts = line.split(/[|,\t-]+/).map((p) => p.trim());
      const code = parts[0];
      const rewards = parts[1] || 'Quà tặng tân thủ';
      const expiresAt = parts[2] ? parts[2].trim() : '';
      if (code) {
        itemsToImport.push({ code, rewards, expiresAt });
      }
    }

    const result = adminDataService.bulkImportCodes(bulkGameSlug, itemsToImport);
    onShowToast(
      'Nhập hàng loạt thành công',
      `Đã nạp ${result.imported} mã mới, bỏ qua ${result.duplicates} mã trùng lặp.`,
      'success'
    );

    setIsBulkOpen(false);
    setBulkRawText('');
    loadCodes();
  };

  const handleBulkStatus = (status: 'ACTIVE' | 'EXPIRED') => {
    let count = 0;
    selectedIds.forEach((id) => {
      if (adminDataService.updateFreeCode(id, { status })) count++;
    });
    onShowToast('Thành công', `Đã cập nhật ${count} mã sang ${status}.`, 'success');
    setSelectedIds([]);
    loadCodes();
  };

  const handleExportCsv = () => {
    const header = 'ID,GameSlug,CodeValue,Rewards,Status,ExpiresAt,CopyCount\n';
    const rows = codes
      .map(
        (c) =>
          `"${c.id}","${c.gameSlug}","${c.codeValue}","${c.rewards}","${c.status}","${c.expiresAt || ''}",${c.copyCount || 0}`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_free_codes_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Xuất file thành công', 'Danh sách code đã được tải về.', 'success');
  };

  // Table Columns
  const columns: Column<FreeCodeRecord>[] = [
    {
      key: 'codeValue',
      header: 'Mã Giftcode',
      sortable: true,
      render: (item) => {
        const displayCode = item.codeValue || (item as any).code || '';
        return (
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 max-w-[120px] truncate"
              title={displayCode}
            >
              {displayCode}
            </span>
            <button
              onClick={() => handleCopyCode(displayCode, item.id)}
              title="Sao chép mã"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 shrink-0"
            >
              {copiedId === item.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        );
      },
    },
    {
      key: 'gameSlug',
      header: 'Game',
      sortable: true,
      render: (item) => {
        const game = gamesMap.get(item.gameSlug?.toLowerCase());
        const gameName = game?.name || item.gameSlug;
        return (
          <div className="flex flex-col max-w-[130px] lg:max-w-[160px]">
            <span
              className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
              title={gameName}
            >
              {gameName}
            </span>
            <span
              className="font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate"
              title={item.gameSlug}
            >
              {item.gameSlug}
            </span>
          </div>
        );
      },
    },
    {
      key: 'rewards',
      header: 'Phần Thưởng',
      render: (item) => (
        <span
          className="text-xs text-slate-600 dark:text-slate-400 max-w-[130px] lg:max-w-[170px] xl:max-w-[210px] truncate block"
          title={item.rewards}
        >
          {item.rewards}
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
      key: 'expiresAt',
      header: 'Hạn Dùng',
      render: (item) => (
        <div className="text-xs whitespace-nowrap">
          {item.expiresAt ? (
            <p className="font-mono text-slate-600 dark:text-slate-300">
              {item.expiresAt}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Chưa rõ hạn dùng
            </p>
          )}
          <p className="text-[10px] text-slate-400">
            {item.copyCount || 0} lượt copy
          </p>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Cập Nhật',
      sortable: true,
      render: (item) => {
        const timeStr = item.updatedAt || item.createdAt;
        if (!timeStr) {
          return (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              Gốc
            </span>
          );
        }
        try {
          const d = new Date(timeStr);
          if (isNaN(d.getTime())) {
            return <span className="text-[11px] text-slate-400 font-mono">{timeStr}</span>;
          }
          return (
            <div className="flex flex-col text-xs leading-tight whitespace-nowrap">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {d.toLocaleDateString('vi-VN')}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                <Clock className="w-2.5 h-2.5 text-indigo-400 shrink-0 inline" />
                {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        } catch {
          return <span className="text-[11px] text-slate-400 font-mono">{timeStr}</span>;
        }
      },
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      sticky: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <a
            href={`https://codegame.shop/game/${item.gameSlug}`}
            target="_blank"
            rel="noreferrer"
            title="Mở xem trên Web Khách (codegame.shop)"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
          >
            <Globe className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={() => handleEdit(item)}
            title="Sửa code"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setDeletingCode(item);
              setIsDeleteOpen(true);
            }}
            title="Xóa code"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <DataTable
        data={codes}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Tìm theo tên game tiếng Việt, game slug, mã code, phần thưởng..."
        searchKeys={['codeValue', 'gameSlug', 'rewards', 'notes']}
        customSearchFn={(item, term) => {
          const game = gamesMap.get(item.gameSlug?.toLowerCase());
          return smartVietnameseMatch(
            [
              item.codeValue,
              item.gameSlug,
              item.rewards,
              item.notes,
              game?.name,
              game?.publisher,
              game?.category,
            ],
            term
          );
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRefresh={loadCodes}
        onExportCsv={handleExportCsv}
        filters={[
          {
            key: 'gameSlug',
            label: 'Game',
            customRender: (
              <div className="w-52 sm:w-64">
                <SearchableGameSelect
                  games={games}
                  selectedGameSlug={gameFilter === 'ALL' ? '' : gameFilter}
                  onSelectGame={(g) => setGameFilter(g ? (g.slug || g.id) : 'ALL')}
                  placeholder="🎮 Lọc theo tựa game..."
                  allowClear={true}
                  clearLabel="🎮 Xem tất cả các game"
                />
              </div>
            ),
          },
          {
            key: 'status',
            label: 'Trạng thái',
            selectedValue: statusFilter,
            options: [
              { label: 'Tất cả trạng thái', value: 'ALL' },
              { label: 'Đang dùng (ACTIVE)', value: 'ACTIVE' },
              { label: 'Hết hạn (EXPIRED)', value: 'EXPIRED' },
            ],
            onChange: setStatusFilter,
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Cập nhật: <strong className="text-slate-700 dark:text-slate-200 font-mono">{lastUpdatedTime}</strong></span>
            </div>
            <button
              onClick={() => {
                setBulkGameSlug(gameFilter !== 'ALL' ? gameFilter : (games[0]?.slug || ''));
                setIsBulkOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Nhập Hàng Loạt</span>
            </button>
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm Code Mới</span>
            </button>
          </div>
        }
        batchActions={[
          {
            label: 'Đổi sang ACTIVE',
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            onClick: () => handleBulkStatus('ACTIVE'),
          },
          {
            label: 'Đổi sang EXPIRED',
            icon: <XCircle className="h-3.5 w-3.5" />,
            onClick: () => handleBulkStatus('EXPIRED'),
          },
          {
            label: 'Xóa các code đã chọn',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            variant: 'danger',
            onClick: () => setIsBulkDeleteOpen(true),
          },
        ]}
      />

      {/* Create / Edit Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCode(null);
        }}
        title={editingCode?.id ? 'Chỉnh Sửa Mã Code' : 'Thêm Mã Code Miễn Phí'}
        subtitle="Mã code sẽ xuất hiện tức thì trong danh sách code của game cho toàn bộ người dùng."
      >
        <form onSubmit={handleSaveCode} className="space-y-4">
          <div>
            <SearchableGameSelect
              games={games}
              selectedGameSlug={editingCode?.gameSlug || ''}
              onSelectGame={(g) =>
                setEditingCode((prev) =>
                  prev ? { ...prev, gameSlug: g ? (g.slug || g.id) : '' } : null
                )
              }
              label="Chọn Game"
              required
              placeholder="Gõ tên game tiếng Việt có dấu/không dấu (VD: Tiên Giới, Hắc Ngộ Không...)..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mã Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editingCode?.codeValue || ''}
                onChange={(e) =>
                  setEditingCode((prev) => (prev ? { ...prev, codeValue: e.target.value.toUpperCase() } : null))
                }
                placeholder="VD: VIP888"
                className="mt-1 w-full font-mono font-bold rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trạng Thái
              </label>
              <select
                value={editingCode?.status || 'ACTIVE'}
                onChange={(e) =>
                  setEditingCode((prev) =>
                    prev ? { ...prev, status: e.target.value as any } : null
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="EXPIRED">Hết hạn (EXPIRED)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ngày Hết Hạn
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingCode((prev) => (prev ? { ...prev, expiresAt: '' } : null))}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      !editingCode?.expiresAt
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Chưa rõ hạn
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCode((prev) => (prev ? { ...prev, expiresAt: 'Vĩnh viễn' } : null))}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      editingCode?.expiresAt === 'Vĩnh viễn'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Vĩnh viễn
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={editingCode?.expiresAt || ''}
                onChange={(e) =>
                  setEditingCode((prev) => (prev ? { ...prev, expiresAt: e.target.value } : null))
                }
                placeholder="Để trống = Chưa rõ hạn (hoặc nhập YYYY-MM-DD)"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {!editingCode?.expiresAt && (
                <p className="text-[11px] text-slate-400 italic mt-1">Đang chọn: Chưa rõ hạn dùng (lưu NULL)</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Đã Xác Minh Tính Khả Dụng
              </label>
              <select
                value={editingCode?.isVerified ? 'yes' : 'no'}
                onChange={(e) =>
                  setEditingCode((prev) =>
                    prev ? { ...prev, isVerified: e.target.value === 'yes' } : null
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="yes">Đã kiểm tra (100% hoạt động)</option>
                <option value="no">Chưa kiểm tra</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Phần Thưởng Nhận Được
            </label>
            <textarea
              rows={2}
              value={editingCode?.rewards || ''}
              onChange={(e) =>
                setEditingCode((prev) => (prev ? { ...prev, rewards: e.target.value } : null))
              }
              placeholder="VD: 500 Kim Cương, 10 Vé Quay Cao Cấp..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingCode(null);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              <span>{editingCode?.id ? 'Lưu Thay Đổi' : 'Thêm Code'}</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Bulk Import Modal */}
      <FormModal
        isOpen={isBulkOpen}
        onClose={() => {
          setIsBulkOpen(false);
          setBulkRawText('');
        }}
        title="Nhập Giftcode Hàng Loạt (Bulk Importer)"
        subtitle="Hệ thống tự động loại bỏ mã code trùng lặp và liên kết trực tiếp vào Game đã chọn."
        maxWidth="xl"
      >
        <form onSubmit={handleBulkImport} className="space-y-4">
          <div>
            <SearchableGameSelect
              games={games}
              selectedGameSlug={bulkGameSlug}
              onSelectGame={(g) => setBulkGameSlug(g ? (g.slug || g.id) : '')}
              label="Chọn Game Cần Nạp Code"
              required
              placeholder="Gõ tên game tiếng Việt có dấu/không dấu (VD: Tiên Giới, Hắc Ngộ Không...)..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Danh Sách Mã Code (Mỗi dòng một mã)
              </label>
              <span className="text-[11px] text-slate-400">
                Định dạng: <code>CODE | Phần thưởng | Hạn dùng</code>
              </span>
            </div>
            <textarea
              rows={8}
              required
              value={bulkRawText}
              onChange={(e) => setBulkRawText(e.target.value)}
              placeholder={`VIP999 | 500 Kim Cương | 2026-11-20\nTANTHU888 | 100k Vàng | Vĩnh viễn\nCODEGAME2026 (bỏ trống hạn = Chưa rõ hạn)`}
              className="mt-1 w-full font-mono text-xs rounded-xl border border-slate-200 bg-white p-3 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
            <p className="font-semibold">Bộ lọc trùng thông minh:</p>
            <p className="text-[11px] opacity-80 mt-0.5">
              Những mã đã có sẵn trong game này sẽ tự động được bỏ qua mà không bị nạp trùng.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsBulkOpen(false);
                setBulkRawText('');
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <Upload className="h-4 w-4" />
              <span>Tiến Hành Nạp Hàng Loạt</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingCode(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa mã giftcode"
        message={
          <span>
            Bạn có chắc chắn muốn xóa mã code{' '}
            <strong className="font-mono text-rose-600 dark:text-rose-400">
              {deletingCode?.codeValue}
            </strong>{' '}
            thuộc game {deletingCode?.gameSlug}?
          </span>
        }
        confirmText="Xóa mã"
        variant="danger"
      />

      {/* Bulk Delete Confirm */}
      <ConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Xác nhận xóa nhiều mã giftcode"
        message={
          <span>
            Bạn có chắc chắn muốn xóa vĩnh viễn <strong className="font-bold text-rose-600 dark:text-rose-400">{selectedIds.length}</strong> mã code đã chọn khỏi hệ thống?
          </span>
        }
        confirmText={`Xóa ${selectedIds.length} mã`}
        variant="danger"
      />
    </div>
  );
};
