/**
 * Centralized Giftcode Validation & Anti-Junk Filter Engine
 * 
 * Bộ lọc mã giftcode đa tầng chuẩn mực cho toàn hệ thống:
 * 1. Blacklist từ cấm, từ vựng tiếng Anh/Việt thông dụng, nhãn UI, tiêu đề cột.
 * 2. Tên Nhà Phát Hành, nền tảng, thể loại game bị bóc tách nhầm.
 * 3. Kiểm tra cấu trúc hình thái học: độ dài, chữ số, tiền tố quà tặng hợp lệ.
 * 4. Ngăn chặn tuyệt đối các từ vựng tiếng Anh/Việt thông thường lọt vào làm giftcode.
 * 5. Loại trừ tuyệt đối mã không có tựa game gắn liền (unknown-game).
 */

// 1. TẬP HỢP TỪ CẤM & TỪ VỰNG THÔNG DỤNG (STOP WORDS / JUNK WORDS)
const JUNK_WORDS_SET = new Set([
  // The culprits and common false positives from game guides
  'HELPER', 'ALREADY', 'MEANS', 'WITHOUT', 'SYSTEM', 'WARRIOR', 'FEATURE', 'FEATURES',
  'ACCOUNT', 'OPTION', 'OPTIONS', 'CHOOSE', 'SELECT', 'CREATE', 'SETTING', 'SETTINGS',
  'REQUIRE', 'REQUIRES', 'FOLLOW', 'MESSAGE', 'COMMENT', 'ANSWER', 'ANSWERS', 'QUESTION', 'QUESTIONS',
  'DETAIL', 'DETAILS', 'DESCRIPTION', 'NOTE', 'NOTES', 'NOTICE', 'IMPORTANT', 'SUMMARY',
  'GENERAL', 'DEFAULT', 'NORMAL', 'CUSTOM', 'STANDARD', 'SIMPLE', 'ADVANCED', 'CLIENT',
  'DOWNLOAD', 'INSTALL', 'UPGRADE', 'RESULT', 'RESULTS', 'METHOD', 'METHODS', 'TARGET',
  'SOURCE', 'SOURCES', 'ACTION', 'ACTIONS', 'EFFECT', 'EFFECTS', 'AMOUNT', 'CHANGE', 'CHANCE',
  'DAMAGE', 'ATTACK', 'DEFENSE', 'HEALTH', 'ENERGY', 'SPIRIT', 'POWER', 'FORCE', 'SPEED',
  'RANGE', 'SKILL', 'SKILLS', 'TALENT', 'TALENTS', 'MAGIC', 'WEAPON', 'WEAPONS', 'ARMOR',
  'SHIELD', 'POTION', 'SCROLL', 'RECIPE', 'INVENTORY', 'STORAGE', 'MARKET', 'AUCTION',
  'TRADE', 'GUILD', 'PARTY', 'FRIEND', 'FRIENDS', 'ENEMY', 'ENEMIES', 'DUNGEON', 'DUNGEONS',
  'SEASON', 'SEASONS', 'RANK', 'RANKS', 'TIER', 'TIERS', 'SCORE', 'SCORES', 'COIN', 'COINS',
  'GOLD', 'SILVER', 'COPPER', 'DIAMOND', 'RUBY', 'SAPPHIRE', 'EMERALD', 'PEARL', 'CRYSTAL',
  'STONE', 'METAL', 'WOOD', 'HERB', 'LEATHER', 'CLOTH', 'WATER', 'FIRE', 'EARTH', 'WIND',
  'LIGHT', 'DARK', 'SHADOW', 'HOLY', 'CHAOS', 'ORDER', 'SPACE', 'TIME', 'DEATH', 'LIFE',
  'NATURE', 'BEAST', 'BEASTS', 'DRAGON', 'DRAGONS', 'DEMON', 'DEMONS', 'ANGEL', 'ANGELS',
  'HUMAN', 'HUMANS', 'UNDEAD', 'ELEMENTAL', 'MECHANICAL', 'GIANT', 'TITAN', 'LORD', 'KING',
  'QUEEN', 'PRINCE', 'PRINCESS', 'KNIGHT', 'KNIGHTS', 'MAGE', 'PRIEST', 'ROGUE', 'HUNTER',
  'WARLOCK', 'PALADIN', 'SHAMAN', 'DRUID', 'MONK', 'BARD', 'ASSASSIN', 'ARCHER', 'NINJA', 'SAMURAI',
  'CHECKLIST', 'EXCHANGE', 'REVIEW', 'REVIEWING', 'READING', 'BELIEVE', 'SOMEBODY', 'BESIDE',
  'REDEEMING', 'REDEEMED', 'TRIED', 'FLAGGED', 'UNUSED', 'EXPIRED', 'EXPIRES', 'ACTIVE',
  'INACTIVE', 'UNLOCKED', 'LOCKED', 'COMING', 'SOON', 'TOOLS', 'TOOL', 'SEARCH', 'SEARCHING',
  'THUMBNAIL', 'THUMB', 'THUMBS', 'COVER', 'BANNER', 'AVATAR', 'PICTURE', 'IMAGE', 'IMAGES',
  'SCREENSHOT', 'PHOTO', 'PREVIEW', 'ICON', 'ICONS', 'SLUG', 'ARTICLE', 'POST', 'POSTS',
  'FISHING', 'FISHERMAN', 'COLLECTION', 'MASTER', 'BUILD', 'KILL',

  // UI Actions & Prepositions (English)
  'TYPE', 'BELOW', 'OFFERS', 'OFFER', 'FROM', 'WITH', 'WITHIN', 'WILL', 'MIGHT', 'WORKS', 'WORKING', 'WORK',
  'DROPS', 'DROP', 'THAT', 'BEFORE', 'AFTER', 'ADDED', 'HERE', 'THERE', 'WHERE', 'WHEN',
  'WHAT', 'WHICH', 'SOME', 'MANY', 'MORE', 'LESS', 'CLICK', 'PRESS', 'ENTER', 'SUBMIT', 'CHECK',
  'SHARE', 'SUBSCRIBE', 'JOIN', 'DISCORD', 'SERVER', 'CHANNEL', 'ADMIN', 'MODERATOR', 'PLAYER', 'PLAYERS',
  'ONLINE', 'OFFLINE', 'STATUS', 'VERSION', 'UPDATE', 'UPDATED', 'PATCH', 'GUIDE', 'GUIDES', 'TRICKS',
  'TIPS', 'LIST', 'CODES', 'CODE', 'VALID', 'INVALID', 'REDEEM',
  'REWARDS', 'REWARD', 'FREE', 'ITEM', 'ITEMS', 'GIFT', 'GIFTS', 'GIFTCODE', 'GIFTCODES', 'PROMO', 'PROMOCODE',
  'PROMOCODES', 'EVENT', 'EVENTS', 'NEWS', 'ARTICLE', 'POST', 'POSTS', 'PAGE', 'PAGES', 'HOME', 'ABOUT',
  'CONTACT', 'TERMS', 'PRIVACY', 'POLICY', 'LOGIN', 'LOGOUT', 'SIGNUP', 'REGISTER', 'PASSWORD',
  'EMAIL', 'DEVICE', 'ANDROID', 'IPHONE', 'IPAD', 'MOBILE', 'TABLET', 'DESKTOP', 'BROWSER', 'WEBSITE', 'STORE',
  'SHOP', 'BUY', 'SELL', 'PRICE', 'COST', 'MONEY', 'CASH', 'GEM', 'GEMS', 'TOKEN', 'TOKENS',
  'POINT', 'POINTS', 'LEVEL', 'STAGE', 'WORLD', 'ZONE', 'QUEST', 'MISSION', 'HERO', 'HEROES', 'CHAMPION',
  'BOSS', 'RAID', 'BATTLE', 'ARENA', 'PVP', 'PVE', 'GAME', 'GAMES', 'GAMING', 'GAMER', 'GAMERS', 'ROBUX',
  'OBBY', 'ZOMBIE', 'ZOMBIES', 'DIGIT', 'NUMBER', 'CHARS', 'CHARACTER', 'LETTER', 'CASE', 'UPPER', 'LOWER',
  'TEXT', 'STRING', 'VALUE', 'INPUT', 'OUTPUT', 'ERROR', 'SUCCESS', 'WARNING', 'INFO', 'IN-GAME', 'INGAME',
  'COUPON', 'CLAIM', 'CLAIMED', 'VERIFIED', 'STEPS', 'HOWTO', 'TITLE', 'TABLE', 'HEADER',
  'FOOTER', 'BANNER', 'IMAGE', 'COVER', 'THUMB', 'VIDEO', 'WATCH', 'STREAM', 'TOTAL', 'COUNT',
  'MONTH', 'YEAR', 'DAILY', 'WEEKLY', 'MONTHLY', 'NEWEST', 'LATEST', 'OLDEST', 'RANDOM',

  // UI Actions & Common Words (Vietnamese)
  'THEO', 'NGAY', 'TRONG', 'NGOAI', 'TREN', 'DUOI', 'TRUOC', 'SAU', 'GIUA', 'DANG', 'CHON', 'NHAP', 'XUAT',
  'NHAN', 'TANG', 'THUONG', 'PHAN', 'QUA', 'GIFTCODE', 'CODE', 'GAME', 'CHOI', 'TAI', 'CAI', 'DAT', 'HUONG',
  'DAN', 'CHI', 'TIET', 'TIN', 'TUC', 'SU', 'KIEN', 'CAP', 'NHAT', 'MOI', 'CU', 'HET', 'HAN', 'CON',
  'DUNG', 'DUOC', 'KHONG', 'THOI', 'GIAN', 'DANH', 'SACH', 'KHO', 'MA', 'SO', 'TRANG', 'CHU', 'CONG',
  'DONG', 'NHOM', 'HOI', 'QUAN', 'TRI', 'VIEN', 'TAI', 'KHOAN', 'MAT', 'KHAU', 'NAP', 'THE', 'GIA',
  'TIEN', 'XU', 'VANG', 'KIM', 'CUONG', 'BAN', 'BE', 'CHIA', 'SE', 'BINH', 'LUAN', 'THICH', 'DOI',
  'HOAC', 'CUNG', 'NHUNG', 'CAC', 'MOT', 'HAI', 'BA', 'BON', 'NAM', 'SAU', 'BAY', 'TAM', 'CHIN', 'MUOI',
  'DOC', 'XEM', 'GUI', 'LICK', 'LIEN', 'KET', 'DUONG', 'DAN', 'TRUC', 'TUYEN', 'MAY', 'CHU', 'PHIEN', 'BAN',
  'PHAT', 'TRI', 'AN', 'MUNG', 'TONG', 'HOP', 'CHUAN', 'NGAY', 'THANG', 'GIO', 'PHUT', 'GIAY',

  // Publishers, Studios, Platforms & Misidentified Game Titles
  'GAMOTA', 'GARENA', 'VNG', 'VNGGAMES', 'SOHAGAME', 'SOHA', 'FUNTAP', 'GOSU', 'VTCMOBILE', 'VTCGAME',
  'VTC', 'DZOGAME', 'APPOTA', 'ACEGAME', 'VGP', 'KPLAY', 'VPLAY', 'DIGIGAMES', 'GZONE', 'JOYGAMES',
  'CAPCOM', 'TIMI', 'EFUN', 'ALOGAME', 'VELAGAME', 'VELA', 'MOCGAME', 'REDFOX', 'HABBY', 'ZINGPLAY',
  'MIHOYO', 'HOYOVERSE', 'COGNOSPHERE', 'KURO', 'KUROGAMES', 'FACEBOOK', 'GOOGLE', 'YOUTUBE', 'TIKTOK',
  'TELEGRAM', 'DISCORD', 'ZALO', 'CHPLAY', 'APPSTORE', 'STEAM', 'EPIC', 'ROBLOX', 'MINECRAFT', 'GENSHIN',
  'HONKAI', 'DISLYTE', 'WUTHERING', 'NINJA', 'MONSTER', 'POKEMON', 'NARUTO', 'ONEPIECE', 'DRAGONBALL'
]);

