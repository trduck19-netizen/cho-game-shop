/**
 * Content Script - CodeGame.Shop Facebook Scanner Extension v1.3.0
 * Tính năng nâng cao:
 * 1. Nhận diện tên Fanpage siêu chuẩn (loại bỏ triệt để tiêu đề "Thông báo", "Bảng tin", "Facebook")
 * 2. Bộ lọc Giftcode AI Regex cấp cao: Loại bỏ 100% từ tiếng Việt (THAM, NGHEN, CHOI, NGAY...), ưu tiên mã chữ + số
 * 3. Quét Sâu Không Giới Hạn (Cumulative Post Registry): Tích lũy bài viết vĩnh viễn không bị mất khi Facebook unmount
 * 4. Tùy chọn quét: 15, 35, 60, 100 bài hoặc ♾️ Quét Toàn Bộ Fanpage (Đến khi hết bài)
 * 5. Hỗ trợ nút Dừng Quét (Stop Scan), Lọc Mã Rác và Thống Kê Chi Tiết thời gian thực
 */

// ========================================================
// TỪ ĐIỂN ÂM TIẾT TIẾNG VIỆT & TỪ KHÓA RÁC (100% LOẠI BỎ)
// ========================================================
const VIETNAMESE_SYLLABLES = new Set([
  'THAM', 'GIA', 'NGHEN', 'CHUC', 'MUNG', 'LOAN', 'TIN', 'CHINH', 'THUC', 'OPEN',
  'BETA', 'ALPHA', 'TEST', 'SERVER', 'CHOI', 'NGAY', 'TAI', 'GAME', 'CLICK', 'LINK',
  'DUOI', 'DAY', 'COMMENT', 'LIKE', 'SHARE', 'TAG', 'BAN', 'BE', 'NHAN', 'QUA',
  'HAY', 'CUNG', 'NHAU', 'CHIEN', 'THOI', 'XEM', 'THEM', 'TRUOC', 'TRONG', 'GIUA',
  'NGOAI', 'TREN', 'DEM', 'SANG', 'TRUA', 'CHIEU', 'TOI', 'HOAN', 'THANH', 'CHUAN',
  'BIEU', 'DIEN', 'XUAT', 'HIEN', 'THONG', 'BAO', 'TIEP', 'THEO', 'NGUOI', 'ANH',
  'EM', 'HUYNH', 'DE', 'DONG', 'DAO', 'TIEN', 'HIEP', 'KIEM', 'TU', 'HUU',
  'VAN', 'TUE', 'THE', 'GIOI', 'QUOC', 'DANH', 'SACH', 'CHI', 'TIET', 'HUONG',
  'DAN', 'QUY', 'TAC', 'LE', 'PHAN', 'THUONG', 'MOI', 'BAT', 'DAU', 'KET',
  'GIAN', 'NHAP', 'DUNG', 'CHIA', 'SE', 'BINH', 'LUAN', 'CONG', 'QUAN', 'TRI',
  'FOLLOW', 'DANG', 'CHON', 'HOAC', 'CHU', 'TRANG', 'TIN', 'CAP', 'NHAT', 'PHIEN',
  'BAN', 'HOTLINE', 'ADMIN', 'DANGNHAP', 'CHOINGAY', 'DOWNLOAD', 'APPSTORE', 'CHPLAY',
  'IPHONE', 'ANDROID', 'GOOGLE', 'YOUTUBE', 'DISCORD', 'TIKTOK', 'FANPAGE', 'FACEBOOK',
  'ONLINE', 'OFFLINE', 'STATUS', 'SCRIPT', 'MEME', 'MMORPG', 'MOBILE', 'JOYGAMES',
  'GARENA', 'VNGGAMES', 'VTCMOBILE', 'FUNTAP', 'SOHAGAME', 'GAMOTA', 'PAPATECH', 'ZING',
  'NANG', 'CAP', 'DAP', 'AN', 'SU', 'KIEN', 'MINIGAME', 'LIVESTREAM', 'TRAO', 'GIAI',
  'TRI', 'AN', 'MUNG', 'DAI', 'LE', 'CUOC', 'THI', 'DUA', 'TOP', 'LUC', 'CHIEN',
  'BANG', 'HOI', 'PHO', 'BAN', 'VO', 'SONG', 'TUYET', 'THE', 'THAN', 'BINH', 'PHAP',
  'BAO', 'BOI', 'TRANG', 'BI', 'CANH', 'GIOI', 'NGUYEN', 'ANH', 'HOA', 'THAN', 'THIENTON'
]);

