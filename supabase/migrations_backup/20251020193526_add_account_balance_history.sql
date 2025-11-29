/*
  # Add Account Balance History Tracking

  ## Overview
  This migration creates a table to track historical account balance snapshots over time,
  enabling the display of account performance graphs and historical analysis.

  ## 1. New Tables

  ### `account_balance_history`
  - `id` (uuid, primary key) - Unique identifier for each snapshot
  - `user_id` (uuid, foreign key) - References auth.users, the account owner
  - `account_id` (uuid, foreign key) - References accounts table
  - `snapshot_date` (date) - The date of this balance snapshot
  - `balance` (numeric) - Account balance at this point in time
  - `holdings_value` (numeric) - Total value of holdings in the account
  - `total_cost_basis` (numeric) - Total cost basis of all holdings
  - `unrealized_gain` (numeric) - Unrealized gains from open positions
  - `realized_gain` (numeric) - Realized gains from closed positions (cumulative)
  - `transaction_count` (integer) - Number of transactions up to this date
  - `holdings_count` (integer) - Number of holdings at this point
  - `created_at` (timestamptz) - When this snapshot was created

  ## 2. Security
  - Enable RLS on account_balance_history table
  - Add policies for authenticated users to manage their own data
  - Users can only access their own account history records

  ## 3. Indexes
  - Add composite index on (account_id, snapshot_date) for efficient date range queries
  - Add index on user_id for filtering user's data

  ## 4. Important Notes
  - Unique constraint on (account_id, snapshot_date) to prevent duplicate snapshots
  - All monetary values stored as numeric(15, 2) for precision
  - Snapshots can be generated daily, weekly, or on-demand
  - Historical data enables trend analysis and performance tracking
*/

-- Create account_balance_history table
CREATE TABLE IF NOT EXISTS account_balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL,
  balance numeric(15, 2) NOT NULL DEFAULT 0,
  holdings_value numeric(15, 2) NOT NULL DEFAULT 0,
  total_cost_basis numeric(15, 2) NOT NULL DEFAULT 0,
  unrealized_gain numeric(15, 2) NOT NULL DEFAULT 0,
  realized_gain numeric(15, 2) NOT NULL DEFAULT 0,
  transaction_count integer DEFAULT 0 NOT NULL,
  holdings_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(account_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE account_balance_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own account history" ON account_balance_history;
CREATE POLICY "Users can view own account history"
  ON account_balance_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own account history" ON account_balance_history;
CREATE POLICY "Users can insert own account history"
  ON account_balance_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own account history" ON account_balance_history;
CREATE POLICY "Users can update own account history"
  ON account_balance_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own account history" ON account_balance_history;
CREATE POLICY "Users can delete own account history"
  ON account_balance_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS account_balance_history_user_id_idx 
  ON account_balance_history(user_id);

CREATE INDEX IF NOT EXISTS account_balance_history_account_date_idx 
  ON account_balance_history(account_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS account_balance_history_date_idx 
  ON account_balance_history(snapshot_date DESC);

-- Function to create a snapshot for an account
CREATE OR REPLACE FUNCTION create_account_snapshot(
  p_user_id uuid,
  p_account_id uuid,
  p_snapshot_date date DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  v_balance numeric(15, 2);
  v_holdings_value numeric(15, 2);
  v_cost_basis numeric(15, 2);
  v_unrealized numeric(15, 2);
  v_realized numeric(15, 2);
  v_tx_count integer;
  v_holdings_count integer;
BEGIN
  -- Get current account balance
  SELECT current_balance INTO v_balance
  FROM accounts
  WHERE id = p_account_id AND user_id = p_user_id;

  -- Get holdings metrics
  SELECT 
    COALESCE(SUM(current_value), 0),
    COALESCE(SUM(cost_basis), 0),
    COUNT(*)
  INTO v_holdings_value, v_cost_basis, v_holdings_count
  FROM holdings
  WHERE account_id = p_account_id AND user_id = p_user_id;

  -- Calculate unrealized gain
  v_unrealized := v_holdings_value - v_cost_basis;

  -- Get realized gains from closed lots
  SELECT COALESCE(SUM(
    (quantity - quantity_remaining) * (cost_per_share)
  ), 0) INTO v_realized
  FROM holding_lots
  WHERE account_id = p_account_id 
    AND user_id = p_user_id 
    AND lot_status = 'closed';

  -- Get transaction count
  SELECT COUNT(*) INTO v_tx_count
  FROM transactions
  WHERE account_id = p_account_id 
    AND user_id = p_user_id
    AND transaction_date <= p_snapshot_date;

  -- Insert or update snapshot
  INSERT INTO account_balance_history (
    user_id,
    account_id,
    snapshot_date,
    balance,
    holdings_value,
    total_cost_basis,
    unrealized_gain,
    realized_gain,
    transaction_count,
    holdings_count
  ) VALUES (
    p_user_id,
    p_account_id,
    p_snapshot_date,
    v_balance,
    v_holdings_value,
    v_cost_basis,
    v_unrealized,
    v_realized,
    v_tx_count,
    v_holdings_count
  )
  ON CONFLICT (account_id, snapshot_date)
  DO UPDATE SET
    balance = EXCLUDED.balance,
    holdings_value = EXCLUDED.holdings_value,
    total_cost_basis = EXCLUDED.total_cost_basis,
    unrealized_gain = EXCLUDED.unrealized_gain,
    realized_gain = EXCLUDED.realized_gain,
    transaction_count = EXCLUDED.transaction_count,
    holdings_count = EXCLUDED.holdings_count,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;