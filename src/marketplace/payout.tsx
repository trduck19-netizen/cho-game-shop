import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  RefreshCw,
  ShieldCheck,
  History,
  Banknote,
  AlertTriangle,
} from 'lucide-react';
import { authService } from '../services/authService';
import type { UserProfile } from '../types/game';

/**
 * KHỐI 3 — Giao diện rút tiền cho người bán.
 *
 * File MỚI, CHƯA nối vào src/App.tsx (điều phối viên gộp theo đoạn nối trong
 * docs/block3-tai-chinh-tien-giu-huong-dan-noi.md).
 *
 * Dùng API đã có + API chỉ đọc mới của khối 3:
 * - GET /api/marketplace/sellers/me (đã có): số dư khả dụng / tiền đang giữ.
 * - POST /api/marketplace/payouts (đã có): tạo yêu cầu rút. Lưu ý đúng hành
 *   vi máy chủ: tạo yêu cầu CHƯA trừ số dư, chỉ khi quản trị duyệt PAID mới
 *   trừ số dư khả dụng; yêu cầu bị từ chối REJECTED thì không động tiền.
 * - GET /api/marketplace/payouts (mới, khối 3): danh sách yêu cầu của mình.
 * - GET /api/marketplace/sellers/me/held (mới, khối 3): từng đơn đang giữ,
 *   ngày tự trả ước tính, cờ đang khiếu nại.
 * - GET /api/marketplace/sellers/me/ledger (mới, khối 3): lịch sử ví.
 *
 * Không có mức rút tối thiểu cài cứng ở đây: máy chủ hiện chỉ chặn số tiền
 * <= 0 hoặc vượt số dư khả dụng. Mức tối thiểu theo tuần (nếu user chốt) là
 * quy trình quản trị, cần quyết riêng trước khi thêm chặn vào mã.
 * Việc chuyển tiền ra ngân hàng ngoài do quản trị làm thủ công sau khi
 * duyệt PAID — giao diện này chỉ tạo và theo dõi yêu cầu, không chuyển tiền.
 */

interface SellerPayoutViewProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

type PayoutStatus = 'PENDING' | 'PAID' | 'REJECTED';

interface PayoutRow {
  id: string;
  amount: number;
  status: PayoutStatus;
  admin_note?: string;
  created_at: string;
  paid_at?: string | null;
}

interface HeldOrder {
  order_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  held_at: string;
  disputed: boolean;
  estimated_release_at: string | null;
}

interface LedgerEntry {
  id: string;
  order_id?: string | null;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  held_before: number;
  held_after: number;
  description: string;
  created_at: string;
}

const STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING: 'Đang chờ duyệt',
  PAID: 'Đã trả',
  REJECTED: 'Đã từ chối',
};

const LEDGER_TYPE_LABEL: Record<string, string> = {
  ESCROW_HOLD: 'Giữ tiền đơn hàng',
  ESCROW_RELEASE: 'Trả tiền giữ',
  ESCROW_REFUND: 'Hoàn tiền giữ',
  PAYOUT: 'Duyệt trả yêu cầu rút',
  ADJUST: 'Điều chỉnh',
};

