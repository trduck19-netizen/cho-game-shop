import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Wallet,
  Coins,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  AlertCircle,
  Plus,
  ArrowRight,
  History,
  ArrowDownLeft,
  Clock,
  RefreshCw,
  Receipt,
  Lock,
  LogIn,
  QrCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { dataService } from '../services/dataService';
import { marketingService } from '../services/marketingService';
import { growthService } from '../services/growthService';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import type { UserProfile } from '../types/game';
import { formatCore, formatFullDateTime } from '../utils/textUtils';
import { buildVietQrUrl, generateVietQrDataUrl } from '../utils/vietQrUtils';

interface UserWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser: (user: UserProfile) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth?: () => void;
}

const MIN_TOPUP = 10000;

export const UserWalletModal: React.FC<UserWalletModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onShowToast,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'TOPUP' | 'HISTORY'>('TOPUP');
  const [customInput, setCustomInput] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sepayConfig, setSepayConfig] = useState(() => dataService.getSePayConfig());
  const [depositHistory, setDepositHistory] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  useLockBodyScroll(isOpen);

  // Stable references to prevent infinite re-render cascades
  const lastKnownBalanceRef = React.useRef(user?.wallet_balance || 0);
  const onUpdateUserRef = React.useRef(onUpdateUser);
  onUpdateUserRef.current = onUpdateUser;

  // Success Notification Popup Card state
  const [successInfo, setSuccessInfo] = useState<{
    amount: number;
    newBalance: number;
    txId?: string;
    timestamp?: string;
  } | null>(null);

  const loadHistory = React.useCallback(() => {
    try {
      const history = dataService.getUserDepositTransactions(user?.id, user?.email);
      setDepositHistory(Array.isArray(history) ? history : []);
    } catch {
      setDepositHistory([]);
    }
  }, [user?.id, user?.email]);

  const prevIsOpenRef = React.useRef(false);

  // Initialize modal state ONLY when freshly opened (prevent re-running when user.wallet_balance updates)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setCustomInput('');
      setSepayConfig(dataService.getSePayConfig());
      lastKnownBalanceRef.current = user?.wallet_balance || 0;
      setSuccessInfo(null);
      loadHistory();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, loadHistory]);

  // Subscribe to config and deposit history updates
  useEffect(() => {
    if (!isOpen) return;
    const unsub = dataService.subscribe(() => {
      setSepayConfig(dataService.getSePayConfig());
      loadHistory();
    });
    return () => unsub();
  }, [isOpen, loadHistory]);

  // Real-time background listener for SePay Webhook incoming payment & balance sync
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let isMounted = true;

    const checkBalance = async () => {
      try {
        await dataService.refreshCurrentUserBalance();
        if (!isMounted) return;

        const currentUser = dataService.getCurrentUser();
        if (currentUser && currentUser.wallet_balance !== lastKnownBalanceRef.current) {
          const added = currentUser.wallet_balance - lastKnownBalanceRef.current;
          lastKnownBalanceRef.current = currentUser.wallet_balance;
          onUpdateUserRef.current(currentUser);
          loadHistory();
          if (added > 0) {
            triggerSuccessModal(added, currentUser.wallet_balance);
          }
        }
      } catch (err) {
        console.warn('[Wallet] checkBalance error:', err);
      }
    };

    // Initial check on modal open
    checkBalance();

    // Periodic polling every 6 seconds when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkBalance();
      }
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, user?.id, loadHistory]);

  const triggerSuccessModal = (amount: number, newBalance: number) => {
    marketingService.recordRealDeposit(amount, user?.full_name || user?.username || 'Thành viên');
    if (user?.id) {
      try {
        growthService.handleDepositCommission(user.id, amount);
      } catch (comErr) {
        console.warn('[UserWalletModal] commission error:', comErr);
      }
    }
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.55 },
      colors: ['#10B981', '#6366F1', '#F59E0B', '#38BDF8'],
    });

    setSuccessInfo({
      amount,
      newBalance,
      txId: `MBB_${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    });

    onShowToast(
      'Nạp Core Thành Công!',
      `Hệ thống đã tự động ghi nhận +${formatCore(amount)} vào ví của bạn.`,
      'success'
    );
  };

  const topupAmount = parseInt(customInput.replace(/\D/g, ''), 10) || 0;
  const isBelowMin = customInput !== '' && topupAmount > 0 && topupAmount < MIN_TOPUP;
  const isValidAmount = customInput === '' || topupAmount >= MIN_TOPUP;

  const isLoggedIn = Boolean(user && user.id && !user.id.startsWith('guest_') && user.role !== 'guest');
  const currentBalance = user?.wallet_balance || 0;
  const rawUserId = user?.id || '';
  const cleanId = (user?.id || user?.username || 'member').trim();

  const memberCode = (user?.id || user?.username || '').trim();
  const rawPrefix = (sepayConfig?.paymentPrefix || 'WCG').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = rawPrefix || 'WCG';
  const transferContent = `${prefix} ${memberCode}`;

  const bankAccount = sepayConfig?.bankAccount || 'CODE GAME SHOP';
  const accountNumber = sepayConfig?.accountNumber || '10004681879';
  const rawBankName = sepayConfig?.bankName || 'TPBank';

  const qrData = React.useMemo(() => buildVietQrUrl({
    accountNumber,
    bankName: rawBankName,
    amount: topupAmount,
    content: transferContent,
    accountName: bankAccount,
  }), [accountNumber, rawBankName, topupAmount, transferContent, bankAccount]);

  const displayBankName = qrData.bankInfo.name;

  // Generate local Base64 VietQR data URL immediately for 0ms render & 100% adblocker immunity
  useEffect(() => {
    let isMounted = true;
    if (isOpen && isValidAmount && !isBelowMin && accountNumber) {
      generateVietQrDataUrl({
        accountNumber,
        bankName: rawBankName,
        amount: topupAmount,
        content: transferContent,
      })
        .then((url) => {
          if (isMounted) setQrDataUrl(url);
        })
        .catch((err) => {
          console.warn('[VietQR] Failed to generate local QR data URL, falling back to CDN:', err);
          if (isMounted) setQrDataUrl(qrData.primaryUrl);
        });
    } else {
      setQrDataUrl('');
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, isValidAmount, isBelowMin, accountNumber, rawBankName, topupAmount, transferContent, qrData.primaryUrl]);

  if (!isOpen) return null;

  const quickAmounts = [
    { core: 10000 },
    { core: 20000 },
    { core: 50000 },
    { core: 100000 },
    { core: 200000 },
    { core: 500000 },
    { core: 1000000 },
    { core: 2000000 },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
    onShowToast('Đã sao chép!', text, 'info');
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setCustomInput('');
      return;
    }
    const num = parseInt(val, 10);
    if (num > 500000000) {
      setCustomInput('500000000');
    } else {
      setCustomInput(num.toString());
    }
  };

  const handleCloseAndWait = () => {
    onClose();
    onShowToast(
      'Hệ thống đang xác minh giao dịch',
      'Hệ thống SePay sẽ tự động kiểm tra và cộng Core vào ví trong 30s - 2 phút. Bạn có thể mở lại mục Lịch Sử Nạp Core để kiểm tra.',
      'info'
    );
  };

  const totalDeposited = depositHistory
    .filter((t) => t && (t.status === 'COMPLETED' || t.status === 'SUCCESS' || t.status === 'completed'))
    .reduce((sum, t) => sum + Number(t.amount || t.amount_in || t.coreAmount || 0), 0);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-card border-t sm:border border-border/90 rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= SUCCESS NOTIFICATION OVERLAY CARD ================= */}
        {successInfo ? (
          <div className="relative p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5 animate-scale-in">
            {/* Top Close Button */}
            <button
              onClick={() => {
                setSuccessInfo(null);
                onClose();
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer transition-all active:scale-95 shadow-md"
              aria-label="Đóng"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10 shadow-glow animate-bounce">
                <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
              </div>
              <Sparkles className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-spin" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> SePay Auto Confirmed
              </span>
              <h3 className="font-heading font-black text-2xl sm:text-3xl text-foreground tracking-tight">
                NẠP CORE THÀNH CÔNG!
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Hệ thống SePay đã tự động nhận diện giao dịch và cộng tiền vào tài khoản của bạn.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="w-full rounded-2xl bg-muted/50 border border-border p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Số Core đã nhận:</span>
                <span className="font-display font-black text-xl text-emerald-400 font-mono">
                  +{formatCore(successInfo.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Số dư khả dụng mới:</span>
                <span className="font-bold text-foreground font-mono text-sm">
                  {formatCore(successInfo.newBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tài khoản nhận:</span>
                <span className="font-semibold text-foreground">
                  {user?.displayName || user?.username} ({cleanId})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Thời gian ghi nhận:</span>
                <span className="font-mono text-muted-foreground">{successInfo.timestamp}</span>
              </div>
            </div>

            {/* Complete / Continue Button */}
            <button
              onClick={() => {
                setSuccessInfo(null);
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-display font-bold text-sm shadow-glow-primary transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Xác Nhận & Tiếp Tục Mua Sắm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : !isLoggedIn ? (
          /* ================= AUTH REQUIRED VIEW ================= */
          <div className="relative p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5 animate-scale-in">
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer transition-all active:scale-95"
              aria-label="Đóng"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-sm mt-2">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-foreground">
                Yêu Cầu Đăng Nhập
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Bạn cần đăng nhập hoặc tạo tài khoản thành viên để nạp Core tự động qua cổng SePay và đảm bảo tiền được cộng chính xác vào ví của bạn.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth();
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-glow-primary cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập / Đăng Ký Ngay</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer border border-border"
              >
                Để sau
              </button>
            </div>
          </div>
        ) : (
          /* ================= MAIN INTERFACE: NẠP CORE VÀ LỊCH SỬ ================= */
          <>
            {/* Header - Fixed at top */}
            <div className="p-3.5 sm:p-5 border-b border-border/70 bg-card/95 backdrop-blur-md shrink-0 sticky top-0 z-20 space-y-3">
              {/* Mobile Sheet Indicator */}
              <div className="w-12 h-1.5 bg-slate-600/60 rounded-full mx-auto mb-1 sm:hidden shrink-0" />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-primary/20 text-primary-light shrink-0">
                    <Coins className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-bold text-base sm:text-lg text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>Nạp Core & Lịch Sử</span>
                      <span className="text-[10px] font-mono font-bold bg-primary/15 text-primary-light px-2 py-0.5 rounded-full border border-primary/30">
                        Tự Động 24/7
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      Tài khoản: <strong className="text-foreground">{user?.displayName || user?.username || 'Khách'}</strong> (ID: {cleanId})
                    </p>
                  </div>
                </div>
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 shadow-md cursor-pointer transition-all active:scale-90 flex items-center justify-center shrink-0"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Tab Switcher: Nạp Core / Lịch Sử Nạp */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/70 rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('TOPUP')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'TOPUP'
                      ? 'bg-card text-foreground shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${activeTab === 'TOPUP' ? 'text-teal-400' : ''}`} />
                  <span>Nạp Core (VietQR)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('HISTORY');
                    loadHistory();
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'HISTORY'
                      ? 'bg-card text-foreground shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History className={`w-3.5 h-3.5 ${activeTab === 'HISTORY' ? 'text-amber-400' : ''}`} />
                  <span>Lịch Sử Nạp</span>
                  {depositHistory.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                      {depositHistory.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-4 sm:p-6 space-y-5">
              {activeTab === 'TOPUP' ? (
                /* ================= TAB 1: NẠP CORE (VIETQR) ================= */
                <div className="space-y-3.5 animate-fade-in">
                  {/* 1. Gọn gàng: Thanh Số Dư Khả Dụng */}
                  <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-primary/20 to-slate-900 border border-primary/30 shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/25 text-primary-light flex items-center justify-center border border-primary/30 shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight tracking-wider">
                          Số Dư Khả Dụng
                        </span>
                        <div className="font-display font-black text-base sm:text-lg text-white leading-tight flex items-baseline gap-1 truncate">
                          <span>{Number(currentBalance).toLocaleString('vi-VN')}</span>
                          <span className="text-xs font-bold text-amber-400">Core</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        ⚡ Tự Động 24/7
                      </span>
                    </div>
                  </div>

                  {/* 2. SỐ TIỀN MẪU THAM KHẢO (CHO LÊN TRÊN) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Số tiền mẫu tham khảo:</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Tối thiểu: <span className="font-mono font-bold text-emerald-400">{Number(MIN_TOPUP).toLocaleString('vi-VN')} đ</span>
                      </span>
                    </div>

                    {/* Presets Grid - Siêu gọn gàng 4 cột */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {quickAmounts.map((amt) => {
                        const isSelected = topupAmount === amt.core;
                        return (
                          <button
                            key={amt.core}
                            type="button"
                            onClick={() => {
                              setCustomInput(amt.core.toString());
                              setIsInputFocused(false);
                            }}
                            className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary text-white border-primary shadow-sm font-bold scale-[1.02]'
                                : 'bg-muted/40 hover:bg-muted/70 border-border text-foreground hover:border-slate-600 font-medium'
                            }`}
                          >
                            <span className="font-mono text-xs block leading-tight">
                              +{Number(amt.core).toLocaleString('vi-VN')}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {isBelowMin && (
                      <div className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-xl animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Mức nạp tối thiểu là {Number(MIN_TOPUP).toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                  </div>

                  {/* 3. KHUNG MÃ QR VÀ CHI TIẾT CHUYỂN KHOẢN */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-primary-light shrink-0" />
                        <span>Quét mã VietQR hoặc chuyển khoản:</span>
                      </span>
                      {topupAmount > 0 ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0">
                          +{Number(topupAmount).toLocaleString('vi-VN')} Core
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 shrink-0">
                          Tự do số tiền
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3.5">
                      {/* Dynamic / Static VietQR Image Frame */}
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white rounded-xl p-2 shrink-0 shadow-sm flex items-center justify-center border border-slate-300 dark:border-border">
                        {!isBelowMin ? (
                          qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              alt="Mã QR Chuyển Khoản Nạp Core"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={qrData.primaryUrl}
                              alt="Mã QR Chuyển Khoản Nạp Core"
                              className="w-full h-full object-contain"
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (qrDataUrl) {
                                   target.src = qrDataUrl;
                                } else if (target.src !== qrData.fallbackUrl) {
                                  target.src = qrData.fallbackUrl;
                                }
                              }}
                            />
                          )
                        ) : (
                          <div className="text-center p-2 text-rose-400 text-[10.5px] font-medium flex flex-col items-center justify-center gap-1.5 h-full">
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                            <span>Tối thiểu {Number(MIN_TOPUP).toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}
                      </div>

                      {/* Bank Transfer Details */}
                      <div className="flex-1 space-y-1.5 text-xs w-full min-w-0">
                        {/* Nhập số tiền - Ô input tùy chọn số tiền */}
                        <div
                          className={`flex items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded-xl border transition-all ${
                            isBelowMin
                              ? 'bg-rose-500/10 border-rose-500/40 focus-within:ring-1 focus-within:ring-rose-500/50'
                              : 'bg-muted/40 hover:bg-muted/60 focus-within:bg-card focus-within:ring-1 focus-within:ring-primary/60 border-border'
                          }`}
                        >
                          <label
                            htmlFor="topup-amount-input"
                            className="text-muted-foreground text-[11px] font-medium shrink-0 pl-1 cursor-pointer flex items-center gap-1"
                          >
                            <span>Nhập số tiền:</span>
                            <SlidersHorizontal className="w-3 h-3 text-amber-400/80" title="Bấm để nhập số tiền" />
                          </label>
                          <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                            <div className="relative flex items-center min-w-0 max-w-[140px] sm:max-w-[165px]">
                              <input
                                id="topup-amount-input"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                data-gramm="false"
                                value={
                                  isInputFocused
                                    ? customInput
                                    : (customInput ? Number(customInput).toLocaleString('vi-VN') : '')
                                }
                                onChange={handleCustomInputChange}
                                onFocus={(e) => {
                                  setIsInputFocused(true);
                                  const target = e.currentTarget;
                                  setTimeout(() => target.select(), 20);
                                }}
                                onClick={(e) => {
                                  const target = e.currentTarget;
                                  if (customInput) {
                                    setTimeout(() => target.select(), 20);
                                  }
                                }}
                                onBlur={() => {
                                  setIsInputFocused(false);
                                }}
                                placeholder="Nhập số tiền"
                                className={`w-full text-right font-mono font-black text-sm bg-transparent border-0 focus:outline-none focus:ring-0 ${
                                  customInput ? 'pr-8' : 'pr-4'
                                } p-0 ${
                                  isBelowMin ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                                title="Bấm để nhập số tiền"
                              />

                              {/* Nút xóa nhanh số tiền để nhập mới không lo bị đúp số */}
                              {customInput && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomInput('');
                                    const el = document.getElementById('topup-amount-input');
                                    el?.focus();
                                  }}
                                  className="absolute right-4 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer"
                                  title="Xóa số tiền để nhập lại"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}

                              <span className="absolute right-0 text-[11px] font-bold text-muted-foreground select-none pointer-events-none">
                                đ
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (topupAmount > 0) {
                                  handleCopy(topupAmount.toString(), 'amount');
                                }
                              }}
                              className="text-primary-light hover:underline p-1 cursor-pointer shrink-0"
                              title="Sao chép số tiền"
                            >
                              {copiedKey === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Nội dung CK */}
                        <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/30 p-2 rounded-xl">
                          <span className="text-indigo-300 font-semibold text-[11px]">Nội dung CK:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded tracking-wider text-xs">
                              {transferContent}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(transferContent, 'des')}
                              className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                              title="Sao chép nội dung chuyển khoản"
                            >
                              {copiedKey === 'des' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === 'des' ? 'Đã chép' : 'Sao chép'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Số tài khoản */}
                        <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border border-border">
                          <span className="text-muted-foreground text-[11px]">Số tài khoản:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-foreground">{accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(accountNumber, 'acc')}
                              className="text-primary-light hover:underline p-0.5 cursor-pointer"
                              title="Sao chép STK"
                            >
                              {copiedKey === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Ngân hàng */}
                        <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border border-border">
                          <span className="text-muted-foreground text-[11px]">Ngân hàng:</span>
                          <span className="font-semibold text-foreground text-[11px] truncate max-w-[180px]" title={displayBankName}>
                            {displayBankName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. DÒNG GHI CHÚ NHẬN TIỀN (CHUYỂN ĐẾN CUỐI TRANG) */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Giữ <strong>đúng nội dung chuyển khoản</strong> để hệ thống tự động nhận tiền và cộng Core sau 15s - 2 phút.</span>
                  </div>

                  {/* 5. Nút Đóng & Chờ Xác Minh */}
                  <button
                    type="button"
                    onClick={handleCloseAndWait}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-foreground font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đóng và chờ hệ thống xác minh (15s - 2 phút)</span>
                  </button>
                </div>
              ) : (
                /* ================= TAB 2: LỊCH SỬ NẠP CORE ================= */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-muted/50 border border-border">
                      <span className="text-[11px] text-muted-foreground block">Tổng số lần nạp</span>
                      <span className="font-display font-black text-lg text-foreground">
                        {depositHistory.filter((t) => t && (t.status === 'COMPLETED' || t.status === 'SUCCESS' || t.status === 'completed')).length} <span className="text-xs font-normal text-muted-foreground">lần</span>
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-muted/50 border border-border">
                      <span className="text-[11px] text-muted-foreground block">Tổng Core đã nạp</span>
                      <span className="font-display font-black text-lg text-emerald-400 font-mono">
                        +{formatCore(totalDeposited)}
                      </span>
                    </div>
                  </div>

                  {/* History List */}
                  {depositHistory.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-2xl bg-muted/30 border border-border space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground/60">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <h4 className="font-heading font-bold text-sm text-foreground">
                        Chưa có lịch sử nạp Core
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Các giao dịch nạp tiền qua cổng VietQR SePay sẽ được tự động lưu và hiển thị chi tiết tại đây.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('TOPUP')}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-glow-primary cursor-pointer transition-all inline-flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Nạp Core Ngay</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                        <span>Danh sách giao dịch ({depositHistory.length})</span>
                        <button
                          onClick={loadHistory}
                          className="hover:text-foreground flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Làm mới</span>
                        </button>
                      </div>

                      {depositHistory.map((tx, idx) => {
                        if (!tx) return null;
                        const isSuccess = tx.status === 'COMPLETED' || tx.status === 'SUCCESS' || tx.status === 'completed';
                        const amount = Number(tx.amount || tx.amount_in || tx.coreAmount || 0);
                        const noteText = tx.note || tx.description || tx.transaction_content || '';
                        const dateText = tx.createdAt || tx.created_at || tx.timestamp || tx.date;

                        return (
                          <div
                            key={tx.id || tx.txId || tx.referenceId || `dep_${idx}`}
                            className="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border hover:border-border/80 transition-all space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0 mt-0.5">
                                  <ArrowDownLeft className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-xs text-foreground block truncate">
                                    Nạp Core qua SePay (VietQR)
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground block truncate">
                                    Mã GD: {tx.referenceId || tx.txId || tx.id || 'SEPAY'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-display font-black text-sm text-emerald-400 font-mono block">
                                  +{formatCore(amount)}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isSuccess
                                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                      : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                  }`}
                                >
                                  ● {isSuccess ? 'Thành công' : 'Đang xử lý'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between text-[10px] text-muted-foreground gap-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatFullDateTime(dateText)}
                              </span>
                              {tx.balanceAfter !== undefined && (
                                <span>
                                  Số dư sau nạp: <strong className="text-foreground font-mono">{formatCore(tx.balanceAfter)}</strong>
                                </span>
                              )}
                            </div>

                            {noteText && (
                              <div className="text-[10px] bg-card/60 px-2 py-1 rounded-lg border border-border/60 text-slate-300 font-mono truncate">
                                Nội dung CK: {noteText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
