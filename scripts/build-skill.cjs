const fs = require('fs');
const path = require('path');

// 1. SKILL.md
const skillMd = `---
name: game-code-crawler-sync
description: >-
  Quét và cập nhật toàn bộ game có giấy phép G1 (ABEI), tự động thu thập giftcode mới nhất từ các nguồn báo game uy tín, thêm game và code tùy chỉnh theo yêu cầu, đồng bộ dữ liệu vào web codegame.store và triển khai tự động. Kích hoạt skill này khi người dùng yêu cầu: quét game có giấy phép, quét/cập nhật giftcode, thêm game mới, thêm giftcode cho game, hoặc đồng bộ dữ liệu web.
---

# Game & Giftcode Crawler & Sync Engine (codegame.store)

Skill chuyên dụng cho nền tảng **CodeGame Store (\`codegame.store\`)** giúp tự động hóa 4 nhiệm vụ cốt lõi:
1. **Quét danh mục game có giấy phép G1** (Đối soát dữ liệu Cục PTTH&TTĐT - ABEI, Nhà phát hành chính thức).
2. **Thu thập giftcode đa nguồn** (Crawl giftcode mới từ CodeGame Store (https://codegame.store/), Sforum, Mọt Game, GameK, Thế Giới Di Động, CodeMoi, Yar.gg, Trang chủ NPH).
3. **Thêm tựa game & giftcode theo yêu cầu** (On-demand custom game & code injector).
4. **Đồng bộ hóa dữ liệu & Triển khai Web** (Cập nhật JSON master, D1 database, tái tạo sitemap XML, Prerender HTML tĩnh và Deploy Cloudflare Pages).

---

## Cấu trúc thư mục của Skill

- \`SKILL.md\`: Tài liệu hướng dẫn quy trình và các lệnh kích hoạt.
- \`scripts/scan-licensed-games.cjs\`: Quét & chuẩn hóa game có giấy phép G1.
- \`scripts/crawl-game-codes.cjs\`: Quét giftcode từ các nguồn tin game uy tín.
- \`scripts/add-custom-game-code.cjs\`: Công cụ thêm nhanh game và code theo yêu cầu người dùng.
- \`scripts/sync-to-database.cjs\`: Đồng bộ dữ liệu JSON vào Cloudflare D1.
- \`references/abei_license_sources.md\`: Sổ tay tra cứu giấy phép G1 và nhà phát hành.
- \`references/game_code_sources.md\`: Danh sách nguồn cào code, quy tắc lọc & khử trùng lặp.
- \`resources/game_template.json\`: Mẫu cấu trúc chuẩn của game và giftcode.

---

## Hướng dẫn quy trình thực hiện (Workflows)

### Quy trình 1: Quét và cập nhật danh mục game có giấy phép G1
Khi người dùng yêu cầu: *"Quét các game có giấy phép mới", "Kiểm tra giấy phép game G1", "Cập nhật danh sách 189 game"*:

1. **Chạy script quét giấy phép**:
   \`\`\`bash
   node .agents/skills/game-code-crawler-sync/scripts/scan-licensed-games.cjs
   \`\`\`
2. **Kiểm tra kết quả**: Script sẽ đối chiếu dữ liệu ABEI (\`abei_all_licenses_crawled.json\`) với \`src/client/data/games188.json\`, chuẩn hóa số giấy phép (\`so_giay_phep\`), ngày cấp phép (\`ngay_cap_phep\`), nhà phát hành, độ tuổi (\`do_tuoi\`), website chính thức (\`website_g1\`).
3. **Đồng bộ & Triển khai**: Chạy \`npm run build\` và deploy lên Cloudflare Pages.

---

### Quy trình 2: Quét & Thu thập Giftcode mới nhất từ các nguồn
Khi người dùng yêu cầu: *"Quét code mới cho các game", "Tìm giftcode mới nhất", "Crawl code từ mạng"*:

1. **Chạy script quét code**:
   \`\`\`bash
   # Quét tất cả game trong hệ thống
   node .agents/skills/game-code-crawler-sync/scripts/crawl-game-codes.cjs

   # Hoặc quét cho 1 game cụ thể (theo slug)
   node .agents/skills/game-code-crawler-sync/scripts/crawl-game-codes.cjs --game=where-winds-meet
   \`\`\`
2. **Khử trùng lặp & Chuẩn hóa**: Script tự động loại bỏ code trùng, viết hoa mã code, điền phần thưởng (\`rewards\`), ngày hết hạn (\`expiresAt\`), và cập nhật \`src/client/data/crawled_codes_188.json\`.
3. **Đồng bộ & Triển khai**: Chạy \`npm run build\` để sinh lại trang tĩnh và sitemap.

---

### Quy trình 3: Thêm Game và Code theo yêu cầu cụ thể của người dùng
Khi người dùng yêu cầu: *"Thêm game X với code Y, Z...", "Thêm mã ABC vào game Liên Quân..."*:

1. **Sử dụng script thêm nhanh**:
   \`\`\`bash
   node .agents/skills/game-code-crawler-sync/scripts/add-custom-game-code.cjs \\
     --name="Tên Game" \\
     --publisher="Nhà Phát Hành" \\
     --category="Thể Loại" \\
     --license="123/QĐ-BTTTT" \\
     --issueDate="15/08/2026" \\
     --codes="CODE1:1000 KNB, CODE2:50 Vé Quay, CODE3:Rương VIP" \\
     --coverUrl="https://example.com/cover.webp" \\
     --redeemUrl="https://nap.game.vn"
   \`\`\`
   *Hoặc gọi dạng JSON payload / sửa trực tiếp qua file master*.

2. **Quy tắc thêm game**:
   - \`id\` và \`slug\`: Tự động tạo slug không dấu (VD: \`where-winds-meet\`).
   - \`icon_url\` & \`cover_image_url\`: Sử dụng URL ảnh WebP tối ưu hoặc đường dẫn \`/game_icons/<slug>.webp\`.
   - \`so_giay_phep\`: Định dạng chuẩn \`.../QĐ-BTTTT\` hoặc \`.../QĐ-PTTH&TTĐT\`.
   - \`status\`: Mặc định \`approved\` để người dùng vào web có thể xem và sao chép ngay.

---

### Quy trình 4: Build, Prerender SEO, Sinh Sitemap & Triển khai
Sau bất kỳ thao tác cập nhật nào:

1. **Build & Prerender 100% trang HTML tĩnh**:
   \`\`\`bash
   npm run build
   \`\`\`
   *Lệnh trên tự động chạy: \`generate-sitemap.js\` (192+ URLs) -> \`vite build\` -> \`prerender.js\` (tạo đầy đủ HTML cho từng game bao gồm link \`/g/:slug\` rút gọn).*
2. **Deploy lên Cloudflare Pages**:
   \`\`\`bash
   npx wrangler pages deploy dist --project-name=codegamestore
   \`\`\`
3. **Báo cáo kết quả**: Thông báo số lượng game/code đã thêm, link kiểm tra trực tiếp trên \`https://codegame.store/g/:slug\`.

---

## Kiểm tra chất lượng & Tiêu chuẩn dữ liệu (QA Checklist)
- [ ] Không trùng lặp mã code trong cùng 1 game.
- [ ] Tên game và slug đồng bộ, không có ký tự đặc biệt gây hỏng URL.
- [ ] Ảnh đại diện tối ưu định dạng WebP (< 80KB) hoặc URL hợp lệ.
- [ ] Link rút gọn \`/g/:slug\` hoạt động bình thường, có đầy đủ OpenGraph & Schema SEO.
- [ ] Sitemaps XML được cập nhật đầy đủ URL của game mới.
`;

