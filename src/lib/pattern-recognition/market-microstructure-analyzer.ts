/**
 * @fileOverview Market Microstructure Analyzer
 * 
 * This module provides institutional-grade market microstructure analysis including:
 * - Order flow analysis
 * - Bid-ask spread dynamics
 * - Liquidity assessment
 * - Market depth analysis
 * - Smart money flow detection
 */

export interface OrderBookData {
  timestamp: number;
  bids: OrderLevel[];
  asks: OrderLevel[];
}

export interface OrderLevel {
  price: number;
  size: number;
  orders?: number;
}

export interface TradeData {
  timestamp: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  tradeId: string;
}

export interface SpreadAnalysis {
  bidAskSpread: number;
  spreadPercent: number;
  midPrice: number;
  spreadTrend: 'tightening' | 'widening' | 'stable';
  liquidity: 'high' | 'medium' | 'low';
  impactCost: number;
}

export interface OrderFlowMetrics {
  buyPressure: number; // 0-100
  sellPressure: number; // 0-100
  netFlow: number;
  flowImbalance: number;
  aggressiveRatio: number;
  passiveRatio: number;
  volumeWeightedPrice: number;
}

export interface LiquidityMetrics {
  bidLiquidity: number;
  askLiquidity: number;
  totalLiquidity: number;
  liquidityImbalance: number;
  depth: {
    levels: number;
    totalSize: number;
    averageSize: number;
  };
  resiliency: number; // How quickly liquidity replenishes
}

export interface SmartMoneyFlow {
  institutionalFlow: number;
  retailFlow: number;
  whaleActivity: boolean;
  smartMoneyDirection: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  largeTradeThreshold: number;
}

export interface MarketMicrostructureAnalysis {
  spreadAnalysis: SpreadAnalysis;
  orderFlow: OrderFlowMetrics;
  liquidity: LiquidityMetrics;
  smartMoney: SmartMoneyFlow;
  marketQuality: {
    efficiency: number;
    fairness: number;
    transparency: number;
    overall: 'excellent' | 'good' | 'fair' | 'poor';
  };
  tradingImplications: {
    optimalExecutionSize: number;
    bestExecutionTime: string;
    riskFactors: string[];
    opportunities: string[];
  };
}

export interface MicrostructureSignal {
  type: 'liquidity_event' | 'flow_imbalance' | 'spread_anomaly' | 'smart_money_flow';
  strength: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  timeframe: number;
  description: string;
  actionable: boolean;
}

export class MarketMicrostructureAnalyzer {
  private readonly LARGE_TRADE_PERCENTILE = 0.95; // Top 5% of trade sizes
  private readonly SPREAD_THRESHOLD = 0.005; // 0.5% spread threshold
  private readonly LIQUIDITY_LOOKBACK = 100; // Lookback for liquidity calculations
  private readonly FLOW_WINDOW = 50; // Window for flow calculations
  
  private recentTrades: TradeData[] = [];
  private recentOrderBooks: OrderBookData[] = [];
  private tradeSizePercentiles: number[] = [];
  
  /**
   * Analyzes market microstructure from order book and trade data
   */
  analyzeMarketMicrostructure(
    orderBookData: OrderBookData[],
    tradeData: TradeData[],
    currentPrice: number
  ): MarketMicrostructureAnalysis {
    // Update internal data
    this.recentOrderBooks = orderBookData.slice(-this.LIQUIDITY_LOOKBACK);
    this.recentTrades = tradeData.slice(-this.FLOW_WINDOW);
    this.calculateTradeSizePercentiles();
    
    // Analyze different components
    const spreadAnalysis = this.analyzeSpread(orderBookData, currentPrice);
    const orderFlow = this.analyzeOrderFlow(tradeData);
    const liquidity = this.analyzeLiquidity(orderBookData);
    const smartMoney = this.detectSmartMoneyFlow(tradeData);
    
    // Calculate market quality metrics
    const marketQuality = this.assessMarketQuality(spreadAnalysis, liquidity, orderFlow);
    
    // Generate trading implications
    const tradingImplications = this.generateTradingImplications(
      spreadAnalysis,
      liquidity,
      orderFlow,
      smartMoney
    );
    
    return {
      spreadAnalysis,
      orderFlow,
      liquidity,
      smartMoney,
      marketQuality,
      tradingImplications
    };
  }
  
