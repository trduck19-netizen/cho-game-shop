/**
 * Khoi 6 — Phap ly / tuan thu cho san cho-game-shop.
 *
 * File nay CHI chua logic thuan (khong import, khong doc DB truc tiep)
 * de dieu phoi vien va khoi khac co the goi lai, va de kiem thu bang
 * node ma khong can dung Cloudflare. Logic can DB nam o compliance.ts.
 *
 * NOI DUNG KHONG SAO CHEP TU SAN KHAC: phan hoc hoi tu cach lam chung
 * cua cac san (ghi o cuoi file, muc GHI CHU HOC HOI) chi la y tuong
 * mo ta lai bang loi cua minh, khong trich dan, khong lay so lieu
 * rieng cua doi thu. Khong co so giay phep hay dieu luat cu the nao
 * trong file nay vi chua kiem chung duoc — phan do nam trong muc
 * needsReview cua MARKETPLACE_TERMS, cho luat su/user duyet.
 */

// Phien ban dieu khoan hien tai. Khi sua noi dung dieu khoan, TANG
// phien ban nay de gian hang phai chap nhan lai (bang
// marketplace_seller_terms, mot dong moi cho mot phien ban).
export const TERMS_VERSION = '2026-11-02-v1';

// Phi san mac dinh hien tai (theo quyet user 02/11 ~02:18, dieu chinh
// duoc trong marketplace_settings). Ghi o day de hien thi, KHONG phai
// noi tinh phi — tinh phi that nam o API don hang (khoi 1+2).
export const DEFAULT_COMMISSION_PERCENT = 5;
// Thoi gian giu tien: 7 ngay = 168 gio (cung quyet tren).
export const ESCROW_HOLD_HOURS = 168;
// Cua so khieu nai: 7 ngay, trung voi thoi gian giu tien.
export const DISPUTE_WINDOW_HOURS = 168;

// Ly do khieu nai chuan hoa cho giao dien (khong sua bang disputes):
// giup nguoi mua mo ta dung van de, giup quan tri xu ly nhat quan.
// Bang disputes hien chi luu reason dang chu tu do, nen cac ma nay chi
// la goi y hien thi, khong phai rang buoc DB.
export const DISPUTE_REASONS = [
  { code: 'CODE_DA_DUNG', label: 'Mã đã được dùng trước đó' },
  { code: 'CODE_SAI', label: 'Mã không hợp lệ / báo lỗi khi nhập' },
  { code: 'CODE_KHONG_KHOP_GAME', label: 'Mã không dùng được cho game đã mua' },
  { code: 'CHUA_GIAO_MA', label: 'Chưa nhận được mã sau khi thanh toán' },
  { code: 'MO_TA_SAI', label: 'Sản phẩm giao khác mô tả' },
  { code: 'KHAC', label: 'Lý do khác (ghi rõ trong phần mô tả)' },
] as const;

export interface TermsSection {
  title: string;
  body: string[];
}

/**
 * DIEU KHOAN SAN — ban the hien cho nguoi dung (thuan tieng Viet).
 * Ban nay la ban van hanh, CHUA PHAI dieu khoan phap ly cuoi cung:
 * muc needsReview ben duoi liet ke dung nhung diem chi luat su/user
 * moi duoc chot. Khi ban nay doi, tang TERMS_VERSION.
 */
