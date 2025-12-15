import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { AssetClassAllocation } from '../../services/allocationAnalysisService';

interface ActualVsTargetChartProps {
  actualAllocations: AssetClassAllocation[];
  targetAllocations: Record<string, number>;
  totalValue: number;
}

export function ActualVsTargetChart({ actualAllocations, targetAllocations, totalValue }: ActualVsTargetChartProps) {
  // Color palette for asset classes
  const COLORS: Record<string, string> = {
    'Stocks': '#3b82f6',
    'Bonds': '#10b981',
    'Cash': '#f59e0b',
    'Real Estate': '#8b5cf6',
    'Commodities': '#ec4899',
    'Other': '#6b7280',
  };

  // Prepare data for charts
  const actualChartData = actualAllocations.map(a => ({
    name: a.assetClass,
    value: a.percentage,
  }));

  const targetChartData = Object.entries(targetAllocations).map(([name, value]) => ({
    name,
    value,
  }));

  // Prepare comparison table data
  const comparisonData = Object.entries(targetAllocations).map(([assetClass, targetPct]) => {
    const actual = actualAllocations.find(a => a.assetClass === assetClass);
    const actualPct = actual?.percentage || 0;
    const actualValue = actual?.value || 0;
    const diff = actualPct - targetPct;
    const dollarDiff = (diff / 100) * totalValue;

    return {
      assetClass,
      targetPct,
      actualPct,
      actualValue,
      diff,
      dollarDiff,
    };
  });

  // Helper to get diff color
  const getDiffColor = (diff: number) => {
    if (Math.abs(diff) < 3) return 'text-green-600';
    if (Math.abs(diff) < 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper to get action text
  const getActionText = (diff: number, dollarDiff: number) => {
    if (Math.abs(diff) < 3) {
      return <span className="text-green-600">✓ On target</span>;
    }

    if (diff > 0) {
      return <span className="text-red-600">Sell ${Math.abs(dollarDiff).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>;
    } else {
      return <span className="text-blue-600">Buy ${Math.abs(dollarDiff).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">📊</span>
        <h3 className="text-lg font-semibold text-gray-900">Actual vs Target Allocation</h3>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Asset Class</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Target</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Actual</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Difference</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map(row => (
              <tr key={row.assetClass} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">{row.assetClass}</td>
                <td className="text-right py-3 px-4 text-gray-600">{row.targetPct.toFixed(1)}%</td>
                <td className="text-right py-3 px-4 text-gray-900">
                  {row.actualPct.toFixed(1)}%
                  <span className="text-xs text-gray-400 ml-1">
                    (${row.actualValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                  </span>
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getDiffColor(row.diff)}`}>
                  {row.diff > 0 ? '+' : ''}{row.diff.toFixed(1)}%
                </td>
                <td className="text-right py-3 px-4">
                  {getActionText(row.diff, row.dollarDiff)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side-by-side Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Target Allocation Chart */}
        <div>
          <h4 className="text-center text-sm font-medium text-gray-700 mb-4">Target Allocation</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={targetChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {targetChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS['Other']} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Actual Allocation Chart */}
        <div>
          <h4 className="text-center text-sm font-medium text-gray-700 mb-4">Actual Allocation</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={actualChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {actualChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS['Other']} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
