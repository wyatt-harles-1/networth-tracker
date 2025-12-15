import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AllocationTargets } from '../types/database-extended';

export type AllocationTemplate = 'conservative' | 'moderate' | 'aggressive' | 'age_based' | 'custom';

export interface AllocationTarget {
  id: string;
  user_id: string;
  template_name: AllocationTemplate | null;
  targets: Record<string, number>;
  rebalance_threshold: number;
  created_at: string;
  updated_at: string;
}

// Pre-built allocation templates
export const ALLOCATION_TEMPLATES: Record<AllocationTemplate, { targets: Record<string, number>; description: string }> = {
  conservative: {
    targets: {
      'Stocks': 20,
      'Bonds': 50,
      'Cash': 20,
      'Other': 10,
    },
    description: 'Low risk, focused on capital preservation with steady income'
  },
  moderate: {
    targets: {
      'Stocks': 60,
      'Bonds': 30,
      'Cash': 5,
      'Other': 5,
    },
    description: 'Balanced growth and stability for medium-term goals'
  },
  aggressive: {
    targets: {
      'Stocks': 80,
      'Bonds': 15,
      'Other': 5,
    },
    description: 'High growth potential with higher volatility'
  },
  age_based: {
    targets: {}, // Calculated dynamically based on age
    description: 'Allocation based on your age (110 - age = % stocks)'
  },
  custom: {
    targets: {},
    description: 'Create your own custom allocation'
  },
};

export function useAllocationTargets(userId: string | undefined) {
  const [target, setTarget] = useState<AllocationTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch allocation target
  const fetchTarget = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('allocation_targets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError;
      }

      setTarget(data as AllocationTarget);
    } catch (err) {
      console.error('Error fetching allocation target:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch allocation target');
    } finally {
      setLoading(false);
    }
  };

  // Create or update allocation target
  const saveTarget = async (
    templateName: AllocationTemplate | null,
    targets: Record<string, number>,
    rebalanceThreshold: number = 5.0
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Validate that percentages add up to 100
      const total = Object.values(targets).reduce((sum, val) => sum + val, 0);
      if (Math.abs(total - 100) > 0.01) {
        return { success: false, error: `Target percentages must add up to 100% (currently ${total.toFixed(1)}%)` };
      }

      const payload: AllocationTargets['Insert'] = {
        user_id: userId,
        template_name: templateName,
        targets,
        rebalance_threshold: rebalanceThreshold,
      };

      const { data, error: saveError } = await supabase
        .from('allocation_targets')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (saveError) throw saveError;

      setTarget(data as AllocationTarget);
      return { success: true };
    } catch (err) {
      console.error('Error saving allocation target:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save allocation target';
      return { success: false, error: errorMessage };
    }
  };

  // Delete allocation target
  const deleteTarget = async (): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('allocation_targets')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      setTarget(null);
      return { success: true };
    } catch (err) {
      console.error('Error deleting allocation target:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete allocation target';
      return { success: false, error: errorMessage };
    }
  };

  // Calculate age-based allocation
  const calculateAgeBased = (age: number): Record<string, number> => {
    const stockPercentage = Math.max(0, Math.min(100, 110 - age));
    const bondPercentage = 100 - stockPercentage;

    return {
      'Stocks': stockPercentage,
      'Bonds': bondPercentage,
    };
  };

  // Load initial data
  useEffect(() => {
    fetchTarget();
  }, [userId]);

  return {
    target,
    loading,
    error,
    saveTarget,
    deleteTarget,
    refetch: fetchTarget,
    calculateAgeBased,
    templates: ALLOCATION_TEMPLATES,
  };
}
