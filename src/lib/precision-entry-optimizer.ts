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

export interface SmartTakeProfit {
  targets: Array<{
    price: number;
    probability: number;
    partialExit: number;
    reasoning: string;
    level: 'conservative' | 'aggressive' | 'extension';
  }>;
  scalingStrategy: string;
  overallRiskReward: number;
}

export interface OptimizationResult {
  entry: OptimizedEntry;
  stopLoss: OptimizedStopLoss;
  smartTakeProfit: SmartTakeProfit;
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
 * Updated with +5% more space to prevent premature stop hits
 */
function getVolatilityMultiplier(
  riskTolerance: string, 
  tradingPersona: string
): number {
  let baseMultiplier = 1.5; // Default
  
  // Adjust for risk tolerance with +5% buffer
  switch (riskTolerance) {
    case 'conservative':
      baseMultiplier = 2.1; // Was 2.0, now +5% more space
      break;
    case 'moderate':
      baseMultiplier = 1.575; // Was 1.5, now +5% more space  
      break;
    case 'aggressive':
      baseMultiplier = 1.26; // Was 1.2, now +5% more space
      break;
  }
  
  // Adjust for trading persona with optimized multipliers
  if (tradingPersona.toLowerCase().includes('scalp')) {
    baseMultiplier *= 0.63; // Was 0.6, now +5% more space
  } else if (tradingPersona.toLowerCase().includes('day')) {
    baseMultiplier *= 0.84; // Was 0.8, now +5% more space
  } else if (tradingPersona.toLowerCase().includes('position')) {
    baseMultiplier *= 1.575; // Was 1.5, now +5% more space
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
 * Calculates smart take-profit targets with probability-based scaling
 */
export function calculateSmartTakeProfit(
  input: EntryOptimizationInput,
  entryPrice: number,
  stopPrice: number
): SmartTakeProfit {
  const { currentPrice, direction, resistanceLevels, supportLevels, tradingPersona } = input;
  const atr = calculateATR(input.priceData, 14);
  const riskAmount = Math.abs(entryPrice - stopPrice);
  
  const targets: SmartTakeProfit['targets'] = [];
  
  if (direction === 'long') {
    // Long take-profit logic
    const nearestResistance = resistanceLevels
      .filter(level => level > entryPrice)
      .sort((a, b) => a - b)[0]; // Closest resistance above entry
    
    if (tradingPersona.toLowerCase().includes('scalp')) {
      // Scalping: Quick targets with high probability
      targets.push(
        {
          price: entryPrice + (riskAmount * 1.0), // 1:1 R/R
          probability: 85,
          partialExit: 50,
          reasoning: 'Conservative scalping target at 1:1 risk/reward',
          level: 'conservative'
        },
        {
          price: entryPrice + (riskAmount * 1.5), // 1.5:1 R/R
          probability: 65,
          partialExit: 50,
          reasoning: 'Aggressive scalping target at previous micro-high',
          level: 'aggressive'
        }
      );
    } else if (tradingPersona.toLowerCase().includes('day')) {
      // Day trading: Session targets
      const sessionTarget = nearestResistance || entryPrice + (atr * 2);
      targets.push(
        {
          price: entryPrice + (riskAmount * 1.5), // 1.5:1 R/R minimum
          probability: 75,
          partialExit: 40,
          reasoning: 'Day trading target at 1.5:1 minimum R/R',
          level: 'conservative'
        },
        {
          price: Math.min(sessionTarget, entryPrice + (riskAmount * 2.5)),
          probability: 55,
          partialExit: 40,
          reasoning: 'Session high target or 2.5:1 R/R',
          level: 'aggressive'
        },
        {
          price: entryPrice + (riskAmount * 3.5), // Extended target
          probability: 35,
          partialExit: 20,
          reasoning: 'Extended day trading target at key resistance',
          level: 'extension'
        }
      );
    } else if (tradingPersona.toLowerCase().includes('swing')) {
      // Swing trading: Pattern and Fibonacci targets
      targets.push(
        {
          price: entryPrice + (riskAmount * 2.0), // 2:1 R/R minimum
          probability: 70,
          partialExit: 30,
          reasoning: 'Swing trading minimum 2:1 risk/reward target',
          level: 'conservative'
        },
        {
          price: nearestResistance || entryPrice + (riskAmount * 3.0),
          probability: 55,
          partialExit: 40,
          reasoning: 'Major resistance level or 3:1 pattern target',
          level: 'aggressive'
        },
        {
          price: entryPrice + (riskAmount * 4.5), // Fibonacci extension
          probability: 35,
          partialExit: 30,
          reasoning: 'Fibonacci 161.8%-261.8% extension target',
          level: 'extension'
        }
      );
    } else {
      // Position trading: Major levels
      targets.push(
        {
          price: entryPrice + (riskAmount * 3.0), // 3:1 R/R minimum
          probability: 65,
          partialExit: 25,
          reasoning: 'Position trading minimum 3:1 risk/reward',
          level: 'conservative'
        },
        {
          price: entryPrice + (riskAmount * 5.0), // Major target
          probability: 45,
          partialExit: 25,
          reasoning: 'Major weekly/monthly resistance level',
          level: 'aggressive'
        },
        {
          price: entryPrice + (riskAmount * 8.0), // Macro target
          probability: 25,
          partialExit: 50,
          reasoning: 'Macro Fibonacci 261.8%-423.6% extension',
          level: 'extension'
        }
      );
    }
  } else {
    // Short take-profit logic (mirror of long logic)
    const nearestSupport = supportLevels
      .filter(level => level < entryPrice)
      .sort((a, b) => b - a)[0]; // Closest support below entry
    
    if (tradingPersona.toLowerCase().includes('scalp')) {
      targets.push(
        {
          price: entryPrice - (riskAmount * 1.0),
          probability: 85,
          partialExit: 50,
          reasoning: 'Conservative scalping short target at 1:1',
          level: 'conservative'
        },
        {
          price: entryPrice - (riskAmount * 1.5),
          probability: 65,
          partialExit: 50,
          reasoning: 'Aggressive scalping short target',
          level: 'aggressive'
        }
      );
    } else if (tradingPersona.toLowerCase().includes('day')) {
      targets.push(
        {
          price: entryPrice - (riskAmount * 1.5),
          probability: 75,
          partialExit: 40,
          reasoning: 'Day trading short target at 1.5:1',
          level: 'conservative'
        },
        {
          price: Math.max(nearestSupport || 0, entryPrice - (riskAmount * 2.5)),
          probability: 55,
          partialExit: 40,
          reasoning: 'Session low or 2.5:1 short target',
          level: 'aggressive'
        },
        {
          price: entryPrice - (riskAmount * 3.5),
          probability: 35,
          partialExit: 20,
          reasoning: 'Extended short target at key support',
          level: 'extension'
        }
      );
    } else if (tradingPersona.toLowerCase().includes('swing')) {
      targets.push(
        {
          price: entryPrice - (riskAmount * 2.0),
          probability: 70,
          partialExit: 30,
          reasoning: 'Swing short minimum 2:1 target',
          level: 'conservative'
        },
        {
          price: nearestSupport || entryPrice - (riskAmount * 3.0),
          probability: 55,
          partialExit: 40,
          reasoning: 'Major support or 3:1 short target',
          level: 'aggressive'
        },
        {
          price: entryPrice - (riskAmount * 4.5),
          probability: 35,
          partialExit: 30,
          reasoning: 'Fibonacci extension short target',
          level: 'extension'
        }
      );
    } else {
      targets.push(
        {
          price: entryPrice - (riskAmount * 3.0),
          probability: 65,
          partialExit: 25,
          reasoning: 'Position short minimum 3:1 target',
          level: 'conservative'
        },
        {
          price: entryPrice - (riskAmount * 5.0),
          probability: 45,
          partialExit: 25,
          reasoning: 'Major support breakdown target',
          level: 'aggressive'
        },
        {
          price: entryPrice - (riskAmount * 8.0),
          probability: 25,
          partialExit: 50,
          reasoning: 'Macro short extension target',
          level: 'extension'
        }
      );
    }
  }
  
  // Calculate overall risk/reward
  const weightedReward = targets.reduce((sum, target) => {
    const targetRisk = Math.abs(target.price - entryPrice);
    return sum + (targetRisk * (target.partialExit / 100) * (target.probability / 100));
  }, 0);
  const overallRiskReward = weightedReward / riskAmount;
  
  // Generate scaling strategy
  const scalingStrategy = generateScalingStrategy(targets, tradingPersona);
  
  return {
    targets,
    scalingStrategy,
    overallRiskReward
  };
}

/**
 * Generates intelligent scaling strategy based on targets
 */
function generateScalingStrategy(
  targets: SmartTakeProfit['targets'],
  tradingPersona: string
): string {
  if (tradingPersona.toLowerCase().includes('scalp')) {
    return 'Quick scaling: Exit 50% at first target, 50% at second target. Hold time: 5-30 minutes maximum.';
  } else if (tradingPersona.toLowerCase().includes('day')) {
    return 'Intraday scaling: Exit 40% at 1.5:1, 40% at major level, trail 20% with tight stops. Close all positions before market close.';
  } else if (tradingPersona.toLowerCase().includes('swing')) {
    return 'Swing scaling: Exit 30% at 2:1, 40% at major resistance/support, trail remaining 30% with wider stops for extended moves.';
  } else {
    return 'Position scaling: Exit 25% at 3:1, 25% at 5:1, trail remaining 50% with very wide stops for macro moves. Hold for weeks/months.';
  }
}

/**
 * Complete optimization that combines entry, stop-loss, and smart take-profit logic
 */
export function optimizeTradeEntry(input: EntryOptimizationInput): OptimizationResult {
  const entry = optimizeEntry(input);
  const stopLoss = optimizeStopLoss(input, entry.entryPrice);
  const smartTakeProfit = calculateSmartTakeProfit(input, entry.entryPrice, stopLoss.stopPrice);
  
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
  
  // Position sizing based on optimized risk and targets
  const baseRisk = getRiskPercentage(input.riskTolerance);
  const riskRewardBonus = Math.min(0.5, smartTakeProfit.overallRiskReward / 10); // Bonus for good R/R
  const adjustedRisk = Math.max(baseRisk * 0.5, Math.min(baseRisk * 1.5, baseRisk + riskRewardBonus));
  
  return {
    entry,
    stopLoss,
    smartTakeProfit,
    positionSizing: {
      recommendedSize: adjustedRisk,
      maxSize: baseRisk * 2,
      reasoning: `Adjusted for ${riskPercent.toFixed(1)}% risk, ${probabilityOfStop.toFixed(0)}% stop probability, ${smartTakeProfit.overallRiskReward.toFixed(1)}:1 overall R/R`
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