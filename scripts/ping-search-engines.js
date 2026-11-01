import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = 'codegame.shop';
const KEY = 'e47e8c3bf4d84f8db27da7c55cb8e30b';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function pingSearchEngines() {
  console.log('========================================================');
  console.log('[SEO PING] Khởi động tự động thông báo công cụ tìm kiếm...');
  console.log('========================================================');

  // 1. Đọc danh sách URLs từ sitemap.xml
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('[SEO PING] Không tìm thấy public/sitemap.xml. Vui lòng chạy build trước!');
    return;
  }

  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const locRegex = /<loc>(https:\/\/codegame\.shop[^<]+)<\/loc>/g;
  const urls = [];
  let match;
  while ((match = locRegex.exec(sitemapXml)) !== null) {
    urls.push(match[1]);
  }

  console.log(`[SEO PING] Đã tìm thấy ${urls.length} URLs trong sitemap.xml`);

  // 2. Chuẩn bị payload IndexNow (Bing, Cốc Cốc, Yandex, Naver)
  const indexNowPayload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls
  };

  const endpoints = [
    { name: 'Bing IndexNow', url: 'https://www.bing.com/indexnow' },
    { name: 'IndexNow Global API', url: 'https://api.indexnow.org/indexnow' }
  ];

  for (const ep of endpoints) {
    try {
      console.log(`[SEO PING] Đang gửi ${urls.length} URLs đến ${ep.name} (${ep.url})...`);
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(indexNowPayload)
      });

      console.log(`[SEO PING] ${ep.name} Response: Status ${res.status} ${res.statusText}`);
      if (res.status === 200 || res.status === 202) {
        console.log(`  => Thành công! Toàn bộ ${urls.length} URLs đã được ghi nhận vào hàng đợi lập chỉ mục của ${ep.name}.`);
      } else {
        const text = await res.text();
        console.log(`  => Phản hồi: ${text}`);
      }
    } catch (err) {
      console.warn(`[SEO PING] Lỗi kết nối tới ${ep.name}:`, err.message);
    }
  }

  console.log('========================================================');
  console.log('[SEO PING] Hoàn tất quá trình gửi thông báo chỉ mục!');
  console.log('========================================================');
}

pingSearchEngines().catch((err) => {
  console.error('[SEO PING] Lỗi thực thi:', err);
});
