import type {
  GrowthConfig,
  UserGrowthData,
  WheelSlice,
  LeaderboardEntry,
  MilestoneTier,
} from '../types/growth';
import { dataService } from './dataService';

const GROWTH_CONFIG_KEY = 'wcg_growth_config_v1';
const USER_GROWTH_DATA_PREFIX = 'wcg_user_growth_v1_';

export const DEFAULT_WHEEL_SLICES: WheelSlice[] = [
  {
    id: 'slice_1',
    label: '+5,000 Core',
    sublabel: 'Phần thưởng tiền mặt',
    type: 'CORE',
    value: 5000,
    color: '#3B82F6',
    textColor: '#FFFFFF',
    probability: 28,
  },
  {
    id: 'slice_2',
    label: '+10,000 Core',
    sublabel: 'Thưởng ví số dư',
    type: 'CORE',
    value: 10000,
    color: '#8B5CF6',
    textColor: '#FFFFFF',
    probability: 20,
  },
  {
    id: 'slice_3',
    label: '+1 Lượt Quay',
    sublabel: 'Quay tiếp may mắn',
    type: 'SPIN',
    value: 1,
    color: '#EC4899',
    textColor: '#FFFFFF',
    probability: 15,
  },
  {
    id: 'slice_4',
    label: 'Voucher -20%',
    sublabel: 'Giảm giá mua code shop',
    type: 'VOUCHER',
    value: 'WCG-VOUCHER-20PCT',
    color: '#F59E0B',
    textColor: '#FFFFFF',
    probability: 10,
  },
  {
    id: 'slice_5',
    label: '+20,000 Core',
    sublabel: 'Cực giá trị',
    type: 'CORE',
    value: 20000,
    color: '#10B981',
    textColor: '#FFFFFF',
    probability: 10,
  },
  {
    id: 'slice_6',
    label: 'Mã VIP Độc Quyền',
    sublabel: 'Kích hoạt rương quà',
    type: 'GIFTCODE',
    value: 'VIP-LUCKY-WHEEL-2026',
    codeContent: 'WCG-VIP-LUCKY-998877',
    color: '#06B6D4',
    textColor: '#FFFFFF',
    probability: 5,
  },
  {
    id: 'slice_7',
    label: 'Chúc May Mắn',
    sublabel: 'Thử lại lần sau',
    type: 'EMPTY',
    value: 0,
    color: '#64748B',
    textColor: '#FFFFFF',
    probability: 9,
  },
  {
    id: 'slice_8',
    label: '+50,000 Core',
    sublabel: 'Đại Độc Đắc Jackpot',
    type: 'CORE',
    value: 50000,
    color: '#EF4444',
    textColor: '#FFFFFF',
    probability: 3,
  },
];

