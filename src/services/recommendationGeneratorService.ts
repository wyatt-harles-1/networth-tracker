/**
 * Recommendation Generator Service
 *
 * Generates actionable recommendations based on portfolio analysis
 */

import type {
  DriftAnalysis,
  TaxEfficiencyAnalysis,
  DiversificationAnalysis,
  RiskAnalysis,
} from './allocationAnalysisService';
import type { RecommendationType, RecommendationPriority } from '../hooks/useAllocationRecommendations';

export interface GeneratedRecommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  actionItems: Array<{ action: string; impact?: string }>;
  expectedImpact?: string;
}

class RecommendationGeneratorService {
  /**
   * Generate rebalancing recommendations based on drift analysis
   */
  generateRebalanceRecommendations(
    driftAnalysis: DriftAnalysis,
    totalPortfolioValue: number
  ): GeneratedRecommendation | null {
    if (!driftAnalysis.needsRebalance) {
      return null;
    }

    const significantDrifts = driftAnalysis.drifts
      .filter(d => Math.abs(d.drift) > 3)
      .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

    if (significantDrifts.length === 0) {
      return null;
    }

    const actionItems = significantDrifts.map(drift => {
      const action = drift.drift > 0
        ? `Sell $${Math.abs(drift.dollarsToRebalance).toLocaleString()} of ${drift.assetClass} (reduce from ${drift.actual.toFixed(1)}% to ${drift.target.toFixed(1)}%)`
        : `Buy $${Math.abs(drift.dollarsToRebalance).toLocaleString()} of ${drift.assetClass} (increase from ${drift.actual.toFixed(1)}% to ${drift.target.toFixed(1)}%)`;

      return { action };
    });

    const priority: RecommendationPriority = driftAnalysis.maxDrift > 15 ? 'high' :
      driftAnalysis.maxDrift > 10 ? 'medium' : 'low';

    const estimatedVolatilityReduction = Math.round(driftAnalysis.maxDrift * 0.8);

    return {
      type: 'rebalance',
      priority,
      title: 'Portfolio Rebalancing Needed',
      description: `Your allocation has drifted ${driftAnalysis.maxDrift.toFixed(1)}% from your target. Rebalancing will help maintain your desired risk level and investment strategy.`,
      actionItems,
      expectedImpact: `Rebalancing may reduce portfolio volatility by ~${estimatedVolatilityReduction}% and realign with your risk tolerance.`,
    };
  }

