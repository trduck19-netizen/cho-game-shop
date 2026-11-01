import React, { useState, useEffect } from 'react';
import {
  Globe,
  Save,
  Bell,
  Megaphone,
  Sparkles,
  LayoutTemplate,
  ShoppingBag,
  PhoneCall,
  Send,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Sliders,
  Gamepad2,
  ShieldCheck,
  Gift,
  Wrench,
  FileText,
  Lock,
  Mail,
  Flame,
  Server,
  Zap,
  BellRing,
} from 'lucide-react';
import { adminDataService } from '../services/adminDataService';
import { ImageUploadInput } from '../components/ui/ImageUploadInput';
import { FloatingNotificationModule } from './FloatingNotificationModule';

interface ContentCMSModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

type SectionTab =
  | 'all'
  | 'pagination'
  | 'hero'
  | 'giveaways'
  | 'store'
  | 'utilities'
  | 'announcement'
  | 'footer'
  | 'legal'
  | 'branding'
  | 'floating';

const isLegacyOrEmpty = (t?: string | null) => {
  if (!t) return true;
  const s = t.trim().toUpperCase();
  return !s || s === 'WEB CODE GAME' || s === 'WEB CODE' || s === 'WEB CODE GAME 2026';
};

export const ContentCMSModule: React.FC<ContentCMSModuleProps> = ({ onShowToast }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SectionTab>('all');

  // ==========================================
  // 0.1 PAGINATION & CATALOG DISPLAY STATE
  // ==========================================
  const [paginationMode, setPaginationMode] = useState<'classic' | 'infinite'>('classic');
  const [gamesPerPage, setGamesPerPage] = useState<number>(24);

  // ==========================================
  // 0. WEBSITE BRANDING & ASSETS STATE
  // ==========================================
  const [siteTitle, setSiteTitle] = useState('CodeGame.Shop');
  const [portalSubtitle, setPortalSubtitle] = useState('Cổng Tra Cứu Giftcode #1');
  const [logoUrl, setLogoUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState<'ambient' | 'cover' | 'pattern' | 'header_only'>('ambient');
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.35);

  // ==========================================
  // 1. ANNOUNCEMENT BAR STATE
  // ==========================================
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementText, setAnnouncementText] = useState(
    '🎁 Sự Kiện Tân Thủ: Đăng ký nhận ngay 50.000đ vào ví trải nghiệm!'
  );
  const [announcementSubtext, setAnnouncementSubtext] = useState(
    'Khuyến mãi nạp đầu tặng 20% giá trị qua cổng SePay MBBank.'
  );

  // ==========================================
  // 2. HERO BANNER (TRANG CHỦ & KHO CODE)
  // ==========================================
  const [heroTitle, setHeroTitle] = useState('Kho Giftcode & Mã Quà Tặng Game');
  const [heroTitleHighlight, setHeroTitleHighlight] = useState('Độc Quyền 2026');
  const [heroBadge, setHeroBadge] = useState('🔥 CẬP NHẬT TỰ ĐỘNG 24/7');
  const [heroSubtitle, setHeroSubtitle] = useState(
    'Tra cứu tức thì hàng nghìn mã code quà tặng mới nhất của hơn 450+ tựa game mobile & PC. Sao chép 1-chạm, kiểm tra trạng thái hoạt động thực tế từ cộng đồng.'
  );

  // ==========================================
  // 3. GIVEAWAYS / SỰ KIỆN GIẬT CODE
  // ==========================================
  const [giveawayTitle, setGiveawayTitle] = useState('Săn Giftcode Độc Quyền Miễn Phí');
  const [giveawayBadge, setGiveawayBadge] = useState('Sự Kiện Giật Code Giới Hạn');
  const [giveawaySubtitle, setGiveawaySubtitle] = useState(
    'Các chiến dịch phát code độc quyền số lượng có hạn tài trợ từ NPH và sự kiện cộng đồng CH Play. Mỗi người nhận được 1 mã duy nhất, kích hoạt ngay trong game.'
  );

  // ==========================================
  // 4. STORE SECTION (CỬA HÀNG VIP)
  // ==========================================
  const [storeTitle, setStoreTitle] = useState('Cửa Hàng Code Chiết Khấu Tới 60%');
  const [storeBadge, setStoreBadge] = useState('Gói Nạp & Giftcode Chiết Khấu Chính Hãng');
  const [storeSubtitle, setStoreSubtitle] = useState(
    'Mã nạp game, thẻ tháng và giftcode sự kiện độc quyền. Nhận mã tự động 100% qua VietQR / Ví số dư.'
  );
  const [storeWarrantyTitle, setStoreWarrantyTitle] = useState('Bảo Hành 100%');
  const [storeWarrantyDesc, setStoreWarrantyDesc] = useState('Đổi trả tức thì nếu mã lỗi');

  // ==========================================
  // 5. UTILITIES SECTION (TIỆN ÍCH & DỊCH VỤ SỐ)
  // ==========================================
  const [utilitiesTitle, setUtilitiesTitle] = useState('Tiện Ích & Dịch Vụ Chính Hãng');
  const [utilitiesBadge, setUtilitiesBadge] = useState('Dịch Vụ Số & Sản Phẩm Ngoài Lề');
  const [utilitiesSubtitle, setUtilitiesSubtitle] = useState(
    'Tài khoản Premium giải trí, key bản quyền phần mềm, Cloud VPS treo game và các công cụ tiện ích số độc quyền. Giao hàng tự động 100%.'
  );
  const [utilitiesWarrantyTitle, setUtilitiesWarrantyTitle] = useState('Bảo Hành 1 Đổi 1');
  const [utilitiesWarrantyDesc, setUtilitiesWarrantyDesc] = useState('Hỗ trợ kỹ thuật 24/7 tức thì');

  // ==========================================
  // 6. FOOTER & BRANDING STATE
  // ==========================================
  const [footerBrandTitle, setFooterBrandTitle] = useState('CodeGame.Shop');
  const [footerLogoUrl, setFooterLogoUrl] = useState('');
  const [footerText, setFooterText] = useState(
    'CodeGame.Shop — Nền tảng tổng hợp và chia sẻ giftcode game mobile & PC hàng đầu Việt Nam. Cập nhật mã quà tặng mới nhất mỗi ngày từ NPH chính thức.'
  );
  const [footerBadge1Text, setFooterBadge1Text] = useState('Cloudflare Pages & D1');
  const [footerBadge1Visible, setFooterBadge1Visible] = useState(true);
  const [footerBadge2Text, setFooterBadge2Text] = useState('24/7 Realtime Sync');
  const [footerBadge2Visible, setFooterBadge2Visible] = useState(true);
  const [telegramUrl, setTelegramUrl] = useState('https://t.me/webcodegame_vn');
  const [zaloUrl, setZaloUrl] = useState('https://zalo.me/0386767888');
  const [hotline, setHotline] = useState('0386.767.888');
  const [supportEmail, setSupportEmail] = useState('hotro@webcodegame.vn');

  // ==========================================
  // 7. LEGAL & POLICIES (ĐIỀU KHOẢN & BẢO MẬT)
  // ==========================================
  const [termsTitle, setTermsTitle] = useState('Điều Khoản Sử Dụng Dịch Vụ');
  const [termsContent, setTermsContent] = useState(
    '1. Quy định chung: Toàn bộ giftcode và mã quà tặng trên website được chia sẻ hoàn toàn miễn phí hoặc từ các đối tác phân phối chính thức.\n2. Người dùng cam kết không sử dụng công cụ tự động spam, phá hoại hoặc lạm dụng tài nguyên hệ thống.\n3. Ban Quản Trị có quyền cập nhật, hiệu chỉnh các điều khoản sử dụng nhằm đảm bảo quyền lợi chung cho cộng đồng game thủ.'
  );
  const [privacyTitle, setPrivacyTitle] = useState('Chính Sách Bảo Mật Quyền Riêng Tư');
  const [privacyContent, setPrivacyContent] = useState(
    '1. Chúng tôi tôn trọng và cam kết bảo vệ thông tin tài khoản và dữ liệu cá nhân của người dùng.\n2. Thông tin số dư và mã giao dịch ví được bảo vệ và lưu trữ mã hóa trên hạ tầng bảo mật Cloudflare Edge Network.\n3. Chúng tôi tuyệt đối không bán hoặc cung cấp thông tin của bạn cho bên thứ ba vì bất kỳ mục đích thương mại nào.'
  );

  useEffect(() => {
    loadCMSData();

    // Fetch fresh content directly from Cloudflare D1 to guarantee latest state without resets
    adminDataService.fetchFreshContentFromCloudflare().then((fresh) => {
      if (fresh && fresh.length > 0) {
        loadCMSData();
      }
    });

    const handleUpdate = () => {
      loadCMSData();
    };

    window.addEventListener('wcg_admin_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('wcg_admin_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const loadCMSData = () => {
    setIsLoading(true);
    const items = adminDataService.getContentItems();

    // 0. Branding & Assets
    const branding = items.find((i) => i.key === 'website_branding');
    const footerItem = items.find((i) => i.key === 'footer_support');
    const footerTitle = footerItem?.extraData?.brandTitle?.trim();
    const footerLogo = footerItem?.extraData?.brandLogo?.trim();

    if (branding) {
      const resolvedTitle = !isLegacyOrEmpty(branding.title)
        ? branding.title.trim()
        : !isLegacyOrEmpty(footerTitle)
        ? footerTitle!
        : 'CodeGame.Shop';
      setSiteTitle(resolvedTitle);

      if (branding.extraData) {
        const effectiveLogo = branding.extraData.logoUrl || (footerLogo && footerLogo !== '/logo.png' ? footerLogo : '');
        setLogoUrl(effectiveLogo);
        setAvatarUrl(branding.extraData.avatarUrl || '');
        setBackgroundUrl(branding.extraData.backgroundUrl || '');
        setBackgroundStyle(branding.extraData.backgroundStyle || 'ambient');
        setBackgroundOpacity(branding.extraData.backgroundOpacity ?? 0.35);
        if (branding.extraData.portalSubtitle !== undefined) {
          setPortalSubtitle(branding.extraData.portalSubtitle);
        }
      }
    } else if (footerTitle) {
      setSiteTitle(footerTitle);
      if (footerLogo && footerLogo !== '/logo.png') {
        setLogoUrl(footerLogo);
      }
    }

    // 0.1 Pagination & Display
    const pag = items.find((i) => i.key === 'catalog_pagination' || i.key === 'pagination_config');
    if (pag && pag.extraData) {
      setPaginationMode(pag.extraData.mode === 'infinite' ? 'infinite' : 'classic');
      setGamesPerPage(Number(pag.extraData.pageSize) || 24);
    } else {
      setPaginationMode('classic');
      setGamesPerPage(24);
    }

    // 1. Announcement
    const ann = items.find((i) => i.key === 'announcement_banner');
    if (ann) {
      setAnnouncementActive(ann.isActive !== false);
      if (ann.title !== undefined) setAnnouncementText(ann.title);
      if (ann.content !== undefined) setAnnouncementSubtext(ann.content);
    }

    // 2. Hero Banner
    const hero = items.find((i) => i.key === 'hero_banner');
    if (hero) {
      if (hero.title !== undefined) setHeroTitle(hero.title);
      if (hero.content !== undefined) setHeroSubtitle(hero.content);
      if (hero.extraData) {
        if (hero.extraData.titleHighlight !== undefined) setHeroTitleHighlight(hero.extraData.titleHighlight);
        if (hero.extraData.badge !== undefined) setHeroBadge(hero.extraData.badge);
      }
    }

    // 3. Giveaways
    const gw = items.find((i) => i.key === 'giveaway_section');
    if (gw) {
      if (gw.title !== undefined) setGiveawayTitle(gw.title);
      if (gw.content !== undefined) setGiveawaySubtitle(gw.content);
      if (gw.extraData && gw.extraData.badge !== undefined) setGiveawayBadge(gw.extraData.badge);
    }

    // 4. Store
    const store = items.find((i) => i.key === 'store_section');
    if (store) {
      if (store.title !== undefined) setStoreTitle(store.title);
      if (store.content !== undefined) setStoreSubtitle(store.content);
      if (store.extraData) {
        if (store.extraData.badge !== undefined) setStoreBadge(store.extraData.badge);
        if (store.extraData.warrantyTitle !== undefined) setStoreWarrantyTitle(store.extraData.warrantyTitle);
        if (store.extraData.warrantyDesc !== undefined) setStoreWarrantyDesc(store.extraData.warrantyDesc);
      }
    }

    // 5. Utilities
    const util = items.find((i) => i.key === 'utilities_section');
    if (util) {
      if (util.title !== undefined) setUtilitiesTitle(util.title);
      if (util.content !== undefined) setUtilitiesSubtitle(util.content);
      if (util.extraData) {
        if (util.extraData.badge !== undefined) setUtilitiesBadge(util.extraData.badge);
        if (util.extraData.warrantyTitle !== undefined) setUtilitiesWarrantyTitle(util.extraData.warrantyTitle);
        if (util.extraData.warrantyDesc !== undefined) setUtilitiesWarrantyDesc(util.extraData.warrantyDesc);
      }
    }

    // 6. Footer & Branding
    const footer = items.find((i) => i.key === 'footer_support');
    if (footer) {
      if (footer.content !== undefined && footer.content.trim()) {
        setFooterText(footer.content);
      } else {
        setFooterText(
          'CodeGame.Shop — Nền tảng tổng hợp và chia sẻ giftcode game mobile & PC hàng đầu Việt Nam. Cập nhật mã quà tặng mới nhất mỗi ngày từ NPH chính thức.'
        );
      }
      if (footer.extraData) {
        if (footer.extraData.brandTitle !== undefined) {
          setFooterBrandTitle(!isLegacyOrEmpty(footer.extraData.brandTitle) ? footer.extraData.brandTitle : 'CodeGame.Shop');
        }
        if (footer.extraData.brandLogo !== undefined) setFooterLogoUrl(footer.extraData.brandLogo);
        if (footer.extraData.badge1Text !== undefined) setFooterBadge1Text(footer.extraData.badge1Text);
        if (footer.extraData.badge1Visible !== undefined) setFooterBadge1Visible(Boolean(footer.extraData.badge1Visible));
        if (footer.extraData.badge2Text !== undefined) setFooterBadge2Text(footer.extraData.badge2Text);
        if (footer.extraData.badge2Visible !== undefined) setFooterBadge2Visible(Boolean(footer.extraData.badge2Visible));
        setTelegramUrl(footer.extraData.telegram || 'https://t.me/webcodegame_vn');
        setZaloUrl(footer.extraData.zalo || 'https://zalo.me/0386767888');
        setHotline(footer.extraData.hotline || '0386.767.888');
        setSupportEmail(footer.extraData.email || 'hotro@webcodegame.vn');
      }
    } else {
      setFooterText(
        'CodeGame.Shop — Nền tảng tổng hợp và chia sẻ giftcode game mobile & PC hàng đầu Việt Nam. Cập nhật mã quà tặng mới nhất mỗi ngày từ NPH chính thức.'
      );
    }

    // 7. Terms & Privacy
    const terms = items.find((i) => i.key === 'terms_of_service');
    if (terms) {
      if (terms.title !== undefined) setTermsTitle(terms.title);
      if (terms.content !== undefined) setTermsContent(terms.content);
    }

    const privacy = items.find((i) => i.key === 'privacy_policy');
    if (privacy) {
      if (privacy.title !== undefined) setPrivacyTitle(privacy.title);
      if (privacy.content !== undefined) setPrivacyContent(privacy.content);
    }

    setIsLoading(false);
  };

  const handleSaveSingleSection = async (sectionKey: string) => {
    setIsSaving(true);
    try {
      switch (sectionKey) {
        case 'pagination':
          adminDataService.savePaginationConfig({
            mode: paginationMode,
            pageSize: gamesPerPage,
          });
          onShowToast(
            'Đã Lưu Cấu Hình Phân Trang!',
            `Cơ chế: ${paginationMode === 'infinite' ? 'Cuộn vô tận tự động tải thêm' : 'Đánh số trang truyền thống'} (${gamesPerPage} game/trang) đã được cập nhật thành công.`,
            'success'
          );
          break;

        case 'branding':
          const currentSiteTitle =
            siteTitle.trim() && siteTitle.trim().toUpperCase() !== 'WEB CODE GAME' && siteTitle.trim().toUpperCase() !== 'WEB CODE'
              ? siteTitle.trim()
              : 'CodeGame.Shop';
          const currentLogoUrl = logoUrl.trim();
          adminDataService.saveContentItem({
            key: 'website_branding',
            title: currentSiteTitle,
            content: 'Thiết lập nhận diện thương hiệu, logo, avatar và hình nền website.',
            isActive: true,
            type: 'BRANDING',
            extraData: {
              logoUrl: currentLogoUrl,
              avatarUrl: avatarUrl.trim(),
              backgroundUrl: backgroundUrl.trim(),
              backgroundStyle,
              backgroundOpacity,
              portalSubtitle: portalSubtitle.trim(),
            },
          });
          // Tự động đồng bộ chân trang nếu chân trang chưa có hoặc đang khớp với tên cũ
          if (!footerBrandTitle || footerBrandTitle === 'WEB CODE GAME' || footerBrandTitle === siteTitle) {
            setFooterBrandTitle(currentSiteTitle);
            if (currentLogoUrl && (!footerLogoUrl || footerLogoUrl === '/logo.png')) {
              setFooterLogoUrl(currentLogoUrl);
            }
            adminDataService.saveContentItem({
              key: 'footer_support',
              title: 'Chân Trang & Hỗ Trợ',
              content: footerText.trim(),
              isActive: true,
              type: 'FOOTER',
              extraData: {
                brandTitle: currentSiteTitle,
                brandLogo: footerLogoUrl.trim() || currentLogoUrl || '/logo.png',
                badge1Text: footerBadge1Text.trim() || 'Cloudflare Pages & D1',
                badge1Visible: footerBadge1Visible,
                badge2Text: footerBadge2Text.trim() || '24/7 Realtime Sync',
                badge2Visible: footerBadge2Visible,
                telegram: telegramUrl.trim(),
                zalo: zaloUrl.trim(),
                hotline: hotline.trim(),
                email: supportEmail.trim(),
              },
            });
          }
          break;

        case 'hero':
          adminDataService.saveContentItem({
            key: 'hero_banner',
            title: heroTitle.trim(),
            content: heroSubtitle.trim(),
            isActive: true,
            type: 'HERO',
            extraData: {
              badge: heroBadge.trim(),
              titleHighlight: heroTitleHighlight.trim(),
            },
          });
          break;

        case 'giveaways':
          adminDataService.saveContentItem({
            key: 'giveaway_section',
            title: giveawayTitle.trim(),
            content: giveawaySubtitle.trim(),
            isActive: true,
            type: 'GIVEAWAY',
            extraData: {
              badge: giveawayBadge.trim(),
            },
          });
          break;

        case 'store':
          adminDataService.saveContentItem({
            key: 'store_section',
            title: storeTitle.trim(),
            content: storeSubtitle.trim(),
            isActive: true,
            type: 'STORE',
            extraData: {
              badge: storeBadge.trim(),
              warrantyTitle: storeWarrantyTitle.trim(),
              warrantyDesc: storeWarrantyDesc.trim(),
            },
          });
          break;

        case 'utilities':
          adminDataService.saveContentItem({
            key: 'utilities_section',
            title: utilitiesTitle.trim(),
            content: utilitiesSubtitle.trim(),
            isActive: true,
            type: 'UTILITIES',
            extraData: {
              badge: utilitiesBadge.trim(),
              warrantyTitle: utilitiesWarrantyTitle.trim(),
              warrantyDesc: utilitiesWarrantyDesc.trim(),
            },
          });
          break;

        case 'announcement':
          adminDataService.saveContentItem({
            key: 'announcement_banner',
            title: announcementText.trim(),
            content: announcementSubtext.trim(),
            isActive: announcementActive,
            type: 'ANNOUNCEMENT',
          });
          break;

        case 'footer':
          const currentFooterTitle = footerBrandTitle.trim() || 'CodeGame.Shop';
          const currentFooterLogo = footerLogoUrl.trim();
          adminDataService.saveContentItem({
            key: 'footer_support',
            title: 'Chân Trang & Hỗ Trợ',
            content: footerText.trim(),
            isActive: true,
            type: 'FOOTER',
            extraData: {
              brandTitle: currentFooterTitle,
              brandLogo: currentFooterLogo,
              badge1Text: footerBadge1Text.trim() || 'Cloudflare Pages & D1',
              badge1Visible: footerBadge1Visible,
              badge2Text: footerBadge2Text.trim() || '24/7 Realtime Sync',
              badge2Visible: footerBadge2Visible,
              telegram: telegramUrl.trim(),
              zalo: zaloUrl.trim(),
              hotline: hotline.trim(),
              email: supportEmail.trim(),
            },
          });
          // Nếu người dùng đổi tên ở Footer mà Branding trên Header chưa đổi, tự động đồng bộ lên Header
          if (!isLegacyOrEmpty(currentFooterTitle) && isLegacyOrEmpty(siteTitle)) {
            setSiteTitle(currentFooterTitle);
            adminDataService.saveContentItem({
              key: 'website_branding',
              title: currentFooterTitle,
              content: 'Thiết lập nhận diện thương hiệu, logo, avatar và hình nền website.',
              isActive: true,
              type: 'BRANDING',
              extraData: {
                logoUrl: logoUrl.trim() || currentFooterLogo,
                avatarUrl: avatarUrl.trim(),
                backgroundUrl: backgroundUrl.trim(),
                backgroundStyle,
                backgroundOpacity,
                portalSubtitle: portalSubtitle.trim(),
              },
            });
          }
          onShowToast('Đã lưu!', 'Cài đặt nội dung chân trang & nhận diện thương hiệu đã được cập nhật thành công.', 'success');
          break;

        case 'legal':
          adminDataService.saveContentItem({
            key: 'terms_of_service',
            title: termsTitle.trim(),
            content: termsContent.trim(),
            isActive: true,
            type: 'TERMS',
          });
          adminDataService.saveContentItem({
            key: 'privacy_policy',
            title: privacyTitle.trim(),
            content: privacyContent.trim(),
            isActive: true,
            type: 'PRIVACY',
          });
          break;
      }

      await adminDataService.syncToCloudflareKV('wcg_admin_content_v4', adminDataService.getContentItems());
      onShowToast('Đã Lưu Thành Công!', 'Nội dung đã được cập nhật và đồng bộ Real-time lên Web Khách.', 'success');
    } catch (err: any) {
      console.error('Error saving CMS section:', err);
      onShowToast('Cảnh Báo Đồng Bộ', 'Đã lưu cục bộ nhưng chưa kết nối được máy chủ Cloudflare: ' + (err?.message || ''), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // 0. Pagination & Display Config
      adminDataService.savePaginationConfig({
        mode: paginationMode,
        pageSize: gamesPerPage,
      });

      // 0.1 Website Branding & Media Assets
      const allSiteTitle =
        siteTitle.trim() && siteTitle.trim().toUpperCase() !== 'WEB CODE GAME' && siteTitle.trim().toUpperCase() !== 'WEB CODE'
          ? siteTitle.trim()
          : 'CodeGame.Shop';
      const allLogoUrl = logoUrl.trim();
      adminDataService.saveContentItem({
        key: 'website_branding',
        title: allSiteTitle,
        content: 'Thiết lập nhận diện thương hiệu, logo, avatar và hình nền website.',
        isActive: true,
        type: 'BRANDING',
        extraData: {
          logoUrl: allLogoUrl,
          avatarUrl: avatarUrl.trim(),
          backgroundUrl: backgroundUrl.trim(),
          backgroundStyle,
          backgroundOpacity,
          portalSubtitle: portalSubtitle.trim(),
        },
      });

      // 1. Announcement
      adminDataService.saveContentItem({
        key: 'announcement_banner',
        title: announcementText.trim(),
        content: announcementSubtext.trim(),
        isActive: announcementActive,
        type: 'ANNOUNCEMENT',
      });

      // 2. Hero
      adminDataService.saveContentItem({
        key: 'hero_banner',
        title: heroTitle.trim(),
        content: heroSubtitle.trim(),
        isActive: true,
        type: 'HERO',
        extraData: {
          badge: heroBadge.trim(),
          titleHighlight: heroTitleHighlight.trim(),
        },
      });

      // 3. Giveaways
      adminDataService.saveContentItem({
        key: 'giveaway_section',
        title: giveawayTitle.trim(),
        content: giveawaySubtitle.trim(),
        isActive: true,
        type: 'GIVEAWAY',
        extraData: {
          badge: giveawayBadge.trim(),
        },
      });

      // 4. Store
      adminDataService.saveContentItem({
        key: 'store_section',
        title: storeTitle.trim(),
        content: storeSubtitle.trim(),
        isActive: true,
        type: 'STORE',
        extraData: {
          badge: storeBadge.trim(),
          warrantyTitle: storeWarrantyTitle.trim(),
          warrantyDesc: storeWarrantyDesc.trim(),
        },
      });

      // 5. Utilities
      adminDataService.saveContentItem({
        key: 'utilities_section',
        title: utilitiesTitle.trim(),
        content: utilitiesSubtitle.trim(),
        isActive: true,
        type: 'UTILITIES',
        extraData: {
          badge: utilitiesBadge.trim(),
          warrantyTitle: utilitiesWarrantyTitle.trim(),
          warrantyDesc: utilitiesWarrantyDesc.trim(),
        },
      });

      // 6. Footer & Branding
      adminDataService.saveContentItem({
        key: 'footer_support',
        title: 'Chân Trang & Hỗ Trợ',
        content: footerText.trim(),
        isActive: true,
        type: 'FOOTER',
        extraData: {
          brandTitle:
            !isLegacyOrEmpty(footerBrandTitle)
              ? footerBrandTitle.trim()
              : allSiteTitle,
          brandLogo: footerLogoUrl.trim() || allLogoUrl || '/logo.png',
          badge1Text: footerBadge1Text.trim() || 'Cloudflare Pages & D1',
          badge1Visible: footerBadge1Visible,
          badge2Text: footerBadge2Text.trim() || '24/7 Realtime Sync',
          badge2Visible: footerBadge2Visible,
          telegram: telegramUrl.trim(),
          zalo: zaloUrl.trim(),
          hotline: hotline.trim(),
          email: supportEmail.trim(),
        },
      });

      // 7. Terms & Privacy
      adminDataService.saveContentItem({
        key: 'terms_of_service',
        title: termsTitle.trim(),
        content: termsContent.trim(),
        isActive: true,
        type: 'TERMS',
      });

      adminDataService.saveContentItem({
        key: 'privacy_policy',
        title: privacyTitle.trim(),
        content: privacyContent.trim(),
        isActive: true,
        type: 'PRIVACY',
      });

      await adminDataService.syncToCloudflareKV('wcg_admin_content_v4', adminDataService.getContentItems());

      onShowToast(
        'Đã Lưu Tất Cả Nội Dung & Thiết Lập Web!',
        'Toàn bộ nội dung giới thiệu các mục trên Web Khách đã được cập nhật và đồng bộ Real-time.',
        'success'
      );
    } catch (err: any) {
      console.error('Error saving all CMS:', err);
      onShowToast('Cảnh Báo Đồng Bộ', 'Đã lưu cục bộ nhưng chưa kết nối được máy chủ Cloudflare: ' + (err?.message || ''), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const navTabs: { id: SectionTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'Tất Cả Các Mục', icon: Globe },
    { id: 'pagination', label: '1. Cài Đặt Phân Trang', icon: Sliders },
    { id: 'hero', label: '2. Banner & Trang Chủ', icon: LayoutTemplate },
    { id: 'giveaways', label: '3. Sự Kiện Giật Code', icon: Gift },
    { id: 'store', label: '4. Cửa Hàng VIP', icon: ShoppingBag },
    { id: 'utilities', label: '5. Tiện Ích & Dịch Vụ', icon: Wrench },
    { id: 'announcement', label: '6. Thanh Thông Báo', icon: Bell },
    { id: 'footer', label: '7. Chân Trang & Hỗ Trợ', icon: PhoneCall },
    { id: 'legal', label: '8. Điều Khoản & Bảo Mật', icon: FileText },
    { id: 'branding', label: '9. Tên Web, Logo & Nền Web', icon: ImageIcon },
    { id: 'floating', label: '10. Cửa Sổ Thông Báo Nổi (Popup / Banner)', icon: BellRing },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Quản Lý Nội Dung Giới Thiệu & Nhận Diện Web Khách (CMS)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Điều chỉnh linh hoạt các đoạn văn giới thiệu, tiêu đề, khẩu hiệu và chính sách hiển thị tại tất cả các khu vực trên Web Khách.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCMSData}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                  : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'floating' ? (
        <FloatingNotificationModule onShowToast={onShowToast} />
      ) : (
        <form onSubmit={handleSaveAllCMS} className="space-y-6">
        {/* ========================================================================= */}
        {/* 0. CẤU HÌNH PHÂN TRANG & SỐ LƯỢNG GAME HIỂN THỊ (PAGINATION SETTINGS)      */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'pagination' || activeTab === 'hero') && (
          <div className="rounded-2xl border border-indigo-200/80 bg-white p-6 dark:border-indigo-950/60 dark:bg-slate-900 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  1. Cấu Hình Phân Trang & Hiển Thị Game (Pagination & Infinite Scroll)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSingleSection('pagination')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Lưu mục phân trang
              </button>
            </div>

            {/* Description note */}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tùy chỉnh cơ chế phân trang danh sách game trên trang chủ. Bạn có thể chọn chuyển trang bằng số hoặc cuộn vô tận tự động tải thêm, kèm theo số lượng game hiển thị trên mỗi trang.
            </p>

            {/* Mode Selection Cards */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Chọn cơ chế phân trang danh sách Game:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Option 1: Classic Pagination (Default) */}
                <div
                  onClick={() => setPaginationMode('classic')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    paginationMode === 'classic'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Layers className={`w-4 h-4 ${paginationMode === 'classic' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          Đánh Số Trang Truyền Thống (Classic)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        KHUYẾN NGHỊ MẶC ĐỊNH
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Hiển thị thanh phân trang đánh số rõ ràng (Trang 1, 2, 3...) với các nút chuyển trang Đầu/Trước/Sau/Cuối. Người dùng chủ động lật trang, giao diện ổn định và tải siêu nhanh.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Thanh phân trang số</span>
                    <span className={`font-semibold ${paginationMode === 'classic' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                      {paginationMode === 'classic' ? '✓ Đang kích hoạt' : 'Bấm để chọn'}
                    </span>
                  </div>
                </div>

                {/* Option 2: Infinite Scroll */}
                <div
                  onClick={() => setPaginationMode('infinite')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    paginationMode === 'infinite'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${paginationMode === 'infinite' ? 'text-amber-500' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          Cuộn Vô Tận Tải Thêm (Infinite Scroll)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        TỰ ĐỘNG NỐI DÀI
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Khi người dùng cuộn chuột xuống đáy trang, hệ thống sẽ tự động gọi API tải thêm đợt game tiếp theo mà không cần bấm chuyển trang, kèm theo nút bấm về đầu trang.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Tự động tải khi cuộn</span>
                    <span className={`font-semibold ${paginationMode === 'infinite' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                      {paginationMode === 'infinite' ? '✓ Đang kích hoạt' : 'Bấm để chọn'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Size Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Số lượng game tải về trên mỗi trang / mỗi đợt:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[12, 18, 24, 36, 48].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setGamesPerPage(size)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      gamesPerPage === size
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{size} game / trang</span>
                    {size === 24 && <span className="ml-1 text-[10px] opacity-80">(Mặc định)</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary indicator */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Thiết lập hiện tại: <strong className="text-indigo-600 dark:text-indigo-400">{paginationMode === 'classic' ? 'Đánh số trang (Classic)' : 'Cuộn vô tận (Infinite Scroll)'}</strong> với <strong className="text-slate-900 dark:text-white font-bold">{gamesPerPage} game/trang</strong>.
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Sẵn sàng áp dụng
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. HERO BANNER & INTRO TRANG CHỦ                                          */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'hero') && (
          <div className="rounded-2xl border border-indigo-200/80 bg-white p-6 dark:border-indigo-950/60 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  2. Mục Banner Đầu Trang Chủ & Giới Thiệu Kho Code (Hero Banner)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSingleSection('hero')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Lưu mục này
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề chính (Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="VD: Kho Giftcode & Mã Quà Tặng Game"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phần chữ nổi bật Gradient (Highlight Title)
                </label>
                <input
                  type="text"
                  value={heroTitleHighlight}
                  onChange={(e) => setHeroTitleHighlight(e.target.value)}
                  placeholder="VD: Độc Quyền 2026"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-indigo-600 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Huy hiệu nhỏ đầu banner (Top Live Badge)
              </label>
              <input
                type="text"
                value={heroBadge}
                onChange={(e) => setHeroBadge(e.target.value)}
                placeholder="VD: 🔥 CẬP NHẬT TỰ ĐỘNG 24/7"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Đoạn văn giới thiệu chi tiết (Hero Subtitle / Description)
              </label>
              <textarea
                rows={3}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="VD: Tra cứu tức thì hàng nghìn mã code quà tặng mới nhất của hơn 450+ tựa game mobile & PC..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
              />
            </div>

            {/* Live Preview Mockup Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2 relative overflow-hidden">
              <span className="absolute top-2.5 right-3 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                ● Mockup Xem Trước Web Khách
              </span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{heroBadge || '🔥 CẬP NHẬT TỰ ĐỘNG 24/7'}</span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white">
                {heroTitle}{' '}
                <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  {heroTitleHighlight}
                </span>
              </h3>
              <p className="text-xs text-slate-300 max-w-xl mx-auto line-clamp-2">
                {heroSubtitle}
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SỰ KIỆN GIẬT CODE (GIVEAWAYS SECTION)                                  */}
        {/* ========================================== */}
        {(activeTab === 'all' || activeTab === 'giveaways') && (
          <div className="rounded-2xl border border-rose-200/80 bg-white p-6 dark:border-rose-950/60 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-rose-500 dark:text-rose-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  2. Mục Giới Thiệu Sự Kiện Giật Code & Vòng Quay (Giveaways)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSingleSection('giveaways')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold border border-rose-200 dark:border-rose-800 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Lưu mục này
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề Sự Kiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={giveawayTitle}
                  onChange={(e) => setGiveawayTitle(e.target.value)}
                  placeholder="VD: Săn Giftcode Độc Quyền Miễn Phí"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Huy hiệu nổi bật (Badge)
                </label>
                <input
                  type="text"
                  value={giveawayBadge}
                  onChange={(e) => setGiveawayBadge(e.target.value)}
                  placeholder="VD: Sự Kiện Giật Code Giới Hạn"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-rose-500 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Đoạn văn giới thiệu sự kiện (Giveaway Subtitle / Rules)
              </label>
              <textarea
                rows={3}
                value={giveawaySubtitle}
                onChange={(e) => setGiveawaySubtitle(e.target.value)}
                placeholder="VD: Các chiến dịch phát code độc quyền số lượng có hạn tài trợ từ NPH..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
              />
            </div>

            {/* Live Preview Mockup Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 relative space-y-1.5">
              <span className="absolute top-2.5 right-3 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                ● Mockup Trang Sự Kiện
              </span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                <Flame className="w-3 h-3" />
                <span>{giveawayBadge || 'Sự Kiện Giật Code Giới Hạn'}</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                {giveawayTitle}
              </h3>
              <p className="text-xs text-slate-300 line-clamp-2 max-w-2xl">
                {giveawaySubtitle}
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. CỬA HÀNG GIFTCODE VIP (STORE SECTION)                                  */}
        {/* ========================================== */}
        {(activeTab === 'all' || activeTab === 'store') && (
          <div className="rounded-2xl border border-purple-200/80 bg-white p-6 dark:border-purple-950/60 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  3. Mục Giới Thiệu Cửa Hàng Giftcode VIP (Store Section)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSingleSection('store')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 text-xs font-bold border border-purple-200 dark:border-purple-800 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Lưu mục này
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề Cửa Hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storeTitle}
                  onChange={(e) => setStoreTitle(e.target.value)}
                  placeholder="VD: Cửa Hàng Code Chiết Khấu Tới 60%"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Huy hiệu nổi bật (Badge)
                </label>
                <input
                  type="text"
                  value={storeBadge}
                  onChange={(e) => setStoreBadge(e.target.value)}
                  placeholder="VD: Gói Nạp & Giftcode Chiết Khấu Chính Hãng"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-purple-500 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Đoạn văn giới thiệu Cửa Hàng (Store Subtitle)
              </label>
              <textarea
                rows={2}
                value={storeSubtitle}
                onChange={(e) => setStoreSubtitle(e.target.value)}
                placeholder="VD: Mã nạp game, thẻ tháng và giftcode sự kiện độc quyền. Nhận mã tự động 100% qua VietQR / Ví số dư."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề Khối Cam Kết / Bảo Hành
                </label>
                <input
                  type="text"
                  value={storeWarrantyTitle}
                  onChange={(e) => setStoreWarrantyTitle(e.target.value)}
                  placeholder="VD: Bảo Hành 100%"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nội dung Khối Cam Kết / Bảo Hành
                </label>
                <input
                  type="text"
                  value={storeWarrantyDesc}
                  onChange={(e) => setStoreWarrantyDesc(e.target.value)}
                  placeholder="VD: Đổi trả tức thì nếu mã lỗi"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Live Preview Mockup Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
              <span className="absolute top-2.5 right-3 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                ● Mockup Trang Cửa Hàng
              </span>
              <div className="space-y-1 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                  <ShoppingBag className="w-3 h-3" />
                  <span>{storeBadge || 'Gói Nạp & Giftcode'}</span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {storeTitle}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-1">{storeSubtitle}</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-white block">{storeWarrantyTitle}</span>
                  <span className="text-[10px] text-slate-400">{storeWarrantyDesc}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. TIỆN ÍCH & DỊCH VỤ SỐ (UTILITIES SECTION)                               */}
        {/* ========================================== */}
        {(activeTab === 'all' || activeTab === 'utilities') && (
          <div className="rounded-2xl border border-teal-200/80 bg-white p-6 dark:border-teal-950/60 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  4. Mục Giới Thiệu Tiện Ích & Dịch Vụ Số (Utilities Section)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSingleSection('utilities')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 hover:bg-teal-100 text-xs font-bold border border-teal-200 dark:border-teal-800 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Lưu mục này
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề Tiện Ích <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={utilitiesTitle}
                  onChange={(e) => setUtilitiesTitle(e.target.value)}
                  placeholder="VD: Tiện Ích & Dịch Vụ Chính Hãng"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Huy hiệu nổi bật (Badge)
                </label>
                <input
                  type="text"
                  value={utilitiesBadge}
                  onChange={(e) => setUtilitiesBadge(e.target.value)}
                  placeholder="VD: Dịch Vụ Số & Sản Phẩm Ngoài Lề"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-teal-500 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-teal-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Đoạn văn giới thiệu Tiện Ích (Utilities Subtitle)
              </label>
              <textarea
                rows={2}
                value={utilitiesSubtitle}
                onChange={(e) => setUtilitiesSubtitle(e.target.value)}
                placeholder="VD: Tài khoản Premium giải trí, key bản quyền phần mềm, Cloud VPS treo game..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề Khối Cam Kết
                </label>
                <input
                  type="text"
                  value={utilitiesWarrantyTitle}
                  onChange={(e) => setUtilitiesWarrantyTitle(e.target.value)}
                  placeholder="VD: Bảo Hành 1 Đổi 1"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nội dung Khối Cam Kết
                </label>
                <input
                  type="text"
                  value={utilitiesWarrantyDesc}
                  onChange={(e) => setUtilitiesWarrantyDesc(e.target.value)}
                  placeholder="VD: Hỗ trợ kỹ thuật 24/7 tức thì"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Live Preview Mockup Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
              <span className="absolute top-2.5 right-3 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                ● Mockup Trang Tiện Ích
              </span>
              <div className="space-y-1 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[10px] font-bold">
                  <Wrench className="w-3 h-3" />
                  <span>{utilitiesBadge || 'Dịch Vụ Số'}</span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {utilitiesTitle}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-1">{utilitiesSubtitle}</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-white block">{utilitiesWarrantyTitle}</span>
                  <span className="text-[10px] text-slate-400">{utilitiesWarrantyDesc}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. ANNOUNCEMENT BAR (THANH THÔNG BÁO ĐẦU TRANG)                           */}
        {/* ========================================== */}
        {(activeTab === 'all' || activeTab === 'announcement') && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  5. Thanh Thông Báo Đầu Trang (Announcement Bar)
                </h4>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={announcementActive}
                    onChange={(e) => setAnnouncementActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Bật hiển thị thanh này</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleSaveSingleSection('announcement')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 text-xs font-bold border border-amber-200 dark:border-amber-800 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu mục này
                </button>
              </div>
            </div>

            {/* Quick Presets for Announcement Bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                ⚡ Mẫu điền nhanh:
              </span>
              <button
                type="button"
                onClick={() => {
                  setAnnouncementActive(true);
                  setAnnouncementText('🛠️ Web bảo trì hệ thống tài khoản & nạp ví: Tạm dừng nạp ví và mua hàng. Hệ thống tra cứu & sao chép 10.700+ Code Game của 627 tựa game vẫn hoạt động 100% bình thường!');
                  setAnnouncementSubtext('Quý khách vẫn có thể tìm kiếm, tra cứu và sao chép giftcode miễn phí, đọc 94 bài viết tin tức hoàn toàn bình thường.');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-300 dark:border-rose-700 transition-colors cursor-pointer"
              >
                🛠️ Mẫu: Web Bảo Trì
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnnouncementActive(true);
                  setAnnouncementText('🔥 CHÀO MỪNG BẠN ĐẾN VỚI CODEGAME STORE - KHO GIFTCODE GAME & DỊCH VỤ SỐ 1 VIỆT NAM');
                  setAnnouncementSubtext('Khuyến mãi nạp đầu tặng 20% giá trị qua cổng SePay MBBank.');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-700 transition-colors cursor-pointer"
              >
                🎁 Mẫu Chào Mừng
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nội dung thông báo nổi bật chính
              </label>
              <input
                type="text"
                required
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="VD: 🔥 CHÀO MỪNG BẠN ĐẾN VỚI CODEGAME STORE..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nội dung phụ / Ưu đãi mở rộng (Hiển thị trên Desktop)
              </label>
              <input
                type="text"
                value={announcementSubtext}
                onChange={(e) => setAnnouncementSubtext(e.target.value)}
                placeholder="VD: Khuyến mãi nạp đầu tặng 20% giá trị qua cổng SePay MBBank."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Announcement Preview */}
            {announcementActive && (
              <div className="rounded-xl bg-gradient-to-r from-indigo-950 via-primary-dark to-purple-950 px-3 py-2 text-white text-xs font-bold flex items-center justify-between shadow-sm overflow-hidden border border-primary/30">
                <div className="flex items-center gap-1.5 shrink-0 bg-indigo-950/90 px-2 py-1 rounded-lg border border-white/10 mr-2 z-10">
                  <Megaphone className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span className="text-[10px] uppercase font-black text-amber-300">Preview Live</span>
                </div>
                <div className="flex-1 min-w-0 max-w-full overflow-hidden relative">
                  <div className="flex w-max animate-marquee">
                    <span className="inline-flex items-center gap-2 px-4 whitespace-nowrap">
                      <strong className="text-amber-200">{announcementText}</strong>
                      {announcementSubtext && <span className="text-slate-100 font-medium">• {announcementSubtext}</span>}
                      <span className="text-amber-400/70 px-2">✦</span>
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 whitespace-nowrap" aria-hidden="true">
                      <strong className="text-amber-200">{announcementText}</strong>
                      {announcementSubtext && <span className="text-slate-100 font-medium">• {announcementSubtext}</span>}
                      <span className="text-amber-400/70 px-2">✦</span>
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 whitespace-nowrap" aria-hidden="true">
                      <strong className="text-amber-200">{announcementText}</strong>
                      {announcementSubtext && <span className="text-slate-100 font-medium">• {announcementSubtext}</span>}
                      <span className="text-amber-400/70 px-2">✦</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. CHÂN TRANG & HỖ TRỢ (FOOTER & SUPPORT)                                */}
        {/* ========================================== */}
        {/* ========================================================================= */}
        {/* 6. CHÂN TRANG & HỖ TRỢ (FOOTER & SUPPORT)                                */}
        {/* ========================================== */}
        {(activeTab === 'all' || activeTab === 'footer') && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  6. Chân Trang & Nhận Diện Thương Hiệu (Footer Branding & Support)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSingleSection('footer')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 dark:border-emerald-800 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Lưu mục này
              </button>
            </div>

            {/* A. KHỐI THƯƠNG HIỆU & GIỚI THIỆU CHÂN TRANG */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-indigo-500" />
                  <span>Khối Thương Hiệu & Giới Thiệu Chân Trang</span>
                </span>
                <span className="text-[10px] text-slate-400">Hiển thị cột trái chân trang (Desktop & Mobile)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tên Thương Hiệu Chân Trang (Brand Name)
                  </label>
                  <input
                    type="text"
                    value={footerBrandTitle}
                    onChange={(e) => setFooterBrandTitle(e.target.value)}
                    placeholder="VD: CodeGame.Shop"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Mặc định: CodeGame.Shop (để trống sẽ dùng tên website).</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Logo Chân Trang (Footer Logo URL)
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={footerLogoUrl}
                      onChange={(e) => setFooterLogoUrl(e.target.value)}
                      placeholder={logoUrl || '/logo.png'}
                      className="flex-1 rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                    />
                    {logoUrl && footerLogoUrl !== logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFooterLogoUrl(logoUrl)}
                        className="px-2.5 py-2 text-[11px] font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 cursor-pointer shrink-0"
                        title="Dùng chung với Logo chính của Web"
                      >
                        Dùng Logo Web
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Để trống để tự động lấy Logo chính của website.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mô Tả / Slogan Giới Thiệu Chân Trang <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="CodeGame.Shop — Nền tảng tổng hợp và chia sẻ giftcode game mobile & PC hàng đầu Việt Nam. Cập nhật mã quà tặng mới nhất mỗi ngày từ NPH chính thức."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
                />
              </div>

              {/* B. HUY HIỆU CÔNG NGHỆ (TECHNOLOGY BADGES) */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-500" />
                  <span>Huy Hiệu Công Nghệ (Technology Badges)</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Badge 1 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Huy Hiệu 1 (Server / D1)</span>
                      </span>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={footerBadge1Visible}
                          onChange={(e) => setFooterBadge1Visible(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Hiển thị</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={footerBadge1Text}
                      onChange={(e) => setFooterBadge1Text(e.target.value)}
                      placeholder="Cloudflare Pages & D1"
                      disabled={!footerBadge1Visible}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono disabled:opacity-50"
                    />
                  </div>

                  {/* Badge 2 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-secondary" />
                        <span>Huy Hiệu 2 (Sync / Realtime)</span>
                      </span>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={footerBadge2Visible}
                          onChange={(e) => setFooterBadge2Visible(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Hiển thị</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={footerBadge2Text}
                      onChange={(e) => setFooterBadge2Text(e.target.value)}
                      placeholder="24/7 Realtime Sync"
                      disabled={!footerBadge2Visible}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* C. LIVE PREVIEW */}
              <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Xem Trước Chân Trang (Live Preview):
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Tự động cập nhật trên Web Khách</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      <img
                        src={footerLogoUrl || logoUrl || '/logo.png'}
                        alt="Logo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== '/logo.png') target.src = '/logo.png';
                        }}
                      />
                    </div>
                    <span className="font-bold text-sm text-white tracking-wider">
                      {footerBrandTitle || siteTitle || 'CodeGame.Shop'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-lg">
                    {footerText || 'CodeGame.Shop — Nền tảng tổng hợp và chia sẻ giftcode game mobile & PC hàng đầu Việt Nam. Cập nhật mã quà tặng mới nhất mỗi ngày từ NPH chính thức.'}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    {footerBadge1Visible && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 text-[11px] font-mono border border-slate-800">
                        <Server className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{footerBadge1Text || 'Cloudflare Pages & D1'}</span>
                      </span>
                    )}
                    {footerBadge2Visible && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 text-[11px] font-mono border border-slate-800">
                        <Zap className="w-3.5 h-3.5 text-teal-400" />
                        <span>{footerBadge2Text || '24/7 Realtime Sync'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* D. KÊNH HỖ TRỢ KHÁCH HÀNG */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Kênh Tiếp Nhận & Hỗ Trợ Khách Hàng (Hộp Thoại Hỗ Trợ Chân Trang)
              </span>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-sky-500" />
                    <span>Telegram Hỗ Trợ</span>
                  </label>
                  <input
                    type="text"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                    placeholder="https://t.me/webcodegame_vn"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span>Zalo Hỗ Trợ</span>
                  </label>
                  <input
                    type="text"
                    value={zaloUrl}
                    onChange={(e) => setZaloUrl(e.target.value)}
                    placeholder="https://zalo.me/0386767888"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Hotline Hỗ Trợ</span>
                  </label>
                  <input
                    type="text"
                    value={hotline}
                    onChange={(e) => setHotline(e.target.value)}
                    placeholder="0386.767.888"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-amber-500" />
                    <span>Email Tiếp Nhận</span>
                  </label>
                  <input
                    type="text"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="hotro@webcodegame.vn"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ĐIỀU KHOẢN & CHÍNH SÁCH BẢO MẬT (TERMS & PRIVACY)                       */}
        {/* ========================================== */}
        {(activeTab === 'all' || activeTab === 'legal') && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  7. Điều Khoản Dịch Vụ & Chính Sách Bảo Mật (Legal & Policies)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSingleSection('legal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Lưu mục này
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Terms */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Điều Khoản Sử Dụng Dịch Vụ (Terms of Service)
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Tiêu đề</label>
                  <input
                    type="text"
                    value={termsTitle}
                    onChange={(e) => setTermsTitle(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Nội dung chi tiết</label>
                  <textarea
                    rows={6}
                    value={termsContent}
                    onChange={(e) => setTermsContent(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-sans leading-relaxed"
                  />
                </div>
              </div>

              {/* Privacy */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Chính Sách Bảo Mật Quyền Riêng Tư (Privacy Policy)
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Tiêu đề</label>
                  <input
                    type="text"
                    value={privacyTitle}
                    onChange={(e) => setPrivacyTitle(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Nội dung chi tiết</label>
                  <textarea
                    rows={6}
                    value={privacyContent}
                    onChange={(e) => setPrivacyContent(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-sans leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. WEBSITE BRANDING, LOGO & NỀN WEB (BRANDING & MEDIA ASSETS)             */}
        {/* ========================================== */}
        {(activeTab === 'all' || activeTab === 'branding') && (
          <div className="rounded-2xl border border-indigo-200/80 bg-white p-6 dark:border-indigo-900/50 dark:bg-slate-900 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  8. Tên Website, Logo, Hình Ảnh Nhận Diện & Nền Web (Branding & Media Assets)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Tự Động Nén WebP
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveSingleSection('branding')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu mục này
                </button>
              </div>
            </div>

            {/* 0. TÊN WEBSITE / TIÊU ĐỀ THƯƠNG HIỆU CHÍNH */}
            <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 border border-indigo-200/90 dark:border-indigo-800/70 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span>Tên Website & Tiêu Đề Thương Hiệu Chính (Site Title)</span>
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                  Hiển thị Header & Tab Trình Duyệt
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={siteTitle}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSiteTitle(val);
                    if (!footerBrandTitle || footerBrandTitle === 'WEB CODE GAME' || footerBrandTitle === siteTitle) {
                      setFooterBrandTitle(val);
                    }
                  }}
                  placeholder="VD: CodeGame.Shop"
                  className="flex-1 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const titleToSync = siteTitle.trim() || 'CodeGame.Shop';
                    setFooterBrandTitle(titleToSync);
                    onShowToast('Đã Đồng Bộ!', `Đã gán tên "${titleToSync}" cho cả Chân Trang.`, 'info');
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 cursor-pointer shrink-0 transition-colors"
                  title="Đồng bộ sang Tên Thương Hiệu Chân Trang"
                >
                  Đồng bộ chân trang
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tên này xuất hiện tại Logo Header trên cùng, Tab tiêu đề trình duyệt (Title) và các thông báo của hệ thống.
              </p>

              {/* KHẨU HIỆU / PHỤ ĐỀ HEADER (PORTAL SUBTITLE) */}
              <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Khẩu Hiệu / Phụ Đề Header (Cổng tra cứu Giftcode #1)</span>
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-semibold">
                    Dòng chữ nhỏ dưới Logo Header
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={portalSubtitle}
                    onChange={(e) => setPortalSubtitle(e.target.value)}
                    placeholder="VD: Cổng Tra Cứu Giftcode #1"
                    className="flex-1 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPortalSubtitle('Cổng Tra Cứu Giftcode #1');
                      onShowToast('Mặc định', 'Đã đặt lại khẩu hiệu mặc định "Cổng Tra Cứu Giftcode #1".', 'info');
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 transition-colors"
                    title="Đặt lại khẩu hiệu mặc định"
                  >
                    Mặc định
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Đây chính là dòng chữ hiển thị ngay dưới Tên Website ở thanh Header góc trên bên trái (Mặc định: <em>Cổng Tra Cứu Giftcode #1</em>).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* A. LOGO CHO WEB */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-indigo-500" />
                    <span>Logo Cho Web (Brand Logo)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Khuyên dùng: PNG trong suốt / SVG / WebP</span>
                </div>

                <ImageUploadInput
                  label="Tải ảnh Logo hoặc dán link"
                  value={logoUrl}
                  onChange={(val) => setLogoUrl(val)}
                  maxWidth={400}
                  maxHeight={400}
                  quality={0.9}
                  helperText="Logo sẽ hiển thị trên thanh Header và tiêu đề trang web."
                />

                {/* Logo Preview */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-mono">Xem trước Header Logo:</span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Gamepad2 className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-white text-xs truncate">{siteTitle || 'CodeGame.Shop'}</span>
                      <span className="text-[10px] text-slate-400 truncate">{portalSubtitle || 'Cổng Tra Cứu Giftcode #1'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* B. HÌNH ẢNH ĐẠI DIỆN / FAVICON WEB */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span>Hình Ảnh Đại Diện Web (Avatar / Favicon / App Icon)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Tỷ lệ vuông 1:1</span>
                </div>

                <ImageUploadInput
                  label="Tải ảnh đại diện hoặc dán link"
                  value={avatarUrl}
                  onChange={(val) => setAvatarUrl(val)}
                  maxWidth={300}
                  maxHeight={300}
                  quality={0.85}
                  helperText="Hình ảnh đại diện tab trình duyệt và ảnh chia sẻ mạng xã hội (OG:Image)."
                />

                {/* Avatar Preview */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-mono">Xem trước Favicon & Avatar:</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-slate-800 flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-600 bg-slate-800 flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Favicon" className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* C. NỀN WEB (WEBSITE BACKGROUND WALLPAPER) */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Hình Nền Web (Website Background Wallpaper / Ambient Theme)</span>
                </span>
                <span className="text-[10px] text-slate-400">Hỗ trợ ảnh phong cảnh game, wallpaper 1920x1080</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUploadInput
                  label="Tải ảnh nền từ máy tính hoặc dán link"
                  value={backgroundUrl}
                  onChange={(val) => setBackgroundUrl(val)}
                  maxWidth={1920}
                  maxHeight={1080}
                  quality={0.8}
                  helperText="Ảnh nền sẽ được nén tự động để tải nhanh 0ms từ Cloudflare CDN."
                />

                {/* Background Options */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Kiểu Hiển Thị Nền
                    </label>
                    <select
                      value={backgroundStyle}
                      onChange={(e: any) => setBackgroundStyle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                    >
                      <option value="ambient">🎮 Nền Mờ Gaming Ambient (Khuyên dùng - Dịu mắt, làm nổi bật thẻ game)</option>
                      <option value="cover">🖼️ Nền Toàn Trang (Full Cover Wallpaper)</option>
                      <option value="header_only">⚡ Nền Banner Đầu Trang (Hero Only)</option>
                      <option value="pattern">🔲 Nền Hoa Văn Lặp Lại (Repeat Pattern)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-slate-400" />
                        <span>Độ Mờ Ảnh Nền (Opacity)</span>
                      </label>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {Math.round(backgroundOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={backgroundOpacity}
                      onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                      className="w-full mt-2 cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>5% (Rất nhẹ)</span>
                      <span>35% (Chuẩn Gaming)</span>
                      <span>60%</span>
                      <span>100% (Đậm)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Background Mockup Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-4 h-40 flex flex-col justify-between">
                {backgroundUrl && (
                  <div
                    className={`absolute inset-0 pointer-events-none transition-all ${
                      backgroundStyle === 'ambient'
                        ? 'bg-cover bg-center blur-md scale-105'
                        : backgroundStyle === 'cover'
                        ? 'bg-cover bg-center'
                        : backgroundStyle === 'pattern'
                        ? 'bg-repeat'
                        : 'bg-cover bg-top'
                    }`}
                    style={{
                      backgroundImage: `url(${backgroundUrl})`,
                      opacity: backgroundOpacity,
                    }}
                  />
                )}

                {/* Mockup UI over background */}
                <div className="relative z-10 flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : 'G'}
                    </div>
                    <span className="text-xs font-bold text-white">{siteTitle}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                    ● Live Preview
                  </span>
                </div>

                <div className="relative z-10 text-center py-2">
                  <span className="text-xs font-extrabold text-white block truncate">
                    {heroTitle}
                  </span>
                  <span className="text-[10px] text-slate-300 line-clamp-1">
                    {heroSubtitle}
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                  <span>Trang web khách sẽ tự động phản ánh ảnh nền này</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl bg-slate-900/90 backdrop-blur-md p-4 border border-slate-700 shadow-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Mọi thay đổi nội dung giới thiệu sẽ đồng bộ tức thì 0ms tới Web Khách</span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg hover:opacity-95 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSaving ? 'Đang Lưu...' : '✓ Lưu Tất Cả Nội Dung Web Khách'}</span>
          </button>
        </div>
      </form>
      )}
    </div>
  );
};
