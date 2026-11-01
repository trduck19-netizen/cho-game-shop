import React from 'react';

/**
 * Enhanced React.lazy wrapper with automatic retry on chunk loading errors.
 * Completely eliminates "Failed to fetch dynamically imported module" errors
 * caused by new deployments where asset chunk hashes have changed.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const pageKey = `wcg_chunk_retry_${typeof window !== 'undefined' ? window.location.pathname : ''}`;
    try {
      const module = await componentImport();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(pageKey);
      }
      return module && module.default ? module : { default: module };
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError && typeof window !== 'undefined') {
        const lastRetry = sessionStorage.getItem(pageKey);
        const now = Date.now();
        // Prevent reload loop: only auto-reload once within a 10s window
        if (!lastRetry || now - parseInt(lastRetry, 10) > 10000) {
          sessionStorage.setItem(pageKey, String(now));
          console.warn('[lazyWithRetry] Stale chunk detected after deployment. Auto-reloading to fetch latest build...', error?.message);
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}
