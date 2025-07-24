/**
 * @fileOverview Trading precision utilities for accurate price calculations and formatting
 * 
 * This module provides utilities for:
 * - Price precision based on asset type and price range
 * - Risk-reward ratio calculations with proper decimal handling
 * - Price validation and formatting
 * - Technical analysis level precision
 */

export interface PricePrecisionConfig {
  asset: string;
  currentPrice: number;
  decimalPlaces: number;
  tickSize: number;
}

export interface TradeCalculation {
  entryPrice: number;
  takeProfitLevels: number[];
  stopLoss: number;
  riskRewardRatios: number[];
  potentialRisk: number;
  potentialRewards: number[];
}

/**
 * Determines the appropriate decimal places and tick size for a given asset and price
 */
export function getPricePrecision(asset: string, currentPrice: number): PricePrecisionConfig {
  const assetUpper = asset.toUpperCase();
  
  // Bitcoin and major cryptocurrencies
  if (assetUpper.includes('BTC') || assetUpper.includes('BITCOIN')) {
    if (currentPrice >= 10000) {
      return { asset, currentPrice, decimalPlaces: 0, tickSize: 1 };
    } else if (currentPrice >= 1000) {
      return { asset, currentPrice, decimalPlaces: 1, tickSize: 0.1 };
    } else {
      return { asset, currentPrice, decimalPlaces: 2, tickSize: 0.01 };
    }
  }
  
  // Ethereum and similar high-value alts
  if (assetUpper.includes('ETH') || assetUpper.includes('ETHEREUM') || 
      assetUpper.includes('BNB') || assetUpper.includes('SOL') || assetUpper.includes('SOLANA')) {
    if (currentPrice >= 1000) {
      return { asset, currentPrice, decimalPlaces: 1, tickSize: 0.1 };
    } else if (currentPrice >= 100) {
      return { asset, currentPrice, decimalPlaces: 2, tickSize: 0.01 };
    } else {
      return { asset, currentPrice, decimalPlaces: 3, tickSize: 0.001 };
    }
  }
  
  // Mid-cap altcoins
  if (currentPrice >= 10) {
    return { asset, currentPrice, decimalPlaces: 3, tickSize: 0.001 };
  } else if (currentPrice >= 1) {
    return { asset, currentPrice, decimalPlaces: 4, tickSize: 0.0001 };
  } else if (currentPrice >= 0.1) {
    return { asset, currentPrice, decimalPlaces: 5, tickSize: 0.00001 };
  } else if (currentPrice >= 0.01) {
    return { asset, currentPrice, decimalPlaces: 6, tickSize: 0.000001 };
  } else {
    // Low-cap altcoins and meme coins
    return { asset, currentPrice, decimalPlaces: 8, tickSize: 0.00000001 };
  }
}

/**
 * Formats a price according to the asset's precision requirements
 */
export function formatPrice(price: number, config: PricePrecisionConfig): string {
  const rounded = Math.round(price / config.tickSize) * config.tickSize;
  return rounded.toFixed(config.decimalPlaces);
}

/**
 * Validates that a price level makes technical sense
 */
export function validatePriceLevel(
  price: number, 
  currentPrice: number, 
  type: 'entry' | 'takeProfit' | 'stopLoss',
  direction: 'long' | 'short'
): { isValid: boolean; reason?: string } {
  const priceChange = Math.abs(price - currentPrice) / currentPrice;
  
  // Basic sanity checks
  if (price <= 0) {
    return { isValid: false, reason: 'Price must be positive' };
  }
  
  if (type === 'entry') {
    // Entry price should be within reasonable range of current price
    if (priceChange > 0.15) { // More than 15% away
      return { isValid: false, reason: 'Entry price too far from current market price' };
    }
  }
  
  if (type === 'takeProfit') {
    if (direction === 'long' && price <= currentPrice) {
      return { isValid: false, reason: 'Take profit must be above current price for long positions' };
    }
    if (direction === 'short' && price >= currentPrice) {
      return { isValid: false, reason: 'Take profit must be below current price for short positions' };
    }
    // Take profit should provide meaningful reward (at least 1% for scalping, 3% for swing)
    const minReward = priceChange < 0.01 ? 0.01 : 0.03;
    if (priceChange < minReward) {
      return { isValid: false, reason: `Take profit too close to entry (minimum ${minReward * 100}% recommended)` };
    }
  }
  
  if (type === 'stopLoss') {
    if (direction === 'long' && price >= currentPrice) {
      return { isValid: false, reason: 'Stop loss must be below current price for long positions' };
    }
    if (direction === 'short' && price <= currentPrice) {
      return { isValid: false, reason: 'Stop loss must be above current price for short positions' };
    }
    // Stop loss should not be too tight (minimum 0.5%) or too wide (maximum 10%)
    if (priceChange < 0.005) {
      return { isValid: false, reason: 'Stop loss too tight (minimum 0.5% recommended)' };
    }
    if (priceChange > 0.10) {
      return { isValid: false, reason: 'Stop loss too wide (maximum 10% recommended)' };
    }
  }
  
  return { isValid: true };
}

