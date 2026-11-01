import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';
let originalTouchAction = '';

/**
 * useLockBodyScroll
 * Reference-counted body scroll lock hook to prevent mobile background scroll leaking
 * and resolve the iOS/Android "stuck scroll / cannot scroll up" boundary trap.
 */
export function useLockBodyScroll(lock: boolean = true) {
  useEffect(() => {
    if (!lock || typeof document === 'undefined') return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      }
    };
  }, [lock]);
}
