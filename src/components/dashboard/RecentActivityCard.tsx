import { Card } from '@/components/ui/card';
import { useTransactions } from '@/hooks/useTransactions';
import { Loader2, Activity } from 'lucide-react';
import {
  formatCurrency,
  parseLocalDate,
  getTransactionAmountSign,
  getTransactionAmountColor,
} from '@/lib/utils';

export function RecentActivityCardNew() {
  const { transactions, loading } = useTransactions();

  const recentTransactions = transactions.slice(0, 5);

  if (loading) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </Card>
    );
  }

  if (recentTransactions.length === 0) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Recent Activity
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Activity className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No recent activity yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Add transactions to see activity here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-3">
        Recent Activity
      </h3>
      <div className="space-y-2">
        {recentTransactions.map(transaction => {
          // Extract Transaction properties with type-safe checks
          const transactionType =
            'transaction_type' in transaction
              ? (transaction['transaction_type'] as string)
              : '';
          const amount =
            'amount' in transaction ? (transaction['amount'] as number) : 0;
          const transactionId =
            'id' in transaction ? (transaction['id'] as string) : '';
          const description =
            'description' in transaction
              ? (transaction['description'] as string)
              : '';
          const transactionDate =
            'transaction_date' in transaction
              ? (transaction['transaction_date'] as string)
              : '';

          // Skip rendering if required properties are missing
          if (!transactionId || !transactionDate) return null;

          const signedAmount = getTransactionAmountSign(
            transactionType,
            amount
          );
          const amountColor = getTransactionAmountColor(
            transactionType,
            amount
          );

          return (
            <div
              key={transactionId}
              className="flex items-center justify-between py-1.5"
            >
              <div>
                <p className="text-xs font-medium text-gray-900">
                  {description}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {parseLocalDate(transactionDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <span className={`text-xs font-medium ${amountColor}`}>
                {formatCurrency(signedAmount)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