  /**
   * Detects microstructure signals for trading
   */
  detectMicrostructureSignals(
    orderBookData: OrderBookData[],
    tradeData: TradeData[]
  ): MicrostructureSignal[] {
    const signals: MicrostructureSignal[] = [];
    
    // Detect liquidity events
    const liquiditySignals = this.detectLiquidityEvents(orderBookData);
    signals.push(...liquiditySignals);
    
    // Detect flow imbalances
    const flowSignals = this.detectFlowImbalances(tradeData);
    signals.push(...flowSignals);
    
    // Detect spread anomalies
    const spreadSignals = this.detectSpreadAnomalies(orderBookData);
    signals.push(...spreadSignals);
    
    // Detect smart money flows
    const smartMoneySignals = this.detectSmartMoneySignals(tradeData);
    signals.push(...smartMoneySignals);
    
    return signals.sort((a, b) => b.strength - a.strength);
  }
  
  /**
   * Analyzes bid-ask spread dynamics
   */
  private analyzeSpread(orderBookData: OrderBookData[], currentPrice: number): SpreadAnalysis {
    if (orderBookData.length === 0) {
      throw new Error('No order book data available');
    }
    
    const latestBook = orderBookData[orderBookData.length - 1];
    const bestBid = latestBook.bids[0]?.price || 0;
    const bestAsk = latestBook.asks[0]?.price || Infinity;
    
    const bidAskSpread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = (bidAskSpread / midPrice) * 100;
    
    // Calculate spread trend
    const spreadTrend = this.calculateSpreadTrend(orderBookData);
    
    // Assess liquidity level
    const liquidity = this.assessLiquidityLevel(latestBook);
    
    // Calculate impact cost for a standard trade size
    const impactCost = this.calculateImpactCost(latestBook, currentPrice);
    
    return {
      bidAskSpread,
      spreadPercent,
      midPrice,
      spreadTrend,
      liquidity,
      impactCost
    };
  }
  
  /**
   * Analyzes order flow metrics
   */
  private analyzeOrderFlow(tradeData: TradeData[]): OrderFlowMetrics {
    if (tradeData.length === 0) {
      return {
        buyPressure: 50,
        sellPressure: 50,
        netFlow: 0,
        flowImbalance: 0,
        aggressiveRatio: 0,
        passiveRatio: 0,
        volumeWeightedPrice: 0
      };
    }
    
    const recentTrades = tradeData.slice(-this.FLOW_WINDOW);
    
    // Calculate buy/sell pressure
    const buyVolume = recentTrades
      .filter(trade => trade.side === 'buy')
      .reduce((sum, trade) => sum + trade.size, 0);
    
    const sellVolume = recentTrades
      .filter(trade => trade.side === 'sell')
      .reduce((sum, trade) => sum + trade.size, 0);
    
    const totalVolume = buyVolume + sellVolume;
    
    const buyPressure = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50;
    const sellPressure = 100 - buyPressure;
    const netFlow = buyVolume - sellVolume;
    const flowImbalance = totalVolume > 0 ? Math.abs(netFlow) / totalVolume : 0;
    
    // Calculate aggressive vs passive ratio (simplified)
    const aggressiveRatio = this.calculateAggressiveRatio(recentTrades);
    const passiveRatio = 1 - aggressiveRatio;
    
    // Calculate volume weighted average price
    const volumeWeightedPrice = this.calculateVWAP(recentTrades);
    
    return {
      buyPressure,
      sellPressure,
      netFlow,
      flowImbalance,
      aggressiveRatio,
      passiveRatio,
      volumeWeightedPrice
    };
  }
  
