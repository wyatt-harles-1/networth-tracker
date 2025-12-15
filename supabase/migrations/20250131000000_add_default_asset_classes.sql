/*
  # Add Default Asset Classes

  Creates default asset classes for all existing users who don't have any yet.

  Default Asset Classes:
  - Stocks (Blue)
  - Bonds (Green)
  - Cash (Gray)
  - Real Estate (Orange)
  - Cryptocurrency (Purple)
  - Commodities (Yellow)
  - Other (Light Gray)
*/

-- Function to create default asset classes for a user
CREATE OR REPLACE FUNCTION create_default_asset_classes(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Only create if user has no asset classes yet
  IF NOT EXISTS (
    SELECT 1 FROM asset_classes WHERE user_id = target_user_id
  ) THEN
    INSERT INTO asset_classes (user_id, name, color, is_visible, display_order)
    VALUES
      (target_user_id, 'Stocks', '#3B82F6', true, 0),        -- Blue
      (target_user_id, 'Bonds', '#10B981', true, 1),         -- Green
      (target_user_id, 'Cash', '#6B7280', true, 2),          -- Gray
      (target_user_id, 'Real Estate', '#F97316', true, 3),   -- Orange
      (target_user_id, 'Cryptocurrency', '#A855F7', true, 4), -- Purple
      (target_user_id, 'Commodities', '#EAB308', true, 5),   -- Yellow
      (target_user_id, 'Other', '#94A3B8', true, 6);         -- Light Gray

    RAISE NOTICE 'Created default asset classes for user %', target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create default asset classes for all existing users
DO $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  users_updated INTEGER := 0;
BEGIN
  FOR user_record IN
    SELECT id FROM auth.users
  LOOP
    total_users := total_users + 1;

    -- Create default asset classes if none exist
    IF NOT EXISTS (
      SELECT 1 FROM asset_classes WHERE user_id = user_record.id
    ) THEN
      PERFORM create_default_asset_classes(user_record.id);
      users_updated := users_updated + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ Processed % users, created defaults for % users', total_users, users_updated;
END $$;

-- Create trigger to automatically add default asset classes for new users
CREATE OR REPLACE FUNCTION create_asset_classes_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_asset_classes(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_default_asset_classes_trigger ON auth.users;
CREATE TRIGGER create_default_asset_classes_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_asset_classes_for_new_user();

COMMENT ON FUNCTION create_default_asset_classes IS 'Creates default asset classes for a user if they have none';
COMMENT ON FUNCTION create_asset_classes_for_new_user IS 'Trigger function to auto-create asset classes for new users';

DO $$
BEGIN
  RAISE NOTICE '✓ Default asset classes migration complete';
  RAISE NOTICE '✓ New users will automatically get default asset classes';
END $$;
