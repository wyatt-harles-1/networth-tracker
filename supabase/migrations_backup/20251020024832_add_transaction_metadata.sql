/*
  # Add Transaction Metadata Support

  ## Overview
  Enhances the transactions table to support investment-focused transaction tracking
  with flexible metadata storage and edit tracking.

  ## 1. New Columns
    - `transaction_metadata` (jsonb)
      Stores flexible transaction-specific data including:
      - ticker: Stock/crypto ticker symbol
      - quantity: Number of shares/units
      - price: Purchase/sale price per unit
      - notes: User notes about the transaction
      - Any other transaction-specific fields
    
    - `updated_at` (timestamptz)
      Tracks when transactions are modified
      Automatically updated via trigger

  ## 2. Changes
    - Add transaction_metadata column with default empty JSON object
    - Add updated_at column with default now()
    - Create trigger to auto-update updated_at timestamp
    - Add GIN index on transaction_metadata for efficient JSON queries

  ## 3. Important Notes
    - Existing transactions remain compatible (metadata defaults to {})
    - JSONB allows flexible schema without future migrations
    - Index enables fast queries on metadata fields
*/

-- Add transaction_metadata column for flexible investment data storage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_metadata'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_metadata jsonb DEFAULT '{}'::jsonb NOT NULL;
  END IF;
END $$;

-- Add updated_at column for tracking modifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS transactions_metadata_idx ON transactions USING GIN (transaction_metadata);

-- Add comment for documentation
COMMENT ON COLUMN transactions.transaction_metadata IS 'Stores investment-specific data: ticker, quantity, price, notes, etc.';