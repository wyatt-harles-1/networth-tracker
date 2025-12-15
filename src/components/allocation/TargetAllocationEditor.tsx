import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';
import { ALLOCATION_TEMPLATES, type AllocationTemplate } from '../../hooks/useAllocationTargets';

interface TargetAllocationEditorProps {
  currentTarget: Record<string, number> | null;
  currentTemplate: AllocationTemplate | null;
  onSave: (template: AllocationTemplate | null, targets: Record<string, number>, threshold: number) => Promise<{ success: boolean; error?: string }>;
  userAge?: number;
}

export function TargetAllocationEditor({ currentTarget, currentTemplate, onSave, userAge }: TargetAllocationEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AllocationTemplate | null>(currentTemplate || 'moderate');
  const [customTargets, setCustomTargets] = useState<Record<string, number>>(currentTarget || {});
  const [rebalanceThreshold, setRebalanceThreshold] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Common asset classes
  const assetClasses = ['Stocks', 'Bonds', 'Cash', 'Real Estate', 'Commodities', 'Other'];

  useEffect(() => {
    if (currentTarget) {
      setCustomTargets(currentTarget);
    }
  }, [currentTarget]);

  // Handle template selection
  const handleTemplateSelect = (template: AllocationTemplate) => {
    setSelectedTemplate(template);
    setError(null);
    setSuccess(false);

    if (template === 'age_based' && userAge) {
      const stockPct = Math.max(0, Math.min(100, 110 - userAge));
      const bondPct = 100 - stockPct;
      setCustomTargets({ 'Stocks': stockPct, 'Bonds': bondPct });
    } else if (template === 'custom') {
      // Keep current custom targets
    } else {
      setCustomTargets(ALLOCATION_TEMPLATES[template].targets);
    }
  };

  // Handle custom target change
  const handleTargetChange = (assetClass: string, value: number) => {
    setCustomTargets(prev => ({
      ...prev,
      [assetClass]: Math.max(0, Math.min(100, value)),
    }));
    setSelectedTemplate('custom');
  };

  // Calculate total percentage
  const totalPercentage = Object.values(customTargets).reduce((sum, val) => sum + val, 0);

  // Handle save
  const handleSave = async () => {
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError(`Total must equal 100% (currently ${totalPercentage.toFixed(1)}%)`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await onSave(selectedTemplate, customTargets, rebalanceThreshold);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to save target');
    }

    setSaving(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h3 className="text-lg font-semibold text-gray-900">Set Target Allocation</h3>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {/* Template Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Choose Template</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {(['conservative', 'moderate', 'aggressive', 'age_based', 'custom'] as AllocationTemplate[]).map(template => (
                <button
                  key={template}
                  onClick={() => handleTemplateSelect(template)}
                  disabled={template === 'age_based' && !userAge}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedTemplate === template
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600 hover:text-blue-600'
                  } ${template === 'age_based' && !userAge ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={ALLOCATION_TEMPLATES[template].description}
                >
                  {template === 'age_based' ? 'Age-Based' :
                   template === 'conservative' ? 'Conservative' :
                   template === 'moderate' ? 'Moderate' :
                   template === 'aggressive' ? 'Aggressive' : 'Custom'}
                </button>
              ))}
            </div>
            {selectedTemplate && (
              <p className="mt-2 text-xs text-gray-500">
                {ALLOCATION_TEMPLATES[selectedTemplate].description}
              </p>
            )}
          </div>

          {/* Custom Sliders */}
          <div className="space-y-4 mb-6">
            {assetClasses.map(assetClass => (
              <div key={assetClass}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">{assetClass}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customTargets[assetClass] || 0}
                      onChange={(e) => handleTargetChange(assetClass, parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  value={customTargets[assetClass] || 0}
                  onChange={(e) => handleTargetChange(assetClass, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  min="0"
                  max="100"
                  step="1"
                />
                <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${customTargets[assetClass] || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Percentage */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Total:</span>
            <span className={`text-lg font-bold ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPercentage.toFixed(1)}%
              {Math.abs(totalPercentage - 100) < 0.01 ? ' ✓' : ''}
            </span>
          </div>

          {/* Rebalance Threshold */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rebalance Alert Threshold
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                value={rebalanceThreshold}
                onChange={(e) => setRebalanceThreshold(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                min="3"
                max="15"
                step="1"
              />
              <span className="text-sm font-medium text-gray-900 w-16 text-right">
                {rebalanceThreshold}%
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Alert when allocation drifts more than {rebalanceThreshold}% from target
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Target allocation saved successfully!
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || Math.abs(totalPercentage - 100) > 0.01}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Target Allocation'}
          </button>
        </div>
      )}
    </div>
  );
}
