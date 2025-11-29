import { useState, useEffect } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, Plus, X, Save } from 'lucide-react';
import { TickerAutocomplete } from './TickerAutocomplete';
import { LotTrackingService } from '@/services/lotTrackingService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Transaction,
  TransactionInsert,
  TransactionMetadata,
  TRANSACTION_TYPES,
  TRANSACTION_CATEGORIES,
  TransactionCategory,
} from '@/types/transaction';

interface Account {
  id: string;
  name: string;
  account_type: string;
  category: string;
  current_balance: number;
  icon: string;
  is_visible: boolean;
  institution: string | null;
  account_number_last4: string | null;
  notes: string | null;
  tax_type: 'taxable' | 'tax_deferred' | 'tax_free' | null;
  created_at: string;
  updated_at: string;
}

interface TransactionFormNewProps {
  accountId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  editTransaction?: Transaction;
  defaultAccountId?: string;
  onSubmit?: (
    data: Partial<TransactionInsert>
  ) => Promise<{ error: string | null }>;
  onTransactionAdded?: () => void;
}

export function TransactionFormNew({
  accountId,
  onSuccess,
  onCancel,
  editTransaction,
  defaultAccountId,
  onSubmit,
  onTransactionAdded,
}: TransactionFormNewProps) {
  const { addTransaction, updateTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { user } = useAuth();

  const [selectedAccount, setSelectedAccount] = useState(
    defaultAccountId || accountId || ''
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionType, setTransactionType] = useState('stock_buy');
  const [ticker, setTicker] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [dividendAmount, setDividendAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accountId) {
      setSelectedAccount(accountId);
    }
  }, [accountId]);

  useEffect(() => {
    if (editTransaction) {
      // Extract Transaction properties with type-safe checks
      const transactionDate =
        'transaction_date' in editTransaction
          ? (editTransaction['transaction_date'] as string)
          : new Date().toISOString().split('T')[0];
      const transactionType =
        'transaction_type' in editTransaction
          ? (editTransaction['transaction_type'] as string)
          : 'stock_buy';
      const accountId =
        'account_id' in editTransaction
          ? (editTransaction['account_id'] as string | null)
          : null;
      const amount =
        'amount' in editTransaction ? (editTransaction['amount'] as number) : 0;

      setDate(transactionDate);
      setTransactionType(transactionType);
      setSelectedAccount(accountId || '');
      setTotalAmount(Math.abs(amount).toString());

      const meta = editTransaction.transaction_metadata;
      setTicker(meta.ticker || '');
      setPrice(meta.price?.toString() || '');
      setQuantity(meta.quantity?.toString() || '');
      setStrikePrice(meta.strikePrice?.toString() || '');
      setExpirationDate(meta.expirationDate || '');
      setDividendAmount(meta.dividendAmount?.toString() || '');
      setNotes(meta.notes || '');
    }
  }, [editTransaction]);

  const selectedTypeConfig = TRANSACTION_TYPES.find(
    t => t.value === transactionType
  );
  const requiredFields = selectedTypeConfig?.requiredFields || [];
  const optionalFields = selectedTypeConfig?.optionalFields || [];

  const needsTicker =
    requiredFields.includes('ticker') || optionalFields.includes('ticker');
  const needsPrice =
    requiredFields.includes('price') || optionalFields.includes('price');
  const needsQuantity =
    requiredFields.includes('quantity') || optionalFields.includes('quantity');
  const needsStrikePrice =
    requiredFields.includes('strikePrice') ||
    optionalFields.includes('strikePrice');
  const needsExpirationDate =
    requiredFields.includes('expirationDate') ||
    optionalFields.includes('expirationDate');
  const needsDividendAmount =
    requiredFields.includes('dividendAmount') ||
    optionalFields.includes('dividendAmount');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date || !transactionType) {
      setError('Please fill in all required fields');
      return;
    }

    if (requiredFields.includes('ticker') && !ticker.trim()) {
      setError('Ticker symbol is required for this transaction type');
      return;
    }

    if (
      requiredFields.includes('quantity') &&
      (!quantity || parseFloat(quantity) <= 0)
    ) {
      setError('Quantity is required for this transaction type');
      return;
    }

    if (
      requiredFields.includes('price') &&
      (!price || parseFloat(price) <= 0)
    ) {
      setError('Price is required for this transaction type');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    setSubmitting(true);

    const metadata: TransactionMetadata = {};
    if (ticker) metadata.ticker = ticker.toUpperCase();
    if (price) metadata.price = parseFloat(price);
    if (quantity) metadata.quantity = parseFloat(quantity);
    if (strikePrice) metadata.strikePrice = parseFloat(strikePrice);
    if (expirationDate) metadata.expirationDate = expirationDate;
    if (dividendAmount) metadata.dividendAmount = parseFloat(dividendAmount);
    if (notes) metadata.notes = notes;

    let finalAmount = parseFloat(totalAmount);

    if (
      transactionType.includes('sell') &&
      ticker &&
      quantity &&
      price &&
      selectedAccount &&
      user
    ) {
      const sellResult = await LotTrackingService.sellShares(
        user.id,
        selectedAccount,
        ticker,
        parseFloat(quantity),
        parseFloat(price),
        date
      );

      if (sellResult.data) {
        const saleProceeds = parseFloat(quantity) * parseFloat(price);
        finalAmount = saleProceeds;
      }
    }

    if (
      transactionType.includes('fee') ||
      transactionType.includes('withdrawal')
    ) {
      finalAmount = -Math.abs(finalAmount);
    } else {
      finalAmount = Math.abs(finalAmount);
    }

    const transactionData: Partial<TransactionInsert> = {
      account_id: selectedAccount || null,
      transaction_date: date,
      description: ticker
        ? `${selectedTypeConfig?.label} - ${ticker}`
        : selectedTypeConfig?.label || 'Transaction',
      amount: finalAmount,
      transaction_type: transactionType,
      category: null,
      transaction_metadata: metadata,
      data_source: 'manual',
      external_transaction_id: null,
      is_reviewed: true,
    };

    let result;
    if (onSubmit) {
      result = await onSubmit(transactionData);
    } else if (editTransaction) {
      const transactionId =
        'id' in editTransaction ? (editTransaction['id'] as string) : '';
      if (!transactionId) {
        setError('Transaction ID is missing');
        setSubmitting(false);
        return;
      }
      result = await updateTransaction(transactionId, transactionData);
    } else {
      result = await addTransaction(transactionData as TransactionInsert);
    }

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      resetForm();
      setSubmitting(false);
      if (onTransactionAdded) {
        onTransactionAdded();
      }
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const resetForm = () => {
    if (!editTransaction) {
      setTicker('');
      setPrice('');
      setQuantity('');
      setTotalAmount('');
      setStrikePrice('');
      setExpirationDate('');
      setDividendAmount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setTransactionType('stock_buy');
    }
  };

  const handleTypeChange = (newType: string) => {
    setTransactionType(newType);
    setTicker('');
    setPrice('');
    setQuantity('');
    setTotalAmount('');
    setStrikePrice('');
    setExpirationDate('');
    setDividendAmount('');
  };

  const groupedTypes: Record<string, typeof TRANSACTION_TYPES> = {};
  TRANSACTION_TYPES.forEach(type => {
    if (!groupedTypes[type.category]) {
      groupedTypes[type.category] = [];
    }
    groupedTypes[type.category].push(type);
  });

  return (
    <Card className="p-4 bg-gray-50 border-0">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label
              htmlFor="transaction-date"
              className="text-gray-900 font-medium"
            >
              Date *
            </Label>
            <Input
              id="transaction-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={submitting}
              required
              className="mt-1 [&:autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:hover]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:focus]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:active]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)] "
            />
          </div>

          <div>
            <Label
              htmlFor="transaction-type"
              className="text-gray-900 font-medium"
            >
              Type *
            </Label>
            <select
              id="transaction-type"
              value={transactionType}
              onChange={e => handleTypeChange(e.target.value)}
              disabled={submitting}
              className="mt-1 w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
            >
              {Object.entries(groupedTypes).map(([category, types]) => (
                <optgroup
                  key={category}
                  label={
                    TRANSACTION_CATEGORIES[category as TransactionCategory]
                  }
                >
                  {types.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {!accountId && !defaultAccountId && (
            <div className="md:col-start-2">
              <Label
                htmlFor="transaction-account"
                className="text-gray-900 font-medium"
              >
                Account
              </Label>
              <select
                id="transaction-account"
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                disabled={submitting}
                className="mt-1 w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
              >
                <option value="">No account</option>
                {accounts.map((account: Account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {needsTicker && (
          <div>
            <Label htmlFor="ticker" className="text-gray-900 font-medium">
              Ticker Symbol {requiredFields.includes('ticker') && '*'}
            </Label>
            <TickerAutocomplete
              value={ticker}
              onChange={setTicker}
              disabled={submitting}
              placeholder="e.g., AAPL, MSFT, BTC"
            />
          </div>
        )}

        {(needsPrice || needsQuantity) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Amount */}
            <div>
              <Label
                htmlFor="totalAmount"
                className="text-gray-900 font-medium"
              >
                Total Amount *
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  $
                </span>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                  required
                  className="pl-7"
                />
              </div>
            </div>

            {/* Quantity */}
            {needsQuantity && (
              <div>
                <Label htmlFor="quantity" className="text-gray-900 font-medium">
                  Quantity {requiredFields.includes('quantity') ? '*' : ''}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.00000001"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0"
                  disabled={submitting}
                  required={requiredFields.includes('quantity')}
                  className="mt-1"
                />
              </div>
            )}

            {/* Price per Unit */}
            {needsPrice && (
              <div>
                <Label htmlFor="price" className="text-gray-900 font-medium">
                  Price per Unit {requiredFields.includes('price') ? '*' : ''}
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    $
                  </span>
                  <Input
                    id="price"
                    type="number"
                    step="0.0001"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    disabled={submitting}
                    required={requiredFields.includes('price')}
                    className="pl-7"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!needsPrice && !needsQuantity && (
          <div>
            <Label htmlFor="amount" className="text-gray-900 font-medium">
              Amount *
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
                required
                className="pl-7 [&:autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:hover]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:focus]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)] "
              />
            </div>
          </div>
        )}

        {needsStrikePrice && (
          <div>
            <Label htmlFor="strike-price" className="text-gray-900 font-medium">
              Strike Price {requiredFields.includes('strikePrice') && '*'}
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                $
              </span>
              <Input
                id="strike-price"
                type="number"
                step="0.01"
                value={strikePrice}
                onChange={e => setStrikePrice(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
                className="pl-7 [&:autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:hover]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:focus]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)] "
              />
            </div>
          </div>
        )}

        {needsExpirationDate && (
          <div>
            <Label
              htmlFor="expiration-date"
              className="text-gray-900 font-medium"
            >
              Expiration Date {requiredFields.includes('expirationDate') && '*'}
            </Label>
            <Input
              id="expiration-date"
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
              disabled={submitting}
              className="mt-1"
            />
          </div>
        )}

        {needsDividendAmount && (
          <div>
            <Label
              htmlFor="dividend-amount"
              className="text-gray-900 font-medium"
            >
              Dividend Per Share{' '}
              {requiredFields.includes('dividendAmount') && '*'}
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                $
              </span>
              <Input
                id="dividend-amount"
                type="number"
                step="0.0001"
                value={dividendAmount}
                onChange={e => setDividendAmount(e.target.value)}
                placeholder="0.0000"
                disabled={submitting}
                className="pl-7"
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="notes" className="text-gray-900 font-medium">
            Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any additional details about this transaction..."
            disabled={submitting}
            className="mt-1 min-h-[80px]"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editTransaction ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                {editTransaction ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Transaction
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </>
                )}
              </>
            )}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
