import React from 'react';
import type { ViewMode } from './GameGrid';

interface GameCardSkeletonProps {
  viewMode?: ViewMode;
}

export const GameCardSkeleton: React.FC<GameCardSkeletonProps> = ({ viewMode = 'compact' }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-card/60 rounded-xl sm:rounded-2xl border border-border/60 animate-pulse">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-800/90 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-slate-800/90 rounded-md w-1/3" />
          <div className="h-3 bg-slate-800/60 rounded-md w-1/4" />
        </div>
        <div className="w-24 h-8 bg-slate-800/80 rounded-xl shrink-0" />
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="flex flex-col justify-between bg-card/60 rounded-2xl border border-border/60 p-3 sm:p-3.5 animate-pulse min-h-[200px]">
        <div>
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-slate-800/90 shrink-0" />
            <div className="w-8 h-8 rounded-xl bg-slate-800/60 shrink-0" />
          </div>
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-slate-800/90 rounded-md w-4/5" />
            <div className="h-3 bg-slate-800/60 rounded-md w-1/2" />
          </div>
        </div>
        <div className="h-9 bg-slate-800/80 rounded-xl w-full mt-3" />
      </div>
    );
  }

  // Default: Compact Mode (Tối ưu cho Mobile & Lưới Catalog)
  return (
    <div className="flex flex-col justify-between bg-card/60 rounded-xl sm:rounded-2xl border border-border/60 p-2 sm:p-2.5 animate-pulse min-h-[148px] sm:min-h-[168px]">
      <div>
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/90 shrink-0" />
          <div className="w-6 h-6 rounded-lg bg-slate-800/60 shrink-0" />
        </div>
        <div className="space-y-1.5 mb-2">
          <div className="h-3.5 bg-slate-800/90 rounded-md w-4/5" />
          <div className="h-2.5 bg-slate-800/60 rounded-md w-3/5" />
        </div>
      </div>
      <div className="h-7 sm:h-8 bg-slate-800/80 rounded-lg sm:rounded-xl w-full mt-2" />
    </div>
  );
};

export const GameGridSkeleton: React.FC<{ count?: number; viewMode?: ViewMode }> = ({
  count = 24,
  viewMode = 'compact',
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-2 sm:gap-2.5 w-full">
        {skeletons.map((i) => (
          <GameCardSkeleton key={i} viewMode="list" />
        ))}
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {skeletons.map((i) => (
          <GameCardSkeleton key={i} viewMode="grid" />
        ))}
      </div>
    );
  }

  // Compact Grid (khớp 100% responsive classes của GameGrid compact)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 w-full">
      {skeletons.map((i) => (
        <GameCardSkeleton key={i} viewMode="compact" />
      ))}
    </div>
  );
};
