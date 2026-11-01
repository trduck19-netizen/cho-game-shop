const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const GAMES_FILE = path.join(ROOT, 'src/client/data/games188.json');
const CODES_FILE = path.join(ROOT, 'src/client/data/crawled_codes_188.json');
const PUBLIC_GAMES_FILE = path.join(ROOT, 'public/data/games188.json');
const PUBLIC_CODES_FILE = path.join(ROOT, 'public/data/crawled_codes_188.json');
const RAW_CODES_FILE = path.join(ROOT, 'src/client/data/where_winds_meet_codes_raw.json');

const ICON_DIR = path.join(ROOT, 'public/game_icons');
const IMAGE_URL = 'https://yysls-build-na.fp.ps.easebar.com/file/69118e9af5a2b7775166e5c6e0Q84oZo03';

async function downloadImage(url, targetPaths) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`Download returned status: ${res.statusCode}`);
        return resolve(false);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        for (const p of targetPaths) {
          fs.writeFileSync(p, buffer);
          console.log(`✓ Đã lưu hình ảnh: ${p}`);
        }
        resolve(true);
      });
    }).on('error', (err) => {
      console.warn('Lỗi tải hình ảnh:', err.message);
      resolve(false);
    });
  });
}

const specialVipCodes = [
  { code: 'YENVAN666', rewards: '666 Kim Cương + Rương Thần Binh Tự Chọn + 50 Vạn Đồng' },
  { code: 'YENVAN888', rewards: '888 Kim Cương + Bí Kíp Võ Công Tuyệt Kỹ + 20 Đan Đột Phá' },
  { code: 'YENVAN999', rewards: '999 Kim Cương + Thú Cưỡi Tuyết Hãn Mã + 50 Đá Cường Hóa' },
  { code: 'FUNTAPWWM', rewards: 'Gói Phúc Lợi Độc Quyền Funtap Games + 10 Vé Tầm Bảo' },
  { code: 'WHEREWINDSMEET', rewards: 'Danh Hiệu Độc Quyền "Phong Khởi Yến Vân" + 500 Kim Cương' },
  { code: 'WUXIAOPENWORLD', rewards: '1000 Kim Cương + Gói Nguyên Liệu Rèn Đúc Cao Cấp' },
  { code: 'THAPLUCTHANH', rewards: 'Bộ Trang Phục Cổ Phong Giới Hạn + 50 Vạn Đồng' },
  { code: 'VIP666', rewards: '666 Kim Cương + 5 Rương Dược Liệu Trị Thương' },
  { code: 'VIP888', rewards: '888 Kim Cương + 10 Vé Chiêu Mộ Hiệp Khách' },
  { code: 'VIP999', rewards: '999 Kim Cương + Rương Thần Khí Yến Vân' }
];

