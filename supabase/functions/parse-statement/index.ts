import { createClient } from 'npm:@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ParseStatementRequest {
  importId: string;
}

interface ParsedTradeInput {
  symbol: string;
  action: string;
  shares?: number;
  price?: number;
  amount: number;
  trade_date: string;
  account_name?: string;
  confidence_score?: number;
  raw_text_snippet?: string;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { importId }: ParseStatementRequest = await req.json();

    if (!importId) {
      throw new Error('importId is required');
    }

    const { data: importRecord, error: fetchError } = await supabase
      .from('statement_imports')
      .select('*')
      .eq('id', importId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !importRecord) {
      throw new Error('Import record not found');
    }

    await supabase
      .from('statement_imports')
      .update({ status: 'processing' })
      .eq('id', importId);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statement-uploads')
      .download(importRecord.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download file');
    }

    const text = await extractText(fileData, importRecord.file_type);

    const parserResult = await parseStatementText(text);

    if (!parserResult.success) {
      await supabase
        .from('statement_imports')
        .update({
          status: 'failed',
          error_message: parserResult.error || 'Parsing failed',
        })
        .eq('id', importId);

      throw new Error(parserResult.error || 'Parsing failed');
    }

    const validationResult = await validateTrades(parserResult.trades, user.id, supabase);

    const parsedTrades = validationResult.trades.map((trade) => ({
      import_id: importId,
      user_id: user.id,
      symbol: trade.symbol,
      action: trade.action,
      shares: trade.shares || null,
      price: trade.price || null,
      amount: trade.amount,
      trade_date: trade.trade_date,
      account_name: trade.account_name || null,
      confidence_score: trade.confidence_score || 0.5,
      validation_status: trade.validation_status,
      validation_errors: trade.validation_errors,
      raw_text_snippet: trade.raw_text_snippet || null,
      is_selected: true,
    }));

    const { error: insertError } = await supabase
      .from('parsed_trades')
      .insert(parsedTrades);

    if (insertError) {
      throw new Error('Failed to save parsed trades');
    }

    await supabase
      .from('statement_imports')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        broker_name: parserResult.broker_name || null,
        trade_count: parsedTrades.length,
        validation_summary: validationResult.summary,
      })
      .eq('id', importId);

    await supabase.storage.from('statement-uploads').remove([importRecord.file_path]);

    return new Response(
      JSON.stringify({
        success: true,
        importId,
        tradeCount: parsedTrades.length,
        validationSummary: validationResult.summary,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Parse statement error:', error);
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

async function extractText(blob: Blob, fileType: string): Promise<string> {
  const text = await blob.text();
  return text;
}

async function parseStatementText(text: string): Promise<any> {
  try {
    const broker = detectBroker(text);
    const trades = extractTradesWithPatterns(text);

    return {
      success: true,
      trades,
      broker_name: broker,
    };
  } catch (error) {
    return {
      success: false,
      trades: [],
      error: error instanceof Error ? error.message : 'Parsing failed',
    };
  }
}

function detectBroker(text: string): string {
  if (/fidelity/i.test(text)) return 'Fidelity';
  if (/robinhood/i.test(text)) return 'Robinhood';
  if (/e\*trade/i.test(text)) return 'E*TRADE';
  if (/charles schwab|schwab/i.test(text)) return 'Charles Schwab';
  if (/td ameritrade|ameritrade/i.test(text)) return 'TD Ameritrade';
  if (/vanguard/i.test(text)) return 'Vanguard';
  return 'Unknown';
}

function extractTradesWithPatterns(text: string): ParsedTradeInput[] {
  const trades: ParsedTradeInput[] = [];
  const lines = text.split('\n');

  const buyPatterns = [
    /(?:bought|buy|purchased)\s+(\d+(?:\.\d+)?)\s+(?:shares?\s+of\s+)?([A-Z]{1,5})\s+(?:at|@|for)\s+\$?(\d+(?:\.\d+)?)/i,
    /([A-Z]{1,5})\s+buy\s+(\d+(?:\.\d+)?)\s+\$?(\d+(?:\.\d+)?)/i,
  ];

  const sellPatterns = [
    /(?:sold|sell)\s+(\d+(?:\.\d+)?)\s+(?:shares?\s+of\s+)?([A-Z]{1,5})\s+(?:at|@|for)\s+\$?(\d+(?:\.\d+)?)/i,
    /([A-Z]{1,5})\s+sell\s+(\d+(?:\.\d+)?)\s+\$?(\d+(?:\.\d+)?)/i,
  ];

  const dividendPatterns = [
    /dividend\s+(?:payment\s+)?(?:for\s+)?([A-Z]{1,5})\s+\$?(\d+(?:\.\d+)?)/i,
    /([A-Z]{1,5})\s+dividend\s+\$?(\d+(?:\.\d+)?)/i,
  ];

  for (const line of lines) {
    if (!line.trim()) continue;

    const date = extractDate(line) || new Date().toISOString().split('T')[0];

    for (const pattern of buyPatterns) {
      const match = line.match(pattern);
      if (match) {
        const shares = parseFloat(match[1] || match[2]);
        const symbol = (match[2] || match[1]).toUpperCase();
        const price = parseFloat(match[3]);
        const amount = shares * price;

        trades.push({
          symbol,
          action: 'BUY',
          shares,
          price,
          amount,
          trade_date: date,
          confidence_score: 0.8,
          raw_text_snippet: line,
        });
        break;
      }
    }

    for (const pattern of sellPatterns) {
      const match = line.match(pattern);
      if (match) {
        const shares = parseFloat(match[1] || match[2]);
        const symbol = (match[2] || match[1]).toUpperCase();
        const price = parseFloat(match[3]);
        const amount = shares * price;

        trades.push({
          symbol,
          action: 'SELL',
          shares,
          price,
          amount: -amount,
          trade_date: date,
          confidence_score: 0.8,
          raw_text_snippet: line,
        });
        break;
      }
    }

    for (const pattern of dividendPatterns) {
      const match = line.match(pattern);
      if (match) {
        const symbol = match[1].toUpperCase();
        const amount = parseFloat(match[2]);

        trades.push({
          symbol,
          action: 'DIVIDEND',
          amount,
          trade_date: date,
          confidence_score: 0.75,
          raw_text_snippet: line,
        });
        break;
      }
    }
  }

  return trades;
}

function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes('Jan|Feb')) {
        const monthMap: Record<string, string> = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
        };
        const month = monthMap[match[1].toLowerCase().substring(0, 3)];
        const day = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      } else if (match[0].includes('-') && match[1].length === 4) {
        return match[0];
      } else {
        const parts = match[0].split(/[-\/]/);
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      }
    }
  }

  return null;
}

