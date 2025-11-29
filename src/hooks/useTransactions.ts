/**
 * ============================================================================
 * useTransactions Hook - Transaction Management
 * ============================================================================
 *
 * Manages financial transactions (buys, sells, dividends, deposits, withdrawals, etc.)
 * with real-time sync via Supabase subscriptions.
 *
 * Features:
 * - Real-time updates when transactions change in database
 * - CRUD operations for transactions
 * - Optional account filtering (all transactions or specific account)
 * - Automatic refetch on database changes
 * - User-scoped queries (only fetches current user's transactions)
 * - Sorted by date (newest first)
 *
 * Transaction Types:
 * - Investment: buy_stock, sell_stock, stock_dividend, options_exercise, etc.
 * - Cash: deposit, withdrawal, transfer
 * - Crypto: buy_crypto, sell_crypto, crypto_staking
 * - Other: fee, interest, adjustment
 *
 * Usage:
 * ```tsx
 * // All transactions for user
 * const { transactions, addTransaction } = useTransactions();
 *
 * // Only transactions for specific account
 * const { transactions } = useTransactions(accountId);
 *
 * // Add a new transaction
 * await addTransaction({
 *   account_id: 'abc123',
 *   transaction_type: 'buy_stock',
 *   transaction_date: '2024-01-15',
 *   amount: -1000,
 *   description: 'Bought 10 shares of AAPL',
 *   transaction_metadata: {
 *     ticker: 'AAPL',
 *     quantity: 10,
 *     price_per_share: 100
 *   }
 * });
 * ```
 *
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
} from '@/types/transaction';

// ============================================================================
// HOOK
// ============================================================================

/**
 * useTransactions Hook
 *
 * Provides transaction state and management methods.
 * Automatically subscribes to real-time updates.
 *
 * @param accountId - Optional account ID to filter transactions (omit for all transactions)
 * @returns Transaction data and CRUD methods
 */
export function useTransactions(accountId?: string) {
  // ===== HOOKS =====
  const { user } = useAuth();

  // ===== STATE =====
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    fetchTransactions();

    // Build filter for real-time subscription
    // Always filter by user_id, optionally by account_id
    let filter = `user_id=eq.${user.id}`;
    if (accountId) {
      filter += `,account_id=eq.${accountId}`;
    }

    // Set up real-time subscription
    // Listens for INSERT, UPDATE, DELETE events on transactions table
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (insert, update, delete)
          schema: 'public',
          table: 'transactions',
          filter: filter, // Filter by user and optionally account
        },
        () => {
          // Refetch transactions when any change occurs
          fetchTransactions();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, accountId]);

  /**
   * Fetch transactions for current user
   *
   * If accountId is provided, only fetches transactions for that account.
   * Otherwise, fetches all transactions for the user.
   *
   * Results are ordered by transaction date (newest first).
   */
  const fetchTransactions = async () => {
    try {
      // Start building query
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id);

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      // Execute query with date ordering
      const { data, error } = await query.order('transaction_date', {
        ascending: false, // Newest first
      });

      if (error) throw error;

      setTransactions(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch transactions'
      );
    } finally {
      setLoading(false);
    }
  };

  // ===== CRUD METHODS =====

  /**
   * Add a new transaction
   *
   * Automatically assigns user_id from auth context.
   * Refetches transactions after successful insert.
   *
   * Important: Transaction amount conventions:
   * - Negative for money out (purchases, withdrawals, fees)
   * - Positive for money in (sales, deposits, dividends)
   *
   * @param transaction - Transaction data to insert
   * @returns Object with error (null on success)
   */
  const addTransaction = async (transaction: TransactionInsert) => {
    try {
      console.log('Adding transaction:', transaction);

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transaction,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Transaction inserted successfully:', data);

      // Refresh transaction list
      await fetchTransactions();
      return { error: null };
    } catch (err) {
      console.error('addTransaction error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to add transaction';
      return { error: errorMessage };
    }
  };

  /**
   * Update an existing transaction
   *
   * Only updates transactions belonging to current user (via user_id check).
   * Useful for correcting errors or updating metadata.
   *
   * @param id - Transaction ID to update
   * @param updates - Partial transaction data to update
   * @returns Object with error (null on success)
   */
  const updateTransaction = async (id: string, updates: TransactionUpdate) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id); // Security: only update own transactions

      if (error) throw error;

      // Refresh transaction list
      await fetchTransactions();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update transaction';
      return { error: errorMessage };
    }
  };

  /**
   * Delete a transaction
   *
   * WARNING: This may affect:
   * - Account balances
   * - Holdings calculations
   * - Performance metrics
   * - Historical charts
   *
   * Only deletes transactions belonging to current user.
   *
   * @param id - Transaction ID to delete
   * @returns Object with error (null on success)
   */
  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id); // Security: only delete own transactions

      if (error) throw error;

      // Refresh transaction list
      await fetchTransactions();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete transaction';
      return { error: errorMessage };
    }
  };

  // ===== RETURN =====
  return {
    /** All transactions (filtered by accountId if provided) */
    transactions,

    /** True while fetching transactions */
    loading,

    /** Error message if fetch failed */
    error,

    /** Add new transaction */
    addTransaction,

    /** Update existing transaction */
    updateTransaction,

    /** Delete transaction */
    deleteTransaction,

    /** Manually refetch transactions */
    refetch: fetchTransactions,
  };
}
