-- Migration: 0009_email_notifications.sql
-- Hệ thống đăng ký nhận thông báo sự kiện, giftcode mới và flash sale qua email

CREATE TABLE IF NOT EXISTS email_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_id TEXT,
  notify_followed_codes INTEGER DEFAULT 1,
  notify_giveaways INTEGER DEFAULT 1,
  notify_sales INTEGER DEFAULT 1,
  subscribed_games TEXT DEFAULT '[]',
  unsubscribe_token TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON email_subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsub_token ON email_subscribers(unsubscribe_token);

CREATE TABLE IF NOT EXISTS email_notification_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'SENT',
  sent_by TEXT DEFAULT 'SYSTEM',
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_notification_logs(created_at);
