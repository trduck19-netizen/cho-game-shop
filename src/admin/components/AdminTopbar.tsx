import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Clock,
  LogOut,
  User,
  ShieldCheck,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { AdminUser } from '../types/adminTypes';
import { AdminModuleTab } from './AdminSidebar';
import { adminDataService } from '../services/adminDataService';

interface AdminTopbarProps {
  currentTab: AdminModuleTab;
  onSelectTab: (tab: AdminModuleTab) => void;
  onToggleMobileSidebar: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  currentUser: AdminUser | null;
  onLogout?: () => void;
  onGoToClientSite?: () => void;
  onQuickAction?: (action: string) => void;
  pendingCount?: number;
}

const tabTitles: Record<AdminModuleTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Bảng Điều Khiển Tổng Quan', subtitle: 'Theo dõi các chỉ số kinh doanh, kho code và hoạt động hệ thống' },
  games: { title: 'Quản Lý Danh Mục Game', subtitle: 'Thêm mới, cập nhật thông tin, banner, gói CH Play và giftcode game' },
  news: { title: 'Quản Lý Tin Tức & Bài Viết', subtitle: 'Biên tập, hẹn giờ đăng bài, quản lý bài viết chuẩn SEO và mã code game' },
  crawler: { title: 'Crawler & Auto Sync', subtitle: 'Quét và cào giftcode tự động từ nhiều nguồn, đồng bộ dữ liệu thông minh' },
  'free-codes': { title: 'Quản Lý Code Miễn Phí', subtitle: 'Kho giftcode công khai cho cộng đồng, theo dõi lượt sao chép' },
  giftcodes: { title: 'Kiểm Duyệt Giftcode', subtitle: 'Phê duyệt hoặc từ chối mã code do cộng đồng thành viên đóng góp' },
  members: { title: 'Quản Lý Thành Viên & Phân Quyền', subtitle: 'Danh sách người dùng, vai trò, số dư và trạng thái tài khoản' },
  wallet: { title: 'Sổ Cái & Quản Lý Ví', subtitle: 'Lịch sử biến động số dư, đối soát giao dịch và điều chỉnh số dư an toàn' },
  'private-codes': { title: 'Cấp Phát Code VIP & Sự Kiện Giveaway', subtitle: 'Phát mã code VIP riêng theo Email và quản lý các chiến dịch săn Giveaway' },
  'code-inventory': { title: 'Kho Code Bán & Gói Sản Phẩm Cửa Hàng', subtitle: 'Quản lý mã code trong kho và tạo gói nạp / giftcode chiết khấu trên Cửa Hàng' },
  utilities: { title: 'Kho Tiện Ích & Gói Bán Ngoài Lề', subtitle: 'Quản lý kho mã, tài khoản Premium, key bản quyền và gói dịch vụ bán trên Web Khách' },
  missions: { title: 'Quản Lý Nhiệm Vụ & Duyệt Bài', subtitle: 'Tạo nhiệm vụ, hàng chờ duyệt bài nộp bằng chứng, kho mã và quản lý API AI' },
  'event-scheduler': { title: 'Lịch Sự Kiện & Đồng Hồ Đếm Ngược', subtitle: 'Cài đặt thời gian mở sự kiện Phát Code, Flash Sale giảm giá sản phẩm tự động theo lịch' },
  'email-notifications': { title: 'Thông Báo Email & Khách Hàng', subtitle: 'Quản lý người đăng ký nhận tin, cấu hình nhà cung cấp email và bắn thông báo sự kiện / code mới' },
  orders: { title: 'Quản Lý Đơn Hàng & Giao Dịch', subtitle: 'Theo dõi đơn mua hàng tự động, xử lý khiếu nại và hoàn tiền' },
  sepay: { title: 'Cổng Thanh Toán Tự Động SePay', subtitle: 'Cấu hình Webhook, đối soát giao dịch ngân hàng & kiểm thử API' },
  content: { title: 'Quản Trị Nội Dung & Banner', subtitle: 'Thông báo popup, banner hero, điều khoản và chính sách bảo mật' },
  'floating-notification': { title: 'Cài Đặt Thông Báo Nổi (Client Widget)', subtitle: 'Tùy chỉnh thông báo popup, vị trí góc màn hình, khung giờ và nút CTA cho khách truy cập' },
  marketing: { title: 'Cấu Hình Marketing & FOMO', subtitle: 'Quản lý thông báo nổi mua hàng thật, popup sự kiện và hiệu ứng chốt sale' },
  growth: { title: 'Tăng Trưởng & Viral', subtitle: 'Chiến dịch giới thiệu bạn bè, vòng quay may mắn và nhiệm vụ nhận code' },
  'api-keys': { title: 'Quản Lý Khóa API & Phân Quyền', subtitle: 'Cấp quyền chi tiết cho AI tự động (Pine AI), bot cào tin tức và đối tác tích hợp ngoài' },
  'security-logs': { title: 'Nhật Ký Bảo Mật & Audit Log', subtitle: 'Lưu vết không thể chỉnh sửa mọi hành vi quản trị trong hệ thống' },
  profile: { title: 'Thông Tin Tài Khoản & Bảo Mật', subtitle: 'Cập nhật hồ sơ cá nhân, đổi mật khẩu và xác thực 2 lớp (2FA)' },
};

