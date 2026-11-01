import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../');

async function updateDeltaForceCodes() {
  console.log('=== CẬP NHẬT GIFTCODE DELTA FORCE TỪ XEMGI.TODAY ===');

  // 1. Fetch live codes from xemgi.today API
  console.log('1. Đang tải mã từ https://xemgi.today/api/esports/codes ...');
  const res = await fetch('https://xemgi.today/api/esports/codes', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Tải dữ liệu thất bại từ xemgi.today: HTTP ${res.status}`);
  }

  const data = await res.json();
  const dfData = (data.codes || []).find((g) => g.gameId === 'delta-force');

  if (!dfData) {
    throw new Error('Không tìm thấy dữ liệu Delta Force trong response xemgi.today');
  }

  const specialCodes = dfData.specialCodes || [];
  const normalCodes = dfData.codes || [];
  const allCodesRaw = [...specialCodes, ...normalCodes];
  const uniqueCodes = [...new Set(allCodesRaw.map((c) => c.trim()))].filter(Boolean);

  console.log(`✓ Đã nhận ${specialCodes.length} mã mở khóa nhân vật + ${normalCodes.length} mã thường.`);
  console.log(`✓ Tổng cộng: ${uniqueCodes.length} mã độc nhất.`);

  // 2. Chuẩn hóa phần thưởng chi tiết
  function getRewards(code, isSpecial) {
    if (isSpecial || code.startsWith('DFVN')) {
      if (code.includes('Hackclaw')) return 'Mở khóa đặc vụ Hackclaw & Quà tân thủ';
      if (code.includes('Vyron')) return 'Mở khóa đặc vụ Vyron & Quà tân thủ';
      if (code.includes('Uluru')) return 'Mở khóa đặc vụ Uluru & Quà tân thủ';
      if (code.includes('Toxik')) return 'Mở khóa đặc vụ Toxik & Quà tân thủ';
      if (code.includes('Nox')) return 'Mở khóa đặc vụ Nox & Quà tân thủ';
      if (code.includes('Sineva')) return 'Mở khóa đặc vụ Sineva & Quà tân thủ';
      return 'Mở khóa nhân vật đặc vụ & Quà tân thủ';
    }
    if (code.startsWith('DFUTSCARH')) return 'Súng trường SCAR-H độc quyền & Skin súng tác chiến';
    if (code.startsWith('DFUTWEAPON')) return 'Gói vũ khí tác chiến quân sự cấp cao';
    if (code.startsWith('DFUTGEARTICKET')) return 'Vé đổi quân trang & Trang bị cao cấp';
    if (code.startsWith('DFUTINTERMEDIATE')) return 'Hòm tiếp tế trung cấp & Hộp đạn dược';
    if (code.startsWith('DFUTSUPPYPACK')) return 'Gói quân nhu tiếp tế toàn diện';
    if (code.startsWith('DFUTARMAMENT')) return 'Quân trang tinh nhuệ & Thẻ kinh nghiệm';
    if (code.startsWith('DFUT')) return 'Gói quà giải đấu DFUT Winter 2026';
    if (code.startsWith('PWC')) return 'Gói quà giải đấu PWC Championship 2026';
    if (code.startsWith('GARENA') || code.startsWith('DELTAFORCEVN')) return 'Giftcode máy chủ Garena Việt Nam chính thức';
    if (code.startsWith('POC')) return 'Hòm tiếp tế chiến thuật POC';
    if (code.startsWith('MOILOOT')) return 'Hòm trang bị chiến lợi phẩm MOILOOT';
    if (code.startsWith('TRILLIONRAID')) return 'Gói tài nguyên Trillion Raid VIP';
    if (code.startsWith('HEDELTAFORCE')) return 'Quà sự kiện Delta Force độc quyền';
    if (code.startsWith('DFOSS') || code.startsWith('DFOS')) return 'Vé trang bị tác chiến đặc biệt DFOS';
    if (code.startsWith('daichien')) return 'Quà sự kiện Đại Chiến Mobile VIP';
    if (code.startsWith('DFDRAGONBOAT')) return 'Quà sự kiện Lễ hội Thuyền Rồng';
    if (code.toLowerCase().includes('trickortreat')) return 'Quà sự kiện Halloween đặc biệt';
    if (code.includes('SUBS')) return 'Quà tri ân cột mốc Subscribers YouTube';
    if (code.startsWith('ReturningWarrior')) return 'Quà tái xuất chiến trường (Returning Warrior)';
    return 'Giftcode Delta Force chính thức (XemGì / NPH Garena)';
  }

  const specialSet = new Set(specialCodes);
  const nowIso = new Date().toISOString();

  const formattedCodes = uniqueCodes.map((code) => {
    const isSpecial = specialSet.has(code);
    return {
      id: `xemgi-delta-force-${code}`,
      gameId: 'delta-force',
      gameSlug: 'delta-force',
      gameName: 'Delta Force',
      codeValue: code,
      code_value: code,
      rewards: getRewards(code, isSpecial),
      status: 'approved',
      isVerified: true,
      expiresAt: null,
      sourceUrl: 'https://xemgi.today/codes',
      createdAt: nowIso,
    };
  });

  // 3. Cập nhật src/client/data/crawled_codes_188.json
  const crawledPath = path.join(ROOT, 'src/client/data/crawled_codes_188.json');
  const existingCrawled = JSON.parse(fs.readFileSync(crawledPath, 'utf8'));

  // Lọc bỏ mã cũ của delta-force
  const filteredCrawled = existingCrawled.filter(
    (c) =>
      c.gameId !== 'delta-force' &&
      c.gameSlug !== 'delta-force' &&
      c.gameName !== 'Delta Force'
  );

  // Thêm toàn bộ mã mới (đặt 6 mã đặc biệt mở nhân vật lên đầu, sau đó là các mã còn lại)
  const newCrawled = [...formattedCodes, ...filteredCrawled];
  fs.writeFileSync(crawledPath, JSON.stringify(newCrawled, null, 2), 'utf8');
  console.log(`✓ Đã cập nhật ${crawledPath}: tổng cộng ${newCrawled.length} mã (Delta Force có ${formattedCodes.length} mã).`);

  // 4. Cập nhật src/client/data/games188.json
  const gamesPath = path.join(ROOT, 'src/client/data/games188.json');
  const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

  let dfFound = false;
  for (const g of games) {
    if (g.slug === 'delta-force' || g.id === 'delta-force') {
      dfFound = true;
      g.free_codes_count = formattedCodes.length;
      g.redeem_url = 'https://redeem.df.garena.sg/vi/cdkgarena.html';
      g.isHot = true;
      g.isNew = true;
      if (g.license) {
        g.license.website_g1 = 'https://redeem.df.garena.sg/vi/cdkgarena.html';
      }
      break;
    }
  }

  if (dfFound) {
    fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf8');
    console.log(`✓ Đã cập nhật ${gamesPath}: free_codes_count = ${formattedCodes.length}, redeem_url = https://redeem.df.garena.sg/vi/cdkgarena.html`);
  } else {
    console.warn('Cảnh báo: Không tìm thấy game delta-force trong games188.json');
  }

  console.log('=== HOÀN TẤT CẬP NHẬT DỮ LIỆU ===');
}

updateDeltaForceCodes().catch((err) => {
  console.error('Lỗi cập nhật:', err);
  process.exit(1);
});
