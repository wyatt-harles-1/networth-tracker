import { supabase } from '@/lib/supabase';
import { HistoricalPriceService } from './historicalPriceService';
import { TransactionMetadataUtils } from '@/lib/transactionMetadataUtils';

interface HoldingSnapshot {
  symbol: string;
  quantity: number;
  costBasis: number;
  accountId: string;
  accountName: string;
  assetClass: string;
}

interface DailyPortfolioValue {
  date: string;
  totalValue: number;
  totalCostBasis: number;
  cashValue: number;
  investedValue: number;
  unrealizedGain: number;
  realizedGain: number;
  assetClassBreakdown: Record<string, number>;
  tickerBreakdown: Record<
    string,
    { value: number; quantity: number; price: number }
  >;
  accountBreakdown: Record<string, number>;
  dataQuality: number;
}

export class PortfolioValueCalculationService {
  static async calculatePortfolioValueForDate(
    userId: string,
    date: string
  ): Promise<{ data: DailyPortfolioValue | null; error: string | null }> {
    try {
      const holdings = await this.reconstructHoldingsAtDate(userId, date);

      if (holdings.length === 0) {
        return {
          data: {
            date,
            totalValue: 0,
            totalCostBasis: 0,
            cashValue: 0,
            investedValue: 0,
            unrealizedGain: 0,
            realizedGain: 0,
            assetClassBreakdown: {},
            tickerBreakdown: {},
            accountBreakdown: {},
            dataQuality: 1.0,
          },
          error: null,
        };
      }

      const uniqueSymbols = [
        ...new Set(holdings.map(h => h.symbol).filter(s => s !== 'CASH')),
      ];

      const prices = await HistoricalPriceService.getMultipleHistoricalPrices(
        uniqueSymbols,
        date
      );

      let totalValue = 0;
      let totalCostBasis = 0;
      let cashValue = 0;
      let investedValue = 0;
      let dataQualitySum = 0;
      let dataQualityCount = 0;

      const assetClassBreakdown: Record<string, number> = {};
      const tickerBreakdown: Record<
        string,
        { value: number; quantity: number; price: number }
      > = {};
      const accountBreakdown: Record<string, number> = {};

      for (const holding of holdings) {
        let holdingValue = 0;

        if (holding.symbol === 'CASH') {
          holdingValue = holding.quantity;
          cashValue += holdingValue;
        } else {
          const priceData = prices[holding.symbol.toUpperCase()];
          if (priceData) {
            holdingValue = holding.quantity * priceData.price;
            investedValue += holdingValue;
            dataQualitySum += priceData.quality;
            dataQualityCount++;

            if (!tickerBreakdown[holding.symbol]) {
              tickerBreakdown[holding.symbol] = {
                value: 0,
                quantity: 0,
                price: priceData.price,
              };
            }
            tickerBreakdown[holding.symbol].value += holdingValue;
            tickerBreakdown[holding.symbol].quantity += holding.quantity;
          }
        }

        totalValue += holdingValue;
        totalCostBasis += holding.costBasis;

        assetClassBreakdown[holding.assetClass] =
          (assetClassBreakdown[holding.assetClass] || 0) + holdingValue;

        accountBreakdown[holding.accountName] =
          (accountBreakdown[holding.accountName] || 0) + holdingValue;
      }

      const realizedGain = await this.calculateRealizedGainUpToDate(
        userId,
        date
      );
      const unrealizedGain = totalValue - totalCostBasis;
      const dataQuality =
        dataQualityCount > 0 ? dataQualitySum / dataQualityCount : 1.0;

      return {
        data: {
          date,
          totalValue,
          totalCostBasis,
          cashValue,
          investedValue,
          unrealizedGain,
          realizedGain,
          assetClassBreakdown,
          tickerBreakdown,
          accountBreakdown,
          dataQuality,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to calculate portfolio value',
      };
    }
  }

  static async reconstructHoldingsAtDate(
    userId: string,
    date: string
  ): Promise<HoldingSnapshot[]> {
    try {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, asset_class_id, asset_classes(name)')
        .eq('user_id', userId)
        .eq('account_type', 'asset');

      if (!accounts || accounts.length === 0) {
        return [];
      }

      const accountMap = new Map(
        accounts.map(acc => [
          acc.id,
          {
            name: acc.name,
            assetClass: (acc as any).asset_classes?.name || 'Uncategorized',
          },
        ])
      );

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .lte('transaction_date', date)
        .order('transaction_date', { ascending: true });

      if (!transactions) {
        return [];
      }

      console.log(
        `[Portfolio Calc] Reconstructing holdings from ${transactions.length} transactions up to ${date}`
      );
      TransactionMetadataUtils.logTransactionDataQuality(transactions);

      const holdingsMap = new Map<string, HoldingSnapshot>();

      for (const txn of transactions) {
        const accountInfo = accountMap.get(txn.account_id);
        if (!accountInfo) continue;

        const meta = TransactionMetadataUtils.getMetadata(txn);
        const ticker = meta.ticker || 'CASH';
        const quantity = meta.quantity || 0;

        const key = `${txn.account_id}-${ticker}`;

        if (!holdingsMap.has(key)) {
          holdingsMap.set(key, {
            symbol: ticker,
            quantity: 0,
            costBasis: 0,
            accountId: txn.account_id,
            accountName: accountInfo.name,
            assetClass: accountInfo.assetClass,
          });
        }

        const holding = holdingsMap.get(key)!;

        switch (txn.transaction_type) {
          case 'buy':
          case 'stock_buy':
          case 'etf_buy':
          case 'crypto_buy':
            holding.quantity += quantity;
            holding.costBasis += Number(txn.amount);
            console.log(
              `[Portfolio Calc] ${txn.transaction_type}: ${ticker} +${quantity} @ ${txn.transaction_date}`
            );
            break;

          case 'sell':
          case 'stock_sell':
          case 'etf_sell':
          case 'crypto_sell':
            if (holding.quantity > 0) {
              const costPerShare = holding.costBasis / holding.quantity;
              holding.quantity -= quantity;
              holding.costBasis -= quantity * costPerShare;
              if (holding.quantity < 0.0001) {
                holding.quantity = 0;
                holding.costBasis = 0;
              }
              console.log(
                `[Portfolio Calc] ${txn.transaction_type}: ${ticker} -${quantity} @ ${txn.transaction_date}`
              );
            } else {
              console.warn(
                `[Portfolio Calc] Cannot sell ${ticker} - no holdings available (${txn.id})`
              );
            }
            break;

          case 'deposit':
          case 'income':
          case 'stock_dividend':
          case 'etf_dividend':
          case 'interest':
          case 'bond_coupon':
            if (ticker === 'CASH') {
              const cashKey = `${txn.account_id}-CASH`;
              if (!holdingsMap.has(cashKey)) {
                holdingsMap.set(cashKey, {
                  symbol: 'CASH',
                  quantity: 0,
                  costBasis: 0,
                  accountId: txn.account_id,
                  accountName: accountInfo.name,
                  assetClass: accountInfo.assetClass,
                });
              }
              const cashHolding = holdingsMap.get(cashKey)!;
              cashHolding.quantity += Number(txn.amount);
              cashHolding.costBasis += Number(txn.amount);
            }
            break;

          case 'withdrawal':
          case 'expense':
          case 'fee':
            if (ticker === 'CASH') {
              const cashKey = `${txn.account_id}-CASH`;
              if (holdingsMap.has(cashKey)) {
                const cashHolding = holdingsMap.get(cashKey)!;
                cashHolding.quantity -= Number(txn.amount);
                cashHolding.costBasis -= Number(txn.amount);
                if (cashHolding.quantity < 0.01) {
                  cashHolding.quantity = 0;
                  cashHolding.costBasis = 0;
                }
              }
            }
            break;

          case 'transfer_in':
            holding.quantity += quantity;
            holding.costBasis += Number(txn.amount);
            console.log(
              `[Portfolio Calc] transfer_in: ${ticker} +${quantity} @ ${txn.transaction_date}`
            );
            break;

          case 'transfer_out':
            const transferQuantity = quantity;
            if (holding.quantity > 0) {
              const costPerShare = holding.costBasis / holding.quantity;
              holding.quantity -= transferQuantity;
              holding.costBasis -= transferQuantity * costPerShare;
              if (holding.quantity < 0.0001) {
                holding.quantity = 0;
                holding.costBasis = 0;
              }
            }
            break;
        }
      }

      const holdings = Array.from(holdingsMap.values()).filter(
        h => h.quantity > 0.0001
      );
      console.log(
        `[Portfolio Calc] Reconstructed ${holdings.length} holdings with non-zero quantities`
      );
      holdings.forEach(h => {
        console.log(
          `  - ${h.symbol}: ${h.quantity} units, cost basis: $${h.costBasis.toFixed(2)}`
        );
      });
      return holdings;
    } catch (err) {
      console.error('[Portfolio Calc] Failed to reconstruct holdings:', err);
      return [];
    }
  }

  static async calculateRealizedGainUpToDate(
    userId: string,
    date: string
  ): Promise<number> {
    try {
      const { data } = await supabase
        .from('account_balance_history')
        .select('realized_gain')
        .eq('user_id', userId)
        .lte('balance_date', date)
        .order('balance_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data ? Number(data.realized_gain || 0) : 0;
    } catch (err) {
      console.error('Failed to calculate realized gain:', err);
      return 0;
    }
  }

  static async savePortfolioValue(
    userId: string,
    valueData: DailyPortfolioValue
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('portfolio_value_history').upsert(
        {
          user_id: userId,
          value_date: valueData.date,
          total_value: valueData.totalValue,
          total_cost_basis: valueData.totalCostBasis,
          cash_value: valueData.cashValue,
          invested_value: valueData.investedValue,
          unrealized_gain: valueData.unrealizedGain,
          realized_gain: valueData.realizedGain,
          asset_class_breakdown: valueData.assetClassBreakdown,
          ticker_breakdown: valueData.tickerBreakdown,
          account_breakdown: valueData.accountBreakdown,
          calculation_method: 'transaction_replay',
          data_quality_score: valueData.dataQuality,
        },
        {
          onConflict: 'user_id,value_date',
        }
      );

      if (error) throw error;

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to save portfolio value',
      };
    }
  }

