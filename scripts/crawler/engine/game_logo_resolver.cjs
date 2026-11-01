/**
 * Game Logo Resolver Engine (Google Play & Multi-Source Auto-Resolution)
 * 
 * Tự động tìm kiếm, tải và chuẩn hóa Logo game chính xác:
 * 1. Tự động đối soát và tìm kiếm Logo chính thức từ Google Play Store VN (512x512/256x256 WebP).
 * 2. Lưu trữ cố định vào public/game_icons/${slug}.webp và sinh bản Open Graph .jpg.
 * 3. Fallback sang CodeMoi cover / URL gốc nếu game chưa lên Google Play.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

let sharp = null;
try {
  sharp = require('sharp');
} catch {}

const ROOT = path.resolve(__dirname, '../../..');
const ICONS_DIR = path.join(ROOT, 'public/game_icons');

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

function cleanGameQuery(str) {
  if (!str) return '';
  return str
    .replace(/\s*-\s*(VN|Mobile|Online|Gzone|VTC|VPlay|SohaGame|Funtap|Gosu|Gamota|VNG).*$/i, '')
    .replace(/[\(\)\[\]:!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function requestHttp(url, options = {}) {
  return new Promise((resolve) => {
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
        timeout: 12000,
      };

      const req = client.request(urlObj, reqOptions, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            buffer,
            text: buffer.toString('utf8'),
          });
        });
      });

      req.on('error', (err) => resolve({ error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'Timeout kết nối' });
      });
      req.end();
    } catch (err) {
      resolve({ error: err.message });
    }
  });
}

/**
 * Tìm kiếm Logo và thông tin chính thức trên Google Play Store VN
 */
