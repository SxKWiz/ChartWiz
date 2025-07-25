/**
 * @fileOverview Advanced technical indicators and calculations for enhanced AI trading analysis
 * 
 * This module provides sophisticated technical analysis tools including:
 * - Advanced oscillators and momentum indicators
 * - Volume analysis and flow indicators
 * - Market structure analysis tools
 * - Statistical and mathematical indicators
 */

export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  value: number;
  signal?: 'bullish' | 'bearish' | 'neutral';
  strength?: number; // 0-100
  divergence?: boolean;
}

export interface VolumeProfile {
  priceLevel: number;
  volume: number;
  volumePercent: number;
}

export interface MarketStructure {
  trend: 'uptrend' | 'downtrend' | 'sideways';
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  structureBreak: boolean;
  keyLevels: number[];
}

/**
 * Calculates the Relative Strength Index (RSI) with divergence detection
 */
export function calculateRSI(
  prices: number[], 
  period: number = 14
): { rsi: number; divergence: boolean; signal: 'overbought' | 'oversold' | 'neutral' } {
  if (prices.length < period + 1) {
    throw new Error('Insufficient data for RSI calculation');
  }
  
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  const avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  const avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Simple divergence detection (would need price highs/lows for full implementation)
  const divergence = false; // Placeholder - full implementation would compare price and RSI trends
  
  let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  if (rsi > 70) signal = 'overbought';
  else if (rsi < 30) signal = 'oversold';
  
  return { rsi, divergence, signal };
}

/**
 * Calculates MACD with signal line and histogram
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: number;
  signal: number;
  histogram: number;
  crossover: 'bullish' | 'bearish' | 'none';
} {
  if (prices.length < slowPeriod) {
    throw new Error('Insufficient data for MACD calculation');
  }
  
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  const macdLine = fastEMA - slowEMA;
  const macdValues = [macdLine]; // In real implementation, would calculate for multiple periods
  const signalLine = calculateEMA(macdValues, signalPeriod);
  const histogram = macdLine - signalLine;
  
  // Simplified crossover detection
  const crossover: 'bullish' | 'bearish' | 'none' = histogram > 0 ? 'bullish' : histogram < 0 ? 'bearish' : 'none';
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    crossover
  };
}

/**
 * Calculates Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

/**
 * Calculates Bollinger Bands with squeeze detection
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  squeeze: boolean;
  expansion: boolean;
} {
  if (prices.length < period) {
    throw new Error('Insufficient data for Bollinger Bands calculation');
  }
  
  const recentPrices = prices.slice(-period);
  const middle = recentPrices.reduce((a, b) => a + b) / period;
  
  const variance = recentPrices.reduce((acc, price) => {
    return acc + Math.pow(price - middle, 2);
  }, 0) / period;
  
  const standardDeviation = Math.sqrt(variance);
  const upper = middle + (standardDeviation * stdDev);
  const lower = middle - (standardDeviation * stdDev);
  const bandwidth = (upper - lower) / middle * 100;
  
  // Squeeze detection (bandwidth below historical average)
  const squeeze = bandwidth < 10; // Simplified threshold
  const expansion = bandwidth > 20; // Simplified threshold
  
  return { upper, middle, lower, bandwidth, squeeze, expansion };
}

/**
 * Calculates Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(priceData: PriceData[]): number {
  if (priceData.length === 0) return 0;
  
  let totalVolume = 0;
  let totalVolumePrice = 0;
  
  for (const data of priceData) {
    const typicalPrice = (data.high + data.low + data.close) / 3;
    totalVolumePrice += typicalPrice * data.volume;
    totalVolume += data.volume;
  }
  
  return totalVolumePrice / totalVolume;
}

/**
 * Analyzes volume profile to identify key levels
 */
