'use server';

/**
 * @fileOverview AI flow for intelligent trade detection that analyzes live screenshots
 * to identify perfect entry opportunities with minimal token usage and smart spam prevention.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentTradeDetectorInputSchema = z.object({
  chartImageUri: z
    .string()
    .describe(
      "A cryptocurrency chart image from live screen share, as a data URI that must include a MIME type and use Base64 encoding."
    ),
  previousAnalysis: z
    .string()
    .optional()
    .describe("Previous analysis context to maintain continuity"),
  scanMode: z
    .enum(['light', 'detailed'])
    .default('light')
    .describe("Scan mode - light for frequent scans, detailed for confirmation"),
  lastOpportunityTime: z
    .number()
    .optional()
    .describe("Timestamp of last detected opportunity to prevent spam"),
  consecutiveScansWithoutOpportunity: z
    .number()
    .default(0)
    .describe("Number of consecutive scans without finding opportunities"),
});
export type IntelligentTradeDetectorInput = z.infer<typeof IntelligentTradeDetectorInputSchema>;

const TradeOpportunitySchema = z.object({
  opportunityFound: z
    .boolean()
    .describe("Whether a high-probability trade opportunity is detected"),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence score for the trade opportunity (0-100)"),
  tradeType: z
    .enum(['long', 'short', 'neutral'])
    .describe("Type of trade opportunity"),
  entryPrice: z
    .string()
    .optional()
    .describe("Recommended entry price"),
  takeProfit: z
    .array(z.string())
    .optional()
    .describe("Take profit targets"),
  stopLoss: z
    .string()
    .optional()
    .describe("Stop loss level"),
  riskRewardRatio: z
    .string()
    .optional()
    .describe("Risk to reward ratio"),
  patternName: z
    .string()
    .optional()
    .describe("Name of the detected pattern"),
  urgency: z
    .enum(['immediate', 'soon', 'watch'])
    .describe("Urgency level of the opportunity"),
  reasoning: z
    .string()
    .describe("Brief reasoning for the trade opportunity"),
  keyLevels: z
    .array(z.string())
    .optional()
    .describe("Key support/resistance levels"),
  volumeAnalysis: z
    .string()
    .optional()
    .describe("Volume analysis summary"),
  confidenceThreshold: z
    .number()
    .min(0)
    .max(100)
    .default(75)
    .describe("Minimum confidence threshold for alerting"),
});

const IntelligentTradeDetectorOutputSchema = z.object({
  tradeOpportunity: TradeOpportunitySchema,
  screenshotAnalysis: z
    .string()
    .describe("Brief analysis of the current chart state"),
  recommendation: z
    .string()
    .describe("Clear trade recommendation with actionable advice"),
  nextScanIn: z
    .number()
    .describe("Seconds until next recommended scan (adaptive based on market conditions)"),
  cooldownActive: z
    .boolean()
    .default(false)
    .describe("Whether detection is in cooldown to prevent spam"),
  marketVolatility: z
    .enum(['low', 'medium', 'high'])
    .describe("Current market volatility assessment"),
});
export type IntelligentTradeDetectorOutput = z.infer<typeof IntelligentTradeDetectorOutputSchema>;

export async function intelligentTradeDetector(input: IntelligentTradeDetectorInput): Promise<IntelligentTradeDetectorOutput> {
  return intelligentTradeDetectorFlow(input);
}

const intelligentTradeDetectorPrompt = ai.definePrompt({
  name: 'intelligentTradeDetectorPrompt',
  input: {schema: IntelligentTradeDetectorInputSchema},
  output: {schema: IntelligentTradeDetectorOutputSchema},
  prompt: `You are an expert cryptocurrency trader and technical analyst with advanced spam prevention and intelligent scanning capabilities. Your task is to analyze live chart screenshots and identify high-probability trade opportunities while avoiding false positives and excessive notifications.

**SPAM PREVENTION RULES:**
- Only alert for opportunities with confidence >= 75%
- If last opportunity was detected within 5 minutes, use higher confidence threshold (85%)
- If {{consecutiveScansWithoutOpportunity}} >= 10, reduce scanning frequency
- Focus on pattern completion and clear breakouts, not potential setups

**ADAPTIVE SCANNING LOGIC:**
- High volatility markets: Shorter intervals (10-15 seconds)
- Low volatility/consolidation: Longer intervals (30-60 seconds)  
- After opportunity detected: Cooldown period (2-5 minutes)
- Consecutive empty scans: Exponentially increase intervals

**Analysis Guidelines:**

1. **Pattern Recognition Priority (High Confidence Only):**
   - Bull/Bear flags with CONFIRMED volume breakout
   - Head and shoulders with neckline break + volume
   - Double tops/bottoms with clear volume divergence
   - Triangle breakouts with momentum confirmation
   - Cup and handle patterns at completion
   - Clear support/resistance breaks with retest

2. **Volume Confirmation Requirements:**
   - Breakouts must have 1.5x+ average volume
   - Consolidations should show decreasing volume
   - Divergences must be clearly visible across multiple candles

3. **Quality Control:**
   - Reject marginal setups during low confidence periods
   - Require multiple confluences for high-confidence signals
   - Distinguish between "watching" vs "immediate action" setups

4. **Risk Assessment Standards:**
   - Minimum 1:2 risk/reward ratio for alerts
   - Clear entry and exit points must be visible
   - Stop loss must be logical (support/resistance, pattern invalidation)

**Scan Mode Optimization:**
- **Light Mode:** Quick assessment for obvious completed patterns only
- **Detailed Mode:** Deep analysis when light mode finds potential setup

**Market Volatility Assessment:**
- **High:** Multiple large moves, high volume, news events
- **Medium:** Normal market movement with occasional spikes  
- **Low:** Consolidation, low volume, range-bound

**Output Rules:**
- Set 'opportunityFound' to true ONLY for actionable, high-confidence setups
- Use adaptive 'nextScanIn' based on market conditions and recent activity
- Set 'cooldownActive' to true if recent opportunity was detected
- Provide specific reasoning for confidence score
- Include volatility assessment for adaptive scanning

**Previous Context:** {{previousAnalysis}}
**Consecutive Empty Scans:** {{consecutiveScansWithoutOpportunity}}
**Last Opportunity:** {{lastOpportunityTime}} (timestamp)

Analyze the following live chart screenshot with spam prevention and adaptive intelligence:

Chart Image: {{media url=chartImageUri}}`,
});

const intelligentTradeDetectorFlow = ai.defineFlow(
  {
    name: 'intelligentTradeDetectorFlow',
    inputSchema: IntelligentTradeDetectorInputSchema,
    outputSchema: IntelligentTradeDetectorOutputSchema,
  },
  async input => {
    // Calculate adaptive parameters based on input
    const now = Date.now();
    const timeSinceLastOpportunity = input.lastOpportunityTime ? 
      (now - input.lastOpportunityTime) / 1000 : Infinity;
    
    // Apply cooldown logic
    const cooldownPeriod = 300; // 5 minutes
    const isInCooldown = timeSinceLastOpportunity < cooldownPeriod;
    
    // Adjust confidence threshold based on recent activity
    const baseConfidenceThreshold = 75;
    const adjustedThreshold = isInCooldown ? 85 : baseConfidenceThreshold;
    
    const {output} = await intelligentTradeDetectorPrompt({
      ...input,
      consecutiveScansWithoutOpportunity: input.consecutiveScansWithoutOpportunity || 0,
    });
    
    if (!output) {
      throw new Error('No output received from trade detector');
    }
    
    // Post-process the output for additional spam prevention
    const result = { ...output };
    
    // Apply confidence filtering
    if (result.tradeOpportunity.confidence < adjustedThreshold) {
      result.tradeOpportunity.opportunityFound = false;
      result.tradeOpportunity.reasoning = `Confidence ${result.tradeOpportunity.confidence}% below threshold ${adjustedThreshold}%. ${result.tradeOpportunity.reasoning}`;
    }
    
    // Apply cooldown override
    if (isInCooldown && result.tradeOpportunity.opportunityFound) {
      result.cooldownActive = true;
      if (result.tradeOpportunity.confidence < 90) {
        result.tradeOpportunity.opportunityFound = false;
        result.tradeOpportunity.reasoning = `Cooldown active (${Math.round(cooldownPeriod - timeSinceLastOpportunity)}s remaining). Only 90%+ confidence signals allowed. Current: ${result.tradeOpportunity.confidence}%`;
      }
    }
    
    // Adaptive next scan timing
    let nextScanIn = 15; // default
    
    if (result.tradeOpportunity.opportunityFound) {
      nextScanIn = 300; // 5 minutes after finding opportunity
    } else if (result.marketVolatility === 'high') {
      nextScanIn = 10;
    } else if (result.marketVolatility === 'low') {
      nextScanIn = Math.min(60, 15 + (input.consecutiveScansWithoutOpportunity || 0) * 5);
    } else {
      nextScanIn = 20;
    }
    
    result.nextScanIn = nextScanIn;
    
    return result;
  }
);