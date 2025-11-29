/**
 * ============================================================================
 * Price Service
 * ============================================================================
 *
 * Fetches real-time and historical price data for stocks, ETFs, and crypto.
 *
 * Data Sources:
 * - Stocks/ETFs: Alpha Vantage API
 * - Cryptocurrency: CoinGecko API (via CryptoPriceService)
 *
 * Features:
 * - Current price fetching for any symbol
 * - Historical price data (OHLC - Open, High, Low, Close)
 * - Automatic crypto detection and routing
 * - Price caching in database
 * - Rate limit handling
 * - Error handling for invalid symbols
 *
 * API Limits:
 * - Alpha Vantage: 5 calls per minute, 500 per day (free tier)
 * - CoinGecko: 50 calls per minute (free tier)
 *
 * Price Data Structure:
 * - symbol: Ticker symbol
 * - price: Current price
 * - date: Price date
 * - source: Data provider (alpha_vantage, coingecko)
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
 * const history = await PriceService.getHistoricalPrices('AAPL', '1M');
 * ```
 *
 * ============================================================================
 */

import { supabase } from '@/lib/supabase';
import { config } from '@/config/env';
import { CryptoPriceService } from './cryptoPriceService';

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
  static async getCurrentPrice(
    symbol: string
  ): Promise<{ data: PriceData | null; error: string | null }> {
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

    try {
      const url = new URL(config.alphaVantage.baseUrl);
      url.searchParams.append('function', 'GLOBAL_QUOTE');
      url.searchParams.append('symbol', symbol);
      url.searchParams.append('apikey', config.alphaVantage.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data['Error Message']) {
        throw new Error(`Invalid symbol: ${symbol}`);
      }

      if (data['Note']) {
        throw new Error(
          'API call frequency limit reached. Please wait a minute and try again.'
        );
      }

      const quote = data['Global Quote'];
      if (!quote || !quote['05. price']) {
        const storedPrice = await this.getLatestStoredPrice(symbol);
        if (storedPrice.data) {
          return storedPrice;
        }
        throw new Error(`No price data available for ${symbol}`);
      }

      const priceData: PriceData = {
        symbol: symbol.toUpperCase(),
        price: parseFloat(quote['05. price']),
        date: quote['07. latest trading day'],
        source: 'alpha_vantage',
      };

      await this.storePriceInHistory(
        symbol,
        priceData.date,
        parseFloat(quote['02. open']),
        parseFloat(quote['03. high']),
        parseFloat(quote['04. low']),
        parseFloat(quote['05. price']),
        parseInt(quote['06. volume']),
        'alpha_vantage'
      );

      return { data: priceData, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch price',
      };
    }
  }

  static async getHistoricalPrices(
    symbol: string,
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<{ data: HistoricalPrice[] | null; error: string | null }> {
    try {
      const url = new URL(config.alphaVantage.baseUrl);
      url.searchParams.append('function', 'TIME_SERIES_DAILY');
      url.searchParams.append('symbol', symbol);
      url.searchParams.append('outputsize', outputSize);
      url.searchParams.append('apikey', config.alphaVantage.apiKey);

      console.log(`[PriceService] Fetching historical prices for ${symbol} from Alpha Vantage...`);

      const response = await fetch(url.toString());
      const data = await response.json();

      // Log the actual response for debugging
      console.log(`[PriceService] API Response for ${symbol}:`, Object.keys(data));

      if (data['Error Message']) {
        console.error(`[PriceService] Alpha Vantage error for ${symbol}:`, data['Error Message']);
        throw new Error(`Invalid symbol: ${symbol}`);
      }

      if (data['Note']) {
        console.warn(`[PriceService] Rate limit warning for ${symbol}:`, data['Note']);
        throw new Error(
          'API call frequency limit reached. Please wait a minute and try again.'
        );
      }

      if (data['Information']) {
        console.warn(`[PriceService] API Information message:`, data['Information']);
        throw new Error(data['Information']);
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        console.error(`[PriceService] No time series data for ${symbol}. Response keys:`, Object.keys(data));
        throw new Error(`No historical data available for ${symbol}`);
      }

      const historicalPrices: HistoricalPrice[] = Object.entries(
        timeSeries
      ).map(([date, prices]: [string, any]) => ({
        date,
        open: parseFloat(prices['1. open']),
        high: parseFloat(prices['2. high']),
        low: parseFloat(prices['3. low']),
        close: parseFloat(prices['4. close']),
        volume: parseInt(prices['5. volume']),
      }));

      console.log(`[PriceService] Successfully fetched ${historicalPrices.length} historical prices for ${symbol}`);

      for (const price of historicalPrices) {
        await this.storePriceInHistory(
          symbol,
          price.date,
          price.open,
          price.high,
          price.low,
          price.close,
          price.volume ?? null,
          'alpha_vantage'
        );
      }

      console.log(`[PriceService] Stored ${historicalPrices.length} prices for ${symbol} in database`);

      return { data: historicalPrices, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch historical prices',
      };
    }
  }

  static async getMutualFundPrice(
    symbol: string
  ): Promise<{ data: PriceData | null; error: string | null }> {
    try {
      const url = new URL(config.alphaVantage.baseUrl);
      url.searchParams.append('function', 'GLOBAL_QUOTE');
      url.searchParams.append('symbol', symbol);
      url.searchParams.append('apikey', config.alphaVantage.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (
        data['Error Message'] ||
        !data['Global Quote'] ||
        !data['Global Quote']['05. price']
      ) {
        const storedPrice = await this.getLatestStoredPrice(symbol);
        if (storedPrice.data) {
          return storedPrice;
        }
        throw new Error(`No price data available for mutual fund ${symbol}`);
      }

      const quote = data['Global Quote'];
      const priceData: PriceData = {
        symbol: symbol.toUpperCase(),
        price: parseFloat(quote['05. price']),
        date: quote['07. latest trading day'],
        source: 'alpha_vantage',
      };

      await this.storePriceInHistory(
        symbol,
        priceData.date,
        parseFloat(quote['05. price']),
        parseFloat(quote['05. price']),
        parseFloat(quote['05. price']),
        parseFloat(quote['05. price']),
        null,
        'alpha_vantage'
      );

      return { data: priceData, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch mutual fund price',
      };
    }
  }

  private static async storePriceInHistory(
    symbol: string,
    date: string,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number | null,
    source: string
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
          volume,
          data_source: source,
        },
        { onConflict: 'symbol,price_date' }
      );
    } catch (err) {
      console.error('Failed to store price in history:', err);
    }
  }

  static async getLatestStoredPrice(
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
        return { data: null, error: 'No stored price found' };
      }

      return {
        data: {
          symbol: data.symbol,
          price: Number(data.close_price),
          date: data.price_date,
          source: data.data_source,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err.message : 'Failed to fetch stored price',
      };
    }
  }

  static async updateHoldingPrices(
    userId: string,
    symbols?: string[]
  ): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let updated = 0;

    try {
      let query = supabase.from('holdings').select('*').eq('user_id', userId);

      if (symbols && symbols.length > 0) {
        query = query.in(
          'symbol',
          symbols.map(s => s.toUpperCase())
        );
      }

      const { data: holdings, error } = await query;

      if (error) throw error;
      if (!holdings || holdings.length === 0) {
        return { success: true, updated: 0, errors: [] };
      }

      const cryptoHoldings = holdings.filter(h =>
        CryptoPriceService.isCryptocurrency(h.symbol)
      );
      const stockHoldings = holdings.filter(
        h => !CryptoPriceService.isCryptocurrency(h.symbol)
      );

      if (cryptoHoldings.length > 0) {
        const cryptoResult = await CryptoPriceService.updateCryptoHoldings(
          userId,
          cryptoHoldings.map(h => h.symbol)
        );
        updated += cryptoResult.updated;
        errors.push(...cryptoResult.errors);
      }

      for (const holding of stockHoldings) {
        await new Promise(resolve => setTimeout(resolve, 12000));

        const priceResult = await this.getCurrentPrice(holding.symbol);

        if (priceResult.error) {
          errors.push(`${holding.symbol}: ${priceResult.error}`);
          continue;
        }

        if (priceResult.data) {
          const newCurrentValue =
            Number(holding.quantity) * priceResult.data.price;

          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              current_price: priceResult.data.price,
              current_value: newCurrentValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', holding.id);

          if (updateError) {
            errors.push(`${holding.symbol}: Failed to update holding`);
          } else {
            updated++;
          }
        }
      }

      return { success: true, updated, errors };
    } catch (err) {
      return {
        success: false,
        updated,
        errors: [
          err instanceof Error ? err.message : 'Failed to update prices',
        ],
      };
    }
  }

  static async storeManualPrice(
    symbol: string,
    date: string,
    price: number,
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('price_history').upsert(
        {
          symbol: symbol.toUpperCase(),
          price_date: date,
          open_price: price,
          high_price: price,
          low_price: price,
          close_price: price,
          volume: null,
          data_source: 'manual',
        },
        { onConflict: 'symbol,price_date' }
      );

      if (error) throw error;

      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', symbol.toUpperCase());

      if (holdingsError) throw holdingsError;

      if (holdings && holdings.length > 0) {
        for (const holding of holdings) {
          const newCurrentValue = Number(holding.quantity) * price;

          await supabase
            .from('holdings')
            .update({
              current_price: price,
              current_value: newCurrentValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', holding.id);
        }
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to store manual price',
      };
    }
  }
}
