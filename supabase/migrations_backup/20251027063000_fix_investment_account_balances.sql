/*
  # Fix Investment Account Balances

  1. Purpose
    - Recalculate and fix negative Investment Account balances
    - Set Investment Account balances to reflect total market value of holdings

  2. Changes
    - Update all Investment Accounts to calculate balance from holdings
    - Set balance to sum of all holdings' current_value for each account
    - Handle accounts with no holdings (set to 0)

  3. Notes
    - Investment Accounts should reflect portfolio value, not cash balance
    - This migration corrects historical data where buy/sell transactions incorrectly modified balances
*/

-- Update Investment Account balances to reflect total holdings value
UPDATE accounts a
SET
  current_balance = COALESCE(
    (
      SELECT SUM(COALESCE(h.current_value, 0))
      FROM holdings h
      WHERE h.account_id = a.id
    ),
    0
  ),
  updated_at = NOW()
WHERE a.category = 'Investment Accounts';
