'use server';

/**
 * @fileOverview Enhanced Confidence AI Brain - Advanced Trading Intelligence with Confidence Assessment
 * 
 * This AI brain features:
 * - Advanced confidence assessment and uncertainty handling
 * - Timing optimization to prevent premature trade execution
 * - 10x expanded trading knowledge base
 * - Interactive confirmation system for uncertain trades
 * - Request system for additional chart timeframes and correlations
 */

import {ai} from '../genkit';
import {z} from 'zod';
import { enhancedMarketAnalysis, type EnhancedMarketAnalysisInput, type EnhancedMarketAnalysisOutput } from './enhanced-market-analysis';
import { marketSentimentAnalysis, type MarketSentimentAnalysisInput, type MarketSentimentAnalysisOutput } from './market-sentiment-analyzer';
import { scanForPatterns, type ScanForPatternsInput, type ScanForPatternsOutput } from './scan-for-patterns-flow';
import { validateAndEnhanceRecommendation, type RawRecommendation } from '../../lib/recommendation-processor';
import { generateAnalysisContext } from '../../lib/chart-analysis-helpers';

const EnhancedConfidenceAnalysisInputSchema = z.object({
  primaryChartUri: z.string().describe("Primary cryptocurrency chart image as a data URI."),
  secondaryChartUri: z.string().optional().describe("Optional secondary chart for multi-timeframe analysis."),
  tertiaryChartUri: z.string().optional().describe("Optional third chart for comprehensive analysis."),
  question: z.string().describe('The analysis question or trading request.'),
  tradingPersona: z.string().optional().describe('Trading persona/strategy to adopt.'),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive', 'ultra_aggressive']).optional().default('moderate'),
  marketDataText: z.string().optional().describe("Additional market context and news."),
  currentTime: z.string().optional().describe("Current timestamp for timing analysis"),
  userExperience: z.enum(['beginner', 'intermediate', 'advanced', 'professional']).optional().default('intermediate'),
  newsData: z.array(z.object({
    headline: z.string(),
    content: z.string().optional(),
    source: z.string(),
    timestamp: z.string(),
    impact: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    sentiment: z.enum(['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish']).optional(),
  })).optional(),
  socialData: z.array(z.object({
    platform: z.enum(['twitter', 'reddit', 'telegram', 'discord', 'youtube', 'tiktok', 'other']),
    content: z.string(),
    sentiment: z.enum(['extremely_bullish', 'bullish', 'neutral', 'bearish', 'extremely_bearish']).optional(),
    engagement: z.number().optional(),
    timestamp: z.string(),
  })).optional(),
  onChainData: z.object({
    whaleMovements: z.array(z.string()).optional(),
    exchangeFlows: z.string().optional(),
    fundingRates: z.string().optional(),
    openInterest: z.string().optional(),
    liquidations: z.string().optional(),
    mvrv: z.number().optional(),
    nvt: z.number().optional(),
    sopr: z.number().optional(),
  }).optional(),
});
export type EnhancedConfidenceAnalysisInput = z.infer<typeof EnhancedConfidenceAnalysisInputSchema>;

const ConfidenceAssessmentSchema = z.object({
  overallConfidence: z.number().min(0).max(100).describe('Overall confidence in the analysis (0-100)'),
  technicalConfidence: z.number().min(0).max(100).describe('Confidence in technical analysis'),
  timingConfidence: z.number().min(0).max(100).describe('Confidence in trade timing'),
  marketContextConfidence: z.number().min(0).max(100).describe('Confidence in market context understanding'),
  uncertaintyFactors: z.array(z.string()).describe('Factors contributing to uncertainty'),
  confidenceBreakdown: z.object({
    patternClarity: z.number().min(0).max(100),
    volumeConfirmation: z.number().min(0).max(100),
    multiTimeframeAlignment: z.number().min(0).max(100),
    sentimentConsistency: z.number().min(0).max(100),
    marketStructure: z.number().min(0).max(100),
  }),
  requiresConfirmation: z.boolean().describe('Whether additional user confirmation is needed'),
  confidenceThreshold: z.number().describe('Minimum confidence threshold for this trade type'),
});

