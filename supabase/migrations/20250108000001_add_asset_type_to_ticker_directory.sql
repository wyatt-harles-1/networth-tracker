/*
  # Add Asset Type to Ticker Directory

  ## Overview
  Add asset_type field to ticker_directory to enable automatic detection
  of asset categories based on ticker symbols. This improves UX by allowing
  the application to auto-select the appropriate transaction category.

  ## Changes
  - Add `asset_type` column to ticker_directory
  - Create index for asset_type filtering
  - Add helper function to detect asset type from ticker patterns

  ## Asset Types
  - stock: Individual company stocks
  - etf: Exchange-traded funds
  - crypto: Cryptocurrencies
  - option: Options contracts
  - bond: Bonds
  - mutual_fund: Mutual funds
  - unknown: Unclassified or unknown asset type
*/

-- Add asset_type field to ticker_directory
ALTER TABLE ticker_directory
  ADD COLUMN IF NOT EXISTS asset_type text
    CHECK (asset_type IN ('stock', 'etf', 'crypto', 'option', 'bond', 'mutual_fund', 'unknown'))
    DEFAULT 'unknown';

-- Create index for asset_type filtering
CREATE INDEX IF NOT EXISTS ticker_directory_asset_type_idx ON ticker_directory(asset_type);

COMMENT ON COLUMN ticker_directory.asset_type IS 'Type of asset: stock, etf, crypto, option, bond, mutual_fund, unknown';

-- Helper function to detect asset type from ticker symbol patterns
CREATE OR REPLACE FUNCTION detect_asset_type(ticker_symbol text)
RETURNS text AS $$
BEGIN
  -- Normalize ticker to uppercase
  ticker_symbol := UPPER(TRIM(ticker_symbol));

  -- Crypto patterns (common suffixes)
  IF ticker_symbol ~ '.*-(USD|USDT|BTC|ETH)$' THEN
    RETURN 'crypto';
  END IF;

  -- Common crypto symbols without suffix
  IF ticker_symbol IN ('BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE', 'MATIC', 'DOT', 'AVAX', 'SHIB', 'LTC', 'LINK', 'UNI', 'ATOM') THEN
    RETURN 'crypto';
  END IF;

  -- Option patterns (complex option symbols)
  -- Example: AAPL240119C00150000 (ticker + expiration + call/put + strike)
  IF ticker_symbol ~ '^[A-Z]{1,5}[0-9]{6}[CP][0-9]{8}$' THEN
    RETURN 'option';
  END IF;

  -- Bond patterns (typically numeric CUSIP or contain 'BOND')
  IF ticker_symbol ~ '^[0-9]{9}$' OR ticker_symbol ~ 'BOND' THEN
    RETURN 'bond';
  END IF;

  -- Mutual fund patterns (often end with X or have 5 characters)
  IF ticker_symbol ~ '^[A-Z]{5}$' AND ticker_symbol ~ 'X$' THEN
    RETURN 'mutual_fund';
  END IF;

  -- Default to unknown - will need to be classified via API or manually
  RETURN 'unknown';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION detect_asset_type IS 'Attempts to detect asset type from ticker symbol using pattern matching';

-- Update existing ticker_directory entries with detected asset types
UPDATE ticker_directory
SET asset_type = detect_asset_type(symbol)
WHERE asset_type = 'unknown' OR asset_type IS NULL;

DO $$
BEGIN
  RAISE NOTICE '✓ Added asset_type field to ticker_directory';
  RAISE NOTICE '✓ Created pattern-based detection function';
  RAISE NOTICE '✓ Updated existing tickers with detected asset types';
  RAISE NOTICE '';
  RAISE NOTICE 'Asset types: stock, etf, crypto, option, bond, mutual_fund, unknown';
  RAISE NOTICE 'Use detect_asset_type(ticker) to classify new tickers';
END $$;
