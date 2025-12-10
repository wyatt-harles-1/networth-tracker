/*
  # Add Asset Type Breakdown to Account Balance History

  ## Overview
  This migration adds asset type breakdown tracking to account_balance_history table,
  enabling charts to be filtered by asset type (stocks, ETFs, crypto, etc.).

  ## Changes
  1. Add asset_type_breakdown JSONB column to account_balance_history
  2. Update create_account_snapshot function to calculate and store asset type breakdowns

  ## Asset Type Breakdown Format
  The asset_type_breakdown column stores a JSONB object like:
  {
    "stock": 25000.50,
    "etf": 15000.00,
    "crypto": 5000.00,
    "bond": 10000.00
  }

  This allows the frontend to filter chart data by specific asset types.
*/

-- Add asset_type_breakdown column to account_balance_history
ALTER TABLE account_balance_history
  ADD COLUMN IF NOT EXISTS asset_type_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL;

-- Update the create_account_snapshot function to include asset type breakdown
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
  v_asset_type_breakdown jsonb;
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

  -- Calculate asset type breakdown
  SELECT jsonb_object_agg(
    asset_type,
    total_value
  ) INTO v_asset_type_breakdown
  FROM (
    SELECT
      asset_type,
      SUM(current_value) as total_value
    FROM holdings
    WHERE account_id = p_account_id AND user_id = p_user_id
    GROUP BY asset_type
  ) asset_totals;

  -- Default to empty object if no holdings
  IF v_asset_type_breakdown IS NULL THEN
    v_asset_type_breakdown := '{}'::jsonb;
  END IF;

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
    holdings_count,
    asset_type_breakdown
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
    v_holdings_count,
    v_asset_type_breakdown
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
    asset_type_breakdown = EXCLUDED.asset_type_breakdown,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE '✓ Added asset_type_breakdown column to account_balance_history';
  RAISE NOTICE '✓ Updated create_account_snapshot function with asset type tracking';
END $$;
