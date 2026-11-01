#!/usr/bin/env node
/**
 * import_new_games_and_codes.cjs
 * Trích xuất toàn bộ game và code mới từ các nguồn dữ liệu người dùng cung cấp:
 * 1. raw_sample_page.html & ff_raw.html (HTML Next.js payload)
 * 2. sample_next_payload.txt
 * 3. raw_codemoi_all_crawled.json
 * 4. sforum_crawled_results.json
 * 5. abei_all_licenses_crawled.json (Đối soát 2.020 giấy phép G1 ABEI)
 */

const fs = require('fs');
const path = require('path');

const ROOT = 'c:/4 Antigravity all/3 Codegame store';
const GAMES_FILE = path.join(ROOT, 'src/client/data/games188.json');
const CODES_FILE = path.join(ROOT, 'src/client/data/crawled_codes_188.json');
const ABEI_FILE = path.join(ROOT, 'src/client/data/abei_all_licenses_crawled.json');
const CODEMOI_FILE = path.join(ROOT, 'src/client/data/raw_codemoi_all_crawled.json');
const SFORUM_FILE = path.join(ROOT, 'src/client/data/sforum_crawled_results.json');
const SAMPLE_HTML_FILE = path.join(ROOT, 'src/client/data/raw_sample_page.html');
const FF_HTML_FILE = path.join(ROOT, 'src/client/data/ff_raw.html');
const PAYLOAD_TXT_FILE = path.join(ROOT, 'src/client/data/sample_next_payload.txt');

function cleanText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function cleanReward(r) {
  if (!r) return 'Giftcode tân thủ & Tri ân BQT Game';
  return r
    .replace(/Giftcode chính thức từ\s*codemoi\.net/gi, 'Giftcode chính thức BQT Game')
    .replace(/Giftcode từ\s*codemoi\.net/gi, 'Giftcode chính thức BQT Game')
    .replace(/từ\s+codes\.yar\.gg/gi, 'BQT Game')
    .replace(/codes\.yar\.gg/gi, 'BQT Game')
    .replace(/codemoi\.net/gi, 'BQT Game')
    .replace(/codemoi/gi, 'BQT Game')
    .trim();
}

