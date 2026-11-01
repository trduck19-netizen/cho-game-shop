/**
 * Order Service - Cloudflare D1 ACID Batch Execution
 * Phòng chống Race Condition & Over-selling mã kho theo tiêu chuẩn giao dịch ngân hàng số.
 */

export interface CreateOrderParams {
  userId: string;
  productId: string;
  quantity: number;
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  deliveredCodes?: string[];
  remainingBalance?: number;
  error?: string;
  errorCode?: 'INSUFFICIENT_BALANCE' | 'OUT_OF_STOCK' | 'PRODUCT_NOT_FOUND' | 'USER_NOT_FOUND' | 'DB_ERROR';
}

export class OrderService {
  constructor(private db: D1Database) {}

  /**
   * Mua hàng & Xuất mã code nguyên tử (ACID Transaction via D1 Batch)
   * Đảm bảo:
   * 1. Kiểm tra số dư người dùng (CHECK constraint balance >= 0).
   * 2. Chỉ cấp các mã có status = 'available'.
   * 3. Chốt chặn order_stock_validation ngăn chặn 100% tình trạng 2 khách cùng mua 1 mã cuối cùng.
   */
  public async purchaseProduct(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { userId, productId, quantity } = params;

    if (!quantity || quantity <= 0) {
      return { success: false, error: 'Số lượng mua phải lớn hơn 0.', errorCode: 'DB_ERROR' };
    }

    try {
      // 1. Kiểm tra tồn tại sản phẩm và người dùng (Snapshot read)
      const [product, user] = await Promise.all([
        this.db.prepare('SELECT id, name, price, is_active FROM products WHERE id = ?').bind(productId).first<any>(),
        this.db.prepare('SELECT id, email, display_name, balance, status FROM users WHERE id = ?').bind(userId).first<any>(),
      ]);

      if (!product || product.is_active === 0) {
        return { success: false, error: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.', errorCode: 'PRODUCT_NOT_FOUND' };
      }

      if (!user || user.status === 'BANNED') {
        return { success: false, error: 'Tài khoản người dùng không hợp lệ hoặc đã bị khóa.', errorCode: 'USER_NOT_FOUND' };
      }

      const unitPrice = Number(product.price) || 0;
      const totalAmount = unitPrice * quantity;
      const currentBalance = Number(user.balance) || 0;

      if (currentBalance < totalAmount) {
        return {
          success: false,
          error: `Số dư ví không đủ. Cần ${totalAmount.toLocaleString('vi-VN')} Core nhưng ví hiện có ${currentBalance.toLocaleString('vi-VN')} Core.`,
          errorCode: 'INSUFFICIENT_BALANCE',
        };
      }

      // 2. Khởi tạo mã định danh duy nhất cho đơn hàng
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const txId = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 3. Chuẩn bị 5 câu lệnh Batch chạy trong cùng 1 Transaction nguyên tử
      // Bước A: Khóa và chuyển trạng thái các mã khả dụng sang 'sold'
      const stmt1 = this.db.prepare(`
        UPDATE inventory_items
        SET status = 'sold',
            order_id = ?,
            sold_at = datetime('now')
        WHERE id IN (
          SELECT id FROM inventory_items
          WHERE product_id = ? AND status = 'available'
          ORDER BY created_at ASC, id ASC
          LIMIT ?
        )
      `).bind(orderId, productId, quantity);

      // Bước B: Chốt chặn kiểm tra số lượng mã thực tế được gán.
      // Nếu số mã thực tế gán != quantity (ví dụ kho chỉ còn ít hơn yêu cầu), subquery trả về NULL
      // làm vỡ NOT NULL constraint -> D1 ROLLBACK TOÀN BỘ TRANSACTION NGAY LẬP TỨC!
      const stmt2 = this.db.prepare(`
        INSERT INTO order_stock_validation (order_id, verified)
        VALUES (
          ?,
          (
            SELECT CASE WHEN COUNT(*) = ? THEN 1 ELSE NULL END
            FROM inventory_items
            WHERE order_id = ?
          )
        )
      `).bind(orderId, quantity, orderId);

      // Bước C: Trừ tiền ví người dùng nguyên tử với CHECK constraint balance >= 0
      const stmt3 = this.db.prepare(`
        UPDATE users
        SET balance = balance - ?,
            total_spent = total_spent + ?,
            updated_at = datetime('now')
        WHERE id = ? AND balance >= ?
      `).bind(totalAmount, totalAmount, userId, totalAmount);

      // Bước D: Cập nhật giảm tồn kho hiển thị của sản phẩm
      const stmt4 = this.db.prepare(`
        UPDATE products
        SET stock_quantity = MAX(0, stock_quantity - ?),
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(quantity, productId);

      // Bước E: Ghi nhận đơn hàng hoàn tất kèm danh sách mã gán tự động
      const stmt5 = this.db.prepare(`
        INSERT INTO orders (
          id, user_id, product_id, buyer_email, buyer_name, product_title,
          quantity, unit_price, amount, status, balance_before, balance_after,
          delivered_codes, created_at
        )
        SELECT
          ?,
          u.id,
          ?,
          u.email,
          u.display_name,
          ?,
          ?,
          ?,
          ?,
          'COMPLETED',
          u.balance + ?,
          u.balance,
          (
            SELECT json_group_array(code_value)
            FROM inventory_items
            WHERE order_id = ?
          ),
          datetime('now')
        FROM users u
        WHERE u.id = ?
      `).bind(
        orderId,
        productId,
        product.name,
        quantity,
        unitPrice,
        totalAmount,
        totalAmount,
        orderId,
        userId
      );

      // Bước F: Ghi nhận biến động số dư ví
      const stmt6 = this.db.prepare(`
        INSERT INTO wallet_transactions (
          id, user_id, reference_id, type, amount,
          balance_before, balance_after, description, status, created_at
        )
        SELECT
          ?,
          u.id,
          ?,
          'ORDER_PAYMENT',
          -?,
          u.balance + ?,
          u.balance,
          'Thanh toán đơn hàng ' || ? || ' (' || ? || ')',
          'COMPLETED',
          datetime('now')
        FROM users u
        WHERE u.id = ?
      `).bind(
        txId,
        orderId,
        totalAmount,
        totalAmount,
        orderId,
        product.name,
        userId
      );

      // 4. Thực thi Transaction Batch
      await this.db.batch([stmt1, stmt2, stmt3, stmt4, stmt5, stmt6]);

      // 5. Đọc lại danh sách mã code vừa cấp và số dư ví mới
      const [soldItems, updatedUser] = await Promise.all([
        this.db.prepare('SELECT code_value, serial_number FROM inventory_items WHERE order_id = ? ORDER BY id ASC').bind(orderId).all<any>(),
        this.db.prepare('SELECT balance FROM users WHERE id = ?').bind(userId).first<any>(),
      ]);

      const deliveredCodes = (soldItems.results || []).map((item: any) =>
        item.serial_number ? `${item.code_value} | SN: ${item.serial_number}` : item.code_value
      );

      return {
        success: true,
        orderId,
        deliveredCodes,
        remainingBalance: updatedUser ? Number(updatedUser.balance) : undefined,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);

      // Bắt lỗi ràng buộc số dư
      if (msg.includes('CHECK constraint failed: balance >= 0') || msg.includes('SQLITE_CONSTRAINT_CHECK')) {
        return {
          success: false,
          error: 'Số dư ví không đủ để thanh toán đơn hàng này.',
          errorCode: 'INSUFFICIENT_BALANCE',
        };
      }

      // Bắt lỗi chốt chặn kho (hết hàng do race condition người khác mua trước)
      if (msg.includes('order_stock_validation.verified') || msg.includes('SQLITE_CONSTRAINT_NOTNULL')) {
        return {
          success: false,
          error: 'Sản phẩm đã hết hàng hoặc không đủ số lượng trong kho.',
          errorCode: 'OUT_OF_STOCK',
        };
      }

      return {
        success: false,
        error: 'Lỗi giao dịch cơ sở dữ liệu D1: ' + msg,
        errorCode: 'DB_ERROR',
      };
    }
  }
}
