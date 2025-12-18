/**
 * Ticker Detection Service
 *
 * Automatically detects asset types from ticker symbols using:
 * 1. Database lookup (ticker_directory)
 * 2. Pattern matching (crypto suffixes, option formats, etc.)
 * 3. Common known symbols
 */

import { supabase } from '@/lib/supabase';
import { TransactionCategory } from '@/types/transaction';
import { YahooFinanceService } from '@/services/yahooFinanceService';

export type AssetType = 'stock' | 'etf' | 'crypto' | 'option' | 'bond' | 'mutual_fund' | 'unknown';

/**
 * Map asset types to transaction categories
 */
export const assetTypeToCategory: Record<AssetType, TransactionCategory | null> = {
  stock: 'stock',
  etf: 'etf',
  crypto: 'crypto',
  option: 'options',
  bond: 'bond',
  mutual_fund: 'stock', // Treat mutual funds similar to stocks
  unknown: null, // Cannot auto-determine category
};

/**
 * Detect asset type from ticker symbol using pattern matching
 * This is a client-side fallback that mirrors the database function
 */
export function detectAssetTypeFromPattern(ticker: string): AssetType {
  const normalizedTicker = ticker.toUpperCase().trim();

  // Crypto patterns (common suffixes)
  if (/(USD|USDT|BTC|ETH)$/.test(normalizedTicker)) {
    return 'crypto';
  }

  // Common crypto symbols
  const commonCryptoSymbols = [
    'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL',
    'DOGE', 'MATIC', 'DOT', 'AVAX', 'SHIB', 'LTC', 'LINK',
    'UNI', 'ATOM', 'NEAR', 'FTM', 'ALGO', 'XLM', 'HBAR'
  ];
  if (commonCryptoSymbols.includes(normalizedTicker)) {
    return 'crypto';
  }

  // Option patterns (e.g., AAPL240119C00150000)
  if (/^[A-Z]{1,5}[0-9]{6}[CP][0-9]{8}$/.test(normalizedTicker)) {
    return 'option';
  }

  // Bond patterns (CUSIP or contains BOND)
  if (/^[0-9]{9}$/.test(normalizedTicker) || /BOND/.test(normalizedTicker)) {
    return 'bond';
  }

  // Mutual fund patterns (5 chars ending in X)
  if (/^[A-Z]{5}$/.test(normalizedTicker) && /X$/.test(normalizedTicker)) {
    return 'mutual_fund';
  }

  // Common ETF symbols (extend this list as needed)
  const commonETFSymbols = [
    'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO',
    'AGG', 'BND', 'LQD', 'HYG', 'GLD', 'SLV', 'USO', 'TLT',
    'EEM', 'EFA', 'IVV', 'IJH', 'IJR', 'VGK', 'VPL', 'VNQ'
  ];
  if (commonETFSymbols.includes(normalizedTicker)) {
    return 'etf';
  }

  // Default to unknown - will need database lookup or manual classification
  return 'unknown';
}

/**
 * Detect asset type by looking up ticker using Yahoo Finance API
 * Uses three-tier strategy:
 * 1. Database cache (fastest, no API calls)
 * 2. Yahoo Finance API (accurate, real-time)
 * 3. Pattern matching (fallback)
 */
