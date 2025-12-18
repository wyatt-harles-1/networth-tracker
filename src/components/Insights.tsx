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

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, PieChart, TrendingDown, BarChart3, LineChart, Receipt, Target, ChevronRight, ArrowLeft, Clock } from 'lucide-react';
import { usePageTitle } from '@/contexts/PageTitleContext';
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

// Tab configuration with icons, labels, and descriptions
const INSIGHT_TABS = [
  {
    id: 'allocations' as InsightsTab,
    icon: PieChart,
    label: 'Allocations',
    description: 'View your asset distribution across classes, sectors, and tax vehicles'
  },
  {
    id: 'gains' as InsightsTab,
    icon: TrendingDown,
    label: 'Gains Analysis',
    description: 'Analyze realized and unrealized gains with tax loss harvesting opportunities'
  },
  {
    id: 'performance' as InsightsTab,
    icon: LineChart,
    label: 'Performance',
    description: 'Track portfolio performance metrics and historical returns over time'
  },
  {
    id: 'projections' as InsightsTab,
    icon: Target,
    label: 'Projections',
    description: 'Forecast future portfolio value based on different growth scenarios'
  },
  {
    id: 'tax' as InsightsTab,
    icon: Receipt,
    label: 'Tax Impact',
    description: 'Estimate tax liabilities and find optimization opportunities'
  },
  {
    id: 'benchmarks' as InsightsTab,
    icon: BarChart3,
    label: 'Benchmarks',
    description: 'Compare your performance against market indices and benchmarks'
  },
];

/**
 * Insights page component
 */
export function InsightsNew() {
  const [selectedTab, setSelectedTab] = useState<InsightsTab | null>(null); // null = show grid
  const [selectedTimespan, setSelectedTimespan] = useState('1Y');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastViewedTimes, setLastViewedTimes] = useState<Record<string, Date>>({});
  const { setPageTitle } = usePageTitle();

  const {
    allocation,
    taxVehicleAllocation,
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

  // Reset page title when component unmounts
  useEffect(() => {
    return () => {
      setPageTitle(null);
    };
  }, [setPageTitle]);

  // Handle tab selection with transition
  const handleTabSelect = (tabId: InsightsTab) => {
    setIsTransitioning(true);
    const selectedTabInfo = INSIGHT_TABS.find(tab => tab.id === tabId);
    setTimeout(() => {
      setSelectedTab(tabId);
      setLastViewedTimes(prev => ({ ...prev, [tabId]: new Date() }));
      // Update mobile top bar title
      if (selectedTabInfo) {
        setPageTitle(selectedTabInfo.label);
      }
      setIsTransitioning(false);
    }, 200);
  };

  // Handle back to grid with transition
  const handleBackToGrid = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedTab(null);
      // Reset to default "Insights" title
      setPageTitle(null);
      setIsTransitioning(false);
    }, 200);
  };

  // Calculate time since last viewed
  const getTimeSinceViewed = (tabId: string) => {
    const lastViewed = lastViewedTimes[tabId];
    if (!lastViewed) return null;

    const now = new Date();
    const diffMs = now.getTime() - lastViewed.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

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

  // Show grid view if no tab selected
  if (selectedTab === null) {
    return (
      <div
        className={cn(
          "p-4 pb-20 transition-opacity duration-200",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      >
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

          {/* Grid Cards - Option 5 with Enhancements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INSIGHT_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const timeSinceViewed = getTimeSinceViewed(tab.id);
              const isLoading = loading;

              return (
                <Card
                  key={tab.id}
                  className={cn(
                    "p-5 bg-white border border-gray-200 cursor-pointer group relative overflow-hidden",
                    "hover:border-blue-300 hover:shadow-lg hover:scale-[1.02]",
                    "transition-all duration-300 ease-out",
                    "animate-in fade-in slide-in-from-bottom-4"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: 'both'
                  }}
                  onClick={() => handleTabSelect(tab.id)}
                >
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                  {/* Recently viewed badge */}
                  {timeSinceViewed && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
                      <Clock className="h-3 w-3 text-blue-600" />
                      <span className="text-[10px] font-medium text-blue-600">
                        {timeSinceViewed}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-blue-100 transition-all duration-300">
                      <Icon className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>

                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {tab.label}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-3">
                    {tab.description}
                  </p>

                  {/* Loading skeleton for metrics */}
                  {isLoading && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Keyframes for animations */}
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-in-from-bottom-4 {
            from { transform: translateY(1rem); }
            to { transform: translateY(0); }
          }
          .animate-in {
            animation: fade-in 0.5s ease-out, slide-in-from-bottom-4 0.5s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Get selected tab info for breadcrumb
  const currentTab = INSIGHT_TABS.find(tab => tab.id === selectedTab);

  return (
    <div
      className={cn(
        "p-4 pb-20 transition-opacity duration-200",
        isTransitioning ? "opacity-0" : "opacity-100"
      )}
    >
      <div className="space-y-6">
        {/* Breadcrumb Header */}
        <div className="animate-in fade-in slide-in-from-top-4" style={{ animationDuration: '300ms' }}>
          <button
            onClick={handleBackToGrid}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-3 transition-all hover:gap-3 duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Insights</span>
          </button>
          <div className="flex items-center gap-3">
            {currentTab && (
              <>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <currentTab.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentTab.label}
                  </h2>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab Content with fade in */}
        <div
          className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4"
          style={{ animationDuration: '400ms', animationDelay: '100ms', animationFillMode: 'both' }}
        >
          {selectedTab === 'allocations' && (
            <AllocationsView
              allocation={allocation}
              taxVehicleAllocation={taxVehicleAllocation}
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
