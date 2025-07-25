/**
 * @fileOverview Precision Entry Optimizer for better trade entry timing and stop-loss placement
 * 
 * This module addresses common issues:
 * - Entry prices that are too high/low
 * - Stop losses that are too tight causing premature exits
 * - Poor entry timing relative to support/resistance levels
 */

import { PriceData, calculateATR, analyzeMarketStructure } from './advanced-technical-indicators';
import { getPricePrecision, formatPrice } from './trading-precision';

export interface OptimizedEntry {
  entryPrice: number;
  entryReason: string;
  confidence: number;
  entryZone: {
    optimal: number;
    conservative: number;
    aggressive: number;
  };
  timing: {
    immediate: boolean;
    waitForPullback: boolean;
    waitForBreakout: boolean;
    maxWaitTime: string;
  };
}

export interface OptimizedStopLoss {
  stopPrice: number;
  stopReason: string;
  type: 'technical' | 'volatility' | 'percentage' | 'time';
  buffer: number;
  invalidationLevel: number;
  trailingConfig?: {
    enabled: boolean;
    triggerPercent: number;
    trailPercent: number;
  };
}

export interface EntryOptimizationInput {
  currentPrice: number;
  priceData: PriceData[];
  asset: string;
  timeframe: string;
  direction: 'long' | 'short';
  supportLevels: number[];
  resistanceLevels: number[];
  tradingPersona: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  patternType?: string;
  volumeProfile?: any;
}

export interface OptimizationResult {
  entry: OptimizedEntry;
  stopLoss: OptimizedStopLoss;
  positionSizing: {
    recommendedSize: number;
    maxSize: number;
    reasoning: string;
  };
  riskAnalysis: {
    estimatedRisk: number;
    worstCaseScenario: number;
    probabilityOfStop: number;
    expectedHoldTime: string;
  };
}

/**
 * Finds optimal entry zones using multiple technical factors
 */
