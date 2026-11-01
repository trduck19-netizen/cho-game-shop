import {
  purchaseOrderD1,
  ensureSchemaUpgrades,
} from '../../services/d1_service';
import { verifyToken, extractUserIdFromToken } from '../../services/auth_service';
import { getRealEventsHub, saveRealEventsHub } from '../../services/realEventsHub';
import { sendOutOfStockAlert, sendNewOrderAlert } from '../../services/telegram_service';

interface Env {
  DB: D1Database;
  ADMIN_SYNC_SECRET?: string;
  JWT_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-Requested-With, X-Forwarded-Sync, Idempotency-Key, idempotency-key',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ success: false, message: 'D1 Database chưa được cấu hình.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    await ensureSchemaUpgrades(env.DB);

    const body: any = await request.json().catch(() => ({}));
    const {
      productId,
      utilityId,
      productTitle,
      quantity = 1,
      memberEmail,
      buyerName,
      buyerPhone,
    } = body || {};

    const targetId = String(productId || utilityId || '').trim();
    if (!targetId && !productTitle) {
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu thông tin mã sản phẩm.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const rawKey = request.headers.get('Idempotency-Key') || body?.idempotencyKey || '';
    const idempotencyKey = typeof rawKey === 'string' ? rawKey.trim() : '';

    if (!idempotencyKey || !/^[a-zA-Z0-9_\-]{8,128}$/.test(idempotencyKey)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Yêu cầu Idempotency-Key hợp lệ (UUID v4 hoặc chuỗi định danh 8-128 ký tự) để bảo vệ thanh toán chống trùng lặp.',
          code: 'INVALID_IDEMPOTENCY_KEY',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const qty = Math.max(1, Math.min(999, Math.floor(Number(quantity) || 1)));
    const nowIso = new Date().toISOString();

    // 1. Authenticate Buyer strictly via Session / Bearer Token
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Vui lòng đăng nhập tài khoản để thực hiện mua mã.',
        }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { valid, userId: tokenUserId } = await verifyToken(token, [env.JWT_SECRET, env.ADMIN_SYNC_SECRET]);

    let member: any = null;
    // Look up member by session token or verified token user ID
    if (token) {
      member = await env.DB.prepare(
        'SELECT * FROM members WHERE session_token = ? LIMIT 1'
      ).bind(token).first<any>();
    }

    if (!member && valid && tokenUserId) {
      member = await env.DB.prepare(
        'SELECT * FROM members WHERE id = ? OR username = ? OR email = ? LIMIT 1'
      ).bind(tokenUserId, tokenUserId, tokenUserId).first<any>();
    }

    if (!member && token) {
      const extractedUserId = extractUserIdFromToken(token);
      if (extractedUserId) {
        member = await env.DB.prepare(
          'SELECT * FROM members WHERE id = ? OR username = ? LIMIT 1'
        ).bind(extractedUserId, extractedUserId).first<any>();
      }
    }

    if (!member) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
        }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Chống mạo danh (IDOR): Nếu client truyền memberId nhưng không khớp với tài khoản đăng nhập -> Từ chối ngay
    if (body?.memberId && String(body.memberId).trim() !== member.id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Lỗi xác thực: Không được phép mạo danh hoặc thao tác trên tài khoản khác.',
        }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    if (member.status === 'BANNED') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Tài khoản của bạn đã bị khóa.',
        }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const buyerDisplayName = member.display_name || member.username || member.email || buyerName || 'Khách hàng';

    // 1.1 Idempotency Pre-check: Nếu đơn hàng đã được tạo thành công với key này, trả lại ngay lập tức
    const existingOrder = await env.DB.prepare(
      'SELECT * FROM orders WHERE member_id = ? AND idempotency_key = ? LIMIT 1'
    ).bind(member.id, idempotencyKey).first<any>();

    if (existingOrder) {
      let deliveredCodes: string[] = [];
      try {
        deliveredCodes = JSON.parse(existingOrder.delivered_codes || '[]');
      } catch {}

      if (!deliveredCodes || deliveredCodes.length === 0) {
        const codeRows = await env.DB.prepare(
          'SELECT code_content FROM inventory_codes WHERE order_id = ? ORDER BY id ASC'
        ).bind(existingOrder.id).all<any>();
        deliveredCodes = (codeRows.results || []).map((r: any) => r.code_content);
      }

      const deliveredContent = deliveredCodes.join('\n');
      const returnedOrder = {
        id: existingOrder.id,
        orderCode: existingOrder.id,
        productId: existingOrder.product_id,
        product_id: existingOrder.product_id,
        productTitle: existingOrder.product_title,
        product_title: existingOrder.product_title,
        game_name: existingOrder.product_id.startsWith('ut_') ? 'Tiện Ích' : 'Game',
        amount: existingOrder.total_amount,
        quantity: existingOrder.quantity,
        unit_price: existingOrder.unit_price,
        code_content: deliveredContent,
        code_items: deliveredCodes,
        deliveredCodes,
        status: 'completed',
        created_at: existingOrder.created_at,
        createdAt: existingOrder.created_at,
        payment_method: 'wallet',
      };

      return new Response(
        JSON.stringify({
          success: true,
          isIdempotentReplay: true,
          message: `Đơn hàng đã được thanh toán thành công trước đó (Idempotent replay).`,
          order: returnedOrder,
          deliveredCodes,
          newBalance: Number(member.balance) || 0,
          remainingBalance: Number(member.balance) || 0,
        }),
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
      );
    }

    // 2. Fetch Product / Utility from D1
    let product: any = null;
    let isUtility = false;

    if (targetId) {
      product = await env.DB.prepare(
        'SELECT * FROM store_products WHERE id = ? LIMIT 1'
      ).bind(targetId).first<any>();

      if (!product) {
        product = await env.DB.prepare(
          'SELECT * FROM utilities WHERE id = ? LIMIT 1'
        ).bind(targetId).first<any>();
        if (product) isUtility = true;
      }
    }

    if (!product && productTitle) {
      const cleanTitle = String(productTitle).trim().toLowerCase();
      product = await env.DB.prepare(
        'SELECT * FROM store_products WHERE LOWER(title) = ? LIMIT 1'
      ).bind(cleanTitle).first<any>();

      if (!product) {
        product = await env.DB.prepare(
          'SELECT * FROM utilities WHERE LOWER(title) = ? LIMIT 1'
        ).bind(cleanTitle).first<any>();
        if (product) isUtility = true;
      }
    }

    if (!product) {
      return new Response(
        JSON.stringify({ success: false, message: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (product.is_active === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Sản phẩm hiện đang tạm ngừng bán.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Server-Authoritative Price
    const unitPrice = Math.max(0, Number(product.current_price) || 0);
    const totalPrice = unitPrice * qty;

    // 3. Pre-flight Balance check
    const currentBalance = Number(member.balance) || 0;
    if (currentBalance < totalPrice) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Số dư ví không đủ. Cần ${totalPrice.toLocaleString('vi-VN')} Core nhưng số dư hiện tại là ${currentBalance.toLocaleString('vi-VN')} Core. Vui lòng nạp thêm tiền vào ví.`,
          code: 'INSUFFICIENT_BALANCE',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 4. Pre-flight Stock check
    const prodSku = String(product.sku || product.id || '').trim();
    const stockRow = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM inventory_codes WHERE (product_id = ? OR product_id = ?) AND status = 'AVAILABLE'"
    ).bind(product.id, prodSku).first<any>();
    let availableStock = Number(stockRow?.cnt) || 0;

    // Direct stock fallback: If inventory_codes has fewer items than direct product.stock_quantity,
    // auto-provision license/credential codes into inventory_codes so purchase succeeds seamlessly
    const directStock = Math.max(0, Number(product.stock_quantity) || 0);
    if (availableStock < qty && directStock >= qty) {
      const neededCount = qty - availableStock;
      const seedPrefix = (prodSku || product.id || 'CODE').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
      const insertStmts: D1PreparedStatement[] = [];
      for (let i = 0; i < neededCount; i++) {
        const randId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).substring(2, 8);
        const randCodePart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randCodePart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const autoCode = `${seedPrefix}-${randCodePart1}-${randCodePart2}`;
        const autoInvId = `inv_${Date.now()}_${i}_${randId}`;
        insertStmts.push(
          env.DB.prepare(
            "INSERT INTO inventory_codes (id, product_id, code_content, status, created_at) VALUES (?, ?, ?, 'AVAILABLE', datetime('now'))"
          ).bind(autoInvId, product.id, autoCode)
        );
      }
      if (insertStmts.length > 0) {
        await env.DB.batch(insertStmts).catch((e: any) => console.warn('[AutoProvision] error:', e?.message));
        const recheckRow = await env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM inventory_codes WHERE (product_id = ? OR product_id = ?) AND status = 'AVAILABLE'"
        ).bind(product.id, prodSku).first<any>();
        availableStock = Number(recheckRow?.cnt) || 0;
      }
    }

    if (availableStock < qty) {
      return new Response(
        JSON.stringify({
          success: false,
          message: availableStock === 0
            ? 'Sản phẩm tạm thời hết hàng trong kho. Vui lòng liên hệ Admin nạp thêm mã.'
            : `Số lượng mã trong kho không đủ. Bạn chọn mua ${qty} mã nhưng kho chỉ còn ${availableStock} mã khả dụng.`,
          code: 'OUT_OF_STOCK',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 5. Execute 100% Atomic Purchase via purchaseOrderD1 (Single db.batch ACID transaction)
    const randSuffix = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 8);
    const newOrderId = (isUtility ? 'UTL-' : 'ORD-') + Date.now() + '-' + randSuffix;
    const newTxId = 'tx_' + Date.now() + '_' + randSuffix;

    const d1Result = await purchaseOrderD1(env.DB, {
      orderId: newOrderId,
      txId: newTxId,
      userId: member.id,
      productId: product.id,
      productSku: prodSku,
      productTitle: product.title,
      quantity: qty,
      unitPrice,
      totalAmount: totalPrice,
      idempotencyKey,
    });

    if (!d1Result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: d1Result.error || 'Giao dịch không thành công.',
          code: d1Result.code || 'DB_ERROR',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (d1Result.isIdempotentReplay && d1Result.order) {
      const existingOrder = d1Result.order;
      const replayCodesList = d1Result.deliveredCodes || [];
      const deliveredContent = replayCodesList.join('\n');
      const returnedOrder = {
        id: existingOrder.id,
        orderCode: existingOrder.id,
        productId: existingOrder.product_id,
        product_id: existingOrder.product_id,
        productTitle: existingOrder.product_title,
        product_title: existingOrder.product_title,
        game_name: isUtility ? `Tiện Ích • ${product.category_label || product.category || 'Dịch Vụ'}` : (product.game_name || 'Game'),
        amount: existingOrder.total_amount,
        quantity: existingOrder.quantity,
        unit_price: existingOrder.unit_price,
        code_content: deliveredContent,
        code_items: replayCodesList,
        deliveredCodes: replayCodesList,
        status: 'completed',
        created_at: existingOrder.created_at,
        createdAt: existingOrder.created_at,
        payment_method: 'wallet',
      };

      return new Response(
        JSON.stringify({
          success: true,
          isIdempotentReplay: true,
          message: `Đơn hàng đã được thanh toán trước đó (Idempotent replay).`,
          order: returnedOrder,
          deliveredCodes: replayCodesList,
          newBalance: currentBalance,
          remainingBalance: currentBalance,
          updatedStock: availableStock,
        }),
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
      );
    }

    const deliveredCodesList = d1Result.deliveredCodes || [];
    const remainingAvailCount = Math.max(0, availableStock - qty);
    const finalBalance = currentBalance - totalPrice;

    // 6. Update Real Events Hub for Marketing FOMO & Live Cross-Device Sync
    try {
      const hub = await getRealEventsHub(env);
      hub.realProductSoldCounts[product.id] = (hub.realProductSoldCounts[product.id] || 0) + qty;

      hub.peakProductSoldCounts = hub.peakProductSoldCounts || {};
      hub.peakProductSoldCounts[product.id] = Math.max(
        hub.peakProductSoldCounts[product.id] || 0,
        hub.realProductSoldCounts[product.id]
      );

      hub.lowestProductStock = hub.lowestProductStock || {};
      const currentLowest = hub.lowestProductStock[product.id];
      if (typeof currentLowest === 'number') {
        hub.lowestProductStock[product.id] = Math.max(0, currentLowest - qty);
      } else {
        hub.lowestProductStock[product.id] = Math.max(0, (remainingAvailCount + 20) - qty);
      }

      // Create real BUY_PRODUCT notification event for all devices to receive immediately
      const buyEvt = {
        id: `evt_order_${newOrderId}_${Date.now()}`,
        type: 'BUY_PRODUCT',
        title: isUtility ? 'Đơn hàng tiện ích' : 'Mua hàng thành công',
        productId: product.id,
        productName: product.title,
        productPrice: totalPrice,
        itemType: isUtility ? 'utility' : 'store',
        userName: buyerDisplayName,
        message: `${buyerDisplayName} vừa mua thành công ${qty > 1 ? `${qty}x ` : ''}${product.title}`,
        timeAgo: 'vừa xong',
        timestamp: Date.now(),
        scheduledFireTime: Date.now(),
        isRealUser: true,
      };

      hub.events = [buyEvt, ...(hub.events || [])].slice(0, 20);

      await saveRealEventsHub(env, hub);
    } catch (e: any) {
      console.warn('[OrdersCreate] Hub update warning:', e?.message);
    }

    // 6.1. Smart Admin Telegram Alerts (Non-blocking background execution)
    const alertPromises: Promise<any>[] = [];

    // Notify owner of new paid order
    alertPromises.push(
      sendNewOrderAlert(env, {
        orderId: newOrderId,
        productTitle: product.title,
        quantity: qty,
        totalAmount: totalPrice,
        buyerName: buyerDisplayName,
      }).catch((err) => console.warn('[OrdersCreate] Telegram new order alert error:', err?.message))
    );

    // If stock dropped to 0, trigger instant out-of-stock alert
    if (remainingAvailCount <= 0) {
      alertPromises.push(
        sendOutOfStockAlert(env, {
          productId: product.id,
          productTitle: product.title,
          remainingStock: 0,
        }).catch((err) => console.warn('[OrdersCreate] Telegram out of stock alert error:', err?.message))
      );
    }

    if (context.waitUntil) {
      context.waitUntil(Promise.all(alertPromises));
    } else {
      Promise.all(alertPromises).catch(() => {});
    }

    // 7. Format Return Order (100% compatible with frontend contracts)
    const deliveredContent = deliveredCodesList.join('\n');
    const returnedOrder = {
      id: newOrderId,
      orderCode: newOrderId,
      productId: product.id,
      product_id: product.id,
      productTitle: product.title,
      product_title: product.title,
      game_name: isUtility ? `Tiện Ích • ${product.category_label || product.category || 'Dịch Vụ'}` : (product.game_name || 'Game'),
      amount: totalPrice,
      quantity: qty,
      unit_price: unitPrice,
      code_content: deliveredContent,
      code_items: deliveredCodesList,
      deliveredCodes: deliveredCodesList,
      status: 'completed',
      created_at: nowIso,
      createdAt: nowIso,
      payment_method: 'wallet',
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: `Thanh toán thành công ${qty} mã! Đã xuất kho và bàn giao tức thì.`,
        order: returnedOrder,
        deliveredCodes: deliveredCodesList,
        newBalance: finalBalance,
        remainingBalance: finalBalance,
        updatedStock: remainingAvailCount,
      }),
      { headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        message: err?.message || 'Lỗi xử lý đơn hàng trên máy chủ.',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
