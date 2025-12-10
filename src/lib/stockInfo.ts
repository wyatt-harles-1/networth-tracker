/**
 * Stock information lookup utility
 * Provides company names and logo URLs for common stocks
 */

interface StockInfo {
  name: string;
  logo?: string;
}

// Common stock symbols with their full company names
const STOCK_INFO_MAP: Record<string, StockInfo> = {
  // Tech Giants (Magnificent 7)
  AAPL: { name: 'Apple Inc.' },
  MSFT: { name: 'Microsoft Corporation' },
  GOOGL: { name: 'Alphabet Inc. (Class A)' },
  GOOG: { name: 'Alphabet Inc. (Class C)' },
  AMZN: { name: 'Amazon.com Inc.' },
  META: { name: 'Meta Platforms Inc.' },
  TSLA: { name: 'Tesla, Inc.' },
  NVDA: { name: 'NVIDIA Corporation' },

  // Major Tech
  NFLX: { name: 'Netflix Inc.' },
  AMD: { name: 'Advanced Micro Devices Inc.' },
  INTC: { name: 'Intel Corporation' },
  MU: { name: 'Micron Technology Inc.' },
  ORCL: { name: 'Oracle Corporation' },
  CRM: { name: 'Salesforce Inc.' },
  ADBE: { name: 'Adobe Inc.' },
  CSCO: { name: 'Cisco Systems Inc.' },
  AVGO: { name: 'Broadcom Inc.' },
  QCOM: { name: 'Qualcomm Incorporated' },
  TXN: { name: 'Texas Instruments Incorporated' },
  IBM: { name: 'International Business Machines Corporation' },
  NOW: { name: 'ServiceNow Inc.' },
  PANW: { name: 'Palo Alto Networks Inc.' },
  SNOW: { name: 'Snowflake Inc.' },
  PLTR: { name: 'Palantir Technologies Inc.' },
  UBER: { name: 'Uber Technologies Inc.' },
  LYFT: { name: 'Lyft Inc.' },
  ABNB: { name: 'Airbnb Inc.' },
  SPOT: { name: 'Spotify Technology S.A.' },
  SQ: { name: 'Block Inc.' },
  PYPL: { name: 'PayPal Holdings Inc.' },
  SHOP: { name: 'Shopify Inc.' },
  COIN: { name: 'Coinbase Global Inc.' },
  RBLX: { name: 'Roblox Corporation' },
  U: { name: 'Unity Software Inc.' },
  DDOG: { name: 'Datadog Inc.' },
  ZM: { name: 'Zoom Video Communications Inc.' },
  TWLO: { name: 'Twilio Inc.' },
  NET: { name: 'Cloudflare Inc.' },
  CRWD: { name: 'CrowdStrike Holdings Inc.' },
  HOOD: { name: 'Robinhood Markets Inc.' },

  // Finance
  JPM: { name: 'JPMorgan Chase & Co.' },
  BAC: { name: 'Bank of America Corporation' },
  WFC: { name: 'Wells Fargo & Company' },
  GS: { name: 'Goldman Sachs Group Inc.' },
  MS: { name: 'Morgan Stanley' },
  BLK: { name: 'BlackRock Inc.' },
  C: { name: 'Citigroup Inc.' },
  SCHW: { name: 'Charles Schwab Corporation' },
  AXP: { name: 'American Express Company' },
  V: { name: 'Visa Inc.' },
  MA: { name: 'Mastercard Incorporated' },
  COF: { name: 'Capital One Financial Corporation' },
  UWMC: { name: 'UWM Holdings Corporation' },

  // Retail & Consumer
  WMT: { name: 'Walmart Inc.' },
  AMGN: { name: 'Amgen Inc.' },
  HD: { name: 'The Home Depot Inc.' },
  LOW: { name: "Lowe's Companies Inc." },
  NKE: { name: 'Nike Inc.' },
  MCD: { name: "McDonald's Corporation" },
  SBUX: { name: 'Starbucks Corporation' },
  TGT: { name: 'Target Corporation' },
  COST: { name: 'Costco Wholesale Corporation' },
  KO: { name: 'The Coca-Cola Company' },
  PEP: { name: 'PepsiCo Inc.' },
  PG: { name: 'The Procter & Gamble Company' },
  CL: { name: 'Colgate-Palmolive Company' },

  // Healthcare & Pharma
  JNJ: { name: 'Johnson & Johnson' },
  UNH: { name: 'UnitedHealth Group Incorporated' },
  LLY: { name: 'Eli Lilly and Company' },
  PFE: { name: 'Pfizer Inc.' },
  ABBV: { name: 'AbbVie Inc.' },
  TMO: { name: 'Thermo Fisher Scientific Inc.' },
  ABT: { name: 'Abbott Laboratories' },
  DHR: { name: 'Danaher Corporation' },
  BMY: { name: 'Bristol-Myers Squibb Company' },
  MRK: { name: 'Merck & Co. Inc.' },
  CVS: { name: 'CVS Health Corporation' },

  // Energy
  XOM: { name: 'Exxon Mobil Corporation' },
  CVX: { name: 'Chevron Corporation' },
  COP: { name: 'ConocoPhillips' },
  SLB: { name: 'Schlumberger Limited' },
  EOG: { name: 'EOG Resources Inc.' },

  // Popular ETFs
  SPY: { name: 'SPDR S&P 500 ETF Trust' },
  QQQ: { name: 'Invesco QQQ Trust' },
  VOO: { name: 'Vanguard S&P 500 ETF' },
  VTI: { name: 'Vanguard Total Stock Market ETF' },
  IVV: { name: 'iShares Core S&P 500 ETF' },
  VEA: { name: 'Vanguard FTSE Developed Markets ETF' },
  VWO: { name: 'Vanguard FTSE Emerging Markets ETF' },
  AGG: { name: 'iShares Core U.S. Aggregate Bond ETF' },
  BND: { name: 'Vanguard Total Bond Market ETF' },
  SCHO: { name: 'Schwab Short-Term U.S. Treasury ETF' },
  VIG: { name: 'Vanguard Dividend Appreciation ETF' },
  SCHD: { name: 'Schwab U.S. Dividend Equity ETF' },
  VYM: { name: 'Vanguard High Dividend Yield ETF' },
  VUG: { name: 'Vanguard Growth ETF' },
  IWM: { name: 'iShares Russell 2000 ETF' },
  EEM: { name: 'iShares MSCI Emerging Markets ETF' },
  GLD: { name: 'SPDR Gold Trust' },
  SLV: { name: 'iShares Silver Trust' },
  VNQ: { name: 'Vanguard Real Estate ETF' },
  XLE: { name: 'Energy Select Sector SPDR Fund' },
  XLF: { name: 'Financial Select Sector SPDR Fund' },
  XLK: { name: 'Technology Select Sector SPDR Fund' },
  XLV: { name: 'Health Care Select Sector SPDR Fund' },
  ARKK: { name: 'ARK Innovation ETF' },

  // Crypto
  BTC: { name: 'Bitcoin' },
  'BTC-USD': { name: 'Bitcoin' },
  ETH: { name: 'Ethereum' },
  'ETH-USD': { name: 'Ethereum' },
  DOGE: { name: 'Dogecoin' },
  'DOGE-USD': { name: 'Dogecoin' },
  DOGEUSD: { name: 'Dogecoin' },
  ADA: { name: 'Cardano' },
  'ADA-USD': { name: 'Cardano' },
  SOL: { name: 'Solana' },
  'SOL-USD': { name: 'Solana' },
  DOT: { name: 'Polkadot' },
  'DOT-USD': { name: 'Polkadot' },
  MATIC: { name: 'Polygon' },
  'MATIC-USD': { name: 'Polygon' },

  // Communication & Media
  DIS: { name: 'The Walt Disney Company' },
  CMCSA: { name: 'Comcast Corporation' },
  T: { name: 'AT&T Inc.' },
  VZ: { name: 'Verizon Communications Inc.' },
  TMUS: { name: 'T-Mobile US Inc.' },

  // Industrial
  BA: { name: 'The Boeing Company' },
  CAT: { name: 'Caterpillar Inc.' },
  GE: { name: 'General Electric Company' },
  HON: { name: 'Honeywell International Inc.' },
  UPS: { name: 'United Parcel Service Inc.' },
  RTX: { name: 'RTX Corporation' },
  LMT: { name: 'Lockheed Martin Corporation' },
  DE: { name: 'Deere & Company' },

  // Auto
  F: { name: 'Ford Motor Company' },
  GM: { name: 'General Motors Company' },
  RIVN: { name: 'Rivian Automotive Inc.' },
  LCID: { name: 'Lucid Group Inc.' },

  // Real Estate
  AMT: { name: 'American Tower Corporation' },
  PLD: { name: 'Prologis Inc.' },
  CCI: { name: 'Crown Castle Inc.' },
  EQIX: { name: 'Equinix Inc.' },

  // Materials
  LIN: { name: 'Linde plc' },
  APD: { name: 'Air Products and Chemicals Inc.' },

  // Utilities
  NEE: { name: 'NextEra Energy Inc.' },
  DUK: { name: 'Duke Energy Corporation' },
  VST: { name: 'Vistra Corp.' },

  // Other
  APLD: { name: 'Applied Digital Corporation' },
  TEM: { name: 'Tempus AI Inc.' },
};

/**
 * Get company info for a symbol
 */
export function getStockInfo(symbol: string): StockInfo | null {
  const upperSymbol = symbol.toUpperCase();
  return STOCK_INFO_MAP[upperSymbol] || null;
}

/**
 * Get logo URL for a symbol using multiple fallback strategies
 */
export function getStockLogoUrl(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();

  // Strategy 1: IEX Cloud logo CDN (most reliable for US stocks)
  return `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${upperSymbol}.png`;
}

/**
 * Get alternative logo URLs to try as fallbacks
 */
export function getStockLogoFallbacks(symbol: string): string[] {
  const upperSymbol = symbol.toUpperCase();
  const lowerSymbol = symbol.toLowerCase();

  return [
    // Primary: IEX Cloud
    `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${upperSymbol}.png`,

    // Fallback 1: Clearbit (works for many companies)
    `https://logo.clearbit.com/${lowerSymbol}.com`,

    // Fallback 2: EOD Historical Data
    `https://eodhistoricaldata.com/img/logos/US/${lowerSymbol}.png`,
  ];
}
