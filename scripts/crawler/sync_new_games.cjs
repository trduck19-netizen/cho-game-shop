/**
 * Multi-Source Game Crawler & Sync Engine (Google Play + CodeMoi.net)
 * Thực thi Phương Án B: Tự động đăng 100% NPH uy tín & Hàng chờ duyệt tay
 */

const { runCodemoiGameCrawler } = require('./scrapers/codemoi_game_scraper.cjs');
const { runGooglePlayCrawler } = require('./google_play_crawler.cjs');

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  🌐 KHỞI CHẠY TỔNG HỢP QUÉT GAME MỚI (GOOGLE PLAY & CODEMOI)   ');
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Quét CodeMoi.net Game Mới
  try {
    console.log('\n[PHẦN 1] Quét nguồn chuyên mục Game Mới codemoi.net...');
    await runCodemoiGameCrawler();
  } catch (err) {
    console.warn('[CodeMoi] ⚠️ Lỗi trong quá trình quét CodeMoi:', err.message);
  }

  // 2. Quét Google Play Store VN
  try {
    console.log('\n[PHẦN 2] Quét nguồn Google Play Store VN...');
    await runGooglePlayCrawler();
  } catch (err) {
    console.warn('[Google Play] ⚠️ Lỗi trong quá trình quét Google Play:', err.message);
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  ✨ HOÀN TẤT TIẾN TRÌNH QUÉT TỔNG HỢP GAME MỚI ĐA NGUỒN         ');
  console.log('════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Lỗi tổng hợp quét game mới:', err);
    process.exit(1);
  });
}

module.exports = { main };
