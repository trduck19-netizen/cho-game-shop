import { useEffect, useMemo, useState } from 'react';
import {
  DISPUTE_REASON_OPTIONS,
  DESIRED_RESOLUTION_LABELS,
  MARKETPLACE_AUTO_RELEASE_HOURS,
  MARKETPLACE_DISPUTE_WINDOW_HOURS,
  SELLER_EVIDENCE_MAX_LENGTH,
  classifyReview,
  composeBuyerEvidence,
  disputeStatusLabel,
  disputeTimeline,
  fetchDisputesFor,
  findReasonOption,
  hasSellerEvidence,
  isDisputeOpen,
  openDispute,
  submitSellerEvidence,
  validateOpenDispute,
  validateSellerEvidence,
  type DesiredResolution,
  type DisputeStatus,
  type MarketplaceDispute,
  type SellerEvidenceDraft,
} from './disputes';

export interface DisputeCenterProps {
  role: 'buyer' | 'seller';
  /** Danh sách có sẵn (nếu điều phối viên đã nối đường đọc ở tầng cha). */
  initialDisputes?: MarketplaceDispute[];
  onDisputeOpened?: (dispute: MarketplaceDispute) => void;
}

type ListState = 'loading' | 'ready' | 'endpoint-missing' | 'error';

const STATUS_FILTERS: Array<{ value: 'ALL' | DisputeStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'RESOLVED_RELEASE', label: 'Đã trả tiền giữ' },
  { value: 'RESOLVED_REFUND', label: 'Đã hoàn tiền' },
  { value: 'REJECTED', label: 'Đã bác' },
];

