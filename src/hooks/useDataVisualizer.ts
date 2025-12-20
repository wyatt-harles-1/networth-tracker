/**
 * ============================================================================
 * useDataVisualizer Hook - Historical Price Data Coverage Analysis
 * ============================================================================
 *
 * Custom hook for the Data Visualizer debug tool.
 * Provides symbol coverage statistics, date-quality mapping, and backfill functions.
 *
 * Features:
 * - Symbol list with coverage percentages
 * - Date-by-date quality analysis (real data, interpolated, missing)
 * - Backfill single dates or date ranges
 * - Real-time data refresh
 *
 * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHoldings } from './useHoldings';
import { useToast } from './use-toast';
import { supabase } from '@/lib/supabase';
import { PriceDataDiagnosticService } from '@/services/priceDataDiagnosticService';
import { HistoricalPriceService } from '@/services/historicalPriceService';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Date to local date string (YYYY-MM-DD) without timezone shifts
 */
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is a US market holiday
 */
function isUSMarketHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // New Year's Day (Jan 1 or observed Monday if weekend)
  if (month === 0 && day === 1) return true;
  if (month === 0 && day === 2 && dayOfWeek === 1) return true; // Observed Monday

  // Martin Luther King Jr. Day (3rd Monday of January)
  if (month === 0 && dayOfWeek === 1 && day >= 15 && day <= 21) return true;

  // Presidents' Day (3rd Monday of February)
  if (month === 1 && dayOfWeek === 1 && day >= 15 && day <= 21) return true;

  // Good Friday (Friday before Easter - complex calculation, approximate)
  // Skipping for now as it requires Easter calculation

  // Memorial Day (Last Monday of May)
  if (month === 4 && dayOfWeek === 1 && day >= 25) return true;

  // Juneteenth (June 19 or observed)
  if (month === 5 && day === 19) return true;
  if (month === 5 && day === 20 && dayOfWeek === 1) return true; // Observed Monday

  // Independence Day (July 4 or observed)
  if (month === 6 && day === 4) return true;
  if (month === 6 && day === 3 && dayOfWeek === 5) return true; // Observed Friday
  if (month === 6 && day === 5 && dayOfWeek === 1) return true; // Observed Monday

  // Labor Day (1st Monday of September)
  if (month === 8 && dayOfWeek === 1 && day <= 7) return true;

  // Thanksgiving (4th Thursday of November)
  if (month === 10 && dayOfWeek === 4 && day >= 22 && day <= 28) return true;

  // Christmas (Dec 25 or observed)
  if (month === 11 && day === 25) return true;
  if (month === 11 && day === 24 && dayOfWeek === 5) return true; // Observed Friday
  if (month === 11 && day === 26 && dayOfWeek === 1) return true; // Observed Monday

  return false;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Symbol coverage statistics
 */
export interface SymbolCoverage {
  symbol: string;
  name: string;
  coveragePercent: number;
  daysOfData: number;
  expectedDays: number; // Total days needed in the range
  missingDays: number;
  earliestDate: string;
  latestDate: string;
}

/**
 * Date quality information
 */
export interface DateQuality {
  hasData: boolean;
  quality: number; // 1.0=real, 0.7=interpolated, 0=missing
  price?: number;
  source?: string;
}

/**
 * Bulk backfill progress tracking
 */
export interface BulkBackfillProgress {
  symbol: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * Hook return type
 */
export interface UseDataVisualizerReturn {
  // Symbol management
  symbols: SymbolCoverage[];
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string | null) => void;
  selectedSymbols: string[];
  toggleSymbolSelection: (symbol: string) => void;
  clearSymbolSelection: () => void;

  // Calendar data
  dateQualityMap: Map<string, DateQuality>;
  filteredDateQualityMap: Map<string, DateQuality>;
  dateRange: { start: Date; end: Date } | null;

  // Data source filtering
  selectedSources: string[];
  toggleSourceFilter: (source: string) => void;

