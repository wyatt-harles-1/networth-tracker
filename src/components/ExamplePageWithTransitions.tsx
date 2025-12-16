/**
 * Example Page Template with Page Transitions
 *
 * This is a reference implementation showing how to use the page transition
 * components for consistent loading animations across all pages.
 *
 * Copy this pattern for any new page!
 */

import { useState } from 'react';
import { ArrowLeft, TrendingUp, BarChart3, PieChart, Target } from 'lucide-react';
import {
  PageLoading,
  PageEmptyState,
  PageContainer,
  PageHeader,
  GridContainer,
  GridCard,
  ContentSection,
  BackButton,
} from '@/components/ui/page-transitions';

// Mock data hook (replace with your actual data hook)
function usePageData() {
  const [loading] = useState(false);
  const [data] = useState([
    { id: '1', name: 'Item 1', icon: TrendingUp, description: 'First item description' },
    { id: '2', name: 'Item 2', icon: BarChart3, description: 'Second item description' },
    { id: '3', name: 'Item 3', icon: PieChart, description: 'Third item description' },
    { id: '4', name: 'Item 4', icon: Target, description: 'Fourth item description' },
  ]);

  return { data, loading };
}

export function ExamplePageWithTransitions() {
  const { data, loading } = usePageData();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle selecting an item (with transition)
  const handleItemSelect = (itemId: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedItem(itemId);
      setIsTransitioning(false);
    }, 200);
  };

  // Handle going back to grid (with transition)
  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedItem(null);
      setIsTransitioning(false);
    }, 200);
  };

  // ==========================================================================
  // PHASE 1: LOADING STATE
  // ==========================================================================
  if (loading) {
    return <PageLoading message="Loading your data..." />;
  }

  // ==========================================================================
  // PHASE 2: EMPTY STATE
  // ==========================================================================
  if (!data || data.length === 0) {
    return (
      <PageEmptyState
        icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
        title="No Data Available"
        description="Get started by adding your first item to see it here."
        action={
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Item
          </button>
        }
      />
    );
  }

  // ==========================================================================
  // PHASE 3-4: GRID VIEW (Main view with cascading cards)
  // ==========================================================================
  if (selectedItem === null) {
    return (
      <PageContainer isTransitioning={isTransitioning}>
        <PageHeader
          title="Example Page"
          subtitle="This demonstrates the 5-phase loading animations"
          action={
            <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Action Button
            </button>
          }
        />

        <GridContainer columns={2}>
          {data.map((item, index) => {
            const Icon = item.icon;
            return (
              <GridCard
                key={item.id}
                index={index}
                onClick={() => handleItemSelect(item.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-blue-100 transition-all duration-300">
                    <Icon className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </GridCard>
            );
          })}
        </GridContainer>
      </PageContainer>
    );
  }

  // ==========================================================================
  // PHASE 5: DETAIL VIEW (Selected item with animated header and content)
  // ==========================================================================
  const currentItem = data.find(item => item.id === selectedItem);
  const Icon = currentItem?.icon || TrendingUp;

  return (
    <PageContainer isTransitioning={isTransitioning}>
      {/* Animated header with back button */}
      <PageHeader
        title={currentItem?.name || 'Item Details'}
        subtitle="Detailed information about this item"
        backButton={
          <BackButton
            onClick={handleBack}
            label="Back to Grid"
            icon={<ArrowLeft className="h-4 w-4" />}
          />
        }
        animated={true}
      />

      {/* Content section with delay */}
      <ContentSection delay={100}>
        <div className="space-y-6">
          {/* Example content card 1 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Section Title</h3>
                <p className="text-sm text-gray-600">Section description</p>
              </div>
            </div>
            <p className="text-gray-700">
              This is an example of content that animates in after a delay.
              All your detailed content would go here.
            </p>
          </div>

          {/* Example content card 2 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="font-semibold mb-3">Additional Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Metric 1:</span>
                <span className="font-semibold">Value 1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Metric 2:</span>
                <span className="font-semibold">Value 2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Metric 3:</span>
                <span className="font-semibold">Value 3</span>
              </div>
            </div>
          </div>
        </div>
      </ContentSection>

      {/* Optional: Second content section with longer delay */}
      <ContentSection delay={200}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold mb-3">More Content</h4>
          <p className="text-gray-700">
            This section animates in 100ms after the previous section,
            creating a nice cascading effect.
          </p>
        </div>
      </ContentSection>
    </PageContainer>
  );
}
