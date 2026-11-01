/**
 * CodeMoi Game Scraper Engine - Tự Động Quét & Cập Nhật Game Mới Từ https://codemoi.net/game-moi/
 * 
 * PHƯƠNG ÁN B:
 * 1. Tự động đăng 100% (Auto-Publish):
 *    - Các game mới từ Nhà Phát Hành trong Whitelist (VNG, Garena, SohaGame, Funtap, Gamota, Gosu, VTC, Dzogame, Appota, VGP, Kplay, VPlay, DigiGames, Gzone, JoyGames, Capcom, TiMi, Efun, Mộc Game, VelaGame...)
 *    - Tải và lưu icon chuẩn WebP vào public/game_icons/{slug}.webp
 *    - Tự động tạo crawler source cho game đó và đăng trực tiếp lên codegame.shop.
 * 
 * 2. Hàng chờ duyệt tay (Pending Moderation Queue):
 *    - Các game mới từ NPH khác chưa thuộc whitelist.
 *    - Lưu vào crawlerPendingGames (wcg_crawler_pending_games_v1) trên D1/KV để Admin duyệt 1-chạm trong trang quản trị.
 * 
 * BẢO TOÀN 100%: Bộ lọc Anti-Duplication đa tầng loại trừ tuyệt đối mọi game và slug trùng lặp.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { resolveAndPersistGameLogo } = require('../engine/game_logo_resolver.cjs');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
} catch {}

const ROOT = path.resolve(__dirname, '../../..');
const GAMES_PATH = path.join(ROOT, 'src/data/games188.json');
const ICONS_DIR = path.join(ROOT, 'public/game_icons');
const SYNC_URL = process.env.SYNC_URL || 'https://codegame.shop/api/sync';
const SYNC_KEY = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

const CODEMOI_GAME_MOI_URL = 'https://codemoi.net/game-moi/';

// Danh sách NPH uy tín tại Việt Nam để Tự Động Đăng 100%
const DEFAULT_WHITELIST_PUBLISHERS = [
  'vng',
  'garena',
  'sohagame',
  'soha game',
  'funtap',
  'gamota',
  'gosu',
  'vtc mobile',
  'vtc game',
  'vtc intecom',
  'vtc',
  'dzogame',
  'appota',
  'acegame',
  'vgp',
  'kplay',
  'vplay',
  'digigames',
  'gzone',
  'joygames',
  'capcom',
  'timi',
  'timi studio',
  'efun',
  'alogame',
  'alo game',
  'vela',
  'velagame',
  'moc game',
  'redfox',
  'apex games',
  'habby',
  'zingplay',
  'playwith',
  'mihoyo',
  'hoyoverse',
  'cognosphere',
  'kuro games'
];

function stripAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function cleanSlug(str) {
  return stripAccents(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getBaseSlug(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-(vplay|vtc|gosu|gamota|soha|sohagame|funtap|vng|garena|vn|mobile|joygames|efun|online)$/g, '')
    .replace(/^-+|-+$/g, '');
}

function isNonGameApplication(pkg, name) {
  const p = String(pkg || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  const nonGamePackages = [
    'com.garena.android.authenticator',
    'vn.choingay.portal',
    'com.erp.gamifications',
    'com.gmt.playee',
    'tv.kidsstar.app.vn.pretendland',
  ];
  if (nonGamePackages.some(pkgId => p.includes(pkgId))) return true;
  if (p.includes('.authenticator') || p.includes('.portal') || p.includes('.gamifications') || p.includes('pretendland')) return true;
  const kw = ['authenticator', 'xác thực', 'chơi ngay game vui vẻ', 'cổng chơi ngay', 'gosu one', 'gig - gamota', 'gokko world'];
  return kw.some(k => n.includes(k));
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseToIsoDate(str) {
  if (!str) return new Date().toISOString().split('T')[0];
  const s = String(str).trim();
  const mDayMonth = s.match(/(\d{1,2})[-\/](\d{1,2})/);
  if (mDayMonth) {
    const day = mDayMonth[1].padStart(2, '0');
    const month = mDayMonth[2].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function requestHttp(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const reqOptions = {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
          ...(options.headers || {})
        },
        timeout: 25000,
      };

      const req = client.request(urlObj, reqOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsedData = body;
          if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
            try {
              parsedData = JSON.parse(body);
            } catch {}
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsedData, raw: body });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout kết nối tới ${url}`));
      });

      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Tải và lưu icon game từ CodeMoi CDN
async function downloadAndSaveIcon(slug, iconUrl) {
  if (!iconUrl) return null;
  try {
    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }
    const targetPath = path.join(ICONS_DIR, `${slug}.webp`);
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1024) {
      return `/game_icons/${slug}.webp`;
    }

    return new Promise((resolve) => {
      try {
        const client = iconUrl.startsWith('https:') ? https : http;
        client.get(iconUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://codemoi.net/'
          },
          timeout: 10000
        }, (res) => {
          if (res.statusCode !== 200) {
            return resolve(null);
          }
          const fileStream = fs.createWriteStream(targetPath);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(`/game_icons/${slug}.webp`);
          });
          fileStream.on('error', () => {
            try { fs.unlinkSync(targetPath); } catch {}
            resolve(null);
          });
        }).on('error', () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  } catch (err) {
    console.warn(`[Icon] ⚠️ Không tải được icon ${slug}:`, err.message);
    return null;
  }
}

/**
 * Trích xuất toàn bộ game mới từ trang https://codemoi.net/game-moi/
 */
