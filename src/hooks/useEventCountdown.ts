import { useState, useEffect, useRef } from 'react';

export interface UseEventCountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalRemainingMs: number;
  isExpired: boolean;
  formattedText: string; // e.g. "02d 14h:35m:18s"
}

export function useEventCountdown(
  targetDate: string | number | Date | null | undefined,
  onExpire?: () => void
): UseEventCountdownResult {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!targetDate) return 0;
    const targetMs = new Date(targetDate).getTime();
    return isNaN(targetMs) ? 0 : Math.max(0, targetMs - Date.now());
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const hasExpiredTriggeredRef = useRef(false);

  useEffect(() => {
    if (!targetDate) {
      setRemainingMs(0);
      hasExpiredTriggeredRef.current = true;
      return;
    }

    const targetMs = new Date(targetDate).getTime();
    if (isNaN(targetMs)) {
      setRemainingMs(0);
      hasExpiredTriggeredRef.current = true;
      return;
    }

    // Nếu thời gian mục tiêu đã hết hạn ngay từ khi khởi tạo effect:
    // Đánh dấu đã hết hạn và KHÔNG gọi onExpire đồng bộ (ngăn chặn cascading re-render loop - React Error #301)
    const initialDiff = targetMs - Date.now();
    if (initialDiff <= 0) {
      setRemainingMs(0);
      hasExpiredTriggeredRef.current = true;
      return;
    }

    hasExpiredTriggeredRef.current = false;

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, targetMs - now);
      setRemainingMs(diff);

      if (diff <= 0 && !hasExpiredTriggeredRef.current) {
        hasExpiredTriggeredRef.current = true;
        // Trì hoãn gọi onExpire sang macrotask để không can thiệp đồng bộ vào React render phase
        if (onExpireRef.current) {
          setTimeout(() => {
            onExpireRef.current?.();
          }, 50);
        }
      }
    };

    // Run first tick immediately
    tick();

    const intervalId = window.setInterval(tick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [targetDate]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isExpired = remainingMs <= 0;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedText = days > 0
    ? `${days}d ${pad(hours)}h:${pad(minutes)}m:${pad(seconds)}s`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalRemainingMs: remainingMs,
    isExpired,
    formattedText,
  };
}
