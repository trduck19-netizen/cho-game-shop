const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..', 'backup_restored_deployments');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`[${res.status}] Skip/Not found: ${url}`);
      return false;
    }
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    console.log(`✓ Đã lưu: ${path.relative(baseDir, destPath)} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.error(`✗ Lỗi tải ${url}:`, err.message);
    return false;
  }
}

async function backupSite(siteUrl, siteName) {
  console.log('\n======================================================');
  console.log(`📦 BẮT ĐẦU TẢI BẢN TRIỂN KHAI: ${siteName}`);
  console.log(`🌐 Nguồn: ${siteUrl}`);
  console.log('======================================================');

  const targetDir = path.join(baseDir, siteName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Tải index.html
  const htmlUrl = `${siteUrl}/`;
  const htmlPath = path.join(targetDir, 'index.html');
  const ok = await downloadFile(htmlUrl, htmlPath);
  if (!ok) return;

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Trích xuất các tệp script và CSS
  const urlsToDownload = new Set();
  const scriptMatches = htmlContent.match(/src=["'](\/[^"']+)["']/g) || [];
  const cssMatches = htmlContent.match(/href=["'](\/[^"']+)["']/g) || [];

  for (const m of scriptMatches) {
    const clean = m.replace(/^src=["']/, '').replace(/["']$/, '');
    if (!clean.startsWith('//') && !clean.startsWith('http')) urlsToDownload.add(clean);
  }

  for (const m of cssMatches) {
    const clean = m.replace(/^href=["']/, '').replace(/["']$/, '');
    if (!clean.startsWith('//') && !clean.startsWith('http') && !clean.includes('fonts.googleapis')) {
      urlsToDownload.add(clean);
    }
  }

  // Thêm các tệp tài nguyên tĩnh phổ biến
  urlsToDownload.add('/sync-bridge.html');
  urlsToDownload.add('/vite.svg');
  urlsToDownload.add('/_headers');

  // 2. Tải các tệp trích xuất
  for (const rel of urlsToDownload) {
    const fileUrl = `${siteUrl}${rel}`;
    const dest = path.join(targetDir, rel.replace(/^\//, '').replace(/\//g, path.sep));
    await downloadFile(fileUrl, dest);
  }

  // 3. Quét tệp JS bundle để trích xuất thêm các lazy chunks nếu có
  const jsFiles = Array.from(urlsToDownload).filter((u) => u.endsWith('.js'));
  for (const jsRel of jsFiles) {
    const localJsPath = path.join(targetDir, jsRel.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(localJsPath)) {
      const jsCode = fs.readFileSync(localJsPath, 'utf8');
      const chunkMatches = jsCode.match(/"\/assets\/[a-zA-Z0-9_-]+\.(js|css|webp|png|jpg|svg)"/g) || [];
      for (const m of chunkMatches) {
        const cleanRel = m.replace(/"/g, '');
        const chunkDest = path.join(targetDir, cleanRel.replace(/^\//, '').replace(/\//g, path.sep));
        if (!fs.existsSync(chunkDest)) {
          await downloadFile(`${siteUrl}${cleanRel}`, chunkDest);
        }
      }
    }
  }

  console.log(`✨ Hoàn thành sao lưu ${siteName} vào: ${targetDir}`);
}

async function run() {
  await backupSite('https://web-code-game.pages.dev', 'web-code-game');
  await backupSite('https://admin-code-game-shop.pages.dev', 'admin-code-game-shop');

  console.log('\n======================================================');
  console.log('🎉 TẤT CẢ 2 BẢN TRIỂN KHAI ĐÃ ĐƯỢC TẢI VÀ LƯU AN TOÀN!');
  console.log(`📁 Thư mục lưu: ${baseDir}`);
  console.log('======================================================\n');
}

run();