export const DEFAULT_GROWTH_CONFIG: GrowthConfig = {
  isEnabled: false,

  // 1. Gói Quà Tân Thủ
  welcomeBonusEnabled: false,
  welcomeBonusCore: 10000,
  welcomeBonusSpins: 2,

  // 2. Ưu Đãi Nạp Đầu
  firstDepositBonusEnabled: false,
  firstDepositBonusPercent: 20, // +20%
  firstDepositVipCode: 'WCG-TANTHU-VIP20',

  // 3. Cơ Chế Mời Bạn & Hoa Hồng
  referralEnabled: false,
  referralCommissionPercent: 10, // 10% hoa hồng vĩnh viễn mỗi khi bạn nạp
  refereeBonusCore: 5000, // Tặng bạn được mời
  referrerBonusCore: 5000, // Tặng người mời
  referrerBonusSpins: 1, // Tặng lượt quay

  // 4. Vòng Quay May Mắn
  wheelEnabled: true,
  dailyFreeSpins: 1,
  costPerSpinCore: 10000,
  slices: DEFAULT_WHEEL_SLICES,

  // 5. Điểm Danh 7 Ngày
  checkInEnabled: true,
  dailyRewards: [
    { day: 1, core: 1000, spins: 0 },
    { day: 2, core: 2000, spins: 0 },
    { day: 3, core: 3000, spins: 1, badge: '+1 Lượt Quay' },
    { day: 4, core: 5000, spins: 0 },
    { day: 5, core: 7000, spins: 0 },
    { day: 6, core: 10000, spins: 1, badge: 'Thưởng Lớn' },
    { day: 7, core: 20000, spins: 2, badge: 'Đỉnh Điểm', highlight: true },
  ],

  // 6. Mốc Giới Thiệu
  milestones: [
    {
      id: 'ms_1',
      requiredInvites: 1,
      title: 'Khởi Động Tân Binh',
      rewardType: 'CORE',
      rewardValue: 5000,
      description: 'Mời thành công 1 người bạn tham gia web',
    },
    {
      id: 'ms_3',
      requiredInvites: 3,
      title: 'Mở Khóa Code VIP Độc Quyền',
      rewardType: 'VIP_CODE',
      rewardValue: 'VIP-TRI-AN-3-FRIENDS-99',
      description: 'Mời thành công 3 bạn bè',
    },
    {
      id: 'ms_5',
      requiredInvites: 5,
      title: 'Gói Đại Sứ +30,000 Core',
      rewardType: 'CORE',
      rewardValue: 30000,
      description: 'Mời thành công 5 bạn bè',
    },
    {
      id: 'ms_10',
      requiredInvites: 10,
      title: 'Rương Huyền Thoại +100,000 Core',
      rewardType: 'CHEST',
      rewardValue: 100000,
      description: 'Mời thành công 10 bạn bè trở thành Đại Sứ Danh Dự',
    },
  ],

  // 7. Bảng Xếp Hạng Đua Top
  leaderboardEnabled: false,
  leaderboardTitle: 'Bảng Xếp Hạng Đua Top Mời Bạn',
  leaderboardSubtitle: 'Cơ hội nhận thưởng hàng trăm ngàn Core và tài khoản VIP dành cho Top Đại Sứ Lan Truyền',
  leaderboardPeriod: 'monthly',
  leaderboardPrizes: [
    { rank: 1, title: 'Quán Quân Đua Top', prize: '500,000 Core + Tài khoản VIP Vĩnh Viễn', coreReward: 500000 },
    { rank: 2, title: 'Á Quân Đua Top', prize: '300,000 Core + 10 Lượt Quay May Mắn', coreReward: 300000 },
    { rank: 3, title: 'Hạng Ba', prize: '150,000 Core + Code VIP Độc Quyền', coreReward: 150000 },
  ],
};

class GrowthService {
  private config: GrowthConfig | null = null;

