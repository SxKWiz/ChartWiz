/**
 * @fileOverview Harmonic Pattern Detector
 * 
 * This module provides automated detection of harmonic patterns including:
 * - Gartley patterns (Classic Gartley 222)
 * - Butterfly patterns (Bullish/Bearish)
 * - Bat patterns (Bullish/Bearish)
 * - Crab patterns
 * - ABCD patterns
 * - Fibonacci ratio validation
 * - Pattern completion predictions
 */

export interface PricePoint {
  timestamp: number;
  price: number;
  index: number;
}

export interface FibonacciRatio {
  ratio: number;
  tolerance: number;
  isValid: boolean;
  actualRatio: number;
  deviation: number;
}

export interface HarmonicPattern {
  type: 'gartley' | 'butterfly' | 'bat' | 'crab' | 'abcd' | 'cypher' | 'shark';
  direction: 'bullish' | 'bearish';
  points: {
    X: PricePoint;
    A: PricePoint;
    B: PricePoint;
    C: PricePoint;
    D?: PricePoint; // Completion point (may be projected)
  };
  fibonacciRatios: {
    AB_XA: FibonacciRatio;
    BC_AB: FibonacciRatio;
    CD_BC?: FibonacciRatio;
    AD_XA?: FibonacciRatio;
  };
  completion: {
    isComplete: boolean;
    projectedD?: number;
    confidenceScore: number;
    validationScore: number;
  };
  tradingLevels: {
    entry: number;
    stopLoss: number;
    targets: number[];
    riskRewardRatio: number;
  };
  reliability: number; // 0-100 based on historical performance
}

export interface PatternScan {
  patterns: HarmonicPattern[];
  potentialPatterns: HarmonicPattern[];
  completedPatterns: HarmonicPattern[];
  qualityMetrics: {
    averageReliability: number;
    fibonacciAccuracy: number;
    patternDensity: number;
  };
}

export interface PatternTemplate {
  type: string;
  direction: 'bullish' | 'bearish';
  ratios: {
    AB_XA: { min: number; max: number; ideal: number };
    BC_AB: { min: number; max: number; ideal: number };
    CD_BC: { min: number; max: number; ideal: number };
    AD_XA: { min: number; max: number; ideal: number };
  };
  description: string;
  reliability: number;
}

export class HarmonicPatternDetector {
  private readonly FIBONACCI_TOLERANCE = 0.05; // 5% tolerance for Fibonacci ratios
  private readonly MIN_PATTERN_BARS = 20; // Minimum bars between pattern points
  private readonly MAX_PATTERN_BARS = 200; // Maximum bars for pattern completion
  private readonly PIVOT_STRENGTH = 3; // Bars before/after for pivot validation
  
  private patternTemplates: Map<string, PatternTemplate> = new Map();
  
  constructor() {
    this.initializePatternTemplates();
  }
  
  /**
   * Scans price data for harmonic patterns
   */
  scanForHarmonicPatterns(
    priceData: number[],
    timestamps: number[],
    scanType: 'all' | 'complete' | 'potential' = 'all'
  ): PatternScan {
    if (priceData.length < this.MIN_PATTERN_BARS * 4) {
      throw new Error('Insufficient data for harmonic pattern analysis');
    }
    
    // Find significant pivots
    const pivots = this.findPivots(priceData, timestamps);
    
    // Scan for different pattern types
    const allPatterns: HarmonicPattern[] = [];
    
    // Scan for each pattern type
    for (const [patternType, template] of this.patternTemplates) {
      const patterns = this.scanForPatternType(pivots, template, priceData);
      allPatterns.push(...patterns);
    }
    
    // Filter and categorize patterns
    const patterns = allPatterns.filter(p => p.completion.validationScore > 0.7);
    const potentialPatterns = patterns.filter(p => !p.completion.isComplete);
    const completedPatterns = patterns.filter(p => p.completion.isComplete);
    
    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(patterns);
    
    return {
      patterns: scanType === 'all' ? patterns : scanType === 'complete' ? completedPatterns : potentialPatterns,
      potentialPatterns,
      completedPatterns,
      qualityMetrics
    };
  }
  
