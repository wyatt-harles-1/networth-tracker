import {
  Holding as DatabaseHolding,
  HoldingInsert as DatabaseHoldingInsert,
  HoldingUpdate as DatabaseHoldingUpdate,
} from '../database';

export interface Holding extends DatabaseHolding {
  account?: {
    name: string;
    account_type: 'asset' | 'liability';
  };
}

export type HoldingInsert = DatabaseHoldingInsert;
export type HoldingUpdate = DatabaseHoldingUpdate;

export interface HoldingWithPerformance extends Holding {
  performance: {
    total_return: number;
    total_return_percentage: number;
    daily_change: number;
    daily_change_percentage: number;
    unrealized_gain_loss: number;
    unrealized_gain_loss_percentage: number;
  };
}