export function analyzeVolumeProfile(
  priceData: PriceData[],
  priceLevels: number = 50
): {
  profile: VolumeProfile[];
  poc: number; // Point of Control (highest volume)
  valueAreaHigh: number;
  valueAreaLow: number;
} {
  if (priceData.length === 0) {
    return { profile: [], poc: 0, valueAreaHigh: 0, valueAreaLow: 0 };
  }
  
  const minPrice = Math.min(...priceData.map(d => d.low));
  const maxPrice = Math.max(...priceData.map(d => d.high));
  const priceRange = maxPrice - minPrice;
  const levelSize = priceRange / priceLevels;
  
  const volumeByLevel: { [level: number]: number } = {};
  let totalVolume = 0;
  
  // Distribute volume across price levels
  for (const data of priceData) {
    const level = Math.floor((data.close - minPrice) / levelSize);
    volumeByLevel[level] = (volumeByLevel[level] || 0) + data.volume;
    totalVolume += data.volume;
  }
  
  // Create volume profile
  const profile: VolumeProfile[] = [];
  for (let i = 0; i < priceLevels; i++) {
    const volume = volumeByLevel[i] || 0;
    profile.push({
      priceLevel: minPrice + (i * levelSize),
      volume,
      volumePercent: (volume / totalVolume) * 100
    });
  }
  
  // Find Point of Control (highest volume level)
  const pocLevel = profile.reduce((max, current) => 
    current.volume > max.volume ? current : max
  );
  
  // Calculate Value Area (70% of volume around POC)
  const sortedByVolume = profile.sort((a, b) => b.volume - a.volume);
  let valueAreaVolume = 0;
  const valueAreaLevels: number[] = [];
  
  for (const level of sortedByVolume) {
    valueAreaVolume += level.volume;
    valueAreaLevels.push(level.priceLevel);
    if (valueAreaVolume >= totalVolume * 0.7) break;
  }
  
  return {
    profile: profile.sort((a, b) => a.priceLevel - b.priceLevel),
    poc: pocLevel.priceLevel,
    valueAreaHigh: Math.max(...valueAreaLevels),
    valueAreaLow: Math.min(...valueAreaLevels)
  };
}

/**
 * Analyzes market structure for trend identification
 */
export function analyzeMarketStructure(priceData: PriceData[]): MarketStructure {
  if (priceData.length < 3) {
    return {
      trend: 'sideways',
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
      structureBreak: false,
      keyLevels: []
    };
  }
  
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  
  // Identify swing highs and lows
  for (let i = 1; i < priceData.length - 1; i++) {
    const prev = priceData[i - 1];
    const current = priceData[i];
    const next = priceData[i + 1];
    
    if (current.high > prev.high && current.high > next.high) {
      swingHighs.push(current.high);
    }
    
    if (current.low < prev.low && current.low < next.low) {
      swingLows.push(current.low);
    }
  }
  
  // Analyze structure
  const higherHighs = swingHighs.length >= 2 && 
    swingHighs[swingHighs.length - 1] > swingHighs[swingHighs.length - 2];
  
  const higherLows = swingLows.length >= 2 && 
    swingLows[swingLows.length - 1] > swingLows[swingLows.length - 2];
  
  const lowerHighs = swingHighs.length >= 2 && 
    swingHighs[swingHighs.length - 1] < swingHighs[swingHighs.length - 2];
  
  const lowerLows = swingLows.length >= 2 && 
    swingLows[swingLows.length - 1] < swingLows[swingLows.length - 2];
  
  let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways';
  if (higherHighs && higherLows) trend = 'uptrend';
  else if (lowerHighs && lowerLows) trend = 'downtrend';
  
  const structureBreak = (trend === 'uptrend' && lowerLows) || 
                        (trend === 'downtrend' && higherHighs);
  
  const keyLevels = [...swingHighs, ...swingLows].sort((a, b) => a - b);
  
  return {
    trend,
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    structureBreak,
    keyLevels
  };
}

/**
 * Calculates Average True Range (ATR) for volatility assessment
 */
export function calculateATR(priceData: PriceData[], period: number = 14): number {
  if (priceData.length < period + 1) {
    throw new Error('Insufficient data for ATR calculation');
  }
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < priceData.length; i++) {
    const current = priceData[i];
    const previous = priceData[i - 1];
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((a, b) => a + b) / period;
}

/**
 * Calculates Money Flow Index (MFI) for volume-weighted momentum
 */
