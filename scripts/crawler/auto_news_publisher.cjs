#!/usr/bin/env node
/**
 * Auto News Publisher Engine (Headless Crawler & Autonomous Publisher)
 * Tự động quét các nguồn tin tức/báo game/fanpage cố định,
 * bóc tách giftcode, đối chiếu danh mục game, viết lại chuẩn SEO độc quyền
 * và đồng bộ trực tiếp lên Cloudflare D1 Database.
 */

const fs = require('fs');
const path = require('path');

let sharp = null;
try {
  sharp = require('sharp');
} catch {}

let gameLogoResolver = null;
try {
  gameLogoResolver = require('./engine/game_logo_resolver.cjs');
} catch (e) {
  console.warn('[AutoNews] Cannot load game_logo_resolver:', e?.message);
}

const SYNC_URL = process.env.SYNC_URL || 'https://codegame.shop/api/sync';
const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

const ROOT_DIR = path.resolve(__dirname, '../..');
const NEWS_COVERS_DIR = path.join(ROOT_DIR, 'public/news_covers');
const GAME_ICONS_DIR = path.join(ROOT_DIR, 'public/game_icons');
if (!fs.existsSync(NEWS_COVERS_DIR)) fs.mkdirSync(NEWS_COVERS_DIR, { recursive: true });
if (!fs.existsSync(GAME_ICONS_DIR)) fs.mkdirSync(GAME_ICONS_DIR, { recursive: true });

// Load games catalog for intelligent matching
let gamesCatalog = [];
try {
  const catalogPath = path.resolve(__dirname, '../../src/data/games188.json');
  if (fs.existsSync(catalogPath)) {
    gamesCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }
} catch (err) {
  console.warn('[AutoNews] Cannot load games catalog from disk:', err?.message);
}

