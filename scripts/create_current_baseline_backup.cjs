const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const SYNC_SECRET = (process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef').trim();
const BASE_URL = 'https://codegame.shop';

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function runBackup() {
  console.log('🚀 [BASELINE BACKUP] Đang trích xuất toàn bộ dữ liệu D1 trước khi triển khai Soft-Delete & SSOT...');

  const headers = {
    'X-Sync-Key': SYNC_SECRET,
    'Accept': 'application/json',
  };

  // 1. Tải Master State từ /api/sync
  console.log('📦 1/5. Trích xuất Master State từ /api/sync?fresh=1...');
  const syncData = await fetchWithRetry(`${BASE_URL}/api/sync?fresh=1&_t=${Date.now()}`, { headers });

  // 2. Tải toàn bộ 218 bài tin tức trực tiếp từ /api/news
  console.log('📰 2/5. Trích xuất bài tin tức từ /api/news?status=ALL&limit=all...');
  const newsData = await fetchWithRetry(`${BASE_URL}/api/news?status=ALL&limit=all&_t=${Date.now()}`, { headers });
  const newsArticles = Array.isArray(newsData.articles) ? newsData.articles : (syncData.newsArticles || []);

  // 3. Tải toàn bộ 35 game sắp ra mắt
  console.log('🎮 3/5. Trích xuất 35 game sắp ra mắt từ /api/crawler/ingest-upcoming-games?status=ALL...');
  const upcomingData = await fetchWithRetry(`${BASE_URL}/api/crawler/ingest-upcoming-games?status=ALL&_t=${Date.now()}`, { headers });
  const upcomingGames = Array.isArray(upcomingData.games) ? upcomingData.games : (Array.isArray(upcomingData.data) ? upcomingData.data : []);

  // 4. Tải danh sách nhiệm vụ từ /api/missions
  console.log('🎯 4/5. Trích xuất nhiệm vụ từ /api/missions...');
  const missionsData = await fetchWithRetry(`${BASE_URL}/api/missions?_t=${Date.now()}`, { headers });
  const missions = Array.isArray(missionsData.missions) ? missionsData.missions : [];

  // 5. Tải danh sách thành viên đầy đủ
  console.log('🔐 5/5. Trích xuất thành viên...');
  let members = [];
  try {
    const memRes = await fetchWithRetry(`${BASE_URL}/api/sync?key=wcg_admin_members_v4&fresh=1&_t=${Date.now()}`, { headers });
    members = Array.isArray(memRes.data) ? memRes.data : (Array.isArray(memRes.value) ? memRes.value : (syncData.members || []));
  } catch (e) {
    members = syncData.members || [];
  }

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.replace(/[-:]/g, '').replace('T', '_').slice(0, 15); // YYYYMMDD_HHmmss

  const backupDir = path.join(__dirname, '..', 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const jsonFileName = `baseline_pre_softdelete_${dateStr}.json`;
  const sqlFileName = `baseline_pre_softdelete_${dateStr}.sql`;
  const latestSqlName = `baseline_pre_softdelete_latest.sql`;

  const jsonPath = path.join(backupDir, jsonFileName);
  const sqlPath = path.join(backupDir, sqlFileName);
  const latestSqlPath = path.join(backupDir, latestSqlName);

  const backupPayload = {
    metadata: {
      exportedAt: timestamp,
      sourceUrl: BASE_URL,
      stage: 'BASELINE_PRE_SOFTDELETE_SSOT',
      version: 'v5.0-current-live',
      recordCounts: {
        games: (syncData.games || []).length,
        customFreeCodes: (syncData.customFreeCodes || []).length,
        giveaways: (syncData.giveaways || []).length,
        storeProducts: (syncData.storeProducts || []).length,
        utilities: (syncData.utilities || []).length,
        newsArticles: newsArticles.length,
        upcomingGames: upcomingGames.length,
        missions: missions.length,
        members: members.length,
        eventSchedules: (syncData.eventSchedules || []).length,
        crawlerPendingGames: (syncData.crawlerPendingGames || []).length,
        crawlerPendingCodes: (syncData.crawlerPendingCodes || []).length,
        hasMarketingConfig: Boolean(syncData.marketingConfig),
        marketingConfigFields: syncData.marketingConfig ? Object.keys(syncData.marketingConfig).length : 0,
        hasGrowthConfig: Boolean(syncData.growthConfig),
        growthConfigFields: syncData.growthConfig ? Object.keys(syncData.growthConfig).length : 0,
        hasContent: Boolean(syncData.content),
      }
    },
    games: syncData.games || [],
    customFreeCodes: syncData.customFreeCodes || [],
    deletedFreeCodes: syncData.deletedFreeCodes || [],
    giveaways: syncData.giveaways || [],
    storeProducts: syncData.storeProducts || [],
    utilities: syncData.utilities || [],
    newsArticles: newsArticles,
    upcomingGames: upcomingGames,
    missions: missions,
    eventSchedules: syncData.eventSchedules || [],
    marketingConfig: syncData.marketingConfig || {},
    growthConfig: syncData.growthConfig || {},
    content: syncData.content || {},
    publicPayment: syncData.publicPayment || {},
    universalTemplates: syncData.universalTemplates || {},
    members: members,
    orders: syncData.orders || [],
    inventory: syncData.inventory || [],
    crawlerPendingGames: syncData.crawlerPendingGames || [],
    crawlerPendingCodes: syncData.crawlerPendingCodes || [],
  };

  fs.writeFileSync(jsonPath, JSON.stringify(backupPayload, null, 2), 'utf-8');

  const esc = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const sqlLines = [
    `-- ========================================================`,
    `-- BASELINE RESTORE SCRIPT (SQLite / Cloudflare D1)`,
    `-- Exported At: ${timestamp}`,
    `-- ========================================================`,
    `BEGIN TRANSACTION;`,
    ``,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_admin_games_v5', ${esc(JSON.stringify(syncData.games || []))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_admin_upcoming_games_v1', ${esc(JSON.stringify(upcomingGames))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_news_articles_v1', ${esc(JSON.stringify(newsArticles))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_event_schedules_v1', ${esc(JSON.stringify(syncData.eventSchedules || []))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_marketing_config_v1', ${esc(JSON.stringify(syncData.marketingConfig || {}))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_growth_config_v1', ${esc(JSON.stringify(syncData.growthConfig || {}))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_admin_content_v4', ${esc(JSON.stringify(syncData.content || {}))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_admin_custom_free_codes_v1', ${esc(JSON.stringify(syncData.customFreeCodes || []))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_crawler_pending_games_v1', ${esc(JSON.stringify(syncData.crawlerPendingGames || []))}, datetime('now'));`,
    `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('wcg_crawler_pending_codes_v1', ${esc(JSON.stringify(syncData.crawlerPendingCodes || []))}, datetime('now'));`,
    ``,
    `COMMIT;`
  ];

  const sqlContent = sqlLines.join('\n');
  fs.writeFileSync(sqlPath, sqlContent, 'utf-8');
  fs.writeFileSync(latestSqlPath, sqlContent, 'utf-8');

  const jsonSizeKB = Math.round(fs.statSync(jsonPath).size / 1024);
  const sqlSizeKB = Math.round(fs.statSync(sqlPath).size / 1024);
  const uffdNewsCount = (JSON.stringify(newsArticles).match(/\uFFFD/g) || []).length;
  const uffdUpcomingCount = (JSON.stringify(upcomingGames).match(/\uFFFD/g) || []).length;

  console.log('\n======================================================');
  console.log('✅ KẾT QUẢ XÁC MINH BẢN SAO LƯU HIỆN TẠI (BASELINE)');
  console.log('======================================================');
  console.log(`📁 JSON: ${jsonFileName} (${jsonSizeKB} KB)`);
  console.log(`📁 SQL:  ${sqlFileName} (${sqlSizeKB} KB)`);
  console.log(`🎮 Games:             ${syncData.games?.length} (Yêu cầu >= 582) -> ${syncData.games?.length >= 582 ? 'PASS' : 'FAIL'}`);
  console.log(`📰 News Articles:     ${newsArticles.length} (Yêu cầu == 219) -> ${newsArticles.length === 219 ? 'PASS' : 'FAIL'}`);
  console.log(`🚀 Upcoming Games:     ${upcomingGames.length} (Yêu cầu == 37)  -> ${upcomingGames.length === 37 ? 'PASS' : 'FAIL'}`);
  console.log(`🎁 Giveaways:         ${syncData.giveaways?.length} (Yêu cầu == 44)  -> ${syncData.giveaways?.length === 44 ? 'PASS' : 'FAIL'}`);
  console.log(`🎯 Missions:          ${missions.length} missions`);
  console.log(`⏳ Pending Games:     ${syncData.crawlerPendingGames?.length} pending games`);
  console.log(`🔤 News \\uFFFD:        ${uffdNewsCount} (Yêu cầu == 0) -> ${uffdNewsCount === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`🔤 Upcoming \\uFFFD:    ${uffdUpcomingCount} (Yêu cầu == 0) -> ${uffdUpcomingCount === 0 ? 'PASS' : 'FAIL'}`);
  console.log('======================================================\n');

  if (
    syncData.games?.length >= 582 &&
    newsArticles.length === 219 &&
    upcomingGames.length === 37 &&
    syncData.giveaways?.length === 44 &&
    uffdNewsCount === 0 &&
    uffdUpcomingCount === 0
  ) {
    console.log('🎉 BẢN SAO LƯU BASELINE ĐẠT 100% TIÊU CHÍ XÁC MINH!');
    process.exit(0);
  } else {
    console.error('❌ MỘT SỐ TIÊU CHÍ XÁC MINH CHƯA ĐẠT. DỪNG THAO TÁC.');
    process.exit(1);
  }
}

runBackup().catch(err => {
  console.error('❌ Lỗi chạy script sao lưu:', err);
  process.exit(1);
});
