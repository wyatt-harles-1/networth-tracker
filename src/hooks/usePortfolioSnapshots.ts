import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolioCalculations } from './usePortfolioCalculations';

interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  asset_class_breakdown: Record<string, number>;
  created_at: string;
}

export function usePortfolioSnapshots() {
  const { user } = useAuth();
  const { portfolio } = usePortfolioCalculations();
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchSnapshots();

    const channel = supabase
      .channel('portfolio-snapshots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_snapshots',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSnapshots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchSnapshots = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', user!.id)
        .order('snapshot_date', { ascending: false })
        .limit(90);

      if (error) throw error;

      setSnapshots(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch snapshots'
      );
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async (date?: string) => {
    try {
      const snapshotDate = date || new Date().toISOString().split('T')[0];

      const assetClassValues: Record<string, number> = {};
      Object.entries(portfolio.assetClassBreakdown).forEach(([name, data]) => {
        assetClassValues[name] = data.value;
      });

      const { error } = await supabase.from('portfolio_snapshots').upsert(
        {
          user_id: user!.id,
          snapshot_date: snapshotDate,
          total_assets: portfolio.totalAssets,
          total_liabilities: portfolio.totalLiabilities,
          net_worth: portfolio.netWorth,
          asset_class_breakdown: assetClassValues,
        },
        {
          onConflict: 'user_id,snapshot_date',
        }
      );

      if (error) throw error;

      await fetchSnapshots();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create snapshot';
      return { error: errorMessage };
    }
  };

  const deleteSnapshot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_snapshots')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      await fetchSnapshots();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete snapshot';
      return { error: errorMessage };
    }
  };

  const getNetWorthHistory = (days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return snapshots
      .filter(s => new Date(s.snapshot_date) >= cutoffDate)
      .map(s => ({
        date: s.snapshot_date,
        netWorth: s.net_worth,
        totalAssets: s.total_assets,
        totalLiabilities: s.total_liabilities,
      }))
      .reverse();
  };

  const getPortfolioHistory = (days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return snapshots
      .filter(s => new Date(s.snapshot_date) >= cutoffDate)
      .map(s => ({
        snapshotDate: s.snapshot_date,
        netWorth: Number(s.net_worth),
        totalAssets: Number(s.total_assets),
        totalLiabilities: Number(s.total_liabilities),
        assetClassBreakdown: s.asset_class_breakdown,
      }))
      .reverse();
  };

  return {
    snapshots,
    loading,
    error,
    createSnapshot,
    deleteSnapshot,
    getNetWorthHistory,
    getPortfolioHistory,
    refetch: fetchSnapshots,
  };
}
