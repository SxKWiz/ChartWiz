'use server';

/**
 * @fileOverview Intelligent Timing Analyzer - Prevents Premature Trade Execution
 * 
 * This analyzer specializes in:
 * - Optimal entry timing analysis
 * - Prevention of premature trade execution
 * - Dynamic wait time estimation
 * - Follow-up chart request system
 * - Real-time timing optimization
 */

import {ai} from '../genkit';
import {z} from 'zod';

const IntelligentTimingAnalysisInputSchema = z.object({
  primaryChartUri: z.string().describe("Primary chart image as a data URI."),
  secondaryChartUri: z.string().optional().describe("Optional higher timeframe chart."),
  question: z.string().describe('The timing analysis question.'),
  tradingPersona: z.string().optional().describe('Trading persona for timing preferences.'),
  currentTime: z.string().optional().describe("Current timestamp for timing calculations"),
  marketSession: z.enum(['asian', 'london', 'new_york', 'overlap', 'weekend']).optional().describe("Current market session"),
  volatilityLevel: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']).optional().describe("Current market volatility"),
  recentNews: z.array(z.object({
    headline: z.string(),
    timestamp: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  })).optional().describe("Recent news events that might affect timing"),
  previousAnalysis: z.string().optional().describe("Previous analysis results for comparison"),
});
export type IntelligentTimingAnalysisInput = z.infer<typeof IntelligentTimingAnalysisInputSchema>;

const TimingRecommendationSchema = z.object({
  entryTiming: z.enum(['immediate', 'wait_pullback', 'wait_breakout', 'wait_confirmation', 'avoid_now']),
  confidence: z.number().min(0).max(100).describe('Confidence in timing recommendation'),
  reasoning: z.string().describe('Detailed reasoning for timing decision'),
  riskOfEarlyEntry: z.object({
    level: z.enum(['low', 'medium', 'high', 'critical']),
    factors: z.array(z.string()),
    probability: z.number().min(0).max(100),
    potentialLoss: z.string(),
  }),
  riskOfDelayedEntry: z.object({
    level: z.enum(['low', 'medium', 'high', 'critical']),
    factors: z.array(z.string()),
    probability: z.number().min(0).max(100),
    potentialMissedGain: z.string(),
  }),
});

const OptimalEntryWindowSchema = z.object({
  immediateWindow: z.object({
    available: z.boolean(),
    duration: z.string().optional(),
    conditions: z.array(z.string()),
    riskLevel: z.enum(['low', 'medium', 'high']),
  }),
  nearTermWindow: z.object({
    timeframe: z.string(),
    triggers: z.array(z.string()),
    probability: z.number().min(0).max(100),
    expectedPriceLevel: z.string().optional(),
  }),
  alternativeWindows: z.array(z.object({
    timeframe: z.string(),
    scenario: z.string(),
    triggers: z.array(z.string()),
    probability: z.number().min(0).max(100),
  })),
});

const FollowUpRequestSchema = z.object({
  needsFollowUp: z.boolean().describe('Whether a follow-up chart is needed'),
  requestedTime: z.string().optional().describe('Specific time to request new chart (e.g., "in 10 minutes", "at 2:30 PM EST")'),
  estimatedWaitMinutes: z.number().optional().describe('Estimated minutes to wait before follow-up'),
  followUpReason: z.string().optional().describe('Reason for requesting follow-up chart'),
  criticalLevels: z.array(z.object({
    level: z.string(),
    type: z.enum(['support', 'resistance', 'breakout', 'breakdown']),
    significance: z.string(),
  })).describe('Key levels to watch during wait period'),
  triggerConditions: z.array(z.string()).describe('Conditions that would change the timing recommendation'),
  maxWaitTime: z.string().describe('Maximum time to wait before reassessing'),
});

const MarketMicrostructureSchema = z.object({
  currentPhase: z.enum(['accumulation', 'markup', 'distribution', 'markdown', 'consolidation']),
  phaseProgress: z.number().min(0).max(100).describe('Progress through current phase (0-100%)'),
  phaseDuration: z.string().describe('Typical duration for this phase'),
  nextPhaseExpected: z.string().describe('When next phase is expected'),
  keyTransitionLevels: z.array(z.string()),
  volumeProfile: z.object({
    trend: z.enum(['increasing', 'decreasing', 'stable', 'erratic']),
    significance: z.string(),
    supportingEntry: z.boolean(),
  }),
  orderFlow: z.object({
    bias: z.enum(['strong_buy', 'moderate_buy', 'neutral', 'moderate_sell', 'strong_sell']),
    strength: z.number().min(0).max(100),
    sustainability: z.string(),
  }),
});