export function optimizeEntry(input: EntryOptimizationInput): OptimizedEntry {
  const { currentPrice, priceData, direction, supportLevels, resistanceLevels, tradingPersona } = input;
  
  // Calculate key levels and indicators
  const atr = calculateATR(priceData, 14);
  const marketStructure = analyzeMarketStructure(priceData);
  const recentHigh = Math.max(...priceData.slice(-20).map(d => d.high));
  const recentLow = Math.min(...priceData.slice(-20).map(d => d.low));
  
  // Find the closest relevant levels
  const relevantSupports = supportLevels.filter(level => 
    direction === 'long' ? level < currentPrice && level > currentPrice * 0.95 : level < currentPrice
  ).sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b));
  
  const relevantResistances = resistanceLevels.filter(level => 
    direction === 'long' ? level > currentPrice : level > currentPrice && level < currentPrice * 1.05
  ).sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b));

  let optimalEntry: number;
  let entryReason: string;
  let confidence: number;
  let timing: OptimizedEntry['timing'];

  if (direction === 'long') {
    // For long trades, look for pullback opportunities
    const nearestSupport = relevantSupports[0];
    const pullbackLevel = nearestSupport || currentPrice * 0.995;
    
    // Calculate optimal entry based on persona
    if (tradingPersona.toLowerCase().includes('scalp')) {
      // Scalpers want immediate entries near current price
      optimalEntry = currentPrice * 0.9985; // Slightly below current price
      entryReason = 'Scalping entry near current price with tight spread';
      confidence = 75;
      timing = {
        immediate: true,
        waitForPullback: false,
        waitForBreakout: false,
        maxWaitTime: '5 minutes'
      };
    } else if (tradingPersona.toLowerCase().includes('swing')) {
      // Swing traders wait for better pullback entries
      const pullbackTarget = nearestSupport ? 
        nearestSupport + (atr * 0.25) : // Slightly above support
        currentPrice * 0.992; // 0.8% pullback if no clear support
      
      optimalEntry = pullbackTarget;
      entryReason = `Swing entry on pullback to support at ${formatPrice(pullbackTarget, getPricePrecision(input.asset, currentPrice))}`;
      confidence = nearestSupport ? 85 : 70;
      timing = {
        immediate: false,
        waitForPullback: true,
        waitForBreakout: false,
        maxWaitTime: '4-12 hours'
      };
    } else {
      // Conservative/position traders want strong confirmation
      const confirmationLevel = nearestSupport ? nearestSupport + (atr * 0.5) : currentPrice * 0.995;
      optimalEntry = confirmationLevel;
      entryReason = `Conservative entry with support confirmation`;
      confidence = 80;
      timing = {
        immediate: false,
        waitForPullback: true,
        waitForBreakout: false,
        maxWaitTime: '1-3 days'
      };
    }
  } else {
    // For short trades, look for bounce opportunities
    const nearestResistance = relevantResistances[0];
    const bounceLevel = nearestResistance || currentPrice * 1.005;
    
    if (tradingPersona.toLowerCase().includes('scalp')) {
      optimalEntry = currentPrice * 1.0015;
      entryReason = 'Scalping short entry near current price';
      confidence = 75;
      timing = {
        immediate: true,
        waitForPullback: false,
        waitForBreakout: false,
        maxWaitTime: '5 minutes'
      };
    } else {
      const bounceTarget = nearestResistance ? 
        nearestResistance - (atr * 0.25) :
        currentPrice * 1.008;
      
      optimalEntry = bounceTarget;
      entryReason = `Short entry on bounce from resistance`;
      confidence = nearestResistance ? 85 : 70;
      timing = {
        immediate: false,
        waitForPullback: true,
        waitForBreakout: false,
        maxWaitTime: '4-12 hours'
      };
    }
  }

  // Create entry zones
  const entryZone = {
    optimal: optimalEntry,
    conservative: direction === 'long' ? 
      optimalEntry * 0.998 : optimalEntry * 1.002, // Tighter entry
    aggressive: direction === 'long' ? 
      optimalEntry * 1.002 : optimalEntry * 0.998  // Wider entry
  };

  return {
    entryPrice: optimalEntry,
    entryReason,
    confidence,
    entryZone,
    timing
  };
}

/**
 * Calculates intelligent stop-loss placement to minimize premature exits
 */
