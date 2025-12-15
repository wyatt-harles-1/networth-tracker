/**
 * ============================================================================
 * AccountDetailsPage Component
 * ============================================================================
 *
 * Full-page detailed view for individual investment accounts.
 *
 * Features:
 * - Real-time account metrics (market value, gains, dividends)
 * - Period-specific performance tracking (1D to ALL time)
 * - Holdings management with sortable views
 * - Transaction filtering, searching, and sorting
 * - Historical price syncing via Alpha Vantage API
 * - Multi-step transaction wizard
 * - Import statement functionality (coming soon)
 *
 * Architecture:
 * - Tabs for Holdings and Transactions views
 * - Collapsible metrics card with period-specific calculations
 * - Modal popups for filters and wizards
 * - Auto-sync on first load to recalculate holdings from transactions
 * - Daily price updates (free tier) in background
 *
 * ============================================================================
 */

// ============================================================================
// IMPORTS
// ============================================================================

// React core
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

// Icon library
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  Plus,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Wallet,
  PieChart,
  PiggyBank,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Database,
  Upload,
  FileText,
  Search,
  Filter,
  X,
  Target,
  BarChart3,
  Calendar,
  Percent,
  Repeat,
  Shield,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';

// UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Custom hooks
import { useHoldings } from '@/hooks/useHoldings';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';

// Utilities
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Services
import { HoldingsRecalculationService } from '@/services/holdingsRecalculationService';
import {
  AccountMetricsService,
  AccountMetrics,
  AccountBalanceHistoryPoint,
} from '@/services/accountMetricsService';
import { HistoricalPriceService } from '@/services/historicalPriceService';

// Feature components
import { TransactionFormNew } from './TransactionForm';
import { TransactionCard } from './TransactionCard';
import { HoldingCard } from './HoldingCard';
import { HoldingDetailModal } from './HoldingDetailModal';
import {
  Transaction,
  TransactionInsert,
  TRANSACTION_TYPES,
} from '@/types/transaction';
import { PerformanceChartContainer } from './PerformanceChartContainer';
import { AddTransactionWizard } from './AddTransactionWizard';
import { AccountSettingsModal } from './AccountSettingsModal';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Account {
  id: string;
  name: string;
  account_type: string;
  category: string;
  current_balance: number;
  icon: string;
  is_visible: boolean;
  asset_class_id?: string | null;
  institution: string | null;
  account_number_last4: string | null;
  created_at: string;
}

