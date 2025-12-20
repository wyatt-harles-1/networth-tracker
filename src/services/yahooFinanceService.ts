/**
 * ============================================================================
 * Yahoo Finance Service
 * ============================================================================
 *
 * Browser-compatible Yahoo Finance API client using direct HTTP requests.
 *
 * Features:
 * - Real-time stock/ETF/crypto quotes
 * - Historical price data (OHLC)
 * - Asset type detection (stock, ETF, crypto, mutual fund, etc.)
 * - Company information (sector, industry, name)
 * - No API key required
 * - No rate limits (reasonable use)
 *
 * Supported Asset Types:
 * - EQUITY: Individual stocks
 * - ETF: Exchange-traded funds
 * - CRYPTOCURRENCY: Digital currencies
 * - MUTUALFUND: Mutual funds
 * - INDEX: Market indices
 *
 * Usage:
 * ```tsx
 * const quote = await YahooFinanceService.getQuote('AAPL');
 * const history = await YahooFinanceService.getHistoricalPrices('AAPL', '1mo');
 * const assetType = await YahooFinanceService.getAssetType('SPY');
 * ```
 *
 * ============================================================================
 */

import { AssetType } from '@/lib/tickerDetection';
import { config } from '@/config/env';

/**
 * Quote data structure from Yahoo Finance
 */
export interface YahooQuote {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  name?: string;
  exchange?: string;
  quoteType?: string;
  sector?: string;
  industry?: string;
}

/**
 * Historical price data point
 */
export interface YahooHistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  adjClose?: number;
}

/**
 * Time period options for historical data
 */
export type TimePeriod = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max';

export class YahooFinanceService {
  // Use Supabase Edge Function as proxy to bypass CORS
  private static readonly EDGE_FUNCTION_URL = `${config.supabase.url}/functions/v1/yahoo-finance-proxy`;

  /**
   * Map Yahoo Finance quoteType to our AssetType
   */
  private static mapQuoteTypeToAssetType(quoteType: string | undefined): AssetType {
    if (!quoteType) return 'unknown';

    const normalizedType = quoteType.toUpperCase();

    switch (normalizedType) {
      case 'EQUITY':
        return 'stock';
      case 'ETF':
        return 'etf';
      case 'CRYPTOCURRENCY':
        return 'crypto';
      case 'MUTUALFUND':
        return 'mutual_fund';
      case 'OPTION':
        return 'option';
      case 'FUTURE':
      case 'INDEX':
      case 'CURRENCY':
        return 'unknown'; // Not directly supported
      default:
        return 'unknown';
    }
  }

  /**
   * Make request through Supabase Edge Function proxy
   */
  private static async fetchThroughProxy(endpoint: string, params: Record<string, string> = {}): Promise<Response> {
    const url = new URL(this.EDGE_FUNCTION_URL);
    url.searchParams.append('endpoint', endpoint);

    // Add additional query parameters
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    return fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${config.supabase.anonKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get current quote for a symbol
   */
  static async getQuote(symbol: string): Promise<{ data: YahooQuote | null; error: string | null }> {
    try {
      const response = await this.fetchThroughProxy('/v7/finance/quote', {
        symbols: symbol,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.quoteResponse?.result?.[0]) {
        return { data: null, error: `No data found for symbol: ${symbol}` };
      }

      const result = data.quoteResponse.result[0];

      const quote: YahooQuote = {
        symbol: result.symbol,
        price: result.regularMarketPrice ?? 0,
        change: result.regularMarketChange,
        changePercent: result.regularMarketChangePercent,
        volume: result.regularMarketVolume,
        marketCap: result.marketCap,
        name: result.longName || result.shortName,
        exchange: result.exchange,
        quoteType: result.quoteType,
        sector: result.sector,
        industry: result.industry,
      };

      return { data: quote, error: null };
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch quote',
      };
    }
  }

  /**
   * Get historical prices for a symbol with custom date range
   */
  static async getHistoricalPricesByDateRange(
    symbol: string,
    startDate: string | Date,
    endDate: string | Date = new Date()
  ): Promise<{ data: YahooHistoricalPrice[] | null; error: string | null }> {
    try {
      const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
      let end = typeof endDate === 'string' ? new Date(endDate) : endDate;

      // If start and end are the same day, extend end to include the full day
      if (start.toISOString().split('T')[0] === end.toISOString().split('T')[0]) {
        end = new Date(end);
        end.setHours(23, 59, 59, 999); // Set to end of day
      }

      const period2 = Math.floor(end.getTime() / 1000);
      const period1 = Math.floor(start.getTime() / 1000);

      // Ensure period1 is before period2
      if (period1 >= period2) {
        console.error(`[YahooFinance] Invalid date range for ${symbol}:`, {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          period1,
          period2,
        });
        return { data: null, error: 'Invalid date range' };
      }

      console.log(`[YahooFinance] Fetching historical data for ${symbol}:`, {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      const response = await this.fetchThroughProxy(`/v8/finance/chart/${symbol}`, {
        period1: period1.toString(),
        period2: period2.toString(),
        interval: '1d',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.chart?.result?.[0]) {
        return { data: null, error: `No historical data found for symbol: ${symbol}` };
      }

      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      if (!timestamps || !quotes) {
        return { data: null, error: `Invalid data format for symbol: ${symbol}` };
      }

      const prices: YahooHistoricalPrice[] = timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000),
        open: quotes.open[index],
        high: quotes.high[index],
        low: quotes.low[index],
        close: quotes.close[index],
        volume: quotes.volume[index],
        adjClose: result.indicators.adjclose?.[0]?.adjclose?.[index],
      })).filter((price: YahooHistoricalPrice) =>
        price.open !== null && price.close !== null
      );

      return { data: prices, error: null };
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch historical prices',
      };
    }
  }

