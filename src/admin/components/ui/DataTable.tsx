import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';

import { smartVietnameseMatch } from '../../../utils/textUtils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  customSearchFn?: (item: T, searchTerm: string) => boolean;
  filters?: {
    key: string;
    label?: string;
    options?: { label: string; value: string }[];
    selectedValue?: string;
    onChange?: (val: string) => void;
    customRender?: React.ReactNode;
  }[];
  actions?: React.ReactNode;
  batchActions?: {
    label: string;
    icon?: React.ReactNode;
    variant?: 'primary' | 'danger' | 'default';
    onClick: (selectedItems: T[]) => void;
  }[];
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchKeys = [],
  customSearchFn,
  filters = [],
  actions,
  batchActions = [],
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  onRefresh,
  onExportCsv,
  emptyMessage = 'Không tìm thấy bản ghi nào phù hợp.',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Client-side search and sort with smart Vietnamese accent-insensitive matching
  const filteredData = useMemo(() => {
    let list = [...data];

    // Search
    if (searchTerm.trim()) {
      if (customSearchFn) {
        list = list.filter((item) => customSearchFn(item, searchTerm.trim()));
      } else if (searchKeys.length > 0) {
        list = list.filter((item) => {
          const targets = searchKeys.map((k) => item[k]);
          return smartVietnameseMatch(targets, searchTerm.trim());
        });
      }
    }

    // Sort
    if (sortKey) {
      list.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        const isEmptyA = valA === null || valA === undefined || valA === '';
        const isEmptyB = valB === null || valB === undefined || valB === '';
        if (isEmptyA && isEmptyB) return 0;
        if (isEmptyA) return 1;
        if (isEmptyB) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc'
          ? strA.localeCompare(strB, 'vi')
          : strB.localeCompare(strA, 'vi');
      });
    }

    return list;
  }, [data, searchTerm, searchKeys, sortKey, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Selection handlers
  const allPageKeys = paginatedData.map(keyExtractor);
  const isAllSelected =
    allPageKeys.length > 0 && allPageKeys.every((k) => selectedIds.includes(k));
  const isSomeSelected =
    allPageKeys.some((k) => selectedIds.includes(k)) && !isAllSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange(selectedIds.filter((k) => !allPageKeys.includes(k)));
    } else {
      const combined = Array.from(new Set([...selectedIds, ...allPageKeys]));
      onSelectionChange(combined);
    }
  };

  const handleToggleSelect = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds.includes(key)) {
      onSelectionChange(selectedIds.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedIds, key]);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const selectedObjects = useMemo(() => {
    return data.filter((item) => selectedIds.includes(keyExtractor(item)));
  }, [data, selectedIds, keyExtractor]);

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Filters */}
        <div className="flex flex-1 flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          {searchKeys.length > 0 && (
            <div className="relative w-full sm:w-auto sm:min-w-[220px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {filters.map((f) => (
              f.customRender ? (
                <div key={f.key} className="flex items-center">
                  {f.customRender}
                </div>
              ) : (
                <div key={f.key} className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                  <select
                    value={f.selectedValue}
                    onChange={(e) => {
                      f.onChange?.(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {f.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            ))}

            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Làm mới"
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 active:scale-95"
              >
                <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span>Xuất CSV</span>
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* Batch Actions Bar (when items selected) */}
      {selectable && selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-indigo-500/10 px-4 py-2.5 border border-indigo-500/30 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="text-xs font-medium">
            Đã chọn <strong className="font-bold text-indigo-600 dark:text-indigo-400">{selectedIds.length}</strong> bản ghi
          </div>
          <div className="flex items-center gap-2">
            {batchActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => action.onClick(selectedObjects)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all ${
                  action.variant === 'danger'
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : action.variant === 'primary'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
            <button
              onClick={() => onSelectionChange?.([])}
              className="text-xs text-slate-500 hover:underline dark:text-slate-400 ml-2"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden flex items-center justify-between px-3 py-1.5 bg-slate-50 text-[11px] text-slate-500 border-b border-slate-100 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800 font-medium">
          <span>👈 Vuốt ngang xem thêm cột 👉</span>
          <span>{filteredData.length} kết quả</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                {selectable && (
                  <th className="w-10 px-3 py-2.5 sm:px-4 sm:py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                  const stickyClass =
                    col.sticky === 'right'
                      ? 'sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-[-4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.3)]'
                      : col.sticky === 'left'
                      ? 'sticky left-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-[4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_8px_rgba(0,0,0,0.3)]'
                      : '';

                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={`px-2.5 py-2 sm:px-3.5 sm:py-3 whitespace-nowrap ${alignClass} ${stickyClass} ${
                        col.sortable ? 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-white' : ''
                      }`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className={`inline-flex items-center gap-1.5 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-slate-400">
                            {sortKey === col.key ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {selectable && <td className="px-3 py-3 sm:px-4 sm:py-3.5"><div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-800" /></td>}
                    {columns.map((col, j) => {
                      const stickySkeletonClass = col.sticky === 'right' ? 'sticky right-0 z-10 bg-white dark:bg-slate-900' : '';
                      return (
                        <td key={j} className={`px-2.5 py-3 sm:px-3.5 sm:py-3.5 ${stickySkeletonClass}`}>
                          <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-4 py-12 text-center text-slate-400 dark:text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const key = keyExtractor(item);
                  const isSelected = selectedIds.includes(key);

                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick?.(item)}
                      className={`group transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${
                        isSelected
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {selectable && (
                        <td className="px-2.5 py-2.5 sm:px-3.5 sm:py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelect(key, e as any)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const alignClass =
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                            ? 'text-right'
                            : 'text-left';

                        const stickyTdClass =
                          col.sticky === 'right'
                            ? `sticky right-0 z-10 ${
                                isSelected
                                  ? 'bg-indigo-50/90 dark:bg-slate-900'
                                  : 'bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-850'
                              } shadow-[-4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.3)]`
                            : col.sticky === 'left'
                            ? `sticky left-0 z-10 ${
                                isSelected
                                  ? 'bg-indigo-50/90 dark:bg-slate-900'
                                  : 'bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-850'
                              } shadow-[4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_8px_rgba(0,0,0,0.3)]`
                            : '';

                        return (
                          <td key={col.key} className={`px-2.5 py-2.5 sm:px-3.5 sm:py-3 ${alignClass} ${stickyTdClass}`}>
                            {col.render ? col.render(item) : item[col.key]}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span>
              trên tổng số <strong>{filteredData.length}</strong> kết quả
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage <= 1}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
              title="Trang đầu"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
              title="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
              {validCurrentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
              title="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage >= totalPages}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
              title="Trang cuối"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
