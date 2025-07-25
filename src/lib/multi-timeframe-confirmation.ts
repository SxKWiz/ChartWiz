/**
 * @fileOverview Multi-Timeframe Confirmation System
 * 
 * When AI needs higher timeframe confirmation, it will request specific charts
 * and refuse to give trade recommendations until those confirmations are provided.
 */

export interface TimeframeHierarchy {
  current: string;
  next: string[];
  critical: string[];
}

export interface ConfirmationRequest {
  requestId: string;
  requiredTimeframes: Array<{
    timeframe: string;
    reason: string;
    priority: 'required' | 'recommended' | 'optional';
    specificQuestions: string[];
  }>;
  currentAnalysis: {
    timeframe: string;
    signal: string;
    confidence: number;
    conflictingSignals?: string[];
  };
  reasoning: string;
  estimatedImpact: string;
  refusalMessage: string;
}

export interface TimeframeConfirmation {
  timeframe: string;
  chartUri?: string;
  analysis?: string;
  confirmation: 'bullish' | 'bearish' | 'neutral' | 'conflicting';
  confidence: number;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  trend: {
    direction: 'up' | 'down' | 'sideways';
    strength: number;
  };
  providedAt: number;
}

export interface MultiTimeframeDecision {
  canProceed: boolean;
  missingTimeframes: string[];
  confirmationStatus: 'complete' | 'partial' | 'none' | 'conflicting';
  overallBias: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  confidence: number;
  reasoning: string;
  nextSteps: string;
}

/**
 * Defines timeframe hierarchy and relationships
 */
export function getTimeframeHierarchy(currentTimeframe: string): TimeframeHierarchy {
  const timeframeOrder = [
    '1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'
  ];
  
  const currentIndex = timeframeOrder.indexOf(currentTimeframe);
  
  if (currentIndex === -1) {
    // Unknown timeframe, default to 4h hierarchy
    return {
      current: '4h',
      next: ['1d', '1w'],
      critical: ['1d']
    };
  }
  
  // Get higher timeframes
  const higherTimeframes = timeframeOrder.slice(currentIndex + 1);
  
  return {
    current: currentTimeframe,
    next: higherTimeframes.slice(0, 3), // Next 3 higher timeframes
    critical: higherTimeframes.slice(0, 2) // Next 2 critical timeframes
  };
}

/**
 * Determines if higher timeframe confirmation is needed
 */
