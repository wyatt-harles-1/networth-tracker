/**
 * ============================================================================
 * usePortfolioCalculations Hook - Portfolio Analytics & Metrics
 * ============================================================================
 *
 * Calculates comprehensive portfolio metrics from accounts, holdings, and transactions.
 * Provides real-time portfolio summary with net worth, gains, asset breakdown, and income.
 *
 * This is one of the most important hooks in the application as it powers
 * dashboards, performance views, and financial insights.
 *
 * Features:
 * - Net worth calculation (assets - liabilities)
 * - Investment performance (unrealized + realized gains, ROI%)
 * - Asset class breakdown with percentages
 * - Dividend income tracking (all-time and trailing 12 months)
 * - Cash vs investments split
 * - Real estate tracking
 * - Account type breakdown
 *
 * Usage:
 * ```tsx
 * const { portfolio, loading } = usePortfolioCalculations();
 *
 * console.log(portfolio.netWorth);          // 125000
 * console.log(portfolio.totalGain);         // 15000
 * console.log(portfolio.roiPercentage);     // 13.64%
 * console.log(portfolio.assetClassBreakdown);
 * // {
 * //   "Stocks": { value: 75000, percentage: 60, color: "#3B82F6" },
 * //   "Bonds": { value: 25000, percentage: 20, color: "#10B981" },
 * //   "Cash": { value: 25000, percentage: 20, color: "#6B7280" }
 * // }
 * ```
 *
 * Calculation Details:
 * - Total Assets: Sum of all holding current values
 * - Total Liabilities: Sum of liability account balances (absolute value)
 * - Net Worth: Total Assets - Total Liabilities
 * - Unrealized Gain: (Current Value - Cost Basis) for open positions
 * - Realized Gain: Fetched from account_balance_history table
 * - ROI: (Total Gain / Cost Basis) × 100
 *
 * Performance:
 * All calculations are memoized and only recompute when dependencies change.
 *
 * ============================================================================
 */

import { useMemo, useState, useEffect } from 'react';
import { useAccounts } from './useAccounts';
import { useHoldings } from './useHoldings';
import { useAssetClasses } from './useAssetClasses';
import { useTransactions } from './useTransactions';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Comprehensive portfolio summary
 * Contains all key financial metrics and breakdowns
 */
interface PortfolioSummary {
  /** Total value of all assets */
  totalAssets: number;

  /** Total liabilities (loans, credit cards, mortgages) */
  totalLiabilities: number;

  /** Net worth (assets - liabilities) */
  netWorth: number;

  /** Value of investments (excludes cash) */
  totalInvestments: number;

  /** Cash holdings across all accounts */
  totalCash: number;

  /** Real estate holdings */
  totalRealEstate: number;

  /** Total amount invested (sum of cost basis) */
  totalCostBasis: number;

  /** Unrealized gains on current holdings */
  totalUnrealizedGain: number;

  /** Realized gains from closed positions */
  totalRealizedGain: number;

  /** Total gain (unrealized + realized) */
  totalGain: number;

  /** Return on investment percentage */
  roiPercentage: number;

  /** All-time dividend income */
  allTimeDividendIncome: number;

  /** Dividend income in last 12 months */
  trailing12MonthDividendIncome: number;

  /** Asset allocation by class (Stocks, Bonds, Real Estate, etc.) */
  assetClassBreakdown: Record<
    string,
    {
      value: number;
      percentage: number;
      color: string;
    }
  >;

