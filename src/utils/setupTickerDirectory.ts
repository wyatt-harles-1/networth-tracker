import { supabase } from '@/lib/supabase';

/**
 * One-time setup script to create ticker_directory table and seed with common tickers
 * Run this from the browser console: setupTickerDirectory()
 */
export async function setupTickerDirectory() {
  try {
    console.log('Setting up ticker directory...');

    // First, try to create the table using the SQL
    // Note: This might fail if you don't have the right permissions
    // In that case, you'll need to run the migration in Supabase Dashboard SQL Editor

    // Insert some common tickers to get started
    const commonTickers = [
      // Popular Stocks
      { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'TSLA', name: 'Tesla Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'META', name: 'Meta Platforms Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', asset_type: 'stock', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'V', name: 'Visa Inc.', asset_type: 'stock', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'WMT', name: 'Walmart Inc.', asset_type: 'stock', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'DIS', name: 'The Walt Disney Company', asset_type: 'stock', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'NFLX', name: 'Netflix Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'ADBE', name: 'Adobe Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'CRM', name: 'Salesforce Inc.', asset_type: 'stock', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'ORCL', name: 'Oracle Corporation', asset_type: 'stock', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'CSCO', name: 'Cisco Systems Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'INTC', name: 'Intel Corporation', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'BA', name: 'The Boeing Company', asset_type: 'stock', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'CRWD', name: 'CrowdStrike Holdings Inc.', asset_type: 'stock', exchange: 'NASDAQ', data_source: 'manual' },

      // Popular ETFs
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', asset_type: 'etf', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', asset_type: 'etf', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', asset_type: 'etf', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', asset_type: 'etf', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'IWM', name: 'iShares Russell 2000 ETF', asset_type: 'etf', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', asset_type: 'etf', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'GLD', name: 'SPDR Gold Shares', asset_type: 'etf', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', asset_type: 'etf', exchange: 'NASDAQ', data_source: 'manual' },
      { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', asset_type: 'etf', exchange: 'NYSE', data_source: 'manual' },
      { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund', asset_type: 'etf', exchange: 'NYSE', data_source: 'manual' },

      // Popular Cryptocurrencies
      { symbol: 'BTC', name: 'Bitcoin', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'ETH', name: 'Ethereum', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'BNB', name: 'Binance Coin', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'SOL', name: 'Solana', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'ADA', name: 'Cardano', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'DOGE', name: 'Dogecoin', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'XRP', name: 'Ripple', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'DOT', name: 'Polkadot', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'MATIC', name: 'Polygon', asset_type: 'crypto', data_source: 'manual' },
      { symbol: 'AVAX', name: 'Avalanche', asset_type: 'crypto', data_source: 'manual' },
    ];

    console.log(`Inserting ${commonTickers.length} common tickers...`);

    const { data, error } = await supabase
      .from('ticker_directory')
      .upsert(commonTickers, { onConflict: 'symbol' })
      .select();

    if (error) {
      console.error('Error inserting tickers:', error);
      throw error;
    }

    console.log(`✅ Successfully added ${data?.length || 0} tickers to the directory!`);
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}

// Make it available globally in dev mode
if (import.meta.env.DEV) {
  (window as any).setupTickerDirectory = setupTickerDirectory;
}
