/**
 * Price Data Settings Component
 *
 * Provides tools to manage historical price data:
 * - View data coverage for each symbol
 * - Backfill missing historical prices
 * - Monitor backfill progress
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { HistoricalPriceService } from '@/services/historicalPriceService';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, CheckCircle, Database, Settings, TrendingUp } from 'lucide-react';

interface BackfillProgress {
  symbol: string;
  status: 'pending' | 'fetching' | 'completed' | 'error';
  pricesAdded?: number;
  error?: string;
  current?: number;
  total?: number;
  estimatedTimeRemaining?: number;
  overallProgress?: number;
}

interface SymbolCoverage {
  symbol: string;
  totalDays: number;
  missingDays: number;
  coverage: number;
  gaps: Array<{ startDate: string; endDate: string; missingDays: number }>;
}

export function PriceDataSettings() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('backfill');

  // Diagnostic state
  const [loadingCoverage, setLoadingCoverage] = useState(true);
  const [coverage, setCoverage] = useState<SymbolCoverage[]>([]);

  // Backfill state
  const [backfilling, setBackfilling] = useState(false);
  const [progress, setProgress] = useState<BackfillProgress[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    symbolsProcessed: number;
    totalPricesAdded: number;
    totalSymbols: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    if (open && activeTab === 'diagnostic') {
      analyzeCoverage();
    }
  }, [open, activeTab, user]);

  const analyzeCoverage = async () => {
    if (!user) return;

    setLoadingCoverage(true);
    try {
      // Get all unique symbols from holdings
      const { data: holdings } = await supabase
        .from('holdings')
        .select('symbol')
        .eq('user_id', user.id);

      if (!holdings || holdings.length === 0) {
        setCoverage([]);
        setLoadingCoverage(false);
        return;
      }

      const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))];

      // Get earliest transaction date
      const { data: earliestTxn } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      const startDate = earliestTxn?.transaction_date || new Date().toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      // Analyze each symbol
      const results: SymbolCoverage[] = [];
      for (const symbol of uniqueSymbols) {
        if (symbol === 'CASH') continue; // Skip cash holdings

        const gaps = await HistoricalPriceService.findPriceGaps(
          symbol,
          startDate,
          endDate
        );

        const totalDays = HistoricalPriceService.calculateBusinessDays(startDate, endDate);
        const missingDays = gaps.reduce((sum, gap) => sum + gap.missingDays, 0);
        const coveragePercent = totalDays > 0 ? ((totalDays - missingDays) / totalDays) * 100 : 100;

        results.push({
          symbol,
          totalDays,
          missingDays,
          coverage: coveragePercent,
          gaps
        });
      }

      // Sort by worst coverage first
      results.sort((a, b) => a.coverage - b.coverage);
      setCoverage(results);
    } catch (err) {
      console.error('[PriceDataSettings] Coverage analysis error:', err);
    } finally {
      setLoadingCoverage(false);
    }
  };

  const handleBackfill = async () => {
    if (!user) return;

    setBackfilling(true);
    setProgress([]);
    setResult(null);

    try {
      // Get default account ID
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('category', 'Investment Accounts')
        .limit(1);

      if (!accounts || accounts.length === 0) {
        // Fallback to any account
        const { data: anyAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!anyAccount || anyAccount.length === 0) {
          alert('No account found. Please create an account first.');
          setBackfilling(false);
          return;
        }
      }

      const accountId = accounts?.[0]?.id || '';

      // Run smart sync (max 3 symbols per run due to rate limits)
      const backfillResult = await HistoricalPriceService.smartSync(
        user.id,
        accountId,
        3,  // Max 3 symbols to respect API rate limits
        false,  // false = full historical, true = last 7 days only
        (progressUpdate: any) => {
          setProgress(prev => {
            const existingIndex = prev.findIndex(p => p.symbol === progressUpdate.symbol);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = progressUpdate;
              return updated;
            }
            return [...prev, progressUpdate];
          });
        }
      );

      setResult(backfillResult);

      // Refresh coverage if on diagnostic tab
      if (activeTab === 'diagnostic') {
        setTimeout(() => analyzeCoverage(), 1000);
      }
    } catch (err) {
      console.error('[PriceDataSettings] Backfill error:', err);
      alert('Backfill failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Price Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Historical Price Data Management
          </DialogTitle>
          <DialogDescription>
            Manage and backfill historical price data for accurate portfolio tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backfill">Backfill</TabsTrigger>
            <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>
          </TabsList>

          {/* Backfill Tab */}
          <TabsContent value="backfill" className="space-y-4">
            <div className="space-y-4">
              <Button
                onClick={handleBackfill}
                disabled={backfilling}
                className="w-full"
              >
                {backfilling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Backfilling Historical Prices...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Backfill Historical Prices (3 symbols)
                  </>
                )}
              </Button>

              {backfilling && progress.length > 0 && (
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    {progress.map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{item.symbol}</span>
                          <span className="text-muted-foreground">
                            {item.status === 'fetching' && 'Fetching...'}
                            {item.status === 'completed' && `✅ ${item.pricesAdded || 0} prices added`}
                            {item.status === 'error' && `❌ ${item.error}`}
                            {item.status === 'pending' && 'Waiting...'}
                          </span>
                        </div>
                        {item.current && item.total && (
                          <div className="space-y-1">
                            <Progress value={item.overallProgress || 0} />
                            <p className="text-xs text-muted-foreground">
                              {item.current} of {item.total} symbols
                              {item.estimatedTimeRemaining && ` • ${Math.ceil(item.estimatedTimeRemaining / 60)} min remaining`}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {result && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Backfill complete! Processed {result.symbolsProcessed} of {result.totalSymbols} symbols,
                    added {result.totalPricesAdded} historical prices.
                    {result.totalSymbols > result.symbolsProcessed && (
                      <span className="block mt-2">
                        Run again to backfill remaining {result.totalSymbols - result.symbolsProcessed} symbols
                        (free tier limit: 25 API calls/day).
                      </span>
                    )}
                    {result.errors && result.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm">Errors ({result.errors.length})</summary>
                        <ul className="mt-1 text-xs space-y-1">
                          {result.errors.map((error, i) => (
                            <li key={i} className="text-red-600">{error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> This backfills up to 3 symbols per run (free API tier limit: 5 calls/min).
                  Each symbol takes ~13 seconds. Run multiple times to backfill all symbols gradually.
                  API limit resets daily (25 calls/day).
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Diagnostic Tab */}
          <TabsContent value="diagnostic" className="space-y-4">
            {loadingCoverage ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
              </Card>
            ) : coverage.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No holdings found. Add some holdings to see price data coverage.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Price Data Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {coverage.map(item => (
                    <div key={item.symbol} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.symbol}</span>
                          {item.coverage === 100 && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {item.coverage < 100 && item.coverage >= 80 && (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          {item.coverage < 80 && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {item.coverage.toFixed(1)}% complete
                        </span>
                      </div>
                      <Progress value={item.coverage} />
                      {item.missingDays > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Missing {item.missingDays} of {item.totalDays} trading days
                          {item.gaps.length > 0 && ` (${item.gaps.length} gap${item.gaps.length > 1 ? 's' : ''})`}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
