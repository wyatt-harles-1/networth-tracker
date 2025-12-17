import { supabase } from '@/lib/supabase';
import { PriceService } from './priceService';
import { CryptoPriceService } from './cryptoPriceService';

interface HistoricalPriceData {
  date: string;
  price: number;
  source: string;
  quality: number;
}

interface PriceGap {
  symbol: string;
  startDate: string;
  endDate: string;
  missingDays: number;
}

interface AutoFetchProgress {
  symbol: string;
  status: 'pending' | 'fetching' | 'completed' | 'error';
  pricesAdded?: number;
  error?: string;
  current?: number; // Current symbol being processed (1-indexed)
  total?: number; // Total symbols to process
  estimatedTimeRemaining?: number; // Estimated seconds remaining
  overallProgress?: number; // Overall progress percentage (0-100)
}

interface AutoFetchResult {
  success: boolean;
  totalSymbols: number;
  symbolsProcessed: number;
  totalPricesAdded: number;
  errors: string[];
  progress: AutoFetchProgress[];
}

export class HistoricalPriceService {
  /**
   * Smart sync: Only fetches missing historical data, respecting rate limits
   * Designed for Alpha Vantage Free Tier (25 requests/day, 5/minute)
   *
   * @param maxSymbols - Limit how many symbols to fetch per session (default: 3 for free tier)
   * @param onlyRecent - If true, only fetch last 7 days (for daily updates)
   * @param onProgress - Callback for progress updates
   * @param abortSignal - AbortSignal to cancel the operation
   * @param prioritizeRecentDays - Number of recent days to prioritize (overrides onlyRecent if set)
   */
  static async smartSync(
    userId: string,
    accountId: string,
    maxSymbols: number = 3,
    onlyRecent: boolean = false,
    onProgress?: (progress: AutoFetchProgress) => void,
    abortSignal?: AbortSignal,
    prioritizeRecentDays?: number
  ): Promise<AutoFetchResult> {
    const daysToFetch = prioritizeRecentDays || (onlyRecent ? 7 : 365);
    console.log(`\n[HistoricalPrice] 🎯 Starting smart sync (max ${maxSymbols} symbols, fetching last ${daysToFetch} days)`);

    const result: AutoFetchResult = {
      success: true,
      totalSymbols: 0,
      symbolsProcessed: 0,
      totalPricesAdded: 0,
      errors: [],
      progress: [],
    };

    try {
      // Get all unique symbols from transactions
      const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('transaction_metadata, transaction_type')
        .eq('user_id', userId)
        .eq('account_id', accountId);

      if (txnError || !transactions || transactions.length === 0) {
        return result;
      }

      // Extract unique symbols
      const symbols = new Set<string>();
      transactions.forEach((txn) => {
        const meta = txn.transaction_metadata as any;
        if (meta?.ticker) {
          symbols.add(meta.ticker.toUpperCase());
        }
      });

      const uniqueSymbols = Array.from(symbols);
      result.totalSymbols = uniqueSymbols.length;

      console.log(`[HistoricalPrice] 📊 Found ${uniqueSymbols.length} unique symbols`);

      // Calculate date range - prioritize recent data
      const endDate = new Date().toISOString().split('T')[0];
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - daysToFetch);
      const startDate = startDateObj.toISOString().split('T')[0];

      console.log(`[HistoricalPrice] 📅 Date range: ${startDate} to ${endDate} (${daysToFetch} days)`);
      if (prioritizeRecentDays) {
        console.log(`[HistoricalPrice] ✨ Prioritizing recent ${daysToFetch} days for immediate chart improvement`);
      }

      // Find symbols that need data and prioritize by recency
      const symbolsNeedingData: Array<{ symbol: string; latestDate: string | null; missingDays: number }> = [];

      for (const symbol of uniqueSymbols) {
        if (CryptoPriceService.isCryptocurrency(symbol)) {
          continue; // Skip crypto for now
        }

        const gaps = await this.findPriceGaps(symbol, startDate, endDate);
        if (gaps.length > 0) {
          const missingDays = gaps.reduce((sum, g) => sum + g.missingDays, 0);

          // Get the latest date we have for this symbol
          const { data: latestPrice } = await supabase
            .from('price_history')
            .select('price_date')
            .eq('symbol', symbol)
            .order('price_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          const latestDate = latestPrice?.price_date || null;

          console.log(`[HistoricalPrice] ${symbol} needs ${missingDays} days (latest: ${latestDate || 'none'})`);
          symbolsNeedingData.push({ symbol, latestDate, missingDays });
        }
      }

      // PRIORITIZE: Sort by latest date (newest dates first for recent gaps)
      // This backfills from today backwards - fixes visible flat lines first!
      symbolsNeedingData.sort((a, b) => {
        if (a.latestDate === null && b.latestDate === null) return 0;
        if (a.latestDate === null) return 1; // No data = lower priority
        if (b.latestDate === null) return -1;
        return b.latestDate.localeCompare(a.latestDate); // Newer date = higher priority (recent gaps first!)
      });

      console.log(`[HistoricalPrice] 🎯 ${symbolsNeedingData.length} symbols need data (prioritizing recent gaps)`);

      // Limit to maxSymbols to respect rate limits
      const symbolsToFetch = symbolsNeedingData.slice(0, maxSymbols).map(s => s.symbol);
      const remaining = symbolsNeedingData.length - symbolsToFetch.length;

      if (remaining > 0) {
        console.log(`[HistoricalPrice] ⚠️ Limiting to ${maxSymbols} symbols. ${remaining} will be synced next time.`);
      }

      // Fetch data for selected symbols
      const startTime = Date.now();

      for (let i = 0; i < symbolsToFetch.length; i++) {
        // Check if operation was aborted
        if (abortSignal?.aborted) {
          console.log('[HistoricalPrice] ⚠️ Sync operation aborted by user');
          result.errors.push('Operation cancelled by user');
          break;
        }

        const symbol = symbolsToFetch[i];

        // Calculate progress metrics
        const currentProgress = i + 1;
        const totalSymbols = symbolsToFetch.length;
        const overallProgress = (currentProgress / totalSymbols) * 100;

        // Calculate time remaining (2 seconds per symbol with Finnhub for recent data)
        const symbolsRemaining = totalSymbols - currentProgress;
        const estimatedTimeRemaining = symbolsRemaining * 2; // 2 seconds per API call (Finnhub is fast!)

        const progressItem: AutoFetchProgress = {
          symbol,
          status: 'fetching',
          current: currentProgress,
          total: totalSymbols,
          overallProgress: Math.round(overallProgress),
          estimatedTimeRemaining,
        };
        result.progress.push(progressItem);
        if (onProgress) onProgress(progressItem);

        try {
          console.log(`\n[HistoricalPrice] 🔍 Processing ${symbol}...`);

          // Rate limiting: Wait between calls (Finnhub: 1 sec, Alpha Vantage: 13 sec)
          // Since we use Finnhub for recent data, this is much faster!
          if (result.symbolsProcessed > 0) {
            console.log(`[HistoricalPrice] ⏳ Rate limiting - waiting 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Fetch historical prices using hybrid approach
          console.log(`[HistoricalPrice] 🌐 Fetching prices (hybrid: Finnhub for recent, Alpha Vantage for old)...`);
          const fetchResult = await PriceService.getHistoricalPricesHybrid(symbol, startDate, endDate);

          if (fetchResult.error) {
            console.error(`[HistoricalPrice] ❌ ${symbol} - API error:`, fetchResult.error);
            progressItem.status = 'error';
            progressItem.error = fetchResult.error;
            result.errors.push(`${symbol}: ${fetchResult.error}`);
            if (onProgress) onProgress(progressItem);
            continue;
          }

          if (fetchResult.data && fetchResult.data.length > 0) {
            // Filter to date range
            const filteredPrices = fetchResult.data.filter((price) => {
              const priceDate = new Date(price.date);
              const start = new Date(startDate);
              const end = new Date(endDate);
              return priceDate >= start && priceDate <= end;
            });

            console.log(`[HistoricalPrice] ✅ ${symbol} - Added ${filteredPrices.length} prices`);
            progressItem.status = 'completed';
            progressItem.pricesAdded = filteredPrices.length;
            result.totalPricesAdded += filteredPrices.length;
            result.symbolsProcessed++;
            if (onProgress) onProgress(progressItem);
          } else {
            console.warn(`[HistoricalPrice] ⚠️ ${symbol} - No data returned`);
            progressItem.status = 'error';
            progressItem.error = 'No data returned';
            result.errors.push(`${symbol}: No data returned`);
            if (onProgress) onProgress(progressItem);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[HistoricalPrice] ❌ ${symbol} - Exception:`, errorMsg);
          progressItem.status = 'error';
          progressItem.error = errorMsg;
          result.errors.push(`${symbol}: ${errorMsg}`);
          if (onProgress) onProgress(progressItem);
        }
      }

      console.log(`\n[HistoricalPrice] 📊 Smart sync complete!`);
      console.log(`[HistoricalPrice] Processed: ${result.symbolsProcessed}/${symbolsToFetch.length}`);
      console.log(`[HistoricalPrice] Total prices added: ${result.totalPricesAdded}`);

      if (remaining > 0) {
        console.log(`[HistoricalPrice] 💡 Run sync again to fetch remaining ${remaining} symbols`);
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during smart sync';
      console.error('[HistoricalPrice] ❌ Fatal error:', errorMsg);
      result.success = false;
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Automatically fetch historical prices for all symbols in a user's account
   * ⚠️ This method is aggressive and may hit rate limits quickly
   * Consider using smartSync() instead for free tier
   */
  static async autoFetchForAccount(
    userId: string,
    accountId: string,
    daysBack: number = 365,
    onProgress?: (progress: AutoFetchProgress) => void
  ): Promise<AutoFetchResult> {
    console.log(`\n[HistoricalPrice] 🚀 Starting automatic price fetch for account ${accountId}`);
    console.log(`[HistoricalPrice] Looking back ${daysBack} days`);

    const result: AutoFetchResult = {
      success: true,
      totalSymbols: 0,
      symbolsProcessed: 0,
      totalPricesAdded: 0,
      errors: [],
      progress: [],
    };

    try {
      // Step 1: Get all unique symbols from transactions
      const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('transaction_metadata, transaction_type')
        .eq('user_id', userId)
        .eq('account_id', accountId);

      if (txnError) {
        console.error('[HistoricalPrice] ❌ Failed to fetch transactions:', txnError);
        result.success = false;
        result.errors.push(`Failed to fetch transactions: ${txnError.message}`);
        return result;
      }

      if (!transactions || transactions.length === 0) {
        console.log('[HistoricalPrice] ℹ️ No transactions found for this account');
        return result;
      }

      // Extract unique symbols from transaction metadata
      const symbols = new Set<string>();
      transactions.forEach((txn) => {
        const meta = txn.transaction_metadata as any;
        if (meta?.ticker) {
          symbols.add(meta.ticker.toUpperCase());
        }
      });

      const uniqueSymbols = Array.from(symbols);
      result.totalSymbols = uniqueSymbols.length;

      console.log(`[HistoricalPrice] 📊 Found ${uniqueSymbols.length} unique symbols:`, uniqueSymbols.join(', '));

      // Step 2: Calculate date range
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];

      console.log(`[HistoricalPrice] 📅 Date range: ${startDateStr} to ${endDate}`);

      // Step 3: Process each symbol
      for (const symbol of uniqueSymbols) {
        const progressItem: AutoFetchProgress = {
          symbol,
          status: 'pending',
        };
        result.progress.push(progressItem);

        if (onProgress) {
          onProgress(progressItem);
        }

        try {
          console.log(`\n[HistoricalPrice] 🔍 Processing ${symbol}...`);
          progressItem.status = 'fetching';

          // Check if this is a cryptocurrency
          if (CryptoPriceService.isCryptocurrency(symbol)) {
            console.log(`[HistoricalPrice] ⏭️ Skipping ${symbol} - cryptocurrency not yet supported`);
            progressItem.status = 'error';
            progressItem.error = 'Cryptocurrency historical data not yet supported';
            result.errors.push(`${symbol}: Cryptocurrency not yet supported`);
            if (onProgress) onProgress(progressItem);
            continue;
          }

          // Find price gaps
          const gaps = await this.findPriceGaps(symbol, startDateStr, endDate);

          if (gaps.length === 0) {
            console.log(`[HistoricalPrice] ✅ ${symbol} - No gaps found, data is complete`);
            progressItem.status = 'completed';
            progressItem.pricesAdded = 0;
            result.symbolsProcessed++;
            if (onProgress) onProgress(progressItem);
            continue;
          }

          console.log(`[HistoricalPrice] 📈 ${symbol} - Found ${gaps.length} gap(s), total missing: ${gaps.reduce((sum, g) => sum + g.missingDays, 0)} days`);

          // Rate limiting: Wait 13 seconds before API call (5 calls per minute = 12s between calls + 1s buffer)
          console.log(`[HistoricalPrice] ⏳ Rate limiting - waiting 13 seconds before API call...`);
          await new Promise(resolve => setTimeout(resolve, 13000));

          // Fetch historical prices from Alpha Vantage
          console.log(`[HistoricalPrice] 🌐 Fetching from Alpha Vantage...`);
          const fetchResult = await PriceService.getHistoricalPrices(symbol, 'compact');

          if (fetchResult.error) {
            console.error(`[HistoricalPrice] ❌ ${symbol} - API error:`, fetchResult.error);
            progressItem.status = 'error';
            progressItem.error = fetchResult.error;
            result.errors.push(`${symbol}: ${fetchResult.error}`);
            if (onProgress) onProgress(progressItem);
            continue;
          }

          if (fetchResult.data && fetchResult.data.length > 0) {
            // Filter to only prices within our date range
            const filteredPrices = fetchResult.data.filter((price) => {
              const priceDate = new Date(price.date);
              const start = new Date(startDateStr);
              const end = new Date(endDate);
              return priceDate >= start && priceDate <= end;
            });

            console.log(`[HistoricalPrice] ✅ ${symbol} - Added ${filteredPrices.length} historical prices`);
            progressItem.status = 'completed';
            progressItem.pricesAdded = filteredPrices.length;
            result.totalPricesAdded += filteredPrices.length;
            result.symbolsProcessed++;
            if (onProgress) onProgress(progressItem);
          } else {
            console.warn(`[HistoricalPrice] ⚠️ ${symbol} - No data returned from API`);
            progressItem.status = 'error';
            progressItem.error = 'No data returned from API';
            result.errors.push(`${symbol}: No data returned`);
            if (onProgress) onProgress(progressItem);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[HistoricalPrice] ❌ ${symbol} - Exception:`, errorMsg);
          progressItem.status = 'error';
          progressItem.error = errorMsg;
          result.errors.push(`${symbol}: ${errorMsg}`);
          if (onProgress) onProgress(progressItem);
        }
      }

      // Step 4: Final summary
      console.log(`\n[HistoricalPrice] 📊 Auto-fetch complete!`);
      console.log(`[HistoricalPrice] Total symbols: ${result.totalSymbols}`);
      console.log(`[HistoricalPrice] Successfully processed: ${result.symbolsProcessed}`);
      console.log(`[HistoricalPrice] Total prices added: ${result.totalPricesAdded}`);
      console.log(`[HistoricalPrice] Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.warn(`[HistoricalPrice] ⚠️ Some symbols had errors:`, result.errors);
        result.success = result.symbolsProcessed > 0; // Partial success if at least one symbol worked
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during auto-fetch';
      console.error('[HistoricalPrice] ❌ Fatal error:', errorMsg);
      result.success = false;
      result.errors.push(errorMsg);
      return result;
    }
  }

  static async getHistoricalPrice(
    symbol: string,
    date: string
  ): Promise<{ data: HistoricalPriceData | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('price_date', date)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const interpolatedPrice = await this.interpolatePrice(symbol, date);
        if (interpolatedPrice.data) {
          return interpolatedPrice;
        }
        return {
          data: null,
          error: `No price data available for ${symbol} on ${date}`,
        };
      }

      return {
        data: {
          date: data.price_date,
          price: Number(data.close_price),
          source: data.data_source,
          quality: 1.0,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch historical price',
      };
    }
  }

  static async interpolatePrice(
    symbol: string,
    targetDate: string
  ): Promise<{ data: HistoricalPriceData | null; error: string | null }> {
    try {
      const { data: beforeData } = await supabase
        .from('price_history')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .lt('price_date', targetDate)
        .order('price_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: afterData } = await supabase
        .from('price_history')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .gt('price_date', targetDate)
        .order('price_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (beforeData && !afterData) {
        return {
          data: {
            date: targetDate,
            price: Number(beforeData.close_price),
            source: 'interpolated_forward',
            quality: 0.7,
          },
          error: null,
        };
      }

      if (!beforeData && afterData) {
        return {
          data: {
            date: targetDate,
            price: Number(afterData.close_price),
            source: 'interpolated_backward',
            quality: 0.7,
          },
          error: null,
        };
      }

      if (beforeData && afterData) {
        const beforePrice = Number(beforeData.close_price);
        const afterPrice = Number(afterData.close_price);
        const beforeDate = new Date(beforeData.price_date);
        const afterDate = new Date(afterData.price_date);
        const target = new Date(targetDate);

        const totalDays =
          (afterDate.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceStart =
          (target.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
        const ratio = daysSinceStart / totalDays;

        const interpolatedPrice =
          beforePrice + (afterPrice - beforePrice) * ratio;

        return {
          data: {
            date: targetDate,
            price: interpolatedPrice,
            source: 'interpolated_linear',
            quality: 0.5,
          },
          error: null,
        };
      }

      return { data: null, error: 'Insufficient data for interpolation' };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err.message : 'Failed to interpolate price',
      };
    }
  }

  static async backfillHistoricalPrices(
    symbols: string[],
    startDate: string,
    endDate: string = new Date().toISOString().split('T')[0]
  ): Promise<{
    success: boolean;
    symbolsProcessed: number;
    pricesAdded: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let symbolsProcessed = 0;
    let pricesAdded = 0;

    for (const symbol of symbols) {
      try {
        const gaps = await this.findPriceGaps(symbol, startDate, endDate);

        if (gaps.length === 0) {
          symbolsProcessed++;
          continue;
        }

        if (CryptoPriceService.isCryptocurrency(symbol)) {
          errors.push(
            `${symbol}: Cryptocurrency historical data not yet supported`
          );
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 13000));

        const result = await PriceService.getHistoricalPrices(symbol, 'compact');

        if (result.error) {
          errors.push(`${symbol}: ${result.error}`);
          continue;
        }

        if (result.data) {
          const filteredPrices = result.data.filter(price => {
            const priceDate = new Date(price.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return priceDate >= start && priceDate <= end;
          });

          pricesAdded += filteredPrices.length;
        }

        symbolsProcessed++;
      } catch (err) {
        errors.push(
          `${symbol}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return {
      success: errors.length < symbols.length,
      symbolsProcessed,
      pricesAdded,
      errors,
    };
  }

  static async findPriceGaps(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<PriceGap[]> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('price_date')
        .eq('symbol', symbol.toUpperCase())
        .gte('price_date', startDate)
        .lte('price_date', endDate)
        .order('price_date', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [
          {
            symbol,
            startDate,
            endDate,
            missingDays: this.calculateBusinessDays(startDate, endDate),
          },
        ];
      }

      const gaps: PriceGap[] = [];
      const existingDates = new Set(data.map(d => d.price_date));

      const currentDate = new Date(startDate);
      const end = new Date(endDate);
      let gapStart: string | null = null;

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isWeekday =
          currentDate.getDay() !== 0 && currentDate.getDay() !== 6;

        if (isWeekday && !existingDates.has(dateStr)) {
          if (!gapStart) {
            gapStart = dateStr;
          }
        } else if (gapStart) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const gapEnd = prevDate.toISOString().split('T')[0];

          gaps.push({
            symbol,
            startDate: gapStart,
            endDate: gapEnd,
            missingDays: this.calculateBusinessDays(gapStart, gapEnd),
          });
          gapStart = null;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (gapStart) {
        gaps.push({
          symbol,
          startDate: gapStart,
          endDate,
          missingDays: this.calculateBusinessDays(gapStart, endDate),
        });
      }

      return gaps;
    } catch (err) {
      console.error('Failed to find price gaps:', err);
      return [];
    }
  }

  static calculateBusinessDays(startDate: string, endDate: string): number {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  static async getMultipleHistoricalPrices(
    symbols: string[],
    date: string
  ): Promise<Record<string, { price: number; quality: number }>> {
    const prices: Record<string, { price: number; quality: number }> = {};

    const { data, error } = await supabase
      .from('price_history')
      .select('symbol, close_price, data_source')
      .in(
        'symbol',
        symbols.map(s => s.toUpperCase())
      )
      .eq('price_date', date);

    if (!error && data) {
      data.forEach(item => {
        prices[item.symbol] = {
          price: Number(item.close_price),
          quality: 1.0,
        };
      });
    }

    for (const symbol of symbols) {
      if (!prices[symbol.toUpperCase()]) {
        const result = await this.getHistoricalPrice(symbol, date);
        if (result.data) {
          prices[symbol.toUpperCase()] = {
            price: result.data.price,
            quality: result.data.quality,
          };
        }
      }
    }

    return prices;
  }

  static async ensurePriceData(
    symbols: string[],
    dates: string[]
  ): Promise<{ success: boolean; missingCount: number }> {
    let missingCount = 0;

    for (const symbol of symbols) {
      for (const date of dates) {
        const result = await this.getHistoricalPrice(symbol, date);
        if (!result.data) {
          missingCount++;
        }
      }
    }

    return {
      success: missingCount === 0,
      missingCount,
    };
  }

  static async getPriceOnOrBefore(
    symbol: string,
    date: string
  ): Promise<{ data: HistoricalPriceData | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .lte('price_date', date)
        .order('price_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          data: null,
          error: `No price data available for ${symbol} on or before ${date}`,
        };
      }

      return {
        data: {
          date: data.price_date,
          price: Number(data.close_price),
          source: data.data_source,
          quality: 0.8,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch price',
      };
    }
  }
}