export function optimizeStopLoss(
  input: EntryOptimizationInput,
  entryPrice: number
): OptimizedStopLoss {
  const { currentPrice, priceData, direction, supportLevels, resistanceLevels, tradingPersona, riskTolerance } = input;
  
  const atr = calculateATR(priceData, 14);
  const marketStructure = analyzeMarketStructure(priceData);
  
  // Calculate volatility-based buffer
  const volatilityMultiplier = getVolatilityMultiplier(riskTolerance, tradingPersona);
  const volatilityBuffer = atr * volatilityMultiplier;
  
  let stopPrice: number;
  let stopReason: string;
  let stopType: 'technical' | 'volatility' | 'percentage' | 'time' = 'technical';
  let buffer: number;
  
  if (direction === 'long') {
    // Find the most relevant support below entry
    const relevantSupports = supportLevels
      .filter(level => level < entryPrice)
      .sort((a, b) => b - a); // Sort descending (closest first)
    
    const keySupport = relevantSupports[0];
    
    if (keySupport && (entryPrice - keySupport) < (atr * 3)) {
      // Use technical support with buffer
      buffer = Math.max(atr * 0.3, entryPrice * 0.002); // At least 30% of ATR or 0.2%
      stopPrice = keySupport - buffer;
      stopReason = `Technical stop below key support at ${formatPrice(keySupport, getPricePrecision(input.asset, entryPrice))} with ${formatPrice(buffer, getPricePrecision(input.asset, entryPrice))} buffer`;
      stopType = 'technical';
    } else {
      // Use volatility-based stop if no clear support
      buffer = volatilityBuffer;
      stopPrice = entryPrice - buffer;
      stopReason = `Volatility-based stop using ${volatilityMultiplier.toFixed(1)}x ATR (${formatPrice(atr, getPricePrecision(input.asset, entryPrice))})`;
      stopType = 'volatility';
    }
    
    // Safety check - don't allow stops closer than 0.5% for swing trades
    const minStopDistance = tradingPersona.toLowerCase().includes('scalp') ? 
      entryPrice * 0.002 : entryPrice * 0.005; // 0.2% for scalp, 0.5% for others
    
    if (entryPrice - stopPrice < minStopDistance) {
      stopPrice = entryPrice - minStopDistance;
      stopReason += ` (adjusted for minimum ${(minStopDistance/entryPrice*100).toFixed(1)}% stop distance)`;
    }
    
  } else {
    // Short trade stop logic
    const relevantResistances = resistanceLevels
      .filter(level => level > entryPrice)
      .sort((a, b) => a - b); // Sort ascending (closest first)
    
    const keyResistance = relevantResistances[0];
    
    if (keyResistance && (keyResistance - entryPrice) < (atr * 3)) {
      buffer = Math.max(atr * 0.3, entryPrice * 0.002);
      stopPrice = keyResistance + buffer;
      stopReason = `Technical stop above key resistance at ${formatPrice(keyResistance, getPricePrecision(input.asset, entryPrice))} with buffer`;
      stopType = 'technical';
    } else {
      buffer = volatilityBuffer;
      stopPrice = entryPrice + buffer;
      stopReason = `Volatility-based stop using ${volatilityMultiplier.toFixed(1)}x ATR`;
      stopType = 'volatility';
    }
    
    const minStopDistance = tradingPersona.toLowerCase().includes('scalp') ? 
      entryPrice * 0.002 : entryPrice * 0.005;
    
    if (stopPrice - entryPrice < minStopDistance) {
      stopPrice = entryPrice + minStopDistance;
      stopReason += ` (adjusted for minimum stop distance)`;
    }
  }
  
  // Calculate invalidation level (where pattern completely fails)
  const invalidationLevel = direction === 'long' ? 
    stopPrice * 0.995 : stopPrice * 1.005;
  
  // Configure trailing stop for swing/position trades
  const trailingConfig = getTrailingConfig(tradingPersona, direction, entryPrice, stopPrice);
  
  return {
    stopPrice,
    stopReason,
    type: stopType,
    buffer,
    invalidationLevel,
    trailingConfig
  };
}

/**
 * Gets volatility multiplier based on risk tolerance and trading style
 */
function getVolatilityMultiplier(
  riskTolerance: string, 
  tradingPersona: string
): number {
  let baseMultiplier = 1.5; // Default
  
  // Adjust for risk tolerance
  switch (riskTolerance) {
    case 'conservative':
      baseMultiplier = 2.0; // Wider stops for conservative traders
      break;
    case 'moderate':
      baseMultiplier = 1.5;
      break;
    case 'aggressive':
      baseMultiplier = 1.2; // Tighter stops for aggressive traders
      break;
  }
  
  // Adjust for trading persona
  if (tradingPersona.toLowerCase().includes('scalp')) {
    baseMultiplier *= 0.6; // Much tighter for scalping
  } else if (tradingPersona.toLowerCase().includes('day')) {
    baseMultiplier *= 0.8; // Tighter for day trading
  } else if (tradingPersona.toLowerCase().includes('position')) {
    baseMultiplier *= 1.5; // Wider for position trading
  }
  
  return baseMultiplier;
}

/**
 * Configures trailing stop settings
 */
function getTrailingConfig(
  tradingPersona: string,
  direction: 'long' | 'short',
  entryPrice: number,
  stopPrice: number
): OptimizedStopLoss['trailingConfig'] {
  
  if (tradingPersona.toLowerCase().includes('scalp')) {
    // No trailing for scalpers - they exit quickly
    return {
      enabled: false,
      triggerPercent: 0,
      trailPercent: 0
    };
  }
  
  const riskPercent = Math.abs((entryPrice - stopPrice) / entryPrice) * 100;
  
  return {
    enabled: true,
    triggerPercent: Math.max(riskPercent * 1.5, 2.0), // Start trailing after 1.5x risk or 2%
    trailPercent: Math.max(riskPercent * 0.8, 1.0)     // Trail by 80% of original risk or 1%
  };
}

