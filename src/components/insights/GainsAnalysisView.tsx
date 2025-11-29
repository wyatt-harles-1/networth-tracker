import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GainsDataPoint {
  time: string;
  portfolio: number;
  costBasis: number;
}

interface UnrealizedGain {
  name: string;
  value: number;
  costBasis: number;
  unrealizedGain: number;
  percentage: number;
  color: string;
}

interface RealizedGain {
  symbol: string;
  transactionDate: string;
  quantitySold: number;
  salePrice: number;
  costBasis: number;
  saleValue: number;
  realizedGain: number;
  percentage: number;
  holdingPeriod: number; // days
}

interface GainsAnalysisViewProps {
  benchmarkData: GainsDataPoint[];
  unrealizedGains: UnrealizedGain[];
  realizedGains?: RealizedGain[];
  totalRealizedGain?: number;
  selectedTimespan: string;
  onTimespanChange: (timespan: string) => void;
}

interface ChartDataPoint {
  time: string;
  portfolio: number;
  costBasis: number;
  gain: number;
  greenFill: number;
  redFill: number;
  baseLevel: number;
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

const timeSpans = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'];

export function GainsAnalysisView({
  benchmarkData,
  unrealizedGains,
  realizedGains = [],
  totalRealizedGain = 0,
  selectedTimespan,
  onTimespanChange,
}: GainsAnalysisViewProps) {
  // Calculate total metrics
  const totalCostBasis = unrealizedGains.reduce(
    (sum, item) => sum + item.costBasis,
    0
  );
  const totalCurrentValue = unrealizedGains.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const totalUnrealizedGain = totalCurrentValue - totalCostBasis;
  const totalUnrealizedGainPercent =
    totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0;

  // Process benchmark data for the chart
  const chartData: ChartDataPoint[] = benchmarkData.map(point => {
    const isGain = point.portfolio >= point.costBasis;
    return {
      ...point,
      gain: point.portfolio - point.costBasis,
      greenFill: isGain ? point.portfolio - point.costBasis : 0,
      redFill: !isGain ? point.costBasis - point.portfolio : 0,
      baseLevel: Math.min(point.portfolio, point.costBasis),
    };
  });

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;

      const unrealizedGain = data.portfolio - data.costBasis;
      const isGain = unrealizedGain >= 0;

      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 min-w-[220px]">
          <p className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            {data.time}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-600 rounded"></div>
                <span className="text-sm text-gray-600">Market Value:</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(data.portfolio)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-orange-500 rounded"></div>
                <span className="text-sm text-gray-600">Cost Basis:</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(data.costBasis)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">Unrealized:</span>
              <span
                className={`text-sm font-semibold ${
                  isGain ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isGain ? '+' : ''}
                {formatCurrency(unrealizedGain)}
              </span>
            </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white shadow-md border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-600 mb-1">Total Market Value</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalCurrentValue)}
          </p>
        </Card>
        <Card className="p-4 bg-white shadow-md border-l-4 border-l-orange-500">
          <p className="text-sm text-gray-600 mb-1">Total Cost Basis</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalCostBasis)}
          </p>
        </Card>
        <Card
          className={`p-4 shadow-md border-l-4 ${totalUnrealizedGain >= 0 ? 'bg-green-50 border-l-green-500' : 'bg-red-50 border-l-red-500'}`}
        >
          <p className="text-sm text-gray-600 mb-1">Unrealized Gain/Loss</p>
          <div className="flex items-center gap-2">
            {totalUnrealizedGain >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <p
              className={`text-2xl font-bold ${totalUnrealizedGain >= 0 ? 'text-green-700' : 'text-red-700'}`}
            >
              {totalUnrealizedGain >= 0 ? '+' : ''}
              {formatCurrency(totalUnrealizedGain)}
            </p>
          </div>
        </Card>
        <Card
          className={`p-4 shadow-md border-l-4 ${totalUnrealizedGainPercent >= 0 ? 'bg-green-50 border-l-green-500' : 'bg-red-50 border-l-red-500'}`}
        >
          <p className="text-sm text-gray-600 mb-1">Return on Investment</p>
          <p
            className={`text-2xl font-bold ${totalUnrealizedGainPercent >= 0 ? 'text-green-700' : 'text-red-700'}`}
          >
            {totalUnrealizedGainPercent >= 0 ? '+' : ''}
            {totalUnrealizedGainPercent.toFixed(2)}%
          </p>
        </Card>
      </div>

      {/* Cost Basis vs Market Value Chart */}
      <Card className="p-6 bg-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Portfolio Value vs Cost Basis Over Time
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-600 rounded"></div>
              <span className="text-gray-600">Market Value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-500 rounded"></div>
              <span className="text-gray-600">Cost Basis</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
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

            {/* Base area (invisible, for stacking) */}
            <Area
              type="monotone"
              dataKey="baseLevel"
              stackId="1"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
            />

            {/* Green area for gains */}
            <Area
              type="monotone"
              dataKey="greenFill"
              stackId="1"
              stroke="none"
              fill="url(#positiveGradient)"
              isAnimationActive={false}
            />

            {/* Red area for losses */}
            <Area
              type="monotone"
              dataKey="redFill"
              stackId="1"
              stroke="none"
              fill="url(#negativeGradient)"
              isAnimationActive={false}
            />

            {/* Market Value Line */}
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="#2563EB"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#2563EB',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />

            {/* Cost Basis Line */}
            <Line
              type="monotone"
              dataKey="costBasis"
              stroke="#F97316"
              strokeWidth={3}
              dot={false}
              strokeDasharray="6 4"
              activeDot={{
                r: 6,
                fill: '#F97316',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Unrealized Gains by Holding */}
      {unrealizedGains.length > 0 && (
        <Card className="p-6 bg-white shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Unrealized Gains/Losses by Asset Class
          </h3>
          <div className="space-y-3">
            {unrealizedGains
              .sort((a, b) => b.unrealizedGain - a.unrealizedGain)
              .map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Cost Basis: {formatCurrency(item.costBasis)} • Current:{' '}
                        {formatCurrency(item.value)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold flex items-center gap-1 ${
                        item.unrealizedGain >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {item.unrealizedGain >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {item.unrealizedGain >= 0 ? '+' : ''}
                      {formatCurrency(item.unrealizedGain)}
                    </p>
                    <p
                      className={`text-xs ${
                        item.unrealizedGain >= 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {item.unrealizedGain >= 0 ? '+' : ''}
                      {item.percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Realized Gains Section */}
      {realizedGains.length > 0 && (
        <Card className="p-6 bg-white shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Realized Gains/Losses (FIFO)
            </h3>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Total Realized</p>
              <p
                className={`text-xl font-bold ${
                  totalRealizedGain >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {totalRealizedGain >= 0 ? '+' : ''}
                {formatCurrency(totalRealizedGain)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date Sold
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sale Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cost Basis
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sale Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Gain/Loss
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    %
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Term
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {realizedGains
                  .sort(
                    (a, b) =>
                      new Date(b.transactionDate).getTime() -
                      new Date(a.transactionDate).getTime()
                  )
                  .map((gain, index) => {
                    const isLongTerm = gain.holdingPeriod > 365;
                    const isGain = gain.realizedGain >= 0;

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {gain.symbol}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(gain.transactionDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {gain.quantitySold.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatCurrency(gain.salePrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(gain.costBasis)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(gain.saleValue)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            isGain ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isGain ? '+' : ''}
                          {formatCurrency(gain.realizedGain)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            isGain ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isGain ? '+' : ''}
                          {gain.percentage.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isLongTerm
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {isLongTerm ? 'Long' : 'Short'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">ℹ️</div>
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">FIFO Cost Basis Method</p>
                <p className="text-blue-700">
                  Realized gains are calculated using First-In-First-Out (FIFO) lot tracking.
                  <span className="font-medium"> Short-term</span> gains (held ≤1 year) and
                  <span className="font-medium"> long-term</span> gains (held &gt;1 year) are
                  identified for tax purposes.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
