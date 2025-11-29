/**
 * ============================================================================
 * Supabase Client Configuration
 * ============================================================================
 *
 * Initializes and exports the Supabase client for database access.
 *
 * Supabase provides:
 * - PostgreSQL database with Row Level Security (RLS)
 * - Real-time subscriptions
 * - Authentication
 * - Storage
 * - Edge functions
 *
 * Configuration:
 * - URL and anonymous key loaded from environment variables
 * - TypeScript types from generated database schema
 * - Single client instance shared across application
 *
 * Usage:
 * ```tsx
 * import { supabase } from '@/lib/supabase';
 *
 * // Query data
 * const { data, error } = await supabase
 *   .from('accounts')
 *   .select('*')
 *   .eq('user_id', userId);
 *
 * // Real-time subscription
 * supabase
 *   .channel('changes')
 *   .on('postgres_changes', { ... }, callback)
 *   .subscribe();
 * ```
 *
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '@/config/env';
import { Database } from '@/types/database';

/**
 * Supabase client instance
 *
 * Configured with:
 * - Database URL from environment
 * - Anonymous (public) API key for client-side access
 * - TypeScript types for type-safe database queries
 *
 * Note: Row Level Security (RLS) policies enforce user-level access control,
 * so the public anon key is safe to use client-side.
 */
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey
);
