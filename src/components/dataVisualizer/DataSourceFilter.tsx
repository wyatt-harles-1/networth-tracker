/**
 * ============================================================================
 * DataSourceFilter Component
 * ============================================================================
 *
 * Filter and view data by source (Yahoo Finance, Alpha Vantage, Manual, etc.)
 *
 * Features:
 * - Data source breakdown with counts
 * - Filter toggle for each source
 * - Visual indicators
 *
 * ============================================================================
 */

import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Database, Globe, Edit3, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateQuality } from '@/hooks/useDataVisualizer';

interface DataSourceFilterProps {
  dateQualityMap: Map<string, DateQuality>;
  selectedSources: string[];
  onToggleSource: (source: string) => void;
}

export function DataSourceFilter({
  dateQualityMap,
  selectedSources,
  onToggleSource,
}: DataSourceFilterProps) {
  // Count dates by data source
  const sourceBreakdown = new Map<string, number>();

  dateQualityMap.forEach((quality) => {
    if (quality.source) {
      const count = sourceBreakdown.get(quality.source) || 0;
      sourceBreakdown.set(quality.source, count + 1);
    } else if (quality.hasData) {
      // Has data but no source specified
      const count = sourceBreakdown.get('Unknown') || 0;
      sourceBreakdown.set('Unknown', count + 1);
    }
  });

  // Get icon for data source
  const getSourceIcon = (source: string) => {
    const lower = source.toLowerCase();
    if (lower.includes('yahoo')) return Globe;
    if (lower.includes('alpha') || lower.includes('vantage')) return Database;
    if (lower.includes('manual')) return Edit3;
    return HelpCircle;
  };

  // Get color for data source
  const getSourceColor = (source: string) => {
    const lower = source.toLowerCase();
    if (lower.includes('yahoo')) return 'text-blue-600';
    if (lower.includes('alpha') || lower.includes('vantage')) return 'text-purple-600';
    if (lower.includes('manual')) return 'text-green-600';
    return 'text-gray-600';
  };

  const sources = Array.from(sourceBreakdown.entries()).sort((a, b) => b[1] - a[1]);

  if (sources.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-white shadow-md">
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Data Sources
          </h3>
          <p className="text-xs text-gray-600">
            Filter by price data source
          </p>
        </div>

        {/* Source List */}
        <div className="space-y-2">
          {sources.map(([source, count]) => {
            const Icon = getSourceIcon(source);
            const isSelected = selectedSources.length === 0 || selectedSources.includes(source);

            return (
              <div
                key={source}
                className={cn(
                  'flex items-center justify-between p-2 rounded border transition-all cursor-pointer hover:bg-gray-50',
                  isSelected ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                )}
                onClick={() => onToggleSource(source)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSource(source)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Icon className={cn('h-4 w-4', getSourceColor(source))} />
                  <span className="text-sm font-medium text-gray-900">
                    {source}
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Clear Filter */}
        {selectedSources.length > 0 && selectedSources.length < sources.length && (
          <button
            onClick={() => {
              // Clear all filters by selecting all
              sources.forEach(([source]) => {
                if (!selectedSources.includes(source)) {
                  onToggleSource(source);
                }
              });
            }}
            className="w-full text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            Show All Sources
          </button>
        )}
      </div>
    </Card>
  );
}
