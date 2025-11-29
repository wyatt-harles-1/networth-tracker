import { supabase } from '@/lib/supabase';

export interface TickerDirectoryEntry {
  symbol: string;
  name: string;
  asset_type: 'stock' | 'etf' | 'crypto' | 'mutualfund';
  exchange?: string;
  sector?: string;
  industry?: string;
  is_active: boolean;
  data_source:
    | 'alpha_vantage'
    | 'coingecko'
    | 'user_added'
    | 'yahoo_finance'
    | 'manual';
  last_updated: string;
  created_at: string;
}

export interface TickerValidationResult {
  valid: boolean;
  ticker?: TickerDirectoryEntry;
  error?: string;
}

export class TickerDirectoryService {
  static async searchTickers(
    query: string,
    limit: number = 15
  ): Promise<TickerDirectoryEntry[]> {
    if (!query || query.length === 0) {
      return [];
    }

    const upperQuery = query.toUpperCase();

    try {
      const { data, error } = await supabase
        .from('ticker_directory')
        .select('*')
        .or(`symbol.ilike.${upperQuery}%,name.ilike.%${query}%`)
        .eq('is_active', true)
        .order('symbol', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error searching tickers:', error);
        return [];
      }

      const results = data || [];

      results.sort((a, b) => {
        const aSymbolMatch = a.symbol.startsWith(upperQuery);
        const bSymbolMatch = b.symbol.startsWith(upperQuery);

        if (aSymbolMatch && !bSymbolMatch) return -1;
        if (!aSymbolMatch && bSymbolMatch) return 1;

        const aExactMatch = a.symbol === upperQuery;
        const bExactMatch = b.symbol === upperQuery;

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        return a.symbol.localeCompare(b.symbol);
      });

      return results;
    } catch (error) {
      console.error('Failed to search tickers:', error);
      return [];
    }
  }

  static async validateAndAddTicker(
    symbol: string
  ): Promise<TickerValidationResult> {
    try {
      const upperSymbol = symbol.toUpperCase();

      const { data: existing } = await supabase
        .from('ticker_directory')
        .select('*')
        .eq('symbol', upperSymbol)
        .maybeSingle();

      if (existing) {
        return { valid: true, ticker: existing };
      }

      const validationResult = await this.validateTickerViaYahoo(upperSymbol);

      if (!validationResult.valid || !validationResult.ticker) {
        return validationResult;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('ticker_directory')
        .insert(validationResult.ticker)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert validated ticker:', insertError);
        return { valid: false, error: 'Failed to add ticker to directory' };
      }

      return { valid: true, ticker: inserted };
    } catch (error) {
      console.error('Failed to validate ticker:', error);
      return { valid: false, error: 'Failed to validate ticker' };
    }
  }

