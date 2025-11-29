/**
 * ============================================================================
 * Accounts Component
 * ============================================================================
 *
 * Account management page for viewing and managing all financial accounts.
 *
 * Features:
 * - View all accounts organized by category (assets vs liabilities)
 * - Summary metrics showing total assets, liabilities, and net worth
 * - Add new accounts via wizard interface
 * - View detailed account information
 * - Toggle account visibility
 * - Delete accounts
 * - Support for various account types (bank, investment, retirement, etc.)
 *
 * Account Categories:
 * Assets:
 * - Cash & Bank Accounts
 * - Investment Accounts
 * - Retirement Accounts
 * - Real Estate
 * - Vehicles
 * - Other Assets
 *
 * Liabilities:
 * - Credit Cards
 * - Real Estate Loans
 * - Vehicle Loans
 * - Student Loans
 * - Personal Loans
 * - Other Liabilities
 *
 * Sub-components:
 * - AccountCard: Individual account display
 * - AddAccountWizard: Guided account creation
 * - AccountDetailsPage: Detailed account view
 * - SummaryMetricCard: Financial summary cards
 *
 * ============================================================================
 */

import { useState } from 'react';
import {
  Plus,
  Building,
  Wallet,
  CreditCard,
  Home,
  Car,
  Coins,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountDetailsPage } from './AccountDetailsPage';
import { AccountCard } from './AccountCard';
import { SummaryMetricCard } from './SummaryMetricCard';
import { AddAccountWizard } from './AddAccountWizard';

// Icon mapping for account types
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
  'Cash & Bank Accounts',
  'Investment Accounts',
  'Retirement Accounts',
  'Real Estate',
  'Vehicles',
  'Other Assets',
];

const liabilityCategories = [
  'Credit Cards',
  'Real Estate Loans',
  'Vehicle Loans',
  'Student Loans',
  'Personal Loans',
  'Other Liabilities',
];

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
  created_at: string;
}

interface AccountData {
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
}

export function Accounts() {
  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    toggleVisibility,
  } = useAccounts();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDetailsPage, setShowDetailsPage] = useState(false);

  const handleWizardSubmit = async (accountData: AccountData) => {
    const { error } = await addAccount(accountData);
    if (error) {
      return { error };
    }
    return {};
  };

  const handleDeleteAccount = async (accountId: string) => {
    await deleteAccount(accountId);
  };

  const handleToggleVisibility = async (
    accountId: string,
    isVisible?: boolean
  ) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      const newVisibility =
        isVisible !== undefined ? isVisible : !account.is_visible;
      await toggleVisibility(accountId, newVisibility);
    }
  };

  const handleSaveSettings = async (
    accountId: string,
    updates: Partial<Account>
  ) => {
    await updateAccount(accountId, updates);
  };

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account);
    setShowDetailsPage(true);
  };

  const handleBackFromDetails = () => {
    setShowDetailsPage(false);
    setSelectedAccount(null);
  };

  const getAccountsByCategory = (type: 'asset' | 'liability') => {
    const filteredAccounts = accounts.filter(
      account => account.account_type === type
    );
    const categories = type === 'asset' ? assetCategories : liabilityCategories;

    return categories
      .map(category => ({
        category,
        accounts: filteredAccounts.filter(
          account => account.category === category
        ),
      }))
      .filter(group => group.accounts.length > 0);
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    return `${amount < 0 ? '-' : ''}$${absAmount.toLocaleString()}`;
  };

  const getTotalAssets = () => {
    const total = accounts
      .filter(account => account.account_type === 'asset' && account.is_visible)
      .reduce((sum, account) => {
        const balance = Number(account.current_balance) || 0;
        if (balance < 0) {
          console.warn(
            `Asset account "${account.name}" has negative balance: ${balance}`
          );
        }
        return sum + Math.max(0, balance);
      }, 0);
    return total;
  };

  const getTotalLiabilities = () => {
    return Math.abs(
      accounts
        .filter(
          account => account.account_type === 'liability' && account.is_visible
        )
        .reduce((sum, account) => sum + account.current_balance, 0)
    );
  };

  const hasNegativeAssets = () => {
    return accounts.some(
      account =>
        account.account_type === 'asset' &&
        account.is_visible &&
        Number(account.current_balance) < 0
    );
  };

  const getNetWorth = () => {
    return getTotalAssets() - getTotalLiabilities();
  };

  return (
    <div className="p-4 pb-20">
      <div className="space-y-4">
        {/* Header with Summary */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Accounts Overview
          </h2>

          {/* Warning Banner for Negative Asset Balances */}
          {hasNegativeAssets() && (
            <Card className="p-3 mb-4 bg-orange-50 border-orange-200">
              <div className="flex items-start gap-2">
                <span className="text-orange-600 text-sm">
                  <strong>Data Issue Detected:</strong> Some asset accounts have
                  negative balances. This may indicate a data processing error.
                  Please review your account balances.
                </span>
              </div>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <SummaryMetricCard
              label="Total Assets"
              value={formatCurrency(getTotalAssets())}
              variant="green"
            />
            <SummaryMetricCard
              label="Total Liabilities"
              value={formatCurrency(getTotalLiabilities())}
              variant="red"
            />
            <SummaryMetricCard
              label="Net Worth"
              value={formatCurrency(getNetWorth())}
              variant="blue"
            />
          </div>
        </div>

        {/* Add Account Button */}
        <Card className="p-4 bg-white border-0 shadow-sm mb-4">
          <Button
            onClick={() => setShowWizard(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Account
          </Button>
        </Card>

        {/* Assets Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Assets
          </h3>

          {getAccountsByCategory('asset').map(
            ({ category, accounts: categoryAccounts }) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600 px-2">
                  {category}
                </h4>
                {categoryAccounts.map(account => {
                  const IconComponent =
                    iconMap[account.icon as keyof typeof iconMap] || Wallet;
                  return (
                    <AccountCard
                      key={account.id}
                      account={account}
                      accountType="asset"
                      IconComponent={IconComponent}
                      onClick={() => handleAccountClick(account)}
                      onToggleVisibility={e => {
                        e.stopPropagation();
                        handleToggleVisibility(account.id);
                      }}
                      onDelete={e => {
                        e.stopPropagation();
                        handleDeleteAccount(account.id);
                      }}
                    />
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Liabilities Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-red-600" />
            Liabilities
          </h3>

          {getAccountsByCategory('liability').map(
            ({ category, accounts: categoryAccounts }) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600 px-2">
                  {category}
                </h4>
                {categoryAccounts.map(account => {
                  const IconComponent =
                    iconMap[account.icon as keyof typeof iconMap] || CreditCard;
                  return (
                    <AccountCard
                      key={account.id}
                      account={account}
                      accountType="liability"
                      IconComponent={IconComponent}
                      onClick={() => handleAccountClick(account)}
                      onToggleVisibility={e => {
                        e.stopPropagation();
                        handleToggleVisibility(account.id);
                      }}
                      onDelete={e => {
                        e.stopPropagation();
                        handleDeleteAccount(account.id);
                      }}
                    />
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {showDetailsPage && selectedAccount && (
        <AccountDetailsPage
          account={selectedAccount}
          onBack={handleBackFromDetails}
          onSaveSettings={handleSaveSettings}
          onDelete={handleDeleteAccount}
          onToggleVisibility={handleToggleVisibility}
        />
      )}

      {showWizard && (
        <AddAccountWizard
          onClose={() => setShowWizard(false)}
          onSubmit={handleWizardSubmit}
        />
      )}
    </div>
  );
}
