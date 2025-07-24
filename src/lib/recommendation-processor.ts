/**
 * @fileOverview Post-processing utilities for AI trading recommendations
 * 
 * This module validates and enhances AI-generated trading recommendations
 * to ensure precision, consistency, and technical accuracy.
 */

import { 
  getPricePrecision, 
  formatPrice, 
  validatePriceLevel, 
  calculateRiskReward, 
  formatRiskReward,
  extractAssetSymbol,
  type PricePrecisionConfig 
} from './trading-precision';

export interface RawRecommendation {
  entryPrice: { value?: string; reason?: string };
  takeProfit: Array<{ value?: string; reason?: string }>;
  stopLoss: { value?: string; reason?: string };
  riskRewardRatio?: string;
}

export interface ProcessedRecommendation extends RawRecommendation {
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  precision: PricePrecisionConfig;
  calculations: {
    entryPriceNum: number;
    takeProfitLevelsNum: number[];
    stopLossNum: number;
    riskRewardRatios: number[];
    potentialRisk: number;
    potentialRewards: number[];
  };
}

/**
 * Extracts numerical price from various string formats
 */
function extractPrice(priceString?: string): number | null {
  if (!priceString) return null;
  
  // Remove common currency symbols and text
  const cleaned = priceString
    .replace(/[\$€£¥₿]/g, '')
    .replace(/[,\s]/g, '')
    .replace(/around|approximately|near|at|level/gi, '');
  
  // Extract first number that looks like a price
  const matches = cleaned.match(/\d+\.?\d*/);
  if (matches) {
    const price = parseFloat(matches[0]);
    return isNaN(price) ? null : price;
  }
  
  return null;
}

/**
 * Attempts to extract asset symbol from recommendation context
 */
function extractAssetFromRecommendation(recommendation: RawRecommendation): string {
  // Look for asset mentions in the reasoning text
  const allText = [
    recommendation.entryPrice.reason || '',
    recommendation.stopLoss.reason || '',
    ...recommendation.takeProfit.map(tp => tp.reason || '')
  ].join(' ');
  
  // Common crypto patterns
  const cryptoPatterns = [
    /\b(BTC|BITCOIN)\b/i,
    /\b(ETH|ETHEREUM)\b/i,
    /\b(BNB|BINANCE)\b/i,
    /\b(SOL|SOLANA)\b/i,
    /\b(ADA|CARDANO)\b/i,
    /\b(DOT|POLKADOT)\b/i,
    /\b(MATIC|POLYGON)\b/i,
    /\b(LINK|CHAINLINK)\b/i,
    /\b([A-Z]{3,6})\/?(USDT?|USD|BTC)\b/i
  ];
  
  for (const pattern of cryptoPatterns) {
    const match = allText.match(pattern);
    if (match) {
      return extractAssetSymbol(match[1] || match[0]);
    }
  }
  
  // Default to BTC if no asset found
  return 'BTC';
}

/**
 * Validates and processes a raw AI recommendation
 */
