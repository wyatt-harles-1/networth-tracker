/**
 * Skeleton Loading Components
 *
 * Reusable skeleton loaders for different UI elements throughout the app.
 * Provides a consistent, modern loading experience.
 */

import { Skeleton } from './skeleton';

/**
 * Skeleton for holding cards in the portfolio
 */
export function SkeletonHoldingCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-1 text-right">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the portfolio performance chart
 */
export function SkeletonChart() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Time range buttons */}
      <div className="flex gap-2 px-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>

      {/* Chart area */}
      <div className="px-4">
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>

      {/* Bottom stats */}
      <div className="flex items-center justify-between px-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for metric cards (Total Value, Day's Change, etc.)
 */
export function SkeletonMetricCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a list of holdings
 */
export function SkeletonHoldingsList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonHoldingCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for account cards
 */
export function SkeletonAccountCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <div className="pt-2 border-t space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  );
}

/**
 * Skeleton for transaction items
 */
export function SkeletonTransactionItem() {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Skeleton for transaction list
 */
export function SkeletonTransactionsList({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTransactionItem key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for the full portfolio page
 */
export function SkeletonPortfolioPage() {
  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Chart section */}
      <SkeletonChart />

      {/* Holdings header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Holdings list */}
      <SkeletonHoldingsList count={5} />
    </div>
  );
}

/**
 * Skeleton for modal/dialog content
 */
export function SkeletonModal() {
  return (
    <div className="space-y-4 p-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="flex gap-2 justify-end">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton for dashboard metrics grid
 */
export function SkeletonMetricsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>
  );
}