  /**
   * Get historical prices for a symbol
   */
  static async getHistoricalPrices(
    symbol: string,
    period: TimePeriod = '1mo'
  ): Promise<{ data: YahooHistoricalPrice[] | null; error: string | null }> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(period);

      const period2 = Math.floor(endDate.getTime() / 1000);
      const period1 = Math.floor(startDate.getTime() / 1000);

      // Ensure period1 is before period2
      if (period1 >= period2) {
        console.error(`[YahooFinance] Invalid date range for ${symbol}:`, {
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          period1,
          period2,
        });
        return { data: null, error: 'Invalid date range' };
      }

      console.log(`[YahooFinance] Fetching historical data for ${symbol}:`, {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await this.fetchThroughProxy(`/v8/finance/chart/${symbol}`, {
        period1: period1.toString(),
        period2: period2.toString(),
        interval: '1d',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.chart?.result?.[0]) {
        return { data: null, error: `No historical data found for symbol: ${symbol}` };
      }

      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      if (!timestamps || !quotes) {
        return { data: null, error: `Invalid data format for symbol: ${symbol}` };
      }

      const prices: YahooHistoricalPrice[] = timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000),
        open: quotes.open[index],
        high: quotes.high[index],
        low: quotes.low[index],
        close: quotes.close[index],
        volume: quotes.volume[index],
        adjClose: result.indicators.adjclose?.[0]?.adjclose?.[index],
      })).filter((price: YahooHistoricalPrice) =>
        price.open !== null && price.close !== null
      );

      return { data: prices, error: null };
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch historical prices',
      };
    }
  }

  /**
   * Get asset type for a symbol
   */
  static async getAssetType(symbol: string): Promise<{
    assetType: AssetType;
    quoteType?: string;
    name?: string;
    sector?: string;
    industry?: string;
    exchange?: string;
  }> {
    try {
      const result = await this.getQuote(symbol);

      if (!result.data) {
        return { assetType: 'unknown' };
      }

      return {
        assetType: this.mapQuoteTypeToAssetType(result.data.quoteType),
        quoteType: result.data.quoteType,
        name: result.data.name,
        sector: result.data.sector,
        industry: result.data.industry,
        exchange: result.data.exchange,
      };
    } catch (error) {
      console.error(`Error detecting asset type for ${symbol}:`, error);
      return { assetType: 'unknown' };
    }
  }

  /**
   * Search for symbols by query
   */
  static async search(query: string, limit: number = 10): Promise<{
    data: Array<{
      symbol: string;
      name: string;
      type?: string;
      exchange?: string;
    }> | null;
    error: string | null;
  }> {
    try {
      const response = await this.fetchThroughProxy('/v1/finance/search', {
        q: query,
        quotesCount: limit.toString(),
        newsCount: '0',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.quotes || data.quotes.length === 0) {
        return { data: [], error: null };
      }

      const formatted = data.quotes.map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        type: quote.quoteType,
        exchange: quote.exchange,
      }));

      return { data: formatted, error: null };
    } catch (error) {
      console.error(`Error searching for ${query}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to search',
      };
    }
  }

  /**
   * Validate if a symbol exists
   */
  static async validateSymbol(symbol: string): Promise<boolean> {
    try {
      const result = await this.getQuote(symbol);
      return result.data !== null && result.data.price > 0;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Calculate start date from time period
   */
  private static getStartDate(period: TimePeriod): Date {
    const now = new Date();
    const date = new Date(now);

    switch (period) {
      case '1d':
        date.setDate(date.getDate() - 1);
        break;
      case '5d':
        date.setDate(date.getDate() - 5);
        break;
      case '1mo':
        date.setMonth(date.getMonth() - 1);
        break;
      case '3mo':
        date.setMonth(date.getMonth() - 3);
        break;
      case '6mo':
        date.setMonth(date.getMonth() - 6);
        break;
      case '1y':
        date.setFullYear(date.getFullYear() - 1);
        break;
      case '2y':
        date.setFullYear(date.getFullYear() - 2);
        break;
      case '5y':
        date.setFullYear(date.getFullYear() - 5);
        break;
      case 'max':
        date.setFullYear(date.getFullYear() - 20); // 20 years as max
        break;
    }

    return date;
  }
}
