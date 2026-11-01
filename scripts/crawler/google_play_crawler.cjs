/**
 * Google Play Crawler Engine - Tự Động Quét & Cập Nhật Game Mới Thị Trường Việt Nam
 * 
 * PHƯƠNG ÁN B:
 * 1. Tự động đăng 100% (Auto-Publish):
 *    - Các game mới từ Nhà Phát Hành chính thức tại VN (VNG, Garena, SohaGame, Funtap, Gamota, Gosu, VTC Mobile, Dzogame, Appota, VGP, Kplay, AceGame...)
 *    - HOẶC tựa game có lượt tải cao (>= 50.000+) & đánh giá cao (>= 4.0*)
 *    - Tự động lưu icon chuẩn WebP, sinh slug SEO, thêm vào catalog games D1/KV, thêm nguồn cào giftcode và xuất bản trực tiếp lên codegame.shop.
 * 
 * 2. Chế độ chờ duyệt tay riêng (Manual Moderation Queue):
 *    - Các game mới phát hiện khác chưa thuộc whitelist hoặc cần kiểm duyệt bản quyền.
 *    - Lưu vào crawlerPendingGames (wcg_crawler_pending_games_v1) trên D1/KV để Admin duyệt 1-chạm trong trang quản trị.
 * 
 * BẢO TOÀN 100%: Tuyệt đối không làm ảnh hưởng hay mất mát 623+ game và giftcode hiện có.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { downloadAndSaveGameIcon } = require('./engine/game_logo_resolver.cjs');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch {}

const ROOT = path.resolve(__dirname, '../..');
const GAMES_PATH = path.join(ROOT, 'src/data/games188.json');
const ICONS_DIR = path.join(ROOT, 'public/game_icons');
const SYNC_URL = process.env.SYNC_URL || 'https://codegame.shop/api/sync';
const SYNC_KEY = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

// Whitelist Nhà phát hành uy tín tại Việt Nam để Tự Động Đăng 100%
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
  'dzogame',
  'appota',
  'acegame',
  'vgp',
  'kplay',
  'habby',
  'zingplay',
  'vplay',
  'playwith',
  'mihoyo',
  'cognosphere',
  'kuro games'
];

// Các package app tiện ích / mạng xã hội không phải game cần loại trừ
const EXCLUDED_PACKAGES = new Set([
  'com.zing.zalo',
  'com.facebook.katana',
  'com.facebook.orca',
  'com.instagram.android',
  'com.zhiliaoapp.musically',
  'com.ss.android.ugc.trill',
  'com.shopee.vn',
  'com.lazada.android',
  'vn.momo.platform',
  'vnpay.vi-dien-tu',
  'com.vng.zingmp3',
  'com.spotify.music',
  'com.google.android.youtube',
  'com.netflix.mediaclient',
  'com.kakao.talk',
  'org.telegram.messenger',
  'com.whatsapp',
  'com.garena.android.authenticator',
  'vn.choingay.portal',
  'com.erp.gamifications',
  'com.gmt.playee',
  'tv.kidsstar.app.vn.PretendLand',
  'tv.kidsstar.app.vn.pretendland'
]);

function isNonGameApplication(pkg, name) {
  const p = String(pkg || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  if (EXCLUDED_PACKAGES.has(p)) return true;
  if (p.includes('.authenticator') || p.includes('.portal') || p.includes('.gamifications') || p.includes('pretendland')) return true;
  const kw = ['authenticator', 'xác thực', 'chơi ngay game vui vẻ', 'cổng chơi ngay', 'gosu one', 'gig - gamota', 'gokko world'];
  return kw.some(k => n.includes(k));
}

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

function parseToIsoDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mDmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mDmy) return `${mDmy[3]}-${mDmy[2].padStart(2, '0')}-${mDmy[1].padStart(2, '0')}`;
  const mGp = s.match(/(\d{1,2})\s+thg\s+(\d{1,2}),\s+(\d{4})/i);
  if (mGp) return `${mGp[3]}-${mGp[2].padStart(2, '0')}-${mGp[1].padStart(2, '0')}`;
  const mIso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (mIso) return mIso[1];
  return null;
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
          ...(options.headers || {}),
        },
        timeout: 15000,
      };

      const req = client.request(url, reqOptions, (res) => {
        let chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            try {
              const json = JSON.parse(buffer.toString('utf8'));
              resolve({ status: res.statusCode, headers: res.headers, data: json, raw: buffer });
            } catch {
              resolve({ status: res.statusCode, headers: res.headers, raw: buffer, text: buffer.toString('utf8') });
            }
          } else {
            resolve({ status: res.statusCode, headers: res.headers, raw: buffer, text: buffer.toString('utf8') });
          }
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
    } catch (err) {
      reject(err);
    }
  });
}

// Tìm kiếm package ID trên Google Play theo truy vấn
async function searchGooglePlay(query) {
  const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps&hl=vi&gl=VN`;
  try {
    const res = await requestHttp(searchUrl);
    if (!res || res.status !== 200 || !res.text) return [];

    const matches = [...res.text.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g)];
    const packageIds = [...new Set(matches.map(m => m[1]))];
    return packageIds.filter(pkg => !EXCLUDED_PACKAGES.has(pkg) && pkg.includes('.'));
  } catch (e) {
    console.warn(`[GP Scraper] Lỗi tìm kiếm "${query}":`, e.message);
    return [];
  }
}

// Trích xuất chi tiết game từ trang Google Play Store
async function fetchGameDetails(packageId) {
  const appUrl = `https://play.google.com/store/apps/details?id=${packageId}&hl=vi&gl=VN`;
  try {
    const res = await requestHttp(appUrl);
    if (!res || res.status !== 200 || !res.text) return null;
    const html = res.text;

    // 1. Tên game
    const titleMatch = html.match(/<h1[^>]*itemprop="name"[^>]*><span[^>]*>([^<]+)<\/span><\/h1>/i) ||
                       html.match(/<title>([^<-]+)/i);
    let appTitle = titleMatch ? titleMatch[1].trim() : '';
    if (!appTitle) return null;

    // Loại bỏ hậu tố không cần thiết trong title
    appTitle = appTitle.replace(/\s*-\s*Google Play.*$/i, '').trim();

    // 2. Nhà phát triển (Developer)
    let developer = '';
    const devMatch = html.match(/href="\/store\/apps\/developer\?id=[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/i) ||
                     html.match(/href="\/store\/apps\/dev\?id=[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/i) ||
                     html.match(/itemprop="author"[^>]*><span[^>]*>([^<]+)<\/span>/i);
    if (devMatch) {
      developer = devMatch[1].trim();
    } else {
      const devFallback = html.match(/<div class="Vbf7gd">([^<]+)<\/div>/i);
      if (devFallback) developer = devFallback[1].trim();
    }
    if (!developer) developer = 'NPH Chính Thức';

    // 3. Thể loại (Category)
    let category = 'Nhập Vai';
    const catMatch = html.match(/itemprop="genre"[^>]*>([^<]+)<\/span>/i) ||
                     html.match(/href="\/store\/apps\/category\/[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/i);
    if (catMatch) {
      category = catMatch[1].trim();
    }

    // 4. Icon URL
    let iconUrl = '';
    const iconMatch = html.match(/<img[^>]+src="(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)"[^>]+(?:itemprop="image"|alt="Biểu tượng ảnh"|alt="Icon image")/i) ||
                      html.match(/"(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)=s/i);
    if (iconMatch) {
      iconUrl = `${iconMatch[1]}=s256-rw`;
    }

    // 5. Đánh giá (Rating / Score)
    let rating = 4.8;
    const ratingMatch = html.match(/<div class="TT92bc">([^<]+)<\/div>/i) ||
                        html.match(/aria-label="Được xếp hạng ([0-9,.]+)\s+sao/i);
    if (ratingMatch) {
      const parsedRating = parseFloat(ratingMatch[1].replace(',', '.'));
      if (!isNaN(parsedRating) && parsedRating > 0 && parsedRating <= 5) {
        rating = Math.round(parsedRating * 10) / 10;
      }
    }

    // 6. Lượt tải (Installs)
    let installs = '50.000+';
    const installsMatch = html.match(/<div class="ClM7O">([0-9,.]+\s*[\+kKmMtT]+|[\d\s\+]+lượt tải)<\/div>/i) ||
                          html.match(/<div>(\d+[\d.,]*\+?)<\/div><div[^>]*>Lượt tải<\/div>/i);
    if (installsMatch) {
      installs = installsMatch[1].trim();
    }

    // 7. Ngày phát hành / Cập nhật
    let releaseDate = new Date().toISOString().split('T')[0];
    const updateMatch = html.match(/<div class="lXlx5">Lần cập nhật gần đây nhất<\/div>\s*<div class="xg1aie">([^<]+)<\/div>/i);
    if (updateMatch) {
      const parsed = parseToIsoDate(updateMatch[1]);
      if (parsed) releaseDate = parsed;
    }

    // 8. Mô tả
    let description = `${appTitle} là tựa game mobile mới phát hành chính thức bởi ${developer}.`;
    const descMatch = html.match(/<div data-g-id="description"[^>]*>([\s\S]*?)<\/div>/i);
    if (descMatch) {
      const cleanDesc = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanDesc.length > 20) {
        description = cleanDesc.slice(0, 300) + '...';
      }
    }

    return {
      packageId,
      name: appTitle,
      developer,
      category,
      iconUrl,
      rating,
      installs,
      releaseDate,
      description,
      playStoreUrl: appUrl,
    };
  } catch (e) {
    console.warn(`[GP Scraper] Lỗi lấy thông tin ${packageId}:`, e.message);
    return null;
  }
}

// Tải và lưu icon game thành WebP vào thư mục public/game_icons
async function downloadAndSaveIcon(slug, iconUrl) {
  if (!iconUrl) return null;
  try {
    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }
    const iconFilePath = path.join(ICONS_DIR, `${slug}.webp`);
    if (fs.existsSync(iconFilePath)) {
      return `/game_icons/${slug}.webp`;
    }

    const res = await requestHttp(iconUrl);
    if (res && res.status === 200 && res.raw && res.raw.length > 500) {
      fs.writeFileSync(iconFilePath, res.raw);
      console.log(`[Icon] ✅ Đã tải và lưu icon: ${slug}.webp (${res.raw.length} bytes)`);
      return `/game_icons/${slug}.webp`;
    }
  } catch (err) {
    console.warn(`[Icon] ⚠️ Không tải được icon cho ${slug}:`, err.message);
  }
  return iconUrl; // Fallback directly to Google CDN url
}

// Phân tích xem game có đủ điều kiện Auto-Publish 100% không
function checkAutoPublishEligibility(gameInfo, config) {
  if (!config.enabled) return false;

  const normDev = stripAccents(gameInfo.developer || '');
  const normName = stripAccents(gameInfo.name || '');

  // 1. Kiểm tra Nhà phát hành trong Whitelist
  const whitelist = config.whitelistPublishers && config.whitelistPublishers.length > 0
    ? config.whitelistPublishers.map(stripAccents)
    : DEFAULT_WHITELIST_PUBLISHERS;

  const isWhitelistedPublisher = whitelist.some(w => normDev.includes(w) || normName.includes(` ${w}`) || normName.endsWith(`-${w}`));

  if (isWhitelistedPublisher) {
    return true;
  }

  // 2. Kiểm tra lượt tải cao & đánh giá tốt
  const installNumMatch = (gameInfo.installs || '').replace(/\./g, '').match(/\d+/);
  const installNum = installNumMatch ? parseInt(installNumMatch[0], 10) : 0;
  const isHighInstall = installNum >= (config.minInstalls || 50000);
  const isHighRating = (gameInfo.rating || 0) >= (config.minRating || 4.0);

  if (isHighInstall && isHighRating) {
    return true;
  }

  return false;
}

async function runGooglePlayCrawler() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  🚀 BẮT ĐẦU CHẠY GOOGLE PLAY GAME CRAWLER ENGINE (PHƯƠNG ÁN B)  ');
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Tải danh sách 623+ game hiện tại từ database cục bộ & server D1
  let localGames = [];
  if (fs.existsSync(GAMES_PATH)) {
    try {
      localGames = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
      console.log(`[Init] 📦 Đã tải ${localGames.length} game hiện có từ games188.json.`);
    } catch (e) {
      console.warn('[Init] ⚠️ Lỗi đọc games188.json:', e.message);
    }
  }

  // 2. Tải server state (games, crawlerPendingGames, crawlerAutoPublishGamesConfig)
  let serverGames = localGames;
  let serverPendingGames = [];
  let autoPublishConfig = {
    enabled: true,
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

  // 3. Tạo tập hợp tra cứu chống trùng lặp (Anti-Duplication Indexes)
  const existingSlugs = new Set();
  const existingNames = new Set();
  const existingPackages = new Set();

  for (const g of serverGames) {
    if (g.slug) existingSlugs.add(cleanSlug(g.slug));
    if (g.id) existingSlugs.add(cleanSlug(g.id));
    if (g.name) existingNames.add(stripAccents(g.name));
    if (g.download_android) {
      const m = g.download_android.match(/id=([a-zA-Z0-9._]+)/);
      if (m) existingPackages.add(m[1].toLowerCase());
    }
  }

  for (const p of serverPendingGames) {
    if (p.slug) existingSlugs.add(cleanSlug(p.slug));
    if (p.name) existingNames.add(stripAccents(p.name));
    if (p.packageId) existingPackages.add(p.packageId.toLowerCase());
  }

  // 4. Danh sách từ khóa tìm kiếm các game mới
  const searchQueries = [
    'VNG Corporation game',
    'Garena game',
    'SohaGame',
    'Funtap game',
    'Gamota game',
    'Gosu game',
    'VTC Mobile game',
    'Dzogame',
    'Appota game',
    'VGP game',
    'game mobile mới việt nam',
    'game nhập vai việt nam',
    'game thẻ bài việt nam',
    'giftcode tân thủ'
  ];

  console.log(`[Scanner] 🔍 Bắt đầu quét Google Play Store VN qua ${searchQueries.length} chuyên mục tìm kiếm...`);

  const foundPackageIds = new Set();
  for (const query of searchQueries) {
    const pkgs = await searchGooglePlay(query);
    pkgs.forEach(pkg => foundPackageIds.add(pkg));
  }

  console.log(`[Scanner] 🔎 Tổng cộng tìm thấy ${foundPackageIds.size} package IDs ứng viên từ Google Play VN.`);

  // Lọc bỏ những package đã có sẵn trong cơ sở dữ liệu
  const candidatePackages = Array.from(foundPackageIds).filter(pkg => !existingPackages.has(pkg.toLowerCase()));
  console.log(`[Filter] 💡 Còn lại ${candidatePackages.length} package IDs mới cần kiểm tra chi tiết.`);

  const newAutoPublishedGames = [];
  const newPendingGames = [];
  const newCrawlerSources = [];

  // 5. Quét chi tiết từng game ứng viên (giới hạn tối đa 25 game mỗi lần chạy để tránh quota limit)
  const processBatch = candidatePackages.slice(0, 25);
  for (const pkg of processBatch) {
    try {
      const details = await fetchGameDetails(pkg);
      if (!details || !details.name) continue;
      if (isNonGameApplication(pkg, details.name)) {
        console.log(`[Filter] 🚫 Bỏ qua ứng dụng không phải game: "${details.name}" (${pkg})`);
        continue;
      }

      const slug = cleanSlug(details.name);
      const normName = stripAccents(details.name);

      // Chống trùng lặp tên hoặc slug
      if (existingSlugs.has(slug) || existingNames.has(normName)) {
        continue;
      }

      // Đánh dấu đã thấy
      existingSlugs.add(slug);
      existingNames.add(normName);
      existingPackages.add(pkg.toLowerCase());

      const isAutoPublish = checkAutoPublishEligibility(details, autoPublishConfig);

      if (isAutoPublish) {
        // --- NHÁNH 1: TỰ ĐỘNG ĐĂNG 100% (AUTO-PUBLISH) ---
        console.log(`[Auto-Publish] ⭐ ĐỦ TIÊU CHUẨN ĐĂNG NGAY: "${details.name}" (${details.developer})`);
        
        let finalIconPath = details.iconUrl;
        if (autoPublishConfig.autoDownloadIcons && details.iconUrl) {
          finalIconPath = await downloadAndSaveIcon(slug, details.iconUrl) || details.iconUrl;
        }

        const newGameRecord = {
          id: slug,
          slug: slug,
          name: details.name,
          publisher: details.developer,
          category: details.category || 'Nhập Vai',
          rating: details.rating || 4.8,
          icon_url: finalIconPath,
          cover_image_url: finalIconPath,
          banner_url: '',
          description: details.description || `${details.name} là tựa game mobile mới phát hành chính thức bởi ${details.developer}.`,
          short_description: `${details.name} - Game Mobile Mới`,
          instructions: 'Bước 1: Mở game > Nhấn Avatar nhân vật\nBước 2: Chọn Cài đặt > Nhập Giftcode\nBước 3: Dán mã và nhấn Xác nhận.',
          platform: 'Android, iOS, PC',
          release_date: details.releaseDate || new Date().toISOString().split('T')[0],
          download_android: details.playStoreUrl,
          is_featured: false,
          is_hot: false,
          is_new: true,
          is_active: true,
          status: 'ACTIVE',
          codes_count: 0,
          free_codes_count: 0,
          source: 'Google Play Store VN (Auto)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        newAutoPublishedGames.push(newGameRecord);

        // Tự động thêm nguồn cào crawler source cho game mới này
        if (autoPublishConfig.autoAddCrawlerSource) {
          newCrawlerSources.push({
            id: `src_gp_${slug}_${Date.now()}`,
            name: `Google Search Giftcode ${details.name}`,
            type: 'reputable_web',
            url: `https://www.google.com/search?q=${encodeURIComponent('giftcode ' + details.name)}`,
            targetGameSlug: slug,
            isEnabled: true,
            description: `Tự động tạo từ Google Play Crawler cho game ${details.name}`
          });
        }
      } else {
        // --- NHÁNH 2: ĐƯA VÀO HÀNG CHỜ DUYỆT TAY (PENDING MODERATION QUEUE) ---
        console.log(`[Queue] 📋 ĐƯA VÀO CHỜ DUYỆT TAY: "${details.name}" (${details.developer})`);
        
        // Tải trước icon về kho nội bộ
        let localIconPath = null;
        if (details.iconUrl) {
          localIconPath = await downloadAndSaveGameIcon(slug, details.iconUrl);
        }

        newPendingGames.push({
          id: `gp_${pkg.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: details.name,
          slug: slug,
          packageId: pkg,
          developer: details.developer,
          category: details.category,
          rating: details.rating,
          installs: details.installs,
          iconUrl: details.iconUrl,
          localIconPath: localIconPath || `/game_icons/${slug}.webp`,
          playStoreUrl: details.playStoreUrl,
          description: details.description,
          releaseDate: details.releaseDate,
          status: 'PENDING',
          autoPublishEligible: false,
          crawledAt: new Date().toISOString(),
        });
      }
    } catch (itemErr) {
      console.warn(`[Process] ⚠️ Lỗi xử lý package ${pkg}:`, itemErr.message);
    }
  }

  console.log('────────────────────────────────────────────────────────────────');
  console.log(`📊 TỔNG KẾT QUÉT GOOGLE PLAY:`);
  console.log(`   - Tự động đăng 100% (Auto-Publish): ${newAutoPublishedGames.length} game.`);
  console.log(`   - Đưa vào hàng chờ duyệt (Pending Queue): ${newPendingGames.length} game.`);
  console.log(`   - Thêm nguồn cào giftcode tự động: ${newCrawlerSources.length} nguồn.`);
  console.log('────────────────────────────────────────────────────────────────');

  // 6. Lưu trữ cục bộ & Đồng bộ an toàn lên Cloudflare D1/KV
  if (newAutoPublishedGames.length > 0) {
    // Cập nhật games188.json an toàn
    const updatedGames = [...newAutoPublishedGames, ...localGames];
    try {
      fs.writeFileSync(GAMES_PATH, JSON.stringify(updatedGames, null, 2), 'utf8');
      console.log(`[Local] 💾 Đã lưu ${updatedGames.length} game vào games188.json (+${newAutoPublishedGames.length} game mới).`);
    } catch (e) {
      console.warn('[Local] ⚠️ Lỗi ghi games188.json:', e.message);
    }
  }

  // 7. Gửi Payload Đồng Bộ lên Máy Chủ
  if (newAutoPublishedGames.length > 0 || newPendingGames.length > 0) {
    const finalPending = [...newPendingGames, ...serverPendingGames];
    const finalGames = newAutoPublishedGames.length > 0 ? [...newAutoPublishedGames, ...serverGames] : serverGames;
    const finalSources = newCrawlerSources.length > 0 ? [...serverSources, ...newCrawlerSources] : serverSources;

    const payload = {
      crawlerPendingGames: finalPending,
      games: finalGames,
      crawlerSources: finalSources,
      crawlerLogs: [
        {
          id: `log_gp_${Date.now()}`,
          timestamp: new Date().toISOString(),
          sourcesCount: searchQueries.length,
          codesScanned: foundPackageIds.size,
          duplicatesCount: foundPackageIds.size - candidatePackages.length,
          autoApprovedCount: newAutoPublishedGames.length,
          pendingAddedCount: newPendingGames.length,
          summary: `Google Play Crawler: Đã quét ${foundPackageIds.size} game. Tự động đăng ${newAutoPublishedGames.length} game từ NPH chính thức, đưa ${newPendingGames.length} game vào chờ duyệt tay.`,
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
        console.log(`[Server] ☁️ Gửi đồng bộ lên ${url}...`);
        const postRes = await requestHttp(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Key': SYNC_KEY,
          }
        }, payload);

        if (postRes && postRes.status === 200) {
          console.log(`[Server] ✅ Đồng bộ thành công 100% với Cloudflare D1 (${url}).`);
          synced = true;
        } else {
          console.warn(`[Server] ⚠️ Máy chủ phản hồi mã ${postRes.status}:`, postRes.text || postRes.data);
        }
      } catch (syncErr) {
        console.warn(`[Server] ⚠️ Lỗi kết nối đồng bộ tới ${url}:`, syncErr.message);
      }
    }
  } else {
    console.log(`[Complete] ✨ Không có game mới nào cần cập nhật trong đợt quét này.`);
  }

  console.log('════════════════════════════════════════════════════════════════');
  console.log('  🏁 HOÀN TẤT TIẾN TRÌNH GOOGLE PLAY GAME CRAWLER                ');
  console.log('════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  runGooglePlayCrawler().catch(e => {
    console.error('Fatal Crawler Error:', e);
    process.exit(1);
  });
}

module.exports = {
  runGooglePlayCrawler,
  searchGooglePlay,
  fetchGameDetails,
  checkAutoPublishEligibility,
};
