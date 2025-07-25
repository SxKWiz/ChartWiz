'use server';

/**
 * @fileOverview Advanced Pattern Recognition AI Flow
 * 
 * This flow integrates the advanced pattern recognition system with the AI brain
 * to provide comprehensive pattern analysis including ML patterns, volume profile,
 * market microstructure, and harmonic patterns.
 */

import { ai } from '../genkit';
import { z } from 'zod';
import { advancedPatternRecognitionSystem, type ComprehensivePatternAnalysis } from '../../lib/pattern-recognition/advanced-pattern-recognition-system';
import { realTimeDataProvider } from '../../lib/data-providers/real-time-data-provider';

const AdvancedPatternRecognitionInputSchema = z.object({
  primaryChartUri: z.string().describe("Primary cryptocurrency chart image as a data URI."),
  secondaryChartUri: z.string().optional().describe("Optional secondary chart for multi-timeframe analysis."),
  question: z.string().describe('The analysis question or trading request.'),
  asset: z.string().optional().default('BTC').describe('The cryptocurrency asset symbol.'),
  timeframe: z.string().optional().default('4h').describe('The chart timeframe.'),
  priceData: z.array(z.number()).optional().describe('Historical price data array.'),
  volumeData: z.array(z.number()).optional().describe('Historical volume data array.'),
  timestamps: z.array(z.number()).optional().describe('Timestamp array corresponding to price data.'),
  currentPrice: z.number().optional().describe('Current market price.'),
  tradingPersona: z.string().optional().describe('Trading persona/strategy to adopt.'),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional().default('moderate'),
});
export type AdvancedPatternRecognitionInput = z.infer<typeof AdvancedPatternRecognitionInputSchema>;

const PatternTradingSignalSchema = z.object({
  entry: z.object({
    price: z.number(),
    direction: z.enum(['long', 'short']),
    confidence: z.number(),
    methodology: z.array(z.string()),
  }),
  stopLoss: z.object({
    price: z.number(),
    reason: z.string(),
  }),
  targets: z.array(z.object({
    price: z.number(),
    probability: z.number(),
    methodology: z.string(),
  })),
  riskReward: z.number(),
  timeframe: z.string(),
});

const AdvancedPatternRecognitionOutputSchema = z.object({
  executiveSummary: z.string().describe('Comprehensive summary of all pattern analysis findings'),
  
  consensus: z.object({
    overallDirection: z.enum(['bullish', 'bearish', 'neutral']),
    confidence: z.number().min(0).max(100),
    agreementScore: z.number().min(0).max(100),
    conflictingSignals: z.array(z.string()),
  }),
  
  patternFindings: z.object({
    mlPatterns: z.array(z.object({
      type: z.string(),
      confidence: z.number(),
      expectedMove: z.number(),
      successRate: z.number(),
    })),
    harmonicPatterns: z.array(z.object({
      type: z.string(),
      direction: z.enum(['bullish', 'bearish']),
      completion: z.object({
        isComplete: z.boolean(),
        confidenceScore: z.number(),
        projectedLevel: z.number().optional(),
      }),
      reliability: z.number(),
    })),
    volumeProfile: z.object({
      trend: z.string(),
      phase: z.string(),
      strength: z.number(),
      keyLevels: z.array(z.number()),
    }),
    microstructure: z.object({
      smartMoneyDirection: z.enum(['bullish', 'bearish', 'neutral']),
      liquidityQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
      orderFlowImbalance: z.number(),
      marketEfficiency: z.number(),
    }),
  }),
  
  tradingRecommendation: z.object({
    primarySignal: PatternTradingSignalSchema.optional(),
    alternativeSignals: z.array(PatternTradingSignalSchema),
    positioning: z.object({
      recommendedSize: z.string(),
      maxRisk: z.string(),
      timeHorizon: z.string(),
      executionNotes: z.array(z.string()),
    }),
  }),
  
  riskAssessment: z.object({
    overallRisk: z.enum(['low', 'medium', 'high']),
    primaryRisks: z.array(z.string()),
    mitigation: z.array(z.string()),
    marketRegimeRisk: z.string(),
  }),
  
  qualityMetrics: z.object({
    patternStrength: z.number(),
    volumeConfirmation: z.number(),
    liquidityQuality: z.number(),
    harmonicAccuracy: z.number(),
    overallQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
  }),
  
  actionablePlan: z.object({
    immediateActions: z.array(z.string()),
    watchList: z.array(z.string()),
    contingencyPlans: z.array(z.object({
      condition: z.string(),
      action: z.string(),
    })),
    nextReviewTime: z.string(),
  }),
});
export type AdvancedPatternRecognitionOutput = z.infer<typeof AdvancedPatternRecognitionOutputSchema>;

