/**
 * Master Crawler Runner: Chạy thu thập và phân loại Giftcode tự động
 * - Tự động chấm điểm 4 cấp bậc (0-100 điểm)
 * - Bậc 1 (90-100 điểm): Tự động đăng ngay lên web khách (wcg_admin_custom_free_codes_v1)
 * - Bậc 2, 3, 4 (<90 điểm): Chuyển vào hàng chờ Admin duyệt (wcg_crawler_pending_codes_v1)
 * - Tương thích 100% GitHub Actions (chạy định kỳ miễn phí)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch {}

const { calculateCodeScore } = require('./engine/code_scorer.cjs');
const { isValidGiftCode } = require('./engine/code_filter.cjs');
const { GameMatcher } = require('./engine/game_matcher.cjs');
const { WebScraper } = require('./scrapers/web_scraper.cjs');
const { DiscordScraper } = require('./scrapers/discord_scraper.cjs');
const { FacebookScraper } = require('./scrapers/facebook_scraper.cjs');

const SYNC_URL = process.env.SYNC_URL || 'https://codegame.shop/api/sync';
const SYNC_KEY = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

function requestHttp(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'WCG-Crawler-Bot/2.0 (GitHubActions; +https://codegame.shop)',
        'Accept': 'application/json, text/plain, */*',
        ...(options.headers || {}),
      },
      timeout: 25000,
    };

    const req = client.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
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
  });
}

async function loadServerState() {
  console.log(`[Crawler] 🔄 Kết nối đồng bộ với máy chủ: ${SYNC_URL}`);
  try {
    const res = await requestHttp(SYNC_URL, {
      method: 'GET',
      headers: {
        'X-Sync-Key': SYNC_KEY,
        'Cache-Control': 'no-cache',
      },
    });

    if (res && res.status === 200 && res.data && res.data.success) {
      console.log(`[Crawler] ✅ Tải dữ liệu máy chủ thành công.`);
      return res.data;
    }
  } catch (e) {
    console.warn(`[Crawler] ⚠️ Không thể tải từ server API (${e.message}), sử dụng dữ liệu cục bộ dự phòng.`);
  }
  return null;
}