// Danh sách tên hệ thống Facebook cần bỏ qua khi tìm tên Fanpage
const FB_SYSTEM_NAMES = new Set([
  'thông báo', 'notifications', 'bảng tin', 'news feed', 'facebook',
  'watch', 'marketplace', 'gaming', 'trang chủ', 'home', 'menu',
  'tài khoản', 'account', 'cài đặt', 'settings', 'video', 'ảnh', 'photos',
  'bạn bè', 'friends', 'nhóm', 'groups', 'sự kiện', 'events'
]);

let isScanningCancelled = false;

// ========================================================
// 1. NHẬN DIỆN TÊN FANPAGE SIÊU CHUẨN (KHÔNG BỊ LẪN THÔNG BÁO)
// ========================================================
function getCleanFanpageName() {
  // Ưu tiên 1: Lấy từ thẻ meta og:title (Facebook luôn gán chuẩn tên Fanpage vào đây)
  const metaOg = document.querySelector('meta[property="og:title"]');
  if (metaOg && metaOg.content) {
    const raw = metaOg.content
      .replace(/\s*\|\s*Facebook.*$/i, '')
      .replace(/\s*-\s*Facebook.*$/i, '')
      .trim();
    if (raw && !FB_SYSTEM_NAMES.has(raw.toLowerCase()) && raw.length >= 2) {
      return raw;
    }
  }

  // Ưu tiên 2: Lấy từ document.title
  const docTitle = document.title
    .replace(/^\(\d+\)\s*/, '') // Loại bỏ đếm thông báo như "(2) "
    .replace(/\s*\|\s*Facebook.*$/i, '')
    .replace(/\s*-\s*Facebook.*$/i, '')
    .trim();
  if (docTitle && !FB_SYSTEM_NAMES.has(docTitle.toLowerCase()) && docTitle.length >= 2) {
    return docTitle;
  }

  // Ưu tiên 3: Quét các thẻ h1 nhưng loại bỏ từ hệ thống
  const h1Elements = document.querySelectorAll('h1');
  for (const h1 of h1Elements) {
    const text = h1.innerText?.trim();
    if (text && !FB_SYSTEM_NAMES.has(text.toLowerCase()) && text.length >= 3) {
      return text;
    }
  }

  // Ưu tiên 4: Phân tích đường dẫn URL
  try {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const firstSegment = path.split('/')[0];
    if (firstSegment && !FB_SYSTEM_NAMES.has(firstSegment.toLowerCase())) {
      const cleanSlug = firstSegment.replace(/\.vn$/i, '').replace(/[-_.]+/g, ' ');
      return cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1);
    }
  } catch (e) {}

  return 'Facebook Fanpage';
}

// ========================================================
// 2. BỘ LỌC MÃ GIFTCODE CHÍNH XÁC CAO (ZERO TRASH GUARANTEE)
// ========================================================
function isValidCode(code = '') {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();

  // Độ dài hợp lệ tiêu chuẩn
  if (clean.length < 4 || clean.length > 24) return false;

  // Bắt buộc phải có chữ cái
  if (!/[A-Z]/.test(clean)) return false;

  // Chỉ chấp nhận chữ in hoa, số, dấu gạch
  if (!/^[A-Z0-9_-]+$/.test(clean)) return false;

  // Loại bỏ nếu nằm trong từ điển âm tiết tiếng Việt
  if (VIETNAMESE_SYLLABLES.has(clean)) return false;

  const hasDigits = /\d/.test(clean);

  // QUY TẮC VÀNG CHO CHUỖI TOÀN CHỮ CÁI (KHÔNG CÓ SỐ):
  if (!hasDigits) {
    // Nếu chỉ có 4 hoặc 5 ký tự mà toàn chữ (như THAM, NGHEN, CHUC, MUNG, GAME) -> 100% LOẠI BỎ
    if (clean.length <= 5) return false;

    // Nếu dài từ 6 ký tự trở lên (như VANDINH, PHITHANG), kiểm tra không chứa âm tiết tiếng Việt đơn lẻ
    if (clean.length < 6) return false;
  }

  // Loại bỏ chuỗi chỉ toàn số năm như 2024, 2025, 2026 hoặc timestamp
  if (/^202[0-9]$/.test(clean) || /^\d{10,}$/.test(clean)) return false;

  return true;
}