  static async calculateAndSavePortfolioValueRange(
    userId: string,
    startDate: string,
    endDate: string,
    onProgress?: (progress: number, current: string) => void
  ): Promise<{
    success: boolean;
    daysCalculated: number;
    daysFailed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let daysCalculated = 0;
    let daysFailed = 0;

    try {
      console.log(
        '[Portfolio Calc] Starting calculation range:',
        startDate,
        'to',
        endDate
      );

      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;

      console.log('[Portfolio Calc] Total days to process:', totalDays);

      const currentDate = new Date(start);
      let processedDays = 0;

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];

        const result = await this.calculatePortfolioValueForDate(
          userId,
          dateStr
        );

        if (result.error || !result.data) {
          console.error(
            '[Portfolio Calc] Failed for',
            dateStr,
            ':',
            result.error
          );
          errors.push(`${dateStr}: ${result.error || 'Unknown error'}`);
          daysFailed++;
        } else {
          const saveResult = await this.savePortfolioValue(userId, result.data);
          if (saveResult.success) {
            daysCalculated++;
            if (processedDays % 10 === 0) {
              console.log(
                '[Portfolio Calc] Saved',
                daysCalculated,
                'days so far'
              );
            }
          } else {
            console.error(
              '[Portfolio Calc] Failed to save',
              dateStr,
              ':',
              saveResult.error
            );
            errors.push(`${dateStr}: Failed to save - ${saveResult.error}`);
            daysFailed++;
          }
        }

        processedDays++;
        if (onProgress) {
          onProgress(Math.round((processedDays / totalDays) * 100), dateStr);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('[Portfolio Calc] Complete:', {
        daysCalculated,
        daysFailed,
        totalErrors: errors.length,
      });

      return {
        success: daysFailed === 0,
        daysCalculated,
        daysFailed,
        errors,
      };
    } catch (err) {
      console.error('[Portfolio Calc] Fatal error:', err);
      return {
        success: false,
        daysCalculated,
        daysFailed,
        errors: [
          err instanceof Error
            ? err.message
            : 'Failed to calculate portfolio value range',
        ],
      };
    }
  }

