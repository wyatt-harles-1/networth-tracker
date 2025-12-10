import { supabase } from '@/lib/supabase';
import { TransactionMetadataUtils } from '@/lib/transactionMetadataUtils';

export interface AccountMetrics {
  accountBalance: number;
  marketValue: number;
  totalCostBasis: number;
  unitCostBasis: number;
  totalGain: number;
  percentChange: number;
  unrealizedGain: number;
  realizedGain: number;
  holdingsCount: number;
  transactionCount: number;
}

export interface AccountBalanceHistoryPoint {
  snapshot_date: string;
  balance: number;
  holdings_value: number;
  total_cost_basis: number;
  unrealized_gain: number;
  realized_gain: number;
  asset_type_breakdown?: Record<string, number>;
}

export class AccountMetricsService {
  static async getAccountMetrics(
    userId: string,
    accountId: string
  ): Promise<{ data: AccountMetrics | null; error: string | null }> {
    try {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('current_balance, account_type')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (accountError) throw accountError;
      if (!account) throw new Error('Account not found');

      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('quantity, cost_basis, current_price, current_value')
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (holdingsError) throw holdingsError;

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (transactionsError) throw transactionsError;

      const holdingsArray = holdings || [];
      const transactionsArray = transactions || [];

      const marketValue = holdingsArray.reduce(
        (sum, h) => sum + Number(h.current_value),
        0
      );
      const totalCostBasis = holdingsArray.reduce(
        (sum, h) => sum + Number(h.cost_basis),
        0
      );
      const totalQuantity = holdingsArray.reduce(
        (sum, h) => sum + Number(h.quantity),
        0
      );
      const unitCostBasis =
        totalQuantity > 0 ? totalCostBasis / totalQuantity : 0;

      // Calculate realized gains from sell transactions
      let realizedGain = 0;
      for (const txn of transactionsArray) {
        if (
          txn.transaction_type === 'stock_sell' ||
          txn.transaction_type === 'etf_sell' ||
          txn.transaction_type === 'crypto_sell' ||
          txn.transaction_type === 'option_sell' ||
          txn.transaction_type === 'bond_sell'
        ) {
          const metadata = txn.transaction_metadata as any;
          const txnRealizedGain = Number(metadata?.realized_gain || 0);
          realizedGain += txnRealizedGain;
        }
      }

      const unrealizedGain = marketValue - totalCostBasis;
      const totalGain = unrealizedGain + realizedGain;
      const percentChange =
        totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

      const metrics: AccountMetrics = {
        accountBalance: Number(account.current_balance),
        marketValue,
        totalCostBasis,
        unitCostBasis,
        totalGain,
        percentChange,
        unrealizedGain,
        realizedGain,
        holdingsCount: holdingsArray.length,
        transactionCount: transactionsArray.length,
      };

      return { data: metrics, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err.message : 'Failed to calculate metrics',
      };
    }
  }

