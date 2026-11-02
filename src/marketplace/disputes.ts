/**
 * KHỐI 4 — Khiếu nại / chăm sóc khách cho sàn cho-game-shop.
 *
 * Phạm vi: nhánh xem trước preview/marketplace-so-1, chỉ tạo file mới.
 * File này KHÔNG sửa functions/_worker.ts, KHÔNG sửa migration cũ, KHÔNG mở
 * rộng role members, KHÔNG sửa ràng buộc wallet_transactions.
 *
 * SỰ THẬT VỀ API ĐÃ CÓ (đọc từ functions/api/marketplace/index.ts):
 * - POST /api/marketplace/disputes (chỉ người mua, tiền giữ phải ở trạng thái
 *   HELD, mỗi đơn tối đa 1 khiếu nại OPEN): mở khiếu nại, tiền giữ đứng yên.
 * - POST /api/marketplace/disputes/resolve (chỉ quản trị): quyết định
 *   RESOLVED_RELEASE / RESOLVED_REFUND / REJECTED.
 * - CHƯA CÓ: đường đọc danh sách khiếu nại, đường gửi bằng chứng của người
 *   bán, đường gửi bổ sung bằng chứng sau khi mở. Ba đường này là đoạn nối
 *   điều phối viên cần thêm (xem disputes.README.md); client dưới đây trả về
 *   trạng thái ENDPOINT_CHUA_CO một cách trung thực thay vì giả vờ thành công.
 *
 * NGUYÊN TẮC BẮT BUỘC:
 * - Chỉ bán mã dùng một lần; hệ thống không tự sinh mã, không tự mua.
 * - Hoàn tiền KHÔNG thu hồi mã đã giao, vì mã có thể đã được dùng rồi.
 * - Không tự chia tiền theo tỷ lệ: hòa giải vẫn phải kết bằng 1 trong 3 quyết
 *   định của API (trả tiền giữ / hoàn tiền / bác khiếu nại).
 * - Hai bên đều có bằng chứng trái nhau, hoặc hoàn tiền vượt ngưỡng (khi ngưỡng
 *   đã chốt), thì chỉ đưa vào danh sách cần quản trị duyệt, không tự quyết.
 */

export type DisputeStatus =
  | 'OPEN'
  | 'RESOLVED_RELEASE'
  | 'RESOLVED_REFUND'
  | 'REJECTED';

export type DisputeDecision =
  | 'RESOLVED_RELEASE'
  | 'RESOLVED_REFUND'
  | 'REJECTED';

export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED';

export interface MarketplaceDispute {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  evidence_text: string;
  /** Chưa có cột này trong migration 0012; có giá trị khi đoạn nối bổ sung. */
  seller_evidence_text?: string;
  status: DisputeStatus;
  admin_note: string;
  created_at: string;
  resolved_at: string | null;
}

/** Tham số sàn đã chốt (khớp hàng marketplace_settings trên DB thử). */
export const MARKETPLACE_COMMISSION_PERCENT = 5;
export const MARKETPLACE_HOLD_HOURS = 168;
export const MARKETPLACE_AUTO_RELEASE_HOURS = 168;
export const MARKETPLACE_DISPUTE_WINDOW_HOURS = 168;

/** Giới hạn phía giao diện cho bằng chứng mô tả của người bán. */
export const SELLER_EVIDENCE_MAX_LENGTH = 2000;

/**
 * Ngưỡng hoàn tiền cần duyệt tay. Mặc định null = CHƯA CHỐT: user chưa duyệt
 * con số nào, nên không có mức tự động nào được áp. Khi user chốt một con số,
 * điều phối viên truyền nó vào classifyReview; mọi đơn vượt ngưỡng chỉ vào
 * hàng chờ duyệt, không bao giờ tự hoàn.
 */
export const REFUND_REVIEW_THRESHOLD_CORE: number | null = null;

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: 'Đang mở',
  RESOLVED_RELEASE: 'Đã trả tiền giữ cho người bán',
  RESOLVED_REFUND: 'Đã hoàn tiền cho người mua',
  REJECTED: 'Đã bác khiếu nại',
};

export function disputeStatusLabel(status: DisputeStatus): string {
  return DISPUTE_STATUS_LABELS[status] ?? status;
}