/**
 * Calculates precise risk-reward ratios with proper decimal handling
 */
export function calculateRiskReward(
  entryPrice: number,
  takeProfitLevels: number[],
  stopLoss: number,
  direction: 'long' | 'short' = 'long'
): TradeCalculation {
  const potentialRisk = Math.abs(entryPrice - stopLoss);
  const potentialRewards = takeProfitLevels.map(tp => Math.abs(tp - entryPrice));
  const riskRewardRatios = potentialRewards.map(reward => 
    potentialRisk > 0 ? reward / potentialRisk : 0
  );
  
  return {
    entryPrice,
    takeProfitLevels,
    stopLoss,
    riskRewardRatios,
    potentialRisk,
    potentialRewards
  };
}

/**
 * Formats risk-reward ratio as a string (e.g., "2.5:1")
 */
export function formatRiskReward(ratio: number): string {
  if (ratio === 0 || !isFinite(ratio)) return '0:1';
  return `${ratio.toFixed(1)}:1`;
}

/**
 * Generates precision-aware price recommendations based on technical levels
 */
export function generatePrecisePriceLevel(
  basePrice: number,
  adjustment: number,
  config: PricePrecisionConfig,
  type: 'support' | 'resistance' | 'fibonacci' | 'moving_average'
): number {
  let adjustedPrice = basePrice * (1 + adjustment);
  
  // Apply technical analysis precision rules
  switch (type) {
    case 'support':
    case 'resistance':
      // Round to psychologically significant levels
      adjustedPrice = roundToPsychologicalLevel(adjustedPrice, config);
      break;
    case 'fibonacci':
      // Fibonacci levels should be more precise
      adjustedPrice = Math.round(adjustedPrice / config.tickSize) * config.tickSize;
      break;
    case 'moving_average':
      // Moving averages can be slightly more precise
      adjustedPrice = Math.round(adjustedPrice / (config.tickSize * 0.5)) * (config.tickSize * 0.5);
      break;
  }
  
  return adjustedPrice;
}

/**
 * Rounds price to psychologically significant levels (round numbers that traders watch)
 */
function roundToPsychologicalLevel(price: number, config: PricePrecisionConfig): number {
  // For major cryptocurrencies, round to significant psychological levels
  if (price >= 10000) {
    // Round to nearest 100 or 50
    const mod100 = price % 100;
    if (mod100 < 25) return price - mod100;
    if (mod100 < 75) return price - mod100 + 50;
    return price - mod100 + 100;
  } else if (price >= 1000) {
    // Round to nearest 10 or 5
    const mod10 = price % 10;
    if (mod10 < 2.5) return price - mod10;
    if (mod10 < 7.5) return price - mod10 + 5;
    return price - mod10 + 10;
  } else {
    // Use standard tick size rounding
    return Math.round(price / config.tickSize) * config.tickSize;
  }
}

/**
 * Extracts asset symbol from common trading pair formats
 */
export function extractAssetSymbol(tradingPair: string): string {
  const pair = tradingPair.toUpperCase();
  
  // Common patterns: BTCUSDT, BTC/USDT, BTC-USDT, etc.
  const patterns = [
    /^([A-Z]+)USDT?$/,
    /^([A-Z]+)\/USDT?$/,
    /^([A-Z]+)-USDT?$/,
    /^([A-Z]+)USD$/,
    /^([A-Z]+)\/USD$/,
    /^([A-Z]+)-USD$/,
    /^([A-Z]+)BTC$/,
    /^([A-Z]+)\/BTC$/,
    /^([A-Z]+)-BTC$/,
  ];
  
  for (const pattern of patterns) {
    const match = pair.match(pattern);
    if (match) return match[1];
  }
  
  // If no pattern matches, return the first part before common separators
  const parts = pair.split(/[\/\-_]/);
  return parts[0] || pair.slice(0, 6); // Fallback to first 6 characters
}