  static async calculateHistoricalBalanceFromTransactions(
    userId: string,
    accountId: string,
    daysBack: number = 365
  ): Promise<{
    data: AccountBalanceHistoryPoint[] | null;
    error: string | null;
  }> {
    try {
      console.log(`[AccountMetrics] Calculating historical balance for last ${daysBack} days`);

      // Get account info
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('account_type, created_at')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (accountError) throw accountError;
      if (!account) throw new Error('Account not found');

      // Get all transactions sorted by date
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .order('transaction_date', { ascending: true });

      if (txError) throw txError;
      if (!transactions || transactions.length === 0) {
        return { data: [], error: null };
      }

      // Get current holdings to use as fallback prices and asset types
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('symbol, current_price, asset_type')
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (holdingsError) throw holdingsError;

      // Create a fallback price map for current holdings
      const fallbackPriceMap = new Map(
        (holdings || []).map(h => [h.symbol.toUpperCase(), Number(h.current_price)])
      );

      // Create an asset type map for symbols
      const symbolAssetTypeMap = new Map(
        (holdings || []).map(h => [h.symbol.toUpperCase(), h.asset_type])
      );

      // Get all unique symbols from transactions
      const allSymbols = new Set<string>();
      for (const tx of transactions) {
        const meta = TransactionMetadataUtils.getMetadata(tx);
        if (meta.ticker) {
          allSymbols.add(meta.ticker.toUpperCase());
        }
      }

      // Calculate start and end dates for the historical price bulk fetch
      // endDate is set to yesterday so the loop doesn't create a point for today
      // Today's point will be added later with current real-time prices
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Set to yesterday
      endDate.setHours(0, 0, 0, 0);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);

      // Fetch all historical prices for all symbols in the date range
      console.log(`[AccountMetrics] Fetching historical prices for ${allSymbols.size} symbols from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      const historicalPriceCache = await this.fetchHistoricalPricesInBulk(
        Array.from(allSymbols),
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Use daily intervals for all time ranges to provide detailed charts
      // Each day uses the closing price for accurate portfolio valuation
      const intervalHours = 24; // Daily data points

      // Use the already calculated start date (earlier of daysBack or first transaction)
      const firstTxDate = new Date(transactions[0].transaction_date);
      firstTxDate.setHours(0, 0, 0, 0);

      const calculatedStartDate = new Date(startDate);
      const finalStartDate = firstTxDate > calculatedStartDate ? firstTxDate : calculatedStartDate;

      // Group transactions by date for quick lookup
      const txByDate = new Map<string, typeof transactions>();
      for (const tx of transactions) {
        const dateKey = tx.transaction_date.split('T')[0];
        if (!txByDate.has(dateKey)) {
          txByDate.set(dateKey, []);
        }
        txByDate.get(dateKey)!.push(tx);
      }

      // Track holdings and cash balance over time
      const holdingsOverTime = new Map<string, { quantity: number; costBasis: number }>();
      let cashBalance = 0;
      const historyPoints: AccountBalanceHistoryPoint[] = [];

      // Track last known price for each symbol (for forward-filling missing data)
      const lastKnownPrices = new Map<string, number>();

      // Track price lookup statistics for debugging
      let totalPriceLookups = 0;
      let successfulPriceLookups = 0;
      let fallbackPriceUsed = 0;
      let forwardFilledPrices = 0;

      // Generate evenly-spaced calendar dates
      const currentDate = new Date(finalStartDate);
      let transactionIndex = 0;

      while (currentDate <= endDate) {
        // Use full ISO string for precise time-based lookups
        const dateKey = currentDate.toISOString().split('T')[0];
        const timestamp = currentDate.toISOString();

        // Process all transactions up to and including this date
        while (transactionIndex < transactions.length) {
          const txDate = new Date(transactions[transactionIndex].transaction_date);
          txDate.setHours(0, 0, 0, 0);

          if (txDate <= currentDate) {
            cashBalance = this.processTransactionForPortfolio(
              transactions[transactionIndex],
              holdingsOverTime,
              cashBalance
            );
            transactionIndex++;
          } else {
            break;
          }
        }

        // Calculate holdings value for this date using historical prices
        let holdingsValue = 0;
        let totalCostBasis = 0;
        const assetTypeBreakdown: Record<string, number> = {};

        for (const [symbol, holding] of holdingsOverTime.entries()) {
          if (holding.quantity > 0.00001) {
            totalPriceLookups++;

            // Get historical price from cache
            const cacheKey = `${symbol}:${dateKey}`;
            const historicalPrice = historicalPriceCache.get(cacheKey);

            let priceToUse: number;
            if (historicalPrice) {
              // Found historical price - use it and update last known price
              priceToUse = historicalPrice;
              lastKnownPrices.set(symbol, historicalPrice);
              successfulPriceLookups++;
            } else if (lastKnownPrices.has(symbol)) {
              // No price for this date, but we have a last known price - forward fill
              priceToUse = lastKnownPrices.get(symbol)!;
              forwardFilledPrices++;
            } else {
              // No historical price and no last known price - use current price as ultimate fallback
              priceToUse = fallbackPriceMap.get(symbol) || 0;
              lastKnownPrices.set(symbol, priceToUse); // Save for future forward fills
              fallbackPriceUsed++;

              // Log when we have to use current price
              if (totalPriceLookups % 50 === 0) {
                console.warn(`[AccountMetrics] No historical data for ${symbol} before ${dateKey}, using current price: $${priceToUse.toFixed(2)}`);
              }
            }

            const holdingValue = holding.quantity * priceToUse;
            holdingsValue += holdingValue;
            totalCostBasis += holding.costBasis;

            // Track value by asset type
            const assetType = symbolAssetTypeMap.get(symbol) || 'stock';
            assetTypeBreakdown[assetType] = (assetTypeBreakdown[assetType] || 0) + holdingValue;
          }
        }

        // Total portfolio value = holdings + cash
        const totalPortfolioValue = holdingsValue + cashBalance;

        // Only add point if we have value or it's the first/last point
        if (totalPortfolioValue > 0 || historyPoints.length === 0 || currentDate.getTime() === endDate.getTime()) {
          const unrealizedGain = holdingsValue - totalCostBasis;

          historyPoints.push({
            snapshot_date: timestamp,
            balance: totalPortfolioValue,
            holdings_value: holdingsValue,
            total_cost_basis: totalCostBasis,
            unrealized_gain: unrealizedGain,
            realized_gain: 0,
            asset_type_breakdown: assetTypeBreakdown,
          });
        }

        // Move to next interval
        currentDate.setHours(currentDate.getHours() + intervalHours);
      }

      // Update or add a final data point for "right now" using current real-time prices
      // This ensures the chart always shows the most up-to-date value
      const now = new Date();
      let currentHoldingsValue = 0;
      let currentTotalCostBasis = 0;
      const currentAssetTypeBreakdown: Record<string, number> = {};

      for (const [symbol, holding] of holdingsOverTime.entries()) {
        if (holding.quantity > 0.00001) {
          const currentPrice = fallbackPriceMap.get(symbol) || lastKnownPrices.get(symbol) || 0;
          const holdingValue = holding.quantity * currentPrice;
          currentHoldingsValue += holdingValue;
          currentTotalCostBasis += holding.costBasis;

          // Track value by asset type
          const assetType = symbolAssetTypeMap.get(symbol) || 'stock';
          currentAssetTypeBreakdown[assetType] = (currentAssetTypeBreakdown[assetType] || 0) + holdingValue;
        }
      }

      const currentUnrealizedGain = currentHoldingsValue - currentTotalCostBasis;
      const currentTotalValue = currentHoldingsValue + cashBalance;

      // Add today's point with current real-time prices
      // The loop only goes up to yesterday, so we always add a new point for today
      historyPoints.push({
        snapshot_date: now.toISOString(),
        balance: currentTotalValue,
        holdings_value: currentHoldingsValue,
        total_cost_basis: currentTotalCostBasis,
        unrealized_gain: currentUnrealizedGain,
        realized_gain: 0,
        asset_type_breakdown: currentAssetTypeBreakdown,
      });

      console.log(`[AccountMetrics] ✅ Portfolio calculation complete!`);
      console.log(`[AccountMetrics] Generated ${historyPoints.length} daily data points`);
      console.log(`[AccountMetrics] Date range: ${finalStartDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      console.log(`[AccountMetrics] Processed ${transactions.length} transactions`);
      console.log(`[AccountMetrics] Tracked ${allSymbols.size} unique assets`);

      // Price lookup statistics
      console.log(`\n[AccountMetrics] 📊 Price Data Statistics:`);
      console.log(`[AccountMetrics] Total price lookups: ${totalPriceLookups}`);
      console.log(`[AccountMetrics] Historical prices found: ${successfulPriceLookups} (${totalPriceLookups > 0 ? ((successfulPriceLookups/totalPriceLookups)*100).toFixed(1) : 0}%)`);
      console.log(`[AccountMetrics] Forward-filled prices: ${forwardFilledPrices} (${totalPriceLookups > 0 ? ((forwardFilledPrices/totalPriceLookups)*100).toFixed(1) : 0}%)`);
      console.log(`[AccountMetrics] Current price fallback: ${fallbackPriceUsed} (${totalPriceLookups > 0 ? ((fallbackPriceUsed/totalPriceLookups)*100).toFixed(1) : 0}%)`);

      if (fallbackPriceUsed > 0) {
        console.warn(`\n[AccountMetrics] ⚠️ Some assets are missing historical price data!`);
        console.warn(`[AccountMetrics] Using current price for ${fallbackPriceUsed} lookups. This may cause inaccuracies in historical values.`);
        console.warn(`[AccountMetrics] Consider populating the price_history table for more accurate charts.`);
      }

      const coveragePercent = totalPriceLookups > 0 ? ((successfulPriceLookups/totalPriceLookups)*100).toFixed(1) : 0;
      console.log(`\n[AccountMetrics] Overall historical data coverage: ${coveragePercent}%`);

      if (historyPoints.length > 0) {
        const firstPoint = historyPoints[0];
        const lastPoint = historyPoints[historyPoints.length - 1];
        const formatMoney = (val: number) => `$${val.toFixed(2)}`;
        console.log(`[AccountMetrics] Starting value: ${formatMoney(firstPoint.balance)}`);
        console.log(`[AccountMetrics] Current value: ${formatMoney(lastPoint.balance)}`);
        const totalChange = lastPoint.balance - firstPoint.balance;
        const percentChange = firstPoint.balance > 0 ? (totalChange / firstPoint.balance) * 100 : 0;
        console.log(`[AccountMetrics] Total change: ${formatMoney(totalChange)} (${percentChange.toFixed(2)}%)`);
      }

      return { data: historyPoints, error: null };
    } catch (err) {
      console.error('[AccountMetrics] Error calculating historical balance:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Failed to calculate historical balance',
      };
    }
  }

  private static async fetchHistoricalPricesInBulk(
    symbols: string[],
    startDate: string,
    endDate: string
  ): Promise<Map<string, number>> {
    try {
      const priceCache = new Map<string, number>();

      if (symbols.length === 0) return priceCache;

      const { data, error } = await supabase
        .from('price_history')
        .select('symbol, price_date, close_price')
        .in('symbol', symbols.map(s => s.toUpperCase()))
        .gte('price_date', startDate)
        .lte('price_date', endDate)
        .order('price_date', { ascending: true });

      if (error) {
        console.error('[AccountMetrics] Error fetching bulk historical prices:', error);
        return priceCache;
      }

      if (data) {
        for (const row of data) {
          const cacheKey = `${row.symbol}:${row.price_date}`;
          priceCache.set(cacheKey, Number(row.close_price));
        }
        console.log(`[AccountMetrics] Loaded ${priceCache.size} historical price data points`);
      }

      return priceCache;
    } catch (err) {
      console.error('[AccountMetrics] Error fetching bulk historical prices:', err);
      return new Map<string, number>();
    }
  }

  private static async getHistoricalPrice(
    symbol: string,
    date: string
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('close_price')
        .eq('symbol', symbol.toUpperCase())
        .eq('price_date', date)
        .maybeSingle();

      if (error) {
        console.log(`[AccountMetrics] No historical price for ${symbol} on ${date}`);
        return null;
      }

      return data?.close_price ? Number(data.close_price) : null;
    } catch (err) {
      console.error(`[AccountMetrics] Error fetching historical price for ${symbol} on ${date}:`, err);
      return null;
    }
  }

