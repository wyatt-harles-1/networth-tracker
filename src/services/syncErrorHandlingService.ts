import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types/transaction';

export enum SyncErrorType {
  HOLDINGS_SYNC_FAILED = 'HOLDINGS_SYNC_FAILED',
  LOT_TRACKING_FAILED = 'LOT_TRACKING_FAILED',
  BALANCE_CALCULATION_FAILED = 'BALANCE_CALCULATION_FAILED',
  PRICE_UPDATE_FAILED = 'PRICE_UPDATE_FAILED',
  SNAPSHOT_CREATION_FAILED = 'SNAPSHOT_CREATION_FAILED',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  INSUFFICIENT_SHARES = 'INSUFFICIENT_SHARES',
  DATA_INTEGRITY_VIOLATION = 'DATA_INTEGRITY_VIOLATION',
}

export interface SyncError {
  id: string;
  type: SyncErrorType;
  message: string;
  context: any;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

export interface SyncResult {
  success: boolean;
  errors: SyncError[];
  warnings: string[];
  partialSuccess?: boolean;
}

/**
 * Enhanced error handling service for transaction synchronization
 */
export class SyncErrorHandlingService {
  private static errors: SyncError[] = [];

  /**
   * Record a sync error
   */
  static recordError(
    type: SyncErrorType,
    message: string,
    context: any
  ): SyncError {
    const error: SyncError = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      context,
      timestamp: new Date(),
      resolved: false,
    };

    this.errors.push(error);
    this.persistError(error);

    return error;
  }

  /**
   * Persist error to database for audit trail
   */
  private static async persistError(error: SyncError): Promise<void> {
    try {
      await supabase.from('sync_errors').insert({
        error_type: error.type,
        error_message: error.message,
        error_context: error.context,
        resolved: false,
      });
    } catch (err) {
      console.error('Failed to persist sync error:', err);
    }
  }

  /**
   * Attempt to recover from a sync error
   */
  static async attemptRecovery(
    error: SyncError,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    switch (error.type) {
      case SyncErrorType.HOLDINGS_SYNC_FAILED:
        return await this.recoverHoldingsSync(error, userId);

      case SyncErrorType.BALANCE_CALCULATION_FAILED:
        return await this.recoverBalanceCalculation(error, userId);

      case SyncErrorType.LOT_TRACKING_FAILED:
        return await this.recoverLotTracking(error, userId);

      case SyncErrorType.INSUFFICIENT_SHARES:
        return await this.recoverInsufficientShares(error, userId);

      default:
        return {
          success: false,
          message: 'No automatic recovery available for this error type',
        };
    }
  }

