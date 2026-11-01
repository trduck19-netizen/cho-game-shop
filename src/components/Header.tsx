import React, { useState, useEffect, useRef } from 'react';
import {
  Bookmark,
  PlusCircle,
  Moon,
  Sun,
  Gift,
  ShoppingBag,
  Sparkles,
  ShieldAlert,
  Wallet,
  Package,
  User,
  LogOut,
  Wrench,
  Newspaper,
  Smartphone,
  Bell,
  Award,
  Globe,
} from 'lucide-react';
import type { GameItem, UserProfile } from '../types/game';
import { formatCore } from '../utils/textUtils';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { growthService } from '../services/growthService';

interface HeaderProps {
  currentTab: 'catalog' | 'news' | 'giveaways' | 'store' | 'utilities' | 'missions';
  onSelectTab: (tab: 'catalog' | 'news' | 'giveaways' | 'store' | 'utilities' | 'missions') => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  bookmarkCount: number;
  onOpenBookmarks: () => void;
  onOpenSubmitCode: () => void;
  onOpenPlayground: () => void;
  onOpenDownloadApp?: () => void;
  onOpenNotificationModal?: () => void;
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onOpenReceivedCodes: (initialTab?: 'giveaways' | 'orders' | 'privates' | 'missions') => void;
  onOpenProfile?: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  isDarkMode?: boolean;
  onToggleTheme: () => void;
  allGames?: GameItem[];
  onSelectGame?: (game: GameItem) => void;
  branding?: {
    logoUrl?: string;
    avatarUrl?: string;
    backgroundUrl?: string;
    backgroundStyle?: string;
    backgroundOpacity?: number;
    siteTitle?: string;
    portalSubtitle?: string;
  };
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  bookmarkCount,
  onOpenBookmarks,
  onOpenSubmitCode,
  onOpenPlayground,
  onOpenDownloadApp,
  onOpenNotificationModal,
  onOpenAuth,
  onOpenWallet,
  onOpenReceivedCodes,
  onOpenProfile,
  currentUser,
  onLogout,
  isDarkMode,
  onToggleTheme,
  branding,
}) => {
  const { t } = useLanguage();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isGrowthEnabled, setIsGrowthEnabled] = useState(() => {
    try {
      return Boolean(growthService.getConfig().isEnabled);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleConfigUpdate = (e?: any) => {
      try {
        const cfg = e?.detail || growthService.getConfig();
        setIsGrowthEnabled(Boolean(cfg?.isEnabled));
      } catch {
        setIsGrowthEnabled(false);
      }
    };

    // Eagerly sync latest growth config from server KV/D1
    growthService.fetchFreshConfigFromServer()
      .then((cfg) => {
        setIsGrowthEnabled(Boolean(cfg?.isEnabled));
      })
      .catch(() => {});

    window.addEventListener('wcg_growth_config_updated', handleConfigUpdate);
    window.addEventListener('storage', handleConfigUpdate);
    return () => {
      window.removeEventListener('wcg_growth_config_updated', handleConfigUpdate);
      window.removeEventListener('storage', handleConfigUpdate);
    };
  }, []);

  // Click outside listener for User dropdown (supports mouse and touch)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full max-w-full box-border bg-background/95 backdrop-blur-md border-b border-border shadow-md shadow-black/10 transition-all overflow-visible"
      style={{ position: 'sticky', top: 0, zIndex: 50, overflow: 'visible' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          {/* 1. Brand Logo */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectTab('catalog')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTab('catalog');
              }
            }}
            className="flex items-center gap-1.5 sm:gap-2 group shrink-0 cursor-pointer select-none"
            aria-label="Về trang chủ tra cứu code"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary via-primary-hover to-accent flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== window.location.origin + '/logo.png') {
                      target.src = '/logo.png';
                    }
                  }}
                />
              ) : (
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-display font-bold text-xs sm:text-base tracking-normal sm:tracking-wider text-foreground group-hover:text-primary-light transition-colors whitespace-nowrap">
                  {branding?.siteTitle && branding.siteTitle.toUpperCase() !== 'WEB CODE GAME' && branding.siteTitle.toUpperCase() !== 'WEB CODE'
                    ? branding.siteTitle
                    : 'CodeGame.Shop'}
                </span>
                {branding?.siteTitle === 'WEB CODE' && (
                  <span className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.2 rounded-md bg-accent/20 text-accent font-mono font-bold tracking-tight border border-accent/30">
                    GAME
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-sans hidden sm:block">
                {branding?.portalSubtitle || t.header.portalSubtitle}
              </span>
            </div>
          </div>

          {/* 2. Desktop Navigation Tabs - Always visible on PC / Tablet (md+) and pinned on scroll */}
          <nav className="hidden md:flex items-center gap-1 bg-muted/60 p-1 sm:p-1.2 rounded-xl border border-border/80 flex-nowrap whitespace-nowrap shrink-0 shadow-sm">
            <button
              type="button"
              onClick={() => onSelectTab('catalog')}
              className={`cg-btn cg-btn--small !text-xs !py-1.5 !px-2.5 sm:!px-3 !rounded-xl ${
                currentTab === 'catalog' ? 'ring-2 ring-primary/80 shadow-glow-primary' : ''
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>{t.nav.catalog}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('news')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'news'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'text-slate-300 hover:text-white hover:bg-card'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span>{t.nav.news || 'Tin Tức'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('giveaways')}
              className={`cg-btn cg-btn--small !text-xs !py-1.5 !px-2.5 sm:!px-3 !rounded-xl ${
                currentTab === 'giveaways' ? 'ring-2 ring-amber-400/90 shadow-glow-accent' : ''
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t.nav.giveaways}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('store')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'store'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-card'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-secondary" />
              <span>{t.nav.store}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('utilities')}
              className={`cg-btn cg-btn--small !text-xs !py-1.5 !px-2.5 sm:!px-3 !rounded-xl ${
                currentTab === 'utilities' ? 'ring-2 ring-teal-400/90 shadow-sm' : ''
              }`}
            >
              <Wrench className="w-4 h-4 text-teal-400" />
              <span>{t.nav.utilities}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('missions')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'missions'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'text-slate-300 hover:text-white hover:bg-card'
              }`}
            >
              <Award className="w-4 h-4 text-primary-light" />
              <span>{t.nav.missions || 'Nhiệm Vụ'}</span>
            </button>
          </nav>

          {/* 3. Actions Toolbar: Tải App, Bookmark, Account (Compact & responsive on mobile) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Săn Quà & Vòng Quay Button (Desktop only; on mobile, available via bottom nav & user menu) */}
            {isGrowthEnabled && (
              <button
                onClick={onOpenPlayground}
                className="hidden sm:flex relative items-center gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 hover:from-amber-500/25 hover:to-rose-500/25 border border-amber-500/40 text-amber-300 font-extrabold text-xs transition-all active:scale-95 shadow-sm cursor-pointer group"
                title="Săn Quà Tân Thủ, Vòng Quay May Mắn & Mời Bạn Nhận Hoa Hồng"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform animate-pulse" />
                <span className="hidden xs:inline">Săn Quà</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm">
                  FREE
                </span>
              </button>
            )}

            {/* Tải App Button */}
            <button
              type="button"
              onClick={onOpenDownloadApp}
              className="relative flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-2 rounded-xl bg-gradient-to-r from-primary/15 via-purple-500/15 to-accent/15 hover:from-primary/25 hover:to-accent/25 border border-primary/40 text-primary-light font-extrabold text-xs transition-all active:scale-95 shadow-sm cursor-pointer group shrink-0"
              title="Cài đặt App CodeGame lên điện thoại (Nhận code mới & Quà tặng tức thì)"
            >
              <Smartphone className="w-3.5 h-3.5 text-primary-light group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Tải App</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                APP
              </span>
            </button>

            {/* Bookmark Button (Desktop & Mobile) - Chỉ hiển thị cho khách vãng lai chưa đăng nhập */}
            {!currentUser && (
              <button
                onClick={onOpenBookmarks}
                className="relative p-1.5 sm:p-2 min-w-[32px] min-h-[32px] sm:min-w-[38px] sm:min-h-[38px] flex items-center justify-center rounded-xl bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-foreground transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
                title={t.header.bookmarksTitle}
                aria-label={t.header.bookmarksTitle}
              >
                <Bookmark className="w-4 h-4 text-amber-400" />
                {bookmarkCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {bookmarkCount}
                  </span>
                )}
              </button>
            )}

            {/* User Account / Wallet Menu / Thông Tin Nhân Vật */}
            <div ref={userMenuRef} className="relative shrink-0">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUserMenuOpen((prev) => !prev);
                    }}
                    className="relative flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl bg-card hover:bg-card-hover border border-border text-xs transition-all cursor-pointer shadow-sm active:scale-95 group shrink-0"
                    title={`${currentUser.displayName || currentUser.username} • ${formatCore(currentUser.wallet_balance)}`}
                    aria-label="Thông tin nhân vật"
                  >
                    <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/20 text-primary-light flex items-center justify-center overflow-hidden border border-border shrink-0">
                      {currentUser.avatar_url ? (
                        <img
                          src={currentUser.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <User className="w-4 h-4 text-slate-300" />
                      )}
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-card" />
                    </div>
                    {bookmarkCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center shadow-sm pointer-events-none">
                        {bookmarkCount}
                      </span>
                    )}
                  </button>

                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-64 max-h-[calc(100vh-5rem)] max-w-[calc(100vw-1rem)] overflow-y-auto bg-card border border-border/90 rounded-2xl shadow-2xl p-2 z-[100] animate-scale-in text-xs space-y-1 scrollbar-thin"
                    >
                      {/* User Info Header - Clickable to open Profile */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className="w-full p-2.5 border-b border-border/60 flex items-start gap-2.5 rounded-xl hover:bg-primary/10 transition-colors text-left cursor-pointer group"
                        title="Xem & Chỉnh sửa thông tin nhân vật"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden border border-border shrink-0 mt-0.5 group-hover:border-primary/50 transition-colors">
                          {currentUser.avatar_url ? (
                            <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 m-2.5 text-muted-foreground group-hover:text-primary-light" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate block text-xs group-hover:text-primary-light transition-colors">
                              {currentUser.displayName || currentUser.username}
                            </span>
                            <span className="text-[10px] text-primary-light font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              Sửa ↗
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block mb-1">
                            {currentUser.email}
                          </span>
                          {/* Số dư ngay dưới mail */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                            <span className="text-[10px] text-slate-400">Số dư:</span>
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              {formatCore(currentUser.wallet_balance)}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* 0. Thông Tin Nhân Vật & Hồ Sơ */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left group"
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary-light group-hover:scale-110 transition-transform" />
                          <span className="font-medium">Thông Tin Nhân Vật</span>
                        </span>
                        <span className="text-[10px] text-primary-light font-bold">
                          Hồ sơ ↗
                        </span>
                      </button>

                      {/* 1. Nạp Core và Lịch Sử */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          onOpenWallet();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left group"
                      >
                        <span className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-primary-light group-hover:scale-110 transition-transform" />
                          <span className="font-medium">{t.header.wallet}</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Nạp ngay
                        </span>
                      </button>

                      {/* 2. Kho mã của tôi */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          onOpenReceivedCodes();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left group"
                      >
                        <span className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span>{t.header.myCodes}</span>
                        </span>
                        <span className="text-[10px] text-primary-light font-bold">
                          Mã quà & Nhiệm vụ ↗
                        </span>
                      </button>

                      {/* 2.1 Tủ Game Thông Tin Đã Lưu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          onOpenBookmarks();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left group"
                        title="Xem danh sách game đã lưu và theo dõi"
                      >
                        <span className="flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">Tủ Game Đã Lưu</span>
                        </span>
                        {bookmarkCount > 0 ? (
                          <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            {bookmarkCount} game
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Trống</span>
                        )}
                      </button>

                      {/* 2.1 Cài Đặt Thông Báo Email */}
                      {onOpenNotificationModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsUserMenuOpen(false);
                            onOpenNotificationModal();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left group"
                        >
                          <span className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-secondary group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Thông Báo Email</span>
                          </span>
                          <span className="text-[10px] text-secondary font-bold bg-secondary/15 px-2 py-0.5 rounded-full border border-secondary/30">
                            Cài đặt
                          </span>
                        </button>
                      )}

                      {/* 3. Vòng Quay Quà */}
                      {isGrowthEnabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsUserMenuOpen(false);
                            onOpenPlayground();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>{t.header.luckyWheel}</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                            HOT
                          </span>
                        </button>
                      )}

                      {/* 4. Đóng Góp Code */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          onOpenSubmitCode();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <PlusCircle className="w-4 h-4 text-primary-light" />
                          <span>{t.header.submitCode}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary-light font-semibold border border-primary/30">
                          +Core
                        </span>
                      </button>

                      {/* 5. Trang Quản Trị Admin */}
                      {(currentUser.role === 'admin' || currentUser.role === 'SUPER_ADMIN') && (
                        <a
                          href="https://admin-code-game-shop.pages.dev"
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-primary/15 text-primary-light font-bold cursor-pointer text-left"
                        >
                          <span className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-400" />
                            <span>{t.header.adminPortal}</span>
                          </span>
                          <span className="text-[10px] text-primary-light">↗</span>
                        </a>
                      )}

                      {/* Shared: Giao Diện & Ngôn Ngữ */}
                      <div className="pt-2 pb-1 border-t border-border/60 space-y-2">
                        <div className="px-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span>Giao Diện & Ngôn Ngữ</span>
                        </div>

                        {/* Sáng / Tối Theme Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTheme();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            {isDarkMode ? (
                              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <Moon className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="font-medium">{isDarkMode ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted border border-border/60 text-slate-300">
                            {isDarkMode ? 'Sáng' : 'Tối'}
                          </span>
                        </button>

                        {/* Ngôn ngữ hệ thống */}
                        <div className="p-1.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pl-1">
                            <Globe className="w-3.5 h-3.5 text-primary-light shrink-0" />
                            <span>Ngôn ngữ:</span>
                          </span>
                          <LanguageSelector variant="pill" />
                        </div>
                      </div>

                      {/* 6. Đăng Xuất */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-rose-500/15 text-rose-400 cursor-pointer text-left pt-1 border-t border-border/40"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t.header.logout}</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUserMenuOpen((prev) => !prev);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 min-h-[32px] sm:min-h-[38px] rounded-xl text-xs font-bold bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/40 transition-all cursor-pointer active:scale-95 shrink-0"
                    aria-label="Tài khoản & Cài đặt"
                  >
                    <User className="w-3.5 h-3.5 text-primary-light shrink-0" />
                    <span>{t.header.account}</span>
                  </button>

                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-64 max-h-[calc(100vh-5rem)] max-w-[calc(100vw-1rem)] overflow-y-auto bg-card border border-border/90 rounded-2xl shadow-2xl p-2 z-[100] animate-scale-in text-xs space-y-1.5 scrollbar-thin"
                    >
                      <div className="p-1 space-y-2">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/15 via-accent/10 to-muted/40 border border-primary/25 text-center space-y-2">
                          <div className="w-9 h-9 mx-auto rounded-xl bg-primary/20 text-primary-light flex items-center justify-center border border-primary/30 shadow-sm">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs">Tài Khoản Khách</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                              Đăng nhập để nhận Giftcode riêng & tích lũy điểm Core
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAuth();
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs shadow-glow-primary transition-all cursor-pointer active:scale-95"
                          >
                            Đăng Nhập / Đăng Ký
                          </button>
                        </div>

                        {/* Guest Bookmarks shortcut */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsUserMenuOpen(false);
                            onOpenBookmarks();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left group"
                        >
                          <span className="flex items-center gap-2">
                            <Bookmark className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Tủ Game Đã Lưu</span>
                          </span>
                          {bookmarkCount > 0 && (
                            <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                              {bookmarkCount}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Shared: Giao Diện & Ngôn Ngữ */}
                      <div className="pt-2 pb-1 border-t border-border/60 space-y-2">
                        <div className="px-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span>Giao Diện & Ngôn Ngữ</span>
                        </div>

                        {/* Sáng / Tối Theme Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTheme();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-foreground cursor-pointer text-left transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            {isDarkMode ? (
                              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <Moon className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="font-medium">{isDarkMode ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted border border-border/60 text-slate-300">
                            {isDarkMode ? 'Sáng' : 'Tối'}
                          </span>
                        </button>

                        {/* Ngôn ngữ hệ thống */}
                        <div className="p-1.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pl-1">
                            <Globe className="w-3.5 h-3.5 text-primary-light shrink-0" />
                            <span>Ngôn ngữ:</span>
                          </span>
                          <LanguageSelector variant="pill" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Email Notifications Subscription Button */}
            {onOpenNotificationModal && (
              <button
                onClick={onOpenNotificationModal}
                className="p-1.5 sm:p-2 min-w-[32px] min-h-[32px] sm:min-w-[38px] sm:min-h-[38px] flex items-center justify-center rounded-xl bg-card hover:bg-card-hover border border-border/80 hover:border-secondary/40 text-slate-300 hover:text-secondary transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 relative group"
                title="Đăng ký nhận mã code & sự kiện qua Email"
                aria-label="Nhận thông báo email"
              >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-secondary rounded-full border border-card animate-pulse" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