  private static processTransactionForPortfolio(
    tx: any,
    holdingsMap: Map<string, { quantity: number; costBasis: number }>,
    currentCash: number
  ): number {
    const meta = TransactionMetadataUtils.getMetadata(tx);
    const ticker = meta.ticker?.toUpperCase();
    const quantity = meta.quantity || 0;
    const price = meta.price || 0;
    const amount = Number(tx.amount) || 0;

    // Handle cash-only transactions
    switch (tx.transaction_type) {
      case 'deposit':
        return currentCash + amount;

      case 'withdrawal':
        return currentCash - amount;

      case 'fee':
        return currentCash - amount;

      case 'interest':
      case 'stock_dividend':
      case 'etf_dividend':
      case 'bond_coupon':
        return currentCash + amount;
    }

    // Handle transactions that affect holdings
    if (!ticker || quantity === 0) return currentCash;

    if (!holdingsMap.has(ticker)) {
      holdingsMap.set(ticker, { quantity: 0, costBasis: 0 });
    }

    const holding = holdingsMap.get(ticker)!;
    let cashAdjustment = 0;

    // Update holdings and cash based on transaction type
    switch (tx.transaction_type) {
      case 'stock_buy':
      case 'etf_buy':
      case 'crypto_buy':
      case 'option_buy_call':
      case 'option_buy_put':
      case 'bond_purchase':
        holding.quantity += quantity;
        holding.costBasis += quantity * price;
        cashAdjustment = -(quantity * price); // Money out
        break;

      case 'stock_sell':
      case 'etf_sell':
      case 'crypto_sell':
      case 'option_sell_call':
      case 'option_sell_put':
      case 'bond_sell':
        holding.quantity -= quantity;
        // Adjust cost basis proportionally
        if (holding.quantity > 0 && holding.costBasis > 0) {
          const avgCost = holding.costBasis / (holding.quantity + quantity);
          holding.costBasis = holding.quantity * avgCost;
        } else if (holding.quantity <= 0) {
          holding.costBasis = 0;
        }
        cashAdjustment = quantity * price; // Money in
        break;

      case 'stock_split':
        // Stock split doesn't change value, just quantity
        // If you had 10 shares at $100 cost basis, after 2:1 split you have 20 shares at $100 cost basis
        holding.quantity += quantity; // The quantity field represents additional shares from split
        break;
    }

    return currentCash + cashAdjustment;
  }

