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
      const detectedSymbols = commonSymbols.filter(symbol => 
        lowerQuery.includes(symbol.toLowerCase()) || 
        lowerQuery.includes(symbol.toLowerCase().replace('usdt', ''))
      );
      // Convert to proper Binance trading pairs
      symbolsToAnalyze = detectedSymbols.map(symbol => `${symbol}USDT`);
    }

    // Handle different types of queries
    if (lowerQuery.includes('price') || lowerQuery.includes('current') || symbolsToAnalyze.length > 0) {
      // Get specific price data
      if (symbolsToAnalyze.length > 0) {
        try {
          priceData = await binanceAPI.getPrices(symbolsToAnalyze);
        } catch (error) {
          console.error('Error fetching specific prices:', error);
          // Continue with other analysis even if specific prices fail
        }
      }
    }

    if (lowerQuery.includes('market') || lowerQuery.includes('trend') || lowerQuery.includes('sentiment')) {
      // Get market insights
      try {
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
      } catch (error) {
        console.error('Error fetching market insights:', error);
        // Continue without market insights
      }
    }

    if (lowerQuery.includes('top') || lowerQuery.includes('gainer') || lowerQuery.includes('loser') || lowerQuery.includes('mover')) {
      // Get top movers
      try {
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
      } catch (error) {
        console.error('Error fetching top movers:', error);
        // Continue without top movers
      }
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
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error occurred while fetching cryptocurrency data.';
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to Binance API. Please check your internet connection and try again.';
      } else if (error.message.includes('Bad Request')) {
        errorMessage = 'Invalid cryptocurrency symbol. Please try asking for a specific coin like "Bitcoin" or "BTC".';
      } else if (error.message.includes('Not Found')) {
        errorMessage = 'Cryptocurrency not found. Please check the symbol and try again.';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    }
    
    return {
      analysis: `❌ ${errorMessage}\n\n💡 **Tips:**\n• Try asking for specific coins like "Bitcoin price" or "ETH value"\n• For market data, ask "Show me market trends" or "Top gainers"\n• Make sure you have a stable internet connection`,
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
  } else {
    // Provide fallback information when no price data is available
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('bitcoin') || lowerQuery.includes('btc')) {
      analysis += `📊 **Bitcoin (BTC) Information:**\n\n`;
      analysis += `Bitcoin is the world's first and most popular cryptocurrency. It was created in 2009 by Satoshi Nakamoto and operates on a decentralized blockchain network.\n\n`;
      analysis += `**Key Features:**\n• Decentralized digital currency\n• Limited supply of 21 million coins\n• Proof-of-work consensus mechanism\n• Store of value and medium of exchange\n\n`;
    } else if (lowerQuery.includes('ethereum') || lowerQuery.includes('eth')) {
      analysis += `📊 **Ethereum (ETH) Information:**\n\n`;
      analysis += `Ethereum is a decentralized platform that enables smart contracts and decentralized applications (dApps). It was created by Vitalik Buterin in 2015.\n\n`;
      analysis += `**Key Features:**\n• Smart contract platform\n• Decentralized applications\n• DeFi ecosystem foundation\n• Proof-of-stake consensus (after The Merge)\n\n`;
    } else if (lowerQuery.includes('crypto') || lowerQuery.includes('price')) {
      analysis += `📊 **Cryptocurrency Information:**\n\n`;
      analysis += `Cryptocurrencies are digital or virtual currencies that use cryptography for security. They operate on decentralized blockchain networks.\n\n`;
      analysis += `**Popular Cryptocurrencies:**\n• Bitcoin (BTC) - Digital gold\n• Ethereum (ETH) - Smart contract platform\n• Binance Coin (BNB) - Exchange token\n• Cardano (ADA) - Research-driven blockchain\n• Solana (SOL) - High-performance blockchain\n\n`;
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
  if (priceData.length > 0 || Object.keys(marketInsights).length > 0 || Object.keys(topMovers).length > 0) {
    analysis += `💡 **Note**: This data is from Binance and updates every 30 seconds. Always do your own research and consider market conditions before making trading decisions.`;
  } else {
    analysis += `💡 **Note**: For real-time price data, try asking specific questions like "What's the current price of Bitcoin?" or "Show me ETH price". The system will fetch live data from Binance.`;
  }

  return analysis;
}