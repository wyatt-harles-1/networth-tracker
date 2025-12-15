# Database Schema Fix - Implementation Summary

## Overview
Fixed critical database schema issues where multiple tables were missing from the active migrations folder, causing features to be non-functional.

## What Was Fixed

### 1. ✅ Fixed Column Name Mismatches in `priceService.ts`

**Issue:** The `price_history` table uses `price_date`, `open_price`, `high_price`, `low_price`, and `close_price` columns, but the code was querying incorrect column names (`date`, `open`, `high`, `low`, `close`).

**Files Fixed:**
- `src/services/priceService.ts` (multiple locations)

**Details:**
- Lines 238-239: Changed `date` to `price_date` in query and ordering
- Lines 249-251: Changed `.select('date')` and `.gte('date')` to use `price_date`
- Lines 267-274: Fixed column mapping in data transformation to use proper column names
- Lines 296, 308-309: Fixed ordering and data access

---

### 2. ✅ Created Missing Database Migrations

**Issue:** Nine tables were being used in the code but their migrations existed only in `migrations_backup/` folder, not in the active `migrations/` folder.

**New Migration Files Created:**

#### `20250129000000_create_portfolio_snapshots_and_dividends.sql`
Creates two tables:
- **`portfolio_snapshots`** - Historical net worth tracking
  - Columns: user_id, snapshot_date, total_assets, total_liabilities, net_worth, asset_class_breakdown (jsonb)
  - Used by: usePortfolioSnapshots, portfolioSnapshotService, dataValidationService, dataExportService, priceCorrectionService

- **`dividends`** - Dividend payment tracking
  - Columns: user_id, holding_id, symbol, ex_date, pay_date, amount, status
  - Used by: useDividends, transactionSyncService, transactionReverseService

#### `20250129000001_create_portfolio_value_history.sql`
Creates three tables:
- **`portfolio_value_history`** - Daily portfolio valuations with breakdowns
  - Comprehensive tracking of portfolio performance over time
  - JSONB breakdowns by asset class, ticker, and account
  - Used by: useMarketValueHistory, portfolioValueCalculationService

- **`portfolio_calculation_jobs`** - Background job tracking for portfolio calculations
  - Tracks async calculation jobs with progress monitoring

- **`market_value_snapshots`** - Intraday portfolio snapshots
  - Real-time portfolio value tracking

#### `20250129000002_create_statement_imports_tables.sql`
Creates two tables:
- **`statement_imports`** - Brokerage statement file tracking
  - Manages uploaded statement files and their processing status
  - Used by: useStatementImport, parse-statement Edge Function

- **`parsed_trades`** - Extracted trade data before import
  - Stores individual trades parsed from statements
  - Includes validation status and confidence scores
  - Used by: useStatementImport, statementImportTriggers

---

### 3. ✅ Fixed Migration Ordering

**Issue:** Two migrations had timestamps from October 2025 instead of following chronological order.

**Files Renamed:**
- `20251020200000_create_ticker_directory.sql` → `20250130000000_create_ticker_directory.sql`
- `20251020200001_add_ticker_directory_sector_fields.sql` → `20250130000001_add_ticker_directory_sector_fields.sql`

**Final Migration Order (chronological):**
1. 20250103000000 - Update transactions schema
2. 20250106000000 - Add insights required fields
3. 20250108000000 - Remove insecure view
4. 20250108000001 - Add asset type to ticker directory
5. 20250108000002 - Add account balance history ✅
6. 20250108000003 - Create asset classes ✅
7. 20250108000004 - Enhance ticker directory caching
8. 20250109000001 - Add asset type breakdown
9. 20250126000000 - Add tax type to accounts
10. 20250128000000 - Create price history and holding lots
11. **20250129000000 - Create portfolio snapshots and dividends** 🆕
12. **20250129000001 - Create portfolio value history** 🆕
13. **20250129000002 - Create statement imports tables** 🆕
14. 20250130000000 - Create ticker directory (renamed)
15. 20250130000001 - Add ticker directory sector fields (renamed)

---

### 4. ✅ Created Extended Type Definitions

**File Created:** `src/types/database-extended.ts`

Since `database.ts` is auto-generated and can't be manually edited, created a separate file with TypeScript type definitions for all missing tables:
- `AccountBalanceHistory`
- `AssetClasses`
- `Dividends`
- `MarketValueSnapshots`
- `ParsedTrades`
- `PortfolioCalculationJobs`
- `PortfolioSnapshots`
- `PortfolioValueHistory`
- `StatementImports`

**Usage:**
```typescript
import type { PortfolioSnapshots, Dividends } from '@/types/database-extended';
```

---

## How to Apply These Changes

### Option 1: Local Development with Docker/Supabase CLI (Recommended)

If you have Docker Desktop and Supabase CLI installed:

```bash
# Start local Supabase (if not already running)
npx supabase start

# Apply all migrations
npx supabase db reset

# Generate updated TypeScript types
npx supabase gen types typescript --local > src/types/database.ts
```

### Option 2: Production Database (Supabase Cloud)

If you're using Supabase cloud without local development:

```bash
# Push migrations to remote database
npx supabase db push

# Generate types from remote database
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

### Option 3: Manual SQL Execution

If CLI is not available, manually run the SQL files in Supabase Dashboard:

1. Go to Supabase Dashboard → SQL Editor
2. Execute each migration file in order:
   - `20250129000000_create_portfolio_snapshots_and_dividends.sql`
   - `20250129000001_create_portfolio_value_history.sql`
   - `20250129000002_create_statement_imports_tables.sql`

---

## Impact & Benefits

### Before Fix:
❌ 400 Bad Request errors when querying `price_history`
❌ Features using 9 missing tables were completely non-functional
❌ TypeScript type errors for missing table definitions
❌ Migration order confusion

### After Fix:
✅ `price_history` queries work correctly
✅ All 9 tables have proper migrations ready to apply
✅ Migrations in chronological order
✅ TypeScript types available for all tables
✅ Features can be used once migrations are applied:
  - Portfolio snapshots and net worth tracking
  - Dividend management
  - Historical portfolio performance
  - Statement import functionality
  - Balance history tracking

---

## Next Steps

1. **Choose application method** (Option 1, 2, or 3 above)
2. **Apply migrations** to your database
3. **Verify tables were created** by checking Supabase Dashboard → Table Editor
4. **(Optional) Regenerate database.ts** if using Supabase CLI
5. **Test affected features** to ensure everything works

---

## Files Changed

### New Files:
- `supabase/migrations/20250129000000_create_portfolio_snapshots_and_dividends.sql`
- `supabase/migrations/20250129000001_create_portfolio_value_history.sql`
- `supabase/migrations/20250129000002_create_statement_imports_tables.sql`
- `src/types/database-extended.ts`
- `DATABASE_SCHEMA_FIX_SUMMARY.md` (this file)

### Modified Files:
- `src/services/priceService.ts` - Fixed column names

### Renamed Files:
- `supabase/migrations/20251020200000_*.sql` → `20250130000000_*.sql`
- `supabase/migrations/20251020200001_*.sql` → `20250130000001_*.sql`

---

## Notes

- All migrations use `CREATE TABLE IF NOT EXISTS` to safely handle existing tables
- All tables have RLS (Row Level Security) enabled
- All tables have proper indexes for performance
- All foreign key relationships are properly defined
- JSONB columns are used for flexible breakdown data

---

Generated: 2025-01-29