async function searchGooglePlayForLogo(gameName, publisher = '') {
  if (!gameName) return null;

  const queries = [
    gameName,
    cleanGameQuery(gameName),
    publisher ? `${cleanGameQuery(gameName)} ${publisher}` : null,
  ].filter(Boolean);

  const seenPackages = new Set();

  for (const q of queries) {
    try {
      const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=apps&hl=vi&gl=VN`;
      const res = await requestHttp(searchUrl);
      if (!res || res.status !== 200 || !res.text) continue;

      const matches = [...res.text.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g)];
      const packageIds = matches.map(m => m[1]).filter(pkg => pkg && pkg.includes('.') && !pkg.includes('google'));

      for (const pkg of packageIds) {
        if (seenPackages.has(pkg)) continue;
        seenPackages.add(pkg);

        const appUrl = `https://play.google.com/store/apps/details?id=${pkg}&hl=vi&gl=VN`;
        const appRes = await requestHttp(appUrl);
        if (!appRes || appRes.status !== 200 || !appRes.text) continue;

        const html = appRes.text;

        // Trích xuất icon URL
        const iconMatch = html.match(/<img[^>]+src="(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)"[^>]+(?:itemprop="image"|alt="Biểu tượng ảnh"|alt="Icon image")/i) ||
                          html.match(/"(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)=s/i);

        if (!iconMatch) continue;

        const highResIconUrl = `${iconMatch[1]}=s256-rw`;

        // Trích xuất tiêu đề thực chuẩn xác qua og:title hoặc h1
        const ogTitle = (html.match(/<meta property="og:title" content="([^"]+)"/i) || [])[1] || '';
        const titleMatch = html.match(/<h1[^>]*>[\s\S]*?itemprop="name"[^>]*>([^<]+)[\s\S]*?<\/h1>/i) ||
                          html.match(/<h1[^>]*itemprop="name"[^>]*><span[^>]*>([^<]+)<\/span><\/h1>/i) ||
                          html.match(/<title>([^<-]+)/i);
        const appTitle = (ogTitle.replace(/\s*-\s*(?:Ứng dụng trên Google Play|Apps on Google Play).*$/i, '').trim()) ||
                         (titleMatch ? titleMatch[1].trim() : '');

        // Trích xuất NPH
        const devMatch = html.match(/href="\/store\/apps\/developer\?id=[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/i) ||
                         html.match(/itemprop="author"[^>]*><span[^>]*>([^<]+)<\/span>/i);
        const developer = devMatch ? devMatch[1].trim() : publisher;

        // Đánh giá chặt chẽ độ khớp tên game
        const normTarget = stripAccents(cleanGameQuery(gameName));
        const normFound = stripAccents(cleanGameQuery(appTitle));

        // Tuyệt đối không cho phép chuỗi rỗng khớp thành công
        if (!normFound || normFound.length < 2 || !normTarget || normTarget.length < 2) continue;

        // Kiểm tra loại trừ các ứng dụng tiện ích AI / Video không phải game
        const isSuspectNonGame = (html.includes('luma.sora') || html.includes('com.chat.') || /chat|ai video|ai chatbot/i.test(appTitle)) && !/chat|ai/i.test(gameName);
        if (isSuspectNonGame) continue;

        const targetWords = normTarget.split(/\s+/).filter(w => w.length > 2);
        const matchedWords = targetWords.filter(w => normFound.includes(w));
        const wordMatchRatio = targetWords.length > 0 ? (matchedWords.length / targetWords.length) : 0;

        const isMatch = normFound.includes(normTarget) || normTarget.includes(normFound) || wordMatchRatio >= 0.6;

        if (isMatch) {
          return {
            packageId: pkg,
            title: appTitle || gameName,
            developer: developer || publisher,
            iconUrl: highResIconUrl,
            playStoreUrl: appUrl,
          };
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Tải ảnh và lưu cố định vào public/game_icons/${slug}.webp và ${slug}.jpg
 */
async function downloadAndSaveGameIcon(slug, iconUrl) {
  if (!slug || !iconUrl) return null;

  try {
    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    const webpPath = path.join(ICONS_DIR, `${slug}.webp`);
    const jpgPath = path.join(ICONS_DIR, `${slug}.jpg`);

    // Tải ảnh từ URL
    const res = await requestHttp(iconUrl, {
      headers: {
        'Referer': iconUrl.includes('codemoi.net') ? 'https://codemoi.net/' : 'https://play.google.com/',
      }
    });

    if (!res || res.status !== 200 || !res.buffer || res.buffer.length < 500) {
      console.warn(`[Logo Resolver] ⚠️ Không tải được ảnh từ ${iconUrl} (HTTP ${res?.status})`);
      return null;
    }

    const buffer = res.buffer;

    // Lưu file WebP
    if (sharp) {
      try {
        await sharp(buffer)
          .resize(256, 256, { fit: 'cover' })
          .webp({ quality: 90 })
          .toFile(webpPath);

        // Lưu thêm file JPG chất lượng cao cho Zalo / Facebook Open Graph
        await sharp(buffer)
          .resize(512, 512, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toFile(jpgPath);

        if (fs.existsSync(webpPath) && fs.statSync(webpPath).size > 500) {
          return `/game_icons/${slug}.webp`;
        }
      } catch (err) {
        console.warn(`[Logo Resolver] Sharp error for ${slug}, falling back to raw write:`, err.message);
      }
    }

    // Fallback: ghi trực tiếp nếu sharp không chạy
    fs.writeFileSync(webpPath, buffer);
    if (fs.existsSync(webpPath) && fs.statSync(webpPath).size > 500) {
      return `/game_icons/${slug}.webp`;
    }
    return null;
  } catch (err) {
    console.warn(`[Logo Resolver] ⚠️ Lỗi lưu icon ${slug}:`, err.message);
    return null;
  }
}

/**
 * Giải quyết và đảm bảo logo chính xác cho một tựa game (Google Play hoặc Web Fallback)
 */
async function resolveAndPersistGameLogo(game) {
  if (!game || !game.slug) return game;

  const slug = game.slug;
  const name = game.name || slug;
  const publisher = game.developer || game.publisher || '';

  console.log(`[Logo Resolver] 🔍 Đang tìm kiếm logo chính xác cho: "${name}" (${slug})...`);

  // 1. Thử tìm kiếm trên Google Play Store VN
  const gpResult = await searchGooglePlayForLogo(name, publisher);

  let targetIconUrl = game.iconUrl;
  let packageId = game.packageId || '';
  let playStoreUrl = game.playStoreUrl || '';

  if (gpResult && gpResult.iconUrl) {
    console.log(`[Logo Resolver] ✅ Tìm thấy logo Google Play chính thức: ${gpResult.iconUrl}`);
    targetIconUrl = gpResult.iconUrl;
    packageId = gpResult.packageId || packageId;
    playStoreUrl = gpResult.playStoreUrl || playStoreUrl;
  } else {
    console.log(`[Logo Resolver] ℹ️ Không thấy trên Google Play, sử dụng nguồn ảnh gốc: ${targetIconUrl}`);
  }

  // 2. Tải và lưu ảnh vào public/game_icons/
  let localIconPath = null;
  if (targetIconUrl && targetIconUrl.startsWith('http')) {
    const savedPath = await downloadAndSaveGameIcon(slug, targetIconUrl);
    if (savedPath) {
      console.log(`[Logo Resolver] 💾 Đã lưu thành công icon nội bộ: ${savedPath}`);
      localIconPath = savedPath;
    }
  }

  // Xác minh lại nếu file local đã có sẵn trước đó
  const existingWebp = path.join(ICONS_DIR, `${slug}.webp`);
  if (!localIconPath && fs.existsSync(existingWebp) && fs.statSync(existingWebp).size > 500) {
    localIconPath = `/game_icons/${slug}.webp`;
  }

  return {
    ...game,
    iconUrl: targetIconUrl || (localIconPath ? localIconPath : ''),
    packageId: packageId || game.packageId,
    playStoreUrl: playStoreUrl || game.playStoreUrl,
    localIconPath: localIconPath, // null nếu không có file local thật sự
    hasAccurateLogo: Boolean(localIconPath || (targetIconUrl && targetIconUrl.startsWith('http'))),
  };
}

module.exports = {
  searchGooglePlayForLogo,
  downloadAndSaveGameIcon,
  resolveAndPersistGameLogo,
};
