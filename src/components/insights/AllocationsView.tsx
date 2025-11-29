/**
 * ============================================================================
 * AllocationsView Component
 * ============================================================================
 *
 * Portfolio allocation visualization with multiple breakdown views.
 *
 * Features:
 * - Interactive pie charts for allocation analysis
 * - Multiple allocation views:
 *   - Asset Class: Stocks, bonds, crypto, cash, etc.
 *   - Sector: Technology, healthcare, financials, etc.
 *   - Tax Vehicle: Taxable, tax-deferred, tax-free accounts
 * - Click segments to see detailed breakdown
 * - Color-coded categories
 * - Percentage and value display
 * - Responsive design
 *
 * Chart Interactions:
 * - Click a segment to highlight and show details
 * - Click again to deselect
 * - Hover for tooltips
 * - Legend for color reference
 *
 * Data Structure:
 * Each allocation item contains:
 * - name: Category name
 * - value: Dollar value
 * - percentage: Percentage of total
 * - color: Display color
 *
 * ============================================================================
 */

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

/**
 * Single allocation item structure
 */
interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface AllocationsViewProps {
  allocation: AllocationItem[];
  totalValue: number;
  percentageChange: number;
}

/**
 * Recharts Tooltip props
 * Used for custom tooltip components in charts
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: AllocationItem;
    [key: string]: unknown;
  }>;
}

// Color palettes for different chart types
const SECTOR_COLORS = [
  '#06B6D4',
  '#14B8A6',
  '#84CC16',
  '#F59E0B',
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#A855F7',
  '#6366F1',
  '#3B82F6',
];
const TAX_VEHICLE_COLORS = ['#10B981', '#F59E0B', '#3B82F6'];

/**
 * Allocations view component
 */
export function AllocationsView({
  allocation,
  totalValue,
  percentageChange,
}: AllocationsViewProps) {
  const [selectedSegment, setSelectedSegment] = useState<AllocationItem | null>(
    null
  );
  const [selectedChart, setSelectedChart] = useState<
    'asset' | 'sector' | 'tax'
  >('asset');

  // Mock data for sectors (you'll replace this with real data from your database)
  const sectorAllocation: AllocationItem[] = [
    {
      name: 'Technology',
      value: totalValue * 0.35,
      percentage: 35,
      color: SECTOR_COLORS[0],
    },
    {
      name: 'Healthcare',
      value: totalValue * 0.2,
      percentage: 20,
      color: SECTOR_COLORS[1],
    },
    {
      name: 'Financial Services',
      value: totalValue * 0.15,
      percentage: 15,
      color: SECTOR_COLORS[2],
    },
    {
      name: 'Consumer Cyclical',
      value: totalValue * 0.12,
      percentage: 12,
      color: SECTOR_COLORS[3],
    },
    {
      name: 'Industrials',
      value: totalValue * 0.1,
      percentage: 10,
      color: SECTOR_COLORS[4],
    },
    {
      name: 'Energy',
      value: totalValue * 0.08,
      percentage: 8,
      color: SECTOR_COLORS[5],
    },
  ];

  // Mock data for tax vehicles (you'll replace this with real data)
  const taxVehicleAllocation: AllocationItem[] = [
    {
      name: 'Tax-Deferred (401k/IRA)',
      value: totalValue * 0.6,
      percentage: 60,
      color: TAX_VEHICLE_COLORS[0],
    },
    {
      name: 'Taxable (Brokerage)',
      value: totalValue * 0.3,
      percentage: 30,
      color: TAX_VEHICLE_COLORS[1],
    },
    {
      name: 'Tax-Free (Roth)',
      value: totalValue * 0.1,
      percentage: 10,
      color: TAX_VEHICLE_COLORS[2],
    },
  ];

  const handlePieClick = (data: AllocationItem) => {
    if (selectedSegment?.name === data.name) {
      setSelectedSegment(null);
    } else {
      setSelectedSegment(data);
    }
  };

  const getCurrentAllocation = () => {
    switch (selectedChart) {
      case 'sector':
        return sectorAllocation;
      case 'tax':
        return taxVehicleAllocation;
      default:
        return allocation;
    }
  };

  const currentAllocation = getCurrentAllocation();

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;

      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {data.name}
          </p>
          <p className="text-lg font-bold" style={{ color: data.color }}>
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            {data.percentage.toFixed(1)}% of portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Chart Type Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setSelectedChart('asset');
            setSelectedSegment(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedChart === 'asset'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Asset Classes
        </button>
        <button
          onClick={() => {
            setSelectedChart('sector');
            setSelectedSegment(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedChart === 'sector'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Sectors
        </button>
        <button
          onClick={() => {
            setSelectedChart('tax');
            setSelectedSegment(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedChart === 'tax'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tax Vehicles
        </button>
      </div>

      {/* Main Chart Card */}
      <Card className="p-6 bg-white shadow-md">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Pie Chart */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedChart === 'asset' && 'Asset Class Distribution'}
              {selectedChart === 'sector' && 'Sector Diversification'}
              {selectedChart === 'tax' && 'Tax Vehicle Allocation'}
            </h3>
            <div className="h-96 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentAllocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={130}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={handlePieClick}
                    cornerRadius={4}
                  >
                    {currentAllocation.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={entry.color}
                        strokeWidth={0}
                        style={{
                          filter:
                            selectedSegment?.name === entry.name
                              ? `drop-shadow(0 0 8px ${entry.color}) brightness(1.1)`
                              : 'none',
                          transform:
                            selectedSegment?.name === entry.name
                              ? 'scale(1.05)'
                              : 'scale(1)',
                          transformOrigin: 'center',
                          transition: 'all 0.2s ease-out',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  {selectedSegment ? (
                    <>
                      <p className="text-sm text-gray-500 mb-1">
                        {selectedSegment.name}
                      </p>
                      <p
                        className="text-2xl font-bold mb-1"
                        style={{ color: selectedSegment.color }}
                      >
                        {formatCurrency(selectedSegment.value)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedSegment.percentage.toFixed(1)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(totalValue)}
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                          percentageChange >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {percentageChange >= 0 ? '+' : ''}
                        {percentageChange.toFixed(1)}% all time
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Allocation List */}
          <div className="lg:w-80">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Breakdown
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currentAllocation.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedSegment?.name === item.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handlePieClick(item)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="ml-6">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-0">
          <p className="text-sm text-blue-700 font-medium mb-1">
            Largest Allocation
          </p>
          <p className="text-xl font-bold text-blue-900">
            {currentAllocation[0]?.name}
          </p>
          <p className="text-sm text-blue-600">
            {currentAllocation[0]?.percentage.toFixed(1)}% •{' '}
            {formatCurrency(currentAllocation[0]?.value)}
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-0">
          <p className="text-sm text-green-700 font-medium mb-1">
            Number of Categories
          </p>
          <p className="text-xl font-bold text-green-900">
            {currentAllocation.length}
          </p>
          <p className="text-sm text-green-600">Well diversified</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-0">
          <p className="text-sm text-purple-700 font-medium mb-1">
            Concentration Risk
          </p>
          <p className="text-xl font-bold text-purple-900">
            {currentAllocation[0]?.percentage < 40
              ? 'Low'
              : currentAllocation[0]?.percentage < 60
                ? 'Medium'
                : 'High'}
          </p>
          <p className="text-sm text-purple-600">
            Top holding: {currentAllocation[0]?.percentage.toFixed(1)}%
          </p>
        </Card>
      </div>
    </div>
  );
}
