import { PortfolioSnapshot as DatabasePortfolioSnapshot } from '../database';

export interface PortfolioSnapshot extends DatabasePortfolioSnapshot {
  asset_class_breakdown: Record<string, number>;
}

export interface PortfolioSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  daily_change: number;
  daily_change_percentage: number;
  total_return: number;
  total_return_percentage: number;
  asset_class_breakdown: Record<
    string,
    {
      value: number;
      percentage: number;
      daily_change: number;
      daily_change_percentage: number;
    }
  >;
}

export interface PortfolioPerformance {
  period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
  total_return: number;
  total_return_percentage: number;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  best_month: number;
  worst_month: number;
}
