export type Language = 'vi' | 'en' | 'zh' | 'th';

export interface TranslationSchema {
  nav: {
    catalog: string;
    news: string;
    giveaways: string;
    store: string;
    utilities: string;
    missions: string;
  };
  header: {
    portalSubtitle: string;
    bookmarksTitle: string;
    account: string;
    wallet: string;
    myCodes: string;
    luckyWheel: string;
    submitCode: string;
    adminPortal: string;
    logout: string;
    themeToggle: string;
    language: string;
  };
  hero: {
    liveBadge: string;
    titleMain: string;
    titleHighlight: string;
    subtitle: string;
    searchPlaceholder: string;
    searchBtn: string;
    hotTags: string;
    statGames: string;
    statCodes: string;
    statFree: string;
    statUpdated: string;
  };
  search: {
    matchingGames: string;
    matchingCodes: string;
    noResults: string;
    copyCode: string;
    copied: string;
    active: string;
    expired: string;
    viewAll: string;
    hint: string;
  };
  filter: {
    all: string;
    hot: string;
    new: string;
    hasCodes: string;
    bookmarked: string;
    allCategories: string;
    sortBy: string;
    sortUpdated: string;
    sortPopular: string;
    sortCodes: string;
    sortRelease: string;
    sortName: string;
    sortRating: string;
    sortLicense: string;
    sortDesc: string;
    sortAsc: string;
    resultsCount: string;
    showing: string;
    gamesFound: string;
    noGames: string;
    resetFilter: string;
    viewModeGrid: string;
    viewModeCompact: string;
    viewModeList: string;
  };
  gameCard: {
    licensed: string;
    international: string;
    licenseTooltip: string;
    internationalTooltip: string;
    licenseNo: string;
    codesAvailable: string;
    viewCodes: string;
    quickCopy: string;
    copied: string;
    bookmarked: string;
    addBookmark: string;
    publisher: string;
  };
  modal: {
    allCodes: string;
    activeCodes: string;
    expiredCodes: string;
    copy: string;
    copySuccess: string;
    copiedNotice: string;
    expiredNotice: string;
    instructions: string;
    gameInfo: string;
    publisher: string;
    license: string;
    licenseDate: string;
    releaseDate: string;
    platform: string;
    downloadGame: string;
    redeemWeb: string;
    share: string;
    reportWorking: string;
    reportExpired: string;
    close: string;
    codeCount: string;
    activeCount: string;
    expiredCount: string;
    copyAll: string;
    copyAllSuccess: string;
    copiedAll: string;
  };
  giveaways: {
    title: string;
    subtitle: string;
    claimCode: string;
    alreadyClaimed: string;
    ended: string;
    remaining: string;
    total: string;
    endsAt: string;
    loginRequired: string;
    activeTitle: string;
    historyTitle: string;
  };
  store: {
    title: string;
    subtitle: string;
    buyNow: string;
    outOfStock: string;
    instantDelivery: string;
    depositCore: string;
    discount: string;
    originalPrice: string;
    salePrice: string;
  };
  utilities: {
    title: string;
    subtitle: string;
    launchTool: string;
    category: string;
  };
  footer: {
    siteDesc: string;
    quickLinks: string;
    legal: string;
    abeiNotice: string;
    rights: string;
    selectLanguage: string;
    privacyPolicy: string;
    termsOfService: string;
    contactSupport: string;
  };
  common: {
    loading: string;
    success: string;
    error: string;
    confirm: string;
    cancel: string;
  };
}

