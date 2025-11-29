import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface PerformanceMetrics {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
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
 * Calculate performance metrics
 */
async function calculatePerformance(userId: string): Promise<PerformanceMetrics | null> {
  try {
    // Get latest snapshot
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError && snapshotError.code !== 'PGRST116') {
      throw snapshotError;
    }

    if (!latestSnapshot) {
      return null;
    }

    // Get snapshot from yesterday for day change
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: yesterdaySnapshot } = await supabase
      .from('portfolio_snapshots')
      .select('total_value')
      .eq('user_id', userId)
      .lte('snapshot_date', yesterdayStr)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    // Get all-time high and low
    const { data: allSnapshots } = await supabase
      .from('portfolio_snapshots')
      .select('total_value')
      .eq('user_id', userId);

    let allTimeHigh = latestSnapshot.total_value;
    let allTimeLow = latestSnapshot.total_value;

    if (allSnapshots) {
      allTimeHigh = Math.max(...allSnapshots.map(s => s.total_value));
      allTimeLow = Math.min(...allSnapshots.map(s => s.total_value));
    }

    const dayChange = yesterdaySnapshot
      ? latestSnapshot.total_value - yesterdaySnapshot.total_value
      : 0;

    const dayChangePercent = yesterdaySnapshot
      ? (dayChange / yesterdaySnapshot.total_value) * 100
      : 0;

    return {
      totalValue: latestSnapshot.total_value,
      totalGain: latestSnapshot.total_gain || 0,
      totalGainPercent: latestSnapshot.total_gain_percent || 0,
      dayChange,
      dayChangePercent,
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
      .select('*, accounts!inner(asset_class)')
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
