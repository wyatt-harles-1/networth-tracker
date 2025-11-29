import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { PriceCorrectionService } from '@/services/priceCorrectionService';
import { formatCurrency } from '@/lib/utils';

interface PriceValidationResult {
  symbol: string;
  currentStoredPrice: number;
  marketPrice: number;
  deviation: number;
  isInvalid: boolean;
  reason?: string;
}

export function CryptoPriceCorrection() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    correctedHoldings: number;
    deletedPriceRecords: number;
    validationResults: PriceValidationResult[];
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const runCorrection = async () => {
    if (!user) return;

    setIsRunning(true);
    setResult(null);
    setErrors([]);

    try {
      const correctionResult = await PriceCorrectionService.runFullCorrection(
        user.id
      );

      if (correctionResult.success) {
        setResult(correctionResult.summary);
        setErrors(correctionResult.errors);
      } else {
        setErrors(correctionResult.errors);
      }
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : 'Failed to run correction',
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Fix Crypto Prices
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cryptocurrency Price Correction</DialogTitle>
          <DialogDescription>
            This tool automatically detects and corrects inaccurate
            cryptocurrency prices in your portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This process will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  Fetch current market prices for all your cryptocurrency
                  holdings
                </li>
                <li>
                  Identify prices that deviate significantly from market values
                </li>
                <li>
                  Automatically update incorrect prices with accurate market
                  data
                </li>
                <li>Remove invalid historical price records</li>
                <li>Recalculate your portfolio values</li>
              </ul>
            </AlertDescription>
          </Alert>

          {!result && !isRunning && (
            <Button
              onClick={runCorrection}
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Correction...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Start Price Correction
                </>
              )}
            </Button>
          )}

          {isRunning && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-sm text-gray-600">
                  Analyzing and correcting cryptocurrency prices...
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-semibold mb-2">Correction Complete!</div>
                  <ul className="space-y-1">
                    <li>
                      ✓ Corrected {result.correctedHoldings} cryptocurrency
                      holding{result.correctedHoldings !== 1 ? 's' : ''}
                    </li>
                    <li>
                      ✓ Removed {result.deletedPriceRecords} invalid price
                      record{result.deletedPriceRecords !== 1 ? 's' : ''}
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              {result.validationResults.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm">
                    Price Validation Results:
                  </h4>
                  {result.validationResults.map((validation, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg text-sm ${
                        validation.isInvalid
                          ? 'bg-orange-50 border border-orange-200'
                          : 'bg-green-50 border border-green-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">
                          {validation.symbol}
                        </span>
                        {validation.isInvalid ? (
                          <span className="text-xs text-orange-600">
                            Corrected
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">Valid</span>
                        )}
                      </div>
                      <div className="text-xs space-y-1">
                        {validation.isInvalid && (
                          <>
                            <div>
                              Old Price:{' '}
                              {formatCurrency(validation.currentStoredPrice)}
                            </div>
                            <div>
                              New Price:{' '}
                              {formatCurrency(validation.marketPrice)}
                            </div>
                            <div className="text-orange-600">
                              Deviation:{' '}
                              {(validation.deviation * 100).toFixed(2)}%
                            </div>
                          </>
                        )}
                        {!validation.isInvalid && (
                          <>
                            <div>
                              Current Price:{' '}
                              {formatCurrency(validation.marketPrice)}
                            </div>
                            <div className="text-green-600">
                              Price is accurate (deviation:{' '}
                              {(validation.deviation * 100).toFixed(2)}%)
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => {
                  setIsOpen(false);
                  window.location.reload();
                }}
                className="w-full"
              >
                Close and Refresh
              </Button>
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">
                  Errors occurred during correction:
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-xs">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