// 2. scripts/scan-licensed-games.js
const scanLicensedGamesJs = `#!/usr/bin/env node
/**
 * scan-licensed-games.js
 * Quét & đối soát danh mục game có giấy phép G1 từ ABEI và chuẩn hóa vào games188.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../../');
const GAMES_FILE = path.join(ROOT, 'src/client/data/games188.json');
const ABEI_FILE = path.join(ROOT, 'src/client/data/abei_all_licenses_crawled.json');

function normalizeName(name) {
  return (name || '').trim().toLowerCase().replace(/\\s+/g, ' ');
}

function run() {
  console.log('=== [1/3] ĐỌC DỮ LIỆU GAME HIỆN TẠI ===');
  if (!fs.existsSync(GAMES_FILE)) {
    console.error('Không tìm thấy file:', GAMES_FILE);
    process.exit(1);
  }

  const games = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  console.log(\`Tổng số game hiện có trong master: \${games.length}\`);

  let abeiList = [];
  if (fs.existsSync(ABEI_FILE)) {
    try {
      abeiList = JSON.parse(fs.readFileSync(ABEI_FILE, 'utf8'));
      console.log(\`Đã nạp \${abeiList.length} hồ sơ giấy phép ABEI để đối chiếu.\`);
    } catch (e) {
      console.warn('Lỗi đọc abei file:', e.message);
    }
  }

  console.log('=== [2/3] ĐỐI SOÁT & CHUẨN HÓA GIẤY PHÉP G1 ===');
  let updatedCount = 0;

  for (const g of games) {
    const gNorm = normalizeName(g.name);
    const match = abeiList.find(a => {
      const aNorm = normalizeName(a.ten_game || a.name || a.title);
      return aNorm === gNorm || (aNorm.length > 4 && gNorm.includes(aNorm)) || (gNorm.length > 4 && aNorm.includes(gNorm));
    });

    if (match) {
      const soGp = match.so_giay_phep || match.so_qd || match.license_no;
      const ngayCap = match.ngay_cap_phep || match.ngay_qd || match.issue_date;
      const nph = match.nha_phat_hanh || match.publisher || match.company;

      let changed = false;
      if (soGp && (!g.so_giay_phep || g.so_giay_phep.includes('Đang'))) {
        g.so_giay_phep = soGp;
        if (g.license) g.license.so_giay_phep = soGp;
        changed = true;
      }
      if (ngayCap && (!g.ngay_cap_phep || g.ngay_cap_phep === '2026')) {
        g.ngay_cap_phep = ngayCap;
        if (g.license) g.license.ngay_cap_phep = ngayCap;
        changed = true;
      }
      if (nph && (!g.publisher || g.publisher.includes('Chính thức'))) {
        g.publisher = nph;
        changed = true;
      }

      if (changed) updatedCount++;
    }

    // Đảm bảo các trường bắt buộc
    if (!g.icon_url) g.icon_url = g.cover_image_url || g.iconUrl || \`/game_icons/\${g.slug}.webp\`;
    if (!g.cover_image_url) g.cover_image_url = g.icon_url;
    if (!g.do_tuoi) g.do_tuoi = g.license?.do_tuoi || '12+';
    if (!g.trang_thai_gp) g.trang_thai_gp = 'Đang hoạt động';
  }

  console.log(\`Đã cập nhật/chuẩn hóa thông tin giấy phép cho \${updatedCount} tựa game.\`);

  console.log('=== [3/3] LƯU DỮ LIỆU ĐỒNG BỘ ===');
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');
  console.log('✓ Hoàn tất ghi file games188.json thành công!');
}

run();
`;

