import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

interface PerformanceDataPoint {
  time: string;
  portfolio: number;
}

interface PerformanceMetrics {
  change: string;
  percentage: string;
  high: string;
  low: string;
  period: string;
}

interface PerformanceViewProps {
  performanceData: PerformanceDataPoint[];
  performanceMetrics: PerformanceMetrics;
  selectedTimespan: string;
  onTimespanChange: (timespan: string) => void;
}

/**
 * Recharts Tooltip props
 * Used for custom tooltip components in charts
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: PerformanceDataPoint;
    [key: string]: unknown;
  }>;
}

const timeSpans = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'];

export function PerformanceView({
  performanceData,
  performanceMetrics,
  selectedTimespan,
  onTimespanChange,
}: PerformanceViewProps) {
  // Calculate additional metrics
  const values = performanceData.map(d => d.portfolio);
  const currentValue = values[values.length - 1] || 0;
  const startValue = values[0] || 0;
  const changeValue = currentValue - startValue;
  const changePercent = startValue > 0 ? (changeValue / startValue) * 100 : 0;
  const isPositive = changeValue >= 0;

  // Calculate volatility (standard deviation)
  const calculateVolatility = () => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);
    return (stdDev / mean) * 100; // As percentage
  };

  const volatility = calculateVolatility();

  // Calculate max drawdown
  const calculateMaxDrawdown = () => {
    let maxDrawdown = 0;
    let peak = values[0];

    for (const value of values) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = ((peak - value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  };

  const maxDrawdown = calculateMaxDrawdown();

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;

      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-semibold text-gray-900">{data.time}</p>
          </div>
          <p className="text-lg font-bold text-blue-600">
            {formatCurrency(data.portfolio)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2 flex-wrap">
        {timeSpans.map(span => (
          <Button
            key={span}
            variant="ghost"
            size="sm"
            onClick={() => onTimespanChange(span)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all',
              selectedTimespan === span
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {span}
          </Button>
        ))}
      </div>

      {/* Performance Chart */}
      <Card className="p-6 bg-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Portfolio Performance Over Time
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {performanceMetrics.period}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span
                className={`text-2xl font-bold ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositive ? '+' : ''}
                {changePercent.toFixed(2)}%
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {isPositive ? '+' : ''}
              {formatCurrency(changeValue)}
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={performanceData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isPositive ? '#10B981' : '#EF4444'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isPositive ? '#10B981' : '#EF4444'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickMargin={8}
            />
            <YAxis
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={value => {
                if (value >= 1000000)
                  return `$${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                return `$${value}`;
              }}
              width={65}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#9ca3af',
                strokeWidth: 1,
                strokeDasharray: '5 5',
              }}
            />
            <ReferenceLine
              y={startValue}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: isPositive ? '#10B981' : '#EF4444',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
              fill="url(#colorGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`p-4 shadow-md border-l-4 ${isPositive ? 'bg-green-50 border-l-green-500' : 'bg-red-50 border-l-red-500'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Return</p>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}
          >
            {performanceMetrics.percentage}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {performanceMetrics.change}
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Period High</p>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {performanceMetrics.high}
          </p>
          <p className="text-xs text-gray-600 mt-1">Highest value reached</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 shadow-md border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Period Low</p>
            <TrendingDown className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-700">
            {performanceMetrics.low}
          </p>
          <p className="text-xs text-gray-600 mt-1">Lowest value reached</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 shadow-md border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Volatility</p>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">
            {volatility.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {volatility < 10 ? 'Low' : volatility < 20 ? 'Moderate' : 'High'}{' '}
            risk
          </p>
        </Card>
      </div>

      {/* Additional Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 bg-white shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Maximum Drawdown
            </h3>
          </div>
          <p className="text-3xl font-bold text-red-600 mb-2">
            -{maxDrawdown.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-600">
            The largest peak-to-trough decline during the selected period. Lower
            is better.
          </p>
        </Card>

        <Card className="p-6 bg-white shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Risk Assessment
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Volatility Level:</span>
              <span
                className={`text-sm font-semibold ${
                  volatility < 10
                    ? 'text-green-600'
                    : volatility < 20
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {volatility < 10
                  ? 'Low Risk'
                  : volatility < 20
                    ? 'Moderate Risk'
                    : 'High Risk'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Max Drawdown:</span>
              <span
                className={`text-sm font-semibold ${
                  maxDrawdown < 10
                    ? 'text-green-600'
                    : maxDrawdown < 25
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {maxDrawdown < 10
                  ? 'Excellent'
                  : maxDrawdown < 25
                    ? 'Good'
                    : 'Concerning'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Return Quality:</span>
              <span
                className={`text-sm font-semibold ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositive ? 'Positive' : 'Negative'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Starting Value</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(startValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Value</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(currentValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Change</p>
            <p
              className={`text-xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {isPositive ? '+' : ''}
              {formatCurrency(changeValue)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
