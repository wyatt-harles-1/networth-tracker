/**
 * ============================================================================
 * React Query Hooks for Portfolio Data
 * ============================================================================
 *
 * Optimized data fetching hooks using React Query for caching and performance.
 * Replaces traditional useEffect-based data fetching with cached queries.
 *
 * Benefits:
 * - Automatic caching (5 min fresh, 30 min cache)
 * - Parallel query execution
 * - Automatic background refetching
 * - Loading and error states
 * - Request deduplication
 *
 * ============================================================================
 */

import { useQuery } from '@tanstack/react-query';
import { AccountMetricsService } from '@/services/accountMetricsService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Fetch portfolio balance history with caching
 *
 * @param timeRange - Time range for historical data
 * @param daysBack - Number of days to fetch
 * @returns Query result with portfolio history data
 */
export function usePortfolioBalanceHistory(timeRange: string, daysBack: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portfolio-history', user?.id, timeRange, daysBack],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const result = await AccountMetricsService.getPortfolioBalanceHistory(
        user.id,
        daysBack
      );

      if (result.error) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!user, // Only run query if user exists
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch portfolio-wide metrics with caching
 *
 * @returns Query result with portfolio metrics
 */
export function usePortfolioMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portfolio-metrics', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const result = await AccountMetricsService.getPortfolioMetrics(user.id);

      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Combined hook that fetches both history and metrics in parallel
 *
 * @param timeRange - Time range label (e.g., '1W', '1M', '3M')
 * @param daysBack - Number of days to fetch
 * @returns Combined loading state and data
 */
export function usePortfolioData(timeRange: string, daysBack: number) {
  const historyQuery = usePortfolioBalanceHistory(timeRange, daysBack);
  const metricsQuery = usePortfolioMetrics();

  return {
    // Data
    historyData: historyQuery.data || [],
    metricsData: metricsQuery.data || null,

    // Loading states
    isLoadingHistory: historyQuery.isLoading,
    isLoadingMetrics: metricsQuery.isLoading,
    isLoading: historyQuery.isLoading || metricsQuery.isLoading,

    // Error states
    historyError: historyQuery.error,
    metricsError: metricsQuery.error,
    hasError: !!historyQuery.error || !!metricsQuery.error,

    // Refetch functions
    refetchHistory: historyQuery.refetch,
    refetchMetrics: metricsQuery.refetch,
    refetchAll: () => {
      historyQuery.refetch();
      metricsQuery.refetch();
    },
  };
}
