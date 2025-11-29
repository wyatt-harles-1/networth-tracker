/**
 * ============================================================================
 * usePerformanceMetrics Hook - Portfolio Performance Analysis
 * ============================================================================
 *
 * Calculates portfolio performance metrics over various time periods.
 * Processes historical snapshot data to generate performance charts and statistics.
 *
 * Features:
 * - Time-series data for performance charts
 * - Performance metrics (change amount, percentage, high, low)
 * - Multiple timespan support (1H, 1D, 1W, 1M, YTD, 1Y, 3Y, 5Y, ALL)
 * - Automatic date filtering and formatting
 * - Fallback to current portfolio state when no historical data exists
 *
 * Usage:
 * ```tsx
 * const { performanceData, performanceMetrics } = usePerformanceMetrics('1M');
 *
 * // Performance metrics for display
 * console.log(performanceMetrics.change);      // "$+1,234"
 * console.log(performanceMetrics.percentage);  // "+5.67%"
 * console.log(performanceMetrics.period);      // "this month"
 * console.log(performanceMetrics.high);        // "$25,000"
 * console.log(performanceMetrics.low);         // "$23,500"
 *
 * // Time-series data for charts
 * performanceData.forEach(point => {
 *   console.log(point.time);       // "Jan 15"
 *   console.log(point.portfolio);  // 24500
 *   console.log(point.costBasis);  // 23000
 * });
 * ```
 *
 * How It Works:
 * 1. Fetches historical portfolio snapshots from usePortfolioSnapshots
 * 2. Filters snapshots by selected timespan (e.g., last 30 days for '1M')
 * 3. Sorts snapshots chronologically
 * 4. Formats dates appropriately for timespan (e.g., "Jan 15" for 1M, "Jan" for 1Y)
 * 5. Calculates summary metrics (change, percentage, high, low)
 *
 * Supported Timespans:
 * - 1H: Last hour (hourly data)
 * - 1D: Today (daily data)
 * - 1W: Last 7 days
 * - 1M: Last 30 days
 * - YTD: Year to date
 * - 1Y: Last 365 days
 * - 3Y: Last 3 years
 * - 5Y: Last 5 years
 * - ALL: All available history
 *
 * ============================================================================
 */

import { useMemo } from 'react';
import { usePortfolioSnapshots } from './usePortfolioSnapshots';
import { usePortfolioCalculations } from './usePortfolioCalculations';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Performance data point for charting
 * Represents portfolio value at a specific time
 */
export interface PerformanceData {
  /** Formatted time label (e.g., "Jan 15", "Jan", "2024") */
  time: string;

  /** Portfolio value at this time */
  portfolio: number;

