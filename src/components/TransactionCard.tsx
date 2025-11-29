import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, parseLocalDate } from '@/lib/utils';
import { Transaction } from '@/types/transaction';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

export function TransactionCard({
  transaction,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const metadata = transaction.transaction_metadata || {};

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
    'description' in transaction ? (transaction['description'] as string) : '';
  const transactionDate =
    'transaction_date' in transaction
      ? (transaction['transaction_date'] as string)
      : '';

  const getTransactionIcon = (type: string) => {
    const lowerType = type.toLowerCase();

    // Portfolio gains (positive transactions) - up arrow
    if (
      lowerType.includes('buy') ||
      lowerType.includes('deposit') ||
      lowerType.includes('dividend') ||
      lowerType.includes('interest') ||
      lowerType.includes('coupon') ||
      lowerType.includes('stake') ||
      lowerType.includes('mature') ||
      lowerType.includes('exercise') ||
      lowerType.includes('split')
    ) {
      return <TrendingUp className="w-3.5 h-3.5" />;
    }

    // Portfolio losses (negative transactions) - down arrow
    if (
      lowerType.includes('sell') ||
      lowerType.includes('withdrawal') ||
      lowerType.includes('fee') ||
      lowerType.includes('expire')
    ) {
      return <TrendingDown className="w-3.5 h-3.5" />;
    }

    // Neutral/other transactions
    return <DollarSign className="w-3.5 h-3.5" />;
  };

  const getTransactionColor = (type: string) => {
    const lowerType = type.toLowerCase();

    // Portfolio gains (positive transactions) - green
    if (
      lowerType.includes('buy') ||
      lowerType.includes('deposit') ||
      lowerType.includes('dividend') ||
      lowerType.includes('interest') ||
      lowerType.includes('coupon') ||
      lowerType.includes('stake') ||
      lowerType.includes('mature') ||
      lowerType.includes('exercise') ||
      lowerType.includes('split')
    ) {
      return 'text-green-700 bg-green-50';
    }

    // Portfolio losses (negative transactions) - red
    if (
      lowerType.includes('sell') ||
      lowerType.includes('withdrawal') ||
      lowerType.includes('fee') ||
      lowerType.includes('expire')
    ) {
      return 'text-red-700 bg-red-50';
    }

    // Neutral/other transactions - gray
    return 'text-gray-600 bg-gray-100';
  };

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

  const displayAmount = Math.abs(Number(amount));

  if (!transactionId) return null;

  return (
    <Card
      key={transactionId}
      className="p-4 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col gap-1">
            {metadata.ticker ? (
              <span className="text-sm font-semibold px-2 py-0.5 bg-blue-100 rounded text-blue-700 text-center">
                {metadata.ticker}
              </span>
            ) : (
              <p className="text-sm font-semibold text-gray-900 px-2 py-0.5">
                {description}
              </p>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded text-center whitespace-nowrap flex items-center justify-center gap-1 ${getTransactionColor(transactionType)}`}
            >
              {getTransactionIcon(transactionType)}
              {transactionType.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-gray-500 px-2">
              {transactionDate
                ? parseLocalDate(transactionDate).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                  })
                : ''}
            </span>
          </div>
          <div className="flex items-center gap-8">
            {metadata.quantity && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">Qty:</span>
                <span className="text-sm font-semibold text-gray-700">
                  {Number(metadata.quantity)}
                </span>
              </div>
            )}
            {['stock_dividend', 'etf_dividend', 'bond_coupon'].includes(
              transactionType
            ) &&
              metadata.dividendAmount && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-1">Div/Share:</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatCurrency(Number(metadata.dividendAmount))}
                  </span>
                </div>
              )}
            {metadata.price && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">Price:</span>
                <span className="text-sm font-semibold text-gray-700">
                  {formatCurrency(Number(metadata.price))}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className={`text-base font-bold ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositive ? '+' : '-'}
              {formatCurrency(displayAmount)}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(transaction)}
              className="h-8 w-8 p-0 hover:bg-blue-50"
              title="Edit transaction"
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(transactionId)}
              className="h-8 w-8 p-0 hover:bg-red-50"
              title="Delete transaction"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
