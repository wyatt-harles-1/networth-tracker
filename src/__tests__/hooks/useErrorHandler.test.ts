import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock the auth context
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(AuthProvider, {}, children);
};

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  it('handles errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler(), {
      wrapper: MockAuthProvider,
    });

    const testError = new Error('Test error');
    const errorInfo = result.current.handleError(testError, 'test-context');

    expect(errorInfo.code).toBe('UNKNOWN_ERROR');
    expect(errorInfo.message).toBe('Test error');
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('[test-context] Test error'),
      expect.any(Object)
    );
  });

  it('handles async errors correctly', async () => {
    const { result } = renderHook(() => useErrorHandler(), {
      wrapper: MockAuthProvider,
    });

    const asyncFn = vi.fn().mockRejectedValue(new Error('Async error'));
    const { data, error } = await result.current.handleAsyncError(
      asyncFn,
      'async-test'
    );

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error?.message).toBe('Async error');
  });

  it('handles successful async operations', async () => {
    const { result } = renderHook(() => useErrorHandler(), {
      wrapper: MockAuthProvider,
    });

    const asyncFn = vi.fn().mockResolvedValue('success');
    const { data, error } = await result.current.handleAsyncError(
      asyncFn,
      'async-test'
    );

    expect(data).toBe('success');
    expect(error).toBeNull();
  });

  it('shows error toast in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const { result } = renderHook(() => useErrorHandler(), {
      wrapper: MockAuthProvider,
    });

    const testError = { code: 'TEST_ERROR', message: 'Test error' };
    result.current.showErrorToast(testError);

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error toast:',
      'An unexpected error occurred. Please try again.'
    );

    process.env.NODE_ENV = originalEnv;
  });
});
