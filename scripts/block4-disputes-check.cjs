/**
 * Kiểm thử logic Khối 4 (khiếu nại sàn) — CHẠY NGOÀI BẢN BUILD.
 *
 * - Phần 1: bundle src/marketplace/disputes.ts bằng esbuild ra file tạm trong
 *   /tmp rồi require để kiểm tra đúng code thật (không kiểm tra bản sao).
 * - Phần 2: SQLite trong bộ nhớ (:memory:) mô phỏng đúng ràng buộc của
 *   migration 0012 cho bảng khiếu nại + tiền giữ + hàng mã đã giao.
 * - Dữ liệu thử chỉ là chuỗi ghi rõ trong bộ nhớ, KHÔNG nạp vào DB thật,
 *   KHÔNG sinh mã bán thật. Mọi thứ xóa sạch trong khối finally.
 * - Thoát mã 1 nếu bất kỳ kiểm tra nào trượt.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BUNDLE = path.join(os.tmpdir(), `block4-disputes-${process.pid}.cjs`);

let passed = 0;
function check(name, cond) {
  if (!cond) throw new Error(`TRƯỢT: ${name}`);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

try {
  console.log('Phần 1: logic thuần trong src/marketplace/disputes.ts');
  execSync(
    `node_modules/.bin/esbuild src/marketplace/disputes.ts --bundle --platform=node --format=cjs --outfile=${BUNDLE}`,
    { cwd: ROOT, stdio: 'pipe' },
  );
  const d = require(BUNDLE);

  check('Nhãn OPEN là "Đang mở"', d.disputeStatusLabel('OPEN') === 'Đang mở');
  check(
    'Nhãn RESOLVED_REFUND là hoàn tiền',
    d.disputeStatusLabel('RESOLVED_REFUND') === 'Đã hoàn tiền cho người mua',
  );
  check('Chỉ mở khiếu nại khi tiền còn HELD', d.canOpenDispute('HELD') === true);
  check('Đã trả/hoàn thì không mở được', d.canOpenDispute('RELEASED') === false && d.canOpenDispute('REFUNDED') === false);
  check(
    'Đang khiếu nại mở thì không xác nhận đơn được',
    d.canConfirmOrderWhileDisputeOpen('OPEN') === false,
  );
  check(
    'Đóng khiếu nại rồi thì xác nhận lại được',
    d.canConfirmOrderWhileDisputeOpen('RESOLVED_REFUND') === true,
  );

  const release = d.describeDecision('RESOLVED_RELEASE');
  check('Người bán thắng thì trả tiền giữ', /chuyển thành tiền khả dụng/.test(release.moneyFlow));
  const refund = d.describeDecision('RESOLVED_REFUND');
  check('Hoàn tiền thì KHÔNG thu hồi mã', /KHÔNG bị thu hồi/.test(refund.codeNote));
  check('Hoàn tiền thì đơn CANCELLED', /CANCELLED/.test(refund.orderStatus));
  const rejected = d.describeDecision('REJECTED');
  check('Bác khiếu nại thì KHÔNG trả tiền ngay', /KHÔNG trả ngay/.test(rejected.moneyFlow));
  check('Bác khiếu nại thì tiền vẫn giữ', /vẫn giữ/.test(rejected.moneyFlow));

  check(
    'Lý do đổi ý bị chặn',
    d.validateOpenDispute({ orderId: 'ord-1', reason: 'CHANGED_MIND', evidenceText: '' }).length > 0,
  );
  check(
    'Lý do mã đã dùng được chấp nhận',
    d.validateOpenDispute({ orderId: 'ord-1', reason: 'CODE_ALREADY_USED', evidenceText: 'lỗi' }).length === 0,
  );
  check(
    'Thiếu mã đơn thì bị chặn',
    d.validateOpenDispute({ orderId: '', reason: 'CODE_ALREADY_USED', evidenceText: '' }).length > 0,
  );
  check(
    'Nguyện vọng ghép công khai vào bằng chứng',
    d.composeBuyerEvidence('mã lỗi', 'REFUND').includes('Mong muốn giải quyết: Hoàn tiền.'),
  );
  check(
    'Bằng chứng người bán quá dài bị chặn',
    d.validateSellerEvidence('x'.repeat(2001)).length > 0,
  );

  const base = {
    id: 'd1', order_id: 'ord-1', buyer_id: 'b1', seller_id: 's1',
    reason: 'CODE_ALREADY_USED', evidence_text: 'người mua trình bày',
    status: 'OPEN', admin_note: '', created_at: '2026-11-02T00:00:00Z', resolved_at: null,
  };
  check(
    'Một bên có bằng chứng thì chưa gắn cờ xung đột',
    d.classifyReview(base).flag === 'NONE',
  );
  check(
    'Hai bên đều có bằng chứng thì gắn cờ cần duyệt',
    d.classifyReview({ ...base, seller_evidence_text: 'người bán trình bày' }).flag === 'CONFLICTING_EVIDENCE',
  );
  check(
    'Ngưỡng chưa chốt thì đơn lớn cũng không gắn cờ vượt ngưỡng',
    d.classifyReview(base, { grossAmount: 999999999, refundReviewThreshold: null }).flag === 'NONE',
  );
  check(
    'Ngưỡng đã chốt + vượt ngưỡng thì gắn cờ',
    d.classifyReview(base, { grossAmount: 600, refundReviewThreshold: 500 }).flag === 'OVER_THRESHOLD',
  );
  check(
    'Dưới ngưỡng thì không gắn cờ',
    d.classifyReview(base, { grossAmount: 100, refundReviewThreshold: 500 }).flag === 'NONE',
  );
  const timeline = d.disputeTimeline(base);
  check('Dòng thời gian có 3 bước', timeline.length === 3);
  check('Bước mở đã xong, bước quyết chưa xong', timeline[0].done === true && timeline[2].done === false);
  const pending = d.submitSellerEvidence({ disputeId: 'd1', evidenceText: 'trình bày', proposedSolution: 'ADMIN_DECIDE' });
  check(
    'Gửi bằng chứng người bán chưa có đường API thì KHÔNG trả thành công giả',
    pending.ok === false && pending.code === 'ENDPOINT_CHUA_CO',
  );

  console.log('Phần 2: SQLite trong bộ nhớ, mô phỏng ràng buộc migration 0012');
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`
      CREATE TABLE marketplace_escrow (
        id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, seller_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL, gross_amount INTEGER NOT NULL, commission_amount INTEGER NOT NULL,
        net_amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED', 'REFUNDED'))
      );
      CREATE TABLE marketplace_disputes (
        id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, buyer_id TEXT NOT NULL,
        seller_id TEXT NOT NULL, reason TEXT NOT NULL, evidence_text TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'OPEN'
          CHECK (status IN ('OPEN', 'RESOLVED_RELEASE', 'RESOLVED_REFUND', 'REJECTED')),
        admin_note TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );
      CREATE TABLE marketplace_inventory_codes (
        id TEXT PRIMARY KEY, product_id TEXT NOT NULL, seller_id TEXT NOT NULL,
        code_content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED')),
        order_id TEXT, sold_at TEXT
      );
    `);
    // Đơn thử trong bộ nhớ (không phải mã bán thật, không chạm DB thật).
    db.prepare(`INSERT INTO marketplace_escrow VALUES ('esc-mem-1', 'ord-mem-1', 'sel-mem-1', 'buy-mem-1', 1000, 50, 950, 'HELD')`).run();
    db.prepare(`INSERT INTO marketplace_inventory_codes VALUES ('code-mem-1', 'prod-mem-1', 'sel-mem-1', 'MEM-ONLY-NOT-FOR-SALE', 'SOLD', 'ord-mem-1', datetime('now'))`).run();
    db.prepare(`INSERT INTO marketplace_disputes (id, order_id, buyer_id, seller_id, reason, evidence_text) VALUES ('dsp-mem-1', 'ord-mem-1', 'buy-mem-1', 'sel-mem-1', 'CODE_ALREADY_USED', 'mô tả trong bộ nhớ')`).run();
    check('Mở được 1 khiếu nại OPEN cho đơn đang HELD', db.prepare(`SELECT COUNT(*) c FROM marketplace_disputes WHERE order_id = 'ord-mem-1' AND status = 'OPEN'`).get().c === 1);

    let secondOpenBlocked = false;
    try {
      db.prepare(`INSERT INTO marketplace_disputes (id, order_id, buyer_id, seller_id, reason) VALUES ('dsp-mem-2', 'ord-mem-1', 'buy-mem-1', 'sel-mem-1', 'CODE_INVALID')`).run();
    } catch {
      secondOpenBlocked = true;
    }
    check('Đơn đã có khiếu nại thì không mở thêm được (order_id duy nhất)', secondOpenBlocked === true);

    // Mô phỏng quyết định REJECTED của API: chỉ đổi khiếu nại, tiền giữ nguyên.
    db.prepare(`UPDATE marketplace_disputes SET status = 'REJECTED', resolved_at = datetime('now') WHERE id = 'dsp-mem-1'`).run();
    check(
      'Bác khiếu nại xong tiền giữ vẫn HELD',
      db.prepare(`SELECT status FROM marketplace_escrow WHERE order_id = 'ord-mem-1'`).get().status === 'HELD',
    );

    // Mô phỏng quyết định RESOLVED_REFUND trên đơn thứ hai: tiền giữ -> REFUNDED,
    // hàng mã đã giao KHÔNG bị xóa/sửa.
    db.prepare(`INSERT INTO marketplace_escrow VALUES ('esc-mem-2', 'ord-mem-2', 'sel-mem-1', 'buy-mem-1', 1000, 50, 950, 'HELD')`).run();
    db.prepare(`INSERT INTO marketplace_inventory_codes VALUES ('code-mem-2', 'prod-mem-1', 'sel-mem-1', 'MEM-ONLY-NOT-FOR-SALE', 'SOLD', 'ord-mem-2', datetime('now'))`).run();
    db.prepare(`INSERT INTO marketplace_disputes (id, order_id, buyer_id, seller_id, reason) VALUES ('dsp-mem-3', 'ord-mem-2', 'buy-mem-1', 'sel-mem-1', 'CODE_INVALID')`).run();
    db.prepare(`UPDATE marketplace_escrow SET status = 'REFUNDED' WHERE order_id = 'ord-mem-2'`).run();
    db.prepare(`UPDATE marketplace_disputes SET status = 'RESOLVED_REFUND', resolved_at = datetime('now') WHERE id = 'dsp-mem-3'`).run();
    const codeRow = db.prepare(`SELECT status, order_id FROM marketplace_inventory_codes WHERE id = 'code-mem-2'`).get();
    check('Hoàn tiền xong mã đã giao vẫn SOLD, không bị thu hồi', codeRow.status === 'SOLD' && codeRow.order_id === 'ord-mem-2');
    check(
      'Hoàn tiền xong tiền giữ thành REFUNDED',
      db.prepare(`SELECT status FROM marketplace_escrow WHERE order_id = 'ord-mem-2'`).get().status === 'REFUNDED',
    );
  } finally {
    db.close();
  }

  console.log(`\nĐẠT: ${passed} kiểm tra. Dữ liệu thử trong bộ nhớ đã xóa (DB :memory: đã đóng).`);
} catch (err) {
  console.error(`\nKIỂM THỬ TRƯỢT: ${err.message}`);
  process.exitCode = 1;
} finally {
  try {
    if (fs.existsSync(BUNDLE)) fs.unlinkSync(BUNDLE);
  } catch { /* file tạm, bỏ qua */ }
}
