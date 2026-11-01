// Remove Vietnamese accents for lightning-fast fuzzy & non-accent search
export function stripAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

// Check if a string contains any Vietnamese accented characters (diacritics)
export function hasVietnameseDiacritics(str: string): boolean {
  if (!str) return false;
  return /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/i.test(str);
}

// Normalize Vietnamese string: removes accents, converts non-alphanumeric to spaces, trims duplicate spaces
export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return stripAccents(str)
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalize text for search: removes accents, converts hyphens/separators/non-alphanumeric to spaces, trims duplicate spaces
export function normalizeSearchText(str: string): string {
  if (!str) return '';
  return stripAccents(str)
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common gaming acronyms & abbreviations dictionary (tiếng Việt & quốc tế)
export const GAME_ACRONYM_MAP: Record<string, string[]> = {
  lq: ['lien quan', 'lien quan mobile', 'arena of valor', 'aov'],
  lqmb: ['lien quan mobile', 'lien quan'],
  lqm: ['lien quan mobile', 'lien quan'],
  hsr: ['honkai star rail', 'star rail'],
  hi3: ['honkai impact 3', 'honkai impact 3rd'],
  gi: ['genshin impact', 'genshin'],
  ff: ['free fire', 'garena free fire'],
  ffmax: ['free fire max'],
  vltk: ['vo lam truyen ky'],
  vltkm: ['vo lam truyen ky mobile'],
  vltk1: ['vo lam truyen ky 1'],
  lmht: ['lien minh huyen thoai', 'league of legends', 'lol'],
  lol: ['lien minh huyen thoai', 'league of legends'],
  tft: ['dau truong chan ly', 'teamfight tactics', 'dtcl'],
  dtcl: ['dau truong chan ly', 'teamfight tactics', 'tft'],
  fo4: ['fifa online 4', 'ea sports fc online', 'fc online'],
  fc: ['ea sports fc online', 'fc online', 'fifa online 4'],
  pubg: ['pubg mobile', 'pubg'],
  pubgm: ['pubg mobile'],
  nr: ['ngoc rong online', 'chu be rong', 'ngoc rong'],
  nro: ['ngoc rong online', 'ngoc rong'],
  htd: ['hac tay du chuong cam', 'hac tay du'],
  tlbb: ['thien long bat bo'],
  kt: ['kiem the'],
  ktm: ['kiem the mobile'],
  td: ['tay du'],
  tq: ['tam quoc'],
  op: ['outerplane', 'one piece'],
  bns: ['blade and soul'],
  dnf: ['dungeon and fighter', 'dungeon fighter'],
  zzz: ['zenless zone zero'],
  doors: ['doors roblox', 'doors'],
  ww: ['wuthering waves'],
  mc: ['minecraft'],
  roblox: ['roblox', 'roblox viet nam', 'roblox vng'],
  bf: ['blox fruits', 'roblox blox fruits'],
  blox: ['blox fruits', 'roblox blox fruits', 'roblox'],
  dldl: ['dau la dai luc', 'dau la dai luc hon su doi quyet', 'dau la vng'],
  dla: ['dau la dai luc'],
  bb: ['blade ball'],
  kl: ['king legacy'],
  afk: ['afk journey', 'afk arena'],
  slg: ['chien thuat'],
  tcg: ['the bai'],
  vng: ['vnggames', 'vng'],
  gosu: ['truc tuyen gosu', 'gosu'],
  soha: ['sohagame', 'soha'],
  funtap: ['funtap'],
  gamota: ['gamota'],
  vtc: ['vtc game', 'vtc mobile'],
  garena: ['garena'],
  tg: ['tien gioi', 'tien gioi nhan kiem hop nhat'],
  tgnk: ['tien gioi nhan kiem hop nhat', 'tien gioi nhan kiem'],
  tgnkhn: ['tien gioi nhan kiem hop nhat'],
  nk: ['nhan kiem', 'tien gioi nhan kiem hop nhat'],
  tala: ['ta la hac ngo khong', 'ta la'],
  hnk: ['hac ngo khong', 'ta la hac ngo khong'],
  tlhnk: ['ta la hac ngo khong'],
  vplay: ['vplay'],
  vgp: ['vgp'],
};

export interface GameSearchScoreResult {
  score: number;
  matchType:
    | 'exact_name'
    | 'name_prefix'
    | 'name_word'
    | 'name_sub'
    | 'exact_slug'
    | 'slug_match'
    | 'acronym'
    | 'publisher'
    | 'category'
    | 'description'
    | 'none';
  matchDetail?: string;
}

/**
 * Core Shared Game Search Matcher:
 * Single Source of Truth used across:
 * 1. Autocomplete Dropdown (SearchAutocomplete)
 * 2. Main Game Catalog Grid (App.tsx / dataService.ts)
 * 3. Public API /api/games?search= and /api/games?autocomplete=1 (functions/api/games.ts)
 */
export function matchGameSearch(
  game: {
    name?: string | null;
    slug?: string | null;
    publisher?: string | null;
    category?: string | null;
    description?: string | null;
  },
  searchQuery: string
): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const rawQuery = searchQuery.trim().toLowerCase();
  const queryNorm = normalizeSearchText(rawQuery);
  if (!queryNorm) return true;

  const rawName = (game.name || '').trim().toLowerCase();
  const rawSlug = (game.slug || '').trim().toLowerCase();
  const rawPublisher = (game.publisher || '').trim().toLowerCase();

  // If query contains explicit Vietnamese diacritics (e.g. 'Thực Thần Ký' or 'Kỳ Tích Trở Lại'):
  // MUST match with diacritics respected! If diacritics conflict (e.g. 'Thực' vs 'Thức'), it must NOT match.
  if (hasVietnameseDiacritics(rawQuery)) {
    const cleanRawQ = rawQuery.replace(/[-_]+/g, ' ');
    const cleanRawName = rawName.replace(/[-_]+/g, ' ');
    const cleanRawSlug = rawSlug.replace(/[-_]+/g, ' ');
    const cleanRawPub = rawPublisher.replace(/[-_]+/g, ' ');

    if (
      cleanRawName.includes(cleanRawQ) ||
      cleanRawSlug.includes(cleanRawQ) ||
      cleanRawPub.includes(cleanRawQ)
    ) {
      return true;
    }

    // Also check token-by-token if all accented words match
    const qTokens = cleanRawQ.split(/\s+/).filter(Boolean);
    if (qTokens.length > 1) {
      const nameTokens = cleanRawName.split(/\s+/).filter(Boolean);
      const allTokensInName = qTokens.every(
        (qTok) => nameTokens.some((nTok) => nTok.startsWith(qTok) || nTok === qTok)
      );
      if (allTokensInName) return true;
    }

    return false;
  }

  // If query has NO diacritics (e.g. 'thuc than ky', 'ky tich tro lai', 'genshin', 'thuc-than-ky'):
  // Compare normalized versions (diacritics stripped, hyphens and spaces equivalent)
  const nameNorm = normalizeSearchText(game.name || '');
  const slugNorm = normalizeSearchText(game.slug || '');
  const pubNorm = normalizeSearchText(game.publisher || '');

  // 1. Exact match
  if (nameNorm === queryNorm || slugNorm === queryNorm) return true;

  // 2. Substring match
  if (nameNorm.includes(queryNorm) || slugNorm.includes(queryNorm) || pubNorm.includes(queryNorm)) {
    return true;
  }

  // 3. Compact text match (spaces stripped: e.g. 'thucthanky' matches 'thuc than ky')
  const qCompact = queryNorm.replace(/\s+/g, '');
  if (qCompact.length >= 3) {
    const nameCompact = nameNorm.replace(/\s+/g, '');
    const slugCompact = slugNorm.replace(/\s+/g, '');
    if (nameCompact.includes(qCompact) || slugCompact.includes(qCompact)) {
      return true;
    }
  }

  // 4. Token-by-token all-words match
  const qWords = queryNorm.split(/\s+/).filter(Boolean);
  if (qWords.length > 1) {
    const nameWords = nameNorm.split(/\s+/).filter(Boolean);
    const allWordsPresent = qWords.every(
      (qw) => nameWords.some((nw) => nw.startsWith(qw) || nw === qw)
    );
    if (allWordsPresent) return true;
  }

  // 5. Gaming Acronym / Initials match (e.g. "lq", "vltk", "hsr", "htd")
  if (qCompact.length >= 2 && qCompact.length <= 6) {
    const mapped = GAME_ACRONYM_MAP[qCompact];
    if (mapped) {
      for (const phrase of mapped) {
        const normPhrase = normalizeSearchText(phrase);
        if (nameNorm.includes(normPhrase) || slugNorm.includes(normPhrase)) {
          return true;
        }
      }
    }
    const initials = nameNorm.split(/\s+/).filter(Boolean).map((w) => w[0]).join('');
    if (initials === qCompact || initials.startsWith(qCompact)) {
      return true;
    }
  }

  return false;
}