  /**
   * Predicts pattern completion for potential patterns
   */
  predictPatternCompletion(
    pattern: HarmonicPattern,
    currentPrice: number
  ): {
    projectedCompletion: number;
    timeEstimate: number;
    probability: number;
    tradingPlan: {
      shouldEnter: boolean;
      entryPrice: number;
      stopLoss: number;
      targets: number[];
      timeframe: string;
    };
  } {
    const template = this.patternTemplates.get(pattern.type);
    if (!template) {
      throw new Error(`Unknown pattern type: ${pattern.type}`);
    }
    
    // Calculate D point projection
    const projectedD = this.calculateDPointProjection(pattern, template);
    
    // Estimate time to completion
    const avgPatternDuration = this.calculateAveragePatternDuration(pattern);
    const timeEstimate = avgPatternDuration * 0.618; // Fibonacci-based estimate
    
    // Calculate completion probability
    const probability = this.calculateCompletionProbability(pattern, currentPrice);
    
    // Generate trading plan
    const tradingPlan = this.generateTradingPlan(pattern, projectedD, currentPrice);
    
    return {
      projectedCompletion: projectedD,
      timeEstimate,
      probability,
      tradingPlan
    };
  }
  
  /**
   * Validates Fibonacci ratios for a pattern
   */
  validateFibonacciRatios(
    points: HarmonicPattern['points'],
    template: PatternTemplate
  ): HarmonicPattern['fibonacciRatios'] {
    const { X, A, B, C, D } = points;
    
    // Calculate actual ratios
    const xaDistance = Math.abs(A.price - X.price);
    const abDistance = Math.abs(B.price - A.price);
    const bcDistance = Math.abs(C.price - B.price);
    
    const ab_xa_ratio = abDistance / xaDistance;
    const bc_ab_ratio = bcDistance / abDistance;
    
    // Validate AB/XA ratio
    const AB_XA = this.validateRatio(
      ab_xa_ratio,
      template.ratios.AB_XA.ideal,
      this.FIBONACCI_TOLERANCE
    );
    
    // Validate BC/AB ratio
    const BC_AB = this.validateRatio(
      bc_ab_ratio,
      template.ratios.BC_AB.ideal,
      this.FIBONACCI_TOLERANCE
    );
    
    let CD_BC: FibonacciRatio | undefined;
    let AD_XA: FibonacciRatio | undefined;
    
    if (D) {
      const cdDistance = Math.abs(D.price - C.price);
      const adDistance = Math.abs(D.price - A.price);
      
      const cd_bc_ratio = cdDistance / bcDistance;
      const ad_xa_ratio = adDistance / xaDistance;
      
      CD_BC = this.validateRatio(
        cd_bc_ratio,
        template.ratios.CD_BC.ideal,
        this.FIBONACCI_TOLERANCE
      );
      
      AD_XA = this.validateRatio(
        ad_xa_ratio,
        template.ratios.AD_XA.ideal,
        this.FIBONACCI_TOLERANCE
      );
    }
    
    return { AB_XA, BC_AB, CD_BC, AD_XA };
  }
  
  /**
   * Calculates trading levels for a pattern
   */
  calculateTradingLevels(
    pattern: HarmonicPattern,
    projectedD?: number
  ): HarmonicPattern['tradingLevels'] {
    const { points, direction } = pattern;
    const dPrice = projectedD || points.D?.price;
    
    if (!dPrice) {
      throw new Error('Cannot calculate trading levels without D point');
    }
    
    // Entry at D point
    const entry = dPrice;
    
    // Stop loss beyond X point
    const stopLossBuffer = Math.abs(points.A.price - points.X.price) * 0.236; // 23.6% of XA move
    const stopLoss = direction === 'bullish' 
      ? points.X.price - stopLossBuffer
      : points.X.price + stopLossBuffer;
    
    // Targets based on Fibonacci retracements
    const adMove = Math.abs(dPrice - points.A.price);
    const targets: number[] = [];
    
    const fibLevels = [0.382, 0.618, 0.786, 1.0, 1.272];
    
    fibLevels.forEach(level => {
      const target = direction === 'bullish'
        ? dPrice + (adMove * level)
        : dPrice - (adMove * level);
      targets.push(target);
    });
    
    // Calculate risk-reward ratio
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(targets[0] - entry);
    const riskRewardRatio = reward / risk;
    
    return {
      entry,
      stopLoss,
      targets,
      riskRewardRatio
    };
  }
  
