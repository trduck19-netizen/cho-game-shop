const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const GAMES_FILE = path.join(ROOT, 'src/client/data/games188.json');
const CODES_FILE = path.join(ROOT, 'src/client/data/crawled_codes_188.json');
const PUBLIC_GAMES_FILE = path.join(ROOT, 'public/data/games188.json');
const PUBLIC_CODES_FILE = path.join(ROOT, 'public/data/crawled_codes_188.json');

const ICON_DIR = path.join(ROOT, 'public/game_icons');
const ICON_URL = 'https://ssg.mediacdn.vn/developer/SG451/icon-app/1784619141-96890-200.png';

async function downloadIcon(url, targetPng, targetWebp) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`Download returned status: ${res.statusCode}`);
        return resolve(false);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(targetPng, buffer);
        fs.writeFileSync(targetWebp, buffer);
        console.log(`✓ Đã lưu icon thành công: ${targetPng} và ${targetWebp}`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.warn('Lỗi tải icon:', err.message);
      resolve(false);
    });
  });
}

const codesRaw = [
  { code: 'HANHI999', rewards: '1000 Kim Phiếu + Rương Tướng Hạng A Tùy Chọn + 50 Vạn Bạc' },
  { code: 'NGANSATTHU999', rewards: '10 Vé Chiêu Mộ Danh Tướng Tứ Thời + 100 Đan Đột Phá' },
  { code: 'THAIVU999', rewards: '888 Kim Phiếu + Thần Khí Trảm Long + 20 Đá Cường Hóa' },
  { code: 'TONTHUONGHUONG888', rewards: 'Danh Tướng Tôn Thượng Hương (SSR) + Cung Lạc Phượng' },
  { code: 'HANGVU888', rewards: 'Danh Tướng Hạng Vũ (Bá Vương) + 500 Kim Phiếu' },
  { code: 'HANHIVAR', rewards: '5 Vé Quay Tướng Tứ Thời + 50 Vạn Exp Tướng' },
  { code: 'NGANVAR', rewards: '500 Kim Phiếu + Rương Bảo Vật Tự Chọn Hạng A' },
  { code: 'THAIVUVAR', rewards: '10 Rương Ngọc Khảm Cao Cấp + 20 Vé Tầm Bảo' },
  { code: 'TUTHOIGA666', rewards: '666 Kim Phiếu + 66 Vạn Bạc + 6 Vé Quay' },
  { code: 'TAMQUOC888', rewards: '888 Kim Phiếu + Thẻ Thể Lực VIP + 50 Đá Tôi Luyện' },
  { code: 'HANGA999', rewards: 'Rương Tướng SSR Hạng A Đặc Biệt + 1000 Kim Phiếu' },
  { code: 'VARXUYENTHOIDAI', rewards: 'Danh Hiệu Độc Quyền "VAR Xuyên Thời Đại" + 500 Kim Phiếu' },
  { code: 'DANHTUONGA', rewards: 'Gói Phúc Lợi Danh Tướng + 20 Vé Chiêu Mộ' },
  { code: 'FREE1000QUAY', rewards: '1000 Lượt Quay Tướng Miễn Phí (Chia Đều Các Mốc Cấp Độ)' },
  { code: 'FREESSR999', rewards: 'Rương Tướng SSR Độc Quyền Tự Chọn Tân Thủ' },
  { code: 'FREEVIP10', rewards: 'Đặc Quyền VIP 10 + 2000 Kim Phiếu + Rương Quà Tân Thủ' },
  { code: 'VIP666', rewards: '666 Kim Phiếu + 5 Rương Trang Bị Hoàng Kim' },
  { code: 'VIP777', rewards: '777 Kim Phiếu + 10 Vé Tầm Bảo Thần Binh' },
  { code: 'VIP888', rewards: '888 Kim Phiếu + Rương Thần Khí Tứ Thời' },
  { code: 'VIP999', rewards: '999 Kim Phiếu + 50 Vé Chiêu Mộ Cao Cấp' },
  { code: 'THAYCONGPHAP', rewards: 'Bộ Bí Tịch Công Pháp Đỉnh Cao + 300 Kim Phiếu' },
  { code: 'DOICHATTUONG', rewards: '500 Kim Phiếu + 10 Đá Chuyển Phái Tướng' },
  { code: 'TEAMHANGA', rewards: 'Rương Đội Hình Hạng A Đột Phá + 50 Vạn Bạc' },
  { code: 'QUAYLAHANGA', rewards: '10 Vé Chiêu Mộ Lại Danh Tướng' },
  { code: 'VARLANGONLUON', rewards: '300 Kim Phiếu + 20 Vạn Bạc + 10 Vé Khiêu Chiến' },
  { code: 'VARDISOGI', rewards: 'Gói Chiến Thuật Không Sợ Bất Kỳ Meta Nào + 500 Kim Phiếu' },
  { code: 'METAKHONGLOI', rewards: '1000 Kim Phiếu + 50 Đá Đột Phá Kỹ Năng' },
  { code: 'QUANVU888', rewards: 'Danh Tướng Quan Vũ (Thánh Võ) + Thanh Long Yển Nguyệt Đao' },
  { code: 'TRIEUVAN999', rewards: 'Danh Tướng Triệu Vân (Long Đảm) + Bạch Long Thương' },
  { code: 'LUBO999', rewards: 'Danh Tướng Lữ Bố (Chiến Thần) + Phương Thiên Họa Kích + Xích Thố' }
];

