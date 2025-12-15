import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { SkeletonChart } from './ui/skeletons';

interface DataPoint {
  timestamp: string;
  value: number;
  formattedDate: string;
  formattedTime: string;
}

/**
 * Recharts Tooltip props
 * Used for custom tooltip components in charts
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: DataPoint;
    [key: string]: unknown;
  }>;
}

interface LiveStockChartProps {
  data: Array<{ snapshot_date: string; holdings_value: number }>;
  timeRange: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y' | 'ALL';
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  currentValue?: number; // Optional: actual current portfolio value (overrides last snapshot)
  averageCost?: number; // Optional: average cost basis per share (for holdings chart)
  onTimeRangeChange?: (range: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y' | 'ALL') => void;
}

export function LiveStockChart({
  data,
  timeRange,
  loading = false,
  currentValue: propCurrentValue,
  averageCost,
  onTimeRangeChange,
}: LiveStockChartProps) {
  // Generate unique gradient ID to avoid conflicts between multiple charts
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  // Transform and prepare chart data
  const chartData: DataPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map(point => {
      const date = new Date(point.snapshot_date);

      // Format date based on time range
      let formattedDate: string;
      let formattedTime: string;

      if (timeRange === '1D') {
        formattedDate = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        formattedTime = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      } else if (timeRange === '1W') {
        // Format as "Mon 15"
        formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
        });
        formattedTime = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
      } else if (timeRange === '1M') {
        // Format as "Jan 15"
        formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        formattedTime = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
      } else if (timeRange === '3M' || timeRange === 'YTD') {
        // Format as "Jan 15"
        formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric' });
      } else if (timeRange === '5Y' || timeRange === 'ALL') {
        // Format as "Jan '24"
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.toLocaleDateString('en-US', { year: '2-digit' });
        formattedDate = `${month} '${year}`;
        formattedTime = '';
      } else {
        // 1Y - Format as "Jan 15"
        formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        formattedTime = '';
      }

      return {
        timestamp: point.snapshot_date,
        value: Number(point.holdings_value) || 0,
        formattedDate,
        formattedTime,
      };
    });
  }, [data, timeRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (chartData.length === 0) {
      return {
        currentValue: 0,
        startValue: 0,
        change: 0,
        changePercent: 0,
        isPositive: true,
        periodHigh: 0,
        periodLow: 0,
      };
    }

    // Use prop currentValue if provided, otherwise use last chart data point
    // Round to 2 decimal places first to ensure displayed values match the calculation
    const currentValue = Math.round((propCurrentValue ?? chartData[chartData.length - 1].value) * 100) / 100;
    const startValue = Math.round(chartData[0].value * 100) / 100;
    const change = currentValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;

    // Calculate period high and low
    const values = chartData.map(d => d.value);
    const periodHigh = Math.max(...values);
    const periodLow = Math.min(...values);

    const isPositive = change >= 0;

    // Debug logging
    console.log('[LiveStockChart] Metrics calculation:', {
      startValue,
      currentValue,
      change,
      changePercent: changePercent.toFixed(2) + '%',
      isPositive,
      dataPoints: chartData.length,
    });

    return {
      currentValue,
      startValue,
      change,
      changePercent,
      isPositive,
      periodHigh,
      periodLow,
    };
  }, [chartData, propCurrentValue]);

  // Calculate nice Y-axis domain and ticks
  const yAxisConfig = useMemo(() => {
    if (chartData.length === 0) {
      return { domain: [0, 1000], ticks: [0, 250, 500, 750, 1000] };
    }

    const values = chartData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;

    // Smart Dynamic Range: Ensure minimum 15% visible range for honest perspective
    const minimumRangePercent = 0.15; // 15% minimum visible range
    const minimumRange = maxValue * minimumRangePercent;

    let rawMin: number;
    let rawMax: number;

    if (range < minimumRange) {
      // Small fluctuation - show at least 15% range centered on data
      const center = (maxValue + minValue) / 2;
      const halfRange = minimumRange / 2;
      rawMin = Math.max(0, center - halfRange);
      rawMax = center + halfRange;
    } else {
      // Normal dynamic range with 10% padding
      const padding = range * 0.1 || maxValue * 0.1 || 100;
      rawMin = Math.max(0, minValue - padding);
      rawMax = maxValue + padding;
    }

    // Calculate nice round numbers for domain
    const getRoundNumber = (value: number, roundUp: boolean) => {
      if (value === 0) return 0;

      const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
      const normalized = value / magnitude;

      let roundedNormalized;
      if (roundUp) {
        if (normalized <= 1) roundedNormalized = 1;
        else if (normalized <= 2) roundedNormalized = 2;
        else if (normalized <= 5) roundedNormalized = 5;
        else roundedNormalized = 10;
      } else {
        if (normalized < 1) roundedNormalized = 1;
        else if (normalized < 2) roundedNormalized = 1;
        else if (normalized < 5) roundedNormalized = 2;
        else if (normalized < 10) roundedNormalized = 5;
        else roundedNormalized = 10;
      }

      return roundedNormalized * magnitude;
    };

    const domainMin = getRoundNumber(rawMin, false);
    const domainMax = getRoundNumber(rawMax, true);
    const domainRange = domainMax - domainMin;

    // Calculate step size for 5 tick marks
    const stepMagnitude = Math.pow(10, Math.floor(Math.log10(domainRange / 4)));
    const normalizedStep = domainRange / 4 / stepMagnitude;

    let step;
    if (normalizedStep <= 1) step = stepMagnitude;
    else if (normalizedStep <= 2) step = 2 * stepMagnitude;
    else if (normalizedStep <= 5) step = 5 * stepMagnitude;
    else step = 10 * stepMagnitude;

    // Generate ticks
    const ticks: number[] = [];
    let currentTick = Math.ceil(domainMin / step) * step;
    while (currentTick <= domainMax) {
      ticks.push(currentTick);
      currentTick += step;
    }

    // Ensure we have at least 4 ticks
    if (ticks.length < 4) {
      return {
        domain: [domainMin, domainMax],
        ticks: [
          domainMin,
          domainMin + domainRange * 0.33,
          domainMin + domainRange * 0.67,
          domainMax,
        ],
      };
    }

    return {
      domain: [domainMin, domainMax],
      ticks,
    };
  }, [chartData]);

  // Calculate X-axis tick indices for consistent spacing
  const xAxisConfig = useMemo(() => {
    if (chartData.length === 0) return { tickCount: 5, interval: 0 };

    const dataLength = chartData.length;
    let targetTicks: number;

    // Determine target number of ticks based on time range
    if (timeRange === '1D') {
      targetTicks = Math.min(8, dataLength); // Show hourly ticks for 1 day
    } else if (timeRange === '1W') {
      targetTicks = Math.min(7, dataLength); // Show daily ticks for 1 week
    } else if (timeRange === '1M') {
      targetTicks = Math.min(6, dataLength); // ~5 days apart for 1 month
    } else if (timeRange === '3M') {
      targetTicks = Math.min(6, dataLength); // ~15 days apart
    } else if (timeRange === 'YTD') {
      targetTicks = Math.min(7, dataLength); // ~1 month apart
    } else if (timeRange === '1Y') {
      targetTicks = Math.min(7, dataLength); // ~2 months apart
    } else if (timeRange === '5Y') {
      targetTicks = Math.min(8, dataLength); // ~7-8 months apart
    } else {
      targetTicks = Math.min(8, dataLength); // For ALL, show more points
    }

    // Calculate interval to show approximately targetTicks
    const interval = Math.max(
      0,
      Math.floor(dataLength / (targetTicks - 1)) - 1
    );

    return {
      tickCount: targetTicks,
      interval,
    };
  }, [chartData.length, timeRange]);

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length && payload[0]) {
      const data = payload[0].payload;
      if (!data) return null;

      const formattedDate = data.formattedDate;
      const formattedTime = data.formattedTime;
      const value = data.value;

      if (formattedDate === undefined || value === undefined) return null;

      return (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-2xl border border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-3 w-3 text-blue-400" />
            <p className="text-xs font-semibold text-gray-300">
              {formattedDate}
            </p>
          </div>
          {formattedTime && (
            <p className="text-xs text-gray-400 mb-2">{formattedTime}</p>
          )}
          <p className="text-lg font-bold text-white">
            {formatCurrency(value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <SkeletonChart />;
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-gray-500 bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-200">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium text-gray-600">
            No Historical Data
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Add transactions to see your portfolio performance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart */}
      <div className="w-full">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 45 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={metrics.isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor={metrics.isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              vertical={false}
              horizontal={true}
            />
            <XAxis
              dataKey="formattedDate"
              stroke="#9ca3af"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tick={{ fill: '#6b7280', angle: -45, textAnchor: 'end' }}
              interval={xAxisConfig.interval}
              minTickGap={50}
              height={60}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tick={{ fill: '#6b7280' }}
              tickFormatter={value => {
                if (value >= 1000000)
                  return `$${(value / 1000000).toFixed(1)}M`;
                if (value >= 100000) return `$${(value / 1000).toFixed(0)}k`;
                if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                return `$${value.toFixed(0)}`;
              }}
              domain={yAxisConfig.domain}
              ticks={yAxisConfig.ticks}
              width={60}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#9ca3af',
                strokeWidth: 1,
                strokeDasharray: '5 5',
              }}
            />
            {averageCost && (
              <ReferenceLine
                y={averageCost}
                stroke="#3b82f6"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Pos: ${formatCurrency(averageCost)}`,
                  position: 'insideTopRight',
                  fill: '#1e3a8a',
                  fontSize: 12,
                  fontWeight: 700,
                  style: {
                    backgroundColor: '#dbeafe',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  },
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={metrics.isPositive ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={300}
              animationEasing="ease-in-out"
              dot={false}
              activeDot={{
                r: 4,
                fill: metrics.isPositive ? '#10b981' : '#ef4444',
                stroke: '#fff',
                strokeWidth: 2,
              }}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Chart Footer */}
        <div className="flex items-center justify-between -mt-10">
          <div className="text-xs text-gray-500">
            Showing {chartData.length} data points
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-600">
                Open: {formatCurrency(metrics.startValue)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${metrics.isPositive ? 'bg-green-500' : 'bg-red-500'}`}
              ></div>
              <span className="text-xs text-gray-600">
                Current: {formatCurrency(metrics.currentValue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
