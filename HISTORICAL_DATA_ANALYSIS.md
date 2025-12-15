# Historical Data Analysis & Gap Fix

## 🎯 Executive Summary

**Good News:** Your historical data architecture is **CORRECT** and **CENTRALIZED**. There is NO issue with multiple data locations.

**The Gap Issue:** Flat lines in your portfolio chart are caused by **missing historical price data** in the `price_history` table, NOT by having data in multiple places.

---

## ✅ Current Architecture (Correct & Centralized)

### Single Source of Truth for Historical Data

Your application uses **ONE centralized location** for each type of historical data:

1. **`price_history` table** - Stores historical PRICE data for individual securities (stocks, ETFs, crypto)
   - Location: Supabase database
   - Columns: `symbol`, `price_date`, `close_price`, `open_price`, `high_price`, `low_price`, `volume`, `data_source`
   - Managed by: `HistoricalPriceService`, `PriceService`

2. **`portfolio_value_history` table** - Stores calculated historical PORTFOLIO VALUE
   - Location: Supabase database
   - Columns: `value_date`, `total_value`, `total_cost_basis`, `cash_value`, `invested_value`, breakdowns
   - Managed by: `PortfolioValueCalculationService`, `useMarketValueHistory` hook

**This is the correct design.** ✅

---

## 🔍 What's Causing the Gaps (Flat Lines)?

### The Flow

```
User views portfolio chart
    ↓
useMarketValueHistory fetches from portfolio_value_history
    ↓
If missing dates, calculates portfolio value for each day
    ↓
PortfolioValueCalculationService needs prices for each holding
    ↓
HistoricalPriceService.getMultipleHistoricalPrices(symbols, date)
    ↓
Tries to get price from price_history table for exact date
    ↓
❌ IF MISSING: Uses interpolation (forward-fill, backward-fill, or linear)
    ↓
Forward-fill = use last known price → FLAT LINE on chart
```

### Root Causes of Gaps

1. **Markets are closed on weekends and holidays**
   - Stock markets don't trade Sat/Sun or holidays
   - For these days, last trading day's price should be used (this is normal)
   - ✅ Your code handles this correctly via forward-fill interpolation

2. **Missing historical price data from API**
   - When you import transactions, historical prices aren't automatically fetched
   - Alpha Vantage has rate limits (5 calls/minute, 25 calls/day on free tier)
   - If price data was never fetched for a date range, gaps occur

3. **Interpolated prices are NOT saved**
   - When a price is missing, the code interpolates it dynamically
   - This interpolated price is NOT saved back to `price_history` table
   - Next time it's needed, it's re-calculated (inefficient)
   - Quality scores track this: 1.0 = real data, 0.7 = forward-fill, 0.5 = linear interpolation

### Example Scenario

You import transactions from Jan 1 - Dec 31, but historical prices were only fetched for:
- Jan 1-31 (fully populated)
- Feb 1-10 (missing Feb 11-28) ← **GAP HERE**
- Mar 1-31 (fully populated)

When calculating portfolio value for Feb 15:
- Uses Feb 10 price (last known) → forward-fill → **flat line from Feb 10-28**

---

## 🛠️ The Fix

### Phase 1: Understand What's Missing

The system already has tools to identify gaps:

```typescript
// Find gaps for a symbol
const gaps = await HistoricalPriceService.findPriceGaps(
  'AAPL',
  '2024-01-01',
  '2024-12-31'
);

// Returns array of gaps:
// [{ symbol: 'AAPL', startDate: '2024-02-11', endDate: '2024-02-28', missingDays: 13 }]
```

### Phase 2: Backfill Missing Data

The system has a built-in backfill function, but it has **rate limit protection**:

```typescript
// Option 1: Smart Sync (respects rate limits, recommended)
const result = await HistoricalPriceService.smartSync(
  userId,
  accountId,
  3,  // Max 3 symbols per run (to respect 5 API calls/minute limit)
  false,  // false = full historical, true = last 7 days only
  (progress) => {
    console.log(`Progress: ${progress.symbol} - ${progress.status}`);
  }
);

// Option 2: Backfill specific symbols (aggressive, may hit rate limits)
const result = await HistoricalPriceService.backfillHistoricalPrices(
  ['AAPL', 'GOOGL', 'MSFT'],
  '2024-01-01',
  '2024-12-31'
);
```

