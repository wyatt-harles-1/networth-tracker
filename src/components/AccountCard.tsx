/**
 * ============================================================================
 * AccountCard Component
 * ============================================================================
 *
 * Displays a single account card with balance and action buttons.
 *
 * Features:
 * - Account icon and name display
 * - Current balance with currency formatting
 * - Category label
 * - Toggle visibility button (hide/show from totals)
 * - Delete button
 * - Click to view account details
 * - Color-coded by type (green for assets, red for liabilities)
 * - Hover effects
 *
 * Visual Design:
 * - Assets: Green icon background and balance color
 * - Liabilities: Red icon background and balance color
 * - Card hover shadow effect
 * - Action buttons appear on hover
 *
 * Props:
 * - account: Account data
 * - accountType: 'asset' or 'liability'
 * - IconComponent: Lucide icon component to display
 * - onClick: Handler for card click
 * - onToggleVisibility: Handler for visibility toggle
 * - onDelete: Handler for delete button
 *
 * ============================================================================
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Trash2, LucideIcon } from 'lucide-react';

/**
 * Account data structure
 */
interface Account {
  id: string;
  name: string;
  category: string;
  current_balance: number;
  is_visible: boolean;
  icon: string;
}

interface AccountCardProps {
  account: Account;
  accountType: 'asset' | 'liability';
  IconComponent: LucideIcon;
  onClick: () => void;
  onToggleVisibility: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

/**
 * Account card component
 */
export function AccountCard({
  account,
  accountType,
  IconComponent,
  onClick,
  onToggleVisibility,
  onDelete,
}: AccountCardProps) {
  const isAsset = accountType === 'asset';
  const colorClasses = {
    iconBg: isAsset ? 'bg-green-100' : 'bg-red-100',
    iconColor: isAsset ? 'text-green-600' : 'text-red-600',
    balanceColor: isAsset ? 'text-green-600' : 'text-red-600',
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    return `${amount < 0 ? '-' : ''}$${absAmount.toLocaleString()}`;
  };

  return (
    <Card
      className="p-4 bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${colorClasses.iconBg} rounded-lg`}>
            <IconComponent className={`h-4 w-4 ${colorClasses.iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{account.name}</p>
            <p className="text-xs text-gray-500">{account.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className={`text-sm font-semibold ${colorClasses.balanceColor}`}>
            {formatCurrency(account.current_balance)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisibility}
              className="p-1.5 h-auto"
            >
              {account.is_visible ? (
                <Eye className="h-4 w-4 text-gray-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="p-1.5 h-auto"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
