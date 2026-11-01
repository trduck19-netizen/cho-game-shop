import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://codegame.shop';

const GAME_CANONICAL_ALIASES = {
  'dau-truong-chan-ly-mobile': 'dau-truong-chan-ly',
  'ta-la-hac-ngo-khong-vplay': 'ta-la-hac-ngo-khong',
  'tam-quoc-huyen-tuong': 'tam-quoc-huyen-tuong-vng',
  'x-wukong-dai-chien-tam-gioi': 'x-wukong',
  'huyen-thoai-hai-tac': 'pirate-legends',
  'seven-deadly-sins-grand-cross': 'the-seven-deadly-sins-grand-cross',
  'where-winds-meet-mobile': 'yen-van-thap-luc-thanh',
  'loan-the-3q': 'loan-the-3q-than-ma-lenh-oeg',
};

function escapeHtml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isCodeExpired(c) {
  if (!c) return false;
  const status = String(c.status || '').toLowerCase();
  if (status === 'expired' || status === 'rejected') return true;

  const exp = c.expiresAt || c.expires_at || c.expiry || '';
  if (!exp) return false;
  if (exp === '2026-12-31' || exp === '2026-12-31T23:59:59Z' || exp === '31/12/2026') return false;

  const isoMatch = String(exp).trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const hours = isoMatch[4] !== undefined ? parseInt(isoMatch[4], 10) : 23;
    const minutes = isoMatch[5] !== undefined ? parseInt(isoMatch[5], 10) : 59;
    const seconds = isoMatch[6] !== undefined ? parseInt(isoMatch[6], 10) : 59;
    const d = new Date(year, month - 1, day, hours, minutes, seconds, 999);
    return d.getTime() < Date.now();
  }

  const d = new Date(exp);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

const TOPIC_CLUSTERS = [
  {
    slug: 'kiem-hiep-tien-hiep',
    name: 'Kiếm Hiệp & Tiên Hiệp',
    badge: '⚔️ Kiếm Hiệp & Tiên Hiệp',
    description: 'Tổng hợp giftcode các tựa game Kiếm Hiệp, Tiên Hiệp, Tu Chân, Võ Lâm mobile mới nhất 2026. Nhận KNB, Vàng khóa, Thú Cưỡi và Pháp Bảo miễn phí.',
    match: (c) => /kiếm hiệp|tiên hiệp|võ hiệp|tu tiên/i.test(c),
  },
  {
    slug: 'nhap-vai-gacha-anime',
    name: 'Nhập Vai Gacha & Anime',
    badge: '✨ Nhập Vai Gacha & Anime',
    description: 'Kho giftcode game nhập vai phong cách Anime, Gacha Waifu, Turn-based và Thế giới mở hot nhất 2026. Nhận Vé Quay, Đá Quý, Kim Cương tân thủ.',
    match: (c) => /anime|gacha|waifu/i.test(c),
  },
  {
    slug: 'ban-sung-sinh-ton',
    name: 'Bắn Súng & Sinh Tồn',
    badge: '🎯 Bắn Súng & Sinh Tồn',
    description: 'Danh sách code game Bắn Súng Sinh Tồn, FPS, Battle Royale, Tactical Shooter mới nhất 2026. Nhận Skin Súng, Trang Phục, Thẻ Vô Cực và Hòm Quà VIP.',
    match: (c) => /bắn súng|sinh tồn|battle royale/i.test(c),
  },
  {
    slug: 'tam-quoc-chien-thuat',
    name: 'Tam Quốc & Chiến Thuật',
    badge: '🏰 Tam Quốc & Chiến Thuật',
    description: 'Cập nhật giftcode game Tam Quốc, Chiến Thuật SLG, Thủ Thành và Thẻ Tướng mới nhất 2026. Nhận Tướng Đỏ, Lệnh Chiêu Mộ, Lương Thảo và Vàng miễn phí.',
    match: (c) => /tam quốc|chiến thuật|chiến lược|slg|đế chế|thẻ tướng/i.test(c),
  },
  {
    slug: 'roblox-mini-game',
    name: 'Roblox & Mini Game',
    badge: '🎮 Roblox & Mini Game',
    description: 'Tổng hợp mã code Roblox các chế độ hot nhất: Blox Fruits, King Legacy, Anime Defenders, Fruit Battlegrounds... Nhận Beli, Gems, Reset Stats mới nhất 2026.',
    match: (c) => /roblox|mini game/i.test(c),
  },
  {
    slug: 'nhap-vai-mmorpg',
    name: 'Nhập Vai & MMORPG',
    badge: '🛡️ Nhập Vai & MMORPG',
    description: 'Trọn bộ giftcode game MMORPG, Hành Động RPG và Thế Giới Mở cày cuốc hay nhất 2026. Hướng dẫn nhập code nhận Trang Bị Cam, Thể Lực và Danh Hiệu độc quyền.',
    match: (c) => /mmorpg|nhập vai|arpg/i.test(c),
  },
];

function getClusterSlug(category = '') {
  const c = String(category || '').toLowerCase();
  for (const cluster of TOPIC_CLUSTERS) {
    if (cluster.match(c)) return cluster.slug;
  }
  return 'nhap-vai-mmorpg';
}

function parseHowToSteps(instructions, gameName) {
  const text = (instructions || '').trim();
  if (text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 5);
    const stepLines = lines.filter((l) => /^(bước|\d+[\.\)]|b\d+:)/i.test(l));
    if (stepLines.length >= 2) {
      return stepLines.slice(0, 6).map((line, idx) => {
        const cleanText = line.replace(/^(bước\s*\d+[:\.]*|\d+[\.\)]|b\d+[:\.]*)\s*/i, '').trim();
        return {
          '@type': 'HowToStep',
          position: idx + 1,
          name: cleanText.slice(0, 60),
          text: line,
        };
      });
    }
  }
  return [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Mở game và đăng nhập',
      text: `Khởi động trò chơi ${gameName} trên thiết bị và đăng nhập vào tài khoản nhân vật của bạn.`,
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Tìm mục Đổi Quà / Phúc Lợi',
      text: `Nhấp vào biểu tượng Sự Kiện, Phúc Lợi hoặc Cài Đặt theo giao diện của ${gameName}.`,
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Nhập mã giftcode',
      text: `Sao chép mã giftcode từ CodeGame.shop và dán chính xác vào ô nhập mã quà tặng.`,
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Xác nhận và nhận quà',
      text: `Bấm Đổi Quà và kiểm tra hòm Thư trong game ${gameName} để nhận vật phẩm ngay tức thì.`,
    },
  ];
}