/**
 * Intelligent game search scoring & relevance engine:
 * Ranks games so that direct name matches appear first, followed by prefixes,
 * acronyms, word-matches, publisher matches, and lastly category/description matches.
 */
export function calculateGameSearchScore(
  game: {
    name?: string | null;
    slug?: string | null;
    publisher?: string | null;
    category?: string | null;
    description?: string | null;
    is_hot?: boolean | number;
    is_featured?: boolean | number;
    codes_count?: number;
  },
  searchQuery: string
): GameSearchScoreResult {
  if (!searchQuery || !searchQuery.trim()) {
    return { score: 0, matchType: 'none' };
  }

  const rawQuery = searchQuery.trim().toLowerCase();
  const queryNorm = normalizeSearchText(rawQuery);
  const queryCompact = queryNorm.replace(/\s+/g, '');
  if (!queryNorm && !queryCompact) return { score: 0, matchType: 'none' };

  const nameRaw = (game.name || '').trim().toLowerCase();
  const nameNorm = normalizeSearchText(game.name || '');
  const nameCompact = nameNorm.replace(/\s+/g, '');

  const slugRaw = (game.slug || '').trim().toLowerCase();
  const slugNorm = normalizeSearchText(slugRaw);
  const slugCompact = slugNorm.replace(/[\s-]+/g, '');

  const publisherRaw = (game.publisher || '').trim().toLowerCase();
  const publisherNorm = normalizeSearchText(game.publisher || '');

  const categoryRaw = (game.category || '').trim().toLowerCase();
  const categoryNorm = normalizeSearchText(game.category || '');

  // Guard: If query contains explicit Vietnamese diacritics, verify accented compatibility!
  // If user typed "Thực Thần Ký", it will NOT match "Thức Thần Ký" because "Thực" != "Thức".
  if (hasVietnameseDiacritics(rawQuery)) {
    const cleanRawQ = rawQuery.replace(/[-_]+/g, ' ');
    const cleanRawName = nameRaw.replace(/[-_]+/g, ' ');
    const cleanRawSlug = slugRaw.replace(/[-_]+/g, ' ');
    const cleanRawPub = publisherRaw.replace(/[-_]+/g, ' ');

    let hasAccentedMatch = false;
    if (cleanRawName === cleanRawQ) {
      hasAccentedMatch = true;
    } else if (cleanRawName.startsWith(cleanRawQ)) {
      hasAccentedMatch = true;
    } else if (cleanRawName.includes(cleanRawQ) || cleanRawSlug.includes(cleanRawQ) || cleanRawPub.includes(cleanRawQ)) {
      hasAccentedMatch = true;
    } else {
      const qTokens = cleanRawQ.split(/\s+/).filter(Boolean);
      if (qTokens.length > 1) {
        const nameTokens = cleanRawName.split(/\s+/).filter(Boolean);
        if (qTokens.every((qTok) => nameTokens.some((nTok) => nTok.startsWith(qTok) || nTok === qTok))) {
          hasAccentedMatch = true;
        }
      }
    }

    if (!hasAccentedMatch) {
      return { score: 0, matchType: 'none' };
    }
  }

  let score = 0;
  let matchType: GameSearchScoreResult['matchType'] = 'none';
  let matchDetail = '';

  // 1. Exact match with game name (Raw or Normalized)
  if (nameRaw === rawQuery || nameNorm === queryNorm || nameCompact === queryCompact) {
    score = 10000;
    matchType = 'exact_name';
  }
  // 2. Exact match with slug
  else if (slugRaw === rawQuery || slugNorm === queryNorm || slugCompact === queryCompact) {
    score = 9500;
    matchType = 'exact_slug';
  }
  // 3. Name starts with query (Prefix)
  else if (nameNorm.startsWith(queryNorm) || nameRaw.startsWith(rawQuery) || nameCompact.startsWith(queryCompact)) {
    score = 8500;
    matchType = 'name_prefix';
  }
  // 4. Slug starts with query
  else if (slugNorm.startsWith(queryNorm) || slugRaw.startsWith(rawQuery) || slugCompact.startsWith(queryCompact)) {
    score = 8000;
    matchType = 'slug_match';
  }
  // 5. Gaming Acronym / Abbreviation Match (e.g. "lq", "vltk", "bf", "dldl", "ff", "hsr", "htd")
  else if (queryCompact.length >= 2 && queryCompact.length <= 6) {
    const mapped = GAME_ACRONYM_MAP[queryCompact];
    if (mapped) {
      for (const phrase of mapped) {
        const normPhrase = normalizeVietnamese(phrase);
        if (nameNorm.includes(normPhrase) || slugNorm.includes(normPhrase)) {
          score = 7800;
          matchType = 'acronym';
          break;
        }
      }
    }
    if (score === 0) {
      const initials = nameNorm.split(/[\s\-:_]+/).filter(Boolean).map((w) => w[0]).join('');
      if (initials === queryCompact) {
        score = 7500;
        matchType = 'acronym';
      } else if (initials.startsWith(queryCompact)) {
        score = 7000;
        matchType = 'acronym';
      }
    }
  }

  // 6. Name contains query phrase (require word boundary or length >= 3 to prevent short noise like "ff" in "Offline")
  if (score === 0) {
    const isWordBounded =
      nameNorm.startsWith(queryNorm + ' ') ||
      nameNorm.includes(' ' + queryNorm + ' ') ||
      nameNorm.endsWith(' ' + queryNorm) ||
      nameRaw.startsWith(rawQuery + ' ') ||
      nameRaw.includes(' ' + rawQuery + ' ') ||
      nameRaw.endsWith(' ' + rawQuery);

    if (queryNorm.length >= 3 && (nameNorm.includes(queryNorm) || nameRaw.includes(rawQuery) || nameCompact.includes(queryCompact))) {
      score = 6800;
      matchType = 'name_sub';
    } else if (queryNorm.length < 3 && isWordBounded) {
      score = 6800;
      matchType = 'name_sub';
    } else if (slugNorm.includes(queryNorm) || slugRaw.includes(rawQuery)) {
      if (queryNorm.length >= 3 || slugRaw.startsWith(rawQuery + '-') || slugRaw.includes('-' + rawQuery + '-') || slugRaw.endsWith('-' + rawQuery)) {
        score = 6500;
        matchType = 'slug_match';
      }
    }
  }

  // 7. Word boundary match in name (all query tokens exist as words/prefixes in name)
  if (score === 0) {
    const wordsInName = nameNorm.split(/[\s\-:_]+/).filter(Boolean);
    const nameWordSet = new Set(wordsInName);
    const qTokens = queryNorm.split(' ').filter(Boolean);
    if (qTokens.length > 1 && qTokens.every((tok) => nameWordSet.has(tok) || wordsInName.some((w) => w.startsWith(tok)))) {
      score = 6200;
      matchType = 'name_word';
    } else if (wordsInName.some((w) => w === queryNorm)) {
      score = 5500;
      matchType = 'name_word';
    } else if (wordsInName.some((w) => w.startsWith(queryNorm))) {
      score = 5000;
      matchType = 'name_word';
    }
  }

  // 8. Initials of words in name contain query (secondary initials)
  if (score === 0 && queryCompact.length >= 2 && queryCompact.length <= 6) {
    const initials = nameNorm.split(/[\s\-:_]+/).filter(Boolean).map((w) => w[0]).join('');
    if (initials.includes(queryCompact)) {
      score = 4000;
      matchType = 'acronym';
    }
  }

  // 9. Publisher match
  if (score === 0) {
    if (publisherRaw === rawQuery || publisherNorm === queryNorm) {
      score = 2500;
      matchType = 'publisher';
      matchDetail = `NPH: ${game.publisher}`;
    } else if (publisherNorm.startsWith(queryNorm) || publisherRaw.startsWith(rawQuery)) {
      score = 2000;
      matchType = 'publisher';
      matchDetail = `NPH: ${game.publisher}`;
    } else if (publisherNorm.includes(queryNorm) || publisherRaw.includes(rawQuery)) {
      score = 1500;
      matchType = 'publisher';
      matchDetail = `NPH: ${game.publisher}`;
    }
  }

  // 10. Category match (e.g. "Roblox / Mini Game")
  if (score === 0) {
    if (categoryRaw === rawQuery || categoryNorm === queryNorm) {
      score = 1000;
      matchType = 'category';
      matchDetail = `Thể loại: ${game.category}`;
    } else if (categoryNorm.includes(queryNorm) || categoryRaw.includes(rawQuery)) {
      score = 800;
      matchType = 'category';
      matchDetail = `Thể loại: ${game.category}`;
    }
  }

  // 11. Description match (strict whole-word matching to avoid false positives)
  if (score === 0 && game.description) {
    const descNorm = normalizeVietnamese(game.description);
    if (descNorm.includes(queryNorm)) {
      score = 1200;
      matchType = 'description';
      matchDetail = 'Khớp trong mô tả';
    } else {
      const qTokens = queryNorm.split(' ').filter(Boolean);
      const descWords = descNorm.split(/[\s\-:_]+/).filter(Boolean);
      const descWordSet = new Set(descWords);
      if (qTokens.length > 1 && qTokens.every((tok) => descWordSet.has(tok) || descWords.some((w) => w.startsWith(tok)))) {
        score = 800;
        matchType = 'description';
        matchDetail = 'Khớp trong mô tả';
      }
    }
  }

  // Quality bonuses & tie-breaking penalties
  if (score > 0) {
    // Reward names that are tighter matches to the query length
    if (score >= 6000 && nameNorm) {
      const lengthDiff = Math.max(0, nameNorm.length - queryNorm.length);
      score -= Math.min(300, lengthDiff * 2);
    }
    if (game.is_hot) score += 30;
    if (game.is_featured) score += 20;
    if ((game.codes_count || 0) > 0) score += 50;
  }

  return { score, matchType, matchDetail };
}

