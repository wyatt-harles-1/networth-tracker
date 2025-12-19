import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  LogOut,
  Link,
  Settings,
  ChevronRight,
  Briefcase,
  Upload,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [enableDataVisualizer, setEnableDataVisualizer] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check localStorage when menu opens
  useEffect(() => {
    if (isOpen) {
      const enabled = localStorage.getItem('enableDataVisualizer') === 'true';
      setEnableDataVisualizer(enabled);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      console.log('🍔 HAMBURGER MENU DEBUG:');
      console.log('Menu is OPEN');

      // Check menu element
      if (menuRef.current) {
        const menuStyles = window.getComputedStyle(menuRef.current);
        console.log('Menu Panel:');
        console.log('  - z-index:', menuStyles.zIndex);
        console.log('  - position:', menuStyles.position);
        console.log('  - background:', menuStyles.backgroundColor);
        console.log('  - transform:', menuStyles.transform);
        console.log('  - opacity:', menuStyles.opacity);

        // Check parent elements
        let parent = menuRef.current.parentElement;
        let level = 1;
        while (parent && level <= 5) {
          const parentStyles = window.getComputedStyle(parent);
          console.log(`Parent Level ${level}:`, parent.tagName);
          console.log('  - z-index:', parentStyles.zIndex);
          console.log('  - position:', parentStyles.position);
          console.log('  - overflow:', parentStyles.overflow);
          console.log('  - transform:', parentStyles.transform);
          parent = parent.parentElement;
          level++;
        }
      }

      // Check overlay element
      if (overlayRef.current) {
        const overlayStyles = window.getComputedStyle(overlayRef.current);
        console.log('Overlay:');
        console.log('  - z-index:', overlayStyles.zIndex);
        console.log('  - background:', overlayStyles.backgroundColor);
        console.log('  - opacity:', overlayStyles.opacity);
      }
    } else {
      console.log('🍔 Menu is CLOSED');
    }
  }, [isOpen]);

  const baseMenuItems = [
    {
      id: 'assets',
      label: 'Assets',
      icon: Briefcase,
      description: 'View and manage your assets',
    },
    {
      id: 'import',
      label: 'Import Statements',
      icon: Upload,
      description: 'Upload and parse brokerage statements',
    },
    {
      id: 'connections',
      label: 'Connections',
      icon: Link,
      description: 'Manage your connected accounts',
    },
    {
      id: 'profile',
      label: 'Manage Profile',
      icon: User,
      description: 'View and edit your profile',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'App preferences and configuration',
    },
  ];

  // Conditionally add Data Visualizer menu item
  const menuItems = [
    ...baseMenuItems,
    ...(enableDataVisualizer
      ? [
          {
            id: 'data-visualizer',
            label: 'Data Visualizer',
            icon: Activity,
            description: 'View historical price data coverage',
          },
        ]
      : []),
    {
      id: 'logout',
      label: 'Logout',
      icon: LogOut,
      description: 'Sign out of your account',
    },
  ];

  const handleItemClick = async (itemId: string) => {
    setIsOpen(false);

    switch (itemId) {
      case 'assets':
        navigate('/assets');
        break;
      case 'import':
        navigate('/import');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'data-visualizer':
        navigate('/data-visualizer');
        break;
      case 'logout':
        await signOut();
        navigate('/auth');
        break;
      default:
        console.log(`Navigation not implemented for: ${itemId}`);
    }
  };

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="rounded-full w-10 h-10 p-0 relative z-10"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </Button>

      {/* Portal: Render overlay and menu at document root to escape header stacking context */}
      {createPortal(
        <>
          {/* Overlay */}
          {isOpen && (
            <div
              ref={overlayRef}
              className="fixed inset-0 bg-black/50 transition-opacity"
              style={{ zIndex: 9998 }}
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Slide-out Menu */}
          <div
            ref={menuRef}
            className={cn(
              'fixed top-0 left-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out',
              isOpen ? 'translate-x-0' : '-translate-x-full'
            )}
            style={{ zIndex: 9999, backgroundColor: '#ffffff' }}
          >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="rounded-full w-8 h-8 p-0"
          >
            <X className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* User Info Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">John Doe</p>
              <p className="text-sm text-gray-500">john.doe@example.com</p>
              <p className="text-xs text-blue-600 font-medium">
                Premium Member
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          {menuItems.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Icon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Wealth Tracker v1.0.0
          </p>
        </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