  static async getAccountBalanceHistory(
    userId: string,
    accountId: string,
    daysBack: number = 365
  ): Promise<{
    data: AccountBalanceHistoryPoint[] | null;
    error: string | null;
  }> {
    // Use the new calculation method instead of querying the table
    return this.calculateHistoricalBalanceFromTransactions(userId, accountId, daysBack);
  }

  static async createSnapshot(
    userId: string,
    accountId: string,
    snapshotDate?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const dateToUse = snapshotDate || new Date().toISOString().split('T')[0];

      const { error } = await supabase.rpc('create_account_snapshot', {
        p_user_id: userId,
        p_account_id: accountId,
        p_snapshot_date: dateToUse,
      });

      if (error) {
        // RPC function doesn't exist, skip silently
        console.log('[AccountMetrics] create_account_snapshot RPC not found, skipping');
        return { success: false, error: 'Snapshot function not available' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.log('[AccountMetrics] Error creating snapshot:', err);
      return {
        success: false,
        error: 'Snapshot function not available',
      };
    }
  }

  static async generateHistoricalSnapshots(
    userId: string,
    accountId: string
  ): Promise<{
    success: boolean;
    snapshotsCreated: number;
    error: string | null;
  }> {
    try {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('created_at')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (accountError) throw accountError;
      if (!account) throw new Error('Account not found');

      const startDate = new Date(account.created_at);
      const today = new Date();
      const dates: string[] = [];

      for (
        let d = new Date(startDate);
        d <= today;
        d.setDate(d.getDate() + 1)
      ) {
        dates.push(d.toISOString().split('T')[0]);
      }

      let successCount = 0;
      for (const date of dates) {
        const result = await this.createSnapshot(userId, accountId, date);
        if (result.success) successCount++;
      }

      return {
        success: true,
        snapshotsCreated: successCount,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        snapshotsCreated: 0,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to generate historical snapshots',
      };
    }
  }

  /**
   * Get portfolio-wide balance history by aggregating all accounts
   * This combines the historical data from all accounts the user owns
   */
  static async getPortfolioBalanceHistory(
    userId: string,
    daysBack: number = 365
  ): Promise<{ data: AccountBalanceHistoryPoint[] | null; error: string | null }> {
    try {
      console.log(`[AccountMetrics] 📊 Fetching portfolio-wide history for user ${userId}`);

      // Get all accounts for the user
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('account_type', 'asset'); // Only include asset accounts

      if (accountsError) throw accountsError;
      if (!accounts || accounts.length === 0) {
        console.log('[AccountMetrics] No accounts found');
        return { data: [], error: null };
      }

      console.log(`[AccountMetrics] Found ${accounts.length} accounts to aggregate`);

      // Fetch history for each account and aggregate by date
      const historyByDate = new Map<string, AccountBalanceHistoryPoint>();

      for (const account of accounts) {
        const historyResult = await this.getAccountBalanceHistory(
          userId,
          account.id,
          daysBack
        );

        if (historyResult.data) {
          historyResult.data.forEach(point => {
            const existing = historyByDate.get(point.snapshot_date);

            if (existing) {
              // Aggregate with existing data for this date
              existing.balance += point.balance;
              existing.holdings_value += point.holdings_value;
              existing.total_cost_basis += point.total_cost_basis;
              existing.unrealized_gain += point.unrealized_gain;
              existing.realized_gain += point.realized_gain;

              // Merge asset_type_breakdown
              if (point.asset_type_breakdown) {
                if (!existing.asset_type_breakdown) {
                  existing.asset_type_breakdown = {};
                }
                for (const [assetType, value] of Object.entries(point.asset_type_breakdown)) {
                  existing.asset_type_breakdown[assetType] =
                    (existing.asset_type_breakdown[assetType] || 0) + value;
                }
              }
            } else {
              // First data point for this date
              historyByDate.set(point.snapshot_date, { ...point });
            }
          });
        }
      }

      // Convert map to array and sort by date
      const portfolioHistory = Array.from(historyByDate.values()).sort(
        (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
      );

      console.log(`[AccountMetrics] ✅ Portfolio history: ${portfolioHistory.length} data points`);

      return { data: portfolioHistory, error: null };
    } catch (err) {
      console.error('[AccountMetrics] ❌ Portfolio history error:', err);
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to fetch portfolio balance history',
      };
    }
  }

  /**
   * Get portfolio-wide metrics by aggregating all accounts
   */
  static async getPortfolioMetrics(
    userId: string
  ): Promise<{ data: AccountMetrics | null; error: string | null }> {
    try {
      console.log(`[AccountMetrics] 📊 Calculating portfolio-wide metrics for user ${userId}`);

      // Get all accounts for the user
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('account_type', 'asset'); // Only include asset accounts

      if (accountsError) throw accountsError;
      if (!accounts || accounts.length === 0) {
        console.log('[AccountMetrics] No accounts found');
        return {
          data: {
            accountBalance: 0,
            marketValue: 0,
            totalCostBasis: 0,
            unitCostBasis: 0,
            totalGain: 0,
            percentChange: 0,
            unrealizedGain: 0,
            realizedGain: 0,
            holdingsCount: 0,
            transactionCount: 0,
          },
          error: null,
        };
      }

      console.log(`[AccountMetrics] Aggregating metrics from ${accounts.length} accounts`);

      // Aggregate metrics from all accounts
      const portfolioMetrics: AccountMetrics = {
        accountBalance: 0,
        marketValue: 0,
        totalCostBasis: 0,
        unitCostBasis: 0,
        totalGain: 0,
        percentChange: 0,
        unrealizedGain: 0,
        realizedGain: 0,
        holdingsCount: 0,
        transactionCount: 0,
      };

      for (const account of accounts) {
        const metricsResult = await this.getAccountMetrics(userId, account.id);

        if (metricsResult.data) {
          const metrics = metricsResult.data;
          portfolioMetrics.accountBalance += metrics.accountBalance;
          portfolioMetrics.marketValue += metrics.marketValue;
          portfolioMetrics.totalCostBasis += metrics.totalCostBasis;
          portfolioMetrics.totalGain += metrics.totalGain;
          portfolioMetrics.unrealizedGain += metrics.unrealizedGain;
          portfolioMetrics.realizedGain += metrics.realizedGain;
          portfolioMetrics.holdingsCount += metrics.holdingsCount;
          portfolioMetrics.transactionCount += metrics.transactionCount;
        }
      }

      // Calculate portfolio-wide percentage change
      portfolioMetrics.percentChange =
        portfolioMetrics.totalCostBasis > 0
          ? (portfolioMetrics.totalGain / portfolioMetrics.totalCostBasis) * 100
          : 0;

      console.log(`[AccountMetrics] ✅ Portfolio metrics calculated:`, portfolioMetrics);

      return { data: portfolioMetrics, error: null };
    } catch (err) {
      console.error('[AccountMetrics] ❌ Portfolio metrics error:', err);
      return {
        data: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to calculate portfolio metrics',
      };
    }
  }
}