export function calculateMFI(priceData: PriceData[], period: number = 14): IndicatorResult {
  if (priceData.length < period + 1) {
    throw new Error('Insufficient data for MFI calculation');
  }
  
  const typicalPrices: number[] = [];
  const rawMoneyFlows: number[] = [];
  
  for (let i = 0; i < priceData.length; i++) {
    const tp = (priceData[i].high + priceData[i].low + priceData[i].close) / 3;
    typicalPrices.push(tp);
    rawMoneyFlows.push(tp * priceData[i].volume);
  }
  
  let positiveFlow = 0;
  let negativeFlow = 0;
  
  for (let i = 1; i <= period; i++) {
    const index = priceData.length - i;
    if (typicalPrices[index] > typicalPrices[index - 1]) {
      positiveFlow += rawMoneyFlows[index];
    } else {
      negativeFlow += rawMoneyFlows[index];
    }
  }
  
  const moneyFlowRatio = positiveFlow / negativeFlow;
  const mfi = 100 - (100 / (1 + moneyFlowRatio));
  
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (mfi > 80) signal = 'bearish'; // Overbought
  else if (mfi < 20) signal = 'bullish'; // Oversold
  
  return {
    value: mfi,
    signal,
    strength: Math.abs(mfi - 50) * 2, // 0-100 scale
    divergence: false // Placeholder
  };
}

/**
 * Fibonacci retracement and extension calculations
 */
export function calculateFibonacci(
  high: number,
  low: number,
  type: 'retracement' | 'extension' = 'retracement'
): { [key: string]: number } {
  const range = high - low;
  
  if (type === 'retracement') {
    return {
      '0%': high,
      '23.6%': high - (range * 0.236),
      '38.2%': high - (range * 0.382),
      '50%': high - (range * 0.5),
      '61.8%': high - (range * 0.618),
      '78.6%': high - (range * 0.786),
      '100%': low
    };
  } else {
    return {
      '127.2%': high + (range * 0.272),
      '161.8%': high + (range * 0.618),
      '261.8%': high + (range * 1.618),
      '423.6%': high + (range * 3.236)
    };
  }
}

/**
 * Detects chart patterns in price data
 */
export function detectChartPatterns(priceData: PriceData[]): {
  patterns: Array<{
    type: string;
    confidence: number;
    target: number;
    invalidation: number;
  }>;
} {
  // Simplified pattern detection - in practice, this would be much more sophisticated
  const patterns: Array<{
    type: string;
    confidence: number;
    target: number;
    invalidation: number;
  }> = [];
  
  if (priceData.length < 20) return { patterns };
  
  const recent = priceData.slice(-20);
  const highs = recent.map(d => d.high);
  const lows = recent.map(d => d.low);
  
  // Simple double top detection
  const maxHigh = Math.max(...highs);
  const maxIndices = highs.map((h, i) => h === maxHigh ? i : -1).filter(i => i !== -1);
  
  if (maxIndices.length >= 2 && maxIndices[maxIndices.length - 1] - maxIndices[0] > 5) {
    patterns.push({
      type: 'Double Top',
      confidence: 75,
      target: Math.min(...lows),
      invalidation: maxHigh * 1.02
    });
  }
  
  return { patterns };
}

/**
 * Calculates support and resistance levels using multiple methods
 */
export function calculateSupportResistance(priceData: PriceData[]): {
  support: number[];
  resistance: number[];
  strength: { [level: number]: number };
} {
  if (priceData.length < 10) {
    return { support: [], resistance: [], strength: {} };
  }
  
  const levels: { [price: number]: number } = {};
  
  // Count touches at each price level (simplified)
  for (const data of priceData) {
    const highLevel = Math.round(data.high * 100) / 100;
    const lowLevel = Math.round(data.low * 100) / 100;
    
    levels[highLevel] = (levels[highLevel] || 0) + 1;
    levels[lowLevel] = (levels[lowLevel] || 0) + 1;
  }
  
  // Find significant levels (3+ touches)
  const significantLevels = Object.entries(levels)
    .filter(([_, count]) => count >= 3)
    .map(([price, count]) => ({ price: parseFloat(price), count }))
    .sort((a, b) => b.count - a.count);
  
  const currentPrice = priceData[priceData.length - 1].close;
  
  const support = significantLevels
    .filter(level => level.price < currentPrice)
    .map(level => level.price);
  
  const resistance = significantLevels
    .filter(level => level.price > currentPrice)
    .map(level => level.price);
  
  const strength: { [level: number]: number } = {};
  significantLevels.forEach(level => {
    strength[level.price] = level.count;
  });
  
  return { support, resistance, strength };
}