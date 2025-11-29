-- Create transaction_history table for versioning
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  transaction_type TEXT NOT NULL,
  transaction_metadata JSONB,
  data_source TEXT DEFAULT 'manual',
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_type TEXT NOT NULL, -- 'insert', 'update', 'delete'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create accounts_history table
CREATE TABLE IF NOT EXISTS accounts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0,
  asset_class TEXT,
  institution TEXT,
  account_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create holdings_history table
CREATE TABLE IF NOT EXISTS holdings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  quantity DECIMAL(15, 6) NOT NULL,
  average_cost DECIMAL(15, 2) NOT NULL,
  current_price DECIMAL(15, 2),
  asset_type TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transaction history" ON transaction_history;
CREATE POLICY "Users can view their own transaction history"
  ON transaction_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own account history" ON accounts_history;
CREATE POLICY "Users can view their own account history"
  ON accounts_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own holdings history" ON holdings_history;
CREATE POLICY "Users can view their own holdings history"
  ON holdings_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_transaction_history_transaction_id ON transaction_history(transaction_id);
CREATE INDEX idx_transaction_history_user_id ON transaction_history(user_id);
CREATE INDEX idx_transaction_history_changed_at ON transaction_history(changed_at);

CREATE INDEX idx_accounts_history_account_id ON accounts_history(account_id);
CREATE INDEX idx_accounts_history_user_id ON accounts_history(user_id);

CREATE INDEX idx_holdings_history_holding_id ON holdings_history(holding_id);
CREATE INDEX idx_holdings_history_user_id ON holdings_history(user_id);

-- Function to get next version number
CREATE OR REPLACE FUNCTION get_next_version_number(table_name TEXT, record_id UUID)
RETURNS INT AS $$
DECLARE
  next_version INT;
BEGIN
  EXECUTE format(
    'SELECT COALESCE(MAX(version_number), 0) + 1 FROM %I WHERE %I = $1',
    table_name,
    CASE
      WHEN table_name = 'transaction_history' THEN 'transaction_id'
      WHEN table_name = 'accounts_history' THEN 'account_id'
      WHEN table_name = 'holdings_history' THEN 'holding_id'
    END
  ) INTO next_version USING record_id;

  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for transactions versioning
CREATE OR REPLACE FUNCTION create_transaction_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO transaction_history (
      transaction_id,
      user_id,
      version_number,
      account_id,
      transaction_date,
      amount,
      description,
      transaction_type,
      transaction_metadata,
      data_source,
      changed_by,
      change_type
    ) VALUES (
      OLD.id,
      OLD.user_id,
      get_next_version_number('transaction_history', OLD.id),
      OLD.account_id,
      OLD.transaction_date,
      OLD.amount,
      OLD.description,
      OLD.transaction_type,
      OLD.transaction_metadata,
      OLD.data_source,
      auth.uid(),
      'delete'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO transaction_history (
      transaction_id,
      user_id,
      version_number,
      account_id,
      transaction_date,
      amount,
      description,
      transaction_type,
      transaction_metadata,
      data_source,
      changed_by,
      change_type
    ) VALUES (
      NEW.id,
      NEW.user_id,
      get_next_version_number('transaction_history', NEW.id),
      NEW.account_id,
      NEW.transaction_date,
      NEW.amount,
      NEW.description,
      NEW.transaction_type,
      NEW.transaction_metadata,
      NEW.data_source,
      auth.uid(),
      'update'
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO transaction_history (
      transaction_id,
      user_id,
      version_number,
      account_id,
      transaction_date,
      amount,
      description,
      transaction_type,
      transaction_metadata,
      data_source,
      changed_by,
      change_type
    ) VALUES (
      NEW.id,
      NEW.user_id,
      1,
      NEW.account_id,
      NEW.transaction_date,
      NEW.amount,
      NEW.description,
      NEW.transaction_type,
      NEW.transaction_metadata,
      NEW.data_source,
      auth.uid(),
      'insert'
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER transaction_versioning_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_version();

-- Trigger function for accounts versioning
CREATE OR REPLACE FUNCTION create_account_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO accounts_history (
      account_id,
      user_id,
      version_number,
      account_name,
      account_type,
      balance,
      asset_class,
      institution,
      account_number,
      is_active,
      changed_by,
      change_type
    ) VALUES (
      OLD.id,
      OLD.user_id,
      get_next_version_number('accounts_history', OLD.id),
      OLD.account_name,
      OLD.account_type,
      OLD.balance,
      OLD.asset_class,
      OLD.institution,
      OLD.account_number,
      OLD.is_active,
      auth.uid(),
      'delete'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO accounts_history (
      account_id,
      user_id,
      version_number,
      account_name,
      account_type,
      balance,
      asset_class,
      institution,
      account_number,
      is_active,
      changed_by,
      change_type
    ) VALUES (
      NEW.id,
      NEW.user_id,
      get_next_version_number('accounts_history', NEW.id),
      NEW.account_name,
      NEW.account_type,
      NEW.balance,
      NEW.asset_class,
      NEW.institution,
      NEW.account_number,
      NEW.is_active,
      auth.uid(),
      'update'
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO accounts_history (
      account_id,
      user_id,
      version_number,
      account_name,
      account_type,
      balance,
      asset_class,
      institution,
      account_number,
      is_active,
      changed_by,
      change_type
    ) VALUES (
      NEW.id,
      NEW.user_id,
      1,
      NEW.account_name,
      NEW.account_type,
      NEW.balance,
      NEW.asset_class,
      NEW.institution,
      NEW.account_number,
      NEW.is_active,
      auth.uid(),
      'insert'
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_versioning_trigger
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION create_account_version();

-- Trigger function for holdings versioning
CREATE OR REPLACE FUNCTION create_holding_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO holdings_history (
      holding_id,
      user_id,
      version_number,
      account_id,
      ticker,
      quantity,
      average_cost,
      current_price,
      asset_type,
      changed_by,
      change_type
    ) VALUES (
      OLD.id,
      OLD.user_id,
      get_next_version_number('holdings_history', OLD.id),
      OLD.account_id,
      OLD.ticker,
      OLD.quantity,
      OLD.average_cost,
      OLD.current_price,
      OLD.asset_type,
      auth.uid(),
      'delete'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO holdings_history (
      holding_id,
      user_id,
      version_number,
      account_id,
      ticker,
      quantity,
      average_cost,
      current_price,
      asset_type,
      changed_by,
      change_type
    ) VALUES (
      NEW.id,
      NEW.user_id,
      get_next_version_number('holdings_history', NEW.id),
      NEW.account_id,
      NEW.ticker,
      NEW.quantity,
      NEW.average_cost,
      NEW.current_price,
      NEW.asset_type,
      auth.uid(),
      'update'
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO holdings_history (
      holding_id,
      user_id,
      version_number,
      account_id,
      ticker,
      quantity,
      average_cost,
      current_price,
      asset_type,
      changed_by,
      change_type
    ) VALUES (
      NEW.id,
      NEW.user_id,
      1,
      NEW.account_id,
      NEW.ticker,
      NEW.quantity,
      NEW.average_cost,
      NEW.current_price,
      NEW.asset_type,
      auth.uid(),
      'insert'
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER holding_versioning_trigger
  AFTER INSERT OR UPDATE OR DELETE ON holdings
  FOR EACH ROW
  EXECUTE FUNCTION create_holding_version();

COMMENT ON TABLE transaction_history IS 'Version history for all transaction changes';
COMMENT ON TABLE accounts_history IS 'Version history for all account changes';
COMMENT ON TABLE holdings_history IS 'Version history for all holding changes';
