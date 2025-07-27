/**
 * @fileOverview Crypto Price Analysis Flow
 * Handles cryptocurrency price queries and market analysis using Binance API
 */

import { z } from 'zod';
import { binanceAPI, type CryptoPrice, type MarketData } from '@/lib/binance-api';

const CryptoPriceQuerySchema = z.object({
  query: z.string().describe('The user\'s question about cryptocurrency prices or market data'),
  symbols: z.array(z.string()).optional().describe('Specific cryptocurrency symbols to analyze'),
});

const CryptoPriceResponseSchema = z.object({
  analysis: z.string().describe('Comprehensive analysis of the price data and market conditions'),
  priceData: z.array(z.object({
    symbol: z.string(),
    price: z.string(),
    priceChange: z.string(),
    priceChangePercent: z.string(),
    volume24h: z.string(),
    high24h: z.string(),
    low24h: z.string(),
  })).optional(),
  marketInsights: z.object({
    overallSentiment: z.string().describe('Overall market sentiment (bullish/bearish/neutral)'),
    keyTrends: z.array(z.string()).describe('Key market trends identified'),
    recommendations: z.array(z.string()).describe('Trading recommendations based on analysis'),
  }).optional(),
  topMovers: z.object({
    gainers: z.array(z.object({
      symbol: z.string(),
      price: z.string(),
      change: z.string(),
    })),
    losers: z.array(z.object({
      symbol: z.string(),
      price: z.string(),
      change: z.string(),
    })),
  }).optional(),
});

export type CryptoPriceQueryInput = z.infer<typeof CryptoPriceQuerySchema>;
export type CryptoPriceResponseOutput = z.infer<typeof CryptoPriceResponseSchema>;

export async function cryptoPriceAnalysis(input: CryptoPriceQueryInput): Promise<CryptoPriceResponseOutput> {
  try {
    const { query, symbols } = input;
    const lowerQuery = query.toLowerCase();
    
    let priceData: CryptoPrice[] = [];
    let marketInsights: any = {};
    let topMovers: any = {};

    // Extract symbols from query if not provided
    let symbolsToAnalyze = symbols || [];
    if (!symbolsToAnalyze.length) {
      // Common crypto symbols to look for in the query
      const commonSymbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI'];
      symbolsToAnalyze = commonSymbols.filter(symbol => 
        lowerQuery.includes(symbol.toLowerCase()) || 
        lowerQuery.includes(symbol.toLowerCase().replace('usdt', ''))
      );
    }

    // Handle different types of queries
    if (lowerQuery.includes('price') || lowerQuery.includes('current') || symbolsToAnalyze.length > 0) {
      // Get specific price data
      if (symbolsToAnalyze.length > 0) {
        priceData = await binanceAPI.getPrices(symbolsToAnalyze);
      }
    }

    if (lowerQuery.includes('market') || lowerQuery.includes('trend') || lowerQuery.includes('sentiment')) {
      // Get market insights
      const markets = await binanceAPI.getUSDTMarkets();
      const totalVolume = markets.reduce((sum, market) => sum + parseFloat(market.volume24h), 0);
      const avgChange = markets.reduce((sum, market) => sum + parseFloat(market.priceChangePercent24h), 0) / markets.length;
      
      marketInsights = {
        overallSentiment: avgChange > 2 ? 'bullish' : avgChange < -2 ? 'bearish' : 'neutral',
        keyTrends: [
          `Average 24h change: ${avgChange.toFixed(2)}%`,
          `Total 24h volume: $${(totalVolume / 1e9).toFixed(2)}B`,
          `Active pairs: ${markets.length}`
        ],
        recommendations: generateRecommendations(avgChange, markets)
      };
    }

    if (lowerQuery.includes('top') || lowerQuery.includes('gainer') || lowerQuery.includes('loser') || lowerQuery.includes('mover')) {
      // Get top movers
      const movers = await binanceAPI.getTopMovers();
      topMovers = {
        gainers: movers.gainers.map(m => ({
          symbol: m.baseAsset,
          price: binanceAPI.formatPrice(m.price, m.symbol),
          change: binanceAPI.formatPercentageChange(m.priceChangePercent24h).text
        })),
        losers: movers.losers.map(m => ({
          symbol: m.baseAsset,
          price: binanceAPI.formatPrice(m.price, m.symbol),
          change: binanceAPI.formatPercentageChange(m.priceChangePercent24h).text
        }))
      };
    }

    // Generate comprehensive analysis
    const analysis = await generatePriceAnalysis(query, priceData, marketInsights, topMovers);

    return {
      analysis,
      priceData: priceData.length > 0 ? priceData.map(p => ({
        symbol: p.symbol,
        price: binanceAPI.formatPrice(p.price, p.symbol),
        priceChange: binanceAPI.formatPrice(p.priceChange, p.symbol),
        priceChangePercent: binanceAPI.formatPercentageChange(p.priceChangePercent).text,
        volume24h: `$${(parseFloat(p.quoteVolume) / 1e6).toFixed(2)}M`,
        high24h: binanceAPI.formatPrice(p.high24h, p.symbol),
        low24h: binanceAPI.formatPrice(p.low24h, p.symbol),
      })) : undefined,
      marketInsights: Object.keys(marketInsights).length > 0 ? marketInsights : undefined,
      topMovers: Object.keys(topMovers).length > 0 ? topMovers : undefined,
    };

  } catch (error) {
    console.error('Error in crypto price analysis:', error);
    return {
      analysis: `I encountered an error while fetching cryptocurrency data: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your internet connection.`,
    };
  }
}

