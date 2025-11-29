# Insights Page - Missing Data Requirements

## Overview
This document identifies the missing data fields needed to properly populate all Insights subpages.

---

## Current Schema Analysis

### ✅ What You Already Have:
- `holdings.cost_basis` - Total cost basis for each holding
- `holdings.asset_type` - Type of asset (stock, etf, crypto, etc.)
- `accounts.asset_class_id` - Links to custom asset classes
- `transactions` - Complete transaction history
- `portfolio_snapshots` - Historical portfolio values
- `ticker_directory` - Ticker information with asset_type

---

## Missing Data Fields by Insights Tab

### 1. **Allocations View** - MISSING DATA

#### Sector Diversification
- **Missing**: Sector classification for each holding
- **Current**: No sector field in `holdings` or `ticker_directory`
- **Needed**:
  ```sql
  -- Option 1: Add to ticker_directory
  ALTER TABLE ticker_directory ADD COLUMN sector text;

  -- Option 2: Add to holdings (allows manual override)
  ALTER TABLE holdings ADD COLUMN sector text;
  ```
- **Recommended Sectors**:
  - Technology
  - Healthcare
  - Financial Services
  - Consumer Cyclical
  - Consumer Defensive
  - Industrials
  - Energy
  - Utilities
  - Real Estate
  - Communication Services
  - Basic Materials

#### Tax Vehicle Allocation
- **Missing**: Tax treatment type for accounts
- **Current**: No tax type field in `accounts` table
- **Needed**:
  ```sql
  ALTER TABLE accounts ADD COLUMN tax_type text
    CHECK (tax_type IN ('taxable', 'tax_deferred', 'tax_free'));
  ```
- **Tax Types**:
  - `taxable` - Regular brokerage accounts, checking, savings
  - `tax_deferred` - Traditional 401(k), Traditional IRA, 403(b)
  - `tax_free` - Roth IRA, Roth 401(k), HSA

---

### 2. **Gains Analysis View** - PARTIALLY MISSING

#### Purchase Date & Holding Period
- **Missing**: Purchase/acquisition date for each holding
- **Current**: `holdings` table has no date field
- **Needed**:
  ```sql
  ALTER TABLE holdings ADD COLUMN purchase_date date;
  ALTER TABLE holdings ADD COLUMN holding_period_days integer GENERATED ALWAYS AS
    (CURRENT_DATE - purchase_date) STORED;
  ```
- **Impact**: Without this, cannot determine short-term vs long-term capital gains

#### Historical Cost Basis Tracking
- **Current**: Only tracks current total cost_basis
- **Issue**: If you buy/sell portions, can't track historical cost basis accurately
- **Recommended**: Implement tax lot tracking (see Tax Impact section)

---

### 3. **Performance View** - ✅ MOSTLY COMPLETE

- Portfolio value history from `portfolio_snapshots` ✓
- Can calculate volatility and max drawdown ✓
- **Minor Enhancement**: Add benchmark returns to snapshots for comparison

---

### 4. **Projections View** - MISSING DATA

#### User Demographics
- **Missing**: Age and retirement information
- **Current**: `profiles` table has basic info only
- **Needed**:
  ```sql
  ALTER TABLE profiles
    ADD COLUMN date_of_birth date,
    ADD COLUMN retirement_target_age integer DEFAULT 65,
    ADD COLUMN retirement_goal_amount numeric(15,2);
  ```

#### Contribution Tracking
- **Current**: Can calculate from transaction history ✓
- **Enhancement**: Add monthly contribution tracking

---

### 5. **Tax Impact View** - SIGNIFICANT MISSING DATA

#### Short-Term vs Long-Term Gains
- **Missing**: Purchase date (same as Gains Analysis)
- **Needed**: `holdings.purchase_date` to determine holding period
- **Rule**: < 1 year = short-term (ordinary income tax), ≥ 1 year = long-term (capital gains tax)

#### Tax Lot Tracking (CRITICAL)
- **Missing**: Individual tax lot tracking
- **Current**: Only aggregate cost_basis per holding
- **Problem**: Can't use specific identification, FIFO, or LIFO methods
- **Needed**: New `tax_lots` table:
  ```sql
  CREATE TABLE tax_lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    holding_id uuid REFERENCES holdings NOT NULL,
    purchase_date date NOT NULL,
    quantity numeric(20, 8) NOT NULL,
    cost_basis numeric(15, 2) NOT NULL,
    cost_per_unit numeric(15, 2) NOT NULL,
    purchase_price numeric(15, 2) NOT NULL,
    transaction_id uuid REFERENCES transactions,
    is_sold boolean DEFAULT false,
    sold_date date,
    sold_price numeric(15, 2),
    realized_gain numeric(15, 2),
    created_at timestamptz DEFAULT now()
  );
  ```

#### Account Tax Type
- **Missing**: Same as Allocations View
- **Needed**: `accounts.tax_type` field

---

### 6. **Benchmarks View** - ✅ COMPLETE

- Uses performance data from `portfolio_snapshots` ✓
- Benchmark data is calculated/mocked (will use API in production) ✓

---

## Summary of Required Schema Changes

### 🔴 HIGH PRIORITY (Breaks Functionality)

