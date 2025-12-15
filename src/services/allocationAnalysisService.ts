/**
 * Allocation Analysis Service
 *
 * Provides portfolio analysis and recommendation generation based on:
 * - Asset allocation targets
 * - Current portfolio composition
 * - Risk assessment
 * - Tax efficiency
 * - Diversification metrics
 */

export interface AssetClassAllocation {
  assetClass: string;
  value: number;
  percentage: number;
}

export interface AccountAllocation {
  accountId: string;
  accountName: string;
  accountType: 'taxable' | 'tax_deferred' | 'tax_free';
  assetClasses: AssetClassAllocation[];
  totalValue: number;
}

export interface DiversificationAnalysis {
  score: number; // 0-100
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  herfindahlIndex: number;
  assetClassCount: number;
  maxConcentration: number;
  maxConcentrationAsset: string;
}

export interface RiskAnalysis {
  level: 'conservative' | 'conservative_moderate' | 'moderate' | 'moderate_aggressive' | 'aggressive';
  stockPercentage: number;
  bondPercentage: number;
  estimatedVolatility: number; // Percentage
  estimatedReturn: number; // Percentage
}

export interface DriftAnalysis {
  maxDrift: number; // Maximum percentage drift from target
  drifts: Array<{
    assetClass: string;
    target: number;
    actual: number;
    drift: number;
    dollarsToRebalance: number;
  }>;
  needsRebalance: boolean;
}

export interface TaxEfficiencyAnalysis {
  score: number; // 0-100
  issues: Array<{
    type: 'bonds_in_taxable' | 'growth_in_deferred' | 'no_tax_free_accounts';
    description: string;
    potentialSavings: number;
    severity: 'high' | 'medium' | 'low';
  }>;
}

class AllocationAnalysisService {
  /**
   * Calculate Diversification Score
   * Uses Herfindahl-Hirschman Index (HHI) to measure concentration
   */
  calculateDiversificationScore(allocations: AssetClassAllocation[]): DiversificationAnalysis {
    const totalValue = allocations.reduce((sum, a) => sum + a.value, 0);

    // Calculate HHI (sum of squared market shares)
    const hhi = allocations.reduce((sum, allocation) => {
      const percentage = allocation.value / totalValue;
      return sum + (percentage * percentage);
    }, 0);

    // Find max concentration
    const maxAllocation = allocations.reduce((max, current) =>
      current.percentage > max.percentage ? current : max
    , allocations[0] || { percentage: 0, assetClass: 'None' });

    // Convert HHI to 0-100 score (inverted so higher = better)
    // Perfect diversification (many equal parts) = HHI ~0, Score ~100
    // Total concentration (one asset) = HHI = 1, Score = 0
    let score = Math.round((1 - hhi) * 100);

    // Adjust score based on number of asset classes
    const assetClassCount = allocations.length;
    if (assetClassCount < 3) score = Math.min(score, 50);
    if (assetClassCount < 2) score = Math.min(score, 25);

    // Determine rating
    let rating: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) rating = 'excellent';
    else if (score >= 70) rating = 'good';
    else if (score >= 50) rating = 'fair';
    else rating = 'poor';

