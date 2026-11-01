import type {
  StoreProduct,
  UtilityProduct,
  ProductPackageVariant,
  GiveawayCampaign,
  GiveawayRewardPackage,
} from '../types/game';

/**
 * Lấy danh sách các gói con của một sản phẩm (StoreProduct hoặc UtilityProduct).
 * Nếu sản phẩm chưa có mảng `packages`, tự động tạo một gói mặc định tương thích ngược 100%.
 */
export function getProductPackages(product: StoreProduct | UtilityProduct): ProductPackageVariant[] {
  if (!product) return [];

  if (Array.isArray(product.packages) && product.packages.length > 0) {
    return product.packages;
  }

  // Fallback 100% cho sản phẩm cũ đơn gói
  return [
    {
      id: product.id,
      name: product.title,
      price: product.current_price || 0,
      original_price: product.original_price || product.current_price || 0,
      stock_quantity: typeof product.stock_quantity === 'number' ? product.stock_quantity : 0,
      sold_count: product.sold_count || 0,
      badge: (product as any).badge || undefined,
      note: 'Xử lý tiêu chuẩn',
      is_active: product.is_active !== false,
    },
  ];
}

/**
 * Lấy mức giá thấp nhất của sản phẩm từ các gói con
 */
export function getProductMinPrice(product: StoreProduct | UtilityProduct): number {
  if (!product) return 0;
  const packages = getProductPackages(product);
  if (packages.length === 0) return product.current_price || 0;
  return Math.min(...packages.map((p) => p.price));
}

/**
 * Lấy mức giá cao nhất của sản phẩm từ các gói con
 */
export function getProductMaxPrice(product: StoreProduct | UtilityProduct): number {
  if (!product) return 0;
  const packages = getProductPackages(product);
  if (packages.length === 0) return product.current_price || 0;
  return Math.max(...packages.map((p) => p.price));
}

/**
 * Lấy tổng tồn kho thực tế từ tất cả các gói con
 */
export function getProductTotalStock(product: StoreProduct | UtilityProduct): number {
  if (!product) return 0;
  const packages = getProductPackages(product);
  if (!product.packages || product.packages.length === 0) {
    return typeof product.stock_quantity === 'number' ? product.stock_quantity : 0;
  }
  return packages.reduce((sum, pkg) => sum + (Number(pkg.stock_quantity) || 0), 0);
}

/**
 * Lấy tổng số lượng đã bán từ tất cả các gói con
 */
export function getProductTotalSold(product: StoreProduct | UtilityProduct): number {
  if (!product) return 0;
  if (!product.packages || product.packages.length === 0) {
    return Number(product.sold_count) || 0;
  }
  const packages = getProductPackages(product);
  return packages.reduce((sum, pkg) => sum + (Number(pkg.sold_count) || 0), 0);
}

/**
 * Lấy danh sách các gói quà tặng của một chiến dịch Giveaway.
 * Nếu chưa có packages, fallback gói chính từ campaign.
 */
export function getGiveawayPackages(campaign: GiveawayCampaign): GiveawayRewardPackage[] {
  if (!campaign) return [];

  if (Array.isArray(campaign.packages) && campaign.packages.length > 0) {
    return campaign.packages;
  }

  // Fallback gói mặc định
  const poolCount =
    Array.isArray(campaign.codes_pool)
      ? campaign.codes_pool.length
      : (typeof campaign.remaining_codes === 'number' ? campaign.remaining_codes : 0);

  return [
    {
      id: campaign.id,
      name: campaign.title || 'Mã Quà Tặng Mặc Định',
      rewards: campaign.rewards || 'Giftcode độc quyền',
      total_codes: campaign.total_codes || 0,
      claimed_codes: campaign.claimed_codes || 0,
      remaining_codes: poolCount,
      codes_pool: campaign.codes_pool || [],
      is_active: campaign.is_active !== false,
      note: 'Dành cho tất cả thành viên',
    },
  ];
}

