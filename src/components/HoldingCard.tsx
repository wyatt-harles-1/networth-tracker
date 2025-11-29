/**
 * ============================================================================
 * HoldingCard Component
 * ============================================================================
 *
 * Displays a single investment holding with key metrics.
 *
 * Features:
 * - Symbol badge with asset type
 * - Quantity display
 * - Cost basis or average cost (switchable)
 * - Current value or current price (switchable)
 * - Unrealized gain/loss with color coding
 * - Percentage gain/loss
 * - Hover effects
 *
 * Display Modes:
 * - Value Mode: Shows total cost basis and current value
 * - Price Mode: Shows average cost per share and current price per share
 *
 * Visual Design:
 * - Symbol: Blue badge
 * - Asset type: Gray badge
 * - Gains: Green text
 * - Losses: Red text
 * - Clean grid layout
 *
 * Metrics Displayed:
 * - Symbol and asset type
 * - Quantity (shares/units)
 * - Cost basis or avg cost (depends on mode)
 * - Current value or current price (depends on mode)
 * - Gain/loss amount
 * - Gain/loss percentage
 *
 * Props:
 * - holding: Holding data
 * - displayMode: 'value' or 'price' mode
 *
 * ============================================================================
 */

import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

/**
 * Holding data structure
 */
interface Holding {
  id: string;
  symbol: string;
  asset_type: string;
  quantity: number | string;
  cost_basis: number | string;
  current_value: number | string;
  current_price: number | string;
  gain?: number;
  gainPercentage?: number;
}

interface HoldingCardProps {
  holding: Holding;
  displayMode: 'value' | 'price';
}

/**
 * Holding card component
 */
export function HoldingCard({ holding, displayMode }: HoldingCardProps) {
  const avgPricePerShare =
    Number(holding.quantity) > 0
      ? Number(holding.cost_basis) / Number(holding.quantity)
      : 0;

  return (
    <Card className="p-4 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col w-20">
            <span className="text-sm font-semibold px-2 py-0.5 bg-blue-100 rounded text-blue-700 text-center">
              {holding.symbol}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 mt-1 text-center">
              {holding.asset_type}
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex flex-col w-20">
              <span className="text-xs text-gray-500 mb-1">Shares:</span>
              <span className="text-sm font-semibold text-gray-700">
                {Number(holding.quantity)}
              </span>
            </div>
            <div className="flex flex-col w-24">
              <span className="text-xs text-gray-500 mb-1">
                {displayMode === 'value' ? 'Cost Basis:' : 'Avg. Cost:'}
              </span>
              <span className="text-sm font-semibold text-gray-700">
                {displayMode === 'value'
                  ? formatCurrency(Number(holding.cost_basis))
                  : formatCurrency(avgPricePerShare)}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          {displayMode === 'value' ? (
            <>
              {/* Market Value Mode */}
              <p className="text-base font-bold text-gray-900">
                {formatCurrency(Number(holding.current_value))}
              </p>
              <p
                className={`text-sm font-semibold mt-1 ${
                  (holding.gain ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {(holding.gain ?? 0) >= 0 ? '+' : ''}
                {formatCurrency(holding.gain ?? 0)}
              </p>
            </>
          ) : (
            <>
              {/* Per Share Mode */}
              <p className="text-base font-bold text-gray-900">
                {formatCurrency(Number(holding.current_price))}
              </p>
              <p
                className={`text-sm font-semibold mt-1 ${
                  (holding.gainPercentage ?? 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {(holding.gainPercentage ?? 0) >= 0 ? '+' : ''}
                {(holding.gainPercentage ?? 0).toFixed(2)}%
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
