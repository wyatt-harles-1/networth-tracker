/**
 * ============================================================================
 * Price Service
 * ============================================================================
 *
 * Fetches real-time and historical price data for stocks, ETFs, and crypto.
 *
 * Data Sources:
 * - Stocks/ETFs/Crypto: Yahoo Finance API (primary)
 * - Cryptocurrency: CoinGecko API (fallback for crypto)
 *
 * Features:
 * - Current price fetching for any symbol
 * - Historical price data (OHLC - Open, High, Low, Close)
 * - Automatic crypto detection and routing
 * - Price caching in database
 * - No rate limits (Yahoo Finance)
 * - Error handling for invalid symbols
 *
 * API Limits:
 * - Yahoo Finance: No official limits (reasonable use)
 * - CoinGecko: 50 calls per minute (free tier, fallback only)
 *
 * Price Data Structure:
 * - symbol: Ticker symbol
 * - price: Current price
 * - date: Price date
 * - source: Data provider (yahoo_finance, coingecko)
 *
 * Usage:
 * ```tsx
 * // Get current price
 * const { data, error } = await PriceService.getCurrentPrice('AAPL');
 * if (data) {
 *   console.log(`AAPL: $${data.price}`);
 * }
 *
 * // Get historical prices
 * const history = await PriceService.getHistoricalPrices('AAPL', '1mo');
 * ```
 *
 * ============================================================================
 */

import { supabase } from '@/lib/supabase';
import { CryptoPriceService } from './cryptoPriceService';
import { AlphaVantageService, AlphaVantageOutputSize } from './alphaVantageService';

/**
 * Current price data structure
 */
export interface PriceData {
  symbol: string;
  price: number;
  date: string;
  source: string;
}

/**
 * Historical price data structure (OHLC format)
 */