    return {
      score,
      rating,
      herfindahlIndex: hhi,
      assetClassCount,
      maxConcentration: maxAllocation.percentage,
      maxConcentrationAsset: maxAllocation.assetClass,
    };
  }

  /**
   * Calculate Risk Level based on stock/bond allocation
   */
  calculateRiskLevel(allocations: AssetClassAllocation[]): RiskAnalysis {
    const total = allocations.reduce((sum, a) => sum + a.percentage, 0);

    const stockPercentage = allocations
      .filter(a => a.assetClass.toLowerCase().includes('stock') || a.assetClass.toLowerCase().includes('equity'))
      .reduce((sum, a) => sum + a.percentage, 0);

    const bondPercentage = allocations
      .filter(a => a.assetClass.toLowerCase().includes('bond') || a.assetClass.toLowerCase().includes('fixed'))
      .reduce((sum, a) => sum + a.percentage, 0);

    // Determine risk level
    let level: RiskAnalysis['level'];
    if (stockPercentage >= 80) level = 'aggressive';
    else if (stockPercentage >= 60) level = 'moderate_aggressive';
    else if (stockPercentage >= 40) level = 'moderate';
    else if (stockPercentage >= 20) level = 'conservative_moderate';
    else level = 'conservative';

    // Estimate volatility and return (simplified historical averages)
    // These are rough estimates based on historical data
    const estimatedVolatility = Math.round(stockPercentage * 0.2 + bondPercentage * 0.05);
    const estimatedReturn = Math.round(stockPercentage * 0.10 + bondPercentage * 0.04);

    return {
      level,
      stockPercentage,
      bondPercentage,
      estimatedVolatility,
      estimatedReturn,
    };
  }

  /**
   * Calculate drift from target allocation
   */
  calculateDrift(
    currentAllocations: AssetClassAllocation[],
    targetAllocations: Record<string, number>,
    totalPortfolioValue: number,
    rebalanceThreshold: number = 5
  ): DriftAnalysis {
    const drifts = Object.entries(targetAllocations).map(([assetClass, targetPct]) => {
      const current = currentAllocations.find(a => a.assetClass === assetClass);
      const actualPct = current?.percentage || 0;
      const drift = actualPct - targetPct;
      const dollarsToRebalance = (drift / 100) * totalPortfolioValue;

      return {
        assetClass,
        target: targetPct,
        actual: actualPct,
        drift,
        dollarsToRebalance,
      };
    });

    const maxDrift = Math.max(...drifts.map(d => Math.abs(d.drift)));
    const needsRebalance = maxDrift > rebalanceThreshold;

    return {
      maxDrift,
      drifts,
      needsRebalance,
    };
  }

  /**
   * Calculate tax efficiency score
   */
  calculateTaxEfficiency(
    accounts: AccountAllocation[]
  ): TaxEfficiencyAnalysis {
    let score = 100;
    const issues: TaxEfficiencyAnalysis['issues'] = [];

    // Check for bonds in taxable accounts
    const taxableAccounts = accounts.filter(a => a.accountType === 'taxable');
    const bondsInTaxable = taxableAccounts.reduce((sum, account) => {
      const bondValue = account.assetClasses
        .filter(ac => ac.assetClass.toLowerCase().includes('bond'))
        .reduce((s, ac) => s + ac.value, 0);
      return sum + bondValue;
    }, 0);

    if (bondsInTaxable > 0) {
      const penalty = Math.min(40, (bondsInTaxable / 10000) * 10);
      score -= penalty;

      // Estimate tax savings (3% yield × 25% tax bracket)
      const potentialSavings = Math.round(bondsInTaxable * 0.03 * 0.25);

      issues.push({
        type: 'bonds_in_taxable',
        description: `You have $${bondsInTaxable.toLocaleString()} in bonds in taxable accounts. Moving to tax-deferred accounts could save ~$${potentialSavings}/year in taxes.`,
        potentialSavings,
        severity: bondsInTaxable > 50000 ? 'high' : bondsInTaxable > 20000 ? 'medium' : 'low',
      });
    }

    // Check for growth stocks in tax-deferred accounts
    const deferredAccounts = accounts.filter(a => a.accountType === 'tax_deferred');
    const stocksInDeferred = deferredAccounts.reduce((sum, account) => {
      const stockValue = account.assetClasses
        .filter(ac => ac.assetClass.toLowerCase().includes('stock'))
        .reduce((s, ac) => s + ac.value, 0);
      return sum + stockValue;
    }, 0);

    if (stocksInDeferred > 50000) {
      const penalty = Math.min(20, (stocksInDeferred / 10000) * 5);
      score -= penalty;

      issues.push({
        type: 'growth_in_deferred',
        description: `You have $${stocksInDeferred.toLocaleString()} in stocks in tax-deferred accounts. Growth stocks often benefit more from being in taxable or Roth accounts for long-term capital gains treatment.`,
        potentialSavings: 0, // Hard to quantify
        severity: stocksInDeferred > 200000 ? 'high' : 'medium',
      });
    }

    // Check for unused tax-free accounts
    const taxFreeAccounts = accounts.filter(a => a.accountType === 'tax_free');
    const taxFreeTotal = taxFreeAccounts.reduce((sum, a) => sum + a.totalValue, 0);

    if (taxFreeTotal === 0) {
      score -= 15;
      issues.push({
        type: 'no_tax_free_accounts',
        description: 'You have no tax-free accounts (Roth IRA, Roth 401k). Consider opening one for tax-free growth.',
        potentialSavings: 0,
        severity: 'medium',
      });
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      issues,
    };
  }

  /**
   * Format risk level for display
   */
  formatRiskLevel(level: RiskAnalysis['level']): string {
    const labels: Record<RiskAnalysis['level'], string> = {
      conservative: 'Conservative',
      conservative_moderate: 'Conservative-Moderate',
      moderate: 'Moderate',
      moderate_aggressive: 'Moderate-Aggressive',
      aggressive: 'Aggressive',
    };
    return labels[level];
  }

  /**
   * Get color for priority levels
   */
  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600',
    };
    return colors[priority];
  }

  /**
   * Get icon for priority levels
   */
  getPriorityIcon(priority: 'high' | 'medium' | 'low'): string {
    const icons = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };
    return icons[priority];
  }
}

export const allocationAnalysisService = new AllocationAnalysisService();
