import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency, parseLocalDate } from '@/lib/utils';
import { Transaction } from '@/types/transaction';

interface TransactionCardProps {
  transaction: Transaction;
  isEditMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
}

export function TransactionCard({
  transaction,
  isEditMode = false,
  isSelected = false,
  onToggleSelection,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const metadata = transaction.transaction_metadata || {};

  // Extract Transaction properties with type-safe checks
  const transactionType =
    'transaction_type' in transaction
      ? (transaction['transaction_type'] as string)
      : '';
  const amount =
    'amount' in transaction ? (transaction['amount'] as number) : 0;
  const transactionId =
    'id' in transaction ? (transaction['id'] as string) : '';
  const description =
    'description' in transaction ? (transaction['description'] as string) : '';
  const transactionDate =
    'transaction_date' in transaction
      ? (transaction['transaction_date'] as string)
      : '';

  const isPositive = [
    'stock_buy',
    'etf_buy',
    'crypto_buy',
    'bond_buy',
    'option_buy',
    'deposit',
    'income',
    'dividend',
    'interest',
    'stock_dividend',
    'etf_dividend',
    'bond_coupon',
  ].includes(transactionType);

  const displayAmount = Math.abs(Number(amount));

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditMode) return;
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditMode) return;
    startXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isEditMode) return;
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    // Limit swipe to 80px in either direction
    const limitedDiff = Math.max(-80, Math.min(80, diff));
    setSwipeOffset(limitedDiff);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isEditMode) return;
    currentXRef.current = e.clientX;
    const diff = currentXRef.current - startXRef.current;
    const limitedDiff = Math.max(-80, Math.min(80, diff));
    setSwipeOffset(limitedDiff);
  };

  const handleEnd = () => {
    setIsDragging(false);
    // Snap to position based on swipe distance
    if (swipeOffset > 40) {
      setSwipeOffset(80); // Snap to reveal edit
    } else if (swipeOffset < -40) {
      setSwipeOffset(-80); // Snap to reveal delete
    } else {
      setSwipeOffset(0); // Snap back to center
    }
  };

  // Reset swipe when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSwipeOffset(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!transactionId) return null;

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {/* Left action (Delete) - revealed when swiping right */}
      <button
        onClick={() => {
          if (onDelete) {
            onDelete(transactionId);
            setSwipeOffset(0);
          }
        }}
        className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>

      {/* Right action (Edit) - revealed when swiping left */}
      <button
        onClick={() => {
          if (onEdit) {
            onEdit(transaction);
            setSwipeOffset(0);
          }
        }}
        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <Edit className="h-4 w-4 text-blue-500" />
      </button>

      {/* Main card content */}
      <Card
        key={transactionId}
        onClick={isEditMode ? onToggleSelection : undefined}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className={`p-4 shadow-sm transition-all ${
          isSelected
            ? 'bg-blue-50 border-blue-500 border-2 shadow-md'
            : 'bg-white border-gray-200 hover:shadow-md'
        } ${isEditMode ? 'cursor-pointer' : ''} ${
          isDragging ? '' : 'duration-300'
        }`}
      >
        <div className="flex items-center justify-between w-full">
        {/* Left: Ticker and Date */}
        <div className="flex flex-col w-24">
          {metadata.ticker ? (
            <span className="text-sm font-semibold px-2 py-1 bg-blue-100 rounded text-blue-700 text-center">
              {metadata.ticker}
            </span>
          ) : (
            <p className="text-xs font-semibold text-gray-900 px-2 py-1 text-center">
              {description.substring(0, 10)}
            </p>
          )}
          <span className="text-xs text-gray-500 px-2 text-center mt-1">
            {transactionDate
              ? parseLocalDate(transactionDate).toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: 'numeric',
                })
              : ''}
          </span>
        </div>

        {/* Center: Details */}
        <div className="flex flex-col items-start flex-1 px-6 gap-2">
          {metadata.quantity && (
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Qty:</span>
              <span className="text-sm font-semibold text-gray-700">
                {Number(metadata.quantity)}
              </span>
            </div>
          )}
          {metadata.price && (
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Price:</span>
              <span className="text-sm font-semibold text-gray-700">
                {formatCurrency(Number(metadata.price))}
              </span>
            </div>
          )}
        </div>

        {/* Right: Amount */}
        <div className="text-right">
          <p
            className={`text-base font-bold ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : '-'}
            {formatCurrency(displayAmount)}
          </p>
        </div>
      </div>
      </Card>
    </div>
  );
}
