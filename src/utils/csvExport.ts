/**
 * ============================================================================
 * CSV Export Utilities
 * ============================================================================
 *
 * Utility functions for exporting data to CSV format.
 *
 * ============================================================================
 */

import type { DateQuality, SymbolCoverage } from '@/hooks/useDataVisualizer';

/**
 * Convert gap analysis data to CSV format and trigger download
 */
export function exportGapReportToCSV(
  symbol: string,
  dateQualityMap: Map<string, DateQuality>,
  filename?: string
): void {
  // Build CSV header
  const headers = ['Symbol', 'Date', 'Has Data', 'Quality Score', 'Quality Level', 'Price', 'Data Source'];
  const csvRows: string[] = [headers.join(',')];

  // Convert map to sorted array of entries
  const sortedEntries = Array.from(dateQualityMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  // Build CSV rows
  for (const [dateStr, quality] of sortedEntries) {
    const hasData = quality.hasData ? 'Yes' : 'No';
    const qualityScore = quality.quality.toFixed(2);
    const qualityLevel = getQualityLabel(quality.quality);
    const price = quality.price ? quality.price.toFixed(2) : 'N/A';
    const source = quality.source || 'N/A';

    csvRows.push([
      symbol,
      dateStr,
      hasData,
      qualityScore,
      qualityLevel,
      price,
      source,
    ].join(','));
  }

  // Create CSV content
  const csvContent = csvRows.join('\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `gap-report-${symbol}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export summary report for all symbols
 */
export function exportSymbolSummaryToCSV(
  symbols: SymbolCoverage[],
  filename?: string
): void {
  // Build CSV header
  const headers = ['Symbol', 'Name', 'Coverage %', 'Days of Data', 'Earliest Date', 'Latest Date'];
  const csvRows: string[] = [headers.join(',')];

  // Build CSV rows
  for (const symbol of symbols) {
    csvRows.push([
      symbol.symbol,
      `"${symbol.name}"`, // Quote name in case it contains commas
      symbol.coveragePercent.toFixed(2),
      symbol.daysOfData.toString(),
      symbol.earliestDate,
      symbol.latestDate,
    ].join(','));
  }

  // Create CSV content
  const csvContent = csvRows.join('\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `symbol-coverage-summary-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Get quality label from quality score
 */
function getQualityLabel(quality: number): string {
  if (quality === 1.0) {
    return 'Real Data';
  } else if (quality > 0) {
    return 'Interpolated';
  } else {
    return 'Missing';
  }
}
