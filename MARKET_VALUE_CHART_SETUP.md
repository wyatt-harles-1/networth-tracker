# Market Value Line Chart Setup Guide

## Overview
Your NetWorth Tracker now features a sophisticated **Market Value Over Time** line chart in the Portfolio tab. This chart shows your historical portfolio value with detailed breakdowns.

---

## ✅ What's Already Done

1. **MarketValueOverTimeChart Component** - Feature-rich chart with:
   - Beautiful gradient area chart (green for gains, red for losses)
   - Time range selector (1W, 1M, 3M, 6M, 1Y, ALL)
   - Performance metrics (Current Value, Period Change, All-Time High, Total Gain)
   - Interactive tooltips showing market value, cost basis, and gains
   - Refresh button to recalculate
   - Progress tracking during calculation

2. **Database Migration** - Already created at:
   - `supabase/migrations/20251027164900_create_portfolio_value_history.sql`

3. **Code Cleanup** - Removed duplicate simple chart from Portfolio.tsx

---

## 🚀 Setup Steps

### Step 1: Apply Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- This creates the portfolio_value_history table
-- Copy the contents from: supabase/migrations/20251027164900_create_portfolio_value_history.sql

-- Or if using Supabase CLI:
-- The migration should auto-apply when you push to Supabase
```

The migration creates three tables:
1. **portfolio_value_history** - Stores daily portfolio valuations
2. **portfolio_calculation_jobs** - Tracks calculation progress
3. **market_value_snapshots** - For intraday tracking

### Step 2: Calculate Historical Data

1. Open your app and go to the **Portfolio** tab
2. You'll see a "Calculate Portfolio History" button
3. Click it to start the calculation
4. Wait for the progress bar to complete (may take 1-2 minutes depending on data)
5. Once done, the beautiful line chart will appear!

---

## 📊 How It Works

### Data Flow:
```
Transactions → Historical Replay → Portfolio Value History → Chart Display
```

1. **Transaction Replay**: The service replays all your transactions from the earliest date
2. **Price Fetching**: For each day, it fetches historical prices for your holdings
3. **Value Calculation**: Calculates total value, cost basis, gains/losses
4. **Storage**: Saves to `portfolio_value_history` table
5. **Display**: Chart reads from the table and renders beautifully

### What Gets Calculated:
- Total portfolio value per day
- Cost basis per day
- Unrealized gains/losses
- Realized gains (from sells)
- Asset class breakdown
- Individual ticker breakdown
- Data quality score (based on price availability)

---

## 🎯 Features

### Time Range Selector
Choose from 6 time ranges:
- **1W** - Last 7 days
- **1M** - Last 30 days
- **3M** - Last 90 days
- **6M** - Last 180 days
- **1Y** - Last 365 days
- **ALL** - All available history

### Performance Metrics Cards
Displayed above the chart:
1. **Current Value** - Your portfolio's current total value
2. **Period Change** - How much you've gained/lost in selected timeframe (% and $)
3. **All-Time High** - Highest portfolio value ever reached
4. **Total Gain** - Total unrealized + realized gains

### Interactive Tooltip
Hover over any point on the chart to see:
- Exact date
- Market value on that day
- Cost basis on that day
- Total gain (unrealized + realized)

### Refresh Button
Click the refresh icon to recalculate historical values if:
- You've added new transactions
- You want to update with latest prices
- Something looks off

---

## 🔧 Maintenance

### Automatic Updates
The chart automatically updates when:
- New transactions are added
- Holdings are modified
- You manually refresh

### Recalculation
You can recalculate at any time by clicking the refresh button. This will:
1. Find your earliest transaction
2. Replay all transactions day-by-day
3. Fetch historical prices
4. Update the stored values
5. Redraw the chart

### Data Quality
Each day has a **data quality score** (0-1):
- **1.0** = Perfect data, all prices available
- **0.5-0.9** = Good data, most prices available
- **0.0-0.5** = Some missing price data

Days with low quality scores are still calculated but may be less accurate.

---

## 💡 Tips

1. **Initial Setup**: Run calculation once after setting up the migration
2. **New Transactions**: Chart auto-updates, but you can manually refresh
3. **Performance**: Calculation may take longer for portfolios with many transactions over long periods
4. **Historical Prices**: Uses Alpha Vantage (stocks) and CoinGecko (crypto) for historical data

---

## 🐛 Troubleshooting

### "Calculate Portfolio History" button shows up
- **Cause**: No data in `portfolio_value_history` table
- **Solution**: Click the button to run initial calculation

### "No transactions found" message
- **Cause**: No investment transactions with ticker data
- **Solution**: Add transactions in the Transactions tab with stocks/ETFs/crypto

### Chart shows gaps or strange data
- **Cause**: Missing historical price data for some days
- **Solution**: This is normal for weekends/holidays. The chart will interpolate.

### Calculation takes very long
- **Cause**: Many transactions over a long time period
- **Solution**: Be patient! Progress bar will show status. Typically completes in 1-3 minutes.

### Chart not visible after calculation
- **Cause**: Browser cache or state issue
- **Solution**: Refresh the page or check browser console for errors

---

## 📈 What's Next

Optional enhancements you can add:
1. **Automatic Daily Calculation** - Set up a cron job to calculate daily
2. **Comparison Lines** - Add benchmark comparison (S&P 500, etc.)
3. **Cost Basis Line** - Show cost basis line alongside market value
4. **Annotations** - Mark significant events on the chart
5. **Export Chart** - Download chart as image

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Portfolio tab loads without errors
- ✅ MarketValueOverTimeChart appears at the top
- ✅ After clicking "Calculate Portfolio History", progress bar shows
- ✅ Chart displays with your portfolio data
- ✅ Time range buttons work
- ✅ Hovering shows tooltip with details
- ✅ Performance metrics display correctly

---

## Summary

**Your line chart is ready to go!** Just:
1. Apply the database migration (if not already done)
2. Click "Calculate Portfolio History" in the Portfolio tab
3. Enjoy your beautiful historical portfolio visualization!

The chart is production-ready and includes all the features you'd expect from a professional financial app.