/**
 * Gom nhóm sản phẩm Store theo cùng Tựa Game (game_slug)
 * Giúp mỗi game chỉ hiển thị 1 thẻ đại diện ngoài sàn,
 * khi ấn vào mở modal chọn các gói nạp tương ứng.
 */
export function groupStoreProductsByGame(products: StoreProduct[]): StoreProduct[] {
  if (!Array.isArray(products) || products.length === 0) return [];

  const gameMap = new Map<string, StoreProduct[]>();
  const results: StoreProduct[] = [];

  for (const prod of products) {
    // Nếu sản phẩm đã có mảng packages riêng (đã là sản phẩm cha), giữ nguyên
    if (Array.isArray(prod.packages) && prod.packages.length > 1) {
      results.push(prod);
      continue;
    }

    const key = prod.game_slug ? prod.game_slug.toLowerCase().trim() : prod.id;
    if (!gameMap.has(key)) {
      gameMap.set(key, []);
    }
    gameMap.get(key)!.push(prod);
  }

  for (const [, list] of gameMap.entries()) {
    if (list.length === 1) {
      results.push(list[0]);
    } else {
      // Gộp nhiều sản phẩm cùng game thành 1 sản phẩm cha
      const lead = list[0];
      const packages: ProductPackageVariant[] = list.map((item) => ({
        id: item.id,
        name: item.title,
        price: item.current_price,
        original_price: item.original_price,
        stock_quantity: item.stock_quantity,
        sold_count: item.sold_count || 0,
        virtual_sold_count: item.virtual_sold_count || 0,
        badge: item.badge,
        note: item.package_type || 'Gói nạp game',
        is_active: item.is_active !== false,
      }));

      const totalStock = packages.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0);
      const totalSold = packages.reduce((sum, p) => sum + (Number(p.sold_count) || 0), 0);
      const totalVirtualSold = list.reduce((sum, p) => sum + (Number(p.virtual_sold_count) || 0), 0);
      const minPrice = Math.min(...packages.map((p) => p.price));

      const parentProduct: StoreProduct = {
        ...lead,
        id: lead.id,
        title: `${lead.game_name} - Nạp Game & Gói Quà Tặng`,
        current_price: minPrice,
        stock_quantity: totalStock,
        sold_count: totalSold,
        virtual_sold_count: totalVirtualSold,
        packages,
      };

      results.push(parentProduct);
    }
  }

  return results;
}

/**
 * Gom nhóm sản phẩm Tiện Ích theo cùng Chủ Đề / Dịch Vụ
 * Ví dụ: gom các gói Basic (1D, 7D, 30D), VIP (1D, 7D, 30D)... của VS Phone
 * thành các sản phẩm đại diện có danh sách gói tùy chọn.
 */