/**
 * Split text into chunks highlighting matches for clean React rendering
 */
export function splitMatchHighlight(
  text: string,
  query: string
): Array<{ text: string; isMatch: boolean }> {
  if (!text || !query || !query.trim()) {
    return [{ text: text || '', isMatch: false }];
  }
  const cleanQ = query.trim();
  const qNorm = stripAccents(cleanQ);
  if (!qNorm) return [{ text, isMatch: false }];

  const textNorm = stripAccents(text);
  const idx = textNorm.indexOf(qNorm);
  if (idx === -1) {
    return [{ text, isMatch: false }];
  }

  const parts: Array<{ text: string; isMatch: boolean }> = [];
  let lastIdx = 0;
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const curIdx = textNorm.indexOf(qNorm, searchFrom);
    if (curIdx === -1) break;

    if (curIdx > lastIdx) {
      parts.push({ text: text.slice(lastIdx, curIdx), isMatch: false });
    }
    const matchLen = Math.min(cleanQ.length, text.length - curIdx);
    parts.push({ text: text.slice(curIdx, curIdx + matchLen), isMatch: true });
    lastIdx = curIdx + matchLen;
    searchFrom = lastIdx;
  }

  if (lastIdx < text.length) {
    parts.push({ text: text.slice(lastIdx), isMatch: false });
  }

  return parts;
}


