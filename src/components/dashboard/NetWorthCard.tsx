/**
 * ============================================================================
 * NetWorthCard Component
 * ============================================================================
 *
 * Dashboard card displaying total net worth and percentage change.
 *
 * Features:
 * - Current net worth display
 * - Week-over-week percentage change
 * - Toggle visibility to hide/show amounts
 * - Refresh button to update data
 * - Click to navigate to portfolio page
 * - Loading state
 * - Fallback to real-time calculations if cached data unavailable
 *
 * Data Sources:
 * - Primary: Cached analytics data (faster)
 * - Fallback: Real-time portfolio calculations
 * - Historical: Portfolio snapshots for percentage change
 *
 * Display:
 * - Green indicator for positive change
 * - Red indicator for negative change
 * - Animated trend icon (up/down arrow)
 * - Last updated timestamp
 *
 * ============================================================================
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCachedAnalytics } from '@/hooks/useCachedAnalytics';
import { usePortfolioCalculations } from '@/hooks/usePortfolioCalculations';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { formatCurrency } from '@/lib/utils';

interface NetWorthCardProps {
  onNavigateToPortfolio?: () => void;
}

/**
 * Net worth summary card
 */
export function NetWorthCard({ onNavigateToPortfolio }: NetWorthCardProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const {
    performance,
    loading: analyticsLoading,
    refresh,
    lastUpdated,
  } = useCachedAnalytics();

  // Fallback to real-time calculations if no cached data
  const { portfolio, loading: portfolioLoading } = usePortfolioCalculations();
  const { getNetWorthHistory } = usePortfolioSnapshots();

  const history = getNetWorthHistory(7);
  const fallbackPercentageChange =
    history.length >= 2
      ? ((portfolio.netWorth - history[history.length - 1].netWorth) /
          Math.abs(history[history.length - 1].netWorth)) *
        100
      : 0;

  // Use cached analytics if available, otherwise use real-time calculation
  const totalValue = performance?.totalValue || portfolio.netWorth;
  const percentageChange =
    performance?.dayChangePercent || fallbackPercentageChange;
  const loading = analyticsLoading || portfolioLoading;

  if (loading) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </Card>
    );
  }

  return (
    <Card
      className="p-4 bg-white border-0 shadow-sm relative cursor-pointer hover:shadow-md transition-shadow"
      onClick={onNavigateToPortfolio}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs text-gray-500">Net Worth</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              refresh();
            }}
            className="p-1.5 h-auto rounded-lg hover:bg-gray-100"
            title="Refresh data"
          >
            <RefreshCw className="h-3 w-3 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              setIsVisible(!isVisible);
            }}
            className="p-1.5 h-auto rounded-lg hover:bg-gray-100"
          >
            {isVisible ? (
              <Eye className="h-4 w-4 text-gray-500" />
            ) : (
              <EyeOff className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900">
          {isVisible ? formatCurrency(totalValue) : '------'}
        </p>
        <div className="flex items-center mt-1">
          {percentageChange >= 0 ? (
            <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span
            className={`text-xs font-medium ${percentageChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}
          >
            {percentageChange >= 0 ? '+' : ''}
            {percentageChange.toFixed(2)}% this week
          </span>
        </div>
        {lastUpdated && (
          <p className="text-[10px] text-gray-400 mt-1">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
    </Card>
  );
}
