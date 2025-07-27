import type { ChartDrawingAnalysisOutput } from '@/ai/flows/chart-drawing-analysis';
import type { AIDrawingData, PatternAnnotation, ChartPoint } from '@/components/charts/interactive-chart-overlay';

/**
 * Converts AI chart drawing analysis output to the format expected by InteractiveChartOverlay
 */
export function convertAIAnalysisToDrawingData(
  analysis: ChartDrawingAnalysisOutput
): AIDrawingData {
  const patterns: PatternAnnotation[] = [];

  // Convert support levels to annotations
  analysis.keyLevels.support.forEach((level, index) => {
    patterns.push({
      id: `support-${index}`,
      type: 'support',
      name: `Support Level`,
      description: level.description,
      confidence: level.strength,
      points: level.coordinates,
      style: {
        color: '#22c55e',
        strokeWidth: 2,
        strokeDasharray: '5,5'
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: 'bullish',
        strength: level.strength,
        priceTargets: [level.price]
      }
    });
  });

  // Convert resistance levels to annotations
  analysis.keyLevels.resistance.forEach((level, index) => {
    patterns.push({
      id: `resistance-${index}`,
      type: 'resistance',
      name: `Resistance Level`,
      description: level.description,
      confidence: level.strength,
      points: level.coordinates,
      style: {
        color: '#ef4444',
        strokeWidth: 2,
        strokeDasharray: '5,5'
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: 'bearish',
        strength: level.strength,
        priceTargets: [level.price]
      }
    });
  });

  // Convert uptrend lines
  analysis.trendLines.uptrend.forEach((trend, index) => {
    patterns.push({
      id: `uptrend-${index}`,
      type: 'trendline',
      name: 'Uptrend Line',
      description: trend.description,
      confidence: trend.strength,
      points: trend.points,
      style: {
        color: '#3b82f6',
        strokeWidth: 3
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: 'bullish',
        strength: trend.strength,
        patternType: 'uptrend'
      }
    });
  });

  // Convert downtrend lines
  analysis.trendLines.downtrend.forEach((trend, index) => {
    patterns.push({
      id: `downtrend-${index}`,
      type: 'trendline',
      name: 'Downtrend Line',
      description: trend.description,
      confidence: trend.strength,
      points: trend.points,
      style: {
        color: '#f59e0b',
        strokeWidth: 3
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: 'bearish',
        strength: trend.strength,
        patternType: 'downtrend'
      }
    });
  });

  // Convert chart patterns
  analysis.patterns.forEach((pattern, index) => {
    patterns.push({
      id: `pattern-${index}`,
      type: 'pattern',
      name: pattern.name,
      description: pattern.description,
      confidence: pattern.confidence,
      points: pattern.coordinates,
      style: {
        color: '#ec4899',
        strokeWidth: 2,
        fillOpacity: 0.1
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        patternType: pattern.name,
        direction: pattern.direction,
        strength: pattern.confidence,
        priceTargets: pattern.targets
      }
    });
  });

  // Convert Fibonacci levels
  if (analysis.fibonacci.retracement) {
    const fib = analysis.fibonacci.retracement;
    fib.levels.forEach((level) => {
      patterns.push({
        id: `fib-retracement-${level.level}`,
        type: 'fibonacci',
        name: `Fibonacci ${level.level}`,
        description: level.description,
        confidence: 80,
        points: [level.coordinates],
        style: {
          color: '#8b5cf6',
          strokeWidth: 1,
          strokeDasharray: '2,2',
          fillOpacity: 0.05
        },
        visible: true,
        aiGenerated: true,
        metadata: {
          patternType: 'fibonacci_retracement',
          strength: 80,
          priceTargets: [level.price]
        }
      });
    });
  }

  if (analysis.fibonacci.extension) {
    const fib = analysis.fibonacci.extension;
    fib.levels.forEach((level) => {
      patterns.push({
        id: `fib-extension-${level.level}`,
        type: 'fibonacci',
        name: `Fibonacci Extension ${level.level}`,
        description: level.description,
        confidence: 75,
        points: [level.coordinates],
        style: {
          color: '#a855f7',
          strokeWidth: 1,
          strokeDasharray: '3,2',
          fillOpacity: 0.05
        },
        visible: true,
        aiGenerated: true,
        metadata: {
          patternType: 'fibonacci_extension',
          strength: 75,
          priceTargets: [level.price]
        }
      });
    });
  }

  // Convert trading signals
  analysis.tradingSignals.forEach((signal, index) => {
    patterns.push({
      id: `signal-${index}`,
      type: 'signal',
      name: `${signal.type.toUpperCase()} Signal`,
      description: signal.reasoning,
      confidence: signal.confidence,
      points: [signal.coordinates],
      style: {
        color: signal.type === 'buy' ? '#10b981' : signal.type === 'sell' ? '#f87171' : '#6b7280',
        strokeWidth: 3
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: signal.type === 'buy' ? 'bullish' : signal.type === 'sell' ? 'bearish' : 'neutral',
        strength: signal.confidence,
        priceTargets: signal.targets
      }
    });
  });

  // Convert volume zones
  analysis.zones.accumulation.forEach((zone, index) => {
    patterns.push({
      id: `accumulation-${index}`,
      type: 'volume',
      name: 'Accumulation Zone',
      description: zone.description,
      confidence: zone.strength,
      points: [zone.topLeft, zone.bottomRight],
      style: {
        color: '#22c55e',
        strokeWidth: 2,
        fillOpacity: 0.15
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: 'bullish',
        strength: zone.strength,
        patternType: 'accumulation'
      }
    });
  });

  analysis.zones.distribution.forEach((zone, index) => {
    patterns.push({
      id: `distribution-${index}`,
      type: 'volume',
      name: 'Distribution Zone',
      description: zone.description,
      confidence: zone.strength,
      points: [zone.topLeft, zone.bottomRight],
      style: {
        color: '#ef4444',
        strokeWidth: 2,
        fillOpacity: 0.15
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: 'bearish',
        strength: zone.strength,
        patternType: 'distribution'
      }
    });
  });

  // Prepare the main drawing data structure
  const drawingData: AIDrawingData = {
    patterns,
    keyLevels: {
      support: analysis.keyLevels.support.map(level => level.price),
      resistance: analysis.keyLevels.resistance.map(level => level.price)
    },
    trendLines: {
      uptrend: analysis.trendLines.uptrend.map(trend => trend.points),
      downtrend: analysis.trendLines.downtrend.map(trend => trend.points)
    },
    zones: {
      accumulation: analysis.zones.accumulation.length > 0 ? {
        start: analysis.zones.accumulation[0].topLeft,
        end: analysis.zones.accumulation[0].bottomRight
      } : undefined,
      distribution: analysis.zones.distribution.length > 0 ? {
        start: analysis.zones.distribution[0].topLeft,
        end: analysis.zones.distribution[0].bottomRight
      } : undefined,
      demand: analysis.zones.demand.map(zone => zone.coordinates),
      supply: analysis.zones.supply.map(zone => zone.coordinates)
    },
    fibonacci: {
      retracement: analysis.fibonacci.retracement ? {
        start: analysis.fibonacci.retracement.start,
        end: analysis.fibonacci.retracement.end,
        levels: analysis.fibonacci.retracement.levels.map(level => ({
          level: level.level,
          price: level.price,
          point: level.coordinates
        }))
      } : undefined,
      extension: analysis.fibonacci.extension ? {
        start: analysis.fibonacci.extension.start,
        end: analysis.fibonacci.extension.end,
        levels: analysis.fibonacci.extension.levels.map(level => ({
          level: level.level,
          price: level.price,
          point: level.coordinates
        }))
      } : undefined
    },
    annotations: analysis.annotations.map(annotation => ({
      text: annotation.text,
      position: annotation.position,
      type: annotation.type,
      color: annotation.color
    }))
  };

  return drawingData;
}

