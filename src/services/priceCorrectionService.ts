import { supabase } from '@/lib/supabase';
import { CryptoPriceService } from './cryptoPriceService';

interface PriceValidationResult {
  symbol: string;
  currentStoredPrice: number;
  marketPrice: number;
  deviation: number;
  isInvalid: boolean;
  reason?: string;
}

export class PriceCorrectionService {
  private static readonly DEVIATION_THRESHOLD = 0.5;

  static async validateAndCorrectCryptoPrices(userId: string): Promise<{
    success: boolean;
    corrected: number;
    validationResults: PriceValidationResult[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const validationResults: PriceValidationResult[] = [];
    let corrected = 0;

    try {
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (!holdings || holdings.length === 0) {
        return {
          success: true,
          corrected: 0,
          validationResults: [],
          errors: [],
        };
      }

      const cryptoHoldings = holdings.filter(h =>
        CryptoPriceService.isCryptocurrency(h.symbol)
      );

      for (const holding of cryptoHoldings) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const priceResult = await CryptoPriceService.getCurrentPrice(
          holding.symbol
        );

        if (priceResult.error || !priceResult.data) {
          errors.push(
            `${holding.symbol}: ${priceResult.error || 'No price data available'}`
          );
          continue;
        }

        const marketPrice = priceResult.data.price;
        const storedPrice = Number(holding.current_price);
        const deviation = Math.abs(marketPrice - storedPrice) / marketPrice;

        const validationResult: PriceValidationResult = {
          symbol: holding.symbol,
          currentStoredPrice: storedPrice,
          marketPrice: marketPrice,
          deviation: deviation,
          isInvalid: deviation > this.DEVIATION_THRESHOLD,
        };

        if (validationResult.isInvalid) {
          validationResult.reason = `Price deviation of ${(deviation * 100).toFixed(2)}% exceeds threshold`;

          const newCurrentValue = Number(holding.quantity) * marketPrice;

          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              current_price: marketPrice,
              current_value: newCurrentValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', holding.id);

          if (updateError) {
            errors.push(
              `${holding.symbol}: Failed to update holding - ${updateError.message}`
            );
          } else {
            corrected++;
            console.log(
              `Corrected ${holding.symbol}: ${storedPrice.toFixed(2)} -> ${marketPrice.toFixed(2)}`
            );
          }
        }

        validationResults.push(validationResult);
      }

      if (corrected > 0) {
        await this.recalculatePortfolioSnapshots(userId);
      }

      return { success: true, corrected, validationResults, errors };
    } catch (err) {
      return {
        success: false,
        corrected,
        validationResults,
        errors: [
          err instanceof Error
            ? err.message
            : 'Failed to validate and correct crypto prices',
        ],
      };
    }
  }

  static async cleanInvalidCryptoPriceHistory(userId: string): Promise<{
    success: boolean;
    deleted: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deleted = 0;

    try {
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select('symbol')
        .eq('user_id', userId);

      if (error) throw error;
      if (!holdings || holdings.length === 0) {
        return { success: true, deleted: 0, errors: [] };
      }

      const cryptoSymbols = holdings
        .filter(h => CryptoPriceService.isCryptocurrency(h.symbol))
        .map(h => h.symbol.toUpperCase());

      if (cryptoSymbols.length === 0) {
        return { success: true, deleted: 0, errors: [] };
      }

      for (const symbol of cryptoSymbols) {
        const priceResult = await CryptoPriceService.getCurrentPrice(symbol);

        if (priceResult.error || !priceResult.data) {
          continue;
        }

        const marketPrice = priceResult.data.price;
        const minValidPrice = marketPrice * (1 - this.DEVIATION_THRESHOLD);
        const maxValidPrice = marketPrice * (1 + this.DEVIATION_THRESHOLD);

        const { data: invalidPrices, error: selectError } = await supabase
          .from('price_history')
          .select('*')
          .eq('symbol', symbol)
          .or(
            `close_price.lt.${minValidPrice},close_price.gt.${maxValidPrice}`
          );

        if (selectError) {
          errors.push(
            `${symbol}: Failed to query invalid prices - ${selectError.message}`
          );
          continue;
        }

        if (invalidPrices && invalidPrices.length > 0) {
          const { error: deleteError } = await supabase
            .from('price_history')
            .delete()
            .eq('symbol', symbol)
            .or(
              `close_price.lt.${minValidPrice},close_price.gt.${maxValidPrice}`
            );

          if (deleteError) {
            errors.push(
              `${symbol}: Failed to delete invalid prices - ${deleteError.message}`
            );
          } else {
            deleted += invalidPrices.length;
            console.log(
              `Deleted ${invalidPrices.length} invalid price records for ${symbol}`
            );
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return { success: true, deleted, errors };
    } catch (err) {
      return {
        success: false,
        deleted,
        errors: [
          err instanceof Error
            ? err.message
            : 'Failed to clean invalid crypto price history',
        ],
      };
    }
  }

  private static async recalculatePortfolioSnapshots(
    userId: string
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      if (accountsError) throw accountsError;

      const totalAssets =
        accounts
          ?.filter(a => a.account_type === 'asset')
          .reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;

      const totalLiabilities =
        accounts
          ?.filter(a => a.account_type === 'liability')
          .reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;

      const netWorth = totalAssets - totalLiabilities;

      const { data: assetClasses } = await supabase
        .from('asset_classes')
        .select('*')
        .eq('user_id', userId);

      const assetClassBreakdown: Record<string, number> = {};

      if (assetClasses) {
        for (const assetClass of assetClasses) {
          const classAccounts =
            accounts?.filter(a => a.asset_class_id === assetClass.id) || [];
          const classTotal = classAccounts.reduce(
            (sum, a) => sum + Number(a.current_balance),
            0
          );
          assetClassBreakdown[assetClass.id] = classTotal;
        }
      }

      await supabase.from('portfolio_snapshots').upsert(
        {
          user_id: userId,
          snapshot_date: today,
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth,
          asset_class_breakdown: assetClassBreakdown,
        },
        { onConflict: 'user_id,snapshot_date' }
      );

      console.log(`Updated portfolio snapshot for ${today}`);
    } catch (err) {
      console.error('Failed to recalculate portfolio snapshots:', err);
    }
  }

  static async runFullCorrection(userId: string): Promise<{
    success: boolean;
    summary: {
      correctedHoldings: number;
      deletedPriceRecords: number;
      validationResults: PriceValidationResult[];
    };
    errors: string[];
  }> {
    const allErrors: string[] = [];

    console.log('Starting full cryptocurrency price correction...');

    const cleanResult = await this.cleanInvalidCryptoPriceHistory(userId);
    allErrors.push(...cleanResult.errors);

    const correctionResult = await this.validateAndCorrectCryptoPrices(userId);
    allErrors.push(...correctionResult.errors);

    console.log(
      `Correction complete: ${correctionResult.corrected} holdings corrected, ${cleanResult.deleted} invalid price records deleted`
    );

    return {
      success: cleanResult.success && correctionResult.success,
      summary: {
        correctedHoldings: correctionResult.corrected,
        deletedPriceRecords: cleanResult.deleted,
        validationResults: correctionResult.validationResults,
      },
      errors: allErrors,
    };
  }
}
