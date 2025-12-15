import { supabase } from '@/lib/supabase';
import { Transaction, TransactionInsert } from '@/types/transaction';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
  code: string;
}

export interface ReconciliationCheck {
  passed: boolean;
  accountId: string;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  transactionCount: number;
}

export class DataValidationService {
  /**
   * Validate a single transaction before insertion
   */
  static async validateTransaction(
    transaction: TransactionInsert,
    userId: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    if (!transaction.account_id) {
      errors.push({
        field: 'account_id',
        message: 'Account is required',
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!transaction.transaction_date) {
      errors.push({
        field: 'transaction_date',
        message: 'Transaction date is required',
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    }

    if (transaction.amount === undefined || transaction.amount === null) {
      errors.push({
        field: 'amount',
        message: 'Amount is required',
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!transaction.transaction_type) {
      errors.push({
        field: 'transaction_type',
        message: 'Transaction type is required',
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
    }

    // Amount validation
    if (transaction.amount !== undefined && transaction.amount !== null) {
      if (isNaN(transaction.amount)) {
        errors.push({
          field: 'amount',
          message: 'Amount must be a valid number',
          severity: 'error',
          code: 'INVALID_NUMBER',
        });
      }

      if (Math.abs(transaction.amount) > 1000000000) {
        warnings.push({
          field: 'amount',
          message: 'Unusually large amount detected',
          severity: 'warning',
          code: 'UNUSUAL_AMOUNT',
        });
      }
    }

    // Date validation
    if (transaction.transaction_date) {
      const date = new Date(transaction.transaction_date);
      const now = new Date();
      const hundredYearsAgo = new Date(
        now.getFullYear() - 100,
        now.getMonth(),
        now.getDate()
      );

      if (date > now) {
        warnings.push({
          field: 'transaction_date',
          message: 'Transaction date is in the future',
          severity: 'warning',
          code: 'FUTURE_DATE',
        });
      }

      if (date < hundredYearsAgo) {
        errors.push({
          field: 'transaction_date',
          message: 'Transaction date is too far in the past',
          severity: 'error',
          code: 'INVALID_DATE',
        });
      }
    }

    // Check for duplicate transactions
    if (transaction.account_id && transaction.transaction_date && transaction.amount) {
      const duplicateCheck = await this.checkForDuplicates(
        transaction,
        userId
      );
      if (duplicateCheck.isDuplicate) {
        warnings.push({
          field: 'transaction',
          message: `Potential duplicate: ${duplicateCheck.similarTransactions} similar transaction(s) found`,
          severity: 'warning',
          code: 'POTENTIAL_DUPLICATE',
        });
      }
    }

    // Validate transaction metadata for investment transactions
    const meta = transaction.transaction_metadata;
    if (
      transaction.transaction_type &&
      (transaction.transaction_type.includes('stock') ||
        transaction.transaction_type.includes('crypto') ||
        transaction.transaction_type.includes('etf'))
    ) {
      if (!meta?.ticker) {
        errors.push({
          field: 'ticker',
          message: 'Ticker symbol is required for investment transactions',
          severity: 'error',
          code: 'REQUIRED_FIELD',
        });
      }

      if (
        (transaction.transaction_type.includes('buy') ||
          transaction.transaction_type.includes('sell')) &&
        (!meta?.quantity || !meta?.price)
      ) {
        errors.push({
          field: 'quantity',
          message: 'Quantity and price are required for buy/sell transactions',
          severity: 'error',
          code: 'REQUIRED_FIELD',
        });
      }

      // Validate quantity and price calculations
      if (meta?.quantity && meta?.price) {
        const calculatedAmount = meta.quantity * meta.price;
        const difference = Math.abs(calculatedAmount - Math.abs(transaction.amount));
        if (difference > 0.01) {
          warnings.push({
            field: 'amount',
            message: `Amount mismatch: ${calculatedAmount.toFixed(2)} expected vs ${Math.abs(transaction.amount).toFixed(2)} provided`,
            severity: 'warning',
            code: 'AMOUNT_MISMATCH',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for duplicate transactions
   */
  private static async checkForDuplicates(
    transaction: TransactionInsert,
    userId: string
  ): Promise<{ isDuplicate: boolean; similarTransactions: number }> {
    try {
      // Look for transactions on the same date with similar amounts
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, transaction_type, transaction_metadata')
        .eq('user_id', userId)
        .eq('account_id', transaction.account_id)
        .eq('transaction_date', transaction.transaction_date);

      if (error || !data) return { isDuplicate: false, similarTransactions: 0 };

      const similarTransactions = data.filter(existing => {
        const amountMatch = Math.abs(existing.amount - transaction.amount) < 0.01;
        const typeMatch = existing.transaction_type === transaction.transaction_type;
        const tickerMatch =
          existing.transaction_metadata?.ticker ===
          transaction.transaction_metadata?.ticker;

        return amountMatch && typeMatch && (!existing.transaction_metadata?.ticker || tickerMatch);
      });

      return {
        isDuplicate: similarTransactions.length > 0,
        similarTransactions: similarTransactions.length,
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { isDuplicate: false, similarTransactions: 0 };
    }
  }

  /**
   * Validate account balance reconciliation
   */
  static async validateAccountBalance(
    accountId: string,
    userId: string
  ): Promise<ReconciliationCheck> {
    try {
      // Get account's stored balance
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (accountError || !account) {
        throw new Error('Account not found');
      }

      // Calculate balance from transactions
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

      const difference = Math.abs(account.current_balance - calculatedBalance);

      return {
        passed: difference < 0.01,
        accountId,
        expectedBalance: calculatedBalance,
        actualBalance: account.current_balance,
        difference,
        transactionCount: transactions?.length || 0,
      };
    } catch (error) {
      console.error('Balance validation error:', error);
      throw error;
    }
  }

  /**
   * Validate holdings match transactions
   */
  static async validateHoldingsConsistency(
    accountId: string,
    userId: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Get all holdings for this account
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (holdingsError) throw holdingsError;

      // For each holding, calculate expected quantity from transactions
      for (const holding of holdings || []) {
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('account_id', accountId)
          .eq('user_id', userId)
          .or(`transaction_metadata->>ticker.eq.${holding.ticker}`);

        if (txError) continue;

        let calculatedQuantity = 0;
        for (const tx of transactions || []) {
          const meta = tx.transaction_metadata;
          if (!meta?.quantity) continue;

          if (tx.transaction_type.includes('buy')) {
            calculatedQuantity += meta.quantity;
          } else if (tx.transaction_type.includes('sell')) {
            calculatedQuantity -= meta.quantity;
          }
        }

        const difference = Math.abs(holding.quantity - calculatedQuantity);
        if (difference > 0.0001) {
          warnings.push({
            field: 'holdings',
            message: `Holding quantity mismatch for ${holding.ticker}: expected ${calculatedQuantity}, actual ${holding.quantity}`,
            severity: 'warning',
            code: 'HOLDINGS_MISMATCH',
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Holdings validation error:', error);
      return {
        valid: false,
        errors: [
          {
            field: 'holdings',
            message: 'Failed to validate holdings consistency',
            severity: 'error',
            code: 'VALIDATION_FAILED',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate all accounts for a user
   */
  static async validateAllAccounts(
    userId: string
  ): Promise<{
    accountResults: ReconciliationCheck[];
    overallValid: boolean;
  }> {
    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId);

      if (error || !accounts) {
        throw error || new Error('No accounts found');
      }

      const results: ReconciliationCheck[] = [];
      for (const account of accounts) {
        const result = await this.validateAccountBalance(account.id, userId);
        results.push(result);
      }

      return {
        accountResults: results,
        overallValid: results.every(r => r.passed),
      };
    } catch (error) {
      console.error('Account validation error:', error);
      throw error;
    }
  }

  /**
   * Validate portfolio value calculation
   */
  static async validatePortfolioValue(
    userId: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Get all holdings
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('*, current_price')
        .eq('user_id', userId);

      if (holdingsError) throw holdingsError;

      // Calculate total portfolio value
      const calculatedValue = holdings?.reduce((sum, holding) => {
        return sum + holding.quantity * (holding.current_price || 0);
      }, 0) || 0;

      // Get latest portfolio snapshot
      const { data: snapshot, error: snapshotError } = await supabase
        .from('portfolio_snapshots')
        .select('total_value')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (snapshotError && snapshotError.code !== 'PGRST116') {
        throw snapshotError;
      }

      if (snapshot) {
        const difference = Math.abs(snapshot.total_value - calculatedValue);
        const percentDiff = (difference / snapshot.total_value) * 100;

        if (percentDiff > 5) {
          warnings.push({
            field: 'portfolio_value',
            message: `Portfolio value discrepancy: ${percentDiff.toFixed(2)}% difference detected`,
            severity: 'warning',
            code: 'VALUE_DISCREPANCY',
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Portfolio validation error:', error);
      return {
        valid: false,
        errors: [
          {
            field: 'portfolio',
            message: 'Failed to validate portfolio value',
            severity: 'error',
            code: 'VALIDATION_FAILED',
          },
        ],
        warnings: [],
      };
    }
  }
}
