/**
 * Holding Detail Modal - Full-screen modal for individual holdings
 * Matches AccountDetailsModal styling exactly
 */

import { useEffect, useState, useCallback } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  DollarSign,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { SymbolPriceHistoryService } from '@/services/symbolPriceHistoryService';
import { LiveStockChart } from './LiveStockChart';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionCard } from './TransactionCard';
import { Transaction } from '@/types/transaction';
import { AddTransactionWizard } from './AddTransactionWizard';

interface Holding {
  id: string;
  symbol: string;
  asset_type: string;
  quantity: number | string;
  cost_basis: number | string;
  current_value: number | string;
  current_price: number | string;
  gain?: number;
  gainPercentage?: number;
  account_id?: string;
}

interface HoldingDetailModalProps {
  holding: Holding | null;
  isOpen?: boolean;
  onClose: () => void;
  onAddTransaction?: (holdingId: string) => void;
}

export function HoldingDetailModal({
  holding,
  isOpen = true,
  onClose,
  onAddTransaction,
}: HoldingDetailModalProps) {
  const { user } = useAuth();
  const [priceHistory, setPriceHistory] = useState<
    Array<{ snapshot_date: string; holdings_value: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<
    'YTD' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL'
  >('3M');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [showTransactionWizard, setShowTransactionWizard] = useState(false);

  // Fetch transactions for the holding's account
  const {
    transactions,
    loading: transactionsLoading,
    deleteTransaction,
  } = useTransactions(holding?.account_id);

  const loadPriceData = useCallback(async () => {
    if (!user || !holding) return;

    console.log('[HoldingDetailModal] Loading price history...');
    setSyncMessage('Loading price history...');

    try {
      setLoading(true);

      // Calculate number of data points for each time range
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const ytdDays = Math.ceil(
        (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
      );

      const dataPointsMap = {
        '1W': 7, // 7 data points total
        '1M': 30, // 30 data points total
        '3M': 90, // 90 data points total
        YTD: ytdDays, // YTD days total
        '1Y': 365, // 365 data points total
        '5Y': 1825, // 1825 data points total
        ALL: 3650, // 3650 data points total
      };

      const dataPoints = dataPointsMap[timeRange];

      let data;
      if (timeRange === 'YTD') {
        data = await SymbolPriceHistoryService.getYTDPriceHistory(
          holding.symbol
        );
      } else {
        data = await SymbolPriceHistoryService.getSymbolPriceHistory(
          holding.symbol,
          dataPoints
        );
      }

      // Transform to chart format
      const chartData = data.map(point => ({
        snapshot_date: point.price_date,
        holdings_value: Number(point.close_price),
      }));

      // Add today's data point with current price
      // The historical data only goes up to yesterday, so we add a final point for today
      const today = new Date().toISOString().split('T')[0];
      const lastPoint = chartData[chartData.length - 1];
      const lastPointDate = lastPoint ? lastPoint.snapshot_date.split('T')[0] : null;

      console.log('[HoldingDetailModal] Chart data before adding today:', {
        timeRange,
        dataPointsFromDB: data.length,
        lastPointDate,
        today,
        willAddToday: lastPointDate !== today,
      });

      if (lastPointDate !== today && holding.current_price) {
        // Add a new point for today with current price
        chartData.push({
          snapshot_date: new Date().toISOString(),
          holdings_value: Number(holding.current_price),
        });
      } else if (lastPointDate === today && holding.current_price) {
        // Replace today's point with current price (if the last point is already today)
        chartData[chartData.length - 1] = {
          snapshot_date: new Date().toISOString(),
          holdings_value: Number(holding.current_price),
        };
      }

      console.log('[HoldingDetailModal] Final chart data points:', chartData.length);

      setPriceHistory(chartData);
      setSyncMessage('Price history loaded successfully');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err) {
      console.error('[HoldingDetailModal] Error loading price history:', err);
      setSyncMessage('Error loading price history');
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  }, [user, holding, timeRange]);

  // Reset auto-load flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasAutoLoaded(false);
    }
  }, [isOpen]);

  // Load data when modal opens or holding changes
  useEffect(() => {
    if (isOpen && holding && !hasAutoLoaded) {
      setHasAutoLoaded(true);
      loadPriceData();
    }
  }, [isOpen, holding, hasAutoLoaded, loadPriceData]);

  // Reload when time range changes (but only if we've already loaded once)
  useEffect(() => {
    if (holding && hasAutoLoaded && timeRange) {
      loadPriceData();
    }
  }, [timeRange, holding, hasAutoLoaded, loadPriceData]);

  const handleRefreshPrices = async () => {
    if (!user || !holding) return;

    console.log('[HoldingDetailModal] Manual refresh triggered...');
    setSyncMessage('Refreshing price data...');
    setHasAutoLoaded(false); // Force reload
    await loadPriceData();
  };

  if (!holding) return null;

  // Calculate metrics
  const quantity = Number(holding.quantity);
  const costBasis = Number(holding.cost_basis);
  const currentValue = Number(holding.current_value);
  const currentPrice = Number(holding.current_price);
  const avgCost = quantity > 0 ? costBasis / quantity : 0;
  const totalGainLoss = currentValue - costBasis;
  const totalGainLossPercent =
    costBasis > 0 ? (totalGainLoss / costBasis) * 100 : 0;

  // Calculate period stats and price change
  const periodHigh =
    priceHistory.length > 0
      ? Math.max(...priceHistory.map(p => p.holdings_value))
      : 0;
  const periodLow =
    priceHistory.length > 0
      ? Math.min(...priceHistory.map(p => p.holdings_value))
      : 0;

  // Calculate price change over selected period
  const periodStartPrice = priceHistory.length > 0 ? priceHistory[0].holdings_value : currentPrice;
  const priceChange = currentPrice - periodStartPrice;
  const priceChangePercent = periodStartPrice > 0 ? (priceChange / periodStartPrice) * 100 : 0;

  // Filter transactions for this specific holding symbol
  const holdingTransactions = transactions.filter(t => {
    const ticker = t.transaction_metadata?.ticker;
    return ticker && ticker.toUpperCase() === holding.symbol.toUpperCase();
  });

  const handleEditTransaction = (transaction: Transaction) => {
    // TODO: Implement edit transaction
    console.log('Edit transaction:', transaction);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    await deleteTransaction(transactionId);
  };

  if (!isOpen || !holding) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="min-h-screen pb-20">
        {/* ===== HEADER BAR ===== */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back button and holding info */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="hover:bg-gray-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {holding.symbol}
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {holding.asset_type}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {/* TODO: Add settings */}}
                  title="Holding settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT AREA ===== */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* Sync Message */}
            {syncMessage && (
              <Card
                className={`p-4 ${
                  syncMessage.includes('Failed') ||
                  syncMessage.includes('error') ||
                  syncMessage.includes('Error')
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncMessage.includes('Failed') ||
                  syncMessage.includes('error') ||
                  syncMessage.includes('Error') ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  <p
                    className={`text-sm ${
                      syncMessage.includes('Failed') ||
                      syncMessage.includes('error') ||
                      syncMessage.includes('Error')
                        ? 'text-red-700'
                        : 'text-green-700'
                    }`}
                  >
                    {syncMessage}
                  </p>
                </div>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-200">
                <TabsTrigger
                  value="performance"
                  className="data-[state=active]:bg-white"
                >
                  Performance
                </TabsTrigger>
                <TabsTrigger
                  value="transactions"
                  className="data-[state=active]:bg-white"
                >
                  Transactions ({holdingTransactions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-4 mt-4">
                {/* Price Chart */}
                <Card className="p-6 bg-white border-gray-200 shadow-md">
                  {/* Header with Stock Price */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-medium text-gray-600">
                          {holding.symbol} Price
                        </p>
                      </div>
                      <p className="text-xs font-medium text-gray-600">
                        Price Change ({timeRange})
                      </p>
                    </div>
                    <div className="flex items-start justify-between">
                      <p className="text-4xl font-bold text-gray-900">
                        {formatCurrency(currentPrice)}
                      </p>
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`flex items-center gap-1 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {priceChange >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="text-lg font-semibold">
                            {priceChange >= 0 ? '+' : ''}
                            {formatCurrency(priceChange)}
                          </span>
                        </div>
                        <span
                          className={`text-sm ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          ({priceChange >= 0 ? '+' : ''}
                          {priceChangePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Time Range Selector */}
                  <div className="flex gap-1.5 mb-4">
                    {(['YTD', '1W', '1M', '3M', '1Y', '5Y', 'ALL'] as const).map(range => (
                      <Button
                        key={range}
                        size="sm"
                        variant={timeRange === range ? 'default' : 'outline'}
                        onClick={() => setTimeRange(range)}
                        className={
                          timeRange === range
                            ? 'text-xs px-2 py-1.5 h-auto flex-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                            : 'text-xs px-2 py-1.5 h-auto flex-1 border-gray-300 text-gray-700 hover:bg-gray-50'
                        }
                      >
                        {range}
                      </Button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                  ) : priceHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        No price history available
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Click refresh to load price data
                      </p>
                      <Button
                        size="sm"
                        onClick={handleRefreshPrices}
                        variant="outline"
                        className="shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh Price Data
                      </Button>
                    </div>
                  ) : (
                    <LiveStockChart
                      data={priceHistory}
                      timeRange={timeRange}
                      onTimeRangeChange={setTimeRange}
                      loading={loading}
                      averageCost={avgCost}
                    />
                  )}
                </Card>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                ) : priceHistory.length === 0 ? (
                  <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        No price history available
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Price data for this symbol is not yet available
                      </p>
                      <Button
                        size="sm"
                        onClick={handleRefreshPrices}
                        variant="outline"
                        className="shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh Price Data
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Summary Card */}
                    {currentValue > 0 && (
                      <Card className="p-5 bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-md">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              Total Value
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(currentValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              Total Gain/Loss
                            </p>
                            <div className="flex items-center gap-2">
                              {totalGainLoss >= 0 ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                              )}
                              <p
                                className={`text-2xl font-bold ${
                                  totalGainLoss >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {totalGainLoss >= 0 ? '+' : ''}
                                {formatCurrency(totalGainLoss)}
                              </p>
                            </div>
                            <p
                              className={`text-xs mt-1 font-medium ${
                                totalGainLoss >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {totalGainLossPercent >= 0 ? '+' : ''}
                              {totalGainLossPercent.toFixed(2)}%
                            </p>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              Performance
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                                <p className="text-xs font-medium text-green-700">
                                  High: {formatCurrency(periodHigh)}
                                </p>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                <p className="text-xs font-medium text-red-700">
                                  Low: {formatCurrency(periodLow)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Holding Detail Card */}
                    <div className="space-y-3">
                      <Card className="p-4 bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-base font-bold text-gray-900">
                                {holding.symbol}
                              </p>
                              <span className="text-xs px-2 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full text-blue-700 font-medium">
                                {holding.asset_type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">
                              {holding.symbol} - {holding.asset_type}
                            </p>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="p-2 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 mb-1">Quantity</p>
                                <p className="font-semibold text-gray-900">
                                  {Number(quantity).toFixed(4)}
                                </p>
                              </div>
                              <div className="p-2 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 mb-1">Price</p>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(currentPrice)}
                                </p>
                              </div>
                              <div className="p-2 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 mb-1">Cost Basis</p>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(costBasis)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-lg font-bold text-gray-900 mb-1">
                              {formatCurrency(currentValue)}
                            </p>
                            <div
                              className={`flex items-center gap-1 justify-end px-3 py-1 rounded-full ${
                                totalGainLoss >= 0
                                  ? 'bg-green-100'
                                  : 'bg-red-100'
                              }`}
                            >
                              {totalGainLoss >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              <p
                                className={`text-xs font-bold ${
                                  totalGainLoss >= 0
                                    ? 'text-green-700'
                                    : 'text-red-700'
                                }`}
                              >
                                {totalGainLoss >= 0 ? '+' : ''}
                                {formatCurrency(totalGainLoss)}
                              </p>
                            </div>
                            <p
                              className={`text-xs mt-1 font-medium ${
                                totalGainLoss >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {totalGainLossPercent >= 0 ? '+' : ''}
                              {totalGainLossPercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="transactions" className="space-y-3 mt-4">
                {/* Add Transaction Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowTransactionWizard(true)}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Transaction
                  </Button>
                </div>

                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                ) : holdingTransactions.length === 0 ? (
                  <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-violet-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        No transactions for this holding
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Add a transaction to get started
                      </p>
                      <Button
                        size="sm"
                        onClick={() => onAddTransaction?.(holding.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Transaction
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {holdingTransactions.map(transaction => (
                      <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        onEdit={handleEditTransaction}
                        onDelete={handleDeleteTransaction}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
        </div>
      </div>

      {/* Transaction Wizard */}
      {showTransactionWizard && holding.account_id && (
        <AddTransactionWizard
          accountId={holding.account_id}
          isOpen={showTransactionWizard}
          onClose={() => setShowTransactionWizard(false)}
          prefilledSymbol={holding.symbol}
        />
      )}
    </div>
  );
}
