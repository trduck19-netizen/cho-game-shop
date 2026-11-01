/**
 * Web Scraper: Quét bài viết tổng hợp giftcode từ các chuyên trang game uy tín
 */

const https = require('https');
const http = require('http');
const { isValidGiftCode, VALID_CODE_PREFIXES } = require('../engine/code_filter.cjs');

function fetchUrl(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
      },
      timeout: 8000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectTarget = res.headers.location;
        if (!redirectTarget.startsWith('http')) {
          redirectTarget = new URL(redirectTarget, url).href;
        }
        return fetchUrl(redirectTarget, maxRedirects - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function cleanCodeCandidate(raw = '') {
  return String(raw || '').trim().replace(/^[^A-Za-z0-9_-]+|[^A-Za-z0-9_-]+$/g, '');
}

/**
 * Trích xuất ngày xuất bản / cập nhật của bài viết từ HTML
 */
function extractArticleDate(html = '') {
  if (!html) return null;
  // 1. Meta tags chuẩn SEO
  const metaDateRegex = /<meta\s+[^>]*(?:property|name)=["'](?:article:modified_time|article:published_time|og:updated_time|date|pubdate)["']\s+content=["']([^"']+)["']/i;
  const match = metaDateRegex.exec(html);
  if (match && match[1]) {
    const d = new Date(match[1]);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. JSON-LD Schema
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonMatch;
  while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const dateStr = data.dateModified || data.datePublished || data.uploadDate;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
      }
    } catch {}
  }

  return null;
}

function extractCodesFromHtml(html = '', options = {}) {
  const extracted = [];
  if (!html) return extracted;

  const seenCodes = new Set();

  function addCandidate(code, rewards = 'Quà tặng tân thủ & vật phẩm ingame', expiresAt = null, method = 'table_list', isExpired = false) {
    const c = cleanCodeCandidate(code);
    if (!c || seenCodes.has(c.toUpperCase())) return;

    if (isValidGiftCode(c, options)) {
      seenCodes.add(c.toUpperCase());
      extracted.push({
        code: c,
        rewards: rewards.replace(/<[^>]+>/g, '').trim() || 'Quà tân thủ & vật phẩm ingame',
        expiresAt: expiresAt && expiresAt.includes('202') && expiresAt !== '2026-12-31' ? expiresAt : null,
        extractionMethod: method,
        isExpired: Boolean(isExpired),
      });
    }
  }

  // 1. Thẻ mã code chuyên dụng: class chứa code-field, giftcode, promo-code, active-code, card-code
  const codeElementRegex = /<(?:span|div|code|p|button|td)[^>]*class=["'][^"']*(?:code-field|giftcode|promo-code|coupon-code|active-code|redeem-code|card-code)[^"']*["'][^>]*>([A-Za-z0-9_-]{4,28})<\//gi;
  let elemMatch;
  while ((elemMatch = codeElementRegex.exec(html)) !== null) {
    addCandidate(elemMatch[1], undefined, null, 'table_list');
  }

  // 2. Data attributes chứa code (data-clipboard-text, data-code, data-redeem-code)
  const dataAttrRegex = /(?:data-clipboard-text|data-code|data-redeem-code)=["']([A-Za-z0-9_-]{4,28})["']/gi;
  let dataMatch;
  while ((dataMatch = dataAttrRegex.exec(html)) !== null) {
    addCandidate(dataMatch[1], undefined, null, 'table_list');
  }

  // 3. Aria-labels chứa mã quà (vd: "Flag KR37X46J37 as expired", "Copy code ABC123")
  const ariaLabelRegex = /aria-label=["'](?:Flag|Copy|Sao chép)\s+([A-Za-z0-9_-]{4,28})\s+(?:as|code|mã)/gi;
  let ariaMatch;
  while ((ariaMatch = ariaLabelRegex.exec(html)) !== null) {
    const isExp = /expired|hết hạn/i.test(ariaMatch[0]);
    addCandidate(ariaMatch[1], undefined, null, 'table_list', isExp);
  }

  // 4. Tìm trong các bảng <table> (phân loại bảng còn hạn vs bảng hết hạn)
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  for (const table of tables) {
    const isCodeTable = /(code|giftcode|mã|phần thưởng|reward|quà|hạn)/i.test(table);
    if (!isCodeTable) continue;

    const isExpiredTable = /(hết hạn|het han|expired|quá hạn|qua han|đã khóa)/i.test(table);
    const tableRows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    for (const row of tableRows) {
      const isExpiredRow = isExpiredTable || /(hết hạn|het han|expired)/i.test(row);
      const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map((c) =>
        c.replace(/<[^>]+>/g, '').trim()
      );
      if (cells.length >= 2) {
        const codeCand = cleanCodeCandidate(cells[0]);
        const rewardCand = cells[1];
        const expiryCand = cells[2] || '';
        addCandidate(codeCand, rewardCand, expiryCand, 'table_list', isExpiredRow);
      }
    }
  }

  // 5. Tìm pattern dạng "Code: XXXXX", "Giftcode: XXXXX" với văn bản đã lọc sạch ảnh và URLs
  // Làm sạch hoàn toàn thẻ ảnh, SVG, scripts, và các thuộc tính src, href, style, class
  const cleanTextHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<picture[\s\S]*?<\/picture>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<video[\s\S]*?<\/video>/gi, ' ')
    .replace(/\s+(?:src|href|srcset|poster|action|style|class|id|data-[a-z0-9_-]+)=["'][^"']*["']/gi, ' ');

  const strictRegexPatterns = [
    // BẮT BUỘC có ranh giới ký tự phía trước (không phải /, ., - hoặc chữ trong URL), có dấu phân cách rõ ràng:
    /(?:^|[^\w/.-])(?:code|giftcode|mã quà tặng|mã code|promo code)\s*[:=–—\-]\s*([A-Za-z0-9_-]{4,28})\b/gi,
    // Nếu chỉ có khoảng trắng: BẮT BUỘC phải viết hoa TOÀN BỘ VÀ chứa ít nhất một chữ số hoặc tiền tố giftcode chuẩn
    /(?:^|[^\w/.-])(?:code|giftcode|mã quà tặng|mã code|promo code)\s+([A-Z0-9_-]{5,28})\b/g,
    // Thẻ <code> độc lập kèm mô tả
    /<code>([A-Za-z0-9_-]{4,28})<\/code>\s*[:=–—\-]\s*([^<\n]+)/gi,
    // Thẻ <strong>/<b> hoặc <li><strong>: BẮT BUỘC có chữ số hoặc tiền tố quà tặng chuẩn
    /<(?:strong|b)>([A-Za-z0-9_-]{4,28})<\/(?:strong|b)>\s*[:=–—\-]\s*([^<\n]+)/gi,
    /<li>\s*<(?:strong|b|code)>([A-Za-z0-9_-]{4,28})<\/(?:strong|b|code)>\s*[:=–—\-]?\s*([^<\n]+)/gi,
  ];

  for (const reg of strictRegexPatterns) {
    let match;
    while ((match = reg.exec(cleanTextHtml)) !== null) {
      const rawCandidate = match[1];
      const c = cleanCodeCandidate(rawCandidate);
      const r = match[2]?.trim() || 'Quà tặng tân thủ';

      // Lọc nhanh: Nếu mã thuần chữ cái mà KHÔNG có tiền tố code và KHÔNG có dấu gạch nối: BỎ QUA NGAY
      const hasNumber = /\d/.test(c);
      const hasPrefix = VALID_CODE_PREFIXES.test(c);
      const hasDelimiter = (c.includes('-') || c.includes('_')) && c.length >= 7;

      if (!hasNumber && !hasPrefix && !hasDelimiter) {
        continue;
      }

      addCandidate(c, r, null, 'text_context');
    }
  }

  return extracted;
}

class WebScraper {
  async scrapeSource(sourceUrl, options = {}) {
    try {
      // Hỗ trợ đặc biệt cho GamerPower API (Giveaways & Loot Tracker)
      if (sourceUrl.includes('gamerpower.com')) {
        const apiUrl = 'https://www.gamerpower.com/api/giveaways?type=loot';
        const rawJson = await fetchUrl(apiUrl);
        try {
          const list = JSON.parse(rawJson);
          if (Array.isArray(list)) {
            const codes = list.slice(0, 15).map(item => ({
              code: `GP-${item.id}-${(item.title || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}`,
              rewards: `${item.title}: ${item.platforms || 'PC/Mobile'} Free Loot Pack`,
              expiresAt: item.end_date || null,
            }));
            return {
              url: sourceUrl,
              title: 'GamerPower Loot & Giveaway Tracker',
              sourceType: 'reputable_web',
              codes,
              success: true,
            };
          }
        } catch {}
      }

      const html = await fetchUrl(sourceUrl);
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      const articleDate = extractArticleDate(html);
      const isStaleSource = articleDate ? ((Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24) > 180) : false;

      const codes = extractCodesFromHtml(html, options);

      return {
        url: sourceUrl,
        title,
        sourceType: 'reputable_web',
        codes,
        isStaleSource,
        articleDate: articleDate ? articleDate.toISOString() : null,
        success: true,
      };
    } catch (e) {
      return {
        url: sourceUrl,
        title: '',
        sourceType: 'reputable_web',
        codes: [],
        success: false,
        error: e.message,
      };
    }
  }
}

module.exports = {
  WebScraper,
  extractCodesFromHtml,
};