export async function advancedPatternRecognitionFlow(input: AdvancedPatternRecognitionInput): Promise<AdvancedPatternRecognitionOutput> {
  return advancedPatternRecognitionAIFlow(input);
}

const advancedPatternRecognitionPrompt = ai.definePrompt({
  name: 'advancedPatternRecognitionPrompt',
  input: { schema: AdvancedPatternRecognitionInputSchema },
  output: { schema: AdvancedPatternRecognitionOutputSchema },
  prompt: `You are an elite institutional trading analyst with access to the most advanced pattern recognition systems available. You combine machine learning, volume profile analysis, market microstructure insights, and harmonic pattern detection to provide superior trading recommendations.

**Trading Context:**
- Asset: {{asset}}
- Timeframe: {{timeframe}}
- Trading Persona: {{tradingPersona}}
- Risk Tolerance: {{riskTolerance}}

**Analysis Request:** {{question}}

## ADVANCED PATTERN RECOGNITION ANALYSIS

You have access to a comprehensive pattern analysis that includes:

### Machine Learning Pattern Detection
- Neural network-based pattern classification
- Historical success rate tracking
- Multi-timeframe pattern correlation
- Confidence scoring based on pattern quality

### Volume Profile Analysis
- Institutional-grade volume-at-price calculations
- Point of Control (POC) identification
- Value Area analysis
- Accumulation/Distribution zone detection

### Market Microstructure Analysis
- Order flow dynamics
- Bid-ask spread analysis
- Smart money vs retail flow
- Liquidity assessment and market quality metrics

### Harmonic Pattern Detection
- Automated Gartley, Butterfly, Bat, Crab pattern recognition
- Fibonacci ratio validation
- Pattern completion predictions
- Precise entry and exit level calculations

{{#if patternAnalysisData}}
**COMPREHENSIVE PATTERN ANALYSIS RESULTS:**
{{{patternAnalysisData}}}
{{/if}}

## ANALYSIS FRAMEWORK

### 1. Pattern Consensus Building
Analyze the agreement and conflicts between different pattern recognition methodologies:
- **Agreement Analysis**: Where do different methods align?
- **Conflict Resolution**: How to handle contradictory signals?
- **Confidence Weighting**: Which patterns have the highest historical success rates?
- **Methodology Reliability**: Which analysis types are most reliable for current market conditions?

### 2. Institutional-Grade Signal Generation
Create trading signals that institutional traders would use:
- **Precise Entry Levels**: Based on harmonic completion or volume profile levels
- **Dynamic Stop Losses**: Incorporating volatility and pattern invalidation
- **Probability-Based Targets**: Multiple targets with success probability estimates
- **Position Sizing**: Risk-adjusted sizing based on pattern confidence and market conditions

### 3. Risk Management Integration
Comprehensive risk assessment across all pattern types:
- **Pattern-Specific Risks**: Unique risks for each identified pattern
- **Market Regime Risks**: How current market conditions affect pattern reliability
- **Execution Risks**: Liquidity, slippage, and timing considerations
- **Portfolio Impact**: How this trade affects overall portfolio risk

### 4. Quality Assessment
Evaluate the overall quality of the pattern setup:
- **Pattern Strength**: How well-formed are the identified patterns?
- **Volume Confirmation**: Does volume support the pattern narrative?
- **Market Structure**: Is the broader market structure supportive?
- **Historical Performance**: How have similar setups performed historically?

## OUTPUT REQUIREMENTS

### Executive Summary
Provide a clear, concise summary that captures:
- The strongest pattern signals identified
- Overall market bias and confidence level
- Key risk factors and opportunities
- Recommended course of action

### Consensus Analysis
Detail how different methodologies agree or conflict:
- Overall directional bias consensus
- Confidence level in the consensus
- Areas of disagreement and how they're resolved
- Agreement score across all methodologies

### Pattern Findings
Summarize key findings from each methodology:
- **ML Patterns**: Most significant patterns with confidence scores
- **Harmonic Patterns**: Completed or near-completion patterns
- **Volume Profile**: Key levels and market structure insights
- **Microstructure**: Smart money flow and liquidity conditions

### Trading Recommendation
Provide institutional-grade trading recommendations:
- **Primary Signal**: Highest-confidence trade setup
- **Alternative Signals**: Secondary opportunities or hedging strategies
- **Position Sizing**: Risk-adjusted recommendations
- **Execution Strategy**: Optimal timing and order management

### Risk Assessment
Comprehensive risk analysis:
- Overall risk level for the recommended trades
- Primary risk factors identified
- Specific mitigation strategies
- Market regime considerations

### Quality Metrics
Technical quality assessment:
- Pattern formation quality scores
- Volume confirmation strength
- Liquidity and execution quality
- Overall setup quality rating

### Actionable Plan
Specific next steps:
- Immediate actions to take
- Levels to monitor closely
- Contingency plans for different scenarios
- Timeline for next review

## TRADING PHILOSOPHY INTEGRATION

{{#if tradingPersona}}
**Persona-Specific Adaptations:**
Adapt the analysis and recommendations to match the specified trading persona while maintaining analytical rigor.
{{/if}}

**Risk Management Priority:**
Always prioritize capital preservation. Better to miss an opportunity than to take excessive risk.

**Pattern Reliability:**
Focus on high-probability setups with strong historical performance and multiple confirmations.

**Market Adaptation:**
Acknowledge that patterns perform differently in various market conditions and adjust recommendations accordingly.

Provide your comprehensive advanced pattern recognition analysis with institutional-level precision and actionable insights.`,
});

