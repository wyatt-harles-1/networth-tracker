-- Check if price_history table exists and has proper indexes
-- Run this in your Supabase SQL editor

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'price_history'
) as table_exists;

-- 2. Check existing indexes on price_history
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'price_history'
AND schemaname = 'public'
ORDER BY indexname;

-- 3. Check row count
SELECT COUNT(*) as total_rows FROM price_history;

-- 4. Check symbol distribution
SELECT symbol, COUNT(*) as price_count
FROM price_history
GROUP BY symbol
ORDER BY price_count DESC
LIMIT 10;