/**
 * Complete optimization that combines entry and stop-loss logic
 */
export function optimizeTradeEntry(input: EntryOptimizationInput): OptimizationResult {
  const entry = optimizeEntry(input);
  const stopLoss = optimizeStopLoss(input, entry.entryPrice);
  
  // Calculate risk metrics
  const riskPercent = Math.abs((entry.entryPrice - stopLoss.stopPrice) / entry.entryPrice) * 100;
  const atr = calculateATR(input.priceData, 14);
  const atrPercent = (atr / input.currentPrice) * 100;
  
  // Estimate probability of stop being hit
  const probabilityOfStop = estimateStopProbability(
    entry.entryPrice,
    stopLoss.stopPrice,
    input.direction,
    atrPercent,
    input.tradingPersona
  );
  
  // Position sizing based on optimized risk
  const baseRisk = getRiskPercentage(input.riskTolerance);
  const adjustedRisk = Math.max(baseRisk * 0.5, Math.min(baseRisk * 1.5, baseRisk / (riskPercent / 2)));
  
  return {
    entry,
    stopLoss,
    positionSizing: {
      recommendedSize: adjustedRisk,
      maxSize: baseRisk * 2,
      reasoning: `Adjusted position size based on ${riskPercent.toFixed(1)}% risk and ${probabilityOfStop.toFixed(0)}% stop probability`
    },
    riskAnalysis: {
      estimatedRisk: riskPercent,
      worstCaseScenario: riskPercent * 1.2, // Account for slippage
      probabilityOfStop,
      expectedHoldTime: getExpectedHoldTime(input.tradingPersona, entry.timing)
    }
  };
}

/**
 * Estimates probability of stop loss being hit based on historical patterns
 */
function estimateStopProbability(
  entryPrice: number,
  stopPrice: number,
  direction: 'long' | 'short',
  atrPercent: number,
  tradingPersona: string
): number {
  const riskPercent = Math.abs((entryPrice - stopPrice) / entryPrice) * 100;
  
  // Base probability based on risk size relative to volatility
  let baseProbability = 0;
  
  if (riskPercent < atrPercent * 0.5) {
    baseProbability = 60; // Very tight stop - high probability of being hit
  } else if (riskPercent < atrPercent * 1.0) {
    baseProbability = 40; // Moderate stop
  } else if (riskPercent < atrPercent * 1.5) {
    baseProbability = 25; // Good stop placement
  } else {
    baseProbability = 15; // Wide stop - low probability
  }
  
  // Adjust for trading style
  if (tradingPersona.toLowerCase().includes('scalp')) {
    baseProbability += 10; // Scalping has higher stop hit rate
  } else if (tradingPersona.toLowerCase().includes('position')) {
    baseProbability -= 5; // Position trading has lower stop hit rate
  }
  
  return Math.max(10, Math.min(70, baseProbability));
}

/**
 * Gets base risk percentage for position sizing
 */
function getRiskPercentage(riskTolerance: string): number {
  switch (riskTolerance) {
    case 'conservative': return 1.0;
    case 'moderate': return 2.0;
    case 'aggressive': return 3.0;
    default: return 2.0;
  }
}

/**
 * Estimates expected hold time based on trading style
 */
function getExpectedHoldTime(tradingPersona: string, timing: OptimizedEntry['timing']): string {
  if (tradingPersona.toLowerCase().includes('scalp')) {
    return '5-30 minutes';
  } else if (tradingPersona.toLowerCase().includes('day')) {
    return '2-8 hours';
  } else if (tradingPersona.toLowerCase().includes('swing')) {
    return timing.waitForPullback ? '1-5 days' : '2-7 days';
  } else {
    return '1-4 weeks';
  }
}