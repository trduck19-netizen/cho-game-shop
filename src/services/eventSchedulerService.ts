import { ScheduledEventRecord, ScheduledEventStatus, CountdownTimeLeft } from '../types/eventScheduler';

const STORAGE_KEY = 'wcg_event_schedules_v1';
const EVENT_NAME = 'wcg_event_schedules_updated';

class EventSchedulerService {
  private cachedSchedules: ScheduledEventRecord[] | null = null;

  /**
   * Lấy toàn bộ danh sách lịch sự kiện từ Storage
   */
  public getSchedules(): ScheduledEventRecord[] {
    if (this.cachedSchedules) {
      return this.cachedSchedules;
    }

    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.cachedSchedules = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[EventSchedulerService] Error parsing schedules:', e);
    }

    this.cachedSchedules = [];
    return [];
  }

  /**
   * Tính toán trạng thái thời gian thực của sự kiện
   */
  public calculateEventStatus(event: ScheduledEventRecord, nowMs: number = Date.now()): ScheduledEventStatus {
    if (!event.is_active) {
      return 'ENDED';
    }

    const startMs = new Date(event.start_time).getTime();
    const endMs = new Date(event.end_time).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      return 'ENDED';
    }

    // Đã qua thời gian kết thúc
    if (nowMs >= endMs) {
      return 'ENDED';
    }

    // Đang trong khung giờ diễn ra sự kiện
    if (nowMs >= startMs && nowMs < endMs) {
      return 'LIVE';
    }

    // Thời gian trước Giờ G
    if (nowMs < startMs) {
      const leadHours = typeof event.countdown_lead_hours === 'number' ? event.countdown_lead_hours : 72; // mặc định 3 ngày
      if (leadHours > 0) {
        const leadMs = leadHours * 3600 * 1000;
        if (nowMs < startMs - leadMs) {
          return 'HIDDEN'; // Chưa tới thời điểm bắt đầu hiện đếm ngược
        }
      }
      return 'UPCOMING'; // Đang trong giai đoạn đếm ngược
    }

    return 'ENDED';
  }

  /**
   * Tính toán thời gian còn lại (Countdown math)
   */
  public calculateCountdown(event: ScheduledEventRecord, nowMs: number = Date.now()): CountdownTimeLeft {
    const status = this.calculateEventStatus(event, nowMs);
    const startMs = new Date(event.start_time).getTime();
    const endMs = new Date(event.end_time).getTime();

    let targetMs = startMs;
    if (status === 'LIVE') {
      // Nếu đang LIVE thì đếm ngược đến lúc kết thúc
      targetMs = endMs;
    }

    const diff = Math.max(0, targetMs - nowMs);
    const totalSeconds = Math.floor(diff / 1000);

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      days,
      hours,
      minutes,
      seconds,
      totalRemainingMs: diff,
      isExpired: diff <= 0,
      status,
    };
  }

  /**
   * Lấy sự kiện hiển thị trên Top Sticky Banner (Ưu tiên sự kiện LIVE, sau đó đến UPCOMING)
   */
  public getTopBannerSchedule(): { event: ScheduledEventRecord; status: ScheduledEventStatus; countdown: CountdownTimeLeft } | null {
    const all = this.getSchedules().filter((s) => s.is_active && s.show_top_banner);
    const now = Date.now();

    const evaluated = all
      .map((ev) => ({
        event: ev,
        status: this.calculateEventStatus(ev, now),
        countdown: this.calculateCountdown(ev, now),
      }))
      .filter((item) => item.status === 'LIVE' || item.status === 'UPCOMING');

    if (evaluated.length === 0) return null;

    // Ưu tiên sự kiện LIVE trước, sau đó sự kiện UPCOMING gần nhất
    evaluated.sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
      const startA = new Date(a.event.start_time).getTime();
      const startB = new Date(b.event.start_time).getTime();
      return startA - startB;
    });

    return evaluated[0];
  }

  /**
   * Lấy lịch sự kiện cho 1 Giveaway cụ thể
   */
  public getScheduleForGiveaway(giveawayId: string): ScheduledEventRecord | null {
    const all = this.getSchedules().filter((s) => s.is_active && s.type === 'GIVEAWAY');
    const now = Date.now();
    const found = all.find((s) => s.target_id === giveawayId);
    if (!found) return null;

    const status = this.calculateEventStatus(found, now);
    if (status === 'HIDDEN' || status === 'ENDED') return null;
    return found;
  }

  /**
   * Lấy lịch sự kiện Flash Sale cho 1 sản phẩm / Tiện ích
   */
  public getScheduleForProduct(productId: string): { event: ScheduledEventRecord; status: ScheduledEventStatus } | null {
    const all = this.getSchedules().filter((s) => s.is_active && s.type === 'FLASH_SALE_PRODUCT');
    const now = Date.now();
    const found = all.find((s) => s.target_id === productId);
    if (!found) return null;

    const status = this.calculateEventStatus(found, now);
    if (status === 'HIDDEN' || status === 'ENDED') return null;
    return { event: found, status };
  }

  /**
   * Lấy lịch sự kiện theo Game Slug
   */
  public getSchedulesForGame(gameSlug: string): ScheduledEventRecord[] {
    if (!gameSlug) return [];
    const now = Date.now();
    return this.getSchedules().filter((s) => {
      if (!s.is_active) return false;
      if (s.game_slug?.toLowerCase() !== gameSlug.toLowerCase()) return false;
      const st = this.calculateEventStatus(s, now);
      return st === 'LIVE' || st === 'UPCOMING';
    });
  }

  /**
   * Lưu hoặc cập nhật một sự kiện (Dành cho Admin)
   */
  public saveSchedule(record: ScheduledEventRecord): void {
    const list = [...this.getSchedules()];
    const index = list.findIndex((s) => s.id === record.id);
    const nowIso = new Date().toISOString();

    const recordToSave: ScheduledEventRecord = {
      ...record,
      updated_at: nowIso,
    };

    if (index >= 0) {
      list[index] = recordToSave;
    } else {
      list.unshift({
        ...recordToSave,
        created_at: record.created_at || nowIso,
      });
    }

    this.saveAllSchedules(list);
  }

  /**
   * Xóa một sự kiện
   */
  public deleteSchedule(id: string): void {
    const list = this.getSchedules().filter((s) => s.id !== id);
    this.saveAllSchedules(list);
  }

  /**
   * Bật / Tắt nhanh sự kiện
   */
  public toggleScheduleActive(id: string): void {
    const list = this.getSchedules().map((s) => {
      if (s.id === id) {
        return { ...s, is_active: !s.is_active, updated_at: new Date().toISOString() };
      }
      return s;
    });
    this.saveAllSchedules(list);
  }

  /**
   * Lưu toàn bộ danh sách vào localStorage và broadcast sự kiện, đồng thời đồng bộ đám mây Cloudflare
   */
  public saveAllSchedules(schedules: ScheduledEventRecord[], syncRemote: boolean = true): void {
    this.cachedSchedules = schedules;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: schedules }));
      if (syncRemote && typeof window !== 'undefined') {
        import('./dataService')
          .then((m) => {
            if (m?.dataService?.pushToCloudflareKV) {
              m.dataService.pushToCloudflareKV(STORAGE_KEY, schedules).catch(() => {});
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn('[EventSchedulerService] Save error:', e);
    }
  }

  /**
   * Lắng nghe sự thay đổi của danh sách lịch sự kiện
   */
  public onUpdate(callback: (schedules: ScheduledEventRecord[]) => void): () => void {
    const handler = (e: any) => {
      const updated = e?.detail || this.getSchedules();
      callback(updated);
    };

    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }
}

export const eventSchedulerService = new EventSchedulerService();
