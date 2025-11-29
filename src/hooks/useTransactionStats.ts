import { useMemo } from 'react';
import { useTransactions } from './useTransactions';

interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionsByType: Record<string, number>;
  transactionsByCategory: Record<string, number>;
  averageTransactionAmount: number;
  largestTransaction: number;
  transactionCount: number;
}

export function useTransactionStats(startDate?: string, endDate?: string) {
  const { transactions, loading, error } = useTransactions();

  const stats = useMemo<TransactionStats>(() => {
    let filteredTransactions = transactions;

    if (startDate || endDate) {
      filteredTransactions = transactions.filter(t => {
        const txDate = new Date(t.transaction_date);
        if (startDate && txDate < new Date(startDate)) return false;
        if (endDate && txDate > new Date(endDate)) return false;
        return true;
      });
    }

    const totalIncome = filteredTransactions
      .filter(t =>
        ['deposit', 'dividend', 'interest', 'sell'].includes(t.transaction_type)
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
      .filter(t => ['withdrawal', 'buy', 'fee'].includes(t.transaction_type))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const transactionsByType = filteredTransactions.reduce(
      (acc, t) => {
        acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const transactionsByCategory = filteredTransactions
      .filter(t => t.category)
      .reduce(
        (acc, t) => {
          acc[t.category!] = (acc[t.category!] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const amounts = filteredTransactions.map(t => Math.abs(t.amount));
    const averageTransactionAmount =
      amounts.length > 0
        ? amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
        : 0;

    const largestTransaction = amounts.length > 0 ? Math.max(...amounts) : 0;

    return {
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      transactionsByType,
      transactionsByCategory,
      averageTransactionAmount,
      largestTransaction,
      transactionCount: filteredTransactions.length,
    };
  }, [transactions, startDate, endDate]);

  return {
    stats,
    loading,
    error,
  };
}
