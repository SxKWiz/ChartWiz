/**
 * @fileOverview AI Performance Monitor for tracking and optimizing trading recommendation accuracy
 * 
 * This module provides tools for:
 * - Tracking recommendation performance over time
 * - Analyzing success rates by pattern type and market conditions
 * - Optimizing AI parameters based on historical performance
 * - Generating performance reports and insights
 */

export interface TradeOutcome {
  id: string;
  timestamp: number;
  asset: string;
  entryPrice: number;
  exitPrice: number;
  stopLossPrice: number;
  takeProfitPrices: number[];
  actualExitReason: 'take_profit' | 'stop_loss' | 'manual' | 'timeout';
  actualExitLevel?: number; // Which TP level was hit
  holdingPeriod: number; // in hours
  pnlPercent: number;
  maxDrawdown: number;
  maxRunup: number;
}

export interface RecommendationTrack {
  id: string;
  timestamp: number;
  aiVersion: string;
  asset: string;
  timeframe: string;
  persona: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  marketConditions: {
    trend: string;
    volatility: 'low' | 'medium' | 'high';
    sentiment: number; // -100 to 100
    marketPhase: string;
  };
  recommendation: {
    entryPrice: number;
    takeProfitLevels: number[];
    stopLoss: number;
    riskRewardRatio: number;
    confidence: number;
    patternType?: string;
    confluenceFactors: string[];
  };
  outcome?: TradeOutcome;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  avgWinPercent: number;
  avgLossPercent: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgHoldingPeriod: number;
  avgRiskRewardRatio: number;
  confidenceCalibration: number; // How well confidence matches actual success
}

export interface PatternPerformance {
  patternType: string;
  occurrences: number;
  winRate: number;
  avgRiskReward: number;
  profitFactor: number;
  bestMarketConditions: string[];
  avgConfidence: number;
  actualSuccessRate: number;
}

export interface MarketConditionPerformance {
  condition: string;
  totalTrades: number;
  winRate: number;
  avgRiskReward: number;
  bestPatterns: string[];
  recommendedAdjustments: string[];
}

export class AIPerformanceMonitor {
  private recommendations: Map<string, RecommendationTrack> = new Map();
  private outcomes: Map<string, TradeOutcome> = new Map();