  /** Cost basis at this time */
  costBasis: number;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * usePerformanceMetrics Hook
 *
 * Processes portfolio snapshots into performance metrics and chart data.
 * All calculations are memoized for performance.
 *
 * @param timespan - Time period to analyze (default: '1M')
 * @returns Performance data and metrics
 */
export function usePerformanceMetrics(timespan: string = '1M') {
  // ===== HOOKS =====
  const { snapshots } = usePortfolioSnapshots();
  const { portfolio } = usePortfolioCalculations();

  // ===== PERFORMANCE DATA =====

  /**
   * Time-series data for performance charts
   *
   * Filters and formats historical snapshots for the selected timespan.
   * If no snapshots exist, returns single data point with current portfolio state.
   */
  const performanceData = useMemo(() => {
    // Get number of days to look back for this timespan
    const days = getDaysForTimespan(timespan);

    // Calculate cutoff date
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Filter snapshots within timespan and sort chronologically
    const filteredSnapshots = snapshots
      .filter(s => {
        const date = new Date(s.snapshot_date);
        return date >= cutoff;
      })
      .sort(
        (a, b) =>
          new Date(a.snapshot_date).getTime() -
          new Date(b.snapshot_date).getTime()
      );

    // Fallback: If no historical data, use current portfolio state
    if (filteredSnapshots.length === 0) {
      return [
        {
          time: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          portfolio: portfolio.netWorth,
          costBasis: portfolio.totalAssets,
        },
      ];
    }

    // Map snapshots to chart data format with formatted time labels
    return filteredSnapshots.map(snapshot => ({
      time: formatTimeLabel(snapshot.snapshot_date, timespan),
      portfolio: snapshot.net_worth,
      costBasis: snapshot.total_assets,
    }));
  }, [snapshots, timespan, portfolio]);

  // ===== PERFORMANCE METRICS =====

  /**
   * Summary performance metrics
   *
   * Calculates change amount, percentage, and high/low values
   * for the selected timespan.
   */
  const performanceMetrics = useMemo(() => {
    // Edge case: Not enough data for meaningful metrics
    if (performanceData.length < 2) {
      return {
        change: '$0',
        percentage: '+0.0%',
        period: getPeriodLabel(timespan),
        high: formatCurrency(portfolio.netWorth),
        low: formatCurrency(portfolio.netWorth),
      };
    }

    // Calculate change from first to last value in period
    const firstValue = performanceData[0].portfolio;
    const lastValue = performanceData[performanceData.length - 1].portfolio;
    const change = lastValue - firstValue;

    // Calculate percentage change (avoid division by zero)
    const percentage =
      firstValue !== 0 ? (change / Math.abs(firstValue)) * 100 : 0;

    // Find high and low values in period
    const values = performanceData.map(d => d.portfolio);
    const high = Math.max(...values);
    const low = Math.min(...values);

    return {
      change: formatCurrency(change, true), // Show sign (+ or -)
      percentage: `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`,
      period: getPeriodLabel(timespan), // "this month", "this year", etc.
      high: formatCurrency(high),
      low: formatCurrency(low),
    };
  }, [performanceData, timespan, portfolio.netWorth]);

  // ===== RETURN =====
  return {
    /** Time-series data for charts */
    performanceData,

    /** Summary metrics (change, percentage, high, low) */
    performanceMetrics,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert timespan string to number of days
 *
 * Maps timespan identifiers (1M, 1Y, etc.) to number of days to look back.
 * Used for filtering historical snapshots.
 *
 * @param timespan - Timespan identifier
 * @returns Number of days to look back
 *
 * @example
 * ```tsx
 * getDaysForTimespan('1M')  // 30
 * getDaysForTimespan('1Y')  // 365
 * getDaysForTimespan('ALL') // 10000
 * ```
 */
function getDaysForTimespan(timespan: string): number {
  const map: Record<string, number> = {
    '1H': 1,     // Last hour (1 day of data)
    '1D': 1,     // Today (1 day)
    '1W': 7,     // Last week
    '1M': 30,    // Last month
    YTD: 365,    // Year to date (max 365 days)
    '1Y': 365,   // Last year
    '3Y': 1095,  // Last 3 years
    '5Y': 1825,  // Last 5 years
    ALL: 10000,  // All time (effectively unlimited)
  };
  return map[timespan] || 30; // Default to 30 days
}

/**
 * Format date for chart time axis label
 *
 * Formatting varies by timespan for optimal readability:
 * - Short timespans (1D, 1W, 1M): "Jan 15"
 * - Medium timespans (1Y): "Jan"
 * - Long timespans (3Y, 5Y, ALL): "2024"
 *
 * @param dateString - ISO date string
 * @param timespan - Current timespan setting
 * @returns Formatted date label
 *
 * @example
 * ```tsx
 * formatTimeLabel('2024-01-15', '1M')  // "Jan 15"
 * formatTimeLabel('2024-01-15', '1Y')  // "Jan"
 * formatTimeLabel('2024-01-15', '5Y')  // "2024"
 * ```
 */
function formatTimeLabel(dateString: string, timespan: string): string {
  const date = new Date(dateString);

  // Short timespans: Show month and day
  if (timespan === '1D' || timespan === '1W') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (timespan === '1M' || timespan === 'YTD') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (timespan === '1Y') {
    // Medium timespans: Show only month
    return date.toLocaleDateString('en-US', { month: 'short' });
  } else {
    // Long timespans: Show only year
    return date.toLocaleDateString('en-US', { year: 'numeric' });
  }
}

/**
 * Get human-readable period label
 *
 * Converts timespan code to descriptive text for display.
 *
 * @param timespan - Timespan identifier
 * @returns Human-readable period description
 *
 * @example
 * ```tsx
 * getPeriodLabel('1M')  // "this month"
 * getPeriodLabel('1Y')  // "this year"
 * getPeriodLabel('ALL') // "all time"
 * ```
 */
function getPeriodLabel(timespan: string): string {
  const map: Record<string, string> = {
    '1H': 'last hour',
    '1D': 'today',
    '1W': 'this week',
    '1M': 'this month',
    YTD: 'year to date',
    '1Y': 'this year',
    '3Y': '3 years',
    '5Y': '5 years',
    ALL: 'all time',
  };
  return map[timespan] || 'this period';
}

/**
 * Format number as currency string
 *
 * Formats with no decimal places for cleaner display of large values.
 * Optionally includes sign prefix for showing gains/losses.
 *
 * @param value - Number to format
 * @param showSign - Whether to prefix with + for positive values (default: false)
 * @returns Formatted currency string
 *
 * @example
 * ```tsx
 * formatCurrency(1234)        // "$1,234"
 * formatCurrency(1234, true)  // "+$1,234"
 * formatCurrency(-500)        // "-$500"
 * formatCurrency(-500, true)  // "-$500"
 * ```
 */
function formatCurrency(value: number, showSign: boolean = false): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));

  if (showSign && value >= 0) {
    return `+${formatted}`;
  } else if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
}