export function assessConfirmationNeeds(
  currentTimeframe: string,
  signalStrength: number,
  marketConditions: {
    volatility: 'low' | 'medium' | 'high';
    trend: 'strong' | 'weak' | 'choppy';
    volume: 'low' | 'normal' | 'high';
  },
  tradingStyle: string,
  conflictingSignals?: string[]
): ConfirmationRequest | null {
  
  const hierarchy = getTimeframeHierarchy(currentTimeframe);
  const requestId = `htf-${Date.now()}`;
  
  // Determine if confirmation is needed
  const needsConfirmation = shouldRequestConfirmation(
    currentTimeframe,
    signalStrength,
    marketConditions,
    tradingStyle,
    conflictingSignals
  );
  
  if (!needsConfirmation.required) {
    return null; // No confirmation needed
  }
  
  // Build confirmation request
  const requiredTimeframes: ConfirmationRequest['requiredTimeframes'] = [];
  
  // Add required timeframes based on analysis
  if (needsConfirmation.reasons.includes('weak_signal')) {
    const nextTF = hierarchy.next[0];
    if (nextTF) {
      requiredTimeframes.push({
        timeframe: nextTF,
        reason: 'Current timeframe shows weak signal - need higher timeframe trend confirmation',
        priority: 'required',
        specificQuestions: [
          `What is the overall trend direction on ${nextTF}?`,
          `Are we in a trending or ranging market on ${nextTF}?`,
          `What are the key support/resistance levels on ${nextTF}?`
        ]
      });
    }
  }
  
  if (needsConfirmation.reasons.includes('conflicting_signals')) {
    const criticalTF = hierarchy.critical[0];
    if (criticalTF) {
      requiredTimeframes.push({
        timeframe: criticalTF,
        reason: 'Conflicting signals on current timeframe - need higher timeframe bias',
        priority: 'required',
        specificQuestions: [
          `What is the dominant trend on ${criticalTF}?`,
          `Are we at a major support/resistance on ${criticalTF}?`,
          `Is current move part of larger pattern on ${criticalTF}?`
        ]
      });
    }
  }
  
  if (needsConfirmation.reasons.includes('major_level')) {
    const weeklyTF = getWeeklyTimeframe(currentTimeframe);
    if (weeklyTF && !requiredTimeframes.find(tf => tf.timeframe === weeklyTF)) {
      requiredTimeframes.push({
        timeframe: weeklyTF,
        reason: 'Approaching major structural level - need weekly context',
        priority: 'required',
        specificQuestions: [
          `Is this a major weekly support/resistance level?`,
          `What is the weekly trend context?`,
          `Any major weekly patterns completing?`
        ]
      });
    }
  }
  
  if (needsConfirmation.reasons.includes('high_impact_trade')) {
    // Add additional timeframe for high-impact trades
    const additionalTF = hierarchy.next[1];
    if (additionalTF && !requiredTimeframes.find(tf => tf.timeframe === additionalTF)) {
      requiredTimeframes.push({
        timeframe: additionalTF,
        reason: 'High-impact trade setup - need comprehensive multi-timeframe analysis',
        priority: 'recommended',
        specificQuestions: [
          `Does ${additionalTF} support the trade direction?`,
          `Any conflicting signals on ${additionalTF}?`,
          `What are the key levels to watch on ${additionalTF}?`
        ]
      });
    }
  }
  
  // Generate refusal message
  const refusalMessage = generateRefusalMessage(requiredTimeframes, currentTimeframe, needsConfirmation.reasons);
  
  return {
    requestId,
    requiredTimeframes,
    currentAnalysis: {
      timeframe: currentTimeframe,
      signal: needsConfirmation.signal,
      confidence: signalStrength,
      conflictingSignals: conflictingSignals
    },
    reasoning: needsConfirmation.reasoning,
    estimatedImpact: needsConfirmation.impact,
    refusalMessage
  };
}

/**
 * Determines if confirmation should be requested
 */
function shouldRequestConfirmation(
  timeframe: string,
  signalStrength: number,
  marketConditions: any,
  tradingStyle: string,
  conflictingSignals?: string[]
): {
  required: boolean;
  reasons: string[];
  signal: string;
  reasoning: string;
  impact: string;
} {
  
  const reasons: string[] = [];
  let required = false;
  
  // 1. Weak signal strength
  if (signalStrength < 70) {
    reasons.push('weak_signal');
    required = true;
  }
  
  // 2. Conflicting signals
  if (conflictingSignals && conflictingSignals.length > 0) {
    reasons.push('conflicting_signals');
    required = true;
  }
  
  // 3. High volatility environment
  if (marketConditions.volatility === 'high' && marketConditions.trend === 'choppy') {
    reasons.push('choppy_market');
    required = true;
  }
  
  // 4. Lower timeframes need higher timeframe context
  if (['1m', '5m', '15m', '30m'].includes(timeframe)) {
    reasons.push('lower_timeframe');
    required = true;
  }
  
  // 5. Position/Swing trading always needs higher timeframe
  if (tradingStyle.toLowerCase().includes('position') || tradingStyle.toLowerCase().includes('swing')) {
    reasons.push('higher_timeframe_strategy');
    required = true;
  }
  
  // 6. Major level analysis
  if (signalStrength > 80 && marketConditions.volume === 'high') {
    reasons.push('major_level');
    required = true;
  }
  
  // 7. High-impact trade potential
  if (signalStrength > 85 && marketConditions.trend === 'strong') {
    reasons.push('high_impact_trade');
    required = true;
  }
  
  const reasoning = generateReasoningText(reasons, timeframe, signalStrength);
  const impact = estimateImpact(reasons, signalStrength);
  
  return {
    required,
    reasons,
    signal: `${signalStrength}% confidence signal`,
    reasoning,
    impact
  };
}

/**
 * Generates refusal message explaining why higher timeframe is needed
 */
