import {
  ParserResponse,
  ParsedTradeInput,
  BrokerType,
} from '@/types/statementImport';

export interface AIParserConfig {
  provider: 'mock' | 'openai' | 'claude';
  apiKey?: string;
  model?: string;
}

export class AIParserService {
  private config: AIParserConfig;

  constructor(config: AIParserConfig = { provider: 'mock' }) {
    this.config = config;
  }

  async parseStatement(text: string): Promise<ParserResponse> {
    switch (this.config.provider) {
      case 'openai':
        return await this.parseWithOpenAI(text);
      case 'claude':
        return await this.parseWithClaude(text);
      case 'mock':
      default:
        return await this.parseWithMock(text);
    }
  }

  private async parseWithMock(text: string): Promise<ParserResponse> {
    try {
      const broker = this.detectBroker(text);
      const trades = this.extractTradesWithPatterns(text);

      return {
        success: true,
        trades,
        broker_name: broker,
        metadata: {
          statementDate: this.extractStatementDate(text),
        },
      };
    } catch (error) {
      return {
        success: false,
        trades: [],
        error: error instanceof Error ? error.message : 'Parsing failed',
      };
    }
  }

  private detectBroker(text: string): string {
    const brokerPatterns: Record<BrokerType, RegExp[]> = {
      [BrokerType.FIDELITY]: [/fidelity/i, /fidelity investments/i],
      [BrokerType.ROBINHOOD]: [/robinhood/i, /robinhood markets/i],
      [BrokerType.ETRADE]: [/e\*trade/i, /etrade/i, /morgan stanley/i],
      [BrokerType.CHARLES_SCHWAB]: [/charles schwab/i, /schwab/i],
      [BrokerType.TD_AMERITRADE]: [/td ameritrade/i, /ameritrade/i],
      [BrokerType.VANGUARD]: [/vanguard/i, /the vanguard group/i],
      [BrokerType.INTERACTIVE_BROKERS]: [/interactive brokers/i, /ibkr/i],
      [BrokerType.WEBULL]: [/webull/i],
      [BrokerType.UNKNOWN]: [],
    };

    for (const [broker, patterns] of Object.entries(brokerPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return broker;
        }
      }
    }

    return BrokerType.UNKNOWN;
  }

  private extractTradesWithPatterns(text: string): ParsedTradeInput[] {
    const trades: ParsedTradeInput[] = [];
    const lines = text.split('\n');

    const buyPatterns = [
      /(?:bought|buy|purchased)\s+(\d+(?:\.\d+)?)\s+(?:shares?\s+of\s+)?([A-Z]{1,5})\s+(?:at|@|for)\s+\$?(\d+(?:\.\d+)?)/i,
      /([A-Z]{1,5})\s+buy\s+(\d+(?:\.\d+)?)\s+\$?(\d+(?:\.\d+)?)/i,
      /([A-Z]{1,5})\s+(\d+(?:\.\d+)?)\s+\$(\d+(?:\.\d+)?)\s+(?:buy|bought|purchase)/i,
    ];

    const sellPatterns = [
      /(?:sold|sell)\s+(\d+(?:\.\d+)?)\s+(?:shares?\s+of\s+)?([A-Z]{1,5})\s+(?:at|@|for)\s+\$?(\d+(?:\.\d+)?)/i,
      /([A-Z]{1,5})\s+sell\s+(\d+(?:\.\d+)?)\s+\$?(\d+(?:\.\d+)?)/i,
      /([A-Z]{1,5})\s+(\d+(?:\.\d+)?)\s+\$(\d+(?:\.\d+)?)\s+(?:sell|sold)/i,
    ];

    const dividendPatterns = [
      /dividend\s+(?:payment\s+)?(?:for\s+)?([A-Z]{1,5})\s+\$?(\d+(?:\.\d+)?)/i,
      /([A-Z]{1,5})\s+dividend\s+\$?(\d+(?:\.\d+)?)/i,
      /([A-Z]{1,5})\s+\$?(\d+(?:\.\d+)?)\s+dividend/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const date = this.extractDate(line);

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
            trade_date: date || new Date().toISOString().split('T')[0],
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
            amount,
            trade_date: date || new Date().toISOString().split('T')[0],
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
            trade_date: date || new Date().toISOString().split('T')[0],
            confidence_score: 0.75,
            raw_text_snippet: line,
          });
          break;
        }
      }
    }

    return trades;
  }

  private extractDate(text: string): string | null {
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes('Jan|Feb')) {
          const monthMap: Record<string, string> = {
            jan: '01',
            feb: '02',
            mar: '03',
            apr: '04',
            may: '05',
            jun: '06',
            jul: '07',
            aug: '08',
            sep: '09',
            oct: '10',
            nov: '11',
            dec: '12',
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

  private extractStatementDate(text: string): string | undefined {
    const datePattern =
      /statement\s+(?:date|period|for)[\s:]+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i;
    const match = text.match(datePattern);
    return match ? match[1] : undefined;
  }

  private async parseWithOpenAI(text: string): Promise<ParserResponse> {
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model || 'gpt-4',
            messages: [
              {
                role: 'system',
                content: this.getSystemPrompt(),
              },
              {
                role: 'user',
                content: `Parse the following brokerage statement and extract all trades:\n\n${text}`,
              },
            ],
            temperature: 0.1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        success: true,
        trades: parsed.trades,
        broker_name: parsed.broker_name,
        metadata: parsed.metadata,
      };
    } catch (error) {
      console.error('OpenAI parsing error:', error);
      return {
        success: false,
        trades: [],
        error: error instanceof Error ? error.message : 'OpenAI parsing failed',
      };
    }
  }

  private async parseWithClaude(text: string): Promise<ParserResponse> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `${this.getSystemPrompt()}\n\nParse the following brokerage statement and extract all trades:\n\n${text}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      const parsed = JSON.parse(content);

      return {
        success: true,
        trades: parsed.trades,
        broker_name: parsed.broker_name,
        metadata: parsed.metadata,
      };
    } catch (error) {
      console.error('Claude parsing error:', error);
      return {
        success: false,
        trades: [],
        error: error instanceof Error ? error.message : 'Claude parsing failed',
      };
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert at parsing brokerage statements and extracting trade data.
Extract all trades from the statement and return them in the following JSON format:

{
  "broker_name": "Name of the brokerage",
  "trades": [
    {
      "symbol": "Stock ticker symbol",
      "action": "BUY, SELL, DIVIDEND, etc.",
      "shares": number or null,
      "price": number or null,
      "amount": total dollar amount,
      "trade_date": "YYYY-MM-DD",
      "account_name": "Account name if available",
      "confidence_score": 0.0 to 1.0,
      "raw_text_snippet": "Original text from statement"
    }
  ],
  "metadata": {
    "statementDate": "Statement date if available"
  }
}

Be precise with numbers and dates. If a field is not available, use null.
Calculate confidence_score based on how clearly the trade information is presented.`;
  }
}

export const aiParser = new AIParserService({ provider: 'mock' });
