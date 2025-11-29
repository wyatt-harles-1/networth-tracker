import { useMemo, useState, useEffect } from 'react';
import { usePortfolioCalculations } from './usePortfolioCalculations';
import { usePortfolioSnapshots } from './usePortfolioSnapshots';
import { useAssetClasses } from './useAssetClasses';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface AssetAllocation {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface PerformanceMetric {
  portfolio: string;
  sp500: string;
  alpha: string;
  winRate: string;
  period: string;
}

export interface UnrealizedGain {
  name: string;
  currentValue: number;
  costBasis: number;
  unrealizedGain: number;
  percentage: number;
  color: string;
}

export interface RealizedGain {
  symbol: string;
  transactionDate: string;
  quantitySold: number;
  salePrice: number;
  costBasis: number;
  saleValue: number;
  realizedGain: number;
  percentage: number;
  holdingPeriod: number;
}

export function useInsightsData() {
  const { user } = useAuth();
  const { portfolio, loading: portfolioLoading } = usePortfolioCalculations();
  const { snapshots, loading: snapshotsLoading } = usePortfolioSnapshots();
  const { loading: assetClassesLoading } = useAssetClasses();
  const [realizedGains, setRealizedGains] = useState<RealizedGain[]>([]);
  const [realizedGainsLoading, setRealizedGainsLoading] = useState(true);

  const allocation: AssetAllocation[] = useMemo(() => {
    return Object.entries(portfolio.assetClassBreakdown).map(
      ([name, data]) => ({
        name,
        value: data.value,
        color: data.color,
        percentage: data.percentage,
      })
    );
  }, [portfolio.assetClassBreakdown]);

  const totalValue = useMemo(() => {
    return portfolio.netWorth;
  }, [portfolio.netWorth]);

  const performanceData = useMemo(() => {
    if (snapshots.length < 2) return [];

    return snapshots
      .slice()
      .reverse()
      .map(snapshot => ({
        time: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        portfolio: snapshot.net_worth,
        costBasis:
          snapshot.total_assets -
          (snapshot.net_worth -
            snapshot.total_assets +
            snapshot.total_liabilities),
      }));
  }, [snapshots]);

  const benchmarkData = useMemo(() => {
    if (snapshots.length < 2) return [];

    return snapshots
      .slice()
      .reverse()
      .map(snapshot => ({
        time: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        portfolio: snapshot.net_worth,
        costBasis: snapshot.total_assets,
      }));
  }, [snapshots]);

  const unrealizedGains: UnrealizedGain[] = useMemo(() => {
    return Object.entries(portfolio.assetClassBreakdown).map(([name, data]) => {
      const costBasis = data.value * 0.85;
      const unrealizedGain = data.value - costBasis;
      const percentage = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

      return {
        name,
        currentValue: data.value,
        costBasis,
        unrealizedGain,
        percentage,
        color: data.color,
      };
    });
  }, [portfolio.assetClassBreakdown]);

  const monthlyTrend = useMemo(() => {
    if (snapshots.length === 0) return [];

    return snapshots
      .slice(-6)
      .reverse()
      .map(snapshot => ({
        month: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', {
          month: 'short',
        }),
        value: snapshot.net_worth,
      }));
  }, [snapshots]);

  const percentageChange = useMemo(() => {
    if (snapshots.length < 2) return 0;

    const sortedSnapshots = [...snapshots].sort(
      (a, b) =>
        new Date(a.snapshot_date).getTime() -
        new Date(b.snapshot_date).getTime()
    );

    const oldestValue = sortedSnapshots[0].net_worth;
    const currentValue = portfolio.netWorth;

    if (oldestValue === 0) return 0;

    return ((currentValue - oldestValue) / Math.abs(oldestValue)) * 100;
  }, [snapshots, portfolio.netWorth]);

  // Fetch realized gains from sell transactions
  useEffect(() => {
    async function fetchRealizedGains() {
      if (!user) {
        setRealizedGainsLoading(false);
        return;
      }

      try {
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .in('transaction_type', [
            'stock_sell',
            'etf_sell',
            'crypto_sell',
            'option_sell',
            'bond_sell',
          ])
          .order('transaction_date', { ascending: false });

        if (error) throw error;

        const gains: RealizedGain[] = (transactions || [])
          .map(txn => {
            const metadata = txn.transaction_metadata as any;
            const realizedGain = Number(metadata?.realized_gain || 0);
            const costBasis = Number(metadata?.cost_basis || 0);
            const quantity = Number(metadata?.quantity || 0);
            const price = Number(metadata?.price || 0);
            const saleValue = quantity * price;
            const percentage =
              costBasis > 0 ? (realizedGain / costBasis) * 100 : 0;

            // Calculate holding period (placeholder - would need purchase date from lots)
            const holdingPeriod = 180; // TODO: Get from lots table

            return {
              symbol: metadata?.ticker || metadata?.symbol || 'Unknown',
              transactionDate: txn.transaction_date,
              quantitySold: quantity,
              salePrice: price,
              costBasis,
              saleValue,
              realizedGain,
              percentage,
              holdingPeriod,
            };
          })
          .filter(gain => gain.realizedGain !== 0); // Only include transactions with calculated gains

        setRealizedGains(gains);
      } catch (err) {
        console.error('Error fetching realized gains:', err);
      } finally {
        setRealizedGainsLoading(false);
      }
    }

    fetchRealizedGains();
  }, [user]);

  const totalRealizedGain = useMemo(() => {
    return realizedGains.reduce((sum, gain) => sum + gain.realizedGain, 0);
  }, [realizedGains]);

  return {
    allocation,
    totalValue,
    performanceData,
    benchmarkData,
    unrealizedGains,
    realizedGains,
    totalRealizedGain,
    monthlyTrend,
    percentageChange,
    loading:
      portfolioLoading ||
      snapshotsLoading ||
      assetClassesLoading ||
      realizedGainsLoading,
  };
}
