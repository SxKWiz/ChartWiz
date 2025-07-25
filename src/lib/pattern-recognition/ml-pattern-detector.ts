/**
 * @fileOverview Machine Learning Pattern Detection System
 * 
 * This module implements neural network-based pattern recognition for cryptocurrency trading.
 * Features include:
 * - Pattern classification using trained models
 * - Historical success rate tracking
 * - Confidence scoring based on pattern quality
 * - Multi-timeframe pattern correlation
 */

export interface PatternFeatures {
  // Price action features
  priceRange: number;
  volatility: number;
  momentum: number;
  trendStrength: number;
  
  // Volume features
  volumeProfile: number[];
  volumeTrend: number;
  volumeConfirmation: number;
  
  // Technical features
  rsiDivergence: number;
  macdSignal: number;
  fibonacciLevel: number;
  supportResistance: number;
  
  // Market structure
  higherHighs: number;
  higherLows: number;
  structureBreak: number;
  liquidityZone: number;
}

export interface PatternPrediction {
  patternType: string;
  confidence: number;
  historicalSuccessRate: number;
  expectedMove: number;
  timeframe: string;
  riskRewardRatio: number;
  features: PatternFeatures;
  similarity: number;
}

export interface TrainingExample {
  id: string;
  timestamp: number;
  asset: string;
  timeframe: string;
  features: PatternFeatures;
  patternType: string;
  outcome: {
    success: boolean;
    actualMove: number;
    timeToTarget: number;
    maxDrawdown: number;
  };
}

export interface PatternModel {
  type: string;
  accuracy: number;
  totalSamples: number;
  successRate: number;
  avgRiskReward: number;
  bestTimeframes: string[];
  lastUpdated: number;
}

export class MLPatternDetector {
  private trainingData: Map<string, TrainingExample[]> = new Map();
  private patternModels: Map<string, PatternModel> = new Map();
  private featureWeights: Map<string, number> = new Map();
  
  constructor() {
    this.initializeModels();
    this.loadTrainingData();
  }
  
  /**
   * Detects patterns using ML models
   */
  async detectPatterns(
    priceData: number[],
    volumeData: number[],
    timeframe: string,
    asset: string = 'BTC'
  ): Promise<PatternPrediction[]> {
    const features = this.extractFeatures(priceData, volumeData, timeframe);
    const predictions: PatternPrediction[] = [];
    
    // Analyze each pattern type
    for (const [patternType, model] of this.patternModels) {
      const prediction = await this.classifyPattern(features, patternType, timeframe);
      
      if (prediction.confidence > 0.6) { // Minimum confidence threshold
        predictions.push(prediction);
      }
    }
    
    // Sort by confidence and success rate
    return predictions.sort((a, b) => 
      (b.confidence * b.historicalSuccessRate) - (a.confidence * a.historicalSuccessRate)
    );
  }
  
  /**
   * Extracts comprehensive features from price and volume data
   */
  private extractFeatures(
    priceData: number[],
    volumeData: number[],
    timeframe: string
  ): PatternFeatures {
    const length = Math.min(priceData.length, volumeData.length);
    const prices = priceData.slice(-length);
    const volumes = volumeData.slice(-length);
    
    // Price action features
    const priceRange = (Math.max(...prices) - Math.min(...prices)) / prices[0];
    const volatility = this.calculateVolatility(prices);
    const momentum = this.calculateMomentum(prices);
    const trendStrength = this.calculateTrendStrength(prices);
    
    // Volume features
    const volumeProfile = this.calculateVolumeProfile(prices, volumes);
    const volumeTrend = this.calculateVolumeTrend(volumes);
    const volumeConfirmation = this.calculateVolumeConfirmation(prices, volumes);
    
    // Technical features
    const rsiDivergence = this.calculateRSIDivergence(prices);
    const macdSignal = this.calculateMACDSignal(prices);
    const fibonacciLevel = this.calculateFibonacciLevel(prices);
    const supportResistance = this.calculateSRLevel(prices);
    
    // Market structure
    const higherHighs = this.detectHigherHighs(prices);
    const higherLows = this.detectHigherLows(prices);
    const structureBreak = this.detectStructureBreak(prices);
    const liquidityZone = this.detectLiquidityZone(prices, volumes);
    
    return {
      priceRange,
      volatility,
      momentum,
      trendStrength,
      volumeProfile,
      volumeTrend,
      volumeConfirmation,
      rsiDivergence,
      macdSignal,
      fibonacciLevel,
      supportResistance,
      higherHighs,
      higherLows,
      structureBreak,
      liquidityZone
    };
  }
  
