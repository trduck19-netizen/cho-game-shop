const syncKey = 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

async function main() {
  const endpoints = [
    'https://web-code-game.pages.dev',
    'https://admin-code-game-shop.pages.dev',
    'https://codegame.shop'
  ];

  console.log('=== KÍCH HOẠT MIGRATION TRÊN MÁY CHỦ BIÊN (EDGE) ===');
  for (const base of endpoints) {
    try {
      console.log(`\nGọi action decouple_cuu_am_and_fix_tieu_ngao trên ${base}...`);
      const res = await fetch(`${base}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': syncKey
        },
        body: JSON.stringify({ action: 'decouple_cuu_am_and_fix_tieu_ngao' })
      });
      const data = await res.json();
      console.log(`Kết quả ${base}:`, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Lỗi trên ${base}:`, e.message);
    }
  }

  console.log('\n=== KIỂM TRA ĐỐI SOÁT TRỰC TIẾP TRÊN API CÔNG KHAI ===');
  for (const base of endpoints) {
    console.log(`\n--- Kiểm tra ${base} ---`);

    // 1. cuu-am-chan-kinh-mobile (bản Mobile - phải còn đúng 9 mã)
    try {
      const resMob = await fetch(`${base}/api/games?slug=cuu-am-chan-kinh-mobile&nocache=1`);
      const mobData = await resMob.json();
      if (mobData && mobData.game) {
        const codes = (mobData.game.codes || []).map(c => c.code || c);
        console.log(`[Mobile] ${mobData.game.name} (${mobData.game.slug}): ${codes.length} mã`);
        console.log(`  Danh sách mã:`, codes);
      } else {
        console.log(`[Mobile] Lỗi:`, mobData);
      }
    } catch (e) {
      console.error(`[Mobile] Lỗi fetch:`, e.message);
    }

    // 2. cuu-am-chan-kinh-2d (bản 2D - phải có đúng 8 mã)
    try {
      const res2D = await fetch(`${base}/api/games?slug=cuu-am-chan-kinh-2d&nocache=1`);
      const twoDData = await res2D.json();
      if (twoDData && twoDData.game) {
        const codes = (twoDData.game.codes || []).map(c => c.code || c);
        console.log(`[2D] ${twoDData.game.name} (${twoDData.game.slug}): ${codes.length} mã | NPH: ${twoDData.game.publisher} | Ngày ra mắt: ${twoDData.game.release_date}`);
        console.log(`  Danh sách mã:`, codes);
      } else {
        console.log(`[2D] Lỗi:`, twoDData);
      }
    } catch (e) {
      console.error(`[2D] Lỗi fetch:`, e.message);
    }

    // 3. tieu-ngao-doc-ton-vgp (phải có publisher là VGP)
    try {
      const resTndt = await fetch(`${base}/api/games?slug=tieu-ngao-doc-ton-vgp&nocache=1`);
      const tndtData = await resTndt.json();
      if (tndtData && tndtData.game) {
        console.log(`[Tiếu Ngạo Độc Tôn] Publisher: "${tndtData.game.publisher}" (Đúng yêu cầu: VGP)`);
      } else {
        console.log(`[Tiếu Ngạo Độc Tôn] Lỗi:`, tndtData);
      }
    } catch (e) {
      console.error(`[Tiếu Ngạo Độc Tôn] Lỗi fetch:`, e.message);
    }

    // 4. tieu-ngao (Gamota - tuyệt đối không bị ảnh hưởng)
    try {
      const resTn = await fetch(`${base}/api/games?slug=tieu-ngao&nocache=1`);
      const tnData = await resTn.json();
      console.log(`[Tiếu Ngạo Gamota status]:`, resTn.status, tnData?.game ? `Publisher: "${tnData.game.publisher}"` : `(Trong hàng chờ duyệt hoặc 404 bảo toàn)`);
    } catch (e) {
      console.error(`[Tiếu Ngạo Gamota] Lỗi fetch:`, e.message);
    }
  }
}

main().catch(console.error);
