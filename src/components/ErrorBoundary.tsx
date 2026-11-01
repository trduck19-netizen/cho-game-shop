import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Web ErrorBoundary caught error]:', error, errorInfo);

    // Auto-reload on chunk loading error caused by new deployment
    const isChunkError =
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch') ||
      (error as any)?.name === 'ChunkLoadError';

    if (isChunkError && typeof window !== 'undefined') {
      const retryKey = 'wcg_error_boundary_chunk_reload';
      const last = sessionStorage.getItem(retryKey);
      const now = Date.now();
      if (!last || now - parseInt(last, 10) > 10000) {
        sessionStorage.setItem(retryKey, String(now));
        console.warn('[ErrorBoundary] Stale chunk detected after deployment. Auto-reloading...', error.message);
        window.location.reload();
        return;
      }
    }

    try {
      const preloader = document.getElementById('app-preloader');
      if (preloader) {
        preloader.style.opacity = '0';
        preloader.style.pointerEvents = 'none';
        setTimeout(() => {
          if (preloader.parentNode) {
            preloader.parentNode.removeChild(preloader);
          }
        }, 300);
      }
    } catch {}
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0D19] flex items-center justify-center p-4 text-white">
          <div className="w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-lg sm:text-xl font-bold font-heading text-white">
              {this.props.fallbackTitle || 'Đã có sự cố hiển thị nhỏ xảy ra'}
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Hệ thống đã tự động ngăn ngừa màn hình đen và bảo vệ trạng thái an toàn cho bạn.
            </p>

            {this.state.error?.message && (
              <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono text-slate-400 text-left max-h-24 overflow-y-auto break-all">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <Home className="w-4 h-4" />
                Về Trang Chủ
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