export function isDisputeOpen(status: DisputeStatus): boolean {
  return status === 'OPEN';
}

/** Chỉ mở được khiếu nại khi tiền còn giữ (HELD). Đã trả/đã hoàn thì hết cửa. */
export function canOpenDispute(escrowStatus: EscrowStatus): boolean {
  return escrowStatus === 'HELD';
}

/** Khi đang có khiếu nại mở, người mua không xác nhận đơn được (API chặn). */
export function canConfirmOrderWhileDisputeOpen(disputeStatus: DisputeStatus): boolean {
  return disputeStatus !== 'OPEN';
}

export interface DisputeReasonOption {
  value: string;
  label: string;
  /** Gợi ý bằng chứng riêng cho từng lý do (học từ cách các sàn lớn làm). */
  evidenceHint: string;
  eligible: boolean;
  ineligibleNote?: string;
}

/**
 * Lý do khiếu nại cho sàn mã số. Khác sàn hàng vật lý: không có giao sai hàng,
 * không có trả hàng kiểm tra; bằng chứng là mô tả bằng chữ (API hiện chỉ có
 * evidence_text, chưa có tải file) nên gợi ý ghi rõ nội dung lỗi nhìn thấy.
 */
export const DISPUTE_REASON_OPTIONS: DisputeReasonOption[] = [
  {
    value: 'CODE_ALREADY_USED',
    label: 'Mã báo đã được sử dụng',
    evidenceHint:
      'Ghi rõ thời điểm nhập mã, tên game và máy chủ đã nhập, và nguyên văn thông báo lỗi hiện ra.',
    eligible: true,
  },
  {
    value: 'CODE_INVALID',
    label: 'Mã không hợp lệ / không nhận được vật phẩm',
    evidenceHint:
      'Ghi rõ đã nhập mã ở đâu, kết quả nhận được là gì, và vật phẩm nào thiếu so với mô tả.',
    eligible: true,
  },
  {
    value: 'CODE_WRONG_GAME',
    label: 'Mã không đúng game hoặc sản phẩm đã mua',
    evidenceHint:
      'Ghi rõ sản phẩm đã mua là gì, mã nhận được dùng cho game nào, và chỗ nào lệch với mô tả.',
    eligible: true,
  },
  {
    value: 'CODE_NOT_MATCHING_DESC',
    label: 'Mã không đúng mô tả của gian hàng',
    evidenceHint:
      'Ghi rõ mô tả gian hàng hứa gì và thực tế khác ở điểm nào, kèm thời điểm phát hiện.',
    eligible: true,
  },
  {
    value: 'OTHER',
    label: 'Lý do khác (ghi rõ)',
    evidenceHint:
      'Mô tả ngắn gọn, đúng sự việc: chuyện gì xảy ra, khi nào, và bạn mong muốn gì.',
    eligible: true,
  },
  {
    value: 'CHANGED_MIND',
    label: 'Đổi ý, không còn nhu cầu',
    evidenceHint: '',
    eligible: false,
    ineligibleNote:
      'Lý do này không thuộc diện khiếu nại: mã dùng một lần đã giao thì không trả lại được như hàng vật lý, nên không có đường hoàn tiền cho trường hợp chỉ đổi ý. Nếu mã có lỗi thật, hãy chọn lý do mô tả đúng lỗi đó.',
  },
];

export function findReasonOption(value: string): DisputeReasonOption | undefined {
  return DISPUTE_REASON_OPTIONS.find((o) => o.value === value);
}

export type DesiredResolution = 'REFUND' | 'REPLACEMENT_CODE' | 'ADMIN_DECIDE';

export const DESIRED_RESOLUTION_LABELS: Record<DesiredResolution, string> = {
  REFUND: 'Hoàn tiền',
  REPLACEMENT_CODE: 'Gửi lại mã đúng',
  ADMIN_DECIDE: 'Để quản trị quyết định',
};

/**
 * Mong muốn giải quyết của người mua. Đây là nguyện vọng, KHÔNG phải cam kết:
 * API hiện không có trường này nên giao diện ghép nó vào cuối evidence_text
 * một cách công khai (xem trước đúng nội dung sẽ gửi). Quyết định cuối cùng
 * vẫn là 1 trong 3 quyết định của quản trị; "gửi lại mã đúng" nếu được chấp
 * thuận thì người bán phải nạp mã thật từ kho của mình, không tự sinh mã.
 */