  // Actions
  backfillDate: (date: Date) => Promise<void>;
  backfillRange: (startDate: Date, endDate: Date) => Promise<void>;
  bulkBackfill: (startDate: Date, endDate: Date) => Promise<void>;
  refreshData: () => Promise<void>;

  // State
  loading: boolean;
  backfilling: boolean;
  bulkBackfilling: boolean;
  bulkProgress: BulkBackfillProgress[];
  error: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useDataVisualizer(): UseDataVisualizerReturn {
  const { user } = useAuth();
  const { holdings, loading: holdingsLoading } = useHoldings();
  const { toast } = useToast();

  // State
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [symbolStats, setSymbolStats] = useState<SymbolCoverage[]>([]);
  const [dateQualityMap, setDateQualityMap] = useState<Map<string, DateQuality>>(
    new Map()
  );
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [bulkBackfilling, setBulkBackfilling] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkBackfillProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ===== FETCH SYMBOL STATISTICS =====

  /**
   * Fetch coverage statistics for all unique symbols
   */
  const fetchSymbolStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get unique symbols from holdings (exclude CASH)
      const uniqueSymbols = [
        ...new Set(
          holdings
            .filter(h => h.symbol !== 'CASH')
            .map(h => h.symbol)
        ),
      ];

      if (uniqueSymbols.length === 0) {
        setSymbolStats([]);
        setLoading(false);
        return;
      }

      // Get diagnostic report for all symbols
      const { data: diagnostics, error: diagError } = await PriceDataDiagnosticService.getDiagnosticReport(
        user.id
      );

      if (diagError) {
        console.error('Error fetching diagnostics:', diagError);
        setError(diagError);
        setLoading(false);
        return;
      }

      if (!diagnostics || diagnostics.length === 0) {
        setSymbolStats([]);
        setLoading(false);
        return;
      }

      // Build symbol coverage array
      const stats: SymbolCoverage[] = diagnostics.map(diag => {
        const holding = holdings.find(h => h.symbol === diag.symbol);
        return {
          symbol: diag.symbol,
          name: holding?.name || diag.symbol,
          coveragePercent: diag.coveragePercent,
          daysOfData: diag.daysOfData,
          expectedDays: diag.expectedDays,
          missingDays: diag.missingDays,
          earliestDate: diag.earliestDate || '',
          latestDate: diag.latestDate || '',
        };
      });

      // Sort by coverage percentage (lowest first - most gaps)
      stats.sort((a, b) => a.coveragePercent - b.coveragePercent);

      setSymbolStats(stats);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching symbol stats:', err);
      setError('Failed to load symbol statistics');
      setLoading(false);
    }
  }, [user, holdings]);

  // Fetch stats when holdings change
  useEffect(() => {
    if (!holdingsLoading && holdings.length > 0) {
      fetchSymbolStats();
    }
  }, [holdingsLoading, holdings, fetchSymbolStats]);

  // ===== FETCH DATE QUALITY MAP =====

  /**
   * Build date-quality map for selected symbol
   */
  const fetchDateQualityMap = useCallback(async () => {
    if (!selectedSymbol || !user) {
      setDateQualityMap(new Map());
      setDateRange(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Find first transaction date for this symbol
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('transaction_metadata, transaction_date')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: true });

      if (txError) throw txError;

      // Find earliest transaction for this symbol
      let firstTxDate: string | null = null;
      if (transactions) {
        for (const tx of transactions) {
          const metadata = tx.transaction_metadata as any;
          const ticker = metadata?.ticker?.toUpperCase();
          if (ticker === selectedSymbol.toUpperCase()) {
            firstTxDate = tx.transaction_date.split('T')[0];
            break; // Already sorted, so first match is earliest
          }
        }
      }

      // Determine date range from first transaction to today
      const endDate = new Date();
      const startDate = new Date();

      if (firstTxDate) {
        startDate.setTime(new Date(firstTxDate).getTime());
      } else {
        // Fallback: if no transactions found, use 90 days
        startDate.setDate(startDate.getDate() - 90);
      }

      setDateRange({ start: startDate, end: endDate });

      // Fetch all price history for symbol in range
      const { data: priceHistory, error: priceError } = await supabase
        .from('price_history')
        .select('*')
        .eq('symbol', selectedSymbol.toUpperCase())
        .gte('price_date', toLocalDateString(startDate))
        .lte('price_date', toLocalDateString(endDate))
        .order('price_date', { ascending: true });

      if (priceError) throw priceError;

      // Build quality map
      const qualityMap = new Map<string, DateQuality>();
      const priceMap = new Map<string, any>();

      // Store all actual price data
      console.log(`[DataVisualizer] Building quality map for ${selectedSymbol}`);
      console.log(`[DataVisualizer] Fetched ${priceHistory?.length || 0} price records from database`);

      // Log a sample of raw dates from database
      if (priceHistory && priceHistory.length > 0) {
        console.log(`[DataVisualizer] Sample raw dates from DB:`,
          priceHistory.slice(0, 3).map(r => r.price_date)
        );
      }

      (priceHistory || []).forEach(record => {
        // Normalize date format - ensure it's YYYY-MM-DD string
        const normalizedDate = record.price_date.split('T')[0];
        priceMap.set(normalizedDate, record);
        qualityMap.set(normalizedDate, {
          hasData: true,
          quality: 1.0, // Real data
          price: Number(record.close_price),
          source: record.data_source,
        });
      });

      console.log(`[DataVisualizer] Stored ${priceMap.size} dates in priceMap`);

      // Log sample of stored dates
      const sampleDates = Array.from(priceMap.keys()).slice(0, 5);
      console.log(`[DataVisualizer] Sample dates in priceMap:`, sampleDates);

      // Check all business days in range for gaps
      // Work with date strings consistently to avoid timezone issues
      const startDateStr = toLocalDateString(startDate);
      const endDateStr = toLocalDateString(endDate);

      console.log(`[DataVisualizer] Checking date range: ${startDateStr} to ${endDateStr}`);

      // Create a date object for iteration using UTC to keep day-of-week consistent
      const iterDate = new Date(startDateStr + 'T12:00:00Z'); // Use noon UTC to avoid edge cases
      const iterEndDate = new Date(endDateStr + 'T12:00:00Z');

      let missingBusinessDays = 0;
      let weekendDays = 0;
      let holidayDays = 0;

      while (iterDate <= iterEndDate) {
        const dateStr = iterDate.toISOString().split('T')[0];
        const dayOfWeek = iterDate.getUTCDay(); // Use UTC day to match the date string

        // Skip if already have real data
        if (!priceMap.has(dateStr)) {
          // Weekends (expected gaps)
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            qualityMap.set(dateStr, {
              hasData: true,
              quality: 0.7, // Weekend - expected gap
            });
            weekendDays++;
          } else {
            // Check if it's a known US market holiday
            // Create local date for holiday check (holidays are based on local US time)
            const localDate = new Date(dateStr + 'T00:00:00');
            const isHoliday = isUSMarketHoliday(localDate);

            if (isHoliday) {
              qualityMap.set(dateStr, {
                hasData: true,
                quality: 0.7, // Holiday - expected gap
              });
              holidayDays++;
            } else {
              // Business day without data - missing
              qualityMap.set(dateStr, {
                hasData: false,
                quality: 0.0, // Missing data
              });
              missingBusinessDays++;

              // Log first few missing dates for debugging
              if (missingBusinessDays <= 5) {
                console.log(`[DataVisualizer] ⚠️ Missing business day: ${dateStr} (day ${dayOfWeek})`);
                console.log(`[DataVisualizer]    priceMap.has('${dateStr}'): ${priceMap.has(dateStr)}`);
              }
            }
          }
        }

        // Move to next day (add 24 hours in UTC)
        iterDate.setUTCDate(iterDate.getUTCDate() + 1);
      }

      console.log(`[DataVisualizer] Quality map summary:`);
      console.log(`[DataVisualizer]   - Real data: ${priceMap.size} days`);
      console.log(`[DataVisualizer]   - Weekends: ${weekendDays} days`);
      console.log(`[DataVisualizer]   - Holidays: ${holidayDays} days`);
      console.log(`[DataVisualizer]   - Missing business days: ${missingBusinessDays} days`);

      setDateQualityMap(qualityMap);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching date quality map:', err);
      setError('Failed to load price data for symbol');
      setLoading(false);
    }
  }, [selectedSymbol, user]);

  // Fetch quality map when selected symbol changes
  useEffect(() => {
    fetchDateQualityMap();
  }, [fetchDateQualityMap]);

  // ===== BACKFILL ACTIONS =====

  /**
   * Backfill a single date
   */
  const backfillDate = useCallback(
    async (date: Date) => {
      if (!selectedSymbol || !user) return;

      try {
        setBackfilling(true);
        setError(null);

        const dateStr = toLocalDateString(date);
        console.log(`[DataVisualizer] Backfilling ${selectedSymbol} for ${dateStr}`);

        // Use HistoricalPriceService to backfill
        await HistoricalPriceService.backfillHistoricalPrices(
          [selectedSymbol],
          dateStr,
          dateStr
        );

        // Refresh quality map
        await fetchDateQualityMap();
        await fetchSymbolStats();

        toast({
          title: 'Backfill complete',
          description: `Successfully backfilled ${selectedSymbol} for ${dateStr}`,
        });

        setBackfilling(false);
      } catch (err) {
        console.error('Error backfilling date:', err);
        const errorMsg = 'Failed to backfill data for date';
        setError(errorMsg);
        toast({
          title: 'Backfill failed',
          description: errorMsg,
          variant: 'destructive',
        });
        setBackfilling(false);
      }
    },
    [selectedSymbol, user, fetchDateQualityMap, fetchSymbolStats, toast]
  );

  /**
   * Backfill a date range
   */
  const backfillRange = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!selectedSymbol || !user) return;

      try {
        setBackfilling(true);
        setError(null);

        const startStr = toLocalDateString(startDate);
        const endStr = toLocalDateString(endDate);
        console.log(
          `[DataVisualizer] Backfilling ${selectedSymbol} from ${startStr} to ${endStr}`
        );

        // Use HistoricalPriceService to backfill range
        const result = await HistoricalPriceService.backfillHistoricalPrices(
          [selectedSymbol],
          startStr,
          endStr
        );

        console.log('[DataVisualizer] Backfill result:', result);

        // Add a small delay to ensure database writes complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refresh quality map
        console.log('[DataVisualizer] Refreshing calendar data...');
        await fetchDateQualityMap();
        await fetchSymbolStats();
        console.log('[DataVisualizer] Calendar data refreshed');

        toast({
          title: 'Backfill complete',
          description: `${result.pricesAdded} prices added for ${selectedSymbol}. ${result.errors.length > 0 ? 'Some errors occurred.' : ''}`,
        });

        setBackfilling(false);
      } catch (err) {
        console.error('Error backfilling range:', err);
        const errorMsg = 'Failed to backfill data for date range';
        setError(errorMsg);
        toast({
          title: 'Backfill failed',
          description: errorMsg,
          variant: 'destructive',
        });
        setBackfilling(false);
      }
    },
    [selectedSymbol, user, fetchDateQualityMap, fetchSymbolStats, toast]
  );

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    await fetchSymbolStats();
    await fetchDateQualityMap();
  }, [fetchSymbolStats, fetchDateQualityMap]);

  // ===== MULTI-SELECT & BULK OPERATIONS =====

  /**
   * Toggle symbol selection for bulk operations
   */
  const toggleSymbolSelection = useCallback((symbol: string) => {
    setSelectedSymbols(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol);
      } else {
        return [...prev, symbol];
      }
    });
  }, []);

  /**
   * Clear all selected symbols
   */
  const clearSymbolSelection = useCallback(() => {
    setSelectedSymbols([]);
  }, []);

  // ===== DATA SOURCE FILTERING =====

  /**
   * Toggle data source filter
   */
  const toggleSourceFilter = useCallback((source: string) => {
    setSelectedSources(prev => {
      if (prev.includes(source)) {
        return prev.filter(s => s !== source);
      } else {
        return [...prev, source];
      }
    });
  }, []);

  /**
   * Filter date quality map by selected data sources
   */
  const filteredDateQualityMap = useMemo(() => {
    // If no sources selected, show all
    if (selectedSources.length === 0) {
      return dateQualityMap;
    }

    // Filter by selected sources
    const filtered = new Map<string, DateQuality>();
    dateQualityMap.forEach((quality, date) => {
      const source = quality.source || 'Unknown';
      if (selectedSources.includes(source)) {
        filtered.set(date, quality);
      }
    });

    return filtered;
  }, [dateQualityMap, selectedSources]);

  /**
   * Bulk backfill multiple symbols
   */
  const bulkBackfill = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!user || selectedSymbols.length === 0) return;

      try {
        setBulkBackfilling(true);
        setError(null);

        // Initialize progress tracking
        const initialProgress: BulkBackfillProgress[] = selectedSymbols.map(symbol => ({
          symbol,
          status: 'pending' as const,
        }));
        setBulkProgress(initialProgress);

        const startStr = toLocalDateString(startDate);
        const endStr = toLocalDateString(endDate);
        console.log(
          `[DataVisualizer] Bulk backfilling ${selectedSymbols.length} symbols from ${startStr} to ${endStr}`
        );

        // Process each symbol sequentially to avoid rate limiting
        for (let i = 0; i < selectedSymbols.length; i++) {
          const symbol = selectedSymbols[i];

          try {
            // Update progress to processing
            setBulkProgress(prev =>
              prev.map(p =>
                p.symbol === symbol ? { ...p, status: 'processing' as const } : p
              )
            );

            // Backfill this symbol
            await HistoricalPriceService.backfillHistoricalPrices(
              [symbol],
              startStr,
              endStr
            );

            // Update progress to completed
            setBulkProgress(prev =>
              prev.map(p =>
                p.symbol === symbol ? { ...p, status: 'completed' as const } : p
              )
            );

            // Auto-refresh: Update coverage stats after each symbol
            await fetchSymbolStats();

            // If this is the currently selected symbol, refresh its calendar data too
            if (selectedSymbol === symbol) {
              await fetchDateQualityMap();
            }

            // Add a small delay between symbols to avoid rate limiting
            if (i < selectedSymbols.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (err) {
            console.error(`Error backfilling ${symbol}:`, err);

            // Update progress to error
            setBulkProgress(prev =>
              prev.map(p =>
                p.symbol === symbol
                  ? {
                      ...p,
                      status: 'error' as const,
                      error: err instanceof Error ? err.message : 'Unknown error',
                    }
                  : p
              )
            );
          }
        }

        // Show success toast with summary
        const completedCount = bulkProgress.filter(p => p.status === 'completed').length;
        const errorCount = bulkProgress.filter(p => p.status === 'error').length;

        toast({
          title: 'Bulk backfill complete',
          description: `Processed ${selectedSymbols.length} symbols: ${completedCount} succeeded, ${errorCount} failed`,
        });

        setBulkBackfilling(false);
      } catch (err) {
        console.error('Error in bulk backfill:', err);
        const errorMsg = 'Failed to complete bulk backfill operation';
        setError(errorMsg);
        toast({
          title: 'Bulk backfill failed',
          description: errorMsg,
          variant: 'destructive',
        });
        setBulkBackfilling(false);
      }
    },
    [selectedSymbols, user, fetchSymbolStats, fetchDateQualityMap, selectedSymbol, toast, bulkProgress]
  );

  // ===== RETURN =====

  return {
    symbols: symbolStats,
    selectedSymbol,
    setSelectedSymbol,
    selectedSymbols,
    toggleSymbolSelection,
    clearSymbolSelection,
    dateQualityMap,
    filteredDateQualityMap,
    dateRange,
    selectedSources,
    toggleSourceFilter,
    backfillDate,
    backfillRange,
    bulkBackfill,
    refreshData,
    loading: loading || holdingsLoading,
    backfilling,
    bulkBackfilling,
    bulkProgress,
    error,
  };
}
