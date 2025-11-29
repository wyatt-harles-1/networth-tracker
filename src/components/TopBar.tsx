import { Moon, Sun, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  title: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function TopBar({ title, isDark, onToggleTheme }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 transition-all duration-300 w-full">
      <div className="flex items-center justify-between h-full px-6 w-full">
        {/* Left: Page Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          {title}
        </h1>

        {/* Right: Controls */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            className="rounded-lg"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-gray-600" />
            ) : (
              <Moon className="h-4 w-4 text-gray-600" />
            )}
          </Button>

          {/* User Avatar */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">
                John Doe
              </p>
              <p className="text-xs text-gray-500">
                Premium
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
