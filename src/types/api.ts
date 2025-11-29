/**
 * API response types and common interfaces
 */

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Price API types
export interface PriceData {
  symbol: string;
  price: number;
  date: string;
  source: string;
  change?: number;
  change_percentage?: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Statement import types
export interface ImportResult {
  success: boolean;
  transactions_imported: number;
  errors: string[];
  warnings: string[];
}

export interface StatementFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

// Search and autocomplete types
export interface SearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto' | 'mutual_fund';
  exchange?: string;
  currency?: string;
}

export interface TickerSearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
}
