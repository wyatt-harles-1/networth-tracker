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

      // Get date from 1 week ago (7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Fetch closing prices from 1 week ago for all symbols
      const { data: priceHistory, error } = await supabase
        .from('price_history')
        .select('symbol, close_price')
        .in('symbol', symbols)
        .lte('price_date', weekAgoStr)
        .order('price_date', { ascending: false });

      if (error) throw error;

      // Create a map of symbol to week-ago close price
      const weekAgoPrices = new Map<string, number>();
      priceHistory?.forEach(record => {
        if (!weekAgoPrices.has(record.symbol)) {
          weekAgoPrices.set(record.symbol, record.close_price);
        }
      });

      // Calculate weekly changes
      const holdingsWithChanges = holdings
        .map(holding => {
          const currentPrice = Number(holding.current_price);
          const weekAgoPrice = weekAgoPrices.get(holding.symbol);

          if (!weekAgoPrice || weekAgoPrice === 0) {
            return null;
          }

          const dailyChange = currentPrice - weekAgoPrice;
          const dailyChangePercentage = (dailyChange / weekAgoPrice) * 100;

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
      console.error('Failed to calculate weekly changes:', error);
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
          <div className="relative w-14 h-10 rounded-lg overflow-hidden border border-gray-300">
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
                showGainers ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex h-full">
                <div className="w-14 bg-green-50 hover:bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-700" />
                </div>
                <div className="w-14 bg-red-50 hover:bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-700" />
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowGainers(!showGainers)}
              className="absolute inset-0 w-full h-full cursor-pointer z-10"
              aria-label={showGainers ? 'Switch to Losers' : 'Switch to Gainers'}
            />
          </div>
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
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Portfolio Movers
        </h3>
        <p className="text-xs text-gray-500">
          This week's top gainers and losers
        </p>
      </div>

      <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200">
        {/* Top Gainers */}
        <div className="pr-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h4 className="text-sm font-medium text-gray-900">Top Gainers</h4>
          </div>
          <div className="space-y-1.5">
            {topGainers.length > 0 ? (
              topGainers.map(holding => (
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
                    <p className="text-xs font-medium text-green-600">
                      +{holding.dailyChangePercentage.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(Number(holding.current_price))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-2">No gains this week</p>
            )}
          </div>
        </div>

        {/* Top Losers */}
        <div className="pl-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <h4 className="text-sm font-medium text-gray-900">Top Losers</h4>
          </div>
          <div className="space-y-1.5">
            {topLosers.length > 0 ? (
              topLosers.map(holding => (
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
                    <p className="text-xs font-medium text-red-600">
                      {holding.dailyChangePercentage.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(Number(holding.current_price))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-2">No losses this week</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
