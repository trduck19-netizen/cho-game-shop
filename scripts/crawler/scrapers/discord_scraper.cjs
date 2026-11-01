/**
 * Discord Scraper & Webhook/Channel Parser
 * Phân tích tin nhắn thông báo code từ Discord Channels hoặc Webhook payloads
 */

const { extractCodesFromHtml } = require('./web_scraper.cjs');

class DiscordScraper {
  /**
   * Phân tích nội dung tin nhắn Discord để trích xuất giftcode
   * @param {string} content - Nội dung văn bản tin nhắn
   * @param {string} channelName - Tên kênh (vd: #announcements, #giftcode)
   * @param {string} serverName - Tên máy chủ (vd: Delta Force VN, Genshin Impact)
   */
  parseMessage(content = '', channelName = '', serverName = '') {
    if (!content) return { codes: [], success: false };

    const codes = [];

    // Tìm các chuỗi code trong block `code` hoặc văn bản
    const codeBlockRegex = /`([A-Z0-9_-]{5,24})`/g;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const c = match[1].trim();
      if (/^[A-Z0-9_-]{5,24}$/.test(c) && !/^(SERVER|ADMIN|UPDATE|DISCORD)$/i.test(c)) {
        codes.push({
          code: c,
          rewards: 'Phần thưởng phát sóng qua Discord',
          expiresAt: null,
        });
      }
    }

    // Nếu không có trong code block, tìm theo từ khóa
    if (codes.length === 0) {
      const keywordRegex = /(?:code|giftcode|mã)[:\s*]+([A-Z0-9_-]{5,24})\b/gi;
      let kwMatch;
      while ((kwMatch = keywordRegex.exec(content)) !== null) {
        const c = kwMatch[1].trim();
        if (/^[A-Z0-9_-]{5,24}$/.test(c)) {
          codes.push({
            code: c,
            rewards: 'Phần thưởng thông báo Discord',
            expiresAt: null,
          });
        }
      }
    }

    return {
      title: `${serverName || 'Discord'} - ${channelName || 'Chat'}: ${content.slice(0, 60)}...`,
      sourceType: 'community_discord',
      codes,
      contextText: content,
      success: codes.length > 0,
    };
  }
}

module.exports = {
  DiscordScraper,
};
