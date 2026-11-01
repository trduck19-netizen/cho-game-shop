import { EmailSubscription } from '../types/notification';

const STORAGE_KEY = 'wcg_email_subscription_v1';
const EVENT_NAME = 'wcg_email_subscription_updated';

class NotificationService {
  private cachedSub: EmailSubscription | null = null;
  private listeners: Set<(sub: EmailSubscription | null) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.loadFromStorage();
          this.notify();
        }
      });
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.cachedSub = JSON.parse(raw);
      } else {
        this.cachedSub = null;
      }
    } catch {
      this.cachedSub = null;
    }
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try { cb(this.cachedSub); } catch {}
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: this.cachedSub }));
    }
  }

  /**
   * Lấy subscription hiện tại từ cache / LocalStorage
   */
  public getSubscription(): EmailSubscription | null {
    if (!this.cachedSub && typeof window !== 'undefined') {
      this.loadFromStorage();
    }
    return this.cachedSub;
  }

  /**
   * Kiểm tra game có đang được người dùng theo dõi hay không
   */
  public isGameFollowed(slug: string): boolean {
    if (!slug) return false;
    const sub = this.getSubscription();
    if (!sub || !sub.isActive || !Array.isArray(sub.subscribedGames)) return false;
    return sub.subscribedGames.includes(slug.trim());
  }

  /**
   * Lưu subscription cục bộ và đẩy lên server đồng bộ
   */
  public async saveSubscription(sub: EmailSubscription): Promise<{ success: boolean; message?: string }> {
    this.cachedSub = sub;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
      } catch {}
    }
    this.notify();

    // Đồng bộ lên Cloudflare D1
    try {
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sub.email,
          userId: sub.userId,
          notifyFollowedCodes: sub.notifyFollowedCodes,
          notifyGiveaways: sub.notifyGiveaways,
          notifySales: sub.notifySales,
          subscribedGames: sub.subscribedGames,
        }),
      });

      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        if (data.subscriber) {
          this.cachedSub = { ...sub, ...data.subscriber };
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedSub)); } catch {}
          }
          this.notify();
        }
        return { success: true, message: data?.message || 'Cập nhật thành công!' };
      }
      return { success: false, message: data?.message || 'Không thể đồng bộ lên máy chủ.' };
    } catch (err: any) {
      return { success: true, message: 'Đã lưu cài đặt trên thiết bị của bạn.' };
    }
  }

  /**
   * Thêm 1 game vào danh sách theo dõi
   */
  public async followGame(slug: string, emailFallback?: string): Promise<{ success: boolean; requiresEmail?: boolean }> {
    const cleanSlug = slug.trim();
    const current = this.getSubscription();

    if (!current || !current.email) {
      if (emailFallback) {
        const newSub: EmailSubscription = {
          email: emailFallback.trim().toLowerCase(),
          notifyFollowedCodes: true,
          notifyGiveaways: true,
          notifySales: true,
          subscribedGames: [cleanSlug],
          isActive: true,
        };
        await this.saveSubscription(newSub);
        return { success: true };
      }
      return { success: false, requiresEmail: true };
    }

    const games = Array.from(new Set([...(current.subscribedGames || []), cleanSlug]));
    await this.saveSubscription({
      ...current,
      subscribedGames: games,
      notifyFollowedCodes: true,
      isActive: true,
    });
    return { success: true };
  }

  /**
   * Bỏ theo dõi 1 game
   */
  public async unfollowGame(slug: string): Promise<boolean> {
    const cleanSlug = slug.trim();
    const current = this.getSubscription();
    if (!current) return true;

    const games = (current.subscribedGames || []).filter((s) => s !== cleanSlug);
    await this.saveSubscription({
      ...current,
      subscribedGames: games,
    });
    return true;
  }

  /**
   * Hủy toàn bộ đăng ký nhận email
   */
  public async unsubscribeAll(): Promise<boolean> {
    const current = this.getSubscription();
    if (current && current.email) {
      try {
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: current.email }),
        });
      } catch {}
    }

    this.cachedSub = current ? { ...current, isActive: false } : null;
    if (typeof window !== 'undefined') {
      try {
        if (this.cachedSub) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedSub));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
    }
    this.notify();
    return true;
  }

  /**
   * Lắng nghe cập nhật
   */
  public subscribe(callback: (sub: EmailSubscription | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const notificationService = new NotificationService();
