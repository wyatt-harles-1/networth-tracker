import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';

interface SmartAmountCalculatorProps {
  price: string;
  quantity: string;
  totalAmount: string;
  onPriceChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onTotalAmountChange: (value: string) => void;
  disabled?: boolean;
  lastChanged?: 'price' | 'quantity' | 'totalAmount';
  onLastChangedUpdate?: (field: 'price' | 'quantity' | 'totalAmount') => void;
}

export function SmartAmountCalculator({
  price,
  quantity,
  totalAmount,
  onPriceChange,
  onQuantityChange,
  onTotalAmountChange,
  disabled,
  lastChanged,
  onLastChangedUpdate,
}: SmartAmountCalculatorProps) {
  const isInitialMount = useRef(true);
  const previousValues = useRef({ price, quantity, totalAmount });

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousValues.current = { price, quantity, totalAmount };
      return;
    }

    // Detect which field changed
    const priceChanged = price !== previousValues.current.price;
    const quantityChanged = quantity !== previousValues.current.quantity;
    const totalChanged = totalAmount !== previousValues.current.totalAmount;

    previousValues.current = { price, quantity, totalAmount };

    // No changes, do nothing
    if (!priceChanged && !quantityChanged && !totalChanged) {
      return;
    }

    // Parse values
    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);
    const totalNum = parseFloat(totalAmount);

    const hasPrice = price !== '' && !isNaN(priceNum) && priceNum > 0;
    const hasQuantity =
      quantity !== '' && !isNaN(quantityNum) && quantityNum > 0;
    const hasTotal = totalAmount !== '' && !isNaN(totalNum) && totalNum > 0;

    // Count how many fields have values
    const filledCount = [hasPrice, hasQuantity, hasTotal].filter(
      Boolean
    ).length;

    // Only calculate if we have at least 2 fields filled
    if (filledCount >= 2) {
      // Determine which field to calculate based on what changed and what's filled

      // If Total or Quantity changed and both are filled, calculate Price
      if (
        (totalChanged || quantityChanged) &&
        hasTotal &&
        hasQuantity &&
        !priceChanged
      ) {
        const calculated = totalNum / quantityNum;
        onPriceChange(calculated.toFixed(4));
      }
      // If Price or Quantity changed and both are filled, calculate Total
      else if (
        (priceChanged || quantityChanged) &&
        hasPrice &&
        hasQuantity &&
        !totalChanged
      ) {
        const calculated = priceNum * quantityNum;
        onTotalAmountChange(calculated.toFixed(2));
      }
      // If Price or Total changed and both are filled, calculate Quantity
      else if (
        (priceChanged || totalChanged) &&
        hasPrice &&
        hasTotal &&
        !quantityChanged
      ) {
        const calculated = totalNum / priceNum;
        onQuantityChange(calculated.toString());
      }
    }
  }, [
    price,
    quantity,
    totalAmount,
    onPriceChange,
    onQuantityChange,
    onTotalAmountChange,
  ]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPriceChange(e.target.value);
    onLastChangedUpdate?.('price');
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onQuantityChange(e.target.value);
    onLastChangedUpdate?.('quantity');
  };

  const handleTotalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTotalAmountChange(e.target.value);
    onLastChangedUpdate?.('totalAmount');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
        <Calculator className="w-3.5 h-3.5" />
        <span>Enter any two values to calculate the third automatically</span>
      </div>

      <div className="relative">
        <div className="absolute -top-2 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
        <div className="absolute -bottom-2 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <div>
            <Label htmlFor="totalAmount" className="flex items-center gap-1">
              Total Amount
              {lastChanged !== 'totalAmount' && totalAmount && (
                <span className="text-xs text-blue-600">(calculated)</span>
              )}
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                $
              </span>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={handleTotalAmountChange}
                placeholder="0.00"
                disabled={disabled}
                className="pl-7 [&:autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:hover]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:focus]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)] "
              />
            </div>
          </div>

          <div>
            <Label htmlFor="quantity" className="flex items-center gap-1">
              Quantity
              {lastChanged !== 'quantity' && quantity && (
                <span className="text-xs text-blue-600">(calculated)</span>
              )}
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.00000001"
              value={quantity}
              onChange={handleQuantityChange}
              placeholder="0"
              disabled={disabled}
              className="mt-1 [&:autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:hover]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:focus]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)] "
            />
          </div>

          <div>
            <Label htmlFor="price" className="flex items-center gap-1">
              Price per Unit
              {lastChanged !== 'price' && price && (
                <span className="text-xs text-blue-600">(calculated)</span>
              )}
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.0001"
                value={price}
                onChange={handlePriceChange}
                placeholder="0.00"
                disabled={disabled}
                className="pl-7 [&:autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:hover]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)]  [&:-webkit-autofill:focus]:shadow-[inset_0_0_0_1000px_rgb(255_255_255)] "
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
