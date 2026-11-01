import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://codegame.shop';
const todayIso = new Date().toISOString().split('T')[0];

function convertToIsoDate(dStr) {
  if (!dStr) return todayIso;
  const clean = String(dStr).trim();
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return clean;
  }
  return todayIso;
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSitemap() {
  const gamesPath = fs.existsSync(path.resolve(__dirname, '../public/data/games188.json'))
    ? path.resolve(__dirname, '../public/data/games188.json')
    : path.resolve(__dirname, '../src/data/games188.json');
  const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

  const staticUrls = [
    {
      loc: `${BASE_URL}/`,
      lastmod: todayIso,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      loc: `${BASE_URL}/giveaways`,
      lastmod: todayIso,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      loc: `${BASE_URL}/store`,
      lastmod: todayIso,
      changefreq: 'daily',
      priority: '0.8',
    },
  ];

  const gameUrls = games.map((game) => {
    const slug = game.slug || game.id;
    const lastmod = convertToIsoDate(game.release_date || game.ngay_cap_phep);
    const imgUrl = game.icon_url || game.cover_image_url || `${BASE_URL}/game_icons/${slug}.webp`;
    const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `${BASE_URL}${imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`}`;
    return {
      loc: `${BASE_URL}/game/${encodeURIComponent(slug)}`,
      lastmod,
      changefreq: 'weekly',
      priority: '0.8',
      image: {
        loc: fullImgUrl,
        title: `Giftcode ${game.name} mới nhất 2026`,
        caption: `Mã giftcode và hướng dẫn nhận quà game ${game.name} bản quyền G1`,
      },
    };
  });

  const allUrls = [...staticUrls, ...gameUrls];

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${
      u.image
        ? `
    <image:image>
      <image:loc>${escapeXml(u.image.loc)}</image:loc>
      <image:title>${escapeXml(u.image.title)}</image:title>
      <image:caption>${escapeXml(u.image.caption)}</image:caption>
    </image:image>`
        : ''
    }
  </url>`
  )
  .join('\n')}
</urlset>
`;

  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPublicPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPublicPath, xmlContent.trim() + '\n', 'utf8');
  console.log(`[Sitemap] Đã tạo thành công sitemap.xml tại ${sitemapPublicPath} (${allUrls.length} URLs).`);

  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    const sitemapDistPath = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(sitemapDistPath, xmlContent.trim() + '\n', 'utf8');
    console.log(`[Sitemap] Đã sao chép sang ${sitemapDistPath}`);
  }
}

generateSitemap().catch((err) => {
  console.error('[Sitemap] Lỗi khi tạo sitemap:', err);
  process.exit(1);
});
