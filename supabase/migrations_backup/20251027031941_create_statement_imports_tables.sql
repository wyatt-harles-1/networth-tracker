/*
  # Create Statement Imports Tables

  ## Overview
  Creates tables for managing investment statement imports and parsed trade data.
  Allows users to upload brokerage statements and track the parsing/validation workflow.

  ## 1. New Tables
    
    ### `statement_imports`
    Tracks each uploaded statement file and its processing status
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `filename` (text) - Original uploaded filename
    - `file_type` (text) - File extension/MIME type
    - `file_path` (text) - Path in Supabase Storage
    - `file_size` (bigint) - File size in bytes
    - `broker_name` (text, nullable) - Detected broker name
    - `status` (text) - Import status: pending, processing, completed, failed
    - `uploaded_at` (timestamptz) - Upload timestamp
    - `processed_at` (timestamptz, nullable) - Processing completion time
    - `validation_summary` (jsonb) - Summary of validation results
    - `error_message` (text, nullable) - Error details if failed
    - `trade_count` (integer) - Number of trades parsed

    ### `parsed_trades`
    Stores individual trades extracted from statements before final import
    - `id` (uuid, primary key)
    - `import_id` (uuid, foreign key to statement_imports)
    - `user_id` (uuid, foreign key to auth.users)
    - `symbol` (text) - Stock/crypto ticker symbol
    - `action` (text) - Trade action: BUY, SELL, DIVIDEND, etc.
    - `shares` (numeric, nullable) - Number of shares/units
    - `price` (numeric, nullable) - Price per share/unit
    - `amount` (numeric) - Total transaction amount
    - `trade_date` (date) - Date of the trade
    - `account_name` (text, nullable) - Account name from statement
    - `confidence_score` (numeric) - Parser confidence (0-1)
    - `validation_status` (text) - Status: valid, warning, error
    - `validation_errors` (jsonb) - Array of validation issues
    - `raw_text_snippet` (text, nullable) - Original text from statement
    - `is_selected` (boolean) - User selection for import
    - `created_at` (timestamptz) - Record creation time

  ## 2. Security
    - Enable RLS on both tables
    - Users can only access their own import records
    - Users can only access parsed trades from their imports

  ## 3. Indexes
    - Index on user_id for both tables
    - Index on import_id for parsed_trades
    - Index on status for statement_imports
    - Index on validation_status for parsed_trades

  ## 4. Important Notes
    - Files are stored temporarily and cleaned up after processing
    - Validation errors stored as JSONB for flexibility
    - Confidence scores help users understand parsing quality
    - is_selected allows users to choose which trades to import
*/

-- Create statement_imports table
CREATE TABLE IF NOT EXISTS statement_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_type text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  broker_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz,
  validation_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  error_message text,
  trade_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create parsed_trades table
CREATE TABLE IF NOT EXISTS parsed_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid REFERENCES statement_imports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  action text NOT NULL,
  shares numeric,
  price numeric,
  amount numeric NOT NULL,
  trade_date date NOT NULL,
  account_name text,
  confidence_score numeric DEFAULT 0.5 NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('valid', 'warning', 'error', 'pending')),
  validation_errors jsonb DEFAULT '[]'::jsonb NOT NULL,
  raw_text_snippet text,
  is_selected boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for statement_imports
DROP POLICY IF EXISTS "Users can view own statement imports" ON statement_imports;
CREATE POLICY "Users can view own statement imports"
  ON statement_imports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own statement imports" ON statement_imports;
CREATE POLICY "Users can insert own statement imports"
  ON statement_imports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own statement imports" ON statement_imports;
CREATE POLICY "Users can update own statement imports"
  ON statement_imports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own statement imports" ON statement_imports;
CREATE POLICY "Users can delete own statement imports"
  ON statement_imports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for parsed_trades
DROP POLICY IF EXISTS "Users can view own parsed trades" ON parsed_trades;
CREATE POLICY "Users can view own parsed trades"
  ON parsed_trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own parsed trades" ON parsed_trades;
CREATE POLICY "Users can insert own parsed trades"
  ON parsed_trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own parsed trades" ON parsed_trades;
CREATE POLICY "Users can update own parsed trades"
  ON parsed_trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own parsed trades" ON parsed_trades;
CREATE POLICY "Users can delete own parsed trades"
  ON parsed_trades FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS statement_imports_user_id_idx ON statement_imports(user_id);
CREATE INDEX IF NOT EXISTS statement_imports_status_idx ON statement_imports(status);
CREATE INDEX IF NOT EXISTS statement_imports_uploaded_at_idx ON statement_imports(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS parsed_trades_user_id_idx ON parsed_trades(user_id);
CREATE INDEX IF NOT EXISTS parsed_trades_import_id_idx ON parsed_trades(import_id);
CREATE INDEX IF NOT EXISTS parsed_trades_validation_status_idx ON parsed_trades(validation_status);
CREATE INDEX IF NOT EXISTS parsed_trades_symbol_idx ON parsed_trades(symbol);

-- Add comments for documentation
COMMENT ON TABLE statement_imports IS 'Tracks uploaded investment statement files and their processing status';
COMMENT ON TABLE parsed_trades IS 'Stores individual trades parsed from statements before final import to transactions';
COMMENT ON COLUMN parsed_trades.confidence_score IS 'AI parser confidence score (0-1) indicating parsing quality';
COMMENT ON COLUMN parsed_trades.validation_errors IS 'Array of validation issues with details and suggested fixes';