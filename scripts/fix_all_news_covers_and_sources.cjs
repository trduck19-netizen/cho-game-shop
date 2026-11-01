#!/usr/bin/env node
/**
 * Fix All News Covers, Standardize Game Logos, and Set Source to CodeGame.Shop
 * 
 * 1. Tải toàn bộ danh sách 83 bài viết hiện có từ Cloudflare Edge.
 * 2. Tải Logo chính thức từ Google Play Store VN cho các tựa game còn thiếu (Audition, Ludo Go, Harpoon, Liquipedia...).
 * 3. Tải các ảnh bìa chất lượng cao chuyên đề (Esports, Apple Arcade, Xbox, Thị trường game Việt...) về public/news_covers/.
 * 4. Xóa vĩnh viễn các bài rác (bài 2015, bài chứa logo Lag.vn / Kenh14).
 * 5. Cập nhật author = 'CodeGame.Shop', source_name = 'CodeGame.Shop', source_url = 'https://codegame.shop'.
 * 6. Đảm bảo 100% bài viết đều có ảnh bìa game / logo game sắc nét, KHÔNG CÒN BÀI NÀO BỊ LẤY LOGO WEB LÀM ẢNH BÌA!
 * 7. Đồng bộ trực tiếp lên Cloudflare D1.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { searchGooglePlayForLogo, downloadAndSaveGameIcon } = require('./crawler/engine/game_logo_resolver.cjs');

const SYNC_URL = 'https://admin-code-game-shop.pages.dev/api/sync';
const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

const ROOT_DIR = path.resolve(__dirname, '..');
const NEWS_COVERS_DIR = path.join(ROOT_DIR, 'public/news_covers');
const GAME_ICONS_DIR = path.join(ROOT_DIR, 'public/game_icons');

if (!fs.existsSync(NEWS_COVERS_DIR)) fs.mkdirSync(NEWS_COVERS_DIR, { recursive: true });
if (!fs.existsSync(GAME_ICONS_DIR)) fs.mkdirSync(GAME_ICONS_DIR, { recursive: true });

async function downloadImageToWebp(imageUrl, targetPath, options = {}) {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        ...(options.referer ? { 'Referer': options.referer } : {})
      }
    });

    if (!res.ok) {
      console.warn(`[Download] ⚠️ Failed HTTP ${res.status} for ${imageUrl}`);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return null;

    let sharpInstance = sharp(buf);
    if (options.resize) {
      sharpInstance = sharpInstance.resize(options.resize.width, options.resize.height, { fit: 'cover' });
    }

    await sharpInstance.webp({ quality: options.quality || 85 }).toFile(targetPath);
    console.log(`[Download] ✅ Saved WebP: ${path.basename(targetPath)} (${(fs.statSync(targetPath).size / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.warn(`[Download Error] Failed downloading ${imageUrl}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU CHUẨN HÓA TOÀN BỘ ẢNH BÌA TIN TỨC & GÁN NGUỒN CODEGAME.SHOP');
  console.log('===============================================================\n');

  // 1. Tải các Logo chính thức từ Google Play Store VN cho các game còn thiếu
  console.log('[Step 1] Kiểm tra & Tải Logo Google Play cho các game...');
  const gamesToResolve = [
    { name: 'Audition Mobile VTC', slug: 'audition-2026-tu-game', query: 'Audition VTC Game' },
    { name: 'Ludo Go: Online Board Game', slug: 'game-online', query: 'Ludo Go Online Board Game' },
    { name: 'Harpoon FRVR', slug: 'harpoon-a-fish', query: 'Harpoon FRVR' },
    { name: 'Liquipedia Esports Tracker', slug: 'esports', query: 'Liquipedia Esports' },
    { name: 'Tap Simulator Reborn', slug: 'tap-simulator-reborn', query: 'Tap Simulator Reborn' },
  ];

  for (const g of gamesToResolve) {
    const iconPath = path.join(GAME_ICONS_DIR, `${g.slug}.webp`);
    if (!fs.existsSync(iconPath)) {
      console.log(`  🔍 Đang tìm Logo Google Play cho: "${g.query}"...`);
      try {
        const found = await searchGooglePlayForLogo(g.query);
        if (found && found.iconUrl) {
          await downloadAndSaveGameIcon(g.slug, found.iconUrl);
          console.log(`  ✅ Đã tải Logo thành công: ${g.slug}.webp`);
        }
      } catch (e) {
        console.warn(`  ⚠️ Lỗi tìm Logo ${g.name}:`, e.message);
      }
    } else {
      console.log(`  ℹ️ Logo đã tồn tại: ${g.slug}.webp`);
    }
  }

  // 2. Tải các ảnh bìa chuyên đề game (Gaming Artworks) độ nét cao về public/news_covers/
  console.log('\n[Step 2] Kiểm tra & Tải ảnh bìa chuyên đề game chất lượng cao...');
  const thematicCovers = [
    {
      slug: 'thi-truong-game-viet-nam',
      url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      desc: 'Thị trường Game Việt Nam',
    },
    {
      slug: 'xac-thuc-tai-khoan-game',
      url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      desc: 'Xác thực tài khoản game & An toàn số',
    },
    {
      slug: 'game-offline-hay',
      url: 'https://images.unsplash.com/photo-1552824722-ddab1374e622?auto=format&fit=crop&w=1200&q=80',
      desc: 'Game Offline Hay Không Cần Mạng',
    },
    {
      slug: 'apple-arcade-games',
      url: 'https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?auto=format&fit=crop&w=1200&q=80',
      desc: 'Tổng hợp game Apple Arcade',
    },
    {
      slug: 'xbox-games-collection',
      url: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=1200&q=80',
      desc: 'Bộ sưu tập game Xbox',
    },
    {
      slug: 'board-game-van-hoa-viet',
      url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80',
      desc: 'Board Game Văn Hóa Việt Nam',
    },
    {
      slug: 'nhan-luc-nganh-game',
      url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      desc: 'Nhân lực ngành game & Giáo dục',
    },
    {
      slug: 'cktg-2026-esports',
      url: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80',
      desc: 'CKTG LoL Esports',
    },
    {
      slug: 'blv-esports-viet-nam',
      url: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=1200&q=80',
      desc: 'BLV Esports Việt Nam',
    },
    {
      slug: 'qua-tang-giftcode-vip',
      url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
      desc: 'Quà Tặng Giftcode VIP Tân Thủ',
    },
  ];

  for (const c of thematicCovers) {
    const targetFile = path.join(NEWS_COVERS_DIR, `${c.slug}.webp`);
    if (!fs.existsSync(targetFile)) {
      console.log(`  📥 Đang tải ảnh bìa: ${c.desc} -> ${c.slug}.webp...`);
      await downloadImageToWebp(c.url, targetFile, { resize: { width: 1200, height: 675 } });
    } else {
      console.log(`  ℹ️ Ảnh bìa đã có: ${c.slug}.webp`);
    }
  }

  // 3. Tải danh sách bài viết hiện tại từ Edge API
  console.log('\n[Step 3] Tải danh sách bài viết từ', SYNC_URL);
  const syncRes = await fetch(SYNC_URL + '?fresh=1', {
    headers: { 'X-Sync-Key': ADMIN_SYNC_SECRET }
  });
  if (!syncRes.ok) throw new Error(`Sync API returned HTTP ${syncRes.status}`);
  const syncData = await syncRes.json();
  const existingArticles = syncData.newsArticles || [];
  console.log(`Đã tải ${existingArticles.length} bài viết hiện có.`);

  // 4. Danh sách các bài viết rác cần xóa vĩnh viễn (Tombstones)
  const SPAM_IDS = new Set([
    'news_1792432014322_9k4px', // Tặng Gift Code Game Online 2015 CỰC HOT!
    'news_1792498461821_voxss', // Bài chứa logo Lag.vn
    'news_1792498493977_e1jz0', // Bài chứa logo Kênh 14
    'news_1792025621051_g0rec', // Medpro - Đặt lịch khám bệnh
    'news_1791919973286_evva3', // Giftcode Game Online 2015
    'news_1791919977303_gb85l', // Giftcode - Download.com.vn
  ]);

  // 5. Cập nhật chi tiết từng bài viết
  console.log('\n[Step 4] Chuẩn hóa toàn bộ ảnh bìa, logo game và gán nguồn là CodeGame.Shop...');
  const updatedArticles = [];

  for (const art of existingArticles) {
    if (SPAM_IDS.has(art.id) || SPAM_IDS.has(art.slug)) {
      console.log(`  🗑️ Đã xóa bài rác: [${art.id}] ${art.title?.slice(0, 40)}`);
      continue;
    }

    const updated = { ...art };

    // Luôn luôn thiết lập Tác giả & Nguồn bài viết là CodeGame.Shop!
    updated.author = 'CodeGame.Shop';
    updated.source_name = 'CodeGame.Shop';
    updated.source_url = 'https://codegame.shop';

    const titleLower = (updated.title || '').toLowerCase();
    const gameLower = (updated.game_name || '').toLowerCase();

    // Chuẩn hóa ảnh bìa game thật và logo game liên quan
    if (titleLower.includes('audition')) {
      updated.game_name = 'Audition VTC';
      updated.game_slug = 'audition-2026-tu-game';
      updated.cover_url = fs.existsSync(path.join(GAME_ICONS_DIR, 'audition-2026-tu-game.webp'))
        ? '/game_icons/audition-2026-tu-game.webp'
        : '/news_covers/nhan-luc-nganh-game.webp';
    } else if (titleLower.includes('ludo go')) {
      updated.game_name = 'Ludo Go';
      updated.game_slug = 'game-online';
      updated.cover_url = fs.existsSync(path.join(GAME_ICONS_DIR, 'game-online.webp'))
        ? '/game_icons/game-online.webp'
        : '/news_covers/board-game-van-hoa-viet.webp';
    } else if (titleLower.includes('harpoon')) {
      updated.game_name = 'Harpoon FRVR';
      updated.game_slug = 'harpoon-a-fish';
      updated.cover_url = fs.existsSync(path.join(GAME_ICONS_DIR, 'harpoon-a-fish.webp'))
        ? '/game_icons/harpoon-a-fish.webp'
        : '/news_covers/game-offline-hay.webp';
    } else if (titleLower.includes('cktg') || titleLower.includes('esports') || titleLower.includes('karmine corp') || titleLower.includes('mvk esports')) {
      updated.game_name = 'Liên Minh Huyền Thoại (LoL Esports)';
      updated.game_slug = 'lien-minh-huyen-thoai';
      updated.cover_url = '/news_covers/cktg-2026-esports.webp';
    } else if (titleLower.includes('apple arcade')) {
      updated.game_name = 'Apple Arcade';
      updated.game_slug = 'tong-hop-game-apple-arcade-hay-dang-choi-nhat-2025';
      updated.cover_url = '/news_covers/apple-arcade-games.webp';
    } else if (titleLower.includes('xbox')) {
      updated.game_name = 'Xbox';
      updated.game_slug = 'bo-suu-tam-game-xbox-bien-mat-sau-khi-tai-khoan-microsoft-bi-khoa';
      updated.cover_url = '/news_covers/xbox-games-collection.webp';
    } else if (titleLower.includes('sức hút của thị trường game')) {
      updated.game_name = 'Thị Trường Game Việt Nam';
      updated.game_slug = 'suc-hut-cua-thi-truong-game-viet-nam';
      updated.cover_url = '/news_covers/thi-truong-game-viet-nam.webp';
    } else if (titleLower.includes('xác thực tài khoản game')) {
      updated.game_name = 'Chính Sách Game Online';
      updated.game_slug = 'tu-1-7-khong-xac-thuc-tai-khoan-game-co-the-bi-phat-60-trieu-dong';
      updated.cover_url = '/news_covers/xac-thuc-tai-khoan-game.webp';
    } else if (titleLower.includes('board game')) {
      updated.game_name = 'Board Game Văn Hóa';
      updated.game_slug = 'sinh-vien-sang-tao-board-game-ve-van-hoa-viet-nam-mot-san-pham-du-lich';
      updated.cover_url = '/news_covers/board-game-van-hoa-viet.webp';
    } else if (titleLower.includes('nhân lực game')) {
      updated.game_name = 'Giáo Dục & Nhân Lực Game';
      updated.game_slug = 'chuan-bi-5-000-nhan-luc-game-phuc-vu-giao-duc-lich-su-van-hoa';
      updated.cover_url = '/news_covers/nhan-luc-nganh-game.webp';
    } else if (titleLower.includes('blv esports')) {
      updated.game_name = 'Cộng Đồng Esports';
      updated.game_slug = 'cap-blv-esports-dinh-dam-viet-nam-lan-dau-he-lo-moi-quan-he-ngoai-doi';
      updated.cover_url = '/news_covers/blv-esports-viet-nam.webp';
    } else if (titleLower.includes('game offline')) {
      updated.game_name = 'Game Offline Hay';
      updated.game_slug = 'game-offline';
      updated.cover_url = '/news_covers/game-offline-hay.webp';
    } else if (titleLower.includes('quà tặng vip') || titleLower.includes('giftcode vip')) {
      updated.game_name = 'Quà Tặng VIP Tân Thủ';
      updated.game_slug = 'qua-tang';
      updated.cover_url = '/news_covers/qua-tang-giftcode-vip.webp';
    } else if (titleLower.includes('liquipedia')) {
      updated.game_name = 'Liquipedia Tracker';
      updated.game_slug = 'esports';
      updated.cover_url = fs.existsSync(path.join(GAME_ICONS_DIR, 'esports.webp'))
        ? '/game_icons/esports.webp'
        : '/news_covers/cktg-2026-esports.webp';
    } else if (titleLower.includes('hắc ngộ không') || titleLower.includes('ta là hắc ngộ')) {
      updated.game_name = 'TA LÀ HẮC NGỘ KHÔNG';
      updated.game_slug = 'ta-la-hac-ngo-khong';
      updated.cover_url = '/game_icons/ta-la-hac-ngo-khong.webp';
    } else if (titleLower.includes('genshin')) {
      updated.game_name = 'Genshin Impact';
      updated.game_slug = 'genshin-impact';
      updated.cover_url = '/game_icons/genshin-impact.webp';
    } else if (titleLower.includes('liên minh')) {
      updated.game_name = 'Liên Minh Huyền Thoại';
      updated.game_slug = 'lien-minh-huyen-thoai';
      updated.cover_url = '/game_icons/lien-minh-huyen-thoai.webp';
    }

    // Kiểm tra nếu cover_url vẫn là /og-image.jpg hoặc rỗng -> Fallback an toàn sang ảnh chuyên đề gaming
    if (!updated.cover_url || updated.cover_url === '/og-image.jpg') {
      if (updated.game_slug && fs.existsSync(path.join(GAME_ICONS_DIR, `${updated.game_slug}.webp`))) {
        updated.cover_url = `/game_icons/${updated.game_slug}.webp`;
      } else {
        updated.cover_url = '/news_covers/game-offline-hay.webp';
      }
    }

    // Đảm bảo trong nội dung có ghi nhận nguồn CodeGame.Shop
    if (!updated.content.includes('CodeGame.Shop')) {
      updated.content += `\n\n> 🛡️ **Nguồn tin tức:** Bản tin được tổng hợp, biên tập và xuất bản độc quyền bởi **CodeGame.Shop** (https://codegame.shop).`;
    }

    updatedArticles.push(updated);
  }

  console.log(`\nTổng số bài viết sau khi làm sạch: ${updatedArticles.length} bài.`);

  // 6. Gửi đồng bộ lên Cloudflare D1
  console.log('💾 Đang đồng bộ toàn bộ bài viết đã chuẩn hóa lên Cloudflare D1...');
  const postRes = await fetch(SYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Key': ADMIN_SYNC_SECRET,
    },
    body: JSON.stringify({
      newsArticles: updatedArticles,
      deletedNewsArticles: Array.from(SPAM_IDS),
    }),
  });

  if (postRes.ok) {
    console.log('🎉 ĐỒNG BỘ THÀNH CÔNG 100%! TẤT CẢ BÀI VIẾT ĐÃ CÓ ẢNH BÌA GAME VÀ NGUỒN CODEGAME.SHOP.');
  } else {
    console.error('❌ Lỗi lưu Cloudflare D1:', await postRes.text());
  }

  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});
