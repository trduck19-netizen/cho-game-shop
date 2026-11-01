const fs = require('fs');

async function syncAllToKV() {
  const games = JSON.parse(fs.readFileSync('src/data/games188.json', 'utf8'));
  const freeCodes = JSON.parse(fs.readFileSync('src/data/crawled_codes_188.json', 'utf8'));
  const sources = JSON.parse(fs.readFileSync('src/data/crawler_sources.json', 'utf8'));
  const giveaways = JSON.parse(fs.readFileSync('src/data/giveaways.json', 'utf8'));
  const utilities = JSON.parse(fs.readFileSync('src/data/utilities.json', 'utf8'));
  const storeProducts = JSON.parse(fs.readFileSync('src/data/storeProducts.json', 'utf8'));

  const sepay = {
    bankName: 'TPBank',
    accountNumber: '10004681879',
    bankAccount: 'CODE GAME SHOP',
    paymentPrefix: 'WCG',
    autoCreditCoreRatio: 1,
    isConnected: true
  };

  const deletedStoreProducts = [
    'sp_1', 'sp_2', 'sp_3', 'sp_4', 'sp_5', 'sp_6',
    'sp_hsr_pass', 'sp_genshin_welkin', 'sp_roblox_robux_1000',
    'sp_lq_qh_500', 'sp_ff_kc_520', 'sp_pubg_uc_600'
  ];

  const deletedUtilities = [
    'ut_1', 'ut_2', 'ut_3', 'ut_4', 'ut_5', 'ut_6',
    'ut_test_01'
  ];

  const deletedGiveaways = [
    'gw_1', 'gw_2', 'gw_3',
    'gw_garena_delta_force', 'gw_alienware_vaultbreakers',
    'gw_gamerpower_rotwood'
  ];

  const deletedFreeCodes = [
    'code_delta-force_GP-3812-VAULTBRE',
    'code_delta-force_AA-VAULTBREAKER-2026',
    'code_where-winds-meet-mobile_GP-EVERWIND-AW51',
    'code_yen-van-thap-luc-thanh_AA-WWM-EXCL-2026'
  ];

  const endpoints = [
    'https://web-code-game.pages.dev/api/sync',
    'https://admin-code-game-shop.pages.dev/api/sync'
  ];

  console.log(`Đang đồng bộ dữ liệu chuẩn lên Cloudflare D1 / KV:`);
  console.log(`- Games: ${games.length}`);
  console.log(`- Free Codes: ${freeCodes.length}`);
  console.log(`- Sources: ${sources.length}`);
  console.log(`- Giveaways: ${giveaways.length} (KHÔNG CÓ Delta Force, KHÔNG CÓ Yến Vân test)`);
  console.log(`- Utilities: ${utilities.length} (KHÔNG CÓ ut_test_01, ut_vs_05_vip_7d stock: 8)`);
  console.log(`- Store Products: ${storeProducts.length} (0 sản phẩm test/mock)`);
  console.log(`- Payment: TPBank - 10004681879 - CODE GAME SHOP`);
  console.log(`- Tombstones to purge: ${deletedStoreProducts.length} store products, ${deletedUtilities.length} utilities, ${deletedGiveaways.length} giveaways, ${deletedFreeCodes.length} test codes`);

  for (const url of endpoints) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Sync-Key': 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef'
      };

      // 1. Purge Deleted Store Products (Tombstones)
      const resDelSp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'wcg_deleted_store_products', deletedStoreProducts, data: deletedStoreProducts })
      });
      console.log(`[${url}] Purge deleted_store_products: ${resDelSp.status}`);

      // 2. Purge Deleted Utilities (Tombstones, including ut_test_01)
      const resDelUt = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'wcg_deleted_utilities', deletedUtilities, data: deletedUtilities })
      });
      console.log(`[${url}] Purge deleted_utilities (ut_test_01): ${resDelUt.status}`);

      // 3. Purge Deleted Giveaways (Tombstones, including Delta Force & Yến Vân test)
      const resDelGw = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'wcg_deleted_giveaways', deletedGiveaways, data: deletedGiveaways })
      });
      console.log(`[${url}] Purge deleted_giveaways (Delta Force & Yến Vân): ${resDelGw.status}`);

      // 4. Purge Deleted Free Codes (Tombstones, including international crawler test codes)
      const resDelFc = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'wcg_deleted_free_codes', deletedFreeCodes, data: deletedFreeCodes })
      });
      console.log(`[${url}] Purge deleted_free_codes (Test codes): ${resDelFc.status}`);

      // 4. Sync Games v5
      const resG = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'wcg_admin_games_v5', games, data: games })
      });
      console.log(`[${url}] Push games_v5: ${resG.status}`);

      // 5. Sync Free Codes v5
      const resC = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'wcg_admin_free_codes_v5', freeCodes, data: freeCodes })
      });
      console.log(`[${url}] Push free_codes_v5: ${resC.status}`);

      // 6. Sync Crawler Sources
      const resS = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'wcg_crawler_sources_v1', crawlerSources: sources, data: sources })
      });
      console.log(`[${url}] Push crawler_sources_v1: ${resS.status}`);

      // 7. Sync Giveaways v4
      const resGw = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'wcg_admin_giveaways_v4',
          giveaways,
          data: giveaways,
          forceReset: true,
          forceResetClaimed: true
        })
      });
      console.log(`[${url}] Push giveaways_v4 (forceReset): ${resGw.status}`);

      // 8. Sync Utilities v4
      const resUt = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'wcg_admin_utilities_v4',
          utilities,
          data: utilities,
          forceReset: true,
          forceResetSold: true
        })
      });
      console.log(`[${url}] Push utilities_v4 (forceReset): ${resUt.status}`);

      // 9. Sync Store Products v4 (Empty or Real only)
      const resSp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'wcg_admin_store_products_v4',
          storeProducts,
          data: storeProducts,
          forceReset: true,
          forceResetSold: true
        })
      });
      console.log(`[${url}] Push store_products_v4 (forceReset): ${resSp.status}`);

      // 10. Sync Payment (TPBank)
      const resPay = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: 'wcg_admin_sepay_v4', sepay, data: sepay })
      });
      console.log(`[${url}] Push sepay_v4 (TPBank): ${resPay.status}`);

      // 11. Sync Custom Free Codes (Pirate Legends VIP Vinh Danh)
      const pirateCustomCodes = freeCodes.filter(c => c.gameSlug === 'pirate-legends' && c.source === 'GIFTCODE VINH DANH');
      if (pirateCustomCodes.length > 0) {
        const resCust = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ key: 'wcg_admin_custom_free_codes_v1', data: pirateCustomCodes })
        });
        console.log(`[${url}] Push custom_free_codes_v1 (Pirate Legends): ${resCust.status}`);
      }

      // 12. Full State Master Sync with forceReset
      const resFull = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          utilities,
          giveaways,
          storeProducts,
          forceReset: true,
          forceResetSold: true,
          forceResetClaimed: true
        })
      });
      console.log(`[${url}] Push full master snapshot (forceReset): ${resFull.status}`);
    } catch (e) {
      console.error(`[${url}] Error:`, e.message);
    }
  }

  console.log('Hoàn tất đồng bộ toàn bộ cơ sở dữ liệu Cloudflare D1 & KV!');
}

syncAllToKV();