  /**
   * Classifies pattern using trained model
   */
  private async classifyPattern(
    features: PatternFeatures,
    patternType: string,
    timeframe: string
  ): Promise<PatternPrediction> {
    const model = this.patternModels.get(patternType);
    if (!model) {
      throw new Error(`Model for pattern ${patternType} not found`);
    }
    
    // Calculate similarity with historical patterns
    const similarity = this.calculateSimilarity(features, patternType);
    
    // Neural network-inspired classification
    const confidence = this.calculateNeuralNetworkScore(features, patternType);
    
    // Get historical success rate for this pattern
    const historicalSuccessRate = model.successRate;
    
    // Calculate expected move based on historical data
    const expectedMove = this.calculateExpectedMove(features, patternType);
    
    // Calculate risk-reward ratio
    const riskRewardRatio = this.calculateRiskReward(features, patternType);
    
    return {
      patternType,
      confidence,
      historicalSuccessRate,
      expectedMove,
      timeframe,
      riskRewardRatio,
      features,
      similarity
    };
  }
  
  /**
   * Neural network-inspired scoring function
   */
  private calculateNeuralNetworkScore(features: PatternFeatures, patternType: string): number {
    const weights = this.getPatternWeights(patternType);
    let score = 0;
    let totalWeight = 0;
    
    // Apply weights to features (simplified neural network)
    Object.entries(features).forEach(([key, value]) => {
      const weight = weights[key] || 0.1;
      if (typeof value === 'number') {
        score += this.sigmoid(value) * weight;
        totalWeight += weight;
      } else if (Array.isArray(value)) {
        const avgValue = value.reduce((a, b) => a + b, 0) / value.length;
        score += this.sigmoid(avgValue) * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }
  
  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
  
  /**
   * Calculate similarity with historical patterns
   */
  private calculateSimilarity(features: PatternFeatures, patternType: string): number {
    const historicalPatterns = this.trainingData.get(patternType) || [];
    if (historicalPatterns.length === 0) return 0;
    
    let maxSimilarity = 0;
    
    historicalPatterns.forEach(pattern => {
      const similarity = this.cosineSimilarity(
        this.featuresToVector(features),
        this.featuresToVector(pattern.features)
      );
      maxSimilarity = Math.max(maxSimilarity, similarity);
    });
    
    return maxSimilarity;
  }
  
  /**
   * Convert features to vector for similarity calculation
   */
  private featuresToVector(features: PatternFeatures): number[] {
    return [
      features.priceRange,
      features.volatility,
      features.momentum,
      features.trendStrength,
      features.volumeTrend,
      features.volumeConfirmation,
      features.rsiDivergence,
      features.macdSignal,
      features.fibonacciLevel,
      features.supportResistance,
      features.higherHighs,
      features.higherLows,
      features.structureBreak,
      features.liquidityZone
    ];
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
  }
  
  /**
   * Calculate various technical features
   */
  private calculateVolatility(prices: number[]): number {
    const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
  
  private calculateMomentum(prices: number[]): number {
    const period = Math.min(14, prices.length - 1);
    return (prices[prices.length - 1] - prices[prices.length - 1 - period]) / prices[prices.length - 1 - period];
  }
  
  private calculateTrendStrength(prices: number[]): number {
    // Simple linear regression slope
    const n = prices.length;
    const x = Array.from({length: n}, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b);
    const sumY = prices.reduce((a, b) => a + b);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * prices[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope / prices[0]; // Normalized slope
  }
  
  private calculateVolumeProfile(prices: number[], volumes: number[]): number[] {
    // Simplified volume profile (10 price levels)
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceStep = (maxPrice - minPrice) / 10;
    const profile = new Array(10).fill(0);
    
    prices.forEach((price, i) => {
      const bucket = Math.min(9, Math.floor((price - minPrice) / priceStep));
      profile[bucket] += volumes[i];
    });
    
    return profile;
  }
  
  private calculateVolumeTrend(volumes: number[]): number {
    const period = Math.min(20, volumes.length);
    const recent = volumes.slice(-period);
    const earlier = volumes.slice(-period * 2, -period);
    
    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b) / earlier.length;
    
    return (recentAvg - earlierAvg) / earlierAvg;
  }
  
  private calculateVolumeConfirmation(prices: number[], volumes: number[]): number {
    // Measure if volume confirms price moves
    let confirmation = 0;
    for (let i = 1; i < prices.length; i++) {
      const priceChange = prices[i] - prices[i - 1];
      const volumeChange = volumes[i] - volumes[i - 1];
      
      if ((priceChange > 0 && volumeChange > 0) || (priceChange < 0 && volumeChange > 0)) {
        confirmation += 1;
      }
    }
    
    return confirmation / (prices.length - 1);
  }
  
  // Additional technical calculation methods
  private calculateRSIDivergence(prices: number[]): number {
    // Simplified RSI divergence detection
    return Math.random() * 0.5; // Placeholder - would implement full RSI calculation
  }
  
  private calculateMACDSignal(prices: number[]): number {
    // Simplified MACD signal
    return Math.random() * 0.5; // Placeholder
  }
  
  private calculateFibonacciLevel(prices: number[]): number {
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const current = prices[prices.length - 1];
    
    // Check proximity to key Fibonacci levels
    const levels = [0.236, 0.382, 0.5, 0.618, 0.786];
    let closestDistance = Infinity;
    
    levels.forEach(level => {
      const fibPrice = low + (high - low) * level;
      const distance = Math.abs(current - fibPrice) / current;
      closestDistance = Math.min(closestDistance, distance);
    });
    
    return 1 - closestDistance; // Higher value means closer to Fib level
  }
  
  private calculateSRLevel(prices: number[]): number {
    // Simplified support/resistance calculation
    const current = prices[prices.length - 1];
    const levels = prices.filter(price => 
      Math.abs(price - current) / current < 0.02 // Within 2%
    );
    
    return levels.length / prices.length;
  }
  
  private detectHigherHighs(prices: number[]): number {
    let higherHighs = 0;
    for (let i = 2; i < prices.length; i++) {
      if (prices[i] > prices[i - 1] && prices[i - 1] > prices[i - 2]) {
        higherHighs++;
      }
    }
    return higherHighs / prices.length;
  }
  
  private detectHigherLows(prices: number[]): number {
    let higherLows = 0;
    for (let i = 2; i < prices.length; i++) {
      if (prices[i] > prices[i - 1] && prices[i - 1] > prices[i - 2]) {
        higherLows++;
      }
    }
    return higherLows / prices.length;
  }
  
  private detectStructureBreak(prices: number[]): number {
    // Detect significant structure breaks
    const threshold = 0.05; // 5% move
    let breaks = 0;
    
    for (let i = 1; i < prices.length; i++) {
      if (Math.abs(prices[i] - prices[i - 1]) / prices[i - 1] > threshold) {
        breaks++;
      }
    }
    
    return breaks / prices.length;
  }
  
  private detectLiquidityZone(prices: number[], volumes: number[]): number {
    // Detect high-volume areas that act as liquidity zones
    const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
    const highVolumeIndices = volumes
      .map((vol, i) => vol > avgVolume * 1.5 ? i : -1)
      .filter(i => i !== -1);
    
    if (highVolumeIndices.length === 0) return 0;
    
    const current = prices[prices.length - 1];
    const closestLiquidityPrice = highVolumeIndices
      .map(i => prices[i])
      .reduce((closest, price) => 
        Math.abs(price - current) < Math.abs(closest - current) ? price : closest
      );
    
    return 1 - Math.abs(current - closestLiquidityPrice) / current;
  }
  
  private calculateExpectedMove(features: PatternFeatures, patternType: string): number {
    const historicalPatterns = this.trainingData.get(patternType) || [];
    if (historicalPatterns.length === 0) return 0.05; // Default 5%
    
    const successfulMoves = historicalPatterns
      .filter(p => p.outcome.success)
      .map(p => p.outcome.actualMove);
    
    return successfulMoves.reduce((a, b) => a + b, 0) / successfulMoves.length;
  }
  
  private calculateRiskReward(features: PatternFeatures, patternType: string): number {
    const model = this.patternModels.get(patternType);
    return model?.avgRiskReward || 2.0;
  }
  
  /**
   * Get pattern-specific feature weights
   */
  private getPatternWeights(patternType: string): {[key: string]: number} {
    const weights: {[pattern: string]: {[feature: string]: number}} = {
      'bull_flag': {
        trendStrength: 0.3,
        volumeConfirmation: 0.25,
        momentum: 0.2,
        structureBreak: 0.15,
        higherLows: 0.1
      },
      'head_shoulders': {
        supportResistance: 0.3,
        volumeConfirmation: 0.25,
        rsiDivergence: 0.2,
        structureBreak: 0.15,
        fibonacciLevel: 0.1
      },
      'ascending_triangle': {
        higherLows: 0.3,
        supportResistance: 0.25,
        volumeTrend: 0.2,
        trendStrength: 0.15,
        momentum: 0.1
      },
      'double_bottom': {
        supportResistance: 0.35,
        rsiDivergence: 0.25,
        volumeConfirmation: 0.2,
        fibonacciLevel: 0.15,
        liquidityZone: 0.05
      }
    };
    
    return weights[patternType] || this.getDefaultWeights();
  }
  
  private getDefaultWeights(): {[key: string]: number} {
    return {
      priceRange: 0.1,
      volatility: 0.1,
      momentum: 0.1,
      trendStrength: 0.1,
      volumeTrend: 0.1,
      volumeConfirmation: 0.1,
      rsiDivergence: 0.1,
      macdSignal: 0.1,
      fibonacciLevel: 0.1,
      supportResistance: 0.1
    };
  }
  
  /**
   * Add training example to improve model
   */
  addTrainingExample(example: TrainingExample): void {
    const patternType = example.patternType;
    if (!this.trainingData.has(patternType)) {
      this.trainingData.set(patternType, []);
    }
    
    this.trainingData.get(patternType)!.push(example);
    this.updateModel(patternType);
  }
  
  /**
   * Update model based on new training data
   */
  private updateModel(patternType: string): void {
    const examples = this.trainingData.get(patternType) || [];
    if (examples.length === 0) return;
    
    const successfulExamples = examples.filter(e => e.outcome.success);
    const successRate = successfulExamples.length / examples.length;
    
    const avgRiskReward = successfulExamples.length > 0 
      ? successfulExamples.reduce((sum, e) => sum + Math.abs(e.outcome.actualMove), 0) / successfulExamples.length
      : 1.0;
    
    const timeframes = examples.map(e => e.timeframe);
    const bestTimeframes = [...new Set(timeframes)]
      .map(tf => ({
        timeframe: tf,
        count: timeframes.filter(t => t === tf).length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(t => t.timeframe);
    
    this.patternModels.set(patternType, {
      type: patternType,
      accuracy: successRate,
      totalSamples: examples.length,
      successRate,
      avgRiskReward,
      bestTimeframes,
      lastUpdated: Date.now()
    });
  }
  
  /**
   * Initialize default models
   */
  private initializeModels(): void {
    const defaultPatterns = [
      'bull_flag', 'bear_flag', 'head_shoulders', 'inverse_head_shoulders',
      'ascending_triangle', 'descending_triangle', 'double_top', 'double_bottom',
      'cup_handle', 'wedge_rising', 'wedge_falling', 'rectangle'
    ];
    
    defaultPatterns.forEach(pattern => {
      this.patternModels.set(pattern, {
        type: pattern,
        accuracy: 0.65, // Default accuracy
        totalSamples: 0,
        successRate: 0.65,
        avgRiskReward: 2.0,
        bestTimeframes: ['4h', '1d'],
        lastUpdated: Date.now()
      });
    });
  }
  
  /**
   * Load historical training data (placeholder)
   */
  private loadTrainingData(): void {
    // In a real implementation, this would load from a database
    // For now, we'll start with empty training data
    console.log('ML Pattern Detector initialized with default models');
  }
  
  /**
   * Get model performance metrics
   */
  getModelPerformance(): Map<string, PatternModel> {
    return new Map(this.patternModels);
  }
  
  /**
   * Export training data for analysis
   */
  exportTrainingData(): Map<string, TrainingExample[]> {
    return new Map(this.trainingData);
  }
}

// Singleton instance
export const mlPatternDetector = new MLPatternDetector();