async function fetchCodemoiNewGames() {
  console.log(`[CodeMoi] 🌐 Đang tải trang game mới: ${CODEMOI_GAME_MOI_URL}...`);
  const response = await requestHttp(CODEMOI_GAME_MOI_URL);
  if (!response || response.status !== 200 || !response.raw) {
    throw new Error(`Không tải được trang codemoi.net/game-moi/ (HTTP ${response?.status})`);
  }

  const html = response.raw;
  const games = [];

  const liRegex = /<li[^>]*class="[^"]*flex items-start[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = liRegex.exec(html)) !== null) {
    const liContent = match[1];

    const hrefMatch = liContent.match(/href="\/games\/([a-z0-9\-]+)\/?"/i);
    if (!hrefMatch) continue;
    const slug = hrefMatch[1];

    const imgMatch = liContent.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/i);
    let iconUrl = '';
    let altName = '';
    if (imgMatch) {
      iconUrl = imgMatch[1].startsWith('http') ? imgMatch[1] : `https://codemoi.net${imgMatch[1]}`;
      altName = decodeHtmlEntities(imgMatch[2].trim());
    } else {
      iconUrl = `https://codemoi.net/covers/${slug}.webp`;
    }

    const nameMatch = liContent.match(/<span[^>]*class="[^"]*font-semibold[^"]*text-slate-900[^"]*"[^>]*>([^<]+)<\/span>/i);
    const rawName = nameMatch ? nameMatch[1].trim() : (altName || slug);
    const name = decodeHtmlEntities(rawName);

    const infoSpanMatch = liContent.match(/<span[^>]*class="[^"]*text-slate-500[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<\/a>/i);
    let publisher = 'NPH Game Mobile';
    let releaseInfo = '';

    if (infoSpanMatch) {
      const rawInfo = infoSpanMatch[1];
      const cleanInfo = rawInfo.replace(/<!--[\s\S]*?-->/g, '');
      const parts = cleanInfo.split(/<span[^>]*class="mx-1\.5"[^>]*>·<\/span>|·/);
      if (parts.length > 0) {
        publisher = decodeHtmlEntities(parts[0].replace(/<[^>]+>/g, '').trim()) || publisher;
      }
      if (parts.length > 1) {
        releaseInfo = decodeHtmlEntities(parts.slice(1).join(' · ').replace(/<[^>]+>/g, '').trim());
      }
    }

    const codeCountMatch = liContent.match(/<span[^>]*tabular-nums[^>]*>(\d+)[\s\S]*?code đang hoạt động<\/span>/i) 
      || liContent.match(/(\d+)(?:<!--[\s\S]*?-->)?\s*code đang hoạt động/i);
    const activeCodesCount = codeCountMatch ? parseInt(codeCountMatch[1], 10) : 0;

    const isUpcoming = /mở server/i.test(releaseInfo) || /sắp ra mắt/i.test(liContent);

    games.push({
      slug,
      name,
      publisher,
      releaseInfo,
      releaseDate: parseToIsoDate(releaseInfo),
      iconUrl,
      activeCodesCount,
      isUpcoming,
      sourceUrl: `https://codemoi.net/games/${slug}/`,
      status: isUpcoming ? 'UPCOMING' : 'RELEASED',
    });
  }

  return games;
}

