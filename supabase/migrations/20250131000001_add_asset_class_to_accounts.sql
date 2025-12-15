/*
  # Add Asset Class to Accounts

  Adds asset_class_id foreign key column to accounts table to link accounts
  with asset classes for allocation analysis.

  ## Changes
  - Add asset_class_id column to accounts table
  - Add foreign key constraint to asset_classes table
  - Add index for performance
*/

-- Add asset_class_id column to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS asset_class_id uuid REFERENCES asset_classes(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS accounts_asset_class_id_idx ON accounts(asset_class_id);

-- Add comment
COMMENT ON COLUMN accounts.asset_class_id IS 'Foreign key to asset_classes table for portfolio allocation analysis';

DO $$
BEGIN
  RAISE NOTICE '✓ Added asset_class_id column to accounts table';
  RAISE NOTICE '✓ Added foreign key constraint to asset_classes';
END $$;
