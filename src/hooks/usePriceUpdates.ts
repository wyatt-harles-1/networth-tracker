import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PriceService } from '@/services/priceService';

export function usePriceUpdates() {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState({
    updated: 0,
    total: 0,
    errors: [] as string[],
  });

  const updateAllPrices = async () => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setUpdating(true);
    setProgress({ updated: 0, total: 0, errors: [] });

    try {
      const result = await PriceService.updateHoldingPrices(user.id);
      setProgress({
        updated: result.updated,
        total: result.updated,
        errors: result.errors,
      });
      return { success: result.success, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update prices';
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  };

  const updateSpecificPrices = async (symbols: string[]) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setUpdating(true);
    setProgress({ updated: 0, total: symbols.length, errors: [] });

    try {
      const result = await PriceService.updateHoldingPrices(user.id, symbols);
      setProgress({
        updated: result.updated,
        total: symbols.length,
        errors: result.errors,
      });
      return { success: result.success, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update prices';
      return { success: false, error: errorMessage };
    } finally {
      setUpdating(false);
    }
  };

  const addManualPrice = async (
    symbol: string,
    date: string,
    price: number
  ) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const result = await PriceService.storeManualPrice(
        symbol,
        date,
        price,
        user.id
      );
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to add manual price';
      return { success: false, error: errorMessage };
    }
  };

  return {
    updating,
    progress,
    updateAllPrices,
    updateSpecificPrices,
    addManualPrice,
  };
}
