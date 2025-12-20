/**
 * ============================================================================
 * BulkBackfillPanel Component
 * ============================================================================
 *
 * Panel for bulk backfill operations across multiple symbols.
 *
 * Features:
 * - Shows selected symbols count
 * - Trigger bulk backfill with date range
 * - Real-time progress tracking
 * - Clear selection button
 *
 * ============================================================================
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X, CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BulkBackfillProgress } from '@/hooks/useDataVisualizer';

interface BulkBackfillPanelProps {
  selectedSymbols: string[];
  bulkBackfilling: boolean;
  bulkProgress: BulkBackfillProgress[];
  onBulkBackfill: (startDate: Date, endDate: Date) => Promise<void>;
  onClearSelection: () => void;
  dateRange: { start: Date; end: Date } | null;
}

export function BulkBackfillPanel({
  selectedSymbols,
  bulkBackfilling,
  bulkProgress,
  onBulkBackfill,
  onClearSelection,
  dateRange,
}: BulkBackfillPanelProps) {
  const [showProgress, setShowProgress] = useState(false);

  const handleBulkBackfill = async () => {
    if (!dateRange) return;
    setShowProgress(true);
    await onBulkBackfill(dateRange.start, dateRange.end);
  };

  // Count progress statuses
  const completedCount = bulkProgress.filter(p => p.status === 'completed').length;
  const errorCount = bulkProgress.filter(p => p.status === 'error').length;
  const processingCount = bulkProgress.filter(p => p.status === 'processing').length;

  // Status icon for each symbol
  const getStatusIcon = (status: BulkBackfillProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  if (selectedSymbols.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Bulk Backfill
            </h3>
            <p className="text-xs text-gray-600">
              {selectedSymbols.length} symbol{selectedSymbols.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={bulkBackfilling}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Action Button */}
        {!showProgress && (
          <Button
            onClick={handleBulkBackfill}
            disabled={bulkBackfilling || !dateRange}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="sm"
          >
            {bulkBackfilling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Start Bulk Backfill
              </>
            )}
          </Button>
        )}

        {/* Progress Display */}
        {showProgress && bulkProgress.length > 0 && (
          <div className="space-y-3">
            {/* Progress Summary */}
            <div className="p-2 bg-white rounded border border-purple-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Progress:</span>
                <span className="font-semibold text-gray-900">
                  {completedCount + errorCount} / {bulkProgress.length}
                </span>
              </div>
              {errorCount > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Individual Symbol Progress */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {bulkProgress.map(progress => (
                <div
                  key={progress.symbol}
                  className={cn(
                    'p-2 rounded border flex items-center justify-between',
                    progress.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : progress.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : progress.status === 'processing'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(progress.status)}
                    <span className="text-xs font-medium text-gray-900">
                      {progress.symbol}
                    </span>
                  </div>
                  {progress.error && (
                    <span className="text-[10px] text-red-600 max-w-[120px] truncate">
                      {progress.error}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Done Button */}
            {!bulkBackfilling && (
              <Button
                onClick={() => {
                  setShowProgress(false);
                  onClearSelection();
                }}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Done
              </Button>
            )}
          </div>
        )}

        {/* Warning */}
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-[10px] text-yellow-800 leading-tight">
            <strong>Note:</strong> Symbols are processed sequentially with 1s delay to avoid rate limits (25 API calls/day).
          </p>
        </div>
      </div>
    </Card>
  );
}
