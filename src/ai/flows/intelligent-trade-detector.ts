'use server';

/**
 * @fileOverview AI flow for intelligent trade detection that analyzes live screenshots
 * to identify perfect entry opportunities with minimal token usage.
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
    .describe("Seconds until next recommended scan"),
});
export type IntelligentTradeDetectorOutput = z.infer<typeof IntelligentTradeDetectorOutputSchema>;

export async function intelligentTradeDetector(input: IntelligentTradeDetectorInput): Promise<IntelligentTradeDetectorOutput> {
  return intelligentTradeDetectorFlow(input);
}

const intelligentTradeDetectorPrompt = ai.definePrompt({
  name: 'intelligentTradeDetectorPrompt',
  input: {schema: IntelligentTradeDetectorInputSchema},
  output: {schema: IntelligentTradeDetectorOutputSchema},
  prompt: `You are an expert cryptocurrency trader and technical analyst. Your task is to analyze live chart screenshots and identify high-probability trade opportunities with minimal analysis time.

**Analysis Guidelines:**

1. **Quick Pattern Recognition:** Look for clear, actionable patterns:
   - Bull/Bear flags with volume confirmation
   - Head and shoulders patterns (regular or inverse)
   - Double tops/bottoms with volume divergence
   - Ascending/descending triangles near completion
   - Cup and handle patterns
   - Breakouts from key levels with volume

2. **Key Level Analysis:** Identify:
   - Strong support/resistance levels
   - Trend lines that are being tested
   - Fibonacci retracement levels
   - Moving averages acting as support/resistance

3. **Volume Confirmation:** Check if volume supports the pattern:
   - High volume on breakouts
   - Decreasing volume on consolidations
   - Volume divergence at tops/bottoms

4. **Risk Assessment:** Only recommend trades with:
   - Clear entry and exit points
   - Favorable risk/reward ratio (minimum 1:2)
   - Strong technical confirmation

**Output Rules:**

- Set 'opportunityFound' to true ONLY if there's a clear, actionable trade setup
- Use 'light' scan mode for frequent monitoring (every 15-30 seconds)
- Use 'detailed' scan mode for confirmation when opportunity is detected
- Provide specific price levels for entry, take profit, and stop loss
- Set urgency based on pattern completion and market conditions
- Keep analysis concise but actionable

**Scan Modes:**
- **Light Mode:** Quick visual scan for obvious patterns, minimal token usage
- **Detailed Mode:** In-depth analysis when opportunity is suspected

Analyze the following live chart screenshot:

Chart Image: {{media url=chartImageUri}}

Previous Analysis Context: {{previousAnalysis || "None"}}
Scan Mode: {{scanMode}}`,
});

const intelligentTradeDetectorFlow = ai.defineFlow(
  {
    name: 'intelligentTradeDetectorFlow',
    inputSchema: IntelligentTradeDetectorInputSchema,
    outputSchema: IntelligentTradeDetectorOutputSchema,
  },
  async input => {
    const {output} = await intelligentTradeDetectorPrompt(input);
    return output!;
  }
);