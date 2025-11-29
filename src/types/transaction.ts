/**
 * ============================================================================
 * Transaction Type Definitions
 * ============================================================================
 *
 * Type definitions and configuration for all transaction types in the system.
 *
 * Transaction Types Supported:
 * - Stock: Buy, sell, dividend, split
 * - Options: Buy/sell calls/puts, exercise, expire
 * - ETF: Buy, sell, dividend
 * - Crypto: Buy, sell, stake, unstake
 * - Bond: Purchase, sell, maturity, coupon
 * - Other: Deposit, withdrawal, fee, transfer, interest
 *
 * Transaction Metadata:
 * Each transaction has a flexible metadata object that can contain:
 * - ticker: Stock/crypto symbol
 * - quantity: Number of shares/units
 * - price: Price per share/unit
 * - dividendAmount: Dividend payment amount
 * - notes: User notes
 * - optionType: Call or put
 * - strikePrice: Option strike price
 * - expirationDate: Option expiration date
 *
 * Required Fields by Transaction Type:
 * Each transaction type defines which metadata fields are required
 * and which are optional for data validation purposes.
 *
 * ============================================================================
 */

import {
  Transaction as DatabaseTransaction,
  TransactionInsert as DatabaseTransactionInsert,
  TransactionUpdate as DatabaseTransactionUpdate,
} from './database';

/**
 * Transaction metadata structure
 * Flexible JSON object containing transaction-specific details
 */
export interface TransactionMetadata {
  ticker?: string;
  quantity?: number;
  price?: number;
  dividendAmount?: number;
  notes?: string;
  optionType?: 'call' | 'put';
  strikePrice?: number;
  expirationDate?: string;
  [key: string]: any;
}

/**
 * Transaction record with typed metadata
 * Extends database transaction type with strongly-typed metadata
 */
export interface Transaction extends DatabaseTransaction {
  transaction_metadata: TransactionMetadata;
}

/**
 * Transaction insert type for creating new transactions
 */
export type TransactionInsert = Omit<
  DatabaseTransactionInsert,
  'transaction_metadata'
> & {
  transaction_metadata?: TransactionMetadata;
};

/**
 * Transaction update type for modifying existing transactions
 */
export type TransactionUpdate = Partial<
  Omit<DatabaseTransactionUpdate, 'transaction_metadata'>
> & {
  transaction_metadata?: TransactionMetadata;
};

/**
 * Transaction categories for grouping similar transaction types
 */
export type TransactionCategory =
  | 'stock'
  | 'options'
  | 'etf'
  | 'crypto'
  | 'bond'
  | 'other';

/**
 * Transaction type configuration
 * Defines display label, category, and required fields for each type
 */
export interface TransactionType {
  value: string;
  label: string;
  category: TransactionCategory;
  requiredFields: string[];
  optionalFields: string[];
}

/**
 * Complete list of all supported transaction types
 * Used for transaction form validation and display
 */
