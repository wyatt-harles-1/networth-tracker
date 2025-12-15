import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AllocationRecommendations } from '../types/database-extended';

export type RecommendationType = 'rebalance' | 'tax_optimize' | 'diversify' | 'risk_adjustment' | 'insight';
export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  user_id: string;
  recommendation_type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  action_items: any[] | null;
  expected_impact: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

export function useAllocationRecommendations(userId: string | undefined) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendations
  const fetchRecommendations = async (includesDismissed: boolean = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('allocation_recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true }) // high, medium, low
        .order('created_at', { ascending: false });

      if (!includesDismissed) {
        query = query.eq('is_dismissed', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRecommendations(data as Recommendation[]);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Create a new recommendation
  const createRecommendation = async (
    recommendationType: RecommendationType,
    priority: RecommendationPriority,
    title: string,
    description: string,
    actionItems?: any[],
    expectedImpact?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const payload: AllocationRecommendations['Insert'] = {
        user_id: userId,
        recommendation_type: recommendationType,
        priority,
        title,
        description,
        action_items: actionItems || null,
        expected_impact: expectedImpact || null,
      };

      const { data, error: createError } = await supabase
        .from('allocation_recommendations')
        .insert(payload)
        .select()
        .single();

      if (createError) throw createError;

      setRecommendations(prev => [data as Recommendation, ...prev]);
      return { success: true };
    } catch (err) {
      console.error('Error creating recommendation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create recommendation';
      return { success: false, error: errorMessage };
    }
  };

  // Dismiss a recommendation
  const dismissRecommendation = async (recommendationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { error: updateError } = await supabase
        .from('allocation_recommendations')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', recommendationId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
      return { success: true };
    } catch (err) {
      console.error('Error dismissing recommendation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to dismiss recommendation';
      return { success: false, error: errorMessage };
    }
  };

  // Restore a dismissed recommendation
  const restoreRecommendation = async (recommendationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data, error: updateError } = await supabase
        .from('allocation_recommendations')
        .update({
          is_dismissed: false,
          dismissed_at: null,
        })
        .eq('id', recommendationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      setRecommendations(prev => [data as Recommendation, ...prev]);
      return { success: true };
    } catch (err) {
      console.error('Error restoring recommendation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore recommendation';
      return { success: false, error: errorMessage };
    }
  };

  // Delete a recommendation permanently
  const deleteRecommendation = async (recommendationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('allocation_recommendations')
        .delete()
        .eq('id', recommendationId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting recommendation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete recommendation';
      return { success: false, error: errorMessage };
    }
  };

  // Clear all recommendations (useful when regenerating)
  const clearAllRecommendations = async (): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('allocation_recommendations')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      setRecommendations([]);
      return { success: true };
    } catch (err) {
      console.error('Error clearing recommendations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear recommendations';
      return { success: false, error: errorMessage };
    }
  };

  // Get recommendations by priority
  const getByPriority = (priority: RecommendationPriority): Recommendation[] => {
    return recommendations.filter(r => r.priority === priority);
  };

  // Get recommendations by type
  const getByType = (type: RecommendationType): Recommendation[] => {
    return recommendations.filter(r => r.recommendation_type === type);
  };

  // Load initial data
  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  return {
    recommendations,
    loading,
    error,
    createRecommendation,
    dismissRecommendation,
    restoreRecommendation,
    deleteRecommendation,
    clearAllRecommendations,
    refetch: fetchRecommendations,
    getByPriority,
    getByType,
  };
}
