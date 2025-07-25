'use server';

/**
 * @fileOverview Comprehensive AI Brain that orchestrates multiple analysis flows
 * to provide superior, multi-dimensional trade recommendations.
 */

import {ai} from '../genkit';
import {z} from 'zod';
import { enhancedMarketAnalysis, type EnhancedMarketAnalysisInput, type EnhancedMarketAnalysisOutput } from './enhanced-market-analysis';
import { marketSentimentAnalysis, type MarketSentimentAnalysisInput, type MarketSentimentAnalysisOutput } from './market-sentiment-analyzer';
import { scanForPatterns, type ScanForPatternsInput, type ScanForPatternsOutput } from './scan-for-patterns-flow';
import { validateAndEnhanceRecommendation, type RawRecommendation } from '../../lib/recommendation-processor';
import { generateAnalysisContext } from '../../lib/chart-analysis-helpers';

const ComprehensiveAnalysisInputSchema = z.object({
  primaryChartUri: z.string().describe("Primary cryptocurrency chart image as a data URI."),
  secondaryChartUri: z.string().optional().describe("Optional secondary chart for multi-timeframe analysis."),
  question: z.string().describe('The analysis question or trading request.'),
  tradingPersona: z.string().optional().describe('Trading persona/strategy to adopt.'),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional().default('moderate'),
  marketDataText: z.string().optional().describe("Additional market context (news, sentiment, etc.)"),
  newsData: z.array(z.object({
    headline: z.string(),
    content: z.string().optional(),
    source: z.string(),
    timestamp: z.string(),
    impact: z.enum(['high', 'medium', 'low']).optional(),
  })).optional().describe("Recent news articles"),
  socialData: z.array(z.object({
    platform: z.enum(['twitter', 'reddit', 'telegram', 'discord', 'other']),
    content: z.string(),
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    engagement: z.number().optional(),
    timestamp: z.string(),
  })).optional().describe("Social media sentiment data"),
  onChainData: z.object({
    whaleMovements: z.array(z.string()).optional(),
    exchangeFlows: z.string().optional(),
    fundingRates: z.string().optional(),
    openInterest: z.string().optional(),
    liquidations: z.string().optional(),
  }).optional().describe("On-chain and derivatives data"),
});
export type ComprehensiveAnalysisInput = z.infer<typeof ComprehensiveAnalysisInputSchema>;

const SynthesizedRecommendationSchema = z.object({
  entryPrice: z.object({
    value: z.string(),
    reason: z.string(),
    confidence: z.number().min(0).max(100),
    consensusScore: z.number().min(0).max(100).describe('Agreement across analysis methods'),
  }),
  takeProfit: z.array(z.object({
    value: z.string(),
    reason: z.string(),
    probability: z.number().min(0).max(100),
    partialExit: z.number().min(0).max(100),
    confluenceFactors: z.array(z.string()).describe('Technical factors supporting this target'),
  })),
  stopLoss: z.object({
    value: z.string(),
    reason: z.string(),
    trailing: z.boolean(),
    volatilityAdjusted: z.boolean(),
  }),
  positionSizing: z.object({
    recommendedRisk: z.number().describe('Recommended risk percentage of account'),
    maxPositionSize: z.string(),
    scalingStrategy: z.string(),
    sentimentAdjustment: z.string().describe('Position size adjustment based on sentiment'),
  }),
  riskRewardRatio: z.string(),
  timeHorizon: z.string(),
  probabilityOfSuccess: z.number().min(0).max(100).describe('Estimated probability based on all factors'),
});

const ConsensuAnalysisSchema = z.object({
  technicalConsensus: z.string().describe('Consensus from technical analysis methods'),
  sentimentConsensus: z.string().describe('Consensus from sentiment analysis'),
  patternConsensus: z.string().describe('Consensus from pattern recognition'),
  conflictingSignals: z.array(z.string()).describe('Any conflicting signals across methods'),
  overallConfidence: z.number().min(0).max(100).describe('Overall confidence in the analysis'),
  keyFactors: z.array(z.string()).describe('Most important factors driving the recommendation'),
});

