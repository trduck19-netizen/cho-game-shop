import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  Users,
  Copy,
  Gift,
  Gamepad2,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { adminDataService } from '../services/adminDataService';
import type { DailyDataPoint } from '../types/adminTypes';

export type { DailyDataPoint };

export interface MetricConfig {
  key: keyof Omit<DailyDataPoint, 'date' | 'dayLabel' | 'fullDate'>;
  label: string;
  color: string;
  gradientId: string;
  icon: React.ElementType;
  unit: string;
  formatter: (val: number) => string;
  defaultVisible: boolean;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'revenue',
    label: 'Doanh Thu',
    color: '#10B981', // Emerald
    gradientId: 'grad-revenue',
    icon: DollarSign,
    unit: 'VNĐ',
    formatter: (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v),
    defaultVisible: true,
  },
  {
    key: 'codeCopies',
    label: 'Lượt Sao Chép Code',
    color: '#F59E0B', // Amber
    gradientId: 'grad-copies',
    icon: Copy,
    unit: 'lượt',
    formatter: (v) => `${v.toLocaleString('vi-VN')} lượt`,
    defaultVisible: true,
  },
  {
    key: 'newMembers',
    label: 'Người Đăng Ký Mới',
    color: '#0EA5E9', // Sky Blue
    gradientId: 'grad-members',
    icon: Users,
    unit: 'người',
    formatter: (v) => `${v.toLocaleString('vi-VN')} người`,
    defaultVisible: true,
  },
  {
    key: 'newCodes',
    label: 'Số Code Thêm Mới',
    color: '#8B5CF6', // Violet
    gradientId: 'grad-codes',
    icon: Gift,
    unit: 'mã',
    formatter: (v) => `${v.toLocaleString('vi-VN')} mã`,
    defaultVisible: true,
  },
  {
    key: 'newGames',
    label: 'Số Game Thêm Mới',
    color: '#F43F5E', // Rose
    gradientId: 'grad-games',
    icon: Gamepad2,
    unit: 'game',
    formatter: (v) => `${v.toLocaleString('vi-VN')} game`,
    defaultVisible: true,
  },
  {
    key: 'orders',
    label: 'Đơn Hàng Thành Công',
    color: '#06B6D4', // Cyan
    gradientId: 'grad-orders',
    icon: CheckCircle2,
    unit: 'đơn',
    formatter: (v) => `${v.toLocaleString('vi-VN')} đơn`,
    defaultVisible: false,
  },
];