  /**
   * Tracks a new AI recommendation
   */
  trackRecommendation(recommendation: Omit<RecommendationTrack, 'id' | 'timestamp' | 'status'>): string {
    const id = this.generateId();
    const track: RecommendationTrack = {
      ...recommendation,
      id,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.recommendations.set(id, track);
    this.persistData();
    return id;
  }

  /**
   * Updates a recommendation with actual trade outcome
   */
  updateOutcome(recommendationId: string, outcome: TradeOutcome): void {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    recommendation.outcome = outcome;
    recommendation.status = 'completed';
    this.outcomes.set(outcome.id, outcome);
    this.persistData();
  }

  /**
   * Calculates overall performance metrics
   */
  calculateOverallPerformance(timeframeHours?: number): PerformanceMetrics {
    const cutoffTime = timeframeHours ? Date.now() - (timeframeHours * 60 * 60 * 1000) : 0;
    const completedTrades = Array.from(this.recommendations.values())
      .filter(r => r.status === 'completed' && r.timestamp >= cutoffTime && r.outcome);

    if (completedTrades.length === 0) {
      return this.getEmptyMetrics();
    }

    const outcomes = completedTrades.map(t => t.outcome!);
    const wins = outcomes.filter(o => o.pnlPercent > 0);
    const losses = outcomes.filter(o => o.pnlPercent < 0);

    const totalPnl = outcomes.reduce((sum, o) => sum + o.pnlPercent, 0);
    const winRate = wins.length / outcomes.length;
    const avgWinPercent = wins.length > 0 ? wins.reduce((sum, o) => sum + o.pnlPercent, 0) / wins.length : 0;
    const avgLossPercent = losses.length > 0 ? Math.abs(losses.reduce((sum, o) => sum + o.pnlPercent, 0) / losses.length) : 0;
    
    const profitFactor = losses.length > 0 ? (avgWinPercent * wins.length) / (avgLossPercent * losses.length) : 1;
    const maxDrawdown = Math.max(...outcomes.map(o => o.maxDrawdown));
    const avgHoldingPeriod = outcomes.reduce((sum, o) => sum + o.holdingPeriod, 0) / outcomes.length;
    
    // Simplified Sharpe ratio calculation
    const returns = outcomes.map(o => o.pnlPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;

    // Calculate confidence calibration
    const confidenceCalibration = this.calculateConfidenceCalibration(completedTrades);
    
    const avgRiskRewardRatio = completedTrades.reduce((sum, t) => sum + t.recommendation.riskRewardRatio, 0) / completedTrades.length;

    return {
      totalTrades: outcomes.length,
      winRate,
      avgWinPercent,
      avgLossPercent,
      profitFactor,
      maxDrawdown,
      sharpeRatio,
      avgHoldingPeriod,
      avgRiskRewardRatio,
      confidenceCalibration
    };
  }

  /**
   * Analyzes performance by pattern type
   */
  analyzePatternPerformance(): PatternPerformance[] {
    const patternGroups = new Map<string, RecommendationTrack[]>();
    
    Array.from(this.recommendations.values())
      .filter(r => r.status === 'completed' && r.outcome && r.recommendation.patternType)
      .forEach(recommendation => {
        const pattern = recommendation.recommendation.patternType!;
        if (!patternGroups.has(pattern)) {
          patternGroups.set(pattern, []);
        }
        patternGroups.get(pattern)!.push(recommendation);
      });

    return Array.from(patternGroups.entries()).map(([patternType, trades]) => {
      const outcomes = trades.map(t => t.outcome!);
      const wins = outcomes.filter(o => o.pnlPercent > 0);
      const winRate = wins.length / outcomes.length;
      
      const avgRiskReward = trades.reduce((sum, t) => sum + t.recommendation.riskRewardRatio, 0) / trades.length;
      const totalWins = wins.reduce((sum, o) => sum + o.pnlPercent, 0);
      const totalLosses = Math.abs(outcomes.filter(o => o.pnlPercent < 0).reduce((sum, o) => sum + o.pnlPercent, 0));
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 1;

      const avgConfidence = trades.reduce((sum, t) => sum + t.recommendation.confidence, 0) / trades.length;
      const actualSuccessRate = winRate * 100;

      // Find best market conditions for this pattern
      const conditionGroups = new Map<string, number>();
      trades.forEach(t => {
        const condition = `${t.marketConditions.trend}_${t.marketConditions.volatility}`;
        conditionGroups.set(condition, (conditionGroups.get(condition) || 0) + (t.outcome!.pnlPercent > 0 ? 1 : 0));
      });

      const bestMarketConditions = Array.from(conditionGroups.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([condition]) => condition);

      return {
        patternType,
        occurrences: trades.length,
        winRate,
        avgRiskReward,
        profitFactor,
        bestMarketConditions,
        avgConfidence,
        actualSuccessRate
      };
    });
  }

  /**
   * Analyzes performance by market conditions
   */
  analyzeMarketConditionPerformance(): MarketConditionPerformance[] {
    const conditionGroups = new Map<string, RecommendationTrack[]>();
    
    Array.from(this.recommendations.values())
      .filter(r => r.status === 'completed' && r.outcome)
      .forEach(recommendation => {
        const condition = `${recommendation.marketConditions.trend}_${recommendation.marketConditions.volatility}`;
        if (!conditionGroups.has(condition)) {
          conditionGroups.set(condition, []);
        }
        conditionGroups.get(condition)!.push(recommendation);
      });

    return Array.from(conditionGroups.entries()).map(([condition, trades]) => {
      const outcomes = trades.map(t => t.outcome!);
      const wins = outcomes.filter(o => o.pnlPercent > 0);
      const winRate = wins.length / outcomes.length;
      const avgRiskReward = trades.reduce((sum, t) => sum + t.recommendation.riskRewardRatio, 0) / trades.length;

      // Find best patterns for this market condition
      const patternGroups = new Map<string, number>();
      trades.forEach(t => {
        if (t.recommendation.patternType) {
          const pattern = t.recommendation.patternType;
          patternGroups.set(pattern, (patternGroups.get(pattern) || 0) + (t.outcome!.pnlPercent > 0 ? 1 : 0));
        }
      });

      const bestPatterns = Array.from(patternGroups.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern]) => pattern);

      // Generate recommendations based on performance
      const recommendedAdjustments: string[] = [];
      if (winRate < 0.5) {
        recommendedAdjustments.push('Consider tighter entry criteria');
        recommendedAdjustments.push('Increase minimum confidence threshold');
      }
      if (avgRiskReward < 1.5) {
        recommendedAdjustments.push('Improve target selection');
        recommendedAdjustments.push('Optimize stop loss placement');
      }

      return {
        condition,
        totalTrades: trades.length,
        winRate,
        avgRiskReward,
        bestPatterns,
        recommendedAdjustments
      };
    });
  }

