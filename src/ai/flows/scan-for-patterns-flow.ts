
'use server';

/**
 * @fileOverview AI flow for proactively scanning a chart image for high-probability trading patterns.
 *
 * - scanForPatterns - The main function to scan a chart image.
 * - ScanForPatternsInput - The input type for the scanForPatterns function.
 * - ScanForPatternsOutput - The output type for the scanForPatterns function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanForPatternsInputSchema = z.object({
  chartImageUri: z
    .string()
    .describe(
      "A cryptocurrency chart image, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type ScanForPatternsInput = z.infer<typeof ScanForPatternsInputSchema>;

const ScanForPatternsOutputSchema = z.object({
  primaryTrend: z
    .string()
    .describe(
      'Identify the primary trend (e.g., Uptrend, Downtrend, Sideways/Ranging).'
    ),
  supportResistance: z
    .string()
    .describe(
      'Locate key support and resistance levels. Mention price points if possible.'
    ),
  volumeAnalysis: z
    .string()
    .describe(
      'Analyze the volume. Is it confirming the trend? Is it increasing or decreasing? Any unusual spikes?'
    ),
  synthesis: z
    .string()
    .describe(
      'Synthesize the above findings to determine if a pattern is forming.'
    ),
  patternFound: z
    .boolean()
    .describe(
      'Based on your synthesis, is a high-probability, actionable trading pattern clearly identified?'
    ),
  patternName: z
    .string()
    .optional()
    .describe(
      'If a pattern is found, what is its name? (e.g., "Bull Flag", "Inverse Head and Shoulders")'
    ),
  confidenceScore: z
    .number()
    .optional()
    .describe(
      'If a pattern is found, what is the confidence score (0-100)?'
    ),
  description: z
    .string()
    .optional()
    .describe(
      'A very brief (1-2 sentence) summary of the pattern and its implication.'
    ),
});
export type ScanForPatternsOutput = z.infer<typeof ScanForPatternsOutputSchema>;


export async function scanForPatterns(input: ScanForPatternsInput): Promise<ScanForPatternsOutput> {
  return scanForPatternsFlow(input);
}

const scanForPatternsPrompt = ai.definePrompt({
  name: 'scanForPatternsPrompt',
  input: {schema: ScanForPatternsInputSchema},
  output: {schema: ScanForPatternsOutputSchema},
  prompt: `You are an expert technical analyst. Your task is to analyze the provided chart image using a structured, step-by-step "Chain-of-Thought" process to identify high-probability trading patterns.

**Analysis Steps (Chain-of-Thought):**

1.  **Primary Trend Identification:** What is the dominant market trend? Look at the overall direction of the price over the entire visible period of the chart.
2.  **Support and Resistance Analysis:** Identify the key horizontal or diagonal levels where the price has repeatedly paused or reversed. These are your support (floor) and resistance (ceiling) levels.
3.  **Volume Pattern Analysis:** Examine the volume bars at the bottom. Does volume increase when the price moves with the primary trend? Are there any significant volume spikes, and do they correspond to key price movements (like a breakout attempt)?
4.  **Synthesis and Pattern Identification:** Based on your analysis of trend, levels, and volume, synthesize your findings. Does the price action conform to a known reversal or continuation pattern from the list below? Describe your reasoning.

- **High-Probability Patterns to Scan For:**

  - **Reversal Patterns:**
    - **Head and Shoulders (Top):** A bearish reversal pattern after an uptrend. It has three peaks: a higher peak (head) between two lower peaks (shoulders). The neckline connects the lows between the peaks. **Volume:** Volume is often highest on the left shoulder, lower on the head, and lowest on the right shoulder. A high-volume breakdown below the neckline is a strong confirmation.
    - **Inverse Head and Shoulders:** A bullish reversal pattern after a downtrend. It has three troughs: a lower trough (head) between two higher troughs (shoulders). **Volume:** Volume is often high during the left shoulder's decline, decreases on the head, and picks up on the right shoulder's rally. A strong volume surge on the breakout above the neckline is key.
    - **Double/Triple Top:** A bearish reversal pattern where the price hits a resistance level two or three times. **Volume:** Volume often decreases on each successive peak, showing fading buying interest. A volume increase on the breakdown below the support (the lows between the peaks) confirms the reversal.
    - **Double/Triple Bottom:** A bullish reversal pattern where the price finds support two or three times. **Volume:** Volume is often lower on the second/third bottom, indicating selling pressure is drying up. A significant volume increase on the breakout above resistance confirms the reversal.

  - **Continuation Patterns:**
    - **Bull/Bear Flags:** A brief pause after a strong move (the flagpole). The flag is a small rectangular or channel pattern sloping against the prevailing trend. **Volume:** Volume should be high during the flagpole and low during the flag's consolidation. The breakout from the flag should occur on a surge of volume.
    - **Pennants:** Similar to flags, but the consolidation phase is a small symmetrical triangle. **Volume:** Same as flags - high on the flagpole, low during the pennant, and high on the breakout.
    - **Ascending/Descending Triangles:** An ascending triangle has a flat top (resistance) and a rising bottom trendline (support). A descending triangle has a flat bottom (support) and a falling top trendline (resistance). They are typically continuation patterns but can sometimes be reversal patterns. **Volume:** Volume tends to contract as the pattern develops, then expands significantly on the breakout.

  - **Other Strong Patterns:**
    - **Cup and Handle:** A bullish continuation or reversal pattern that looks like a rounding bottom (the cup) followed by a smaller, shorter-term consolidation (the handle). **Volume:** Volume should be high on the left side of the cup, diminish at the bottom, and increase on the right side. The handle should form on low volume, and the breakout above the handle's resistance should be on high volume.

**Output Rules:**

- You MUST follow the Chain-of-Thought process and fill out every field in the output schema.
- Your analysis must be objective. If no clear pattern is present, state that in your synthesis.
- Only set 'patternFound' to 'true' if a pattern is clearly formed and presents a potential trading opportunity.

Analyze the following chart using the Chain-of-Thought process.

Chart Image: {{media url=chartImageUri}}`,
});

const scanForPatternsFlow = ai.defineFlow(
  {
    name: 'scanForPatternsFlow',
    inputSchema: ScanForPatternsInputSchema,
    outputSchema: ScanForPatternsOutputSchema,
  },
  async input => {
    const {output} = await scanForPatternsPrompt(input);
    return output!;
  }
);
