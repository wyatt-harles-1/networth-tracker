import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HamburgerMenu } from './HamburgerMenu';
import { usePageTitle } from '@/contexts/PageTitleContext';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/assets': 'Assets',
  '/accounts': 'Accounts',
  '/insights': 'Insights',
  '/transactions': 'Transactions',
  '/import': 'Import Statements',
};

export function MobileTopBar() {
  const location = useLocation();
  const { pageTitle } = usePageTitle();

  // Use dynamic page title if set, otherwise fall back to route-based title
  const title = pageTitle || pageTitles[location.pathname] || 'NetWorth Tracker';

  return (
    <header className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      <div className="flex justify-center px-4 safe-area-pt">
        <div className="bg-slate-100/95 backdrop-blur-xl border border-slate-300/60 rounded-full shadow-[0_8px_32px_rgba(71,85,105,0.15)] pointer-events-auto w-full max-w-screen-lg">
          <div className="flex items-center justify-between px-1 py-2 gap-0.5">
            {/* Left: Hamburger Menu */}
            <div className="flex items-center justify-center gap-3 h-full">
              <HamburgerMenu />
            </div>

            {/* Center: Page Title */}
            <div className="flex-1 text-center">
              <p className="text-lg font-semibold text-gray-900">{title}</p>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3 h-full">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-10 h-10 p-0"
              >
                <Bell className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
