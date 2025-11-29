/**
 * ============================================================================
 * TickerAutocomplete Component
 * ============================================================================
 *
 * Autocomplete input for searching and selecting stock/crypto tickers.
 *
 * Features:
 * - Real-time ticker search as user types
 * - Debounced search (300ms delay)
 * - Recent ticker history
 * - Dropdown suggestions with details
 * - Keyboard navigation (up/down arrows, enter)
 * - Click outside to close
 * - Loading indicator
 * - Search icon
 * - Disabled state support
 *
 * Search Results Include:
 * - Symbol (ticker)
 * - Company/asset name
 * - Asset type (stock, ETF, crypto, mutual fund)
 * - Exchange
 *
 * Recent Tickers:
 * - Stores last 5 searched tickers in localStorage
 * - Shows recent tickers when input is focused but empty
 * - Click to quickly select recent ticker
 *
 * Data Source:
 * - TickerSearchService for live search
 * - localStorage for recent tickers
 *
 * Keyboard Shortcuts:
 * - Arrow Down: Navigate to next suggestion
 * - Arrow Up: Navigate to previous suggestion
 * - Enter: Select highlighted suggestion
 * - Escape: Close suggestions
 *
 * Props:
 * - value: Current input value
 * - onChange: Callback when ticker is selected
 * - disabled: Disable input
 * - placeholder: Input placeholder text
 *
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { TickerSearchService } from '@/services/tickerSearchService';

/**
 * Ticker suggestion structure
 */
interface TickerSuggestion {
  symbol: string;
  name: string;
  type?: 'stock' | 'etf' | 'crypto' | 'mutualfund';
  exchange?: string;
}

interface TickerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Ticker autocomplete component
 */
export function TickerAutocomplete({
  value,
  onChange,
  disabled,
  placeholder,
}: TickerAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentTickers, setRecentTickers] = useState<TickerSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('recentTickers');
    if (stored) {
      try {
        setRecentTickers(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent tickers', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 1) {
        setSuggestions(recentTickers);
        return;
      }

      setLoading(true);
      try {
        const results = await TickerSearchService.searchTickers(value);
        setSuggestions(results as TickerSuggestion[]);
      } catch (error) {
        console.error('Failed to fetch ticker suggestions', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [value, recentTickers]);

  const handleSelect = (suggestion: TickerSuggestion) => {
    onChange(suggestion.symbol);
    setShowSuggestions(false);

    const updated = [
      suggestion,
      ...recentTickers.filter(t => t.symbol !== suggestion.symbol),
    ].slice(0, 10);
    setRecentTickers(updated);
    localStorage.setItem('recentTickers', JSON.stringify(updated));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value && suggestions.length === 0) {
      setLoading(true);
      const isValid = await TickerSearchService.validateTicker(value);
      setLoading(false);

      if (isValid) {
        const updated = [
          { symbol: value, name: value, type: 'stock' as const },
          ...recentTickers.filter(t => t.symbol !== value),
        ].slice(0, 10);
        setRecentTickers(updated);
        localStorage.setItem('recentTickers', JSON.stringify(updated));
        setShowSuggestions(false);
      }
    }
  };

  const handleFocus = () => {
    setShowSuggestions(true);
    if (!value && recentTickers.length > 0) {
      setSuggestions(recentTickers);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || 'e.g., AAPL, MSFT, BTC, CRWD'}
          className="pl-10 uppercase"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {!value && recentTickers.length > 0 && (
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-200">
              Recent Tickers
            </div>
          )}
          {suggestions.map(suggestion => (
            <button
              key={suggestion.symbol}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-semibold text-gray-900 flex-shrink-0">
                    {suggestion.symbol}
                  </span>
                  {suggestion.type && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        suggestion.type === 'crypto'
                          ? 'bg-orange-100 text-orange-700'
                          : suggestion.type === 'etf'
                            ? 'bg-purple-100 text-purple-700'
                            : suggestion.type === 'mutualfund'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {suggestion.type === 'mutualfund'
                        ? 'FUND'
                        : suggestion.type.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 truncate">
                  {suggestion.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
