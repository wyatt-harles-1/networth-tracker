# Apply All Migrations to New Supabase Project

## Quick Guide

Since you have a fresh Supabase project, you need to apply all migrations in the correct order.

## Option 1: Manual (Safest)

Go to Supabase SQL Editor and run each file in this exact order:

1. `20251019041506_create_initial_schema.sql` ⭐ **MUST RUN FIRST**
2. `20251020024832_add_transaction_metadata.sql`
3. `20251020032124_add_lot_tracking_and_price_history.sql`
4. `20251020051455_enable_realtime_on_tables.sql`
5. `20251020051518_enable_realtime_on_portfolio_snapshots.sql`
6. `20251020193526_add_account_balance_history.sql`
7. `20251020200000_create_ticker_directory.sql`
8. `20251020214419_20251020200000_create_ticker_directory.sql`
9. `20251027031941_create_statement_imports_tables.sql`
10. `20251027032907_create_storage_bucket_for_statements.sql`
11. `20251027063000_fix_investment_account_balances.sql`
12. `20251027164900_create_portfolio_value_history.sql` ⭐ **For line chart**
13. `20251029000000_create_sync_error_tables.sql`
14. `20251029000001_create_versioning_system.sql`

### Steps:
1. Open each file in your code editor
2. Copy the entire contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click "Run"
5. Wait for "Success" message
6. Move to next file

## Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your new project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
supabase db push
```

## Verification

After running all migrations, verify they worked:

```sql
-- Run this in SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see these tables:
- ✅ accounts
- ✅ account_balance_history
- ✅ asset_classes
- ✅ holdings
- ✅ portfolio_snapshots
- ✅ portfolio_value_history
- ✅ portfolio_calculation_jobs
- ✅ market_value_snapshots
- ✅ price_history
- ✅ statement_imports
- ✅ statement_import_mappings
- ✅ sync_errors
- ✅ tax_lots
- ✅ ticker_directory
- ✅ transaction_history
- ✅ transaction_rollbacks
- ✅ transactions
- And more...

## Common Issues

### "relation already exists"
- **Cause**: Table already created
- **Solution**: Skip that migration or drop the table first

### "column does not exist"
- **Cause**: Migrations run out of order
- **Solution**: Run migrations in the exact order listed

### "permission denied"
- **Cause**: RLS policies blocking
- **Solution**: You're running as superuser in SQL Editor, this shouldn't happen

## After Migrations

Once all migrations are applied:

1. ✅ Restart your dev server (if not already done)
2. ✅ Go to your app
3. ✅ Sign up for a new account
4. ✅ Start adding transactions
5. ✅ Check the Portfolio tab
6. ✅ Click "Calculate Portfolio History" for the line chart

Your app is now connected to your new Supabase project!