function isHighConfidenceCode(code = '') {
  const clean = code.trim().toUpperCase();
  const hasDigits = /\d/.test(clean);
  const hasLetters = /[A-Z]/.test(clean);
  const hasCodePrefix = /^(VIP|SVIP|SSVIP|GIFT|CODE|TANTHU|GC)/i.test(clean);

  // Có cả chữ và số (ví dụ: LLDKPIB18, TSVDKPI0910, TNN20B, CTDT9R0609) -> Điểm 100
  if (hasDigits && hasLetters) return true;

  // Có tiền tố nhận diện chuẩn
  if (hasCodePrefix) return true;

  return false;
}

// ========================================================
// 3. TỰ ĐỘNG BUNG NÚT "XEM THÊM" / "SEE MORE"
// ========================================================
function expandAllSeeMoreButtons() {
  let clickedCount = 0;
  const seeMoreRegex = /^(?:xem thêm|see more|xem chi tiết|đọc thêm)$/i;

  const candidates = document.querySelectorAll('div[role="button"], span[role="button"], span[dir="auto"]');
  candidates.forEach(el => {
    if (el.dataset && el.dataset.wcgExpanded) return;
    const txt = el.innerText?.trim();
    if (txt && seeMoreRegex.test(txt)) {
      try {
        el.click();
        el.dataset.wcgExpanded = 'true';
        clickedCount++;
      } catch (e) {}
    }
  });

  return clickedCount;
}

// ========================================================
// 4. GIẢI MÃ & BÓC TÁCH TOÀN BỘ ĐƯỜNG LINK (LINKS EXTRACTOR)
// ========================================================
function decodeFacebookShimUrl(rawHref = '') {
  if (!rawHref || typeof rawHref !== 'string') return '';
  try {
    const url = new URL(rawHref, window.location.origin);

    if (url.hostname.includes('facebook.com') && url.pathname.includes('/l.php')) {
      const targetParam = url.searchParams.get('u');
      if (targetParam) {
        return decodeURIComponent(targetParam);
      }
    }

    if (url.hostname.includes('facebook.com') || url.hostname.includes('fb.watch') || url.hostname.includes('fb.me')) {
      ['__cft__', '__tn__', 'fbclid', 'ref', 'source'].forEach(p => url.searchParams.delete(p));
      return url.toString();
    }

    return rawHref;
  } catch (e) {
    return rawHref;
  }
}

function classifyUrl(url = '', anchorText = '') {
  const lower = (url + ' ' + anchorText).toLowerCase();
  
  if (/facebook\.com\/(?:[^\/]+\/posts|story\.php|permalink|photo|video|pfbid)/i.test(url)) {
    return { type: 'POST_PERMALINK', label: '📌 Bài Viết FB', priority: 1 };
  }
  if (/(?:code|giftcode|nhan-qua|doi-code|nhap-code|su-kien|event|landing|minigame|claim)/i.test(lower)) {
    return { type: 'REWARD_LINK', label: '🎯 Nhận / Đổi Code', priority: 3 };
  }
  if (/(?:nap\.|pay\.|shop\.|store\.)/i.test(lower)) {
    return { type: 'PAY_LINK', label: '💳 Cổng Nạp NPH', priority: 2 };
  }
  if (/(?:game|play|vn|com|net|mobi|joyplay|garena|vng|gamota|vtc|funtap)/i.test(lower) && !lower.includes('facebook.com')) {
    return { type: 'OFFICIAL_WEB', label: '🌐 Website NPH', priority: 2 };
  }
  return { type: 'EXTERNAL_LINK', label: '🔗 Liên Kết Ngoài', priority: 1 };
}

function extractCodesFromUrl(url = '') {
  const foundCodes = [];
  try {
    const parsed = new URL(url);
    const codeParams = ['code', 'giftcode', 'gc', 'event_code', 'voucher', 'c'];
    for (const p of codeParams) {
      const val = parsed.searchParams.get(p);
      if (val && isValidCode(val)) {
        foundCodes.push(val.trim().toUpperCase());
      }
    }
  } catch (e) {}
  return foundCodes;
}