function statusBadgeClass(status: DisputeStatus): string {
  if (status === 'OPEN') return 'bg-amber-100 text-amber-800';
  if (status === 'RESOLVED_REFUND') return 'bg-emerald-100 text-emerald-800';
  if (status === 'RESOLVED_RELEASE') return 'bg-sky-100 text-sky-800';
  return 'bg-zinc-200 text-zinc-700';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

export default function DisputeCenter({ role, initialDisputes, onDisputeOpened }: DisputeCenterProps) {
  const [disputes, setDisputes] = useState<MarketplaceDispute[]>(initialDisputes ?? []);
  const [listState, setListState] = useState<ListState>(initialDisputes ? 'ready' : 'loading');
  const [listMessage, setListMessage] = useState('');
  const [filter, setFilter] = useState<'ALL' | DisputeStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [desired, setDesired] = useState<DesiredResolution>('ADMIN_DECIDE');
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [sellerEvidence, setSellerEvidence] = useState('');
  const [sellerSolution, setSellerSolution] = useState<DesiredResolution>('ADMIN_DECIDE');
  const [sellerDrafts, setSellerDrafts] = useState<Record<string, SellerEvidenceDraft>>({});
  const [sellerMessage, setSellerMessage] = useState('');

  useEffect(() => {
    if (!selectedId) return;
    setSellerEvidence(sellerDrafts[selectedId]?.evidenceText ?? '');
    setSellerSolution(sellerDrafts[selectedId]?.proposedSolution ?? 'ADMIN_DECIDE');
    setSellerMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (initialDisputes) return;
    let cancelled = false;
    fetchDisputesFor(role).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDisputes(result.disputes);
        setListState('ready');
      } else if (result.code === 'ENDPOINT_CHUA_CO') {
        setListState('endpoint-missing');
        setListMessage(result.message);
      } else {
        setListState('error');
        setListMessage(result.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [role, initialDisputes]);

  const visibleDisputes = useMemo(
    () => (filter === 'ALL' ? disputes : disputes.filter((d) => d.status === filter)),
    [disputes, filter],
  );
  const selected = disputes.find((d) => d.id === selectedId) ?? null;
  const reasonOption = findReasonOption(reason);
  const formErrors = validateOpenDispute({ orderId, reason, evidenceText });
  const evidencePreview = reason ? composeBuyerEvidence(evidenceText, desired) : '';

  async function handleOpenDispute(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (formErrors.length > 0) {
      setFormMessage(formErrors.join(' '));
      return;
    }
    setSubmitting(true);
    setFormMessage('');
    const result = await openDispute({ orderId, reason, evidenceText, desiredResolution: desired });
    setSubmitting(false);
    if (!result.ok) {
      setFormMessage(result.message);
      return;
    }
    setDisputes((prev) => [result.data, ...prev]);
    setSelectedId(result.data.id);
    setOrderId('');
    setReason('');
    setEvidenceText('');
    setFormMessage('Đã mở khiếu nại. Tiền giữ của đơn sẽ đứng yên cho tới khi quản trị quyết định.');
    onDisputeOpened?.(result.data);
  }

  async function handleSaveSellerDraft(): Promise<void> {
    if (!selected) return;
    const errors = validateSellerEvidence(sellerEvidence);
    if (errors.length > 0) {
      setSellerMessage(errors.join(' '));
      return;
    }
    const draft: SellerEvidenceDraft = {
      disputeId: selected.id,
      evidenceText: sellerEvidence,
      proposedSolution: sellerSolution,
    };
    setSellerDrafts((prev) => ({ ...prev, [selected.id]: draft }));
    const pending = submitSellerEvidence(draft);
    // Dieu phoi vien da noi duong POST /api/marketplace/disputes/evidence:
    // thu gui that truoc; neu that bai thi giu ban nhap va bao dung su that,
    // khong bao thanh cong gia.
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('wcg_auth_token') ?? '' : '';
      const res = await fetch('/api/marketplace/disputes/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ dispute_id: selected.id, evidence_text: sellerEvidence }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success !== false) {
        setSellerMessage('Đã gửi bằng chứng cho quản trị.');
        return;
      }
      setSellerMessage(`${pending.message} (Lần gửi vừa rồi chưa thành công: ${data?.message ?? 'máy chủ chưa nhận.'} Bản nháp đã giữ lại.)`);
    } catch {
      setSellerMessage(`${pending.message} (Chưa kết nối được máy chủ để gửi. Bản nháp đã giữ lại.)`);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <header>
        <h2 className="text-xl font-bold">
          {role === 'buyer' ? 'Khiếu nại của tôi' : 'Khiếu nại về gian hàng'}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Sàn chỉ bán mã dùng một lần. Khi khiếu nại đang mở, tiền giữ của đơn đứng yên và người mua
          chưa xác nhận đơn được. Quản trị là người quyết định cuối cùng.
        </p>
      </header>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="font-semibold">Quy trình xử lý — đọc trước khi gửi</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Người mua mở khiếu nại khi tiền còn giữ (trong {MARKETPLACE_DISPUTE_WINDOW_HOURS} giờ giữ tiền).</li>
          <li>Người bán gửi bằng chứng mô tả và đề xuất hướng giải quyết.</li>
          <li>Quản trị đối chiếu hai bên rồi quyết: trả tiền giữ cho người bán, hoàn tiền cho người mua, hoặc bác khiếu nại.</li>
          <li>Hòa giải không chia tiền theo tỷ lệ: nếu hai bên thỏa thuận được (ví dụ gửi lại mã đúng), quản trị vẫn kết khiếu nại bằng một trong ba quyết định trên; mã gửi lại (nếu có) phải là mã thật từ kho người bán.</li>
        </ol>
        <p className="mt-2 font-medium">
          Lưu ý quan trọng: hoàn tiền KHÔNG thu hồi mã đã giao, vì mã có thể đã được dùng rồi. Bác khiếu
          nại cũng KHÔNG trả tiền ngay cho người bán — tiền vẫn giữ tới khi người mua xác nhận hoặc hết{' '}
          {MARKETPLACE_AUTO_RELEASE_HOURS} giờ thì tự động trả.
        </p>
      </div>

      {role === 'buyer' && (
        <form onSubmit={handleOpenDispute} className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Mở khiếu nại mới</h3>
          <label className="block text-sm">
            Mã đơn hàng
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Ví dụ: MPORD-..."
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Lý do khiếu nại
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="">— Chọn lý do —</option>
              {DISPUTE_REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {reasonOption && reasonOption.evidenceHint && (
            <p className="text-sm text-zinc-600">Gợi ý bằng chứng: {reasonOption.evidenceHint}</p>
          )}
          {reasonOption && !reasonOption.eligible && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">{reasonOption.ineligibleNote}</p>
          )}
          <label className="block text-sm">
            Bằng chứng mô tả (ghi rõ sự việc, thời điểm, nội dung lỗi nhìn thấy)
            <textarea
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Mô tả bằng chữ những gì bạn thấy. Hiện API chưa nhận file ảnh/video đính kèm."
            />
          </label>
          <fieldset className="text-sm">
            <legend className="font-medium">Bạn mong muốn giải quyết ra sao? (nguyện vọng, không phải cam kết)</legend>
            {(Object.keys(DESIRED_RESOLUTION_LABELS) as DesiredResolution[]).map((key) => (
              <label key={key} className="mt-1 block">
                <input
                  type="radio"
                  name="desired-resolution"
                  checked={desired === key}
                  onChange={() => setDesired(key)}
                  className="mr-2"
                />
                {DESIRED_RESOLUTION_LABELS[key]}
              </label>
            ))}
          </fieldset>
          {evidencePreview && (
            <div className="rounded bg-zinc-50 p-3 text-sm">
              <p className="font-medium">Nội dung sẽ gửi:</p>
              <p className="mt-1 whitespace-pre-wrap">{evidencePreview}</p>
            </div>
          )}
          {formMessage && <p className="text-sm text-zinc-700">{formMessage}</p>}
          <button
            type="submit"
            disabled={submitting || formErrors.length > 0}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi khiếu nại'}
          </button>
        </form>
      )}

      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-sm ${
                filter === f.value ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {listState === 'loading' && <p className="text-sm text-zinc-600">Đang tải danh sách...</p>}
        {listState === 'endpoint-missing' && (
          <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">{listMessage}</p>
        )}
        {listState === 'error' && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{listMessage}</p>}
        {listState === 'ready' && visibleDisputes.length === 0 && (
          <p className="text-sm text-zinc-600">Chưa có khiếu nại nào trong mục này.</p>
        )}
        <ul className="space-y-3">
          {visibleDisputes.map((d) => {
            const review = classifyReview(d);
            return (
              <li key={d.id} className="rounded-lg border p-4">
                <button type="button" onClick={() => setSelectedId(d.id)} className="w-full text-left">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Đơn {d.order_id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(d.status)}`}>
                      {disputeStatusLabel(d.status)}
                    </span>
                    {review.flag !== 'NONE' && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        Cần quản trị duyệt
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-600">
                    Lý do: {d.reason} · Mở lúc: {formatDate(d.created_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && (
        <article className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Chi tiết khiếu nại — đơn {selected.order_id}</h3>
          <p className="text-sm">
            Trạng thái:{' '}
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(selected.status)}`}>
              {disputeStatusLabel(selected.status)}
            </span>
          </p>
          <div className="text-sm">
            <p className="font-medium">Bằng chứng của người mua:</p>
            <p className="mt-1 whitespace-pre-wrap">{selected.evidence_text || '—'}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium">Bằng chứng của người bán:</p>
            <p className="mt-1 whitespace-pre-wrap">
              {hasSellerEvidence(selected) ? selected.seller_evidence_text : 'Chưa có.'}
            </p>
          </div>
          {selected.admin_note && (
            <p className="text-sm">Ghi chú của quản trị: {selected.admin_note}</p>
          )}
          <ol className="space-y-2 text-sm">
            {disputeTimeline(selected).map((step) => (
              <li key={step.key} className="flex gap-2">
                <span>{step.done ? '✓' : '○'}</span>
                <span>
                  <span className="font-medium">{step.label}</span>
                  {step.at && <span className="text-zinc-500"> — {formatDate(step.at)}</span>}
                  <span className="block text-zinc-600">{step.note}</span>
                </span>
              </li>
            ))}
          </ol>

          {role === 'seller' && isDisputeOpen(selected.status) && (
            <div className="space-y-3 rounded bg-zinc-50 p-4">
              <h4 className="font-medium">Gửi bằng chứng mô tả (người bán)</h4>
              <p className="text-sm text-zinc-600">
                Trình bày đúng sự việc từ phía bạn: mã đã giao là mã nào (không cần ghi lại nội dung mã),
                mã lấy từ đâu, và vì sao bạn cho rằng khiếu nại chưa đúng. Đừng ghi nội dung mã vào đây.
              </p>
              <textarea
                value={sellerEvidence}
                onChange={(e) => setSellerEvidence(e.target.value)}
                rows={5}
                maxLength={SELLER_EVIDENCE_MAX_LENGTH}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Mô tả bằng chứng của bạn..."
              />
              <fieldset className="text-sm">
                <legend className="font-medium">Bạn đề xuất hướng giải quyết nào?</legend>
                {(Object.keys(DESIRED_RESOLUTION_LABELS) as DesiredResolution[]).map((key) => (
                  <label key={key} className="mt-1 block">
                    <input
                      type="radio"
                      name="seller-solution"
                      checked={sellerSolution === key}
                      onChange={() => setSellerSolution(key)}
                      className="mr-2"
                    />
                    {DESIRED_RESOLUTION_LABELS[key]}
                  </label>
                ))}
              </fieldset>
              {sellerMessage && <p className="text-sm text-zinc-700">{sellerMessage}</p>}
              <button
                type="button"
                onClick={handleSaveSellerDraft}
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Lưu bản nháp bằng chứng
              </button>
              <p className="text-sm text-zinc-600">
                Nút này chỉ lưu bản nháp trên trang vì đường gửi bằng chứng của người bán chưa có trong
                API. Khi điều phối viên nối xong, bấm lại để gửi đúng nội dung này.
              </p>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