const ComprehensiveAnalysisOutputSchema = z.object({
  executiveSummary: z.string().describe('High-level summary of the comprehensive analysis'),
  consensusAnalysis: ConsensuAnalysisSchema,
  synthesizedRecommendation: SynthesizedRecommendationSchema,
  technicalAnalysis: z.object({
    summary: z.string(),
    keyLevels: z.array(z.string()),
    patterns: z.array(z.string()),
    indicators: z.array(z.string()),
  }),
  sentimentAnalysis: z.object({
    summary: z.string(),
    score: z.number().min(-100).max(100),
    contrarian: z.boolean(),
    keyDrivers: z.array(z.string()),
  }).optional(),
  riskManagement: z.object({
    primaryRisks: z.array(z.string()),
    mitigation: z.array(z.string()),
    marketRegimeRisk: z.string(),
    portfolioImpact: z.string(),
  }),
  monitoringPlan: z.object({
    criticalLevels: z.array(z.string()),
    indicators: z.array(z.string()),
    timeframes: z.array(z.string()),
    exitTriggers: z.array(z.string()),
  }),
  alternativeScenarios: z.array(z.object({
    scenario: z.string(),
    probability: z.number().min(0).max(100),
    implication: z.string(),
    action: z.string(),
  })),
  tradingPlan: z.object({
    preMarket: z.string().describe('Pre-trade preparation steps'),
    entry: z.string().describe('Entry execution plan'),
    management: z.string().describe('Trade management strategy'),
    exit: z.string().describe('Exit strategy and criteria'),
  }),
});
export type ComprehensiveAnalysisOutput = z.infer<typeof ComprehensiveAnalysisOutputSchema>;

export async function comprehensiveAIBrain(input: ComprehensiveAnalysisInput): Promise<ComprehensiveAnalysisOutput> {
  return comprehensiveAnalysisFlow(input);
}

