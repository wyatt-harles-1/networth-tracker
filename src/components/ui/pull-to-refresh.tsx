/**
 * Pull-to-Refresh Component
 *
 * Provides pull-down gesture to refresh content on mobile and desktop
 */

import { ReactNode, useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80; // Distance needed to trigger refresh
  const MAX_PULL = 120; // Maximum pull distance

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    // Only allow pull-to-refresh if at the top of the page
    const isAtTop = window.scrollY === 0;
    if (isAtTop) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || isRefreshing || startY === 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    // Only pull down (positive distance) and only at top of page
    if (distance > 0 && window.scrollY === 0) {
      // Apply resistance: the further you pull, the harder it gets
      const resistance = 2.5;
      const adjustedDistance = Math.min(distance / resistance, MAX_PULL);
      setPullDistance(adjustedDistance);

      // Prevent default scroll behavior when pulling
      if (adjustedDistance > 0) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= PULL_THRESHOLD) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD); // Lock at threshold during refresh

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setStartY(0);
      }
    } else {
      // Reset if didn't pull far enough
      setPullDistance(0);
      setStartY(0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, pullDistance, isRefreshing, disabled]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const shouldShowRefreshing = isRefreshing || pullDistance >= PULL_THRESHOLD;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200"
        style={{
          top: pullDistance > 0 ? `${pullDistance - 50}px` : '-50px',
          opacity: pullProgress,
          transform: `scale(${0.5 + pullProgress * 0.5})`,
        }}
      >
        <div className="bg-white rounded-full p-3 shadow-lg border border-gray-200">
          <Loader2
            className={`h-6 w-6 text-blue-600 ${shouldShowRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: !shouldShowRefreshing ? `rotate(${pullProgress * 360}deg)` : undefined,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
