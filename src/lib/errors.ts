/**
 * ============================================================================
 * Custom Error Classes
 * ============================================================================
 *
 * Type-safe error classes for consistent error handling across the application.
 *
 * Error Hierarchy:
 * - AppError: Base error class with error codes and HTTP status codes
 * - ValidationError: Input validation failures (400)
 * - AuthenticationError: Authentication required (401)
 * - AuthorizationError: Permission denied (403)
 * - NotFoundError: Resource not found (404)
 * - ConflictError: Resource conflict (409)
 * - DatabaseError: Database operation failures (500)
 * - ExternalServiceError: Third-party API failures (502)
 * - NetworkError: Network connectivity issues
 *
 * Features:
 * - Structured error information
 * - HTTP status codes for API responses
 * - Operational vs programming error distinction
 * - Error code constants for type safety
 * - Stack trace capture
 *
 * Usage:
 * ```tsx
 * // Throw specific error
 * throw new ValidationError('Email is required', 'email');
 * throw new NotFoundError('Account');
 * throw new AuthenticationError();
 *
 * // Check error type
 * if (error instanceof AppError) {
 *   console.log(error.code, error.statusCode);
 * }
 * ```
 *
 * Operational Errors (expected, user-facing):
 * - ValidationError
 * - AuthenticationError
 * - AuthorizationError
 * - NotFoundError
 * - ConflictError
 *
 * Programming Errors (unexpected, developer-facing):
 * - DatabaseError
 * - ExternalServiceError (when not user's fault)
 *
 * ============================================================================
 */

/**
 * Base application error class
 * All custom errors extend this class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(field ? `${field}: ${message}` : message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR', 409);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(`Database error: ${message}`, 'DATABASE_ERROR', 500);
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(`Network error: ${message}`, 'NETWORK_ERROR', 0);
  }
}

// Error codes for consistent error handling
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
