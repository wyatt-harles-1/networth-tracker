import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';

interface PerformanceDataPoint {
  time: string;
  portfolio: number;
}

interface BenchmarkViewProps {
  performanceData: PerformanceDataPoint[];
  selectedTimespan: string;
  onTimespanChange: (timespan: string) => void;
}

interface BenchmarkData {
  id: string;
  name: string;
  description: string;
  color: string;
  enabled: boolean;
}

interface ChartDataPoint {
  time: string;
  portfolio: number;
  sp500?: number;
  nasdaq?: number;
  bonds?: number;
  balanced?: number;
  [key: string]: string | number | undefined;
}

interface BenchmarkMetric {
  return: number;
  value: number;
  label: string;
  color: string;
  outperformance: number;
}

/**
 * Recharts Tooltip props
 * Used for custom tooltip components in charts
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    name?: string;
    color?: string;
    payload?: ChartDataPoint;
    [key: string]: unknown;
  }>;
}

const BENCHMARKS: BenchmarkData[] = [
  {
    id: 'sp500',
    name: 'S&P 500',
    description: 'Large-cap US stocks',
    color: '#3B82F6',
    enabled: true,
  },
  {
    id: 'nasdaq',
    name: 'NASDAQ-100',
    description: 'Technology-heavy index',
    color: '#8B5CF6',
    enabled: false,
  },
  {
    id: 'bonds',
    name: 'US Bonds',
    description: 'Aggregate bond index',
    color: '#10B981',
    enabled: false,
  },
  {
    id: 'balanced',
    name: '60/40 Portfolio',
    description: '60% stocks, 40% bonds',
    color: '#F59E0B',
    enabled: true,
  },
];

const timeSpans = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'];

// Mock benchmark returns (annualized) - in production, fetch from API
const BENCHMARK_RETURNS: Record<string, Record<string, number>> = {
  '1M': { sp500: 0.02, nasdaq: 0.025, bonds: 0.003, balanced: 0.012 },
  '3M': { sp500: 0.08, nasdaq: 0.1, bonds: 0.01, balanced: 0.05 },
  '6M': { sp500: 0.12, nasdaq: 0.15, bonds: 0.02, balanced: 0.075 },
  '1Y': { sp500: 0.18, nasdaq: 0.22, bonds: 0.03, balanced: 0.11 },
  '3Y': { sp500: 0.35, nasdaq: 0.42, bonds: 0.08, balanced: 0.22 },
  '5Y': { sp500: 0.65, nasdaq: 0.8, bonds: 0.12, balanced: 0.4 },
  ALL: { sp500: 1.2, nasdaq: 1.5, bonds: 0.25, balanced: 0.75 },
};

export function BenchmarkView({
  performanceData,
  selectedTimespan,
  onTimespanChange,
}: BenchmarkViewProps) {
  const [activeBenchmarks, setActiveBenchmarks] = useState<string[]>([
    'sp500',
    'balanced',
  ]);

  // Generate benchmark data based on portfolio data
  const chartData = useMemo(() => {
    if (performanceData.length === 0) return [];

    const startValue = performanceData[0].portfolio;

    return performanceData.map((point, index) => {
      const progress = index / (performanceData.length - 1);
      const data: ChartDataPoint = {
        time: point.time,
        portfolio: point.portfolio,
      };

      // Generate benchmark values
      BENCHMARKS.forEach(benchmark => {
        if (activeBenchmarks.includes(benchmark.id)) {
          const totalReturn =
            BENCHMARK_RETURNS[selectedTimespan]?.[benchmark.id] || 0;
          const currentReturn = 1 + totalReturn * progress;
          data[benchmark.id] = startValue * currentReturn;
        }
      });

      return data;
    });
  }, [performanceData, activeBenchmarks, selectedTimespan]);

  // Calculate performance metrics
  const metrics = useMemo(() => {
    if (chartData.length === 0) {
      return {
        portfolio: { return: 0, value: 0, label: 'Your Portfolio' },
        benchmarks: {},
      };
    }

    const startValue = chartData[0].portfolio;
    const endValue = chartData[chartData.length - 1].portfolio;
    const portfolioReturn = ((endValue - startValue) / startValue) * 100;

    const benchmarkMetrics: Record<string, BenchmarkMetric> = {};

    BENCHMARKS.forEach(benchmark => {
      if (activeBenchmarks.includes(benchmark.id)) {
        const lastDataPoint = chartData[chartData.length - 1];
        const benchmarkEndValue = lastDataPoint[benchmark.id];
        if (
          benchmarkEndValue !== undefined &&
          typeof benchmarkEndValue === 'number'
        ) {
          const benchmarkReturn =
            ((benchmarkEndValue - startValue) / startValue) * 100;
          const outperformance = portfolioReturn - benchmarkReturn;

          benchmarkMetrics[benchmark.id] = {
            return: benchmarkReturn,
            value: benchmarkEndValue,
            label: benchmark.name,
            color: benchmark.color,
            outperformance,
          };
        }
      }
    });

    return {
      portfolio: {
        return: portfolioReturn,
        value: endValue,
        label: 'Your Portfolio',
      },
      benchmarks: benchmarkMetrics,
    };
  }, [chartData, activeBenchmarks]);

  const toggleBenchmark = (benchmarkId: string) => {
    setActiveBenchmarks(prev =>
      prev.includes(benchmarkId)
        ? prev.filter(id => id !== benchmarkId)
        : [...prev, benchmarkId]
    );
  };

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;

      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 min-w-[220px]">
          <p className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            {data.time}
          </p>
          <div className="space-y-2">
            {payload.map((entry, index) => {
              const value = entry.value;
              const name = entry.name;
              const color = entry.color;

              if (value === undefined || !name || !color) return null;

              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-0.5 rounded"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-xs text-gray-600">{name}:</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(value)}
                  </span>
                </div>
              );
            })}
          </div>
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

      {/* Benchmark Selector */}
      <Card className="p-4 bg-white shadow-md">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Compare Against
        </h3>
        <div className="flex flex-wrap gap-2">
          {BENCHMARKS.map(benchmark => (
            <button
              key={benchmark.id}
              onClick={() => toggleBenchmark(benchmark.id)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all border-2',
                activeBenchmarks.includes(benchmark.id)
                  ? 'border-current text-gray-900 shadow-sm'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}
              style={
                activeBenchmarks.includes(benchmark.id)
                  ? {
                      borderColor: benchmark.color,
                      backgroundColor: `${benchmark.color}15`,
                    }
                  : {}
              }
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: benchmark.color }}
                ></div>
                <div className="text-left">
                  <div className="font-semibold">{benchmark.name}</div>
                  <div className="text-xs opacity-75">
                    {benchmark.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Performance Comparison Chart */}
      <Card className="p-6 bg-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Portfolio vs Benchmarks
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Normalized to starting value
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="portfolioGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#1F2937" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1F2937" stopOpacity={0} />
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
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              wrapperStyle={{ paddingBottom: '20px' }}
            />

            {/* Portfolio Line */}
            <Line
              type="monotone"
              dataKey="portfolio"
              name="Your Portfolio"
              stroke="#1F2937"
              strokeWidth={4}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#1F2937',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />

            {/* Benchmark Lines */}
            {BENCHMARKS.filter(b => activeBenchmarks.includes(b.id)).map(
              benchmark => (
                <Line
                  key={benchmark.id}
                  type="monotone"
                  dataKey={benchmark.id}
                  name={benchmark.name}
                  stroke={benchmark.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: benchmark.color,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              )
            )}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Performance Metrics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Portfolio Performance */}
        <Card
          className={`p-5 shadow-md border-l-4 ${
            metrics.portfolio.return >= 0
              ? 'bg-green-50 border-l-green-500'
              : 'bg-red-50 border-l-red-500'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">
              Your Portfolio
            </h4>
            <Activity className="h-5 w-5 text-gray-600" />
          </div>
          <p
            className={`text-3xl font-bold ${
              metrics.portfolio.return >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {metrics.portfolio.return >= 0 ? '+' : ''}
            {metrics.portfolio.return.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {formatCurrency(metrics.portfolio.value)} current value
          </p>
        </Card>

        {/* Benchmark Comparisons */}
        {Object.entries(metrics.benchmarks).map(
          ([id, benchmark]: [string, BenchmarkMetric]) => {
            const isOutperforming = benchmark.outperformance > 0;
            return (
              <Card
                key={id}
                className="p-5 bg-white shadow-md border-l-4"
                style={{ borderLeftColor: benchmark.color }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {benchmark.label}
                  </h4>
                  {isOutperforming ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {benchmark.return >= 0 ? '+' : ''}
                  {benchmark.return.toFixed(2)}%
                </p>
                <p
                  className={`text-xs mt-1 font-medium ${
                    isOutperforming ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isOutperforming ? 'Outperforming' : 'Underperforming'} by{' '}
                  {Math.abs(benchmark.outperformance).toFixed(2)}%
                </p>
              </Card>
            );
          }
        )}
      </div>

      {/* Performance Analysis */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Performance Analysis
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Relative Performance
            </p>
            <p className="text-xs text-gray-600">
              {Object.values(metrics.benchmarks).every(
                (b: BenchmarkMetric) => b.outperformance > 0
              ) ? (
                <>
                  Your portfolio is{' '}
                  <span className="font-semibold text-green-700">
                    outperforming
                  </span>{' '}
                  all selected benchmarks for the {selectedTimespan} period.
                  Great job!
                </>
              ) : Object.values(metrics.benchmarks).some(
                  (b: BenchmarkMetric) => b.outperformance > 0
                ) ? (
                <>
                  Your portfolio is{' '}
                  <span className="font-semibold text-blue-700">mixed</span>{' '}
                  compared to benchmarks, outperforming some but trailing
                  others.
                </>
              ) : (
                <>
                  Your portfolio is{' '}
                  <span className="font-semibold text-red-700">
                    underperforming
                  </span>{' '}
                  compared to benchmarks. Consider reviewing your strategy.
                </>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Risk-Adjusted Returns
            </p>
            <p className="text-xs text-gray-600">
              Comparing raw returns doesn't account for risk. A diversified
              portfolio may have lower returns but also lower volatility, which
              can be appropriate depending on your goals and risk tolerance.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
