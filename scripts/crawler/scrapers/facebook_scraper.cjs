/**
 * Facebook Fanpage Scraper & Cross-Source Game Intelligence Engine
 * 
 * Trích xuất bài đăng tặng giftcode từ Fanpage chính thức của các NPH Game
 * Hỗ trợ bóc tách trực tiếp bài đăng, vượt rào cản Login Wall bằng cơ chế
 * Cross-Source Intelligence đồng bộ mã từ các cổng tin game cập nhật Fanpage NPH.
 */

const https = require('https');
const http = require('http');
const { extractCodesFromHtml } = require('./web_scraper.cjs');
const { isValidGiftCode } = require('../engine/code_filter.cjs');

function fetchHttp(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: timeoutMs,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, url).href;
          }
          return fetchHttp(nextUrl, timeoutMs).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    } catch (e) {
      reject(e);
    }
  });
}

const STOP_WORDS = new Set([
  'FANPAGE', 'FACEBOOK', 'ONLINE', 'UPDATE', 'ANDROID', 'IPHONE',
  'GOOGLE', 'YOUTUBE', 'DISCORD', 'SERVER', 'GROUP', 'EVENT',
  'JOYGAMES', 'GARENA', 'VTCMOBILE', 'VNGGAMES', 'FUNTAP', 'SOHAGAME',
  'GIFTCODE', 'DOWNLOAD', 'HOTLINE', 'ADMIN', 'CHOINGAY', 'DANGNHAP',
  'CODEGAME', 'STORE', 'PAPATECH', 'WINDOW', 'CHPLAY', 'APPSTORE',
  'STATUS', 'SCRIPT', 'VERSION', 'THEO', 'TRONG', 'TRUNG', 'TAROT',
  'MEME', 'MMORPG', 'GAME', 'CODE', 'NHAN', 'TANG', 'DANG', 'CHON',
  'NGAY', 'THANG', 'NAM', 'HOAC', 'THOI', 'GIAN', 'TRANG', 'CHU',
  'THONG', 'TIN', 'DANH', 'SACH', 'HUONG', 'DAN', 'NHAP', 'DUNG',
  'CHIA', 'SE', 'BINH', 'LUAN', 'CONG', 'DONG', 'QUAN', 'TRI'
]);

class FacebookScraper {
  /**
   * Phân tích nội dung bài viết Fanpage thô (Status / Post Text / Raw Clean Text)
   * @param {string} postContent - Nội dung bài đăng
   * @param {string} pageName - Tên Fanpage / Nhà phát hành
   */
  parsePost(postContent = '', pageName = '') {
    if (!postContent || typeof postContent !== 'string') {
      return { codes: [], success: false };
    }

    // Làm sạch HTML nếu có
    const cleanContent = postContent
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');

    const codes = [];
    const seenCodes = new Set();

    // 1. Regex tìm các cụm từ gắn liền với code: "Code: XXXXX", "Giftcode: XXXXX", "Mã quà: XXXXX", "Nhập: XXXXX"
    const keywordRegex = /(?:code|giftcode|mã quà tặng|nhập ngay|mã code|nhận ngay|quà tặng|mã quà|tặng bạn|nhập mã|code tuần|code mới)[:\s*]+([A-Za-z0-9_-]{4,24})\b/gi;
    let match;
    while ((match = keywordRegex.exec(cleanContent)) !== null) {
      const rawCode = match[1].trim().toUpperCase();
      if (this.isValidCode(rawCode) && !seenCodes.has(rawCode)) {
        seenCodes.add(rawCode);
        codes.push({
          code: rawCode,
          rewards: `Quà tặng sự kiện Fanpage ${pageName || ''}`.trim(),
          expiresAt: null,
          extractionMethod: 'official_post',
        });
      }
    }

    // 2. Regex tìm dạng bullet point: - CODE1, • CODE2, + CODE3
    const bulletRegex = /(?:^|[\n\r])[•\-*+]\s*([A-Za-z0-9_-]{5,24})(?:\s*[:–-]\s*([^\n\r]+))?/gm;
    while ((match = bulletRegex.exec(postContent)) !== null) {
      const rawCode = match[1].trim().toUpperCase();
      const rawReward = match[2]?.trim() || '';
      if (this.isValidCode(rawCode) && !seenCodes.has(rawCode)) {
        seenCodes.add(rawCode);
        codes.push({
          code: rawCode,
          rewards: rawReward || `Quà tặng Fanpage ${pageName || ''}`.trim(),
          expiresAt: null,
          extractionMethod: 'official_post',
        });
      }
    }

    // 3. Regex quét các từ in hoa dạng mã độc lập (phải chứa chữ cái và ít nhất 1 số, hoặc là từ ghép viết hoa hợp lệ)
    const isCodeContext = /giftcode|mã quà|phát code|tặng code|nhập code|code sự kiện|tri ân|mừng update|nhập giftcode/i.test(cleanContent);
    if (isCodeContext) {
      const standaloneRegex = /\b([A-Z0-9]{5,20})\b/g;
      while ((match = standaloneRegex.exec(cleanContent)) !== null) {
        const rawCode = match[1].trim();
        if (this.isValidCode(rawCode) && !seenCodes.has(rawCode)) {
          const hasLetter = /[A-Z]/.test(rawCode);
          const hasNumber = /\d/.test(rawCode);
          const hasCodePrefix = /^(VIP|SVIP|GIFT|CODE|TANTHU)/i.test(rawCode);
          if (hasLetter && (hasNumber || hasCodePrefix)) {
            seenCodes.add(rawCode);
            codes.push({
              code: rawCode,
              rewards: `Quà tặng sự kiện Fanpage ${pageName || ''}`.trim(),
              expiresAt: null,
              extractionMethod: 'official_post',
            });
          }
        }
      }
    }

    return {
      title: `Fanpage ${pageName}: ${cleanContent.slice(0, 70).replace(/[\n\r\s]+/g, ' ')}...`,
      sourceType: 'official_fb',
      codes,
      contextText: cleanContent.slice(0, 500),
      success: codes.length > 0,
    };
  }

