import { supabase } from '@/lib/supabase';
import { DataValidationService, ReconciliationCheck } from './dataValidationService';

export interface ReconciliationSuggestion {
  id: string;
  type: 'balance_mismatch' | 'missing_transaction' | 'duplicate_transaction' | 'holdings_mismatch';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  accountId?: string;
  accountName?: string;
  suggestedAction: string;
  autoFixAvailable: boolean;
  autoFixFunction?: () => Promise<void>;
  details?: any;
}

export class ReconciliationSuggestionsService {
  /**
   * Generate all reconciliation suggestions for a user
   */
  static async generateSuggestions(
    userId: string
  ): Promise<ReconciliationSuggestion[]> {
    const suggestions: ReconciliationSuggestion[] = [];

    // Check balance mismatches
    const balanceSuggestions = await this.checkBalanceMismatches(userId);
    suggestions.push(...balanceSuggestions);

    // Check for potential duplicates
    const duplicateSuggestions = await this.checkDuplicateTransactions(userId);
    suggestions.push(...duplicateSuggestions);

    // Check holdings consistency
    const holdingsSuggestions = await this.checkHoldingsConsistency(userId);
    suggestions.push(...holdingsSuggestions);

    // Check for missing prices
    const priceSuggestions = await this.checkMissingPrices(userId);
    suggestions.push(...priceSuggestions);

    // Sort by severity
    return suggestions.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Check for balance mismatches
   */
  private static async checkBalanceMismatches(
    userId: string
  ): Promise<ReconciliationSuggestion[]> {
    const suggestions: ReconciliationSuggestion[] = [];

    try {
      const { accountResults } = await DataValidationService.validateAllAccounts(
        userId
      );

      for (const result of accountResults) {
        if (!result.passed && result.difference > 0.01) {
          // Get account name
          const { data: account } = await supabase
            .from('accounts')
            .select('name')
            .eq('id', result.accountId)
            .single();

          const percentDiff =
            (result.difference / result.actualBalance) * 100;

          suggestions.push({
            id: `balance-${result.accountId}`,
            type: 'balance_mismatch',
            severity: percentDiff > 10 ? 'high' : percentDiff > 5 ? 'medium' : 'low',
            title: 'Balance Mismatch Detected',
            description: `The calculated balance (${result.expectedBalance.toFixed(2)}) differs from the stored balance (${result.actualBalance.toFixed(2)}) by ${result.difference.toFixed(2)}`,
            accountId: result.accountId,
            accountName: account?.name,
            suggestedAction: 'Recalculate account balance from transaction history',
            autoFixAvailable: true,
            autoFixFunction: async () => {
              await this.fixBalanceMismatch(result.accountId, userId);
            },
            details: result,
          });
        }
      }
    } catch (error) {
      console.error('Balance mismatch check failed:', error);
    }

    return suggestions;
  }

  /**
   * Check for duplicate transactions
   */
  private static async checkDuplicateTransactions(
    userId: string
  ): Promise<ReconciliationSuggestion[]> {
    const suggestions: ReconciliationSuggestion[] = [];

    try {
      // Get all transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Group by date, amount, and account
      const groups = new Map<string, any[]>();

      for (const tx of transactions || []) {
        const key = `${tx.account_id}-${tx.transaction_date}-${tx.amount}-${tx.transaction_type}`;
        const existing = groups.get(key) || [];
        existing.push(tx);
        groups.set(key, existing);
      }

      // Find duplicates
      for (const [key, txs] of groups.entries()) {
        if (txs.length > 1) {
          const { data: account } = await supabase
            .from('accounts')
            .select('name')
            .eq('id', txs[0].account_id)
            .single();

          suggestions.push({
            id: `duplicate-${key}`,
            type: 'duplicate_transaction',
            severity: 'medium',
            title: 'Potential Duplicate Transactions',
            description: `Found ${txs.length} identical transactions on ${txs[0].transaction_date}`,
            accountId: txs[0].account_id,
            accountName: account?.name,
            suggestedAction: 'Review and remove duplicate transactions',
            autoFixAvailable: false,
            details: { transactions: txs },
          });
        }
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
    }

    return suggestions;
  }

  /**
   * Check holdings consistency
   */
  private static async checkHoldingsConsistency(
    userId: string
  ): Promise<ReconciliationSuggestion[]> {
    const suggestions: ReconciliationSuggestion[] = [];

    try {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', userId)
        .eq('account_type', 'investment');

      for (const account of accounts || []) {
        const validation = await DataValidationService.validateHoldingsConsistency(
          account.id,
          userId
        );

        if (validation.warnings.length > 0) {
          for (const warning of validation.warnings) {
            suggestions.push({
              id: `holdings-${account.id}-${Date.now()}`,
              type: 'holdings_mismatch',
              severity: 'medium',
              title: 'Holdings Mismatch',
              description: warning.message,
              accountId: account.id,
              accountName: account.name,
              suggestedAction: 'Recalculate holdings from transaction history',
              autoFixAvailable: true,
              autoFixFunction: async () => {
                await this.recalculateHoldings(account.id, userId);
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Holdings consistency check failed:', error);
    }

    return suggestions;
  }

  /**
   * Check for missing prices
   */
  private static async checkMissingPrices(
    userId: string
  ): Promise<ReconciliationSuggestion[]> {
    const suggestions: ReconciliationSuggestion[] = [];

    try {
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select('*, accounts(name)')
        .eq('user_id', userId)
        .is('current_price', null);

      if (error) throw error;

      for (const holding of holdings || []) {
        suggestions.push({
          id: `price-${holding.id}`,
          type: 'holdings_mismatch',
          severity: 'low',
          title: 'Missing Price Data',
          description: `No current price available for ${holding.ticker}`,
          accountId: holding.account_id,
          accountName: holding.accounts?.name,
          suggestedAction: 'Update price manually or refresh from market data',
          autoFixAvailable: false,
          details: { ticker: holding.ticker },
        });
      }
    } catch (error) {
      console.error('Missing price check failed:', error);
    }

    return suggestions;
  }

  /**
   * Fix balance mismatch
   */
  private static async fixBalanceMismatch(
    accountId: string,
    userId: string
  ): Promise<void> {
    const result = await DataValidationService.validateAccountBalance(
      accountId,
      userId
    );

    await supabase
      .from('accounts')
      .update({ current_balance: result.expectedBalance })
      .eq('id', accountId)
      .eq('user_id', userId);
  }

  /**
   * Recalculate holdings from transactions
   */
  private static async recalculateHoldings(
    accountId: string,
    userId: string
  ): Promise<void> {
    // Get all transactions for this account
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: true });

    if (error) throw error;

    // Group by ticker and calculate holdings
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
      } else {
        // Delete holdings with zero or negative quantity
        await supabase
          .from('holdings')
          .delete()
          .eq('user_id', userId)
          .eq('account_id', accountId)
          .eq('ticker', ticker);
      }
    }
  }

  /**
   * Apply an auto-fix suggestion
   */
  static async applyAutoFix(
    suggestion: ReconciliationSuggestion
  ): Promise<{ success: boolean; error?: string }> {
    if (!suggestion.autoFixAvailable || !suggestion.autoFixFunction) {
      return {
        success: false,
        error: 'Auto-fix not available for this suggestion',
      };
    }

    try {
      await suggestion.autoFixFunction();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-fix failed',
      };
    }
  }

  /**
   * Dismiss a suggestion
   */
  static dismissSuggestion(suggestionId: string): void {
    // Could be persisted to a database table if needed
    console.log(`Dismissed suggestion: ${suggestionId}`);
  }
}
