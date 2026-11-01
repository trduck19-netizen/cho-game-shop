const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_LOGO = path.join(ROOT, 'public/logo.png');
const RES_DIR = path.join(ROOT, 'android/app/src/main/res');

// Brand background color
const BG_COLOR = '#0B0D19';
const BG_RGB = { r: 11, g: 13, b: 25 };

// Icon densities and sizes
const DENSITIES = {
  mdpi: { launcher: 48, foreground: 108 },
  hdpi: { launcher: 72, foreground: 162 },
  xhdpi: { launcher: 96, foreground: 216 },
  xxhdpi: { launcher: 144, foreground: 324 },
  xxxhdpi: { launcher: 192, foreground: 432 }
};

// Splash screen dimensions
const SPLASH_SIZES = {
  'drawable': { width: 480, height: 320 },
  'drawable-land-mdpi': { width: 480, height: 320 },
  'drawable-land-hdpi': { width: 800, height: 480 },
  'drawable-land-xhdpi': { width: 1280, height: 720 },
  'drawable-land-xxhdpi': { width: 1600, height: 960 },
  'drawable-land-xxxhdpi': { width: 1920, height: 1280 },
  'drawable-port-mdpi': { width: 320, height: 480 },
  'drawable-port-hdpi': { width: 480, height: 800 },
  'drawable-port-xhdpi': { width: 720, height: 1280 },
  'drawable-port-xxhdpi': { width: 960, height: 1600 },
  'drawable-port-xxxhdpi': { width: 1280, height: 1920 }
};

async function generateLauncherIcon(size, targetPath) {
  // Square / rounded launcher icon
  // Create rounded rectangle mask with rx = size * 0.18
  const rx = Math.round(size * 0.18);
  const maskSvg = `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rx}" fill="#fff"/></svg>`;

  const resizedLogo = await sharp(SOURCE_LOGO)
    .resize(size, size, { fit: 'cover' })
    .toBuffer();

  await sharp(resizedLogo)
    .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
    .png()
    .toFile(targetPath);
}

async function generateRoundLauncherIcon(size, targetPath) {
  // Circular mask
  const radius = size / 2;
  const maskSvg = `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`;

  const resizedLogo = await sharp(SOURCE_LOGO)
    .resize(size, size, { fit: 'cover' })
    .toBuffer();

  await sharp(resizedLogo)
    .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
    .png()
    .toFile(targetPath);
}

async function generateForegroundIcon(size, targetPath) {
  // Adaptive icon foreground: canvas is `size` (e.g. 432 for xxxhdpi)
  // Inner safe zone is 72/108 = 66.6%. We scale logo to ~68% of the canvas.
  const innerSize = Math.round(size * 0.68);
  const offset = Math.round((size - innerSize) / 2);

  const innerLogo = await sharp(SOURCE_LOGO)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Transparent base canvas
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: innerLogo,
        top: offset,
        left: offset
      }
    ])
    .png()
    .toFile(targetPath);
}

async function generateSplashScreen(width, height, targetPath) {
  // Splash screen with centered logo
  const logoSize = Math.min(Math.round(Math.min(width, height) * 0.45), 512);

  const resizedLogo = await sharp(SOURCE_LOGO)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .toBuffer();

  const left = Math.round((width - logoSize) / 2);
  const top = Math.round((height - logoSize) / 2);

  await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { ...BG_RGB, alpha: 1 }
    }
  })
    .composite([
      {
        input: resizedLogo,
        top: top,
        left: left
      }
    ])
    .png()
    .toFile(targetPath);
}

async function main() {
  console.log('🚀 Bắt đầu tạo toàn bộ icon và splash screen chuẩn Web CodeGame cho Android APK...');

  // 1. Generate Mipmap Icons
  for (const [density, sizes] of Object.entries(DENSITIES)) {
    const dir = path.join(RES_DIR, `mipmap-${density}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const launcherPath = path.join(dir, 'ic_launcher.png');
    const roundPath = path.join(dir, 'ic_launcher_round.png');
    const foregroundPath = path.join(dir, 'ic_launcher_foreground.png');

    console.log(`[mipmap-${density}] Tạo ic_launcher (${sizes.launcher}x${sizes.launcher})...`);
    await generateLauncherIcon(sizes.launcher, launcherPath);

    console.log(`[mipmap-${density}] Tạo ic_launcher_round (${sizes.launcher}x${sizes.launcher})...`);
    await generateRoundLauncherIcon(sizes.launcher, roundPath);

    console.log(`[mipmap-${density}] Tạo ic_launcher_foreground (${sizes.foreground}x${sizes.foreground})...`);
    await generateForegroundIcon(sizes.foreground, foregroundPath);
  }

  // 2. Generate Splash Screens
  for (const [folder, dims] of Object.entries(SPLASH_SIZES)) {
    const dir = path.join(RES_DIR, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const splashPath = path.join(dir, 'splash.png');
    console.log(`[${folder}] Tạo splash.png (${dims.width}x${dims.height})...`);
    await generateSplashScreen(dims.width, dims.height, splashPath);
  }

  // 3. Update ic_launcher_background.xml in values/
  const bgXmlPath = path.join(RES_DIR, 'values/ic_launcher_background.xml');
  const bgXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_COLOR}</color>
</resources>
`;
  fs.writeFileSync(bgXmlPath, bgXmlContent, 'utf8');
  console.log(`✓ Đã cập nhật ${bgXmlPath} với màu nền chuẩn: ${BG_COLOR}`);

  // 4. Update drawable/ic_launcher_background.xml (Solid dark vector background)
  const drawableBgPath = path.join(RES_DIR, 'drawable/ic_launcher_background.xml');
  const drawableBgContent = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="${BG_COLOR}"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`;
  fs.writeFileSync(drawableBgPath, drawableBgContent, 'utf8');
  console.log(`✓ Đã cập nhật ${drawableBgPath} sang màu nền thương hiệu ${BG_COLOR}`);

  // 5. Remove or replace drawable-v24/ic_launcher_foreground.xml (Android robot vector)
  // Deleting it ensures Android API 24+ loads the high-res PNG from mipmap/ic_launcher_foreground
  const v24ForegroundPath = path.join(RES_DIR, 'drawable-v24/ic_launcher_foreground.xml');
  if (fs.existsSync(v24ForegroundPath)) {
    fs.unlinkSync(v24ForegroundPath);
    console.log(`✓ Đã xóa file robot vector cũ: ${v24ForegroundPath}`);
  }

  console.log('\n🎉 THÀNH CÔNG: Toàn bộ icon Android và màn hình chờ APK đã được chuẩn hóa 100% theo logo chính thức của web!');
}

main().catch(err => {
  console.error('Lỗi tạo icon:', err);
  process.exit(1);
});