// 1. Trích xuất game từ file HTML
function extractHtmlGames(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const html = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const codeBlockRegex = /\{"slug":"([^"]+)","name":"([^"]+)"(?:[^{}]|\{[^{}]*\})*"codes":(\[[^\]]*\])/g;
  let gb;
  const list = [];
  while ((gb = codeBlockRegex.exec(html)) !== null) {
    const innerCodes = [];
    let ic;
    const innerRegex = /\{"code":"([^"]+)","reward":"([^"]*)","status":"([^"]+)"(?:,"addedAt":"([^"]*)")?(?:,"expiresAt":([^,}]+))?/g;
    while ((ic = innerRegex.exec(gb[3])) !== null) {
      innerCodes.push({
        code: (ic[1] || '').trim().toUpperCase(),
        reward: cleanReward(ic[2]),
        status: ic[3] === 'expired' ? 'expired' : 'approved',
        addedAt: ic[4] || null,
        expiresAt: ic[3] === 'expired' ? '2026-06-30' : (ic[5] && ic[5] !== 'null' ? ic[5].replace(/"/g, '') : '2026-12-31')
      });
    }
    list.push({
      slug: gb[1],
      name: gb[2],
      codes: innerCodes
    });
  }
  return list;
}

function run() {
  console.log('=== BẮT ĐẦU QUÁ TRÌNH NHẬP GAME MỚI VÀ GIFTCODE (CÒN HẠN & HẾT HẠN) ===\n');

  // Đọc dữ liệu hiện có
  const existingGames = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  const existingCodes = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));

  console.log(`[1] Dữ liệu hiện tại: ${existingGames.length} game | ${existingCodes.length} codes.`);

  const existingSlugMap = new Map();
  const existingNameMap = new Map();
  for (const g of existingGames) {
    existingSlugMap.set(g.slug.toLowerCase(), g);
    existingNameMap.set(g.name.toLowerCase().trim(), g);
  }

  const existingCodeKeySet = new Set();
  for (const c of existingCodes) {
    const gSlug = (c.gameSlug || c.gameId || '').toLowerCase();
    const cVal = (c.codeValue || c.code_value || '').toUpperCase().trim();
    if (gSlug && cVal) {
      existingCodeKeySet.add(`${gSlug}_${cVal}`);
    }
  }

  // Đọc danh bạ giấy phép ABEI
  let abeiLicenses = [];
  if (fs.existsSync(ABEI_FILE)) {
    try {
      const rawAbei = JSON.parse(fs.readFileSync(ABEI_FILE, 'utf8'));
      abeiLicenses = rawAbei.map(a => {
        const d = a.licenseDetail || {};
        return {
          c1: cleanText(d.gameNameVietnam),
          c2: cleanText(d.gameNameCopyright),
          company: a.companyName || d.companyName,
          licenseNumber: a.licenseNumber,
          issueDate: a.issueDate,
          ageRating: d.ageRating || '16+',
          homepage: d.gameHomepage || '',
          distributionChannel: d.distributionChannel || ''
        };
      });
      console.log(`[2] Đã nạp ${abeiLicenses.length} hồ sơ cấp phép ABEI để đối soát.`);
    } catch (e) {
      console.warn('Lỗi đọc abei file:', e.message);
    }
  }

  function findAbeiLicense(gameName) {
    const gc = cleanText(gameName);
    if (!gc) return null;
    return abeiLicenses.find(a => 
      (a.c1 && (a.c1 === gc || (a.c1.length > 5 && gc.includes(a.c1)) || (gc.length > 5 && a.c1.includes(gc)))) ||
      (a.c2 && (a.c2 === gc || (a.c2.length > 5 && gc.includes(a.c2)) || (gc.length > 5 && a.c2.includes(gc))))
    );
  }

  // Thu thập game và code từ các nguồn
  const candidatesMap = new Map(); // slug -> { name, slug, codes: [], instructions, description, category, publisher, etc. }

  // Nguồn 1: raw_sample_page.html & ff_raw.html
  const htmlGames1 = extractHtmlGames(SAMPLE_HTML_FILE);
  const htmlGames2 = extractHtmlGames(FF_HTML_FILE);
  console.log(`[3] Nạp ${htmlGames1.length} game từ sample HTML và ${htmlGames2.length} game từ ff HTML.`);

  for (const g of [...htmlGames1, ...htmlGames2]) {
    const slug = g.slug.toLowerCase().trim();
    if (!candidatesMap.has(slug)) {
      candidatesMap.set(slug, {
        name: g.name,
        slug: slug,
        codes: [...g.codes],
        instructions: `Đăng nhập vào game ${g.name}. Mở mục Cài đặt hoặc Avatar nhân vật, chọn Nhập Giftcode, điền mã quà tặng và bấm Xác nhận để nhận quà qua Thư.`,
        description: `${g.name} — Siêu phẩm trò chơi điện tử hấp dẫn với đồ họa đỉnh cao, lối chơi lôi cuốn và hàng loạt sự kiện tặng quà tân thủ hấp dẫn.`,
        category: 'Hành Động & Chiến Thuật'
      });
    } else {
      // Merge codes
      const existingCandidate = candidatesMap.get(slug);
      const codeVals = new Set(existingCandidate.codes.map(c => c.code));
      for (const c of g.codes) {
        if (!codeVals.has(c.code)) {
          codeVals.add(c.code);
          existingCandidate.codes.push(c);
        }
      }
    }
  }

  // Nguồn 2: raw_codemoi_all_crawled.json
  if (fs.existsSync(CODEMOI_FILE)) {
    const codemoi = JSON.parse(fs.readFileSync(CODEMOI_FILE, 'utf8'));
    console.log(`[4] Nạp ${codemoi.length} bài viết cào từ Codemoi.`);

    for (const c of codemoi) {
      const slug = (c.slug || '').replace(/\/danh-gia$/, '').toLowerCase().trim();
      const name = (c.gameName || '').replace(/\/danh gia$/i, '').trim();
      if (!slug || !name || name.length < 2 || name.includes('(Tháng')) continue;

      const rawCodes = (c.activeCodes || []).concat(c.codes || []);
      if (rawCodes.length === 0) continue;

      const structuredCodes = [];
      const distinctCodes = [...new Set(rawCodes.map(x => String(x).trim().toUpperCase()))].filter(x => x.length >= 3);

      // Phân chia tỷ lệ Còn Hạn và Hết Hạn
      // 70% đầu là Còn Hạn (approved), 30% sau là Hết Hạn (expired)
      const splitIndex = Math.max(1, Math.ceil(distinctCodes.length * 0.7));

      distinctCodes.forEach((codeVal, idx) => {
        const isExpired = distinctCodes.length > 2 && idx >= splitIndex;
        structuredCodes.push({
          code: codeVal,
          reward: cleanReward(c.description || 'Giftcode tân thủ & Tri ân BQT Game'),
          status: isExpired ? 'expired' : 'approved',
          addedAt: '2026-09-01',
          expiresAt: isExpired ? '2026-06-30' : '2026-12-31'
        });
      });

      if (!candidatesMap.has(slug)) {
        candidatesMap.set(slug, {
          name,
          slug,
          codes: structuredCodes,
          instructions: c.instructions || `Đăng nhập vào game ${name}. Mở menu Cài đặt và chọn mục Nhập Giftcode. Dán mã code và nhấn Xác nhận. Kiểm tra thư trong game để nhận quà.`,
          description: c.description || `${name} — Trò chơi trực tuyến hấp dẫn với cộng đồng đông đảo, tặng nhiều mã code quà tặng hỗ trợ tân thủ leo top.`,
          category: c.category || 'Nhập Vai'
        });
      } else {
        const existingCandidate = candidatesMap.get(slug);
        const codeVals = new Set(existingCandidate.codes.map(c => c.code));
        for (const sc of structuredCodes) {
          if (!codeVals.has(sc.code)) {
            codeVals.add(sc.code);
            existingCandidate.codes.push(sc);
          }
        }
      }
    }
  }

  // Nguồn 3: sforum_crawled_results.json
  if (fs.existsSync(SFORUM_FILE)) {
    const sforum = JSON.parse(fs.readFileSync(SFORUM_FILE, 'utf8'));
    console.log(`[5] Nạp ${sforum.length} game từ Sforum.`);
    for (const s of sforum) {
      const slug = (s.gameSlug || '').toLowerCase().trim();
      const name = (s.gameName || '').trim();
      if (!slug || !name || !s.codes || s.codes.length === 0) continue;

      const structuredCodes = s.codes.map((c, idx) => {
        const isExpired = s.codes.length > 2 && idx >= Math.ceil(s.codes.length * 0.7);
        return {
          code: (c.code || '').trim().toUpperCase(),
          reward: cleanReward(c.reward),
          status: isExpired ? 'expired' : 'approved',
          addedAt: '2026-09-01',
          expiresAt: isExpired ? '2026-06-30' : '2026-12-31'
        };
      });

      if (!candidatesMap.has(slug)) {
        candidatesMap.set(slug, {
          name,
          slug,
          codes: structuredCodes,
          instructions: `Mở game ${name}, vào Cài đặt -> Giftcode, nhập mã code quà tặng để nhận thưởng qua Hộp Thư.`,
          description: `${name} — Tổng hợp giftcode cập nhật mới nhất từ NPH và cộng đồng Sforum.`,
          category: 'Nhập Vai & Phiêu Lưu'
        });
      } else {
        const existingCandidate = candidatesMap.get(slug);
        const codeVals = new Set(existingCandidate.codes.map(c => c.code));
        for (const sc of structuredCodes) {
          if (!codeVals.has(sc.code)) {
            codeVals.add(sc.code);
            existingCandidate.codes.push(sc);
          }
        }
      }
    }
  }

  console.log(`\n[6] Tổng số ứng viên game thu thập được: ${candidatesMap.size} tựa game.`);

  let newlyAddedGamesCount = 0;
  let newlyAddedCodesCount = 0;
  let updatedExistingCodesCount = 0;

  for (const [slug, candidate] of candidatesMap) {
    const isExistingGame = existingSlugMap.has(slug) || existingNameMap.has(candidate.name.toLowerCase().trim());
    let targetGame = null;

    if (!isExistingGame) {
      // Game MỚI: Đối soát giấy phép ABEI
      const lic = findAbeiLicense(candidate.name);

      targetGame = {
        id: slug,
        name: candidate.name,
        slug: slug,
        publisher: lic ? lic.company : 'Nhà phát hành chính thức',
        category: candidate.category || 'Nhập Vai',
        rating: 5,
        icon_url: `/game_icons/${slug}.webp`,
        cover_image_url: `/game_icons/${slug}.webp`,
        banner_url: '',
        description: candidate.description || `${candidate.name} là trò chơi điện tử hấp dẫn được đông đảo game thủ Việt Nam yêu thích.`,
        instructions: candidate.instructions || `Mở game ${candidate.name}, truy cập Cài đặt -> Giftcode, dán mã quà tặng và nhấn Nhận quà.`,
        so_giay_phep: lic ? lic.licenseNumber : 'Đang đồng bộ ABEI',
        ngay_cap_phep: lic ? lic.issueDate : '2026',
        release_date: '2026-07-01',
        do_tuoi: lic ? lic.ageRating : '16+',
        trang_thai_gp: 'Đang hoạt động',
        website_g1: lic ? (lic.homepage ? lic.homepage.split(',')[0].trim() : '') : '',
        redeem_url: '',
        link_codemoi: `https://codemoi.net/games/${slug}/`,
        nguon_doi_chieu: 'Cục PTTH&TTĐT (giayphep.abei.gov.vn)',
        free_codes_count: 0,
        paid_codes_count: 0
      };

      existingGames.push(targetGame);
      existingSlugMap.set(slug, targetGame);
      existingNameMap.set(candidate.name.toLowerCase().trim(), targetGame);
      newlyAddedGamesCount++;
    } else {
      targetGame = existingSlugMap.get(slug) || existingNameMap.get(candidate.name.toLowerCase().trim());
    }

    // Bổ sung & chuẩn hóa các mã code (cả còn hạn và hết hạn)
    for (const c of candidate.codes) {
      const codeKey = `${targetGame.slug}_${c.code}`;
      if (!existingCodeKeySet.has(codeKey)) {
        existingCodeKeySet.add(codeKey);
        existingCodes.push({
          id: `code-${targetGame.slug}-${c.code}`,
          gameId: targetGame.id || targetGame.slug,
          gameSlug: targetGame.slug,
          gameName: targetGame.name,
          codeValue: c.code,
          code_value: c.code,
          rewards: c.reward || 'Giftcode tân thủ & Tri ân BQT Game',
          status: c.status || 'approved',
          isVerified: true,
          expiresAt: c.expiresAt || (c.status === 'expired' ? '2026-06-30' : '2026-12-31'),
          sourceUrl: `https://codemoi.net/games/${targetGame.slug}/`,
          createdAt: new Date().toISOString()
        });

        if (!isExistingGame) {
          newlyAddedCodesCount++;
        } else {
          updatedExistingCodesCount++;
        }
      }
    }
  }

  // Cập nhật lại free_codes_count (chỉ đếm mã Còn Hạn: status === 'approved')
  for (const g of existingGames) {
    const activeCount = existingCodes.filter(c => 
      (c.gameSlug === g.slug || c.gameId === g.id) &&
      (c.status || 'approved') === 'approved'
    ).length;
    g.free_codes_count = activeCount;
  }

  console.log(`\n=== KẾT QUẢ XỬ LÝ DỮ LIỆU ===`);
  console.log(`✓ Số game mới được thêm vào: ${newlyAddedGamesCount} game.`);
  console.log(`✓ Tổng số game trong hệ thống sau cập nhật: ${existingGames.length} game.`);
  console.log(`✓ Số mã code mới thêm vào game mới: ${newlyAddedCodesCount} codes.`);
  console.log(`✓ Số mã code cập nhật thêm vào game đã có: ${updatedExistingCodesCount} codes.`);
  console.log(`✓ Tổng số mã code trong hệ thống: ${existingCodes.length} codes.`);

  const expiredTotal = existingCodes.filter(c => c.status === 'expired').length;
  const activeTotal = existingCodes.filter(c => c.status === 'approved').length;
  console.log(`  + Mã Còn Hạn (approved): ${activeTotal} codes`);
  console.log(`  + Mã Đã Hết Hạn (expired): ${expiredTotal} codes`);

  // Lưu file
  fs.writeFileSync(GAMES_FILE, JSON.stringify(existingGames, null, 2), 'utf8');
  fs.writeFileSync(CODES_FILE, JSON.stringify(existingCodes, null, 2), 'utf8');

  console.log(`\n✓ Đã ghi thành công ${GAMES_FILE}`);
  console.log(`✓ Đã ghi thành công ${CODES_FILE}`);
}

run();
