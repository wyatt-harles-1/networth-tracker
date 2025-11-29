import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdateRequest {
  updateType?: 'stocks' | 'crypto' | 'full';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { updateType = 'full' }: UpdateRequest = req.method === 'POST'
      ? await req.json()
      : { updateType: 'full' };

    const { data: job, error: jobError } = await supabase
      .from('ticker_directory_updates')
      .insert({
        update_type: updateType,
        job_status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create update job');
    }

    const errors: string[] = [];
    let added = 0;

    try {
      if (updateType === 'stocks' || updateType === 'full') {
        const stockResult = await updateStocksFromAlphaVantage(supabase);
        added += stockResult.added;
        errors.push(...stockResult.errors);
      }

      if (updateType === 'crypto' || updateType === 'full') {
        const cryptoResult = await updateCryptosFromCoinGecko(supabase);
        added += cryptoResult.added;
        errors.push(...cryptoResult.errors);
      }

      await supabase
        .from('ticker_directory_updates')
        .update({
          job_status: 'completed',
          completed_at: new Date().toISOString(),
          tickers_added: added,
          tickers_updated: 0,
          error_message: errors.length > 0 ? errors.join('; ') : null
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({
          success: true,
          jobId: job.id,
          added,
          errors
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      await supabase
        .from('ticker_directory_updates')
        .update({
          job_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', job.id);

      throw error;
    }
  } catch (error) {
    console.error('Update failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
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

async function updateStocksFromAlphaVantage(supabase: any): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  let added = 0;

  try {
    const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY") || 'demo';

    const response = await fetch(
      `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${apiKey}`
    );

    if (!response.ok) {
      errors.push('Alpha Vantage API returned an error');
      return { added, errors };
    }

    const csvData = await response.text();
    const lines = csvData.split('\n').slice(1);

    const tickers: any[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const [symbol, name, exchange, assetTypeRaw, status] = line.split(',');

      if (!symbol || !name || status !== 'Active') continue;

      let assetType = 'stock';
      if (assetTypeRaw === 'ETF') {
        assetType = 'etf';
      } else if (assetTypeRaw === 'Fund') {
        assetType = 'mutualfund';
      }

      tickers.push({
        symbol: symbol.toUpperCase().trim(),
        name: name.trim(),
        asset_type: assetType,
        exchange: exchange?.trim() || null,
        is_active: true,
        data_source: 'alpha_vantage'
      });

      if (tickers.length >= 100) {
        const { error } = await supabase
          .from('ticker_directory')
          .upsert(tickers, { onConflict: 'symbol' });

        if (error) {
          errors.push(`Failed to insert batch: ${error.message}`);
        } else {
          added += tickers.length;
        }

        tickers.length = 0;
      }
    }

    if (tickers.length > 0) {
      const { error } = await supabase
        .from('ticker_directory')
        .upsert(tickers, { onConflict: 'symbol' });

      if (error) {
        errors.push(`Failed to insert final batch: ${error.message}`);
      } else {
        added += tickers.length;
      }
    }

    return { added, errors };
  } catch (error) {
    console.error('Failed to update stocks:', error);
    return { added, errors: [...errors, 'Failed to update stocks from Alpha Vantage'] };
  }
}

async function updateCryptosFromCoinGecko(supabase: any): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  let added = 0;

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/list');

    if (!response.ok) {
      errors.push('CoinGecko API returned an error');
      return { added, errors };
    }

    const coins = await response.json();

    if (!Array.isArray(coins)) {
      errors.push('Invalid CoinGecko response format');
      return { added, errors };
    }

    const tickers = coins
      .filter((coin: any) => coin.symbol && coin.name)
      .map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        asset_type: 'crypto',
        exchange: null,
        is_active: true,
        data_source: 'coingecko'
      }));

    for (let i = 0; i < tickers.length; i += 100) {
      const batch = tickers.slice(i, i + 100);

      const { error } = await supabase
        .from('ticker_directory')
        .upsert(batch, { onConflict: 'symbol' });

      if (error) {
        errors.push(`Failed to insert crypto batch at index ${i}: ${error.message}`);
      } else {
        added += batch.length;
      }
    }

    return { added, errors };
  } catch (error) {
    console.error('Failed to update cryptos:', error);
    return { added, errors: [...errors, 'Failed to update cryptos from CoinGecko'] };
  }
}
