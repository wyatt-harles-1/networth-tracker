import { supabase } from '@/lib/supabase';
import { LotTrackingService } from './lotTrackingService';
import { Transaction } from '@/types/transaction';
import { InvestmentAccountService } from './investmentAccountService';
import { TransactionMetadataUtils } from '@/lib/transactionMetadataUtils';

export class TransactionSyncService {
  static async syncTransactionToHoldings(
    transaction: Transaction
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const meta = TransactionMetadataUtils.getMetadata(transaction);
      const ticker = meta.ticker;
      const quantity = meta.quantity || 0;
      const price = meta.price || 0;

      console.log(
        `[Transaction Sync] Processing ${transaction.transaction_type} for ${ticker || 'CASH'} (source: ${meta.source})`
      );

      if (!ticker || !transaction.account_id) {
        console.log(`[Transaction Sync] Skipping - no ticker or account_id`);
        return { success: true, error: null };
      }

      const transactionType = transaction.transaction_type;

      if (
        transactionType === 'stock_buy' ||
        transactionType === 'etf_buy' ||
        transactionType === 'crypto_buy'
      ) {
        return await this.processBuyTransaction(
          transaction,
          ticker,
          quantity,
          price
        );
      } else if (
        transactionType === 'stock_sell' ||
        transactionType === 'etf_sell' ||
        transactionType === 'crypto_sell'
      ) {
        return await this.processSellTransaction(
          transaction,
          ticker,
          quantity,
          price
        );
      } else if (
        transactionType === 'stock_dividend' ||
        transactionType === 'etf_dividend'
      ) {
        return await this.processDividendTransaction(transaction, ticker);
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to sync transaction',
      };
    }
  }

  private static async processBuyTransaction(
    transaction: Transaction,
    ticker: string,
    quantity: number,
    price: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (quantity <= 0 || price <= 0) {
        return {
          success: false,
          error: 'Invalid quantity or price for buy transaction',
        };
      }

      const { data: existingHolding, error: fetchError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', transaction.user_id)
        .eq('account_id', transaction.account_id)
        .eq('symbol', ticker.toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      const lotResult = await LotTrackingService.createLot(
        transaction.user_id,
        transaction.account_id!,
        ticker,
        transaction.transaction_date,
        quantity,
        price,
        transaction.id
      );

      if (lotResult.error) throw new Error(lotResult.error);

      if (existingHolding) {
        const newQuantity = Number(existingHolding.quantity) + quantity;
        const newCostBasis =
          Number(existingHolding.cost_basis) + quantity * price;

        const { data: currentPriceData } = await supabase
          .from('price_history')
          .select('close_price')
          .eq('symbol', ticker.toUpperCase())
          .order('price_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const currentPrice = currentPriceData?.close_price
          ? Number(currentPriceData.close_price)
          : price;

        const newCurrentValue = newQuantity * currentPrice;

        const { error: updateError } = await supabase
          .from('holdings')
          .update({
            quantity: newQuantity,
            cost_basis: newCostBasis,
            current_price: currentPrice,
            current_value: newCurrentValue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingHolding.id);

        if (updateError) throw updateError;

        await LotTrackingService.createLot(
          transaction.user_id,
          transaction.account_id!,
          ticker,
          transaction.transaction_date,
          quantity,
          price,
          transaction.id,
          existingHolding.id
        );
      } else {
        const assetType = transaction.transaction_type.includes('stock')
          ? 'stock'
          : transaction.transaction_type.includes('etf')
            ? 'etf'
            : transaction.transaction_type.includes('crypto')
              ? 'crypto'
              : 'other';

        const { data: newHolding, error: insertError } = await supabase
          .from('holdings')
          .insert({
            user_id: transaction.user_id,
            account_id: transaction.account_id,
            symbol: ticker.toUpperCase(),
            name: ticker.toUpperCase(),
            quantity,
            cost_basis: quantity * price,
            current_price: price,
            current_value: quantity * price,
            asset_type: assetType,
            import_source: 'manual',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (newHolding) {
          await supabase
            .from('holding_lots')
            .update({ holding_id: newHolding.id })
            .eq('transaction_id', transaction.id);
        }
      }

      if (transaction.account_id) {
        await InvestmentAccountService.updateInvestmentAccountBalance(
          transaction.account_id
        );
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to process buy transaction',
      };
    }
  }

  private static async processSellTransaction(
    transaction: Transaction,
    ticker: string,
    quantity: number,
    price: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (quantity <= 0 || price <= 0) {
        return {
          success: false,
          error: 'Invalid quantity or price for sell transaction',
        };
      }

      const sellResult = await LotTrackingService.sellShares(
        transaction.user_id,
        transaction.account_id!,
        ticker,
        quantity,
        price,
        transaction.transaction_date
      );

      if (sellResult.error) throw new Error(sellResult.error);

      const { data: holding, error: fetchError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', transaction.user_id)
        .eq('account_id', transaction.account_id)
        .eq('symbol', ticker.toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (holding) {
        const newQuantity = Number(holding.quantity) - quantity;

        if (newQuantity <= 0) {
          const { error: deleteError } = await supabase
            .from('holdings')
            .delete()
            .eq('id', holding.id);

          if (deleteError) throw deleteError;
        } else {
          const costBasisResult =
            await LotTrackingService.calculateTotalCostBasis(
              transaction.user_id,
              ticker,
              transaction.account_id || undefined
            );

          const newCostBasis = costBasisResult.data || 0;
          const currentPrice = Number(holding.current_price);
          const newCurrentValue = newQuantity * currentPrice;

          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              quantity: newQuantity,
              cost_basis: newCostBasis,
              current_value: newCurrentValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', holding.id);

          if (updateError) throw updateError;
        }
      }

      if (transaction.account_id) {
        await InvestmentAccountService.updateInvestmentAccountBalance(
          transaction.account_id
        );
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to process sell transaction',
      };
    }
  }

  private static async processDividendTransaction(
    transaction: Transaction,
    ticker: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: holding, error: fetchError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', transaction.user_id)
        .eq('symbol', ticker.toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (holding) {
        const { error: dividendError } = await supabase
          .from('dividends')
          .insert({
            user_id: transaction.user_id,
            holding_id: holding.id,
            symbol: ticker.toUpperCase(),
            ex_date: transaction.transaction_date,
            pay_date: transaction.transaction_date,
            amount: Number(transaction.amount),
            status: 'paid',
          });

        if (dividendError) throw dividendError;
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to process dividend transaction',
      };
    }
  }

  static async syncAllUserTransactions(
    userId: string
  ): Promise<{ success: boolean; synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      if (!transactions) {
        return { success: true, synced: 0, errors: [] };
      }

      for (const transaction of transactions) {
        const result = await this.syncTransactionToHoldings(transaction);
        if (result.success) {
          synced++;
        } else if (result.error) {
          errors.push(`Transaction ${transaction.id}: ${result.error}`);
        }
      }

      return { success: true, synced, errors };
    } catch (err) {
      return {
        success: false,
        synced,
        errors: [
          err instanceof Error ? err.message : 'Failed to sync transactions',
        ],
      };
    }
  }
}
