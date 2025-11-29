import { PortfolioValueCalculationService } from './portfolioValueCalculationService';
import { supabase } from '@/lib/supabase';

export class StatementImportTriggers {
  static async triggerPortfolioValueCalculation(
    userId: string,
    importId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: trades } = await supabase
        .from('parsed_trades')
        .select('trade_date')
        .eq('import_id', importId)
        .eq('user_id', userId)
        .order('trade_date', { ascending: true });

      if (!trades || trades.length === 0) {
        return { success: true, error: null };
      }

      const earliestTradeDate = trades[0].trade_date;

      const existingEarliestDate =
        await PortfolioValueCalculationService.getEarliestTransactionDate(
          userId
        );

      let startDate = earliestTradeDate;
      if (existingEarliestDate && existingEarliestDate < earliestTradeDate) {
        startDate = earliestTradeDate;
      }

      const endDate = new Date().toISOString().split('T')[0];

      const jobResult =
        await PortfolioValueCalculationService.createCalculationJob(
          userId,
          startDate,
          endDate
        );

      if (jobResult.error || !jobResult.jobId) {
        console.error('Failed to create calculation job:', jobResult.error);
        return { success: false, error: jobResult.error };
      }

      setTimeout(async () => {
        await PortfolioValueCalculationService.updateCalculationJobProgress(
          jobResult.jobId!,
          'running',
          0,
          0,
          0
        );

        const result =
          await PortfolioValueCalculationService.calculateAndSavePortfolioValueRange(
            userId,
            startDate,
            endDate
          );

        await PortfolioValueCalculationService.updateCalculationJobProgress(
          jobResult.jobId!,
          result.success ? 'completed' : 'failed',
          100,
          result.daysCalculated,
          result.daysFailed,
          result.errors.length > 0 ? result.errors.join('; ') : undefined
        );
      }, 1000);

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to trigger portfolio value calculation',
      };
    }
  }

  static async onTradesImported(
    userId: string,
    importId: string,
    selectedTradeIds: string[]
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (selectedTradeIds.length === 0) {
        return { success: true, error: null };
      }

      return await this.triggerPortfolioValueCalculation(userId, importId);
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to process imported trades',
      };
    }
  }
}
