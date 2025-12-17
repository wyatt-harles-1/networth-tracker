/**
 * ============================================================================
 * Portfolio Component
 * ============================================================================
 *
 * Main portfolio view showing holdings, performance, and portfolio metrics.
 *
 * Features:
 * - Interactive portfolio performance chart with multiple time ranges
 * - Holdings list with live prices and performance metrics
 * - Asset type filtering (stocks, crypto, cash, etc.)
 * - Multiple sorting options (alphabetical, value, gains)
 * - Price sync functionality to update all holdings
 * - Real-time portfolio value calculations
 *
 * Data Sources:
 * - Holdings data from useHoldings hook
 * - Portfolio calculations from usePortfolioCalculations hook
 * - Historical balance data from AccountMetricsService
 * - Live price updates via price sync
 *
 * Sub-components:
 * - PerformanceChartContainer: Portfolio value over time
 * - HoldingCard: Individual holding details
 * - AssetTypeFilter: Filter holdings by asset type
 * - LiveStockChart: Real-time price chart for individual holdings
 *
 * ============================================================================
 */

import { useState, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useHoldings } from '@/hooks/useHoldings';
import { usePortfolioCalculations } from '@/hooks/usePortfolioCalculations';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolioData } from '@/hooks/usePortfolioQueries';
import { PerformanceChartContainer } from './PerformanceChartContainer';
import { HoldingCard } from './HoldingCard';
import { HoldingDetailModal } from './HoldingDetailModal';
import { AssetTypeFilter } from './AssetTypeFilter';
import { PriceDataSettings } from './PriceDataSettings';
import { Loader2 } from 'lucide-react';
import { AccountBalanceHistoryPoint } from '@/services/accountMetricsService';
import { PageLoading, PageContainer, PageHeader, ContentSection } from './ui/page-transitions';
import { PullToRefresh } from './ui/pull-to-refresh';

/**
 * Portfolio page component
 */