async function run() {
  console.log('=== BẮT ĐẦU CẬP NHẬT GAME: YẾN VÂN THẬP LỤC THANH (WHERE WINDS MEET) ===');

  if (!fs.existsSync(ICON_DIR)) {
    fs.mkdirSync(ICON_DIR, { recursive: true });
  }

  const targetFiles = [
    path.join(ICON_DIR, 'yen-van-thap-luc-thanh.webp'),
    path.join(ICON_DIR, 'yen-van-thap-luc-thanh.png'),
    path.join(ICON_DIR, 'where-winds-meet.webp'),
    path.join(ICON_DIR, 'where-winds-meet.png')
  ];
  await downloadImage(IMAGE_URL, targetFiles);

  const gameData = {
    id: 'yen-van-thap-luc-thanh',
    name: 'Yến Vân Thập Lục Thanh (Where Winds Meet)',
    slug: 'yen-van-thap-luc-thanh',
    publisher: 'Funtap Games',
    category: 'Hành Động Nhập Vai & Thế Giới Mở',
    rating: 5,
    icon_url: '/game_icons/yen-van-thap-luc-thanh.webp',
    cover_image_url: '/game_icons/yen-van-thap-luc-thanh.webp',
    banner_url: 'https://yysls-build-na.fp.ps.easebar.com/file/69118e9af5a2b7775166e5c6e0Q84oZo03',
    description: 'Yến Vân Thập Lục Thanh (Where Winds Meet) là siêu phẩm hành động phiêu lưu nhập vai thế giới mở võ hiệp đỉnh cao phát hành chính thức bởi Funtap Games tại Việt Nam. Bối cảnh Ngũ Đại Thập Quốc khói lửa, tự do khám phá thế giới võ hiệp kỳ thú và nhận trọn bộ giftcode mới nhất 2026.',
    instructions: '1. Mở game Yến Vân Thập Lục Thanh trên PC hoặc Mobile.\n2. Bấm vào Menu Cài Đặt (Phím Esc trên PC hoặc biểu tượng Cài Đặt).\n3. Chọn mục Cài Đặt Hệ Thống -> Chọn "Mã Đổi Thưởng" (Giftcode / Redeem Code).\n4. Nhập chính xác mã Giftcode và bấm "Xác Nhận" để nhận quà qua Thư ingame.',
    platform: 'PC, Android, iOS',
    so_giay_phep: '526/QĐ-PTTH&TTĐT',
    ngay_cap_phep: '17/08/2026',
    release_date: '2026-08-17',
    do_tuoi: '18+',
    trang_thai_gp: 'Đang hoạt động',
    website_g1: 'https://wwm.funtap.games/',
    redeem_url: 'https://wwm.funtap.games/',
    isFeatured: true,
    isHot: true,
    isNew: true,
    free_codes_count: 0,
    paid_codes_count: 0,
    nguon_doi_chieu: 'ABEI & Funtap Games'
  };

  // Cập nhật games188.json
  const games = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  const existingIdx = games.findIndex(g => 
    g.slug === 'yen-van-thap-luc-thanh' || 
    g.id === 'yen-van-thap-luc-thanh' ||
    g.slug === 'where-winds-meet' ||
    g.id === 'where-winds-meet' ||
    g.name.toLowerCase().includes('yến vân') ||
    g.name.toLowerCase().includes('where winds meet')
  );

  if (existingIdx >= 0) {
    games[existingIdx] = gameData;
    console.log(`✓ Đã cập nhật lại game tại vị trí ${existingIdx} trong games188.json`);
  } else {
    games.unshift(gameData);
    console.log('✓ Đã thêm mới game Yến Vân Thập Lục Thanh vào games188.json');
  }

  // Tải danh sách code từ raw file nếu có
  let rawCodes = [];
  if (fs.existsSync(RAW_CODES_FILE)) {
    try {
      const rawData = JSON.parse(fs.readFileSync(RAW_CODES_FILE, 'utf8'));
      if (Array.isArray(rawData.active)) {
        rawCodes = rawData.active.map(item => ({
          code: item.code,
          rewards: 'Gói quà hiệp khách khám phá Yến Vân thế giới mở'
        }));
      }
    } catch (e) {
      console.warn('Không đọc được raw codes file:', e.message);
    }
  }

  const allCodesToInsert = [...specialVipCodes, ...rawCodes];
  const uniqueCodesMap = new Map();
  for (const c of allCodesToInsert) {
    const val = c.code.trim().toUpperCase();
    if (!uniqueCodesMap.has(val)) {
      uniqueCodesMap.set(val, c.rewards);
    }
  }

  // Cập nhật codes trong crawled_codes_188.json
  const codes = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
  const filteredCodes = codes.filter(c => 
    c.gameSlug !== 'yen-van-thap-luc-thanh' && 
    c.gameId !== 'yen-van-thap-luc-thanh' &&
    c.gameSlug !== 'where-winds-meet' &&
    c.gameId !== 'where-winds-meet'
  );

  const formattedCodes = Array.from(uniqueCodesMap.entries()).map(([codeVal, rewards]) => ({
    id: `funtap-wwm-${codeVal.toLowerCase()}`,
    gameId: 'yen-van-thap-luc-thanh',
    gameSlug: 'yen-van-thap-luc-thanh',
    gameName: 'Yến Vân Thập Lục Thanh (Where Winds Meet)',
    codeValue: codeVal,
    code_value: codeVal,
    rewards: rewards,
    status: 'approved',
    isVerified: true,
    expiresAt: null,
    sourceUrl: 'https://wwm.funtap.games/',
    createdAt: new Date().toISOString()
  }));

  // Gán lại count
  gameData.free_codes_count = formattedCodes.length;
  if (existingIdx >= 0) {
    games[existingIdx] = gameData;
  } else {
    games[0] = gameData;
  }

  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');
  if (fs.existsSync(PUBLIC_GAMES_FILE)) {
    fs.writeFileSync(PUBLIC_GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');
  }

  const mergedCodes = [...formattedCodes, ...filteredCodes];
  fs.writeFileSync(CODES_FILE, JSON.stringify(mergedCodes, null, 2), 'utf8');
  if (fs.existsSync(PUBLIC_CODES_FILE)) {
    fs.writeFileSync(PUBLIC_CODES_FILE, JSON.stringify(mergedCodes, null, 2), 'utf8');
  }

  console.log(`✓ Đã nạp thành công ${formattedCodes.length} mã giftcode cho Yến Vân Thập Lục Thanh!`);
  console.log('=== HOÀN TẤT CẬP NHẬT DỮ LIỆU ===');
}

run();