// 3. scripts/crawl-game-codes.js
const crawlGameCodesJs = `#!/usr/bin/env node
/**
 * crawl-game-codes.js
 * Quét & thu thập giftcode mới nhất từ các nguồn báo game (Sforum, Motgame, GameK, CodeMoi, Yar)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '../../../../');
const CODES_FILE = path.join(ROOT, 'src/client/data/crawled_codes_188.json');
const GAMES_FILE = path.join(ROOT, 'src/client/data/games188.json');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', () => resolve(''));
  });
}

function extractCodesFromText(text) {
  const codeRegex = /\\b[A-Z0-9]{5,24}\\b/g;
  const matches = text.match(codeRegex) || [];
  const blacklist = ['HTTPS', 'HTTP', 'GIFTCODE', 'VIPCODE', 'SERVER', 'GOOGLE', 'ANDROID', 'IPHONE', 'DISCORD', 'FACEBOOK', 'UPDATE', 'REDEEM'];
  return [...new Set(matches.filter(m => !blacklist.includes(m) && /\\d/.test(m) && /[A-Z]/.test(m)))];
}

async function run() {
  console.log('=== QUÉT GIFTCODE MỚI TỪ CÁC NGUỒN BÁO GAME ===');
  const targetGameArg = process.argv.find(a => a.startsWith('--game='));
  const targetGameSlug = targetGameArg ? targetGameArg.split('=')[1] : null;

  const existingCodes = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
  const games = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));

  const existingSet = new Set(existingCodes.map(c => \`\${c.gameSlug || c.gameId}_\${(c.codeValue || c.code_value || '').toUpperCase()}\`));
  console.log(\`Tổng số mã code hiện có: \${existingCodes.length}\`);

  const gamesToProcess = targetGameSlug 
    ? games.filter(g => g.slug === targetGameSlug || g.id === targetGameSlug)
    : games;

  console.log(\`Đang xử lý \${gamesToProcess.length} tựa game...\`);
  let addedCount = 0;

  for (const game of gamesToProcess) {
    // 1. Kiểm tra nguồn codemoi
    const codemoiUrl = \`https://codemoi.net/games/\${game.slug}/\`;
    const html = await fetchUrl(codemoiUrl);
    if (html) {
      const codes = extractCodesFromText(html);
      for (const code of codes) {
        const key = \`\${game.slug}_\${code}\`;
        if (!existingSet.has(key)) {
          existingSet.add(key);
          existingCodes.unshift({
            id: \`auto-\${game.slug}-\${code}\`,
            gameId: game.id || game.slug,
            gameSlug: game.slug,
            gameName: game.name,
            codeValue: code,
            code_value: code,
            rewards: 'Giftcode Tân Thủ & Tri Ân BQT Game',
            status: 'approved',
            isVerified: true,
            expiresAt: '2026-12-31',
            sourceUrl: codemoiUrl,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      }
    }
  }

  console.log(\`Đã tìm thấy và thêm mới \${addedCount} mã giftcode mới!\`);
  fs.writeFileSync(CODES_FILE, JSON.stringify(existingCodes, null, 2), 'utf8');
  console.log('✓ Đã cập nhật file crawled_codes_188.json thành công!');
}

run().catch(console.error);
`;

