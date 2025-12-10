import { Target, TrendingUp, Calendar, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePortfolioCalculations } from '@/hooks/usePortfolioCalculations';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';

export function GoalProgressCard() {
  const { portfolio, loading } = usePortfolioCalculations();
  const [goalAmount] = useState(500000); // Default goal - could be stored in user profile
  const [targetYear] = useState(2050); // Default target year
  const [showSettings, setShowSettings] = useState(false);

  if (loading) {
    return (
      <Card className="p-4 bg-white border-0 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </Card>
    );
  }

  const currentValue = portfolio.netWorth;
  const progressPercent = Math.min((currentValue / goalAmount) * 100, 100);
  const remaining = Math.max(goalAmount - currentValue, 0);
  const currentYear = new Date().getFullYear();
  const yearsRemaining = Math.max(targetYear - currentYear, 0);

  // Calculate if on track
  const requiredAnnualGrowth = yearsRemaining > 0
    ? ((goalAmount / currentValue) ** (1 / yearsRemaining) - 1) * 100
    : 0;
  const isOnTrack = requiredAnnualGrowth <= 10; // Assuming 10% is achievable

  return (
    <Card className="p-4 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Retirement Goal</h3>
          <p className="text-xs text-gray-500">Target {targetYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isOnTrack ? 'bg-green-50' : 'bg-orange-50'}`}>
            <Target className={`h-4 w-4 ${isOnTrack ? 'text-green-600' : 'text-orange-600'}`} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 h-auto"
          >
            <Settings className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(currentValue)}
          </span>
          <span className="text-sm text-gray-500">
            / {formatCurrency(goalAmount)}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-medium text-gray-600">
            {progressPercent.toFixed(1)}% Complete
          </span>
          <span className="text-xs text-gray-500">
            {formatCurrency(remaining)} to go
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        {isOnTrack ? (
          <>
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-700 font-medium">
              On track for {targetYear}
            </span>
          </>
        ) : (
          <>
            <Calendar className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-orange-700 font-medium">
              Need ~{requiredAnnualGrowth.toFixed(1)}% annual growth
            </span>
          </>
        )}
      </div>

      {/* Settings Panel (collapsed by default) */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">
            Goal settings coming soon! You'll be able to customize your target amount and year.
          </p>
        </div>
      )}
    </Card>
  );
}
