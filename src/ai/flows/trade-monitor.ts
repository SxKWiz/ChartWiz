'use server';

/**
 * @fileOverview AI flow for monitoring active trades and providing real-time updates
 * on trade progress, risk management, and exit recommendations.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TradeMonitorInputSchema = z.object({
  chartImageUri: z
    .string()
    .describe(
      "A cryptocurrency chart image from live screen share, as a data URI that must include a MIME type and use Base64 encoding."
    ),
  activeTrade: z
    .object({
      entryPrice: z.string(),
      takeProfit: z.array(z.string()),
      stopLoss: z.string(),
      tradeType: z.enum(['long', 'short']),
      patternName: z.string().optional(),
      entryTime: z.string(),
      reasoning: z.string(),
    })
    .describe("The active trade being monitored"),
  previousUpdate: z
    .string()
    .optional()
    .describe("Previous trade update context"),
});
export type TradeMonitorInput = z.infer<typeof TradeMonitorInputSchema>;

const TradeUpdateSchema = z.object({
  currentPrice: z
    .string()
    .describe("Current market price"),
  priceChange: z
    .string()
    .describe("Price change since entry (percentage and absolute)"),
  profitLoss: z
    .string()
    .describe("Current profit/loss on the trade"),
  riskLevel: z
    .enum(['low', 'medium', 'high', 'critical'])
    .describe("Current risk level of the trade"),
  positionStatus: z
    .enum(['profitable', 'breakeven', 'losing', 'at_risk'])
    .describe("Current position status"),
  stopLossDistance: z
    .string()
    .describe("Distance to stop loss"),
  takeProfitProgress: z
    .array(z.object({
      target: z.string(),
      progress: z.string(),
      distance: z.string(),
    }))
    .describe("Progress towards take profit targets"),
  recommendation: z
    .enum(['hold', 'partial_exit', 'full_exit', 'move_stop_loss', 'add_position'])
    .describe("Recommended action"),
  reasoning: z
    .string()
    .describe("Reasoning for the recommendation"),
  urgency: z
    .enum(['low', 'medium', 'high', 'immediate'])
    .describe("Urgency level of the recommendation"),
  keyLevels: z
    .array(z.string())
    .optional()
    .describe("Key support/resistance levels to watch"),
  volumeAnalysis: z
    .string()
    .optional()
    .describe("Volume analysis for the current move"),
});

const TradeMonitorOutputSchema = z.object({
  tradeUpdate: TradeUpdateSchema,
  marketAnalysis: z
    .string()
    .describe("Brief analysis of current market conditions"),
  nextUpdateIn: z
    .number()
    .describe("Seconds until next recommended update"),
});
export type TradeMonitorOutput = z.infer<typeof TradeMonitorOutputSchema>;

export async function monitorActiveTrade(input: TradeMonitorInput): Promise<TradeMonitorOutput> {
  return tradeMonitorFlow(input);
}

const tradeMonitorPrompt = ai.definePrompt({
  name: 'tradeMonitorPrompt',
  input: {schema: TradeMonitorInputSchema},
  output: {schema: TradeMonitorOutputSchema},
  prompt: `You are an expert cryptocurrency trader monitoring an active trade. Your task is to analyze the current chart and provide real-time updates on the trade's progress, risk management, and exit recommendations.

**Active Trade Context:**
Entry Price: {{activeTrade.entryPrice}}
Take Profit Targets: {{activeTrade.takeProfit}}
Stop Loss: {{activeTrade.stopLoss}}
Trade Type: {{activeTrade.tradeType}}
Pattern: {{activeTrade.patternName}}
Entry Time: {{activeTrade.entryTime}}
Original Reasoning: {{activeTrade.reasoning}}

**Analysis Guidelines:**

1. **Price Action Analysis:**
   - Compare current price to entry price
   - Calculate profit/loss percentage and absolute values
   - Assess distance to stop loss and take profit targets
   - Identify any breakouts or breakdowns

2. **Risk Assessment:**
   - Evaluate current risk level (low/medium/high/critical)
   - Check if stop loss needs adjustment
   - Assess position status (profitable/breakeven/losing/at_risk)
   - Monitor volume for confirmation or divergence

3. **Technical Analysis:**
   - Identify key support/resistance levels
   - Check for pattern completion or failure
   - Analyze momentum and trend strength
   - Look for reversal signals

4. **Recommendation Logic:**
   - **HOLD**: Trade is progressing well, no action needed
   - **PARTIAL_EXIT**: Take some profits, reduce risk
   - **FULL_EXIT**: Close entire position due to risk or target reached
   - **MOVE_STOP_LOSS**: Adjust stop loss for better risk management
   - **ADD_POSITION**: Increase position size if setup improves

**Output Rules:**

- Provide accurate current price and profit/loss calculations
- Assess risk level based on distance to stop loss and market conditions
- Give clear, actionable recommendations with reasoning
- Set urgency based on risk level and market conditions
- Keep updates concise but informative

**Previous Update Context:**
{{previousUpdate}}

Analyze the following live chart for trade updates:

Chart Image: {{media url=chartImageUri}}`,
});

const tradeMonitorFlow = ai.defineFlow(
  {
    name: 'tradeMonitorFlow',
    inputSchema: TradeMonitorInputSchema,
    outputSchema: TradeMonitorOutputSchema,
  },
  async input => {
    const {output} = await tradeMonitorPrompt(input);
    return output!;
  }
);