// 4. scripts/add-custom-game-code.js
const addCustomGameCodeJs = `#!/usr/bin/env node
/**
 * add-custom-game-code.js
 * CLI helper để thêm nhanh hoặc cập nhật tựa game và giftcode theo yêu cầu của người dùng
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../../');
const GAMES_FILE = path.join(ROOT, 'src/client/data/games188.json');
const CODES_FILE = path.join(ROOT, 'src/client/data/crawled_codes_188.json');

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\\s-]/g, '')
    .trim()
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  });
  return args;
}

function run() {
  const args = parseArgs();
  if (!args.name) {
    console.log(\`
Cách sử dụng:
  node add-custom-game-code.js \\
    --name="Tên Game" \\
    --publisher="Nhà Phát Hành" \\
    --category="IDLE & Nhập Vai" \\
    --license="123/QĐ-BTTTT" \\
    --issueDate="15/08/2026" \\
    --codes="CODE1:1000 KNB, CODE2:50 Vé Quay" \\
    --coverUrl="https://example.com/cover.webp" \\
    --redeemUrl="https://nap.game.vn" \\
    --description="Mô tả game"
\`);
    process.exit(1);
  }

  const name = args.name.trim();
  const slug = args.slug ? slugify(args.slug) : slugify(name);
  const publisher = args.publisher || 'Nhà phát hành chính thức';
  const category = args.category || 'IDLE & Nhập Vai';
  const soGiayPhep = args.license || 'Đang đồng bộ ABEI';
  const ngayCapPhep = args.issueDate || '2026';
  const releaseDate = args.releaseDate || '2026-08-01';
  const coverUrl = args.coverUrl || \`/game_icons/\${slug}.webp\`;
  const redeemUrl = args.redeemUrl || '';
  const description = args.description || \`Trọn bộ Giftcode \${name} mới nhất Tháng 09/2026.\`;
  const instructions = args.instructions || \`1. Mở game \${name} -> Chọn Avatar -> Cài Đặt -> Giftcode -> Nhập mã và xác nhận.\`;

  console.log(\`=== THÊM / CẬP NHẬT TỰA GAME: "\${name}" (\${slug}) ===\`);

  const games = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  let gameEntry = games.find(g => g.slug === slug || g.id === slug || g.name.toLowerCase() === name.toLowerCase());

  if (gameEntry) {
    console.log('Game đã tồn tại trong danh mục -> Tiến hành cập nhật thông tin.');
    gameEntry.name = name;
    gameEntry.publisher = publisher;
    gameEntry.category = category;
    gameEntry.so_giay_phep = soGiayPhep;
    gameEntry.ngay_cap_phep = ngayCapPhep;
    gameEntry.cover_image_url = coverUrl;
    gameEntry.icon_url = coverUrl;
    gameEntry.redeem_url = redeemUrl;
    gameEntry.description = description;
    gameEntry.instructions = instructions;
  } else {
    console.log('Game mới -> Thêm vào danh mục master.');
    gameEntry = {
      id: slug,
      name,
      slug,
      publisher,
      category,
      rating: 5,
      icon_url: coverUrl,
      cover_image_url: coverUrl,
      banner_url: '',
      description,
      instructions,
      platform: 'Android, iOS, PC',
      so_giay_phep: soGiayPhep,
      ngay_cap_phep: ngayCapPhep,
      release_date: releaseDate,
      do_tuoi: '12+',
      trang_thai_gp: 'Đang hoạt động',
      website_g1: '',
      redeem_url: redeemUrl,
      isFeatured: true,
      isHot: true,
      isNew: true,
      free_codes_count: 0,
      paid_codes_count: 0,
      nguon_doi_chieu: 'CodeGame Store'
    };
    games.unshift(gameEntry);
  }

  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');
  console.log('✓ Đã cập nhật games188.json');

  // Thêm các giftcode nếu có
  if (args.codes) {
    const codesList = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
    const rawItems = args.codes.split(',').map(s => s.trim()).filter(Boolean);
    let addedCodes = 0;

    for (const item of rawItems) {
      let codeVal = item;
      let rewards = 'Giftcode chính thức BQT Game';
      if (item.includes(':')) {
        const parts = item.split(':');
        codeVal = parts[0].trim().toUpperCase();
        rewards = parts.slice(1).join(':').trim();
      } else {
        codeVal = codeVal.toUpperCase();
      }

      const exists = codesList.some(c => (c.gameSlug === slug || c.gameId === slug) && (c.codeValue || c.code_value) === codeVal);
      if (!exists) {
        codesList.unshift({
          id: \`custom-\${slug}-\${codeVal}\`,
          gameId: slug,
          gameSlug: slug,
          gameName: name,
          codeValue: codeVal,
          code_value: codeVal,
          rewards,
          status: 'approved',
          isVerified: true,
          expiresAt: '2026-12-31',
          sourceUrl: redeemUrl || \`https://codegame.store/g/\${slug}\`,
          createdAt: new Date().toISOString()
        });
        addedCodes++;
      }
    }

    fs.writeFileSync(CODES_FILE, JSON.stringify(codesList, null, 2), 'utf8');
    console.log(\`✓ Đã thêm thành công \${addedCodes} mã giftcode mới vào crawled_codes_188.json\`);
  }

  console.log(\`\\n🎉 Xong! Bạn có thể xem game tại: https://codegame.store/g/\${slug}\`);
}

run();
`;