function normalizeVietnamese(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BLACKLIST_NEWS_KEYWORDS = [
  // 1. Phụ kiện công nghệ
  'tui chong soc', 'túi chống sốc', 'balo laptop', 'ba lô laptop',
  'chuot gaming', 'chuột gaming', 'chuot asus', 'chuột asus', 'chuot logitech', 'chuột logitech',
  'chuot khong day', 'chuột không dây', 'chuot co day', 'chuột có dây',
  'ban phim co', 'bàn phím cơ', 'ban phim co day', 'bàn phím có dây', 'ban phim gaming', 'bàn phím gaming',
  'ban phim khong day', 'bàn phím không dây', 'lot chuot', 'lót chuột',
  'tai nghe bluetooth', 'tai nghe gaming', 'tai nghe chup tai', 'tai nghe nhét tai', 'tai nghe nhet tai',
  'headphone', 'earphone', 'cu sac', 'củ sạc', 'cap sac', 'cáp sạc', 'sac du phong', 'sạc dự phòng',
  'op lung', 'ốp lưng', 'kinh cuong luc', 'kính cường lực', 'dan man hinh', 'dán màn hình',
  'gia do laptop', 'giá đỡ laptop', 'gia do dien thoai', 'giá đỡ điện thoại', 'de tan nhiet', 'đế tản nhiệt',

  // 2. Thiết bị phần cứng & đồ điện tử
  'laptop gaming', 'laptop van phong', 'laptop văn phòng', 'macbook', 'ipad pro', 'ipad air',
  'iphone 15', 'iphone 16', 'samsung galaxy', 'dien thoai thong minh', 'điện thoại thông minh',
  'card man hinh', 'card màn hình', 'card do hoa', 'card đồ họa', 'vga', 'ram ddr4', 'ram ddr5',
  'ssd nvme', 'o cung ssd', 'ổ cứng ssd', 'mainboard', 'cpu intel', 'cpu ryzen', 'nguon may tinh', 'nguồn máy tính',
  'case pc', 'man hinh may tinh', 'màn hình máy tính',

  // 3. Y tế, dịch vụ khám chữa bệnh, tiện ích đời sống ngoài lề
  'medpro', 'kham benh', 'khám bệnh', 'dat lich kham', 'đặt lịch khám', 'benh vien', 'bệnh viện',
  'bac si', 'bác sĩ', 'phong kham', 'phòng khám', 'vay tien', 'vay tiền', 'tin dung', 'tín dụng', 'bao hiem', 'bảo hiểm',

  // 4. Bài viết thương mại thuần túy & săn sale bán hàng
  'dap hop', 'đập hộp', 'tren tay danh gia', 'trên tay đánh giá', 'tra gop 0%', 'trả góp 0%',
  'gia bao nhieu tien', 'giá bao nhiêu tiền', 'san sale shopee', 'săn sale shopee', 'voucher lazada',
  'khuyen mai phu kien', 'khuyến mãi phụ kiện', 'xa hang ton kho', 'xả hàng tồn kho'
];

function isSpamOrAdArticle(title, content = '', url = '') {
  const combined = `${title || ''} ${url || ''} ${(content || '').slice(0, 1500)}`.toLowerCase();
  const normalized = normalizeVietnamese(combined);

  for (const keyword of BLACKLIST_NEWS_KEYWORDS) {
    const normKw = normalizeVietnamese(keyword);
    if (combined.includes(keyword.toLowerCase()) || normalized.includes(normKw)) {
      return {
        isSpam: true,
        reason: `Chứa từ khóa phụ kiện / quảng cáo: "${keyword}"`,
      };
    }
  }

  if (/^game mobile:\s*(túi|chuột|bàn phím|tai nghe|laptop|medpro|củ sạc|ba lô)/i.test(title || '')) {
    return {
      isSpam: true,
      reason: 'Tiêu đề không thuộc danh mục game',
    };
  }

  return { isSpam: false };
}

function findMatchingGame(text) {
  if (!text || !gamesCatalog || gamesCatalog.length === 0) return null;
  const norm = normalizeVietnamese(text);
  
  const matches = gamesCatalog.map((g) => {
    const normName = normalizeVietnamese(g.name || '');
    const normSlug = normalizeVietnamese(g.slug || '').replace(/-/g, ' ');
    let score = 0;
    if (normName.length >= 3 && norm.includes(normName)) {
      score = normName.length * 15;
    } else if (normSlug.length >= 4 && norm.includes(normSlug)) {
      score = normSlug.length * 10;
    }
    return { game: g, score };
  }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);

  return matches.length > 0 ? matches[0].game : null;
}

function cleanHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#243;/g, 'ó')
    .replace(/&#224;/g, 'à')
    .replace(/&#227;/g, 'ã')
    .replace(/&#225;/g, 'á')
    .replace(/&#233;/g, 'é')
    .replace(/&#232;/g, 'è')
    .replace(/&#234;/g, 'ê')
    .replace(/&#237;/g, 'í')
    .replace(/&#242;/g, 'ò')
    .replace(/&#244;/g, 'ô')
    .replace(/&#245;/g, 'õ')
    .replace(/&#250;/g, 'ú')
    .replace(/&#249;/g, 'ù')
    .replace(/&#253;/g, 'ý')
    .replace(/&#273;/g, 'đ')
    .replace(/&#272;/g, 'Đ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©');
}

function extractGameNameFromTitle(rawTitle) {
  if (!rawTitle) return '';
  let clean = cleanHtmlEntities(rawTitle)
    .replace(/^Game Mobile:\s*/i, '')
    .replace(/^(?:Tổng hợp\s+)?(?:toàn bộ\s+)?code\s+(?:game\s+)?/i, '')
    .replace(/^(?:Trọn bộ\s+)?(?:mã\s+)?giftcode\s+(?:game\s+)?/i, '')
    .replace(/\s*-\s*Download\.com\.vn.*$/i, '')
    .replace(/\s*-\s*Sforum.*$/i, '')
    .replace(/\s*-\s*GameK.*$/i, '')
    .replace(/\s*-\s*Báo Thanh Niên.*$/i, '')
    .replace(/\s*-\s*Thanh Niên.*$/i, '')
    .replace(/\s*-\s*FPT Shop.*$/i, '')
    .replace(/\s*-\s*VnExpress.*$/i, '')
    .replace(/\s*-\s*Lag\.vn.*$/i, '')
    .replace(/\s*-\s*Hoàng Hà Mobile.*$/i, '')
    .replace(/\s*-\s*Kenh14.*$/i, '')
    .replace(/\s*mới nhất.*$/i, '')
    .replace(/\s*còn hạn.*$/i, '')
    .replace(/\s*và cách (?:nhập|đổi|kích hoạt).*$/i, '')
    .replace(/\s*\(\d{4}\).*$/i, '')
    .trim();
  clean = clean.replace(/^[:\-–\s]+|[:\-–\s]+$/g, '').trim();
  return clean;
}

async function downloadImageToNewsCover(imageUrl, slug) {
  if (!imageUrl || !slug || !sharp) return null;
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
        'Referer': imageUrl.includes('download.com.vn') ? 'https://download.com.vn/' : 'https://google.com/'
      }
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return null;

    const outPath = path.join(NEWS_COVERS_DIR, `${slug}.webp`);
    await sharp(buf).webp({ quality: 85 }).toFile(outPath);
    return `/news_covers/${slug}.webp`;
  } catch (e) {
    return null;
  }
}

function scanGiftcodesFromText(text) {
  const codes = new Set();
  const clean = (text || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/[»«►◄▲▼■◆●★☆❖✓✔✕✖]/g, ' ');

  const matches = clean.matchAll(/(?:code|giftcode|mã quà tặng|mã code)\s*[:=\-–]\s*([a-zA-Z0-9_\-]+)/gi);
  for (const m of matches) {
    const c = m[1].trim().toUpperCase();
    if (c.length >= 4 && c.length <= 25 && !/^(HTTPS?|WWW|COM|VN|HTML|PHP|JPG|PNG)$/i.test(c)) {
      codes.add(c);
    }
  }

  const words = clean.match(/\b[A-Z0-9_]{5,20}\b/g) || [];
  for (const w of words) {
    const upper = w.toUpperCase();
    if (/[0-9]/.test(upper) && /[A-Z]/.test(upper) && !/^(HTTP|HTML|UTF8|JSON|VND|VNĐ)$/.test(upper)) {
      codes.add(upper);
    }
  }

  return Array.from(codes).slice(0, 15);
}

async function fetchHtmlWithTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    return null;
  }
}

async function extractArticleFromUrl(url) {
  const html = await fetchHtmlWithTimeout(url);
  if (!html) return null;

  // 1. Extract Title
  let title = '';
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                       html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    title = ogTitleMatch[1];
  } else {
    const titleTagMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleTagMatch && titleTagMatch[1]) title = titleTagMatch[1];
  }
  title = cleanHtmlEntities(title).trim();

  // 2. Extract Excerpt
  let excerpt = '';
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                      html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  if (ogDescMatch && ogDescMatch[1]) excerpt = cleanHtmlEntities(ogDescMatch[1]).trim();

  // 3. Extract Cover image
  let cover_url = '';
  const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
  if (ogImgMatch && ogImgMatch[1]) {
    cover_url = ogImgMatch[1].trim();
    if (cover_url.startsWith('//')) cover_url = 'https:' + cover_url;
  }

  // 4. Extract Text & Codes
  let cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

  const imageMatches = [...cleanHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
  const images = [];
  for (const m of imageMatches) {
    let src = m[1].trim();
    if (src.startsWith('//')) src = 'https:' + src;
    if (src.startsWith('http') && !src.includes('logo') && !src.includes('avatar') && !src.includes('icon')) {
      if (!images.includes(src)) images.push(src);
    }
  }

  cleanHtml = cleanHtml
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const content = cleanHtmlEntities(cleanHtml)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 20)
    .join('\n\n');

  const codes = scanGiftcodesFromText(content);

  return { title, excerpt, cover_url, content: content.slice(0, 10000), codes, images: images.slice(0, 6) };
}

function extractArticleLinksFromListing(html, sourceUrl, keywords) {
  const links = new Set();
  // Hỗ trợ cả HTML minified không có dấu nháy và có dấu nháy
  const hrefMatches = [...html.matchAll(/href=(?:["']([^"']+)["']|([^"'\s>]+))/gi)];
  let baseUrl = '';
  try {
    const parsed = new URL(sourceUrl);
    baseUrl = parsed.origin;
  } catch {}

  for (const m of hrefMatches) {
    let href = (m[1] || m[2] || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
    if (href.startsWith('//')) href = 'https:' + href;
    else if (href.startsWith('/')) href = baseUrl + href;
    if (!href.startsWith('http')) continue;

    // Bỏ qua tài nguyên tĩnh và media
    if (/\.(css|js|png|jpg|jpeg|webp|svg|ico|gif|woff|woff2|ttf|map)(\?.*)?$/i.test(href)) continue;

    const lower = href.toLowerCase();
    
    // Bỏ qua ngay lập tức các link chứa từ khóa phụ kiện / quảng cáo trong blacklist
    const isSpamLink = BLACKLIST_NEWS_KEYWORDS.some(k => {
      const slugKw = normalizeVietnamese(k).replace(/\s+/g, '-');
      return lower.includes(slugKw);
    });
    if (isSpamLink) continue;

    const hasKeyword = keywords.some(k => lower.includes(normalizeVietnamese(k).replace(/\s+/g, '-')) || lower.includes(k.toLowerCase()));
    const isArticlePattern = /(code|giftcode|tin-tuc|bai-viet|huong-dan|giai-tri|\.html|\.htm|\.chn|\/wiki|[0-9]{5,})/i.test(lower);

    if (hasKeyword && isArticlePattern && !lower.includes('tag') && !lower.includes('category') && !lower.includes('page/') && !lower.includes('chu-de/') && !lower.includes('chuyen-muc/')) {
      links.add(href);
    }
  }

  return Array.from(links).slice(0, 8);
}

async function generateAutonomousArticle(scraped, sourceUrl) {
  let matchedGame = findMatchingGame(`${sourceUrl} ${scraped.title} ${scraped.content?.slice(0, 500)}`);
  let extractedName = extractGameNameFromTitle(scraped.title);

  // Nếu chưa khớp được game từ text thô, thử tìm lại bằng tên bóc tách
  if (!matchedGame && extractedName) {
    matchedGame = findMatchingGame(extractedName);
  }

  // Nếu vẫn chưa có trong danh mục: Tra cứu Google Play Store VN
  let gameSlug = matchedGame?.slug;
  if (!matchedGame && extractedName && gameLogoResolver) {
    try {
      const gPlay = await gameLogoResolver.searchGooglePlayForLogo(extractedName);
      if (gPlay && gPlay.iconUrl) {
        const genSlug = normalizeVietnamese(extractedName).replace(/\s+/g, '-');
        const iconSaved = await gameLogoResolver.downloadAndSaveGameIcon(genSlug, gPlay.iconUrl);
        if (iconSaved && fs.existsSync(path.join(GAME_ICONS_DIR, `${genSlug}.webp`))) {
          matchedGame = {
            name: gPlay.title || extractedName,
            slug: genSlug,
            icon_url: `/game_icons/${genSlug}.webp`,
          };
          gameSlug = genSlug;
          console.log(`    🔍 [Google Play Auto-Resolved]: Đã tìm thấy Logo chính thức cho "${extractedName}" -> ${genSlug}.webp`);
        }
      }
    } catch (e) {
      console.warn(`    ⚠️ [Google Play Lookup Error]:`, e?.message);
    }
  }

  // NGUYÊN TẮC BẮT BUỘC: Nếu không khớp game nào và không bóc tách được tên VÀ không có mã giftcode thật -> TỪ CHỐI TẠO BÀI
  if (!matchedGame && !extractedName && (!scraped.codes || scraped.codes.length === 0)) {
    return null;
  }

  const gameName = matchedGame?.name || extractedName || 'Game Mobile';
  if (!gameSlug && gameName && gameName !== 'Game Mobile') {
    gameSlug = normalizeVietnamese(gameName).replace(/\s+/g, '-');
  }

  const currentYear = new Date().getFullYear();

  let cleanTitle = cleanHtmlEntities(scraped.title)
    .replace(/^Game Mobile:\s*/i, '')
    .replace(/\s*-\s*Download\.com\.vn/i, '')
    .trim();

  let title = cleanTitle;
  if (!title || title.length < 12) {
    title = `Tổng Hợp Trọn Bộ Giftcode ${gameName} Mới Nhất (${currentYear})`;
  } else {
    let stripped = title.replace(/^[»>|\-\s]+/, '').replace(/\b(2023|2024|2025)\b/g, currentYear.toString()).trim();
    if (!stripped.toLowerCase().includes(gameName.toLowerCase())) {
      title = `${gameName}: ${stripped}`;
    } else {
      title = stripped;
    }
    if (!title.includes(currentYear.toString())) {
      title += ` (${currentYear})`;
    }
  }

  const slug = normalizeVietnamese(title).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + `-${Date.now().toString(36).slice(-4)}`;

  // TUYỆT ĐỐI KHÔNG BỊA MÃ GIFTCODE ẢO KHI BÀI VIẾT KHÔNG CÓ CODE
  const codes = scraped.codes && scraped.codes.length > 0 ? scraped.codes : [];

  // Xác định ảnh bìa an toàn tuyệt đối
  let cover_url = '';

  // Ưu tiên 1: Nếu bài viết thuộc chủ đề chuyên đề ngành/tổng hợp (nhân lực, board game, giftcode vip...), dùng ảnh bìa chuyên đề chuẩn 1200x675
  const combinedText = ((scraped.title || '') + ' ' + title + ' ' + (gameSlug || '')).toLowerCase();
  if (combinedText.includes('nhân lực') || combinedText.includes('5.000 nhân lực') || combinedText.includes('tuyển dụng')) {
    cover_url = '/news_covers/nhan-luc-nganh-game-viet.webp';
  } else if (combinedText.includes('board game') || combinedText.includes('văn hóa việt')) {
    cover_url = '/news_covers/board-game-van-hoa-viet.webp';
  } else if (combinedText.includes('quà tặng') || combinedText.includes('giftcode vip') || combinedText.includes('tổng hợp trọn bộ')) {
    cover_url = '/news_covers/qua-tang-giftcode-vip.webp';
  } else if (combinedText.includes('thị trường') || combinedText.includes('doanh thu') || combinedText.includes('chính sách')) {
    cover_url = '/news_covers/thi-truong-game-viet-nam.webp';
  } else if (combinedText.includes('xbox') || combinedText.includes('console')) {
    cover_url = '/news_covers/xbox-games-collection.webp';
  } else if (combinedText.includes('apple') || combinedText.includes('arcade') || combinedText.includes('ios')) {
    cover_url = '/news_covers/apple-arcade-games.webp';
  } else if (combinedText.includes('esports') || combinedText.includes('cktg') || combinedText.includes('liquipedia')) {
    cover_url = '/news_covers/cktg-2026-esports.webp';
  } else if (combinedText.includes('game offline') || combinedText.includes('không mạng')) {
    cover_url = '/news_covers/game-offline-hay.webp';
  }

  // Ưu tiên 2: Nếu là tựa game có icon hợp lệ trong kho
  if (!cover_url) {
    if (gameSlug && fs.existsSync(path.join(GAME_ICONS_DIR, `${gameSlug}.webp`))) {
      cover_url = `/game_icons/${gameSlug}.webp`;
    } else if (matchedGame?.icon_url && !matchedGame.icon_url.includes('og-image')) {
      const iconPath = matchedGame.icon_url.startsWith('/') ? path.join(ROOT_DIR, 'public', matchedGame.icon_url) : '';
      if (iconPath && fs.existsSync(iconPath)) {
        cover_url = matchedGame.icon_url;
      }
    } else if (scraped.cover_url && scraped.cover_url.trim() && !scraped.cover_url.includes('logo') && !scraped.cover_url.includes('favicon')) {
      // Tải ảnh bìa bài viết về lưu trữ nội bộ để chống 100% chặn hotlinking
      const localCoverSlug = gameSlug || slug;
      const localCover = await downloadImageToNewsCover(scraped.cover_url, localCoverSlug);
      cover_url = localCover || '';
    }
  }

  if (!cover_url && scraped.images && scraped.images.length > 0) {
    const validImg = scraped.images.find(img => !img.includes('logo') && !img.includes('avatar') && !img.includes('favicon'));
    if (validImg) {
      const localCover = await downloadImageToNewsCover(validImg, slug);
      cover_url = localCover || '';
    }
  }

  // Nếu vẫn chưa có ảnh bìa: Mặc định chọn ảnh phong cảnh gaming phù hợp
  if (!cover_url) {
    cover_url = '/news_covers/thi-truong-game-viet-nam.webp';
  }

  const paragraphs = (scraped.content || '')
    .split('\n\n')
    .filter(p => p.length > 30 && !p.startsWith('#'))
    .slice(0, 4);

  const introBody = paragraphs.length > 0
    ? paragraphs.join('\n\n')
    : `Bản tin cập nhật mã quà tặng mới nhất dành cho tựa game **${gameName}**. Nhanh tay sao chép các mã code còn hạn sử dụng bên dưới để nhận các phần quà hỗ trợ tăng lực chiến hấp dẫn từ nhà phát hành.`;

  const codeSection = codes.length > 0
    ? codes.map(c => `- **${c}**: Gói tài nguyên quà tặng độc quyền`).join('\n')
    : `- Mã quà tặng chi tiết được hiển thị ở bảng thống kê bên dưới.`;

  const content = `## 1. Tổng Quan Sự Kiện & Quà Tặng ${gameName}

${introBody}

## 2. Bảng Danh Sách Giftcode ${gameName} Mới Nhất (${currentYear})

Dưới đây là các mã quà tặng đã được kiểm duyệt tính hợp lệ. Độc giả có thể bấm sao chép trực tiếp từng mã hiển thị trên website:

${codeSection}

> 💡 **Lưu ý quan trọng:** Mỗi mã quà tặng đều có thời hạn sử dụng và số lượng kích hoạt nhất định. Bạn nên nhập code ngay khi nhận được!

## 3. Hướng Dẫn Từng Bước Cách Nhập Giftcode Trong ${gameName}

1. Đăng nhập vào trò chơi **${gameName}** trên thiết bị của bạn.
2. Bấm vào biểu tượng **Avatar nhân vật** hoặc mục **Cài Đặt / Phúc Lợi**.
3. Chọn tính năng **Đổi Mã Quà Tặng (Giftcode)**.
4. Dán mã code ở trên và nhấn **Xác Nhận**. Quà tặng sẽ được gửi trực tiếp vào Hòm Thư nhân vật.

## 4. Mẹo Nhận Thêm Code Mới & Cẩm Nang Game Thủ

- Theo dõi Fanpage và Group cộng đồng chính thức của ${gameName} để tham gia các sự kiện săn code độc quyền.
${gameSlug ? `- Xem toàn bộ thông tin, mẹo chơi và hướng dẫn nạp game tại chuyên trang [${gameName}](https://codegame.shop/game/${gameSlug}) trên **CodeGame.shop**.` : ''}
- Thường xuyên ghé thăm **CodeGame.shop** để cập nhật nhanh nhất các mã giftcode máy chủ mới.

---

> 🛡️ **Nguồn tin tức:** Bản tin được tổng hợp, biên tập và xuất bản độc quyền bởi **CodeGame.Shop** (https://codegame.shop). Mọi thông tin giftcode đã được xác thực trước khi công bố.`;

  return {
    id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    slug,
    title,
    excerpt: scraped.excerpt || `Cập nhật toàn bộ mã giftcode ${gameName} mới nhất còn hạn sử dụng. Hướng dẫn chi tiết cách kích hoạt mã quà tặng nhận trang bị VIP.`,
    content,
    cover_url,
    gallery_urls: scraped.images || [],
    virtual_views: Math.floor(Math.random() * 200) + 180,
    views_growth_rate: 1.0,
    game_id: matchedGame?.id,
    game_slug: gameSlug,
    game_name: gameName,
    tags: ['Giftcode Mới', gameName, 'GameMobile', 'CapNhatCode'],
    codes,
    author: 'CodeGame.Shop',
    views: 0,
    read_time_minutes: 3,
    is_featured: false,
    is_hot: true,
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_name: 'CodeGame.Shop',
    source_url: 'https://codegame.shop',
  };
}

async function sendTelegramAlert(botToken, chatId, message) {
  if (!botToken || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Telegram Error]:', err?.message);
    return false;
  }
}

async function runAutoNewsPublisher() {
  console.log('========================================================');
  console.log('🚀 BẮT ĐẦU CHẠY AUTO NEWS PUBLISHER ENGINE 24/7');
  console.log('⏰ Thời gian:', new Date().toLocaleString('vi-VN'));
  console.log('🔗 Server Sync URL:', SYNC_URL);
  console.log('========================================================');

  // 1. Fetch current state from Cloudflare D1 (ưu tiên SSOT chuyên biệt /api/news)
  let existingArticles = [];
  let deletedSet = new Set();
  let syncState = null;

  try {
    const newsRes = await fetch(`https://codegame.shop/api/news?status=ALL&limit=all&_t=${Date.now()}`, {
      headers: {
        'X-Sync-Key': ADMIN_SYNC_SECRET,
      },
    });
    if (newsRes.ok) {
      const newsJson = await newsRes.json();
      if (Array.isArray(newsJson.articles) && newsJson.articles.length > 0) {
        existingArticles = newsJson.articles;
      }
    }
  } catch (e) {
    console.warn('[AutoNews] Cannot fetch from /api/news, trying /api/sync fallback:', e?.message);
  }

  try {
    const res = await fetch(`${SYNC_URL}?fresh=1&_t=${Date.now()}`, {
      headers: {
        'X-Sync-Key': ADMIN_SYNC_SECRET,
      },
    });
    if (res.ok) {
      syncState = await res.json();
      if (existingArticles.length === 0 && Array.isArray(syncState?.newsArticles)) {
        existingArticles = syncState.newsArticles;
      }
      if (Array.isArray(syncState?.deletedNewsArticles)) {
        deletedSet = new Set(syncState.deletedNewsArticles);
      }
    }
  } catch (e) {
    console.warn('[AutoNews] Cannot fetch state from sync endpoint:', e?.message);
  }

  const DEFAULT_SOURCES = [
    {
      id: 'src_gamek_mobile',
      name: 'GameK - Giftcode & Game Mobile',
      url: 'https://gamek.vn/mobile-social.chn',
      filterKeywords: ['code', 'giftcode', 'quà tặng', 'tân thủ', 'máy chủ', 'update'],
      status: 'ACTIVE',
    },
    {
      id: 'src_sforum_games',
      name: 'Sforum CellphoneS - Game App & Giftcode',
      url: 'https://cellphones.com.vn/sforum/game-app',
      filterKeywords: ['code', 'giftcode', 'nhập code', 'blox fruit', 'wiki', 'tân thủ'],
      status: 'ACTIVE',
    },
    {
      id: 'src_thanhnien_game',
      name: 'Báo Thanh Niên - Tin Tức Game & eSports',
      url: 'https://thanhnien.vn/game.html',
      filterKeywords: ['game', 'esports', 'mobile', 'code', 'ra mắt', 'cập nhật'],
      status: 'ACTIVE',
    },
    {
      id: 'src_fptshop_gameapp',
      name: 'FPT Shop - Game App & Giftcode',
      url: 'https://fptshop.com.vn/tin-tuc/game-app',
      filterKeywords: ['code', 'giftcode', 'game', 'tân thủ', 'nhập code', 'lmht', 'mobile'],
      status: 'ACTIVE',
    },
    {
      id: 'src_lag_game',
      name: 'Lag.vn - Tin Game & Giftcode Hot',
      url: 'https://lag.vn/tin-tuc-game',
      filterKeywords: ['code', 'giftcode', 'game', 'esports', 'tân thủ', 'mobile'],
      status: 'ACTIVE',
    },
    {
      id: 'src_vnexpress_game',
      name: 'VnExpress - Chuyên Mục Trò Chơi & Game',
      url: 'https://vnexpress.net/so-hoa/game',
      filterKeywords: ['game', 'trò chơi', 'esports', 'mobile', 'ra mắt'],
      status: 'ACTIVE',
    },
    {
      id: 'src_download_giftcode',
      name: 'Download.vn - Chuyên Mục Giftcode Game',
      url: 'https://download.com.vn/s/giftcode',
      filterKeywords: ['code', 'giftcode', 'huyền thoại', 'tân thủ', 'quà tặng'],
      status: 'ACTIVE',
    },
    {
      id: 'src_tgdd_gameapp',
      name: 'Thế Giới Di Động - Game App & Code',
      url: 'https://www.thegioididong.com/game-app',
      filterKeywords: ['code', 'giftcode', 'nhận quà', 'sự kiện', 'tân thủ'],
      status: 'ACTIVE',
    },
    {
      id: 'src_hoanghamobile_game',
      name: 'Hoàng Hà Mobile - Game App & Code Tân Thủ',
      url: 'https://hoanghamobile.com/tin-tuc/chuyen-muc/game-app',
      filterKeywords: ['code', 'giftcode', 'game', 'tân thủ', 'nhập code'],
      status: 'ACTIVE',
    },
    {
      id: 'src_kenh14_game',
      name: 'Kênh 14 - Game Mobile & eSports',
      url: 'https://kenh14.vn/game.chn',
      filterKeywords: ['game', 'giftcode', 'code', 'esports', 'tân thủ', 'mobile'],
      status: 'ACTIVE',
    },
  ];

  let rawSources = Array.isArray(syncState?.newsAutoSources) && syncState.newsAutoSources.length > 0
    ? syncState.newsAutoSources
    : [...DEFAULT_SOURCES];

  // Tự động bổ sung các nguồn mặc định mới nếu trong database D1 chưa có
  const existingSourceIds = new Set(rawSources.map(s => s.id));
  const existingSourceUrls = new Set(rawSources.map(s => (s.url || '').toLowerCase().trim()));
  const missingDefs = DEFAULT_SOURCES.filter(d => !existingSourceIds.has(d.id) && !existingSourceUrls.has(d.url.toLowerCase().trim()));
  const autoSources = missingDefs.length > 0 ? [...rawSources, ...missingDefs] : rawSources;

  const scheduleConfig = syncState?.newsScheduleConfig || {
    enabled: true,
    defaultPublishStatus: 'PUBLISHED',
    enableTelegramAlerts: true,
  };

  if (scheduleConfig.enabled === false) {
    console.log('⏸️ Hệ thống tự động hóa đang TẠM DỪNG (scheduleConfig.enabled = false). Thoát script an toàn.');
    return;
  }

  const existingUrls = new Set();
  existingArticles.forEach(a => {
    if (a.source_url) existingUrls.add(a.source_url.toLowerCase().trim());
  });

  const activeSources = autoSources.filter(s => s.status === 'ACTIVE');
  console.log(`📡 Tìm thấy ${activeSources.length} nguồn tin tức đang BẬT.`);

  const newArticlesCreated = [];
  const sourceUpdates = [...autoSources];

  for (let sIdx = 0; sIdx < activeSources.length; sIdx++) {
    const source = activeSources[sIdx];
    console.log(`\n🔍 Đang quét nguồn [${sIdx + 1}/${activeSources.length}]: ${source.name} (${source.url})`);

    const listingHtml = await fetchHtmlWithTimeout(source.url);
    if (!listingHtml) {
      console.warn(`❌ Không thể tải trang danh sách nguồn: ${source.url}`);
      continue;
    }

    const articleLinks = extractArticleLinksFromListing(listingHtml, source.url, source.filterKeywords || ['code', 'giftcode']);
    console.log(`  ➔ Tìm thấy ${articleLinks.length} liên kết bài viết phù hợp từ khóa.`);

    let createdForSource = 0;
    for (const link of articleLinks) {
      if (existingUrls.has(link.toLowerCase().trim())) {
        continue;
      }

      console.log(`  ⚡ Đang bóc tách bài viết mới: ${link}`);
      const scraped = await extractArticleFromUrl(link);
      if (!scraped || (!scraped.title && !scraped.content)) {
        console.warn(`    ⚠️ Bóc tách thất bại: ${link}`);
        continue;
      }

      // 1. Kiểm tra bộ lọc bài rác / phụ kiện / quảng cáo
      const spamCheck = isSpamOrAdArticle(scraped.title, scraped.content, link);
      if (spamCheck.isSpam) {
        console.warn(`    🚫 [BLACKLIST BLOCKED]: Bài viết quảng cáo/phụ kiện không liên quan: "${scraped.title}" (${spamCheck.reason})`);
        continue;
      }

      // 2. Tạo bài viết chuẩn SEO và đối chiếu danh mục
      const newArticle = await generateAutonomousArticle(scraped, link);
      if (!newArticle) {
        console.warn(`    ⚠️ [CATALOG SKIP]: Bỏ qua bài viết không khớp game trong danh mục và không có giftcode thực: "${scraped.title}"`);
        continue;
      }

      newArticle.status = scheduleConfig.defaultPublishStatus || 'PUBLISHED';

      existingUrls.add(link.toLowerCase().trim());
      newArticlesCreated.push(newArticle);
      createdForSource++;
      console.log(`    ✅ ĐÃ TẠO BÀI THÀNH CÔNG: "${newArticle.title}" (Tựa game: ${newArticle.game_name} | ${newArticle.codes.length} mã code)`);

      // Polite delay between requests
      await new Promise(r => setTimeout(r, 600));

      // Limit to 2 new articles per source per run to avoid flooding
      if (createdForSource >= 2) break;
    }

    // Update source stats
    const foundSrc = sourceUpdates.find(s => s.id === source.id);
    if (foundSrc) {
      foundSrc.lastCrawledAt = new Date().toISOString();
      foundSrc.articlesFoundCount = (foundSrc.articlesFoundCount || 0) + createdForSource;
    }
  }

  console.log('\n========================================================');
  console.log(`📊 TỔNG KẾT: Đã tạo thành công ${newArticlesCreated.length} bài viết mới!`);

  if (newArticlesCreated.length > 0) {
    const updatedArticles = [...newArticlesCreated, ...existingArticles].filter(a => !deletedSet.has(a.id) && !deletedSet.has(a.slug));
    
    // Push update to Cloudflare D1
    console.log('💾 Đang lưu và đồng bộ toàn bộ bài viết lên Cloudflare D1...');
    try {
      const postRes = await fetch(SYNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': ADMIN_SYNC_SECRET,
        },
        body: JSON.stringify({
          newsArticles: updatedArticles,
          newsAutoSources: sourceUpdates,
          newsScheduleConfig: {
            ...scheduleConfig,
            lastRunAt: new Date().toISOString(),
            totalArticlesCreated: (scheduleConfig.totalArticlesCreated || 0) + newArticlesCreated.length,
          },
        }),
      });

      if (postRes.ok) {
        console.log('✨ ĐỒNG BỘ CLOUDFLARE D1 THÀNH CÔNG 100%!');
      } else {
        console.error('❌ Lỗi lưu vào D1:', await postRes.text());
      }
    } catch (postErr) {
      console.error('❌ Lỗi kết nối máy chủ Cloudflare sync:', postErr?.message);
    }

    // Send Telegram alert
    const tgToken = process.env.TELEGRAM_BOT_TOKEN || scheduleConfig.telegramBotToken;
    const tgChat = process.env.TELEGRAM_CHAT_ID || scheduleConfig.telegramChatId;

    if (scheduleConfig.enableTelegramAlerts && tgToken && tgChat) {
      console.log('🔔 Đang gửi thông báo Telegram Bot...');
      for (const art of newArticlesCreated) {
        const msg = `📰 <b>[BÀI VIẾT TỰ ĐỘNG MỚI ĐÃ XUẤT BẢN]</b>\n\n` +
          `🎮 <b>Tựa Game:</b> ${art.game_name}\n` +
          `📝 <b>Tiêu đề:</b> ${art.title}\n` +
          `🎁 <b>Mã Giftcode:</b> ${art.codes.length} mã (${art.codes.slice(0, 4).join(', ')})\n` +
          `🔗 <b>Xem bài:</b> https://codegame.shop/news/${art.slug}\n` +
          `⏱️ <b>Nguồn:</b> ${art.source_url}\n` +
          `🚀 <b>Trạng thái:</b> ${art.status === 'PUBLISHED' ? 'Đã công khai trên Web' : 'Lưu bản nháp'}`;
        await sendTelegramAlert(tgToken, tgChat, msg);
      }
    }
  } else {
    console.log('ℹ️ Chưa có bài viết mới nào cần đăng. Tất cả bài từ nguồn đã được cào trước đó.');
  }

  console.log('========================================================\n');
}

runAutoNewsPublisher().catch(err => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});
