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

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAllocationTargets } from '@/hooks/useAllocationTargets';
import { useAllocationRecommendations } from '@/hooks/useAllocationRecommendations';
import { allocationAnalysisService } from '@/services/allocationAnalysisService';
import { recommendationGeneratorService } from '@/services/recommendationGeneratorService';
import { AllocationStatsCards } from '../allocation/AllocationStatsCards';
import { TargetAllocationEditor } from '../allocation/TargetAllocationEditor';
import { ActualVsTargetChart } from '../allocation/ActualVsTargetChart';
import { RecommendationsPanel } from '../allocation/RecommendationsPanel';
import { RiskHeatmap } from '../allocation/RiskHeatmap';
import type { AssetClassAllocation, AccountAllocation } from '@/services/allocationAnalysisService';

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
  taxVehicleAllocation: AllocationItem[];
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
  taxVehicleAllocation,
  totalValue,
  percentageChange,
}: AllocationsViewProps) {
  const { user } = useAuth();
  const [selectedSegment, setSelectedSegment] = useState<AllocationItem | null>(
    null
  );
  const [selectedChart, setSelectedChart] = useState<
    'asset' | 'sector' | 'tax'
  >('asset');
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(true);

  // Hooks for allocation targets and recommendations
  const {
    target,
    loading: targetsLoading,
    saveTarget,
    refetch: refetchTargets,
  } = useAllocationTargets(user?.id);

  const {
    recommendations,
    loading: recommendationsLoading,
    createRecommendation,
    dismissRecommendation,
    clearAllRecommendations,
  } = useAllocationRecommendations(user?.id);

  // Convert AllocationItem[] to AssetClassAllocation[]
  const assetClassAllocations: AssetClassAllocation[] = allocation.map(item => ({
    assetClass: item.name,
    value: item.value,
    percentage: item.percentage,
  }));

  // Calculate analysis metrics
  const diversification = allocationAnalysisService.calculateDiversificationScore(assetClassAllocations);
  const riskAnalysis = allocationAnalysisService.calculateRiskLevel(assetClassAllocations);

  // Calculate drift if target exists
  const driftAnalysis = target
    ? allocationAnalysisService.calculateDrift(
        assetClassAllocations,
        target.targets,
        totalValue,
        target.rebalance_threshold
      )
    : null;

  // Mock tax efficiency (you'll need to pass account data for real analysis)
  const taxEfficiency = null; // For now, set to null until we have account type data

  // Generate recommendations when data changes
  useEffect(() => {
    if (!user?.id || !recommendationsEnabled) return;

    const generateRecommendations = async () => {
      // Clear old recommendations
      await clearAllRecommendations();

      // Generate new recommendations
      const newRecommendations = recommendationGeneratorService.generateAllRecommendations(
        driftAnalysis,
        taxEfficiency,
        diversification,
        riskAnalysis,
        totalValue,
        undefined // userAge - can be added later
      );

      // Save recommendations to database
      for (const rec of newRecommendations) {
        await createRecommendation(
          rec.type,
          rec.priority,
          rec.title,
          rec.description,
          rec.actionItems,
          rec.expectedImpact
        );
      }
    };

    generateRecommendations();
  }, [user?.id, target, totalValue, recommendationsEnabled]);

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
      {/* Allocation Breakdown Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Allocation Breakdown</h2>

        {/* Chart Type Selector */}
      <Tabs
        value={selectedChart}
        onValueChange={(value) => {
          setSelectedChart(value as 'asset' | 'sector' | 'tax');
          setSelectedSegment(null);
        }}
      >
        <TabsList className="grid w-full grid-cols-3 bg-gray-200">
          <TabsTrigger
            value="asset"
            className="data-[state=active]:bg-white"
          >
            Asset Classes
          </TabsTrigger>
          <TabsTrigger
            value="sector"
            className="data-[state=active]:bg-white"
          >
            Sectors
          </TabsTrigger>
          <TabsTrigger
            value="tax"
            className="data-[state=active]:bg-white"
          >
            Tax Vehicles
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
            <div className="space-y-3">
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
      </div>

      {/* Allocation Advisor Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Allocation Advisor</h2>

        {/* Stats Cards */}
        <AllocationStatsCards
          diversification={diversification}
          riskAnalysis={riskAnalysis}
          drift={driftAnalysis}
          taxEfficiency={taxEfficiency}
        />

        {/* Target Allocation Editor */}
        <TargetAllocationEditor
          currentTarget={target?.targets || null}
          currentTemplate={target?.template_name || null}
          onSave={saveTarget}
          userAge={undefined} // Can be added from user profile later
        />

        {/* Actual vs Target Comparison */}
        {target && (
          <ActualVsTargetChart
            actualAllocations={assetClassAllocations}
            targetAllocations={target.targets}
            totalValue={totalValue}
          />
        )}

        {/* Risk Heatmap */}
        <RiskHeatmap
          riskAnalysis={riskAnalysis}
          diversification={diversification}
          taxEfficiency={taxEfficiency}
        />

        {/* Recommendations Panel */}
        <RecommendationsPanel
          recommendations={recommendations}
          onDismiss={dismissRecommendation}
          enabled={recommendationsEnabled}
          onToggle={() => setRecommendationsEnabled(!recommendationsEnabled)}
        />
      </div>
    </div>
  );
}
