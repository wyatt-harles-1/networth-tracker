import { createClient } from 'npm:@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SnapshotRequest {
  userId?: string;
  date?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, date }: SnapshotRequest = await req.json();
    const snapshotDate = date || new Date().toISOString().split('T')[0];

    // If userId is provided, create snapshot for that user only
    // Otherwise, create for all users (cron job mode)
    let userIds: string[] = [];

    if (userId) {
      userIds = [userId];
    } else {
      // Get all users
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) throw usersError;

      userIds = users.users.map(u => u.id);
    }

    const results = [];

    for (const uid of userIds) {
      try {
        const snapshot = await createSnapshotForUser(supabase, uid, snapshotDate);
        results.push({
          userId: uid,
          success: true,
          snapshot,
        });
      } catch (error) {
        results.push({
          userId: uid,
          success: false,
          error: error instanceof Error ? error.message : 'Snapshot creation failed',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: snapshotDate,
        results,
        totalUsers: userIds.length,
        successCount: results.filter(r => r.success).length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Snapshot creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function createSnapshotForUser(
  supabase: any,
  userId: string,
  date: string
): Promise<any> {
  // Check if snapshot already exists for this date
  const { data: existing, error: checkError } = await supabase
    .from('portfolio_snapshots')
    .select('id')
    .eq('user_id', userId)
    .eq('snapshot_date', date)
    .single();

  if (existing) {
    // Update existing snapshot
    return updateSnapshot(supabase, existing.id, userId, date);
  }

  // Create new snapshot
  return createNewSnapshot(supabase, userId, date);
}

async function createNewSnapshot(
  supabase: any,
  userId: string,
  date: string
): Promise<any> {
  // Get all holdings with current prices
  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);

  if (holdingsError) throw holdingsError;

  // Calculate total value
  let totalValue = 0;
  let totalCostBasis = 0;

  for (const holding of holdings || []) {
    const value = holding.quantity * (holding.current_price || 0);
    const costBasis = holding.quantity * holding.average_cost;

    totalValue += value;
    totalCostBasis += costBasis;
  }

  // Get cash balances from accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('current_balance, account_type')
    .eq('user_id', userId);

  if (accountsError) throw accountsError;

  let totalCash = 0;
  for (const account of accounts || []) {
    // Only count cash/checking/savings accounts
    if (
      account.account_type === 'checking' ||
      account.account_type === 'savings' ||
      account.account_type === 'cash'
    ) {
      totalCash += account.current_balance;
    }
  }

  totalValue += totalCash;

  const totalGain = totalValue - totalCostBasis;
  const totalGainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

  // Create snapshot
  const { data: snapshot, error: insertError } = await supabase
    .from('portfolio_snapshots')
    .insert({
      user_id: userId,
      snapshot_date: date,
      total_value: totalValue,
      total_cost_basis: totalCostBasis,
      total_gain: totalGain,
      total_gain_percent: totalGainPercent,
      cash_balance: totalCash,
      holdings_value: totalValue - totalCash,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Also create portfolio_value_history entry
  await supabase
    .from('portfolio_value_history')
    .insert({
      user_id: userId,
      value_date: date,
      total_value: totalValue,
      cash_value: totalCash,
      holdings_value: totalValue - totalCash,
    });

  return snapshot;
}

async function updateSnapshot(
  supabase: any,
  snapshotId: string,
  userId: string,
  date: string
): Promise<any> {
  // Recalculate values
  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);

  if (holdingsError) throw holdingsError;

  let totalValue = 0;
  let totalCostBasis = 0;

  for (const holding of holdings || []) {
    const value = holding.quantity * (holding.current_price || 0);
    const costBasis = holding.quantity * holding.average_cost;

    totalValue += value;
    totalCostBasis += costBasis;
  }

  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('current_balance, account_type')
    .eq('user_id', userId);

  if (accountsError) throw accountsError;

  let totalCash = 0;
  for (const account of accounts || []) {
    if (
      account.account_type === 'checking' ||
      account.account_type === 'savings' ||
      account.account_type === 'cash'
    ) {
      totalCash += account.current_balance;
    }
  }

  totalValue += totalCash;

  const totalGain = totalValue - totalCostBasis;
  const totalGainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

  // Update snapshot
  const { data: snapshot, error: updateError } = await supabase
    .from('portfolio_snapshots')
    .update({
      total_value: totalValue,
      total_cost_basis: totalCostBasis,
      total_gain: totalGain,
      total_gain_percent: totalGainPercent,
      cash_balance: totalCash,
      holdings_value: totalValue - totalCash,
    })
    .eq('id', snapshotId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Update portfolio_value_history
  await supabase
    .from('portfolio_value_history')
    .upsert({
      user_id: userId,
      value_date: date,
      total_value: totalValue,
      cash_value: totalCash,
      holdings_value: totalValue - totalCash,
    });

  return snapshot;
}