// ========================================================
// 5. TRÍCH XUẤT GIFTCODE TỪ VĂN BẢN (STRICT REGEX)
// ========================================================
function extractGiftcodesFromText(text = '', pageName = '', postUrl = '') {
  if (!text) return [];
  const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  const codes = [];
  const seen = new Set();

  const addCode = (code, reward, score) => {
    const raw = code.trim().toUpperCase();
    if (isValidCode(raw) && !seen.has(raw)) {
      seen.add(raw);
      const isHigh = isHighConfidenceCode(raw);
      codes.push({
        code: raw,
        rewards: reward || `Quà tặng sự kiện Fanpage ${pageName}`.trim(),
        expiresAt: null,
        sourceUrl: postUrl || window.location.href,
        score: isHigh ? 98 : score || 85,
        isHighConfidence: isHigh
      });
    }
  };

  // 1. Keyword regex chặt chẽ
  const keywordRegex = /(?:code|giftcode|mã quà tặng|nhập ngay|mã code|nhận ngay mã|mã quà|nhập mã|code tuần|code mới)[:\s*]+([A-Za-z0-9_-]{4,24})\b/gi;
  let match;
  while ((match = keywordRegex.exec(clean)) !== null) {
    addCode(match[1], `Mã sự kiện Fanpage ${pageName}`, 95);
  }

  // 2. Bullet point regex
  const bulletRegex = /(?:^|[\n\r])[•\-*+]\s*([A-Za-z0-9_-]{5,24})(?:\s*[:–-]\s*([^\n\r]+))?/gm;
  while ((match = bulletRegex.exec(clean)) !== null) {
    addCode(match[1], match[2]?.trim() || `Quà tặng Fanpage ${pageName}`, 90);
  }

  // 3. Standalone code regex trong ngữ cảnh quà tặng
  const isCodeContext = /giftcode|mã quà|phát code|tặng code|nhập code|code sự kiện|tri ân|mừng update|nhập giftcode/i.test(clean);
  if (isCodeContext) {
    const standaloneRegex = /\b([A-Z0-9]{5,20})\b/g;
    while ((match = standaloneRegex.exec(clean)) !== null) {
      const raw = match[1].trim();
      const hasLetter = /[A-Z]/.test(raw);
      const hasNumber = /\d/.test(raw);
      const hasCodePrefix = /^(VIP|SVIP|GIFT|CODE|TANTHU|SSVIP)/i.test(raw);
      // Bắt buộc có cả chữ và số, hoặc có tiền tố code
      if (hasLetter && (hasNumber || hasCodePrefix)) {
        addCode(raw, `Mã quà tặng sự kiện ${pageName}`, 88);
      }
    }
  }

  return codes;
}

// ========================================================
// 6. TRÍCH XUẤT CÁC BÀI VIẾT HIỆN DIỆN TRONG KHUNG NHÌN
// ========================================================
function extractCurrentPostsAndElements(pageName = '') {
  const postContainers = document.querySelectorAll([
    'div[role="feed"] > div',
    'div[role="article"]',
    'div[data-ad-preview="message"]'
  ].join(', '));

  const posts = [];
  const codes = [];
  const links = [];
  const seenCodes = new Set();
  const seenLinks = new Set();

  const isIgnoredUrl = (u) => {
    return !u || /facebook\.com\/(?:policies|help|login|recover|privacy|legal|settings)/i.test(u);
  };

  const addUniqueLink = (url, title, postUrl) => {
    const cleanUrl = decodeFacebookShimUrl(url);
    if (!cleanUrl || isIgnoredUrl(cleanUrl) || seenLinks.has(cleanUrl)) return;
    seenLinks.add(cleanUrl);

    const classification = classifyUrl(cleanUrl, title);
    links.push({
      url: cleanUrl,
      title: title || cleanUrl,
      type: classification.type,
      label: classification.label,
      priority: classification.priority,
      postUrl: postUrl || window.location.href
    });

    const urlCodes = extractCodesFromUrl(cleanUrl);
    urlCodes.forEach(c => {
      if (!seenCodes.has(c)) {
        seenCodes.add(c);
        codes.push({
          code: c,
          rewards: `Mã nhận từ đường link: ${cleanUrl.substring(0, 35)}...`,
          expiresAt: null,
          sourceUrl: cleanUrl,
          score: 95,
          isHighConfidence: isHighConfidenceCode(c)
        });
      }
    });
  };

  postContainers.forEach((postEl, index) => {
    const text = postEl.innerText?.trim() || '';
    if (text.length < 20) return;

    let postUrl = '';
    const linkEls = postEl.querySelectorAll('a[href]');
    linkEls.forEach(a => {
      const rawHref = a.getAttribute('href') || a.href;
      if (/(?:\/posts\/|\/permalink\/|\/photos\/|\/videos\/|story\.php|pfbid)/i.test(rawHref)) {
        if (!postUrl) {
          postUrl = decodeFacebookShimUrl(a.href);
        }
      }
    });

    // Tạo ID bài viết duy nhất (để không bị mất khi Facebook unmount)
    const postId = postUrl || (text.slice(0, 80).replace(/\s+/g, '_') + '_' + text.length);

    if (postUrl) {
      addUniqueLink(postUrl, `Bài viết Fanpage: ${text.substring(0, 45)}...`, postUrl);
    }

    linkEls.forEach(a => {
      const rawHref = a.getAttribute('href') || a.href;
      const anchorText = a.innerText?.trim() || '';
      addUniqueLink(rawHref, anchorText || `Liên kết bài viết`, postUrl);
    });

    const postCodes = extractGiftcodesFromText(text, pageName, postUrl);
    postCodes.forEach(c => {
      if (!seenCodes.has(c.code)) {
        seenCodes.add(c.code);
        codes.push(c);
      }
    });

    posts.push({
      id: postId,
      postUrl: postUrl || window.location.href,
      snippet: text.substring(0, 100),
      codesCount: postCodes.length
    });
  });

  return {
    pageName: pageName || getCleanFanpageName(),
    posts,
    codes,
    links
  };
}

