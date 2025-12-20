/**
 * ============================================================================
 * DataCalendar Component
 * ============================================================================
 *
 * Interactive calendar showing historical price data quality for each date.
 * Color-coded dates indicate real data (green), interpolated (yellow), or missing (red).
 *
 * Features:
 * - Color-coded dates based on data quality
 * - Tooltips showing detailed information
 * - Date selection for backfill actions
 * - Visual quality indicators
 *
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency } from '@/lib/utils';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import type { DateQuality } from '@/hooks/useDataVisualizer';
import type { DateRange } from 'react-day-picker';
import './DataCalendar.css';

interface DataCalendarProps {
  dateQualityMap: Map<string, DateQuality>;
  dateRange: { start: Date; end: Date } | null;
  selectedSymbol: string | null;
  onDateSelect?: (date: Date) => void;
  onDateRangeBackfill?: (startDate: Date, endDate: Date) => void;
  backfilling?: boolean;
}

export function DataCalendar({
  dateQualityMap,
  dateRange,
  selectedSymbol,
  onDateSelect,
  onDateRangeBackfill,
  backfilling = false,
}: DataCalendarProps) {
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('range');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);
  const [month, setMonth] = useState<Date>(dateRange?.end || new Date());

  // Build modifier arrays for calendar
  const modifiers = useMemo(() => {
    const hasRealData: Date[] = [];
    const hasInterpolated: Date[] = [];
    const missing: Date[] = [];

    dateQualityMap.forEach((quality, dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');

      if (quality.quality === 1.0) {
        hasRealData.push(date);
      } else if (quality.quality > 0) {
        hasInterpolated.push(date);
      } else {
        missing.push(date);
      }
    });

    return {
      hasRealData,
      hasInterpolated,
      missing,
    };
  }, [dateQualityMap]);

  // Modifier styles for calendar
  const modifiersStyles = {
    hasRealData: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      fontWeight: 600,
    },
    hasInterpolated: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      fontWeight: 600,
    },
    missing: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      fontWeight: 600,
    },
  };

  /**
   * Get quality info for a specific date
   */
  const getDateInfo = (date: Date): DateQuality | null => {
    const dateStr = date.toISOString().split('T')[0];
    return dateQualityMap.get(dateStr) || null;
  };

  /**
   * Handle single date selection
   */
  const handleSingleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  /**
   * Handle date range selection
   */
  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
  };

  /**
   * Handle backfill action for selected dates
   */
  const handleBackfillSelected = () => {
    if (selectionMode === 'single' && selectedDate) {
      // Backfill single date
      if (onDateRangeBackfill) {
        onDateRangeBackfill(selectedDate, selectedDate);
      }
    } else if (selectionMode === 'range' && selectedRange?.from) {
      // Backfill date range
      const startDate = selectedRange.from;
      const endDate = selectedRange.to || selectedRange.from;
      if (onDateRangeBackfill) {
        onDateRangeBackfill(startDate, endDate);
      }
    }
  };

  if (!selectedSymbol) {
    return (
      <Card className="p-6 bg-white shadow-md">
        <div className="text-center text-gray-500">
          <p className="text-sm">Select a symbol to view calendar</p>
          <p className="text-xs mt-1">
            The calendar will show data coverage for the selected symbol
          </p>
        </div>
      </Card>
    );
  }

  if (!dateRange) {
    return (
      <Card className="p-6 bg-white shadow-md">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white shadow-md">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Data Coverage Calendar
            </h3>
            <p className="text-xs text-gray-600">
              {selectedSymbol} - {dateRange ? (
                <>
                  {dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to{' '}
                  {dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' '}({Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days)
                </>
              ) : 'Loading...'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded">
            <button
              onClick={() => {
                setSelectionMode('single');
                setSelectedRange(undefined);
              }}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                selectionMode === 'single'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => {
                setSelectionMode('range');
                setSelectedDate(undefined);
              }}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                selectionMode === 'range'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Range
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="data-visualizer-calendar">
          {selectionMode === 'single' ? (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSingleDateSelect}
              month={month}
              onMonthChange={setMonth}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              disabled={{ after: dateRange.end, before: dateRange.start }}
              className="rounded-md border"
            />
          ) : (
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={handleRangeSelect}
              month={month}
              onMonthChange={setMonth}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              disabled={{ after: dateRange.end, before: dateRange.start }}
              className="rounded-md border"
              numberOfMonths={1}
            />
          )}
        </div>

        {/* Selected Date/Range Info and Backfill Button */}
        {(selectedDate || selectedRange?.from) && (
          <div className="space-y-2">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
              {selectionMode === 'single' && selectedDate ? (
                <>
                  <p className="text-xs font-semibold text-purple-900 mb-1">
                    Selected: {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {(() => {
                    const info = getDateInfo(selectedDate);
                    if (info) {
                      return (
                        <div className="text-[10px] text-purple-800 space-y-0.5">
                          <p>
                            <strong>Quality:</strong> {info.quality.toFixed(1)}
                            {info.quality === 1.0
                              ? ' (Real Data)'
                              : info.quality > 0
                              ? ' (Expected Gap)'
                              : ' (Missing)'}
                          </p>
                          {info.price && (
                            <p>
                              <strong>Price:</strong> {formatCurrency(info.price)}
                            </p>
                          )}
                          {info.source && (
                            <p>
                              <strong>Source:</strong> {info.source}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return (
                      <p className="text-[10px] text-purple-800">No data for this date</p>
                    );
                  })()}
                </>
              ) : selectionMode === 'range' && selectedRange?.from ? (
                <>
                  <p className="text-xs font-semibold text-purple-900 mb-1">
                    Selected Range:
                  </p>
                  <div className="text-[10px] text-purple-800 space-y-0.5">
                    <p>
                      <strong>From:</strong> {selectedRange.from.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p>
                      <strong>To:</strong> {(selectedRange.to || selectedRange.from).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {selectedRange.to && (
                      <p>
                        <strong>Days:</strong> {Math.ceil((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1}
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Backfill Button */}
            {onDateRangeBackfill && (
              <Button
                onClick={handleBackfillSelected}
                disabled={backfilling || (!selectedDate && !selectedRange?.from)}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                {backfilling ? 'Backfilling...' : 'Backfill Selected'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
