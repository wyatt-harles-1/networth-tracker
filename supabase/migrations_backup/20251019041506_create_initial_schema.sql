/*
  # Initial Database Schema for Wealth Management Application

  ## Overview
  This migration creates the complete database schema for a personal wealth management
  and portfolio tracking application.

  ## 1. New Tables

  ### `profiles`
  - User profile information linked to auth.users
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `currency` (text, default 'USD')
  - `timezone` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `asset_classes`
  - Custom asset class definitions
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `name` (text, e.g., "Brokerage Accounts", "Cryptocurrency")
  - `color` (text, hex color code)
  - `is_visible` (boolean, for charts)
  - `display_order` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `accounts`
  - User's financial accounts (assets and liabilities)
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `name` (text, e.g., "Chase Checking", "Home Mortgage")
  - `account_type` (text, 'asset' or 'liability')
  - `category` (text, e.g., "Cash & Bank Accounts", "Credit Cards")
  - `asset_class_id` (uuid, foreign key, nullable)
  - `current_balance` (numeric)
  - `icon` (text)
  - `is_visible` (boolean)
  - `institution` (text, nullable)
  - `account_number_last4` (text, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `holdings`
  - Investment positions within accounts
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `account_id` (uuid, foreign key)
  - `symbol` (text, e.g., "AAPL", "BTC")
  - `name` (text, e.g., "Apple Inc.", "Bitcoin")
  - `quantity` (numeric)
  - `cost_basis` (numeric, total cost)
  - `current_price` (numeric)
  - `current_value` (numeric)
  - `asset_type` (text, e.g., "stock", "crypto", "etf")
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `transactions`
  - Financial transactions and activities
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `account_id` (uuid, foreign key, nullable)
  - `transaction_date` (date)
  - `description` (text)
  - `amount` (numeric)
  - `transaction_type` (text, e.g., "income", "expense", "dividend", "transfer")
  - `category` (text, nullable)
  - `created_at` (timestamptz)

  ### `portfolio_snapshots`
  - Historical portfolio value tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `snapshot_date` (date)
  - `total_assets` (numeric)
  - `total_liabilities` (numeric)
  - `net_worth` (numeric)
  - `asset_class_breakdown` (jsonb, stores values per asset class)
  - `created_at` (timestamptz)

  ### `dividends`
  - Upcoming and historical dividend payments
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `holding_id` (uuid, foreign key)
  - `symbol` (text)
  - `ex_date` (date)
  - `pay_date` (date)
  - `amount` (numeric)
  - `status` (text, 'upcoming', 'paid')
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own data
  - Users can only access their own records

  ## 3. Important Notes
  - All monetary values stored as numeric for precision
  - Timestamps use timestamptz for timezone awareness
  - Foreign keys ensure referential integrity
  - Indexes added on frequently queried columns
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  currency text DEFAULT 'USD' NOT NULL,
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create asset_classes table
CREATE TABLE IF NOT EXISTS asset_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE asset_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own asset classes" ON asset_classes;
CREATE POLICY "Users can view own asset classes"
  ON asset_classes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own asset classes" ON asset_classes;
CREATE POLICY "Users can insert own asset classes"
  ON asset_classes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own asset classes" ON asset_classes;
CREATE POLICY "Users can update own asset classes"
  ON asset_classes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own asset classes" ON asset_classes;
CREATE POLICY "Users can delete own asset classes"
  ON asset_classes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS asset_classes_user_id_idx ON asset_classes(user_id);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability')),
  category text NOT NULL,
  asset_class_id uuid REFERENCES asset_classes ON DELETE SET NULL,
  current_balance numeric(15, 2) NOT NULL DEFAULT 0,
  icon text DEFAULT 'Wallet' NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  institution text,
  account_number_last4 text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);
CREATE INDEX IF NOT EXISTS accounts_asset_class_id_idx ON accounts(asset_class_id);

-- Create holdings table
CREATE TABLE IF NOT EXISTS holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  quantity numeric(20, 8) NOT NULL DEFAULT 0,
  cost_basis numeric(15, 2) NOT NULL DEFAULT 0,
  current_price numeric(15, 2) NOT NULL DEFAULT 0,
  current_value numeric(15, 2) NOT NULL DEFAULT 0,
  asset_type text DEFAULT 'stock' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own holdings" ON holdings;
CREATE POLICY "Users can view own holdings"
  ON holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own holdings" ON holdings;
CREATE POLICY "Users can insert own holdings"
  ON holdings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own holdings" ON holdings;
CREATE POLICY "Users can update own holdings"
  ON holdings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own holdings" ON holdings;
CREATE POLICY "Users can delete own holdings"
  ON holdings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS holdings_user_id_idx ON holdings(user_id);
CREATE INDEX IF NOT EXISTS holdings_account_id_idx ON holdings(account_id);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts ON DELETE SET NULL,
  transaction_date date NOT NULL,
  description text NOT NULL,
  amount numeric(15, 2) NOT NULL,
  transaction_type text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions(account_id);

-- Create portfolio_snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL,
  total_assets numeric(15, 2) NOT NULL DEFAULT 0,
  total_liabilities numeric(15, 2) NOT NULL DEFAULT 0,
  net_worth numeric(15, 2) NOT NULL DEFAULT 0,
  asset_class_breakdown jsonb DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can view own snapshots"
  ON portfolio_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can insert own snapshots"
  ON portfolio_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can update own snapshots"
  ON portfolio_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can delete own snapshots"
  ON portfolio_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS snapshots_user_id_idx ON portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS snapshots_date_idx ON portfolio_snapshots(snapshot_date DESC);

-- Create dividends table
CREATE TABLE IF NOT EXISTS dividends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  holding_id uuid REFERENCES holdings ON DELETE CASCADE,
  symbol text NOT NULL,
  ex_date date NOT NULL,
  pay_date date NOT NULL,
  amount numeric(15, 2) NOT NULL,
  status text DEFAULT 'upcoming' NOT NULL CHECK (status IN ('upcoming', 'paid')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dividends" ON dividends;
CREATE POLICY "Users can view own dividends"
  ON dividends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dividends" ON dividends;
CREATE POLICY "Users can insert own dividends"
  ON dividends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dividends" ON dividends;
CREATE POLICY "Users can update own dividends"
  ON dividends FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dividends" ON dividends;
CREATE POLICY "Users can delete own dividends"
  ON dividends FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS dividends_user_id_idx ON dividends(user_id);
CREATE INDEX IF NOT EXISTS dividends_pay_date_idx ON dividends(pay_date);
CREATE INDEX IF NOT EXISTS dividends_status_idx ON dividends(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_classes_updated_at
  BEFORE UPDATE ON asset_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at
  BEFORE UPDATE ON holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();