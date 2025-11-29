import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeTransactions?: boolean;
  includeHoldings?: boolean;
  includeAccounts?: boolean;
  includeSnapshots?: boolean;
  includeLots?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export class DataExportService {
  /**
   * Export all user data in specified format
   */
  static async exportAllData(
    userId: string,
    options: ExportOptions
  ): Promise<{ success: boolean; data?: string; error?: string; filename?: string }> {
    try {
      const exportData: any = {
        exportDate: new Date().toISOString(),
        userId,
      };

      // Export transactions
      if (options.includeTransactions !== false) {
        exportData.transactions = await this.exportTransactions(
          userId,
          options.dateRange
        );
      }

      // Export holdings
      if (options.includeHoldings !== false) {
        exportData.holdings = await this.exportHoldings(userId);
      }

      // Export accounts
      if (options.includeAccounts !== false) {
        exportData.accounts = await this.exportAccounts(userId);
      }

      // Export portfolio snapshots
      if (options.includeSnapshots) {
        exportData.snapshots = await this.exportSnapshots(
          userId,
          options.dateRange
        );
      }

      // Export holding lots
      if (options.includeLots) {
        exportData.lots = await this.exportLots(userId);
      }

      let outputData: string;
      let filename: string;

      if (options.format === 'json') {
        outputData = JSON.stringify(exportData, null, 2);
        filename = `networth_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
      } else {
        // CSV format - create multiple files in a zip would be ideal,
        // but for now we'll create a comprehensive CSV
        outputData = await this.convertToCSV(exportData);
        filename = `networth_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      }

      return {
        success: true,
        data: outputData,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export transactions
   */
  private static async exportTransactions(
    userId: string,
    dateRange?: { start: string; end: string }
  ): Promise<any[]> {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (dateRange) {
      query = query
        .gte('transaction_date', dateRange.start)
        .lte('transaction_date', dateRange.end);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Export holdings
   */
  private static async exportHoldings(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Export accounts
   */
  private static async exportAccounts(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Export portfolio snapshots
   */
  private static async exportSnapshots(
    userId: string,
    dateRange?: { start: string; end: string }
  ): Promise<any[]> {
    let query = supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false });

    if (dateRange) {
      query = query
        .gte('snapshot_date', dateRange.start)
        .lte('snapshot_date', dateRange.end);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Export holding lots
   */
  private static async exportLots(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('holding_lots')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Convert export data to CSV format
   */
  private static async convertToCSV(exportData: any): Promise<string> {
    const sections: string[] = [];

    // Transactions section
    if (exportData.transactions && exportData.transactions.length > 0) {
      sections.push('=== TRANSACTIONS ===');
      sections.push(this.arrayToCSV(exportData.transactions));
      sections.push('');
    }

    // Holdings section
    if (exportData.holdings && exportData.holdings.length > 0) {
      sections.push('=== HOLDINGS ===');
      sections.push(this.arrayToCSV(exportData.holdings));
      sections.push('');
    }

    // Accounts section
    if (exportData.accounts && exportData.accounts.length > 0) {
      sections.push('=== ACCOUNTS ===');
      sections.push(this.arrayToCSV(exportData.accounts));
      sections.push('');
    }

    // Snapshots section
    if (exportData.snapshots && exportData.snapshots.length > 0) {
      sections.push('=== PORTFOLIO SNAPSHOTS ===');
      sections.push(this.arrayToCSV(exportData.snapshots));
      sections.push('');
    }

    // Lots section
    if (exportData.lots && exportData.lots.length > 0) {
      sections.push('=== HOLDING LOTS ===');
      sections.push(this.arrayToCSV(exportData.lots));
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Convert array of objects to CSV
   */
  private static arrayToCSV(data: any[]): string {
    if (data.length === 0) return '';

    // Get all unique keys
    const keys = Array.from(
      new Set(data.flatMap(item => Object.keys(item)))
    );

    // Create header row
    const header = keys.map(key => this.escapeCSV(key)).join(',');

    // Create data rows
    const rows = data.map(item => {
      return keys
        .map(key => {
          const value = item[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return this.escapeCSV(JSON.stringify(value));
          return this.escapeCSV(String(value));
        })
        .join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Escape CSV values
   */
  private static escapeCSV(value: string): string {
    if (value === null || value === undefined) return '';

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

  /**
   * Download data as file
   */
  static downloadData(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
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

  /**
   * Export and download all data
   */
  static async exportAndDownload(
    userId: string,
    options: ExportOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.exportAllData(userId, options);

      if (!result.success || !result.data || !result.filename) {
        throw new Error(result.error || 'Export failed');
      }

      const mimeType =
        options.format === 'json' ? 'application/json' : 'text/csv';

      this.downloadData(result.data, result.filename, mimeType);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Import data from JSON export
   */
  static async importData(
    userId: string,
    jsonData: string
  ): Promise<{ success: boolean; error?: string; imported?: any }> {
    try {
      const data = JSON.parse(jsonData);

      const imported: any = {
        transactions: 0,
        holdings: 0,
        accounts: 0,
      };

      // Import accounts first (dependencies)
      if (data.accounts && Array.isArray(data.accounts)) {
        for (const account of data.accounts) {
          const { error } = await supabase
            .from('accounts')
            .upsert({
              ...account,
              user_id: userId,
            });

          if (!error) imported.accounts++;
        }
      }

      // Import transactions
      if (data.transactions && Array.isArray(data.transactions)) {
        for (const transaction of data.transactions) {
          const { error } = await supabase
            .from('transactions')
            .insert({
              ...transaction,
              user_id: userId,
              id: undefined, // Let DB generate new IDs
            });

          if (!error) imported.transactions++;
        }
      }

      // Import holdings
      if (data.holdings && Array.isArray(data.holdings)) {
        for (const holding of data.holdings) {
          const { error } = await supabase
            .from('holdings')
            .upsert({
              ...holding,
              user_id: userId,
            });

          if (!error) imported.holdings++;
        }
      }

      return {
        success: true,
        imported,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      };
    }
  }
}
