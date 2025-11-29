/*
  # Add Lot Tracking and Price History Tables

  ## Overview
  This migration adds support for FIFO lot tracking and historical price data
  to enable accurate cost basis calculations and portfolio performance tracking.

  ## 1. New Tables

  ### `holding_lots`
  - Tracks individual purchase lots for FIFO accounting
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `holding_id` (uuid, foreign key to holdings)
  - `account_id` (uuid, foreign key to accounts)
  - `symbol` (text, ticker symbol)
  - `purchase_date` (date, when lot was acquired)
  - `quantity` (numeric, shares in this lot)
  - `quantity_remaining` (numeric, unsold shares)
  - `cost_per_share` (numeric, purchase price per share)
  - `total_cost` (numeric, total cost basis)
  - `transaction_id` (uuid, foreign key to transactions, nullable)
  - `lot_status` (text, 'open' or 'closed')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `price_history`
  - Historical price data for securities
  - `id` (uuid, primary key)
  - `symbol` (text, ticker symbol)
  - `price_date` (date, date of price)
  - `open_price` (numeric)
  - `high_price` (numeric)
  - `low_price` (numeric)
  - `close_price` (numeric, primary price used)
  - `volume` (bigint, trading volume, nullable)
  - `data_source` (text, 'alpha_vantage', 'manual', etc.)
  - `created_at` (timestamptz)
  - Unique constraint on (symbol, price_date)

  ### `price_update_jobs`
  - Tracks price update operations
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `symbols` (text array, list of symbols to update)
  - `job_status` (text, 'pending', 'running', 'completed', 'failed')
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `error_message` (text, nullable)
  - `symbols_updated` (integer, count of successful updates)
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Users can only access their own lot data
  - Price history is globally readable, users can insert manual prices
  - Price update jobs are user-specific

  ## 3. Important Notes
  - holding_lots enables FIFO accounting for capital gains
  - price_history allows accurate historical performance calculations
  - Each lot tracks remaining quantity for sell transactions
  - Indexes optimize lot lookup and price queries
*/

-- Create holding_lots table for FIFO lot tracking
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

ALTER TABLE holding_lots ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS holding_lots_user_id_idx ON holding_lots(user_id);
CREATE INDEX IF NOT EXISTS holding_lots_holding_id_idx ON holding_lots(holding_id);
CREATE INDEX IF NOT EXISTS holding_lots_symbol_idx ON holding_lots(symbol);
CREATE INDEX IF NOT EXISTS holding_lots_status_idx ON holding_lots(lot_status);
CREATE INDEX IF NOT EXISTS holding_lots_purchase_date_idx ON holding_lots(purchase_date);

-- Create trigger for holding_lots updated_at
CREATE TRIGGER update_holding_lots_updated_at
  BEFORE UPDATE ON holding_lots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create price_history table for historical price data
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

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS price_history_symbol_idx ON price_history(symbol);
CREATE INDEX IF NOT EXISTS price_history_date_idx ON price_history(price_date DESC);
CREATE INDEX IF NOT EXISTS price_history_symbol_date_idx ON price_history(symbol, price_date DESC);

-- Create price_update_jobs table to track background price updates
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

ALTER TABLE price_update_jobs ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS price_update_jobs_user_id_idx ON price_update_jobs(user_id);
CREATE INDEX IF NOT EXISTS price_update_jobs_status_idx ON price_update_jobs(job_status);
CREATE INDEX IF NOT EXISTS price_update_jobs_created_at_idx ON price_update_jobs(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE holding_lots IS 'Tracks individual purchase lots for FIFO cost basis accounting';
COMMENT ON TABLE price_history IS 'Historical price data for all securities';
COMMENT ON TABLE price_update_jobs IS 'Tracks background jobs for updating security prices';