const comprehensiveAnalysisPrompt = ai.definePrompt({
  name: 'comprehensiveAnalysisPrompt',
  input: {schema: ComprehensiveAnalysisInputSchema},
  output: {schema: ComprehensiveAnalysisOutputSchema},
  prompt: `You are an elite AI trading brain that synthesizes multiple analysis methods to provide superior trade recommendations. You have access to the results of specialized analysis modules and must now create a comprehensive, multi-dimensional trading strategy.

**Your Role:** Master Trading Strategist and Risk Manager
**Trading Persona:** {{tradingPersona}}
**Risk Tolerance:** {{riskTolerance}}

## COMPREHENSIVE ANALYSIS FRAMEWORK

### 1. MULTI-DIMENSIONAL SYNTHESIS

You are provided with the results from multiple specialized analysis modules:

{{#if technicalAnalysisResult}}
**Technical Analysis Results:**
{{{technicalAnalysisResult}}}
{{/if}}

{{#if sentimentAnalysisResult}}
**Sentiment Analysis Results:**
{{{sentimentAnalysisResult}}}
{{/if}}

{{#if patternAnalysisResult}}
**Pattern Recognition Results:**
{{{patternAnalysisResult}}}
{{/if}}

### 2. CONSENSUS BUILDING METHODOLOGY

**Technical Consensus Rules:**
- Weight each technical method by historical reliability
- Identify confluence areas where multiple methods agree
- Flag conflicting signals for risk assessment
- Prioritize institutional-level technical factors

**Sentiment Integration Rules:**
- Use sentiment as a contrarian indicator for extreme readings
- Align sentiment with technical analysis for confluence
- Adjust position sizing based on sentiment extremes
- Consider sentiment regime changes as trade catalysts

**Pattern Validation Rules:**
- Require volume confirmation for pattern validity
- Cross-reference patterns with support/resistance levels
- Apply Fibonacci relationships for target validation
- Use multiple timeframe pattern confirmation

### 3. PROBABILITY ASSESSMENT FRAMEWORK

**Success Probability Calculation:**
- Base probability: Technical analysis confidence (40%)
- Sentiment adjustment: +/- 15% based on sentiment alignment
- Pattern confirmation: +/- 20% based on pattern strength
- Market regime: +/- 15% based on broader market context
- Risk management quality: +/- 10% based on R/R and stops

**Confidence Scoring:**
- 90-100%: Extremely high confidence (rare, perfect alignment)
- 80-89%: High confidence (strong confluence, minimal conflicts)
- 70-79%: Good confidence (solid setup, minor conflicts)
- 60-69%: Moderate confidence (mixed signals, proceed with caution)
- Below 60%: Low confidence (conflicting signals, consider avoiding)

### 4. ADVANCED RISK MANAGEMENT INTEGRATION

**Dynamic Position Sizing:**
- Base size: Risk tolerance percentage
- Sentiment adjustment: Reduce for extreme sentiment
- Volatility adjustment: Reduce for high volatility periods
- Confluence bonus: Increase for high-confluence setups
- Market regime penalty: Reduce for unfavorable regimes

**Stop Loss Optimization:**
- Technical stops: Based on key levels and pattern invalidation
- Volatility stops: ATR-based for volatile conditions
- Time stops: For momentum strategies
- Sentiment stops: For extreme sentiment reversals

### 5. TRADE EXECUTION STRATEGY

**Entry Timing:**
- Optimal entry zones based on technical confluence
- Sentiment-driven entry timing adjustments
- Pattern completion entry triggers
- Volume confirmation requirements

**Position Management:**
- Scaling strategies for different confidence levels
- Partial profit-taking at confluence levels
- Trail stop advancement rules
- Risk reduction protocols

### 6. MONITORING AND ADAPTATION

**Critical Monitoring Points:**
- Technical level breaches
- Sentiment regime changes
- Pattern invalidation signals
- Volume divergences
- Market structure breaks

**Adaptation Triggers:**
- Confidence level changes
- New conflicting information
- Market regime shifts
- Unexpected volatility spikes

## SYNTHESIS REQUIREMENTS

**Conflict Resolution:**
When analysis methods conflict, prioritize based on:
1. Historical reliability of the method
2. Strength of the conflicting signals
3. Market regime compatibility
4. Risk-reward implications

**Uncertainty Management:**
- Clearly identify areas of uncertainty
- Provide probability ranges rather than point estimates
- Include multiple scenarios with different probabilities
- Recommend reduced position sizing for high uncertainty

**Actionability:**
- Every recommendation must be immediately actionable
- Include specific price levels, timing, and sizing
- Provide clear monitoring criteria
- Define specific exit conditions

## OUTPUT SPECIFICATIONS

**Executive Summary Requirements:**
- 2-3 sentences maximum
- Include overall bias, confidence level, and key catalyst
- Mention primary risk factor
- State recommended action clearly

**Consensus Analysis:**
- Identify where methods agree (confluence)
- Highlight any conflicting signals
- Explain how conflicts are resolved
- Provide overall confidence assessment

**Synthesized Recommendation:**
- Integrate all analysis methods into unified recommendation
- Include probability-based target levels
- Provide sentiment-adjusted position sizing
- Include confluence-based confidence scores

**Risk Management Focus:**
- Identify all significant risk factors
- Provide specific mitigation strategies
- Include portfolio impact assessment
- Consider correlation risks

**Monitoring Plan:**
- Specify exactly what to watch
- Include multiple timeframes
- Define clear action triggers
- Provide exit acceleration criteria

User Question: {{{question}}}

Synthesize all available analysis into a comprehensive, actionable trading strategy.`,
});