/**
 * Extracts key metrics from drawing data for display
 */
export function extractDrawingMetrics(drawingData: AIDrawingData) {
  return {
    totalAnnotations: drawingData.patterns.length,
    supportLevels: drawingData.keyLevels.support.length,
    resistanceLevels: drawingData.keyLevels.resistance.length,
    trendLines: drawingData.trendLines.uptrend.length + drawingData.trendLines.downtrend.length,
    patterns: drawingData.patterns.filter(p => p.type === 'pattern').length,
    fibonacci: (drawingData.fibonacci.retracement?.levels.length || 0) + (drawingData.fibonacci.extension?.levels.length || 0),
    signals: drawingData.patterns.filter(p => p.type === 'signal').length
  };
}

/**
 * Generates a summary of the AI analysis for display
 */
export function generateAnalysisSummary(
  analysis: ChartDrawingAnalysisOutput,
  drawingData: AIDrawingData
): string {
  const metrics = extractDrawingMetrics(drawingData);
  
  let summary = `🎯 **AI Technical Analysis Complete**\n\n`;
  summary += `📊 **Analysis Summary:**\n`;
  summary += `${analysis.analysis}\n\n`;
  
  summary += `📈 **Key Findings:**\n`;
  if (metrics.supportLevels > 0) {
    summary += `• ${metrics.supportLevels} Support Level${metrics.supportLevels > 1 ? 's' : ''} identified\n`;
  }
  if (metrics.resistanceLevels > 0) {
    summary += `• ${metrics.resistanceLevels} Resistance Level${metrics.resistanceLevels > 1 ? 's' : ''} identified\n`;
  }
  if (metrics.trendLines > 0) {
    summary += `• ${metrics.trendLines} Trend Line${metrics.trendLines > 1 ? 's' : ''} drawn\n`;
  }
  if (metrics.patterns > 0) {
    summary += `• ${metrics.patterns} Chart Pattern${metrics.patterns > 1 ? 's' : ''} detected\n`;
  }
  if (metrics.fibonacci > 0) {
    summary += `• ${metrics.fibonacci} Fibonacci Level${metrics.fibonacci > 1 ? 's' : ''} calculated\n`;
  }
  if (metrics.signals > 0) {
    summary += `• ${metrics.signals} Trading Signal${metrics.signals > 1 ? 's' : ''} generated\n`;
  }

  if (analysis.tradingSignals.length > 0) {
    summary += `\n🎯 **Trading Signals:**\n`;
    analysis.tradingSignals.forEach((signal, index) => {
      summary += `${index + 1}. **${signal.type.toUpperCase()}** (${signal.confidence}% confidence)\n`;
      summary += `   ${signal.reasoning}\n`;
      if (signal.targets && signal.targets.length > 0) {
        summary += `   Targets: ${signal.targets.map(t => `$${t.toLocaleString()}`).join(', ')}\n`;
      }
      if (signal.stopLoss) {
        summary += `   Stop Loss: $${signal.stopLoss.toLocaleString()}\n`;
      }
    });
  }

  summary += `\n✨ Click on the annotation controls to show/hide specific technical drawings.`;

  return summary;
}