/**
 * ============================================================================
 * BackfillControls Component
 * ============================================================================
 *
 * Action buttons and controls for backfilling missing price data.
 *
 * Features:
 * - Backfill selected dates
 * - Backfill all gaps
 * - Refresh data
 * - Progress indicators
 * - Error/success messages
 * - API rate limit warnings
 *
 * ============================================================================
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, AlertTriangle, Loader2, FileDown } from 'lucide-react';
import { exportGapReportToCSV, exportSymbolSummaryToCSV } from '@/utils/csvExport';
import type { DateQuality, SymbolCoverage } from '@/hooks/useDataVisualizer';

interface BackfillControlsProps {
  selectedSymbol: string | null;
  backfilling: boolean;
  onBackfillSelected: () => void;
  onBackfillAll: () => void;
  onRefresh: () => void;
  error?: string | null;
  dateQualityMap?: Map<string, DateQuality>;
  symbols?: SymbolCoverage[];
}

export function BackfillControls({
  selectedSymbol,
  backfilling,
  onBackfillSelected,
  onBackfillAll,
  onRefresh,
  error,
  dateQualityMap,
  symbols,
}: BackfillControlsProps) {
  // CSV Export Handlers
  const handleExportGapReport = () => {
    if (selectedSymbol && dateQualityMap) {
      exportGapReportToCSV(selectedSymbol, dateQualityMap);
    }
  };

  const handleExportSymbolSummary = () => {
    if (symbols && symbols.length > 0) {
      exportSymbolSummaryToCSV(symbols);
    }
  };

  return (
    <Card className="p-4 bg-white shadow-md">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Actions</h3>
          <p className="text-xs text-gray-600">
            Fill gaps in historical price data
          </p>
        </div>

        {/* Backfill Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={onBackfillSelected}
            disabled={!selectedSymbol || backfilling}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            size="sm"
          >
            {backfilling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Backfilling...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Backfill Selected Symbol
              </>
            )}
          </Button>

          <Button
            onClick={onBackfillAll}
            disabled={!selectedSymbol || backfilling}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Backfill All Gaps
          </Button>

          <Button
            onClick={onRefresh}
            disabled={backfilling}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* CSV Export Section */}
        <div className="pt-3 border-t border-gray-200 space-y-2">
          <h4 className="text-xs font-semibold text-gray-700">Export Data</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleExportGapReport}
              disabled={!selectedSymbol || !dateQualityMap}
              variant="outline"
              className="text-xs"
              size="sm"
            >
              <FileDown className="h-3 w-3 mr-1" />
              Gap Report
            </Button>
            <Button
              onClick={handleExportSymbolSummary}
              disabled={!symbols || symbols.length === 0}
              variant="outline"
              className="text-xs"
              size="sm"
            >
              <FileDown className="h-3 w-3 mr-1" />
              Summary
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="pt-3 border-t border-gray-200">
          {error ? (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              {error}
            </div>
          ) : backfilling ? (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <Loader2 className="h-3 w-3 inline mr-1 animate-spin" />
              Processing...
            </div>
          ) : selectedSymbol ? (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              Ready to backfill {selectedSymbol}
            </div>
          ) : (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
              Select a symbol to begin
            </div>
          )}
        </div>

        {/* Rate Limit Warning */}
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-yellow-800 leading-tight">
              <strong>Rate Limit:</strong> 25 API calls/day. Use backfill
              sparingly to avoid hitting limits.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