**Important:** Due to Alpha Vantage rate limits (5 calls/minute), backfilling takes time:
- 3 symbols = ~40 seconds (13 second delay between each)
- 10 symbols = ~2 minutes
- 25 symbols = ~5.5 minutes (daily limit on free tier)

### Phase 3: Fill Weekend/Holiday Gaps

**These are NORMAL and expected.** Stock markets are closed on weekends/holidays. The forward-fill interpolation (using Friday's price for Saturday/Sunday) is the correct behavior.

However, if you want smoother charts, you can:

1. **Option A: Accept it** - Flat lines on weekends are normal
2. **Option B: Filter weekends from chart** - Only show trading days
3. **Option C: Save interpolated prices** - Store forward-filled prices in database

---

## 📊 Data Quality Indicators

Your system already tracks data quality, but doesn't show it to users:

| Quality Score | Meaning | Source |
|---|---|---|
| 1.0 | Actual price from database | Real market data |
| 0.7 | Forward-fill or backward-fill | Using nearby data |
| 0.5 | Linear interpolation | Calculated between two points |

**Recommendation:** Show quality indicators on the chart so users understand when data is interpolated.

---

## 🚀 Implementation Steps

### Step 1: Check Current Data Coverage

Create a diagnostic script to see what you have:

```typescript
// In a component or script
import { HistoricalPriceService } from '@/services/historicalPriceService';
import { supabase } from '@/lib/supabase';

async function analyzeCoverage() {
  // Get all unique symbols from holdings
  const { data: holdings } = await supabase
    .from('holdings')
    .select('symbol')
    .eq('user_id', userId);

  const symbols = [...new Set(holdings?.map(h => h.symbol))];

  // Check gaps for each symbol
  for (const symbol of symbols) {
    const gaps = await HistoricalPriceService.findPriceGaps(
      symbol,
      '2024-01-01',  // Or your earliest transaction date
      new Date().toISOString().split('T')[0]
    );

    if (gaps.length > 0) {
      console.log(`${symbol}: ${gaps.length} gap(s), total ${gaps.reduce((sum, g) => sum + g.missingDays, 0)} missing days`);
    } else {
      console.log(`${symbol}: ✅ Complete`);
    }
  }
}
```

### Step 2: Backfill Data Gradually

Due to API rate limits, backfill in batches:

```typescript
// Run this daily to gradually fill gaps
async function dailyBackfill() {
  const result = await HistoricalPriceService.smartSync(
    userId,
    accountId,
    3,  // Only 3 symbols per day (within free tier limit)
    false  // Full historical backfill
  );

  console.log(`Backfilled ${result.symbolsProcessed} symbols, added ${result.totalPricesAdded} prices`);
  console.log(`Remaining: ${result.totalSymbols - result.symbolsProcessed} symbols`);
}
```

### Step 3: Set Up Automated Backfill

Add a button or automated job to gradually fill gaps:

**Option A: Manual Button in UI**
```typescript
// In Portfolio or Settings component
const [backfilling, setBackfilling] = useState(false);

const handleBackfill = async () => {
  setBackfilling(true);
  try {
    const result = await HistoricalPriceService.smartSync(
      user.id,
      accountId,
      3,  // Max 3 symbols
      false,
      (progress) => {
        // Show progress to user
        console.log(progress);
      }
    );

    alert(`Backfilled ${result.symbolsProcessed} symbols. Run again tomorrow to continue.`);
  } finally {
    setBackfilling(false);
  }
};
```

**Option B: Automated Edge Function (runs daily)**
```typescript
// In supabase/functions/daily-price-backfill/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { HistoricalPriceService } from '../_shared/historicalPriceService.ts';

serve(async (req) => {
  // Get all users
  const users = await getUsers();

  for (const user of users) {
    // Backfill 3 symbols per user per day
    await HistoricalPriceService.smartSync(
      user.id,
      user.defaultAccountId,
      3,  // Stay within rate limits
      false
    );

    // Wait between users to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 13000));
  }

  return new Response('Backfill complete');
});
```

---

## 📋 Best Practices to Avoid Gaps in Future

### 1. Fetch Prices When Importing Transactions

When a user imports transactions, automatically trigger price fetching:

```typescript
// In transaction import flow
async function onTransactionsImported(transactions) {
  // Extract unique symbols
  const symbols = [...new Set(transactions.map(t => t.symbol))];

  // Trigger backfill for these symbols
  await HistoricalPriceService.backfillHistoricalPrices(
    symbols.slice(0, 3),  // Limit to respect rate limits
    minDate(transactions),
    maxDate(transactions)
  );

  // Queue remaining symbols for later
  if (symbols.length > 3) {
    // Save to a "pending_backfill" table or job queue
  }
}
```

### 2. Daily Price Updates

Set up a daily cron job (via Supabase Edge Functions or external cron):

```typescript
// Runs daily at market close (e.g., 6 PM ET)
async function dailyPriceUpdate() {
  const today = new Date().toISOString().split('T')[0];

  // Get all symbols from current holdings
  const { data: holdings } = await supabase
    .from('holdings')
    .select('symbol, user_id');

  const uniqueSymbols = [...new Set(holdings?.map(h => h.symbol))];

  // Fetch today's prices for all symbols (within rate limits)
  for (const symbol of uniqueSymbols.slice(0, 25)) {  // Free tier daily limit
    await PriceService.getCurrentPrice(symbol);  // Auto-stores in price_history
    await new Promise(resolve => setTimeout(resolve, 13000));  // Rate limit protection
  }
}
```

### 3. Show Data Quality to Users

Add visual indicators when data is interpolated:

```typescript
// In chart tooltip
const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.[0]) {
    const dataQuality = payload[0].payload.dataQuality;

    return (
      <div>
        <div>Value: {formatCurrency(payload[0].value)}</div>
        {dataQuality < 1.0 && (
          <div className="text-yellow-500">
            ⚠️ {dataQuality === 0.7 ? 'Estimated (weekend/holiday)' : 'Interpolated'}
          </div>
        )}
      </div>
    );
  }
  return null;
};
```

### 4. Notify Users About Gaps

When calculating portfolio value, notify users if data quality is low:

```typescript
const metrics = getPerformanceMetrics();

if (metrics.averageDataQuality < 0.8) {
  showNotification({
    type: 'warning',
    message: 'Some historical price data is missing. Click "Backfill Prices" to improve chart accuracy.'
  });
}
```

---

## 🎬 Quick Fix Action Plan

### Today (Immediate):

1. ✅ **Verify architecture is correct** - Done! It's centralized properly.

2. **Check what data you have:**
   ```bash
   # In Supabase SQL Editor or terminal
   SELECT symbol, COUNT(*) as days, MIN(price_date), MAX(price_date)
   FROM price_history
   GROUP BY symbol
   ORDER BY symbol;
   ```

3. **Identify symbols with gaps:**
   - Use `HistoricalPriceService.findPriceGaps()` for each holding

### This Week:

4. **Run initial backfill** (respecting rate limits):
   - Day 1: Backfill 3 symbols
   - Day 2: Backfill 3 more symbols
   - Continue until all symbols have historical data

5. **Add backfill button to UI** (optional):
   - In Portfolio page settings
   - Shows progress
   - Runs smartSync for 3 symbols

### Ongoing:

6. **Set up daily price updates:**
   - Supabase Edge Function with cron
   - Runs at market close
   - Fetches today's prices for all holdings

7. **Fetch prices on transaction import:**
   - When user imports transactions
   - Automatically queue price fetching for new symbols

---

## 📖 Summary

### What You Asked:
> "I want to make sure all historical data is in the same database together"

### Answer:
✅ **It already is!** All historical data is centralized in your Supabase database:
- `price_history` for individual security prices
- `portfolio_value_history` for calculated portfolio values

### What's Actually Wrong:
❌ **Missing data in `price_history` table** due to:
- Prices never being fetched from API for certain date ranges
- API rate limits preventing bulk backfills
- No automated daily price updates

### The Fix:
1. Use `HistoricalPriceService.smartSync()` to backfill gradually (respects rate limits)
2. Set up daily automated price updates
3. Fetch prices automatically when importing transactions
4. (Optional) Show data quality indicators to users

### How to Avoid in Future:
- Automated daily price updates
- Fetch prices when importing transactions
- Monitor and backfill gaps periodically
- Show users when data is interpolated vs real

---

## 🛠️ Ready-to-Use Code Snippets

See next file: `HISTORICAL_DATA_FIX_IMPLEMENTATION.tsx`

