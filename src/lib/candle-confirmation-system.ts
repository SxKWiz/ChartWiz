/**
 * @fileOverview Candle Confirmation System - Prevents Premature Entries
 * 
 * This system addresses the critical issue of entering trades too early by requiring
 * proper candle confirmation before triggering entry signals. Prevents entering 
 * "one candle too early" which often leads to stop loss hits.
 */

export interface CandlePattern {
  type: 'bullish_confirmation' | 'bearish_confirmation' | 'indecision' | 'false_signal';
  strength: number; // 0-100
  confirmation: boolean;
  reasoning: string;
  nextCandleWait: boolean;
}

export interface EntryConfirmation {
  readyToEnter: boolean;
  waitForNext: boolean;
  confirmationLevel: 'weak' | 'moderate' | 'strong';
  requiredConfirmation: string;
  estimatedWaitTime: string;
  alternativeEntry: {
    condition: string;
    price: number;
    reasoning: string;
  };
}

export interface ConfirmationRules {
  requireCloseConfirmation: boolean;
  minimumCandleSize: number; // Percentage of ATR
  volumeConfirmationRequired: boolean;
  rejectionWickTolerance: number; // Max wick size as % of body
  minimumBodySize: number; // Min body as % of total range
}

/**
 * Analyzes current candle to determine if entry should wait for confirmation
 */
export function analyzeCandleConfirmation(
  currentCandle: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
  },
  previousCandles: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>,
  direction: 'long' | 'short',
  tradingStyle: string,
  keyLevel: number
): EntryConfirmation {
  
  const atr = calculateATRFromCandles(previousCandles.slice(-14));
  const confirmationRules = getConfirmationRules(tradingStyle);
  
  // Analyze current candle structure
  const candleAnalysis = analyzeCandleStructure(currentCandle, atr);
  
  // Check if we're at a key level
  const atKeyLevel = Math.abs(currentCandle.close - keyLevel) / keyLevel < 0.005; // Within 0.5%
  
  // Determine confirmation status
  return evaluateEntryReadiness(
    currentCandle,
    candleAnalysis,
    direction,
    atKeyLevel,
    confirmationRules,
    tradingStyle
  );
}

/**
 * Analyzes individual candle structure for confirmation signals
 */
function analyzeCandleStructure(
  candle: { open: number; high: number; low: number; close: number; volume: number },
  atr: number
): CandlePattern {
  
  const body = Math.abs(candle.close - candle.open);
  const totalRange = candle.high - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  
  const bodyPercent = (body / totalRange) * 100;
  const upperWickPercent = (upperWick / totalRange) * 100;
  const lowerWickPercent = (lowerWick / totalRange) * 100;
  const candleSizeVsATR = (totalRange / atr) * 100;
  
  // Determine candle type and strength
  if (candle.close > candle.open) {
    // Bullish candle analysis
    if (bodyPercent > 60 && candleSizeVsATR > 50) {
      return {
        type: 'bullish_confirmation',
        strength: Math.min(90, bodyPercent + candleSizeVsATR / 2),
        confirmation: true,
        reasoning: `Strong bullish candle: ${bodyPercent.toFixed(0)}% body, ${candleSizeVsATR.toFixed(0)}% of ATR`,
        nextCandleWait: false
      };
    } else if (bodyPercent > 40 && upperWickPercent < 30) {
      return {
        type: 'bullish_confirmation',
        strength: Math.min(75, bodyPercent + 30),
        confirmation: true,
        reasoning: `Moderate bullish confirmation with small upper wick`,
        nextCandleWait: false
      };
    } else if (upperWickPercent > 50) {
      return {
        type: 'indecision',
        strength: 40,
        confirmation: false,
        reasoning: `Bullish candle with large upper wick (${upperWickPercent.toFixed(0)}%) - wait for confirmation`,
        nextCandleWait: true
      };
    }
  } else {
    // Bearish candle analysis
    if (bodyPercent > 60 && candleSizeVsATR > 50) {
      return {
        type: 'bearish_confirmation',
        strength: Math.min(90, bodyPercent + candleSizeVsATR / 2),
        confirmation: true,
        reasoning: `Strong bearish candle: ${bodyPercent.toFixed(0)}% body, ${candleSizeVsATR.toFixed(0)}% of ATR`,
        nextCandleWait: false
      };
    } else if (bodyPercent > 40 && lowerWickPercent < 30) {
      return {
        type: 'bearish_confirmation',
        strength: Math.min(75, bodyPercent + 30),
        confirmation: true,
        reasoning: `Moderate bearish confirmation with small lower wick`,
        nextCandleWait: false
      };
    } else if (lowerWickPercent > 50) {
      return {
        type: 'indecision',
        strength: 40,
        confirmation: false,
        reasoning: `Bearish candle with large lower wick (${lowerWickPercent.toFixed(0)}%) - wait for confirmation`,
        nextCandleWait: true
      };
    }
  }
  
  // Default to indecision for small/unclear candles
  return {
    type: 'indecision',
    strength: 30,
    confirmation: false,
    reasoning: `Small/unclear candle (${bodyPercent.toFixed(0)}% body) - needs confirmation`,
    nextCandleWait: true
  };
}