  /**
   * Analyzes liquidity metrics
   */
  private analyzeLiquidity(orderBookData: OrderBookData[]): LiquidityMetrics {
    if (orderBookData.length === 0) {
      throw new Error('No order book data available');
    }
    
    const latestBook = orderBookData[orderBookData.length - 1];
    
    // Calculate liquidity on each side
    const bidLiquidity = latestBook.bids.reduce((sum, level) => sum + level.size, 0);
    const askLiquidity = latestBook.asks.reduce((sum, level) => sum + level.size, 0);
    const totalLiquidity = bidLiquidity + askLiquidity;
    
    // Calculate liquidity imbalance
    const liquidityImbalance = totalLiquidity > 0 
      ? (bidLiquidity - askLiquidity) / totalLiquidity 
      : 0;
    
    // Calculate depth metrics
    const depth = {
      levels: latestBook.bids.length + latestBook.asks.length,
      totalSize: totalLiquidity,
      averageSize: totalLiquidity / (latestBook.bids.length + latestBook.asks.length || 1)
    };
    
    // Calculate resiliency (how quickly liquidity replenishes)
    const resiliency = this.calculateLiquidityResiliency(orderBookData);
    
    return {
      bidLiquidity,
      askLiquidity,
      totalLiquidity,
      liquidityImbalance,
      depth,
      resiliency
    };
  }
  
  /**
   * Detects smart money flow patterns
   */
  private detectSmartMoneyFlow(tradeData: TradeData[]): SmartMoneyFlow {
    if (tradeData.length === 0 || this.tradeSizePercentiles.length === 0) {
      return {
        institutionalFlow: 0,
        retailFlow: 0,
        whaleActivity: false,
        smartMoneyDirection: 'neutral',
        confidence: 0,
        largeTradeThreshold: 0
      };
    }
    
    const largeTradeThreshold = this.tradeSizePercentiles[Math.floor(this.tradeSizePercentiles.length * this.LARGE_TRADE_PERCENTILE)];
    
    // Separate large and small trades
    const largeTrades = tradeData.filter(trade => trade.size >= largeTradeThreshold);
    const smallTrades = tradeData.filter(trade => trade.size < largeTradeThreshold);
    
    // Calculate institutional vs retail flow
    const institutionalBuyVolume = largeTrades
      .filter(trade => trade.side === 'buy')
      .reduce((sum, trade) => sum + trade.size, 0);
    
    const institutionalSellVolume = largeTrades
      .filter(trade => trade.side === 'sell')
      .reduce((sum, trade) => sum + trade.size, 0);
    
    const retailBuyVolume = smallTrades
      .filter(trade => trade.side === 'buy')
      .reduce((sum, trade) => sum + trade.size, 0);
    
    const retailSellVolume = smallTrades
      .filter(trade => trade.side === 'sell')
      .reduce((sum, trade) => sum + trade.size, 0);
    
    const institutionalFlow = institutionalBuyVolume - institutionalSellVolume;
    const retailFlow = retailBuyVolume - retailSellVolume;
    
    // Detect whale activity (unusually large trades)
    const whaleThreshold = largeTradeThreshold * 5;
    const whaleActivity = largeTrades.some(trade => trade.size >= whaleThreshold);
    
    // Determine smart money direction
    let smartMoneyDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (institutionalFlow > 0 && Math.abs(institutionalFlow) > Math.abs(retailFlow) * 0.5) {
      smartMoneyDirection = 'bullish';
    } else if (institutionalFlow < 0 && Math.abs(institutionalFlow) > Math.abs(retailFlow) * 0.5) {
      smartMoneyDirection = 'bearish';
    }
    
    // Calculate confidence based on flow divergence
    const totalInstitutionalVolume = institutionalBuyVolume + institutionalSellVolume;
    const confidence = totalInstitutionalVolume > 0 
      ? Math.min(100, (Math.abs(institutionalFlow) / totalInstitutionalVolume) * 100)
      : 0;
    
    return {
      institutionalFlow,
      retailFlow,
      whaleActivity,
      smartMoneyDirection,
      confidence,
      largeTradeThreshold
    };
  }
  
  /**
   * Calculate trade size percentiles for smart money detection
   */
  private calculateTradeSizePercentiles(): void {
    const sizes = this.recentTrades.map(trade => trade.size).sort((a, b) => a - b);
    this.tradeSizePercentiles = sizes;
  }
  
