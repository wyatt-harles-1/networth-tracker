/**
 * ============================================================================
 * Application Routes Configuration
 * ============================================================================
 *
 * Defines all application routes using React Router v6.
 *
 * Route Structure:
 * - /auth - Authentication page (login/signup)
 * - /onboarding - First-time user setup wizard
 * - / - Main application (protected routes)
 *   ├─ /dashboard - Home dashboard with portfolio overview
 *   ├─ /portfolio - Detailed portfolio view with holdings
 *   ├─ /assets - Asset management and allocation
 *   ├─ /accounts - Individual account management
 *   ├─ /insights - Advanced analytics and insights
 *   ├─ /transactions - Transaction history and management
 *   ├─ /import - Statement import functionality
 *   └─ /settings - User settings and preferences
 *
 * Error Handling:
 * - All routes wrapped with ErrorBoundary for graceful error handling
 *
 * ============================================================================
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthPage } from '@/components/auth/AuthPage';
import { Dashboard } from '@/components/Dashboard';
import { PortfolioReal as Portfolio } from '@/components/Portfolio';
import { Assets } from '@/components/Assets';
import { Accounts } from '@/components/Accounts';
import { InsightsNew as Insights } from '@/components/Insights';
import { Transactions } from '@/components/Transactions';
import { SmartStatementImporter } from '@/components/SmartStatementImporter';
import { Settings } from '@/components/Settings';
import { DataVisualizer } from '@/components/DataVisualizer';
import { Onboarding } from '@/components/Onboarding';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Application router configuration
 *
 * Creates a browser router with:
 * - Public routes (auth, onboarding)
 * - Protected routes (dashboard, portfolio, etc.)
 * - Automatic redirect from root to dashboard
 * - Error boundary for graceful error handling
 */
export const router = createBrowserRouter([
  // ===== PUBLIC ROUTES =====
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/onboarding',
    element: <Onboarding onComplete={() => {}} />,
  },

  // ===== PROTECTED ROUTES (Main Application) =====
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorBoundary><div>Something went wrong</div></ErrorBoundary>,
    children: [
      // Root redirect to dashboard
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },

      // Dashboard - Home page with overview
      {
        path: 'dashboard',
        element: <Dashboard />,
      },

      // Portfolio - Holdings and performance
      {
        path: 'portfolio',
        element: <Portfolio />,
      },

      // Assets - Asset allocation and management
      {
        path: 'assets',
        element: <Assets />,
      },

      // Accounts - Individual account details
      {
        path: 'accounts',
        element: <Accounts />,
      },

      // Insights - Advanced analytics
      {
        path: 'insights',
        element: <Insights />,
      },

      // Transactions - Transaction history
      {
        path: 'transactions',
        element: <Transactions />,
      },

      // Import - Statement import tool
      {
        path: 'import',
        element: <SmartStatementImporter />,
      },

      // Settings - User preferences
      {
        path: 'settings',
        element: <Settings />,
      },

      // Data Visualizer - Historical price data coverage tool (debug/admin)
      {
        path: 'data-visualizer',
        element: <DataVisualizer />,
      },
    ],
  },
]);
