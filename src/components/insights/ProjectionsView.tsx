import { useState, useMemo } from 'react';
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
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Percent,
  AlertCircle,
} from 'lucide-react';

interface ProjectionsViewProps {
  currentPortfolioValue: number;
}

interface ScenarioInputs {
  monthlyContribution: number;
  annualReturn: number;
  yearsToProject: number;
  retirementGoal: number;
  targetAge: number;
  currentAge: number;
}

interface ProjectionDataPoint {
  year: number;
  age: number;
  conservative: number;
  moderate: number;
  aggressive: number;
  contributions: number;
}

/**
 * Recharts Tooltip props
 * Used for custom tooltip components in charts
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: ProjectionDataPoint;
    [key: string]: unknown;
  }>;
}

const DEFAULT_INPUTS: ScenarioInputs = {
  monthlyContribution: 1000,
  annualReturn: 7,
  yearsToProject: 30,
  retirementGoal: 1000000,
  targetAge: 65,
  currentAge: 35,
};

export function ProjectionsView({
  currentPortfolioValue,
}: ProjectionsViewProps) {
  const [inputs, setInputs] = useState<ScenarioInputs>(DEFAULT_INPUTS);

  // Calculate projections for different scenarios
  const projectionData = useMemo(() => {
    const data: ProjectionDataPoint[] = [];
    const scenarios = {
      conservative: inputs.annualReturn - 3,
      moderate: inputs.annualReturn,
      aggressive: inputs.annualReturn + 3,
    };

    for (let year = 0; year <= inputs.yearsToProject; year++) {
      const age = inputs.currentAge + year;
      const totalContributions = inputs.monthlyContribution * 12 * year;

      const dataPoint: ProjectionDataPoint = {
        year,
        age,
        contributions: currentPortfolioValue + totalContributions,
        conservative: 0,
        moderate: 0,
        aggressive: 0,
      };

      // Calculate future value for each scenario
      Object.entries(scenarios).forEach(([scenario, rate]) => {
        const monthlyRate = rate / 100 / 12;
        const months = year * 12;

        // FV of current portfolio
        const portfolioFV =
          currentPortfolioValue * Math.pow(1 + monthlyRate, months);

        // FV of monthly contributions (annuity)
        const contributionsFV =
          months > 0
            ? inputs.monthlyContribution *
              ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
            : 0;

        dataPoint[scenario as keyof typeof scenarios] =
          portfolioFV + contributionsFV;
      });

      data.push(dataPoint);
    }

    return data;
  }, [inputs, currentPortfolioValue]);

  // Calculate goal achievement metrics
  const goalMetrics = useMemo(() => {
    const finalYear = projectionData[projectionData.length - 1];
    const goalAmount = inputs.retirementGoal;

    const achievements = {
      conservative: finalYear.conservative >= goalAmount,
      moderate: finalYear.moderate >= goalAmount,
      aggressive: finalYear.aggressive >= goalAmount,
    };

    // Find years to reach goal for each scenario
    const yearsToGoal = {
      conservative: projectionData.findIndex(p => p.conservative >= goalAmount),
      moderate: projectionData.findIndex(p => p.moderate >= goalAmount),
      aggressive: projectionData.findIndex(p => p.aggressive >= goalAmount),
    };

    const ageAtGoal = {
      conservative:
        yearsToGoal.conservative > -1
          ? inputs.currentAge + yearsToGoal.conservative
          : null,
      moderate:
        yearsToGoal.moderate > -1
          ? inputs.currentAge + yearsToGoal.moderate
          : null,
      aggressive:
        yearsToGoal.aggressive > -1
          ? inputs.currentAge + yearsToGoal.aggressive
          : null,
    };

    return {
      achievements,
      yearsToGoal,
      ageAtGoal,
      finalValues: {
        conservative: finalYear.conservative,
        moderate: finalYear.moderate,
        aggressive: finalYear.aggressive,
      },
    };
  }, [projectionData, inputs]);

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;

      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 min-w-[220px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
            <Calendar className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-900">
              Year {data.year} (Age {data.age})
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500 rounded"></div>
                <span className="text-xs text-gray-600">Conservative:</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(data.conservative)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-600 rounded"></div>
                <span className="text-xs text-gray-600">Moderate:</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(data.moderate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Aggressive:</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(data.aggressive)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-500">Contributions:</span>
              <span className="text-xs font-medium text-gray-700">
                {formatCurrency(data.contributions)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const updateInput = (field: keyof ScenarioInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Input Controls */}
      <Card className="p-6 bg-white shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Scenario Assumptions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Monthly Contribution */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Monthly Contribution
            </label>
            <input
              type="number"
              value={inputs.monthlyContribution}
              onChange={e =>
                updateInput('monthlyContribution', Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(inputs.monthlyContribution * 12)}/year
            </p>
          </div>

          {/* Expected Annual Return */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Percent className="h-4 w-4 text-blue-600" />
              Expected Annual Return
            </label>
            <input
              type="number"
              value={inputs.annualReturn}
              onChange={e =>
                updateInput('annualReturn', Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="20"
              step="0.5"
            />
            <p className="text-xs text-gray-500 mt-1">±3% for scenarios</p>
          </div>

          {/* Years to Project */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Years to Project
            </label>
            <input
              type="number"
              value={inputs.yearsToProject}
              onChange={e =>
                updateInput('yearsToProject', Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="50"
              step="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Until age {inputs.currentAge + inputs.yearsToProject}
            </p>
          </div>

          {/* Current Age */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Current Age
            </label>
            <input
              type="number"
              value={inputs.currentAge}
              onChange={e => updateInput('currentAge', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="18"
              max="100"
              step="1"
            />
          </div>

          {/* Target Retirement Age */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              Target Retirement Age
            </label>
            <input
              type="number"
              value={inputs.targetAge}
              onChange={e => updateInput('targetAge', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="50"
              max="100"
              step="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              In {Math.max(0, inputs.targetAge - inputs.currentAge)} years
            </p>
          </div>

          {/* Retirement Goal */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              Retirement Goal
            </label>
            <input
              type="number"
              value={inputs.retirementGoal}
              onChange={e =>
                updateInput('retirementGoal', Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="50000"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(inputs.retirementGoal)}
            </p>
          </div>
        </div>
      </Card>

      {/* Projection Chart */}
      <Card className="p-6 bg-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Portfolio Projection Scenarios
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500 rounded"></div>
              <span className="text-gray-600">
                Conservative ({inputs.annualReturn - 3}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-600 rounded"></div>
              <span className="text-gray-600">
                Moderate ({inputs.annualReturn}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-600 rounded"></div>
              <span className="text-gray-600">
                Aggressive ({inputs.annualReturn + 3}%)
              </span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={450}>
          <LineChart
            data={projectionData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="conservativeGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="moderateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="aggressiveGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickMargin={8}
              label={{
                value: 'Years from Now',
                position: 'insideBottom',
                offset: -5,
                fontSize: 12,
                fill: '#6B7280',
              }}
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
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#9ca3af',
                strokeWidth: 1,
                strokeDasharray: '5 5',
              }}
            />

            {/* Goal Reference Line */}
            <ReferenceLine
              y={inputs.retirementGoal}
              stroke="#F59E0B"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{
                value: 'Goal',
                position: 'right',
                fill: '#F59E0B',
                fontSize: 12,
              }}
            />

            {/* Retirement Age Reference Line */}
            {inputs.targetAge > inputs.currentAge && (
              <ReferenceLine
                x={inputs.targetAge - inputs.currentAge}
                stroke="#8B5CF6"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={{
                  value: 'Retirement',
                  position: 'top',
                  fill: '#8B5CF6',
                  fontSize: 12,
                }}
              />
            )}

            {/* Contribution baseline */}
            <Line
              type="monotone"
              dataKey="contributions"
              stroke="#9CA3AF"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              name="Contributions Only"
            />

            {/* Conservative Scenario */}
            <Line
              type="monotone"
              dataKey="conservative"
              stroke="#EF4444"
              strokeWidth={3}
              dot={false}
              name="Conservative"
              activeDot={{
                r: 6,
                fill: '#EF4444',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />

            {/* Moderate Scenario */}
            <Line
              type="monotone"
              dataKey="moderate"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={false}
              name="Moderate"
              activeDot={{
                r: 6,
                fill: '#3B82F6',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />

            {/* Aggressive Scenario */}
            <Line
              type="monotone"
              dataKey="aggressive"
              stroke="#10B981"
              strokeWidth={3}
              dot={false}
              name="Aggressive"
              activeDot={{
                r: 6,
                fill: '#10B981',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Goal Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conservative Scenario */}
        <Card
          className={`p-5 shadow-md border-l-4 ${goalMetrics.achievements.conservative ? 'bg-green-50 border-l-green-500' : 'bg-red-50 border-l-red-500'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Conservative Scenario
            </h4>
            {goalMetrics.achievements.conservative ? (
              <Target className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(goalMetrics.finalValues.conservative)}
          </p>
          <p className="text-xs text-gray-600 mb-2">
            At {inputs.annualReturn - 3}% return
          </p>
          {goalMetrics.achievements.conservative ? (
            <div className="text-sm">
              <p className="text-green-700 font-medium">Goal Achieved!</p>
              {goalMetrics.ageAtGoal.conservative && (
                <p className="text-xs text-gray-600 mt-1">
                  At age {goalMetrics.ageAtGoal.conservative} (
                  {goalMetrics.yearsToGoal.conservative} years)
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-700 font-medium">
              $
              {(
                (inputs.retirementGoal - goalMetrics.finalValues.conservative) /
                1000
              ).toFixed(0)}
              k short of goal
            </p>
          )}
        </Card>

        {/* Moderate Scenario */}
        <Card
          className={`p-5 shadow-md border-l-4 ${goalMetrics.achievements.moderate ? 'bg-green-50 border-l-green-500' : 'bg-yellow-50 border-l-yellow-500'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Moderate Scenario
            </h4>
            {goalMetrics.achievements.moderate ? (
              <Target className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(goalMetrics.finalValues.moderate)}
          </p>
          <p className="text-xs text-gray-600 mb-2">
            At {inputs.annualReturn}% return
          </p>
          {goalMetrics.achievements.moderate ? (
            <div className="text-sm">
              <p className="text-green-700 font-medium">Goal Achieved!</p>
              {goalMetrics.ageAtGoal.moderate && (
                <p className="text-xs text-gray-600 mt-1">
                  At age {goalMetrics.ageAtGoal.moderate} (
                  {goalMetrics.yearsToGoal.moderate} years)
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-yellow-700 font-medium">
              $
              {(
                (inputs.retirementGoal - goalMetrics.finalValues.moderate) /
                1000
              ).toFixed(0)}
              k short of goal
            </p>
          )}
        </Card>

        {/* Aggressive Scenario */}
        <Card
          className={`p-5 shadow-md border-l-4 bg-green-50 border-l-green-500`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Aggressive Scenario
            </h4>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(goalMetrics.finalValues.aggressive)}
          </p>
          <p className="text-xs text-gray-600 mb-2">
            At {inputs.annualReturn + 3}% return
          </p>
          {goalMetrics.achievements.aggressive ? (
            <div className="text-sm">
              <p className="text-green-700 font-medium">Goal Achieved!</p>
              {goalMetrics.ageAtGoal.aggressive && (
                <p className="text-xs text-gray-600 mt-1">
                  At age {goalMetrics.ageAtGoal.aggressive} (
                  {goalMetrics.yearsToGoal.aggressive} years)
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-green-700 font-medium">
              On track for {formatCurrency(goalMetrics.finalValues.aggressive)}
            </p>
          )}
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Projected Growth
            </p>
            <p className="text-xs text-gray-600">
              Starting from {formatCurrency(currentPortfolioValue)}, your
              portfolio could grow to between{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrency(goalMetrics.finalValues.conservative)}
              </span>{' '}
              and{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrency(goalMetrics.finalValues.aggressive)}
              </span>{' '}
              over {inputs.yearsToProject} years.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Total Contributions
            </p>
            <p className="text-xs text-gray-600">
              You'll contribute{' '}
              {formatCurrency(
                inputs.monthlyContribution * 12 * inputs.yearsToProject
              )}{' '}
              over the next {inputs.yearsToProject} years (
              {formatCurrency(inputs.monthlyContribution)}/month).
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Investment Growth
            </p>
            <p className="text-xs text-gray-600">
              The moderate scenario projects{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrency(
                  goalMetrics.finalValues.moderate -
                    currentPortfolioValue -
                    inputs.monthlyContribution * 12 * inputs.yearsToProject
                )}
              </span>{' '}
              in investment returns from compound growth.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Retirement Readiness
            </p>
            <p className="text-xs text-gray-600">
              {goalMetrics.achievements.moderate ? (
                <>
                  You're on track to reach your retirement goal of{' '}
                  {formatCurrency(inputs.retirementGoal)}!
                </>
              ) : (
                <>
                  To reach {formatCurrency(inputs.retirementGoal)}, consider
                  increasing monthly contributions or adjusting your timeline.
                </>
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
