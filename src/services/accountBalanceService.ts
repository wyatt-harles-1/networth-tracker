/**
 * ============================================================================
 * Account Balance Service
 * ============================================================================
 *
 * Service for managing account balances based on transactions.
 *
 * Key Responsibilities:
 * - Update account balances when transactions occur
 * - Handle different transaction types appropriately
 * - Special handling for investment vs non-investment accounts
 * - Sync cash balances with holdings
 * - Reverse balance updates when transactions are deleted
 *
 * Transaction Type Handling:
 * - Income/Dividends: Increase balance (non-investment accounts only)
 * - Expenses: Decrease balance (non-investment accounts only)
 * - Stock/ETF/Crypto Buy: Decrease balance (non-investment accounts only)
 * - Stock/ETF/Crypto Sell: Increase balance (non-investment accounts only)
 * - Transfers: Increase or decrease based on direction
 *
 * Investment Account Behavior:
 * - Investment accounts rely on holdings rather than direct balance updates
 * - Most transaction types skip balance updates for investment accounts
 * - Balance is calculated from holdings value instead
 *
 * ============================================================================
 */

import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types/transaction';
import { CashSyncService } from './cashSyncService';

export class AccountBalanceService {
  /**
   * Update an account's balance based on a transaction
   * Handles different transaction types and account types appropriately
   *
   * @param transaction - The transaction that affects the account balance
   * @returns Success status and error message if any
   */
  static async updateAccountBalance(
    transaction: Transaction
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!transaction.account_id) {
        return { success: true, error: null };
      }

      const { data: account, error: fetchError } = await supabase
        .from('accounts')
        .select('current_balance, account_type, category')
        .eq('id', transaction.account_id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      const currentBalance = Number(account.current_balance);
      const amount = Number(transaction.amount);
      const transactionType = transaction.transaction_type;
      const isInvestmentAccount = account.category === 'Investment Accounts';

      let newBalance = currentBalance;

      switch (transactionType) {
        case 'income':
        case 'dividend':
        case 'stock_dividend':
        case 'etf_dividend':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance + amount;
          break;

        case 'expense':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance - amount;
          break;

        case 'stock_buy':
        case 'etf_buy':
        case 'crypto_buy':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance - amount;
          break;

        case 'stock_sell':
        case 'etf_sell':
        case 'crypto_sell':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance + amount;
          break;

        case 'transfer_in':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance + amount;
          break;

        case 'transfer_out':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance - amount;
          break;

        default:
          return { success: true, error: null };
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.account_id);

      if (updateError) throw updateError;

      await CashSyncService.syncCashForAccountById(transaction.account_id);

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to update account balance',
      };
    }
  }

  static async reverseAccountBalance(
    transaction: Transaction
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!transaction.account_id) {
        return { success: true, error: null };
      }

      const { data: account, error: fetchError } = await supabase
        .from('accounts')
        .select('current_balance, category')
        .eq('id', transaction.account_id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      const currentBalance = Number(account.current_balance);
      const amount = Number(transaction.amount);
      const transactionType = transaction.transaction_type;
      const isInvestmentAccount = account.category === 'Investment Accounts';

      let newBalance = currentBalance;

      switch (transactionType) {
        case 'income':
        case 'dividend':
        case 'stock_dividend':
        case 'etf_dividend':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance - amount;
          break;

        case 'expense':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance + amount;
          break;

        case 'stock_buy':
        case 'etf_buy':
        case 'crypto_buy':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance + amount;
          break;

        case 'stock_sell':
        case 'etf_sell':
        case 'crypto_sell':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance - amount;
          break;

        case 'transfer_in':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance - amount;
          break;

        case 'transfer_out':
          if (isInvestmentAccount) {
            return { success: true, error: null };
          }
          newBalance = currentBalance + amount;
          break;

        default:
          return { success: true, error: null };
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.account_id);

      if (updateError) throw updateError;

      await CashSyncService.syncCashForAccountById(transaction.account_id);

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to reverse account balance',
      };
    }
  }
}
