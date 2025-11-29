-- Create sync_errors table
CREATE TABLE IF NOT EXISTS sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_context JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transaction_rollbacks table
CREATE TABLE IF NOT EXISTS transaction_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL,
  reason TEXT NOT NULL,
  rolled_back_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for sync_errors
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sync errors" ON sync_errors;
CREATE POLICY "Users can view their own sync errors"
  ON sync_errors FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sync errors" ON sync_errors;
CREATE POLICY "Users can insert their own sync errors"
  ON sync_errors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sync errors" ON sync_errors;
CREATE POLICY "Users can update their own sync errors"
  ON sync_errors FOR UPDATE
  USING (auth.uid() = user_id);

-- Add RLS policies for transaction_rollbacks
ALTER TABLE transaction_rollbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transaction rollbacks" ON transaction_rollbacks;
CREATE POLICY "Users can view their own transaction rollbacks"
  ON transaction_rollbacks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transaction rollbacks" ON transaction_rollbacks;
CREATE POLICY "Users can insert their own transaction rollbacks"
  ON transaction_rollbacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_sync_errors_user_id ON sync_errors(user_id);
CREATE INDEX idx_sync_errors_resolved ON sync_errors(resolved);
CREATE INDEX idx_sync_errors_created_at ON sync_errors(created_at);
CREATE INDEX idx_transaction_rollbacks_user_id ON transaction_rollbacks(user_id);
CREATE INDEX idx_transaction_rollbacks_transaction_id ON transaction_rollbacks(transaction_id);

-- Comment on tables
COMMENT ON TABLE sync_errors IS 'Stores synchronization errors for audit and recovery';
COMMENT ON TABLE transaction_rollbacks IS 'Logs transaction rollbacks for audit trail';
