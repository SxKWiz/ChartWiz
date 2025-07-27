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

const ChartPointSchema = z.object({
  x: z.number().describe('X coordinate on the chart image'),
  y: z.number().describe('Y coordinate on the chart image'),
  price: z.number().optional().describe('Corresponding price value'),
  timestamp: z.number().optional().describe('Corresponding timestamp'),
});

const ChartDrawingAnalysisInputSchema = z.object({
  chartImageUri: z.string().describe('Chart image as a data URI'),
  clickPoint: ChartPointSchema.describe('Point where user clicked on the chart'),
  imageWidth: z.number().describe('Width of the chart image in pixels'),
  imageHeight: z.number().describe('Height of the chart image in pixels'),
  analysisType: z.enum(['auto', 'support_resistance', 'trendlines', 'patterns', 'fibonacci', 'comprehensive']).optional().default('auto').describe('Type of analysis to perform'),
  tradingPersona: z.string().optional().describe('Trading persona to adopt for analysis'),
});

export type ChartDrawingAnalysisInput = z.infer<typeof ChartDrawingAnalysisInputSchema>;

const PatternDrawingSchema = z.object({
  id: z.string(),
  type: z.enum(['support', 'resistance', 'trendline', 'pattern', 'fibonacci', 'volume', 'signal']),
  name: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(100),
  points: z.array(ChartPointSchema),
  style: z.object({
    color: z.string().describe('Hex color code for the drawing'),
    strokeWidth: z.number(),
    strokeDasharray: z.string().optional(),
    fillOpacity: z.number().optional(),
  }),
  metadata: z.object({
    patternType: z.string().optional(),
    direction: z.enum(['bullish', 'bearish', 'neutral']).optional(),
    strength: z.number().optional(),
    timeframe: z.string().optional(),
    priceTargets: z.array(z.number()).optional(),
  }).optional(),
});

