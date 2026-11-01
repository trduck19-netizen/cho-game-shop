import React, { useState, useEffect } from 'react';
import { Zap, Server, Globe2, FileText, Lock, X, Mail, MessageSquare, PhoneCall, Send, Smartphone } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface FooterProps {
  onSelectCategory: (cat: string) => void;
  categories: string[];
  onOpenDownloadApp?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, categories, onOpenDownloadApp }) => {
  const { t } = useLanguage();
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'contact' | null>(null);
  const [footerData, setFooterData] = useState(() => dataService.getContentByKey('footer_support'));
  const [termsData, setTermsData] = useState(() => dataService.getContentByKey('terms_of_service'));
  const [privacyData, setPrivacyData] = useState(() => dataService.getContentByKey('privacy_policy'));

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setFooterData(dataService.getContentByKey('footer_support'));
      setTermsData(dataService.getContentByKey('terms_of_service'));
      setPrivacyData(dataService.getContentByKey('privacy_policy'));
    });
    return () => unsub();
  }, []);

  const activeTerms = termsData || {
    title: t.footer.termsOfService,
    content: '1. Quy định chung: Toàn bộ giftcode và mã quà tặng trên website được chia sẻ hoàn toàn miễn phí hoặc từ các đối tác phân phối chính thức.\n2. Người dùng cam kết không sử dụng công cụ tự động spam, phá hoại hoặc lạm dụng tài nguyên hệ thống.\n3. Ban Quản Trị có quyền cập nhật, hiệu chỉnh các điều khoản sử dụng nhằm đảm bảo quyền lợi chung cho cộng đồng game thủ.',
  };

  const activePrivacy = privacyData || {
    title: t.footer.privacyPolicy,
    content: '1. Chúng tôi tôn trọng và cam kết bảo vệ thông tin tài khoản và dữ liệu cá nhân của người dùng.\n2. Thông tin số dư và mã giao dịch ví được bảo vệ và lưu trữ mã hóa trên hạ tầng bảo mật Cloudflare Edge Network.\n3. Chúng tôi tuyệt đối không bán hoặc cung cấp thông tin của bạn cho bên thứ ba vì bất kỳ mục đích thương mại nào.',
  };

  const branding = dataService.getWebsiteBranding();
  const rawBrand = (footerData?.extraData?.brandTitle || branding.siteTitle || 'CodeGame.Shop').trim();
  const brandTitle = (!rawBrand || rawBrand.toUpperCase() === 'WEB CODE GAME' || rawBrand.toUpperCase() === 'WEB CODE') ? 'CodeGame.Shop' : rawBrand;
  const brandLogo = (footerData?.extraData?.brandLogo || branding.logoUrl || '/logo.png').trim();
  const badge1Text = (footerData?.extraData?.badge1Text ?? 'Cloudflare Pages & D1').trim();
  const badge1Visible = footerData?.extraData?.badge1Visible !== false;
  const badge2Text = (footerData?.extraData?.badge2Text ?? '24/7 Realtime Sync').trim();
  const badge2Visible = footerData?.extraData?.badge2Visible !== false;
  const rawIntro = (footerData?.content || '').trim();
  const siteIntro = (!rawIntro || rawIntro.startsWith('Web Code Game'))
    ? 'CodeGame.Shop — Nền tảng tổng hợp và chia sẻ giftcode game mobile & PC hàng đầu Việt Nam. Cập nhật mã quà tặng mới nhất mỗi ngày từ NPH chính thức.'
    : rawIntro;
  const supportTelegram = footerData?.extraData?.telegram || 'https://t.me/webcodegame_vn';
  const supportZalo = footerData?.extraData?.zalo || 'https://zalo.me/0386767888';
  const supportHotline = footerData?.extraData?.hotline || '0386.767.888';
  const supportEmail = footerData?.extraData?.email || 'hotro@webcodegame.vn';

  return (
    <>
      <footer className="bg-card/90 border-t border-border mt-12 sm:mt-16 pt-10 pb-8 text-xs text-slate-300 w-full max-w-full overflow-hidden box-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-border/60">
            {/* Brand & Introduction */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-glow-primary overflow-hidden">
                  <img
                    src={brandLogo}
                    alt={brandTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== '/logo.png') target.src = '/logo.png';
                    }}
                  />
                </div>
                <span className="font-display font-bold text-base text-foreground tracking-wider">
                  {brandTitle}
                </span>
              </div>
              {siteIntro ? (
                <p className="text-slate-300 leading-relaxed max-w-md text-xs sm:text-sm">
                  {siteIntro}
                </p>
              ) : null}
              {(badge1Visible || badge2Visible) && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {badge1Visible && badge1Text && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-slate-200 text-[11px] font-mono border border-border">
                      <Server className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{badge1Text}</span>
                    </span>
                  )}
                  {badge2Visible && badge2Text && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-slate-200 text-[11px] font-mono border border-border">
                      <Zap className="w-3.5 h-3.5 text-secondary" />
                      <span>{badge2Text}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Language Switcher in Footer */}
              <div className="pt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">{t.footer.selectLanguage}</span>
                <LanguageSelector variant="footer" />
              </div>

              {/* Tải App CodeGame Button in Footer */}
              {onOpenDownloadApp && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenDownloadApp}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary/15 via-purple-500/15 to-accent/15 hover:from-primary/25 hover:to-accent/25 border border-primary/40 text-primary-light font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Smartphone className="w-4 h-4 text-primary-light" />
                    <span>Cài Đặt App CodeGame (Android & iOS)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      FREE
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Category Links */}
            <div>
              <h4 className="font-heading font-bold text-sm text-foreground mb-3">
                {t.footer.quickLinks}
              </h4>
              <ul className="space-y-1.5">
                <li>
                  <a
                    href="/danh-sach-game-a-z"
                    className="text-primary-light font-bold hover:underline transition-colors text-left flex items-center gap-1.5"
                  >
                    <span>📚 Danh Sách Game A-Z</span>
                    <span className="text-[10px] bg-primary/20 text-primary-light px-1.5 py-0.5 rounded font-mono">582</span>
                  </a>
                </li>
                <li>
                  <a
                    href="/the-loai/kiem-hiep-tien-hiep"
                    className="text-slate-300 hover:text-primary-light transition-colors text-left block"
                  >
                    Kiếm Hiệp & Tiên Hiệp
                  </a>
                </li>
                <li>
                  <a
                    href="/the-loai/nhap-vai-gacha-anime"
                    className="text-slate-300 hover:text-primary-light transition-colors text-left block"
                  >
                    Nhập Vai Gacha & Anime
                  </a>
                </li>
                <li>
                  <a
                    href="/the-loai/ban-sung-sinh-ton"
                    className="text-slate-300 hover:text-primary-light transition-colors text-left block"
                  >
                    Bắn Súng & Sinh Tồn
                  </a>
                </li>
                <li>
                  <a
                    href="/the-loai/tam-quoc-chien-thuat"
                    className="text-slate-300 hover:text-primary-light transition-colors text-left block"
                  >
                    Tam Quốc & Chiến Thuật
                  </a>
                </li>
                <li>
                  <a
                    href="/the-loai/roblox-mini-game"
                    className="text-slate-300 hover:text-primary-light transition-colors text-left block"
                  >
                    Roblox & Mini Game
                  </a>
                </li>
                <li>
                  <a
                    href="/the-loai/nhap-vai-mmorpg"
                    className="text-slate-300 hover:text-primary-light transition-colors text-left block"
                  >
                    Nhập Vai & MMORPG
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal, Policies & Contact */}
            <div>
              <h4 className="font-heading font-bold text-sm text-foreground mb-3">
                {t.footer.legal}
              </h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setActiveModal('terms')}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-primary-light transition-colors cursor-pointer text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary-light shrink-0" />
                    <span>{activeTerms.title || t.footer.termsOfService}</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('privacy')}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-primary-light transition-colors cursor-pointer text-left"
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{activePrivacy.title || t.footer.privacyPolicy}</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('contact')}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-primary-light transition-colors cursor-pointer text-left"
                  >
                    <Mail className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <span>{t.footer.contactSupport}</span>
                  </button>
                </li>
                <li className="flex items-start gap-1.5 pt-1 text-slate-400 text-[11px]">
                  <Globe2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{t.footer.rights}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} {brandTitle || 'CodeGame.Shop'}. {t.footer.rights}</p>
            <p className="flex items-center gap-1">
              {siteIntro}
            </p>
          </div>
        </div>
      </footer>

      {/* Dynamic Content CMS Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-xl bg-card border border-border/90 rounded-3xl p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/20 text-primary-light">
                  {activeModal === 'terms' ? (
                    <FileText className="w-5 h-5" />
                  ) : activeModal === 'privacy' ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                </div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                  {activeModal === 'terms'
                    ? activeTerms.title
                    : activeModal === 'privacy'
                    ? activePrivacy.title
                    : 'Thông Tin Liên Hệ & Hỗ Trợ Khách Hàng'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-slate-300 hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line space-y-3">
              {activeModal === 'terms' && activeTerms.content}
              {activeModal === 'privacy' && activePrivacy.content}
              {activeModal === 'contact' && (
                <div className="space-y-3">
                  <p>Mọi thắc mắc, khiếu nại hoặc yêu cầu hỗ trợ nạp/nhận mã code game, vui lòng liên hệ trực tiếp với Ban Quản Trị qua các kênh chính thức sau:</p>
                  <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2.5">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Email Tiếp Nhận: <strong className="text-amber-300 font-mono ml-1">{supportEmail}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <Send className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Cộng Đồng Telegram: <a href={supportTelegram} target="_blank" rel="noreferrer" className="text-sky-400 font-mono underline hover:text-sky-300 ml-1">{supportTelegram}</a></span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Hỗ Trợ Zalo: <a href={supportZalo} target="_blank" rel="noreferrer" className="text-blue-400 font-mono underline hover:text-blue-300 ml-1">{supportZalo}</a></span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Hotline 24/7: <strong className="text-emerald-400 font-mono ml-1">{supportHotline}</strong></span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs">Hệ thống xử lý tự động 24/7. Hỗ trợ kỹ thuật viên trực tuyến từ 8:00 đến 23:00 hàng ngày.</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border/40 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