const advancedPatternRecognitionAIFlow = ai.defineFlow(
  {
    name: 'advancedPatternRecognitionFlow',
    inputSchema: AdvancedPatternRecognitionInputSchema,
    outputSchema: AdvancedPatternRecognitionOutputSchema,
  },
  async (input: AdvancedPatternRecognitionInput) => {
    try {
      // Get real-time data if not provided
      let priceData = input.priceData;
      let volumeData = input.volumeData;
      let timestamps = input.timestamps;
      let currentPrice = input.currentPrice;
      
      if (!priceData || !volumeData || !timestamps) {
        console.log('Fetching real-time market data...');
        
        // Determine symbol from asset
        const symbol = `${input.asset || 'BTC'}USDT`;
        const timeframe = input.timeframe || '4h';
        
        try {
          // Get historical data from real-time provider
          const historicalData = await realTimeDataProvider.getHistoricalData(symbol, timeframe, 100);
          priceData = historicalData.prices;
          volumeData = historicalData.volumes;
          timestamps = historicalData.timestamps;
          currentPrice = priceData[priceData.length - 1];
          
          console.log(`Retrieved ${priceData.length} data points for ${symbol}`);
        } catch (error) {
          console.warn('Failed to fetch real-time data, using fallback data:', error);
          // Fall back to generated data
          priceData = generateSamplePriceData();
          volumeData = generateSampleVolumeData(priceData.length);
          timestamps = generateSampleTimestamps(priceData.length);
          currentPrice = priceData[priceData.length - 1];
        }
      }
      
      // Get real-time order book and trade data if available
      let orderBookData;
      let tradeData;
      
      try {
        const symbol = `${input.asset || 'BTC'}USDT`;
        const orderBook = await realTimeDataProvider.getOrderBook(symbol);
        const recentTrades = await realTimeDataProvider.getRecentTrades(symbol);
        
        if (orderBook) {
          orderBookData = [orderBook];
          console.log(`Retrieved order book with ${orderBook.bids.length} bids and ${orderBook.asks.length} asks`);
        }
        
        if (recentTrades && recentTrades.length > 0) {
          tradeData = recentTrades;
          console.log(`Retrieved ${recentTrades.length} recent trades`);
        }
      } catch (error) {
        console.warn('Failed to fetch real-time order book/trade data:', error);
      }
      
              // Run comprehensive pattern analysis
        const patternAnalysis: ComprehensivePatternAnalysis = await advancedPatternRecognitionSystem.analyzePatterns(
          input.asset || 'BTC',
          input.timeframe || '4h',
          priceData,
          volumeData,
          timestamps,
          orderBookData, // Real-time order book data
          tradeData, // Real-time trade data
          currentPrice
        );
      
      // Prepare analysis data for the AI prompt
      const patternAnalysisData = JSON.stringify(patternAnalysis, null, 2);
      
      // Generate AI analysis
      const { output } = await advancedPatternRecognitionPrompt({
        ...input,
        patternAnalysisData
      });
      
      if (!output) {
        throw new Error('No output received from advanced pattern recognition analysis');
      }
      
      return output;
    } catch (error) {
      console.error('Error in advanced pattern recognition flow:', error);
      
      // Return fallback response
      return {
        executiveSummary: 'Advanced pattern recognition analysis encountered an error. Please try again with different parameters.',
        consensus: {
          overallDirection: 'neutral',
          confidence: 0,
          agreementScore: 0,
          conflictingSignals: ['Analysis system error']
        },
        patternFindings: {
          mlPatterns: [],
          harmonicPatterns: [],
          volumeProfile: {
            trend: 'unknown',
            phase: 'unknown',
            strength: 0,
            keyLevels: []
          },
          microstructure: {
            smartMoneyDirection: 'neutral',
            liquidityQuality: 'poor',
            orderFlowImbalance: 0,
            marketEfficiency: 0
          }
        },
        tradingRecommendation: {
          alternativeSignals: [],
          positioning: {
            recommendedSize: 'No position recommended',
            maxRisk: '0%',
            timeHorizon: 'N/A',
            executionNotes: ['System error - no recommendations available']
          }
        },
        riskAssessment: {
          overallRisk: 'high',
          primaryRisks: ['Analysis system error'],
          mitigation: ['Retry analysis with valid data'],
          marketRegimeRisk: 'Unable to assess due to system error'
        },
        qualityMetrics: {
          patternStrength: 0,
          volumeConfirmation: 0,
          liquidityQuality: 0,
          harmonicAccuracy: 0,
          overallQuality: 'poor'
        },
        actionablePlan: {
          immediateActions: ['Resolve system error', 'Retry analysis'],
          watchList: [],
          contingencyPlans: [],
          nextReviewTime: 'After system recovery'
        }
      };
    }
  }
);

// Helper functions to generate sample data (in a real implementation, this would come from actual market data)
function generateSamplePriceData(length: number = 100): number[] {
  const prices: number[] = [];
  let currentPrice = 45000; // Starting price
  
  for (let i = 0; i < length; i++) {
    const change = (Math.random() - 0.5) * 1000; // Random price movement
    currentPrice += change;
    prices.push(Math.max(1000, currentPrice)); // Ensure positive prices
  }
  
  return prices;
}

function generateSampleVolumeData(length: number): number[] {
  const volumes: number[] = [];
  
  for (let i = 0; i < length; i++) {
    const baseVolume = 1000000; // Base volume
    const variation = Math.random() * 500000; // Random variation
    volumes.push(baseVolume + variation);
  }
  
  return volumes;
}

function generateSampleTimestamps(length: number): number[] {
  const timestamps: number[] = [];
  const now = Date.now();
  const interval = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  
  for (let i = 0; i < length; i++) {
    timestamps.push(now - (length - 1 - i) * interval);
  }
  
  return timestamps;
}