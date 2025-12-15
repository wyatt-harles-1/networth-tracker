/*
  # Create Portfolio Snapshots and Dividends Tables

  ## Overview
  Creates tables for tracking portfolio snapshots over time and managing dividend payments.

  ## 1. New Tables

  ### `portfolio_snapshots`
  - Historical portfolio value tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `snapshot_date` (date)
  - `total_assets` (numeric)
  - `total_liabilities` (numeric)
  - `net_worth` (numeric)
  - `asset_class_breakdown` (jsonb, stores values per asset class)
  - `created_at` (timestamptz)

  ### `dividends`
  - Upcoming and historical dividend payments
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `holding_id` (uuid, foreign key)
  - `symbol` (text)
  - `ex_date` (date)
  - `pay_date` (date)
  - `amount` (numeric)
  - `status` (text, 'upcoming', 'paid')
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on both tables
  - Users can only access their own records
*/

-- Create portfolio_snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL,
  total_assets numeric(15, 2) NOT NULL DEFAULT 0,
  total_liabilities numeric(15, 2) NOT NULL DEFAULT 0,
  net_worth numeric(15, 2) NOT NULL DEFAULT 0,
  asset_class_breakdown jsonb DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can view own snapshots"
  ON portfolio_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can insert own snapshots"
  ON portfolio_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can update own snapshots"
  ON portfolio_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can delete own snapshots"
  ON portfolio_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS snapshots_user_id_idx ON portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS snapshots_date_idx ON portfolio_snapshots(snapshot_date DESC);

COMMENT ON TABLE portfolio_snapshots IS 'Historical portfolio snapshots tracking net worth over time';

-- Create dividends table
CREATE TABLE IF NOT EXISTS dividends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  holding_id uuid REFERENCES holdings ON DELETE CASCADE,
  symbol text NOT NULL,
  ex_date date NOT NULL,
  pay_date date NOT NULL,
  amount numeric(15, 2) NOT NULL,
  status text DEFAULT 'upcoming' NOT NULL CHECK (status IN ('upcoming', 'paid')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dividends" ON dividends;
CREATE POLICY "Users can view own dividends"
  ON dividends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dividends" ON dividends;
CREATE POLICY "Users can insert own dividends"
  ON dividends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dividends" ON dividends;
CREATE POLICY "Users can update own dividends"
  ON dividends FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dividends" ON dividends;
CREATE POLICY "Users can delete own dividends"
  ON dividends FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS dividends_user_id_idx ON dividends(user_id);
CREATE INDEX IF NOT EXISTS dividends_pay_date_idx ON dividends(pay_date);
CREATE INDEX IF NOT EXISTS dividends_status_idx ON dividends(status);
CREATE INDEX IF NOT EXISTS dividends_holding_id_idx ON dividends(holding_id);

COMMENT ON TABLE dividends IS 'Tracks upcoming and paid dividend payments for holdings';

DO $$
BEGIN
  RAISE NOTICE '✓ Created portfolio_snapshots table';
  RAISE NOTICE '✓ Created dividends table';
END $$;
