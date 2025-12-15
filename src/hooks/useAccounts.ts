/**
 * ============================================================================
 * useAccounts Hook - Account Management
 * ============================================================================
 *
 * Manages user accounts (checking, savings, investment, credit cards, loans, etc.)
 * with real-time sync via Supabase subscriptions.
 *
 * Features:
 * - Real-time updates when accounts change in database
 * - CRUD operations (Create, Read, Update, Delete)
 * - Visibility toggle for hiding accounts from totals
 * - Automatic refetch on database changes
 * - User-scoped queries (only fetches current user's accounts)
 *
 * Account Types:
 * - asset: Bank accounts, investments, real estate, vehicles
 * - liability: Credit cards, loans, mortgages
 *
 * Usage:
 * ```tsx
 * const { accounts, addAccount, deleteAccount, loading } = useAccounts();
 *
 * // Get all visible accounts
 * const visibleAccounts = accounts.filter(a => a.is_visible);
 *
 * // Add new account
 * await addAccount({
 *   name: 'Chase Checking',
 *   account_type: 'asset',
 *   category: 'Cash & Bank Accounts',
 *   current_balance: 5000,
 *   icon: 'Wallet',
 *   is_visible: true
 * });
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
 * Account database record
 * Represents any financial account (asset or liability)
 */
interface Account {
  /** Unique account identifier */
  id: string;

  /** Owner user ID */
  user_id: string;

  /** Account display name (e.g., "Chase Checking") */
  name: string;

  /** Type: 'asset' or 'liability' */
  account_type: string;

  /** Category (e.g., "Cash & Bank Accounts", "Credit Cards") */
  category: string;

  /** Current balance (positive for assets, often negative for liabilities) */
  current_balance: number;

  /** Icon name from lucide-react (e.g., "Wallet", "CreditCard") */
  icon: string;

  /** Whether to include in net worth calculations */
  is_visible: boolean;

  /** Asset class for allocation analysis */
  asset_class_id: string | null;

  /** Institution name (e.g., "Chase", "Vanguard") */
  institution: string | null;

  /** Last 4 digits of account number for identification */
  account_number_last4: string | null;

  /** User notes */
  notes: string | null;

  /** Tax treatment for investment accounts */
  tax_type: 'taxable' | 'tax_deferred' | 'tax_free' | null;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;
}

/**
 * Shape for inserting new accounts
 * Excludes auto-generated fields (id, user_id, timestamps)
 */
type AccountInsert = Partial<
  Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

/**
 * Shape for updating existing accounts
 * Excludes user_id (cannot be changed after creation)
 */
type AccountUpdate = Partial<Omit<AccountInsert, 'user_id'>>;

// ============================================================================
// HOOK
// ============================================================================

/**
 * useAccounts Hook
 *
 * Provides account state and management methods.
 * Automatically subscribes to real-time updates.
 *
 * @returns Account data and CRUD methods
 */
export function useAccounts() {
  // ===== HOOKS =====
  const { user } = useAuth();

  // ===== STATE =====
  const [accounts, setAccounts] = useState<Account[]>([]);
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
    fetchAccounts();

    // Set up real-time subscription
    // Listens for INSERT, UPDATE, DELETE events on accounts table
    const accountsChannel = supabase
      .channel('accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (insert, update, delete)
          schema: 'public',
          table: 'accounts',
          filter: `user_id=eq.${user.id}`, // Only for current user
        },
        () => {
          // Refetch accounts when any change occurs
          fetchAccounts();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(accountsChannel);
    };
  }, [user]);

  /**
   * Fetch all accounts for current user
   * Ordered by creation date (newest first)
   */
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAccounts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  // ===== CRUD METHODS =====

  /**
   * Add a new account
   *
   * Automatically assigns user_id from auth context.
   * Refetches accounts after successful insert.
   *
   * @param account - Account data to insert
   * @returns Object with error (null on success)
   */
  const addAccount = async (account: AccountInsert) => {
    try {
      console.log('Adding account:', account);
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...account,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Account inserted successfully:', data);

      // Refresh account list
      await fetchAccounts();
      return { error: null };
    } catch (err) {
      console.error('addAccount error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to add account';
      return { error: errorMessage };
    }
  };

  /**
   * Update an existing account
   *
   * Only updates accounts belonging to current user (via user_id check).
   *
   * @param id - Account ID to update
   * @param updates - Partial account data to update
   * @returns Object with error (null on success)
   */
  const updateAccount = async (id: string, updates: AccountUpdate) => {
    try {
      console.log('updateAccount called with:', { id, updates });
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id) // Security: only update own accounts
        .select();

      console.log('Supabase update result:', { data, error });

      if (error) throw error;

      // Refresh account list
      await fetchAccounts();
      return { error: null };
    } catch (err) {
      console.error('updateAccount error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update account';
      return { error: errorMessage };
    }
  };

  /**
   * Delete an account
   *
   * WARNING: This will cascade delete related records:
   * - Holdings
   * - Transactions
   * - Historical data
   *
   * Only deletes accounts belonging to current user.
   *
   * @param id - Account ID to delete
   * @returns Object with error (null on success)
   */
  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id); // Security: only delete own accounts

      if (error) throw error;

      // Refresh account list
      await fetchAccounts();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete account';
      return { error: errorMessage };
    }
  };

  /**
   * Toggle account visibility
   *
   * Hidden accounts are excluded from net worth calculations
   * but remain in the database for historical tracking.
   *
   * @param id - Account ID
   * @param isVisible - New visibility state
   * @returns Object with error (null on success)
   */
  const toggleVisibility = async (id: string, isVisible: boolean) => {
    return updateAccount(id, { is_visible: isVisible });
  };

  // ===== RETURN =====
  return {
    /** All accounts for current user */
    accounts,

    /** True while fetching accounts */
    loading,

    /** Error message if fetch failed */
    error,

    /** Add new account */
    addAccount,

    /** Update existing account */
    updateAccount,

    /** Delete account (with cascade) */
    deleteAccount,

    /** Toggle account visibility in net worth */
    toggleVisibility,

    /** Manually refetch accounts */
    refetch: fetchAccounts,
  };
}
