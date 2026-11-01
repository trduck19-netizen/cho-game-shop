-- ==============================================================================
-- Migration: 0001_init.sql
-- Description: Khởi tạo database schema cho CodeGame Store trên Cloudflare D1
-- ==============================================================================

-- 1. Bảng USERS: Lưu trữ thông tin người dùng và quyền hạn
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_banned INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Bảng FREE_CODES: Lưu các mã quà tặng miễn phí do người dùng hoặc admin đăng
CREATE TABLE IF NOT EXISTS free_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    game_name TEXT NOT NULL,
    game_slug TEXT NOT NULL,
    code_value TEXT NOT NULL,
    description TEXT,
    rewards TEXT,
    expires_at DATETIME,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_free_codes_status ON free_codes(status);
CREATE INDEX IF NOT EXISTS idx_free_codes_game ON free_codes(game_slug);
CREATE INDEX IF NOT EXISTS idx_free_codes_created ON free_codes(created_at DESC);

-- 3. Bảng CODE_VOTES: Lưu lượt bình chọn mã còn dùng được hay không (works / not_works)
-- Mỗi người dùng chỉ được bình chọn 1 lần trên mỗi mã (UNIQUE constraint)
CREATE TABLE IF NOT EXISTS code_votes (
    id TEXT PRIMARY KEY,
    code_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('works', 'not_works')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (code_id) REFERENCES free_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_code ON code_votes(code_id);

-- 4. Bảng COMMENTS: Lưu bình luận thảo luận về từng mã code
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    code_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (code_id) REFERENCES free_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_code ON comments(code_id, created_at DESC);

-- 5. Bảng PAID_CODES: Danh mục code chiết khấu do admin đăng bán
CREATE TABLE IF NOT EXISTS paid_codes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    game_name TEXT NOT NULL,
    game_slug TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),              -- Giá gốc (VND)
    discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paid_codes_active ON paid_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_paid_codes_game ON paid_codes(game_slug);

-- 6. Bảng PAID_CODE_ITEMS: Kho lưu trữ từng mã code thực tế để giao cho khách khi mua
CREATE TABLE IF NOT EXISTS paid_code_items (
    id TEXT PRIMARY KEY,
    paid_code_id TEXT NOT NULL,
    code_content TEXT NOT NULL,
    is_used INTEGER NOT NULL DEFAULT 0,
    used_in_order_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paid_code_id) REFERENCES paid_codes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_code_items_available ON paid_code_items(paid_code_id, is_used);

-- 7. Bảng ORDERS: Đơn hàng mua code chiết khấu
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_code TEXT NOT NULL UNIQUE,                        -- Mã đơn ngắn để người dùng ghi nội dung chuyển khoản (VD: CG82914)
    user_id TEXT NOT NULL,
    paid_code_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),            -- Số tiền thực tế cần thanh toán (VND)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'delivered', 'cancelled')),
    sepay_transaction_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_code_id) REFERENCES paid_codes(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 8. Bảng ORDER_DELIVERY: Lưu mã quà tặng thực tế đã giao cho đơn hàng thành công
CREATE TABLE IF NOT EXISTS order_delivery (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    delivered_code_value TEXT NOT NULL,
    delivered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 9. Bảng AUDIT_LOGS: Nhật ký hệ thống ghi lại các hành động quan trọng (duyệt code, đổi giá, webhook...)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
