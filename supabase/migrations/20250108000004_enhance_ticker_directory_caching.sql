/*
  # Enhance Ticker Directory with Yahoo Finance Caching

  ## Overview
  Add caching fields to ticker_directory to reduce API calls and improve performance.
  Store full Yahoo Finance response for offline access and faster lookups.

  ## Changes
  - Add yahoo_data JSONB column to store full quote response
  - Add last_fetched_at timestamp
  - Add fetch_count for analytics
  - Add cache_ttl (time to live) in minutes
  - Create function to check if cache is valid

  ## Benefits
  - Faster lookups (database > API)
  - Works offline with cached data
  - No rate limits on cached data
  - Analytics on API usage
*/

-- Add caching columns to ticker_directory
ALTER TABLE ticker_directory
  ADD COLUMN IF NOT EXISTS yahoo_data JSONB,
  ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fetch_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_ttl_minutes INTEGER DEFAULT 60; -- Default: cache for 1 hour

-- Create index on last_fetched_at for cache expiry queries
CREATE INDEX IF NOT EXISTS ticker_directory_last_fetched_idx
  ON ticker_directory(last_fetched_at DESC);

-- Function to check if ticker cache is valid
CREATE OR REPLACE FUNCTION is_ticker_cache_valid(
  p_symbol TEXT,
  p_max_age_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_fetched TIMESTAMPTZ;
BEGIN
  SELECT last_fetched_at INTO v_last_fetched
  FROM ticker_directory
  WHERE symbol = UPPER(TRIM(p_symbol))
    AND yahoo_data IS NOT NULL;

  IF v_last_fetched IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if cache is still valid
  RETURN (now() - v_last_fetched) < (p_max_age_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached ticker data
CREATE OR REPLACE FUNCTION get_cached_ticker_data(p_symbol TEXT)
RETURNS JSONB AS $$
DECLARE
  v_data JSONB;
BEGIN
  SELECT yahoo_data INTO v_data
  FROM ticker_directory
  WHERE symbol = UPPER(TRIM(p_symbol))
    AND yahoo_data IS NOT NULL
    AND is_ticker_cache_valid(p_symbol, cache_ttl_minutes);

  RETURN v_data;
END;
$$ LANGUAGE plpgsql;

-- Function to update ticker cache
CREATE OR REPLACE FUNCTION update_ticker_cache(
  p_symbol TEXT,
  p_yahoo_data JSONB,
  p_name TEXT DEFAULT NULL,
  p_asset_type TEXT DEFAULT NULL,
  p_sector TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_exchange TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO ticker_directory (
    symbol,
    name,
    asset_type,
    sector,
    industry,
    exchange,
    yahoo_data,
    last_fetched_at,
    fetch_count,
    is_active,
    data_source,
    last_updated
  ) VALUES (
    UPPER(TRIM(p_symbol)),
    COALESCE(p_name, p_symbol),
    COALESCE(p_asset_type, 'unknown'),
    p_sector,
    p_industry,
    p_exchange,
    p_yahoo_data,
    now(),
    1,
    true,
    'yahoo_finance',
    now()
  )
  ON CONFLICT (symbol)
  DO UPDATE SET
    name = COALESCE(EXCLUDED.name, ticker_directory.name),
    asset_type = COALESCE(EXCLUDED.asset_type, ticker_directory.asset_type),
    sector = COALESCE(EXCLUDED.sector, ticker_directory.sector),
    industry = COALESCE(EXCLUDED.industry, ticker_directory.industry),
    exchange = COALESCE(EXCLUDED.exchange, ticker_directory.exchange),
    yahoo_data = EXCLUDED.yahoo_data,
    last_fetched_at = now(),
    fetch_count = ticker_directory.fetch_count + 1,
    last_updated = now();
END;
$$ LANGUAGE plpgsql;

-- Create view for stale cache entries (for cleanup/refresh jobs)
CREATE OR REPLACE VIEW stale_ticker_cache AS
SELECT
  symbol,
  name,
  last_fetched_at,
  fetch_count,
  cache_ttl_minutes,
  (now() - last_fetched_at) AS cache_age
FROM ticker_directory
WHERE yahoo_data IS NOT NULL
  AND (now() - last_fetched_at) > (cache_ttl_minutes || ' minutes')::INTERVAL
ORDER BY fetch_count DESC, last_fetched_at ASC;

COMMENT ON COLUMN ticker_directory.yahoo_data IS 'Cached Yahoo Finance API response (full JSON)';
COMMENT ON COLUMN ticker_directory.last_fetched_at IS 'Timestamp when data was last fetched from Yahoo Finance';
COMMENT ON COLUMN ticker_directory.fetch_count IS 'Number of times this ticker has been fetched';
COMMENT ON COLUMN ticker_directory.cache_ttl_minutes IS 'Cache time-to-live in minutes';

COMMENT ON FUNCTION is_ticker_cache_valid IS 'Check if ticker cache is still valid based on TTL';
COMMENT ON FUNCTION get_cached_ticker_data IS 'Get cached Yahoo Finance data if valid';
COMMENT ON FUNCTION update_ticker_cache IS 'Update ticker cache with fresh Yahoo Finance data';

DO $$
BEGIN
  RAISE NOTICE '✓ Enhanced ticker_directory with Yahoo Finance caching';
  RAISE NOTICE '✓ Added yahoo_data JSONB column for full response caching';
  RAISE NOTICE '✓ Created cache validation functions';
  RAISE NOTICE '✓ Created stale_ticker_cache view for monitoring';
  RAISE NOTICE '';
  RAISE NOTICE 'Cache TTL: 60 minutes by default';
  RAISE NOTICE 'Use get_cached_ticker_data(symbol) to retrieve cached data';
  RAISE NOTICE 'Use update_ticker_cache(symbol, data) to update cache';
END $$;
