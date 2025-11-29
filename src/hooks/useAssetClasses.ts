import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AssetClass {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

type AssetClassInsert = Omit<
  AssetClass,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;
type AssetClassUpdate = Partial<AssetClassInsert>;

export function useAssetClasses() {
  const { user } = useAuth();
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchAssetClasses();
  }, [user]);

  const fetchAssetClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_classes')
        .select('*')
        .eq('user_id', user!.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setAssetClasses(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch asset classes'
      );
    } finally {
      setLoading(false);
    }
  };

  const addAssetClass = async (assetClass: AssetClassInsert) => {
    try {
      const maxOrder =
        assetClasses.length > 0
          ? Math.max(...assetClasses.map(ac => ac.display_order))
          : -1;

      const { error } = await supabase.from('asset_classes').insert({
        ...assetClass,
        user_id: user!.id,
        display_order: maxOrder + 1,
      });

      if (error) throw error;

      await fetchAssetClasses();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to add asset class';
      return { error: errorMessage };
    }
  };

  const updateAssetClass = async (id: string, updates: AssetClassUpdate) => {
    try {
      const { error } = await supabase
        .from('asset_classes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      await fetchAssetClasses();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update asset class';
      return { error: errorMessage };
    }
  };

  const deleteAssetClass = async (id: string) => {
    try {
      const { error } = await supabase
        .from('asset_classes')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      await fetchAssetClasses();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete asset class';
      return { error: errorMessage };
    }
  };

  const reorderAssetClasses = async (reorderedClasses: AssetClass[]) => {
    try {
      const updates = reorderedClasses.map((ac, index) =>
        supabase
          .from('asset_classes')
          .update({ display_order: index })
          .eq('id', ac.id)
          .eq('user_id', user!.id)
      );

      await Promise.all(updates);
      await fetchAssetClasses();
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reorder asset classes';
      return { error: errorMessage };
    }
  };

  return {
    assetClasses,
    loading,
    error,
    addAssetClass,
    updateAssetClass,
    deleteAssetClass,
    reorderAssetClasses,
    refetch: fetchAssetClasses,
  };
}
