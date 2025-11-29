import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X } from 'lucide-react';
import { usePriceUpdates } from '@/hooks/usePriceUpdates';
import { toast } from 'sonner';

interface ManualPriceEntryProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ManualPriceEntry({
  onSuccess,
  onCancel,
}: ManualPriceEntryProps) {
  const [symbol, setSymbol] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { addManualPrice } = usePriceUpdates();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol.trim() || !date || !price || parseFloat(price) <= 0) {
      toast.error('Please fill in all fields with valid values');
      return;
    }

    setSubmitting(true);

    try {
      const result = await addManualPrice(
        symbol.trim().toUpperCase(),
        date,
        parseFloat(price)
      );

      if (result.success) {
        toast.success(`Price updated for ${symbol.toUpperCase()}`);
        setSymbol('');
        setDate(new Date().toISOString().split('T')[0]);
        setPrice('');

        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.error || 'Failed to add price');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 bg-gray-50 border-0">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Manual Price Entry
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Use this form to manually enter prices for private securities, mutual
          funds, or any holdings that don't have live price data available.
        </p>

        <div>
          <Label htmlFor="symbol">Ticker Symbol *</Label>
          <Input
            id="symbol"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g., AGTHX, NWM"
            disabled={submitting}
            required
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the ticker or symbol for this security
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={submitting}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="price">Price *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
              required
              className="mt-1"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> This price will be stored in your price
            history and will automatically update any holdings with the same
            symbol to use this price as the current value.
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Price
              </>
            )}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