async function validateTrades(trades: ParsedTradeInput[], userId: string, supabase: any): Promise<any> {
  const validatedTrades = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  const symbols = [...new Set(trades.map((t) => t.symbol))];
  const dates = trades.map((t) => t.trade_date);
  const earliestDate = dates.sort()[0];
  const latestDate = dates.sort()[dates.length - 1];

  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('transaction_date, amount, transaction_metadata')
    .eq('user_id', userId)
    .gte('transaction_date', earliestDate)
    .lte('transaction_date', latestDate);

  for (const trade of trades) {
    const errors = [];

    if (!trade.symbol) {
      errors.push({ field: 'symbol', severity: 'error', message: 'Symbol is required' });
    }
    if (!trade.action) {
      errors.push({ field: 'action', severity: 'error', message: 'Action is required' });
    }
    if (!trade.amount && trade.amount !== 0) {
      errors.push({ field: 'amount', severity: 'error', message: 'Amount is required' });
    }

    let isDuplicate = false;
    if (existingTransactions) {
      for (const existing of existingTransactions) {
        if (
          existing.transaction_metadata?.ticker === trade.symbol &&
          existing.transaction_date === trade.trade_date &&
          Math.abs(Math.abs(existing.amount) - Math.abs(trade.amount)) < 0.01
        ) {
          isDuplicate = true;
          errors.push({
            field: 'trade',
            severity: 'warning',
            message: 'Potential duplicate transaction detected',
          });
          break;
        }
      }
    }

    const hasErrors = errors.some((e) => e.severity === 'error');
    const hasWarnings = errors.some((e) => e.severity === 'warning');

    let status;
    if (hasErrors) {
      status = 'error';
      errorCount++;
    } else if (hasWarnings) {
      status = 'warning';
      warningCount++;
    } else {
      status = 'valid';
      validCount++;
    }

    validatedTrades.push({
      ...trade,
      validation_status: status,
      validation_errors: errors,
    });
  }

  return {
    trades: validatedTrades,
    summary: {
      totalTrades: trades.length,
      validCount,
      warningCount,
      errorCount,
      duplicateCount: 0,
      issues: [],
    },
  };
}