  /**
   * Recover from holdings sync failure
   */
  private static async recoverHoldingsSync(
    error: SyncError,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { transactionId, accountId } = error.context;

      // Recalculate holdings from all transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .order('transaction_date', { ascending: true });

      if (txError) throw txError;

      // Group by ticker and recalculate
      const holdingsMap = new Map<string, { quantity: number; totalCost: number }>();

      for (const tx of transactions || []) {
        const meta = tx.transaction_metadata;
        if (!meta?.ticker) continue;

        const current = holdingsMap.get(meta.ticker) || { quantity: 0, totalCost: 0 };

        if (tx.transaction_type.includes('buy')) {
          current.quantity += meta.quantity || 0;
          current.totalCost += Math.abs(tx.amount);
        } else if (tx.transaction_type.includes('sell')) {
          current.quantity -= meta.quantity || 0;
          const sellValue = Math.abs(tx.amount);
          const avgCost = current.totalCost / (current.quantity + (meta.quantity || 0));
          current.totalCost -= avgCost * (meta.quantity || 0);
        }

        holdingsMap.set(meta.ticker, current);
      }

      // Update holdings table
      for (const [ticker, data] of holdingsMap.entries()) {
        if (data.quantity > 0) {
          await supabase
            .from('holdings')
            .upsert({
              user_id: userId,
              account_id: accountId,
              ticker,
              quantity: data.quantity,
              average_cost: data.totalCost / data.quantity,
            });
        }
      }

      await this.markErrorResolved(
        error.id,
        'Holdings recalculated from transaction history'
      );

      return {
        success: true,
        message: 'Holdings successfully recalculated',
      };
    } catch (err) {
      console.error('Recovery failed:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Recovery failed',
      };
    }
  }

  /**
   * Recover from balance calculation failure
   */
  private static async recoverBalanceCalculation(
    error: SyncError,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { accountId } = error.context;

      // Recalculate balance from all transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (txError) throw txError;

      const calculatedBalance = transactions?.reduce(
        (sum, tx) => sum + tx.amount,
        0
      ) || 0;

      // Update account balance
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ current_balance: calculatedBalance })
        .eq('id', accountId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await this.markErrorResolved(
        error.id,
        `Balance recalculated: ${calculatedBalance.toFixed(2)}`
      );

      return {
        success: true,
        message: `Balance updated to ${calculatedBalance.toFixed(2)}`,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Recovery failed',
      };
    }
  }

  /**
   * Recover from lot tracking failure
   */
  private static async recoverLotTracking(
    error: SyncError,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { holdingId } = error.context;

      // Delete all lots for this holding
      await supabase
        .from('holding_lots')
        .delete()
        .eq('holding_id', holdingId)
        .eq('user_id', userId);

      // Get holding details
      const { data: holding, error: holdingError } = await supabase
        .from('holdings')
        .select('*')
        .eq('id', holdingId)
        .eq('user_id', userId)
        .single();

      if (holdingError || !holding) throw new Error('Holding not found');

      // Recreate lots from transactions
      const { data: buyTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', holding.account_id)
        .eq('user_id', userId)
        .or('transaction_type.ilike.%buy%')
        .order('transaction_date', { ascending: true });

      if (txError) throw txError;

      // Create new lots
      const lots = buyTransactions
        ?.filter(tx => tx.transaction_metadata?.ticker === holding.ticker)
        .map(tx => ({
          user_id: userId,
          holding_id: holdingId,
          purchase_date: tx.transaction_date,
          quantity: tx.transaction_metadata?.quantity || 0,
          purchase_price: tx.transaction_metadata?.price || 0,
          quantity_remaining: tx.transaction_metadata?.quantity || 0,
        }));

      if (lots && lots.length > 0) {
        await supabase.from('holding_lots').insert(lots);
      }

      await this.markErrorResolved(error.id, 'Lots recreated from transactions');

      return {
        success: true,
        message: `${lots?.length || 0} lots recreated`,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Recovery failed',
      };
    }
  }

  /**
   * Recover from insufficient shares error
   */
  private static async recoverInsufficientShares(
    error: SyncError,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const { transactionId, ticker, attemptedQuantity, availableQuantity } =
      error.context;

    return {
      success: false,
      message: `Cannot sell ${attemptedQuantity} shares of ${ticker}. Only ${availableQuantity} shares available. Please review the transaction.`,
    };
  }

  /**
   * Mark error as resolved
   */
  private static async markErrorResolved(
    errorId: string,
    resolution: string
  ): Promise<void> {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolution = resolution;

      await supabase
        .from('sync_errors')
        .update({
          resolved: true,
          resolution,
          resolved_at: new Date().toISOString(),
        })
        .eq('error_type', error.type)
        .eq('error_message', error.message);
    }
  }

  /**
   * Get all unresolved errors
   */
  static getUnresolvedErrors(): SyncError[] {
    return this.errors.filter(e => !e.resolved);
  }

  /**
   * Rollback a transaction if sync fails
   */
  static async rollbackTransaction(
    transactionId: string,
    userId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Delete the transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Log the rollback
      await supabase.from('transaction_rollbacks').insert({
        user_id: userId,
        transaction_id: transactionId,
        reason,
        rolled_back_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Transaction rolled back successfully',
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Rollback failed',
      };
    }
  }

  /**
   * Validate and sync with retry logic
   */
  static async syncWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, result };
      } catch (err) {
        if (attempt === maxRetries) {
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Operation failed',
          };
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  /**
   * Clear resolved errors older than specified days
   */
  static async clearOldErrors(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    this.errors = this.errors.filter(
      e => !e.resolved || e.timestamp > cutoffDate
    );

    await supabase
      .from('sync_errors')
      .delete()
      .eq('resolved', true)
      .lt('created_at', cutoffDate.toISOString());
  }
}
