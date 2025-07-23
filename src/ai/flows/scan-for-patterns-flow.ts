
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
    patternFound: z.boolean().describe('Set to true if a high-probability, actionable trading pattern is clearly identified. Otherwise, set to false.'),
    patternName: z.string().optional().describe('The name of the identified pattern (e.g., "Bull Flag", "Inverse Head and Shoulders").'),
    description: z.string().optional().describe('A very brief (1-2 sentence) description of the pattern and its implication.'),
});
export type ScanForPatternsOutput = z.infer<typeof ScanForPatternsOutputSchema>;


export async function scanForPatterns(input: ScanForPatternsInput): Promise<ScanForPatternsOutput> {
  return scanForPatternsFlow(input);
}

const scanForPatternsPrompt = ai.definePrompt({
  name: 'scanForPatternsPrompt',
  input: {schema: ScanForPatternsInputSchema},
  output: {schema: ScanForPatternsOutputSchema},
  prompt: `You are an automated trading pattern scanner. Your only task is to analyze the provided chart image and determine if a high-probability, actionable trading pattern is clearly visible and forming.

Your analysis must be quick and decisive. You are looking for well-defined patterns from the knowledge base below.

- **High-Probability Patterns to Scan For:**
  - Reversal Patterns: Head and Shoulders (Top & Inverse), Double/Triple Top/Bottom.
  - Continuation Patterns: Bull/Bear Flags, Pennants, Ascending/Descending Triangles.
  - Other Strong Patterns: Cup and Handle.

- **Criteria for a "Found" Pattern:**
  - The pattern must be clear and well-formed. Do not identify ambiguous or messy patterns.
  - It should be in a stage that suggests an upcoming trading opportunity (e.g., nearing a breakout, completing a formation).
  - Only identify ONE pattern per image - the most dominant and actionable one.

- **Output Rules:**
  - If a clear, high-probability pattern is identified, set \`patternFound\` to \`true\`, provide the \`patternName\`, and a brief \`description\`.
  - If no clear, actionable pattern is found, you MUST set \`patternFound\` to \`false\`. Do not try to find something that isn't there.

## Pattern Knowledge Base Snippets
- *Head and Shoulders Top*: Three peaks, middle highest (bearish reversal)
- *Inverse Head and Shoulders*: Three troughs, middle lowest (bullish reversal)
- *Double Top*: Two peaks at similar levels (bearish reversal)
- *Double Bottom*: Two troughs at similar levels (bullish reversal)
- *Ascending Triangle*: Flat top, rising lows (bullish continuation)
- *Descending Triangle*: Flat bottom, falling highs (bearish continuation)
- *Bull Flag*: Brief downward consolidation in uptrend
- *Bear Flag*: Brief upward consolidation in downtrend
- *Cup and Handle*: U-shaped base with small handle (bullish)

Analyze the following chart. Is there a clear, high-probability pattern?

Chart Image: {{media url=chartImageUri}}
`,
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