export const MARKETPLACE_TERMS: {
  version: string;
  title: string;
  note: string;
  sections: TermsSection[];
  needsReview: string[];
} = {
  version: TERMS_VERSION,
  title: 'Điều khoản sàn cho-game-shop',
  note: 'Sàn chỉ bán mã dùng một lần. Vui lòng đọc kỹ trước khi mở gian hàng hoặc mua hàng. Khi điều khoản đổi phiên bản, gian hàng cần chấp nhận lại mới được tiếp tục bán.',
  sections: [
    {
      title: '1. Sàn là gì',
      body: [
        'cho-game-shop là sàn trung gian kết nối người mua và người bán. Hợp đồng mua bán mã được xác lập trực tiếp giữa người mua và người bán; sàn giữ vai trò hiển thị gian hàng, giữ tiền, hỗ trợ giải quyết khiếu nại và ghi nhật ký giao dịch.',
        'Sàn không sở hữu mã do người bán nạp, không tự sinh mã, không tự mua hàng của chính mình và không cam kết mã của người bán nhất định dùng được nếu người bán nạp mã sai, mã đã dùng rồi hoặc mã không đúng game.',
      ],
    },
    {
      title: '2. Chỉ bán mã dùng một lần',
      body: [
        'Sàn chỉ bán mã dùng một lần (mỗi mã chỉ giao cho một người mua và chỉ dùng được một lần trong game). Người bán không được nạp mã dùng nhiều lần, mã tài khoản dùng chung hay mã cần chia sẻ tài khoản.',
        'Một mã chỉ được bán một lần trên toàn sàn: mã đang bán ở một gian hàng thì không được nạp lại ở gian hàng khác; mã đã bán rồi thì không được nạp lại để bán tiếp, vì mã đó có thể đã được dùng.',
      ],
    },
    {
      title: '3. Mã cấm bán',
      body: [
        'Cấm bán lại mã miễn phí công khai: mã mà nhà phát hành phát miễn phí cho mọi người chơi (mã chung công khai, mã sự kiện mở) không được đem bán trên sàn.',
        'Cấm bán mã có nguồn gốc không rõ ràng, mã trộm cắp, mã bẻ khóa, mã gian lận, mã vi phạm điều khoản của nhà phát hành game. Người bán phải chứng minh được nguồn mã khi quản trị yêu cầu.',
        'Cấm bán mã kèm điều kiện phải giao dịch ngoài sàn, phải chuyển tiền trực tiếp hoặc phải cung cấp mật khẩu, mã xác thực của tài khoản người mua.',
      ],
    },
    {
      title: '4. Trách nhiệm của người bán',
      body: [
        'Người bán chịu trách nhiệm hoàn toàn về mã mình nạp: mã phải đúng game, đúng mô tả, chưa từng được dùng, chưa từng được bán cho người khác.',
        'Người bán phải ghi mô tả trung thực: tên game, nội dung mã, cách nhập mã, hạn dùng nếu có. Mã không ghi hạn vẫn phải dùng được tại thời điểm giao; mã hết hạn trước khi giao là lỗi của người bán.',
        'Người bán không được tự mua sản phẩm của chính mình, không được nhờ người khác mua để tạo doanh số giả, không được tự đánh giá gian hàng của mình.',
      ],
    },
    {
      title: '5. Giá, phí và giữ tiền 7 ngày',
      body: [
        'Người mua thanh toán bằng số dư ví trên sàn. Phí sàn mặc định là 5% trên tổng tiền đơn, có thể điều chỉnh trong phần cài đặt của quản trị; mức phí áp dụng là mức phí tại thời điểm đặt đơn.',
        'Sau khi giao mã, tiền của đơn được giữ 7 ngày (168 giờ), không trả ngay cho người bán. Trong 7 ngày này, người mua kiểm tra mã và có thể mở khiếu nại.',
        'Hết 7 ngày mà không có khiếu nại đang mở, tiền giữ tự động chuyển thành tiền khả dụng cho người bán. Người mua bấm xác nhận trước thời hạn thì tiền được trả ngay.',
      ],
    },
    {
      title: '6. Hoàn tiền không thu hồi mã đã giao',
      body: [
        'Mã đã giao cho người mua thì không thu hồi được, vì mã có thể đã được nhập vào game ngay sau khi giao. Vì vậy, khi quản trị quyết định hoàn tiền cho một đơn, sàn chỉ hoàn lại tiền cho người mua, không thu hồi mã và không bắt người mua trả lại mã.',
        'Người bán cần hiểu rõ rủi ro này trước khi nạp mã: một đơn bị hoàn tiền đồng nghĩa với việc mã đã giao coi như mất, không bán lại được.',
      ],
    },
    {
      title: '7. Khiếu nại trong 7 ngày',
      body: [
        'Người mua chỉ khiếu nại được trong thời gian tiền còn đang giữ (7 ngày kể từ khi đặt đơn). Hết thời gian giữ tiền mà không có khiếu nại, đơn coi như hoàn tất.',
        'Khi khiếu nại đang mở, tiền giữ đứng yên cho tới khi quản trị quyết: trả tiền cho người bán, hoàn tiền cho người mua, hoặc bác khiếu nại. Người mua bấm xác nhận đơn thì không mở khiếu nại cho đơn đó nữa.',
        'Người mua cần ghi rõ lý do và bằng chứng (mã lỗi khi nhập, ảnh chụp màn hình nếu có). Khiếu nại không có lý do rõ ràng có thể bị bác.',
        'Người mua bấm xác nhận đã nhận và dùng được mã thì coi như chấp nhận mã đúng mô tả; sau xác nhận, sàn không giải quyết khiếu nại cho đơn đó nữa.',
      ],
    },
    {
      title: '8. Giao dịch trong sàn và chống gian lận',
      body: [
        'Mọi giao dịch phải thực hiện trong sàn. Cấm rủ người mua ra ngoài sàn để chuyển tiền trực tiếp, cấm trao đổi mã ngoài sàn rồi quay lại sàn khiếu nại.',
        'Cấm gian lận đánh giá: chỉ người mua thật của một đơn đã hoàn tất mới được đánh giá cho đơn đó, mỗi đơn chỉ một đánh giá, người bán không được đánh giá gian hàng của mình. Đánh giá gian lận bị gỡ và tính vào lịch sử gian hàng.',
        'Sàn kiểm tra trùng mã khi nạp mã, ghi nhật ký thao tác quản trị và giới hạn gian hàng mới (xem mục 9) để hạn chế thiệt hại khi có gian hàng xấu.',
      ],
    },
    {
      title: '9. Gian hàng mới và lên hạng',
      body: [
        'Gian hàng mới ở mức thử: tối đa 5 sản phẩm, mỗi sản phẩm tối đa 20 mã. Giới hạn này mặc định bật, quản trị có thể điều chỉnh hoặc tắt trong phần cài đặt sàn.',
        'Gian hàng lên hạng chuẩn khi có 20 đơn thành công và tỷ lệ khiếu nại dưới 5%. Lên hạng chuẩn không tự động mở rộng vô hạn: quản trị vẫn duyệt sản phẩm mới trước khi bán.',
        'Gian hàng vi phạm điều khoản có thể bị tạm khóa (ngừng bán nhưng vẫn giữ dữ liệu và tiền giữ để giải quyết đơn đang dở). Khóa vĩnh viễn gian hàng chỉ áp dụng sau khi user/quản trị cấp cao duyệt — xem mục needsReview.',
      ],
    },
    {
      title: '10. Bảo mật mã và thông tin',
      body: [
        'Mã trong kho không bao giờ hiển thị công khai, không hiển thị trong danh sách sản phẩm, không ghi vào nhật ký thao tác. Mã chỉ hiển thị cho đúng người mua sau khi đơn được tạo.',
        'Người bán không được gửi mã qua kênh ngoài sàn cho người mua của sàn. Người mua không được chia sẻ mã đã mua công khai rồi khiếu nại mã đã bị dùng.',
      ],
    },
  ],
  needsReview: [
    'CHƯA DUYỆT — Tư cách pháp lý của đơn vị vận hành sàn, thông tin liên hệ và địa chỉ công khai trên trang điều khoản.',
    'CHƯA DUYỆT — Nghĩa vụ thuế, hóa đơn và cách xử lý tiền giữ khi có tranh chấp kéo dài quá 7 ngày.',
    'CHƯA DUYỆT — Điều khoản riêng của từng nhà phát hành game (có game cấm mua bán mã thứ cấp hay không) — cần rà soát theo từng game trước khi cho bán.',
    'CHƯA DUYỆT — Quy trình và thẩm quyền khóa vĩnh viễn gian hàng, giữ hay trả tiền khả dụng khi khóa vĩnh viễn.',
    'CHƯA DUYỆT — Luật áp dụng và cơ quan giải quyết tranh chấp khi người mua và người bán không thỏa thuận được (không ghi số luật cụ thể vì chưa kiểm chứng).',
  ],
};