```sql
-- 1. Add tax type to accounts (for Tax Impact & Allocations)
ALTER TABLE accounts ADD COLUMN tax_type text
  CHECK (tax_type IN ('taxable', 'tax_deferred', 'tax_free'))
  DEFAULT 'taxable';

-- 2. Add purchase date to holdings (for Tax Impact & Gains Analysis)
ALTER TABLE holdings ADD COLUMN purchase_date date;

-- 3. Add sector to ticker_directory (for Allocations)
ALTER TABLE ticker_directory ADD COLUMN sector text;
ALTER TABLE ticker_directory ADD COLUMN industry text;
```

### 🟡 MEDIUM PRIORITY (Enhances Functionality)

```sql
-- 4. Add user demographic data (for Projections)
ALTER TABLE profiles
  ADD COLUMN date_of_birth date,
  ADD COLUMN retirement_target_age integer DEFAULT 65,
  ADD COLUMN retirement_goal_amount numeric(15,2),
  ADD COLUMN monthly_contribution numeric(15,2);

-- 5. Create tax_lots table (for accurate tax tracking)
CREATE TABLE tax_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  holding_id uuid REFERENCES holdings ON DELETE CASCADE NOT NULL,
  purchase_date date NOT NULL,
  quantity numeric(20, 8) NOT NULL,
  cost_basis numeric(15, 2) NOT NULL,
  cost_per_unit numeric(15, 2) NOT NULL,
  purchase_price numeric(15, 2) NOT NULL,
  transaction_id uuid REFERENCES transactions ON DELETE SET NULL,
  is_sold boolean DEFAULT false,
  sold_date date,
  sold_price numeric(15, 2),
  realized_gain numeric(15, 2),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE tax_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax lots" ON tax_lots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax lots" ON tax_lots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX tax_lots_user_id_idx ON tax_lots(user_id);
CREATE INDEX tax_lots_holding_id_idx ON tax_lots(holding_id);
CREATE INDEX tax_lots_purchase_date_idx ON tax_lots(purchase_date);
```

### 🟢 LOW PRIORITY (Nice to Have)

```sql
-- 6. Add sector override to holdings (allows manual sector assignment)
ALTER TABLE holdings ADD COLUMN sector_override text;

-- 7. Add industry to holdings for more granular categorization
ALTER TABLE holdings ADD COLUMN industry text;

-- 8. Add benchmark tracking to portfolio_snapshots
ALTER TABLE portfolio_snapshots
  ADD COLUMN sp500_return numeric(10, 4),
  ADD COLUMN nasdaq_return numeric(10, 4),
  ADD COLUMN bonds_return numeric(10, 4);
```

---

## Implementation Recommendations

### Phase 1: Critical Fields (Implement First)
1. Add `tax_type` to `accounts` table
2. Add `purchase_date` to `holdings` table
3. Add `sector` to `ticker_directory` table

**Impact**: Enables Tax Impact view, Allocations sector breakdown, and basic capital gains tracking

### Phase 2: User Data (Implement Second)
1. Add demographic fields to `profiles` table
2. Update user profile UI to collect age and retirement goals

**Impact**: Enables Projections view with accurate calculations

### Phase 3: Tax Lot Tracking (Implement Third)
1. Create `tax_lots` table
2. Migrate existing holdings to tax lots
3. Update transaction processing to create/update tax lots

**Impact**: Enables accurate tax reporting and specific cost basis methods

---

## Data Population Strategy

### For Existing Data:

1. **Tax Type**:
   - Default all accounts to `'taxable'`
   - Prompt user to categorize accounts in settings
   - Add UI to set tax type when creating/editing accounts

2. **Purchase Date**:
   - Use earliest transaction date for each holding as default
   - Allow user to manually correct if needed
   - Going forward, capture from transactions

3. **Sector**:
   - Fetch from financial data API (Alpha Vantage, Yahoo Finance)
   - Store in `ticker_directory` for all tickers
   - Falls back to "Unknown" if unavailable
   - Allow manual override in `holdings.sector_override`

4. **User Demographics**:
   - Prompt user in onboarding or settings
   - Make optional with sensible defaults (age 35, retire at 65)

---

## UI Changes Needed

### Account Creation/Edit Form
- Add dropdown for "Tax Treatment Type"
  - Options: Taxable, Tax-Deferred (401k/IRA), Tax-Free (Roth/HSA)

### Holdings/Transactions
- Automatically capture purchase date from buy transactions
- For manual holdings, prompt for purchase date

### User Profile/Settings
- Add "Personal Information" section:
  - Date of Birth
  - Retirement Target Age
  - Retirement Savings Goal
  - Expected Monthly Contribution

### Initial Setup Wizard (Optional)
- Add step to collect demographic info
- Add step to categorize existing accounts by tax type

---

## Example Migration File

See the attached migration file: `20250106000000_add_insights_required_fields.sql`

This migration adds all HIGH PRIORITY fields in a single, safe migration.

---

## Testing Checklist

After implementing these changes, verify:

- [ ] Allocations tab shows sector breakdown
- [ ] Allocations tab shows tax vehicle distribution
- [ ] Tax Impact tab calculates short-term vs long-term gains
- [ ] Tax Impact tab shows correct tax vehicle allocation
- [ ] Gains Analysis tab displays purchase dates
- [ ] Projections tab uses real age and retirement data
- [ ] All tabs handle missing data gracefully (don't crash)
- [ ] Existing data migrates correctly with defaults
- [ ] New accounts/holdings capture all required fields

---

## Questions?

If you need help implementing any of these changes, let me know and I can:
1. Create the migration files
2. Update the TypeScript types
3. Modify the UI forms to collect this data
4. Write data migration scripts for existing records
