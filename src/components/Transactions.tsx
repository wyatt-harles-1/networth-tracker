/**
 * ============================================================================
 * Transactions Component
 * ============================================================================
 *
 * Main transactions page that displays, filters, and manages all portfolio transactions.
 *
 * Features:
 * - Transaction list with search and filtering
 * - Analytics view with financial metrics
 * - Add/Edit transaction functionality via wizard
 * - Real-time filtering by account, date range, and search query
 * - Sorting by date or amount
 * - Analytics cards showing inflows, outflows, and net flow
 *
 * Sub-components:
 * - TransactionListNew: Displays filtered transaction list
 * - TransactionAnalytics: Shows detailed analytics and charts
 * - AddTransactionWizard: Modal for adding/editing transactions
 *
 * State Management:
 * - Local state for filters (search, account, date range, sort)
 * - useTransactions hook for transaction data
 * - useAccounts hook for account filtering options
 *
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { TransactionListNew } from './TransactionList';
import { TransactionAnalytics } from './TransactionAnalytics';
import { AddTransactionWizard } from './AddTransactionWizard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Filter,
  X,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Transaction, TransactionInsert } from '@/types/transaction';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, cn } from '@/lib/utils';

/**
 * Transactions page component
 */
export function Transactions() {
  // UI state
  const [showWizard, setShowWizard] = useState(false);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    Transaction | undefined
  >(undefined);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [dateRange, setDateRange] = useState<
    '7d' | '30d' | '90d' | '1y' | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<
    'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  >('date-desc');

  // Hooks
  const {
    transactions,
    loading,
    error,
    deleteTransaction,
    refetch,
    addTransaction,
    updateTransaction,
  } = useTransactions();
  const { accounts } = useAccounts();

  /**
   * Opens edit mode for a transaction
   */
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowWizard(true);
  };

  /**
   * Handles transaction submission from wizard
   * Updates existing transaction if editing, adds new one otherwise
   * Refetches data on success
   */
  const handleWizardSubmit = async (
    transactionData: Partial<TransactionInsert>
  ): Promise<{ error?: string }> => {
    let result;
    if (editingTransaction) {
      // Update existing transaction
      // Extract Transaction id with type-safe check
      const transactionId =
        'id' in editingTransaction ? (editingTransaction['id'] as string) : '';
      if (!transactionId) {
        return { error: 'Transaction ID is missing' };
      }
      result = await updateTransaction(transactionId, transactionData);
    } else {
      // Add new transaction
      result = await addTransaction(transactionData as TransactionInsert);
    }

    // Convert null to undefined for type compatibility
    // AddTransactionWizard expects { error?: string }, not { error: null }
    if (result.error === null) {
      await refetch();
      return {};
    }
    // Return error as string
    return { error: result.error };
  };

  /**
   * Opens wizard in add mode (no transaction to edit)
   */
  const handleAddNew = () => {
    setEditingTransaction(undefined);
    setShowWizard(true);
  };

  /**
   * Calculate analytics metrics based on filtered transactions
   * Includes inflows, outflows, net flow, and transaction counts
   */
  const analytics = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        totalCashFlow: 0,
        inflows: 0,
        outflows: 0,
        netFlow: 0,
        transactionCount: 0,
        avgTransactionSize: 0,
      };
    }

    const now = new Date();
    const dateFilters = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      all: new Date(0),
    };

    const filtered = transactions.filter(t => {
      // Extract transaction_date with type-safe check
      const transactionDate =
        'transaction_date' in t ? (t['transaction_date'] as string) : '';
      if (!transactionDate) return false;
      const txDate = new Date(transactionDate);
      return txDate >= dateFilters[dateRange];
    });

    let inflows = 0;
    let outflows = 0;

    filtered.forEach(t => {
      // Extract amount with type-safe check
      const amount = 'amount' in t ? Number(t['amount'] as number) : 0;
      if (amount > 0) {
        inflows += amount;
      } else {
        outflows += Math.abs(amount);
      }
    });

    const netFlow = inflows - outflows;
    const totalCashFlow = inflows + outflows;
    const avgTransactionSize =
      filtered.length > 0 ? totalCashFlow / filtered.length : 0;

    return {
      totalCashFlow,
      inflows,
      outflows,
      netFlow,
      transactionCount: filtered.length,
      avgTransactionSize,
    };
  }, [transactions, dateRange]);

  // Check if any filters are active (used for filter badge indicator)
  const hasActiveFilters =
    selectedAccount !== 'all' || dateRange !== 'all' || sortBy !== 'date-desc';

  /**
   * Filter and sort transactions based on current filter state
   * Applies search, account, date range filters, then sorts results
   */
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    const filtered = transactions.filter(t => {
      // Extract Transaction properties with type-safe checks
      const description =
        'description' in t ? (t['description'] as string) : '';
      const accountId =
        'account_id' in t ? (t['account_id'] as string | null) : null;
      const transactionDate =
        'transaction_date' in t ? (t['transaction_date'] as string) : '';

      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.transaction_metadata?.ticker &&
          (t.transaction_metadata.ticker as string)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      // Account filter
      const matchesAccount =
        selectedAccount === 'all' || accountId === selectedAccount;

      // Date filter
      if (!transactionDate) return false;
      const now = new Date();
      const txDate = new Date(transactionDate);
      const dateFilters = {
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        '1y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        all: new Date(0),
      };
      const matchesDate = txDate >= dateFilters[dateRange];

      return matchesSearch && matchesAccount && matchesDate;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      // Extract Transaction properties with type-safe checks
      const aTransactionDate =
        'transaction_date' in a ? (a['transaction_date'] as string) : '';
      const bTransactionDate =
        'transaction_date' in b ? (b['transaction_date'] as string) : '';
      const aAmount = 'amount' in a ? (a['amount'] as number) : 0;
      const bAmount = 'amount' in b ? (b['amount'] as number) : 0;

      switch (sortBy) {
        case 'date-desc':
          return (
            new Date(bTransactionDate).getTime() -
            new Date(aTransactionDate).getTime()
          );
        case 'date-asc':
          return (
            new Date(aTransactionDate).getTime() -
            new Date(bTransactionDate).getTime()
          );
        case 'amount-desc':
          return Math.abs(bAmount) - Math.abs(aAmount);
        case 'amount-asc':
          return Math.abs(aAmount) - Math.abs(bAmount);
        default:
          return 0;
      }
    });

    return filtered;
  }, [transactions, searchQuery, selectedAccount, dateRange, sortBy]);

  return (
    <div className="p-4 pb-20">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Portfolio Activity
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              View and analyze all your transactions across accounts
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full h-full grid-cols-2 bg-gray-200">
            <TabsTrigger
              value="list"
              className="data-[state=active]:bg-white text-base"
            >
              Transactions
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-white text-base"
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Search and Filter Toolbar */}
          <div className="py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-11 text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowFilterPopup(!showFilterPopup)}
                className="relative"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full" />
                )}
              </Button>
            </div>
          </div>

          <TabsContent value="list" className="mt-4">
            <TransactionListNew
              onEdit={handleEdit}
              transactions={filteredTransactions}
              loading={loading}
              error={error}
              deleteTransaction={deleteTransaction}
            />
          </TabsContent>
          <TabsContent value="analytics" className="mt-4 space-y-6">
            {/* Analytics Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-medium text-gray-600">
                    Transactions
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.transactionCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Last {dateRange === 'all' ? 'all time' : dateRange}
                </p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-gray-600">Inflows</p>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(analytics.inflows)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Money in</p>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-medium text-gray-600">Outflows</p>
                </div>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(analytics.outflows)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Money out</p>
              </Card>

              <Card
                className={cn(
                  'p-4 bg-gradient-to-br',
                  analytics.netFlow >= 0
                    ? 'from-teal-50 to-teal-100 border-teal-200'
                    : 'from-orange-50 to-orange-100 border-orange-200'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign
                    className={cn(
                      'h-4 w-4',
                      analytics.netFlow >= 0
                        ? 'text-teal-600'
                        : 'text-orange-600'
                    )}
                  />
                  <p className="text-xs font-medium text-gray-600">Net Flow</p>
                </div>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    analytics.netFlow >= 0 ? 'text-teal-700' : 'text-orange-700'
                  )}
                >
                  {analytics.netFlow >= 0 ? '+' : ''}
                  {formatCurrency(analytics.netFlow)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Period total</p>
              </Card>
            </div>

            {/* Existing Analytics Component */}
            <TransactionAnalytics />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Button (Secondary) */}
      <button
        onClick={handleAddNew}
        className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-2xl hover:shadow-xl hover:scale-110 transition-all group"
        title="Quick add transaction (Tip: Add from account pages for faster entry)"
      >
        <Plus className="h-6 w-6" />
        <span className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Quick Add
        </span>
      </button>

      {showWizard && (
        <AddTransactionWizard
          onClose={() => {
            setShowWizard(false);
            setEditingTransaction(undefined);
          }}
          onSubmit={handleWizardSubmit}
          accounts={accounts}
          editingTransaction={editingTransaction}
        />
      )}

      {/* Filter Popup Modal */}
      {showFilterPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilterPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Account Filter */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
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
                        setDateRange(
                          option.value as '7d' | '30d' | '90d' | '1y' | 'all'
                        )
                      }
                      className={cn(
                        'p-3 cursor-pointer transition-all border-2',
                        dateRange === option.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                        {dateRange === option.value && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Sort By
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: 'date-desc',
                      label: 'Date (Newest First)',
                      icon: ArrowDown,
                    },
                    {
                      value: 'date-asc',
                      label: 'Date (Oldest First)',
                      icon: ArrowUp,
                    },
                    {
                      value: 'amount-desc',
                      label: 'Amount (High to Low)',
                      icon: ArrowDown,
                    },
                    {
                      value: 'amount-asc',
                      label: 'Amount (Low to High)',
                      icon: ArrowUp,
                    },
                  ].map(option => {
                    const IconComponent = option.icon;
                    return (
                      <Card
                        key={option.value}
                        onClick={() =>
                          setSortBy(
                            option.value as
                              | 'date-desc'
                              | 'date-asc'
                              | 'amount-desc'
                              | 'amount-asc'
                          )
                        }
                        className={cn(
                          'p-3 cursor-pointer transition-all border-2',
                          sortBy === option.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">
                              {option.label}
                            </span>
                          </div>
                          {sortBy === option.value && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAccount('all');
                  setDateRange('all');
                  setSortBy('date-desc');
                }}
              >
                Reset All
              </Button>
              <Button
                onClick={() => setShowFilterPopup(false)}
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
