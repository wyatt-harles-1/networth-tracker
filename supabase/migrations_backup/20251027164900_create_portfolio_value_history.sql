/*
  # Create Portfolio Value History Tables

  ## Overview
  Creates comprehensive tables for tracking portfolio market value over time with
  support for historical reconstruction, asset-level breakdowns, and performance analytics.

  ## 1. New Tables

    ### `portfolio_value_history`
    Stores daily portfolio valuations with detailed breakdowns
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `value_date` (date) - The date of this valuation
    - `total_value` (numeric) - Total portfolio market value
    - `total_cost_basis` (numeric) - Total cost basis for gain calculation
    - `cash_value` (numeric) - Total cash holdings
    - `invested_value` (numeric) - Total non-cash investments
    - `unrealized_gain` (numeric) - Unrealized gains/losses
    - `realized_gain` (numeric) - Cumulative realized gains to date
    - `asset_class_breakdown` (jsonb) - Value by asset class
    - `ticker_breakdown` (jsonb) - Value by individual ticker
    - `account_breakdown` (jsonb) - Value by account
    - `calculation_method` (text) - How this was calculated: 'transaction_replay', 'snapshot', 'manual'
    - `data_quality_score` (numeric) - Quality indicator 0-1 based on price data availability
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - Unique constraint on (user_id, value_date)

    ### `portfolio_calculation_jobs`
    Tracks background portfolio value calculation jobs
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `start_date` (date) - Beginning of calculation range
    - `end_date` (date) - End of calculation range
    - `job_status` (text) - Status: 'pending', 'running', 'completed', 'failed'
    - `progress_percentage` (integer) - Job progress 0-100
    - `days_calculated` (integer) - Number of days successfully calculated
    - `days_failed` (integer) - Number of days that failed
    - `error_message` (text, nullable)
    - `started_at` (timestamptz)
    - `completed_at` (timestamptz)
    - `created_at` (timestamptz)

    ### `market_value_snapshots`
    Stores intraday portfolio value snapshots for 1-day view
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `snapshot_datetime` (timestamptz) - Exact timestamp of snapshot
    - `total_value` (numeric) - Portfolio value at this moment
    - `ticker_prices` (jsonb) - Current prices for all tickers
    - `created_at` (timestamptz)

  ## 2. Security
    - Enable RLS on all tables
    - Users can only access their own portfolio value data
    - Calculation jobs are user-specific

  ## 3. Indexes
    - Index on (user_id, value_date) for efficient date range queries
    - Index on value_date for sorting and filtering
    - Index on job_status for monitoring
    - Index on snapshot_datetime for intraday queries

  ## 4. Important Notes
    - portfolio_value_history enables accurate historical performance tracking
    - Unique constraint prevents duplicate daily calculations
    - JSONB breakdowns support flexible aggregation and filtering
    - Calculation jobs enable async processing of large date ranges
    - Market value snapshots support real-time tracking
*/

-- Create portfolio_value_history table
CREATE TABLE IF NOT EXISTS portfolio_value_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  value_date date NOT NULL,
  total_value numeric(20, 2) NOT NULL DEFAULT 0,
  total_cost_basis numeric(20, 2) NOT NULL DEFAULT 0,
  cash_value numeric(20, 2) NOT NULL DEFAULT 0,
  invested_value numeric(20, 2) NOT NULL DEFAULT 0,
  unrealized_gain numeric(20, 2) NOT NULL DEFAULT 0,
  realized_gain numeric(20, 2) NOT NULL DEFAULT 0,
  asset_class_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
  ticker_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
  account_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
  calculation_method text DEFAULT 'transaction_replay' NOT NULL CHECK (calculation_method IN ('transaction_replay', 'snapshot', 'manual', 'interpolated')),
  data_quality_score numeric(3, 2) DEFAULT 1.0 NOT NULL CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, value_date)
);

