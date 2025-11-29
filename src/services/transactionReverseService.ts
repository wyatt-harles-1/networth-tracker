import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types/transaction';
import { TransactionMetadataUtils } from '@/lib/transactionMetadataUtils';

export class TransactionReverseService {
  static async reverseTransactionEffects(
    transaction: Transaction
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const meta = TransactionMetadataUtils.getMetadata(transaction);
      const ticker = meta.ticker;
      const quantity = meta.quantity || 0;
      const price = meta.price || 0;

      console.log(
        `[Transaction Reverse] Reversing ${transaction.transaction_type} for ${ticker || 'CASH'} (source: ${meta.source})`
      );

      if (!ticker || !transaction.account_id) {
        console.log(`[Transaction Reverse] Skipping - no ticker or account_id`);
        return { success: true, error: null };
      }

      const transactionType = transaction.transaction_type;

      if (
        transactionType === 'stock_buy' ||
        transactionType === 'etf_buy' ||
        transactionType === 'crypto_buy'
      ) {
        return await this.reverseBuyTransaction(transaction, ticker, quantity);
      } else if (
        transactionType === 'stock_sell' ||
        transactionType === 'etf_sell' ||
        transactionType === 'crypto_sell'
      ) {
        return await this.reverseSellTransaction(
          transaction,
          ticker,
          quantity,
          price
        );
      } else if (
        transactionType === 'stock_dividend' ||
        transactionType === 'etf_dividend'
      ) {
        return await this.reverseDividendTransaction(transaction, ticker);
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to reverse transaction effects',
      };
    }
  }

  private static async reverseBuyTransaction(
    transaction: Transaction,
    ticker: string,
    quantity: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
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
          const { data: lots } = await supabase
            .from('holding_lots')
            .select('quantity, cost_per_share, quantity_remaining')
            .eq('holding_id', holding.id)
            .eq('lot_status', 'open')
            .gt('quantity_remaining', 0)
            .order('purchase_date', { ascending: true });

          let totalCostBasis = 0;
          if (lots) {
            totalCostBasis = lots.reduce((sum, lot) => {
              return (
                sum +
                Number(lot.quantity_remaining) * Number(lot.cost_per_share)
              );
            }, 0);
          }

          const currentPrice = Number(holding.current_price);
          const newCurrentValue = newQuantity * currentPrice;

          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              quantity: newQuantity,
              cost_basis: totalCostBasis,
              current_value: newCurrentValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', holding.id);

          if (updateError) throw updateError;
        }
      }

      const { error: lotError } = await supabase
        .from('holding_lots')
        .delete()
        .eq('transaction_id', transaction.id);

      if (lotError) throw lotError;

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to reverse buy transaction',
      };
    }
  }

  private static async reverseSellTransaction(
    transaction: Transaction,
    ticker: string,
    quantity: number,
    price: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: holding, error: fetchError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', transaction.user_id)
        .eq('account_id', transaction.account_id)
        .eq('symbol', ticker.toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (holding) {
        const newQuantity = Number(holding.quantity) + quantity;
        const newCostBasis = Number(holding.cost_basis) + quantity * price;
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
      } else {
        const assetType = transaction.transaction_type.includes('stock')
          ? 'stock'
          : transaction.transaction_type.includes('etf')
            ? 'etf'
            : transaction.transaction_type.includes('crypto')
              ? 'crypto'
              : 'other';

        const { error: insertError } = await supabase.from('holdings').insert({
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
        });

        if (insertError) throw insertError;
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to reverse sell transaction',
      };
    }
  }

  private static async reverseDividendTransaction(
    transaction: Transaction,
    ticker: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: holding, error: fetchError } = await supabase
        .from('holdings')
        .select('id')
        .eq('user_id', transaction.user_id)
        .eq('symbol', ticker.toUpperCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (holding) {
        const { error: deleteError } = await supabase
          .from('dividends')
          .delete()
          .eq('holding_id', holding.id)
          .eq('amount', Number(transaction.amount))
          .eq('pay_date', transaction.transaction_date);

        if (deleteError) throw deleteError;
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to reverse dividend transaction',
      };
    }
  }
}
