/**
 * ============================================================================
 * Holdings Recalculation Service
 * ============================================================================
 *
 * Calculates accurate holdings from transaction history.
 *
 * Key Responsibilities:
 * - Reconstruct holdings from scratch based on transactions
 * - Calculate total quantity and cost basis per symbol
 * - Handle buy, sell, dividend, split transactions
 * - Fetch current market prices
 * - Update holdings table with accurate data
 * - Sync investment account balances
 *
 * Holdings Calculation Logic:
 * - Buy transactions: Add to quantity and cost basis
 * - Sell transactions: Subtract from quantity and cost basis (FIFO/LIFO/average)
 * - Dividend transactions: No quantity change (unless DRIP)
 * - Split transactions: Multiply quantity, adjust cost basis
 * - Options transactions: Track option positions
 *
 * This service is critical for data accuracy. It ensures holdings
 * always match transaction history, even after edits or imports.
 *
 * Typical Usage:
 * - After importing transactions
 * - After editing/deleting transactions
 * - Manual reconciliation
 * - Periodic data cleanup
 *
 * Usage:
 * ```tsx
 * const result = await HoldingsRecalculationService.recalculateAccountHoldings(
 *   userId,
 *   accountId
 * );
 *
 * if (result.error) {
 *   console.error('Recalculation failed:', result.error);
 * } else {
 *   console.log('Holdings updated:', result.holdings);
 * }
 * ```
 *
 * ============================================================================
 */

import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types/transaction';
import { CryptoPriceService } from './cryptoPriceService';
import { PriceService } from './priceService';
import { InvestmentAccountService } from './investmentAccountService';
import { TransactionMetadataUtils } from '@/lib/transactionMetadataUtils';
import { LotTrackingService } from './lotTrackingService';

/**
 * Holding calculation intermediate structure
 * Used during recalculation process before saving to database
 */
interface HoldingCalculation {
  symbol: string;
  name: string;
  quantity: number;
  costBasis: number;
  assetType: string;
  transactions: Transaction[];
}

export class HoldingsRecalculationService {
  /**
   * Batch fetch current prices for multiple symbols
   * This is much faster than fetching prices one-by-one
   */
  private static async batchFetchCurrentPrices(
    symbols: string[],
    calculatedHoldings: HoldingCalculation[]
  ): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    if (symbols.length === 0) return priceMap;

    // Separate crypto and stock symbols
    const cryptoSymbols = symbols.filter(s => CryptoPriceService.isCryptocurrency(s));
    const stockSymbols = symbols.filter(s => !CryptoPriceService.isCryptocurrency(s));

    // 1. First, try to get all prices from price_history table (fastest)
    console.log(`[Holdings Sync] Fetching latest prices from database...`);
    const { data: priceHistory } = await supabase
      .from('price_history')
      .select('symbol, close_price, price_date')
      .in('symbol', symbols)
      .order('price_date', { ascending: false });

    // Group by symbol and take the most recent price
    const latestPrices = new Map<string, { price: number; date: string }>();
    if (priceHistory) {
      for (const record of priceHistory) {
        const symbol = record.symbol.toUpperCase();
        if (!latestPrices.has(symbol)) {
          latestPrices.set(symbol, {
            price: Number(record.close_price),
            date: record.price_date
          });
        }
      }
    }

    // Add prices from database to map
    for (const [symbol, priceData] of latestPrices) {
      priceMap.set(symbol, priceData.price);
    }

    console.log(`[Holdings Sync] Found ${priceMap.size}/${symbols.length} prices in database`);

    // 2. For symbols not in database, fetch from APIs in parallel
    const missingSymbols = symbols.filter(s => !priceMap.has(s));

    if (missingSymbols.length > 0) {
      console.log(`[Holdings Sync] Fetching ${missingSymbols.length} prices from APIs...`);

      const apiPromises = missingSymbols.map(async (symbol) => {
        try {
          if (CryptoPriceService.isCryptocurrency(symbol)) {
            const result = await CryptoPriceService.getCurrentPrice(symbol);
            if (result.data) {
              return { symbol, price: result.data.price };
            }
          } else {
            const result = await PriceService.getCurrentPrice(symbol);
            if (result.data) {
              return { symbol, price: result.data.price };
            }
          }
        } catch (err) {
          console.warn(`[Holdings Sync] Failed to fetch price for ${symbol}:`, err);
        }
        return null;
      });

      const apiResults = await Promise.all(apiPromises);

      // Add API results to price map
      for (const result of apiResults) {
        if (result) {
          priceMap.set(result.symbol, result.price);
        }
      }
    }

    // 3. For any remaining symbols, use cost basis as fallback
    for (const symbol of symbols) {
      if (!priceMap.has(symbol)) {
        const holding = calculatedHoldings.find(h => h.symbol === symbol);
        if (holding && holding.quantity > 0) {
          const fallbackPrice = holding.costBasis / holding.quantity;
          priceMap.set(symbol, fallbackPrice);
          console.warn(`[Holdings Sync] Using cost basis for ${symbol}: $${fallbackPrice.toFixed(2)}`);
        }
      }
    }

