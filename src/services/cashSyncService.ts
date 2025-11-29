/**
 * ============================================================================
 * Cash Sync Service
 * ============================================================================
 *
 * Synchronizes cash holdings with account balances.
 *
 * Purpose:
 * Investment accounts need to track both securities (stocks, ETFs) and cash.
 * This service ensures cash balances are represented as holdings for
 * accurate portfolio totals and allocation calculations.
 *
 * Key Responsibilities:
 * - Create/update "CASH" holding when account has cash balance
 * - Delete CASH holding when balance is zero
 * - Sync cash balance to holding quantity (1:1 ratio)
 * - Handle both pure cash accounts and investment accounts with cash
 *
 * Cash Holding Characteristics:
 * - Symbol: "CASH"
 * - Name: "Cash"
 * - Quantity: Equal to account balance
 * - Cost Basis: Equal to quantity (cash has no gain/loss)
 * - Current Price: Always $1.00
 * - Current Value: Equal to quantity
 * - Asset Type: "cash"
 *
 * When to Sync:
 * - After account balance updates
 * - After deposits/withdrawals
 * - After buy/sell transactions (affects remaining cash)
 * - Manual reconciliation
 *
 * Usage:
 * ```tsx
 * const result = await CashSyncService.syncCashHolding(account);
 * if (result.error) {
 *   console.error('Cash sync failed:', result.error);
 * }
 * ```
 *
 * ============================================================================
 */

import { supabase } from '@/lib/supabase';

/**
 * Account data structure
 */
interface Account {
  id: string;
  user_id: string;
  name: string;
  category: string;
  current_balance: number;
  account_type: string;
}

export class CashSyncService {
  static async syncCashHolding(
    account: Account
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const isCashAccount = this.isCashAccount(account);

      if (!isCashAccount && account.account_type !== 'asset') {
        return { success: true, error: null };
      }

      const cashBalance = Number(account.current_balance);

      const { data: existingCashHolding } = await supabase
        .from('holdings')
        .select('*')
        .eq('account_id', account.id)
        .eq('symbol', 'CASH')
        .maybeSingle();

      if (cashBalance <= 0 && existingCashHolding) {
        const { error: deleteError } = await supabase
          .from('holdings')
          .delete()
          .eq('id', existingCashHolding.id);

        if (deleteError) throw deleteError;
        return { success: true, error: null };
      }

      if (cashBalance > 0) {
        const holdingData = {
          user_id: account.user_id,
          account_id: account.id,
          symbol: 'CASH',
          name: 'Cash',
          quantity: cashBalance,
          cost_basis: cashBalance,
          current_price: 1.0,
          current_value: cashBalance,
          asset_type: 'cash',
          import_source: 'system_generated',
        };

        if (existingCashHolding) {
          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              quantity: cashBalance,
              cost_basis: cashBalance,
              current_value: cashBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCashHolding.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('holdings')
            .insert(holdingData);

          if (insertError) throw insertError;
        }
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to sync cash holding',
      };
    }
  }

  static async syncAllCashAccounts(
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: accounts, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('account_type', 'asset');

      if (fetchError) throw fetchError;
      if (!accounts || accounts.length === 0) {
        return { success: true, error: null };
      }

      for (const account of accounts) {
        const result = await this.syncCashHolding(account);
        if (!result.success) {
          console.error(
            `Failed to sync cash for account ${account.id}:`,
            result.error
          );
        }
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to sync all cash accounts',
      };
    }
  }

  private static isCashAccount(account: Account): boolean {
    const category = account.category.toLowerCase();
    return (
      category.includes('cash') ||
      category.includes('bank') ||
      category.includes('checking') ||
      category.includes('savings') ||
      category.includes('money market')
    );
  }

  static async syncCashForAccountById(
    accountId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: account, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      return await this.syncCashHolding(account);
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to sync cash for account',
      };
    }
  }
}