/**
 * Evaluates if entry is ready or should wait
 */
function evaluateEntryReadiness(
  currentCandle: { open: number; high: number; low: number; close: number },
  candleAnalysis: CandlePattern,
  direction: 'long' | 'short',
  atKeyLevel: boolean,
  rules: ConfirmationRules,
  tradingStyle: string
): EntryConfirmation {
  
  // Check direction alignment
  const directionAligned = 
    (direction === 'long' && candleAnalysis.type === 'bullish_confirmation') ||
    (direction === 'short' && candleAnalysis.type === 'bearish_confirmation');
  
  // Scalpers can enter with less confirmation (speed over perfection)
  if (tradingStyle.toLowerCase().includes('scalp')) {
    if (directionAligned && candleAnalysis.strength > 50) {
      return {
        readyToEnter: true,
        waitForNext: false,
        confirmationLevel: 'moderate',
        requiredConfirmation: 'Scalping: sufficient momentum detected',
        estimatedWaitTime: 'Enter immediately',
        alternativeEntry: {
          condition: 'Wait for stronger confirmation',
          price: currentCandle.close + (direction === 'long' ? 0.001 : -0.001) * currentCandle.close,
          reasoning: 'Next candle confirmation entry'
        }
      };
    }
  }
  
  // For other trading styles, require stronger confirmation
  if (directionAligned && candleAnalysis.strength > 70 && atKeyLevel) {
    return {
      readyToEnter: true,
      waitForNext: false,
      confirmationLevel: 'strong',
      requiredConfirmation: 'Strong confirmation at key level',
      estimatedWaitTime: 'Enter on next candle open',
      alternativeEntry: {
        condition: 'Immediate entry if candle closes strong',
        price: currentCandle.close,
        reasoning: 'Current candle shows strong confirmation'
      }
    };
  }
  
  // Determine what we're waiting for
  let waitReason = '';
  let estimatedWait = '';
  let alternativeCondition = '';
  
  if (!directionAligned) {
    waitReason = `Current candle (${candleAnalysis.type}) doesn't align with ${direction} direction`;
    estimatedWait = '1-3 candles';
    alternativeCondition = `Wait for ${direction === 'long' ? 'bullish' : 'bearish'} confirmation candle`;
  } else if (candleAnalysis.strength < 70) {
    waitReason = `Weak confirmation strength (${candleAnalysis.strength}/100)`;
    estimatedWait = '1-2 candles';
    alternativeCondition = 'Wait for stronger momentum candle';
  } else if (!atKeyLevel) {
    waitReason = 'Not at key support/resistance level';
    estimatedWait = '2-5 candles';
    alternativeCondition = 'Wait for price to reach key level';
  } else {
    waitReason = 'General confirmation required';
    estimatedWait = '1-2 candles';
    alternativeCondition = 'Wait for next candle confirmation';
  }
  
  return {
    readyToEnter: false,
    waitForNext: true,
    confirmationLevel: 'weak',
    requiredConfirmation: waitReason,
    estimatedWaitTime: estimatedWait,
    alternativeEntry: {
      condition: alternativeCondition,
      price: direction === 'long' ? 
        currentCandle.close * 1.002 : // 0.2% above for long
        currentCandle.close * 0.998,  // 0.2% below for short
      reasoning: 'Entry after proper confirmation'
    }
  };
}

