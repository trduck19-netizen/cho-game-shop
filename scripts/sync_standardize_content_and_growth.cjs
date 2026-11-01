const fs = require('fs');

const SYNC_KEY = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';
const ENDPOINTS = [
  'https://codegame.shop/api/sync',
  'https://web-code-game.pages.dev/api/sync',
  'https://admin-code-game-shop.pages.dev/api/sync'
];

async function run() {
  console.log('--- 1. Fetching current content & growth config from live edge ---');
  let currentContent = [];
  let currentGrowth = {};

  try {
    const res = await fetch('https://codegame.shop/api/sync?fresh=1&t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      currentContent = Array.isArray(data.content) ? data.content : [];
      currentGrowth = data.growthConfig || {};
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }

  const nowIso = new Date().toISOString();

  // Standardize full Vietnamese diacritics
  const contentMap = new Map();
  currentContent.forEach(item => {
    if (item && item.key) contentMap.set(item.key, item);
  });

  // 1. Update announcement_banner with full diacritics
  const existingAnn = contentMap.get('announcement_banner') || {};
  contentMap.set('announcement_banner', {
    ...existingAnn,
    id: existingAnn.id || 'cnt_announcement',
    key: 'announcement_banner',
    title: 'Chào mừng đến với CodeGame.shop',
    content: 'Tra cứu và nhận mã giftcode miễn phí mới nhất.',
    isActive: true,
    type: 'ANNOUNCEMENT',
    updatedAt: nowIso
  });

  // 2. Update hero_banner with full diacritics
  const existingHero = contentMap.get('hero_banner') || {};
  contentMap.set('hero_banner', {
    ...existingHero,
    id: existingHero.id || 'cnt_hero',
    key: 'hero_banner',
    title: 'Kho Giftcode & Mã Quà Tặng Game',
    content: 'Tra cứu tức thì hàng nghìn mã code quà tặng mới nhất.',
    isActive: true,
    type: 'HERO',
    extraData: {
      ...(existingHero.extraData || {}),
      badge: 'CẬP NHẬT TỰ ĐỘNG 24/7',
      titleHighlight: 'Độc Quyền'
    },
    updatedAt: nowIso
  });

  const updatedContent = Array.from(contentMap.values());

  // 3. Ensure growth config is strictly disabled as configured by admin
  const updatedGrowth = {
    ...currentGrowth,
    isEnabled: false,
    welcomeBonusEnabled: false,
    firstDepositBonusEnabled: false,
    wheelEnabled: false,
    leaderboardEnabled: false,
    lastUpdated: nowIso
  };

  console.log('\n--- 2. Pushing authoritative accented content & disabled growth config to all Cloudflare D1 nodes ---');
  for (const url of ENDPOINTS) {
    try {
      console.log(`\nSyncing to: ${url}`);
      const headers = {
        'Content-Type': 'application/json',
        'X-Sync-Key': SYNC_KEY
      };

      // Push content
      const resContent = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'wcg_admin_content_v4',
          data: updatedContent,
          content: updatedContent
        })
      });
      console.log(`  Push Content: status ${resContent.status}`);

      // Push growth config
      const resGrowth = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'wcg_growth_config_v1',
          data: updatedGrowth,
          growthConfig: updatedGrowth
        })
      });
      console.log(`  Push GrowthConfig: status ${resGrowth.status}`);
    } catch (e) {
      console.error(`  Error pushing to ${url}:`, e.message);
    }
  }

  console.log('\n--- 3. Verifying updated data from codegame.shop ---');
  try {
    const resVerify = await fetch('https://codegame.shop/api/sync?fresh=1&t=' + Date.now());
    const verifyData = await resVerify.json();
    console.log('growthConfig.isEnabled =', verifyData.growthConfig?.isEnabled);
    const ann = verifyData.content?.find(c => c.key === 'announcement_banner');
    const hero = verifyData.content?.find(c => c.key === 'hero_banner');
    console.log('announcement_banner:', ann?.title, '•', ann?.content);
    console.log('hero_banner:', hero?.title, '|', hero?.extraData?.titleHighlight, '|', hero?.extraData?.badge);
  } catch (err) {
    console.error('Verify error:', err.message);
  }
}

run();
