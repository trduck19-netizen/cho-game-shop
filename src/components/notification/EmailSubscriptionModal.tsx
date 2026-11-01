import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Bell,
  CheckCircle2,
  Gift,
  Flame,
  Gamepad2,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Clock,
  Bookmark,
  ChevronRight,
  Search,
  Sliders,
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { dataService } from '../../services/dataService';
import type { UserProfile, GameItem, UpcomingGame } from '../../types/game';

interface EmailSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  targetGameSlug?: string; // Nếu mở từ nút chuông của game cụ thể
  targetGameName?: string;
  bookmarks?: string[];
  bookmarkedGames?: GameItem[];
  upcomingGames?: UpcomingGame[];
  onToggleBookmark?: (gameSlug: string) => void;
  onSelectGame?: (game: GameItem) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

interface CodeNotificationEntry {
  id: string;
  gameName: string;
  gameSlug: string;
  gameIcon: string;
  publisher?: string;
  category?: string;
  code: string;
  rewards?: string;
  status: string;
  isHot?: boolean;
  isUpcoming?: boolean;
  releaseDate?: string;
  addedAt?: string;
  isFollowed: boolean;
}

export const EmailSubscriptionModal: React.FC<EmailSubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetGameSlug,
  targetGameName,
  bookmarks,
  bookmarkedGames = [],
  upcomingGames = [],
  onToggleBookmark,
  onSelectGame,
  onShowToast,
}) => {
  // Tab state: 'notifications' (Bảng 1 - Mặc định khi ấn vào) | 'subscription' (Bảng 2 - Bảng đăng ký hiện tại)
  const [activeTab, setActiveTab] = useState<'notifications' | 'subscription'>('notifications');

  // Form State (Bảng 2)
  const [email, setEmail] = useState('');
  const [notifyFollowedCodes, setNotifyFollowedCodes] = useState(true);
  const [notifyGiveaways, setNotifyGiveaways] = useState(true);
  const [notifySales, setNotifySales] = useState(true);
  const [subscribedGames, setSubscribedGames] = useState<string[]>([]);
  const [allGames, setAllGames] = useState<GameItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [hasExistingSub, setHasExistingSub] = useState(false);

  // Notifications State (Bảng 1)
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sharedCodeId, setSharedCodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Tải danh sách tất cả game để hiển thị thông tin
    const games = dataService.getGames();
    setAllGames(games);

    // Mặc định luôn mở ở Bảng 1 (Thông báo code mới)
    setActiveTab('notifications');

    // Tải subscription hiện tại
    const current = notificationService.getSubscription();
    if (current && current.email) {
      setEmail(current.email);
      setNotifyFollowedCodes(current.notifyFollowedCodes);
      setNotifyGiveaways(current.notifyGiveaways);
      setNotifySales(current.notifySales);
      let list = current.subscribedGames || [];
      if (targetGameSlug && !list.includes(targetGameSlug)) {
        list = [...list, targetGameSlug];
      }
      setSubscribedGames(list);
      setHasExistingSub(Boolean(current.isActive));
    } else {
      if (currentUser?.email) {
        setEmail(currentUser.email);
      }
      if (targetGameSlug) {
        setSubscribedGames([targetGameSlug]);
      }
      setHasExistingSub(false);
    }
  }, [isOpen, currentUser, targetGameSlug]);

  if (!isOpen) return null;

  // Lấy danh sách bookmark hiệu lực (Game đang theo dõi)
  const effectiveBookmarks = bookmarks || (typeof window !== 'undefined' ? dataService.getBookmarks() : []);
  const bookmarkedSet = new Set(effectiveBookmarks.map((s) => s.toLowerCase()));

  // ==============================================================
  // BẢNG 1: THU THẬP THÔNG BÁO CODE MỚI CỦA CÁC GAME ĐANG THEO DÕI
  // ==============================================================
  const followedCodeList: CodeNotificationEntry[] = [];
  const fallbackHotList: CodeNotificationEntry[] = [];

  allGames.forEach((game) => {
    const isBookmarked =
      bookmarkedSet.has((game.slug || '').toLowerCase()) ||
      bookmarkedSet.has((game.id || '').toLowerCase()) ||
      (targetGameSlug && (game.slug === targetGameSlug || game.id === targetGameSlug));

    const activeCodes = (game.codes || []).filter((c) => c.status !== 'expired');
    activeCodes.forEach((c, idx) => {
      const entry: CodeNotificationEntry = {
        id: `${game.slug}_${c.code}_${idx}`,
        gameName: game.name,
        gameSlug: game.slug,
        gameIcon: game.icon_url || `/game_icons/${game.slug}.webp`,
        publisher: game.publisher,
        category: game.category,
        code: c.code,
        rewards: c.rewards,
        status: c.status,
        isHot: Boolean(c.is_hot),
        addedAt: c.added_at,
        isFollowed: Boolean(isBookmarked),
      };

      if (isBookmarked) {
        followedCodeList.push(entry);
      } else if (c.is_hot || idx === 0) {
        fallbackHotList.push(entry);
      }
    });
  });

  // Bổ sung các giftcode dự kiến của Game Sắp Ra Mắt nếu người dùng đã theo dõi / Báo code
  (upcomingGames || []).forEach((ug) => {
    const isBookmarked =
      bookmarkedSet.has((ug.slug || '').toLowerCase()) ||
      bookmarkedSet.has((ug.id || '').toLowerCase()) ||
      (targetGameSlug && (ug.slug === targetGameSlug || ug.id === targetGameSlug));

    (ug.expectedCodes || []).forEach((codeStr, idx) => {
      const entry: CodeNotificationEntry = {
        id: `upcoming_${ug.slug}_${codeStr}_${idx}`,
        gameName: ug.name,
        gameSlug: ug.slug,
        gameIcon: ug.iconUrl || `/game_icons/${ug.slug}.webp`,
        publisher: ug.publisher,
        category: ug.category,
        code: codeStr,
        rewards: 'Quà tân thủ ngày mở server (Giờ G)',
        status: 'upcoming',
        isUpcoming: true,
        releaseDate: ug.releaseDate,
        isFollowed: Boolean(isBookmarked),
      };

      if (isBookmarked) {
        followedCodeList.push(entry);
      } else {
        fallbackHotList.push(entry);
      }
    });
  });

  // Nếu người dùng đã theo dõi game: hiển thị danh sách code của game theo dõi
  // Nếu chưa theo dõi: hiển thị các giftcode HOT mới nhất toàn sàn kèm gợi ý bấm Theo Dõi
  const isDisplayingFollowed = followedCodeList.length > 0;
  const rawList = isDisplayingFollowed ? followedCodeList : fallbackHotList.slice(0, 20);

  // Lọc theo tìm kiếm nhanh
  const displayCodes = rawList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.gameName.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      (item.publisher && item.publisher.toLowerCase().includes(q)) ||
      (item.rewards && item.rewards.toLowerCase().includes(q))
    );
  });

  // ==============================================================
  // ACTIONS: SAO CHÉP & CHIA SẺ MÃ KÈM NGUỒN TỪ WEB
  // ==============================================================
  const handleCopyCode = async (code: string, gameName: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      onShowToast('Đã sao chép mã code!', `Mã "${code}" của game ${gameName} đã được lưu vào bộ nhớ tạm.`, 'success');
    } catch {
      onShowToast('Lỗi', 'Không thể sao chép mã code.', 'error');
    }
  };

  const handleShareCode = async (item: CodeNotificationEntry) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://codegame.shop';
    const gameUrl = `${origin}/game/${item.gameSlug}`;
    const shareText = `🎁 Giftcode ${item.gameName} Mới Nhất!\n🔑 Mã Code: ${item.code}\n${
      item.rewards ? `📦 Phần thưởng: ${item.rewards}\n` : ''
    }🌐 Nguồn: CodeGame.Shop - Tra cứu giftcode tự động 24/7\n👉 Nhận thêm mã tại: ${gameUrl}`;

    // 1. Nếu thiết bị hỗ trợ Web Share API (chia sẻ trực tiếp qua Zalo, Messenger, Facebook trên điện thoại)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Giftcode ${item.gameName} - CodeGame.Shop`,
          text: shareText,
          url: gameUrl,
        });
        setSharedCodeId(item.id);
        setTimeout(() => setSharedCodeId(null), 2500);
        onShowToast('Chia sẻ thành công!', `Đã chia sẻ mã ${item.code} kèm nguồn CodeGame.Shop!`, 'success');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Người dùng ấn hủy hộp thoại chia sẻ
      }
    }

    // 2. Fallback: Tự động sao chép toàn bộ nội dung chia sẻ kèm nguồn vào Clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setSharedCodeId(item.id);
      setTimeout(() => setSharedCodeId(null), 2500);
      onShowToast(
        'Đã sao chép nội dung chia sẻ!',
        `Mã code "${item.code}" của game ${item.gameName} kèm nguồn CodeGame.Shop đã sẵn sàng để dán vào Zalo, Facebook, Messenger!`,
        'success'
      );
    } catch {
      onShowToast('Lỗi', 'Không thể sao chép nội dung chia sẻ.', 'error');
    }
  };

  const handleToggleFollow = (gameSlug: string) => {
    if (onToggleBookmark) {
      onToggleBookmark(gameSlug);
    } else {
      dataService.toggleBookmark(gameSlug);
    }
    // Cập nhật lại danh mục theo dõi
    setSubscribedGames((prev) =>
      prev.includes(gameSlug) ? prev.filter((s) => s !== gameSlug) : [...prev, gameSlug]
    );
  };

  // ==============================================================
  // ACTIONS: BẢNG 2 (ĐĂNG KÝ EMAIL HIỆN TẠI)
  // ==============================================================
  const handleRemoveSubscribedGame = (slugToRemove: string) => {
    setSubscribedGames((prev) => prev.filter((s) => s !== slugToRemove));
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      onShowToast('Email không hợp lệ', 'Vui lòng nhập địa chỉ email hợp lệ để nhận thông báo.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await notificationService.saveSubscription({
        email: cleanEmail,
        userId: currentUser?.id || null,
        notifyFollowedCodes,
        notifyGiveaways,
        notifySales,
        subscribedGames,
        isActive: true,
      });

      if (res.success) {
        onShowToast('Thành công', res.message || 'Đã lưu cài đặt nhận thông báo email!', 'success');
        onClose();
      } else {
        onShowToast('Không thành công', res.message || 'Lỗi lưu thông tin', 'error');
      }
    } catch {
      onShowToast('Lỗi', 'Không thể kết nối đến máy chủ, vui lòng thử lại sau.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy nhận toàn bộ thông báo email từ CodeGame.shop?')) {
      return;
    }
    setIsUnsubscribing(true);
    try {
      await notificationService.unsubscribeAll();
      onShowToast('Đã hủy', 'Đã hủy đăng ký nhận thông báo email.', 'info');
      onClose();
    } catch {
      onShowToast('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-cyber-card overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* HEADER MODAL                                                   */}
        {/* ============================================================== */}
        <div className="p-3.5 sm:p-5 border-b border-border/60 flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary shadow-sm shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-bounce-subtle" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm sm:text-base text-foreground tracking-tight truncate flex items-center gap-1.5">
                  <span>Trung Tâm Thông Báo Code & Nhận Tin</span>
                  <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    MIỄN PHÍ
                  </span>
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                Cập nhật mã code mới từ game theo dõi & bảng cài đặt đăng ký nhận tin tức thì
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* 2 TAB RIÊNG BIỆT: MẶC ĐỊNH HIỆN BẢNG BÊN TRÁI (CODE MỚI)       */}
        {/* ============================================================== */}
        <div className="px-3 sm:px-5 py-2.5 bg-slate-900/60 border-b border-border/70 flex items-center gap-2 shrink-0">
          {/* TAB 1 (BÊN TRÁI): THÔNG BÁO GIFTCODE MỚI */}
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'notifications' ? 'text-white animate-bounce-subtle' : 'text-cyan-400'}`} />
            <span>Bảng Thông Báo Giftcode Mới</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'notifications' ? 'bg-white/20 text-white' : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
            }`}>
              {displayCodes.length} mã
            </span>
          </button>

          {/* TAB 2 (BÊN PHẢI): BẢNG ĐĂNG KÝ EMAIL */}
          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/50'
                : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70'
            }`}
          >
            <Mail className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'subscription' ? 'text-white' : 'text-amber-400'}`} />
            <span>Bảng Đăng Ký Nhận Email</span>
            {hasExistingSub && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'subscription' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                Đang bật
              </span>
            )}
          </button>
        </div>

        {/* ============================================================== */}
        {/* NỘI DUNG TỪNG TAB: KHI ẤN VÀO CÁI NÀO THÌ HIỆN RA CÁI ĐÓ       */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* ============================================================ */}
          {/* BẢNG 1: THÔNG BÁO CODE MỚI & CHIA SẺ KÈM NGUỒN (MẶC ĐỊNH)    */}
          {/* ============================================================ */}
          {activeTab === 'notifications' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-background/50">
            {/* Column 1 Header & Quick Search */}
            <div className="p-3.5 sm:p-4 border-b border-border/50 bg-slate-900/40 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-cyan-500/15 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                      <span>Bảng Thông Báo Giftcode Mới</span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {displayCodes.length} mã
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  {isDisplayingFollowed ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Bookmark className="w-3 h-3 fill-emerald-400" />
                      <span>Game Bạn Đang Theo Dõi</span>
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>Code HOT Đang Phát</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên game, mã code, phần thưởng..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950/70 border border-border/80 rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              {!isDisplayingFollowed && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Bạn chưa ấn theo dõi game nào. Nhấn biểu tượng <strong>🔖 Lưu</strong> trên game để nhận thông báo code tự động!
                  </span>
                </div>
              )}
            </div>

            {/* Column 1 Scrollable Codes List */}
            <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 flex-1">
              {displayCodes.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-muted/20 border border-border/60 border-dashed space-y-2">
                  <Gift className="w-8 h-8 text-muted-foreground mx-auto" />
                  <div className="text-xs font-bold text-foreground">Không tìm thấy mã giftcode nào phù hợp</div>
                  <p className="text-[11px] text-muted-foreground">Thử tìm kiếm với từ khóa khác hoặc bấm Lưu game trên trang chủ.</p>
                </div>
              ) : (
                displayCodes.map((item) => {
                  const isFollowedGame = bookmarkedSet.has(item.gameSlug.toLowerCase());

                  return (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/70 hover:border-cyan-500/40 transition-all duration-200 shadow-sm flex flex-col justify-between gap-2.5 group"
                    >
                      {/* Top: Game Info + Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => {
                            if (onSelectGame) {
                              const found = allGames.find((g) => g.slug === item.gameSlug);
                              if (found) {
                                onClose();
                                onSelectGame(found);
                              }
                            }
                          }}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-border shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                            <img
                              src={item.gameIcon}
                              alt={item.gameName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/logo.png';
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-heading font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                              <span>{item.gameName}</span>
                              {item.isUpcoming && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                  Giờ G
                                </span>
                              )}
                            </h5>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
                              <span>{item.publisher || 'NPH'}</span>
                              <span>•</span>
                              <span className="text-cyan-300/80">{item.category || 'Game Hot'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bookmark Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleFollow(item.gameSlug)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isFollowedGame
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'bg-slate-900 border-border text-muted-foreground hover:text-amber-400'
                          }`}
                          title={isFollowedGame ? 'Đang theo dõi game này' : 'Bấm để theo dõi game'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isFollowedGame ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      {/* Middle: Mã Code Box (To, rõ ràng) */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/25 flex items-center justify-between gap-2 shadow-inner">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 hidden sm:inline">
                            Code:
                          </span>
                          <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-400 tracking-wider truncate select-all">
                            {item.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Nút Sao Chép */}
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.code, item.gameName)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Sao chép mã code"
                          >
                            {copiedCode === item.code ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Đã Chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Sao Chép</span>
                              </>
                            )}
                          </button>

                          {/* Nút Chia Sẻ Kèm Nguồn CodeGame.Shop */}
                          <button
                            type="button"
                            onClick={() => handleShareCode(item)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                            title="Chia sẻ mã code kèm link nguồn CodeGame.Shop"
                          >
                            {sharedCodeId === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Đã Share</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Chia Sẻ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bottom Info: Quà tặng & Link nguồn */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <div className="flex items-center gap-1 text-slate-300 truncate max-w-[280px] sm:max-w-md">
                          <Gift className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{item.rewards || 'Gói quà tân thủ, Kim Cương, EXP'}</span>
                        </div>

                        <div className="text-[10px] text-cyan-400 font-mono font-medium shrink-0 flex items-center gap-0.5">
                          <span>Nguồn: CodeGame.Shop</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bảng 1 Footer Action Bar */}
            <div className="p-3 sm:p-3.5 border-t border-border/60 bg-slate-900/40 flex items-center justify-between gap-2 shrink-0">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Cập nhật mã quà tặng tự động 24/7 từ nhà phát hành</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* BẢNG 2: BẢNG ĐĂNG KÝ HIỆN TẠI (FORM EMAIL & CHECKBOX)        */}
        {/* ============================================================ */}
        {activeTab === 'subscription' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-card">
            {/* Column 2 Header */}
            <div className="p-3.5 sm:p-4 border-b border-border/50 bg-slate-900/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-500/15 text-amber-400">
                  <Mail className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground">
                    Bảng Đăng Ký Nhận Thông Báo Email
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Tự động gửi email khi có mã mới & sự kiện giờ G</p>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveSubscription} className="p-3.5 sm:p-4 overflow-y-auto space-y-4 flex-1">
              {/* Target Game Banner nếu mở từ game cụ thể */}
              {targetGameSlug && (
                <div className="p-2.5 rounded-xl bg-secondary/10 border border-secondary/30 flex items-center gap-2.5">
                  <Gamepad2 className="w-4 h-4 text-secondary shrink-0" />
                  <div className="text-xs">
                    <span className="text-muted-foreground">Đang chọn theo dõi: </span>
                    <strong className="text-secondary font-bold">{targetGameName || targetGameSlug}</strong>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Địa Chỉ Email Nhận Thông Báo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vidu: hotro@gmail.com"
                    className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:border-secondary transition-all"
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Cam kết bảo mật 100%, không spam, có link hủy đăng ký 1 chạm.</span>
                </p>
              </div>

              {/* Granular Checkboxes */}
              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider text-slate-300">
                  Chọn Loại Thông Báo Bạn Muốn Nhận:
                </label>

                {/* Option 1: Code mới theo game */}
                <div
                  onClick={() => setNotifyFollowedCodes(!notifyFollowedCodes)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    notifyFollowedCodes
                      ? 'bg-secondary/10 border-secondary/40 shadow-sm'
                      : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={notifyFollowedCodes}
                      onChange={(e) => setNotifyFollowedCodes(e.target.checked)}
                      className="rounded border-border text-secondary focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                      <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Mã Giftcode Mới Của Game Đang Theo Dõi</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tự động gửi email ngay khi hệ thống vừa thu thập mã giftcode mới của các tựa game bạn quan tâm.
                    </p>
                  </div>
                </div>

                {/* Subscribed Games Tags (nếu bật option 1) */}
                {notifyFollowedCodes && (
                  <div className="pl-3 pr-1 py-1">
                    <div className="text-[11px] font-bold text-slate-400 mb-1.5">
                      Các game đang theo dõi ({subscribedGames.length}):
                    </div>
                    {subscribedGames.length === 0 ? (
                      <p className="text-[11px] text-amber-400/90 italic">
                        Chưa chọn game nào. Bạn hãy bấm vào nút 🔖 Lưu hoặc quả chuông tại trang chi tiết để theo dõi.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {subscribedGames.map((slug) => {
                          const g = allGames.find((item) => item.slug === slug || item.id === slug);
                          const name = g?.name || slug;
                          return (
                            <span
                              key={slug}
                              className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/30"
                            >
                              <span className="truncate max-w-[120px]">{name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSubscribedGame(slug);
                                }}
                                className="text-secondary/70 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Bỏ theo dõi game này"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Giveaway Alerts */}
                <div
                  onClick={() => setNotifyGiveaways(!notifyGiveaways)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    notifyGiveaways
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                      : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={notifyGiveaways}
                      onChange={(e) => setNotifyGiveaways(e.target.checked)}
                      className="rounded border-border text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                      <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Sự Kiện Phát Code Miễn Phí (Giờ G)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Nhận email nhắc hẹn trước 1 tiếng và khi cổng phát mã VIP mở để không bỏ lỡ đợt quà tặng giới hạn.
                    </p>
                  </div>
                </div>

                {/* Option 3: Sales & Flash Sales */}
                <div
                  onClick={() => setNotifySales(!notifySales)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    notifySales
                      ? 'bg-rose-500/10 border-rose-500/40 shadow-sm'
                      : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={notifySales}
                      onChange={(e) => setNotifySales(e.target.checked)}
                      className="rounded border-border text-rose-500 focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                      <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Khuyến Mãi & Flash Sale Giảm Giá Giờ Vàng</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Thông báo khi các gói nạp hoặc tiện ích được hạ giá sâu hoặc có mã voucher giảm giá toàn sàn.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 shrink-0">
                {hasExistingSub ? (
                  <button
                    type="button"
                    disabled={isUnsubscribing}
                    onClick={handleUnsubscribe}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hủy Đăng Ký</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-secondary to-blue-600 hover:from-secondary/90 hover:to-blue-500 shadow-neon-teal transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Đang Lưu...' : 'Lưu Cài Đặt'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
