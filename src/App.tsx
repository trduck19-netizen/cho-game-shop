import React, { useState, useEffect, useCallback, useTransition, useRef, Suspense } from 'react';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { Header } from './components/Header';
import { AnnouncementBar } from './components/AnnouncementBar';
import { TopEventBanner } from './components/countdown/TopEventBanner';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { GameGrid } from './components/GameGrid';
import { PinnedGamesBar } from './components/PinnedGamesBar';
import { UpcomingGamesBanner } from './components/UpcomingGamesBanner';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CyberLoader } from './components/CyberLoader';
import { SearchAutocomplete } from './components/SearchAutocomplete';
import { ArrowUp } from 'lucide-react';
import { Footer } from './components/Footer';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { GameGridSkeleton } from './components/GameCardSkeleton';

// P4: Code Splitting & Lazy Loaded Views / Modals with auto-recovery on stale deployment chunks
const FloatingAnnouncement = lazyWithRetry(() => import('./components/FloatingAnnouncement').then((m) => ({ default: m.FloatingAnnouncement })));
const MarketingNotificationToast = lazyWithRetry(() => import('./components/MarketingNotificationToast').then((m) => ({ default: m.MarketingNotificationToast })));
const AdminApp = lazyWithRetry(() => import('./admin/AdminApp'));
const NewsView = lazyWithRetry(() => import('./components/NewsView').then((m) => ({ default: m.NewsView })));
const GiveawaysView = lazyWithRetry(() => import('./components/GiveawaysView').then((m) => ({ default: m.GiveawaysView })));
const StoreView = lazyWithRetry(() => import('./components/StoreView').then((m) => ({ default: m.StoreView })));
const UtilitiesView = lazyWithRetry(() => import('./components/UtilitiesView').then((m) => ({ default: m.UtilitiesView })));
const MissionsView = lazyWithRetry(() => import('./components/MissionsView').then((m) => ({ default: m.MissionsView })));
const GameDetailModal = lazyWithRetry(() => import('./components/GameDetailModal').then((m) => ({ default: m.GameDetailModal })));
const SubmitCodeModal = lazyWithRetry(() => import('./components/SubmitCodeModal').then((m) => ({ default: m.SubmitCodeModal })));
const BookmarkDrawer = lazyWithRetry(() => import('./components/BookmarkDrawer').then((m) => ({ default: m.BookmarkDrawer })));
const AllUpcomingGamesModal = lazyWithRetry(() => import('./components/AllUpcomingGamesModal').then((m) => ({ default: m.AllUpcomingGamesModal })));
const CodePlaygroundModal = lazyWithRetry(() => import('./components/CodePlaygroundModal').then((m) => ({ default: m.CodePlaygroundModal })));
const GrowthCenterModal = lazyWithRetry(() => import('./components/GrowthCenterModal').then((m) => ({ default: m.GrowthCenterModal })));
const ShareModal = lazyWithRetry(() => import('./components/ShareModal').then((m) => ({ default: m.ShareModal })));
const ProductDetailModal = lazyWithRetry(() => import('./components/ProductDetailModal').then((m) => ({ default: m.ProductDetailModal })));
const ProductCheckoutModal = lazyWithRetry(() => import('./components/ProductCheckoutModal').then((m) => ({ default: m.ProductCheckoutModal })));
const AuthModal = lazyWithRetry(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const UserWalletModal = lazyWithRetry(() => import('./components/UserWalletModal').then((m) => ({ default: m.UserWalletModal })));
const MyReceivedCodesModal = lazyWithRetry(() => import('./components/MyReceivedCodesModal').then((m) => ({ default: m.MyReceivedCodesModal })));
const UserProfileModal = lazyWithRetry(() => import('./components/UserProfileModal').then((m) => ({ default: m.UserProfileModal })));
const DownloadAppModal = lazyWithRetry(() => import('./components/DownloadAppModal').then((m) => ({ default: m.DownloadAppModal })));
const EmailSubscriptionModal = lazyWithRetry(() => import('./components/notification/EmailSubscriptionModal').then((m) => ({ default: m.EmailSubscriptionModal })));
import { dataService } from './services/dataService';
import { marketingService } from './services/marketingService';
import { authService } from './services/authService';
import { growthService } from './services/growthService';
import type { GameItem, FilterState, StoreProduct, UserProfile, GiveawayCampaign, UtilityProduct, ProductPackageVariant, UpcomingGame } from './types/game';
import { saveRecentSearch } from './utils/recentSearchUtils';
import { groupStoreProductsByGame } from './utils/productPackageUtils';
import { isCodeExpired } from './utils/codeUtils';

export interface SharePayload {
  title: string;
  subtitle?: string;
  shareUrl: string;
  itemType: 'game' | 'giveaway' | 'product' | 'utility';
  imageUrl?: string;
  badge?: string;
}

const ADMIN_HASH_PREFIXES = [
  '#/admin',
  '#/dashboard',
  '#/games',
  '#/news',
  '#/free-codes',
  '#/giftcodes',
  '#/crawler',
  '#/marketing',
  '#/floating-notification',
  '#/growth',
  '#/members',
  '#/wallet',
  '#/private-codes',
  '#/code-inventory',
  '#/utilities',
  '#/orders',
  '#/sepay',
  '#/content',
  '#/security-logs',
  '#/profile',
];

export const App: React.FC = () => {
  const [, startTransition] = useTransition();

  // Navigation Tab State (Decoupled Frontends Domain Detection & Hash Routing)
  const [currentTab, setCurrentTab] = useState<'catalog' | 'news' | 'giveaways' | 'store' | 'utilities' | 'missions' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();

      // 1. If on dedicated admin domain or admin hash/route -> Open AdminApp directly
      const isAdminDomain = host.includes('admin-code-game-shop') || host.startsWith('admin.');
      const isAdminHash = ADMIN_HASH_PREFIXES.some((p) => hash.startsWith(p));
      if (isAdminDomain || path.startsWith('/admin') || isAdminHash) {
        return 'admin';
      }

      if (hash.includes('news') || hash.includes('tintuc') || path === '/news' || path.startsWith('/news/')) return 'news';
      if (hash.includes('giveaways') || hash.includes('gw=') || path === '/giveaways' || path.startsWith('/giveaways/')) return 'giveaways';
      if (hash.includes('store') || hash.includes('product=') || hash.includes('prod=') || path === '/store' || path.startsWith('/store/')) return 'store';
      if (hash.includes('utilities') || hash.includes('utility=') || hash.includes('ut=') || path === '/utilities' || path.startsWith('/utilities/')) return 'utilities';
      if (hash.includes('missions') || hash.includes('nhiem-vu') || path === '/missions' || path.startsWith('/missions/') || path === '/nhiem-vu' || path.startsWith('/nhiem-vu/')) return 'missions';
    }
    return 'catalog';
  });

  const [initialNewsSlug, setInitialNewsSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const matchPath = path.match(/^\/news\/([^/?#]+)/i);
      if (matchPath) return decodeURIComponent(matchPath[1]);
      const matchHash = hash.match(/(?:#\/news\/|#news\/|news=)([^/?#&]+)/i);
      if (matchHash) return decodeURIComponent(matchHash[1]);
    }
    return null;
  });
  const [initialGiveawayId, setInitialGiveawayId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      const gwParam = urlParams.get('gw') || urlParams.get('giveaway');
      if (gwParam) return decodeURIComponent(gwParam);
      const matchPath = path.match(/^\/(?:giveaways|giveaway)\/([^/?#]+)/i);
      if (matchPath) return decodeURIComponent(matchPath[1]);
      const matchHash = hash.match(/(?:#\/giveaways\/|#giveaways\/|gw=)([^/?#&]+)/i);
      if (matchHash) return decodeURIComponent(matchHash[1]);
    }
    return null;
  });
  const [initialMissionId, setInitialMissionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const matchPath = path.match(/\/(?:nhiem-vu|missions)\/([^/?#]+)/);
      if (matchPath) return decodeURIComponent(matchPath[1]);
      const matchHash = hash.match(/(?:#\/nhiem-vu\/|#\/missions\/|ms=)([^/?#&]+)/);
      if (matchHash) return decodeURIComponent(matchHash[1]);
    }
    return null;
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isStickySearchVisible, setIsStickySearchVisible] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    category: 'all',
    tag: 'all',
    sortBy: 'release_date',
    sortOrder: 'desc',
  });

  // Data & Pagination State
  const [paginationConfig, setPaginationConfig] = useState(() => dataService.getPaginationConfig());
  const [games, setGames] = useState<GameItem[]>([]);
  const [allGamesList, setAllGamesList] = useState<GameItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Branding & Assets from CMS
  const [branding, setBranding] = useState(() => dataService.getWebsiteBranding());

  // User State & Bookmarks
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => dataService.getCurrentUser());
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [bookmarkedGamesList, setBookmarkedGamesList] = useState<GameItem[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>(() => dataService.getUpcomingGamesSync());
  const [isAllUpcomingModalOpen, setIsAllUpcomingModalOpen] = useState(false);
  const [selectedUpcomingSlug, setSelectedUpcomingSlug] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<StoreProduct | null>(null);
  const [checkoutPackage, setCheckoutPackage] = useState<ProductPackageVariant | null>(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState<number>(1);
  const [selectedUtilityId, setSelectedUtilityId] = useState<string | null>(null);

  const [isBookmarkDrawerOpen, setIsBookmarkDrawerOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPlaygroundModalOpen, setIsPlaygroundModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [isGrowthCenterOpen, setIsGrowthCenterOpen] = useState(false);
  const [growthInitialTab, setGrowthInitialTab] = useState<'wheel' | 'welcome' | 'referral' | 'checkin' | 'leaderboard'>('wheel');
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
        const enabled = Boolean(cfg?.isEnabled);
        setIsGrowthEnabled(enabled);
        if (!enabled) {
          setIsGrowthCenterOpen(false);
        }
      } catch {
        setIsGrowthEnabled(false);
        setIsGrowthCenterOpen(false);
      }
    };

    growthService.fetchFreshConfigFromServer()
      .then((cfg) => {
        const enabled = Boolean(cfg?.isEnabled);
        setIsGrowthEnabled(enabled);
        if (!enabled) {
          setIsGrowthCenterOpen(false);
        }
      })
      .catch(() => {});

    window.addEventListener('wcg_growth_config_updated', handleConfigUpdate);
    window.addEventListener('storage', handleConfigUpdate);
    return () => {
      window.removeEventListener('wcg_growth_config_updated', handleConfigUpdate);
      window.removeEventListener('storage', handleConfigUpdate);
    };
  }, []);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isReceivedCodesOpen, setIsReceivedCodesOpen] = useState(false);
  const [receivedCodesInitialTab, setReceivedCodesInitialTab] = useState<'giveaways' | 'orders' | 'privates' | 'missions'>('giveaways');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const handleOpenReceivedCodes = (tab: 'giveaways' | 'orders' | 'privates' | 'missions' = 'giveaways') => {
    setReceivedCodesInitialTab(tab);
    setIsReceivedCodesOpen(true);
  };

  // Capture referral tracking parameters (?ref=... or ?invite=...) on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('invite');
      if (ref) {
        localStorage.setItem('wcg_referrer_id', ref);
      }
    }
  }, []);

  // Theme & Toasts
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('wcg_theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.setItem('wcg_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('wcg_theme', 'light');
      }
      return next;
    });
  };

  // Sticky Floating Search Bar visibility handler on Catalog scroll
  useEffect(() => {
    const handleMobileSearchToggle = (e: any) => {
      const active = Boolean(e?.detail?.isOpen);
      setIsMobileSearchActive(active);
    };
    window.addEventListener('wcg_mobile_search_toggled', handleMobileSearchToggle);

    if (currentTab !== 'catalog') {
      setIsStickySearchVisible(false);
      return () => {
        window.removeEventListener('wcg_mobile_search_toggled', handleMobileSearchToggle);
      };
    }

    const checkStickyVisibility = () => {
      const heroSearchEl = document.getElementById('hero-search-container');
      if (!heroSearchEl) {
        setIsStickySearchVisible(false);
        return;
      }

      // If user is currently focusing inside the hero search bar, keep sticky bar hidden to prevent UI clashes on mobile keyboard popups
      if (typeof document !== 'undefined' && heroSearchEl.contains(document.activeElement)) {
        setIsStickySearchVisible(false);
        return;
      }

      const rect = heroSearchEl.getBoundingClientRect();
      // Header height: 64px on sm/desktop (>=640px), 56px on mobile (<640px)
      const headerHeight = window.innerWidth >= 640 ? 64 : 56;
      // Show sticky floating search bar once the hero search bar has scrolled up under the header
      setIsStickySearchVisible(rect.bottom < headerHeight);
    };

    checkStickyVisibility();
    window.addEventListener('scroll', checkStickyVisibility, { passive: true });
    window.addEventListener('resize', checkStickyVisibility, { passive: true });

    return () => {
      window.removeEventListener('wcg_mobile_search_toggled', handleMobileSearchToggle);
      window.removeEventListener('scroll', checkStickyVisibility);
      window.removeEventListener('resize', checkStickyVisibility);
    };
  }, [currentTab]);

  // Toast Helper
  const showToast = useCallback(
    (title: string, message?: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const handleUpdateUser = useCallback((usr: UserProfile) => {
    setCurrentUser((prev) => {
      if (!prev && !usr) return null;
      if (!prev && usr) return usr;
      if (prev && !usr) return null;
      if (prev && usr) {
        if (
          prev.wallet_balance !== usr.wallet_balance ||
          prev.id !== usr.id ||
          prev.role !== usr.role ||
          prev.displayName !== usr.displayName ||
          prev.avatar_url !== usr.avatar_url
        ) {
          return usr;
        }
        return prev;
      }
      return usr;
    });
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Real-time listener for user state updates across components, tabs and storage events
  useEffect(() => {
    const handleUserUpdate = (e: any) => {
      const u = e?.detail !== undefined ? e.detail : dataService.getCurrentUser();
      if (u) {
        handleUpdateUser(u);
      } else {
        setCurrentUser(null);
      }
    };
    window.addEventListener('wcg_user_updated', handleUserUpdate);
    return () => window.removeEventListener('wcg_user_updated', handleUserUpdate);
  }, [handleUpdateUser]);

  // Global listener for floating toast events (from components/cards)
  useEffect(() => {
    const handleCustomToast = (e: any) => {
      const { title, message, type } = e.detail || {};
      if (title) {
        showToast(title, message, type || 'success');
      }
    };
    window.addEventListener('wcg_show_toast', handleCustomToast);
    return () => window.removeEventListener('wcg_show_toast', handleCustomToast);
  }, [showToast]);

  // Persistent Screen-Covering Splash Preloader Dismissal
  useEffect(() => {
    const dismissPreloader = () => {
      const preloader = document.getElementById('app-preloader');
      if (preloader) {
        preloader.style.opacity = '0';
        preloader.style.pointerEvents = 'none';
        setTimeout(() => {
          if (preloader.parentNode) {
            preloader.parentNode.removeChild(preloader);
          }
        }, 360);
      }
    };

    dismissPreloader();
    const rafId = requestAnimationFrame(dismissPreloader);
    const timeoutId = setTimeout(dismissPreloader, 150);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, []);

  // Initial Load & Deep Link Router
  useEffect(() => {
    const loadInitialData = async () => {
      // Check Hash / Search Params for Deep Linking (/g/:slug, /giveaways, /store, /admin, /#product=id, /#gw=id)
      const parseHash = async () => {
        const hash = window.location.hash;
        const hashLower = hash.toLowerCase();
        const host = window.location.hostname;
        const urlParams = new URLSearchParams(window.location.search);

        // Check for cross-origin sync_data payload in URL hash (from Admin "Xem Web Khách")
        if (hash.includes('sync_data=')) {
          try {
            const encoded = hash.split('sync_data=')[1]?.split('&')[0];
            if (encoded && encoded.length < 50000) {
              const jsonStr = decodeURIComponent(atob(encoded));
              const parsed = JSON.parse(jsonStr);
              dataService.applyFullStateSnapshot(parsed);
              showToast('Đã đồng bộ toàn bộ dữ liệu từ Admin!', undefined, 'success');
            }
          } catch (e) {
            console.warn('Error parsing sync_data:', e);
          }
          try {
            window.history.replaceState(null, '', window.location.pathname + '#store');
          } catch {}
        }

        // 1. If on dedicated admin domain -> ALWAYS remain in admin app
        if (host.includes('admin-code-game-shop') || host.startsWith('admin.')) {
          setCurrentTab('admin');
          return;
        }

        // 2. Admin routes on client domain or localhost
        const isAdminHash = ADMIN_HASH_PREFIXES.some((p) => hashLower.startsWith(p));
        if (isAdminHash || window.location.pathname.toLowerCase().startsWith('/admin')) {
          setCurrentTab('admin');
          return;
        }

        // 3. Deep link hashes / query params have top priority over static pathname
        const prodId =
          urlParams.get('product') ||
          urlParams.get('prod') ||
          (hashLower.includes('product=') ? hash.split(/product=/i)[1]?.split('&')[0] : null) ||
          (hashLower.includes('prod=') ? hash.split(/prod=/i)[1]?.split('&')[0] : null);

        const gwId =
          urlParams.get('gw') ||
          urlParams.get('giveaway') ||
          (hashLower.includes('gw=') ? hash.split(/gw=/i)[1]?.split('&')[0] : null) ||
          (hashLower.includes('giveaway=') ? hash.split(/giveaway=/i)[1]?.split('&')[0] : null);

        const utilityId =
          urlParams.get('utility') ||
          urlParams.get('ut') ||
          (hashLower.includes('utility=') ? hash.split(/utility=/i)[1]?.split('&')[0] : null) ||
          (hashLower.includes('ut=') ? hash.split(/ut=/i)[1]?.split('&')[0] : null);

        if (prodId) {
          setCurrentTab('store');
          const storeProducts = dataService.getStoreProducts();
          const grouped = groupStoreProductsByGame(storeProducts);
          const found = grouped.find(
            (p) => p.id === prodId || p.id.toLowerCase() === prodId.toLowerCase() || (p.packages && p.packages.some((pkg) => pkg.id.toLowerCase() === prodId.toLowerCase()))
          ) || storeProducts.find(
            (p) => p.id === prodId || p.id.toLowerCase() === prodId.toLowerCase()
          );
          if (found) {
            setSelectedProduct(found);
          }
          return;
        } else if (utilityId) {
          setCurrentTab('utilities');
          setSelectedUtilityId(utilityId);
          return;
        } else if (gwId) {
          setCurrentTab('giveaways');
          setInitialGiveawayId(gwId);
          return;
        } else if (hashLower === '#news' || hashLower.startsWith('#news')) {
          setCurrentTab('news');
          const nSlug = hash.includes('news/') ? hash.split(/news\//i)[1]?.split('&')[0] : null;
          if (nSlug) setInitialNewsSlug(nSlug);
          return;
        } else if (hashLower === '#giveaways' || hashLower.startsWith('#giveaways')) {
          setCurrentTab('giveaways');
          const hashGwId = hash.includes('gw=') ? hash.split(/gw=/i)[1]?.split('&')[0] : null;
          if (hashGwId) setInitialGiveawayId(hashGwId);
          return;
        } else if (hashLower === '#store' || hashLower.startsWith('#store')) {
          setCurrentTab('store');
          return;
        } else if (hashLower === '#utilities' || hashLower.startsWith('#utilities')) {
          setCurrentTab('utilities');
          return;
        } else if (hashLower === '#catalog' || hashLower.startsWith('#catalog')) {
          setCurrentTab('catalog');
          return;
        } else if (hashLower.includes('g=') || urlParams.get('g') || urlParams.get('game')) {
          const slug = urlParams.get('g') || urlParams.get('game') || hash.split(/g=/i)[1]?.split('&')[0];
          if (slug) {
            const game = await dataService.getGameBySlug(slug);
            if (game) {
              setSelectedGame(game);
              setCurrentTab('catalog');
              return;
            }
          }
        }

        // 4. Pathname Routes (/game/:slug, /g/:slug, /news, /giveaways, /store, /utilities) from Google or Shared Links
        const pathname = window.location.pathname.toLowerCase();
        if (pathname.startsWith('/game/') || pathname.startsWith('/g/')) {
          const pathSlug = window.location.pathname.replace(/^\/(?:game|g)\//i, '').replace(/\/$/, '').trim();
          if (pathSlug) {
            setCurrentTab('catalog');
            const game = await dataService.getGameBySlug(pathSlug, false);
            if (game) {
              setSelectedGame(game);
              setGames((prev) =>
                prev.map((g) =>
                  g.slug === game.slug || g.id === game.id
                    ? { ...g, codes_count: game.codes_count, codes: (game.codes || []).slice(0, 3) }
                    : g
                )
              );
              return;
            }
          }
        } else if (pathname === '/news' || pathname.startsWith('/news/')) {
          setCurrentTab('news');
          const nSlug = window.location.pathname.replace(/^\/news\//i, '').replace(/\/$/, '').trim();
          if (nSlug) setInitialNewsSlug(nSlug);
          return;
        } else if (pathname === '/giveaways' || pathname.startsWith('/giveaways/') || pathname === '/giveaway' || pathname.startsWith('/giveaway/')) {
          setCurrentTab('giveaways');
          const pGwId = window.location.pathname.replace(/^\/(?:giveaways|giveaway)\/?/i, '').split('/')[0].trim();
          if (pGwId) setInitialGiveawayId(pGwId);
          return;
        } else if (pathname === '/store' || pathname.startsWith('/store/')) {
          setCurrentTab('store');
          return;
        } else if (pathname === '/utilities' || pathname.startsWith('/utilities/')) {
          setCurrentTab('utilities');
          return;
        } else if (pathname === '/nhiem-vu' || pathname.startsWith('/nhiem-vu/') || pathname === '/missions' || pathname.startsWith('/missions/')) {
          setCurrentTab('missions');
          const mId = window.location.pathname.replace(/^\/(?:nhiem-vu|missions)\/?/i, '').split('/')[0].trim();
          if (mId) setInitialMissionId(mId);
          return;
        } else if (!hash || hash === '#' || hash === '#catalog') {
          setCurrentTab('catalog');
        }
      };

      // Resolve deep link route first so UI reflects target page immediately
      await parseHash();
      setIsInitialLoadDone(true);

      setIsLoading(true);
      const bmarks = dataService.getBookmarks();
      setBookmarks(bmarks);
      dataService.getBookmarkedGames(bmarks).then((bList) => setBookmarkedGamesList(bList));
      dataService.getUpcomingGames().then((uList) => {
        if (uList && uList.length > 0) setUpcomingGames(uList);
      });
      const pCfg = dataService.getPaginationConfig();
      setPaginationConfig(pCfg);

      // Lightweight CMS sync to reflect branding & CMS updates immediately (only 4 KB instead of full sync)
      dataService.syncBrandingAndContentOnly().then(() => {
        setBranding(dataService.getWebsiteBranding());
      });

      const res = await dataService.queryGames(
        { search: '', category: 'all', tag: 'all', sortBy: 'release_date', sortOrder: 'desc' },
        1,
        pCfg.pageSize,
        bmarks
      );
      setGames(res.items);
      setAllGamesList(res.items);
      setTotalPages(res.totalPages);
      setTotalResults(res.total);
      setHasMore(res.hasMore);
      if (res.categories && res.categories.length > 0) {
        setCategories(res.categories);
      } else {
        const cats = await dataService.getCategories();
        setCategories(cats);
      }
      setIsLoading(false);
    };

    loadInitialData();

    // Listen to cross-origin snapshot messages from admin panel
    const handleCrossMessage = (event: MessageEvent) => {
      if (event.data?.type === 'WCG_TRANSFER_FULL_STATE' && event.data.payload) {
        dataService.applyFullStateSnapshot(event.data.payload);
        showToast('Đã đồng bộ tức thì toàn bộ dữ liệu từ Admin!', undefined, 'success');
      }
    };
    window.addEventListener('message', handleCrossMessage);

    return () => {
      window.removeEventListener('message', handleCrossMessage);
    };
  }, []);

  // Unified Single-Click Tab Switcher (History pushState routing without hash conflicts)
  const handleSelectTab = useCallback((tab: 'catalog' | 'news' | 'giveaways' | 'store' | 'utilities' | 'missions') => {
    setSelectedGame(null);
    setSelectedProduct(null);
    setSelectedUtilityId(null);
    setCurrentTab(tab);

    const targetPath = tab === 'catalog' ? '/' : tab === 'missions' ? '/nhiem-vu' : `/${tab}`;
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }
  }, []);

  // Sync Dynamic Document Title & Clean URL bar
  useEffect(() => {
    if (currentTab === 'admin') return;

    if (selectedGame) {
      const isWwm = selectedGame.slug === 'where-winds-meet' || selectedGame.slug === 'where-winds-meet-mobile' || selectedGame.slug === 'yen-van-thap-luc-thanh';
      const codeCount = isWwm ? 584 : (selectedGame.codes_count || selectedGame.active_codes_count || selectedGame.codes?.length || 0);
      const countSuffix = codeCount > 0 ? `Nhận ${codeCount} Mã Code ` : '';
      document.title = `Giftcode ${selectedGame.name} Mới Nhất 2026 - ${countSuffix}| CodeGame.shop`;
      if (window.location.pathname !== `/game/${selectedGame.slug}`) {
        window.history.replaceState(null, '', `/game/${selectedGame.slug}`);
      }
    } else {
      // Do not wipe pathname if initial deep-link routing is still parsing
      if (!isInitialLoadDone) return;

      if (window.location.pathname.startsWith('/game/') || window.location.pathname.startsWith('/g/')) {
        window.history.replaceState(null, '', '/');
      }

      if (currentTab === 'news') {
        const path = window.location.pathname;
        if (path.startsWith('/news/') && path.length > 6) {
          // Viewing a specific news article full page: preserve /news/<slug> in address bar!
        } else {
          document.title = 'Tin Tức Game & Sự Kiện Giftcode Mới Nhất 2026 | CodeGame.shop';
          if (path !== '/news' || window.location.hash) {
            window.history.replaceState(null, '', '/news');
          }
        }
      } else if (currentTab === 'giveaways') {
        document.title = 'Sự Kiện Giveaway Game Miễn Phí 2026 | CodeGame.shop';
        if (window.location.pathname !== '/giveaways' || window.location.hash) {
          window.history.replaceState(null, '', '/giveaways');
        }
      } else if (currentTab === 'store') {
        document.title = 'Cửa Hàng Thẻ Game & Robux Giá Rẻ | CodeGame.shop';
        if (window.location.pathname !== '/store' || window.location.hash) {
          window.history.replaceState(null, '', '/store');
        }
      } else if (currentTab === 'utilities') {
        document.title = 'Tiện Ích Nạp Game & Key Bản Quyền | CodeGame.shop';
        if (window.location.pathname !== '/utilities' || window.location.hash) {
          window.history.replaceState(null, '', '/utilities');
        }
      } else if (currentTab === 'missions') {
        document.title = 'Nhiệm Vụ Nhận Quà & Tiền Ví Miễn Phí | CodeGame.shop';
        const normPath = window.location.pathname.replace(/\/$/, '');
        if (normPath !== '/nhiem-vu' || window.location.hash || window.location.pathname.endsWith('/')) {
          window.history.replaceState(null, '', '/nhiem-vu');
        }
      } else {
        document.title = 'CodeGame.shop - Cổng Tra Cứu Giftcode & Game Bản Quyền Hàng Đầu';
        if (window.location.pathname !== '/' || window.location.hash) {
          window.history.replaceState(null, '', '/');
        }
      }
    }
  }, [selectedGame, currentTab, isInitialLoadDone]);

  // Handle browser popstate and hashchange navigation (Back / Forward buttons & anchors)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const host = window.location.hostname.toLowerCase();

      // 0. Dedicated Admin domain or Admin route/hash -> Always stay in Admin!
      const isAdminDomain = host.includes('admin-code-game-shop') || host.startsWith('admin.');
      const isAdminHash = ADMIN_HASH_PREFIXES.some((p) => hash.startsWith(p));
      if (isAdminDomain || path.startsWith('/admin') || isAdminHash) {
        setSelectedGame(null);
        setCurrentTab('admin');
        return;
      }

      // 1. Explicit hash deep links precedence
      if (hash === '#news' || hash.startsWith('#news')) {
        setSelectedGame(null);
        setCurrentTab('news');
        return;
      }
      if (hash === '#giveaways' || hash.startsWith('#giveaways') || hash.includes('gw=') || hash.includes('giveaway=')) {
        setSelectedGame(null);
        setCurrentTab('giveaways');
        const popGwId = hash.includes('gw=')
          ? hash.split(/gw=/i)[1]?.split('&')[0]
          : hash.includes('giveaway=')
          ? hash.split(/giveaway=/i)[1]?.split('&')[0]
          : null;
        if (popGwId) setInitialGiveawayId(popGwId);
        return;
      }
      if (hash === '#store' || hash.startsWith('#store') || hash.includes('product=')) {
        setSelectedGame(null);
        setCurrentTab('store');
        return;
      }
      if (hash === '#utilities' || hash.startsWith('#utilities') || hash.includes('utility=')) {
        setSelectedGame(null);
        setCurrentTab('utilities');
        return;
      }
      if (hash === '#missions' || hash.startsWith('#missions') || hash === '#nhiem-vu' || hash.startsWith('#nhiem-vu')) {
        setSelectedGame(null);
        setCurrentTab('missions');
        return;
      }

      // 2. Pathname routes
      if (path.startsWith('/game/') || path.startsWith('/g/')) {
        const pathSlug = window.location.pathname.replace(/^\/(?:game|g)\//i, '').replace(/\/$/, '').trim();
        if (pathSlug) {
          dataService.getGameBySlug(pathSlug).then((g) => {
            if (g) {
              setSelectedGame(g);
              setCurrentTab('catalog');
            }
          });
        }
      } else if (path === '/news' || path.startsWith('/news/')) {
        setSelectedGame(null);
        setCurrentTab('news');
        const nSlug = path.replace(/^\/news\//i, '').replace(/\/$/, '').trim();
        setInitialNewsSlug(nSlug || null);
      } else if (path === '/giveaways' || path.startsWith('/giveaways/') || path === '/giveaway' || path.startsWith('/giveaway/')) {
        setSelectedGame(null);
        setCurrentTab('giveaways');
        const pGwId = window.location.pathname.replace(/^\/(?:giveaways|giveaway)\/?/i, '').split('/')[0].trim();
        if (pGwId) setInitialGiveawayId(pGwId);
      } else if (path === '/store' || path.startsWith('/store/')) {
        setSelectedGame(null);
        setCurrentTab('store');
      } else if (path === '/utilities' || path.startsWith('/utilities/')) {
        setSelectedGame(null);
        setCurrentTab('utilities');
      } else if (path === '/missions' || path.startsWith('/missions/') || path === '/nhiem-vu' || path.startsWith('/nhiem-vu/')) {
        setSelectedGame(null);
        setCurrentTab('missions');
      } else if (path === '/' || path === '') {
        setSelectedGame(null);
        setCurrentTab('catalog');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const searchDebounceTimerRef = useRef<any>(null);

  // Sync Search Query with Filter (P4: 300ms Debounce to prevent server hammering)
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (currentTab !== 'catalog') {
      handleSelectTab('catalog');
    }
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    // Instant clear when emptied, otherwise debounce 300ms
    if (!q || !q.trim()) {
      startTransition(() => {
        setFilter((prev) => ({ ...prev, search: '' }));
        setCurrentPage(1);
      });
    } else {
      searchDebounceTimerRef.current = setTimeout(() => {
        startTransition(() => {
          setFilter((prev) => ({ ...prev, search: q }));
          setCurrentPage(1);
        });
      }, 300);
    }
  };

  // Immediate search submit handler for "Xem tất cả kết quả" / Search button / Enter
  const handleExploreOrSubmitSearch = (explicitQuery?: string) => {
    const q = explicitQuery !== undefined ? explicitQuery : searchQuery;
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    setSearchQuery(q);
    startTransition(() => {
      setFilter((prev) => ({ ...prev, search: q }));
      setCurrentPage(1);
    });
    if (currentTab !== 'catalog') {
      handleSelectTab('catalog');
    }
    const target = document.getElementById('game-catalog-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter Updates
  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    startTransition(() => {
      setFilter((prev) => ({ ...prev, ...newFilter }));
      setCurrentPage(1);
    });
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilter({
      search: '',
      category: 'all',
      tag: 'all',
      sortBy: 'release_date',
      sortOrder: 'desc',
    });
    setCurrentPage(1);
  };

  // Keep bookmarkedGamesList synced with bookmarks
  useEffect(() => {
    if (bookmarks.length === 0) {
      setBookmarkedGamesList([]);
      return;
    }
    dataService.getBookmarkedGames(bookmarks).then((list) => {
      setBookmarkedGamesList(list);
    });
  }, [bookmarks]);

  // Query Execution for Catalog Tab
  useEffect(() => {
    if (currentTab !== 'catalog') return;
    if (!isInitialLoadDone) return;
    let isCancelled = false;

    const executeQuery = async () => {
      // Only show CyberLoader on initial blank state to prevent full-screen unmount flicker
      setGames((prev) => {
        if (prev.length === 0) {
          setIsLoading(true);
        }
        return prev;
      });

      try {
        const res = await dataService.queryGames(filter, 1, paginationConfig.pageSize, bookmarks);
        if (!isCancelled && res) {
          setGames(res.items || []);
          setCurrentPage(1);
          setTotalPages(res.totalPages || 1);
          setTotalResults(res.total || 0);
          setHasMore(Boolean(res.hasMore));
          if (res.categories && res.categories.length > 0) {
            setCategories(res.categories);
          }
        }
      } catch (err) {
        console.error('[App] executeQuery error, fallback to client dataset:', err);
        const fallbackList = dataService.getGames();
        if (!isCancelled && fallbackList.length > 0) {
          setGames(fallbackList.slice(0, paginationConfig.pageSize));
          setTotalResults(fallbackList.length);
          setTotalPages(Math.ceil(fallbackList.length / paginationConfig.pageSize));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    executeQuery();
    return () => {
      isCancelled = true;
    };
  }, [filter, currentTab, paginationConfig.mode, paginationConfig.pageSize]);

  // Safety Watchdog: Guarantee CyberLoader never hangs indefinitely under any network condition
  useEffect(() => {
    if (!isLoading) return;
    const watchdogTimer = setTimeout(() => {
      console.warn('[App] Watchdog: Force clearing CyberLoader after 2500ms to guarantee instant interactivity');
      setIsLoading(false);
      setGames((prev) => {
        if (prev.length === 0) {
          const fallbackList = dataService.getGames();
          return fallbackList.slice(0, paginationConfig.pageSize);
        }
        return prev;
      });
    }, 2500);

    return () => clearTimeout(watchdogTimer);
  }, [isLoading, paginationConfig.pageSize]);

  // Infinite Scroll: Load Next Page
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || paginationConfig.mode !== 'infinite') return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const res = await dataService.queryGames(filter, nextPage, paginationConfig.pageSize, bookmarks);
    if (res.items && res.items.length > 0) {
      setGames((prev) => {
        const seen = new Set(prev.map((g) => g.id || g.slug));
        const unique = res.items.filter((g) => !seen.has(g.id || g.slug));
        return [...prev, ...unique];
      });
      setCurrentPage(nextPage);
      setTotalPages(res.totalPages);
      setTotalResults(res.total);
      setHasMore(res.hasMore);
    } else {
      setHasMore(false);
    }
    setIsLoadingMore(false);
  }, [currentPage, filter, bookmarks, hasMore, isLoadingMore, paginationConfig]);

  // Manual Page Change (Classic numbered pagination / jump)
  const handlePageChange = useCallback(async (p: number) => {
    setCurrentPage(p);
    const res = await dataService.queryGames(filter, p, paginationConfig.pageSize, bookmarks);
    setGames(res.items);
    setCurrentPage(p);
    setTotalPages(res.totalPages);
    setTotalResults(res.total);
    setHasMore(res.hasMore);
    const section = document.getElementById('game-catalog-section');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 400, behavior: 'smooth' });
  }, [filter, bookmarks, paginationConfig.pageSize]);

  // Real-time Data Sync Subscription (Reflect Admin updates instantly without CPU loops)
  useEffect(() => {
    const unsubscribe = dataService.subscribe(async () => {
      const cats = await dataService.getCategories();
      setCategories((prev) => {
        if (prev.length === cats.length && prev.every((c, i) => c.id === cats[i]?.id)) return prev;
        return cats;
      });

      const newBranding = dataService.getWebsiteBranding();
      setBranding((prev) => {
        if (
          prev.logoUrl === newBranding.logoUrl &&
          prev.avatarUrl === newBranding.avatarUrl &&
          prev.siteTitle === newBranding.siteTitle &&
          prev.backgroundUrl === newBranding.backgroundUrl
        ) {
          return prev;
        }
        return newBranding;
      });

      const newPagination = dataService.getPaginationConfig();
      setPaginationConfig((prev) => {
        if (prev.mode === newPagination.mode && prev.pageSize === newPagination.pageSize) {
          return prev;
        }
        return newPagination;
      });

      const u = dataService.getCurrentUser();
      setCurrentUser((prev) => {
        if (!prev && !u) return null;
        if (!prev && u) return u;
        if (prev && !u) return null;
        if (prev && u) {
          if (
            prev.wallet_balance !== u.wallet_balance ||
            prev.id !== u.id ||
            prev.role !== u.role ||
            prev.displayName !== u.displayName
          ) {
            return u;
          }
          return prev;
        }
        return prev;
      });

      if (currentTab === 'catalog') {
        const res = await dataService.queryGames(filter, currentPage, paginationConfig.pageSize, bookmarks);
        setGames(res.items);
        setTotalPages(res.totalPages);
        setTotalResults(res.total);
        setHasMore(res.hasMore);
      }
    });
    return () => unsubscribe();
  }, [filter, bookmarks, currentTab, currentPage, paginationConfig.pageSize]);

  // Gentle Event-Driven User Balance Refresh
  useEffect(() => {
    const syncUser = () => {
      if (document.visibilityState !== 'visible') return;
      dataService.refreshCurrentUserBalance().then(() => {
        const u = dataService.getCurrentUser();
        setCurrentUser((prev) => {
          if (!prev && !u) return null;
          if (!prev && u) return u;
          if (prev && !u) return null;
          if (prev && u) {
            if (prev.wallet_balance !== u.wallet_balance || prev.id !== u.id || prev.role !== u.role) {
              return u;
            }
            return prev;
          }
          return prev;
        });
      });
    };

    // 1. Initial refresh on mount
    syncUser();

    // 1.1. Quick 2s check to immediately reconcile any async local storage on load
    const quickTimer = setTimeout(syncUser, 2000);

    // 2. Gentle polling every 30 seconds ONLY when tab is visible
    const interval = setInterval(syncUser, 30000);

    // 3. Sync on tab focus / visibility
    window.addEventListener('focus', syncUser);
    document.addEventListener('visibilitychange', syncUser);

    return () => {
      clearTimeout(quickTimer);
      clearInterval(interval);
      window.removeEventListener('focus', syncUser);
      document.removeEventListener('visibilitychange', syncUser);
    };
  }, []);

  // Dynamically update favicon & browser tab title from branding
  useEffect(() => {
    if (branding.avatarUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = branding.avatarUrl;
    }
    const rawTitle = branding.siteTitle?.trim();
    const cleanTitle =
      rawTitle && rawTitle.toUpperCase() !== 'WEB CODE GAME' && rawTitle.toUpperCase() !== 'WEB CODE'
        ? rawTitle
        : 'CodeGame.Shop';
    document.title = `${cleanTitle} - Cổng Tra Cứu Giftcode & Tiện Ích Game`;
  }, [branding.avatarUrl, branding.siteTitle]);

  // Real-time listener for CMS content changes (Events, Storage & BroadcastChannel)
  useEffect(() => {
    const handleContentUpdate = () => {
      setBranding(dataService.getWebsiteBranding());
    };
    window.addEventListener('wcg_admin_content_updated', handleContentUpdate);
    window.addEventListener('wcg_admin_data_updated', handleContentUpdate);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('wcg_admin_content')) {
        handleContentUpdate();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('wcg_data_sync');
        bc.onmessage = (event) => {
          const type = event.data?.type || event.data?.key || '';
          if (!type || (typeof type === 'string' && (type.includes('content') || type.includes('branding')))) {
            handleContentUpdate();
          }
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('wcg_admin_content_updated', handleContentUpdate);
      window.removeEventListener('wcg_admin_data_updated', handleContentUpdate);
      window.removeEventListener('storage', handleStorageChange);
      if (bc) bc.close();
    };
  }, []);

  // Bookmarking Handlers
  const handleToggleBookmark = (gameId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = dataService.toggleBookmark(gameId);
    setBookmarks(res.bookmarks);
    showToast(
      res.isBookmarked ? 'Đã lưu vào tủ game!' : 'Đã bỏ lưu game',
      undefined,
      res.isBookmarked ? 'success' : 'info'
    );
  };

  const handleClearAllBookmarks = () => {
    localStorage.removeItem('wcg_bookmarks');
    setBookmarks([]);
    showToast('Đã làm trống tủ game', undefined, 'info');
  };

  // Quick Copy Handler
  const handleQuickCopyCode = (code: string, gameName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    dataService.recordCopyEvent(code, gameName);
    marketingService.recordRealCopy(gameName, '', 1);
    showToast(`Đã sao chép mã code cho ${gameName}!`, code, 'success');
  };

  // Handle Game Selection
  const handleSelectGame = async (game: GameItem) => {
    saveRecentSearch(game.name);
    // 1. Immediately enrich with complete code list from dataService so the modal opens with full codes on the VERY FIRST RENDER
    const localCodes = dataService.getCodesForGame(game);
    const cachedGame = dataService.getCachedServerGame(game.slug);
    const fullCodes = (cachedGame?.codes && cachedGame.codes.length > 0)
      ? cachedGame.codes
      : (localCodes && localCodes.length > (game.codes?.length || 0) ? localCodes : (game.codes || []));

    const usableFullCodes = fullCodes.filter((c: any) => !isCodeExpired(c));
    const initialEnrichedGame: GameItem = {
      ...game,
      codes: fullCodes,
      codes_count: typeof game.codes_count === 'number' ? game.codes_count : usableFullCodes.length,
      active_codes_count: typeof game.active_codes_count === 'number' ? game.active_codes_count : usableFullCodes.length,
      expired_codes_count: fullCodes.length - usableFullCodes.length,
      total_codes_count: fullCodes.length,
      icon_url: game.icon_url || cachedGame?.icon_url || `/game_icons/${game.slug}.webp`,
    };
    setSelectedGame(initialEnrichedGame);

    // 2. Background verify with serverless API without forceFresh bypass unless needed
    const fullGame = await dataService.getGameBySlug(game.slug, false);
    if (fullGame && fullGame.codes) {
      setSelectedGame((prev) => {
        if (!prev || (prev.slug !== game.slug && prev.id !== game.id)) return prev;
        return {
          ...prev,
          ...fullGame,
          icon_url: fullGame.icon_url || prev.icon_url || `/game_icons/${game.slug}.webp`,
        };
      });
      // Synchronize back to games list state so homepage card badge immediately reflects authoritative codes_count!
      setGames((prev) =>
        prev.map((g) =>
          g.slug === fullGame.slug || g.id === fullGame.id
            ? { ...g, codes_count: fullGame.codes_count, codes: (fullGame.codes || []).slice(0, 3) }
            : g
        )
      );
    }
  };

  const handleSelectGameSlug = async (slug: string) => {
    const cachedGame = dataService.getCachedServerGame(slug);
    if (cachedGame && (cachedGame as any).is_full_detail && !cachedGame.is_partial_preview) {
      setSelectedGame(cachedGame);
    }
    const fullGame = await dataService.getGameBySlug(slug, false);
    if (fullGame) {
      setSelectedGame(fullGame);
      setGames((prev) =>
        prev.map((g) =>
          g.slug === fullGame.slug || g.id === fullGame.id
            ? { ...g, codes_count: fullGame.codes_count, codes: (fullGame.codes || []).slice(0, 3) }
            : g
        )
      );
    }
  };

  const handleSelectProductById = (productId: string) => {
    const prods = dataService.getStoreProducts();
    const grouped = groupStoreProductsByGame(prods);
    const found = grouped.find(
      (p) => p.id === productId || p.id.toLowerCase() === productId.toLowerCase() || (p.packages && p.packages.some((pkg) => pkg.id.toLowerCase() === productId.toLowerCase()))
    ) || prods.find((p) => p.id === productId || p.id.toLowerCase() === productId.toLowerCase());
    if (found) {
      setSelectedProduct(found);
    }
  };

  // Share Handlers for Universal Share Modal
  // Share Handlers for Universal Share Modal
  const getShareOrigin = () => {
    if (typeof window === 'undefined') return 'https://codegame.shop';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.origin;
    }
    return 'https://codegame.shop';
  };

  const handleOpenShareGame = (game: GameItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const origin = getShareOrigin();
    const rawIcon = game.icon_url || (game.slug ? `/game_icons/${game.slug}.jpg` : '/og-image.jpg');
    const jpgIcon = rawIcon.replace(/\.webp$/i, '.jpg');
    const fullIcon = jpgIcon.startsWith('http') ? jpgIcon : `${origin}${jpgIcon.startsWith('/') ? jpgIcon : `/${jpgIcon}`}`;
    const codeCount = game.codes_count || game.codes?.length || 0;
    setSharePayload({
      title: `Giftcode ${game.name}`,
      subtitle: game.publisher || 'Nhà phát hành chính thức',
      shareUrl: `${origin}/game/${game.slug}`,
      itemType: 'game',
      imageUrl: fullIcon,
      badge: codeCount > 0 ? `${codeCount} Mã Code` : 'Code Tân Thủ',
    });
  };

  const handleOpenShareGiveaway = (campaign: GiveawayCampaign, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const origin = getShareOrigin();
    let rawIcon = campaign.cover_image_url || campaign.game_icon_url || '';
    if (!rawIcon && campaign.game_slug) {
      const g = allGames.find((x) => x && (x.slug?.toLowerCase() === campaign.game_slug?.toLowerCase() || x.id?.toLowerCase() === campaign.game_slug?.toLowerCase()));
      if (g?.icon_url) rawIcon = g.icon_url;
      else rawIcon = `/game_icons/${campaign.game_slug}.jpg`;
    }
    const jpgIcon = (rawIcon || '/og-image.jpg').replace(/\.webp$/i, '.jpg');
    const fullIcon = jpgIcon.startsWith('http') ? jpgIcon : `${origin}${jpgIcon.startsWith('/') ? jpgIcon : `/${jpgIcon}`}`;

    setSharePayload({
      title: campaign.title,
      subtitle: `Sự kiện săn mã ${campaign.game_name}`,
      shareUrl: `${origin}/giveaways/${campaign.id}`,
      itemType: 'giveaway',
      imageUrl: fullIcon,
      badge: campaign.game_name,
    });
  };

  const handleOpenShareProduct = (product: StoreProduct, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const origin = getShareOrigin();
    let rawIcon = product.image_url || '';
    if (!rawIcon && product.game_slug) {
      const g = allGames.find((x) => x && (x.slug?.toLowerCase() === product.game_slug?.toLowerCase() || x.id?.toLowerCase() === product.game_slug?.toLowerCase()));
      if (g?.icon_url) rawIcon = g.icon_url;
      else rawIcon = `/game_icons/${product.game_slug}.jpg`;
    }
    const jpgIcon = (rawIcon || '/og-image.jpg').replace(/\.webp$/i, '.jpg');
    const fullIcon = jpgIcon.startsWith('http') ? jpgIcon : `${origin}${jpgIcon.startsWith('/') ? jpgIcon : `/${jpgIcon}`}`;

    setSharePayload({
      title: product.title,
      subtitle: `${product.game_name} • Giảm ${product.discount_percent}%`,
      shareUrl: `${origin}/store#product=${product.id}`,
      itemType: 'product',
      imageUrl: fullIcon,
      badge: `${product.game_name} -${product.discount_percent}%`,
    });
  };

  const handleOpenShareUtility = (utility: UtilityProduct, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const origin = getShareOrigin();
    const rawIcon = utility.image_url || utility.icon || '/og-image.jpg';
    const fullIcon = rawIcon.startsWith('http') ? rawIcon : `${origin}${rawIcon.startsWith('/') ? rawIcon : `/${rawIcon}`}`;

    setSharePayload({
      title: utility.title,
      subtitle: `${utility.category_label || utility.category} • Giảm ${utility.discount_percent}%`,
      shareUrl: `${origin}/utilities#utility=${utility.id}`,
      itemType: 'utility',
      imageUrl: fullIcon,
      badge: `${utility.category_label || utility.category}`,
    });
  };

  const handleBannerNavigate = (link: string, targetType?: string, targetId?: string) => {
    if (targetType === 'GIVEAWAY' || targetType === 'giveaway' || link.startsWith('/giveaways') || link.startsWith('/giveaway')) {
      handleSelectTab('giveaways');
      if (targetId) {
        setInitialGiveawayId(targetId);
      }
      return;
    }
    if (targetType === 'FLASH_SALE_PRODUCT' || targetType === 'product' || targetType === 'utility' || link.startsWith('/utilities')) {
      handleSelectTab('utilities');
      if (targetId) {
        setSelectedUtilityId(targetId);
      }
      return;
    }
    if (link.startsWith('/store')) {
      handleSelectTab('store');
      if (targetId) {
        handleSelectProductById(targetId);
      }
      return;
    }
    if (link.startsWith('/game/')) {
      const slug = link.replace('/game/', '').trim();
      if (slug) {
        handleSelectGameSlug(slug);
      }
      return;
    }
    if (link.startsWith('http')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    showToast('Đã đăng xuất tài khoản an toàn', undefined, 'info');
  };

  if (currentTab === 'admin') {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-white">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium">Đang tải Admin Panel...</p>
          </div>
        }
      >
        <AdminApp
          onBackToClient={() => {
            const isDedicatedAdmin = typeof window !== 'undefined' && window.location.hostname.includes('admin-code-game-shop');
            if (isDedicatedAdmin) {
              const newWin = window.open('https://web-code-game.pages.dev', '_blank');
              if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
                window.location.href = 'https://web-code-game.pages.dev';
              }
            } else {
              if (window.location.pathname.toLowerCase().startsWith('/admin')) {
                window.location.href = '/store';
              } else {
                handleSelectTab('store');
              }
            }
          }}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative text-foreground selection:bg-primary selection:text-white overflow-x-clip w-full max-w-full box-border">
      {/* Dynamic Background Wallpaper Container (Layered between base and content) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Base dark/light background */}
        <div className="absolute inset-0 bg-background" />

        {/* Dynamic Wallpaper Image Layer */}
        {branding.backgroundUrl && (
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              branding.backgroundStyle === 'ambient'
                ? 'bg-cover bg-center blur-xl scale-105'
                : branding.backgroundStyle === 'cover'
                ? 'bg-cover bg-center'
                : branding.backgroundStyle === 'pattern'
                ? 'bg-repeat'
                : 'bg-cover bg-top'
            }`}
            style={{
              backgroundImage: `url(${branding.backgroundUrl})`,
              opacity: branding.backgroundOpacity ?? 0.35,
            }}
          />
        )}

        {/* Ambient Top Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main App Content (relative z-10) */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-full">
        {/* Dynamic Announcement Banner from Admin CMS */}
        <AnnouncementBar />

        {/* Top Sticky Event Countdown Banner */}
        <TopEventBanner onNavigate={handleBannerNavigate} />

        {/* Top Navigation Bar */}
        <Header
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          allGames={allGamesList}
          onSelectGame={handleSelectGame}
          branding={branding}
          bookmarkCount={bookmarks.length}
          onOpenBookmarks={() => setIsBookmarkDrawerOpen(true)}
          onOpenSubmitCode={() => setIsSubmitModalOpen(true)}
          onOpenPlayground={() => {
            if (!isGrowthEnabled) return;
            setGrowthInitialTab('wheel');
            setIsGrowthCenterOpen(true);
          }}
          onOpenDownloadApp={() => setIsDownloadModalOpen(true)}
          onOpenNotificationModal={() => setIsEmailModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onOpenReceivedCodes={handleOpenReceivedCodes}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />

        {/* Sticky Floating Search Bar for Catalog on Scroll */}
        {currentTab === 'catalog' && (
          <div
            className={`fixed top-14 sm:top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border shadow-xl shadow-black/25 py-2 sm:py-2.5 transition-all duration-300 ease-in-out ${
              isStickySearchVisible && !isMobileSearchActive
                ? 'translate-y-0 opacity-100 pointer-events-auto'
                : '-translate-y-4 opacity-0 pointer-events-none'
            }`}
          >
            <div className="max-w-3xl mx-auto px-3 sm:px-6 flex items-center gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <SearchAutocomplete
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  onSelectGame={handleSelectGame}
                  onShowToast={showToast}
                  isActive={isStickySearchVisible}
                  isFloating={true}
                  placeholder="Tìm nhanh tên game, giftcode mới nhất..."
                  onExploreClick={handleExploreOrSubmitSearch}
                />
              </div>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Cuộn lên đầu trang"
                aria-label="Cuộn lên đầu trang"
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                <ArrowUp className="w-4 h-4 text-primary-light" />
                <span className="hidden sm:inline">Lên đầu</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {currentTab === 'catalog' && (
            <>
              <HeroBanner
                totalGames={totalResults || 529}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onSelectGame={handleSelectGame}
                onShowToast={showToast}
                onSelectQuickTag={(tag) => {
                  saveRecentSearch(tag);
                  handleSearchChange(tag);
                }}
                onExploreClick={handleExploreOrSubmitSearch}
                isFloatingActive={isStickySearchVisible}
              />

              <div id="game-catalog-section" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-8">
                {/* 1. Khối Game Bạn Đang Theo Dõi (Pinned Games Bar) */}
                <PinnedGamesBar
                  bookmarks={bookmarks}
                  bookmarkedGames={bookmarkedGamesList}
                  upcomingGames={upcomingGames}
                  onToggleBookmark={handleToggleBookmark}
                  onSelectGame={handleSelectGame}
                  onSelectUpcomingGame={(game) => {
                    setSelectedUpcomingSlug(game ? (game.slug || game.id) : null);
                    setIsAllUpcomingModalOpen(true);
                  }}
                  onClearAll={handleClearAllBookmarks}
                  onOpenBookmarksDrawer={() => setIsBookmarkDrawerOpen(true)}
                  onScrollToUpcoming={() => {
                    const elem = document.getElementById('upcoming-games-banner-section');
                    elem?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />

                {/* 2. Khối Game Sắp Ra Mắt (Upcoming Games Banner) */}
                <div id="upcoming-games-banner-section">
                  <UpcomingGamesBanner
                    upcomingGames={upcomingGames}
                    bookmarkedSlugs={bookmarks}
                    onToggleBookmark={handleToggleBookmark}
                    onOpenAllUpcomingModal={() => {
                      setSelectedUpcomingSlug(null);
                      setIsAllUpcomingModalOpen(true);
                    }}
                    onSelectUpcomingGame={(game) => {
                      setSelectedUpcomingSlug(game ? (game.slug || game.id) : null);
                      setIsAllUpcomingModalOpen(true);
                    }}
                    onShowToast={showToast}
                  />
                </div>

                <CategoryFilter
                  filter={filter}
                  onFilterChange={handleFilterChange}
                  categories={categories}
                  totalResults={totalResults}
                />

                {isLoading ? (
                  <div className="py-2 w-full">
                    <GameGridSkeleton count={24} viewMode="compact" />
                  </div>
                ) : (
                  <GameGrid
                    games={games}
                    total={totalResults}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    bookmarks={bookmarks}
                    onToggleBookmark={handleToggleBookmark}
                    onSelectGame={handleSelectGame}
                    onQuickCopyCode={handleQuickCopyCode}
                    onResetFilters={handleResetFilters}
                    onShareGame={handleOpenShareGame}
                    onShowToast={showToast}
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={handleLoadMore}
                    useInfiniteScroll={paginationConfig.mode === 'infinite'}
                  />
                )}
              </div>
            </>
          )}

          <Suspense fallback={<div className="py-20 flex justify-center"><CyberLoader title="ĐANG TẢI GIAO DIỆN..." subText="Đang nạp dữ liệu..." /></div>}>
            {currentTab === 'news' && (
              <NewsView
                onShowToast={showToast}
                onSelectGameSlug={handleSelectGameSlug}
                initialArticleSlug={initialNewsSlug}
              />
            )}

            {currentTab === 'giveaways' && (
              <GiveawaysView
                onShowToast={showToast}
                onSelectGameSlug={handleSelectGameSlug}
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onShareGiveaway={handleOpenShareGiveaway}
                initialGiveawayId={initialGiveawayId}
                onClearInitialGiveawayId={() => setInitialGiveawayId(null)}
              />
            )}

            {currentTab === 'store' && (
              <StoreView
                onSelectProduct={(prod) => setSelectedProduct(prod)}
                onShowToast={showToast}
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onOpenShare={handleOpenShareProduct}
              />
            )}

            {currentTab === 'utilities' && (
              <UtilitiesView
                onShowToast={showToast}
                currentUser={currentUser}
                onUpdateUser={handleUpdateUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onOpenShare={handleOpenShareUtility}
                onOpenWallet={() => setIsWalletModalOpen(true)}
                selectedUtilityId={selectedUtilityId}
                onClearSelectedUtility={() => setSelectedUtilityId(null)}
              />
            )}

            {currentTab === 'missions' && (
              <MissionsView
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onOpenWallet={() => setIsWalletModalOpen(true)}
                initialMissionId={initialMissionId}
              />
            )}
          </Suspense>
        </main>

        {/* Footer */}
        <Footer
          categories={categories}
          onSelectCategory={(cat) => {
            handleSelectTab('catalog');
            handleFilterChange({ category: cat });
            const gridElem = document.getElementById('game-catalog-section');
            gridElem?.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenDownloadApp={() => setIsDownloadModalOpen(true)}
        />

        {/* Mobile Sticky Bottom Navigation Dock */}
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          onOpenReceivedCodes={handleOpenReceivedCodes}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          currentUser={currentUser}
        />
      </div>

      {/* Modals & Drawers (P4: Lazy loaded via Suspense to keep main bundle tiny) */}
      <Suspense fallback={null}>
        {selectedGame && (
          <GameDetailModal
            game={selectedGame}
            onClose={() => {
              setSelectedGame(null);
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/game/')) {
                window.history.replaceState(null, '', '/');
              }
            }}
            isBookmarked={
              bookmarks.includes(selectedGame.id) || bookmarks.includes(selectedGame.slug)
            }
            onToggleBookmark={(id) => handleToggleBookmark(id)}
            onOpenShare={(g) => handleOpenShareGame(g)}
            onShowToast={showToast}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        <ShareModal
          isOpen={Boolean(sharePayload)}
          onClose={() => setSharePayload(null)}
          title={sharePayload?.title || ''}
          subtitle={sharePayload?.subtitle}
          shareUrl={sharePayload?.shareUrl || ''}
          itemType={sharePayload?.itemType || 'game'}
          imageUrl={sharePayload?.imageUrl}
          badge={sharePayload?.badge}
          onShowToast={showToast}
        />

        <ProductDetailModal
          product={selectedProduct}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenShare={handleOpenShareProduct}
          onClose={() => setSelectedProduct(null)}
          onShowToast={showToast}
          onBuyNow={(prod, pkg, qty) => {
            setSelectedProduct(null);
            if (!currentUser) {
              setIsAuthModalOpen(true);
            } else {
              setCheckoutProduct(prod);
              setCheckoutPackage(pkg || null);
              setCheckoutQuantity(qty || 1);
            }
          }}
        />

        <ProductCheckoutModal
          product={checkoutProduct}
          selectedPackage={checkoutPackage}
          initialQuantity={checkoutQuantity}
          currentUser={currentUser}
          onUpdateUser={handleUpdateUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onClose={() => {
            setCheckoutProduct(null);
            setCheckoutPackage(null);
          }}
          onShowToast={showToast}
        />

        <SubmitCodeModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          games={allGamesList}
          onSuccess={(_slug, code) => {
            showToast('Đóng góp mã code thành công!', `Mã ${code} đã được nạp vào hệ thống.`, 'success');
            handleFilterChange({});
          }}
        />

        <BookmarkDrawer
          isOpen={isBookmarkDrawerOpen}
          onClose={() => setIsBookmarkDrawerOpen(false)}
          bookmarkedGames={bookmarkedGamesList}
          onRemoveBookmark={(id) => handleToggleBookmark(id)}
          onSelectGame={handleSelectGame}
          onClearAll={handleClearAllBookmarks}
        />

        <AllUpcomingGamesModal
          isOpen={isAllUpcomingModalOpen}
          onClose={() => {
            setIsAllUpcomingModalOpen(false);
            setSelectedUpcomingSlug(null);
          }}
          upcomingGames={upcomingGames}
          bookmarkedSlugs={bookmarks}
          onToggleBookmark={handleToggleBookmark}
          onShowToast={showToast}
          initialSelectedSlug={selectedUpcomingSlug}
        />

        <CodePlaygroundModal
          isOpen={isPlaygroundModalOpen}
          onClose={() => setIsPlaygroundModalOpen(false)}
          games={allGamesList}
          onSelectGame={handleSelectGame}
          onShowToast={showToast}
        />

        {isGrowthEnabled && (
          <GrowthCenterModal
            isOpen={isGrowthCenterOpen}
            onClose={() => setIsGrowthCenterOpen(false)}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenWallet={() => setIsWalletModalOpen(true)}
            onShowToast={showToast}
            initialTab={growthInitialTab}
          />
        )}

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleUpdateUser}
          onShowToast={showToast}
        />

        <UserWalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          user={currentUser}
          onUpdateUser={handleUpdateUser}
          onShowToast={showToast}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        <MyReceivedCodesModal
          isOpen={isReceivedCodesOpen}
          initialTab={receivedCodesInitialTab}
          onClose={() => setIsReceivedCodesOpen(false)}
          onShowToast={showToast}
          onNavigateToMissions={() => {
            setIsReceivedCodesOpen(false);
            setCurrentTab('missions');
          }}
          onOpenAuth={() => {
            setIsReceivedCodesOpen(false);
            setIsAuthModalOpen(true);
          }}
        />

        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateUser={handleUpdateUser}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onOpenReceivedCodes={handleOpenReceivedCodes}
          onLogout={handleLogout}
          onShowToast={showToast}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />

        <DownloadAppModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
        />

        {/* Email Subscription & Notification Preferences Modal (2 Cột: Bảng 1 Code Mới & Chia Sẻ, Bảng 2 Đăng Ký) */}
        {isEmailModalOpen && (
          <EmailSubscriptionModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            currentUser={currentUser}
            bookmarks={bookmarks}
            bookmarkedGames={bookmarkedGamesList}
            upcomingGames={upcomingGames}
            onToggleBookmark={(slug) => handleToggleBookmark(slug)}
            onSelectGame={(game) => {
              setIsEmailModalOpen(false);
              handleSelectGame(game);
            }}
            onShowToast={showToast}
          />
        )}
      </Suspense>

      {/* Social Proof Marketing Notifications Toast (Customer Web tabs) */}
      <Suspense fallback={null}>
        <MarketingNotificationToast
          onSelectGameSlug={handleSelectGameSlug}
          onSelectProduct={handleSelectProductById}
          onSelectUtility={(utilityId) => {
            handleSelectTab('utilities');
            setSelectedUtilityId(utilityId);
            window.location.hash = `#utility=${utilityId}`;
          }}
          onSelectGiveaway={(giveawayId) => {
            handleSelectTab('giveaways');
            window.location.hash = `#gw=${giveawayId}`;
          }}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onExploreClick={handleExploreOrSubmitSearch}
        />

        {/* Floating Announcement (Configured via Admin) */}
        {currentTab !== 'admin' && (
          <FloatingAnnouncement onNavigateTab={(tab) => handleSelectTab(tab as any)} />
        )}
      </Suspense>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} maxVisible={3} />
    </div>
  );
};