export const TRANSACTION_TYPES: TransactionType[] = [
  {
    value: 'stock_buy',
    label: 'Buy Stock',
    category: 'stock',
    requiredFields: ['ticker', 'quantity', 'price'],
    optionalFields: ['notes'],
  },
  {
    value: 'stock_sell',
    label: 'Sell Stock',
    category: 'stock',
    requiredFields: ['ticker', 'quantity', 'price'],
    optionalFields: ['notes'],
  },
  {
    value: 'stock_dividend',
    label: 'Stock Dividend',
    category: 'stock',
    requiredFields: ['ticker'],
    optionalFields: ['quantity', 'dividendAmount', 'notes'],
  },
  {
    value: 'stock_split',
    label: 'Stock Split',
    category: 'stock',
    requiredFields: ['ticker', 'quantity'],
    optionalFields: ['notes'],
  },
  {
    value: 'option_buy_call',
    label: 'Buy Call Option',
    category: 'options',
    requiredFields: [
      'ticker',
      'quantity',
      'price',
      'strikePrice',
      'expirationDate',
    ],
    optionalFields: ['notes'],
  },
  {
    value: 'option_buy_put',
    label: 'Buy Put Option',
    category: 'options',
    requiredFields: [
      'ticker',
      'quantity',
      'price',
      'strikePrice',
      'expirationDate',
    ],
    optionalFields: ['notes'],
  },
  {
    value: 'option_sell_call',
    label: 'Sell Call Option',
    category: 'options',
    requiredFields: [
      'ticker',
      'quantity',
      'price',
      'strikePrice',
      'expirationDate',
    ],
    optionalFields: ['notes'],
  },
  {
    value: 'option_sell_put',
    label: 'Sell Put Option',
    category: 'options',
    requiredFields: [
      'ticker',
      'quantity',
      'price',
      'strikePrice',
      'expirationDate',
    ],
    optionalFields: ['notes'],
  },
  {
    value: 'option_exercise',
    label: 'Exercise Option',
    category: 'options',
    requiredFields: ['ticker', 'quantity', 'strikePrice'],
    optionalFields: ['notes'],
  },
  {
    value: 'option_expire',
    label: 'Option Expired',
    category: 'options',
    requiredFields: ['ticker', 'quantity'],
    optionalFields: ['notes'],
  },
  {
    value: 'etf_buy',
    label: 'Buy ETF',
    category: 'etf',
    requiredFields: ['ticker', 'quantity', 'price'],
    optionalFields: ['notes'],
  },
  {
    value: 'etf_sell',
    label: 'Sell ETF',
    category: 'etf',
    requiredFields: ['ticker', 'quantity', 'price'],
    optionalFields: ['notes'],
  },
  {
    value: 'etf_dividend',
    label: 'ETF Dividend',
    category: 'etf',
    requiredFields: ['ticker'],
    optionalFields: ['quantity', 'dividendAmount', 'notes'],
  },
  {
    value: 'crypto_buy',
    label: 'Buy Crypto',
    category: 'crypto',
    requiredFields: ['ticker', 'quantity', 'price'],
    optionalFields: ['notes'],
  },
  {
    value: 'crypto_sell',
    label: 'Sell Crypto',
    category: 'crypto',
    requiredFields: ['ticker', 'quantity', 'price'],
    optionalFields: ['notes'],
  },
  {
    value: 'crypto_stake',
    label: 'Stake Crypto',
    category: 'crypto',
    requiredFields: ['ticker', 'quantity'],
    optionalFields: ['notes'],
  },
  {
    value: 'crypto_unstake',
    label: 'Unstake Crypto',
    category: 'crypto',
    requiredFields: ['ticker', 'quantity'],
    optionalFields: ['notes'],
  },
  {
    value: 'bond_purchase',
    label: 'Purchase Bond',
    category: 'bond',
    requiredFields: ['ticker', 'quantity', 'price'],
    optionalFields: ['notes'],
  },
  {
    value: 'bond_sell',
    label: 'Sell Bond',
    category: 'bond',
    requiredFields: ['ticker', 'quantity', 'price'],
    optionalFields: ['notes'],
  },
  {
    value: 'bond_mature',
    label: 'Bond Maturity',
    category: 'bond',
    requiredFields: ['ticker'],
    optionalFields: ['notes'],
  },
  {
    value: 'bond_coupon',
    label: 'Bond Coupon Payment',
    category: 'bond',
    requiredFields: ['ticker'],
    optionalFields: ['notes'],
  },
  {
    value: 'deposit',
    label: 'Deposit',
    category: 'other',
    requiredFields: [],
    optionalFields: ['notes'],
  },
  {
    value: 'withdrawal',
    label: 'Withdrawal',
    category: 'other',
    requiredFields: [],
    optionalFields: ['notes'],
  },
  {
    value: 'fee',
    label: 'Fee',
    category: 'other',
    requiredFields: [],
    optionalFields: ['notes'],
  },
  {
    value: 'transfer',
    label: 'Transfer',
    category: 'other',
    requiredFields: [],
    optionalFields: ['notes'],
  },
  {
    value: 'interest',
    label: 'Interest Payment',
    category: 'other',
    requiredFields: [],
    optionalFields: ['notes'],
  },
];

export const TRANSACTION_CATEGORIES = {
  stock: 'Stock Transactions',
  options: 'Options Transactions',
  etf: 'ETF Transactions',
  crypto: 'Crypto Transactions',
  bond: 'Bond Transactions',
  other: 'Other Transactions',
};
