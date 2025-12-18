/**
 * ============================================================================
 * AppLayout Component - Main Application Shell
 * ============================================================================
 *
 * Root layout component for all authenticated pages.
 * Provides consistent navigation and structure across the application.
 *
 * Features:
 * - Auth protection: Redirects to /auth if not logged in
 * - Mobile-optimized layout with fixed top and bottom navigation
 * - Automatic onboarding for new users (first-time only)
 * - Loading states during authentication check
 *
 * Layout Structure:
 * ┌─────────────────────────────────────┐
 * │ MobileTopBar (fixed top)            │
 * ├─────────────────────────────────────┤
 * │                                     │
 * │ <Outlet /> (routed content)         │
 * │ - Dashboard                         │
 * │ - Portfolio                         │
 * │ - Accounts                          │
 * │ - etc.                              │
 * │                                     │
 * ├─────────────────────────────────────┤
 * │ BottomNavigation (fixed bottom)     │
 * └─────────────────────────────────────┘
 *
 * Onboarding Logic:
 * - Automatically shown to new users with zero accounts
 * - Dismissed permanently after completion via localStorage
 * - Can be re-triggered by clearing 'hasSeenOnboarding' flag
 *
 * ============================================================================
 */

import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageTitleProvider } from '@/contexts/PageTitleContext';
import { useAccounts } from '@/hooks/useAccounts';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MobileTopBar } from '@/components/MobileTopBar';
import { Onboarding } from '@/components/Onboarding';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * AppLayout Component
 *
 * Main shell for authenticated application pages.
 * Handles auth protection, loading states, and onboarding flow.
 *
 * @returns Protected layout with navigation or redirect to auth
 */
export function AppLayout() {
  // ===== HOOKS =====
  const { user, loading } = useAuth();
  const { accounts, loading: accountsLoading } = useAccounts();

  // ===== STATE =====
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ===== ONBOARDING DETECTION =====
  /**
   * Check if user should see onboarding
   *
   * Criteria:
   * - User is authenticated
   * - Has zero accounts
   * - Hasn't seen onboarding before (localStorage flag)
   *
   * This helps new users get started with their first account setup.
   */
  useEffect(() => {
    if (user && !accountsLoading && accounts.length === 0) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user, accounts, accountsLoading]);

  // ===== LOADING STATE =====
  /**
   * Show loading spinner while checking authentication status
   * Prevents flash of login screen before auth state is confirmed
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ===== AUTH PROTECTION =====
  /**
   * Redirect to auth page if user is not logged in
   * This protects all child routes from unauthorized access
   */
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // ===== MAIN LAYOUT =====
  return (
    <PageTitleProvider>
      <div className="min-h-screen bg-gray-50 transition-colors overflow-x-hidden">
        {/* Top navigation bar - Fixed position */}
        <MobileTopBar />

        {/* Main content area - Router outlet renders child routes */}
        <main className="pt-16 min-h-[calc(100vh-8rem)]">
          <Outlet />
        </main>

        {/* Bottom navigation bar - Fixed position */}
        <BottomNavigation />

        {/* Onboarding modal - Shown once for new users */}
        {showOnboarding && (
          <Onboarding
            onComplete={() => {
              setShowOnboarding(false);
              localStorage.setItem('hasSeenOnboarding', 'true');
            }}
          />
        )}
      </div>
    </PageTitleProvider>
  );
}
