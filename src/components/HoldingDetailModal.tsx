/**
 * Holding Detail Modal - Full-screen modal for individual holdings
 * Matches AccountDetailsModal styling exactly
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Search,
  Filter,
  Edit,
  Trash2,
  Info,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SymbolPriceHistoryService } from '@/services/symbolPriceHistoryService';
import { HistoricalPriceService } from '@/services/historicalPriceService';
import { TickerDirectoryService } from '@/services/tickerDirectoryService';
import { getStockInfo, getStockLogoUrl } from '@/lib/stockInfo';
import { LiveStockChart } from './LiveStockChart';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionCard } from './TransactionCard';
import { Transaction, TransactionInsert, TRANSACTION_TYPES } from '@/types/transaction';
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

interface Account {
  id: string;
  name: string;
  account_type: string;
  category: string;
  icon: string;
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
  // Early return BEFORE any hooks to maintain consistent hook order
  if (!holding) return null;

  const { user } = useAuth();
  const [priceHistory, setPriceHistory] = useState<
    Array<{ snapshot_date: string; holdings_value: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<
    'YTD' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL'
  >('3M');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncMessageFadingOut, setSyncMessageFadingOut] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [showTransactionWizard, setShowTransactionWizard] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Transaction filtering state
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [showTransactionFilterPopup, setShowTransactionFilterPopup] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [transactionDateRange, setTransactionDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('all');
  const [transactionSortBy, setTransactionSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');

  // Data completeness tracking
  const [dataCompleteness, setDataCompleteness] = useState<{
    available: number;
    expected: number;
    percentage: number;
  } | null>(null);

  // Price sync state
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');

  // Company info state
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string>('');

  // Fetch transactions for the holding's account
  const {
    transactions,
    loading: transactionsLoading,
    deleteTransaction,
    refetch: refetchTransactions,
  } = useTransactions(holding?.account_id);

  // Helper function to show sync messages with smooth fade-out
  const showSyncMessage = (message: string, duration: number = 3000) => {
    setSyncMessageFadingOut(false);
    setSyncMessage(message);

    // Start fade-out animation before removing
    setTimeout(() => {
      setSyncMessageFadingOut(true);
    }, duration - 700); // Start fade 700ms before removal (matching animation duration)

    // Remove message after fade completes
    setTimeout(() => {
      setSyncMessage(null);
      setSyncMessageFadingOut(false);
    }, duration);
  };

  // Fetch accounts for transaction wizard
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, account_type, category, icon')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('[HoldingDetailModal] Error fetching accounts:', error);
        return;
      }

      setAccounts(data || []);
    };

    fetchAccounts();
  }, [user]);

  // Fetch company name and logo
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!holding) return;

      console.log(`[HoldingDetailModal] 🔍 Fetching company info for ${holding.symbol}`);

      // Strategy 1: Check local stock info mapping (instant, no API calls)
      const stockInfo = getStockInfo(holding.symbol);
      if (stockInfo) {
        setCompanyName(stockInfo.name);
        console.log(`[HoldingDetailModal] ✅ Found in local mapping: ${stockInfo.name}`);
      }

      // Strategy 2: Try ticker directory (database lookup)
      if (!stockInfo) {
        try {
          const tickerResult = await TickerDirectoryService.searchTickers(holding.symbol, 1);

          if (tickerResult.length > 0 && tickerResult[0].symbol === holding.symbol.toUpperCase()) {
            setCompanyName(tickerResult[0].name);
            console.log(`[HoldingDetailModal] ✅ Found in ticker directory: ${tickerResult[0].name}`);
          } else {
            console.log(`[HoldingDetailModal] ℹ️ Not found in ticker directory`);
          }
        } catch (error) {
          console.warn(`[HoldingDetailModal] ⚠️ Ticker directory error:`, error);
        }
      }

      // Always set logo using IEX Cloud (reliable, free, no API key needed)
      const logoUrl = getStockLogoUrl(holding.symbol);
      setCompanyLogo(logoUrl);
      console.log(`[HoldingDetailModal] 🎨 Using logo URL: ${logoUrl}`);
    };

    if (isOpen && holding) {
      // Reset state when opening new holding
      setCompanyName('');
      setCompanyLogo('');
      fetchCompanyInfo();
    }
  }, [isOpen, holding]);

  const loadPriceData = useCallback(async () => {
    if (!user || !holding) return;

    console.log('[HoldingDetailModal] Loading price history...');
    showSyncMessage('Loading price history...', 30000); // Show during loading

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

      // Calculate data completeness
      // If we added today's data point (or replaced it), count it as available
      const todayIsAvailable = (lastPointDate === today || holding.current_price) ? 1 : 0;
      const availablePoints = data.length + todayIsAvailable; // Historical data + today (if available)
      const expectedPoints = dataPoints;
      const percentage = Math.min(100, Math.round((availablePoints / expectedPoints) * 100));

      setDataCompleteness({
        available: availablePoints,
        expected: expectedPoints,
        percentage,
      });

      console.log('[HoldingDetailModal] Data completeness:', {
        available: availablePoints,
        expected: expectedPoints,
        todayIsAvailable,
        percentage: `${percentage}%`,
      });

      setPriceHistory(chartData);
      showSyncMessage('Price history loaded successfully', 3000);
    } catch (err) {
      console.error('[HoldingDetailModal] Error loading price history:', err);
      showSyncMessage('Error loading price history', 5000);
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
    showSyncMessage('Refreshing price data...', 30000); // Show during refresh
    setHasAutoLoaded(false); // Force reload
    await loadPriceData();
  };

  /**
   * Sync historical prices for this specific symbol
   * Fetches missing historical data from Alpha Vantage
   */
  const handleSyncPrices = async () => {
    if (!user || !holding) return;

    setSyncingPrices(true);
    setSyncProgress('Fetching historical prices...');

    console.log(`[HoldingDetailModal] 🎯 Syncing prices for ${holding.symbol}`);

    try {
      // Use backfillHistoricalPrices to fetch data for just this symbol
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 365); // 1 year back
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = new Date().toISOString().split('T')[0];

      const result = await HistoricalPriceService.backfillHistoricalPrices(
        [holding.symbol],
        startDateStr,
        endDateStr
      );

      if (result.success && result.pricesAdded > 0) {
        console.log(`[HoldingDetailModal] ✅ Added ${result.pricesAdded} prices for ${holding.symbol}`);
        setSyncProgress(`Added ${result.pricesAdded} historical prices`);

        // Reload the chart data
        setHasAutoLoaded(false);
        await loadPriceData();

        setTimeout(() => {
          setSyncProgress('');
          showSyncMessage('Historical data updated successfully!', 3000);
        }, 1000);
      } else if (result.success && result.pricesAdded === 0) {
        setSyncProgress('Data already up to date');
        setTimeout(() => {
          setSyncProgress('');
          showSyncMessage('Historical data is complete', 3000);
        }, 1000);
      } else {
        const errorMsg = result.errors.join(', ');
        console.error(`[HoldingDetailModal] ❌ Sync failed:`, errorMsg);
        setSyncProgress('');
        showSyncMessage(`Sync failed: ${errorMsg}`, 5000);
      }
    } catch (err) {
      console.error('[HoldingDetailModal] ❌ Sync error:', err);
      setSyncProgress('');
      showSyncMessage('Error syncing prices. Check console for details.', 5000);
    } finally {
      setSyncingPrices(false);
    }
  };

  // Selection mode handlers
  const toggleSelection = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0) return;

    const confirmMessage = `Delete ${selectedTransactions.size} transaction${selectedTransactions.size > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMessage)) return;

    console.log('[HoldingDetailModal] Deleting selected transactions:', selectedTransactions);

    // Delete all selected transactions
    for (const transactionId of selectedTransactions) {
      await deleteTransaction(transactionId);
    }

    // Exit edit mode and clear selection
    setIsEditMode(false);
    setSelectedTransactions(new Set());
    refetchTransactions();
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setSelectedTransactions(new Set());
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionWizard(true);
  };

  const handleDeleteSingleTransaction = async (transactionId: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    await deleteTransaction(transactionId);
  };

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

  // Check if transaction filters are active
  const hasActiveTransactionFilters =
    transactionTypeFilter !== 'all' ||
    transactionDateRange !== 'all' ||
    transactionSortBy !== 'date-desc';

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...holdingTransactions];

    // Search filter
    if (transactionSearchQuery) {
      filtered = filtered.filter(t => {
        const description = t.description?.toLowerCase() || '';
        const ticker = t.transaction_metadata?.ticker?.toLowerCase() || '';
        const query = transactionSearchQuery.toLowerCase();
        return description.includes(query) || ticker.includes(query);
      });
    }

    // Type filter
    if (transactionTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === transactionTypeFilter);
    }

    // Date range filter
    if (transactionDateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (transactionDateRange) {
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= cutoffDate;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (transactionSortBy) {
        case 'date-desc':
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        case 'date-asc':
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        case 'amount-desc':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount-asc':
          return Math.abs(a.amount) - Math.abs(b.amount);
        default:
          return 0;
      }
    });

    return filtered;
  }, [holdingTransactions, transactionSearchQuery, transactionTypeFilter, transactionDateRange, transactionSortBy]);

  const handleAddTransaction = async (
    transactionData: Partial<TransactionInsert>
  ) => {
    if (!user || !holding.account_id) {
      return { error: 'Missing user or account information' };
    }

    try {
      const { error } = await supabase.from('transactions').insert({
        ...transactionData,
        user_id: user.id,
        account_id: holding.account_id,
      });

      if (error) {
        console.error('[HoldingDetailModal] Error adding transaction:', error);
        return { error: error.message };
      }

      // Refetch transactions to show the new one
      await refetchTransactions();
      setShowTransactionWizard(false);
      return {};
    } catch (err) {
      console.error('[HoldingDetailModal] Exception adding transaction:', err);
      return { error: 'Failed to add transaction' };
    }
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
                  {/* Company Logo or Default Icon */}
                  {companyLogo ? (
                    <div className="w-12 h-12 rounded-xl shadow-lg bg-white flex items-center justify-center overflow-hidden">
                      <img
                        src={companyLogo}
                        alt={`${holding.symbol} logo`}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          // Fallback to default icon if logo fails to load
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="p-3 rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {holding.symbol}
                      {companyName && (
                        <span className="text-sm font-normal text-gray-500">
                          • {companyName}
                        </span>
                      )}
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {holding.asset_type}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Info/Edit/Delete/Cancel buttons (only on transactions tab) */}
              {activeTab === 'transactions' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowInfoPopup(true)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                    title="Help"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  {!isEditMode ? (
                    <Button onClick={() => setIsEditMode(true)} size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleDeleteSelected}
                        size="sm"
                        disabled={selectedTransactions.size === 0}
                        className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedTransactions.size})
                      </Button>
                      <Button onClick={handleCancelEditMode} size="sm" variant="outline">
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT AREA ===== */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* Sync Message */}
            {syncMessage && (
              <div
                className={`transition-all duration-700 ease-in-out overflow-hidden ${
                  syncMessageFadingOut ? 'max-h-0 opacity-0 mb-0' : 'max-h-32 opacity-100 mb-4'
                }`}
              >
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
            </div>
            )}

            {/* Tabs */}
            <Tabs
              defaultValue="performance"
              className="w-full"
              onValueChange={(value) => {
                setActiveTab(value as 'overview' | 'transactions');
                // Exit edit mode when switching away from transactions tab
                if (value !== 'transactions' && isEditMode) {
                  setIsEditMode(false);
                  setSelectedTransactions(new Set());
                }
              }}
            >
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
                <div>
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

                  {/* Data Completeness Indicator */}
                  {dataCompleteness && dataCompleteness.percentage < 100 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-medium text-amber-900">
                            Historical Data: {dataCompleteness.percentage}% Complete
                          </span>
                        </div>
                        <Button
                          onClick={handleSyncPrices}
                          disabled={syncingPrices}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-amber-400 text-amber-700 hover:bg-amber-100"
                          title="Fetch missing historical price data"
                        >
                          <Database
                            className={`h-3 w-3 mr-1 ${syncingPrices ? 'animate-pulse' : ''}`}
                          />
                          {syncingPrices ? 'Syncing...' : 'Sync Prices'}
                        </Button>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden mb-2">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${dataCompleteness.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-amber-700">
                          Missing {dataCompleteness.expected - dataCompleteness.available} days of price data
                        </p>
                        <span className="text-xs text-amber-600 font-medium">
                          {dataCompleteness.available} / {dataCompleteness.expected} days
                        </span>
                      </div>
                      {syncProgress && (
                        <p className="text-xs text-amber-800 font-medium mt-2 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          {syncProgress}
                        </p>
                      )}
                    </div>
                  )}

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
                </div>

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
                <Button
                  onClick={() => setShowTransactionWizard(true)}
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Transaction
                </Button>

                {/* Search and filter toolbar */}
                <div className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Search input */}
                    <div className="relative flex-1 max-w-2xl">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search transactions..."
                        value={transactionSearchQuery}
                        onChange={e => setTransactionSearchQuery(e.target.value)}
                        className="pl-10 pr-10 h-11 text-base"
                      />
                      {transactionSearchQuery && (
                        <button
                          onClick={() => setTransactionSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    {/* Filter button with active indicator */}
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowTransactionFilterPopup(!showTransactionFilterPopup)}
                      className="relative"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {hasActiveTransactionFilters && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full" />
                      )}
                    </Button>
                  </div>
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
                ) : filteredTransactions.length === 0 ? (
                  <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        No transactions match your filters
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Try adjusting your search or filters
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTransactionSearchQuery('');
                          setTransactionTypeFilter('all');
                          setTransactionDateRange('all');
                          setTransactionSortBy('date-desc');
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map(transaction => (
                      <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        isEditMode={isEditMode}
                        isSelected={selectedTransactions.has(transaction.id)}
                        onToggleSelection={() => toggleSelection(transaction.id)}
                        onEdit={handleEditTransaction}
                        onDelete={handleDeleteSingleTransaction}
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
          onClose={() => {
            setShowTransactionWizard(false);
            setEditingTransaction(null);
          }}
          onSubmit={handleAddTransaction}
          defaultAccountId={holding.account_id}
          accounts={accounts}
          prefilledSymbol={holding.symbol}
          editingTransaction={editingTransaction || undefined}
        />
      )}

      {/* Info Popup */}
      {showInfoPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">How to Use</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 rounded-lg bg-blue-50">
                    <Edit className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Edit Transaction</p>
                    <p className="text-sm text-gray-600">Swipe card left to reveal edit button</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 rounded-lg bg-red-50">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Delete Transaction</p>
                    <p className="text-sm text-gray-600">Swipe card right to reveal delete button</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 rounded-lg bg-gray-100">
                    <Edit className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Bulk Delete</p>
                    <p className="text-sm text-gray-600">Click "Edit" in header to select multiple transactions</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Transaction Filter Popup Modal */}
      {showTransactionFilterPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTransactionFilterPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal content */}
            <div className="p-6 space-y-4">
              {/* Transaction type filter */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Transaction Type
                </label>
                <select
                  value={transactionTypeFilter}
                  onChange={e => setTransactionTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="all">All Types</option>
                  {TRANSACTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range filter */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Date Range
                </label>
                <div className="space-y-2">
                  {[
                    { value: '7d', label: 'Last 7 days' },
                    { value: '30d', label: 'Last 30 days' },
                    { value: '90d', label: 'Last 90 days' },
                    { value: '1y', label: 'Last year' },
                    { value: 'all', label: 'All time' },
                  ].map(option => (
                    <Card
                      key={option.value}
                      onClick={() =>
                        setTransactionDateRange(
                          option.value as '7d' | '30d' | '90d' | '1y' | 'all'
                        )
                      }
                      className={`p-3 cursor-pointer transition-all border-2 ${
                        transactionDateRange === option.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                        {transactionDateRange === option.value && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Sort by filter */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Sort By
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: 'date-desc',
                      label: 'Date (Newest First)',
                      icon: TrendingDown,
                    },
                    {
                      value: 'date-asc',
                      label: 'Date (Oldest First)',
                      icon: TrendingUp,
                    },
                    {
                      value: 'amount-desc',
                      label: 'Amount (High to Low)',
                      icon: TrendingDown,
                    },
                    {
                      value: 'amount-asc',
                      label: 'Amount (Low to High)',
                      icon: TrendingUp,
                    },
                  ].map(option => {
                    const IconComponent = option.icon;
                    return (
                      <Card
                        key={option.value}
                        onClick={() =>
                          setTransactionSortBy(
                            option.value as
                              | 'date-desc'
                              | 'date-asc'
                              | 'amount-desc'
                              | 'amount-asc'
                          )
                        }
                        className={`p-3 cursor-pointer transition-all border-2 ${
                          transactionSortBy === option.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">
                              {option.label}
                            </span>
                          </div>
                          {transactionSortBy === option.value && (
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setTransactionTypeFilter('all');
                  setTransactionDateRange('all');
                  setTransactionSortBy('date-desc');
                }}
              >
                Reset All
              </Button>
              <Button
                onClick={() => setShowTransactionFilterPopup(false)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Apply
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
