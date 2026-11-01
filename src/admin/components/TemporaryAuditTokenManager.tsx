import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Terminal,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Step2VerificationModal } from './ui/Step2VerificationModal';
import { adminDataService } from '../services/adminDataService';

interface TemporaryAuditTokenManagerProps {
  onShowToast?: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TemporaryAuditTokenManager: React.FC<TemporaryAuditTokenManagerProps> = ({ onShowToast }) => {
  const [tokenData, setTokenData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHours, setSelectedHours] = useState<number>(2);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showFullToken, setShowFullToken] = useState(false);

  // Step 2 Verification Modal state
  const [step2Action, setStep2Action] = useState<{
    type: 'GENERATE' | 'REVOKE';
    title: string;
    actionTitle: string;
    details: React.ReactNode;
    confirmText: string;
    variant: 'warning' | 'danger';
  } | null>(null);

  // Fetch current token status
  const loadTokenStatus = async () => {
    setIsLoading(true);
    try {
      const res = await adminDataService.getTemporaryAuditTokenStatus();
      if (res && res.success && res.tokenData) {
        setTokenData(res.tokenData);
      } else {
        setTokenData(null);
      }
    } catch {
      setTokenData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTokenStatus();
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (!tokenData || tokenData.isExpired || tokenData.isRevoked || tokenData.remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setTokenData((prev: any) => {
        if (!prev) return null;
        const nextRem = prev.remainingSeconds - 1;
        if (nextRem <= 0) {
          return { ...prev, remainingSeconds: 0, isExpired: true };
        }
        return { ...prev, remainingSeconds: nextRem };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenData?.token, tokenData?.isExpired, tokenData?.isRevoked]);

  // Format remaining time
  const formatRemainingTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return 'Đã hết hạn';
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours} giờ ${mins} phút ${secs}s`;
    }
    return `${mins} phút ${secs}s`;
  };

  // Copy to clipboard
  const handleCopy = (text: string, type: string = 'token') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setCopiedType(type);
      setTimeout(() => {
        setIsCopied(false);
        setCopiedType(null);
      }, 2500);
      onShowToast?.('Đã sao chép', `Đã chép ${type === 'token' ? 'Mã Token' : 'Lệnh curl'} vào clipboard.`, 'success');
    }
  };

  // Trigger Step 2 for Generate / Rotate
  const handleRequestGenerate = () => {
    setStep2Action({
      type: 'GENERATE',
      title: 'Xác Minh Bước 2: Cấp Quyền & Tạo Khóa Kiểm Toán',
      actionTitle: `Cấp Khóa Kiểm Toán Tạm Thời (Thời Hạn ${selectedHours} Giờ)`,
      details: (
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <p>• Khóa này cho phép AI/Auditor bên ngoài (như Pine AI) đọc dữ liệu hệ thống trong <strong>{selectedHours} giờ</strong>.</p>
          <p>• Quyền hạn: <strong>CHỈ ĐỌC (Read-Only 100%)</strong> cho Snapshot kho hàng, Database D1 và Module Marketing.</p>
          <p>• Nghiêm cấm mọi thao tác ghi/sửa dữ liệu. Hết thời gian, hệ thống tự động khóa.</p>
          <p className="font-bold text-amber-600 dark:text-amber-400 pt-1">Vui lòng nhập mã bảo mật bước 2 để hoàn tất cấp quyền.</p>
        </div>
      ),
      confirmText: `Xác Nhận & Cấp Khóa (${selectedHours}h)`,
      variant: 'warning',
    });
  };

  // Trigger Step 2 for Revoke
  const handleRequestRevoke = () => {
    setStep2Action({
      type: 'REVOKE',
      title: 'Xác Minh Bước 2: Thu Hồi & Vô Hiệu Hóa Khóa',
      actionTitle: 'CẢNH BÁO: Vô hiệu hóa quyền truy cập của bên ngoài ngay lập tức',
      details: (
        <div className="space-y-1.5 text-xs text-rose-600 dark:text-rose-400">
          <p>• Khóa kiểm toán hiện tại sẽ bị hủy hiệu lực ngay lập tức.</p>
          <p>• Mọi yêu cầu tiếp theo từ AI/Auditor sẽ bị máy chủ Cloudflare từ chối với mã lỗi <strong>401 Unauthorized</strong>.</p>
          <p className="font-bold underline pt-1">Hành động này có hiệu lực tức thì trên toàn cầu.</p>
        </div>
      ),
      confirmText: 'Xác Nhận & Thu Hồi Ngay',
      variant: 'danger',
    });
  };

  // Handle Step 2 Success callback
  const handleStep2Success = async () => {
    if (!step2Action) return;

    if (step2Action.type === 'GENERATE') {
      setIsLoading(true);
      const res = await adminDataService.generateTemporaryAuditToken(selectedHours);
      setIsLoading(false);
      if (res && res.success && res.tokenData) {
        setTokenData(res.tokenData);
        onShowToast?.(
          'Tạo Khóa Thành Công',
          `Xác thực bước 2 thành công! Khóa kiểm toán mới có hiệu lực trong ${selectedHours} giờ.`,
          'success'
        );
      } else {
        onShowToast?.('Thất Bại', res?.error || 'Không thể tạo khóa kiểm toán', 'error');
      }
    } else if (step2Action.type === 'REVOKE') {
      setIsLoading(true);
      const res = await adminDataService.revokeTemporaryAuditToken();
      setIsLoading(false);
      if (res && res.success) {
        setTokenData((prev: any) => (prev ? { ...prev, isRevoked: true, remainingSeconds: 0 } : null));
        onShowToast?.('Đã Thu Hồi', 'Xác thực bước 2 thành công! Đã vô hiệu hóa khóa kiểm toán.', 'success');
      } else {
        onShowToast?.('Thất Bại', res?.error || 'Không thể thu hồi khóa', 'error');
      }
    }

    setStep2Action(null);
  };

  const isActive = Boolean(tokenData && !tokenData.isExpired && !tokenData.isRevoked && tokenData.remainingSeconds > 0);

  return (
    <div className="space-y-5">
      {/* Main Container Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-foreground">
                  Khóa Kiểm Toán Tạm Thời (2FA Security)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Xác Thực Bước 2
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cấp quyền CHỈ ĐỌC có thời hạn (1h - 24h) cho Pine AI hoặc chuyên gia bên ngoài soi dữ liệu kho và Marketing. Tự động hết hạn, không lo rò rỉ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={loadTokenStatus}
              disabled={isLoading}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Làm mới trạng thái khóa"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Current Active Token Status */}
        {isActive ? (
          <div className="p-4 sm:p-5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Khóa Đang Hoạt Động (Chỉ Đọc)
                </span>
              </div>

              {/* Countdown Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-card/80 border border-border text-xs font-mono font-bold text-purple-300">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Còn lại: {formatRemainingTime(tokenData.remainingSeconds)}</span>
              </div>
            </div>

            {/* Token String Display */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Mã Token Bearer (Gửi cho Pine AI):</span>
                <button
                  type="button"
                  onClick={() => setShowFullToken(!showFullToken)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showFullToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showFullToken ? 'Ẩn bớt' : 'Hiện đầy đủ'}</span>
                </button>
              </label>

              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-xl bg-card border border-border font-mono text-xs text-foreground overflow-x-auto select-all">
                  {showFullToken ? tokenData.token : `${tokenData.token.slice(0, 22)}••••••••••••••••••••${tokenData.token.slice(-10)}`}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(tokenData.token, 'token')}
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                  title="Sao chép mã Token"
                >
                  {isCopied && copiedType === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied && copiedType === 'token' ? 'Đã chép' : 'Chép Token'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Hết hạn lúc: <strong className="text-foreground">{tokenData.expiresAtVn}</strong></span>
                <span className="text-emerald-400">🛡️ Tự động hủy, an toàn tuyệt đối</span>
              </div>
            </div>

            {/* Actions for active token */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-purple-500/20">
              <button
                type="button"
                onClick={handleRequestRevoke}
                className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Hủy hiệu lực khóa ngay lập tức (Cần xác thực bước 2)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Thu Hồi & Vô Hiệu Hóa Ngay (2FA)</span>
              </button>

              <div className="text-[11px] text-muted-foreground italic">
                * Mọi thao tác đổi thời hạn hoặc thu hồi đều yêu cầu mã xác minh bước 2.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-muted border border-border mx-auto flex items-center justify-center text-muted-foreground">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {tokenData?.isRevoked
                ? 'Khóa kiểm toán trước đó đã bị thu hồi / vô hiệu hóa'
                : tokenData?.isExpired
                ? 'Khóa kiểm toán trước đó đã hết thời hạn sử dụng'
                : 'Chưa có Khóa Kiểm Toán Tạm Thời nào đang hoạt động'}
            </p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              Khi cần nhờ Pine AI hoặc chuyên gia ngoài soi dữ liệu đối soát, hãy chọn thời hạn bên dưới và bấm cấp khóa.
            </p>
          </div>
        )}

        {/* Form: Chọn thời hạn & Tạo / Đổi mã mới */}
        <div className="p-4 rounded-xl bg-card border border-border/80 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-foreground">
              {isActive ? 'Đổi Khóa Mới Hoặc Thay Đổi Thời Hạn' : 'Tạo Khóa Kiểm Toán Tạm Thời Mới'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Chọn Thời Hạn Hiệu Lực:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { hours: 1, label: '1 Giờ' },
                  { hours: 2, label: '2 Giờ' },
                  { hours: 4, label: '4 Giờ' },
                  { hours: 12, label: '12 Giờ' },
                  { hours: 24, label: '24 Giờ' },
                ].map((item) => (
                  <button
                    key={item.hours}
                    type="button"
                    onClick={() => setSelectedHours(item.hours)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                      selectedHours === item.hours
                        ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                        : 'bg-muted/60 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleRequestGenerate}
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isActive ? `Đổi Khóa (${selectedHours}h) - Cần Bước 2` : `Tạo Khóa (${selectedHours}h) - Cần Bước 2`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sample cURL Commands Box */}
        {isActive && (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Lệnh Mẫu Gửi Cho Pine AI / Chuyên Gia Ngoài:
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">Chỉ-đọc 100%</span>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: 'curl_snapshot',
                  name: '1. Đọc Snapshot số ảo / kho thật:',
                  cmd: `curl -X GET "https://codegame.shop/api/crawler/marketing?action=get_metrics_snapshot" \\\n  -H "Authorization: Bearer ${tokenData.token}"`,
                },
                {
                  id: 'curl_sync',
                  name: '2. Đọc Database State gốc trong D1:',
                  cmd: `curl -X GET "https://codegame.shop/api/sync" \\\n  -H "Authorization: Bearer ${tokenData.token}"`,
                },
                {
                  id: 'curl_counters',
                  name: '3. Quét đối soát kho hàng (Dry-Run):',
                  cmd: `curl -X GET "https://codegame.shop/api/admin/audit-counters" \\\n  -H "Authorization: Bearer ${tokenData.token}"`,
                },
              ].map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 text-xs font-mono relative group">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.cmd, item.id)}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      {isCopied && copiedType === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied && copiedType === item.id ? 'Đã chép' : 'Chép lệnh'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] whitespace-pre-wrap break-all text-emerald-300">
                    {item.cmd}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2 Security Verification Modal (Mã xác minh bước 2) */}
      {step2Action && (
        <Step2VerificationModal
          isOpen={Boolean(step2Action)}
          onClose={() => setStep2Action(null)}
          onSuccess={handleStep2Success}
          title={step2Action.title}
          actionTitle={step2Action.actionTitle}
          actionDetails={step2Action.details}
          confirmButtonText={step2Action.confirmText}
          variant={step2Action.variant}
        />
      )}
    </div>
  );
};
