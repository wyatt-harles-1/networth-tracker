/*
  # Enable Realtime on Tables

  1. Changes
    - Enable realtime replication on accounts table
    - Enable realtime replication on holdings table
    - Enable realtime replication on transactions table
    
  2. Purpose
    - Allows frontend to receive live updates when data changes
    - Updates Portfolio, Dashboard, and Accounts pages automatically
    - No page refresh needed after adding/updating transactions
*/

-- Enable realtime on accounts table
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;

-- Enable realtime on holdings table
ALTER PUBLICATION supabase_realtime ADD TABLE holdings;

-- Enable realtime on transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
