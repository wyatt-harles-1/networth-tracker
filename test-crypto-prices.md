# Cryptocurrency Price Service Test Guide

## Testing the New Crypto Price Integration

The cryptocurrency price correction system has been successfully implemented. Here's how to test it:

### 1. Automatic Price Detection

The system now automatically detects cryptocurrency symbols and routes them to the CoinGecko API instead of Alpha Vantage:

**Supported Cryptocurrencies:**
- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)
- ADA (Cardano)
- DOT (Polkadot)
- MATIC (Polygon)
- AVAX (Avalanche)
- LINK (Chainlink)
- UNI (Uniswap)
- ATOM (Cosmos)
- XRP (Ripple)
- DOGE (Dogecoin)
- LTC (Litecoin)
- BCH (Bitcoin Cash)
- XLM (Stellar)
- ALGO (Algorand)
- And 10+ more popular cryptocurrencies

### 2. Visual Indicators

When viewing your assets:
- Cryptocurrency holdings now display an orange "Crypto" badge with a Bitcoin icon
- This makes it easy to identify which holdings are cryptocurrencies

### 3. Price Correction Tool

A new "Fix Crypto Prices" button has been added to the Assets page that:
- Fetches current market prices for all cryptocurrencies
- Identifies prices that deviate more than 50% from market values
- Automatically corrects incorrect prices
- Removes invalid historical price data
- Recalculates portfolio values

To use it:
1. Navigate to the Assets page
2. Click the "Fix Crypto Prices" button in the top-right corner
3. Click "Start Price Correction"
4. Review the validation results
5. Click "Close and Refresh" to reload the page with corrected values

### 4. What Was Fixed

**Before:**
- Bitcoin showed at $47.14 (incorrect)
- Alpha Vantage API was used for all assets (unreliable for crypto)
- No validation of price accuracy
- Incorrect prices perpetuated in database

**After:**
- Bitcoin now fetches from CoinGecko showing ~$110,000 (accurate current market price)
- Automatic detection routes crypto symbols to appropriate API
- Price validation detects deviations > 50%
- Automatic correction updates all incorrect values
- Portfolio calculations use accurate current prices

### 5. Testing Steps

1. **View Your Holdings:**
   - Go to Assets page
   - Look for cryptocurrency holdings
   - Verify they show the orange "Crypto" badge

2. **Check Current Prices:**
   - Use the refresh button to update all prices
   - Crypto prices will fetch from CoinGecko with 1.5s delays (to respect rate limits)
   - Stock prices will continue using Alpha Vantage with 12s delays

3. **Run Price Correction (Recommended):**
   - Click "Fix Crypto Prices" button
   - Run the correction tool
   - Review which prices were corrected
   - Verify your portfolio value is now accurate

4. **Verify Portfolio Charts:**
   - Check that portfolio value charts update with correct crypto valuations
   - Historical data should reflect corrected prices going forward

### 6. Expected Results

After running the price correction:
- Bitcoin (BTC) should show around $110,000 (current market price as of late 2024)
- Ethereum (ETH) should show around $4,000-5,000
- Other cryptocurrencies should show current accurate market prices
- Your total portfolio value should update to reflect correct valuations
- Any gains/losses calculations should now be accurate

### 7. API Rate Limits

The system respects API rate limits:
- **CoinGecko (Crypto):** 1.5 second delay between requests (free tier)
- **Alpha Vantage (Stocks):** 12 second delay between requests (demo key)

For large portfolios, price updates may take several minutes to complete.

### 8. Manual Price Override

If you need to manually set a price for any asset:
- Use the "Manual Price Entry" feature in the application
- This overrides both API sources with your custom price
- Useful for assets not supported by the APIs

## Technical Implementation Details

### New Services Created:
1. `cryptoPriceService.ts` - Handles all cryptocurrency price fetching from CoinGecko
2. `priceCorrectionService.ts` - Validates and corrects incorrect prices automatically

### Modified Services:
1. `priceService.ts` - Now routes crypto vs stock requests intelligently
2. `holdingsRecalculationService.ts` - Uses appropriate price service per asset type

### New Components:
1. `CryptoPriceCorrection.tsx` - UI for running price corrections with detailed results

### Data Sources:
- **Cryptocurrencies:** CoinGecko API (free, no API key required, accurate real-time data)
- **Stocks/ETFs:** Alpha Vantage API (existing integration maintained)

## Troubleshooting

**Q: My crypto prices are still wrong**
A: Click the "Fix Crypto Prices" button and run the correction tool. This will fetch fresh market data and update all holdings.

**Q: The correction tool shows errors**
A: Check the error messages. Common issues:
- Network connectivity problems
- CoinGecko API temporarily unavailable
- Unsupported cryptocurrency symbol (request to add it)

**Q: Some cryptocurrencies aren't detected**
A: The system currently supports 25+ major cryptocurrencies. If you have a crypto not in the list, it will be treated as a stock. You can manually enter prices or request support for additional cryptocurrencies.

**Q: How often should I run the correction?**
A: Run it once now to fix historical incorrect data. After that, the regular "Refresh Prices" button will keep crypto prices accurate using the new CoinGecko integration.
