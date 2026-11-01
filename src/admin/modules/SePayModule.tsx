import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Play,
  ShieldCheck,
  Radio,
  FileCode,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  QrCode,
  AlertCircle,
  Coins,
  Server,
} from 'lucide-react';
import { DataTable, Column } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FormModal } from '../components/ui/FormModal';
import { Step2VerificationModal } from '../components/ui/Step2VerificationModal';
import { adminDataService } from '../services/adminDataService';
import { SePayConfig, SePayWebhookLog, MemberRecord } from '../types/adminTypes';
import { formatFullDateTime } from '../../utils/textUtils';
import { formatCore, formatCurrencyVND } from '../../utils/textUtils';
import { buildVietQrUrl, normalizeBank } from '../../utils/vietQrUtils';

interface SePayModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

const SUPPORTED_BANKS = [
  { code: 'MBBank', name: 'MBBank (Ngân Hàng Quân Đội)' },
  { code: 'VietinBank', name: 'VietinBank (Ngân Hàng Công Thương)' },
  { code: 'Vietcombank', name: 'Vietcombank (Ngân Hàng Ngoại Thương)' },
  { code: 'Techcombank', name: 'Techcombank (Kỹ Thương Việt Nam)' },
  { code: 'TPBank', name: 'TPBank (Ngân Hàng Tiên Phong)' },
  { code: 'VPBank', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { code: 'ACB', name: 'ACB (Ngân Hàng Á Châu)' },
  { code: 'BIDV', name: 'BIDV (Đầu Tư và Phát Triển)' },
  { code: 'Sacombank', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { code: 'MSB', name: 'MSB (Hàng Hải Việt Nam)' },
];

export const SePayModule: React.FC<SePayModuleProps> = ({ onShowToast }) => {
  const [config, setConfig] = useState<SePayConfig | null>(null);
  const [logs, setLogs] = useState<SePayWebhookLog[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Configuration Form State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('MBBank');
  const [paymentPrefix, setPaymentPrefix] = useState('WCG');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isStep2ConfigModalOpen, setIsStep2ConfigModalOpen] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Webhook Test Simulator State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testMemberId, setTestMemberId] = useState('');
  const [testAmount, setTestAmount] = useState(50000);
  const [testTxId, setTestTxId] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Manual Credit / Compensation State
  const [isManualCreditModalOpen, setIsManualCreditModalOpen] = useState(false);
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualAmount, setManualAmount] = useState(50000);
  const [manualTxId, setManualTxId] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  useEffect(() => {
    setMembers(adminDataService.getMembers());
    loadSePayData();
  }, []);

  const loadSePayData = async () => {
    setIsLoading(true);
    try {
      await adminDataService.fetchFromCloudflareKV().catch(() => {});
    } catch {}
    setMembers(adminDataService.getMembers());
    const cfg = adminDataService.getSePayConfig();
    setConfig(cfg);
    if (cfg) {
      setApiKey(cfg.apiKey || '');
      setBankAccount(cfg.bankAccount || 'CONG TY TNHH WEB CODE GAME');
      setAccountNumber(cfg.accountNumber || '0987654321');
      setBankName(cfg.bankName || 'MBBank');
      setPaymentPrefix(cfg.paymentPrefix || 'WCG');
    }
    const l = adminDataService.getSePayLogs();
    setLogs(l);
    setIsLoading(false);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
    onShowToast('Đã sao chép vào bộ nhớ đệm', text, 'info');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountNumber.trim()) {
      onShowToast('Thiếu Số Tài Khoản', 'Vui lòng nhập số tài khoản ngân hàng nhận tiền.', 'error');
      return;
    }
    if (!bankAccount.trim()) {
      onShowToast('Thiếu Tên Chủ Tài Khoản', 'Vui lòng nhập tên chủ tài khoản ngân hàng.', 'error');
      return;
    }

    // Bắt buộc xác thực bảo mật bước 2 (2FA) trước khi cho phép lưu cấu hình tài khoản
    setIsStep2ConfigModalOpen(true);
  };

  const executeSaveConfig = async () => {
    setIsSavingConfig(true);

    try {
      const updated = await adminDataService.updateSePayConfig({
        apiKey: apiKey.trim(),
        bankAccount: bankAccount.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName,
        paymentPrefix: paymentPrefix.trim() || 'WCG',
        isConnected: Boolean(apiKey.trim()),
        webhookSecretSet: true,
        autoCreditCoreRatio: 1,
      });

      setConfig(updated);
      setIsSavingConfig(false);
      onShowToast(
        'Đã Lưu & Đồng Bộ SePay Thành Công!',
        'Cổng thanh toán tự động và thông tin tài khoản ngân hàng đã được xác minh bảo mật 2 bước, đồng bộ lên Cloudflare D1 và áp dụng tức thì tới web khách hàng.',
        'success'
      );
    } catch (err: any) {
      setIsSavingConfig(false);
      onShowToast('Lỗi lưu cấu hình', err?.message || 'Không thể đồng bộ lên máy chủ.', 'error');
    }
  };

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      onShowToast('Thiếu API Key', 'Vui lòng nhập SePay API Key để kiểm tra kết nối.', 'error');
      return;
    }

    setIsTestingApiKey(true);
    setApiTestResult(null);

    const result = await adminDataService.testSePayApiKey(apiKey);
    setIsTestingApiKey(false);
    setApiTestResult(result);

    if (result.success) {
      onShowToast('Kết Nối SePay Thành Công!', result.message, 'success');
    } else {
      onShowToast('Kiểm Tra Thất Bại', result.message, 'error');
    }
  };

  const handleOpenSimulator = () => {
    const defaultM = members[0];
    const randTx = 'SEPAY' + Math.floor(100000 + Math.random() * 900000);
    setTestMemberId(defaultM?.id || 'usr-1');
    setTestAmount(50000);
    setTestTxId(randTx);
    setIsTestModalOpen(true);
  };

  const handleSimulateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);

    const m = members.find((x) => x.id === testMemberId) || members[0];
    const content = `${paymentPrefix} ${m?.id || 'usr-1'}`;

    setTimeout(() => {
      const log = adminDataService.simulateSePayWebhook({
        transactionId: testTxId,
        amount: testAmount,
        content: content,
        gateway: bankName || 'MBBank',
        accountNumber: accountNumber || '0987654321',
      });

      setIsSimulating(false);
      setIsTestModalOpen(false);

      if (log.status === 'SUCCESS') {
        onShowToast(
          'Giả lập Webhook thành công!',
          `Đã tự động cộng ${formatCore(testAmount)} (quy đổi từ ${formatCurrencyVND(testAmount)}) vào ví của ${m?.displayName || 'khách'}.`,
          'success'
        );
      } else {
        onShowToast('Webhook Thất Bại', log.errorMessage || 'Lỗi xử lý', 'error');
      }

      loadSePayData();
    }, 600);
  };

  const handleOpenManualCredit = (prefill?: {
    transactionId?: string;
    amount?: number;
    content?: string;
    memberId?: string;
  }) => {
    if (prefill) {
      setManualTxId(prefill.transactionId || `MANUAL_${Date.now()}`);
      setManualAmount(prefill.amount || 50000);
      setManualNote(
        prefill.content
          ? `Bù nạp SePay (GD: ${prefill.transactionId || ''} - ${prefill.content})`
          : 'Duyệt bù tiền giao dịch SePay'
      );
      // Auto detect member from prefill
      let foundMember = prefill.memberId
        ? members.find((m) => m.id === prefill.memberId)
        : null;
      if (!foundMember && prefill.content) {
        const cLower = prefill.content.toLowerCase();
        foundMember = members.find(
          (m) =>
            (m.id && cLower.includes(m.id.toLowerCase())) ||
            (m.username && cLower.includes(m.username.toLowerCase())) ||
            (m.email && cLower.includes(m.email.toLowerCase()))
        ) || null;
      }
      setManualMemberId(foundMember?.id || members[0]?.id || '');
    } else {
      setManualTxId(`MANUAL_${Date.now()}`);
      setManualAmount(50000);
      setManualNote('Bù tiền / Nạp Core thủ công cho khách');
      setManualMemberId(members[0]?.id || '');
    }
    setIsManualCreditModalOpen(true);
  };

  const handleConfirmManualCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMemberId) {
      onShowToast('Thiếu thành viên', 'Vui lòng chọn thành viên cần nạp.', 'error');
      return;
    }
    if (!manualAmount || manualAmount <= 0) {
      onShowToast('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0.', 'error');
      return;
    }

    setIsSubmittingCredit(true);
    try {
      const res = await adminDataService.creditSepayDepositManually({
        memberId: manualMemberId,
        amount: manualAmount,
        transactionId: manualTxId,
        note: manualNote,
        gateway: bankName || 'SePay',
      });

      setIsSubmittingCredit(false);
      if (res.success) {
        setIsManualCreditModalOpen(false);
        onShowToast('Duyệt Nạp Thành Công!', res.message, 'success');
        await loadSePayData();
      } else {
        onShowToast('Duyệt Nạp Thất Bại', res.message, 'error');
      }
    } catch (err: any) {
      setIsSubmittingCredit(false);
      onShowToast('Lỗi xử lý', err?.message || 'Không thể kết nối đến máy chủ.', 'error');
    }
  };

  const previewQrData = buildVietQrUrl({
    accountNumber: accountNumber || '0987654321',
    bankName: bankName || 'MBBank',
    amount: 50000,
    content: `${paymentPrefix} usr-1`,
    accountName: bankAccount,
  });

  const columns: Column<SePayWebhookLog>[] = [
    {
      key: 'transactionId',
      header: 'Mã GD SePay',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {item.transactionId}
        </span>
      ),
    },
    {
      key: 'transferAmount',
      header: 'Số Tiền Chuyển Khoản',
      sortable: true,
      align: 'right',
      render: (item) => (
        <div className="text-right">
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
            +{formatCurrencyVND(item.transferAmount)}
          </span>
          <span className="text-[10px] font-bold text-indigo-500 font-mono">
            quy đổi +{formatCore(item.transferAmount)}
          </span>
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Nội Dung Chuyển Khoản',
      render: (item) => (
        <span className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-semibold">
          {item.content}
        </span>
      ),
    },
    {
      key: 'gateway',
      header: 'Ngân Hàng Nhận',
      render: (item) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {item.gateway} ({item.accountNumber})
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      sortable: true,
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: 'processedAt',
      header: 'Thời Gian Nhận',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatFullDateTime(item?.processedAt)}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Thao Tác',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          {item.status !== 'SUCCESS' ? (
            <button
              onClick={() =>
                handleOpenManualCredit({
                  transactionId: item.transactionId,
                  amount: item.transferAmount,
                  content: item.content,
                  memberId: (item as any).memberId,
                })
              }
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              title="Duyệt nạp và cộng Core vào ví ngay"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Duyệt Nạp</span>
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Đã Cộng
            </span>
          )}
        </div>
      ),
    },
  ];

  const baseWebhookUrl = config?.webhookUrl || 'https://admin-code-game-shop.pages.dev/api/webhooks/sepay';
  const effectiveWebhookUrl = apiKey
    ? `${baseWebhookUrl.split('?')[0]}?key=${encodeURIComponent(apiKey)}`
    : baseWebhookUrl;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hệ Thống Thanh Toán Tự Động SePay (Enterprise Gateway)
                </h3>
                {config?.isConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Đã Kích Hoạt Tự Động
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" />
                    Chưa Điền API Key
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Coins className="h-3 w-3" />
                  Tỷ lệ quy đổi: 1 VNĐ = 1 Core
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Điền SePay API Key để kết nối web với tài khoản ngân hàng. Khi khách thanh toán hoặc quét mã nạp, tiền VNĐ tự động chuyển thành Core vào ví khách ngay lập tức.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenManualCredit()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:opacity-95 transition-opacity"
            >
              <Coins className="h-4 w-4" />
              <span>➕ Bù Tiền / Duyệt Nạp Cho Khách</span>
            </button>

            <button
              onClick={handleTestApiKey}
              disabled={isTestingApiKey}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Server className={`h-4 w-4 ${isTestingApiKey ? 'animate-spin' : 'text-indigo-600'}`} />
              <span>{isTestingApiKey ? 'Đang Kiểm Tra...' : 'Kiểm Tra Kết Nối SePay API'}</span>
            </button>

            <button
              onClick={handleOpenSimulator}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:opacity-95"
            >
              <Play className="h-4 w-4" />
              <span>Kiểm Thử Webhook Giả Lập</span>
            </button>
          </div>
        </div>

        {/* Currency Rule & Security Highlights */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-indigo-50/70 p-3.5 text-xs border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
              <Coins className="h-4 w-4" />
              <span>Quy Đổi Tiền Tệ Tự Động</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Tỷ lệ cố định <strong>1 VNĐ = 1 Core</strong>. Nạp 50.000 VNĐ nhận chính xác 50.000 Core trong ví tài khoản người chơi.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 text-xs border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <FileCode className="h-3.5 w-3.5 text-teal-600" /> Webhook Receiver
              </span>
              <button
                onClick={() => handleCopy(effectiveWebhookUrl, 'webhook')}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
                title="Sao chép URL Webhook"
              >
                {copiedKey === 'webhook' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-1 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={effectiveWebhookUrl}>
              {effectiveWebhookUrl}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 text-xs border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Chống Trùng Lặp Giao Dịch
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:bg-emerald-900/40">
                ACTIVE (IDEMPOTENT)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Khóa idempotency ngăn chặn tuyệt đối tình trạng cộng tiền trùng lặp cho cùng một mã GD.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Config & QR Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: SePay Settings Form */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Cấu Hình SePay API Key & Tài Khoản Ngân Hàng
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Bảo mật chuẩn Enterprise</span>
          </div>

          {apiTestResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                apiTestResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              {apiTestResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">
                <strong className="block font-bold">
                  {apiTestResult.success ? 'Kiểm tra thành công' : 'Lỗi kết nối API'}
                </strong>
                <span>{apiTestResult.message}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            {/* API Key Field */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  SePay API Token / API Key <span className="text-rose-500">*</span>
                </label>
                <a
                  href="https://my.sepay.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Lấy API Key tại my.sepay.vn ↗
                </a>
              </div>
              <div className="relative mt-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  required
                  placeholder="Nhập SePay API Token (VD: SP-KEY-xxxxxxxxxxxxxx)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full font-mono text-xs rounded-xl border border-slate-200 bg-white p-2.5 pr-10 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Khóa bí mật dùng để xác thực các yêu cầu tra cứu giao dịch và đồng bộ trạng thái đơn hàng.
              </p>
            </div>

            {/* Bank Info Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ngân Hàng Nhận Tiền <span className="text-rose-500">*</span>
                </label>
                <select
                  value={normalizeBank(bankName).code}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {SUPPORTED_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Số Tài Khoản (STK) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 0987654321"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1 w-full font-mono text-xs font-bold rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tên Chủ Tài Khoản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: CONG TY TNHH WEB CODE GAME"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="mt-1 w-full font-mono text-xs uppercase font-bold rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiền Tố Nội Dung Chuyển Khoản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: WCG"
                  value={paymentPrefix}
                  onChange={(e) => setPaymentPrefix(e.target.value.toUpperCase())}
                  className="mt-1 w-full font-mono text-xs uppercase font-bold rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Mã hóa AES-256 & Xác thực bảo mật 2 bước (2FA)</span>
              </div>

              <button
                type="submit"
                disabled={isSavingConfig}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
              >
                <Save className="h-4 w-4" />
                <span>{isSavingConfig ? 'Đang Lưu...' : 'Lưu Cấu Hình & Kích Hoạt Cổng'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Live VietQR Preview & Quick Guide */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Xem Trước Mã VietQR Tự Động
                </h4>
              </div>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full dark:bg-teal-900/40 dark:text-teal-300">
                Live SePay
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Khách quét mã bên dưới sẽ tự động nhận diện đúng số tiền và nội dung chuyển khoản:
            </p>

            {/* QR Display */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
              <div className="w-44 h-44 bg-white rounded-xl p-2 shadow-sm flex items-center justify-center">
                <img
                  src={previewQrData.primaryUrl}
                  alt="SePay VietQR Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== previewQrData.fallbackUrl) {
                      target.src = previewQrData.fallbackUrl;
                    }
                  }}
                />
              </div>

              <div className="mt-3 space-y-1">
                <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {accountNumber} - {previewQrData.bankInfo.shortName}
                </p>
                <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  Nội dung: {paymentPrefix} usr-1
                </p>
                <p className="text-[10px] text-emerald-600 font-bold">
                  Số tiền mẫu: 50.000đ (= 50.000 Core)
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-100 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              📌 Hướng dẫn 3 bước kết nối Webhook SePay:
            </span>
            <ol className="list-decimal list-inside space-y-1">
              <li>Đăng nhập <strong className="text-slate-800 dark:text-slate-200">my.sepay.vn</strong> ➔ Vào mục <strong>Webhook</strong> ➔ Bấm <strong>Tạo Webhook</strong>.</li>
              <li>Dán Webhook URL: <code className="bg-slate-200/80 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-[10px] text-indigo-600 dark:text-indigo-400 select-all">{effectiveWebhookUrl}</code></li>
              <li>Kiểu chứng thực: Chọn <strong>"Không có chứng thực"</strong> (Webhook URL trên đã tích hợp sẵn mã bảo mật an toàn) hoặc cấu hình thêm Header <code className="bg-slate-200/80 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-[10px]">Apikey</code>. Cả 2 đều tự động cộng Core 24/7!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Webhook Logs Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Nhật Ký Giao Dịch & Webhook SePay Thực Tế ({logs.length} giao dịch)
            </h4>
            <p className="text-xs text-slate-500">
              Dữ liệu webhook nhận theo thời gian thực từ SePay. Số tiền VNĐ được tự động ghi nhận và quy đổi 1:1 sang Core.
            </p>
          </div>
          <button
            onClick={loadSePayData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>

        <DataTable
          data={logs}
          columns={columns}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          searchPlaceholder="Tìm theo mã GD, nội dung chuyển khoản, ngân hàng..."
          searchKeys={['transactionId', 'content', 'gateway']}
          onRefresh={loadSePayData}
        />
      </div>

      {/* Simulator Modal */}
      <FormModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Kiểm Thử Webhook Nạp Tiền SePay"
        subtitle="Giả lập bắn payload webhook từ máy chủ SePay để kiểm tra khả năng tự động quy đổi 1 VNĐ = 1 Core và cộng số dư ví khách hàng."
        maxWidth="md"
      >
        <form onSubmit={handleSimulateWebhook} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chọn Thành Viên Cần Nạp Tiền <span className="text-rose-500">*</span>
            </label>
            <select
              value={testMemberId}
              onChange={(e) => setTestMemberId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.email}) - Số dư: {formatCore(m.balance)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mã Giao Dịch Ngân Hàng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={testTxId}
                onChange={(e) => setTestTxId(e.target.value)}
                className="mt-1 w-full font-mono text-xs rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Số Tiền Chuyển Khoản (VND) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1000}
                step={10000}
                required
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                className="mt-1 w-full font-mono font-bold text-xs rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50/70 p-3.5 text-xs border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Nội dung cú pháp SePay:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {paymentPrefix} {testMemberId}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
              <span>Số Core được cộng vào ví:</span>
              <span>+{formatCore(testAmount)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsTestModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              <span>{isSimulating ? 'Đang Bắn Webhook...' : 'Bắn Webhook Ngay'}</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Manual Credit / Compensation Modal */}
      <FormModal
        isOpen={isManualCreditModalOpen}
        onClose={() => setIsManualCreditModalOpen(false)}
        title="Duyệt Nạp Tiền / Bù Core Cho Khách Hàng"
        subtitle="Cộng Core trực tiếp vào ví người chơi và lưu lại vào hệ thống đối soát giao dịch SePay (Cloudflare D1)."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmManualCredit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chọn Khách Hàng / Tài Khoản <span className="text-rose-500">*</span>
            </label>
            <select
              value={manualMemberId}
              onChange={(e) => setManualMemberId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.username ? `@${m.username}` : m.email}) - Ví: {formatCore(m.balance)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mã Giao Dịch Ngân Hàng / SePay <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={manualTxId}
                onChange={(e) => setManualTxId(e.target.value)}
                placeholder="VD: 123456 hoặc SEPAY_..."
                className="mt-1 w-full font-mono text-xs rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Số Tiền Nạp (VNĐ = Core) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                required
                value={manualAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
                className="mt-1 w-full font-mono font-bold text-xs rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Ghi Chú Giao Dịch
            </label>
            <input
              type="text"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="VD: Bù tiền SePay nhận ngày 08/10 do webhook trễ"
              className="mt-1 w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="rounded-xl bg-emerald-50/70 p-3.5 text-xs border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tỷ lệ quy đổi:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">1 VNĐ = 1 Core</span>
            </div>
            <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
              <span>Core sẽ cộng vào ví khách:</span>
              <span className="text-sm">+{formatCore(manualAmount)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsManualCreditModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmittingCredit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <Coins className={`h-4 w-4 ${isSubmittingCredit ? 'animate-spin' : ''}`} />
              <span>{isSubmittingCredit ? 'Đang Nạp...' : 'Xác Nhận Nạp Ngay'}</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Step 2 Security Verification (2FA) Modal */}
      <Step2VerificationModal
        isOpen={isStep2ConfigModalOpen}
        onClose={() => setIsStep2ConfigModalOpen(false)}
        onSuccess={executeSaveConfig}
        title="Xác Minh Bảo Mật Bước 2 (2FA)"
        actionTitle="Lưu & Thay Đổi Cấu Hình Tài Khoản Nhận Tiền"
        actionDetails={
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-1.5 font-mono text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Ngân hàng nhận:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{bankName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Số tài khoản (STK):</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{accountNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Chủ tài khoản:</span>
                <span className="font-bold uppercase text-slate-800 dark:text-slate-200">{bankAccount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Tiền tố chuyển khoản:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{paymentPrefix}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">API Key:</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {apiKey ? `${apiKey.slice(0, 8)}••••••••` : '(Chưa điền)'}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed text-left">
              ⚠️ <strong>Cảnh báo tài chính:</strong> Việc thay đổi tài khoản ngân hàng hoặc SePay API Key sẽ chuyển toàn bộ luồng tiền thanh toán tự động của khách hàng sang tài khoản mới. Vui lòng nhập mã bảo mật bước 2 để phê duyệt lưu.
            </div>
          </div>
        }
        confirmButtonText="Xác Nhận & Lưu Cấu Hình"
        variant="warning"
      />
    </div>
  );
};
