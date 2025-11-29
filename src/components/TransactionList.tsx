import { useTransactions } from '@/hooks/useTransactions';
import { Card } from '@/components/ui/card';
import { TransactionCard } from './TransactionCard';
import { Loader2, AlertCircle, DollarSign } from 'lucide-react';
import { Transaction } from '@/types/transaction';

interface TransactionListNewProps {
  accountId?: string;
  onEdit?: (transaction: Transaction) => void;
  transactions?: Transaction[];
  loading?: boolean;
  error?: string | null;
  deleteTransaction?: (id: string) => Promise<{ error: string | null }>;
}

export function TransactionListNew({
  accountId,
  onEdit,
  transactions: transactionsProp,
  loading: loadingProp,
  error: errorProp,
  deleteTransaction: deleteTransactionProp,
}: TransactionListNewProps) {
  // Always call the hook (React rules), but prefer props when provided
  const hookData = useTransactions(accountId);

  const transactions = transactionsProp ?? hookData.transactions;
  const loading = loadingProp ?? hookData.loading;
  const error = errorProp ?? hookData.error;
  const deleteTransaction = deleteTransactionProp ?? hookData.deleteTransaction;

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await deleteTransaction(id);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    if (onEdit) {
      onEdit(transaction);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <Card className="p-8 text-center bg-white border-0">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Transactions Yet
          </h3>
          <p className="text-sm text-gray-600">
            Start tracking your financial activity
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map(transaction => {
            // Extract Transaction id with type-safe check
            const transactionId =
              'id' in transaction ? (transaction['id'] as string) : '';

            // Skip rendering if id is missing
            if (!transactionId) return null;

            return (
              <TransactionCard
                key={transactionId}
                transaction={transaction}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
