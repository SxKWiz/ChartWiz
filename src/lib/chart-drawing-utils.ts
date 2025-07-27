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
  analysis.supportLevels.forEach((level, index) => {
    patterns.push({
      id: `support-${index}`,
      type: 'support',
      name: `Support Level`,
      description: level.description,
      confidence: level.strength,
      points: [
        { x: 0, y: level.yCoordinate, price: level.price },
        { x: 800, y: level.yCoordinate, price: level.price } // Use full width
      ],
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
  analysis.resistanceLevels.forEach((level, index) => {
    patterns.push({
      id: `resistance-${index}`,
      type: 'resistance',
      name: `Resistance Level`,
      description: level.description,
      confidence: level.strength,
      points: [
        { x: 0, y: level.yCoordinate, price: level.price },
        { x: 800, y: level.yCoordinate, price: level.price } // Use full width
      ],
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

  // Convert trendlines
  analysis.trendLines.forEach((trend, index) => {
    patterns.push({
      id: `${trend.type}-${index}`,
      type: 'trendline',
      name: trend.type === 'uptrend' ? 'Uptrend Line' : 'Downtrend Line',
      description: trend.description,
      confidence: trend.strength,
      points: [
        { x: trend.startX, y: trend.startY },
        { x: trend.endX, y: trend.endY }
      ],
      style: {
        color: trend.type === 'uptrend' ? '#3b82f6' : '#f59e0b',
        strokeWidth: 3
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: trend.type === 'uptrend' ? 'bullish' : 'bearish',
        strength: trend.strength,
        patternType: trend.type
      }
    });
  });

  // Convert chart patterns
  analysis.patterns.forEach((pattern, index) => {
    // Parse coordinates string "x1,y1,x2,y2,x3,y3" into points
    const coordsArray = pattern.coordinates.split(',').map(Number);
    const points: ChartPoint[] = [];
    for (let i = 0; i < coordsArray.length; i += 2) {
      if (i + 1 < coordsArray.length) {
        points.push({ x: coordsArray[i], y: coordsArray[i + 1] });
      }
    }

    patterns.push({
      id: `pattern-${index}`,
      type: 'pattern',
      name: pattern.name,
      description: pattern.description,
      confidence: pattern.confidence,
      points,
      style: {
        color: '#ec4899',
        strokeWidth: 2,
        fillOpacity: 0.1
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        patternType: pattern.name,
        direction: pattern.type,
        strength: pattern.confidence
      }
    });
  });

  // Convert Fibonacci levels
  analysis.fibonacciLevels.forEach((level, index) => {
    patterns.push({
      id: `fib-${index}`,
      type: 'fibonacci',
      name: `Fibonacci ${level.level}`,
      description: level.description,
      confidence: 80,
      points: [
        { x: 0, y: level.yCoordinate, price: level.price },
        { x: 800, y: level.yCoordinate, price: level.price }
      ],
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

  // Convert trading signals
  analysis.tradingSignals.forEach((signal, index) => {
    patterns.push({
      id: `signal-${index}`,
      type: 'signal',
      name: `${signal.type.toUpperCase()} Signal`,
      description: signal.reasoning,
      confidence: signal.confidence,
      points: [{ x: signal.x, y: signal.y }],
      style: {
        color: signal.type === 'buy' ? '#10b981' : signal.type === 'sell' ? '#f87171' : '#6b7280',
        strokeWidth: 3
      },
      visible: true,
      aiGenerated: true,
      metadata: {
        direction: signal.type === 'buy' ? 'bullish' : signal.type === 'sell' ? 'bearish' : 'neutral',
        strength: signal.confidence
      }
    });
  });

  // Prepare the main drawing data structure
  const drawingData: AIDrawingData = {
    patterns,
    keyLevels: {
      support: analysis.supportLevels.map(level => level.price),
      resistance: analysis.resistanceLevels.map(level => level.price)
    },
    trendLines: {
      uptrend: analysis.trendLines
        .filter(t => t.type === 'uptrend')
        .map(t => [{ x: t.startX, y: t.startY }, { x: t.endX, y: t.endY }]),
      downtrend: analysis.trendLines
        .filter(t => t.type === 'downtrend')
        .map(t => [{ x: t.startX, y: t.startY }, { x: t.endX, y: t.endY }])
    },
    zones: {},
    fibonacci: {
      retracement: analysis.fibonacciLevels.length > 0 ? {
        start: { x: 0, y: 0 }, // Simplified for now
        end: { x: 800, y: 600 },
        levels: analysis.fibonacciLevels.map(level => ({
          level: parseFloat(level.level) || 0,
          price: level.price,
          point: { x: 0, y: level.yCoordinate }
        }))
      } : undefined
    },
    annotations: [] // Simplified for now
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
    fibonacci: drawingData.fibonacci.retracement?.levels.length || 0,
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
    });
  }

  if (analysis.keyInsights.length > 0) {
    summary += `\n💡 **Key Insights:**\n`;
    analysis.keyInsights.forEach((insight, index) => {
      summary += `• ${insight}\n`;
    });
  }

  summary += `\n✨ Click on the annotation controls to show/hide specific technical drawings.`;

  return summary;
}