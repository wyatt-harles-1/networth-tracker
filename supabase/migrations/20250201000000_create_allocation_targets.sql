-- Create allocation_targets table for storing user's target portfolio allocation
CREATE TABLE IF NOT EXISTS allocation_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Template used: 'conservative', 'moderate', 'aggressive', 'age_based', 'custom'
  template_name text,

  -- Target percentages for each asset class stored as JSON
  -- Example: {"Stocks": 60, "Bonds": 30, "Cash": 5, "Real Estate": 5}
  targets jsonb NOT NULL,

  -- Threshold percentage that triggers rebalance warnings (default 5%)
  rebalance_threshold numeric DEFAULT 5.0 NOT NULL,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Only one target allocation per user
  UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_allocation_targets_user_id ON allocation_targets(user_id);

-- Enable Row Level Security
ALTER TABLE allocation_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own allocation targets
CREATE POLICY "Users can view own allocation targets"
  ON allocation_targets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own allocation targets
CREATE POLICY "Users can insert own allocation targets"
  ON allocation_targets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own allocation targets
CREATE POLICY "Users can update own allocation targets"
  ON allocation_targets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own allocation targets
CREATE POLICY "Users can delete own allocation targets"
  ON allocation_targets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_allocation_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_allocation_targets_timestamp
  BEFORE UPDATE ON allocation_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_allocation_targets_updated_at();
