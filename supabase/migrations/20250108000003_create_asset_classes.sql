/*
  # Create Asset Classes Table

  ## Overview
  Asset classes allow users to categorize their holdings (stocks, bonds, real estate, etc.)
  for portfolio analysis and allocation tracking.

  ## Tables
  - asset_classes: User-defined asset classes with display order and visibility

  ## Security
  - RLS enabled
  - Users can only manage their own asset classes
*/

-- Create asset_classes table
CREATE TABLE IF NOT EXISTS asset_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE asset_classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own asset classes" ON asset_classes;
CREATE POLICY "Users can view own asset classes"
  ON asset_classes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own asset classes" ON asset_classes;
CREATE POLICY "Users can insert own asset classes"
  ON asset_classes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own asset classes" ON asset_classes;
CREATE POLICY "Users can update own asset classes"
  ON asset_classes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own asset classes" ON asset_classes;
CREATE POLICY "Users can delete own asset classes"
  ON asset_classes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS asset_classes_user_id_idx ON asset_classes(user_id);
CREATE INDEX IF NOT EXISTS asset_classes_display_order_idx ON asset_classes(display_order);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_asset_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asset_classes_updated_at ON asset_classes;
CREATE TRIGGER asset_classes_updated_at
  BEFORE UPDATE ON asset_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_classes_updated_at();

DO $$
BEGIN
  RAISE NOTICE '✓ Created asset_classes table';
  RAISE NOTICE '✓ Created RLS policies for asset_classes';
END $$;
