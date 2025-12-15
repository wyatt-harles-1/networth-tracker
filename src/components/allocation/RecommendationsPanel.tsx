import React, { useState } from 'react';
import { X, AlertCircle, Info, TrendingUp, DollarSign } from 'lucide-react';
import type { Recommendation } from '../../hooks/useAllocationRecommendations';
import { allocationAnalysisService } from '../../services/allocationAnalysisService';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  onDismiss: (id: string) => Promise<void>;
  enabled: boolean;
  onToggle: () => void;
}

export function RecommendationsPanel({ recommendations, onDismiss, enabled, onToggle }: RecommendationsPanelProps) {
  const [dismissing, setDismissing] = useState<string | null>(null);

  // Sort recommendations by priority
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Group by priority
  const highPriority = sortedRecommendations.filter(r => r.priority === 'high');
  const mediumPriority = sortedRecommendations.filter(r => r.priority === 'medium');
  const lowPriority = sortedRecommendations.filter(r => r.priority === 'low');

  const handleDismiss = async (id: string) => {
    setDismissing(id);
    await onDismiss(id);
    setDismissing(null);
  };

  // Get icon for recommendation type
  const getTypeIcon = (type: Recommendation['recommendation_type']) => {
    switch (type) {
      case 'rebalance':
        return <TrendingUp className="w-5 h-5" />;
      case 'tax_optimize':
        return <DollarSign className="w-5 h-5" />;
      case 'diversify':
        return <TrendingUp className="w-5 h-5" />;
      case 'risk_adjustment':
        return <AlertCircle className="w-5 h-5" />;
      case 'insight':
        return <Info className="w-5 h-5" />;
    }
  };

  // Get border color for priority
  const getBorderColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
    }
  };

  // Get background color for priority
  const getBgColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50';
      case 'medium':
        return 'bg-yellow-50';
      case 'low':
        return 'bg-green-50';
    }
  };

  // Render recommendation card
  const renderRecommendation = (rec: Recommendation) => (
    <div
      key={rec.id}
      className={`${getBgColor(rec.priority)} border-l-4 ${getBorderColor(rec.priority)} rounded-r-lg p-4 mb-4 relative`}
    >
      {/* Dismiss button */}
      <button
        onClick={() => handleDismiss(rec.id)}
        disabled={dismissing === rec.id}
        className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors"
        title="Dismiss recommendation"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={allocationAnalysisService.getPriorityColor(rec.priority)}>
          {getTypeIcon(rec.recommendation_type)}
        </div>
        <div className="flex-1 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              {rec.priority} priority
            </span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-500 capitalize">
              {rec.recommendation_type.replace('_', ' ')}
            </span>
          </div>
          <h4 className="text-lg font-semibold text-gray-900">{rec.title}</h4>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-700 mb-4 pl-8">{rec.description}</p>

      {/* Action Items */}
      {rec.action_items && rec.action_items.length > 0 && (
        <div className="pl-8 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Actions:</p>
          <ul className="space-y-2">
            {rec.action_items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{item.action}</p>
                  {item.impact && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Impact:</span> {item.impact}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Impact */}
      {rec.expected_impact && (
        <div className="pl-8 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Expected impact:</span> {rec.expected_impact}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h3 className="text-lg font-semibold text-gray-900">AI-Powered Recommendations</h3>
        </div>
        <button
          onClick={onToggle}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            enabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {!enabled && (
        <div className="text-center py-8 text-gray-500">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Enable recommendations to see AI-powered portfolio insights</p>
        </div>
      )}

      {enabled && recommendations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No recommendations at this time</p>
          <p className="text-sm mt-2">Your portfolio looks good!</p>
        </div>
      )}

      {enabled && recommendations.length > 0 && (
        <div>
          {/* High Priority */}
          {highPriority.length > 0 && (
            <div className="mb-6">
              {highPriority.map(renderRecommendation)}
            </div>
          )}

          {/* Medium Priority */}
          {mediumPriority.length > 0 && (
            <div className="mb-6">
              {mediumPriority.map(renderRecommendation)}
            </div>
          )}

          {/* Low Priority */}
          {lowPriority.length > 0 && (
            <div>
              {lowPriority.map(renderRecommendation)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