// Kiểm tra xem game từ CodeMoi có đủ điều kiện Auto-Publish 100% không
function checkAutoPublishEligibility(gameInfo, config) {
  if (!config.enabled) return false;

  // 1. Tự động xuất bản ngay nếu game mới có giftcode hoạt động (mặc định BẬT)
  const autoPublishWhenHasCodes = config.autoPublishWhenHasCodes !== false;
  if (autoPublishWhenHasCodes && Number(gameInfo.activeCodesCount || 0) > 0) {
    return true;
  }

  // 2. Hoặc nếu nhà phát hành nằm trong danh sách whitelist uy tín
  const normDev = stripAccents(gameInfo.publisher || '');
  const normName = stripAccents(gameInfo.name || '');

  const whitelist = config.whitelistPublishers && config.whitelistPublishers.length > 0
    ? config.whitelistPublishers.map(stripAccents)
    : DEFAULT_WHITELIST_PUBLISHERS;

  return whitelist.some(w => normDev.includes(w) || normName.includes(` ${w}`) || normName.endsWith(`-${w}`));
}

/**
 * Bộ máy chính quét game mới từ CodeMoi.net & áp dụng Phương Án B
 */
async function runCodemoiGameCrawler(options = {}) {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  🚀 BẮT ĐẦU QUÉT GAME MỚI TỪ CODEMOI.NET (PHƯƠNG ÁN B)         ');
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Tải danh sách 623+ game hiện tại từ database cục bộ
  let localGames = [];
  if (fs.existsSync(GAMES_PATH)) {
    try {
      localGames = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
      console.log(`[Init] 📦 Đã tải ${localGames.length} game hiện có từ games188.json.`);
    } catch (e) {
      console.warn('[Init] ⚠️ Lỗi đọc games188.json:', e.message);
    }
  }

  // 2. Nạp server state từ Cloudflare D1/KV
  let serverGames = localGames;
  let serverPendingGames = [];
  let autoPublishConfig = {
    enabled: true,
    autoPublishWhenHasCodes: true,
    whitelistPublishers: DEFAULT_WHITELIST_PUBLISHERS,
    minInstalls: 50000,
    minRating: 4.0,
    autoDownloadIcons: true,
    autoAddCrawlerSource: true,
  };
  let serverSources = [];

  try {
    console.log(`[Sync] 🔄 Đồng bộ dữ liệu hiện thời từ server: ${SYNC_URL}`);
    const syncRes = await requestHttp(`${SYNC_URL}?fresh=true`, {
      headers: { 'X-Sync-Key': SYNC_KEY },
    });
    if (syncRes && syncRes.status === 200 && syncRes.data && syncRes.data.success) {
      if (Array.isArray(syncRes.data.games) && syncRes.data.games.length > 0) {
        serverGames = syncRes.data.games;
      }
      if (Array.isArray(syncRes.data.crawlerPendingGames)) {
        serverPendingGames = syncRes.data.crawlerPendingGames;
      }
      if (syncRes.data.crawlerAutoPublishGamesConfig) {
        autoPublishConfig = { ...autoPublishConfig, ...syncRes.data.crawlerAutoPublishGamesConfig };
      }
      if (Array.isArray(syncRes.data.crawlerSources)) {
        serverSources = syncRes.data.crawlerSources;
      }
      console.log(`[Sync] ✅ Đã nạp từ server: ${serverGames.length} game, ${serverPendingGames.length} game chờ duyệt.`);
    }
  } catch (e) {
    console.warn(`[Sync] ⚠️ Không kết nối được server sync (${e.message}), sử dụng dữ liệu cục bộ.`);
  }

  // 3. Xây dựng tập hợp chống trùng lặp đa lớp (Exact Slug, Norm Name, Base Slug)
  const existingSlugs = new Set();
  const existingNames = new Set();
  const baseSlugSet = new Set();

  for (const g of serverGames) {
    if (g.slug) {
      existingSlugs.add(cleanSlug(g.slug));
      baseSlugSet.add(getBaseSlug(g.slug));
    }
    if (g.id) {
      existingSlugs.add(cleanSlug(g.id));
      baseSlugSet.add(getBaseSlug(g.id));
    }
    if (g.name) {
      existingNames.add(stripAccents(g.name));
      baseSlugSet.add(getBaseSlug(g.name));
    }
  }

  for (const p of serverPendingGames) {
    if (p.slug) {
      existingSlugs.add(cleanSlug(p.slug));
      baseSlugSet.add(getBaseSlug(p.slug));
    }
    if (p.name) {
      existingNames.add(stripAccents(p.name));
      baseSlugSet.add(getBaseSlug(p.name));
    }
  }

  // 4. Lấy danh sách game mới từ codemoi.net/game-moi/
  const codemoiGames = await fetchCodemoiNewGames();
  console.log(`[CodeMoi] 🔎 Tìm thấy tổng cộng ${codemoiGames.length} game trên chuyên mục game mới của codemoi.net.`);

  const newAutoPublishedGames = [];
  const newPendingGames = [];
  const newCrawlerSources = [];

  for (const item of codemoiGames) {
    if (isNonGameApplication(item.slug || '', item.name || '')) {
      console.log(`[Filter] 🚫 Bỏ qua ứng dụng không phải game: "${item.name}"`);
      continue;
    }
    const slug = cleanSlug(item.slug || item.name);
    const baseSlug = getBaseSlug(slug);
    const normName = stripAccents(item.name);
    const baseName = getBaseSlug(item.name);

    // Chống trùng lặp tuyệt đối
    if (existingSlugs.has(slug) || existingNames.has(normName) || baseSlugSet.has(baseSlug) || baseSlugSet.has(baseName)) {
      continue;
    }

    // Đánh dấu đã thấy
    existingSlugs.add(slug);
    existingNames.add(normName);
    baseSlugSet.add(baseSlug);
    baseSlugSet.add(baseName);

    // Tự động tìm kiếm & tải Logo chính xác từ Google Play Store VN
    const resolvedLogo = await resolveAndPersistGameLogo({
      slug,
      name: item.name,
      developer: item.publisher,
      iconUrl: item.iconUrl,
    });

    const finalIcon = resolvedLogo.localIconPath || `/game_icons/${slug}.webp`;
    const finalPlayStoreUrl = resolvedLogo.playStoreUrl || '';
    const finalPackageId = resolvedLogo.packageId || slug;

    const isAutoPublish = checkAutoPublishEligibility(item, autoPublishConfig);

    if (isAutoPublish) {
      // --- NHÁNH 1: TỰ ĐỘNG ĐĂNG 100% (AUTO-PUBLISH) ---
      console.log(`[Auto-Publish] ⭐ ĐỦ TIÊU CHUẨN ĐĂNG NGAY: "${item.name}" (${item.publisher})`);

      const newGameRecord = {
        id: slug,
        slug: slug,
        name: item.name,
        publisher: item.publisher,
        category: 'Nhập Vai',
        rating: 4.8,
        icon_url: finalIcon,
        cover_image_url: finalIcon,
        banner_url: '',
        description: `${item.name} là tựa game mobile mới phát hành chính thức bởi ${item.publisher}. ${item.releaseInfo ? 'Lịch phát hành: ' + item.releaseInfo + '.' : ''}`,
        short_description: `${item.name} - Game Mobile Mới`,
        instructions: 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
        platform: 'Android, iOS, PC',
        release_date: item.releaseDate,
        download_android: finalPlayStoreUrl,
        is_featured: false,
        is_hot: false,
        is_new: true,
        is_active: true,
        status: 'ACTIVE',
        codes_count: Number(item.activeCodesCount || 0),
        free_codes_count: Number(item.activeCodesCount || 0),
        source: 'Code Mới (codemoi.net)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newAutoPublishedGames.push(newGameRecord);

      // Tự động tạo crawler source thu thập giftcode cho game mới này
      if (autoPublishConfig.autoAddCrawlerSource) {
        newCrawlerSources.push({
          id: `src_cm_${slug}_${Date.now()}`,
          name: `CodeMoi Giftcode ${item.name}`,
          type: 'reputable_web',
          url: item.sourceUrl,
          targetGameSlug: slug,
          isEnabled: true,
          description: `Tự động tạo từ CodeMoi Game Crawler cho game ${item.name}`
        });
      }
    } else {
      // --- NHÁNH 2: HÀNG CHỜ DUYỆT TAY RIÊNG (PENDING MODERATION QUEUE) ---
      console.log(`[Queue] 📋 ĐƯA VÀO CHỜ DUYỆT TAY: "${item.name}" (${item.publisher})`);
      newPendingGames.push({
        id: `cm_${slug}`,
        name: item.name,
        slug: slug,
        packageId: finalPackageId,
        developer: item.publisher,
        category: 'Nhập Vai',
        rating: 4.8,
        installs: item.isUpcoming ? 'Sắp ra mắt' : 'Mới ra mắt',
        iconUrl: resolvedLogo.localIconPath || `/game_icons/${slug}.webp`,
        localIconPath: resolvedLogo.localIconPath || `/game_icons/${slug}.webp`,
        playStoreUrl: finalPlayStoreUrl,
        sourceType: 'codemoi',
        sourceUrl: item.sourceUrl,
        releaseInfo: item.releaseInfo,
        activeCodesCount: item.activeCodesCount,
        description: `${item.name} phát hành bởi ${item.publisher}. ${item.releaseInfo || ''}`,
        releaseDate: item.releaseDate,
        status: 'PENDING',
        autoPublishEligible: false,
        crawledAt: new Date().toISOString(),
      });
    }
  }

  console.log('────────────────────────────────────────────────────────────────');
  console.log(`📊 TỔNG KẾT QUÉT CODEMOI GAME MỚI:`);
  console.log(`   - Tự động đăng 100% (Auto-Publish): ${newAutoPublishedGames.length} game.`);
  console.log(`   - Đưa vào hàng chờ duyệt (Pending Queue): ${newPendingGames.length} game.`);
  console.log(`   - Thêm nguồn cào giftcode tự động: ${newCrawlerSources.length} nguồn.`);
  console.log('────────────────────────────────────────────────────────────────');

  // 5. Lưu trữ cục bộ & Đồng bộ an toàn lên Cloudflare D1/KV
  if (newAutoPublishedGames.length > 0) {
    try {
      const mergedGames = [...newAutoPublishedGames, ...serverGames];
      fs.writeFileSync(GAMES_PATH, JSON.stringify(mergedGames, null, 2), 'utf8');
      const publicGamesPath = path.join(ROOT, 'public/data/games188.json');
      if (fs.existsSync(path.dirname(publicGamesPath))) {
        fs.writeFileSync(publicGamesPath, JSON.stringify(mergedGames, null, 2), 'utf8');
      }
      console.log(`[Save] 💾 Đã lưu ${newAutoPublishedGames.length} game mới xuất bản vào games188.json.`);
    } catch (e) {
      console.warn('[Save] ⚠️ Lỗi lưu games188.json:', e.message);
    }
  }

  // 6. Gửi payload đồng bộ chuẩn lên Cloudflare D1/KV
  if (newAutoPublishedGames.length > 0 || newPendingGames.length > 0 || newCrawlerSources.length > 0) {
    const finalPending = [...newPendingGames, ...serverPendingGames];
    const finalGames = newAutoPublishedGames.length > 0 ? [...newAutoPublishedGames, ...serverGames] : serverGames;
    const finalSources = newCrawlerSources.length > 0 ? [...serverSources, ...newCrawlerSources] : serverSources;

    const payload = {
      crawlerPendingGames: finalPending,
      games: finalGames,
      crawlerSources: finalSources,
      crawlerLogs: [
        {
          id: `log_cm_${Date.now()}`,
          timestamp: new Date().toISOString(),
          sourcesCount: 1,
          codesScanned: codemoiGames.length,
          duplicatesCount: codemoiGames.length - (newAutoPublishedGames.length + newPendingGames.length),
          autoApprovedCount: newAutoPublishedGames.length,
          pendingAddedCount: newPendingGames.length,
          summary: `CodeMoi Game Scraper: Đã quét ${codemoiGames.length} game. Tự động đăng ${newAutoPublishedGames.length} game từ NPH chính thức, đưa ${newPendingGames.length} game vào chờ duyệt tay.`,
        }
      ]
    };

    const syncUrls = [
      SYNC_URL,
      'https://web-code-game.pages.dev/api/sync'
    ];
    let synced = false;
    for (const url of syncUrls) {
      if (synced) break;
      try {
        console.log(`[Sync] 🚀 Đang đẩy ${newAutoPublishedGames.length} game đăng ngay & ${newPendingGames.length} game chờ duyệt lên ${url}...`);
        const syncRes = await requestHttp(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Key': SYNC_KEY,
          }
        }, payload);

        if (syncRes && syncRes.status === 200) {
          console.log(`[Sync] ✅ Đồng bộ thành công lên Cloudflare D1/KV (${url}).`);
          synced = true;
        } else {
          console.warn(`[Sync] ⚠️ Phản hồi từ server sync: HTTP ${syncRes?.status}`, syncRes?.data);
        }
      } catch (e) {
        console.warn(`[Sync] ⚠️ Lỗi khi đẩy dữ liệu lên ${url}:`, e.message);
      }
    }
  } else {
    console.log(`[Sync] ℹ️ Không có game mới nào cần xuất bản hoặc duyệt thêm.`);
  }

  return {
    success: true,
    autoPublishedCount: newAutoPublishedGames.length,
    pendingAddedCount: newPendingGames.length,
    sourcesAddedCount: newCrawlerSources.length,
    autoPublishedGames: newAutoPublishedGames,
    pendingGames: newPendingGames,
  };
}

if (require.main === module) {
  runCodemoiGameCrawler().catch(err => {
    console.error('Lỗi thực thi CodeMoi Crawler:', err);
    process.exit(1);
  });
}

module.exports = {
  fetchCodemoiNewGames,
  runCodemoiGameCrawler,
  checkAutoPublishEligibility,
  DEFAULT_WHITELIST_PUBLISHERS,
  getBaseSlug,
};
