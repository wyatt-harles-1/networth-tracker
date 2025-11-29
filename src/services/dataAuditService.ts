import { supabase } from '@/lib/supabase';

export interface AccountBalanceAudit {
  accountId: string;
  accountName: string;
  currentBalance: number;
  calculatedBalance: number;
  holdingsValue: number;
  totalValue: number;
  difference: number;
  transactionCount: number;
  hasDiscrepancy: boolean;
}

export interface OrphanedTransaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  account_id: string | null;
  reason: string;
}

export interface DataAuditReport {
  accountAudits: AccountBalanceAudit[];
  orphanedTransactions: OrphanedTransaction[];
  totalDiscrepancies: number;
  accountsWithIssues: number;
}

export class DataAuditService {
  static async auditAccountBalances(userId: string): Promise<{
    data: DataAuditReport | null;
    error: string | null;
  }> {
    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      if (accountsError) throw accountsError;
      if (!accounts) return { data: null, error: 'No accounts found' };

      const accountAudits: AccountBalanceAudit[] = [];
      const orphanedTransactions: OrphanedTransaction[] = [];

      for (const account of accounts) {
        const audit = await this.auditSingleAccount(userId, account);
        accountAudits.push(audit);
      }

      const { data: orphanedTxns, error: orphanedError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .is('account_id', null);

      if (!orphanedError && orphanedTxns) {
        orphanedTransactions.push(
          ...orphanedTxns.map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            transaction_date: t.transaction_date,
            account_id: t.account_id,
            reason: 'No account associated',
          }))
        );
      }

      const { data: invalidAccounts } = await supabase
        .from('transactions')
        .select('*, accounts!inner(id)')
        .eq('user_id', userId)
        .is('accounts.id', null);

      if (invalidAccounts) {
        orphanedTransactions.push(
          ...invalidAccounts.map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            transaction_date: t.transaction_date,
            account_id: t.account_id,
            reason: 'Account does not exist',
          }))
        );
      }

      const totalDiscrepancies = accountAudits.filter(
        a => a.hasDiscrepancy
      ).length;
      const accountsWithIssues = accountAudits.filter(
        a => Math.abs(a.difference) > 0.01
      ).length;

      return {
        data: {
          accountAudits,
          orphanedTransactions,
          totalDiscrepancies,
          accountsWithIssues,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to audit account balances',
      };
    }
  }

  private static async auditSingleAccount(
    userId: string,
    account: any
  ): Promise<AccountBalanceAudit> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', account.id)
      .order('transaction_date', { ascending: true });

    let calculatedBalance = 0;

    if (transactions) {
      for (const txn of transactions) {
        const amount = Number(txn.amount);
        const type = txn.transaction_type;

        switch (type) {
          case 'income':
          case 'dividend':
          case 'stock_dividend':
          case 'etf_dividend':
          case 'deposit':
            calculatedBalance += amount;
            break;

          case 'expense':
          case 'withdrawal':
            calculatedBalance -= amount;
            break;

          case 'stock_buy':
          case 'etf_buy':
          case 'crypto_buy':
          case 'option_buy':
          case 'bond_buy':
            calculatedBalance -= amount;
            break;

          case 'stock_sell':
          case 'etf_sell':
          case 'crypto_sell':
          case 'option_sell':
          case 'bond_sell':
          case 'bond_maturity':
            calculatedBalance += amount;
            break;

          case 'transfer_in':
            calculatedBalance += amount;
            break;

          case 'transfer_out':
            calculatedBalance -= amount;
            break;

          case 'fee':
            calculatedBalance -= amount;
            break;
        }
      }
    }

    const { data: holdings } = await supabase
      .from('holdings')
      .select('current_value')
      .eq('user_id', userId)
      .eq('account_id', account.id);

    const holdingsValue = holdings
      ? holdings.reduce((sum, h) => sum + Number(h.current_value), 0)
      : 0;

    const currentBalance = Number(account.current_balance);
    const totalValue = calculatedBalance + holdingsValue;
    const difference = currentBalance - calculatedBalance;
    const hasDiscrepancy = Math.abs(difference) > 0.01;

    return {
      accountId: account.id,
      accountName: account.name,
      currentBalance,
      calculatedBalance,
      holdingsValue,
      totalValue,
      difference,
      transactionCount: transactions?.length || 0,
      hasDiscrepancy,
    };
  }

  static async recalculateAccountBalance(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; error: string | null; newBalance?: number }> {
    try {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', userId)
        .maybeSingle();

      if (accountError) throw accountError;
      if (!account) return { success: false, error: 'Account not found' };

      const audit = await this.auditSingleAccount(userId, account);

      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          current_balance: audit.calculatedBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return {
        success: true,
        error: null,
        newBalance: audit.calculatedBalance,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to recalculate balance',
      };
    }
  }

  static async recalculateAllAccountBalances(
    userId: string
  ): Promise<{ success: boolean; error: string | null; updatedCount: number }> {
    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId);

      if (accountsError) throw accountsError;
      if (!accounts) return { success: true, error: null, updatedCount: 0 };

      let updatedCount = 0;

      for (const account of accounts) {
        const result = await this.recalculateAccountBalance(userId, account.id);
        if (result.success) {
          updatedCount++;
        }
      }

      return {
        success: true,
        error: null,
        updatedCount,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to recalculate all balances',
        updatedCount: 0,
      };
    }
  }

  static async getTransactionTotal(
    userId: string,
    accountId?: string
  ): Promise<{ total: number; count: number; byType: Record<string, number> }> {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data: transactions } = await query;

      if (!transactions) {
        return { total: 0, count: 0, byType: {} };
      }

      let total = 0;
      const byType: Record<string, number> = {};

      for (const txn of transactions) {
        const amount = Number(txn.amount);
        const type = txn.transaction_type;

        if (!byType[type]) {
          byType[type] = 0;
        }
        byType[type] += amount;

        switch (type) {
          case 'income':
          case 'dividend':
          case 'stock_dividend':
          case 'etf_dividend':
          case 'deposit':
          case 'stock_sell':
          case 'etf_sell':
          case 'crypto_sell':
          case 'option_sell':
          case 'bond_sell':
          case 'bond_maturity':
          case 'transfer_in':
            total += amount;
            break;

          case 'expense':
          case 'withdrawal':
          case 'stock_buy':
          case 'etf_buy':
          case 'crypto_buy':
          case 'option_buy':
          case 'bond_buy':
          case 'transfer_out':
          case 'fee':
            total -= amount;
            break;
        }
      }

      return {
        total,
        count: transactions.length,
        byType,
      };
    } catch (err) {
      console.error('Error calculating transaction total:', err);
      return { total: 0, count: 0, byType: {} };
    }
  }
}
