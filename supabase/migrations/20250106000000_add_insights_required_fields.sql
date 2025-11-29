/*
  # Add Required Fields for Insights Features

  ## Overview
  This migration adds all critical fields needed for the Insights page to function properly.

  ## Changes

  1. **accounts table**
     - Add `tax_type` field to categorize accounts by tax treatment
     - Enables Tax Impact and Allocations tax vehicle breakdown

  2. **holdings table**
     - Add `purchase_date` field to track acquisition date
     - Enables short-term vs long-term capital gains calculations
     - Enables holding period tracking

  3. **ticker_directory table**
     - Add `sector` field for sector categorization
     - Add `industry` field for more granular categorization
     - Enables sector-based allocation analysis

  4. **profiles table**
     - Add demographic fields for retirement planning
     - Enables accurate Projections calculations

  ## Migration Strategy
  - All new fields are nullable initially to avoid breaking existing data
  - Sensible defaults are provided where possible
  - Existing data can be backfilled via UI or future migrations
*/

-- ==========================================
-- 1. Add tax_type to accounts table
-- ==========================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS tax_type text
    CHECK (tax_type IN ('taxable', 'tax_deferred', 'tax_free'));

-- Set default to 'taxable' for existing accounts
UPDATE accounts SET tax_type = 'taxable' WHERE tax_type IS NULL;

-- Make tax_type required for new accounts going forward
ALTER TABLE accounts
  ALTER COLUMN tax_type SET DEFAULT 'taxable';

-- Create index for filtering by tax type
CREATE INDEX IF NOT EXISTS accounts_tax_type_idx ON accounts(tax_type);

COMMENT ON COLUMN accounts.tax_type IS 'Tax treatment: taxable (brokerage), tax_deferred (401k/IRA), or tax_free (Roth/HSA)';

-- ==========================================
-- 2. Add purchase_date to holdings table
-- ==========================================

ALTER TABLE holdings
  ADD COLUMN IF NOT EXISTS purchase_date date;

-- For existing holdings, try to set purchase_date from earliest transaction
-- This is a best-effort migration - users can correct manually if needed
DO $$
BEGIN
  -- Only run if transactions table exists and has data
  IF EXISTS (SELECT 1 FROM transactions LIMIT 1) THEN
    UPDATE holdings h
    SET purchase_date = (
      SELECT MIN(t.transaction_date)
      FROM transactions t
      WHERE t.account_id = h.account_id
        AND t.transaction_type IN ('buy', 'deposit', 'transfer_in')
        AND t.description ILIKE '%' || h.symbol || '%'
      LIMIT 1
    )
    WHERE h.purchase_date IS NULL;
  END IF;
END $$;

-- For holdings still without a date, default to creation date
UPDATE holdings
SET purchase_date = DATE(created_at)
WHERE purchase_date IS NULL;

CREATE INDEX IF NOT EXISTS holdings_purchase_date_idx ON holdings(purchase_date);

COMMENT ON COLUMN holdings.purchase_date IS 'Date when this holding was acquired';

-- ==========================================
-- 3. Add sector fields to ticker_directory (if table exists)
-- ==========================================

DO $$
BEGIN
  -- Only add columns if ticker_directory table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticker_directory') THEN
    ALTER TABLE ticker_directory
      ADD COLUMN IF NOT EXISTS sector text,
      ADD COLUMN IF NOT EXISTS industry text;

    -- Create index for sector filtering
    CREATE INDEX IF NOT EXISTS ticker_directory_sector_idx ON ticker_directory(sector);

    -- Add comments
    EXECUTE 'COMMENT ON COLUMN ticker_directory.sector IS ''Market sector (e.g., Technology, Healthcare, Financial Services)''';
    EXECUTE 'COMMENT ON COLUMN ticker_directory.industry IS ''Industry within sector (e.g., Software, Biotechnology)''';

    RAISE NOTICE '✓ Added sector and industry fields to ticker_directory';
  ELSE
    RAISE NOTICE '⊗ Skipping ticker_directory modifications - table does not exist yet';
  END IF;
END $$;

-- ==========================================
-- 4. Add sector override to holdings table
-- ==========================================

-- Allow users to manually override sector for a holding
ALTER TABLE holdings
  ADD COLUMN IF NOT EXISTS sector_override text;

COMMENT ON COLUMN holdings.sector_override IS 'User-specified sector override (takes precedence over ticker_directory.sector)';

-- ==========================================
-- 5. Add demographic fields to profiles
-- ==========================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS retirement_target_age integer DEFAULT 65,
  ADD COLUMN IF NOT EXISTS retirement_goal_amount numeric(15, 2),
  ADD COLUMN IF NOT EXISTS expected_monthly_contribution numeric(15, 2);

COMMENT ON COLUMN profiles.date_of_birth IS 'User date of birth for age calculations';
COMMENT ON COLUMN profiles.retirement_target_age IS 'Target retirement age (default 65)';
COMMENT ON COLUMN profiles.retirement_goal_amount IS 'Target portfolio value at retirement';
COMMENT ON COLUMN profiles.expected_monthly_contribution IS 'Expected monthly investment contribution';

