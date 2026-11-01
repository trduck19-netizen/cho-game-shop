const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const iconsDir = path.resolve(__dirname, '../public/game_icons');
  if (!fs.existsSync(iconsDir)) {
    console.error('Không tìm thấy thư mục', iconsDir);
    return;
  }

  const files = fs.readdirSync(iconsDir).filter(f => f.endsWith('.webp'));
  console.log(`Bắt đầu chuyển đổi ${files.length} icon webp sang jpg cho Open Graph / Zalo / Facebook...`);

  let count = 0;
  for (const file of files) {
    const webpPath = path.join(iconsDir, file);
    const jpgName = file.replace(/\.webp$/i, '.jpg');
    const jpgPath = path.join(iconsDir, jpgName);

    try {
      await sharp(webpPath)
        .flatten({ background: { r: 15, g: 23, b: 42 } }) // #0f172a dark slate background if transparent
        .jpeg({ quality: 90 })
        .toFile(jpgPath);
      count++;
    } catch (err) {
      console.warn(`Lỗi convert ${file}:`, err.message);
    }
  }

  console.log(`Đã xuất bản thành công ${count}/${files.length} file JPG chuẩn Open Graph!`);
}

main().catch(console.error);