  /**
   * Calculate spread trend over time
   */
  private calculateSpreadTrend(orderBookData: OrderBookData[]): 'tightening' | 'widening' | 'stable' {
    if (orderBookData.length < 10) return 'stable';
    
    const recentSpreads = orderBookData.slice(-10).map(book => {
      const bestBid = book.bids[0]?.price || 0;
      const bestAsk = book.asks[0]?.price || Infinity;
      return bestAsk - bestBid;
    });
    
    const earlierAvg = recentSpreads.slice(0, 5).reduce((a, b) => a + b) / 5;
    const laterAvg = recentSpreads.slice(-5).reduce((a, b) => a + b) / 5;
    
    const change = (laterAvg - earlierAvg) / earlierAvg;
    
    if (change > 0.1) return 'widening';
    if (change < -0.1) return 'tightening';
    return 'stable';
  }
  
  /**
   * Assess liquidity level from order book
   */
  private assessLiquidityLevel(orderBook: OrderBookData): 'high' | 'medium' | 'low' {
    const totalLiquidity = orderBook.bids.reduce((sum, level) => sum + level.size, 0) +
                          orderBook.asks.reduce((sum, level) => sum + level.size, 0);
    
    const spread = (orderBook.asks[0]?.price || 0) - (orderBook.bids[0]?.price || 0);
    const midPrice = ((orderBook.asks[0]?.price || 0) + (orderBook.bids[0]?.price || 0)) / 2;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
    
    if (totalLiquidity > 1000 && spreadPercent < 0.1) return 'high';
    if (totalLiquidity > 100 && spreadPercent < 0.5) return 'medium';
    return 'low';
  }
  
  /**
   * Calculate impact cost for trading
   */
  private calculateImpactCost(orderBook: OrderBookData, tradeSize: number): number {
    // Simplified impact cost calculation
    const midPrice = ((orderBook.asks[0]?.price || 0) + (orderBook.bids[0]?.price || 0)) / 2;
    const spread = (orderBook.asks[0]?.price || 0) - (orderBook.bids[0]?.price || 0);
    
    // Base impact is half the spread
    let impactCost = spread / 2;
    
    // Add size-based impact
    const totalNearLiquidity = orderBook.bids.slice(0, 5).reduce((sum, level) => sum + level.size, 0) +
                              orderBook.asks.slice(0, 5).reduce((sum, level) => sum + level.size, 0);
    
    if (totalNearLiquidity > 0) {
      const sizeImpact = (tradeSize / totalNearLiquidity) * midPrice * 0.001; // 0.1% per 100% of liquidity
      impactCost += sizeImpact;
    }
    
    return impactCost;
  }
  
  /**
   * Calculate aggressive vs passive trading ratio
   */
  private calculateAggressiveRatio(trades: TradeData[]): number {
    // Simplified: assume trades at round numbers are more likely aggressive
    const aggressiveTrades = trades.filter(trade => {
      const priceStr = trade.price.toString();
      return priceStr.endsWith('0') || priceStr.endsWith('5');
    });
    
    return trades.length > 0 ? aggressiveTrades.length / trades.length : 0;
  }
  
  /**
   * Calculate Volume Weighted Average Price
   */
  private calculateVWAP(trades: TradeData[]): number {
    let totalValue = 0;
    let totalVolume = 0;
    
    trades.forEach(trade => {
      totalValue += trade.price * trade.size;
      totalVolume += trade.size;
    });
    
    return totalVolume > 0 ? totalValue / totalVolume : 0;
  }
  
  /**
   * Calculate liquidity resiliency
   */
  private calculateLiquidityResiliency(orderBookData: OrderBookData[]): number {
    if (orderBookData.length < 5) return 50; // Default value
    
    // Measure how quickly liquidity recovers after being consumed
    const liquidityLevels = orderBookData.slice(-10).map(book => 
      book.bids.reduce((sum, level) => sum + level.size, 0) +
      book.asks.reduce((sum, level) => sum + level.size, 0)
    );
    
    const avgLiquidity = liquidityLevels.reduce((a, b) => a + b) / liquidityLevels.length;
    const liquidityStability = liquidityLevels.reduce((sum, level) => {
      return sum + Math.abs(level - avgLiquidity);
    }, 0) / liquidityLevels.length;
    
    // Lower instability means higher resiliency
    return Math.max(0, Math.min(100, 100 - (liquidityStability / avgLiquidity) * 100));
  }
  
