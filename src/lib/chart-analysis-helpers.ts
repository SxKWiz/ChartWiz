/**
 * @fileOverview Chart analysis helper utilities
 * 
 * This module provides utilities for extracting information from chart images
 * to enhance trading recommendation precision.
 */

/**
 * Attempts to extract current market price from user's question or context
 */
export function extractCurrentPriceFromContext(question: string): number | null {
  // Look for price mentions in the question
  const pricePatterns = [
    /current\s+price\s+(?:is\s+)?[\$]?(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /price\s+(?:is\s+)?(?:at\s+)?[\$]?(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /trading\s+(?:at\s+)?[\$]?(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /[\$](\d+(?:,\d{3})*(?:\.\d+)?)/g
  ];
  
  for (const pattern of pricePatterns) {
    const match = question.match(pattern);
    if (match) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  }
  
  return null;
}

/**
 * Attempts to extract asset symbol from user's question
 */
export function extractAssetFromContext(question: string): string | null {
  const cryptoPatterns = [
    /\b(BTC|BITCOIN)\b/i,
    /\b(ETH|ETHEREUM)\b/i,
    /\b(BNB|BINANCE)\b/i,
    /\b(SOL|SOLANA)\b/i,
    /\b(ADA|CARDANO)\b/i,
    /\b(DOT|POLKADOT)\b/i,
    /\b(MATIC|POLYGON)\b/i,
    /\b(LINK|CHAINLINK)\b/i,
    /\b(AVAX|AVALANCHE)\b/i,
    /\b(ATOM|COSMOS)\b/i,
    /\b(XRP|RIPPLE)\b/i,
    /\b([A-Z]{3,6})\/?(USDT?|USD|BTC)\b/i
  ];
  
  for (const pattern of cryptoPatterns) {
    const match = question.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Determines trading direction from user's question
 */
export function extractTradingDirection(question: string): 'long' | 'short' | 'unknown' {
  const bullishPatterns = [
    /\b(long|buy|bullish|up|pump|moon|bull)\b/i,
    /\b(going\s+up|price\s+increase|upward)\b/i
  ];
  
  const bearishPatterns = [
    /\b(short|sell|bearish|down|dump|bear)\b/i,
    /\b(going\s+down|price\s+decrease|downward)\b/i
  ];
  
  for (const pattern of bullishPatterns) {
    if (question.match(pattern)) {
      return 'long';
    }
  }
  
  for (const pattern of bearishPatterns) {
    if (question.match(pattern)) {
      return 'short';
    }
  }
  
  return 'unknown';
}

/**
 * Extracts timeframe information from user's question
 */
export function extractTimeframe(question: string): string | null {
  const timeframePatterns = [
    /\b(\d+)\s*(m|min|minute|minutes)\b/i,
    /\b(\d+)\s*(h|hr|hour|hours)\b/i,
    /\b(\d+)\s*(d|day|days|daily)\b/i,
    /\b(\d+)\s*(w|week|weeks|weekly)\b/i,
    /\b(scalp|scalping)\b/i,
    /\b(day\s*trad|intraday)\b/i,
    /\b(swing\s*trad)\b/i,
    /\b(position\s*trad|long\s*term)\b/i
  ];
  
  for (const pattern of timeframePatterns) {
    const match = question.match(pattern);
    if (match) {
      if (match[0].toLowerCase().includes('scalp')) return '5m-15m';
      if (match[0].toLowerCase().includes('day')) return '1h-4h';
      if (match[0].toLowerCase().includes('swing')) return '4h-1d';
      if (match[0].toLowerCase().includes('position') || match[0].toLowerCase().includes('long term')) return '1d-1w';
      
      const num = match[1];
      const unit = match[2].toLowerCase();
      
      if (unit.startsWith('m')) return `${num}m`;
      if (unit.startsWith('h')) return `${num}h`;
      if (unit.startsWith('d')) return `${num}d`;
      if (unit.startsWith('w')) return `${num}w`;
    }
  }
  
  return null;
}

/**
 * Provides context-aware analysis hints based on extracted information
 */
export function generateAnalysisContext(
  question: string,
  currentPrice?: number,
  asset?: string
): {
  currentPrice: number | null;
  asset: string | null;
  direction: 'long' | 'short' | 'unknown';
  timeframe: string | null;
  analysisHints: string[];
} {
  const extractedPrice = currentPrice || extractCurrentPriceFromContext(question);
  const extractedAsset = asset || extractAssetFromContext(question);
  const direction = extractTradingDirection(question);
  const timeframe = extractTimeframe(question);
  
  const analysisHints: string[] = [];
  
  if (extractedPrice) {
    analysisHints.push(`Current price context: $${extractedPrice.toLocaleString()}`);
  }
  
  if (extractedAsset) {
    analysisHints.push(`Asset identified: ${extractedAsset}`);
  }
  
  if (direction !== 'unknown') {
    analysisHints.push(`Trading bias: ${direction}`);
  }
  
  if (timeframe) {
    analysisHints.push(`Timeframe context: ${timeframe}`);
  }
  
  return {
    currentPrice: extractedPrice,
    asset: extractedAsset,
    direction,
    timeframe,
    analysisHints
  };
}