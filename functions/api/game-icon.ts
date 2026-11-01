/**
 * Cloudflare Pages Functions - Edge Game Icon Proxy & Caching Endpoint
 * Route: /api/game-icon
 * 
 * Đảm bảo 100% hình ảnh logo game được phân phối trơn tru, chống chặn bởi Adblock,
 * chống lỗi cross-origin (CORS) và tối ưu hóa thời gian tải bằng Cloudflare Edge Cache.
 */

interface Env {
  DB?: D1Database;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const urlObj = new URL(context.request.url);
  const targetUrl = urlObj.searchParams.get('url') || '';
  const slug = urlObj.searchParams.get('slug') || '';
  let pkg = urlObj.searchParams.get('pkg') || '';

  if (!targetUrl && !slug && !pkg) {
    return new Response('Thiếu tham số url, slug hoặc pkg', { status: 400, headers: CORS_HEADERS });
  }

  // 1. Kiểm tra Cloudflare Edge Cache
  const cache = (caches as any).default;
  const cacheKey = new Request(context.request.url, context.request);
  try {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch {}

  // 2. Nếu có targetUrl trực tiếp (URL remote hợp lệ)
  if (targetUrl && targetUrl.startsWith('http') && !targetUrl.includes('codemoi.net')) {
    try {
      let referer = 'https://play.google.com/';
      if (targetUrl.includes('apple.com') || targetUrl.includes('mzstatic.com')) {
        referer = 'https://apps.apple.com/';
      }

      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': referer,
        },
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/webp';
        const proxyResponse = new Response(res.body, {
          status: 200,
          headers: new Headers({
            ...CORS_HEADERS,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
            'X-Image-Proxy-By': 'CodeGame-Edge-CDN',
          }),
        });
        try {
          cache.put(cacheKey, proxyResponse.clone());
        } catch {}
        return proxyResponse;
      }
    } catch {}
  }

  // 3. Nếu có slug, thử nạp file tĩnh cục bộ (.webp hoặc .jpg)
  if (slug) {
    try {
      const localWebpUrl = `${urlObj.origin}/game_icons/${slug}.webp`;
      const localRes = await fetch(localWebpUrl);
      if (localRes.ok) {
        const contentType = localRes.headers.get('content-type') || 'image/webp';
        const proxyResponse = new Response(localRes.body, {
          status: 200,
          headers: new Headers({
            ...CORS_HEADERS,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
            'X-Image-Proxy-By': 'CodeGame-Local-Static',
          }),
        });
        try {
          cache.put(cacheKey, proxyResponse.clone());
        } catch {}
        return proxyResponse;
      }

      // Thử file .jpg
      const localJpgUrl = `${urlObj.origin}/game_icons/${slug}.jpg`;
      const localJpgRes = await fetch(localJpgUrl);
      if (localJpgRes.ok) {
        const proxyResponse = new Response(localJpgRes.body, {
          status: 200,
          headers: new Headers({
            ...CORS_HEADERS,
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
            'X-Image-Proxy-By': 'CodeGame-Local-JPG',
          }),
        });
        try {
          cache.put(cacheKey, proxyResponse.clone());
        } catch {}
        return proxyResponse;
      }
    } catch {}
  }

  // 4. Fallback: Tra cứu Google Play Store theo package (từ param hoặc tra cứu D1)
  try {
    if (!pkg && slug && context.env?.DB) {
      try {
        const row: any = await context.env.DB.prepare(
          'SELECT android_package_name, google_play_url, icon_url FROM games WHERE slug = ? LIMIT 1'
        ).bind(slug).first();
        if (row) {
          if (row.android_package_name) {
            pkg = row.android_package_name;
          } else if (row.google_play_url) {
            const m = row.google_play_url.match(/id=([a-zA-Z0-9._]+)/);
            if (m) pkg = m[1];
          }
          if (row.icon_url && row.icon_url.startsWith('http') && !row.icon_url.includes('codemoi.net')) {
            const remoteRes = await fetch(row.icon_url);
            if (remoteRes.ok) {
              const proxyResponse = new Response(remoteRes.body, {
                status: 200,
                headers: new Headers({
                  ...CORS_HEADERS,
                  'Content-Type': remoteRes.headers.get('content-type') || 'image/webp',
                  'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
                  'X-Image-Proxy-By': 'CodeGame-D1-RemoteIcon',
                }),
              });
              try {
                cache.put(cacheKey, proxyResponse.clone());
              } catch {}
              return proxyResponse;
            }
          }
        }
      } catch {}
    }

    if (pkg) {
      const gpUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=vi&gl=VN`;
      const gpRes = await fetch(gpUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'vi,en;q=0.9',
        },
      });

      if (gpRes.ok) {
        const html = await gpRes.text();
        const iconMatch = html.match(/<img[^>]+src="(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)"[^>]+(?:itemprop="image"|alt="Biểu tượng ảnh"|alt="Icon image")/i) ||
                          html.match(/"(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)=s/i);
        if (iconMatch) {
          const playIconUrl = `${iconMatch[1]}=s256-rw`;
          const iconRes = await fetch(playIconUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': 'https://play.google.com/',
            },
          });
          if (iconRes.ok) {
            const contentType = iconRes.headers.get('content-type') || 'image/webp';
            const proxyResponse = new Response(iconRes.body, {
              status: 200,
              headers: new Headers({
                ...CORS_HEADERS,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
                'X-Image-Proxy-By': 'CodeGame-Edge-GooglePlay',
              }),
            });
            try {
              cache.put(cacheKey, proxyResponse.clone());
            } catch {}
            return proxyResponse;
          }
        }
      }
    }
  } catch {}

  // 5. Fallback cuối cùng: Trả về placeholder SVG tinh tế
  return generateFallbackSvgResponse(slug);
};

function generateFallbackSvgResponse(seed: string) {
  const label = (seed || 'GAME').slice(0, 3).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
      <linearGradient id="t" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#34d399"/>
        <stop offset="100%" stop-color="#38bdf8"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="56" fill="url(#g)"/>
    <rect x="8" y="8" width="240" height="240" rx="48" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" fill="url(#t)" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">${label}</text>
  </svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'image/svg+xml;charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
