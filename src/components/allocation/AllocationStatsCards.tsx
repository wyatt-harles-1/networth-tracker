import React from 'react';
import type { DiversificationAnalysis, RiskAnalysis, DriftAnalysis, TaxEfficiencyAnalysis } from '../../services/allocationAnalysisService';
import { allocationAnalysisService } from '../../services/allocationAnalysisService';

interface AllocationStatsCardsProps {
  diversification: DiversificationAnalysis;
  riskAnalysis: RiskAnalysis;
  drift: DriftAnalysis | null;
  taxEfficiency: TaxEfficiencyAnalysis | null;
}

export function AllocationStatsCards({ diversification, riskAnalysis, drift, taxEfficiency }: AllocationStatsCardsProps) {
  // Helper to get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper to get drift color
  const getDriftColor = (driftPct: number) => {
    if (driftPct < 5) return 'text-green-600';
    if (driftPct < 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Diversification Score */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Diversification</h3>
          <span className="text-xl">📊</span>
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(diversification.score)} mb-1`}>
          {diversification.score}/100
        </div>
        <p className="text-xs text-gray-500 capitalize">{diversification.rating}</p>
        <p className="text-xs text-gray-400 mt-2">
          {diversification.assetClassCount} asset classes
        </p>
      </div>

      {/* Risk Level */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Risk Level</h3>
          <span className="text-xl">
            {riskAnalysis.level === 'aggressive' ? '📈' :
             riskAnalysis.level === 'moderate_aggressive' ? '📊' :
             riskAnalysis.level === 'moderate' ? '⚖️' :
             riskAnalysis.level === 'conservative_moderate' ? '🛡️' : '🔒'}
          </span>
        </div>
        <div className="text-lg font-semibold text-gray-900 mb-1 capitalize">
          {allocationAnalysisService.formatRiskLevel(riskAnalysis.level)}
        </div>
        <p className="text-xs text-gray-500">
          {riskAnalysis.stockPercentage.toFixed(1)}% stocks
        </p>
        <p className="text-xs text-gray-400 mt-2">
          ~{riskAnalysis.estimatedVolatility}% volatility
        </p>
      </div>

      {/* Drift from Target */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Drift from Target</h3>
          <span className="text-xl">🎯</span>
        </div>
        {drift ? (
          <>
            <div className={`text-3xl font-bold ${getDriftColor(drift.maxDrift)} mb-1`}>
              {drift.maxDrift.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">
              {drift.needsRebalance ? 'Rebalance suggested' : 'On target'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {drift.drifts.filter(d => Math.abs(d.drift) > 3).length} assets off target
            </p>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-gray-400 mb-1">
              No target set
            </div>
            <p className="text-xs text-gray-500">
              Set a target to track
            </p>
          </>
        )}
      </div>

      {/* Tax Efficiency */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Tax Efficiency</h3>
          <span className="text-xl">💰</span>
        </div>
        {taxEfficiency ? (
          <>
            <div className={`text-3xl font-bold ${getScoreColor(taxEfficiency.score)} mb-1`}>
              {taxEfficiency.score}/100
            </div>
            <p className="text-xs text-gray-500">
              {taxEfficiency.issues.length === 0 ? 'Optimized' : 'Room to optimize'}
            </p>
            {taxEfficiency.issues.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {taxEfficiency.issues.length} optimization{taxEfficiency.issues.length !== 1 ? 's' : ''} available
              </p>
            )}
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-gray-400 mb-1">
              Not available
            </div>
            <p className="text-xs text-gray-500">
              Add account types
            </p>
          </>
        )}
      </div>
    </div>
  );
}
