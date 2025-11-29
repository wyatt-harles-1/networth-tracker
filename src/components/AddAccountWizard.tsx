/**
 * ============================================================================
 * AddAccountWizard Component
 * ============================================================================
 *
 * Multi-step wizard for adding new financial accounts.
 *
 * Wizard Steps:
 * 1. Account Type: Choose asset or liability
 * 2. Category: Select specific account category
 * 3. Details: Enter account name, balance, and icon
 * 4. Confirm: Review and create account
 *
 * Account Types:
 * - Assets: Cash, investments, retirement, real estate, vehicles
 * - Liabilities: Credit cards, mortgages, loans
 *
 * Features:
 * - Step-by-step guided experience
 * - Category templates with descriptions and examples
 * - Icon selection
 * - Balance input with currency formatting
 * - Progress indicator
 * - Back/Next navigation
 * - Form validation
 * - Modal overlay
 *
 * Categories Include:
 * Assets:
 * - Cash & Bank Accounts
 * - Investment Accounts
 * - Retirement Accounts (401k, IRA, Roth IRA)
 * - Real Estate
 * - Vehicles
 * - Other Assets
 *
 * Liabilities:
 * - Credit Cards
 * - Real Estate Loans (Mortgages)
 * - Vehicle Loans
 * - Student Loans
 * - Personal Loans
 * - Other Liabilities
 *
 * ============================================================================
 */

import { useState } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  TrendingUp,
  CreditCard,
  Wallet,
  Building,
  Home,
  Car,
  Coins,
  DollarSign,
  HelpCircle,
  Sparkles,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Available icons for account display
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

const assetCategories = [
  {
    name: 'Cash & Bank Accounts',
    icon: Wallet,
    description: 'Checking, savings, money market',
    examples: 'Chase Checking, Ally Savings',
    taxType: 'taxable',
  },
  {
    name: 'Investment Accounts',
    icon: TrendingUp,
    description: 'Brokerage, stocks, ETFs',
    examples: 'Fidelity Brokerage, Robinhood',
    taxType: 'taxable',
  },
  {
    name: 'Retirement Accounts',
    icon: Building,
    description: '401k, IRA, pension plans',
    examples: '401k, Roth IRA, Traditional IRA',
    taxType: 'tax_deferred',
  },
  {
    name: 'Real Estate',
    icon: Home,
    description: 'Primary home, rental property',
    examples: 'Primary Residence, Rental Property',
    taxType: 'taxable',
  },
  {
    name: 'Vehicles',
    icon: Car,
    description: 'Cars, motorcycles, boats',
    examples: '2020 Toyota Camry, Boat',
    taxType: 'taxable',
  },
  {
    name: 'Other Assets',
    icon: Coins,
    description: 'Collectibles, jewelry, other',
    examples: 'Art Collection, Gold',
    taxType: 'taxable',
  },
];

const liabilityCategories = [
  {
    name: 'Credit Cards',
    icon: CreditCard,
    description: 'Credit card balances',
    examples: 'Chase Sapphire, Amex Gold',
  },
  {
    name: 'Real Estate Loans',
    icon: Home,
    description: 'Mortgages, home equity loans',
    examples: 'Primary Mortgage, HELOC',
  },
  {
    name: 'Vehicle Loans',
    icon: Car,
    description: 'Auto loans, motorcycle loans',
    examples: 'Car Loan, Boat Loan',
  },
  {
    name: 'Student Loans',
    icon: Building,
    description: 'Student loan debt',
    examples: 'Federal Student Loans, Private Loans',
  },
  {
    name: 'Personal Loans',
    icon: DollarSign,
    description: 'Personal lines of credit',
    examples: 'Personal Loan, Line of Credit',
  },
  {
    name: 'Other Liabilities',
    icon: Coins,
    description: 'Other debts and obligations',
    examples: 'Medical Debt, Other Debt',
  },
];

interface AddAccountWizardProps {
  onClose: () => void;
  onSubmit: (accountData: {
    name: string;
    account_type: 'asset' | 'liability';
    category: string;
    current_balance: number;
    icon: string;
    is_visible: boolean;
    tax_type: 'taxable' | 'tax_deferred' | 'tax_free';
    institution?: string;
    account_number_last4?: string;
    notes?: string;
  }) => Promise<{ error?: string }>;
}

