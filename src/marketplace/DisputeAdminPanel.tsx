import { useMemo, useState } from 'react';
import {
  MARKETPLACE_COMMISSION_PERCENT,
  REFUND_REVIEW_THRESHOLD_CORE,
  classifyReview,
  describeDecision,
  disputeStatusLabel,
  hasSellerEvidence,
  isDisputeOpen,
  resolveDispute,
  type DisputeDecision,
  type MarketplaceDispute,
} from './disputes';

export interface DisputeAdminPanelProps {
  /** Khiếu nại do tầng cha đưa vào (đường đọc admin do điều phối viên nối). */
  disputes: MarketplaceDispute[];
  /** Số tiền đơn (gross, Core) theo mã đơn, nếu tầng cha có. */
  amountByOrderId?: Record<string, number>;
  /**
   * Ngưỡng hoàn tiền cần duyệt. Mặc định null = CHƯA CHỐT: không gắn cờ vượt
   * ngưỡng cho đơn nào. User chốt số rồi mới truyền vào.
   */
  refundReviewThreshold?: number | null;
  onResolved?: (dispute: MarketplaceDispute) => void;
}

const DECISIONS: DisputeDecision[] = ['RESOLVED_RELEASE', 'RESOLVED_REFUND', 'REJECTED'];

export default function DisputeAdminPanel({
  disputes,
  amountByOrderId,
  refundReviewThreshold,
  onResolved,
}: DisputeAdminPanelProps) {
  const threshold = refundReviewThreshold ?? REFUND_REVIEW_THRESHOLD_CORE;
  const [decisionById, setDecisionById] = useState<Record<string, DisputeDecision>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [messageById, setMessageById] = useState<Record<string, string>>({});
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  const openDisputes = useMemo(() => disputes.filter((d) => isDisputeOpen(d.status)), [disputes]);

  const reviewQueue = useMemo(
    () =>
      openDisputes
        .map((d) => ({
          dispute: d,
          review: classifyReview(d, {
            grossAmount: amountByOrderId?.[d.order_id] ?? null,
            refundReviewThreshold: threshold,
          }),
        }))
        .filter((item) => item.review.flag !== 'NONE'),
    [openDisputes, amountByOrderId, threshold],
  );

  async function handleResolve(dispute: MarketplaceDispute): Promise<void> {
    const decision = decisionById[dispute.id] ?? 'RESOLVED_RELEASE';
    const adminNote = (noteById[dispute.id] ?? '').trim();
    if (!adminNote) {
      setMessageById((prev) => ({
        ...prev,
        [dispute.id]: 'Quản trị phải ghi lý do quyết định để lưu vết kiểm chứng.',
      }));
      return;
    }
    setBusyById((prev) => ({ ...prev, [dispute.id]: true }));
    const result = await resolveDispute({ disputeId: dispute.id, decision, adminNote });
    setBusyById((prev) => ({ ...prev, [dispute.id]: false }));
    if (!result.ok) {
      setMessageById((prev) => ({ ...prev, [dispute.id]: result.message }));
      return;
    }
    setMessageById((prev) => ({ ...prev, [dispute.id]: 'Đã xử lý xong.' }));
    onResolved?.(result.data);
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <header>
        <h2 className="text-xl font-bold">Xử lý khiếu nại (quản trị)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Chỉ quản trị mới bấm quyết định. Không có quyết định tự động, không chia tiền theo tỷ lệ,
          không thu hồi mã đã giao khi hoàn tiền.
        </p>
      </header>

      <div className="rounded-lg border p-4 text-sm">
        <p className="font-semibold">Hướng xử lý hai hướng + hòa giải</p>
        <ul className="mt-2 space-y-2">
          {DECISIONS.map((decision) => {
            const info = describeDecision(decision);
            return (
              <li key={decision}>
                <span className="font-medium">{info.label}:</span> {info.moneyFlow} {info.orderStatus}{' '}
                {info.codeNote}
              </li>
            );
          })}
          <li>
            <span className="font-medium">Hòa giải:</span> quản trị trao đổi với hai bên trước khi bấm
            quyết định. Nếu hai bên thỏa thuận được (ví dụ người bán gửi lại mã đúng từ kho thật của
            mình), quản trị vẫn kết khiếu nại bằng một trong ba quyết định trên — hệ thống không có
            trạng thái "hòa giải một phần" và không tự chia tiền.
          </li>
          <li>
            <span className="font-medium">Phí:</span> khi trả tiền giữ, người bán nhận số tiền sau phí{' '}
            {MARKETPLACE_COMMISSION_PERCENT}%; khi hoàn tiền, người mua nhận lại toàn bộ số đã trả.
          </li>
        </ul>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="font-semibold">Hàng chờ cần duyệt ưu tiên</h3>
        {threshold === null && (
          <p className="mt-2 text-sm text-amber-800">
            Ngưỡng hoàn tiền cần duyệt chưa được chốt, nên hàng chờ này hiện chỉ gắn cờ trường hợp hai
            bên đều có bằng chứng. Mọi quyết định hoàn tiền vẫn do quản trị bấm tay.
          </p>
        )}
        {reviewQueue.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">Không có khiếu nại nào gắn cờ cần duyệt ưu tiên.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {reviewQueue.map(({ dispute, review }) => (
              <li key={dispute.id} className="rounded bg-red-50 p-3">
                <span className="font-medium">Đơn {dispute.order_id}:</span> {review.reason}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Khiếu nại đang mở ({openDisputes.length})</h3>
        {openDisputes.length === 0 && (
          <p className="text-sm text-zinc-600">Không có khiếu nại đang mở.</p>
        )}
        {openDisputes.map((d) => {
          const decision = decisionById[d.id] ?? 'RESOLVED_RELEASE';
          const info = describeDecision(decision);
          return (
            <article key={d.id} className="space-y-3 rounded-lg border p-4">
              <p className="font-medium">
                Đơn {d.order_id} · {disputeStatusLabel(d.status)}
              </p>
              <p className="text-sm">Lý do: {d.reason}</p>
              <p className="whitespace-pre-wrap text-sm">Bằng chứng người mua: {d.evidence_text || '—'}</p>
              <p className="whitespace-pre-wrap text-sm">
                Bằng chứng người bán: {hasSellerEvidence(d) ? d.seller_evidence_text : 'Chưa gửi.'}
              </p>
              {!hasSellerEvidence(d) && (
                <p className="text-sm text-amber-800">
                  Người bán chưa gửi bằng chứng — đây chỉ là tín hiệu để quản trị cân nhắc, không phải
                  căn cứ tự động xử người bán thua.
                </p>
              )}
              <fieldset className="text-sm">
                <legend className="font-medium">Quyết định</legend>
                {DECISIONS.map((key) => (
                  <label key={key} className="mt-1 block">
                    <input
                      type="radio"
                      name={`decision-${d.id}`}
                      checked={decision === key}
                      onChange={() => setDecisionById((prev) => ({ ...prev, [d.id]: key }))}
                      className="mr-2"
                    />
                    {describeDecision(key).label}
                  </label>
                ))}
              </fieldset>
              <p className="rounded bg-zinc-50 p-3 text-sm">
                {info.moneyFlow} {info.orderStatus} {info.codeNote}
              </p>
              <label className="block text-sm">
                Lý do quyết định (bắt buộc, lưu vào ghi chú quản trị)
                <textarea
                  value={noteById[d.id] ?? ''}
                  onChange={(e) => setNoteById((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              {messageById[d.id] && <p className="text-sm text-zinc-700">{messageById[d.id]}</p>}
              <button
                type="button"
                disabled={busyById[d.id]}
                onClick={() => handleResolve(d)}
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busyById[d.id] ? 'Đang xử lý...' : 'Xác nhận quyết định'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
