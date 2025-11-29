import { useEffect, useState, useCallback } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  Plus,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHoldings } from '@/hooks/useHoldings';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, parseLocalDate } from '@/lib/utils';
import {
  Wallet,
  Building,
  CreditCard,
  Home,
  Car,
  Coins,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DataAuditService } from '@/services/dataAuditService';
import { HoldingsRecalculationService } from '@/services/holdingsRecalculationService';
import { AccountSettingsModal } from './AccountSettingsModal';

const iconMap = {
  Wallet,
  TrendingUp,
  Home,
  Car,
  CreditCard,
  Building,
  DollarSign,
  Coins,
};

interface Account {
  id: string;
  name: string;
  account_type: 'asset' | 'liability';
  category: string;
  current_balance: number;
  icon: string;
  is_visible: boolean;
  institution: string | null;
  account_number_last4: string | null;
  created_at: string;
}

interface AccountDetailsModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings?: (
    accountId: string,
    updates: Partial<Account>
  ) => Promise<void>;
  onDelete?: (accountId: string) => void;
  onAddTransaction?: (accountId: string) => void;
}

export function AccountDetailsModal({
  account,
  isOpen,
  onClose,
  onSaveSettings,
  onDelete,
  onAddTransaction,
}: AccountDetailsModalProps) {
  const { user } = useAuth();
  const {
    holdings,
    loading: holdingsLoading,
    refetch: refetchHoldings,
  } = useHoldings(account?.id);
  const {
    transactions,
    loading: transactionsLoading,
    refetch: refetchTransactions,
  } = useTransactions(account?.id);
  const [transactionTotal, setTransactionTotal] = useState({
    total: 0,
    count: 0,
  });
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadTransactionTotal = useCallback(async () => {
    if (!user || !account) return;
    const result = await DataAuditService.getTransactionTotal(
      user.id,
      account.id
    );
    setTransactionTotal(result);
  }, [user, account]);

  const loadAccountData = useCallback(async () => {
    if (!user || !account) return;

    // Auto-sync holdings on first open if there are any transactions
    if (!hasAutoSynced) {
      setHasAutoSynced(true);

      console.log('[AccountDetailsModal] Checking if auto-sync is needed...');

      // Check if there are any transactions for this account
      const { data: transactionsCheck } = await supabase
        .from('transactions')
        .select('id')
        .eq('account_id', account.id)
        .eq('user_id', user.id)
        .limit(1);

      const hasTransactions = (transactionsCheck || []).length > 0;

      if (hasTransactions) {
        console.log(
          '[AccountDetailsModal] Auto-syncing holdings from transactions...'
        );
        setSyncMessage('Calculating holdings from transactions...');

        const syncResult =
          await HoldingsRecalculationService.recalculateAndSync(
            user.id,
            account.id
          );

        if (syncResult.success) {
          console.log(
            '[AccountDetailsModal] Auto-sync successful:',
            syncResult.message
          );
          setSyncMessage(syncResult.message || 'Holdings synced successfully');
          setTimeout(() => setSyncMessage(null), 3000);
        } else {
          console.error(
            '[AccountDetailsModal] Auto-sync failed:',
            syncResult.error
          );
          setSyncMessage(null);
        }
      } else {
        console.log(
          '[AccountDetailsModal] No transactions found, skipping auto-sync'
        );
      }
    }

    // Refresh holdings and transactions after potential auto-sync
    await refetchHoldings();
    await refetchTransactions();
    await loadTransactionTotal();
  }, [
    user,
    account,
    refetchHoldings,
    refetchTransactions,
    loadTransactionTotal,
    hasAutoSynced,
  ]);

  useEffect(() => {
    if (isOpen && account) {
      // Reset auto-sync flag when modal opens for a new account
      setHasAutoSynced(false);
      loadAccountData();
    }
  }, [isOpen, account, loadAccountData]);

  const handleSyncHoldings = async () => {
    if (!user || !account) return;

    console.log('[AccountDetailsModal] Manual sync triggered...');
    setSyncMessage('Recalculating holdings from transactions...');

    const syncResult = await HoldingsRecalculationService.recalculateAndSync(
      user.id,
      account.id
    );

    if (syncResult.success) {
      console.log(
        '[AccountDetailsModal] Manual sync successful:',
        syncResult.message
      );
      setSyncMessage(syncResult.message || 'Holdings synced successfully');
      await refetchHoldings();
      setTimeout(() => setSyncMessage(null), 3000);
    } else {
      console.error(
        '[AccountDetailsModal] Manual sync failed:',
        syncResult.error
      );
      setSyncMessage(`Sync failed: ${syncResult.error}`);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  if (!account) return null;

  const IconComponent = iconMap[account.icon as keyof typeof iconMap] || Wallet;
  const isAsset = account.account_type === 'asset';

  const totalHoldingsValue = holdings.reduce(
    (sum, h) => sum + Number(h.current_value),
    0
  );
  const totalCostBasis = holdings.reduce(
    (sum, h) => sum + Number(h.cost_basis),
    0
  );
  const totalGainLoss = totalHoldingsValue - totalCostBasis;
  const totalGainLossPercent =
    totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

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

  const sortedHoldings = [...holdingsWithGains].sort(
    (a, b) => Number(b.current_value) - Number(a.current_value)
  );

  const bestPerformer =
    holdingsWithGains.length > 0
      ? holdingsWithGains.reduce((best, current) =>
          current.gainPercentage > best.gainPercentage ? current : best
        )
      : null;

  const worstPerformer =
    holdingsWithGains.length > 0
      ? holdingsWithGains.reduce((worst, current) =>
          current.gainPercentage < worst.gainPercentage ? current : worst
        )
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`p-4 rounded-2xl shadow-lg ${isAsset ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}
              >
                <IconComponent className="h-8 w-8 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {account.name}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${isAsset ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {account.category}
                  </span>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {syncMessage && (
            <Card
              className={`p-4 ${syncMessage.includes('Failed') || syncMessage.includes('error') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
            >
              <div className="flex items-center gap-2">
                {syncMessage.includes('Failed') ||
                syncMessage.includes('error') ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                <p
                  className={`text-sm ${syncMessage.includes('Failed') || syncMessage.includes('error') ? 'text-red-700' : 'text-green-700'}`}
                >
                  {syncMessage}
                </p>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              className={`p-4 shadow-md hover:shadow-lg transition-shadow ${isAsset ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Wallet
                  className={`h-4 w-4 ${isAsset ? 'text-green-600' : 'text-red-600'}`}
                />
                <p
                  className={`text-xs font-medium ${isAsset ? 'text-green-600' : 'text-red-600'}`}
                >
                  Account Balance
                </p>
              </div>
              <p
                className={`text-xl font-bold ${isAsset ? 'text-green-700' : 'text-red-700'}`}
              >
                {formatCurrency(Math.abs(account.current_balance))}
              </p>
            </Card>

            <Card className="p-4 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-600">Holdings</p>
              </div>
              <p className="text-xl font-bold text-blue-700">
                {holdings.length}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {formatCurrency(totalHoldingsValue)}
              </p>
            </Card>

            <Card className="p-4 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-violet-600" />
                <p className="text-xs font-medium text-violet-600">
                  Transactions
                </p>
              </div>
              <p className="text-xl font-bold text-violet-700">
                {transactions.length}
              </p>
            </Card>

            <Card className="p-4 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-gray-600" />
                <p className="text-xs font-medium text-gray-600">
                  Cash Balance
                </p>
              </div>
              <p className="text-xl font-bold text-gray-700">
                {formatCurrency(transactionTotal.total)}
              </p>
            </Card>
          </div>

          {account.institution && (
            <Card className="p-4 bg-white border-gray-200 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Institution</p>
                  <p className="text-sm font-medium text-gray-900">
                    {account.institution}
                  </p>
                </div>
                {account.account_number_last4 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Account Number</p>
                    <p className="text-sm font-medium text-gray-900">
                      ****{account.account_number_last4}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => onAddTransaction?.(account.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Transaction
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="shadow-sm"
            >
              <Settings className="h-4 w-4 mr-1" />
              Account Settings
            </Button>
          </div>

          <Tabs defaultValue="holdings" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-200">
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
                Transactions ({transactions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="holdings" className="space-y-4 mt-4">
              {holdingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : holdings.length === 0 ? (
                <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      No holdings in this account
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Add buy transactions to track investments
                    </p>
                    <Button
                      size="sm"
                      onClick={handleSyncHoldings}
                      variant="outline"
                      className="shadow-sm"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Sync from Transactions
                    </Button>
                  </div>
                </Card>
              ) : (
                <>
                  {totalHoldingsValue > 0 && (
                    <Card className="p-5 bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-md">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-2 font-medium">
                            Total Value
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(totalHoldingsValue)}
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
                              className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {totalGainLoss >= 0 ? '+' : ''}
                              {formatCurrency(totalGainLoss)}
                            </p>
                          </div>
                          <p
                            className={`text-xs mt-1 font-medium ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {totalGainLossPercent >= 0 ? '+' : ''}
                            {totalGainLossPercent.toFixed(2)}%
                          </p>
                        </div>
                        {bestPerformer && worstPerformer && (
                          <div className="col-span-2 md:col-span-1">
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                              Performance
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                                <p className="text-xs font-medium text-green-700">
                                  Best: {bestPerformer.symbol}
                                </p>
                                <p className="text-xs font-bold text-green-600">
                                  +{bestPerformer.gainPercentage.toFixed(1)}%
                                </p>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                <p className="text-xs font-medium text-red-700">
                                  Worst: {worstPerformer.symbol}
                                </p>
                                <p className="text-xs font-bold text-red-600">
                                  {worstPerformer.gainPercentage.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  <div className="space-y-3">
                    {sortedHoldings.map(holding => (
                      <Card
                        key={holding.id}
                        className="p-4 bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow"
                      >
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
                              {holding.name}
                            </p>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="p-2 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 mb-1">Quantity</p>
                                <p className="font-semibold text-gray-900">
                                  {Number(holding.quantity).toFixed(4)}
                                </p>
                              </div>
                              <div className="p-2 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 mb-1">Price</p>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(
                                    Number(holding.current_price)
                                  )}
                                </p>
                              </div>
                              <div className="p-2 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 mb-1">Cost Basis</p>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(Number(holding.cost_basis))}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-lg font-bold text-gray-900 mb-1">
                              {formatCurrency(Number(holding.current_value))}
                            </p>
                            <div
                              className={`flex items-center gap-1 justify-end px-3 py-1 rounded-full ${holding.gainPercentage >= 0 ? 'bg-green-100' : 'bg-red-100'}`}
                            >
                              {holding.gainPercentage >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              <p
                                className={`text-xs font-bold ${holding.gainPercentage >= 0 ? 'text-green-700' : 'text-red-700'}`}
                              >
                                {holding.gainPercentage >= 0 ? '+' : ''}
                                {formatCurrency(holding.gain)}
                              </p>
                            </div>
                            <p
                              className={`text-xs mt-1 font-medium ${holding.gainPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {holding.gainPercentage >= 0 ? '+' : ''}
                              {holding.gainPercentage.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-3 mt-4">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : transactions.length === 0 ? (
                <Card className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-violet-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      No transactions in this account
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Add a transaction to get started
                    </p>
                    <Button
                      size="sm"
                      onClick={() => onAddTransaction?.(account.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Transaction
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 20).map(transaction => {
                    // Extract properties with type-safe checks
                    const transactionType =
                      'transaction_type' in transaction
                        ? (transaction['transaction_type'] as string)
                        : '';
                    const transactionAmount =
                      'amount' in transaction
                        ? (transaction['amount'] as number)
                        : 0;
                    const transactionId =
                      'id' in transaction ? (transaction['id'] as string) : '';
                    const transactionDescription =
                      'description' in transaction
                        ? (transaction['description'] as string)
                        : '';
                    const transactionDate =
                      'transaction_date' in transaction
                        ? (transaction['transaction_date'] as string)
                        : '';

                    // Green with +: Increases holdings (buys, deposits, dividends)
                    // Red with -: Decreases holdings (sells, withdrawals, fees)
                    const isPositive = [
                      'stock_buy',
                      'etf_buy',
                      'crypto_buy',
                      'bond_buy',
                      'option_buy',
                      'deposit',
                      'income',
                      'dividend',
                      'interest',
                      'stock_dividend',
                      'etf_dividend',
                      'bond_coupon',
                    ].includes(transactionType);
                    const displayAmount = Math.abs(Number(transactionAmount));
                    const metadata = transaction.transaction_metadata || {};

                    return (
                      <Card
                        key={transactionId}
                        className="p-4 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {transactionDescription}
                              </p>
                              {metadata.ticker && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 rounded text-blue-700 font-medium">
                                  {metadata.ticker}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-xs text-gray-500">
                                {parseLocalDate(
                                  transactionDate
                                ).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                {transactionType.replace(/_/g, ' ')}
                              </span>
                              {metadata.quantity && (
                                <span className="text-xs text-gray-500">
                                  Qty: {Number(metadata.quantity).toFixed(4)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p
                              className={`text-base font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {isPositive ? '+' : '-'}
                              {formatCurrency(displayAmount)}
                            </p>
                            {metadata.price && (
                              <p className="text-xs text-gray-500 mt-1">
                                @ {formatCurrency(Number(metadata.price))}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  {transactions.length > 20 && (
                    <p className="text-xs text-center text-gray-500 py-3">
                      Showing 20 of {transactions.length} transactions
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

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
          onClose();
        }}
      />
    </Dialog>
  );
}