export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export class PriceService {
  /**
   * Get current price for a symbol
   * Uses Finnhub as primary source, falls back to CoinGecko for crypto
   */
  static async getCurrentPrice(
    symbol: string
  ): Promise<{ data: PriceData | null; error: string | null }> {
    try {
      // Try Finnhub first for all symbols
      const { FinnhubService } = await import('./finnhubService');
      const finnhubResult = await FinnhubService.getQuote(symbol);

      if (finnhubResult.data) {
        const priceData: PriceData = {
          symbol: finnhubResult.data.symbol,
          price: finnhubResult.data.price,
          date: new Date().toISOString().split('T')[0],
          source: 'finnhub',
        };

        // Store price in history for caching
        await this.storePriceInHistory(
          symbol,
          priceData.date,
          finnhubResult.data.open || finnhubResult.data.price,
          finnhubResult.data.high || finnhubResult.data.price,
          finnhubResult.data.low || finnhubResult.data.price,
          finnhubResult.data.price,
          undefined,
          'finnhub'
        );

        return { data: priceData, error: null };
      }

      // Fallback to CoinGecko for crypto if Yahoo fails
      if (CryptoPriceService.isCryptocurrency(symbol)) {
        const cryptoResult = await CryptoPriceService.getCurrentPrice(symbol);
        if (cryptoResult.data) {
          return {
            data: {
              symbol: cryptoResult.data.symbol,
              price: cryptoResult.data.price,
              date: cryptoResult.data.lastUpdated.split('T')[0],
              source: 'coingecko',
            },
            error: null,
          };
        }
        return { data: null, error: cryptoResult.error };
      }

      // If all else fails, try to get cached price from database
      const storedPrice = await this.getLatestStoredPrice(symbol);
      if (storedPrice.data) {
        return storedPrice;
      }

      return { data: null, error: finnhubResult.error || `No price data available for ${symbol}` };
    } catch (err) {
      console.error(`Error fetching price for ${symbol}:`, err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch price',
      };
    }
  }

  /**
   * Get historical prices with hybrid API strategy
   * - Uses Finnhub for data within last 1 year (fast, 60 calls/min)
   * - Uses Alpha Vantage for data older than 1 year (slow, 5 calls/min)
   * @param symbol Ticker symbol
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD)
   */
  static async getHistoricalPricesHybrid(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: HistoricalPrice[] | null; error: string | null }> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Determine which API to use based on date range
      const isRecentData = start >= oneYearAgo;

      if (isRecentData) {
        // Use Finnhub for recent data (< 1 year back)
        console.log(`[PriceService] 🚀 Using Finnhub for recent data: ${symbol} (${startDate} to ${endDate})`);

        const { FinnhubService } = await import('./finnhubService');

        const fromTimestamp = Math.floor(start.getTime() / 1000);
        const toTimestamp = Math.floor(end.getTime() / 1000);

        const finnhubResult = await FinnhubService.getCandles(
          symbol,
          fromTimestamp,
          toTimestamp,
          'D'
        );

        if (finnhubResult.data) {
          // Store in database
          console.log(`[PriceService] Storing ${finnhubResult.data.length} Finnhub prices for ${symbol}...`);
          for (const price of finnhubResult.data) {
            await this.storePriceInHistory(
              symbol,
              price.date,
              price.open,
              price.high,
              price.low,
              price.close,
              price.volume,
              'finnhub'
            );
          }

          return {
            data: finnhubResult.data.map(p => ({
              date: p.date,
              open: p.open,
              high: p.high,
              low: p.low,
              close: p.close,
              volume: p.volume,
            })),
            error: null,
          };
        }

        // Finnhub failed, fall back to Alpha Vantage
        console.warn(`[PriceService] Finnhub failed, falling back to Alpha Vantage for ${symbol}`);
      }

      // Use Alpha Vantage for old data or as fallback
      console.log(`[PriceService] 🐌 Using Alpha Vantage for historical data: ${symbol}`);
      return await this.getHistoricalPrices(symbol, 'compact');

    } catch (err) {
      console.error(`[PriceService] Error in hybrid fetch for ${symbol}:`, err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch historical prices',
      };
    }
  }

  /**
   * Get historical prices for a symbol (Alpha Vantage only)
   * @param symbol Ticker symbol
   * @param period Output size ('compact' = last 100 days, 'full' = 20+ years)
   */
  static async getHistoricalPrices(
    symbol: string,
    period: AlphaVantageOutputSize = 'compact'
  ): Promise<{ data: HistoricalPrice[] | null; error: string | null }> {
    try {
      // First, try to get from database cache
      const cachedPrices = await this.getCachedHistoricalPrices(symbol, period);
      if (cachedPrices.data && cachedPrices.data.length > 0) {
        console.log(`[PriceService] Using cached historical data for ${symbol} (${cachedPrices.data.length} points)`);
        return cachedPrices;
      }

      console.log(`[PriceService] Fetching ${period} historical data for ${symbol} from Alpha Vantage`);
      const alphaVantageResult = await AlphaVantageService.getHistoricalPrices(symbol, period);

      if (alphaVantageResult.data) {
        const historicalPrices: HistoricalPrice[] = alphaVantageResult.data.map(item => ({
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        }));

        // Store historical prices in database
        console.log(`[PriceService] Storing ${historicalPrices.length} historical prices for ${symbol}...`);
        for (const price of historicalPrices) {
          await this.storePriceInHistory(
            symbol,
            price.date,
            price.open,
            price.high,
            price.low,
            price.close,
            price.volume,
            'alpha_vantage'
          );
        }

        console.log(`[PriceService] ✅ Successfully stored ${historicalPrices.length} prices for ${symbol}`);
        return { data: historicalPrices, error: null };
      }

      // If Alpha Vantage fails, try to return cached data even if old
      console.warn(`[PriceService] Alpha Vantage failed for ${symbol}: ${alphaVantageResult.error}`);
      const oldCache = await this.getCachedHistoricalPrices(symbol, period, false);
      if (oldCache.data && oldCache.data.length > 0) {
        console.log(`[PriceService] Using old cached data for ${symbol} (${oldCache.data.length} points)`);
        return { ...oldCache, error: 'Using cached data (Alpha Vantage unavailable)' };
      }

      return { data: null, error: alphaVantageResult.error || `No historical data available for ${symbol}` };
    } catch (err) {
      console.error(`[PriceService] Error fetching historical prices for ${symbol}:`, err);

      // Try to return cached data on error
      const oldCache = await this.getCachedHistoricalPrices(symbol, period, false);
      if (oldCache.data && oldCache.data.length > 0) {
        console.log(`[PriceService] Using old cached data after error for ${symbol}`);
        return { ...oldCache, error: 'Using cached data (API error)' };
      }

      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch historical prices',
      };
    }
  }

  /**
   * Get cached historical prices from database
   */
  private static async getCachedHistoricalPrices(
    symbol: string,
    period: AlphaVantageOutputSize,
    requireRecent: boolean = true
  ): Promise<{ data: HistoricalPrice[] | null; error: string | null }> {
    try {
      // Calculate days back based on period
      let daysBack = 100; // compact = last 100 days
      if (period === 'full') {
        daysBack = 7300; // full = 20 years
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];

      let query = supabase
        .from('price_history')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .gte('price_date', startDateStr)
        .order('price_date', { ascending: true });

      // If requiring recent data, only return if we have data from last 7 days
      if (requireRecent) {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const recentDateStr = recentDate.toISOString().split('T')[0];

        const { data: recentCheck } = await supabase
          .from('price_history')
          .select('price_date')
          .eq('symbol', symbol.toUpperCase())
          .gte('price_date', recentDateStr)
          .limit(1)
          .maybeSingle();

        if (!recentCheck) {
          return { data: null, error: 'No recent cached data' };
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        return { data: null, error: 'No cached data found' };
      }

      const historicalPrices: HistoricalPrice[] = data.map(item => ({
        date: item.price_date,
        open: item.open_price,
        high: item.high_price,
        low: item.low_price,
        close: item.close_price,
        volume: item.volume,
      }));

      return { data: historicalPrices, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch cached prices',
      };
    }
  }

  /**
   * Get latest price from database cache
   */
  private static async getLatestStoredPrice(
    symbol: string
  ): Promise<{ data: PriceData | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .order('price_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return { data: null, error: `No cached price found for ${symbol}` };
      }

      return {
        data: {
          symbol: data.symbol,
          price: data.close_price,
          date: data.price_date,
          source: data.data_source || 'cache',
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch stored price',
      };
    }
  }

  /**
   * Store price data in price_history table
   */
  private static async storePriceInHistory(
    symbol: string,
    date: string,
    open: number,
    high: number,
    low: number,
    close: number,
    volume?: number,
    source: string = 'yahoo_finance'
  ): Promise<void> {
    try {
      await supabase.from('price_history').upsert(
        {
          symbol: symbol.toUpperCase(),
          price_date: date,
          open_price: open,
          high_price: high,
          low_price: low,
          close_price: close,
          volume: volume || 0,
          data_source: source,
        },
        {
          onConflict: 'symbol,price_date',
          ignoreDuplicates: false,
        }
      );
    } catch (error) {
      console.error('Error storing price in history:', error);
    }
  }

  /**
   * Update current prices for all holdings belonging to a user
   * Optionally filter by specific symbols
   */
  static async updateHoldingPrices(
    userId: string,
    symbols?: string[]
  ): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }> {
    try {
      console.log(`[PriceService] Updating holding prices for user ${userId}`);

      // Get all holdings for the user (or filter by symbols)
      let query = supabase
        .from('holdings')
        .select('id, symbol, asset_type, quantity')
        .eq('user_id', userId);

      if (symbols && symbols.length > 0) {
        query = query.in('symbol', symbols.map(s => s.toUpperCase()));
      }

      const { data: holdings, error: holdingsError } = await query;

      if (holdingsError) throw holdingsError;
      if (!holdings || holdings.length === 0) {
        console.log('[PriceService] No holdings found to update');
        return { success: true, updated: 0, errors: [] };
      }

      console.log(`[PriceService] Found ${holdings.length} holdings to update`);

      let updated = 0;
      const errors: string[] = [];

      // Update each holding's current price and value
      for (const holding of holdings) {
        try {
          const priceResult = await this.getCurrentPrice(holding.symbol);

          if (priceResult.data) {
            const newPrice = priceResult.data.price;
            const newValue = Number(holding.quantity) * newPrice;

            // Update the holding's current_price and current_value
            const { error: updateError } = await supabase
              .from('holdings')
              .update({
                current_price: newPrice,
                current_value: newValue,
                updated_at: new Date().toISOString(),
              })
              .eq('id', holding.id);

            if (updateError) {
              errors.push(`Failed to update ${holding.symbol}: ${updateError.message}`);
            } else {
              updated++;
              console.log(`[PriceService] ✅ Updated ${holding.symbol} to $${newPrice.toFixed(2)} (value: $${newValue.toFixed(2)})`);
            }
          } else {
            errors.push(`Failed to fetch price for ${holding.symbol}: ${priceResult.error}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Error updating ${holding.symbol}: ${errorMsg}`);
        }
      }

      console.log(`[PriceService] ✅ Price update complete: ${updated}/${holdings.length} holdings updated`);
      if (errors.length > 0) {
        console.warn(`[PriceService] ⚠️ Encountered ${errors.length} errors:`, errors);
      }

      return {
        success: true,
        updated,
        errors,
      };
    } catch (err) {
      console.error('[PriceService] Error updating holding prices:', err);
      return {
        success: false,
        updated: 0,
        errors: [err instanceof Error ? err.message : 'Failed to update holding prices'],
      };
    }
  }

  /**
   * Store a manual price for a symbol
   * Useful for adding historical prices or fixing missing data
   */
  static async storeManualPrice(
    symbol: string,
    date: string,
    price: number,
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      await this.storePriceInHistory(
        symbol,
        date,
        price,
        price,
        price,
        price,
        0,
        'manual'
      );

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to store manual price',
      };
    }
  }
}