// Tiền tố giftcode chuẩn được công nhận
const VALID_CODE_PREFIXES = /^(VIP|SVIP|CODE|GIFT|TANTHU|TRIAN|FREE|NEW|HOT|PROMO|KAME|HAPPY|WELCOME|DISCORD|FB|LUCKY|REWARD|LAUNCH|RELEASE|SPECIAL|SUMMER|WINTER|SPRING|AUTUMN|XMAS|CHRISTMAS|HALLOWEEN|ANNIVERSARY|UPDATE|OPEN|BETA|ALPHA)/i;

// Hậu tố rác và định dạng file/thumbnail thường bị cào nhầm từ ảnh/URL
const JUNK_SUFFIXES = /-(?:THUMBNAIL|THUMB|THUMBS|MOI-NHAT|HOM-NAY|NGAY-HOM-NAY|MOI|APK|IOS|ANDROID|MOD|HACK|FULL|BANNER|COVER|LOGO|ICON|ICONS|IMAGE|IMAGES|PHOTO|PIC|PICS|AVATAR|PREVIEW|POST|DETAIL|CARD|SAMPLE)$/i;

// Định dạng đuôi file ảnh, trang web
const FILE_EXTENSIONS = /\.(?:JPG|PNG|WEBP|GIF|JPEG|SVG|HTML|HTM|PHP|ASPX|JS|CSS)$/i;