async function run() {
  console.log('=== BẮT ĐẦU THÊM GAME: TAM QUỐC TỨ THỜI CA ===');

  if (!fs.existsSync(ICON_DIR)) {
    fs.mkdirSync(ICON_DIR, { recursive: true });
  }

  const pngPath = path.join(ICON_DIR, 'tam-quoc-tu-thoi-ca.png');
  const webpPath = path.join(ICON_DIR, 'tam-quoc-tu-thoi-ca.webp');
  await downloadIcon(ICON_URL, pngPath, webpPath);

  const gameData = {
    id: 'tam-quoc-tu-thoi-ca',
    name: 'Tam Quốc Tứ Thời Ca',
    slug: 'tam-quoc-tu-thoi-ca',
    publisher: 'SohaGame',
    category: 'Chiến Thuật & Thẻ Tướng',
    rating: 5,
    icon_url: '/game_icons/tam-quoc-tu-thoi-ca.webp',
    cover_image_url: '/game_icons/tam-quoc-tu-thoi-ca.webp',
    banner_url: 'https://psgcdn.sohagame.vn/pub/TkTtKVxU/i18n/vi/bg1.webp',
    description: 'Tam Quốc Tứ Thời Ca là siêu phẩm chiến thuật thẻ tướng quy tụ các danh tướng từ Tần - Hán - Đường trong thế giới Tam Quốc hoàn toàn mới của SohaGame. Tự do xây dựng đội hình, VAR xuyên thời đại và nhận trọn bộ 30+ giftcode độc quyền tháng 09/2026.',
    instructions: '1. Mở game Tam Quốc Tứ Thời Ca trên điện thoại hoặc giả lập.\n2. Bấm vào biểu tượng Avatar góc trên bên trái màn hình.\n3. Chọn mục Cài Đặt -> Chọn "Đổi Mã Quà" (Giftcode).\n4. Nhập chính xác mã Giftcode và bấm "Xác Nhận" để nhận quà qua Hòm Thư ingame.',
    platform: 'Android, iOS, PC',
    so_giay_phep: '383/QĐ-PTTH&TTĐT',
    ngay_cap_phep: '03/07/2026',
    release_date: '2026-09-16',
    do_tuoi: '18+',
    trang_thai_gp: 'Đang hoạt động',
    website_g1: 'https://tamquoctuthoica.sohagame.vn',
    redeem_url: 'https://nap.sohagame.vn/tamquoctuthoica',
    isFeatured: true,
    isHot: true,
    isNew: true,
    free_codes_count: codesRaw.length,
    paid_codes_count: 0,
    nguon_doi_chieu: 'ABEI & SohaGame'
  };

  // Cập nhật games188.json
  const games = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  const existingIdx = games.findIndex(g => g.slug === 'tam-quoc-tu-thoi-ca' || g.id === 'tam-quoc-tu-thoi-ca');
  if (existingIdx >= 0) {
    games[existingIdx] = gameData;
    console.log('✓ Đã cập nhật game Tam Quốc Tứ Thời Ca trong danh mục.');
  } else {
    games.unshift(gameData);
    console.log('✓ Đã thêm game Tam Quốc Tứ Thời Ca lên đầu danh mục.');
  }
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');

  if (fs.existsSync(PUBLIC_GAMES_FILE)) {
    fs.writeFileSync(PUBLIC_GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');
  }

  // Cập nhật crawled_codes_188.json
  const codes = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
  const filteredCodes = codes.filter(c => c.gameSlug !== 'tam-quoc-tu-thoi-ca' && c.gameId !== 'tam-quoc-tu-thoi-ca');

  const newCodes = codesRaw.map((item) => ({
    id: `sohagame-tam-quoc-tu-thoi-ca-${item.code.toLowerCase()}`,
    gameId: 'tam-quoc-tu-thoi-ca',
    gameSlug: 'tam-quoc-tu-thoi-ca',
    gameName: 'Tam Quốc Tứ Thời Ca',
    codeValue: item.code,
    code_value: item.code,
    rewards: item.rewards,
    status: 'approved',
    isVerified: true,
    expiresAt: '2026-12-31',
    sourceUrl: 'https://tamquoctuthoica.sohagame.vn',
    createdAt: new Date().toISOString()
  }));

  const mergedCodes = [...newCodes, ...filteredCodes];
  fs.writeFileSync(CODES_FILE, JSON.stringify(mergedCodes, null, 2), 'utf8');

  if (fs.existsSync(PUBLIC_CODES_FILE)) {
    fs.writeFileSync(PUBLIC_CODES_FILE, JSON.stringify(mergedCodes, null, 2), 'utf8');
  }

  console.log(`✓ Đã thêm thành công ${newCodes.length} mã giftcode mới cho Tam Quốc Tứ Thời Ca!`);
  console.log('=== HOÀN TẤT ĐỒNG BỘ DỮ LIỆU ===');
}

run();