/** Chuan hoa ma de so trung: cat khoang trang, viet hoa toan bo. */
export function normalizeCode(code: string): string {
  return String(code || '').trim().toUpperCase();
}

export type CodeCheckStatus = 'OK' | 'DUPLICATE_IN_BATCH' | 'DUPLICATE_LIVE' | 'ALREADY_SOLD';

/**
 * Phan tich mot lo ma nap len truoc khi ghi DB.
 * - existing: cac dong da co trong kho (chi can code_norm + status).
 * - Tra ve ket qua theo tung ma, KHONG tiet lo ma do thuoc gian hang nao
 *   (phia API chi tra status, khong tra seller_id/product_id cua ma trung).
 * Quy tac:
 * - Trung trong chinh lo nap -> DUPLICATE_IN_BATCH (chi tinh 1 lan).
 * - Trung voi ma AVAILABLE/RESERVED -> DUPLICATE_LIVE (chan).
 * - Trung voi ma SOLD -> ALREADY_SOLD (chan o tang API, vi ma dung mot
 *   lan da ban thi coi nhu da dung; chi muc DB partial chi chan LIVE,
 *   nen phan nay bat buoc phai chay truoc khi INSERT — xem compliance.ts).
 * - Ma o game khac nhung cung chuoi ky tu van bi tinh la trung (lua chon
 *   bao thu, ghi ro trong bao cao de dieu phoi vien quyet co tach theo
 *   game hay khong). Ly do: kho hien khong luu game_slug tren tung ma,
 *   va an toan hon la chan thua thay vi de lot ma da ban.
 */
