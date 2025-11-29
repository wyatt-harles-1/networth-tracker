/*
  # Enable Realtime on Portfolio Snapshots

  1. Changes
    - Enable realtime replication on portfolio_snapshots table
    
  2. Purpose
    - Allows Portfolio page chart to update when snapshots are created
    - Ensures dashboard metrics reflect latest data
*/

-- Enable realtime on portfolio_snapshots table
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_snapshots;