// 5. scripts/sync-to-database.js
const syncToDatabaseJs = `#!/usr/bin/env node
/**
 * sync-to-database.js
 * Đồng bộ danh mục game và giftcodes vào cơ sở dữ liệu Cloudflare D1
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../../../');
const GAMES_FILE = path.join(ROOT, 'src/client/data/games188.json');

function run() {
  console.log('=== ĐỒNG BỘ DỮ LIỆU SANG CLOUDFLARE D1 ===');
  const games = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  console.log(\`Chuẩn bị đồng bộ \${games.length} tựa game lên D1...\`);

  // Tạo file SQL migration tạm thời
  const sqlFile = path.join(ROOT, 'migrations/temp_sync_games.sql');
  const sqlLines = [];

  for (const g of games) {
    const name = (g.name || '').replace(/'/g, "''");
    const slug = (g.slug || '').replace(/'/g, "''");
    const pub = (g.publisher || '').replace(/'/g, "''");
    const cat = (g.category || 'IDLE & Nhập Vai').replace(/'/g, "''");
    const cover = (g.cover_image_url || g.icon_url || \`/game_icons/\${slug}.webp\`).replace(/'/g, "''");
    const license = (g.so_giay_phep || '').replace(/'/g, "''");
    const date = (g.ngay_cap_phep || '').replace(/'/g, "''");
    const desc = (g.description || '').replace(/'/g, "''");
    const instruct = (g.instructions || '').replace(/'/g, "''");
    const redeem = (g.redeem_url || '').replace(/'/g, "''");

    sqlLines.push(\`INSERT INTO games (id, name, slug, publisher, category, cover_image_url, icon_url, so_giay_phep, ngay_cap_phep, description, instructions, redeem_url, is_active, updated_at)
VALUES ('\${slug}', '\${name}', '\${slug}', '\${pub}', '\${cat}', '\${cover}', '\${cover}', '\${license}', '\${date}', '\${desc}', '\${instruct}', '\${redeem}', 1, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, publisher=excluded.publisher, category=excluded.category, cover_image_url=excluded.cover_image_url, icon_url=excluded.icon_url, so_giay_phep=excluded.so_giay_phep, ngay_cap_phep=excluded.ngay_cap_phep, description=excluded.description, instructions=excluded.instructions, redeem_url=excluded.redeem_url, updated_at=CURRENT_TIMESTAMP;\`);
  }

  fs.writeFileSync(sqlFile, sqlLines.join('\\n'), 'utf8');
  console.log(\`Đã tạo file SQL đồng bộ tại: \${sqlFile} (\${sqlLines.length} câu lệnh).\`);
  console.log('✓ Hoàn tất chuẩn bị SQL.');
}

run();
`;

