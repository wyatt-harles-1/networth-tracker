import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
  formattedDate: string;
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

interface PortfolioPerformanceChartProps {
  data: Array<{ snapshot_date: string; holdings_value: number }>;
  timeRange: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y' | 'ALL';
  loading?: boolean;
}

export function PortfolioPerformanceChart({
  data,
  timeRange,
  loading = false,
}: PortfolioPerformanceChartProps) {
  const chartData: DataPoint[] = useMemo(() => {
    return data.map(point => ({
      date: point.snapshot_date,
      value: Number(point.holdings_value) || 0,
      formattedDate: new Date(point.snapshot_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: timeRange === '5Y' || timeRange === 'ALL' ? 'numeric' : undefined,
      }),
    }));
  }, [data, timeRange]);

  const metrics = useMemo(() => {
    if (chartData.length === 0) {
      return {
        currentValue: 0,
        startValue: 0,
        change: 0,
        changePercent: 0,
        isPositive: true,
      };
    }

    const currentValue = chartData[chartData.length - 1].value;
    const startValue = chartData[0].value;
    const change = currentValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;

    return {
      currentValue,
      startValue,
      change,
      changePercent,
      isPositive: change >= 0,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length && payload[0]) {
      const data = payload[0].payload;
      if (!data) return null;

      const formattedDate = data.formattedDate;
      const value = data.value;

      if (formattedDate === undefined || value === undefined) return null;

      return (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">{formattedDate}</p>
          <p className="text-lg font-bold">{formatCurrency(value)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full">
        {/* Loading Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-12 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="h-[300px] bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
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
      {/* Value Display & Change Badge */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-gray-600 font-medium mb-1">
            Portfolio Value
          </p>
          <h2 className="text-3xl font-bold text-gray-900">
            {formatCurrency(metrics.currentValue)}
          </h2>
        </div>
        <div
          className={`px-4 py-2 rounded-lg ${
            metrics.isPositive
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {metrics.isPositive ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <div className="text-right">
              <p
                className={`text-lg font-bold ${
                  metrics.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metrics.isPositive ? '+' : ''}
                {metrics.changePercent.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-600">
                {metrics.isPositive ? '+' : ''}
                {formatCurrency(metrics.change)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={metrics.isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={metrics.isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="formattedDate"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tick={{ fill: '#6b7280' }}
              tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#9ca3af', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={metrics.isPositive ? '#10b981' : '#ef4444'}
              strokeWidth={2.5}
              fill="url(#colorValue)"
              animationDuration={1000}
              animationEasing="ease-in-out"
              dot={false}
              activeDot={{
                r: 6,
                fill: metrics.isPositive ? '#10b981' : '#ef4444',
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Start and End Value Markers */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow"></div>
            <div>
              <p className="text-xs text-gray-500">Start</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(metrics.startValue)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs text-gray-500 text-right">Current</p>
              <p className="text-sm font-semibold text-gray-900 text-right">
                {formatCurrency(metrics.currentValue)}
              </p>
            </div>
            <div
              className={`h-3 w-3 rounded-full border-2 border-white shadow ${
                metrics.isPositive ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
