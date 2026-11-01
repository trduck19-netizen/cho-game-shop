export interface WheelSlice {
  id: string;
  label: string;
  sublabel?: string;
  type: 'CORE' | 'SPIN' | 'GIFTCODE' | 'VOUCHER' | 'EMPTY' | 'ITEM';
  value: number | string;
  color: string;
  textColor: string;
  probability: number; // Tỷ lệ xuất hiện (trọng số)
  codeContent?: string;
  codesList?: string[]; // Danh sách mã code dự trữ để phát dần
  totalCodesCount?: number; // Tổng số mã đã nạp
  remainingCodesCount?: number; // Số mã còn lại trong kho
}

export interface DailyReward {
  day: number;
  core: number;
  spins: number;
  badge?: string;
  highlight?: boolean;
}

export interface MilestoneTier {
  id: string;
  requiredInvites: number;
  title: string;
  rewardType: 'CORE' | 'SPINS' | 'VIP_CODE' | 'CHEST';
  rewardValue: number | string;
  description: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  invitedCount: number;
  commissionEarned: number;
  isCurrentUser?: boolean;
}

export interface GrowthConfig {
  isEnabled: boolean;
  lastUpdated?: string;

  // 1. Gói Quà Tân Thủ (Welcome Bonus Package)
  welcomeBonusEnabled: boolean;
  welcomeBonusCore: number;
  welcomeBonusSpins: number;

  // 2. Ưu Đãi Nạp Đầu (First Deposit Bonus)
  firstDepositBonusEnabled: boolean;
  firstDepositBonusPercent: number; // vd: 20 (%)
  firstDepositVipCode?: string;

  // 3. Cơ Chế Mời Bạn & Hoa Hồng (Referral & Commissions)
  referralEnabled: boolean;
  referralCommissionPercent: number; // vd: 10 (%) hoa hồng nạp
  refereeBonusCore: number; // Tặng bạn mới khi nhập mã mời: vd: 5,000 Core
  referrerBonusCore: number; // Thưởng người mời mỗi lượt bạn đăng ký: vd: 5,000 Core
  referrerBonusSpins: number; // Thưởng lượt quay: vd: 1 lượt quay

  // 4. Vòng Quay May Mắn (Gamified Lucky Wheel)
  wheelEnabled: boolean;
  dailyFreeSpins: number; // Số lượt quay miễn phí mỗi ngày (vd: 1)
  costPerSpinCore: number; // Giá mua thêm lượt quay bằng Core (vd: 10,000 Core, 0 = không cho mua)
  slices: WheelSlice[];

  // 5. Điểm Danh Chuỗi Ngày (Daily Check-in Streak)
  checkInEnabled: boolean;
  dailyRewards: DailyReward[];

  // 6. Mở Khóa Mốc Giới Thiệu (Milestones)
  milestones: MilestoneTier[];

  // 7. Bảng Xếp Hạng Đua Top (Leaderboard Contests)
  leaderboardEnabled: boolean;
  leaderboardTitle: string;
  leaderboardSubtitle: string;
  leaderboardPeriod: 'weekly' | 'monthly';
  leaderboardPrizes: { rank: number; title: string; prize: string; coreReward: number }[];
}

export interface UserGrowthData {
  userId: string;
  claimedWelcomeBonus: boolean;
  freeSpinsAvailable: number;
  lastFreeSpinDate?: string; // YYYY-MM-DD
  totalSpinsCount: number;

  // Điểm danh
  checkInStreak: number;
  lastCheckInDate?: string; // YYYY-MM-DD

  // Giới thiệu
  referralCode: string;
  referredBy?: string;
  totalInvitedCount: number;
  totalCommissionEarned: number;
  claimedMilestoneIds: string[];

  // Lịch sử quà
  spinHistory: { id: string; timestamp: string; sliceLabel: string; reward: string }[];
  claimedGifts: { id: string; timestamp: string; title: string; reward: string }[];
}