interface AccountDetailsPageProps {
  account: Account;
  onBack: () => void;
  onSaveSettings?: (
    accountId: string,
    updates: Partial<Account>
  ) => Promise<void>;
  onDelete?: (accountId: string) => void;
  onToggleVisibility?: (accountId: string, isVisible: boolean) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AccountDetailsPage({
  account,
  onBack,
  onSaveSettings,
  onDelete,
}: AccountDetailsPageProps) {
  // ============================================================================
  // HOOKS & DATA FETCHING
  // ============================================================================

  const { user } = useAuth();
  const { accounts } = useAccounts();

  // Fetch holdings for this account
  const {
    holdings,
    loading: holdingsLoading,
    refetch: refetchHoldings,
  } = useHoldings(account.id);

  // Fetch transactions for this account
  const {
    transactions,
    loading: transactionsLoading,
    refetch: refetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(account.id);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // --- Account Metrics State ---
  const [metrics, setMetrics] = useState<AccountMetrics | null>(null);
  const [historyData, setHistoryData] = useState<AccountBalanceHistoryPoint[]>(
    []
  );
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingHistoryData, setLoadingHistoryData] = useState(false);
  const [historyDataLoaded, setHistoryDataLoaded] = useState(false);

  // --- Time Range & Chart State ---
  const [timeRange, setTimeRange] = useState<
    'YTD' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL'
  >('3M');

  // --- Transaction UI State ---
  const [showTransactionWizard, setShowTransactionWizard] = useState(false);
  const [showImportStatement, setShowImportStatement] = useState(false);
  const [showTransactionFilterPopup, setShowTransactionFilterPopup] =
    useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    Transaction | undefined
  >(undefined);
  const [showSettings, setShowSettings] = useState(false);

  // --- Holding UI State ---
  const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

  // --- Transaction Filtering State ---
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<string>('all');
  const [transactionDateRange, setTransactionDateRange] = useState<
    '7d' | '30d' | '90d' | '1y' | 'all'
  >('all');
  const [transactionSortBy, setTransactionSortBy] = useState<
    'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  >('date-desc');

  // --- Holdings State ---
  const [sortBy, setSortBy] = useState<
    'alphabetical' | 'value-high' | 'value-low' | 'value-gain-high' | 'value-gain-low' | 'percent-gain-high' | 'percent-gain-low'
  >('value-high');
  const [holdingsDisplayMode, setHoldingsDisplayMode] = useState<
    'value' | 'price'
  >('value');

  // --- Sync & Loading State ---
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const hasAutoSynced = useRef(false);
  const hasAutoFetchedPrices = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const lastTransactionCount = useRef<number>(0);
  const lastSyncTimestamp = useRef<number>(0);

  // ============================================================================
  // DATA LOADING LOGIC
  // ============================================================================

  /**
   * Main data loading function - runs on component mount and when account/timeRange changes
   *
   * Steps:
   * 1. Auto-sync holdings from transactions (first load only)
   * 2. Fetch daily price updates in background (free tier optimization)
   * 3. Load account metrics (market value, gains, etc.)
   * 4. Load historical balance data for chart
   */
  const loadAccountData = useCallback(async () => {
    if (!user || !account) return;

    setLoadingMetrics(true);
    setLoadingProgress(0);

    // --- Step 1: Auto-sync holdings (with caching optimization) ---
    // Only recalculate if transaction count changed since last sync OR if cache is stale (>5 minutes)
    setLoadingStage('Checking for updates...');
    setLoadingProgress(10);

    const nowTimestamp = Date.now();
    const cacheAgeMinutes = (nowTimestamp - lastSyncTimestamp.current) / (1000 * 60);
    const cacheIsStale = cacheAgeMinutes > 5; // Cache expires after 5 minutes

    const { count: currentTransactionCount, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', account.id)
      .eq('user_id', user.id);

    if (countError) {
      console.error('[AccountDetailsPage] Error fetching transaction count:', countError);
    }

    console.log(`[AccountDetailsPage] Transaction count: ${currentTransactionCount}`);

    const transactionCountChanged = currentTransactionCount !== lastTransactionCount.current;
    const shouldSync = !hasAutoSynced.current || transactionCountChanged || cacheIsStale;

    if (shouldSync) {
      hasAutoSynced.current = true;
      lastTransactionCount.current = currentTransactionCount || 0;
      lastSyncTimestamp.current = nowTimestamp;

      console.log('[AccountDetailsPage] Cache miss - syncing holdings...');
      if (transactionCountChanged) {
        console.log(`[AccountDetailsPage] Transaction count changed: ${lastTransactionCount.current} → ${currentTransactionCount}`);
      }
      if (cacheIsStale) {
        console.log(`[AccountDetailsPage] Cache is stale (${cacheAgeMinutes.toFixed(1)} minutes old)`);
      }

      if (currentTransactionCount && currentTransactionCount > 0) {
        console.log(
          '[AccountDetailsPage] Auto-syncing holdings from transactions...'
        );
        setLoadingStage('Calculating holdings...');
        setLoadingProgress(20);
        setSyncMessage('Calculating holdings from transactions...');

        const syncResult =
          await HoldingsRecalculationService.recalculateAndSync(
            user.id,
            account.id
          );

        if (syncResult.success) {
          console.log(
            '[AccountDetailsPage] Auto-sync successful:',
            syncResult.message
          );
          setSyncMessage(syncResult.message || 'Holdings synced successfully');
          setTimeout(() => setSyncMessage(null), 3000);
        } else {
          console.error(
            '[AccountDetailsPage] Auto-sync failed:',
            syncResult.error
          );
          setSyncMessage(null);
        }
      } else {
        console.log(
          '[AccountDetailsPage] No transactions found, skipping auto-sync'
        );
      }
    } else {
      console.log(`[AccountDetailsPage] ✅ Using cached holdings (cache age: ${cacheAgeMinutes.toFixed(1)} minutes)`);
    }

    // Refresh holdings and transactions after potential auto-sync
    setLoadingStage('Loading holdings...');
    setLoadingProgress(40);
    await refetchHoldings();
    setLoadingProgress(50);
    await refetchTransactions();

    // --- Step 2: Automated Daily Price Updates (Free Tier Optimization) ---
    // This checks if today's prices are missing and fetches them automatically
    // Only runs once per day per symbol to stay within 25 requests/day limit
    if (!hasAutoFetchedPrices.current && transactions.length > 0) {
      hasAutoFetchedPrices.current = true;

      console.log("[AccountDetailsPage] 🔄 Checking for today's prices...");

      // Run in background (don't block the UI)
      setTimeout(async () => {
        try {
          // Use smartSync with onlyRecent=true to fetch last 7 days only
          // This will only use 1 API call per symbol if data is missing
          const dailyUpdate = await HistoricalPriceService.smartSync(
            user.id,
            account.id,
            10, // Can fetch more symbols for daily updates (only 7 days of data)
            true, // onlyRecent=true: fetch only last 7 days
            progress => {
              console.log(`[AccountDetailsPage] Daily update:`, progress);
            }
          );

          if (dailyUpdate.totalPricesAdded > 0) {
            console.log(
              `[AccountDetailsPage] 📈 Daily update complete: ${dailyUpdate.totalPricesAdded} recent prices added`
            );
            // Silently refresh metrics without triggering a full reload
            const metricsResult = await AccountMetricsService.getAccountMetrics(user.id, account.id);
            if (metricsResult.data) {
              setMetrics(metricsResult.data);
            }
          } else {
            console.log('[AccountDetailsPage] ✅ All prices are up to date');
          }
        } catch (err) {
          console.error('[AccountDetailsPage] Daily update error:', err);
          // Fail silently - don't disrupt user experience
        }
      }, 2000); // Wait 2 seconds before starting background update
    }

    /**
     * Historical price sync - DISABLED for manual control via "Sync Prices" button
     * After upgrading to Alpha Vantage Premium, you can enable this for automatic backfilling
     *
     * Uncomment the code below after upgrading to Premium ($49.99/month for unlimited daily calls)
     */
    /*
    if (!hasAutoFetchedPrices && transactions.length > 0) {
      setHasAutoFetchedPrices(true);
      setFetchingPrices(true);
      setSyncMessage('Checking historical price data...');

      console.log('[AccountDetailsPage] Starting automatic historical price fetch...');

      try {
        const fetchResult = await HistoricalPriceService.autoFetchForAccount(
          user.id,
          account.id,
          365, // Look back 1 year
          (progress) => {
            console.log(`[AccountDetailsPage] Price fetch progress:`, progress);
            if (progress.status === 'fetching') {
              setSyncMessage(`Fetching prices for ${progress.symbol}...`);
            }
          }
        );

        if (fetchResult.success && fetchResult.totalPricesAdded > 0) {
          console.log(
            `[AccountDetailsPage] Auto-fetch completed: ${fetchResult.totalPricesAdded} prices added`
          );
          setSyncMessage(
            `Added ${fetchResult.totalPricesAdded} historical prices for ${fetchResult.symbolsProcessed} symbols`
          );
          setTimeout(() => setSyncMessage(null), 5000);
        } else if (fetchResult.symbolsProcessed === 0 && fetchResult.errors.length > 0) {
          console.warn('[AccountDetailsPage] Auto-fetch had errors:', fetchResult.errors);
          setSyncMessage('Some errors occurred while fetching historical prices');
          setTimeout(() => setSyncMessage(null), 5000);
        } else {
          console.log('[AccountDetailsPage] Historical price data is already complete');
          setSyncMessage(null);
        }
      } catch (err) {
        console.error('[AccountDetailsPage] Auto-fetch error:', err);
        setSyncMessage(null);
      } finally {
        setFetchingPrices(false);
      }
    }
    */

    // --- Step 3: Get account metrics (market value, gains, etc.) ---
    setLoadingStage('Loading metrics...');
    setLoadingProgress(80);
    const metricsResult = await AccountMetricsService.getAccountMetrics(
      user.id,
      account.id
    );
    if (metricsResult.data) {
      setMetrics(metricsResult.data);
      console.log('[AccountDetailsPage] Metrics loaded:', metricsResult.data);
    }

    // === OPTIMIZATION: Skip historical chart data on initial load ===
    // This is the slowest part - we'll load it lazily when user views the chart
    console.log('[AccountDetailsPage] ⚡ Skipping historical data on initial load (will load on demand)');

    setLoadingProgress(100);
    setLoadingMetrics(false);
    setLoadingStage('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    account,
    refetchHoldings,
    refetchTransactions,
  ]);

  // Load data when component mounts or account changes
  const lastAccountId = useRef<string | null>(null);
  useEffect(() => {
    if (account && user && account.id !== lastAccountId.current) {
      // Reset auto-sync and auto-fetch flags when account changes
      hasAutoSynced.current = false;
      hasAutoFetchedPrices.current = false;
      setHistoryDataLoaded(false);
      hasTriggeredHistoryLoad.current = false;
      lastAccountId.current = account.id;

      // Load account data
      loadAccountData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, user?.id]);

  /**
   * Load historical chart data on demand (lazy loading)
   * This is called when user views the Holdings tab or changes time range
   */
  const loadHistoricalData = useCallback(async () => {
    if (!user || !account || loadingHistoryData) return;

    setLoadingHistoryData(true);
    console.log('[AccountDetailsPage] 📊 Loading historical chart data...');

    // Calculate YTD days (from Jan 1 of current year to today)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const ytdDays = Math.ceil(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysMap = {
      '1W': 6, // 7 days inclusive (today + 6 days back)
      '1M': 29, // 30 days inclusive
      '3M': 89, // 90 days inclusive
      YTD: ytdDays - 1, // Inclusive from Jan 1 to today
      '1Y': 364, // 365 days inclusive
      '5Y': 1824, // 1825 days inclusive
      ALL: 3649, // 3650 days inclusive
    };

    const historyResult = await AccountMetricsService.getAccountBalanceHistory(
      user.id,
      account.id,
      daysMap[timeRange]
    );

    if (historyResult.data) {
      setHistoryData(historyResult.data);
      console.log(
        `[AccountDetailsPage] ✅ Loaded ${historyResult.data.length} historical data points`
      );
    } else {
      setHistoryData([]);
      console.log('[AccountDetailsPage] No historical data available');
    }

    setHistoryDataLoaded(true);
    setLoadingHistoryData(false);
  }, [user, account, timeRange]);

  // Auto-load historical data when page finishes initial load
  const hasTriggeredHistoryLoad = useRef(false);
  useEffect(() => {
    if (!historyDataLoaded && !loadingMetrics && !loadingHistoryData && !hasTriggeredHistoryLoad.current) {
      hasTriggeredHistoryLoad.current = true;
      // Small delay to ensure smooth page load
      const timer = setTimeout(() => {
        loadHistoricalData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [historyDataLoaded, loadingMetrics, loadingHistoryData, loadHistoricalData]);

  // ============================================================================
  // EVENT HANDLERS - Chart & Performance
  // ============================================================================

  /**
   * Handle time range change for performance chart
   * Updates the historical data based on selected time range (YTD, 1W, 1M, etc.)
   */
  const handleTimeRangeChange = async (
    range: 'YTD' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL'
  ) => {
    setTimeRange(range);
    // Reset the trigger flag and mark data as not loaded so it re-fetches with new range
    hasTriggeredHistoryLoad.current = false;
    setHistoryDataLoaded(false);
  };

  /**
   * Refresh account data (metrics, history, holdings)
   * Triggered by user clicking refresh button
   */
  const handleRefresh = async () => {
    if (!user || !account) return;

    setRefreshing(true);

    // Refresh metrics
    const metricsResult = await AccountMetricsService.getAccountMetrics(
      user.id,
      account.id
    );
    if (metricsResult.data) {
      setMetrics(metricsResult.data);
    }

    // Refresh holdings
    await refetchHoldings();

    // Mark historical data as stale to trigger reload
    setHistoryDataLoaded(false);

    setRefreshing(false);
  };

  /**
   * Manual price sync handler
   *
   * NOTE: This manual "Sync Prices" button can be removed after upgrading to
   * Alpha Vantage Premium plan ($49.99/month for unlimited daily calls)
   * With Premium, you can enable automatic price fetching in loadAccountData
   *
   * Free tier: Max 3 symbols per sync, 25 API calls per day total
   */
  const handleSyncPrices = async () => {
    if (!user || !account) return;

    setSyncingPrices(true);
    setSyncProgress('Checking for missing price data...');

    console.log('[AccountDetailsPage] 🎯 Manual price sync started');

    try {
      const fetchResult = await HistoricalPriceService.smartSync(
        user.id,
        account.id,
        3, // Max 3 symbols per sync (respects free tier limit of 25/day)
        false, // Full historical fetch, not just recent
        progress => {
          console.log(`[AccountDetailsPage] Sync progress:`, progress);
          if (progress.status === 'fetching') {
            setSyncProgress(`Fetching prices for ${progress.symbol}...`);
          } else if (progress.status === 'completed') {
            setSyncProgress(
              `✓ ${progress.symbol} - Added ${progress.pricesAdded} prices`
            );
          } else if (progress.status === 'error') {
            setSyncProgress(`✗ ${progress.symbol} - ${progress.error}`);
          }
        }
      );

      if (fetchResult.success && fetchResult.totalPricesAdded > 0) {
        console.log(
          `[AccountDetailsPage] 🎉 Sync completed: ${fetchResult.totalPricesAdded} prices added`
        );

        const remaining =
          fetchResult.totalSymbols - fetchResult.symbolsProcessed;
        const message =
          remaining > 0
            ? `Added ${fetchResult.totalPricesAdded} prices for ${fetchResult.symbolsProcessed} symbols. ${remaining} symbols remaining - run sync again.`
            : `Successfully synced ${fetchResult.totalPricesAdded} prices for all symbols!`;

        setSyncMessage(message);
        setTimeout(() => setSyncMessage(null), 7000);

        // Refresh metrics without triggering full reload
        const metricsResult = await AccountMetricsService.getAccountMetrics(user.id, account.id);
        if (metricsResult.data) {
          setMetrics(metricsResult.data);
        }
        await refetchHoldings();
      } else if (fetchResult.errors.length > 0) {
        console.warn(
          '[AccountDetailsPage] ⚠️ Sync had errors:',
          fetchResult.errors
        );
        setSyncMessage(
          `Sync completed with ${fetchResult.errors.length} errors. Check console for details.`
        );
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        console.log('[AccountDetailsPage] ℹ️ No new prices needed');
        setSyncMessage('All price data is up to date!');
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (err) {
      console.error('[AccountDetailsPage] ❌ Sync error:', err);
      setSyncMessage('Error syncing prices. Check console for details.');
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setSyncingPrices(false);
      setSyncProgress('');
    }
  };

  // ============================================================================
  // EVENT HANDLERS - Transactions
  // ============================================================================

  /**
   * Add new transaction via wizard
   */
  const handleAddTransaction = async (
    transactionData: Partial<TransactionInsert>
  ) => {
    const result = await addTransaction(transactionData as TransactionInsert);
    if (!result.error) {
      setShowTransactionWizard(false);
      await loadAccountData();
      return { error: undefined };
    }
    return { error: result.error };
  };

  /**
   * Set transaction to edit mode
   */
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  /**
   * Update existing transaction
   */
  const handleUpdateTransaction = async (
    transactionData: TransactionInsert
  ) => {
    if (!editingTransaction) return { error: 'No transaction to update' };

    const transactionId =
      'id' in editingTransaction ? (editingTransaction['id'] as string) : '';
    if (!transactionId) return { error: 'Transaction ID not found' };

    const result = await updateTransaction(transactionId, transactionData);
    if (!result.error) {
      setEditingTransaction(undefined);
      await loadAccountData();
    }
    return result;
  };

  /**
   * Delete transaction with confirmation
   */
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    const result = await deleteTransaction(transactionId);
    if (!result.error) {
      await loadAccountData();
    }
  };

  // ============================================================================
  // COMPUTED VALUES & MEMOIZED DATA
  // ============================================================================

  // Determine if account is asset or liability type
  const isAsset = account.account_type === 'asset';

  /**
   * Holdings with calculated gains
   * Adds gain and gainPercentage fields to each holding
   */
  const holdingsWithGains = holdings.map(holding => {
    const costBasis = Number(holding.cost_basis);
    const currentValue = Number(holding.current_value);
    const gain = currentValue - costBasis;
    const gainPercentage = costBasis > 0 ? (gain / costBasis) * 100 : 0;

    return {
      ...holding,
      gain,
      gainPercentage,
    };
  });

  /**
   * Check if transaction filters are active
   * Used to show blue dot indicator on filter button
   */
  const hasActiveTransactionFilters =
    transactionTypeFilter !== 'all' ||
    transactionDateRange !== 'all' ||
    transactionSortBy !== 'date-desc';

  /**
   * Filter and sort transactions based on user selections
   * Filters: search query, transaction type, date range
   * Sorting: date (asc/desc), amount (asc/desc)
   */
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    const filtered = transactions.filter(t => {
      // Extract properties with type-safe checks
      const transactionDescription =
        'description' in t ? (t['description'] as string) : '';
      const transactionType =
        'transaction_type' in t ? (t['transaction_type'] as string) : '';
      const transactionDate =
        'transaction_date' in t ? (t['transaction_date'] as string) : '';

      // --- Search filter: matches description or ticker ---
      const matchesSearch =
        transactionSearchQuery === '' ||
        transactionDescription
          .toLowerCase()
          .includes(transactionSearchQuery.toLowerCase()) ||
        (t.transaction_metadata?.ticker &&
          (t.transaction_metadata.ticker as string)
            .toLowerCase()
            .includes(transactionSearchQuery.toLowerCase()));

      // --- Transaction type filter ---
      const matchesType =
        transactionTypeFilter === 'all' ||
        transactionType === transactionTypeFilter;

      // --- Date range filter ---
      const now = new Date();
      const txDate = new Date(transactionDate);
      const dateFilters = {
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        '1y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        all: new Date(0),
      };
      const matchesDate = txDate >= dateFilters[transactionDateRange];

      return matchesSearch && matchesType && matchesDate;
    });

    // --- Apply sorting ---
    filtered.sort((a, b) => {
      // Extract properties with type-safe checks
      const aDate =
        'transaction_date' in a ? (a['transaction_date'] as string) : '';
      const bDate =
        'transaction_date' in b ? (b['transaction_date'] as string) : '';
      const aAmount = 'amount' in a ? (a['amount'] as number) : 0;
      const bAmount = 'amount' in b ? (b['amount'] as number) : 0;

      switch (transactionSortBy) {
        case 'date-desc':
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        case 'date-asc':
          return new Date(aDate).getTime() - new Date(bDate).getTime();
        case 'amount-desc':
          return Math.abs(bAmount) - Math.abs(aAmount);
        case 'amount-asc':
          return Math.abs(aAmount) - Math.abs(bAmount);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    transactions,
    transactionSearchQuery,
    transactionTypeFilter,
    transactionDateRange,
    transactionSortBy,
  ]);

  /**
   * Sort holdings based on user selection
   * Options: alphabetical, value (high/low), value gain (high/low), percent gain (high/low)
   */
  const sortedHoldings = useMemo(() => {
    const sorted = [...holdingsWithGains];

    switch (sortBy) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
      case 'value-high':
        return sorted.sort(
          (a, b) => Number(b.current_value) - Number(a.current_value)
        );
      case 'value-low':
        return sorted.sort(
          (a, b) => Number(a.current_value) - Number(b.current_value)
        );
      case 'value-gain-high':
        return sorted.sort((a, b) => b.gain - a.gain);
      case 'value-gain-low':
        return sorted.sort((a, b) => a.gain - b.gain);
      case 'percent-gain-high':
        return sorted.sort((a, b) => b.gainPercentage - a.gainPercentage);
      case 'percent-gain-low':
        return sorted.sort((a, b) => a.gainPercentage - b.gainPercentage);
      default:
        return sorted;
    }
  }, [holdingsWithGains, sortBy]);

  /**
   * Calculate period-specific metrics from historyData based on selected timeRange
   *
   * Key concept:
   * - Market value and cost basis remain constant (current values)
   * - Period gains are calculated as the difference between start and end of selected period
   *
   * This allows users to see performance over specific time ranges while keeping
   * absolute values (market value, cost basis) accurate and unchanged.
   */
  const periodMetrics = useMemo(() => {
    // Always use current market value and cost basis from metrics (these don't change with time period)
    const currentMarketValue = metrics?.marketValue || 0;
    const currentCostBasis = metrics?.totalCostBasis || 0;

    if (!historyData || historyData.length === 0) {
      return {
        marketValue: currentMarketValue,
        totalCostBasis: currentCostBasis,
        periodChange: 0,
        periodChangePercent: 0,
        periodGain: 0,
        periodUnrealizedGain: 0,
        periodRealizedGain: 0,
      };
    }

    const currentPoint = historyData[historyData.length - 1];
    const startPoint = historyData[0];

    // Calculate the change over the selected period
    // Use metrics.marketValue as the current value (real-time accurate)
    // Round to 2 decimal places first to ensure displayed values match the calculation
    const roundedCurrentValue = Math.round(currentMarketValue * 100) / 100;
    const roundedStartValue = Math.round(startPoint.holdings_value * 100) / 100;
    const periodChange = roundedCurrentValue - roundedStartValue;
    const periodChangePercent =
      roundedStartValue > 0 ? (periodChange / roundedStartValue) * 100 : 0;

    console.log('[AccountDetailsPage] Period calculation:', {
      timeRange,
      metricsMarketValue: currentMarketValue,
      roundedCurrentValue,
      startPointValue: startPoint.holdings_value,
      roundedStartValue,
      periodChange,
      periodChangeFormatted: formatCurrency(periodChange),
    });

    // Calculate period-specific gains (difference between current and start period)
    const periodUnrealizedGain =
      currentPoint.unrealized_gain - startPoint.unrealized_gain;
    const periodRealizedGain =
      currentPoint.realized_gain - startPoint.realized_gain;
    const periodGain = periodUnrealizedGain + periodRealizedGain;

    return {
      marketValue: currentMarketValue,
      totalCostBasis: currentCostBasis,
      periodChange,
      periodChangePercent,
      periodGain,
      periodUnrealizedGain,
      periodRealizedGain,
    };
  }, [historyData, metrics, timeRange]);

  /**
   * Calculate dividend metrics (all-time and trailing 12-month)
   */
  const dividendMetrics = useMemo(() => {
    const dividendTypes = [
      'stock_dividend',
      'etf_dividend',
      'bond_coupon',
      'interest',
    ];

    // All-time dividends
    const allTimeDividends = transactions
      .filter(t => {
        const transactionType =
          'transaction_type' in t ? (t['transaction_type'] as string) : '';
        return dividendTypes.includes(transactionType);
      })
      .reduce((sum, t) => {
        const amount = 'amount' in t ? (t['amount'] as number) : 0;
        return sum + Number(amount);
      }, 0);

    // Trailing 12-month dividends
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const trailing12MonthDividends = transactions
      .filter(t => {
        const transactionType =
          'transaction_type' in t ? (t['transaction_type'] as string) : '';
        if (!dividendTypes.includes(transactionType)) return false;
        const transactionDate =
          'transaction_date' in t ? (t['transaction_date'] as string) : '';
        const txDate = new Date(transactionDate);
        return txDate >= twelveMonthsAgo;
      })
      .reduce((sum, t) => {
        const amount = 'amount' in t ? (t['amount'] as number) : 0;
        return sum + Number(amount);
      }, 0);

    return {
      allTime: allTimeDividends,
      trailing12Month: trailing12MonthDividends,
    };
  }, [transactions]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="min-h-screen pb-20">
        {/* ===== HEADER BAR ===== */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back button and account info */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="hover:bg-gray-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl shadow-lg ${
                      isAsset
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-red-500 to-rose-600'
                    }`}
                  >
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {account.name}
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isAsset
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {account.category}
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
                  onClick={() => setShowSettings(true)}
                  title="Account settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT AREA ===== */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Sync message banner */}
          {syncMessage && (
            <Card
              className={`p-4 ${
                syncMessage.includes('Failed') || syncMessage.includes('error')
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {syncMessage.includes('Failed') ||
                syncMessage.includes('error') ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                <p
                  className={`text-sm ${
                    syncMessage.includes('Failed') ||
                    syncMessage.includes('error')
                      ? 'text-red-700'
                      : 'text-green-700'
                  }`}
                >
                  {syncMessage}
                </p>
              </div>
            </Card>
          )}

          {/* Loading state */}
          {loadingMetrics ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              {loadingStage && (
                <div className="w-full max-w-md space-y-2">
                  <p className="text-sm text-gray-600 text-center">{loadingStage}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">{loadingProgress}%</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ===== HOLDINGS, TRANSACTIONS & INSIGHTS TABS ===== */}
              <Tabs defaultValue="holdings" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-200">
                  <TabsTrigger
                    value="holdings"
                    className="data-[state=active]:bg-white"
                  >
                    Holdings ({holdings.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="transactions"
                    className="data-[state=active]:bg-white"
                  >
                    Transactions
                  </TabsTrigger>
                  <TabsTrigger
                    value="insights"
                    className="data-[state=active]:bg-white"
                  >
                    Insights
                  </TabsTrigger>
                </TabsList>

                {/* ===== HOLDINGS TAB ===== */}
                <TabsContent value="holdings" className="space-y-4 mt-4">
                  {/* Account Performance Chart */}
                  <PerformanceChartContainer
                    title="Account Performance"
                    data={historyData}
                    timeRange={timeRange}
                    availableTimeRanges={[
                      'YTD',
                      '1W',
                      '1M',
                      '3M',
                      '1Y',
                      '5Y',
                      'ALL',
                    ]}
                    loading={loadingHistoryData}
                    refreshing={refreshing}
                    onTimeRangeChange={handleTimeRangeChange}
                    onRefresh={handleRefresh}
                    currentValue={metrics?.marketValue}
                    extraButton={
                      <Button
                        onClick={handleSyncPrices}
                        disabled={syncingPrices}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                        title="Manually fetch missing historical price data (max 3 symbols per sync)"
                      >
                        <Database
                          className={`h-3.5 w-3.5 ${syncingPrices ? 'animate-pulse' : ''}`}
                        />
                        <span className="hidden sm:inline">
                          {syncingPrices ? 'Syncing...' : 'Sync Prices'}
                        </span>
                        <span className="sm:hidden">
                          {syncingPrices ? '...' : 'Sync'}
                        </span>
                      </Button>
                    }
                    extraContent={
                      syncProgress ? (
                        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md mx-4">
                          <p className="text-sm text-purple-700 font-medium">
                            {syncProgress}
                          </p>
                        </div>
                      ) : undefined
                    }
                    headerContent={
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <p className="text-xs font-medium text-gray-600">
                              Market Value
                            </p>
                          </div>
                          <p className="text-xs font-medium text-gray-600">
                            Market Value Change
                          </p>
                        </div>
                        <div className="flex items-start justify-between">
                          <p className="text-4xl font-bold text-gray-900">
                            {formatCurrency(periodMetrics.marketValue)}
                          </p>
                          <div className="flex flex-col items-end gap-1">
                            <div
                              className={`flex items-center gap-1 ${periodMetrics.periodChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {periodMetrics.periodChange >= 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="text-lg font-semibold">
                                {periodMetrics.periodChange >= 0 ? '+' : ''}
                                {formatCurrency(periodMetrics.periodChange)}
                              </span>
                            </div>
                            <span
                              className={`text-sm ${periodMetrics.periodChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              ({periodMetrics.periodChange >= 0 ? '+' : ''}
                              {periodMetrics.periodChangePercent.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    }
                  />

                  {/* Holdings sorting and display mode controls */}
                  {holdings.length > 0 && !holdingsLoading && (
                    <div className="flex items-center justify-between gap-4 mb-4">
                      {/* Sort dropdown */}
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 text-gray-500" />
                        <Select
                          value={sortBy}
                          onValueChange={(
                            value:
                              | 'alphabetical'
                              | 'value-high'
                              | 'value-low'
                              | 'value-gain-high'
                              | 'value-gain-low'
                              | 'percent-gain-high'
                              | 'percent-gain-low'
                          ) => setSortBy(value)}
                        >
                          <SelectTrigger className="w-[180px] bg-white border-gray-300">
                            <SelectValue placeholder="Sort by..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem
                              value="alphabetical"
                              className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                            >
                              Alphabetical
                            </SelectItem>
                            <SelectItem
                              value="value-high"
                              className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                            >
                              Value: High to Low
                            </SelectItem>
                            <SelectItem
                              value="value-low"
                              className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                            >
                              Value: Low to High
                            </SelectItem>
                            <SelectItem
                              value="value-gain-high"
                              className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                            >
                              Value Gain: High to Low
                            </SelectItem>
                            <SelectItem
                              value="value-gain-low"
                              className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                            >
                              Value Gain: Low to High
                            </SelectItem>
                            <SelectItem
                              value="percent-gain-high"
                              className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                            >
                              % Gain: High to Low
                            </SelectItem>
                            <SelectItem
                              value="percent-gain-low"
                              className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                            >
                              % Gain: Low to High
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Display mode toggle (Market Value vs Per Share) */}
                      <Tabs
                        value={holdingsDisplayMode}
                        onValueChange={value =>
                          setHoldingsDisplayMode(value as 'value' | 'price')
                        }
                        className="w-[280px]"
                      >
                        <TabsList className="grid w-full grid-cols-2 bg-gray-200">
                          <TabsTrigger
                            value="value"
                            className="data-[state=active]:bg-white"
                          >
                             Value
                          </TabsTrigger>
                          <TabsTrigger
                            value="price"
                            className="data-[state=active]:bg-white"
                          >
                            Per Share
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  )}

                  {/* Holdings list */}
                  {holdingsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                  ) : holdings.length === 0 ? (
                    <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <TrendingUp className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          No holdings in this account
                        </p>
                        <p className="text-xs text-gray-500">
                          Add buy transactions to track investments
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {sortedHoldings.map(holding => (
                        <HoldingCard
                          key={holding.id}
                          holding={holding}
                          displayMode={holdingsDisplayMode}
                          onSelect={setSelectedHolding}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ===== TRANSACTIONS TAB ===== */}
                <TabsContent value="transactions" className="space-y-3 mt-4">
                  {/* Primary action buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() =>
                        setShowImportStatement(!showImportStatement)
                      }
                      size="lg"
                      variant="outline"
                      className="w-full border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 shadow-md hover:shadow-lg transition-all"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Import Statement
                    </Button>
                    <Button
                      onClick={() => setShowTransactionWizard(true)}
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Transaction
                    </Button>
                  </div>

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
                          onChange={e =>
                            setTransactionSearchQuery(e.target.value)
                          }
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
                        onClick={() =>
                          setShowTransactionFilterPopup(
                            !showTransactionFilterPopup
                          )
                        }
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

                  {/* Import statement section (collapsible) */}
                  {showImportStatement && (
                    <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-600 rounded-lg">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Import Brokerage Statement
                            </h3>
                            <p className="text-sm text-gray-600">
                              Upload your statement to automatically import
                              transactions
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowImportStatement(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </Button>
                      </div>

                      <div className="bg-white rounded-lg p-6 border-2 border-dashed border-purple-300">
                        <div className="text-center">
                          <Upload className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Import functionality coming soon
                          </p>
                          <p className="text-xs text-gray-500 mb-4">
                            This will use the SmartStatementImporter component
                          </p>
                          <Button
                            onClick={() => {
                              setShowImportStatement(false);
                              window.dispatchEvent(
                                new CustomEvent('navigate', {
                                  detail: { page: 'import' },
                                })
                              );
                            }}
                            variant="outline"
                            size="sm"
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            Go to Import Page
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Transaction list */}
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                  ) : transactions.length === 0 ? (
                    <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Activity className="w-8 h-8 text-violet-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          No transactions in this account
                        </p>
                        <p className="text-xs text-gray-500">
                          Add a transaction to get started
                        </p>
                      </div>
                    </Card>
                  ) : filteredTransactions.length === 0 ? (
                    <Card className="p-8 bg-white border-gray-200 shadow-sm">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">
                          No transactions found matching your filters.
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {filteredTransactions.map(transaction => {
                        // Extract properties with type-safe checks
                        const transactionId =
                          'id' in transaction
                            ? (transaction['id'] as string)
                            : '';
                        const editingTransactionId =
                          editingTransaction && 'id' in editingTransaction
                            ? (editingTransaction['id'] as string)
                            : '';

                        // If this transaction is being edited, show the edit form instead
                        if (editingTransactionId === transactionId) {
                          return (
                            <Card
                              key={transactionId}
                              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-semibold text-gray-900">
                                  Edit Transaction
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setEditingTransaction(undefined)
                                  }
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  ✕
                                </Button>
                              </div>
                              <TransactionFormNew
                                onSubmit={handleUpdateTransaction}
                                defaultAccountId={account.id}
                                editTransaction={editingTransaction}
                                onCancel={() =>
                                  setEditingTransaction(undefined)
                                }
                              />
                            </Card>
                          );
                        }

                        // Otherwise, show the regular transaction card
                        return (
                          <TransactionCard
                            key={transactionId}
                            transaction={transaction}
                            onEdit={handleEditTransaction}
                            onDelete={handleDeleteTransaction}
                          />
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ===== INSIGHTS TAB ===== */}
                <TabsContent value="insights" className="space-y-4 mt-4">
                  {/* Existing Metrics - Moved from Collapsible Card */}
                  <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Account Metrics ({timeRange})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Market Value */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <p className="text-xs text-gray-600">Market Value</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(periodMetrics.marketValue)}
                        </p>
                      </div>

                      {/* Cost Basis */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <PieChart className="h-4 w-4 text-gray-500" />
                          <p className="text-xs text-gray-600">Cost Basis</p>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(periodMetrics.totalCostBasis)}
                        </p>
                      </div>

                      {/* Period Gain */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-500" />
                          <p className="text-xs text-gray-600">Period Gain</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p
                            className={`text-lg font-semibold ${
                              periodMetrics.periodGain >= 0
                                ? 'text-teal-600'
                                : 'text-red-600'
                            }`}
                          >
                            {periodMetrics.periodGain >= 0 ? '+' : ''}
                            {formatCurrency(periodMetrics.periodGain)}
                          </p>
                          <p
                            className={`text-xs ${
                              periodMetrics.periodChangePercent >= 0
                                ? 'text-teal-600'
                                : 'text-red-600'
                            }`}
                          >
                            ({periodMetrics.periodChangePercent >= 0 ? '+' : ''}
                            {periodMetrics.periodChangePercent.toFixed(2)}%)
                          </p>
                        </div>
                      </div>

                      {/* Period Unrealized Gain */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                          Period Unrealized Gain
                        </p>
                        <p
                          className={`text-lg font-semibold ${
                            periodMetrics.periodUnrealizedGain >= 0
                              ? 'text-teal-600'
                              : 'text-red-600'
                          }`}
                        >
                          {periodMetrics.periodUnrealizedGain >= 0 ? '+' : ''}
                          {formatCurrency(periodMetrics.periodUnrealizedGain)}
                        </p>
                      </div>

                      {/* Period Realized Gain */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                          Period Realized Gain
                        </p>
                        <p
                          className={`text-lg font-semibold ${
                            periodMetrics.periodRealizedGain >= 0
                              ? 'text-teal-600'
                              : 'text-red-600'
                          }`}
                        >
                          {periodMetrics.periodRealizedGain >= 0 ? '+' : ''}
                          {formatCurrency(periodMetrics.periodRealizedGain)}
                        </p>
                      </div>

                      {/* All-Time Dividends */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="h-4 w-4 text-gray-500" />
                          <p className="text-xs text-gray-600">
                            All-Time Dividends
                          </p>
                        </div>
                        <p className="text-lg font-semibold text-teal-600">
                          {formatCurrency(dividendMetrics.allTime)}
                        </p>
                      </div>

                      {/* 12-Month Dividends */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="h-4 w-4 text-gray-500" />
                          <p className="text-xs text-gray-600">
                            12-Month Dividends
                          </p>
                        </div>
                        <p className="text-lg font-semibold text-teal-600">
                          {formatCurrency(dividendMetrics.trailing12Month)}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* 1. Asset Allocation Breakdown */}
                  <Card className="p-6 bg-white border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-600" />
                      Asset Allocation
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(
                        holdings.reduce((acc, h) => {
                          const type = h.asset_type || 'other';
                          if (!acc[type]) {
                            acc[type] = { value: 0, count: 0 };
                          }
                          acc[type].value += Number(h.current_value);
                          acc[type].count += 1;
                          return acc;
                        }, {} as Record<string, { value: number; count: number }>)
                      )
                        .sort((a, b) => b[1].value - a[1].value)
                        .map(([type, data]) => {
                          const percentage = metrics
                            ? (data.value / metrics.marketValue) * 100
                            : 0;
                          return (
                            <div key={type} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium capitalize text-gray-700">
                                  {type} ({data.count})
                                </span>
                                <span className="text-gray-900 font-semibold">
                                  {formatCurrency(data.value)} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </Card>

                  {/* 2. Holding Period Breakdown */}
                  <Card className="p-6 bg-white border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Holding Period Breakdown (Tax Implications)
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <p className="text-sm font-semibold text-gray-700">
                            Short-Term (≤1 year)
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          {
                            holdings.filter(h => {
                              const purchaseDate = new Date(
                                h.purchase_date || h.created_at
                              );
                              const daysSincePurchase =
                                (Date.now() - purchaseDate.getTime()) /
                                (1000 * 60 * 60 * 24);
                              return daysSincePurchase <= 365;
                            }).length
                          }
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          Higher tax rate applies
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <p className="text-sm font-semibold text-gray-700">
                            Long-Term (&gt;1 year)
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          {
                            holdings.filter(h => {
                              const purchaseDate = new Date(
                                h.purchase_date || h.created_at
                              );
                              const daysSincePurchase =
                                (Date.now() - purchaseDate.getTime()) /
                                (1000 * 60 * 60 * 24);
                              return daysSincePurchase > 365;
                            }).length
                          }
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Preferential tax rate
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* 3. Dividend Yield Analysis */}
                  <Card className="p-6 bg-white border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Percent className="h-5 w-5 text-teal-600" />
                      Dividend Yield Analysis
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">
                            Portfolio Dividend Yield
                          </p>
                          <p className="text-2xl font-bold text-teal-600">
                            {metrics && metrics.marketValue > 0
                              ? (
                                  (dividendMetrics.trailing12Month /
                                    metrics.marketValue) *
                                  100
                                ).toFixed(2)
                              : '0.00'}
                            %
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">
                            Projected Annual Income
                          </p>
                          <p className="text-2xl font-bold text-teal-600">
                            {formatCurrency(dividendMetrics.trailing12Month)}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                        <p className="text-sm text-teal-800">
                          💡 Based on your last 12 months of dividend income. Actual
                          future dividends may vary.
                        </p>
                      </div>
                    </div>
                  </Card>

                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* ===== TRANSACTION WIZARD MODAL ===== */}
      {showTransactionWizard && (
        <AddTransactionWizard
          onClose={() => setShowTransactionWizard(false)}
          onSubmit={handleAddTransaction}
          defaultAccountId={account.id}
          accounts={accounts}
        />
      )}

      {/* ===== TRANSACTION FILTER POPUP MODAL ===== */}
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

      {/* Account Settings Modal */}
      <AccountSettingsModal
        account={
          account
            ? {
                ...account,
                account_type: account.account_type as 'asset' | 'liability',
              }
            : null
        }
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={async (accountId, updates) => {
          await onSaveSettings?.(accountId, updates);
          setShowSettings(false);
        }}
        onDelete={accountId => {
          onDelete?.(accountId);
          setShowSettings(false);
          onBack();
        }}
      />

      {/* Holding Detail Modal */}
      <HoldingDetailModal
        holding={selectedHolding}
        onClose={() => setSelectedHolding(null)}
      />
    </div>
  );
}
