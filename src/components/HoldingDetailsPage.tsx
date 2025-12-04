/**
 * Holding Details Page - Full-screen detailed view for individual holdings
 * Matches AccountDetailsPage structure exactly
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoldingDetailModal } from './HoldingDetailModal';

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
  account_id?: string;
}

export function HoldingDetailsPage() {
  const { holdingId } = useParams<{ holdingId: string }>();
  const navigate = useNavigate();
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // TODO: Fetch holding details by ID
    // For now, this is a placeholder
    if (holdingId) {
      // Fetch holding data and set it
      // const holding = await fetchHoldingById(holdingId);
      // setSelectedHolding(holding);
    }
  }, [holdingId]);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  if (!selectedHolding) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 overflow-y-auto">
        <div className="min-h-screen pb-20">
          {/* Header bar */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="hover:bg-gray-200"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">
                        Loading...
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading state */}
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="min-h-screen pb-20">
        {/* ===== HEADER BAR ===== */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back button and holding info */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="hover:bg-gray-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {selectedHolding.symbol}
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {selectedHolding.asset_type}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSettings(true)}
                  title="Holding settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT AREA ===== */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Render the modal content as page content */}
          <HoldingDetailModal
            holding={selectedHolding}
            isOpen={false} // Don't render as dialog
            onClose={handleBack}
          />
        </div>
      </div>

      {/* TODO: Add settings modal when needed */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Holding Settings
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Settings panel coming soon...
            </p>
            <Button onClick={() => setShowSettings(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