  /** Breakdown by account type (assets vs liabilities) */
  accountTypeBreakdown: {
    assets: number;
    liabilities: number;
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * usePortfolioCalculations Hook
 *
 * Orchestrates portfolio calculation from multiple data sources.
 * Fetches realized gains and memoizes all calculations for performance.
 *
 * @returns Portfolio summary and loading state
 */
export function usePortfolioCalculations() {
  // ===== HOOKS =====
  const { user } = useAuth();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { holdings, loading: holdingsLoading } = useHoldings();
  const { assetClasses, loading: assetClassesLoading } = useAssetClasses();
  const { transactions, loading: transactionsLoading } = useTransactions();

  // ===== STATE =====
  const [realizedGains, setRealizedGains] = useState<Record<string, number>>(
    {}
  );
  const [realizedGainsLoading, setRealizedGainsLoading] = useState(true);

  // ===== DATA FETCHING =====

  /**
   * Fetch realized gains from account balance history
   *
   * Realized gains are stored in the account_balance_history table
   * and represent profits/losses from closed positions.
   *
   * We fetch the latest realized_gain value for each account.
   */
  useEffect(() => {
    if (!user) {
      setRealizedGainsLoading(false);
      return;
    }

    const fetchRealizedGains = async () => {
      try {
        // Fetch all balance history records, ordered by date (newest first)
        const { data, error } = await supabase
          .from('account_balance_history')
          .select('account_id, realized_gain')
          .eq('user_id', user.id)
          .order('snapshot_date', { ascending: false });

        if (error) throw error;

        // Extract latest realized gain for each account
        // (first occurrence is most recent due to ordering)
        const latestGains: Record<string, number> = {};
        if (data) {
          data.forEach(record => {
            if (!latestGains[record.account_id]) {
              latestGains[record.account_id] = Number(
                record.realized_gain || 0
              );
            }
          });
        }

        setRealizedGains(latestGains);
      } catch (err) {
        console.error('Failed to fetch realized gains:', err);
      } finally {
        setRealizedGainsLoading(false);
      }
    };

    fetchRealizedGains();
  }, [user]);

  // ===== PORTFOLIO CALCULATIONS =====

  /**
   * Calculate comprehensive portfolio summary
   *
   * Memoized to avoid expensive recalculations on every render.
   * Only recomputes when accounts, holdings, assetClasses, transactions,
   * or realizedGains change.
   */
  const portfolio = useMemo<PortfolioSummary>(() => {
    // ----- BASIC METRICS -----

    // Total Assets: Sum of all asset account balances
    // This includes both holdings and cash balances
    const totalAssets = accounts
      .filter(acc => acc.account_type === 'asset')
      .reduce((sum, acc) => sum + Number(acc.current_balance), 0);

    // Total Liabilities: Sum of liability account balances (converted to positive)
    const totalLiabilities = Math.abs(
      accounts
        .filter(acc => acc.account_type === 'liability')
        .reduce((sum, acc) => sum + Number(acc.current_balance), 0)
    );

    // Net Worth: Assets minus liabilities
    const netWorth = totalAssets - totalLiabilities;

    // Total Investments: All holdings except cash
    const totalInvestments = holdings
      .filter(h => h.symbol !== 'CASH')
      .reduce((sum, h) => sum + Number(h.current_value), 0);

    // Total Cash: Cash holdings across all accounts
    const totalCash = holdings
      .filter(h => h.symbol === 'CASH')
      .reduce((sum, h) => sum + Number(h.current_value), 0);

    // Total Real Estate: Holdings in real estate accounts
    // Identified by account category containing "real estate"
    const realEstateAccounts = accounts.filter(
      acc =>
        acc.account_type === 'asset' &&
        acc.category.toLowerCase().includes('real estate')
    );
    const realEstateAccountIds = new Set(realEstateAccounts.map(acc => acc.id));
    const totalRealEstate = holdings
      .filter(h => realEstateAccountIds.has(h.account_id))
      .reduce((sum, h) => sum + Number(h.current_value), 0);

    // ----- ASSET CLASS BREAKDOWN -----

    // Group holdings by asset class for allocation pie chart
    const assetClassBreakdown: Record<
      string,
      { value: number; percentage: number; color: string }
    > = {};

    holdings.forEach(holding => {
      // Find account for this holding
      const account = accounts.find(acc => acc.id === holding.account_id);
      if (!account || account.account_type !== 'asset') return;

      // Determine asset class name and color
      let className = 'Uncategorized';
      let color = '#6B7280'; // Gray for uncategorized

      if (account.asset_class_id) {
        const assetClass = assetClasses.find(
          ac => ac.id === account.asset_class_id
        );
        if (assetClass) {
          className = assetClass.name;
          color = assetClass.color;
        }
      }

      // Initialize class if not exists
      if (!assetClassBreakdown[className]) {
        assetClassBreakdown[className] = {
          value: 0,
          percentage: 0,
          color: color,
        };
      }

      // Add holding value to class total
      assetClassBreakdown[className].value += Number(holding.current_value);
    });

    // Calculate percentages for each asset class
    Object.keys(assetClassBreakdown).forEach(key => {
      assetClassBreakdown[key].percentage =
        totalAssets > 0
          ? (assetClassBreakdown[key].value / totalAssets) * 100
          : 0;
    });

    // ----- TAX VEHICLE BREAKDOWN -----

    // Tax vehicle color mapping
    const TAX_VEHICLE_COLORS: Record<string, string> = {
      'Taxable': '#F59E0B',           // Orange/Amber
      'Tax-Deferred': '#10B981',      // Green
      'Tax-Free': '#3B82F6',          // Blue
      'Not Specified': '#6B7280',     // Gray
    };

    // Group holdings by tax vehicle type for allocation pie chart
    const taxVehicleBreakdown: Record<
      string,
      { value: number; percentage: number; color: string }
    > = {};

    holdings.forEach(holding => {
      // Find account for this holding
      const account = accounts.find(acc => acc.id === holding.account_id);
      if (!account || account.account_type !== 'asset') return;

      // Determine tax vehicle name and color
      let vehicleName = 'Not Specified';
      let color = TAX_VEHICLE_COLORS['Not Specified'];

      if (account.tax_type === 'taxable') {
        vehicleName = 'Taxable';
        color = TAX_VEHICLE_COLORS['Taxable'];
      } else if (account.tax_type === 'tax_deferred') {
        vehicleName = 'Tax-Deferred';
        color = TAX_VEHICLE_COLORS['Tax-Deferred'];
      } else if (account.tax_type === 'tax_free') {
        vehicleName = 'Tax-Free';
        color = TAX_VEHICLE_COLORS['Tax-Free'];
      }

      // Initialize vehicle if not exists
      if (!taxVehicleBreakdown[vehicleName]) {
        taxVehicleBreakdown[vehicleName] = {
          value: 0,
          percentage: 0,
          color: color,
        };
      }

      // Add holding value to vehicle total
      taxVehicleBreakdown[vehicleName].value += Number(holding.current_value);
    });

    // Calculate percentages for each tax vehicle
    Object.keys(taxVehicleBreakdown).forEach(key => {
      taxVehicleBreakdown[key].percentage =
        totalAssets > 0
          ? (taxVehicleBreakdown[key].value / totalAssets) * 100
          : 0;
    });

    // ----- GAINS & PERFORMANCE -----

    // Cost Basis: Total amount invested (excludes cash)
    const totalCostBasis = holdings
      .filter(h => h.symbol !== 'CASH')
      .reduce((sum, h) => sum + Number(h.cost_basis || 0), 0);

    // Unrealized Gain: Profit/loss on current holdings
    // Calculated as: (Current Value - Cost Basis)
    const totalUnrealizedGain = holdings
      .filter(h => h.symbol !== 'CASH')
      .reduce((sum, h) => {
        const currentValue = Number(h.current_value);
        const costBasis = Number(h.cost_basis || 0);
        return sum + (currentValue - costBasis);
      }, 0);

    // Realized Gain: Profit/loss from closed positions
    // Fetched from account_balance_history table
    const totalRealizedGain = Object.values(realizedGains).reduce(
      (sum, gain) => sum + gain,
      0
    );

    // Total Gain: Combined unrealized and realized gains
    const totalGain = totalUnrealizedGain + totalRealizedGain;

    // ROI Percentage: Return on investment
    // Formula: (Total Gain / Cost Basis) × 100
    const roiPercentage =
      totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

    // ----- DIVIDEND INCOME -----

    // Transaction types that represent dividend/interest income
    const dividendTypes = [
      'stock_dividend',
      'etf_dividend',
      'bond_coupon',
      'interest',
    ];

    // All-time dividend income
    const allTimeDividendIncome = transactions
      .filter(t => dividendTypes.includes(t.transaction_type))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Trailing 12-month dividend income
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const trailing12MonthDividendIncome = transactions
      .filter(t => {
        if (!dividendTypes.includes(t.transaction_type)) return false;
        const txDate = new Date(t.transaction_date);
        return txDate >= twelveMonthsAgo;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      totalInvestments,
      totalCash,
      totalRealEstate,
      totalCostBasis,
      totalUnrealizedGain,
      totalRealizedGain,
      totalGain,
      roiPercentage,
      allTimeDividendIncome,
      trailing12MonthDividendIncome,
      assetClassBreakdown,
      taxVehicleBreakdown,
      accountTypeBreakdown: {
        assets: totalAssets,
        liabilities: totalLiabilities,
      },
    };
  }, [accounts, holdings, assetClasses, transactions, realizedGains]);

  return {
    portfolio,
    loading:
      accountsLoading ||
      holdingsLoading ||
      assetClassesLoading ||
      transactionsLoading ||
      realizedGainsLoading,
  };
}