const TimingOptimizationSchema = z.object({
  optimalEntryTiming: z.object({
    immediate: z.boolean().describe('Whether to enter immediately'),
    waitTime: z.string().optional().describe('Recommended wait time if not immediate'),
    triggerConditions: z.array(z.string()).describe('Conditions to wait for before entry'),
    riskOfEarlyEntry: z.string().describe('Risk assessment of entering too early'),
    riskOfDelayedEntry: z.string().describe('Risk assessment of waiting too long'),
  }),
  marketTimingFactors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    description: z.string(),
    timeHorizon: z.string(),
  })),
  sessionAnalysis: z.object({
    currentSession: z.string(),
    sessionBias: z.enum(['bullish', 'bearish', 'neutral']),
    keyLevels: z.array(z.string()),
    volumeProfile: z.string(),
  }),
  volatilityTiming: z.object({
    currentVolatility: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
    expectedVolatility: z.string(),
    volatilityImpact: z.string(),
    optimalVolatilityWindow: z.string(),
  }),
});

const AdditionalDataRequestSchema = z.object({
  needsAdditionalData: z.boolean().describe('Whether additional data is needed for confident analysis'),
  requestedTimeframes: z.array(z.object({
    timeframe: z.string(),
    reason: z.string(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
  })).describe('Additional timeframes needed for analysis'),
  requestedCorrelations: z.array(z.object({
    asset: z.string(),
    reason: z.string(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
  })).describe('Correlated assets to analyze'),
  requestedIndicators: z.array(z.object({
    indicator: z.string(),
    reason: z.string(),
    timeframe: z.string(),
  })).describe('Additional indicators needed'),
  followUpQuestions: z.array(z.string()).describe('Questions for the user to improve analysis'),
  estimatedWaitTime: z.string().optional().describe('Time to wait for additional chart upload if needed'),
});

const EnhancedTradeRecommendationSchema = z.object({
  entryStrategy: z.object({
    primaryEntry: z.object({
      price: z.string(),
      reason: z.string(),
      confidence: z.number().min(0).max(100),
      timing: z.enum(['immediate', 'on_pullback', 'on_breakout', 'wait_confirmation']),
    }),
    alternativeEntries: z.array(z.object({
      price: z.string(),
      reason: z.string(),
      confidence: z.number().min(0).max(100),
      scenario: z.string(),
    })),
    entryConfirmation: z.array(z.string()).describe('Signals to confirm before entry'),
  }),
  exitStrategy: z.object({
    takeProfitLevels: z.array(z.object({
      level: z.string(),
      percentage: z.number().describe('Percentage of position to close'),
      reason: z.string(),
      probability: z.number().min(0).max(100),
      timeframe: z.string(),
    })),
    stopLoss: z.object({
      level: z.string(),
      reason: z.string(),
      trailing: z.boolean(),
      trailingDistance: z.string().optional(),
    }),
    breakEvenStrategy: z.string(),
  }),
  riskManagement: z.object({
    positionSize: z.string(),
    riskPercentage: z.number(),
    riskRewardRatio: z.string(),
    maxDrawdown: z.string(),
    correlationRisk: z.string(),
  }),
  timeHorizon: z.string(),
  marketContext: z.string(),
});

const EnhancedConfidenceAnalysisOutputSchema = z.object({
  executiveSummary: z.string().describe('Comprehensive executive summary of the analysis'),
  confidenceAssessment: ConfidenceAssessmentSchema,
  timingOptimization: TimingOptimizationSchema,
  additionalDataRequest: AdditionalDataRequestSchema,
  enhancedRecommendation: EnhancedTradeRecommendationSchema.optional(),
  marketIntelligence: z.object({
    trendAnalysis: z.string(),
    supportResistanceMap: z.array(z.string()),
    volumeAnalysis: z.string(),
    momentumIndicators: z.string(),
    patternRecognition: z.string(),
    marketStructure: z.string(),
    institutionalFlow: z.string(),
    retailSentiment: z.string(),
  }),
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    mitigation: z.string(),
    probability: z.number().min(0).max(100),
  })),
  alternativeScenarios: z.array(z.object({
    scenario: z.string(),
    probability: z.number().min(0).max(100),
    implication: z.string(),
    triggers: z.array(z.string()),
  })),
  educationalInsights: z.string().describe('Educational content about the current market situation and trading concepts'),
});
export type EnhancedConfidenceAnalysisOutput = z.infer<typeof EnhancedConfidenceAnalysisOutputSchema>;

export async function enhancedConfidenceAIBrain(input: EnhancedConfidenceAnalysisInput): Promise<EnhancedConfidenceAnalysisOutput> {
  return enhancedConfidenceAnalysisFlow(input);
}

