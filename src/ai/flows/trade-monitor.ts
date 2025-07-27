'use server';

/**
 * @fileOverview AI flow for monitoring active trades and providing real-time updates
 * on trade progress, risk management, and exit recommendations with intelligent entry detection.
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
      isEntryConfirmed: z.boolean().optional().default(false),
      actualEntryPrice: z.string().optional(),
      actualEntryTime: z.string().optional(),
    })
    .describe("The active trade being monitored"),
  previousUpdate: z
    .string()
    .optional()
    .describe("Previous trade update context"),
  currentPrice: z
    .string()
    .optional()
    .describe("Current market price if known"),
});
export type TradeMonitorInput = z.infer<typeof TradeMonitorInputSchema>;

const TradeStateSchema = z.object({
  status: z
    .enum(['waiting_entry', 'entered', 'partial_exit', 'fully_exited'])
    .describe("Current state of the trade"),
  entryConfirmed: z
    .boolean()
    .describe("Whether entry price has been reached and confirmed"),
  actualEntryPrice: z
    .string()
    .optional()
    .describe("Actual entry price if trade was entered"),
  actualEntryTime: z
    .string()
    .optional()
    .describe("Actual entry timestamp"),
  priceDistance: z
    .object({
      toEntry: z.string().describe("Distance from current price to entry price"),
      toStop: z.string().describe("Distance from current price to stop loss"),
      toFirstTarget: z.string().describe("Distance to first take profit"),
    })
    .describe("Price distances to key levels"),
});

const TradeUpdateSchema = z.object({
  currentPrice: z
    .string()
    .describe("Current market price"),
  tradeState: TradeStateSchema,
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
    .enum(['waiting', 'profitable', 'breakeven', 'losing', 'at_risk'])
    .describe("Current position status"),
  stopLossDistance: z
    .string()
    .describe("Distance to stop loss"),
  takeProfitProgress: z
    .array(z.object({
      target: z.string(),
      progress: z.string(),
      distance: z.string(),
      reached: z.boolean().default(false),
    }))
    .describe("Progress towards take profit targets"),
  recommendation: z
    .enum(['wait_entry', 'hold', 'partial_exit', 'full_exit', 'move_stop_loss', 'add_position', 'cancel_order'])
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
  entryAnalysis: z
    .string()
    .describe("Analysis of entry conditions and timing"),
  nextUpdateIn: z
    .number()
    .describe("Seconds until next recommended update (adaptive based on trade state)"),
});
export type TradeMonitorOutput = z.infer<typeof TradeMonitorOutputSchema>;

export async function monitorActiveTrade(input: TradeMonitorInput): Promise<TradeMonitorOutput> {
  return tradeMonitorFlow(input);
}

const tradeMonitorPrompt = ai.definePrompt({
  name: 'tradeMonitorPrompt',
  input: {schema: TradeMonitorInputSchema},
  output: {schema: TradeMonitorOutputSchema},
  prompt: `You are an expert cryptocurrency trader monitoring an active trade with intelligent entry detection and precise state management. Your primary responsibility is to accurately determine whether the trade has actually been entered and provide appropriate recommendations based on the current trade state.

**Trade Information:**
Entry Price: {{activeTrade.entryPrice}}
Take Profit Targets: {{activeTrade.takeProfit}}
Stop Loss: {{activeTrade.stopLoss}}
Trade Type: {{activeTrade.tradeType}}
Pattern: {{activeTrade.patternName}}
Entry Time: {{activeTrade.entryTime}}
Entry Confirmed: {{activeTrade.isEntryConfirmed}}
Actual Entry Price: {{activeTrade.actualEntryPrice}}
Original Reasoning: {{activeTrade.reasoning}}

**CRITICAL ENTRY DETECTION RULES:**

1. **Entry Confirmation Logic:**
   - For LONG trades: Entry confirmed only if current price has REACHED OR GONE BELOW the entry price
   - For SHORT trades: Entry confirmed only if current price has REACHED OR GONE ABOVE the entry price
   - DO NOT assume entry until price clearly hits the entry level
   - Consider spread/slippage (±0.1-0.5% tolerance for entry confirmation)

2. **Trade State Management:**
   - **waiting_entry**: Price has not reached entry level yet
   - **entered**: Price has confirmed entry and trade is active
   - **partial_exit**: Some take profit targets hit
   - **fully_exited**: All targets hit or stop loss triggered

3. **Pre-Entry Monitoring:**
   - Monitor price action approaching entry level
   - Assess if setup is still valid as price approaches
   - Watch for pattern invalidation before entry
   - Recommend cancellation if setup deteriorates

4. **Post-Entry Monitoring:**
   - Calculate actual P&L only after entry confirmed
   - Monitor distance to stop loss and take profit levels
   - Assess trade momentum and volume confirmation
   - Provide exit recommendations based on technical analysis

**Analysis Framework:**

**Entry Analysis:**
- Current price vs entry price relationship
- Time elapsed since trade signal
- Pattern validity and setup confirmation
- Market conditions affecting entry timing
- Volume analysis around entry level

**Risk Assessment:**
- Distance to stop loss (both before and after entry)
- Setup invalidation levels
- Market regime changes
- Volatility impact on position

**Position Management:**
- Entry timing optimization
- Stop loss adjustments based on market structure
- Take profit scaling based on momentum
- Risk reduction strategies

**Recommendation Logic:**

**Before Entry (waiting_entry state):**
- **wait_entry**: Setup still valid, wait for price to reach entry
- **cancel_order**: Setup invalidated, pattern failed, or risk increased
- **move_stop_loss**: Adjust stop if market structure changed

**After Entry (entered state):**
- **hold**: Trade progressing normally
- **partial_exit**: Take some profits at key levels
- **full_exit**: Close entire position (target reached or risk management)
- **move_stop_loss**: Trail stop or adjust for better risk management

**Update Frequency Optimization:**
- **Pre-entry**: Monitor every 5-10 seconds when price near entry
- **Post-entry, first hour**: Monitor every 10-15 seconds for momentum
- **Stable position**: Monitor every 30-60 seconds
- **Near targets/stops**: Monitor every 5-10 seconds

**Output Requirements:**
- Accurately determine current trade state
- Provide precise P&L calculations (only if entered)
- Give clear distance measurements to all key levels
- Recommend appropriate actions based on current state
- Set adaptive monitoring intervals

**Previous Update Context:**
{{previousUpdate}}

**Current Price Context:** {{currentPrice}}

Analyze the following chart and provide intelligent trade monitoring with accurate entry detection:

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
    
    if (!output) {
      throw new Error('No output received from trade monitor');
    }
    
    // Post-process for enhanced entry detection logic
    const result = { ...output };
    
    // Parse prices for validation
    const currentPriceNum = parseFloat(result.tradeUpdate.currentPrice.replace(/[^\d.-]/g, ''));
    const entryPriceNum = parseFloat(input.activeTrade.entryPrice.replace(/[^\d.-]/g, ''));
    const isLongTrade = input.activeTrade.tradeType === 'long';
    
    // Validate entry logic
    let entryConfirmed = false;
    if (isLongTrade) {
      // For long trades, entry confirmed if current price reached or went below entry price
      entryConfirmed = currentPriceNum <= entryPriceNum * 1.005; // 0.5% tolerance
    } else {
      // For short trades, entry confirmed if current price reached or went above entry price
      entryConfirmed = currentPriceNum >= entryPriceNum * 0.995; // 0.5% tolerance
    }
    
    // Override AI decision if logic doesn't match
    if (!entryConfirmed && result.tradeUpdate.tradeState.status !== 'waiting_entry') {
      result.tradeUpdate.tradeState.status = 'waiting_entry';
      result.tradeUpdate.tradeState.entryConfirmed = false;
      result.tradeUpdate.positionStatus = 'waiting';
      result.tradeUpdate.recommendation = 'wait_entry';
      result.tradeUpdate.profitLoss = 'N/A (Not Entered)';
      result.tradeUpdate.reasoning = `Entry not confirmed. ${isLongTrade ? 'Long' : 'Short'} entry at ${input.activeTrade.entryPrice} requires price to ${isLongTrade ? 'reach or go below' : 'reach or go above'} entry level. Current: ${result.tradeUpdate.currentPrice}`;
    }
    
    // Adaptive monitoring intervals based on trade state and proximity to levels
    const entryDistance = Math.abs((currentPriceNum - entryPriceNum) / entryPriceNum);
    
    if (result.tradeUpdate.tradeState.status === 'waiting_entry') {
      if (entryDistance < 0.005) { // Within 0.5% of entry
        result.nextUpdateIn = 5; // Monitor very closely
      } else if (entryDistance < 0.02) { // Within 2% of entry
        result.nextUpdateIn = 10;
      } else {
        result.nextUpdateIn = 30; // Normal monitoring
      }
    } else if (result.tradeUpdate.tradeState.status === 'entered') {
      if (result.tradeUpdate.urgency === 'immediate') {
        result.nextUpdateIn = 5;
      } else if (result.tradeUpdate.urgency === 'high') {
        result.nextUpdateIn = 10;
      } else {
        result.nextUpdateIn = 20;
      }
    }
    
    return result;
  }
);