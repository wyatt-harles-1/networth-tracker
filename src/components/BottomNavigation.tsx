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
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="flex justify-center pb-6 px-6 safe-area-pb">
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-full shadow-lg pointer-events-auto max-w-md">
          <div className="flex items-center justify-around px-1 py-2 gap-0.5">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    'flex flex-col items-center justify-center py-1 px-4 rounded-full transition-all duration-200 min-w-0',
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} />
                  <span className={cn(
                    "text-[9px] font-medium truncate mt-0.5",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