  /**
   * Generate tax optimization recommendations
   */
  generateTaxOptimizationRecommendations(
    taxAnalysis: TaxEfficiencyAnalysis
  ): GeneratedRecommendation[] {
    const recommendations: GeneratedRecommendation[] = [];

    for (const issue of taxAnalysis.issues) {
      const actionItems: Array<{ action: string; impact?: string }> = [];

      if (issue.type === 'bonds_in_taxable') {
        actionItems.push({
          action: 'Move bonds from taxable accounts to tax-deferred accounts (IRA, 401k)',
          impact: `Save ~$${issue.potentialSavings}/year in taxes`,
        });
        actionItems.push({
          action: 'Replace with tax-efficient investments in taxable accounts (e.g., index funds, growth stocks)',
        });

        recommendations.push({
          type: 'tax_optimize',
          priority: issue.severity === 'high' ? 'high' : 'medium',
          title: 'Tax-Inefficient Bond Placement',
          description: issue.description,
          actionItems,
          expectedImpact: `Annual tax savings: ~$${issue.potentialSavings}`,
        });
      }

      if (issue.type === 'growth_in_deferred') {
        actionItems.push({
          action: 'Consider holding growth stocks in taxable or Roth accounts for better tax treatment',
        });
        actionItems.push({
          action: 'Move bonds and dividend-paying assets to tax-deferred accounts',
        });

        recommendations.push({
          type: 'tax_optimize',
          priority: 'medium',
          title: 'Suboptimal Asset Location',
          description: issue.description,
          actionItems,
        });
      }

      if (issue.type === 'no_tax_free_accounts') {
        actionItems.push({
          action: 'Open a Roth IRA (if eligible) for tax-free growth',
        });
        actionItems.push({
          action: 'Consider Roth 401k contributions if available through employer',
        });

        recommendations.push({
          type: 'tax_optimize',
          priority: 'medium',
          title: 'No Tax-Free Accounts',
          description: issue.description,
          actionItems,
          expectedImpact: 'Tax-free growth and withdrawals in retirement',
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate diversification recommendations
   */
  generateDiversificationRecommendations(
    diversification: DiversificationAnalysis,
    totalValue: number
  ): GeneratedRecommendation | null {
    if (diversification.rating === 'excellent' || diversification.rating === 'good') {
      return null;
    }

    const actionItems: Array<{ action: string; impact?: string }> = [];

    if (diversification.maxConcentration > 70) {
      actionItems.push({
        action: `Reduce concentration in ${diversification.maxConcentrationAsset} (currently ${diversification.maxConcentration.toFixed(1)}%)`,
        impact: 'Reduce portfolio risk through diversification',
      });
    }

    if (diversification.assetClassCount < 3) {
      actionItems.push({
        action: 'Add exposure to additional asset classes (bonds, real estate, commodities)',
        impact: 'Improve risk-adjusted returns',
      });
    }

    if (diversification.assetClassCount < 5) {
      actionItems.push({
        action: 'Consider adding Real Estate (REITs), International Stocks, or Alternative investments',
      });
    }

    const priority: RecommendationPriority = diversification.rating === 'poor' ? 'high' : 'medium';

    return {
      type: 'diversify',
      priority,
      title: 'Improve Portfolio Diversification',
      description: `Your portfolio has a diversification score of ${diversification.score}/100 (${diversification.rating}). ${diversification.maxConcentration.toFixed(1)}% is concentrated in ${diversification.maxConcentrationAsset}.`,
      actionItems,
      expectedImpact: 'Better diversification can reduce volatility by 15-25% without sacrificing returns',
    };
  }

  /**
   * Generate risk adjustment recommendations
   */
  generateRiskRecommendations(
    riskAnalysis: RiskAnalysis,
    userAge?: number
  ): GeneratedRecommendation | null {
    // If user age is provided, compare to age-based allocation
    if (userAge) {
      const recommendedStocks = Math.max(0, Math.min(100, 110 - userAge));
      const stockDifference = riskAnalysis.stockPercentage - recommendedStocks;

      if (Math.abs(stockDifference) > 15) {
        const actionItems: Array<{ action: string; impact?: string }> = [];

        if (stockDifference > 0) {
          // Too aggressive for age
          actionItems.push({
            action: `Reduce stock allocation from ${riskAnalysis.stockPercentage.toFixed(1)}% to ~${recommendedStocks}%`,
            impact: 'More appropriate risk level for your age and time horizon',
          });
          actionItems.push({
            action: 'Increase bond allocation for stability as you approach retirement',
          });

          return {
            type: 'risk_adjustment',
            priority: stockDifference > 25 ? 'high' : 'medium',
            title: 'Allocation May Be Too Aggressive for Your Age',
            description: `At age ${userAge}, a typical allocation is ${recommendedStocks}% stocks. Your current ${riskAnalysis.stockPercentage.toFixed(1)}% stock allocation may be aggressive.`,
            actionItems,
            expectedImpact: `Reduce estimated volatility from ${riskAnalysis.estimatedVolatility}% to ~${Math.round(recommendedStocks * 0.2)}%`,
          };
        } else {
          // Too conservative for age
          actionItems.push({
            action: `Consider increasing stock allocation from ${riskAnalysis.stockPercentage.toFixed(1)}% to ~${recommendedStocks}%`,
            impact: 'Higher growth potential while you have time to weather volatility',
          });

          return {
            type: 'risk_adjustment',
            priority: 'low',
            title: 'Allocation May Be Too Conservative for Your Age',
            description: `At age ${userAge}, you have time for growth. Consider a ${recommendedStocks}% stock allocation vs your current ${riskAnalysis.stockPercentage.toFixed(1)}%.`,
            actionItems,
            expectedImpact: `Increase estimated returns from ${riskAnalysis.estimatedReturn}% to ~${Math.round(recommendedStocks * 0.10 + (100 - recommendedStocks) * 0.04)}%`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Generate general insights
   */
  generateInsights(
    riskAnalysis: RiskAnalysis,
    diversification: DiversificationAnalysis
  ): GeneratedRecommendation {
    const riskLabel = riskAnalysis.level.replace('_', '-');

    return {
      type: 'insight',
      priority: 'low',
      title: 'Portfolio Risk Profile',
      description: `Your portfolio has a ${riskLabel} risk profile with ${riskAnalysis.stockPercentage.toFixed(1)}% in stocks. This allocation historically returns ${riskAnalysis.estimatedReturn}% annually with ${riskAnalysis.estimatedVolatility}% volatility.`,
      actionItems: [
        {
          action: 'Your diversification score is ' + diversification.score + '/100',
        },
        {
          action: 'Spread across ' + diversification.assetClassCount + ' asset classes',
        },
      ],
      expectedImpact: 'Understanding your risk profile helps align investments with goals',
    };
  }

  /**
   * Generate all recommendations
   */
  generateAllRecommendations(
    driftAnalysis: DriftAnalysis | null,
    taxAnalysis: TaxEfficiencyAnalysis | null,
    diversification: DiversificationAnalysis,
    riskAnalysis: RiskAnalysis,
    totalPortfolioValue: number,
    userAge?: number
  ): GeneratedRecommendation[] {
    const recommendations: GeneratedRecommendation[] = [];

    // Rebalancing recommendations
    if (driftAnalysis) {
      const rebalanceRec = this.generateRebalanceRecommendations(driftAnalysis, totalPortfolioValue);
      if (rebalanceRec) recommendations.push(rebalanceRec);
    }

    // Tax optimization recommendations
    if (taxAnalysis) {
      const taxRecs = this.generateTaxOptimizationRecommendations(taxAnalysis);
      recommendations.push(...taxRecs);
    }

    // Diversification recommendations
    const diversifyRec = this.generateDiversificationRecommendations(diversification, totalPortfolioValue);
    if (diversifyRec) recommendations.push(diversifyRec);

    // Risk adjustment recommendations
    const riskRec = this.generateRiskRecommendations(riskAnalysis, userAge);
    if (riskRec) recommendations.push(riskRec);

    // General insights
    const insight = this.generateInsights(riskAnalysis, diversification);
    recommendations.push(insight);

    return recommendations;
  }
}

export const recommendationGeneratorService = new RecommendationGeneratorService();
