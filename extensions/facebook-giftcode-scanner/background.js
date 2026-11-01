/**
 * Background Service Worker - CodeGame.Shop Facebook Scanner Extension v1.2.0
 */

const DEFAULT_SETTINGS = {
  apiUrl: 'https://web-code-game.pages.dev/api/sync',
  syncKey: 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef',
  autoPush: true,
  autoDetectGame: true
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['apiUrl', 'syncKey'], (res) => {
    if (!res.apiUrl || !res.syncKey) {
      chrome.storage.local.set(DEFAULT_SETTINGS, () => {
        console.log('[CodeGame Scanner] Đã khởi tạo cấu hình kết nối mặc định.');
      });
    }
  });
});

// Lắng nghe yêu cầu đẩy dữ liệu trực tiếp từ Content Script (Nút nổi 1-Click trên Facebook) hoặc Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PUSH_CODES_TO_SERVER') {
    handlePushCodes(request.payload)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Giữ kênh bất đồng bộ
  }
});

async function handlePushCodes({ codes, gameSlug, gameName, sourceLinks }) {
  const config = await new Promise(resolve => {
    chrome.storage.local.get(['apiUrl', 'syncKey'], resolve);
  });

  const apiUrl = config.apiUrl || DEFAULT_SETTINGS.apiUrl;
  const syncKey = config.syncKey || DEFAULT_SETTINGS.syncKey;

  let approvedCount = 0;
  const errors = [];

  for (const item of codes) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': syncKey
        },
        body: JSON.stringify({
          action: 'approve_crawler_code',
          pendingCode: {
            code: item.code,
            gameId: gameSlug,
            gameSlug: gameSlug,
            gameName: gameName || gameSlug,
            rewards: item.rewards || `Quà tặng sự kiện Fanpage ${gameName || ''}`.trim(),
            expiresAt: item.expiresAt || null,
            sourceUrl: item.sourceUrl || item.postUrl || '',
            sourceType: 'official_fb',
            score: item.score || 95,
            tier: 1
          }
        })
      });

      if (res.ok) {
        approvedCount++;
      } else {
        const text = await res.text();
        errors.push(text);
      }
    } catch (e) {
      errors.push(e.message);
    }
  }

  return {
    success: approvedCount > 0,
    approvedCount,
    total: codes.length,
    errors
  };
}
