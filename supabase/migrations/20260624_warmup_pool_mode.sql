-- Warmup pool mode: controls which pool each user account warms against
-- admin_pool (default) = only warms with admin-owned pool accounts
-- user_to_user         = only warms with other user accounts
-- both                 = warms with all accounts in the pool
ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS warmup_pool_mode TEXT NOT NULL DEFAULT 'admin_pool';

COMMENT ON COLUMN email_accounts.warmup_pool_mode IS 'admin_pool | user_to_user | both — set by admin per account';
