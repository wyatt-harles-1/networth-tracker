/**
 * ============================================================================
 * Error Handling Utilities
 * ============================================================================
 *
 * Centralized error handling utilities for the application.
 *
 * Features:
 * - Error normalization to standardized format
 * - Error logging with context
 * - Operational vs programming error detection
 * - Error fallback UI props generation
 * - User-friendly error messages
 *
 * Functions:
 * - normalizeError: Convert any error to ErrorInfo structure
 * - isOperationalError: Check if error is expected/operational
 * - logError: Log error with appropriate severity level
 * - createErrorFallbackProps: Generate UI props for error display
 *
 * Error Levels:
 * - 5xx errors: console.error (server/programming errors)
 * - 4xx errors: console.warn (client/operational errors)
 * - Unknown: console.warn (unexpected but handled)
 *
 * Usage:
 * ```tsx
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   const errorInfo = normalizeError(error, user.id);
 *   logError(errorInfo, 'RiskyOperation');
 *
 *   if (isOperationalError(error)) {
 *     // Show to user
 *   } else {
 *     // Report to monitoring service
 *   }
 * }
 * ```
 *
 * ============================================================================
 */

import { AppError, ERROR_CODES, ErrorCode } from './errors';

/**
 * Standardized error information structure
 * Used throughout the application for consistent error handling
 */
export interface ErrorInfo {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, any>;
  timestamp: string;
  userId?: string;
  isOperational?: boolean;
}

/**
 * Convert any error to a standardized ErrorInfo object
 */
export function normalizeError(error: unknown, userId?: string): ErrorInfo {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    return {
      code: error.code as ErrorCode,
      message: error.message,
      statusCode: error.statusCode,
      timestamp,
      userId,
      isOperational: error.isOperational,
    };
  }

  if (error instanceof Error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message,
      timestamp,
      userId,
    };
  }

  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    timestamp,
    userId,
  };
}

/**
 * Check if an error is operational (expected) vs programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  // Handle ErrorInfo objects
  if (error && typeof error === 'object' && 'isOperational' in error) {
    return Boolean((error as any).isOperational);
  }
  return false;
}

/**
 * Log error with appropriate level based on error type
 */
export function logError(error: ErrorInfo, context?: string): void {
  const logMessage = context ? `[${context}] ${error.message}` : error.message;

  if (error.statusCode && error.statusCode >= 500) {
    console.error(`[ERROR] ${logMessage}`, {
      code: error.code,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      userId: error.userId,
    });
  } else {
    console.warn(`[WARN] ${logMessage}`, {
      code: error.code,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      userId: error.userId,
    });
  }
}

/**
 * Get user-friendly error message for display
 */
export function getUserFriendlyMessage(error: ErrorInfo): string {
  switch (error.code) {
    case ERROR_CODES.VALIDATION_ERROR:
      return 'Please check your input and try again.';
    case ERROR_CODES.AUTHENTICATION_ERROR:
      return 'Please sign in to continue.';
    case ERROR_CODES.AUTHORIZATION_ERROR:
      return 'You do not have permission to perform this action.';
    case ERROR_CODES.NOT_FOUND_ERROR:
      return 'The requested resource was not found.';
    case ERROR_CODES.CONFLICT_ERROR:
      return 'This action conflicts with existing data.';
    case ERROR_CODES.EXTERNAL_SERVICE_ERROR:
      return 'A service is temporarily unavailable. Please try again later.';
    case ERROR_CODES.DATABASE_ERROR:
      return 'A database error occurred. Please try again.';
    case ERROR_CODES.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Determine if error should be reported to external service
 */
export function shouldReportError(error: ErrorInfo): boolean {
  // Report non-operational errors or 5xx errors
  return !isOperationalError(error) || Boolean(error.statusCode && error.statusCode >= 500);
}

/**
 * Create error boundary fallback UI props
 */
export function createErrorFallbackProps(error: ErrorInfo) {
  return {
    title: 'Something went wrong',
    message: getUserFriendlyMessage(error),
    code: error.code,
    canRetry:
      error.code !== ERROR_CODES.AUTHENTICATION_ERROR &&
      error.code !== ERROR_CODES.AUTHORIZATION_ERROR,
  };
}