  /**
   * Find significant price pivots
   */
  private findPivots(priceData: number[], timestamps: number[]): PricePoint[] {
    const pivots: PricePoint[] = [];
    const strength = this.PIVOT_STRENGTH;
    
    for (let i = strength; i < priceData.length - strength; i++) {
      const currentPrice = priceData[i];
      let isHighPivot = true;
      let isLowPivot = true;
      
      // Check if current point is a high pivot
      for (let j = i - strength; j <= i + strength; j++) {
        if (j !== i && priceData[j] >= currentPrice) {
          isHighPivot = false;
          break;
        }
      }
      
      // Check if current point is a low pivot
      for (let j = i - strength; j <= i + strength; j++) {
        if (j !== i && priceData[j] <= currentPrice) {
          isLowPivot = false;
          break;
        }
      }
      
      if (isHighPivot || isLowPivot) {
        pivots.push({
          timestamp: timestamps[i],
          price: currentPrice,
          index: i
        });
      }
    }
    
    return pivots;
  }
  
  /**
   * Scan for specific pattern type
   */
  private scanForPatternType(
    pivots: PricePoint[],
    template: PatternTemplate,
    priceData: number[]
  ): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    
    // Need at least 4 pivots for XABC pattern
    if (pivots.length < 4) return patterns;
    
    // Scan through pivot combinations
    for (let x = 0; x < pivots.length - 3; x++) {
      for (let a = x + 1; a < pivots.length - 2; a++) {
        for (let b = a + 1; b < pivots.length - 1; b++) {
          for (let c = b + 1; c < pivots.length; c++) {
            const xPoint = pivots[x];
            const aPoint = pivots[a];
            const bPoint = pivots[b];
            const cPoint = pivots[c];
            
            // Check if pivot sequence matches pattern direction
            if (!this.isValidPivotSequence(xPoint, aPoint, bPoint, cPoint, template.direction)) {
              continue;
            }
            
            // Check time constraints
            if (!this.isValidTimeSequence(xPoint, aPoint, bPoint, cPoint)) {
              continue;
            }
            
            const points = { X: xPoint, A: aPoint, B: bPoint, C: cPoint };
            
            // Validate Fibonacci ratios for XAB and ABC
            const partialRatios = this.validatePartialFibonacciRatios(points, template);
            
            if (partialRatios.AB_XA.isValid && partialRatios.BC_AB.isValid) {
              // Calculate D point projection
              const projectedD = this.calculateDPointProjection({ 
                type: template.type as any, 
                direction: template.direction, 
                points, 
                fibonacciRatios: partialRatios,
                completion: { isComplete: false, confidenceScore: 0, validationScore: 0 },
                tradingLevels: { entry: 0, stopLoss: 0, targets: [], riskRewardRatio: 0 },
                reliability: 0
              }, template);
              
              // Check if we have actual D point (pattern completion)
              const actualDIndex = this.findNearestPivot(pivots, projectedD, cPoint.index);
              const isComplete = actualDIndex !== -1;
              const dPoint = isComplete ? pivots[actualDIndex] : undefined;
              
              const completionPoints = dPoint 
                ? { ...points, D: dPoint }
                : points;
              
              // Calculate full ratios if pattern is complete
              const fibonacciRatios = dPoint
                ? this.validateFibonacciRatios(completionPoints, template)
                : partialRatios;
              
              // Calculate validation score
              const validationScore = this.calculateValidationScore(fibonacciRatios, template);
              
              if (validationScore > 0.6) { // Minimum validation threshold
                const pattern: HarmonicPattern = {
                  type: template.type as any,
                  direction: template.direction,
                  points: completionPoints,
                  fibonacciRatios,
                  completion: {
                    isComplete,
                    projectedD: projectedD,
                    confidenceScore: this.calculateConfidenceScore(fibonacciRatios),
                    validationScore
                  },
                  tradingLevels: this.calculateTradingLevels({ 
                    type: template.type as any, 
                    direction: template.direction, 
                    points: completionPoints, 
                    fibonacciRatios, 
                    completion: { isComplete, confidenceScore: 0, validationScore: 0 },
                    tradingLevels: { entry: 0, stopLoss: 0, targets: [], riskRewardRatio: 0 },
                    reliability: 0
                  }, projectedD),
                  reliability: template.reliability
                };
                
                patterns.push(pattern);
              }
            }
          }
        }
      }
    }
    
