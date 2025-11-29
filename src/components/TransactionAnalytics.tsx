import { useState } from 'react';
import { useTransactionStats } from '@/hooks/useTransactionStats';
import { Card } from '@/components/ui/card';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function TransactionAnalytics() {
  const [dateRange, setDateRange] = useState<'all' | '30' | '90' | '365'>('30');

  const getStartDate = () => {
    if (dateRange === 'all') return undefined;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(dateRange));
    return date.toISOString().split('T')[0];
  };

  const { stats, loading, error } = useTransactionStats(getStartDate());

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

  const dateRangeOptions = [
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: '365', label: 'Last Year' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
        <select
          value={dateRange}
          onChange={e =>
            setDateRange(e.target.value as 'all' | '30' | '90' | '365')
          }
          className="text-sm px-3 py-1 rounded-md border border-gray-300 bg-white"
        >
          {dateRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-white border-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-gray-600">Total Income</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(stats.totalIncome)}
          </p>
        </Card>

        <Card className="p-4 bg-white border-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xs text-gray-600">Total Expenses</p>
          </div>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(stats.totalExpenses)}
          </p>
        </Card>

        <Card className="p-4 bg-white border-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600">Net Cash Flow</p>
          </div>
          <p
            className={`text-xl font-bold ${stats.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatCurrency(stats.netCashFlow)}
          </p>
        </Card>

        <Card className="p-4 bg-white border-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-gray-600">Avg Transaction</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(stats.averageTransactionAmount)}
          </p>
        </Card>
      </div>

      {Object.keys(stats.transactionsByType).length > 0 && (
        <Card className="p-4 bg-white border-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Transactions by Type
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.transactionsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {type}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {Object.keys(stats.transactionsByCategory).length > 0 && (
        <Card className="p-4 bg-white border-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Transactions by Category
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.transactionsByCategory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-600">{category}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