export function AddAccountWizard({ onClose, onSubmit }: AddAccountWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [accountType, setAccountType] = useState<'asset' | 'liability' | null>(
    null
  );
  const [category, setCategory] = useState('');
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');
  const [taxType, setTaxType] = useState<
    'taxable' | 'tax_deferred' | 'tax_free'
  >('taxable');
  const [icon, setIcon] = useState('Wallet');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5;

  const selectedCategory = accountType
    ? (accountType === 'asset' ? assetCategories : liabilityCategories).find(
        c => c.name === category
      )
    : null;

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

  const handleSubmit = async () => {
    if (!accountType || !category || !accountName || !balance) {
      return;
    }

    setIsSubmitting(true);

    const balanceNum = parseFloat(balance);
    const adjustedBalance =
      accountType === 'liability' && balanceNum > 0 ? -balanceNum : balanceNum;

    const result = await onSubmit({
      name: accountName.trim(),
      account_type: accountType,
      category,
      current_balance: adjustedBalance,
      icon,
      is_visible: true,
      tax_type: taxType,
      institution: institution || undefined,
      account_number_last4: accountNumberLast4 || undefined,
      notes: notes || undefined,
    });

    setIsSubmitting(false);

    if (!result.error) {
      onClose();
    } else {
      alert(`Failed to add account: ${result.error}`);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return accountType !== null;
      case 2:
        return category !== '';
      case 3:
        return accountName.trim() !== '' && balance !== '';
      case 4:
        return true; // Advanced is optional
      default:
        return true;
    }
  };

  // Auto-set tax type when category is selected
  const handleCategorySelect = (categoryName: string) => {
    setCategory(categoryName);
    const cat = (
      accountType === 'asset' ? assetCategories : liabilityCategories
    ).find(c => c.name === categoryName);
    if (cat && 'taxType' in cat) {
      setTaxType(cat.taxType as 'taxable' | 'tax_deferred' | 'tax_free');
    }
    // Auto-set icon based on category
    if (cat) {
      const iconName = Object.keys(iconMap).find(
        key => iconMap[key as keyof typeof iconMap] === cat.icon
      );
      if (iconName) {
        setIcon(iconName);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Add New Account
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
        <div className="px-6 pt-4">
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Account Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  What type of account?
                </h3>
                <p className="text-gray-600">
                  Choose whether this is money you own or money you owe
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Asset Card */}
                <Card
                  onClick={() => setAccountType('asset')}
                  className={cn(
                    'p-6 cursor-pointer transition-all hover:shadow-lg border-2',
                    accountType === 'asset'
                      ? 'border-green-600 bg-green-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-green-300'
                  )}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div
                      className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center transition-all',
                        accountType === 'asset'
                          ? 'bg-green-600'
                          : 'bg-green-100'
                      )}
                    >
                      <TrendingUp
                        className={cn(
                          'w-8 h-8',
                          accountType === 'asset'
                            ? 'text-white'
                            : 'text-green-600'
                        )}
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">Asset</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Money you own
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Bank accounts, investments, property, vehicles
                      </p>
                    </div>
                    {accountType === 'asset' && (
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </Card>

                {/* Liability Card */}
                <Card
                  onClick={() => setAccountType('liability')}
                  className={cn(
                    'p-6 cursor-pointer transition-all hover:shadow-lg border-2',
                    accountType === 'liability'
                      ? 'border-red-600 bg-red-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-red-300'
                  )}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div
                      className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center transition-all',
                        accountType === 'liability'
                          ? 'bg-red-600'
                          : 'bg-red-100'
                      )}
                    >
                      <CreditCard
                        className={cn(
                          'w-8 h-8',
                          accountType === 'liability'
                            ? 'text-white'
                            : 'text-red-600'
                        )}
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">
                        Liability
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Money you owe
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Credit cards, loans, mortgages, debt
                      </p>
                    </div>
                    {accountType === 'liability' && (
                      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Category Selection */}
          {currentStep === 2 && accountType && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Select a category
                </h3>
                <p className="text-gray-600">
                  What type of {accountType === 'asset' ? 'asset' : 'liability'}{' '}
                  is this?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(accountType === 'asset'
                  ? assetCategories
                  : liabilityCategories
                ).map(cat => {
                  const IconComponent = cat.icon;
                  return (
                    <Card
                      key={cat.name}
                      onClick={() => handleCategorySelect(cat.name)}
                      className={cn(
                        'p-4 cursor-pointer transition-all hover:shadow-md border-2',
                        category === cat.name
                          ? accountType === 'asset'
                            ? 'border-green-600 bg-green-50'
                            : 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                            category === cat.name
                              ? accountType === 'asset'
                                ? 'bg-green-600'
                                : 'bg-red-600'
                              : accountType === 'asset'
                                ? 'bg-green-100'
                                : 'bg-red-100'
                          )}
                        >
                          <IconComponent
                            className={cn(
                              'w-5 h-5',
                              category === cat.name
                                ? 'text-white'
                                : accountType === 'asset'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {cat.name}
                            </h4>
                            {category === cat.name && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {cat.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 italic">
                            e.g., {cat.examples}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Account Details */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Account details
                </h3>
                <p className="text-gray-600">
                  Tell us about your {selectedCategory?.name.toLowerCase()}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="account-name"
                    className="text-sm font-medium text-gray-900"
                  >
                    Account Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="account-name"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder={`e.g., ${selectedCategory?.examples.split(',')[0]}`}
                    className="mt-1"
                    autoFocus
                  />
                </div>

                <div>
                  <Label
                    htmlFor="balance"
                    className="text-sm font-medium text-gray-900"
                  >
                    {accountType === 'asset'
                      ? 'Current Balance'
                      : 'Amount Owed'}{' '}
                    <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      value={balance}
                      onChange={e => setBalance(e.target.value)}
                      placeholder="0.00"
                      className="pl-8"
                    />
                  </div>
                  {accountType === 'liability' &&
                    balance &&
                    parseFloat(balance) > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        We'll automatically make this negative for you
                      </p>
                    )}
                </div>

                <div>
                  <Label
                    htmlFor="institution"
                    className="text-sm font-medium text-gray-900"
                  >
                    Institution (Optional)
                  </Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="e.g., Chase, Fidelity, Wells Fargo"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="account-last4"
                    className="text-sm font-medium text-gray-900"
                  >
                    Account Number - Last 4 Digits (Optional)
                  </Label>
                  <Input
                    id="account-last4"
                    value={accountNumberLast4}
                    onChange={e => {
                      const value = e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 4);
                      setAccountNumberLast4(value);
                    }}
                    placeholder="1234"
                    maxLength={4}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Helps you identify the account later
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Advanced Options */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Advanced options
                </h3>
                <p className="text-gray-600">
                  Customize how this account appears and is treated
                </p>
              </div>

              <div className="space-y-6">
                {accountType === 'asset' && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm font-medium text-gray-900">
                        Tax Treatment
                      </Label>
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                          This helps with tax impact analysis in the Insights
                          tab
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        {
                          value: 'taxable',
                          label: 'Taxable',
                          description: 'Brokerage, checking, savings',
                        },
                        {
                          value: 'tax_deferred',
                          label: 'Tax-Deferred',
                          description: '401k, Traditional IRA',
                        },
                        {
                          value: 'tax_free',
                          label: 'Tax-Free',
                          description: 'Roth IRA, Roth 401k, HSA',
                        },
                      ].map(option => (
                        <Card
                          key={option.value}
                          onClick={() =>
                            setTaxType(
                              option.value as
                                | 'taxable'
                                | 'tax_deferred'
                                | 'tax_free'
                            )
                          }
                          className={cn(
                            'p-3 cursor-pointer transition-all border-2',
                            taxType === option.value
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                                taxType === option.value
                                  ? 'border-blue-600 bg-blue-600'
                                  : 'border-gray-300'
                              )}
                            >
                              {taxType === option.value && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {option.label}
                              </p>
                              <p className="text-xs text-gray-600">
                                {option.description}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2 block">
                    Account Icon
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(iconMap).map(
                      ([iconName, IconComponent]) => (
                        <Card
                          key={iconName}
                          onClick={() => setIcon(iconName)}
                          className={cn(
                            'p-3 cursor-pointer transition-all border-2 flex flex-col items-center justify-center gap-1',
                            icon === iconName
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <IconComponent
                            className={cn(
                              'w-6 h-6',
                              icon === iconName
                                ? 'text-blue-600'
                                : 'text-gray-600'
                            )}
                          />
                          <span className="text-xs text-gray-600">
                            {iconName}
                          </span>
                        </Card>
                      )
                    )}
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
                    placeholder="Add any additional notes about this account..."
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Review your account
                </h3>
                <p className="text-gray-600">
                  Make sure everything looks correct
                </p>
              </div>

              {/* Preview Card */}
              <Card className="p-4 border-2 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shadow-md',
                      accountType === 'asset'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-red-500 to-rose-600'
                    )}
                  >
                    {(() => {
                      const IconComponent =
                        iconMap[icon as keyof typeof iconMap] || Wallet;
                      return <IconComponent className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {accountName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {category}
                      {institution && ` • ${institution}`}
                      {accountNumberLast4 && ` (•••${accountNumberLast4})`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {accountType === 'liability' &&
                        parseFloat(balance) > 0 &&
                        '-'}
                      $
                      {parseFloat(balance || '0').toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    This account will be visible in your portfolio
                  </span>
                </div>
              </Card>

              {/* Summary Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Account Type</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">
                    {accountType}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Category</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {category}
                  </span>
                </div>
                {accountType === 'asset' && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Tax Treatment</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {taxType.replace('_', '-')}
                    </span>
                  </div>
                )}
                {notes && (
                  <div className="py-2">
                    <span className="text-sm text-gray-600 block mb-1">
                      Notes
                    </span>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Edit Links */}
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  { step: 1, label: 'Type' },
                  { step: 2, label: 'Category' },
                  { step: 3, label: 'Details' },
                  { step: 4, label: 'Options' },
                ].map(({ step, label }) => (
                  <Button
                    key={step}
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(step)}
                    className="text-xs"
                  >
                    Edit {label}
                  </Button>
                ))}
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
                Creating...
              </>
            ) : currentStep === totalSteps ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Account
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
