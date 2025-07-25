/**
 * @fileOverview Timeframe-based Trading Persona Auto-Detection
 * 
 * Automatically detects chart timeframe and switches to the optimal trading persona
 * to ensure the AI uses the right strategy for the given timeframe.
 */

export interface TimeframeDetection {
  detectedTimeframe: string;
  confidence: number;
  recommendedPersona: string;
  personaReasoning: string;
  tradingStyle: 'scalping' | 'day_trading' | 'swing_trading' | 'position_trading';
  recommendedHoldTime: string;
}

export interface PersonaOptimization {
  entryStrategy: string;
  stopLossMultiplier: number;
  takeProfitStrategy: string;
  positionSizingApproach: string;
  riskRewardMinimum: number;
}

/**
 * Detects timeframe from chart analysis or user context
 */
export function detectTimeframeFromContext(
  question: string,
  chartAnalysisText?: string
): TimeframeDetection {
  let detectedTimeframe = 'unknown';
  let confidence = 0;

  // Chart timeframe patterns
  const timeframePatterns = [
    // Minutes
    { pattern: /\b(1m|1[\s\-_]?min|1[\s\-_]?minute)\b/i, timeframe: '1m', confidence: 95 },
    { pattern: /\b(5m|5[\s\-_]?min|5[\s\-_]?minute)\b/i, timeframe: '5m', confidence: 95 },
    { pattern: /\b(15m|15[\s\-_]?min|15[\s\-_]?minute)\b/i, timeframe: '15m', confidence: 95 },
    { pattern: /\b(30m|30[\s\-_]?min|30[\s\-_]?minute)\b/i, timeframe: '30m', confidence: 95 },
    
    // Hours
    { pattern: /\b(1h|1[\s\-_]?hour|1[\s\-_]?hr)\b/i, timeframe: '1h', confidence: 95 },
    { pattern: /\b(2h|2[\s\-_]?hour|2[\s\-_]?hr)\b/i, timeframe: '2h', confidence: 95 },
    { pattern: /\b(4h|4[\s\-_]?hour|4[\s\-_]?hr)\b/i, timeframe: '4h', confidence: 95 },
    { pattern: /\b(6h|6[\s\-_]?hour|6[\s\-_]?hr)\b/i, timeframe: '6h', confidence: 95 },
    { pattern: /\b(8h|8[\s\-_]?hour|8[\s\-_]?hr)\b/i, timeframe: '8h', confidence: 95 },
    { pattern: /\b(12h|12[\s\-_]?hour|12[\s\-_]?hr)\b/i, timeframe: '12h', confidence: 95 },
    
    // Days and weeks
    { pattern: /\b(1d|daily|1[\s\-_]?day)\b/i, timeframe: '1d', confidence: 95 },
    { pattern: /\b(3d|3[\s\-_]?day)\b/i, timeframe: '3d', confidence: 95 },
    { pattern: /\b(1w|weekly|1[\s\-_]?week)\b/i, timeframe: '1w', confidence: 95 },
    { pattern: /\b(1M|monthly|1[\s\-_]?month)\b/i, timeframe: '1M', confidence: 95 },
  ];

  // Contextual hints
  const contextualPatterns = [
    { pattern: /\b(scalp|scalping)\b/i, timeframe: '5m', confidence: 80 },
    { pattern: /\b(day[\s\-_]?trad|intraday)\b/i, timeframe: '1h', confidence: 80 },
    { pattern: /\b(swing[\s\-_]?trad)\b/i, timeframe: '4h', confidence: 80 },
    { pattern: /\b(position[\s\-_]?trad|long[\s\-_]?term)\b/i, timeframe: '1d', confidence: 80 },
    { pattern: /\b(quick[\s\-_]?trade|fast[\s\-_]?trade)\b/i, timeframe: '15m', confidence: 70 },
    { pattern: /\b(hold[\s\-_]?for[\s\-_]?days|multi[\s\-_]?day)\b/i, timeframe: '4h', confidence: 70 },
    { pattern: /\b(hold[\s\-_]?for[\s\-_]?weeks|multi[\s\-_]?week)\b/i, timeframe: '1d', confidence: 70 },
  ];

  const allText = `${question} ${chartAnalysisText || ''}`;

  // Check for explicit timeframe mentions first
  for (const { pattern, timeframe, confidence: patternConfidence } of timeframePatterns) {
    if (pattern.test(allText)) {
      detectedTimeframe = timeframe;
      confidence = patternConfidence;
      break;
    }
  }

  // If no explicit timeframe found, check contextual hints
  if (confidence === 0) {
    for (const { pattern, timeframe, confidence: patternConfidence } of contextualPatterns) {
      if (pattern.test(allText)) {
        detectedTimeframe = timeframe;
        confidence = patternConfidence;
        break;
      }
    }
  }

  // Fallback to default if still unknown
  if (confidence === 0) {
    detectedTimeframe = '4h'; // Default to swing trading
    confidence = 50;
  }

  return mapTimeframeToPersona(detectedTimeframe, confidence);
}