    return patterns;
  }
  
  /**
   * Validate a Fibonacci ratio
   */
  private validateRatio(
    actualRatio: number,
    expectedRatio: number,
    tolerance: number
  ): FibonacciRatio {
    const deviation = Math.abs(actualRatio - expectedRatio) / expectedRatio;
    const isValid = deviation <= tolerance;
    
    return {
      ratio: expectedRatio,
      tolerance,
      isValid,
      actualRatio,
      deviation
    };
  }
  
  /**
   * Check if pivot sequence matches pattern direction
   */
  private isValidPivotSequence(
    x: PricePoint,
    a: PricePoint,
    b: PricePoint,
    c: PricePoint,
    direction: 'bullish' | 'bearish'
  ): boolean {
    if (direction === 'bullish') {
      // Bullish: X high, A low, B high, C low
      return x.price > a.price && b.price > a.price && c.price < b.price;
    } else {
      // Bearish: X low, A high, B low, C high
      return x.price < a.price && b.price < a.price && c.price > b.price;
    }
  }
  
  /**
   * Check if time sequence is valid
   */
  private isValidTimeSequence(
    x: PricePoint,
    a: PricePoint,
    b: PricePoint,
    c: PricePoint
  ): boolean {
    const xa_bars = a.index - x.index;
    const ab_bars = b.index - a.index;
    const bc_bars = c.index - b.index;
    
    return (
      xa_bars >= this.MIN_PATTERN_BARS &&
      ab_bars >= this.MIN_PATTERN_BARS &&
      bc_bars >= this.MIN_PATTERN_BARS &&
      (c.index - x.index) <= this.MAX_PATTERN_BARS
    );
  }
  
  /**
   * Validate partial Fibonacci ratios (for incomplete patterns)
   */
  private validatePartialFibonacciRatios(
    points: { X: PricePoint; A: PricePoint; B: PricePoint; C: PricePoint },
    template: PatternTemplate
  ): { AB_XA: FibonacciRatio; BC_AB: FibonacciRatio } {
    const { X, A, B, C } = points;
    
    const xaDistance = Math.abs(A.price - X.price);
    const abDistance = Math.abs(B.price - A.price);
    const bcDistance = Math.abs(C.price - B.price);
    
    const ab_xa_ratio = abDistance / xaDistance;
    const bc_ab_ratio = bcDistance / abDistance;
    
    const AB_XA = this.validateRatio(
      ab_xa_ratio,
      template.ratios.AB_XA.ideal,
      this.FIBONACCI_TOLERANCE
    );
    
    const BC_AB = this.validateRatio(
      bc_ab_ratio,
      template.ratios.BC_AB.ideal,
      this.FIBONACCI_TOLERANCE
    );
    
    return { AB_XA, BC_AB };
  }
  
  /**
   * Calculate D point projection
   */
  private calculateDPointProjection(
    pattern: HarmonicPattern,
    template: PatternTemplate
  ): number {
    const { A, C } = pattern.points;
    const bcDistance = Math.abs(C.price - pattern.points.B.price);
    
    // Use CD/BC ratio to project D point
    const cdDistance = bcDistance * template.ratios.CD_BC.ideal;
    
    if (pattern.direction === 'bullish') {
      return C.price - cdDistance; // D should be below C for bullish pattern
    } else {
      return C.price + cdDistance; // D should be above C for bearish pattern
    }
  }
  
  /**
   * Find nearest pivot to projected price
   */
  private findNearestPivot(
    pivots: PricePoint[],
    projectedPrice: number,
    afterIndex: number
  ): number {
    const tolerance = projectedPrice * 0.02; // 2% tolerance
    
    for (let i = afterIndex + 1; i < pivots.length; i++) {
      if (Math.abs(pivots[i].price - projectedPrice) <= tolerance) {
        return i;
      }
    }
    
    return -1;
  }
  
  /**
   * Calculate validation score for a pattern
   */
  private calculateValidationScore(
    ratios: HarmonicPattern['fibonacciRatios'],
    template: PatternTemplate
  ): number {
    let score = 0;
    let totalRatios = 0;
    
    if (ratios.AB_XA.isValid) score += (1 - ratios.AB_XA.deviation);
    totalRatios++;
    
    if (ratios.BC_AB.isValid) score += (1 - ratios.BC_AB.deviation);
    totalRatios++;
    
    if (ratios.CD_BC) {
      if (ratios.CD_BC.isValid) score += (1 - ratios.CD_BC.deviation);
      totalRatios++;
    }
    
    if (ratios.AD_XA) {
      if (ratios.AD_XA.isValid) score += (1 - ratios.AD_XA.deviation);
      totalRatios++;
    }
    
    return totalRatios > 0 ? score / totalRatios : 0;
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(ratios: HarmonicPattern['fibonacciRatios']): number {
    const validRatios = [
      ratios.AB_XA,
      ratios.BC_AB,
      ratios.CD_BC,
      ratios.AD_XA
    ].filter(ratio => ratio?.isValid).length;
    
    const totalRatios = [
      ratios.AB_XA,
      ratios.BC_AB,
      ratios.CD_BC,
      ratios.AD_XA
    ].filter(ratio => ratio !== undefined).length;
    
    return totalRatios > 0 ? (validRatios / totalRatios) * 100 : 0;
  }
  
  /**
   * Calculate average pattern duration
   */
  private calculateAveragePatternDuration(pattern: HarmonicPattern): number {
    const { X, A, B, C } = pattern.points;
    const xa_duration = A.index - X.index;
    const ab_duration = B.index - A.index;
    const bc_duration = C.index - B.index;
    
    return (xa_duration + ab_duration + bc_duration) / 3;
  }
  
  /**
   * Calculate completion probability
   */
  private calculateCompletionProbability(
    pattern: HarmonicPattern,
    currentPrice: number
  ): number {
    if (!pattern.completion.projectedD) return 0;
    
    const distanceToProjection = Math.abs(currentPrice - pattern.completion.projectedD);
    const totalMove = Math.abs(pattern.points.C.price - pattern.points.A.price);
    
    // Higher probability when closer to projection
    const proximityScore = Math.max(0, 1 - (distanceToProjection / totalMove));
    
    // Combine with validation score
    return (proximityScore * 0.6 + pattern.completion.validationScore * 0.4) * 100;
  }
  
  /**
   * Generate trading plan
   */
  private generateTradingPlan(
    pattern: HarmonicPattern,
    projectedD: number,
    currentPrice: number
  ): {
    shouldEnter: boolean;
    entryPrice: number;
    stopLoss: number;
    targets: number[];
    timeframe: string;
  } {
    const tradingLevels = this.calculateTradingLevels(pattern, projectedD);
    const distanceToEntry = Math.abs(currentPrice - projectedD) / currentPrice;
    
    const shouldEnter = (
      distanceToEntry < 0.02 && // Within 2% of entry
      tradingLevels.riskRewardRatio > 1.5 && // Good risk/reward
      pattern.completion.validationScore > 0.7 // Strong pattern
    );
    
    return {
      shouldEnter,
      entryPrice: tradingLevels.entry,
      stopLoss: tradingLevels.stopLoss,
      targets: tradingLevels.targets,
      timeframe: this.getRecommendedTimeframe(pattern)
    };
  }
  
  /**
   * Get recommended timeframe
   */
  private getRecommendedTimeframe(pattern: HarmonicPattern): string {
    const patternDuration = pattern.points.C.index - pattern.points.X.index;
    
    if (patternDuration < 50) return '1h-4h';
    if (patternDuration < 100) return '4h-1d';
    return '1d-1w';
  }
  
  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics(patterns: HarmonicPattern[]): {
    averageReliability: number;
    fibonacciAccuracy: number;
    patternDensity: number;
  } {
    if (patterns.length === 0) {
      return { averageReliability: 0, fibonacciAccuracy: 0, patternDensity: 0 };
    }
    
    const averageReliability = patterns.reduce((sum, p) => sum + p.reliability, 0) / patterns.length;
    const fibonacciAccuracy = patterns.reduce((sum, p) => sum + p.completion.validationScore, 0) / patterns.length;
    const patternDensity = patterns.length; // Could be normalized by time period
    
    return { averageReliability, fibonacciAccuracy, patternDensity };
  }
  
  /**
   * Initialize pattern templates with Fibonacci ratios
   */
  private initializePatternTemplates(): void {
    // Gartley Pattern
    this.patternTemplates.set('gartley_bullish', {
      type: 'gartley',
      direction: 'bullish',
      ratios: {
        AB_XA: { min: 0.568, max: 0.618, ideal: 0.618 },
        BC_AB: { min: 0.382, max: 0.886, ideal: 0.618 },
        CD_BC: { min: 1.13, max: 1.618, ideal: 1.272 },
        AD_XA: { min: 0.786, max: 0.786, ideal: 0.786 }
      },
      description: 'Bullish Gartley 222 Pattern',
      reliability: 75
    });
    
    this.patternTemplates.set('gartley_bearish', {
      type: 'gartley',
      direction: 'bearish',
      ratios: {
        AB_XA: { min: 0.568, max: 0.618, ideal: 0.618 },
        BC_AB: { min: 0.382, max: 0.886, ideal: 0.618 },
        CD_BC: { min: 1.13, max: 1.618, ideal: 1.272 },
        AD_XA: { min: 0.786, max: 0.786, ideal: 0.786 }
      },
      description: 'Bearish Gartley 222 Pattern',
      reliability: 75
    });
    
    // Butterfly Pattern
    this.patternTemplates.set('butterfly_bullish', {
      type: 'butterfly',
      direction: 'bullish',
      ratios: {
        AB_XA: { min: 0.786, max: 0.786, ideal: 0.786 },
        BC_AB: { min: 0.382, max: 0.886, ideal: 0.618 },
        CD_BC: { min: 1.618, max: 2.618, ideal: 1.618 },
        AD_XA: { min: 1.27, max: 1.618, ideal: 1.27 }
      },
      description: 'Bullish Butterfly Pattern',
      reliability: 70
    });
    
    this.patternTemplates.set('butterfly_bearish', {
      type: 'butterfly',
      direction: 'bearish',
      ratios: {
        AB_XA: { min: 0.786, max: 0.786, ideal: 0.786 },
        BC_AB: { min: 0.382, max: 0.886, ideal: 0.618 },
        CD_BC: { min: 1.618, max: 2.618, ideal: 1.618 },
        AD_XA: { min: 1.27, max: 1.618, ideal: 1.27 }
      },
      description: 'Bearish Butterfly Pattern',
      reliability: 70
    });
    
    // Bat Pattern
    this.patternTemplates.set('bat_bullish', {
      type: 'bat',
      direction: 'bullish',
      ratios: {
        AB_XA: { min: 0.382, max: 0.5, ideal: 0.382 },
        BC_AB: { min: 0.382, max: 0.886, ideal: 0.618 },
        CD_BC: { min: 1.618, max: 2.618, ideal: 1.618 },
        AD_XA: { min: 0.886, max: 0.886, ideal: 0.886 }
      },
      description: 'Bullish Bat Pattern',
      reliability: 80
    });
    
    this.patternTemplates.set('bat_bearish', {
      type: 'bat',
      direction: 'bearish',
      ratios: {
        AB_XA: { min: 0.382, max: 0.5, ideal: 0.382 },
        BC_AB: { min: 0.382, max: 0.886, ideal: 0.618 },
        CD_BC: { min: 1.618, max: 2.618, ideal: 1.618 },
        AD_XA: { min: 0.886, max: 0.886, ideal: 0.886 }
      },
      description: 'Bearish Bat Pattern',
      reliability: 80
    });
    
    // Crab Pattern
    this.patternTemplates.set('crab_bullish', {
      type: 'crab',
      direction: 'bullish',
      ratios: {
        AB_XA: { min: 0.382, max: 0.618, ideal: 0.618 },
        BC_AB: { min: 0.382, max: 0.886, ideal: 0.618 },
        CD_BC: { min: 2.24, max: 3.618, ideal: 2.618 },
        AD_XA: { min: 1.618, max: 1.618, ideal: 1.618 }
      },
      description: 'Bullish Crab Pattern',
      reliability: 85
    });
    
    this.patternTemplates.set('crab_bearish', {
      type: 'crab',
      direction: 'bearish',
      ratios: {
        AB_XA: { min: 0.382, max: 0.618, ideal: 0.618 },
        BC_AB: { min: 0.382, max: 0.886, ideal: 0.618 },
        CD_BC: { min: 2.24, max: 3.618, ideal: 2.618 },
        AD_XA: { min: 1.618, max: 1.618, ideal: 1.618 }
      },
      description: 'Bearish Crab Pattern',
      reliability: 85
    });
  }
  
  /**
   * Get pattern template by type and direction
   */
  getPatternTemplate(type: string, direction: 'bullish' | 'bearish'): PatternTemplate | undefined {
    return this.patternTemplates.get(`${type}_${direction}`);
  }
  
  /**
   * Get all available pattern types
   */
  getAvailablePatternTypes(): string[] {
    return Array.from(new Set(
      Array.from(this.patternTemplates.keys()).map(key => key.split('_')[0])
    ));
  }
}

// Singleton instance
export const harmonicPatternDetector = new HarmonicPatternDetector();