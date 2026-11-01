#!/usr/bin/env node
/**
 * Fix All News Covers & Standardize Game Information
 * 
 * 1. Tải toàn bộ 63 bài viết tin tức hiện có từ Cloudflare Edge.
 * 2. Tải Logo chính thức từ Google Play Store VN cho Ta Là Quan Lão Gia.
 * 3. Tải các ảnh bìa ngoài từ st.download.com.vn về lưu nội bộ tại public/news_covers/${slug}.webp.
 * 4. Chuẩn hóa game_name, game_slug và cover_url cho tất cả bài viết.
 * 5. Loại bỏ tiền tố "Game Mobile:" thừa và decode sạch sẽ HTML entities.
 * 6. Xóa vĩnh viễn 3 bài rác (Medpro khám bệnh, bài 2015, landing page download.com.vn).
 * 7. Đồng bộ trực tiếp lên Cloudflare D1/KV.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { searchGooglePlayForLogo, downloadAndSaveGameIcon } = require('./crawler/engine/game_logo_resolver.cjs');

const SYNC_URL = process.env.SYNC_URL || 'https://codegame.shop/api/sync';
const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || 'b4e08494bf1c3fd6a0c965dd2411780c60513f7f87001bc955d7496331b2faef';

const ROOT_DIR = path.resolve(__dirname, '..');
const NEWS_COVERS_DIR = path.join(ROOT_DIR, 'public/news_covers');
const GAME_ICONS_DIR = path.join(ROOT_DIR, 'public/game_icons');

if (!fs.existsSync(NEWS_COVERS_DIR)) {
  fs.mkdirSync(NEWS_COVERS_DIR, { recursive: true });
}
if (!fs.existsSync(GAME_ICONS_DIR)) {
  fs.mkdirSync(GAME_ICONS_DIR, { recursive: true });
}

function decodeHtmlEntities(str) {
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
    .replace(/&nbsp;/g, ' ');
}

async function downloadExternalImageToWebp(imageUrl, targetSlug) {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
        'Referer': imageUrl.includes('download.com.vn') ? 'https://download.com.vn/' : 'https://google.com/'
      }
    });

    if (!res.ok) {
      console.warn(`[Download] ⚠️ Failed HTTP ${res.status} for ${imageUrl}`);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) {
      console.warn(`[Download] ⚠️ Buffer too small (${buf.length} bytes) for ${imageUrl}`);
      return null;
    }

    const outPath = path.join(NEWS_COVERS_DIR, `${targetSlug}.webp`);
    await sharp(buf)
      .webp({ quality: 85 })
      .toFile(outPath);

    console.log(`[Download] ✅ Saved WebP cover: /news_covers/${targetSlug}.webp (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
    return `/news_covers/${targetSlug}.webp`;
  } catch (err) {
    console.warn(`[Download Error] Failed downloading ${imageUrl}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('=== [BẮT ĐẦU CHUẨN HÓA TOÀN BỘ ẢNH BÌA TIN TỨC & LOGO GAME] ===\n');

  // 1. Tải Logo chính thức của "Ta Là Quan Lão Gia" từ Google Play Store VN
  console.log('[Step 1] Kiểm tra và tải Logo Google Play cho Ta Là Quan Lão Gia...');
  const taLaQuanLaoGiaIcon = path.join(GAME_ICONS_DIR, 'ta-la-quan-lao-gia.webp');
  if (!fs.existsSync(taLaQuanLaoGiaIcon)) {
    const gPlayResult = await searchGooglePlayForLogo('Ta Là Quan Lão Gia');
    if (gPlayResult && gPlayResult.iconUrl) {
      await downloadAndSaveGameIcon('ta-la-quan-lao-gia', gPlayResult.iconUrl);
      console.log('✅ Đã tải và lưu Logo Ta Là Quan Lão Gia vào /game_icons/ta-la-quan-lao-gia.webp');
    }
  } else {
    console.log('ℹ️ /game_icons/ta-la-quan-lao-gia.webp đã tồn tại.');
  }

  // 2. Tải danh sách bài viết hiện tại từ Edge API
  console.log('\n[Step 2] Tải danh sách bài viết từ', SYNC_URL);
  const syncRes = await fetch(SYNC_URL);
  if (!syncRes.ok) {
    throw new Error(`Sync API returned HTTP ${syncRes.status}`);
  }
  const syncData = await syncRes.json();
  const existingArticles = syncData.newsArticles || [];
  console.log(`Đã tải ${existingArticles.length} bài viết hiện có.`);

  // 3. Danh sách ID bài rác cần xóa vĩnh viễn (Tombstones)
  const SPAM_ARTICLE_IDS = [
    'news_1792025621051_g0rec', // Medpro - Đặt lịch khám bệnh
    'news_1791919973286_evva3', // Giftcode Game Online 2015 CỰC HOT!
    'news_1791919977303_gb85l', // Giftcode - Download.com.vn
  ];

  // 4. Bảng ánh xạ chuẩn hóa chi tiết cho các bài viết bị lỗi hoặc thiếu logo
  const ARTICLE_CUSTOM_FIXES = {
    'news_1792387242891_qsyr9': {
      game_name: 'Tarot: Vĩnh Hằng Thần Ngữ',
      game_slug: 'tarot-vinh-hang-than-ngu',
      cover_url: '/game_icons/tarot-vinh-hang-than-ngu.webp',
      title: 'Tổng hợp code game Tarot: Vĩnh Hằng Thần Ngữ và cách nhập (2026)',
    },
    'news_1792332600285_0a1q5': {
      game_name: 'Ride Storm',
      game_slug: 'ride-storm',
      download_cover: 'https://st.download.com.vn/data/image/2026/07/14/ride-storm-code-7.jpg',
      cover_slug: 'ride-storm',
      title: 'Code Ride Storm mới nhất và cách đổi quà (2026)',
    },
    'news_1792235461294_lcai4': {
      game_name: 'Build a Golem',
      game_slug: 'build-a-golem',
      download_cover: 'https://st.download.com.vn/data/image/2026/10/17/build-a-golem-code.jpg',
      cover_slug: 'build-a-golem',
      title: 'Code Build a Golem mới nhất và cách đổi quà (2026)',
    },
    'news_1792151705370_q1yq4': {
      game_name: 'Volleyball Journey',
      game_slug: 'volleyball-journey',
      download_cover: 'https://st.download.com.vn/data/image/2026/10/16/volleyball-journey-code-1.jpg',
      cover_slug: 'volleyball-journey',
      title: 'Code Volleyball Journey mới nhất và cách đổi quà (2026)',
    },
    'news_1792066117488_90iot': {
      game_name: 'Cameraman Tower Defense',
      game_slug: 'cameraman-tower-defense',
      download_cover: 'https://st.download.com.vn/data/image/2026/10/15/Cameraman-Tower-Defense.jpg',
      cover_slug: 'cameraman-tower-defense',
      title: 'Code Cameraman Tower Defense mới nhất và cách đổi quà (2026)',
    },
    'news_1792066120479_js6at': {
      game_name: 'FC Online (FO4)',
      game_slug: 'ea-sports-fc-online',
      cover_url: '/game_icons/ea-sports-fc-online.webp',
      title: 'Code FC Online (FO4) Mới Nhất 10/2026, có code mừng năm mới',
    },
    'news_1792045689741_99g4a': {
      game_name: 'Ta Là Quan Lão Gia',
      game_slug: 'ta-la-quan-lao-gia',
      cover_url: '/game_icons/ta-la-quan-lao-gia.webp',
      title: 'Code Ta Là Quan Lão Gia mới nhất tháng 10/2026, cách nhập code',
    },
    'news_1792025616461_kuhu8': {
      game_name: '24 Hours Overnight',
      game_slug: '24-hours-overnight',
      download_cover: 'https://st.download.com.vn/data/image/2026/07/11/code-24-hours-overnight-1.jpg',
      cover_slug: '24-hours-overnight',
      title: 'Code 24 Hours Overnight mới nhất và cách đổi quà (2026)',
    },
    'news_1791893485168_73zt4': {
      game_name: 'Only Sword: Nhất Kiếm Độc Tôn',
      game_slug: 'only-sword',
      download_cover: 'https://st.download.com.vn/data/image/2026/10/13/only-sword-nhat-kiem-doc-ton.jpg',
      cover_slug: 'only-sword',
      title: 'Tổng hợp code game Only Sword: Nhất Kiếm Độc Tôn và cách nhập (2026)',
    },
    'news_1791863619719_c2lg3': {
      game_name: 'My Anime Mine',
      game_slug: 'my-anime-mine',
      download_cover: 'https://st.download.com.vn/data/image/2026/10/12/my-anime-mine-code.jpg',
      cover_slug: 'my-anime-mine',
      title: 'Code My Anime Mine mới nhất và cách đổi quà (2026)',
    },
  };

  console.log('\n[Step 3] Bắt đầu chuẩn hóa từng bài viết...');
  const updatedArticles = [];

  for (const article of existingArticles) {
    // Bỏ qua các bài rác cần xóa
    if (SPAM_ARTICLE_IDS.includes(article.id)) {
      console.log(`🗑️ Bỏ qua bài rác: [${article.id}] ${article.title}`);
      continue;
    }

    let modified = { ...article };

    // Decode HTML entities trong tiêu đề và dọn dẹp "Game Mobile: "
    let cleanTitle = decodeHtmlEntities(modified.title)
      .replace(/^Game Mobile:\s*/i, '')
      .replace(/\s*-\s*Download\.com\.vn/i, '')
      .trim();

    modified.title = cleanTitle;

    // Áp dụng custom fix nếu có
    if (ARTICLE_CUSTOM_FIXES[modified.id]) {
      const fix = ARTICLE_CUSTOM_FIXES[modified.id];
      if (fix.game_name) modified.game_name = fix.game_name;
      if (fix.game_slug) modified.game_slug = fix.game_slug;
      if (fix.title) modified.title = fix.title;

      if (fix.cover_url) {
        modified.cover_url = fix.cover_url;
      } else if (fix.download_cover && fix.cover_slug) {
        const localCover = await downloadExternalImageToWebp(fix.download_cover, fix.cover_slug);
        if (localCover) {
          modified.cover_url = localCover;
        }
      }
    }

    // Nếu bài viết vẫn còn trỏ đến st.download.com.vn -> Tải về lưu nội bộ
    if (modified.cover_url && modified.cover_url.includes('st.download.com.vn')) {
      const targetSlug = modified.game_slug || modified.slug || `cover-${modified.id}`;
      const localCover = await downloadExternalImageToWebp(modified.cover_url, targetSlug);
      if (localCover) {
        modified.cover_url = localCover;
      }
    }

    // Nếu cover_url bị trống hoặc là /og-image.jpg nhưng bài viết có game_slug
    if ((!modified.cover_url || modified.cover_url === '/og-image.jpg') && modified.game_slug) {
      const iconPath = `/game_icons/${modified.game_slug}.webp`;
      if (fs.existsSync(path.join(ROOT_DIR, 'public', iconPath))) {
        modified.cover_url = iconPath;
      }
    }

    modified.updated_at = new Date().toISOString();
    updatedArticles.push(modified);
    console.log(`✅ [${modified.id}] ${modified.game_name} | Slug: ${modified.game_slug} | Cover: ${modified.cover_url}`);
  }

  console.log(`\nTổng số bài viết sau khi làm sạch: ${updatedArticles.length} (Đã lọc ${SPAM_ARTICLE_IDS.length} bài rác)`);

  // 5. Đồng bộ trực tiếp lên Cloudflare Edge
  console.log('\n[Step 4] Đồng bộ danh sách bài viết mới lên Cloudflare API...');
  const payload = {
    newsArticles: updatedArticles,
    deletedNewsArticles: SPAM_ARTICLE_IDS,
  };

  const pushRes = await fetch(SYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Key': ADMIN_SYNC_SECRET,
      'Authorization': `Bearer ${ADMIN_SYNC_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  if (!pushRes.ok) {
    const errorText = await pushRes.text();
    throw new Error(`Đồng bộ thất bại: HTTP ${pushRes.status} - ${errorText}`);
  }

  const result = await pushRes.json();
  console.log('🎉 Đồng bộ thành công 100%!', result);
  console.log('\n=== [HOÀN THÀNH CHUẨN HÓA TOÀN BỘ BÀI VIẾT TIN TỨC] ===');
}

main().catch(err => {
  console.error('❌ Lỗi khi thực thi script:', err);
  process.exit(1);
});
