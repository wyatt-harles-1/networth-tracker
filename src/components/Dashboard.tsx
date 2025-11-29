/**
 * ============================================================================
 * Dashboard Component
 * ============================================================================
 *
 * Main dashboard page displaying portfolio overview and key metrics.
 *
 * Features:
 * - Pull-to-refresh functionality for mobile devices
 * - Net worth summary card
 * - Recent portfolio activity
 * - Top gainers and losers
 * - Upcoming dividends
 * - Account reconciliation suggestions
 *
 * Dashboard Cards:
 * - NetWorthCard: Current total net worth and change
 * - RecentActivityCard: Recent transactions and trades
 * - TopGainersLosersCard: Best and worst performing holdings
 * - UpcomingDividendsCard: Expected dividend payments
 * - ReconciliationSuggestionsCard: Account balance discrepancies
 *
 * Mobile Experience:
 * - Pull down from top to refresh all data
 * - Smooth animations and transitions
 * - Responsive layout for all screen sizes
 *
 * ============================================================================
 */

import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { NetWorthCard } from './dashboard/NetWorthCard';
import { RecentActivityCardNew as RecentActivityCard } from './dashboard/RecentActivityCard';
import { TopGainersLosersCardNew as TopGainersLosersCard } from './dashboard/TopGainersLosersCard';
import { UpcomingDividendsCard } from './dashboard/UpcomingDividendsCard';
import { ReconciliationSuggestionsCard } from './dashboard/ReconciliationSuggestionsCard';

/**
 * Dashboard page component
 */
export function Dashboard() {
  const navigate = useNavigate();

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-render on refresh
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Track the starting Y position when user touches the screen
   * Only activates when scrolled to the top
   */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Only track if we're at the top of the page
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container || startY.current === 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    // Only allow pull down when at top
    if (container.scrollTop === 0 && distance > 0) {
      setPullDistance(Math.min(distance, 150)); // Max 150px pull
      if (distance > 10) {
        e.preventDefault(); // Prevent default scrolling when pulling
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 80 && !isRefreshing) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(80); // Lock at refresh position

      // Simulate refresh
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
        setPullDistance(0);
        setIsRefreshing(false);
        startY.current = 0;
      }, 1000);
    } else {
      // Reset if not pulled enough
      setPullDistance(0);
      startY.current = 0;
    }
  }, [pullDistance, isRefreshing]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto">
      {/* Pull to refresh indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200 ease-out overflow-hidden"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <div className="flex flex-col items-center gap-2 py-4">
          <RefreshCw
            className={`h-6 w-6 text-blue-600 transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${pullDistance * 2}deg)`,
            }}
          />
          <p className="text-xs text-gray-600">
            {isRefreshing
              ? 'Refreshing...'
              : pullDistance > 80
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </p>
        </div>
      </div>

      <div className="p-4 pb-20">
        <div
          className="space-y-4 outline-none transition-all duration-700 ease-in-out"
          key={refreshKey}
        >
          <ReconciliationSuggestionsCard />
          <NetWorthCard onNavigateToPortfolio={() => navigate('/portfolio')} />
          <RecentActivityCard />
          <TopGainersLosersCard />
          <UpcomingDividendsCard />
        </div>
      </div>
    </div>
  );
}