export function groupUtilitiesByTheme(utilities: UtilityProduct[]): UtilityProduct[] {
  if (!Array.isArray(utilities) || utilities.length === 0) return [];

  // Map theo prefix định danh của gói
  const vsPrefixMap: Record<string, string> = {
    'ut_vs_01_basic': 'vs_basic',
    'ut_vs_02_basic': 'vs_basic',
    'ut_vs_03_basic': 'vs_basic',
    'ut_vs_04_vip': 'vs_vip',
    'ut_vs_05_vip': 'vs_vip',
    'ut_vs_06_vip': 'vs_vip',
    'ut_vs_07_kvip': 'vs_kvip',
    'ut_vs_08_kvip': 'vs_kvip',
    'ut_vs_09_kvip': 'vs_kvip',
    'ut_vs_10_svip': 'vs_svip',
    'ut_vs_11_svip': 'vs_svip',
    'ut_vs_12_svip': 'vs_svip',
    'ut_vs_13_xvip': 'vs_xvip',
    'ut_vs_14_xvip': 'vs_xvip',
    'ut_vs_15_xvip': 'vs_xvip',
    'ut_vs_16_mvip': 'vs_mvip',
    'ut_vs_17_mvip': 'vs_mvip',
    'ut_vs_18_mvip': 'vs_mvip',
  };

  const groupThemeMeta: Record<
    string,
    { title: string; badge: string; description: string }
  > = {
    vs_basic: {
      title: 'Cloud Phone VS Phone Basic - Treo Game Android Đám Mây',
      badge: 'GIÁ RẺ NHẤT',
      description: 'Máy ảo đám mây VS Phone dòng Basic. Thích hợp treo game nhẹ, auto 24/7 không hao pin, không nóng máy.',
    },
    vs_vip: {
      title: 'Cloud Phone VS Phone VIP - Cấu Hình Cao Treo Game 24/7',
      badge: 'HOT BÁN CHẠY',
      description: 'Máy ảo đám mây VS Phone dòng VIP. Cấu hình mượt mà, RAM lớn, treo game 3D không lo văng app.',
    },
    vs_kvip: {
      title: 'Cloud Phone VS Phone KVIP - Tối Ưu Mạng & Tốc Độ',
      badge: 'HIỆU NĂNG CAO',
      description: 'Máy ảo đám mây VS Phone dòng KVIP. Đường truyền riêng biệt, chống nghẽn mạng giờ cao điểm.',
    },
    vs_svip: {
      title: 'Cloud Phone VS Phone SVIP - Đồ Họa Siêu Cấp',
      badge: 'CHUYÊN GAME NẶNG',
      description: 'Máy ảo đám mây VS Phone dòng SVIP. GPU chuyên dụng, xử lý đồ họa mượt mà các tựa game AAA.',
    },
    vs_xvip: {
      title: 'Cloud Phone VS Phone XVIP - Đỉnh Cao Đám Mây',
      badge: 'CẤU HÌNH KHỦNG',
      description: 'Dòng máy ảo XVIP cao cấp nhất. Hỗ trợ đa nhiệm không giới hạn, bảo vệ tài khoản tối đa.',
    },
    vs_mvip: {
      title: 'Cloud Phone VS Phone MVIP - Dành Riêng Bang Hội & Cày Thuê',
      badge: 'PRO GAMER',
      description: 'Dòng máy ảo MVIP chuyên nghiệp. Cụm máy chủ chuyên dụng, uptime 99.99%.',
    },
  };

  const themeGroups = new Map<string, UtilityProduct[]>();
  const independentItems: UtilityProduct[] = [];

  for (const item of utilities) {
    // Nếu sản phẩm đã có mảng packages riêng (như Dịch vụ Facebook...), giữ nguyên
    if (Array.isArray(item.packages) && item.packages.length > 1) {
      independentItems.push(item);
      continue;
    }

    // Kiểm tra tiền tố VS Phone
    let matchedGroup: string | null = null;
    for (const [prefix, groupKey] of Object.entries(vsPrefixMap)) {
      if (item.id.startsWith(prefix)) {
        matchedGroup = groupKey;
        break;
      }
    }

    if (matchedGroup) {
      if (!themeGroups.has(matchedGroup)) {
        themeGroups.set(matchedGroup, []);
      }
      themeGroups.get(matchedGroup)!.push(item);
    } else {
      independentItems.push(item);
    }
  }

  const results: UtilityProduct[] = [...independentItems];

  // Tạo sản phẩm đại diện cho từng nhóm VS Phone
  for (const [groupKey, list] of themeGroups.entries()) {
    const lead = list[0];
    const meta = groupThemeMeta[groupKey] || {
      title: lead.title,
      badge: lead.badge || 'HOT',
      description: lead.description,
    };

    const packages: ProductPackageVariant[] = list.map((subItem) => {
      // Trích xuất tên gói thời hạn (1 Ngày, 7 Ngày, 30 Ngày)
      let durationName = subItem.title;
      if (subItem.title.includes('1 Day')) durationName = 'Gói 1 Ngày (24 Giờ)';
      else if (subItem.title.includes('7 Days')) durationName = 'Gói 7 Ngày (1 Tuần)';
      else if (subItem.title.includes('30 Days')) durationName = 'Gói 30 Ngày (1 Tháng)';

      return {
        id: subItem.id,
        name: durationName,
        price: subItem.current_price,
        original_price: subItem.original_price,
        stock_quantity: subItem.stock_quantity,
        sold_count: subItem.sold_count || 0,
        virtual_sold_count: subItem.virtual_sold_count || 0,
        badge: subItem.badge,
        note: 'Giao tài khoản tự động trong 0 giây',
        is_active: subItem.is_active !== false,
      };
    });

    const totalStock = packages.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0);
    const totalSold = packages.reduce((sum, p) => sum + (Number(p.sold_count) || 0), 0);
    const totalVirtualSold = list.reduce((sum, p) => sum + (Number(p.virtual_sold_count) || 0), 0);
    const minPrice = Math.min(...packages.map((p) => p.price));

    const parentUtility: UtilityProduct = {
      ...lead,
      id: lead.id,
      title: meta.title,
      badge: meta.badge,
      description: meta.description || lead.description,
      current_price: minPrice,
      stock_quantity: totalStock,
      sold_count: totalSold,
      virtual_sold_count: totalVirtualSold,
      packages,
    };

    results.push(parentUtility);
  }

  return results;
}

