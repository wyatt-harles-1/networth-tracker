/**
 * ============================================================================
 * useHoldings Hook - Investment Holdings Management
 * ============================================================================
 *
 * Manages investment holdings (stocks, ETFs, crypto, bonds, etc.) with
 * real-time sync via Supabase subscriptions.
 *
 * Holdings represent the current positions in an investment account.
 * Each holding tracks:
 * - Symbol (ticker)
 * - Quantity (shares/units owned)
 * - Cost basis (total amount paid)
 * - Current price (latest market price)
 * - Current value (quantity × current price)
 *
 * Holdings are typically calculated from transactions rather than manually
 * entered, using the HoldingsRecalculationService.
 *
 * Features:
 * - Real-time updates when holdings change in database
 * - CRUD operations for holdings
 * - Optional account filtering (all holdings or specific account)
 * - Automatic current_value calculation
 * - Price update convenience method
 * - User-scoped queries
 *
 * Usage:
 * ```tsx
 * // All holdings for user
 * const { holdings, updatePrice } = useHoldings();
 *
 * // Only holdings for specific account
 * const { holdings } = useHoldings(accountId);
 *
 * // Update price for a holding
 * await updatePrice(holdingId, 150.25);
 * ```
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
 * Holding database record
 * Represents a current investment position
 */
interface Holding {
  /** Unique holding identifier */
  id: string;

  /** Owner user ID */
  user_id: string;

  /** Account this holding belongs to */
  account_id: string;

  /** Ticker symbol (e.g., "AAPL", "BTC", "SPY") */
  symbol: string;

  /** Full name of the security */
  name: string;

  /** Number of shares/units owned */
  quantity: number;

  /** Total amount paid for this position */
  cost_basis: number;

  /** Current market price per share/unit */
  current_price: number;

  /** Calculated: quantity × current_price */
  current_value: number;

  /** Type: stock, etf, crypto, bond, mutual_fund, etc. */
  asset_type: string;

  /** How this holding was created (transaction, manual, import) */
  import_source: string;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;
}

/**
 * Shape for inserting new holdings
 * Excludes auto-generated/calculated fields
 */
type HoldingInsert = Omit<
  Holding,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_value'
>;

/**
 * Shape for updating existing holdings
 * Excludes account_id (holdings cannot be moved between accounts)
 */
type HoldingUpdate = Partial<Omit<HoldingInsert, 'account_id'>>;

// ============================================================================
// HOOK
// ============================================================================

/**
 * useHoldings Hook
 *
 * Provides holdings state and management methods.
 * Automatically subscribes to real-time updates.
 *
 * @param accountId - Optional account ID to filter holdings (omit for all holdings)
 * @returns Holdings data and CRUD methods
 */
export function useHoldings(accountId?: string) {
  // ===== HOOKS =====
  const { user } = useAuth();

  // ===== STATE =====
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== DATA FETCHING & REAL-TIME SYNC =====
  useEffect(() => {
    // Exit early if no user (not logged in)
    if (!user) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchHoldings();

    // Set up real-time subscription
    // Note: Filters by user_id globally, not by account_id
    // This allows monitoring all holdings across accounts
    const channel = supabase
      .channel('holdings-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (insert, update, delete)
          schema: 'public',
          table: 'holdings',
          filter: `user_id=eq.${user.id}`, // Only for current user
        },
        () => {
          // Refetch holdings when any change occurs
          fetchHoldings();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, accountId]);

  /**
   * Fetch holdings for current user
   *
   * If accountId is provided, only fetches holdings for that account.
   * Otherwise, fetches all holdings for the user.
   *
   * Results are ordered by creation date (newest first).
   */
  const fetchHoldings = async () => {
    try {
      // Start building query
      let query = supabase.from('holdings').select('*').eq('user_id', user!.id);

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      // Execute query with ordering
      const { data, error } = await query.order('created_at', {
        ascending: false, // Newest first
      });

      if (error) throw error;

      setHoldings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch holdings');
    } finally {
      setLoading(false);
    }
  };

  // ===== CRUD METHODS =====

  /**
   * Add a new holding
   *
   * Automatically calculates current_value from quantity and current_price.
   * Assigns user_id from auth context.
   *
   * Note: Holdings are typically created/updated by HoldingsRecalculationService
   * based on transactions rather than manually added.
   *
   * @param holding - Holding data to insert
   * @returns Object with error (null on success)
   */
  const addHolding = async (holding: HoldingInsert) => {
    try {
      // Calculate current value
      const currentValue = holding.quantity * holding.current_price;

      const { error } = await supabase.from('holdings').insert({
        ...holding,
        user_id: user!.id,
        current_value: currentValue,
      });

      if (error) throw error;

      // Refresh holdings list
      await fetchHoldings();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to add holding';
      return { error: errorMessage };
    }
  };

  /**
   * Update an existing holding
   *
   * Automatically recalculates current_value when quantity or current_price changes.
   * Only updates holdings belonging to current user.
   *
   * Common use cases:
   * - Update current_price from market data
   * - Adjust quantity from transaction processing
   * - Update name or metadata
   *
   * @param id - Holding ID to update
   * @param updates - Partial holding data to update
   * @returns Object with error (null on success)
   */
  const updateHolding = async (id: string, updates: HoldingUpdate) => {
    try {
      // Find existing holding to get current values
      const holding = holdings.find(h => h.id === id);
      if (!holding) throw new Error('Holding not found');

      // Determine final values (use updates if provided, otherwise keep existing)
      const quantity = updates.quantity ?? holding.quantity;
      const currentPrice = updates.current_price ?? holding.current_price;

      // Recalculate current value
      const currentValue = quantity * currentPrice;

      const { error } = await supabase
        .from('holdings')
        .update({
          ...updates,
          current_value: currentValue,
        })
        .eq('id', id)
        .eq('user_id', user!.id); // Security: only update own holdings

      if (error) throw error;

      // Refresh holdings list
      await fetchHoldings();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update holding';
      return { error: errorMessage };
    }
  };

  /**
   * Delete a holding
   *
   * WARNING: This removes the position from the account.
   * Typically, holdings should be adjusted to zero quantity rather than deleted
   * to maintain historical records.
   *
   * Only deletes holdings belonging to current user.
   *
   * @param id - Holding ID to delete
   * @returns Object with error (null on success)
   */
  const deleteHolding = async (id: string) => {
    try {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id); // Security: only delete own holdings

      if (error) throw error;

      // Refresh holdings list
      await fetchHoldings();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete holding';
      return { error: errorMessage };
    }
  };

  /**
   * Update price for a holding
   *
   * Convenience method for updating just the current price.
   * Automatically recalculates current_value.
   *
   * Commonly used for:
   * - Real-time price updates from market data
   * - Manual price corrections
   *
   * @param id - Holding ID
   * @param newPrice - New price per share/unit
   * @returns Object with error (null on success)
   */
  const updatePrice = async (id: string, newPrice: number) => {
    return updateHolding(id, { current_price: newPrice });
  };

  // ===== RETURN =====
  return {
    /** All holdings (filtered by accountId if provided) */
    holdings,

    /** True while fetching holdings */
    loading,

    /** Error message if fetch failed */
    error,

    /** Add new holding */
    addHolding,

    /** Update existing holding */
    updateHolding,

    /** Delete holding */
    deleteHolding,

    /** Update price for a holding (convenience method) */
    updatePrice,

    /** Manually refetch holdings */
    refetch: fetchHoldings,
  };
}