export function processRecommendation(
  recommendation: RawRecommendation,
  currentPrice?: number,
  assetSymbol?: string
): ProcessedRecommendation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Extract numerical values
  const entryPriceNum = extractPrice(recommendation.entryPrice.value);
  const takeProfitLevelsNum = recommendation.takeProfit
    .map(tp => extractPrice(tp.value))
    .filter((price): price is number => price !== null);
  const stopLossNum = extractPrice(recommendation.stopLoss.value);
  
  // Validate price extraction
  if (entryPriceNum === null) {
    errors.push('Could not extract numerical entry price');
  }
  if (stopLossNum === null) {
    errors.push('Could not extract numerical stop loss');
  }
  if (takeProfitLevelsNum.length === 0) {
    errors.push('Could not extract any numerical take profit levels');
  }
  if (takeProfitLevelsNum.length !== recommendation.takeProfit.length) {
    warnings.push('Some take profit levels could not be parsed');
  }
  
  // Determine asset and precision
  const asset = assetSymbol || extractAssetFromRecommendation(recommendation);
  const estimatedPrice = currentPrice || entryPriceNum || 50000; // Fallback for precision
  const precision = getPricePrecision(asset, estimatedPrice);
  
  let calculations = {
    entryPriceNum: entryPriceNum || 0,
    takeProfitLevelsNum,
    stopLossNum: stopLossNum || 0,
    riskRewardRatios: [] as number[],
    potentialRisk: 0,
    potentialRewards: [] as number[]
  };
  
  // Calculate risk-reward if we have valid prices
  if (entryPriceNum && stopLossNum && takeProfitLevelsNum.length > 0) {
    const tradeCalc = calculateRiskReward(
      entryPriceNum,
      takeProfitLevelsNum,
      stopLossNum
    );
    
    calculations = {
      entryPriceNum,
      takeProfitLevelsNum,
      stopLossNum,
      riskRewardRatios: tradeCalc.riskRewardRatios,
      potentialRisk: tradeCalc.potentialRisk,
      potentialRewards: tradeCalc.potentialRewards
    };
    
    // Validate price logic
    const entryValidation = validatePriceLevel(
      entryPriceNum, 
      currentPrice || entryPriceNum, 
      'entry', 
      'long'
    );
    if (!entryValidation.isValid && entryValidation.reason) {
      warnings.push(`Entry price: ${entryValidation.reason}`);
    }
    
    const stopValidation = validatePriceLevel(
      stopLossNum, 
      entryPriceNum, 
      'stopLoss', 
      'long'
    );
    if (!stopValidation.isValid && stopValidation.reason) {
      warnings.push(`Stop loss: ${stopValidation.reason}`);
    }
    
    // Validate take profit levels
    takeProfitLevelsNum.forEach((tp, index) => {
      const tpValidation = validatePriceLevel(tp, entryPriceNum, 'takeProfit', 'long');
      if (!tpValidation.isValid && tpValidation.reason) {
        warnings.push(`Take profit ${index + 1}: ${tpValidation.reason}`);
      }
    });
    
    // Check risk-reward ratios
    const firstRR = tradeCalc.riskRewardRatios[0];
    if (firstRR < 1) {
      warnings.push(`Low risk-reward ratio: ${formatRiskReward(firstRR)}`);
    }
  }
  
  return {
    ...recommendation,
    validation: {
      isValid: errors.length === 0,
      errors,
      warnings
    },
    precision,
    calculations
  };
}

/**
 * Enhances a recommendation with better formatting and precision
 */
export function enhanceRecommendation(
  processed: ProcessedRecommendation
): RawRecommendation {
  const { precision, calculations } = processed;
  
  // Format prices with appropriate precision
  const enhanced: RawRecommendation = {
    entryPrice: {
      value: `$${formatPrice(calculations.entryPriceNum, precision)}`,
      reason: processed.entryPrice.reason || 'Technical entry level'
    },
    stopLoss: {
      value: `$${formatPrice(calculations.stopLossNum, precision)}`,
      reason: processed.stopLoss.reason || 'Risk management level'
    },
    takeProfit: calculations.takeProfitLevelsNum.map((tp, index) => ({
      value: `$${formatPrice(tp, precision)}`,
      reason: processed.takeProfit[index]?.reason || 'Technical target level'
    })),
    riskRewardRatio: calculations.riskRewardRatios.length > 0 
      ? formatRiskReward(calculations.riskRewardRatios[0])
      : processed.riskRewardRatio
  };
  
  return enhanced;
}

/**
 * Validates and enhances an AI recommendation in one step
 */
export function validateAndEnhanceRecommendation(
  recommendation: RawRecommendation,
  currentPrice?: number,
  assetSymbol?: string
): {
  enhanced: RawRecommendation;
  validation: ProcessedRecommendation['validation'];
  precision: PricePrecisionConfig;
} {
  const processed = processRecommendation(recommendation, currentPrice, assetSymbol);
  const enhanced = enhanceRecommendation(processed);
  
  return {
    enhanced,
    validation: processed.validation,
    precision: processed.precision
  };
}