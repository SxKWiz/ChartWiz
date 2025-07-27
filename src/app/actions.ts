
'use server';

import { analyzeChartImage, type AnalyzeChartImageOutput } from '@/ai/flows/analyze-chart-image';
import { textChat, type TextChatOutput } from '@/ai/flows/text-chat-flow';
import { summarizeChatHistory, type SummarizeChatHistoryOutput } from '@/ai/flows/summarize-chat-history';
import { scanForPatterns, type ScanForPatternsOutput } from '@/ai/flows/scan-for-patterns-flow';
import { intelligentTradeDetector, type IntelligentTradeDetectorInput, type IntelligentTradeDetectorOutput } from '@/ai/flows/intelligent-trade-detector';
import { monitorActiveTrade, type TradeMonitorInput, type TradeMonitorOutput } from '@/ai/flows/trade-monitor';
import { comprehensiveAIBrain, type ComprehensiveAnalysisInput, type ComprehensiveAnalysisOutput } from '@/ai/flows/comprehensive-ai-brain';
import { enhancedMarketAnalysis, type EnhancedMarketAnalysisInput, type EnhancedMarketAnalysisOutput } from '@/ai/flows/enhanced-market-analysis';
import { marketSentimentAnalysis, type MarketSentimentAnalysisInput, type MarketSentimentAnalysisOutput } from '@/ai/flows/market-sentiment-analyzer';
import { analyzeChartDrawing, type ChartDrawingAnalysisInput, type ChartDrawingAnalysisOutput } from '@/ai/flows/chart-drawing-analysis';
import { wizzUltraAIBrain, type WizzUltraAnalysisInput, type WizzUltraAnalysisOutput } from '@/ai/flows/wizz-ultra-ai-brain';
import { ultraPerformanceOptimizer, type UltraOptimizationInput, type UltraOptimizationOutput } from '@/ai/flows/ultra-performance-optimizer';
import { cryptoPriceAnalysis, type CryptoPriceQueryInput, type CryptoPriceResponseOutput } from '@/ai/flows/crypto-price-analysis';
import { generateAnalysisContext } from '@/lib/chart-analysis-helpers';
import type { Message } from '@/lib/types';
import type { Persona } from '@/lib/types';

type GetAiResponseOutput = { 
  analysis: string; 
  recommendation?: AnalyzeChartImageOutput['recommendation'];
  comprehensiveAnalysis?: ComprehensiveAnalysisOutput;
  enhancedAnalysis?: EnhancedMarketAnalysisOutput;
  sentimentAnalysis?: MarketSentimentAnalysisOutput;
  wizzUltraAnalysis?: WizzUltraAnalysisOutput;
  ultraOptimization?: UltraOptimizationOutput;
  cryptoPriceAnalysis?: CryptoPriceResponseOutput;
  alternativeScenario?: string;
}

