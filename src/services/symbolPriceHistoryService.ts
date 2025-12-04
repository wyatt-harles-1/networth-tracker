/**
 * ============================================================================
 * Symbol Price History Service
 * ============================================================================
 *
 * Service for fetching historical price data for individual symbols.
 * Used by HoldingDetailModal to display price charts.
 *
 * Features:
 * - Fetch price history from price_history table
 * - Filter by date range
 * - Format data for chart display
 *
 * ============================================================================
 */

import { supabase } from '@/lib/supabase';

interface PriceHistoryPoint {
  price_date: string;
  close_price: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  volume?: number;
}

export class SymbolPriceHistoryService {
  /**
   * Get historical price data for a symbol
   * @param symbol - Stock symbol (e.g., 'AAPL')
   * @param dataPoints - Number of data points to return (accounting for today being added later)
   * @returns Array of price history points
   */
  static async getSymbolPriceHistory(
    symbol: string,
    dataPoints: number
  ): Promise<PriceHistoryPoint[]> {
    try {
      // Get the last N-1 records (since we'll add today's point later)
      // This ensures we get exactly N total points
      const limit = dataPoints - 1;

      console.log(
        `[SymbolPriceHistory] Fetching last ${limit} records for ${symbol} (will add today's point for total of ${dataPoints})`
      );

      const { data, error } = await supabase
        .from('price_history')
        .select(
          'price_date, close_price, open_price, high_price, low_price, volume'
        )
        .eq('symbol', symbol.toUpperCase())
        .order('price_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error(
          `[SymbolPriceHistory] Error fetching ${symbol}:`,
          error
        );
        return [];
      }

      // Reverse to get ascending order
      const sortedData = (data || []).reverse();

      console.log(
        `[SymbolPriceHistory] Fetched ${sortedData.length} price points for ${symbol}`
      );

      return sortedData;
    } catch (err) {
      console.error(
        `[SymbolPriceHistory] Exception fetching ${symbol}:`,
        err
      );
      return [];
    }
  }

  /**
   * Get YTD price history (from January 1 of current year)
   */
  static async getYTDPriceHistory(
    symbol: string
  ): Promise<PriceHistoryPoint[]> {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const days = Math.ceil(
        (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
      );

      return this.getSymbolPriceHistory(symbol, days);
    } catch (err) {
      console.error(
        `[SymbolPriceHistory] Exception fetching YTD for ${symbol}:`,
        err
      );
      return [];
    }
  }

  /**
   * Get the latest price for a symbol
   */
  static async getLatestPrice(symbol: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('close_price')
        .eq('symbol', symbol.toUpperCase())
        .order('price_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.error(
          `[SymbolPriceHistory] Error fetching latest price for ${symbol}:`,
          error
        );
        return null;
      }

      return Number(data.close_price);
    } catch (err) {
      console.error(
        `[SymbolPriceHistory] Exception fetching latest price for ${symbol}:`,
        err
      );
      return null;
    }
  }
}
