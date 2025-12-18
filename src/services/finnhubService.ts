/**
 * ============================================================================
 * Finnhub Service
 * ============================================================================
 *
 * Browser-compatible Finnhub API client for financial data.
 *
 * Features:
 * - Real-time stock/ETF quotes
 * - Crypto prices
 * - Company profile (sector, industry, name)
 * - Asset type detection
 * - Free tier: 60 API calls/minute
 * - No CORS issues (direct API access)
 *
 * API Documentation: https://finnhub.io/docs/api
 *
 * Supported Asset Types:
 * - Common Stock
 * - ETF
 * - Crypto
 *
 * Usage:
 * ```tsx
 * const quote = await FinnhubService.getQuote('AAPL');
 * const profile = await FinnhubService.getCompanyProfile('AAPL');
 * const assetType = await FinnhubService.getAssetType('SPY');
 * ```
 *
 * ============================================================================
 */

import { AssetType } from '@/lib/tickerDetection';
import { config } from '@/config/env';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface FinnhubQuote {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

export interface FinnhubCompanyProfile {
  name: string;
  ticker: string;
  exchange?: string;
  industry?: string;
  sector?: string; // Note: Finnhub calls this "finnhubIndustry"
  marketCap?: number;
  shareOutstanding?: number;
  logo?: string;
  weburl?: string;
}

export class FinnhubService {
  private static readonly API_KEY = config.finnhub.apiKey;

  /**
   * Make request to Finnhub API
   */
  private static async fetchFromFinnhub(endpoint: string, params: Record<string, string> = {}): Promise<Response> {
    const url = new URL(endpoint, FINNHUB_BASE_URL);
    url.searchParams.append('token', this.API_KEY);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    return fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Get current quote for a symbol
   */
  static async getQuote(symbol: string): Promise<{ data: FinnhubQuote | null; error: string | null }> {
    try {
      const response = await this.fetchFromFinnhub('/quote', {
        symbol: symbol.toUpperCase(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Finnhub returns { c, h, l, o, pc, t } where c=current, pc=previous close
      if (!data.c || data.c === 0) {
        return { data: null, error: `No quote data found for symbol: ${symbol}` };
      }

      const quote: FinnhubQuote = {
        symbol: symbol.toUpperCase(),
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
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
   * Get company profile (includes name, sector, industry)
   */
  static async getCompanyProfile(symbol: string): Promise<{ data: FinnhubCompanyProfile | null; error: string | null }> {
    try {
      const response = await this.fetchFromFinnhub('/stock/profile2', {
        symbol: symbol.toUpperCase(),
      });

      if (!response.ok) {
        return { data: null, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return { data: null, error: 'Invalid response format (expected JSON)' };
      }

      const data = await response.json();

      // Finnhub returns empty object {} if symbol not found
      if (!data || Object.keys(data).length === 0 || !data.name) {
        return { data: null, error: `No profile found for symbol: ${symbol}` };
      }

      const profile: FinnhubCompanyProfile = {
        name: data.name,
        ticker: data.ticker || symbol.toUpperCase(),
        exchange: data.exchange,
        industry: data.finnhubIndustry,
        sector: data.finnhubIndustry, // Finnhub doesn't separate sector/industry clearly
        marketCap: data.marketCapitalization,
        shareOutstanding: data.shareOutstanding,
        logo: data.logo,
        weburl: data.weburl,
      };

      return { data: profile, error: null };
    } catch (error) {
      // Don't log full error object to avoid console spam
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch company profile';
      return {
        data: null,
        error: errorMsg,
      };
    }
  }

  /**
   * Get asset type by checking symbol type
   */
  static async getAssetType(symbol: string): Promise<{
    assetType: AssetType;
    name?: string;
    sector?: string;
    industry?: string;
    exchange?: string;
  }> {
    try {
      // Try getting company profile first (works for stocks/ETFs)
      const profileResult = await this.getCompanyProfile(symbol);

      if (profileResult.data) {
        // Determine if it's a stock or ETF based on exchange/name patterns
        const name = profileResult.data.name.toLowerCase();
        const exchange = profileResult.data.exchange?.toLowerCase() || '';

        let assetType: AssetType = 'stock';

        // ETF detection patterns
        if (
          name.includes(' etf') ||
          name.includes('exchange traded') ||
          name.includes('ishares') ||
          name.includes('vanguard') ||
          name.includes('spdr') ||
          name.includes('invesco') ||
          name.includes('proshares')
        ) {
          assetType = 'etf';
        }

        return {
          assetType,
          name: profileResult.data.name,
          sector: profileResult.data.sector,
          industry: profileResult.data.industry,
          exchange: profileResult.data.exchange,
        };
      }

      // Try as crypto (Finnhub format: BINANCE:BTCUSDT)
      const cryptoSymbol = symbol.includes(':') ? symbol : `BINANCE:${symbol}USDT`;
      const cryptoQuote = await this.getQuote(cryptoSymbol);

      if (cryptoQuote.data && cryptoQuote.data.price > 0) {
        return {
          assetType: 'crypto',
          name: symbol,
          exchange: 'BINANCE',
        };
      }

      // Not found
      return { assetType: 'unknown' };
    } catch (error) {
      console.error(`Error detecting asset type for ${symbol}:`, error);
      return { assetType: 'unknown' };
    }
  }

  /**
   * Search for symbols
   */
  static async search(query: string): Promise<{
    data: Array<{
      symbol: string;
      name: string;
      type?: string;
      exchange?: string;
    }> | null;
    error: string | null;
  }> {
    try {
      const response = await this.fetchFromFinnhub('/search', {
        q: query,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.result || data.result.length === 0) {
        return { data: [], error: null };
      }

      const formatted = data.result.map((item: any) => ({
        symbol: item.symbol,
        name: item.description,
        type: item.type,
        exchange: item.displaySymbol,
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
   * Get historical candle data (OHLCV)
   * Free tier: Up to 1 year of daily data
   * @param symbol Stock ticker symbol
   * @param from Unix timestamp (seconds) - start date
   * @param to Unix timestamp (seconds) - end date
   * @param resolution D (daily), W (weekly), M (monthly)
   */
  static async getCandles(
    symbol: string,
    from: number,
    to: number,
    resolution: 'D' | 'W' | 'M' = 'D'
  ): Promise<{
    data: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> | null;
    error: string | null;
  }> {
    try {
      // Check if API key is configured
      if (!this.API_KEY) {
        console.warn('[Finnhub] API key not configured, will use Alpha Vantage');
        return {
          data: null,
          error: 'Finnhub API key not configured',
        };
      }

      const response = await this.fetchFromFinnhub('/stock/candle', {
        symbol: symbol.toUpperCase(),
        resolution,
        from: from.toString(),
        to: to.toString(),
      });

      if (!response.ok) {
        return {
          data: null,
          error: `Finnhub API error: HTTP ${response.status}`,
        };
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Try to read the HTML response to see what error Finnhub returned
        const htmlResponse = await response.text();
        const errorPreview = htmlResponse.substring(0, 200);
        console.warn(`[Finnhub] Non-JSON response for ${symbol}:`);
        console.warn(`[Finnhub]   Status: ${response.status} ${response.statusText}`);
        console.warn(`[Finnhub]   Content-Type: ${contentType}`);
        console.warn(`[Finnhub]   Response preview: ${errorPreview}...`);
        console.warn(`[Finnhub]   → Falling back to Alpha Vantage`);
        return {
          data: null,
          error: `Finnhub returned non-JSON response for ${symbol} (status ${response.status})`,
        };
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn(`[Finnhub] JSON parse error for ${symbol}, will fall back to Alpha Vantage`);
        return {
          data: null,
          error: `Failed to parse Finnhub response for ${symbol}`,
        };
      }

      // Check for no data
      if (data.s === 'no_data' || !data.t || data.t.length === 0) {
        console.log(`[Finnhub] No data available for ${symbol}, will fall back to Alpha Vantage`);
        return {
          data: null,
          error: `No historical data available for ${symbol}`,
        };
      }

      // Check for error response
      if (data.s === 'error') {
        console.log(`[Finnhub] API error for ${symbol}, will fall back to Alpha Vantage`);
        return {
          data: null,
          error: `API error for ${symbol}`,
        };
      }

      // Transform to our format
      const candles = data.t.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: data.c[index],
        volume: data.v[index],
      }));

      console.log(`[Finnhub] ✅ Successfully fetched ${candles.length} candles for ${symbol}`);
      return { data: candles, error: null };
    } catch (error) {
      console.error(`[Finnhub] Unexpected error for ${symbol}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch candles',
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
}