export function composeBuyerEvidence(
  evidenceText: string,
  desired: DesiredResolution,
): string {
  const body = evidenceText.trim();
  const wish = `Mong muốn giải quyết: ${DESIRED_RESOLUTION_LABELS[desired]}.`;
  return body ? `${body}\n\n${wish}` : wish;
}

export interface DisputeDecisionInfo {
  label: string;
  moneyFlow: string;
  orderStatus: string;
  codeNote: string;
}

export function describeDecision(decision: DisputeDecision): DisputeDecisionInfo {
  if (decision === 'RESOLVED_RELEASE') {
    return {
      label: 'Người bán thắng — trả tiền giữ',
      moneyFlow: `Tiền giữ (sau phí ${MARKETPLACE_COMMISSION_PERCENT}%) chuyển thành tiền khả dụng của người bán.`,
      orderStatus: 'Đơn chuyển thành COMPLETED.',
      codeNote: 'Mã đã giao giữ nguyên.',
    };
  }
  if (decision === 'RESOLVED_REFUND') {
    return {
      label: 'Người mua thắng — hoàn tiền',
      moneyFlow:
        'Người mua được hoàn toàn bộ số tiền đã trả; tiền giữ không trả cho người bán.',
      orderStatus: 'Đơn chuyển thành CANCELLED.',
      codeNote:
        'Mã đã giao KHÔNG bị thu hồi, vì mã có thể đã được dùng rồi. Hoàn tiền không đồng nghĩa lấy lại mã.',
    };
  }
  return {
    label: 'Bác khiếu nại',
    moneyFlow:
      `Tiền vẫn giữ nguyên, KHÔNG trả ngay cho người bán. Tiền chỉ được trả khi người mua xác nhận đơn hoặc hết ${MARKETPLACE_AUTO_RELEASE_HOURS} giờ thì hệ thống tự động trả.`,
    orderStatus: 'Đơn giữ nguyên cho tới khi xác nhận hoặc tự động trả.',
    codeNote: 'Mã đã giao giữ nguyên.',
  };
}

export type ReviewFlag = 'NONE' | 'CONFLICTING_EVIDENCE' | 'OVER_THRESHOLD';

export interface ReviewClassification {
  flag: ReviewFlag;
  reason: string;
}

export function hasBuyerEvidence(dispute: MarketplaceDispute): boolean {
  return dispute.evidence_text.trim().length > 0;
}

export function hasSellerEvidence(dispute: MarketplaceDispute): boolean {
  return (dispute.seller_evidence_text ?? '').trim().length > 0;
}

/**
 * Phân loại hàng chờ duyệt. Quy tắc:
 * - Hai bên đều đã gửi bằng chứng → cần quản trị duyệt, KHÔNG tự kết luận bên
 *   nào đúng (giao diện không đọc được "trái nhau" từ chữ, chỉ biết cả hai bên
 *   đều đã trình bày; quản trị là người đối chiếu).
 * - Vượt ngưỡng hoàn tiền (chỉ khi ngưỡng đã chốt) → cần quản trị duyệt.
 * - Các trường hợp còn lại: quản trị vẫn là người bấm quyết định (API không có
 *   đường tự quyết), nhưng không gắn cờ ưu tiên.
 */
export function classifyReview(
  dispute: MarketplaceDispute,
  options?: { grossAmount?: number | null; refundReviewThreshold?: number | null },
): ReviewClassification {
  if (hasBuyerEvidence(dispute) && hasSellerEvidence(dispute)) {
    return {
      flag: 'CONFLICTING_EVIDENCE',
      reason:
        'Hai bên đều đã gửi bằng chứng — cần quản trị đối chiếu và quyết định, giao diện không tự kết luận.',
    };
  }
  const threshold = options?.refundReviewThreshold ?? null;
  const gross = options?.grossAmount ?? null;
  if (threshold !== null && gross !== null && gross > threshold) {
    return {
      flag: 'OVER_THRESHOLD',
      reason: `Đơn vượt ngưỡng hoàn tiền cần duyệt (${threshold} Core) — chỉ liệt kê chờ duyệt, không tự hoàn.`,
    };
  }
  return { flag: 'NONE', reason: '' };
}