export function PortfolioReal() {
  const [timeRange, setTimeRange] = useState<
    'YTD' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL'
  >('3M');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<
    'alphabetical' | 'value-high' | 'value-low' | 'value-gain-high' | 'value-gain-low' | 'percent-gain-high' | 'percent-gain-low'
  >('value-high');
  const [holdingsDisplayMode, setHoldingsDisplayMode] = useState<
    'value' | 'price'
  >('value');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<Set<string>>(
    new Set()
  );
  const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

  const { user } = useAuth();
  const {
    holdings,
    loading: holdingsLoading,
    refetch: refetchHoldings,
  } = useHoldings();
  const { loading: portfolioLoading } = usePortfolioCalculations();

  // ⚡ Calculate days back based on time range
  const daysBackMap = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const ytdDays = Math.ceil(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      '1W': 6,
      '1M': 29,
      '3M': 89,
      YTD: ytdDays - 1,
      '1Y': 364,
      '5Y': 1824,
      ALL: 3649,
    };
  }, []);

  // ⚡ PERFORMANCE: Use React Query for cached, parallel data fetching
  const {
    historyData,
    metricsData: portfolioMetricsData,
    isLoading: isLoadingPortfolioData,
    refetchAll: refetchPortfolioData,
  } = usePortfolioData(timeRange, daysBackMap[timeRange]);

  // ⚡ PERFORMANCE: Refresh handler with automatic price sync
  const handleRefreshChart = async () => {
    if (!user) return;

    setRefreshing(true);

    try {
      // First, sync any missing price data (last 90 days, prioritizing recent)
      console.log('[Portfolio] 🔄 Auto-syncing recent price data on refresh...');

      const { HistoricalPriceService } = await import('@/services/historicalPriceService');
      const accountIds = Array.from(new Set(holdings.map(h => h.account_id)));

      let totalPricesAdded = 0;

      for (const accountId of accountIds) {
        const fetchResult = await HistoricalPriceService.smartSync(
          user.id,
          accountId,
          3, // Max 3 symbols per refresh
          false,
          undefined, // No progress callback needed for automatic sync
          undefined, // No abort signal
          90 // Always fetch last 90 days (covers 3M chart view)
        );
        totalPricesAdded += fetchResult.totalPricesAdded;
      }

      if (totalPricesAdded > 0) {
        console.log(`[Portfolio] ✅ Auto-sync added ${totalPricesAdded} prices`);
      }

      // Then refresh the chart data
      await refetchPortfolioData();
    } catch (err) {
      console.error('[Portfolio] Error refreshing portfolio data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTimeRangeChange = async (
    range: 'YTD' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL'
  ) => {
    setTimeRange(range);
  };


  // Filter historical data by selected asset types
  const filteredHistoryData = useMemo(() => {
    if (selectedAssetTypes.size === 0 || historyData.length === 0) {
      // No filtering - show all data
      return historyData;
    }

    // Filter each data point to only include selected asset types
    return historyData.map(point => {
      if (!point.asset_type_breakdown) {
        // No breakdown available - return original point
        return point;
      }

      // Sum values for selected asset types
      let filteredValue = 0;
      for (const assetType of selectedAssetTypes) {
        filteredValue += point.asset_type_breakdown[assetType] || 0;
      }

      return {
        ...point,
        holdings_value: filteredValue,
      };
    });
  }, [historyData, selectedAssetTypes]);

  // Calculate portfolio metrics from filtered history data
  const portfolioMetrics = useMemo(() => {
    if (filteredHistoryData.length === 0) {
      return {
        currentValue: 0,
        startValue: 0,
        change: 0,
        changePercent: 0,
        isPositive: true,
        periodHigh: 0,
        periodLow: 0,
        gainChange: 0,
        gainChangePercent: 0,
        isGainPositive: true,
      };
    }

    // Calculate current value from live holdings data (not historical snapshots)
    let currentValue: number;
    if (selectedAssetTypes.size > 0) {
      const filteredHoldings = holdings.filter(holding =>
        selectedAssetTypes.has(holding.asset_type)
      );
      currentValue = filteredHoldings.reduce((sum: number, holding) => {
        return sum + Number(holding.current_value);
      }, 0);
    } else {
      // Use live holdings data for accurate current value
      currentValue = holdings.reduce((sum: number, holding) => {
        return sum + Number(holding.current_value);
      }, 0);
    }

    const startValue = filteredHistoryData[0].holdings_value;
    const change = currentValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;

    // Calculate period high and low from history (all data for now)
    const values = filteredHistoryData.map(d => d.holdings_value);
    const periodHigh = Math.max(...values);
    const periodLow = Math.min(...values);

    // Calculate gain change over the selected time period
    const startGain =
      (filteredHistoryData[0].unrealized_gain || 0) +
      (filteredHistoryData[0].realized_gain || 0);
    const currentGain =
      (filteredHistoryData[filteredHistoryData.length - 1].unrealized_gain || 0) +
      (filteredHistoryData[filteredHistoryData.length - 1].realized_gain || 0);
    const gainChange = currentGain - startGain;

    // Calculate gain percentage based on current cost basis
    const currentCostBasis =
      filteredHistoryData[filteredHistoryData.length - 1].total_cost_basis || 0;
    const gainChangePercent =
      currentCostBasis > 0 ? (currentGain / currentCostBasis) * 100 : 0;

    return {
      currentValue,
      startValue,
      change,
      changePercent,
      isPositive: change >= 0,
      periodHigh,
      periodLow,
      gainChange,
      gainChangePercent,
      isGainPositive: gainChange >= 0,
    };
  }, [filteredHistoryData, selectedAssetTypes, holdings]);

  // Calculate available asset types from holdings
  const availableAssetTypes = useMemo(() => {
    const typesMap = new Map<string, { count: number; value: number }>();
    holdings.forEach(holding => {
      const type = holding.asset_type;
      const existing = typesMap.get(type) || { count: 0, value: 0 };
      typesMap.set(type, {
        count: existing.count + 1,
        value: existing.value + Number(holding.current_value),
      });
    });
    return Array.from(typesMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      value: data.value,
    }));
  }, [holdings]);

  // Toggle handler for asset type filter
  const handleAssetTypeToggle = (type: string) => {
    setSelectedAssetTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  // Calculate holdings with gains for sorting
  const holdingsWithGains = useMemo(() => {
    // Filter by selected asset types if any are selected
    const filteredHoldings =
      selectedAssetTypes.size > 0
        ? holdings.filter(holding => selectedAssetTypes.has(holding.asset_type))
        : holdings;

    return filteredHoldings.map(holding => {
      const currentValue = Number(holding.current_value);
      const costBasis = Number(holding.cost_basis);
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        ...holding,
        gain: gainLoss,
        gainPercentage: gainLossPercent,
      };
    });
  }, [holdings, selectedAssetTypes]);

  // Sort holdings based on selected sort option
  const sortedHoldings = useMemo(() => {
    const sorted = [...holdingsWithGains];

    switch (sortBy) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
      case 'value-high':
        return sorted.sort(
          (a, b) => Number(b.current_value) - Number(a.current_value)
        );
      case 'value-low':
        return sorted.sort(
          (a, b) => Number(a.current_value) - Number(b.current_value)
        );
      case 'value-gain-high':
        return sorted.sort((a, b) => b.gain - a.gain);
      case 'value-gain-low':
        return sorted.sort((a, b) => a.gain - b.gain);
      case 'percent-gain-high':
        return sorted.sort((a, b) => b.gainPercentage - a.gainPercentage);
      case 'percent-gain-low':
        return sorted.sort((a, b) => a.gainPercentage - b.gainPercentage);
      default:
        return sorted;
    }
  }, [holdingsWithGains, sortBy]);

  // Phase 1: Loading State
  if (holdingsLoading || portfolioLoading || isLoadingPortfolioData) {
    return <PageLoading message="Loading portfolio data..." />;
  }

  return (
    <PullToRefresh onRefresh={handleRefreshChart} disabled={refreshing}>
      <PageContainer className="p-4 pb-20">
        <PageHeader
          title="Portfolio"
          subtitle="Track your investment performance and holdings"
        />

        <div className="space-y-4">
          {/* Portfolio Performance Chart */}
        <ContentSection delay={50}>
          <PerformanceChartContainer
            title="Portfolio Performance"
            data={filteredHistoryData}
            timeRange={timeRange}
            availableTimeRanges={[
              'YTD',
              '1W',
              '1M',
              '3M',
              '1Y',
              '5Y',
              'ALL',
            ]}
            loading={isLoadingPortfolioData}
            refreshing={refreshing}
            onTimeRangeChange={handleTimeRangeChange}
            onRefresh={handleRefreshChart}
            currentValue={portfolioMetrics.currentValue}
            extraButton={<PriceDataSettings />}
            headerContent={
              isLoadingPortfolioData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-medium text-gray-600">
                        Market Value
                      </p>
                    </div>
                    <p className="text-xs font-medium text-gray-600">
                      Market Value Change
                    </p>
                  </div>
                  <div className="flex items-start justify-between">
                    <p className="text-4xl font-bold text-gray-900">
                      {formatCurrency(portfolioMetrics.currentValue)}
                    </p>
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className={`flex items-center gap-1 ${portfolioMetrics.isPositive ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {portfolioMetrics.isPositive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="text-lg font-semibold">
                          {portfolioMetrics.isPositive ? '+' : ''}
                          {formatCurrency(portfolioMetrics.change)}
                        </span>
                      </div>
                      <span
                        className={`text-sm ${portfolioMetrics.isPositive ? 'text-green-600' : 'text-red-600'}`}
                      >
                        ({portfolioMetrics.isPositive ? '+' : ''}
                        {portfolioMetrics.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )
            }
          />
        </ContentSection>

        {/* Asset Type Filter */}
        <ContentSection delay={100}>
          <AssetTypeFilter
            assetTypeCounts={availableAssetTypes}
            selectedTypes={selectedAssetTypes}
            onToggle={handleAssetTypeToggle}
          />
        </ContentSection>

        {/* All Holdings List */}
        <ContentSection delay={150}>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              All Holdings
            </h4>
            <div className="flex items-center gap-3 mb-4">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <Select
                  value={sortBy}
                  onValueChange={value =>
                    setSortBy(
                      value as
                        | 'alphabetical'
                        | 'value-high'
                        | 'value-low'
                        | 'value-gain-high'
                        | 'value-gain-low'
                        | 'percent-gain-high'
                        | 'percent-gain-low'
                    )
                  }
                >
                  <SelectTrigger className="w-[180px] bg-white border-gray-300">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem
                      value="alphabetical"
                      className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                    >
                      Alphabetical
                    </SelectItem>
                    <SelectItem
                      value="value-high"
                      className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                    >
                      Value: High to Low
                    </SelectItem>
                    <SelectItem
                      value="value-low"
                      className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                    >
                      Value: Low to High
                    </SelectItem>
                    <SelectItem
                      value="value-gain-high"
                      className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                    >
                      Value Gain: High to Low
                    </SelectItem>
                    <SelectItem
                      value="value-gain-low"
                      className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                    >
                      Value Gain: Low to High
                    </SelectItem>
                    <SelectItem
                      value="percent-gain-high"
                      className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                    >
                      % Gain: High to Low
                    </SelectItem>
                    <SelectItem
                      value="percent-gain-low"
                      className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                    >
                      % Gain: Low to High
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Display Mode */}
              <Tabs
                value={holdingsDisplayMode}
                onValueChange={value =>
                  setHoldingsDisplayMode(value as 'value' | 'price')
                }
                className="w-[280px]"
              >
                <TabsList className="grid w-full grid-cols-2 bg-gray-200">
                  <TabsTrigger
                    value="value"
                    className="data-[state=active]:bg-white"
                  >
                    Value
                  </TabsTrigger>
                  <TabsTrigger
                    value="price"
                    className="data-[state=active]:bg-white"
                  >
                    Per Share
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {holdings.length === 0 ? (
              <Card className="p-8 text-center bg-white border-0 shadow-sm">
                <p className="text-sm text-gray-500">
                  No holdings yet. Add transactions to see your portfolio.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {sortedHoldings.map(holding => (
                  <HoldingCard
                    key={holding.id}
                    holding={holding}
                    displayMode={holdingsDisplayMode}
                    onSelect={setSelectedHolding}
                  />
                ))}
              </div>
            )}
          </div>
        </ContentSection>
      </div>

        {/* Holding Detail Modal */}
        <HoldingDetailModal
          holding={selectedHolding}
          onClose={() => setSelectedHolding(null)}
        />
      </PageContainer>
    </PullToRefresh>
  );
}
