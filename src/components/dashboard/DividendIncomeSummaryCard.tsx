import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useDividends } from '@/hooks/useDividends';
import { formatCurrency } from '@/lib/utils';

export function DividendIncomeSummaryCard() {
  const { dividends, loading } = useDividends();

  // Calculate monthly dividend income
  const calculateDividendIncome = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // This month (paid dividends only)
    const thisMonth = dividends
      .filter(d => {
        const payDate = new Date(d.pay_date);
        return (
          d.status === 'paid' &&
          payDate.getMonth() === currentMonth &&
          payDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, d) => sum + d.amount, 0);

    // Next month (upcoming dividends)
    const nextMonth = new Date(currentYear, currentMonth + 1);
    const nextMonthDividends = dividends
      .filter(d => {
        const payDate = new Date(d.pay_date);
        return (
          d.status === 'upcoming' &&
          payDate.getMonth() === nextMonth.getMonth() &&
          payDate.getFullYear() === nextMonth.getFullYear()
        );
      })
      .reduce((sum, d) => sum + d.amount, 0);

    // YTD (all paid dividends this year)
    const ytd = dividends
      .filter(d => {
        const payDate = new Date(d.pay_date);
        return d.status === 'paid' && payDate.getFullYear() === currentYear;
      })
      .reduce((sum, d) => sum + d.amount, 0);

    return { thisMonth, nextMonth, ytd };
  };

  const income = calculateDividendIncome();

  if (loading) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  const now = new Date();
  const nextMonthName = new Date(now.getFullYear(), now.getMonth() + 1).toLocaleDateString('en-US', {
    month: 'long',
  });

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">Dividend Income</h3>
        <div className="p-2 rounded-lg bg-green-50">
          <DollarSign className="h-4 w-4 text-green-600" />
        </div>
      </div>

      <div className="space-y-3">
        {/* This Month */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">This Month</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(income.thisMonth)}
          </span>
        </div>

        {/* Next Month */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{nextMonthName}</span>
          </div>
          <span className="text-sm font-semibold text-blue-600">
            ~{formatCurrency(income.nextMonth)}
          </span>
        </div>

        {/* YTD Total */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">YTD Total</span>
            </div>
            <span className="text-base font-bold text-green-600">
              {formatCurrency(income.ytd)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
