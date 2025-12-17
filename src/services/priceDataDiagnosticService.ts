/**
 * Price Data Diagnostic Service
 *
 * Helps diagnose gaps in historical price data
 */

import { supabase } from '@/lib/supabase';

export interface PriceDataCoverage {
  symbol: string;
  daysOfData: number;
  earliestDate: string | null;
  latestDate: string | null;
  expectedDays: number;
  coveragePercent: number;
  missingDays: number;
}

export class PriceDataDiagnosticService {
  /**
   * Get price data coverage for all symbols in holdings
   */
  static async getDiagnosticReport(userId: string): Promise<{
    data: PriceDataCoverage[] | null;
    error: string | null;
  }> {
    try {
      // Get all unique symbols from holdings
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('symbol')
        .eq('user_id', userId);

      if (holdingsError) throw holdingsError;
      if (!holdings || holdings.length === 0) {
        return { data: [], error: null };
      }

      const uniqueSymbols = Array.from(new Set(holdings.map(h => h.symbol.toUpperCase())));

      // Get price data coverage for each symbol
      const coverageResults: PriceDataCoverage[] = [];

      for (const symbol of uniqueSymbols) {
        const { data: priceData, error: priceError } = await supabase
          .from('price_history')
          .select('price_date')
          .eq('symbol', symbol)
          .order('price_date', { ascending: true });

        if (priceError) {
          console.error(`Error fetching price data for ${symbol}:`, priceError);
          continue;
        }

        const daysOfData = priceData?.length || 0;
        const earliestDate = priceData && priceData.length > 0 ? priceData[0].price_date : null;
        const latestDate = priceData && priceData.length > 0 ? priceData[priceData.length - 1].price_date : null;

        // Calculate expected days (90 days for 3M view, accounting for weekends)
        const expectedDays = 90;
        const coveragePercent = expectedDays > 0 ? (daysOfData / expectedDays) * 100 : 0;
        const missingDays = Math.max(0, expectedDays - daysOfData);

        coverageResults.push({
          symbol,
          daysOfData,
          earliestDate,
          latestDate,
          expectedDays,
          coveragePercent,
          missingDays,
        });
      }

      // Sort by coverage percent (lowest first - most problematic)
      coverageResults.sort((a, b) => a.coveragePercent - b.coveragePercent);

      return { data: coverageResults, error: null };
    } catch (err) {
      console.error('[PriceDataDiagnostic] Error:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to generate diagnostic report',
      };
    }
  }

  /**
   * Get detailed gap information for a specific symbol
   */
  static async getSymbolGaps(symbol: string, daysBack: number = 90): Promise<{
    data: {
      symbol: string;
      totalDays: number;
      daysWithData: number;
      missingDates: string[];
    } | null;
    error: string | null;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get all price data for this symbol
      const { data: priceData, error: priceError } = await supabase
        .from('price_history')
        .select('price_date')
        .eq('symbol', symbol.toUpperCase())
        .gte('price_date', startDate.toISOString().split('T')[0])
        .lte('price_date', endDate.toISOString().split('T')[0])
        .order('price_date', { ascending: true });

      if (priceError) throw priceError;

      const existingDates = new Set(priceData?.map(p => p.price_date) || []);
      const missingDates: string[] = [];

      // Check each day in the range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();

        // Skip weekends (Saturday = 6, Sunday = 0)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        if (!existingDates.has(dateStr)) {
          missingDates.push(dateStr);
        }
      }

      return {
        data: {
          symbol: symbol.toUpperCase(),
          totalDays: daysBack,
          daysWithData: existingDates.size,
          missingDates,
        },
        error: null,
      };
    } catch (err) {
      console.error('[PriceDataDiagnostic] Error getting gaps:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to get symbol gaps',
      };
    }
  }
}