/**
 * Gets confirmation rules based on trading style
 */
function getConfirmationRules(tradingStyle: string): ConfirmationRules {
  if (tradingStyle.toLowerCase().includes('scalp')) {
    return {
      requireCloseConfirmation: false, // Scalpers can enter mid-candle
      minimumCandleSize: 30, // 30% of ATR minimum
      volumeConfirmationRequired: false,
      rejectionWickTolerance: 60, // More tolerant of wicks
      minimumBodySize: 30 // 30% body minimum
    };
  } else if (tradingStyle.toLowerCase().includes('day')) {
    return {
      requireCloseConfirmation: true, // Wait for candle close
      minimumCandleSize: 50, // 50% of ATR minimum
      volumeConfirmationRequired: true,
      rejectionWickTolerance: 40, // Moderate wick tolerance
      minimumBodySize: 40 // 40% body minimum
    };
  } else if (tradingStyle.toLowerCase().includes('swing')) {
    return {
      requireCloseConfirmation: true, // Wait for candle close
      minimumCandleSize: 60, // 60% of ATR minimum
      volumeConfirmationRequired: true,
      rejectionWickTolerance: 30, // Low wick tolerance
      minimumBodySize: 50 // 50% body minimum
    };
  } else {
    // Position trading - very strict
    return {
      requireCloseConfirmation: true,
      minimumCandleSize: 80, // 80% of ATR minimum
      volumeConfirmationRequired: true,
      rejectionWickTolerance: 20, // Very low wick tolerance
      minimumBodySize: 60 // 60% body minimum
    };
  }
}

/**
 * Calculates ATR from candle data
 */
function calculateATRFromCandles(candles: Array<{ high: number; low: number; close: number }>): number {
  if (candles.length < 2) return candles[0]?.high - candles[0]?.low || 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
}

/**
 * Generates specific entry timing instructions
 */
export function generateEntryTiming(
  confirmation: EntryConfirmation,
  currentPrice: number,
  direction: 'long' | 'short',
  keyLevel: number
): {
  instruction: string;
  entryType: 'immediate' | 'next_candle' | 'conditional' | 'wait_and_see';
  specificPrice: number;
  stopCondition: string;
  timeLimit: string;
} {
  
  if (confirmation.readyToEnter) {
    return {
      instruction: `✅ ENTER NOW: Strong ${direction} confirmation detected. Entry at current levels.`,
      entryType: 'immediate',
      specificPrice: currentPrice,
      stopCondition: `Cancel if price moves ${direction === 'long' ? 'below' : 'above'} ${keyLevel}`,
      timeLimit: 'Current candle close'
    };
  }
  
  if (confirmation.confirmationLevel === 'moderate') {
    return {
      instruction: `⏳ ENTER NEXT CANDLE: Wait for next candle open after current candle closes above/below key level.`,
      entryType: 'next_candle',
      specificPrice: confirmation.alternativeEntry.price,
      stopCondition: `Cancel if next candle shows opposite direction`,
      timeLimit: 'Next 1-2 candles'
    };
  }
  
  return {
    instruction: `⚠️ WAIT FOR CONFIRMATION: ${confirmation.requiredConfirmation}. Do not enter yet.`,
    entryType: 'wait_and_see',
    specificPrice: confirmation.alternativeEntry.price,
    stopCondition: confirmation.alternativeEntry.condition,
    timeLimit: confirmation.estimatedWaitTime
  };
}

/**
 * Validates if current market conditions support entry
 */
