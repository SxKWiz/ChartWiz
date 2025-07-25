/**
 * @fileOverview Advanced Pattern Recognition System
 * 
 * This module integrates all pattern recognition components including:
 * - Machine Learning Pattern Detection
 * - Volume Profile Analysis
 * - Market Microstructure Analysis
 * - Harmonic Pattern Detection
 * - Consensus-based pattern validation
 * - Real-time pattern monitoring
 */

import { mlPatternDetector, type PatternPrediction, type PatternFeatures } from './ml-pattern-detector';
import { volumeProfileAnalyzer, type VolumeProfileAnalysis, type PriceVolumeData } from './volume-profile-analyzer';
import { marketMicrostructureAnalyzer, type MarketMicrostructureAnalysis, type OrderBookData, type TradeData } from './market-microstructure-analyzer';
import { harmonicPatternDetector, type PatternScan, type HarmonicPattern } from './harmonic-pattern-detector';

export interface ComprehensivePatternAnalysis {
  timestamp: number;
  asset: string;
  timeframe: string;
  
  // Individual analysis results
  mlPatterns: PatternPrediction[];
  volumeProfile: VolumeProfileAnalysis;
  microstructure: MarketMicrostructureAnalysis;
  harmonicPatterns: PatternScan;
  
  // Consensus analysis
  consensus: {
    overallDirection: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    agreementScore: number;
    conflictingSignals: string[];
  };
  
  // Integrated trading signals
  tradingSignals: {
    entry: {
      price: number;
      direction: 'long' | 'short';
      confidence: number;
      methodology: string[];
    };
    stopLoss: {
      price: number;
      reason: string;
    };
    targets: {
      price: number;
      probability: number;
      methodology: string;
    }[];
    riskReward: number;
    timeframe: string;
  }[];
  
  // Risk assessment
  riskFactors: {
    factor: string;
    severity: 'low' | 'medium' | 'high';
    source: string;
    mitigation: string;
  }[];
  