-- Create portfolio_calculation_jobs table
CREATE TABLE IF NOT EXISTS portfolio_calculation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  job_status text DEFAULT 'pending' NOT NULL CHECK (job_status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress_percentage integer DEFAULT 0 NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  days_calculated integer DEFAULT 0 NOT NULL,
  days_failed integer DEFAULT 0 NOT NULL,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create market_value_snapshots table
CREATE TABLE IF NOT EXISTS market_value_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_datetime timestamptz NOT NULL,
  total_value numeric(20, 2) NOT NULL,
  ticker_prices jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE portfolio_value_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_calculation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_value_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_value_history
DROP POLICY IF EXISTS "Users can view own portfolio value history" ON portfolio_value_history;
CREATE POLICY "Users can view own portfolio value history"
  ON portfolio_value_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own portfolio value history" ON portfolio_value_history;
CREATE POLICY "Users can insert own portfolio value history"
  ON portfolio_value_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own portfolio value history" ON portfolio_value_history;
CREATE POLICY "Users can update own portfolio value history"
  ON portfolio_value_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own portfolio value history" ON portfolio_value_history;
CREATE POLICY "Users can delete own portfolio value history"
  ON portfolio_value_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for portfolio_calculation_jobs
DROP POLICY IF EXISTS "Users can view own calculation jobs" ON portfolio_calculation_jobs;
CREATE POLICY "Users can view own calculation jobs"
  ON portfolio_calculation_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own calculation jobs" ON portfolio_calculation_jobs;
CREATE POLICY "Users can insert own calculation jobs"
  ON portfolio_calculation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own calculation jobs" ON portfolio_calculation_jobs;
CREATE POLICY "Users can update own calculation jobs"
  ON portfolio_calculation_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own calculation jobs" ON portfolio_calculation_jobs;
CREATE POLICY "Users can delete own calculation jobs"
  ON portfolio_calculation_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for market_value_snapshots
DROP POLICY IF EXISTS "Users can view own market value snapshots" ON market_value_snapshots;
CREATE POLICY "Users can view own market value snapshots"
  ON market_value_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own market value snapshots" ON market_value_snapshots;
CREATE POLICY "Users can insert own market value snapshots"
  ON market_value_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own market value snapshots" ON market_value_snapshots;
CREATE POLICY "Users can delete own market value snapshots"
  ON market_value_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS portfolio_value_history_user_date_idx ON portfolio_value_history(user_id, value_date DESC);
CREATE INDEX IF NOT EXISTS portfolio_value_history_date_idx ON portfolio_value_history(value_date DESC);
CREATE INDEX IF NOT EXISTS portfolio_value_history_user_id_idx ON portfolio_value_history(user_id);

CREATE INDEX IF NOT EXISTS portfolio_calculation_jobs_user_id_idx ON portfolio_calculation_jobs(user_id);
CREATE INDEX IF NOT EXISTS portfolio_calculation_jobs_status_idx ON portfolio_calculation_jobs(job_status);
CREATE INDEX IF NOT EXISTS portfolio_calculation_jobs_created_idx ON portfolio_calculation_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS market_value_snapshots_user_datetime_idx ON market_value_snapshots(user_id, snapshot_datetime DESC);
CREATE INDEX IF NOT EXISTS market_value_snapshots_datetime_idx ON market_value_snapshots(snapshot_datetime DESC);

-- Create trigger for portfolio_value_history updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_value_history_updated_at
  BEFORE UPDATE ON portfolio_value_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE portfolio_value_history IS 'Daily portfolio market values with detailed breakdowns for historical performance tracking';
COMMENT ON TABLE portfolio_calculation_jobs IS 'Tracks background jobs for calculating historical portfolio values';
COMMENT ON TABLE market_value_snapshots IS 'Intraday portfolio value snapshots for real-time tracking';
COMMENT ON COLUMN portfolio_value_history.data_quality_score IS 'Quality indicator (0-1) based on price data availability and calculation confidence';
COMMENT ON COLUMN portfolio_value_history.calculation_method IS 'Method used: transaction_replay (from txns), snapshot (from current), manual (user entered), interpolated (estimated)';
