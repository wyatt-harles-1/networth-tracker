/**
 * ============================================================================
 * useMarketValueHistory Hook - Portfolio Value Over Time
 * ============================================================================
 *
 * Manages historical portfolio market value data for charting and analysis.
 * Integrates with PortfolioValueCalculationService to calculate daily portfolio
 * snapshots from transaction history.
 *
 * Key Features:
 * - Fetches historical portfolio value data from database
 * - Calculates missing historical values from transactions
 * - Real-time updates via Supabase subscriptions
 * - Progress tracking for long-running calculations
 * - Performance metrics (gains, highs, lows)
 * - Asset class and ticker breakdowns
 *
 * How It Works:
 * 1. Fetches existing historical data from portfolio_value_history table
 * 2. If no data exists, triggers calculation from transaction history
 * 3. PortfolioValueCalculationService iterates through each day:
 *    - Applies all transactions up to that date
 *    - Fetches historical prices for each holding
 *    - Calculates portfolio value, gains, breakdowns
 * 4. Saves daily snapshots to database for fast future lookups
 *
 * Data Structure:
 * Each historical data point includes:
 * - Total portfolio value
 * - Cost basis
 * - Cash vs invested value
 * - Unrealized and realized gains
 * - Asset class breakdown
 * - Ticker-level breakdown
 * - Data quality score
 *
 * Usage:
 * ```tsx
 * const {
 *   history,
 *   loading,
 *   calculateHistoricalValues,
 *   getPerformanceMetrics
 * } = useMarketValueHistory(30); // Last 30 days
 *
 * // Trigger calculation if needed
 * if (needsCalculation) {
 *   await calculateHistoricalValues();
 * }
 *
 * // Get performance metrics
 * const metrics = getPerformanceMetrics();
 * // { currentValue, change, changePercent, allTimeHigh, totalGain, ... }
 * ```
 *
 * Performance Note:
 * Calculating historical values can take time (especially for multi-year ranges)
 * as it requires fetching historical prices from external APIs. The hook provides
 * progress callbacks and caches results in the database.
 *
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PortfolioValueCalculationService } from '@/services/portfolioValueCalculationService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Historical market value data point
 * Represents portfolio state on a specific date
 */
interface MarketValueData {
  /** Date of snapshot (YYYY-MM-DD) */
  date: string;

  /** Total portfolio value (cash + investments) */
  totalValue: number;

  /** Total cost basis of investments */
  totalCostBasis: number;

  /** Cash balance */
  cashValue: number;

  /** Market value of investments (excluding cash) */
  investedValue: number;

  /** Unrealized gains (current value - cost basis) */
  unrealizedGain: number;

  /** Realized gains from sales */
  realizedGain: number;

  /** Data quality score (0-1, based on price data availability) */
  dataQuality: number;
}

/**
 * Background calculation job status
 * Tracks progress of historical value calculations
 */
interface CalculationJob {
  /** Job identifier */
  id: string;

  /** Start date of calculation range */
  startDate: string;

  /** End date of calculation range */
  endDate: string;

  /** Job status: pending, running, completed, failed */
  status: string;

  /** Progress percentage (0-100) */
  progress: number;

  /** Number of days successfully calculated */
  daysCalculated: number;

  /** Number of days that failed */
  daysFailed: number;

  /** Error message if failed */
  errorMessage: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useMarketValueHistory Hook
 *
 * Provides historical portfolio value data and calculation methods.
 *
 * @param days - Number of days of history to fetch (default: 30)
 * @returns Historical data, loading state, and calculation methods
 */
export function useMarketValueHistory(days: number = 30) {
  // ===== HOOKS =====
  const { user } = useAuth();

  // ===== STATE =====
  const [history, setHistory] = useState<MarketValueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculationJob, setCalculationJob] = useState<CalculationJob | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [hasTransactions, setHasTransactions] = useState<boolean | null>(null);

  // ===== HELPER FUNCTIONS =====

