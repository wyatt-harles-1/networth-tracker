/**
 * ============================================================================
 * ErrorBoundary Component
 * ============================================================================
 *
 * React error boundary for catching and handling component errors gracefully.
 *
 * Features:
 * - Catches JavaScript errors anywhere in child component tree
 * - Prevents entire app crash from component errors
 * - Displays user-friendly error message
 * - "Try Again" button to reset error state
 * - "Reload Page" button for full refresh
 * - Custom fallback UI support
 * - Error logging to console/monitoring service
 * - Development mode: Shows error stack trace
 * - Production mode: Hides technical details
 *
 * Error Handling Flow:
 * 1. Error occurs in child component
 * 2. ErrorBoundary catches error
 * 3. Error is normalized and logged
 * 4. User sees friendly error UI
 * 5. User can retry or reload
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * With error callback:
 * ```tsx
 * <ErrorBoundary onError={(error, info) => logToService(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * Props:
 * - children: Components to protect
 * - fallback: Custom error UI (optional)
 * - onError: Error callback for logging (optional)
 *
 * ============================================================================
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  normalizeError,
  createErrorFallbackProps,
  logError,
  type ErrorInfo as CustomErrorInfo,
} from '@/lib/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: CustomErrorInfo | null;
}

/**
 * Error boundary component class
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const normalizedError = normalizeError(error);
    logError(normalizedError, 'ErrorBoundary');

    this.setState({
      errorInfo: normalizedError,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorInfo = this.state.errorInfo;
      const fallbackProps = errorInfo
        ? createErrorFallbackProps(errorInfo)
        : {
            title: 'Something went wrong',
            message: 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR',
            canRetry: true,
          };

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                {fallbackProps.title}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {fallbackProps.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                  <summary className="cursor-pointer font-medium">
                    Error Details
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                {fallbackProps.canRetry && (
                  <Button onClick={this.handleRetry} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
