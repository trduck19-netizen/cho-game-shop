// Service to manage PWA install prompt and device platform detection

let deferredInstallPrompt: any = null;
const listeners = new Set<(canInstall: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifyListeners();
  });

  // Register & aggressively update Service Worker to prevent stale asset cache
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Immediately check for updates
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.debug('[PWA] Service worker registration bypassed:', err);
        });
    });
  }
}

function notifyListeners() {
  const can = Boolean(deferredInstallPrompt);
  listeners.forEach((fn) => fn(can));
}

export const pwaService = {
  isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  },

  canPromptInstall(): boolean {
    return Boolean(deferredInstallPrompt);
  },

  subscribe(listener: (canInstall: boolean) => void): () => void {
    listeners.add(listener);
    listener(Boolean(deferredInstallPrompt));
    return () => listeners.delete(listener);
  },

  async promptInstall(): Promise<boolean> {
    if (!deferredInstallPrompt) return false;
    try {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        deferredInstallPrompt = null;
        notifyListeners();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  getPlatform(): 'ios' | 'android' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'desktop';
  }
};