  /**
   * Generates optimization recommendations for the AI
   */
  generateOptimizationRecommendations(): {
    confidenceThresholds: { [pattern: string]: number };
    riskRewardTargets: { [pattern: string]: number };
    marketConditionFilters: string[];
    generalRecommendations: string[];
  } {
    const patternPerformance = this.analyzePatternPerformance();
    const marketPerformance = this.analyzeMarketConditionPerformance();
    
    const confidenceThresholds: { [pattern: string]: number } = {};
    const riskRewardTargets: { [pattern: string]: number } = {};
    
    // Set confidence thresholds based on historical performance
    patternPerformance.forEach(pattern => {
      if (pattern.actualSuccessRate < pattern.avgConfidence) {
        // AI is overconfident for this pattern
        confidenceThresholds[pattern.patternType] = Math.min(pattern.avgConfidence + 10, 95);
      } else {
        confidenceThresholds[pattern.patternType] = Math.max(pattern.avgConfidence - 5, 60);
      }
      
      // Set minimum R/R targets
      riskRewardTargets[pattern.patternType] = Math.max(pattern.avgRiskReward * 1.1, 1.5);
    });

    // Identify poor-performing market conditions to filter
    const marketConditionFilters = marketPerformance
      .filter(mc => mc.winRate < 0.4 && mc.totalTrades >= 5)
      .map(mc => `Avoid trading in ${mc.condition} conditions`);

    const generalRecommendations: string[] = [];
    const overallMetrics = this.calculateOverallPerformance();
    
    if (overallMetrics.winRate < 0.55) {
      generalRecommendations.push('Increase minimum confidence threshold globally');
      generalRecommendations.push('Focus on higher-probability setups');
    }
    
    if (overallMetrics.avgRiskRewardRatio < 2.0) {
      generalRecommendations.push('Improve target selection methodology');
      generalRecommendations.push('Consider wider targets with partial exits');
    }
    
    if (overallMetrics.confidenceCalibration < 0.8) {
      generalRecommendations.push('Recalibrate confidence scoring algorithm');
      generalRecommendations.push('Incorporate more historical pattern success rates');
    }

    return {
      confidenceThresholds,
      riskRewardTargets,
      marketConditionFilters,
      generalRecommendations
    };
  }

  /**
   * Exports performance data for external analysis
   */
  exportData(): {
    recommendations: RecommendationTrack[];
    outcomes: TradeOutcome[];
    performance: PerformanceMetrics;
    patternAnalysis: PatternPerformance[];
    marketAnalysis: MarketConditionPerformance[];
  } {
    return {
      recommendations: Array.from(this.recommendations.values()),
      outcomes: Array.from(this.outcomes.values()),
      performance: this.calculateOverallPerformance(),
      patternAnalysis: this.analyzePatternPerformance(),
      marketAnalysis: this.analyzeMarketConditionPerformance()
    };
  }

  private calculateConfidenceCalibration(trades: RecommendationTrack[]): number {
    // Calculate how well AI confidence matches actual success rate
    const confidenceBuckets = new Map<number, { total: number; successes: number }>();
    
    trades.forEach(trade => {
      const confidenceBucket = Math.floor(trade.recommendation.confidence / 10) * 10;
      const bucket = confidenceBuckets.get(confidenceBucket) || { total: 0, successes: 0 };
      bucket.total += 1;
      if (trade.outcome!.pnlPercent > 0) {
        bucket.successes += 1;
      }
      confidenceBuckets.set(confidenceBucket, bucket);
    });

    let totalDeviation = 0;
    let bucketCount = 0;

    confidenceBuckets.forEach((bucket, confidence) => {
      const actualSuccessRate = bucket.successes / bucket.total;
      const expectedSuccessRate = confidence / 100;
      totalDeviation += Math.abs(actualSuccessRate - expectedSuccessRate);
      bucketCount += 1;
    });

    return bucketCount > 0 ? 1 - (totalDeviation / bucketCount) : 0;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winRate: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      avgHoldingPeriod: 0,
      avgRiskRewardRatio: 0,
      confidenceCalibration: 0
    };
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistData(): void {
    // In a real implementation, this would save to a database
    // For now, we could save to localStorage or a file
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_performance_data', JSON.stringify({
        recommendations: Array.from(this.recommendations.entries()),
        outcomes: Array.from(this.outcomes.entries())
      }));
    }
  }

  private loadData(): void {
    // Load persisted data
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('ai_performance_data');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          this.recommendations = new Map(parsed.recommendations);
          this.outcomes = new Map(parsed.outcomes);
        } catch (e) {
          console.warn('Failed to load performance data:', e);
        }
      }
    }
  }

  constructor() {
    this.loadData();
  }
}

// Singleton instance
export const aiPerformanceMonitor = new AIPerformanceMonitor();