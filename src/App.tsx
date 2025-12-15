/**
 * ============================================================================
 * App Component - Application Root
 * ============================================================================
 *
 * The main entry point component for the Networth Tracker application.
 * Sets up the core application structure with routing and authentication.
 *
 * Architecture:
 * - Wraps the entire app with AuthProvider for authentication state management
 * - Uses React Router for client-side navigation
 * - All routes are defined in ./routes/index.tsx
 *
 * Component Hierarchy:
 * App
 *  └─ AuthProvider (provides authentication context to entire app)
 *      └─ RouterProvider (handles all routing logic)
 *          └─ Route components (Dashboard, Portfolio, Accounts, etc.)
 *
 * ============================================================================
 */

import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a query client instance with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Cache kept for 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Retry failed requests once
    },
  },
});

/**
 * Main App component
 *
 * Bootstraps the application with:
 * - React Query for data caching and state management
 * - Authentication context
 * - Client-side routing
 *
 * @returns The root application component
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
