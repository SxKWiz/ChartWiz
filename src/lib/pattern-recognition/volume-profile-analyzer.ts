/**
 * @fileOverview Enhanced Volume Profile Analysis
 * 
 * This module provides institutional-grade volume profile analysis including:
 * - Volume-at-Price (VAP) calculations
 * - Point of Control (POC) identification
 * - Value Area calculations
 * - Volume imbalance detection
 * - Institutional accumulation/distribution zones
 */

export interface PriceVolumeData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VolumeNode {
  price: number;
  volume: number;
  volumePercent: number;
  trades: number;
  buyVolume: number;
  sellVolume: number;
  imbalance: number; // Buy volume / Total volume
}

export interface VolumeProfile {
  nodes: VolumeNode[];
  pointOfControl: VolumeNode;
  valueAreaHigh: number;
  valueAreaLow: number;
  totalVolume: number;
  profileType: 'balanced' | 'p_shaped' | 'b_shaped' | 'd_shaped';
  institutionalLevels: InstitutionalLevel[];
}

export interface InstitutionalLevel {
  price: number;
  volume: number;
  type: 'accumulation' | 'distribution' | 'liquidity_zone' | 'high_volume_node';
  strength: number; // 0-100
  significance: 'major' | 'minor' | 'critical';
}

export interface VolumeImbalance {
  priceLevel: number;
  buyVolume: number;
  sellVolume: number;
  imbalanceRatio: number;
  direction: 'bullish' | 'bearish';
  strength: number;
}

export interface VolumeProfileAnalysis {
  profile: VolumeProfile;
  keyLevels: InstitutionalLevel[];
  imbalances: VolumeImbalance[];
  marketStructure: {
    trend: 'accumulation' | 'distribution' | 'trending' | 'balanced';
    phase: 'early' | 'middle' | 'late';
    strength: number;
  };
  tradingImplications: {
    supportLevels: number[];
    resistanceLevels: number[];
    targetZones: number[];
    riskZones: number[];
  };
}

export class VolumeProfileAnalyzer {
  private readonly DEFAULT_PROFILE_BINS = 100;
  private readonly VALUE_AREA_PERCENT = 0.70; // 70% of volume
  private readonly HIGH_VOLUME_THRESHOLD = 1.5; // 1.5x average volume
  private readonly IMBALANCE_THRESHOLD = 0.7; // 70% buy or sell volume
  
  /**
   * Creates a comprehensive volume profile from price/volume data
   */
  createVolumeProfile(
    data: PriceVolumeData[],
    bins: number = this.DEFAULT_PROFILE_BINS,
    startTime?: number,
    endTime?: number
  ): VolumeProfile {
    // Filter data by time range if specified
    const filteredData = this.filterDataByTime(data, startTime, endTime);
    
    if (filteredData.length === 0) {
      throw new Error('No data available for volume profile calculation');
    }
    
    // Calculate price range and bin size
    const priceRange = this.calculatePriceRange(filteredData);
    const binSize = (priceRange.max - priceRange.min) / bins;
    
    // Create volume nodes
    const nodes = this.calculateVolumeNodes(filteredData, priceRange.min, binSize, bins);
    
    // Calculate total volume
    const totalVolume = nodes.reduce((sum, node) => sum + node.volume, 0);
    
    // Update volume percentages
    nodes.forEach(node => {
      node.volumePercent = (node.volume / totalVolume) * 100;
    });
    
    // Find Point of Control (highest volume node)
    const pointOfControl = nodes.reduce((max, node) => 
      node.volume > max.volume ? node : max
    );
    
    // Calculate Value Area (70% of volume around POC)
    const valueArea = this.calculateValueArea(nodes, pointOfControl);
    
    // Determine profile type
    const profileType = this.classifyProfileType(nodes, pointOfControl);
    
    // Identify institutional levels
    const institutionalLevels = this.identifyInstitutionalLevels(nodes);
    
    return {
      nodes,
      pointOfControl,
      valueAreaHigh: valueArea.high,
      valueAreaLow: valueArea.low,
      totalVolume,
      profileType,
      institutionalLevels
    };
  }
  