const ChartDrawingAnalysisOutputSchema = z.object({
  analysis: z.string().describe('Detailed analysis of the chart at the clicked location'),
  
  keyLevels: z.object({
    support: z.array(z.object({
      price: z.number(),
      coordinates: z.array(ChartPointSchema),
      strength: z.number().min(0).max(100),
      touches: z.number(),
      description: z.string(),
    })),
    resistance: z.array(z.object({
      price: z.number(),
      coordinates: z.array(ChartPointSchema),
      strength: z.number().min(0).max(100),
      touches: z.number(),
      description: z.string(),
    })),
  }),
  
  trendLines: z.object({
    uptrend: z.array(z.object({
      points: z.array(ChartPointSchema),
      strength: z.number(),
      description: z.string(),
      slope: z.number(),
    })),
    downtrend: z.array(z.object({
      points: z.array(ChartPointSchema),
      strength: z.number(),
      description: z.string(),
      slope: z.number(),
    })),
  }),
  
  patterns: z.array(z.object({
    name: z.string(),
    type: z.enum(['continuation', 'reversal', 'consolidation']),
    direction: z.enum(['bullish', 'bearish', 'neutral']),
    coordinates: z.array(ChartPointSchema),
    confidence: z.number().min(0).max(100),
    description: z.string(),
    targets: z.array(z.number()).optional(),
    completion: z.number().min(0).max(100),
  })),
  
  fibonacci: z.object({
    retracement: z.object({
      start: ChartPointSchema,
      end: ChartPointSchema,
      levels: z.array(z.object({
        level: z.number(),
        price: z.number(),
        coordinates: ChartPointSchema,
        description: z.string(),
      })),
    }).optional(),
    extension: z.object({
      start: ChartPointSchema,
      end: ChartPointSchema,
      levels: z.array(z.object({
        level: z.number(),
        price: z.number(),
        coordinates: ChartPointSchema,
        description: z.string(),
      })),
    }).optional(),
  }),
  
  zones: z.object({
    accumulation: z.array(z.object({
      topLeft: ChartPointSchema,
      bottomRight: ChartPointSchema,
      description: z.string(),
      strength: z.number(),
    })),
    distribution: z.array(z.object({
      topLeft: ChartPointSchema,
      bottomRight: ChartPointSchema,
      description: z.string(),
      strength: z.number(),
    })),
    demand: z.array(z.object({
      coordinates: z.array(ChartPointSchema),
      description: z.string(),
      strength: z.number(),
    })),
    supply: z.array(z.object({
      coordinates: z.array(ChartPointSchema),
      description: z.string(),
      strength: z.number(),
    })),
  }),
  
  annotations: z.array(z.object({
    text: z.string(),
    position: ChartPointSchema,
    type: z.enum(['entry', 'exit', 'warning', 'opportunity', 'info']),
    color: z.string(),
    fontSize: z.number().optional(),
  })),
  
  tradingSignals: z.array(z.object({
    type: z.enum(['buy', 'sell', 'wait']),
    coordinates: ChartPointSchema,
    confidence: z.number().min(0).max(100),
    reasoning: z.string(),
    targets: z.array(z.number()).optional(),
    stopLoss: z.number().optional(),
  })),
  
  drawings: z.array(PatternDrawingSchema),
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

**Technical Drawing Guidelines:**

1. **Coordinate System:**
   - Use pixel coordinates relative to the image (0,0 is top-left)
   - For horizontal lines: start at x=0, end at x={{imageWidth}}
   - For trendlines: identify at least 2 touch points and extend the line
   - Ensure all coordinates are within image bounds

2. **Support and Resistance Levels:**
   - Identify horizontal price levels where price has repeatedly bounced
   - Look for at least 2-3 touches to confirm a level
   - Measure strength by number of touches and time span
   - Provide exact Y coordinates for horizontal lines

3. **Trendlines:**
   - Identify ascending/descending trendlines connecting swing lows/highs
   - Require minimum 2 touch points, prefer 3+ for stronger lines
   - Calculate slope and project future trajectory
   - Distinguish between support and resistance trendlines

4. **Chart Patterns:**
   - Identify classic patterns: triangles, flags, wedges, head & shoulders, etc.
   - Map out the pattern boundaries with precise coordinates
   - Calculate pattern targets and breakout levels
   - Assess pattern completion percentage

5. **Fibonacci Analysis:**
   - Identify significant swing high and low points for retracement
   - Calculate key Fibonacci levels (23.6%, 38.2%, 50%, 61.8%, 78.6%)
   - Provide coordinates for each level
   - Consider extension levels for targets

6. **Volume Analysis:**
   - Identify volume spikes and correlate with price action
   - Mark accumulation/distribution zones
   - Note volume divergences

7. **Trading Signals:**
   - Mark potential entry/exit points based on technical analysis
   - Provide confidence scores and reasoning
   - Include stop-loss and target suggestions

**Color Coding System:**
- Support levels: #22c55e (green)
- Resistance levels: #ef4444 (red)
- Uptrend lines: #3b82f6 (blue)
- Downtrend lines: #f59e0b (amber)
- Fibonacci levels: #8b5cf6 (purple)
- Patterns: #ec4899 (pink)
- Volume zones: #6b7280 (gray)
- Signals: #10b981 (emerald) for buy, #f87171 (red) for sell

**Critical Requirements:**
1. All coordinates must be accurate pixel positions within the image bounds
2. Provide meaningful descriptions for each drawing element
3. Include confidence scores based on technical validity
4. Focus on actionable trading information
5. Consider the click point as the area of primary interest
6. Generate at least 3-5 meaningful technical drawings
7. Ensure drawings are visually clear and don't overlap unnecessarily

**Analysis Process:**
1. First, analyze the overall chart trend and market structure
2. Identify key price levels around the click point
3. Look for patterns and formations
4. Calculate Fibonacci levels if applicable swing points are visible
5. Generate trading signals based on technical confluence
6. Create precise coordinate mappings for all drawings

Chart Image: {{media url=chartImageUri}}

Analyze the chart thoroughly and provide comprehensive technical drawing annotations that would help a trader make informed decisions.`,
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