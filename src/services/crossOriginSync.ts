class CrossOriginSync {
  private targetOrigin: string = '';
  private bridgeIframe: HTMLIFrameElement | null = null;
  private isBridgeReady: boolean = false;
  private pendingQueue: Array<{ key: string; value: any }> = [];

  constructor() {
    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    if (hostname.includes('admin-code-game-shop')) {
      this.targetOrigin = 'https://codegame.shop';
    } else if (hostname.includes('web-code-game') || hostname.includes('codegame.shop')) {
      this.targetOrigin = 'https://admin-code-game-shop.pages.dev';
    }

    if (this.targetOrigin) {
      this.initBridge();
    }
  }

  private initBridge() {
    try {
      window.addEventListener('message', (event) => {
        if (event.origin === this.targetOrigin && event.data?.type === 'WCG_SYNC_BRIDGE_READY') {
          this.isBridgeReady = true;
          this.flushQueue();
        }
      });

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.src = `${this.targetOrigin}/sync-bridge.html`;

      iframe.onload = () => {
        setTimeout(() => {
          this.isBridgeReady = true;
          this.flushQueue();
        }, 300);
      };

      document.body ? document.body.appendChild(iframe) : window.addEventListener('DOMContentLoaded', () => document.body.appendChild(iframe));
      this.bridgeIframe = iframe;
    } catch (e) {
      console.warn('[CrossOriginSync] Bridge init warning:', e);
    }
  }

  private flushQueue() {
    if (!this.isBridgeReady || !this.bridgeIframe || !this.bridgeIframe.contentWindow) return;
    while (this.pendingQueue.length > 0) {
      const item = this.pendingQueue.shift();
      if (item) {
        this.sendToBridge(item.key, item.value);
      }
    }
  }

  private sendToBridge(key: string, value: any) {
    if (!this.bridgeIframe || !this.bridgeIframe.contentWindow || !this.targetOrigin) return;
    try {
      this.bridgeIframe.contentWindow.postMessage(
        {
          type: 'WCG_CROSS_SYNC_SET',
          key,
          value,
        },
        this.targetOrigin
      );
    } catch (e) {
      console.warn('[CrossOriginSync] Send error:', e);
    }
  }

  public setItem(key: string, value: any): void {
    if (typeof window === 'undefined') return;

    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      localStorage.setItem(key, strValue);
    } catch {}

    if (this.targetOrigin) {
      if (this.isBridgeReady) {
        this.sendToBridge(key, strValue);
      } else {
        this.pendingQueue.push({ key, value: strValue });
      }
    }
  }

  public removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {}

    if (this.targetOrigin) {
      if (this.isBridgeReady) {
        this.sendToBridge(key, null);
      } else {
        this.pendingQueue.push({ key, value: null });
      }
    }
  }
}

export const crossOriginSync = new CrossOriginSync();
