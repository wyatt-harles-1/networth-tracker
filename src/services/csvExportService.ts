import { ParsedTrade } from '@/types/statementImport';

export interface CSVExportOptions {
  includeHeaders: boolean;
  includeValidationStatus: boolean;
  includeConfidenceScore: boolean;
  includeRawText: boolean;
}

export class CSVExportService {
  static exportTradesToCSV(
    trades: ParsedTrade[],
    options: CSVExportOptions = {
      includeHeaders: true,
      includeValidationStatus: true,
      includeConfidenceScore: false,
      includeRawText: false,
    }
  ): string {
    const rows: string[] = [];

    if (options.includeHeaders) {
      const headers = this.getHeaders(options);
      rows.push(headers.join(','));
    }

    for (const trade of trades) {
      const row = this.tradeToCSVRow(trade, options);
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  private static getHeaders(options: CSVExportOptions): string[] {
    const headers = [
      'Date',
      'Symbol',
      'Action',
      'Shares',
      'Price',
      'Amount',
      'Account',
    ];

    if (options.includeValidationStatus) {
      headers.push('Validation Status');
    }

    if (options.includeConfidenceScore) {
      headers.push('Confidence Score');
    }

    if (options.includeRawText) {
      headers.push('Raw Text');
    }

    return headers;
  }

  private static tradeToCSVRow(
    trade: ParsedTrade,
    options: CSVExportOptions
  ): string[] {
    const row = [
      this.escapeCSV(trade.trade_date),
      this.escapeCSV(trade.symbol),
      this.escapeCSV(trade.action),
      this.escapeCSV(trade.shares?.toString() || ''),
      this.escapeCSV(trade.price?.toString() || ''),
      this.escapeCSV(trade.amount.toString()),
      this.escapeCSV(trade.account_name || ''),
    ];

    if (options.includeValidationStatus) {
      row.push(this.escapeCSV(trade.validation_status));
    }

    if (options.includeConfidenceScore) {
      row.push(this.escapeCSV(trade.confidence_score.toString()));
    }

    if (options.includeRawText) {
      row.push(this.escapeCSV(trade.raw_text_snippet || ''));
    }

    return row;
  }

  private static escapeCSV(value: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  static downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  static generateFilename(broker?: string | null, date?: string): string {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const brokerStr = broker
      ? broker.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : 'statement';
    return `${brokerStr}_import_${dateStr}.csv`;
  }

  static previewCSV(csvContent: string, maxRows: number = 5): string[][] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    const preview: string[][] = [];

    for (let i = 0; i < Math.min(lines.length, maxRows + 1); i++) {
      const row = this.parseCSVLine(lines[i]);
      preview.push(row);
    }

    return preview;
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  static convertToTransactionFormat(trades: ParsedTrade[]): string {
    const rows: string[] = [];

    rows.push(
      'Date,Description,Amount,Type,Category,Account,Ticker,Shares,Price'
    );

    for (const trade of trades) {
      const description = this.generateDescription(trade);
      const transactionType = this.mapActionToTransactionType(trade.action);
      const category = this.mapActionToCategory(trade.action);

      const row = [
        this.escapeCSV(trade.trade_date),
        this.escapeCSV(description),
        this.escapeCSV(trade.amount.toString()),
        this.escapeCSV(transactionType),
        this.escapeCSV(category),
        this.escapeCSV(trade.account_name || ''),
        this.escapeCSV(trade.symbol),
        this.escapeCSV(trade.shares?.toString() || ''),
        this.escapeCSV(trade.price?.toString() || ''),
      ];

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  private static generateDescription(trade: ParsedTrade): string {
    if (trade.shares && trade.price) {
      return `${trade.action} ${trade.shares} shares of ${trade.symbol} at $${trade.price}`;
    } else {
      return `${trade.action} ${trade.symbol} - $${Math.abs(trade.amount)}`;
    }
  }

  private static mapActionToTransactionType(action: string): string {
    const actionMap: Record<string, string> = {
      BUY: 'stock_buy',
      SELL: 'stock_sell',
      DIVIDEND: 'stock_dividend',
      INTEREST: 'interest',
      DEPOSIT: 'deposit',
      WITHDRAWAL: 'withdrawal',
      TRANSFER_IN: 'transfer',
      TRANSFER_OUT: 'transfer',
      FEE: 'fee',
      SPLIT: 'stock_split',
      OPTION_BUY: 'option_buy_call',
      OPTION_SELL: 'option_sell_call',
      OPTION_EXERCISE: 'option_exercise',
      OPTION_EXPIRE: 'option_expire',
    };

    return actionMap[action] || 'other';
  }

  private static mapActionToCategory(action: string): string {
    const categoryMap: Record<string, string> = {
      BUY: 'stock',
      SELL: 'stock',
      DIVIDEND: 'stock',
      INTEREST: 'other',
      DEPOSIT: 'other',
      WITHDRAWAL: 'other',
      TRANSFER_IN: 'other',
      TRANSFER_OUT: 'other',
      FEE: 'other',
      SPLIT: 'stock',
      OPTION_BUY: 'options',
      OPTION_SELL: 'options',
      OPTION_EXERCISE: 'options',
      OPTION_EXPIRE: 'options',
    };

    return categoryMap[action] || 'other';
  }
}