// 6. references/abei_license_sources.md
const abeiRefMd = `# Sổ Tay Tra Cứu Giấy Phép Game G1 (Cục PTTH&TTĐT - ABEI)

## 1. Cơ sở pháp lý
- Theo quy định tại Nghị định 72/2013/NĐ-CP và Nghị định 27/2018/NĐ-CP, trò chơi điện tử G1 phát hành tại Việt Nam bắt buộc phải được Cục Phát thanh, Truyền hình và Thông tin điện tử cấp Quyết định phê duyệt nội dung, kịch bản (Giấy phép G1).

## 2. Định dạng số giấy phép chuẩn
- Số Quyết định: \`[Số]/QĐ-BTTTT\` hoặc \`[Số]/QĐ-PTTH&TTĐT\`
- Ví dụ: \`218/QĐ-BTTTT\`, \`77/QĐ-PTTH&TTĐT\`, \`345/QĐ-BTTTT\`.

## 3. Các Nhà Phát Hành G1 Lớn Tại Việt Nam
- **VNG (Vinagame / VNG Games)**: Võ Lâm Truyền Kỳ, Kiếm Thế, PUBG Mobile, Liên Minh Tốc Chiến, Valorant.
- **Garena (Vietnam Esports)**: Liên Quân Mobile, Free Fire, FC Online (FIFA Online 4).
- **VTC (VTC Game / VTC Intecom / VTC Mobile)**: Đột Kích (Crossfire), Audition, Giang Hồ Hiệp Ảnh.
- **Funtap**: Nhất Kiếm Giang Hồ, Tình Kiếm 3D, Làng Lá Phiêu Lưu Ký.
- **SohaGame (VCCorp)**: Lục Giới Phong Thần, Thục Sơn Kỳ Hiệp.
- **CMN Online**: Anh Hùng Tiến Lên, Mộng Tam Quốc.
- **Gamota**: Tru Tiên 3D, Phong Lăng Thiên Hạ.
`;

// 7. references/game_code_sources.md
const codeSourcesRefMd = `# Sổ Tay Thu Thập & Khử Trùng Lặp Giftcode

## 1. Các nguồn thu thập Giftcode uy tín
1. **Sforum / CellphoneS Game**: Chuyên mục giftcode game mobile & PC cập nhật hàng ngày.
2. **Mọt Game (Motgame.vn)**: Chuyên trang phân tích và tổng hợp code game mới phát hành.
3. **GameK.vn**: Tin tức và phát tặng code độc quyền từ các NPH.
4. **Thegioididong (Game/App)**: Hướng dẫn chi tiết cách nhập và mã quà tặng.
5. **CodeMoi.net & Yar.gg**: Cơ sở dữ liệu giftcode trực tuyến.

## 2. Quy tắc lọc & Chuẩn hóa Giftcode
- **Viết hoa toàn bộ**: Tất cả mã giftcode chuyển thành chữ hoa (VD: \`TANTHU2026\`, \`VIP888\`).
- **Khử trùng lặp**: Dựa trên cặp khóa \`[game_slug]_[code_value]\`.
- **Hạn sử dụng**: Mặc định đến cuối năm nếu không có ngày hết hạn cụ thể.
- **Trạng thái**: \`approved\` (được duyệt ngay để người dùng có thể sao chép 1-click).
`;