  /**
   * Assess overall market quality
   */
  private assessMarketQuality(
    spread: SpreadAnalysis,
    liquidity: LiquidityMetrics,
    orderFlow: OrderFlowMetrics
  ): {
    efficiency: number;
    fairness: number;
    transparency: number;
    overall: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    // Efficiency: tight spreads and good liquidity
    const efficiency = Math.max(0, Math.min(100, 
      (spread.liquidity === 'high' ? 80 : spread.liquidity === 'medium' ? 60 : 40) +
      (spread.spreadPercent < 0.1 ? 20 : spread.spreadPercent < 0.5 ? 10 : 0)
    ));
    
    // Fairness: balanced order flow and liquidity
    const fairness = Math.max(0, Math.min(100,
      (100 - Math.abs(orderFlow.flowImbalance) * 100) * 0.6 +
      (100 - Math.abs(liquidity.liquidityImbalance) * 100) * 0.4
    ));
    
    // Transparency: consistent patterns and good depth
    const transparency = Math.max(0, Math.min(100,
      (liquidity.depth.levels > 10 ? 80 : liquidity.depth.levels > 5 ? 60 : 40) +
      (liquidity.resiliency > 70 ? 20 : liquidity.resiliency > 50 ? 10 : 0)
    ));
    
    const average = (efficiency + fairness + transparency) / 3;
    let overall: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    
    if (average >= 80) overall = 'excellent';
    else if (average >= 65) overall = 'good';
    else if (average >= 50) overall = 'fair';
    
    return { efficiency, fairness, transparency, overall };
  }
  
  /**
   * Generate trading implications
   */
  private generateTradingImplications(
    spread: SpreadAnalysis,
    liquidity: LiquidityMetrics,
    orderFlow: OrderFlowMetrics,
    smartMoney: SmartMoneyFlow
  ): {
    optimalExecutionSize: number;
    bestExecutionTime: string;
    riskFactors: string[];
    opportunities: string[];
  } {
    const riskFactors: string[] = [];
    const opportunities: string[] = [];
    
    // Optimal execution size based on liquidity
    const optimalExecutionSize = Math.min(
      liquidity.totalLiquidity * 0.1, // Max 10% of total liquidity
      liquidity.depth.averageSize * 5 // Max 5x average order size
    );
    
    // Risk factors
    if (spread.liquidity === 'low') {
      riskFactors.push('Low liquidity - expect higher slippage');
    }
    if (spread.spreadPercent > 0.5) {
      riskFactors.push('Wide spreads - high transaction costs');
    }
    if (orderFlow.flowImbalance > 0.7) {
      riskFactors.push('Extreme order flow imbalance detected');
    }
    if (liquidity.resiliency < 50) {
      riskFactors.push('Poor liquidity resiliency - market may be fragile');
    }
    
    // Opportunities
    if (smartMoney.smartMoneyDirection !== 'neutral' && smartMoney.confidence > 70) {
      opportunities.push(`Strong smart money flow detected: ${smartMoney.smartMoneyDirection}`);
    }
    if (spread.spreadTrend === 'tightening') {
      opportunities.push('Spreads tightening - improving execution conditions');
    }
    if (liquidity.liquidityImbalance > 0.3) {
      opportunities.push('Liquidity imbalance - potential mean reversion opportunity');
    }
    
    // Best execution time
    let bestExecutionTime = 'Current conditions acceptable';
    if (spread.liquidity === 'high' && spread.spreadPercent < 0.2) {
      bestExecutionTime = 'Excellent execution conditions - execute immediately';
    } else if (riskFactors.length > 2) {
      bestExecutionTime = 'Poor conditions - consider waiting or reducing size';
    }
    
    return {
      optimalExecutionSize,
      bestExecutionTime,
      riskFactors,
      opportunities
    };
  }
  