/**
 * Maps detected timeframe to optimal trading persona
 */
export function mapTimeframeToPersona(
  timeframe: string,
  confidence: number
): TimeframeDetection {
  const timeframeMappings = {
    // Scalping timeframes (1m-15m)
    '1m': {
      persona: 'Optimized Scalper',
      style: 'scalping' as const,
      holdTime: '1-5 minutes',
      reasoning: '1-minute chart requires ultra-fast scalping with tight spreads'
    },
    '5m': {
      persona: 'Optimized Scalper',
      style: 'scalping' as const,
      holdTime: '5-30 minutes',
      reasoning: '5-minute chart optimal for scalping with quick entries/exits'
    },
    '15m': {
      persona: 'Optimized Scalper',
      style: 'scalping' as const,
      holdTime: '15-60 minutes',
      reasoning: '15-minute chart suitable for extended scalping strategies'
    },

    // Day trading timeframes (30m-4h)
    '30m': {
      persona: 'Optimized Day Trader',
      style: 'day_trading' as const,
      holdTime: '30 minutes - 4 hours',
      reasoning: '30-minute chart ideal for intraday momentum trades'
    },
    '1h': {
      persona: 'Optimized Day Trader',
      style: 'day_trading' as const,
      holdTime: '1-8 hours',
      reasoning: '1-hour chart perfect for day trading with clear trends'
    },
    '2h': {
      persona: 'Optimized Day Trader',
      style: 'day_trading' as const,
      holdTime: '2-12 hours',
      reasoning: '2-hour chart for extended intraday positions'
    },
    '4h': {
      persona: 'Optimized Swing Trader',
      style: 'swing_trading' as const,
      holdTime: '1-7 days',
      reasoning: '4-hour chart optimal for swing trading multi-day moves'
    },

    // Swing trading timeframes (6h-3d)
    '6h': {
      persona: 'Optimized Swing Trader',
      style: 'swing_trading' as const,
      holdTime: '2-10 days',
      reasoning: '6-hour chart for extended swing trades'
    },
    '8h': {
      persona: 'Optimized Swing Trader',
      style: 'swing_trading' as const,
      holdTime: '3-14 days',
      reasoning: '8-hour chart for longer swing positions'
    },
    '12h': {
      persona: 'Optimized Swing Trader',
      style: 'swing_trading' as const,
      holdTime: '5-21 days',
      reasoning: '12-hour chart for major swing moves'
    },
    '1d': {
      persona: 'Optimized Swing Trader',
      style: 'swing_trading' as const,
      holdTime: '1-4 weeks',
      reasoning: 'Daily chart for medium-term swing trading'
    },
    '3d': {
      persona: 'Optimized Position Trader',
      style: 'position_trading' as const,
      holdTime: '2-8 weeks',
      reasoning: '3-day chart for transitioning to position trading'
    },

    // Position trading timeframes (1w+)
    '1w': {
      persona: 'Optimized Position Trader',
      style: 'position_trading' as const,
      holdTime: '1-6 months',
      reasoning: 'Weekly chart for long-term position trading'
    },
    '1M': {
      persona: 'Optimized Position Trader',
      style: 'position_trading' as const,
      holdTime: '3-24 months',
      reasoning: 'Monthly chart for macro trend position trading'
    }
  };

  const mapping = timeframeMappings[timeframe as keyof typeof timeframeMappings];
  
  if (!mapping) {
    // Fallback for unknown timeframes
    return {
      detectedTimeframe: timeframe,
      confidence: confidence * 0.5, // Reduce confidence for unknown
      recommendedPersona: 'Optimized Swing Trader',
      personaReasoning: `Unknown timeframe ${timeframe}, defaulting to swing trading`,
      tradingStyle: 'swing_trading',
      recommendedHoldTime: '1-7 days'
    };
  }

  return {
    detectedTimeframe: timeframe,
    confidence,
    recommendedPersona: mapping.persona,
    personaReasoning: mapping.reasoning,
    tradingStyle: mapping.style,
    recommendedHoldTime: mapping.holdTime
  };
}

