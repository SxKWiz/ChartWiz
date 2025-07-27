
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
import type { Message } from '@/lib/types';
import type { Persona } from '@/lib/types';

type GetAiResponseOutput = { 
  analysis: string; 
  recommendation?: AnalyzeChartImageOutput['recommendation'];
  comprehensiveAnalysis?: ComprehensiveAnalysisOutput;
  enhancedAnalysis?: EnhancedMarketAnalysisOutput;
  sentimentAnalysis?: MarketSentimentAnalysisOutput;
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
      // For chart analysis with comprehensive AI brain
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

      return {
        answer: {
          analysis: result.executiveSummary,
          recommendation: {
            entryPrice: result.synthesizedRecommendation.entryPrice,
            takeProfit: result.synthesizedRecommendation.takeProfit,
            stopLoss: result.synthesizedRecommendation.stopLoss,
            riskRewardRatio: result.synthesizedRecommendation.riskRewardRatio,
          },
          comprehensiveAnalysis: result,
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
    const result: TextChatOutput = await textChat({ question });
    return {
      answer: {
        analysis: result.answer,
        recommendation: undefined,
        alternativeScenario: undefined,
      },
    };
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

export async function detectTradeOpportunity(chartImageUri: string, previousAnalysis?: string, scanMode: 'light' | 'detailed' = 'light'): Promise<IntelligentTradeDetectorOutput> {
  try {
    const input: IntelligentTradeDetectorInput = {
      chartImageUri,
      previousAnalysis: previousAnalysis || 'No previous analysis available',
      scanMode,
    };
    const result = await intelligentTradeDetector(input);
    return result;
  } catch (e) {
    console.error('Trade detection failed:', e);
    // Return a safe default response
    return {
      tradeOpportunity: {
        opportunityFound: false,
        confidence: 0,
        tradeType: 'neutral',
        urgency: 'watch',
        reasoning: 'Analysis failed due to technical error.',
      },
      screenshotAnalysis: 'Unable to analyze chart due to error.',
      recommendation: 'Please try again or check your connection.',
      nextScanIn: 30,
    };
  }
}

export async function monitorTradeProgress(chartImageUri: string, activeTrade: any, previousUpdate?: string): Promise<TradeMonitorOutput> {
  try {
    const input: TradeMonitorInput = {
      chartImageUri,
      activeTrade,
      previousUpdate: previousUpdate || 'No previous update available',
    };
    const result = await monitorActiveTrade(input);
    return result;
  } catch (e) {
    console.error('Trade monitoring failed:', e);
    // Return a safe default response
    return {
      tradeUpdate: {
        currentPrice: 'N/A',
        priceChange: 'N/A',
        profitLoss: 'N/A',
        riskLevel: 'medium',
        positionStatus: 'breakeven',
        stopLossDistance: 'N/A',
        takeProfitProgress: [],
        recommendation: 'hold',
        reasoning: 'Monitoring failed due to technical error.',
        urgency: 'low',
      },
      marketAnalysis: 'Unable to analyze trade progress due to error.',
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
      keyLevels: { support: [], resistance: [] },
      trendLines: { uptrend: [], downtrend: [] },
      patterns: [],
      fibonacci: {},
      zones: { accumulation: [], distribution: [], demand: [], supply: [] },
      annotations: [],
      tradingSignals: [],
      drawings: [],
    };
  }
}