  /**
   * Analyzes volume profile for trading insights
   */
  analyzeVolumeProfile(
    data: PriceVolumeData[],
    currentPrice: number,
    lookbackPeriods: number = 30
  ): VolumeProfileAnalysis {
    const recentData = data.slice(-lookbackPeriods);
    const profile = this.createVolumeProfile(recentData);
    
    // Detect volume imbalances
    const imbalances = this.detectVolumeImbalances(recentData);
    
    // Analyze market structure
    const marketStructure = this.analyzeMarketStructure(profile, currentPrice);
    
    // Generate trading implications
    const tradingImplications = this.generateTradingImplications(profile, currentPrice, imbalances);
    
    return {
      profile,
      keyLevels: profile.institutionalLevels,
      imbalances,
      marketStructure,
      tradingImplications
    };
  }
  
  /**
   * Identifies volume imbalances at different price levels
   */
  detectVolumeImbalances(data: PriceVolumeData[]): VolumeImbalance[] {
    const imbalances: VolumeImbalance[] = [];
    
    // Group data by price levels for imbalance analysis
    const priceGroups = this.groupByPriceLevels(data);
    
    Object.entries(priceGroups).forEach(([priceLevel, candles]) => {
      const price = parseFloat(priceLevel);
      let buyVolume = 0;
      let sellVolume = 0;
      
      candles.forEach(candle => {
        // Estimate buy/sell volume based on price action
        const { buy, sell } = this.estimateBuySellVolume(candle);
        buyVolume += buy;
        sellVolume += sell;
      });
      
      const totalVolume = buyVolume + sellVolume;
      if (totalVolume === 0) return;
      
      const imbalanceRatio = buyVolume / totalVolume;
      
      // Identify significant imbalances
      if (imbalanceRatio > this.IMBALANCE_THRESHOLD || imbalanceRatio < (1 - this.IMBALANCE_THRESHOLD)) {
        const direction = imbalanceRatio > 0.5 ? 'bullish' : 'bearish';
        const strength = Math.abs(imbalanceRatio - 0.5) * 200; // 0-100 scale
        
        imbalances.push({
          priceLevel: price,
          buyVolume,
          sellVolume,
          imbalanceRatio,
          direction,
          strength
        });
      }
    });
    
    return imbalances.sort((a, b) => b.strength - a.strength);
  }
  
  /**
   * Calculates session-based volume profiles (useful for day trading)
   */
  calculateSessionProfile(
    data: PriceVolumeData[],
    sessionStart: number,
    sessionEnd: number
  ): VolumeProfile {
    const sessionData = data.filter(candle => 
      candle.timestamp >= sessionStart && candle.timestamp <= sessionEnd
    );
    
    return this.createVolumeProfile(sessionData);
  }
  
  /**
   * Compares current volume profile with historical profiles
   */
  compareWithHistoricalProfiles(
    currentData: PriceVolumeData[],
    historicalData: PriceVolumeData[],
    periods: number = 30
  ): {
    similarity: number;
    divergences: string[];
    implications: string[];
  } {
    const currentProfile = this.createVolumeProfile(currentData.slice(-periods));
    const historicalProfile = this.createVolumeProfile(historicalData.slice(-periods * 2, -periods));
    
    // Calculate profile similarity
    const similarity = this.calculateProfileSimilarity(currentProfile, historicalProfile);
    
    // Identify divergences
    const divergences = this.identifyProfileDivergences(currentProfile, historicalProfile);
    
    // Generate implications
    const implications = this.generateProfileImplications(currentProfile, historicalProfile, similarity);
    
    return { similarity, divergences, implications };
  }
  
  /**
   * Filter data by time range
   */
  private filterDataByTime(
    data: PriceVolumeData[],
    startTime?: number,
    endTime?: number
  ): PriceVolumeData[] {
    if (!startTime && !endTime) return data;
    
    return data.filter(candle => {
      if (startTime && candle.timestamp < startTime) return false;
      if (endTime && candle.timestamp > endTime) return false;
      return true;
    });
  }
  
  /**
   * Calculate price range from data
   */
  private calculatePriceRange(data: PriceVolumeData[]): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;
    
    data.forEach(candle => {
      min = Math.min(min, candle.low);
      max = Math.max(max, candle.high);
    });
    
