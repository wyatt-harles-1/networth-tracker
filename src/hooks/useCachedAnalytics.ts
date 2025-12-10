import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AccountMetricsService } from '@/services/accountMetricsService';

export interface PerformanceMetrics {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number; // Actually weekly change (keeping name for backward compatibility)
  dayChangePercent: number; // Actually weekly change percent
  allTimeHigh: number;
  allTimeLow: number;
}

export interface AssetAllocation {
  assetClass: string;
  value: number;
  percentage: number;
  change: number;
  changePercent: number;
}

export interface TopPerformer {
  ticker: string;
  value: number;
  gain: number;
  gainPercent: number;
  quantity: number;
}

export interface CachedAnalytics {
  performance: PerformanceMetrics | null;
  allocation: AssetAllocation[];
  topGainers: TopPerformer[];
  topLosers: TopPerformer[];
  lastUpdated: Date | null;
}

/**
 * Hook for cached analytics calculations
 * Caches expensive calculations and only recalculates when data changes
 */
export function useCachedAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<CachedAnalytics>({
    performance: null,
    allocation: [],
    topGainers: [],
    topLosers: [],
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate analytics
  const calculateAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [
        performanceData,
        allocationData,
        topPerformersData,
      ] = await Promise.all([
        calculatePerformance(user.id),
        calculateAllocation(user.id),
        calculateTopPerformers(user.id),
      ]);

      setAnalytics({
        performance: performanceData,
        allocation: allocationData,
        topGainers: topPerformersData.gainers,
        topLosers: topPerformersData.losers,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate analytics');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and when user changes
  useEffect(() => {
    calculateAnalytics();
  }, [user]);

  // Subscribe to data changes for cache invalidation
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('analytics-invalidation')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate cache when transactions change
          calculateAnalytics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'holdings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate cache when holdings change
          calculateAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    ...analytics,
    loading,
    error,
    refresh: calculateAnalytics,
  };
}

/**
 * Calculate performance metrics using account metrics service (same as charts)
 */
async function calculatePerformance(userId: string): Promise<PerformanceMetrics | null> {
  try {
    // Get 7 days of history (same as charts use for weekly data)
    const historyResult = await AccountMetricsService.getPortfolioBalanceHistory(userId, 6); // 6 days back + today = 7 days

    if (!historyResult.data || historyResult.data.length === 0) {
      return null;
    }

    const history = historyResult.data;
    const latestPoint = history[history.length - 1]; // Most recent (today)
    const weekAgoPoint = history[0]; // 7 days ago

    // Calculate weekly change using holdings_value (matches portfolio chart)
    const weeklyChange = latestPoint.holdings_value - weekAgoPoint.holdings_value;
    const weeklyChangePercent = weekAgoPoint.holdings_value > 0
      ? (weeklyChange / weekAgoPoint.holdings_value) * 100
      : 0;

    // Get all-time history for high/low (use balance for net worth)
    const allTimeResult = await AccountMetricsService.getPortfolioBalanceHistory(userId, 3649); // ~10 years
    const allTimeHistory = allTimeResult.data || history;

    const allTimeHigh = Math.max(...allTimeHistory.map(p => p.balance));
    const allTimeLow = Math.min(...allTimeHistory.map(p => p.balance));

    return {
      totalValue: latestPoint.balance,
      totalGain: latestPoint.unrealized_gain + latestPoint.realized_gain,
      totalGainPercent: latestPoint.total_cost_basis > 0
        ? ((latestPoint.unrealized_gain + latestPoint.realized_gain) / latestPoint.total_cost_basis) * 100
        : 0,
      dayChange: weeklyChange, // Actually weekly change (keeping name for backward compatibility)
      dayChangePercent: weeklyChangePercent,
      allTimeHigh,
      allTimeLow,
    };
  } catch (error) {
    console.error('Performance calculation error:', error);
    return null;
  }
}

/**
 * Calculate asset allocation
 */
async function calculateAllocation(userId: string): Promise<AssetAllocation[]> {
  try {
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('*, accounts!inner(*)')
      .eq('user_id', userId);

    if (error) throw error;

    const allocationMap = new Map<string, { value: number; change: number }>();
    let totalValue = 0;

    for (const holding of holdings || []) {
      const assetClass = holding.accounts.asset_class || 'Other';
      const value = holding.quantity * (holding.current_price || 0);
      const costBasis = holding.quantity * holding.average_cost;
      const change = value - costBasis;

      const current = allocationMap.get(assetClass) || { value: 0, change: 0 };
      current.value += value;
      current.change += change;

      allocationMap.set(assetClass, current);
      totalValue += value;
    }

    const allocation: AssetAllocation[] = [];

    for (const [assetClass, data] of allocationMap.entries()) {
      allocation.push({
        assetClass,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        change: data.change,
        changePercent: data.value > 0 ? (data.change / (data.value - data.change)) * 100 : 0,
      });
    }

    return allocation.sort((a, b) => b.value - a.value);
  } catch (error) {
    console.error('Allocation calculation error:', error);
    return [];
  }
}

/**
 * Calculate top performers
 */
async function calculateTopPerformers(
  userId: string
): Promise<{ gainers: TopPerformer[]; losers: TopPerformer[] }> {
  try {
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const performers: TopPerformer[] = [];

    for (const holding of holdings || []) {
      const value = holding.quantity * (holding.current_price || 0);
      const costBasis = holding.quantity * holding.average_cost;
      const gain = value - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

      performers.push({
        ticker: holding.ticker,
        value,
        gain,
        gainPercent,
        quantity: holding.quantity,
      });
    }

    // Sort by gain percentage
    performers.sort((a, b) => b.gainPercent - a.gainPercent);

    return {
      gainers: performers.slice(0, 5),
      losers: performers.slice(-5).reverse(),
    };
  } catch (error) {
    console.error('Top performers calculation error:', error);
    return { gainers: [], losers: [] };
  }
}

/**
 * Hook for memoized performance calculations
 * Use this for quick calculations that don't need caching
 */
export function useMemoizedPerformance(snapshots: any[]) {
  return useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    const latest = snapshots[0];
    const previous = snapshots[1];

    const change = previous ? latest.total_value - previous.total_value : 0;
    const changePercent = previous
      ? (change / previous.total_value) * 100
      : 0;

    return {
      currentValue: latest.total_value,
      change,
      changePercent,
      date: latest.snapshot_date,
    };
  }, [snapshots]);
}
