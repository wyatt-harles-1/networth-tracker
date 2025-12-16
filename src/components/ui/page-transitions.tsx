/**
 * Page Transition Components
 *
 * Reusable components for consistent page loading animations across the app.
 * Implements the 5-phase loading sequence from the Insights page.
 */

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Phase 1: Loading State
// ============================================================================

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div className="p-4 pb-20 flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
}

// ============================================================================
// Phase 2: Empty State
// ============================================================================

interface PageEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageEmptyState({ icon, title, description, action }: PageEmptyStateProps) {
  return (
    <div className="p-4 pb-20">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {description}
        </p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// Phase 3: Page Container with Fade Transition
// ============================================================================

interface PageContainerProps {
  children: ReactNode;
  isTransitioning?: boolean;
  className?: string;
}

export function PageContainer({ children, isTransitioning = false, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "p-4 pb-20 transition-opacity duration-200",
        isTransitioning ? "opacity-0" : "opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Phase 3: Page Header (Static at top)
// ============================================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backButton?: ReactNode;
  animated?: boolean;
}

export function PageHeader({ title, subtitle, action, backButton, animated = false }: PageHeaderProps) {
  return (
    <div className={cn(
      "mb-6",
      animated && "animate-in fade-in slide-in-from-top-4 duration-300"
    )}>
      {backButton && <div className="mb-3">{backButton}</div>}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// Phase 3: Grid Card with Cascading Animation
// ============================================================================

interface GridCardProps {
  children: ReactNode;
  onClick?: () => void;
  index?: number;
  className?: string;
  hover?: boolean;
}

export function GridCard({ children, onClick, index = 0, className, hover = true }: GridCardProps) {
  return (
    <div
      className={cn(
        "p-5 bg-white border border-gray-200 rounded-lg",
        "animate-in fade-in slide-in-from-bottom-4",
        "transition-all duration-300 ease-out",
        onClick && "cursor-pointer group relative overflow-hidden",
        hover && onClick && [
          "hover:border-blue-300 hover:shadow-lg hover:scale-[1.02]"
        ],
        className
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animationDuration: '500ms',
        animationFillMode: 'both'
      }}
      onClick={onClick}
    >
      {/* Shimmer effect on hover */}
      {onClick && hover && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      )}

      {children}
    </div>
  );
}

// ============================================================================
// Phase 3: Grid Container
// ============================================================================

interface GridContainerProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function GridContainer({ children, columns = 2, className }: GridContainerProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-4", colClasses[columns], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Phase 5: Content Section with Delayed Animation
// ============================================================================

interface ContentSectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function ContentSection({ children, delay = 100, className }: ContentSectionProps) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4",
        className
      )}
      style={{
        animationDuration: '400ms',
        animationDelay: `${delay}ms`,
        animationFillMode: 'both'
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Utility: Back Button with Animation
// ============================================================================

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  icon?: ReactNode;
}

export function BackButton({ onClick, label = 'Back', icon }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-all hover:gap-3 duration-200"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// Animation Keyframes (include in your global CSS or tailwind.config)
// ============================================================================

export const pageAnimationStyles = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-in-from-bottom-4 {
    from { transform: translateY(1rem); }
    to { transform: translateY(0); }
  }

  @keyframes slide-in-from-top-4 {
    from { transform: translateY(-1rem); }
    to { transform: translateY(0); }
  }

  .animate-in {
    animation-fill-mode: both;
  }
`;