const comprehensiveAnalysisFlow = ai.defineFlow(
  {
    name: 'comprehensiveAnalysisFlow',
    inputSchema: ComprehensiveAnalysisInputSchema,
    outputSchema: ComprehensiveAnalysisOutputSchema,
  },
  async (input: ComprehensiveAnalysisInput) => {
    // Extract context from the question
    const context = generateAnalysisContext(input.question);
    
    // Run parallel analysis flows
    const analysisPromises: Promise<any>[] = [];
    
    // Enhanced Market Analysis
    const enhancedAnalysisInput: EnhancedMarketAnalysisInput = {
      primaryChartUri: input.primaryChartUri,
      secondaryChartUri: input.secondaryChartUri,
      question: input.question,
      tradingPersona: input.tradingPersona,
      riskTolerance: input.riskTolerance,
      marketDataText: input.marketDataText,
    };
    analysisPromises.push(enhancedMarketAnalysis(enhancedAnalysisInput));
    
    // Pattern Scanning
    const patternInput: ScanForPatternsInput = {
      chartImageUri: input.primaryChartUri,
    };
    analysisPromises.push(scanForPatterns(patternInput));
    
    // Sentiment Analysis (if data available)
    let sentimentPromise: Promise<MarketSentimentAnalysisOutput | null> = Promise.resolve(null);
    if (input.newsData || input.socialData || input.onChainData) {
      const sentimentInput: MarketSentimentAnalysisInput = {
        newsData: input.newsData,
        socialData: input.socialData,
        onChainData: input.onChainData,
        asset: context.asset || 'BTC',
        timeframe: '24h',
      };
      sentimentPromise = marketSentimentAnalysis(sentimentInput);
    }
    analysisPromises.push(sentimentPromise);
    
    try {
      // Wait for all analyses to complete
      const [enhancedResult, patternResult, sentimentResult] = await Promise.all(analysisPromises);
      
      // Prepare the synthesis prompt with results
      const synthesisInput = {
        ...input,
        technicalAnalysisResult: JSON.stringify(enhancedResult, null, 2),
        patternAnalysisResult: JSON.stringify(patternResult, null, 2),
        sentimentAnalysisResult: sentimentResult ? JSON.stringify(sentimentResult, null, 2) : undefined,
      };
      
      const {output} = await comprehensiveAnalysisPrompt(synthesisInput);
      
      if (!output) {
        throw new Error('No output received from comprehensive analysis');
      }
      
      // Post-process the synthesized recommendation
      try {
        const rawRecommendation: RawRecommendation = {
          entryPrice: {
            value: output.synthesizedRecommendation.entryPrice.value,
            reason: output.synthesizedRecommendation.entryPrice.reason
          },
          takeProfit: output.synthesizedRecommendation.takeProfit.map(tp => ({
            value: tp.value,
            reason: tp.reason
          })),
          stopLoss: {
            value: output.synthesizedRecommendation.stopLoss.value,
            reason: output.synthesizedRecommendation.stopLoss.reason
          },
          riskRewardRatio: output.synthesizedRecommendation.riskRewardRatio
        };
        
        const { enhanced, validation } = validateAndEnhanceRecommendation(
          rawRecommendation,
          context.currentPrice || undefined,
          context.asset || undefined
        );
        
        // Log validation for monitoring
        if (validation.warnings.length > 0) {
          console.warn('Comprehensive analysis validation warnings:', validation.warnings);
        }
        
        if (validation.errors.length > 0) {
          console.error('Comprehensive analysis validation errors:', validation.errors);
          // Continue with original output if validation fails
          return output;
        }
        
        // Return enhanced output
        return {
          ...output,
          synthesizedRecommendation: {
            ...output.synthesizedRecommendation,
            entryPrice: {
              ...output.synthesizedRecommendation.entryPrice,
              value: enhanced.entryPrice.value || output.synthesizedRecommendation.entryPrice.value,
            },
            takeProfit: output.synthesizedRecommendation.takeProfit.map((tp, index) => ({
              ...tp,
              value: enhanced.takeProfit[index]?.value || tp.value,
            })),
            stopLoss: {
              ...output.synthesizedRecommendation.stopLoss,
              value: enhanced.stopLoss.value || output.synthesizedRecommendation.stopLoss.value,
            },
            riskRewardRatio: enhanced.riskRewardRatio || output.synthesizedRecommendation.riskRewardRatio,
          }
        };
      } catch (error) {
        console.error('Error in comprehensive recommendation processing:', error);
        return output;
      }
    } catch (error) {
      console.error('Error in comprehensive analysis flow:', error);
      throw error;
    }
  }
);