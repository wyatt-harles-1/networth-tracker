import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HamburgerMenu } from './HamburgerMenu';

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
  const title = pageTitles[location.pathname] || 'NetWorth Tracker';
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 safe-area-pt">
        {/* Left: Hamburger Menu */}
        <div className="flex items-center justify-center gap-4 h-full">
          <HamburgerMenu />
        </div>

        {/* Center: Page Title */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
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
    </header>
  );
}