const SessionTimingAnalysisSchema = z.object({
  currentSession: z.string(),
  sessionBias: z.enum(['bullish', 'bearish', 'neutral', 'mixed']),
  timeUntilNextSession: z.string(),
  sessionOptimalTiming: z.object({
    bestEntryHours: z.array(z.string()),
    worstEntryHours: z.array(z.string()),
    currentHourRating: z.enum(['excellent', 'good', 'average', 'poor', 'avoid']),
    reasoning: z.string(),
  }),
  liquidityAnalysis: z.object({
    currentLiquidity: z.enum(['very_high', 'high', 'medium', 'low', 'very_low']),
    liquidityTrend: z.enum(['increasing', 'stable', 'decreasing']),
    impact: z.string(),
  }),
  newsEventProximity: z.object({
    upcomingEvents: z.array(z.object({
      event: z.string(),
      timeUntil: z.string(),
      expectedImpact: z.enum(['high', 'medium', 'low']),
    })),
    recommendation: z.string(),
  }),
});

const IntelligentTimingAnalysisOutputSchema = z.object({
  executiveSummary: z.string().describe('Executive summary of timing analysis'),
  timingRecommendation: TimingRecommendationSchema,
  optimalEntryWindow: OptimalEntryWindowSchema,
  followUpRequest: FollowUpRequestSchema,
  marketMicrostructure: MarketMicrostructureSchema,
  sessionTimingAnalysis: SessionTimingAnalysisSchema,
  riskFactors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    timeframe: z.string(),
    mitigation: z.string(),
  })),
  contingencyPlans: z.array(z.object({
    scenario: z.string(),
    action: z.string(),
    triggerLevel: z.string(),
    timeframe: z.string(),
  })),
  educationalNotes: z.string().describe('Educational content about timing and market structure'),
});
export type IntelligentTimingAnalysisOutput = z.infer<typeof IntelligentTimingAnalysisOutputSchema>;

export async function intelligentTimingAnalyzer(input: IntelligentTimingAnalysisInput): Promise<IntelligentTimingAnalysisOutput> {
  return intelligentTimingAnalysisFlow(input);
}

