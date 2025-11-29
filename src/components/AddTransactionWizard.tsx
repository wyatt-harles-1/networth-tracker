/**
 * ============================================================================
 * AddTransactionWizard Component
 * ============================================================================
 *
 * Multi-step wizard for adding investment transactions.
 *
 * Wizard Steps:
 * 1. Account Selection: Choose which account for the transaction
 * 2. Transaction Category: Select transaction type category (stock, crypto, etc.)
 * 3. Transaction Type: Choose specific transaction type (buy, sell, etc.)
 * 4. Transaction Details: Enter amount, date, quantity, ticker, etc.
 * 5. Confirmation: Review and create transaction
 *
 * Transaction Categories:
 * - Stock: Buy, sell, dividend, split
 * - ETF: Buy, sell, distribution
 * - Options: Buy/sell calls/puts, exercise, expire
 * - Crypto: Buy, sell, stake, unstake
 * - Bond: Purchase, sell, maturity, coupon
 * - Other: Deposit, withdrawal, fee, transfer
 *
 * Features:
 * - Guided step-by-step experience
 * - Dynamic form fields based on transaction type
 * - Ticker autocomplete with search
 * - Date picker
 * - Amount and quantity input with validation
 * - Required field indicators
 * - Progress tracking
 * - Back/Next navigation
 * - Smart amount calculation (quantity × price)
 * - Form validation before submission
 *
 * Required Fields by Type:
 * - Stock Buy/Sell: ticker, quantity, price
 * - Dividend: ticker
 * - Options: ticker, quantity, price, strike price, expiration
 * - Crypto: ticker, quantity, price
 * - Other: amount only
 *
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  TrendingUp,
  TrendingDown,
  Zap,
  Bitcoin,
  FileText,
  DollarSign,
  Calendar,
  Sparkles,
  Wallet,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn, parseLocalDate } from '@/lib/utils';
import { TickerAutocomplete } from './TickerAutocomplete';
import {
  TRANSACTION_TYPES,
  TRANSACTION_CATEGORIES,
  TransactionCategory,
  TransactionInsert,
  Transaction,
} from '@/types/transaction';

// Icons for each transaction category
const categoryIcons: Record<TransactionCategory, LucideIcon> = {
  stock: TrendingUp,
  etf: TrendingUp,
  options: Zap,
  crypto: Bitcoin,
  bond: FileText,
  other: DollarSign,
};

const categoryDescriptions: Record<TransactionCategory, string> = {
  stock: 'Buy, sell stocks and receive dividends',
  etf: 'Buy, sell ETFs and receive distributions',
  options: 'Trade call and put options',
  crypto: 'Buy, sell, and stake cryptocurrency',
  bond: 'Purchase bonds and receive coupon payments',
  other: 'Deposits, withdrawals, fees, and transfers',
};

interface Account {
  id: string;
  name: string;
  account_type: string;
  category: string;
  icon: string;
}

interface TransactionMetadata {
  ticker?: string;
  price?: number;
  quantity?: number;
  fee?: number;
  strikePrice?: number;
  expirationDate?: string;
  dividendAmount?: number;
  notes?: string;
}

interface AddTransactionWizardProps {
  onClose: () => void;
  onSubmit: (
    transactionData: Partial<TransactionInsert>
  ) => Promise<{ error?: string }>;
  defaultAccountId?: string;
  accounts: Account[];
  editingTransaction?: Transaction;
}

export function AddTransactionWizard({
  onClose,
  onSubmit,
  defaultAccountId,
  accounts,
  editingTransaction,
}: AddTransactionWizardProps) {
  const [currentStep, setCurrentStep] = useState(defaultAccountId ? 1 : 1);
  const [category, setCategory] = useState<TransactionCategory | null>(null);
  const [transactionType, setTransactionType] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(
    defaultAccountId || ''
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [fee, setFee] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [dividendAmount, setDividendAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = defaultAccountId ? 5 : 6;

  /**
   * Populate form fields when editing an existing transaction
   */
  useEffect(() => {
    if (editingTransaction) {
      const metadata = editingTransaction.transaction_metadata || {};

      // Set account
      if ('account_id' in editingTransaction && editingTransaction.account_id) {
        setSelectedAccount(editingTransaction.account_id as string);
      }

      // Set date
      if (
        'transaction_date' in editingTransaction &&
        editingTransaction.transaction_date
      ) {
        setDate(editingTransaction.transaction_date as string);
      }

      // Set transaction type and derive category from it
      if (
        'transaction_type' in editingTransaction &&
        editingTransaction.transaction_type
      ) {
        const transactionType = editingTransaction.transaction_type as string;
        setTransactionType(transactionType);
        const typeConfig = TRANSACTION_TYPES.find(
          t => t.value === transactionType
        );
        if (typeConfig) {
          setCategory(typeConfig.category);
        }
      }

      // Set metadata fields
      if (metadata.ticker) setTicker(metadata.ticker);
      if (metadata.quantity) setQuantity(String(metadata.quantity));
      if (metadata.price) setPrice(String(metadata.price));
      if (metadata.fee) setFee(String(metadata.fee));
      if (metadata.strikePrice) setStrikePrice(String(metadata.strikePrice));
      if (metadata.expirationDate) setExpirationDate(metadata.expirationDate);
      if (metadata.dividendAmount)
        setDividendAmount(String(metadata.dividendAmount));
      if (metadata.notes) setNotes(metadata.notes);

      // Calculate total amount from quantity, price, and fee
      if (metadata.quantity && metadata.price) {
        const subtotal = metadata.quantity * metadata.price;
        const feeAmount = metadata.fee || 0;
        setTotalAmount(String(subtotal + feeAmount));
      } else if ('amount' in editingTransaction && editingTransaction.amount) {
        setTotalAmount(String(Math.abs(editingTransaction.amount as number)));
      }
    }
  }, [editingTransaction]);

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

  /**
   * Get step title and description based on current step
   */
  const getStepInfo = () => {
    // When defaultAccountId exists: steps are 1-5 (skip account selection)
    // When no defaultAccountId: steps are 1-6 (include account selection)

    if (defaultAccountId) {
      // Steps 1-5 without account selection
      switch (currentStep) {
        case 1:
          return { title: 'Transaction Category', description: 'Choose the category that best fits your transaction' };
        case 2:
          return { title: 'Transaction Type', description: 'Select the specific type of transaction' };
        case 3:
          return { title: 'Date & Ticker', description: 'When did this transaction occur?' };
        case 4:
          return { title: 'Transaction Details', description: 'Enter quantity, price, and any fees' };
        case 5:
          return { title: 'Additional Details', description: 'Review and add any notes' };
        default:
          return { title: '', description: '' };
      }
    } else {
      // Steps 1-6 with account selection
      switch (currentStep) {
        case 1:
          return { title: 'Transaction Category', description: 'Choose the category that best fits your transaction' };
        case 2:
          return { title: 'Transaction Type', description: 'Select the specific type of transaction' };
        case 3:
          return { title: 'Select Account', description: 'Choose which account this transaction belongs to' };
        case 4:
          return { title: 'Date & Ticker', description: 'When did this transaction occur?' };
        case 5:
          return { title: 'Transaction Details', description: 'Enter quantity, price, and any fees' };
        case 6:
          return { title: 'Additional Details', description: 'Review and add any notes' };
        default:
          return { title: '', description: '' };
      }
    }
  };

  const stepInfo = getStepInfo();

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCategorySelect = (cat: TransactionCategory) => {
    setCategory(cat);
    setTransactionType(''); // Reset transaction type when category changes
  };

  const handleTypeSelect = (type: string) => {
    setTransactionType(type);
    // Reset conditional fields
    setTicker('');
    setQuantity('');
    setPrice('');
    setStrikePrice('');
    setExpirationDate('');
    setDividendAmount('');
  };

  const handleSubmit = async () => {
    if (!transactionType || !date || !totalAmount) {
      return;
    }

    setIsSubmitting(true);

    const metadata: TransactionMetadata = {};
    if (ticker) metadata.ticker = ticker.toUpperCase();
    if (price) metadata.price = parseFloat(price);
    if (quantity) metadata.quantity = parseFloat(quantity);
    if (fee) metadata.fee = parseFloat(fee);
    if (strikePrice) metadata.strikePrice = parseFloat(strikePrice);
    if (expirationDate) metadata.expirationDate = expirationDate;
    if (dividendAmount) metadata.dividendAmount = parseFloat(dividendAmount);
    if (notes) metadata.notes = notes;

    // Calculate final amount: if quantity and price are set, calculate from those plus fee
    let finalAmount;
    if (quantity && price) {
      const subtotal = parseFloat(quantity) * parseFloat(price);
      const feeAmount = fee ? parseFloat(fee) : 0;
      finalAmount = subtotal + feeAmount;
    } else {
      finalAmount = parseFloat(totalAmount);
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

    const result = await onSubmit(transactionData);

    setIsSubmitting(false);

    if (!result.error) {
      onClose();
    } else {
      alert(`Failed to add transaction: ${result.error}`);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return category !== null;
      case 2:
        return transactionType !== '';
      case 3:
        return !defaultAccountId ? selectedAccount !== '' : true;
      case 4:
        if (defaultAccountId) {
          // This is the date & ticker step for accounts with defaultAccountId
          if (needsTicker && requiredFields.includes('ticker')) {
            return date !== '' && ticker.trim() !== '';
          }
          return date !== '';
        } else {
          // This is the date & ticker step for general flow
          if (needsTicker && requiredFields.includes('ticker')) {
            return date !== '' && ticker.trim() !== '';
          }
          return date !== '';
        }
      case 5:
        if (defaultAccountId) {
          // This is the amount step for accounts with defaultAccountId
          if (needsQuantity && requiredFields.includes('quantity')) {
            return totalAmount !== '' && quantity !== '' && price !== '';
          }
          return totalAmount !== '';
        } else {
          // This is the amount step for general flow
          if (needsQuantity && requiredFields.includes('quantity')) {
            return totalAmount !== '' && quantity !== '' && price !== '';
          }
          return totalAmount !== '';
        }
      default:
        return true;
    }
  };

  const renderAccountStep = () => {
    if (defaultAccountId) return null;

    return (
      <div className="space-y-4 animate-in slide-in-from-right duration-300">
        <div className="space-y-2">
          {accounts.map(account => (
            <Card
              key={account.id}
              onClick={() => setSelectedAccount(account.id)}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md border-2',
                selectedAccount === account.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      account.account_type === 'asset'
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    )}
                  >
                    <Wallet
                      className={cn(
                        'w-5 h-5',
                        account.account_type === 'asset'
                          ? 'text-green-600'
                          : 'text-red-600'
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-600">{account.category}</p>
                  </div>
                </div>
                {selectedAccount === account.id && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </Card>
          ))}

          <Card
            onClick={() => setSelectedAccount('')}
            className={cn(
              'p-4 cursor-pointer transition-all hover:shadow-md border-2',
              selectedAccount === ''
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                  <X className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    No Account
                  </p>
                  <p className="text-xs text-gray-600">
                    Unassigned transaction
                  </p>
                </div>
              </div>
              {selectedAccount === '' && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-white">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                </h2>
                <p className="text-sm text-gray-500">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                      step === currentStep
                        ? 'bg-blue-600 text-white scale-110'
                        : step < currentStep
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {step < currentStep ? <Check className="w-4 h-4" /> : step}
                  </div>
                  {step < totalSteps && (
                    <div
                      className={cn(
                        'flex-1 h-1 mx-2 transition-all',
                        step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step Description */}
            <div className="text-center pt-6 pb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {stepInfo.title}
              </h3>
              <p className="text-gray-600">{stepInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Category Selection */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(TRANSACTION_CATEGORIES).map(([key, label]) => {
                  const cat = key as TransactionCategory;
                  const IconComponent = categoryIcons[cat];
                  return (
                    <Card
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className={cn(
                        'p-4 cursor-pointer transition-all hover:shadow-md border-2',
                        category === cat
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300'
                      )}
                    >
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                            category === cat ? 'bg-blue-600' : 'bg-blue-100'
                          )}
                        >
                          <IconComponent
                            className={cn(
                              'w-6 h-6',
                              category === cat ? 'text-white' : 'text-blue-600'
                            )}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">
                            {label}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {categoryDescriptions[cat]}
                          </p>
                        </div>
                        {category === cat && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Transaction Type Selection */}
          {currentStep === 2 && category && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TRANSACTION_TYPES.filter(t => t.category === category).map(
                  type => (
                    <Card
                      key={type.value}
                      onClick={() => handleTypeSelect(type.value)}
                      className={cn(
                        'p-4 cursor-pointer transition-all hover:shadow-md border-2',
                        transactionType === type.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {type.value.includes('buy') ||
                          type.value.includes('purchase') ? (
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            </div>
                          ) : type.value.includes('sell') ? (
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                          <p className="text-sm font-semibold text-gray-900">
                            {type.label}
                          </p>
                        </div>
                        {transactionType === type.value && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </Card>
                  )
                )}
              </div>
            </div>
          )}

          {/* Step 3: Account Selection (only if no defaultAccountId) */}
          {!defaultAccountId && currentStep === 3 && renderAccountStep()}

          {/* Step 4/3: Date & Ticker */}
          {currentStep === (defaultAccountId ? 3 : 4) && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="date"
                    className="text-sm font-medium text-gray-900"
                  >
                    Transaction Date <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>

                {needsTicker && (
                  <div>
                    <Label
                      htmlFor="ticker"
                      className="text-sm font-medium text-gray-900"
                    >
                      Ticker Symbol{' '}
                      {requiredFields.includes('ticker') && (
                        <span className="text-red-600">*</span>
                      )}
                    </Label>
                    <TickerAutocomplete
                      value={ticker}
                      onChange={setTicker}
                      placeholder="e.g., AAPL, MSFT, BTC"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the stock, ETF, or crypto symbol
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5/4: Quantity, Average Price, Fee */}
          {currentStep === (defaultAccountId ? 4 : 5) && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="space-y-4">
                {needsQuantity && (
                  <div>
                    <Label
                      htmlFor="quantity"
                      className="text-sm font-medium text-gray-900"
                    >
                      Quantity{' '}
                      {requiredFields.includes('quantity') && (
                        <span className="text-red-600">*</span>
                      )}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.00000001"
                      value={quantity}
                      onChange={e => {
                        setQuantity(e.target.value);
                        // Auto-calculate total amount if price is set (including fee)
                        if (price && e.target.value) {
                          // Round subtotal to 2 decimals first
                          const subtotal =
                            Math.round(
                              parseFloat(e.target.value) *
                                parseFloat(price) *
                                100
                            ) / 100;
                          const feeAmount = fee ? parseFloat(fee) : 0;
                          const total = subtotal + feeAmount;
                          setTotalAmount(total.toFixed(2));
                        }
                      }}
                      placeholder="0"
                      className="mt-1"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of shares or units
                    </p>
                  </div>
                )}

                {needsPrice && (
                  <div>
                    <Label
                      htmlFor="price"
                      className="text-sm font-medium text-gray-900"
                    >
                      Average Price{' '}
                      {requiredFields.includes('price') && (
                        <span className="text-red-600">*</span>
                      )}
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="price"
                        type="number"
                        step="0.0001"
                        value={price}
                        onChange={e => {
                          setPrice(e.target.value);
                          // Auto-calculate total amount if quantity is set (including fee)
                          if (quantity && e.target.value) {
                            // Round subtotal to 2 decimals first
                            const subtotal =
                              Math.round(
                                parseFloat(quantity) *
                                  parseFloat(e.target.value) *
                                  100
                              ) / 100;
                            const feeAmount = fee ? parseFloat(fee) : 0;
                            const total = subtotal + feeAmount;
                            setTotalAmount(total.toFixed(2));
                          }
                        }}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Price per share or unit
                    </p>
                  </div>
                )}

                <div>
                  <Label
                    htmlFor="fee"
                    className="text-sm font-medium text-gray-900"
                  >
                    Fee (Optional)
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      value={fee}
                      onChange={e => {
                        setFee(e.target.value);
                        // Recalculate total amount if quantity and price are set
                        if (quantity && price) {
                          // Round subtotal to 2 decimals first
                          const subtotal =
                            Math.round(
                              parseFloat(quantity) * parseFloat(price) * 100
                            ) / 100;
                          const feeAmount = e.target.value
                            ? parseFloat(e.target.value)
                            : 0;
                          const total = subtotal + feeAmount;
                          setTotalAmount(total.toFixed(2));
                        }
                      }}
                      placeholder="0.00"
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Commission or transaction fee
                  </p>
                </div>

                {/* Calculated Total Display */}
                {quantity && price && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Subtotal:
                      </span>
                      <span className="text-base font-semibold text-gray-900">
                        ${(parseFloat(quantity) * parseFloat(price)).toFixed(2)}
                      </span>
                    </div>
                    {fee && parseFloat(fee) > 0 && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Fee:
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          ${parseFloat(fee).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-blue-300">
                      <span className="text-sm font-bold text-gray-900">
                        Total Amount:
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        $
                        {(() => {
                          // Round subtotal to 2 decimals first, then add fee
                          const subtotal =
                            Math.round(
                              parseFloat(quantity) * parseFloat(price) * 100
                            ) / 100;
                          const total = subtotal + (fee ? parseFloat(fee) : 0);
                          return total.toFixed(2);
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                {/* For transactions that don't need quantity/price, show simple amount field */}
                {!needsQuantity && !needsPrice && (
                  <div>
                    <Label
                      htmlFor="totalAmount"
                      className="text-sm font-medium text-gray-900"
                    >
                      Total Amount <span className="text-red-600">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={e => setTotalAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        autoFocus
                      />
                    </div>
                    {(transactionType.includes('fee') ||
                      transactionType.includes('withdrawal')) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Amount will be recorded as negative
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6/5: Additional Details (Optional) */}
          {currentStep === (defaultAccountId ? 5 : 6) && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="space-y-4">
                {needsStrikePrice && (
                  <div>
                    <Label
                      htmlFor="strikePrice"
                      className="text-sm font-medium text-gray-900"
                    >
                      Strike Price{' '}
                      {requiredFields.includes('strikePrice') && (
                        <span className="text-red-600">*</span>
                      )}
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="strikePrice"
                        type="number"
                        step="0.01"
                        value={strikePrice}
                        onChange={e => setStrikePrice(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                )}

                {needsExpirationDate && (
                  <div>
                    <Label
                      htmlFor="expirationDate"
                      className="text-sm font-medium text-gray-900"
                    >
                      Expiration Date{' '}
                      {requiredFields.includes('expirationDate') && (
                        <span className="text-red-600">*</span>
                      )}
                    </Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={expirationDate}
                      onChange={e => setExpirationDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                {needsDividendAmount && (
                  <div>
                    <Label
                      htmlFor="dividendAmount"
                      className="text-sm font-medium text-gray-900"
                    >
                      Dividend Per Share{' '}
                      {requiredFields.includes('dividendAmount') && (
                        <span className="text-red-600">*</span>
                      )}
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="dividendAmount"
                        type="number"
                        step="0.0001"
                        value={dividendAmount}
                        onChange={e => setDividendAmount(e.target.value)}
                        placeholder="0.0000"
                        className="pl-8"
                      />
                    </div>
                  </div>
                )}

                {/* Summary Preview */}
                <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Transaction Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedTypeConfig?.label}
                      </span>
                    </div>
                    {ticker && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ticker:</span>
                        <span className="font-semibold text-gray-900">
                          {ticker.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold text-gray-900">
                        {parseLocalDate(date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {quantity && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-semibold text-gray-900">
                          {quantity}
                        </span>
                      </div>
                    )}
                    {price && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-semibold text-gray-900">
                          ${price}
                        </span>
                      </div>
                    )}
                    {fee && parseFloat(fee) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fee:</span>
                        <span className="font-semibold text-gray-900">
                          $
                          {parseFloat(fee).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-gray-900 text-lg">
                        $
                        {parseFloat(totalAmount || '0').toLocaleString(
                          'en-US',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="notes"
                    className="text-sm font-medium text-gray-900"
                  >
                    Notes (Optional)
                  </Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add any additional notes about this transaction..."
                    className="mt-1 w-full h-full p-3 border border-gray-300 rounded-md text-sm min-h-[75px] resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button
            onClick={currentStep === totalSteps ? handleSubmit : handleNext}
            disabled={!canProceedFromStep(currentStep) || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {editingTransaction ? 'Saving...' : 'Adding...'}
              </>
            ) : currentStep === totalSteps ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {editingTransaction ? 'Save Changes' : 'Add Transaction'}
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
