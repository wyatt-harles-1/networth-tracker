/**
 * ============================================================================
 * Assets Component
 * ============================================================================
 *
 * Asset allocation and management page showing portfolio composition.
 *
 * Features:
 * - View all holdings grouped by asset class
 * - Performance charts for individual assets
 * - Sort holdings by name, value, quantity, or gains
 * - Expandable/collapsible asset class sections
 * - Price refresh functionality
 * - Crypto price correction tool
 * - Asset performance metrics (cost basis, current value, gains)
 *
 * Asset Classes:
 * - Stocks (US, International)
 * - Bonds (Government, Corporate)
 * - Cryptocurrency
 * - Cash & Equivalents
 * - Real Estate
 * - Commodities
 * - Alternative Investments
 *
 * Data Aggregation:
 * - Groups holdings by asset class
 * - Calculates total value, cost basis, and gains per class
 * - Shows allocation percentages
 * - Tracks individual asset performance
 *
 * Sub-components:
 * - CryptoPriceCorrection: Manual price entry for crypto assets
 *
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Bitcoin,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { useHoldings } from '@/hooks/useHoldings';
import { useAccounts } from '@/hooks/useAccounts';
import { useAssetClasses } from '@/hooks/useAssetClasses';
import { useTransactions } from '@/hooks/useTransactions';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { usePriceUpdates } from '@/hooks/usePriceUpdates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CryptoPriceService } from '@/services/cryptoPriceService';
import { CryptoPriceCorrection } from './CryptoPriceCorrection';

// Available time range options for asset performance charts
const timeSpans = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

// Sort options for asset list
type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'value-desc'
  | 'value-asc'
  | 'quantity-desc'
  | 'quantity-asc'
  | 'gain-desc'
  | 'gain-asc';

/**
 * Asset performance data structure
 * Contains all metrics for an individual holding
 */
interface AssetPerformance {
  symbol: string;
  name: string;
  assetType: string;
  assetClassId: string | null;
  totalQuantity: number;
  costBasis: number;
  currentValue: number;
  avgCostPerUnit: number;
  currentPrice: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  accounts: string[];
  transactionCount: number;
  firstPurchaseDate: string | null;
}

/**
 * Portfolio snapshot history item
 * Represents a portfolio state at a specific date
 */
interface PortfolioSnapshotHistory {
  snapshotDate: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  assetClassBreakdown: Record<string, number>;
}