export interface DisputeTimelineStep {
  key: string;
  label: string;
  done: boolean;
  at: string | null;
  note: string;
}

/** Dòng thời gian suy ra từ các mốc đã có trong bản ghi khiếu nại. */
export function disputeTimeline(dispute: MarketplaceDispute): DisputeTimelineStep[] {
  return [
    {
      key: 'opened',
      label: 'Người mua mở khiếu nại',
      done: true,
      at: dispute.created_at,
      note: 'Từ lúc này tiền giữ đứng yên, người mua chưa xác nhận đơn được.',
    },
    {
      key: 'seller-evidence',
      label: 'Người bán gửi bằng chứng',
      done: hasSellerEvidence(dispute),
      at: null,
      note: hasSellerEvidence(dispute)
        ? 'Người bán đã gửi bằng chứng mô tả.'
        : 'Chờ đoạn nối đường gửi bằng chứng của người bán (xem disputes.README.md).',
    },
    {
      key: 'decision',
      label: 'Quản trị quyết định',
      done: !isDisputeOpen(dispute.status),
      at: dispute.resolved_at,
      note: dispute.admin_note
        ? `Ghi chú của quản trị: ${dispute.admin_note}`
        : 'Quản trị quyết bằng 1 trong 3 lựa chọn: trả tiền giữ, hoàn tiền, hoặc bác khiếu nại.',
    },
  ];
}

export function validateOpenDispute(input: {
  orderId: string;
  reason: string;
  evidenceText: string;
}): string[] {
  const errors: string[] = [];
  if (!input.orderId.trim()) errors.push('Chưa nhập mã đơn hàng.');
  const option = findReasonOption(input.reason);
  if (!option) {
    errors.push('Chưa chọn lý do khiếu nại.');
  } else if (!option.eligible) {
    errors.push(option.ineligibleNote ?? 'Lý do này không thuộc diện khiếu nại.');
  }
  return errors;
}

export function validateSellerEvidence(text: string): string[] {
  const errors: string[] = [];
  if (!text.trim()) errors.push('Chưa nhập bằng chứng mô tả.');
  if (text.length > SELLER_EVIDENCE_MAX_LENGTH) {
    errors.push(
      `Bằng chứng mô tả tối đa ${SELLER_EVIDENCE_MAX_LENGTH} ký tự (hiện ${text.length}).`,
    );
  }
  return errors;
}

/* ------------------------- Client gọi API đã có ------------------------- */

export type DisputeApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem('wcg_auth_token') ?? '';
  } catch {
    return '';
  }
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<DisputeApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthToken() ? `Bearer ${getAuthToken()}` : '',
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, code: 'NETWORK_ERROR', message: 'Không kết nối được máy chủ.' };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    return {
      ok: false,
      code: data?.code ?? `HTTP_${res.status}`,
      message: data?.message ?? 'Yêu cầu thất bại.',
    };
  }
  return { ok: true, data: (data?.dispute ?? data) as T };
}

export interface OpenDisputeInput {
  orderId: string;
  reason: string;
  evidenceText: string;
  desiredResolution: DesiredResolution;
}

/** Mở khiếu nại — đường API ĐÃ CÓ. */
export async function openDispute(
  input: OpenDisputeInput,
): Promise<DisputeApiResult<MarketplaceDispute>> {
  const errors = validateOpenDispute(input);
  if (errors.length > 0) {
    return { ok: false, code: 'VALIDATION_ERROR', message: errors.join(' ') };
  }
  return apiPost<MarketplaceDispute>('/api/marketplace/disputes', {
    order_id: input.orderId.trim(),
    reason: input.reason,
    evidence_text: composeBuyerEvidence(input.evidenceText, input.desiredResolution),
  });
}

export interface ResolveDisputeInput {
  disputeId: string;
  decision: DisputeDecision;
  adminNote: string;
}

/** Quản trị xử lý khiếu nại — đường API ĐÃ CÓ. */
export async function resolveDispute(
  input: ResolveDisputeInput,
): Promise<DisputeApiResult<MarketplaceDispute>> {
  if (!input.disputeId.trim()) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Thiếu mã khiếu nại.' };
  }
  return apiPost<MarketplaceDispute>('/api/marketplace/disputes/resolve', {
    dispute_id: input.disputeId.trim(),
    decision: input.decision,
    admin_note: input.adminNote,
  });
}