// Dấu hiệu URL / web path
const URL_PATTERNS = /(?:HTTP|HTTPS|WWW|\.COM|\.VN|\.NET|\.ORG|\.IO|\.ME|STORAGE|MEDIA|WP-CONTENT|UPLOADS|IMAGES\/|TAG\/|CATEGORY\/|BLOG\/|SFORUM|CELLPHONES)/i;

// Mẫu mã máy tạo (Machine-generated hex / fake codes)
const MACHINE_GENERATED_PATTERNS = /^(?:PM360|TGB|DOWNLOAD|CRACK|KEYGEN|SERIAL|FREECODE)[0-9A-F]{6,}$/i;

// Hậu tố từ loại tiếng Anh thông dụng (Suffixes)
const ENGLISH_WORD_SUFFIXES = /(?:TION|SION|MENT|NESS|ABLE|IBLE|LESS|FULLY|FULL|INGS|ING|ED|EST|IST|ISM|ITY|SHIP|HOOD|WARD|WISE|ERS|ORS|ER|OR|LY|OUS|IVE|ANCE|ENCE)$/i;

/**
 * Trích xuất từ viết tắt của tựa game (acronym) ví dụ "Where Winds Meet" -> "WWM"
 */
function extractGameAcronym(gameName = '') {
  if (!gameName) return '';
  const words = gameName.replace(/[^A-Za-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.map(w => w[0]).join('').toUpperCase();
  }
  return '';
}

/**
 * Kiểm tra xem một chuỗi mã code ứng viên có phải là mã quà tặng hợp lệ không
 * @param {string} rawCode - Chuỗi mã thô
 * @param {Object} options - Tùy chọn kiểm tra kèm tựa game
 * @returns {boolean} - true nếu là mã hợp lệ, false nếu là mã rác
 */
function isValidGiftCode(rawCode, options = {}) {
  if (!rawCode || typeof rawCode !== 'string') return false;

  const rawTrimmed = String(rawCode).trim();
  const clean = rawTrimmed.toUpperCase().replace(/^[^A-Z0-9_-]+|[^A-Z0-9_-]+$/g, '');

  // 1. Kiểm tra độ dài cơ bản (1 - 32 ký tự)
  if (clean.length < 1 || clean.length > 32) return false;

  // 2. Ký tự hợp lệ (chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới)
  if (!/^[A-Z0-9_-]+$/.test(clean)) return false;

  // Loại trừ ký tự gạch đầu hoặc gạch đuôi (vd: DREAM-CAR-COLLECTION-)
  if (/^[_-]|[_-]$/.test(clean)) return false;

  // Loại trừ hậu tố rác (vd: -THUMBNAIL, -MOI-NHAT, -THUMB, -AVATAR)
  if (JUNK_SUFFIXES.test(clean)) return false;

  // Loại trừ phần mở rộng file (vd: .jpg, .png, .webp, .html)
  if (FILE_EXTENSIONS.test(clean) || FILE_EXTENSIONS.test(rawTrimmed)) return false;

  // Loại trừ dấu hiệu URL / web path (vd: sforum, storage, http, .com)
  if (URL_PATTERNS.test(clean) || URL_PATTERNS.test(rawTrimmed)) return false;

  // Loại trừ mã máy tạo giả mạo (vd: PM360..., TGB..., hex hash dài >= 14 ký tự)
  if (MACHINE_GENERATED_PATTERNS.test(clean)) return false;
  if (/^[0-9A-F]{14,}$/i.test(clean) && !VALID_CODE_PREFIXES.test(clean)) return false;

  // 3. Không nằm trong Blacklist / Stop words
  if (JUNK_WORDS_SET.has(clean)) return false;

  // 4. Nếu chuỗi gốc là toàn bộ chữ thường (như 'already', 'means', 'without') và không có số hoặc gạch nối:
  // Đó là từ ngữ trong văn bản bình thường (prose), tuyệt đối không phải giftcode!
  const isOriginalAllLowercase = /^[a-z]+$/.test(rawTrimmed);
  if (isOriginalAllLowercase && !/\d/.test(clean)) {
    return false;
  }

  // 5. Loại trừ chuỗi số nguyên thuần túy (như ngày tháng 0401, timestamp, số ID bài viết)
  // Ngoại lệ: Cho phép mã số ngắn hợp lệ (như 41, 54, 67 của DOORS Roblox) hoặc khi options cho phép
  const isKnownShortNumericCode = (clean.length <= 3 && options.allowNumericCodes !== false) || (options.gameSlug && String(options.gameSlug).toUpperCase().includes('DOORS'));
  if (/^\d+$/.test(clean) && !isKnownShortNumericCode) {
    return false;
  }

  // 6. Loại trừ chuỗi lặp ký tự đơn điệu (như AAAAA, 11111, -----)
  if (/^(.)\1{3,}$/.test(clean)) return false;

  // 7. KIỂM TRA MÃ CÓ DẤU PHÂN CÁCH (HYPHENATED SLUG VS REAL CODE):
  if ((clean.includes('-') || clean.includes('_')) && !/\d/.test(clean)) {
    const delimiterCount = (clean.match(/[-_]/g) || []).length;
    // Có từ 2 dấu phân cách trở lên mà không có số -> 100% là slug bài viết / tiêu đề (vd: huong-dan-nhap-code, roll-a-fisherman)
    if (delimiterCount >= 2) {
      return false;
    }
    // Có 1 dấu phân cách: chỉ chấp nhận nếu bắt đầu bằng tiền tố quà tặng chuẩn và không chứa từ rác
    const hasPrefix = VALID_CODE_PREFIXES.test(clean);
    const parts = clean.split(/[-_]/);
    if (!hasPrefix || parts.some(p => JUNK_WORDS_SET.has(p))) {
      return false;
    }
  }

  // 8. KIỂM TRA NGHIÊM NGẶT MÃ THUẦN CHỮ CÁI (KHÔNG CÓ CHỮ SỐ):
  const isAllLetters = !/\d/.test(clean);
  if (isAllLetters) {
    // Nếu từ gốc là chữ thường (như 'already', 'means', 'without', 'warrior') -> đó là từ văn xuôi (prose), loại ngay
    if (isOriginalAllLowercase) {
      return false;
    }

    // Nếu mang hậu tố ngữ pháp tiếng Anh thông dụng (như -TION, -SION, -MENT, -NESS, -ABLE, -FULLY...)
    // mà không có tiền tố quà tặng chuẩn:
    if (ENGLISH_WORD_SUFFIXES.test(clean) && !VALID_CODE_PREFIXES.test(clean)) {
      return false;
    }
  }

  // 8. Loại trừ nếu mã trùng với slug hoặc các từ trong tên game đang xét
  const gameSlug = (options.gameSlug || '').toUpperCase();
  if (gameSlug) {
    if (clean === gameSlug || clean === gameSlug.replace(/-/g, '')) return false;

    // Loại trừ ảnh đánh số theo slug game (vd: GUN-X-MOBILE-1, GUN-X-MOBILE-2)
    if (clean.startsWith(gameSlug + '-') || clean.startsWith(gameSlug.replace(/-/g, '') + '-')) {
      const remainder = clean.replace(gameSlug, '').replace(gameSlug.replace(/-/g, ''), '').replace(/^[-_]+/, '');
      if (/^\d+$/.test(remainder) || JUNK_WORDS_SET.has(remainder)) {
        return false;
      }
    }

    const slugParts = gameSlug.split('-');
    if (slugParts.some(p => p.length >= 3 && clean === p)) return false;
  }

  const gameName = (options.gameName || '').toUpperCase();
  if (gameName) {
    const nameParts = gameName.replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(p => p.length >= 3);
    if (nameParts.some(p => clean === p)) return false;
  }

  return true;
}

module.exports = {
  JUNK_WORDS_SET,
  VALID_CODE_PREFIXES,
  isValidGiftCode,
  extractGameAcronym,
};