  private static async validateTickerViaYahoo(
    symbol: string
  ): Promise<TickerValidationResult> {
    try {
      const response = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=5&newsCount=0`
      );

      if (!response.ok) {
        return { valid: false, error: 'Yahoo Finance API error' };
      }

      const data = await response.json();

      if (!data.quotes || data.quotes.length === 0) {
        return { valid: false, error: 'Ticker not found' };
      }

      const exactMatch = data.quotes.find((q: any) => q.symbol === symbol);
      const quote = exactMatch || data.quotes[0];

      if (!quote || !quote.symbol || (!quote.shortname && !quote.longname)) {
        return { valid: false, error: 'Invalid ticker data' };
      }

      let assetType: 'stock' | 'etf' | 'crypto' | 'mutualfund' = 'stock';
      if (quote.quoteType === 'ETF') {
        assetType = 'etf';
      } else if (quote.quoteType === 'MUTUALFUND') {
        assetType = 'mutualfund';
      } else if (quote.quoteType === 'CRYPTOCURRENCY') {
        assetType = 'crypto';
      }

      const ticker: TickerDirectoryEntry = {
        symbol: quote.symbol.toUpperCase(),
        name: quote.shortname || quote.longname || quote.symbol,
        asset_type: assetType,
        exchange: quote.exchDisp || quote.exchange || undefined,
        is_active: true,
        data_source: 'yahoo_finance',
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      return { valid: true, ticker };
    } catch (error) {
      console.error('Yahoo Finance validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate ticker via Yahoo Finance',
      };
    }
  }

  static async seedInitialData(): Promise<{
    success: boolean;
    added: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let added = 0;

    try {
      const [stockResult, cryptoResult] = await Promise.all([
        this.seedStocksFromAlphaVantage(),
        this.seedCryptosFromCoinGecko(),
      ]);

      added = stockResult.added + cryptoResult.added;
      errors.push(...stockResult.errors, ...cryptoResult.errors);

      return { success: true, added, errors };
    } catch (error) {
      console.error('Failed to seed initial data:', error);
      return {
        success: false,
        added,
        errors: [...errors, 'Failed to seed initial data'],
      };
    }
  }

  private static async seedStocksFromAlphaVantage(): Promise<{
    added: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let added = 0;

    try {
      const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'demo';

      const response = await fetch(
        `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${apiKey}`
      );

      if (!response.ok) {
        errors.push('Alpha Vantage API returned an error');
        return { added, errors };
      }

      const csvData = await response.text();
      const lines = csvData.split('\n').slice(1);

      const tickers: Omit<
        TickerDirectoryEntry,
        'created_at' | 'last_updated'
      >[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const [symbol, name, exchange, assetTypeRaw, status] = line.split(',');

        if (!symbol || !name || status !== 'Active') continue;

        let assetType: 'stock' | 'etf' | 'mutualfund' = 'stock';
        if (assetTypeRaw === 'ETF') {
          assetType = 'etf';
        } else if (assetTypeRaw === 'Fund') {
          assetType = 'mutualfund';
        }

        tickers.push({
          symbol: symbol.toUpperCase().trim(),
          name: name.trim(),
          asset_type: assetType,
          exchange: exchange?.trim() || undefined,
          is_active: true,
          data_source: 'alpha_vantage',
        });

        if (tickers.length >= 100) {
          const { error } = await supabase
            .from('ticker_directory')
            .upsert(tickers, { onConflict: 'symbol' });

          if (error) {
            errors.push(`Failed to insert batch: ${error.message}`);
          } else {
            added += tickers.length;
          }

          tickers.length = 0;
        }
      }

      if (tickers.length > 0) {
        const { error } = await supabase
          .from('ticker_directory')
          .upsert(tickers, { onConflict: 'symbol' });

        if (error) {
          errors.push(`Failed to insert final batch: ${error.message}`);
        } else {
          added += tickers.length;
        }
      }

      return { added, errors };
    } catch (error) {
      console.error('Failed to seed stocks:', error);
      return {
        added,
        errors: [...errors, 'Failed to seed stocks from Alpha Vantage'],
      };
    }
  }

  private static async seedCryptosFromCoinGecko(): Promise<{
    added: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let added = 0;

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/list'
      );

      if (!response.ok) {
        errors.push('CoinGecko API returned an error');
        return { added, errors };
      }

      const coins = await response.json();

      if (!Array.isArray(coins)) {
        errors.push('Invalid CoinGecko response format');
        return { added, errors };
      }

      const tickers: Omit<
        TickerDirectoryEntry,
        'created_at' | 'last_updated'
      >[] = coins
        .filter((coin: any) => coin.symbol && coin.name)
        .map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          asset_type: 'crypto' as const,
          exchange: undefined,
          is_active: true,
          data_source: 'coingecko' as const,
        }));

      for (let i = 0; i < tickers.length; i += 100) {
        const batch = tickers.slice(i, i + 100);

        const { error } = await supabase
          .from('ticker_directory')
          .upsert(batch, { onConflict: 'symbol' });

        if (error) {
          errors.push(
            `Failed to insert crypto batch at index ${i}: ${error.message}`
          );
        } else {
          added += batch.length;
        }
      }

      return { added, errors };
    } catch (error) {
      console.error('Failed to seed cryptos:', error);
      return {
        added,
        errors: [...errors, 'Failed to seed cryptos from CoinGecko'],
      };
    }
  }

  static async updateTickerDirectory(
    updateType: 'stocks' | 'crypto' | 'full' = 'full'
  ): Promise<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  }> {
    const { data: job, error: jobError } = await supabase
      .from('ticker_directory_updates')
      .insert({
        update_type: updateType,
        job_status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create update job:', jobError);
      return {
        success: false,
        added: 0,
        updated: 0,
        errors: ['Failed to create update job'],
      };
    }

    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
      if (updateType === 'stocks' || updateType === 'full') {
        const stockResult = await this.seedStocksFromAlphaVantage();
        added += stockResult.added;
        errors.push(...stockResult.errors);
      }

      if (updateType === 'crypto' || updateType === 'full') {
        const cryptoResult = await this.seedCryptosFromCoinGecko();
        added += cryptoResult.added;
        errors.push(...cryptoResult.errors);
      }

      await supabase
        .from('ticker_directory_updates')
        .update({
          job_status: errors.length > 0 ? 'completed' : 'completed',
          completed_at: new Date().toISOString(),
          tickers_added: added,
          tickers_updated: updated,
          error_message: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', job.id);

      return { success: true, added, updated, errors };
    } catch (error) {
      await supabase
        .from('ticker_directory_updates')
        .update({
          job_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', job.id);

      return {
        success: false,
        added,
        updated,
        errors: [
          ...errors,
          error instanceof Error ? error.message : 'Update failed',
        ],
      };
    }
  }

  /**
   * Fetch sector and industry data for a single ticker from Alpha Vantage
   */
  static async fetchTickerSectorData(
    symbol: string
  ): Promise<{
    success: boolean;
    sector?: string;
    industry?: string;
    error?: string;
  }> {
    try {
      const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'demo';
      const response = await fetch(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`
      );

      if (!response.ok) {
        return {
          success: false,
          error: 'Alpha Vantage API returned an error',
        };
      }

      const data = await response.json();

      if (data['Error Message'] || data['Note']) {
        return {
          success: false,
          error: data['Error Message'] || 'API rate limit exceeded',
        };
      }

      if (!data.Symbol) {
        return {
          success: false,
          error: 'No data returned for this symbol',
        };
      }

      return {
        success: true,
        sector: data.Sector || undefined,
        industry: data.Industry || undefined,
      };
    } catch (error) {
      console.error('Failed to fetch sector data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update sector and industry data for a ticker in the database
   */
  static async updateTickerSectorData(
    symbol: string,
    sector: string,
    industry: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('ticker_directory')
        .update({
          sector,
          industry,
          last_updated: new Date().toISOString(),
        })
        .eq('symbol', symbol.toUpperCase());

      if (error) {
        console.error('Failed to update ticker sector data:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update ticker sector data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch and update sector data for multiple tickers
   */
  static async bulkUpdateSectorData(
    symbols: string[]
  ): Promise<{
    success: boolean;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let updated = 0;
    let failed = 0;

    for (const symbol of symbols) {
      // Add delay to respect API rate limits (5 requests per minute for free tier)
      await new Promise((resolve) => setTimeout(resolve, 12000));

      const sectorResult = await this.fetchTickerSectorData(symbol);

      if (!sectorResult.success || !sectorResult.sector) {
        failed++;
        errors.push(`${symbol}: ${sectorResult.error || 'No sector data'}`);
        continue;
      }

      const updateResult = await this.updateTickerSectorData(
        symbol,
        sectorResult.sector,
        sectorResult.industry || ''
      );

      if (!updateResult.success) {
        failed++;
        errors.push(`${symbol}: ${updateResult.error}`);
      } else {
        updated++;
        console.log(
          `Updated ${symbol} - Sector: ${sectorResult.sector}, Industry: ${sectorResult.industry}`
        );
      }
    }

    return {
      success: updated > 0,
      updated,
      failed,
      errors,
    };
  }

  /**
   * Get all unique symbols from user holdings that need sector data
   */
  static async getHoldingsNeedingSectorData(
    userId: string
  ): Promise<{ symbols: string[]; error?: string }> {
    try {
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select('symbol')
        .eq('user_id', userId)
        .gt('quantity', 0);

      if (error) {
        return { symbols: [], error: error.message };
      }

      if (!holdings || holdings.length === 0) {
        return { symbols: [] };
      }

      const uniqueSymbols = [...new Set(holdings.map((h) => h.symbol))];

      // Check which symbols are missing sector data
      const { data: tickersWithSector, error: tickerError } = await supabase
        .from('ticker_directory')
        .select('symbol, sector')
        .in('symbol', uniqueSymbols);

      if (tickerError) {
        return { symbols: [], error: tickerError.message };
      }

      const symbolsNeedingSector = uniqueSymbols.filter((symbol) => {
        const ticker = tickersWithSector?.find((t) => t.symbol === symbol);
        return !ticker || !ticker.sector;
      });

      return { symbols: symbolsNeedingSector };
    } catch (error) {
      console.error('Failed to get holdings needing sector data:', error);
      return {
        symbols: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
