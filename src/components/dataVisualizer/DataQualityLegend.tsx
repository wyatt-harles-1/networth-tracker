/**
 * ============================================================================
 * DataQualityLegend Component
 * ============================================================================
 *
 * Legend explaining the color-coded calendar dates.
 * Shows what each color represents for data quality.
 *
 * ============================================================================
 */

import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export function DataQualityLegend() {
  const legendItems = [
    {
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-100',
      label: 'Real Data',
      description: 'Quality 1.0 - From market sources',
    },
    {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      label: 'Expected Gap',
      description: 'Quality 0.7 - Weekend/holiday or interpolated',
    },
    {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      label: 'Missing',
      description: 'Quality 0.0 - No data available',
    },
  ];

  return (
    <Card className="p-4 bg-white shadow-md">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Data Quality</h3>
      <div className="space-y-2">
        {legendItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-start gap-2">
              <div
                className={`p-1.5 rounded ${item.bg} flex-shrink-0`}
              >
                <Icon className={`h-3.5 w-3.5 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900">
                  {item.label}
                </p>
                <p className="text-[10px] text-gray-600 leading-tight">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