export async function detectAssetType(ticker: string): Promise<{
  assetType: AssetType;
  category: TransactionCategory | null;
  source: 'yahoo' | 'database' | 'pattern' | 'unknown';
  name?: string;
  sector?: string;
  industry?: string;
  exchange?: string;
}> {
  if (!ticker || ticker.trim() === '') {
    return { assetType: 'unknown', category: null, source: 'unknown' };
  }

  const normalizedTicker = ticker.toUpperCase().trim();

  try {
    // Step 1: Check database cache using cache validation function
    const { data: cacheCheckData } = await supabase
      .rpc('is_ticker_cache_valid', {
        p_symbol: normalizedTicker,
        p_max_age_minutes: 60, // 1 hour cache
      });

    // If cache is valid, get cached data
    if (cacheCheckData) {
      const { data: cachedData } = await supabase
        .from('ticker_directory')
        .select('asset_type, name, sector, industry, exchange, yahoo_data')
        .eq('symbol', normalizedTicker)
        .maybeSingle();

      if (cachedData && cachedData.asset_type && cachedData.asset_type !== 'unknown') {
        const assetType = cachedData.asset_type as AssetType;
        console.log(`[TickerDetection] Cache hit for ${normalizedTicker}`);
        return {
          assetType,
          category: assetTypeToCategory[assetType],
          source: 'database',
          name: cachedData.name,
          sector: cachedData.sector,
          industry: cachedData.industry,
          exchange: cachedData.exchange,
        };
      }
    }

    // Step 2: Cache miss or expired - query Yahoo Finance API
    console.log(`[TickerDetection] Cache miss for ${normalizedTicker}, fetching from Yahoo Finance`);
    const yahooResult = await YahooFinanceService.getAssetType(normalizedTicker);

    if (yahooResult.assetType !== 'unknown') {
      // Store in cache using the update function
      await supabase.rpc('update_ticker_cache', {
        p_symbol: normalizedTicker,
        p_yahoo_data: {
          source: 'yahoo_finance',
          name: yahooResult.name,
          sector: yahooResult.sector,
          industry: yahooResult.industry,
          exchange: yahooResult.exchange,
          assetType: yahooResult.assetType,
        },
        p_name: yahooResult.name || normalizedTicker,
        p_asset_type: yahooResult.assetType,
        p_sector: yahooResult.sector,
        p_industry: yahooResult.industry,
        p_exchange: yahooResult.exchange,
      });

      console.log(`[TickerDetection] Yahoo Finance success for ${normalizedTicker}: ${yahooResult.assetType}`);

      return {
        assetType: yahooResult.assetType,
        category: assetTypeToCategory[yahooResult.assetType],
        source: 'database',
        name: yahooResult.name,
        sector: yahooResult.sector,
        industry: yahooResult.industry,
        exchange: yahooResult.exchange,
      };
    }

    // Step 3: Yahoo Finance API failed - fall back to pattern matching
    const assetType = detectAssetTypeFromPattern(normalizedTicker);

    // Store pattern-detected type if not unknown
    if (assetType !== 'unknown') {
      await supabase
        .from('ticker_directory')
        .upsert({
          symbol: normalizedTicker,
          name: normalizedTicker,
          asset_type: assetType,
          is_active: true,
          data_source: 'manual',
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'symbol',
          ignoreDuplicates: false,
        });
    }

    return {
      assetType,
      category: assetTypeToCategory[assetType],
      source: 'pattern',
    };
  } catch (error) {
    console.error('Error detecting asset type:', error);

    // Fallback to pattern matching on error
    const assetType = detectAssetTypeFromPattern(normalizedTicker);
    return {
      assetType,
      category: assetTypeToCategory[assetType],
      source: 'pattern',
    };
  }
}

/**
 * Get friendly name for asset type
 */
export function getAssetTypeName(assetType: AssetType): string {
  const names: Record<AssetType, string> = {
    stock: 'Stock',
    etf: 'ETF',
    crypto: 'Cryptocurrency',
    option: 'Option',
    bond: 'Bond',
    mutual_fund: 'Mutual Fund',
    unknown: 'Unknown',
  };
  return names[assetType] || 'Unknown';
}

/**
 * Check if a ticker looks valid (basic validation)
 */
export function isValidTickerFormat(ticker: string): boolean {
  if (!ticker || ticker.trim() === '') {
    return false;
  }

  const normalized = ticker.toUpperCase().trim();

  // Basic rules:
  // - 1-10 characters
  // - Letters, numbers, hyphens, dots allowed
  // - Must start with a letter
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(normalized);
}
