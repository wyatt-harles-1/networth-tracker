/**
 * ============================================================================
 * Environment Configuration
 * ============================================================================
 *
 * Type-safe environment variable validation and configuration management.
 *
 * Features:
 * - Runtime validation of environment variables using Zod
 * - Type-safe access to configuration values
 * - Environment-specific configuration (dev/prod/test)
 * - Clear error messages if required variables are missing
 *
 * Required Environment Variables:
 * - VITE_SUPABASE_URL: Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Supabase anonymous API key
 * - VITE_ALPHA_VANTAGE_API_KEY: Alpha Vantage API key for stock prices
 *
 * Optional Environment Variables:
 * - NODE_ENV: Environment mode (development/production/test)
 * - VITE_DEBUG: Enable debug mode (true/false)
 *
 * Configuration Structure:
 * - env: Validated raw environment variables
 * - config: Application configuration derived from env vars
 *
 * Usage:
 * ```tsx
 * import { config } from '@/config/env';
 *
 * if (config.isDevelopment) {
 *   console.log('Running in development mode');
 * }
 *
 * const apiKey = config.alphaVantage.apiKey;
 * ```
 *
 * ============================================================================
 */

import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates and transforms environment variables at runtime
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  VITE_ALPHA_VANTAGE_API_KEY: z.string().optional(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  VITE_DEBUG: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
});

/**
 * Validated environment variables
 */
export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_ALPHA_VANTAGE_API_KEY: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY,
  NODE_ENV: import.meta.env.NODE_ENV,
  VITE_DEBUG: import.meta.env.VITE_DEBUG,
});

/**
 * Environment-specific configuration
 */
export const config = {
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  debug: env.VITE_DEBUG,

  // API Configuration
  supabase: {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  },

  alphaVantage: {
    apiKey: env.VITE_ALPHA_VANTAGE_API_KEY,
  },

  // App Configuration
  app: {
    name: 'NetWorth Tracker',
    version: '1.0.0',
  },
} as const;

export type Config = typeof config;
