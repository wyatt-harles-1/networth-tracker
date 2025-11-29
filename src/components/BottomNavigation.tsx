import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Wallet, Receipt, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  { id: 'portfolio', label: 'Portfolio', icon: TrendingUp, path: '/portfolio' },
  { id: 'insights', label: 'Insights', icon: BarChart3, path: '/insights' },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: Receipt,
    path: '/transactions',
  },
  { id: 'accounts', label: 'Accounts', icon: Wallet, path: '/accounts' },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex items-center justify-around py-2 px-4 safe-area-pb">
        {navigationItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-w-0',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500'
              )}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
