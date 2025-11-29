/*
  # Add Sector Fields to Ticker Directory

  ## Overview
  This is a follow-up migration to add sector and industry fields to ticker_directory
  table now that it has been created.

  ## Changes
  - Add `sector` column to ticker_directory
  - Add `industry` column to ticker_directory
  - Create index for sector filtering
  - Create helper view for holdings with sector data
*/

-- Add sector fields to ticker_directory
ALTER TABLE ticker_directory
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS industry text;

-- Create index for sector filtering
CREATE INDEX IF NOT EXISTS ticker_directory_sector_idx ON ticker_directory(sector);

COMMENT ON COLUMN ticker_directory.sector IS 'Market sector (e.g., Technology, Healthcare, Financial Services)';
COMMENT ON COLUMN ticker_directory.industry IS 'Industry within sector (e.g., Software, Biotechnology)';

-- Create helper view for sector allocation
CREATE OR REPLACE VIEW user_holdings_with_sector AS
SELECT
  h.*,
  COALESCE(h.sector_override, td.sector, 'Unknown') as effective_sector,
  td.industry,
  td.exchange
FROM holdings h
LEFT JOIN ticker_directory td ON td.symbol = h.symbol;

COMMENT ON VIEW user_holdings_with_sector IS 'Holdings with resolved sector (uses override if set, otherwise from ticker_directory)';

-- Grant access to view
GRANT SELECT ON user_holdings_with_sector TO authenticated;

-- Update the get_holdings_with_tax_info function to use ticker_directory
CREATE OR REPLACE FUNCTION get_holdings_with_tax_info(p_user_id uuid)
RETURNS TABLE (
  holding_id uuid,
  symbol text,
  name text,
  quantity numeric,
  cost_basis numeric,
  current_value numeric,
  unrealized_gain numeric,
  unrealized_gain_percent numeric,
  purchase_date date,
  holding_period_days integer,
  is_long_term boolean,
  account_tax_type text,
  effective_sector text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id as holding_id,
    h.symbol,
    h.name,
    h.quantity,
    h.cost_basis,
    h.current_value,
    (h.current_value - h.cost_basis) as unrealized_gain,
    CASE
      WHEN h.cost_basis > 0
      THEN ((h.current_value - h.cost_basis) / h.cost_basis * 100)
      ELSE 0
    END as unrealized_gain_percent,
    h.purchase_date,
    (CURRENT_DATE - h.purchase_date)::integer as holding_period_days,
    (CURRENT_DATE - h.purchase_date >= 365) as is_long_term,
    COALESCE(a.tax_type, 'taxable') as account_tax_type,
    COALESCE(h.sector_override, td.sector, 'Unknown') as effective_sector
  FROM holdings h
  INNER JOIN accounts a ON a.id = h.account_id
  LEFT JOIN ticker_directory td ON td.symbol = h.symbol
  WHERE h.user_id = p_user_id
    AND h.quantity > 0
  ORDER BY (h.current_value - h.cost_basis) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE '✓ Added sector and industry fields to ticker_directory';
  RAISE NOTICE '✓ Created user_holdings_with_sector view';
  RAISE NOTICE '✓ Updated get_holdings_with_tax_info function';
END $$;
