/**
 * ============================================================================
 * Portfolio Snapshot Service
 * ============================================================================
 *
 * Service for creating and managing daily portfolio snapshots.
 *
 * Key Features:
 * - Generate daily snapshots of portfolio state
 * - Calculate total assets, liabilities, and net worth
 * - Break down assets by asset class
 * - Store historical data for trend analysis
 * - Upsert functionality (update if exists, insert if new)
 *
 * Snapshot Data Includes:
 * - Total Assets: Sum of all asset account balances
 * - Total Liabilities: Sum of all liability account balances
 * - Net Worth: Assets minus liabilities
 * - Asset Class Breakdown: Value per asset class (stocks, bonds, crypto, etc.)
 *
 * Use Cases:
 * - Net worth tracking over time
 * - Portfolio performance charts
 * - Asset allocation trends
 * - Historical analysis
 *
 * Snapshot Frequency:
 * - Typically generated once per day
 * - Can be manually triggered
 * - Upserts prevent duplicate snapshots for same date
 *
 * ============================================================================
 */

import { supabase } from '@/lib/supabase';

/**
 * Data structure for portfolio snapshot
 */
interface SnapshotData {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetClassBreakdown: Record<string, number>;
}

export class PortfolioSnapshotService {
  /**
   * Generate a portfolio snapshot for a specific date
   * Uses upsert to update existing snapshot or create new one
   *
   * @param userId - User ID to generate snapshot for
   * @param snapshotDate - Date for snapshot (defaults to today)
   * @returns Success status and error message if any
   */
  static async generateSnapshot(
    userId: string,
    snapshotDate: string = new Date().toISOString().split('T')[0]
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const snapshotData = await this.calculatePortfolioSnapshot(userId);

      const { error: insertError } = await supabase
        .from('portfolio_snapshots')
        .upsert(
          {
            user_id: userId,
            snapshot_date: snapshotDate,
            total_assets: snapshotData.totalAssets,
            total_liabilities: snapshotData.totalLiabilities,
            net_worth: snapshotData.netWorth,
            asset_class_breakdown: snapshotData.assetClassBreakdown,
          },
          {
            onConflict: 'user_id,snapshot_date',
          }
        );

      if (insertError) throw insertError;

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to generate snapshot',
      };
    }
  }

  static async calculatePortfolioSnapshot(
    userId: string
  ): Promise<SnapshotData> {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*, asset_classes(name, color)')
      .eq('user_id', userId);

    const totalAssets = (accounts || [])
      .filter(acc => acc.account_type === 'asset')
      .reduce((sum, acc) => sum + Number(acc.current_balance), 0);

    const totalLiabilities = Math.abs(
      (accounts || [])
        .filter(acc => acc.account_type === 'liability')
        .reduce((sum, acc) => sum + Number(acc.current_balance), 0)
    );

    const netWorth = totalAssets - totalLiabilities;

    const assetClassBreakdown: Record<string, number> = {};

    (accounts || []).forEach(account => {
      if (account.account_type === 'asset') {
        const assetClass = (account as any).asset_classes;
        const className = assetClass?.name || 'Uncategorized';

        if (!assetClassBreakdown[className]) {
          assetClassBreakdown[className] = 0;
        }
        assetClassBreakdown[className] += Number(account.current_balance);
      }
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      assetClassBreakdown,
    };
  }

  static async getHistoricalSnapshots(
    userId: string,
    days: number = 30
  ): Promise<
    Array<{
      date: string;
      totalAssets: number;
      totalLiabilities: number;
      netWorth: number;
      assetClassBreakdown: Record<string, number>;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch historical snapshots:', error);
      return [];
    }

    return (data || []).map(snapshot => ({
      date: snapshot.snapshot_date,
      totalAssets: Number(snapshot.total_assets),
      totalLiabilities: Number(snapshot.total_liabilities),
      netWorth: Number(snapshot.net_worth),
      assetClassBreakdown: snapshot.asset_class_breakdown || {},
    }));
  }

  static async backfillSnapshots(
    userId: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<{
    success: boolean;
    snapshotsCreated: number;
    error: string | null;
  }> {
    try {
      let snapshotsCreated = 0;
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        const { data: existing } = await supabase
          .from('portfolio_snapshots')
          .select('id')
          .eq('user_id', userId)
          .eq('snapshot_date', dateStr)
          .maybeSingle();

        if (!existing) {
          const result = await this.generateSnapshot(userId, dateStr);
          if (result.success) {
            snapshotsCreated++;
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return { success: true, snapshotsCreated, error: null };
    } catch (err) {
      return {
        success: false,
        snapshotsCreated: 0,
        error:
          err instanceof Error ? err.message : 'Failed to backfill snapshots',
      };
    }
  }
}