/**
 * Recharts Tooltip props
 * Used for custom tooltip components in charts
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: {
      time?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
}

export function Assets() {
  const [selectedTimespan, setSelectedTimespan] = useState('1M');
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<string[]>(
    []
  );
  const [sortBy, setSortBy] = useState<SortOption>('value-desc');
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>(
    {}
  );

  const { holdings, loading: holdingsLoading } = useHoldings();
  const { accounts } = useAccounts();
  const { assetClasses } = useAssetClasses();
  const { transactions } = useTransactions();
  const { getPortfolioHistory } = usePortfolioSnapshots();
  const { updating, updateAllPrices } = usePriceUpdates();

  const assetPerformances = useMemo<AssetPerformance[]>(() => {
    const assetMap = new Map<string, AssetPerformance>();

    holdings.forEach(holding => {
      const symbol = holding.symbol;
      const account = accounts.find(acc => acc.id === holding.account_id);

      if (!assetMap.has(symbol)) {
        const assetClassId =
          account && 'asset_class_id' in account
            ? (account['asset_class_id'] as string | null)
            : null;
        assetMap.set(symbol, {
          symbol,
          name: holding.name,
          assetType: holding.asset_type,
          assetClassId: assetClassId,
          totalQuantity: 0,
          costBasis: 0,
          currentValue: 0,
          avgCostPerUnit: 0,
          currentPrice: Number(holding.current_price),
          unrealizedGain: 0,
          unrealizedGainPercent: 0,
          accounts: [],
          transactionCount: 0,
          firstPurchaseDate: null,
        });
      }

      const asset = assetMap.get(symbol)!;
      asset.totalQuantity += Number(holding.quantity);
      asset.costBasis += Number(holding.cost_basis);
      asset.currentValue += Number(holding.current_value);

      if (account && !asset.accounts.includes(account.name)) {
        asset.accounts.push(account.name);
      }
    });

    const assetTransactions = transactions.filter(t => {
      const transactionType =
        'transaction_type' in t ? (t['transaction_type'] as string) : '';
      return (
        t.transaction_metadata?.ticker &&
        [
          'stock_buy',
          'stock_sell',
          'etf_buy',
          'etf_sell',
          'crypto_buy',
          'crypto_sell',
        ].includes(transactionType)
      );
    });

    assetTransactions.forEach(tx => {
      const ticker = tx.transaction_metadata.ticker;
      if (ticker && assetMap.has(ticker)) {
        const asset = assetMap.get(ticker)!;
        asset.transactionCount++;

        const transactionDate =
          'transaction_date' in tx ? (tx['transaction_date'] as string) : '';
        if (
          !asset.firstPurchaseDate ||
          (transactionDate && transactionDate < asset.firstPurchaseDate)
        ) {
          asset.firstPurchaseDate = transactionDate;
        }
      }
    });

    assetMap.forEach(asset => {
      asset.avgCostPerUnit =
        asset.totalQuantity > 0 ? asset.costBasis / asset.totalQuantity : 0;
      asset.unrealizedGain = asset.currentValue - asset.costBasis;
      asset.unrealizedGainPercent =
        asset.costBasis > 0
          ? (asset.unrealizedGain / asset.costBasis) * 100
          : 0;
    });

    return Array.from(assetMap.values());
  }, [holdings, accounts, transactions]);

  const filteredAssets = useMemo(() => {
    let filtered = assetPerformances;

    if (selectedAssetClasses.length > 0) {
      filtered = filtered.filter(
        asset =>
          asset.assetClassId &&
          selectedAssetClasses.includes(asset.assetClassId)
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.symbol.localeCompare(b.symbol);
        case 'name-desc':
          return b.symbol.localeCompare(a.symbol);
        case 'value-desc':
          return b.currentValue - a.currentValue;
        case 'value-asc':
          return a.currentValue - b.currentValue;
        case 'quantity-desc':
          return b.totalQuantity - a.totalQuantity;
        case 'quantity-asc':
          return a.totalQuantity - b.totalQuantity;
        case 'gain-desc':
          return b.unrealizedGain - a.unrealizedGain;
        case 'gain-asc':
          return a.unrealizedGain - b.unrealizedGain;
        default:
          return 0;
      }
    });
  }, [assetPerformances, selectedAssetClasses, sortBy]);

  const daysMap: Record<string, number> = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    ALL: 3650,
  };

  const history = getPortfolioHistory(daysMap[selectedTimespan] || 30);

  const totalPortfolioValue = useMemo(() => {
    if (selectedAssetClasses.length > 0) {
      return filteredAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
    }
    return holdings.reduce((sum, h) => sum + Number(h.current_value), 0);
  }, [holdings, filteredAssets, selectedAssetClasses]);

  const filteredHistory = useMemo(() => {
    if (selectedAssetClasses.length === 0) {
      return history;
    }

    return history.map(snapshot => {
      const filteredValue = Object.entries(snapshot.assetClassBreakdown)
        .filter(([classId]) => selectedAssetClasses.includes(classId))
        .reduce((sum, [, value]) => sum + Number(value), 0);

      return {
        ...snapshot,
        netWorth: filteredValue,
        totalAssets: filteredValue,
      };
    });
  }, [history, selectedAssetClasses]);

  const performanceData = useMemo(() => {
    if (filteredHistory.length < 2) {
      return {
        change: 0,
        percentage: 0,
        high: totalPortfolioValue,
        low: totalPortfolioValue,
      };
    }

    const oldestValue = filteredHistory[0].netWorth;
    const change = totalPortfolioValue - oldestValue;
    const percentage = oldestValue > 0 ? (change / oldestValue) * 100 : 0;
    const high = Math.max(
      ...filteredHistory.map((h: PortfolioSnapshotHistory) => h.netWorth),
      totalPortfolioValue
    );
    const low = Math.min(
      ...filteredHistory.map((h: PortfolioSnapshotHistory) => h.netWorth),
      totalPortfolioValue
    );

    return { change, percentage, high, low };
  }, [filteredHistory, totalPortfolioValue]);

  const chartData = useMemo(() => {
    const data = filteredHistory.map((snapshot: PortfolioSnapshotHistory) => ({
      time: new Date(snapshot.snapshotDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      value: snapshot.netWorth,
    }));

    if (
      data.length === 0 ||
      data[data.length - 1].value !== totalPortfolioValue
    ) {
      data.push({
        time: 'Now',
        value: totalPortfolioValue,
      });
    }

    return data;
  }, [filteredHistory, totalPortfolioValue]);

  const toggleAssetClass = (classId: string) => {
    setSelectedAssetClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const toggleAssetExpanded = (symbol: string) => {
    setExpandedAssets(prev => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  const getAssetTransactions = (symbol: string) => {
    return transactions
      .filter(t => t.transaction_metadata?.ticker === symbol)
      .sort((a, b) => {
        const dateA =
          'transaction_date' in a ? (a['transaction_date'] as string) : '';
        const dateB =
          'transaction_date' in b ? (b['transaction_date'] as string) : '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  };

  const handleRefreshPrices = async () => {
    await updateAllPrices();
  };

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length && payload[0]) {
      const firstPayload = payload[0];
      const time = firstPayload.payload?.time;
      const value = firstPayload.value;

      if (time !== undefined && value !== undefined) {
        return (
          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-1">{time}</p>
            <p className="text-sm text-blue-600">{formatCurrency(value)}</p>
          </div>
        );
      }
    }
    return null;
  };

  if (holdingsLoading) {
    return (
      <div className="p-4 pb-20 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="space-y-4">
        {/* Portfolio Value Header */}
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">
                {selectedAssetClasses.length > 0
                  ? 'Filtered Portfolio Value'
                  : 'Total Portfolio Value'}
              </p>
              <div className="flex items-center gap-2">
                <CryptoPriceCorrection />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshPrices}
                  disabled={updating}
                  className="p-1.5 h-auto rounded-lg hover:bg-gray-100"
                >
                  <RefreshCw
                    className={cn(
                      'h-4 w-4 text-gray-600',
                      updating && 'animate-spin'
                    )}
                  />
                </Button>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(totalPortfolioValue)}
            </p>
            {filteredHistory.length >= 2 && (
              <p
                className={cn(
                  'text-sm mt-1',
                  performanceData.change >= 0 ? 'text-teal-600' : 'text-red-600'
                )}
              >
                {performanceData.change >= 0 ? '+' : ''}
                {formatCurrency(performanceData.change)} (
                {performanceData.percentage >= 0 ? '+' : ''}
                {performanceData.percentage.toFixed(2)}%){' '}
                {selectedTimespan.toLowerCase()}
              </p>
            )}
          </div>
        </div>

        {/* Portfolio Flow Chart */}
        {chartData.length > 1 && (
          <div className="h-80 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="portfolioGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop
                      offset="100%"
                      stopColor="#10B981"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  interval="preserveStartEnd"
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
                  domain={['dataMin - 1000', 'dataMax + 1000']}
                  tickCount={4}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={3}
                  fill="url(#portfolioGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Timespan Selector */}
        <div className="flex justify-between mb-6 px-2">
          {timeSpans.map(span => (
            <Button
              key={span}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTimespan(span)}
              className={cn(
                'text-xs sm:text-sm px-2 sm:px-3 py-2 h-auto flex-1 mx-0.5 sm:mx-1 rounded-full font-medium transition-all',
                selectedTimespan === span
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
            >
              {span}
            </Button>
          ))}
        </div>

        {/* Asset Class Filters */}
        {assetClasses.length > 0 && (
          <Card className="p-4 bg-white border-0 shadow-sm">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Filter by Asset Class
            </h4>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  selectedAssetClasses.length === 0 ? 'default' : 'outline'
                }
                className={cn(
                  'cursor-pointer px-3 py-1.5 text-xs transition-colors',
                  selectedAssetClasses.length === 0
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'hover:bg-gray-100'
                )}
                onClick={() => setSelectedAssetClasses([])}
              >
                All
              </Badge>
              {assetClasses.map(assetClass => (
                <Badge
                  key={assetClass.id}
                  variant={
                    selectedAssetClasses.includes(assetClass.id)
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer px-3 py-1.5 text-xs transition-colors"
                  style={{
                    backgroundColor: selectedAssetClasses.includes(
                      assetClass.id
                    )
                      ? assetClass.color
                      : 'transparent',
                    borderColor: assetClass.color,
                    color: selectedAssetClasses.includes(assetClass.id)
                      ? '#fff'
                      : 'inherit',
                  }}
                  onClick={() => toggleAssetClass(assetClass.id)}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: assetClass.color }}
                    />
                    {assetClass.name}
                  </div>
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Sort and Asset List */}
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Individual Assets ({filteredAssets.length})
            </h4>
            <Select
              value={sortBy}
              onValueChange={value => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value-desc">Value: High to Low</SelectItem>
                <SelectItem value="value-asc">Value: Low to High</SelectItem>
                <SelectItem value="gain-desc">Gain: Best First</SelectItem>
                <SelectItem value="gain-asc">Gain: Worst First</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
                <SelectItem value="quantity-desc">
                  Quantity: High to Low
                </SelectItem>
                <SelectItem value="quantity-asc">
                  Quantity: Low to High
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                {selectedAssetClasses.length > 0
                  ? 'No assets found with selected filters.'
                  : 'No holdings yet. Add transactions to see your assets.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssets.map(asset => {
                const assetClass = assetClasses.find(
                  ac => ac.id === asset.assetClassId
                );
                const assetTransactions = getAssetTransactions(asset.symbol);
                const isExpanded = expandedAssets[asset.symbol];

                return (
                  <div
                    key={asset.symbol}
                    className="border border-gray-200 rounded-lg"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleAssetExpanded(asset.symbol)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {asset.symbol}
                              </p>
                              {CryptoPriceService.isCryptocurrency(
                                asset.symbol
                              ) && (
                                <Badge className="text-xs px-2 py-0 bg-orange-500 text-white border-orange-500">
                                  <Bitcoin className="h-3 w-3 mr-1" />
                                  Crypto
                                </Badge>
                              )}
                              {assetClass && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0"
                                >
                                  <div
                                    className="w-2 h-2 rounded-full mr-1"
                                    style={{
                                      backgroundColor: assetClass.color,
                                    }}
                                  />
                                  {asset.assetType}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                              {asset.name}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Quantity:</span>
                                <span className="ml-1 font-medium text-gray-900">
                                  {asset.totalQuantity.toFixed(4)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Avg Cost:</span>
                                <span className="ml-1 font-medium text-gray-900">
                                  {formatCurrency(asset.avgCostPerUnit)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Cost Basis:
                                </span>
                                <span className="ml-1 font-medium text-gray-900">
                                  {formatCurrency(asset.costBasis)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Transactions:
                                </span>
                                <span className="ml-1 font-medium text-gray-900">
                                  {asset.transactionCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900 mb-1">
                            {formatCurrency(asset.currentValue)}
                          </p>
                          <p
                            className={cn(
                              'text-xs font-medium',
                              asset.unrealizedGain >= 0
                                ? 'text-teal-600'
                                : 'text-red-600'
                            )}
                          >
                            {asset.unrealizedGain >= 0 ? '+' : ''}
                            {formatCurrency(asset.unrealizedGain)}
                          </p>
                          <p
                            className={cn(
                              'text-xs',
                              asset.unrealizedGain >= 0
                                ? 'text-teal-600'
                                : 'text-red-600'
                            )}
                          >
                            ({asset.unrealizedGainPercent >= 0 ? '+' : ''}
                            {asset.unrealizedGainPercent.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    </div>

                    {isExpanded && assetTransactions.length > 0 && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <h5 className="text-xs font-medium text-gray-700 mb-3">
                          Transaction History ({assetTransactions.length})
                        </h5>
                        <div className="space-y-2">
                          {assetTransactions.slice(0, 10).map(tx => {
                            const transactionId =
                              'id' in tx ? (tx['id'] as string) : '';
                            const transactionType =
                              'transaction_type' in tx
                                ? (tx['transaction_type'] as string)
                                : '';
                            const transactionDate =
                              'transaction_date' in tx
                                ? (tx['transaction_date'] as string)
                                : '';
                            const amount =
                              'amount' in tx ? (tx['amount'] as number) : 0;

                            if (!transactionId) return null;

                            return (
                              <div
                                key={transactionId}
                                className="flex items-center justify-between py-2 px-3 bg-white rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge
                                      variant={
                                        transactionType.includes('buy')
                                          ? 'default'
                                          : 'outline'
                                      }
                                      className={cn(
                                        'text-xs px-2 py-0',
                                        transactionType.includes('buy') &&
                                          'bg-blue-600 text-white',
                                        transactionType.includes('sell') &&
                                          'bg-orange-600 text-white border-orange-600',
                                        transactionType.includes('dividend') &&
                                          'bg-green-600 text-white border-green-600'
                                      )}
                                    >
                                      {transactionType
                                        .replace('_', ' ')
                                        .toUpperCase()}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {transactionDate
                                        ? new Date(
                                            transactionDate
                                          ).toLocaleDateString()
                                        : ''}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {tx.transaction_metadata?.quantity && (
                                      <span>
                                        {tx.transaction_metadata.quantity}{' '}
                                        shares @{' '}
                                        {formatCurrency(
                                          tx.transaction_metadata.price || 0
                                        )}
                                      </span>
                                    )}
                                    {tx.transaction_metadata?.notes && (
                                      <span className="ml-2 text-gray-500">
                                        • {tx.transaction_metadata.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p
                                    className={cn(
                                      'text-sm font-medium',
                                      amount >= 0
                                        ? 'text-teal-600'
                                        : 'text-red-600'
                                    )}
                                  >
                                    {amount >= 0 ? '+' : ''}
                                    {formatCurrency(amount)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          {assetTransactions.length > 10 && (
                            <p className="text-xs text-center text-gray-500 mt-2">
                              Showing 10 of {assetTransactions.length}{' '}
                              transactions
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
