/**
 * ============================================================================
 * Insights Component
 * ============================================================================
 *
 * Advanced portfolio analytics and insights page with multiple analysis views.
 *
 * Features:
 * - Multiple insight tabs:
 *   - Allocations: Asset class, sector, and tax vehicle breakdown
 *   - Gains Analysis: Realized/unrealized gains and loss harvesting
 *   - Performance: Portfolio performance metrics and charts
 *   - Projections: Future value projections and scenarios
 *   - Tax Impact: Tax liability estimates and optimization
 *   - Benchmarks: Performance comparison vs market indices
 * - Time period selection (1M, 3M, 6M, 1Y, YTD, All)
 * - Interactive visualizations
 * - Empty state for new users
 * - Loading states
 *
 * Data Sources:
 * - useInsightsData: Allocation and gains data
 * - usePerformanceMetrics: Performance calculations and history
 *
 * Sub-components:
 * - AllocationsView: Pie charts for allocation breakdown
 * - GainsAnalysisView: Unrealized/realized gains tables
 * - PerformanceView: Performance charts and metrics
 * - ProjectionsView: Future value projections
 * - TaxImpactView: Tax estimates and optimization
 * - BenchmarkView: Index comparison charts
 *
 * ============================================================================
 */

import { useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useInsightsData } from '@/hooks/useInsightsData';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { AllocationsView } from './insights/AllocationsView';
import { GainsAnalysisView } from './insights/GainsAnalysisView';
import { PerformanceView } from './insights/PerformanceView';
import { ProjectionsView } from './insights/ProjectionsView';
import { TaxImpactView } from './insights/TaxImpactView';
import { BenchmarkView } from './insights/BenchmarkView';

// Available insight tab types
type InsightsTab =
  | 'allocations'
  | 'gains'
  | 'performance'
  | 'projections'
  | 'tax'
  | 'benchmarks';

/**
 * Insights page component
 */
export function InsightsNew() {
  const [selectedTab, setSelectedTab] = useState<InsightsTab>('allocations');
  const [selectedTimespan, setSelectedTimespan] = useState('1Y');

  const {
    allocation,
    totalValue,
    benchmarkData,
    unrealizedGains,
    realizedGains,
    totalRealizedGain,
    percentageChange,
    loading,
  } = useInsightsData();

  const { performanceData, performanceMetrics } =
    usePerformanceMetrics(selectedTimespan);

  if (loading) {
    return (
      <div className="p-4 pb-20 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (allocation.length === 0) {
    return (
      <div className="p-4 pb-20">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Portfolio Insights
          </h2>
          <p className="text-sm text-gray-600">
            Advanced analytics and metrics for your investment portfolio
          </p>
        </div>
        <Card className="p-8 bg-white border-0 shadow-sm text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Data Available Yet
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Start by adding accounts and holdings to see your portfolio
              insights and analytics.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Portfolio Insights
          </h2>
          <p className="text-sm text-gray-600">
            Advanced analytics and metrics for your investment portfolio
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab('allocations')}
            className={cn(
              'px-4 py-2 rounded-t-lg font-medium transition-all relative',
              selectedTab === 'allocations'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            Allocations
            {selectedTab === 'allocations' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab('gains')}
            className={cn(
              'px-4 py-2 rounded-t-lg font-medium transition-all relative',
              selectedTab === 'gains'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            Gains Analysis
            {selectedTab === 'gains' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab('performance')}
            className={cn(
              'px-4 py-2 rounded-t-lg font-medium transition-all relative',
              selectedTab === 'performance'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            Performance
            {selectedTab === 'performance' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab('projections')}
            className={cn(
              'px-4 py-2 rounded-t-lg font-medium transition-all relative',
              selectedTab === 'projections'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            Projections
            {selectedTab === 'projections' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab('tax')}
            className={cn(
              'px-4 py-2 rounded-t-lg font-medium transition-all relative',
              selectedTab === 'tax'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            Tax Impact
            {selectedTab === 'tax' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTab('benchmarks')}
            className={cn(
              'px-4 py-2 rounded-t-lg font-medium transition-all relative',
              selectedTab === 'benchmarks'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            Benchmarks
            {selectedTab === 'benchmarks' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </Button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {selectedTab === 'allocations' && (
            <AllocationsView
              allocation={allocation}
              totalValue={totalValue}
              percentageChange={percentageChange}
            />
          )}

          {selectedTab === 'gains' && (
            <GainsAnalysisView
              benchmarkData={benchmarkData}
              unrealizedGains={unrealizedGains.map(gain => ({
                ...gain,
                value: gain.currentValue,
              }))}
              realizedGains={realizedGains}
              totalRealizedGain={totalRealizedGain}
              selectedTimespan={selectedTimespan}
              onTimespanChange={setSelectedTimespan}
            />
          )}

          {selectedTab === 'performance' && (
            <PerformanceView
              performanceData={performanceData}
              performanceMetrics={performanceMetrics}
              selectedTimespan={selectedTimespan}
              onTimespanChange={setSelectedTimespan}
            />
          )}

          {selectedTab === 'projections' && (
            <ProjectionsView currentPortfolioValue={totalValue} />
          )}

          {selectedTab === 'tax' && (
            <TaxImpactView
              unrealizedGains={unrealizedGains.map(gain => ({
                ...gain,
                value: gain.currentValue,
              }))}
              totalValue={totalValue}
            />
          )}

          {selectedTab === 'benchmarks' && (
            <BenchmarkView
              performanceData={performanceData}
              selectedTimespan={selectedTimespan}
              onTimespanChange={setSelectedTimespan}
            />
          )}
        </div>
      </div>
    </div>
  );
}
