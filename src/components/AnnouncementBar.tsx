import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { dataService } from '../services/dataService';

export const AnnouncementBar: React.FC = () => {
  const [announcement, setAnnouncement] = useState<{
    id: string;
    title: string;
    content: string;
    isActive: boolean;
  } | null>(() => dataService.getAnnouncementBanner());

  useEffect(() => {
    // Subscribe to real-time updates from Admin CMS / KV
    const unsubscribe = dataService.subscribe(() => {
      const current = dataService.getAnnouncementBanner();
      setAnnouncement(current);
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wcg_admin_content_v4') {
        const current = dataService.getAnnouncementBanner();
        setAnnouncement(current);
      }
    };
    const handleContentUpdated = () => {
      const current = dataService.getAnnouncementBanner();
      setAnnouncement(current);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wcg_admin_content_updated', handleContentUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wcg_admin_content_updated', handleContentUpdated);
    };
  }, []);

  // Tuân thủ 100% quyền bật/tắt từ Quản trị viên (Admin).
  // Nếu Admin tắt (isActive = false), web khách sẽ không thấy thanh này.
  if (!announcement || !announcement.isActive) {
    return null;
  }

  // Khối thông báo đơn lẻ
  const renderMessageContent = (keyPrefix: string) => (
    <div key={keyPrefix} className="inline-flex items-center gap-3 px-6 whitespace-nowrap">
      <span className="font-extrabold text-amber-200 tracking-wide drop-shadow-sm">
        {announcement.title}
      </span>
      {announcement.content && (
        <span className="text-slate-100 font-medium">
          • {announcement.content}
        </span>
      )}
      <span className="text-amber-400/70 font-bold px-2 select-none">✦</span>
    </div>
  );

  return (
    <div
      className="relative w-full max-w-full bg-gradient-to-r from-indigo-950 via-primary-dark to-purple-950 text-white border-b border-primary/30 text-xs z-30 shadow-md select-none overflow-hidden h-8 sm:h-9 flex items-center box-border"
      style={{ contain: 'paint' }}
    >
      {/* 1. Huy hiệu "THÔNG BÁO" cố định bên trái */}
      <div className="relative z-20 flex items-center gap-1.5 pl-3 pr-3.5 sm:pl-4 sm:pr-4 py-1 bg-gradient-to-r from-indigo-950 via-indigo-950/95 to-indigo-950/70 backdrop-blur-md shrink-0 border-r border-white/10 shadow-sm">
        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-amber-400/20 flex items-center justify-center shrink-0">
          <Megaphone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 animate-pulse" />
        </div>
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
          Thông báo
        </span>
      </div>

      {/* 2. Vùng chạy chữ từ phải qua trái liên tục và lặp lại không ngắt quãng */}
      <div className="relative flex-1 min-w-0 max-w-full overflow-hidden h-full flex items-center">
        {/* Lớp mờ chuyển tiếp 2 bên viền để chữ vào/ra êm ái */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-r from-indigo-950 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-l from-purple-950 to-transparent z-10" />

        {/* Dải chữ lặp vô tận (Marquee Track: 3 bản sao để cuộn mượt 100%) */}
        <div
          className="flex w-max animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] cursor-pointer"
          title="Rê chuột hoặc chạm để tạm dừng đọc thông báo"
        >
          {renderMessageContent('track-1')}
          {renderMessageContent('track-2')}
          {renderMessageContent('track-3')}
        </div>
      </div>
    </div>
  );
};
