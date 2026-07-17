-- ============================================================
--  CloudMining 2.0 — PostgreSQL Schema for Supabase
--  Run this ONCE in the Supabase SQL Editor
-- ============================================================

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT        NOT NULL,
  email            TEXT        UNIQUE NOT NULL,
  password_hash    TEXT        NOT NULL,
  role             TEXT        NOT NULL DEFAULT 'user',
  tier             INTEGER     NOT NULL DEFAULT 1,
  balance          NUMERIC(12,4) NOT NULL DEFAULT 0.0,
  wallet_address   TEXT        NOT NULL DEFAULT '',
  status           TEXT        NOT NULL DEFAULT 'active',
  last_mined_at    TIMESTAMPTZ,
  referral_code    TEXT        UNIQUE,
  referred_by      BIGINT      REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Transactions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL,
  label           TEXT        NOT NULL,
  amount          NUMERIC(12,4) NOT NULL DEFAULT 0.0,
  status          TEXT        NOT NULL DEFAULT 'pending',
  proof_image     TEXT,
  payment_method  TEXT,
  tier_target     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tiers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tiers (
  tier         INTEGER PRIMARY KEY,
  period       INTEGER        NOT NULL,
  earn_per_24h NUMERIC(12,4)  NOT NULL,
  price_usd    NUMERIC(12,4)  NOT NULL DEFAULT 0,
  price_ngn    NUMERIC(12,4)  NOT NULL DEFAULT 0,
  price_ghs    NUMERIC(12,4)  NOT NULL DEFAULT 0
);

-- ── Settings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── Activity Log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   BIGINT,
  actor_name TEXT        NOT NULL DEFAULT 'System',
  action     TEXT        NOT NULL,
  target     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type    ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status  ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor   ON activity_log(actor_id);

-- ============================================================
--  SEED DATA
--  Passwords (bcrypt, cost=10):
--    Jacob@2001   → stored hash below
--    Demo@1234    → stored hash below
--    Sarah@2024   → stored hash below
--    Block@123    → stored hash below
--    Admin@2026   → stored hash below
-- ============================================================

-- Tiers
INSERT INTO tiers (tier, period, earn_per_24h, price_usd, price_ngn, price_ghs)
VALUES
  (1,  100,   1.00,    0,        0,       0),
  (2,  14,    50.00,   16,       23235,   300),
  (3,  14,    150.00,  50,       72985,   920),
  (4,  14,    500.00,  200,      291940,  3680),
  (5,  14,    1500.00, 600,      875820,  11040)
ON CONFLICT (tier) DO UPDATE SET
  period = EXCLUDED.period,
  earn_per_24h = EXCLUDED.earn_per_24h,
  price_usd = EXCLUDED.price_usd,
  price_ngn = EXCLUDED.price_ngn,
  price_ghs = EXCLUDED.price_ghs;

-- Settings
INSERT INTO settings (key, value) VALUES
  ('usdt_wallet',        'TEMon4HWt7bc9b4ooBuhownfQuKzwSjjmm'),
  ('naira_bank_name',    'Opay'),
  ('naira_bank_account', 'CloudMining Limited'),
  ('naira_bank_number',  '8054321987'),
  ('cedis_bank_name',    'MTN Mobile Money'),
  ('cedis_bank_account', 'CloudMining Limited'),
  ('cedis_bank_number',  '0551234567')
ON CONFLICT (key) DO NOTHING;

-- Users (bcrypt hashes generated offline — replace if needed)
INSERT INTO users (name, email, password_hash, role, tier, balance, wallet_address, status, last_mined_at, referral_code)
VALUES
  ('Abdul Aziz',    'junioryakub5@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lihO', 'user',  1, 1.00,    '', 'active',   NOW() - INTERVAL '2 days', 'REF001'),
  ('Demo User',     'demo@cloudmining.com',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user',  2, 142.50, 'TRx8nHhH9a7n5HLNbTMJnBzf9tH3sGBd7Y', 'active', NOW() - INTERVAL '2 days', 'REF002'),
  ('Sarah Johnson', 'sarah@example.com',      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user',  3, 875.00, 'TGj2Wq7vQ5mBkR3nP8uXwZe6Yd1Fc4As9H', 'active', NOW() - INTERVAL '2 days', 'REF003'),
  ('Blocked User',  'blocked@example.com',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user',  1, 0,      '', 'inactive', NULL, 'REF004'),
  ('Administrator', 'admin@cloudmining.com',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, 0,      '', 'active',   NULL, 'ADMIN1')
ON CONFLICT (email) DO NOTHING;

-- NOTE: The password hashes above use a generic bcrypt hash for demo purposes.
-- After running this script, use the app's register endpoint or manually update
-- with proper hashes for production passwords.
-- The real user (junioryakub5@gmail.com) password Jacob@2001 needs to be re-hashed properly.
-- Run this after to fix the hashes:
-- UPDATE users SET password_hash = crypt('Jacob@2001', gen_salt('bf',10)) WHERE email = 'junioryakub5@gmail.com';
-- (requires pgcrypto extension)

-- Transactions (inserted after users)
WITH u1 AS (SELECT id FROM users WHERE email = 'junioryakub5@gmail.com'),
     u2 AS (SELECT id FROM users WHERE email = 'demo@cloudmining.com'),
     u3 AS (SELECT id FROM users WHERE email = 'sarah@example.com'),
     u4 AS (SELECT id FROM users WHERE email = 'blocked@example.com')
INSERT INTO transactions (user_id, type, label, amount, status, created_at)
SELECT u1.id, 'mining',      'Mining Reward',      1.00,   'completed', '2026-07-17 12:43:00+00' FROM u1
UNION ALL
SELECT u2.id, 'mining',      'Mining Reward',      50.00,  'completed', '2026-07-17 11:00:00+00' FROM u2
UNION ALL
SELECT u2.id, 'upgrades',    'Upgraded to Tier 2', 16.00,  'completed', '2026-06-20 10:00:00+00' FROM u2
UNION ALL
SELECT u3.id, 'mining',      'Mining Reward',      150.00, 'completed', '2026-07-17 09:30:00+00' FROM u3
UNION ALL
SELECT u3.id, 'upgrades',    'Upgraded to Tier 3', 50.00,  'completed', '2026-05-15 15:00:00+00' FROM u3
UNION ALL
SELECT u3.id, 'withdrawals', 'Withdrawal Request', 200.00, 'completed', '2026-07-10 14:00:00+00' FROM u3
UNION ALL
SELECT u1.id, 'upgrades',    'Upgraded to Tier 2', 16.00,  'pending',   '2026-07-17 13:00:00+00' FROM u1
UNION ALL
SELECT u4.id, 'upgrades',    'Upgraded to Tier 2', 16.00,  'pending',   '2026-07-16 08:00:00+00' FROM u4;

-- ============================================================
--  Enable RLS (optional - disable for backend-only access)
-- ============================================================
-- Since the backend uses the service role key, RLS is bypassed automatically.
-- Uncomment below only if you want to add extra security:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

SELECT 'Schema and seed data applied successfully' AS result;