function generateRefusalMessage(
  requiredTimeframes: ConfirmationRequest['requiredTimeframes'],
  currentTimeframe: string,
  reasons: string[]
): string {
  
  const requiredTFs = requiredTimeframes.filter(tf => tf.priority === 'required');
  const recommendedTFs = requiredTimeframes.filter(tf => tf.priority === 'recommended');
  
  let message = "🚫 **Cannot Provide Trade Recommendation Yet**\n\n";
  
  message += `**Reason**: The ${currentTimeframe} chart analysis shows signals that require higher timeframe confirmation to ensure accuracy and prevent false signals.\n\n`;
  
  message += "**🔍 Required Higher Timeframe Analysis:**\n";
  requiredTFs.forEach((tf, index) => {
    message += `${index + 1}. **${tf.timeframe} Chart** - ${tf.reason}\n`;
    tf.specificQuestions.forEach(question => {
      message += `   • ${question}\n`;
    });
    message += "\n";
  });
  
  if (recommendedTFs.length > 0) {
    message += "**📊 Recommended Additional Analysis:**\n";
    recommendedTFs.forEach((tf, index) => {
      message += `${index + 1}. **${tf.timeframe} Chart** - ${tf.reason}\n`;
    });
    message += "\n";
  }
  
  message += "**📋 What to Do:**\n";
  message += "1. Upload the requested higher timeframe chart(s)\n";
  message += "2. Ask the same trading question with the new chart(s)\n";
  message += "3. I will then provide a comprehensive multi-timeframe trade recommendation\n\n";
  
  message += "**⚡ Why This Matters:**\n";
  message += "• Prevents false signals from lower timeframe noise\n";
  message += "• Ensures trend alignment across timeframes\n";
  message += "• Increases trade success probability\n";
  message += "• Provides better risk management context\n\n";
  
  message += `**🎯 Once I receive the ${requiredTFs.map(tf => tf.timeframe).join(' and ')} analysis, I'll provide a complete trade recommendation with entry, stop-loss, and take-profit levels.**`;
  
  return message;
}

/**
 * Processes received timeframe confirmations
 */
export function processTimeframeConfirmations(
  confirmationRequest: ConfirmationRequest,
  receivedConfirmations: TimeframeConfirmation[]
): MultiTimeframeDecision {
  
  const required = confirmationRequest.requiredTimeframes.filter(tf => tf.priority === 'required');
  const receivedRequired = receivedConfirmations.filter(conf => 
    required.some(req => req.timeframe === conf.timeframe)
  );
  
  // Check if all required timeframes are provided
  const missingRequired = required.filter(req => 
    !receivedConfirmations.some(conf => conf.timeframe === req.timeframe)
  );
  
  if (missingRequired.length > 0) {
    return {
      canProceed: false,
      missingTimeframes: missingRequired.map(tf => tf.timeframe),
      confirmationStatus: receivedRequired.length > 0 ? 'partial' : 'none',
      overallBias: 'neutral',
      confidence: 0,
      reasoning: `Still missing required ${missingRequired.map(tf => tf.timeframe).join(', ')} analysis`,
      nextSteps: `Please provide ${missingRequired.map(tf => tf.timeframe).join(' and ')} chart analysis`
    };
  }
  
  // Analyze confirmations for alignment
  const biases = receivedConfirmations.map(conf => ({
    timeframe: conf.timeframe,
    bias: conf.confirmation,
    confidence: conf.confidence,
    trend: conf.trend.direction
  }));
  
  // Calculate overall bias and confidence
  const overallAnalysis = calculateOverallBias(biases);
  
  // Check for conflicts
  const hasConflicts = checkForConflicts(biases);
  
  return {
    canProceed: true,
    missingTimeframes: [],
    confirmationStatus: hasConflicts ? 'conflicting' : 'complete',
    overallBias: overallAnalysis.bias,
    confidence: overallAnalysis.confidence,
    reasoning: overallAnalysis.reasoning,
    nextSteps: 'All confirmations received - proceeding with trade recommendation'
  };
}

/**
 * Helper functions
 */
function getWeeklyTimeframe(currentTimeframe: string): string | null {
  const timeframeMap: Record<string, string> = {
    '1m': '1d', '5m': '1d', '15m': '4h', '30m': '4h',
    '1h': '1d', '2h': '1d', '4h': '1d', '6h': '1w',
    '8h': '1w', '12h': '1w', '1d': '1w', '3d': '1w'
  };
  
  return timeframeMap[currentTimeframe] || '1w';
}