/**
 * Smart Vietnamese search matcher that handles:
 * 1. Diacritic-insensitive matching (có dấu & không dấu, VD: "Hắc Tây Du" khớp "hac-tay-du-chuong-cam")
 * 2. Dash/separator matching (VD: "hac tay du" khớp "hac-tay-du", "genshin impact" khớp "genshin-impact")
 * 3. Multi-word search tokenization (tất cả các từ trong keyword đều có mặt trong tập target)
 * 4. Acronyms & gaming abbreviations (VD: "HSR" khớp "Honkai: Star Rail", "LQ" khớp "Liên Quân Mobile", "HTD" khớp "Hắc Tây Du")
 * 5. Initials matching (chữ cái đầu của các từ)
 */
export function smartVietnameseMatch(
  targets: (string | number | null | undefined) | (string | number | null | undefined)[],
  searchQuery: string
): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const rawQuery = searchQuery.trim();
  const queryNorm = normalizeVietnamese(rawQuery);
  if (!queryNorm) return true;

  const targetArr = Array.isArray(targets) ? targets : [targets];
  const validStrings = targetArr
    .filter((t) => t !== null && t !== undefined && t !== '')
    .map((t) => String(t));

  if (validStrings.length === 0) return false;

  // 1. Direct raw check
  const rawQueryLower = rawQuery.toLowerCase();
  for (const raw of validStrings) {
    if (raw.toLowerCase().includes(rawQueryLower)) return true;
  }

  // 2. Normalized full text check
  const targetNorm = validStrings.map((s) => normalizeVietnamese(s)).join(' ');
  if (targetNorm.includes(queryNorm)) return true;

  // 3. Compact text check (no spaces, dashes, or symbols)
  const targetCompact = targetNorm.replace(/\s+/g, '');
  const queryCompact = queryNorm.replace(/\s+/g, '');
  if (targetCompact.includes(queryCompact)) return true;

  // 4. Multi-token / All words match check (requires whole words or word prefixes to prevent false positive substrings)
  const queryTokens = queryNorm.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    const targetWords = targetNorm.split(/\s+/).filter(Boolean);
    const targetWordSet = new Set(targetWords);
    const allTokensMatch = queryTokens.every(
      (tok) => targetWordSet.has(tok) || targetWords.some((tw) => tw.startsWith(tok))
    );
    if (allTokensMatch) return true;
  }

  // 5. Gaming Acronym / Abbreviation Match check
  if (queryCompact.length >= 2 && queryCompact.length <= 6) {
    // Check known gaming acronym map
    const mappedPhrases = GAME_ACRONYM_MAP[queryCompact];
    if (mappedPhrases) {
      for (const phrase of mappedPhrases) {
        const normPhrase = normalizeVietnamese(phrase);
        const compPhrase = normPhrase.replace(/\s+/g, '');
        if (targetNorm.includes(normPhrase) || targetCompact.includes(compPhrase)) {
          return true;
        }
      }
    }

    // Check initials of target words (exact match or prefix match on whole initials)
    const targetWords = targetNorm.split(/\s+/).filter(Boolean);
    const targetInitials = targetWords.map((w) => w[0]).join('');
    if (targetInitials === queryCompact || targetInitials.startsWith(queryCompact)) return true;
  }

  return false;
}