export function validateMarketConditions(
  currentCandle: { open: number; high: number; low: number; close: number; volume: number },
  previousCandles: Array<{ open: number; high: number; low: number; close: number; volume: number }>,
  direction: 'long' | 'short'
): {
  suitable: boolean;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
} {
  
  const recentVolumes = previousCandles.slice(-5).map(c => c.volume);
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  const currentVolumeRatio = currentCandle.volume / avgVolume;
  
  const recentRanges = previousCandles.slice(-5).map(c => c.high - c.low);
  const avgRange = recentRanges.reduce((sum, range) => sum + range, 0) / recentRanges.length;
  const currentRange = currentCandle.high - currentCandle.low;
  const rangeRatio = currentRange / avgRange;
  
  // Check for suitable conditions
  if (currentVolumeRatio > 1.2 && rangeRatio > 0.8) {
    return {
      suitable: true,
      reasoning: `Good conditions: Volume ${(currentVolumeRatio * 100).toFixed(0)}% of average, Range ${(rangeRatio * 100).toFixed(0)}% of average`,
      riskLevel: 'low'
    };
  } else if (currentVolumeRatio < 0.6 || rangeRatio < 0.4) {
    return {
      suitable: false,
      reasoning: `Poor conditions: Low volume (${(currentVolumeRatio * 100).toFixed(0)}%) or range (${(rangeRatio * 100).toFixed(0)}%)`,
      riskLevel: 'high'
    };
  } else {
    return {
      suitable: true,
      reasoning: `Acceptable conditions with moderate volume and range`,
      riskLevel: 'medium'
    };
  }
}

/**
 * Main function to determine optimal entry timing
 */
export function getOptimalEntryTiming(
  currentCandle: { open: number; high: number; low: number; close: number; volume: number; timestamp: number },
  previousCandles: Array<{ open: number; high: number; low: number; close: number; volume: number }>,
  direction: 'long' | 'short',
  keyLevel: number,
  tradingStyle: string
): {
  entryDecision: 'enter_now' | 'wait_next_candle' | 'wait_for_setup' | 'avoid_trade';
  reasoning: string;
  entryPrice: number;
  waitingFor: string;
  timeEstimate: string;
  riskAssessment: string;
} {
  
  // Analyze candle confirmation
  const confirmation = analyzeCandleConfirmation(
    currentCandle,
    previousCandles,
    direction,
    tradingStyle,
    keyLevel
  );
  
  // Validate market conditions
  const marketConditions = validateMarketConditions(currentCandle, previousCandles, direction);
  
  // Generate entry timing
  const entryTiming = generateEntryTiming(confirmation, currentCandle.close, direction, keyLevel);
  
  // Make final decision
  if (!marketConditions.suitable) {
    return {
      entryDecision: 'avoid_trade',
      reasoning: `Avoid: ${marketConditions.reasoning}`,
      entryPrice: 0,
      waitingFor: 'Better market conditions',
      timeEstimate: '3-10 candles',
      riskAssessment: `High risk due to ${marketConditions.reasoning}`
    };
  }
  
  if (confirmation.readyToEnter && entryTiming.entryType === 'immediate') {
    return {
      entryDecision: 'enter_now',
      reasoning: `✅ Strong confirmation: ${confirmation.requiredConfirmation}`,
      entryPrice: currentCandle.close,
      waitingFor: 'None - enter immediately',
      timeEstimate: 'Now',
      riskAssessment: `${marketConditions.riskLevel} risk with strong confirmation`
    };
  }
  
  if (entryTiming.entryType === 'next_candle') {
    return {
      entryDecision: 'wait_next_candle',
      reasoning: `⏳ Wait for confirmation: ${confirmation.requiredConfirmation}`,
      entryPrice: entryTiming.specificPrice,
      waitingFor: 'Next candle confirmation',
      timeEstimate: '1-2 candles',
      riskAssessment: `${marketConditions.riskLevel} risk, good setup developing`
    };
  }
  
  return {
    entryDecision: 'wait_for_setup',
    reasoning: `⚠️ Setup not ready: ${confirmation.requiredConfirmation}`,
    entryPrice: entryTiming.specificPrice,
    waitingFor: confirmation.alternativeEntry.condition,
    timeEstimate: confirmation.estimatedWaitTime,
    riskAssessment: `${marketConditions.riskLevel} risk, patience required`
  };
}