/**
 * Gom nhóm các chiến dịch Giveaway cùng 1 tựa game
 * Giúp mỗi game chỉ hiện 1 sự kiện quà tặng đại diện,
 * bên trong chứa các gói quà tặng khác nhau (Tân thủ, Tuần, Tri ân...).
 */
export function groupGiveawaysByGame(campaigns: GiveawayCampaign[]): GiveawayCampaign[] {
  if (!Array.isArray(campaigns) || campaigns.length === 0) return [];

  const gameMap = new Map<string, GiveawayCampaign[]>();
  const results: GiveawayCampaign[] = [];

  for (const camp of campaigns) {
    if (Array.isArray(camp.packages) && camp.packages.length > 1) {
      results.push(camp);
      continue;
    }

    const key = camp.game_slug ? camp.game_slug.toLowerCase().trim() : camp.id;
    if (!gameMap.has(key)) {
      gameMap.set(key, []);
    }
    gameMap.get(key)!.push(camp);
  }

  for (const [, list] of gameMap.entries()) {
    if (list.length === 1) {
      results.push(list[0]);
    } else {
      const lead = list[0];
      const packages: GiveawayRewardPackage[] = list.map((item, idx) => ({
        id: item.id,
        name: item.title || `Gói Quà Tặng #${idx + 1}`,
        rewards: item.rewards,
        total_codes: item.total_codes || 0,
        claimed_codes: item.claimed_codes || 0,
        remaining_codes:
          Array.isArray(item.codes_pool) && item.codes_pool.length > 0
            ? item.codes_pool.length
            : (typeof item.remaining_codes === 'number' ? item.remaining_codes : 0),
        codes_pool: item.codes_pool || [],
        is_active: item.is_active !== false,
        note: 'Dành cho thành viên',
      }));

      const totalPool = packages.reduce((sum, p) => sum + (Number(p.remaining_codes) || 0), 0);
      const totalClaimed = packages.reduce((sum, p) => sum + (Number(p.claimed_codes) || 0), 0);
      const totalVirtualClaimed = list.reduce((sum, p) => sum + (Number(p.virtual_claimed_offset) || 0), 0);

      const parentCampaign: GiveawayCampaign = {
        ...lead,
        id: lead.id,
        title: `Code riêng ${lead.game_name}`,
        remaining_codes: totalPool,
        claimed_codes: totalClaimed,
        virtual_claimed_offset: totalVirtualClaimed,
        total_codes: totalPool + totalClaimed,
        packages,
      };

      results.push(parentCampaign);
    }
  }

  return results;
}
