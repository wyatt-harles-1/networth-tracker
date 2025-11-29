import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LiveStockChart } from './LiveStockChart';
import { AccountBalanceHistoryPoint } from '@/services/accountMetricsService';

interface PerformanceChartContainerProps {
  title: string;
  data: AccountBalanceHistoryPoint[];
  timeRange: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y' | 'ALL';
  availableTimeRanges: readonly (
    | '1D'
    | '1W'
    | '1M'
    | '3M'
    | 'YTD'
    | '1Y'
    | '5Y'
    | 'ALL'
  )[];
  loading: boolean;
  refreshing: boolean;
  onTimeRangeChange: (
    range: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y' | 'ALL'
  ) => void;
  onRefresh: () => void;
  extraButton?: ReactNode;
  extraContent?: ReactNode;
  headerContent?: ReactNode;
}

export function PerformanceChartContainer({
  title,
  data,
  timeRange,
  availableTimeRanges,
  loading,
  refreshing,
  onTimeRangeChange,
  onRefresh,
  extraButton,
  extraContent,
  headerContent,
}: PerformanceChartContainerProps) {
  return (
    <div className="py-4 px-0">
      {headerContent && <div className="mb-4 px-4">{headerContent}</div>}
      <div className="space-y-3 mb-4 px-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {extraButton}
        </div>
        <div className="flex gap-1.5">
          {availableTimeRanges.map(range => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => onTimeRangeChange(range)}
              className={
                timeRange === range
                  ? 'text-xs px-2 py-1.5 h-auto flex-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  : 'text-xs px-2 py-1.5 h-auto flex-1 border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            >
              {range}
            </Button>
          ))}
        </div>
      </div>
      {extraContent}
      <LiveStockChart
        data={data}
        timeRange={timeRange}
        loading={loading}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </div>
  );
}
