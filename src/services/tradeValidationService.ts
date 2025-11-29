import { supabase } from '@/lib/supabase';
import {
  ParsedTradeInput,
  ValidationError,
  ValidationStatus,
  ValidationSummary,
} from '@/types/statementImport';

export interface ValidatedTrade extends ParsedTradeInput {
  validation_status: ValidationStatus;
  validation_errors: ValidationError[];
}

export class TradeValidationService {
  static async validateTrades(
    trades: ParsedTradeInput[],
    userId: string
  ): Promise<{ trades: ValidatedTrade[]; summary: ValidationSummary }> {
    const validatedTrades: ValidatedTrade[] = [];
    const allErrors: ValidationError[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    const duplicates = await this.checkForDuplicates(trades, userId);

    for (const trade of trades) {
      const errors: ValidationError[] = [];

      this.validateRequiredFields(trade, errors);
      this.validateSymbol(trade, errors);
      this.validateAmounts(trade, errors);
      this.validateDate(trade, errors);

      if (duplicates.has(this.getTradeKey(trade))) {
        errors.push({
          field: 'trade',
          severity: 'warning',
          message: 'Potential duplicate transaction detected',
          suggestedFix: 'Review existing transactions for this symbol and date',
        });
      }

      const hasErrors = errors.some(e => e.severity === 'error');
      const hasWarnings = errors.some(e => e.severity === 'warning');

      let status: ValidationStatus;
      if (hasErrors) {
        status = ValidationStatus.ERROR;
        errorCount++;
      } else if (hasWarnings) {
        status = ValidationStatus.WARNING;
        warningCount++;
      } else {
        status = ValidationStatus.VALID;
        validCount++;
      }

      validatedTrades.push({
        ...trade,
        validation_status: status,
        validation_errors: errors,
      });

      allErrors.push(...errors);
    }

    const summary: ValidationSummary = {
      totalTrades: trades.length,
      validCount,
      warningCount,
      errorCount,
      duplicateCount: duplicates.size,
      issues: allErrors,
    };

    return { trades: validatedTrades, summary };
  }

  private static validateRequiredFields(
    trade: ParsedTradeInput,
    errors: ValidationError[]
  ): void {
    if (!trade.symbol || trade.symbol.trim() === '') {
      errors.push({
        field: 'symbol',
        severity: 'error',
        message: 'Symbol is required',
        suggestedFix: 'Add a valid stock ticker symbol',
      });
    }

    if (!trade.action || trade.action.trim() === '') {
      errors.push({
        field: 'action',
        severity: 'error',
        message: 'Action is required',
        suggestedFix: 'Specify the trade action (BUY, SELL, etc.)',
      });
    }

    if (trade.amount === undefined || trade.amount === null) {
      errors.push({
        field: 'amount',
        severity: 'error',
        message: 'Amount is required',
        suggestedFix: 'Enter the total transaction amount',
      });
    }

    if (!trade.trade_date || trade.trade_date.trim() === '') {
      errors.push({
        field: 'trade_date',
        severity: 'error',
        message: 'Trade date is required',
        suggestedFix: 'Enter a valid date in YYYY-MM-DD format',
      });
    }
  }

  private static validateSymbol(
    trade: ParsedTradeInput,
    errors: ValidationError[]
  ): void {
    if (!trade.symbol) return;

    const symbolPattern = /^[A-Z]{1,5}$/;
    if (!symbolPattern.test(trade.symbol)) {
      errors.push({
        field: 'symbol',
        severity: 'warning',
        message: 'Symbol format may be invalid',
        suggestedFix:
          'Verify the ticker symbol is correct (1-5 uppercase letters)',
      });
    }

    if (trade.symbol.length > 5) {
      errors.push({
        field: 'symbol',
        severity: 'error',
        message: 'Symbol too long',
        suggestedFix: 'Use standard ticker symbols (max 5 characters)',
      });
    }
  }

  private static validateAmounts(
    trade: ParsedTradeInput,
    errors: ValidationError[]
  ): void {
    if (
      trade.amount !== undefined &&
      trade.amount !== null &&
      trade.amount < 0
    ) {
      if (
        !['SELL', 'WITHDRAWAL', 'FEE', 'TRANSFER_OUT'].includes(trade.action)
      ) {
        errors.push({
          field: 'amount',
          severity: 'warning',
          message: 'Amount is negative for a non-debit action',
          suggestedFix: 'Verify the amount sign matches the action type',
        });
      }
    }

    if (
      trade.shares !== undefined &&
      trade.shares !== null &&
      trade.shares <= 0
    ) {
      errors.push({
        field: 'shares',
        severity: 'error',
        message: 'Shares must be greater than zero',
        suggestedFix: 'Enter a positive number of shares',
      });
    }

    if (trade.price !== undefined && trade.price !== null && trade.price <= 0) {
      errors.push({
        field: 'price',
        severity: 'error',
        message: 'Price must be greater than zero',
        suggestedFix: 'Enter a positive price per share',
      });
    }

    if (
      trade.shares !== undefined &&
      trade.shares !== null &&
      trade.price !== undefined &&
      trade.price !== null &&
      trade.amount !== undefined &&
      trade.amount !== null
    ) {
      const calculatedAmount = Math.abs(trade.shares * trade.price);
      const actualAmount = Math.abs(trade.amount);
      const tolerance = 0.02;

      if (Math.abs(calculatedAmount - actualAmount) > tolerance) {
        errors.push({
          field: 'amount',
          severity: 'warning',
          message: `Amount mismatch: ${trade.shares} × $${trade.price} = $${calculatedAmount.toFixed(2)}, but amount is $${actualAmount.toFixed(2)}`,
          suggestedFix: 'Verify shares, price, and total amount are correct',
        });
      }
    }
  }

  private static validateDate(
    trade: ParsedTradeInput,
    errors: ValidationError[]
  ): void {
    if (!trade.trade_date) return;

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(trade.trade_date)) {
      errors.push({
        field: 'trade_date',
        severity: 'error',
        message: 'Invalid date format',
        suggestedFix: 'Use YYYY-MM-DD format (e.g., 2024-01-15)',
      });
      return;
    }

    const tradeDate = new Date(trade.trade_date);
    if (isNaN(tradeDate.getTime())) {
      errors.push({
        field: 'trade_date',
        severity: 'error',
        message: 'Invalid date',
        suggestedFix: 'Enter a valid calendar date',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (tradeDate > today) {
      errors.push({
        field: 'trade_date',
        severity: 'warning',
        message: 'Trade date is in the future',
        suggestedFix: 'Verify the date is correct',
      });
    }

    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (tradeDate < tenYearsAgo) {
      errors.push({
        field: 'trade_date',
        severity: 'warning',
        message: 'Trade date is more than 10 years old',
        suggestedFix: 'Verify this is a historical import',
      });
    }
  }

  private static async checkForDuplicates(
    trades: ParsedTradeInput[],
    userId: string
  ): Promise<Set<string>> {
    try {
      const duplicates = new Set<string>();

      const symbols = [...new Set(trades.map(t => t.symbol))];
      if (symbols.length === 0) return duplicates;

      const earliestDate = trades.reduce((min, t) => {
        return t.trade_date < min ? t.trade_date : min;
      }, trades[0].trade_date);

      const latestDate = trades.reduce((max, t) => {
        return t.trade_date > max ? t.trade_date : max;
      }, trades[0].trade_date);

      const { data: existingTransactions } = await supabase
        .from('transactions')
        .select('transaction_date, amount, transaction_metadata')
        .eq('user_id', userId)
        .gte('transaction_date', earliestDate)
        .lte('transaction_date', latestDate);

      if (!existingTransactions) return duplicates;

      for (const trade of trades) {
        const tradeKey = this.getTradeKey(trade);

        for (const existing of existingTransactions) {
          const existingSymbol = existing.transaction_metadata?.ticker;
          const existingDate = existing.transaction_date;
          const existingAmount = Math.abs(existing.amount);
          const tradeAmount = Math.abs(trade.amount);

          if (
            existingSymbol === trade.symbol &&
            existingDate === trade.trade_date &&
            Math.abs(existingAmount - tradeAmount) < 0.01
          ) {
            duplicates.add(tradeKey);
            break;
          }
        }
      }

      return duplicates;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return new Set<string>();
    }
  }

  private static getTradeKey(trade: ParsedTradeInput): string {
    return `${trade.symbol}-${trade.action}-${trade.trade_date}-${Math.abs(trade.amount).toFixed(2)}`;
  }

  static getValidationStatusColor(status: ValidationStatus): string {
    switch (status) {
      case ValidationStatus.VALID:
        return 'text-green-600 bg-green-50 border-green-200';
      case ValidationStatus.WARNING:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ValidationStatus.ERROR:
        return 'text-red-600 bg-red-50 border-red-200';
      case ValidationStatus.PENDING:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  static getValidationStatusLabel(status: ValidationStatus): string {
    switch (status) {
      case ValidationStatus.VALID:
        return 'Valid';
      case ValidationStatus.WARNING:
        return 'Warning';
      case ValidationStatus.ERROR:
        return 'Error';
      case ValidationStatus.PENDING:
        return 'Pending';
    }
  }
}
