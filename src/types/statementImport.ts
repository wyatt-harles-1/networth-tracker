export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ValidationStatus {
  VALID = 'valid',
  WARNING = 'warning',
  ERROR = 'error',
  PENDING = 'pending',
}

export enum TradeAction {
  BUY = 'BUY',
  SELL = 'SELL',
  DIVIDEND = 'DIVIDEND',
  INTEREST = 'INTEREST',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  FEE = 'FEE',
  SPLIT = 'SPLIT',
  OPTION_BUY = 'OPTION_BUY',
  OPTION_SELL = 'OPTION_SELL',
  OPTION_EXERCISE = 'OPTION_EXERCISE',
  OPTION_EXPIRE = 'OPTION_EXPIRE',
}

export enum BrokerType {
  FIDELITY = 'Fidelity',
  ROBINHOOD = 'Robinhood',
  ETRADE = 'E*TRADE',
  CHARLES_SCHWAB = 'Charles Schwab',
  TD_AMERITRADE = 'TD Ameritrade',
  VANGUARD = 'Vanguard',
  INTERACTIVE_BROKERS = 'Interactive Brokers',
  WEBULL = 'Webull',
  UNKNOWN = 'Unknown',
}

export interface ValidationError {
  field: string;
  severity: 'error' | 'warning';
  message: string;
  suggestedFix?: string;
}

export interface ValidationSummary {
  totalTrades: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  issues: ValidationError[];
}

export interface StatementImport {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_path: string;
  file_size: number;
  broker_name: string | null;
  status: ImportStatus;
  uploaded_at: string;
  processed_at: string | null;
  validation_summary: ValidationSummary;
  error_message: string | null;
  trade_count: number;
  created_at: string;
}

export interface ParsedTrade {
  id: string;
  import_id: string;
  user_id: string;
  symbol: string;
  action: string;
  shares: number | null;
  price: number | null;
  amount: number;
  trade_date: string;
  account_name: string | null;
  confidence_score: number;
  validation_status: ValidationStatus;
  validation_errors: ValidationError[];
  raw_text_snippet: string | null;
  is_selected: boolean;
  created_at: string;
}

export interface ParsedTradeInput {
  symbol: string;
  action: string;
  shares?: number;
  price?: number;
  amount: number;
  trade_date: string;
  account_name?: string;
  confidence_score?: number;
  raw_text_snippet?: string;
}

export interface ParserResponse {
  success: boolean;
  trades: ParsedTradeInput[];
  broker_name?: string;
  error?: string;
  metadata?: {
    accountNumber?: string;
    statementDate?: string;
    totalValue?: number;
  };
}

export interface FileUploadMetadata {
  filename: string;
  file_type: string;
  file_size: number;
  file: File;
}

export interface ParsingProgress {
  stage:
    | 'uploading'
    | 'processing'
    | 'parsing'
    | 'validating'
    | 'complete'
    | 'error';
  progress: number;
  message: string;
}

export interface BrokerTemplate {
  name: BrokerType;
  patterns: {
    header?: RegExp[];
    trade?: RegExp[];
    date?: RegExp[];
    symbol?: RegExp[];
  };
  dateFormat: string;
  priority: number;
}

export type StatementImportInsert = Omit<
  StatementImport,
  'id' | 'user_id' | 'created_at' | 'uploaded_at'
>;
export type ParsedTradeInsert = Omit<
  ParsedTrade,
  'id' | 'user_id' | 'created_at'
>;
