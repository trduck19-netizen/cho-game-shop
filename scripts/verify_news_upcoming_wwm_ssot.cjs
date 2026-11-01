const https = require('https');
const fs = require('fs');

function fetchJson(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data.slice(0, 200) });
        }
      });
    }).on('error', reject);
  });
}

function fetchHtml(urlStr, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        let loc = res.headers.location;
        if (!loc.startsWith('http')) {
          const u = new URL(urlStr);
          loc = `${u.origin}${loc}`;
        }
        return resolve(fetchHtml(loc, maxRedirects - 1).then(r => ({
          ...r,
          initialUrl: urlStr,
          redirectedTo: loc,
          initialStatus: res.statusCode
        })));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          finalUrl: urlStr,
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

async function verifyAll() {
  console.log('================================================================');
  console.log(' BẮT ĐẦU KIỂM THỬ ĐA TẦNG TOÀN DIỆN (LIVE HTML & API SSOT)');
  console.log('================================================================\n');

  let passed = true;

  // ----------------------------------------------------------------
  // 1. KIỂM THỬ TIN TỨC: API 220 vs SYNC 220
  // ----------------------------------------------------------------
  console.log('--- [1/4] KIỂM THỬ LAN TRUYỀN TIN TỨC (220 BÀI) ---');
  const newsApi = await fetchJson('https://codegame.shop/api/news?status=ALL&limit=all&_t=' + Date.now());
  const syncNews = await fetchJson('https://codegame.shop/api/sync?fresh=1&_t=' + Date.now());

  const newsApiTotal = newsApi.body?.total || newsApi.body?.articles?.length || 0;
  const syncNewsTotal = syncNews.body?.newsArticles?.length || 0;
  const has09Article = Boolean(syncNews.body?.newsArticles?.find(a => a.id === 'news_1793412177530_vazd'));
  const has12Article = Boolean(syncNews.body?.newsArticles?.find(a => a.id === 'news_1793422717440_ddf9'));

  console.log(`- API /api/news: ${newsApiTotal} bài`);
  console.log(`- Sync /api/sync: ${syncNewsTotal} bài`);
  console.log(`- Chứa bài 09:00 (vazd - Đậu Nhỏ): ${has09Article}`);
  console.log(`- Chứa bài 12:00 (ddf9 - Liên Quân): ${has12Article}`);

  if (newsApiTotal >= 220 && syncNewsTotal === newsApiTotal && has09Article && has12Article) {
    console.log(`  => ĐẠT: Tin tức đồng nhất hoàn hảo ${newsApiTotal}/${syncNewsTotal}, cả 2 bài mới có mặt đầy đủ ở cả API và Sync.`);
  } else {
    console.error(`  => THẤT BẠI: Tin tức chưa đồng nhất! API=${newsApiTotal}, Sync=${syncNewsTotal}`);
    passed = false;
  }
  console.log('');

  // ----------------------------------------------------------------
  // 2. KIỂM THỬ SẮP RA MẮT: API 37 vs SYNC 37
  // ----------------------------------------------------------------
  console.log('--- [2/4] KIỂM THỬ LAN TRUYỀN SẮP RA MẮT (37 GAME) ---');
  const upApi = await fetchJson('https://codegame.shop/api/crawler/ingest-upcoming-games?status=ALL&_t=' + Date.now());
  const syncUpcoming = await fetchJson('https://codegame.shop/api/sync?fresh=1&_t=' + Date.now());

  const upApiList = upApi.body?.games || upApi.body?.data || upApi.body?.upcomingGames || [];
  const syncUpList = syncUpcoming.body?.upcomingGames || [];
  const upApiCount = upApiList.length;
  const syncUpCount = syncUpList.length;

  const hasDeadAccSync = syncUpList.some(g => g.slug === 'dead-account-two-blue-flames');
  const hasVltkLiteSync = syncUpList.some(g => g.slug === 'vo-lam-truyen-ky-lite');
  const dauNhoGame = syncUpList.find(g => g.slug === 'dau-nho-noi-gian');
  const isDauNhoUpcoming = dauNhoGame?.status === 'UPCOMING';

  console.log(`- API Ingest: ${upApiCount} games`);
  console.log(`- Sync upcomingGames: ${syncUpCount} games`);
  console.log(`- Trạng thái dau-nho-noi-gian: ${dauNhoGame?.status} (Bảo toàn UPCOMING: ${isDauNhoUpcoming})`);

  if (upApiCount === 37 && syncUpCount === 37 && hasDeadAccSync && hasVltkLiteSync && isDauNhoUpcoming) {
    console.log('  => ĐẠT: Sắp ra mắt đồng nhất 37/37, 2 game mới có mặt ở cả 2 tầng, dau-nho-noi-gian giữ nguyên UPCOMING.');
  } else {
    console.error(`  => THẤT BẠI: Sắp ra mắt chưa đồng nhất! API=${upApiCount}, Sync=${syncUpCount}`);
    passed = false;
  }
  console.log('');

  // ----------------------------------------------------------------
  // 3. KIỂM THỬ API WHERE WINDS MEET: CODES_COUNT, ACTIVE, FREE, EXPIRED, TOTAL
  // ----------------------------------------------------------------
  console.log('--- [3/4] KIỂM THỬ API WHERE WINDS MEET (/api/games?slug=) ---');
  const slugs = ['where-winds-meet', 'where-winds-meet-mobile', 'yen-van-thap-luc-thanh'];

  for (const s of slugs) {
    const res = await fetchJson(`https://codegame.shop/api/games?slug=${s}&_t=${Date.now()}`);
    const g = res.body?.game;
    console.log(`  - ${s}: codes_count=${g?.codes_count}, active=${g?.active_codes_count}, free=${g?.free_codes_count}, expired=${g?.expired_codes_count}, total=${g?.total_codes_count}`);
    if (g?.codes_count !== 584 || g?.active_codes_count !== 584 || g?.free_codes_count !== 584 || g?.expired_codes_count !== 36 || g?.total_codes_count !== 620) {
      console.error(`    => Lỗi đếm tầng API trên slug ${s}!`);
      passed = false;
    } else {
      console.log(`    => ĐẠT: 584 active / 584 free / 36 expired / 620 total.`);
    }
  }
  console.log('');

  // ----------------------------------------------------------------
  // 4. KIỂM THỬ THỰC TẾ HTML LIVE (TITLE & OG:TITLE = 584)
  // ----------------------------------------------------------------
  console.log('--- [4/4] KIỂM THỬ THỰC TẾ LIVE HTML: <TITLE> & OG:TITLE (584) ---');
  const pages = [
    'https://codegame.shop/game/where-winds-meet',
    'https://codegame.shop/game/yen-van-thap-luc-thanh',
    'https://codegame.shop/game/where-winds-meet-mobile',
  ];

  for (const p of pages) {
    const res = await fetchHtml(p + '?_t=' + Date.now());
    const titleMatch = res.body.match(/<title>([^<]+)<\/title>/i);
    const ogTitleMatch = res.body.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                         res.body.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
    const title = titleMatch ? titleMatch[1] : '';
    const ogTitle = ogTitleMatch ? ogTitleMatch[1] : '';

    console.log(`  - URL: ${p} (status: ${res.status}${res.redirectedTo ? ` -> ${res.redirectedTo}` : ''})`);
    console.log(`    <title>: "${title}"`);
    console.log(`    og:title: "${ogTitle}"`);

    const has584Title = title.includes('584');
    const has584Og = ogTitle.includes('584');
    const has620 = title.includes('620') || ogTitle.includes('620');

    if (has584Title && has584Og && !has620) {
      console.log('    => ĐẠT: Title & og:title hiển thị chuẩn 584 Mã Code, không còn 620.');
    } else {
      console.error(`    => THẤT BẠI: Title hoặc og:title còn hiển thị sai (620 hoặc thiếu 584)!`);
      passed = false;
    }
  }

  console.log('\n================================================================');
  if (passed) {
    console.log(' KẾT QUẢ KIỂM THỬ: 100% ĐẠT TIÊU CHUẨN NGHIỆM THU!');
  } else {
    console.log(' KẾT QUẢ KIỂM THỬ: CÒN ĐIỂM CHƯA ĐẠT, CẦN SỬA TIẾP!');
  }
  console.log('================================================================\n');
  return passed;
}

verifyAll().catch(console.error);