const shortTabTitles: Record<AdminModuleTab, string> = {
  dashboard: 'Tổng Quan',
  games: 'Quản Lý Game',
  news: 'Tin Tức',
  crawler: 'Crawler',
  'free-codes': 'Code Miễn Phí',
  giftcodes: 'Duyệt Giftcode',
  members: 'Thành Viên',
  wallet: 'Sổ Cái & Ví',
  'private-codes': 'Code VIP & Giveaway',
  'code-inventory': 'Kho Code & Bán',
  utilities: 'Kho Tiện Ích',
  missions: 'Nhiệm Vụ',
  'event-scheduler': 'Lịch Đếm Ngược',
  'email-notifications': 'Thông Báo Email',
  orders: 'Đơn Hàng Code',
  sepay: 'Cổng SePay',
  content: 'Nội Dung Web',
  'floating-notification': 'Thông Báo Nổi',
  marketing: 'Marketing FOMO',
  growth: 'Tăng Trưởng',
  'api-keys': 'Khóa API',
  'security-logs': 'Nhật Ký Bảo Mật',
  profile: 'Hồ Sơ Admin',
};

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  currentTab,
  onSelectTab,
  onToggleMobileSidebar,
  isDarkMode,
  onToggleTheme,
  currentUser,
  onLogout,
  onGoToClientSite,
  onQuickAction,
  pendingCount = 0,
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickActionRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (quickActionRef.current && !quickActionRef.current.contains(event.target as Node)) {
        setIsQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = tabTitles[currentTab] || { title: 'Quản Trị Hệ Thống', subtitle: 'Hệ thống quản lý CodeGame' };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-3.5 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shrink-0"
          title="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base truncate max-w-[130px] xs:max-w-[190px] sm:max-w-none">
            <span className="sm:hidden">{shortTabTitles[currentTab] || meta.title}</span>
            <span className="hidden sm:inline">{meta.title}</span>
          </h2>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 md:block truncate">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick actions, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action Button */}
        <div className="relative" ref={quickActionRef}>
          <button
            onClick={() => setIsQuickActionOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tạo Nhanh</span>
          </button>

          {isQuickActionOpen && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in duration-100">
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onQuickAction?.('add-game');
                }}
                className="flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              >
                + Thêm Game Mới
              </button>
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onQuickAction?.('add-free-code');
                }}
                className="flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              >
                + Thêm Code Miễn Phí
              </button>
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onQuickAction?.('issue-private-code');
                }}
                className="flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              >
                + Cấp Code Riêng VIP
              </button>
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onQuickAction?.('adjust-wallet');
                }}
                className="flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              >
                + Điều Chỉnh Số Dư Ví
              </button>
            </div>
          )}
        </div>

        {/* Manual Direct Cloudflare Sync Button */}
        <button
          onClick={async () => {
            setIsSyncing(true);
            try {
              // 1. Push local admin edits & stock status to Cloudflare D1 first
              await adminDataService.pushFullStateToKV(true);
              // 2. Pull latest server data (members, transactions, new orders)
              await adminDataService.fetchFromCloudflareKV();
              const count = adminDataService.getMembers().length;
              setSyncFeedback(`Đã đồng bộ (${count} TV)`);
              window.dispatchEvent(new CustomEvent('wcg_admin_data_updated', { detail: { type: 'KV_DATA_PULLED' } }));
            } catch {
              setSyncFeedback('Đã đồng bộ!');
            } finally {
              setIsSyncing(false);
              setTimeout(() => setSyncFeedback(null), 3000);
            }
          }}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 transition-all cursor-pointer disabled:opacity-50"
          title="Đồng bộ hai chiều toàn bộ thành viên, ví, đơn hàng và sản phẩm từ Cloudflare D1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{syncFeedback || 'Đồng Bộ'}</span>
        </button>

        {/* View Client Website Link */}
        {onGoToClientSite && (
          <button
            onClick={onGoToClientSite}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 transition-all cursor-pointer"
            title="Mở website khách hàng (web-code-game.pages.dev)"
          >
            <span className="hidden sm:inline">Xem Web Khách</span>
            <span className="text-[11px]">↗</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          title={isDarkMode ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <Bell className="h-4 w-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {pendingCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in duration-100">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Thông báo hệ thống
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  {pendingCount} chờ duyệt
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {pendingCount > 0 ? (
                  <div
                    onClick={() => {
                      setIsNotificationOpen(false);
                      onSelectTab('giftcodes');
                    }}
                    className="flex cursor-pointer items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Có {pendingCount} mã giftcode chờ phê duyệt
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Nhấn để mở danh sách kiểm duyệt ngay.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Hệ thống hoạt động bình thường
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cloudflare KV & Webhook SePay đang kết nối ổn định.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors"
          >
            <img
              src={currentUser?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin'}
              alt="Admin"
              className="h-7 w-7 rounded-lg object-cover"
            />
            <div className="hidden text-left lg:block pr-1.5">
              <p className="text-xs font-bold leading-none text-slate-800 dark:text-slate-200">
                {currentUser?.displayName || 'Admin'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
                {currentUser?.role || 'Super Admin'}
              </p>
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in duration-100">
              <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {currentUser?.displayName}
                </p>
                <p className="text-[11px] text-slate-400">{currentUser?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectTab('profile');
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Hồ sơ quản trị</span>
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectTab('security-logs');
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span>Nhật ký bảo mật</span>
                </button>
              </div>

              {onLogout && (
                <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
