/**
 * ============================================================================
 * HISTORICAL DATA FIX - Ready-to-Use Implementation
 * ============================================================================
 *
 * This file contains ready-to-use components and functions to fix
 * historical price data gaps in your portfolio.
 *
 * Components included:
 * 1. PriceDataDiagnostic - Shows what data you have and what's missing
 * 2. BackfillButton - Button to trigger backfill with progress tracking
 * 3. Improved chart tooltip showing data quality
 * 4. Daily price update Edge Function
 *
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { HistoricalPriceService } from '@/services/historicalPriceService';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, Database } from 'lucide-react';

// ============================================================================
// 1. PRICE DATA DIAGNOSTIC COMPONENT
// ============================================================================

/**
 * Diagnostic component to show price data coverage for each symbol
 * Place this in Settings page or a debug panel
 */
export function PriceDataDiagnostic() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [coverage, setCoverage] = useState<Array<{
    symbol: string;
    totalDays: number;
    missingDays: number;
    coverage: number;
    gaps: Array<{ startDate: string; endDate: string; missingDays: number }>;
  }>>([]);

  useEffect(() => {
    async function analyze() {
      if (!user) return;

      try {
        // Get all unique symbols from holdings
        const { data: holdings } = await supabase
          .from('holdings')
          .select('symbol')
          .eq('user_id', user.id);

        if (!holdings || holdings.length === 0) {
          setLoading(false);
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
        const results = [];
        for (const symbol of uniqueSymbols) {
          const gaps = await HistoricalPriceService.findPriceGaps(
            symbol,
            startDate,
            endDate
          );

          const totalDays = HistoricalPriceService.calculateBusinessDays(startDate, endDate);
          const missingDays = gaps.reduce((sum, gap) => sum + gap.missingDays, 0);
          const coverage = totalDays > 0 ? ((totalDays - missingDays) / totalDays) * 100 : 100;

          results.push({
            symbol,
            totalDays,
            missingDays,
            coverage,
            gaps
          });
        }

        // Sort by worst coverage first
        results.sort((a, b) => a.coverage - b.coverage);
        setCoverage(results);
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Historical Price Data Coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {coverage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holdings found</p>
        ) : (
          coverage.map(item => (
            <div key={item.symbol} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.symbol}</span>
                  {item.coverage === 100 && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {item.coverage < 100 && (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
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
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 2. BACKFILL BUTTON COMPONENT
// ============================================================================

interface BackfillProgress {
  symbol: string;
  status: 'pending' | 'fetching' | 'completed' | 'error';
  pricesAdded?: number;
  error?: string;
  current?: number;
  total?: number;
  estimatedTimeRemaining?: number;
}

/**
 * Button component to trigger historical price backfilling
 * Respects API rate limits and shows progress
 */
export function HistoricalPriceBackfillButton() {
  const { user } = useAuth();
  const [backfilling, setBackfilling] = useState(false);
  const [progress, setProgress] = useState<BackfillProgress[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    symbolsProcessed: number;
    totalPricesAdded: number;
    totalSymbols: number;
  } | null>(null);

  const handleBackfill = async () => {
    if (!user) return;

    setBackfilling(true);
    setProgress([]);
    setResult(null);

    try {
      // Get default account ID (or let user select)
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!accounts || accounts.length === 0) {
        alert('No account found');
        return;
      }

      const accountId = accounts[0].id;

      // Run smart sync (max 3 symbols per run due to rate limits)
      const backfillResult = await HistoricalPriceService.smartSync(
        user.id,
        accountId,
        3,  // Max 3 symbols to respect API rate limits
        false,  // false = full historical, true = last 7 days only
        (progressUpdate: BackfillProgress) => {
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
    } catch (err) {
      console.error('Backfill error:', err);
      alert('Backfill failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBackfilling(false);
    }
  };

  return (
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
                    {item.status === 'completed' && `✅ ${item.pricesAdded} prices added`}
                    {item.status === 'error' && `❌ ${item.error}`}
                    {item.status === 'pending' && 'Waiting...'}
                  </span>
                </div>
                {item.current && item.total && (
                  <div className="space-y-1">
                    <Progress value={(item.current / item.total) * 100} />
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
  );
}

// ============================================================================
// 3. IMPROVED CHART TOOLTIP WITH DATA QUALITY
// ============================================================================

/**
 * Enhanced tooltip that shows data quality indicators
 * Use this in MarketValueOverTimeChart.tsx
 */
interface ChartDataPoint {
  date: string;
  time: string;
  value: number;
  costBasis: number;
  gain: number;
  dataQuality?: number;  // Add this field
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: ChartDataPoint;
    [key: string]: unknown;
  }>;
}

export function EnhancedChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0]) {
    return null;
  }

  const data = payload[0].payload;
  if (!data) return null;

  const dataQuality = data.dataQuality || 1.0;
  const isEstimated = dataQuality < 1.0;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-2">
      <div className="text-sm font-medium">{data.time}</div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Portfolio Value:</span>
          <span className="text-sm font-semibold">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
            }).format(data.value)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Cost Basis:</span>
          <span className="text-sm">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
            }).format(data.costBasis)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Total Gain:</span>
          <span className={`text-sm font-medium ${data.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.gain >= 0 ? '+' : ''}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
            }).format(data.gain)}
          </span>
        </div>
      </div>

      {/* Data quality indicator */}
      {isEstimated && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-yellow-600">
            <AlertCircle className="h-3 w-3" />
            <span>
              {dataQuality === 0.7 && 'Estimated (weekend/holiday)'}
              {dataQuality === 0.5 && 'Interpolated (missing price data)'}
              {dataQuality < 0.5 && 'Low quality data'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. SUPABASE EDGE FUNCTION FOR DAILY PRICE UPDATES
// ============================================================================

/**
 * Create this file: supabase/functions/daily-price-update/index.ts
 *
 * This Edge Function runs daily to fetch current prices for all holdings.
 * Set up a cron trigger in Supabase Dashboard to run this at market close (6 PM ET).
 */

/*
// supabase/functions/daily-price-update/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all unique symbols from current holdings
    const { data: holdings, error: holdingsError } = await supabaseClient
      .from('holdings')
      .select('symbol')

    if (holdingsError) throw holdingsError

    const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))]
    const today = new Date().toISOString().split('T')[0]

    let updated = 0
    let errors = []

    // Fetch current price for each symbol (respecting rate limits)
    for (const symbol of uniqueSymbols.slice(0, 25)) {  // Free tier daily limit
      try {
        // You'll need to import your PriceService or make API calls directly
        // For now, this is a placeholder - adapt based on your price fetching logic
        const response = await fetch(`YOUR_PRICE_API_URL?symbol=${symbol}`)
        const priceData = await response.json()

        // Store in price_history
        await supabaseClient
          .from('price_history')
          .upsert({
            symbol: symbol.toUpperCase(),
            price_date: today,
            close_price: priceData.price,
            open_price: priceData.open,
            high_price: priceData.high,
            low_price: priceData.low,
            volume: priceData.volume,
            data_source: 'daily_update'
          }, {
            onConflict: 'symbol,price_date'
          })

        updated++

        // Rate limit: wait 13 seconds between calls (5 calls/min)
        await new Promise(resolve => setTimeout(resolve, 13000))
      } catch (err) {
        errors.push(`${symbol}: ${err.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        total: uniqueSymbols.length,
        errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
*/

// ============================================================================
// 5. HOW TO USE THESE COMPONENTS
// ============================================================================

/**
 * Add to your Settings page or Portfolio page:
 *
 * import { PriceDataDiagnostic, HistoricalPriceBackfillButton } from '@/components/HistoricalDataFix'
 *
 * function SettingsPage() {
 *   return (
 *     <div className="space-y-6">
 *       <h2>Historical Price Data</h2>
 *       <PriceDataDiagnostic />
 *       <HistoricalPriceBackfillButton />
 *     </div>
 *   )
 * }
 */

/**
 * Replace tooltip in MarketValueOverTimeChart.tsx:
 *
 * import { EnhancedChartTooltip } from '@/components/HistoricalDataFix'
 *
 * <AreaChart data={chartData}>
 *   <Tooltip content={<EnhancedChartTooltip />} />
 * </AreaChart>
 */