export function analyzeCodeBatch(
  codes: string[],
  existing: Array<{ code_norm: string; status: string }>,
): Array<{ code: string; code_norm: string; status: CodeCheckStatus }> {
  const live = new Set<string>();
  const sold = new Set<string>();
  for (const row of existing || []) {
    const norm = normalizeCode(row.code_norm);
    if (!norm) continue;
    if (row.status === 'AVAILABLE' || row.status === 'RESERVED') live.add(norm);
    else if (row.status === 'SOLD') sold.add(norm);
  }
  const seenInBatch = new Set<string>();
  const out: Array<{ code: string; code_norm: string; status: CodeCheckStatus }> = [];
  for (const raw of codes) {
    const code = String(raw || '').trim();
    const code_norm = normalizeCode(code);
    if (!code_norm) continue;
    if (seenInBatch.has(code_norm)) {
      out.push({ code, code_norm, status: 'DUPLICATE_IN_BATCH' });
      continue;
    }
    seenInBatch.add(code_norm);
    if (live.has(code_norm)) out.push({ code, code_norm, status: 'DUPLICATE_LIVE' });
    else if (sold.has(code_norm)) out.push({ code, code_norm, status: 'ALREADY_SOLD' });
    else out.push({ code, code_norm, status: 'OK' });
  }
  return out;
}

/** Lo ma co duoc nap hay khong: chi khi moi ma deu OK. */
export function isBatchClean(
  results: Array<{ status: CodeCheckStatus }>,
): boolean {
  return results.length > 0 && results.every((r) => r.status === 'OK');
}

export interface NewSellerLimitSettings {
  new_seller_max_products?: number | null;
  new_seller_max_codes_per_product?: number | null;
  standard_tier_min_completed_orders?: number | null;
  standard_tier_max_dispute_percent?: number | null;
}

export interface NewSellerCounts {
  productCount: number;
  codesInProduct: number;
  completedOrders: number;
  disputeCount: number;
}

/**
 * Kiem tra gioi han gian hang moi (thuan, khong doc DB).
 * - NULL = gioi han do dang tat.
 * - Gian hang dat hang chuan (du don thanh cong + ty le khieu nai thap)
 *   thi khong bi gioi han moi nua.
 * - Ty le khieu nai tinh tren don thanh cong; chua co don nao thi coi
 *   nhu chua dat hang chuan (khong chia cho 0).
 */