  static async getEarliestTransactionDate(
    userId: string
  ): Promise<string | null> {
    try {
      console.log(
        '[Portfolio Calc] Fetching earliest transaction for user:',
        userId
      );
      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      console.log(
        '[Portfolio Calc] Earliest transaction date:',
        data?.transaction_date || 'none'
      );
      return data ? data.transaction_date : null;
    } catch (err) {
      console.error(
        '[Portfolio Calc] Failed to get earliest transaction date:',
        err
      );
      return null;
    }
  }

  static async createCalculationJob(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ jobId: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('portfolio_calculation_jobs')
        .insert({
          user_id: userId,
          start_date: startDate,
          end_date: endDate,
          job_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return { jobId: data.id, error: null };
    } catch (err) {
      return {
        jobId: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to create calculation job',
      };
    }
  }

  static async updateCalculationJobProgress(
    jobId: string,
    status: string,
    progress: number,
    daysCalculated: number,
    daysFailed: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('portfolio_calculation_jobs')
        .update({
          job_status: status,
          progress_percentage: progress,
          days_calculated: daysCalculated,
          days_failed: daysFailed,
          error_message: errorMessage || null,
          ...(status === 'running' && !errorMessage
            ? { started_at: new Date().toISOString() }
            : {}),
          ...(status === 'completed' || status === 'failed'
            ? { completed_at: new Date().toISOString() }
            : {}),
        })
        .eq('id', jobId);
    } catch (err) {
      console.error('Failed to update calculation job:', err);
    }
  }
}
