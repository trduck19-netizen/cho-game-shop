/**
 * Bộ Máy So Khớp Tựa Game Thông Minh (Fuzzy Game Matcher)
 * Đối chiếu tiêu đề bài viết với toàn bộ 486+ tựa game hiện có trên hệ thống
 */

const fs = require('fs');
const path = require('path');

function removeAccents(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

class GameMatcher {
  constructor(gamesList = []) {
    this.games = [];
    this.gameIndex = [];
    if (gamesList && gamesList.length > 0) {
      this.init(gamesList);
    } else {
      this.loadDefaultGames();
    }
  }

  loadDefaultGames() {
    try {
      const p = path.resolve(__dirname, '../../../src/data/games188.json');
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        this.init(raw);
      }
    } catch (e) {
      console.warn('GameMatcher: Không thể tải games188.json cục bộ', e.message);
    }
  }

  init(games) {
    this.games = games || [];
    this.gameIndex = this.games.map((g) => {
      const slug = String(g.slug || g.id || '').toLowerCase();
      const name = String(g.name || '');
      const cleanName = removeAccents(name);
      const nameWords = cleanName.split(/[^a-z0-9]+/).filter((w) => w.length > 1);

      // Tạo các từ khóa viết tắt (Initials)
      const initials = nameWords.map((w) => w[0]).join('');

      return {
        id: g.id || slug,
        slug,
        name,
        cleanName,
        publisher: g.publisher || '',
        nameWords,
        initials,
        slugClean: slug.replace(/[-_]/g, ' '),
      };
    });
  }

  /**
   * So khớp bài viết với 486 game
   * @param {string} text - Tiêu đề bài viết hoặc nội dung đoạn văn
   * @param {Object} options - Tùy chọn khớp nâng cao (publisher, targetRegion)
   * @returns {{ game: any, confidence: number, matchedBy: string } | null}
   */
  match(text = '', options = {}) {
    if (!text || this.gameIndex.length === 0) return null;

    const cleanInput = removeAccents(text);
    const compactInput = cleanInput.replace(/\s+/g, '');

    const isGlobalContext = /\b(global|quoc te|sea|world|na|eu)\b/i.test(cleanInput);
    const isVnContext = /\b(viet nam|ban vn|nph viet|phien ban viet)\b/i.test(cleanInput);

    let bestMatch = null;
    let highestScore = 0;
    let matchedReason = '';

    for (const g of this.gameIndex) {
      let score = 0;
      let reason = '';

      const isGameVn = g.slug.endsWith('-vn') || g.cleanName.endsWith(' vn');
      const isGameGlobal = g.slug.endsWith('-global') || g.cleanName.endsWith(' global');

      // 1. Khớp chính xác tên đầy đủ với ranh giới từ
      const escapedClean = g.cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactRegex = new RegExp(`(?:^|[^a-z0-9])${escapedClean}(?:$|[^a-z0-9])`, 'i');

      if (exactRegex.test(cleanInput)) {
        // Điểm cơ bản 1.0, cộng thêm điểm độ đặc hiệu (tựa game dài hơn, nhiều từ hơn thì ưu tiên hơn)
        score = 1.0 + (g.nameWords.length * 0.05);
        reason = `Khớp chính xác tên: "${g.name}" (${g.nameWords.length} từ)`;
      }
      // 2. Khớp chính xác slug dạng không dấu
      else if (cleanInput.includes(g.slugClean) && g.slugClean.length > 4) {
        score = 0.95 + (g.nameWords.length * 0.03);
        reason = `Khớp slug sạch: "${g.slugClean}"`;
      }
      // 3. Khớp tên không khoảng trắng (VD: piratelegends, deltaforce)
      else if (compactInput.includes(g.cleanName.replace(/\s+/g, '')) && g.cleanName.length > 4) {
        score = 0.9 + (g.nameWords.length * 0.02);
        reason = `Khớp chuỗi liền: "${g.name}"`;
      }
      // 4. Khớp các từ khóa chính (> 2 từ chính khớp liên tiếp)
      else if (g.nameWords.length >= 2) {
        let matchedWordCount = 0;
        for (const w of g.nameWords) {
          const wRegex = new RegExp(`(?:^|[^a-z0-9])${w}(?:$|[^a-z0-9])`, 'i');
          if (wRegex.test(cleanInput)) {
            matchedWordCount++;
          }
        }
        const wordRatio = matchedWordCount / g.nameWords.length;
        if (wordRatio >= 0.75) {
          score = Math.max(score, 0.75 + wordRatio * 0.15);
          reason = `Khớp ${matchedWordCount}/${g.nameWords.length} từ khóa chính`;
        }
      }

      // Xử lý từ viết tắt đặc biệt (Acronyms nổi tiếng)
      if (score < 0.8) {
        if (cleanInput.includes('delta force') && g.slug === 'delta-force') {
          score = 1.0;
          reason = 'Khớp từ khóa đặc biệt Delta Force';
        } else if ((cleanInput.includes('hai tac') || cleanInput.includes('huyen thoai hai tac')) && (g.slug === 'pirate-legends' || g.slug === 'huyen-thoai-hai-tac')) {
          score = 1.0;
          reason = 'Khớp từ khóa Hải Tặc / Pirate Legends';
        } else if (cleanInput.includes('genshin') && g.slug === 'genshin-impact') {
          score = 1.0;
          reason = 'Khớp Genshin Impact';
        } else if ((cleanInput.includes('star rail') || cleanInput.includes('hsr')) && g.slug === 'honkai-star-rail') {
          score = 0.95;
          reason = 'Khớp Honkai: Star Rail';
        } else if (cleanInput.includes('roblox') && g.slug === 'roblox') {
          score = 1.0;
          reason = 'Khớp Roblox';
        }
      }

      // 5. Thưởng / Phạt Nhà Phát Hành & Phiên Bản (Chống gán nhầm game)
      if (score >= 0.7 && g.publisher) {
        const cleanPub = removeAccents(g.publisher);
        if (cleanPub && cleanPub.length >= 3 && cleanInput.includes(cleanPub)) {
          score += 0.2;
          reason += ` + Khớp NPH "${g.publisher}"`;
        }
      }

      // Chống xung đột Global vs VN
      if (score >= 0.7) {
        if (isGlobalContext && isGameVn) {
          score -= 0.4;
          reason += ' (Cảnh báo: nguồn là bản Global nhưng game là VN)';
        } else if (isVnContext && isGameGlobal) {
          score -= 0.4;
          reason += ' (Cảnh báo: nguồn là bản VN nhưng game là Global)';
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = g;
        matchedReason = reason;
      }
    }

    if (bestMatch && highestScore >= 0.5) {
      const originalGame = this.games.find((x) => (x.slug || x.id) === bestMatch.slug) || bestMatch;
      return {
        game: originalGame,
        confidence: Math.min(1.0, Number(highestScore.toFixed(2))),
        matchedBy: matchedReason,
      };
    }

    return null;
  }
}

module.exports = {
  GameMatcher,
};
