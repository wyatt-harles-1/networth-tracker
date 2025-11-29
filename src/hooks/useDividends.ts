/**
 * ============================================================================
 * useDividends Hook - Dividend Tracking & Management
 * ============================================================================
 *
 * Manages dividend tracking for stocks and ETFs.
 * Tracks upcoming dividends and dividend payment history.
 *
 * Features:
 * - Track upcoming dividend payments
 * - Record dividend payment history
 * - Filter dividends by date range
 * - Calculate total upcoming dividend income
 * - Mark dividends as paid
 * - CRUD operations for manual dividend entries
 *
 * Dividend Lifecycle:
 * 1. Ex-Date: Date on which stock must be owned to receive dividend
 * 2. Pay-Date: Date dividend is paid to shareholders
 * 3. Status: 'upcoming' (not yet paid) or 'paid' (received)
 *
 * Usage:
 * ```tsx
 * const {
 *   dividends,
 *   getUpcomingDividends,
 *   getTotalUpcomingDividends,
 *   markAsPaid
 * } = useDividends();
 *
 * // Get dividends due in next 30 days
 * const upcoming = getUpcomingDividends(30);
 *
 * // Calculate total upcoming income
 * const total = getTotalUpcomingDividends(30);
 *
 * // Mark dividend as received
 * await markAsPaid(dividendId);
 * ```
 *
 * Note: Dividends can be automatically imported from transaction history
 * (dividend transactions) or manually entered for tracking future payments.
 *
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Dividend record
 * Represents a dividend payment (past or future)
 */
interface Dividend {
  /** Unique dividend identifier */
  id: string;

  /** Owner user ID */
  user_id: string;

  /** Associated holding (if linked to portfolio position) */
  holding_id: string | null;

  /** Stock/ETF symbol */
  symbol: string;

  /** Ex-dividend date (must own stock by this date) */
  ex_date: string;

  /** Payment date (when dividend is paid) */
  pay_date: string;

  /** Dividend amount in USD */
  amount: number;

  /** Payment status */
  status: 'upcoming' | 'paid';

  /** Creation timestamp */
  created_at: string;
}

/**
 * Shape for inserting new dividends
 * Excludes auto-generated fields
 */
type DividendInsert = Omit<Dividend, 'id' | 'user_id' | 'created_at'>;

// ============================================================================
// HOOK
// ============================================================================

/**
 * useDividends Hook
 *
 * Provides dividend data and management methods.
 *
 * @returns Dividend data, filtering methods, and CRUD operations
 */
export function useDividends() {
  // ===== HOOKS =====
  const { user } = useAuth();

  // ===== STATE =====
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== DATA LOADING =====
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchDividends();
  }, [user]);

  /**
   * Fetch all dividends for current user
   * Ordered by payment date (earliest first)
   */
  const fetchDividends = async () => {
    try {
      const { data, error } = await supabase
        .from('dividends')
        .select('*')
        .eq('user_id', user!.id)
        .order('pay_date', { ascending: true });

      if (error) throw error;

      setDividends(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch dividends'
      );
    } finally {
      setLoading(false);
    }
  };

  // ===== CRUD METHODS =====

  /**
   * Add a new dividend entry
   *
   * Useful for:
   * - Recording expected future dividends
   * - Manually entering dividend history
   * - Tracking dividends from non-portfolio stocks
   *
   * @param dividend - Dividend data to insert
   * @returns Object with error (null on success)
   */
  const addDividend = async (dividend: DividendInsert) => {
    try {
      const { error } = await supabase.from('dividends').insert({
        ...dividend,
        user_id: user!.id,
      });

      if (error) throw error;

      // Refresh dividend list
      await fetchDividends();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to add dividend';
      return { error: errorMessage };
    }
  };

  /**
   * Update an existing dividend
   *
   * Common use cases:
   * - Correct dividend amount
   * - Update payment date
   * - Change status
   *
   * @param id - Dividend ID to update
   * @param updates - Partial dividend data to update
   * @returns Object with error (null on success)
   */
  const updateDividend = async (
    id: string,
    updates: Partial<DividendInsert>
  ) => {
    try {
      const { error } = await supabase
        .from('dividends')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id); // Security: only update own dividends

      if (error) throw error;

      // Refresh dividend list
      await fetchDividends();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update dividend';
      return { error: errorMessage };
    }
  };

  /**
   * Delete a dividend entry
   *
   * @param id - Dividend ID to delete
   * @returns Object with error (null on success)
   */
  const deleteDividend = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dividends')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id); // Security: only delete own dividends

      if (error) throw error;

      // Refresh dividend list
      await fetchDividends();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete dividend';
      return { error: errorMessage };
    }
  };

  /**
   * Mark dividend as paid
   *
   * Convenience method to update status to 'paid'.
   * Typically called after dividend is received.
   *
   * @param id - Dividend ID
   * @returns Object with error (null on success)
   */
  const markAsPaid = async (id: string) => {
    return updateDividend(id, { status: 'paid' });
  };

  // ===== FILTERING & CALCULATION METHODS =====

  /**
   * Get upcoming dividends within specified days
   *
   * Filters for dividends that:
   * - Have status 'upcoming'
   * - Have pay_date between today and future date
   *
   * @param days - Number of days to look ahead (default: 30)
   * @returns Array of upcoming dividends
   *
   * @example
   * ```tsx
   * // Get dividends due in next 30 days
   * const next30Days = getUpcomingDividends(30);
   *
   * // Get dividends due in next week
   * const nextWeek = getUpcomingDividends(7);
   * ```
   */
  const getUpcomingDividends = (days: number = 30) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return dividends.filter(d => {
      const payDate = new Date(d.pay_date);
      return (
        d.status === 'upcoming' && payDate >= today && payDate <= futureDate
      );
    });
  };

  /**
   * Calculate total upcoming dividend income
   *
   * Sums amount of all upcoming dividends within specified days.
   * Useful for forecasting income.
   *
   * @param days - Number of days to look ahead (default: 30)
   * @returns Total dividend amount expected
   *
   * @example
   * ```tsx
   * // Expected dividend income in next month
   * const monthlyIncome = getTotalUpcomingDividends(30);
   * // Returns: 250.50
   *
   * // Expected dividend income in next quarter
   * const quarterlyIncome = getTotalUpcomingDividends(90);
   * ```
   */
  const getTotalUpcomingDividends = (days: number = 30) => {
    return getUpcomingDividends(days).reduce((sum, d) => sum + d.amount, 0);
  };

  // ===== RETURN =====
  return {
    /** All dividends for current user */
    dividends,

    /** True while fetching dividends */
    loading,

    /** Error message if fetch failed */
    error,

    /** Add new dividend entry */
    addDividend,

    /** Update existing dividend */
    updateDividend,

    /** Delete dividend entry */
    deleteDividend,

    /** Mark dividend as paid (convenience method) */
    markAsPaid,

    /** Get upcoming dividends within specified days */
    getUpcomingDividends,

    /** Calculate total upcoming dividend income */
    getTotalUpcomingDividends,

    /** Manually refetch dividends */
    refetch: fetchDividends,
  };
}
