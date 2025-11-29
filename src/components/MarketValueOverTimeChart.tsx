import { useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency } from '@/lib/utils';
import { useMarketValueHistory } from '@/hooks/useMarketValueHistory';

interface TimeRange {
  label: string;
  days: number;
}

const timeRanges: TimeRange[] = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: 3650 },
];

interface ChartDataPoint {
  date: string;
  time: string;
  value: number;
  costBasis: number;
  gain: number;
}

/**
 * Recharts Tooltip props
 * Used for custom tooltip components in charts
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: ChartDataPoint;
    [key: string]: unknown;
  }>;
}

export function MarketValueOverTimeChart() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>(timeRanges[1]);

  const {
    history,
    loading,
    error,
    calculating,
    calculationJob,
    needsCalculation,
    hasTransactions,
    calculateHistoricalValues,
    getPerformanceMetrics,
  } = useMarketValueHistory(selectedRange.days);

  const metrics = getPerformanceMetrics();

  const chartData = useMemo(() => {
    return history.map(item => ({
      date: item.date,
      time: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(selectedRange.days > 180 ? { year: '2-digit' } : {}),
      }),
      value: item.totalValue,
      costBasis: item.totalCostBasis,
      gain: item.unrealizedGain + item.realizedGain,
    }));
  }, [history, selectedRange.days]);

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length && payload[0]) {
      const data = payload[0].payload;
      if (!data) return null;

      const date = data.date;
      const value = data.value;
      const costBasis = data.costBasis;
      const gain = data.gain;

      if (
        date === undefined ||
        value === undefined ||
        costBasis === undefined ||
        gain === undefined
      )
        return null;

      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {new Date(date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Market Value:{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrency(value)}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Cost Basis:{' '}
              <span className="font-medium text-gray-700">
                {formatCurrency(costBasis)}
              </span>
            </p>
            <p
              className={cn(
                'text-sm font-medium',
                gain >= 0 ? 'text-teal-600' : 'text-red-600'
              )}
            >
              Gain: {gain >= 0 ? '+' : ''}
              {formatCurrency(gain)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleCalculate = async () => {
    await calculateHistoricalValues();
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsCalculation) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Market Value Over Time
          </CardTitle>
          <CardDescription>
            Track your portfolio value progression over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Calculate Historical Values
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Generate your portfolio value history based on your transactions
                and historical market prices. This will enable performance
                tracking over time.
              </p>
              {hasTransactions === false && (
                <p className="text-sm text-orange-600 mt-3 font-medium">
                  No transactions found. Add investment transactions (stocks,
                  ETFs, crypto) in the Transactions tab to get started.
                </p>
              )}
              {error && error.includes('No') && (
                <p className="text-xs text-gray-500 mt-2">
                  Make sure your transactions include ticker symbols,
                  quantities, and prices in the transaction details.
                </p>
              )}
            </div>
            <Button
              onClick={handleCalculate}
              size="lg"
              className="mt-4"
              disabled={calculating || hasTransactions === false}
            >
              <RefreshCw
                className={cn('w-4 h-4 mr-2', calculating && 'animate-spin')}
              />
              Calculate Portfolio History
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (calculating) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            Calculating Portfolio Values
          </CardTitle>
          {calculationJob && (
            <CardDescription>
              Processing historical data from {calculationJob.startDate} to{' '}
              {calculationJob.endDate}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {calculationJob ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">
                    {calculationJob.progress}%
                  </span>
                </div>
                <Progress value={calculationJob.progress} className="h-2" />
              </div>
              <p className="text-xs text-gray-500 text-center">
                This may take a few moments...
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Market Value Over Time
              </CardTitle>
              <CardDescription>
                Updated as of {new Date().toLocaleDateString()}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCalculate}
              disabled={calculating}
              className="h-9"
            >
              <RefreshCw
                className={cn('w-4 h-4', calculating && 'animate-spin')}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Current Value</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(metrics.currentValue)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500">Period Change</p>
              <div className="flex items-center gap-1">
                {metrics.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <p
                  className={cn(
                    'text-xl font-bold',
                    metrics.change >= 0 ? 'text-teal-600' : 'text-red-600'
                  )}
                >
                  {metrics.change >= 0 ? '+' : ''}
                  {metrics.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500">Period High</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(metrics.allTimeHigh)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Period Gain
              </p>
              <p
                className={cn(
                  'text-xl font-bold',
                  metrics.totalGain >= 0 ? 'text-teal-600' : 'text-red-600'
                )}
              >
                {metrics.totalGain >= 0 ? '+' : ''}
                {formatCurrency(metrics.totalGain)}
              </p>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="valueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={metrics.change >= 0 ? '#10B981' : '#EF4444'}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={metrics.change >= 0 ? '#10B981' : '#EF4444'}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    interval="preserveStartEnd"
                    tickMargin={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
                    domain={['auto', 'auto']}
                    tickCount={6}
                    width={60}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={metrics.change >= 0 ? '#10B981' : '#EF4444'}
                    strokeWidth={3}
                    fill="url(#valueGradient)"
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: metrics.change >= 0 ? '#10B981' : '#EF4444',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {timeRanges.map(range => (
              <Button
                key={range.label}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRange(range)}
                className={cn(
                  'text-xs sm:text-sm px-3 py-2 h-auto rounded-full font-medium transition-all',
                  selectedRange.label === range.label
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-transparent text-gray-500 hover:bg-gray-100'
                )}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
