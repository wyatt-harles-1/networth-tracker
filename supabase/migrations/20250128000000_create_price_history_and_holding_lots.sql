/*
  # Create Price History and Holding Lots Tables

  This migration adds the missing tables needed for:
  - Historical price tracking (price_history)
  - FIFO lot tracking (holding_lots)
  - Price update job tracking (price_update_jobs)

  These tables enable accurate portfolio performance calculations
  and cost basis tracking.
*/

-- ============================================================================
-- 1. PRICE HISTORY TABLE
-- ============================================================================
-- Stores historical price data for securities
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  price_date date NOT NULL,
  open_price numeric(15, 4),
  high_price numeric(15, 4),
  low_price numeric(15, 4),
  close_price numeric(15, 4) NOT NULL,
  volume bigint,
  data_source text DEFAULT 'manual' NOT NULL CHECK (data_source IN ('alpha_vantage', 'twelve_data', 'manual', 'yahoo_finance', 'polygon')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(symbol, price_date)
);

-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Policies: Price history is globally readable, users can insert/update
DROP POLICY IF EXISTS "Price history is readable by all authenticated users" ON price_history;
CREATE POLICY "Price history is readable by all authenticated users"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert manual price history" ON price_history;
CREATE POLICY "Users can insert manual price history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update price history" ON price_history;
CREATE POLICY "Users can update price history"
  ON price_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS price_history_symbol_idx ON price_history(symbol);
CREATE INDEX IF NOT EXISTS price_history_date_idx ON price_history(price_date DESC);
CREATE INDEX IF NOT EXISTS price_history_symbol_date_idx ON price_history(symbol, price_date DESC);

COMMENT ON TABLE price_history IS 'Historical price data for all securities';

-- ============================================================================
-- 2. HOLDING LOTS TABLE (Optional - for FIFO tracking)
-- ============================================================================
-- Tracks individual purchase lots for FIFO accounting
CREATE TABLE IF NOT EXISTS holding_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  holding_id uuid REFERENCES holdings ON DELETE CASCADE,
  account_id uuid REFERENCES accounts ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  purchase_date date NOT NULL,
  quantity numeric(20, 8) NOT NULL DEFAULT 0,
  quantity_remaining numeric(20, 8) NOT NULL DEFAULT 0,
  cost_per_share numeric(15, 2) NOT NULL DEFAULT 0,
  total_cost numeric(15, 2) NOT NULL DEFAULT 0,
  transaction_id uuid REFERENCES transactions ON DELETE SET NULL,
  lot_status text DEFAULT 'open' NOT NULL CHECK (lot_status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE holding_lots ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own lots
DROP POLICY IF EXISTS "Users can view own lots" ON holding_lots;
CREATE POLICY "Users can view own lots"
  ON holding_lots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lots" ON holding_lots;
CREATE POLICY "Users can insert own lots"
  ON holding_lots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lots" ON holding_lots;
CREATE POLICY "Users can update own lots"
  ON holding_lots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own lots" ON holding_lots;
CREATE POLICY "Users can delete own lots"
  ON holding_lots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS holding_lots_user_id_idx ON holding_lots(user_id);
CREATE INDEX IF NOT EXISTS holding_lots_holding_id_idx ON holding_lots(holding_id);
CREATE INDEX IF NOT EXISTS holding_lots_symbol_idx ON holding_lots(symbol);
CREATE INDEX IF NOT EXISTS holding_lots_status_idx ON holding_lots(lot_status);
CREATE INDEX IF NOT EXISTS holding_lots_purchase_date_idx ON holding_lots(purchase_date);

COMMENT ON TABLE holding_lots IS 'Individual purchase lots for FIFO cost basis tracking';

-- ============================================================================
-- 3. PRICE UPDATE JOBS TABLE (Optional - for background price updates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_update_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  symbols text[] NOT NULL,
  job_status text DEFAULT 'pending' NOT NULL CHECK (job_status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  symbols_updated integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE price_update_jobs ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own jobs
DROP POLICY IF EXISTS "Users can view own price update jobs" ON price_update_jobs;
CREATE POLICY "Users can view own price update jobs"
  ON price_update_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own price update jobs" ON price_update_jobs;
CREATE POLICY "Users can insert own price update jobs"
  ON price_update_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own price update jobs" ON price_update_jobs;
CREATE POLICY "Users can update own price update jobs"
  ON price_update_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS price_update_jobs_user_id_idx ON price_update_jobs(user_id);
CREATE INDEX IF NOT EXISTS price_update_jobs_status_idx ON price_update_jobs(job_status);

COMMENT ON TABLE price_update_jobs IS 'Tracks background price update operations';
