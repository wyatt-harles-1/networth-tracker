# Transaction-to-Holdings Implementation Notes

## Overview
This implementation connects transaction data to portfolio holdings using FIFO (First In, First Out) lot tracking and integrates live price updates via the Alpha Vantage API.

## Key Features Implemented

### 1. Database Schema Enhancements
- **holding_lots**: Tracks individual purchase lots for FIFO cost basis accounting
- **price_history**: Stores historical price data for all securities
- **price_update_jobs**: Tracks background price update operations

### 2. Transaction-to-Holdings Synchronization
When you add a transaction:
- **Buy transactions** automatically create or update holdings with proper lot tracking
- **Sell transactions** process sales using FIFO methodology and update remaining holdings
- **Dividend transactions** are recorded in the dividends table

### 3. FIFO Lot Tracking
- Each purchase creates a separate lot with original cost basis
- Sells automatically match against oldest lots first
- Tracks realized vs unrealized gains
- Maintains complete audit trail for tax reporting

### 4. Live Price Updates
- Integration with Alpha Vantage API (free tier: 25 calls/day)
- Automatic price fetching for stocks, ETFs, mutual funds, and crypto
- Historical price backfilling (up to 5 years of data)
- Price history storage for accurate performance calculations
- 12-second delay between API calls to respect rate limits

### 5. Manual Price Entry
- Interface for entering prices for private securities
- Supports mutual funds like AGTHX
- Can be used for internal company stock (e.g., Northwestern Mutual)
- Prices are stored in the same price_history table

### 6. Real-Time Portfolio Display
- Portfolio page now uses actual holdings data from database
- Charts show real performance based on portfolio snapshots
- Asset class breakdown reflects actual holdings
- Drill-down view shows accounts and individual holdings

### 7. Dashboard Integration
- NetWorthCard calculates from real account balances
- RecentActivityCard shows actual transactions
- TopGainersLosersCard calculates from real holdings with gains/losses

## Usage Guide

### Adding Transactions
1. Go to the Transactions tab
2. Click "Add" button
3. Select transaction type (e.g., "Buy Stock")
4. Enter ticker symbol, quantity, and price
5. Transaction is automatically synced to create/update holdings

### Updating Prices
**Automatic Updates:**
- Go to Portfolio tab
- Click the refresh icon in the top right
- Prices will update for all holdings (respects API rate limits)

**Manual Price Entry:**
1. Go to Assets tab
2. Click "Manual Price" in Quick Actions
3. Enter ticker symbol, date, and price
4. Price is stored and applied to matching holdings

### Viewing Holdings
- **Portfolio tab**: Shows holdings grouped by asset class
- Expand asset classes to see individual accounts
- Expand accounts to see specific holdings
- Toggle visibility with eye icons

## Technical Details

### FIFO Cost Basis Calculation
```typescript
// When selling 100 shares:
// 1. Find all open lots sorted by purchase date (oldest first)
// 2. Deduct from oldest lot first
// 3. If lot is fully sold, mark as closed
// 4. Continue to next lot if more shares needed
// 5. Calculate realized gain = (sale price - cost basis)
```

### API Rate Limits
- Alpha Vantage Free: 25 requests/day, 5 requests/minute
- System automatically adds 12-second delay between requests
- Failed requests fall back to stored prices

### Price Data Sources
- **alpha_vantage**: Live data from Alpha Vantage API
- **manual**: User-entered prices for private securities
- **twelve_data**: Alternative API (if implemented)
- **yahoo_finance**: Alternative API (if implemented)

## Environment Variables
```env
VITE_ALPHA_VANTAGE_API_KEY=demo  # Replace with your API key
```

To get a free API key:
1. Visit https://www.alphavantage.co/support/#api-key
2. Enter your email
3. Copy the API key
4. Update .env file with your key

## Database Tables

### holding_lots
Tracks individual purchase lots for FIFO accounting.
- Links to holdings, accounts, and transactions
- Stores original quantity and remaining quantity
- Status: 'open' (has remaining shares) or 'closed' (fully sold)

### price_history
Historical price data for securities.
- Unique constraint on (symbol, price_date)
- Stores OHLC data when available
- Data source tracked for transparency

### price_update_jobs
Tracks batch price update operations.
- Useful for monitoring API usage
- Helps debug failed updates
- Records which symbols were updated

## Future Enhancements
1. **Scheduled Price Updates**: Background job to update prices daily
2. **Specific Lot Identification**: Allow users to choose which lots to sell
3. **Average Cost Method**: Alternative to FIFO for mutual funds
4. **Tax Loss Harvesting**: Identify opportunities to realize losses
5. **Performance Attribution**: Break down returns by asset class
6. **Dividend Forecasting**: Predict upcoming dividend payments
7. **Multi-Currency Support**: Handle international holdings

## Troubleshooting

### API Rate Limit Errors
- Error: "API call frequency limit reached"
- Solution: Wait 1 minute before trying again
- Consider upgrading to paid plan for higher limits

### Missing Holdings
- Check that transaction has ticker symbol in metadata
- Verify transaction type is a buy/sell type
- Check account is properly linked

### Incorrect Cost Basis
- Review all buy transactions for the symbol
- Check that quantities and prices are correct
- Verify no duplicate transactions

### Manual Price Not Updating
- Ensure symbol matches exactly (case-insensitive)
- Check that holdings exist with that symbol
- Verify date format is YYYY-MM-DD

## Support
For issues or questions:
1. Check the database migrations were applied successfully
2. Verify transaction_metadata contains required fields
3. Check browser console for JavaScript errors
4. Review Supabase logs for database errors