export const translations: Record<Language, TranslationSchema> = {
  vi: {
    nav: {
      catalog: 'Tra Cứu Code',
      news: 'Tin Tức',
      giveaways: 'Săn Giveaway',
      store: 'Cửa Hàng Code',
      utilities: 'Tiện Ích',
      missions: 'Nhiệm Vụ',
    },
    header: {
      portalSubtitle: 'Cổng Tra Cứu Giftcode #1',
      bookmarksTitle: 'Tủ game đã lưu',
      account: 'Tài Khoản',
      wallet: 'Nạp Core và Lịch sử',
      myCodes: 'Kho mã của tôi',
      luckyWheel: 'Vòng Quay Quà',
      submitCode: 'Đóng Góp Code',
      adminPortal: 'Trang Quản Trị Admin',
      logout: 'Đăng xuất',
      themeToggle: 'Đổi giao diện Sáng / Tối',
      language: 'Ngôn ngữ',
    },
    hero: {
      liveBadge: 'Cập nhật liên tục 24/7 • Miễn phí 100%',
      titleMain: 'Kho Giftcode &',
      titleHighlight: 'Mã Quà Tặng Game',
      subtitle: 'Tra cứu hơn 340+ tựa game hot. Cập nhật mã quà tặng mới nhất mỗi ngày.',
      searchPlaceholder: 'Tìm game hoặc mã code… (Nhấn / để tìm nhanh)',
      searchBtn: 'Tìm kiếm',
      hotTags: 'Hot:',
      statGames: 'Tựa Game',
      statCodes: 'Giftcode',
      statFree: 'Miễn Phí',
      statUpdated: 'Cập Nhật Gần Nhất',
    },
    search: {
      matchingGames: 'Tựa game phù hợp',
      matchingCodes: 'Mã Giftcode tìm thấy',
      noResults: 'Không tìm thấy game hoặc mã code phù hợp',
      copyCode: 'Sao chép',
      copied: 'Đã chép!',
      active: 'Còn hạn',
      expired: 'Hết hạn',
      viewAll: 'Xem tất cả kết quả',
      hint: 'Mẹo: Gõ tên game hoặc chuỗi giftcode bất kỳ để tra cứu ngay',
    },
    filter: {
      all: 'Tất cả',
      hot: 'Game Hot',
      new: 'Mới cập nhật',
      hasCodes: 'Có mã code',
      bookmarked: 'Đã lưu',
      allCategories: 'Tất cả thể loại',
      sortBy: 'Sắp xếp theo',
      sortUpdated: '⚡ Mới cập nhật',
      sortPopular: '🔥 Phổ biến nhất',
      sortCodes: '🎁 Nhiều code nhất',
      sortRelease: '🚀 Mới ra mắt',
      sortName: '🔤 Tên A-Z',
      sortRating: '⭐ Đánh giá cao',
      sortLicense: '📜 Ngày cấp phép ABEI',
      sortDesc: 'Mới nhất / Cao nhất',
      sortAsc: 'Cũ nhất / Thấp nhất',
      resultsCount: 'Kết quả tìm kiếm',
      showing: 'Đang hiển thị',
      gamesFound: 'tựa game',
      noGames: 'Không tìm thấy tựa game nào phù hợp',
      resetFilter: 'Xóa bộ lọc',
      viewModeGrid: 'Lưới thẻ',
      viewModeCompact: 'Icon nhỏ',
      viewModeList: 'Danh sách',
    },
    gameCard: {
      licensed: '✓ Đã xác minh',
      international: 'Quốc Tế',
      licenseTooltip: 'Game đã được cấp phép ABEI / G1 chính thức và kiểm duyệt an toàn.',
      internationalTooltip: 'Tựa game quốc tế / phát hành toàn cầu.',
      licenseNo: 'Giấy phép:',
      codesAvailable: 'mã code',
      viewCodes: 'Xem mã quà tặng',
      quickCopy: 'Sao chép nhanh',
      copied: 'Đã sao chép!',
      bookmarked: 'Đã lưu',
      addBookmark: 'Lưu game',
      publisher: 'NPH:',
    },
    modal: {
      allCodes: 'Tất cả',
      activeCodes: 'Còn hạn',
      expiredCodes: 'Hết hạn',
      copy: 'Sao chép',
      copySuccess: 'Đã sao chép mã code!',
      copiedNotice: 'Mã đã sẵn sàng để dán vào game.',
      expiredNotice: 'Lưu ý: Mã này có thể đã hết hạn hoặc đạt giới hạn lượt nhập.',
      instructions: 'Hướng dẫn nhập Giftcode',
      gameInfo: 'Thông tin tựa game',
      publisher: 'Nhà phát hành',
      license: 'Số giấy phép G1',
      licenseDate: 'Ngày cấp phép',
      releaseDate: 'Ngày phát hành',
      platform: 'Nền tảng hỗ trợ',
      downloadGame: 'Tải Game Chính Thức',
      redeemWeb: 'Trang Nhập Code Web',
      share: 'Chia sẻ game',
      reportWorking: 'Code dùng tốt',
      reportExpired: 'Báo hết hạn',
      close: 'Đóng',
      codeCount: 'Tổng số mã',
      activeCount: 'Mã còn hạn',
      expiredCount: 'Mã hết hạn',
      copyAll: 'Copy tất cả',
      copyAllSuccess: 'Đã sao chép tất cả mã code!',
      copiedAll: 'Đã sao chép tất cả',
    },
    giveaways: {
      title: 'Sự Kiện Săn Mã Giveaway',
      subtitle: 'Nhận ngay các mã code VIP, tài khoản trải nghiệm và vật phẩm giới hạn hoàn toàn miễn phí.',
      claimCode: 'Giật Mã Ngay',
      alreadyClaimed: 'Đã nhận mã',
      ended: 'Đã kết thúc',
      remaining: 'Còn lại:',
      total: 'Tổng phát:',
      endsAt: 'Kết thúc sau:',
      loginRequired: 'Vui lòng đăng nhập để giật mã',
      activeTitle: 'Đang diễn ra',
      historyTitle: 'Đã kết thúc',
    },
    store: {
      title: 'Cửa Hàng Code & Vật Phẩm',
      subtitle: 'Sở hữu ngay các gói vật phẩm độc quyền, mã nạp game chiết khấu cao với số dư Core an toàn.',
      buyNow: 'Mua Ngay',
      outOfStock: 'Hết hàng',
      instantDelivery: 'Giao mã tự động 0s',
      depositCore: 'Nạp thêm Core',
      discount: 'Giảm',
      originalPrice: 'Giá gốc:',
      salePrice: 'Giá bán:',
    },
    utilities: {
      title: 'Trung Tâm Tiện Ích Game Thủ',
      subtitle: 'Tổng hợp các công cụ hỗ trợ tính toán, tra cứu và tối ưu trải nghiệm chơi game.',
      launchTool: 'Mở Tiện Ích',
      category: 'Phân loại',
    },
    footer: {
      siteDesc: '',
      quickLinks: 'Liên Kết Nhanh',
      legal: 'Pháp Lý & Giấy Phép',
      abeiNotice: 'Hệ thống đối soát tự động với Cổng thông tin Cục PTTH & TTĐT (ABEI) - Bộ Thông tin và Truyền thông.',
      rights: 'Bảo lưu mọi quyền.',
      selectLanguage: 'Ngôn ngữ hiển thị:',
      privacyPolicy: 'Chính sách bảo mật',
      termsOfService: 'Điều khoản sử dụng',
      contactSupport: 'Hỗ trợ khách hàng',
    },
    common: {
      loading: 'Đang tải dữ liệu...',
      success: 'Thành công',
      error: 'Có lỗi xảy ra',
      confirm: 'Xác nhận',
      cancel: 'Hủy bỏ',
    },
  },

  en: {
    nav: {
      catalog: 'Gift Codes',
      news: 'Game News',
      giveaways: 'Giveaways',
      store: 'Code Store',
      utilities: 'Utilities',
      missions: 'Missions',
    },
    header: {
      portalSubtitle: '#1 Gift Code Portal',
      bookmarksTitle: 'Saved Games',
      account: 'Account',
      wallet: 'Top-up Core & History',
      myCodes: 'My Code Inventory',
      luckyWheel: 'Lucky Wheel',
      submitCode: 'Submit Code',
      adminPortal: 'Admin Dashboard',
      logout: 'Log Out',
      themeToggle: 'Toggle Light / Dark',
      language: 'Language',
    },
    hero: {
      liveBadge: 'Updated 24/7 • 100% Free Codes',
      titleMain: 'Ultimate Gift Codes &',
      titleHighlight: 'Game Rewards Hub',
      subtitle: 'Explore 340+ trending games. Fresh, verified redeem codes updated daily.',
      searchPlaceholder: 'Search games or gift codes… (Press / to search)',
      searchBtn: 'Search',
      hotTags: 'Hot:',
      statGames: 'Games',
      statCodes: 'Gift Codes',
      statFree: '100% Free',
      statUpdated: 'Latest Update',
    },
    search: {
      matchingGames: 'Matching Games',
      matchingCodes: 'Matching Gift Codes',
      noResults: 'No games or gift codes found',
      copyCode: 'Copy',
      copied: 'Copied!',
      active: 'Active',
      expired: 'Expired',
      viewAll: 'View all results',
      hint: 'Tip: Type any game name or giftcode to find instantly',
    },
    filter: {
      all: 'All',
      hot: 'Trending Games',
      new: 'New Releases',
      hasCodes: 'Active Codes',
      bookmarked: 'Bookmarked',
      allCategories: 'All Categories',
      sortBy: 'Sort by',
      sortUpdated: '⚡ Recently Updated',
      sortPopular: '🔥 Most Popular',
      sortCodes: '🎁 Most Codes',
      sortRelease: '🚀 New Releases',
      sortName: '🔤 Name A-Z',
      sortRating: '⭐ Top Rated',
      sortLicense: '📜 ABEI License Date',
      sortDesc: 'Newest / Highest',
      sortAsc: 'Oldest / Lowest',
      resultsCount: 'Search Results',
      showing: 'Showing',
      gamesFound: 'games found',
      noGames: 'No matching games found',
      resetFilter: 'Reset Filters',
      viewModeGrid: 'Grid',
      viewModeCompact: 'Compact',
      viewModeList: 'List',
    },
    gameCard: {
      licensed: '✓ Verified',
      international: 'Global',
      licenseTooltip: 'Officially licensed by ABEI / G1 with verified giftcodes.',
      internationalTooltip: 'Global / International game release.',
      licenseNo: 'License:',
      codesAvailable: 'codes',
      viewCodes: 'View Codes',
      quickCopy: 'Quick Copy',
      copied: 'Copied!',
      bookmarked: 'Saved',
      addBookmark: 'Save Game',
      publisher: 'Pub:',
    },
    modal: {
      allCodes: 'All Codes',
      activeCodes: 'Active',
      expiredCodes: 'Expired',
      copy: 'Copy',
      copySuccess: 'Gift Code Copied!',
      copiedNotice: 'Ready to paste directly into the game.',
      expiredNotice: 'Note: This coupon code might be expired or reached its claim quota.',
      instructions: 'How to Redeem Gift Code',
      gameInfo: 'Game Overview',
      publisher: 'Publisher',
      license: 'G1 License No.',
      licenseDate: 'License Issue Date',
      releaseDate: 'Release Date',
      platform: 'Platforms',
      downloadGame: 'Official Download',
      redeemWeb: 'Web Redemption Page',
      share: 'Share Game',
      reportWorking: 'Working Well',
      reportExpired: 'Report Expired',
      close: 'Close',
      codeCount: 'Total Codes',
      activeCount: 'Active Codes',
      expiredCount: 'Expired Codes',
      copyAll: 'Copy All',
      copyAllSuccess: 'All codes copied to clipboard!',
      copiedAll: 'Copied All',
    },
    giveaways: {
      title: 'Exclusive Giveaway Drops',
      subtitle: 'Claim VIP redemption codes, trial accounts, and limited in-game gifts for 100% free.',
      claimCode: 'Claim Code',
      alreadyClaimed: 'Already Claimed',
      ended: 'Event Ended',
      remaining: 'Left:',
      total: 'Total Pool:',
      endsAt: 'Ends in:',
      loginRequired: 'Please log in to claim this code',
      activeTitle: 'Active Campaigns',
      historyTitle: 'Past Campaigns',
    },
    store: {
      title: 'Code & Items Store',
      subtitle: 'Buy exclusive gaming item bundles and top-up cards with secure Core balances instantly.',
      buyNow: 'Buy Now',
      outOfStock: 'Sold Out',
      instantDelivery: 'Instant 0s Delivery',
      depositCore: 'Top up Core',
      discount: 'Off',
      originalPrice: 'Retail Price:',
      salePrice: 'Price:',
    },
    utilities: {
      title: 'Gamer Utilities Center',
      subtitle: 'Helpful calculation tools, lookup directories and optimization utilities for gamers.',
      launchTool: 'Open Tool',
      category: 'Category',
    },
    footer: {
      siteDesc: '',
      quickLinks: 'Quick Links',
      legal: 'Compliance & Licenses',
      abeiNotice: 'Real-time synchronization with the Authority of Broadcasting and Electronic Information (ABEI).',
      rights: 'All rights reserved.',
      selectLanguage: 'Language:',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      contactSupport: 'Customer Support',
    },
    common: {
      loading: 'Loading data...',
      success: 'Success',
      error: 'An error occurred',
      confirm: 'Confirm',
      cancel: 'Cancel',
    },
  },

  zh: {
    nav: {
      catalog: '礼包码查询',
      news: '游戏资讯',
      giveaways: '免费抽奖',
      store: '游戏商城',
      utilities: '实用工具',
      missions: '任务系统',
    },
    header: {
      portalSubtitle: '全网第一礼包码平台',
      bookmarksTitle: '我的收藏',
      account: '我的账户',
      wallet: '充值Core与记录',
      myCodes: '我的卡密仓库',
      luckyWheel: '幸运大转盘',
      submitCode: '贡献礼包码',
      adminPortal: '管理后台',
      logout: '退出登录',
      themeToggle: '切换明亮 / 暗色',
      language: '语言切换',
    },
    hero: {
      liveBadge: '24/7 实时更新 • 100% 免费兑换',
      titleMain: '全网手游礼包码 &',
      titleHighlight: '专属兑换中心',
      subtitle: '收录340+款热门手机与电脑游戏，每日实时更新官方最新礼包码。',
      searchPlaceholder: '搜索游戏名称或礼包兑换码… (按 / 快速搜索)',
      searchBtn: '搜索',
      hotTags: '热门:',
      statGames: '款热门游戏',
      statCodes: '个礼包码',
      statFree: '完全免费',
      statUpdated: '最新更新',
    },
    search: {
      matchingGames: '匹配的游戏',
      matchingCodes: '匹配的礼包码',
      noResults: '未找到匹配的游戏或礼包码',
      copyCode: '复制',
      copied: '已复制!',
      active: '有效',
      expired: '已失效',
      viewAll: '查看全部结果',
      hint: '提示: 输入任何游戏名称或卡密字符即可快速检索',
    },
    filter: {
      all: '全部',
      hot: '热门推荐',
      new: '最新上线',
      hasCodes: '有可用礼包',
      bookmarked: '我的收藏',
      allCategories: '全部游戏类型',
      sortBy: '排序规则',
      sortUpdated: '⚡ 最新更新',
      sortPopular: '🔥 最受欢迎',
      sortCodes: '🎁 礼包最多',
      sortRelease: '🚀 上线日期',
      sortName: '🔤 游戏名称 (A-Z)',
      sortRating: '⭐ 评分最高',
      sortLicense: '📜 ABEI版号获批日期',
      sortDesc: '最新 / 降序',
      sortAsc: '最早 / 升序',
      resultsCount: '搜索结果',
      showing: '当前显示',
      gamesFound: '款游戏',
      noGames: '未找到符合条件的游戏',
      resetFilter: '清空筛选',
      viewModeGrid: '网格',
      viewModeCompact: '小图标',
      viewModeList: '列表',
    },
    gameCard: {
      licensed: '✓ 已认证',
      international: '国际服',
      licenseTooltip: '已获得越南国家版号（ABEI / G1）官方认证，安全合规。',
      internationalTooltip: '国际版 / 全球发行游戏。',
      licenseNo: '版号批文:',
      codesAvailable: '个礼包码',
      viewCodes: '查看礼包',
      quickCopy: '一键复制',
      copied: '已复制！',
      bookmarked: '已收藏',
      addBookmark: '收藏游戏',
      publisher: '厂商:',
    },
    modal: {
      allCodes: '全部',
      activeCodes: '有效兑换码',
      expiredCodes: '已过期',
      copy: '复制',
      copySuccess: '礼包码已复制！',
      copiedNotice: '已存入剪贴板，可直接进入游戏内粘贴使用。',
      expiredNotice: '提示：此礼包码可能已失效或达到兑换上限。',
      instructions: '礼包码使用教程',
      gameInfo: '游戏详细信息',
      publisher: '发行厂商',
      license: 'G1国家版号',
      licenseDate: '批文日期',
      releaseDate: '公测日期',
      platform: '支持平台',
      downloadGame: '官方下载链接',
      redeemWeb: '网页兑换通道',
      share: '分享游戏',
      reportWorking: '亲测有效',
      reportExpired: '反馈失效',
      close: '关闭',
      codeCount: '礼包总数',
      activeCount: '有效礼包',
      expiredCount: '失效礼包',
      copyAll: '复制全部',
      copyAllSuccess: '已复制所有礼包码！',
      copiedAll: '已全部复制',
    },
    giveaways: {
      title: '独家限时免费抽奖',
      subtitle: '免费领取官方VIP礼包码、稀有游戏道具及内测体验资格。',
      claimCode: '立即抢码',
      alreadyClaimed: '已成功领取',
      ended: '活动已结束',
      remaining: '剩余:',
      total: '发放总量:',
      endsAt: '倒计时:',
      loginRequired: '请登录账户后再领取礼包',
      activeTitle: '火热进行中',
      historyTitle: '往期已结束',
    },
    store: {
      title: '游戏商城 & 特权卡密',
      subtitle: '特惠购买专属游戏礼包、点卡充值，Core余额自动秒速发货。',
      buyNow: '立即购买',
      outOfStock: '暂时缺货',
      instantDelivery: '系统 0 秒自动发货',
      depositCore: '充值 Core',
      discount: '折',
      originalPrice: '原价:',
      salePrice: '售价:',
    },
    utilities: {
      title: '玩家实用工具箱',
      subtitle: '汇集游戏战力计算器、抽卡模拟、排期查询等必备辅助工具。',
      launchTool: '进入工具',
      category: '工具类别',
    },
    footer: {
      siteDesc: '',
      quickLinks: '快捷链接',
      legal: '版权与版号资质',
      abeiNotice: '本站数据与越南广播电视和电子信息局（ABEI）官方系统保持实时对接。',
      rights: '保留所有权利。',
      selectLanguage: '界面语言:',
      privacyPolicy: '隐私政策',
      termsOfService: '服务条款',
      contactSupport: '联系客服',
    },
    common: {
      loading: '正在加载中...',
      success: '操作成功',
      error: '发生错误',
      confirm: '确认',
      cancel: '取消',
    },
  },

  th: {
    nav: {
      catalog: 'ค้นหาโค้ด',
      news: 'ข่าวเกม',
      giveaways: 'แจกโค้ดฟรี',
      store: 'ร้านค้าโค้ด',
      utilities: 'เครื่องมือ',
      missions: 'ภารกิจ',
    },
    header: {
      portalSubtitle: 'ศูนย์รวมโค้ดเกมอันดับ 1',
      bookmarksTitle: 'เกมที่บันทึกไว้',
      account: 'บัญชีผู้ใช้',
      wallet: 'เติม Core และประวัติ',
      myCodes: 'คลังโค้ดของฉัน',
      luckyWheel: 'วงล้อเสี่ยงโชค',
      submitCode: 'แบ่งปันโค้ด',
      adminPortal: 'แดชบอร์ดผู้ดูแล',
      logout: 'ออกจากระบบ',
      themeToggle: 'สลับธีม สว่าง / มืด',
      language: 'เลือกภาษา',
    },
    hero: {
      liveBadge: 'อัปเดต 24/7 • โค้ดฟรี 100%',
      titleMain: 'คลังกิฟต์โค้ด &',
      titleHighlight: 'รหัสของขวัญเกม',
      subtitle: 'ค้นหากิฟต์โค้ดกว่า 340+ เกมฮิต อัปเดตโค้ดใหม่ใช้งานได้จริงทุกวัน',
      searchPlaceholder: 'ค้นหาชื่อเกมหรือโค้ด… (กด / เพื่อค้นหา)',
      searchBtn: 'ค้นหา',
      hotTags: 'ยอดนิยม:',
      statGames: 'เกมยอดฮิต',
      statCodes: 'กิฟต์โค้ด',
      statFree: 'ฟรี 100%',
      statUpdated: 'อัปเดตล่าสุด',
    },
    search: {
      matchingGames: 'เกมที่ตรงกัน',
      matchingCodes: 'กิฟต์โค้ดที่ตรงกัน',
      noResults: 'ไม่พบเกมหรือกิฟต์โค้ดที่ตรงกัน',
      copyCode: 'คัดลอก',
      copied: 'คัดลอกแล้ว!',
      active: 'ใช้งานได้',
      expired: 'หมดอายุ',
      viewAll: 'ดูผลลัพธ์ทั้งหมด',
      hint: 'เคล็ดลับ: พิมพ์ชื่อเกมหรือรหัสโค้ดเพื่อค้นหาทันที',
    },
    filter: {
      all: 'ทั้งหมด',
      hot: 'เกมยอดนิยม',
      new: 'เกมมาใหม่',
      hasCodes: 'มีโค้ดใช้งานได้',
      bookmarked: 'ที่บันทึกไว้',
      allCategories: 'หมวดหมู่ทั้งหมด',
      sortBy: 'เรียงตาม',
      sortUpdated: '⚡ อัปเดตล่าสุด',
      sortPopular: '🔥 ยอดนิยมสูงสุด',
      sortCodes: '🎁 โค้ดมากที่สุด',
      sortRelease: '🚀 เกมมาใหม่',
      sortName: '🔤 ชื่อเกม A-Z',
      sortRating: '⭐ คะแนนสูงสุด',
      sortLicense: '📜 วันที่ได้รับใบอนุญาต ABEI',
      sortDesc: 'ล่าสุด / มากสุด',
      sortAsc: 'เก่าสุด / น้อยสุด',
      resultsCount: 'ผลการค้นหา',
      showing: 'กำลังแสดง',
      gamesFound: 'เกม',
      noGames: 'ไม่พบเกมที่ตรงกับเงื่อนไข',
      resetFilter: 'ล้างตัวกรอง',
      viewModeGrid: 'ตาราง',
      viewModeCompact: 'ไอคอนเล็ก',
      viewModeList: 'รายการ',
    },
    gameCard: {
      licensed: '✓ ยืนยันแล้ว',
      international: 'สากล',
      licenseTooltip: 'ได้รับใบอนุญาต ABEI / G1 อย่างเป็นทางการและตรวจสอบโค้ดแล้ว',
      internationalTooltip: 'เกมสากล / เปิดให้บริการทั่วโลก',
      licenseNo: 'ใบอนุญาต:',
      codesAvailable: 'โค้ด',
      viewCodes: 'ดูโค้ด',
      quickCopy: 'คัดลอกด่วน',
      copied: 'คัดลอกแล้ว!',
      bookmarked: 'บันทึกแล้ว',
      addBookmark: 'บันทึกเกม',
      publisher: 'ผู้ให้บริการ:',
    },
    modal: {
      allCodes: 'ทั้งหมด',
      activeCodes: 'ใช้งานได้',
      expiredCodes: 'หมดอายุ',
      copy: 'คัดลอก',
      copySuccess: 'คัดลอกโค้ดสำเร็จ!',
      copiedNotice: 'พร้อมนำไปวางใช้งานในเกมได้ทันที',
      expiredNotice: 'หมายเหตุ: โค้ดนี้อาจหมดอายุหรือถึงขีดจำกัดการใช้งานแล้ว',
      instructions: 'วิธีใส่กิฟต์โค้ด',
      gameInfo: 'ข้อมูลเกม',
      publisher: 'ผู้ให้บริการ',
      license: 'เลขที่ใบอนุญาต G1',
      licenseDate: 'วันที่อนุมัติ',
      releaseDate: 'วันที่เปิดตัว',
      platform: 'แพลตฟอร์ม',
      downloadGame: 'ดาวน์โหลดเกมอย่างเป็นทางการ',
      redeemWeb: 'หน้าเว็บแลกรับโค้ด',
      share: 'แชร์เกม',
      reportWorking: 'ใช้งานได้จริง',
      reportExpired: 'แจ้งโค้ดหมดอายุ',
      close: 'ปิด',
      codeCount: 'โค้ดทั้งหมด',
      activeCount: 'โค้ดที่ใช้ได้',
      expiredCount: 'โค้ดหมดอายุ',
      copyAll: 'คัดลอกทั้งหมด',
      copyAllSuccess: 'คัดลอกโค้ดทั้งหมดแล้ว!',
      copiedAll: 'คัดลอกทั้งหมดแล้ว',
    },
    giveaways: {
      title: 'กิจกรรมแจกโค้ดพิเศษ',
      subtitle: 'รับกิฟต์โค้ด VIP, บัตรกำนัล และไอเทมหายากฟรีทันที',
      claimCode: 'รับโค้ดทันที',
      alreadyClaimed: 'รับโค้ดแล้ว',
      ended: 'สิ้นสุดกิจกรรม',
      remaining: 'คงเหลือ:',
      total: 'แจกทั้งหมด:',
      endsAt: 'สิ้นสุดใน:',
      loginRequired: 'กรุณาเข้าสู่ระบบเพื่อรับโค้ด',
      activeTitle: 'กิจกรรมที่กำลังดำเนินอยู่',
      historyTitle: 'กิจกรรมที่สิ้นสุดแล้ว',
    },
    store: {
      title: 'ร้านค้าโค้ด & ไอเทมเกม',
      subtitle: 'ซื้อแพ็กเกจไอเทมสุดพิเศษ บัตรเติมเกมลดราคา ส่งโค้ดอัตโนมัติ 0 วินาที',
      buyNow: 'ซื้อทันที',
      outOfStock: 'สินค้าหมดชั่วคราว',
      instantDelivery: 'จัดส่งอัตโนมัติ 0 วินาที',
      depositCore: 'เติม Core',
      discount: 'ลด',
      originalPrice: 'ราคาปกติ:',
      salePrice: 'ราคาขาย:',
    },
    utilities: {
      title: 'ศูนย์รวมเครื่องมือสำหรับเกมเมอร์',
      subtitle: 'รวมเครื่องมือคำนวณและตัวช่วยเล่นเกมที่จำเป็นสำหรับผู้เล่นระดับโปร',
      launchTool: 'เปิดเครื่องมือ',
      category: 'หมวดหมู่',
    },
    footer: {
      siteDesc: '',
      quickLinks: 'ลิงก์ด่วน',
      legal: 'ข้อกำหนด & ใบอนุญาต',
      abeiNotice: 'ระบบตรวจสอบข้อมูลเชื่อมต่อกับกรมการกระจายเสียง โทรทัศน์ และสารสนเทศอิเล็กทรอนิกส์ (ABEI) แบบเรียลไทม์',
      rights: 'สงวนลิขสิทธิ์ทั้งหมด',
      selectLanguage: 'ภาษาแสดงผล:',
      privacyPolicy: 'นโยบายความเป็นส่วนตัว',
      termsOfService: 'ข้อกำหนดการให้บริการ',
      contactSupport: 'ติดต่อฝ่ายบริการลูกค้า',
    },
    common: {
      loading: 'กำลังโหลดข้อมูล...',
      success: 'สำเร็จ',
      error: 'เกิดข้อผิดพลาด',
      confirm: 'ยืนยัน',
      cancel: 'ยกเลิก',
    },
  },
};

export const AVAILABLE_LANGUAGES: Array<{
  code: Language;
  label: string;
  nativeName: string;
  flag: string;
}> = [
  { code: 'vi', label: 'Tiếng Việt', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', label: 'Tiếng Trung', nativeName: '中文 (简体)', flag: '🇨🇳' },
  { code: 'th', label: 'Tiếng Thái', nativeName: 'ไทย (Thai)', flag: '🇹🇭' },
];
