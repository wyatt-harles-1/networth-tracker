/**
 * ============================================================================
 * SymbolSelector Component
 * ============================================================================
 *
 * Searchable symbol selector with coverage statistics.
 * Displays all holdings symbols sorted by data coverage percentage.
 *
 * Features:
 * - Search/filter by symbol or name
 * - Coverage percentage badges (color-coded)
 * - Date range display (earliest → latest)
 * - Click to select symbol
 * - Sort options
 *
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Check, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SymbolCoverage } from '@/hooks/useDataVisualizer';

interface SymbolSelectorProps {
  symbols: SymbolCoverage[];
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
  selectedSymbols?: string[];
  onToggleSelect?: (symbol: string) => void;
  loading?: boolean;
}

export function SymbolSelector({
  symbols,
  selectedSymbol,
  onSelect,
  selectedSymbols = [],
  onToggleSelect,
  loading = false,
}: SymbolSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'coverage' | 'alphabetical'>('coverage');

  // Filter and sort symbols
  const filteredSymbols = useMemo(() => {
    let filtered = symbols;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.symbol.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortBy === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else {
      // Default: sort by coverage (lowest first - most gaps)
      filtered = [...filtered].sort((a, b) => a.coveragePercent - b.coveragePercent);
    }

    return filtered;
  }, [symbols, searchQuery, sortBy]);

  /**
   * Get badge color based on coverage percentage
   */
  const getCoverageBadge = (coverage: number) => {
    if (coverage >= 90) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: TrendingUp,
      };
    } else if (coverage >= 50) {
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: Minus,
      };
    } else {
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: TrendingDown,
      };
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card className="p-4 bg-white shadow-md">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </Card>
    );
  }

  if (symbols.length === 0) {
    return (
      <Card className="p-6 bg-white shadow-md">
        <div className="text-center text-gray-500">
          <p className="text-sm">No holdings found</p>
          <p className="text-xs mt-1">Add some holdings to see data coverage</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white shadow-md">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Select Symbol
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              {symbols.length} symbol{symbols.length !== 1 ? 's' : ''} found
              {onToggleSelect && selectedSymbols.length > 0 && (
                <span className="ml-2 text-purple-600 font-semibold">
                  ({selectedSymbols.length} selected for bulk)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort Toggle */}
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'coverage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('coverage')}
            className={cn(
              'flex-1 text-xs',
              sortBy === 'coverage' && 'bg-purple-600 hover:bg-purple-700'
            )}
          >
            By Coverage
          </Button>
          <Button
            variant={sortBy === 'alphabetical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('alphabetical')}
            className={cn(
              'flex-1 text-xs',
              sortBy === 'alphabetical' && 'bg-purple-600 hover:bg-purple-700'
            )}
          >
            Alphabetical
          </Button>
        </div>

        {/* Symbol List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredSymbols.map(symbol => {
            const badge = getCoverageBadge(symbol.coveragePercent);
            const BadgeIcon = badge.icon;
            const isSelected = selectedSymbol === symbol.symbol;
            const isChecked = selectedSymbols.includes(symbol.symbol);

            return (
              <div
                key={symbol.symbol}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200'
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Checkbox for bulk selection */}
                  {onToggleSelect && (
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggleSelect(symbol.symbol)}
                      className="mt-1"
                    />
                  )}

                  {/* Symbol info - clickable to view calendar */}
                  <div
                    onClick={() => onSelect(symbol.symbol)}
                    className="flex-1 cursor-pointer hover:opacity-80"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'px-2 py-1 rounded text-xs font-semibold flex items-center gap-1',
                            badge.bg,
                            badge.text
                          )}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {symbol.coveragePercent.toFixed(0)}%
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">
                          {symbol.symbol}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                    </div>

                    <div className="ml-1">
                      <p className="text-xs text-gray-600 mb-1">{symbol.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {formatDate(symbol.earliestDate)} →{' '}
                        {formatDate(symbol.latestDate)}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-700">
                        {symbol.daysOfData}/{symbol.expectedDays} days
                        {symbol.missingDays > 0 && (
                          <span className="text-red-600 ml-1">
                            ({symbol.missingDays} missing)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredSymbols.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No symbols match your search</p>
          </div>
        )}
      </div>
    </Card>
  );
}
