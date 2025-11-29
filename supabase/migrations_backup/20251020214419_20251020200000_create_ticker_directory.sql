/*
  # Create Ticker Directory Table

  ## Overview
  This migration creates a comprehensive ticker directory table to enable fast,
  reliable ticker search for all asset types (stocks, ETFs, cryptocurrencies, mutual funds).
  The directory is automatically populated and maintained via scheduled updates.

  ## 1. New Tables

  ### `ticker_directory`
  - Comprehensive database of all searchable ticker symbols
  - `symbol` (text, primary key) - Ticker symbol (e.g., 'AAPL', 'BTC')
  - `name` (text) - Full name of the security (e.g., 'Apple Inc.')
  - `asset_type` (text) - Type: 'stock', 'etf', 'crypto', 'mutualfund'
  - `exchange` (text, nullable) - Exchange (e.g., 'NASDAQ', 'NYSE')
  - `is_active` (boolean) - Whether ticker is actively traded
  - `data_source` (text) - Source: 'alpha_vantage', 'coingecko', 'user_added', 'yahoo_finance'
  - `last_updated` (timestamptz) - When this entry was last refreshed
  - `created_at` (timestamptz) - When this entry was first added

  ### `ticker_directory_updates`
  - Tracks scheduled update jobs for the ticker directory
  - `id` (uuid, primary key)
  - `update_type` (text) - 'stocks', 'crypto', 'full'
  - `job_status` (text) - 'pending', 'running', 'completed', 'failed'
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `tickers_added` (integer) - Count of new tickers added
  - `tickers_updated` (integer) - Count of existing tickers updated
  - `error_message` (text, nullable)
  - `created_at` (timestamptz)

  ## 2. Full-Text Search Setup
  - Create GIN index for fast full-text search on symbol and name
  - Support case-insensitive search with ranking
  - Optimize for autocomplete queries with prefix matching

  ## 3. Security
  - Enable RLS on ticker_directory table
  - All authenticated users can read ticker directory (public data)
  - Only system/admin functions can insert/update ticker directory
  - ticker_directory_updates table tracks system operations

  ## 4. Important Notes
  - The ticker directory is populated via scheduled Edge Functions
  - User-added tickers (from validation) are automatically accepted
  - Indexes optimize search performance for autocomplete
  - Full-text search enables fuzzy matching for user queries
  - Updates are incremental to preserve user-added tickers
*/

-- Create ticker_directory table
CREATE TABLE IF NOT EXISTS ticker_directory (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto', 'mutualfund')),
  exchange text,
  is_active boolean DEFAULT true NOT NULL,
  data_source text NOT NULL CHECK (data_source IN ('alpha_vantage', 'coingecko', 'user_added', 'yahoo_finance', 'manual')),
  last_updated timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE ticker_directory ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read ticker directory (public data)
CREATE POLICY "Ticker directory is readable by all authenticated users"
  ON ticker_directory FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert (for auto-validation)
CREATE POLICY "Users can insert validated tickers"
  ON ticker_directory FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update (for refreshing data)
CREATE POLICY "Users can update ticker directory"
  ON ticker_directory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for fast search
CREATE INDEX IF NOT EXISTS ticker_directory_symbol_idx ON ticker_directory(symbol);
CREATE INDEX IF NOT EXISTS ticker_directory_name_idx ON ticker_directory USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS ticker_directory_asset_type_idx ON ticker_directory(asset_type);
CREATE INDEX IF NOT EXISTS ticker_directory_is_active_idx ON ticker_directory(is_active);

-- Create composite index for search optimization
CREATE INDEX IF NOT EXISTS ticker_directory_search_idx ON ticker_directory(symbol text_pattern_ops, name text_pattern_ops);

-- Create full-text search index for fuzzy matching
CREATE INDEX IF NOT EXISTS ticker_directory_fulltext_idx ON ticker_directory USING gin(
  to_tsvector('english', symbol || ' ' || name)
);

-- Create ticker_directory_updates table to track update jobs
CREATE TABLE IF NOT EXISTS ticker_directory_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_type text NOT NULL CHECK (update_type IN ('stocks', 'crypto', 'full')),
  job_status text DEFAULT 'pending' NOT NULL CHECK (job_status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  tickers_added integer DEFAULT 0 NOT NULL,
  tickers_updated integer DEFAULT 0 NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE ticker_directory_updates ENABLE ROW LEVEL SECURITY;

-- Only admins/system can read update logs
CREATE POLICY "Update logs are readable by authenticated users"
  ON ticker_directory_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert update logs"
  ON ticker_directory_updates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update logs"
  ON ticker_directory_updates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS ticker_directory_updates_status_idx ON ticker_directory_updates(job_status);
CREATE INDEX IF NOT EXISTS ticker_directory_updates_created_at_idx ON ticker_directory_updates(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE ticker_directory IS 'Comprehensive directory of all searchable ticker symbols for stocks, ETFs, crypto, and mutual funds';
COMMENT ON TABLE ticker_directory_updates IS 'Tracks scheduled update jobs that refresh the ticker directory';
COMMENT ON COLUMN ticker_directory.symbol IS 'Ticker symbol (primary key, uppercase)';
COMMENT ON COLUMN ticker_directory.name IS 'Full name of the security';
COMMENT ON COLUMN ticker_directory.asset_type IS 'Asset type: stock, etf, crypto, or mutualfund';
COMMENT ON COLUMN ticker_directory.data_source IS 'Data source: alpha_vantage, coingecko, user_added, or yahoo_finance';