  constructor() {
    this.loadConfig();
    if (typeof window !== 'undefined') {
      window.addEventListener('wcg_growth_config_updated', (e: any) => {
        if (e?.detail && typeof e.detail === 'object') {
          this.config = {
            ...DEFAULT_GROWTH_CONFIG,
            ...e.detail,
            slices: e.detail.slices && e.detail.slices.length === 8 ? e.detail.slices : DEFAULT_WHEEL_SLICES,
          };
        } else {
          this.loadConfig();
        }
      });
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === GROWTH_CONFIG_KEY) {
          this.loadConfig();
        }
      });
    }
  }

  // --- CONFIG MANAGEMENT ---
  public getConfig(): GrowthConfig {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config || DEFAULT_GROWTH_CONFIG;
  }

  public loadConfig(): GrowthConfig {
    if (typeof window === 'undefined') {
      this.config = DEFAULT_GROWTH_CONFIG;
      return this.config;
    }

    try {
      const raw = localStorage.getItem(GROWTH_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.config = {
          ...DEFAULT_GROWTH_CONFIG,
          ...parsed,
          slices: parsed.slices && parsed.slices.length === 8 ? parsed.slices : DEFAULT_WHEEL_SLICES,
        };
        return this.config;
      }
    } catch {}

    this.config = DEFAULT_GROWTH_CONFIG;
    return this.config;
  }

  public applyServerConfig(serverConfig: Partial<GrowthConfig>): void {
    if (!serverConfig || typeof serverConfig !== 'object') return;
    this.config = {
      ...DEFAULT_GROWTH_CONFIG,
      ...serverConfig,
      slices: serverConfig.slices && serverConfig.slices.length === 8 ? serverConfig.slices : DEFAULT_WHEEL_SLICES,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(GROWTH_CONFIG_KEY, JSON.stringify(this.config));
        window.dispatchEvent(new CustomEvent('wcg_growth_config_updated', { detail: this.config }));
      } catch {}
    }
  }

  public async fetchFreshConfigFromServer(): Promise<GrowthConfig> {
    if (typeof window === 'undefined') return this.getConfig();
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        const json = await res.json();
        if (json?.growthConfig && typeof json.growthConfig === 'object') {
          this.applyServerConfig(json.growthConfig);
        }
      }
    } catch {}
    return this.getConfig();
  }

  public saveConfig(newConfig: Partial<GrowthConfig>): GrowthConfig {
    const merged: GrowthConfig = {
      ...this.getConfig(),
      ...newConfig,
      lastUpdated: new Date().toISOString(),
    };
    this.config = merged;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(GROWTH_CONFIG_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('wcg_growth_config_updated', { detail: merged }));
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('wcg_data_sync');
          channel.postMessage({ type: 'GROWTH_CONFIG_UPDATED', payload: merged });
        }
      } catch {}
    }

    // Sync to Cloudflare D1 / KV
    try {
      dataService.pushToCloudflareKV(GROWTH_CONFIG_KEY, merged);
    } catch {}

    return merged;
  }

  // --- USER DATA MANAGEMENT ---
  private getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  public getUserGrowthData(userId: string): UserGrowthData {
    const defaultData: UserGrowthData = {
      userId,
      claimedWelcomeBonus: false,
      freeSpinsAvailable: this.getConfig().dailyFreeSpins,
      lastFreeSpinDate: '',
      totalSpinsCount: 0,
      checkInStreak: 0,
      lastCheckInDate: '',
      referralCode: (userId || 'USR').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'WCG99',
      totalInvitedCount: 0,
      totalCommissionEarned: 0,
      claimedMilestoneIds: [],
      spinHistory: [],
      claimedGifts: [],
    };

    if (typeof window === 'undefined' || !userId) return defaultData;

    try {
      const raw = localStorage.getItem(`${USER_GROWTH_DATA_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const data: UserGrowthData = { ...defaultData, ...parsed };

        // Kiểm tra và cấp lượt quay miễn phí mới mỗi ngày
        const today = this.getTodayString();
        if (data.lastFreeSpinDate !== today && this.getConfig().wheelEnabled) {
          data.freeSpinsAvailable = Math.max(data.freeSpinsAvailable, this.getConfig().dailyFreeSpins);
        }

        return data;
      }
    } catch {}

    return defaultData;
  }

  public saveUserGrowthData(userId: string, data: UserGrowthData): void {
    if (typeof window === 'undefined' || !userId) return;
    try {
      localStorage.setItem(`${USER_GROWTH_DATA_PREFIX}${userId}`, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('wcg_user_growth_updated', { detail: data }));
    } catch {}
  }

  // --- FEATURE 1: NHẬN GÓI QUÀ TÂN THỦ ---
  public claimWelcomeBonus(userId: string): { success: boolean; core: number; spins: number; message: string } {
    const cfg = this.getConfig();
    if (!cfg.isEnabled || !cfg.welcomeBonusEnabled) {
      return { success: false, core: 0, spins: 0, message: 'Chương trình Quà Tân Thủ hiện đang tạm đóng.' };
    }

    const data = this.getUserGrowthData(userId);
    if (data.claimedWelcomeBonus) {
      return { success: false, core: 0, spins: 0, message: 'Bạn đã nhận Gói Quà Tân Thủ trước đó rồi.' };
    }

    data.claimedWelcomeBonus = true;
    data.freeSpinsAvailable += cfg.welcomeBonusSpins;
    data.claimedGifts.unshift({
      id: `gift_${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: 'Gói Quà Chào Mừng Tân Thủ',
      reward: `+${cfg.welcomeBonusCore.toLocaleString('vi-VN')} Core & +${cfg.welcomeBonusSpins} Lượt Quay`,
    });

    this.saveUserGrowthData(userId, data);

    // Nạp Core vào ví người dùng ngay
    if (cfg.welcomeBonusCore > 0) {
      dataService.topupWallet(cfg.welcomeBonusCore);
    }

    return {
      success: true,
      core: cfg.welcomeBonusCore,
      spins: cfg.welcomeBonusSpins,
      message: `Chúc mừng bạn đã nhận thành công Gói Tân Thủ: +${cfg.welcomeBonusCore.toLocaleString('vi-VN')} Core và +${cfg.welcomeBonusSpins} Lượt Quay May Mắn!`,
    };
  }

  // --- FEATURE 2: ĐIỂM DANH CHUỖI 7 NGÀY ---
  public dailyCheckIn(userId: string): { success: boolean; day: number; core: number; spins: number; message: string } {
    const cfg = this.getConfig();
    if (!cfg.isEnabled || !cfg.checkInEnabled) {
      return { success: false, day: 0, core: 0, spins: 0, message: 'Tính năng Điểm Danh hiện đang tạm đóng.' };
    }

    const data = this.getUserGrowthData(userId);
    const today = this.getTodayString();

    if (data.lastCheckInDate === today) {
      return { success: false, day: data.checkInStreak, core: 0, spins: 0, message: 'Hôm nay bạn đã điểm danh rồi, hãy quay lại vào ngày mai!' };
    }

    // Kiểm tra xem có bị ngắt chuỗi không (quá 1 ngày không điểm danh thì reset về ngày 1)
    let newStreak = data.checkInStreak + 1;
    if (data.lastCheckInDate) {
      const lastDate = new Date(data.lastCheckInDate);
      const currDate = new Date(today);
      const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays > 1) {
        newStreak = 1; // Đứt chuỗi
      }
    }

    if (newStreak > 7) {
      newStreak = 1; // Hoàn thành 1 chu kỳ 7 ngày, bắt đầu chu kỳ mới
    }

    const reward = cfg.dailyRewards.find((r) => r.day === newStreak) || cfg.dailyRewards[0];
    const coreWon = reward.core || 0;
    const spinsWon = reward.spins || 0;

    data.checkInStreak = newStreak;
    data.lastCheckInDate = today;
    data.freeSpinsAvailable += spinsWon;
    data.claimedGifts.unshift({
      id: `checkin_${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: `Điểm Danh Ngày ${newStreak}`,
      reward: `+${coreWon.toLocaleString('vi-VN')} Core${spinsWon > 0 ? ` & +${spinsWon} Lượt Quay` : ''}`,
    });

    this.saveUserGrowthData(userId, data);

    if (coreWon > 0) {
      dataService.topupWallet(coreWon);
    }

    return {
      success: true,
      day: newStreak,
      core: coreWon,
      spins: spinsWon,
      message: `Điểm danh Ngày ${newStreak} thành công! Bạn nhận được +${coreWon.toLocaleString('vi-VN')} Core${spinsWon > 0 ? ` và +${spinsWon} Lượt Quay` : ''}.`,
    };
  }

  // --- FEATURE 3: QUAY VÒNG QUAY MAY MẮN ---
  public spinWheel(
    userId: string,
    useCore: boolean = false
  ): { success: boolean; sliceIndex: number; slice: WheelSlice | null; awardedCode?: string; message: string } {
    const cfg = this.getConfig();
    if (!cfg.wheelEnabled) {
      return { success: false, sliceIndex: -1, slice: null, message: 'Vòng Quay May Mắn hiện đang tạm đóng hoặc bảo trì.' };
    }

    const data = this.getUserGrowthData(userId);
    const today = this.getTodayString();

    if (!useCore) {
      if (data.freeSpinsAvailable <= 0) {
        return { success: false, sliceIndex: -1, slice: null, message: 'Bạn đã hết lượt quay miễn phí hôm nay. Hãy dùng Core để quay tiếp!' };
      }
      data.freeSpinsAvailable -= 1;
      data.lastFreeSpinDate = today;
    } else {
      // Dùng Core để quay
      const currentUser = dataService.getCurrentUser();
      const cost = cfg.costPerSpinCore || 10000;
      if (!currentUser || (currentUser.wallet_balance || 0) < cost) {
        return { success: false, sliceIndex: -1, slice: null, message: `Số dư ví không đủ ${cost.toLocaleString('vi-VN')}đ để mua thêm lượt quay.` };
      }
      // Trừ Core
      currentUser.wallet_balance -= cost;
      dataService.saveCurrentUser(currentUser);
    }

    // Tính toán trúng thưởng dựa trên trọng số (Probability Weight)
    const slices = cfg.slices || DEFAULT_WHEEL_SLICES;
    const totalWeight = slices.reduce((sum, s) => sum + (Number(s.probability) || 1), 0);
    let randomNum = Math.random() * totalWeight;

    let selectedIndex = 0;
    for (let i = 0; i < slices.length; i++) {
      randomNum -= (Number(slices[i].probability) || 1);
      if (randomNum <= 0) {
        selectedIndex = i;
        break;
      }
    }

    const wonSlice = slices[selectedIndex];
    data.totalSpinsCount += 1;

    let awardedCode: string | undefined = undefined;

    // Xử lý trao thưởng cụ thể theo từng loại phần thưởng
    if (wonSlice.type === 'GIFTCODE') {
      if (Array.isArray(wonSlice.codesList) && wonSlice.codesList.length > 0) {
        awardedCode = wonSlice.codesList.shift();
        wonSlice.remainingCodesCount = wonSlice.codesList.length;
        this.saveConfig({ slices });
      } else if (wonSlice.codeContent) {
        awardedCode = wonSlice.codeContent;
      } else if (typeof wonSlice.value === 'string' && wonSlice.value.trim()) {
        awardedCode = wonSlice.value.trim();
      } else {
        awardedCode = `WCG-VIP-LUCKY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      // Tự động lưu vào danh sách "Mã đã nhận" của người dùng
      try {
        dataService.saveClaimedCode({
          campaignId: `wheel_${wonSlice.id}`,
          campaignTitle: `Vòng Quay May Mắn - ${wonSlice.label}`,
          gameName: 'Vòng Quay May Mắn',
          gameSlug: 'vong-quay-may-man',
          code: awardedCode,
          rewards: wonSlice.sublabel || wonSlice.label,
          claimedAt: new Date().toISOString(),
          isUsed: false,
        });
      } catch {}
    } else if (wonSlice.type === 'CORE' && typeof wonSlice.value === 'number' && wonSlice.value > 0) {
      dataService.topupWallet(wonSlice.value);
    } else if (wonSlice.type === 'SPIN' && typeof wonSlice.value === 'number') {
      data.freeSpinsAvailable += wonSlice.value;
    } else if (wonSlice.type === 'VOUCHER') {
      awardedCode = typeof wonSlice.value === 'string' ? wonSlice.value : (wonSlice.codeContent || 'WCG-VOUCHER-LUCKY');
      try {
        dataService.saveClaimedCode({
          campaignId: `wheel_voucher_${wonSlice.id}`,
          campaignTitle: `Voucher Giảm Giá - ${wonSlice.label}`,
          gameName: 'Shop Code Game',
          gameSlug: 'shop-code-game',
          code: awardedCode,
          rewards: wonSlice.sublabel || wonSlice.label,
          claimedAt: new Date().toISOString(),
          isUsed: false,
        });
      } catch {}
    }

    data.spinHistory.unshift({
      id: `spin_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sliceLabel: wonSlice.label,
      reward: awardedCode ? `${wonSlice.label}: ${awardedCode}` : wonSlice.label,
    });
    if (data.spinHistory.length > 20) data.spinHistory = data.spinHistory.slice(0, 20);

    this.saveUserGrowthData(userId, data);

    return {
      success: true,
      sliceIndex: selectedIndex,
      slice: wonSlice,
      awardedCode,
      message: `Chúc mừng bạn đã quay trúng: ${wonSlice.label}!`,
    };
  }

  // --- FEATURE 4: GHI NHẬN LƯỢT GIỚI THIỆU (REFERRAL) ---
  public recordReferral(
    referralCode: string,
    newUserId: string
  ): { success: boolean; referrerId?: string; message: string } {
    const cfg = this.getConfig();
    if (!cfg.isEnabled || !cfg.referralEnabled || !referralCode) {
      return { success: false, message: 'Mã giới thiệu không hợp lệ hoặc tính năng đang tắt.' };
    }

    // Tìm kiếm referrer theo mã giới thiệu trong danh sách thành viên
    const membersRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('wcg_admin_members_v4') : null;
    let members: any[] = [];
    try {
      if (membersRaw) members = JSON.parse(membersRaw);
    } catch {}

    const cleanCode = referralCode.trim().toUpperCase();
    const referrer = members.find(
      (m) =>
        m &&
        (m.id?.toUpperCase().includes(cleanCode) ||
          m.displayName?.toUpperCase().replace(/\s/g, '').includes(cleanCode) ||
          m.email?.toUpperCase().includes(cleanCode) ||
          m.id === referralCode)
    );

    if (!referrer || referrer.id === newUserId) {
      return { success: false, message: 'Mã giới thiệu không tồn tại hoặc bạn không thể tự giới thiệu chính mình.' };
    }

    // Cập nhật người mời
    const refData = this.getUserGrowthData(referrer.id);
    refData.totalInvitedCount += 1;
    refData.freeSpinsAvailable += cfg.referrerBonusSpins;
    refData.claimedGifts.unshift({
      id: `ref_${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: 'Mời Bạn Mới Thành Công',
      reward: `+${cfg.referrerBonusCore.toLocaleString('vi-VN')} Core & +${cfg.referrerBonusSpins} Lượt Quay`,
    });
    this.saveUserGrowthData(referrer.id, refData);

    // Thưởng cho người mời
    if (cfg.referrerBonusCore > 0) {
      referrer.balance = (Number(referrer.balance) || 0) + cfg.referrerBonusCore;
      try {
        localStorage.setItem('wcg_admin_members_v4', JSON.stringify(members));
      } catch {}
    }

    // Ghi nhận vào tài khoản người mới
    const newUserData = this.getUserGrowthData(newUserId);
    newUserData.referredBy = referrer.id;
    this.saveUserGrowthData(newUserId, newUserData);

    // Thưởng cho bạn mới được mời
    if (cfg.refereeBonusCore > 0) {
      dataService.topupWallet(cfg.refereeBonusCore);
    }

    return {
      success: true,
      referrerId: referrer.id,
      message: `Áp dụng mã giới thiệu thành công! Bạn nhận được +${cfg.refereeBonusCore.toLocaleString('vi-VN')} Core chào mừng.`,
    };
  }

  // --- FEATURE 5: TÍNH HOA HỒNG NẠP TIỀN (COMMISSION ON DEPOSIT) ---
  public handleDepositCommission(userId: string, depositAmount: number): { commissionCore: number; referrerId?: string } {
    const cfg = this.getConfig();
    if (!cfg.isEnabled || !cfg.referralEnabled || cfg.referralCommissionPercent <= 0) {
      return { commissionCore: 0 };
    }

    const userData = this.getUserGrowthData(userId);
    if (!userData.referredBy) return { commissionCore: 0 };

    const referrerId = userData.referredBy;
    const commissionCore = Math.floor((depositAmount * cfg.referralCommissionPercent) / 100);
    if (commissionCore <= 0) return { commissionCore: 0 };

    // Thưởng hoa hồng vào tài khoản người mời
    const refData = this.getUserGrowthData(referrerId);
    refData.totalCommissionEarned += commissionCore;
    refData.claimedGifts.unshift({
      id: `comm_${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: 'Hoa Hồng Nạp Tiền Từ Bạn Bè',
      reward: `+${commissionCore.toLocaleString('vi-VN')} Core (${cfg.referralCommissionPercent}% giá trị nạp)`,
    });
    this.saveUserGrowthData(referrerId, refData);

    // Đồng bộ số dư người mời trong admin members list
    try {
      const membersRaw = localStorage.getItem('wcg_admin_members_v4');
      if (membersRaw) {
        const members: any[] = JSON.parse(membersRaw);
        const refMember = members.find((m) => m.id === referrerId);
        if (refMember) {
          refMember.balance = (Number(refMember.balance) || 0) + commissionCore;
          localStorage.setItem('wcg_admin_members_v4', JSON.stringify(members));
        }
      }
    } catch {}

    return { commissionCore, referrerId };
  }

  // --- FEATURE 6: NHẬN THƯỞNG MỐC GIỚI THIỆU (MILESTONES) ---
  public claimMilestone(
    userId: string,
    milestoneId: string
  ): { success: boolean; reward: string; message: string } {
    const cfg = this.getConfig();
    const milestone = cfg.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return { success: false, reward: '', message: 'Mốc thưởng không tồn tại.' };

    const data = this.getUserGrowthData(userId);
    if (data.claimedMilestoneIds.includes(milestoneId)) {
      return { success: false, reward: '', message: 'Bạn đã nhận phần thưởng mốc này rồi.' };
    }

    if (data.totalInvitedCount < milestone.requiredInvites) {
      return {
        success: false,
        reward: '',
        message: `Bạn cần mời thêm ${milestone.requiredInvites - data.totalInvitedCount} người bạn nữa để mở khóa mốc này.`,
      };
    }

    data.claimedMilestoneIds.push(milestoneId);

    if (milestone.rewardType === 'CORE' && typeof milestone.rewardValue === 'number') {
      dataService.topupWallet(milestone.rewardValue);
    } else if (milestone.rewardType === 'SPINS' && typeof milestone.rewardValue === 'number') {
      data.freeSpinsAvailable += milestone.rewardValue;
    }

    data.claimedGifts.unshift({
      id: `ms_${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: milestone.title,
      reward: String(milestone.rewardValue),
    });

    this.saveUserGrowthData(userId, data);

    return {
      success: true,
      reward: String(milestone.rewardValue),
      message: `Chúc mừng bạn đã mở khóa thành công: ${milestone.title}!`,
    };
  }

  // --- FEATURE 7: BẢNG XẾP HẠNG ĐUA TOP (LEADERBOARD) ---
  public getLeaderboard(currentUserId?: string): LeaderboardEntry[] {
    const mockTop: LeaderboardEntry[] = [
      {
        rank: 1,
        userId: 'usr_top1',
        displayName: 'Hoàng Long Gaming 👑',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=HoangLong&backgroundColor=0b0d19,16192e',
        invitedCount: 84,
        commissionEarned: 1680000,
      },
      {
        rank: 2,
        userId: 'usr_top2',
        displayName: 'Thế Giới Roblox ⚡',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=RobloxVN&backgroundColor=0b0d19,16192e',
        invitedCount: 62,
        commissionEarned: 1240000,
      },
      {
        rank: 3,
        userId: 'usr_top3',
        displayName: 'Minh Anh Code Thủ 🌟',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=MinhAnh&backgroundColor=0b0d19,16192e',
        invitedCount: 45,
        commissionEarned: 900000,
      },
      {
        rank: 4,
        userId: 'usr_top4',
        displayName: 'Trần Đăng Pro',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=TranDang&backgroundColor=0b0d19,16192e',
        invitedCount: 31,
        commissionEarned: 620000,
      },
      {
        rank: 5,
        userId: 'usr_top5',
        displayName: 'Gia Bảo FreeFire',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GiaBao&backgroundColor=0b0d19,16192e',
        invitedCount: 26,
        commissionEarned: 520000,
      },
      {
        rank: 6,
        userId: 'usr_top6',
        displayName: 'Vũ Nam Genshin',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=VuNam&backgroundColor=0b0d19,16192e',
        invitedCount: 19,
        commissionEarned: 380000,
      },
      {
        rank: 7,
        userId: 'usr_top7',
        displayName: 'Phạm Huy Liên Quân',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=PhamHuy&backgroundColor=0b0d19,16192e',
        invitedCount: 14,
        commissionEarned: 280000,
      },
    ];

    if (!currentUserId) return mockTop;

    const myData = this.getUserGrowthData(currentUserId);
    const currentUser = dataService.getCurrentUser();
    const myEntry: LeaderboardEntry = {
      rank: 8,
      userId: currentUserId,
      displayName: (currentUser?.displayName || currentUser?.username || 'Bạn') + ' (Tôi)',
      avatarUrl: currentUser?.avatar_url,
      invitedCount: myData.totalInvitedCount,
      commissionEarned: myData.totalCommissionEarned,
      isCurrentUser: true,
    };

    return [...mockTop, myEntry];
  }
}

export const growthService = new GrowthService();
