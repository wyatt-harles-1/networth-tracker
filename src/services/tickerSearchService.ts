import { TickerDirectoryService } from './tickerDirectoryService';

export interface TickerSearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto' | 'mutualfund';
  exchange?: string;
}

export class TickerSearchService {
  private static searchCache = new Map<
    string,
    { results: TickerSearchResult[]; timestamp: number }
  >();
  private static cacheExpiry = 5 * 60 * 1000;

  static async searchTickers(query: string): Promise<TickerSearchResult[]> {
    if (!query || query.length === 0) {
      return [];
    }

    const upperQuery = query.toUpperCase();

    const cached = this.searchCache.get(upperQuery);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.results;
    }

    try {
      const directoryResults = await TickerDirectoryService.searchTickers(
        query,
        15
      );

      const results: TickerSearchResult[] = directoryResults.map(ticker => ({
        symbol: ticker.symbol,
        name: ticker.name,
        type: ticker.asset_type,
        exchange: ticker.exchange,
      }));

      this.searchCache.set(upperQuery, {
        results,
        timestamp: Date.now(),
      });

      return results;
    } catch (error) {
      console.error('Ticker search error:', error);
      return [];
    }
  }

  static async validateTicker(symbol: string): Promise<boolean> {
    try {
      const result = await TickerDirectoryService.validateAndAddTicker(symbol);
      return result.valid;
    } catch (error) {
      console.error('Ticker validation error:', error);
      return false;
    }
  }
}
