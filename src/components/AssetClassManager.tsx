import { useState } from 'react';
import { useAssetClasses } from '@/hooks/useAssetClasses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Palette,
} from 'lucide-react';

const defaultColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f97316', // orange-600
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

export function AssetClassManager() {
  const {
    assetClasses,
    loading,
    error,
    addAssetClass,
    updateAssetClass,
    deleteAssetClass,
  } = useAssetClasses();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(defaultColors[0]);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    const { error } = await addAssetClass({
      name: newName.trim(),
      color: newColor,
      is_visible: true,
      display_order: 0,
    });

    if (error) {
      setSubmitError(error);
      setSubmitting(false);
    } else {
      setNewName('');
      setNewColor(defaultColors[0]);
      setIsAdding(false);
      setSubmitting(false);
    }
  };

  const handleStartEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
    setSubmitError(null);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingId) return;

    setSubmitting(true);
    setSubmitError(null);

    const { error } = await updateAssetClass(editingId, {
      name: editName.trim(),
      color: editColor,
    });

    if (error) {
      setSubmitError(error);
      setSubmitting(false);
    } else {
      setEditingId(null);
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setSubmitError(null);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this asset class? Accounts using this class will be unassigned.'
      )
    ) {
      return;
    }

    await deleteAssetClass(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Asset Classes
          </h3>
          <p className="text-sm text-gray-600">
            Organize your accounts into categories
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        )}
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">
            {submitError}
          </p>
        </div>
      )}

      {isAdding && (
        <Card className="p-4 bg-gray-50 border-0">
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-class-name">Asset Class Name</Label>
              <Input
                id="new-class-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., Stocks, Real Estate, Crypto"
                disabled={submitting}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {defaultColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    disabled={submitting}
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: newColor === color ? '#000' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                size="sm"
                disabled={submitting || !newName.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewName('');
                  setSubmitError(null);
                }}
                size="sm"
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {assetClasses.length === 0 ? (
        <Card className="p-8 text-center bg-white border-0">
          <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Asset Classes Yet
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Create asset classes to organize your accounts
          </p>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Asset Class
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {assetClasses.map(assetClass => (
            <Card
              key={assetClass.id}
              className="p-4 bg-white border-0"
            >
              {editingId === assetClass.id ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`edit-name-${assetClass.id}`}>Name</Label>
                    <Input
                      id={`edit-name-${assetClass.id}`}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      disabled={submitting}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-2">
                      {defaultColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          disabled={submitting}
                          className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                          style={{
                            backgroundColor: color,
                            borderColor:
                              editColor === color ? '#000' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveEdit}
                      size="sm"
                      disabled={submitting}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      size="sm"
                      disabled={submitting}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: assetClass.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {assetClass.name}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleStartEdit(
                          assetClass.id,
                          assetClass.name,
                          assetClass.color
                        )
                      }
                      className="p-1.5 h-auto"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(assetClass.id)}
                      className="p-1.5 h-auto"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
