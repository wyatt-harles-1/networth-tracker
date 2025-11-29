/**
 * ============================================================================
 * useErrorHandler Hook - Centralized Error Handling
 * ============================================================================
 *
 * Provides standardized error handling throughout the application.
 * Normalizes errors, logs them, and integrates with error reporting services.
 *
 * Features:
 * - Normalize errors from various sources (Error objects, strings, unknown types)
 * - Log errors with context for debugging
 * - Generate user-friendly error messages
 * - Async error handling with try/catch wrapper
 * - Integration points for error reporting services (Sentry, LogRocket, etc.)
 * - User-scoped error tracking
 *
 * Usage:
 * ```tsx
 * const { handleError, handleAsyncError, showErrorToast } = useErrorHandler();
 *
 * // Handle synchronous errors
 * try {
 *   throw new Error('Something went wrong');
 * } catch (err) {
 *   const errorInfo = handleError(err, 'UserProfile update');
 *   showErrorToast(errorInfo);
 * }
 *
 * // Handle async errors
 * const { data, error } = await handleAsyncError(
 *   () => supabase.from('accounts').select('*'),
 *   'Fetching accounts'
 * );
 * if (error) {
 *   showErrorToast(error);
 * }
 * ```
 *
 * Error Flow:
 * 1. Error occurs in component or service
 * 2. Hook normalizes error to standard ErrorInfo format
 * 3. Error is logged with context
 * 4. If severity threshold met, error is reported to external service
 * 5. User-friendly message generated and displayed to user
 *
 * ============================================================================
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  normalizeError,
  logError,
  getUserFriendlyMessage,
  shouldReportError,
} from '@/lib/errorHandling';
import { ErrorInfo } from '@/lib/errorHandling';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Return type for useErrorHandler hook
 */
interface UseErrorHandlerReturn {
  /** Handle any error and normalize it */
  handleError: (error: unknown, context?: string) => ErrorInfo;

  /** Wrap async function with try/catch error handling */
  handleAsyncError: <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ) => Promise<{ data: T | null; error: ErrorInfo | null }>;

  /** Display error to user via toast notification */
  showErrorToast: (error: ErrorInfo) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useErrorHandler Hook
 *
 * Provides error handling utilities with user context.
 * All error handling methods are memoized for stable references.
 *
 * @returns Error handling methods
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  // ===== HOOKS =====
  const { user } = useAuth();

  // ===== ERROR HANDLING METHODS =====

  /**
   * Handle and normalize any error
   *
   * Converts any error type (Error object, string, unknown) into
   * a standardized ErrorInfo object. Logs the error and reports
   * to external services if severity threshold is met.
   *
   * @param error - Error to handle (any type)
   * @param context - Optional context string for debugging (e.g., "Fetching accounts")
   * @returns Normalized error information
   *
   * @example
   * ```tsx
   * try {
   *   await supabase.from('accounts').insert(data);
   * } catch (err) {
   *   const errorInfo = handleError(err, 'Creating account');
   *   showErrorToast(errorInfo);
   * }
   * ```
   */
  const handleError = useCallback(
    (error: unknown, context?: string): ErrorInfo => {
      // Normalize error to standard format
      const normalizedError = normalizeError(error, user?.id);

      // Log error with context for debugging
      logError(normalizedError, context);

      // Report to external service if error is severe enough
      // (e.g., production errors, authentication failures, database errors)
      if (shouldReportError(normalizedError)) {
        // TODO: Integrate with error reporting service (Sentry, LogRocket, etc.)
        console.error('Error should be reported:', normalizedError);
      }

      return normalizedError;
    },
    [user?.id]
  );

  /**
   * Handle async operations with automatic error handling
   *
   * Wraps an async function with try/catch and returns both data and error.
   * This eliminates the need for manual try/catch blocks in components.
   *
   * Returns an object with either:
   * - Success: { data: T, error: null }
   * - Failure: { data: null, error: ErrorInfo }
   *
   * @param asyncFn - Async function to execute
   * @param context - Optional context for error logging
   * @returns Promise resolving to { data, error } object
   *
   * @example
   * ```tsx
   * const { data, error } = await handleAsyncError(
   *   () => supabase.from('accounts').select('*'),
   *   'Fetching accounts'
   * );
   *
   * if (error) {
   *   showErrorToast(error);
   *   return;
   * }
   *
   * // Use data safely
   * setAccounts(data);
   * ```
   */
  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context?: string
    ): Promise<{ data: T | null; error: ErrorInfo | null }> => {
      try {
        const data = await asyncFn();
        return { data, error: null };
      } catch (error) {
        const errorInfo = handleError(error, context);
        return { data: null, error: errorInfo };
      }
    },
    [handleError]
  );

  /**
   * Display error to user via toast notification
   *
   * Converts ErrorInfo to user-friendly message and displays it.
   * In development mode, also shows browser alert for visibility.
   *
   * Note: Currently using console.error and alert as fallback.
   * TODO: Integrate with proper toast notification library.
   *
   * @param error - Normalized error information
   *
   * @example
   * ```tsx
   * const errorInfo = handleError(err, 'Deleting account');
   * showErrorToast(errorInfo);
   * ```
   */
  const showErrorToast = useCallback((error: ErrorInfo) => {
    // Generate user-friendly message from error
    const message = getUserFriendlyMessage(error);

    // TODO: Integrate with toast notification system (e.g., react-hot-toast)
    console.error('Error toast:', message);

    // In development, show alert for immediate visibility
    if (process.env.NODE_ENV === 'development') {
      alert(`Error: ${message}`);
    }
  }, []);

  // ===== RETURN =====
  return {
    /** Handle and normalize any error */
    handleError,

    /** Wrap async function with error handling */
    handleAsyncError,

    /** Display error toast to user */
    showErrorToast,
  };
}