/* ------------- Đoạn nối CHƯA CÓ: đọc danh sách + bằng chứng người bán ------------- */

export interface PendingEndpointResult {
  ok: false;
  code: 'ENDPOINT_CHUA_CO';
  message: string;
  endpoint: string;
}

export const PROPOSED_DISPUTES_MINE_ENDPOINT = '/api/marketplace/disputes/mine';
export const PROPOSED_DISPUTES_SELLER_ENDPOINT = '/api/marketplace/disputes/seller';
export const PROPOSED_DISPUTES_ADMIN_ENDPOINT = '/api/marketplace/disputes/admin';
export const PROPOSED_DISPUTES_EVIDENCE_ENDPOINT = '/api/marketplace/disputes/evidence';

/**
 * Đọc danh sách khiếu nại. Đường này CHƯA CÓ trong _worker nên hiện tại luôn
 * trả về trạng thái chờ nối; khi điều phối viên thêm đường đọc (đúng hợp đồng
 * trong disputes.README.md), hàm này tự chạy được mà không cần sửa giao diện.
 */
export async function fetchDisputesFor(
  role: 'buyer' | 'seller' | 'admin',
): Promise<
  | { ok: true; disputes: MarketplaceDispute[] }
  | PendingEndpointResult
  | { ok: false; code: string; message: string }
> {
  const endpoint =
    role === 'buyer'
      ? PROPOSED_DISPUTES_MINE_ENDPOINT
      : role === 'seller'
        ? PROPOSED_DISPUTES_SELLER_ENDPOINT
        : PROPOSED_DISPUTES_ADMIN_ENDPOINT;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      headers: { Authorization: getAuthToken() ? `Bearer ${getAuthToken()}` : '' },
    });
  } catch {
    return {
      ok: false,
      code: 'ENDPOINT_CHUA_CO',
      message:
        'Chưa có đường đọc danh sách khiếu nại. Giao diện vẫn mở khiếu nại mới được, danh sách sẽ hiện sau khi điều phối viên nối đường đọc.',
      endpoint,
    };
  }
  if (res.status === 404) {
    return {
      ok: false,
      code: 'ENDPOINT_CHUA_CO',
      message:
        'Chưa có đường đọc danh sách khiếu nại. Giao diện vẫn mở khiếu nại mới được, danh sách sẽ hiện sau khi điều phối viên nối đường đọc.',
      endpoint,
    };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    return { ok: false, code: data?.code ?? `HTTP_${res.status}`, message: data?.message ?? 'Không đọc được danh sách.' };
  }
  return { ok: true, disputes: (data?.disputes ?? []) as MarketplaceDispute[] };
}

export interface SellerEvidenceDraft {
  disputeId: string;
  evidenceText: string;
  proposedSolution: DesiredResolution;
}

/**
 * Gửi bằng chứng của người bán. Đường này CHƯA CÓ nên hàm KHÔNG gọi mạng và
 * KHÔNG bao giờ trả về thành công giả: nó trả về bản nháp để giao diện giữ
 * lại cho người bán và hiển thị đúng nội dung sẽ gửi khi đoạn nối xong.
 */
export function submitSellerEvidence(draft: SellerEvidenceDraft): PendingEndpointResult {
  const errors = validateSellerEvidence(draft.evidenceText);
  if (errors.length > 0) {
    return {
      ok: false,
      code: 'ENDPOINT_CHUA_CO',
      message: errors.join(' '),
      endpoint: PROPOSED_DISPUTES_EVIDENCE_ENDPOINT,
    };
  }
  return {
    ok: false,
    code: 'ENDPOINT_CHUA_CO',
    message:
      'Đường gửi bằng chứng của người bán chưa có trong API. Bản nháp đã được giữ lại trên trang này; khi điều phối viên nối xong đường /api/marketplace/disputes/evidence, bấm gửi lại để gửi đúng nội dung này.',
    endpoint: PROPOSED_DISPUTES_EVIDENCE_ENDPOINT,
  };
}
