import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHoldings } from '@/hooks/useHoldings';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export function TopGainersLosersCardNew() {
  const [showGainers, setShowGainers] = React.useState(true);
  const { holdings, loading } = useHoldings();
  const [holdingsWithDailyChange, setHoldingsWithDailyChange] = React.useState<
    Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      current_value: number;
      dailyChange: number;
      dailyChangePercentage: number;
    }>
  >([]);
  const [calculating, setCalculating] = React.useState(false);

  const calculateDailyChanges = React.useCallback(async () => {
    setCalculating(true);
    try {
      // Get unique symbols from holdings
      const symbols = [...new Set(holdings.map(h => h.symbol))];

      // Get yesterday's date (market close)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Fetch yesterday's closing prices for all symbols
      const { data: priceHistory, error } = await supabase
        .from('price_history')
        .select('symbol, close_price')
        .in('symbol', symbols)
        .lte('price_date', yesterdayStr)
        .order('price_date', { ascending: false });

      if (error) throw error;

      // Create a map of symbol to yesterday's close price
      const yesterdayPrices = new Map<string, number>();
      priceHistory?.forEach(record => {
        if (!yesterdayPrices.has(record.symbol)) {
          yesterdayPrices.set(record.symbol, record.close_price);
        }
      });

      // Calculate daily changes
      const holdingsWithChanges = holdings
        .map(holding => {
          const currentPrice = Number(holding.current_price);
          const yesterdayPrice = yesterdayPrices.get(holding.symbol);

          if (!yesterdayPrice || yesterdayPrice === 0) {
            return null;
          }

          const dailyChange = currentPrice - yesterdayPrice;
          const dailyChangePercentage = (dailyChange / yesterdayPrice) * 100;

          return {
            id: holding.id,
            symbol: holding.symbol,
            name: holding.name,
            current_price: currentPrice,
            current_value: Number(holding.current_value),
            dailyChange,
            dailyChangePercentage,
          };
        })
        .filter(
          (h): h is NonNullable<typeof h> =>
            h !== null && h.dailyChangePercentage !== 0
        );

      setHoldingsWithDailyChange(holdingsWithChanges);
    } catch (error) {
      console.error('Failed to calculate daily changes:', error);
      setHoldingsWithDailyChange([]);
    } finally {
      setCalculating(false);
    }
  }, [holdings]);

  React.useEffect(() => {
    if (!loading && holdings.length > 0) {
      calculateDailyChanges();
    }
  }, [holdings, loading, calculateDailyChanges]);

  const topGainers = holdingsWithDailyChange
    .filter(h => h.dailyChangePercentage > 0)
    .sort((a, b) => b.dailyChangePercentage - a.dailyChangePercentage)
    .slice(0, 3);

  const topLosers = holdingsWithDailyChange
    .filter(h => h.dailyChangePercentage < 0)
    .sort((a, b) => a.dailyChangePercentage - b.dailyChangePercentage)
    .slice(0, 3);

  const currentData = showGainers ? topGainers : topLosers;
  const currentIcon = showGainers ? TrendingUp : TrendingDown;
  const currentTitle = showGainers ? 'Top Gainers' : 'Top Losers';
  const currentColor = showGainers ? 'text-green-500' : 'text-red-500';
  const currentTextColor = showGainers ? 'text-green-600' : 'text-red-600';

  if (loading || calculating) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </Card>
    );
  }

  if (currentData.length === 0) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Portfolio Movers
            </h3>
            <p className="text-xs text-gray-500">
              Today's top gainers and losers
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGainers(!showGainers)}
            className="p-2 h-auto rounded-lg hover:bg-gray-100"
          >
            {showGainers ? (
              <ToggleRight className="h-5 w-5 text-green-500" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-red-500" />
            )}
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            {React.createElement(currentIcon, {
              className: `w-6 h-6 ${currentColor}`,
            })}
          </div>
          <p className="text-sm text-gray-500">
            No {showGainers ? 'gains' : 'losses'} to display
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Add holdings to track performance
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Portfolio Movers
          </h3>
          <p className="text-xs text-gray-500">
            Today's top gainers and losers
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowGainers(!showGainers)}
          className="p-2 h-auto rounded-lg hover:bg-gray-100"
        >
          {showGainers ? (
            <ToggleRight className="h-5 w-5 text-green-500" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-red-500" />
          )}
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          {React.createElement(currentIcon, {
            className: `h-4 w-4 ${currentColor}`,
          })}
          <h4 className="text-sm font-medium text-gray-900">{currentTitle}</h4>
        </div>
        <div className="space-y-1.5">
          {currentData.map(holding => (
            <div
              key={holding.id}
              className="flex items-center justify-between py-1"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {holding.symbol}
                </p>
                <p className="text-xs text-gray-500 truncate">{holding.name}</p>
              </div>
              <div className="text-right ml-2">
                <p className={`text-xs font-medium ${currentTextColor}`}>
                  {holding.dailyChangePercentage >= 0 ? '+' : ''}
                  {holding.dailyChangePercentage.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(Number(holding.current_price))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