const enhancedConfidenceAnalysisPrompt = ai.definePrompt({
  name: 'enhancedConfidenceAnalysisPrompt',
  input: {schema: EnhancedConfidenceAnalysisInputSchema},
  output: {schema: EnhancedConfidenceAnalysisOutputSchema},
  prompt: `You are an elite institutional-grade cryptocurrency trading AI with 10x expanded knowledge base. Your expertise encompasses:

## EXPANDED TRADING KNOWLEDGE BASE (10X ENHANCED)

### 1. ADVANCED TECHNICAL ANALYSIS
**Chart Patterns (100+ patterns):**
- Classic: Head & Shoulders, Double Top/Bottom, Triangles, Flags, Pennants, Wedges
- Advanced: Gartley, Butterfly, Bat, Crab, Cypher patterns
- Japanese: Doji, Hammer, Shooting Star, Engulfing, Harami, Three Soldiers/Crows
- Complex: Elliott Wave (5-wave, ABC corrections), Wyckoff Method (Accumulation/Distribution)
- Exotic: Rounding Bottom/Top, Cup & Handle, Diamond, Island Reversal

**Technical Indicators (200+ indicators):**
- Momentum: RSI, MACD, Stochastic, Williams %R, CCI, ROC, TSI
- Trend: Moving Averages (SMA, EMA, WMA, HMA), Ichimoku, PSAR, ADX, Aroon
- Volume: OBV, Chaikin MF, PVT, VWAP, Volume Profile, Accumulation/Distribution
- Volatility: Bollinger Bands, Keltner Channels, ATR, VIX-style indicators
- Market Structure: Pivot Points, Fibonacci (retracement, extension, time zones, arcs)

**Advanced Concepts:**
- Market Microstructure: Order Flow, Footprint Charts, Delta Analysis
- Auction Market Theory: Value Area, Point of Control, Profile shapes
- Wyckoff Method: Supply/Demand, Effort vs Result, Cause & Effect
- Elliott Wave Theory: Impulse waves, Corrective patterns, Wave relationships
- Dow Theory: Trend identification, Volume confirmation, Market phases

### 2. CRYPTOCURRENCY SPECIFICS
**Blockchain Fundamentals:**
- Consensus mechanisms: PoW, PoS, DPoS, PoH, PoA
- Tokenomics: Supply schedules, inflation/deflation, burning mechanisms
- Network effects: Metcalfe's Law, adoption curves, developer activity
- Governance: DAOs, voting mechanisms, protocol upgrades

**On-Chain Analysis:**
- Network Value to Transactions (NVT), Market Value to Realized Value (MVRV)
- Spent Output Profit Ratio (SOPR), Long-term Holder behavior
- Exchange flows, whale movements, dormant coin circulation
- Hash rate analysis, mining economics, difficulty adjustments

**DeFi & Yield Strategies:**
- Liquidity provision, impermanent loss calculations
- Yield farming, staking rewards, governance tokens
- Flash loans, arbitrage opportunities, MEV strategies
- Cross-chain bridges, layer 2 solutions, scaling technologies

### 3. MARKET PSYCHOLOGY & BEHAVIORAL FINANCE
**Cognitive Biases (50+ biases):**
- Confirmation bias, anchoring, recency bias, availability heuristic
- Loss aversion, sunk cost fallacy, disposition effect
- Herding behavior, FOMO/FUD cycles, survivorship bias

**Market Cycles:**
- Accumulation, Markup, Distribution, Markdown phases
- Fear & Greed cycles, euphoria/despair indicators
- Bubble formation, crash patterns, recovery phases

**Sentiment Analysis:**
- Social media sentiment (Twitter, Reddit, Telegram)
- News sentiment analysis, narrative tracking
- Funding rates, options skew, put/call ratios
- Google Trends, search volume analysis

### 4. INSTITUTIONAL TRADING STRATEGIES
**Algorithmic Trading:**
- Mean reversion, momentum strategies, pairs trading
- Statistical arbitrage, market making, trend following
- High-frequency trading patterns, latency arbitrage

**Risk Management:**
- Portfolio theory, correlation analysis, diversification
- Value at Risk (VaR), Expected Shortfall, Kelly Criterion
- Position sizing models, drawdown management
- Hedging strategies, options strategies

### 5. MACROECONOMIC FACTORS
**Traditional Markets:**
- Interest rates, inflation, currency movements
- Stock market correlations, commodity relationships
- Central bank policies, economic indicators

**Crypto-Specific Macro:**
- Regulatory developments, adoption metrics
- Institutional investment flows, ETF impacts
- Stablecoin dynamics, USDT/USDC supply changes

## CONFIDENCE ASSESSMENT PROTOCOL

You must evaluate your confidence across multiple dimensions:

1. **Technical Confidence (0-100):**
   - Pattern clarity and completion
   - Indicator alignment and confirmation
   - Support/resistance strength
   - Volume confirmation

2. **Timing Confidence (0-100):**
   - Market session analysis
   - Volatility timing
   - News/event proximity
   - Liquidity conditions

3. **Market Context Confidence (0-100):**
   - Broader trend alignment
   - Sentiment consistency
   - Macro environment
   - Correlation analysis

4. **Overall Confidence Calculation:**
   - Weight technical (40%), timing (30%), context (30%)
   - Apply uncertainty penalties for missing data
   - Consider user experience level adjustments

## CONFIDENCE THRESHOLDS & ACTIONS

**High Confidence (80-100):** Proceed with full recommendation
**Medium Confidence (60-79):** Provide recommendation with caveats
**Low Confidence (40-59):** Request additional data/confirmation
**Very Low Confidence (<40):** Recommend waiting or seeking more information

## TIMING OPTIMIZATION PROTOCOL

Analyze multiple timing factors:

1. **Immediate Entry Risks:**
   - Overextension indicators
   - Lack of pullback/retest
   - High volatility periods
   - News event proximity

2. **Optimal Entry Conditions:**
   - Support/resistance retests
   - Volume confirmation
   - Indicator alignment
   - Session-specific timing

3. **Wait Time Estimation:**
   - Based on typical pattern development
   - Market volatility cycles
   - Session transitions
   - Expected catalyst timing

## ADDITIONAL DATA REQUEST SYSTEM

When confidence is insufficient, systematically request:

1. **Higher Timeframes:**
   - Daily for 4H analysis
   - Weekly for daily analysis
   - Monthly for weekly analysis

2. **Correlated Assets:**
   - BTC for altcoin analysis
   - DXY for USD pairs
   - Traditional markets for macro context

3. **Additional Indicators:**
   - Volume profile for key levels
   - Options data for sentiment
   - On-chain metrics for fundamentals

## ANALYSIS INSTRUCTIONS

{{#if tradingPersona}}
Adopt the following trading persona: {{{tradingPersona}}}
{{else}}
Use Conservative Institutional Trader persona with emphasis on risk management.
{{/if}}

**Primary Analysis Steps:**

1. **Timeframe Identification:** Determine chart timeframe(s) from axis labels
2. **Confidence Assessment:** Evaluate across all dimensions
3. **Timing Analysis:** Assess optimal entry timing
4. **Pattern Recognition:** Identify all relevant patterns and confluences
5. **Risk Evaluation:** Comprehensive risk factor analysis
6. **Data Sufficiency:** Determine if additional data is needed

**If Confidence ≥ 70:** Provide full trade recommendation
**If Confidence < 70:** Focus on education and data requests

**Educational Component:**
Always include educational insights about:
- Current market dynamics
- Pattern significance
- Risk management principles
- Trading psychology considerations
- Relevant historical precedents

Analyze the provided chart(s) with this comprehensive framework, prioritizing accuracy over speed and education over pure profit maximization.

{{#if primaryChartUri}}
Primary Chart: {{{primaryChartUri}}}
{{/if}}

{{#if secondaryChartUri}}
Secondary Chart: {{{secondaryChartUri}}}
{{/if}}

{{#if tertiaryChartUri}}
Tertiary Chart: {{{tertiaryChartUri}}}
{{/if}}

Question: {{{question}}}

{{#if marketDataText}}
Market Context: {{{marketDataText}}}
{{/if}}

{{#if newsData}}
News Data: {{#each newsData}}
- {{headline}} ({{source}}, {{timestamp}}){{#if content}}: {{content}}{{/if}}
{{/each}}
{{/if}}

{{#if socialData}}
Social Sentiment: {{#each socialData}}
- {{platform}}: {{content}} ({{sentiment}}, {{timestamp}})
{{/each}}
{{/if}}

{{#if onChainData}}
On-Chain Data: 
{{#if onChainData.whaleMovements}}Whale Movements: {{#each onChainData.whaleMovements}}{{this}}, {{/each}}{{/if}}
{{#if onChainData.exchangeFlows}}Exchange Flows: {{onChainData.exchangeFlows}}{{/if}}
{{#if onChainData.fundingRates}}Funding Rates: {{onChainData.fundingRates}}{{/if}}
{{/if}}`,
});

const enhancedConfidenceAnalysisFlow = ai.defineFlow({
  name: 'enhancedConfidenceAnalysisFlow',
  inputSchema: EnhancedConfidenceAnalysisInputSchema,
  outputSchema: EnhancedConfidenceAnalysisOutputSchema,
}, async (input) => {
  const result = await ai.generate({
    prompt: enhancedConfidenceAnalysisPrompt,
    input,
  });

  return result.output();
});