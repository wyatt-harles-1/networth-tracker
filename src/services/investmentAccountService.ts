import { supabase } from '@/lib/supabase';

export class InvestmentAccountService {
  static async calculateAccountMarketValue(
    accountId: string
  ): Promise<{ success: boolean; marketValue: number; error: string | null }> {
    try {
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('current_value')
        .eq('account_id', accountId);

      if (holdingsError) throw holdingsError;

      const marketValue = (holdings || []).reduce((sum, holding) => {
        return sum + (Number(holding.current_value) || 0);
      }, 0);

      return { success: true, marketValue, error: null };
    } catch (err) {
      return {
        success: false,
        marketValue: 0,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to calculate market value',
      };
    }
  }

  static async updateInvestmentAccountBalance(
    accountId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('category')
        .eq('id', accountId)
        .maybeSingle();

      if (accountError) throw accountError;
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      if (account.category !== 'Investment Accounts') {
        return { success: true, error: null };
      }

      const marketValueResult =
        await this.calculateAccountMarketValue(accountId);

      if (!marketValueResult.success) {
        return { success: false, error: marketValueResult.error };
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          current_balance: marketValueResult.marketValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (updateError) throw updateError;

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to update investment account balance',
      };
    }
  }

  static async updateAllInvestmentAccounts(
    userId: string
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('category', 'Investment Accounts');

      if (accountsError) throw accountsError;

      if (!accounts || accounts.length === 0) {
        return { success: true, updated: 0, errors: [] };
      }

      for (const account of accounts) {
        const result = await this.updateInvestmentAccountBalance(account.id);
        if (result.success) {
          updated++;
        } else if (result.error) {
          errors.push(`Account ${account.id}: ${result.error}`);
        }
      }

      return { success: true, updated, errors };
    } catch (err) {
      return {
        success: false,
        updated,
        errors: [
          err instanceof Error
            ? err.message
            : 'Failed to update investment accounts',
        ],
      };
    }
  }
}
