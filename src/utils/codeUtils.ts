/**
 * Utility functions for Giftcode Expiration Date Parsing, Normalization and Validation
 * CodeGame.Shop Standard Giftcode Utilities
 */

export interface ParsedExpiration {
  formatted: string;
  isExpired: boolean;
  dateObj: Date | null;
}

/**
 * Làm sạch và decode toàn bộ HTML entities trong chuỗi văn bản (phần thưởng, mô tả...)
 * Chuyển &nbsp; thành khoảng trắng thường, xóa trailing entities / spaces, gộp khoảng trắng thừa.
 */
export function decodeHtmlEntities(raw: any): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = String(raw)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&amp;/gi, '&')
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/https:\/\/codegame\.store\/?/g, 'https://codegame.shop/');

  // Chữa lành tự động các mẫu phần thưởng tiếng Việt bị hỏng font (mojibake / uFFFD / ?)
  if (/qu[^\s]*.*t[^\s]*n\s+th[^\s]*.*v[^\s]*t\s+ph[^\s]*m|qu[^\s]*.*ingame/i.test(str)) {
    return 'Quà tặng tân thủ & vật phẩm ingame';
  }
  if (/ph[^\s]*n\s+th[^\s]*ng.*ph[^\s]*t\s+h[^\s]*nh/i.test(str)) {
    return '🎁 Phần thưởng từ nhà phát hành';
  }
  if (/qu[^\s]*\s+t[^\s]*ng.*t[^\s]*n\s+th[^\s]*/i.test(str)) {
    return 'Quà tặng tân thủ';
  }

  return str
    .replace(/v[\uFFFD\?]+t/gi, 'vật')
    .replace(/ph[\uFFFD\?]+m/gi, 'phẩm')
    .replace(/t[\uFFFD\?]+ng/gi, 'tặng')
    .replace(/th[\uFFFD\?]+ng/gi, 'thưởng')
    .replace(/ph[\uFFFD\?]+n/gi, 'phần')
    .replace(/t[\uFFFD\?]+\s+nhà/gi, 'từ nhà')
    .replace(/ph[\uFFFD\?]*t\s+h[\uFFFD\?]*nh/gi, 'phát hành')
    .replace(/Qu[\uFFFD\?]+\s+tặng/gi, 'Quà tặng')
    .replace(/tân\s+th[\uFFFD\?]+/gi, 'tân thủ')
    .replace(/[\uFFFD]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses and validates raw expiration date string or timestamp.
 * Supports:
 * - ISO date formats: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ssZ'
 * - Vietnamese date formats: 'DD/MM/YYYY', 'D/M/YYYY', 'DD-MM-YYYY'
 * - Timestamps (number or string)
 * - Keywords: 'Hết hạn', 'Đã hết hạn', 'Expired', 'Vĩnh viễn', 'Vô thời hạn', 'Còn hạn'
 * 
 * An expiration date of '2026-10-22' means valid until the end of that day (23:59:59.999).
 */
export function parseExpirationDate(rawInput: any, nowMs?: number): ParsedExpiration {
  const currentNow = typeof nowMs === 'number' ? nowMs : Date.now();

  if (!rawInput && rawInput !== 0) {
    return { formatted: '', isExpired: false, dateObj: null };
  }

  // If already a Date object
  if (rawInput instanceof Date) {
    if (isNaN(rawInput.getTime())) {
      return { formatted: '', isExpired: false, dateObj: null };
    }
    const isPast = rawInput.getTime() < currentNow;
    const y = rawInput.getFullYear();
    const m = String(rawInput.getMonth() + 1).padStart(2, '0');
    const d = String(rawInput.getDate()).padStart(2, '0');
    return {
      formatted: `${y}-${m}-${d}`,
      isExpired: isPast,
      dateObj: rawInput,
    };
  }

  // If number or numeric timestamp string
  if (typeof rawInput === 'number' || (typeof rawInput === 'string' && /^\d{10,13}$/.test(rawInput.trim()))) {
    const num = typeof rawInput === 'number' ? rawInput : parseInt(rawInput.trim(), 10);
    const ms = num < 10000000000 ? num * 1000 : num;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      const isPast = d.getTime() < currentNow;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return {
        formatted: `${y}-${m}-${day}`,
        isExpired: isPast,
        dateObj: d,
      };
    }
  }

  const str = String(rawInput).trim();
  if (!str) {
    return { formatted: '', isExpired: false, dateObj: null };
  }

  const clean = str.toLowerCase();

  // Keyword check: Expired
  if (
    clean === 'hết hạn' ||
    clean === 'het han' ||
    clean === 'đã hết hạn' ||
    clean === 'da het han' ||
    clean === 'quá hạn' ||
    clean === 'qua han' ||
    clean === 'expired' ||
    clean.includes('hết hạn') ||
    clean.includes('quá hạn') ||
    clean === 'out of date'
  ) {
    return { formatted: 'Hết hạn', isExpired: true, dateObj: null };
  }

  // Keyword check: Permanent / Unlimited
  if (
    clean === 'vĩnh viễn' ||
    clean === 'vinh vien' ||
    clean === 'vô thời hạn' ||
    clean === 'vo thoi han' ||
    clean === 'còn hạn' ||
    clean === 'con han' ||
    clean === 'permanent' ||
    clean === 'unlimited'
  ) {
    return { formatted: 'Vĩnh viễn', isExpired: false, dateObj: null };
  }

  // Keyword check: Unknown / Chưa rõ hạn
  if (
    clean === 'null' ||
    clean === 'undefined' ||
    clean === 'chưa rõ hạn' ||
    clean === 'chua ro han' ||
    clean === 'chưa rõ hạn dùng' ||
    clean === 'chua ro han dung' ||
    clean === 'unknown'
  ) {
    return { formatted: '', isExpired: false, dateObj: null };
  }

  // Pattern 1: Vietnamese format: DD/MM/YYYY or DD-MM-YYYY (e.g. 20/10/2026, 5/4/2026)
  const vnMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10);
    const year = parseInt(vnMatch[3], 10);
    const hours = vnMatch[4] !== undefined ? parseInt(vnMatch[4], 10) : 23;
    const minutes = vnMatch[5] !== undefined ? parseInt(vnMatch[5], 10) : 59;
    const seconds = vnMatch[6] !== undefined ? parseInt(vnMatch[6], 10) : 59;

    const d = new Date(year, month - 1, day, hours, minutes, seconds, 999);
    if (!isNaN(d.getTime())) {
      const isPast = d.getTime() < currentNow;
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        formatted,
        isExpired: isPast,
        dateObj: d,
      };
    }
  }

  // Pattern 2: ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const hours = isoMatch[4] !== undefined ? parseInt(isoMatch[4], 10) : 23;
    const minutes = isoMatch[5] !== undefined ? parseInt(isoMatch[5], 10) : 59;
    const seconds = isoMatch[6] !== undefined ? parseInt(isoMatch[6], 10) : 59;

    const d = new Date(year, month - 1, day, hours, minutes, seconds, 999);
    if (!isNaN(d.getTime())) {
      const isPast = d.getTime() < currentNow;
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        formatted,
        isExpired: isPast,
        dateObj: d,
      };
    }
  }

  // Fallback: Standard Date constructor
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    if (!str.includes(':') && !str.includes('T')) {
      parsed.setHours(23, 59, 59, 999);
    }
    const isPast = parsed.getTime() < currentNow;
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return {
      formatted: `${y}-${m}-${d}`,
      isExpired: isPast,
      dateObj: parsed,
    };
  }

  // If text is unrecognized, return raw trimmed string and not expired
  return { formatted: str, isExpired: false, dateObj: null };
}