function getPageInfoAndText(options = { expandSeeMore: true }) {
  if (options.expandSeeMore) {
    expandAllSeeMoreButtons();
  }

  const pageName = getCleanFanpageName();
  const currentPass = extractCurrentPostsAndElements(pageName);

  currentPass.links.sort((a, b) => b.priority - a.priority);

  return {
    pageName: currentPass.pageName,
    pageUrl: window.location.href,
    codes: currentPass.codes,
    links: currentPass.links,
    postsCount: currentPass.posts.length,
    allTextLength: document.body.innerText?.length || 0
  };
}

// ========================================================
// 7. QUÉT SÂU KHÔNG GIỚI HẠN & TÍCH LŨY BÀI VIẾT TOÀN DIỆN
// ========================================================
async function runDeepScrollScan(targetPostsCount = 35, delayMs = 1300, onProgress) {
  isScanningCancelled = false;
  showProgressToast(`🌀 Đang bắt đầu quét sâu...`, 0, true);

  const accumulatedPosts = new Map();
  const accumulatedCodes = new Map();
  const accumulatedLinks = new Map();
  let latestPageName = getCleanFanpageName();

  const isUnlimited = (targetPostsCount >= 9999 || targetPostsCount === -1);
  const maxIterations = isUnlimited ? 250 : Math.ceil(targetPostsCount / 1.5) + 15;
  let consecutiveNoNewPosts = 0;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (isScanningCancelled) {
      showNotification('Đã dừng quét', `Đã tạm dừng theo yêu cầu. Đã thu thập được ${accumulatedCodes.size} mã từ ${accumulatedPosts.size} bài viết.`, true);
      break;
    }

    // 1. Click mở bung tất cả nút Xem thêm hiện có
    expandAllSeeMoreButtons();

    // 2. Trích xuất bài viết ở khung nhìn hiện tại
    const currentPass = extractCurrentPostsAndElements(latestPageName);
    latestPageName = currentPass.pageName || latestPageName;

    let newPostsThisRound = 0;
    currentPass.posts.forEach(p => {
      if (!accumulatedPosts.has(p.id)) {
        accumulatedPosts.set(p.id, p);
        newPostsThisRound++;
      }
    });

    currentPass.codes.forEach(c => accumulatedCodes.set(c.code, c));
    currentPass.links.forEach(l => accumulatedLinks.set(l.url, l));

    if (newPostsThisRound === 0) {
      consecutiveNoNewPosts++;
    } else {
      consecutiveNoNewPosts = 0;
    }

    const currentCount = accumulatedPosts.size;
    let percent = 0;
    if (isUnlimited) {
      percent = Math.min(95, Math.round((iteration / 60) * 100));
    } else {
      percent = Math.min(100, Math.round((currentCount / targetPostsCount) * 100));
    }

    const progressMsg = isUnlimited
      ? `🌀 Đang quét toàn bộ Fanpage: Đã duyệt ${currentCount} bài (${accumulatedCodes.size} code, ${accumulatedLinks.size} link)...`
      : `🌀 Đang cuộn bài viết: Đã duyệt ${currentCount}/${targetPostsCount} bài (${accumulatedCodes.size} code, ${accumulatedLinks.size} link)...`;

    showProgressToast(progressMsg, percent, true);

    if (onProgress) {
      onProgress({
        currentPosts: currentCount,
        targetPosts: isUnlimited ? 'Toàn bộ' : targetPostsCount,
        percent,
        codesCount: accumulatedCodes.size,
        linksCount: accumulatedLinks.size,
        pageName: latestPageName
      });
    }

    // Nếu đã đạt mục tiêu
    if (!isUnlimited && currentCount >= targetPostsCount) {
      break;
    }

    // Nếu cuộn 6 lượt liên tiếp không có bài mới -> Đã tới đáy Fanpage
    if (consecutiveNoNewPosts >= 6) {
      break;
    }

    // 3. Cuộn mượt đến bài viết cuối cùng trong DOM
    const articles = document.querySelectorAll('div[role="feed"] > div, div[role="article"]');
    if (articles.length > 0) {
      const lastArticle = articles[articles.length - 1];
      lastArticle.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      window.scrollBy({ top: window.innerHeight * 1.8, behavior: 'smooth' });
    }

    // Nhịp Jitter để kích hoạt IntersectionObserver của Facebook
    await new Promise(r => setTimeout(r, 200));
    window.scrollBy({ top: 120 });
    await new Promise(r => setTimeout(r, 100));
    window.scrollBy({ top: -40 });

    // 4. Chờ mạng và Facebook tải dữ liệu
    await new Promise(r => setTimeout(r, delayMs));
  }

  // Quét pass cuối cùng
  expandAllSeeMoreButtons();
  const finalPass = extractCurrentPostsAndElements(latestPageName);
  finalPass.posts.forEach(p => accumulatedPosts.set(p.id, p));
  finalPass.codes.forEach(c => accumulatedCodes.set(c.code, c));
  finalPass.links.forEach(l => accumulatedLinks.set(l.url, l));

  hideProgressToast();

  const finalCodes = Array.from(accumulatedCodes.values());
  const finalLinks = Array.from(accumulatedLinks.values()).sort((a, b) => b.priority - a.priority);
  const highConfidenceCount = finalCodes.filter(c => c.isHighConfidence).length;

  showNotification(
    `Quét sâu hoàn tất! 🌀`,
    `Đã duyệt thực tế ${accumulatedPosts.size} bài viết: Thu được ${finalCodes.length} mã giftcode (${highConfidenceCount} mã chuẩn) và ${finalLinks.length} đường link!`,
    true
  );

  return {
    pageName: latestPageName,
    pageUrl: window.location.href,
    codes: finalCodes,
    links: finalLinks,
    postsCount: accumulatedPosts.size,
    highConfidenceCount,
    roundsExecuted: targetPostsCount
  };
}