// Format currency VND
export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Format Core Currency (1 VND = 1 Core)
export function formatCore(amount: number): string {
  const formatted = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `${formatted} Core`;
}

// Format Dual Display: e.g. "50.000 Core (~50.000đ)"
export function formatPriceDual(amount: number): string {
  const core = formatCore(amount);
  const vnd = formatCurrencyVND(amount);
  return `${core} (${vnd})`;
}

// Format relative date
export function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return 'Gần đây';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return String(dateStr || 'Gần đây');
  }
}

// Safe full datetime format: "14:30:25 - 30/09/2026"
export function formatFullDateTime(dateStr?: string | number | null): string {
  if (!dateStr) return '—';
  try {
    let cleanStr = String(dateStr).trim();
    if (/^\d{10,13}$/.test(cleanStr)) {
      const num = Number(cleanStr);
      const d = new Date(num < 10000000000 ? num * 1000 : num);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} - ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
    }
    // If format is SQLite "YYYY-MM-DD HH:MM:SS" without timezone, treat as UTC
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(cleanStr)) {
      cleanStr = cleanStr.replace(' ', 'T') + 'Z';
    }
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
  } catch {
    return String(dateStr || '—');
  }
}

// Relative time formatting in Vietnamese: "Vừa xong", "5 phút trước", "Hôm qua lúc 14:30"
export function formatTimeAgo(dateStr?: string | number | null): string {
  if (!dateStr) return 'Vừa xong';
  try {
    let cleanStr = String(dateStr).trim();
    if (/^\d{10,13}$/.test(cleanStr)) {
      const num = Number(cleanStr);
      cleanStr = new Date(num < 10000000000 ? num * 1000 : num).toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(cleanStr)) {
      cleanStr = cleanStr.replace(' ', 'T') + 'Z';
    }
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return String(dateStr);

    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);

    if (diffSec < 30) return 'Vừa xong';
    if (diffSec < 60) return `${diffSec} giây trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return 'Hôm qua';
    if (diffDay < 7) return `${diffDay} ngày trước`;

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return 'Gần đây';
  }
}

