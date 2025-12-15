/**
 * ============================================================================
 * AccountSettingsModal Component
 * ============================================================================
 *
 * Modal for editing account settings and information.
 *
 * Features:
 * - Edit account name, institution, and account number
 * - Change account icon
 * - Update account category
 * - Toggle visibility
 * - Add/edit notes
 * - Delete account with confirmation
 * - Unsaved changes warning
 * - Form validation
 *
 * Settings Sections:
 * 1. Basic Info: Name, institution, account number
 * 2. Display: Icon, category, visibility
 * 3. Notes: Description/memo field
 * 4. Danger Zone: Delete account
 *
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import {
  Save,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  Wallet,
  TrendingUp,
  Home,
  Car,
  CreditCard,
  Building,
  DollarSign,
  Coins,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAssetClasses } from '@/hooks/useAssetClasses';

const iconMap = {
  Wallet,
  TrendingUp,
  Home,
  Car,
  CreditCard,
  Building,
  DollarSign,
  Coins,
};

const assetCategories = [
  'Cash & Bank Accounts',
  'Investment Accounts',
  'Retirement Accounts',
  'Real Estate',
  'Vehicles',
  'Other Assets',
];

const liabilityCategories = [
  'Credit Cards',
  'Real Estate Loans',
  'Vehicle Loans',
  'Student Loans',
  'Personal Loans',
  'Other Liabilities',
];

interface Account {
  id: string;
  name: string;
  account_type: 'asset' | 'liability';
  category: string;
  current_balance: number;
  icon: string;
  is_visible: boolean;
  asset_class_id?: string | null;
  tax_type?: 'taxable' | 'tax_deferred' | 'tax_free' | null;
  institution?: string | null;
  account_number_last4?: string | null;
  notes?: string | null;
  interest_rate?: number | null;
  credit_limit?: number | null;
}

interface AccountSettingsModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountId: string, updates: Partial<Account>) => Promise<void>;
  onDelete: (accountId: string) => void;
}

export function AccountSettingsModal({
  account,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: AccountSettingsModalProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<Account>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load asset classes
  const { assetClasses } = useAssetClasses();

  // Initialize form data when account changes
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        institution: account.institution || '',
        account_number_last4: account.account_number_last4 || '',
        category: account.category,
        icon: account.icon,
        is_visible: account.is_visible,
        asset_class_id: account.asset_class_id || null,
        tax_type: account.tax_type || null,
        notes: account.notes || '',
        interest_rate: account.interest_rate || null,
        credit_limit: account.credit_limit || null,
      });
      setHasChanges(false);
      setShowDeleteConfirm(false);
    }
  }, [account]);

  if (!account) return null;

  const isAsset = account.account_type === 'asset';
  const categories = isAsset ? assetCategories : liabilityCategories;

  /**
   * Update form field and mark as changed
   */
  const updateField = <K extends keyof Account>(
    field: K,
    value: Account[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  /**
   * Save changes to account
   */
  const handleSave = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      // Filter out only valid account fields
      const validUpdates: Partial<Account> = {
        name: formData.name,
        category: formData.category,
        icon: formData.icon,
        is_visible: formData.is_visible,
        asset_class_id: formData.asset_class_id,
        tax_type: formData.tax_type,
        institution: formData.institution || null,
        account_number_last4: formData.account_number_last4 || null,
        notes: formData.notes || null,
      };

      console.log('Saving account updates:', validUpdates);
      await onSave(account.id, validUpdates);
      console.log('Save successful');
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save changes: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle close with unsaved changes check
   */
  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  /**
   * Handle delete with confirmation
   */
  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(account.id);
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Account Settings
          </DialogTitle>
          <DialogDescription>
            Edit account information and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Information Section */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="e.g., Webull Brokerage"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={formData.institution || ''}
                  onChange={e => updateField('institution', e.target.value)}
                  placeholder="e.g., Webull"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="account_number">
                  Account Number (Last 4 Digits)
                </Label>
                <Input
                  id="account_number"
                  value={formData.account_number_last4 || ''}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    updateField('account_number_last4', value);
                  }}
                  placeholder="1234"
                  maxLength={4}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Display Settings Section */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Display Settings
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => updateField('category', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAsset && (
                <div>
                  <Label htmlFor="asset_class">Asset Class</Label>
                  <Select
                    value={formData.asset_class_id || 'none'}
                    onValueChange={value =>
                      updateField(
                        'asset_class_id',
                        value === 'none' ? null : value
                      )
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select asset class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">None</span>
                          <span className="text-xs text-gray-500">
                            Uncategorized
                          </span>
                        </div>
                      </SelectItem>
                      {assetClasses.map(assetClass => (
                        <SelectItem key={assetClass.id} value={assetClass.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: assetClass.color }}
                            />
                            <span className="font-medium">{assetClass.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-2">
                    Used for asset class allocation analysis
                  </p>
                </div>
              )}

              <div>
                <Label className="mb-2 block">Account Icon</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(iconMap).map(([key, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateField('icon', key)}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-all hover:scale-105',
                        formData.icon === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-6 w-6 mx-auto',
                          formData.icon === key
                            ? 'text-blue-600'
                            : 'text-gray-600'
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Visibility</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.is_visible
                      ? 'Account is included in totals'
                      : 'Account is hidden from totals'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.is_visible ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    updateField('is_visible', !formData.is_visible)
                  }
                >
                  {formData.is_visible ? (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Hidden
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Label htmlFor="tax_type">Tax Treatment</Label>
                <Select
                  value={formData.tax_type || 'none'}
                  onValueChange={value =>
                    updateField(
                      'tax_type',
                      value === 'none'
                        ? null
                        : (value as 'taxable' | 'tax_deferred' | 'tax_free')
                    )
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select tax treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">None</span>
                        <span className="text-xs text-gray-500">
                          Not applicable
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="taxable">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Taxable</span>
                        <span className="text-xs text-gray-500">
                          Regular brokerage accounts
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tax_deferred">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Tax-Deferred</span>
                        <span className="text-xs text-gray-500">
                          401(k), Traditional IRA
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tax_free">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Tax-Free</span>
                        <span className="text-xs text-gray-500">
                          Roth IRA, Roth 401(k), HSA
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Used for tax insights and portfolio allocation analysis
                </p>
              </div>
            </div>
          </Card>

          {/* Additional Details Section */}
          {(isAsset && formData.category === 'Investment Accounts') ||
          (!isAsset && formData.category === 'Credit Cards') ? (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Additional Details
              </h3>
              <div className="space-y-4">
                {!isAsset && formData.category === 'Credit Cards' && (
                  <>
                    <div>
                      <Label htmlFor="credit_limit">Credit Limit</Label>
                      <Input
                        id="credit_limit"
                        type="number"
                        value={formData.credit_limit || ''}
                        onChange={e =>
                          updateField(
                            'credit_limit',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                      <Input
                        id="interest_rate"
                        type="number"
                        step="0.01"
                        value={formData.interest_rate || ''}
                        onChange={e =>
                          updateField(
                            'interest_rate',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>
          ) : null}

          {/* Notes Section */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Notes</h3>
            <Textarea
              value={formData.notes || ''}
              onChange={e => updateField('notes', e.target.value)}
              placeholder="Add notes or description for this account..."
              className="min-h-[100px]"
            />
          </Card>

          {/* Danger Zone */}
          <Card className="p-4 border-red-200 bg-red-50">
            <h3 className="text-sm font-semibold text-red-900 mb-2">
              Danger Zone
            </h3>
            <p className="text-xs text-red-700 mb-3">
              Deleting this account will remove all associated transactions and
              holdings. This action cannot be undone.
            </p>
            {showDeleteConfirm ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-900 font-medium">
                    Are you sure? Click Delete again to confirm.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Confirm Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-100 border-red-300"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Account
              </Button>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
