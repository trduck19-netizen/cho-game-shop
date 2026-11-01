import { normalizeVietnamese } from './textUtils';

/**
 * Danh sách từ khóa cấm / quảng cáo / phụ kiện công nghệ không liên quan tới Game
 */
export const BLACKLIST_NEWS_KEYWORDS: string[] = [
  // 1. Phụ kiện công nghệ
  'tui chong soc',
  'túi chống sốc',
  'balo laptop',
  'ba lô laptop',
  'chuot gaming',
  'chuột gaming',
  'chuot asus',
  'chuột asus',
  'chuot logitech',
  'chuột logitech',
  'chuot khong day',
  'chuột không dây',
  'chuot co day',
  'chuột có dây',
  'ban phim co',
  'bàn phím cơ',
  'ban phim co day',
  'bàn phím có dây',
  'ban phim gaming',
  'bàn phím gaming',
  'ban phim khong day',
  'bàn phím không dây',
  'lot chuot',
  'lót chuột',
  'tai nghe bluetooth',
  'tai nghe gaming',
  'tai nghe chup tai',
  'tai nghe nhét tai',
  'headphone',
  'earphone',
  'cu sac',
  'củ sạc',
  'cap sac',
  'cáp sạc',
  'sac du phong',
  'sạc dự phòng',
  'op lung',
  'ốp lưng',
  'kinh cuong luc',
  'kính cường lực',
  'dan man hinh',
  'dán màn hình',
  'gia do laptop',
  'giá đỡ laptop',
  'gia do dien thoai',
  'giá đỡ điện thoại',
  'de tan nhiet',
  'đế tản nhiệt',

  // 2. Thiết bị phần cứng & đồ điện tử
  'laptop gaming',
  'laptop van phong',
  'laptop văn phòng',
  'macbook',
  'ipad pro',
  'ipad air',
  'iphone 15',
  'iphone 16',
  'samsung galaxy',
  'dien thoai thong minh',
  'điện thoại thông minh',
  'card man hinh',
  'card màn hình',
  'card do hoa',
  'card đồ họa',
  'vga',
  'ram ddr4',
  'ram ddr5',
  'ssd nvme',
  'o cung ssd',
  'ổ cứng ssd',
  'mainboard',
  'cpu intel',
  'cpu ryzen',
  'nguon may tinh',
  'nguồn máy tính',
  'case pc',
  'man hinh may tinh',
  'màn hình máy tính',

  // 3. Y tế, dịch vụ khám chữa bệnh, tiện ích đời sống ngoài lề
  'medpro',
  'kham benh',
  'khám bệnh',
  'dat lich kham',
  'đặt lịch khám',
  'benh vien',
  'bệnh viện',
  'bac si',
  'bác sĩ',
  'phong kham',
  'phòng khám',
  'vay tien',
  'vay tiền',
  'tin dung',
  'tín dụng',
  'bao hiem',
  'bảo hiểm',

  // 4. Bài viết thương mại thuần túy & săn sale bán hàng
  'dap hop',
  'đập hộp',
  'tren tay danh gia',
  'trên tay đánh giá',
  'tra gop 0%',
  'trả góp 0%',
  'gia bao nhieu tien',
  'giá bao nhiêu tiền',
  'san sale shopee',
  'săn sale shopee',
  'voucher lazada',
  'khuyen mai phu kien',
  'khuyến mãi phụ kiện',
  'xa hang ton kho',
  'xả hàng tồn kho',
];

/**
 * Kiểm tra xem một bài viết có phải là tin rác, quảng cáo phụ kiện hoặc không liên quan tới Game không
 */
export function isSpamOrAdArticle(
  title: string,
  content: string = '',
  url: string = ''
): { isSpam: boolean; reason?: string } {
  const combined = `${title || ''} ${url || ''} ${(content || '').slice(0, 1500)}`.toLowerCase();
  const normalized = normalizeVietnamese(combined);

  for (const keyword of BLACKLIST_NEWS_KEYWORDS) {
    const normKw = normalizeVietnamese(keyword);
    if (combined.includes(keyword.toLowerCase()) || normalized.includes(normKw)) {
      return {
        isSpam: true,
        reason: `Chứa từ khóa phụ kiện / quảng cáo: "${keyword}"`,
      };
    }
  }

  // Tiêu đề dạng generic "Game Mobile: Túi chống sốc...", "Game Mobile: Chuột..."
  if (
    /^game mobile:\s*(túi|chuột|bàn phím|tai nghe|laptop|medpro|củ sạc|ba lô)/i.test(title)
  ) {
    return {
      isSpam: true,
      reason: 'Tiêu đề không thuộc danh mục game',
    };
  }

  return { isSpam: false };
}

/**
 * Kiểm tra bài viết có liên quan đến game thực tế trong danh mục hay không
 */
export function isGameCatalogMatch(
  text: string,
  games: Array<{ name?: string; slug?: string }>
): boolean {
  if (!text || !games || games.length === 0) return false;
  const normText = normalizeVietnamese(text);

  return games.some((g) => {
    const normName = normalizeVietnamese(g.name || '');
    if (normName.length >= 4 && normText.includes(normName)) {
      return true;
    }
    const normSlug = (g.slug || '').replace(/-/g, ' ').toLowerCase();
    if (normSlug.length >= 5 && normText.includes(normSlug)) {
      return true;
    }
    return false;
  });
}