-- ==========================================
-- 6. Create helper view for sector allocation (if ticker_directory exists)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticker_directory') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW user_holdings_with_sector AS
      SELECT
        h.*,
        COALESCE(h.sector_override, td.sector, ''Unknown'') as effective_sector,
        td.industry,
        td.exchange
      FROM holdings h
      LEFT JOIN ticker_directory td ON td.symbol = h.symbol
    ';

    EXECUTE 'COMMENT ON VIEW user_holdings_with_sector IS ''Holdings with resolved sector (uses override if set, otherwise from ticker_directory)''';
    EXECUTE 'GRANT SELECT ON user_holdings_with_sector TO authenticated';

    RAISE NOTICE '✓ Created user_holdings_with_sector view';
  ELSE
    RAISE NOTICE '⊗ Skipping user_holdings_with_sector view - ticker_directory table does not exist yet';
  END IF;
END $$;

-- ==========================================
-- 7. Add helper function to get account tax breakdown
-- ==========================================

CREATE OR REPLACE FUNCTION get_tax_vehicle_breakdown(p_user_id uuid)
RETURNS TABLE (
  tax_type text,
  total_value numeric,
  account_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(a.tax_type, 'taxable') as tax_type,
    SUM(a.current_balance) as total_value,
    COUNT(*)::integer as account_count
  FROM accounts a
  WHERE a.user_id = p_user_id
    AND a.account_type = 'asset'
    AND a.is_visible = true
  GROUP BY COALESCE(a.tax_type, 'taxable')
  ORDER BY total_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tax_vehicle_breakdown IS 'Returns breakdown of account values by tax treatment type';

-- ==========================================
-- 8. Add helper function to calculate unrealized gains with tax info
-- ==========================================

CREATE OR REPLACE FUNCTION get_holdings_with_tax_info(p_user_id uuid)
RETURNS TABLE (
  holding_id uuid,
  symbol text,
  name text,
  quantity numeric,
  cost_basis numeric,
  current_value numeric,
  unrealized_gain numeric,
  unrealized_gain_percent numeric,
  purchase_date date,
  holding_period_days integer,
  is_long_term boolean,
  account_tax_type text,
  effective_sector text
) AS $$
DECLARE
  ticker_dir_exists boolean;
BEGIN
  -- Check if ticker_directory table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ticker_directory'
  ) INTO ticker_dir_exists;

  -- If ticker_directory exists, include sector data
  IF ticker_dir_exists THEN
    RETURN QUERY
    SELECT
      h.id as holding_id,
      h.symbol,
      h.name,
      h.quantity,
      h.cost_basis,
      h.current_value,
      (h.current_value - h.cost_basis) as unrealized_gain,
      CASE
        WHEN h.cost_basis > 0
        THEN ((h.current_value - h.cost_basis) / h.cost_basis * 100)
        ELSE 0
      END as unrealized_gain_percent,
      h.purchase_date,
      (CURRENT_DATE - h.purchase_date)::integer as holding_period_days,
      (CURRENT_DATE - h.purchase_date >= 365) as is_long_term,
      COALESCE(a.tax_type, 'taxable') as account_tax_type,
      COALESCE(h.sector_override, td.sector, 'Unknown') as effective_sector
    FROM holdings h
    INNER JOIN accounts a ON a.id = h.account_id
    LEFT JOIN ticker_directory td ON td.symbol = h.symbol
    WHERE h.user_id = p_user_id
      AND h.quantity > 0
    ORDER BY (h.current_value - h.cost_basis) DESC;
  ELSE
    -- Without ticker_directory, just use sector_override or 'Unknown'
    RETURN QUERY
    SELECT
      h.id as holding_id,
      h.symbol,
      h.name,
      h.quantity,
      h.cost_basis,
      h.current_value,
      (h.current_value - h.cost_basis) as unrealized_gain,
      CASE
        WHEN h.cost_basis > 0
        THEN ((h.current_value - h.cost_basis) / h.cost_basis * 100)
        ELSE 0
      END as unrealized_gain_percent,
      h.purchase_date,
      (CURRENT_DATE - h.purchase_date)::integer as holding_period_days,
      (CURRENT_DATE - h.purchase_date >= 365) as is_long_term,
      COALESCE(a.tax_type, 'taxable') as account_tax_type,
      COALESCE(h.sector_override, 'Unknown') as effective_sector
    FROM holdings h
    INNER JOIN accounts a ON a.id = h.account_id
    WHERE h.user_id = p_user_id
      AND h.quantity > 0
    ORDER BY (h.current_value - h.cost_basis) DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_holdings_with_tax_info IS 'Returns holdings with calculated tax information and unrealized gains';

-- ==========================================
-- Migration completion notes
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Added fields:';
  RAISE NOTICE '  - accounts.tax_type (for tax vehicle allocation)';
  RAISE NOTICE '  - holdings.purchase_date (for capital gains tracking)';
  RAISE NOTICE '  - ticker_directory.sector (for sector allocation)';
  RAISE NOTICE '  - ticker_directory.industry (for detailed categorization)';
  RAISE NOTICE '  - holdings.sector_override (for manual sector assignment)';
  RAISE NOTICE '  - profiles.date_of_birth (for retirement planning)';
  RAISE NOTICE '  - profiles.retirement_target_age (default 65)';
  RAISE NOTICE '  - profiles.retirement_goal_amount (retirement target)';
  RAISE NOTICE '  - profiles.expected_monthly_contribution (monthly savings)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created helper functions:';
  RAISE NOTICE '  - get_tax_vehicle_breakdown(user_id) (tax allocation summary)';
  RAISE NOTICE '  - get_holdings_with_tax_info(user_id) (holdings with tax data)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update UI to collect tax_type when creating accounts';
  RAISE NOTICE '  2. Update UI to collect purchase_date when adding holdings';
  RAISE NOTICE '  3. Fetch sector data from financial API for ticker_directory';
  RAISE NOTICE '  4. Add user profile settings for age and retirement goals';
END $$;