async function main() {
  console.log('='.repeat(65));
  console.log('🤖 BẮT ĐẦU CHẠY CRAWLER & BỘ MÁY ĐÁNH GIÁ GIFTCODE 4 CẤP BẬC');
  console.log(`⏰ Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (UTC+7)`);
  console.log('='.repeat(65));

  // 1. Tải dữ liệu hệ thống (Game catalog & mã code hiện có)
  const serverState = await loadServerState();

  let games = [];
  let existingCodes = [];
  let customFreeCodes = [];
  let sources = [];
  let existingPendingCodes = [];
  let existingLogs = [];

  // Tải danh mục games
  if (serverState && Array.isArray(serverState.games) && serverState.games.length > 0) {
    games = serverState.games;
  } else {
    try {
      const p = path.resolve(__dirname, '../../src/data/games188.json');
      if (fs.existsSync(p)) games = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {}
  }

  // Tải danh sách code hiện có để chống trùng lặp tuyệt đối
  if (serverState && Array.isArray(serverState.freeCodes)) {
    existingCodes = serverState.freeCodes;
  } else {
    try {
      const p = path.resolve(__dirname, '../../src/data/free_codes_crawled.json');
      if (fs.existsSync(p)) existingCodes = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {}
  }

  if (serverState && Array.isArray(serverState.customFreeCodes)) {
    customFreeCodes = serverState.customFreeCodes;
  }
  if (serverState && Array.isArray(serverState.crawlerPendingCodes)) {
    existingPendingCodes = serverState.crawlerPendingCodes;
  }
  if (serverState && Array.isArray(serverState.crawlerLogs)) {
    existingLogs = serverState.crawlerLogs;
  }

  // Tải cấu hình các nguồn cào
  let localSources = [];
  try {
    const p = path.resolve(__dirname, '../../src/data/crawler_sources.json');
    if (fs.existsSync(p)) localSources = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}

  // Hợp nhất 2 chiều giữa localSources và serverState.crawlerSources
  const sourceMap = new Map();
  localSources.forEach((s) => {
    if (s && s.id) sourceMap.set(s.id, s);
  });
  if (serverState && Array.isArray(serverState.crawlerSources)) {
    serverState.crawlerSources.forEach((s) => {
      if (s && s.id) {
        const existing = sourceMap.get(s.id);
        sourceMap.set(s.id, { ...(existing || {}), ...s });
      }
    });
  }
  sources = Array.from(sourceMap.values()).filter((s) => {
    if (!s) return false;
    const url = (s.url || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    const id = (s.id || '').toLowerCase();
    if (url.includes('codemoi.net/game-moi') || id.includes('codemoi_game_moi')) return true;
    return !(url.includes('codemoi.net') || name.includes('codemoi') || desc.includes('codemoi.net') || id.includes('codemoi'));
  });

  // Tự động đồng bộ các nguồn mới từ server về local JSON nếu phát hiện có thêm nguồn
  if (sources.length > localSources.length) {
    try {
      const p1 = path.resolve(__dirname, '../../src/data/crawler_sources.json');
      const p2 = path.resolve(__dirname, '../../public/data/crawler_sources.json');
      fs.writeFileSync(p1, JSON.stringify(sources, null, 2), 'utf8');
      if (fs.existsSync(path.dirname(p2))) {
        fs.writeFileSync(p2, JSON.stringify(sources, null, 2), 'utf8');
      }
      console.log(`[Crawler] 💾 Đã tự động cập nhật ${sources.length - localSources.length} nguồn mới từ server vào file cục bộ.`);
    } catch (saveErr) {
      console.warn(`[Crawler] ⚠️ Không thể lưu nguồn cục bộ: ${saveErr.message}`);
    }
  }

  console.log(`[Crawler] 📊 Thông số khởi động:`);
  console.log(`   - Tổng số tựa game trong hệ thống: ${games.length} game`);
  console.log(`   - Tổng số giftcode hiện có trong kho: ${existingCodes.length + customFreeCodes.length} mã`);
  console.log(`   - Số nguồn cào được nạp: ${sources.length} nguồn`);
  console.log(`   - Số mã đang chờ duyệt trong hàng đợi: ${existingPendingCodes.length} mã`);

  // Xây dựng tập hợp nhận diện mã code trùng lặp
  const knownCodesSet = new Set();
  const registerCode = (codeStr, gSlug) => {
    if (!codeStr) return;
    const clean = String(codeStr).trim().toUpperCase();
    if (gSlug) knownCodesSet.add(`${gSlug}:::${clean}`);
    knownCodesSet.add(clean);
  };

  existingCodes.forEach((c) => registerCode(c.code, c.gameSlug || c.gameId));
  customFreeCodes.forEach((c) => registerCode(c.code, c.gameSlug || c.gameId));
  existingPendingCodes.forEach((c) => registerCode(c.code, c.gameSlug || c.gameId));

  // Khởi tạo Game Matcher & Scrapers
  const matcher = new GameMatcher(games);
  const webScraper = new WebScraper();
  const discordScraper = new DiscordScraper();
  const facebookScraper = new FacebookScraper();

  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const maxSources = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
  const targetSourcesList = maxSources ? sources.slice(0, maxSources) : sources;

  const enabledSources = targetSourcesList.filter((s) => s && s.isEnabled !== false);
  const CONCURRENCY = 15;
  console.log(`\n🚀 Đang quét song song ${enabledSources.length} nguồn (Độ song song: ${CONCURRENCY} luồng đồng thời)...`);

  const autoApprovedList = [];
  const newPendingList = [];
  let totalCodesScanned = 0;
  let duplicatesCount = 0;
  let lowScoreCount = 0;
  let completedSources = 0;

  // Tập hợp gom nhóm các ứng viên để đối chiếu chéo (Cross-check aggregation)
  const candidateGroups = new Map();

  async function processSingleSource(src, index) {
    let scrapedResult = null;
    try {
      if (src.type === 'reputable_web' || src.type === 'official_site') {
        scrapedResult = await webScraper.scrapeSource(src.url);
      } else if (src.type === 'community_discord') {
        scrapedResult = discordScraper.parseMessage(src.description || src.name, src.name, src.name);
      } else if (src.type === 'official_fb') {
        scrapedResult = await facebookScraper.scrapeFacebookSource(src.url, src.name, src.targetGameSlug, games);
        if ((!scrapedResult || !scrapedResult.codes || scrapedResult.codes.length === 0) && src.description) {
          scrapedResult = facebookScraper.parsePost(src.description, src.name);
        }
      }
    } catch (err) {
      console.warn(`   ⚠️ [${index + 1}/${enabledSources.length}] Lỗi cào nguồn "${src.name}": ${err.message}`);
      return;
    } finally {
      completedSources++;
    }

    if (!scrapedResult || !Array.isArray(scrapedResult.codes) || scrapedResult.codes.length === 0) {
      return;
    }

    console.log(`   ✨ [${index + 1}/${enabledSources.length}] "${src.name}": Trích xuất được ${scrapedResult.codes.length} mã tiềm năng.`);

    // Xác định tựa game
    let matchedGame = null;
    let matchConfidence = 0;

    if (src.targetGameSlug) {
      matchedGame = games.find((g) => g.slug === src.targetGameSlug || g.id === src.targetGameSlug);
      if (matchedGame) matchConfidence = 1.0;
    }

    if (!matchedGame) {
      const match = matcher.match(`${scrapedResult.title} ${src.name} ${src.url}`);
      if (match) {
        matchedGame = match.game;
        matchConfidence = match.confidence;
      }
    }

    const gameSlug = matchedGame ? (matchedGame.slug || matchedGame.id) : (src.targetGameSlug || 'unknown-game');
    const gameName = matchedGame ? matchedGame.name : (src.targetGameName || src.name);

    // QUY TẮC BẮT BUỘC: Không nạp code nếu không khớp được tựa game cụ thể nào trong hệ thống
    if (!matchedGame && (!src.targetGameSlug || src.targetGameSlug === 'unknown-game')) {
      return;
    }
    if (gameSlug === 'unknown-game' || matchConfidence <= 0) {
      return;
    }

    for (const codeItem of scrapedResult.codes) {
      totalCodesScanned++;
      const cleanCode = String(codeItem.code || '')
        .trim()
        .toUpperCase()
        .replace(/^[^A-Z0-9_-]+|[^A-Z0-9_-]+$/g, '');

      // BỘ LỌC MÃ RÁC ĐA TẦNG: Kiểm tra cấu trúc & danh sách từ vựng cấm
      if (!isValidGiftCode(cleanCode, { gameSlug, gameName })) {
        lowScoreCount++;
        continue;
      }

      // Kiểm tra trùng lặp với kho code đã có từ trước
      const isDuplicate = knownCodesSet.has(cleanCode) || knownCodesSet.has(`${gameSlug}:::${cleanCode}`);
      if (isDuplicate) {
        duplicatesCount++;
        continue;
      }

      // Đưa vào bảng gom nhóm ứng viên để đối chiếu chéo giữa các nguồn
      const groupKey = `${gameSlug}:::${cleanCode}`;
      if (!candidateGroups.has(groupKey)) {
        candidateGroups.set(groupKey, {
          code: cleanCode,
          gameSlug,
          gameName,
          matchedGame,
          matchConfidence,
          sightings: [],
        });
      }

      candidateGroups.get(groupKey).sightings.push({
        src,
        codeItem,
        isStaleSource: Boolean(scrapedResult.isStaleSource),
        title: scrapedResult.title || src.name,
      });
    }
  }

  // Chạy pool công việc song song
  let sourceCursor = 0;
  async function workerPool() {
    while (sourceCursor < enabledSources.length) {
      const currentIndex = sourceCursor++;
      const currentSource = enabledSources[currentIndex];
      await processSingleSource(currentSource, currentIndex);
    }
  }

  const poolWorkers = Array.from(
    { length: Math.min(CONCURRENCY, enabledSources.length) },
    () => workerPool()
  );
  await Promise.all(poolWorkers);

  // ĐỐI CHIẾU CHÉO & ĐÁNH GIÁ 4 CẤP BẬC CHO TOÀN BỘ ỨNG VIÊN
  console.log(`\n🔍 Đang đối chiếu chéo và chấm điểm ${candidateGroups.size} mã ứng viên duy nhất...`);

  for (const [groupKey, group] of candidateGroups.entries()) {
    const cleanCode = group.code;
    const gameSlug = group.gameSlug;
    const gameName = group.gameName;
    const matchedGame = group.matchedGame;

    // Tính toán đối chiếu chéo
    const crossCheckCount = group.sightings.length;
    const crossCheckSources = group.sightings.map((s) => s.src.name || s.src.url);

    // Kiểm tra xung đột trạng thái giữa các nguồn (Conflicted Status)
    const hasExpiredSighting = group.sightings.some((s) => s.codeItem.isExpired);
    const hasActiveSighting = group.sightings.some((s) => !s.codeItem.isExpired);
    const isConflicted = hasExpiredSighting && hasActiveSighting;
    const conflictNote = isConflicted ? 'Xung đột trạng thái: có nguồn báo hết hạn, nguồn khác báo còn hạn' : '';
    const isExpired = hasExpiredSighting && !hasActiveSighting;

    // Kiểm tra độ tươi: nếu tất cả nguồn cào đều là bài viết cũ > 6 tháng
    const isStaleSource = group.sightings.every((s) => s.isStaleSource);

    // Ưu tiên chọn nguồn chính thức hoặc nguồn có thông tin quà chi tiết nhất làm Primary Sighting
    const officialSighting = group.sightings.find((s) => s.src.type === 'official_fb' || s.src.type === 'official_site');
    const primarySighting = officialSighting || group.sightings[0];
    const extractionMethod = primarySighting.codeItem.extractionMethod || 'table_list';

    // Đánh giá và chấm điểm mã theo thuật toán 4 Cấp Bậc (0 - 100 điểm)
    const scoreResult = calculateCodeScore({
      code: cleanCode,
      gameMatchConfidence: group.matchConfidence,
      sourceType: primarySighting.src.type || 'reputable_web',
      rewards: primarySighting.codeItem.rewards,
      expiresAt: primarySighting.codeItem.expiresAt,
      isDuplicate: false,
      contextText: primarySighting.title,
      crossCheckCount,
      crossCheckSources,
      isConflicted,
      conflictNote,
      isStaleSource,
      extractionMethod,
      isExpired,
    });

    console.log(`   -> [${scoreResult.score}đ] Mã "${cleanCode}" | Game: ${gameName} | ${scoreResult.tierLabel} (Nguồn: ${primarySighting.src.name}, Đối chiếu: ${crossCheckCount})`);

    // Phân luồng:
    // - BẬC 1 (90 - 100 điểm): TỰ ĐỘNG ĐĂNG THẲNG LÊN WEB
    if (scoreResult.canAutoPublish) {
      const publishedItem = {
        id: `fc_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        gameId: matchedGame?.id || gameSlug,
        gameSlug: gameSlug,
        gameName: gameName,
        code: cleanCode,
        codeValue: cleanCode,
        rewards: primarySighting.codeItem.rewards || 'Quà tân thủ & vật phẩm ingame',
        status: 'ACTIVE',
        type: 'EVENT',
        sourceUrl: primarySighting.src.url,
        sourceType: primarySighting.src.type,
        sourceName: primarySighting.src.name,
        score: scoreResult.score,
        tier: 1,
        isCrawlerAutoApproved: true,
        expiresAt: primarySighting.codeItem.expiresAt || null,
        extractionMethod,
        crossCheckCount,
        crossCheckSources,
        scoreReasons: scoreResult.reasons,
        isConflicted: scoreResult.isConflicted,
        conflictNote: scoreResult.conflictNote,
        isStaleSource: scoreResult.isStaleSource,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      autoApprovedList.push(publishedItem);
      registerCode(cleanCode, gameSlug);
    }
    // - BẬC 2, 3 (<90 điểm & >= 50 điểm): LƯU VÀO HÀNG ĐỢI CHO ADMIN DUYỆT (Chỉ nhận mã có game xác định)
    else if (scoreResult.score >= 50 && gameSlug !== 'unknown-game') {
      const pendingItem = {
        id: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        gameId: matchedGame?.id || gameSlug,
        gameSlug: gameSlug,
        gameName: gameName,
        code: cleanCode,
        rewards: primarySighting.codeItem.rewards || 'Chưa xác định',
        sourceUrl: primarySighting.src.url,
        sourceType: primarySighting.src.type,
        sourceName: primarySighting.src.name,
        score: scoreResult.score,
        tier: scoreResult.tier,
        tierLabel: scoreResult.tierLabel,
        reasons: scoreResult.reasons,
        status: 'PENDING',
        expiresAt: primarySighting.codeItem.expiresAt || null,
        extractionMethod,
        crossCheckCount,
        crossCheckSources,
        scoreReasons: scoreResult.reasons,
        isConflicted: scoreResult.isConflicted,
        conflictNote: scoreResult.conflictNote,
        isStaleSource: scoreResult.isStaleSource,
        createdAt: new Date().toISOString(),
      };

      newPendingList.push(pendingItem);
      registerCode(cleanCode, gameSlug);
    } else {
      lowScoreCount++;
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log('📈 TỔNG KẾT KẾT QUẢ QUÉT:');
  console.log(`   - Tổng mã phát hiện: ${totalCodesScanned}`);
  console.log(`   - Trùng lặp bỏ qua: ${duplicatesCount}`);
  console.log(`   - Điểm quá thấp (<40đ) bỏ qua: ${lowScoreCount}`);
  console.log(`   - 🚀 Bậc 1 (90-100đ) Tự động đăng ngay: ${autoApprovedList.length} mã`);
  console.log(`   - ⏳ Bậc 2, 3, 4 (<90đ) Đưa vào hàng chờ duyệt: ${newPendingList.length} mã`);
  console.log('='.repeat(65));

  // 2. Đồng bộ kết quả lên Cloudflare D1 Server qua API
  const logEntry = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    sourcesCount: enabledSources.length,
    codesScanned: totalCodesScanned,
    duplicatesCount: duplicatesCount,
    autoApprovedCount: autoApprovedList.length,
    pendingAddedCount: newPendingList.length,
    summary: `Quét hoàn tất: ${autoApprovedList.length} mã Bậc 1 đăng tự động, ${newPendingList.length} mã đưa vào hàng chờ Admin duyệt.`,
    autoCodes: autoApprovedList.map((a) => `${a.gameName}: ${a.code}`),
  };

  const updatedLogs = [logEntry, ...(Array.isArray(existingLogs) ? existingLogs : [])].slice(0, 50);

  // Chuẩn bị payload gửi lên server
  const syncPayload = {
    crawlerLogs: updatedLogs,
  };

  if (autoApprovedList.length > 0) {
    syncPayload.customFreeCodes = [...autoApprovedList, ...customFreeCodes];
  }

  if (newPendingList.length > 0) {
    syncPayload.crawlerPendingCodes = [...newPendingList, ...existingPendingCodes].slice(0, 500);
  }

  if (!serverState?.crawlerSources || serverState.crawlerSources.length < sources.length) {
    syncPayload.crawlerSources = sources;
  }

  try {
    console.log(`\n📤 Đang gửi cập nhật lên hệ thống server API...`);
    const postRes = await requestHttp(SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': SYNC_KEY,
      },
    }, syncPayload);

    if (postRes && postRes.status === 200 && postRes.data && postRes.data.success) {
      console.log(`✅ [ĐỒNG BỘ HOÀN TẤT] Dữ liệu Crawler đã được cập nhật an toàn vào D1 Database!`);
    } else {
      console.warn(`⚠️ Phản hồi từ server:`, postRes?.data || postRes?.raw || postRes?.status);
    }
  } catch (syncErr) {
    console.error(`❌ Lỗi khi gửi dữ liệu lên server: ${syncErr.message}`);
  }

  console.log('\n🎉 Hoàn thành phiên quét crawler. Sẵn sàng cho phiên tiếp theo!\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error in crawler runner:', err);
    process.exit(1);
  });
}

module.exports = { main };
