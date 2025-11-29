-- Update transactions table schema to match application requirements
-- This migration safely updates the existing schema without data loss

-- Step 1: Drop the restrictive CHECK constraint on transaction_type
DO $$
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'transactions_transaction_type_check'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_transaction_type_check;
    END IF;
END $$;

-- Step 2: Add new columns if they don't exist (safe for existing data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='transactions' AND column_name='transaction_metadata') THEN
        ALTER TABLE transactions ADD COLUMN transaction_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='transactions' AND column_name='data_source') THEN
        ALTER TABLE transactions ADD COLUMN data_source TEXT DEFAULT 'manual' NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='transactions' AND column_name='external_transaction_id') THEN
        ALTER TABLE transactions ADD COLUMN external_transaction_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='transactions' AND column_name='is_reviewed') THEN
        ALTER TABLE transactions ADD COLUMN is_reviewed BOOLEAN DEFAULT true NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='transactions' AND column_name='updated_at') THEN
        ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Step 3: Create index on transaction_metadata if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_transactions_metadata ON transactions USING gin(transaction_metadata);

-- Step 4: Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