export async function getEnhancedAiResponse(formData: FormData): Promise<{ answer?: GetAiResponseOutput; error?: string }> {
  try {
    let question = formData.get('question') as string;
    const personaDescription = formData.get('persona') as string || '';
    const riskTolerance = (formData.get('riskTolerance') as 'conservative' | 'moderate' | 'aggressive') || 'moderate';
    const marketDataText = formData.get('marketData') as string || '';
    
    // Parse additional data if provided
    const newsDataString = formData.get('newsData') as string;
    const socialDataString = formData.get('socialData') as string;
    const onChainDataString = formData.get('onChainData') as string;
    
    let newsData, socialData, onChainData;
    try {
      newsData = newsDataString ? JSON.parse(newsDataString) : undefined;
      socialData = socialDataString ? JSON.parse(socialDataString) : undefined;
      onChainData = onChainDataString ? JSON.parse(onChainDataString) : undefined;
    } catch (e) {
      console.warn('Failed to parse additional data:', e);
    }

    const files = formData.getAll('files') as File[];
    
    if (files.length > 0) {
      // For chart analysis - determine which AI brain to use
      if (!question) {
        question = "Provide a comprehensive analysis of this chart with enhanced AI insights and detailed trade recommendations.";
      }

      const chartImageUris = await Promise.all(
        files.map(async (file) => {
          const imageBuffer = await file.arrayBuffer();
          const base64Image = Buffer.from(imageBuffer).toString('base64');
          const mimeType = file.type || 'image/png';
          return `data:${mimeType};base64,${base64Image}`;
        })
      );

      // Check if Wizz Ultra AI is selected
      if (personaDescription?.toLowerCase().includes('wizz')) {
        console.log('🔮 Activating Wizz Ultra AI Brain...');
        
        const wizzInput: WizzUltraAnalysisInput = {
          primaryChartUri: chartImageUris[0],
          secondaryChartUri: chartImageUris[1],
          tertiaryChartUri: chartImageUris[2],
          question,
          riskTolerance,
          marketDataText,
          newsData,
          socialData,
          onChainData,
          // Enhanced with additional Wizz-specific data
          userProfileData: {
            tradingExperience: 'advanced', // Could be extracted from user profile
            capitalSize: 'medium',
            preferredStyle: 'adaptive',
            winRatePreference: 'balanced',
          },
          marketRegimeData: {
            fearGreedIndex: 65, // Could be fetched from real API
            btcDominance: 52.5,
          },
        };

        const wizzResult = await wizzUltraAIBrain(wizzInput);

        return {
          answer: {
            analysis: `🔮 **WIZZ ULTRA AI ANALYSIS** 🔮\n\n${wizzResult.executive_summary}`,
            recommendation: {
              entryPrice: {
                value: wizzResult.wizz_recommendation.primaryRecommendation.entryStrategy.optimalEntry,
                reason: 'Wizz Ultra precision entry optimization'
              },
              takeProfit: wizzResult.wizz_recommendation.primaryRecommendation.profitTargets.map(pt => ({
                value: pt.level,
                reason: pt.reasoning
              })),
              stopLoss: {
                value: wizzResult.wizz_recommendation.primaryRecommendation.riskManagement.stopLoss.level,
                reason: wizzResult.wizz_recommendation.primaryRecommendation.riskManagement.stopLoss.reasoning
              },
              riskRewardRatio: wizzResult.wizz_recommendation.primaryRecommendation.riskRewardProfile.ratio,
            },
            wizzUltraAnalysis: wizzResult,
            alternativeScenario: wizzResult.wizz_recommendation.alternativeScenarios[0]?.scenario,
          },
        };
      }

      // For non-Wizz personas, use comprehensive AI brain with ultra optimization
      const comprehensiveInput: ComprehensiveAnalysisInput = {
        primaryChartUri: chartImageUris[0],
        secondaryChartUri: chartImageUris[1],
        question,
        tradingPersona: personaDescription,
        riskTolerance,
        marketDataText,
        newsData,
        socialData,
        onChainData,
      };

      const result = await comprehensiveAIBrain(comprehensiveInput);

      // Apply ultra performance optimization to enhance any AI brain
      console.log('🚀 Applying Ultra Performance Optimization...');
      const context = generateAnalysisContext(question);
      
      const ultraOptimizationInput: UltraOptimizationInput = {
        originalRecommendation: result,
        chartData: {
          primaryChartUri: chartImageUris[0],
          secondaryChartUri: chartImageUris[1],
          timeframe: context.timeframe || '4h',
        },
        marketContext: {
          asset: context.asset,
          currentPrice: context.currentPrice,
          volatility: 'medium', // Could be calculated from chart data
          trend: 'neutral',
        },
        tradingPersona: personaDescription || 'Default',
        riskTolerance,
        userPreferences: {
          winRatePreference: 'balanced',
          tradingStyle: context.tradingStyle || 'swing_trading',
        },
      };

      const ultraOptimization = await ultraPerformanceOptimizer(ultraOptimizationInput);

      return {
        answer: {
          analysis: `${result.executiveSummary}\n\n🚀 **ULTRA-OPTIMIZED PERFORMANCE**\n• Win Rate Boost: +${ultraOptimization.performanceEnhancements.winRateImprovement}%\n• Profit Enhancement: +${ultraOptimization.performanceEnhancements.profitabilityBoost}%\n• Risk Reduction: -${ultraOptimization.performanceEnhancements.riskReduction}%\n• Precision Increase: +${ultraOptimization.performanceEnhancements.precisionIncrease}%`,
          recommendation: {
            entryPrice: result.synthesizedRecommendation.entryPrice,
            takeProfit: result.synthesizedRecommendation.takeProfit,
            stopLoss: result.synthesizedRecommendation.stopLoss,
            riskRewardRatio: result.synthesizedRecommendation.riskRewardRatio,
          },
          comprehensiveAnalysis: result,
          ultraOptimization,
          alternativeScenario: result.alternativeScenarios[0]?.implication,
        },
      };
    } else {
      // For text-based questions, use enhanced market analysis if market data is provided
      if (marketDataText || newsData || socialData || onChainData) {
        // Use sentiment analysis for text-based queries with market data
        const sentimentInput: MarketSentimentAnalysisInput = {
          newsData,
          socialData,
          onChainData,
          asset: 'BTC', // Default to BTC, could be extracted from question
          timeframe: '24h',
        };

        const sentimentResult = await marketSentimentAnalysis(sentimentInput);

        return {
          answer: {
            analysis: `Market Sentiment Analysis: ${sentimentResult.sentimentTrend}`,
            sentimentAnalysis: sentimentResult,
          },
        };
      } else {
        // Check if this is a crypto price query
        const lowerQuestion = question.toLowerCase();
        const cryptoKeywords = ['price', 'current', 'market', 'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'coin', 'token', 'trading', 'value', 'worth', 'cost', 'gainer', 'loser', 'mover', 'trend', 'sentiment'];
        const isCryptoQuery = cryptoKeywords.some(keyword => lowerQuestion.includes(keyword));
        
        if (isCryptoQuery) {
          try {
            console.log('🔍 Detected crypto price query, fetching real-time data...');
            const cryptoInput: CryptoPriceQueryInput = {
              query: question,
            };
            
            const cryptoResult = await cryptoPriceAnalysis(cryptoInput);
            
            return {
              answer: {
                analysis: cryptoResult.analysis,
                cryptoPriceAnalysis: cryptoResult,
              },
            };
          } catch (cryptoError) {
            console.error('Crypto price analysis failed, falling back to text chat:', cryptoError);
            // Fallback to regular text chat if crypto analysis fails
            const result: TextChatOutput = await textChat({ question });
            return {
              answer: {
                analysis: result.answer,
                recommendation: undefined,
              },
            };
          }
        } else {
          // Fallback to regular text chat
          const result: TextChatOutput = await textChat({ question });
          return {
            answer: {
              analysis: result.answer,
              recommendation: undefined,
            },
          };
        }
      }
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Enhanced AI response error:', e);
    return { error: `Failed to get enhanced AI response: ${errorMessage}` };
  }
}

export async function getAiResponse(formData: FormData): Promise<{ answer?: GetAiResponseOutput; error?: string }> {
  let question = formData.get('question') as string;
  const imageFiles = formData.getAll('images') as File[];
  const personaDescription = formData.get('persona') as string | undefined;

  if (!question && imageFiles.length === 0) {
    return { error: 'A question or an image is required.' };
  }
  
  if (imageFiles.length > 0 && imageFiles.some(f => f.size > 0)) {
    if (!question) {
      if (imageFiles.length > 1) {
        question = "Analyze these charts. Perform a multi-timeframe or correlation analysis and provide a summary of key features, potential trends, and a trade recommendation based on the combined information.";
      } else {
        question = "Analyze this chart and provide a summary of its key features and potential trends, along with a trade recommendation.";
      }
    }

    try {
      const chartImageUris = await Promise.all(
        imageFiles.map(async (file) => {
          const imageBuffer = await file.arrayBuffer();
          const imageBase64 = Buffer.from(imageBuffer).toString('base64');
          const mimeType = file.type;
          return `data:${mimeType};base64,${imageBase64}`;
        })
      );

      const result = await analyzeChartImage({
        chartImageUri1: chartImageUris[0],
        chartImageUri2: chartImageUris.length > 1 ? chartImageUris[1] : undefined,
        question,
        tradingPersona: personaDescription,
      });
      
      return { answer: result };
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      return { error: `Failed to get AI response: ${errorMessage}` };
    }
  }

  if (!question) {
    return { error: 'A question is required when no image is provided.' };
  }

  try {
    // Check if this is a crypto price query
    const lowerQuestion = question.toLowerCase();
    const cryptoKeywords = ['price', 'current', 'market', 'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'coin', 'token', 'trading', 'value', 'worth', 'cost', 'gainer', 'loser', 'mover', 'trend', 'sentiment'];
    const isCryptoQuery = cryptoKeywords.some(keyword => lowerQuestion.includes(keyword));
    
    if (isCryptoQuery) {
      try {
        console.log('🔍 Detected crypto price query, fetching real-time data...');
        const cryptoInput: CryptoPriceQueryInput = {
          query: question,
        };
        
        const cryptoResult = await cryptoPriceAnalysis(cryptoInput);
        
        return {
          answer: {
            analysis: cryptoResult.analysis,
            cryptoPriceAnalysis: cryptoResult,
            recommendation: undefined,
            alternativeScenario: undefined,
          },
        };
      } catch (cryptoError) {
        console.error('Crypto price analysis failed, falling back to text chat:', cryptoError);
        // Fallback to regular text chat if crypto analysis fails
        const result: TextChatOutput = await textChat({ question });
        return {
          answer: {
            analysis: result.answer,
            recommendation: undefined,
            alternativeScenario: undefined,
          },
        };
      }
    } else {
      const result: TextChatOutput = await textChat({ question });
      return {
        answer: {
          analysis: result.answer,
          recommendation: undefined,
          alternativeScenario: undefined,
        },
      };
    }
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to get AI response: ${errorMessage}` };
  }
}

export async function getSummaryTitleForHistory(messages: Message[]): Promise<string> {
  // Format the messages into a single string for the AI.
  const chatHistory = messages
    .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : '(Image Analysis)'}`)
    .join('\n');

  try {
    const result: SummarizeChatHistoryOutput = await summarizeChatHistory({ chatHistory });
    return result.summary;
  } catch (e) {
    console.error('Failed to get summary title:', e);
    // Fallback to a generic title if the summary fails.
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (typeof firstUserMessage?.content === 'string') {
      return firstUserMessage.content.substring(0, 30) + '...';
    }
    return 'Chat Analysis';
  }
}

export async function scanScreenForPatterns(chartImageUri: string): Promise<ScanForPatternsOutput> {
  try {
    const result = await scanForPatterns({ chartImageUri });
    return result;
  } catch (e) {
    console.error('Pattern scanning failed:', e);
    // Return a "not found" response in case of error to avoid false positives.
    return {
      patternFound: false,
      primaryTrend: 'Error',
      supportResistance: 'Error',
      volumeAnalysis: 'Error',
      synthesis: 'An error occurred during pattern scanning.',
    };
  }
}

export async function detectTradeOpportunity(
  chartImageUri: string, 
  previousAnalysis?: string, 
  scanMode: 'light' | 'detailed' = 'light',
  lastOpportunityTime?: number,
  consecutiveScansWithoutOpportunity: number = 0
): Promise<IntelligentTradeDetectorOutput> {
  try {
    const input: IntelligentTradeDetectorInput = {
      chartImageUri,
      previousAnalysis: previousAnalysis || 'No previous analysis available',
      scanMode,
      lastOpportunityTime,
      consecutiveScansWithoutOpportunity,
    };
    const result = await intelligentTradeDetector(input);
    return result;
  } catch (e) {
    console.error('Trade detection failed:', e);
    // Return a safe default response with adaptive intervals
    const adaptiveInterval = Math.min(60, 30 + consecutiveScansWithoutOpportunity * 5);
    return {
      tradeOpportunity: {
        opportunityFound: false,
        confidence: 0,
        tradeType: 'neutral',
        urgency: 'watch',
        reasoning: 'Analysis failed due to technical error.',
        confidenceThreshold: 75,
      },
      screenshotAnalysis: 'Unable to analyze chart due to error.',
      recommendation: 'Please try again or check your connection.',
      nextScanIn: adaptiveInterval,
      cooldownActive: false,
      marketVolatility: 'medium',
    };
  }
}

export async function monitorTradeProgress(
  chartImageUri: string, 
  activeTrade: any, 
  previousUpdate?: string,
  currentPrice?: string
): Promise<TradeMonitorOutput> {
  try {
    const input: TradeMonitorInput = {
      chartImageUri,
      activeTrade,
      previousUpdate: previousUpdate || 'No previous update available',
      currentPrice,
    };
    const result = await monitorActiveTrade(input);
    return result;
  } catch (e) {
    console.error('Trade monitoring failed:', e);
    // Return a safe default response with proper trade state
    return {
      tradeUpdate: {
        currentPrice: currentPrice || 'N/A',
        tradeState: {
          status: 'waiting_entry',
          entryConfirmed: false,
          priceDistance: {
            toEntry: 'N/A',
            toStop: 'N/A',
            toFirstTarget: 'N/A',
          },
        },
        priceChange: 'N/A',
        profitLoss: 'N/A (Monitoring Error)',
        riskLevel: 'medium',
        positionStatus: 'waiting',
        stopLossDistance: 'N/A',
        takeProfitProgress: [],
        recommendation: 'wait_entry',
        reasoning: 'Monitoring failed due to technical error.',
        urgency: 'low',
      },
      marketAnalysis: 'Unable to analyze trade progress due to error.',
      entryAnalysis: 'Entry analysis unavailable due to technical error.',
      nextUpdateIn: 30,
    };
  }
}

export async function generateChartDrawingAnalysis(
  chartImageUri: string,
  clickPoint: { x: number; y: number },
  imageWidth: number,
  imageHeight: number,
  analysisType: 'auto' | 'support_resistance' | 'trendlines' | 'patterns' | 'fibonacci' | 'comprehensive' = 'auto',
  tradingPersona?: string
): Promise<ChartDrawingAnalysisOutput> {
  try {
    const result = await analyzeChartDrawing({
      chartImageUri,
      clickPoint,
      imageWidth,
      imageHeight,
      analysisType,
      tradingPersona,
    });
    return result;
  } catch (e) {
    console.error('Chart drawing analysis failed:', e);
    // Return empty analysis on error
    return {
      analysis: 'Unable to generate chart analysis due to an error.',
      supportLevels: [],
      resistanceLevels: [],
      trendLines: [],
      patterns: [],
      fibonacciLevels: [],
      tradingSignals: [],
      keyInsights: [],
    };
  }
}
