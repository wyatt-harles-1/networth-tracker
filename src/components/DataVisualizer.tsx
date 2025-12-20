/**
 * ============================================================================
 * DataVisualizer Component - Historical Price Data Coverage Tool
 * ============================================================================
 *
 * Debug/admin tool to visualize historical price data gaps and quality.
 *
 * Features:
 * - Interactive calendar showing data coverage for selected symbols
 * - Color-coded dates (real data, interpolated, missing)
 * - Coverage statistics and gap analysis
 * - Backfill capabilities for missing date ranges
 * - Searchable symbol selector with coverage percentages
 *
 * ============================================================================
 */

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useDataVisualizer } from '@/hooks/useDataVisualizer';
import { SymbolSelector } from './dataVisualizer/SymbolSelector';
import { DataCalendar } from './dataVisualizer/DataCalendar';
import { DataQualityLegend } from './dataVisualizer/DataQualityLegend';
import { BackfillControls } from './dataVisualizer/BackfillControls';
import { BulkBackfillPanel } from './dataVisualizer/BulkBackfillPanel';
import { DataSourceFilter } from './dataVisualizer/DataSourceFilter';

export function DataVisualizer() {
  const { setPageTitle } = usePageTitle();

  const {
    symbols,
    selectedSymbol,
    setSelectedSymbol,
    selectedSymbols,
    toggleSymbolSelection,
    clearSymbolSelection,
    dateQualityMap,
    filteredDateQualityMap,
    dateRange,
    selectedSources,
    toggleSourceFilter,
    backfillDate,
    backfillRange,
    bulkBackfill,
    refreshData,
    loading,
    backfilling,
    bulkBackfilling,
    bulkProgress,
    error,
  } = useDataVisualizer();

  // Set page title
  useEffect(() => {
    setPageTitle('Data Visualizer');
    return () => setPageTitle(null);
  }, [setPageTitle]);

  // Handle backfill selected symbol (all gaps)
  const handleBackfillAll = async () => {
    if (!dateRange) return;
    await backfillRange(dateRange.start, dateRange.end);
  };

  // Handle backfill for selected date
  const handleBackfillSelected = async () => {
    if (!dateRange) return;
    // For now, backfill the entire range
    // TODO: Allow selecting specific dates/ranges from calendar
    await backfillRange(dateRange.start, dateRange.end);
  };

  if (loading && symbols.length === 0) {
    return (
      <div className="p-4 pb-20 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading symbol data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Historical Data Visualizer
          </h2>
          <p className="text-sm text-gray-600">
            Analyze price data coverage and fill gaps across your holdings
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel - Symbol Selector */}
          <div className="lg:col-span-4 space-y-4">
            <SymbolSelector
              symbols={symbols}
              selectedSymbol={selectedSymbol}
              onSelect={setSelectedSymbol}
              selectedSymbols={selectedSymbols}
              onToggleSelect={toggleSymbolSelection}
              loading={loading}
            />

            {/* Bulk Backfill Panel */}
            <BulkBackfillPanel
              selectedSymbols={selectedSymbols}
              bulkBackfilling={bulkBackfilling}
              bulkProgress={bulkProgress}
              onBulkBackfill={bulkBackfill}
              onClearSelection={clearSymbolSelection}
              dateRange={dateRange}
            />
          </div>

          {/* Right Panel - Calendar and Controls */}
          <div className="lg:col-span-8 space-y-4">
            {/* Calendar */}
            <DataCalendar
              dateQualityMap={filteredDateQualityMap}
              dateRange={dateRange}
              selectedSymbol={selectedSymbol}
              onDateSelect={(date) => {
                console.log('Date selected:', date);
              }}
              onDateRangeBackfill={backfillRange}
              backfilling={backfilling}
            />

            {/* Three Column Row: Legend, Data Source Filter, Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DataQualityLegend />

              {selectedSymbol && (
                <DataSourceFilter
                  dateQualityMap={dateQualityMap}
                  selectedSources={selectedSources}
                  onToggleSource={toggleSourceFilter}
                />
              )}

              <BackfillControls
                selectedSymbol={selectedSymbol}
                backfilling={backfilling}
                onBackfillSelected={handleBackfillSelected}
                onBackfillAll={handleBackfillAll}
                onRefresh={refreshData}
                error={error}
                dateQualityMap={dateQualityMap}
                symbols={symbols}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
