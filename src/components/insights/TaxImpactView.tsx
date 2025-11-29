import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingDown,
  AlertCircle,
  Lightbulb,
  PiggyBank,
} from 'lucide-react';

interface UnrealizedGain {
  name: string;
  value: number;
  costBasis: number;
  unrealizedGain: number;
  percentage: number;
  color: string;
}

interface TaxImpactViewProps {
  unrealizedGains: UnrealizedGain[];
  totalValue: number;
}

/**
 * Recharts Tooltip props for BarChart
 * Used for custom tooltip components in charts
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: {
      type?: string;
      name?: string;
      rate?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
}

// Tax brackets for 2024 (single filer) - simplified
const TAX_BRACKETS = {
  shortTerm: [
    { min: 0, max: 11600, rate: 0.1 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  longTerm: [
    { min: 0, max: 47025, rate: 0.0 },
    { min: 47025, max: 518900, rate: 0.15 },
    { min: 518900, max: Infinity, rate: 0.2 },
  ],
};

export function TaxImpactView({
  unrealizedGains,
  totalValue,
}: TaxImpactViewProps) {
  // Calculate tax metrics
  const taxMetrics = useMemo(() => {
    const totalUnrealizedGains = unrealizedGains.reduce(
      (sum, item) => sum + Math.max(0, item.unrealizedGain),
      0
    );
    const totalUnrealizedLosses = unrealizedGains.reduce(
      (sum, item) => sum + Math.min(0, item.unrealizedGain),
      0
    );

    // Calculate estimated short-term capital gains tax (assuming held < 1 year)
    const calculateTax = (
      gain: number,
      brackets: typeof TAX_BRACKETS.shortTerm
    ) => {
      let tax = 0;
      let remaining = gain;

      for (let i = 0; i < brackets.length; i++) {
        const bracket = brackets[i];
        const bracketSize = bracket.max - bracket.min;
        const taxableInBracket = Math.min(remaining, bracketSize);

        if (taxableInBracket > 0) {
          tax += taxableInBracket * bracket.rate;
          remaining -= taxableInBracket;
        }

        if (remaining <= 0) break;
      }

      return tax;
    };

    const shortTermTax = calculateTax(
      totalUnrealizedGains,
      TAX_BRACKETS.shortTerm
    );
    const longTermTax = calculateTax(
      totalUnrealizedGains,
      TAX_BRACKETS.longTerm
    );

    // Tax loss harvesting opportunity
    const taxLossHarvestingValue = Math.abs(totalUnrealizedLosses);
    const potentialTaxSavings = taxLossHarvestingValue * 0.24; // Assume 24% bracket

    return {
      totalUnrealizedGains,
      totalUnrealizedLosses,
      shortTermTax,
      longTermTax,
      taxSavings: shortTermTax - longTermTax,
      taxLossHarvestingValue,
      potentialTaxSavings,
      effectiveTaxRate:
        totalUnrealizedGains > 0
          ? (longTermTax / totalUnrealizedGains) * 100
          : 0,
    };
  }, [unrealizedGains]);

  // Prepare data for tax comparison chart
  const taxComparisonData = [
    {
      type: 'Short-Term',
      tax: taxMetrics.shortTermTax,
      rate: '10-37%',
    },
    {
      type: 'Long-Term',
      tax: taxMetrics.longTermTax,
      rate: '0-20%',
    },
  ];

  // Prepare data for gains/losses breakdown
  const gainsLossesData = unrealizedGains.map(item => ({
    name: item.name,
    gains: Math.max(0, item.unrealizedGain),
    losses: Math.abs(Math.min(0, item.unrealizedGain)),
    color: item.color,
  }));

  // Tax vehicle allocation (mock data - replace with real data)
  const taxVehicleData = [
    { name: 'Taxable Accounts', value: totalValue * 0.4, color: '#EF4444' },
    {
      name: 'Tax-Deferred (401k/IRA)',
      value: totalValue * 0.45,
      color: '#F59E0B',
    },
    { name: 'Tax-Free (Roth)', value: totalValue * 0.15, color: '#10B981' },
  ];

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      if (!data || data.value === undefined) return null;

      const payloadData = data.payload;
      const label = payloadData?.type || payloadData?.name || '';

      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
          <p className="text-lg font-bold text-blue-600">
            {formatCurrency(data.value)}
          </p>
          {payloadData?.rate && (
            <p className="text-xs text-gray-600 mt-1">
              Rate: {payloadData.rate}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const totalGains = gainsLossesData.reduce((sum, item) => sum + item.gains, 0);
  const totalLosses = gainsLossesData.reduce(
    (sum, item) => sum + item.losses,
    0
  );

  return (
    <div className="space-y-6">
      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-700 font-medium">
              Unrealized Gains
            </p>
            <TrendingDown className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(taxMetrics.totalUnrealizedGains)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Subject to capital gains tax
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 shadow-md border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-700 font-medium">Long-Term Tax</p>
            <DollarSign className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {formatCurrency(taxMetrics.longTermTax)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            If held &gt;1 year ({taxMetrics.effectiveTaxRate.toFixed(1)}% rate)
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 shadow-md border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-700 font-medium">Tax Savings</p>
            <PiggyBank className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(taxMetrics.taxSavings)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            By holding long-term vs short-term
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 shadow-md border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-700 font-medium">
              Harvesting Opportunity
            </p>
            <Lightbulb className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {formatCurrency(taxMetrics.potentialTaxSavings)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            From {formatCurrency(Math.abs(taxMetrics.totalUnrealizedLosses))} in
            losses
          </p>
        </Card>
      </div>

      {/* Tax Comparison Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tax Impact Comparison
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Estimated tax on unrealized gains if sold today
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taxComparisonData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f3f4f6"
                vertical={false}
              />
              <XAxis
                dataKey="type"
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={value => {
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                  return `$${value}`;
                }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tax" radius={[8, 8, 0, 0]}>
                {taxComparisonData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#EF4444' : '#10B981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Tax Vehicle Allocation */}
        <Card className="p-6 bg-white shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tax Vehicle Allocation
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Distribution across tax treatment types
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taxVehicleData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                cornerRadius={4}
              >
                {taxVehicleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => {
                  const item = taxVehicleData.find(d => d.name === value);
                  const percentage = item
                    ? ((item.value / totalValue) * 100).toFixed(1)
                    : '0';
                  return `${value} (${percentage}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Gains and Losses Breakdown */}
      <Card className="p-6 bg-white shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Unrealized Gains & Losses by Asset
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={gainsLossesData} layout="horizontal">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              horizontal={false}
            />
            <XAxis
              type="number"
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={value => {
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                if (value <= -1000)
                  return `-$${(Math.abs(value) / 1000).toFixed(0)}k`;
                return `$${value}`;
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              width={100}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(Math.abs(value))}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}
            />
            <Bar dataKey="gains" fill="#10B981" radius={[0, 4, 4, 0]} />
            <Bar dataKey="losses" fill="#EF4444" radius={[4, 0, 0, 4]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">
              Gains: {formatCurrency(totalGains)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">
              Losses: {formatCurrency(totalLosses)}
            </span>
          </div>
        </div>
      </Card>

      {/* Tax Optimization Strategies */}
      <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Tax Optimization Strategies
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              Tax Loss Harvesting
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              You have{' '}
              {formatCurrency(Math.abs(taxMetrics.totalUnrealizedLosses))} in
              unrealized losses that could offset gains.
            </p>
            <p className="text-xs text-gray-700 font-medium">
              Potential savings:{' '}
              {formatCurrency(taxMetrics.potentialTaxSavings)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-green-600" />
              Hold for Long-Term Rates
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              By holding assets for more than one year, you can reduce your tax
              rate significantly.
            </p>
            <p className="text-xs text-gray-700 font-medium">
              Potential savings: {formatCurrency(taxMetrics.taxSavings)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              Max Out Tax-Advantaged Accounts
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              Contribute to 401(k), IRA, and HSA accounts to reduce taxable
              income and defer taxes on growth.
            </p>
            <p className="text-xs text-gray-700 font-medium">
              Current allocation:{' '}
              {((taxVehicleData[1].value / totalValue) * 100).toFixed(1)}% in
              tax-deferred
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              Asset Location Strategy
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              Place tax-inefficient assets (bonds, REITs) in tax-advantaged
              accounts and tax-efficient assets (stocks) in taxable accounts.
            </p>
            <p className="text-xs text-gray-700 font-medium">
              Review your allocation for optimization
            </p>
          </div>
        </div>
      </Card>

      {/* Important Disclaimer */}
      <Card className="p-4 bg-blue-50 border-l-4 border-l-blue-500">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              Tax Disclaimer
            </h4>
            <p className="text-xs text-gray-600">
              These tax estimates are for informational purposes only and use
              simplified assumptions (single filer, 2024 brackets). Actual tax
              liability depends on your total income, filing status, deductions,
              and other factors. Consult a tax professional for personalized
              advice.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
