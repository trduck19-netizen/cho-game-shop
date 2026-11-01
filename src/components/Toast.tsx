import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  position?: 'bottom-right' | 'top-center' | 'bottom-center' | 'top-right';
  maxVisible?: number;
}

const ToastItem: React.FC<{
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const duration = toast.duration ?? (toast.type === 'error' ? 3500 : 2500);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (duration <= 0) return;
    if (isHovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, duration, isHovered, onDismiss]);

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="pointer-events-auto flex items-start gap-2.5 py-2.5 px-3.5 rounded-xl shadow-2xl border border-slate-700/80 bg-slate-900/95 hover:bg-slate-800/95 text-foreground animate-scale-in max-w-full w-full box-border overflow-hidden cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] select-none group backdrop-blur-md"
      role="alert"
    >
      {toast.type === 'success' && (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
      )}
      {toast.type === 'error' && (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      )}
      {toast.type === 'info' && (
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="font-semibold text-xs sm:text-sm leading-tight text-white flex items-center gap-1.5">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-snug break-words line-clamp-2">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        className="text-slate-400 hover:text-white p-0.5 rounded-md transition-colors cursor-pointer shrink-0 ml-1 opacity-70 group-hover:opacity-100"
        aria-label="Đóng thông báo"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({
  toasts,
  onDismiss,
  position = 'bottom-right',
  maxVisible = 3,
}) => {
  if (toasts.length === 0) return null;

  // Take at most maxVisible latest toasts to prevent flooding
  const visibleToasts = toasts.slice(-maxVisible);

  let positionClasses = 'fixed top-3 left-3 right-3 sm:top-auto sm:left-auto sm:right-5 sm:bottom-5 items-center sm:items-end';
  if (position === 'top-center') {
    positionClasses = 'fixed top-4 left-1/2 -translate-x-1/2 items-center';
  } else if (position === 'bottom-center') {
    positionClasses = 'fixed bottom-6 left-1/2 -translate-x-1/2 items-center';
  } else if (position === 'top-right') {
    positionClasses = 'fixed top-4 right-4 items-end';
  }

  return (
    <div
      className={`${positionClasses} z-[9999] flex flex-col gap-2 pointer-events-none box-border transition-all duration-200 w-[calc(100vw-24px)] sm:w-auto max-w-[420px]`}
    >
      {visibleToasts.length > 1 && (
        <div className="flex justify-end w-full pr-1">
          <button
            type="button"
            onClick={() => visibleToasts.forEach((t) => onDismiss(t.id))}
            className="pointer-events-auto text-[10px] font-medium text-slate-400 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm cursor-pointer transition-all active:scale-95"
          >
            Đóng tất cả ({visibleToasts.length})
          </button>
        </div>
      )}
      {visibleToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