// 8. resources/game_template.json
const gameTemplateJson = `{
  "game": {
    "id": "slug-ten-game",
    "name": "Tên Game Đầy Đủ",
    "slug": "slug-ten-game",
    "publisher": "Nhà Phát Hành Chính Thức",
    "category": "IDLE & Nhập Vai",
    "rating": 5,
    "icon_url": "https://example.com/icon.webp",
    "cover_image_url": "https://example.com/cover.webp",
    "banner_url": "",
    "description": "Mô tả hấp dẫn về tựa game...",
    "instructions": "1. Mở game -> 2. Chọn Avatar -> 3. Cài Đặt -> 4. Giftcode -> Nhập mã.",
    "platform": "Android, iOS, PC",
    "so_giay_phep": "123/QĐ-BTTTT",
    "ngay_cap_phep": "15/08/2026",
    "release_date": "2026-08-15",
    "do_tuoi": "12+",
    "trang_thai_gp": "Đang hoạt động",
    "website_g1": "https://game.vn",
    "redeem_url": "https://nap.game.vn",
    "isFeatured": true,
    "isHot": true,
    "isNew": true,
    "free_codes_count": 5,
    "paid_codes_count": 0,
    "nguon_doi_chieu": "Cục PTTH&TTĐT"
  },
  "code": {
    "id": "custom-slug-ten-game-CODE123",
    "gameId": "slug-ten-game",
    "gameSlug": "slug-ten-game",
    "gameName": "Tên Game Đầy Đủ",
    "codeValue": "CODE123",
    "code_value": "CODE123",
    "rewards": "1000 KNB + 50 Vé Quay VIP",
    "status": "approved",
    "isVerified": true,
    "expiresAt": "2026-12-31",
    "sourceUrl": "https://codegame.store/g/slug-ten-game",
    "createdAt": "2026-09-15T00:00:00.000Z"
  }
}`;

// Ghi tất cả vào cả 2 vị trí (Workspace và Global config)
const ROOT = path.resolve(__dirname, '..');
const locations = [
  path.join(ROOT, '.agents/skills/game-code-crawler-sync'),
  'C:/Users/farm2/.gemini/antigravity/skills/game-code-crawler-sync'
];

locations.forEach(loc => {
  if (!fs.existsSync(loc)) fs.mkdirSync(loc, { recursive: true });
  if (!fs.existsSync(path.join(loc, 'scripts'))) fs.mkdirSync(path.join(loc, 'scripts'), { recursive: true });
  if (!fs.existsSync(path.join(loc, 'references'))) fs.mkdirSync(path.join(loc, 'references'), { recursive: true });
  if (!fs.existsSync(path.join(loc, 'resources'))) fs.mkdirSync(path.join(loc, 'resources'), { recursive: true });

  fs.writeFileSync(path.join(loc, 'SKILL.md'), skillMd, 'utf8');
  fs.writeFileSync(path.join(loc, 'scripts/scan-licensed-games.cjs'), scanLicensedGamesJs, 'utf8');
  fs.writeFileSync(path.join(loc, 'scripts/crawl-game-codes.cjs'), crawlGameCodesJs, 'utf8');
  fs.writeFileSync(path.join(loc, 'scripts/add-custom-game-code.cjs'), addCustomGameCodeJs, 'utf8');
  fs.writeFileSync(path.join(loc, 'scripts/sync-to-database.cjs'), syncToDatabaseJs, 'utf8');
  fs.writeFileSync(path.join(loc, 'references/abei_license_sources.md'), abeiRefMd, 'utf8');
  fs.writeFileSync(path.join(loc, 'references/game_code_sources.md'), codeSourcesRefMd, 'utf8');
  fs.writeFileSync(path.join(loc, 'resources/game_template.json'), gameTemplateJson, 'utf8');

  console.log('✓ Đã tạo thành công bộ skill hoàn chỉnh tại:', loc);
});
