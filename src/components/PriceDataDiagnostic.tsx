/**
 * Price Data Diagnostic Component
 *
 * Temporarily add this to your Portfolio page to diagnose price data gaps
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PriceDataDiagnosticService, PriceDataCoverage } from '@/services/priceDataDiagnosticService';

export function PriceDataDiagnostic() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState<PriceDataCoverage[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [symbolGaps, setSymbolGaps] = useState<string[]>([]);

  const runDiagnostic = async () => {
    if (!user) return;

    setLoading(true);
    const result = await PriceDataDiagnosticService.getDiagnosticReport(user.id);
    if (result.data) {
      setCoverage(result.data);
    }
    setLoading(false);
  };

  const showSymbolGaps = async (symbol: string) => {
    setSelectedSymbol(symbol);
    const result = await PriceDataDiagnosticService.getSymbolGaps(symbol, 90);
    if (result.data) {
      setSymbolGaps(result.data.missingDates);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, [user]);

  return (
    <Card className="p-6 bg-yellow-50 border-yellow-200">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Price Data Diagnostic
            </h3>
          </div>
          <Button
            onClick={runDiagnostic}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </Button>
        </div>

        {coverage.length === 0 && !loading && (
          <p className="text-sm text-gray-600">
            No holdings found or all data is complete.
          </p>
        )}

        {coverage.length > 0 && (
          <div className="space-y-3">
            <div className="grid gap-2">
              {coverage.map((item) => (
                <div
                  key={item.symbol}
                  className="p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.coveragePercent >= 90 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : item.coveragePercent >= 50 ? (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-semibold text-gray-900">
                        {item.symbol}
                      </span>
                    </div>
                    <Button
                      onClick={() => showSymbolGaps(item.symbol)}
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                    >
                      View Gaps
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Coverage:</span>{' '}
                      <span className={
                        item.coveragePercent >= 90
                          ? 'text-green-600'
                          : item.coveragePercent >= 50
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }>
                        {item.coveragePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Days:</span> {item.daysOfData} / {item.expectedDays}
                    </div>
                    <div>
                      <span className="font-medium">Earliest:</span>{' '}
                      {item.earliestDate || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Latest:</span>{' '}
                      {item.latestDate || 'N/A'}
                    </div>
                  </div>

                  {item.missingDays > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      ⚠️ Missing {item.missingDays} days of data
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedSymbol && symbolGaps.length > 0 && (
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                  Missing Dates for {selectedSymbol}:
                </h4>
                <div className="max-h-40 overflow-y-auto">
                  <div className="text-xs text-gray-600 space-y-1">
                    {symbolGaps.slice(0, 20).map((date) => (
                      <div key={date}>{date}</div>
                    ))}
                    {symbolGaps.length > 20 && (
                      <div className="text-gray-500 italic">
                        ...and {symbolGaps.length - 20} more dates
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-yellow-300">
          <p className="text-xs text-gray-600">
            <strong>What this means:</strong> When price data is missing, your chart uses the last known price (forward-fill), creating flat lines. Use the "Sync Prices" button to backfill missing data.
          </p>
        </div>
      </div>
    </Card>
  );
}