  // Pattern quality metrics
  qualityMetrics: {
    patternStrength: number;
    volumeConfirmation: number;
    liquidityQuality: number;
    harmonicAccuracy: number;
    overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface PatternMonitoringConfig {
  assets: string[];
  timeframes: string[];
  minConfidence: number;
  enableRealTime: boolean;
  alertThresholds: {
    patternCompletion: number;
    volumeSpike: number;
    liquidityEvent: number;
  };
}

export interface PatternAlert {
  id: string;
  timestamp: number;
  asset: string;
  type: 'pattern_formation' | 'pattern_completion' | 'volume_event' | 'liquidity_event' | 'consensus_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  actionable: boolean;
}

export class AdvancedPatternRecognitionSystem {
  private activeMonitoring: Map<string, PatternMonitoringConfig> = new Map();
  private patternHistory: Map<string, ComprehensivePatternAnalysis[]> = new Map();
  private alertCallbacks: ((alert: PatternAlert) => void)[] = [];
  
  /**
   * Performs comprehensive pattern analysis combining all methodologies
   */
  async analyzePatterns(
    asset: string,
    timeframe: string,
    priceData: number[],
    volumeData: number[],
    timestamps: number[],
    orderBookData?: OrderBookData[],
    tradeData?: TradeData[],
    currentPrice?: number
  ): Promise<ComprehensivePatternAnalysis> {
    
    const analysisTimestamp = Date.now();
    
    // Prepare price-volume data
    const priceVolumeData: PriceVolumeData[] = priceData.map((price, i) => ({
      timestamp: timestamps[i] || Date.now() - (priceData.length - i) * 60000,
      open: price,
      high: price * 1.01, // Simplified - would use actual OHLC
      low: price * 0.99,
      close: price,
      volume: volumeData[i] || 1000
    }));
    
    // Run parallel analysis
    const [mlPatterns, volumeProfile, harmonicPatterns] = await Promise.all([
      this.runMLPatternAnalysis(priceData, volumeData, timeframe, asset),
      this.runVolumeProfileAnalysis(priceVolumeData, currentPrice || priceData[priceData.length - 1]),
      this.runHarmonicPatternAnalysis(priceData, timestamps)
    ]);
    
    // Run microstructure analysis if data available
    let microstructure: MarketMicrostructureAnalysis;
    if (orderBookData && tradeData && currentPrice) {
      microstructure = marketMicrostructureAnalyzer.analyzeMarketMicrostructure(
        orderBookData,
        tradeData,
        currentPrice
      );
    } else {
      // Create default microstructure analysis
      microstructure = this.createDefaultMicrostructureAnalysis();
    }
    
    // Build consensus analysis
    const consensus = this.buildConsensusAnalysis(mlPatterns, volumeProfile, microstructure, harmonicPatterns);
    
    // Generate integrated trading signals
    const tradingSignals = this.generateIntegratedTradingSignals(
      mlPatterns,
      volumeProfile,
      microstructure,
      harmonicPatterns,
      consensus,
      currentPrice || priceData[priceData.length - 1]
    );
    
    // Assess risk factors
    const riskFactors = this.assessRiskFactors(mlPatterns, volumeProfile, microstructure, harmonicPatterns);
    
    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(mlPatterns, volumeProfile, microstructure, harmonicPatterns);
    
    const analysis: ComprehensivePatternAnalysis = {
      timestamp: analysisTimestamp,
      asset,
      timeframe,
      mlPatterns,
      volumeProfile,
      microstructure,
      harmonicPatterns,
      consensus,
      tradingSignals,
      riskFactors,
      qualityMetrics
    };
    
    // Store analysis history
    this.storeAnalysisHistory(asset, analysis);
    
    // Check for alerts
    this.checkForAlerts(analysis);
    
    return analysis;
  }
  
  /**
   * Starts real-time pattern monitoring
   */
  startMonitoring(config: PatternMonitoringConfig): string {
    const monitoringId = `monitor_${Date.now()}`;
    this.activeMonitoring.set(monitoringId, config);
    
    if (config.enableRealTime) {
      this.initializeRealTimeMonitoring(monitoringId, config);
    }
    
    return monitoringId;
  }
  
  /**
   * Stops pattern monitoring
   */
  stopMonitoring(monitoringId: string): boolean {
    return this.activeMonitoring.delete(monitoringId);
  }
  
  /**
   * Adds alert callback
   */
  onAlert(callback: (alert: PatternAlert) => void): void {
    this.alertCallbacks.push(callback);
  }
  
  /**
   * Gets pattern analysis history
   */
  getPatternHistory(asset: string, limit: number = 100): ComprehensivePatternAnalysis[] {
    return (this.patternHistory.get(asset) || []).slice(-limit);
  }
  
  /**
   * Compares current patterns with historical patterns
   */
  compareWithHistoricalPatterns(
    currentAnalysis: ComprehensivePatternAnalysis,
    lookbackPeriods: number = 50
  ): {
    similarPatterns: ComprehensivePatternAnalysis[];
    successRate: number;
    avgOutcome: number;
    recommendations: string[];
  } {
    const history = this.getPatternHistory(currentAnalysis.asset, lookbackPeriods);
    
    // Find similar patterns based on consensus direction and pattern types
    const similarPatterns = history.filter(analysis => {
      return (
        analysis.consensus.overallDirection === currentAnalysis.consensus.overallDirection &&
        this.calculatePatternSimilarity(analysis, currentAnalysis) > 0.7
      );
    });
    
    // Calculate success metrics (simplified - would need actual outcome data)
    const successRate = similarPatterns.length > 0 ? 0.65 : 0.5; // Default values
    const avgOutcome = 0.05; // 5% average move
    
    // Generate recommendations
    const recommendations = this.generateHistoricalRecommendations(
      currentAnalysis,
      similarPatterns,
      successRate
    );
    
    return {
      similarPatterns,
      successRate,
      avgOutcome,
      recommendations
    };
  }
  
  /**
   * Run ML pattern analysis
   */
  private async runMLPatternAnalysis(
    priceData: number[],
    volumeData: number[],
    timeframe: string,
    asset: string
  ): Promise<PatternPrediction[]> {
    try {
      return await mlPatternDetector.detectPatterns(priceData, volumeData, timeframe, asset);
    } catch (error) {
      console.warn('ML pattern analysis failed:', error);
      return [];
    }
  }
  
  /**
   * Run volume profile analysis
   */
  private runVolumeProfileAnalysis(
    priceVolumeData: PriceVolumeData[],
    currentPrice: number
  ): VolumeProfileAnalysis {
    try {
      return volumeProfileAnalyzer.analyzeVolumeProfile(priceVolumeData, currentPrice);
    } catch (error) {
      console.warn('Volume profile analysis failed:', error);
      return this.createDefaultVolumeProfileAnalysis();
    }
  }
  
  /**
   * Run harmonic pattern analysis
   */
  private runHarmonicPatternAnalysis(
    priceData: number[],
    timestamps: number[]
  ): PatternScan {
    try {
      return harmonicPatternDetector.scanForHarmonicPatterns(priceData, timestamps);
    } catch (error) {
      console.warn('Harmonic pattern analysis failed:', error);
      return {
        patterns: [],
        potentialPatterns: [],
        completedPatterns: [],
        qualityMetrics: { averageReliability: 0, fibonacciAccuracy: 0, patternDensity: 0 }
      };
    }
  }
  
  /**
   * Build consensus analysis from all methodologies
   */
  private buildConsensusAnalysis(
    mlPatterns: PatternPrediction[],
    volumeProfile: VolumeProfileAnalysis,
    microstructure: MarketMicrostructureAnalysis,
    harmonicPatterns: PatternScan
  ): ComprehensivePatternAnalysis['consensus'] {
    
    const signals: { direction: string; confidence: number; source: string }[] = [];
    
    // ML patterns
    mlPatterns.forEach(pattern => {
      const direction = pattern.expectedMove > 0 ? 'bullish' : 'bearish';
      signals.push({
        direction,
        confidence: pattern.confidence * pattern.historicalSuccessRate / 100,
        source: 'ml'
      });
    });
    
    // Volume profile
    if (volumeProfile.marketStructure.trend !== 'balanced') {
      const direction = volumeProfile.marketStructure.trend === 'accumulation' ? 'bullish' : 
                       volumeProfile.marketStructure.trend === 'distribution' ? 'bearish' : 'neutral';
      signals.push({
        direction,
        confidence: volumeProfile.marketStructure.strength / 100,
        source: 'volume'
      });
    }
    
    // Microstructure
    if (microstructure.smartMoney.smartMoneyDirection !== 'neutral') {
      signals.push({
        direction: microstructure.smartMoney.smartMoneyDirection,
        confidence: microstructure.smartMoney.confidence / 100,
        source: 'microstructure'
      });
    }
    
    // Harmonic patterns
    harmonicPatterns.completedPatterns.forEach(pattern => {
      signals.push({
        direction: pattern.direction,
        confidence: pattern.completion.confidenceScore / 100,
        source: 'harmonic'
      });
    });
    
    // Calculate consensus
    const bullishSignals = signals.filter(s => s.direction === 'bullish');
    const bearishSignals = signals.filter(s => s.direction === 'bearish');
    
    const bullishWeight = bullishSignals.reduce((sum, s) => sum + s.confidence, 0);
    const bearishWeight = bearishSignals.reduce((sum, s) => sum + s.confidence, 0);
    const totalWeight = bullishWeight + bearishWeight;
    
    let overallDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 0;
    
    if (totalWeight > 0) {
      if (bullishWeight > bearishWeight * 1.2) {
        overallDirection = 'bullish';
        confidence = bullishWeight / totalWeight;
      } else if (bearishWeight > bullishWeight * 1.2) {
        overallDirection = 'bearish';
        confidence = bearishWeight / totalWeight;
      } else {
        confidence = Math.abs(bullishWeight - bearishWeight) / totalWeight;
      }
    }
    
    // Calculate agreement score
    const agreementScore = signals.length > 0 ? 
      signals.filter(s => s.direction === overallDirection).length / signals.length : 0;
    
    // Identify conflicting signals
    const conflictingSignals: string[] = [];
    if (agreementScore < 0.7) {
      conflictingSignals.push('Mixed signals across different methodologies');
    }
    if (bullishWeight > 0 && bearishWeight > 0 && Math.abs(bullishWeight - bearishWeight) / totalWeight < 0.3) {
      conflictingSignals.push('Balanced bullish/bearish signals');
    }
    
    return {
      overallDirection,
      confidence: confidence * 100,
      agreementScore: agreementScore * 100,
      conflictingSignals
    };
  }
  
  /**
   * Generate integrated trading signals
   */
  private generateIntegratedTradingSignals(
    mlPatterns: PatternPrediction[],
    volumeProfile: VolumeProfileAnalysis,
    microstructure: MarketMicrostructureAnalysis,
    harmonicPatterns: PatternScan,
    consensus: ComprehensivePatternAnalysis['consensus'],
    currentPrice: number
  ): ComprehensivePatternAnalysis['tradingSignals'] {
    
    const signals: ComprehensivePatternAnalysis['tradingSignals'] = [];
    
    // High-confidence consensus signals
    if (consensus.confidence > 70 && consensus.agreementScore > 70) {
      const direction = consensus.overallDirection === 'bullish' ? 'long' : 'short';
      const methodologies: string[] = [];
      
      // Determine entry price from most reliable source
      let entryPrice = currentPrice;
      
      // Check harmonic patterns first (most precise entry)
      const bestHarmonic = harmonicPatterns.completedPatterns
        .sort((a, b) => b.reliability - a.reliability)[0];
      
      if (bestHarmonic && bestHarmonic.direction === consensus.overallDirection) {
        entryPrice = bestHarmonic.tradingLevels.entry;
        methodologies.push('Harmonic Pattern');
      }
      
      // Check volume profile levels
      const volumeLevels = consensus.overallDirection === 'bullish' 
        ? volumeProfile.tradingImplications.supportLevels
        : volumeProfile.tradingImplications.resistanceLevels;
      
      if (volumeLevels.length > 0) {
        methodologies.push('Volume Profile');
      }
      
      // Check ML patterns
      const relevantMLPatterns = mlPatterns.filter(p => 
        (p.expectedMove > 0) === (consensus.overallDirection === 'bullish')
      );
      
      if (relevantMLPatterns.length > 0) {
        methodologies.push('ML Pattern Recognition');
      }
      
      // Calculate stop loss
      let stopLossPrice = currentPrice;
      let stopLossReason = 'Conservative stop loss';
      
      if (bestHarmonic) {
        stopLossPrice = bestHarmonic.tradingLevels.stopLoss;
        stopLossReason = 'Harmonic pattern invalidation';
      } else if (volumeProfile.tradingImplications.riskZones.length > 0) {
        stopLossPrice = volumeProfile.tradingImplications.riskZones[0];
        stopLossReason = 'Volume profile risk zone';
      } else {
        const stopDistance = currentPrice * 0.03; // 3% stop
        stopLossPrice = consensus.overallDirection === 'bullish' 
          ? currentPrice - stopDistance
          : currentPrice + stopDistance;
      }
      
      // Calculate targets
      const targets: { price: number; probability: number; methodology: string }[] = [];
      
      if (bestHarmonic) {
        bestHarmonic.tradingLevels.targets.forEach((target, index) => {
          targets.push({
            price: target,
            probability: Math.max(30, 80 - index * 15),
            methodology: `Harmonic ${bestHarmonic.type} target ${index + 1}`
          });
        });
      }
      
      // Add volume profile targets
      if (volumeProfile.tradingImplications.targetZones.length > 0) {
        volumeProfile.tradingImplications.targetZones.forEach(target => {
          targets.push({
            price: target,
            probability: 60,
            methodology: 'Volume imbalance zone'
          });
        });
      }
      
      // Default targets if none found
      if (targets.length === 0) {
        const targetDistance = Math.abs(entryPrice - stopLossPrice) * 2; // 2:1 R/R
        const targetPrice = consensus.overallDirection === 'bullish'
          ? entryPrice + targetDistance
          : entryPrice - targetDistance;
        
        targets.push({
          price: targetPrice,
          probability: 50,
          methodology: 'Risk-reward based target'
        });
      }
      
      // Calculate risk-reward
      const risk = Math.abs(entryPrice - stopLossPrice);
      const reward = targets.length > 0 ? Math.abs(targets[0].price - entryPrice) : risk * 2;
      const riskReward = reward / risk;
      
      signals.push({
        entry: {
          price: entryPrice,
          direction,
          confidence: consensus.confidence,
          methodology: methodologies
        },
        stopLoss: {
          price: stopLossPrice,
          reason: stopLossReason
        },
        targets,
        riskReward,
        timeframe: this.determineOptimalTimeframe(mlPatterns, harmonicPatterns)
      });
    }
    
    return signals;
  }
  
  /**
   * Assess risk factors across all methodologies
   */
  private assessRiskFactors(
    mlPatterns: PatternPrediction[],
    volumeProfile: VolumeProfileAnalysis,
    microstructure: MarketMicrostructureAnalysis,
    harmonicPatterns: PatternScan
  ): ComprehensivePatternAnalysis['riskFactors'] {
    
    const riskFactors: ComprehensivePatternAnalysis['riskFactors'] = [];
    
    // ML pattern risks
    if (mlPatterns.length > 0) {
      const avgConfidence = mlPatterns.reduce((sum, p) => sum + p.confidence, 0) / mlPatterns.length;
      if (avgConfidence < 70) {
        riskFactors.push({
          factor: 'Low ML pattern confidence',
          severity: 'medium',
          source: 'ML Analysis',
          mitigation: 'Reduce position size or wait for higher confidence signals'
        });
      }
    }
    
    // Volume profile risks
    if (volumeProfile.marketStructure.trend === 'balanced') {
      riskFactors.push({
        factor: 'Market in balance - direction unclear',
        severity: 'medium',
        source: 'Volume Profile',
        mitigation: 'Wait for breakout confirmation or trade range bounds'
      });
    }
    
    // Microstructure risks
    microstructure.tradingImplications.riskFactors.forEach(risk => {
      riskFactors.push({
        factor: risk,
        severity: 'medium',
        source: 'Market Microstructure',
        mitigation: 'Consider order splitting or alternative execution'
      });
    });
    
    // Harmonic pattern risks
    if (harmonicPatterns.patterns.length > 0) {
      const avgReliability = harmonicPatterns.qualityMetrics.averageReliability;
      if (avgReliability < 70) {
        riskFactors.push({
          factor: 'Low harmonic pattern reliability',
          severity: 'low',
          source: 'Harmonic Analysis',
          mitigation: 'Confirm with additional technical analysis'
        });
      }
    }
    
    return riskFactors;
  }
  
  /**
   * Calculate overall quality metrics
   */
  private calculateQualityMetrics(
    mlPatterns: PatternPrediction[],
    volumeProfile: VolumeProfileAnalysis,
    microstructure: MarketMicrostructureAnalysis,
    harmonicPatterns: PatternScan
  ): ComprehensivePatternAnalysis['qualityMetrics'] {
    
    // Pattern strength (average of all pattern confidences)
    const patternStrength = mlPatterns.length > 0 
      ? mlPatterns.reduce((sum, p) => sum + p.confidence, 0) / mlPatterns.length
      : 0;
    
    // Volume confirmation
    const volumeConfirmation = volumeProfile.marketStructure.strength;
    
    // Liquidity quality
    const liquidityQuality = microstructure.marketQuality.overall === 'excellent' ? 90 :
                            microstructure.marketQuality.overall === 'good' ? 75 :
                            microstructure.marketQuality.overall === 'fair' ? 50 : 25;
    
    // Harmonic accuracy
    const harmonicAccuracy = harmonicPatterns.qualityMetrics.fibonacciAccuracy * 100;
    
    // Overall quality
    const overallScore = (patternStrength + volumeConfirmation + liquidityQuality + harmonicAccuracy) / 4;
    
    let overallQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (overallScore >= 80) overallQuality = 'excellent';
    else if (overallScore >= 65) overallQuality = 'good';
    else if (overallScore >= 50) overallQuality = 'fair';
    
    return {
      patternStrength,
      volumeConfirmation,
      liquidityQuality,
      harmonicAccuracy,
      overallQuality
    };
  }
  
  /**
   * Store analysis in history
   */
  private storeAnalysisHistory(asset: string, analysis: ComprehensivePatternAnalysis): void {
    if (!this.patternHistory.has(asset)) {
      this.patternHistory.set(asset, []);
    }
    
    const history = this.patternHistory.get(asset)!;
    history.push(analysis);
    
    // Keep only last 1000 analyses
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }
  
  /**
   * Check for alerts and trigger callbacks
   */
  private checkForAlerts(analysis: ComprehensivePatternAnalysis): void {
    const alerts: PatternAlert[] = [];
    
    // High-confidence pattern formation
    if (analysis.consensus.confidence > 80) {
      alerts.push({
        id: `alert_${Date.now()}`,
        timestamp: analysis.timestamp,
        asset: analysis.asset,
        type: 'pattern_formation',
        severity: 'high',
        message: `High-confidence ${analysis.consensus.overallDirection} pattern detected`,
        data: analysis.consensus,
        actionable: true
      });
    }
    
    // Pattern completion
    if (analysis.harmonicPatterns.completedPatterns.length > 0) {
      analysis.harmonicPatterns.completedPatterns.forEach(pattern => {
        if (pattern.completion.confidenceScore > 85) {
          alerts.push({
            id: `alert_${Date.now()}_${pattern.type}`,
            timestamp: analysis.timestamp,
            asset: analysis.asset,
            type: 'pattern_completion',
            severity: 'critical',
            message: `${pattern.type} pattern completed at high confidence`,
            data: pattern,
            actionable: true
          });
        }
      });
    }
    
    // Trigger alert callbacks
    alerts.forEach(alert => {
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Error in alert callback:', error);
        }
      });
    });
  }
  
  /**
   * Initialize real-time monitoring (placeholder)
   */
  private initializeRealTimeMonitoring(monitoringId: string, config: PatternMonitoringConfig): void {
    // In a real implementation, this would set up WebSocket connections or polling
    console.log(`Started real-time monitoring for ${config.assets.join(', ')}`);
  }
  
  /**
   * Calculate pattern similarity
   */
  private calculatePatternSimilarity(
    analysis1: ComprehensivePatternAnalysis,
    analysis2: ComprehensivePatternAnalysis
  ): number {
    let similarity = 0;
    let factors = 0;
    
    // Compare consensus direction
    if (analysis1.consensus.overallDirection === analysis2.consensus.overallDirection) {
      similarity += 1;
    }
    factors++;
    
    // Compare ML patterns
    const mlSimilarity = this.compareMLPatterns(analysis1.mlPatterns, analysis2.mlPatterns);
    similarity += mlSimilarity;
    factors++;
    
    // Compare volume profile
    const volumeSimilarity = this.compareVolumeProfiles(analysis1.volumeProfile, analysis2.volumeProfile);
    similarity += volumeSimilarity;
    factors++;
    
    return factors > 0 ? similarity / factors : 0;
  }
  
  private compareMLPatterns(patterns1: PatternPrediction[], patterns2: PatternPrediction[]): number {
    // Simplified comparison - would implement more sophisticated matching
    if (patterns1.length === 0 && patterns2.length === 0) return 1;
    if (patterns1.length === 0 || patterns2.length === 0) return 0;
    
    const types1 = new Set(patterns1.map(p => p.patternType));
    const types2 = new Set(patterns2.map(p => p.patternType));
    
    const intersection = new Set([...types1].filter(x => types2.has(x)));
    const union = new Set([...types1, ...types2]);
    
    return intersection.size / union.size;
  }
  
  private compareVolumeProfiles(profile1: VolumeProfileAnalysis, profile2: VolumeProfileAnalysis): number {
    // Compare market structure trends
    return profile1.marketStructure.trend === profile2.marketStructure.trend ? 1 : 0;
  }
  
  /**
   * Generate historical recommendations
   */
  private generateHistoricalRecommendations(
    currentAnalysis: ComprehensivePatternAnalysis,
    similarPatterns: ComprehensivePatternAnalysis[],
    successRate: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (successRate > 0.7) {
      recommendations.push('Historical patterns show strong success rate - consider full position size');
    } else if (successRate > 0.5) {
      recommendations.push('Moderate historical success - consider standard position sizing');
    } else {
      recommendations.push('Lower historical success rate - reduce position size or avoid');
    }
    
    if (similarPatterns.length > 10) {
      recommendations.push('Strong historical precedent with multiple similar setups');
    } else if (similarPatterns.length < 3) {
      recommendations.push('Limited historical data - exercise extra caution');
    }
    
    return recommendations;
  }
  
  /**
   * Determine optimal timeframe
   */
  private determineOptimalTimeframe(
    mlPatterns: PatternPrediction[],
    harmonicPatterns: PatternScan
  ): string {
    const timeframes: string[] = [];
    
    mlPatterns.forEach(pattern => {
      timeframes.push(pattern.timeframe);
    });
    
    // Count timeframe occurrences
    const timeframeCounts = timeframes.reduce((acc, tf) => {
      acc[tf] = (acc[tf] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Return most common timeframe or default
    const mostCommon = Object.entries(timeframeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    return mostCommon || '4h';
  }
  
  /**
   * Create default microstructure analysis when data unavailable
   */
  private createDefaultMicrostructureAnalysis(): MarketMicrostructureAnalysis {
    return {
      spreadAnalysis: {
        bidAskSpread: 0,
        spreadPercent: 0.1,
        midPrice: 0,
        spreadTrend: 'stable',
        liquidity: 'medium',
        impactCost: 0
      },
      orderFlow: {
        buyPressure: 50,
        sellPressure: 50,
        netFlow: 0,
        flowImbalance: 0,
        aggressiveRatio: 0.5,
        passiveRatio: 0.5,
        volumeWeightedPrice: 0
      },
      liquidity: {
        bidLiquidity: 1000,
        askLiquidity: 1000,
        totalLiquidity: 2000,
        liquidityImbalance: 0,
        depth: { levels: 10, totalSize: 2000, averageSize: 200 },
        resiliency: 75
      },
      smartMoney: {
        institutionalFlow: 0,
        retailFlow: 0,
        whaleActivity: false,
        smartMoneyDirection: 'neutral',
        confidence: 0,
        largeTradeThreshold: 0
      },
      marketQuality: {
        efficiency: 75,
        fairness: 75,
        transparency: 75,
        overall: 'good'
      },
      tradingImplications: {
        optimalExecutionSize: 100,
        bestExecutionTime: 'Current conditions acceptable',
        riskFactors: [],
        opportunities: []
      }
    };
  }
  
  /**
   * Create default volume profile analysis when data unavailable
   */
  private createDefaultVolumeProfileAnalysis(): VolumeProfileAnalysis {
    return {
      profile: {
        nodes: [],
        pointOfControl: { price: 0, volume: 0, volumePercent: 0, trades: 0, buyVolume: 0, sellVolume: 0, imbalance: 0.5 },
        valueAreaHigh: 0,
        valueAreaLow: 0,
        totalVolume: 0,
        profileType: 'balanced',
        institutionalLevels: []
      },
      keyLevels: [],
      imbalances: [],
      marketStructure: {
        trend: 'balanced',
        phase: 'middle',
        strength: 50
      },
      tradingImplications: {
        supportLevels: [],
        resistanceLevels: [],
        targetZones: [],
        riskZones: []
      }
    };
  }
}

// Singleton instance
export const advancedPatternRecognitionSystem = new AdvancedPatternRecognitionSystem();