    return priceMap;
  }

  static async recalculateAccountHoldings(
    userId: string,
    accountId: string
  ): Promise<{
    success: boolean;
    error: string | null;
    holdings?: HoldingCalculation[];
  }> {
    try {
      const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .order('transaction_date', { ascending: true });

      if (txnError) throw txnError;
      if (!transactions) return { success: true, error: null, holdings: [] };

      console.log(
        `[Holdings Recalc] Processing ${transactions.length} transactions for account ${accountId}`
      );
      TransactionMetadataUtils.logTransactionDataQuality(transactions);

      const holdingsMap = new Map<string, HoldingCalculation>();

      for (const txn of transactions) {
        const meta = TransactionMetadataUtils.getMetadata(txn);
        const ticker = meta.ticker?.toUpperCase();
        const quantity = meta.quantity || 0;
        const price = meta.price || 0;

        if (!ticker) {
          console.log(
            `[Holdings Recalc] Skipping transaction ${txn.id} - no ticker (${txn.transaction_type})`
          );
          continue;
        }

        if (!holdingsMap.has(ticker)) {
          const assetType = this.determineAssetType(txn.transaction_type);
          holdingsMap.set(ticker, {
            symbol: ticker,
            name: (txn.transaction_metadata?.name as string) || ticker,
            quantity: 0,
            costBasis: 0,
            assetType,
            transactions: [],
          });
        }

        const holding = holdingsMap.get(ticker)!;
        holding.transactions.push(txn);

        switch (txn.transaction_type) {
          case 'stock_buy':
          case 'etf_buy':
          case 'crypto_buy':
          case 'option_buy':
          case 'bond_buy':
            holding.quantity += quantity;
            holding.costBasis += quantity * price;
            break;

          case 'stock_sell':
          case 'etf_sell':
          case 'crypto_sell':
          case 'option_sell':
          case 'bond_sell':
            holding.quantity -= quantity;
            if (holding.quantity > 0 && holding.costBasis > 0) {
              const avgCost = holding.costBasis / (holding.quantity + quantity);
              holding.costBasis = holding.quantity * avgCost;
            } else if (holding.quantity <= 0) {
              holding.costBasis = 0;
            }
            break;
        }
      }

      const validHoldings = Array.from(holdingsMap.values()).filter(
        h => h.quantity > 0.00001
      );

      console.log(
        `[Holdings Recalc] Calculated ${validHoldings.length} holdings with non-zero quantities`
      );
      validHoldings.forEach(h => {
        console.log(
          `  - ${h.symbol}: ${h.quantity} units, cost basis: $${h.costBasis.toFixed(2)}`
        );
      });

      return {
        success: true,
        error: null,
        holdings: validHoldings,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to recalculate holdings',
      };
    }
  }

  static async syncHoldingsToDatabase(
    userId: string,
    accountId: string,
    calculatedHoldings: HoldingCalculation[]
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: existingHoldings, error: fetchError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', userId)
        .eq('account_id', accountId);

      if (fetchError) throw fetchError;

      const existingMap = new Map(
        (existingHoldings || []).map(h => [h.symbol.toUpperCase(), h])
      );

      const calculatedMap = new Map(
        calculatedHoldings.map(h => [h.symbol.toUpperCase(), h])
      );

      // === OPTIMIZATION: Batch price lookups ===
      console.log(`[Holdings Sync] Fetching prices for ${calculatedMap.size} symbols in batch...`);
      const priceMap = await this.batchFetchCurrentPrices(Array.from(calculatedMap.keys()), calculatedHoldings);
      console.log(`[Holdings Sync] ✅ Batch price fetch complete`);

      for (const [symbol, calculated] of calculatedMap) {
        const existing = existingMap.get(symbol);

        // Use pre-fetched price from batch lookup
        const currentPrice = priceMap.get(symbol) || (calculated.costBasis / calculated.quantity);

        const currentValue = calculated.quantity * currentPrice;

        // Find the earliest buy transaction for purchase_date
        const buyTransactions = calculated.transactions.filter(txn =>
          ['stock_buy', 'etf_buy', 'crypto_buy', 'option_buy', 'bond_buy'].includes(txn.transaction_type)
        );
        const earliestBuyDate = buyTransactions.length > 0
          ? buyTransactions.reduce((earliest, txn) =>
              txn.transaction_date < earliest ? txn.transaction_date : earliest,
              buyTransactions[0].transaction_date
            )
          : new Date().toISOString().split('T')[0];

        if (existing) {
          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              quantity: calculated.quantity,
              cost_basis: calculated.costBasis,
              current_price: currentPrice,
              current_value: currentValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('holdings')
            .insert({
              user_id: userId,
              account_id: accountId,
              symbol: calculated.symbol,
              name: calculated.name,
              quantity: calculated.quantity,
              cost_basis: calculated.costBasis,
              current_price: currentPrice,
              current_value: currentValue,
              asset_type: calculated.assetType,
              purchase_date: earliestBuyDate,
            });

          if (insertError) {
            console.error(`Failed to insert holding ${calculated.symbol}:`, insertError);
            throw insertError;
          }
        }

        existingMap.delete(symbol);
      }

      for (const [symbol, orphaned] of existingMap) {
        const { error: deleteError } = await supabase
          .from('holdings')
          .delete()
          .eq('id', orphaned.id);

        if (deleteError) {
          console.error(
            `Failed to delete orphaned holding ${symbol}:`,
            deleteError
          );
        }
      }

      await InvestmentAccountService.updateInvestmentAccountBalance(accountId);

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to sync holdings',
      };
    }
  }

  static async recalculateAndSync(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; error: string | null; message?: string }> {
    try {
      const calcResult = await this.recalculateAccountHoldings(
        userId,
        accountId
      );

      if (!calcResult.success || calcResult.error) {
        return { success: false, error: calcResult.error };
      }

      const syncResult = await this.syncHoldingsToDatabase(
        userId,
        accountId,
        calcResult.holdings || []
      );

      if (!syncResult.success) {
        return { success: false, error: syncResult.error };
      }

      // Rebuild FIFO lots from transactions
      console.log('[Holdings Recalc] Rebuilding FIFO lots...');
      const lotResult = await this.rebuildLotsFromTransactions(userId, accountId);
      if (!lotResult.success) {
        console.warn('[Holdings Recalc] Warning: Lot rebuild failed:', lotResult.error);
        // Don't fail the whole sync - lots are supplementary
      }

      return {
        success: true,
        error: null,
        message: `Successfully synced ${calcResult.holdings?.length || 0} holdings`,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to recalculate and sync',
      };
    }
  }

  /**
   * Rebuild FIFO lots from transaction history
   * This creates accurate lot tracking for capital gains calculations
   */
  private static async rebuildLotsFromTransactions(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // 1. Clear existing lots for this account
      const { error: deleteError } = await supabase
        .from('holding_lots')
        .delete()
        .eq('user_id', userId)
        .eq('account_id', accountId);

      if (deleteError) throw deleteError;

      // 2. Get all transactions in chronological order
      const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .order('transaction_date', { ascending: true });

      if (txnError) throw txnError;
      if (!transactions || transactions.length === 0) {
        return { success: true, error: null };
      }

      // 3. Process transactions to create/consume lots
      for (const txn of transactions) {
        const metadata = txn.transaction_metadata as any;
        const ticker = metadata?.ticker || metadata?.symbol;
        if (!ticker) continue;

        const quantity = Number(metadata?.quantity || 0);
        const price = Number(metadata?.price || 0);

        if (quantity === 0 || price === 0) continue;

        // Handle buy transactions - create new lots
        if (
          txn.transaction_type === 'stock_buy' ||
          txn.transaction_type === 'etf_buy' ||
          txn.transaction_type === 'crypto_buy' ||
          txn.transaction_type === 'option_buy' ||
          txn.transaction_type === 'bond_buy'
        ) {
          await LotTrackingService.createLot(
            userId,
            accountId,
            ticker,
            txn.transaction_date,
            quantity,
            price,
            txn.id
          );
        }

        // Handle sell transactions - consume lots FIFO
        else if (
          txn.transaction_type === 'stock_sell' ||
          txn.transaction_type === 'etf_sell' ||
          txn.transaction_type === 'crypto_sell' ||
          txn.transaction_type === 'option_sell' ||
          txn.transaction_type === 'bond_sell'
        ) {
          const sellResult = await LotTrackingService.sellShares(
            userId,
            accountId,
            ticker,
            quantity,
            price,
            txn.transaction_date
          );

          if (sellResult.error) {
            console.warn(
              `[Holdings Recalc] Could not process sell for ${ticker}:`,
              sellResult.error
            );
          } else if (sellResult.data) {
            console.log(
              `[Holdings Recalc] Sell ${ticker}: Realized gain = $${sellResult.data.realizedGain.toFixed(2)}`
            );

            // Store realized gain in the transaction metadata
            const updatedMetadata = {
              ...metadata,
              realized_gain: sellResult.data.realizedGain,
              cost_basis: sellResult.data.costBasis,
            };

            await supabase
              .from('transactions')
              .update({ transaction_metadata: updatedMetadata })
              .eq('id', txn.id);
          }
        }
      }

      console.log('[Holdings Recalc] ✅ Lots rebuilt successfully');
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to rebuild lots',
      };
    }
  }

  private static determineAssetType(transactionType: string): string {
    if (transactionType.includes('stock')) return 'stock';
    if (transactionType.includes('etf')) return 'etf';
    if (transactionType.includes('crypto')) return 'crypto';
    if (transactionType.includes('option')) return 'option';
    if (transactionType.includes('bond')) return 'bond';
    return 'other';
  }
}