export function checkNewSellerLimits(
  settings: NewSellerLimitSettings,
  counts: NewSellerCounts,
): { allowed: boolean; isStandardTier: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const minOrders = settings.standard_tier_min_completed_orders;
  const maxDisputePct = settings.standard_tier_max_dispute_percent;
  let isStandardTier = false;
  if (minOrders !== null && minOrders !== undefined && counts.completedOrders >= minOrders) {
    const pct = counts.completedOrders > 0 ? (counts.disputeCount / counts.completedOrders) * 100 : 100;
    if (maxDisputePct === null || maxDisputePct === undefined || pct < maxDisputePct) {
      isStandardTier = true;
    }
  }
  if (!isStandardTier) {
    if (
      settings.new_seller_max_products !== null &&
      settings.new_seller_max_products !== undefined &&
      counts.productCount >= settings.new_seller_max_products
    ) {
      reasons.push('Gian hàng mới đã đạt tối đa số sản phẩm cho phép.');
    }
    if (
      settings.new_seller_max_codes_per_product !== null &&
      settings.new_seller_max_codes_per_product !== undefined &&
      counts.codesInProduct >= settings.new_seller_max_codes_per_product
    ) {
      reasons.push('Sản phẩm đã đạt tối đa số mã cho phép ở mức gian hàng mới.');
    }
  }
  return { allowed: reasons.length === 0, isStandardTier, reasons };
}

/**
 * Kiem tra chong gian lan danh gia — phoi hop voi khoi 5, KHONG sua
 * file cua khoi 5. Khoi 5 goi ham nay truoc khi ghi danh gia; ham chi
 * tra ly do chan, khong ghi DB. Bang marketplace_reviews da co UNIQUE
 * tren order_id (moi don mot danh gia) nen tang DB tu chan danh gia
 * trung don; phan con lai (nguoi danh gia phai la nguoi mua cua don,
 * nguoi ban khong tu danh gia) phai kiem tra o tang API bang ham nay.
 */
export function checkReviewFraud(input: {
  reviewerMemberId: string;
  orderBuyerId: string;
  sellerMemberId: string;
  rating: number;
}): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.reviewerMemberId !== input.orderBuyerId) {
    reasons.push('Chỉ người mua của đơn mới được đánh giá cho đơn đó.');
  }
  if (input.reviewerMemberId === input.sellerMemberId) {
    reasons.push('Người bán không được đánh giá gian hàng của mình.');
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    reasons.push('Điểm đánh giá phải từ 1 đến 5.');
  }
  return { allowed: reasons.length === 0, reasons };
}

/**
 * GHI CHU HOC HOI (y tuong, khong sao chep noi dung):
 * - Cach lam chung cua cac san ma so: giu tien moi don (escrow) cho toi
 *   khi nguoi mua xac nhan hoac het cua so bao ve; khieu nai mo se dong
 *   bang tien giu; xac nhan nhan hang la chap nhan cuoi cung.
 *   Ap dung o day: giu 7 ngay + khieu nai 7 ngay (da co o khoi 1+2),
 *   khoi 6 chi them ly do chuan hoa va ghi ro he qua vao dieu khoan.
 * - Cach lam chung: xac minh gian hang truoc khi ban, lich su ban hang
 *   minh bach. Ap dung khac di cho san ma so: khong dung dich vu xac
 *   minh danh tinh ben ngoai o giai doan nay (chua co quyet, chua co
 *   ngan sach); thay bang: duyet gian hang bang tay + chap nhan dieu
 *   khoan theo phien ban + gioi han gian hang moi + nhat ky khong sua.
 * - Cach lam chung: cam ma trom cap, ma be khoa, hang vi pham dieu
 *   khoan nha phat hanh. Ap dung thang vao dieu 3, kem nghia vu nguoi
 *   ban chung minh nguon ma khi duoc yeu cau.
 * - Cach lam chung: cam giao dich ngoai san. Ap dung thang vao dieu 8,
 *   vi giao dich ngoai san lam mat bao ve escrow va khong co bang chung.
 * - Khong ap dung: xac minh danh tinh qua ben thu ba, bao hiem ben
 *   thu ba, phat tien tu dong tren so du — chua co quyet, chi ghi vao
 *   muc can duyet neu sau nay user muon them.
 */
export const COMPLIANCE_NOTES = 'Xem GHI CHU HOC HOI o cuoi file compliance-logic.ts.';