async function runPrerender() {
  const distDir = path.resolve(__dirname, '../dist');
  const templatePath = path.join(distDir, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.error('[Prerender] Không tìm thấy dist/index.html. Hãy chạy vite build trước!');
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  // Load games data and crawled codes
  const gamesPath = fs.existsSync(path.resolve(__dirname, '../public/data/games188.json'))
    ? path.resolve(__dirname, '../public/data/games188.json')
    : path.resolve(__dirname, '../src/data/games188.json');
  const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

  let crawledCodes = [];
  try {
    const codesPath = fs.existsSync(path.resolve(__dirname, '../public/data/crawled_codes_188.json'))
      ? path.resolve(__dirname, '../public/data/crawled_codes_188.json')
      : path.resolve(__dirname, '../src/data/crawled_codes_188.json');
    crawledCodes = JSON.parse(fs.readFileSync(codesPath, 'utf8'));
  } catch {}

  console.log(`[Prerender] Bắt đầu sinh HTML tĩnh cho ${games.length} tựa game và các trang chính...`);

  function buildPageHtml({
    title,
    description,
    canonicalPath,
    ogImage = 'https://codegame.shop/og-image.jpg',
    ogType = 'website',
    noindex = false,
    jsonLd = [],
    bodyContent = '',
  }) {
    const canonicalUrl = `${BASE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    const fullOgImage = ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`;
    const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

    const headInjections = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="alternate" hreflang="vi" href="${escapeHtml(canonicalUrl)}">
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}">
    ${noindex ? '<meta name="robots" content="noindex, nofollow, noarchive">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'}
    
    <!-- Open Graph Tags -->
    <meta property="og:site_name" content="CodeGame.shop">
    <meta property="og:type" content="${escapeHtml(ogType)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:image" content="${escapeHtml(fullOgImage)}">
    <meta property="og:image:secure_url" content="${escapeHtml(fullOgImage)}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta property="og:locale" content="vi_VN">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(fullOgImage)}">
    <meta name="twitter:image:alt" content="${escapeHtml(title)}">

    <!-- JSON-LD Structured Data -->
    ${schemas.map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
`;

    // Replace <title> and meta tags in template
    let html = templateHtml;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
    html = html.replace(/<meta\s+name="description"[\s\S]*?>/i, '');
    html = html.replace(/<link\s+rel="canonical"[\s\S]*?>/i, '');
    html = html.replace(/<meta\s+name="robots"[\s\S]*?>/i, '');
    html = html.replace(/<meta\s+property="og:[\s\S]*?>/gi, '');
    html = html.replace(/<meta\s+name="twitter:[\s\S]*?>/gi, '');

    html = html.replace('</head>', `${headInjections}\n</head>`);

    // Extract all scripts from templateHtml (Vite JS bundles, module scripts) to preserve hydration
    const scriptMatches = templateHtml.match(/<script[\s\S]*?<\/script>/gi) || [];
    const scriptTags = scriptMatches.join('\n  ');

    // Replace <div id="root"> content and preserve all scripts before </body>
    const rootStartIdx = html.indexOf('<div id="root">');
    const bodyEndIdx = html.indexOf('</body>');
    const bodyStartIdx = html.indexOf('<body');
    let preRootHtml = html.slice(0, rootStartIdx);
    if (bodyStartIdx !== -1) {
      const bodyTagEndIdx = html.indexOf('>', bodyStartIdx);
      if (bodyTagEndIdx !== -1 && rootStartIdx > bodyTagEndIdx) {
        // Strip #app-preloader from prerendered static HTML so the static content paints at 0ms
        preRootHtml = html.slice(0, bodyTagEndIdx + 1) + '\n    ';
      }
    }
    if (rootStartIdx !== -1 && bodyEndIdx !== -1) {
      html = preRootHtml + `<div id="root">${bodyContent}</div>\n  ${scriptTags}\n` + html.slice(bodyEndIdx);
    } else {
      html = html.replace(/<div id="root">[\s\S]*<\/div>/i, `<div id="root">${bodyContent}</div>\n  ${scriptTags}`);
    }

    return html;
  }

  // 1. Prerender Homepage (dist/index.html)
  const homeTopGames = games.slice(0, 60);
  const totalCodesFormatted = (crawledCodes.length || 11870).toLocaleString('vi-VN');
  const canonicalGamesList = games.filter(g => !GAME_CANONICAL_ALIASES[g.slug || g.id]);
  const canonicalGamesCount = canonicalGamesList.length; // 573
  const homeDescription = `Kho tổng hợp hơn ${totalCodesFormatted}+ giftcode game mobile và webgame mới nhất 2026 của ${canonicalGamesCount} tựa game chuẩn (trong đó gồm 347 game có giấy phép G1 ABEI chính thức và game quốc tế). Cập nhật liên tục 24/7 từ các NPH VNG, Garena, VTC, SohaGame, Funtap.`;

  const homeHtml = buildPageHtml({
    title: 'CodeGame.shop - Săn Giftcode Miễn Phí & Giao Dịch Mã Game Uy Tín',
    description: homeDescription,
    canonicalPath: '/',
    ogType: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'CodeGame.shop',
        url: 'https://codegame.shop/',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://codegame.shop/?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'CodeGame.shop',
        url: 'https://codegame.shop',
        logo: 'https://codegame.shop/logo.png',
        description: 'Cổng thông tin chia sẻ giftcode game bản quyền G1 và giao dịch mã tự động.',
        sameAs: [
          'https://t.me/webcodegame_vn',
          'https://zalo.me/g/qdtlmj2tebfa0baraedg',
          'https://zalo.me/0386767888',
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Giftcode trên CodeGame.shop có miễn phí không?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Tất cả mã giftcode trong mục Mã Miễn Phí và Đợt Phát Code đều hoàn toàn miễn phí 100%, được tổng hợp và kiểm duyệt từ các Nhà phát hành game chính thức tại Việt Nam.',
            },
          },
          {
            '@type': 'Question',
            name: 'Làm thế nào để sao chép mã code nhanh chóng?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Bạn chỉ cần nhấp vào nút Sao Chép bên cạnh mỗi mã giftcode hoặc chọn Sao Chép Toàn Bộ Mã Còn Hạn để lưu tất cả giftcode vào bộ nhớ tạm trong 1 giây.',
            },
          },
          {
            '@type': 'Question',
            name: 'Các tựa game trên CodeGame.shop có hợp pháp không?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Hệ thống cập nhật và đối soát thông tin pháp lý, Giấy phép phê duyệt nội dung kịch bản G1 từ Cục PTTH&TTĐT đối với từng tựa game phát hành tại Việt Nam.',
            },
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://codegame.shop/' },
          { '@type': 'ListItem', position: 2, name: 'Mã Miễn Phí', item: 'https://codegame.shop/' },
        ],
      },
    ],
    bodyContent: `
      <div class="min-h-screen flex flex-col bg-dark-950 text-gray-100">
        <!-- Announcement Bar -->
        <div class="bg-gradient-to-r from-brand-600 via-emerald-600 to-teal-600 py-2 px-4 text-center text-xs font-bold text-white shadow-sm">
          🔥 Chào mừng đến với CodeGame.shop • Tra cứu và nhận mã giftcode miễn phí mới nhất.
        </div>

        <!-- Navbar Header -->
        <header class="site-header sticky top-0 z-40 w-full border-b border-gray-800/80 bg-[#0B0D19]/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
          <a href="/" class="header-logo flex items-center gap-2 text-brand-400 font-extrabold text-base sm:text-lg">
            <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
            <span class="text-white font-bold">CodeGame.Shop</span>
          </a>
          <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-gray-300">
            <a href="/" class="text-brand-400 font-black">Mã Miễn Phí</a>
            <a href="/giveaways" class="hover:text-white transition-colors">Đợt Phát Code</a>
            <a href="/store" class="hover:text-white transition-colors">Chợ Code VIP</a>
          </nav>
        </header>

        <!-- Hero Section -->
        <section class="critical-hero-banner py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-center bg-[#0e1222] text-gray-100 border-b border-gray-800/80">
          <div class="max-w-4xl mx-auto space-y-3">
            <div class="inline-block px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              ✨ Cập nhật liên tục 24/7 từ các Nhà phát hành Game
            </div>
            <h1 class="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              Kho Giftcode Game Mobile & Webgame Bản Quyền G1 Mới Nhất 2026
            </h1>
            <p class="text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto font-normal">
              Tìm kiếm và nhận mã thưởng game mới nhất. Đối chiếu minh bạch Giấy phép G1 từ Cục PTTH&TTĐT.
            </p>
          </div>
        </section>

        <!-- Main Catalog Container -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="p-4 rounded-2xl bg-emerald-900/10 border border-emerald-500/20 text-xs text-emerald-300 mb-8">
            <strong>Thông Tin Pháp Lý & Giấy Phép:</strong> Tra cứu thông tin phát hành và Giấy phép phê duyệt nội dung kịch bản G1 đối chiếu từ Cục Phát thanh, Truyền hình và Thông tin điện tử (giayphep.abei.gov.vn).
          </div>

          <h2 class="text-lg sm:text-xl font-black text-white mb-5 flex items-center space-x-2">
            <span>Danh Sách Tựa Game Bản Quyền Có Giftcode Hoạt Động</span>
          </h2>

          <div class="critical-cards-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
            ${homeTopGames
              .map(
                (g) => `
              <a href="/game/${escapeHtml(g.slug)}" class="critical-card-item flex flex-col justify-between bg-[#11162B] hover:bg-[#161D36] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-800/80 hover:border-emerald-500/40 transition-all text-left group">
                <div>
                  <div class="flex items-start justify-between gap-1 mb-2">
                    <img src="${escapeHtml(g.icon_url || `/game_icons/${g.slug}.webp`)}" alt="${escapeHtml(g.name)}" width="48" height="48" loading="lazy" decoding="async" class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-gray-700/60 shrink-0">
                  </div>
                  <h3 class="font-bold text-xs sm:text-sm text-gray-100 group-hover:text-emerald-400 line-clamp-1">${escapeHtml(g.name)}</h3>
                  <span class="text-[11px] text-gray-400 truncate block mt-0.5">${escapeHtml(g.publisher || 'NPH Việt Nam')}</span>
                </div>
                <div class="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md self-start border border-emerald-500/30">
                  🎁 ${g.free_codes_count || 10}+ Giftcode
                </div>
              </a>`
              )
              .join('')}
          </div>

          <!-- FAQ Section -->
          <section class="mt-14 pt-8 border-t border-gray-800">
            <h2 class="text-lg sm:text-xl font-bold text-white mb-4">Câu Hỏi Thường Gặp Khi Nhận Giftcode (FAQ)</h2>
            <div class="grid md:grid-cols-3 gap-4 text-xs text-gray-300">
              <div class="p-4 rounded-xl bg-dark-900 border border-gray-800">
                <h3 class="font-bold text-gray-100 text-sm mb-2">1. Giftcode trên CodeGame.shop có miễn phí không?</h3>
                <p>Tất cả mã giftcode trong mục Mã Miễn Phí và Đợt Phát Code đều hoàn toàn miễn phí 100%, được tổng hợp và kiểm duyệt từ các Nhà phát hành game chính thức.</p>
              </div>
              <div class="p-4 rounded-xl bg-dark-900 border border-gray-800">
                <h3 class="font-bold text-gray-100 text-sm mb-2">2. Làm thế nào để sao chép mã code nhanh chóng?</h3>
                <p>Bạn chỉ cần nhấp vào nút Sao Chép bên cạnh mỗi mã giftcode hoặc chọn Sao Chép Toàn Bộ Mã Còn Hạn để lưu tất cả giftcode vào bộ nhớ tạm trong 1 giây.</p>
              </div>
              <div class="p-4 rounded-xl bg-dark-900 border border-gray-800">
                <h3 class="font-bold text-gray-100 text-sm mb-2">3. Các tựa game trên CodeGame.shop có hợp pháp không?</h3>
                <p>Hệ thống cập nhật thông tin pháp lý và giấy phép phê duyệt nội dung kịch bản trò chơi G1 được cấp bởi Cục PTTH&TTĐT cho từng game theo dữ liệu công khai.</p>
              </div>
            </div>
          </section>
        </main>

        <!-- Footer -->
        <footer class="mt-auto border-t border-gray-800/80 bg-dark-900/50 py-8 px-4 text-xs text-gray-400">
          <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 text-left">
            <div class="md:col-span-2 space-y-2">
              <div class="flex items-center gap-2">
                <img src="/logo.png" alt="CodeGame.shop" class="w-6 h-6 rounded-md" />
                <span class="font-bold text-white text-sm">CodeGame.Shop</span>
              </div>
              <p class="text-gray-400 text-xs leading-relaxed">
                Kho tổng hợp hơn ${totalCodesFormatted}+ giftcode game mobile và webgame mới nhất 2026 của ${canonicalGamesCount} tựa game chuẩn (trong đó gồm 347 game có giấy phép G1 ABEI chính thức và game quốc tế).
              </p>
            </div>
            <div>
              <h4 class="font-bold text-white text-xs mb-2">Chuyên Mục Hot</h4>
              <ul class="space-y-1 text-[11px]">
                <li><a href="/danh-sach-game-a-z" class="text-brand-400 hover:underline">📚 Danh Mục Game A-Z (573 Game)</a></li>
                <li><a href="/the-loai/kiem-hiep-tien-hiep" class="hover:text-white">⚔️ Kiếm Hiệp & Tiên Hiệp</a></li>
                <li><a href="/the-loai/nhap-vai-gacha-anime" class="hover:text-white">✨ Nhập Vai Gacha & Anime</a></li>
                <li><a href="/the-loai/ban-sung-sinh-ton" class="hover:text-white">🎯 Bắn Súng & Sinh Tồn</a></li>
                <li><a href="/the-loai/tam-quoc-chien-thuat" class="hover:text-white">🏰 Tam Quốc & Chiến Thuật</a></li>
                <li><a href="/the-loai/roblox-mini-game" class="hover:text-white">🎮 Roblox & Mini Game</a></li>
                <li><a href="/the-loai/nhap-vai-mmorpg" class="hover:text-white">🛡️ Nhập Vai (MMORPG)</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold text-white text-xs mb-2">Liên Kết Nhanh</h4>
              <ul class="space-y-1 text-[11px]">
                <li><a href="/" class="hover:text-white">Trang Chủ</a></li>
                <li><a href="/news" class="hover:text-white">Tin Tức Game</a></li>
                <li><a href="/giveaways" class="hover:text-white">Đợt Phát Code</a></li>
                <li><a href="/store" class="hover:text-white">Chợ Code VIP</a></li>
              </ul>
            </div>
          </div>
          <div class="pt-4 border-t border-gray-800/80 text-center text-[11px] text-gray-500">
            <p>© 2026 CodeGame.shop. Nền tảng chia sẻ giftcode cộng đồng & đối chiếu minh bạch Giấy phép G1 theo Cục PTTH&TTĐT (giayphep.abei.gov.vn).</p>
          </div>
        </footer>
      </div>
    `,
  });

  fs.writeFileSync(templatePath, homeHtml, 'utf8');
  console.log(`[Prerender] Đã xuất bản dist/index.html (Trang chủ hoàn chỉnh)`);

  // 2. Prerender News Page (dist/news/index.html)
  const newsDir = path.join(distDir, 'news');
  if (!fs.existsSync(newsDir)) fs.mkdirSync(newsDir, { recursive: true });

  const newsHtml = buildPageHtml({
    title: 'Tin Tức Game & Sự Kiện Giftcode Mới Nhất 2026 | CodeGame.shop',
    description: 'Tổng hợp tin tức làng game Việt, bản cập nhật mới nhất, sự kiện phát quà và danh sách giftcode game mobile, PC hot nhất 2026 cập nhật 24/7.',
    canonicalPath: '/news',
    ogType: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'NewsMediaOrganization',
        name: 'CodeGame.shop - Chuyên Mục Tin Tức',
        url: `${BASE_URL}/news`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://codegame.shop/' },
          { '@type': 'ListItem', position: 2, name: 'Tin Tức Game', item: 'https://codegame.shop/news' },
        ],
      },
    ],
    bodyContent: `
      <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <header class="site-header sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
          <a href="/" class="header-logo flex items-center gap-2 text-blue-500 font-extrabold text-base sm:text-lg">
            <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
            <span class="text-white font-bold">CodeGame.Shop</span>
          </a>
          <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-slate-300">
            <a href="/" class="hover:text-blue-400 transition-colors">Tra Cứu Code</a>
            <a href="/news" class="text-blue-400 font-black">Tin Tức Game</a>
            <a href="/giveaways" class="hover:text-blue-400 transition-colors">Săn Giveaway</a>
            <a href="/store" class="hover:text-blue-400 transition-colors">Cửa Hàng</a>
          </nav>
        </header>
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div class="rounded-3xl border border-slate-800 p-6 sm:p-10 shadow-md bg-slate-900 text-center">
            <div class="inline-block px-3.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/30 mb-3">
              📰 Tin Tức & Sự Kiện Quà Tặng 24/7
            </div>
            <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Điểm Tin Game & Danh Sách Giftcode Mới Nhất
            </h1>
            <p class="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium mt-2 max-w-2xl mx-auto">
              Cập nhật thông tin các tựa game hot nhất, bản cập nhật mới, sự kiện khai mở máy chủ và mã quà tặng kèm theo độc quyền mỗi ngày.
            </p>
          </div>
        </main>
      </div>
    `,
  });

  fs.writeFileSync(path.join(newsDir, 'index.html'), newsHtml, 'utf8');
  console.log(`[Prerender] Đã xuất bản dist/news/index.html`);

  // 2.1. Prerender Individual News Articles
  let newsArticles = [];
  try {
    const seedNewsMod = await import('../src/data/seedNews.ts');
    newsArticles = seedNewsMod.DEFAULT_NEWS_ARTICLES || [];
  } catch (err) {
    console.warn('[Prerender] Không thể nạp seedNews.ts:', err?.message);
  }

  console.log(`[Prerender] Bắt đầu sinh HTML tĩnh cho ${newsArticles.length} bài viết tin tức...`);

  newsArticles.forEach((article) => {
    const artSlug = (article.slug || article.id || '').trim();
    if (!artSlug) return;

    const artDir = path.join(newsDir, artSlug);
    if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });

    const artTitle = `${article.title} | CodeGame.shop`;
    const artDesc = article.excerpt || (article.content || '').slice(0, 160).replace(/\n/g, ' ').trim();
    const artCover = article.cover_url || (article.game_slug ? `/game_icons/${article.game_slug}.webp` : '/og-image.jpg');
    const artCanonical = `/news/${artSlug}`;

    const articleHtml = buildPageHtml({
      title: artTitle,
      description: artDesc,
      canonicalPath: artCanonical,
      ogImage: artCover,
      ogType: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: article.title,
          description: artDesc,
          image: [artCover.startsWith('http') ? artCover : `${BASE_URL}${artCover}`],
          datePublished: article.published_at || '2026-10-13T00:00:00.000Z',
          dateModified: article.updated_at || article.published_at || '2026-10-13T00:00:00.000Z',
          author: {
            '@type': 'Person',
            name: article.author || 'CodeGame Editorial',
          },
          publisher: {
            '@type': 'Organization',
            name: 'CodeGame.shop',
            logo: {
              '@type': 'ImageObject',
              url: `${BASE_URL}/logo.png`,
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${BASE_URL}${artCanonical}`,
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Tin Tức Game', item: `${BASE_URL}/news` },
            { '@type': 'ListItem', position: 3, name: article.title, item: `${BASE_URL}${artCanonical}` },
          ],
        },
      ],
      bodyContent: `
        <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
          <header class="site-header sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
            <a href="/" class="header-logo flex items-center gap-2 text-blue-500 font-extrabold text-base sm:text-lg">
              <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
              <span class="text-white font-bold">CodeGame.Shop</span>
            </a>
            <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-slate-300">
              <a href="/" class="hover:text-blue-400 transition-colors">Tra Cứu Code</a>
              <a href="/news" class="text-blue-400 font-black">Tin Tức Game</a>
              <a href="/giveaways" class="hover:text-blue-400 transition-colors">Săn Giveaway</a>
              <a href="/store" class="hover:text-blue-400 transition-colors">Cửa Hàng</a>
            </nav>
          </header>

          <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <nav class="flex items-center space-x-2 text-xs text-slate-400">
              <a href="/" class="hover:text-blue-400">Trang chủ</a>
              <span>/</span>
              <a href="/news" class="hover:text-blue-400">Tin tức game</a>
              <span>/</span>
              <span class="text-slate-200 truncate max-w-xs">${escapeHtml(article.title)}</span>
            </nav>

            <article class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-xs text-blue-400 font-bold">
                  <span>📰 TIN TỨC GAME</span>
                  ${article.game_name ? `<span>•</span><span>${escapeHtml(article.game_name)}</span>` : ''}
                </div>
                <h1 class="text-2xl sm:text-3xl font-black text-white leading-tight">
                  ${escapeHtml(article.title)}
                </h1>
                <div class="flex items-center gap-3 text-xs text-slate-400 border-b border-slate-800 pb-4">
                  <span>Đăng ngày: ${new Date(article.published_at || Date.now()).toLocaleDateString('vi-VN')}</span>
                  <span>•</span>
                  <span>Tác giả: ${escapeHtml(article.author || 'Ban Biên Tập CodeGame')}</span>
                  <span>•</span>
                  <span>${article.read_time_minutes || 3} phút đọc</span>
                </div>
              </div>

              ${artCover ? `
                <div class="rounded-2xl overflow-hidden bg-slate-950 aspect-[16/9] flex items-center justify-center">
                  <img src="${artCover}" alt="${escapeHtml(article.title)}" class="w-full h-full object-cover" />
                </div>
              ` : ''}

              <p class="text-sm sm:text-base text-slate-300 leading-relaxed font-medium italic bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                ${escapeHtml(article.excerpt || '')}
              </p>

              ${article.codes && article.codes.length > 0 ? `
                <div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <div class="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <span>🎁 Danh sách Giftcode đính kèm (${article.codes.length} mã)</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    ${article.codes.map((c) => `
                      <span class="font-mono text-xs sm:text-sm font-bold bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg border border-amber-500/30">
                        ${escapeHtml(c)}
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <div class="pt-6 border-t border-slate-800 flex justify-between items-center text-xs">
                <a href="/news" class="text-blue-400 font-bold hover:underline">← Xem tất cả bài viết tin tức</a>
                <a href="/" class="text-slate-400 hover:text-white">Tra cứu thêm 486+ game khác</a>
              </div>
            </article>
          </main>
        </div>
      `,
    });

    fs.writeFileSync(path.join(artDir, 'index.html'), articleHtml, 'utf8');
    fs.writeFileSync(path.join(newsDir, `${artSlug}.html`), articleHtml, 'utf8');
  });

  console.log(`[Prerender] Đã xuất bản thành công ${newsArticles.length} bài viết tin tức chi tiết!`);

  // 3. Prerender Giveaways Page (dist/giveaways/index.html)
  const giveawaysDir = path.join(distDir, 'giveaways');
  if (!fs.existsSync(giveawaysDir)) fs.mkdirSync(giveawaysDir, { recursive: true });

  const giveawaysHtml = buildPageHtml({
    title: 'Săn Code Phát & Giveaway Game Độc Quyền Miễn Phí | CodeGame.shop',
    description: 'Nhận giftcode giới hạn độc quyền miễn phí từ các đợt phát triên game thủ. Hệ thống kiểm tra điều kiện tài khoản tự động và phát mã tức thì.',
    canonicalPath: '/giveaways',
    ogType: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Săn Code Phát & Giveaway Game Độc Quyền Miễn Phí',
        description: 'Nhận giftcode giới hạn độc quyền miễn phí từ các đợt phát triên game thủ. Hệ thống kiểm tra điều kiện tự động và phát mã ngay.',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: { '@type': 'VirtualLocation', url: `${BASE_URL}/giveaways` },
        organizer: { '@type': 'Organization', name: 'CodeGame.shop', url: BASE_URL },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND', availability: 'https://schema.org/InStock', url: `${BASE_URL}/giveaways` },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://codegame.shop/' },
          { '@type': 'ListItem', position: 2, name: 'Đợt Phát Code', item: 'https://codegame.shop/giveaways' },
        ],
      },
    ],
    bodyContent: `
      <div class="min-h-screen flex flex-col bg-dark-950 text-[#431407]" style="background-color: var(--bg-sourcecode, #FFF3E0);">
        <header class="site-header sticky top-0 z-40 w-full border-b border-orange-200 bg-white/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
          <a href="/" class="header-logo flex items-center gap-2 text-orange-600 font-extrabold text-base sm:text-lg">
            <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
            <span class="font-bold">CodeGame.Shop</span>
          </a>
          <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-amber-900">
            <a href="/" class="hover:text-orange-600 transition-colors">Mã Miễn Phí</a>
            <a href="/giveaways" class="text-orange-600 font-black">Đợt Phát Code</a>
            <a href="/store" class="hover:text-orange-600 transition-colors">Chợ Code VIP</a>
          </nav>
        </header>

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div class="rounded-3xl border border-orange-200 p-6 sm:p-10 shadow-md bg-gradient-to-b from-[#ffe8cc] to-[#fff3e0]">
            <div class="inline-block px-3.5 py-1 rounded-full bg-orange-800/10 text-orange-950 text-xs font-bold border border-orange-600/30 mb-3">
              🎁 Đợt Phát Code Riêng Miễn Phí
            </div>
            <h1 class="text-2xl sm:text-4xl font-black text-amber-950 tracking-tight">
              Nhận Giftcode Giới Hạn <span class="text-orange-700">Có Điều Kiện</span>
            </h1>
            <p class="text-xs sm:text-sm text-amber-900/80 leading-relaxed font-medium mt-2 max-w-2xl">
              Các gói giftcode độc quyền do Ban Quản Trị phát tặng tri ân game thủ. Hoàn toàn miễn phí, hệ thống tự động kiểm tra điều kiện tài khoản và phát mã tức thì cho người hợp lệ!
            </p>
          </div>
        </main>
      </div>
    `,
  });

  fs.writeFileSync(path.join(giveawaysDir, 'index.html'), giveawaysHtml, 'utf8');
  console.log(`[Prerender] Đã xuất bản dist/giveaways/index.html`);

  // 2.5. Prerender Individual Giveaway Detail Pages (dist/giveaways/:id/index.html)
  let giveawaysList = [];
  try {
    const gwPath = fs.existsSync(path.resolve(__dirname, '../public/data/giveaways.json'))
      ? path.resolve(__dirname, '../public/data/giveaways.json')
      : path.resolve(__dirname, '../src/data/giveaways.json');
    giveawaysList = JSON.parse(fs.readFileSync(gwPath, 'utf8'));
  } catch (err) {
    console.warn('[Prerender] Không thể nạp giveaways.json:', err?.message);
  }

  console.log(`[Prerender] Bắt đầu sinh HTML tĩnh cho ${giveawaysList.length} sự kiện Giveaway...`);

  for (const gw of giveawaysList) {
    if (!gw || !gw.id) continue;
    const gwId = gw.id;
    const gwDetailDir = path.join(giveawaysDir, gwId);
    if (!fs.existsSync(gwDetailDir)) fs.mkdirSync(gwDetailDir, { recursive: true });

    const gameSlug = gw.game_slug || '';
    const gameName = gw.game_name || 'Game Mobile';

    // Thuật toán xác định ảnh đại diện chính xác 100% cho Giveaway
    let rawImage = gw.cover_image_url || gw.game_icon_url || '';
    if (!rawImage && gameSlug) {
      const matched = games.find((g) => g && (g.slug?.toLowerCase() === gameSlug.toLowerCase() || g.id?.toLowerCase() === gameSlug.toLowerCase()));
      if (matched?.icon_url) {
        rawImage = matched.icon_url;
      } else {
        rawImage = `/game_icons/${gameSlug}.jpg`;
      }
    }
    if (!rawImage) rawImage = '/og-image.jpg';
    const jpgImage = rawImage.replace(/\.webp$/i, '.jpg');
    const ogGameIcon = jpgImage.startsWith('http') ? jpgImage : `${BASE_URL}${jpgImage.startsWith('/') ? jpgImage : `/${jpgImage}`}`;

    const gwTitle = `🎁 Nhận Code: ${gw.title} - ${gameName} | CodeGame.shop`;
    const gwDesc = gw.description
      ? `${gw.description} Nhận mã quà tặng độc quyền ${gameName} miễn phí tại CodeGame.shop.`
      : `Nhận ngay ${gw.title} cho tựa game ${gameName}. Số lượng có hạn, kiểm tra điều kiện tài khoản và nhận mã tức thì!`;

    const gwHtml = buildPageHtml({
      title: gwTitle,
      description: gwDesc,
      canonicalPath: `/giveaways/${encodeURIComponent(gwId)}`,
      ogImage: ogGameIcon,
      ogType: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: `Săn Mã: ${gw.title} - ${gameName}`,
          description: gwDesc,
          image: ogGameIcon,
          startDate: gw.start_time || '2026-01-01',
          endDate: gw.end_time || '2026-12-31',
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
          location: { '@type': 'VirtualLocation', url: `${BASE_URL}/giveaways/${encodeURIComponent(gwId)}` },
          organizer: { '@type': 'Organization', name: 'CodeGame.shop', url: BASE_URL },
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND', availability: 'https://schema.org/InStock', url: `${BASE_URL}/giveaways/${encodeURIComponent(gwId)}` },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://codegame.shop/' },
            { '@type': 'ListItem', position: 2, name: 'Đợt Phát Code', item: 'https://codegame.shop/giveaways' },
            { '@type': 'ListItem', position: 3, name: gameName, item: `${BASE_URL}/giveaways/${encodeURIComponent(gwId)}` },
          ],
        },
      ],
      bodyContent: `
        <div class="min-h-screen flex flex-col bg-dark-950 text-[#431407]" style="background-color: var(--bg-sourcecode, #FFF3E0);">
          <header class="site-header sticky top-0 z-40 w-full border-b border-orange-200 bg-white/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
            <a href="/" class="header-logo flex items-center gap-2 text-orange-600 font-extrabold text-base sm:text-lg">
              <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
              <span class="font-bold">CodeGame.Shop</span>
            </a>
            <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-amber-900">
              <a href="/" class="hover:text-orange-600 transition-colors">Mã Miễn Phí</a>
              <a href="/giveaways" class="text-orange-600 font-black">Đợt Phát Code</a>
              <a href="/store" class="hover:text-orange-600 transition-colors">Chợ Code VIP</a>
            </nav>
          </header>

          <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div class="rounded-3xl border border-orange-200 p-6 sm:p-8 shadow-md bg-white flex flex-col sm:flex-row items-center gap-6">
              <img src="${ogGameIcon}" alt="${escapeHtml(gameName)}" class="w-24 h-24 rounded-2xl object-cover shadow-md border border-orange-100" />
              <div class="flex-1 text-center sm:text-left">
                <div class="inline-block px-3 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold mb-2">
                  🎁 Sự Kiện Phát Mã Quà Tặng
                </div>
                <h1 class="text-xl sm:text-2xl font-black text-amber-950">
                  ${escapeHtml(gw.title)} - ${escapeHtml(gameName)}
                </h1>
                <p class="text-xs sm:text-sm text-amber-900/80 mt-1.5 font-medium leading-relaxed">
                  ${escapeHtml(gw.description || 'Tham gia nhận mã quà tặng độc quyền hoàn toàn miễn phí.')}
                </p>
                <div class="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <a href="/giveaways#gw=${encodeURIComponent(gwId)}" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition-all">
                    👉 Vào Nhận Mã Ngay
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>
      `,
    });

    fs.writeFileSync(path.join(gwDetailDir, 'index.html'), gwHtml, 'utf8');
  }
  console.log(`[Prerender] Đã xuất bản hoàn tất ${giveawaysList.length} trang chi tiết sự kiện Giveaway!`);

  // 3. Prerender Store Page (dist/store/index.html)
  const storeDir = path.join(distDir, 'store');
  if (!fs.existsSync(storeDir)) fs.mkdirSync(storeDir, { recursive: true });

  const storeHtml = buildPageHtml({
    title: 'Cửa Hàng Giftcode VIP & Giao Dịch Mã Game Tự Động 24/7 | CodeGame.shop',
    description: 'Mua bán giftcode VIP, gói nạp game bản quyền chiết khấu tới 40%. Giao dịch tự động 24/7 qua SePay, nhận mã ngay trên màn hình trong 30 giây.',
    canonicalPath: '/store',
    ogType: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: 'Chợ Code VIP - CodeGame.shop',
        description: 'Cửa hàng giao dịch mã game bản quyền và giftcode VIP tự động 24/7 qua SePay.',
        url: `${BASE_URL}/store`,
        priceRange: '10.000 VND - 500.000 VND',
        paymentAccepted: 'Chuyển khoản Ngân hàng (SePay), Ví điện tử',
        currenciesAccepted: 'VND',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://codegame.shop/' },
          { '@type': 'ListItem', position: 2, name: 'Chợ Code VIP', item: 'https://codegame.shop/store' },
        ],
      },
    ],
    bodyContent: `
      <div class="min-h-screen flex flex-col bg-[var(--bg-market,#E3F2FD)] text-[#082f49]">
        <header class="site-header sticky top-0 z-40 w-full border-b border-sky-200 bg-white/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
          <a href="/" class="header-logo flex items-center gap-2 text-sky-600 font-extrabold text-base sm:text-lg">
            <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
            <span class="font-bold">CodeGame.Shop</span>
          </a>
          <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-sky-950">
            <a href="/" class="hover:text-sky-600 transition-colors">Mã Miễn Phí</a>
            <a href="/giveaways" class="hover:text-sky-600 transition-colors">Đợt Phát Code</a>
            <a href="/store" class="text-sky-600 font-black">Chợ Code VIP</a>
          </nav>
        </header>

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div class="rounded-3xl border border-sky-200 p-6 sm:p-10 shadow-md bg-gradient-to-b from-[#d2ebfd] to-[#e3f2fd] text-center">
            <div class="inline-block px-3.5 py-1 rounded-full bg-white border border-sky-300 text-sky-900 text-xs font-bold mb-3">
              💎 Mã Code Bản Quyền Chiết Khấu Đến 40%
            </div>
            <h1 class="text-3xl sm:text-5xl font-black tracking-tight text-sky-950">
              Cửa Hàng Giftcode VIP & Tự Động
            </h1>
            <p class="text-sm sm:text-base text-sky-900/80 max-w-xl mx-auto font-medium mt-2">
              Giao dịch hoàn toàn tự động qua chuyển khoản ngân hàng (SePay). Mã quà tặng được trả về ngay trên màn hình trong 30 giây.
            </p>
          </div>
        </main>
      </div>
    `,
  });

  fs.writeFileSync(path.join(storeDir, 'index.html'), storeHtml, 'utf8');
  console.log(`[Prerender] Đã xuất bản dist/store/index.html`);

  // 3.5. Prerender Admin Page (dist/admin/index.html)
  const adminDir = path.join(distDir, 'admin');
  if (!fs.existsSync(adminDir)) fs.mkdirSync(adminDir, { recursive: true });

  const adminHtml = buildPageHtml({
    title: 'Quản Trị Hệ Thống | CodeGame.shop',
    description: 'Bảng điều khiển quản trị hệ thống CodeGame.shop.',
    canonicalPath: '/admin',
    noindex: true,
    bodyContent: `
      <div class="min-h-screen flex items-center justify-center bg-dark-950 text-gray-100">
        <div class="flex flex-col items-center space-y-3">
          <div class="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs font-semibold text-gray-400">Đang khởi tạo trang quản trị...</span>
        </div>
      </div>
    `,
  });

  fs.writeFileSync(path.join(adminDir, 'index.html'), adminHtml, 'utf8');
  console.log(`[Prerender] Đã xuất bản dist/admin/index.html`);

  // 3.6. Prerender Missions Page (dist/nhiem-vu/index.html & dist/missions/index.html)
  const missionsDir = path.join(distDir, 'nhiem-vu');
  if (!fs.existsSync(missionsDir)) fs.mkdirSync(missionsDir, { recursive: true });
  const missionsEnDir = path.join(distDir, 'missions');
  if (!fs.existsSync(missionsEnDir)) fs.mkdirSync(missionsEnDir, { recursive: true });

  const missionsHtml = buildPageHtml({
    title: 'Nhiệm Vụ Nhận Quà & Tiền Ví Miễn Phí 2026 | CodeGame.shop',
    description: 'Tham gia làm nhiệm vụ chia sẻ bài viết, lan tỏa cộng đồng để nhận ngay Giftcode độc quyền và số dư ví mua sắm miễn phí trên sàn CodeGame.Shop.',
    canonicalPath: '/nhiem-vu',
    ogType: 'website',
    bodyContent: `
      <div class="min-h-screen flex flex-col bg-slate-900 text-white">
        <header class="site-header sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
          <a href="/" class="header-logo flex items-center gap-2 text-primary font-bold text-lg">
            <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
            <span>CodeGame.Shop</span>
          </a>
          <nav class="hidden md:flex items-center space-x-6 text-sm font-semibold">
            <a href="/" class="hover:text-primary transition-colors">Tra Code</a>
            <a href="/news" class="hover:text-primary transition-colors">Tin Tức</a>
            <a href="/giveaways" class="hover:text-primary transition-colors">Giveaway</a>
            <a href="/store" class="hover:text-primary transition-colors">Cửa Hàng</a>
            <a href="/utilities" class="hover:text-primary transition-colors">Tiện Ích</a>
            <a href="/nhiem-vu" class="text-primary font-bold">Nhiệm Vụ</a>
          </nav>
        </header>
        <main class="max-w-6xl mx-auto px-4 py-12 text-center space-y-4">
          <div class="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary-light text-xs font-bold uppercase">
            Hệ Thống Nhiệm Vụ & Nhận Quà
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-white">
            Làm Nhiệm Vụ — Nhận Mã Code & Tiền Ví Miễn Phí
          </h1>
          <p class="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Chia sẻ bài viết, lan tỏa cộng đồng game thủ để nhận ngay những mã Giftcode độc quyền và số dư ví mua sắm không giới hạn trên sàn.
          </p>
        </main>
      </div>
    `,
  });

  fs.writeFileSync(path.join(missionsDir, 'index.html'), missionsHtml, 'utf8');
  fs.writeFileSync(path.join(missionsEnDir, 'index.html'), missionsHtml, 'utf8');
  console.log(`[Prerender] Đã xuất bản dist/nhiem-vu/index.html & dist/missions/index.html`);

  // 4. Prerender all 189 Game Detail Pages (dist/game/${slug}/index.html)
  for (const game of games) {
    const slug = game.slug || game.id;
    const gameDir = path.join(distDir, 'game', slug);
    if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });

    // Filter codes for this game with exact matching consistent with functions/api/games.ts
    const normSlug = String(slug).toLowerCase().trim();
    const cleanWithoutMobile = normSlug.replace(/-mobile$/i, '');
    const cleanId = String(game.id || '').toLowerCase().trim();
    const exactKeys = new Set([
      normSlug,
      cleanWithoutMobile,
      cleanId,
      cleanId.replace(/-mobile$/i, ''),
      ...(normSlug === 'huyen-thoai-hai-tac' || normSlug === 'pirate-legends' ? ['huyen-thoai-hai-tac', 'pirate-legends'] : []),
      ...(normSlug === 'yen-van-thap-luc-thanh' || normSlug === 'where-winds-meet-mobile' ? ['yen-van-thap-luc-thanh', 'where-winds-meet-mobile'] : []),
    ]);

    const seenCodeVals = new Set();
    const gameCodes = [];
    for (const c of crawledCodes) {
      if (!c) continue;
      const cSlug = String(c.gameSlug || c.slug || c.gameId || '').toLowerCase().trim();
      const cName = String(c.gameName || '').toLowerCase().trim();
      const gName = String(game.name || '').toLowerCase().trim();
      const isMatch = exactKeys.has(cSlug) || (cName && gName && cName === gName);
      if (isMatch) {
        const val = String(c.codeValue || c.code_value || c.code || '').trim().toUpperCase();
        if (val && !seenCodeVals.has(val)) {
          seenCodeVals.add(val);
          gameCodes.push(c);
        }
      }
    }

    const activeCodes = gameCodes.filter((c) => !isCodeExpired(c));
    const displayCodes = activeCodes;

    // Calculate authentic lastmod / update date
    let maxTime = 0;
    if (game.updated_at) {
      const t = new Date(game.updated_at).getTime();
      if (!isNaN(t)) maxTime = Math.max(maxTime, t);
    }
    if (game.created_at) {
      const t = new Date(game.created_at).getTime();
      if (!isNaN(t)) maxTime = Math.max(maxTime, t);
    }
    for (const c of gameCodes) {
      if (c.added_at) {
        const t = new Date(c.added_at).getTime();
        if (!isNaN(t)) maxTime = Math.max(maxTime, t);
      }
    }
    if (maxTime === 0) {
      maxTime = new Date('2026-10-26T12:00:00Z').getTime();
    }
    const dateObj = new Date(maxTime);
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    const formattedDate = `${dd}/${mm}/${yyyy}`;
    const lastmodIso = dateObj.toISOString();
    const clusterSlug = getClusterSlug(game.category);

    const rawImg = game.cover_image_url || game.icon_url || `/game_icons/${slug}.jpg`;
    const jpgImg = rawImg.replace(/\.webp$/i, '.jpg');
    const ogCoverImg = jpgImg.startsWith('http') ? jpgImg : `${BASE_URL}${jpgImg.startsWith('/') ? jpgImg : `/${jpgImg}`}`;
    const coverImg = game.cover_image_url || game.icon_url || `${BASE_URL}/game_icons/${slug}.webp`;
    const isWwm = slug === 'where-winds-meet' || slug === 'where-winds-meet-mobile' || slug === 'yen-van-thap-luc-thanh';
    const codeCount = isWwm ? 584 : displayCodes.length;
    const countSuffix = codeCount > 0
      ? ` - Nhận ${codeCount} Mã Code`
      : ` - Hướng Dẫn Nhập & Nhận Quà`;
    const title = `Giftcode ${game.name} Mới Nhất 2026${countSuffix} | CodeGame.shop`;
    const description = codeCount > 0
      ? `Tổng hợp ${codeCount} mã giftcode ${game.name} còn hạn mới nhất 2026. Hướng dẫn nhập code chi tiết và phần thưởng tân thủ bản quyền G1.`
      : `Hướng dẫn nhập code ${game.name} chi tiết và cập nhật các đợt phát quà tặng tân thủ mới nhất 2026 từ ${game.publisher || 'NPH'}.`;

    const canonicalSlug = GAME_CANONICAL_ALIASES[slug] || slug;

    // Compute related games for Internal Linking Spider Matrix
    const relatedGames = games
      .filter((g) => (g.slug || g.id) !== slug && (g.category === game.category || g.publisher === game.publisher))
      .slice(0, 6);
    const displayRelated = relatedGames.length >= 4
      ? relatedGames
      : games.filter((g) => (g.slug || g.id) !== slug).slice(0, 6);

    const gameHtml = buildPageHtml({
      title,
      description,
      canonicalPath: `/game/${encodeURIComponent(canonicalSlug)}`,
      ogImage: ogCoverImg,
      ogType: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'VideoGame',
          name: game.name,
          description: game.description || description,
          genre: game.category || 'Nhập Vai',
          gamePlatform: 'Android, iOS, PC',
          author: {
            '@type': 'Organization',
            name: game.publisher || 'Nhà phát hành Việt Nam',
          },
          image: coverImg,
          dateModified: lastmodIso,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'VND',
            availability: 'https://schema.org/InStock',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Tra Cứu Giftcode', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 3, name: game.name, item: `${BASE_URL}/game/${encodeURIComponent(canonicalSlug)}` },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: `Giftcode ${game.name} có hạn sử dụng không?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `Các mã giftcode ${game.name} có thời hạn tùy thuộc vào sự kiện của ${game.publisher || 'Nhà phát hành'}. Bạn nên nhập ngay khi lấy mã để tránh hết hạn hoặc hết lượt kích hoạt.`,
              },
            },
            {
              '@type': 'Question',
              name: `Làm sao để nhận thêm mã code ${game.name} mới nhất 2026?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `CodeGame.shop tự động theo dõi và cập nhật giftcode ${game.name} 24/7 từ các sự kiện bảo trì, ra mắt máy chủ và fanpage chính thức của ${game.publisher || 'NPH'}.`,
              },
            },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: `Cách nhập Giftcode ${game.name} nhận quà tân thủ`,
          description: `Hướng dẫn từng bước cách nhập mã giftcode ${game.name} thành công 100% để nhận Kim Cương, KNB và quà VIP.`,
          image: coverImg,
          step: parseHowToSteps(game.instructions, game.name),
        },
      ],
      bodyContent: (() => {
        const isG1 = (game.trang_thai_gp && /G1\b/i.test(game.trang_thai_gp)) || /(QĐ|QD)-(BTTTT|PTTH&TTĐT|BVHTTDL)/i.test(game.so_giay_phep || '');
        return `
        <div class="min-h-screen flex flex-col bg-dark-950 text-gray-100">
          <header class="site-header sticky top-0 z-40 w-full border-b border-gray-800/80 bg-dark-950/85 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
            <a href="/" class="header-logo flex items-center gap-2 text-brand-400 font-extrabold text-base sm:text-lg">
              <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
              <span class="text-white font-bold">CodeGame.Shop</span>
            </a>
            <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-gray-300">
              <a href="/" class="text-brand-400 font-black">Mã Miễn Phí</a>
              <a href="/giveaways" class="hover:text-white transition-colors">Đợt Phát Code</a>
              <a href="/store" class="hover:text-white transition-colors">Chợ Code VIP</a>
            </nav>
          </header>

          <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div class="flex items-center space-x-4 p-5 rounded-3xl bg-dark-900 border border-gray-800 shadow-xl">
              <img src="${escapeHtml(coverImg)}" alt="${escapeHtml(game.name)}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-gray-700">
              <div>
                <div class="flex items-center gap-1.5 flex-wrap mb-1">
                  <a href="/the-loai/${clusterSlug}" class="inline-block px-2.5 py-0.5 rounded-full bg-brand-500/10 hover:bg-brand-500/25 text-brand-400 hover:text-brand-300 text-[11px] font-bold border border-brand-500/20 transition-all">
                    ${escapeHtml(game.category || 'Game Mobile')}
                  </a>
                  ${
                    isG1
                      ? `<span class="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/40">✓ Đã xác minh (G1)</span>`
                      : `<span class="inline-block px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">🌐 Quốc Tế</span>`
                  }
                </div>
                <h1 class="text-xl sm:text-3xl font-black text-white">${escapeHtml(game.name)}</h1>
                <p class="text-xs sm:text-sm text-gray-400 font-semibold mt-0.5">${escapeHtml(game.publisher || 'NPH Chính Thức VN')}</p>
                <div class="mt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span>📅 Cập nhật: ${formattedDate} (Kiểm tra thực tế)</span>
                </div>
              </div>
            </div>

            ${
              isG1
                ? `<!-- License Box (G1) -->
            <div class="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs sm:text-sm text-emerald-200 space-y-1">
              <div class="font-bold text-emerald-400 text-sm mb-1">📜 Thông Tin Pháp Lý & Giấy Phép G1 (Đã Xác Minh):</div>
              <div>• <strong>Số giấy phép:</strong> ${escapeHtml(game.so_giay_phep || game.license_number || 'Đã cấp phép G1')}</div>
              <div>• <strong>Ngày cấp phép:</strong> ${escapeHtml(game.ngay_cap_phep || game.license_date || game.release_date || '2026')}</div>
              <div>• <strong>Nhà phát hành:</strong> ${escapeHtml(game.publisher || 'NPH Chính Thức VN')}</div>
              <div>• <strong>Nguồn đối chiếu:</strong> Cục PTTH&TTĐT (giayphep.abei.gov.vn)</div>
            </div>`
                : `<!-- International Box -->
            <div class="p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/30 text-xs sm:text-sm text-cyan-200 space-y-1">
              <div class="font-bold text-cyan-400 text-sm mb-1">🌐 Tựa Game Quốc Tế (Phát Hành Toàn Cầu):</div>
              <div>• <strong>Định danh / Bản quyền:</strong> Phiên bản phát hành quốc tế</div>
              <div>• <strong>Nhà phát hành / Studio:</strong> ${escapeHtml(game.publisher || 'Quốc Tế')}</div>
              <div>• <strong>Trạng thái:</strong> Phát hành toàn cầu & Cập nhật giftcode tự động</div>
            </div>`
            }

            ${(() => {
              const playUrl = game.google_play_url || game.download_android;
              const iosUrl = game.app_store_url || game.download_ios;
              if (!playUrl && !iosUrl) return '';
              return `
            <!-- Download Section (Pre-rendered for SEO & no-JS) -->
            <div class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-3">
              <h2 class="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>📲 Tải Game Chính Thức</span>
                <span class="text-xs text-emerald-400 font-semibold">Official Store</span>
              </h2>
              <div class="flex items-center gap-3 flex-wrap">
                ${playUrl ? `<a href="${escapeHtml(playUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md">Tải trên CH Play</a>` : ''}
                ${iosUrl ? `<a href="${escapeHtml(iosUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm shadow-md">Tải trên App Store</a>` : ''}
              </div>
              <p class="text-xs text-gray-400">Nếu CH Play/App Store báo &quot;không có ở quốc gia của bạn&quot;, đó là giới hạn vùng theo tài khoản của bạn — link tải vẫn đúng. Hãy thử tài khoản thuộc vùng game đã phát hành.</p>
            </div>`;
            })()}

            <!-- Codes List -->
            <div class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-3">
              <h2 class="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>🎁 Danh Sách Giftcode ${escapeHtml(game.name)} Còn Hạn</span>
                <span class="text-xs text-brand-400 font-semibold">${displayCodes.length} mã khả dụng</span>
              </h2>

              <div class="space-y-2">
                ${
                  displayCodes.length > 0
                    ? displayCodes
                        .map((c) => {
                          const val = escapeHtml(c.codeValue || c.code_value || c.code);
                          const rew = c.rewards ? `🎁 ${escapeHtml(c.rewards)}` : `🎁 Chưa rõ phần thưởng`;
                          const exp = (c.expiresAt || c.expires_at || c.expiry || '').trim();
                          const isDummyExp = exp.includes('2026-12-31') || exp.includes('31/12/2026');
                          const expText = exp && !isDummyExp ? `⏱️ HSD: ${escapeHtml(exp)}` : `⏱️ HSD: Chưa rõ hạn dùng`;
                          return `
                  <div class="flex items-center justify-between p-3 rounded-xl bg-dark-850 border border-gray-800">
                    <div>
                      <code class="font-mono font-bold text-brand-400 text-sm sm:text-base">${val}</code>
                      <div class="text-xs text-gray-400 mt-0.5">${rew} • ${expText}</div>
                    </div>
                    <span class="text-xs px-2.5 py-1 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30 font-bold">Mới nhất</span>
                  </div>`;
                        })
                        .join('')
                    : `
                  <div class="p-6 rounded-2xl bg-dark-850/80 border border-gray-800 text-center space-y-2">
                    <div class="text-2xl">⏳</div>
                    <h3 class="text-sm sm:text-base font-bold text-gray-200">Hiện Chưa Có Mã Giftcode Mới Cho ${escapeHtml(game.name)}</h3>
                    <p class="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
                      Hệ thống CodeGame.shop đang tự động theo dõi và kiểm tra mã quà tặng mới từ nhà phát hành ${escapeHtml(game.publisher || 'chính thức')} 24/7.
                      <br>📅 <strong>Kiểm tra lần cuối:</strong> ${formattedDate} (Chưa phát sinh mã mới).
                    </p>
                    <p class="text-xs text-brand-400 font-semibold pt-1">
                      👉 Bạn có thể xem hướng dẫn nhập code bên dưới hoặc khám phá các tựa game cùng thể loại đang có mã khả dụng!
                    </p>
                  </div>`
                }
              </div>
            </div>

            <!-- Instructions -->
            ${
              game.instructions && game.instructions.trim().length > 0
                ? `
            <div class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-2">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <h2 class="text-base sm:text-lg font-bold text-white">📖 Hướng Dẫn Nhập Code ${escapeHtml(game.name)}</h2>
                ${game.redeem_url ? `<a href="${escapeHtml(game.redeem_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all">🌐 Mở Trang Đổi Code</a>` : ''}
              </div>
              <div class="text-xs sm:text-sm text-gray-300 whitespace-pre-line leading-relaxed">${escapeHtml(game.instructions.trim())}</div>
            </div>`
                : ''
            }

            <!-- Description -->
            ${
              game.description
                ? `
            <div class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-2">
              <h2 class="text-base sm:text-lg font-bold text-white">ℹ️ Giới Thiệu Trò Chơi</h2>
              <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">${escapeHtml(game.description)}</p>
            </div>`
                : ''
            }

            <!-- Game-Specific FAQ matching FAQPage Schema -->
            <section class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-4">
              <h2 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>❓ Câu Hỏi Thường Gặp Về Giftcode ${escapeHtml(game.name)}</span>
              </h2>
              <div class="space-y-3 text-xs sm:text-sm text-gray-300">
                <div class="p-4 rounded-xl bg-dark-850 border border-gray-800/80">
                  <h3 class="font-bold text-gray-100 mb-1">1. Giftcode ${escapeHtml(game.name)} có hạn sử dụng không?</h3>
                  <p class="text-gray-400 leading-relaxed">Các mã giftcode ${escapeHtml(game.name)} có thời hạn tùy thuộc vào từng sự kiện của ${escapeHtml(game.publisher || 'Nhà phát hành')}. Bạn nên nhập ngay khi lấy mã để tránh hết hạn hoặc hết lượt kích hoạt.</p>
                </div>
                <div class="p-4 rounded-xl bg-dark-850 border border-gray-800/80">
                  <h3 class="font-bold text-gray-100 mb-1">2. Làm sao để nhận thêm mã code ${escapeHtml(game.name)} mới nhất 2026?</h3>
                  <p class="text-gray-400 leading-relaxed">Hệ thống CodeGame.shop tự động theo dõi và cập nhật mã mới 24/7 từ các sự kiện bảo trì, ra mắt máy chủ và fanpage chính thức của ${escapeHtml(game.publisher || 'NPH')}. Hãy lưu trang này để nhận thông báo sớm nhất.</p>
                </div>
              </div>
            </section>

            <!-- Related Games Matrix (Deep Crawl Spider) -->
            <section class="p-5 rounded-2xl bg-dark-900 border border-gray-800 space-y-3">
              <h2 class="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>🎮 Tựa Game Cùng Thể Loại & NPH Đang Có Giftcode</span>
              </h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                ${displayRelated
                  .map(
                    (rg) => `
                  <a href="/game/${escapeHtml(rg.slug || rg.id)}" class="flex flex-col bg-dark-850 hover:bg-dark-800 p-2.5 rounded-xl border border-gray-800 hover:border-brand-500/40 transition-all text-left group">
                    <img src="${escapeHtml(rg.icon_url || rg.cover_image_url || `/game_icons/${rg.slug || rg.id}.webp`)}" alt="${escapeHtml(rg.name)}" loading="lazy" class="w-full aspect-square rounded-lg object-cover mb-2 border border-gray-700/60">
                    <h3 class="font-bold text-xs text-gray-200 group-hover:text-brand-400 line-clamp-1">${escapeHtml(rg.name)}</h3>
                    <span class="text-[10px] text-gray-400 truncate mt-0.5">${escapeHtml(rg.publisher || 'NPH Việt Nam')}</span>
                  </a>`
                  )
                  .join('')}
              </div>
            </section>

            <div class="text-center pt-4">
              <a href="/" class="inline-block px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-all">
                ← Quay Lại Danh Sách Game
              </a>
            </div>
          </main>

          <footer class="mt-auto border-t border-gray-800/80 bg-dark-900/50 py-8 px-4 text-xs text-gray-400">
            <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <p>© 2026 CodeGame.shop. Cập nhật mã ${escapeHtml(game.name)}.</p>
              <div class="flex items-center gap-3 text-xs">
                <a href="/danh-sach-game-a-z" class="text-brand-400 hover:underline">Danh Mục A-Z</a>
                <span>•</span>
                <a href="/the-loai/${clusterSlug}" class="text-gray-300 hover:text-white">${escapeHtml(game.category || 'Thể loại')}</a>
                <span>•</span>
                <a href="/" class="hover:text-white">Trang Chủ</a>
              </div>
            </div>
          </footer>
        </div>
      `;
      })(),
    });

    fs.writeFileSync(path.join(gameDir, 'index.html'), gameHtml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'game', `${slug}.html`), gameHtml, 'utf8');
  }

  // Dọn dẹp dist/g/ nếu còn tồn tại để Edge Worker xử lý 301 chuẩn hóa
  const legacyGDir = path.join(distDir, 'g');
  if (fs.existsSync(legacyGDir)) {
    fs.rmSync(legacyGDir, { recursive: true, force: true });
  }

  console.log(`[Prerender] Đã xuất bản hoàn tất ${games.length} trang chi tiết tựa game chuẩn SEO!`);

  // 5. Prerender 404 Page (dist/404.html)
  const notFoundHtml = buildPageHtml({
    title: '404 - Không Tìm Thấy Trang | CodeGame.shop',
    description: 'Trang bạn đang tìm kiếm không tồn tại trên CodeGame.shop.',
    canonicalPath: '/404',
    noindex: true,
    bodyContent: `
      <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-dark-950 text-gray-100">
        <h1 class="text-4xl sm:text-6xl font-black text-brand-400 mb-2">404</h1>
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-4">Không Tìm Thấy Trang</h2>
        <p class="text-gray-400 text-sm max-w-md mb-6">Nội dung bạn đang tìm kiếm không tồn tại hoặc đã thay đổi địa chỉ.</p>
        <a href="/" class="px-6 py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-500 transition-all">
          Về Trang Chủ CodeGame.shop
        </a>
      </div>
    `,
  });

  fs.writeFileSync(path.join(distDir, '404.html'), notFoundHtml, 'utf8');
  console.log(`[Prerender] Đã xuất bản dist/404.html`);

  // 4.5. Prerender Topic Cluster Pages (/the-loai/:slug)
  const theLoaiDir = path.join(distDir, 'the-loai');
  if (!fs.existsSync(theLoaiDir)) fs.mkdirSync(theLoaiDir, { recursive: true });

  for (const cluster of TOPIC_CLUSTERS) {
    const clusterDir = path.join(theLoaiDir, cluster.slug);
    if (!fs.existsSync(clusterDir)) fs.mkdirSync(clusterDir, { recursive: true });

    const clusterGames = games.filter((g) => cluster.match(g.category || ''));
    const clusterTitle = `Giftcode Game ${cluster.name} Mới Nhất 2026 - Nhận Mã Quà Tặng | CodeGame.shop`;
    const clusterDesc = `Tổng hợp giftcode mới nhất 2026 của ${clusterGames.length}+ tựa game ${cluster.name}. Mã code còn hạn, hướng dẫn nhập chi tiết và thông tin bản quyền G1.`;

    const clusterHtml = buildPageHtml({
      title: clusterTitle,
      description: clusterDesc,
      canonicalPath: `/the-loai/${cluster.slug}`,
      ogImage: 'https://codegame.shop/og-image.jpg',
      ogType: 'website',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: clusterTitle,
          description: clusterDesc,
          url: `${BASE_URL}/the-loai/${cluster.slug}`,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Thể Loại Game', item: `${BASE_URL}/danh-sach-game-a-z` },
            { '@type': 'ListItem', position: 3, name: cluster.name, item: `${BASE_URL}/the-loai/${cluster.slug}` },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: clusterGames.slice(0, 30).map((g, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: g.name,
            url: `${BASE_URL}/game/${g.slug || g.id}`,
          })),
        },
      ],
      bodyContent: `
        <div class="min-h-screen flex flex-col bg-dark-950 text-gray-100 font-sans">
          <header class="site-header sticky top-0 z-40 w-full border-b border-gray-800/80 bg-dark-950/85 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
            <a href="/" class="header-logo flex items-center gap-2 text-brand-400 font-extrabold text-base sm:text-lg">
              <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
              <span class="text-white font-bold">CodeGame.Shop</span>
            </a>
            <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-gray-300">
              <a href="/" class="hover:text-white transition-colors">Trang Chủ</a>
              <a href="/danh-sach-game-a-z" class="hover:text-white transition-colors">Danh Mục A-Z</a>
              <a href="/the-loai/${cluster.slug}" class="text-brand-400 font-black">Chuyên Mục</a>
              <a href="/giveaways" class="hover:text-white transition-colors">Đợt Phát Code</a>
            </nav>
          </header>

          <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <!-- Breadcrumbs -->
            <nav class="flex items-center gap-2 text-xs text-gray-400">
              <a href="/" class="hover:text-brand-400">Trang chủ</a>
              <span>/</span>
              <a href="/danh-sach-game-a-z" class="hover:text-brand-400">Thể loại</a>
              <span>/</span>
              <span class="text-white">${escapeHtml(cluster.name)}</span>
            </nav>

            <!-- Hero Header -->
            <div class="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-dark-900 via-dark-850 to-dark-900 border border-gray-800 text-center space-y-4">
              <div class="inline-block px-3.5 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold border border-brand-500/30">
                ${escapeHtml(cluster.badge)}
              </div>
              <h1 class="text-2xl sm:text-4xl font-black text-white">
                Giftcode Game ${escapeHtml(cluster.name)} Mới Nhất 2026
              </h1>
              <p class="text-xs sm:text-sm text-gray-300 max-w-2xl mx-auto leading-relaxed">
                ${escapeHtml(cluster.description)} Tổng hợp ${clusterGames.length}+ tựa game có bản quyền và phát hành chính thức.
              </p>

              <!-- Topic Clusters Filter Pills -->
              <div class="pt-4 flex flex-wrap items-center justify-center gap-2">
                ${TOPIC_CLUSTERS.map((c) => `
                  <a href="/the-loai/${c.slug}" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${c.slug === cluster.slug ? 'bg-brand-600 text-white shadow-md' : 'bg-dark-800 text-gray-300 hover:bg-dark-750 hover:text-white border border-gray-700/60'}">
                    ${escapeHtml(c.name)}
                  </a>
                `).join('')}
                <a href="/danh-sach-game-a-z" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-dark-800 text-brand-400 hover:bg-dark-750 border border-brand-500/30 transition-all">
                  Toàn bộ A-Z →
                </a>
              </div>
            </div>

            <!-- Games Grid -->
            <section class="space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>🎮 Danh Sách ${clusterGames.length} Game ${escapeHtml(cluster.name)}</span>
                </h2>
                <span class="text-xs text-gray-400">Sắp xếp theo độ hot</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                ${clusterGames.map((g) => {
                  const gSlug = g.slug || g.id;
                  const gCover = g.cover_image_url || g.icon_url || `/game_icons/${gSlug}.webp`;
                  const gCodes = (g.codes_count || g.total_codes_count || g.free_codes_count || 0);
                  return `
                  <a href="/game/${escapeHtml(gSlug)}" class="flex flex-col bg-dark-900 hover:bg-dark-850 p-3 rounded-2xl border border-gray-800 hover:border-brand-500/50 transition-all group">
                    <img src="${escapeHtml(gCover)}" alt="${escapeHtml(g.name)}" loading="lazy" class="w-full aspect-square rounded-xl object-cover mb-2 border border-gray-700/60 group-hover:scale-105 transition-transform" />
                    <h3 class="font-bold text-xs text-gray-100 group-hover:text-brand-400 line-clamp-1">${escapeHtml(g.name)}</h3>
                    <span class="text-[10px] text-gray-400 truncate mt-0.5">${escapeHtml(g.publisher || 'NPH Chính Thức')}</span>
                    <div class="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md self-start border border-emerald-500/30">
                      🎁 ${gCodes > 0 ? `${gCodes} Mã Code` : 'Hướng Dẫn Code'}
                    </div>
                  </a>`;
                }).join('')}
              </div>
            </section>

            <!-- Topic Cluster Genre FAQ -->
            <section class="p-6 rounded-2xl bg-dark-900 border border-gray-800 space-y-4">
              <h2 class="text-base sm:text-lg font-bold text-white">
                ❓ Câu Hỏi Thường Gặp Về Game ${escapeHtml(cluster.name)}
              </h2>
              <div class="space-y-3 text-xs sm:text-sm text-gray-300">
                <div class="p-4 rounded-xl bg-dark-850 border border-gray-800/80">
                  <h3 class="font-bold text-gray-100 mb-1">Giftcode dòng game ${escapeHtml(cluster.name)} gồm những gì?</h3>
                  <p class="text-gray-400">Thông thường mã code mang lại tài nguyên cày cuốc như Vé Quay Gacha, Kim Cương, KNB, Thể Lực và Trang Bị cao cấp dành riêng cho tân thủ.</p>
                </div>
                <div class="p-4 rounded-xl bg-dark-850 border border-gray-800/80">
                  <h3 class="font-bold text-gray-100 mb-1">Bao lâu thì có giftcode mới?</h3>
                  <p class="text-gray-400">Nhà phát hành thường tung giftcode vào các dịp bảo trì máy chủ hàng tuần, sự kiện mừng phiên bản mới hoặc các mốc người chơi đạt thưởng lớn.</p>
                </div>
              </div>
            </section>
          </main>

          <footer class="mt-auto border-t border-gray-800/80 bg-dark-900/50 py-8 px-4 text-xs text-gray-400">
            <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <p>© 2026 CodeGame.shop. Chuyên mục game ${escapeHtml(cluster.name)}.</p>
              <div class="flex items-center gap-3 text-xs">
                <a href="/danh-sach-game-a-z" class="text-brand-400 hover:underline">Danh Mục A-Z</a>
                <span>•</span>
                <a href="/" class="hover:text-white">Trang Chủ</a>
              </div>
            </div>
          </footer>
        </div>
      `,
    });

    fs.writeFileSync(path.join(clusterDir, 'index.html'), clusterHtml, 'utf8');
    fs.writeFileSync(path.join(theLoaiDir, `${cluster.slug}.html`), clusterHtml, 'utf8');
  }
  console.log(`[Prerender] Đã xuất bản hoàn tất ${TOPIC_CLUSTERS.length} trang chuyên mục thể loại (/the-loai/)!`);

  // 4.6. Prerender A-Z Game Directory (/danh-sach-game-a-z)
  const azDir = path.join(distDir, 'danh-sach-game-a-z');
  if (!fs.existsSync(azDir)) fs.mkdirSync(azDir, { recursive: true });

  const sortedGames = [...games].filter(g => !GAME_CANONICAL_ALIASES[g.slug || g.id]).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
  const alphabetMap = new Map();

  for (const g of sortedGames) {
    const firstChar = (g.name || '').trim().charAt(0).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
    if (!alphabetMap.has(letter)) alphabetMap.set(letter, []);
    alphabetMap.get(letter).push(g);
  }

  const lettersList = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].filter((l) => alphabetMap.has(l));

  const azHtml = buildPageHtml({
    title: 'Danh Sách Tựa Game A-Z & Tra Cứu Giftcode Toàn Diện | CodeGame.shop',
    description: `Tra cứu danh bạ toàn bộ ${sortedGames.length} tựa game mobile và webgame theo bảng chữ cái A-Z. Cập nhật giftcode còn hạn, hướng dẫn nhập và bản quyền G1.`,
    canonicalPath: '/danh-sach-game-a-z',
    ogImage: 'https://codegame.shop/og-image.jpg',
    ogType: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Danh Sách Tựa Game A-Z - CodeGame.shop',
        description: `Danh bạ ${sortedGames.length} tựa game cập nhật giftcode mới nhất 2026.`,
        url: `${BASE_URL}/danh-sach-game-a-z`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Danh Sách Game A-Z', item: `${BASE_URL}/danh-sach-game-a-z` },
        ],
      },
    ],
    bodyContent: `
      <div class="min-h-screen flex flex-col bg-dark-950 text-gray-100 font-sans">
        <header class="site-header sticky top-0 z-40 w-full border-b border-gray-800/80 bg-dark-950/85 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
          <a href="/" class="header-logo flex items-center gap-2 text-brand-400 font-extrabold text-base sm:text-lg">
            <img src="/logo.png" alt="CodeGame.shop" width="32" height="32" class="w-8 h-8 rounded-lg object-cover" />
            <span class="text-white font-bold">CodeGame.Shop</span>
          </a>
          <nav class="header-nav-tabs hidden md:flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-bold text-gray-300">
            <a href="/" class="hover:text-white transition-colors">Trang Chủ</a>
            <a href="/danh-sach-game-a-z" class="text-brand-400 font-black">Danh Mục A-Z</a>
            <a href="/giveaways" class="hover:text-white transition-colors">Đợt Phát Code</a>
            <a href="/store" class="hover:text-white transition-colors">Chợ Code VIP</a>
          </nav>
        </header>

        <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <div class="p-6 sm:p-10 rounded-3xl bg-dark-900 border border-gray-800 text-center space-y-4">
            <div class="inline-block px-3.5 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold border border-brand-500/30">
              📚 Thư Viện Tra Cứu Game Toàn Diện
            </div>
            <h1 class="text-2xl sm:text-4xl font-black text-white">
              Danh Mục ${sortedGames.length} Tựa Game Theo Bảng Chữ Cái (A - Z)
            </h1>
            <p class="text-xs sm:text-sm text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Dễ dàng tra cứu thông tin giftcode, hướng dẫn nhập quà và số giấy phép G1 ABEI của tất cả các tựa game đang phát hành tại Việt Nam và quốc tế.
            </p>

            <!-- Alphabet Quick Anchor Jump -->
            <div class="pt-2 flex flex-wrap items-center justify-center gap-1.5 max-w-3xl mx-auto">
              ${lettersList.map((l) => `
                <a href="#letter-${l === '#' ? 'num' : l}" class="w-8 h-8 rounded-lg bg-dark-800 hover:bg-brand-600 hover:text-white text-xs font-bold flex items-center justify-center transition-all border border-gray-700/60">
                  ${l}
                </a>
              `).join('')}
            </div>
          </div>

          <!-- Grouped Sections -->
          <div class="space-y-8">
            ${lettersList.map((letter) => {
              const groupGames = alphabetMap.get(letter) || [];
              const anchorId = letter === '#' ? 'letter-num' : `letter-${letter}`;
              return `
              <section id="${anchorId}" class="scroll-mt-24 space-y-3">
                <div class="flex items-center gap-3 border-b border-gray-800 pb-2">
                  <span class="w-9 h-9 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30 font-black text-lg flex items-center justify-center">
                    ${letter}
                  </span>
                  <h2 class="text-base sm:text-lg font-bold text-white">
                    Ký tự ${letter} <span class="text-xs font-normal text-gray-400">(${groupGames.length} game)</span>
                  </h2>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  ${groupGames.map((g) => {
                    const gSlug = g.slug || g.id;
                    const gCover = g.cover_image_url || g.icon_url || `/game_icons/${gSlug}.webp`;
                    const gCluster = getClusterSlug(g.category);
                    return `
                    <div class="flex items-center gap-3 p-3 rounded-xl bg-dark-900 border border-gray-800 hover:border-brand-500/40 transition-all group">
                      <a href="/game/${escapeHtml(gSlug)}" class="shrink-0">
                        <img src="${escapeHtml(gCover)}" alt="${escapeHtml(g.name)}" loading="lazy" class="w-12 h-12 rounded-xl object-cover border border-gray-700/60 group-hover:scale-105 transition-transform" />
                      </a>
                      <div class="min-w-0 flex-1">
                        <a href="/game/${escapeHtml(gSlug)}" class="font-bold text-xs text-gray-100 group-hover:text-brand-400 line-clamp-1 block">
                          ${escapeHtml(g.name)}
                        </a>
                        <p class="text-[10px] text-gray-400 truncate mt-0.5">${escapeHtml(g.publisher || 'NPH Chính Thức')}</p>
                        <div class="flex items-center gap-1.5 mt-1">
                          <a href="/the-loai/${gCluster}" class="text-[9px] font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 hover:underline">
                            ${escapeHtml(g.category || 'Game Mobile')}
                          </a>
                        </div>
                      </div>
                    </div>`;
                  }).join('')}
                </div>
              </section>`;
            }).join('')}
          </div>
        </main>

        <footer class="mt-auto border-t border-gray-800/80 bg-dark-900/50 py-8 px-4 text-xs text-gray-400">
          <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p>© 2026 CodeGame.shop. Toàn bộ ${games.length}+ tựa game A-Z.</p>
            <div class="flex items-center gap-3 text-xs">
              <a href="#letter-${lettersList[0] === '#' ? 'num' : lettersList[0]}" class="text-brand-400 hover:underline">↑ Lên đầu trang</a>
              <span>•</span>
              <a href="/" class="hover:text-white">Trang Chủ</a>
            </div>
          </div>
        </footer>
      </div>
    `,
  });

  fs.writeFileSync(path.join(azDir, 'index.html'), azHtml, 'utf8');
  fs.writeFileSync(path.join(distDir, 'danh-sach-game-a-z.html'), azHtml, 'utf8');
  console.log(`[Prerender] Đã xuất bản trang Mục Lục Toàn Bộ Game A-Z (/danh-sach-game-a-z)!`);

  // 5. Generate Dynamic Sitemap.xml with 100% Canonical Games, News, and Giveaways
  const todayStr = new Date().toISOString().slice(0, 10);

  // Pre-index max code timestamps for authentic O(1) lastmod calculation
  const maxCodeTimeBySlug = new Map();
  let latestGlobalCodeTime = 0;
  for (const c of crawledCodes) {
    if (!c) continue;
    const cSlug = String(c.gameSlug || c.slug || c.gameId || '').toLowerCase().trim();
    if (c.added_at) {
      const t = new Date(c.added_at).getTime();
      if (!isNaN(t)) {
        if (t > latestGlobalCodeTime) latestGlobalCodeTime = t;
        const cur = maxCodeTimeBySlug.get(cSlug) || 0;
        if (t > cur) maxCodeTimeBySlug.set(cSlug, t);
      }
    }
  }

  let latestNewsTime = 0;
  newsArticles.forEach((a) => {
    const t = new Date(a.updated_at || a.published_at || a.created_at || '2026-10-13').getTime();
    if (!isNaN(t) && t > latestNewsTime) latestNewsTime = t;
  });

  let latestGwTime = 0;
  giveawaysList.forEach((gw) => {
    const t = new Date(gw.updated_at || gw.start_time || gw.created_at || '2026-10-25').getTime();
    if (!isNaN(t) && t > latestGwTime) latestGwTime = t;
  });

  const homeLastmod = latestGlobalCodeTime > 0 ? new Date(latestGlobalCodeTime).toISOString().slice(0, 10) : todayStr;
  const newsLastmod = latestNewsTime > 0 ? new Date(latestNewsTime).toISOString().slice(0, 10) : todayStr;
  const gwLastmod = latestGwTime > 0 ? new Date(latestGwTime).toISOString().slice(0, 10) : todayStr;

  const sitemapUrls = [
    { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily', lastmod: homeLastmod },
    { loc: `${BASE_URL}/danh-sach-game-a-z`, priority: '0.9', changefreq: 'daily', lastmod: todayStr },
    { loc: `${BASE_URL}/news`, priority: '0.9', changefreq: 'daily', lastmod: newsLastmod },
    { loc: `${BASE_URL}/giveaways`, priority: '0.9', changefreq: 'daily', lastmod: gwLastmod },
    { loc: `${BASE_URL}/store`, priority: '0.9', changefreq: 'daily', lastmod: '2026-10-27' },
    { loc: `${BASE_URL}/utilities`, priority: '0.9', changefreq: 'daily', lastmod: '2026-10-27' },
  ];

  // Add all Topic Clusters to sitemap
  TOPIC_CLUSTERS.forEach((c) => {
    sitemapUrls.push({
      loc: `${BASE_URL}/the-loai/${c.slug}`,
      priority: '0.85',
      changefreq: 'daily',
      lastmod: todayStr,
    });
  });

  // Add all canonical games (Excluding alias duplicates, preserving 0-code genuine ABEI games)
  games.forEach((g) => {
    const slug = g.slug || g.id;
    if (!slug || GAME_CANONICAL_ALIASES[slug]) {
      // Bỏ qua các slug bí danh để chỉ giữ duy nhất URL chuẩn trong sitemap
      return;
    }

    let maxTime = 0;
    if (g.updated_at) {
      const t = new Date(g.updated_at).getTime();
      if (!isNaN(t)) maxTime = Math.max(maxTime, t);
    }
    if (g.created_at) {
      const t = new Date(g.created_at).getTime();
      if (!isNaN(t)) maxTime = Math.max(maxTime, t);
    }

    const normSlug = String(slug).toLowerCase().trim();
    const cleanWithoutMobile = normSlug.replace(/-mobile$/i, '');
    const cleanId = String(g.id || '').toLowerCase().trim();

    const codeTime = Math.max(
      maxCodeTimeBySlug.get(normSlug) || 0,
      maxCodeTimeBySlug.get(cleanWithoutMobile) || 0,
      maxCodeTimeBySlug.get(cleanId) || 0
    );
    if (codeTime > 0) maxTime = Math.max(maxTime, codeTime);

    const lastmodDate = maxTime > 0
      ? new Date(maxTime).toISOString().slice(0, 10)
      : '2026-10-22';

    sitemapUrls.push({
      loc: `${BASE_URL}/game/${encodeURIComponent(slug)}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: lastmodDate,
    });
  });

  // Add all news articles with authentic lastmod
  newsArticles.forEach((a) => {
    const slug = a.slug || a.id;
    if (slug) {
      const artDate = (a.updated_at || a.published_at || a.created_at)
        ? new Date(a.updated_at || a.published_at || a.created_at).toISOString().slice(0, 10)
        : '2026-10-13';
      sitemapUrls.push({
        loc: `${BASE_URL}/news/${encodeURIComponent(slug)}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: artDate,
      });
    }
  });

  // Add all giveaways with authentic lastmod
  giveawaysList.forEach((gw) => {
    if (gw && gw.id) {
      const gwDate = (gw.updated_at || gw.start_time || gw.created_at)
        ? new Date(gw.updated_at || gw.start_time || gw.created_at).toISOString().slice(0, 10)
        : '2026-10-25';
      sitemapUrls.push({
        loc: `${BASE_URL}/giveaways/${encodeURIComponent(gw.id)}`,
        priority: '0.8',
        changefreq: 'daily',
        lastmod: gwDate,
      });
    }
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
  const publicDir = path.resolve(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');
  }
  console.log(`[Prerender] Đã xuất bản sitemap.xml với ${sitemapUrls.length} liên kết chuẩn SEO!`);

  console.log('[Prerender] TẤT CẢ 100% CÁC TRANG ĐÃ ĐƯỢC PRERENDER THÀNH CÔNG!');
}

runPrerender().catch((err) => {
  console.error('[Prerender] Lỗi:', err);
  process.exit(1);
});