    return { min, max };
  }
  
  /**
   * Calculate volume nodes for the profile
   */
  private calculateVolumeNodes(
    data: PriceVolumeData[],
    minPrice: number,
    binSize: number,
    bins: number
  ): VolumeNode[] {
    const nodes: VolumeNode[] = Array.from({ length: bins }, (_, i) => ({
      price: minPrice + (i + 0.5) * binSize,
      volume: 0,
      volumePercent: 0,
      trades: 0,
      buyVolume: 0,
      sellVolume: 0,
      imbalance: 0
    }));
    
    data.forEach(candle => {
      // Distribute volume across price range of the candle
      const priceRange = candle.high - candle.low;
      
      if (priceRange === 0) {
        // Single price level
        const binIndex = Math.floor((candle.close - minPrice) / binSize);
        if (binIndex >= 0 && binIndex < bins) {
          const { buy, sell } = this.estimateBuySellVolume(candle);
          nodes[binIndex].volume += candle.volume;
          nodes[binIndex].trades += 1;
          nodes[binIndex].buyVolume += buy;
          nodes[binIndex].sellVolume += sell;
        }
      } else {
        // Distribute volume proportionally across the price range
        const startBin = Math.max(0, Math.floor((candle.low - minPrice) / binSize));
        const endBin = Math.min(bins - 1, Math.floor((candle.high - minPrice) / binSize));
        
        for (let i = startBin; i <= endBin; i++) {
          const binPrice = minPrice + (i + 0.5) * binSize;
          
          // Calculate portion of volume for this bin
          let volumePortion = 0;
          
          if (i === startBin && i === endBin) {
            volumePortion = 1;
          } else if (i === startBin) {
            volumePortion = (minPrice + (i + 1) * binSize - candle.low) / priceRange;
          } else if (i === endBin) {
            volumePortion = (candle.high - (minPrice + i * binSize)) / priceRange;
          } else {
            volumePortion = binSize / priceRange;
          }
          
          const { buy, sell } = this.estimateBuySellVolume(candle);
          nodes[i].volume += candle.volume * volumePortion;
          nodes[i].trades += volumePortion;
          nodes[i].buyVolume += buy * volumePortion;
          nodes[i].sellVolume += sell * volumePortion;
        }
      }
    });
    
    // Calculate imbalance ratios
    nodes.forEach(node => {
      const totalVolume = node.buyVolume + node.sellVolume;
      node.imbalance = totalVolume > 0 ? node.buyVolume / totalVolume : 0.5;
    });
    
    return nodes;
  }
  
  /**
   * Estimate buy/sell volume from OHLC data
   */
  private estimateBuySellVolume(candle: PriceVolumeData): { buy: number; sell: number } {
    // Simple estimation based on close relative to high/low
    const range = candle.high - candle.low;
    if (range === 0) return { buy: candle.volume / 2, sell: candle.volume / 2 };
    
    const closePosition = (candle.close - candle.low) / range;
    const buyVolume = candle.volume * closePosition;
    const sellVolume = candle.volume * (1 - closePosition);
    
    return { buy: buyVolume, sell: sellVolume };
  }
  
  /**
   * Calculate Value Area (70% of volume around POC)
   */
  private calculateValueArea(nodes: VolumeNode[], poc: VolumeNode): { high: number; low: number } {
    const targetVolume = nodes.reduce((sum, node) => sum + node.volume, 0) * this.VALUE_AREA_PERCENT;
    
    // Find POC index
    const pocIndex = nodes.findIndex(node => node.price === poc.price);
    
    let accumulatedVolume = poc.volume;
    let lowIndex = pocIndex;
    let highIndex = pocIndex;
    
    // Expand from POC until we reach 70% of volume
    while (accumulatedVolume < targetVolume && (lowIndex > 0 || highIndex < nodes.length - 1)) {
      const lowVolume = lowIndex > 0 ? nodes[lowIndex - 1].volume : 0;
      const highVolume = highIndex < nodes.length - 1 ? nodes[highIndex + 1].volume : 0;
      
      if (lowVolume >= highVolume && lowIndex > 0) {
        lowIndex--;
        accumulatedVolume += nodes[lowIndex].volume;
      } else if (highIndex < nodes.length - 1) {
        highIndex++;
        accumulatedVolume += nodes[highIndex].volume;
      } else {
        break;
      }
    }
    
    return {
      high: nodes[highIndex].price,
      low: nodes[lowIndex].price
    };
  }
  
  /**
   * Classify profile type based on shape
   */
  private classifyProfileType(nodes: VolumeNode[], poc: VolumeNode): 'balanced' | 'p_shaped' | 'b_shaped' | 'd_shaped' {
    const pocIndex = nodes.findIndex(node => node.price === poc.price);
    const totalNodes = nodes.length;
    
    // Analyze volume distribution
    const upperVolume = nodes.slice(pocIndex).reduce((sum, node) => sum + node.volume, 0);
    const lowerVolume = nodes.slice(0, pocIndex + 1).reduce((sum, node) => sum + node.volume, 0);
    const totalVolume = upperVolume + lowerVolume;
    
    const upperRatio = upperVolume / totalVolume;
    const pocPosition = pocIndex / totalNodes;
    
    if (pocPosition < 0.3 && upperRatio > 0.6) return 'p_shaped';
    if (pocPosition > 0.7 && upperRatio < 0.4) return 'b_shaped';
    if (pocPosition >= 0.3 && pocPosition <= 0.7 && Math.abs(upperRatio - 0.5) < 0.1) return 'balanced';
    return 'd_shaped';
  }
  
  /**
   * Identify institutional accumulation/distribution levels
   */
  private identifyInstitutionalLevels(nodes: VolumeNode[]): InstitutionalLevel[] {
    const avgVolume = nodes.reduce((sum, node) => sum + node.volume, 0) / nodes.length;
    const levels: InstitutionalLevel[] = [];
    
    nodes.forEach(node => {
      if (node.volume > avgVolume * this.HIGH_VOLUME_THRESHOLD) {
        const strength = Math.min(100, (node.volume / avgVolume) * 20);
        
        let type: InstitutionalLevel['type'] = 'high_volume_node';
        let significance: InstitutionalLevel['significance'] = 'minor';
        
        // Classify based on volume characteristics
        if (node.imbalance > 0.8) {
          type = 'accumulation';
        } else if (node.imbalance < 0.2) {
          type = 'distribution';
        } else if (node.volume > avgVolume * 3) {
          type = 'liquidity_zone';
        }
        
        // Determine significance
        if (strength > 80) significance = 'critical';
        else if (strength > 50) significance = 'major';
        
        levels.push({
          price: node.price,
          volume: node.volume,
          type,
          strength,
          significance
        });
      }
    });
    
    return levels.sort((a, b) => b.strength - a.strength);
  }
  
  /**
   * Group data by price levels for analysis
   */
  private groupByPriceLevels(data: PriceVolumeData[]): { [price: string]: PriceVolumeData[] } {
    const groups: { [price: string]: PriceVolumeData[] } = {};
    
    data.forEach(candle => {
      // Round to nearest cent or appropriate precision
      const roundedPrice = Math.round(candle.close * 100) / 100;
      const key = roundedPrice.toString();
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(candle);
    });
    
    return groups;
  }
  
  /**
   * Analyze market structure from volume profile
   */
  private analyzeMarketStructure(profile: VolumeProfile, currentPrice: number): {
    trend: 'accumulation' | 'distribution' | 'trending' | 'balanced';
    phase: 'early' | 'middle' | 'late';
    strength: number;
  } {
    const { pointOfControl, valueAreaHigh, valueAreaLow, profileType } = profile;
    
    // Determine trend based on price position relative to POC and value area
    let trend: 'accumulation' | 'distribution' | 'trending' | 'balanced' = 'balanced';
    
    if (currentPrice > valueAreaHigh && currentPrice > pointOfControl.price) {
      trend = 'trending';
    } else if (currentPrice < valueAreaLow && currentPrice < pointOfControl.price) {
      trend = 'trending';
    } else if (profileType === 'p_shaped') {
      trend = 'accumulation';
    } else if (profileType === 'b_shaped') {
      trend = 'distribution';
    }
    
    // Determine phase
    const distanceFromPOC = Math.abs(currentPrice - pointOfControl.price) / pointOfControl.price;
    let phase: 'early' | 'middle' | 'late' = 'middle';
    
    if (distanceFromPOC < 0.02) phase = 'early';
    else if (distanceFromPOC > 0.05) phase = 'late';
    
    // Calculate strength based on volume distribution
    const maxVolume = Math.max(...profile.nodes.map(n => n.volume));
    const strength = (pointOfControl.volume / maxVolume) * 100;
    
    return { trend, phase, strength };
  }
  
  /**
   * Generate trading implications from volume profile
   */
  private generateTradingImplications(
    profile: VolumeProfile,
    currentPrice: number,
    imbalances: VolumeImbalance[]
  ): {
    supportLevels: number[];
    resistanceLevels: number[];
    targetZones: number[];
    riskZones: number[];
  } {
    const { nodes, pointOfControl, valueAreaHigh, valueAreaLow, institutionalLevels } = profile;
    
    // Identify support levels (high volume nodes below current price)
    const supportLevels = institutionalLevels
      .filter(level => level.price < currentPrice && level.type !== 'distribution')
      .map(level => level.price)
      .slice(0, 3);
    
    // Identify resistance levels (high volume nodes above current price)
    const resistanceLevels = institutionalLevels
      .filter(level => level.price > currentPrice && level.type !== 'accumulation')
      .map(level => level.price)
      .slice(0, 3);
    
    // Target zones based on volume gaps and imbalances
    const targetZones = imbalances
      .filter(imbalance => imbalance.strength > 70)
      .map(imbalance => imbalance.priceLevel);
    
    // Risk zones (low volume areas)
    const avgVolume = nodes.reduce((sum, node) => sum + node.volume, 0) / nodes.length;
    const riskZones = nodes
      .filter(node => node.volume < avgVolume * 0.3)
      .map(node => node.price);
    
    return {
      supportLevels,
      resistanceLevels,
      targetZones,
      riskZones
    };
  }
  
  /**
   * Calculate similarity between two volume profiles
   */
  private calculateProfileSimilarity(profile1: VolumeProfile, profile2: VolumeProfile): number {
    // Compare volume distribution patterns
    const correlation = this.calculateVolumeCorrelation(profile1.nodes, profile2.nodes);
    const pocSimilarity = this.calculatePOCSimilarity(profile1.pointOfControl, profile2.pointOfControl);
    const typeSimilarity = profile1.profileType === profile2.profileType ? 1 : 0;
    
    return (correlation * 0.6 + pocSimilarity * 0.3 + typeSimilarity * 0.1);
  }
  
  private calculateVolumeCorrelation(nodes1: VolumeNode[], nodes2: VolumeNode[]): number {
    // Simplified correlation calculation
    const volumes1 = nodes1.map(n => n.volume);
    const volumes2 = nodes2.map(n => n.volume);
    
    const mean1 = volumes1.reduce((a, b) => a + b) / volumes1.length;
    const mean2 = volumes2.reduce((a, b) => a + b) / volumes2.length;
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < Math.min(volumes1.length, volumes2.length); i++) {
      const diff1 = volumes1[i] - mean1;
      const diff2 = volumes2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  private calculatePOCSimilarity(poc1: VolumeNode, poc2: VolumeNode): number {
    const priceDiff = Math.abs(poc1.price - poc2.price) / Math.max(poc1.price, poc2.price);
    const volumeDiff = Math.abs(poc1.volume - poc2.volume) / Math.max(poc1.volume, poc2.volume);
    
    return Math.max(0, 1 - (priceDiff + volumeDiff) / 2);
  }
  
  private identifyProfileDivergences(profile1: VolumeProfile, profile2: VolumeProfile): string[] {
    const divergences: string[] = [];
    
    if (profile1.profileType !== profile2.profileType) {
      divergences.push(`Profile type changed from ${profile2.profileType} to ${profile1.profileType}`);
    }
    
    const pocPriceDiff = (profile1.pointOfControl.price - profile2.pointOfControl.price) / profile2.pointOfControl.price;
    if (Math.abs(pocPriceDiff) > 0.05) {
      divergences.push(`Point of Control shifted ${pocPriceDiff > 0 ? 'higher' : 'lower'} by ${Math.abs(pocPriceDiff * 100).toFixed(1)}%`);
    }
    
    return divergences;
  }
  
  private generateProfileImplications(
    current: VolumeProfile,
    historical: VolumeProfile,
    similarity: number
  ): string[] {
    const implications: string[] = [];
    
    if (similarity < 0.3) {
      implications.push('Significant change in market structure detected');
    }
    
    if (current.profileType === 'p_shaped' && historical.profileType !== 'p_shaped') {
      implications.push('Market entering accumulation phase');
    }
    
    if (current.profileType === 'b_shaped' && historical.profileType !== 'b_shaped') {
      implications.push('Market entering distribution phase');
    }
    
    return implications;
  }
}

// Singleton instance
export const volumeProfileAnalyzer = new VolumeProfileAnalyzer();