function generateRecommendations(avgChange: number, markets: MarketData[]): string[] {
  const recommendations = [];
  
  if (avgChange > 5) {
    recommendations.push('Market showing strong bullish momentum - consider taking profits on existing positions');
  } else if (avgChange > 2) {
    recommendations.push('Moderate bullish sentiment - good time for selective buying');
  } else if (avgChange < -5) {
    recommendations.push('Strong bearish pressure - consider defensive positions or waiting for stabilization');
  } else if (avgChange < -2) {
    recommendations.push('Bearish sentiment - focus on risk management and wait for better entry points');
  } else {
    recommendations.push('Neutral market conditions - focus on individual coin analysis and technical levels');
  }

  // Add volume-based recommendation
  const highVolumeCoins = markets
    .filter(m => parseFloat(m.volume24h) > 1000000) // $1M+ volume
    .sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h))
    .slice(0, 5);

  if (highVolumeCoins.length > 0) {
    recommendations.push(`High volume coins to watch: ${highVolumeCoins.map(c => c.baseAsset).join(', ')}`);
  }

  return recommendations;
}

async function generatePriceAnalysis(
  query: string,
  priceData: CryptoPrice[],
  marketInsights: any,
  topMovers: any
): Promise<string> {
  let analysis = '';

  // Add price data analysis
  if (priceData.length > 0) {
    analysis += `📊 **Current Price Analysis:**\n\n`;
    
    for (const price of priceData) {
      const changeInfo = binanceAPI.formatPercentageChange(price.priceChangePercent);
      const changeEmoji = changeInfo.isPositive ? '📈' : '📉';
      
      analysis += `**${price.symbol}**: ${binanceAPI.formatPrice(price.price, price.symbol)} ${changeEmoji} ${changeInfo.text}\n`;
      analysis += `24h High: ${binanceAPI.formatPrice(price.high24h, price.symbol)} | Low: ${binanceAPI.formatPrice(price.low24h, price.symbol)}\n`;
      analysis += `Volume: $${(parseFloat(price.quoteVolume) / 1e6).toFixed(2)}M\n\n`;
    }
  }

  // Add market insights
  if (marketInsights.overallSentiment) {
    analysis += `🌍 **Market Sentiment**: ${marketInsights.overallSentiment.toUpperCase()}\n\n`;
    
    if (marketInsights.keyTrends) {
      analysis += `**Key Trends:**\n`;
      marketInsights.keyTrends.forEach((trend: string) => {
        analysis += `• ${trend}\n`;
      });
      analysis += `\n`;
    }

    if (marketInsights.recommendations) {
      analysis += `**Recommendations:**\n`;
      marketInsights.recommendations.forEach((rec: string) => {
        analysis += `• ${rec}\n`;
      });
      analysis += `\n`;
    }
  }

  // Add top movers
  if (topMovers.gainers || topMovers.losers) {
    analysis += `🔥 **Top Movers (24h):**\n\n`;
    
    if (topMovers.gainers && topMovers.gainers.length > 0) {
      analysis += `**Top Gainers:**\n`;
      topMovers.gainers.forEach((gainer: any) => {
        analysis += `• ${gainer.symbol}: ${gainer.price} ${gainer.change} 📈\n`;
      });
      analysis += `\n`;
    }

    if (topMovers.losers && topMovers.losers.length > 0) {
      analysis += `**Top Losers:**\n`;
      topMovers.losers.forEach((loser: any) => {
        analysis += `• ${loser.symbol}: ${loser.price} ${loser.change} 📉\n`;
      });
      analysis += `\n`;
    }
  }

  // Add general advice
  analysis += `💡 **Note**: This data is from Binance and updates every 30 seconds. Always do your own research and consider market conditions before making trading decisions.`;

  return analysis;
}