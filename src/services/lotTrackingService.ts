import { supabase } from '@/lib/supabase';

export interface HoldingLot {
  id: string;
  user_id: string;
  holding_id: string | null;
  account_id: string;
  symbol: string;
  purchase_date: string;
  quantity: number;
  quantity_remaining: number;
  cost_per_share: number;
  total_cost: number;
  transaction_id: string | null;
  lot_status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SellLotResult {
  quantitySold: number;
  costBasis: number;
  realizedGain: number;
  lotsProcessed: HoldingLot[];
}

export class LotTrackingService {
  static async createLot(
    userId: string,
    accountId: string,
    symbol: string,
    purchaseDate: string,
    quantity: number,
    costPerShare: number,
    transactionId?: string,
    holdingId?: string
  ): Promise<{ data: HoldingLot | null; error: string | null }> {
    try {
      const totalCost = quantity * costPerShare;

      const { data, error } = await supabase
        .from('holding_lots')
        .insert({
          user_id: userId,
          holding_id: holdingId || null,
          account_id: accountId,
          symbol: symbol.toUpperCase(),
          purchase_date: purchaseDate,
          quantity,
          quantity_remaining: quantity,
          cost_per_share: costPerShare,
          total_cost: totalCost,
          transaction_id: transactionId || null,
          lot_status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to create lot',
      };
    }
  }

  static async sellShares(
    userId: string,
    accountId: string,
    symbol: string,
    quantityToSell: number,
    salePrice: number,
    _saleDate: string
  ): Promise<{ data: SellLotResult | null; error: string | null }> {
    try {
      const { data: lots, error: fetchError } = await supabase
        .from('holding_lots')
        .select('*')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .eq('symbol', symbol.toUpperCase())
        .eq('lot_status', 'open')
        .gt('quantity_remaining', 0)
        .order('purchase_date', { ascending: true });

      if (fetchError) throw fetchError;
      if (!lots || lots.length === 0) {
        throw new Error('No lots available to sell');
      }

      let remainingToSell = quantityToSell;
      let totalCostBasis = 0;
      const lotsProcessed: HoldingLot[] = [];

      for (const lot of lots) {
        if (remainingToSell <= 0) break;

        const quantityFromThisLot = Math.min(
          remainingToSell,
          Number(lot.quantity_remaining)
        );

        const costBasisFromLot =
          quantityFromThisLot * Number(lot.cost_per_share);
        totalCostBasis += costBasisFromLot;

        const newQuantityRemaining =
          Number(lot.quantity_remaining) - quantityFromThisLot;
        const newStatus = newQuantityRemaining === 0 ? 'closed' : 'open';

        const { error: updateError } = await supabase
          .from('holding_lots')
          .update({
            quantity_remaining: newQuantityRemaining,
            lot_status: newStatus,
          })
          .eq('id', lot.id);

        if (updateError) throw updateError;

        lotsProcessed.push({
          ...lot,
          quantity_remaining: newQuantityRemaining,
          lot_status: newStatus,
        });

        remainingToSell -= quantityFromThisLot;
      }

      if (remainingToSell > 0) {
        throw new Error(
          `Insufficient shares to sell. Missing ${remainingToSell} shares`
        );
      }

      const totalSaleValue = quantityToSell * salePrice;
      const realizedGain = totalSaleValue - totalCostBasis;

      return {
        data: {
          quantitySold: quantityToSell,
          costBasis: totalCostBasis,
          realizedGain,
          lotsProcessed,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to process sale',
      };
    }
  }

  static async getOpenLots(
    userId: string,
    symbol?: string
  ): Promise<{ data: HoldingLot[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('holding_lots')
        .select('*')
        .eq('user_id', userId)
        .eq('lot_status', 'open')
        .gt('quantity_remaining', 0)
        .order('purchase_date', { ascending: true });

      if (symbol) {
        query = query.eq('symbol', symbol.toUpperCase());
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch lots',
      };
    }
  }

  static async calculateTotalCostBasis(
    userId: string,
    symbol: string,
    accountId?: string
  ): Promise<{ data: number | null; error: string | null }> {
    try {
      let query = supabase
        .from('holding_lots')
        .select('quantity_remaining, cost_per_share')
        .eq('user_id', userId)
        .eq('symbol', symbol.toUpperCase())
        .eq('lot_status', 'open')
        .gt('quantity_remaining', 0);

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalCostBasis = (data || []).reduce((sum, lot) => {
        return (
          sum + Number(lot.quantity_remaining) * Number(lot.cost_per_share)
        );
      }, 0);

      return { data: totalCostBasis, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err.message : 'Failed to calculate cost basis',
      };
    }
  }

  static async getAverageCostBasis(
    userId: string,
    symbol: string,
    accountId?: string
  ): Promise<{ data: number | null; error: string | null }> {
    try {
      let query = supabase
        .from('holding_lots')
        .select('quantity_remaining, cost_per_share')
        .eq('user_id', userId)
        .eq('symbol', symbol.toUpperCase())
        .eq('lot_status', 'open')
        .gt('quantity_remaining', 0);

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return { data: 0, error: null };
      }

      let totalCost = 0;
      let totalQuantity = 0;

      data.forEach(lot => {
        const quantity = Number(lot.quantity_remaining);
        const cost = Number(lot.cost_per_share);
        totalCost += quantity * cost;
        totalQuantity += quantity;
      });

      const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

      return { data: averageCost, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to calculate average cost',
      };
    }
  }
}
