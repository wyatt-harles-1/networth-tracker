import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import {
  normalizeError,
  isOperationalError,
  logError,
  getUserFriendlyMessage,
  shouldReportError,
  createErrorFallbackProps,
} from '@/lib/errorHandling';
import { AppError } from '@/lib/errors';
import { ErrorInfo } from '@/lib/errorHandling';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('errorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('normalizeError', () => {
    it('normalizes AppError correctly', () => {
      const error = new AppError('Test error', 'VALIDATION_ERROR', 400);
      const result = normalizeError(error, 'user-123');

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Test error');
      expect(result.statusCode).toBe(400);
      expect(result.userId).toBe('user-123');
    });

    it('normalizes regular Error correctly', () => {
      const error = new Error('Regular error');
      const result = normalizeError(error);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Regular error');
      expect(result.userId).toBeUndefined();
    });

    it('handles unknown error types', () => {
      const result = normalizeError('string error');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('An unknown error occurred');
    });
  });

  describe('isOperationalError', () => {
    it('returns true for operational errors', () => {
      const error = new AppError('Test', 'VALIDATION_ERROR', 400);
      expect(isOperationalError(error)).toBe(true);
    });

    it('returns false for non-operational errors', () => {
      const error = new AppError('Test', 'UNKNOWN_ERROR', 500, false);
      expect(isOperationalError(error)).toBe(false);
    });

    it('returns false for regular errors', () => {
      const error = new Error('Regular error');
      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('logError', () => {
    it('logs errors with 5xx status as error level', () => {
      const error = {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        statusCode: 500,
        timestamp: '2023-01-01T00:00:00Z',
      };

      logError(error, 'test-context');

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ERROR] [test-context] Database connection failed',
        expect.objectContaining({
          code: 'DATABASE_ERROR',
          statusCode: 500,
        })
      );
    });

    it('logs other errors as warn level', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        statusCode: 400,
        timestamp: '2023-01-01T00:00:00Z',
      };

      logError(error);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[WARN] Invalid input',
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        })
      );
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('returns appropriate messages for different error codes', () => {
      expect(getUserFriendlyMessage({ code: 'VALIDATION_ERROR' } as ErrorInfo)).toBe(
        'Please check your input and try again.'
      );
      expect(getUserFriendlyMessage({ code: 'AUTHENTICATION_ERROR' } as ErrorInfo)).toBe(
        'Please sign in to continue.'
      );
      expect(getUserFriendlyMessage({ code: 'NETWORK_ERROR' } as ErrorInfo)).toBe(
        'Network error. Please check your connection and try again.'
      );
      expect(getUserFriendlyMessage({ code: 'UNKNOWN_ERROR' } as ErrorInfo)).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });
  });

  describe('shouldReportError', () => {
    it('returns true for non-operational errors', () => {
      const error = { code: 'UNKNOWN_ERROR' } as ErrorInfo;
      expect(shouldReportError(error)).toBe(true);
    });

    it('returns true for 5xx errors', () => {
      const error = { code: 'DATABASE_ERROR', statusCode: 500 } as ErrorInfo;
      expect(shouldReportError(error)).toBe(true);
    });

    it('returns false for operational 4xx errors', () => {
      const error = new AppError('Validation error', 'VALIDATION_ERROR', 400, true);
      const normalizedError = normalizeError(error);
      expect(shouldReportError(normalizedError)).toBe(false);
    });
  });

  describe('createErrorFallbackProps', () => {
    it('creates appropriate fallback props', () => {
      const error = { code: 'VALIDATION_ERROR' } as ErrorInfo;
      const props = createErrorFallbackProps(error);

      expect(props.title).toBe('Something went wrong');
      expect(props.message).toBe('Please check your input and try again.');
      expect(props.code).toBe('VALIDATION_ERROR');
      expect(props.canRetry).toBe(true);
    });

    it('disables retry for auth errors', () => {
      const error = { code: 'AUTHENTICATION_ERROR' } as ErrorInfo;
      const props = createErrorFallbackProps(error);

      expect(props.canRetry).toBe(false);
    });
  });
});