  /**
   * Check if user has any transactions
   * Required before attempting historical calculations
   */
  const checkTransactions = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[Market Value] Checking for transactions...');
      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: false })
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;

      const hasData = data !== null && data !== undefined && data.length > 0;
      console.log(`[Market Value] Found ${count || 0} transaction(s)`);

      if (hasData && data.length > 0) {
        console.log('[Market Value] Sample transaction structure:', {
          id: data[0].id,
          type: data[0].transaction_type,
          date: data[0].transaction_date,
          hasMetadata: !!data[0].transaction_metadata,
          metadataKeys: Object.keys(data[0].transaction_metadata || {}),
        });
      }

      setHasTransactions(hasData);
    } catch (err) {
      console.error('[Market Value] Failed to check transactions:', err);
      setHasTransactions(false);
    }
  }, [user]);

  /**
   * Fetch historical portfolio value data from database
   * Only fetches data within the specified day range
   */
  const fetchHistory = useCallback(async () => {
    if (!user) return;

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      console.log('[Market Value] Fetching history from', cutoffDateStr);

      // Query portfolio_value_history table
      const { data, error } = await supabase
        .from('portfolio_value_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('value_date', cutoffDateStr)
        .order('value_date', { ascending: true });

      if (error) throw error;

      console.log('[Market Value] Fetched records:', data?.length || 0);

      // Format data for chart consumption
      const formattedData: MarketValueData[] = (data || []).map(item => ({
        date: item.value_date,
        totalValue: Number(item.total_value),
        totalCostBasis: Number(item.total_cost_basis),
        cashValue: Number(item.cash_value),
        investedValue: Number(item.invested_value),
        unrealizedGain: Number(item.unrealized_gain),
        realizedGain: Number(item.realized_gain),
        dataQuality: Number(item.data_quality_score),
      }));

      setHistory(formattedData);
      if (!calculating) {
        setError(null);
      }
    } catch (err) {
      console.error('[Market Value] Fetch error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch market value history'
      );
    } finally {
      setLoading(false);
    }
  }, [user, days, calculating]);

  // ===== DATA LOADING & REAL-TIME SYNC =====
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Initial load
    checkTransactions();
    fetchHistory();

    // Set up real-time subscription for portfolio value changes
    const channel = supabase
      .channel('portfolio-value-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_value_history',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[Market Value] Real-time update received');
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, days, fetchHistory, checkTransactions]);

  // ===== CALCULATION METHODS =====

  /**
   * Calculate historical portfolio values from transaction history
   *
   * This is a potentially long-running operation that:
   * 1. Finds earliest transaction date (or uses provided start date)
   * 2. Creates calculation job for tracking
   * 3. Iterates through each day calculating portfolio value
   * 4. Fetches historical prices for each holding
   * 5. Saves results to database for future lookups
   *
   * Progress callbacks allow UI to show calculation status.
   *
   * @param startDate - Optional start date (YYYY-MM-DD), defaults to earliest transaction
   * @param endDate - Optional end date (YYYY-MM-DD), defaults to today
   * @returns Promise with success status and error message
   */
  const calculateHistoricalValues = useCallback(
    async (
      startDate?: string,
      endDate?: string
    ): Promise<{ success: boolean; error: string | null }> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('[Market Value] Starting calculation...');
      setCalculating(true);
      setError(null);

      try {
        // Determine start date (use provided or find earliest transaction)
        let start = startDate;
        if (!start) {
          console.log('[Market Value] Finding earliest transaction date...');
          const earliest =
            await PortfolioValueCalculationService.getEarliestTransactionDate(
              user.id
            );
          if (!earliest) {
            console.log('[Market Value] No transactions found');
            const errorMsg =
              'No investment transactions found with ticker data. Add transactions with stocks, ETFs, or crypto in the Transactions tab.';
            setError(errorMsg);
            setCalculating(false);
            return { success: false, error: errorMsg };
          }
          start = earliest;
          console.log('[Market Value] Earliest transaction date:', start);
        }

        // Default end date to today
        const end = endDate || new Date().toISOString().split('T')[0];
        console.log('[Market Value] Calculating range:', start, 'to', end);

        // Create calculation job in database
        const jobResult =
          await PortfolioValueCalculationService.createCalculationJob(
            user.id,
            start,
            end
          );

        if (jobResult.error || !jobResult.jobId) {
          console.error(
            '[Market Value] Failed to create job:',
            jobResult.error
          );
          const errorMsg =
            jobResult.error || 'Failed to create calculation job';
          setError(errorMsg);
          setCalculating(false);
          return { success: false, error: errorMsg };
        }

        console.log('[Market Value] Job created:', jobResult.jobId);

        // Update job status to running
        await PortfolioValueCalculationService.updateCalculationJobProgress(
          jobResult.jobId,
          'running',
          0,
          0,
          0
        );

        // Perform calculation with progress callbacks
        const result =
          await PortfolioValueCalculationService.calculateAndSavePortfolioValueRange(
            user.id,
            start,
            end,
            (progress, currentDate) => {
              console.log(
                '[Market Value] Progress:',
                progress + '%',
                'Current date:',
                currentDate
              );
              // Update local calculation job state for UI
              setCalculationJob({
                id: jobResult.jobId!,
                startDate: start!,
                endDate: end,
                status: 'running',
                progress,
                daysCalculated: 0,
                daysFailed: 0,
                errorMessage: null,
              });
            }
          );

        console.log('[Market Value] Calculation complete:', {
          success: result.success,
          daysCalculated: result.daysCalculated,
          daysFailed: result.daysFailed,
          errors: result.errors,
        });

        // Update job status in database
        await PortfolioValueCalculationService.updateCalculationJobProgress(
          jobResult.jobId,
          result.success ? 'completed' : 'failed',
          100,
          result.daysCalculated,
          result.daysFailed,
          result.errors.length > 0 ? result.errors.join('; ') : undefined
        );

        // Handle failures
        if (!result.success || result.daysFailed > 0) {
          const errorMsg =
            result.errors.length > 0
              ? result.errors.slice(0, 3).join('; ') +
                (result.errors.length > 3 ? '...' : '')
              : 'Calculation failed';
          console.error('[Market Value] Calculation errors:', result.errors);
          setError(errorMsg);
          setCalculating(false);
          setCalculationJob(null);
          return { success: false, error: errorMsg };
        }

        // Fetch newly calculated data
        console.log('[Market Value] Fetching calculated history...');

        // Small delay to ensure database writes complete
        await new Promise(resolve => setTimeout(resolve, 500));

        await fetchHistory();

        console.log('[Market Value] History fetched, records:', history.length);

        setCalculating(false);
        setCalculationJob(null);

        return { success: true, error: null };
      } catch (err) {
        console.error('[Market Value] Calculation error:', err);
        setCalculating(false);
        setCalculationJob(null);
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Failed to calculate historical values';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [user, fetchHistory]
  );

  /**
   * Get performance metrics for the loaded history period
   *
   * Calculates:
   * - Current and start values
   * - Change in value (absolute and percentage)
   * - All-time high and low (within period)
   * - Total gain (period-specific)
   *
   * @returns Performance metrics object
   */
  const getPerformanceMetrics = useCallback(() => {
    if (history.length === 0) {
      return {
        currentValue: 0,
        startValue: 0,
        change: 0,
        changePercent: 0,
        allTimeHigh: 0,
        allTimeLow: 0,
        totalGain: 0,
        totalGainPercent: 0,
      };
    }

    const current = history[history.length - 1];
    const start = history[0];
    const values = history.map(h => h.totalValue);

    // Calculate change over period
    const change = current.totalValue - start.totalValue;
    const changePercent =
      start.totalValue > 0 ? (change / start.totalValue) * 100 : 0;

    // Calculate gain for the selected period (difference between current and start period gains)
    const currentTotalGain = current.unrealizedGain + current.realizedGain;
    const startTotalGain = start.unrealizedGain + start.realizedGain;
    const periodGain = currentTotalGain - startTotalGain;

    // Calculate period gain percentage based on the change in value vs cost basis
    const periodGainPercent =
      start.totalCostBasis > 0
        ? (periodGain / start.totalCostBasis) * 100
        : 0;

    return {
      currentValue: current.totalValue,
      startValue: start.totalValue,
      change,
      changePercent,
      allTimeHigh: Math.max(...values),
      allTimeLow: Math.min(...values),
      totalGain: periodGain,
      totalGainPercent: periodGainPercent,
    };
  }, [history]);

  /**
   * Get asset class breakdown for a specific date
   *
   * Returns percentage allocation across asset classes:
   * - Stocks
   * - ETFs
   * - Crypto
   * - Bonds
   * - Cash
   * - etc.
   *
   * @param date - Optional date (YYYY-MM-DD), defaults to today
   * @returns Object with asset class names as keys and percentages as values
   */
  const getAssetClassBreakdown = useCallback(
    async (date?: string) => {
      if (!user) return {};

      try {
        const targetDate = date || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('portfolio_value_history')
          .select('asset_class_breakdown')
          .eq('user_id', user.id)
          .eq('value_date', targetDate)
          .maybeSingle();

        if (error) throw error;

        return (data?.asset_class_breakdown as Record<string, number>) || {};
      } catch (err) {
        console.error('Failed to get asset class breakdown:', err);
        return {};
      }
    },
    [user]
  );

  /**
   * Get ticker-level breakdown for a specific date
   *
   * Returns detailed information for each holding:
   * - Symbol
   * - Quantity
   * - Current value
   * - Percentage of portfolio
   * - Gain/loss
   *
   * @param date - Optional date (YYYY-MM-DD), defaults to today
   * @returns Object with ticker symbols as keys and holding data as values
   */
  const getTickerBreakdown = useCallback(
    async (date?: string) => {
      if (!user) return {};

      try {
        const targetDate = date || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('portfolio_value_history')
          .select('ticker_breakdown')
          .eq('user_id', user.id)
          .eq('value_date', targetDate)
          .maybeSingle();

        if (error) throw error;

        return (data?.ticker_breakdown as Record<string, any>) || {};
      } catch (err) {
        console.error('Failed to get ticker breakdown:', err);
        return {};
      }
    },
    [user]
  );

  // ===== COMPUTED VALUES =====
  const hasData = history.length > 0;
  const needsCalculation = !loading && !hasData && !calculating;

  // ===== RETURN =====
  return {
    /** Historical market value data points */
    history,

    /** True while fetching initial data */
    loading,

    /** Error message if fetch or calculation failed */
    error,

    /** True while calculating historical values */
    calculating,

    /** Current calculation job status (if running) */
    calculationJob,

    /** Whether history data exists */
    hasData,

    /** Whether calculation is needed (no data and not loading/calculating) */
    needsCalculation,

    /** Whether user has any transactions */
    hasTransactions,

    /** Calculate historical values from transactions */
    calculateHistoricalValues,

    /** Get performance metrics for loaded period */
    getPerformanceMetrics,

    /** Get asset class breakdown for a date */
    getAssetClassBreakdown,

    /** Get ticker-level breakdown for a date */
    getTickerBreakdown,

    /** Manually refetch history */
    refetch: fetchHistory,
  };
}
