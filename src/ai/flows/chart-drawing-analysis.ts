'use server';

/**
 * @fileOverview AI flow for generating technical drawing annotations on chart images.
 * 
 * This flow analyzes a chart image and click coordinates to generate precise
 * drawing overlays including support/resistance levels, trendlines, patterns,
 * fibonacci retracements, and trading signals.
 */

import { ai } from '../genkit';
import { z } from 'zod';

const ChartDrawingAnalysisInputSchema = z.object({
  chartImageUri: z.string().describe('Chart image as a data URI'),
  clickPoint: z.object({
    x: z.number(),
    y: z.number(),
  }).describe('Point where user clicked on the chart'),
  imageWidth: z.number().describe('Width of the chart image in pixels'),
  imageHeight: z.number().describe('Height of the chart image in pixels'),
  analysisType: z.enum(['auto', 'support_resistance', 'trendlines', 'patterns', 'fibonacci', 'comprehensive']).optional().default('auto').describe('Type of analysis to perform'),
  tradingPersona: z.string().optional().describe('Trading persona to adopt for analysis'),
});

export type ChartDrawingAnalysisInput = z.infer<typeof ChartDrawingAnalysisInputSchema>;

const ChartDrawingAnalysisOutputSchema = z.object({
  analysis: z.string().describe('Detailed analysis of the chart at the clicked location'),
  
  supportLevels: z.array(z.object({
    price: z.number(),
    yCoordinate: z.number(),
    strength: z.number().min(0).max(100),
    description: z.string(),
  })).describe('Identified support levels'),
  
  resistanceLevels: z.array(z.object({
    price: z.number(),
    yCoordinate: z.number(),
    strength: z.number().min(0).max(100),
    description: z.string(),
  })).describe('Identified resistance levels'),
  
  trendLines: z.array(z.object({
    type: z.enum(['uptrend', 'downtrend']),
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    strength: z.number().min(0).max(100),
    description: z.string(),
  })).describe('Identified trend lines'),
  
  patterns: z.array(z.object({
    name: z.string(),
    type: z.enum(['bullish', 'bearish', 'neutral']),
    confidence: z.number().min(0).max(100),
    description: z.string(),
    coordinates: z.string().describe('Comma-separated coordinates as "x1,y1,x2,y2,x3,y3"'),
  })).describe('Chart patterns found'),
  
  fibonacciLevels: z.array(z.object({
    level: z.string(),
    price: z.number(),
    yCoordinate: z.number(),
    description: z.string(),
  })).describe('Fibonacci retracement levels if applicable'),
  
  tradingSignals: z.array(z.object({
    type: z.enum(['buy', 'sell', 'wait']),
    x: z.number(),
    y: z.number(),
    confidence: z.number().min(0).max(100),
    reasoning: z.string(),
  })).describe('Trading signals at specific coordinates'),
  
  keyInsights: z.array(z.string()).describe('Key insights and observations'),
});

export type ChartDrawingAnalysisOutput = z.infer<typeof ChartDrawingAnalysisOutputSchema>;

export async function analyzeChartDrawing(input: ChartDrawingAnalysisInput): Promise<ChartDrawingAnalysisOutput> {
  return chartDrawingAnalysisFlow(input);
}

const chartDrawingAnalysisPrompt = ai.definePrompt({
  name: 'chartDrawingAnalysisPrompt',
  input: { schema: ChartDrawingAnalysisInputSchema },
  output: { schema: ChartDrawingAnalysisOutputSchema },
  prompt: `You are an expert technical analyst and chart drawing specialist. Your task is to analyze the provided cryptocurrency chart image and generate precise technical drawing overlays based on the user's click location.

**Context:**
- Chart image dimensions: {{imageWidth}} x {{imageHeight}} pixels
- User clicked at coordinates: ({{clickPoint.x}}, {{clickPoint.y}})
- Analysis type: {{analysisType}}
{{#if tradingPersona}}
- Trading persona: {{tradingPersona}}
{{/if}}

**Your Task:**
Analyze the chart image and generate technical drawing annotations that would be useful for trading analysis. Focus on the area around the click point but consider the entire chart context.

**Analysis Guidelines:**

1. **Support and Resistance Levels:**
   - Identify horizontal price levels where price has repeatedly bounced
   - Provide the Y coordinate (pixel position) and estimated price
   - Rate strength 1-100 based on number of touches and significance

2. **Trend Lines:**
   - Identify ascending/descending trendlines connecting swing points
   - Provide start and end coordinates (x1,y1 to x2,y2)
   - Rate strength based on number of touches and trend clarity

3. **Chart Patterns:**
   - Look for triangles, flags, head & shoulders, etc.
   - Provide key coordinates as comma-separated string
   - Assess bullish/bearish bias and confidence

4. **Fibonacci Levels:**
   - If significant swing high/low visible, calculate key retracements
   - Focus on 38.2%, 50%, 61.8% levels
   - Provide Y coordinates and price estimates

5. **Trading Signals:**
   - Mark potential entry/exit points near the click area
   - Provide reasoning and confidence assessment

**Critical Requirements:**
- All coordinates must be within image bounds (0 to {{imageWidth}} for X, 0 to {{imageHeight}} for Y)
- Focus analysis around the clicked point ({{clickPoint.x}}, {{clickPoint.y}})
- Provide practical, actionable trading information
- Keep descriptions concise but informative

Chart Image: {{media url=chartImageUri}}

Analyze the chart and provide technical drawing coordinates and insights.`,
});

const chartDrawingAnalysisFlow = ai.defineFlow(
  {
    name: 'chartDrawingAnalysisFlow',
    inputSchema: ChartDrawingAnalysisInputSchema,
    outputSchema: ChartDrawingAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await chartDrawingAnalysisPrompt(input);
    return output!;
  }
);