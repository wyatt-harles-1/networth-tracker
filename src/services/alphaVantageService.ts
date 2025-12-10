/**
 * ============================================================================
 * Alpha Vantage Service
 * ============================================================================
 *
 * Service for fetching historical price data from Alpha Vantage API.
 *
 * Features:
 * - Historical daily prices (OHLC)
 * - Time series data (up to 20 years)
 * - Stock, ETF support
 *
 * API Limits (Free Tier):
 * - 25 requests per day
 * - 5 requests per minute
 *
 * Usage:
 * ```tsx
 * const prices = await AlphaVantageService.getHistoricalPrices('AAPL', 'compact');
 * ```
 *
 * ============================================================================
 */

import { config } from '@/config/env';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

export interface AlphaVantageHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type AlphaVantageOutputSize = 'compact' | 'full';

export class AlphaVantageService {
  private static readonly API_KEY = config.alphaVantage?.apiKey || import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;

  /**
   * Get historical daily prices
   * @param symbol Stock ticker symbol
   * @param outputSize 'compact' = last 100 days, 'full' = 20+ years
   */
  static async getHistoricalPrices(
    symbol: string,
    outputSize: AlphaVantageOutputSize = 'compact'
  ): Promise<{ data: AlphaVantageHistoricalPrice[] | null; error: string | null }> {
    try {
      if (!this.API_KEY) {
        return {
          data: null,
          error: 'Alpha Vantage API key not configured',
        };
      }

      const url = new URL(ALPHA_VANTAGE_BASE_URL);
      url.searchParams.append('function', 'TIME_SERIES_DAILY');
      url.searchParams.append('symbol', symbol.toUpperCase());
      url.searchParams.append('outputsize', outputSize);
      url.searchParams.append('apikey', this.API_KEY);

      console.log(`[AlphaVantage] Fetching ${outputSize} historical data for ${symbol}`);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data['Error Message']) {
        return {
          data: null,
          error: `Alpha Vantage error: ${data['Error Message']}`,
        };
      }

      if (data['Note']) {
        // Rate limit hit
        return {
          data: null,
          error: 'API rate limit reached. Please try again later.',
        };
      }

      if (data['Information']) {
        // Information message (usually rate limit)
        return {
          data: null,
          error: data['Information'],
        };
      }

      // Parse time series data
      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        return {
          data: null,
          error: `No time series data found for ${symbol}`,
        };
      }

      const prices: AlphaVantageHistoricalPrice[] = [];
      for (const [date, values] of Object.entries(timeSeries)) {
        const dailyData = values as any;
        prices.push({
          date,
          open: parseFloat(dailyData['1. open']),
          high: parseFloat(dailyData['2. high']),
          low: parseFloat(dailyData['3. low']),
          close: parseFloat(dailyData['4. close']),
          volume: parseInt(dailyData['5. volume'], 10),
        });
      }

      // Sort by date ascending (oldest first)
      prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log(`[AlphaVantage] Successfully fetched ${prices.length} price points for ${symbol}`);

      return { data: prices, error: null };
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching data for ${symbol}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch historical prices',
      };
    }
  }

  /**
   * Get company overview (includes sector, industry, etc.)
   */
  static async getCompanyOverview(symbol: string): Promise<{
    data: {
      name?: string;
      sector?: string;
      industry?: string;
      exchange?: string;
      assetType?: string;
    } | null;
    error: string | null;
  }> {
    try {
      if (!this.API_KEY) {
        return {
          data: null,
          error: 'Alpha Vantage API key not configured',
        };
      }

      const url = new URL(ALPHA_VANTAGE_BASE_URL);
      url.searchParams.append('function', 'OVERVIEW');
      url.searchParams.append('symbol', symbol.toUpperCase());
      url.searchParams.append('apikey', this.API_KEY);

      console.log(`[AlphaVantage] Fetching company overview for ${symbol}`);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data['Error Message'] || data['Note'] || data['Information']) {
        return {
          data: null,
          error: data['Error Message'] || data['Note'] || data['Information'],
        };
      }

      if (!data.Symbol) {
        return {
          data: null,
          error: `No overview data found for ${symbol}`,
        };
      }

      return {
        data: {
          name: data.Name,
          sector: data.Sector,
          industry: data.Industry,
          exchange: data.Exchange,
          assetType: data.AssetType,
        },
        error: null,
      };
    } catch (error) {
      console.error(`[AlphaVantage] Error fetching overview for ${symbol}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch company overview',
      };
    }
  }

  /**
   * Validate that the API key is working
   */
  static async validateApiKey(): Promise<boolean> {
    try {
      const result = await this.getHistoricalPrices('IBM', 'compact');
      return result.data !== null && result.data.length > 0;
    } catch {
      return false;
    }
  }
}
