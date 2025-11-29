import {
  TrendingUp,
  PieChart,
  Bitcoin,
  Shield,
  Target,
  Home,
  type LucideIcon,
} from 'lucide-react';

interface AssetTypeCount {
  type: string;
  count: number;
  value: number;
}

interface AssetTypeFilterProps {
  assetTypeCounts: AssetTypeCount[];
  selectedTypes: Set<string>;
  onToggle: (type: string) => void;
}

const ASSET_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; Icon: LucideIcon }
> = {
  stock: { label: 'Stocks', color: 'blue', Icon: TrendingUp },
  etf: { label: 'ETFs', color: 'purple', Icon: PieChart },
  crypto: { label: 'Crypto', color: 'orange', Icon: Bitcoin },
  bond: { label: 'Bonds', color: 'green', Icon: Shield },
  option: { label: 'Options', color: 'red', Icon: Target },
  real_estate: { label: 'Real Estate', color: 'brown', Icon: Home },
};

const COLOR_CLASSES = {
  blue: {
    active: 'bg-blue-600 text-white shadow-sm border-blue-600',
    inactive:
      'border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50',
  },
  purple: {
    active: 'bg-purple-600 text-white shadow-sm border-purple-600',
    inactive:
      'border-2 border-purple-300 text-purple-600 hover:border-purple-500 hover:bg-purple-50',
  },
  orange: {
    active: 'bg-orange-600 text-white shadow-sm border-orange-600',
    inactive:
      'border-2 border-orange-300 text-orange-600 hover:border-orange-500 hover:bg-orange-50',
  },
  green: {
    active: 'bg-green-600 text-white shadow-sm border-green-600',
    inactive:
      'border-2 border-green-300 text-green-600 hover:border-green-500 hover:bg-green-50',
  },
  red: {
    active: 'bg-red-600 text-white shadow-sm border-red-600',
    inactive:
      'border-2 border-red-300 text-red-600 hover:border-red-500 hover:bg-red-50',
  },
  brown: {
    active: 'bg-amber-700 text-white shadow-sm border-amber-700',
    inactive:
      'border-2 border-amber-400 text-amber-700 hover:border-amber-600 hover:bg-amber-50',
  },
};

export function AssetTypeFilter({
  assetTypeCounts,
  selectedTypes,
  onToggle,
}: AssetTypeFilterProps) {
  if (assetTypeCounts.length === 0) {
    return null;
  }

  const allTypes = assetTypeCounts.map(({ type }) => type);
  const allSelected = allTypes.every(type => selectedTypes.has(type));

  const handleSelectAll = () => {
    allTypes.forEach(type => {
      if (!selectedTypes.has(type)) {
        onToggle(type);
      }
    });
  };

  const handleClearAll = () => {
    allTypes.forEach(type => {
      if (selectedTypes.has(type)) {
        onToggle(type);
      }
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Action Buttons */}
        <button
          onClick={allSelected ? handleClearAll : handleSelectAll}
          className="px-3 py-1.5 rounded-full text-xs font-medium border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
        >
          {allSelected ? 'Clear All' : 'Select All'}
        </button>

        {/* Divider */}
        {assetTypeCounts.length > 0 && <div className="w-px h-6 bg-gray-300" />}

        {assetTypeCounts.map(({ type, count }) => {
          const config = ASSET_TYPE_CONFIG[type] || {
            label: type,
            color: 'blue',
            Icon: TrendingUp,
          };
          const isSelected = selectedTypes.has(type);
          const colorClasses =
            COLOR_CLASSES[config.color as keyof typeof COLOR_CLASSES] ||
            COLOR_CLASSES.blue;
          const Icon = config.Icon;

          return (
            <button
              key={type}
              onClick={() => onToggle(type)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-200
                flex items-center gap-2
                ${isSelected ? colorClasses.active : colorClasses.inactive}
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{config.label}</span>
              <span
                className={`
                ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
                ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-600'
                }
              `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
