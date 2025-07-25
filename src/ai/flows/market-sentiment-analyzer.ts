'use server';

/**
 * @fileOverview Market sentiment analysis AI flow for processing news, social sentiment,
 * and on-chain data to enhance trading recommendations with market psychology insights.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const MarketSentimentAnalysisInputSchema = z.object({
  newsData: z
    .array(z.object({
      headline: z.string(),
      content: z.string().optional(),
      source: z.string(),
      timestamp: z.string(),
      impact: z.enum(['high', 'medium', 'low']).optional(),
    }))
    .optional()
    .describe("Recent news articles related to crypto or the specific asset"),
  socialData: z
    .array(z.object({
      platform: z.enum(['twitter', 'reddit', 'telegram', 'discord', 'other']),
      content: z.string(),
      sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
      engagement: z.number().optional(),
      timestamp: z.string(),
    }))
    .optional()
    .describe("Social media posts and sentiment data"),
  onChainData: z
    .object({
      whaleMovements: z.array(z.string()).optional(),
      exchangeFlows: z.string().optional(),
      fundingRates: z.string().optional(),
      openInterest: z.string().optional(),
      liquidations: z.string().optional(),
    })
    .optional()
    .describe("On-chain and derivatives market data"),
  asset: z.string().describe("The cryptocurrency asset being analyzed"),
  timeframe: z.string().default("24h").describe("Analysis timeframe"),
});
export type MarketSentimentAnalysisInput = z.infer<typeof MarketSentimentAnalysisInputSchema>;

const SentimentScoreSchema = z.object({
  overall: z.number().min(-100).max(100).describe("Overall sentiment score from -100 (extremely bearish) to +100 (extremely bullish)"),
  news: z.number().min(-100).max(100).describe("News sentiment component"),
  social: z.number().min(-100).max(100).describe("Social sentiment component"),
  onChain: z.number().min(-100).max(100).describe("On-chain sentiment component"),
  confidence: z.number().min(0).max(100).describe("Confidence in the sentiment assessment"),
});

const MarketPsychologySchema = z.object({
  fearGreedLevel: z.enum(['extreme_fear', 'fear', 'neutral', 'greed', 'extreme_greed']),
  crowdBehavior: z.string().describe("Analysis of crowd behavior patterns"),
  contrarian: z.boolean().describe("Whether current sentiment suggests contrarian opportunity"),
  fomo: z.boolean().describe("Whether FOMO (fear of missing out) is present"),
  capitulation: z.boolean().describe("Whether capitulation signals are present"),
  euphoria: z.boolean().describe("Whether euphoric sentiment is present"),
});

const SentimentCatalystSchema = z.object({
  positive: z.array(z.string()).describe("Positive sentiment drivers"),
  negative: z.array(z.string()).describe("Negative sentiment drivers"),
  upcoming: z.array(z.string()).describe("Upcoming events that could impact sentiment"),
  keyLevels: z.array(z.string()).describe("Price levels that could trigger sentiment shifts"),
});

const TradingImplicationsSchema = z.object({
  sentimentBias: z.enum(['bullish', 'bearish', 'neutral']),
  contrarian: z.boolean().describe("Whether to take contrarian position"),
  timeHorizon: z.string().describe("Recommended trade timeframe based on sentiment"),
  riskAdjustment: z.string().describe("How sentiment should adjust position sizing"),
  entryTiming: z.string().describe("Optimal entry timing based on sentiment cycles"),
  exitStrategy: z.string().describe("Exit strategy modifications based on sentiment"),
});

const MarketSentimentAnalysisOutputSchema = z.object({
  sentimentScore: SentimentScoreSchema,
  marketPsychology: MarketPsychologySchema,
  sentimentCatalysts: SentimentCatalystSchema,
  tradingImplications: TradingImplicationsSchema,
  sentimentTrend: z.string().describe("Trend analysis of sentiment over the timeframe"),
  extremeReadings: z.array(z.string()).describe("Any extreme sentiment readings and their implications"),
  correlationAnalysis: z.string().describe("How sentiment correlates with price action"),
  recommendations: z.array(z.string()).describe("Specific recommendations based on sentiment analysis"),
});
export type MarketSentimentAnalysisOutput = z.infer<typeof MarketSentimentAnalysisOutputSchema>;

export async function marketSentimentAnalysis(input: MarketSentimentAnalysisInput): Promise<MarketSentimentAnalysisOutput> {
  return marketSentimentAnalysisFlow(input);
}

const marketSentimentAnalysisPrompt = ai.definePrompt({
  name: 'marketSentimentAnalysisPrompt',
  input: {schema: MarketSentimentAnalysisInputSchema},
  output: {schema: MarketSentimentAnalysisOutputSchema},
  prompt: `You are an expert market psychology analyst specializing in cryptocurrency sentiment analysis. Your role is to process multiple data sources and translate market sentiment into actionable trading insights.

**Asset:** {{asset}}
**Analysis Timeframe:** {{timeframe}}

## SENTIMENT ANALYSIS FRAMEWORK

### 1. MULTI-SOURCE SENTIMENT PROCESSING

{{#if newsData}}
**News Analysis:**
Process the following news data for sentiment impact:
{{#each newsData}}
- **{{source}}** ({{timestamp}}): {{headline}}
  {{#if content}}Content: {{content}}{{/if}}
  {{#if impact}}Impact Level: {{impact}}{{/if}}
{{/each}}

**News Processing Instructions:**
- Weight news by source credibility and potential market impact
- Identify fundamental vs. speculative narratives
- Assess short-term vs. long-term sentiment implications
- Look for conflicting narratives that create uncertainty
{{/if}}

{{#if socialData}}
**Social Sentiment Analysis:**
Process the following social media data:
{{#each socialData}}
- **{{platform}}** ({{timestamp}}): {{content}}
  {{#if sentiment}}Platform Sentiment: {{sentiment}}{{/if}}
  {{#if engagement}}Engagement: {{engagement}}{{/if}}
{{/each}}

**Social Processing Instructions:**
- Distinguish between informed opinion and retail noise
- Identify influencer impact vs. grassroots sentiment
- Look for sentiment divergences between platforms
- Assess the authenticity and organic nature of sentiment
{{/if}}

{{#if onChainData}}
**On-Chain Data Analysis:**
{{#if onChainData.whaleMovements}}
Whale Movements: {{#each onChainData.whaleMovements}}{{this}}; {{/each}}
{{/if}}
{{#if onChainData.exchangeFlows}}Exchange Flows: {{onChainData.exchangeFlows}}{{/if}}
{{#if onChainData.fundingRates}}Funding Rates: {{onChainData.fundingRates}}{{/if}}
{{#if onChainData.openInterest}}Open Interest: {{onChainData.openInterest}}{{/if}}
{{#if onChainData.liquidations}}Liquidations: {{onChainData.liquidations}}{{/if}}

**On-Chain Processing Instructions:**
- Correlate whale movements with sentiment patterns
- Analyze derivatives data for positioning biases
- Look for accumulation/distribution patterns
- Assess leverage and liquidation risks
{{/if}}

### 2. SENTIMENT SCORING METHODOLOGY

**Scoring Guidelines:**
- **-100 to -70:** Extreme bearish sentiment (potential contrarian opportunity)
- **-70 to -30:** Bearish sentiment (caution, but watch for oversold conditions)
- **-30 to +30:** Neutral sentiment (trend-following appropriate)
- **+30 to +70:** Bullish sentiment (momentum opportunities, but watch for overextension)
- **+70 to +100:** Extreme bullish sentiment (potential contrarian opportunity)

**Component Weighting:**
- News: 40% (fundamental impact)
- Social: 35% (market psychology)
- On-chain: 25% (actual capital flows)

### 3. MARKET PSYCHOLOGY ASSESSMENT

**Fear and Greed Analysis:**
- Identify current position on the fear-greed spectrum
- Look for extreme readings that often mark turning points
- Assess whether sentiment aligns with or diverges from price action

**Crowd Behavior Patterns:**
- Herding behavior indicators
- Contrarian opportunity identification
- FOMO and capitulation signals
- Euphoria and despair markers

**Behavioral Finance Principles:**
- Loss aversion manifestations
- Confirmation bias in news interpretation
- Anchoring effects on price expectations
- Recency bias in sentiment formation

### 4. TRADING IMPLICATIONS FRAMEWORK

**Sentiment-Based Position Sizing:**
- Extreme sentiment = reduced position size
- High confidence + neutral sentiment = normal sizing
- Contrarian opportunities = careful scaling

**Entry and Exit Timing:**
- Extreme fear = potential buying opportunity (with confirmation)
- Extreme greed = potential selling opportunity (with confirmation)
- Sentiment inflection points = key entry/exit zones

**Risk Management Adjustments:**
- High negative sentiment = tighter stops (volatility risk)
- High positive sentiment = profit-taking consideration
- Sentiment divergence = increased monitoring

### 5. SENTIMENT CATALYST IDENTIFICATION

**Immediate Catalysts:**
- News events driving current sentiment
- Social media trends and viral content
- On-chain events (large transfers, liquidations)

**Future Catalysts:**
- Upcoming announcements and events
- Technical levels that could trigger sentiment shifts
- Regulatory decisions and policy changes
- Macroeconomic events affecting crypto

### 6. CORRELATION AND DIVERGENCE ANALYSIS

**Price-Sentiment Correlation:**
- When sentiment leads price (early signals)
- When price leads sentiment (trend confirmation)
- Divergences that suggest potential reversals

**Cross-Asset Sentiment:**
- Bitcoin sentiment impact on altcoins
- Traditional market sentiment spillover
- Sector-specific sentiment analysis

## OUTPUT REQUIREMENTS

**Quantitative Precision:**
- All sentiment scores must be specific numbers, not ranges
- Confidence levels must reflect data quality and consistency
- Time-based sentiment trends must be clearly identified

**Actionable Insights:**
- Each recommendation must be directly implementable
- Risk adjustments must be specific and measurable
- Timing guidance must be precise and actionable

**Contrarian Analysis:**
- Explicitly identify contrarian opportunities
- Explain the reasoning behind contrarian recommendations
- Provide risk management for contrarian positions

Analyze the provided data and deliver a comprehensive sentiment-based trading analysis.`,
});

const marketSentimentAnalysisFlow = ai.defineFlow(
  {
    name: 'marketSentimentAnalysisFlow',
    inputSchema: MarketSentimentAnalysisInputSchema,
    outputSchema: MarketSentimentAnalysisOutputSchema,
  },
  async (input: MarketSentimentAnalysisInput) => {
    const {output} = await marketSentimentAnalysisPrompt(input);
    
    if (!output) {
      throw new Error('No output received from market sentiment analysis');
    }
    
    return output;
  }
);