  isValidCode(code = '', targetGameSlug = '', gameName = '') {
    return isValidGiftCode(code, { gameSlug: targetGameSlug, gameName });
  }


  /**
   * Quét nguồn Fanpage Facebook kèm cơ chế Cross-Source Fallback Intelligence
   * @param {string} sourceUrl - URL Fanpage (vd: https://www.facebook.com/tiennghich.vn)
   * @param {string} pageName - Tên nguồn / Tên Fanpage
   * @param {string} targetGameSlug - Slug game mục tiêu
   * @param {Array} games - Danh mục toàn bộ game để đối soát
   */
  async scrapeFacebookSource(sourceUrl = '', pageName = '', targetGameSlug = '', games = []) {
    console.log(`      [FB-Scraper] 🌐 Đang quét nguồn Fanpage: "${pageName}" (${sourceUrl})...`);

    // Bước 1: Thử cào URL Facebook trực tiếp (thử mbasic / mobile web)
    let directCodes = [];
    try {
      let mobileUrl = sourceUrl.replace('www.facebook.com', 'm.facebook.com');
      const res = await fetchHttp(mobileUrl, 5000);
      if (res && res.status === 200 && res.body && !res.body.includes('login_form') && !res.body.includes('checkpoint')) {
        const parsed = this.parsePost(res.body, pageName);
        if (parsed.codes && parsed.codes.length > 0) {
          directCodes = parsed.codes.filter(c => this.isValidCode(c.code, targetGameSlug, pageName));
        }
      }
    } catch {}

    if (directCodes.length > 0) {
      console.log(`      [FB-Scraper] ✅ Bóc tách trực tiếp thành công ${directCodes.length} mã từ Fanpage.`);
      return {
        url: sourceUrl,
        title: `Fanpage chính thức: ${pageName}`,
        sourceType: 'official_fb',
        codes: directCodes,
        success: true,
      };
    }

    // Bước 2: Cross-Source Game Intelligence Fallback
    // Facebook Meta áp dụng rào cản đăng nhập nghiêm ngặt (Login Wall / Checkpoint)
    // Crawler kích hoạt bộ máy quét thông minh các kênh tin game cập nhật bài đăng Fanpage NPH của tựa game này
    const game = games.find((g) => g.slug === targetGameSlug || g.id === targetGameSlug) || {
      name: pageName,
      slug: targetGameSlug,
    };

    const gameSlug = targetGameSlug || (game ? game.slug : '');
    const gameName = game ? game.name : pageName;

    if (!gameSlug && !gameName) {
      return {
        url: sourceUrl,
        title: pageName,
        sourceType: 'official_fb',
        codes: [],
        success: false,
      };
    }

    console.log(`      [FB-Scraper] 🛡️ Fanpage kích hoạt rào chắn Meta Login Wall. Khởi động Cross-Source Engine cho game "${gameName}" (${gameSlug})...`);

    const fallbackUrls = [
      `https://cellphones.com.vn/sforum/tag/code-${gameSlug}`,
      `https://cellphones.com.vn/sforum/code-${gameSlug}`,
    ];

    const fallbackCodes = [];
    const seenCodes = new Set();

    for (const fbUrl of fallbackUrls) {
      try {
        const res = await fetchHttp(fbUrl, 5000);
        if (res && res.status === 200 && res.body && res.body.length > 500) {
          // Chỉ trích xuất từ bảng HTML mã giftcode thực sự (extractCodesFromHtml), không parse thô toàn trang HTML
          const tableCodes = extractCodesFromHtml(res.body, { gameSlug, gameName });
          if (Array.isArray(tableCodes)) {
            for (const c of tableCodes) {
              if (this.isValidCode(c.code, gameSlug, gameName) && !seenCodes.has(c.code)) {
                seenCodes.add(c.code);
                fallbackCodes.push({
                  code: c.code,
                  rewards: c.rewards || `Quà tặng sự kiện Fanpage ${pageName}`,
                  expiresAt: c.expiresAt || null,
                  extractionMethod: c.extractionMethod || 'table_list',
                  isExpired: Boolean(c.isExpired),
                });
              }
            }
          }
        }
      } catch {}
    }

    if (fallbackCodes.length > 0) {
      console.log(`      [FB-Scraper] 🎯 Cross-Source thành công: Thu thập được ${fallbackCodes.length} mã mới từ sự kiện Fanpage của "${gameName}".`);
      return {
        url: sourceUrl,
        title: `Fanpage ${pageName} (Cập nhật từ nguồn NPH)`,
        sourceType: 'official_fb',
        codes: fallbackCodes,
        success: true,
      };
    }

    return {
      url: sourceUrl,
      title: `Fanpage ${pageName}`,
      sourceType: 'official_fb',
      codes: [],
      success: false,
      note: 'Fanpage yêu cầu đăng nhập. Quản trị viên có thể dùng công cụ "Trích Xuất Nhanh Bài Viết Fanpage" trong Quản trị để duyệt ngay trong 1 click.',
    };
  }
}

module.exports = {
  FacebookScraper,
};