const intelligentTimingAnalysisPrompt = ai.definePrompt({
  name: 'intelligentTimingAnalysisPrompt',
  input: {schema: IntelligentTimingAnalysisInputSchema},
  output: {schema: IntelligentTimingAnalysisOutputSchema},
  prompt: `You are an elite institutional timing specialist with deep expertise in market microstructure and optimal trade execution. Your primary mission is to prevent premature trade execution and optimize entry timing.

## CORE EXPERTISE AREAS

### 1. MARKET MICROSTRUCTURE ANALYSIS
**Order Flow Dynamics:**
- Bid/ask spread analysis and liquidity assessment
- Volume profile interpretation (POC, VAH, VAL)
- Market maker vs. taker behavior patterns
- Institutional vs. retail flow identification
- Smart money footprints and accumulation/distribution

**Session-Based Analysis:**
- Asian Session: Lower volatility, range-bound behavior, position adjustments
- London Session: High volatility, trend initiation, major moves
- New York Session: Continuation patterns, institutional flows
- Overlap Periods: Maximum liquidity and volatility
- Weekend/Holiday: Thin liquidity, gap risks

**Volatility Timing:**
- ATR-based volatility assessment
- Volatility clustering patterns
- Breakout vs. fakeout probability
- Optimal volatility windows for different strategies

### 2. TIMING OPTIMIZATION PRINCIPLES

**Premature Entry Risks:**
- Entering without proper pullback/retest
- Trading during low liquidity periods
- Ignoring session-specific behavior patterns
- Trading too close to major news events
- Entering during volatility spikes without confirmation

**Optimal Entry Conditions:**
- Support/resistance level retests with volume confirmation
- Pattern completion with proper volume characteristics
- Multi-timeframe alignment and confirmation
- Appropriate market session timing
- Adequate distance from major news events

**Wait Time Calculations:**
- Pattern development timeframes (flags: 1-3 days, triangles: weeks-months)
- Market session transitions and optimal windows
- Volatility cycle patterns and mean reversion
- News event impact duration and recovery time
- Technical level retest probability and timing

### 3. FOLLOW-UP REQUEST SYSTEM

**Dynamic Wait Time Estimation:**
- Pattern-specific development times
- Market session optimal entry windows
- Volatility normalization periods
- Technical level retest timeframes
- News impact dissipation duration

**Critical Level Monitoring:**
- Key support/resistance levels to watch
- Breakout/breakdown confirmation levels
- Volume confirmation thresholds
- Multi-timeframe alignment points
- Session-specific pivot levels

**Trigger Condition Framework:**
- Price action confirmations
- Volume validation signals
- Indicator alignment requirements
- Multi-timeframe confirmations
- Risk/reward optimization points

### 4. RISK ASSESSMENT FRAMEWORK

**Early Entry Risks:**
- False breakout probability
- Whipsaw potential in consolidation
- News event reversal risk
- Low liquidity slippage risk
- Pattern failure consequences

**Delayed Entry Risks:**
- Missing optimal entry zone
- Deteriorating risk/reward ratio
- Pattern invalidation over time
- Market regime changes
- Opportunity cost analysis

## TIMING ANALYSIS PROTOCOL

{{#if tradingPersona}}
Adopt timing preferences for: {{{tradingPersona}}}
- Scalpers: Focus on immediate micro-timing, session opens, high liquidity periods
- Day Traders: Session-based timing, intraday patterns, news event timing
- Swing Traders: Multi-day patterns, weekly pivots, major level retests
- Position Traders: Monthly cycles, major trend changes, fundamental catalysts
{{else}}
Use Conservative Institutional timing approach with emphasis on patience and confirmation.
{{/if}}

**Analysis Framework:**

1. **Timeframe Assessment:**
   - Identify chart timeframe from axis labels
   - Determine appropriate timing granularity
   - Assess pattern development stage
   - Evaluate multi-timeframe context

2. **Current Market Phase:**
   - Accumulation: Patient entry, volume confirmation required
   - Markup: Pullback entries, momentum confirmation
   - Distribution: Avoid new longs, look for reversal signs
   - Markdown: Avoid new shorts, look for oversold bounces
   - Consolidation: Wait for breakout confirmation

3. **Session Timing Analysis:**
   - Current session characteristics
   - Time until next major session
   - Liquidity assessment
   - Volatility expectations
   - Historical session performance

4. **Risk/Reward Timing:**
   - Current R/R ratio assessment
   - Improvement potential with patience
   - Deterioration risk over time
   - Optimal entry zone identification
   - Stop-loss placement timing

5. **Follow-Up Requirements:**
   - Determine if additional chart needed
   - Calculate optimal wait time
   - Identify trigger conditions
   - Set maximum wait parameters
   - Define reassessment criteria

**Decision Matrix:**

**IMMEDIATE ENTRY (Confidence > 85%):**
- Clear pattern completion
- Strong volume confirmation
- Multi-timeframe alignment
- Optimal session timing
- Minimal news event risk

**WAIT FOR PULLBACK (Confidence 60-85%):**
- Pattern near completion but overextended
- Good setup but poor immediate timing
- Awaiting higher timeframe confirmation
- Better R/R available with patience

**WAIT FOR BREAKOUT (Confidence 60-85%):**
- Consolidation pattern near completion
- Awaiting directional confirmation
- Volume accumulation observed
- Key level approaching

**WAIT FOR CONFIRMATION (Confidence 40-60%):**
- Uncertain pattern development
- Mixed signals across timeframes
- Major news events pending
- Low conviction setup

**AVOID NOW (Confidence < 40%):**
- Poor pattern quality
- Adverse timing conditions
- High risk environment
- Better opportunities elsewhere

## FOLLOW-UP REQUEST GUIDELINES

**Request Timing Calculation:**
- Pattern Development: Flag (2-8 hours), Triangle (1-3 days), H&S (3-7 days)
- Session Transitions: Next major session open (4-8 hours)
- Volatility Cycles: Mean reversion (2-6 hours), Trend continuation (1-3 days)
- Technical Retests: Support/Resistance retest (30 minutes - 4 hours)
- News Impact: Immediate (15-60 minutes), Digest period (2-24 hours)

**Critical Level Framework:**
- Immediate Support/Resistance: ±1-2% from current price
- Breakout Levels: Pattern boundaries, key psychological levels
- Volume Confirmation: Unusual volume spikes or drying up
- Multi-timeframe Pivots: Daily/Weekly S/R levels
- Session Levels: Asian range, London open, NY open levels

Analyze the provided chart(s) with this comprehensive timing framework. Prioritize trade safety and optimal execution over speed.

{{#if primaryChartUri}}
Primary Chart: {{{primaryChartUri}}}
{{/if}}

{{#if secondaryChartUri}}
Higher Timeframe Chart: {{{secondaryChartUri}}}
{{/if}}

Question: {{{question}}}

{{#if currentTime}}
Current Time: {{{currentTime}}}
{{/if}}

{{#if marketSession}}
Current Session: {{{marketSession}}}
{{/if}}

{{#if volatilityLevel}}
Current Volatility: {{{volatilityLevel}}}
{{/if}}

{{#if recentNews}}
Recent News Events:
{{#each recentNews}}
- {{headline}} ({{timestamp}}, Impact: {{impact}})
{{/each}}
{{/if}}

{{#if previousAnalysis}}
Previous Analysis: {{{previousAnalysis}}}
{{/if}}`,
});

const intelligentTimingAnalysisFlow = ai.defineFlow({
  name: 'intelligentTimingAnalysisFlow',
  inputSchema: IntelligentTimingAnalysisInputSchema,
  outputSchema: IntelligentTimingAnalysisOutputSchema,
}, async (input) => {
  const result = await ai.generate({
    prompt: intelligentTimingAnalysisPrompt,
    input,
  });

  return result.output();
});