function formatCore(value: number) {
  return `${Number(value || 0).toLocaleString('vi-VN')} Core`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Chưa rõ';
  const date = new Date(value.endsWith('Z') || value.includes('T') ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

async function apiGet(path: string) {
  const token = authService.getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Yêu cầu thất bại (${res.status}).`);
  }
  return data;
}

export const SellerPayoutView: React.FC<SellerPayoutViewProps> = ({
  currentUser,
  onOpenAuth,
}) => {
  const [tab, setTab] = useState<'rut' | 'giu' | 'lichsu'>('rut');
  const [seller, setSeller] = useState<any>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [heldTotals, setHeldTotals] = useState<any>(null);
  const [autoReleaseHours, setAutoReleaseHours] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [wiringPending, setWiringPending] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setWiringPending(false);
    try {
      const me = await apiGet('/api/marketplace/sellers/me');
      setSeller(me?.seller || null);
      // Các đường mới của khối 3: nếu điều phối viên chưa nối, máy chủ trả
      // 404 — vẫn hiện được số dư và form rút, chỉ thiếu danh sách chi tiết.
      try {
        const payoutData = await apiGet('/api/marketplace/payouts');
        setPayouts(payoutData?.payouts || []);
      } catch {
        setWiringPending(true);
      }
      try {
        const heldData = await apiGet('/api/marketplace/sellers/me/held');
        setHeldOrders(heldData?.orders || []);
        setHeldTotals(heldData?.totals || null);
        setAutoReleaseHours(heldData?.auto_release_hours ?? null);
      } catch {
        setWiringPending(true);
      }
      try {
        const ledgerData = await apiGet('/api/marketplace/sellers/me/ledger?limit=50');
        setLedger(ledgerData?.entries || []);
      } catch {
        setWiringPending(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Không tải được thông tin gian hàng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) load();
    else setIsLoading(false);
  }, [currentUser, load]);

  const submitPayout = async () => {
    const value = Math.floor(Number(amount) || 0);
    if (value <= 0) {
      setError('Số tiền rút phải lớn hơn 0.');
      return;
    }
    if (seller && value > Number(seller.available_balance || 0)) {
      setError('Số tiền rút vượt số dư khả dụng.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      const token = authService.getToken();
      const res = await fetch('/api/marketplace/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Tạo yêu cầu thất bại (${res.status}).`);
      }
      setNotice('Đã tạo yêu cầu rút tiền, đang chờ quản trị duyệt. Yêu cầu đang chờ chưa trừ số dư của bạn.');
      setAmount('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Tạo yêu cầu rút tiền thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <Wallet className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <p className="mb-4 text-white/80">Đăng nhập để xem ví gian hàng và tạo yêu cầu rút tiền.</p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="rounded-full bg-amber-500 px-5 py-2 font-semibold text-black hover:bg-amber-400"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <p className="py-10 text-center text-white/70">Đang tải ví gian hàng…</p>;
  }

  if (!seller) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/80">
        <p>Bạn chưa có gian hàng được duyệt nên chưa xem được ví sàn.</p>
      </div>
    );
  }

  const available = Number(seller.available_balance || 0);
  const held = Number(seller.held_balance || 0);
  const pendingTotal = payouts
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="space-y-5">
      {wiringPending && (
        <div className="flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Một số danh sách chi tiết (yêu cầu rút, tiền đang giữ, lịch sử ví) đang chờ điều phối viên
            nối đường API mới của khối 3 — số dư và form tạo yêu cầu vẫn dùng được bình thường.
          </span>
        </div>
      )}
      {error && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p className="rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-200">{notice}</p>}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Ví gian hàng: {seller.shop_name}</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-emerald-500/10 p-4">
            <p className="text-sm text-white/60">Số dư khả dụng (rút được)</p>
            <p className="mt-1 text-xl font-bold text-emerald-300">{formatCore(available)}</p>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-4">
            <p className="text-sm text-white/60">Tiền đang giữ</p>
            <p className="mt-1 text-xl font-bold text-amber-300">{formatCore(held)}</p>
            <p className="mt-1 text-xs text-white/50">Chỉ chuyển thành khả dụng khi người mua xác nhận, hết thời gian giữ, hoặc quản trị xử lý khiếu nại.</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-white/60">Yêu cầu đang chờ duyệt</p>
            <p className="mt-1 text-xl font-bold text-white">{formatCore(pendingTotal)}</p>
            <p className="mt-1 text-xs text-white/50">Yêu cầu đang chờ chưa trừ số dư — chỉ khi quản trị duyệt trả mới trừ.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {([
          ['rut', 'Rút tiền'],
          ['giu', 'Tiền đang giữ'],
          ['lichsu', 'Lịch sử ví'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          className="ml-auto flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/20"
        >
          <RefreshCw className="h-4 w-4" /> Tải lại
        </button>
      </div>

      {tab === 'rut' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-bold text-white">Tạo yêu cầu rút tiền</h3>
            <p className="mt-1 text-sm text-white/60">
              Nhập số tiền muốn rút (không vượt số dư khả dụng). Quản trị duyệt rồi mới chuyển tiền ra
              ngoài bằng quy trình thủ công — giao diện này không tự chuyển tiền ngân hàng.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="number"
                min={1}
                max={available}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Số Core muốn rút"
                className="flex-1 rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-white outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={submitPayout}
                disabled={isSubmitting || available <= 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
              >
                <Banknote className="h-4 w-4" /> Gửi yêu cầu
              </button>
            </div>
            {available <= 0 && (
              <p className="mt-2 text-sm text-white/50">Số dư khả dụng đang bằng 0 nên chưa tạo được yêu cầu.</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-bold text-white">Yêu cầu rút của bạn</h3>
            {payouts.length === 0 ? (
              <p className="mt-2 text-sm text-white/60">Chưa có yêu cầu rút nào.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {payouts.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-black/20 px-4 py-3">
                    <span className="font-bold text-white">{formatCore(Number(p.amount))}</span>
                    <span className="flex items-center gap-1 text-sm text-white/70">
                      {p.status === 'PENDING' && <Hourglass className="h-4 w-4 text-amber-300" />}
                      {p.status === 'PAID' && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                      {p.status === 'REJECTED' && <XCircle className="h-4 w-4 text-red-300" />}
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span className="text-xs text-white/50">Tạo: {formatDate(p.created_at)}</span>
                    {p.paid_at && <span className="text-xs text-white/50">Trả: {formatDate(p.paid_at)}</span>}
                    {p.admin_note && <span className="w-full text-sm text-white/60">Ghi chú quản trị: {p.admin_note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'giu' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-bold text-white">Tiền đang giữ theo từng đơn</h3>
          <p className="mt-1 text-sm text-white/60">
            Tiền giữ là tiền thực nhận sau phí của từng đơn (người mua đã nhận mã, tiền chưa về ví).
            {autoReleaseHours !== null
              ? ` Đơn không có khiếu nại sẽ tự trả sau ${autoReleaseHours} giờ giữ.`
              : ' Sàn chưa công bố thời gian tự trả nên cột ngày tự trả đang để "Chưa rõ".'}
            Đơn đang khiếu nại được tách riêng và không nằm trong diện tự trả.
          </p>
          {heldTotals && (
            <p className="mt-3 text-sm text-white/80">
              Tổng đang giữ: <b>{formatCore(heldTotals.held_total)}</b> — trong đó đang khiếu nại:{' '}
              <b>{formatCore(heldTotals.disputed_held_total)}</b>, sắp về (không khiếu nại):{' '}
              <b>{formatCore(heldTotals.clear_held_total)}</b>.
            </p>
          )}
          {heldOrders.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">Không có đơn nào đang giữ.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {heldOrders.map((o) => (
                <li key={o.order_id} className="rounded-xl bg-black/20 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-white/50">Đơn {o.order_id}</span>
                    {o.disputed ? (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-200">
                        <ShieldCheck className="h-3 w-3" /> Đang khiếu nại — không tự trả
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                        <Clock className="h-3 w-3" /> Tự trả ước tính: {formatDate(o.estimated_release_at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-white/80">
                    Thực nhận: <b>{formatCore(o.net_amount)}</b> (tiền gốc {formatCore(o.gross_amount)} − phí{' '}
                    {formatCore(o.commission_amount)}) — giữ từ {formatDate(o.held_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'lichsu' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="flex items-center gap-2 font-bold text-white">
            <History className="h-5 w-5 text-amber-400" /> Lịch sử ví
          </h3>
          {ledger.length === 0 ? (
            <p className="mt-2 text-sm text-white/60">Chưa có biến động ví nào.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {ledger.map((entry) => (
                <li key={entry.id} className="rounded-xl bg-black/20 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-white">
                      {LEDGER_TYPE_LABEL[entry.type] || entry.type}
                    </span>
                    <span className={`font-bold ${entry.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {entry.amount >= 0 ? '+' : ''}
                      {formatCore(entry.amount)}
                    </span>
                    <span className="text-xs text-white/50">{formatDate(entry.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/60">
                    {entry.description}
                    {entry.order_id ? ` — Đơn ${entry.order_id}.` : '.'} Khả dụng: {formatCore(entry.balance_before)} →{' '}
                    {formatCore(entry.balance_after)}; đang giữ: {formatCore(entry.held_before)} →{' '}
                    {formatCore(entry.held_after)}.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
