-- Create allocation_recommendations table for storing AI-generated portfolio recommendations
CREATE TABLE IF NOT EXISTS allocation_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Type of recommendation: 'rebalance', 'tax_optimize', 'diversify', 'risk_adjustment', 'insight'
  recommendation_type text NOT NULL,

  -- Priority level: 'high', 'medium', 'low'
  priority text NOT NULL,

  -- Recommendation title (short summary)
  title text NOT NULL,

  -- Detailed description
  description text NOT NULL,

  -- Specific action items as JSON array
  -- Example: [{"action": "Sell $5,000 stocks", "impact": "Reduce volatility by 5%"}]
  action_items jsonb,

  -- Expected impact/benefit (optional)
  expected_impact text,

  -- Whether the user has dismissed this recommendation
  is_dismissed boolean DEFAULT false NOT NULL,
  dismissed_at timestamptz,

  created_at timestamptz DEFAULT now() NOT NULL,

  -- Check constraints
  CONSTRAINT valid_recommendation_type CHECK (recommendation_type IN ('rebalance', 'tax_optimize', 'diversify', 'risk_adjustment', 'insight')),
  CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low'))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_allocation_recommendations_user_id ON allocation_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_allocation_recommendations_dismissed ON allocation_recommendations(user_id, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_allocation_recommendations_priority ON allocation_recommendations(user_id, priority, is_dismissed);

-- Enable Row Level Security
ALTER TABLE allocation_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own recommendations
CREATE POLICY "Users can view own recommendations"
  ON allocation_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own recommendations
CREATE POLICY "Users can insert own recommendations"
  ON allocation_recommendations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recommendations (mainly for dismissing)
CREATE POLICY "Users can update own recommendations"
  ON allocation_recommendations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own recommendations
CREATE POLICY "Users can delete own recommendations"
  ON allocation_recommendations
  FOR DELETE
  USING (auth.uid() = user_id);
