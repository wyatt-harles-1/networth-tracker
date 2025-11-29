import {
  Account as DatabaseAccount,
  AccountInsert as DatabaseAccountInsert,
  AccountUpdate as DatabaseAccountUpdate,
} from '../database';

export interface Account extends DatabaseAccount {
  asset_classes?: {
    name: string;
    color: string;
  };
}

export type AccountInsert = DatabaseAccountInsert;
export type AccountUpdate = DatabaseAccountUpdate;

export interface AccountWithBalance extends Account {
  balance_history?: Array<{
    date: string;
    balance: number;
  }>;
  performance_metrics?: {
    total_return: number;
    total_return_percentage: number;
    daily_change: number;
    daily_change_percentage: number;
  };
}
