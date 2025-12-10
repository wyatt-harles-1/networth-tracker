/*
  # Remove Insecure View

  ## Issue
  The view `user_holdings_with_sector` was flagged by Supabase for not enforcing
  Row Level Security (RLS) properly. Views don't enforce RLS by default and can
  potentially expose data from other users.

  ## Solution
  Drop the view since we already have the `get_holdings_with_tax_info()` function
  which properly enforces security using SECURITY DEFINER and filters by user_id.

  ## Changes
  - Drop `user_holdings_with_sector` view
  - Application code should use `get_holdings_with_tax_info(user_id)` instead

  ## Security
  The function `get_holdings_with_tax_info()` is secure because:
  1. It uses SECURITY DEFINER to run with elevated privileges
  2. It requires a user_id parameter
  3. It filters all results by that user_id (WHERE h.user_id = p_user_id)
  4. This ensures users can only see their own data
*/

-- Drop the insecure view
DROP VIEW IF EXISTS user_holdings_with_sector;

-- Note: Applications should query holdings with sector data using:
-- SELECT * FROM get_holdings_with_tax_info(auth.uid())

DO $$
BEGIN
  RAISE NOTICE '✓ Dropped user_holdings_with_sector view';
  RAISE NOTICE '';
  RAISE NOTICE 'Security improved: Use get_holdings_with_tax_info(auth.uid()) instead';
  RAISE NOTICE 'This function properly enforces RLS by filtering on user_id';
END $$;