/**
 * Checks whether a giftcode is expired.
 * Evaluates:
 * 1. Code value (mock codes like 'ATNGAY1', 'ATNGAY2' are marked expired)
 * 2. Explicit status ('expired', 'EXPIRED', 'Hết hạn', 'inactive')
 * 3. Expiration date fields (expiresAt, expires_at, expiry, expire_date, etc.) compared to current time
 */
export function isCodeExpired(codeObj: any, nowMs?: number): boolean {
  if (!codeObj) return false;

  // If string, check code value or date
  if (typeof codeObj === 'string') {
    const norm = codeObj.trim().toUpperCase();
    if (norm === 'ATNGAY1' || norm === 'ATNGAY2') return true;
    const parsed = parseExpirationDate(codeObj, nowMs);
    return parsed.isExpired;
  }

  // 1. Check code value
  const codeVal = String(codeObj.code || codeObj.codeValue || codeObj.gift_code || '').trim().toUpperCase();
  if (codeVal === 'ATNGAY1' || codeVal === 'ATNGAY2') {
    return true;
  }

  // 2. Check explicit status
  const statusStr = String(codeObj.status || codeObj.statusValue || '').trim().toLowerCase();
  if (
    statusStr === 'expired' ||
    statusStr === 'hết hạn' ||
    statusStr === 'het han' ||
    statusStr === 'inactive' ||
    statusStr === 'disabled'
  ) {
    return true;
  }

  // 3. Check expiration date fields
  const rawExp =
    codeObj.expiresAt ||
    codeObj.expires_at ||
    codeObj.expiry ||
    codeObj.expire_date ||
    codeObj.expireDate ||
    codeObj.expirationDate ||
    codeObj.expiration_date ||
    codeObj.hsd ||
    codeObj.han_su_dung;

  if (rawExp) {
    const parsed = parseExpirationDate(rawExp, nowMs);
    if (parsed.isExpired) {
      return true;
    }
  }

  return false;
}

/**
 * So sánh 2 mã giftcode theo hạn sử dụng phục vụ các chế độ xem "sắp hết hạn":
 * 1. Mã đã hết hạn: luôn xếp sau mã còn hạn.
 * 2. Giữa các mã còn hạn:
 *    - Mã có hạn cụ thể còn hiệu lực: xếp TRƯỚC mã chưa rõ hạn.
 *    - Giữa các mã có hạn cụ thể: mã nào hết hạn sớm hơn (gần hiện tại hơn) xếp trước (tăng dần theo ngày).
 *    - Mã chưa rõ hạn (NULL / rỗng): xếp sau các mã có ngày cụ thể, không bị đẩy lên đầu và không coi là 31/12/2026.
 */
export function compareCodesByExpiry(a: any, b: any, nowMs?: number): number {
  const isExpA = isCodeExpired(a, nowMs);
  const isExpB = isCodeExpired(b, nowMs);
  if (isExpA !== isExpB) return isExpA ? 1 : -1;

  const parsedA = parseExpirationDate(a?.expiresAt ?? a?.expires_at ?? a?.expiry, nowMs);
  const parsedB = parseExpirationDate(b?.expiresAt ?? b?.expires_at ?? b?.expiry, nowMs);

  const hasDateA = Boolean(parsedA.dateObj);
  const hasDateB = Boolean(parsedB.dateObj);

  if (hasDateA && hasDateB) {
    return parsedA.dateObj!.getTime() - parsedB.dateObj!.getTime();
  }
  if (hasDateA && !hasDateB) return -1; // Có ngày cụ thể xếp trước Chưa rõ hạn
  if (!hasDateA && hasDateB) return 1;  // Chưa rõ hạn xếp sau

  return 0;
}