function generateReasoningText(reasons: string[], timeframe: string, strength: number): string {
  const reasonMap: Record<string, string> = {
    'weak_signal': `Signal strength is ${strength}% (below 70% threshold)`,
    'conflicting_signals': 'Multiple conflicting signals detected on current timeframe',
    'choppy_market': 'High volatility and choppy market conditions detected',
    'lower_timeframe': `${timeframe} is a lower timeframe that needs higher timeframe context`,
    'higher_timeframe_strategy': 'Trading strategy requires higher timeframe alignment',
    'major_level': 'Approaching major structural level requiring weekly context',
    'high_impact_trade': 'High-probability setup requires comprehensive analysis'
  };
  
  return reasons.map(reason => reasonMap[reason] || reason).join('; ');
}

function estimateImpact(reasons: string[], strength: number): string {
  if (reasons.includes('high_impact_trade')) {
    return 'High impact - major move potential if confirmed';
  } else if (reasons.includes('major_level')) {
    return 'Medium-high impact - structural level test';
  } else if (strength < 60) {
    return 'Low impact - weak signal requires confirmation';
  } else {
    return 'Medium impact - standard confirmation needed';
  }
}

function calculateOverallBias(biases: Array<{ timeframe: string; bias: string; confidence: number; trend: string }>): {
  bias: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  confidence: number;
  reasoning: string;
} {
  
  const bullishCount = biases.filter(b => b.bias === 'bullish').length;
  const bearishCount = biases.filter(b => b.bias === 'bearish').length;
  const neutralCount = biases.filter(b => b.bias === 'neutral').length;
  
  const avgConfidence = biases.reduce((sum, b) => sum + b.confidence, 0) / biases.length;
  
  if (bullishCount > bearishCount && bullishCount > neutralCount) {
    return {
      bias: 'bullish',
      confidence: avgConfidence,
      reasoning: `${bullishCount}/${biases.length} timeframes bullish, average confidence ${avgConfidence.toFixed(0)}%`
    };
  } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
    return {
      bias: 'bearish',
      confidence: avgConfidence,
      reasoning: `${bearishCount}/${biases.length} timeframes bearish, average confidence ${avgConfidence.toFixed(0)}%`
    };
  } else if (neutralCount > bullishCount && neutralCount > bearishCount) {
    return {
      bias: 'neutral',
      confidence: avgConfidence * 0.7, // Reduce confidence for neutral
      reasoning: `${neutralCount}/${biases.length} timeframes neutral, ranging market`
    };
  } else {
    return {
      bias: 'mixed',
      confidence: avgConfidence * 0.5, // Significantly reduce confidence for mixed signals
      reasoning: `Mixed signals: ${bullishCount} bullish, ${bearishCount} bearish, ${neutralCount} neutral`
    };
  }
}

function checkForConflicts(biases: Array<{ timeframe: string; bias: string; confidence: number }>): boolean {
  const uniqueBiases = new Set(biases.map(b => b.bias));
  return uniqueBiases.size > 2 || (uniqueBiases.has('bullish') && uniqueBiases.has('bearish'));
}

/**
 * Main function to check if analysis can proceed
 */
export function canProceedWithAnalysis(
  currentTimeframe: string,
  currentAnalysis: {
    signalStrength: number;
    marketConditions: any;
    tradingStyle: string;
    conflictingSignals?: string[];
  },
  existingConfirmations?: TimeframeConfirmation[]
): {
  canProceed: boolean;
  confirmationRequest?: ConfirmationRequest;
  decision?: MultiTimeframeDecision;
} {
  
  // Check if confirmation is needed
  const confirmationRequest = assessConfirmationNeeds(
    currentTimeframe,
    currentAnalysis.signalStrength,
    currentAnalysis.marketConditions,
    currentAnalysis.tradingStyle,
    currentAnalysis.conflictingSignals
  );
  
  if (!confirmationRequest) {
    // No confirmation needed, can proceed
    return { canProceed: true };
  }
  
  if (!existingConfirmations || existingConfirmations.length === 0) {
    // Confirmation needed but none provided
    return {
      canProceed: false,
      confirmationRequest
    };
  }
  
  // Process existing confirmations
  const decision = processTimeframeConfirmations(confirmationRequest, existingConfirmations);
  
  return {
    canProceed: decision.canProceed,
    confirmationRequest: decision.canProceed ? undefined : confirmationRequest,
    decision
  };
}