  /**
   * Detect liquidity events
   */
  private detectLiquidityEvents(orderBookData: OrderBookData[]): MicrostructureSignal[] {
    const signals: MicrostructureSignal[] = [];
    
    if (orderBookData.length < 5) return signals;
    
    const recent = orderBookData.slice(-5);
    const liquidityLevels = recent.map(book => 
      book.bids.reduce((sum, level) => sum + level.size, 0) +
      book.asks.reduce((sum, level) => sum + level.size, 0)
    );
    
    // Detect sudden liquidity drops
    const maxLiquidity = Math.max(...liquidityLevels);
    const minLiquidity = Math.min(...liquidityLevels);
    
    if (maxLiquidity > 0 && (maxLiquidity - minLiquidity) / maxLiquidity > 0.5) {
      signals.push({
        type: 'liquidity_event',
        strength: 80,
        direction: 'bearish',
        timeframe: 5,
        description: 'Significant liquidity withdrawal detected',
        actionable: true
      });
    }
    
    return signals;
  }
  
  private detectFlowImbalances(tradeData: TradeData[]): MicrostructureSignal[] {
    const signals: MicrostructureSignal[] = [];
    
    if (tradeData.length < 20) return signals;
    
    const recentTrades = tradeData.slice(-20);
    const buyVolume = recentTrades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.size, 0);
    const sellVolume = recentTrades.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.size, 0);
    const totalVolume = buyVolume + sellVolume;
    
    if (totalVolume > 0) {
      const imbalance = Math.abs(buyVolume - sellVolume) / totalVolume;
      
      if (imbalance > 0.7) {
        signals.push({
          type: 'flow_imbalance',
          strength: imbalance * 100,
          direction: buyVolume > sellVolume ? 'bullish' : 'bearish',
          timeframe: 20,
          description: `Strong ${buyVolume > sellVolume ? 'buy' : 'sell'} flow imbalance (${(imbalance * 100).toFixed(1)}%)`,
          actionable: true
        });
      }
    }
    
    return signals;
  }
  
  private detectSpreadAnomalies(orderBookData: OrderBookData[]): MicrostructureSignal[] {
    const signals: MicrostructureSignal[] = [];
    
    if (orderBookData.length < 10) return signals;
    
    const recent = orderBookData.slice(-10);
    const spreads = recent.map(book => {
      const bestBid = book.bids[0]?.price || 0;
      const bestAsk = book.asks[0]?.price || Infinity;
      const midPrice = (bestBid + bestAsk) / 2;
      return midPrice > 0 ? (bestAsk - bestBid) / midPrice : 0;
    });
    
    const avgSpread = spreads.reduce((a, b) => a + b) / spreads.length;
    const currentSpread = spreads[spreads.length - 1];
    
    if (currentSpread > avgSpread * 2) {
      signals.push({
        type: 'spread_anomaly',
        strength: 70,
        direction: 'bearish',
        timeframe: 1,
        description: 'Abnormally wide spread detected',
        actionable: false
      });
    }
    
    return signals;
  }
  
  private detectSmartMoneySignals(tradeData: TradeData[]): MicrostructureSignal[] {
    const signals: MicrostructureSignal[] = [];
    
    if (tradeData.length < 50 || this.tradeSizePercentiles.length === 0) return signals;
    
    const largeTradeThreshold = this.tradeSizePercentiles[Math.floor(this.tradeSizePercentiles.length * this.LARGE_TRADE_PERCENTILE)];
    const recentLargeTrades = tradeData.slice(-20).filter(trade => trade.size >= largeTradeThreshold);
    
    if (recentLargeTrades.length >= 3) {
      const buyTrades = recentLargeTrades.filter(t => t.side === 'buy');
      const sellTrades = recentLargeTrades.filter(t => t.side === 'sell');
      
      if (buyTrades.length > sellTrades.length * 2) {
        signals.push({
          type: 'smart_money_flow',
          strength: 85,
          direction: 'bullish',
          timeframe: 20,
          description: 'Large buy orders detected - potential institutional accumulation',
          actionable: true
        });
      } else if (sellTrades.length > buyTrades.length * 2) {
        signals.push({
          type: 'smart_money_flow',
          strength: 85,
          direction: 'bearish',
          timeframe: 20,
          description: 'Large sell orders detected - potential institutional distribution',
          actionable: true
        });
      }
    }
    
    return signals;
  }
}

// Singleton instance
export const marketMicrostructureAnalyzer = new MarketMicrostructureAnalyzer();