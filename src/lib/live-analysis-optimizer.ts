/**
 * @fileOverview Live Analysis Optimizer - Smart resource management and spam prevention
 * for cryptocurrency trading analysis systems.
 */

export interface AnalysisState {
  isTradeDetecting: boolean;
  isMonitoringTrade: boolean;
  lastOpportunityTime: number | null;
  consecutiveEmptyScans: number;
  currentInterval: number;
  marketVolatility: 'low' | 'medium' | 'high';
  cooldownActive: boolean;
  lastActivityTime: number;
}

export interface OptimizationConfig {
  minInterval: number;
  maxInterval: number;
  cooldownPeriod: number; // seconds
  maxConsecutiveEmptyScans: number;
  confidenceThreshold: number;
  adaptiveScaling: boolean;
}

export class LiveAnalysisOptimizer {
  private state: AnalysisState;
  private config: OptimizationConfig;
  private activityHistory: number[] = [];
  private performanceMetrics: {
    totalScans: number;
    successfulDetections: number;
    falsePositives: number;
    avgResponseTime: number;
  };

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      minInterval: 10,
      maxInterval: 120,
      cooldownPeriod: 300, // 5 minutes
      maxConsecutiveEmptyScans: 20,
      confidenceThreshold: 75,
      adaptiveScaling: true,
      ...config,
    };

    this.state = {
      isTradeDetecting: false,
      isMonitoringTrade: false,
      lastOpportunityTime: null,
      consecutiveEmptyScans: 0,
      currentInterval: 15,
      marketVolatility: 'medium',
      cooldownActive: false,
      lastActivityTime: Date.now(),
    };

    this.performanceMetrics = {
      totalScans: 0,
      successfulDetections: 0,
      falsePositives: 0,
      avgResponseTime: 0,
    };
  }

  /**
   * Determines if scanning should proceed based on current state
   */
  shouldScan(): { 
    allowed: boolean; 
    reason?: string; 
    recommendedAction?: string;
  } {
    const now = Date.now();

    // Check if in cooldown period
    if (this.state.cooldownActive && this.state.lastOpportunityTime) {
      const timeSinceLast = (now - this.state.lastOpportunityTime) / 1000;
      if (timeSinceLast < this.config.cooldownPeriod) {
        return {
          allowed: false,
          reason: `Cooldown active (${Math.round(this.config.cooldownPeriod - timeSinceLast)}s remaining)`,
          recommendedAction: 'Wait for cooldown to expire',
        };
      } else {
        this.state.cooldownActive = false;
      }
    }

    // Check if monitoring is active (shouldn't detect new trades)
    if (this.state.isMonitoringTrade) {
      return {
        allowed: false,
        reason: 'Trade monitoring active',
        recommendedAction: 'Focus on current trade monitoring',
      };
    }

    // Check consecutive empty scans threshold
    if (this.state.consecutiveEmptyScans >= this.config.maxConsecutiveEmptyScans) {
      return {
        allowed: false,
        reason: `Too many consecutive empty scans (${this.state.consecutiveEmptyScans})`,
        recommendedAction: 'Increase scan interval or pause detection',
      };
    }

    return { allowed: true };
  }

  /**
   * Calculates optimal scan interval based on current conditions
   */
  calculateOptimalInterval(): number {
    let interval = this.config.minInterval;

    // Base interval adjustment based on market volatility
    switch (this.state.marketVolatility) {
      case 'high':
        interval = Math.max(this.config.minInterval, 10);
        break;
      case 'medium':
        interval = 20;
        break;
      case 'low':
        interval = 30;
        break;
    }

    // Increase interval based on consecutive empty scans
    if (this.config.adaptiveScaling) {
      const emptyScaleFactor = Math.min(
        this.state.consecutiveEmptyScans * 3,
        this.config.maxInterval - interval
      );
      interval += emptyScaleFactor;
    }

    // Respect maximum interval
    interval = Math.min(interval, this.config.maxInterval);

    return interval;
  }

  /**
   * Updates state after a detection attempt
   */
  updateAfterDetection(result: {
    opportunityFound: boolean;
    confidence: number;
    marketVolatility?: 'low' | 'medium' | 'high';
    responseTime?: number;
  }): void {
    const now = Date.now();
    this.performanceMetrics.totalScans++;
    
    if (result.responseTime) {
      this.performanceMetrics.avgResponseTime = 
        (this.performanceMetrics.avgResponseTime * (this.performanceMetrics.totalScans - 1) + result.responseTime) 
        / this.performanceMetrics.totalScans;
    }

    if (result.opportunityFound) {
      if (result.confidence >= this.config.confidenceThreshold) {
        this.state.lastOpportunityTime = now;
        this.state.consecutiveEmptyScans = 0;
        this.state.cooldownActive = true;
        this.performanceMetrics.successfulDetections++;
      } else {
        // Low confidence detection treated as false positive
        this.performanceMetrics.falsePositives++;
        this.state.consecutiveEmptyScans++;
      }
    } else {
      this.state.consecutiveEmptyScans++;
    }

    // Update market volatility if provided
    if (result.marketVolatility) {
      this.state.marketVolatility = result.marketVolatility;
    }

    // Update current interval
    this.state.currentInterval = this.calculateOptimalInterval();
    this.state.lastActivityTime = now;

    // Maintain activity history (last 100 scans)
    this.activityHistory.push(now);
    if (this.activityHistory.length > 100) {
      this.activityHistory.shift();
    }
  }

  /**
   * Updates state when trade monitoring starts
   */
  startTradeMonitoring(): void {
    this.state.isMonitoringTrade = true;
    this.state.isTradeDetecting = false;
  }

  /**
   * Updates state when trade monitoring stops
   */
  stopTradeMonitoring(): void {
    this.state.isMonitoringTrade = false;
  }

  /**
   * Calculates optimal monitoring interval for active trades
   */
  calculateMonitoringInterval(tradeState: {
    status: 'waiting_entry' | 'entered' | 'partial_exit' | 'fully_exited';
    urgency: 'low' | 'medium' | 'high' | 'immediate';
    distanceToEntry?: number; // percentage
    distanceToStop?: number; // percentage
  }): number {
    if (tradeState.status === 'waiting_entry') {
      if (tradeState.distanceToEntry && tradeState.distanceToEntry < 0.5) {
        return 5; // Very close to entry
      } else if (tradeState.distanceToEntry && tradeState.distanceToEntry < 2) {
        return 10; // Approaching entry
      } else {
        return 30; // Far from entry
      }
    }

    // For active trades
    switch (tradeState.urgency) {
      case 'immediate':
        return 5;
      case 'high':
        return 10;
      case 'medium':
        return 20;
      case 'low':
        return 60;
      default:
        return 30;
    }
  }

  /**
   * Gets current state summary
   */
  getState(): AnalysisState & { 
    performance: typeof this.performanceMetrics;
    optimalInterval: number;
    shouldScan: ReturnType<typeof this.shouldScan>;
  } {
    return {
      ...this.state,
      performance: { ...this.performanceMetrics },
      optimalInterval: this.calculateOptimalInterval(),
      shouldScan: this.shouldScan(),
    };
  }

  /**
   * Resets optimizer state (useful for troubleshooting or configuration changes)
   */
  reset(): void {
    this.state = {
      isTradeDetecting: false,
      isMonitoringTrade: false,
      lastOpportunityTime: null,
      consecutiveEmptyScans: 0,
      currentInterval: 15,
      marketVolatility: 'medium',
      cooldownActive: false,
      lastActivityTime: Date.now(),
    };
    
    this.performanceMetrics = {
      totalScans: 0,
      successfulDetections: 0,
      falsePositives: 0,
      avgResponseTime: 0,
    };
    
    this.activityHistory = [];
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets performance report
   */
  getPerformanceReport(): {
    successRate: number;
    falsePositiveRate: number;
    avgScansPerHour: number;
    avgResponseTime: number;
    recommendation: string;
  } {
    const successRate = this.performanceMetrics.totalScans > 0 
      ? (this.performanceMetrics.successfulDetections / this.performanceMetrics.totalScans) * 100 
      : 0;
    
    const falsePositiveRate = this.performanceMetrics.totalScans > 0 
      ? (this.performanceMetrics.falsePositives / this.performanceMetrics.totalScans) * 100 
      : 0;

    const hoursOfActivity = this.activityHistory.length > 1 
      ? (this.activityHistory[this.activityHistory.length - 1] - this.activityHistory[0]) / (1000 * 60 * 60)
      : 1;
    
    const avgScansPerHour = this.activityHistory.length / hoursOfActivity;

    let recommendation = 'Performance within normal parameters.';
    
    if (falsePositiveRate > 20) {
      recommendation = 'High false positive rate. Consider increasing confidence threshold.';
    } else if (successRate < 5 && this.performanceMetrics.totalScans > 50) {
      recommendation = 'Low success rate. Consider adjusting detection criteria or market conditions.';
    } else if (avgScansPerHour > 120) {
      recommendation = 'High scan frequency. Consider increasing intervals to reduce resource usage.';
    }

    return {
      successRate,
      falsePositiveRate,
      avgScansPerHour,
      avgResponseTime: this.performanceMetrics.avgResponseTime,
      recommendation,
    };
  }
}

// Export singleton instance for global use
export const liveAnalysisOptimizer = new LiveAnalysisOptimizer();

// Utility functions for integration
export function formatOptimizationStatus(state: AnalysisState): string {
  if (state.cooldownActive) {
    const remaining = state.lastOpportunityTime 
      ? Math.max(0, 300 - (Date.now() - state.lastOpportunityTime) / 1000)
      : 0;
    return `Cooldown (${Math.round(remaining)}s remaining)`;
  }
  
  if (state.isMonitoringTrade) {
    return 'Monitoring active trade';
  }
  
  if (state.consecutiveEmptyScans > 10) {
    return `${state.consecutiveEmptyScans} consecutive empty scans`;
  }
  
  return `Active (${state.marketVolatility} volatility)`;
}

export function getRecommendedAction(state: AnalysisState): string {
  const shouldScan = new LiveAnalysisOptimizer().shouldScan();
  
  if (!shouldScan.allowed) {
    return shouldScan.recommendedAction || 'Wait';
  }
  
  if (state.consecutiveEmptyScans > 15) {
    return 'Consider pausing detection or adjusting parameters';
  }
  
  return 'Continue monitoring';
}