// ========================================================
// 8. GIAO DIỆN NỔI & TOAST TIẾN TRÌNH TRÊN TRANG
// ========================================================
function showProgressToast(text, percent = 0, showStopBtn = true) {
  let toast = document.getElementById('wcg-progress-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wcg-progress-toast';
    toast.className = 'wcg-progress-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="wcg-prog-header">
      <span class="wcg-prog-spinner"></span>
      <span class="wcg-prog-text">${text}</span>
      ${showStopBtn ? `<button id="wcg-btn-stop-floating" class="wcg-prog-stop-btn">⏹️ Dừng</button>` : ''}
    </div>
    <div class="wcg-prog-bar-wrap">
      <div class="wcg-prog-bar-fill" style="width: ${percent}%;"></div>
    </div>
  `;
  toast.style.display = 'block';

  const stopBtn = toast.querySelector('#wcg-btn-stop-floating');
  if (stopBtn) {
    stopBtn.onclick = () => {
      isScanningCancelled = true;
      stopBtn.innerText = 'Đang dừng...';
    };
  }
}

function hideProgressToast() {
  const toast = document.getElementById('wcg-progress-toast');
  if (toast) toast.style.display = 'none';
}

function showNotification(title, message, isSuccess = true) {
  const existing = document.getElementById('wcg-notify-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'wcg-notify-toast';
  toast.className = `wcg-toast ${isSuccess ? 'wcg-toast-success' : 'wcg-toast-error'}`;
  toast.innerHTML = `
    <div class="wcg-toast-header">
      <strong>${title}</strong>
      <button class="wcg-toast-close">&times;</button>
    </div>
    <div class="wcg-toast-body">${message}</div>
  `;

  toast.querySelector('.wcg-toast-close').addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 7000);
}

// Nút nổi FAB trên Facebook
function injectFloatingButton() {
  if (document.getElementById('wcg-floating-scan-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'wcg-floating-scan-btn';
  btn.className = 'wcg-fab-button';
  btn.title = 'Bấm để quét mã giftcode và link sự kiện trên trang này';
  btn.innerHTML = `
    <div class="wcg-fab-inner">
      <svg class="wcg-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
      <span class="wcg-fab-text">⚡ Quét Code & Link</span>
      <button id="wcg-quick-deep-btn" class="wcg-fab-deep-sub" title="Quét sâu 35 bài viết">🌀 Quét Sâu 35 Bài</button>
      <button id="wcg-quick-all-btn" class="wcg-fab-deep-sub" title="Quét toàn bộ Fanpage">♾️ Quét Hết</button>
    </div>
  `;

  btn.querySelector('.wcg-fab-text').addEventListener('click', (e) => {
    e.stopPropagation();
    handleFloatingScanClick(false);
  });

  const deepBtn = btn.querySelector('#wcg-quick-deep-btn');
  deepBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleFloatingScanClick(true, 35);
  });

  const allBtn = btn.querySelector('#wcg-quick-all-btn');
  allBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleFloatingScanClick(true, 9999);
  });

  document.body.appendChild(btn);
}

async function handleFloatingScanClick(isDeep = false, targetPosts = 35) {
  let info;
  if (isDeep) {
    info = await runDeepScrollScan(targetPosts, 1300);
  } else {
    expandAllSeeMoreButtons();
    info = getPageInfoAndText();
  }

  if ((!info.codes || info.codes.length === 0) && (!info.links || info.links.length === 0)) {
    showNotification(
      'Chưa tìm thấy mã mới',
      `Không phát hiện giftcode hoặc link sự kiện trong các bài viết đang hiển thị trên "${info.pageName}". Hãy bấm nút "🌀 Quét Sâu" để tự động cuộn trang lấy thêm bài nhé!`,
      false
    );
    return;
  }

  showConfirmModal(info);
}

// Modal xác nhận đẩy mã & duyệt link
function showConfirmModal(info) {
  const existing = document.getElementById('wcg-modal-confirm');
  if (existing) existing.remove();

  const highCount = info.codes.filter(c => c.isHighConfidence).length;

  const modal = document.createElement('div');
  modal.id = 'wcg-modal-confirm';
  modal.className = 'wcg-modal-overlay';
  modal.innerHTML = `
    <div class="wcg-modal-box">
      <div class="wcg-modal-header">
        <div class="wcg-modal-title">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#6366f1" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>Thu Thập Được ${info.codes.length} Code & ${info.links.length} Link!</span>
        </div>
        <button class="wcg-modal-close">&times;</button>
      </div>

      <!-- Stats Banner -->
      <div class="wcg-stats-banner">
        <span>📊 Đã duyệt: <strong>${info.postsCount || 'toàn bộ'} bài</strong></span>
        <span>🎁 Tổng code: <strong>${info.codes.length}</strong></span>
        <span>⭐ Mã chuẩn: <strong>${highCount}</strong></span>
        <span>🔗 Link: <strong>${info.links.length}</strong></span>
      </div>

      <div class="wcg-modal-tabs">
        <button class="wcg-modal-tab active" data-tab="codes">🎁 Danh Sách Mã (${info.codes.length})</button>
        <button class="wcg-modal-tab" data-tab="links">🔗 Đường Link & Sự Kiện (${info.links.length})</button>
      </div>

      <div class="wcg-modal-body">
        <!-- Tab 1: Codes -->
        <div id="tab-content-codes" class="wcg-tab-pane active">
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 8px;">
            <button id="wcg-btn-purify-modal" class="wcg-btn-sm-action">🧹 Lọc Mã Rác</button>
            <button id="wcg-btn-clear-modal" class="wcg-btn-sm-action" style="color: #f43f5e;">🗑️ Xóa Tất Cả</button>
          </div>
          ${info.codes.length === 0 ? `
            <div style="text-align: center; color: #64748b; padding: 20px;">Không có mã code nào.</div>
          ` : `
            <div id="wcg-modal-code-list" class="wcg-code-list">
              ${info.codes.map((c, idx) => `
                <div class="wcg-code-item" data-code="${c.code}">
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="wcg-code-badge">${c.code}</span>
                      ${c.isHighConfidence ? `<span style="font-size: 10px; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 1px 4px; border-radius: 4px;">⭐ Chuẩn</span>` : ''}
                    </div>
                    <span class="wcg-code-reward">${c.rewards}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${c.sourceUrl ? `<a href="${c.sourceUrl}" target="_blank" class="wcg-link-open-btn" title="Mở bài viết">🔗 Xem bài</a>` : ''}
                    <button class="wcg-btn-del-single" data-index="${idx}" title="Xóa mã này">&times;</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Tab 2: Links -->
        <div id="tab-content-links" class="wcg-tab-pane">
          ${info.links.length === 0 ? `
            <div style="text-align: center; color: #64748b; padding: 20px;">Không có liên kết ngoài nào trong các bài viết.</div>
          ` : `
            <div class="wcg-link-list">
              ${info.links.map(l => `
                <div class="wcg-link-item">
                  <div class="wcg-link-info">
                    <span class="wcg-link-badge ${l.type}">${l.label}</span>
                    <span class="wcg-link-url" title="${l.url}">${l.url}</span>
                  </div>
                  <div class="wcg-link-actions">
                    <button class="wcg-btn-copy-url" data-url="${encodeURIComponent(l.url)}">Sao chép</button>
                    <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="wcg-link-open-btn">Mở</a>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <div class="wcg-modal-footer">
        <button class="wcg-btn-cancel">Đóng</button>
        <button id="wcg-btn-push-modal" class="wcg-btn-push" ${info.codes.length === 0 ? 'disabled' : ''}>
          🚀 Bắn ${info.codes.length} Mã Lên Web codegame.shop
        </button>
      </div>
    </div>
  `;

  // Tab switching
  modal.querySelectorAll('.wcg-modal-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      modal.querySelectorAll('.wcg-modal-tab').forEach(b => b.classList.remove('active'));
      modal.querySelectorAll('.wcg-tab-pane').forEach(p => p.classList.remove('active'));
      tabBtn.classList.add('active');
      const target = tabBtn.dataset.tab;
      modal.querySelector(`#tab-content-${target}`).classList.add('active');
    });
  });

  // Lọc mã rác
  const purifyBtn = modal.querySelector('#wcg-btn-purify-modal');
  if (purifyBtn) {
    purifyBtn.addEventListener('click', () => {
      info.codes = info.codes.filter(c => isValidCode(c.code) && isHighConfidenceCode(c.code));
      showConfirmModal(info);
    });
  }

  // Xóa tất cả code
  const clearBtn = modal.querySelector('#wcg-btn-clear-modal');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      info.codes = [];
      showConfirmModal(info);
    });
  }

  // Xóa từng mã
  modal.querySelectorAll('.wcg-btn-del-single').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      info.codes.splice(idx, 1);
      showConfirmModal(info);
    });
  });

  // Sao chép URL
  modal.querySelectorAll('.wcg-btn-copy-url').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = decodeURIComponent(e.target.dataset.url);
      navigator.clipboard.writeText(url).then(() => {
        e.target.innerText = 'Đã chép!';
        setTimeout(() => { e.target.innerText = 'Sao chép'; }, 2000);
      });
    });
  });

  modal.querySelector('.wcg-modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.wcg-btn-cancel').addEventListener('click', () => modal.remove());

  const pushBtn = modal.querySelector('#wcg-btn-push-modal');
  if (pushBtn) {
    pushBtn.addEventListener('click', () => {
      pushBtn.disabled = true;
      pushBtn.innerText = 'Đang đẩy lên máy chủ...';

      let gameSlug = '';
      const pageUrlLower = (info.pageUrl + ' ' + info.pageName).toLowerCase();
      if (pageUrlLower.includes('tiennghich')) gameSlug = 'tien-nghich-mobile';

      chrome.runtime.sendMessage({
        action: 'PUSH_CODES_TO_SERVER',
        payload: {
          codes: info.codes,
          gameSlug: gameSlug || 'tien-nghich-mobile',
          gameName: info.pageName,
          sourceLinks: info.links
        }
      }, (res) => {
        modal.remove();
        if (res && res.success) {
          showNotification(
            'Đẩy mã thành công rực rỡ! 🚀',
            `Đã kích hoạt thành công ${res.approvedCount}/${info.codes.length} mã cho game "${info.pageName}" lên web codegame.shop!`,
            true
          );
        } else {
          showNotification(
            'Lỗi đẩy mã',
            res?.errors?.join(', ') || 'Không thể kết nối đến máy chủ sync.',
            false
          );
        }
      });
    });
  }

  document.body.appendChild(modal);
}

// ========================================================
// 9. LẮNG NGHE YÊU CẦU TỪ POPUP EXTENSION
// ========================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCAN_PAGE') {
    expandAllSeeMoreButtons();
    const result = getPageInfoAndText();
    sendResponse(result);
    return true;
  }

  if (request.action === 'DEEP_SCAN_PAGE') {
    const targetPosts = request.targetPosts || 35;
    runDeepScrollScan(targetPosts, 1300, (prog) => {
      // Gửi broadcast nếu cần
    }).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: err.message, codes: [], links: [] });
    });
    return true;
  }

  if (request.action === 'STOP_DEEP_SCAN') {
    isScanningCancelled = true;
    hideProgressToast();
    sendResponse({ success: true, message: 'Đã dừng lệnh quét sâu.' });
    return true;
  }
});

// Tự động gắn nút nổi FAB sau khi trang tải
setTimeout(injectFloatingButton, 2000);
setInterval(injectFloatingButton, 5000);
