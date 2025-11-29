/**
 * ============================================================================
 * Utility Functions
 * ============================================================================
 *
 * Common utility functions used throughout the application.
 *
 * Functions:
 * - cn: Tailwind CSS class merging
 * - formatCurrency: Currency formatting for USD
 * - parseLocalDate: Date parsing from ISO strings
 * - getTransactionAmountSign: Calculate signed amount for transactions
 * - getTransactionAmountColor: Get color class for transaction amounts
 *
 * ============================================================================
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge and deduplicate Tailwind CSS classes
 *
 * Combines clsx (conditional classes) and tailwind-merge (deduplication).
 * Useful for component props that accept className.
 *
 * @param inputs - Class names, objects, or arrays
 * @returns Merged class string
 *
 * @example
 * ```tsx
 * cn('px-2 py-1', someCondition && 'bg-blue-500', className)
 * // Returns: "px-2 py-1 bg-blue-500 custom-class"
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as USD currency
 *
 * Uses Intl.NumberFormat for locale-aware formatting.
 * Always formats as USD with 2 decimal places.
 *
 * @param amount - Number to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * ```tsx
 * formatCurrency(1234.56)  // "$1,234.56"
 * formatCurrency(-500)     // "-$500.00"
 * formatCurrency(0)        // "$0.00"
 * ```
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Parse ISO date string to local Date object
 *
 * Handles dates in format "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS".
 * Returns Date object in local timezone (not UTC).
 *
 * This is important for transaction dates which should be treated
 * as local dates, not UTC timestamps.
 *
 * @param dateString - ISO date string
 * @returns Date object in local timezone
 *
 * @example
 * ```tsx
 * parseLocalDate('2024-01-15')
 * // Returns: Date object for Jan 15, 2024 at 00:00:00 local time
 * ```
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculate signed amount for transaction display
 *
 * Transaction amount conventions:
 * - Negative: Sales, withdrawals, fees (money leaving)
 * - Positive: Purchases, deposits, income (money entering or being invested)
 * - Absolute: Transfers (neutral operation)
 *
 * This ensures consistent display across the application.
 *
 * @param transactionType - Type of transaction (e.g., "buy_stock", "sell_stock")
 * @param amount - Raw amount value
 * @returns Signed amount for display
 *
 * @example
 * ```tsx
 * getTransactionAmountSign('sell_stock', 1000)     // -1000
 * getTransactionAmountSign('buy_stock', -1000)     // 1000 (absolute value)
 * getTransactionAmountSign('withdrawal', 500)      // -500
 * getTransactionAmountSign('deposit', -500)        // 500 (absolute value)
 * getTransactionAmountSign('transfer', -100)       // 100 (absolute, neutral)
 * ```
 */
export function getTransactionAmountSign(
  transactionType: string,
  amount: number
): number {
  const type = transactionType.toLowerCase();

  // Negative transactions (reduce portfolio value or are outflows)
  if (
    type.includes('sell') ||      // Selling investments
    type.includes('withdrawal') || // Withdrawing cash
    type.includes('fee')          // Paying fees
  ) {
    return -Math.abs(amount);
  }

  // Neutral transactions (show absolute value without negative sign)
  // Transfers are neutral because money is moving between accounts
  if (type.includes('transfer')) {
    return Math.abs(amount);
  }

  // Positive transactions (increase portfolio value or are inflows)
  // This includes:
  // - buy (investing money)
  // - deposit (adding cash)
  // - dividend, interest, coupon (receiving income)
  // - stake, unstake (crypto operations)
  // - mature, exercise, expire, split (corporate actions)
  return Math.abs(amount);
}

/**
 * Get Tailwind color class for transaction amount
 *
 * Returns appropriate text color class based on transaction type:
 * - Red: Negative transactions (sells, withdrawals, fees)
 * - Green: Positive transactions (buys, deposits, income)
 * - Gray: Neutral transactions (transfers)
 *
 * Includes dark mode variants.
 *
 * @param transactionType - Type of transaction
 * @param amount - Raw amount value
 * @returns Tailwind CSS color class
 *
 * @example
 * ```tsx
 * getTransactionAmountColor('sell_stock', 1000)
 * // Returns: "text-red-600 dark:text-red-400"
 *
 * getTransactionAmountColor('buy_stock', 1000)
 * // Returns: "text-green-600 dark:text-green-400"
 *
 * getTransactionAmountColor('transfer', 1000)
 * // Returns: "text-gray-600 dark:text-gray-400"
 * ```
 */
export function getTransactionAmountColor(
  transactionType: string,
  amount: number
): string {
  const type = transactionType.toLowerCase();

  // Neutral color for transfers
  if (type.includes('transfer')) {
    return 'text-gray-600 dark:text-gray-400';
  }

  // Get signed amount to determine color
  const signedAmount = getTransactionAmountSign(transactionType, amount);

  // Red for negative (sells, withdrawals, fees)
  if (signedAmount < 0) {
    return 'text-red-600 dark:text-red-400';
  }

  // Green for positive (buys, deposits, income)
  return 'text-green-600 dark:text-green-400';
}
