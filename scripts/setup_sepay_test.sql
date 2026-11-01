CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO system_settings (key, value, updated_at)
VALUES (
  'wcg_admin_sepay_v4',
  '{"apiKey":"SEPAY_LIVE_TEST_KEY_2026","paymentPrefix":"WCG","bankName":"MBBank","accountNumber":"0987654321","bankAccount":"WEB CODE GAME"}',
  datetime('now')
);
