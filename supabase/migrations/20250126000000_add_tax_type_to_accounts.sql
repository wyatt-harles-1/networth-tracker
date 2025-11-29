-- Add tax_type column to accounts table for tax vehicle categorization
-- This enables users to categorize accounts for tax insights and planning

-- Create custom type for tax treatment categories (if not exists)
DO $$ BEGIN
  CREATE TYPE tax_treatment AS ENUM ('taxable', 'tax_deferred', 'tax_free');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add tax_type column to accounts table (if not exists)
DO $$ BEGIN
  ALTER TABLE accounts ADD COLUMN tax_type tax_treatment;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add index for faster queries on tax_type (if not exists)
CREATE INDEX IF NOT EXISTS idx_accounts_tax_type ON accounts(tax_type);

-- Add comment explaining the column
COMMENT ON COLUMN accounts.tax_type IS 'Tax treatment category for the account: taxable (regular brokerage), tax_deferred (401k, Traditional IRA), tax_free (Roth IRA, HSA)';