// Generate smooth cubic bezier SVG path from coordinates
function buildSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i != points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export const MultiLineAnalyticsChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [dataVersion, setDataVersion] = useState(0);
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    METRIC_CONFIGS.forEach((c) => {
      initial[c.key] = c.defaultVisible;
    });
    return initial;
  });

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Fetch real data from adminDataService
  const loadRealData = useCallback(() => {
    return adminDataService.getMultiLineTimelineAnalytics(timeRange);
  }, [timeRange]);

  const [data, setData] = useState<DailyDataPoint[]>(() => loadRealData());

  // Reload when time range or data changes
  useEffect(() => {
    setData(loadRealData());
  }, [timeRange, dataVersion, loadRealData]);

  // Subscribe to live client website data events
  useEffect(() => {
    const handleDataUpdate = () => {
      setDataVersion((v) => v + 1);
    };

    window.addEventListener('wcg_admin_data_updated', handleDataUpdate);
    window.addEventListener('storage', handleDataUpdate);

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('wcg_data_sync');
        channel.onmessage = () => {
          setDataVersion((v) => v + 1);
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('wcg_admin_data_updated', handleDataUpdate);
      window.removeEventListener('storage', handleDataUpdate);
      channel?.close();
    };
  }, []);

  // Chart Dimension constants
  const svgWidth = 840;
  const svgHeight = 310;
  const paddingLeft = 45;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 45;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Compute normalized scales for each metric so lines fit harmoniously between 0-100% of chart height
  const metricMaxValues = useMemo(() => {
    const maxs: Record<string, number> = {};
    METRIC_CONFIGS.forEach((config) => {
      const values = data.map((d) => d[config.key] as number);
      const max = Math.max(...values, 1);
      maxs[config.key] = max * 1.15; // 15% headroom
    });
    return maxs;
  }, [data]);

  // Precompute point coordinates for each visible metric
  const metricCoordinates = useMemo(() => {
    const coordsMap: Record<string, Array<{ x: number; y: number; val: number }>> = {};
    const n = data.length;

    METRIC_CONFIGS.forEach((config) => {
      if (!visibleSeries[config.key]) return;
      const max = metricMaxValues[config.key] || 100;
      const points = data.map((item, idx) => {
        const x = paddingLeft + (idx / (n - 1)) * chartWidth;
        const val = item[config.key] as number;
        const normalized = Math.min(1, Math.max(0, val / max));
        const y = paddingTop + chartHeight - normalized * chartHeight;
        return { x, y, val };
      });
      coordsMap[config.key] = points;
    });

    return coordsMap;
  }, [data, visibleSeries, metricMaxValues, chartWidth, chartHeight, paddingLeft, paddingTop]);

  const toggleSeries = (key: string) => {
    setVisibleSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Ensure at least one line is visible
      const anyVisible = Object.values(next).some(Boolean);
      if (!anyVisible) return prev;
      return next;
    });
  };

  const currentHoverItem = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < data.length ? data[hoverIndex] : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all lg:col-span-2 flex flex-col justify-between">
      {/* 1. Header Bar: Title, Subtitle, Time Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Biểu Đồ Tăng Trưởng Đa Biến
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Phân tích đa chiều: Doanh thu, đăng ký, lượt copy giftcode, game và code mới theo thời gian
          </p>
        </div>

        {/* Time Selector Tabs & Live Realtime Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Dữ liệu thực Live</span>
          </div>

          <button
            type="button"
            onClick={() => setDataVersion((v) => v + 1)}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer active:scale-95 border border-slate-200/80 dark:border-slate-700/80"
            title="Làm mới dữ liệu từ Web Khách"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => setTimeRange(7)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 7
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              7 Ngày
            </button>
            <button
              type="button"
              onClick={() => setTimeRange(14)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 14
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              14 Ngày
            </button>
            <button
              type="button"
              onClick={() => setTimeRange(30)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === 30
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              30 Ngày
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive SVG Multi-Line Chart Canvas */}
      <div className="relative mt-4 w-full select-none">
        {/* Floating Tooltip Display on Hover */}
        {currentHoverItem && hoverIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-100 ease-out bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3 text-xs text-white min-w-[210px]"
            style={{
              left: `${Math.min(
                Math.max(10, ((paddingLeft + (hoverIndex / (data.length - 1)) * chartWidth) / svgWidth) * 100 - 15),
                68
              )}%`,
              top: '12px',
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Calendar className="w-3.5 h-3.5" />
                {currentHoverItem.dayLabel}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{currentHoverItem.fullDate}</span>
            </div>

            <div className="space-y-1.5">
              {METRIC_CONFIGS.filter((c) => visibleSeries[c.key]).map((config) => {
                const val = currentHoverItem[config.key] as number;
                return (
                  <div key={config.key} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                      <span>{config.label}:</span>
                    </span>
                    <strong className="font-mono" style={{ color: config.color }}>
                      {config.formatter(val)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 sm:h-72 overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Soft background grid pattern */}
            <linearGradient id="chart-grid-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
            </linearGradient>

            {/* Metric Gradients */}
            {METRIC_CONFIGS.map((config) => (
              <linearGradient key={config.gradientId} id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={config.color} stopOpacity="0.0" />
              </linearGradient>
            ))}

            <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.4)" />
            </filter>
          </defs>

          {/* Horizontal Grid lines (5 levels) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + ratio * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800/90"
                  strokeWidth="1"
                  strokeDasharray={i === 4 ? '' : '4 4'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono select-none"
                >
                  {Math.round((1 - ratio) * 100)}%
                </text>
              </g>
            );
          })}

          {/* Vertical Grid Columns & Hover Touch Targets */}
          {data.map((item, idx) => {
            const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
            const isHovered = hoverIndex === idx;

            return (
              <g key={item.date}>
                {/* Vertical hover guide line */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke="#8B5CF6"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="animate-fade-in"
                  />
                )}

                {/* X-Axis Date Labels */}
                <text
                  x={x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={`text-[10px] font-bold select-none transition-colors ${
                    isHovered
                      ? 'fill-indigo-600 dark:fill-indigo-400'
                      : 'fill-slate-400 dark:fill-slate-500'
                  }`}
                >
                  {timeRange <= 7 ? item.dayLabel.split(' ')[0] : item.date}
                </text>

                {/* Invisible wide touch / mouse hover target */}
                <rect
                  x={x - chartWidth / (data.length * 2)}
                  y={paddingTop}
                  width={chartWidth / data.length}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onTouchStart={() => setHoverIndex(idx)}
                />
              </g>
            );
          })}

          {/* Render Area fills under curves */}
          {METRIC_CONFIGS.map((config) => {
            if (!visibleSeries[config.key]) return null;
            const points = metricCoordinates[config.key];
            if (!points || points.length === 0) return null;

            const linePath = buildSvgPath(points);
            const firstPt = points[0];
            const lastPt = points[points.length - 1];
            const areaPath = `${linePath} L ${lastPt.x} ${paddingTop + chartHeight} L ${firstPt.x} ${paddingTop + chartHeight} Z`;

            return (
              <path
                key={`area-${config.key}`}
                d={areaPath}
                fill={`url(#${config.gradientId})`}
                className="transition-opacity duration-300"
              />
            );
          })}

          {/* Render Multi-Line Curves */}
          {METRIC_CONFIGS.map((config) => {
            if (!visibleSeries[config.key]) return null;
            const points = metricCoordinates[config.key];
            if (!points || points.length === 0) return null;

            const linePath = buildSvgPath(points);

            return (
              <g key={`line-${config.key}`}>
                <path
                  d={linePath}
                  fill="none"
                  stroke={config.color}
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow-line)"
                  className="transition-all duration-300"
                />

                {/* Data point dots */}
                {points.map((pt, pIdx) => {
                  const isHovered = hoverIndex === pIdx;
                  return (
                    <circle
                      key={pIdx}
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 3.5}
                      fill={config.color}
                      stroke="#0F172A"
                      strokeWidth="2"
                      className="transition-all duration-200 cursor-pointer"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 3. Interactive Multi-Metric Legend Bar (Ghi chú từng loại dữ liệu bên dưới) */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            Ghi chú dữ liệu (Bấm để bật/tắt đường hiển thị):
          </span>
          <span className="text-[10px] text-slate-400 italic hidden sm:inline">
            Đường biểu diễn đã được chuẩn hóa theo thang đo %
          </span>
        </div>

        {/* Legend Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {METRIC_CONFIGS.map((config) => {
            const isVisible = visibleSeries[config.key];
            // Sum or latest value
            const totalVal = data.reduce((sum, d) => sum + (d[config.key] as number), 0);

            return (
              <button
                key={config.key}
                type="button"
                onClick={() => toggleSeries(config.key)}
                className={`flex flex-col p-2 rounded-xl border text-left transition-all cursor-pointer active:scale-95 ${
                  isVisible
                    ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-sm'
                    : 'bg-transparent border-slate-200/50 dark:border-slate-800/50 opacity-45 hover:opacity-75'
                }`}
                title={`Bật/tắt đường ${config.label}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: isVisible ? config.color : '#94A3B8' }}
                    />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                      {config.label}
                    </span>
                  </div>
                  {isVisible ? (
                    <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-slate-500 shrink-0" />
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-auto">
                  <span className="text-xs font-mono font-extrabold truncate" style={{ color: isVisible ? config.color : '#94A3B8' }}>
                    {config.formatter(totalVal)}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-sans">Tổng</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
