/**
 * Yahoo Finance Proxy Edge Function
 *
 * Proxies requests to Yahoo Finance API to bypass CORS restrictions.
 * This allows the frontend to fetch stock quotes, historical data, and search results.
 *
 * IMPORTANT: This function allows anonymous access since it's a public API proxy.
 * No sensitive data is exposed, and Yahoo Finance is publicly accessible.
 *
 * Endpoints:
 * - GET /yahoo-finance-proxy?endpoint=/v7/finance/quote&symbols=AAPL
 * - GET /yahoo-finance-proxy?endpoint=/v8/finance/chart/AAPL&period1=123&period2=456&interval=1d
 * - GET /yahoo-finance-proxy?endpoint=/v1/finance/search&q=apple&quotesCount=10
 */

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const YAHOO_FINANCE_BASE_URL = 'https://query2.finance.yahoo.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Global cache for cookies and crumb (reuse across requests)
let cachedCookies: string | null = null;
let cachedCrumb: string | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get Yahoo Finance cookies and crumb token
 * Required for API authentication after recent Yahoo changes
 */
async function getYahooAuthTokens(): Promise<{ cookies: string; crumb: string } | null> {
  try {
    // Check cache first
    if (cachedCookies && cachedCrumb && (Date.now() - cacheTime) < CACHE_TTL) {
      return { cookies: cachedCookies, crumb: cachedCrumb };
    }

    // Fetch Yahoo Finance homepage to get cookies
    const homeResponse = await fetch('https://finance.yahoo.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const cookies = homeResponse.headers.get('set-cookie');
    if (!cookies) {
      console.error('[Yahoo Auth] No cookies received from Yahoo Finance');
      return null;
    }

    // Fetch crumb token
    const crumbResponse = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Cookie': cookies,
      },
    });

    if (!crumbResponse.ok) {
      console.error('[Yahoo Auth] Failed to fetch crumb token');
      return null;
    }

    const crumb = await crumbResponse.text();

    // Cache the tokens
    cachedCookies = cookies;
    cachedCrumb = crumb;
    cacheTime = Date.now();

    console.log('[Yahoo Auth] Successfully obtained auth tokens');
    return { cookies, crumb };
  } catch (error) {
    console.error('[Yahoo Auth] Error getting auth tokens:', error);
    return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build Yahoo Finance URL with all query parameters
    const yahooUrl = new URL(endpoint, YAHOO_FINANCE_BASE_URL);

    // Copy all query parameters except 'endpoint'
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== 'endpoint') {
        yahooUrl.searchParams.append(key, value);
      }
    }

    console.log(`[Yahoo Finance Proxy] Fetching: ${yahooUrl.toString()}`);

    // Get Yahoo auth tokens (cookies + crumb)
    const authTokens = await getYahooAuthTokens();

    // Add crumb parameter if available
    if (authTokens?.crumb) {
      yahooUrl.searchParams.append('crumb', authTokens.crumb);
    }

    // Fetch from Yahoo Finance with comprehensive browser-like headers
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://finance.yahoo.com/',
      'Origin': 'https://finance.yahoo.com',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    // Add cookies if available
    if (authTokens?.cookies) {
      headers['Cookie'] = authTokens.cookies;
    }

    const response = await fetch(yahooUrl.toString(), { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Yahoo Finance Proxy] Error: ${response.status} ${response.statusText}`, errorText);

      return new Response(
        JSON.stringify({
          error: `Yahoo Finance API error: ${response.status} ${response.statusText}`,
          details: errorText.substring(0, 200), // Include first 200 chars of error
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();

    console.log(`[Yahoo Finance Proxy] Success for: ${endpoint}`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('[Yahoo Finance Proxy] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
