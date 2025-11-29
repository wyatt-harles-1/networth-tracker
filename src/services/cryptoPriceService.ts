import { supabase } from '@/lib/supabase';

export interface CryptoPriceData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
}

export interface CryptoHistoricalPrice {
  date: string;
  price: number;
}

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
  MATIC: 'polygon',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  XLM: 'stellar',
  ALGO: 'algorand',
  VET: 'vechain',
  FTM: 'fantom',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  INJ: 'injective-protocol',
  SUI: 'sui',
  TIA: 'celestia',
  SEI: 'sei-network',
};

const KNOWN_CRYPTO_SYMBOLS = new Set(Object.keys(CRYPTO_SYMBOL_MAP));

export class CryptoPriceService {
  static isCryptocurrency(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    return KNOWN_CRYPTO_SYMBOLS.has(upperSymbol);
  }

  static getCoinGeckoId(symbol: string): string | null {
    const upperSymbol = symbol.toUpperCase();
    return CRYPTO_SYMBOL_MAP[upperSymbol] || null;
  }

  static async getCurrentPrice(
    symbol: string
  ): Promise<{ data: CryptoPriceData | null; error: string | null }> {
    try {
      const coinGeckoId = this.getCoinGeckoId(symbol);

      if (!coinGeckoId) {
        throw new Error(`Unsupported cryptocurrency: ${symbol}`);
      }

      const url = `${COINGECKO_BASE_URL}/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `CoinGecko API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data[coinGeckoId]) {
        const storedPrice = await this.getLatestStoredPrice(symbol);
        if (storedPrice.data) {
          return storedPrice;
        }
        throw new Error(`No price data available for ${symbol}`);
      }

      const coinData = data[coinGeckoId];
      const priceData: CryptoPriceData = {
        symbol: symbol.toUpperCase(),
        price: coinData.usd,
        priceChange24h: coinData.usd_24h_change || 0,
        priceChangePercentage24h: coinData.usd_24h_change || 0,
        marketCap: coinData.usd_market_cap || 0,
        volume24h: coinData.usd_24h_vol || 0,
        lastUpdated: new Date(coinData.last_updated_at * 1000).toISOString(),
      };

      await this.storePriceInHistory(
        symbol,
        new Date().toISOString().split('T')[0],
        priceData.price,
        priceData.price,
        priceData.price,
        priceData.price,
        Math.round(priceData.volume24h),
        'coingecko'
      );

      return { data: priceData, error: null };
    } catch (err) {
      console.error(`Error fetching crypto price for ${symbol}:`, err);
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch cryptocurrency price',
      };
    }
  }

  static async getHistoricalPrices(
    symbol: string,
    days: number = 30
  ): Promise<{ data: CryptoHistoricalPrice[] | null; error: string | null }> {
    try {
      const coinGeckoId = this.getCoinGeckoId(symbol);

      if (!coinGeckoId) {
        throw new Error(`Unsupported cryptocurrency: ${symbol}`);
      }

      const url = `${COINGECKO_BASE_URL}/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `CoinGecko API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.prices || !Array.isArray(data.prices)) {
        throw new Error(`No historical data available for ${symbol}`);
      }

      const historicalPrices: CryptoHistoricalPrice[] = data.prices.map(
        ([timestamp, price]: [number, number]) => ({
          date: new Date(timestamp).toISOString().split('T')[0],
          price,
        })
      );

      for (const priceData of historicalPrices) {
        await this.storePriceInHistory(
          symbol,
          priceData.date,
          priceData.price,
          priceData.price,
          priceData.price,
          priceData.price,
          null,
          'coingecko'
        );
      }

      return { data: historicalPrices, error: null };
    } catch (err) {
      console.error(
        `Error fetching historical crypto prices for ${symbol}:`,
        err
      );
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch historical cryptocurrency prices',
      };
    }
  }

  private static async storePriceInHistory(
    symbol: string,
    date: string,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number | null,
    source: string
  ): Promise<void> {
    try {
      await supabase.from('price_history').upsert(
        {
          symbol: symbol.toUpperCase(),
          price_date: date,
          open_price: open,
          high_price: high,
          low_price: low,
          close_price: close,
          volume,
          data_source: source,
        },
        { onConflict: 'symbol,price_date' }
      );
    } catch (err) {
      console.error('Failed to store crypto price in history:', err);
    }
  }

  static async getLatestStoredPrice(
    symbol: string
  ): Promise<{ data: CryptoPriceData | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .order('price_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { data: null, error: 'No stored price found' };
      }

      return {
        data: {
          symbol: data.symbol,
          price: Number(data.close_price),
          priceChange24h: 0,
          priceChangePercentage24h: 0,
          marketCap: 0,
          volume24h: Number(data.volume || 0),
          lastUpdated: data.price_date,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch stored crypto price',
      };
    }
  }

  static async updateCryptoHoldings(
    userId: string,
    symbols?: string[]
  ): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let updated = 0;

    try {
      let query = supabase.from('holdings').select('*').eq('user_id', userId);

      if (symbols && symbols.length > 0) {
        query = query.in(
          'symbol',
          symbols.map(s => s.toUpperCase())
        );
      }

      const { data: holdings, error } = await query;

      if (error) throw error;
      if (!holdings || holdings.length === 0) {
        return { success: true, updated: 0, errors: [] };
      }

      const cryptoHoldings = holdings.filter(h =>
        this.isCryptocurrency(h.symbol)
      );

      for (const holding of cryptoHoldings) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const priceResult = await this.getCurrentPrice(holding.symbol);

        if (priceResult.error) {
          errors.push(`${holding.symbol}: ${priceResult.error}`);
          continue;
        }

        if (priceResult.data) {
          const newCurrentValue =
            Number(holding.quantity) * priceResult.data.price;

          const { error: updateError } = await supabase
            .from('holdings')
            .update({
              current_price: priceResult.data.price,
              current_value: newCurrentValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', holding.id);

          if (updateError) {
            errors.push(`${holding.symbol}: Failed to update holding`);
          } else {
            updated++;
          }
        }
      }

      return { success: true, updated, errors };
    } catch (err) {
      return {
        success: false,
        updated,
        errors: [
          err instanceof Error ? err.message : 'Failed to update crypto prices',
        ],
      };
    }
  }
}
