import React from 'react';
import type { RiskAnalysis, DiversificationAnalysis, TaxEfficiencyAnalysis } from '../../services/allocationAnalysisService';

interface RiskHeatmapProps {
  riskAnalysis: RiskAnalysis;
  diversification: DiversificationAnalysis;
  taxEfficiency: TaxEfficiencyAnalysis | null;
}

interface RiskMetric {
  name: string;
  score: number;
  description: string;
  rating: string;
}

export function RiskHeatmap({ riskAnalysis, diversification, taxEfficiency }: RiskHeatmapProps) {
  // Calculate volatility risk score (0-100)
  const volatilityScore = Math.min(100, Math.round(riskAnalysis.estimatedVolatility * 5));

  // Calculate concentration risk score (inverted diversification score)
  const concentrationScore = 100 - diversification.score;

  // Tax efficiency score
  const taxScore = taxEfficiency?.score || 50;

  // Overall risk score (weighted average)
  const overallScore = Math.round(
    (volatilityScore * 0.4) + (concentrationScore * 0.3) + ((100 - taxScore) * 0.3)
  );

  const metrics: RiskMetric[] = [
    {
      name: 'Volatility Risk',
      score: volatilityScore,
      description: 'Stock-heavy portfolios have higher price swings',
      rating: volatilityScore >= 70 ? 'High' : volatilityScore >= 40 ? 'Medium' : 'Low',
    },
    {
      name: 'Concentration Risk',
      score: concentrationScore,
      description: diversification.score >= 70 ? 'Well diversified across asset classes' : 'Limited diversification across asset classes',
      rating: concentrationScore >= 70 ? 'High' : concentrationScore >= 40 ? 'Medium' : 'Low',
    },
    {
      name: 'Tax Efficiency',
      score: 100 - taxScore,
      description: taxScore >= 80 ? 'Tax-optimized account placement' : 'Some improvements possible with account placement',
      rating: taxScore <= 50 ? 'High' : taxScore <= 80 ? 'Medium' : 'Low',
    },
  ];

  // Helper to get color for score
  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Helper to get text color for score
  const getTextColor = (score: number): string => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Helper to get rating badge color
  const getRatingBadgeColor = (rating: string): string => {
    switch (rating) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">🌡️</span>
        <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
      </div>

      {/* Individual Risk Metrics */}
      <div className="space-y-6 mb-6">
        {metrics.map((metric) => (
          <div key={metric.name}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{metric.name}</h4>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRatingBadgeColor(metric.rating)}`}>
                  {metric.rating}
                </span>
                <span className={`text-sm font-semibold ${getTextColor(metric.score)} w-16 text-right`}>
                  {metric.score}/100
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreColor(metric.score)} transition-all duration-500`}
                style={{ width: `${metric.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Overall Risk Score */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Overall Risk Score</h4>
          <span className={`text-lg font-bold ${getTextColor(overallScore)}`}>
            {overallScore}/100
          </span>
        </div>

        <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full ${getScoreColor(overallScore)} transition-all duration-500`}
            style={{ width: `${overallScore}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Lower risk</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingBadgeColor(
            overallScore >= 70 ? 'High' : overallScore >= 40 ? 'Medium' : 'Low'
          )}`}>
            {overallScore >= 70 ? 'High Risk' : overallScore >= 40 ? 'Moderate Risk' : 'Low Risk'}
          </span>
          <span className="text-xs text-gray-500">Higher risk</span>
        </div>
      </div>

      {/* Risk Explanation */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-medium">What does this mean?</span> Your overall risk score combines volatility (market swings),
          concentration (diversification), and tax efficiency. A lower score indicates a more conservative, stable portfolio,
          while a higher score suggests greater potential returns with increased risk.
        </p>
      </div>
    </div>
  );
}