/**
 * Gets optimized persona configuration with improved entry/stop/TP logic
 */
export function getOptimizedPersonaConfig(tradingStyle: string): PersonaOptimization {
  const personaConfigs = {
    scalping: {
      entryStrategy: 'Immediate execution within 0.1% of current price. For longs: enter 0.05-0.1% below current. For shorts: enter 0.05-0.1% above current.',
      stopLossMultiplier: 1.05, // +5% more space as requested
      takeProfitStrategy: 'Smart TP: Target previous micro-high/low + 20% buffer. Use 1:1 to 1.5:1 R/R. Scale out 50% at first target, let 50% run to 2nd target.',
      positionSizingApproach: 'Small positions (0.5-1% risk) with high frequency',
      riskRewardMinimum: 1.0
    },
    day_trading: {
      entryStrategy: 'Wait for pullback to key level. For longs: enter near session lows or PDH support. For shorts: enter near session highs or PDL resistance.',
      stopLossMultiplier: 1.05, // +5% more space
      takeProfitStrategy: 'Smart TP: Target session high/low or previous day high/low. Use Fibonacci extensions (127.2%, 161.8%). Scale out 40% at 1.5:1, 60% at 2.5:1.',
      positionSizingApproach: 'Standard positions (1-2% risk) with selective entries',
      riskRewardMinimum: 1.5
    },
    swing_trading: {
      entryStrategy: 'Patient entries on retests. For longs: wait for pullback to support + confirmation. For shorts: wait for bounce to resistance + rejection.',
      stopLossMultiplier: 1.05, // +5% more space
      takeProfitStrategy: 'Smart TP: Major S/R levels, pattern targets, Fibonacci 161.8%-261.8%. Scale: 30% at 2:1, 40% at 3:1, 30% trail.',
      positionSizingApproach: 'Full positions (2-3% risk) with high conviction',
      riskRewardMinimum: 2.0
    },
    position_trading: {
      entryStrategy: 'Confirmation-based entries. For longs: weekly support hold + trend continuation. For shorts: weekly resistance break + trend reversal.',
      stopLossMultiplier: 1.05, // +5% more space  
      takeProfitStrategy: 'Smart TP: Major macro levels, long-term Fibonacci 261.8%-423.6%. Scale: 25% at 3:1, 25% at 5:1, 50% trail with wide stops.',
      positionSizingApproach: 'Conservative positions (1-2% risk) with long holds',
      riskRewardMinimum: 3.0
    }
  };

  const style = tradingStyle.toLowerCase().replace(/[-_\s]/g, '_');
  return personaConfigs[style as keyof typeof personaConfigs] || personaConfigs.swing_trading;
}

/**
 * Combines timeframe detection with persona optimization
 */
export function getOptimizedTradingSetup(
  question: string,
  chartAnalysisText?: string,
  manualPersona?: string
): {
  timeframeDetection: TimeframeDetection;
  personaConfig: PersonaOptimization;
  finalPersona: string;
  setupReasoning: string;
} {
  // If manual persona provided, respect it but still detect timeframe
  const timeframeDetection = detectTimeframeFromContext(question, chartAnalysisText);
  
  let finalPersona: string;
  let setupReasoning: string;
  
  if (manualPersona && manualPersona !== 'Auto-Detect') {
    finalPersona = manualPersona;
    setupReasoning = `Manual persona "${manualPersona}" used despite ${timeframeDetection.detectedTimeframe} timeframe detection`;
  } else {
    finalPersona = timeframeDetection.recommendedPersona;
    setupReasoning = `Auto-detected ${timeframeDetection.detectedTimeframe} timeframe → ${finalPersona} (${timeframeDetection.confidence}% confidence)`;
  }
  
  const personaConfig = getOptimizedPersonaConfig(timeframeDetection.tradingStyle);
  
  return {
    timeframeDetection,
    personaConfig,
    finalPersona,
    setupReasoning
  };
}